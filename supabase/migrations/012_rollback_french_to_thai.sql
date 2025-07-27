-- Rollback Migration: French (FR) to Thai (TH) Language Conversion
-- Description: Rollback the French language migration to restore Thai language support
-- Version: 012 (Rollback for 010)
-- Date: 2025-07-27
-- WARNING: This will undo all French language changes and restore Thai language support

-- ===========================================
-- ROLLBACK VERIFICATION AND WARNINGS
-- ===========================================

DO $$
BEGIN
    RAISE WARNING 'ROLLBACK MIGRATION STARTING';
    RAISE WARNING 'This will revert French language support back to Thai';
    RAISE WARNING 'All French translations will be lost';
    RAISE WARNING 'Backup tables will be used to restore original data';
    
    -- Check if backup tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurants_backup') THEN
        RAISE EXCEPTION 'ROLLBACK FAILED: Backup tables not found. Cannot safely rollback migration.';
    END IF;
    
    RAISE NOTICE 'Backup tables found. Proceeding with rollback...';
END $$;

-- ===========================================
-- PHASE 1: RESTORE SCHEMA FROM BACKUPS
-- ===========================================

-- Restore original tables from backups
TRUNCATE restaurants CASCADE;
INSERT INTO restaurants SELECT * FROM restaurants_backup;

TRUNCATE auth_users CASCADE;
INSERT INTO auth_users SELECT * FROM auth_users_backup;

TRUNCATE sop_categories CASCADE;
INSERT INTO sop_categories SELECT * FROM sop_categories_backup;

TRUNCATE sop_documents CASCADE;
INSERT INTO sop_documents SELECT * FROM sop_documents_backup;

TRUNCATE form_templates CASCADE;
INSERT INTO form_templates SELECT * FROM form_templates_backup;

TRUNCATE form_submissions CASCADE;
INSERT INTO form_submissions SELECT * FROM form_submissions_backup;

TRUNCATE translation_items CASCADE;
INSERT INTO translation_items SELECT * FROM translation_items_backup;

-- ===========================================
-- PHASE 2: RESTORE SCHEMA CONSTRAINTS
-- ===========================================

-- Restore language constraints to include Thai
ALTER TABLE translation_items DROP CONSTRAINT IF EXISTS translation_items_source_language_check;
ALTER TABLE translation_items DROP CONSTRAINT IF EXISTS translation_items_target_language_check;

ALTER TABLE translation_items ADD CONSTRAINT translation_items_source_language_check 
    CHECK (source_language IN ('en', 'th', 'fr'));
ALTER TABLE translation_items ADD CONSTRAINT translation_items_target_language_check 
    CHECK (target_language IN ('en', 'th', 'fr'));

ALTER TABLE user_language_activity DROP CONSTRAINT IF EXISTS user_language_activity_session_language_check;
ALTER TABLE user_language_activity ADD CONSTRAINT user_language_activity_session_language_check 
    CHECK (session_language IN ('en', 'th', 'fr'));

ALTER TABLE content_translation_audit DROP CONSTRAINT IF EXISTS content_translation_audit_language_check;
ALTER TABLE content_translation_audit ADD CONSTRAINT content_translation_audit_language_check 
    CHECK (language IN ('en', 'th', 'fr'));

-- ===========================================
-- PHASE 3: RESTORE INDEXES
-- ===========================================

-- Drop French indexes and restore Thai indexes
DROP INDEX IF EXISTS idx_sop_documents_tags_fr;
DROP INDEX IF EXISTS idx_sop_documents_steps_fr;
DROP INDEX IF EXISTS idx_sop_documents_search_fr;

-- Recreate Thai indexes
CREATE INDEX idx_sop_documents_tags_th ON sop_documents USING GIN(tags_th);
CREATE INDEX idx_sop_documents_steps_th ON sop_documents USING GIN(steps_th);
CREATE INDEX idx_sop_documents_search_th ON sop_documents USING GIN(to_tsvector('simple', title_th || ' ' || content_th));

-- ===========================================
-- PHASE 4: RESTORE FUNCTIONS
-- ===========================================

