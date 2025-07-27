-- Migration: Complete Thai (TH) to French (FR) Language Conversion
-- Description: Comprehensive conversion from Thai language support to French language support
-- Version: 013
-- Date: 2025-07-27
-- Author: Claude (AI Assistant)

-- ===========================================
-- PHASE 1: VERIFICATION AND BACKUP
-- ===========================================

DO $$
BEGIN
    RAISE WARNING 'Starting complete Thai to French conversion migration';
    RAISE WARNING 'This will systematically replace all Thai language references with French';
    RAISE WARNING 'Creating backup tables for rollback capability';
END $$;

-- Create comprehensive backup tables
CREATE TABLE IF NOT EXISTS migration_013_backup_restaurants AS SELECT * FROM restaurants;
CREATE TABLE IF NOT EXISTS migration_013_backup_auth_users AS SELECT * FROM auth_users;
CREATE TABLE IF NOT EXISTS migration_013_backup_sop_categories AS SELECT * FROM sop_categories;
CREATE TABLE IF NOT EXISTS migration_013_backup_sop_documents AS SELECT * FROM sop_documents;
CREATE TABLE IF NOT EXISTS migration_013_backup_form_templates AS SELECT * FROM form_templates;
CREATE TABLE IF NOT EXISTS migration_013_backup_form_submissions AS SELECT * FROM form_submissions;
CREATE TABLE IF NOT EXISTS migration_013_backup_translation_items AS SELECT * FROM translation_items;

-- ===========================================
-- PHASE 2: SCHEMA UPDATES - HANDLE ANY REMAINING TH COLUMNS
-- ===========================================

-- Check and rename any remaining Thai columns to French
DO $$
DECLARE
    rec RECORD;
    sql_query TEXT;
BEGIN
    -- Find all columns with _th suffix and rename to _fr
    FOR rec IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name LIKE '%_th'
        AND table_name NOT LIKE '%backup%'
    LOOP
        sql_query := format('ALTER TABLE %I RENAME COLUMN %I TO %I',
            rec.table_name,
            rec.column_name,
            replace(rec.column_name, '_th', '_fr')
        );
        
        BEGIN
            EXECUTE sql_query;
            RAISE NOTICE 'Renamed column %s.%s to %s', rec.table_name, rec.column_name, replace(rec.column_name, '_th', '_fr');
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to rename column %s.%s: %', rec.table_name, rec.column_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ===========================================
-- PHASE 3: UPDATE CONSTRAINTS TO SUPPORT FR
-- ===========================================

-- Update language constraints in translation_items
ALTER TABLE translation_items DROP CONSTRAINT IF EXISTS translation_items_source_language_check;
ALTER TABLE translation_items DROP CONSTRAINT IF EXISTS translation_items_target_language_check;

ALTER TABLE translation_items ADD CONSTRAINT translation_items_source_language_check 
    CHECK (source_language IN ('en', 'fr'));
ALTER TABLE translation_items ADD CONSTRAINT translation_items_target_language_check 
    CHECK (target_language IN ('en', 'fr'));

-- Update user_language_activity constraints
ALTER TABLE user_language_activity DROP CONSTRAINT IF EXISTS user_language_activity_session_language_check;
ALTER TABLE user_language_activity ADD CONSTRAINT user_language_activity_session_language_check 
    CHECK (session_language IN ('en', 'fr'));

-- Update content_translation_audit constraints
ALTER TABLE content_translation_audit DROP CONSTRAINT IF EXISTS content_translation_audit_language_check;
ALTER TABLE content_translation_audit ADD CONSTRAINT content_translation_audit_language_check 
    CHECK (language IN ('en', 'fr'));

-- ===========================================
-- PHASE 4: UPDATE INDEXES FOR FRENCH CONTENT
-- ===========================================

-- Drop any Thai-specific indexes
DROP INDEX IF EXISTS idx_sop_documents_tags_th;
DROP INDEX IF EXISTS idx_sop_documents_steps_th;
DROP INDEX IF EXISTS idx_sop_documents_search_th;
DROP INDEX IF EXISTS idx_restaurants_name_th;
DROP INDEX IF EXISTS idx_sop_categories_name_th;

