-- Restaurant Krong Thai SOP Management System
-- SOP Staff Performance Correlation Data
-- Migration 048: Staff performance correlation and optimization analytics
-- Created: 2025-07-28

-- ===========================================
-- STAFF PERFORMANCE ENUMS
-- ===========================================

-- Performance rating scales
CREATE TYPE performance_rating AS ENUM ('excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory');

-- Staff roles and levels
CREATE TYPE staff_level AS ENUM ('trainee', 'junior', 'senior', 'supervisor', 'manager', 'executive');

-- Performance dimensions
CREATE TYPE performance_dimension AS ENUM (
    'efficiency', 'quality', 'accuracy', 'speed', 'consistency', 'learning_agility',
    'teamwork', 'leadership', 'customer_service', 'safety_compliance', 'innovation'
);

-- Improvement areas
CREATE TYPE improvement_area AS ENUM (
    'technical_skills', 'soft_skills', 'process_knowledge', 'tool_proficiency',
    'time_management', 'quality_focus', 'communication', 'problem_solving'
);

-- Assessment methods
CREATE TYPE assessment_method AS ENUM (
    'self_assessment', 'peer_review', 'supervisor_evaluation', 'customer_feedback',
    'objective_metrics', 'observation', '360_review', 'skill_test'
);

-- ===========================================
-- STAFF PERFORMANCE TRACKING TABLES
-- ===========================================

-- Individual staff performance profiles and baselines
CREATE TABLE IF NOT EXISTS sop_staff_performance_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Staff information
    staff_level staff_level NOT NULL,
    primary_department VARCHAR(100), -- kitchen, service, bar, management
    secondary_departments TEXT[],
    years_of_experience DECIMAL(4,1) DEFAULT 0,
    months_at_current_restaurant INTEGER DEFAULT 0,
    
    -- Baseline performance metrics
    baseline_efficiency_score DECIMAL(5,2) DEFAULT 100, -- 0-100
    baseline_quality_score DECIMAL(5,2) DEFAULT 100,
    baseline_speed_score DECIMAL(5,2) DEFAULT 100,
    baseline_accuracy_score DECIMAL(5,2) DEFAULT 100,
    baseline_consistency_score DECIMAL(5,2) DEFAULT 100,
    
    -- Learning and development
    learning_agility_score DECIMAL(5,2) DEFAULT 50, -- 0-100
    training_completion_rate DECIMAL(5,2) DEFAULT 0, -- 0-100
    certification_count INTEGER DEFAULT 0,
    last_training_date DATE,
    preferred_learning_style VARCHAR(50), -- visual, auditory, kinesthetic, reading
    
    -- Collaboration and teamwork
    teamwork_score DECIMAL(5,2) DEFAULT 50,
    leadership_potential_score DECIMAL(5,2) DEFAULT 0,
    mentoring_others_count INTEGER DEFAULT 0,
    peer_collaboration_frequency DECIMAL(5,2) DEFAULT 0,
    
    -- Customer interaction (if applicable)
    customer_facing_role BOOLEAN DEFAULT false,
    customer_satisfaction_score DECIMAL(5,2) DEFAULT 100,
    customer_complaints_count INTEGER DEFAULT 0,
    customer_compliments_count INTEGER DEFAULT 0,
    
    -- Specializations and strengths
    specialized_sop_categories UUID[], -- Array of category IDs
    strength_areas improvement_area[],
    development_areas improvement_area[],
    career_aspirations TEXT[],
    
    -- Performance trends
    overall_performance_trend VARCHAR(20) DEFAULT 'stable', -- improving, declining, stable
    performance_volatility DECIMAL(5,2) DEFAULT 0, -- 0-100, higher = more inconsistent
    peak_performance_conditions JSONB DEFAULT '{}',
    performance_decline_indicators JSONB DEFAULT '{}',
    
    -- Motivation and engagement
    job_satisfaction_score DECIMAL(5,2) DEFAULT 50, -- 0-100
    engagement_level DECIMAL(5,2) DEFAULT 50,
    retention_risk_score DECIMAL(5,2) DEFAULT 0, -- 0-100, higher = higher risk
    promotion_readiness_score DECIMAL(5,2) DEFAULT 0,
    
    -- Work preferences and patterns
    preferred_shift_types TEXT[],
    optimal_team_size INTEGER DEFAULT 5,
    work_environment_preferences JSONB DEFAULT '{}',
    stress_tolerance_level DECIMAL(5,2) DEFAULT 50,
    
    -- Performance goals and targets
    current_performance_goals JSONB DEFAULT '{}',
    target_efficiency_score DECIMAL(5,2) DEFAULT 100,
    target_quality_score DECIMAL(5,2) DEFAULT 100,
    development_plan JSONB DEFAULT '{}',
    
    -- Assessment metadata
    last_comprehensive_review DATE,
    next_review_due DATE,
    review_frequency_months INTEGER DEFAULT 6,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_staff_profile_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_profile_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_profile_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_staff_profile UNIQUE (restaurant_id, user_id)
);

