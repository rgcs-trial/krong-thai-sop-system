-- Training Performance Benchmarking System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Performance benchmarking with comparative analytics for training effectiveness

-- ===========================================
-- PERFORMANCE BENCHMARKING ENUMS
-- ===========================================

-- Benchmark types
CREATE TYPE benchmark_type AS ENUM (
    'industry_standard', 'organizational_baseline', 'peer_comparison', 'historical_trend',
    'best_practice', 'regulatory_requirement', 'custom_target'
);

-- Performance metric types
CREATE TYPE performance_metric_type AS ENUM (
    'completion_rate', 'assessment_score', 'time_to_complete', 'retention_rate',
    'engagement_score', 'satisfaction_rating', 'competency_level', 'error_rate',
    'improvement_rate', 'knowledge_transfer', 'practical_application', 'cost_effectiveness'
);

-- Comparison scope
CREATE TYPE comparison_scope AS ENUM (
    'individual', 'team', 'department', 'restaurant', 'region', 'organization', 'industry'
);

-- Trend direction
CREATE TYPE trend_direction AS ENUM (
    'improving', 'declining', 'stable', 'volatile', 'unknown'
);

-- Performance tier
CREATE TYPE performance_tier AS ENUM (
    'top_performer', 'above_average', 'average', 'below_average', 'needs_improvement'
);

-- ===========================================
-- PERFORMANCE BENCHMARKING TABLES
-- ===========================================

-- Training performance benchmarks
CREATE TABLE IF NOT EXISTS training_performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Benchmark identification
    benchmark_id VARCHAR(128) NOT NULL UNIQUE,
    benchmark_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Benchmark classification
    benchmark_type benchmark_type NOT NULL,
    metric_type performance_metric_type NOT NULL,
    comparison_scope comparison_scope NOT NULL,
    
    -- Benchmark context
    restaurant_id UUID,
    department VARCHAR(100),
    role_category VARCHAR(100),
    training_category VARCHAR(100),
    
    -- Target values
    target_value DECIMAL(15,4) NOT NULL,
    minimum_acceptable_value DECIMAL(15,4),
    maximum_acceptable_value DECIMAL(15,4),
    optimal_value DECIMAL(15,4),
    
    -- Statistical parameters
    measurement_unit VARCHAR(50) NOT NULL, -- 'percentage', 'minutes', 'score', 'count'
    data_collection_method VARCHAR(100),
    sample_size_requirement INTEGER DEFAULT 30,
    confidence_level DECIMAL(5,2) DEFAULT 95.0,
    
    -- Time parameters
    measurement_period_days INTEGER DEFAULT 30,
    update_frequency_days INTEGER DEFAULT 7,
    seasonal_adjustment BOOLEAN DEFAULT false,
    
    -- Industry context
    industry_segment VARCHAR(100) DEFAULT 'restaurant',
    geographic_region VARCHAR(100),
    organization_size_category VARCHAR(50), -- 'small', 'medium', 'large', 'enterprise'
    
    -- Benchmark source
    data_source VARCHAR(200) NOT NULL,
    source_reliability_score DECIMAL(5,2) DEFAULT 80.0, -- 0-100 scale
    last_updated_date DATE,
    data_quality_score DECIMAL(5,2) DEFAULT 80.0,
    
    -- Performance thresholds
    excellent_threshold DECIMAL(15,4),
    good_threshold DECIMAL(15,4),
    satisfactory_threshold DECIMAL(15,4),
    needs_improvement_threshold DECIMAL(15,4),
    
    -- Validation and approval
    validated BOOLEAN DEFAULT false,
    validated_by UUID,
    validation_date DATE,
    approved_for_use BOOLEAN DEFAULT true,
    
    -- Lifecycle
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_benchmarks_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_benchmarks_validated_by FOREIGN KEY (validated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_benchmarks_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT valid_confidence_level CHECK (confidence_level > 0 AND confidence_level <= 100),
    CONSTRAINT valid_reliability_score CHECK (source_reliability_score >= 0 AND source_reliability_score <= 100),
    CONSTRAINT valid_data_quality_score CHECK (data_quality_score >= 0 AND data_quality_score <= 100)
);

