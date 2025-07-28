-- SOP Analytics Materialized Views
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: High-performance materialized views for analytics dashboards with automated refresh

-- ===========================================
-- ANALYTICS MATERIALIZED VIEWS
-- ===========================================

-- SOP Usage Analytics View
CREATE MATERIALIZED VIEW sop_usage_analytics AS
WITH usage_stats AS (
    SELECT 
        al.restaurant_id,
        al.resource_id as sop_id,
        COUNT(*) as total_views,
        COUNT(DISTINCT al.user_id) as unique_users,
        COUNT(*) FILTER (WHERE al.created_at > NOW() - INTERVAL '7 days') as views_last_7_days,
        COUNT(*) FILTER (WHERE al.created_at > NOW() - INTERVAL '30 days') as views_last_30_days,
        MAX(al.created_at) as last_viewed_at,
        AVG(EXTRACT(EPOCH FROM (al.created_at - LAG(al.created_at) OVER (
            PARTITION BY al.resource_id ORDER BY al.created_at
        ))))::INTEGER as avg_session_gap_seconds
    FROM audit_logs al
    WHERE al.resource_type = 'sop_document'
    AND al.action = 'VIEW'::audit_action
    AND al.created_at > NOW() - INTERVAL '90 days'
    GROUP BY al.restaurant_id, al.resource_id
),
sop_details AS (
    SELECT 
        s.id,
        s.restaurant_id,
        s.title,
        s.title_th,
        s.category_id,
        c.name as category_name,
        c.name_th as category_name_th,
        s.priority,
        s.status,
        s.effective_date,
        s.created_at,
        s.updated_at,
        s.is_active
    FROM sop_documents s
    LEFT JOIN sop_categories c ON s.category_id = c.id
    WHERE s.is_active = true
)
SELECT 
    sd.restaurant_id,
    sd.id as sop_id,
    sd.title,
    sd.title_th,
    sd.category_id,
    sd.category_name,
    sd.category_name_th,
    sd.priority,
    sd.status,
    sd.effective_date,
    sd.created_at as sop_created_at,
    sd.updated_at as sop_updated_at,
    
    -- Usage metrics
    COALESCE(us.total_views, 0) as total_views,
    COALESCE(us.unique_users, 0) as unique_users,
    COALESCE(us.views_last_7_days, 0) as views_last_7_days,
    COALESCE(us.views_last_30_days, 0) as views_last_30_days,
    us.last_viewed_at,
    COALESCE(us.avg_session_gap_seconds, 0) as avg_session_gap_seconds,
    
    -- Popularity metrics
    CASE 
        WHEN us.views_last_7_days > 20 THEN 'high'
        WHEN us.views_last_7_days > 5 THEN 'medium'
        WHEN us.views_last_7_days > 0 THEN 'low'
        ELSE 'none'
    END as popularity_level,
    
    -- Engagement score (0-100)
    LEAST(100, GREATEST(0, 
        (COALESCE(us.views_last_7_days, 0) * 10) +
        (COALESCE(us.unique_users, 0) * 5) +
        CASE WHEN us.last_viewed_at > NOW() - INTERVAL '3 days' THEN 20 ELSE 0 END
    )) as engagement_score,
    
    -- Freshness indicators
    CASE 
        WHEN sd.updated_at > NOW() - INTERVAL '7 days' THEN 'very_fresh'
        WHEN sd.updated_at > NOW() - INTERVAL '30 days' THEN 'fresh'
        WHEN sd.updated_at > NOW() - INTERVAL '90 days' THEN 'aging'
        ELSE 'stale'
    END as content_freshness,
    
    NOW() as last_calculated_at
FROM sop_details sd
LEFT JOIN usage_stats us ON sd.id = us.sop_id AND sd.restaurant_id = us.restaurant_id;

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_sop_usage_analytics_unique ON sop_usage_analytics(restaurant_id, sop_id);
CREATE INDEX idx_sop_usage_analytics_restaurant ON sop_usage_analytics(restaurant_id);
CREATE INDEX idx_sop_usage_analytics_category ON sop_usage_analytics(category_id);
CREATE INDEX idx_sop_usage_analytics_popularity ON sop_usage_analytics(popularity_level, engagement_score DESC);
CREATE INDEX idx_sop_usage_analytics_views ON sop_usage_analytics(total_views DESC);

