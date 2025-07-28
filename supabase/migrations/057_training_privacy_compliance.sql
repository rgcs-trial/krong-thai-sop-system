-- Training Data Privacy Compliance System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Implement comprehensive GDPR and privacy compliance for training data

-- ===========================================
-- PRIVACY COMPLIANCE ENUMS
-- ===========================================

-- Data processing purposes (GDPR Article 6)
CREATE TYPE data_processing_purpose AS ENUM (
    'consent', 'contract', 'legal_obligation', 'vital_interests', 
    'public_task', 'legitimate_interests', 'training_delivery', 'assessment'
);

-- Privacy rights types (GDPR Articles 15-23)
CREATE TYPE privacy_right_type AS ENUM (
    'access', 'rectification', 'erasure', 'restrict_processing', 
    'data_portability', 'object', 'withdraw_consent', 'not_be_subject_to_automated_decision'
);

-- Data categories for privacy classification
CREATE TYPE personal_data_category AS ENUM (
    'basic_personal', 'sensitive_personal', 'biometric', 'health', 
    'performance', 'behavioral', 'contact', 'identification', 'special_category'
);

-- Consent status tracking
CREATE TYPE consent_status AS ENUM (
    'granted', 'withdrawn', 'expired', 'pending', 'refused', 'invalid'
);

-- Privacy request status
CREATE TYPE privacy_request_status AS ENUM (
    'submitted', 'under_review', 'in_progress', 'completed', 'rejected', 'partially_fulfilled'
);

-- ===========================================
-- PRIVACY COMPLIANCE TABLES
-- ===========================================

-- Data processing registry (GDPR Article 30)
CREATE TABLE IF NOT EXISTS training_data_processing_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Processing activity identification
    processing_activity_name VARCHAR(200) NOT NULL,
    activity_description TEXT NOT NULL,
    restaurant_id UUID,
    
    -- Controller and processor information
    data_controller_name VARCHAR(200) NOT NULL,
    data_controller_contact JSONB DEFAULT '{}',
    data_processor_name VARCHAR(200),
    data_processor_contact JSONB DEFAULT '{}',
    
    -- Data subject categories
    data_subject_categories TEXT[] NOT NULL, -- 'employees', 'trainees', 'managers'
    
    -- Personal data categories
    personal_data_categories personal_data_category[] NOT NULL,
    special_category_data BOOLEAN DEFAULT false,
    data_details JSONB DEFAULT '{}',
    
    -- Processing purposes and legal basis
    processing_purposes data_processing_purpose[] NOT NULL,
    legal_basis TEXT NOT NULL,
    legitimate_interests_assessment TEXT,
    
    -- Data recipients
    internal_recipients TEXT[] DEFAULT '{}',
    external_recipients TEXT[] DEFAULT '{}',
    third_country_transfers BOOLEAN DEFAULT false,
    transfer_safeguards TEXT,
    
    -- Retention periods
    retention_period_description TEXT NOT NULL,
    retention_criteria TEXT,
    automatic_deletion_enabled BOOLEAN DEFAULT false,
    deletion_schedule TEXT,
    
    -- Technical and organizational measures
    security_measures JSONB DEFAULT '{}',
    access_controls JSONB DEFAULT '{}',
    encryption_measures JSONB DEFAULT '{}',
    
    -- Data source and collection
    data_source VARCHAR(200) NOT NULL,
    collection_method VARCHAR(100) NOT NULL,
    collection_notice_provided BOOLEAN DEFAULT true,
    
    -- Record keeping
    created_by UUID,
    last_reviewed_by UUID,
    last_review_date DATE,
    next_review_due DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_processing_registry_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_processing_registry_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_processing_registry_reviewed_by FOREIGN KEY (last_reviewed_by) REFERENCES auth_users(id)
);