-- Performance measurement snapshots
CREATE TABLE IF NOT EXISTS training_performance_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Measurement identification
    measurement_id VARCHAR(128) NOT NULL UNIQUE,
    benchmark_id UUID NOT NULL,
    
    -- Measurement context
    measurement_date DATE NOT NULL,
    measurement_period_start DATE NOT NULL,
    measurement_period_end DATE NOT NULL,
    
    -- Subject of measurement
    subject_type VARCHAR(100) NOT NULL, -- 'user', 'team', 'department', 'restaurant'
    subject_id UUID,
    subject_identifier VARCHAR(200),
    
    -- Measured performance
    measured_value DECIMAL(15,4) NOT NULL,
    sample_size INTEGER NOT NULL,
    data_points_count INTEGER DEFAULT 1,
    
    -- Statistical analysis
    mean_value DECIMAL(15,4),
    median_value DECIMAL(15,4),
    standard_deviation DECIMAL(15,4),
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    percentile_25 DECIMAL(15,4),
    percentile_75 DECIMAL(15,4),
    percentile_90 DECIMAL(15,4),
    
    -- Benchmark comparison
    benchmark_target_value DECIMAL(15,4) NOT NULL,
    variance_from_target DECIMAL(15,4) NOT NULL,
    variance_percentage DECIMAL(8,2) NOT NULL,
    performance_tier performance_tier,
    
    -- Trend analysis
    previous_measurement_value DECIMAL(15,4),
    trend_direction trend_direction DEFAULT 'unknown',
    trend_magnitude DECIMAL(8,2) DEFAULT 0,
    improvement_rate DECIMAL(8,2) DEFAULT 0,
    
    -- Contextual factors
    external_factors TEXT[] DEFAULT '{}',
    data_quality_issues TEXT[] DEFAULT '{}',
    measurement_notes TEXT,
    
    -- Confidence and reliability
    measurement_confidence DECIMAL(5,2) DEFAULT 80.0,
    data_completeness_percentage DECIMAL(5,2) DEFAULT 100.0,
    anomalies_detected INTEGER DEFAULT 0,
    
    -- Business impact
    performance_gap_impact TEXT,
    improvement_potential DECIMAL(8,2) DEFAULT 0,
    recommended_actions TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_measurements_benchmark FOREIGN KEY (benchmark_id) REFERENCES training_performance_benchmarks(id) ON DELETE CASCADE,
    CONSTRAINT valid_measurement_confidence CHECK (measurement_confidence >= 0 AND measurement_confidence <= 100),
    CONSTRAINT valid_data_completeness CHECK (data_completeness_percentage >= 0 AND data_completeness_percentage <= 100)
);

-- Comparative performance analysis
CREATE TABLE IF NOT EXISTS training_comparative_performance_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Analysis identification
    analysis_id VARCHAR(128) NOT NULL UNIQUE,
    analysis_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Analysis scope
    analysis_date DATE NOT NULL,
    comparison_period_start DATE NOT NULL,
    comparison_period_end DATE NOT NULL,
    
    -- Subjects being compared
    primary_subject_type VARCHAR(100) NOT NULL,
    primary_subject_id UUID,
    comparison_subjects JSONB NOT NULL, -- Array of comparison subjects
    
    -- Benchmark context
    benchmark_ids UUID[] NOT NULL,
    metric_types performance_metric_type[] NOT NULL,
    
    -- Analysis methodology
    comparison_method VARCHAR(100) NOT NULL, -- 'peer_ranking', 'statistical_test', 'regression_analysis'
    statistical_significance_level DECIMAL(5,2) DEFAULT 95.0,
    control_variables TEXT[] DEFAULT '{}',
    
    -- Analysis results
    overall_performance_score DECIMAL(8,2) NOT NULL, -- 0-100 scale
    relative_ranking INTEGER,
    total_subjects_compared INTEGER,
    percentile_ranking DECIMAL(5,2),
    
    -- Detailed comparison results
    metric_comparisons JSONB NOT NULL, -- Per-metric comparison results
    strengths_identified TEXT[] DEFAULT '{}',
    improvement_areas TEXT[] DEFAULT '{}',
    
    -- Statistical analysis
    statistical_summary JSONB DEFAULT '{}',
    correlation_analysis JSONB DEFAULT '{}',
    significance_test_results JSONB DEFAULT '{}',
    
    -- Peer analysis
    peer_group_definition JSONB DEFAULT '{}',
    peer_group_size INTEGER,
    above_peer_average BOOLEAN DEFAULT false,
    peer_group_percentile DECIMAL(5,2),
    
    -- Trend analysis
    historical_comparison JSONB DEFAULT '{}',
    trend_analysis JSONB DEFAULT '{}',
    performance_trajectory VARCHAR(50), -- 'improving', 'declining', 'stable'
    
    -- Recommendations
    improvement_recommendations JSONB DEFAULT '[]',
    best_practice_insights TEXT[] DEFAULT '{}',
    action_priority_scores JSONB DEFAULT '{}',
    
    -- Analysis quality
    data_quality_assessment JSONB DEFAULT '{}',
    analysis_confidence_score DECIMAL(5,2) DEFAULT 80.0,
    limitations_noted TEXT[] DEFAULT '{}',
    
    -- Impact assessment
    performance_gap_analysis JSONB DEFAULT '{}',
    business_impact_estimation JSONB DEFAULT '{}',
    roi_improvement_potential DECIMAL(15,2),
    
    -- Distribution and review
    analysis_requested_by UUID,
    analysis_reviewed_by UUID,
    review_status VARCHAR(50) DEFAULT 'pending',
    distribution_list TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_analysis_requested_by FOREIGN KEY (analysis_requested_by) REFERENCES auth_users(id),
    CONSTRAINT fk_analysis_reviewed_by FOREIGN KEY (analysis_reviewed_by) REFERENCES auth_users(id),
    CONSTRAINT valid_performance_score CHECK (overall_performance_score >= 0 AND overall_performance_score <= 100),
    CONSTRAINT valid_percentile_ranking CHECK (percentile_ranking >= 0 AND percentile_ranking <= 100),
    CONSTRAINT valid_analysis_confidence CHECK (analysis_confidence_score >= 0 AND analysis_confidence_score <= 100)
);

