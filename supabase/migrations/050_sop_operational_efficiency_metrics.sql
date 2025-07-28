-- Restaurant Krong Thai SOP Management System
-- SOP Operational Efficiency Metrics
-- Migration 050: Operational efficiency metrics with KPI tracking and calculations
-- Created: 2025-07-28

-- ===========================================
-- OPERATIONAL EFFICIENCY ENUMS
-- ===========================================

-- KPI categories for restaurant operations
CREATE TYPE kpi_category AS ENUM (
    'productivity', 'quality', 'cost_efficiency', 'time_management', 'resource_utilization',
    'customer_service', 'safety_compliance', 'waste_reduction', 'revenue_optimization', 'staff_efficiency'
);

-- KPI measurement units
CREATE TYPE kpi_unit AS ENUM (
    'percentage', 'count', 'minutes', 'seconds', 'hours', 'dollars', 'ratio', 'score', 'rate', 'frequency'
);

-- Efficiency improvement status
CREATE TYPE efficiency_status AS ENUM ('improving', 'stable', 'declining', 'critical', 'excellent');

-- Operational impact levels
CREATE TYPE impact_level AS ENUM ('minimal', 'low', 'moderate', 'high', 'critical');

-- Benchmarking sources
CREATE TYPE benchmark_source AS ENUM (
    'internal_historical', 'peer_restaurants', 'industry_standard', 'best_practice', 'regulatory_requirement'
);

-- ===========================================
-- OPERATIONAL EFFICIENCY TABLES
-- ===========================================

-- Core KPI definitions and configurations
CREATE TABLE IF NOT EXISTS sop_operational_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- KPI identification
    kpi_name VARCHAR(255) NOT NULL,
    kpi_code VARCHAR(50) UNIQUE NOT NULL, -- Standardized code for system reference
    kpi_category kpi_category NOT NULL,
    kpi_subcategory VARCHAR(100),
    
    -- KPI description and context
    description TEXT NOT NULL,
    business_rationale TEXT NOT NULL,
    calculation_method TEXT NOT NULL,
    measurement_unit kpi_unit NOT NULL,
    
    -- Target and benchmark values
    target_value DECIMAL(12,4) NOT NULL,
    minimum_acceptable_value DECIMAL(12,4),
    maximum_acceptable_value DECIMAL(12,4),
    benchmark_value DECIMAL(12,4),
    benchmark_source benchmark_source,
    industry_standard_value DECIMAL(12,4),
    
    -- Performance thresholds
    excellent_threshold DECIMAL(12,4), -- Value that indicates excellent performance
    good_threshold DECIMAL(12,4), -- Value that indicates good performance
    acceptable_threshold DECIMAL(12,4), -- Minimum acceptable value
    poor_threshold DECIMAL(12,4), -- Value below which performance is poor
    critical_threshold DECIMAL(12,4), -- Value that triggers immediate action
    
    -- SOP relationships
    related_sop_documents UUID[], -- SOPs that influence this KPI
    primary_responsible_sops UUID[], -- SOPs primarily responsible for this KPI
    supporting_sops UUID[], -- SOPs that support achieving this KPI
    
    -- Measurement configuration
    measurement_frequency VARCHAR(50) DEFAULT 'daily', -- hourly, daily, weekly, monthly
    automated_calculation BOOLEAN DEFAULT false,
    calculation_formula TEXT, -- Formula for automated calculation
    data_sources TEXT[], -- Where data comes from for this KPI
    
    -- Business impact
    business_impact_level impact_level DEFAULT 'moderate',
    revenue_impact_per_unit DECIMAL(12,4) DEFAULT 0, -- Revenue impact per unit change
    cost_impact_per_unit DECIMAL(12,4) DEFAULT 0, -- Cost impact per unit change
    customer_satisfaction_correlation DECIMAL(8,4) DEFAULT 0,
    
    -- Ownership and accountability
    responsible_role VARCHAR(100), -- Role responsible for this KPI
    accountable_manager UUID, -- Manager accountable for performance
    review_frequency VARCHAR(50) DEFAULT 'weekly',
    escalation_threshold DECIMAL(12,4), -- When to escalate poor performance
    
    -- Reporting and visualization
    dashboard_visibility BOOLEAN DEFAULT true,
    chart_type VARCHAR(50) DEFAULT 'line', -- line, bar, gauge, table
    color_coding_rules JSONB DEFAULT '{}', -- Rules for color-coding performance
    alert_rules JSONB DEFAULT '{}', -- Rules for generating alerts
    
    -- Lifecycle management
    active BOOLEAN DEFAULT true,
    implementation_date DATE DEFAULT CURRENT_DATE,
    review_date DATE,
    sunset_date DATE,
    version_number DECIMAL(3,1) DEFAULT 1.0,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_operational_kpis_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_operational_kpis_manager FOREIGN KEY (accountable_manager) REFERENCES auth_users(id),
    CONSTRAINT fk_operational_kpis_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT valid_kpi_thresholds CHECK (
        excellent_threshold IS NULL OR good_threshold IS NULL OR excellent_threshold >= good_threshold
    )
);

