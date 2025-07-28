-- Training Content Piracy Prevention System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive anti-piracy and content protection system for training materials

-- ===========================================
-- CONTENT PROTECTION ENUMS
-- ===========================================

-- Digital rights management actions
CREATE TYPE drm_action AS ENUM (
    'view', 'download', 'print', 'copy', 'screenshot', 'share', 'export', 'offline_access'
);

-- Watermark types
CREATE TYPE watermark_type AS ENUM (
    'visible_text', 'invisible_digital', 'steganographic', 'dynamic_overlay', 'biometric_hash'
);

-- Piracy detection types
CREATE TYPE piracy_detection_type AS ENUM (
    'unauthorized_sharing', 'content_scraping', 'bulk_download', 'api_abuse', 
    'screen_recording', 'unauthorized_access', 'content_modification', 'redistribution'
);

-- Content protection levels
CREATE TYPE protection_level AS ENUM (
    'none', 'basic', 'standard', 'enhanced', 'maximum', 'classified'
);

-- Investigation status
CREATE TYPE investigation_status AS ENUM (
    'open', 'investigating', 'evidence_gathering', 'legal_action', 'resolved', 'dismissed'
);

-- ===========================================
-- CONTENT PROTECTION TABLES
-- ===========================================

-- Digital Rights Management (DRM) policies
CREATE TABLE IF NOT EXISTS training_drm_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Policy identification
    policy_name VARCHAR(200) NOT NULL,
    policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    restaurant_id UUID,
    
    -- Content scope
    content_types TEXT[] NOT NULL, -- 'module', 'section', 'media', 'assessment'
    content_categories TEXT[] DEFAULT '{}',
    protection_level protection_level NOT NULL DEFAULT 'standard',
    
    -- Permission matrix
    allowed_actions drm_action[] NOT NULL,
    restricted_actions drm_action[] DEFAULT '{}',
    conditional_actions JSONB DEFAULT '{}', -- Actions with conditions
    
    -- Access restrictions
    max_concurrent_sessions INTEGER DEFAULT 1,
    max_daily_views INTEGER,
    max_total_views INTEGER,
    view_time_limit_minutes INTEGER,
    
    -- Device restrictions
    allowed_device_types TEXT[] DEFAULT '{"tablet","desktop"}',
    device_fingerprinting_required BOOLEAN DEFAULT true,
    trusted_devices_only BOOLEAN DEFAULT false,
    device_registration_required BOOLEAN DEFAULT false,
    
    -- Geographic restrictions
    allowed_countries VARCHAR(2)[] DEFAULT '{}', -- ISO country codes
    geo_fencing_enabled BOOLEAN DEFAULT false,
    geo_fence_coordinates JSONB DEFAULT '{}',
    vpn_blocking_enabled BOOLEAN DEFAULT true,
    
    -- Time-based restrictions
    access_window_start TIME,
    access_window_end TIME,
    allowed_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    timezone_restrictions TEXT[] DEFAULT '{}',
    
    -- Content protection measures
    watermarking_enabled BOOLEAN DEFAULT true,
    watermark_types watermark_type[] DEFAULT '{"visible_text","invisible_digital"}',
    screenshot_blocking BOOLEAN DEFAULT true,
    screen_recording_detection BOOLEAN DEFAULT true,
    right_click_disabled BOOLEAN DEFAULT true,
    dev_tools_blocking BOOLEAN DEFAULT true,
    
    -- Network security
    https_only_access BOOLEAN DEFAULT true,
    certificate_pinning BOOLEAN DEFAULT true,
    content_encryption_required BOOLEAN DEFAULT true,
    api_rate_limiting BOOLEAN DEFAULT true,
    
    -- Policy enforcement
    violation_penalties JSONB DEFAULT '{}',
    automatic_enforcement BOOLEAN DEFAULT true,
    escalation_procedures JSONB DEFAULT '{}',
    
    -- Policy metadata
    created_by UUID,
    approved_by UUID,
    approval_date DATE,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_drm_policy_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_drm_policy_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_drm_policy_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT unique_policy_version UNIQUE (restaurant_id, policy_name, policy_version)
);

