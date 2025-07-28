-- Training Mobile Synchronization System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Mobile synchronization for offline training capability and data consistency

-- ===========================================
-- MOBILE SYNCHRONIZATION ENUMS
-- ===========================================

-- Synchronization status
CREATE TYPE sync_status AS ENUM (
    'pending', 'in_progress', 'completed', 'failed', 'conflict', 'cancelled'
);

-- Synchronization direction
CREATE TYPE sync_direction AS ENUM (
    'upload', 'download', 'bidirectional'
);

-- Device type
CREATE TYPE mobile_device_type AS ENUM (
    'tablet', 'smartphone', 'kiosk', 'desktop', 'embedded'
);

-- Connection type
CREATE TYPE connection_type AS ENUM (
    'wifi', 'cellular', 'ethernet', 'offline', 'unknown'
);

-- Conflict resolution strategy
CREATE TYPE conflict_resolution_strategy AS ENUM (
    'server_wins', 'client_wins', 'latest_timestamp', 'manual_review', 'merge'
);

-- Data priority levels
CREATE TYPE data_priority_level AS ENUM (
    'critical', 'high', 'medium', 'low', 'background'
);

-- ===========================================
-- MOBILE SYNCHRONIZATION TABLES
-- ===========================================

-- Mobile device registration and management
CREATE TABLE IF NOT EXISTS training_mobile_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Device identification
    device_id VARCHAR(128) NOT NULL UNIQUE,
    device_name VARCHAR(500) NOT NULL,
    device_type mobile_device_type NOT NULL,
    
    -- Device specifications
    os_name VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    hardware_info JSONB DEFAULT '{}',
    
    -- Device capabilities
    offline_storage_capacity_mb INTEGER DEFAULT 1024,
    max_concurrent_sessions INTEGER DEFAULT 1,
    supports_background_sync BOOLEAN DEFAULT true,
    supports_delta_sync BOOLEAN DEFAULT true,
    
    -- User and location context
    primary_user_id UUID,
    restaurant_id UUID NOT NULL,
    location_context VARCHAR(200), -- 'kitchen', 'front_desk', 'office'
    
    -- Network and connectivity
    last_ip_address INET,
    last_connection_type connection_type DEFAULT 'unknown',
    network_quality_score INTEGER DEFAULT 50, -- 0-100 scale
    
    -- Registration and security
    registration_token VARCHAR(256),
    device_fingerprint TEXT,
    encryption_key_hash VARCHAR(128),
    trusted_device BOOLEAN DEFAULT false,
    
    -- Status and health
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    health_status VARCHAR(50) DEFAULT 'healthy',
    
    -- Synchronization preferences
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_minutes INTEGER DEFAULT 30,
    sync_only_on_wifi BOOLEAN DEFAULT false,
    background_sync_enabled BOOLEAN DEFAULT true,
    
    -- Data management
    offline_data_retention_days INTEGER DEFAULT 30,
    cache_size_limit_mb INTEGER DEFAULT 500,
    priority_content_types TEXT[] DEFAULT '{"training_modules","assessments"}',
    
    -- Monitoring and analytics
    total_sync_operations INTEGER DEFAULT 0,
    successful_sync_operations INTEGER DEFAULT 0,
    failed_sync_operations INTEGER DEFAULT 0,
    last_error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_mobile_devices_primary_user FOREIGN KEY (primary_user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_mobile_devices_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT valid_network_quality_score CHECK (network_quality_score >= 0 AND network_quality_score <= 100)
);