-- KPI measurement and tracking data
CREATE TABLE IF NOT EXISTS sop_kpi_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    kpi_id UUID NOT NULL,
    
    -- Measurement metadata
    measurement_date DATE NOT NULL,
    measurement_time TIME DEFAULT CURRENT_TIME,
    measurement_period VARCHAR(50), -- 'shift', 'day', 'week', 'month'
    period_start_time TIMESTAMPTZ,
    period_end_time TIMESTAMPTZ,
    
    -- Core measurement data
    measured_value DECIMAL(12,4) NOT NULL,
    target_value DECIMAL(12,4) NOT NULL, -- Target at time of measurement
    variance_from_target DECIMAL(12,4) GENERATED ALWAYS AS (
        measured_value - target_value
    ) STORED,
    percentage_of_target DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE WHEN target_value != 0 THEN (measured_value / target_value) * 100 ELSE 0 END
    ) STORED,
    
    -- Performance classification
    performance_status efficiency_status DEFAULT 'stable',
    performance_score DECIMAL(5,2), -- 0-100 score based on thresholds
    meets_target BOOLEAN GENERATED ALWAYS AS (
        measured_value >= target_value
    ) STORED,
    
    -- Contributing factors analysis
    sop_execution_quality_scores JSONB DEFAULT '{}', -- SOP ID -> quality score mapping
    staffing_level INTEGER,
    customer_volume INTEGER,
    operational_conditions JSONB DEFAULT '{}', -- Weather, equipment status, etc.
    external_factors TEXT[], -- Events that may have influenced performance
    
    -- Contextual performance data
    shift_type VARCHAR(50), -- morning, afternoon, evening, night
    day_of_week INTEGER GENERATED ALWAYS AS (
        EXTRACT(DOW FROM measurement_date)
    ) STORED,
    is_weekend BOOLEAN GENERATED ALWAYS AS (
        EXTRACT(DOW FROM measurement_date) IN (0, 6)
    ) STORED,
    is_holiday BOOLEAN DEFAULT false,
    season VARCHAR(20), -- spring, summer, fall, winter
    
    -- Comparative analysis
    previous_period_value DECIMAL(12,4), -- Value from previous comparable period
    period_over_period_change DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE WHEN previous_period_value IS NOT NULL AND previous_period_value != 0 
             THEN ((measured_value - previous_period_value) / previous_period_value) * 100 
             ELSE NULL END
    ) STORED,
    
    -- Statistical measures
    rolling_average_7_days DECIMAL(12,4), -- 7-day rolling average
    rolling_average_30_days DECIMAL(12,4), -- 30-day rolling average
    standard_deviation DECIMAL(12,4), -- Standard deviation over measurement period
    coefficient_of_variation DECIMAL(8,4), -- Variability measure
    
    -- Quality and reliability
    data_quality_score DECIMAL(5,2) DEFAULT 100, -- 0-100
    measurement_confidence DECIMAL(5,2) DEFAULT 100, -- How confident we are in this measurement
    data_completeness DECIMAL(5,2) DEFAULT 100, -- Percentage of expected data collected
    outlier_flag BOOLEAN DEFAULT false, -- Statistical outlier identification
    
    -- Business impact calculation
    estimated_revenue_impact DECIMAL(12,2) DEFAULT 0,
    estimated_cost_impact DECIMAL(12,2) DEFAULT 0,
    customer_satisfaction_impact DECIMAL(8,4) DEFAULT 0,
    
    -- Action tracking
    action_required BOOLEAN DEFAULT false,
    corrective_actions_taken TEXT[],
    responsible_person UUID,
    action_due_date DATE,
    action_completed_date DATE,
    
    -- Measurement source and method
    measurement_method VARCHAR(100), -- 'automated', 'manual', 'system_calculated', 'third_party'
    data_source VARCHAR(100), -- POS, time_tracking, manual_entry, etc.
    measured_by UUID, -- Person who recorded this measurement
    verification_status VARCHAR(50) DEFAULT 'unverified', -- unverified, verified, disputed
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_kpi_measurements_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_kpi_measurements_kpi FOREIGN KEY (kpi_id) REFERENCES sop_operational_kpis(id) ON DELETE CASCADE,
    CONSTRAINT fk_kpi_measurements_responsible FOREIGN KEY (responsible_person) REFERENCES auth_users(id),
    CONSTRAINT fk_kpi_measurements_measured_by FOREIGN KEY (measured_by) REFERENCES auth_users(id),
    CONSTRAINT unique_kpi_measurement UNIQUE (restaurant_id, kpi_id, measurement_date, measurement_period),
    CONSTRAINT valid_measurement_period CHECK (period_end_time IS NULL OR period_end_time > period_start_time)
);

