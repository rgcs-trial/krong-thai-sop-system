-- SOP Database Connection Pooling and Resource Management
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Advanced connection pooling with monitoring and automated optimization

-- ===========================================
-- CONNECTION POOLING ENUMS
-- ===========================================

-- Connection status enum
CREATE TYPE connection_status AS ENUM (
    'active', 'idle', 'idle_in_transaction', 'idle_in_transaction_aborted',
    'fastpath_function_call', 'disabled'
);

-- Pool status enum
CREATE TYPE pool_status AS ENUM (
    'healthy', 'warning', 'critical', 'maintenance', 'disabled'
);

-- Connection type enum
CREATE TYPE connection_type AS ENUM (
    'read_write', 'read_only', 'analytics', 'background', 'system'
);

-- ===========================================
-- CONNECTION POOLING TABLES
-- ===========================================

-- Connection pool configuration
CREATE TABLE IF NOT EXISTS sop_connection_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Pool identification
    pool_name VARCHAR(255) NOT NULL,
    pool_description TEXT,
    connection_type connection_type DEFAULT 'read_write',
    
    -- Pool configuration
    min_connections INTEGER DEFAULT 5,
    max_connections INTEGER DEFAULT 100,
    initial_connections INTEGER DEFAULT 10,
    connection_increment INTEGER DEFAULT 5,
    
    -- Timeout settings (in seconds)
    connection_timeout INTEGER DEFAULT 30,
    idle_timeout INTEGER DEFAULT 600, -- 10 minutes
    max_lifetime INTEGER DEFAULT 3600, -- 1 hour
    validation_timeout INTEGER DEFAULT 5,
    
    -- Pool behavior
    pool_enabled BOOLEAN DEFAULT true,
    auto_scaling BOOLEAN DEFAULT true,
    validate_connections BOOLEAN DEFAULT true,
    reset_on_return BOOLEAN DEFAULT true,
    
    -- Load balancing
    load_balance_strategy VARCHAR(50) DEFAULT 'round_robin', -- 'round_robin', 'least_connections', 'random'
    failover_enabled BOOLEAN DEFAULT true,
    
    -- Monitoring
    monitor_slow_queries BOOLEAN DEFAULT true,
    slow_query_threshold_ms INTEGER DEFAULT 1000,
    log_connections BOOLEAN DEFAULT false,
    
    -- Database connection details
    database_host VARCHAR(255) DEFAULT 'localhost',
    database_port INTEGER DEFAULT 5432,
    database_name VARCHAR(255) DEFAULT 'postgres',
    ssl_mode VARCHAR(50) DEFAULT 'require',
    
    -- Status
    status pool_status DEFAULT 'healthy',
    last_health_check TIMESTAMPTZ,
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_pool_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_pool_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_pool_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT unique_pool_name UNIQUE (restaurant_id, pool_name),
    CONSTRAINT valid_connection_limits CHECK (min_connections <= initial_connections AND initial_connections <= max_connections)
);

-- Active connection tracking
CREATE TABLE IF NOT EXISTS sop_active_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Connection identification
    connection_id TEXT NOT NULL, -- Database backend PID or unique identifier
    session_id TEXT,
    application_name TEXT,
    
    -- Connection details
    database_user TEXT,
    client_address INET,
    client_hostname TEXT,
    client_port INTEGER,
    
    -- Connection state
    status connection_status DEFAULT 'idle',
    current_query TEXT,
    query_start TIMESTAMPTZ,
    state_change TIMESTAMPTZ,
    
    -- Resource usage
    backend_start TIMESTAMPTZ,
    transaction_start TIMESTAMPTZ,
    queries_executed INTEGER DEFAULT 0,
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    
    -- Performance metrics
    avg_query_duration_ms DECIMAL(10,3) DEFAULT 0,
    longest_query_duration_ms DECIMAL(10,3) DEFAULT 0,
    last_query_at TIMESTAMPTZ,
    
    -- User context
    user_id UUID,
    restaurant_context UUID,
    
    -- Monitoring
    is_monitored BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_connection_pool FOREIGN KEY (pool_id) REFERENCES sop_connection_pools(id) ON DELETE CASCADE,
    CONSTRAINT fk_connection_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_connection_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT unique_connection_id UNIQUE (pool_id, connection_id)
);

