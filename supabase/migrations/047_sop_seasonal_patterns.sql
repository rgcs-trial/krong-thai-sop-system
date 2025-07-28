-- Restaurant Krong Thai SOP Management System
-- SOP Seasonal Pattern Analysis
-- Migration 047: Seasonal trend detection and pattern analysis for operational optimization
-- Created: 2025-07-28

-- ===========================================
-- SEASONAL PATTERN ENUMS
-- ===========================================

-- Season types
CREATE TYPE season_type AS ENUM ('spring', 'summer', 'fall', 'winter');

-- Pattern frequencies
CREATE TYPE pattern_frequency AS ENUM (
    'daily', 'weekly', 'monthly', 'quarterly', 'seasonal', 'annual',
    'holiday', 'weekend', 'special_event'
);

-- Trend directions
CREATE TYPE trend_direction AS ENUM ('increasing', 'decreasing', 'stable', 'cyclical', 'volatile');

-- Business cycle phases
CREATE TYPE business_cycle AS ENUM ('peak', 'growth', 'decline', 'trough', 'recovery');

-- Pattern confidence levels
CREATE TYPE pattern_confidence AS ENUM ('low', 'medium', 'high', 'very_high');

-- ===========================================
-- SEASONAL PATTERN DETECTION TABLES
-- ===========================================

-- Seasonal business calendar and events
CREATE TABLE IF NOT EXISTS sop_seasonal_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Event identification
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100), -- 'holiday', 'promotion', 'season_start', 'local_event'
    event_category VARCHAR(100), -- 'religious', 'cultural', 'commercial', 'weather'
    
    -- Event timing
    event_date DATE,
    event_start_date DATE, -- For multi-day events
    event_end_date DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(100), -- 'annual', 'monthly', 'weekly'
    
    -- Business impact expectations
    expected_volume_change_percentage DECIMAL(8,4) DEFAULT 0,
    expected_revenue_change_percentage DECIMAL(8,4) DEFAULT 0,
    expected_cost_change_percentage DECIMAL(8,4) DEFAULT 0,
    expected_staffing_change_percentage DECIMAL(8,4) DEFAULT 0,
    
    -- Operational adjustments
    menu_changes_required BOOLEAN DEFAULT false,
    staffing_adjustments_required BOOLEAN DEFAULT false,
    inventory_adjustments_required BOOLEAN DEFAULT false,
    special_sops_required BOOLEAN DEFAULT false,
    
    -- Historical data
    historical_impact_data JSONB DEFAULT '{}', -- Previous years' actual impact
    trend_analysis JSONB DEFAULT '{}', -- Multi-year trend information
    
    -- Planning and preparation
    preparation_lead_time_days INTEGER DEFAULT 7,
    preparation_checklist JSONB DEFAULT '{}',
    responsible_team TEXT[],
    
    -- External factors
    weather_dependent BOOLEAN DEFAULT false,
    tourism_dependent BOOLEAN DEFAULT false,
    local_economy_dependent BOOLEAN DEFAULT false,
    competition_impact_factor DECIMAL(5,2) DEFAULT 0,
    
    -- Notes and description
    description TEXT,
    planning_notes TEXT,
    lessons_learned TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_seasonal_calendar_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_seasonal_calendar_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT valid_event_dates CHECK (event_end_date IS NULL OR event_end_date >= event_start_date)
);