-- SOP efficiency impact analysis
CREATE TABLE IF NOT EXISTS sop_efficiency_impact_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    
    -- Analysis period
    analysis_date DATE NOT NULL,
    analysis_period VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    
    -- Core efficiency metrics
    execution_count INTEGER DEFAULT 0,
    total_execution_time_minutes DECIMAL(10,2) DEFAULT 0,
    average_execution_time_minutes DECIMAL(8,2) DEFAULT 0,
    execution_time_variance DECIMAL(8,4) DEFAULT 0,
    execution_efficiency_score DECIMAL(5,2) DEFAULT 100, -- 0-100
    
    -- Resource utilization metrics
    labor_hours_consumed DECIMAL(8,2) DEFAULT 0,
    labor_cost_per_execution DECIMAL(8,2) DEFAULT 0,
    material_cost_per_execution DECIMAL(8,2) DEFAULT 0,
    equipment_utilization_rate DECIMAL(5,2) DEFAULT 100,
    space_utilization_efficiency DECIMAL(5,2) DEFAULT 100,
    
    -- Quality and accuracy metrics
    first_time_success_rate DECIMAL(5,2) DEFAULT 100,
    rework_instances INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    quality_score DECIMAL(5,2) DEFAULT 100,
    compliance_rate DECIMAL(5,2) DEFAULT 100,
    
    -- Productivity metrics
    tasks_completed_per_hour DECIMAL(8,2) DEFAULT 0,
    output_per_labor_hour DECIMAL(8,2) DEFAULT 0,
    productivity_index DECIMAL(8,4) DEFAULT 100, -- Compared to baseline
    value_added_time_percentage DECIMAL(5,2) DEFAULT 100,
    
    -- Customer impact metrics
    customer_satisfaction_correlation DECIMAL(8,4) DEFAULT 0,
    customer_wait_time_impact DECIMAL(8,4) DEFAULT 0,
    service_quality_impact DECIMAL(8,4) DEFAULT 0,
    
    -- Cost efficiency analysis
    cost_per_successful_execution DECIMAL(8,2) DEFAULT 0,
    waste_cost_per_execution DECIMAL(8,2) DEFAULT 0,
    overhead_allocation DECIMAL(8,2) DEFAULT 0,
    total_cost_of_ownership DECIMAL(10,2) DEFAULT 0,
    
    -- Performance benchmarking
    performance_vs_standard DECIMAL(8,4) DEFAULT 100, -- % of standard performance
    performance_vs_best_practice DECIMAL(8,4) DEFAULT 100, -- % of best practice
    peer_comparison_percentile INTEGER DEFAULT 50, -- Percentile vs peer restaurants
    historical_trend_direction VARCHAR(20) DEFAULT 'stable', -- improving, stable, declining
    
    -- Bottleneck and constraint analysis
    identified_bottlenecks TEXT[],
    constraint_factors TEXT[],
    capacity_utilization DECIMAL(5,2) DEFAULT 100,
    throughput_limitation_factors TEXT[],
    
    -- Automation and optimization opportunities
    automation_potential_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    process_optimization_opportunities TEXT[],
    technology_enhancement_potential DECIMAL(5,2) DEFAULT 0,
    estimated_improvement_potential DECIMAL(8,4) DEFAULT 0, -- % improvement possible
    
    -- Risk and sustainability factors
    process_sustainability_score DECIMAL(5,2) DEFAULT 100,
    staff_burnout_risk DECIMAL(5,2) DEFAULT 0,
    equipment_failure_risk DECIMAL(5,2) DEFAULT 0,
    supply_chain_dependency_risk DECIMAL(5,2) DEFAULT 0,
    
    -- Environmental and sustainability metrics
    energy_consumption_per_execution DECIMAL(8,4) DEFAULT 0,
    water_usage_per_execution DECIMAL(8,4) DEFAULT 0,
    waste_generation_per_execution DECIMAL(8,4) DEFAULT 0,
    carbon_footprint_per_execution DECIMAL(8,4) DEFAULT 0,
    
    -- Learning and improvement tracking
    training_effectiveness_correlation DECIMAL(8,4) DEFAULT 0,
    experience_curve_progression DECIMAL(8,4) DEFAULT 0,
    knowledge_retention_score DECIMAL(5,2) DEFAULT 100,
    continuous_improvement_adoption DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_efficiency_impact_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_efficiency_impact_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT unique_efficiency_analysis UNIQUE (restaurant_id, sop_document_id, analysis_date, analysis_period)
);

