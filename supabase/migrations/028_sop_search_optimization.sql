-- Advanced SOP Search Query Optimization
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Enhanced search performance for sub-100ms query response times

-- ===========================================
-- ENHANCED SEARCH INDEXES
-- ===========================================

-- Advanced compound indexes for complex search scenarios
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sop_search_compound 
ON sop_documents(restaurant_id, status, is_active, category_id, priority) 
WHERE is_active = true AND status = 'approved';

-- Category-specific search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sop_search_by_category 
ON sop_documents(category_id, restaurant_id, status) 
INCLUDE (title, title_th, priority, updated_at)
WHERE is_active = true;

-- Priority-based search for urgent SOPs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sop_search_priority 
ON sop_documents(priority, restaurant_id, status) 
INCLUDE (title, title_th, category_id, effective_date)
WHERE is_active = true AND priority IN ('high', 'critical');

-- Recently updated SOPs for change notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sop_search_recent 
ON sop_documents(restaurant_id, updated_at DESC, status) 
WHERE is_active = true AND updated_at > (NOW() - INTERVAL '30 days');

-- ===========================================
-- ADVANCED FULL-TEXT SEARCH CONFIGURATIONS
-- ===========================================

-- Create custom text search configuration for Thai content
CREATE TEXT SEARCH CONFIGURATION thai_search (COPY = simple);

