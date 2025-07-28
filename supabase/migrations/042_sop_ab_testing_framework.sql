-- Restaurant Krong Thai SOP Management System
-- SOP A/B Testing Data Tracking Framework
-- Migration 042: Comprehensive A/B testing framework for SOP optimization
-- Created: 2025-07-28

-- ===========================================
-- A/B TESTING FRAMEWORK ENUMS
-- ===========================================

-- Experiment types
CREATE TYPE experiment_type AS ENUM (
    'sop_content', 'ui_interface', 'recommendation_algorithm', 'training_method',
    'workflow_process', 'notification_timing', 'feature_availability', 'performance_incentive'
);

-- Experiment status
CREATE TYPE experiment_status AS ENUM (
    'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'analyzing'
);

-- Allocation methods
CREATE TYPE allocation_method AS ENUM (
    'random', 'stratified', 'matched_pairs', 'cluster', 'time_based', 'geographic'
);

-- Statistical test types
CREATE TYPE statistical_test AS ENUM (
    't_test', 'chi_square', 'mann_whitney', 'kolmogorov_smirnov', 'bayesian', 'bootstrap'
);

-- Metric types for A/B testing
CREATE TYPE ab_metric_type AS ENUM (
    'conversion_rate', 'completion_time', 'error_rate', 'user_satisfaction',
    'engagement_rate', 'retention_rate', 'learning_efficiency', 'cost_effectiveness'
);

-- ===========================================
-- A/B TESTING CORE TABLES
-- ===========================================

-- A/B test experiments registry
CREATE TABLE IF NOT EXISTS sop_ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Experiment identification
    experiment_name VARCHAR(255) NOT NULL,
    experiment_key VARCHAR(100) NOT NULL, -- Unique key for tracking
    experiment_type experiment_type NOT NULL,
    description TEXT,
    hypothesis TEXT NOT NULL,
    
    -- Experiment design
    control_group_description TEXT,
    treatment_groups JSONB NOT NULL, -- Array of treatment group configurations
    primary_metric ab_metric_type NOT NULL,
    secondary_metrics ab_metric_type[] DEFAULT '{}',
    
    -- Statistical configuration
    allocation_method allocation_method DEFAULT 'random',
    traffic_allocation JSONB NOT NULL, -- Group -> percentage allocation
    minimum_sample_size INTEGER NOT NULL DEFAULT 100,
    statistical_power DECIMAL(4,2) DEFAULT 80.0, -- 80%
    significance_level DECIMAL(4,2) DEFAULT 5.0, -- 5%
    
    -- Effect size and detection
    minimum_detectable_effect DECIMAL(6,4) NOT NULL, -- Minimum effect size to detect
    expected_baseline_value DECIMAL(10,4),
    expected_improvement DECIMAL(6,4),
    
    -- Experiment timeline
    planned_start_date TIMESTAMPTZ,
    planned_end_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    max_duration_days INTEGER DEFAULT 30,
    
    -- Targeting and segmentation
    target_audience JSONB DEFAULT '{}', -- Criteria for participant inclusion
    exclusion_criteria JSONB DEFAULT '{}',
    stratification_factors TEXT[] DEFAULT '{}', -- Factors for stratified randomization
    
    -- Early stopping rules
    early_stopping_enabled BOOLEAN DEFAULT true,
    futility_stopping_threshold DECIMAL(4,2) DEFAULT 10.0, -- % probability of success
    superiority_stopping_threshold DECIMAL(4,2) DEFAULT 99.0, -- % confidence for early win
    interim_analysis_schedule JSONB DEFAULT '{}', -- When to check for early stopping
    
    -- Experiment status and control
    status experiment_status DEFAULT 'draft',
    is_active BOOLEAN DEFAULT false,
    traffic_percentage DECIMAL(5,2) DEFAULT 100.0, -- % of eligible users to include
    
    -- Risk management
    risk_assessment JSONB DEFAULT '{}',
    rollback_conditions JSONB DEFAULT '{}',
    monitoring_alerts JSONB DEFAULT '{}',
    
    -- Analysis configuration
    analysis_plan TEXT,
    statistical_tests statistical_test[] DEFAULT '{t_test}',
    multiple_testing_correction VARCHAR(50) DEFAULT 'bonferroni',
    
    -- Experiment metadata
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ab_exp_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_exp_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_ab_exp_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT unique_experiment_key UNIQUE (restaurant_id, experiment_key),
    CONSTRAINT valid_traffic_allocation CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100)
);

