-- SOP Data Synchronization for Offline Mode
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive offline synchronization with conflict resolution and intelligent sync

-- ===========================================
-- OFFLINE SYNCHRONIZATION ENUMS
-- ===========================================

-- Sync operation type enum
CREATE TYPE sync_operation AS ENUM (
    'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'BULK_SYNC'
);

-- Sync status enum
CREATE TYPE sync_status AS ENUM (
    'pending', 'syncing', 'completed', 'failed', 'conflict', 'skipped'
);

-- Conflict resolution strategy enum
CREATE TYPE conflict_resolution AS ENUM (
    'client_wins', 'server_wins', 'merge', 'manual_review', 'latest_timestamp'
);

-- Device status enum
CREATE TYPE device_status AS ENUM (
    'online', 'offline', 'syncing', 'maintenance', 'disabled'
);

-- Sync priority enum
CREATE TYPE sync_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ===========================================
-- OFFLINE SYNCHRONIZATION TABLES
-- ===========================================

-- Device registration and tracking
CREATE TABLE IF NOT EXISTS sop_sync_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Device identification
    device_id VARCHAR(255) NOT NULL UNIQUE, -- Unique device identifier
    device_name VARCHAR(255),
    device_type VARCHAR(100) DEFAULT 'tablet', -- 'tablet', 'mobile', 'desktop'
    device_os VARCHAR(100),
    device_version VARCHAR(100),
    app_version VARCHAR(100),
    
    -- User association
    primary_user_id UUID,
    assigned_users UUID[] DEFAULT '{}',
    
    -- Sync configuration
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_minutes INTEGER DEFAULT 15,
    full_sync_interval_hours INTEGER DEFAULT 24,
    
    -- Offline capabilities
    max_offline_hours INTEGER DEFAULT 72,
    offline_storage_limit_mb INTEGER DEFAULT 500,
    critical_sops_only BOOLEAN DEFAULT false,
    
    -- Status and monitoring
    status device_status DEFAULT 'offline',
    last_seen_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    last_full_sync_at TIMESTAMPTZ,
    
    -- Network and location
    ip_address INET,
    location_data JSONB DEFAULT '{}',
    network_type VARCHAR(50), -- 'wifi', 'cellular', 'ethernet'
    
    -- Storage statistics
    local_storage_used_mb INTEGER DEFAULT 0,
    local_records_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sync_device_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_device_primary_user FOREIGN KEY (primary_user_id) REFERENCES auth_users(id)
);

-- Sync queue for pending operations
CREATE TABLE IF NOT EXISTS sop_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Operation details
    operation_type sync_operation NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    
    -- Data payload
    operation_data JSONB NOT NULL, -- The actual data to sync
    metadata JSONB DEFAULT '{}',
    
    -- Sync management
    priority sync_priority DEFAULT 'medium',
    status sync_status DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    attempted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Conflict resolution
    server_version INTEGER,
    client_version INTEGER,
    conflict_detected BOOLEAN DEFAULT false,
    conflict_resolution_strategy conflict_resolution,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    CONSTRAINT fk_sync_queue_device FOREIGN KEY (device_id) REFERENCES sop_sync_devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_queue_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Sync conflicts tracking
CREATE TABLE IF NOT EXISTS sop_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_item_id UUID NOT NULL,
    device_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Conflict details
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    conflict_type VARCHAR(100) NOT NULL, -- 'update_conflict', 'delete_conflict', 'create_conflict'
    
    -- Conflicting data
    server_data JSONB NOT NULL,
    client_data JSONB NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL,
    client_timestamp TIMESTAMPTZ NOT NULL,
    
    -- Resolution
    resolution_strategy conflict_resolution,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_data JSONB,
    resolution_notes TEXT,
    
    -- Status
    is_resolved BOOLEAN DEFAULT false,
    requires_manual_review BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sync_conflict_queue FOREIGN KEY (queue_item_id) REFERENCES sop_sync_queue(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_conflict_device FOREIGN KEY (device_id) REFERENCES sop_sync_devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_conflict_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_conflict_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_users(id)
);

