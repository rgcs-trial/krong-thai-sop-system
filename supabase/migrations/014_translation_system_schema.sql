-- Translation System Schema Migration
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-27
-- Purpose: Centralized translation management system for multilingual support

-- ===========================================
-- TRANSLATION SYSTEM ENUMS
-- ===========================================

-- Translation status workflow
CREATE TYPE translation_status AS ENUM ('draft', 'review', 'approved', 'published', 'deprecated');

-- Translation key category for organization
CREATE TYPE translation_category AS ENUM (
    'common',
    'auth', 
    'sop',
    'navigation',
    'errors',
    'dashboard',
    'search',
    'recommendations',
    'analytics',
    'training',
    'time',
    'categories',
    'forms',
    'notifications',
    'reports',
    'settings'
);

-- Supported locales (expandable)
CREATE TYPE supported_locale AS ENUM ('en', 'fr', 'th');

-- Priority levels for translation work
CREATE TYPE translation_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ===========================================
-- TRANSLATION KEYS TABLE
-- ===========================================

-- Central registry of all translatable keys
CREATE TABLE translation_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Key identification
    key_name VARCHAR(255) NOT NULL UNIQUE, -- e.g., "common.loading", "search.resultsCount"
    category translation_category NOT NULL,
    
    -- Context and metadata
    description TEXT, -- Context for translators
    context_notes TEXT, -- Additional context or usage notes
    
    -- Interpolation variables support
    interpolation_vars JSONB DEFAULT '[]', -- Array of variable names like ["count", "query", "name"]
    
    -- ICU message format support
    supports_pluralization BOOLEAN DEFAULT false,
    pluralization_rules JSONB DEFAULT '{}', -- ICU plural rules by locale
    
    -- Organizational metadata
    namespace VARCHAR(100), -- Optional namespace for large systems
    feature_area VARCHAR(100), -- Feature area like "authentication", "analytics"
    
    -- Priority and status
    priority translation_priority DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth_users(id),
    updated_by UUID REFERENCES auth_users(id)
);

-- ===========================================
-- TRANSLATIONS TABLE
-- ===========================================

-- Actual translations for each key and locale
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to translation key
    translation_key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
    
    -- Locale and content
    locale supported_locale NOT NULL,
    value TEXT NOT NULL, -- The actual translated text
    
    -- ICU message format for complex translations
    icu_message TEXT, -- ICU formatted message for pluralization/interpolation
    
    -- Translation metadata
    character_count INTEGER GENERATED ALWAYS AS (LENGTH(value)) STORED,
    word_count INTEGER,
    
    -- Workflow status
    status translation_status DEFAULT 'draft',
    
    -- Version control
    version INTEGER DEFAULT 1,
    previous_value TEXT, -- Previous version for rollback
    
    -- Quality assurance
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth_users(id),
    
    -- Approval workflow
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth_users(id),
    
    -- Publication
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES auth_users(id),
    
    -- Translation notes
    translator_notes TEXT,
    reviewer_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth_users(id),
    updated_by UUID REFERENCES auth_users(id),
    
    -- Ensure one translation per key per locale per version
    UNIQUE(translation_key_id, locale, version)
);

-- ===========================================
-- TRANSLATION HISTORY TABLE
-- ===========================================

-- Track all changes to translations for audit purposes
CREATE TABLE translation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to translation
    translation_id UUID NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    translation_key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
    
    -- Change tracking
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PUBLISH'
    old_value TEXT,
    new_value TEXT,
    old_status translation_status,
    new_status translation_status,
    
    -- Change metadata
    change_reason TEXT,
    locale supported_locale NOT NULL,
    version_before INTEGER,
    version_after INTEGER,
    
    -- User and timestamp
    changed_by UUID REFERENCES auth_users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional context
    metadata JSONB DEFAULT '{}'
);

-- ===========================================
-- TRANSLATION PROJECTS TABLE
-- ===========================================