-- A/B test participant assignments
CREATE TABLE IF NOT EXISTS sop_ab_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Assignment details
    assigned_group VARCHAR(100) NOT NULL, -- 'control', 'treatment_a', 'treatment_b', etc.
    assignment_timestamp TIMESTAMPTZ DEFAULT NOW(),
    assignment_method allocation_method,
    
    -- Participant characteristics (for stratification)
    user_characteristics JSONB DEFAULT '{}',
    baseline_metrics JSONB DEFAULT '{}',
    stratification_bucket VARCHAR(100),
    
    -- Exposure tracking
    first_exposure_timestamp TIMESTAMPTZ,
    last_exposure_timestamp TIMESTAMPTZ,
    total_exposures INTEGER DEFAULT 0,
    exposure_duration_seconds INTEGER DEFAULT 0,
    
    -- Participation status
    is_active BOOLEAN DEFAULT true,
    opted_out BOOLEAN DEFAULT false,
    opt_out_reason TEXT,
    opt_out_timestamp TIMESTAMPTZ,
    
    -- Quality control
    is_valid_participant BOOLEAN DEFAULT true,
    exclusion_reason TEXT,
    data_quality_flags JSONB DEFAULT '{}',
    
    CONSTRAINT fk_ab_participant_experiment FOREIGN KEY (experiment_id) REFERENCES sop_ab_experiments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_participant_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_participant_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT unique_experiment_user UNIQUE (experiment_id, user_id)
);

-- A/B test event tracking
CREATE TABLE IF NOT EXISTS sop_ab_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Event details
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- 'exposure', 'conversion', 'interaction', 'completion'
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Event context
    sop_document_id UUID,
    session_id TEXT,
    page_url TEXT,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    
    -- Event data
    event_properties JSONB DEFAULT '{}',
    event_value DECIMAL(15,6), -- Numeric value for the event (time, count, rating, etc.)
    event_metadata JSONB DEFAULT '{}',
    
    -- Experiment context at event time
    assigned_group VARCHAR(100),
    experiment_variant JSONB DEFAULT '{}',
    feature_flags JSONB DEFAULT '{}',
    
    -- Data quality
    is_duplicate BOOLEAN DEFAULT false,
    data_quality_score DECIMAL(4,2) DEFAULT 100,
    processing_flags JSONB DEFAULT '{}',
    
    CONSTRAINT fk_ab_event_experiment FOREIGN KEY (experiment_id) REFERENCES sop_ab_experiments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_event_participant FOREIGN KEY (participant_id) REFERENCES sop_ab_participants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_event_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_event_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_event_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id)
);

-- A/B test metrics and results
CREATE TABLE IF NOT EXISTS sop_ab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Analysis metadata
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    analysis_type VARCHAR(50) DEFAULT 'interim', -- 'interim', 'final', 'post_hoc'
    analysis_period_start TIMESTAMPTZ,
    analysis_period_end TIMESTAMPTZ,
    
    -- Sample sizes
    control_group_size INTEGER NOT NULL,
    treatment_group_sizes JSONB NOT NULL, -- Group -> sample size
    total_sample_size INTEGER NOT NULL,
    
    -- Primary metric results
    primary_metric ab_metric_type NOT NULL,
    control_metric_value DECIMAL(15,6) NOT NULL,
    treatment_metric_values JSONB NOT NULL, -- Group -> metric value
    
    -- Statistical test results
    statistical_test_used statistical_test NOT NULL,
    test_statistic DECIMAL(15,8),
    p_value DECIMAL(15,10),
    confidence_interval_lower DECIMAL(15,6),
    confidence_interval_upper DECIMAL(15,6),
    effect_size DECIMAL(15,6),
    
    -- Practical significance
    relative_improvement DECIMAL(8,4), -- Percentage improvement
    absolute_improvement DECIMAL(15,6),
    practical_significance BOOLEAN DEFAULT false,
    
    -- Statistical significance
    is_statistically_significant BOOLEAN DEFAULT false,
    achieved_statistical_power DECIMAL(5,2),
    confidence_level DECIMAL(5,2),
    
    -- Bayesian analysis (if applicable)
    bayesian_probability_better DECIMAL(5,4), -- Probability treatment is better
    credible_interval_lower DECIMAL(15,6),
    credible_interval_upper DECIMAL(15,6),
    expected_loss DECIMAL(15,6),
    
    -- Secondary metrics
    secondary_metrics_results JSONB DEFAULT '{}', -- Metric -> results object
    
    -- Segmentation analysis
    segment_results JSONB DEFAULT '{}', -- Segment -> results object
    interaction_effects JSONB DEFAULT '{}',
    
    -- Quality metrics
    data_quality_assessment JSONB DEFAULT '{}',
    sample_ratio_mismatch BOOLEAN DEFAULT false,
    novelty_effect_detected BOOLEAN DEFAULT false,
    
    -- Business impact
    business_impact_assessment TEXT,
    estimated_revenue_impact DECIMAL(12,2),
    estimated_cost_impact DECIMAL(12,2),
    roi_estimate DECIMAL(8,4),
    
    -- Recommendations
    recommendation VARCHAR(50), -- 'launch', 'iterate', 'stop', 'continue_testing'
    recommendation_rationale TEXT,
    next_steps JSONB DEFAULT '{}',
    
    CONSTRAINT fk_ab_result_experiment FOREIGN KEY (experiment_id) REFERENCES sop_ab_experiments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_result_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_experiment_analysis UNIQUE (experiment_id, analysis_date, analysis_type)
);