-- SOP usage patterns by season and time periods
CREATE TABLE IF NOT EXISTS sop_seasonal_usage_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    sop_category_id UUID,
    
    -- Time period definition
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type pattern_frequency NOT NULL,
    season season_type,
    month_of_year INTEGER, -- 1-12
    week_of_year INTEGER, -- 1-53
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    hour_of_day INTEGER, -- 0-23
    
    -- Pattern period
    pattern_start_date DATE NOT NULL,
    pattern_end_date DATE NOT NULL,
    analysis_period_days INTEGER,
    
    -- Usage statistics
    total_usage_count INTEGER DEFAULT 0,
    average_daily_usage DECIMAL(8,2) DEFAULT 0,
    peak_usage_count INTEGER DEFAULT 0,
    minimum_usage_count INTEGER DEFAULT 0,
    usage_variance DECIMAL(8,4) DEFAULT 0,
    
    -- Performance metrics
    average_completion_time_minutes DECIMAL(8,2) DEFAULT 0,
    average_efficiency_score DECIMAL(5,2) DEFAULT 100,
    average_quality_score DECIMAL(5,2) DEFAULT 100,
    error_rate_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Timing patterns
    most_common_usage_hour INTEGER,
    least_common_usage_hour INTEGER,
    peak_usage_day_of_week INTEGER,
    off_peak_usage_day_of_week INTEGER,
    
    -- User behavior patterns
    unique_users_count INTEGER DEFAULT 0,
    repeat_usage_percentage DECIMAL(5,2) DEFAULT 0,
    user_experience_level_distribution JSONB DEFAULT '{}',
    training_frequency_correlation DECIMAL(8,4) DEFAULT 0,
    
    -- Business context correlation
    customer_volume_correlation DECIMAL(8,4) DEFAULT 0,
    revenue_correlation DECIMAL(8,4) DEFAULT 0,
    staffing_level_correlation DECIMAL(8,4) DEFAULT 0,
    menu_popularity_correlation DECIMAL(8,4) DEFAULT 0,
    
    -- Environmental factors
    weather_impact_correlation DECIMAL(8,4) DEFAULT 0,
    temperature_correlation DECIMAL(8,4) DEFAULT 0,
    season_transition_impact DECIMAL(8,4) DEFAULT 0,
    
    -- Trend analysis
    trend_direction trend_direction DEFAULT 'stable',
    growth_rate_percentage DECIMAL(8,4) DEFAULT 0,
    cyclical_pattern_detected BOOLEAN DEFAULT false,
    pattern_strength DECIMAL(5,2) DEFAULT 0, -- 0-100 strength of pattern
    
    -- Statistical significance
    confidence_level pattern_confidence DEFAULT 'medium',
    statistical_significance DECIMAL(8,6) DEFAULT 0, -- P-value
    sample_size_adequacy BOOLEAN DEFAULT true,
    data_quality_score DECIMAL(5,2) DEFAULT 100,
    
    -- Predictive indicators
    next_period_forecast DECIMAL(8,2) DEFAULT 0,
    forecast_confidence DECIMAL(5,2) DEFAULT 0,
    anomaly_detection_threshold DECIMAL(8,4) DEFAULT 0,
    
    -- Comparative analysis
    year_over_year_change DECIMAL(8,4) DEFAULT 0,
    benchmark_comparison DECIMAL(8,4) DEFAULT 0,
    peer_restaurant_comparison DECIMAL(8,4) DEFAULT 0,
    
    -- Pattern metadata
    pattern_discovery_method VARCHAR(100), -- 'statistical', 'ml_algorithm', 'manual'
    algorithm_used VARCHAR(100),
    model_accuracy DECIMAL(5,2) DEFAULT 0,
    last_updated_data_point DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_seasonal_usage_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_seasonal_usage_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_seasonal_usage_category FOREIGN KEY (sop_category_id) REFERENCES sop_categories(id),
    CONSTRAINT valid_pattern_dates CHECK (pattern_end_date >= pattern_start_date),
    CONSTRAINT valid_month_range CHECK (month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12)),
    CONSTRAINT valid_week_range CHECK (week_of_year IS NULL OR (week_of_year >= 1 AND week_of_year <= 53)),
    CONSTRAINT valid_day_range CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
    CONSTRAINT valid_hour_range CHECK (hour_of_day IS NULL OR (hour_of_day >= 0 AND hour_of_day <= 23))
);

