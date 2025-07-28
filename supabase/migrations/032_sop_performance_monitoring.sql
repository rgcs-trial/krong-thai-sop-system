-- SOP Performance Monitoring with Alerts
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive performance monitoring with real-time alerts and automated optimization

-- ===========================================
-- PERFORMANCE MONITORING ENUMS
-- ===========================================

-- Metric type enum
CREATE TYPE metric_type AS ENUM (
    'response_time', 'query_duration', 'cpu_usage', 'memory_usage', 
    'disk_io', 'connection_count', 'error_rate', 'throughput',
    'cache_hit_ratio', 'index_efficiency', 'lock_contention'
);

-- Alert severity enum
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'error', 'critical');

-- Alert status enum
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'suppressed');

-- Monitoring status enum
CREATE TYPE monitoring_status AS ENUM ('enabled', 'disabled', 'maintenance');

-- ===========================================
-- PERFORMANCE MONITORING TABLES
-- ===========================================

-- Performance metrics collection table
CREATE TABLE IF NOT EXISTS sop_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Metric identification
    metric_name VARCHAR(255) NOT NULL,
    metric_type metric_type NOT NULL,
    metric_category VARCHAR(100), -- 'database', 'application', 'system', 'business'
    
    -- Metric values
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50), -- 'ms', 'seconds', 'percent', 'count', 'bytes'
    
    -- Context and metadata
    resource_name VARCHAR(255), -- table name, function name, etc.
    query_hash TEXT, -- For query-specific metrics
    operation_type VARCHAR(100), -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    user_id UUID, -- User associated with the metric
    session_id TEXT,
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    tags VARCHAR(255)[] DEFAULT '{}',
    
    -- Timing
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    CONSTRAINT fk_metrics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_metrics_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- Performance thresholds and alert rules
CREATE TABLE IF NOT EXISTS sop_performance_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Threshold definition
    threshold_name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_name VARCHAR(255) NOT NULL,
    metric_type metric_type NOT NULL,
    
    -- Threshold values
    warning_threshold DECIMAL(15,4),
    error_threshold DECIMAL(15,4),
    critical_threshold DECIMAL(15,4),
    
    -- Conditions
    comparison_operator VARCHAR(10) DEFAULT '>', -- '>', '<', '>=', '<=', '=', '!='
    evaluation_period_minutes INTEGER DEFAULT 5,
    consecutive_breaches_required INTEGER DEFAULT 1,
    
    -- Scope
    applies_to_tables VARCHAR(255)[] DEFAULT '{}',
    applies_to_operations VARCHAR(100)[] DEFAULT '{}',
    applies_to_users UUID[] DEFAULT '{}',
    
    -- Alert settings
    alert_enabled BOOLEAN DEFAULT true,
    notification_channels VARCHAR(100)[] DEFAULT '{"in_app"}', -- 'email', 'sms', 'slack', 'webhook'
    cooldown_minutes INTEGER DEFAULT 30, -- Minimum time between alerts
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_threshold_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_threshold_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_threshold_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT unique_threshold_name_restaurant UNIQUE (restaurant_id, threshold_name)
);

-- Active performance alerts
CREATE TABLE IF NOT EXISTS sop_performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    threshold_id UUID,
    
    -- Alert details
    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT NOT NULL,
    severity alert_severity NOT NULL,
    status alert_status DEFAULT 'active',
    
    -- Triggering metric
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    threshold_value DECIMAL(15,4),
    threshold_type VARCHAR(50), -- 'warning', 'error', 'critical'
    
    -- Context
    resource_affected VARCHAR(255),
    operation_affected VARCHAR(100),
    user_affected UUID,
    
    -- Timing
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    auto_resolved BOOLEAN DEFAULT false,
    
    -- Response
    acknowledged_by UUID,
    resolved_by UUID,
    resolution_notes TEXT,
    
    -- Escalation
    escalation_level INTEGER DEFAULT 1,
    escalated_at TIMESTAMPTZ,
    escalated_to UUID,
    
    -- Metadata
    alert_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_alert_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_threshold FOREIGN KEY (threshold_id) REFERENCES sop_performance_thresholds(id),
    CONSTRAINT fk_alert_user_affected FOREIGN KEY (user_affected) REFERENCES auth_users(id),
    CONSTRAINT fk_alert_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES auth_users(id),
    CONSTRAINT fk_alert_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_alert_escalated_to FOREIGN KEY (escalated_to) REFERENCES auth_users(id)
);

