-- Training Session Security Monitoring System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive fraud detection and security monitoring for training sessions

-- ===========================================
-- SESSION MONITORING ENUMS
-- ===========================================

-- Security threat levels
CREATE TYPE security_threat_level AS ENUM (
    'none', 'low', 'medium', 'high', 'critical', 'emergency'
);

-- Fraud detection types
CREATE TYPE fraud_detection_type AS ENUM (
    'identity_fraud', 'session_hijacking', 'bot_activity', 'collusion', 
    'time_manipulation', 'answer_pattern_fraud', 'proxy_user', 'automated_testing'
);

-- Session anomaly types
CREATE TYPE session_anomaly_type AS ENUM (
    'unusual_timing', 'impossible_travel', 'device_mismatch', 'behavioral_change',
    'knowledge_inconsistency', 'response_pattern', 'biometric_mismatch', 'network_anomaly'
);

-- Security action types
CREATE TYPE security_action_type AS ENUM (
    'alert', 'suspend', 'terminate', 'escalate', 'investigate', 'block', 'require_verification'
);

-- ===========================================
-- TRAINING SESSION MONITORING TABLES
-- ===========================================

-- Enhanced training session tracking
CREATE TABLE IF NOT EXISTS training_session_security (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session identification
    session_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    progress_id UUID, -- Link to user_training_progress
    restaurant_id UUID NOT NULL,
    
    -- Session context
    module_id UUID,
    section_id UUID,
    assessment_id UUID,
    
    -- Device and network fingerprinting
    device_fingerprint TEXT NOT NULL,
    browser_fingerprint TEXT,
    hardware_fingerprint TEXT,
    canvas_fingerprint TEXT,
    audio_fingerprint TEXT,
    
    -- Network information
    ip_address INET NOT NULL,
    ip_geolocation JSONB DEFAULT '{}',
    network_type VARCHAR(50), -- 'wifi', 'cellular', 'ethernet', 'vpn'
    connection_quality JSONB DEFAULT '{}',
    proxy_detected BOOLEAN DEFAULT false,
    vpn_detected BOOLEAN DEFAULT false,
    tor_detected BOOLEAN DEFAULT false,
    
    -- User agent and environment
    user_agent TEXT,
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    operating_system VARCHAR(100),
    screen_resolution VARCHAR(20),
    timezone VARCHAR(50),
    language_settings TEXT[],
    
    -- Behavioral biometrics
    typing_patterns JSONB DEFAULT '{}', -- Keystroke dynamics
    mouse_movements JSONB DEFAULT '{}', -- Mouse behavior patterns
    touch_patterns JSONB DEFAULT '{}', -- Touch/swipe patterns for tablets
    navigation_patterns JSONB DEFAULT '{}', -- How user navigates interface
    
    -- Session timing analysis
    session_start_time TIMESTAMPTZ DEFAULT NOW(),
    last_activity_time TIMESTAMPTZ DEFAULT NOW(),
    total_active_time_seconds INTEGER DEFAULT 0,
    idle_time_seconds INTEGER DEFAULT 0,
    pause_count INTEGER DEFAULT 0,
    pause_durations INTEGER[] DEFAULT '{}',
    
    -- Content interaction tracking
    questions_viewed INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    content_switches INTEGER DEFAULT 0,
    back_button_usage INTEGER DEFAULT 0,
    help_accessed INTEGER DEFAULT 0,
    external_resources_accessed INTEGER DEFAULT 0,
    
    -- Performance indicators
    average_response_time_ms INTEGER,
    response_time_variance DECIMAL(10,2),
    accuracy_trend_analysis JSONB DEFAULT '{}',
    difficulty_progression JSONB DEFAULT '{}',
    
    -- Security risk assessment
    risk_score INTEGER DEFAULT 0, -- 0-100 scale
    threat_level security_threat_level DEFAULT 'none',
    anomaly_flags TEXT[] DEFAULT '{}',
    fraud_indicators JSONB DEFAULT '{}',
    
    -- Authentication verification
    initial_auth_method VARCHAR(50),
    continuous_auth_checks INTEGER DEFAULT 0,
    auth_failures INTEGER DEFAULT 0,
    mfa_challenges INTEGER DEFAULT 0,
    biometric_verifications INTEGER DEFAULT 0,
    
    -- Session integrity
    session_hash VARCHAR(128), -- Hash of session data for tampering detection
    data_integrity_checks INTEGER DEFAULT 0,
    integrity_violations INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_session_security_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_security_progress FOREIGN KEY (progress_id) REFERENCES user_training_progress(id),
    CONSTRAINT fk_session_security_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_security_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_session_security_section FOREIGN KEY (section_id) REFERENCES training_sections(id),
    CONSTRAINT fk_session_security_assessment FOREIGN KEY (assessment_id) REFERENCES training_assessments(id),
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Fraud detection alerts
CREATE TABLE IF NOT EXISTS training_fraud_detection_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert identification
    alert_id VARCHAR(128) NOT NULL UNIQUE,
    session_security_id UUID NOT NULL,
    user_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Fraud detection details
    fraud_type fraud_detection_type NOT NULL,
    detection_algorithm VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL, -- 0-100% confidence
    severity_level security_threat_level NOT NULL,
    
    -- Evidence and indicators
    evidence_data JSONB NOT NULL,
    contributing_factors TEXT[] DEFAULT '{}',
    detection_rules_triggered TEXT[] DEFAULT '{}',
    
    -- Pattern analysis
    similar_incidents_count INTEGER DEFAULT 0,
    historical_pattern_match BOOLEAN DEFAULT false,
    cross_user_correlation JSONB DEFAULT '{}',
    
    -- Alert status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'investigating', 'resolved', 'false_positive'
    assigned_to UUID,
    resolution_status VARCHAR(100),
    resolution_notes TEXT,
    
    -- Actions taken
    automatic_actions_taken JSONB DEFAULT '{}',
    manual_actions_required TEXT[] DEFAULT '{}',
    escalation_level INTEGER DEFAULT 0,
    escalated_to UUID,
    
    -- Notification tracking
    notifications_sent JSONB DEFAULT '{}',
    stakeholders_notified TEXT[] DEFAULT '{}',
    notification_timestamps JSONB DEFAULT '{}',
    
    -- Investigation details
    investigated_by UUID,
    investigation_started_at TIMESTAMPTZ,
    investigation_completed_at TIMESTAMPTZ,
    investigation_findings TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_fraud_alert_session FOREIGN KEY (session_security_id) REFERENCES training_session_security(id) ON DELETE CASCADE,
    CONSTRAINT fk_fraud_alert_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_fraud_alert_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_fraud_alert_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth_users(id),
    CONSTRAINT fk_fraud_alert_escalated_to FOREIGN KEY (escalated_to) REFERENCES auth_users(id),
    CONSTRAINT fk_fraud_alert_investigated_by FOREIGN KEY (investigated_by) REFERENCES auth_users(id),
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- Session anomaly detection
CREATE TABLE IF NOT EXISTS training_session_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Anomaly identification
    anomaly_id VARCHAR(128) NOT NULL UNIQUE,
    session_security_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Anomaly details
    anomaly_type session_anomaly_type NOT NULL,
    anomaly_description TEXT NOT NULL,
    detection_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Anomaly metrics
    anomaly_score DECIMAL(5,2) NOT NULL, -- 0-100 scale
    deviation_magnitude DECIMAL(8,2), -- How far from normal
    baseline_comparison JSONB DEFAULT '{}',
    
    -- Context information
    expected_behavior JSONB DEFAULT '{}',
    actual_behavior JSONB DEFAULT '{}',
    environmental_factors JSONB DEFAULT '{}',
    
    -- Pattern analysis
    is_recurring BOOLEAN DEFAULT false,
    recurrence_frequency VARCHAR(50),
    pattern_classification VARCHAR(100),
    related_anomalies UUID[] DEFAULT '{}',
    
    -- Impact assessment
    impact_level security_threat_level DEFAULT 'low',
    affected_metrics TEXT[] DEFAULT '{}',
    potential_consequences TEXT[] DEFAULT '{}',
    
    -- Resolution tracking
    status VARCHAR(50) DEFAULT 'detected', -- 'detected', 'analyzed', 'resolved', 'ignored'
    resolution_action VARCHAR(100),
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_anomaly_session FOREIGN KEY (session_security_id) REFERENCES training_session_security(id) ON DELETE CASCADE,
    CONSTRAINT fk_anomaly_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_anomaly_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_anomaly_score CHECK (anomaly_score >= 0 AND anomaly_score <= 100)
);