-- Detailed SOP performance correlation tracking
CREATE TABLE IF NOT EXISTS sop_staff_sop_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    
    -- Performance period
    performance_date DATE NOT NULL,
    performance_period VARCHAR(20) DEFAULT 'daily', -- hourly, daily, weekly, monthly
    shift_type VARCHAR(50),
    
    -- SOP execution metrics
    executions_attempted INTEGER DEFAULT 0,
    executions_completed INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN executions_attempted > 0 THEN 
            (executions_completed::DECIMAL / executions_attempted) * 100 
        ELSE 0 END
    ) STORED,
    
    -- Time and efficiency metrics
    average_completion_time_minutes DECIMAL(8,2) DEFAULT 0,
    fastest_completion_time_minutes DECIMAL(8,2) DEFAULT 0,
    slowest_completion_time_minutes DECIMAL(8,2) DEFAULT 0,
    time_consistency_score DECIMAL(5,2) DEFAULT 100, -- Lower variance = higher score
    
    -- Quality and accuracy metrics
    quality_score DECIMAL(5,2) DEFAULT 100, -- 0-100
    accuracy_percentage DECIMAL(5,2) DEFAULT 100, -- 0-100
    error_count INTEGER DEFAULT 0,
    rework_instances INTEGER DEFAULT 0,
    supervisor_interventions INTEGER DEFAULT 0,
    
    -- Efficiency benchmarking
    performance_vs_standard DECIMAL(8,4) DEFAULT 100, -- % of standard performance
    performance_vs_peers DECIMAL(8,4) DEFAULT 100, -- % compared to peer average
    efficiency_improvement_rate DECIMAL(8,4) DEFAULT 0, -- % improvement over time
    
    -- Learning and adaptation
    first_attempt_success BOOLEAN DEFAULT true,
    learning_curve_stage VARCHAR(50), -- 'initial', 'learning', 'competent', 'expert'
    training_correlation_score DECIMAL(8,4) DEFAULT 0, -- Correlation with training
    help_requests_count INTEGER DEFAULT 0,
    
    -- Contextual factors
    team_size_during_execution INTEGER,
    customer_volume_during_execution INTEGER,
    environmental_conditions JSONB DEFAULT '{}', -- Temperature, noise, etc.
    equipment_conditions JSONB DEFAULT '{}', -- Equipment used and condition
    
    -- Collaboration and teamwork
    collaboration_instances INTEGER DEFAULT 0,
    mentoring_others_instances INTEGER DEFAULT 0,
    peer_assistance_received INTEGER DEFAULT 0,
    peer_assistance_provided INTEGER DEFAULT 0,
    
    -- Innovation and improvement
    improvement_suggestions_made INTEGER DEFAULT 0,
    process_innovations_implemented INTEGER DEFAULT 0,
    best_practices_shared INTEGER DEFAULT 0,
    
    -- Stress and workload indicators
    workload_intensity_score DECIMAL(5,2) DEFAULT 50, -- 0-100
    stress_level_indicators JSONB DEFAULT '{}',
    fatigue_impact_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    multitasking_complexity_score DECIMAL(5,2) DEFAULT 0,
    
    -- Customer impact (if customer-facing SOP)
    customer_satisfaction_impact DECIMAL(8,4) DEFAULT 0, -- Correlation with satisfaction
    customer_wait_time_impact DECIMAL(8,4) DEFAULT 0,
    customer_complaint_correlation DECIMAL(8,4) DEFAULT 0,
    
    -- Financial impact
    cost_per_execution DECIMAL(8,4) DEFAULT 0,
    revenue_impact_per_execution DECIMAL(8,4) DEFAULT 0,
    waste_generation_per_execution DECIMAL(6,4) DEFAULT 0,
    resource_utilization_efficiency DECIMAL(5,2) DEFAULT 100,
    
    -- Predictive indicators
    burnout_risk_indicators JSONB DEFAULT '{}',
    performance_decline_risk DECIMAL(5,2) DEFAULT 0,
    improvement_potential_score DECIMAL(5,2) DEFAULT 0,
    
    -- Data quality and validation
    data_completeness_score DECIMAL(5,2) DEFAULT 100,
    measurement_confidence DECIMAL(5,2) DEFAULT 100,
    observer_bias_risk DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_staff_sop_perf_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_sop_perf_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_sop_perf_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT unique_staff_sop_performance UNIQUE (restaurant_id, user_id, sop_document_id, performance_date, performance_period)
);