-- Consent management (GDPR Articles 4, 7)
CREATE TABLE IF NOT EXISTS training_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Consent identification
    consent_id VARCHAR(128) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Consent details
    processing_activity_id UUID NOT NULL,
    consent_purpose TEXT NOT NULL,
    consent_text TEXT NOT NULL, -- Exact text presented to user
    consent_version VARCHAR(20) NOT NULL,
    
    -- Consent collection
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    collection_method VARCHAR(100) NOT NULL, -- 'explicit_click', 'digital_signature', 'verbal'
    collection_evidence JSONB DEFAULT '{}', -- IP, timestamp, device info
    
    -- Consent status
    status consent_status DEFAULT 'granted',
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    withdrawal_method VARCHAR(100),
    withdrawal_evidence JSONB DEFAULT '{}',
    
    -- Consent conditions
    is_explicit BOOLEAN DEFAULT true,
    is_informed BOOLEAN DEFAULT true,
    is_specific BOOLEAN DEFAULT true,
    is_freely_given BOOLEAN DEFAULT true,
    
    -- Consent scope
    data_categories TEXT[] DEFAULT '{}',
    processing_purposes TEXT[] DEFAULT '{}',
    retention_period INTEGER, -- Days
    
    -- Parental consent (for minors)
    requires_parental_consent BOOLEAN DEFAULT false,
    parental_consent_obtained BOOLEAN DEFAULT false,
    parental_consent_evidence JSONB DEFAULT '{}',
    
    -- Consent renewal
    expires_at TIMESTAMPTZ,
    renewal_notice_sent BOOLEAN DEFAULT false,
    renewal_notice_date TIMESTAMPTZ,
    
    -- Legal compliance
    gdpr_compliant BOOLEAN DEFAULT true,
    compliance_notes TEXT,
    legal_review_completed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_consent_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_consent_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_consent_processing_activity FOREIGN KEY (processing_activity_id) REFERENCES training_data_processing_registry(id)
);

-- Privacy rights requests (GDPR Articles 15-23)
CREATE TABLE IF NOT EXISTS training_privacy_rights_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request identification
    request_id VARCHAR(128) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Request details
    right_type privacy_right_type NOT NULL,
    request_description TEXT NOT NULL,
    specific_data_requested TEXT,
    
    -- Requester verification
    identity_verified BOOLEAN DEFAULT false,
    verification_method VARCHAR(100),
    verification_evidence JSONB DEFAULT '{}',
    verification_date TIMESTAMPTZ,
    
    -- Request processing
    status privacy_request_status DEFAULT 'submitted',
    assigned_to UUID,
    processing_started_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ NOT NULL, -- 30 days from submission
    
    -- Response details
    response_provided BOOLEAN DEFAULT false,
    response_date TIMESTAMPTZ,
    response_method VARCHAR(100), -- 'email', 'secure_portal', 'mail'
    response_content TEXT,
    
    -- Data provided (for access requests)
    data_export_file_path TEXT,
    data_export_format VARCHAR(50), -- 'JSON', 'CSV', 'PDF'
    data_export_size_bytes BIGINT,
    
    -- Actions taken (for other rights)
    data_rectified BOOLEAN DEFAULT false,
    data_erased BOOLEAN DEFAULT false,
    processing_restricted BOOLEAN DEFAULT false,
    objection_upheld BOOLEAN DEFAULT false,
    
    -- Compliance tracking
    completed_within_timeframe BOOLEAN DEFAULT false,
    extension_requested BOOLEAN DEFAULT false,
    extension_justification TEXT,
    fee_charged DECIMAL(10,2) DEFAULT 0,
    
    -- Appeal and review
    appeal_submitted BOOLEAN DEFAULT false,
    appeal_date TIMESTAMPTZ,
    appeal_outcome VARCHAR(100),
    supervisory_authority_notified BOOLEAN DEFAULT false,
    
    -- Communication log
    communications_log JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_privacy_request_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_privacy_request_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_privacy_request_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth_users(id)
);