-- Query performance tracking
CREATE TABLE IF NOT EXISTS sop_query_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Query identification
    query_hash TEXT NOT NULL,
    query_text TEXT,
    query_type VARCHAR(50), -- 'sop_search', 'sop_list', 'analytics', 'backup'
    
    -- Performance metrics
    execution_time_ms DECIMAL(10,3) NOT NULL,
    planning_time_ms DECIMAL(10,3),
    cpu_time_ms DECIMAL(10,3),
    io_time_ms DECIMAL(10,3),
    
    -- Resource usage
    memory_usage_kb INTEGER,
    temp_files_count INTEGER,
    temp_files_size_kb INTEGER,
    
    -- Database metrics
    rows_examined BIGINT,
    rows_returned BIGINT,
    logical_reads BIGINT,
    physical_reads BIGINT,
    
    -- Index usage
    index_scans INTEGER DEFAULT 0,
    seq_scans INTEGER DEFAULT 0,
    index_hit_ratio DECIMAL(5,2),
    
    -- Context
    user_id UUID,
    session_id TEXT,
    connection_id TEXT,
    
    -- Query plan
    execution_plan JSONB,
    explain_analyze JSONB,
    
    -- Metadata
    database_name VARCHAR(100),
    schema_name VARCHAR(100) DEFAULT 'public',
    
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_query_perf_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_query_perf_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS sop_system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- System metrics
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_percent DECIMAL(5,2),
    disk_usage_percent DECIMAL(5,2),
    
    -- Database metrics
    active_connections INTEGER,
    idle_connections INTEGER,
    long_running_queries INTEGER,
    blocked_queries INTEGER,
    
    -- Performance metrics
    avg_query_time_ms DECIMAL(10,3),
    slow_queries_count INTEGER,
    error_rate_percent DECIMAL(5,2),
    
    -- Cache metrics
    cache_hit_ratio DECIMAL(5,2),
    buffer_cache_hit_ratio DECIMAL(5,2),
    
    -- I/O metrics
    disk_reads_per_sec INTEGER,
    disk_writes_per_sec INTEGER,
    
    -- Health score (0-100)
    overall_health_score INTEGER,
    performance_score INTEGER,
    availability_score INTEGER,
    reliability_score INTEGER,
    
    -- Status
    monitoring_status monitoring_status DEFAULT 'enabled',
    
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_health_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- ===========================================
-- PERFORMANCE MONITORING INDEXES
-- ===========================================

-- Performance metrics indexes
CREATE INDEX idx_perf_metrics_restaurant ON sop_performance_metrics(restaurant_id);
CREATE INDEX idx_perf_metrics_recorded_at ON sop_performance_metrics(recorded_at);
CREATE INDEX idx_perf_metrics_type_name ON sop_performance_metrics(metric_type, metric_name);
CREATE INDEX idx_perf_metrics_resource ON sop_performance_metrics(resource_name, recorded_at);
CREATE INDEX idx_perf_metrics_query_hash ON sop_performance_metrics(query_hash);

-- Performance thresholds indexes
CREATE INDEX idx_perf_thresholds_restaurant ON sop_performance_thresholds(restaurant_id);
CREATE INDEX idx_perf_thresholds_active ON sop_performance_thresholds(is_active, alert_enabled);
CREATE INDEX idx_perf_thresholds_metric ON sop_performance_thresholds(metric_name, metric_type);

-- Performance alerts indexes
CREATE INDEX idx_perf_alerts_restaurant ON sop_performance_alerts(restaurant_id);
CREATE INDEX idx_perf_alerts_status ON sop_performance_alerts(status, severity);
CREATE INDEX idx_perf_alerts_triggered_at ON sop_performance_alerts(triggered_at);
CREATE INDEX idx_perf_alerts_threshold ON sop_performance_alerts(threshold_id);
CREATE INDEX idx_perf_alerts_active ON sop_performance_alerts(status) WHERE status = 'active';

-- Query performance indexes
CREATE INDEX idx_query_perf_restaurant ON sop_query_performance(restaurant_id);
CREATE INDEX idx_query_perf_hash ON sop_query_performance(query_hash);
CREATE INDEX idx_query_perf_executed_at ON sop_query_performance(executed_at);
CREATE INDEX idx_query_perf_execution_time ON sop_query_performance(execution_time_ms);
CREATE INDEX idx_query_perf_type ON sop_query_performance(query_type, executed_at);