-- Content watermarking registry
CREATE TABLE IF NOT EXISTS training_content_watermarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Watermark identification
    watermark_id VARCHAR(128) NOT NULL UNIQUE,
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    
    -- Watermarking details
    watermark_type watermark_type NOT NULL,
    watermark_data JSONB NOT NULL, -- Watermark content and parameters
    watermark_hash VARCHAR(128) NOT NULL,
    
    -- User context (for personalized watermarks)
    user_id UUID,
    session_id TEXT,
    access_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Watermark positioning
    placement_algorithm VARCHAR(100), -- 'random', 'fixed', 'adaptive'
    coordinates JSONB DEFAULT '{}',
    visibility_level INTEGER DEFAULT 50, -- 0-100 opacity
    
    -- Digital fingerprinting
    content_fingerprint TEXT, -- Unique content signature
    steganographic_payload BYTEA, -- Hidden data
    biometric_signature JSONB DEFAULT '{}', -- User-specific markers
    
    -- Extraction and verification
    extraction_algorithm VARCHAR(100),
    verification_key TEXT,
    integrity_checksum VARCHAR(128),
    
    -- Watermark robustness
    distortion_resistance BOOLEAN DEFAULT true,
    compression_resistance BOOLEAN DEFAULT true,
    cropping_resistance BOOLEAN DEFAULT true,
    
    -- Tracking and forensics
    forensic_markers JSONB DEFAULT '{}',
    tracking_enabled BOOLEAN DEFAULT true,
    detection_threshold DECIMAL(5,2) DEFAULT 85.0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_watermark_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- Piracy detection and monitoring