-- SOP Performance Metrics View
CREATE MATERIALIZED VIEW sop_performance_metrics_summary AS
WITH daily_metrics AS (
    SELECT 
        restaurant_id,
        DATE(recorded_at) as metric_date,
        metric_name,
        AVG(metric_value) as avg_value,
        MAX(metric_value) as max_value,
        MIN(metric_value) as min_value,
        STDDEV(metric_value) as stddev_value,
        COUNT(*) as sample_count
    FROM sop_performance_metrics
    WHERE recorded_at > NOW() - INTERVAL '30 days'
    AND metric_type IN ('response_time', 'query_duration')
    GROUP BY restaurant_id, DATE(recorded_at), metric_name
),
weekly_trends AS (
    SELECT 
        restaurant_id,
        metric_name,
        DATE_TRUNC('week', metric_date) as week_start,
        AVG(avg_value) as weekly_avg,
        LAG(AVG(avg_value)) OVER (
            PARTITION BY restaurant_id, metric_name 
            ORDER BY DATE_TRUNC('week', metric_date)
        ) as prev_week_avg
    FROM daily_metrics
    GROUP BY restaurant_id, metric_name, DATE_TRUNC('week', metric_date)
)
SELECT 
    dm.restaurant_id,
    dm.metric_name,
    
    -- Current metrics
    AVG(dm.avg_value) as overall_avg,
    MAX(dm.max_value) as overall_max,
    MIN(dm.min_value) as overall_min,
    STDDEV(dm.avg_value) as daily_stddev,
    
    -- Recent performance (last 7 days)
    AVG(dm.avg_value) FILTER (WHERE dm.metric_date > CURRENT_DATE - INTERVAL '7 days') as recent_avg,
    MAX(dm.max_value) FILTER (WHERE dm.metric_date > CURRENT_DATE - INTERVAL '7 days') as recent_max,
    
    -- Trends
    CASE 
        WHEN AVG(wt.weekly_avg) > AVG(wt.prev_week_avg) * 1.1 THEN 'degrading'
        WHEN AVG(wt.weekly_avg) < AVG(wt.prev_week_avg) * 0.9 THEN 'improving'
        ELSE 'stable'
    END as performance_trend,
    
    -- Performance rating
    CASE 
        WHEN AVG(dm.avg_value) FILTER (WHERE dm.metric_date > CURRENT_DATE - INTERVAL '7 days') < 100 THEN 'excellent'
        WHEN AVG(dm.avg_value) FILTER (WHERE dm.metric_date > CURRENT_DATE - INTERVAL '7 days') < 500 THEN 'good'
        WHEN AVG(dm.avg_value) FILTER (WHERE dm.metric_date > CURRENT_DATE - INTERVAL '7 days') < 1000 THEN 'fair'
        WHEN AVG(dm.avg_value) FILTER (WHERE dm.metric_date > CURRENT_DATE - INTERVAL '7 days') < 2000 THEN 'poor'
        ELSE 'critical'
    END as performance_rating,
    
    -- Data quality
    COUNT(DISTINCT dm.metric_date) as days_with_data,
    SUM(dm.sample_count) as total_samples,
    
    NOW() as last_calculated_at
FROM daily_metrics dm
LEFT JOIN weekly_trends wt ON dm.restaurant_id = wt.restaurant_id 
    AND dm.metric_name = wt.metric_name
    AND DATE_TRUNC('week', dm.metric_date) = wt.week_start
GROUP BY dm.restaurant_id, dm.metric_name;

-- Create indexes
CREATE UNIQUE INDEX idx_sop_perf_metrics_unique ON sop_performance_metrics_summary(restaurant_id, metric_name);
CREATE INDEX idx_sop_perf_metrics_restaurant ON sop_performance_metrics_summary(restaurant_id);
CREATE INDEX idx_sop_perf_metrics_rating ON sop_performance_metrics_summary(performance_rating, recent_avg);

