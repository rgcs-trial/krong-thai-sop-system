-- Training Audit Trail System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive audit trail tracking for training activities and compliance

-- ===========================================
-- AUDIT TRAIL ENUMS
-- ===========================================

-- Audit event types
CREATE TYPE audit_event_type AS ENUM (
    'user_login', 'user_logout', 'module_access', 'section_view', 'assessment_start',
    'assessment_submit', 'certificate_issue', 'certificate_revoke', 'progress_update',
    'module_create', 'module_update', 'module_delete', 'question_create', 'question_update',
    'user_create', 'user_update', 'user_delete', 'permission_change', 'data_export',
    'data_import', 'backup_create', 'backup_restore', 'system_config', 'security_event'
);

-- Data sensitivity levels
CREATE TYPE data_sensitivity_level AS ENUM (
    'public', 'internal', 'confidential', 'restricted', 'classified'
);

-- Audit trail status
CREATE TYPE audit_trail_status AS ENUM (
    'active', 'archived', 'exported', 'sealed', 'disputed'
);

-- Investigation priority
CREATE TYPE investigation_priority AS ENUM (
    'low', 'medium', 'high', 'critical', 'emergency'
);

-- ===========================================
-- AUDIT TRAIL TABLES
-- ===========================================

-- Master audit trail log
CREATE TABLE IF NOT EXISTS training_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    audit_id VARCHAR(128) NOT NULL UNIQUE,
    event_id VARCHAR(128) NOT NULL,
    correlation_id VARCHAR(128), -- Groups related events
    
    -- Event classification
    event_type audit_event_type NOT NULL,
    event_category VARCHAR(100) NOT NULL,
    event_subcategory VARCHAR(100),
    
    -- Actor information
    user_id UUID,
    actor_type VARCHAR(50) DEFAULT 'user', -- 'user', 'system', 'api', 'scheduler'
    actor_identifier TEXT, -- Username, API key ID, system process
    session_id TEXT,
    
    -- Target information
    target_type VARCHAR(100), -- 'training_module', 'user_progress', 'certificate'
    target_id UUID,
    target_identifier TEXT, -- Human-readable target reference
    
    -- Context information
    restaurant_id UUID,
    environment VARCHAR(50) DEFAULT 'production',
    application_version VARCHAR(50),
    
    -- Event details
    event_description TEXT NOT NULL,
    event_details JSONB DEFAULT '{}',
    before_state JSONB DEFAULT '{}',
    after_state JSONB DEFAULT '{}',
    
    -- Technical metadata
    request_id TEXT,
    http_method VARCHAR(10),
    endpoint_path TEXT,
    user_agent TEXT,
    client_ip INET,
    
    -- Data classification
    data_sensitivity data_sensitivity_level DEFAULT 'internal',
    contains_pii BOOLEAN DEFAULT false,
    contains_phi BOOLEAN DEFAULT false, -- Protected Health Information
    
    -- Risk assessment
    risk_score INTEGER DEFAULT 0, -- 0-100 scale
    risk_factors TEXT[] DEFAULT '{}',
    anomaly_detected BOOLEAN DEFAULT false,
    
    -- Compliance tracking
    retention_required_until DATE,
    legal_hold BOOLEAN DEFAULT false,
    compliance_tags TEXT[] DEFAULT '{}',
    
    -- Integrity and verification
    checksum VARCHAR(128) NOT NULL,
    digital_signature TEXT,
    verification_status VARCHAR(50) DEFAULT 'unverified',
    
    -- Processing status
    processed BOOLEAN DEFAULT false,
    indexed BOOLEAN DEFAULT false,
    exported BOOLEAN DEFAULT false,
    
    -- Temporal information
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingestion_timestamp TIMESTAMPTZ DEFAULT NOW(),
    processing_timestamp TIMESTAMPTZ,
    
    -- Lifecycle
    status audit_trail_status DEFAULT 'active',
    archived_at TIMESTAMPTZ,
    retention_expiry DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_audit_logs_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Audit trail investigations