CREATE TABLE IF NOT EXISTS training_piracy_detection_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert identification
    alert_id VARCHAR(128) NOT NULL UNIQUE,
    detection_type piracy_detection_type NOT NULL,
    severity_level security_threat_level NOT NULL,
    
    -- Content identification
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    watermark_id UUID, -- If detected through watermark
    
    -- Suspect information
    suspect_user_id UUID,
    suspect_ip_address INET,
    suspect_device_fingerprint TEXT,
    suspect_session_id TEXT,
    
    -- Detection details
    detection_timestamp TIMESTAMPTZ DEFAULT NOW(),
    detection_method VARCHAR(100) NOT NULL,
    detection_algorithm VARCHAR(100),
    confidence_score DECIMAL(5,2) NOT NULL, -- 0-100%
    
    -- Evidence collection
    evidence_data JSONB NOT NULL,
    forensic_evidence JSONB DEFAULT '{}',
    digital_evidence_hash VARCHAR(128),
    chain_of_custody JSONB DEFAULT '[]',
    
    -- Violation details
    violation_description TEXT NOT NULL,
    violation_category VARCHAR(100),
    estimated_scope INTEGER, -- Number of affected items
    potential_impact_assessment TEXT,
    
    -- Response actions
    immediate_actions_taken JSONB DEFAULT '{}',
    access_revoked BOOLEAN DEFAULT false,
    account_suspended BOOLEAN DEFAULT false,
    legal_notice_sent BOOLEAN DEFAULT false,
    
    -- Investigation tracking
    investigation_assigned_to UUID,
    investigation_status investigation_status DEFAULT 'open',
    investigation_notes TEXT,
    investigation_completed_at TIMESTAMPTZ,
    
    -- Legal and compliance
    legal_action_recommended BOOLEAN DEFAULT false,
    dmca_notice_sent BOOLEAN DEFAULT false,
    law_enforcement_contacted BOOLEAN DEFAULT false,
    insurance_claim_filed BOOLEAN DEFAULT false,
    
    -- Resolution
    resolution_status VARCHAR(50) DEFAULT 'pending',
    resolution_description TEXT,
    damages_assessed DECIMAL(15,2) DEFAULT 0,
    recovery_actions JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_piracy_alert_content_watermark FOREIGN KEY (watermark_id) REFERENCES training_content_watermarks(id),
    CONSTRAINT fk_piracy_alert_suspect_user FOREIGN KEY (suspect_user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_piracy_alert_investigator FOREIGN KEY (investigation_assigned_to) REFERENCES auth_users(id),
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- Content access forensics
CREATE TABLE IF NOT EXISTS training_content_access_forensics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Access identification
    access_id VARCHAR(128) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    
    -- Content identification
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    watermark_id UUID,
    
    -- Access forensics
    access_timestamp TIMESTAMPTZ DEFAULT NOW(),
    access_duration_seconds INTEGER,
    access_pattern VARCHAR(100), -- 'normal', 'suspicious', 'bulk', 'automated'
    
    -- Device forensics
    device_fingerprint TEXT NOT NULL,
    browser_forensics JSONB DEFAULT '{}',
    screen_forensics JSONB DEFAULT '{}',
    hardware_forensics JSONB DEFAULT '{}',
    
    -- Network forensics
    ip_address INET NOT NULL,
    network_path JSONB DEFAULT '{}',
    proxy_chain JSONB DEFAULT '{}',
    dns_information JSONB DEFAULT '{}',
    
    -- Behavioral forensics
    mouse_movements JSONB DEFAULT '{}',
    keyboard_patterns JSONB DEFAULT '{}',
    timing_analysis JSONB DEFAULT '{}',
    interaction_patterns JSONB DEFAULT '{}',
    
    -- Content interaction forensics
    view_patterns JSONB DEFAULT '{}',
    scroll_behavior JSONB DEFAULT '{}',
    zoom_levels INTEGER[] DEFAULT '{}',
    focus_areas JSONB DEFAULT '{}',
    
    -- Security event detection
    screenshot_attempts INTEGER DEFAULT 0,
    copy_attempts INTEGER DEFAULT 0,
    print_attempts INTEGER DEFAULT 0,
    download_attempts INTEGER DEFAULT 0,
    dev_tools_usage BOOLEAN DEFAULT false,
    
    -- Anomaly indicators
    anomaly_score DECIMAL(5,2) DEFAULT 0, -- 0-100 scale
    anomaly_flags TEXT[] DEFAULT '{}',
    suspicious_activities JSONB DEFAULT '{}',
    
    -- Legal compliance
    consent_to_monitoring BOOLEAN DEFAULT false,
    privacy_notice_acknowledged BOOLEAN DEFAULT false,
    data_retention_period_days INTEGER DEFAULT 2555, -- 7 years
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_access_forensics_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_access_forensics_watermark FOREIGN KEY (watermark_id) REFERENCES training_content_watermarks(id),
    CONSTRAINT valid_anomaly_score CHECK (anomaly_score >= 0 AND anomaly_score <= 100)
);

