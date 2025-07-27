-- Performance Monitoring and Alerting System
-- This migration creates comprehensive monitoring for database performance
-- Created: 2025-07-27
-- Purpose: Monitor query performance, alert on issues, track system health

-- ===========================================
-- PERFORMANCE MONITORING TABLES
-- ===========================================

-- Table to track query performance over time
CREATE TABLE query_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type VARCHAR(100) NOT NULL,
    execution_time_ms NUMERIC(10,2) NOT NULL,
    query_hash VARCHAR(64) NOT NULL, -- MD5 hash of normalized query
    query_text TEXT,
    table_scans INTEGER DEFAULT 0,
    index_usage_ratio NUMERIC(5,2), -- Percentage of queries using indexes
    cache_hit_ratio NUMERIC(5,2), -- Buffer cache hit ratio
    rows_returned INTEGER,
    restaurant_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_perf_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_perf_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- Create indexes for performance monitoring
CREATE INDEX idx_query_performance_type_time ON query_performance_log (query_type, created_at DESC);
CREATE INDEX idx_query_performance_execution_time ON query_performance_log (execution_time_ms DESC);
CREATE INDEX idx_query_performance_restaurant ON query_performance_log (restaurant_id, created_at DESC);

-- Table to track system alerts and thresholds
CREATE TABLE system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL, -- 'performance', 'capacity', 'error', 'security'
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metric_name VARCHAR(100),
    threshold_value NUMERIC,
    current_value NUMERIC,
    restaurant_id UUID,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_alert_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_alert_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_users(id)
);

CREATE INDEX idx_system_alerts_type_severity ON system_alerts (alert_type, severity, created_at DESC);
CREATE INDEX idx_system_alerts_restaurant ON system_alerts (restaurant_id, is_resolved, created_at DESC);

-- Table to track database capacity metrics
CREATE TABLE capacity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    total_connections INTEGER,
    active_connections INTEGER,
    database_size_mb NUMERIC(12,2),
    table_sizes JSONB, -- Size breakdown by table
    index_sizes JSONB, -- Size breakdown by index
    cache_hit_ratio NUMERIC(5,2),
    slow_query_count INTEGER DEFAULT 0,
    concurrent_users INTEGER DEFAULT 0,
    peak_usage_time TIME,
    restaurant_breakdown JSONB, -- Usage by restaurant
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_capacity_date UNIQUE (metric_date)
);

CREATE INDEX idx_capacity_metrics_date ON capacity_metrics (metric_date DESC);

-- ===========================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ===========================================

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
    p_query_type VARCHAR(100),
    p_execution_time_ms NUMERIC,
    p_query_text TEXT DEFAULT NULL,
    p_restaurant_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    query_hash VARCHAR(64);