-- User Activity Analytics View
CREATE MATERIALIZED VIEW sop_user_activity_analytics AS
WITH user_sessions AS (
    SELECT 
        restaurant_id,
        user_id,
        session_id,
        MIN(created_at) as session_start,
        MAX(created_at) as session_end,
        COUNT(*) as actions_in_session,
        COUNT(DISTINCT resource_id) as unique_resources_accessed
    FROM audit_logs
    WHERE created_at > NOW() - INTERVAL '30 days'
    AND session_id IS NOT NULL
    GROUP BY restaurant_id, user_id, session_id
),
user_stats AS (
    SELECT 
        us.restaurant_id,
        us.user_id,
        COUNT(*) as total_sessions,
        AVG(us.actions_in_session) as avg_actions_per_session,
        AVG(EXTRACT(EPOCH FROM (us.session_end - us.session_start))) as avg_session_duration_seconds,
        SUM(us.unique_resources_accessed) as total_resources_accessed,
        MAX(us.session_end) as last_activity_at,
        COUNT(*) FILTER (WHERE us.session_start > NOW() - INTERVAL '7 days') as sessions_last_7_days,
        COUNT(*) FILTER (WHERE us.session_start > NOW() - INTERVAL '1 day') as sessions_last_24_hours
    FROM user_sessions us
    GROUP BY us.restaurant_id, us.user_id
),
sop_specific_activity AS (
    SELECT 
        al.restaurant_id,
        al.user_id,
        COUNT(*) FILTER (WHERE al.resource_type = 'sop_document' AND al.action = 'VIEW'::audit_action) as sop_views,
        COUNT(*) FILTER (WHERE al.resource_type = 'sop_document' AND al.action = 'CREATE'::audit_action) as sop_creates,
        COUNT(*) FILTER (WHERE al.resource_type = 'sop_document' AND al.action = 'UPDATE'::audit_action) as sop_updates,
        COUNT(DISTINCT al.resource_id) FILTER (WHERE al.resource_type = 'sop_document') as unique_sops_accessed
    FROM audit_logs al
    WHERE al.created_at > NOW() - INTERVAL '30 days'
    GROUP BY al.restaurant_id, al.user_id
)
SELECT 
    u.restaurant_id,
    u.id as user_id,
    u.full_name,
    u.email,
    u.role,
    
    -- Session metrics
    COALESCE(us.total_sessions, 0) as total_sessions,
    COALESCE(us.avg_actions_per_session, 0) as avg_actions_per_session,
    COALESCE(us.avg_session_duration_seconds, 0) as avg_session_duration_seconds,
    COALESCE(us.sessions_last_7_days, 0) as sessions_last_7_days,
    COALESCE(us.sessions_last_24_hours, 0) as sessions_last_24_hours,
    us.last_activity_at,
    
    -- SOP-specific activity
    COALESCE(sa.sop_views, 0) as sop_views,
    COALESCE(sa.sop_creates, 0) as sop_creates,
    COALESCE(sa.sop_updates, 0) as sop_updates,
    COALESCE(sa.unique_sops_accessed, 0) as unique_sops_accessed,
    
    -- Activity level classification
    CASE 
        WHEN us.sessions_last_7_days > 20 THEN 'very_active'
        WHEN us.sessions_last_7_days > 10 THEN 'active'
        WHEN us.sessions_last_7_days > 3 THEN 'moderate'
        WHEN us.sessions_last_7_days > 0 THEN 'low'
        ELSE 'inactive'
    END as activity_level,
    
    -- Engagement score
    LEAST(100, GREATEST(0,
        (COALESCE(us.sessions_last_7_days, 0) * 5) +
        (COALESCE(sa.sop_views, 0) * 2) +
        (COALESCE(sa.sop_creates, 0) * 10) +
        (COALESCE(sa.sop_updates, 0) * 8) +
        CASE WHEN us.last_activity_at > NOW() - INTERVAL '1 day' THEN 15 ELSE 0 END
    )) as engagement_score,
    
    NOW() as last_calculated_at
FROM auth_users u
LEFT JOIN user_stats us ON u.id = us.user_id AND u.restaurant_id = us.restaurant_id
LEFT JOIN sop_specific_activity sa ON u.id = sa.user_id AND u.restaurant_id = sa.restaurant_id
WHERE u.is_active = true;