-- Anti-piracy enforcement actions
CREATE TABLE IF NOT EXISTS training_antipiracy_enforcement_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action identification
    action_id VARCHAR(128) NOT NULL UNIQUE,
    piracy_alert_id UUID NOT NULL,
    
    -- Action details
    action_type VARCHAR(100) NOT NULL, -- 'suspend_access', 'revoke_license', 'legal_notice', 'account_termination'
    action_description TEXT NOT NULL,
    severity_level VARCHAR(50) NOT NULL,
    
    -- Target information
    target_user_id UUID,
    target_ip_address INET,
    target_device_fingerprint TEXT,
    affected_content_ids UUID[] DEFAULT '{}',
    
    -- Enforcement details
    automated_action BOOLEAN DEFAULT false,
    human_review_required BOOLEAN DEFAULT true,
    approved_by UUID,
    approval_timestamp TIMESTAMPTZ,
    
    -- Action execution
    executed_at TIMESTAMPTZ,
    execution_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'executed', 'failed', 'cancelled'
    execution_details JSONB DEFAULT '{}',
    
    -- Legal framework
    legal_basis TEXT,
    dmca_compliant BOOLEAN DEFAULT true,
    due_process_followed BOOLEAN DEFAULT true,
    notice_period_days INTEGER DEFAULT 7,
    
    -- Communication
    notice_sent BOOLEAN DEFAULT false,
    notice_method VARCHAR(50), -- 'email', 'postal', 'platform_message'
    notice_content TEXT,
    notice_delivery_confirmed BOOLEAN DEFAULT false,
    
    -- Appeal process
    appeal_allowed BOOLEAN DEFAULT true,
    appeal_deadline TIMESTAMPTZ,
    appeal_submitted BOOLEAN DEFAULT false,
    appeal_decision TEXT,
    
    -- Effectiveness tracking
    violation_stopped BOOLEAN DEFAULT false,
    repeat_violation BOOLEAN DEFAULT false,
    escalation_required BOOLEAN DEFAULT false,
    
    -- Recovery and damages
    financial_damages DECIMAL(15,2) DEFAULT 0,
    recovery_amount DECIMAL(15,2) DEFAULT 0,
    recovery_method VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_enforcement_piracy_alert FOREIGN KEY (piracy_alert_id) REFERENCES training_piracy_detection_alerts(id) ON DELETE CASCADE,
    CONSTRAINT fk_enforcement_target_user FOREIGN KEY (target_user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_enforcement_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- Content usage analytics (for piracy detection)
CREATE TABLE IF NOT EXISTS training_content_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Analytics identification
    analytics_id VARCHAR(128) NOT NULL UNIQUE,
    
    -- Time period
    analysis_date DATE NOT NULL,
    analysis_period VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    
    -- Content metrics
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Usage statistics
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    total_view_time_minutes INTEGER DEFAULT 0,
    average_view_duration DECIMAL(8,2) DEFAULT 0,
    
    -- Geographic distribution
    country_distribution JSONB DEFAULT '{}',
    suspicious_geographic_patterns BOOLEAN DEFAULT false,
    impossible_geographic_access BOOLEAN DEFAULT false,
    
    -- Device and access patterns
    device_type_distribution JSONB DEFAULT '{}',
    browser_distribution JSONB DEFAULT '{}',
    suspicious_device_patterns BOOLEAN DEFAULT false,
    
    -- Temporal patterns
    access_time_distribution JSONB DEFAULT '{}',
    peak_access_hours INTEGER[] DEFAULT '{}',
    unusual_temporal_patterns BOOLEAN DEFAULT false,
    
    -- Behavior analysis
    bulk_access_detected BOOLEAN DEFAULT false,
    automated_access_detected BOOLEAN DEFAULT false,
    scraping_patterns_detected BOOLEAN DEFAULT false,
    
    -- Network analysis
    ip_diversity_score DECIMAL(5,2) DEFAULT 0,
    proxy_usage_percentage DECIMAL(5,2) DEFAULT 0,
    vpn_usage_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Anomaly detection
    statistical_anomalies JSONB DEFAULT '{}',
    anomaly_threshold_breached BOOLEAN DEFAULT false,
    investigation_triggered BOOLEAN DEFAULT false,
    
    -- Comparative analysis
    period_over_period_change DECIMAL(8,2) DEFAULT 0,
    baseline_deviation DECIMAL(8,2) DEFAULT 0,
    peer_comparison JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_usage_analytics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_analytics_period UNIQUE (content_type, content_id, analysis_date, analysis_period)
);

-- ===========================================
-- CONTENT PROTECTION INDEXES
-- ===========================================

-- DRM policies indexes
CREATE INDEX idx_drm_policies_restaurant ON training_drm_policies(restaurant_id);
CREATE INDEX idx_drm_policies_active ON training_drm_policies(is_active) WHERE is_active = true;
CREATE INDEX idx_drm_policies_protection_level ON training_drm_policies(protection_level);

-- Content watermarks indexes
CREATE UNIQUE INDEX idx_watermarks_watermark_id ON training_content_watermarks(watermark_id);
CREATE INDEX idx_watermarks_content ON training_content_watermarks(content_type, content_id);
CREATE INDEX idx_watermarks_user ON training_content_watermarks(user_id);
CREATE INDEX idx_watermarks_type ON training_content_watermarks(watermark_type);
CREATE INDEX idx_watermarks_timestamp ON training_content_watermarks(access_timestamp);