CREATE TABLE IF NOT EXISTS training_audit_investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Investigation identification
    investigation_id VARCHAR(128) NOT NULL UNIQUE,
    case_number VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Investigation scope
    restaurant_id UUID,
    investigation_type VARCHAR(100) NOT NULL, -- 'security', 'compliance', 'fraud', 'operational'
    priority investigation_priority DEFAULT 'medium',
    
    -- Time scope
    investigation_start_date DATE NOT NULL,
    investigation_end_date DATE,
    event_period_start TIMESTAMPTZ,
    event_period_end TIMESTAMPTZ,
    
    -- Target scope
    target_users UUID[] DEFAULT '{}',
    target_modules UUID[] DEFAULT '{}',
    target_events audit_event_type[] DEFAULT '{}',
    
    -- Investigation details
    trigger_event_id VARCHAR(128),
    root_cause_hypothesis TEXT,
    investigation_methodology TEXT,
    evidence_collection_plan TEXT,
    
    -- Team and responsibilities
    lead_investigator UUID NOT NULL,
    investigation_team UUID[] DEFAULT '{}',
    external_parties TEXT[] DEFAULT '{}',
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'initiated', -- 'initiated', 'evidence_gathering', 'analysis', 'reporting', 'closed'
    progress_percentage INTEGER DEFAULT 0,
    milestones_completed INTEGER DEFAULT 0,
    total_milestones INTEGER DEFAULT 1,
    
    -- Findings
    preliminary_findings TEXT,
    final_findings TEXT,
    evidence_summary JSONB DEFAULT '{}',
    timeline_reconstruction JSONB DEFAULT '[]',
    
    -- Impact assessment
    affected_users_count INTEGER DEFAULT 0,
    affected_data_records BIGINT DEFAULT 0,
    business_impact_assessment TEXT,
    financial_impact DECIMAL(15,2) DEFAULT 0,
    
    -- Recommendations
    recommendations JSONB DEFAULT '[]',
    corrective_actions JSONB DEFAULT '[]',
    preventive_measures JSONB DEFAULT '[]',
    
    -- Legal and compliance
    legal_requirements TEXT[] DEFAULT '{}',
    regulatory_notifications_required BOOLEAN DEFAULT false,
    law_enforcement_involvement BOOLEAN DEFAULT false,
    external_reporting_required BOOLEAN DEFAULT false,
    
    -- Documentation
    evidence_files TEXT[] DEFAULT '{}',
    investigation_notes TEXT,
    final_report_path TEXT,
    
    -- Closure
    closed_at TIMESTAMPTZ,
    closure_reason VARCHAR(200),
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_due_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_audit_investigations_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_investigations_lead FOREIGN KEY (lead_investigator) REFERENCES auth_users(id),
    CONSTRAINT valid_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Training session audit details
CREATE TABLE IF NOT EXISTS training_session_audit_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session identification
    session_audit_id VARCHAR(128) NOT NULL UNIQUE,
    audit_log_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    
    -- User and training context
    user_id UUID NOT NULL,
    training_module_id UUID,
    training_section_id UUID,
    assessment_id UUID,
    
    -- Session lifecycle
    session_start_time TIMESTAMPTZ NOT NULL,
    session_end_time TIMESTAMPTZ,
    session_duration_seconds INTEGER,
    session_status VARCHAR(50) DEFAULT 'active',
    
    -- Interaction tracking
    page_views INTEGER DEFAULT 0,
    content_interactions INTEGER DEFAULT 0,
    assessment_interactions INTEGER DEFAULT 0,
    
    -- Navigation pattern
    navigation_path JSONB DEFAULT '[]',
    time_spent_per_section JSONB DEFAULT '{}',
    scroll_patterns JSONB DEFAULT '{}',
    
    -- Learning behavior
    reading_speed_wpm INTEGER,
    interaction_frequency DECIMAL(8,2),
    attention_span_seconds INTEGER,
    engagement_score DECIMAL(5,2) DEFAULT 0,
    
    -- Performance indicators
    comprehension_indicators JSONB DEFAULT '{}',
    difficulty_indicators JSONB DEFAULT '{}',
    help_seeking_behavior JSONB DEFAULT '{}',
    
    -- Device and environment
    device_info JSONB DEFAULT '{}',
    browser_info JSONB DEFAULT '{}',
    screen_resolution VARCHAR(20),
    connection_quality VARCHAR(20),
    
    -- Anomaly detection
    unusual_patterns TEXT[] DEFAULT '{}',
    suspicious_activity BOOLEAN DEFAULT false,
    fraud_indicators TEXT[] DEFAULT '{}',
    
    -- Compliance markers
    proctoring_enabled BOOLEAN DEFAULT false,
    identity_verified BOOLEAN DEFAULT false,
    location_verified BOOLEAN DEFAULT false,
    biometric_verification BOOLEAN DEFAULT false,
    
    -- Data integrity
    session_hash VARCHAR(128),
    tamper_evidence JSONB DEFAULT '{}',
    integrity_validated BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_session_audit_audit_log FOREIGN KEY (audit_log_id) REFERENCES training_audit_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_audit_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_session_audit_module FOREIGN KEY (training_module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_session_audit_section FOREIGN KEY (training_section_id) REFERENCES training_sections(id),
    CONSTRAINT valid_engagement_score CHECK (engagement_score >= 0 AND engagement_score <= 10)
);

