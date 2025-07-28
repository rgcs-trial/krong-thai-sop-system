-- Restaurant Krong Thai SOP Management System
-- SOP Continuous Improvement Data Pipeline
-- Migration 051: Continuous improvement pipeline with automated insights generation
-- Created: 2025-07-28

-- ===========================================
-- CONTINUOUS IMPROVEMENT ENUMS
-- ===========================================

-- Improvement initiative types
CREATE TYPE improvement_initiative_type AS ENUM (
    'process_optimization', 'automation_implementation', 'training_enhancement', 'technology_upgrade',
    'workflow_redesign', 'quality_improvement', 'cost_reduction', 'safety_enhancement', 'customer_experience'
);

-- Improvement maturity levels
CREATE TYPE improvement_maturity AS ENUM ('reactive', 'planned', 'managed', 'optimized', 'innovating');

-- Change impact levels
CREATE TYPE change_impact AS ENUM ('minimal', 'low', 'moderate', 'high', 'transformational');

-- Innovation categories
CREATE TYPE innovation_category AS ENUM (
    'incremental', 'breakthrough', 'disruptive', 'sustaining', 'architectural', 'component'
);

-- Data processing statuses
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'skipped');

-- ===========================================
-- CONTINUOUS IMPROVEMENT PIPELINE TABLES
-- ===========================================

-- Improvement opportunity identification and tracking
CREATE TABLE IF NOT EXISTS sop_improvement_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Opportunity identification
    opportunity_name VARCHAR(255) NOT NULL,
    opportunity_type improvement_initiative_type NOT NULL,
    discovery_method VARCHAR(100), -- 'analytics', 'observation', 'feedback', 'audit', 'benchmarking'
    discovery_date DATE DEFAULT CURRENT_DATE,
    
    -- Related SOPs and processes
    affected_sop_documents UUID[], -- SOPs that would be impacted
    primary_sop_focus UUID, -- Main SOP this opportunity addresses
    process_areas TEXT[], -- Process areas affected
    departments_involved TEXT[], -- Departments that would be involved
    
    -- Opportunity description and analysis
    current_state_description TEXT NOT NULL,
    desired_future_state TEXT NOT NULL,
    root_cause_analysis TEXT,
    gap_analysis TEXT,
    
    -- Impact assessment
    estimated_efficiency_gain DECIMAL(8,4) DEFAULT 0, -- Percentage improvement
    estimated_cost_savings_annual DECIMAL(12,2) DEFAULT 0,
    estimated_time_savings_minutes_daily DECIMAL(8,2) DEFAULT 0,
    customer_satisfaction_impact DECIMAL(8,4) DEFAULT 0,
    quality_improvement_impact DECIMAL(8,4) DEFAULT 0,
    
    -- Business case
    implementation_cost_estimate DECIMAL(12,2) DEFAULT 0,
    resource_requirements TEXT[],
    implementation_timeline_weeks INTEGER DEFAULT 4,
    payback_period_months DECIMAL(5,1) DEFAULT 0,
    roi_percentage DECIMAL(8,4) DEFAULT 0,
    
    -- Risk assessment
    implementation_risks TEXT[],
    risk_mitigation_strategies TEXT[],
    change_management_complexity change_impact DEFAULT 'moderate',
    stakeholder_resistance_level DECIMAL(5,2) DEFAULT 0, -- 0-100
    
    -- Priority and feasibility
    business_priority DECIMAL(5,2) DEFAULT 50, -- 0-100
    technical_feasibility DECIMAL(5,2) DEFAULT 50, -- 0-100
    organizational_readiness DECIMAL(5,2) DEFAULT 50, -- 0-100
    overall_priority_score DECIMAL(5,2) GENERATED ALWAYS AS (
        (business_priority * 0.4 + technical_feasibility * 0.3 + organizational_readiness * 0.3)
    ) STORED,
    
    -- Innovation characteristics
    innovation_level innovation_category DEFAULT 'incremental',
    creativity_score DECIMAL(5,2) DEFAULT 50, -- How creative/novel is this opportunity
    scalability_potential DECIMAL(5,2) DEFAULT 50, -- Can this be scaled to other areas
    competitive_advantage_potential DECIMAL(5,2) DEFAULT 50,
    
    -- Data sources and validation
    supporting_data_sources TEXT[],
    quantitative_evidence JSONB DEFAULT '{}', -- Metrics supporting this opportunity
    expert_validation_scores JSONB DEFAULT '{}', -- Expert assessment scores
    benchmarking_data JSONB DEFAULT '{}', -- Benchmark comparisons
    
    -- Approval and decision tracking
    approval_status VARCHAR(50) DEFAULT 'identified', -- identified, evaluated, approved, rejected, on_hold
    decision_criteria_met BOOLEAN DEFAULT false,
    decision_rationale TEXT,
    approved_by UUID,
    approval_date DATE,
    
    -- Implementation tracking
    assigned_owner UUID, -- Person responsible for implementing
    implementation_team UUID[], -- Team members involved
    planned_start_date DATE,
    planned_completion_date DATE,
    actual_start_date DATE,
    actual_completion_date DATE,
    
    -- Success measurement
    success_criteria TEXT[],
    measurement_methods TEXT[],
    baseline_metrics JSONB DEFAULT '{}',
    target_metrics JSONB DEFAULT '{}',
    
    -- Lifecycle management
    status VARCHAR(50) DEFAULT 'active', -- active, implemented, cancelled, merged
    last_review_date DATE,
    next_review_date DATE,
    review_notes TEXT,
    
    discovered_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_improvement_opportunities_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_improvement_opportunities_sop FOREIGN KEY (primary_sop_focus) REFERENCES sop_documents(id),
    CONSTRAINT fk_improvement_opportunities_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_improvement_opportunities_owner FOREIGN KEY (assigned_owner) REFERENCES auth_users(id),
    CONSTRAINT fk_improvement_opportunities_discovered_by FOREIGN KEY (discovered_by) REFERENCES auth_users(id)
);