-- Seasonal demand forecasting and capacity planning
CREATE TABLE IF NOT EXISTS sop_seasonal_forecasting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Forecast identification
    forecast_name VARCHAR(255) NOT NULL,
    forecast_type VARCHAR(100), -- 'demand', 'capacity', 'staffing', 'inventory'
    forecast_scope VARCHAR(100), -- 'restaurant', 'department', 'sop_category'
    target_entity_id UUID, -- ID of forecasted entity
    
    -- Forecast period
    forecast_start_date DATE NOT NULL,
    forecast_end_date DATE NOT NULL,
    forecast_horizon_days INTEGER,
    forecast_granularity VARCHAR(50) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
    
    -- Historical baseline
    baseline_period_start DATE,
    baseline_period_end DATE,
    baseline_average DECIMAL(12,4) DEFAULT 0,
    baseline_trend DECIMAL(8,4) DEFAULT 0,
    seasonal_adjustment_factor DECIMAL(8,4) DEFAULT 1.0,
    
    -- Forecast models and algorithms
    primary_model VARCHAR(100), -- 'seasonal_naive', 'exponential_smoothing', 'arima', 'ml_ensemble'
    model_parameters JSONB DEFAULT '{}',
    ensemble_weights JSONB DEFAULT '{}', -- Weights for multiple models
    external_factors JSONB DEFAULT '{}', -- Economic, weather, event factors
    
    -- Forecast results
    forecast_values JSONB NOT NULL, -- Date -> forecasted value mapping
    confidence_intervals JSONB DEFAULT '{}', -- Date -> {lower, upper} confidence bounds
    prediction_intervals JSONB DEFAULT '{}', -- Prediction intervals for planning
    
    -- Accuracy and validation
    model_accuracy_percentage DECIMAL(5,2) DEFAULT 0,
    mean_absolute_error DECIMAL(12,4) DEFAULT 0,
    mean_squared_error DECIMAL(15,6) DEFAULT 0,
    bias_percentage DECIMAL(8,4) DEFAULT 0,
    
    -- Seasonal components
    trend_component JSONB DEFAULT '{}', -- Long-term trend values
    seasonal_component JSONB DEFAULT '{}', -- Seasonal pattern values
    irregular_component JSONB DEFAULT '{}', -- Random/irregular variations
    
    -- Business impact projections
    projected_revenue_impact DECIMAL(12,2) DEFAULT 0,
    projected_cost_impact DECIMAL(12,2) DEFAULT 0,
    projected_staffing_needs INTEGER DEFAULT 0,
    projected_capacity_utilization DECIMAL(5,2) DEFAULT 0,
    
    -- Risk analysis
    upside_risk_percentage DECIMAL(5,2) DEFAULT 0, -- Risk of exceeding forecast
    downside_risk_percentage DECIMAL(5,2) DEFAULT 0, -- Risk of falling short
    scenario_analysis JSONB DEFAULT '{}', -- Best/worst/most likely scenarios
    sensitivity_analysis JSONB DEFAULT '{}', -- Sensitivity to key variables
    
    -- Planning recommendations
    capacity_recommendations JSONB DEFAULT '{}',
    staffing_recommendations JSONB DEFAULT '{}',
    inventory_recommendations JSONB DEFAULT '{}',
    operational_adjustments JSONB DEFAULT '{}',
    
    -- Model monitoring
    forecast_start_accuracy DECIMAL(5,2) DEFAULT 0,
    drift_detection_score DECIMAL(5,2) DEFAULT 0,
    retraining_recommended BOOLEAN DEFAULT false,
    last_validation_date DATE,
    
    -- Forecast metadata
    generated_by UUID,
    generation_time_seconds DECIMAL(8,3),
    data_sources_used TEXT[],
    assumptions_made TEXT[],
    limitations TEXT[],
    
    -- Approval and usage
    approved_by UUID,
    approval_date DATE,
    is_active_forecast BOOLEAN DEFAULT true,
    superseded_by UUID, -- Reference to newer forecast
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_seasonal_forecast_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_seasonal_forecast_generated_by FOREIGN KEY (generated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_seasonal_forecast_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_seasonal_forecast_superseded_by FOREIGN KEY (superseded_by) REFERENCES sop_seasonal_forecasting(id),
    CONSTRAINT valid_forecast_dates CHECK (forecast_end_date >= forecast_start_date),
    CONSTRAINT valid_baseline_dates CHECK (baseline_period_end IS NULL OR baseline_period_end >= baseline_period_start)
);