-- Security incident response log
CREATE TABLE IF NOT EXISTS training_security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Incident identification
    incident_id VARCHAR(128) NOT NULL UNIQUE,
    related_session_id UUID,
    related_alert_id UUID,
    
    -- Incident classification
    incident_type VARCHAR(100) NOT NULL,
    severity_level security_threat_level NOT NULL,
    category VARCHAR(50), -- 'authentication', 'authorization', 'data_breach', 'fraud'
    
    -- Incident details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    impact_assessment TEXT,
    root_cause_analysis TEXT,
    
    -- Affected entities
    affected_users UUID[] DEFAULT '{}',
    affected_modules UUID[] DEFAULT '{}',
    affected_restaurants UUID[] DEFAULT '{}',
    data_compromised BOOLEAN DEFAULT false,
    
    -- Timeline
    detected_at TIMESTAMPTZ NOT NULL,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Response team
    incident_commander UUID,
    response_team UUID[] DEFAULT '{}',
    external_consultants TEXT[] DEFAULT '{}',
    
    -- Actions taken
    immediate_actions JSONB DEFAULT '{}',
    containment_actions JSONB DEFAULT '{}',
    remediation_actions JSONB DEFAULT '{}',
    prevention_measures JSONB DEFAULT '{}',
    
    -- Communication
    internal_notifications JSONB DEFAULT '{}',
    external_notifications JSONB DEFAULT '{}',
    regulatory_reporting JSONB DEFAULT '{}',
    public_disclosure BOOLEAN DEFAULT false,
    
    -- Lessons learned
    lessons_learned TEXT,
    process_improvements TEXT,
    policy_updates TEXT,
    training_updates TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'investigating', 'contained', 'resolved', 'closed'
    resolution_summary TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_incident_session FOREIGN KEY (related_session_id) REFERENCES training_session_security(id),
    CONSTRAINT fk_incident_alert FOREIGN KEY (related_alert_id) REFERENCES training_fraud_detection_alerts(id),
    CONSTRAINT fk_incident_commander FOREIGN KEY (incident_commander) REFERENCES auth_users(id),
    CONSTRAINT fk_incident_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Automated security responses
