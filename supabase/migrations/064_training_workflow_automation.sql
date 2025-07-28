-- Training Workflow Automation Engine
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive workflow automation for training assignment and progression

-- ===========================================
-- WORKFLOW AUTOMATION ENUMS
-- ===========================================

-- Automation trigger types
CREATE TYPE automation_trigger_type AS ENUM (
    'schedule_based', 'event_driven', 'condition_based', 'user_action', 
    'performance_threshold', 'compliance_deadline', 'business_rule', 'manual_override'
);

-- Automation action types
CREATE TYPE automation_action_type AS ENUM (
    'assign_training', 'send_notification', 'update_progress', 'generate_report',
    'schedule_assessment', 'escalate_issue', 'update_permissions', 'create_certificate',
    'log_audit_event', 'execute_integration', 'trigger_workflow', 'data_sync'
);

-- Workflow execution status
CREATE TYPE workflow_execution_status AS ENUM (
    'queued', 'running', 'paused', 'completed', 'failed', 'cancelled', 'timeout'
);

-- Rule evaluation status
CREATE TYPE rule_evaluation_status AS ENUM (
    'pending', 'evaluating', 'matched', 'not_matched', 'error', 'skipped'
);

-- Automation complexity levels
CREATE TYPE automation_complexity_level AS ENUM (
    'simple', 'moderate', 'complex', 'advanced', 'expert'
);

-- Decision types
CREATE TYPE decision_type AS ENUM (
    'binary', 'multi_choice', 'weighted_score', 'threshold_based', 'ml_prediction'
);

-- ===========================================
-- WORKFLOW AUTOMATION TABLES
-- ===========================================

-- Automation rule definitions
CREATE TABLE IF NOT EXISTS training_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule identification
    rule_id VARCHAR(128) NOT NULL UNIQUE,
    rule_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Rule classification
    rule_category VARCHAR(100) NOT NULL, -- 'assignment', 'progression', 'compliance', 'notification'
    complexity_level automation_complexity_level DEFAULT 'simple',
    business_priority INTEGER DEFAULT 5, -- 1-10 scale
    
    -- Trigger configuration
    trigger_type automation_trigger_type NOT NULL,
    trigger_conditions JSONB NOT NULL, -- Conditions that activate this rule
    trigger_frequency VARCHAR(50), -- 'immediate', 'hourly', 'daily', 'weekly'
    
    -- Rule logic
    evaluation_criteria JSONB NOT NULL, -- Criteria for rule evaluation
    decision_type decision_type DEFAULT 'binary',
    decision_logic JSONB DEFAULT '{}', -- Complex decision-making logic
    
    -- Actions configuration
    primary_actions automation_action_type[] NOT NULL,
    conditional_actions JSONB DEFAULT '{}', -- Actions based on conditions
    failure_actions automation_action_type[] DEFAULT '{}',
    
    -- Scope and targeting
    restaurant_id UUID,
    target_user_groups TEXT[] DEFAULT '{}', -- 'all', 'managers', 'staff', 'new_hires'
    target_roles TEXT[] DEFAULT '{}',
    target_departments TEXT[] DEFAULT '{}',
    exclusion_criteria JSONB DEFAULT '{}',
    
    -- Execution parameters
    execution_delay_minutes INTEGER DEFAULT 0,
    max_execution_time_minutes INTEGER DEFAULT 30,
    retry_attempts INTEGER DEFAULT 3,
    batch_processing_enabled BOOLEAN DEFAULT false,
    max_batch_size INTEGER DEFAULT 100,
    
    -- Scheduling and timing
    schedule_expression VARCHAR(200), -- Cron expression for scheduled rules
    active_hours_start TIME,
    active_hours_end TIME,
    active_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Performance and monitoring
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_execution_time_seconds DECIMAL(10,2) DEFAULT 0,
    last_execution_at TIMESTAMPTZ,
    
    -- Dependencies and prerequisites
    prerequisite_rules UUID[] DEFAULT '{}',
    dependent_rules UUID[] DEFAULT '{}',
    blocking_conditions JSONB DEFAULT '{}',
    
    -- Approval and governance
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approval_date DATE,
    approval_notes TEXT,
    
    -- Rule lifecycle
    is_active BOOLEAN DEFAULT true,
    testing_mode BOOLEAN DEFAULT false,
    created_by UUID NOT NULL,
    last_modified_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_automation_rules_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_automation_rules_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_automation_rules_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_automation_rules_last_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id),
    CONSTRAINT valid_business_priority CHECK (business_priority >= 1 AND business_priority <= 10)
);

