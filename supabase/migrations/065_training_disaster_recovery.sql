-- Training Disaster Recovery Procedures
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive disaster recovery procedures and automation for training data

-- ===========================================
-- DISASTER RECOVERY ENUMS
-- ===========================================

-- Disaster types
CREATE TYPE disaster_type AS ENUM (
    'data_corruption', 'hardware_failure', 'network_outage', 'cyber_attack',
    'human_error', 'natural_disaster', 'software_bug', 'database_crash',
    'storage_failure', 'power_outage', 'ddos_attack', 'ransomware'
);

-- Recovery tier levels (RTO/RPO requirements)
CREATE TYPE recovery_tier AS ENUM (
    'tier_1_critical',    -- RTO: 1 hour,  RPO: 15 minutes
    'tier_2_important',   -- RTO: 4 hours, RPO: 1 hour
    'tier_3_moderate',    -- RTO: 24 hours, RPO: 4 hours
    'tier_4_low'          -- RTO: 72 hours, RPO: 24 hours
);

-- Recovery phase status
CREATE TYPE recovery_phase AS ENUM (
    'assessment', 'preparation', 'execution', 'validation', 'completion', 'post_mortem'
);

-- Recovery strategy types
CREATE TYPE recovery_strategy AS ENUM (
    'hot_standby', 'warm_standby', 'cold_standby', 'backup_restore',
    'point_in_time_recovery', 'partial_recovery', 'full_rebuild'
);

-- Business impact levels
CREATE TYPE business_impact_level AS ENUM (
    'critical', 'high', 'medium', 'low', 'minimal'
);

-- ===========================================
-- DISASTER RECOVERY TABLES
-- ===========================================

-- Disaster recovery plans
CREATE TABLE IF NOT EXISTS training_disaster_recovery_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan identification
    plan_id VARCHAR(128) NOT NULL UNIQUE,
    plan_name VARCHAR(200) NOT NULL,
    plan_version VARCHAR(20) DEFAULT '1.0',
    description TEXT,
    
    -- Scope and applicability
    restaurant_id UUID,
    covers_data_types TEXT[] NOT NULL, -- training_modules, assessments, certificates, etc.
    covers_disaster_types disaster_type[] NOT NULL,
    geographic_scope TEXT[] DEFAULT '{}', -- locations covered
    
    -- Recovery objectives
    recovery_tier recovery_tier NOT NULL,
    rto_minutes INTEGER NOT NULL, -- Recovery Time Objective
    rpo_minutes INTEGER NOT NULL, -- Recovery Point Objective
    mttr_minutes INTEGER, -- Mean Time To Recovery (estimated)
    
    -- Recovery strategy
    primary_strategy recovery_strategy NOT NULL,
    fallback_strategy recovery_strategy,
    recovery_location TEXT NOT NULL,
    alternate_locations TEXT[] DEFAULT '{}',
    
    -- Dependencies and prerequisites
    required_resources JSONB DEFAULT '{}', -- Personnel, systems, tools
    external_dependencies JSONB DEFAULT '{}', -- Third-party services, vendors
    recovery_prerequisites TEXT[] DEFAULT '{}',
    
    -- Business impact assessment
    business_impact_level business_impact_level NOT NULL,
    affected_business_processes TEXT[] NOT NULL,
    financial_impact_per_hour DECIMAL(12,2),
    customer_impact_description TEXT,
    compliance_implications TEXT[] DEFAULT '{}',
    
    -- Recovery procedures
    recovery_steps JSONB NOT NULL, -- Detailed step-by-step procedures
    automation_scripts TEXT[] DEFAULT '{}',
    manual_procedures TEXT[] DEFAULT '{}',
    rollback_procedures JSONB DEFAULT '{}',
    
    -- Testing and validation
    testing_schedule VARCHAR(100), -- Frequency of DR tests
    last_tested_at TIMESTAMPTZ,
    last_test_results JSONB DEFAULT '{}',
    validation_criteria JSONB NOT NULL,
    success_metrics JSONB DEFAULT '{}',
    
    -- Communication plan
    notification_procedures JSONB NOT NULL,
    escalation_matrix JSONB NOT NULL,
    communication_templates JSONB DEFAULT '{}',
    stakeholder_contacts JSONB DEFAULT '{}',
    
    -- Documentation and training
    documentation_links TEXT[] DEFAULT '{}',
    training_materials TEXT[] DEFAULT '{}',
    team_training_status JSONB DEFAULT '{}',
    
    -- Lifecycle management
    plan_status VARCHAR(50) DEFAULT 'active', -- active, inactive, under_review, deprecated
    review_frequency_days INTEGER DEFAULT 90,
    next_review_date DATE,
    last_updated_by UUID,
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_dr_plans_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_dr_plans_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_dr_plans_updated_by FOREIGN KEY (last_updated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_dr_plans_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_rto_rpo CHECK (rto_minutes >= rpo_minutes),
    CONSTRAINT valid_financial_impact CHECK (financial_impact_per_hour IS NULL OR financial_impact_per_hour >= 0)
);