CREATE TABLE IF NOT EXISTS training_automated_security_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Response identification
    response_id VARCHAR(128) NOT NULL UNIQUE,
    trigger_event_id UUID, -- Could be alert, anomaly, or incident
    trigger_event_type VARCHAR(50) NOT NULL, -- 'alert', 'anomaly', 'incident'
    
    -- Response details
    action_type security_action_type NOT NULL,
    action_description TEXT NOT NULL,
    execution_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Conditions and rules
    trigger_conditions JSONB NOT NULL,
    business_rules_applied TEXT[] DEFAULT '{}',
    policy_references TEXT[] DEFAULT '{}',
    
    -- Target entities
    target_user_id UUID,
    target_session_id TEXT,
    target_ip_address INET,
    scope_of_action VARCHAR(100), -- 'user', 'session', 'ip', 'system'
    
    -- Action parameters
    action_parameters JSONB DEFAULT '{}',
    duration_minutes INTEGER, -- For temporary actions
    severity_threshold INTEGER, -- Threshold that triggered action
    
    -- Execution results
    execution_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'executed', 'failed', 'cancelled'
    execution_details JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Approval workflow (for sensitive actions)
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approval_timestamp TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Rollback capability
    can_be_rolled_back BOOLEAN DEFAULT true,
    rollback_procedure TEXT,
    rolled_back_at TIMESTAMPTZ,
    rollback_reason TEXT,
    
    -- Effectiveness tracking
    effectiveness_score INTEGER, -- 0-100 scale
    false_positive BOOLEAN DEFAULT false,
    user_feedback JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_auto_response_target_user FOREIGN KEY (target_user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_auto_response_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- Behavioral baseline profiles
CREATE TABLE IF NOT EXISTS training_behavioral_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Profile identification
    user_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Behavioral patterns
    typical_session_duration INTEGER, -- Average session length in minutes
    typical_response_time_ms INTEGER, -- Average response time
    typical_accuracy_rate DECIMAL(5,2), -- Average accuracy percentage
    typical_completion_rate DECIMAL(5,2), -- Typical completion rate
    
    -- Timing patterns
    preferred_training_hours INTEGER[] DEFAULT '{}', -- Hours of day (0-23)
    preferred_days_of_week INTEGER[] DEFAULT '{}', -- Days (1-7)
    session_frequency_days DECIMAL(3,1), -- Sessions per week average
    
    -- Device and network patterns
    common_devices TEXT[] DEFAULT '{}',
    common_ip_ranges INET[] DEFAULT '{}',
    common_locations JSONB DEFAULT '{}',
    network_preferences TEXT[] DEFAULT '{}', -- wifi, cellular, etc.
    
    -- Learning patterns
    learning_velocity DECIMAL(5,2), -- Progress rate
    difficulty_preference VARCHAR(20), -- easy, medium, hard
    question_types_strengths TEXT[] DEFAULT '{}',
    question_types_weaknesses TEXT[] DEFAULT '{}',
    
    -- Interaction patterns
    navigation_style VARCHAR(50), -- linear, jumping, reviewing
    help_usage_frequency DECIMAL(5,2), -- Help accesses per session
    pause_patterns JSONB DEFAULT '{}',
    retry_patterns JSONB DEFAULT '{}',
    
    -- Biometric patterns (if available)
    typing_rhythm_profile JSONB DEFAULT '{}',
    mouse_movement_profile JSONB DEFAULT '{}',
    touch_pressure_profile JSONB DEFAULT '{}',
    
    -- Statistical measures
    data_points_count INTEGER DEFAULT 0,
    confidence_level DECIMAL(5,2) DEFAULT 0, -- Statistical confidence
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Baseline validity
    is_established BOOLEAN DEFAULT false, -- Enough data for reliable baseline
    requires_update BOOLEAN DEFAULT false,
    anomaly_threshold DECIMAL(5,2) DEFAULT 2.0, -- Standard deviations
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_baseline_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_baseline_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_baseline UNIQUE (user_id)
);