-- Holiday and special event impact analysis
CREATE TABLE IF NOT EXISTS sop_holiday_impact_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    calendar_event_id UUID,
    
    -- Holiday/event identification
    holiday_name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(100), -- 'national', 'religious', 'cultural', 'local', 'promotional'
    holiday_duration_days INTEGER DEFAULT 1,
    
    -- Analysis period
    analysis_year INTEGER NOT NULL,
    pre_holiday_analysis_days INTEGER DEFAULT 7,
    post_holiday_analysis_days INTEGER DEFAULT 7,
    comparison_period_start DATE,
    comparison_period_end DATE,
    
    -- Business volume impact
    baseline_daily_volume DECIMAL(10,2) DEFAULT 0,
    holiday_period_volume DECIMAL(10,2) DEFAULT 0,
    volume_change_percentage DECIMAL(8,4) DEFAULT 0,
    peak_day_volume DECIMAL(10,2) DEFAULT 0,
    
    -- Revenue impact
    baseline_daily_revenue DECIMAL(12,2) DEFAULT 0,
    holiday_period_revenue DECIMAL(12,2) DEFAULT 0,
    revenue_change_percentage DECIMAL(8,4) DEFAULT 0,
    revenue_per_customer_change DECIMAL(8,4) DEFAULT 0,
    
    -- SOP usage patterns
    most_used_sops_holiday JSONB DEFAULT '{}', -- SOP ID -> usage count
    least_used_sops_holiday JSONB DEFAULT '{}',
    sop_efficiency_changes JSONB DEFAULT '{}', -- SOP ID -> efficiency change %
    new_sop_requirements JSONB DEFAULT '{}', -- Special SOPs needed
    
    -- Operational metrics
    average_service_time_change DECIMAL(8,4) DEFAULT 0,
    customer_satisfaction_change DECIMAL(8,4) DEFAULT 0,
    staff_productivity_change DECIMAL(8,4) DEFAULT 0,
    quality_score_change DECIMAL(8,4) DEFAULT 0,
    
    -- Staffing impact
    baseline_staff_count INTEGER DEFAULT 0,
    holiday_staff_count INTEGER DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    temporary_staff_hired INTEGER DEFAULT 0,
    staff_efficiency_change DECIMAL(8,4) DEFAULT 0,
    
    -- Cost analysis
    additional_labor_cost DECIMAL(10,2) DEFAULT 0,
    additional_material_cost DECIMAL(10,2) DEFAULT 0,
    additional_overhead_cost DECIMAL(10,2) DEFAULT 0,
    total_additional_cost DECIMAL(12,2) DEFAULT 0,
    cost_per_additional_customer DECIMAL(8,4) DEFAULT 0,
    
    -- Menu and product analysis
    menu_mix_changes JSONB DEFAULT '{}', -- Item -> volume change
    top_performing_items JSONB DEFAULT '{}',
    underperforming_items JSONB DEFAULT '{}',
    special_menu_impact JSONB DEFAULT '{}',
    
    -- Customer behavior analysis
    customer_demographics_shift JSONB DEFAULT '{}',
    ordering_pattern_changes JSONB DEFAULT '{}',
    payment_method_changes JSONB DEFAULT '{}',
    repeat_customer_rate_change DECIMAL(8,4) DEFAULT 0,
    
    -- Preparation effectiveness
    preparation_lead_time_actual_days INTEGER DEFAULT 0,
    preparation_completeness_score DECIMAL(5,2) DEFAULT 100,
    inventory_adequacy_score DECIMAL(5,2) DEFAULT 100,
    staff_readiness_score DECIMAL(5,2) DEFAULT 100,
    
    -- Comparative analysis
    previous_year_comparison DECIMAL(8,4) DEFAULT 0,
    industry_benchmark_comparison DECIMAL(8,4) DEFAULT 0,
    regional_performance_comparison DECIMAL(8,4) DEFAULT 0,
    
    -- Success metrics
    overall_success_score DECIMAL(5,2) DEFAULT 0, -- 0-100 composite score
    customer_experience_score DECIMAL(5,2) DEFAULT 0,
    operational_efficiency_score DECIMAL(5,2) DEFAULT 0,
    financial_performance_score DECIMAL(5,2) DEFAULT 0,
    
    -- Lessons learned and recommendations
    what_worked_well TEXT[],
    areas_for_improvement TEXT[],
    recommended_changes_next_year TEXT[],
    process_improvements TEXT[],
    
    -- Risk factors identified
    capacity_constraints_hit BOOLEAN DEFAULT false,
    quality_compromises_made BOOLEAN DEFAULT false,
    staff_burnout_indicators BOOLEAN DEFAULT false,
    customer_complaints_increased BOOLEAN DEFAULT false,
    
    -- Future planning insights
    capacity_expansion_needed BOOLEAN DEFAULT false,
    additional_training_required BOOLEAN DEFAULT false,
    menu_optimization_opportunities TEXT[],
    technology_improvement_needs TEXT[],
    
    analyzed_by UUID,
    analysis_completion_date DATE,
    analysis_confidence_level pattern_confidence DEFAULT 'medium',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_holiday_impact_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_holiday_impact_calendar FOREIGN KEY (calendar_event_id) REFERENCES sop_seasonal_calendar(id),
    CONSTRAINT fk_holiday_impact_analyzed_by FOREIGN KEY (analyzed_by) REFERENCES auth_users(id),
    CONSTRAINT unique_holiday_analysis UNIQUE (restaurant_id, holiday_name, analysis_year)
);