-- Disaster recovery incidents
CREATE TABLE IF NOT EXISTS training_disaster_recovery_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Incident identification
    incident_id VARCHAR(128) NOT NULL UNIQUE,
    incident_title VARCHAR(300) NOT NULL,
    incident_description TEXT NOT NULL,
    
    -- Incident classification
    disaster_type disaster_type NOT NULL,
    severity_level INTEGER NOT NULL CHECK (severity_level BETWEEN 1 AND 5), -- 1=Critical, 5=Low
    business_impact_level business_impact_level NOT NULL,
    
    -- Affected scope
    restaurant_id UUID,
    affected_systems TEXT[] NOT NULL,
    affected_data_types TEXT[] NOT NULL,
    affected_users_count INTEGER DEFAULT 0,
    affected_training_modules UUID[] DEFAULT '{}',
    
    -- Timeline tracking
    detected_at TIMESTAMPTZ NOT NULL,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    recovery_started_at TIMESTAMPTZ,
    recovery_completed_at TIMESTAMPTZ,
    
    -- Recovery execution
    recovery_plan_id UUID,
    recovery_strategy recovery_strategy,
    current_phase recovery_phase DEFAULT 'assessment',
    recovery_progress_percentage INTEGER DEFAULT 0 CHECK (recovery_progress_percentage BETWEEN 0 AND 100),
    
    -- Impact metrics
    data_loss_amount TEXT, -- Description of data lost
    downtime_duration_minutes INTEGER,
    users_affected_count INTEGER DEFAULT 0,
    training_sessions_disrupted INTEGER DEFAULT 0,
    financial_impact DECIMAL(12,2),
    
    -- Response team
    incident_commander UUID,
    response_team_members UUID[] DEFAULT '{}',
    external_support_engaged BOOLEAN DEFAULT false,
    vendor_contacts JSONB DEFAULT '{}',
    
    -- Communication tracking
    stakeholders_notified BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    external_communication_required BOOLEAN DEFAULT false,
    public_statement_issued BOOLEAN DEFAULT false,
    
    -- Resolution details
    root_cause_analysis TEXT,
    resolution_summary TEXT,
    lessons_learned TEXT[] DEFAULT '{}',
    preventive_measures JSONB DEFAULT '{}',
    follow_up_actions JSONB DEFAULT '[]',
    
    -- Documentation
    incident_log JSONB DEFAULT '[]', -- Chronological log of actions
    attachments TEXT[] DEFAULT '{}',
    related_tickets TEXT[] DEFAULT '{}',
    
    -- Post-incident review
    post_mortem_completed BOOLEAN DEFAULT false,
    post_mortem_date DATE,
    post_mortem_report_link TEXT,
    improvement_opportunities TEXT[] DEFAULT '{}',
    
    -- Status and lifecycle
    status VARCHAR(50) DEFAULT 'open', -- open, investigating, recovering, resolved, closed
    resolution_code VARCHAR(100),
    closed_at TIMESTAMPTZ,
    closed_by UUID,
    
    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_dr_incidents_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_dr_incidents_recovery_plan FOREIGN KEY (recovery_plan_id) REFERENCES training_disaster_recovery_plans(id),
    CONSTRAINT fk_dr_incidents_commander FOREIGN KEY (incident_commander) REFERENCES auth_users(id),
    CONSTRAINT fk_dr_incidents_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_dr_incidents_closed_by FOREIGN KEY (closed_by) REFERENCES auth_users(id),
    CONSTRAINT valid_timeline CHECK (detected_at <= reported_at)
);