-- A/B test monitoring and alerts
CREATE TABLE IF NOT EXISTS sop_ab_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Monitoring configuration
    monitor_name VARCHAR(255) NOT NULL,
    monitor_type VARCHAR(100) NOT NULL, -- 'sample_ratio', 'data_quality', 'performance', 'guardrail'
    
    -- Alert thresholds
    warning_threshold DECIMAL(10,4),
    critical_threshold DECIMAL(10,4),
    comparison_operator VARCHAR(10) DEFAULT '>>', -- '>', '<', '>=', '<=', '=', '!='
    
    -- Monitoring schedule
    check_frequency_minutes INTEGER DEFAULT 60,
    last_check_timestamp TIMESTAMPTZ,
    next_check_timestamp TIMESTAMPTZ,
    
    -- Alert configuration
    alert_enabled BOOLEAN DEFAULT true,
    alert_recipients TEXT[] DEFAULT '{}',
    alert_methods TEXT[] DEFAULT '{"email"}', -- 'email', 'slack', 'webhook'
    
    -- Current status
    current_value DECIMAL(10,4),
    alert_status VARCHAR(50) DEFAULT 'normal', -- 'normal', 'warning', 'critical'
    last_alert_sent TIMESTAMPTZ,
    alert_count INTEGER DEFAULT 0,
    
    -- Monitoring history
    monitoring_history JSONB DEFAULT '{}', -- Array of historical check results
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ab_monitor_experiment FOREIGN KEY (experiment_id) REFERENCES sop_ab_experiments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_monitor_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- A/B test feature flags and configuration
CREATE TABLE IF NOT EXISTS sop_ab_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Feature flag identification
    flag_key VARCHAR(255) NOT NULL,
    flag_name VARCHAR(255),
    flag_description TEXT,
    
    -- Flag configuration
    flag_type VARCHAR(50) DEFAULT 'boolean', -- 'boolean', 'string', 'number', 'json'
    default_value JSONB NOT NULL DEFAULT 'false',
    
    -- Group-specific configurations
    group_configurations JSONB NOT NULL, -- Group -> flag value
    
    -- Rollout configuration
    rollout_percentage DECIMAL(5,2) DEFAULT 100.0,
    sticky_bucketing BOOLEAN DEFAULT true, -- Keep users in same group across sessions
    
    -- Targeting rules
    targeting_rules JSONB DEFAULT '{}',
    prerequisite_flags TEXT[] DEFAULT '{}',
    
    -- Flag lifecycle
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ab_flag_experiment FOREIGN KEY (experiment_id) REFERENCES sop_ab_experiments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ab_flag_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_experiment_flag_key UNIQUE (experiment_id, flag_key)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- A/B experiments indexes
CREATE INDEX idx_ab_experiments_restaurant ON sop_ab_experiments(restaurant_id);
CREATE INDEX idx_ab_experiments_status ON sop_ab_experiments(status);
CREATE INDEX idx_ab_experiments_active ON sop_ab_experiments(is_active) WHERE is_active = true;
CREATE INDEX idx_ab_experiments_dates ON sop_ab_experiments(actual_start_date, actual_end_date);
CREATE INDEX idx_ab_experiments_type ON sop_ab_experiments(experiment_type);

-- A/B participants indexes
CREATE INDEX idx_ab_participants_experiment ON sop_ab_participants(experiment_id);
CREATE INDEX idx_ab_participants_user ON sop_ab_participants(user_id);
CREATE INDEX idx_ab_participants_restaurant ON sop_ab_participants(restaurant_id);
CREATE INDEX idx_ab_participants_group ON sop_ab_participants(assigned_group);
CREATE INDEX idx_ab_participants_active ON sop_ab_participants(is_active) WHERE is_active = true;
CREATE INDEX idx_ab_participants_assignment_time ON sop_ab_participants(assignment_timestamp);

