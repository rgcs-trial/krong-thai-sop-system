-- Restaurant Krong Thai SOP Management System
-- SOP Performance Analytics Aggregation
-- Migration 038: Performance analytics aggregation views and tables
-- Created: 2025-07-28

-- ===========================================
-- PERFORMANCE AGGREGATION ENUMS
-- ===========================================

-- Aggregation periods
CREATE TYPE aggregation_period AS ENUM (
    'hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
);

-- Performance metrics types
CREATE TYPE performance_metric_type AS ENUM (
    'completion_time', 'success_rate', 'error_rate', 'quality_score',
    'efficiency_rating', 'user_satisfaction', 'cost_effectiveness',
    'training_effectiveness', 'compliance_score'
);

-- ===========================================
-- PERFORMANCE AGGREGATION TABLES
-- ===========================================

-- SOP performance aggregates table
CREATE TABLE IF NOT EXISTS sop_performance_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    sop_category_id UUID,
    user_id UUID,
    
    -- Aggregation metadata
    metric_type performance_metric_type NOT NULL,
    aggregation_period aggregation_period NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Core performance metrics
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
    
    -- Time-based metrics
    avg_completion_time_seconds DECIMAL(10,2),
    min_completion_time_seconds DECIMAL(10,2),
    max_completion_time_seconds DECIMAL(10,2),
    median_completion_time_seconds DECIMAL(10,2),
    std_dev_completion_time DECIMAL(10,2),
    
    -- Quality metrics
    avg_quality_score DECIMAL(4,2), -- 1-10 scale
    quality_trend DECIMAL(6,3), -- % change from previous period
    compliance_violations INTEGER DEFAULT 0,
    compliance_rate DECIMAL(5,2) DEFAULT 100,
    
    -- Efficiency metrics
    avg_efficiency_rating DECIMAL(4,2), -- 1-10 scale
    resource_utilization DECIMAL(5,2), -- Percentage
    cost_per_execution DECIMAL(10,2),
    time_saved_vs_standard DECIMAL(10,2), -- Seconds
    
    -- User engagement metrics
    unique_users_count INTEGER DEFAULT 0,
    avg_user_satisfaction DECIMAL(4,2), -- 1-10 scale
    user_feedback_count INTEGER DEFAULT 0,
    training_requests INTEGER DEFAULT 0,
    
    -- Error analysis
    most_common_error_type TEXT,
    error_frequency JSONB DEFAULT '{}', -- Error type -> count mapping
    error_resolution_time_avg DECIMAL(10,2), -- Average time to resolve errors
    
    -- Comparative metrics
    performance_vs_baseline DECIMAL(6,3), -- % difference from baseline
    performance_vs_previous_period DECIMAL(6,3), -- % change
    percentile_rank DECIMAL(5,2), -- Performance percentile (0-100)
    
    -- Advanced analytics
    seasonal_factor DECIMAL(6,3) DEFAULT 1.0, -- Seasonal adjustment factor
    trend_direction VARCHAR(20) DEFAULT 'stable', -- 'improving', 'declining', 'stable'
    anomaly_score DECIMAL(5,4) DEFAULT 0, -- 0-1, higher = more anomalous
    prediction_accuracy DECIMAL(5,2), -- How accurate were predictions for this period
    
    -- Data quality
    data_completeness DECIMAL(5,2) DEFAULT 100, -- % of expected data points
    confidence_interval_lower DECIMAL(10,4),
    confidence_interval_upper DECIMAL(10,4),
    sample_size INTEGER NOT NULL DEFAULT 0,
    statistical_significance BOOLEAN DEFAULT false,
    
    -- Metadata
    aggregation_method VARCHAR(50) DEFAULT 'weighted_average',
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_duration_ms INTEGER DEFAULT 0,
    data_sources TEXT[] DEFAULT '{}', -- Source tables used
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_perf_agg_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_agg_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_agg_sop_category FOREIGN KEY (sop_category_id) REFERENCES sop_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_agg_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
    
    -- Unique constraint to prevent duplicate aggregations
    CONSTRAINT unique_performance_aggregate UNIQUE (
        restaurant_id, sop_document_id, sop_category_id, user_id, 
        metric_type, aggregation_period, period_start
    )
);

-- SOP performance trends table for time-series analysis
CREATE TABLE IF NOT EXISTS sop_performance_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    
    -- Trend identification
    trend_name VARCHAR(255) NOT NULL,
    trend_type VARCHAR(50) NOT NULL, -- 'linear', 'exponential', 'cyclical', 'seasonal'
    metric_name VARCHAR(100) NOT NULL,
    
    -- Trend parameters
    trend_start_date DATE NOT NULL,
    trend_end_date DATE,
    trend_slope DECIMAL(10,6), -- Rate of change
    trend_intercept DECIMAL(10,4),
    correlation_coefficient DECIMAL(6,4), -- R-squared value
    
    -- Statistical measures
    confidence_level DECIMAL(5,2) DEFAULT 95.0,
    p_value DECIMAL(10,8),
    standard_error DECIMAL(10,6),
    
    -- Forecasting
    next_period_forecast DECIMAL(10,4),
    forecast_confidence_interval JSONB DEFAULT '{}',
    forecast_accuracy_history DECIMAL(5,2), -- % accuracy of past forecasts
    
    -- Business impact
    impact_assessment TEXT,
    impact_severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    recommended_actions JSONB DEFAULT '{}',
    
    -- Trend status
    is_active BOOLEAN DEFAULT true,
    is_significant BOOLEAN DEFAULT false,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_perf_trend_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_trend_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_trend_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Performance baselines for comparison