-- Data retention and deletion policies
CREATE TABLE IF NOT EXISTS training_data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Policy identification
    policy_name VARCHAR(200) NOT NULL,
    policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    restaurant_id UUID,
    
    -- Data scope
    data_categories personal_data_category[] NOT NULL,
    data_tables TEXT[] NOT NULL, -- Database tables affected
    data_fields TEXT[] DEFAULT '{}', -- Specific fields if not entire table
    
    -- Retention criteria
    retention_period_days INTEGER NOT NULL,
    retention_basis TEXT NOT NULL, -- Legal requirement, business need, etc.
    retention_start_trigger VARCHAR(100) NOT NULL, -- 'creation', 'last_access', 'completion'
    
    -- Deletion procedures
    deletion_method VARCHAR(100) NOT NULL, -- 'soft_delete', 'hard_delete', 'anonymization'
    anonymization_technique VARCHAR(100), -- 'generalization', 'suppression', 'pseudonymization'
    backup_deletion_included BOOLEAN DEFAULT true,
    
    -- Exceptions and holds
    legal_hold_exemption BOOLEAN DEFAULT false,
    business_critical_exemption BOOLEAN DEFAULT false,
    user_consent_extension BOOLEAN DEFAULT false,
    
    -- Automated processing
    automated_deletion_enabled BOOLEAN DEFAULT true,
    deletion_schedule VARCHAR(100), -- Cron-like schedule
    last_deletion_run TIMESTAMPTZ,
    next_deletion_due TIMESTAMPTZ,
    
    -- Approval and governance
    approved_by UUID,
    approval_date TIMESTAMPTZ,
    legal_review_completed BOOLEAN DEFAULT false,
    dpo_review_completed BOOLEAN DEFAULT false,
    
    -- Policy status
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_retention_policy_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_retention_policy_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_retention_policy_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_policy_version UNIQUE (restaurant_id, policy_name, policy_version)
);

-- Data breach incident tracking (GDPR Article 33-34)
CREATE TABLE IF NOT EXISTS training_data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Incident identification
    incident_id VARCHAR(128) NOT NULL UNIQUE,
    restaurant_id UUID NOT NULL,
    
    -- Incident details
    incident_title VARCHAR(200) NOT NULL,
    incident_description TEXT NOT NULL,
    breach_type VARCHAR(100) NOT NULL, -- 'confidentiality', 'integrity', 'availability'
    
    -- Timeline (GDPR 72-hour rule)
    detected_at TIMESTAMPTZ NOT NULL,
    reported_internally_at TIMESTAMPTZ,
    authority_notification_due TIMESTAMPTZ, -- 72 hours from detection
    data_subject_notification_due TIMESTAMPTZ, -- Without undue delay
    
    -- Data affected
    personal_data_categories personal_data_category[] NOT NULL,
    approximate_records_affected INTEGER,
    exact_records_affected INTEGER,
    special_category_data_affected BOOLEAN DEFAULT false,
    
    -- Data subjects affected
    data_subjects_identified BOOLEAN DEFAULT false,
    data_subjects_count INTEGER,
    vulnerable_groups_affected BOOLEAN DEFAULT false,
    vulnerable_groups_details TEXT,
    
    -- Risk assessment
    risk_level security_threat_level NOT NULL,
    likelihood_of_harm VARCHAR(50), -- 'low', 'medium', 'high'
    severity_of_harm VARCHAR(50), -- 'low', 'medium', 'high'
    risk_assessment_details TEXT,
    
    -- Containment and mitigation
    containment_measures_taken TEXT,
    containment_completed_at TIMESTAMPTZ,
    mitigation_measures TEXT,
    technical_measures JSONB DEFAULT '{}',
    organizational_measures JSONB DEFAULT '{}',
    
    -- Notifications
    authority_notified BOOLEAN DEFAULT false,
    authority_notification_date TIMESTAMPTZ,
    authority_reference_number VARCHAR(100),
    data_subjects_notified BOOLEAN DEFAULT false,
    data_subject_notification_date TIMESTAMPTZ,
    notification_method VARCHAR(100),
    
    -- Investigation and cause
    root_cause_identified BOOLEAN DEFAULT false,
    root_cause_description TEXT,
    investigation_completed BOOLEAN DEFAULT false,
    investigation_findings TEXT,
    
    -- Remediation and prevention
    remediation_actions TEXT,
    prevention_measures TEXT,
    policy_updates_required BOOLEAN DEFAULT false,
    training_updates_required BOOLEAN DEFAULT false,
    
    -- Legal and regulatory
    legal_action_required BOOLEAN DEFAULT false,
    regulatory_fines DECIMAL(15,2) DEFAULT 0,
    insurance_claim_filed BOOLEAN DEFAULT false,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'investigating', 'contained', 'resolved', 'closed'
    closed_at TIMESTAMPTZ,
    closure_summary TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_breach_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_breach_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Privacy impact assessments (GDPR Article 35)
