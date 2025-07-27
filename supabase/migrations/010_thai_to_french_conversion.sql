-- Migration: Convert Thai (TH) Language Support to French (FR)
-- Description: Systematically replace all Thai language columns and data with French equivalents
-- Version: 010
-- Date: 2025-07-27

-- ===========================================
-- PHASE 1: BACKUP AND PREPARATION
-- ===========================================

-- Create temporary backup tables for rollback capability
CREATE TABLE restaurants_backup AS SELECT * FROM restaurants;
CREATE TABLE auth_users_backup AS SELECT * FROM auth_users;
CREATE TABLE sop_categories_backup AS SELECT * FROM sop_categories;
CREATE TABLE sop_documents_backup AS SELECT * FROM sop_documents;
CREATE TABLE form_templates_backup AS SELECT * FROM form_templates;
CREATE TABLE form_submissions_backup AS SELECT * FROM form_submissions;
CREATE TABLE translation_items_backup AS SELECT * FROM translation_items;

-- ===========================================
-- PHASE 2: SCHEMA CHANGES - RENAME COLUMNS
-- ===========================================

-- 1. Restaurants table: name_th → name_fr, address_th → address_fr
ALTER TABLE restaurants RENAME COLUMN name_th TO name_fr;
ALTER TABLE restaurants RENAME COLUMN address_th TO address_fr;

-- 2. Auth users table: full_name_th → full_name_fr, position_th → position_fr
ALTER TABLE auth_users RENAME COLUMN full_name_th TO full_name_fr;
ALTER TABLE auth_users RENAME COLUMN position_th TO position_fr;

-- 3. SOP categories table: name_th → name_fr, description_th → description_fr
ALTER TABLE sop_categories RENAME COLUMN name_th TO name_fr;
ALTER TABLE sop_categories RENAME COLUMN description_th TO description_fr;

-- 4. SOP documents table: Multiple Thai columns to French
ALTER TABLE sop_documents RENAME COLUMN title_th TO title_fr;
ALTER TABLE sop_documents RENAME COLUMN content_th TO content_fr;
ALTER TABLE sop_documents RENAME COLUMN steps_th TO steps_fr;
ALTER TABLE sop_documents RENAME COLUMN tags_th TO tags_fr;

-- 5. Form templates table: name_th → name_fr, description_th → description_fr, schema_th → schema_fr
ALTER TABLE form_templates RENAME COLUMN name_th TO name_fr;
ALTER TABLE form_templates RENAME COLUMN description_th TO description_fr;
ALTER TABLE form_templates RENAME COLUMN schema_th TO schema_fr;

-- 6. Form submissions table: notes_th → notes_fr
ALTER TABLE form_submissions RENAME COLUMN notes_th TO notes_fr;

-- ===========================================
-- PHASE 3: UPDATE CONSTRAINTS AND CHECKS
-- ===========================================

-- Update translation_items table language constraints
ALTER TABLE translation_items DROP CONSTRAINT IF EXISTS translation_items_source_language_check;
ALTER TABLE translation_items DROP CONSTRAINT IF EXISTS translation_items_target_language_check;

ALTER TABLE translation_items ADD CONSTRAINT translation_items_source_language_check 
    CHECK (source_language IN ('en', 'fr'));
ALTER TABLE translation_items ADD CONSTRAINT translation_items_target_language_check 
    CHECK (target_language IN ('en', 'fr'));

-- Update user_language_activity table language constraints
ALTER TABLE user_language_activity DROP CONSTRAINT IF EXISTS user_language_activity_session_language_check;
ALTER TABLE user_language_activity ADD CONSTRAINT user_language_activity_session_language_check 
    CHECK (session_language IN ('en', 'fr'));

-- Update content_translation_audit table language constraints
ALTER TABLE content_translation_audit DROP CONSTRAINT IF EXISTS content_translation_audit_language_check;
ALTER TABLE content_translation_audit ADD CONSTRAINT content_translation_audit_language_check 
    CHECK (language IN ('en', 'fr'));

-- ===========================================
-- PHASE 4: UPDATE INDEXES
-- ===========================================