-- Synchronization sessions
CREATE TABLE IF NOT EXISTS training_sync_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session identification
    sync_session_id VARCHAR(128) NOT NULL UNIQUE,
    device_id UUID NOT NULL,
    user_id UUID,
    
    -- Session configuration
    sync_direction sync_direction NOT NULL,
    sync_type VARCHAR(50) DEFAULT 'full', -- 'full', 'incremental', 'delta'
    priority_level data_priority_level DEFAULT 'medium',
    
    -- Data scope
    content_types TEXT[] DEFAULT '{}',
    data_filters JSONB DEFAULT '{}',
    last_sync_timestamp TIMESTAMPTZ,
    sync_window_start TIMESTAMPTZ,
    sync_window_end TIMESTAMPTZ,
    
    -- Session execution
    status sync_status DEFAULT 'pending',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Progress tracking
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    skipped_items INTEGER DEFAULT 0,
    
    -- Data transfer metrics
    data_uploaded_bytes BIGINT DEFAULT 0,
    data_downloaded_bytes BIGINT DEFAULT 0,
    compression_ratio DECIMAL(5,2) DEFAULT 1.0,
    transfer_speed_kbps DECIMAL(10,2) DEFAULT 0,
    
    -- Conflict handling
    conflicts_detected INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    conflicts_pending INTEGER DEFAULT 0,
    conflict_resolution_strategy conflict_resolution_strategy DEFAULT 'server_wins',
    
    -- Error handling and retry
    error_count INTEGER DEFAULT 0,
    last_error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Network and performance
    connection_type connection_type DEFAULT 'unknown',
    network_latency_ms INTEGER,
    connection_stability_score INTEGER DEFAULT 50,
    
    -- Session metadata
    session_metadata JSONB DEFAULT '{}',
    client_request_hash VARCHAR(128),
    server_response_hash VARCHAR(128),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sync_sessions_device FOREIGN KEY (device_id) REFERENCES training_mobile_devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_sessions_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT valid_connection_stability CHECK (connection_stability_score >= 0 AND connection_stability_score <= 100)
);

-- Offline training content cache
CREATE TABLE IF NOT EXISTS training_offline_content_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cache identification
    cache_entry_id VARCHAR(128) NOT NULL UNIQUE,
    device_id UUID NOT NULL,
    
    -- Content identification
    content_type VARCHAR(100) NOT NULL, -- 'training_module', 'assessment', 'certificate'
    content_id UUID NOT NULL,
    content_version VARCHAR(50) DEFAULT '1.0',
    
    -- Content metadata
    content_title VARCHAR(500),
    content_description TEXT,
    content_language VARCHAR(10) DEFAULT 'en',
    
    -- Cache data
    cached_data JSONB NOT NULL,
    cached_data_hash VARCHAR(128) NOT NULL,
    compressed_data BYTEA,
    compression_algorithm VARCHAR(50),
    
    -- Cache management
    cache_priority data_priority_level DEFAULT 'medium',
    access_frequency INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    cache_size_bytes INTEGER NOT NULL,
    
    -- Synchronization tracking
    last_server_modified_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    sync_required BOOLEAN DEFAULT false,
    
    -- Offline capabilities
    supports_offline_access BOOLEAN DEFAULT true,
    requires_network_validation BOOLEAN DEFAULT false,
    offline_expiry_at TIMESTAMPTZ,
    
    -- Data integrity
    integrity_checksum VARCHAR(128),
    encryption_enabled BOOLEAN DEFAULT false,
    validation_required BOOLEAN DEFAULT false,
    
    -- Usage analytics
    offline_access_count INTEGER DEFAULT 0,
    total_access_count INTEGER DEFAULT 0,
    average_session_duration_seconds DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_offline_cache_device FOREIGN KEY (device_id) REFERENCES training_mobile_devices(id) ON DELETE CASCADE,
    CONSTRAINT unique_device_content_cache UNIQUE (device_id, content_type, content_id)
);

-- Synchronization conflict resolution
CREATE TABLE IF NOT EXISTS training_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Conflict identification
    conflict_id VARCHAR(128) NOT NULL UNIQUE,
    sync_session_id UUID NOT NULL,
    device_id UUID NOT NULL,
    
    -- Conflict context
    content_type VARCHAR(100) NOT NULL,
    content_id UUID NOT NULL,
    field_name VARCHAR(200),
    
    -- Conflict data
    server_value JSONB,
    client_value JSONB,
    server_timestamp TIMESTAMPTZ,
    client_timestamp TIMESTAMPTZ,
    
    -- Conflict metadata
    conflict_type VARCHAR(100) NOT NULL, -- 'update_update', 'update_delete', 'create_create'
    conflict_severity VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    conflict_description TEXT,
    
    -- Resolution
    resolution_strategy conflict_resolution_strategy DEFAULT 'manual_review',
    resolved BOOLEAN DEFAULT false,
    resolution_value JSONB,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Business impact
    user_impact_level VARCHAR(50) DEFAULT 'low',
    data_consistency_risk VARCHAR(50) DEFAULT 'low',
    requires_user_notification BOOLEAN DEFAULT false,
    
    -- Audit and tracking
    automatic_resolution_attempted BOOLEAN DEFAULT false,
    manual_review_required BOOLEAN DEFAULT true,
    escalation_required BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sync_conflicts_session FOREIGN KEY (sync_session_id) REFERENCES training_sync_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_conflicts_device FOREIGN KEY (device_id) REFERENCES training_mobile_devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_sync_conflicts_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_users(id)
);