-- A/B events indexes
CREATE INDEX idx_ab_events_experiment ON sop_ab_events(experiment_id);
CREATE INDEX idx_ab_events_participant ON sop_ab_events(participant_id);
CREATE INDEX idx_ab_events_user_time ON sop_ab_events(user_id, event_timestamp);
CREATE INDEX idx_ab_events_type_time ON sop_ab_events(event_type, event_timestamp);
CREATE INDEX idx_ab_events_sop_document ON sop_ab_events(sop_document_id);
CREATE INDEX idx_ab_events_session ON sop_ab_events(session_id);
CREATE INDEX idx_ab_events_group ON sop_ab_events(assigned_group);

-- A/B results indexes
CREATE INDEX idx_ab_results_experiment ON sop_ab_results(experiment_id);
CREATE INDEX idx_ab_results_restaurant ON sop_ab_results(restaurant_id);
CREATE INDEX idx_ab_results_analysis_date ON sop_ab_results(analysis_date DESC);
CREATE INDEX idx_ab_results_significant ON sop_ab_results(is_statistically_significant) WHERE is_statistically_significant = true;
CREATE INDEX idx_ab_results_metric ON sop_ab_results(primary_metric);

-- A/B monitoring indexes
CREATE INDEX idx_ab_monitoring_experiment ON sop_ab_monitoring(experiment_id);
CREATE INDEX idx_ab_monitoring_active ON sop_ab_monitoring(is_active) WHERE is_active = true;
CREATE INDEX idx_ab_monitoring_next_check ON sop_ab_monitoring(next_check_timestamp);
CREATE INDEX idx_ab_monitoring_alert_status ON sop_ab_monitoring(alert_status);

-- A/B feature flags indexes
CREATE INDEX idx_ab_flags_experiment ON sop_ab_feature_flags(experiment_id);
CREATE INDEX idx_ab_flags_restaurant ON sop_ab_feature_flags(restaurant_id);
CREATE INDEX idx_ab_flags_key ON sop_ab_feature_flags(flag_key);
CREATE INDEX idx_ab_flags_active ON sop_ab_feature_flags(is_active) WHERE is_active = true;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on A/B testing tables
ALTER TABLE sop_ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_ab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_ab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_ab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_ab_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_ab_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "AB experiments restaurant access"
ON sop_ab_experiments FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "AB participants restaurant access"
ON sop_ab_participants FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "AB events restaurant access"
ON sop_ab_events FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "AB results restaurant access"
ON sop_ab_results FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "AB monitoring restaurant access"
ON sop_ab_monitoring FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "AB feature flags restaurant access"
ON sop_ab_feature_flags FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_ab_experiments_updated_at 
    BEFORE UPDATE ON sop_ab_experiments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_ab_monitoring_updated_at 
    BEFORE UPDATE ON sop_ab_monitoring 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_ab_feature_flags_updated_at 
    BEFORE UPDATE ON sop_ab_feature_flags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- UTILITY FUNCTIONS
-- ===========================================

-- Function to assign user to experiment group
CREATE OR REPLACE FUNCTION assign_user_to_experiment(
    p_experiment_id UUID,
    p_user_id UUID,
    p_force_assignment BOOLEAN DEFAULT false
)
RETURNS VARCHAR AS $$
DECLARE
    experiment_config RECORD;
    user_hash INTEGER;
    total_allocation DECIMAL DEFAULT 0;
    current_allocation DECIMAL DEFAULT 0;
    assigned_group VARCHAR(100);
    group_key TEXT;
    group_value JSONB;