-- Assessment integrity audit
CREATE TABLE IF NOT EXISTS training_assessment_audit_integrity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Assessment audit identification
    assessment_audit_id VARCHAR(128) NOT NULL UNIQUE,
    audit_log_id UUID NOT NULL,
    assessment_id UUID NOT NULL,
    
    -- Assessment context
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL,
    
    -- Integrity checks
    question_sequence_hash VARCHAR(128),
    answer_timing_hash VARCHAR(128),
    behavioral_pattern_hash VARCHAR(128),
    
    -- Timing analysis
    total_assessment_time_seconds INTEGER NOT NULL,
    time_per_question JSONB NOT NULL,
    unusual_timing_patterns TEXT[] DEFAULT '{}',
    
    -- Answer pattern analysis
    answer_change_frequency INTEGER DEFAULT 0,
    sequential_patterns TEXT[] DEFAULT '{}',
    response_confidence_indicators JSONB DEFAULT '{}',
    
    -- Behavioral indicators
    copy_paste_attempts INTEGER DEFAULT 0,
    tab_switch_count INTEGER DEFAULT 0,
    window_focus_changes INTEGER DEFAULT 0,
    browser_events JSONB DEFAULT '[]',
    
    -- Security events
    suspicious_activities TEXT[] DEFAULT '{}',
    security_violations INTEGER DEFAULT 0,
    cheating_indicators JSONB DEFAULT '{}',
    
    -- Environmental monitoring
    ip_address_changes INTEGER DEFAULT 0,
    location_changes INTEGER DEFAULT 0,
    device_changes INTEGER DEFAULT 0,
    network_anomalies TEXT[] DEFAULT '{}',
    
    -- Proctoring data (if enabled)
    webcam_monitoring_enabled BOOLEAN DEFAULT false,
    screen_recording_enabled BOOLEAN DEFAULT false,
    keystroke_monitoring_enabled BOOLEAN DEFAULT false,
    biometric_monitoring_enabled BOOLEAN DEFAULT false,
    
    -- AI-powered analysis
    ai_fraud_score DECIMAL(5,2) DEFAULT 0, -- 0-100 scale
    ai_confidence_level DECIMAL(5,2) DEFAULT 0,
    ai_detected_anomalies JSONB DEFAULT '[]',
    
    -- Verification results
    manual_review_required BOOLEAN DEFAULT false,
    manual_review_completed BOOLEAN DEFAULT false,
    manual_review_outcome VARCHAR(50),
    reviewer_notes TEXT,
    
    -- Final determination
    integrity_status VARCHAR(50) DEFAULT 'pending', -- 'verified', 'flagged', 'invalid'
    integrity_score DECIMAL(5,2) DEFAULT 100, -- 0-100 scale
    confidence_level DECIMAL(5,2) DEFAULT 50,
    
    -- Evidence preservation
    evidence_package JSONB DEFAULT '{}',
    forensic_hash VARCHAR(128),
    chain_of_custody JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_assessment_audit_audit_log FOREIGN KEY (audit_log_id) REFERENCES training_audit_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_audit_assessment FOREIGN KEY (assessment_id) REFERENCES training_assessments(id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_audit_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_assessment_audit_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT valid_ai_fraud_score CHECK (ai_fraud_score >= 0 AND ai_fraud_score <= 100),
    CONSTRAINT valid_integrity_score CHECK (integrity_score >= 0 AND integrity_score <= 100)
);

-- Certificate lifecycle audit
CREATE TABLE IF NOT EXISTS training_certificate_audit_lifecycle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Certificate audit identification
    certificate_audit_id VARCHAR(128) NOT NULL UNIQUE,
    audit_log_id UUID NOT NULL,
    certificate_id UUID NOT NULL,
    
    -- Certificate details
    certificate_number VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    
    -- Lifecycle event
    lifecycle_event VARCHAR(50) NOT NULL, -- 'issued', 'viewed', 'printed', 'shared', 'revoked', 'expired'
    event_timestamp TIMESTAMPTZ NOT NULL,
    event_actor UUID,
    
    -- Event context
    event_reason TEXT,
    event_details JSONB DEFAULT '{}',
    business_justification TEXT,
    
    -- Authorization and approval
    authorized_by UUID,
    approval_required BOOLEAN DEFAULT false,
    approval_obtained BOOLEAN DEFAULT false,
    approval_reference VARCHAR(100),
    
    -- Technical details
    certificate_version VARCHAR(20),
    certificate_template_version VARCHAR(20),
    digital_signature_status VARCHAR(50),
    
    -- Verification history
    verification_attempts INTEGER DEFAULT 0,
    last_verification_timestamp TIMESTAMPTZ,
    verification_sources TEXT[] DEFAULT '{}',
    
    -- Usage tracking
    access_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    print_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Integrity monitoring
    certificate_hash VARCHAR(128),
    template_hash VARCHAR(128),
    data_integrity_verified BOOLEAN DEFAULT true,
    
    -- Legal and compliance
    legal_validity_period INTERVAL,
    regulatory_requirements TEXT[] DEFAULT '{}',
    compliance_verified BOOLEAN DEFAULT false,
    
    -- Evidence and documentation
    supporting_evidence JSONB DEFAULT '{}',
    audit_trail_references TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_certificate_audit_audit_log FOREIGN KEY (audit_log_id) REFERENCES training_audit_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_certificate_audit_certificate FOREIGN KEY (certificate_id) REFERENCES training_certificates(id) ON DELETE CASCADE,
    CONSTRAINT fk_certificate_audit_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_certificate_audit_module FOREIGN KEY (module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_certificate_audit_actor FOREIGN KEY (event_actor) REFERENCES auth_users(id),
    CONSTRAINT fk_certificate_audit_authorized_by FOREIGN KEY (authorized_by) REFERENCES auth_users(id)
);

