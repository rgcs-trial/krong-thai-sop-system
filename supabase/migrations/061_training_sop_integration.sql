-- Training SOP Integration System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Seamless integration between training system and SOP workflows

-- ===========================================
-- INTEGRATION ENUMS
-- ===========================================

-- Integration trigger types
CREATE TYPE integration_trigger_type AS ENUM (
    'sop_completion', 'sop_failure', 'sop_assignment', 'training_completion', 
    'training_failure', 'certificate_expiry', 'compliance_violation', 'skill_gap'
);

-- Integration action types
CREATE TYPE integration_action_type AS ENUM (
    'assign_training', 'update_sop_access', 'create_remedial_training', 'schedule_reassessment',
    'escalate_to_manager', 'update_competency', 'restrict_sop_access', 'notify_stakeholders'
);

-- Integration status
CREATE TYPE integration_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'cancelled', 'paused'
);

-- Competency levels
CREATE TYPE competency_level AS ENUM (
    'novice', 'developing', 'proficient', 'advanced', 'expert'
);

-- Skill assessment types
CREATE TYPE skill_assessment_type AS ENUM (
    'theoretical', 'practical', 'observational', 'peer_review', 'manager_evaluation'
);

-- ===========================================
-- INTEGRATION TABLES
-- ===========================================

-- SOP-Training competency mapping
CREATE TABLE IF NOT EXISTS sop_training_competency_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Mapping identification
    competency_map_id VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- SOP requirements
    sop_document_id UUID NOT NULL,
    sop_category_id UUID,
    required_competency_level competency_level NOT NULL DEFAULT 'proficient',
    
    -- Training requirements
    required_training_modules UUID[] NOT NULL,
    prerequisite_training_modules UUID[] DEFAULT '{}',
    optional_training_modules UUID[] DEFAULT '{}',
    
    -- Skill requirements
    required_skills JSONB NOT NULL, -- {"skill_name": "required_level", ...}
    assessment_requirements JSONB DEFAULT '{}',
    practical_demonstration_required BOOLEAN DEFAULT false,
    
    -- Certification requirements
    certificates_required UUID[] DEFAULT '{}',
    certificate_validity_days INTEGER DEFAULT 365,
    recertification_required BOOLEAN DEFAULT true,
    
    -- Competency thresholds
    minimum_training_score INTEGER DEFAULT 80,
    minimum_practical_score INTEGER DEFAULT 85,
    maximum_attempts_allowed INTEGER DEFAULT 3,
    
    -- Time constraints
    training_completion_deadline_days INTEGER DEFAULT 30,
    competency_validity_period_days INTEGER DEFAULT 365,
    grace_period_days INTEGER DEFAULT 7,
    
    -- Integration rules
    auto_assign_training BOOLEAN DEFAULT true,
    block_sop_access_until_trained BOOLEAN DEFAULT true,
    escalation_enabled BOOLEAN DEFAULT true,
    
    -- Business context
    restaurant_id UUID,
    department VARCHAR(100),
    role_requirements TEXT[] DEFAULT '{}',
    compliance_framework VARCHAR(100),
    
    -- Lifecycle
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    approved_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_competency_map_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_competency_map_sop_category FOREIGN KEY (sop_category_id) REFERENCES sop_categories(id),
    CONSTRAINT fk_competency_map_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_competency_map_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_competency_map_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- User competency profiles