-- Connection pool statistics
CREATE TABLE IF NOT EXISTS sop_pool_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Time period
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Connection counts
    active_connections INTEGER DEFAULT 0,
    idle_connections INTEGER DEFAULT 0,
    total_connections INTEGER DEFAULT 0,
    max_connections_used INTEGER DEFAULT 0,
    
    -- Pool utilization
    utilization_percentage DECIMAL(5,2) DEFAULT 0,
    peak_utilization_percentage DECIMAL(5,2) DEFAULT 0,
    avg_utilization_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Performance metrics
    avg_connection_wait_time_ms DECIMAL(10,3) DEFAULT 0,
    max_connection_wait_time_ms DECIMAL(10,3) DEFAULT 0,
    connection_requests INTEGER DEFAULT 0,
    connection_timeouts INTEGER DEFAULT 0,
    connection_failures INTEGER DEFAULT 0,
    
    -- Query metrics
    total_queries INTEGER DEFAULT 0,
    slow_queries INTEGER DEFAULT 0,
    failed_queries INTEGER DEFAULT 0,
    avg_query_duration_ms DECIMAL(10,3) DEFAULT 0,
    
    -- Health metrics
    pool_health_score INTEGER DEFAULT 100, -- 0-100
    error_rate_percentage DECIMAL(5,2) DEFAULT 0,
    availability_percentage DECIMAL(5,2) DEFAULT 100,
    
    CONSTRAINT fk_stats_pool FOREIGN KEY (pool_id) REFERENCES sop_connection_pools(id) ON DELETE CASCADE,
    CONSTRAINT fk_stats_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Connection events and alerts