-- ===========================================
-- SESSION MONITORING INDEXES
-- ===========================================

-- Session security indexes
CREATE UNIQUE INDEX idx_session_security_session_id ON training_session_security(session_id);
CREATE INDEX idx_session_security_user ON training_session_security(user_id);
CREATE INDEX idx_session_security_restaurant ON training_session_security(restaurant_id);
CREATE INDEX idx_session_security_risk_score ON training_session_security(risk_score);
CREATE INDEX idx_session_security_threat_level ON training_session_security(threat_level);
CREATE INDEX idx_session_security_created_at ON training_session_security(created_at);

-- Fraud detection alerts indexes
CREATE UNIQUE INDEX idx_fraud_alerts_alert_id ON training_fraud_detection_alerts(alert_id);
CREATE INDEX idx_fraud_alerts_session ON training_fraud_detection_alerts(session_security_id);
CREATE INDEX idx_fraud_alerts_user ON training_fraud_detection_alerts(user_id);
CREATE INDEX idx_fraud_alerts_type ON training_fraud_detection_alerts(fraud_type);
CREATE INDEX idx_fraud_alerts_severity ON training_fraud_detection_alerts(severity_level);
CREATE INDEX idx_fraud_alerts_status ON training_fraud_detection_alerts(status);
CREATE INDEX idx_fraud_alerts_created_at ON training_fraud_detection_alerts(created_at);

-- Session anomalies indexes
CREATE UNIQUE INDEX idx_anomalies_anomaly_id ON training_session_anomalies(anomaly_id);
CREATE INDEX idx_anomalies_session ON training_session_anomalies(session_security_id);
CREATE INDEX idx_anomalies_user ON training_session_anomalies(user_id);
CREATE INDEX idx_anomalies_type ON training_session_anomalies(anomaly_type);
CREATE INDEX idx_anomalies_score ON training_session_anomalies(anomaly_score);
CREATE INDEX idx_anomalies_status ON training_session_anomalies(status);

-- Security incidents indexes
CREATE UNIQUE INDEX idx_incidents_incident_id ON training_security_incidents(incident_id);
CREATE INDEX idx_incidents_severity ON training_security_incidents(severity_level);
CREATE INDEX idx_incidents_status ON training_security_incidents(status);
CREATE INDEX idx_incidents_detected_at ON training_security_incidents(detected_at);
CREATE INDEX idx_incidents_category ON training_security_incidents(category);

-- Automated responses indexes
CREATE UNIQUE INDEX idx_auto_responses_response_id ON training_automated_security_responses(response_id);
CREATE INDEX idx_auto_responses_action_type ON training_automated_security_responses(action_type);
CREATE INDEX idx_auto_responses_target_user ON training_automated_security_responses(target_user_id);
CREATE INDEX idx_auto_responses_execution_status ON training_automated_security_responses(execution_status);
CREATE INDEX idx_auto_responses_timestamp ON training_automated_security_responses(execution_timestamp);