-- Offline data cache for devices
CREATE TABLE IF NOT EXISTS sop_offline_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Cached data identification
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    
    -- Cached content
    cached_data JSONB NOT NULL,
    data_hash TEXT NOT NULL, -- For integrity checking
    data_size_bytes INTEGER,
    
    -- Cache metadata
    cache_priority sync_priority DEFAULT 'medium',
    access_frequency INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    server_version INTEGER,
    is_dirty BOOLEAN DEFAULT false, -- Has local changes not synced
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    is_critical BOOLEAN DEFAULT false, -- Critical SOPs never expire
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_offline_cache_device FOREIGN KEY (device_id) REFERENCES sop_sync_devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_offline_cache_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_cache_entry UNIQUE (device_id, table_name, record_id)
);

-- Sync sessions tracking
CREATE TABLE IF NOT EXISTS sop_sync_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Session details
    session_type VARCHAR(50) NOT NULL, -- 'incremental', 'full', 'forced', 'manual'
    initiated_by VARCHAR(50) DEFAULT 'system', -- 'system', 'user', 'schedule'
    
    -- Session progress
    status sync_status DEFAULT 'pending',
    total_operations INTEGER DEFAULT 0,
    completed_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    
    -- Performance metrics
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    data_transferred_kb INTEGER DEFAULT 0,
    network_latency_ms INTEGER,
    
    -- Results
    sync_result JSONB DEFAULT '{}',
    error_summary TEXT,
    
    -- Next sync scheduling
    next_sync_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sync_session_device FOREIGN KEY (device_id) REFERENCES sop_sync_devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_session_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- ===========================================
-- SYNCHRONIZATION INDEXES
-- ===========================================

-- Sync devices indexes
CREATE INDEX idx_sync_devices_restaurant ON sop_sync_devices(restaurant_id);
CREATE INDEX idx_sync_devices_device_id ON sop_sync_devices(device_id);
CREATE INDEX idx_sync_devices_status ON sop_sync_devices(status);
CREATE INDEX idx_sync_devices_last_seen ON sop_sync_devices(last_seen_at);
CREATE INDEX idx_sync_devices_primary_user ON sop_sync_devices(primary_user_id);

-- Sync queue indexes
CREATE INDEX idx_sync_queue_device ON sop_sync_queue(device_id);
CREATE INDEX idx_sync_queue_status ON sop_sync_queue(status);
CREATE INDEX idx_sync_queue_priority ON sop_sync_queue(priority, created_at);
CREATE INDEX idx_sync_queue_scheduled ON sop_sync_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_sync_queue_table_record ON sop_sync_queue(table_name, record_id);
CREATE INDEX idx_sync_queue_restaurant ON sop_sync_queue(restaurant_id);

-- Sync conflicts indexes
CREATE INDEX idx_sync_conflicts_device ON sop_sync_conflicts(device_id);
CREATE INDEX idx_sync_conflicts_resolved ON sop_sync_conflicts(is_resolved);
CREATE INDEX idx_sync_conflicts_manual_review ON sop_sync_conflicts(requires_manual_review) WHERE requires_manual_review = true;
CREATE INDEX idx_sync_conflicts_table_record ON sop_sync_conflicts(table_name, record_id);

-- Offline cache indexes
CREATE INDEX idx_offline_cache_device ON sop_offline_cache(device_id);
CREATE INDEX idx_offline_cache_table_record ON sop_offline_cache(table_name, record_id);
CREATE INDEX idx_offline_cache_priority ON sop_offline_cache(cache_priority, last_accessed_at);
CREATE INDEX idx_offline_cache_dirty ON sop_offline_cache(is_dirty) WHERE is_dirty = true;
CREATE INDEX idx_offline_cache_expires ON sop_offline_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_offline_cache_critical ON sop_offline_cache(is_critical) WHERE is_critical = true;

-- Sync sessions indexes
CREATE INDEX idx_sync_sessions_device ON sop_sync_sessions(device_id);
CREATE INDEX idx_sync_sessions_status ON sop_sync_sessions(status);
CREATE INDEX idx_sync_sessions_started_at ON sop_sync_sessions(started_at);
CREATE INDEX idx_sync_sessions_type ON sop_sync_sessions(session_type);

-- ===========================================
-- SYNCHRONIZATION FUNCTIONS
-- ===========================================