-- Offline training progress tracking
CREATE TABLE IF NOT EXISTS training_offline_progress_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Progress identification
    progress_log_id VARCHAR(128) NOT NULL UNIQUE,
    device_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Training context
    training_module_id UUID,
    training_section_id UUID,
    assessment_id UUID,
    
    -- Progress data
    progress_type VARCHAR(100) NOT NULL, -- 'section_view', 'assessment_answer', 'module_complete'
    progress_data JSONB NOT NULL,
    progress_timestamp TIMESTAMPTZ NOT NULL,
    
    -- Offline context
    offline_session_id VARCHAR(128),
    network_available BOOLEAN DEFAULT false,
    device_time_zone VARCHAR(50),
    
    -- Data integrity
    data_hash VARCHAR(128) NOT NULL,
    client_generated_id VARCHAR(128) UNIQUE,
    requires_server_validation BOOLEAN DEFAULT false,
    
    -- Synchronization status
    synced_to_server BOOLEAN DEFAULT false,
    sync_session_id UUID,
    sync_timestamp TIMESTAMPTZ,
    sync_conflicts BOOLEAN DEFAULT false,
    
    -- Progress validation
    validated BOOLEAN DEFAULT false,
    validation_errors TEXT[] DEFAULT '{}',
    business_rule_violations TEXT[] DEFAULT '{}',
    
    -- Retry and error handling
    sync_attempts INTEGER DEFAULT 0,
    last_sync_error TEXT,
    permanent_failure BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_offline_progress_device FOREIGN KEY (device_id) REFERENCES training_mobile_devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_offline_progress_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_offline_progress_module FOREIGN KEY (training_module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_offline_progress_section FOREIGN KEY (training_section_id) REFERENCES training_sections(id),
    CONSTRAINT fk_offline_progress_assessment FOREIGN KEY (assessment_id) REFERENCES training_assessments(id),
    CONSTRAINT fk_offline_progress_sync_session FOREIGN KEY (sync_session_id) REFERENCES training_sync_sessions(id)
);

-- Mobile synchronization analytics
CREATE TABLE IF NOT EXISTS training_mobile_sync_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Analytics identification
    analytics_id VARCHAR(128) NOT NULL UNIQUE,
    
    -- Time period
    analysis_date DATE NOT NULL,
    analysis_hour INTEGER, -- 0-23 for hourly analysis
    restaurant_id UUID,
    
    -- Device metrics
    active_devices INTEGER DEFAULT 0,
    new_device_registrations INTEGER DEFAULT 0,
    device_health_issues INTEGER DEFAULT 0,
    
    -- Synchronization metrics
    total_sync_sessions INTEGER DEFAULT 0,
    successful_sync_sessions INTEGER DEFAULT 0,
    failed_sync_sessions INTEGER DEFAULT 0,
    average_sync_duration_seconds DECIMAL(10,2) DEFAULT 0,
    
    -- Data transfer metrics
    total_data_uploaded_mb DECIMAL(15,2) DEFAULT 0,
    total_data_downloaded_mb DECIMAL(15,2) DEFAULT 0,
    average_transfer_speed_kbps DECIMAL(10,2) DEFAULT 0,
    
    -- Offline usage metrics
    offline_training_sessions INTEGER DEFAULT 0,
    offline_progress_entries INTEGER DEFAULT 0,
    cache_hit_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Conflict and error metrics
    total_conflicts INTEGER DEFAULT 0,
    resolved_conflicts INTEGER DEFAULT 0,
    automatic_resolutions INTEGER DEFAULT 0,
    manual_resolutions INTEGER DEFAULT 0,
    
    -- Performance indicators
    sync_success_rate DECIMAL(5,2) DEFAULT 0,
    user_satisfaction_score DECIMAL(5,2) DEFAULT 0,
    system_reliability_score DECIMAL(5,2) DEFAULT 0,
    
    -- Network analysis
    wifi_usage_percentage DECIMAL(5,2) DEFAULT 0,
    cellular_usage_percentage DECIMAL(5,2) DEFAULT 0,
    network_quality_distribution JSONB DEFAULT '{}',
    
    -- Content analysis
    most_cached_content_types TEXT[] DEFAULT '{}',
    content_access_patterns JSONB DEFAULT '{}',
    cache_efficiency_score DECIMAL(5,2) DEFAULT 0,
    
    -- Predictive metrics
    predicted_sync_load DECIMAL(10,2) DEFAULT 0,
    capacity_utilization_percentage DECIMAL(5,2) DEFAULT 0,
    performance_trend_direction VARCHAR(20) DEFAULT 'stable',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_mobile_sync_analytics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_analytics_period UNIQUE (analysis_date, analysis_hour, restaurant_id),
    CONSTRAINT valid_hour CHECK (analysis_hour IS NULL OR (analysis_hour >= 0 AND analysis_hour <= 23))
);