-- Operational dashboard configurations and KPI groupings
CREATE TABLE IF NOT EXISTS sop_operational_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Dashboard identification
    dashboard_name VARCHAR(255) NOT NULL,
    dashboard_type VARCHAR(100), -- 'executive', 'operational', 'departmental', 'role_specific'
    target_audience VARCHAR(100), -- 'managers', 'supervisors', 'staff', 'executives'
    
    -- Dashboard configuration
    kpi_selections UUID[], -- Array of KPI IDs to display
    layout_configuration JSONB DEFAULT '{}', -- Grid layout, sizes, positions
    refresh_frequency_minutes INTEGER DEFAULT 5,
    auto_refresh BOOLEAN DEFAULT true,
    
    -- Display preferences
    chart_preferences JSONB DEFAULT '{}', -- Chart types, colors, styles per KPI
    threshold_alerts_enabled BOOLEAN DEFAULT true,
    trend_analysis_enabled BOOLEAN DEFAULT true,
    comparative_analysis_enabled BOOLEAN DEFAULT true,
    
    -- Access and permissions
    access_roles TEXT[], -- Roles that can view this dashboard
    edit_permissions TEXT[], -- Roles that can edit this dashboard
    public_access BOOLEAN DEFAULT false,
    
    -- Scheduling and distribution
    scheduled_reports JSONB DEFAULT '{}', -- Automated report generation schedule
    email_distribution_list TEXT[],
    notification_preferences JSONB DEFAULT '{}',
    
    -- Performance and optimization
    cache_duration_minutes INTEGER DEFAULT 5,
    data_aggregation_level VARCHAR(50) DEFAULT 'detailed', -- summary, detailed, raw
    historical_data_retention_days INTEGER DEFAULT 90,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_operational_dashboards_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_operational_dashboards_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_dashboard_name UNIQUE (restaurant_id, dashboard_name)
);

-- KPI performance alerts and notifications
CREATE TABLE IF NOT EXISTS sop_kpi_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    kpi_id UUID NOT NULL,
    
    -- Alert trigger information
    alert_date DATE NOT NULL,
    alert_time TIME NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'threshold_breach', 'trend_alert', 'anomaly_detection'
    severity_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Performance data that triggered alert
    measured_value DECIMAL(12,4) NOT NULL,
    threshold_value DECIMAL(12,4),
    variance_from_threshold DECIMAL(12,4),
    trend_direction VARCHAR(20), -- improving, stable, declining
    
    -- Alert content
    alert_title VARCHAR(255) NOT NULL,
    alert_description TEXT NOT NULL,
    recommended_actions TEXT[],
    estimated_impact DECIMAL(12,2), -- Financial impact if not addressed
    urgency_score DECIMAL(5,2) DEFAULT 50, -- 0-100
    
    -- Recipients and notifications
    notified_users UUID[], -- Users who were notified
    notification_methods TEXT[], -- email, sms, push, dashboard
    escalation_level INTEGER DEFAULT 1, -- 1=first level, 2=escalated, etc.
    
    -- Response tracking
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    action_taken TEXT,
    resolution_status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, dismissed
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    resolution_time_minutes INTEGER GENERATED ALWAYS AS (
        CASE WHEN resolved_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM resolved_at - (alert_date + alert_time)::TIMESTAMPTZ) / 60
        ELSE NULL END
    ) STORED,
    
    -- Follow-up and learning
    effectiveness_score DECIMAL(5,2), -- How effective was the alert/response
    false_positive BOOLEAN DEFAULT false,
    lessons_learned TEXT,
    process_improvements TEXT[],
    
    -- Alert system optimization
    alert_frequency_impact DECIMAL(5,2) DEFAULT 0, -- Impact on alert fatigue
    similar_alerts_count INTEGER DEFAULT 0, -- Number of similar recent alerts
    correlation_with_other_alerts UUID[], -- Related alerts
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_kpi_alerts_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_kpi_alerts_kpi FOREIGN KEY (kpi_id) REFERENCES sop_operational_kpis(id) ON DELETE CASCADE,
    CONSTRAINT fk_kpi_alerts_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES auth_users(id),
    CONSTRAINT fk_kpi_alerts_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_users(id)
);

