-- Migration: Bilingual Content Management System
-- Description: Add support for user language preferences, translation tracking, and bilingual content management
-- Version: 008
-- Date: 2024-01-27

-- Add language preferences to auth_users table
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS language_preferences JSONB DEFAULT '{
  "primaryLanguage": "en",
  "secondaryLanguage": "th", 
  "showTranslations": true,
  "autoTranslate": false,
  "translationQuality": "balanced",
  "preferredLanguageForContent": "auto",
  "fallbackLanguage": "en"
}'::jsonb;

-- Add content editing preferences to auth_users table
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS content_editing_preferences JSONB DEFAULT '{
  "defaultEditMode": "side-by-side",
  "showTranslationHints": true,
  "validateTranslations": true,
  "requireBothLanguages": false,
  "autoSaveInterval": 30
}'::jsonb;

-- Create translation management table
CREATE TABLE IF NOT EXISTS translation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_key VARCHAR(255) NOT NULL,
    source_text TEXT NOT NULL,
    source_language VARCHAR(5) NOT NULL CHECK (source_language IN ('en', 'th', 'fr')),
    target_language VARCHAR(5) NOT NULL CHECK (target_language IN ('en', 'th', 'fr')),
    translated_text TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'translated', 'reviewed', 'approved', 'rejected')),
    quality VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (quality IN ('auto', 'human', 'professional')),
    confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    category VARCHAR(100),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth_users(id),
    translated_by UUID REFERENCES auth_users(id),
    reviewed_by UUID REFERENCES auth_users(id),
    
    -- Ensure unique translation pairs
    UNIQUE(translation_key, source_language, target_language)
);

-- Create index for efficient translation lookups
CREATE INDEX IF NOT EXISTS idx_translation_items_key_lang ON translation_items(translation_key, target_language);
CREATE INDEX IF NOT EXISTS idx_translation_items_status ON translation_items(status);
CREATE INDEX IF NOT EXISTS idx_translation_items_priority ON translation_items(priority);
CREATE INDEX IF NOT EXISTS idx_translation_items_category ON translation_items(category);

-- Create translation workflow table for tracking approval process
CREATE TABLE IF NOT EXISTS translation_workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_item_id UUID NOT NULL REFERENCES translation_items(id) ON DELETE CASCADE,
    workflow_step VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    assigned_to UUID REFERENCES auth_users(id),
    completed_by UUID REFERENCES auth_users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for workflow tracking
CREATE INDEX IF NOT EXISTS idx_translation_workflow_item ON translation_workflow(translation_item_id);
CREATE INDEX IF NOT EXISTS idx_translation_workflow_assigned ON translation_workflow(assigned_to);
CREATE INDEX IF NOT EXISTS idx_translation_workflow_status ON translation_workflow(status);

-- Update sop_documents table to better support bilingual content
ALTER TABLE sop_documents 
ADD COLUMN IF NOT EXISTS title_th TEXT,
ADD COLUMN IF NOT EXISTS content_th TEXT,
ADD COLUMN IF NOT EXISTS title_fr TEXT,
ADD COLUMN IF NOT EXISTS content_fr TEXT,
ADD COLUMN IF NOT EXISTS translation_status JSONB DEFAULT '{
  "en": {"status": "original", "completeness": 100},
  "th": {"status": "pending", "completeness": 0},
  "fr": {"status": "pending", "completeness": 0}
}'::jsonb,
ADD COLUMN IF NOT EXISTS content_metadata JSONB DEFAULT '{
  "estimatedReadTime": {"en": 5, "th": 6, "fr": 5},
  "complexity": "moderate",
  "lastTranslationUpdate": null,
  "requiresTranslationReview": false
}'::jsonb;

-- Create content translation audit table
CREATE TABLE IF NOT EXISTS content_translation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    language VARCHAR(5) NOT NULL CHECK (language IN ('en', 'th', 'fr')),
    field_name VARCHAR(50) NOT NULL CHECK (field_name IN ('title', 'content')),
    old_value TEXT,
    new_value TEXT,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'translate')),
    translation_method VARCHAR(20) CHECK (translation_method IN ('manual', 'auto', 'assisted')),
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    changed_by UUID NOT NULL REFERENCES auth_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create index for audit tracking
CREATE INDEX IF NOT EXISTS idx_content_audit_document ON content_translation_audit(document_id);
CREATE INDEX IF NOT EXISTS idx_content_audit_language ON content_translation_audit(language);
CREATE INDEX IF NOT EXISTS idx_content_audit_user ON content_translation_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_content_audit_date ON content_translation_audit(created_at);