CREATE TABLE IF NOT EXISTS sop_connection_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID,
    connection_id UUID,
    restaurant_id UUID,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL, -- 'connection_created', 'connection_closed', 'timeout', 'error', 'pool_exhausted'
    event_severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    event_message TEXT,
    event_details JSONB DEFAULT '{}',
    
    -- Context
    user_id UUID,
    session_id TEXT,
    application_name TEXT,
    
    -- Performance data
    duration_ms INTEGER,
    memory_usage_kb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    
    -- Resolution
    auto_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolution_action TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_event_pool FOREIGN KEY (pool_id) REFERENCES sop_connection_pools(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_connection FOREIGN KEY (connection_id) REFERENCES sop_active_connections(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- ===========================================
-- CONNECTION POOLING INDEXES
-- ===========================================

-- Connection pools indexes
CREATE INDEX idx_connection_pools_restaurant ON sop_connection_pools(restaurant_id);
CREATE INDEX idx_connection_pools_status ON sop_connection_pools(status, pool_enabled);
CREATE INDEX idx_connection_pools_type ON sop_connection_pools(connection_type);

-- Active connections indexes
CREATE INDEX idx_active_connections_pool ON sop_active_connections(pool_id);
CREATE INDEX idx_active_connections_status ON sop_active_connections(status);
CREATE INDEX idx_active_connections_user ON sop_active_connections(user_id);
CREATE INDEX idx_active_connections_activity ON sop_active_connections(last_activity_at);
CREATE INDEX idx_active_connections_session ON sop_active_connections(session_id);

-- Pool statistics indexes
CREATE INDEX idx_pool_stats_pool ON sop_pool_statistics(pool_id);
CREATE INDEX idx_pool_stats_recorded_at ON sop_pool_statistics(recorded_at);
CREATE INDEX idx_pool_stats_period ON sop_pool_statistics(period_start, period_end);
CREATE INDEX idx_pool_stats_utilization ON sop_pool_statistics(utilization_percentage);

-- Connection events indexes
CREATE INDEX idx_connection_events_pool ON sop_connection_events(pool_id);
CREATE INDEX idx_connection_events_type ON sop_connection_events(event_type);
CREATE INDEX idx_connection_events_severity ON sop_connection_events(event_severity);
CREATE INDEX idx_connection_events_created_at ON sop_connection_events(created_at);

-- ===========================================
-- CONNECTION POOLING FUNCTIONS
-- ===========================================

-- Function to create connection pool
CREATE OR REPLACE FUNCTION create_connection_pool(
    p_restaurant_id UUID,
    p_pool_name VARCHAR(255),
    p_connection_type connection_type DEFAULT 'read_write',
    p_min_connections INTEGER DEFAULT 5,
    p_max_connections INTEGER DEFAULT 100,
    p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pool_id UUID;
BEGIN
    -- Validate connection limits
    IF p_min_connections > p_max_connections THEN
        RAISE EXCEPTION 'Minimum connections cannot exceed maximum connections';
    END IF;
    
    IF p_max_connections > 500 THEN
        RAISE EXCEPTION 'Maximum connections cannot exceed 500 for safety';
    END IF;
    
    -- Create connection pool
    INSERT INTO sop_connection_pools (
        restaurant_id, pool_name, connection_type, min_connections, max_connections,
        initial_connections, created_by
    ) VALUES (
        p_restaurant_id, p_pool_name, p_connection_type, p_min_connections, p_max_connections,
        LEAST(p_min_connections + 5, p_max_connections), p_created_by
    ) RETURNING id INTO pool_id;
    
    -- Log pool creation
    INSERT INTO sop_connection_events (
        pool_id, restaurant_id, event_type, event_severity, event_message, user_id
    ) VALUES (
        pool_id, p_restaurant_id, 'pool_created', 'info',
        format('Connection pool "%s" created with %s-%s connections', 
               p_pool_name, p_min_connections, p_max_connections),
        p_created_by
    );
    
    -- Initialize pool statistics
    INSERT INTO sop_pool_statistics (
        pool_id, restaurant_id, period_start, period_end, 
        total_connections, pool_health_score
    ) VALUES (
        pool_id, p_restaurant_id, NOW(), NOW(),
        p_min_connections, 100
    );
    
    RETURN pool_id;
END;
$$;

-- Function to register active connection
CREATE OR REPLACE FUNCTION register_active_connection(
    p_pool_id UUID,
    p_connection_id TEXT,
    p_user_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_client_address INET DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    connection_uuid UUID;
    pool_record RECORD;
    current_connections INTEGER;
BEGIN
    -- Get pool details
    SELECT * INTO pool_record FROM sop_connection_pools WHERE id = p_pool_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pool not found: %', p_pool_id;
    END IF;
    
    -- Check if pool is at capacity
    SELECT COUNT(*) INTO current_connections
    FROM sop_active_connections
    WHERE pool_id = p_pool_id AND status IN ('active', 'idle');
    
    IF current_connections >= pool_record.max_connections THEN
        -- Log pool exhaustion event
        INSERT INTO sop_connection_events (
            pool_id, restaurant_id, event_type, event_severity, event_message, user_id
        ) VALUES (
            p_pool_id, pool_record.restaurant_id, 'pool_exhausted', 'warning',
            format('Pool "%s" has reached maximum capacity (%s connections)', 
                   pool_record.pool_name, pool_record.max_connections),
            p_user_id
        );
        
        RAISE EXCEPTION 'Connection pool exhausted. Maximum connections: %', pool_record.max_connections;
    END IF;
    
    -- Register connection
    INSERT INTO sop_active_connections (
        pool_id, restaurant_id, connection_id, session_id, user_id,
        client_address, status, backend_start
    ) VALUES (
        p_pool_id, pool_record.restaurant_id, p_connection_id, p_session_id, p_user_id,
        p_client_address, 'active', NOW()
    ) RETURNING id INTO connection_uuid;
    
    -- Log connection creation
    INSERT INTO sop_connection_events (
        pool_id, connection_id, restaurant_id, event_type, event_severity, 
        event_message, user_id, session_id
    ) VALUES (
        p_pool_id, connection_uuid, pool_record.restaurant_id, 'connection_created', 'info',
        format('New connection established in pool "%s"', pool_record.pool_name),
        p_user_id, p_session_id
    );
    
    RETURN connection_uuid;
END;
$$;

-- Function to update connection status
CREATE OR REPLACE FUNCTION update_connection_status(
    p_connection_uuid UUID,
    p_status connection_status,
    p_current_query TEXT DEFAULT NULL,
    p_query_duration_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    connection_record RECORD;
    pool_record RECORD;
BEGIN
    -- Get connection details
    SELECT ac.*, sp.slow_query_threshold_ms, sp.monitor_slow_queries
    INTO connection_record
    FROM sop_active_connections ac
    JOIN sop_connection_pools sp ON ac.pool_id = sp.id
    WHERE ac.id = p_connection_uuid;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update connection
    UPDATE sop_active_connections 
    SET 
        status = p_status,
        current_query = p_current_query,
        query_start = CASE WHEN p_status = 'active' THEN NOW() ELSE query_start END,
        state_change = NOW(),
        last_activity_at = NOW(),
        queries_executed = CASE WHEN p_query_duration_ms IS NOT NULL THEN queries_executed + 1 ELSE queries_executed END,
        last_query_at = CASE WHEN p_query_duration_ms IS NOT NULL THEN NOW() ELSE last_query_at END,
        avg_query_duration_ms = CASE 
            WHEN p_query_duration_ms IS NOT NULL THEN 
                ((avg_query_duration_ms * queries_executed) + p_query_duration_ms) / (queries_executed + 1)
            ELSE avg_query_duration_ms 
        END,
        longest_query_duration_ms = CASE 
            WHEN p_query_duration_ms IS NOT NULL AND p_query_duration_ms > longest_query_duration_ms THEN 
                p_query_duration_ms
            ELSE longest_query_duration_ms 
        END,
        updated_at = NOW()
    WHERE id = p_connection_uuid;
    
    -- Check for slow query and log if needed
    IF connection_record.monitor_slow_queries AND 
       p_query_duration_ms IS NOT NULL AND 
       p_query_duration_ms > connection_record.slow_query_threshold_ms THEN
        
        INSERT INTO sop_connection_events (
            pool_id, connection_id, restaurant_id, event_type, event_severity,
            event_message, event_details, user_id, session_id, duration_ms
        ) VALUES (
            connection_record.pool_id, p_connection_uuid, connection_record.restaurant_id,
            'slow_query', 'warning',
            format('Slow query detected: %sms', p_query_duration_ms),
            jsonb_build_object(
                'query', LEFT(p_current_query, 500),
                'duration_ms', p_query_duration_ms,
                'threshold_ms', connection_record.slow_query_threshold_ms
            ),
            connection_record.user_id, connection_record.session_id, p_query_duration_ms
        );
    END IF;
    
    RETURN true;
END;
$$;

-- Function to close connection
CREATE OR REPLACE FUNCTION close_connection(
    p_connection_uuid UUID,
    p_reason TEXT DEFAULT 'normal_close'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    connection_record RECORD;
    connection_lifetime INTEGER;
BEGIN
    -- Get connection details
    SELECT * INTO connection_record 
    FROM sop_active_connections 
    WHERE id = p_connection_uuid;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    connection_lifetime := EXTRACT(EPOCH FROM (NOW() - connection_record.backend_start))::INTEGER;
    
    -- Log connection closure
    INSERT INTO sop_connection_events (
        pool_id, connection_id, restaurant_id, event_type, event_severity,
        event_message, event_details, user_id, session_id, duration_ms
    ) VALUES (
        connection_record.pool_id, p_connection_uuid, connection_record.restaurant_id,
        'connection_closed', 'info',
        format('Connection closed: %s', p_reason),
        jsonb_build_object(
            'reason', p_reason,
            'lifetime_seconds', connection_lifetime,
            'queries_executed', connection_record.queries_executed,
            'avg_query_duration_ms', connection_record.avg_query_duration_ms
        ),
        connection_record.user_id, connection_record.session_id, connection_lifetime * 1000
    );
    
    -- Remove connection
    DELETE FROM sop_active_connections WHERE id = p_connection_uuid;
    
    RETURN true;
END;
$$;

-- Function to calculate pool statistics
CREATE OR REPLACE FUNCTION calculate_pool_statistics(
    p_pool_id UUID,
    p_period_start TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 hour',
    p_period_end TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats_id UUID;
    pool_record RECORD;
    current_active INTEGER;
    current_idle INTEGER;
    current_total INTEGER;
    utilization DECIMAL(5,2);
    health_score INTEGER;
BEGIN
    -- Get pool details
    SELECT * INTO pool_record FROM sop_connection_pools WHERE id = p_pool_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pool not found: %', p_pool_id;
    END IF;
    
    -- Calculate current connection counts
    SELECT 
        COUNT(*) FILTER (WHERE status = 'active'),
        COUNT(*) FILTER (WHERE status IN ('idle', 'idle_in_transaction')),
        COUNT(*)
    INTO current_active, current_idle, current_total
    FROM sop_active_connections
    WHERE pool_id = p_pool_id;
    
    -- Calculate utilization
    utilization := CASE 
        WHEN pool_record.max_connections > 0 THEN 
            (current_total::DECIMAL / pool_record.max_connections * 100)
        ELSE 0 
    END;
    
    -- Calculate health score
    health_score := GREATEST(0, LEAST(100,
        100 - 
        (CASE WHEN utilization > 90 THEN 30 ELSE 0 END) -
        (CASE WHEN current_total = 0 THEN 50 ELSE 0 END) -
        (SELECT COUNT(*) * 5 FROM sop_connection_events 
         WHERE pool_id = p_pool_id 
         AND event_severity IN ('error', 'critical') 
         AND created_at > p_period_start)
    ));
    
    -- Insert statistics
    INSERT INTO sop_pool_statistics (
        pool_id, restaurant_id, period_start, period_end,
        active_connections, idle_connections, total_connections,
        utilization_percentage, pool_health_score
    ) VALUES (
        p_pool_id, pool_record.restaurant_id, p_period_start, p_period_end,
        current_active, current_idle, current_total,
        utilization, health_score
    ) RETURNING id INTO stats_id;
    
    -- Update pool health status
    UPDATE sop_connection_pools 
    SET 
        status = CASE 
            WHEN health_score >= 90 THEN 'healthy'
            WHEN health_score >= 70 THEN 'warning'
            ELSE 'critical'
        END,
        last_health_check = NOW(),
        updated_at = NOW()
    WHERE id = p_pool_id;
    
    RETURN stats_id;
END;
$$;

-- Function to optimize pool configuration
CREATE OR REPLACE FUNCTION optimize_pool_configuration(p_pool_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pool_record RECORD;
    recent_stats RECORD;
    optimization_suggestions JSONB := '{}';
    recommended_min INTEGER;
    recommended_max INTEGER;
BEGIN
    -- Get pool details
    SELECT * INTO pool_record FROM sop_connection_pools WHERE id = p_pool_id;
    
    -- Get recent statistics
    SELECT 
        AVG(utilization_percentage) as avg_utilization,
        MAX(max_connections_used) as peak_connections,
        AVG(pool_health_score) as avg_health_score,
        COUNT(*) FILTER (WHERE utilization_percentage > 80) as high_util_periods
    INTO recent_stats
    FROM sop_pool_statistics
    WHERE pool_id = p_pool_id 
    AND recorded_at > NOW() - INTERVAL '7 days';
    
    -- Generate optimization recommendations
    IF recent_stats.avg_utilization > 80 THEN
        recommended_max := LEAST(pool_record.max_connections * 1.5, 500);
        optimization_suggestions := optimization_suggestions || 
            jsonb_build_object('max_connections', recommended_max, 'reason', 'High utilization detected');
    END IF;
    
    IF recent_stats.avg_utilization < 30 AND pool_record.max_connections > 20 THEN
        recommended_max := GREATEST(pool_record.max_connections * 0.8, 20);
        optimization_suggestions := optimization_suggestions || 
            jsonb_build_object('max_connections', recommended_max, 'reason', 'Low utilization - reduce overhead');
    END IF;
    
    IF recent_stats.peak_connections > 0 THEN
        recommended_min := LEAST(recent_stats.peak_connections * 0.6, pool_record.max_connections * 0.3);
        optimization_suggestions := optimization_suggestions || 
            jsonb_build_object('min_connections', recommended_min, 'reason', 'Optimize for typical load');
    END IF;
    
    -- Add auto-scaling recommendation
    IF recent_stats.high_util_periods > 5 AND NOT pool_record.auto_scaling THEN
        optimization_suggestions := optimization_suggestions || 
            jsonb_build_object('auto_scaling', true, 'reason', 'Frequent high utilization periods');
    END IF;
    
    RETURN jsonb_build_object(
        'current_config', to_jsonb(pool_record),
        'recent_stats', to_jsonb(recent_stats),
        'recommendations', optimization_suggestions,
        'analysis_date', NOW()
    );
END;
$$;

-- Function to get pool dashboard
CREATE OR REPLACE FUNCTION get_pool_dashboard(p_restaurant_id UUID)
RETURNS TABLE (
    pool_id UUID,
    pool_name VARCHAR(255),
    connection_type connection_type,
    status pool_status,
    current_connections INTEGER,
    max_connections INTEGER,
    utilization_percentage DECIMAL(5,2),
    health_score INTEGER,
    active_queries INTEGER,
    slow_queries_last_hour INTEGER,
    last_event_severity VARCHAR(20),
    recommendations JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH pool_current_state AS (
        SELECT 
            sp.id,
            sp.pool_name,
            sp.connection_type,
            sp.status,
            sp.max_connections,
            COUNT(sac.id) as current_conn_count,
            COUNT(sac.id) FILTER (WHERE sac.status = 'active') as active_conn_count,
            (COUNT(sac.id)::DECIMAL / sp.max_connections * 100) as util_pct
        FROM sop_connection_pools sp
        LEFT JOIN sop_active_connections sac ON sp.id = sac.pool_id
        WHERE sp.restaurant_id = p_restaurant_id
        GROUP BY sp.id, sp.pool_name, sp.connection_type, sp.status, sp.max_connections
    ),
    recent_events AS (
        SELECT 
            pool_id,
            COUNT(*) FILTER (WHERE event_type = 'slow_query' AND created_at > NOW() - INTERVAL '1 hour') as slow_queries,
            (array_agg(event_severity ORDER BY created_at DESC))[1] as last_severity
        FROM sop_connection_events
        WHERE restaurant_id = p_restaurant_id
        AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY pool_id
    ),
    latest_stats AS (
        SELECT DISTINCT ON (pool_id)
            pool_id,
            pool_health_score
        FROM sop_pool_statistics
        WHERE restaurant_id = p_restaurant_id
        ORDER BY pool_id, recorded_at DESC
    )
    SELECT 
        pcs.id,
        pcs.pool_name,
        pcs.connection_type,
        pcs.status,
        pcs.current_conn_count::INTEGER,
        pcs.max_connections,
        pcs.util_pct,
        COALESCE(ls.pool_health_score, 100)::INTEGER,
        pcs.active_conn_count::INTEGER,
        COALESCE(re.slow_queries, 0)::INTEGER,
        COALESCE(re.last_severity, 'info'),
        optimize_pool_configuration(pcs.id)->'recommendations'
    FROM pool_current_state pcs
    LEFT JOIN recent_events re ON pcs.id = re.pool_id
    LEFT JOIN latest_stats ls ON pcs.id = ls.pool_id;
END;
$$;

-- ===========================================
-- TRIGGERS FOR CONNECTION POOLING
-- ===========================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_connection_pools_updated_at 
    BEFORE UPDATE ON sop_connection_pools 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_connections_updated_at 
    BEFORE UPDATE ON sop_active_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on connection pooling tables
ALTER TABLE sop_connection_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_active_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_pool_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_connection_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Connection pools restaurant isolation"
ON sop_connection_pools FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Active connections restaurant isolation"
ON sop_active_connections FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Pool statistics restaurant isolation"
ON sop_pool_statistics FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Connection events restaurant isolation"
ON sop_connection_events FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION create_connection_pool TO authenticated;
GRANT EXECUTE ON FUNCTION register_active_connection TO authenticated;
GRANT EXECUTE ON FUNCTION update_connection_status TO authenticated;
GRANT EXECUTE ON FUNCTION close_connection TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pool_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_pool_configuration TO authenticated;
GRANT EXECUTE ON FUNCTION get_pool_dashboard TO authenticated;

-- ===========================================
-- DEFAULT CONNECTION POOLS
-- ===========================================

-- Create default connection pools for existing restaurants
INSERT INTO sop_connection_pools (
    restaurant_id, pool_name, connection_type, min_connections, max_connections,
    initial_connections, created_by
)
SELECT 
    r.id,
    'Default Read-Write Pool',
    'read_write',
    10, -- min
    100, -- max
    15, -- initial
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE NOT EXISTS (
    SELECT 1 FROM sop_connection_pools 
    WHERE restaurant_id = r.id
);

-- Create read-only pools for analytics
INSERT INTO sop_connection_pools (
    restaurant_id, pool_name, connection_type, min_connections, max_connections,
    initial_connections, created_by
)
SELECT 
    r.id,
    'Analytics Read-Only Pool',
    'analytics',
    5, -- min
    50, -- max
    10, -- initial
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE NOT EXISTS (
    SELECT 1 FROM sop_connection_pools 
    WHERE restaurant_id = r.id AND connection_type = 'analytics'
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

ANALYZE sop_connection_pools;
ANALYZE sop_active_connections;
ANALYZE sop_pool_statistics;
ANALYZE sop_connection_events;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_connection_pools IS 'Connection pool configuration with auto-scaling and load balancing';
COMMENT ON TABLE sop_active_connections IS 'Real-time tracking of active database connections with performance metrics';
COMMENT ON TABLE sop_pool_statistics IS 'Historical connection pool statistics for performance analysis';
COMMENT ON TABLE sop_connection_events IS 'Connection lifecycle events and alerts for monitoring';

COMMENT ON FUNCTION create_connection_pool IS 'Creates new connection pool with validation and logging';
COMMENT ON FUNCTION register_active_connection IS 'Registers new connection with pool capacity checking';
COMMENT ON FUNCTION update_connection_status IS 'Updates connection status with slow query detection';
COMMENT ON FUNCTION close_connection IS 'Closes connection with lifecycle logging and cleanup';
COMMENT ON FUNCTION calculate_pool_statistics IS 'Calculates pool performance statistics and health scores';
COMMENT ON FUNCTION optimize_pool_configuration IS 'Analyzes usage patterns and provides optimization recommendations';
COMMENT ON FUNCTION get_pool_dashboard IS 'Returns comprehensive pool status for monitoring dashboard';