-- Operational efficiency benchmarking and best practices
CREATE TABLE IF NOT EXISTS sop_efficiency_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Benchmark identification
    benchmark_name VARCHAR(255) NOT NULL,
    benchmark_category kpi_category NOT NULL,
    benchmark_scope VARCHAR(100), -- 'restaurant', 'chain', 'industry', 'region'
    
    -- Benchmark values and context
    benchmark_value DECIMAL(12,4) NOT NULL,
    measurement_unit kpi_unit NOT NULL,
    benchmark_source benchmark_source NOT NULL,
    source_description TEXT,
    confidence_level DECIMAL(5,2) DEFAULT 100, -- Confidence in benchmark accuracy
    
    -- Comparative analysis
    current_restaurant_value DECIMAL(12,4),
    gap_analysis DECIMAL(12,4) GENERATED ALWAYS AS (
        benchmark_value - COALESCE(current_restaurant_value, 0)
    ) STORED,
    performance_percentile INTEGER, -- Where restaurant ranks vs benchmark
    
    -- Benchmark context
    sample_size INTEGER, -- Size of benchmark sample
    data_collection_period VARCHAR(100), -- When benchmark data was collected
    geographical_scope TEXT, -- Regional or national scope
    restaurant_type_filter TEXT, -- Type of restaurants in benchmark
    
    -- Implementation guidance
    best_practices TEXT[], -- Practices that achieve benchmark performance
    implementation_steps TEXT[], -- Steps to reach benchmark
    estimated_implementation_cost DECIMAL(12,2),
    estimated_implementation_time_weeks INTEGER,
    resource_requirements TEXT[],
    
    -- ROI and business case
    estimated_annual_benefit DECIMAL(12,2), -- Annual benefit of reaching benchmark
    payback_period_months DECIMAL(5,1), -- Time to recover implementation cost
    risk_factors TEXT[], -- Risks in pursuing this benchmark
    success_factors TEXT[], -- Critical success factors
    
    -- Monitoring and maintenance
    review_frequency VARCHAR(50) DEFAULT 'quarterly',
    last_updated DATE DEFAULT CURRENT_DATE,
    next_review_date DATE,
    benchmark_validity_period_months INTEGER DEFAULT 12,
    
    -- Related metrics and SOPs
    related_kpis UUID[], -- KPIs that this benchmark relates to
    impacted_sop_documents UUID[], -- SOPs that need to change to meet benchmark
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_efficiency_benchmarks_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_efficiency_benchmarks_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_benchmark UNIQUE (restaurant_id, benchmark_name, benchmark_category)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Operational KPIs indexes
CREATE INDEX idx_operational_kpis_restaurant ON sop_operational_kpis(restaurant_id);
CREATE INDEX idx_operational_kpis_category ON sop_operational_kpis(kpi_category);
CREATE INDEX idx_operational_kpis_active ON sop_operational_kpis(active);
CREATE INDEX idx_operational_kpis_code ON sop_operational_kpis(kpi_code);

-- KPI measurements indexes
CREATE INDEX idx_kpi_measurements_restaurant_kpi ON sop_kpi_measurements(restaurant_id, kpi_id);
CREATE INDEX idx_kpi_measurements_date ON sop_kpi_measurements(measurement_date);
CREATE INDEX idx_kpi_measurements_performance ON sop_kpi_measurements(performance_status);
CREATE INDEX idx_kpi_measurements_target ON sop_kpi_measurements(meets_target);

