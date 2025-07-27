-- Migration Verification: Thai to French Language Conversion
-- Description: Verify that all Thai language columns have been converted to French
-- Version: 011
-- Date: 2025-07-27

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- 1. Check for any remaining Thai column names
DO $$
DECLARE
    thai_columns_count INTEGER;
    column_record RECORD;
BEGIN
    -- Count remaining Thai columns
    SELECT COUNT(*) INTO thai_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%_th';
    
    IF thai_columns_count > 0 THEN
        RAISE NOTICE 'WARNING: Found % Thai columns still present:', thai_columns_count;
        
        -- List the remaining Thai columns
        FOR column_record IN 
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND column_name LIKE '%_th'
            ORDER BY table_name, column_name
        LOOP
            RAISE NOTICE 'Table: %, Column: %', column_record.table_name, column_record.column_name;
        END LOOP;
    ELSE
        RAISE NOTICE 'SUCCESS: No Thai columns (_th) found in schema';
    END IF;
END $$;

-- 2. Check for French columns presence
DO $$
DECLARE
    french_columns_count INTEGER;
    column_record RECORD;
BEGIN
    -- Count French columns
    SELECT COUNT(*) INTO french_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%_fr';
    
    IF french_columns_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Found % French columns:', french_columns_count;
        
        -- List the French columns
        FOR column_record IN 
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND column_name LIKE '%_fr'
            ORDER BY table_name, column_name
        LOOP
            RAISE NOTICE 'Table: %, Column: %', column_record.table_name, column_record.column_name;
        END LOOP;
    ELSE
        RAISE NOTICE 'WARNING: No French columns (_fr) found in schema';
    END IF;
END $$;

-- 3. Verify language constraints in translation_items table
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Check language constraints
    FOR constraint_record IN
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%language%'
        AND constraint_schema = 'public'
    LOOP
        RAISE NOTICE 'Constraint: %, Check: %', constraint_record.constraint_name, constraint_record.check_clause;
    END LOOP;
END $$;

-- 4. Check data integrity - count records with French content
DO $$
DECLARE
    restaurants_fr_count INTEGER;
    users_fr_count INTEGER;
    categories_fr_count INTEGER;
    docs_fr_count INTEGER;
    templates_fr_count INTEGER;
BEGIN
    -- Count records with French content
    SELECT COUNT(*) INTO restaurants_fr_count FROM restaurants WHERE name_fr IS NOT NULL;
    SELECT COUNT(*) INTO users_fr_count FROM auth_users WHERE full_name_fr IS NOT NULL OR position_fr IS NOT NULL;
    SELECT COUNT(*) INTO categories_fr_count FROM sop_categories WHERE name_fr IS NOT NULL;
    SELECT COUNT(*) INTO docs_fr_count FROM sop_documents WHERE title_fr IS NOT NULL OR content_fr IS NOT NULL;
    SELECT COUNT(*) INTO templates_fr_count FROM form_templates WHERE name_fr IS NOT NULL;
    
    RAISE NOTICE 'Data Integrity Check:';
    RAISE NOTICE '- Restaurants with French data: %', restaurants_fr_count;
    RAISE NOTICE '- Users with French data: %', users_fr_count;
    RAISE NOTICE '- Categories with French data: %', categories_fr_count;
    RAISE NOTICE '- Documents with French data: %', docs_fr_count;
    RAISE NOTICE '- Templates with French data: %', templates_fr_count;
END $$;

-- 5. Verify indexes exist for French content
DO $$
DECLARE
    index_record RECORD;
    french_indexes_count INTEGER := 0;
BEGIN
    -- Check for French-specific indexes
    FOR index_record IN
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND (indexname LIKE '%_fr' OR indexname LIKE '%french%')
    LOOP
        french_indexes_count := french_indexes_count + 1;
        RAISE NOTICE 'French index found: % on table %', index_record.indexname, index_record.tablename;
    END LOOP;
    
    IF french_indexes_count = 0 THEN
        RAISE NOTICE 'WARNING: No French-specific indexes found';
    ELSE
        RAISE NOTICE 'SUCCESS: Found % French-specific indexes', french_indexes_count;
    END IF;
END $$;

-- 6. Test translation completeness function
DO $$
DECLARE
    test_doc_id UUID;
    completeness_result JSONB;