-- Performance assessments and evaluations
CREATE TABLE IF NOT EXISTS sop_staff_performance_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Assessment details
    assessment_name VARCHAR(255) NOT NULL,
    assessment_type VARCHAR(100), -- 'annual_review', 'quarterly_check', 'skill_assessment', 'probation_review'
    assessment_method assessment_method NOT NULL,
    assessment_date DATE NOT NULL,
    assessment_period_start DATE,
    assessment_period_end DATE,
    
    -- Assessor information
    assessor_id UUID,
    assessor_role VARCHAR(100), -- supervisor, peer, customer, external
    assessment_context VARCHAR(255), -- Context of assessment
    
    -- Performance dimensions scoring
    efficiency_rating performance_rating DEFAULT 'satisfactory',
    efficiency_score DECIMAL(5,2) DEFAULT 50,
    efficiency_comments TEXT,
    
    quality_rating performance_rating DEFAULT 'satisfactory',
    quality_score DECIMAL(5,2) DEFAULT 50,
    quality_comments TEXT,
    
    accuracy_rating performance_rating DEFAULT 'satisfactory',
    accuracy_score DECIMAL(5,2) DEFAULT 50,
    accuracy_comments TEXT,
    
    speed_rating performance_rating DEFAULT 'satisfactory',
    speed_score DECIMAL(5,2) DEFAULT 50,
    speed_comments TEXT,
    
    consistency_rating performance_rating DEFAULT 'satisfactory',
    consistency_score DECIMAL(5,2) DEFAULT 50,
    consistency_comments TEXT,
    
    learning_agility_rating performance_rating DEFAULT 'satisfactory',
    learning_agility_score DECIMAL(5,2) DEFAULT 50,
    learning_agility_comments TEXT,
    
    teamwork_rating performance_rating DEFAULT 'satisfactory',
    teamwork_score DECIMAL(5,2) DEFAULT 50,
    teamwork_comments TEXT,
    
    -- Overall assessment
    overall_rating performance_rating NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    overall_comments TEXT,
    
    -- Strengths and areas for improvement
    key_strengths TEXT[],
    improvement_areas TEXT[],
    specific_achievements TEXT[],
    areas_of_concern TEXT[],
    
    -- Goal setting and development
    performance_goals_met INTEGER DEFAULT 0,
    performance_goals_total INTEGER DEFAULT 0,
    new_goals_set JSONB DEFAULT '{}',
    development_plan_updated JSONB DEFAULT '{}',
    training_recommendations TEXT[],
    
    -- Comparative analysis
    performance_vs_previous_assessment DECIMAL(8,4) DEFAULT 0,
    performance_vs_department_average DECIMAL(8,4) DEFAULT 0,
    performance_vs_experience_level DECIMAL(8,4) DEFAULT 0,
    ranking_within_peer_group INTEGER,
    
    -- Action items and follow-up
    immediate_action_items TEXT[],
    long_term_development_plan TEXT[],
    support_needed TEXT[],
    resources_required TEXT[],
    
    -- Career development
    promotion_readiness BOOLEAN DEFAULT false,
    promotion_timeline_months INTEGER,
    career_path_discussion TEXT,
    succession_planning_notes TEXT,
    
    -- Assessment validity and reliability
    assessment_bias_mitigation TEXT[],
    inter_rater_reliability_score DECIMAL(5,2), -- If multiple assessors
    assessment_completion_time_minutes INTEGER,
    assessment_quality_score DECIMAL(5,2) DEFAULT 100,
    
    -- Follow-up and monitoring
    next_assessment_due DATE,
    interim_check_dates DATE[],
    progress_monitoring_plan TEXT,
    
    -- Documentation and compliance
    documentation_complete BOOLEAN DEFAULT false,
    employee_acknowledgment BOOLEAN DEFAULT false,
    employee_signature_date DATE,
    hr_review_required BOOLEAN DEFAULT false,
    hr_review_completed BOOLEAN DEFAULT false,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_staff_assessment_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_assessment_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_assessment_assessor FOREIGN KEY (assessor_id) REFERENCES auth_users(id),
    CONSTRAINT fk_staff_assessment_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT valid_assessment_period CHECK (assessment_period_end IS NULL OR assessment_period_end >= assessment_period_start)
);