-- Automated insight generation and processing pipeline
CREATE TABLE IF NOT EXISTS sop_insight_generation_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Pipeline job identification
    job_name VARCHAR(255) NOT NULL,
    job_type VARCHAR(100), -- 'correlation_analysis', 'anomaly_detection', 'trend_analysis', 'pattern_recognition'
    pipeline_stage VARCHAR(50) DEFAULT 'data_collection', -- data_collection, processing, analysis, insight_generation, validation
    
    -- Data processing configuration
    data_sources TEXT[], -- Tables and sources used for analysis
    analysis_parameters JSONB DEFAULT '{}', -- Configuration for analysis algorithms
    time_range_start DATE,
    time_range_end DATE,
    granularity VARCHAR(20) DEFAULT 'daily', -- hourly, daily, weekly, monthly
    
    -- Processing status and metrics
    processing_status processing_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processing_duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
             THEN EXTRACT(EPOCH FROM completed_at - started_at)::INTEGER
             ELSE NULL END
    ) STORED,
    
    -- Data quality and validation
    records_processed INTEGER DEFAULT 0,
    data_quality_score DECIMAL(5,2) DEFAULT 100,
    validation_checks_passed INTEGER DEFAULT 0,
    validation_checks_total INTEGER DEFAULT 0,
    data_completeness_percentage DECIMAL(5,2) DEFAULT 100,
    
    -- Analysis results
    insights_generated INTEGER DEFAULT 0,
    patterns_identified INTEGER DEFAULT 0,
    anomalies_detected INTEGER DEFAULT 0,
    correlations_found INTEGER DEFAULT 0,
    
    -- Statistical confidence
    statistical_confidence DECIMAL(5,2) DEFAULT 0, -- 0-100
    sample_size INTEGER DEFAULT 0,
    significance_level DECIMAL(8,4) DEFAULT 0.05,
    confidence_intervals JSONB DEFAULT '{}',
    
    -- Machine learning metrics
    model_accuracy DECIMAL(5,2), -- If ML models were used
    model_precision DECIMAL(5,2),
    model_recall DECIMAL(5,2),
    model_f1_score DECIMAL(5,2),
    feature_importance JSONB DEFAULT '{}',
    
    -- Output and results
    insights_output JSONB DEFAULT '{}', -- Generated insights in structured format
    recommendations JSONB DEFAULT '{}', -- Actionable recommendations
    visualizations_generated TEXT[], -- Charts and graphs created
    raw_analysis_results JSONB DEFAULT '{}',
    
    -- Quality assurance
    human_validation_required BOOLEAN DEFAULT true,
    validated_by UUID,
    validation_date DATE,
    validation_feedback TEXT,
    insights_accuracy_score DECIMAL(5,2), -- Post-validation accuracy assessment
    
    -- Error handling and debugging
    error_messages TEXT[],
    warning_messages TEXT[],
    debug_information JSONB DEFAULT '{}',
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    
    -- Resource utilization
    cpu_time_seconds DECIMAL(8,2) DEFAULT 0,
    memory_usage_mb DECIMAL(8,2) DEFAULT 0,
    storage_used_mb DECIMAL(8,2) DEFAULT 0,
    
    -- Scheduling and automation
    scheduled_execution BOOLEAN DEFAULT false,
    schedule_pattern VARCHAR(100), -- cron-like pattern for scheduled runs
    next_scheduled_run TIMESTAMPTZ,
    auto_retry_on_failure BOOLEAN DEFAULT true,
    max_retry_attempts INTEGER DEFAULT 3,
    
    -- Impact tracking
    insights_acted_upon INTEGER DEFAULT 0,
    business_value_generated DECIMAL(12,2) DEFAULT 0,
    improvement_opportunities_created INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_insight_pipeline_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_insight_pipeline_validated_by FOREIGN KEY (validated_by) REFERENCES auth_users(id)
);