-- Disaster recovery test executions
CREATE TABLE IF NOT EXISTS training_disaster_recovery_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Test identification
    test_id VARCHAR(128) NOT NULL UNIQUE,
    test_name VARCHAR(200) NOT NULL,
    test_type VARCHAR(50) NOT NULL, -- 'tabletop', 'walkthrough', 'simulation', 'full_test'
    description TEXT,
    
    -- Test scope
    recovery_plan_id UUID NOT NULL,
    restaurant_id UUID,
    test_scenario JSONB NOT NULL,
    test_objectives TEXT[] NOT NULL,
    success_criteria JSONB NOT NULL,
    
    -- Test planning
    scheduled_date DATE NOT NULL,
    estimated_duration_hours INTEGER DEFAULT 4,
    test_environment VARCHAR(50) DEFAULT 'staging', -- staging, production, isolated
    requires_downtime BOOLEAN DEFAULT false,
    
    -- Participants
    test_coordinator UUID NOT NULL,
    participants UUID[] NOT NULL,
    observers UUID[] DEFAULT '{}',
    external_participants JSONB DEFAULT '{}',
    
    -- Test execution
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    actual_duration_minutes INTEGER,
    test_status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled, failed
    
    -- Results and metrics
    test_passed BOOLEAN DEFAULT false,
    objectives_met_count INTEGER DEFAULT 0,
    total_objectives_count INTEGER,
    rto_achieved_minutes INTEGER,
    rpo_achieved_minutes INTEGER,
    data_recovery_success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Detailed results
    test_results JSONB DEFAULT '{}',
    passed_criteria JSONB DEFAULT '[]',
    failed_criteria JSONB DEFAULT '[]',
    performance_metrics JSONB DEFAULT '{}',
    
    -- Issues and improvements
    issues_identified JSONB DEFAULT '[]',
    improvement_recommendations TEXT[] DEFAULT '{}',
    plan_updates_needed BOOLEAN DEFAULT false,
    training_gaps_identified TEXT[] DEFAULT '{}',
    
    -- Documentation
    test_report_link TEXT,
    execution_log JSONB DEFAULT '[]',
    screenshots_links TEXT[] DEFAULT '{}',
    recordings_links TEXT[] DEFAULT '{}',
    
    -- Follow-up actions
    action_items JSONB DEFAULT '[]',
    responsible_parties JSONB DEFAULT '{}',
    target_completion_dates JSONB DEFAULT '{}',
    follow_up_required BOOLEAN DEFAULT false,
    
    -- Next test planning
    next_test_recommended_date DATE,
    test_frequency_adjustment INTEGER, -- days to add/subtract from normal frequency
    
    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_dr_tests_recovery_plan FOREIGN KEY (recovery_plan_id) REFERENCES training_disaster_recovery_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_dr_tests_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_dr_tests_coordinator FOREIGN KEY (test_coordinator) REFERENCES auth_users(id),
    CONSTRAINT fk_dr_tests_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT valid_test_duration CHECK (estimated_duration_hours > 0),
    CONSTRAINT valid_success_rate CHECK (data_recovery_success_rate >= 0 AND data_recovery_success_rate <= 100)
);

-- Recovery automation scripts and runbooks
CREATE TABLE IF NOT EXISTS training_recovery_runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Runbook identification
    runbook_id VARCHAR(128) NOT NULL UNIQUE,
    runbook_name VARCHAR(200) NOT NULL,
    runbook_version VARCHAR(20) DEFAULT '1.0',
    description TEXT,
    
    -- Runbook categorization
    recovery_plan_id UUID,
    disaster_types disaster_type[] NOT NULL,
    recovery_phases recovery_phase[] NOT NULL,
    automation_level VARCHAR(50) DEFAULT 'manual', -- 'automated', 'semi_automated', 'manual'
    
    -- Execution context
    target_systems TEXT[] NOT NULL,
    required_permissions TEXT[] DEFAULT '{}',
    prerequisites TEXT[] DEFAULT '{}',
    estimated_execution_time_minutes INTEGER DEFAULT 30,
    
    -- Runbook content
    step_by_step_procedures JSONB NOT NULL,
    automation_scripts JSONB DEFAULT '{}', -- Script content, language, parameters
    manual_procedures JSONB DEFAULT '{}',
    verification_steps JSONB NOT NULL,
    rollback_steps JSONB DEFAULT '{}',
    
    -- Dependencies and integrations
    dependent_runbooks UUID[] DEFAULT '{}',
    prerequisite_runbooks UUID[] DEFAULT '{}',
    external_tool_integrations JSONB DEFAULT '{}',
    api_endpoints JSONB DEFAULT '{}',
    
    -- Testing and validation
    testing_procedures JSONB DEFAULT '{}',
    validation_criteria JSONB NOT NULL,
    last_tested_at TIMESTAMPTZ,
    test_success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Usage tracking
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    average_execution_time_minutes INTEGER,
    success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Documentation and support
    documentation_links TEXT[] DEFAULT '{}',
    troubleshooting_guide JSONB DEFAULT '{}',
    known_issues JSONB DEFAULT '[]',
    faq JSONB DEFAULT '{}',
    
    -- Access control and security
    restricted_access BOOLEAN DEFAULT false,
    required_approvals INTEGER DEFAULT 0,
    security_considerations TEXT[] DEFAULT '{}',
    audit_logging_enabled BOOLEAN DEFAULT true,
    
    -- Lifecycle management
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, deprecated, under_review
    review_frequency_days INTEGER DEFAULT 180,
    next_review_date DATE,
    maintenance_schedule VARCHAR(100),
    
    -- Change management
    change_history JSONB DEFAULT '[]',
    last_updated_by UUID,
    approval_required BOOLEAN DEFAULT true,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_runbooks_recovery_plan FOREIGN KEY (recovery_plan_id) REFERENCES training_disaster_recovery_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_runbooks_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_runbooks_updated_by FOREIGN KEY (last_updated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_runbooks_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_execution_time CHECK (estimated_execution_time_minutes > 0),
    CONSTRAINT valid_test_success_rate CHECK (test_success_rate >= 0 AND test_success_rate <= 100),
    CONSTRAINT valid_success_rate CHECK (success_rate >= 0 AND success_rate <= 100)
);