-- Piracy detection alerts indexes
CREATE UNIQUE INDEX idx_piracy_alerts_alert_id ON training_piracy_detection_alerts(alert_id);
CREATE INDEX idx_piracy_alerts_detection_type ON training_piracy_detection_alerts(detection_type);
CREATE INDEX idx_piracy_alerts_severity ON training_piracy_detection_alerts(severity_level);
CREATE INDEX idx_piracy_alerts_suspect_user ON training_piracy_detection_alerts(suspect_user_id);
CREATE INDEX idx_piracy_alerts_content ON training_piracy_detection_alerts(content_type, content_id);
CREATE INDEX idx_piracy_alerts_status ON training_piracy_detection_alerts(investigation_status);
CREATE INDEX idx_piracy_alerts_timestamp ON training_piracy_detection_alerts(detection_timestamp);

-- Content access forensics indexes
CREATE UNIQUE INDEX idx_access_forensics_access_id ON training_content_access_forensics(access_id);
CREATE INDEX idx_access_forensics_user ON training_content_access_forensics(user_id);
CREATE INDEX idx_access_forensics_session ON training_content_access_forensics(session_id);
CREATE INDEX idx_access_forensics_content ON training_content_access_forensics(content_type, content_id);
CREATE INDEX idx_access_forensics_timestamp ON training_content_access_forensics(access_timestamp);
CREATE INDEX idx_access_forensics_anomaly_score ON training_content_access_forensics(anomaly_score);

-- Enforcement actions indexes
CREATE UNIQUE INDEX idx_enforcement_action_id ON training_antipiracy_enforcement_actions(action_id);
CREATE INDEX idx_enforcement_piracy_alert ON training_antipiracy_enforcement_actions(piracy_alert_id);
CREATE INDEX idx_enforcement_target_user ON training_antipiracy_enforcement_actions(target_user_id);
CREATE INDEX idx_enforcement_status ON training_antipiracy_enforcement_actions(execution_status);
CREATE INDEX idx_enforcement_executed_at ON training_antipiracy_enforcement_actions(executed_at);

-- Usage analytics indexes
CREATE UNIQUE INDEX idx_usage_analytics_analytics_id ON training_content_usage_analytics(analytics_id);
CREATE INDEX idx_usage_analytics_content ON training_content_usage_analytics(content_type, content_id);
CREATE INDEX idx_usage_analytics_date ON training_content_usage_analytics(analysis_date);
CREATE INDEX idx_usage_analytics_restaurant ON training_content_usage_analytics(restaurant_id);
CREATE INDEX idx_usage_analytics_anomaly ON training_content_usage_analytics(anomaly_threshold_breached) WHERE anomaly_threshold_breached = true;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on content protection tables
ALTER TABLE training_drm_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_content_watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_piracy_detection_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_content_access_forensics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_antipiracy_enforcement_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_content_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "DRM policies restaurant isolation"
ON training_drm_policies FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Usage analytics restaurant isolation"
ON training_content_usage_analytics FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- Security-focused access policies
CREATE POLICY "Piracy alerts security access"
ON training_piracy_detection_alerts FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'security_officer')
    )
);

CREATE POLICY "Forensics data security access"
ON training_content_access_forensics FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'security_officer')
    )
);

-- ===========================================
-- CONTENT PROTECTION FUNCTIONS
-- ===========================================

-- Function to create content watermark
CREATE OR REPLACE FUNCTION create_content_watermark(
    p_content_type VARCHAR(50),
    p_content_id UUID,
    p_user_id UUID,
    p_session_id TEXT,
    p_watermark_type watermark_type DEFAULT 'visible_text'
)
RETURNS UUID AS $$
DECLARE
    watermark_uuid UUID;
    watermark_id_text TEXT;
    user_info RECORD;
    watermark_data JSONB;