-- Best practice knowledge base and sharing
CREATE TABLE IF NOT EXISTS sop_best_practices_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Best practice identification
    practice_name VARCHAR(255) NOT NULL,
    practice_category VARCHAR(100), -- 'efficiency', 'quality', 'safety', 'customer_service', 'cost_control'
    practice_type VARCHAR(50) DEFAULT 'process', -- process, technique, tool, technology, policy
    
    -- Practice description
    description TEXT NOT NULL,
    detailed_instructions TEXT,
    implementation_steps TEXT[],
    required_resources TEXT[],
    prerequisites TEXT[],
    
    -- Context and applicability
    applicable_sop_categories UUID[], -- SOP categories where this applies
    applicable_sop_documents UUID[], -- Specific SOPs where this applies
    applicable_departments TEXT[],
    applicable_roles TEXT[],
    contextual_conditions TEXT[], -- When this practice is most effective
    
    -- Evidence and validation
    source_type VARCHAR(50), -- 'internal_discovery', 'industry_standard', 'research', 'benchmarking'
    evidence_description TEXT,
    supporting_data JSONB DEFAULT '{}',
    validation_results JSONB DEFAULT '{}',
    peer_review_status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, approved, rejected
    
    -- Impact and benefits
    quantified_benefits JSONB DEFAULT '{}', -- Specific metrics and improvements
    estimated_impact_percentage DECIMAL(8,4) DEFAULT 0,
    cost_benefit_analysis JSONB DEFAULT '{}',
    roi_data JSONB DEFAULT '{}',
    
    -- Implementation guidance
    implementation_difficulty DECIMAL(5,2) DEFAULT 50, -- 0-100, higher = more difficult
    implementation_time_estimate VARCHAR(50),
    training_requirements TEXT[],
    change_management_notes TEXT,
    
    -- Sharing and adoption
    sharing_restrictions TEXT[], -- Any restrictions on sharing this practice
    adoption_count INTEGER DEFAULT 0, -- How many times this has been implemented
    success_rate DECIMAL(5,2) DEFAULT 100, -- Success rate of implementations
    user_ratings JSONB DEFAULT '{}', -- User ratings and feedback
    
    -- Related practices
    related_practices UUID[], -- Related best practices
    superseded_practices UUID[], -- Practices this replaces
    evolution_notes TEXT, -- How this practice evolved
    
    -- Knowledge management
    knowledge_tags TEXT[], -- Tags for searchability
    search_keywords TEXT[], -- Keywords for finding this practice
    external_references TEXT[], -- Links to external resources
    attachments JSONB DEFAULT '{}', -- Documents, images, videos
    
    -- Lifecycle management
    status VARCHAR(50) DEFAULT 'active', -- draft, active, deprecated, archived
    version_number DECIMAL(3,1) DEFAULT 1.0,
    last_updated_by UUID,
    review_frequency VARCHAR(50) DEFAULT 'quarterly',
    next_review_date DATE,
    
    -- Metrics and analytics
    view_count INTEGER DEFAULT 0,
    implementation_attempts INTEGER DEFAULT 0,
    successful_implementations INTEGER DEFAULT 0,
    feedback_score DECIMAL(5,2) DEFAULT 0, -- Average user feedback score
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_best_practices_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_best_practices_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_best_practices_updated_by FOREIGN KEY (last_updated_by) REFERENCES auth_users(id)
);