BEGIN
    -- Generate hash of normalized query
    query_hash := md5(COALESCE(p_query_text, p_query_type));
    
    INSERT INTO query_performance_log (
        query_type, execution_time_ms, query_hash, query_text,
        restaurant_id, user_id
    ) VALUES (
        p_query_type, p_execution_time_ms, query_hash, p_query_text,
        p_restaurant_id, p_user_id
    ) RETURNING id INTO log_id;
    
    -- Check for performance alerts
    PERFORM check_performance_thresholds(p_query_type, p_execution_time_ms, p_restaurant_id);
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check performance thresholds and create alerts
CREATE OR REPLACE FUNCTION check_performance_thresholds(
    p_query_type VARCHAR(100),
    p_execution_time_ms NUMERIC,
    p_restaurant_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    threshold_ms NUMERIC;
    alert_title VARCHAR(255);
    alert_description TEXT;
BEGIN
    -- Define performance thresholds based on query type
    CASE p_query_type
        WHEN 'sop_search' THEN threshold_ms := 100;
        WHEN 'sop_query' THEN threshold_ms := 50;
        WHEN 'category_query' THEN threshold_ms := 30;
        WHEN 'training_query' THEN threshold_ms := 75;
        WHEN 'authentication' THEN threshold_ms := 50;
        ELSE threshold_ms := 200; -- Default threshold
    END CASE;
    
    -- Create alert if threshold exceeded
    IF p_execution_time_ms > threshold_ms THEN
        alert_title := 'Slow Query Alert: ' || p_query_type;
        alert_description := format(
            'Query type "%s" took %s ms, exceeding threshold of %s ms',
            p_query_type, p_execution_time_ms, threshold_ms
        );
        
        INSERT INTO system_alerts (
            alert_type, severity, title, description,
            metric_name, threshold_value, current_value, restaurant_id, metadata
        ) VALUES (
            'performance',
            CASE 
                WHEN p_execution_time_ms > threshold_ms * 3 THEN 'critical'
                WHEN p_execution_time_ms > threshold_ms * 2 THEN 'warning'
                ELSE 'info'
            END,
            alert_title, alert_description,
            p_query_type || '_execution_time', threshold_ms, p_execution_time_ms,
            p_restaurant_id,
            jsonb_build_object(
                'query_type', p_query_type,
                'execution_time_ms', p_execution_time_ms,
                'threshold_ms', threshold_ms,
                'timestamp', NOW()
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to collect daily capacity metrics
CREATE OR REPLACE FUNCTION collect_capacity_metrics()
RETURNS VOID AS $$
DECLARE
    total_db_size NUMERIC;
    table_sizes_json JSONB;
    index_sizes_json JSONB;
    cache_hit_ratio NUMERIC;
    active_conn_count INTEGER;
    restaurant_usage JSONB;
BEGIN
    -- Get database size
    SELECT pg_size_pretty(pg_database_size(current_database()))::TEXT INTO total_db_size;
    
    -- Get table sizes
    SELECT jsonb_object_agg(schemaname||'.'||tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)))
    INTO table_sizes_json
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    -- Get index sizes  
    SELECT jsonb_object_agg(indexname, pg_size_pretty(pg_relation_size(indexname::regclass)))
    INTO index_sizes_json
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- Calculate cache hit ratio
    SELECT ROUND(
        100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2
    ) INTO cache_hit_ratio
    FROM pg_stat_database 
    WHERE datname = current_database();
    
    -- Get active connections
    SELECT count(*) INTO active_conn_count
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Get restaurant usage breakdown
    SELECT jsonb_object_agg(
        r.name,
        jsonb_build_object(
            'users', COUNT(DISTINCT au.id),
            'sop_documents', COUNT(DISTINCT sd.id),
            'form_submissions_today', COUNT(DISTINCT CASE WHEN fs.submission_date = CURRENT_DATE THEN fs.id END)
        )
    ) INTO restaurant_usage
    FROM restaurants r
    LEFT JOIN auth_users au ON r.id = au.restaurant_id AND au.is_active = true
    LEFT JOIN sop_documents sd ON r.id = sd.restaurant_id AND sd.is_active = true
    LEFT JOIN form_submissions fs ON r.id = fs.restaurant_id
    GROUP BY r.id, r.name;
    
    -- Insert metrics
    INSERT INTO capacity_metrics (
        metric_date, active_connections, database_size_mb,
        table_sizes, index_sizes, cache_hit_ratio,
        restaurant_breakdown
    ) VALUES (
        CURRENT_DATE, active_conn_count, total_db_size::NUMERIC,
        table_sizes_json, index_sizes_json, cache_hit_ratio,
        restaurant_usage
    ) ON CONFLICT (metric_date) DO UPDATE SET
        active_connections = EXCLUDED.active_connections,
        database_size_mb = EXCLUDED.database_size_mb,
        table_sizes = EXCLUDED.table_sizes,
        index_sizes = EXCLUDED.index_sizes,
        cache_hit_ratio = EXCLUDED.cache_hit_ratio,
        restaurant_breakdown = EXCLUDED.restaurant_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- AUTOMATED MONITORING FUNCTIONS
-- ===========================================

-- Function to detect slow queries and create alerts
CREATE OR REPLACE FUNCTION monitor_slow_queries()
RETURNS INTEGER AS $$
DECLARE
    slow_query_count INTEGER := 0;
    avg_execution_time NUMERIC;
    query_type VARCHAR(100);
BEGIN
    -- Analyze queries from the last hour
    FOR query_type IN 
        SELECT DISTINCT qpl.query_type 
        FROM query_performance_log qpl
        WHERE qpl.created_at >= NOW() - INTERVAL '1 hour'
    LOOP
        SELECT AVG(execution_time_ms) INTO avg_execution_time
        FROM query_performance_log
        WHERE query_type = monitor_slow_queries.query_type
        AND created_at >= NOW() - INTERVAL '1 hour';
        
        -- Check thresholds and increment counter
        CASE query_type
            WHEN 'sop_search' THEN 
                IF avg_execution_time > 100 THEN slow_query_count := slow_query_count + 1; END IF;
            WHEN 'sop_query' THEN 
                IF avg_execution_time > 50 THEN slow_query_count := slow_query_count + 1; END IF;
            WHEN 'category_query' THEN 
                IF avg_execution_time > 30 THEN slow_query_count := slow_query_count + 1; END IF;
            WHEN 'training_query' THEN 
                IF avg_execution_time > 75 THEN slow_query_count := slow_query_count + 1; END IF;
            ELSE 
                IF avg_execution_time > 200 THEN slow_query_count := slow_query_count + 1; END IF;
        END CASE;
    END LOOP;
    
    -- Create system alert if too many slow queries
    IF slow_query_count > 3 THEN
        INSERT INTO system_alerts (
            alert_type, severity, title, description, metadata
        ) VALUES (
            'performance', 'warning',
            'Multiple Slow Query Types Detected',
            format('Detected %s query types exceeding performance thresholds in the last hour', slow_query_count),
            jsonb_build_object(
                'slow_query_count', slow_query_count,
                'monitoring_period', '1 hour',
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN slow_query_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to monitor concurrent user capacity
CREATE OR REPLACE FUNCTION monitor_concurrent_users()
RETURNS INTEGER AS $$
DECLARE
    concurrent_count INTEGER;
    max_recommended INTEGER := 100; -- Target: 100+ concurrent tablets
BEGIN
    -- Count active sessions in the last 5 minutes
    SELECT COUNT(DISTINCT user_id) INTO concurrent_count
    FROM audit_logs
    WHERE created_at >= NOW() - INTERVAL '5 minutes'
    AND action IN ('VIEW', 'CREATE', 'UPDATE');
    
    -- Update capacity metrics
    UPDATE capacity_metrics 
    SET concurrent_users = GREATEST(concurrent_users, concurrent_count)
    WHERE metric_date = CURRENT_DATE;
    
    -- Create alert if approaching capacity limits
    IF concurrent_count > max_recommended * 0.8 THEN -- 80% threshold
        INSERT INTO system_alerts (
            alert_type, severity, title, description,
            metric_name, threshold_value, current_value, metadata
        ) VALUES (
            'capacity',
            CASE 
                WHEN concurrent_count > max_recommended THEN 'critical'
                WHEN concurrent_count > max_recommended * 0.9 THEN 'warning'
                ELSE 'info'
            END,
            'High Concurrent User Load',
            format('Currently %s concurrent users (recommended max: %s)', concurrent_count, max_recommended),
            'concurrent_users', max_recommended, concurrent_count,
            jsonb_build_object(
                'current_users', concurrent_count,
                'recommended_max', max_recommended,
                'utilization_percentage', ROUND((concurrent_count::NUMERIC / max_recommended) * 100, 1),
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN concurrent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- REPORTING AND DASHBOARD FUNCTIONS
-- ===========================================

-- Function to get performance dashboard summary
CREATE OR REPLACE FUNCTION get_performance_dashboard(p_hours INTEGER DEFAULT 24)
RETURNS TABLE(
    metric_category VARCHAR(50),
    metric_name VARCHAR(100),
    current_value NUMERIC,
    threshold_value NUMERIC,
    status VARCHAR(20),
    trend VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    -- Query performance metrics
    SELECT 
        'Query Performance'::VARCHAR(50),
        qpl.query_type::VARCHAR(100),
        ROUND(AVG(qpl.execution_time_ms), 2) as current_value,
        CASE qpl.query_type
            WHEN 'sop_search' THEN 100::NUMERIC
            WHEN 'sop_query' THEN 50::NUMERIC
            WHEN 'category_query' THEN 30::NUMERIC
            WHEN 'training_query' THEN 75::NUMERIC
            ELSE 200::NUMERIC
        END as threshold_value,
        CASE 
            WHEN AVG(qpl.execution_time_ms) <= CASE qpl.query_type
                WHEN 'sop_search' THEN 100 WHEN 'sop_query' THEN 50
                WHEN 'category_query' THEN 30 WHEN 'training_query' THEN 75
                ELSE 200 END THEN 'Good'::VARCHAR(20)
            WHEN AVG(qpl.execution_time_ms) <= CASE qpl.query_type
                WHEN 'sop_search' THEN 150 WHEN 'sop_query' THEN 75
                WHEN 'category_query' THEN 45 WHEN 'training_query' THEN 112
                ELSE 300 END THEN 'Warning'::VARCHAR(20)
            ELSE 'Critical'::VARCHAR(20)
        END as status,
        CASE 
            WHEN AVG(qpl.execution_time_ms) < (
                SELECT AVG(execution_time_ms) 
                FROM query_performance_log qpl2 
                WHERE qpl2.query_type = qpl.query_type 
                AND qpl2.created_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '24 hours'
            ) THEN 'Improving'::VARCHAR(20)
            WHEN AVG(qpl.execution_time_ms) > (
                SELECT AVG(execution_time_ms) 
                FROM query_performance_log qpl2 
                WHERE qpl2.query_type = qpl.query_type 
                AND qpl2.created_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '24 hours'
            ) THEN 'Degrading'::VARCHAR(20)
            ELSE 'Stable'::VARCHAR(20)
        END as trend
    FROM query_performance_log qpl
    WHERE qpl.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY qpl.query_type
    HAVING COUNT(*) >= 5 -- Only include if we have enough samples
    
    UNION ALL
    
    -- System capacity metrics
    SELECT 
        'System Capacity'::VARCHAR(50),
        'Concurrent Users'::VARCHAR(100),
        COALESCE(MAX(cm.concurrent_users), 0)::NUMERIC,
        100::NUMERIC,
        CASE 
            WHEN MAX(cm.concurrent_users) <= 80 THEN 'Good'::VARCHAR(20)
            WHEN MAX(cm.concurrent_users) <= 100 THEN 'Warning'::VARCHAR(20)
            ELSE 'Critical'::VARCHAR(20)
        END,
        'Stable'::VARCHAR(20) -- Trend calculation would need historical data
    FROM capacity_metrics cm
    WHERE cm.metric_date >= CURRENT_DATE - (p_hours / 24)::INTEGER
    
    ORDER BY 1, 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get alert summary
CREATE OR REPLACE FUNCTION get_alert_summary(p_hours INTEGER DEFAULT 24)
RETURNS TABLE(
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    alert_count BIGINT,
    latest_alert TIMESTAMPTZ,
    resolved_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.alert_type,
        sa.severity,
        COUNT(*) as alert_count,
        MAX(sa.created_at) as latest_alert,
        COUNT(*) FILTER (WHERE sa.is_resolved = true) as resolved_count
    FROM system_alerts sa
    WHERE sa.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY sa.alert_type, sa.severity
    ORDER BY alert_count DESC, latest_alert DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- CLEANUP AND MAINTENANCE
-- ===========================================

-- Function to cleanup old performance logs
CREATE OR REPLACE FUNCTION cleanup_performance_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Keep performance logs for 30 days
    DELETE FROM query_performance_log 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Keep resolved alerts for 90 days, unresolved for 180 days
    DELETE FROM system_alerts 
    WHERE (is_resolved = true AND created_at < NOW() - INTERVAL '90 days')
    OR (is_resolved = false AND created_at < NOW() - INTERVAL '180 days');
    
    -- Keep capacity metrics for 1 year
    DELETE FROM capacity_metrics 
    WHERE metric_date < CURRENT_DATE - INTERVAL '1 year';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- SCHEDULED MONITORING SETUP
-- ===========================================

-- Note: In production, these functions would be called by cron jobs or scheduled tasks
-- For now, we'll create a function that simulates the monitoring schedule

CREATE OR REPLACE FUNCTION run_monitoring_cycle()
RETURNS JSONB AS $$
DECLARE
    monitoring_results JSONB;
    slow_queries INTEGER;
    concurrent_users INTEGER;
BEGIN
    -- Collect capacity metrics
    PERFORM collect_capacity_metrics();
    
    -- Monitor slow queries
    slow_queries := monitor_slow_queries();
    
    -- Monitor concurrent users
    concurrent_users := monitor_concurrent_users();
    
    -- Compile results
    monitoring_results := jsonb_build_object(
        'timestamp', NOW(),
        'slow_query_types', slow_queries,
        'concurrent_users', concurrent_users,
        'monitoring_cycle_completed', true
    );
    
    -- Log the monitoring cycle
    INSERT INTO audit_logs (restaurant_id, action, resource_type, metadata)
    VALUES (
        '550e8400-e29b-41d4-a716-446655440000'::UUID,
        'CREATE'::audit_action,
        'monitoring_cycle',
        monitoring_results
    );
    
    RETURN monitoring_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- INITIAL SETUP AND CONFIGURATION
-- ===========================================

-- Create initial capacity metrics entry
PERFORM collect_capacity_metrics();

-- Log the monitoring system setup
INSERT INTO audit_logs (restaurant_id, action, resource_type, metadata)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'CREATE'::audit_action,
    'monitoring_system',
    jsonb_build_object(
        'migration', '007_monitoring_and_alerts',
        'timestamp', NOW(),
        'features_enabled', ARRAY[
            'query_performance_logging',
            'automated_alerting',
            'capacity_monitoring',
            'concurrent_user_tracking',
            'performance_dashboard',
            'alert_management'
        ],
        'thresholds_configured', jsonb_build_object(
            'sop_search', '100ms',
            'sop_query', '50ms',
            'category_query', '30ms',
            'training_query', '75ms',
            'concurrent_users', '100 tablets'
        )
    )
);

-- Enable RLS on monitoring tables
ALTER TABLE query_performance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for monitoring tables
CREATE POLICY "Monitoring access for admins"
ON query_performance_log FOR ALL
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users WHERE role = 'admin'
    )
);

CREATE POLICY "Alert access for managers and admins"
ON system_alerts FOR ALL
TO authenticated
USING (
    restaurant_id IS NULL OR restaurant_id = (
        SELECT restaurant_id FROM auth_users 
        WHERE auth_users.id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Capacity metrics admin only"
ON capacity_metrics FOR ALL
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM auth_users WHERE role = 'admin'
    )
);

-- Add comments for documentation
COMMENT ON TABLE query_performance_log IS 'Tracks database query performance over time for optimization';
COMMENT ON TABLE system_alerts IS 'System alerts and threshold violations for proactive monitoring';
COMMENT ON TABLE capacity_metrics IS 'Daily capacity and usage metrics for system planning';
COMMENT ON FUNCTION log_query_performance IS 'Log query execution time and trigger performance alerts';
COMMENT ON FUNCTION get_performance_dashboard IS 'Generate performance dashboard data with status and trends';
COMMENT ON FUNCTION run_monitoring_cycle IS 'Execute complete monitoring cycle - call every 15 minutes';

-- Monitoring system setup complete
-- Features enabled:
-- - Automated query performance logging with thresholds
-- - Real-time alerting for performance issues
-- - Capacity monitoring and planning metrics
-- - Concurrent user tracking for tablet optimization
-- - Performance dashboard with trends and status
-- - Automated cleanup and maintenance
-- - Restaurant-isolated monitoring with RLS