-- Compliance reporting audit
CREATE TABLE IF NOT EXISTS training_compliance_audit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Report identification
    compliance_report_id VARCHAR(128) NOT NULL UNIQUE,
    report_name VARCHAR(500) NOT NULL,
    report_type VARCHAR(100) NOT NULL, -- 'regulatory', 'internal', 'external', 'investigation'
    
    -- Report scope
    restaurant_id UUID,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    
    -- Compliance framework
    regulatory_framework VARCHAR(100), -- 'GDPR', 'HIPAA', 'SOX', 'ISO27001'
    compliance_requirements TEXT[] DEFAULT '{}',
    audit_standards TEXT[] DEFAULT '{}',
    
    -- Report generation
    generated_by UUID NOT NULL,
    generation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    generation_method VARCHAR(50) DEFAULT 'automated',
    
    -- Data sources
    audit_log_count BIGINT DEFAULT 0,
    date_range_covered INTERVAL,
    data_completeness_percentage DECIMAL(5,2) DEFAULT 100,
    
    -- Key metrics
    total_training_events BIGINT DEFAULT 0,
    total_users_audited INTEGER DEFAULT 0,
    total_assessments_audited INTEGER DEFAULT 0,
    total_certificates_audited INTEGER DEFAULT 0,
    
    -- Compliance findings
    compliance_violations INTEGER DEFAULT 0,
    security_incidents INTEGER DEFAULT 0,
    data_quality_issues INTEGER DEFAULT 0,
    policy_violations INTEGER DEFAULT 0,
    
    -- Risk assessment
    overall_risk_score DECIMAL(5,2) DEFAULT 0, -- 0-100 scale
    high_risk_findings INTEGER DEFAULT 0,
    medium_risk_findings INTEGER DEFAULT 0,
    low_risk_findings INTEGER DEFAULT 0,
    
    -- Recommendations
    recommendations_count INTEGER DEFAULT 0,
    critical_recommendations INTEGER DEFAULT 0,
    immediate_actions_required INTEGER DEFAULT 0,
    
    -- Report artifacts
    report_content JSONB NOT NULL,
    executive_summary TEXT,
    detailed_findings JSONB DEFAULT '[]',
    appendices JSONB DEFAULT '{}',
    
    -- Distribution and approval
    report_recipients TEXT[] DEFAULT '{}',
    approval_required BOOLEAN DEFAULT true,
    approved_by UUID,
    approval_timestamp TIMESTAMPTZ,
    
    -- Follow-up tracking
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_due_date DATE,
    remediation_plan_required BOOLEAN DEFAULT false,
    
    -- Archival and retention
    retention_period_years INTEGER DEFAULT 7,
    archived BOOLEAN DEFAULT false,
    archive_location TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_compliance_reports_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_compliance_reports_generated_by FOREIGN KEY (generated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_compliance_reports_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_overall_risk_score CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    CONSTRAINT valid_data_completeness CHECK (data_completeness_percentage >= 0 AND data_completeness_percentage <= 100)
);

-- ===========================================
-- AUDIT TRAIL INDEXES
-- ===========================================

-- Main audit logs indexes
CREATE UNIQUE INDEX idx_audit_logs_audit_id ON training_audit_logs(audit_id);
CREATE INDEX idx_audit_logs_event_type ON training_audit_logs(event_type);
CREATE INDEX idx_audit_logs_user ON training_audit_logs(user_id);
CREATE INDEX idx_audit_logs_restaurant ON training_audit_logs(restaurant_id);
CREATE INDEX idx_audit_logs_event_timestamp ON training_audit_logs(event_timestamp);
CREATE INDEX idx_audit_logs_correlation_id ON training_audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_target ON training_audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_session ON training_audit_logs(session_id);
CREATE INDEX idx_audit_logs_risk_score ON training_audit_logs(risk_score) WHERE risk_score > 50;
CREATE INDEX idx_audit_logs_anomaly ON training_audit_logs(anomaly_detected) WHERE anomaly_detected = true;
CREATE INDEX idx_audit_logs_status ON training_audit_logs(status);