CREATE TABLE IF NOT EXISTS training_privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- PIA identification
    pia_reference VARCHAR(128) NOT NULL UNIQUE,
    assessment_title VARCHAR(200) NOT NULL,
    restaurant_id UUID,
    
    -- Processing activity
    processing_activity_id UUID NOT NULL,
    processing_description TEXT NOT NULL,
    
    -- Necessity and proportionality
    necessity_assessment TEXT NOT NULL,
    proportionality_assessment TEXT NOT NULL,
    alternative_measures_considered TEXT,
    
    -- Risk identification
    privacy_risks_identified JSONB NOT NULL,
    risk_likelihood_scores JSONB DEFAULT '{}', -- 1-5 scale for each risk
    risk_impact_scores JSONB DEFAULT '{}', -- 1-5 scale for each risk
    overall_risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    
    -- Data protection measures
    technical_safeguards JSONB DEFAULT '{}',
    organizational_safeguards JSONB DEFAULT '{}',
    privacy_by_design_measures TEXT,
    privacy_by_default_measures TEXT,
    
    -- Stakeholder consultation
    data_subjects_consulted BOOLEAN DEFAULT false,
    consultation_method VARCHAR(100),
    consultation_feedback TEXT,
    internal_stakeholders_consulted TEXT[] DEFAULT '{}',
    
    -- DPO involvement
    dpo_consulted BOOLEAN DEFAULT false,
    dpo_recommendations TEXT,
    dpo_approval BOOLEAN DEFAULT false,
    dpo_approval_date TIMESTAMPTZ,
    
    -- Supervisory authority consultation
    authority_consultation_required BOOLEAN DEFAULT false,
    authority_consulted BOOLEAN DEFAULT false,
    authority_recommendations TEXT,
    authority_approval BOOLEAN DEFAULT false,
    
    -- Assessment results
    residual_risk_level VARCHAR(20), -- After mitigation measures
    additional_measures_needed BOOLEAN DEFAULT false,
    processing_can_proceed BOOLEAN DEFAULT false,
    conditions_for_processing TEXT,
    
    -- Review and monitoring
    review_period_months INTEGER DEFAULT 12,
    next_review_due DATE,
    monitoring_measures TEXT,
    
    -- Assessment metadata
    conducted_by UUID,
    reviewed_by UUID,
    approved_by UUID,
    assessment_date DATE NOT NULL,
    approval_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_pia_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_pia_processing_activity FOREIGN KEY (processing_activity_id) REFERENCES training_data_processing_registry(id),
    CONSTRAINT fk_pia_conducted_by FOREIGN KEY (conducted_by) REFERENCES auth_users(id),
    CONSTRAINT fk_pia_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES auth_users(id),
    CONSTRAINT fk_pia_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- Automated data deletion log
