-- Translation System Utility Functions
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-27
-- Purpose: Common database functions for translation operations

-- ===========================================
-- CACHE MANAGEMENT FUNCTIONS
-- ===========================================

-- Function to generate translation cache for a locale
CREATE OR REPLACE FUNCTION generate_translation_cache(
    target_locale supported_locale,
    target_namespace VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cache_data JSONB := '{}';
    namespace_filter VARCHAR;
    generation_start TIMESTAMPTZ;
    generation_time INTEGER;
    cache_version VARCHAR;
BEGIN
    generation_start := NOW();
    cache_version := EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Set namespace filter
    namespace_filter := COALESCE(target_namespace, 'all');
    
    -- Build nested JSON structure from translations
    WITH translation_tree AS (
        SELECT 
            tk.key_name,
            t.value,
            tk.namespace,
            SPLIT_PART(tk.key_name, '.', 1) as root_key,
            SPLIT_PART(tk.key_name, '.', 2) as sub_key
        FROM translation_keys tk
        JOIN translations t ON tk.id = t.translation_key_id
        WHERE 
            t.locale = target_locale 
            AND t.status = 'published'
            AND tk.is_active = true
            AND (target_namespace IS NULL OR tk.namespace = target_namespace)
    ),
    nested_structure AS (
        SELECT 
            root_key,
            jsonb_object_agg(
                COALESCE(sub_key, 'value'), 
                value
            ) as section_data
        FROM translation_tree
        GROUP BY root_key
    )
    SELECT jsonb_object_agg(root_key, section_data)
    INTO cache_data
    FROM nested_structure;
    
    -- Calculate generation time
    generation_time := EXTRACT(EPOCH FROM (NOW() - generation_start)) * 1000;
    
    -- Store in cache table
    INSERT INTO translation_cache (
        locale, 
        namespace, 
        translations_json, 
        cache_version,
        generated_at,
        expires_at,
        generation_time_ms,
        is_valid
    ) VALUES (
        target_locale,
        target_namespace,
        cache_data,
        cache_version,
        NOW(),
        NOW() + INTERVAL '24 hours',
        generation_time,
        true
    )
    ON CONFLICT (locale, namespace) 
    DO UPDATE SET
        translations_json = EXCLUDED.translations_json,
        cache_version = EXCLUDED.cache_version,
        generated_at = EXCLUDED.generated_at,
        expires_at = EXCLUDED.expires_at,
        generation_time_ms = EXCLUDED.generation_time_ms,
        is_valid = true,
        invalidated_at = NULL,
        invalidation_reason = NULL;
    
    RETURN cache_data;
END;
$$;

-- Function to get cached translations with automatic regeneration
CREATE OR REPLACE FUNCTION get_cached_translations(
    target_locale supported_locale,
    target_namespace VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cached_data JSONB;
    cache_valid BOOLEAN := false;
BEGIN
    -- Check if valid cache exists
    SELECT 
        translations_json,
        (is_valid AND expires_at > NOW()) as is_cache_valid
    INTO cached_data, cache_valid
    FROM translation_cache
    WHERE 
        locale = target_locale 
        AND (namespace = target_namespace OR (namespace IS NULL AND target_namespace IS NULL))
    LIMIT 1;
    
    -- If no valid cache, generate new one
    IF NOT cache_valid OR cached_data IS NULL THEN
        cached_data := generate_translation_cache(target_locale, target_namespace);
    END IF;
    
    RETURN cached_data;
END;
$$;

-- Function to invalidate cache for specific locale/namespace
CREATE OR REPLACE FUNCTION invalidate_cache(
    target_locale supported_locale DEFAULT NULL,
    target_namespace VARCHAR DEFAULT NULL,
    reason VARCHAR DEFAULT 'Manual invalidation'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE translation_cache 
    SET 
        is_valid = false,
        invalidated_at = NOW(),
        invalidation_reason = reason
    WHERE 
        (target_locale IS NULL OR locale = target_locale)
        AND (target_namespace IS NULL OR namespace = target_namespace OR namespace IS NULL);
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$;

-- ===========================================
-- TRANSLATION RETRIEVAL FUNCTIONS
-- ===========================================

-- Function to get translation with ICU support and fallback
CREATE OR REPLACE FUNCTION get_translation_with_icu(
    key_name VARCHAR,
    target_locale supported_locale,
    interpolation_data JSONB DEFAULT '{}',
    fallback_locale supported_locale DEFAULT 'en'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
    icu_result TEXT;
    interpolation_vars TEXT[];
    var_name TEXT;
    var_value TEXT;
BEGIN
    -- Try to get translation in target locale with ICU message
    SELECT 
        COALESCE(t.icu_message, t.value),
        tk.interpolation_vars::TEXT[]
    INTO icu_result, interpolation_vars
    FROM translation_keys tk
    JOIN translations t ON tk.id = t.translation_key_id
    WHERE 
        tk.key_name = get_translation_with_icu.key_name
        AND t.locale = target_locale
        AND t.status = 'published'
        AND tk.is_active = true
    LIMIT 1;
    
    -- If not found, try fallback locale
    IF icu_result IS NULL THEN
        SELECT 
            COALESCE(t.icu_message, t.value),
            tk.interpolation_vars::TEXT[]
        INTO icu_result, interpolation_vars
        FROM translation_keys tk
        JOIN translations t ON tk.id = t.translation_key_id
        WHERE 
            tk.key_name = get_translation_with_icu.key_name
            AND t.locale = fallback_locale
            AND t.status = 'published'
            AND tk.is_active = true
        LIMIT 1;
    END IF;
    
    -- If still not found, return key name
    IF icu_result IS NULL THEN
        RETURN get_translation_with_icu.key_name;
    END IF;
    
    -- Perform simple variable interpolation
    result := icu_result;
    IF interpolation_vars IS NOT NULL AND interpolation_data IS NOT NULL THEN
        FOREACH var_name IN ARRAY interpolation_vars
        LOOP
            IF interpolation_data ? var_name THEN
                var_value := interpolation_data ->> var_name;
                result := REPLACE(result, '{' || var_name || '}', var_value);
            END IF;
        END LOOP;
    END IF;
    
    RETURN result;
END;
$$;

-- Function to get all translations for a category
CREATE OR REPLACE FUNCTION get_translations_by_category(
    target_category translation_category,
    target_locale supported_locale DEFAULT 'en'
)
RETURNS TABLE (
    key_name VARCHAR,
    value TEXT,
    icu_message TEXT,
    interpolation_vars JSONB,
    supports_pluralization BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tk.key_name,
        t.value,
        t.icu_message,
        tk.interpolation_vars,
        tk.supports_pluralization
    FROM translation_keys tk
    JOIN translations t ON tk.id = t.translation_key_id
    WHERE 
        tk.category = target_category
        AND t.locale = target_locale
        AND t.status = 'published'
        AND tk.is_active = true
    ORDER BY tk.key_name;
END;
$$;

-- ===========================================
-- ANALYTICS AND REPORTING FUNCTIONS
-- ===========================================

-- Function to record translation usage
CREATE OR REPLACE FUNCTION record_translation_usage(
    key_name VARCHAR,
    target_locale supported_locale,
    load_time_ms DECIMAL DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    key_id UUID;
BEGIN
    -- Get translation key ID
    SELECT id INTO key_id
    FROM translation_keys
    WHERE translation_keys.key_name = record_translation_usage.key_name
    LIMIT 1;
    
    IF key_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Update or insert analytics record
    INSERT INTO translation_analytics (
        translation_key_id,
        locale,
        view_count,
        last_viewed_at,
        avg_load_time_ms,
        total_requests,
        recorded_date
    ) VALUES (
        key_id,
        target_locale,
        1,
        NOW(),
        load_time_ms,
        1,
        CURRENT_DATE
    )
    ON CONFLICT (translation_key_id, locale, recorded_date)
    DO UPDATE SET
        view_count = translation_analytics.view_count + 1,
        last_viewed_at = NOW(),
        avg_load_time_ms = CASE 
            WHEN record_translation_usage.load_time_ms IS NOT NULL THEN
                (translation_analytics.avg_load_time_ms * translation_analytics.total_requests + record_translation_usage.load_time_ms) / (translation_analytics.total_requests + 1)
            ELSE translation_analytics.avg_load_time_ms
        END,
        total_requests = translation_analytics.total_requests + 1;
END;
$$;

-- Function to get translation statistics
CREATE OR REPLACE FUNCTION get_translation_statistics(
    target_locale supported_locale DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    locale supported_locale,
    total_keys INTEGER,
    published_translations INTEGER,
    draft_translations INTEGER,
    completion_percentage DECIMAL,
    total_views BIGINT,
    avg_load_time DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            t.locale,
            COUNT(DISTINCT tk.id) as total_keys,
            COUNT(CASE WHEN t.status = 'published' THEN 1 END) as published_count,
            COUNT(CASE WHEN t.status = 'draft' THEN 1 END) as draft_count,
            COALESCE(SUM(ta.view_count), 0) as total_view_count,
            COALESCE(AVG(ta.avg_load_time_ms), 0) as avg_load_time_ms
        FROM translation_keys tk
        LEFT JOIN translations t ON tk.id = t.translation_key_id
        LEFT JOIN translation_analytics ta ON tk.id = ta.translation_key_id 
            AND ta.locale = t.locale 
            AND ta.recorded_date >= CURRENT_DATE - INTERVAL '1 day' * days_back
        WHERE 
            tk.is_active = true
            AND (target_locale IS NULL OR t.locale = target_locale)
        GROUP BY t.locale
    )
    SELECT 
        s.locale,
        s.total_keys::INTEGER,
        s.published_count::INTEGER,
        s.draft_count::INTEGER,
        ROUND((s.published_count::DECIMAL / NULLIF(s.total_keys, 0)) * 100, 2) as completion_percentage,
        s.total_view_count::BIGINT,
        ROUND(s.avg_load_time_ms, 2) as avg_load_time
    FROM stats s
    WHERE s.locale IS NOT NULL
    ORDER BY s.locale;
END;
$$;

-- ===========================================
-- TRANSLATION WORKFLOW FUNCTIONS
-- ===========================================

-- Function to approve translation
CREATE OR REPLACE FUNCTION approve_translation(
    translation_id UUID,
    approver_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    translation_exists BOOLEAN;
BEGIN
    -- Check if translation exists and is in reviewable state
    SELECT EXISTS(
        SELECT 1 FROM translations 
        WHERE id = translation_id 
        AND status IN ('draft', 'review')
    ) INTO translation_exists;
    
    IF NOT translation_exists THEN
        RETURN false;
    END IF;
    
    -- Update translation to approved status
    UPDATE translations 
    SET 
        status = 'approved',
        is_approved = true,
        approved_at = NOW(),
        approved_by = approver_id,
        updated_at = NOW(),
        updated_by = approver_id
    WHERE id = translation_id;
    
    RETURN true;
END;
$$;

-- Function to publish approved translation
CREATE OR REPLACE FUNCTION publish_translation(
    translation_id UUID,
    publisher_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    translation_locale supported_locale;
    key_namespace VARCHAR;
BEGIN
    -- Get translation details
    SELECT 
        t.locale,
        tk.namespace
    INTO translation_locale, key_namespace
    FROM translations t
    JOIN translation_keys tk ON t.translation_key_id = tk.id
    WHERE t.id = translation_id AND t.is_approved = true;
    
    IF translation_locale IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update translation to published status
    UPDATE translations 
    SET 
        status = 'published',
        published_at = NOW(),
        published_by = publisher_id,
        updated_at = NOW(),
        updated_by = publisher_id
    WHERE id = translation_id;
    
    -- Invalidate relevant cache
    PERFORM invalidate_cache(
        translation_locale, 
        key_namespace, 
        'Translation published: ' || translation_id::TEXT
    );
    
    RETURN true;
END;
$$;

-- Function to bulk update translation status
CREATE OR REPLACE FUNCTION bulk_update_translation_status(
    translation_ids UUID[],
    new_status translation_status,
    updater_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE translations 
    SET 
        status = new_status,
        updated_at = NOW(),
        updated_by = updater_id,
        -- Set approval fields if status is approved
        is_approved = CASE WHEN new_status = 'approved' THEN true ELSE is_approved END,
        approved_at = CASE WHEN new_status = 'approved' THEN NOW() ELSE approved_at END,
        approved_by = CASE WHEN new_status = 'approved' THEN updater_id ELSE approved_by END,
        -- Set publication fields if status is published
        published_at = CASE WHEN new_status = 'published' THEN NOW() ELSE published_at END,
        published_by = CASE WHEN new_status = 'published' THEN updater_id ELSE published_by END
    WHERE id = ANY(translation_ids);
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    -- Invalidate cache if publishing
    IF new_status = 'published' THEN
        PERFORM invalidate_cache(NULL, NULL, 'Bulk publish operation');
    END IF;
    
    RETURN affected_count;
END;
$$;

-- ===========================================
-- SEARCH AND DISCOVERY FUNCTIONS
-- ===========================================

-- Function to search translations with full-text search
CREATE OR REPLACE FUNCTION search_translations(
    search_query TEXT,
    target_locale supported_locale DEFAULT 'en',
    search_categories translation_category[] DEFAULT NULL,
    limit_results INTEGER DEFAULT 50
)
RETURNS TABLE (
    key_name VARCHAR,
    value TEXT,
    category translation_category,
    namespace VARCHAR,
    description TEXT,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tk.key_name,
        t.value,
        tk.category,
        tk.namespace,
        tk.description,
        ts_rank(
            to_tsvector('english', COALESCE(t.value, '') || ' ' || COALESCE(tk.description, '')),
            plainto_tsquery('english', search_query)
        ) as rank
    FROM translation_keys tk
    JOIN translations t ON tk.id = t.translation_key_id
    WHERE 
        t.locale = target_locale
        AND t.status = 'published'
        AND tk.is_active = true
        AND (search_categories IS NULL OR tk.category = ANY(search_categories))
        AND (
            to_tsvector('english', COALESCE(t.value, '') || ' ' || COALESCE(tk.description, '')) 
            @@ plainto_tsquery('english', search_query)
            OR tk.key_name ILIKE '%' || search_query || '%'
            OR t.value ILIKE '%' || search_query || '%'
        )
    ORDER BY rank DESC, tk.key_name
    LIMIT limit_results;
END;
$$;

-- ===========================================
-- GRANT EXECUTE PERMISSIONS
-- ===========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION generate_translation_cache(supported_locale, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_translations(supported_locale, VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION invalidate_cache(supported_locale, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_translation_with_icu(VARCHAR, supported_locale, JSONB, supported_locale) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_translations_by_category(translation_category, supported_locale) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_translation_usage(VARCHAR, supported_locale, DECIMAL) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_translation_statistics(supported_locale, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_translation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_translation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_translation_status(UUID[], translation_status, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_translations(TEXT, supported_locale, translation_category[], INTEGER) TO authenticated, anon;

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON FUNCTION generate_translation_cache(supported_locale, VARCHAR) IS 'Generate optimized JSON cache for frontend consumption';
COMMENT ON FUNCTION get_cached_translations(supported_locale, VARCHAR) IS 'Retrieve cached translations with automatic regeneration';
COMMENT ON FUNCTION get_translation_with_icu(VARCHAR, supported_locale, JSONB, supported_locale) IS 'Get translation with ICU formatting and variable interpolation';
COMMENT ON FUNCTION record_translation_usage(VARCHAR, supported_locale, DECIMAL) IS 'Record translation usage for analytics';
COMMENT ON FUNCTION approve_translation(UUID, UUID) IS 'Approve a translation for publication';
COMMENT ON FUNCTION publish_translation(UUID, UUID) IS 'Publish an approved translation and invalidate cache';
COMMENT ON FUNCTION search_translations(TEXT, supported_locale, translation_category[], INTEGER) IS 'Full-text search across translations with ranking';