-- Performance improvement tracking
CREATE TABLE IF NOT EXISTS training_performance_improvement_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Improvement tracking identification
    improvement_tracking_id VARCHAR(128) NOT NULL UNIQUE,
    subject_type VARCHAR(100) NOT NULL,
    subject_id UUID NOT NULL,
    
    -- Baseline measurement
    baseline_measurement_date DATE NOT NULL,
    baseline_performance_score DECIMAL(8,2) NOT NULL,
    benchmark_id UUID NOT NULL,
    
    -- Target setting
    improvement_target_score DECIMAL(8,2) NOT NULL,
    target_achievement_date DATE,
    improvement_plan_reference VARCHAR(200),
    
    -- Progress tracking
    current_performance_score DECIMAL(8,2),
    last_measurement_date DATE,
    improvement_achieved DECIMAL(8,2) DEFAULT 0, -- Points improved
    improvement_percentage DECIMAL(8,2) DEFAULT 0,
    
    -- Milestone tracking
    milestones_defined INTEGER DEFAULT 0,
    milestones_achieved INTEGER DEFAULT 0,
    next_milestone_target DECIMAL(8,2),
    next_milestone_date DATE,
    
    -- Intervention tracking
    interventions_implemented TEXT[] DEFAULT '{}',
    training_interventions INTEGER DEFAULT 0,
    process_improvements INTEGER DEFAULT 0,
    resource_investments DECIMAL(15,2) DEFAULT 0,
    
    -- Time analysis
    time_to_first_improvement_days INTEGER,
    projected_time_to_target_days INTEGER,
    improvement_velocity DECIMAL(8,4) DEFAULT 0, -- Points per day
    
    -- Effectiveness analysis
    intervention_effectiveness_score DECIMAL(5,2) DEFAULT 0, -- 0-100 scale
    cost_per_improvement_point DECIMAL(10,2) DEFAULT 0,
    roi_on_interventions DECIMAL(8,2) DEFAULT 0,
    
    -- Sustainability tracking
    performance_consistency_score DECIMAL(5,2) DEFAULT 0,
    regression_risk_level VARCHAR(20) DEFAULT 'medium',
    sustainability_factors TEXT[] DEFAULT '{}',
    
    -- Status and lifecycle
    improvement_status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'target_achieved', 'stalled', 'abandoned'
    completion_confidence DECIMAL(5,2) DEFAULT 50.0,
    success_probability DECIMAL(5,2) DEFAULT 50.0,
    
    -- Stakeholder management
    improvement_owner UUID,
    stakeholders UUID[] DEFAULT '{}',
    review_frequency_days INTEGER DEFAULT 30,
    last_review_date DATE,
    next_review_date DATE,
    
    -- Documentation
    improvement_notes TEXT,
    lessons_learned TEXT,
    success_factors TEXT[] DEFAULT '{}',
    barriers_encountered TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_improvement_benchmark FOREIGN KEY (benchmark_id) REFERENCES training_performance_benchmarks(id),
    CONSTRAINT fk_improvement_owner FOREIGN KEY (improvement_owner) REFERENCES auth_users(id),
    CONSTRAINT valid_baseline_score CHECK (baseline_performance_score >= 0 AND baseline_performance_score <= 100),
    CONSTRAINT valid_target_score CHECK (improvement_target_score >= 0 AND improvement_target_score <= 100),
    CONSTRAINT valid_completion_confidence CHECK (completion_confidence >= 0 AND completion_confidence <= 100),
    CONSTRAINT valid_success_probability CHECK (success_probability >= 0 AND success_probability <= 100)
);