-- ===========================================
-- MOBILE SYNCHRONIZATION INDEXES
-- ===========================================

-- Mobile devices indexes
CREATE UNIQUE INDEX idx_mobile_devices_device_id ON training_mobile_devices(device_id);
CREATE INDEX idx_mobile_devices_restaurant ON training_mobile_devices(restaurant_id);
CREATE INDEX idx_mobile_devices_primary_user ON training_mobile_devices(primary_user_id);
CREATE INDEX idx_mobile_devices_device_type ON training_mobile_devices(device_type);
CREATE INDEX idx_mobile_devices_active ON training_mobile_devices(is_active) WHERE is_active = true;
CREATE INDEX idx_mobile_devices_last_seen ON training_mobile_devices(last_seen_at);
CREATE INDEX idx_mobile_devices_health_status ON training_mobile_devices(health_status);

-- Sync sessions indexes
CREATE UNIQUE INDEX idx_sync_sessions_sync_session_id ON training_sync_sessions(sync_session_id);
CREATE INDEX idx_sync_sessions_device ON training_sync_sessions(device_id);
CREATE INDEX idx_sync_sessions_user ON training_sync_sessions(user_id);
CREATE INDEX idx_sync_sessions_status ON training_sync_sessions(status);
CREATE INDEX idx_sync_sessions_direction ON training_sync_sessions(sync_direction);
CREATE INDEX idx_sync_sessions_started_at ON training_sync_sessions(started_at);
CREATE INDEX idx_sync_sessions_priority ON training_sync_sessions(priority_level);

-- Offline content cache indexes
CREATE UNIQUE INDEX idx_offline_cache_cache_entry_id ON training_offline_content_cache(cache_entry_id);
CREATE INDEX idx_offline_cache_device ON training_offline_content_cache(device_id);
CREATE INDEX idx_offline_cache_content ON training_offline_content_cache(content_type, content_id);
CREATE INDEX idx_offline_cache_priority ON training_offline_content_cache(cache_priority);
CREATE INDEX idx_offline_cache_sync_required ON training_offline_content_cache(sync_required) WHERE sync_required = true;
CREATE INDEX idx_offline_cache_last_accessed ON training_offline_content_cache(last_accessed_at);
CREATE INDEX idx_offline_cache_expiry ON training_offline_content_cache(offline_expiry_at);

-- Sync conflicts indexes
CREATE UNIQUE INDEX idx_sync_conflicts_conflict_id ON training_sync_conflicts(conflict_id);
CREATE INDEX idx_sync_conflicts_session ON training_sync_conflicts(sync_session_id);
CREATE INDEX idx_sync_conflicts_device ON training_sync_conflicts(device_id);
CREATE INDEX idx_sync_conflicts_content ON training_sync_conflicts(content_type, content_id);
CREATE INDEX idx_sync_conflicts_resolved ON training_sync_conflicts(resolved);
CREATE INDEX idx_sync_conflicts_severity ON training_sync_conflicts(conflict_severity);
CREATE INDEX idx_sync_conflicts_manual_review ON training_sync_conflicts(manual_review_required) WHERE manual_review_required = true;