CREATE TABLE IF NOT EXISTS sop_performance_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    sop_category_id UUID,
    
    -- Baseline identification
    baseline_name VARCHAR(255) NOT NULL,
    baseline_type VARCHAR(50) NOT NULL, -- 'historical', 'target', 'industry', 'best_practice'
    metric_type performance_metric_type NOT NULL,
    
    -- Baseline values
    baseline_value DECIMAL(10,4) NOT NULL,
    acceptable_range_min DECIMAL(10,4),
    acceptable_range_max DECIMAL(10,4),
    target_value DECIMAL(10,4),
    
    -- Context
    baseline_period_start DATE,
    baseline_period_end DATE,
    data_points_count INTEGER DEFAULT 0,
    calculation_method TEXT,
    
    -- Validation
    is_validated BOOLEAN DEFAULT false,
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    validation_notes TEXT,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    review_frequency_days INTEGER DEFAULT 90,
    next_review_date DATE,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_perf_baseline_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_baseline_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_baseline_sop_category FOREIGN KEY (sop_category_id) REFERENCES sop_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_baseline_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_perf_baseline_validated_by FOREIGN KEY (validated_by) REFERENCES auth_users(id)
);

-- ===========================================
-- MATERIALIZED VIEWS FOR QUICK ANALYTICS
-- ===========================================

-- Daily SOP performance summary
CREATE MATERIALIZED VIEW sop_daily_performance_summary AS
SELECT 
    spa.restaurant_id,
    spa.sop_document_id,
    sd.title as sop_title,
    spa.period_start::DATE as performance_date,
    
    -- Aggregated metrics
    SUM(spa.total_executions) as daily_executions,
    AVG(spa.success_rate) as avg_success_rate,
    AVG(spa.avg_completion_time_seconds) as avg_completion_time,
    AVG(spa.avg_quality_score) as avg_quality_score,
    AVG(spa.avg_efficiency_rating) as avg_efficiency_rating,
    
    -- Trend indicators
    AVG(spa.performance_vs_previous_period) as period_over_period_change,
    AVG(spa.anomaly_score) as avg_anomaly_score,
    
    -- Comparative metrics
    RANK() OVER (
        PARTITION BY spa.restaurant_id, spa.period_start::DATE 
        ORDER BY AVG(spa.success_rate) DESC
    ) as success_rate_rank,
    
    COUNT(DISTINCT spa.user_id) as unique_users,
    MAX(spa.last_calculated_at) as last_updated
    
FROM sop_performance_aggregates spa
LEFT JOIN sop_documents sd ON spa.sop_document_id = sd.id
WHERE spa.aggregation_period = 'daily'
  AND spa.period_start >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 
    spa.restaurant_id, 
    spa.sop_document_id, 
    sd.title, 
    spa.period_start::DATE;

-- Weekly performance trends
CREATE MATERIALIZED VIEW sop_weekly_performance_trends AS
SELECT 
    spa.restaurant_id,
    spa.sop_category_id,    
    sc.name as category_name,
    DATE_TRUNC('week', spa.period_start) as week_start,
    
    -- Performance metrics
    AVG(spa.success_rate) as avg_success_rate,
    SUM(spa.total_executions) as total_executions,
    AVG(spa.avg_completion_time_seconds) as avg_completion_time,
    
    -- Trend calculations
    LAG(AVG(spa.success_rate)) OVER (
        PARTITION BY spa.restaurant_id, spa.sop_category_id 
        ORDER BY DATE_TRUNC('week', spa.period_start)
    ) as prev_week_success_rate,
    
    -- Week-over-week change
    AVG(spa.success_rate) - LAG(AVG(spa.success_rate)) OVER (
        PARTITION BY spa.restaurant_id, spa.sop_category_id 
        ORDER BY DATE_TRUNC('week', spa.period_start)
    ) as week_over_week_change,
    
    -- Quality trends
    AVG(spa.avg_quality_score) as avg_quality_score,
    COUNT(DISTINCT spa.sop_document_id) as unique_sops_executed,
    
    MAX(spa.last_calculated_at) as last_updated
    
FROM sop_performance_aggregates spa
LEFT JOIN sop_categories sc ON spa.sop_category_id = sc.id
WHERE spa.aggregation_period = 'daily'
  AND spa.period_start >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY 
    spa.restaurant_id, 
    spa.sop_category_id, 
    sc.name, 
    DATE_TRUNC('week', spa.period_start);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Performance aggregates indexes