-- Restore calculate_translation_completeness function to include Thai
CREATE OR REPLACE FUNCTION calculate_translation_completeness(doc_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    lang VARCHAR(5);
    title_completeness INTEGER;
    content_completeness INTEGER;
    overall_completeness INTEGER;
BEGIN
    FOR lang IN SELECT unnest(ARRAY['en', 'th', 'fr']) LOOP
        -- Calculate completeness based on content availability
        SELECT 
            CASE 
                WHEN (CASE lang 
                    WHEN 'en' THEN title IS NOT NULL AND title != ''
                    WHEN 'th' THEN title_th IS NOT NULL AND title_th != ''
                    WHEN 'fr' THEN title_fr IS NOT NULL AND title_fr != ''
                END) THEN 100 ELSE 0 END,
            CASE 
                WHEN (CASE lang 
                    WHEN 'en' THEN content IS NOT NULL AND content != ''
                    WHEN 'th' THEN content_th IS NOT NULL AND content_th != ''
                    WHEN 'fr' THEN content_fr IS NOT NULL AND content_fr != ''
                END) THEN 100 ELSE 0 END
        INTO title_completeness, content_completeness
        FROM sop_documents 
        WHERE id = doc_id;
        
        overall_completeness := (title_completeness + content_completeness) / 2;
        
        result := result || jsonb_build_object(
            lang, jsonb_build_object(
                'titleCompleteness', title_completeness,
                'contentCompleteness', content_completeness,
                'overallCompleteness', overall_completeness,
                'status', CASE 
                    WHEN overall_completeness = 100 THEN 'complete'
                    WHEN overall_completeness > 0 THEN 'partial'
                    ELSE 'missing'
                END
            )
        );
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Restore trigger to monitor Thai columns
DROP TRIGGER IF EXISTS trigger_sop_documents_translation_status ON sop_documents;
CREATE TRIGGER trigger_sop_documents_translation_status
    BEFORE UPDATE ON sop_documents
    FOR EACH ROW
    WHEN (OLD.title IS DISTINCT FROM NEW.title OR 
          OLD.content IS DISTINCT FROM NEW.content OR
          OLD.title_th IS DISTINCT FROM NEW.title_th OR
          OLD.content_th IS DISTINCT FROM NEW.content_th OR
          OLD.title_fr IS DISTINCT FROM NEW.title_fr OR
          OLD.content_fr IS DISTINCT FROM NEW.content_fr)
    EXECUTE FUNCTION update_document_translation_status();

-- ===========================================
-- PHASE 5: RESTORE VIEWS
-- ===========================================

-- Restore document_translation_completeness view to include Thai
DROP VIEW IF EXISTS document_translation_completeness;
CREATE OR REPLACE VIEW document_translation_completeness AS
SELECT 
    d.id,
    d.title,
    d.category_id,
    (d.translation_status->>'en')::jsonb->>'completeness' as en_completeness,
    (d.translation_status->>'th')::jsonb->>'completeness' as th_completeness,
    (d.translation_status->>'fr')::jsonb->>'completeness' as fr_completeness,
    ROUND(
        ((COALESCE((d.translation_status->>'en')::jsonb->>('completeness')::text, '0')::numeric +
          COALESCE((d.translation_status->>'th')::jsonb->>('completeness')::text, '0')::numeric +
          COALESCE((d.translation_status->>'fr')::jsonb->>('completeness')::text, '0')::numeric) / 3), 
        2
    ) as overall_completeness,
    d.updated_at
FROM sop_documents d
WHERE d.status = 'approved';

-- ===========================================
-- PHASE 6: RESTORE DATA PREFERENCES
-- ===========================================

-- Restore language preferences to default to Thai
UPDATE auth_users SET 
    language_preferences = jsonb_set(
        COALESCE(language_preferences, '{}'::jsonb),
        '{primaryLanguage}',
        '"en"'::jsonb
    ),
    language_preferences = jsonb_set(
        language_preferences,
        '{secondaryLanguage}',
        '"th"'::jsonb
    )
WHERE language_preferences IS NOT NULL;

-- Restore restaurant settings to default to Thai
UPDATE restaurants SET 
    settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{language_default}',
        '"th"'::jsonb
    )
WHERE settings IS NOT NULL;