-- Workflow execution instances
CREATE TABLE IF NOT EXISTS training_workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Execution identification
    execution_id VARCHAR(128) NOT NULL UNIQUE,
    rule_id UUID NOT NULL,
    
    -- Execution context
    triggered_by_event VARCHAR(200),
    trigger_source_table VARCHAR(100),
    trigger_source_record_id UUID,
    triggered_by_user_id UUID,
    
    -- Target context
    target_user_ids UUID[] DEFAULT '{}',
    target_training_modules UUID[] DEFAULT '{}',
    target_restaurants UUID[] DEFAULT '{}',
    
    -- Execution details
    execution_status workflow_execution_status DEFAULT 'queued',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Processing details
    total_targets INTEGER DEFAULT 0,
    processed_targets INTEGER DEFAULT 0,
    successful_targets INTEGER DEFAULT 0,
    failed_targets INTEGER DEFAULT 0,
    skipped_targets INTEGER DEFAULT 0,
    
    -- Rule evaluation results
    rule_evaluation_status rule_evaluation_status DEFAULT 'pending',
    evaluation_results JSONB DEFAULT '{}',
    decision_outcome JSONB DEFAULT '{}',
    confidence_score DECIMAL(5,2) DEFAULT 0, -- 0-100 scale
    
    -- Action execution results
    actions_executed INTEGER DEFAULT 0,
    actions_successful INTEGER DEFAULT 0,
    actions_failed INTEGER DEFAULT 0,
    action_results JSONB DEFAULT '[]',
    
    -- Data and context
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    execution_context JSONB DEFAULT '{}',
    
    -- Error handling
    error_count INTEGER DEFAULT 0,
    error_messages TEXT[] DEFAULT '{}',
    retry_count INTEGER DEFAULT 0,
    recovery_actions JSONB DEFAULT '[]',
    
    -- Performance metrics
    cpu_time_ms INTEGER DEFAULT 0,
    memory_usage_mb DECIMAL(10,2) DEFAULT 0,
    io_operations INTEGER DEFAULT 0,
    
    -- Business impact
    training_assignments_created INTEGER DEFAULT 0,
    notifications_sent INTEGER DEFAULT 0,
    reports_generated INTEGER DEFAULT 0,
    integrations_triggered INTEGER DEFAULT 0,
    
    -- Audit and compliance
    audit_trail JSONB DEFAULT '[]',
    compliance_check_passed BOOLEAN DEFAULT true,
    data_privacy_validated BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_workflow_executions_rule FOREIGN KEY (rule_id) REFERENCES training_automation_rules(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_executions_triggered_by FOREIGN KEY (triggered_by_user_id) REFERENCES auth_users(id),
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- Automated training assignments
CREATE TABLE IF NOT EXISTS training_automated_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Assignment identification
    assignment_id VARCHAR(128) NOT NULL UNIQUE,
    workflow_execution_id UUID NOT NULL,
    rule_id UUID NOT NULL,
    
    -- Assignment details
    user_id UUID NOT NULL,
    training_module_id UUID NOT NULL,
    assignment_reason VARCHAR(200) NOT NULL,
    
    -- Assignment parameters
    priority sop_priority DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    estimated_duration_minutes INTEGER,
    max_attempts INTEGER DEFAULT 3,
    
    -- Automation context
    auto_assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assignment_criteria JSONB DEFAULT '{}',
    business_justification TEXT,
    
    -- Progress tracking
    assignment_acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    
    -- Completion tracking
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    completion_status training_status,
    final_score DECIMAL(5,2),
    
    -- Follow-up actions
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_actions JSONB DEFAULT '[]',
    next_assignment_scheduled BOOLEAN DEFAULT false,
    
    -- Notification tracking
    initial_notification_sent BOOLEAN DEFAULT false,
    reminder_notifications_sent INTEGER DEFAULT 0,
    last_reminder_sent_at TIMESTAMPTZ,
    
    -- Performance tracking
    time_to_acknowledgment_hours INTEGER,
    time_to_completion_hours INTEGER,
    engagement_score DECIMAL(5,2) DEFAULT 0,
    
    -- Override and exceptions
    overridden BOOLEAN DEFAULT false,
    override_reason TEXT,
    overridden_by UUID,
    overridden_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_automated_assignments_execution FOREIGN KEY (workflow_execution_id) REFERENCES training_workflow_executions(id) ON DELETE CASCADE,
    CONSTRAINT fk_automated_assignments_rule FOREIGN KEY (rule_id) REFERENCES training_automation_rules(id),
    CONSTRAINT fk_automated_assignments_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_automated_assignments_module FOREIGN KEY (training_module_id) REFERENCES training_modules(id),
    CONSTRAINT fk_automated_assignments_overridden_by FOREIGN KEY (overridden_by) REFERENCES auth_users(id)
);