-- Weather and seasonal condition impact tracking
CREATE TABLE IF NOT EXISTS sop_weather_impact_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Weather data
    weather_date DATE NOT NULL,
    temperature_high_celsius DECIMAL(6,2),
    temperature_low_celsius DECIMAL(6,2),
    temperature_average_celsius DECIMAL(6,2),
    humidity_percentage DECIMAL(5,2),
    precipitation_mm DECIMAL(8,2),
    wind_speed_kmh DECIMAL(6,2),
    weather_condition VARCHAR(100), -- 'sunny', 'rainy', 'snowy', 'cloudy', 'stormy'
    
    -- Seasonal context
    season season_type,
    days_into_season INTEGER,
    season_typical_weather BOOLEAN DEFAULT true,
    weather_anomaly_score DECIMAL(5,2) DEFAULT 0, -- 0-100, higher = more unusual
    
    -- Business metrics for the day
    customer_count INTEGER DEFAULT 0,
    revenue_amount DECIMAL(12,2) DEFAULT 0,
    average_order_value DECIMAL(8,2) DEFAULT 0,
    delivery_vs_dine_in_ratio DECIMAL(5,2) DEFAULT 0,
    
    -- SOP usage impact
    indoor_sop_usage_change DECIMAL(8,4) DEFAULT 0, -- % change from baseline
    outdoor_sop_usage_change DECIMAL(8,4) DEFAULT 0,
    delivery_sop_usage_change DECIMAL(8,4) DEFAULT 0,
    cleaning_sop_usage_change DECIMAL(8,4) DEFAULT 0,
    
    -- Operational impact
    service_time_change_minutes DECIMAL(8,2) DEFAULT 0,
    staff_productivity_change DECIMAL(8,4) DEFAULT 0,
    energy_consumption_change DECIMAL(8,4) DEFAULT 0,
    supply_delivery_delays INTEGER DEFAULT 0,
    
    -- Customer behavior impact
    reservation_cancellation_rate DECIMAL(5,2) DEFAULT 0,
    walk_in_vs_reservation_ratio DECIMAL(5,2) DEFAULT 0,
    customer_dwell_time_change DECIMAL(8,4) DEFAULT 0,
    customer_satisfaction_impact DECIMAL(8,4) DEFAULT 0,
    
    -- Menu and product impact
    hot_beverage_sales_change DECIMAL(8,4) DEFAULT 0,
    cold_beverage_sales_change DECIMAL(8,4) DEFAULT 0,
    seasonal_item_sales_change DECIMAL(8,4) DEFAULT 0,
    comfort_food_sales_change DECIMAL(8,4) DEFAULT 0,
    
    -- Cost implications
    heating_cooling_cost_change DECIMAL(8,2) DEFAULT 0,
    transportation_cost_change DECIMAL(8,2) DEFAULT 0,
    waste_cost_change DECIMAL(8,2) DEFAULT 0,
    insurance_claims DECIMAL(10,2) DEFAULT 0,
    
    -- Staff impact
    staff_absenteeism_rate DECIMAL(5,2) DEFAULT 0,
    commute_time_impact_minutes DECIMAL(6,2) DEFAULT 0,
    staff_morale_impact_score DECIMAL(5,2) DEFAULT 0, -- -100 to +100
    overtime_hours_weather_related DECIMAL(8,2) DEFAULT 0,
    
    -- Preparation and response
    weather_preparation_score DECIMAL(5,2) DEFAULT 100, -- How well prepared (0-100)
    contingency_plans_activated TEXT[],
    emergency_procedures_used TEXT[],
    communication_effectiveness_score DECIMAL(5,2) DEFAULT 100,
    
    -- Predictive indicators
    forecast_accuracy DECIMAL(5,2) DEFAULT 0, -- How accurate was the forecast
    early_warning_effectiveness DECIMAL(5,2) DEFAULT 0,
    response_time_minutes INTEGER DEFAULT 0,
    
    -- Correlations with other factors
    event_correlation BOOLEAN DEFAULT false, -- Did weather coincide with events
    competitor_impact_differential DECIMAL(8,4) DEFAULT 0,
    regional_business_impact DECIMAL(8,4) DEFAULT 0,
    
    -- Data sources
    weather_data_source VARCHAR(100), -- 'weather_api', 'local_station', 'manual'
    business_data_source VARCHAR(100),
    data_quality_score DECIMAL(5,2) DEFAULT 100,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_weather_impact_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_weather_tracking_date UNIQUE (restaurant_id, weather_date)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Seasonal calendar indexes