-- Innovation experiment tracking and results
CREATE TABLE IF NOT EXISTS sop_innovation_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Experiment identification
    experiment_name VARCHAR(255) NOT NULL,
    experiment_type VARCHAR(100), -- 'a_b_test', 'pilot_program', 'proof_of_concept', 'prototype_test'
    hypothesis TEXT NOT NULL,
    experiment_objective TEXT NOT NULL,
    
    -- Experiment design
    control_group_description TEXT,
    test_group_description TEXT,
    variables_tested TEXT[],
    success_metrics TEXT[],
    failure_criteria TEXT[],
    
    -- Scope and participants
    affected_sop_documents UUID[],
    participating_staff UUID[],
    participating_departments TEXT[],
    customer_segments_included TEXT[],
    
    -- Timeline and phases
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    experiment_phases JSONB DEFAULT '{}', -- Phase descriptions and timelines
    
    -- Baseline measurements
    baseline_metrics JSONB DEFAULT '{}',
    baseline_measurement_period VARCHAR(50),
    baseline_data_quality DECIMAL(5,2) DEFAULT 100,
    
    -- Experiment execution
    execution_status VARCHAR(50) DEFAULT 'planned', -- planned, running, paused, completed, cancelled
    execution_fidelity DECIMAL(5,2) DEFAULT 100, -- How well the experiment was executed
    protocol_deviations TEXT[],
    unexpected_events TEXT[],
    
    -- Data collection
    data_collection_methods TEXT[],
    measurement_frequency VARCHAR(50),
    data_quality_score DECIMAL(5,2) DEFAULT 100,
    sample_size_control INTEGER DEFAULT 0,
    sample_size_test INTEGER DEFAULT 0,
    
    -- Results and analysis
    results_summary TEXT,
    quantitative_results JSONB DEFAULT '{}',
    qualitative_findings TEXT[],
    statistical_significance BOOLEAN DEFAULT false,
    confidence_level DECIMAL(5,2) DEFAULT 95,
    
    -- Impact assessment
    measured_impact JSONB DEFAULT '{}', -- Actual measured impacts
    unexpected_benefits TEXT[],
    unexpected_negative_effects TEXT[],
    business_value_delivered DECIMAL(12,2) DEFAULT 0,
    
    -- Decision and next steps
    experiment_conclusion TEXT,
    decision_recommendation VARCHAR(50), -- 'implement', 'reject', 'modify', 'expand_test'
    decision_rationale TEXT,
    scaling_plan TEXT,
    implementation_roadmap TEXT[],
    
    -- Learning and knowledge capture
    lessons_learned TEXT[],
    best_practices_identified TEXT[],
    knowledge_assets_created TEXT[],
    replication_guidelines TEXT,
    
    -- Risk and compliance
    risks_identified TEXT[],
    mitigation_actions TEXT[],
    compliance_considerations TEXT[],
    ethical_review_required BOOLEAN DEFAULT false,
    
    -- Collaboration and communication
    stakeholders_involved TEXT[],
    communication_plan TEXT,
    progress_reports JSONB DEFAULT '{}',
    stakeholder_feedback JSONB DEFAULT '{}',
    
    -- Resource utilization
    budget_allocated DECIMAL(12,2) DEFAULT 0,
    actual_cost DECIMAL(12,2) DEFAULT 0,
    resource_efficiency DECIMAL(5,2) DEFAULT 100,
    
    experiment_lead UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_innovation_experiments_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_innovation_experiments_lead FOREIGN KEY (experiment_lead) REFERENCES auth_users(id),
    CONSTRAINT fk_innovation_experiments_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Continuous improvement maturity assessment
CREATE TABLE IF NOT EXISTS sop_improvement_maturity_assessment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Assessment metadata
    assessment_name VARCHAR(255) NOT NULL,
    assessment_date DATE DEFAULT CURRENT_DATE,
    assessment_type VARCHAR(50) DEFAULT 'self_assessment', -- self_assessment, external_audit, peer_review
    assessment_scope VARCHAR(100), -- 'restaurant_wide', 'department', 'process_area'
    
    -- Maturity dimensions
    process_standardization_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    data_driven_decision_making_score DECIMAL(5,2) DEFAULT 0,
    continuous_learning_score DECIMAL(5,2) DEFAULT 0,
    innovation_culture_score DECIMAL(5,2) DEFAULT 0,
    change_management_capability_score DECIMAL(5,2) DEFAULT 0,
    technology_adoption_score DECIMAL(5,2) DEFAULT 0,
    
    -- Overall maturity calculation
    overall_maturity_score DECIMAL(5,2) GENERATED ALWAYS AS (
        (process_standardization_score + data_driven_decision_making_score + 
         continuous_learning_score + innovation_culture_score + 
         change_management_capability_score + technology_adoption_score) / 6
    ) STORED,
    
    -- Maturity level classification
    current_maturity_level improvement_maturity DEFAULT 'reactive',
    target_maturity_level improvement_maturity DEFAULT 'managed',
    maturity_gap DECIMAL(5,2) DEFAULT 0,
    
    -- Strengths and opportunities
    key_strengths TEXT[],
    improvement_opportunities TEXT[],
    priority_development_areas TEXT[],
    quick_wins_identified TEXT[],
    
    -- Benchmarking
    industry_benchmark_score DECIMAL(5,2),
    peer_comparison_percentile INTEGER,
    best_practice_gap_analysis TEXT,
    
    -- Action planning
    development_roadmap TEXT[],
    recommended_initiatives TEXT[],
    resource_requirements TEXT[],
    timeline_estimate VARCHAR(100),
    
    -- Evidence and validation
    assessment_evidence JSONB DEFAULT '{}',
    supporting_documentation TEXT[],
    stakeholder_input JSONB DEFAULT '{}',
    validation_methods TEXT[],
    
    -- Progress tracking
    previous_assessment_id UUID, -- Link to previous assessment
    improvement_since_last DECIMAL(5,2) DEFAULT 0,
    progress_trend VARCHAR(20) DEFAULT 'stable', -- improving, stable, declining
    
    -- Follow-up planning
    next_assessment_due DATE,
    interim_review_dates DATE[],
    monitoring_indicators TEXT[],
    
    assessed_by UUID,
    reviewed_by UUID,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_maturity_assessment_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_maturity_assessment_previous FOREIGN KEY (previous_assessment_id) REFERENCES sop_improvement_maturity_assessment(id),
    CONSTRAINT fk_maturity_assessment_assessed_by FOREIGN KEY (assessed_by) REFERENCES auth_users(id),
    CONSTRAINT fk_maturity_assessment_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES auth_users(id),
    CONSTRAINT fk_maturity_assessment_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- Improvement initiative pipeline and portfolio management