-- Efficiency impact analysis indexes
CREATE INDEX idx_efficiency_impact_restaurant_sop ON sop_efficiency_impact_analysis(restaurant_id, sop_document_id);
CREATE INDEX idx_efficiency_impact_date ON sop_efficiency_impact_analysis(analysis_date);
CREATE INDEX idx_efficiency_impact_efficiency ON sop_efficiency_impact_analysis(execution_efficiency_score);

-- Operational dashboards indexes
CREATE INDEX idx_operational_dashboards_restaurant ON sop_operational_dashboards(restaurant_id);
CREATE INDEX idx_operational_dashboards_type ON sop_operational_dashboards(dashboard_type);

-- KPI alerts indexes
CREATE INDEX idx_kpi_alerts_restaurant_kpi ON sop_kpi_alerts(restaurant_id, kpi_id);
CREATE INDEX idx_kpi_alerts_date ON sop_kpi_alerts(alert_date);
CREATE INDEX idx_kpi_alerts_severity ON sop_kpi_alerts(severity_level);
CREATE INDEX idx_kpi_alerts_status ON sop_kpi_alerts(resolution_status);

-- Efficiency benchmarks indexes
CREATE INDEX idx_efficiency_benchmarks_restaurant ON sop_efficiency_benchmarks(restaurant_id);
CREATE INDEX idx_efficiency_benchmarks_category ON sop_efficiency_benchmarks(benchmark_category);

-- Composite indexes for analytics
CREATE INDEX idx_kpi_measurements_analytics ON sop_kpi_measurements(restaurant_id, measurement_date, performance_status, measured_value);
CREATE INDEX idx_efficiency_analytics ON sop_efficiency_impact_analysis(restaurant_id, analysis_date, execution_efficiency_score, first_time_success_rate);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on operational efficiency tables
ALTER TABLE sop_operational_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_kpi_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_efficiency_impact_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_operational_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_kpi_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_efficiency_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Operational KPIs restaurant access"
ON sop_operational_kpis FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "KPI measurements restaurant access"
ON sop_kpi_measurements FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Efficiency impact analysis restaurant access"
ON sop_efficiency_impact_analysis FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Operational dashboards restaurant access"
ON sop_operational_dashboards FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "KPI alerts restaurant access"
ON sop_kpi_alerts FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Efficiency benchmarks restaurant access"
ON sop_efficiency_benchmarks FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_operational_kpis_updated_at 
    BEFORE UPDATE ON sop_operational_kpis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_operational_dashboards_updated_at 
    BEFORE UPDATE ON sop_operational_dashboards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_efficiency_benchmarks_updated_at 
    BEFORE UPDATE ON sop_efficiency_benchmarks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- OPERATIONAL EFFICIENCY ANALYTICS FUNCTIONS
-- ===========================================

-- Function to calculate KPI performance score
CREATE OR REPLACE FUNCTION calculate_kpi_performance_score(
    p_measured_value DECIMAL,
    p_excellent_threshold DECIMAL,
    p_good_threshold DECIMAL,
    p_acceptable_threshold DECIMAL,
    p_poor_threshold DECIMAL,
    p_higher_is_better BOOLEAN DEFAULT true
)
RETURNS DECIMAL AS $$
DECLARE
    performance_score DECIMAL DEFAULT 0;
BEGIN
    -- Determine if higher values are better or worse for this KPI
    IF p_higher_is_better THEN
        CASE 
            WHEN p_measured_value >= COALESCE(p_excellent_threshold, p_good_threshold, p_acceptable_threshold, 0) THEN
                performance_score := 100;
            WHEN p_measured_value >= COALESCE(p_good_threshold, p_acceptable_threshold, 0) THEN
                performance_score := 85;
            WHEN p_measured_value >= COALESCE(p_acceptable_threshold, 0) THEN
                performance_score := 70;
            WHEN p_measured_value >= COALESCE(p_poor_threshold, 0) THEN
                performance_score := 50;
            ELSE
                performance_score := 25;
        END CASE;
    ELSE
        CASE 
            WHEN p_measured_value <= COALESCE(p_excellent_threshold, p_good_threshold, p_acceptable_threshold, 999999) THEN
                performance_score := 100;
            WHEN p_measured_value <= COALESCE(p_good_threshold, p_acceptable_threshold, 999999) THEN
                performance_score := 85;
            WHEN p_measured_value <= COALESCE(p_acceptable_threshold, 999999) THEN
                performance_score := 70;
            WHEN p_measured_value <= COALESCE(p_poor_threshold, 999999) THEN
                performance_score := 50;
            ELSE
                performance_score := 25;
        END CASE;
    END IF;
    
    RETURN performance_score;