CREATE INDEX idx_seasonal_calendar_restaurant ON sop_seasonal_calendar(restaurant_id);
CREATE INDEX idx_seasonal_calendar_date ON sop_seasonal_calendar(event_date);
CREATE INDEX idx_seasonal_calendar_type ON sop_seasonal_calendar(event_type);
CREATE INDEX idx_seasonal_calendar_active ON sop_seasonal_calendar(is_active) WHERE is_active = true;

-- Seasonal usage patterns indexes
CREATE INDEX idx_seasonal_usage_restaurant_sop ON sop_seasonal_usage_patterns(restaurant_id, sop_document_id);
CREATE INDEX idx_seasonal_usage_pattern_type ON sop_seasonal_usage_patterns(pattern_type);
CREATE INDEX idx_seasonal_usage_season ON sop_seasonal_usage_patterns(season);
CREATE INDEX idx_seasonal_usage_period ON sop_seasonal_usage_patterns(pattern_start_date, pattern_end_date);
CREATE INDEX idx_seasonal_usage_confidence ON sop_seasonal_usage_patterns(confidence_level);

-- Seasonal forecasting indexes
CREATE INDEX idx_seasonal_forecast_restaurant ON sop_seasonal_forecasting(restaurant_id);
CREATE INDEX idx_seasonal_forecast_type ON sop_seasonal_forecasting(forecast_type);
CREATE INDEX idx_seasonal_forecast_period ON sop_seasonal_forecasting(forecast_start_date, forecast_end_date);
CREATE INDEX idx_seasonal_forecast_active ON sop_seasonal_forecasting(is_active_forecast) WHERE is_active_forecast = true;

-- Holiday impact analysis indexes
CREATE INDEX idx_holiday_impact_restaurant ON sop_holiday_impact_analysis(restaurant_id);
CREATE INDEX idx_holiday_impact_date ON sop_holiday_impact_analysis(holiday_date);
CREATE INDEX idx_holiday_impact_type ON sop_holiday_impact_analysis(holiday_type);
CREATE INDEX idx_holiday_impact_year ON sop_holiday_impact_analysis(analysis_year);

-- Weather impact tracking indexes
CREATE INDEX idx_weather_impact_restaurant ON sop_weather_impact_tracking(restaurant_id);
CREATE INDEX idx_weather_impact_date ON sop_weather_impact_tracking(weather_date);
CREATE INDEX idx_weather_impact_season ON sop_weather_impact_tracking(season);
CREATE INDEX idx_weather_impact_condition ON sop_weather_impact_tracking(weather_condition);

-- Composite indexes for time-series analysis
CREATE INDEX idx_seasonal_usage_time_series ON sop_seasonal_usage_patterns(restaurant_id, pattern_start_date, pattern_type, sop_document_id);
CREATE INDEX idx_weather_business_correlation ON sop_weather_impact_tracking(restaurant_id, weather_date, customer_count, revenue_amount);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on seasonal pattern tables
ALTER TABLE sop_seasonal_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_seasonal_usage_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_seasonal_forecasting ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_holiday_impact_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_weather_impact_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Seasonal calendar restaurant access"
ON sop_seasonal_calendar FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Seasonal usage patterns restaurant access"
ON sop_seasonal_usage_patterns FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Seasonal forecasting restaurant access"
ON sop_seasonal_forecasting FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Holiday impact analysis restaurant access"
ON sop_holiday_impact_analysis FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Weather impact tracking restaurant access"
ON sop_weather_impact_tracking FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_seasonal_calendar_updated_at 
    BEFORE UPDATE ON sop_seasonal_calendar 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_seasonal_forecasting_updated_at 
    BEFORE UPDATE ON sop_seasonal_forecasting 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SEASONAL ANALYSIS FUNCTIONS