-- Organize translation work into projects
CREATE TABLE translation_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Project details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Target locales
    target_locales supported_locale[] NOT NULL DEFAULT '{}',
    
    -- Timeline
    start_date DATE,
    target_completion_date DATE,
    actual_completion_date DATE,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'in_progress', 'review', 'completed', 'cancelled'
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Assignment
    project_manager_id UUID REFERENCES auth_users(id),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth_users(id)
);

-- ===========================================
-- TRANSLATION PROJECT ASSIGNMENTS TABLE
-- ===========================================

-- Assign translation keys to projects
CREATE TABLE translation_project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    project_id UUID NOT NULL REFERENCES translation_projects(id) ON DELETE CASCADE,
    translation_key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
    
    -- Assignment details
    assigned_locale supported_locale NOT NULL,
    assigned_to UUID REFERENCES auth_users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    assignment_status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'blocked'
    priority translation_priority DEFAULT 'medium',
    
    -- Timeline
    due_date DATE,
    completed_at TIMESTAMPTZ,
    
    -- Notes
    assignment_notes TEXT,
    
    -- Ensure unique assignment per project/key/locale
    UNIQUE(project_id, translation_key_id, assigned_locale)
);

-- ===========================================
-- TRANSLATION CACHE TABLE
-- ===========================================

-- Optimized cache for frontend applications
CREATE TABLE translation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cache key components
    locale supported_locale NOT NULL,
    namespace VARCHAR(100),
    
    -- Cached data
    translations_json JSONB NOT NULL, -- Complete translations object for locale/namespace
    
    -- Cache metadata
    cache_version VARCHAR(50) NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Performance tracking
    generation_time_ms INTEGER,
    compression_ratio DECIMAL(5,2),
    
    -- Invalidation
    is_valid BOOLEAN DEFAULT true,
    invalidated_at TIMESTAMPTZ,
    invalidation_reason VARCHAR(255),
    
    -- Ensure unique cache per locale/namespace
    UNIQUE(locale, namespace)
);

-- ===========================================
-- TRANSLATION ANALYTICS TABLE
-- ===========================================

-- Track translation usage and performance
CREATE TABLE translation_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference
    translation_key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
    locale supported_locale NOT NULL,
    
    -- Usage metrics
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    
    -- Performance metrics
    avg_load_time_ms DECIMAL(8,2),
    total_requests INTEGER DEFAULT 0,
    
    -- Quality metrics
    user_feedback_score DECIMAL(3,2), -- 1.00 to 5.00
    feedback_count INTEGER DEFAULT 0,
    
    -- Error tracking
    error_count INTEGER DEFAULT 0,
    last_error_at TIMESTAMPTZ,
    last_error_message TEXT,
    
    -- Date for aggregation
    recorded_date DATE DEFAULT CURRENT_DATE,
    
    -- Ensure unique record per key/locale/date
    UNIQUE(translation_key_id, locale, recorded_date)
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Translation keys indexes
CREATE INDEX idx_translation_keys_category ON translation_keys(category);
CREATE INDEX idx_translation_keys_namespace ON translation_keys(namespace);
CREATE INDEX idx_translation_keys_feature_area ON translation_keys(feature_area);
CREATE INDEX idx_translation_keys_priority ON translation_keys(priority);
CREATE INDEX idx_translation_keys_active ON translation_keys(is_active);
CREATE INDEX idx_translation_keys_created_at ON translation_keys(created_at);