-- Offline progress log indexes
CREATE UNIQUE INDEX idx_offline_progress_progress_log_id ON training_offline_progress_log(progress_log_id);
CREATE INDEX idx_offline_progress_device ON training_offline_progress_log(device_id);
CREATE INDEX idx_offline_progress_user ON training_offline_progress_log(user_id);
CREATE INDEX idx_offline_progress_module ON training_offline_progress_log(training_module_id);
CREATE index idx_offline_progress_synced ON training_offline_progress_log(synced_to_server);
CREATE INDEX idx_offline_progress_timestamp ON training_offline_progress_log(progress_timestamp);
CREATE INDEX idx_offline_progress_client_id ON training_offline_progress_log(client_generated_id);

-- Mobile sync analytics indexes
CREATE UNIQUE INDEX idx_mobile_sync_analytics_analytics_id ON training_mobile_sync_analytics(analytics_id);
CREATE INDEX idx_mobile_sync_analytics_restaurant ON training_mobile_sync_analytics(restaurant_id);

-- JSONB indexes for complex queries
CREATE INDEX idx_mobile_devices_hardware_info ON training_mobile_devices USING GIN(hardware_info);
CREATE INDEX idx_sync_sessions_data_filters ON training_sync_sessions USING GIN(data_filters);
CREATE INDEX idx_sync_sessions_session_metadata ON training_sync_sessions USING GIN(session_metadata);
CREATE INDEX idx_offline_cache_cached_data ON training_offline_content_cache USING GIN(cached_data);
CREATE INDEX idx_offline_progress_progress_data ON training_offline_progress_log USING GIN(progress_data);
CREATE INDEX idx_mobile_sync_analytics_content_patterns ON training_mobile_sync_analytics USING GIN(content_access_patterns);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on mobile sync tables
ALTER TABLE training_mobile_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_offline_content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_offline_progress_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_mobile_sync_analytics ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Mobile devices restaurant isolation"
ON training_mobile_devices FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Mobile sync analytics restaurant isolation"
ON training_mobile_sync_analytics FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- Device ownership policies
CREATE POLICY "Sync sessions device ownership"
ON training_sync_sessions FOR ALL TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM training_mobile_devices tmd
        WHERE tmd.id = training_sync_sessions.device_id
        AND (tmd.primary_user_id = auth.uid() OR 
             tmd.restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()))
    )
);

CREATE POLICY "Offline cache device access"
ON training_offline_content_cache FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM training_mobile_devices tmd
        WHERE tmd.id = training_offline_content_cache.device_id
        AND (tmd.primary_user_id = auth.uid() OR 
             tmd.restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()))
    )
);

CREATE POLICY "Offline progress user access"
ON training_offline_progress_log FOR ALL TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = training_offline_progress_log.user_id)
    )
);

-- Manager access for conflicts
CREATE POLICY "Sync conflicts manager access"
ON training_sync_conflicts FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    ) OR
    EXISTS (
        SELECT 1 FROM training_mobile_devices tmd
        WHERE tmd.id = training_sync_conflicts.device_id
        AND tmd.primary_user_id = auth.uid()
    )
);

-- ===========================================
-- MOBILE SYNCHRONIZATION FUNCTIONS
-- ===========================================