-- ===========================================

-- Function to detect seasonal patterns in SOP usage
CREATE OR REPLACE FUNCTION detect_seasonal_pattern(
    p_restaurant_id UUID,
    p_sop_document_id UUID,
    p_analysis_start_date DATE,
    p_analysis_end_date DATE
)
RETURNS TABLE (
    pattern_type TEXT,
    pattern_strength DECIMAL,
    peak_period TEXT,
    seasonal_factor DECIMAL
) AS $$
DECLARE
    total_days INTEGER;
    seasonal_variance DECIMAL;
    daily_average DECIMAL;
BEGIN
    total_days := p_analysis_end_date - p_analysis_start_date + 1;
    
    RETURN QUERY
    WITH daily_usage AS (
        SELECT 
            DATE_TRUNC('day', ui.interaction_timestamp)::date as usage_date,
            COUNT(*) as daily_count,
            EXTRACT(month FROM ui.interaction_timestamp) as month_num,
            EXTRACT(dow FROM ui.interaction_timestamp) as day_of_week
        FROM sop_user_interactions ui
        WHERE ui.restaurant_id = p_restaurant_id
          AND ui.sop_document_id = p_sop_document_id
          AND ui.interaction_timestamp::date BETWEEN p_analysis_start_date AND p_analysis_end_date
          AND ui.interaction_type = 'view'
        GROUP BY DATE_TRUNC('day', ui.interaction_timestamp), 
                 EXTRACT(month FROM ui.interaction_timestamp),
                 EXTRACT(dow FROM ui.interaction_timestamp)
    ),
    monthly_patterns AS (
        SELECT 
            month_num,
            AVG(daily_count) as avg_monthly_usage,
            STDDEV(daily_count) as stddev_monthly_usage
        FROM daily_usage
        GROUP BY month_num
    ),
    weekly_patterns AS (
        SELECT 
            day_of_week,
            AVG(daily_count) as avg_weekly_usage,
            STDDEV(daily_count) as stddev_weekly_usage
        FROM daily_usage
        GROUP BY day_of_week
    )
    SELECT 
        'monthly'::TEXT as pattern_type,
        COALESCE(STDDEV(mp.avg_monthly_usage) / NULLIF(AVG(mp.avg_monthly_usage), 0) * 100, 0) as pattern_strength,
        (SELECT month_num::TEXT FROM monthly_patterns ORDER BY avg_monthly_usage DESC LIMIT 1) as peak_period,
        COALESCE(MAX(mp.avg_monthly_usage) / NULLIF(AVG(mp.avg_monthly_usage), 0), 1) as seasonal_factor
    FROM monthly_patterns mp
    
    UNION ALL
    
    SELECT 
        'weekly'::TEXT as pattern_type,
        COALESCE(STDDEV(wp.avg_weekly_usage) / NULLIF(AVG(wp.avg_weekly_usage), 0) * 100, 0) as pattern_strength,
        (SELECT 
            CASE day_of_week 
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END
         FROM weekly_patterns ORDER BY avg_weekly_usage DESC LIMIT 1) as peak_period,
        COALESCE(MAX(wp.avg_weekly_usage) / NULLIF(AVG(wp.avg_weekly_usage), 0), 1) as seasonal_factor
    FROM weekly_patterns wp;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate weather impact correlation
CREATE OR REPLACE FUNCTION calculate_weather_impact_correlation(
    p_restaurant_id UUID,
    p_weather_parameter VARCHAR,
    p_business_metric VARCHAR,
    p_days_back INTEGER DEFAULT 90
)
RETURNS DECIMAL AS $$
DECLARE
    correlation_coefficient DECIMAL DEFAULT 0;