CREATE TABLE IF NOT EXISTS sop_improvement_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Portfolio metadata
    portfolio_name VARCHAR(255) NOT NULL,
    portfolio_description TEXT,
    portfolio_owner UUID,
    reporting_period VARCHAR(50) DEFAULT 'quarterly',
    
    -- Portfolio composition
    active_opportunities UUID[], -- Array of opportunity IDs in this portfolio
    completed_initiatives UUID[], -- Completed opportunities
    cancelled_initiatives UUID[], -- Cancelled opportunities
    total_opportunities INTEGER GENERATED ALWAYS AS (
        COALESCE(array_length(active_opportunities, 1), 0) + 
        COALESCE(array_length(completed_initiatives, 1), 0) + 
        COALESCE(array_length(cancelled_initiatives, 1), 0)
    ) STORED,
    
    -- Resource allocation
    total_budget_allocated DECIMAL(12,2) DEFAULT 0,
    budget_utilized DECIMAL(12,2) DEFAULT 0,
    budget_remaining DECIMAL(12,2) GENERATED ALWAYS AS (
        total_budget_allocated - budget_utilized
    ) STORED,
    
    -- Performance metrics
    initiatives_on_track INTEGER DEFAULT 0,
    initiatives_at_risk INTEGER DEFAULT 0,
    initiatives_behind_schedule INTEGER DEFAULT 0,
    portfolio_health_score DECIMAL(5,2) DEFAULT 100,
    
    -- Value delivery
    projected_annual_savings DECIMAL(12,2) DEFAULT 0,
    realized_annual_savings DECIMAL(12,2) DEFAULT 0,
    portfolio_roi DECIMAL(8,4) DEFAULT 0,
    customer_satisfaction_impact DECIMAL(8,4) DEFAULT 0,
    
    -- Strategic alignment
    strategic_themes TEXT[],
    business_objectives_supported TEXT[],
    strategic_alignment_score DECIMAL(5,2) DEFAULT 50,
    
    -- Risk management
    portfolio_risks TEXT[],
    mitigation_strategies TEXT[],
    overall_risk_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    
    -- Governance and reporting
    governance_board_members UUID[],
    review_frequency VARCHAR(50) DEFAULT 'monthly',
    last_review_date DATE,
    next_review_date DATE,
    
    -- Performance tracking
    success_rate DECIMAL(5,2) DEFAULT 0, -- % of successful initiatives
    average_delivery_time_weeks DECIMAL(5,1) DEFAULT 0,
    stakeholder_satisfaction_score DECIMAL(5,2) DEFAULT 50,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_improvement_portfolio_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_improvement_portfolio_owner FOREIGN KEY (portfolio_owner) REFERENCES auth_users(id)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Improvement opportunities indexes
CREATE INDEX idx_improvement_opportunities_restaurant ON sop_improvement_opportunities(restaurant_id);
CREATE INDEX idx_improvement_opportunities_type ON sop_improvement_opportunities(opportunity_type);
CREATE INDEX idx_improvement_opportunities_status ON sop_improvement_opportunities(approval_status);
CREATE INDEX idx_improvement_opportunities_priority ON sop_improvement_opportunities(overall_priority_score);
CREATE INDEX idx_improvement_opportunities_sops ON sop_improvement_opportunities USING GIN(affected_sop_documents);

-- Insight generation pipeline indexes
CREATE INDEX idx_insight_pipeline_restaurant ON sop_insight_generation_pipeline(restaurant_id);
CREATE INDEX idx_insight_pipeline_status ON sop_insight_generation_pipeline(processing_status);
CREATE INDEX idx_insight_pipeline_type ON sop_insight_generation_pipeline(job_type);
CREATE INDEX idx_insight_pipeline_date ON sop_insight_generation_pipeline(started_at);