-- Team performance dynamics and collaboration analysis
CREATE TABLE IF NOT EXISTS sop_team_performance_dynamics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Team identification
    team_name VARCHAR(255),
    team_composition UUID[], -- Array of user IDs
    team_size INTEGER NOT NULL,
    primary_department VARCHAR(100),
    team_formation_date DATE,
    
    -- Analysis period
    analysis_date DATE NOT NULL,
    analysis_period VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    shift_type VARCHAR(50),
    
    -- Team performance metrics
    team_efficiency_score DECIMAL(5,2) DEFAULT 100,
    team_quality_score DECIMAL(5,2) DEFAULT 100,
    team_coordination_score DECIMAL(5,2) DEFAULT 100,
    team_communication_score DECIMAL(5,2) DEFAULT 100,
    
    -- Individual vs team performance
    individual_performance_sum DECIMAL(8,2) DEFAULT 0,
    team_synergy_factor DECIMAL(8,4) DEFAULT 1.0, -- Team performance / sum of individual
    collaboration_effectiveness DECIMAL(5,2) DEFAULT 100,
    
    -- SOP execution as a team
    team_sop_executions INTEGER DEFAULT 0,
    parallel_sop_executions INTEGER DEFAULT 0,
    sequential_sop_executions INTEGER DEFAULT 0,
    collaborative_sop_executions INTEGER DEFAULT 0,
    
    -- Performance distribution
    performance_variance DECIMAL(8,4) DEFAULT 0, -- How much individual performance varies
    top_performer_id UUID,
    bottom_performer_id UUID,
    performance_gap DECIMAL(8,4) DEFAULT 0, -- Gap between top and bottom
    
    -- Team dynamics indicators
    knowledge_sharing_instances INTEGER DEFAULT 0,
    peer_mentoring_instances INTEGER DEFAULT 0,
    conflict_resolution_instances INTEGER DEFAULT 0,
    innovation_collaboration_instances INTEGER DEFAULT 0,
    
    -- Leadership and delegation
    natural_leaders_identified UUID[],
    delegation_effectiveness_score DECIMAL(5,2) DEFAULT 100,
    decision_making_speed_score DECIMAL(5,2) DEFAULT 100,
    authority_clarity_score DECIMAL(5,2) DEFAULT 100,
    
    -- Team stress and workload
    team_workload_balance_score DECIMAL(5,2) DEFAULT 100,
    stress_distribution_fairness DECIMAL(5,2) DEFAULT 100,
    burnout_risk_team_level DECIMAL(5,2) DEFAULT 0,
    team_resilience_score DECIMAL(5,2) DEFAULT 100,
    
    -- Customer and business impact
    team_customer_satisfaction_impact DECIMAL(8,4) DEFAULT 0,
    team_revenue_contribution DECIMAL(12,2) DEFAULT 0,
    team_cost_efficiency DECIMAL(8,4) DEFAULT 100,
    team_error_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Team learning and development
    team_learning_velocity DECIMAL(5,2) DEFAULT 0, -- How fast team adopts new practices
    cross_training_level DECIMAL(5,2) DEFAULT 0, -- % of team cross-trained
    skill_redundancy_score DECIMAL(5,2) DEFAULT 0, -- Coverage if someone is absent
    knowledge_documentation_score DECIMAL(5,2) DEFAULT 0,
    
    -- Performance predictors
    team_composition_optimization_score DECIMAL(5,2) DEFAULT 100,
    optimal_team_size_recommendation INTEGER,
    team_restructuring_recommendations TEXT[],
    
    -- External factors impact
    management_support_effectiveness DECIMAL(5,2) DEFAULT 100,
    resource_adequacy_score DECIMAL(5,2) DEFAULT 100,
    tool_and_technology_support DECIMAL(5,2) DEFAULT 100,
    environmental_factors_impact DECIMAL(8,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_team_dynamics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_dynamics_top_performer FOREIGN KEY (top_performer_id) REFERENCES auth_users(id),
    CONSTRAINT fk_team_dynamics_bottom_performer FOREIGN KEY (bottom_performer_id) REFERENCES auth_users(id),
    CONSTRAINT unique_team_analysis UNIQUE (restaurant_id, team_name, analysis_date, analysis_period)
);