-- Create user language activity tracking
CREATE TABLE IF NOT EXISTS user_language_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    session_language VARCHAR(5) NOT NULL CHECK (session_language IN ('en', 'th', 'fr')),
    content_languages_viewed VARCHAR(5)[] DEFAULT ARRAY['en'],
    language_switches INTEGER DEFAULT 0,
    time_spent_per_language JSONB DEFAULT '{}'::jsonb,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP WITH TIME ZONE,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for language activity analysis
CREATE INDEX IF NOT EXISTS idx_user_language_activity_user ON user_language_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_language_activity_language ON user_language_activity(session_language);
CREATE INDEX IF NOT EXISTS idx_user_language_activity_date ON user_language_activity(session_start);

-- Update trigger for translation_items
CREATE OR REPLACE FUNCTION update_translation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_translation_items_updated_at
    BEFORE UPDATE ON translation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_translation_updated_at();

-- Function to calculate translation completeness
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

-- Trigger to update translation status when content changes
CREATE OR REPLACE FUNCTION update_document_translation_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.translation_status = calculate_translation_completeness(NEW.id);
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Insert sample translation items for testing
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

-- Update existing SOP documents with Thai translations
UPDATE sop_documents 
SET 
    title_th = CASE 
        WHEN category_id = 'emergency' THEN 'ขั้นตอนฉุกเฉิน'
        WHEN category_id = 'food-safety' THEN 'ความปลอดภัยอาหาร'
        WHEN category_id = 'kitchen-ops' THEN 'การปฏิบัติงานในครัว'
        WHEN category_id = 'service-standards' THEN 'มาตรฐานการบริการ'
        WHEN category_id = 'customer-service' THEN 'การบริการลูกค้า'
        ELSE title || ' (ไทย)'
    END,
    content_th = 'เนื้อหาภาษาไทยจะถูกเพิ่มในภายหลัง - Thai content to be added later',
    translation_status = jsonb_build_object(
        'en', jsonb_build_object('status', 'original', 'completeness', 100),
        'th', jsonb_build_object('status', 'partial', 'completeness', 50),
        'fr', jsonb_build_object('status', 'pending', 'completeness', 0)
    )
WHERE title_th IS NULL;

-- Enable RLS on new tables
ALTER TABLE translation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_translation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for translation_items
CREATE POLICY "Users can view translation items" ON translation_items
    FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage translation items" ON translation_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Translators can update their assigned translations" ON translation_items
    FOR UPDATE USING (
        translated_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth_users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- RLS Policies for content_translation_audit
CREATE POLICY "Users can view translation audit for their changes" ON content_translation_audit
    FOR SELECT USING (
        changed_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth_users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can insert translation audit records" ON content_translation_audit
    FOR INSERT WITH CHECK (changed_by = auth.uid());

-- RLS Policies for user_language_activity
CREATE POLICY "Users can manage their own language activity" ON user_language_activity
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all language activity" ON user_language_activity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create view for translation statistics
CREATE OR REPLACE VIEW translation_statistics AS
SELECT 
    target_language,
    category,
    COUNT(*) as total_items,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'translated' THEN 1 END) as translated,
    COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
    ROUND(AVG(confidence_score), 2) as avg_confidence,
    ROUND(
        (COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 
        2
    ) as completion_rate
FROM translation_items
GROUP BY target_language, category;

-- Create view for document translation completeness
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
WHERE d.status = 'published';

-- Grant appropriate permissions
GRANT SELECT ON translation_statistics TO authenticated;
GRANT SELECT ON document_translation_completeness TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE translation_items IS 'Manages individual translation items with workflow tracking';
COMMENT ON TABLE translation_workflow IS 'Tracks translation approval workflow steps';
COMMENT ON TABLE content_translation_audit IS 'Audits all changes to multilingual content';
COMMENT ON TABLE user_language_activity IS 'Tracks user language preferences and usage patterns';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 008: Bilingual Content Management System completed successfully';
    RAISE NOTICE 'Added tables: translation_items, translation_workflow, content_translation_audit, user_language_activity';
    RAISE NOTICE 'Enhanced sop_documents with bilingual content support';
    RAISE NOTICE 'Created views: translation_statistics, document_translation_completeness';
END $$;