-- Benchmarking dashboard configurations
CREATE TABLE IF NOT EXISTS training_benchmarking_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dashboard identification
    dashboard_id VARCHAR(128) NOT NULL UNIQUE,
    dashboard_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Dashboard scope and access
    restaurant_id UUID,
    user_id UUID, -- Dashboard owner
    access_level VARCHAR(50) DEFAULT 'private', -- 'private', 'team', 'department', 'organization'
    
    -- Dashboard configuration
    benchmark_ids UUID[] NOT NULL,
    default_time_period_days INTEGER DEFAULT 90,
    refresh_frequency_hours INTEGER DEFAULT 24,
    
    -- Visualization preferences
    chart_types JSONB DEFAULT '["line_chart", "bar_chart", "scorecard"]',
    color_scheme VARCHAR(50) DEFAULT 'default',
    layout_preferences JSONB DEFAULT '{}',
    
    -- Alert configuration
    performance_alerts_enabled BOOLEAN DEFAULT true,
    alert_thresholds JSONB DEFAULT '{}',
    alert_recipients TEXT[] DEFAULT '{}',
    
    -- Data preferences
    comparison_subjects JSONB DEFAULT '[]',
    trend_analysis_enabled BOOLEAN DEFAULT true,
    peer_comparison_enabled BOOLEAN DEFAULT true,
    forecasting_enabled BOOLEAN DEFAULT false,
    
    -- Dashboard metrics
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    average_session_duration_minutes DECIMAL(8,2) DEFAULT 0,
    
    -- Sharing and collaboration
    shared_with_users UUID[] DEFAULT '{}',
    shared_publicly BOOLEAN DEFAULT false,
    collaboration_enabled BOOLEAN DEFAULT false,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    last_modified_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_dashboards_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_dashboards_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_dashboards_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_dashboards_last_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id)
);

-- ===========================================
-- PERFORMANCE BENCHMARKING INDEXES
-- ===========================================

-- Training performance benchmarks indexes
CREATE UNIQUE INDEX idx_benchmarks_benchmark_id ON training_performance_benchmarks(benchmark_id);
CREATE INDEX idx_benchmarks_restaurant ON training_performance_benchmarks(restaurant_id);
CREATE INDEX idx_benchmarks_type ON training_performance_benchmarks(benchmark_type);
CREATE INDEX idx_benchmarks_metric_type ON training_performance_benchmarks(metric_type);
CREATE INDEX idx_benchmarks_scope ON training_performance_benchmarks(comparison_scope);
CREATE INDEX idx_benchmarks_active ON training_performance_benchmarks(is_active) WHERE is_active = true;
CREATE INDEX idx_benchmarks_department ON training_performance_benchmarks(department);
CREATE INDEX idx_benchmarks_role_category ON training_performance_benchmarks(role_category);
CREATE INDEX idx_benchmarks_effective_period ON training_performance_benchmarks(effective_from, effective_until);

-- Performance measurements indexes
CREATE UNIQUE INDEX idx_measurements_measurement_id ON training_performance_measurements(measurement_id);
CREATE INDEX idx_measurements_benchmark ON training_performance_measurements(benchmark_id);
CREATE INDEX idx_measurements_date ON training_performance_measurements(measurement_date);
CREATE INDEX idx_measurements_subject ON training_performance_measurements(subject_type, subject_id);
CREATE INDEX idx_measurements_period ON training_performance_measurements(measurement_period_start, measurement_period_end);
CREATE INDEX idx_measurements_performance_tier ON training_performance_measurements(performance_tier);
CREATE INDEX idx_measurements_trend ON training_performance_measurements(trend_direction);

-- Comparative analysis indexes
CREATE UNIQUE INDEX idx_analysis_analysis_id ON training_comparative_performance_analysis(analysis_id);
CREATE INDEX idx_analysis_primary_subject ON training_comparative_performance_analysis(primary_subject_type, primary_subject_id);
CREATE INDEX idx_analysis_date ON training_comparative_performance_analysis(analysis_date);
CREATE INDEX idx_analysis_requested_by ON training_comparative_performance_analysis(analysis_requested_by);
CREATE INDEX idx_analysis_review_status ON training_comparative_performance_analysis(review_status);
CREATE INDEX idx_analysis_performance_score ON training_comparative_performance_analysis(overall_performance_score);

-- Improvement tracking indexes
CREATE UNIQUE INDEX idx_improvement_improvement_tracking_id ON training_performance_improvement_tracking(improvement_tracking_id);
CREATE INDEX idx_improvement_subject ON training_performance_improvement_tracking(subject_type, subject_id);
CREATE INDEX idx_improvement_benchmark ON training_performance_improvement_tracking(benchmark_id);
CREATE INDEX idx_improvement_status ON training_performance_improvement_tracking(improvement_status);
CREATE INDEX idx_improvement_owner ON training_performance_improvement_tracking(improvement_owner);
CREATE INDEX idx_improvement_baseline_date ON training_performance_improvement_tracking(baseline_measurement_date);
CREATE INDEX idx_improvement_target_date ON training_performance_improvement_tracking(target_achievement_date);

-- Benchmarking dashboards indexes
CREATE UNIQUE INDEX idx_dashboards_dashboard_id ON training_benchmarking_dashboards(dashboard_id);
CREATE INDEX idx_dashboards_restaurant ON training_benchmarking_dashboards(restaurant_id);
CREATE INDEX idx_dashboards_user ON training_benchmarking_dashboards(user_id);
CREATE INDEX idx_dashboards_access_level ON training_benchmarking_dashboards(access_level);
CREATE INDEX idx_dashboards_active ON training_benchmarking_dashboards(is_active) WHERE is_active = true;
CREATE INDEX idx_dashboards_last_viewed ON training_benchmarking_dashboards(last_viewed_at);