CREATE INDEX idx_perf_agg_restaurant_period ON sop_performance_aggregates(restaurant_id, aggregation_period, period_start);
CREATE INDEX idx_perf_agg_sop_document_period ON sop_performance_aggregates(sop_document_id, period_start);
CREATE INDEX idx_perf_agg_metric_type ON sop_performance_aggregates(metric_type);
CREATE INDEX idx_perf_agg_success_rate ON sop_performance_aggregates(success_rate) WHERE success_rate IS NOT NULL;
CREATE INDEX idx_perf_agg_completion_time ON sop_performance_aggregates(avg_completion_time_seconds) WHERE avg_completion_time_seconds IS NOT NULL;
CREATE INDEX idx_perf_agg_anomaly_score ON sop_performance_aggregates(anomaly_score) WHERE anomaly_score > 0.5;
CREATE INDEX idx_perf_agg_last_calculated ON sop_performance_aggregates(last_calculated_at);

-- Performance trends indexes
CREATE INDEX idx_perf_trend_restaurant_sop ON sop_performance_trends(restaurant_id, sop_document_id);
CREATE INDEX idx_perf_trend_type_active ON sop_performance_trends(trend_type) WHERE is_active = true;
CREATE INDEX idx_perf_trend_significance ON sop_performance_trends(is_significant) WHERE is_significant = true;
CREATE INDEX idx_perf_trend_impact ON sop_performance_trends(impact_severity);

-- Performance baselines indexes
CREATE INDEX idx_perf_baseline_restaurant_metric ON sop_performance_baselines(restaurant_id, metric_type);
CREATE INDEX idx_perf_baseline_sop_active ON sop_performance_baselines(sop_document_id) WHERE is_active = true;
CREATE INDEX idx_perf_baseline_review_date ON sop_performance_baselines(next_review_date);

-- Materialized view indexes
CREATE INDEX idx_daily_summary_restaurant_date ON sop_daily_performance_summary(restaurant_id, performance_date);
CREATE INDEX idx_daily_summary_success_rank ON sop_daily_performance_summary(success_rate_rank);
CREATE INDEX idx_weekly_trends_restaurant_week ON sop_weekly_performance_trends(restaurant_id, week_start);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on performance tables
ALTER TABLE sop_performance_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_performance_trends ENABLE ROW LEVEL SECURITY;  
ALTER TABLE sop_performance_baselines ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Performance aggregates restaurant access"
ON sop_performance_aggregates FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Performance trends restaurant access" 
ON sop_performance_trends FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Performance baselines restaurant access"
ON sop_performance_baselines FOR ALL TO authenticated  
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Update trigger for performance aggregates
CREATE TRIGGER update_sop_performance_aggregates_updated_at 
    BEFORE UPDATE ON sop_performance_aggregates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for performance baselines
CREATE TRIGGER update_sop_performance_baselines_updated_at 
    BEFORE UPDATE ON sop_performance_baselines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- UTILITY FUNCTIONS
-- ===========================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY sop_daily_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY sop_weekly_performance_trends;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate performance percentiles
CREATE OR REPLACE FUNCTION calculate_performance_percentile(
    p_restaurant_id UUID,
    p_metric_type performance_metric_type,
    p_metric_value DECIMAL,
    p_period_start TIMESTAMPTZ
)
RETURNS DECIMAL AS $$
DECLARE
    percentile_rank DECIMAL;
BEGIN
    SELECT PERCENT_RANK() OVER (ORDER BY 
        CASE 
            WHEN p_metric_type = 'success_rate' THEN success_rate
            WHEN p_metric_type = 'completion_time' THEN avg_completion_time_seconds  
            WHEN p_metric_type = 'quality_score' THEN avg_quality_score
            WHEN p_metric_type = 'efficiency_rating' THEN avg_efficiency_rating
            ELSE 0
        END
    ) * 100
    INTO percentile_rank
    FROM sop_performance_aggregates
    WHERE restaurant_id = p_restaurant_id
      AND metric_type = p_metric_type
      AND period_start >= p_period_start - INTERVAL '30 days'
      AND period_start <= p_period_start;
      
    RETURN COALESCE(percentile_rank, 0);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION  
-- ===========================================

COMMENT ON TABLE sop_performance_aggregates IS 'Aggregated SOP performance metrics for analytics and reporting';
COMMENT ON TABLE sop_performance_trends IS 'Time-series trend analysis for SOP performance metrics';
COMMENT ON TABLE sop_performance_baselines IS 'Performance baselines and targets for comparison';
COMMENT ON MATERIALIZED VIEW sop_daily_performance_summary IS 'Daily rollup of SOP performance metrics';
COMMENT ON MATERIALIZED VIEW sop_weekly_performance_trends IS 'Weekly trend analysis with period-over-period comparisons';

-- Performance optimization
ANALYZE sop_performance_aggregates;
ANALYZE sop_performance_trends;
ANALYZE sop_performance_baselines;