BEGIN
    -- Get user information
    SELECT u.full_name, u.email, r.name as restaurant_name
    INTO user_info
    FROM auth_users u
    LEFT JOIN restaurants r ON u.restaurant_id = r.id
    WHERE u.id = p_user_id;
    
    -- Generate watermark ID
    watermark_id_text := encode(sha256((p_content_id::text || p_user_id::text || p_session_id || NOW()::text)::bytea), 'hex');
    
    -- Create watermark data based on type
    CASE p_watermark_type
        WHEN 'visible_text' THEN
            watermark_data := jsonb_build_object(
                'text', user_info.full_name || ' - ' || user_info.restaurant_name,
                'timestamp', NOW(),
                'opacity', 30,
                'font_size', 12,
                'color', '#CCCCCC'
            );
        WHEN 'invisible_digital' THEN
            watermark_data := jsonb_build_object(
                'user_id', p_user_id,
                'session_id', p_session_id,
                'timestamp', NOW(),
                'checksum', encode(sha256((p_user_id::text || p_session_id || NOW()::text)::bytea), 'hex')
            );
        WHEN 'biometric_hash' THEN
            watermark_data := jsonb_build_object(
                'user_hash', encode(sha256(user_info.email::bytea), 'hex'),
                'session_hash', encode(sha256(p_session_id::bytea), 'hex'),
                'timestamp_hash', encode(sha256(NOW()::text::bytea), 'hex')
            );
        ELSE
            watermark_data := jsonb_build_object('type', 'basic', 'user_id', p_user_id);
    END CASE;
    
    -- Insert watermark record
    INSERT INTO training_content_watermarks (
        watermark_id,
        content_type,
        content_id,
        watermark_type,
        watermark_data,
        watermark_hash,
        user_id,
        session_id,
        content_fingerprint,
        tracking_enabled
    ) VALUES (
        watermark_id_text,
        p_content_type,
        p_content_id,
        p_watermark_type,
        watermark_data,
        encode(sha256(watermark_data::text::bytea), 'hex'),
        p_user_id,
        p_session_id,
        encode(sha256((p_content_type || p_content_id::text)::bytea), 'hex'),
        true
    ) RETURNING id INTO watermark_uuid;
    
    RETURN watermark_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious content access patterns
CREATE OR REPLACE FUNCTION detect_suspicious_content_access(
    p_user_id UUID,
    p_time_window_minutes INTEGER DEFAULT 60
)
RETURNS INTEGER AS $$
DECLARE
    suspicious_patterns INTEGER := 0;
    access_count INTEGER;
    unique_content_count INTEGER;
    avg_view_duration DECIMAL;
    baseline_duration DECIMAL;
BEGIN
    -- Check for bulk access pattern
    SELECT COUNT(*), COUNT(DISTINCT content_id)
    INTO access_count, unique_content_count
    FROM training_content_access_forensics
    WHERE user_id = p_user_id
    AND access_timestamp > NOW() - INTERVAL '1 minute' * p_time_window_minutes;
    
    -- Flag if accessing too many items too quickly
    IF access_count > 20 AND unique_content_count > 15 THEN
        suspicious_patterns := suspicious_patterns + 1;
        
        -- Create piracy detection alert
        INSERT INTO training_piracy_detection_alerts (
            alert_id,
            detection_type,
            severity_level,
            content_type,
            content_id,
            suspect_user_id,
            detection_method,
            confidence_score,
            evidence_data,
            violation_description
        ) VALUES (
            encode(sha256((p_user_id::text || 'bulk_access' || NOW()::text)::bytea), 'hex'),
            'bulk_download',
            'high',
            'multiple',
            '00000000-0000-0000-0000-000000000000'::UUID, -- Placeholder for multiple content
            p_user_id,
            'Pattern Analysis',
            85.0,
            jsonb_build_object(
                'access_count', access_count,
                'unique_content_count', unique_content_count,
                'time_window_minutes', p_time_window_minutes
            ),
            'Suspicious bulk access pattern detected'
        );
    END IF;
    
    -- Check for unusually short view durations
    SELECT AVG(access_duration_seconds)
    INTO avg_view_duration
    FROM training_content_access_forensics
    WHERE user_id = p_user_id
    AND access_timestamp > NOW() - INTERVAL '1 minute' * p_time_window_minutes;
    
    -- Get user's typical duration (simplified baseline)
    SELECT AVG(access_duration_seconds)
    INTO baseline_duration
    FROM training_content_access_forensics
    WHERE user_id = p_user_id
    AND access_timestamp < NOW() - INTERVAL '7 days';
    
    -- Flag if current duration is significantly lower than baseline
    IF baseline_duration IS NOT NULL AND avg_view_duration < (baseline_duration * 0.3) THEN
        suspicious_patterns := suspicious_patterns + 1;
    END IF;
    
    RETURN suspicious_patterns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze content usage patterns