-- JSONB indexes for complex queries
CREATE INDEX idx_analysis_metric_comparisons ON training_comparative_performance_analysis USING GIN(metric_comparisons);
CREATE INDEX idx_analysis_comparison_subjects ON training_comparative_performance_analysis USING GIN(comparison_subjects);
CREATE INDEX idx_analysis_statistical_summary ON training_comparative_performance_analysis USING GIN(statistical_summary);
CREATE INDEX idx_dashboards_chart_types ON training_benchmarking_dashboards USING GIN(chart_types);
CREATE INDEX idx_dashboards_layout_preferences ON training_benchmarking_dashboards USING GIN(layout_preferences);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on benchmarking tables
ALTER TABLE training_performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_performance_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_comparative_performance_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_performance_improvement_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_benchmarking_dashboards ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Benchmarks restaurant isolation"
ON training_performance_benchmarks FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Dashboards restaurant isolation"
ON training_benchmarking_dashboards FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- User access policies for measurements
CREATE POLICY "Measurements access control"
ON training_performance_measurements FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM training_performance_benchmarks tpb
        WHERE tpb.id = training_performance_measurements.benchmark_id
        AND (tpb.restaurant_id IS NULL OR tpb.restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()))
    )
);

-- Manager access for analysis
CREATE POLICY "Analysis manager access"
ON training_comparative_performance_analysis FOR ALL TO authenticated
USING (
    analysis_requested_by = auth.uid() OR
    analysis_reviewed_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

-- User access for improvement tracking
CREATE POLICY "Improvement tracking access"
ON training_performance_improvement_tracking FOR ALL TO authenticated
USING (
    improvement_owner = auth.uid() OR
    auth.uid() = ANY(stakeholders) OR
    (subject_type = 'user' AND subject_id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- BENCHMARKING FUNCTIONS
-- ===========================================

-- Function to calculate performance measurement
CREATE OR REPLACE FUNCTION calculate_performance_measurement(
    p_benchmark_id UUID,
    p_subject_type VARCHAR(100),
    p_subject_id UUID,
    p_measurement_date DATE DEFAULT CURRENT_DATE,
    p_period_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    measurement_uuid UUID;
    measurement_id_text TEXT;
    benchmark_record RECORD;
    calculated_value DECIMAL(15,4);
    sample_size INTEGER := 0;
    statistical_data RECORD;
    variance_from_target DECIMAL(15,4);
    performance_tier_result performance_tier;
BEGIN
    -- Get benchmark details
    SELECT * INTO benchmark_record
    FROM training_performance_benchmarks
    WHERE id = p_benchmark_id AND is_active = true;
    
    IF benchmark_record.id IS NULL THEN
        RAISE EXCEPTION 'Benchmark not found or inactive: %', p_benchmark_id;
    END IF;
    
    -- Calculate performance based on metric type
    CASE benchmark_record.metric_type
        WHEN 'completion_rate' THEN
            -- Calculate training completion rate
            SELECT 
                COALESCE(
                    (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
                     NULLIF(COUNT(*), 0)) * 100, 0
                ),
                COUNT(*)
            INTO calculated_value, sample_size
            FROM user_training_progress utp
            WHERE (p_subject_type = 'user' AND utp.user_id = p_subject_id)
               OR (p_subject_type = 'restaurant' AND EXISTS (
                   SELECT 1 FROM auth_users au 
                   WHERE au.id = utp.user_id AND au.restaurant_id = p_subject_id
               ))
            AND utp.created_at >= p_measurement_date - INTERVAL '1 day' * p_period_days
            AND utp.created_at <= p_measurement_date;
            
        WHEN 'assessment_score' THEN
            -- Calculate average assessment score
            SELECT 
                COALESCE(AVG(score_percentage), 0),
                COUNT(*)
            INTO calculated_value, sample_size
            FROM training_assessments ta
            WHERE (p_subject_type = 'user' AND ta.user_id = p_subject_id)
               OR (p_subject_type = 'restaurant' AND EXISTS (
                   SELECT 1 FROM auth_users au 
                   WHERE au.id = ta.user_id AND au.restaurant_id = p_subject_id
               ))
            AND ta.completed_at >= p_measurement_date - INTERVAL '1 day' * p_period_days
            AND ta.completed_at <= p_measurement_date
            AND ta.status = 'passed';
            
        WHEN 'time_to_complete' THEN
            -- Calculate average time to complete training
            SELECT 
                COALESCE(AVG(time_spent_minutes), 0),
                COUNT(*)
            INTO calculated_value, sample_size
            FROM user_training_progress utp
            WHERE (p_subject_type = 'user' AND utp.user_id = p_subject_id)
               OR (p_subject_type = 'restaurant' AND EXISTS (
                   SELECT 1 FROM auth_users au 
                   WHERE au.id = utp.user_id AND au.restaurant_id = p_subject_id
               ))
            AND utp.completed_at >= p_measurement_date - INTERVAL '1 day' * p_period_days
            AND utp.completed_at <= p_measurement_date
            AND utp.status = 'completed';
            
        ELSE
            -- Default calculation for other metrics
            calculated_value := 0;
            sample_size := 0;
    END CASE;
    
    -- Calculate statistical measures (simplified)
    SELECT 
        calculated_value as mean_val,
        calculated_value as median_val,
        0 as std_dev,
        calculated_value as min_val,
        calculated_value as max_val
    INTO statistical_data;
    
    -- Calculate variance from target
    variance_from_target := calculated_value - benchmark_record.target_value;
    
    -- Determine performance tier
    CASE 
        WHEN calculated_value >= COALESCE(benchmark_record.excellent_threshold, benchmark_record.target_value * 1.2) THEN
            performance_tier_result := 'top_performer';
        WHEN calculated_value >= COALESCE(benchmark_record.good_threshold, benchmark_record.target_value * 1.1) THEN
            performance_tier_result := 'above_average';
        WHEN calculated_value >= benchmark_record.target_value THEN
            performance_tier_result := 'average';
        WHEN calculated_value >= COALESCE(benchmark_record.needs_improvement_threshold, benchmark_record.target_value * 0.8) THEN
            performance_tier_result := 'below_average';
        ELSE
            performance_tier_result := 'needs_improvement';
    END CASE;
    
    -- Generate measurement ID
    measurement_id_text := 'measurement_' || p_benchmark_id || '_' || p_subject_id || '_' || p_measurement_date;
    
    -- Insert measurement record
    INSERT INTO training_performance_measurements (
        measurement_id,
        benchmark_id,
        measurement_date,
        measurement_period_start,
        measurement_period_end,
        subject_type,
        subject_id,
        subject_identifier,
        measured_value,
        sample_size,
        data_points_count,
        mean_value,
        median_value,
        standard_deviation,
        min_value,
        max_value,
        benchmark_target_value,
        variance_from_target,
        variance_percentage,
        performance_tier,
        measurement_confidence,
        data_completeness_percentage
    ) VALUES (
        measurement_id_text,
        p_benchmark_id,
        p_measurement_date,
        p_measurement_date - INTERVAL '1 day' * p_period_days,
        p_measurement_date,
        p_subject_type,
        p_subject_id,
        COALESCE(
            (SELECT name FROM restaurants WHERE id = p_subject_id AND p_subject_type = 'restaurant'),
            (SELECT full_name FROM auth_users WHERE id = p_subject_id AND p_subject_type = 'user'),
            'Unknown'
        ),
        calculated_value,
        sample_size,
        sample_size,
        statistical_data.mean_val,
        statistical_data.median_val,
        statistical_data.std_dev,
        statistical_data.min_val,
        statistical_data.max_val,
        benchmark_record.target_value,
        variance_from_target,
        CASE 
            WHEN benchmark_record.target_value != 0 THEN 
                ROUND((variance_from_target / benchmark_record.target_value) * 100, 2)
            ELSE 0
        END,
        performance_tier_result,
        CASE WHEN sample_size >= benchmark_record.sample_size_requirement THEN 95.0 ELSE 70.0 END,
        CASE WHEN sample_size > 0 THEN 100.0 ELSE 0.0 END
    ) RETURNING id INTO measurement_uuid;
    
    RETURN measurement_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate comparative performance analysis
CREATE OR REPLACE FUNCTION generate_comparative_performance_analysis(
    p_primary_subject_type VARCHAR(100),
    p_primary_subject_id UUID,
    p_benchmark_ids UUID[],
    p_comparison_period_days INTEGER DEFAULT 90
)
RETURNS UUID AS $$
DECLARE
    analysis_uuid UUID;
    analysis_id_text TEXT;
    overall_score DECIMAL(8,2) := 0;
    metric_comparisons JSONB := '{}';
    benchmark_record RECORD;
    primary_measurement RECORD;
    peer_measurements RECORD;
    comparison_count INTEGER := 0;
    total_variance DECIMAL(15,4) := 0;
BEGIN
    -- Generate analysis ID
    analysis_id_text := 'analysis_' || p_primary_subject_id || '_' || 
                       EXTRACT(EPOCH FROM NOW())::BIGINT;
    
    -- Process each benchmark
    FOREACH benchmark_record.id IN ARRAY p_benchmark_ids
    LOOP
        -- Get primary subject's measurement
        SELECT * INTO primary_measurement
        FROM training_performance_measurements
        WHERE benchmark_id = benchmark_record.id
        AND subject_type = p_primary_subject_type
        AND subject_id = p_primary_subject_id
        AND measurement_date >= CURRENT_DATE - INTERVAL '1 day' * p_comparison_period_days
        ORDER BY measurement_date DESC
        LIMIT 1;
        
        IF primary_measurement.id IS NOT NULL THEN
            -- Get peer average for comparison
            SELECT 
                AVG(measured_value) as peer_average,
                COUNT(*) as peer_count,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY measured_value) as peer_median
            INTO peer_measurements
            FROM training_performance_measurements
            WHERE benchmark_id = benchmark_record.id
            AND subject_type = p_primary_subject_type
            AND subject_id != p_primary_subject_id
            AND measurement_date >= CURRENT_DATE - INTERVAL '1 day' * p_comparison_period_days;
            
            -- Calculate performance score for this metric (0-100 scale)
            DECLARE
                metric_score DECIMAL(8,2);
                benchmark_target DECIMAL(15,4);
            BEGIN
                SELECT target_value INTO benchmark_target
                FROM training_performance_benchmarks
                WHERE id = benchmark_record.id;
                
                -- Score based on target achievement and peer comparison
                metric_score := LEAST(100, GREATEST(0,
                    (primary_measurement.measured_value / NULLIF(benchmark_target, 0)) * 100 * 0.7 +
                    CASE 
                        WHEN peer_measurements.peer_average > 0 THEN
                            (primary_measurement.measured_value / peer_measurements.peer_average) * 100 * 0.3
                        ELSE 0
                    END
                ));
                
                overall_score := overall_score + metric_score;
                comparison_count := comparison_count + 1;
                
                -- Build metric comparison data
                metric_comparisons := metric_comparisons || jsonb_build_object(
                    benchmark_record.id::text,
                    jsonb_build_object(
                        'measured_value', primary_measurement.measured_value,
                        'target_value', benchmark_target,
                        'peer_average', COALESCE(peer_measurements.peer_average, 0),
                        'peer_median', COALESCE(peer_measurements.peer_median, 0),
                        'peer_count', COALESCE(peer_measurements.peer_count, 0),
                        'performance_tier', primary_measurement.performance_tier,
                        'metric_score', metric_score,
                        'variance_from_target', primary_measurement.variance_from_target
                    )
                );
            END;
        END IF;
    END LOOP;
    
    -- Calculate overall performance score
    IF comparison_count > 0 THEN
        overall_score := overall_score / comparison_count;
    END IF;
    
    -- Insert comparative analysis record
    INSERT INTO training_comparative_performance_analysis (
        analysis_id,
        analysis_name,
        description,
        analysis_date,
        comparison_period_start,
        comparison_period_end,
        primary_subject_type,
        primary_subject_id,
        comparison_subjects,
        benchmark_ids,
        metric_types,
        comparison_method,
        overall_performance_score,
        total_subjects_compared,
        metric_comparisons,
        analysis_confidence_score,
        analysis_requested_by
    ) VALUES (
        analysis_id_text,
        'Performance Analysis - ' || p_primary_subject_type || ' ' || p_primary_subject_id,
        'Automated comparative performance analysis',
        CURRENT_DATE,
        CURRENT_DATE - INTERVAL '1 day' * p_comparison_period_days,
        CURRENT_DATE,
        p_primary_subject_type,
        p_primary_subject_id,
        '[]'::jsonb, -- Simplified for this function
        p_benchmark_ids,
        ARRAY['completion_rate', 'assessment_score', 'time_to_complete'],
        'peer_ranking',
        overall_score,
        comparison_count,
        metric_comparisons,
        CASE WHEN comparison_count >= 3 THEN 85.0 ELSE 70.0 END,
        auth.uid()
    ) RETURNING id INTO analysis_uuid;
    
    RETURN analysis_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track performance improvement
CREATE OR REPLACE FUNCTION start_performance_improvement_tracking(
    p_subject_type VARCHAR(100),
    p_subject_id UUID,
    p_benchmark_id UUID,
    p_improvement_target_score DECIMAL(8,2),
    p_target_achievement_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    tracking_uuid UUID;
    tracking_id_text TEXT;
    baseline_measurement RECORD;
    baseline_score DECIMAL(8,2);
BEGIN
    -- Get baseline measurement
    SELECT * INTO baseline_measurement
    FROM training_performance_measurements
    WHERE benchmark_id = p_benchmark_id
    AND subject_type = p_subject_type
    AND subject_id = p_subject_id
    ORDER BY measurement_date DESC
    LIMIT 1;
    
    IF baseline_measurement.id IS NULL THEN
        -- Create baseline measurement if none exists
        PERFORM calculate_performance_measurement(
            p_benchmark_id, p_subject_type, p_subject_id, CURRENT_DATE
        );
        
        -- Retrieve the created measurement
        SELECT * INTO baseline_measurement
        FROM training_performance_measurements
        WHERE benchmark_id = p_benchmark_id
        AND subject_type = p_subject_type
        AND subject_id = p_subject_id
        ORDER BY measurement_date DESC
        LIMIT 1;
    END IF;
    
    -- Calculate baseline score (0-100 scale)
    baseline_score := LEAST(100, GREATEST(0, 
        (baseline_measurement.measured_value / 
         NULLIF(baseline_measurement.benchmark_target_value, 0)) * 100
    ));
    
    -- Generate tracking ID
    tracking_id_text := 'improvement_' || p_subject_id || '_' || p_benchmark_id || '_' || 
                       EXTRACT(EPOCH FROM NOW())::BIGINT;
    
    -- Insert improvement tracking record
    INSERT INTO training_performance_improvement_tracking (
        improvement_tracking_id,
        subject_type,
        subject_id,
        baseline_measurement_date,
        baseline_performance_score,
        benchmark_id,
        improvement_target_score,
        target_achievement_date,
        current_performance_score,
        improvement_owner,
        next_review_date
    ) VALUES (
        tracking_id_text,
        p_subject_type,
        p_subject_id,
        baseline_measurement.measurement_date,
        baseline_score,
        p_benchmark_id,
        p_improvement_target_score,
        COALESCE(p_target_achievement_date, CURRENT_DATE + INTERVAL '90 days'),
        baseline_score,
        auth.uid(),
        CURRENT_DATE + INTERVAL '30 days'
    ) RETURNING id INTO tracking_uuid;
    
    RETURN tracking_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- BENCHMARKING TRIGGERS
-- ===========================================

-- Trigger for updated_at columns
CREATE TRIGGER update_benchmarks_updated_at
    BEFORE UPDATE ON training_performance_benchmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_updated_at
    BEFORE UPDATE ON training_comparative_performance_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_improvement_tracking_updated_at
    BEFORE UPDATE ON training_performance_improvement_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at
    BEFORE UPDATE ON training_benchmarking_dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- DEFAULT BENCHMARK SETUP
-- ===========================================

-- Create industry-standard benchmarks
INSERT INTO training_performance_benchmarks (
    benchmark_id,
    benchmark_name,
    description,
    benchmark_type,
    metric_type,
    comparison_scope,
    target_value,
    measurement_unit,
    data_source,
    industry_segment,
    created_by
) VALUES 
(
    'industry_completion_rate',
    'Industry Standard Training Completion Rate',
    'Restaurant industry standard for training completion rates',
    'industry_standard',
    'completion_rate',
    'industry',
    85.0,
    'percentage',
    'Restaurant Industry Training Association',
    'restaurant',
    '00000000-0000-0000-0000-000000000000'::UUID
),
(
    'industry_assessment_score',
    'Industry Standard Assessment Score',
    'Restaurant industry standard for training assessment scores',
    'industry_standard',
    'assessment_score',
    'industry',
    80.0,
    'percentage',
    'Restaurant Industry Training Association',
    'restaurant',
    '00000000-0000-0000-0000-000000000000'::UUID
),
(
    'organizational_time_to_complete',
    'Organizational Time to Complete Training',
    'Internal benchmark for training completion time',
    'organizational_baseline',
    'time_to_complete',
    'organization',
    120.0,
    'minutes',
    'Internal Training Analytics',
    'restaurant',
    '00000000-0000-0000-0000-000000000000'::UUID
);

-- Create default dashboards for restaurants
INSERT INTO training_benchmarking_dashboards (
    dashboard_id,
    dashboard_name,
    description,
    restaurant_id,
    user_id,
    benchmark_ids,
    access_level,
    created_by
)
SELECT 
    'performance_dashboard_' || r.id,
    'Training Performance Dashboard - ' || r.name,
    'Default performance benchmarking dashboard',
    r.id,
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'manager' LIMIT 1),
    ARRAY(SELECT id FROM training_performance_benchmarks LIMIT 3),
    'department',
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role IN ('admin', 'manager'))
ON CONFLICT (dashboard_id) DO NOTHING;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_performance_benchmarks IS 'Performance benchmarks for training metrics with industry standards and organizational targets';
COMMENT ON TABLE training_performance_measurements IS 'Historical performance measurements with statistical analysis and trend tracking';
COMMENT ON TABLE training_comparative_performance_analysis IS 'Comprehensive comparative analysis with peer benchmarking and statistical significance';
COMMENT ON TABLE training_performance_improvement_tracking IS 'Performance improvement tracking with milestone management and ROI analysis';
COMMENT ON TABLE training_benchmarking_dashboards IS 'Configurable dashboards for performance benchmarking visualization and monitoring';

-- Performance optimization
ANALYZE training_performance_benchmarks;
ANALYZE training_performance_measurements;
ANALYZE training_comparative_performance_analysis;
ANALYZE training_performance_improvement_tracking;
ANALYZE training_benchmarking_dashboards;