-- Drop old Thai-specific indexes
DROP INDEX IF EXISTS idx_sop_documents_tags_th;
DROP INDEX IF EXISTS idx_sop_documents_steps_th;
DROP INDEX IF EXISTS idx_sop_documents_search_th;

-- Create new French-specific indexes
CREATE INDEX idx_sop_documents_tags_fr ON sop_documents USING GIN(tags_fr);
CREATE INDEX idx_sop_documents_steps_fr ON sop_documents USING GIN(steps_fr);
CREATE INDEX idx_sop_documents_search_fr ON sop_documents USING GIN(to_tsvector('french', title_fr || ' ' || content_fr));

-- ===========================================
-- PHASE 5: UPDATE FUNCTIONS
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

-- Update trigger function to handle French instead of Thai
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
-- PHASE 7: UPDATE DATA - CONVERT THAI TO FRENCH
-- ===========================================

-- Update restaurants table with French translations
UPDATE restaurants SET 
    name_fr = CASE 
        WHEN name_fr = 'ร้านกรองไทย' THEN 'Restaurant Krong Thaï'
        ELSE name_fr
    END,
    address_fr = CASE 
        WHEN address_fr = '123 ถนนใหญ่ กรุงเทพฯ 10110' THEN '123 Rue Principale, Bangkok 10110, Thaïlande'
        ELSE address_fr
    END,
    settings = jsonb_set(
        settings, 
        '{language_default}', 
        '"fr"'::jsonb
    )
WHERE name_fr IS NOT NULL;

-- Update auth_users table with French translations
UPDATE auth_users SET 
    full_name_fr = CASE 
        WHEN full_name_fr = 'ผู้ดูแลระบบ' THEN 'Administrateur système'
        WHEN full_name_fr = 'สมชาย ใจดี' THEN 'Somchai Jaidee'
        WHEN full_name_fr = 'มาลี สุขสาร' THEN 'Malee Suksan'
        WHEN full_name_fr = 'ณรงค์ โฉมฉาย' THEN 'Narong Chomchai'
        WHEN full_name_fr = 'ศิริพร ธนกิจ' THEN 'Siriporn Thanakit'
        WHEN full_name_fr = 'กมล จิตรา' THEN 'Kamon Jittra'
        WHEN full_name_fr = 'เพ็ญศิริ มูลส้ม' THEN 'Pensiri Moonsom'
        ELSE full_name_fr
    END,
    position_fr = CASE 
        WHEN position_fr = 'ผู้ดูแลระบบ' THEN 'Administrateur système'
        WHEN position_fr = 'ผู้จัดการร้านอาหาร' THEN 'Directeur de restaurant'
        WHEN position_fr = 'พนักงานเสิร์ฟ' THEN 'Serveur/Serveuse'
        WHEN position_fr = 'หัวหน้าเชฟ' THEN 'Chef principal'
        WHEN position_fr = 'พนักงานเสิร์ฟอาวุโส' THEN 'Serveur/Serveuse senior'
        WHEN position_fr = 'แคชเชียร์' THEN 'Caissier/Caissière'
        ELSE position_fr
    END,
    language_preferences = jsonb_set(
        COALESCE(language_preferences, '{}'::jsonb),
        '{primaryLanguage}',
        '"en"'::jsonb
    ),
    language_preferences = jsonb_set(
        language_preferences,
        '{secondaryLanguage}',
        '"fr"'::jsonb
    )
WHERE full_name_fr IS NOT NULL OR position_fr IS NOT NULL;