CREATE TABLE IF NOT EXISTS user_sop_competency_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Profile identification
    competency_profile_id VARCHAR(128) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    competency_map_id UUID NOT NULL,
    
    -- Current competency status
    current_competency_level competency_level DEFAULT 'novice',
    competency_score DECIMAL(5,2) DEFAULT 0, -- 0-100 scale
    last_assessment_date DATE,
    
    -- Training progress
    required_training_completed INTEGER DEFAULT 0,
    total_required_training INTEGER NOT NULL,
    optional_training_completed INTEGER DEFAULT 0,
    
    -- Training tracking
    completed_training_modules UUID[] DEFAULT '{}',
    in_progress_training_modules UUID[] DEFAULT '{}',
    failed_training_modules UUID[] DEFAULT '{}',
    
    -- Assessment results
    theoretical_assessment_score DECIMAL(5,2) DEFAULT 0,
    practical_assessment_score DECIMAL(5,2) DEFAULT 0,
    observational_assessment_score DECIMAL(5,2) DEFAULT 0,
    
    -- Certification status
    certificates_held UUID[] DEFAULT '{}',
    certificates_expired UUID[] DEFAULT '{}',
    next_recertification_date DATE,
    
    -- SOP access authorization
    sop_access_authorized BOOLEAN DEFAULT false,
    access_authorization_date DATE,
    access_restriction_reason TEXT,
    
    -- Performance tracking
    sop_completion_success_rate DECIMAL(5,2) DEFAULT 0,
    total_sop_completions INTEGER DEFAULT 0,
    total_sop_failures INTEGER DEFAULT 0,
    last_sop_completion_date DATE,
    
    -- Competency development
    development_plan JSONB DEFAULT '{}',
    learning_preferences JSONB DEFAULT '{}',
    mentor_assigned UUID,
    
    -- Timeline tracking
    competency_achieved_date DATE,
    competency_expiry_date DATE,
    last_skill_assessment_date DATE,
    next_assessment_due_date DATE,
    
    -- Flags and status
    requires_immediate_training BOOLEAN DEFAULT false,
    competency_at_risk BOOLEAN DEFAULT false,
    development_plan_active BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_competency_profile_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_competency_profile_map FOREIGN KEY (competency_map_id) REFERENCES sop_training_competency_map(id) ON DELETE CASCADE,
    CONSTRAINT fk_competency_profile_mentor FOREIGN KEY (mentor_assigned) REFERENCES auth_users(id),
    CONSTRAINT unique_user_competency_map UNIQUE (user_id, competency_map_id),
    CONSTRAINT valid_competency_score CHECK (competency_score >= 0 AND competency_score <= 100)
);

-- Integration workflow automations
CREATE TABLE IF NOT EXISTS training_sop_integration_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workflow identification
    workflow_id VARCHAR(128) NOT NULL UNIQUE,
    workflow_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Trigger configuration
    trigger_type integration_trigger_type NOT NULL,
    trigger_conditions JSONB NOT NULL, -- Conditions that activate this workflow
    trigger_source_tables TEXT[] DEFAULT '{}',
    
    -- Target scope
    restaurant_id UUID,
    applicable_roles TEXT[] DEFAULT '{}',
    applicable_departments TEXT[] DEFAULT '{}',
    
    -- Workflow logic
    workflow_steps JSONB NOT NULL, -- Ordered array of workflow steps
    decision_rules JSONB DEFAULT '{}', -- Conditional logic for workflow paths
    escalation_rules JSONB DEFAULT '{}',
    
    -- Actions configuration
    primary_actions integration_action_type[] NOT NULL,
    secondary_actions integration_action_type[] DEFAULT '{}',
    failure_actions integration_action_type[] DEFAULT '{}',
    
    -- Timing and scheduling
    execution_delay_minutes INTEGER DEFAULT 0,
    max_execution_time_minutes INTEGER DEFAULT 60,
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_minutes INTEGER DEFAULT 5,
    
    -- Notification settings
    notification_enabled BOOLEAN DEFAULT true,
    notification_recipients TEXT[] DEFAULT '{}',
    notification_templates JSONB DEFAULT '{}',
    
    -- Performance tracking
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_execution_time_seconds DECIMAL(8,2) DEFAULT 0,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5, -- 1-10 scale
    created_by UUID NOT NULL,
    approved_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_integration_workflows_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_integration_workflows_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_integration_workflows_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Integration workflow executions