BEGIN
    -- Calculate Pearson correlation coefficient between weather and business metrics
    WITH weather_business_data AS (
        SELECT 
            wit.weather_date,
            CASE p_weather_parameter
                WHEN 'temperature' THEN wit.temperature_average_celsius
                WHEN 'humidity' THEN wit.humidity_percentage
                WHEN 'precipitation' THEN wit.precipitation_mm
                WHEN 'wind_speed' THEN wit.wind_speed_kmh
                ELSE 0
            END as weather_value,
            CASE p_business_metric
                WHEN 'customer_count' THEN wit.customer_count::DECIMAL
                WHEN 'revenue' THEN wit.revenue_amount
                WHEN 'service_time' THEN wit.service_time_change_minutes
                ELSE 0
            END as business_value
        FROM sop_weather_impact_tracking wit
        WHERE wit.restaurant_id = p_restaurant_id
          AND wit.weather_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
          AND CASE p_weather_parameter
                WHEN 'temperature' THEN wit.temperature_average_celsius IS NOT NULL
                WHEN 'humidity' THEN wit.humidity_percentage IS NOT NULL
                WHEN 'precipitation' THEN wit.precipitation_mm IS NOT NULL
                WHEN 'wind_speed' THEN wit.wind_speed_kmh IS NOT NULL
                ELSE true
              END
    )
    SELECT 
        COALESCE(
            CORR(weather_value, business_value), 
            0
        )
    INTO correlation_coefficient
    FROM weather_business_data
    WHERE weather_value IS NOT NULL 
      AND business_value IS NOT NULL;
    
    RETURN ROUND(correlation_coefficient, 4);
END;
$$ LANGUAGE plpgsql;

-- Function to generate seasonal forecast
CREATE OR REPLACE FUNCTION generate_seasonal_forecast(
    p_restaurant_id UUID,
    p_forecast_type VARCHAR,
    p_forecast_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    forecast_date DATE,
    forecast_value DECIMAL,
    confidence_lower DECIMAL,
    confidence_upper DECIMAL
) AS $$
BEGIN
    -- Simple seasonal naive forecast (can be enhanced with more sophisticated models)
    RETURN QUERY
    WITH historical_data AS (
        SELECT 
            EXTRACT(month FROM wit.weather_date) as month_num,
            EXTRACT(day FROM wit.weather_date) as day_num,
            AVG(
                CASE p_forecast_type
                    WHEN 'customer_count' THEN wit.customer_count::DECIMAL
                    WHEN 'revenue' THEN wit.revenue_amount
                    ELSE 0
                END
            ) as avg_value,
            STDDEV(
                CASE p_forecast_type
                    WHEN 'customer_count' THEN wit.customer_count::DECIMAL
                    WHEN 'revenue' THEN wit.revenue_amount
                    ELSE 0
                END
            ) as stddev_value
        FROM sop_weather_impact_tracking wit
        WHERE wit.restaurant_id = p_restaurant_id
          AND wit.weather_date >= CURRENT_DATE - INTERVAL '2 years'
        GROUP BY EXTRACT(month FROM wit.weather_date), EXTRACT(day FROM wit.weather_date)
    ),
    forecast_dates AS (
        SELECT 
            (CURRENT_DATE + INTERVAL '1 day' * generate_series(1, p_forecast_days))::date as future_date
    )
    SELECT 
        fd.future_date as forecast_date,
        COALESCE(hd.avg_value, 0) as forecast_value,
        COALESCE(hd.avg_value - 1.96 * hd.stddev_value, 0) as confidence_lower,
        COALESCE(hd.avg_value + 1.96 * hd.stddev_value, hd.avg_value) as confidence_upper
    FROM forecast_dates fd
    LEFT JOIN historical_data hd ON (
        EXTRACT(month FROM fd.future_date) = hd.month_num AND
        EXTRACT(day FROM fd.future_date) = hd.day_num
    )
    ORDER BY fd.future_date;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_seasonal_calendar IS 'Business calendar with seasonal events and their expected operational impact';
COMMENT ON TABLE sop_seasonal_usage_patterns IS 'Detected seasonal patterns in SOP usage with statistical analysis and trend identification';
COMMENT ON TABLE sop_seasonal_forecasting IS 'Seasonal demand forecasting with multiple models and confidence intervals for capacity planning';
COMMENT ON TABLE sop_holiday_impact_analysis IS 'Comprehensive analysis of holiday and special event impact on operations and performance';
COMMENT ON TABLE sop_weather_impact_tracking IS 'Weather conditions correlation with business metrics and operational adjustments';

-- Performance optimization
ANALYZE sop_seasonal_calendar;
ANALYZE sop_seasonal_usage_patterns;
ANALYZE sop_seasonal_forecasting;
ANALYZE sop_holiday_impact_analysis;
ANALYZE sop_weather_impact_tracking;