-- Automation decision trees
CREATE TABLE IF NOT EXISTS training_automation_decision_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Decision tree identification
    decision_tree_id VARCHAR(128) NOT NULL UNIQUE,
    rule_id UUID NOT NULL,
    tree_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Tree structure
    tree_definition JSONB NOT NULL, -- Complete decision tree structure
    root_node_id VARCHAR(128) NOT NULL,
    max_depth INTEGER DEFAULT 10,
    total_nodes INTEGER DEFAULT 1,
    leaf_nodes INTEGER DEFAULT 1,
    
    -- Decision logic
    decision_variables JSONB NOT NULL, -- Variables used in decisions
    evaluation_order TEXT[] DEFAULT '{}', -- Order of variable evaluation
    default_outcome JSONB DEFAULT '{}',
    
    -- Performance optimization
    tree_compiled BOOLEAN DEFAULT false,
    compilation_cache JSONB DEFAULT '{}',
    optimization_level VARCHAR(20) DEFAULT 'standard',
    
    -- Training and learning
    learning_enabled BOOLEAN DEFAULT false,
    training_data_source VARCHAR(200),
    model_accuracy DECIMAL(5,2) DEFAULT 0,
    last_trained_at TIMESTAMPTZ,
    
    -- Usage analytics
    evaluation_count INTEGER DEFAULT 0,
    average_evaluation_time_ms DECIMAL(10,2) DEFAULT 0,
    path_frequency JSONB DEFAULT '{}', -- Frequency of decision paths
    
    -- Validation and testing
    validation_accuracy DECIMAL(5,2) DEFAULT 0,
    test_cases_passed INTEGER DEFAULT 0,
    test_cases_total INTEGER DEFAULT 0,
    last_validated_at TIMESTAMPTZ,
    
    -- Version control
    version VARCHAR(20) DEFAULT '1.0',
    previous_version_id UUID,
    change_summary TEXT,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_decision_trees_rule FOREIGN KEY (rule_id) REFERENCES training_automation_rules(id) ON DELETE CASCADE,
    CONSTRAINT fk_decision_trees_previous_version FOREIGN KEY (previous_version_id) REFERENCES training_automation_decision_trees(id),
    CONSTRAINT fk_decision_trees_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT valid_model_accuracy CHECK (model_accuracy >= 0 AND model_accuracy <= 100),
    CONSTRAINT valid_validation_accuracy CHECK (validation_accuracy >= 0 AND validation_accuracy <= 100)
);

-- Automation performance analytics
CREATE TABLE IF NOT EXISTS training_automation_performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Analytics identification
    analytics_id VARCHAR(128) NOT NULL UNIQUE,
    
    -- Time period
    analysis_date DATE NOT NULL,
    analysis_period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    restaurant_id UUID,
    
    -- Rule performance metrics
    active_rules INTEGER DEFAULT 0,
    executed_rules INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    
    -- Execution efficiency
    total_execution_time_seconds BIGINT DEFAULT 0,
    average_execution_time_seconds DECIMAL(10,2) DEFAULT 0,
    fastest_execution_seconds DECIMAL(10,2) DEFAULT 0,
    slowest_execution_seconds DECIMAL(10,2) DEFAULT 0,
    
    -- Training assignment metrics
    assignments_created INTEGER DEFAULT 0,
    assignments_completed INTEGER DEFAULT 0,
    assignments_overdue INTEGER DEFAULT 0,
    assignment_completion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- User engagement metrics
    users_affected INTEGER DEFAULT 0,
    notification_delivery_rate DECIMAL(5,2) DEFAULT 0,
    user_response_rate DECIMAL(5,2) DEFAULT 0,
    average_time_to_response_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Business impact metrics
    training_efficiency_improvement DECIMAL(8,2) DEFAULT 0,
    compliance_score_improvement DECIMAL(5,2) DEFAULT 0,
    cost_savings_estimated DECIMAL(15,2) DEFAULT 0,
    
    -- Quality metrics
    rule_accuracy_score DECIMAL(5,2) DEFAULT 0,
    false_positive_rate DECIMAL(5,2) DEFAULT 0,
    false_negative_rate DECIMAL(5,2) DEFAULT 0,
    user_satisfaction_score DECIMAL(5,2) DEFAULT 0,
    
    -- System performance
    cpu_utilization_percentage DECIMAL(5,2) DEFAULT 0,
    memory_utilization_percentage DECIMAL(5,2) DEFAULT 0,
    throughput_operations_per_hour INTEGER DEFAULT 0,
    
    -- Error analysis
    error_types JSONB DEFAULT '{}',
    most_common_errors TEXT[] DEFAULT '{}',
    error_resolution_time_avg_minutes DECIMAL(10,2) DEFAULT 0,
    
    -- Trend analysis
    period_over_period_change DECIMAL(8,2) DEFAULT 0,
    trend_direction trend_direction DEFAULT 'stable',
    performance_volatility DECIMAL(5,2) DEFAULT 0,
    
    -- Optimization recommendations
    optimization_opportunities JSONB DEFAULT '[]',
    recommended_rule_adjustments JSONB DEFAULT '[]',
    capacity_recommendations TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_automation_analytics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_analytics_period UNIQUE (analysis_date, analysis_period, restaurant_id)
);