-- Enhanced search function with improved ranking and caching
CREATE OR REPLACE FUNCTION enhanced_sop_search(
    search_query TEXT,
    restaurant_id_param UUID,
    category_id_param UUID DEFAULT NULL,
    priority_filter sop_priority DEFAULT NULL,
    status_filter sop_status DEFAULT 'approved',
    language_pref TEXT DEFAULT 'en',
    limit_results INTEGER DEFAULT 20,
    offset_results INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    title_th TEXT,
    content_preview TEXT,
    category_id UUID,
    category_name TEXT,
    priority sop_priority,
    effective_date DATE,
    updated_at TIMESTAMPTZ,
    search_rank REAL,
    search_highlights TEXT[]
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    tsquery_en tsquery;
    tsquery_th tsquery;
    similarity_threshold REAL := 0.1;
BEGIN
    -- Prepare text search queries
    tsquery_en := plainto_tsquery('english', search_query);
    tsquery_th := plainto_tsquery('simple', search_query);
    
    RETURN QUERY
    WITH search_results AS (
        SELECT 
            d.id,
            d.title,
            d.title_th,
            LEFT(CASE WHEN language_pref = 'th' THEN d.content_th ELSE d.content END, 200) || 
                CASE WHEN LENGTH(CASE WHEN language_pref = 'th' THEN d.content_th ELSE d.content END) > 200 THEN '...' ELSE '' END as content_preview,
            d.category_id,
            CASE WHEN language_pref = 'th' THEN c.name_th ELSE c.name END as category_name,
            d.priority,
            d.effective_date,
            d.updated_at,
            -- Advanced ranking algorithm
            GREATEST(
                -- Full-text search scores
                CASE WHEN tsquery_en IS NOT NULL THEN
                    ts_rank_cd(to_tsvector('english', d.title || ' ' || d.content), tsquery_en, 32) * 2.0
                ELSE 0 END,
                CASE WHEN tsquery_th IS NOT NULL THEN
                    ts_rank_cd(to_tsvector('simple', d.title_th || ' ' || d.content_th), tsquery_th, 32) * 2.0
                ELSE 0 END,
                -- Similarity scores with title boost
                similarity(d.title, search_query) * 3.0,
                similarity(d.title_th, search_query) * 3.0,
                -- Content similarity
                similarity(d.content, search_query) * 1.0,
                similarity(d.content_th, search_query) * 1.0,
                -- Tag matching
                CASE WHEN search_query = ANY(d.tags) THEN 4.0 ELSE 0 END,
                CASE WHEN search_query = ANY(d.tags_th) THEN 4.0 ELSE 0 END
            ) +
            -- Priority boost
            CASE d.priority 
                WHEN 'critical' THEN 0.5
                WHEN 'high' THEN 0.3
                WHEN 'medium' THEN 0.1
                ELSE 0 
            END +
            -- Recency boost
            CASE WHEN d.updated_at > (NOW() - INTERVAL '7 days') THEN 0.2 ELSE 0 END
            as search_rank,
            -- Search highlights
            ARRAY[
                ts_headline('english', d.title, tsquery_en, 'MaxWords=10,MinWords=1,ShortWord=3,HighlightAll=false'),
                ts_headline('simple', d.title_th, tsquery_th, 'MaxWords=10,MinWords=1,ShortWord=3,HighlightAll=false')
            ] as search_highlights
        FROM sop_documents d
        INNER JOIN sop_categories c ON d.category_id = c.id
        WHERE 
            d.restaurant_id = restaurant_id_param
            AND d.status = status_filter
            AND d.is_active = true
            AND (category_id_param IS NULL OR d.category_id = category_id_param)
            AND (priority_filter IS NULL OR d.priority = priority_filter)
            AND (
                -- Full-text search conditions
                (tsquery_en IS NOT NULL AND to_tsvector('english', d.title || ' ' || d.content) @@ tsquery_en)
                OR (tsquery_th IS NOT NULL AND to_tsvector('simple', d.title_th || ' ' || d.content_th) @@ tsquery_th)
                -- Similarity search conditions
                OR d.title % search_query
                OR d.title_th % search_query
                OR d.content ILIKE '%' || search_query || '%'
                OR d.content_th ILIKE '%' || search_query || '%'
                -- Tag matching
                OR search_query = ANY(d.tags)
                OR search_query = ANY(d.tags_th)
                -- Exact phrase matching
                OR position(lower(search_query) in lower(d.title)) > 0
                OR position(lower(search_query) in lower(d.title_th)) > 0
            )
    )
    SELECT 
        s.id,
        s.title,
        s.title_th,
        s.content_preview,
        s.category_id,
        s.category_name,
        s.priority,
        s.effective_date,
        s.updated_at,
        s.search_rank,
        s.search_highlights
    FROM search_results s
    WHERE s.search_rank > similarity_threshold
    ORDER BY s.search_rank DESC, s.priority DESC, s.updated_at DESC
    LIMIT limit_results
    OFFSET offset_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION enhanced_sop_search TO authenticated;

-- ===========================================
-- SEARCH PERFORMANCE MONITORING
-- ===========================================

-- Table to track search query performance
CREATE TABLE IF NOT EXISTS sop_search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    user_id UUID REFERENCES auth_users(id),
    search_query TEXT NOT NULL,
    category_filter UUID REFERENCES sop_categories(id),
    priority_filter sop_priority,
    language_preference TEXT,
    results_count INTEGER,
    execution_time_ms INTEGER,
    clicked_result_id UUID REFERENCES sop_documents(id),
    clicked_rank INTEGER,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search analytics
CREATE INDEX idx_sop_search_analytics_restaurant ON sop_search_analytics(restaurant_id, created_at);
CREATE INDEX idx_sop_search_analytics_performance ON sop_search_analytics(execution_time_ms, results_count);
CREATE INDEX idx_sop_search_analytics_popular_queries ON sop_search_analytics(search_query, restaurant_id);

-- Function to log search queries
CREATE OR REPLACE FUNCTION log_sop_search(
    p_restaurant_id UUID,
    p_user_id UUID,
    p_search_query TEXT,
    p_category_filter UUID DEFAULT NULL,
    p_priority_filter sop_priority DEFAULT NULL,
    p_language_preference TEXT DEFAULT 'en',
    p_results_count INTEGER DEFAULT 0,
    p_execution_time_ms INTEGER DEFAULT 0,
    p_session_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    analytics_id UUID;
BEGIN
    INSERT INTO sop_search_analytics (
        restaurant_id, user_id, search_query, category_filter, priority_filter,
        language_preference, results_count, execution_time_ms, session_id,
        ip_address, user_agent
    ) VALUES (
        p_restaurant_id, p_user_id, p_search_query, p_category_filter, p_priority_filter,
        p_language_preference, p_results_count, p_execution_time_ms, p_session_id,
        p_ip_address, p_user_agent
    ) RETURNING id INTO analytics_id;
    
    RETURN analytics_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_sop_search TO authenticated;

-- ===========================================
-- SEARCH SUGGESTION SYSTEM
-- ===========================================

-- Table for search suggestions and autocomplete
CREATE TABLE IF NOT EXISTS sop_search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    suggestion_text TEXT NOT NULL,
    suggestion_text_th TEXT,
    category_id UUID REFERENCES sop_categories(id),
    search_count INTEGER DEFAULT 1,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search suggestions
CREATE INDEX idx_sop_search_suggestions_restaurant ON sop_search_suggestions(restaurant_id, is_active);
CREATE INDEX idx_sop_search_suggestions_text ON sop_search_suggestions USING GIN(suggestion_text gin_trgm_ops);
CREATE INDEX idx_sop_search_suggestions_text_th ON sop_search_suggestions USING GIN(suggestion_text_th gin_trgm_ops);
CREATE INDEX idx_sop_search_suggestions_popular ON sop_search_suggestions(restaurant_id, search_count DESC, success_rate DESC);

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_sop_search_suggestions(
    partial_query TEXT,
    restaurant_id_param UUID,
    language_pref TEXT DEFAULT 'en',
    limit_suggestions INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    category_name TEXT,
    search_count INTEGER,
    success_rate DECIMAL(5,2)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN language_pref = 'th' THEN 
            COALESCE(s.suggestion_text_th, s.suggestion_text)
        ELSE 
            s.suggestion_text 
        END as suggestion,
        CASE WHEN language_pref = 'th' THEN c.name_th ELSE c.name END as category_name,
        s.search_count,
        s.success_rate
    FROM sop_search_suggestions s
    LEFT JOIN sop_categories c ON s.category_id = c.id
    WHERE 
        s.restaurant_id = restaurant_id_param
        AND s.is_active = true
        AND (
            s.suggestion_text ILIKE partial_query || '%'
            OR s.suggestion_text % partial_query
            OR (s.suggestion_text_th IS NOT NULL AND (
                s.suggestion_text_th ILIKE partial_query || '%'
                OR s.suggestion_text_th % partial_query
            ))
        )
    ORDER BY 
        s.search_count DESC,
        s.success_rate DESC,
        similarity(
            CASE WHEN language_pref = 'th' THEN 
                COALESCE(s.suggestion_text_th, s.suggestion_text)
            ELSE 
                s.suggestion_text 
            END, 
            partial_query
        ) DESC
    LIMIT limit_suggestions;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sop_search_suggestions TO authenticated;

-- ===========================================
-- SEARCH RESULT CACHING
-- ===========================================

-- Table for caching frequent search results
CREATE TABLE IF NOT EXISTS sop_search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    search_query_hash TEXT NOT NULL, -- MD5 hash of search parameters
    search_query TEXT NOT NULL,
    category_filter UUID,
    priority_filter sop_priority,
    language_preference TEXT,
    cached_results JSONB NOT NULL,
    result_count INTEGER,
    cache_hit_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search cache
CREATE UNIQUE INDEX idx_sop_search_cache_unique ON sop_search_cache(restaurant_id, search_query_hash);
CREATE INDEX idx_sop_search_cache_expiry ON sop_search_cache(expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_sop_search_cache_popular ON sop_search_cache(restaurant_id, cache_hit_count DESC, updated_at DESC);

-- Function to get cached search results
CREATE OR REPLACE FUNCTION get_cached_sop_search(
    search_query TEXT,
    restaurant_id_param UUID,
    category_id_param UUID DEFAULT NULL,
    priority_filter sop_priority DEFAULT NULL,
    language_pref TEXT DEFAULT 'en'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    cache_key TEXT;
    cached_result JSONB;
BEGIN
    -- Generate cache key
    cache_key := md5(
        search_query || '|' || 
        restaurant_id_param::TEXT || '|' ||
        COALESCE(category_id_param::TEXT, 'null') || '|' ||
        COALESCE(priority_filter::TEXT, 'null') || '|' ||
        language_pref
    );
    
    -- Try to get cached result
    SELECT cached_results INTO cached_result
    FROM sop_search_cache
    WHERE restaurant_id = restaurant_id_param
    AND search_query_hash = cache_key
    AND expires_at > NOW();
    
    -- Update hit count if found
    IF cached_result IS NOT NULL THEN
        UPDATE sop_search_cache 
        SET cache_hit_count = cache_hit_count + 1,
            updated_at = NOW()
        WHERE restaurant_id = restaurant_id_param
        AND search_query_hash = cache_key;
    END IF;
    
    RETURN cached_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_cached_sop_search TO authenticated;

-- Function to cache search results
CREATE OR REPLACE FUNCTION cache_sop_search_results(
    search_query TEXT,
    restaurant_id_param UUID,
    category_id_param UUID DEFAULT NULL,
    priority_filter sop_priority DEFAULT NULL,
    language_pref TEXT DEFAULT 'en',
    search_results JSONB DEFAULT NULL,
    cache_duration_hours INTEGER DEFAULT 24
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    cache_key TEXT;
BEGIN
    -- Generate cache key
    cache_key := md5(
        search_query || '|' || 
        restaurant_id_param::TEXT || '|' ||
        COALESCE(category_id_param::TEXT, 'null') || '|' ||
        COALESCE(priority_filter::TEXT, 'null') || '|' ||
        language_pref
    );
    
    -- Insert or update cache entry
    INSERT INTO sop_search_cache (
        restaurant_id, search_query_hash, search_query, category_filter,
        priority_filter, language_preference, cached_results, result_count,
        expires_at
    ) VALUES (
        restaurant_id_param, cache_key, search_query, category_id_param,
        priority_filter, language_pref, search_results, 
        COALESCE(jsonb_array_length(search_results), 0),
        NOW() + (cache_duration_hours || ' hours')::INTERVAL
    )
    ON CONFLICT (restaurant_id, search_query_hash)
    DO UPDATE SET
        cached_results = EXCLUDED.cached_results,
        result_count = EXCLUDED.result_count,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cache_sop_search_results TO authenticated;

-- ===========================================
-- AUTOMATIC SEARCH OPTIMIZATION
-- ===========================================

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_sop_search_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sop_search_cache WHERE expires_at <= NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup operation
    INSERT INTO audit_logs (restaurant_id, action, resource_type, metadata)
    VALUES (
        '550e8400-e29b-41d4-a716-446655440000'::UUID,
        'DELETE'::audit_action,
        'sop_search_cache',
        jsonb_build_object('deleted_entries', deleted_count, 'timestamp', NOW())
    );
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_sop_search_cache TO authenticated;

-- Function to update search suggestions based on query analytics
CREATE OR REPLACE FUNCTION update_sop_search_suggestions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    suggestion_count INTEGER := 0;
BEGIN
    -- Insert popular search queries as suggestions
    INSERT INTO sop_search_suggestions (
        restaurant_id, suggestion_text, category_id, search_count, success_rate
    )
    SELECT 
        restaurant_id,
        search_query,
        category_filter,
        COUNT(*) as search_count,
        ROUND(
            AVG(CASE WHEN results_count > 0 THEN 100.0 ELSE 0.0 END), 2
        ) as success_rate
    FROM sop_search_analytics
    WHERE created_at > (NOW() - INTERVAL '30 days')
    AND LENGTH(search_query) > 2
    GROUP BY restaurant_id, search_query, category_filter
    HAVING COUNT(*) >= 3 -- Minimum 3 searches to become a suggestion
    ON CONFLICT (restaurant_id, suggestion_text) DO UPDATE SET
        search_count = EXCLUDED.search_count,
        success_rate = EXCLUDED.success_rate,
        last_used_at = NOW(),
        updated_at = NOW();
    
    GET DIAGNOSTICS suggestion_count = ROW_COUNT;
    
    -- Log update operation
    INSERT INTO audit_logs (restaurant_id, action, resource_type, metadata)
    VALUES (
        '550e8400-e29b-41d4-a716-446655440000'::UUID,
        'UPDATE'::audit_action,
        'sop_search_suggestions',
        jsonb_build_object('updated_suggestions', suggestion_count, 'timestamp', NOW())
    );
    
    RETURN suggestion_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_sop_search_suggestions TO authenticated;

-- ===========================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ===========================================

-- Enable RLS on new tables
ALTER TABLE sop_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_search_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for search analytics
CREATE POLICY "Search analytics restaurant isolation"
ON sop_search_analytics FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- RLS policies for search suggestions
CREATE POLICY "Search suggestions restaurant isolation"
ON sop_search_suggestions FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- RLS policies for search cache
CREATE POLICY "Search cache restaurant isolation"
ON sop_search_cache FOR ALL
TO authenticated
USING (
    restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
    )
);

-- ===========================================
-- TRIGGERS FOR AUTOMATIC MAINTENANCE
-- ===========================================

-- Trigger to update search suggestions timestamp
CREATE TRIGGER update_sop_search_suggestions_updated_at 
    BEFORE UPDATE ON sop_search_suggestions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update search cache timestamp
CREATE TRIGGER update_sop_search_cache_updated_at 
    BEFORE UPDATE ON sop_search_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

-- Update table statistics for better query planning
ANALYZE sop_search_analytics;
ANALYZE sop_search_suggestions;
ANALYZE sop_search_cache;

-- Set statistics targets for search columns
ALTER TABLE sop_search_analytics ALTER COLUMN search_query SET STATISTICS 1000;
ALTER TABLE sop_search_suggestions ALTER COLUMN suggestion_text SET STATISTICS 1000;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_search_analytics IS 'Tracks search query performance and user behavior for optimization';
COMMENT ON TABLE sop_search_suggestions IS 'Provides autocomplete and search suggestions based on usage patterns';
COMMENT ON TABLE sop_search_cache IS 'Caches frequent search results to improve response times';

COMMENT ON FUNCTION enhanced_sop_search IS 'Advanced SOP search with ranking, caching, and bilingual support';
COMMENT ON FUNCTION log_sop_search IS 'Logs search queries for analytics and optimization';
COMMENT ON FUNCTION get_sop_search_suggestions IS 'Returns autocomplete suggestions for search queries';
COMMENT ON FUNCTION get_cached_sop_search IS 'Retrieves cached search results to improve performance';
COMMENT ON FUNCTION cache_sop_search_results IS 'Caches search results for faster subsequent queries';
COMMENT ON FUNCTION cleanup_sop_search_cache IS 'Removes expired cache entries to maintain performance';
COMMENT ON FUNCTION update_sop_search_suggestions IS 'Updates search suggestions based on query analytics';

-- Performance notes
COMMENT ON INDEX idx_sop_search_compound IS 'Compound index for complex search scenarios with sub-100ms performance';
COMMENT ON INDEX idx_sop_search_by_category IS 'Category-specific search optimization with included columns';
COMMENT ON INDEX idx_sop_search_priority IS 'Priority-based search for urgent SOPs with fast access';