BEGIN
    -- Get experiment configuration
    SELECT * INTO experiment_config
    FROM sop_ab_experiments
    WHERE id = p_experiment_id AND (is_active = true OR p_force_assignment = true);
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Generate stable hash for user
    user_hash := ABS(HASHTEXT(p_user_id::TEXT || experiment_config.experiment_key)) % 100;
    
    -- Calculate cumulative allocations and assign group
    FOR group_key, group_value IN
        SELECT * FROM JSONB_EACH(experiment_config.traffic_allocation)
    LOOP
        current_allocation := current_allocation + (group_value #>> '{}')::DECIMAL;
        IF user_hash < current_allocation THEN
            assigned_group := group_key;
            EXIT;
        END IF;
    END LOOP;
    
    -- Insert participant record
    INSERT INTO sop_ab_participants (
        experiment_id, restaurant_id, user_id, assigned_group, assignment_method
    )
    VALUES (
        p_experiment_id, 
        experiment_config.restaurant_id, 
        p_user_id, 
        assigned_group, 
        experiment_config.allocation_method
    )
    ON CONFLICT (experiment_id, user_id) DO NOTHING;
    
    RETURN assigned_group;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate experiment results
CREATE OR REPLACE FUNCTION calculate_experiment_results(
    p_experiment_id UUID,
    p_metric_type ab_metric_type
)
RETURNS TABLE (
    group_name VARCHAR,
    sample_size INTEGER,
    metric_value DECIMAL,
    std_error DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH participant_metrics AS (
        SELECT 
            p.assigned_group,
            p.user_id,
            CASE 
                WHEN p_metric_type = 'conversion_rate' THEN 
                    CASE WHEN COUNT(e.*) FILTER (WHERE e.event_type = 'conversion') > 0 THEN 1.0 ELSE 0.0 END
                WHEN p_metric_type = 'completion_time' THEN 
                    AVG(e.event_value) FILTER (WHERE e.event_type = 'completion')
                ELSE 
                    AVG(e.event_value)
            END as user_metric_value
        FROM sop_ab_participants p
        LEFT JOIN sop_ab_events e ON p.id = e.participant_id
        WHERE p.experiment_id = p_experiment_id
        GROUP BY p.assigned_group, p.user_id
    )
    SELECT 
        pm.assigned_group::VARCHAR as group_name,
        COUNT(*)::INTEGER as sample_size,
        AVG(pm.user_metric_value)::DECIMAL as metric_value,
        (STDDEV(pm.user_metric_value) / SQRT(COUNT(*)))::DECIMAL as std_error
    FROM participant_metrics pm
    WHERE pm.user_metric_value IS NOT NULL
    GROUP BY pm.assigned_group;
END;
$$ LANGUAGE plpgsql;

-- Function to check for sample ratio mismatch
CREATE OR REPLACE FUNCTION check_sample_ratio_mismatch(p_experiment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    expected_ratios JSONB;
    actual_counts JSONB DEFAULT '{}';
    total_participants INTEGER;
    group_key TEXT;
    group_value JSONB;
    expected_count INTEGER;
    actual_count INTEGER;
    chi_square_stat DECIMAL DEFAULT 0;
    degrees_freedom INTEGER;
    critical_value DECIMAL DEFAULT 3.841; -- Chi-square critical value for p < 0.05, df = 1
BEGIN
    -- Get expected traffic allocation
    SELECT traffic_allocation INTO expected_ratios
    FROM sop_ab_experiments
    WHERE id = p_experiment_id;
    
    -- Get total participants
    SELECT COUNT(*) INTO total_participants
    FROM sop_ab_participants
    WHERE experiment_id = p_experiment_id AND is_active = true;
    
    -- Calculate chi-square statistic
    FOR group_key, group_value IN
        SELECT * FROM JSONB_EACH(expected_ratios)
    LOOP
        expected_count := (total_participants * (group_value #>> '{}')::DECIMAL / 100)::INTEGER;
        
        SELECT COUNT(*) INTO actual_count
        FROM sop_ab_participants
        WHERE experiment_id = p_experiment_id 
          AND assigned_group = group_key
          AND is_active = true;
        
        chi_square_stat := chi_square_stat + POWER(actual_count - expected_count, 2) / expected_count;
    END LOOP;
    
    -- Return true if sample ratio mismatch detected
    RETURN chi_square_stat > critical_value;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_ab_experiments IS 'A/B test experiment configurations with statistical parameters and business logic';
COMMENT ON TABLE sop_ab_participants IS 'User assignments to experiment groups with stratification and quality control';
COMMENT ON TABLE sop_ab_events IS 'Event tracking for A/B test interactions and conversions';
COMMENT ON TABLE sop_ab_results IS 'Statistical analysis results and business impact assessment';  
COMMENT ON TABLE sop_ab_monitoring IS 'Real-time monitoring and alerting for experiment quality and performance';
COMMENT ON TABLE sop_ab_feature_flags IS 'Feature flag configurations for A/B test implementations';

-- Performance optimization
ANALYZE sop_ab_experiments;
ANALYZE sop_ab_participants;
ANALYZE sop_ab_events;
ANALYZE sop_ab_results;
ANALYZE sop_ab_monitoring;
ANALYZE sop_ab_feature_flags;