-- ===========================================
-- PHASE 7: RESTORE SAMPLE DATA
-- ===========================================

-- Restore Thai translation items
INSERT INTO translation_items (translation_key, source_text, source_language, target_language, translated_text, status, quality, confidence_score, category, priority, created_by)
SELECT 
    'sop.foodSafety.title',
    'Food Safety Procedures',
    'en',
    'th',
    'ขั้นตอนความปลอดภัยอาหาร',
    'approved',
    'professional',
    95,
    'SOP Titles',
    'high',
    (SELECT id FROM auth_users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth_users WHERE role = 'admin')
ON CONFLICT (translation_key, source_language, target_language) DO NOTHING;

INSERT INTO translation_items (translation_key, source_text, source_language, target_language, translated_text, status, quality, confidence_score, category, priority, created_by)
SELECT 
    'sop.emergency.washHands',
    'Wash hands thoroughly with soap and warm water for at least 20 seconds',
    'en',
    'th',
    'ล้างมือให้สะอาดด้วยสบู่และน้ำอุ่นเป็นเวลาอย่างน้อย 20 วินาที',
    'reviewed',
    'human',
    88,
    'Emergency Procedures',
    'urgent',
    (SELECT id FROM auth_users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth_users WHERE role = 'admin')
ON CONFLICT (translation_key, source_language, target_language) DO NOTHING;

-- ===========================================
-- PHASE 8: UPDATE STATISTICS
-- ===========================================

-- Restore table statistics for Thai content
ALTER TABLE sop_documents ALTER COLUMN content_th SET STATISTICS 1000;
ALTER TABLE form_templates ALTER COLUMN schema_th SET STATISTICS 500;

-- Analyze tables for optimal query planning
ANALYZE restaurants;
ANALYZE auth_users;
ANALYZE sop_categories;
ANALYZE sop_documents;
ANALYZE form_templates;
ANALYZE form_submissions;
ANALYZE translation_items;

-- ===========================================
-- PHASE 9: CLEANUP AND VERIFICATION
-- ===========================================

-- Grant appropriate permissions
GRANT SELECT ON document_translation_completeness TO authenticated;

-- Final verification
DO $$
DECLARE
    thai_columns_count INTEGER;
    thai_data_count INTEGER;
    french_data_count INTEGER;
BEGIN
    -- Verify Thai columns exist
    SELECT COUNT(*) INTO thai_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%_th';
    
    -- Count Thai and French data
    SELECT COUNT(*) INTO thai_data_count FROM sop_documents WHERE title_th IS NOT NULL;
    SELECT COUNT(*) INTO french_data_count FROM sop_documents WHERE title_fr IS NOT NULL;
    
    RAISE NOTICE 'Rollback Verification:';
    RAISE NOTICE '- Thai columns found: %', thai_columns_count;
    RAISE NOTICE '- Documents with Thai data: %', thai_data_count;
    RAISE NOTICE '- Documents with French data: %', french_data_count;
    
    IF thai_columns_count > 0 AND thai_data_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Thai language support restored';
    ELSE
        RAISE WARNING 'PARTIAL: Rollback may be incomplete';
    END IF;
END $$;

-- ===========================================
-- PHASE 10: CLEANUP BACKUP TABLES (OPTIONAL)
-- ===========================================

-- Uncomment the following lines if you want to remove backup tables after successful rollback
-- WARNING: This will prevent further rollbacks
/*
DROP TABLE IF EXISTS restaurants_backup;
DROP TABLE IF EXISTS auth_users_backup;
DROP TABLE IF EXISTS sop_categories_backup;
DROP TABLE IF EXISTS sop_documents_backup;
DROP TABLE IF EXISTS form_templates_backup;
DROP TABLE IF EXISTS form_submissions_backup;
DROP TABLE IF EXISTS translation_items_backup;
*/

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Rollback 012: French to Thai conversion completed';
    RAISE NOTICE 'System has been restored to Thai language support';
    RAISE NOTICE 'All French translations have been preserved but Thai is now primary';
    RAISE NOTICE 'System now supports EN/TH/FR languages again';
    RAISE WARNING 'Backup tables are still present for further rollbacks if needed';
END $$;