-- Automation learning and optimization
CREATE TABLE IF NOT EXISTS training_automation_ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Model identification
    model_id VARCHAR(128) NOT NULL UNIQUE,
    model_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Model classification
    model_type VARCHAR(100) NOT NULL, -- 'classification', 'regression', 'clustering', 'recommendation'
    algorithm VARCHAR(100) NOT NULL, -- 'decision_tree', 'random_forest', 'neural_network', 'svm'
    use_case VARCHAR(200) NOT NULL, -- 'assignment_optimization', 'completion_prediction', 'engagement_scoring'
    
    -- Training data
    training_data_source VARCHAR(200),
    training_dataset_size INTEGER DEFAULT 0,
    feature_count INTEGER DEFAULT 0,
    target_variable VARCHAR(100),
    
    -- Model parameters
    model_parameters JSONB DEFAULT '{}',
    hyperparameters JSONB DEFAULT '{}',
    feature_importance JSONB DEFAULT '{}',
    
    -- Performance metrics
    accuracy_score DECIMAL(5,2) DEFAULT 0,
    precision_score DECIMAL(5,2) DEFAULT 0,
    recall_score DECIMAL(5,2) DEFAULT 0,
    f1_score DECIMAL(5,2) DEFAULT 0,
    auc_score DECIMAL(5,2) DEFAULT 0,
    
    -- Model lifecycle
    training_status VARCHAR(50) DEFAULT 'untrained', -- 'untrained', 'training', 'trained', 'deployed', 'retired'
    last_trained_at TIMESTAMPTZ,
    training_duration_minutes INTEGER DEFAULT 0,
    
    -- Deployment and usage
    deployed_at TIMESTAMPTZ,
    deployment_environment VARCHAR(50) DEFAULT 'production',
    prediction_count INTEGER DEFAULT 0,
    average_prediction_time_ms DECIMAL(10,2) DEFAULT 0,
    
    -- Model monitoring
    drift_detection_enabled BOOLEAN DEFAULT true,
    drift_score DECIMAL(5,2) DEFAULT 0,
    retraining_threshold DECIMAL(5,2) DEFAULT 10.0,
    last_drift_check_at TIMESTAMPTZ,
    
    -- A/B testing
    ab_testing_enabled BOOLEAN DEFAULT false,
    control_group_size DECIMAL(5,2) DEFAULT 50.0,
    test_group_performance JSONB DEFAULT '{}',
    
    -- Model artifacts
    model_artifact_path TEXT,
    model_size_mb DECIMAL(10,2) DEFAULT 0,
    model_checksum VARCHAR(128),
    
    -- Version control
    version VARCHAR(20) DEFAULT '1.0',
    parent_model_id UUID,
    model_lineage JSONB DEFAULT '[]',
    
    -- Governance
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_for_production BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ml_models_parent FOREIGN KEY (parent_model_id) REFERENCES training_automation_ml_models(id),
    CONSTRAINT fk_ml_models_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_ml_models_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_accuracy_score CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
    CONSTRAINT valid_precision_score CHECK (precision_score >= 0 AND precision_score <= 100),
    CONSTRAINT valid_recall_score CHECK (recall_score >= 0 AND recall_score <= 100),
    CONSTRAINT valid_f1_score CHECK (f1_score >= 0 AND f1_score <= 100)
);

-- ===========================================
-- WORKFLOW AUTOMATION INDEXES
-- ===========================================

-- Automation rules indexes
CREATE UNIQUE INDEX idx_automation_rules_rule_id ON training_automation_rules(rule_id);
CREATE INDEX idx_automation_rules_restaurant ON training_automation_rules(restaurant_id);
CREATE INDEX idx_automation_rules_trigger_type ON training_automation_rules(trigger_type);
CREATE INDEX idx_automation_rules_category ON training_automation_rules(rule_category);
CREATE INDEX idx_automation_rules_active ON training_automation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_automation_rules_priority ON training_automation_rules(business_priority);
CREATE INDEX idx_automation_rules_last_execution ON training_automation_rules(last_execution_at);
CREATE INDEX idx_automation_rules_testing_mode ON training_automation_rules(testing_mode) WHERE testing_mode = true;

-- Workflow executions indexes
CREATE UNIQUE INDEX idx_workflow_executions_execution_id ON training_workflow_executions(execution_id);
CREATE INDEX idx_workflow_executions_rule ON training_workflow_executions(rule_id);
CREATE INDEX idx_workflow_executions_status ON training_workflow_executions(execution_status);
CREATE INDEX idx_workflow_executions_started_at ON training_workflow_executions(started_at);
CREATE INDEX idx_workflow_executions_triggered_by ON training_workflow_executions(triggered_by_user_id);
CREATE INDEX idx_workflow_executions_trigger_source ON training_workflow_executions(trigger_source_table, trigger_source_record_id);

-- Automated assignments indexes
CREATE UNIQUE INDEX idx_automated_assignments_assignment_id ON training_automated_assignments(assignment_id);
CREATE INDEX idx_automated_assignments_execution ON training_automated_assignments(workflow_execution_id);
CREATE INDEX idx_automated_assignments_user ON training_automated_assignments(user_id);
CREATE INDEX idx_automated_assignments_module ON training_automated_assignments(training_module_id);
CREATE INDEX idx_automated_assignments_due_date ON training_automated_assignments(due_date);
CREATE INDEX idx_automated_assignments_completed ON training_automated_assignments(completed);
CREATE INDEX idx_automated_assignments_priority ON training_automated_assignments(priority);
CREATE INDEX idx_automated_assignments_overridden ON training_automated_assignments(overridden) WHERE overridden = true;