-- Create indexes
CREATE UNIQUE INDEX idx_sop_user_analytics_unique ON sop_user_activity_analytics(restaurant_id, user_id);
CREATE INDEX idx_sop_user_analytics_restaurant ON sop_user_activity_analytics(restaurant_id);
CREATE INDEX idx_sop_user_analytics_activity_level ON sop_user_activity_analytics(activity_level);
CREATE INDEX idx_sop_user_analytics_engagement ON sop_user_activity_analytics(engagement_score DESC);

-- System Health Dashboard View
CREATE MATERIALIZED VIEW sop_system_health_dashboard AS
WITH recent_health AS (
    SELECT 
        restaurant_id,
        AVG(overall_health_score) as avg_health_score,
        AVG(cpu_usage_percent) as avg_cpu_usage,
        AVG(memory_usage_percent) as avg_memory_usage,
        AVG(active_connections) as avg_connections,
        AVG(avg_query_time_ms) as avg_query_time,
        MAX(recorded_at) as last_recorded_at
    FROM sop_system_health
    WHERE recorded_at > NOW() - INTERVAL '1 hour'
    GROUP BY restaurant_id
),
performance_alerts AS (
    SELECT 
        restaurant_id,
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'error') as error_alerts,
        COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
        MAX(triggered_at) as last_alert_at
    FROM sop_performance_alerts
    WHERE triggered_at > NOW() - INTERVAL '24 hours'
    GROUP BY restaurant_id
),
backup_status AS (
    SELECT 
        restaurant_id,
        COUNT(*) as total_backups,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_backups,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_backups,
        MAX(completed_at) as last_backup_at
    FROM sop_backup_jobs
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY restaurant_id
),
sync_status AS (
    SELECT 
        restaurant_id,
        COUNT(*) as total_devices,
        COUNT(*) FILTER (WHERE status = 'online') as online_devices,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '1 hour') as recently_active_devices,
        AVG(local_storage_used_mb) as avg_storage_used_mb
    FROM sop_sync_devices
    GROUP BY restaurant_id
)
SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    
    -- Health metrics
    COALESCE(rh.avg_health_score, 100) as current_health_score,
    COALESCE(rh.avg_cpu_usage, 0) as current_cpu_usage,
    COALESCE(rh.avg_memory_usage, 0) as current_memory_usage,
    COALESCE(rh.avg_connections, 0) as current_connections,
    COALESCE(rh.avg_query_time, 0) as current_query_time_ms,
    rh.last_recorded_at as last_health_check,
    
    -- Alert status
    COALESCE(pa.total_alerts, 0) as alerts_24h,
    COALESCE(pa.critical_alerts, 0) as critical_alerts_24h,
    COALESCE(pa.active_alerts, 0) as active_alerts,
    pa.last_alert_at,
    
    -- Backup status
    COALESCE(bs.successful_backups, 0) as successful_backups_7d,
    COALESCE(bs.failed_backups, 0) as failed_backups_7d,
    bs.last_backup_at,
    
    -- Sync status
    COALESCE(ss.total_devices, 0) as total_devices,
    COALESCE(ss.online_devices, 0) as online_devices,
    COALESCE(ss.recently_active_devices, 0) as active_devices_1h,
    COALESCE(ss.avg_storage_used_mb, 0) as avg_device_storage_mb,
    
    -- Overall system status
    CASE 
        WHEN rh.avg_health_score >= 90 AND pa.critical_alerts = 0 THEN 'healthy'
        WHEN rh.avg_health_score >= 70 AND pa.critical_alerts <= 1 THEN 'warning'
        WHEN rh.avg_health_score >= 50 AND pa.critical_alerts <= 3 THEN 'degraded'
        ELSE 'critical'
    END as system_status,
    
    NOW() as last_calculated_at
FROM restaurants r
LEFT JOIN recent_health rh ON r.id = rh.restaurant_id
LEFT JOIN performance_alerts pa ON r.id = pa.restaurant_id
LEFT JOIN backup_status bs ON r.id = bs.restaurant_id
LEFT JOIN sync_status ss ON r.id = ss.restaurant_id;