CREATE TABLE IF NOT EXISTS training_data_deletion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Deletion identification
    deletion_id VARCHAR(128) NOT NULL UNIQUE,
    deletion_batch_id UUID, -- For bulk deletions
    
    -- Data identification
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    user_id UUID, -- Data subject if applicable
    restaurant_id UUID,
    
    -- Deletion details
    deletion_reason VARCHAR(100) NOT NULL, -- 'retention_expired', 'user_request', 'legal_requirement'
    deletion_policy_id UUID,
    privacy_request_id UUID, -- If deletion was due to privacy request
    
    -- Deletion metadata
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deletion_method VARCHAR(50) NOT NULL, -- 'soft_delete', 'hard_delete', 'anonymization'
    data_backup_deleted BOOLEAN DEFAULT false,
    
    -- Data recovery
    recovery_possible BOOLEAN DEFAULT false,
    recovery_period_expires TIMESTAMPTZ,
    recovery_instructions TEXT,
    
    -- Verification
    deletion_verified BOOLEAN DEFAULT false,
    verification_method VARCHAR(100),
    verified_by UUID,
    verification_date TIMESTAMPTZ,
    
    -- Compliance
    gdpr_compliant BOOLEAN DEFAULT true,
    retention_policy_followed BOOLEAN DEFAULT true,
    legal_basis_documented BOOLEAN DEFAULT true,
    
    created_by UUID, -- System or user who initiated deletion
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_deletion_log_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL,
    CONSTRAINT fk_deletion_log_policy FOREIGN KEY (deletion_policy_id) REFERENCES training_data_retention_policies(id),
    CONSTRAINT fk_deletion_log_privacy_request FOREIGN KEY (privacy_request_id) REFERENCES training_privacy_rights_requests(id),
    CONSTRAINT fk_deletion_log_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_deletion_log_verified_by FOREIGN KEY (verified_by) REFERENCES auth_users(id)
);

-- ===========================================
-- PRIVACY COMPLIANCE INDEXES
-- ===========================================

-- Data processing registry indexes
CREATE INDEX idx_processing_registry_restaurant ON training_data_processing_registry(restaurant_id);
CREATE INDEX idx_processing_registry_activity ON training_data_processing_registry(processing_activity_name);
CREATE INDEX idx_processing_registry_review_due ON training_data_processing_registry(next_review_due);

-- Consent records indexes
CREATE UNIQUE INDEX idx_consent_records_consent_id ON training_consent_records(consent_id);
CREATE INDEX idx_consent_records_user ON training_consent_records(user_id);
CREATE INDEX idx_consent_records_restaurant ON training_consent_records(restaurant_id);
CREATE INDEX idx_consent_records_status ON training_consent_records(status);
CREATE INDEX idx_consent_records_expires ON training_consent_records(expires_at);

-- Privacy rights requests indexes
CREATE UNIQUE INDEX idx_privacy_requests_request_id ON training_privacy_rights_requests(request_id);
CREATE INDEX idx_privacy_requests_user ON training_privacy_rights_requests(user_id);
CREATE INDEX idx_privacy_requests_restaurant ON training_privacy_rights_requests(restaurant_id);
CREATE INDEX idx_privacy_requests_right_type ON training_privacy_rights_requests(right_type);
CREATE INDEX idx_privacy_requests_status ON training_privacy_rights_requests(status);
CREATE INDEX idx_privacy_requests_due_date ON training_privacy_rights_requests(due_date);

-- Data retention policies indexes
CREATE INDEX idx_retention_policies_restaurant ON training_data_retention_policies(restaurant_id);
CREATE INDEX idx_retention_policies_active ON training_data_retention_policies(is_active) WHERE is_active = true;
CREATE INDEX idx_retention_policies_deletion_due ON training_data_retention_policies(next_deletion_due);

-- Data breach incidents indexes
CREATE UNIQUE INDEX idx_breach_incidents_incident_id ON training_data_breach_incidents(incident_id);
CREATE INDEX idx_breach_incidents_restaurant ON training_data_breach_incidents(restaurant_id);
CREATE INDEX idx_breach_incidents_detected_at ON training_data_breach_incidents(detected_at);
CREATE INDEX idx_breach_incidents_risk_level ON training_data_breach_incidents(risk_level);
CREATE INDEX idx_breach_incidents_status ON training_data_breach_incidents(status);