-- Decision trees indexes
CREATE UNIQUE INDEX idx_decision_trees_decision_tree_id ON training_automation_decision_trees(decision_tree_id);
CREATE INDEX idx_decision_trees_rule ON training_automation_decision_trees(rule_id);
CREATE INDEX idx_decision_trees_active ON training_automation_decision_trees(is_active) WHERE is_active = true;
CREATE INDEX idx_decision_trees_version ON training_automation_decision_trees(version);
CREATE INDEX idx_decision_trees_parent_version ON training_automation_decision_trees(previous_version_id);

-- Performance analytics indexes
CREATE UNIQUE INDEX idx_automation_analytics_analytics_id ON training_automation_performance_analytics(analytics_id);
CREATE INDEX idx_automation_analytics_restaurant ON training_automation_performance_analytics(restaurant_id);
CREATE INDEX idx_automation_analytics_period ON training_automation_performance_analytics(analysis_date, analysis_period);

-- ML models indexes
CREATE UNIQUE INDEX idx_ml_models_model_id ON training_automation_ml_models(model_id);
CREATE INDEX idx_ml_models_type ON training_automation_ml_models(model_type);
CREATE INDEX idx_ml_models_algorithm ON training_automation_ml_models(algorithm);
CREATE INDEX idx_ml_models_status ON training_automation_ml_models(training_status);
CREATE INDEX idx_ml_models_deployed_at ON training_automation_ml_models(deployed_at);
CREATE INDEX idx_ml_models_accuracy ON training_automation_ml_models(accuracy_score);
CREATE INDEX idx_ml_models_parent ON training_automation_ml_models(parent_model_id);

-- JSONB indexes for complex queries
CREATE INDEX idx_automation_rules_trigger_conditions ON training_automation_rules USING GIN(trigger_conditions);
CREATE INDEX idx_automation_rules_evaluation_criteria ON training_automation_rules USING GIN(evaluation_criteria);
CREATE INDEX idx_workflow_executions_input_data ON training_workflow_executions USING GIN(input_data);
CREATE INDEX idx_workflow_executions_output_data ON training_workflow_executions USING GIN(output_data);
CREATE INDEX idx_decision_trees_definition ON training_automation_decision_trees USING GIN(tree_definition);
CREATE INDEX idx_ml_models_parameters ON training_automation_ml_models USING GIN(model_parameters);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on automation tables
ALTER TABLE training_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_automated_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_automation_decision_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_automation_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_automation_ml_models ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Automation rules restaurant isolation"
ON training_automation_rules FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Automation analytics restaurant isolation"
ON training_automation_performance_analytics FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- User access policies
CREATE POLICY "Automated assignments user access"
ON training_automated_assignments FOR ALL TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = training_automated_assignments.user_id)
    )
);

-- Admin access for executions and decision trees
CREATE POLICY "Workflow executions admin access"
ON training_workflow_executions FOR ALL TO authenticated
USING (
    triggered_by_user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Decision trees admin access"
ON training_automation_decision_trees FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "ML models admin access"
ON training_automation_ml_models FOR ALL TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin')
    )
);

-- ===========================================
-- AUTOMATION FUNCTIONS
-- ===========================================