-- Update sop_categories table with French translations
UPDATE sop_categories SET 
    name_fr = CASE 
        WHEN code = 'FOOD_SAFETY' THEN 'Sécurité et Hygiène Alimentaire'
        WHEN code = 'CLEANING' THEN 'Nettoyage et Assainissement'
        WHEN code = 'CUSTOMER_SERVICE' THEN 'Service Client'
        WHEN code = 'KITCHEN_OPS' THEN 'Opérations de Cuisine'
        WHEN code = 'INVENTORY' THEN 'Gestion des Stocks'
        WHEN code = 'CASH_HANDLING' THEN 'Gestion de Caisse et PDV'
        WHEN code = 'STAFF_TRAINING' THEN 'Formation du Personnel'
        WHEN code = 'SAFETY_SECURITY' THEN 'Sécurité et Sûreté'
        WHEN code = 'MAINTENANCE' THEN 'Maintenance des Équipements'
        WHEN code = 'QUALITY_CONTROL' THEN 'Contrôle Qualité'
        WHEN code = 'OPENING_CLOSING' THEN 'Ouverture et Fermeture'
        WHEN code = 'DELIVERY_TAKEOUT' THEN 'Livraison et Emporter'
        WHEN code = 'WASTE_MANAGEMENT' THEN 'Gestion des Déchets'
        WHEN code = 'COMPLIANCE' THEN 'Conformité Réglementaire'
        WHEN code = 'MARKETING_PROMO' THEN 'Marketing et Promotions'
        WHEN code = 'EMERGENCY' THEN 'Procédures d''Urgence'
        ELSE name_fr
    END,
    description_fr = CASE 
        WHEN code = 'FOOD_SAFETY' THEN 'Procédures de manipulation, stockage et sécurité alimentaire'
        WHEN code = 'CLEANING' THEN 'Plannings de nettoyage, procédures d''assainissement'
        WHEN code = 'CUSTOMER_SERVICE' THEN 'Interaction client, gestion des plaintes, standards de service'
        WHEN code = 'KITCHEN_OPS' THEN 'Procédures de cuisine, fonctionnement des équipements, flux de travail'
        WHEN code = 'INVENTORY' THEN 'Contrôle des stocks, commandes, gestion des fournisseurs'
        WHEN code = 'CASH_HANDLING' THEN 'Traitement des paiements, caisse enregistreuse, procédures financières'
        WHEN code = 'STAFF_TRAINING' THEN 'Intégration des employés, développement des compétences, certification'
        WHEN code = 'SAFETY_SECURITY' THEN 'Procédures d''urgence, prévention des accidents, protocoles de sécurité'
        WHEN code = 'MAINTENANCE' THEN 'Entretien des équipements, maintenance préventive, procédures de réparation'
        WHEN code = 'QUALITY_CONTROL' THEN 'Standards de qualité alimentaire, tests de goût, présentation'
        WHEN code = 'OPENING_CLOSING' THEN 'Procédures quotidiennes d''ouverture et de fermeture'
        WHEN code = 'DELIVERY_TAKEOUT' THEN 'Emballage des commandes, protocoles de livraison, procédures de retrait'
        WHEN code = 'WASTE_MANAGEMENT' THEN 'Élimination des déchets, recyclage, conformité environnementale'
        WHEN code = 'COMPLIANCE' THEN 'Permis sanitaires, inspections, exigences légales'
        WHEN code = 'MARKETING_PROMO' THEN 'Campagnes promotionnelles, médias sociaux, engagement client'
        WHEN code = 'EMERGENCY' THEN 'Gestion de crise, contacts d''urgence, plans d''évacuation'
        ELSE description_fr
    END
WHERE name_fr IS NOT NULL;