-- Best practices knowledge base indexes
CREATE INDEX idx_best_practices_restaurant ON sop_best_practices_knowledge_base(restaurant_id);
CREATE INDEX idx_best_practices_category ON sop_best_practices_knowledge_base(practice_category);
CREATE INDEX idx_best_practices_status ON sop_best_practices_knowledge_base(status);
CREATE INDEX idx_best_practices_tags ON sop_best_practices_knowledge_base USING GIN(knowledge_tags);

-- Innovation experiments indexes
CREATE INDEX idx_innovation_experiments_restaurant ON sop_innovation_experiments(restaurant_id);
CREATE INDEX idx_innovation_experiments_status ON sop_innovation_experiments(execution_status);
CREATE INDEX idx_innovation_experiments_type ON sop_innovation_experiments(experiment_type);
CREATE INDEX idx_innovation_experiments_dates ON sop_innovation_experiments(actual_start_date, actual_end_date);

-- Maturity assessment indexes
CREATE INDEX idx_maturity_assessment_restaurant ON sop_improvement_maturity_assessment(restaurant_id);
CREATE INDEX idx_maturity_assessment_date ON sop_improvement_maturity_assessment(assessment_date);
CREATE INDEX idx_maturity_assessment_level ON sop_improvement_maturity_assessment(current_maturity_level);

-- Portfolio management indexes
CREATE INDEX idx_improvement_portfolio_restaurant ON sop_improvement_portfolio(restaurant_id);
CREATE INDEX idx_improvement_portfolio_owner ON sop_improvement_portfolio(portfolio_owner);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on continuous improvement tables
ALTER TABLE sop_improvement_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_insight_generation_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_best_practices_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_innovation_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_improvement_maturity_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_improvement_portfolio ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Improvement opportunities restaurant access"
ON sop_improvement_opportunities FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Insight pipeline restaurant access"
ON sop_insight_generation_pipeline FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Best practices restaurant access"
ON sop_best_practices_knowledge_base FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Innovation experiments restaurant access"
ON sop_innovation_experiments FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Maturity assessment restaurant access"
ON sop_improvement_maturity_assessment FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Improvement portfolio restaurant access"
ON sop_improvement_portfolio FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_improvement_opportunities_updated_at 
    BEFORE UPDATE ON sop_improvement_opportunities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_best_practices_knowledge_base_updated_at 
    BEFORE UPDATE ON sop_best_practices_knowledge_base 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_innovation_experiments_updated_at 
    BEFORE UPDATE ON sop_innovation_experiments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_improvement_portfolio_updated_at 
    BEFORE UPDATE ON sop_improvement_portfolio 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- CONTINUOUS IMPROVEMENT ANALYTICS FUNCTIONS
-- ===========================================