END;
$$ LANGUAGE plpgsql;

-- Function to identify top operational efficiency opportunities
CREATE OR REPLACE FUNCTION identify_efficiency_opportunities(
    p_restaurant_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    sop_document_id UUID,
    sop_title TEXT,
    current_efficiency_score DECIMAL,
    improvement_potential DECIMAL,
    estimated_cost_savings DECIMAL,
    estimated_time_savings DECIMAL,
    priority_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH efficiency_analysis AS (
        SELECT 
            seia.sop_document_id,
            sd.title as sop_title,
            seia.execution_efficiency_score as current_efficiency,
            (100 - seia.execution_efficiency_score) as improvement_potential,
            seia.waste_cost_per_execution * seia.execution_count as potential_cost_savings,
            (seia.average_execution_time_minutes - (seia.average_execution_time_minutes * 0.8)) * seia.execution_count as potential_time_savings,
            -- Priority based on cost savings potential, frequency, and ease of improvement
            ((100 - seia.execution_efficiency_score) * 0.4 + 
             LEAST(seia.execution_count / 10.0, 10) * 10 * 0.3 + 
             (100 - COALESCE(seia.error_rate, 0)) * 0.3) as priority
        FROM sop_efficiency_impact_analysis seia
        JOIN sop_documents sd ON seia.sop_document_id = sd.id
        WHERE seia.restaurant_id = p_restaurant_id
          AND seia.analysis_date >= CURRENT_DATE - INTERVAL '30 days'
          AND seia.execution_count > 0
          AND seia.execution_efficiency_score < 90 -- Focus on sub-optimal processes
    )
    SELECT 
        ea.sop_document_id,
        ea.sop_title,
        ea.current_efficiency,
        ea.improvement_potential,
        ea.potential_cost_savings,
        ea.potential_time_savings,
        ea.priority
    FROM efficiency_analysis ea
    ORDER BY ea.priority DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to generate KPI trend analysis
CREATE OR REPLACE FUNCTION analyze_kpi_trends(
    p_restaurant_id UUID,
    p_kpi_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    trend_direction TEXT,
    trend_strength DECIMAL,
    current_value DECIMAL,
    average_value DECIMAL,
    volatility_score DECIMAL,
    performance_consistency TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH kpi_trend_data AS (
        SELECT 
            skm.measurement_date,
            skm.measured_value,
            ROW_NUMBER() OVER (ORDER BY skm.measurement_date) as time_sequence,
            COUNT(*) OVER () as total_measurements
        FROM sop_kpi_measurements skm
        WHERE skm.restaurant_id = p_restaurant_id
          AND skm.kpi_id = p_kpi_id
          AND skm.measurement_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
        ORDER BY skm.measurement_date
    ),
    trend_calculation AS (
        SELECT 
            COALESCE(CORR(ktd.time_sequence::DECIMAL, ktd.measured_value), 0) as correlation_coeff,
            AVG(ktd.measured_value) as avg_value,
            STDDEV(ktd.measured_value) as std_dev,
            MAX(ktd.measured_value) as max_value,
            MIN(ktd.measured_value) as min_value,
            COUNT(*) as sample_size
        FROM kpi_trend_data ktd
    ),
    latest_value AS (
        SELECT measured_value as current_val
        FROM sop_kpi_measurements skm
        WHERE skm.restaurant_id = p_restaurant_id
          AND skm.kpi_id = p_kpi_id
        ORDER BY skm.measurement_date DESC, skm.measurement_time DESC
        LIMIT 1
    )
    SELECT 
        CASE 
            WHEN tc.correlation_coeff > 0.3 THEN 'Strong Upward Trend'
            WHEN tc.correlation_coeff > 0.1 THEN 'Moderate Upward Trend'
            WHEN tc.correlation_coeff > -0.1 THEN 'Stable'
            WHEN tc.correlation_coeff > -0.3 THEN 'Moderate Downward Trend'
            ELSE 'Strong Downward Trend'
        END as trend_direction,
        ABS(tc.correlation_coeff) * 100 as trend_strength,
        lv.current_val as current_value,
        tc.avg_value as average_value,
        CASE WHEN tc.avg_value > 0 THEN (tc.std_dev / tc.avg_value) * 100 ELSE 0 END as volatility_score,
        CASE 
            WHEN tc.std_dev <= tc.avg_value * 0.1 THEN 'Highly Consistent'
            WHEN tc.std_dev <= tc.avg_value * 0.2 THEN 'Consistent'
            WHEN tc.std_dev <= tc.avg_value * 0.3 THEN 'Moderately Variable'
            ELSE 'Highly Variable'
        END as performance_consistency
    FROM trend_calculation tc
    CROSS JOIN latest_value lv;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate operational efficiency ROI
CREATE OR REPLACE FUNCTION calculate_efficiency_roi(
    p_restaurant_id UUID,
    p_sop_document_id UUID,
    p_improvement_percentage DECIMAL DEFAULT 10
)
RETURNS TABLE (
    current_annual_cost DECIMAL,
    improved_annual_cost DECIMAL,
    annual_savings DECIMAL,
    implementation_cost_estimate DECIMAL,
    payback_months DECIMAL,
    five_year_roi DECIMAL
) AS $$
DECLARE
    daily_executions DECIMAL;
    avg_cost_per_execution DECIMAL;
    avg_time_per_execution DECIMAL;
    labor_rate_per_hour DECIMAL DEFAULT 25.00; -- Assumed average labor rate
BEGIN
    -- Get current efficiency metrics
    SELECT 
        AVG(seia.execution_count),
        AVG(seia.cost_per_successful_execution),
        AVG(seia.average_execution_time_minutes)
    INTO daily_executions, avg_cost_per_execution, avg_time_per_execution
    FROM sop_efficiency_impact_analysis seia
    WHERE seia.restaurant_id = p_restaurant_id
      AND seia.sop_document_id = p_sop_document_id
      AND seia.analysis_date >= CURRENT_DATE - INTERVAL '30 days';
    
    -- If no data available, use defaults
    daily_executions := COALESCE(daily_executions, 1);
    avg_cost_per_execution := COALESCE(avg_cost_per_execution, 10);
    avg_time_per_execution := COALESCE(avg_time_per_execution, 15);
    
    RETURN QUERY
    SELECT 
        (daily_executions * avg_cost_per_execution * 365) as current_annual_cost,
        (daily_executions * avg_cost_per_execution * (100 - p_improvement_percentage) / 100 * 365) as improved_annual_cost,
        (daily_executions * avg_cost_per_execution * p_improvement_percentage / 100 * 365) as annual_savings,  
        (daily_executions * avg_cost_per_execution * 30) as implementation_cost_estimate, -- Estimate 30 days of current cost
        CASE WHEN (daily_executions * avg_cost_per_execution * p_improvement_percentage / 100 * 365) > 0 
             THEN (daily_executions * avg_cost_per_execution * 30) / 
                  ((daily_executions * avg_cost_per_execution * p_improvement_percentage / 100 * 365) / 12)
             ELSE NULL END as payback_months,
        CASE WHEN (daily_executions * avg_cost_per_execution * 30) > 0
             THEN (((daily_executions * avg_cost_per_execution * p_improvement_percentage / 100 * 365) * 5) - 
                   (daily_executions * avg_cost_per_execution * 30)) / 
                  (daily_executions * avg_cost_per_execution * 30) * 100
             ELSE NULL END as five_year_roi;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_operational_kpis IS 'Core KPI definitions with targets, thresholds, and business impact configuration for operational efficiency tracking';
COMMENT ON TABLE sop_kpi_measurements IS 'Time-series measurements of operational KPIs with performance analysis and contextual factors';
COMMENT ON TABLE sop_efficiency_impact_analysis IS 'Comprehensive efficiency impact analysis for individual SOPs with resource utilization and productivity metrics';
COMMENT ON TABLE sop_operational_dashboards IS 'Dashboard configurations for operational efficiency monitoring with KPI groupings and display preferences';
COMMENT ON TABLE sop_kpi_alerts IS 'Performance alerts and notifications system with resolution tracking and effectiveness measurement';
COMMENT ON TABLE sop_efficiency_benchmarks IS 'Industry and internal benchmarks for operational efficiency with implementation guidance and ROI analysis';

-- Performance optimization
ANALYZE sop_operational_kpis;
ANALYZE sop_kpi_measurements;
ANALYZE sop_efficiency_impact_analysis;
ANALYZE sop_operational_dashboards;
ANALYZE sop_kpi_alerts;
ANALYZE sop_efficiency_benchmarks;