-- Create indexes
CREATE UNIQUE INDEX idx_sop_health_dashboard_unique ON sop_system_health_dashboard(restaurant_id);
CREATE INDEX idx_sop_health_dashboard_status ON sop_system_health_dashboard(system_status);
CREATE INDEX idx_sop_health_dashboard_health_score ON sop_system_health_dashboard(current_health_score);

-- ===========================================
-- REFRESH FUNCTIONS
-- ===========================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_sop_analytics_views(p_restaurant_id UUID DEFAULT NULL)
RETURNS TABLE (
    view_name TEXT,
    refresh_duration_ms INTEGER,
    rows_affected BIGINT,
    success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    duration_ms INTEGER;
    row_count BIGINT;
    view_record RECORD;
    refresh_success BOOLEAN;
    view_list TEXT[] := ARRAY[
        'sop_usage_analytics',
        'sop_performance_metrics_summary',
        'sop_user_activity_analytics',
        'sop_system_health_dashboard'
    ];
    view_item TEXT;
BEGIN
    FOR view_item IN SELECT unnest(view_list) LOOP
        start_time := NOW();
        refresh_success := true;
        
        BEGIN
            -- Refresh materialized view
            EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_item);
            
            -- Get row count
            EXECUTE format('SELECT COUNT(*) FROM %I', view_item) INTO row_count;
            
        EXCEPTION WHEN OTHERS THEN
            refresh_success := false;
            row_count := 0;
            
            -- Log refresh error
            INSERT INTO audit_logs (restaurant_id, action, resource_type, metadata)
            VALUES (
                p_restaurant_id, 'ERROR'::audit_action, 'materialized_view',
                jsonb_build_object(
                    'view_name', view_item,
                    'error_message', SQLERRM,
                    'error_code', SQLSTATE
                )
            );
        END;
        
        end_time := NOW();
        duration_ms := EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000;
        
        -- Return result for this view
        RETURN QUERY SELECT 
            view_item, duration_ms, row_count, refresh_success;
    END LOOP;
END;
$$;