-- Function to identify improvement opportunities from data patterns
CREATE OR REPLACE FUNCTION identify_data_driven_opportunities(
    p_restaurant_id UUID,
    p_confidence_threshold DECIMAL DEFAULT 70,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    opportunity_type improvement_initiative_type,
    opportunity_description TEXT,
    confidence_score DECIMAL,
    potential_impact DECIMAL,
    data_evidence JSONB,
    recommended_actions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH performance_analysis AS (
        -- Analyze SOP performance patterns
        SELECT 
            sop_document_id,
            AVG(execution_efficiency_score) as avg_efficiency,
            STDDEV(execution_efficiency_score) as efficiency_variance,
            AVG(first_time_success_rate) as avg_success_rate,
            COUNT(*) as sample_size
        FROM sop_efficiency_impact_analysis
        WHERE restaurant_id = p_restaurant_id
          AND analysis_date >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY sop_document_id
        HAVING COUNT(*) >= 10 -- Minimum sample size
    ),
    opportunities AS (
        SELECT 
            CASE 
                WHEN pa.avg_efficiency < 70 THEN 'process_optimization'::improvement_initiative_type
                WHEN pa.efficiency_variance > 20 THEN 'training_enhancement'::improvement_initiative_type
                WHEN pa.avg_success_rate < 80 THEN 'quality_improvement'::improvement_initiative_type
                ELSE 'workflow_redesign'::improvement_initiative_type
            END as opp_type,
            CASE 
                WHEN pa.avg_efficiency < 70 THEN 'Low efficiency detected - process optimization needed'
                WHEN pa.efficiency_variance > 20 THEN 'High performance variance - training consistency needed'
                WHEN pa.avg_success_rate < 80 THEN 'Low success rate - quality improvement required'
                ELSE 'Performance pattern suggests workflow redesign opportunity'
            END as description,
            CASE 
                WHEN pa.sample_size > 50 THEN 95.0
                WHEN pa.sample_size > 30 THEN 85.0
                WHEN pa.sample_size > 20 THEN 75.0
                ELSE 65.0
            END as confidence,
            (100 - pa.avg_efficiency) * 0.5 + (100 - pa.avg_success_rate) * 0.3 + (pa.efficiency_variance) * 0.2 as impact,
            jsonb_build_object(
                'sop_id', pa.sop_document_id,
                'avg_efficiency', pa.avg_efficiency,
                'success_rate', pa.avg_success_rate,
                'variance', pa.efficiency_variance,
                'sample_size', pa.sample_size
            ) as evidence,
            ARRAY[
                'Analyze root causes of performance issues',
                'Develop targeted training programs',
                'Implement process improvements',
                'Monitor progress with regular measurement'
            ] as actions
        FROM performance_analysis pa
        WHERE (pa.avg_efficiency < 80 OR pa.avg_success_rate < 85 OR pa.efficiency_variance > 15)
    )
    SELECT 
        o.opp_type,
        o.description,
        o.confidence,
        o.impact,
        o.evidence,
        o.actions
    FROM opportunities o
    WHERE o.confidence >= p_confidence_threshold
    ORDER BY o.impact DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate improvement portfolio health
CREATE OR REPLACE FUNCTION calculate_portfolio_health(
    p_restaurant_id UUID,
    p_portfolio_id UUID
)
RETURNS TABLE (
    health_score DECIMAL,
    on_track_percentage DECIMAL,
    budget_utilization DECIMAL,
    roi_projection DECIMAL,
    risk_assessment TEXT,
    recommendations TEXT[]
) AS $$
DECLARE
    portfolio_data RECORD;
    total_initiatives INTEGER;
    on_track_count INTEGER;
    at_risk_count INTEGER;
    health_calculation DECIMAL;
BEGIN
    -- Get portfolio data
    SELECT 
        sp.total_opportunities,
        sp.initiatives_on_track,
        sp.initiatives_at_risk,
        sp.total_budget_allocated,
        sp.budget_utilized,
        sp.projected_annual_savings,
        sp.realized_annual_savings
    INTO portfolio_data
    FROM sop_improvement_portfolio sp
    WHERE sp.id = p_portfolio_id AND sp.restaurant_id = p_restaurant_id;
    
    -- Calculate health metrics
    total_initiatives := COALESCE(portfolio_data.total_opportunities, 0);
    on_track_count := COALESCE(portfolio_data.initiatives_on_track, 0);
    at_risk_count := COALESCE(portfolio_data.initiatives_at_risk, 0);
    
    -- Calculate overall health score
    health_calculation := CASE 
        WHEN total_initiatives = 0 THEN 100
        ELSE (on_track_count::DECIMAL / total_initiatives) * 100
    END;
    
    -- Adjust for budget utilization
    IF portfolio_data.total_budget_allocated > 0 THEN
        health_calculation := health_calculation * 0.7 + 
                             (LEAST(portfolio_data.budget_utilized / portfolio_data.total_budget_allocated, 1.0) * 100) * 0.3;
    END IF;
    
    RETURN QUERY
    SELECT 
        ROUND(health_calculation, 2) as health_score,
        CASE WHEN total_initiatives > 0 THEN ROUND((on_track_count::DECIMAL / total_initiatives) * 100, 2) ELSE 0 END as on_track_percentage,
        CASE WHEN portfolio_data.total_budget_allocated > 0 
             THEN ROUND((portfolio_data.budget_utilized / portfolio_data.total_budget_allocated) * 100, 2) 
             ELSE 0 END as budget_utilization,
        CASE WHEN portfolio_data.total_budget_allocated > 0 
             THEN ROUND(((COALESCE(portfolio_data.projected_annual_savings, 0) - portfolio_data.total_budget_allocated) / portfolio_data.total_budget_allocated) * 100, 2)
             ELSE 0 END as roi_projection,
        CASE 
            WHEN at_risk_count > total_initiatives * 0.3 THEN 'High Risk - Many initiatives at risk'
            WHEN at_risk_count > total_initiatives * 0.1 THEN 'Medium Risk - Some initiatives need attention'
            ELSE 'Low Risk - Portfolio performing well'
        END as risk_assessment,
        CASE 
            WHEN health_calculation < 60 THEN ARRAY['Review struggling initiatives', 'Increase management support', 'Consider resource reallocation']
            WHEN health_calculation < 80 THEN ARRAY['Monitor at-risk initiatives closely', 'Provide additional resources where needed']
            ELSE ARRAY['Maintain current trajectory', 'Consider expanding successful initiatives']
        END as recommendations;
END;
$$ LANGUAGE plpgsql;

-- Function to generate insights from continuous improvement data
CREATE OR REPLACE FUNCTION generate_improvement_insights(
    p_restaurant_id UUID,
    p_analysis_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    insight_type VARCHAR,
    insight_title TEXT,
    insight_description TEXT,
    confidence_level DECIMAL,
    recommended_actions TEXT[],
    supporting_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH improvement_trends AS (
        -- Analyze improvement opportunity trends
        SELECT 
            sio.opportunity_type,
            COUNT(*) as total_opportunities,
            AVG(sio.overall_priority_score) as avg_priority,
            AVG(sio.estimated_efficiency_gain) as avg_efficiency_gain,
            COUNT(*) FILTER (WHERE sio.approval_status = 'approved') as approved_count
        FROM sop_improvement_opportunities sio
        WHERE sio.restaurant_id = p_restaurant_id
          AND sio.discovery_date >= CURRENT_DATE - INTERVAL '1 day' * p_analysis_days
        GROUP BY sio.opportunity_type
    ),
    experiment_results AS (
        -- Analyze experiment success patterns
        SELECT 
            sie.experiment_type,
            COUNT(*) as total_experiments,
            COUNT(*) FILTER (WHERE sie.execution_status = 'completed') as completed_count,
            AVG(sie.business_value_delivered) as avg_value_delivered
        FROM sop_innovation_experiments sie
        WHERE sie.restaurant_id = p_restaurant_id
          AND sie.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_analysis_days
        GROUP BY sie.experiment_type
    )
    -- Generate insights from trends
    SELECT 
        'opportunity_pattern'::VARCHAR as insight_type,
        ('High potential in ' || it.opportunity_type || ' improvements')::TEXT as insight_title,
        ('Analysis shows ' || it.total_opportunities || ' opportunities identified in ' || 
         it.opportunity_type || ' with average efficiency gain of ' || 
         ROUND(it.avg_efficiency_gain, 1) || '%')::TEXT as insight_description,
        CASE WHEN it.total_opportunities >= 5 THEN 85.0 ELSE 70.0 END as confidence_level,
        ARRAY['Focus resources on this improvement type', 'Develop standardized approach', 'Scale successful implementations'] as recommended_actions,
        jsonb_build_object(
            'opportunity_type', it.opportunity_type,
            'total_opportunities', it.total_opportunities,
            'avg_priority', it.avg_priority,
            'approval_rate', CASE WHEN it.total_opportunities > 0 THEN it.approved_count::DECIMAL / it.total_opportunities ELSE 0 END
        ) as supporting_data
    FROM improvement_trends it
    WHERE it.total_opportunities >= 3 -- Minimum threshold for pattern recognition
    
    UNION ALL
    
    SELECT 
        'experiment_success'::VARCHAR as insight_type,
        ('Successful experiment pattern: ' || er.experiment_type)::TEXT as insight_title,
        ('Experiments of type ' || er.experiment_type || ' show ' || 
         ROUND((er.completed_count::DECIMAL / er.total_experiments) * 100, 1) || 
         '% completion rate with average value of $' || ROUND(er.avg_value_delivered, 0))::TEXT as insight_description,
        CASE WHEN er.total_experiments >= 3 THEN 80.0 ELSE 65.0 END as confidence_level,
        ARRAY['Replicate successful experiment patterns', 'Increase investment in this experiment type', 'Document best practices'] as recommended_actions,
        jsonb_build_object(
            'experiment_type', er.experiment_type,
            'total_experiments', er.total_experiments,
            'completion_rate', er.completed_count::DECIMAL / er.total_experiments,
            'avg_value', er.avg_value_delivered
        ) as supporting_data
    FROM experiment_results er
    WHERE er.total_experiments >= 2
      AND (er.completed_count::DECIMAL / er.total_experiments) > 0.6; -- 60% completion rate threshold
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_improvement_opportunities IS 'Comprehensive tracking of improvement opportunities with impact assessment, prioritization, and implementation planning';
COMMENT ON TABLE sop_insight_generation_pipeline IS 'Automated data processing pipeline for generating insights from operational data with ML/AI integration capabilities';
COMMENT ON TABLE sop_best_practices_knowledge_base IS 'Structured knowledge repository for best practices with evidence, implementation guidance, and sharing mechanisms';
COMMENT ON TABLE sop_innovation_experiments IS 'Systematic tracking of innovation experiments with hypothesis testing, results analysis, and learning capture';
COMMENT ON TABLE sop_improvement_maturity_assessment IS 'Continuous improvement maturity assessment framework with benchmarking and development roadmaps';
COMMENT ON TABLE sop_improvement_portfolio IS 'Portfolio management for improvement initiatives with resource allocation, performance tracking, and governance';

-- Performance optimization
ANALYZE sop_improvement_opportunities;
ANALYZE sop_insight_generation_pipeline;
ANALYZE sop_best_practices_knowledge_base;
ANALYZE sop_innovation_experiments;
ANALYZE sop_improvement_maturity_assessment;
ANALYZE sop_improvement_portfolio;