-- Function to evaluate automation rule
CREATE OR REPLACE FUNCTION evaluate_automation_rule(
    p_rule_id UUID,
    p_trigger_data JSONB DEFAULT '{}',
    p_target_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    rule_record RECORD;
    evaluation_result JSONB;
    condition_met BOOLEAN := false;
    confidence_score DECIMAL(5,2) := 0;
    decision_outcome JSONB := '{}';
BEGIN
    -- Get rule details
    SELECT * INTO rule_record
    FROM training_automation_rules
    WHERE id = p_rule_id AND is_active = true;
    
    IF rule_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Rule not found or inactive',
            'rule_id', p_rule_id
        );
    END IF;
    
    -- Basic condition evaluation (simplified for this implementation)
    CASE rule_record.trigger_type
        WHEN 'schedule_based' THEN
            -- Check if current time matches schedule
            condition_met := true; -- Simplified - would check cron expression
            confidence_score := 95.0;
            
        WHEN 'event_driven' THEN
            -- Check if trigger event matches conditions
            condition_met := (p_trigger_data IS NOT NULL AND p_trigger_data != '{}'::jsonb);
            confidence_score := CASE WHEN condition_met THEN 90.0 ELSE 10.0 END;
            
        WHEN 'performance_threshold' THEN
            -- Check performance metrics against thresholds
            DECLARE
                user_performance DECIMAL(5,2);
                threshold DECIMAL(5,2);
            BEGIN
                -- Get user's recent training performance
                SELECT AVG(score_percentage) INTO user_performance
                FROM training_assessments
                WHERE user_id = p_target_user_id
                AND completed_at >= NOW() - INTERVAL '30 days'
                AND status = 'passed';
                
                threshold := COALESCE((rule_record.evaluation_criteria->>'performance_threshold')::DECIMAL(5,2), 80.0);
                condition_met := (user_performance < threshold);
                confidence_score := CASE WHEN condition_met THEN 85.0 ELSE 20.0 END;
            END;
            
        WHEN 'compliance_deadline' THEN
            -- Check if compliance deadline is approaching
            DECLARE
                deadline_days INTEGER;
                current_compliance_status BOOLEAN;
            BEGIN
                deadline_days := COALESCE((rule_record.evaluation_criteria->>'deadline_days')::INTEGER, 30);
                
                -- Check if user has required certifications expiring soon
                SELECT EXISTS (
                    SELECT 1 FROM training_certificates tc
                    WHERE tc.user_id = p_target_user_id
                    AND tc.expires_at <= NOW() + INTERVAL '1 day' * deadline_days
                    AND tc.status = 'active'
                ) INTO current_compliance_status;
                
                condition_met := current_compliance_status;
                confidence_score := CASE WHEN condition_met THEN 95.0 ELSE 5.0 END;
            END;
            
        ELSE
            -- Default evaluation
            condition_met := false;
            confidence_score := 0;
    END CASE;
    
    -- Build decision outcome
    decision_outcome := jsonb_build_object(
        'condition_met', condition_met,
        'confidence_score', confidence_score,
        'evaluation_timestamp', NOW(),
        'rule_category', rule_record.rule_category,
        'trigger_type', rule_record.trigger_type,
        'target_user_id', p_target_user_id,
        'recommended_actions', CASE 
            WHEN condition_met THEN rule_record.primary_actions
            ELSE '{}'::automation_action_type[]
        END
    );
    
    -- Build evaluation result
    evaluation_result := jsonb_build_object(
        'success', true,
        'rule_id', p_rule_id,
        'rule_name', rule_record.rule_name,
        'evaluation_status', CASE WHEN condition_met THEN 'matched' ELSE 'not_matched' END,
        'decision_outcome', decision_outcome,
        'trigger_data', p_trigger_data,
        'evaluation_timestamp', NOW()
    );
    
    RETURN evaluation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute workflow automation