CREATE TABLE IF NOT EXISTS training_sop_integration_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Execution identification
    execution_id VARCHAR(128) NOT NULL UNIQUE,
    workflow_id UUID NOT NULL,
    
    -- Trigger context
    trigger_event_id VARCHAR(128) NOT NULL,
    trigger_source_table VARCHAR(100),
    trigger_source_record_id UUID,
    triggered_by_user_id UUID,
    
    -- Execution context
    target_user_id UUID,
    target_sop_id UUID,
    target_training_module_id UUID,
    
    -- Execution details
    execution_status integration_status DEFAULT 'pending',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Progress tracking
    total_steps INTEGER NOT NULL,
    completed_steps INTEGER DEFAULT 0,
    current_step_description TEXT,
    
    -- Step execution results
    step_results JSONB DEFAULT '[]',
    decision_outcomes JSONB DEFAULT '{}',
    action_results JSONB DEFAULT '{}',
    
    -- Error handling
    error_messages TEXT[] DEFAULT '{}',
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    
    -- Output and effects
    training_assignments_created INTEGER DEFAULT 0,
    sop_access_changes INTEGER DEFAULT 0,
    notifications_sent INTEGER DEFAULT 0,
    competency_updates INTEGER DEFAULT 0,
    
    -- Validation and verification
    execution_validated BOOLEAN DEFAULT false,
    validation_results JSONB DEFAULT '{}',
    post_execution_checks JSONB DEFAULT '{}',
    
    -- Business impact
    affected_users UUID[] DEFAULT '{}',
    business_outcome TEXT,
    success_metrics JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_integration_executions_workflow FOREIGN KEY (workflow_id) REFERENCES training_sop_integration_workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_integration_executions_triggered_by FOREIGN KEY (triggered_by_user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_integration_executions_target_user FOREIGN KEY (target_user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_integration_executions_target_sop FOREIGN KEY (target_sop_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_integration_executions_target_training FOREIGN KEY (target_training_module_id) REFERENCES training_modules(id)
);

-- SOP-Training dependency matrix
CREATE TABLE IF NOT EXISTS sop_training_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dependency identification
    dependency_id VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    
    -- Source SOP
    source_sop_id UUID NOT NULL,
    source_sop_category_id UUID,
    
    -- Dependent training
    dependent_training_module_id UUID NOT NULL,
    dependency_type VARCHAR(100) NOT NULL, -- 'prerequisite', 'concurrent', 'follow_up', 'remedial'
    
    -- Dependency conditions
    trigger_conditions JSONB NOT NULL,
    completion_criteria JSONB DEFAULT '{}',
    time_constraints JSONB DEFAULT '{}',
    
    -- Performance thresholds
    sop_performance_threshold DECIMAL(5,2) DEFAULT 80.0,
    training_score_requirement DECIMAL(5,2) DEFAULT 80.0,
    max_sop_failures_before_training INTEGER DEFAULT 2,
    
    -- Auto-assignment rules
    auto_assign_on_sop_failure BOOLEAN DEFAULT true,
    auto_assign_on_poor_performance BOOLEAN DEFAULT true,
    require_manager_approval BOOLEAN DEFAULT false,
    
    -- Scheduling preferences
    preferred_assignment_delay_hours INTEGER DEFAULT 24,
    training_deadline_days INTEGER DEFAULT 14,
    allow_concurrent_training BOOLEAN DEFAULT true,
    
    -- Scope and applicability
    restaurant_id UUID,
    applicable_roles TEXT[] DEFAULT '{}',
    user_exclusions UUID[] DEFAULT '{}',
    
    -- Effectiveness tracking
    assignments_created INTEGER DEFAULT 0,
    successful_completions INTEGER DEFAULT 0,
    performance_improvement_avg DECIMAL(5,2) DEFAULT 0,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    last_evaluated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_dependencies_source_sop FOREIGN KEY (source_sop_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_dependencies_source_category FOREIGN KEY (source_sop_category_id) REFERENCES sop_categories(id),
    CONSTRAINT fk_sop_dependencies_training_module FOREIGN KEY (dependent_training_module_id) REFERENCES training_modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_dependencies_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_dependencies_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Training-driven SOP access control
CREATE TABLE IF NOT EXISTS training_based_sop_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Access control identification
    access_control_id VARCHAR(128) NOT NULL UNIQUE,
    policy_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- SOP scope
    sop_document_id UUID,
    sop_category_id UUID,
    sop_difficulty_level VARCHAR(50),
    
    -- Training requirements
    required_training_modules UUID[] NOT NULL,
    required_certificates UUID[] DEFAULT '{}',
    minimum_competency_level competency_level DEFAULT 'proficient',
    
    -- Access conditions
    training_completion_required BOOLEAN DEFAULT true,
    certificate_validity_required BOOLEAN DEFAULT true,
    recent_assessment_required BOOLEAN DEFAULT false,
    assessment_recency_days INTEGER DEFAULT 90,
    
    -- Performance requirements
    minimum_training_score DECIMAL(5,2) DEFAULT 80.0,
    minimum_assessment_score DECIMAL(5,2) DEFAULT 85.0,
    maximum_failed_attempts INTEGER DEFAULT 2,
    
    -- Grace periods and exceptions
    grace_period_enabled BOOLEAN DEFAULT true,
    grace_period_days INTEGER DEFAULT 7,
    emergency_override_allowed BOOLEAN DEFAULT true,
    manager_override_allowed BOOLEAN DEFAULT true,
    
    -- Monitoring and compliance
    access_monitoring_enabled BOOLEAN DEFAULT true,
    violation_reporting_enabled BOOLEAN DEFAULT true,
    audit_trail_required BOOLEAN DEFAULT true,
    
    -- Enforcement actions
    block_access_on_violation BOOLEAN DEFAULT true,
    auto_assign_remedial_training BOOLEAN DEFAULT true,
    escalate_to_manager BOOLEAN DEFAULT true,
    
    -- Scope and targeting
    restaurant_id UUID,
    applicable_roles TEXT[] DEFAULT '{}',
    user_exemptions UUID[] DEFAULT '{}',
    department_scope TEXT[] DEFAULT '{}',
    
    -- Performance metrics
    access_grants INTEGER DEFAULT 0,
    access_denials INTEGER DEFAULT 0,
    violations_detected INTEGER DEFAULT 0,
    training_assignments_triggered INTEGER DEFAULT 0,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5,
    created_by UUID NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_access_control_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_access_control_sop_category FOREIGN KEY (sop_category_id) REFERENCES sop_categories(id),
    CONSTRAINT fk_access_control_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_access_control_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT valid_access_control_priority CHECK (priority >= 1 AND priority <= 10)
);

-- ===========================================
-- INTEGRATION INDEXES
-- ===========================================

-- SOP-Training competency mapping indexes
CREATE UNIQUE INDEX idx_competency_map_competency_map_id ON sop_training_competency_map(competency_map_id);
CREATE INDEX idx_competency_map_sop_document ON sop_training_competency_map(sop_document_id);
CREATE INDEX idx_competency_map_restaurant ON sop_training_competency_map(restaurant_id);
CREATE INDEX idx_competency_map_active ON sop_training_competency_map(is_active) WHERE is_active = true;
CREATE INDEX idx_competency_map_department ON sop_training_competency_map(department);

-- User competency profiles indexes
CREATE UNIQUE INDEX idx_competency_profile_competency_profile_id ON user_sop_competency_profiles(competency_profile_id);
CREATE INDEX idx_competency_profile_user ON user_sop_competency_profiles(user_id);
CREATE INDEX idx_competency_profile_map ON user_sop_competency_profiles(competency_map_id);
CREATE INDEX idx_competency_profile_level ON user_sop_competency_profiles(current_competency_level);
CREATE INDEX idx_competency_profile_access_authorized ON user_sop_competency_profiles(sop_access_authorized);
CREATE INDEX idx_competency_profile_requires_training ON user_sop_competency_profiles(requires_immediate_training) WHERE requires_immediate_training = true;
CREATE INDEX idx_competency_profile_at_risk ON user_sop_competency_profiles(competency_at_risk) WHERE competency_at_risk = true;
CREATE INDEX idx_competency_profile_next_assessment ON user_sop_competency_profiles(next_assessment_due_date);

-- Integration workflows indexes
CREATE UNIQUE INDEX idx_integration_workflows_workflow_id ON training_sop_integration_workflows(workflow_id);
CREATE INDEX idx_integration_workflows_restaurant ON training_sop_integration_workflows(restaurant_id);
CREATE INDEX idx_integration_workflows_trigger_type ON training_sop_integration_workflows(trigger_type);
CREATE INDEX idx_integration_workflows_active ON training_sop_integration_workflows(is_active) WHERE is_active = true;
CREATE INDEX idx_integration_workflows_priority ON training_sop_integration_workflows(priority);

-- Integration executions indexes
CREATE UNIQUE INDEX idx_integration_executions_execution_id ON training_sop_integration_executions(execution_id);
CREATE INDEX idx_integration_executions_workflow ON training_sop_integration_executions(workflow_id);
CREATE INDEX idx_integration_executions_status ON training_sop_integration_executions(execution_status);
CREATE INDEX idx_integration_executions_target_user ON training_sop_integration_executions(target_user_id);
CREATE INDEX idx_integration_executions_started_at ON training_sop_integration_executions(started_at);
CREATE INDEX idx_integration_executions_trigger_event ON training_sop_integration_executions(trigger_event_id);

-- SOP-Training dependencies indexes
CREATE UNIQUE INDEX idx_sop_dependencies_dependency_id ON sop_training_dependencies(dependency_id);
CREATE INDEX idx_sop_dependencies_source_sop ON sop_training_dependencies(source_sop_id);
CREATE INDEX idx_sop_dependencies_training_module ON sop_training_dependencies(dependent_training_module_id);
CREATE INDEX idx_sop_dependencies_restaurant ON sop_training_dependencies(restaurant_id);
CREATE INDEX idx_sop_dependencies_active ON sop_training_dependencies(is_active) WHERE is_active = true;
CREATE INDEX idx_sop_dependencies_dependency_type ON sop_training_dependencies(dependency_type);

-- Training-based access control indexes
CREATE UNIQUE INDEX idx_access_control_access_control_id ON training_based_sop_access_control(access_control_id);
CREATE INDEX idx_access_control_sop_document ON training_based_sop_access_control(sop_document_id);
CREATE INDEX idx_access_control_sop_category ON training_based_sop_access_control(sop_category_id);
CREATE INDEX idx_access_control_restaurant ON training_based_sop_access_control(restaurant_id);
CREATE INDEX idx_access_control_active ON training_based_sop_access_control(is_active) WHERE is_active = true;
CREATE INDEX idx_access_control_priority ON training_based_sop_access_control(priority);

-- JSONB indexes for complex queries
CREATE INDEX idx_competency_map_required_skills ON sop_training_competency_map USING GIN(required_skills);
CREATE INDEX idx_competency_profile_development_plan ON user_sop_competency_profiles USING GIN(development_plan);
CREATE INDEX idx_integration_workflows_trigger_conditions ON training_sop_integration_workflows USING GIN(trigger_conditions);
CREATE INDEX idx_integration_workflows_workflow_steps ON training_sop_integration_workflows USING GIN(workflow_steps);
CREATE INDEX idx_integration_executions_step_results ON training_sop_integration_executions USING GIN(step_results);
CREATE INDEX idx_sop_dependencies_trigger_conditions ON sop_training_dependencies USING GIN(trigger_conditions);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on integration tables
ALTER TABLE sop_training_competency_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sop_competency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sop_integration_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sop_integration_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_training_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_based_sop_access_control ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Competency map restaurant isolation"
ON sop_training_competency_map FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Integration workflows restaurant isolation"
ON training_sop_integration_workflows FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "SOP dependencies restaurant isolation"
ON sop_training_dependencies FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Access control restaurant isolation"
ON training_based_sop_access_control FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- User access policies
CREATE POLICY "Competency profile user access"
ON user_sop_competency_profiles FOR ALL TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = user_sop_competency_profiles.user_id)
    )
);