BEGIN
    -- Get a test document
    SELECT id INTO test_doc_id FROM sop_documents LIMIT 1;
    
    IF test_doc_id IS NOT NULL THEN
        -- Test the function
        SELECT calculate_translation_completeness(test_doc_id) INTO completeness_result;
        
        RAISE NOTICE 'Translation completeness test:';
        RAISE NOTICE 'Document ID: %', test_doc_id;
        RAISE NOTICE 'Completeness result: %', completeness_result;
        
        -- Check if French is included in the result
        IF completeness_result ? 'fr' THEN
            RAISE NOTICE 'SUCCESS: Function includes French language support';
        ELSE
            RAISE NOTICE 'WARNING: Function missing French language support';
        END IF;
        
        -- Check if Thai is removed from the result
        IF completeness_result ? 'th' THEN
            RAISE NOTICE 'WARNING: Function still includes Thai language support';
        ELSE
            RAISE NOTICE 'SUCCESS: Function no longer includes Thai language support';
        END IF;
    ELSE
        RAISE NOTICE 'No test documents found for function testing';
    END IF;
END $$;

-- 7. Verify translation_items constraints
DO $$
DECLARE
    thai_items_count INTEGER;
    french_items_count INTEGER;
BEGIN
    -- Count translation items with Thai language
    SELECT COUNT(*) INTO thai_items_count 
    FROM translation_items 
    WHERE source_language = 'th' OR target_language = 'th';
    
    -- Count translation items with French language
    SELECT COUNT(*) INTO french_items_count 
    FROM translation_items 
    WHERE source_language = 'fr' OR target_language = 'fr';
    
    RAISE NOTICE 'Translation Items Check:';
    RAISE NOTICE '- Items with Thai language: %', thai_items_count;
    RAISE NOTICE '- Items with French language: %', french_items_count;
    
    IF thai_items_count > 0 THEN
        RAISE NOTICE 'WARNING: Thai translation items still exist';
    ELSE
        RAISE NOTICE 'SUCCESS: No Thai translation items found';
    END IF;
END $$;

-- 8. Verify language preference defaults
DO $$
DECLARE
    users_with_fr_prefs INTEGER;
    user_record RECORD;
BEGIN
    -- Count users with French language preferences
    SELECT COUNT(*) INTO users_with_fr_prefs
    FROM auth_users 
    WHERE language_preferences->>'secondaryLanguage' = 'fr';
    
    RAISE NOTICE 'Language Preferences Check:';
    RAISE NOTICE '- Users with French as secondary language: %', users_with_fr_prefs;
    
    -- Sample a few user language preferences
    FOR user_record IN
        SELECT email, language_preferences
        FROM auth_users
        WHERE language_preferences IS NOT NULL
        LIMIT 3
    LOOP
        RAISE NOTICE 'User %, Preferences: %', user_record.email, user_record.language_preferences;
    END LOOP;
END $$;

-- 9. Check backup tables exist (for rollback capability)
DO $$
DECLARE
    backup_table RECORD;
    backup_count INTEGER := 0;
BEGIN
    FOR backup_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%_backup'
        ORDER BY table_name
    LOOP
        backup_count := backup_count + 1;
        RAISE NOTICE 'Backup table found: %', backup_table.table_name;
    END LOOP;
    
    IF backup_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Found % backup tables for rollback capability', backup_count;
    ELSE
        RAISE NOTICE 'WARNING: No backup tables found';
    END IF;
END $$;

-- 10. Final migration status summary
DO $$
DECLARE
    migration_status TEXT := 'SUCCESS';
    issues_found INTEGER := 0;
BEGIN
    -- Check for any remaining issues
    
    -- Check 1: Thai columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name LIKE '%_th'
    ) THEN
        migration_status := 'PARTIAL';
        issues_found := issues_found + 1;
    END IF;
    
    -- Check 2: French columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name LIKE '%_fr'
    ) THEN
        migration_status := 'FAILED';
        issues_found := issues_found + 1;
    END IF;
    
    -- Check 3: Thai translation items
    IF EXISTS (
        SELECT 1 FROM translation_items 
        WHERE source_language = 'th' OR target_language = 'th'
    ) THEN
        migration_status := 'PARTIAL';
        issues_found := issues_found + 1;
    END IF;
    
    -- Final report
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRATION STATUS: %', migration_status;
    RAISE NOTICE 'ISSUES FOUND: %', issues_found;
    RAISE NOTICE '==========================================';
    
    IF migration_status = 'SUCCESS' THEN
        RAISE NOTICE 'Thai to French migration completed successfully!';
        RAISE NOTICE 'System now supports EN/FR languages only.';
    ELSIF migration_status = 'PARTIAL' THEN
        RAISE NOTICE 'Migration partially completed. Some issues need attention.';
    ELSE
        RAISE NOTICE 'Migration failed. Please review and fix issues.';
    END IF;
END $$;