-- Investigations indexes
CREATE UNIQUE INDEX idx_audit_investigations_investigation_id ON training_audit_investigations(investigation_id);
CREATE INDEX idx_audit_investigations_case_number ON training_audit_investigations(case_number);
CREATE INDEX idx_audit_investigations_restaurant ON training_audit_investigations(restaurant_id);
CREATE INDEX idx_audit_investigations_lead ON training_audit_investigations(lead_investigator);
CREATE INDEX idx_audit_investigations_status ON training_audit_investigations(status);
CREATE INDEX idx_audit_investigations_priority ON training_audit_investigations(priority);
CREATE INDEX idx_audit_investigations_date_range ON training_audit_investigations(investigation_start_date, investigation_end_date);

-- Session audit indexes
CREATE UNIQUE INDEX idx_session_audit_session_audit_id ON training_session_audit_details(session_audit_id);
CREATE INDEX idx_session_audit_audit_log ON training_session_audit_details(audit_log_id);
CREATE INDEX idx_session_audit_user ON training_session_audit_details(user_id);
CREATE INDEX idx_session_audit_session ON training_session_audit_details(session_id);
CREATE INDEX idx_session_audit_module ON training_session_audit_details(training_module_id);
CREATE INDEX idx_session_audit_suspicious ON training_session_audit_details(suspicious_activity) WHERE suspicious_activity = true;
CREATE INDEX idx_session_audit_start_time ON training_session_audit_details(session_start_time);

-- Assessment integrity indexes
CREATE UNIQUE INDEX idx_assessment_audit_assessment_audit_id ON training_assessment_audit_integrity(assessment_audit_id);
CREATE INDEX idx_assessment_audit_audit_log ON training_assessment_audit_integrity(audit_log_id);
CREATE INDEX idx_assessment_audit_assessment ON training_assessment_audit_integrity(assessment_id);
CREATE INDEX idx_assessment_audit_user ON training_assessment_audit_integrity(user_id);
CREATE INDEX idx_assessment_audit_integrity_status ON training_assessment_audit_integrity(integrity_status);
CREATE INDEX idx_assessment_audit_fraud_score ON training_assessment_audit_integrity(ai_fraud_score) WHERE ai_fraud_score > 70;
CREATE INDEX idx_assessment_audit_manual_review ON training_assessment_audit_integrity(manual_review_required) WHERE manual_review_required = true;

-- Certificate lifecycle indexes
CREATE UNIQUE INDEX idx_certificate_audit_certificate_audit_id ON training_certificate_audit_lifecycle(certificate_audit_id);
CREATE INDEX idx_certificate_audit_audit_log ON training_certificate_audit_lifecycle(audit_log_id);
CREATE INDEX idx_certificate_audit_certificate ON training_certificate_audit_lifecycle(certificate_id);
CREATE INDEX idx_certificate_audit_certificate_number ON training_certificate_audit_lifecycle(certificate_number);
CREATE INDEX idx_certificate_audit_user ON training_certificate_audit_lifecycle(user_id);
CREATE INDEX idx_certificate_audit_lifecycle_event ON training_certificate_audit_lifecycle(lifecycle_event);
CREATE INDEX idx_certificate_audit_event_timestamp ON training_certificate_audit_lifecycle(event_timestamp);

-- Compliance reports indexes
CREATE UNIQUE INDEX idx_compliance_reports_compliance_report_id ON training_compliance_audit_reports(compliance_report_id);
CREATE INDEX idx_compliance_reports_restaurant ON training_compliance_audit_reports(restaurant_id);
CREATE INDEX idx_compliance_reports_type ON training_compliance_audit_reports(report_type);
CREATE INDEX idx_compliance_reports_period ON training_compliance_audit_reports(reporting_period_start, reporting_period_end);
CREATE INDEX idx_compliance_reports_generated_by ON training_compliance_audit_reports(generated_by);
CREATE INDEX idx_compliance_reports_risk_score ON training_compliance_audit_reports(overall_risk_score);
CREATE INDEX idx_compliance_reports_approval ON training_compliance_audit_reports(approved_by, approval_timestamp);

-- JSONB indexes for complex queries
CREATE INDEX idx_audit_logs_event_details ON training_audit_logs USING GIN(event_details);
CREATE INDEX idx_audit_logs_before_state ON training_audit_logs USING GIN(before_state);
CREATE INDEX idx_audit_logs_after_state ON training_audit_logs USING GIN(after_state);
CREATE INDEX idx_session_audit_navigation_path ON training_session_audit_details USING GIN(navigation_path);
CREATE INDEX idx_assessment_audit_cheating_indicators ON training_assessment_audit_integrity USING GIN(cheating_indicators);
CREATE INDEX idx_compliance_reports_content ON training_compliance_audit_reports USING GIN(report_content);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on audit trail tables
ALTER TABLE training_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_audit_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_session_audit_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assessment_audit_integrity ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_certificate_audit_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_compliance_audit_reports ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Audit logs restaurant isolation"
ON training_audit_logs FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Audit investigations restaurant isolation"
ON training_audit_investigations FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Compliance reports restaurant isolation"
ON training_compliance_audit_reports FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- User access policies
CREATE POLICY "Session audit user access"
ON training_session_audit_details FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'auditor')
    )
);