-- Function to refresh a specific view
CREATE OR REPLACE FUNCTION refresh_analytics_view(p_view_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_time TIMESTAMPTZ := NOW();
    success BOOLEAN := true;
BEGIN
    -- Validate view name
    IF p_view_name NOT IN (
        'sop_usage_analytics',
        'sop_performance_metrics_summary', 
        'sop_user_activity_analytics',
        'sop_system_health_dashboard'
    ) THEN
        RAISE EXCEPTION 'Invalid view name: %', p_view_name;
    END IF;
    
    BEGIN
        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', p_view_name);
    EXCEPTION WHEN OTHERS THEN
        success := false;
        
        -- Log refresh error
        INSERT INTO audit_logs (action, resource_type, metadata)
        VALUES (
            'ERROR'::audit_action, 'materialized_view',
            jsonb_build_object(
                'view_name', p_view_name,
                'error_message', SQLERRM,
                'error_code', SQLSTATE,
                'refresh_duration_ms', EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER * 1000
            )
        );
    END;
    
    RETURN success;
END;
$$;

-- Function to get analytics view metadata
CREATE OR REPLACE FUNCTION get_analytics_view_metadata()
RETURNS TABLE (
    view_name TEXT,
    row_count BIGINT,
    size_mb DECIMAL(10,2),
    last_refresh TIMESTAMPTZ,
    refresh_frequency TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || matviewname as view_name,
        COALESCE(n_tup_ins + n_tup_upd + n_tup_del, 0) as row_count,
        ROUND((pg_total_relation_size(schemaname||'.'||matviewname))::DECIMAL / 1024 / 1024, 2) as size_mb,
        CASE 
            WHEN schemaname||'.'||matviewname = 'public.sop_usage_analytics' THEN
                (SELECT last_calculated_at FROM sop_usage_analytics LIMIT 1)
            WHEN schemaname||'.'||matviewname = 'public.sop_performance_metrics_summary' THEN
                (SELECT last_calculated_at FROM sop_performance_metrics_summary LIMIT 1)
            WHEN schemaname||'.'||matviewname = 'public.sop_user_activity_analytics' THEN
                (SELECT last_calculated_at FROM sop_user_activity_analytics LIMIT 1)
            WHEN schemaname||'.'||matviewname = 'public.sop_system_health_dashboard' THEN
                (SELECT last_calculated_at FROM sop_system_health_dashboard LIMIT 1)
        END as last_refresh,
        CASE 
            WHEN matviewname LIKE '%health%' THEN 'Every 5 minutes'
            WHEN matviewname LIKE '%performance%' THEN 'Every 15 minutes'
            ELSE 'Every 30 minutes'
        END as refresh_frequency
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public' 
    AND relname IN (
        'sop_usage_analytics',
        'sop_performance_metrics_summary',
        'sop_user_activity_analytics', 
        'sop_system_health_dashboard'
    );
END;
$$;

-- ===========================================
-- AUTOMATED REFRESH SCHEDULING
-- ===========================================

-- Create refresh tracking table
CREATE TABLE IF NOT EXISTS sop_analytics_refresh_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    view_name TEXT NOT NULL,
    refresh_started_at TIMESTAMPTZ DEFAULT NOW(),
    refresh_completed_at TIMESTAMPTZ,
    refresh_duration_ms INTEGER,
    rows_affected BIGINT,
    success BOOLEAN,
    error_message TEXT,
    triggered_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_analytics_refresh_log_view ON sop_analytics_refresh_log(view_name, refresh_started_at);
CREATE INDEX idx_analytics_refresh_log_success ON sop_analytics_refresh_log(success, refresh_started_at);

-- Function to log refresh operations
CREATE OR REPLACE FUNCTION log_analytics_refresh(
    p_view_name TEXT,
    p_duration_ms INTEGER,
    p_rows_affected BIGINT,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_triggered_by TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO sop_analytics_refresh_log (
        view_name, refresh_completed_at, refresh_duration_ms, rows_affected,
        success, error_message, triggered_by
    ) VALUES (
        p_view_name, NOW(), p_duration_ms, p_rows_affected,
        p_success, p_error_message, p_triggered_by
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT SELECT ON sop_usage_analytics TO authenticated;
GRANT SELECT ON sop_performance_metrics_summary TO authenticated;
GRANT SELECT ON sop_user_activity_analytics TO authenticated;
GRANT SELECT ON sop_system_health_dashboard TO authenticated;
GRANT SELECT ON sop_analytics_refresh_log TO authenticated;

GRANT EXECUTE ON FUNCTION refresh_sop_analytics_views TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_view_metadata TO authenticated;

-- ===========================================
-- INITIAL REFRESH
-- ===========================================

-- Refresh all views initially (this may take a few moments)
SELECT refresh_sop_analytics_views();

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

-- Analyze materialized views
ANALYZE sop_usage_analytics;
ANALYZE sop_performance_metrics_summary;
ANALYZE sop_user_activity_analytics;
ANALYZE sop_system_health_dashboard;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON MATERIALIZED VIEW sop_usage_analytics IS 'Pre-calculated SOP usage statistics with engagement metrics for dashboard performance';
COMMENT ON MATERIALIZED VIEW sop_performance_metrics_summary IS 'Aggregated performance metrics with trend analysis for system monitoring';
COMMENT ON MATERIALIZED VIEW sop_user_activity_analytics IS 'User activity patterns and engagement scores for administrative insights';
COMMENT ON MATERIALIZED VIEW sop_system_health_dashboard IS 'Comprehensive system health overview combining multiple data sources';

COMMENT ON FUNCTION refresh_sop_analytics_views IS 'Refreshes all analytics materialized views with performance tracking';
COMMENT ON FUNCTION refresh_analytics_view IS 'Refreshes a specific analytics materialized view';
COMMENT ON FUNCTION get_analytics_view_metadata IS 'Returns metadata about analytics views including size and refresh status';

-- Performance optimization notes
COMMENT ON INDEX idx_sop_usage_analytics_popularity IS 'Optimizes queries for SOP popularity analysis and trending content';
COMMENT ON INDEX idx_sop_perf_metrics_rating IS 'Enables fast filtering by performance rating for system monitoring';
COMMENT ON INDEX idx_sop_user_analytics_engagement IS 'Supports efficient user engagement analysis and ranking queries';