CREATE POLICY "Integration executions user access"
ON training_sop_integration_executions FOR SELECT TO authenticated
USING (
    target_user_id = auth.uid() OR
    triggered_by_user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- INTEGRATION FUNCTIONS
-- ===========================================

-- Function to check user SOP access authorization
CREATE OR REPLACE FUNCTION check_user_sop_access_authorization(
    p_user_id UUID,
    p_sop_document_id UUID
)
RETURNS JSONB AS $$
DECLARE
    access_result JSONB;
    competency_profile RECORD;
    access_control_policy RECORD;
    required_training_complete BOOLEAN := true;
    required_certificates_valid BOOLEAN := true;
    competency_sufficient BOOLEAN := true;
    access_authorized BOOLEAN := false;
    authorization_issues TEXT[] := '{}';
BEGIN
    -- Get user's competency profile for this SOP
    SELECT * INTO competency_profile
    FROM user_sop_competency_profiles ucp
    JOIN sop_training_competency_map stcm ON ucp.competency_map_id = stcm.id
    WHERE ucp.user_id = p_user_id
    AND stcm.sop_document_id = p_sop_document_id
    AND stcm.is_active = true;
    
    -- Get applicable access control policy
    SELECT * INTO access_control_policy
    FROM training_based_sop_access_control
    WHERE (sop_document_id = p_sop_document_id OR sop_document_id IS NULL)
    AND is_active = true
    ORDER BY 
        CASE WHEN sop_document_id IS NOT NULL THEN 1 ELSE 2 END,
        priority DESC
    LIMIT 1;
    
    -- Check if competency profile exists
    IF competency_profile.id IS NULL THEN
        authorization_issues := authorization_issues || 'No competency profile found for this SOP';
        competency_sufficient := false;
    ELSE
        -- Check competency level
        IF access_control_policy.minimum_competency_level IS NOT NULL THEN
            CASE access_control_policy.minimum_competency_level
                WHEN 'expert' THEN
                    competency_sufficient := competency_profile.current_competency_level = 'expert';
                WHEN 'advanced' THEN
                    competency_sufficient := competency_profile.current_competency_level IN ('expert', 'advanced');
                WHEN 'proficient' THEN
                    competency_sufficient := competency_profile.current_competency_level IN ('expert', 'advanced', 'proficient');
                WHEN 'developing' THEN
                    competency_sufficient := competency_profile.current_competency_level IN ('expert', 'advanced', 'proficient', 'developing');
                ELSE
                    competency_sufficient := true;
            END CASE;
            
            IF NOT competency_sufficient THEN
                authorization_issues := authorization_issues || 'Competency level insufficient';
            END IF;
        END IF;
        
        -- Check training completion
        required_training_complete := (
            competency_profile.required_training_completed >= competency_profile.total_required_training
        );
        
        IF NOT required_training_complete THEN
            authorization_issues := authorization_issues || 'Required training not completed';
        END IF;
        
        -- Check certificate validity (simplified check)
        IF array_length(access_control_policy.required_certificates, 1) > 0 THEN
            required_certificates_valid := (
                array_length(competency_profile.certificates_held, 1) >= 
                array_length(access_control_policy.required_certificates, 1)
            );
            
            IF NOT required_certificates_valid THEN
                authorization_issues := authorization_issues || 'Required certificates not valid';
            END IF;
        END IF;
        
        -- Overall authorization
        access_authorized := competency_profile.sop_access_authorized AND
                           required_training_complete AND
                           required_certificates_valid AND
                           competency_sufficient;
    END IF;
    
    -- Build result
    access_result := jsonb_build_object(
        'access_authorized', access_authorized,
        'user_id', p_user_id,
        'sop_document_id', p_sop_document_id,
        'competency_level', COALESCE(competency_profile.current_competency_level::text, 'unknown'),
        'competency_score', COALESCE(competency_profile.competency_score, 0),
        'training_completion_status', jsonb_build_object(
            'required_completed', COALESCE(competency_profile.required_training_completed, 0),
            'total_required', COALESCE(competency_profile.total_required_training, 0),
            'completion_rate', CASE 
                WHEN COALESCE(competency_profile.total_required_training, 0) > 0 THEN
                    ROUND((COALESCE(competency_profile.required_training_completed, 0)::DECIMAL / 
                           competency_profile.total_required_training) * 100, 2)
                ELSE 0
            END
        ),
        'authorization_issues', authorization_issues,
        'next_assessment_due', competency_profile.next_assessment_due_date,
        'requires_immediate_training', COALESCE(competency_profile.requires_immediate_training, false),
        'access_control_policy_applied', COALESCE(access_control_policy.policy_name, 'Default Policy'),
        'checked_at', NOW()
    );
    
    RETURN access_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-assign training based on SOP performance
CREATE OR REPLACE FUNCTION auto_assign_training_on_sop_performance(
    p_user_id UUID,
    p_sop_document_id UUID,
    p_performance_score DECIMAL(5,2),
    p_completion_status sop_completion_status
)
RETURNS JSONB AS $$
DECLARE
    assignment_result JSONB;
    dependency_record RECORD;
    training_assignments INTEGER := 0;
    workflow_executions INTEGER := 0;
BEGIN
    -- Check for applicable training dependencies
    FOR dependency_record IN
        SELECT * FROM sop_training_dependencies
        WHERE source_sop_id = p_sop_document_id
        AND is_active = true
        AND (
            (dependency_type = 'remedial' AND p_completion_status = 'failed') OR
            (dependency_type = 'remedial' AND p_performance_score < sop_performance_threshold) OR
            (dependency_type = 'follow_up' AND p_completion_status = 'completed')
        )
    LOOP
        -- Check if user already has this training or is excluded
        IF NOT (p_user_id = ANY(dependency_record.user_exclusions)) THEN
            -- Create training assignment (simplified - would integrate with actual assignment system)
            INSERT INTO user_training_progress (
                user_id,
                module_id,
                status,
                started_at
            ) VALUES (
                p_user_id,
                dependency_record.dependent_training_module_id,
                'not_started',
                NOW()
            ) ON CONFLICT (user_id, module_id, attempt_number) DO NOTHING;
            
            training_assignments := training_assignments + 1;
            
            -- Update dependency tracking
            UPDATE sop_training_dependencies
            SET 
                assignments_created = assignments_created + 1,
                last_evaluated_at = NOW()
            WHERE id = dependency_record.id;
        END IF;
    END LOOP;
    
    -- Trigger integration workflows if applicable
    SELECT COUNT(*) INTO workflow_executions
    FROM training_sop_integration_workflows
    WHERE trigger_type = 'sop_completion'
    AND is_active = true
    AND (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = p_user_id));
    
    -- Build result
    assignment_result := jsonb_build_object(
        'user_id', p_user_id,
        'sop_document_id', p_sop_document_id,
        'performance_score', p_performance_score,
        'completion_status', p_completion_status,
        'training_assignments_created', training_assignments,
        'workflow_executions_triggered', workflow_executions,
        'assignment_timestamp', NOW(),
        'success', training_assignments > 0 OR workflow_executions > 0
    );
    
    RETURN assignment_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user competency profile