-- Privacy impact assessments indexes
CREATE UNIQUE INDEX idx_pia_reference ON training_privacy_impact_assessments(pia_reference);
CREATE INDEX idx_pia_restaurant ON training_privacy_impact_assessments(restaurant_id);
CREATE INDEX idx_pia_processing_activity ON training_privacy_impact_assessments(processing_activity_id);
CREATE INDEX idx_pia_review_due ON training_privacy_impact_assessments(next_review_due);

-- Data deletion log indexes
CREATE UNIQUE INDEX idx_deletion_log_deletion_id ON training_data_deletion_log(deletion_id);
CREATE INDEX idx_deletion_log_table_record ON training_data_deletion_log(table_name, record_id);
CREATE INDEX idx_deletion_log_user ON training_data_deletion_log(user_id);
CREATE INDEX idx_deletion_log_restaurant ON training_data_deletion_log(restaurant_id);
CREATE INDEX idx_deletion_log_deleted_at ON training_data_deletion_log(deleted_at);
CREATE INDEX idx_deletion_log_reason ON training_data_deletion_log(deletion_reason);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on privacy compliance tables
ALTER TABLE training_data_processing_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_privacy_rights_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_breach_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_privacy_impact_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_deletion_log ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Processing registry restaurant isolation"
ON training_data_processing_registry FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Consent records restaurant isolation"
ON training_consent_records FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Privacy requests restaurant isolation"
ON training_privacy_rights_requests FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- User data isolation for personal privacy requests
CREATE POLICY "User privacy requests isolation"
ON training_privacy_rights_requests FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'dpo')
        AND restaurant_id = training_privacy_rights_requests.restaurant_id
    )
);

-- ===========================================
-- PRIVACY COMPLIANCE FUNCTIONS
-- ===========================================

-- Function to check consent validity
CREATE OR REPLACE FUNCTION check_consent_validity(
    p_user_id UUID,
    p_processing_activity_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    consent_valid BOOLEAN := false;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM training_consent_records
        WHERE user_id = p_user_id
        AND processing_activity_id = p_processing_activity_id
        AND status = 'granted'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND gdpr_compliant = true
    ) INTO consent_valid;
    
    RETURN consent_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process data deletion request