-- Function to register a sync device
CREATE OR REPLACE FUNCTION register_sync_device(
    p_device_id VARCHAR(255),
    p_restaurant_id UUID,
    p_device_name VARCHAR(255),
    p_device_type VARCHAR(100) DEFAULT 'tablet',
    p_primary_user_id UUID DEFAULT NULL,
    p_device_os VARCHAR(100) DEFAULT NULL,
    p_app_version VARCHAR(100) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    device_uuid UUID;
BEGIN
    -- Insert or update device registration
    INSERT INTO sop_sync_devices (
        device_id, restaurant_id, device_name, device_type, primary_user_id,
        device_os, app_version, status, last_seen_at
    ) VALUES (
        p_device_id, p_restaurant_id, p_device_name, p_device_type, p_primary_user_id,
        p_device_os, p_app_version, 'online', NOW()
    )
    ON CONFLICT (device_id)
    DO UPDATE SET
        device_name = EXCLUDED.device_name,
        device_type = EXCLUDED.device_type,
        primary_user_id = EXCLUDED.primary_user_id,
        device_os = EXCLUDED.device_os,
        app_version = EXCLUDED.app_version,
        status = 'online',
        last_seen_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO device_uuid;
    
    -- Log device registration
    INSERT INTO audit_logs (
        restaurant_id, action, resource_type, resource_id, metadata
    ) VALUES (
        p_restaurant_id, 'REGISTER'::audit_action, 'sync_device', device_uuid,
        jsonb_build_object(
            'device_id', p_device_id,
            'device_name', p_device_name,
            'device_type', p_device_type,
            'registration_time', NOW()
        )
    );
    
    RETURN device_uuid;
END;
$$;

-- Function to queue sync operation
CREATE OR REPLACE FUNCTION queue_sync_operation(
    p_device_id UUID,
    p_operation_type sync_operation,
    p_table_name VARCHAR(255),
    p_record_id UUID,
    p_operation_data JSONB,
    p_priority sync_priority DEFAULT 'medium'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    queue_id UUID;
    restaurant_id_val UUID;
BEGIN
    -- Get restaurant ID for the device
    SELECT restaurant_id INTO restaurant_id_val 
    FROM sop_sync_devices 
    WHERE id = p_device_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Device not found: %', p_device_id;
    END IF;
    
    -- Insert sync operation into queue
    INSERT INTO sop_sync_queue (
        device_id, restaurant_id, operation_type, table_name, record_id,
        operation_data, priority, metadata
    ) VALUES (
        p_device_id, restaurant_id_val, p_operation_type, p_table_name, p_record_id,
        p_operation_data, p_priority,
        jsonb_build_object(
            'queued_at', NOW(),
            'data_size', LENGTH(p_operation_data::TEXT)
        )
    ) RETURNING id INTO queue_id;
    
    -- Update device last seen
    UPDATE sop_sync_devices 
    SET last_seen_at = NOW(), updated_at = NOW()
    WHERE id = p_device_id;
    
    RETURN queue_id;
END;
$$;

-- Function to process sync queue
CREATE OR REPLACE FUNCTION process_sync_queue(
    p_device_id UUID,
    p_batch_size INTEGER DEFAULT 50
)
RETURNS TABLE (
    queue_id UUID,
    operation_type sync_operation,
    table_name VARCHAR(255),
    record_id UUID,
    operation_data JSONB,
    status sync_status,
    conflict_detected BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    queue_record RECORD;
    conflict_exists BOOLEAN;
    current_data JSONB;
    process_result sync_status;
BEGIN
    -- Start sync session
    PERFORM start_sync_session(p_device_id, 'incremental', 'system');
    
    -- Process queue items in priority order
    FOR queue_record IN 
        SELECT * FROM sop_sync_queue
        WHERE device_id = p_device_id AND status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT p_batch_size
    LOOP
        conflict_exists := false;
        process_result := 'completed';
        
        BEGIN
            -- Update queue item status to syncing
            UPDATE sop_sync_queue 
            SET status = 'syncing', attempted_at = NOW()
            WHERE id = queue_record.id;
            
            -- Check for conflicts
            CASE queue_record.operation_type
                WHEN 'UPDATE' THEN
                    -- Check if server data has changed since client last sync
                    EXECUTE format('SELECT to_jsonb(t.*) FROM %I t WHERE id = $1', queue_record.table_name)
                    INTO current_data USING queue_record.record_id;
                    
                    IF current_data IS NOT NULL AND 
                       current_data->>'updated_at' > queue_record.operation_data->>'last_synced_at' THEN
                        conflict_exists := true;
                        PERFORM handle_sync_conflict(queue_record.id, current_data, queue_record.operation_data);
                        process_result := 'conflict';
                    END IF;
                
                WHEN 'DELETE' THEN
                    -- Check if record still exists and has been modified
                    EXECUTE format('SELECT COUNT(*) FROM %I WHERE id = $1', queue_record.table_name)
                    INTO conflict_exists USING queue_record.record_id;
                    
                    IF conflict_exists THEN
                        EXECUTE format('SELECT to_jsonb(t.*) FROM %I t WHERE id = $1', queue_record.table_name)
                        INTO current_data USING queue_record.record_id;
                        
                        PERFORM handle_sync_conflict(queue_record.id, current_data, queue_record.operation_data);
                        process_result := 'conflict';
                        conflict_exists := true;
                    END IF;
            END CASE;
            
            -- Apply operation if no conflicts
            IF NOT conflict_exists THEN
                CASE queue_record.operation_type
                    WHEN 'CREATE' THEN
                        EXECUTE format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, $1)', 
                                     queue_record.table_name, queue_record.table_name)
                        USING queue_record.operation_data;
                    
                    WHEN 'UPDATE' THEN
                        EXECUTE format('UPDATE %I SET %s WHERE id = $1', 
                                     queue_record.table_name,
                                     build_update_clause(queue_record.operation_data))
                        USING queue_record.record_id;
                    
                    WHEN 'DELETE' THEN
                        EXECUTE format('UPDATE %I SET is_active = false, updated_at = NOW() WHERE id = $1', 
                                     queue_record.table_name)
                        USING queue_record.record_id;
                END CASE;
                
                process_result := 'completed';
            END IF;
            
            -- Update queue item status
            UPDATE sop_sync_queue 
            SET 
                status = process_result,
                completed_at = CASE WHEN process_result = 'completed' THEN NOW() ELSE NULL END,
                conflict_detected = conflict_exists
            WHERE id = queue_record.id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Handle sync errors
            UPDATE sop_sync_queue 
            SET 
                status = 'failed',
                retry_count = retry_count + 1,
                error_message = SQLERRM,
                error_details = jsonb_build_object(
                    'error_code', SQLSTATE,
                    'error_message', SQLERRM,
                    'error_context', 'sync_processing'
                )
            WHERE id = queue_record.id;
            
            process_result := 'failed';
        END;
        
        -- Return processed item
        RETURN QUERY SELECT 
            queue_record.id, queue_record.operation_type, queue_record.table_name,
            queue_record.record_id, queue_record.operation_data, process_result, conflict_exists;
    END LOOP;
    
    -- Complete sync session
    PERFORM complete_sync_session(p_device_id);
END;
$$;

-- Function to handle sync conflicts
CREATE OR REPLACE FUNCTION handle_sync_conflict(
    p_queue_item_id UUID,
    p_server_data JSONB,
    p_client_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conflict_id UUID;
    queue_record RECORD;
BEGIN
    -- Get queue item details
    SELECT * INTO queue_record FROM sop_sync_queue WHERE id = p_queue_item_id;
    
    -- Create conflict record
    INSERT INTO sop_sync_conflicts (
        queue_item_id, device_id, restaurant_id, table_name, record_id,
        conflict_type, server_data, client_data, server_timestamp, client_timestamp,
        requires_manual_review
    ) VALUES (
        p_queue_item_id, queue_record.device_id, queue_record.restaurant_id,
        queue_record.table_name, queue_record.record_id,
        queue_record.operation_type::TEXT || '_conflict',
        p_server_data, p_client_data,
        (p_server_data->>'updated_at')::TIMESTAMPTZ,
        (p_client_data->>'updated_at')::TIMESTAMPTZ,
        true -- Require manual review by default
    ) RETURNING id INTO conflict_id;
    
    -- Try automatic resolution based on configured strategy
    PERFORM auto_resolve_conflict(conflict_id);
    
    RETURN conflict_id;
END;
$$;

-- Function for automatic conflict resolution
CREATE OR REPLACE FUNCTION auto_resolve_conflict(p_conflict_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conflict_record RECORD;
    device_record RECORD;
    resolution_strategy conflict_resolution;
    resolved BOOLEAN := false;
BEGIN
    -- Get conflict and device details
    SELECT c.*, d.* INTO conflict_record
    FROM sop_sync_conflicts c
    JOIN sop_sync_devices d ON c.device_id = d.id
    WHERE c.id = p_conflict_id AND c.is_resolved = false;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Determine resolution strategy (simplified logic)
    CASE 
        WHEN conflict_record.server_timestamp > conflict_record.client_timestamp THEN
            resolution_strategy := 'server_wins';
        WHEN conflict_record.client_timestamp > conflict_record.server_timestamp THEN
            resolution_strategy := 'client_wins';
        ELSE
            resolution_strategy := 'latest_timestamp';
    END CASE;
    
    -- Apply resolution
    CASE resolution_strategy
        WHEN 'server_wins' THEN
            -- Server data takes precedence
            UPDATE sop_sync_conflicts 
            SET 
                resolution_strategy = 'server_wins',
                resolution_data = server_data,
                is_resolved = true,
                resolved_at = NOW(),
                requires_manual_review = false
            WHERE id = p_conflict_id;
            resolved := true;
            
        WHEN 'client_wins' THEN
            -- Client data takes precedence
            UPDATE sop_sync_conflicts 
            SET 
                resolution_strategy = 'client_wins',
                resolution_data = client_data,
                is_resolved = true,
                resolved_at = NOW(),
                requires_manual_review = false
            WHERE id = p_conflict_id;
            resolved := true;
            
        ELSE
            -- Require manual review
            UPDATE sop_sync_conflicts 
            SET requires_manual_review = true
            WHERE id = p_conflict_id;
    END CASE;
    
    RETURN resolved;
END;
$$;

-- Function to update offline cache
CREATE OR REPLACE FUNCTION update_offline_cache(
    p_device_id UUID,
    p_table_name VARCHAR(255),
    p_record_id UUID,
    p_data JSONB,
    p_priority sync_priority DEFAULT 'medium',
    p_is_critical BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cache_id UUID;
    restaurant_id_val UUID;
    data_hash TEXT;
    data_size INTEGER;
BEGIN
    -- Get restaurant ID and calculate data metrics
    SELECT restaurant_id INTO restaurant_id_val 
    FROM sop_sync_devices 
    WHERE id = p_device_id;
    
    data_hash := md5(p_data::TEXT);
    data_size := LENGTH(p_data::TEXT);
    
    -- Insert or update cache entry
    INSERT INTO sop_offline_cache (
        device_id, restaurant_id, table_name, record_id, cache_key,
        cached_data, data_hash, data_size_bytes, cache_priority, is_critical,
        expires_at
    ) VALUES (
        p_device_id, restaurant_id_val, p_table_name, p_record_id,
        format('%s_%s', p_table_name, p_record_id),
        p_data, data_hash, data_size, p_priority, p_is_critical,
        CASE WHEN p_is_critical THEN NULL ELSE NOW() + INTERVAL '7 days' END
    )
    ON CONFLICT (device_id, table_name, record_id)
    DO UPDATE SET
        cached_data = EXCLUDED.cached_data,
        data_hash = EXCLUDED.data_hash,
        data_size_bytes = EXCLUDED.data_size_bytes,
        cache_priority = EXCLUDED.cache_priority,
        is_critical = EXCLUDED.is_critical,
        access_frequency = sop_offline_cache.access_frequency + 1,
        last_accessed_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO cache_id;
    
    -- Update device storage statistics
    UPDATE sop_sync_devices 
    SET 
        local_storage_used_mb = (
            SELECT COALESCE(SUM(data_size_bytes), 0) / 1024.0 / 1024.0
            FROM sop_offline_cache 
            WHERE device_id = p_device_id
        ),
        local_records_count = (
            SELECT COUNT(*) 
            FROM sop_offline_cache 
            WHERE device_id = p_device_id
        ),
        updated_at = NOW()
    WHERE id = p_device_id;
    
    RETURN cache_id;
END;
$$;

-- Function to start sync session
CREATE OR REPLACE FUNCTION start_sync_session(
    p_device_id UUID,
    p_session_type VARCHAR(50),
    p_initiated_by VARCHAR(50)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
    restaurant_id_val UUID;
    pending_ops INTEGER;
BEGIN
    SELECT restaurant_id INTO restaurant_id_val 
    FROM sop_sync_devices 
    WHERE id = p_device_id;
    
    -- Count pending operations
    SELECT COUNT(*) INTO pending_ops
    FROM sop_sync_queue
    WHERE device_id = p_device_id AND status = 'pending';
    
    -- Create sync session
    INSERT INTO sop_sync_sessions (
        device_id, restaurant_id, session_type, initiated_by,
        total_operations, status
    ) VALUES (
        p_device_id, restaurant_id_val, p_session_type, p_initiated_by,
        pending_ops, 'syncing'
    ) RETURNING id INTO session_id;
    
    -- Update device status
    UPDATE sop_sync_devices 
    SET status = 'syncing', last_sync_at = NOW(), updated_at = NOW()
    WHERE id = p_device_id;
    
    RETURN session_id;
END;
$$;

-- Function to complete sync session
CREATE OR REPLACE FUNCTION complete_sync_session(p_device_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    completed_ops INTEGER;
    failed_ops INTEGER;
    conflicts INTEGER;
BEGIN
    -- Get current session
    SELECT * INTO session_record
    FROM sop_sync_sessions
    WHERE device_id = p_device_id AND status = 'syncing'
    ORDER BY started_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Count operation results
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        COUNT(*) FILTER (WHERE status = 'conflict')
    INTO completed_ops, failed_ops, conflicts
    FROM sop_sync_queue
    WHERE device_id = p_device_id 
    AND attempted_at >= session_record.started_at;
    
    -- Update session
    UPDATE sop_sync_sessions 
    SET 
        status = 'completed',
        completed_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
        completed_operations = completed_ops,
        failed_operations = failed_ops,
        conflicts_detected = conflicts,
        sync_result = jsonb_build_object(
            'completed', completed_ops,
            'failed', failed_ops,
            'conflicts', conflicts,
            'success_rate', CASE WHEN session_record.total_operations > 0 
                              THEN (completed_ops::DECIMAL / session_record.total_operations * 100)
                              ELSE 100 END
        )
    WHERE id = session_record.id;
    
    -- Update device status and schedule next sync
    UPDATE sop_sync_devices 
    SET 
        status = 'online',
        last_sync_at = NOW(),
        updated_at = NOW()
    WHERE id = p_device_id;
    
    RETURN true;
END;
$$;

-- Helper function to build update clause from JSONB
CREATE OR REPLACE FUNCTION build_update_clause(p_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    key TEXT;
    clause TEXT := '';
BEGIN
    FOR key IN SELECT jsonb_object_keys(p_data) LOOP
        IF clause != '' THEN
            clause := clause || ', ';
        END IF;
        clause := clause || quote_ident(key) || ' = ' || quote_literal(p_data->>key);
    END LOOP;
    
    RETURN clause;
END;
$$;

-- ===========================================
-- TRIGGERS FOR SYNCHRONIZATION
-- ===========================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_sync_devices_updated_at 
    BEFORE UPDATE ON sop_sync_devices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offline_cache_updated_at 
    BEFORE UPDATE ON sop_offline_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on sync tables
ALTER TABLE sop_sync_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_offline_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_sync_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Sync devices restaurant isolation"
ON sop_sync_devices FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Sync queue restaurant isolation"
ON sop_sync_queue FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Sync conflicts restaurant isolation"
ON sop_sync_conflicts FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Offline cache restaurant isolation"
ON sop_offline_cache FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Sync sessions restaurant isolation"
ON sop_sync_sessions FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION register_sync_device TO authenticated;
GRANT EXECUTE ON FUNCTION queue_sync_operation TO authenticated;
GRANT EXECUTE ON FUNCTION process_sync_queue TO authenticated;
GRANT EXECUTE ON FUNCTION update_offline_cache TO authenticated;
GRANT EXECUTE ON FUNCTION start_sync_session TO authenticated;
GRANT EXECUTE ON FUNCTION complete_sync_session TO authenticated;

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

ANALYZE sop_sync_devices;
ANALYZE sop_sync_queue;
ANALYZE sop_sync_conflicts;
ANALYZE sop_offline_cache;
ANALYZE sop_sync_sessions;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_sync_devices IS 'Device registration and configuration for offline synchronization';
COMMENT ON TABLE sop_sync_queue IS 'Queue of pending synchronization operations with conflict detection';
COMMENT ON TABLE sop_sync_conflicts IS 'Conflict tracking and resolution for synchronization operations';
COMMENT ON TABLE sop_offline_cache IS 'Local data cache for offline device operations';
COMMENT ON TABLE sop_sync_sessions IS 'Synchronization session tracking with performance metrics';

COMMENT ON FUNCTION register_sync_device IS 'Registers or updates a device for offline synchronization';
COMMENT ON FUNCTION queue_sync_operation IS 'Queues a synchronization operation for processing';
COMMENT ON FUNCTION process_sync_queue IS 'Processes pending sync operations with conflict resolution';
COMMENT ON FUNCTION update_offline_cache IS 'Updates offline cache with data for device access';
COMMENT ON FUNCTION start_sync_session IS 'Initiates a synchronization session with metrics tracking';
COMMENT ON FUNCTION complete_sync_session IS 'Completes sync session with result summary';