-- Performance improvement tracking and interventions
CREATE TABLE IF NOT EXISTS sop_performance_improvement_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Improvement initiative identification
    improvement_initiative_name VARCHAR(255) NOT NULL,
    improvement_category improvement_area NOT NULL,
    priority_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Baseline and targets
    baseline_performance_score DECIMAL(5,2) NOT NULL,
    target_performance_score DECIMAL(5,2) NOT NULL,
    target_achievement_date DATE,
    measurement_frequency VARCHAR(50) DEFAULT 'weekly',
    
    -- Intervention details
    intervention_type VARCHAR(100), -- training, coaching, process_change, tool_upgrade
    intervention_description TEXT NOT NULL,
    intervention_start_date DATE,
    intervention_end_date DATE,
    intervention_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Progress tracking
    current_performance_score DECIMAL(5,2) DEFAULT 0,
    progress_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN (target_performance_score - baseline_performance_score) > 0 THEN
            LEAST(100, ((current_performance_score - baseline_performance_score) / 
                       (target_performance_score - baseline_performance_score)) * 100)
        ELSE 0 END
    ) STORED,
    
    -- Performance milestones
    milestone_checkpoints JSONB DEFAULT '{}', -- Date -> target score mapping
    milestones_achieved INTEGER DEFAULT 0,
    milestones_total INTEGER DEFAULT 0,
    next_milestone_date DATE,
    
    -- Intervention effectiveness
    effectiveness_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    roi_calculation DECIMAL(8,4) DEFAULT 0, -- Return on investment
    time_to_impact_days INTEGER DEFAULT 0,
    sustainability_score DECIMAL(5,2) DEFAULT 0, -- How lasting the improvement is
    
    -- Supporting factors
    manager_support_level DECIMAL(5,2) DEFAULT 50, -- 0-100
    peer_support_level DECIMAL(5,2) DEFAULT 50,
    resource_adequacy DECIMAL(5,2) DEFAULT 100,
    motivation_level DECIMAL(5,2) DEFAULT 50,
    
    -- Barriers and challenges
    barriers_encountered TEXT[],
    barrier_impact_scores JSONB DEFAULT '{}', -- Barrier -> impact score mapping
    mitigation_strategies TEXT[],
    strategy_effectiveness JSONB DEFAULT '{}',
    
    -- Learning and adaptation
    learning_insights TEXT[],
    best_practices_identified TEXT[],
    approach_modifications TEXT[],
    scalability_assessment TEXT,
    
    -- Status and outcomes
    status VARCHAR(50) DEFAULT 'in_progress', -- planned, in_progress, completed, paused, cancelled
    completion_status VARCHAR(50), -- success, partial_success, failure
    actual_completion_date DATE,
    final_performance_score DECIMAL(5,2),
    
    -- Follow-up and sustainability
    follow_up_plan TEXT,
    maintenance_activities TEXT[],
    relapse_prevention_measures TEXT[],
    long_term_monitoring_plan TEXT,
    
    -- Impact assessment
    business_impact_description TEXT,
    quantified_benefits JSONB DEFAULT '{}', -- Benefit type -> value mapping
    customer_impact_assessment TEXT,
    team_impact_assessment TEXT,
    
    -- Documentation and reporting
    progress_reports JSONB DEFAULT '{}', -- Date -> progress report mapping
    stakeholder_communications TEXT[],
    lessons_learned TEXT,
    recommendations_for_others TEXT[],
    
    created_by UUID,
    assigned_to UUID, -- Coach or manager responsible
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_improvement_tracking_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_improvement_tracking_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_improvement_tracking_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_improvement_tracking_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth_users(id),
    CONSTRAINT valid_target_score CHECK (target_performance_score > baseline_performance_score)
);