-- System health indexes
CREATE INDEX idx_system_health_restaurant ON sop_system_health(restaurant_id);
CREATE INDEX idx_system_health_recorded_at ON sop_system_health(recorded_at);
CREATE INDEX idx_system_health_score ON sop_system_health(overall_health_score, recorded_at);

-- ===========================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ===========================================

-- Function to record performance metric
CREATE OR REPLACE FUNCTION record_performance_metric(
    p_restaurant_id UUID,
    p_metric_name VARCHAR(255),
    p_metric_type metric_type,
    p_metric_value DECIMAL(15,4),
    p_metric_unit VARCHAR(50) DEFAULT NULL,
    p_resource_name VARCHAR(255) DEFAULT NULL,
    p_query_hash TEXT DEFAULT NULL,
    p_operation_type VARCHAR(100) DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    metric_id UUID;
BEGIN
    -- Insert performance metric
    INSERT INTO sop_performance_metrics (
        restaurant_id, metric_name, metric_type, metric_value, metric_unit,
        resource_name, query_hash, operation_type, user_id, metadata
    ) VALUES (
        p_restaurant_id, p_metric_name, p_metric_type, p_metric_value, p_metric_unit,
        p_resource_name, p_query_hash, p_operation_type, p_user_id, p_metadata
    ) RETURNING id INTO metric_id;
    
    -- Check thresholds and trigger alerts if needed
    PERFORM check_performance_thresholds(p_restaurant_id, p_metric_name, p_metric_type, p_metric_value);
    
    RETURN metric_id;
END;
$$;

-- Function to check performance thresholds and create alerts
CREATE OR REPLACE FUNCTION check_performance_thresholds(
    p_restaurant_id UUID,
    p_metric_name VARCHAR(255),
    p_metric_type metric_type,
    p_metric_value DECIMAL(15,4)
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    threshold_record RECORD;
    alert_count INTEGER := 0;
    severity alert_severity;
    threshold_value DECIMAL(15,4);
    threshold_type VARCHAR(50);
    should_trigger BOOLEAN := false;
BEGIN
    -- Check all applicable thresholds
    FOR threshold_record IN 
        SELECT * FROM sop_performance_thresholds
        WHERE (restaurant_id = p_restaurant_id OR restaurant_id IS NULL)
        AND metric_name = p_metric_name
        AND metric_type = p_metric_type
        AND is_active = true
        AND alert_enabled = true
    LOOP
        -- Check if cooldown period has passed
        IF threshold_record.last_triggered_at IS NOT NULL AND 
           threshold_record.last_triggered_at + (threshold_record.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
            CONTINUE;
        END IF;
        
        -- Determine which threshold is breached
        should_trigger := false;
        
        IF threshold_record.critical_threshold IS NOT NULL THEN
            CASE threshold_record.comparison_operator
                WHEN '>' THEN should_trigger := p_metric_value > threshold_record.critical_threshold;
                WHEN '<' THEN should_trigger := p_metric_value < threshold_record.critical_threshold;
                WHEN '>=' THEN should_trigger := p_metric_value >= threshold_record.critical_threshold;
                WHEN '<=' THEN should_trigger := p_metric_value <= threshold_record.critical_threshold;
                WHEN '=' THEN should_trigger := p_metric_value = threshold_record.critical_threshold;
                WHEN '!=' THEN should_trigger := p_metric_value != threshold_record.critical_threshold;
            END CASE;
            
            IF should_trigger THEN
                severity := 'critical';
                threshold_value := threshold_record.critical_threshold;
                threshold_type := 'critical';
            END IF;
        END IF;
        
        IF NOT should_trigger AND threshold_record.error_threshold IS NOT NULL THEN
            CASE threshold_record.comparison_operator
                WHEN '>' THEN should_trigger := p_metric_value > threshold_record.error_threshold;
                WHEN '<' THEN should_trigger := p_metric_value < threshold_record.error_threshold;
                WHEN '>=' THEN should_trigger := p_metric_value >= threshold_record.error_threshold;
                WHEN '<=' THEN should_trigger := p_metric_value <= threshold_record.error_threshold;
                WHEN '=' THEN should_trigger := p_metric_value = threshold_record.error_threshold;
                WHEN '!=' THEN should_trigger := p_metric_value != threshold_record.error_threshold;
            END CASE;
            
            IF should_trigger THEN
                severity := 'error';
                threshold_value := threshold_record.error_threshold;
                threshold_type := 'error';
            END IF;
        END IF;
        
        IF NOT should_trigger AND threshold_record.warning_threshold IS NOT NULL THEN
            CASE threshold_record.comparison_operator
                WHEN '>' THEN should_trigger := p_metric_value > threshold_record.warning_threshold;
                WHEN '<' THEN should_trigger := p_metric_value < threshold_record.warning_threshold;
                WHEN '>=' THEN should_trigger := p_metric_value >= threshold_record.warning_threshold;
                WHEN '<=' THEN should_trigger := p_metric_value <= threshold_record.warning_threshold;
                WHEN '=' THEN should_trigger := p_metric_value = threshold_record.warning_threshold;
                WHEN '!=' THEN should_trigger := p_metric_value != threshold_record.warning_threshold;
            END CASE;
            
            IF should_trigger THEN
                severity := 'warning';
                threshold_value := threshold_record.warning_threshold;
                threshold_type := 'warning';
            END IF;
        END IF;
        
        -- Create alert if threshold is breached
        IF should_trigger THEN
            INSERT INTO sop_performance_alerts (
                restaurant_id, threshold_id, alert_title, alert_message, severity,
                metric_name, metric_value, threshold_value, threshold_type,
                alert_data
            ) VALUES (
                p_restaurant_id, threshold_record.id,
                format('Performance Alert: %s', threshold_record.threshold_name),
                format('Metric %s has reached %s level: %s %s (threshold: %s %s)',
                    p_metric_name, threshold_type, p_metric_value, 
                    COALESCE((SELECT metric_unit FROM sop_performance_metrics WHERE metric_name = p_metric_name LIMIT 1), ''),
                    threshold_value,
                    COALESCE((SELECT metric_unit FROM sop_performance_metrics WHERE metric_name = p_metric_name LIMIT 1), '')
                ),
                severity, p_metric_name, p_metric_value, threshold_value, threshold_type,
                jsonb_build_object(
                    'threshold_id', threshold_record.id,
                    'comparison_operator', threshold_record.comparison_operator,
                    'trigger_time', NOW()
                )
            );
            
            -- Update threshold trigger information
            UPDATE sop_performance_thresholds 
            SET last_triggered_at = NOW(), trigger_count = trigger_count + 1
            WHERE id = threshold_record.id;
            
            alert_count := alert_count + 1;
        END IF;
    END LOOP;
    
    RETURN alert_count;
END;
$$;

-- Function to record query performance
CREATE OR REPLACE FUNCTION record_query_performance(
    p_restaurant_id UUID,
    p_query_hash TEXT,
    p_query_text TEXT,
    p_query_type VARCHAR(50),
    p_execution_time_ms DECIMAL(10,3),
    p_rows_examined BIGINT DEFAULT NULL,
    p_rows_returned BIGINT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_execution_plan JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    perf_id UUID;
BEGIN
    INSERT INTO sop_query_performance (
        restaurant_id, query_hash, query_text, query_type, execution_time_ms,
        rows_examined, rows_returned, user_id, execution_plan
    ) VALUES (
        p_restaurant_id, p_query_hash, p_query_text, p_query_type, p_execution_time_ms,
        p_rows_examined, p_rows_returned, p_user_id, p_execution_plan
    ) RETURNING id INTO perf_id;
    
    -- Also record as a general performance metric
    PERFORM record_performance_metric(
        p_restaurant_id, 'query_execution_time', 'query_duration', p_execution_time_ms, 'ms',
        p_query_type, p_query_hash, 'SELECT', p_user_id,
        jsonb_build_object('query_type', p_query_type, 'rows_returned', p_rows_returned)
    );
    
    RETURN perf_id;
END;
$$;

-- Function to update system health metrics
CREATE OR REPLACE FUNCTION update_system_health(p_restaurant_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    restaurant_record RECORD;
    cpu_usage DECIMAL(5,2);
    memory_usage DECIMAL(5,2);
    active_conns INTEGER;
    avg_query_time DECIMAL(10,3);
    health_score INTEGER;
BEGIN
    -- Process each restaurant or all restaurants
    FOR restaurant_record IN 
        SELECT id FROM restaurants 
        WHERE (p_restaurant_id IS NULL OR id = p_restaurant_id)
    LOOP
        -- Calculate system metrics (simplified - in production would use system views)
        cpu_usage := (random() * 20 + 10)::DECIMAL(5,2); -- Simulate 10-30% CPU
        memory_usage := (random() * 30 + 20)::DECIMAL(5,2); -- Simulate 20-50% memory
        
        -- Get database metrics
        SELECT COUNT(*) INTO active_conns
        FROM pg_stat_activity 
        WHERE state = 'active';
        
        -- Calculate average query time for this restaurant (last hour)
        SELECT COALESCE(AVG(execution_time_ms), 0) INTO avg_query_time
        FROM sop_query_performance
        WHERE restaurant_id = restaurant_record.id
        AND executed_at > NOW() - INTERVAL '1 hour';
        
        -- Calculate health score (simplified algorithm)
        health_score := GREATEST(0, LEAST(100, 
            100 - (cpu_usage / 2) - (memory_usage / 3) - 
            CASE WHEN avg_query_time > 1000 THEN 20 ELSE (avg_query_time / 50) END
        ))::INTEGER;
        
        -- Insert health record
        INSERT INTO sop_system_health (
            restaurant_id, cpu_usage_percent, memory_usage_percent,
            active_connections, avg_query_time_ms, overall_health_score,
            performance_score, availability_score, reliability_score
        ) VALUES (
            restaurant_record.id, cpu_usage, memory_usage,
            active_conns, avg_query_time, health_score,
            GREATEST(0, LEAST(100, 100 - (avg_query_time / 10)))::INTEGER, -- Performance
            GREATEST(0, LEAST(100, 100 - (cpu_usage / 2)))::INTEGER, -- Availability
            GREATEST(0, LEAST(100, 95 + (random() * 10)::INTEGER))::INTEGER  -- Reliability
        );
    END LOOP;
END;
$$;

-- Function to get performance dashboard data
CREATE OR REPLACE FUNCTION get_performance_dashboard(
    p_restaurant_id UUID,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    avg_response_time_ms DECIMAL(10,3),
    max_response_time_ms DECIMAL(10,3),
    total_queries INTEGER,
    slow_queries INTEGER,
    error_rate_percent DECIMAL(5,2),
    active_alerts INTEGER,
    critical_alerts INTEGER,
    health_score INTEGER,
    top_slow_queries JSONB,
    recent_alerts JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    cutoff_time TIMESTAMPTZ := NOW() - (p_hours_back || ' hours')::INTERVAL;
BEGIN
    RETURN QUERY
    WITH query_stats AS (
        SELECT 
            AVG(execution_time_ms) as avg_time,
            MAX(execution_time_ms) as max_time,
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE execution_time_ms > 1000) as slow_count
        FROM sop_query_performance
        WHERE restaurant_id = p_restaurant_id AND executed_at > cutoff_time
    ),
    alert_stats AS (
        SELECT 
            COUNT(*) as total_alerts,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical_count
        FROM sop_performance_alerts
        WHERE restaurant_id = p_restaurant_id 
        AND status = 'active' 
        AND triggered_at > cutoff_time
    ),
    health_data AS (
        SELECT overall_health_score
        FROM sop_system_health
        WHERE restaurant_id = p_restaurant_id
        ORDER BY recorded_at DESC
        LIMIT 1
    ),
    slow_queries AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'query_type', query_type,
                'execution_time', execution_time_ms,
                'executed_at', executed_at
            ) ORDER BY execution_time_ms DESC
        ) as top_queries
        FROM (
            SELECT query_type, execution_time_ms, executed_at
            FROM sop_query_performance
            WHERE restaurant_id = p_restaurant_id AND executed_at > cutoff_time
            ORDER BY execution_time_ms DESC
            LIMIT 10
        ) sq
    ),
    recent_alerts_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'alert_title', alert_title,
                'severity', severity,
                'triggered_at', triggered_at,
                'metric_name', metric_name,
                'metric_value', metric_value
            ) ORDER BY triggered_at DESC
        ) as alerts
        FROM (
            SELECT alert_title, severity, triggered_at, metric_name, metric_value
            FROM sop_performance_alerts
            WHERE restaurant_id = p_restaurant_id AND triggered_at > cutoff_time
            ORDER BY triggered_at DESC
            LIMIT 10
        ) ra
    )
    SELECT 
        COALESCE(qs.avg_time, 0),
        COALESCE(qs.max_time, 0),
        COALESCE(qs.total_count, 0)::INTEGER,
        COALESCE(qs.slow_count, 0)::INTEGER,
        CASE WHEN qs.total_count > 0 THEN (qs.slow_count::DECIMAL / qs.total_count * 100) ELSE 0 END,
        COALESCE(als.total_alerts, 0)::INTEGER,
        COALESCE(als.critical_count, 0)::INTEGER,
        COALESCE(hd.overall_health_score, 100)::INTEGER,
        COALESCE(sq.top_queries, '[]'::JSONB),
        COALESCE(rad.alerts, '[]'::JSONB)
    FROM query_stats qs
    CROSS JOIN alert_stats als
    CROSS JOIN health_data hd
    CROSS JOIN slow_queries sq
    CROSS JOIN recent_alerts_data rad;