-- Business continuity assessments
CREATE TABLE IF NOT EXISTS training_business_continuity_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Assessment identification
    assessment_id VARCHAR(128) NOT NULL UNIQUE,
    assessment_name VARCHAR(200) NOT NULL,
    assessment_type VARCHAR(50) NOT NULL, -- 'annual', 'post_incident', 'regulatory', 'ad_hoc'
    description TEXT,
    
    -- Assessment scope
    restaurant_id UUID,
    assessment_period_start DATE NOT NULL,
    assessment_period_end DATE NOT NULL,
    business_processes_evaluated TEXT[] NOT NULL,
    systems_evaluated TEXT[] NOT NULL,
    
    -- Risk assessment
    identified_risks JSONB NOT NULL,
    risk_likelihood_scores JSONB DEFAULT '{}', -- 1-5 scale per risk
    risk_impact_scores JSONB DEFAULT '{}', -- 1-5 scale per risk
    overall_risk_rating VARCHAR(20), -- 'very_high', 'high', 'medium', 'low', 'very_low'
    
    -- Current state analysis
    current_recovery_capabilities JSONB NOT NULL,
    existing_controls JSONB DEFAULT '{}',
    gap_analysis JSONB DEFAULT '{}',
    compliance_status JSONB DEFAULT '{}',
    
    -- Business impact analysis
    critical_functions JSONB NOT NULL,
    maximum_tolerable_downtime JSONB DEFAULT '{}', -- Per function
    financial_impact_analysis JSONB DEFAULT '{}',
    reputation_impact_assessment TEXT,
    regulatory_impact_assessment TEXT,
    
    -- Recovery requirements
    recovery_time_objectives JSONB NOT NULL,
    recovery_point_objectives JSONB NOT NULL,
    minimum_service_levels JSONB DEFAULT '{}',
    resource_requirements JSONB DEFAULT '{}',
    
    -- Recommendations
    improvement_recommendations JSONB DEFAULT '[]',
    priority_actions JSONB DEFAULT '[]',
    investment_requirements JSONB DEFAULT '{}',
    timeline_recommendations JSONB DEFAULT '{}',
    
    -- Assessment execution
    assessors UUID[] NOT NULL,
    assessment_methodology TEXT,
    data_sources TEXT[] DEFAULT '{}',
    interviews_conducted INTEGER DEFAULT 0,
    documents_reviewed INTEGER DEFAULT 0,
    
    -- Results and scoring
    overall_maturity_score INTEGER CHECK (overall_maturity_score BETWEEN 1 AND 5),
    maturity_by_category JSONB DEFAULT '{}',
    benchmark_comparisons JSONB DEFAULT '{}',
    improvement_opportunities_count INTEGER DEFAULT 0,
    
    -- Reporting and communication
    executive_summary TEXT,
    detailed_findings JSONB DEFAULT '{}',
    action_plan JSONB DEFAULT '[]',
    presentation_materials TEXT[] DEFAULT '{}',
    
    -- Follow-up and tracking
    follow_up_required BOOLEAN DEFAULT true,
    next_assessment_date DATE,
    action_items_assigned BOOLEAN DEFAULT false,
    progress_tracking_enabled BOOLEAN DEFAULT true,
    
    -- Approval and sign-off
    findings_approved BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    management_response TEXT,
    
    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bca_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_bca_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bca_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_assessment_period CHECK (assessment_period_start <= assessment_period_end),
    CONSTRAINT valid_maturity_score CHECK (overall_maturity_score IS NULL OR (overall_maturity_score >= 1 AND overall_maturity_score <= 5))
);

-- ===========================================
-- DISASTER RECOVERY INDEXES
-- ===========================================

-- Disaster recovery plans indexes
CREATE UNIQUE INDEX idx_dr_plans_plan_id ON training_disaster_recovery_plans(plan_id);
CREATE INDEX idx_dr_plans_restaurant ON training_disaster_recovery_plans(restaurant_id);
CREATE INDEX idx_dr_plans_tier ON training_disaster_recovery_plans(recovery_tier);
CREATE INDEX idx_dr_plans_status ON training_disaster_recovery_plans(plan_status);
CREATE INDEX idx_dr_plans_next_review ON training_disaster_recovery_plans(next_review_date);
CREATE INDEX idx_dr_plans_disaster_types ON training_disaster_recovery_plans USING GIN(covers_disaster_types);
CREATE INDEX idx_dr_plans_data_types ON training_disaster_recovery_plans USING GIN(covers_data_types);

-- Disaster recovery incidents indexes
CREATE UNIQUE INDEX idx_dr_incidents_incident_id ON training_disaster_recovery_incidents(incident_id);
CREATE INDEX idx_dr_incidents_restaurant ON training_disaster_recovery_incidents(restaurant_id);
CREATE INDEX idx_dr_incidents_disaster_type ON training_disaster_recovery_incidents(disaster_type);
CREATE INDEX idx_dr_incidents_severity ON training_disaster_recovery_incidents(severity_level);
CREATE INDEX idx_dr_incidents_status ON training_disaster_recovery_incidents(status);
CREATE INDEX idx_dr_incidents_detected_at ON training_disaster_recovery_incidents(detected_at);
CREATE INDEX idx_dr_incidents_recovery_plan ON training_disaster_recovery_incidents(recovery_plan_id);
CREATE INDEX idx_dr_incidents_phase ON training_disaster_recovery_incidents(current_phase);
CREATE INDEX idx_dr_incidents_open ON training_disaster_recovery_incidents(status) WHERE status IN ('open', 'investigating', 'recovering');