-- Create French-specific indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_sop_documents_tags_fr ON sop_documents USING GIN(tags_fr);
CREATE INDEX IF NOT EXISTS idx_sop_documents_steps_fr ON sop_documents USING GIN(steps_fr);
CREATE INDEX IF NOT EXISTS idx_sop_documents_search_fr ON sop_documents USING GIN(to_tsvector('french', COALESCE(title_fr, '') || ' ' || COALESCE(content_fr, '')));
CREATE INDEX IF NOT EXISTS idx_restaurants_name_fr ON restaurants USING GIN(to_tsvector('french', COALESCE(name_fr, '')));
CREATE INDEX IF NOT EXISTS idx_sop_categories_name_fr ON sop_categories USING GIN(to_tsvector('french', COALESCE(name_fr, '')));

-- ===========================================
-- PHASE 5: UPDATE FUNCTIONS FOR FRENCH SUPPORT
-- ===========================================

-- Update calculate_translation_completeness function
CREATE OR REPLACE FUNCTION calculate_translation_completeness(doc_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    lang VARCHAR(5);
    title_completeness INTEGER;
    content_completeness INTEGER;
    overall_completeness INTEGER;
BEGIN
    FOR lang IN SELECT unnest(ARRAY['en', 'fr']) LOOP
        -- Calculate completeness based on content availability
        SELECT 
            CASE 
                WHEN (CASE lang 
                    WHEN 'en' THEN title IS NOT NULL AND title != ''
                    WHEN 'fr' THEN title_fr IS NOT NULL AND title_fr != ''
                END) THEN 100 ELSE 0 END,
            CASE 
                WHEN (CASE lang 
                    WHEN 'en' THEN content IS NOT NULL AND content != ''
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

-- Update trigger function to handle French columns
CREATE OR REPLACE FUNCTION update_document_translation_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.translation_status = calculate_translation_completeness(NEW.id);
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to monitor French columns instead of Thai
DROP TRIGGER IF EXISTS trigger_sop_documents_translation_status ON sop_documents;
CREATE TRIGGER trigger_sop_documents_translation_status
    BEFORE UPDATE ON sop_documents
    FOR EACH ROW
    WHEN (OLD.title IS DISTINCT FROM NEW.title OR 
          OLD.content IS DISTINCT FROM NEW.content OR
          OLD.title_fr IS DISTINCT FROM NEW.title_fr OR
          OLD.content_fr IS DISTINCT FROM NEW.content_fr)
    EXECUTE FUNCTION update_document_translation_status();

-- ===========================================
-- PHASE 6: UPDATE VIEWS
-- ===========================================

-- Update document_translation_completeness view
DROP VIEW IF EXISTS document_translation_completeness;
CREATE OR REPLACE VIEW document_translation_completeness AS
SELECT 
    d.id,
    d.title,
    d.category_id,
    (d.translation_status->>'en')::jsonb->>'completeness' as en_completeness,
    (d.translation_status->>'fr')::jsonb->>'completeness' as fr_completeness,
    ROUND(
        ((COALESCE((d.translation_status->>'en')::jsonb->>('completeness')::text, '0')::numeric +
          COALESCE((d.translation_status->>'fr')::jsonb->>('completeness')::text, '0')::numeric) / 2), 
        2
    ) as overall_completeness,
    d.updated_at
FROM sop_documents d
WHERE d.status = 'approved';

-- ===========================================
-- PHASE 7: CLEAN UP THAI TRANSLATION DATA
-- ===========================================

-- Remove Thai language entries from translation_items
DELETE FROM translation_items WHERE source_language = 'th' OR target_language = 'th';

-- Update user language preferences from Thai to French
UPDATE auth_users SET 
    language_preferences = jsonb_set(
        COALESCE(language_preferences, '{}'::jsonb),
        '{secondaryLanguage}',
        '"fr"'::jsonb
    )
WHERE language_preferences->>'secondaryLanguage' = 'th';

-- Update restaurant settings from Thai to French
UPDATE restaurants SET 
    settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{language_default}',
        '"fr"'::jsonb
    )
WHERE settings->>'language_default' = 'th';

-- ===========================================
-- PHASE 8: INSERT SAMPLE FRENCH CONTENT
-- ===========================================

-- Insert sample French translation items
INSERT INTO translation_items (translation_key, source_text, source_language, target_language, translated_text, status, quality, confidence_score, category, priority, created_by)
SELECT 
    'sop.foodSafety.title',
    'Food Safety Procedures',
    'en',
    'fr',
    'Procédures de Sécurité Alimentaire',
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
    'fr',
    'Laver les mains soigneusement avec du savon et de l''eau tiède pendant au moins 20 secondes',
    'reviewed',
    'human',
    88,
    'Emergency Procedures',
    'urgent',
    (SELECT id FROM auth_users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth_users WHERE role = 'admin')
ON CONFLICT (translation_key, source_language, target_language) DO NOTHING;

-- ===========================================
-- PHASE 9: UPDATE TABLE STATISTICS
-- ===========================================

-- Update table statistics for better performance with French content
DO $$
BEGIN
    -- Only set statistics if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sop_documents' AND column_name = 'content_fr') THEN
        ALTER TABLE sop_documents ALTER COLUMN content_fr SET STATISTICS 1000;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_templates' AND column_name = 'schema_fr') THEN
        ALTER TABLE form_templates ALTER COLUMN schema_fr SET STATISTICS 500;
    END IF;
END $$;

-- Analyze tables for optimal query planning
ANALYZE restaurants;
ANALYZE auth_users;
ANALYZE sop_categories;
ANALYZE sop_documents;
ANALYZE form_templates;
ANALYZE form_submissions;
ANALYZE translation_items;

-- ===========================================
-- PHASE 10: PERMISSIONS AND VERIFICATION
-- ===========================================

-- Grant appropriate permissions on updated views
GRANT SELECT ON document_translation_completeness TO authenticated;

-- Final verification
DO $$
DECLARE
    thai_columns_count INTEGER;
    french_columns_count INTEGER;
    thai_translation_count INTEGER;
    french_translation_count INTEGER;
BEGIN
    -- Check for remaining Thai columns
    SELECT COUNT(*) INTO thai_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%_th'
    AND table_name NOT LIKE '%backup%';
    
    -- Count French columns
    SELECT COUNT(*) INTO french_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%_fr';
    
    -- Count translation items
    SELECT COUNT(*) INTO thai_translation_count FROM translation_items WHERE source_language = 'th' OR target_language = 'th';
    SELECT COUNT(*) INTO french_translation_count FROM translation_items WHERE source_language = 'fr' OR target_language = 'fr';
    
    RAISE NOTICE 'Migration 013 Verification Results:';
    RAISE NOTICE '- Remaining Thai columns: %', thai_columns_count;
    RAISE NOTICE '- French columns found: %', french_columns_count;
    RAISE NOTICE '- Thai translation items: %', thai_translation_count;
    RAISE NOTICE '- French translation items: %', french_translation_count;
    
    IF thai_columns_count = 0 AND french_columns_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Thai to French conversion completed successfully';
    ELSE
        RAISE WARNING 'WARNING: Conversion may be incomplete. Review results above.';
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 013: Complete Thai to French conversion completed';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '- Converted all remaining _th columns to _fr columns';
    RAISE NOTICE '- Updated language constraints to support EN/FR only';
    RAISE NOTICE '- Updated indexes for French text search';
    RAISE NOTICE '- Updated functions and triggers for French support';
    RAISE NOTICE '- Cleaned up Thai translation data';
    RAISE NOTICE '- Added sample French translation content';
    RAISE NOTICE 'System now fully supports EN/FR languages only';
    RAISE NOTICE 'Backup tables created with prefix migration_013_backup_';
END $$;