-- Translations indexes
CREATE INDEX idx_translations_key_locale ON translations(translation_key_id, locale);
CREATE INDEX idx_translations_locale ON translations(locale);
CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_translations_published ON translations(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_translations_approved ON translations(is_approved);
CREATE INDEX idx_translations_version ON translations(translation_key_id, version);

-- Translation history indexes
CREATE INDEX idx_translation_history_translation_id ON translation_history(translation_id);
CREATE INDEX idx_translation_history_key_id ON translation_history(translation_key_id);
CREATE INDEX idx_translation_history_changed_at ON translation_history(changed_at);
CREATE INDEX idx_translation_history_locale ON translation_history(locale);

-- Translation cache indexes
CREATE INDEX idx_translation_cache_locale ON translation_cache(locale);
CREATE INDEX idx_translation_cache_valid ON translation_cache(is_valid);
CREATE INDEX idx_translation_cache_expires ON translation_cache(expires_at);

-- Translation analytics indexes
CREATE INDEX idx_translation_analytics_key_locale ON translation_analytics(translation_key_id, locale);
CREATE INDEX idx_translation_analytics_date ON translation_analytics(recorded_date);
CREATE INDEX idx_translation_analytics_views ON translation_analytics(view_count);

-- Full-text search indexes for translation content
CREATE INDEX idx_translations_value_fts ON translations USING gin(to_tsvector('english', value));
CREATE INDEX idx_translation_keys_description_fts ON translation_keys USING gin(to_tsvector('english', description));

-- ===========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_translation_keys_updated_at
    BEFORE UPDATE ON translation_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translations_updated_at
    BEFORE UPDATE ON translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translation_projects_updated_at
    BEFORE UPDATE ON translation_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- AUDIT TRIGGER FOR TRANSLATION HISTORY
-- ===========================================

-- Function to log translation changes
CREATE OR REPLACE FUNCTION log_translation_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change in translation_history
    INSERT INTO translation_history (
        translation_id,
        translation_key_id,
        action,
        old_value,
        new_value,
        old_status,
        new_status,
        locale,
        version_before,
        version_after,
        changed_by
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.translation_key_id, OLD.translation_key_id),
        TG_OP,
        OLD.value,
        NEW.value,
        OLD.status,
        NEW.status,
        COALESCE(NEW.locale, OLD.locale),
        OLD.version,
        NEW.version,
        COALESCE(NEW.updated_by, OLD.updated_by)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to translations table
CREATE TRIGGER translation_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON translations
    FOR EACH ROW EXECUTE FUNCTION log_translation_change();

-- ===========================================
-- CACHE INVALIDATION TRIGGER
-- ===========================================

-- Function to invalidate translation cache
CREATE OR REPLACE FUNCTION invalidate_translation_cache()
RETURNS TRIGGER AS $$
DECLARE
    affected_locale supported_locale;
    key_namespace VARCHAR(100);
BEGIN
    -- Get the locale from the changed translation
    affected_locale := COALESCE(NEW.locale, OLD.locale);
    
    -- Extract namespace from key_name (assuming format like "namespace.key")
    SELECT SPLIT_PART(tk.key_name, '.', 1) INTO key_namespace
    FROM translation_keys tk
    WHERE tk.id = COALESCE(NEW.translation_key_id, OLD.translation_key_id);
    
    -- Invalidate relevant cache entries
    UPDATE translation_cache 
    SET 
        is_valid = false,
        invalidated_at = NOW(),
        invalidation_reason = 'Translation updated: ' || TG_OP
    WHERE 
        locale = affected_locale 
        AND (namespace = key_namespace OR namespace IS NULL);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply cache invalidation trigger
CREATE TRIGGER translation_cache_invalidation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON translations
    FOR EACH ROW EXECUTE FUNCTION invalidate_translation_cache();

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON TABLE translation_keys IS 'Central registry of all translatable keys with metadata and context';
COMMENT ON TABLE translations IS 'Actual translations for each key and locale with workflow status';
COMMENT ON TABLE translation_history IS 'Audit trail of all translation changes';
COMMENT ON TABLE translation_projects IS 'Organization of translation work into manageable projects';
COMMENT ON TABLE translation_project_assignments IS 'Assignment of translation work to team members';
COMMENT ON TABLE translation_cache IS 'Optimized cache for frontend application performance';
COMMENT ON TABLE translation_analytics IS 'Usage and performance metrics for translations';

COMMENT ON COLUMN translation_keys.interpolation_vars IS 'JSON array of variable names used in interpolation like ["count", "query"]';
COMMENT ON COLUMN translation_keys.pluralization_rules IS 'ICU plural rules configuration by locale';
COMMENT ON COLUMN translations.icu_message IS 'ICU MessageFormat string for complex formatting';
COMMENT ON COLUMN translation_cache.translations_json IS 'Complete nested JSON object ready for frontend consumption';