CREATE POLICY "Assessment audit security access"
ON training_assessment_audit_integrity FOR ALL TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'auditor')
    )
);

CREATE POLICY "Certificate audit user access"
ON training_certificate_audit_lifecycle FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'auditor')
    )
);

-- ===========================================
-- AUDIT TRAIL FUNCTIONS
-- ===========================================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log_entry(
    p_event_type audit_event_type,
    p_event_category VARCHAR(100),
    p_event_description TEXT,
    p_user_id UUID DEFAULT NULL,
    p_target_type VARCHAR(100) DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_event_details JSONB DEFAULT '{}',
    p_before_state JSONB DEFAULT '{}',
    p_after_state JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    audit_uuid UUID;
    audit_id_text TEXT;
    event_id_text TEXT;
    user_restaurant_id UUID;
    calculated_checksum TEXT;
    calculated_risk_score INTEGER := 0;
BEGIN
    -- Generate unique identifiers
    audit_id_text := 'audit_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || encode(gen_random_bytes(8), 'hex');
    event_id_text := 'event_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || encode(gen_random_bytes(4), 'hex');
    
    -- Get user's restaurant
    IF p_user_id IS NOT NULL THEN
        SELECT restaurant_id INTO user_restaurant_id
        FROM auth_users WHERE id = p_user_id;
    END IF;
    
    -- Calculate risk score based on event type and details
    CASE p_event_type
        WHEN 'user_delete', 'module_delete', 'certificate_revoke' THEN
            calculated_risk_score := 80;
        WHEN 'permission_change', 'security_event', 'data_export' THEN
            calculated_risk_score := 70;
        WHEN 'backup_restore', 'system_config' THEN
            calculated_risk_score := 60;
        WHEN 'assessment_submit', 'certificate_issue' THEN
            calculated_risk_score := 40;
        WHEN 'user_login', 'module_access', 'section_view' THEN
            calculated_risk_score := 10;
        ELSE
            calculated_risk_score := 30;
    END CASE;
    
    -- Calculate checksum for integrity
    calculated_checksum := encode(
        sha256(
            (p_event_type::text || p_event_description || 
             COALESCE(p_user_id::text, '') || 
             COALESCE(p_target_id::text, '') ||
             p_event_details::text ||
             NOW()::text)::bytea
        ), 'hex'
    );
    
    -- Insert audit log entry
    INSERT INTO training_audit_logs (
        audit_id,
        event_id,
        event_type,
        event_category,
        event_description,
        user_id,
        target_type,
        target_id,
        restaurant_id,
        event_details,
        before_state,
        after_state,
        checksum,
        risk_score,
        event_timestamp
    ) VALUES (
        audit_id_text,
        event_id_text,
        p_event_type,
        p_event_category,
        p_event_description,
        p_user_id,
        p_target_type,
        p_target_id,
        user_restaurant_id,
        p_event_details,
        p_before_state,
        p_after_state,
        calculated_checksum,
        calculated_risk_score,
        NOW()
    ) RETURNING id INTO audit_uuid;
    
    RETURN audit_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze audit patterns
CREATE OR REPLACE FUNCTION analyze_audit_patterns(
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    pattern_analysis JSONB;
    event_frequency JSONB;
    risk_trends JSONB;
    anomaly_count INTEGER;
BEGIN
    -- Analyze event frequency patterns
    SELECT jsonb_object_agg(event_type, event_count)
    INTO event_frequency
    FROM (
        SELECT 
            event_type,
            COUNT(*) as event_count
        FROM training_audit_logs
        WHERE user_id = p_user_id
        AND event_timestamp >= NOW() - INTERVAL '1 day' * p_days_back
        GROUP BY event_type
        ORDER BY event_count DESC
    ) freq_data;
    
    -- Analyze risk score trends
    SELECT jsonb_build_object(
        'average_risk_score', ROUND(AVG(risk_score), 2),
        'max_risk_score', MAX(risk_score),
        'high_risk_events', COUNT(*) FILTER (WHERE risk_score > 70),
        'trend_direction', CASE 
            WHEN AVG(risk_score) FILTER (WHERE event_timestamp >= NOW() - INTERVAL '7 days') >
                 AVG(risk_score) FILTER (WHERE event_timestamp >= NOW() - INTERVAL '14 days' AND event_timestamp < NOW() - INTERVAL '7 days')
            THEN 'increasing'
            ELSE 'stable_or_decreasing'
        END
    )
    INTO risk_trends
    FROM training_audit_logs
    WHERE user_id = p_user_id
    AND event_timestamp >= NOW() - INTERVAL '1 day' * p_days_back;
    
    -- Count anomalies
    SELECT COUNT(*)
    INTO anomaly_count
    FROM training_audit_logs
    WHERE user_id = p_user_id
    AND anomaly_detected = true
    AND event_timestamp >= NOW() - INTERVAL '1 day' * p_days_back;
    
    -- Compile pattern analysis
    pattern_analysis := jsonb_build_object(
        'analysis_period_days', p_days_back,
        'event_frequency_distribution', event_frequency,
        'risk_analysis', risk_trends,
        'anomaly_count', anomaly_count,
        'behavioral_indicators', jsonb_build_object(
            'active_user', COALESCE(jsonb_extract_path_text(event_frequency, 'module_access')::INTEGER, 0) > 10,
            'assessment_focused', COALESCE(jsonb_extract_path_text(event_frequency, 'assessment_submit')::INTEGER, 0) > 5,
            'high_risk_activity', COALESCE(jsonb_extract_path_text(risk_trends, 'high_risk_events')::INTEGER, 0) > 0
        ),
        'analysis_timestamp', NOW()
    );
    
    RETURN pattern_analysis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate compliance report
CREATE OR REPLACE FUNCTION generate_compliance_audit_report(
    p_restaurant_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_report_type VARCHAR(100) DEFAULT 'regulatory'
)
RETURNS UUID AS $$
DECLARE
    report_uuid UUID;
    report_id_text TEXT;
    report_content JSONB;
    key_metrics RECORD;
    compliance_findings RECORD;
BEGIN
    -- Generate report ID
    report_id_text := 'compliance_' || p_report_type || '_' || 
                     EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
                     encode(gen_random_bytes(4), 'hex');
    
    -- Gather key metrics
    SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE event_type = 'assessment_submit') as assessments,
        COUNT(*) FILTER (WHERE event_type = 'certificate_issue') as certificates,
        COUNT(*) FILTER (WHERE risk_score > 70) as high_risk_events,
        COUNT(*) FILTER (WHERE anomaly_detected = true) as anomalies,
        ROUND(AVG(risk_score), 2) as avg_risk_score
    INTO key_metrics
    FROM training_audit_logs
    WHERE restaurant_id = p_restaurant_id
    AND DATE(event_timestamp) BETWEEN p_start_date AND p_end_date;
    
    -- Analyze compliance findings
    SELECT 
        COUNT(*) FILTER (WHERE event_type = 'security_event') as security_incidents,
        COUNT(*) FILTER (WHERE event_type = 'data_export') as data_exports,
        COUNT(*) FILTER (WHERE contains_pii = true) as pii_events,
        COUNT(*) FILTER (WHERE legal_hold = true) as legal_hold_events
    INTO compliance_findings
    FROM training_audit_logs
    WHERE restaurant_id = p_restaurant_id
    AND DATE(event_timestamp) BETWEEN p_start_date AND p_end_date;
    
    -- Build report content
    report_content := jsonb_build_object(
        'executive_summary', jsonb_build_object(
            'reporting_period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
            'total_events_analyzed', key_metrics.total_events,
            'unique_users_monitored', key_metrics.unique_users,
            'overall_risk_level', CASE 
                WHEN key_metrics.avg_risk_score > 60 THEN 'High'
                WHEN key_metrics.avg_risk_score > 30 THEN 'Medium'
                ELSE 'Low'
            END
        ),
        'training_activity_metrics', jsonb_build_object(
            'total_assessments', key_metrics.assessments,
            'certificates_issued', key_metrics.certificates,
            'completion_rate', CASE 
                WHEN key_metrics.assessments > 0 THEN 
                    ROUND((key_metrics.certificates::DECIMAL / key_metrics.assessments) * 100, 2)
                ELSE 0
            END
        ),
        'security_and_compliance', jsonb_build_object(
            'security_incidents', compliance_findings.security_incidents,
            'high_risk_events', key_metrics.high_risk_events,
            'anomalies_detected', key_metrics.anomalies,
            'data_export_events', compliance_findings.data_exports,
            'pii_related_events', compliance_findings.pii_events
        ),
        'recommendations', ARRAY[
            CASE WHEN key_metrics.high_risk_events > 10 THEN 
                'Review high-risk events and implement additional controls'
            END,
            CASE WHEN key_metrics.anomalies > 5 THEN 
                'Investigate detected anomalies for potential security issues'
            END,
            CASE WHEN compliance_findings.pii_events > 0 THEN 
                'Review PII handling procedures for compliance'
            END
        ]::TEXT[]
    );
    
    -- Insert compliance report
    INSERT INTO training_compliance_audit_reports (
        compliance_report_id,
        report_name,
        report_type,
        restaurant_id,
        reporting_period_start,
        reporting_period_end,
        generated_by,
        total_training_events,
        total_users_audited,
        total_assessments_audited,
        total_certificates_audited,
        compliance_violations,
        security_incidents,
        overall_risk_score,
        report_content,
        executive_summary
    ) VALUES (
        report_id_text,
        'Compliance Audit Report - ' || p_report_type || ' (' || p_start_date || ' to ' || p_end_date || ')',
        p_report_type,
        p_restaurant_id,
        p_start_date,
        p_end_date,
        auth.uid(),
        key_metrics.total_events,
        key_metrics.unique_users,
        key_metrics.assessments,
        key_metrics.certificates,
        key_metrics.high_risk_events,
        compliance_findings.security_incidents,
        key_metrics.avg_risk_score,
        report_content,
        jsonb_extract_path_text(report_content, 'executive_summary')
    ) RETURNING id INTO report_uuid;
    
    RETURN report_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- AUTOMATED AUDIT TRIGGERS
-- ===========================================

-- Trigger function for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    event_type_mapped audit_event_type;
    event_category_text VARCHAR(100);
    event_description_text TEXT;
    target_type_text VARCHAR(100);
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Map table and operation to event type
    CASE TG_TABLE_NAME
        WHEN 'training_modules' THEN
            target_type_text := 'training_module';
            CASE TG_OP
                WHEN 'INSERT' THEN event_type_mapped := 'module_create';
                WHEN 'UPDATE' THEN event_type_mapped := 'module_update';
                WHEN 'DELETE' THEN event_type_mapped := 'module_delete';
            END CASE;
        WHEN 'user_training_progress' THEN
            target_type_text := 'user_progress';
            event_type_mapped := 'progress_update';
        WHEN 'training_assessments' THEN
            target_type_text := 'training_assessment';
            CASE TG_OP
                WHEN 'INSERT' THEN event_type_mapped := 'assessment_start';
                WHEN 'UPDATE' THEN 
                    IF OLD.status != NEW.status AND NEW.status IN ('passed', 'failed') THEN
                        event_type_mapped := 'assessment_submit';
                    ELSE
                        event_type_mapped := 'progress_update';
                    END IF;
            END CASE;
        WHEN 'training_certificates' THEN
            target_type_text := 'training_certificate';
            CASE TG_OP
                WHEN 'INSERT' THEN event_type_mapped := 'certificate_issue';
                WHEN 'UPDATE' THEN 
                    IF OLD.status != NEW.status AND NEW.status = 'revoked' THEN
                        event_type_mapped := 'certificate_revoke';
                    ELSE
                        event_type_mapped := 'module_update';
                    END IF;
            END CASE;
        ELSE
            target_type_text := TG_TABLE_NAME;
            event_type_mapped := 'system_config';
    END CASE;
    
    -- Set event category and description
    event_category_text := 'training_system';
    event_description_text := TG_OP || ' operation on ' || TG_TABLE_NAME;
    
    -- Create audit log entry
    PERFORM create_audit_log_entry(
        event_type_mapped,
        event_category_text,
        event_description_text,
        current_user_id,
        target_type_text,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'operation', TG_OP,
            'table_name', TG_TABLE_NAME,
            'timestamp', NOW()
        ),
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE '{}'::jsonb END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE '{}'::jsonb END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER training_modules_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON training_modules
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER user_training_progress_audit_trigger
    AFTER INSERT OR UPDATE ON user_training_progress
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER training_assessments_audit_trigger
    AFTER INSERT OR UPDATE ON training_assessments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER training_certificates_audit_trigger
    AFTER INSERT OR UPDATE ON training_certificates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Trigger for updated_at columns
CREATE TRIGGER update_audit_investigations_updated_at
    BEFORE UPDATE ON training_audit_investigations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_audit_integrity_updated_at
    BEFORE UPDATE ON training_assessment_audit_integrity
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_audit_reports_updated_at
    BEFORE UPDATE ON training_compliance_audit_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_audit_logs IS 'Comprehensive audit trail system for all training activities with risk assessment and compliance tracking';
COMMENT ON TABLE training_audit_investigations IS 'Investigation management for audit trail analysis and incident response';
COMMENT ON TABLE training_session_audit_details IS 'Detailed session tracking for learning behavior analysis and fraud detection';
COMMENT ON TABLE training_assessment_audit_integrity IS 'Assessment integrity monitoring with behavioral analysis and cheating detection';
COMMENT ON TABLE training_certificate_audit_lifecycle IS 'Complete certificate lifecycle audit with verification and compliance tracking';
COMMENT ON TABLE training_compliance_audit_reports IS 'Automated compliance reporting with regulatory framework support';

-- Performance optimization
ANALYZE training_audit_logs;
ANALYZE training_audit_investigations;
ANALYZE training_session_audit_details;
ANALYZE training_assessment_audit_integrity;
ANALYZE training_certificate_audit_lifecycle;
ANALYZE training_compliance_audit_reports;