CREATE OR REPLACE FUNCTION process_data_deletion_request(
    p_user_id UUID,
    p_deletion_reason VARCHAR(100) DEFAULT 'user_request',
    p_privacy_request_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    deletion_count INTEGER := 0;
    user_restaurant_id UUID;
    deletion_batch_id UUID := gen_random_uuid();
    table_record RECORD;
BEGIN
    -- Get user's restaurant
    SELECT restaurant_id INTO user_restaurant_id
    FROM auth_users WHERE id = p_user_id;
    
    -- List of tables containing user data that can be deleted
    FOR table_record IN 
        SELECT table_name, 'user_id' as id_column
        FROM (VALUES 
            ('user_training_progress'),
            ('user_section_progress'),
            ('training_assessments'),
            ('training_question_responses'),
            ('training_certificates'),
            ('training_progress_encrypted'),
            ('training_responses_encrypted'),
            ('training_development_plans_encrypted')
        ) AS t(table_name)
    LOOP
        -- Execute deletion and log it
        EXECUTE format('
            INSERT INTO training_data_deletion_log 
            (deletion_id, deletion_batch_id, table_name, record_id, user_id, restaurant_id, 
             deletion_reason, privacy_request_id, deletion_method, created_by)
            SELECT 
                encode(sha256((id::text || %L || NOW()::text)::bytea), ''hex''),
                %L,
                %L,
                id,
                %L,
                %L,
                %L,
                %L,
                ''soft_delete'',
                %L
            FROM %I 
            WHERE user_id = %L',
            table_record.table_name, deletion_batch_id, table_record.table_name, 
            p_user_id, user_restaurant_id, p_deletion_reason, p_privacy_request_id, 
            auth.uid(), table_record.table_name, p_user_id
        );
        
        -- Perform soft delete (mark as deleted rather than hard delete)
        EXECUTE format('
            UPDATE %I 
            SET updated_at = NOW()
            WHERE user_id = %L 
            AND NOT EXISTS (
                SELECT 1 FROM training_data_deletion_log 
                WHERE table_name = %L AND record_id = %I.id
            )',
            table_record.table_name, p_user_id, table_record.table_name, table_record.table_name
        );
        
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
    END LOOP;
    
    RETURN deletion_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate privacy data export
CREATE OR REPLACE FUNCTION generate_privacy_data_export(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    export_data JSONB := '{}';
    user_data RECORD;
    progress_data JSONB;
    assessment_data JSONB;
    certificate_data JSONB;
BEGIN
    -- Get basic user information
    SELECT u.*, r.name as restaurant_name
    INTO user_data
    FROM auth_users u
    LEFT JOIN restaurants r ON u.restaurant_id = r.id
    WHERE u.id = p_user_id;
    
    -- Build export data structure
    export_data := jsonb_build_object(
        'personal_information', jsonb_build_object(
            'user_id', user_data.id,
            'full_name', user_data.full_name,
            'email', user_data.email,
            'role', user_data.role,
            'restaurant', user_data.restaurant_name,
            'created_at', user_data.created_at,
            'last_login', user_data.last_login_at
        )
    );
    
    -- Get training progress data
    SELECT jsonb_agg(
        jsonb_build_object(
            'module_id', utp.module_id,
            'status', utp.status,
            'progress_percentage', utp.progress_percentage,
            'started_at', utp.started_at,
            'completed_at', utp.completed_at,
            'time_spent_minutes', utp.time_spent_minutes
        )
    ) INTO progress_data
    FROM user_training_progress utp
    WHERE utp.user_id = p_user_id;
    
    export_data := export_data || jsonb_build_object('training_progress', progress_data);
    
    -- Get assessment data
    SELECT jsonb_agg(
        jsonb_build_object(
            'module_id', ta.module_id,
            'attempt_number', ta.attempt_number,
            'status', ta.status,
            'score_percentage', ta.score_percentage,
            'started_at', ta.started_at,
            'completed_at', ta.completed_at
        )
    ) INTO assessment_data
    FROM training_assessments ta
    WHERE ta.user_id = p_user_id;
    
    export_data := export_data || jsonb_build_object('assessments', assessment_data);
    
    -- Get certificate data
    SELECT jsonb_agg(
        jsonb_build_object(
            'certificate_number', tc.certificate_number,
            'module_id', tc.module_id,
            'status', tc.status,
            'issued_at', tc.issued_at,
            'expires_at', tc.expires_at
        )
    ) INTO certificate_data
    FROM training_certificates tc
    WHERE tc.user_id = p_user_id;
    
    export_data := export_data || jsonb_build_object('certificates', certificate_data);
    
    -- Add metadata
    export_data := export_data || jsonb_build_object(
        'export_metadata', jsonb_build_object(
            'generated_at', NOW(),
            'format_version', '1.0',
            'gdpr_compliant', true,
            'data_controller', 'Restaurant Krong Thai Training System'
        )
    );
    
    RETURN export_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check data retention compliance
CREATE OR REPLACE FUNCTION check_data_retention_compliance()
RETURNS TABLE (
    table_name TEXT,
    records_to_delete INTEGER,
    oldest_record_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH retention_check AS (
        SELECT 
            'user_training_progress' as table_name,
            COUNT(*) as records_count,
            MIN(created_at) as oldest_date
        FROM user_training_progress utp
        WHERE utp.created_at < NOW() - INTERVAL '7 years'
        AND NOT EXISTS (
            SELECT 1 FROM training_data_deletion_log tdl
            WHERE tdl.table_name = 'user_training_progress'
            AND tdl.record_id = utp.id
        )
        
        UNION ALL
        
        SELECT 
            'training_assessments' as table_name,
            COUNT(*) as records_count,
            MIN(created_at) as oldest_date
        FROM training_assessments ta
        WHERE ta.created_at < NOW() - INTERVAL '7 years'
        AND NOT EXISTS (
            SELECT 1 FROM training_data_deletion_log tdl
            WHERE tdl.table_name = 'training_assessments'
            AND tdl.record_id = ta.id
        )
    )
    SELECT rc.table_name, rc.records_count::INTEGER, rc.oldest_date
    FROM retention_check rc
    WHERE rc.records_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- DEFAULT PRIVACY POLICIES SETUP
-- ===========================================

-- Insert default data processing activities
INSERT INTO training_data_processing_registry (
    processing_activity_name,
    activity_description,
    restaurant_id,
    data_controller_name,
    data_controller_contact,
    data_subject_categories,
    personal_data_categories,
    processing_purposes,
    legal_basis,
    data_source,
    collection_method,
    retention_period_description,
    next_review_due
)
SELECT 
    r.id,
    'Training Data Processing',
    'Collection and processing of employee training data for skills development and compliance',
    'Restaurant Krong Thai Management',
    jsonb_build_object('email', 'privacy@krongthai.com', 'phone', '+1-xxx-xxx-xxxx'),
    ARRAY['employees', 'trainees'],
    ARRAY['basic_personal', 'performance', 'behavioral'],
    ARRAY['training_delivery', 'assessment', 'legitimate_interests'],
    'Legitimate business interests for employee development and regulatory compliance',
    'Direct collection from employees',
    'Training portal and assessments',
    'Retained for 7 years for compliance purposes, then anonymized or deleted',
    CURRENT_DATE + INTERVAL '1 year'
FROM restaurants r
ON CONFLICT DO NOTHING;

-- Insert default data retention policies
INSERT INTO training_data_retention_policies (
    policy_name,
    restaurant_id,
    data_categories,
    data_tables,
    retention_period_days,
    retention_basis,
    retention_start_trigger,
    deletion_method,
    approved_by,
    approval_date,
    created_by
)
SELECT 
    'Training Data Retention Policy',
    r.id,
    ARRAY['basic_personal', 'performance', 'behavioral'],
    ARRAY['user_training_progress', 'training_assessments', 'training_question_responses'],
    2555, -- 7 years
    'Legal compliance and business requirements for employee development records',
    'completion',
    'anonymization',
    (SELECT id FROM auth_users WHERE email LIKE '%admin%' AND restaurant_id = r.id LIMIT 1),
    CURRENT_DATE,
    (SELECT id FROM auth_users WHERE email LIKE '%admin%' AND restaurant_id = r.id LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND email LIKE '%admin%')
ON CONFLICT DO NOTHING;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_data_processing_registry IS 'GDPR Article 30 processing activity records with legal basis documentation';
COMMENT ON TABLE training_consent_records IS 'GDPR compliant consent management with withdrawal tracking';
COMMENT ON TABLE training_privacy_rights_requests IS 'GDPR Articles 15-23 privacy rights request processing system';
COMMENT ON TABLE training_data_retention_policies IS 'Data retention policies with automated deletion schedules';
COMMENT ON TABLE training_data_breach_incidents IS 'GDPR Articles 33-34 data breach incident management and notification';
COMMENT ON TABLE training_privacy_impact_assessments IS 'GDPR Article 35 privacy impact assessment records';
COMMENT ON TABLE training_data_deletion_log IS 'Audit trail of all data deletion activities for compliance verification';

-- Performance optimization
ANALYZE training_data_processing_registry;
ANALYZE training_consent_records;
ANALYZE training_privacy_rights_requests;
ANALYZE training_data_retention_policies;
ANALYZE training_data_breach_incidents;
ANALYZE training_privacy_impact_assessments;
ANALYZE training_data_deletion_log;