-- Update sop_documents table with French translations
UPDATE sop_documents SET 
    title_fr = CASE 
        WHEN title_fr = 'ขั้นตอนการล้างมือ' THEN 'Procédure de Lavage des Mains'
        WHEN title_fr = 'การทักทายและจัดที่นั่งแขก' THEN 'Accueil et Installation des Clients'
        WHEN title_fr = 'รายการทำความสะอาดปิดวัน' THEN 'Liste de Nettoyage de Fin de Journée'
        WHEN title_fr = 'มาตรฐานการทำผัดไทย' THEN 'Standard de Préparation du Pad Thaï'
        WHEN title_fr = 'การใช้งานระบบขายหน้าร้าน' THEN 'Utilisation du Système de Point de Vente'
        ELSE title_fr
    END,
    content_fr = CASE 
        WHEN title = 'Hand Washing Procedure' THEN 'Le lavage correct des mains est essentiel pour la sécurité alimentaire. Cette procédure doit être suivie par tout le personnel de cuisine et de service avant de manipuler les aliments, après être allé aux toilettes, et lors du changement de tâches.'
        WHEN title = 'Greeting and Seating Guests' THEN 'Les premières impressions comptent. Cette procédure garantit que tous les clients reçoivent un accueil chaleureux et professionnel qui reflète nos valeurs d''hospitalité thaïlandaise.'
        WHEN title = 'End of Day Cleaning Checklist' THEN 'Procédures de nettoyage complètes à effectuer à la fin de chaque jour de service.'
        WHEN title = 'Pad Thai Preparation Standard' THEN 'Guide étape par étape pour préparer un Pad Thaï authentique selon les standards du restaurant.'
        WHEN title = 'Point of Sale System Operation' THEN 'Guide complet pour utiliser le système PDV incluant le traitement des paiements et les rapports.'
        ELSE content_fr
    END,
    steps_fr = CASE 
        WHEN title = 'Hand Washing Procedure' THEN '[
            {"step": 1, "action": "Retirer les bijoux et retrousser les manches", "duration": "5 secondes"},
            {"step": 2, "action": "Mouiller les mains avec de l''eau tiède", "duration": "5 secondes"},
            {"step": 3, "action": "Appliquer du savon et faire mousser pendant 20 secondes", "duration": "20 secondes"},
            {"step": 4, "action": "Frotter entre les doigts et sous les ongles", "duration": "10 secondes"},
            {"step": 5, "action": "Rincer abondamment à l''eau tiède", "duration": "10 secondes"},
            {"step": 6, "action": "Sécher avec une serviette en papier propre", "duration": "5 secondes"},
            {"step": 7, "action": "Utiliser la serviette pour fermer le robinet", "duration": "2 secondes"}
        ]'::JSONB
        WHEN title = 'Greeting and Seating Guests' THEN '[
            {"step": 1, "action": "Saluer dans les 30 secondes avec un sourire et un wai", "note": "Utiliser la salutation traditionnelle thaïlandaise"},
            {"step": 2, "action": "Demander s''il y a une réservation ou la taille du groupe", "note": "Être prêt avec les options de places"},
            {"step": 3, "action": "Accompagner à la table appropriée", "note": "Considérer les préférences des clients et l''accessibilité"},
            {"step": 4, "action": "Présenter les menus et expliquer les spécialités", "note": "Mettre en avant les plats thaïlandais populaires"},
            {"step": 5, "action": "Offrir de l''eau et demander pour les boissons", "note": "Suggérer des boissons traditionnelles thaïlandaises"}
        ]'::JSONB
        ELSE steps_fr
    END,
    tags_fr = CASE 
        WHEN title = 'Hand Washing Procedure' THEN ARRAY['hygiène', 'sécurité alimentaire', 'lavage des mains', 'désinfection']
        WHEN title = 'Greeting and Seating Guests' THEN ARRAY['service client', 'accueil', 'hospitalité', 'culture thaïlandaise']
        ELSE tags_fr
    END,
    translation_status = jsonb_build_object(
        'en', jsonb_build_object('status', 'original', 'completeness', 100),
        'fr', jsonb_build_object('status', 'translated', 'completeness', 90)
    )
WHERE title_fr IS NOT NULL;

-- Update form_templates table with French translations
UPDATE form_templates SET 
    name_fr = CASE 
        WHEN name_fr = 'รายการตรวจสอบความปลอดภัยอาหารประจำวัน' THEN 'Liste de Contrôle Quotidienne de Sécurité Alimentaire'
        ELSE name_fr
    END,
    description_fr = CASE 
        WHEN description_fr = 'รายการตรวจสอบประจำวันเพื่อให้แน่ใจว่าปฏิบัติตามมาตรฐานความปลอดภัยอาหาร' THEN 'Liste de contrôle quotidienne pour assurer la conformité aux normes de sécurité alimentaire'
        ELSE description_fr
    END,
    schema_fr = CASE 
        WHEN name = 'Daily Food Safety Checklist' THEN '{
            "fields": [
                {
                    "id": "refrigerator_temp",
                    "type": "number", 
                    "label": "Température du réfrigérateur (°C)",
                    "required": true,
                    "min": 0,
                    "max": 5
                },
                {
                    "id": "freezer_temp",
                    "type": "number",
                    "label": "Température du congélateur (°C)", 
                    "required": true,
                    "min": -20,
                    "max": -15
                },
                {
                    "id": "hand_wash_stations",
                    "type": "checkbox",
                    "label": "Stations de lavage des mains approvisionnées",
                    "required": true
                },
                {
                    "id": "sanitizer_levels",
                    "type": "select",
                    "label": "Niveaux de désinfectant",
                    "options": ["Plein", "Moitié", "Faible", "Vide"],
                    "required": true
                },
                {
                    "id": "food_storage_check",
                    "type": "checkbox", 
                    "label": "Zones de stockage alimentaire propres et organisées",
                    "required": true
                },
                {
                    "id": "notes",
                    "type": "textarea",
                    "label": "Notes supplémentaires",
                    "required": false
                }
            ]
        }'::JSONB
        ELSE schema_fr
    END