CREATE OR REPLACE FUNCTION update_user_competency_profile(
    p_user_id UUID,
    p_training_module_id UUID,
    p_assessment_score DECIMAL(5,2),
    p_completion_status training_status
)
RETURNS BOOLEAN AS $$
DECLARE
    competency_map_record RECORD;
    profile_updated BOOLEAN := false;
    new_competency_level competency_level;
    access_authorized BOOLEAN := false;
BEGIN
    -- Find relevant competency mapping
    SELECT stcm.*, ucp.id as profile_id
    INTO competency_map_record
    FROM sop_training_competency_map stcm
    LEFT JOIN user_sop_competency_profiles ucp ON (
        ucp.competency_map_id = stcm.id AND ucp.user_id = p_user_id
    )
    WHERE p_training_module_id = ANY(stcm.required_training_modules)
    AND stcm.is_active = true
    LIMIT 1;
    
    IF competency_map_record.id IS NOT NULL THEN
        -- Determine new competency level based on score
        CASE 
            WHEN p_assessment_score >= 95 THEN new_competency_level := 'expert';
            WHEN p_assessment_score >= 90 THEN new_competency_level := 'advanced';
            WHEN p_assessment_score >= 80 THEN new_competency_level := 'proficient';
            WHEN p_assessment_score >= 70 THEN new_competency_level := 'developing';
            ELSE new_competency_level := 'novice';
        END CASE;
        
        -- Determine if SOP access should be authorized
        access_authorized := (
            p_completion_status = 'completed' AND
            p_assessment_score >= competency_map_record.minimum_training_score
        );
        
        -- Update or insert competency profile
        INSERT INTO user_sop_competency_profiles (
            competency_profile_id,
            user_id,
            competency_map_id,
            current_competency_level,
            competency_score,
            last_assessment_date,
            completed_training_modules,
            theoretical_assessment_score,
            sop_access_authorized,
            access_authorization_date,
            competency_achieved_date,
            total_required_training,
            required_training_completed
        ) VALUES (
            'profile_' || p_user_id || '_' || competency_map_record.id,
            p_user_id,
            competency_map_record.id,
            new_competency_level,
            p_assessment_score,
            CURRENT_DATE,
            ARRAY[p_training_module_id],
            p_assessment_score,
            access_authorized,
            CASE WHEN access_authorized THEN CURRENT_DATE ELSE NULL END,
            CASE WHEN access_authorized THEN CURRENT_DATE ELSE NULL END,
            array_length(competency_map_record.required_training_modules, 1),
            1
        )
        ON CONFLICT (user_id, competency_map_id) DO UPDATE SET
            current_competency_level = GREATEST(
                user_sop_competency_profiles.current_competency_level,
                new_competency_level
            ),
            competency_score = GREATEST(
                user_sop_competency_profiles.competency_score,
                p_assessment_score
            ),
            last_assessment_date = CURRENT_DATE,
            completed_training_modules = array_append(
                user_sop_competency_profiles.completed_training_modules,
                p_training_module_id
            ),
            theoretical_assessment_score = GREATEST(
                user_sop_competency_profiles.theoretical_assessment_score,
                p_assessment_score
            ),
            sop_access_authorized = (
                user_sop_competency_profiles.sop_access_authorized OR access_authorized
            ),
            access_authorization_date = CASE 
                WHEN access_authorized AND user_sop_competency_profiles.access_authorization_date IS NULL 
                THEN CURRENT_DATE 
                ELSE user_sop_competency_profiles.access_authorization_date 
            END,
            required_training_completed = (
                SELECT COUNT(DISTINCT tm_id)
                FROM unnest(
                    array_append(user_sop_competency_profiles.completed_training_modules, p_training_module_id)
                ) AS tm_id
                WHERE tm_id = ANY(competency_map_record.required_training_modules)
            ),
            updated_at = NOW();
        
        profile_updated := true;
    END IF;
    
    RETURN profile_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- INTEGRATION TRIGGERS