-- Behavioral baselines indexes
CREATE UNIQUE INDEX idx_baselines_user ON training_behavioral_baselines(user_id);
CREATE INDEX idx_baselines_restaurant ON training_behavioral_baselines(restaurant_id);
CREATE INDEX idx_baselines_established ON training_behavioral_baselines(is_established);
CREATE INDEX idx_baselines_updated ON training_behavioral_baselines(last_updated);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on monitoring tables
ALTER TABLE training_session_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_fraud_detection_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_session_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_automated_security_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_behavioral_baselines ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Session security restaurant isolation"
ON training_session_security FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Fraud alerts restaurant isolation" 
ON training_fraud_detection_alerts FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Baselines restaurant isolation"
ON training_behavioral_baselines FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- User isolation for personal data
CREATE POLICY "User session data isolation"
ON training_session_security FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND restaurant_id = training_session_security.restaurant_id
    )
);

-- ===========================================
-- SECURITY MONITORING FUNCTIONS
-- ===========================================

-- Function to calculate session risk score
CREATE OR REPLACE FUNCTION calculate_session_risk_score(p_session_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    session_data RECORD;
    baseline_data RECORD;
    risk_score INTEGER := 0;
    device_risk INTEGER := 0;
    behavioral_risk INTEGER := 0;
    network_risk INTEGER := 0;
    timing_risk INTEGER := 0;
BEGIN
    -- Get session data
    SELECT * INTO session_data
    FROM training_session_security
    WHERE session_id = p_session_id;
    
    -- Get user baseline
    SELECT * INTO baseline_data
    FROM training_behavioral_baselines
    WHERE user_id = session_data.user_id;
    
    -- Device risk assessment
    IF session_data.proxy_detected OR session_data.vpn_detected THEN
        device_risk := device_risk + 20;
    END IF;
    
    IF session_data.tor_detected THEN
        device_risk := device_risk + 40;
    END IF;
    
    -- Behavioral risk assessment
    IF baseline_data.is_established THEN
        -- Check response time deviation
        IF ABS(session_data.average_response_time_ms - baseline_data.typical_response_time_ms) > 
           (baseline_data.typical_response_time_ms * 0.5) THEN
            behavioral_risk := behavioral_risk + 15;
        END IF;
        
        -- Check session duration deviation
        IF session_data.total_active_time_seconds > (baseline_data.typical_session_duration * 60 * 2) THEN
            behavioral_risk := behavioral_risk + 10;
        END IF;
    END IF;
    
    -- Network risk assessment
    IF session_data.ip_geolocation->>'country' != 
       COALESCE(baseline_data.common_locations->>'primary_country', 'Unknown') THEN
        network_risk := network_risk + 25;
    END IF;
    
    -- Timing risk assessment
    IF NOT (EXTRACT(hour FROM session_data.session_start_time)::INTEGER = ANY(baseline_data.preferred_training_hours)) THEN
        timing_risk := timing_risk + 10;
    END IF;
    
    -- Calculate total risk score
    risk_score := LEAST(100, device_risk + behavioral_risk + network_risk + timing_risk);
    
    -- Update session security record
    UPDATE training_session_security
    SET 
        risk_score = risk_score,
        threat_level = CASE 
            WHEN risk_score >= 80 THEN 'critical'
            WHEN risk_score >= 60 THEN 'high'
            WHEN risk_score >= 40 THEN 'medium'
            WHEN risk_score >= 20 THEN 'low'
            ELSE 'none'
        END,
        updated_at = NOW()
    WHERE session_id = p_session_id;
    
    RETURN risk_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect session anomalies
CREATE OR REPLACE FUNCTION detect_session_anomalies(p_session_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    session_data RECORD;
    baseline_data RECORD;
    anomaly_count INTEGER := 0;
    anomaly_id TEXT;
BEGIN
    -- Get session and baseline data
    SELECT tss.*, au.restaurant_id
    INTO session_data
    FROM training_session_security tss
    JOIN auth_users au ON tss.user_id = au.id
    WHERE tss.session_id = p_session_id;
    
    SELECT * INTO baseline_data
    FROM training_behavioral_baselines
    WHERE user_id = session_data.user_id;
    
    -- Check for impossible travel anomaly
    IF session_data.ip_geolocation IS NOT NULL AND 
       baseline_data.common_locations IS NOT NULL THEN
        -- Simplified distance check (would use proper geospatial functions in production)
        IF (session_data.ip_geolocation->>'country') != 
           (baseline_data.common_locations->>'primary_country') THEN
            
            anomaly_id := encode(sha256((p_session_id || 'impossible_travel' || NOW()::text)::bytea), 'hex');
            
            INSERT INTO training_session_anomalies (
                anomaly_id,
                session_security_id,
                user_id,
                anomaly_type,
                anomaly_description,
                anomaly_score,
                expected_behavior,
                actual_behavior
            ) VALUES (
                anomaly_id,
                (SELECT id FROM training_session_security WHERE session_id = p_session_id),
                session_data.user_id,
                'impossible_travel',
                'User appears to have traveled impossible distance between sessions',
                75.0,
                jsonb_build_object('expected_country', baseline_data.common_locations->>'primary_country'),
                jsonb_build_object('actual_country', session_data.ip_geolocation->>'country')
            );
            
            anomaly_count := anomaly_count + 1;
        END IF;
    END IF;
    
    -- Check for unusual timing patterns
    IF baseline_data.is_established AND 
       NOT (EXTRACT(hour FROM session_data.session_start_time)::INTEGER = ANY(baseline_data.preferred_training_hours)) THEN
        
        anomaly_id := encode(sha256((p_session_id || 'unusual_timing' || NOW()::text)::bytea), 'hex');
        
        INSERT INTO training_session_anomalies (
            anomaly_id,
            session_security_id,
            user_id,
            anomaly_type,
            anomaly_description,
            anomaly_score,
            expected_behavior,
            actual_behavior
        ) VALUES (
            anomaly_id,
            (SELECT id FROM training_session_security WHERE session_id = p_session_id),
            session_data.user_id,
            'unusual_timing',
            'Training session at unusual time compared to historical pattern',
            40.0,
            jsonb_build_object('preferred_hours', baseline_data.preferred_training_hours),
            jsonb_build_object('actual_hour', EXTRACT(hour FROM session_data.session_start_time))
        );
        
        anomaly_count := anomaly_count + 1;
    END IF;
    
    RETURN anomaly_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create fraud detection alert
CREATE OR REPLACE FUNCTION create_fraud_alert(
    p_session_id TEXT,
    p_fraud_type fraud_detection_type,
    p_confidence_score DECIMAL(5,2),
    p_evidence JSONB
)
RETURNS UUID AS $$
DECLARE
    alert_id UUID;
    session_data RECORD;
    alert_uuid TEXT;
BEGIN
    -- Get session data
    SELECT tss.*, au.restaurant_id
    INTO session_data
    FROM training_session_security tss
    JOIN auth_users au ON tss.user_id = au.id
    WHERE tss.session_id = p_session_id;
    
    -- Generate alert ID
    alert_uuid := encode(sha256((p_session_id || p_fraud_type::text || NOW()::text)::bytea), 'hex');
    
    -- Insert fraud alert
    INSERT INTO training_fraud_detection_alerts (
        alert_id,
        session_security_id,
        user_id,
        restaurant_id,
        fraud_type,
        detection_algorithm,
        confidence_score,
        severity_level,
        evidence_data,
        status,
        created_at
    ) VALUES (
        alert_uuid,
        session_data.id,
        session_data.user_id,
        session_data.restaurant_id,
        p_fraud_type,
        'Advanced Pattern Recognition v2.0',
        p_confidence_score,
        CASE 
            WHEN p_confidence_score >= 90 THEN 'critical'
            WHEN p_confidence_score >= 75 THEN 'high'
            WHEN p_confidence_score >= 50 THEN 'medium'
            ELSE 'low'
        END,
        p_evidence,
        'active',
        NOW()
    ) RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_session_security IS 'Comprehensive session security monitoring with behavioral biometrics and fraud detection';
COMMENT ON TABLE training_fraud_detection_alerts IS 'Automated fraud detection alerts with confidence scoring and evidence collection';
COMMENT ON TABLE training_session_anomalies IS 'Anomaly detection system for identifying unusual training session patterns';
COMMENT ON TABLE training_security_incidents IS 'Security incident management and response tracking system';
COMMENT ON TABLE training_automated_security_responses IS 'Automated security response actions with approval workflows';
COMMENT ON TABLE training_behavioral_baselines IS 'User behavioral baseline profiles for anomaly detection';

-- Performance optimization
ANALYZE training_session_security;
ANALYZE training_fraud_detection_alerts;
ANALYZE training_session_anomalies;
ANALYZE training_security_incidents;
ANALYZE training_automated_security_responses;
ANALYZE training_behavioral_baselines;