-- Performance correlation insights and recommendations
CREATE TABLE IF NOT EXISTS sop_performance_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Insight identification
    insight_name VARCHAR(255) NOT NULL,
    insight_type VARCHAR(100), -- correlation, pattern, anomaly, trend, benchmark
    insight_category VARCHAR(100), -- individual, team, process, environmental, temporal
    confidence_level DECIMAL(5,2) DEFAULT 0, -- 0-100
    
    -- Insight content
    insight_description TEXT NOT NULL,
    statistical_evidence JSONB DEFAULT '{}', -- P-values, correlation coefficients, etc.
    data_sources TEXT[], -- Which data sources contributed to insight
    analysis_period_start DATE,
    analysis_period_end DATE,
    
    -- Affected entities
    affected_users UUID[], -- Array of user IDs if individual insight
    affected_sops UUID[], -- Array of SOP document IDs
    affected_departments TEXT[],
    scope_description TEXT,
    
    -- Performance impact
    current_performance_impact DECIMAL(8,4) DEFAULT 0, -- Current impact magnitude
    potential_performance_gain DECIMAL(8,4) DEFAULT 0, -- Potential improvement
    business_value_estimate DECIMAL(12,2) DEFAULT 0,
    implementation_effort VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    
    -- Recommendations
    recommended_actions TEXT[] NOT NULL,
    action_priorities INTEGER[], -- Priority ranking of actions
    implementation_timeline_weeks INTEGER,
    required_resources TEXT[],
    
    -- Success metrics
    success_indicators TEXT[],
    measurement_methods TEXT[],
    expected_roi_percentage DECIMAL(8,4) DEFAULT 0,
    risk_factors TEXT[],
    
    -- Validation and testing
    validation_method VARCHAR(100), -- experiment, pilot, simulation, analysis
    validation_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, validated, refuted
    validation_results JSONB DEFAULT '{}',
    validation_confidence DECIMAL(5,2) DEFAULT 0,
    
    -- Implementation tracking
    implementation_status VARCHAR(50) DEFAULT 'proposed', -- proposed, approved, in_progress, completed, rejected
    implementation_start_date DATE,
    implementation_completion_date DATE,
    actual_impact_measured DECIMAL(8,4) DEFAULT 0,
    
    -- Insight lifecycle
    insight_freshness_score DECIMAL(5,2) DEFAULT 100, -- How current/relevant is the insight
    obsolescence_risk DECIMAL(5,2) DEFAULT 0, -- Risk of insight becoming outdated
    update_frequency VARCHAR(50) DEFAULT 'monthly',
    last_validated_date DATE,
    
    -- Communication and adoption
    stakeholders_notified TEXT[],
    communication_status VARCHAR(50) DEFAULT 'draft', -- draft, communicated, adopted
    adoption_resistance_factors TEXT[],
    change_management_needed BOOLEAN DEFAULT false,
    
    -- Related insights
    related_insights UUID[], -- Array of related insight IDs
    conflicting_insights UUID[], -- Array of conflicting insight IDs
    supporting_evidence_insights UUID[],
    
    -- Machine learning attribution
    ml_model_source VARCHAR(100), -- Which ML model generated this insight
    algorithm_confidence DECIMAL(5,2) DEFAULT 0,
    human_validation_required BOOLEAN DEFAULT true,
    automated_insight BOOLEAN DEFAULT false,
    
    generated_by UUID, -- User or system that generated insight
    reviewed_by UUID,
    approved_by UUID,
    approval_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_performance_insights_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_performance_insights_generated_by FOREIGN KEY (generated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_performance_insights_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES auth_users(id),
    CONSTRAINT fk_performance_insights_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Staff performance profiles indexes
CREATE INDEX idx_staff_profiles_restaurant ON sop_staff_performance_profiles(restaurant_id);
CREATE INDEX idx_staff_profiles_user ON sop_staff_performance_profiles(user_id);
CREATE INDEX idx_staff_profiles_level ON sop_staff_performance_profiles(staff_level);
CREATE INDEX idx_staff_profiles_department ON sop_staff_performance_profiles(primary_department);

-- Staff SOP performance indexes
CREATE INDEX idx_staff_sop_perf_restaurant_user ON sop_staff_sop_performance(restaurant_id, user_id);
CREATE INDEX idx_staff_sop_perf_sop ON sop_staff_sop_performance(sop_document_id);
CREATE INDEX idx_staff_sop_perf_date ON sop_staff_sop_performance(performance_date);
CREATE INDEX idx_staff_sop_perf_success_rate ON sop_staff_sop_performance(success_rate);

-- Performance assessments indexes
CREATE INDEX idx_staff_assessments_restaurant_user ON sop_staff_performance_assessments(restaurant_id, user_id);
CREATE INDEX idx_staff_assessments_date ON sop_staff_performance_assessments(assessment_date);
CREATE INDEX idx_staff_assessments_type ON sop_staff_performance_assessments(assessment_type);
CREATE INDEX idx_staff_assessments_overall_rating ON sop_staff_performance_assessments(overall_rating);

-- Team dynamics indexes
CREATE INDEX idx_team_dynamics_restaurant ON sop_team_performance_dynamics(restaurant_id);
CREATE INDEX idx_team_dynamics_date ON sop_team_performance_dynamics(analysis_date);
CREATE INDEX idx_team_dynamics_department ON sop_team_performance_dynamics(primary_department);
CREATE INDEX idx_team_dynamics_efficiency ON sop_team_performance_dynamics(team_efficiency_score);

-- Improvement tracking indexes
CREATE INDEX idx_improvement_tracking_restaurant_user ON sop_performance_improvement_tracking(restaurant_id, user_id);
CREATE INDEX idx_improvement_tracking_category ON sop_performance_improvement_tracking(improvement_category);
CREATE INDEX idx_improvement_tracking_status ON sop_performance_improvement_tracking(status);
CREATE INDEX idx_improvement_tracking_progress ON sop_performance_improvement_tracking(progress_percentage);

-- Performance insights indexes
CREATE INDEX idx_performance_insights_restaurant ON sop_performance_insights(restaurant_id);
CREATE INDEX idx_performance_insights_type ON sop_performance_insights(insight_type);
CREATE INDEX idx_performance_insights_confidence ON sop_performance_insights(confidence_level);
CREATE INDEX idx_performance_insights_status ON sop_performance_insights(implementation_status);

-- Composite indexes for analytics
CREATE INDEX idx_staff_performance_analytics ON sop_staff_sop_performance(restaurant_id, user_id, performance_date, success_rate);
CREATE INDEX idx_team_performance_analytics ON sop_team_performance_dynamics(restaurant_id, analysis_date, team_efficiency_score, team_size);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on staff performance tables
ALTER TABLE sop_staff_performance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_staff_sop_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_staff_performance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_team_performance_dynamics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_performance_improvement_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_performance_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Staff performance profiles restaurant access"
ON sop_staff_performance_profiles FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Staff SOP performance restaurant access"
ON sop_staff_sop_performance FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Performance assessments restaurant access"
ON sop_staff_performance_assessments FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Team dynamics restaurant access"
ON sop_team_performance_dynamics FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Improvement tracking restaurant access"
ON sop_performance_improvement_tracking FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Performance insights restaurant access"
ON sop_performance_insights FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_staff_performance_profiles_updated_at 
    BEFORE UPDATE ON sop_staff_performance_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_staff_performance_assessments_updated_at 
    BEFORE UPDATE ON sop_staff_performance_assessments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_performance_improvement_tracking_updated_at 
    BEFORE UPDATE ON sop_performance_improvement_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_performance_insights_updated_at 
    BEFORE UPDATE ON sop_performance_insights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- PERFORMANCE ANALYTICS FUNCTIONS
-- ===========================================

-- Function to calculate staff performance correlation
CREATE OR REPLACE FUNCTION calculate_staff_performance_correlation(
    p_restaurant_id UUID,
    p_user_id UUID,
    p_performance_dimension VARCHAR,
    p_sop_category_id UUID DEFAULT NULL,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    correlation_coefficient DECIMAL,
    significance_level DECIMAL,
    sample_size INTEGER,
    trend_direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH performance_data AS (
        SELECT 
            ssp.performance_date,
            CASE p_performance_dimension
                WHEN 'success_rate' THEN ssp.success_rate
                WHEN 'efficiency' THEN (100 - ssp.average_completion_time_minutes)
                WHEN 'quality' THEN ssp.quality_score
                ELSE ssp.success_rate
            END as performance_value,
            ROW_NUMBER() OVER (ORDER BY ssp.performance_date) as time_sequence
        FROM sop_staff_sop_performance ssp
        JOIN sop_documents sd ON ssp.sop_document_id = sd.id
        WHERE ssp.restaurant_id = p_restaurant_id
          AND ssp.user_id = p_user_id
          AND ssp.performance_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
          AND (p_sop_category_id IS NULL OR sd.category_id = p_sop_category_id)
          AND ssp.executions_attempted > 0
    )
    SELECT 
        COALESCE(CORR(pd.time_sequence::DECIMAL, pd.performance_value), 0) as correlation_coefficient,
        -- Simplified significance calculation (would need more sophisticated stats in practice)
        CASE WHEN COUNT(*) >= 30 THEN 0.05 ELSE 0.10 END as significance_level,
        COUNT(*)::INTEGER as sample_size,
        CASE 
            WHEN COALESCE(CORR(pd.time_sequence::DECIMAL, pd.performance_value), 0) > 0.1 THEN 'improving'
            WHEN COALESCE(CORR(pd.time_sequence::DECIMAL, pd.performance_value), 0) < -0.1 THEN 'declining'
            ELSE 'stable'
        END as trend_direction
    FROM performance_data pd;
END;
$$ LANGUAGE plpgsql;

-- Function to identify top performers for SOP
CREATE OR REPLACE FUNCTION identify_top_performers_for_sop(
    p_restaurant_id UUID,
    p_sop_document_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    performance_score DECIMAL,
    success_rate DECIMAL,
    efficiency_score DECIMAL,
    consistency_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ssp.user_id,
        au.display_name as user_name,
        -- Composite performance score
        (ssp.success_rate * 0.4 + 
         (100 - LEAST(ssp.average_completion_time_minutes, 100)) * 0.3 + 
         ssp.quality_score * 0.3) as performance_score,
        AVG(ssp.success_rate) as success_rate,
        AVG(100 - LEAST(ssp.average_completion_time_minutes, 100)) as efficiency_score,
        (100 - STDDEV(ssp.success_rate)) as consistency_score
    FROM sop_staff_sop_performance ssp
    JOIN auth_users au ON ssp.user_id = au.id
    WHERE ssp.restaurant_id = p_restaurant_id
      AND ssp.sop_document_id = p_sop_document_id
      AND ssp.performance_date >= CURRENT_DATE - INTERVAL '30 days'
      AND ssp.executions_attempted >= 5 -- Minimum sample size
    GROUP BY ssp.user_id, au.display_name
    HAVING COUNT(*) >= 3 -- Minimum number of performance records
    ORDER BY performance_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate team synergy score
CREATE OR REPLACE FUNCTION calculate_team_synergy_score(
    p_restaurant_id UUID,
    p_team_members UUID[],
    p_analysis_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
    individual_sum DECIMAL DEFAULT 0;
    team_performance DECIMAL DEFAULT 0;
    synergy_score DECIMAL DEFAULT 0;
BEGIN
    -- Calculate sum of individual performances
    SELECT SUM(
        (ssp.success_rate * 0.4 + 
         (100 - LEAST(ssp.average_completion_time_minutes, 100)) * 0.3 + 
         ssp.quality_score * 0.3)
    ) INTO individual_sum
    FROM sop_staff_sop_performance ssp
    WHERE ssp.restaurant_id = p_restaurant_id
      AND ssp.user_id = ANY(p_team_members)
      AND ssp.performance_date = p_analysis_date;
    
    -- Get team performance (simplified - would need more complex team metric in practice)
    SELECT team_efficiency_score INTO team_performance
    FROM sop_team_performance_dynamics
    WHERE restaurant_id = p_restaurant_id
      AND analysis_date = p_analysis_date
      AND team_composition && p_team_members
    LIMIT 1;
    
    -- Calculate synergy as ratio of team performance to sum of individual performances
    IF individual_sum > 0 AND team_performance IS NOT NULL THEN
        synergy_score := (team_performance / individual_sum) * 100;
    ELSE
        synergy_score := 100; -- Neutral synergy
    END IF;
    
    RETURN ROUND(synergy_score, 2);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_staff_performance_profiles IS 'Individual staff performance profiles with baselines, strengths, and development areas';
COMMENT ON TABLE sop_staff_sop_performance IS 'Detailed SOP-specific performance metrics correlated with staff execution patterns';
COMMENT ON TABLE sop_staff_performance_assessments IS 'Formal performance assessments and evaluations with multi-dimensional scoring';
COMMENT ON TABLE sop_team_performance_dynamics IS 'Team performance analysis with collaboration effectiveness and synergy metrics';
COMMENT ON TABLE sop_performance_improvement_tracking IS 'Performance improvement initiatives with intervention tracking and ROI analysis';
COMMENT ON TABLE sop_performance_insights IS 'AI-generated and analyst-identified performance insights with actionable recommendations';

-- Performance optimization
ANALYZE sop_staff_performance_profiles;
ANALYZE sop_staff_sop_performance;
ANALYZE sop_staff_performance_assessments;
ANALYZE sop_team_performance_dynamics;
ANALYZE sop_performance_improvement_tracking;
ANALYZE sop_performance_insights;