CREATE OR REPLACE FUNCTION analyze_content_usage_patterns(
    p_content_type VARCHAR(50),
    p_content_id UUID,
    p_analysis_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    usage_stats RECORD;
    geographic_analysis JSONB;
    temporal_analysis JSONB;
    anomaly_indicators JSONB := '{}';
    result_analysis JSONB;
BEGIN
    -- Get basic usage statistics
    SELECT 
        COUNT(*) as total_accesses,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(access_duration_seconds) as avg_duration,
        COUNT(DISTINCT ip_address) as unique_ips
    INTO usage_stats
    FROM training_content_access_forensics
    WHERE content_type = p_content_type
    AND content_id = p_content_id
    AND DATE(access_timestamp) = p_analysis_date;
    
    -- Geographic analysis
    SELECT jsonb_object_agg(
        COALESCE(network_path->>'country', 'Unknown'),
        country_count
    )
    INTO geographic_analysis
    FROM (
        SELECT 
            network_path->>'country' as country,
            COUNT(*) as country_count
        FROM training_content_access_forensics
        WHERE content_type = p_content_type
        AND content_id = p_content_id
        AND DATE(access_timestamp) = p_analysis_date
        GROUP BY network_path->>'country'
    ) country_stats;
    
    -- Temporal analysis
    SELECT jsonb_object_agg(
        hour_of_day::text,
        access_count
    )
    INTO temporal_analysis
    FROM (
        SELECT 
            EXTRACT(hour FROM access_timestamp) as hour_of_day,
            COUNT(*) as access_count
        FROM training_content_access_forensics
        WHERE content_type = p_content_type
        AND content_id = p_content_id
        AND DATE(access_timestamp) = p_analysis_date
        GROUP BY EXTRACT(hour FROM access_timestamp)
    ) hourly_stats;
    
    -- Detect anomalies
    IF usage_stats.unique_ips > (usage_stats.unique_users * 2) THEN
        anomaly_indicators := anomaly_indicators || jsonb_build_object(
            'excessive_ip_diversity', true,
            'ip_to_user_ratio', ROUND((usage_stats.unique_ips::DECIMAL / NULLIF(usage_stats.unique_users, 0)), 2)
        );
    END IF;
    
    IF usage_stats.avg_duration < 30 THEN -- Less than 30 seconds average
        anomaly_indicators := anomaly_indicators || jsonb_build_object(
            'unusually_short_duration', true,
            'average_duration_seconds', usage_stats.avg_duration
        );
    END IF;
    
    -- Compile results
    result_analysis := jsonb_build_object(
        'basic_stats', jsonb_build_object(
            'total_accesses', usage_stats.total_accesses,
            'unique_users', usage_stats.unique_users,
            'unique_ips', usage_stats.unique_ips,
            'average_duration_seconds', usage_stats.avg_duration
        ),
        'geographic_distribution', geographic_analysis,
        'temporal_distribution', temporal_analysis,
        'anomaly_indicators', anomaly_indicators,
        'analysis_date', p_analysis_date,
        'anomaly_score', CASE 
            WHEN jsonb_array_length(jsonb_object_keys(anomaly_indicators)) > 2 THEN 80
            WHEN jsonb_array_length(jsonb_object_keys(anomaly_indicators)) > 1 THEN 60
            WHEN jsonb_array_length(jsonb_object_keys(anomaly_indicators)) > 0 THEN 40
            ELSE 0
        END
    );
    
    RETURN result_analysis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce DRM policy
CREATE OR REPLACE FUNCTION enforce_drm_policy(
    p_user_id UUID,
    p_content_type VARCHAR(50),
    p_content_id UUID,
    p_requested_action drm_action
)
RETURNS BOOLEAN AS $$
DECLARE
    policy_record RECORD;
    user_restaurant_id UUID;
    action_allowed BOOLEAN := false;
BEGIN
    -- Get user's restaurant
    SELECT restaurant_id INTO user_restaurant_id
    FROM auth_users WHERE id = p_user_id;
    
    -- Get applicable DRM policy
    SELECT * INTO policy_record
    FROM training_drm_policies
    WHERE restaurant_id = user_restaurant_id
    AND p_content_type = ANY(content_types)
    AND is_active = true
    AND (effective_until IS NULL OR effective_until > NOW())
    ORDER BY protection_level DESC
    LIMIT 1;
    
    -- Check if action is explicitly allowed
    IF policy_record.id IS NOT NULL THEN
        action_allowed := p_requested_action = ANY(policy_record.allowed_actions);
        
        -- Check if action is explicitly restricted
        IF p_requested_action = ANY(policy_record.restricted_actions) THEN
            action_allowed := false;
        END IF;
        
        -- Log the access attempt
        INSERT INTO training_content_access_forensics (
            access_id,
            user_id,
            session_id,
            content_type,
            content_id,
            device_fingerprint,
            ip_address,
            access_pattern
        ) VALUES (
            encode(sha256((p_user_id::text || p_content_id::text || NOW()::text)::bytea), 'hex'),
            p_user_id,
            'drm_check_' || gen_random_uuid()::text,
            p_content_type,
            p_content_id,
            'drm_policy_check',
            '0.0.0.0',
            CASE WHEN action_allowed THEN 'normal' ELSE 'denied' END
        );
    ELSE
        -- No policy found, default to basic restrictions
        action_allowed := p_requested_action IN ('view');
    END IF;
    
    RETURN action_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- DEFAULT CONTENT PROTECTION SETUP
-- ===========================================

-- Insert default DRM policies for each restaurant
INSERT INTO training_drm_policies (
    policy_name,
    restaurant_id,
    content_types,
    protection_level,
    allowed_actions,
    restricted_actions,
    watermarking_enabled,
    screenshot_blocking,
    right_click_disabled,
    created_by
)
SELECT 
    'Standard Training Content Protection',
    r.id,
    ARRAY['module', 'section', 'assessment'],
    'standard',
    ARRAY['view', 'offline_access'],
    ARRAY['download', 'print', 'copy', 'screenshot', 'share'],
    true,
    true,
    true,
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role = 'admin')
ON CONFLICT DO NOTHING;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_drm_policies IS 'Digital Rights Management policies for training content protection with granular access controls';
COMMENT ON TABLE training_content_watermarks IS 'Content watermarking system with steganographic and biometric features for piracy tracking';
COMMENT ON TABLE training_piracy_detection_alerts IS 'Automated piracy detection system with forensic evidence collection';
COMMENT ON TABLE training_content_access_forensics IS 'Comprehensive forensic logging of content access for security analysis';
COMMENT ON TABLE training_antipiracy_enforcement_actions IS 'Anti-piracy enforcement actions with legal compliance and appeal processes';
COMMENT ON TABLE training_content_usage_analytics IS 'Statistical analysis of content usage patterns for anomaly detection';

-- Performance optimization
ANALYZE training_drm_policies;
ANALYZE training_content_watermarks;
ANALYZE training_piracy_detection_alerts;
ANALYZE training_content_access_forensics;
ANALYZE training_antipiracy_enforcement_actions;
ANALYZE training_content_usage_analytics;