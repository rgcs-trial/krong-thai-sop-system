-- Restaurant Krong Thai SOP Management System
-- SOP Business Intelligence Data Warehouse
-- Migration 052: Business intelligence data warehouse with comprehensive reporting views
-- Created: 2025-07-28

-- ===========================================
-- BUSINESS INTELLIGENCE ENUMS
-- ===========================================

-- Data warehouse granularity levels
CREATE TYPE warehouse_granularity AS ENUM ('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- Report categories for BI
CREATE TYPE report_category AS ENUM (
    'operational_performance', 'financial_analysis', 'customer_insights', 'staff_performance',
    'compliance_monitoring', 'efficiency_analysis', 'trend_forecasting', 'executive_summary'
);

-- Data quality dimensions
CREATE TYPE data_quality_dimension AS ENUM (
    'completeness', 'accuracy', 'consistency', 'timeliness', 'validity', 'uniqueness'
);

-- BI cube dimensions
CREATE TYPE cube_dimension AS ENUM (
    'time', 'restaurant', 'sop', 'staff', 'customer', 'department', 'category', 'performance'
);

-- ===========================================
-- DATA WAREHOUSE CORE TABLES
-- ===========================================

-- Comprehensive fact table for SOP business intelligence
CREATE TABLE IF NOT EXISTS sop_bi_fact_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dimension keys (foreign keys to dimension tables)
    restaurant_id UUID NOT NULL,
    date_key DATE NOT NULL,
    time_key TIME NOT NULL,
    sop_document_id UUID NOT NULL,
    user_id UUID,
    customer_session_id UUID,
    department_key VARCHAR(100),
    category_key UUID,
    
    -- Time hierarchy
    hour_of_day INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM time_key)) STORED,
    day_of_week INTEGER GENERATED ALWAYS AS (EXTRACT(DOW FROM date_key)) STORED,
    day_of_month INTEGER GENERATED ALWAYS AS (EXTRACT(DAY FROM date_key)) STORED,
    week_of_year INTEGER GENERATED ALWAYS AS (EXTRACT(WEEK FROM date_key)) STORED,
    month_of_year INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM date_key)) STORED,
    quarter_of_year INTEGER GENERATED ALWAYS AS (EXTRACT(QUARTER FROM date_key)) STORED,
    year_key INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM date_key)) STORED,
    
    -- Operational performance measures
    sop_executions_count INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    execution_success_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN sop_executions_count > 0 
             THEN (successful_executions::DECIMAL / sop_executions_count) * 100 
             ELSE 0 END
    ) STORED,
    
    -- Time and efficiency measures
    total_execution_time_minutes DECIMAL(10,2) DEFAULT 0,
    average_execution_time_minutes DECIMAL(8,2) DEFAULT 0,
    fastest_execution_time_minutes DECIMAL(8,2) DEFAULT 0,
    slowest_execution_time_minutes DECIMAL(8,2) DEFAULT 0,
    execution_time_variance DECIMAL(8,4) DEFAULT 0,
    
    -- Quality measures
    quality_score_sum DECIMAL(10,2) DEFAULT 0,
    average_quality_score DECIMAL(5,2) DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    rework_instances INTEGER DEFAULT 0,
    first_time_success_count INTEGER DEFAULT 0,
    
    -- Financial measures
    total_execution_cost DECIMAL(12,2) DEFAULT 0,
    labor_cost DECIMAL(12,2) DEFAULT 0,
    material_cost DECIMAL(12,2) DEFAULT 0,
    overhead_cost DECIMAL(12,2) DEFAULT 0,
    revenue_impact DECIMAL(12,2) DEFAULT 0,
    cost_savings DECIMAL(12,2) DEFAULT 0,
    
    -- Customer satisfaction measures
    customer_interactions_count INTEGER DEFAULT 0,
    customer_satisfaction_sum DECIMAL(10,2) DEFAULT 0,
    average_customer_satisfaction DECIMAL(5,2) DEFAULT 0,
    customer_complaints INTEGER DEFAULT 0,
    customer_compliments INTEGER DEFAULT 0,
    net_promoter_score DECIMAL(8,4) DEFAULT 0,
    
    -- Staff performance measures
    staff_efficiency_score DECIMAL(5,2) DEFAULT 0,
    staff_quality_score DECIMAL(5,2) DEFAULT 0,
    training_correlation DECIMAL(8,4) DEFAULT 0,
    experience_level_factor DECIMAL(8,4) DEFAULT 1.0,
    
    -- Compliance and safety measures
    compliance_score DECIMAL(5,2) DEFAULT 100,
    safety_incidents INTEGER DEFAULT 0,
    audit_findings INTEGER DEFAULT 0,
    corrective_actions INTEGER DEFAULT 0,
    
    -- Innovation and improvement measures
    improvement_suggestions INTEGER DEFAULT 0,
    innovations_implemented INTEGER DEFAULT 0,
    best_practices_shared INTEGER DEFAULT 0,
    knowledge_transfers INTEGER DEFAULT 0,
    
    -- Environmental and sustainability measures
    energy_consumption DECIMAL(8,4) DEFAULT 0,
    water_usage DECIMAL(8,4) DEFAULT 0,
    waste_generated DECIMAL(8,4) DEFAULT 0,
    recycling_amount DECIMAL(8,4) DEFAULT 0,
    
    -- Predictive and analytical measures
    forecast_accuracy DECIMAL(5,2) DEFAULT 0,
    trend_indicator DECIMAL(8,4) DEFAULT 0,
    seasonality_factor DECIMAL(8,4) DEFAULT 1.0,
    anomaly_score DECIMAL(5,2) DEFAULT 0,
    
    -- Data quality and metadata
    data_completeness_score DECIMAL(5,2) DEFAULT 100,
    data_freshness_minutes INTEGER DEFAULT 0,
    source_system_count INTEGER DEFAULT 1,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bi_fact_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_fact_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_fact_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bi_fact_category FOREIGN KEY (category_key) REFERENCES sop_categories(id) ON DELETE SET NULL,
    CONSTRAINT unique_bi_fact_key UNIQUE (restaurant_id, date_key, time_key, sop_document_id, user_id)
);