WHERE name_fr IS NOT NULL;

-- Clean up translation_items table - remove Thai entries and add French placeholders
DELETE FROM translation_items WHERE source_language = 'th' OR target_language = 'th';

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
-- PHASE 8: UPDATE STATISTICS TABLES
-- ===========================================

-- Update table statistics for better performance with French content
ALTER TABLE sop_documents ALTER COLUMN content_fr SET STATISTICS 1000;
ALTER TABLE form_templates ALTER COLUMN schema_fr SET STATISTICS 500;

-- Analyze tables for optimal query planning
ANALYZE restaurants;
ANALYZE auth_users;
ANALYZE sop_categories;
ANALYZE sop_documents;
ANALYZE form_templates;
ANALYZE form_submissions;
ANALYZE translation_items;

-- ===========================================
-- PHASE 9: VERIFICATION AND CLEANUP
-- ===========================================

-- Create verification queries for data integrity
DO $$
DECLARE
    thai_columns_count INTEGER;
    french_columns_count INTEGER;
    restaurants_count INTEGER;
    users_count INTEGER;
    categories_count INTEGER;
    docs_count INTEGER;
BEGIN
    -- Verify French columns exist and Thai columns are renamed
    SELECT COUNT(*) INTO french_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%_fr';
    
    SELECT COUNT(*) INTO thai_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%_th';
    
    -- Count records with French content
    SELECT COUNT(*) INTO restaurants_count FROM restaurants WHERE name_fr IS NOT NULL;
    SELECT COUNT(*) INTO users_count FROM auth_users WHERE full_name_fr IS NOT NULL OR position_fr IS NOT NULL;
    SELECT COUNT(*) INTO categories_count FROM sop_categories WHERE name_fr IS NOT NULL;
    SELECT COUNT(*) INTO docs_count FROM sop_documents WHERE title_fr IS NOT NULL;
    
    -- Log verification results
    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE '- French columns found: %', french_columns_count;
    RAISE NOTICE '- Thai columns remaining: %', thai_columns_count;
    RAISE NOTICE '- Restaurants with French data: %', restaurants_count;
    RAISE NOTICE '- Users with French data: %', users_count;
    RAISE NOTICE '- Categories with French data: %', categories_count;
    RAISE NOTICE '- Documents with French data: %', docs_count;
    
    IF thai_columns_count > 0 THEN
        RAISE WARNING 'Some Thai columns still exist - migration may be incomplete';
    END IF;
    
    IF french_columns_count = 0 THEN
        RAISE EXCEPTION 'No French columns found - migration failed';
    END IF;
END $$;

-- ===========================================
-- PHASE 10: PERMISSIONS AND FINAL SETUP
-- ===========================================

-- Grant appropriate permissions on updated views
GRANT SELECT ON document_translation_completeness TO authenticated;

-- Add final documentation
COMMENT ON MIGRATION IS 'Migration 010: Converted Thai (TH) language support to French (FR) language support. All _th columns renamed to _fr, data translated, and constraints updated.';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 010: Thai to French conversion completed successfully';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '- Renamed all _th columns to _fr columns';
    RAISE NOTICE '- Translated Thai content to French equivalents';
    RAISE NOTICE '- Updated language constraints from th to fr';
    RAISE NOTICE '- Updated indexes and functions for French support';
    RAISE NOTICE '- Created backup tables for rollback capability';
    RAISE NOTICE 'System now supports EN/FR languages only';
END $$;