-- ===========================================

-- Trigger function for SOP completion integration
CREATE OR REPLACE FUNCTION sop_completion_integration_trigger()
RETURNS TRIGGER AS $$
DECLARE
    integration_result JSONB;
BEGIN
    -- Auto-assign training based on SOP performance
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        IF NEW.status IN ('completed', 'failed') THEN
            SELECT auto_assign_training_on_sop_performance(
                NEW.completed_by,
                NEW.sop_document_id,
                COALESCE(NEW.compliance_score * 100, 0),
                NEW.status
            ) INTO integration_result;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for training completion integration
CREATE OR REPLACE FUNCTION training_completion_integration_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update competency profile when training is completed
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' THEN
        -- Get the assessment score for this training
        PERFORM update_user_competency_profile(
            NEW.user_id,
            NEW.module_id,
            COALESCE((
                SELECT score_percentage 
                FROM training_assessments 
                WHERE user_id = NEW.user_id 
                AND module_id = NEW.module_id 
                AND status = 'passed'
                ORDER BY completed_at DESC 
                LIMIT 1
            ), 0),
            NEW.status
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply integration triggers
CREATE TRIGGER sop_completions_integration_trigger
    AFTER INSERT OR UPDATE ON sop_completions
    FOR EACH ROW
    EXECUTE FUNCTION sop_completion_integration_trigger();

CREATE TRIGGER user_training_progress_integration_trigger
    AFTER UPDATE ON user_training_progress
    FOR EACH ROW
    EXECUTE FUNCTION training_completion_integration_trigger();

-- Trigger for updated_at columns
CREATE TRIGGER update_competency_map_updated_at
    BEFORE UPDATE ON sop_training_competency_map
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competency_profiles_updated_at
    BEFORE UPDATE ON user_sop_competency_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_workflows_updated_at
    BEFORE UPDATE ON training_sop_integration_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_executions_updated_at
    BEFORE UPDATE ON training_sop_integration_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_dependencies_updated_at
    BEFORE UPDATE ON sop_training_dependencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_control_updated_at
    BEFORE UPDATE ON training_based_sop_access_control
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- DEFAULT INTEGRATION SETUP
-- ===========================================

-- Create default competency mappings for existing SOPs
INSERT INTO sop_training_competency_map (
    competency_map_id,
    name,
    description,
    sop_document_id,
    sop_category_id,
    required_training_modules,
    required_competency_level,
    restaurant_id,
    created_by
)
SELECT 
    'competency_' || sd.id,
    'Competency Map - ' || sd.title,
    'Auto-generated competency mapping for SOP: ' || sd.title,
    sd.id,
    sd.category_id,
    ARRAY(
        SELECT tm.id
        FROM training_modules tm
        WHERE tm.sop_document_id = sd.id
        LIMIT 3
    ),
    'proficient',
    sd.restaurant_id,
    (SELECT id FROM auth_users WHERE restaurant_id = sd.restaurant_id AND role = 'admin' LIMIT 1)
FROM sop_documents sd
WHERE EXISTS (
    SELECT 1 FROM training_modules tm WHERE tm.sop_document_id = sd.id
)
AND NOT EXISTS (
    SELECT 1 FROM sop_training_competency_map stcm WHERE stcm.sop_document_id = sd.id
)
LIMIT 20; -- Limit to prevent overwhelming the system

-- Create default access control policies
INSERT INTO training_based_sop_access_control (
    access_control_id,
    policy_name,
    description,
    sop_category_id,
    required_training_modules,
    minimum_competency_level,
    restaurant_id,
    created_by
)
SELECT 
    'access_policy_' || sc.id,
    'Access Policy - ' || sc.name,
    'Default access control policy for category: ' || sc.name,
    sc.id,
    ARRAY(
        SELECT tm.id
        FROM training_modules tm
        JOIN sop_documents sd ON tm.sop_document_id = sd.id
        WHERE sd.category_id = sc.id
        LIMIT 2
    ),
    'proficient',
    sc.restaurant_id,
    (SELECT id FROM auth_users WHERE restaurant_id = sc.restaurant_id AND role = 'admin' LIMIT 1)
FROM sop_categories sc
WHERE EXISTS (
    SELECT 1 FROM sop_documents sd 
    JOIN training_modules tm ON tm.sop_document_id = sd.id
    WHERE sd.category_id = sc.id
)
LIMIT 10; -- Limit to prevent overwhelming the system

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_training_competency_map IS 'Defines competency requirements linking SOPs to required training modules and skill levels';
COMMENT ON TABLE user_sop_competency_profiles IS 'Tracks individual user competency progress and SOP access authorization';
COMMENT ON TABLE training_sop_integration_workflows IS 'Automated workflow definitions for training-SOP integration triggers and actions';
COMMENT ON TABLE training_sop_integration_executions IS 'Execution tracking for integration workflows with detailed step-by-step results';
COMMENT ON TABLE sop_training_dependencies IS 'Defines automatic training assignment rules based on SOP performance and completion';
COMMENT ON TABLE training_based_sop_access_control IS 'Access control policies that restrict SOP access based on training completion and competency';

-- Performance optimization
ANALYZE sop_training_competency_map;
ANALYZE user_sop_competency_profiles;
ANALYZE training_sop_integration_workflows;
ANALYZE training_sop_integration_executions;
ANALYZE sop_training_dependencies;
ANALYZE training_based_sop_access_control;