CREATE OR REPLACE FUNCTION execute_workflow_automation(
    p_rule_id UUID,
    p_trigger_data JSONB DEFAULT '{}',
    p_target_user_ids UUID[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    execution_uuid UUID;
    execution_id_text TEXT;
    rule_record RECORD;
    target_user_id UUID;
    evaluation_result JSONB;
    actions_executed INTEGER := 0;
    successful_actions INTEGER := 0;
    assignment_created BOOLEAN := false;
BEGIN
    -- Get rule details
    SELECT * INTO rule_record
    FROM training_automation_rules
    WHERE id = p_rule_id AND is_active = true;
    
    IF rule_record.id IS NULL THEN
        RAISE EXCEPTION 'Rule not found or inactive: %', p_rule_id;
    END IF;
    
    -- Generate execution ID
    execution_id_text := 'exec_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
                        encode(gen_random_bytes(6), 'hex');
    
    -- Create workflow execution record
    INSERT INTO training_workflow_executions (
        execution_id,
        rule_id,
        triggered_by_event,
        triggered_by_user_id,
        target_user_ids,
        execution_status,
        total_targets,
        input_data,
        execution_context
    ) VALUES (
        execution_id_text,
        p_rule_id,
        'manual_execution',
        auth.uid(),
        COALESCE(p_target_user_ids, '{}'),
        'running',
        COALESCE(array_length(p_target_user_ids, 1), 0),
        p_trigger_data,
        jsonb_build_object(
            'rule_category', rule_record.rule_category,
            'trigger_type', rule_record.trigger_type,
            'execution_timestamp', NOW()
        )
    ) RETURNING id INTO execution_uuid;
    
    -- Process each target user
    IF p_target_user_ids IS NOT NULL THEN
        FOREACH target_user_id IN ARRAY p_target_user_ids
        LOOP
            -- Evaluate rule for this user
            evaluation_result := evaluate_automation_rule(p_rule_id, p_trigger_data, target_user_id);
            
            -- Execute actions if conditions are met
            IF (evaluation_result->'decision_outcome'->>'condition_met')::BOOLEAN = true THEN
                -- Execute primary actions
                IF 'assign_training' = ANY(rule_record.primary_actions) THEN
                    -- Auto-assign training based on rule configuration
                    DECLARE
                        training_module_id UUID;
                        assignment_id_text TEXT;
                    BEGIN
                        -- Get training module from rule configuration (simplified)
                        training_module_id := (rule_record.evaluation_criteria->>'training_module_id')::UUID;
                        
                        IF training_module_id IS NOT NULL THEN
                            assignment_id_text := 'auto_' || execution_uuid || '_' || target_user_id;
                            
                            INSERT INTO training_automated_assignments (
                                assignment_id,
                                workflow_execution_id,
                                rule_id,
                                user_id,
                                training_module_id,
                                assignment_reason,
                                priority,
                                due_date,
                                business_justification
                            ) VALUES (
                                assignment_id_text,
                                execution_uuid,
                                p_rule_id,
                                target_user_id,
                                training_module_id,
                                'Automated assignment based on rule: ' || rule_record.rule_name,
                                'medium',
                                NOW() + INTERVAL '7 days',
                                'Rule-based automation for compliance and performance improvement'
                            );
                            
                            assignment_created := true;
                        END IF;
                    END;
                END IF;
                
                actions_executed := actions_executed + 1;
                successful_actions := successful_actions + 1;
            END IF;
            
            -- Update processed count
            UPDATE training_workflow_executions
            SET processed_targets = processed_targets + 1
            WHERE id = execution_uuid;
        END LOOP;
    END IF;
    
    -- Update execution record with final results
    UPDATE training_workflow_executions
    SET 
        execution_status = 'completed',
        completed_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
        successful_targets = successful_actions,
        actions_executed = actions_executed,
        actions_successful = successful_actions,
        training_assignments_created = CASE WHEN assignment_created THEN 1 ELSE 0 END,
        output_data = jsonb_build_object(
            'total_processed', COALESCE(array_length(p_target_user_ids, 1), 0),
            'successful_actions', successful_actions,
            'assignments_created', CASE WHEN assignment_created THEN 1 ELSE 0 END
        )
    WHERE id = execution_uuid;
    
    -- Update rule execution statistics
    UPDATE training_automation_rules
    SET 
        execution_count = execution_count + 1,
        success_count = success_count + CASE WHEN successful_actions > 0 THEN 1 ELSE 0 END,
        last_execution_at = NOW()
    WHERE id = p_rule_id;
    
    RETURN execution_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create intelligent training assignment
CREATE OR REPLACE FUNCTION create_intelligent_training_assignment(
    p_user_id UUID,
    p_trigger_reason VARCHAR(200) DEFAULT 'performance_based',
    p_analysis_criteria JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    assignment_result JSONB;
    recommended_modules UUID[];
    user_performance RECORD;
    applicable_rules UUID[];
    rule_id UUID;
    execution_id UUID;
BEGIN
    -- Analyze user performance and training needs
    SELECT 
        AVG(ta.score_percentage) as avg_assessment_score,
        COUNT(*) FILTER (WHERE ta.status = 'failed') as failed_assessments,
        COUNT(*) FILTER (WHERE utp.status = 'completed') as completed_trainings,
        COUNT(*) FILTER (WHERE utp.status = 'in_progress') as in_progress_trainings
    INTO user_performance
    FROM auth_users au
    LEFT JOIN user_training_progress utp ON au.id = utp.user_id
    LEFT JOIN training_assessments ta ON au.id = ta.user_id
    WHERE au.id = p_user_id
    AND (utp.created_at >= NOW() - INTERVAL '90 days' OR utp.created_at IS NULL)
    AND (ta.completed_at >= NOW() - INTERVAL '90 days' OR ta.completed_at IS NULL);
    
    -- Find applicable automation rules for this scenario
    SELECT array_agg(id) INTO applicable_rules
    FROM training_automation_rules
    WHERE is_active = true
    AND rule_category = 'assignment'
    AND (
        (trigger_type = 'performance_threshold' AND 
         COALESCE(user_performance.avg_assessment_score, 0) < 
         COALESCE((evaluation_criteria->>'performance_threshold')::DECIMAL(5,2), 80)) OR
        (trigger_type = 'condition_based' AND p_trigger_reason = 'performance_based')
    );
    
    -- Execute applicable rules
    IF applicable_rules IS NOT NULL AND array_length(applicable_rules, 1) > 0 THEN
        FOREACH rule_id IN ARRAY applicable_rules
        LOOP
            -- Execute workflow automation for this rule
            execution_id := execute_workflow_automation(
                rule_id,
                jsonb_build_object(
                    'trigger_reason', p_trigger_reason,
                    'user_performance', to_jsonb(user_performance),
                    'analysis_criteria', p_analysis_criteria
                ),
                ARRAY[p_user_id]
            );
        END LOOP;
        
        assignment_result := jsonb_build_object(
            'success', true,
            'user_id', p_user_id,
            'trigger_reason', p_trigger_reason,
            'rules_executed', applicable_rules,
            'executions_created', array_length(applicable_rules, 1),
            'user_performance_analysis', to_jsonb(user_performance),
            'created_at', NOW()
        );
    ELSE
        assignment_result := jsonb_build_object(
            'success', false,
            'user_id', p_user_id,
            'trigger_reason', p_trigger_reason,
            'message', 'No applicable automation rules found',
            'user_performance_analysis', to_jsonb(user_performance),
            'created_at', NOW()
        );
    END IF;
    
    RETURN assignment_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- AUTOMATION TRIGGERS
-- ===========================================

-- Trigger function for automated training assignment
CREATE OR REPLACE FUNCTION automated_training_assignment_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Trigger automation when training is failed or performance is poor
    IF TG_TABLE_NAME = 'training_assessments' THEN
        IF NEW.status = 'failed' OR (NEW.status = 'passed' AND NEW.score_percentage < 70) THEN
            -- Create intelligent training assignment
            PERFORM create_intelligent_training_assignment(
                NEW.user_id,
                'assessment_performance',
                jsonb_build_object(
                    'assessment_id', NEW.id,
                    'score', NEW.score_percentage,
                    'status', NEW.status,
                    'module_id', NEW.module_id
                )
            );
        END IF;
    END IF;
    
    -- Trigger automation when SOP completion fails
    IF TG_TABLE_NAME = 'sop_completions' THEN
        IF NEW.status = 'failed' OR NEW.compliance_score < 0.7 THEN
            -- Create intelligent training assignment
            PERFORM create_intelligent_training_assignment(
                NEW.completed_by,
                'sop_performance',
                jsonb_build_object(
                    'sop_completion_id', NEW.id,
                    'sop_document_id', NEW.sop_document_id,
                    'compliance_score', NEW.compliance_score,
                    'status', NEW.status
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply automation triggers
CREATE TRIGGER training_assessments_automation_trigger
    AFTER UPDATE ON training_assessments
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.score_percentage IS DISTINCT FROM NEW.score_percentage)
    EXECUTE FUNCTION automated_training_assignment_trigger();

CREATE TRIGGER sop_completions_automation_trigger
    AFTER INSERT OR UPDATE ON sop_completions
    FOR EACH ROW
    EXECUTE FUNCTION automated_training_assignment_trigger();

-- Trigger for updated_at columns
CREATE TRIGGER update_automation_rules_updated_at
    BEFORE UPDATE ON training_automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_executions_updated_at
    BEFORE UPDATE ON training_workflow_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automated_assignments_updated_at
    BEFORE UPDATE ON training_automated_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decision_trees_updated_at
    BEFORE UPDATE ON training_automation_decision_trees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_models_updated_at
    BEFORE UPDATE ON training_automation_ml_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- DEFAULT AUTOMATION SETUP
-- ===========================================

-- Create default automation rules
INSERT INTO training_automation_rules (
    rule_id,
    rule_name,
    description,
    rule_category,
    trigger_type,
    trigger_conditions,
    evaluation_criteria,
    primary_actions,
    restaurant_id,
    created_by
) VALUES 
(
    'failed_assessment_remedial_training',
    'Failed Assessment Remedial Training',
    'Automatically assign remedial training when assessment is failed',
    'assignment',
    'event_driven',
    jsonb_build_object(
        'event_type', 'assessment_failed',
        'threshold_score', 70
    ),
    jsonb_build_object(
        'performance_threshold', 70.0,
        'max_attempts', 3
    ),
    ARRAY['assign_training', 'send_notification'],
    NULL, -- Global rule
    '00000000-0000-0000-0000-000000000000'::UUID
),
(
    'poor_sop_performance_training',
    'Poor SOP Performance Training Assignment',
    'Assign additional training for poor SOP completion performance',
    'assignment',
    'performance_threshold',
    jsonb_build_object(
        'event_type', 'sop_completion',
        'compliance_threshold', 0.7
    ),
    jsonb_build_object(
        'compliance_threshold', 0.7,
        'training_module_id', NULL
    ),
    ARRAY['assign_training', 'escalate_issue'],
    NULL, -- Global rule
    '00000000-0000-0000-0000-000000000000'::UUID
),
(
    'new_hire_onboarding_automation',
    'New Hire Onboarding Training Assignment',
    'Automatically assign onboarding training to new hires',
    'assignment',
    'event_driven',
    jsonb_build_object(
        'event_type', 'user_created',
        'user_role', 'staff'
    ),
    jsonb_build_object(
        'days_since_created', 1,
        'required_modules', '[]'
    ),
    ARRAY['assign_training', 'send_notification', 'create_certificate'],
    NULL, -- Global rule
    '00000000-0000-0000-0000-000000000000'::UUID
);

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_automation_rules IS 'Comprehensive automation rules for training workflow management with intelligent decision-making';
COMMENT ON TABLE training_workflow_executions IS 'Workflow execution tracking with detailed performance metrics and business impact analysis';
COMMENT ON TABLE training_automated_assignments IS 'Automated training assignments with intelligent targeting and progress monitoring';
COMMENT ON TABLE training_automation_decision_trees IS 'Decision tree algorithms for complex automation logic with machine learning capabilities';
COMMENT ON TABLE training_automation_performance_analytics IS 'Performance analytics for automation effectiveness and optimization insights';
COMMENT ON TABLE training_automation_ml_models IS 'Machine learning models for predictive automation and intelligent recommendations';

-- Performance optimization
ANALYZE training_automation_rules;
ANALYZE training_workflow_executions;
ANALYZE training_automated_assignments;
ANALYZE training_automation_decision_trees;
ANALYZE training_automation_performance_analytics;
ANALYZE training_automation_ml_models;