-- Disaster recovery tests indexes
CREATE UNIQUE INDEX idx_dr_tests_test_id ON training_disaster_recovery_tests(test_id);
CREATE INDEX idx_dr_tests_recovery_plan ON training_disaster_recovery_tests(recovery_plan_id);
CREATE INDEX idx_dr_tests_restaurant ON training_disaster_recovery_tests(restaurant_id);
CREATE INDEX idx_dr_tests_scheduled_date ON training_disaster_recovery_tests(scheduled_date);
CREATE INDEX idx_dr_tests_status ON training_disaster_recovery_tests(test_status);
CREATE INDEX idx_dr_tests_coordinator ON training_disaster_recovery_tests(test_coordinator);
CREATE INDEX idx_dr_tests_test_type ON training_disaster_recovery_tests(test_type);

-- Recovery runbooks indexes
CREATE UNIQUE INDEX idx_runbooks_runbook_id ON training_recovery_runbooks(runbook_id);
CREATE INDEX idx_runbooks_recovery_plan ON training_recovery_runbooks(recovery_plan_id);
CREATE INDEX idx_runbooks_disaster_types ON training_recovery_runbooks USING GIN(disaster_types);
CREATE INDEX idx_runbooks_phases ON training_recovery_runbooks USING GIN(recovery_phases);
CREATE INDEX idx_runbooks_status ON training_recovery_runbooks(status);
CREATE INDEX idx_runbooks_automation_level ON training_recovery_runbooks(automation_level);
CREATE INDEX idx_runbooks_next_review ON training_recovery_runbooks(next_review_date);
CREATE INDEX idx_runbooks_last_executed ON training_recovery_runbooks(last_executed_at);

-- Business continuity assessments indexes
CREATE UNIQUE INDEX idx_bca_assessment_id ON training_business_continuity_assessments(assessment_id);
CREATE INDEX idx_bca_restaurant ON training_business_continuity_assessments(restaurant_id);
CREATE INDEX idx_bca_type ON training_business_continuity_assessments(assessment_type);
CREATE INDEX idx_bca_period ON training_business_continuity_assessments(assessment_period_start, assessment_period_end);
CREATE INDEX idx_bca_overall_risk ON training_business_continuity_assessments(overall_risk_rating);
CREATE INDEX idx_bca_maturity_score ON training_business_continuity_assessments(overall_maturity_score);
CREATE INDEX idx_bca_next_assessment ON training_business_continuity_assessments(next_assessment_date);

-- JSONB indexes for complex queries
CREATE INDEX idx_dr_plans_recovery_steps ON training_disaster_recovery_plans USING GIN(recovery_steps);
CREATE INDEX idx_dr_incidents_incident_log ON training_disaster_recovery_incidents USING GIN(incident_log);
CREATE INDEX idx_dr_tests_results ON training_disaster_recovery_tests USING GIN(test_results);
CREATE INDEX idx_runbooks_procedures ON training_recovery_runbooks USING GIN(step_by_step_procedures);
CREATE INDEX idx_bca_risks ON training_business_continuity_assessments USING GIN(identified_risks);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on disaster recovery tables
ALTER TABLE training_disaster_recovery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_disaster_recovery_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_disaster_recovery_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_recovery_runbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_business_continuity_assessments ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "DR plans restaurant isolation"
ON training_disaster_recovery_plans FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "DR incidents restaurant isolation"
ON training_disaster_recovery_incidents FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "DR tests restaurant isolation"
ON training_disaster_recovery_tests FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "BCA restaurant isolation"
ON training_business_continuity_assessments FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- Admin and manager access policies
CREATE POLICY "Runbooks admin manager access"
ON training_recovery_runbooks FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

-- Emergency access policies for critical incidents
CREATE POLICY "Emergency incident access"
ON training_disaster_recovery_incidents FOR SELECT TO authenticated
USING (
    severity_level <= 2 -- Critical and high severity incidents visible to all authenticated users
    OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid())
);

-- ===========================================
-- DISASTER RECOVERY FUNCTIONS
-- ===========================================

-- Function to initiate disaster recovery
CREATE OR REPLACE FUNCTION initiate_disaster_recovery(
    p_disaster_type disaster_type,
    p_incident_title TEXT,
    p_incident_description TEXT,
    p_restaurant_id UUID DEFAULT NULL,
    p_severity_level INTEGER DEFAULT 3
)
RETURNS UUID AS $$
DECLARE
    incident_uuid UUID;
    incident_id_text TEXT;
    recovery_plan_uuid UUID;
    commander_uuid UUID;