-- Function to register mobile device
CREATE OR REPLACE FUNCTION register_mobile_device(
    p_device_id VARCHAR(128),
    p_device_name VARCHAR(500),
    p_device_type mobile_device_type,
    p_user_id UUID,
    p_device_info JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    device_uuid UUID;
    user_restaurant_id UUID;
    registration_token_text TEXT;
BEGIN
    -- Get user's restaurant
    SELECT restaurant_id INTO user_restaurant_id
    FROM auth_users WHERE id = p_user_id;
    
    -- Generate registration token
    registration_token_text := encode(
        sha256((p_device_id || p_user_id::text || NOW()::text)::bytea), 
        'hex'
    );
    
    -- Insert or update device registration
    INSERT INTO training_mobile_devices (
        device_id,
        device_name,
        device_type,
        primary_user_id,
        restaurant_id,
        registration_token,
        device_fingerprint,
        hardware_info,
        os_name,
        os_version,
        app_version,
        is_active,
        last_seen_at
    ) VALUES (
        p_device_id,
        p_device_name,
        p_device_type,
        p_user_id,
        user_restaurant_id,
        registration_token_text,
        encode(sha256((p_device_info::text)::bytea), 'hex'),
        p_device_info,
        COALESCE(p_device_info->>'os_name', 'Unknown'),
        COALESCE(p_device_info->>'os_version', '1.0'),
        COALESCE(p_device_info->>'app_version', '1.0'),
        true,
        NOW()
    )
    ON CONFLICT (device_id) DO UPDATE SET
        device_name = EXCLUDED.device_name,
        primary_user_id = EXCLUDED.primary_user_id,
        hardware_info = EXCLUDED.hardware_info,
        os_name = EXCLUDED.os_name,
        os_version = EXCLUDED.os_version,
        app_version = EXCLUDED.app_version,
        is_active = true,
        last_seen_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO device_uuid;
    
    RETURN device_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create synchronization session
CREATE OR REPLACE FUNCTION create_sync_session(
    p_device_id UUID,
    p_user_id UUID,
    p_sync_direction sync_direction,
    p_content_types TEXT[] DEFAULT NULL,
    p_last_sync_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_uuid UUID;
    session_id_text TEXT;
    device_info RECORD;
BEGIN
    -- Get device information
    SELECT * INTO device_info
    FROM training_mobile_devices
    WHERE id = p_device_id AND is_active = true;
    
    IF device_info.id IS NULL THEN
        RAISE EXCEPTION 'Device not found or inactive: %', p_device_id;
    END IF;
    
    -- Generate session ID
    session_id_text := 'sync_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
                      encode(gen_random_bytes(8), 'hex');
    
    -- Default content types if not specified
    IF p_content_types IS NULL THEN
        p_content_types := device_info.priority_content_types;
    END IF;
    
    -- Create sync session
    INSERT INTO training_sync_sessions (
        sync_session_id,
        device_id,
        user_id,
        sync_direction,
        content_types,
        last_sync_timestamp,
        sync_window_start,
        sync_window_end,
        status,
        connection_type,
        session_metadata
    ) VALUES (
        session_id_text,
        p_device_id,
        p_user_id,
        p_sync_direction,
        p_content_types,
        p_last_sync_timestamp,
        NOW(),
        NOW() + INTERVAL '1 hour', -- Default 1-hour sync window
        'pending',
        'unknown', -- Will be updated during sync
        jsonb_build_object(
            'device_name', device_info.device_name,
            'device_type', device_info.device_type,
            'app_version', device_info.app_version,
            'sync_requested_at', NOW()
        )
    ) RETURNING id INTO session_uuid;
    
    -- Update device last sync attempt
    UPDATE training_mobile_devices
    SET 
        last_seen_at = NOW(),
        total_sync_operations = total_sync_operations + 1,
        updated_at = NOW()
    WHERE id = p_device_id;
    
    RETURN session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cache training content for offline use
CREATE OR REPLACE FUNCTION cache_training_content_for_offline(
    p_device_id UUID,
    p_content_type VARCHAR(100),
    p_content_id UUID,
    p_content_data JSONB,
    p_priority data_priority_level DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    cache_uuid UUID;
    cache_entry_id_text TEXT;
    content_hash TEXT;
    data_size INTEGER;
    device_info RECORD;
BEGIN
    -- Get device information
    SELECT * INTO device_info
    FROM training_mobile_devices
    WHERE id = p_device_id;
    
    -- Calculate content hash and size
    content_hash := encode(sha256(p_content_data::text::bytea), 'hex');
    data_size := length(p_content_data::text);
    
    -- Check device storage capacity
    IF data_size > (device_info.offline_storage_capacity_mb * 1024 * 1024) THEN
        RAISE EXCEPTION 'Content size exceeds device storage capacity';
    END IF;
    
    -- Generate cache entry ID
    cache_entry_id_text := 'cache_' || p_device_id || '_' || p_content_type || '_' || p_content_id;
    
    -- Insert or update cache entry
    INSERT INTO training_offline_content_cache (
        cache_entry_id,
        device_id,
        content_type,
        content_id,
        cached_data,
        cached_data_hash,
        cache_priority,
        cache_size_bytes,
        last_server_modified_at,
        last_synced_at,
        supports_offline_access,
        integrity_checksum
    ) VALUES (
        cache_entry_id_text,
        p_device_id,
        p_content_type,
        p_content_id,
        p_content_data,
        content_hash,
        p_priority,
        data_size,
        NOW(),
        NOW(),
        true,
        content_hash
    )
    ON CONFLICT (device_id, content_type, content_id) DO UPDATE SET
        cached_data = EXCLUDED.cached_data,
        cached_data_hash = EXCLUDED.cached_data_hash,
        cache_priority = EXCLUDED.cache_priority,
        cache_size_bytes = EXCLUDED.cache_size_bytes,
        last_server_modified_at = EXCLUDED.last_server_modified_at,
        last_synced_at = EXCLUDED.last_synced_at,
        sync_required = false,
        updated_at = NOW()
    RETURNING id INTO cache_uuid;
    
    RETURN cache_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log offline training progress
CREATE OR REPLACE FUNCTION log_offline_training_progress(
    p_device_id UUID,
    p_user_id UUID,
    p_progress_type VARCHAR(100),
    p_progress_data JSONB,
    p_progress_timestamp TIMESTAMPTZ DEFAULT NOW(),
    p_offline_session_id VARCHAR(128) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    progress_uuid UUID;
    progress_log_id_text TEXT;
    client_id_text TEXT;
    data_hash TEXT;
BEGIN
    -- Generate unique identifiers
    progress_log_id_text := 'progress_' || EXTRACT(EPOCH FROM p_progress_timestamp)::BIGINT || '_' || 
                           encode(gen_random_bytes(8), 'hex');
    client_id_text := 'client_' || p_device_id || '_' || EXTRACT(EPOCH FROM p_progress_timestamp)::BIGINT;
    
    -- Calculate data hash
    data_hash := encode(sha256((p_progress_data::text || p_progress_timestamp::text)::bytea), 'hex');
    
    -- Insert progress log entry
    INSERT INTO training_offline_progress_log (
        progress_log_id,
        device_id,
        user_id,
        training_module_id,
        training_section_id,
        assessment_id,
        progress_type,
        progress_data,
        progress_timestamp,
        offline_session_id,
        network_available,
        data_hash,
        client_generated_id,
        synced_to_server
    ) VALUES (
        progress_log_id_text,
        p_device_id,
        p_user_id,
        (p_progress_data->>'module_id')::UUID,
        (p_progress_data->>'section_id')::UUID,
        (p_progress_data->>'assessment_id')::UUID,
        p_progress_type,
        p_progress_data,
        p_progress_timestamp,
        p_offline_session_id,
        false, -- Assuming offline when logging
        data_hash,
        client_id_text,
        false -- Will be synced later
    ) RETURNING id INTO progress_uuid;
    
    RETURN progress_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync offline progress to server
CREATE OR REPLACE FUNCTION sync_offline_progress_to_server(
    p_sync_session_id UUID
)
RETURNS JSONB AS $$
DECLARE
    sync_session RECORD;
    progress_record RECORD;
    sync_results JSONB := '{"synced": 0, "conflicts": 0, "errors": 0}';
    synced_count INTEGER := 0;
    conflict_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Get sync session details
    SELECT * INTO sync_session
    FROM training_sync_sessions
    WHERE id = p_sync_session_id;
    
    -- Process unsynced progress logs for this device
    FOR progress_record IN
        SELECT * FROM training_offline_progress_log
        WHERE device_id = sync_session.device_id
        AND synced_to_server = false
        AND permanent_failure = false
        ORDER BY progress_timestamp
    LOOP
        BEGIN
            -- Apply progress to main training tables based on progress type
            CASE progress_record.progress_type
                WHEN 'section_view' THEN
                    -- Update section progress
                    INSERT INTO user_section_progress (
                        user_id,
                        section_id,
                        progress_id,
                        time_spent_minutes,
                        completed_at
                    ) VALUES (
                        progress_record.user_id,
                        progress_record.training_section_id,
                        (SELECT id FROM user_training_progress 
                         WHERE user_id = progress_record.user_id 
                         AND module_id = progress_record.training_module_id 
                         ORDER BY created_at DESC LIMIT 1),
                        COALESCE((progress_record.progress_data->>'time_spent_minutes')::INTEGER, 0),
                        progress_record.progress_timestamp
                    ) ON CONFLICT DO NOTHING;
                    
                WHEN 'assessment_answer' THEN
                    -- Record assessment response
                    INSERT INTO training_question_responses (
                        assessment_id,
                        question_id,
                        user_answer,
                        is_correct,
                        answered_at
                    ) VALUES (
                        progress_record.assessment_id,
                        (progress_record.progress_data->>'question_id')::UUID,
                        progress_record.progress_data->>'answer',
                        COALESCE((progress_record.progress_data->>'is_correct')::BOOLEAN, false),
                        progress_record.progress_timestamp
                    ) ON CONFLICT DO NOTHING;
                    
                WHEN 'module_complete' THEN
                    -- Update training progress
                    UPDATE user_training_progress
                    SET 
                        status = 'completed',
                        progress_percentage = 100,
                        completed_at = progress_record.progress_timestamp,
                        time_spent_minutes = COALESCE((progress_record.progress_data->>'total_time_minutes')::INTEGER, 0)
                    WHERE user_id = progress_record.user_id
                    AND module_id = progress_record.training_module_id;
            END CASE;
            
            -- Mark as synced
            UPDATE training_offline_progress_log
            SET 
                synced_to_server = true,
                sync_session_id = p_sync_session_id,
                sync_timestamp = NOW(),
                validated = true
            WHERE id = progress_record.id;
            
            synced_count := synced_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Handle sync errors
                UPDATE training_offline_progress_log
                SET 
                    sync_attempts = sync_attempts + 1,
                    last_sync_error = SQLERRM,
                    permanent_failure = (sync_attempts >= 3)
                WHERE id = progress_record.id;
                
                error_count := error_count + 1;
        END;
    END LOOP;
    
    -- Update sync results
    sync_results := jsonb_build_object(
        'synced', synced_count,
        'conflicts', conflict_count,
        'errors', error_count,
        'sync_session_id', p_sync_session_id,
        'synced_at', NOW()
    );
    
    RETURN sync_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- AUTOMATED TRIGGERS
-- ===========================================

-- Trigger to update device last seen timestamp
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE training_mobile_devices
    SET 
        last_seen_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.device_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply last seen trigger
CREATE TRIGGER sync_sessions_update_device_last_seen
    AFTER INSERT ON training_sync_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_device_last_seen();

-- Trigger for updated_at columns
CREATE TRIGGER update_mobile_devices_updated_at
    BEFORE UPDATE ON training_mobile_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_sessions_updated_at
    BEFORE UPDATE ON training_sync_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offline_cache_updated_at
    BEFORE UPDATE ON training_offline_content_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_conflicts_updated_at
    BEFORE UPDATE ON training_sync_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- DEFAULT MOBILE SYNC SETUP
-- ===========================================

-- Create sample mobile device entries for testing
INSERT INTO training_mobile_devices (
    device_id,
    device_name,
    device_type,
    primary_user_id,
    restaurant_id,
    os_name,
    os_version,
    app_version,
    offline_storage_capacity_mb,
    auto_sync_enabled
)
SELECT 
    'tablet_' || r.id || '_001',
    'Restaurant Tablet - ' || r.name,
    'tablet',
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'manager' LIMIT 1),
    r.id,
    'Android',
    '11.0',
    '1.0.0',
    2048,
    true
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role = 'manager')
ON CONFLICT (device_id) DO NOTHING;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_mobile_devices IS 'Mobile device registration and management for offline training synchronization';
COMMENT ON TABLE training_sync_sessions IS 'Synchronization session tracking with progress monitoring and conflict detection';
COMMENT ON TABLE training_offline_content_cache IS 'Offline content caching system for training materials with priority management';
COMMENT ON TABLE training_sync_conflicts IS 'Conflict resolution system for synchronization with manual review capabilities';
COMMENT ON TABLE training_offline_progress_log IS 'Offline training progress logging with server synchronization tracking';
COMMENT ON TABLE training_mobile_sync_analytics IS 'Mobile synchronization analytics and performance monitoring';

-- Performance optimization
ANALYZE training_mobile_devices;
ANALYZE training_sync_sessions;
ANALYZE training_offline_content_cache;
ANALYZE training_sync_conflicts;
ANALYZE training_offline_progress_log;
ANALYZE training_mobile_sync_analytics;