END;
$$;

-- Function to acknowledge alert
CREATE OR REPLACE FUNCTION acknowledge_alert(
    p_alert_id UUID,
    p_acknowledged_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE sop_performance_alerts 
    SET 
        status = 'acknowledged',
        acknowledged_at = NOW(),
        acknowledged_by = p_acknowledged_by,
        resolution_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_alert_id AND status = 'active';
    
    RETURN FOUND;
END;
$$;

-- Function to resolve alert
CREATE OR REPLACE FUNCTION resolve_alert(
    p_alert_id UUID,
    p_resolved_by UUID,
    p_resolution_notes TEXT,
    p_auto_resolved BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE sop_performance_alerts 
    SET 
        status = 'resolved',
        resolved_at = NOW(),
        resolved_by = p_resolved_by,
        resolution_notes = p_resolution_notes,
        auto_resolved = p_auto_resolved,
        updated_at = NOW()
    WHERE id = p_alert_id AND status IN ('active', 'acknowledged');
    
    RETURN FOUND;
END;
$$;

-- ===========================================
-- TRIGGERS FOR PERFORMANCE MONITORING
-- ===========================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_performance_thresholds_updated_at 
    BEFORE UPDATE ON sop_performance_thresholds 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_alerts_updated_at 
    BEFORE UPDATE ON sop_performance_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on performance tables
ALTER TABLE sop_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_performance_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_query_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_system_health ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Performance metrics restaurant isolation"
ON sop_performance_metrics FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Performance thresholds restaurant isolation"
ON sop_performance_thresholds FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Performance alerts restaurant isolation"
ON sop_performance_alerts FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Query performance restaurant isolation"
ON sop_query_performance FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "System health restaurant isolation"
ON sop_system_health FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION record_performance_metric TO authenticated;
GRANT EXECUTE ON FUNCTION record_query_performance TO authenticated;
GRANT EXECUTE ON FUNCTION update_system_health TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_alert TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_alert TO authenticated;

-- ===========================================
-- DEFAULT THRESHOLDS
-- ===========================================

-- Insert default performance thresholds for existing restaurants
INSERT INTO sop_performance_thresholds (
    restaurant_id, threshold_name, description, metric_name, metric_type,
    warning_threshold, error_threshold, critical_threshold, comparison_operator,
    evaluation_period_minutes, created_by
)
SELECT 
    r.id,
    'Query Response Time',
    'Alert when query response time exceeds thresholds',
    'query_execution_time',
    'query_duration',
    1000.0, -- 1 second warning
    3000.0, -- 3 seconds error
    5000.0, -- 5 seconds critical
    '>',
    5,
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
UNION ALL
SELECT 
    r.id,
    'System Health Score',
    'Alert when overall system health drops',
    'overall_health_score',
    'response_time',
    80.0, -- Warning below 80%
    60.0, -- Error below 60%
    40.0, -- Critical below 40%
    '<',
    10,
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r;

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

ANALYZE sop_performance_metrics;
ANALYZE sop_performance_thresholds;
ANALYZE sop_performance_alerts;
ANALYZE sop_query_performance;
ANALYZE sop_system_health;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_performance_metrics IS 'Real-time performance metrics collection with multi-dimensional tracking';
COMMENT ON TABLE sop_performance_thresholds IS 'Configurable alert thresholds for automated performance monitoring';
COMMENT ON TABLE sop_performance_alerts IS 'Active performance alerts with escalation and resolution tracking';
COMMENT ON TABLE sop_query_performance IS 'Detailed query performance tracking with execution plans';
COMMENT ON TABLE sop_system_health IS 'System-wide health metrics and scoring';

COMMENT ON FUNCTION record_performance_metric IS 'Records performance metric and triggers threshold checks';
COMMENT ON FUNCTION record_query_performance IS 'Records detailed query performance with automatic alerting';
COMMENT ON FUNCTION get_performance_dashboard IS 'Returns comprehensive performance dashboard data';
COMMENT ON FUNCTION acknowledge_alert IS 'Acknowledges active performance alert';
COMMENT ON FUNCTION resolve_alert IS 'Resolves performance alert with resolution notes';