BEGIN
    -- Validation
    IF p_severity_level < 1 OR p_severity_level > 5 THEN
        RAISE EXCEPTION 'Invalid severity level: %. Must be between 1 and 5.', p_severity_level;
    END IF;
    
    -- Generate incident ID
    incident_id_text := 'INC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                       LPAD(EXTRACT(EPOCH FROM NOW())::INTEGER::TEXT, 10, '0') || '-' ||
                       encode(gen_random_bytes(3), 'hex');
    
    -- Find appropriate recovery plan
    SELECT id INTO recovery_plan_uuid
    FROM training_disaster_recovery_plans
    WHERE (restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
    AND p_disaster_type = ANY(covers_disaster_types)
    AND plan_status = 'active'
    ORDER BY 
        CASE WHEN restaurant_id = p_restaurant_id THEN 1 ELSE 2 END,
        CASE recovery_tier
            WHEN 'tier_1_critical' THEN 1
            WHEN 'tier_2_important' THEN 2
            WHEN 'tier_3_moderate' THEN 3
            WHEN 'tier_4_low' THEN 4
        END
    LIMIT 1;
    
    -- Assign incident commander (highest role available for the restaurant)
    SELECT id INTO commander_uuid
    FROM auth_users
    WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
    AND role IN ('admin', 'manager')
    ORDER BY 
        CASE role
            WHEN 'admin' THEN 1
            WHEN 'manager' THEN 2
        END,
        created_at
    LIMIT 1;
    
    -- Create disaster recovery incident
    INSERT INTO training_disaster_recovery_incidents (
        incident_id,
        incident_title,
        incident_description,
        disaster_type,
        severity_level,
        business_impact_level,
        restaurant_id,
        affected_systems,
        affected_data_types,
        detected_at,
        recovery_plan_id,
        incident_commander,
        status,
        incident_log,
        created_by
    ) VALUES (
        incident_id_text,
        p_incident_title,
        p_incident_description,
        p_disaster_type,
        p_severity_level,
        CASE p_severity_level
            WHEN 1 THEN 'critical'
            WHEN 2 THEN 'high'
            WHEN 3 THEN 'medium'
            WHEN 4 THEN 'low'
            WHEN 5 THEN 'minimal'
        END,
        p_restaurant_id,
        ARRAY['training_system'],
        ARRAY['training_data', 'user_progress', 'certificates'],
        NOW(),
        recovery_plan_uuid,
        commander_uuid,
        'investigating',
        jsonb_build_array(
            jsonb_build_object(
                'timestamp', NOW(),
                'action', 'incident_created',
                'user_id', auth.uid(),
                'details', 'Disaster recovery incident automatically initiated'
            )
        ),
        COALESCE(auth.uid(), commander_uuid, '00000000-0000-0000-0000-000000000000'::UUID)
    ) RETURNING id INTO incident_uuid;
    
    -- Create automatic recovery point if high severity
    IF p_severity_level <= 2 THEN
        PERFORM create_automatic_recovery_point(
            p_restaurant_id,
            'system_event',
            'Pre-disaster recovery checkpoint for incident: ' || incident_id_text
        );
    END IF;
    
    RETURN incident_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute recovery plan step
CREATE OR REPLACE FUNCTION execute_recovery_step(
    p_incident_id UUID,
    p_step_name TEXT,
    p_step_result JSONB DEFAULT '{}',
    p_step_status VARCHAR(20) DEFAULT 'completed'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_incident RECORD;
    step_log JSONB;
    new_progress INTEGER;
BEGIN
    -- Get current incident details
    SELECT * INTO current_incident
    FROM training_disaster_recovery_incidents
    WHERE id = p_incident_id;
    
    IF current_incident.id IS NULL THEN
        RAISE EXCEPTION 'Incident not found: %', p_incident_id;
    END IF;
    
    -- Create step log entry
    step_log := jsonb_build_object(
        'timestamp', NOW(),
        'action', 'recovery_step_executed',
        'step_name', p_step_name,
        'step_status', p_step_status,
        'step_result', p_step_result,
        'user_id', auth.uid(),
        'phase', current_incident.current_phase
    );
    
    -- Calculate new progress (simplified - increment by 10%)
    new_progress := LEAST(current_incident.recovery_progress_percentage + 10, 100);
    
    -- Update incident with step results
    UPDATE training_disaster_recovery_incidents
    SET 
        incident_log = incident_log || jsonb_build_array(step_log),
        recovery_progress_percentage = new_progress,
        current_phase = CASE 
            WHEN new_progress >= 90 THEN 'validation'
            WHEN new_progress >= 70 THEN 'execution'
            WHEN new_progress >= 30 THEN 'preparation'
            ELSE current_phase
        END,
        updated_at = NOW()
    WHERE id = p_incident_id;
    
    -- Auto-complete incident if 100% progress
    IF new_progress >= 100 THEN
        UPDATE training_disaster_recovery_incidents
        SET 
            status = 'resolved',
            recovery_completed_at = NOW(),
            current_phase = 'completion',
            resolution_summary = 'Recovery completed successfully through automated execution'
        WHERE id = p_incident_id;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate recovery metrics
CREATE OR REPLACE FUNCTION calculate_recovery_metrics(
    p_restaurant_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    metrics JSONB := '{}';
    total_incidents INTEGER;
    avg_recovery_time INTERVAL;
    mttr_minutes INTEGER;
    incident_by_type JSONB;
    recovery_success_rate DECIMAL(5,2);
BEGIN
    -- Total incidents in period
    SELECT COUNT(*) INTO total_incidents
    FROM training_disaster_recovery_incidents
    WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
    AND detected_at::DATE BETWEEN p_start_date AND p_end_date;
    
    -- Average recovery time
    SELECT AVG(recovery_completed_at - recovery_started_at) INTO avg_recovery_time
    FROM training_disaster_recovery_incidents
    WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
    AND detected_at::DATE BETWEEN p_start_date AND p_end_date
    AND recovery_completed_at IS NOT NULL
    AND recovery_started_at IS NOT NULL;
    
    -- Mean Time To Recovery (MTTR) in minutes
    mttr_minutes := EXTRACT(EPOCH FROM COALESCE(avg_recovery_time, INTERVAL '0'))::INTEGER / 60;
    
    -- Incidents by disaster type
    SELECT jsonb_object_agg(disaster_type, incident_count) INTO incident_by_type
    FROM (
        SELECT disaster_type, COUNT(*) as incident_count
        FROM training_disaster_recovery_incidents
        WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
        AND detected_at::DATE BETWEEN p_start_date AND p_end_date
        GROUP BY disaster_type
    ) type_counts;
    
    -- Recovery success rate
    SELECT 
        CASE WHEN COUNT(*) > 0 THEN
            (COUNT(*) FILTER (WHERE status = 'resolved') * 100.0 / COUNT(*))
        ELSE 0
        END INTO recovery_success_rate
    FROM training_disaster_recovery_incidents
    WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
    AND detected_at::DATE BETWEEN p_start_date AND p_end_date;
    
    -- Build metrics JSON
    metrics := jsonb_build_object(
        'period_start', p_start_date,
        'period_end', p_end_date,
        'restaurant_id', p_restaurant_id,
        'total_incidents', total_incidents,
        'mttr_minutes', mttr_minutes,
        'mttr_hours', ROUND(mttr_minutes / 60.0, 2),
        'recovery_success_rate_percent', ROUND(recovery_success_rate, 2),
        'incidents_by_type', COALESCE(incident_by_type, '{}'),
        'avg_recovery_time_formatted', COALESCE(avg_recovery_time::TEXT, 'N/A'),
        'calculated_at', NOW()
    );
    
    RETURN metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate DR test schedule
CREATE OR REPLACE FUNCTION generate_dr_test_schedule(
    p_restaurant_id UUID DEFAULT NULL,
    p_months_ahead INTEGER DEFAULT 12
)
RETURNS TABLE (
    recovery_plan_id UUID,
    plan_name TEXT,
    recommended_test_date DATE,
    test_type TEXT,
    last_test_date DATE,
    overdue_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        drp.id,
        drp.plan_name,
        CASE 
            WHEN drp.last_tested_at IS NULL THEN CURRENT_DATE + INTERVAL '7 days'
            WHEN drp.testing_schedule = 'quarterly' THEN drp.last_tested_at::DATE + INTERVAL '3 months'
            WHEN drp.testing_schedule = 'semi-annual' THEN drp.last_tested_at::DATE + INTERVAL '6 months'
            WHEN drp.testing_schedule = 'annual' THEN drp.last_tested_at::DATE + INTERVAL '1 year'
            ELSE drp.last_tested_at::DATE + INTERVAL '6 months'
        END::DATE as recommended_test_date,
        CASE drp.recovery_tier
            WHEN 'tier_1_critical' THEN 'full_test'
            WHEN 'tier_2_important' THEN 'simulation'
            WHEN 'tier_3_moderate' THEN 'walkthrough'
            WHEN 'tier_4_low' THEN 'tabletop'
        END::TEXT as test_type,
        drp.last_tested_at::DATE as last_test_date,
        CASE 
            WHEN drp.last_tested_at IS NULL THEN 999
            ELSE GREATEST(0, CURRENT_DATE - (
                CASE 
                    WHEN drp.testing_schedule = 'quarterly' THEN drp.last_tested_at::DATE + INTERVAL '3 months'
                    WHEN drp.testing_schedule = 'semi-annual' THEN drp.last_tested_at::DATE + INTERVAL '6 months'
                    WHEN drp.testing_schedule = 'annual' THEN drp.last_tested_at::DATE + INTERVAL '1 year'
                    ELSE drp.last_tested_at::DATE + INTERVAL '6 months'
                END)::DATE
            )
        END::INTEGER as overdue_days
    FROM training_disaster_recovery_plans drp
    WHERE (p_restaurant_id IS NULL OR drp.restaurant_id = p_restaurant_id)
    AND drp.plan_status = 'active'
    ORDER BY overdue_days DESC, recommended_test_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- DEFAULT DISASTER RECOVERY PLANS
-- ===========================================

-- Create default disaster recovery plans for each restaurant
INSERT INTO training_disaster_recovery_plans (
    plan_id,
    plan_name,
    description,
    restaurant_id,
    covers_data_types,
    covers_disaster_types,
    recovery_tier,
    rto_minutes,
    rpo_minutes,
    primary_strategy,
    business_impact_level,
    affected_business_processes,
    recovery_steps,
    validation_criteria,
    notification_procedures,
    escalation_matrix,
    created_by
)
SELECT 
    'dr_training_' || r.id::TEXT,
    'Training System DR Plan - ' || r.name,
    'Comprehensive disaster recovery plan for training data and systems',
    r.id,
    ARRAY['training_modules', 'user_progress', 'certificates', 'assessments'],
    ARRAY['data_corruption', 'hardware_failure', 'software_bug', 'cyber_attack']::disaster_type[],
    'tier_2_important',
    240, -- 4 hours RTO
    60,  -- 1 hour RPO
    'backup_restore',
    'high',
    ARRAY['staff_training', 'certification_management', 'compliance_tracking'],
    jsonb_build_object(
        'phase_1', jsonb_build_object(
            'name', 'Assessment and Preparation',
            'steps', jsonb_build_array(
                'Confirm incident scope and impact',
                'Notify incident commander and response team',
                'Activate disaster recovery plan',
                'Establish communication channels'
            ),
            'estimated_time_minutes', 30
        ),
        'phase_2', jsonb_build_object(
            'name', 'Recovery Execution',
            'steps', jsonb_build_array(
                'Initiate backup restoration process',
                'Verify data integrity during restoration',
                'Test system functionality',
                'Validate user access and permissions'
            ),
            'estimated_time_minutes', 180
        ),
        'phase_3', jsonb_build_object(
            'name', 'Validation and Handover',
            'steps', jsonb_build_array(
                'Perform comprehensive system testing',
                'Verify training data accuracy',
                'Confirm user training progress',
                'Document recovery completion'
            ),
            'estimated_time_minutes', 30
        )
    ),
    jsonb_build_object(
        'data_integrity', 'All training records must be verified for accuracy',
        'user_access', 'All users must be able to access their training progress',
        'system_performance', 'System response time must be within normal parameters',
        'functionality', 'All training features must be fully operational'
    ),
    jsonb_build_object(
        'immediate', jsonb_build_array(
            'Incident commander',
            'Restaurant management',
            'IT support team'
        ),
        'within_1_hour', jsonb_build_array(
            'All restaurant staff',
            'Corporate headquarters',
            'Regulatory bodies (if required)'
        ),
        'templates', jsonb_build_object(
            'initial_notification', 'Training system incident detected. DR plan activated.',
            'progress_update', 'Recovery in progress. Estimated completion: {time}',
            'completion_notice', 'Training system recovery completed successfully.'
        )
    ),
    jsonb_build_object(
        'level_1', jsonb_build_object(
            'role', 'incident_commander',
            'escalation_time_minutes', 15
        ),
        'level_2', jsonb_build_object(
            'role', 'restaurant_manager',
            'escalation_time_minutes', 30
        ),
        'level_3', jsonb_build_object(
            'role', 'corporate_management',
            'escalation_time_minutes', 60
        )
    ),
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role = 'admin')
ON CONFLICT (plan_id) DO NOTHING;

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Trigger for updated_at columns
CREATE TRIGGER update_dr_plans_updated_at
    BEFORE UPDATE ON training_disaster_recovery_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dr_incidents_updated_at
    BEFORE UPDATE ON training_disaster_recovery_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dr_tests_updated_at
    BEFORE UPDATE ON training_disaster_recovery_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runbooks_updated_at
    BEFORE UPDATE ON training_recovery_runbooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bca_updated_at
    BEFORE UPDATE ON training_business_continuity_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_disaster_recovery_plans IS 'Comprehensive disaster recovery plans with RTO/RPO objectives and detailed procedures';
COMMENT ON TABLE training_disaster_recovery_incidents IS 'Active disaster recovery incidents with progress tracking and impact assessment';
COMMENT ON TABLE training_disaster_recovery_tests IS 'DR plan testing execution with results validation and improvement recommendations';
COMMENT ON TABLE training_recovery_runbooks IS 'Automated and manual recovery procedures with step-by-step instructions';
COMMENT ON TABLE training_business_continuity_assessments IS 'Business continuity assessments with risk analysis and maturity scoring';

-- Performance optimization
ANALYZE training_disaster_recovery_plans;
ANALYZE training_disaster_recovery_incidents;
ANALYZE training_disaster_recovery_tests;
ANALYZE training_recovery_runbooks;
ANALYZE training_business_continuity_assessments;