-- Date dimension table for time-based analysis
CREATE TABLE IF NOT EXISTS sop_bi_date_dimension (
    date_key DATE PRIMARY KEY,
    
    -- Date attributes
    day_name VARCHAR(10) NOT NULL,
    day_of_week INTEGER NOT NULL,
    day_of_month INTEGER NOT NULL,
    day_of_year INTEGER NOT NULL,
    
    -- Week attributes
    week_of_year INTEGER NOT NULL,
    week_of_month INTEGER NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    -- Month attributes
    month_name VARCHAR(12) NOT NULL,
    month_of_year INTEGER NOT NULL,
    month_start_date DATE NOT NULL,
    month_end_date DATE NOT NULL,
    days_in_month INTEGER NOT NULL,
    
    -- Quarter attributes
    quarter_name VARCHAR(6) NOT NULL,
    quarter_of_year INTEGER NOT NULL,
    quarter_start_date DATE NOT NULL,
    quarter_end_date DATE NOT NULL,
    
    -- Year attributes
    year_key INTEGER NOT NULL,
    year_start_date DATE NOT NULL,
    year_end_date DATE NOT NULL,
    is_leap_year BOOLEAN NOT NULL,
    
    -- Business calendar attributes
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN DEFAULT false,
    holiday_name VARCHAR(100),
    is_business_day BOOLEAN GENERATED ALWAYS AS (NOT is_weekend AND NOT is_holiday) STORED,
    
    -- Seasonal attributes
    season VARCHAR(10) NOT NULL, -- spring, summer, fall, winter
    is_peak_season BOOLEAN DEFAULT false,
    restaurant_season_type VARCHAR(50), -- busy, slow, normal
    
    -- Fiscal attributes (if different from calendar)
    fiscal_year INTEGER,
    fiscal_quarter INTEGER,
    fiscal_month INTEGER,
    fiscal_week INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOP dimension table for SOP-specific analysis
CREATE TABLE IF NOT EXISTS sop_bi_sop_dimension (
    sop_key UUID PRIMARY KEY,
    
    -- Basic SOP attributes
    sop_id UUID NOT NULL UNIQUE,
    sop_title VARCHAR(500) NOT NULL,
    sop_version DECIMAL(3,1) DEFAULT 1.0,
    sop_status VARCHAR(50) NOT NULL,
    
    -- Category and classification
    category_id UUID,
    category_name VARCHAR(255),
    department VARCHAR(100),
    process_area VARCHAR(100),
    complexity_level VARCHAR(20), -- simple, moderate, complex, advanced
    
    -- Operational attributes
    estimated_duration_minutes INTEGER DEFAULT 0,
    frequency VARCHAR(50), -- daily, weekly, monthly, as_needed
    criticality_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    automation_level VARCHAR(20) DEFAULT 'manual', -- manual, semi_automated, automated
    
    -- Performance characteristics
    average_success_rate DECIMAL(5,2) DEFAULT 100,
    average_execution_time DECIMAL(8,2) DEFAULT 0,
    typical_error_rate DECIMAL(5,2) DEFAULT 0,
    training_requirement_hours DECIMAL(5,1) DEFAULT 0,
    
    -- Business impact
    customer_facing BOOLEAN DEFAULT false,
    revenue_impact_level VARCHAR(20) DEFAULT 'low', -- low, medium, high
    cost_impact_level VARCHAR(20) DEFAULT 'low',
    safety_critical BOOLEAN DEFAULT false,
    compliance_required BOOLEAN DEFAULT false,
    
    -- Content attributes
    step_count INTEGER DEFAULT 0,
    has_media BOOLEAN DEFAULT false,
    has_checklists BOOLEAN DEFAULT false,
    has_decision_points BOOLEAN DEFAULT false,
    language_versions INTEGER DEFAULT 1,
    
    -- Lifecycle attributes
    creation_date DATE,
    last_revision_date DATE,
    next_review_date DATE,
    retirement_date DATE,
    usage_frequency_score DECIMAL(5,2) DEFAULT 0,
    
    -- Relationships
    parent_sop_id UUID, -- If this is a variant of another SOP
    related_sop_count INTEGER DEFAULT 0,
    prerequisite_sop_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_sop_dimension_sop FOREIGN KEY (sop_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_dimension_category FOREIGN KEY (category_id) REFERENCES sop_categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_sop_dimension_parent FOREIGN KEY (parent_sop_id) REFERENCES sop_documents(id) ON DELETE SET NULL
);

-- Staff dimension table for people-based analysis
CREATE TABLE IF NOT EXISTS sop_bi_staff_dimension (
    staff_key UUID PRIMARY KEY,
    
    -- Basic staff attributes
    user_id UUID NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    employee_id VARCHAR(50),
    
    -- Role and department
    current_role VARCHAR(100),
    primary_department VARCHAR(100),
    secondary_departments TEXT[],
    reporting_manager_id UUID,
    
    -- Experience and skills
    years_of_experience DECIMAL(4,1) DEFAULT 0,
    months_at_restaurant INTEGER DEFAULT 0,
    skill_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced, expert
    certifications_count INTEGER DEFAULT 0,
    
    -- Performance characteristics
    average_performance_score DECIMAL(5,2) DEFAULT 50,
    training_completion_rate DECIMAL(5,2) DEFAULT 0,
    sop_specializations UUID[], -- Array of SOP categories they specialize in
    preferred_work_style VARCHAR(50), -- independent, collaborative, structured, flexible
    
    -- Engagement and development
    job_satisfaction_score DECIMAL(5,2) DEFAULT 50,
    career_stage VARCHAR(50), -- entry_level, developing, established, senior, mentor
    promotion_potential DECIMAL(5,2) DEFAULT 0,
    retention_risk_score DECIMAL(5,2) DEFAULT 0,
    
    -- Work patterns
    typical_shift_pattern VARCHAR(100),
    preferred_hours VARCHAR(50), -- morning, afternoon, evening, flexible
    availability_score DECIMAL(5,2) DEFAULT 100,
    reliability_score DECIMAL(5,2) DEFAULT 100,
    
    -- Demographic attributes (anonymized for privacy)
    age_group VARCHAR(20), -- 18-25, 26-35, 36-45, 46-55, 55+
    education_level VARCHAR(50),
    language_proficiencies TEXT[],
    
    -- Employment attributes
    employment_type VARCHAR(50), -- full_time, part_time, contractor, temporary
    hire_date DATE,
    probation_end_date DATE,
    contract_end_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_staff_dimension_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_dimension_manager FOREIGN KEY (reporting_manager_id) REFERENCES auth_users(id) ON DELETE SET NULL
);

-- ===========================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ===========================================

-- Daily operational summary materialized view
CREATE MATERIALIZED VIEW sop_bi_daily_operational_summary AS
SELECT 
    restaurant_id,
    date_key,
    
    -- Execution metrics
    SUM(sop_executions_count) as total_executions,
    AVG(execution_success_rate) as avg_success_rate,
    SUM(successful_executions) as total_successful_executions,
    SUM(failed_executions) as total_failed_executions,
    
    -- Time metrics
    AVG(average_execution_time_minutes) as avg_execution_time,
    SUM(total_execution_time_minutes) as total_execution_time,
    MIN(fastest_execution_time_minutes) as fastest_execution,
    MAX(slowest_execution_time_minutes) as slowest_execution,
    
    -- Quality metrics
    AVG(average_quality_score) as avg_quality_score,
    SUM(error_count) as total_errors,
    SUM(rework_instances) as total_rework,
    SUM(first_time_success_count) as total_first_time_success,
    
    -- Financial metrics
    SUM(total_execution_cost) as total_cost,
    SUM(labor_cost) as total_labor_cost,
    SUM(material_cost) as total_material_cost,
    SUM(revenue_impact) as total_revenue_impact,
    SUM(cost_savings) as total_cost_savings,
    
    -- Customer metrics
    SUM(customer_interactions_count) as total_customer_interactions,
    AVG(average_customer_satisfaction) as avg_customer_satisfaction,
    SUM(customer_complaints) as total_complaints,
    SUM(customer_compliments) as total_compliments,
    
    -- Staff metrics
    COUNT(DISTINCT user_id) as active_staff_count,
    AVG(staff_efficiency_score) as avg_staff_efficiency,
    AVG(staff_quality_score) as avg_staff_quality,
    
    -- Compliance metrics
    AVG(compliance_score) as avg_compliance_score,
    SUM(safety_incidents) as total_safety_incidents,
    SUM(audit_findings) as total_audit_findings,
    
    -- Innovation metrics
    SUM(improvement_suggestions) as total_improvement_suggestions,
    SUM(innovations_implemented) as total_innovations,
    SUM(best_practices_shared) as total_best_practices_shared,
    
    -- Environmental metrics
    SUM(energy_consumption) as total_energy_consumption,
    SUM(water_usage) as total_water_usage,
    SUM(waste_generated) as total_waste_generated,
    SUM(recycling_amount) as total_recycling,
    
    -- Data quality
    AVG(data_completeness_score) as avg_data_completeness,
    MAX(last_updated_at) as last_data_update,
    
    COUNT(*) as record_count
FROM sop_bi_fact_table
GROUP BY restaurant_id, date_key;

-- Create unique index for materialized view
CREATE UNIQUE INDEX idx_bi_daily_summary_unique ON sop_bi_daily_operational_summary(restaurant_id, date_key);

-- Weekly trend analysis materialized view
CREATE MATERIALIZED VIEW sop_bi_weekly_trends AS
SELECT 
    restaurant_id,
    DATE_TRUNC('week', date_key) as week_start_date,
    EXTRACT(WEEK FROM date_key) as week_of_year,
    EXTRACT(YEAR FROM date_key) as year_key,
    
    -- Execution trends
    SUM(sop_executions_count) as weekly_executions,
    AVG(execution_success_rate) as avg_weekly_success_rate,
    
    -- Performance trends
    AVG(average_execution_time_minutes) as avg_weekly_execution_time,
    AVG(average_quality_score) as avg_weekly_quality,
    AVG(staff_efficiency_score) as avg_weekly_staff_efficiency,
    
    -- Customer trends
    AVG(average_customer_satisfaction) as avg_weekly_customer_satisfaction,
    SUM(customer_complaints) as weekly_complaints,
    SUM(customer_compliments) as weekly_compliments,
    
    -- Financial trends
    SUM(total_execution_cost) as weekly_total_cost,
    SUM(revenue_impact) as weekly_revenue_impact,
    SUM(cost_savings) as weekly_cost_savings,
    
    -- Efficiency ratios
    CASE WHEN SUM(total_execution_cost) > 0 
         THEN SUM(revenue_impact) / SUM(total_execution_cost) 
         ELSE 0 END as weekly_roi_ratio,
         
    -- Week-over-week changes (calculated in refresh function)
    0::DECIMAL as execution_change_pct,
    0::DECIMAL as success_rate_change_pct,
    0::DECIMAL as customer_satisfaction_change_pct,
    
    COUNT(DISTINCT date_key) as days_with_data,
    COUNT(*) as total_records
FROM sop_bi_fact_table
GROUP BY restaurant_id, DATE_TRUNC('week', date_key), EXTRACT(WEEK FROM date_key), EXTRACT(YEAR FROM date_key);

-- Create unique index for weekly trends
CREATE UNIQUE INDEX idx_bi_weekly_trends_unique ON sop_bi_weekly_trends(restaurant_id, week_start_date);

-- SOP performance ranking materialized view
CREATE MATERIALIZED VIEW sop_bi_sop_performance_ranking AS
SELECT 
    sbd.restaurant_id,
    sbd.sop_document_id,
    ssd.sop_title,
    ssd.category_name,
    ssd.department,
    
    -- Performance metrics
    SUM(sbd.sop_executions_count) as total_executions,
    AVG(sbd.execution_success_rate) as avg_success_rate,
    AVG(sbd.average_execution_time_minutes) as avg_execution_time,
    AVG(sbd.average_quality_score) as avg_quality_score,
    AVG(sbd.average_customer_satisfaction) as avg_customer_satisfaction,
    
    -- Efficiency metrics
    SUM(sbd.total_execution_cost) as total_cost,
    AVG(sbd.staff_efficiency_score) as avg_staff_efficiency,
    SUM(sbd.cost_savings) as total_cost_savings,
    
    -- Rankings
    ROW_NUMBER() OVER (PARTITION BY sbd.restaurant_id ORDER BY AVG(sbd.execution_success_rate) DESC) as success_rate_rank,
    ROW_NUMBER() OVER (PARTITION BY sbd.restaurant_id ORDER BY AVG(sbd.average_quality_score) DESC) as quality_rank,
    ROW_NUMBER() OVER (PARTITION BY sbd.restaurant_id ORDER BY AVG(sbd.average_customer_satisfaction) DESC) as customer_satisfaction_rank,
    ROW_NUMBER() OVER (PARTITION BY sbd.restaurant_id ORDER BY AVG(sbd.staff_efficiency_score) DESC) as efficiency_rank,
    
    -- Composite performance score
    (AVG(sbd.execution_success_rate) * 0.3 + 
     AVG(sbd.average_quality_score) * 0.25 + 
     AVG(sbd.average_customer_satisfaction) * 0.25 + 
     AVG(sbd.staff_efficiency_score) * 0.2) as composite_performance_score,
    
    -- Time range
    MIN(sbd.date_key) as analysis_start_date,
    MAX(sbd.date_key) as analysis_end_date,
    COUNT(DISTINCT sbd.date_key) as days_analyzed
    
FROM sop_bi_fact_table sbd
JOIN sop_bi_sop_dimension ssd ON sbd.sop_document_id = ssd.sop_id
WHERE sbd.date_key >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY sbd.restaurant_id, sbd.sop_document_id, ssd.sop_title, ssd.category_name, ssd.department
HAVING SUM(sbd.sop_executions_count) >= 10; -- Minimum executions for meaningful ranking

-- Create unique index for SOP performance ranking
CREATE UNIQUE INDEX idx_bi_sop_performance_unique ON sop_bi_sop_performance_ranking(restaurant_id, sop_document_id);

-- ===========================================
-- REPORTING VIEWS
-- ===========================================

-- Executive dashboard view
CREATE VIEW sop_bi_executive_dashboard AS
SELECT 
    ds.restaurant_id,
    r.name as restaurant_name,
    ds.date_key,
    dd.day_name,
    dd.is_weekend,
    dd.is_holiday,
    
    -- Key performance indicators
    ds.total_executions,
    ds.avg_success_rate,
    ds.avg_execution_time,
    ds.avg_quality_score,
    ds.avg_customer_satisfaction,
    ds.avg_staff_efficiency,
    
    -- Financial performance
    ds.total_cost,
    ds.total_revenue_impact,
    ds.total_cost_savings,
    CASE WHEN ds.total_cost > 0 
         THEN (ds.total_revenue_impact - ds.total_cost) / ds.total_cost * 100 
         ELSE 0 END as roi_percentage,
    
    -- Operational health
    ds.avg_compliance_score,
    ds.total_safety_incidents,
    ds.total_errors,
    ds.total_rework,
    
    -- Innovation metrics
    ds.total_improvement_suggestions,
    ds.total_innovations,
    ds.total_best_practices_shared,
    
    -- Sustainability metrics
    ds.total_energy_consumption,
    ds.total_water_usage,
    ds.total_waste_generated,
    ds.total_recycling,
    
    -- Performance indicators
    CASE WHEN ds.avg_success_rate >= 95 THEN 'Excellent'
         WHEN ds.avg_success_rate >= 85 THEN 'Good'
         WHEN ds.avg_success_rate >= 75 THEN 'Fair'
         ELSE 'Needs Improvement' END as success_rate_rating,
         
    CASE WHEN ds.avg_customer_satisfaction >= 90 THEN 'Excellent'
         WHEN ds.avg_customer_satisfaction >= 80 THEN 'Good'
         WHEN ds.avg_customer_satisfaction >= 70 THEN 'Fair'
         ELSE 'Needs Improvement' END as customer_satisfaction_rating
    
FROM sop_bi_daily_operational_summary ds
JOIN restaurants r ON ds.restaurant_id = r.id
JOIN sop_bi_date_dimension dd ON ds.date_key = dd.date_key
ORDER BY ds.restaurant_id, ds.date_key DESC;

-- Operational performance analysis view
CREATE VIEW sop_bi_operational_analysis AS
SELECT 
    ft.restaurant_id,
    ft.date_key,
    sd.sop_title,
    sd.category_name,
    sd.department,
    staff.display_name as staff_name,
    staff.current_role,
    
    -- Execution details
    ft.sop_executions_count,
    ft.successful_executions,
    ft.failed_executions,
    ft.execution_success_rate,
    
    -- Time analysis
    ft.average_execution_time_minutes,
    sd.estimated_duration_minutes as standard_time,
    CASE WHEN sd.estimated_duration_minutes > 0 
         THEN (ft.average_execution_time_minutes / sd.estimated_duration_minutes) * 100 
         ELSE 100 END as time_efficiency_percentage,
    
    -- Quality analysis
    ft.average_quality_score,
    ft.error_count,
    ft.rework_instances,
    ft.first_time_success_count,
    
    -- Staff performance
    ft.staff_efficiency_score,
    ft.staff_quality_score,
    staff.average_performance_score as staff_baseline_performance,
    
    -- Customer impact
    ft.customer_interactions_count,
    ft.average_customer_satisfaction,
    ft.customer_complaints,
    ft.customer_compliments,
    
    -- Cost analysis
    ft.total_execution_cost,
    ft.labor_cost,
    ft.material_cost,
    ft.overhead_cost,
    CASE WHEN ft.sop_executions_count > 0 
         THEN ft.total_execution_cost / ft.sop_executions_count 
         ELSE 0 END as cost_per_execution,
    
    -- Performance benchmarks
    CASE WHEN ft.execution_success_rate >= 95 THEN 'Above Target'
         WHEN ft.execution_success_rate >= 85 THEN 'On Target'
         WHEN ft.execution_success_rate >= 75 THEN 'Below Target'
         ELSE 'Critical' END as performance_status
    
FROM sop_bi_fact_table ft
JOIN sop_bi_sop_dimension sd ON ft.sop_document_id = sd.sop_id
LEFT JOIN sop_bi_staff_dimension staff ON ft.user_id = staff.user_id
WHERE ft.date_key >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ft.restaurant_id, ft.date_key DESC, ft.sop_executions_count DESC;

-- Trend analysis view
CREATE VIEW sop_bi_trend_analysis AS
WITH monthly_metrics AS (
    SELECT 
        restaurant_id,
        DATE_TRUNC('month', date_key) as month_start,
        EXTRACT(YEAR FROM date_key) as year_key,
        EXTRACT(MONTH FROM date_key) as month_key,
        
        AVG(avg_success_rate) as monthly_success_rate,
        AVG(avg_execution_time) as monthly_execution_time,
        AVG(avg_quality_score) as monthly_quality_score,
        AVG(avg_customer_satisfaction) as monthly_customer_satisfaction,
        SUM(total_cost) as monthly_total_cost,
        SUM(total_revenue_impact) as monthly_revenue_impact,
        AVG(avg_staff_efficiency) as monthly_staff_efficiency
    FROM sop_bi_daily_operational_summary
    GROUP BY restaurant_id, DATE_TRUNC('month', date_key), EXTRACT(YEAR FROM date_key), EXTRACT(MONTH FROM date_key)
)
SELECT 
    mm.restaurant_id,
    mm.month_start,
    mm.year_key,
    mm.month_key,
    
    -- Current month metrics
    mm.monthly_success_rate,
    mm.monthly_execution_time,
    mm.monthly_quality_score,
    mm.monthly_customer_satisfaction,
    mm.monthly_total_cost,
    mm.monthly_revenue_impact,
    mm.monthly_staff_efficiency,
    
    -- Month-over-month changes
    LAG(mm.monthly_success_rate) OVER (PARTITION BY mm.restaurant_id ORDER BY mm.month_start) as prev_month_success_rate,
    mm.monthly_success_rate - LAG(mm.monthly_success_rate) OVER (PARTITION BY mm.restaurant_id ORDER BY mm.month_start) as success_rate_change,
    
    LAG(mm.monthly_customer_satisfaction) OVER (PARTITION BY mm.restaurant_id ORDER BY mm.month_start) as prev_month_customer_satisfaction,
    mm.monthly_customer_satisfaction - LAG(mm.monthly_customer_satisfaction) OVER (PARTITION BY mm.restaurant_id ORDER BY mm.month_start) as customer_satisfaction_change,
    
    LAG(mm.monthly_total_cost) OVER (PARTITION BY mm.restaurant_id ORDER BY mm.month_start) as prev_month_cost,
    CASE WHEN LAG(mm.monthly_total_cost) OVER (PARTITION BY mm.restaurant_id ORDER BY mm.month_start) > 0 
         THEN ((mm.monthly_total_cost - LAG(mm.monthly_total_cost) OVER (PARTITION BY mm.restaurant_id ORDER BY mm.month_start)) / 
               LAG(mm.monthly_total_cost) OVER (PARTITION BY mm.restaurant_id ORDER BY mm.month_start)) * 100 
         ELSE 0 END as cost_change_percentage,
    
    -- ROI calculation
    CASE WHEN mm.monthly_total_cost > 0 
         THEN (mm.monthly_revenue_impact / mm.monthly_total_cost) * 100 
         ELSE 0 END as monthly_roi_percentage
    
FROM monthly_metrics mm
ORDER BY mm.restaurant_id, mm.month_start DESC;

-- ===========================================
-- DATA WAREHOUSE FUNCTIONS
-- ===========================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_bi_materialized_views()
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized views in dependency order
    REFRESH MATERIALIZED VIEW CONCURRENTLY sop_bi_daily_operational_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY sop_bi_weekly_trends;
    REFRESH MATERIALIZED VIEW CONCURRENTLY sop_bi_sop_performance_ranking;
    
    -- Update weekly trends with week-over-week calculations
    UPDATE sop_bi_weekly_trends wt1
    SET 
        execution_change_pct = CASE 
            WHEN wt2.weekly_executions > 0 
            THEN ((wt1.weekly_executions - wt2.weekly_executions)::DECIMAL / wt2.weekly_executions) * 100 
            ELSE 0 
        END,
        success_rate_change_pct = wt1.avg_weekly_success_rate - wt2.avg_weekly_success_rate,
        customer_satisfaction_change_pct = wt1.avg_weekly_customer_satisfaction - wt2.avg_weekly_customer_satisfaction
    FROM sop_bi_weekly_trends wt2
    WHERE wt1.restaurant_id = wt2.restaurant_id
      AND wt1.week_start_date = wt2.week_start_date + INTERVAL '1 week';
      
    RAISE NOTICE 'BI Materialized views refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to populate date dimension
CREATE OR REPLACE FUNCTION populate_date_dimension(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 year',
    end_date DATE DEFAULT CURRENT_DATE + INTERVAL '2 years'
)
RETURNS VOID AS $$
DECLARE
    current_date DATE;
BEGIN
    current_date := start_date;
    
    WHILE current_date <= end_date LOOP
        INSERT INTO sop_bi_date_dimension (
            date_key, day_name, day_of_week, day_of_month, day_of_year,
            week_of_year, week_of_month, week_start_date, week_end_date,
            month_name, month_of_year, month_start_date, month_end_date, days_in_month,
            quarter_name, quarter_of_year, quarter_start_date, quarter_end_date,
            year_key, year_start_date, year_end_date, is_leap_year,
            is_weekend, season
        ) VALUES (
            current_date,
            TO_CHAR(current_date, 'Day'),
            EXTRACT(DOW FROM current_date),
            EXTRACT(DAY FROM current_date),
            EXTRACT(DOY FROM current_date),
            EXTRACT(WEEK FROM current_date),
            EXTRACT(WEEK FROM current_date) - EXTRACT(WEEK FROM DATE_TRUNC('month', current_date)) + 1,
            DATE_TRUNC('week', current_date),
            DATE_TRUNC('week', current_date) + INTERVAL '6 days',
            TO_CHAR(current_date, 'Month'),
            EXTRACT(MONTH FROM current_date),
            DATE_TRUNC('month', current_date),
            (DATE_TRUNC('month', current_date) + INTERVAL '1 month - 1 day')::DATE,
            EXTRACT(DAYS FROM (DATE_TRUNC('month', current_date) + INTERVAL '1 month') - DATE_TRUNC('month', current_date)),
            'Q' || EXTRACT(QUARTER FROM current_date),
            EXTRACT(QUARTER FROM current_date),
            DATE_TRUNC('quarter', current_date),
            (DATE_TRUNC('quarter', current_date) + INTERVAL '3 months - 1 day')::DATE,
            EXTRACT(YEAR FROM current_date),
            DATE_TRUNC('year', current_date),
            (DATE_TRUNC('year', current_date) + INTERVAL '1 year - 1 day')::DATE,
            EXTRACT(YEAR FROM current_date) % 4 = 0 AND (EXTRACT(YEAR FROM current_date) % 100 != 0 OR EXTRACT(YEAR FROM current_date) % 400 = 0),
            EXTRACT(DOW FROM current_date) IN (0, 6),
            CASE EXTRACT(MONTH FROM current_date)
                WHEN 12 THEN 'winter'
                WHEN 1 THEN 'winter'
                WHEN 2 THEN 'winter'
                WHEN 3 THEN 'spring'
                WHEN 4 THEN 'spring'
                WHEN 5 THEN 'spring'
                WHEN 6 THEN 'summer'
                WHEN 7 THEN 'summer'
                WHEN 8 THEN 'summer'
                WHEN 9 THEN 'fall'
                WHEN 10 THEN 'fall'
                WHEN 11 THEN 'fall'
            END
        ) ON CONFLICT (date_key) DO NOTHING;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE 'Date dimension populated from % to %', start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate business intelligence metrics
CREATE OR REPLACE FUNCTION calculate_bi_metrics(
    p_restaurant_id UUID,
    p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value DECIMAL,
    metric_trend TEXT,
    benchmark_comparison TEXT,
    interpretation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH metrics_calculation AS (
        SELECT 
            'Overall Success Rate' as metric_name,
            AVG(execution_success_rate) as metric_value,
            CASE WHEN AVG(execution_success_rate) >= 90 THEN 'Excellent'
                 WHEN AVG(execution_success_rate) >= 80 THEN 'Good'
                 WHEN AVG(execution_success_rate) >= 70 THEN 'Fair'
                 ELSE 'Poor' END as benchmark,
            'Higher is better - target is 95%+' as interpretation
        FROM sop_bi_fact_table
        WHERE restaurant_id = p_restaurant_id
          AND date_key BETWEEN p_date_from AND p_date_to
        
        UNION ALL
        
        SELECT 
            'Customer Satisfaction Score',
            AVG(average_customer_satisfaction),
            CASE WHEN AVG(average_customer_satisfaction) >= 90 THEN 'Excellent'
                 WHEN AVG(average_customer_satisfaction) >= 80 THEN 'Good'
                 WHEN AVG(average_customer_satisfaction) >= 70 THEN 'Fair'
                 ELSE 'Poor' END,
            'Customer satisfaction on 0-100 scale - target is 85%+'
        FROM sop_bi_fact_table
        WHERE restaurant_id = p_restaurant_id
          AND date_key BETWEEN p_date_from AND p_date_to
          AND customer_interactions_count > 0
        
        UNION ALL
        
        SELECT 
            'Average ROI Percentage',
            AVG(CASE WHEN total_execution_cost > 0 
                     THEN (revenue_impact / total_execution_cost) * 100 
                     ELSE 0 END),
            CASE WHEN AVG(CASE WHEN total_execution_cost > 0 
                              THEN (revenue_impact / total_execution_cost) * 100 
                              ELSE 0 END) >= 150 THEN 'Excellent'
                 WHEN AVG(CASE WHEN total_execution_cost > 0 
                              THEN (revenue_impact / total_execution_cost) * 100 
                              ELSE 0 END) >= 120 THEN 'Good'
                 WHEN AVG(CASE WHEN total_execution_cost > 0 
                              THEN (revenue_impact / total_execution_cost) * 100 
                              ELSE 0 END) >= 100 THEN 'Fair'
                 ELSE 'Poor' END,
            'Return on investment - target is 150%+'
        FROM sop_bi_fact_table
        WHERE restaurant_id = p_restaurant_id
          AND date_key BETWEEN p_date_from AND p_date_to
          AND total_execution_cost > 0
        
        UNION ALL
        
        SELECT 
            'Staff Efficiency Score',
            AVG(staff_efficiency_score),
            CASE WHEN AVG(staff_efficiency_score) >= 85 THEN 'Excellent'
                 WHEN AVG(staff_efficiency_score) >= 75 THEN 'Good'
                 WHEN AVG(staff_efficiency_score) >= 65 THEN 'Fair'
                 ELSE 'Needs Improvement' END,
            'Staff efficiency on 0-100 scale - target is 80%+'
        FROM sop_bi_fact_table
        WHERE restaurant_id = p_restaurant_id
          AND date_key BETWEEN p_date_from AND p_date_to
          AND user_id IS NOT NULL
    )
    SELECT 
        mc.metric_name::TEXT,
        ROUND(mc.metric_value, 2) as metric_value,
        'Stable'::TEXT as metric_trend, -- Would need time-series analysis for actual trend
        mc.benchmark::TEXT as benchmark_comparison,
        mc.interpretation::TEXT
    FROM metrics_calculation mc
    WHERE mc.metric_value IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ===========================================

-- Fact table indexes
CREATE INDEX idx_bi_fact_restaurant_date ON sop_bi_fact_table(restaurant_id, date_key);
CREATE INDEX idx_bi_fact_sop_performance ON sop_bi_fact_table(sop_document_id, execution_success_rate);
CREATE INDEX idx_bi_fact_customer_satisfaction ON sop_bi_fact_table(average_customer_satisfaction) WHERE customer_interactions_count > 0;
CREATE INDEX idx_bi_fact_time_hierarchy ON sop_bi_fact_table(year_key, quarter_of_year, month_of_year, day_of_week);
CREATE INDEX idx_bi_fact_cost_analysis ON sop_bi_fact_table(total_execution_cost, revenue_impact);

-- Dimension table indexes
CREATE INDEX idx_bi_date_business_calendar ON sop_bi_date_dimension(is_business_day, is_weekend, is_holiday);
CREATE INDEX idx_bi_date_fiscal ON sop_bi_date_dimension(fiscal_year, fiscal_quarter, fiscal_month);
CREATE INDEX idx_bi_sop_category ON sop_bi_sop_dimension(category_id, department);
CREATE INDEX idx_bi_sop_characteristics ON sop_bi_sop_dimension(customer_facing, safety_critical, compliance_required);
CREATE INDEX idx_bi_staff_performance ON sop_bi_staff_dimension(current_role, average_performance_score);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on BI tables
ALTER TABLE sop_bi_fact_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_bi_sop_dimension ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_bi_staff_dimension ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "BI fact table restaurant access"
ON sop_bi_fact_table FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "BI SOP dimension restaurant access"
ON sop_bi_sop_dimension FOR ALL TO authenticated
USING (sop_id IN (SELECT id FROM sop_documents WHERE restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid())));

CREATE POLICY "BI staff dimension restaurant access"
ON sop_bi_staff_dimension FOR ALL TO authenticated
USING (user_id IN (SELECT id FROM auth_users WHERE restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid())));

-- ===========================================
-- AUTOMATED JOBS AND MAINTENANCE
-- ===========================================

-- Initialize date dimension
SELECT populate_date_dimension();

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_bi_fact_table IS 'Central fact table for SOP business intelligence with comprehensive operational, financial, and performance metrics';
COMMENT ON TABLE sop_bi_date_dimension IS 'Date dimension table with business calendar, fiscal periods, and seasonal attributes for time-based analysis';
COMMENT ON TABLE sop_bi_sop_dimension IS 'SOP dimension table with operational characteristics, performance baselines, and business impact classification';
COMMENT ON TABLE sop_bi_staff_dimension IS 'Staff dimension table with performance profiles, skills, and demographic attributes for people analytics';

COMMENT ON MATERIALIZED VIEW sop_bi_daily_operational_summary IS 'Daily aggregated operational metrics for fast dashboard queries and trend analysis';
COMMENT ON MATERIALIZED VIEW sop_bi_weekly_trends IS 'Weekly trend analysis with period-over-period comparisons and performance indicators';
COMMENT ON MATERIALIZED VIEW sop_bi_sop_performance_ranking IS 'SOP performance rankings with composite scores and multi-dimensional analysis';

COMMENT ON VIEW sop_bi_executive_dashboard IS 'Executive-level KPI dashboard with performance ratings and sustainability metrics';
COMMENT ON VIEW sop_bi_operational_analysis IS 'Detailed operational analysis view for managers with cost, quality, and efficiency breakdowns';
COMMENT ON VIEW sop_bi_trend_analysis IS 'Comprehensive trend analysis with month-over-month changes and ROI calculations';

-- Performance optimization
ANALYZE sop_bi_fact_table;
ANALYZE sop_bi_date_dimension;
ANALYZE sop_bi_sop_dimension;
ANALYZE sop_bi_staff_dimension;