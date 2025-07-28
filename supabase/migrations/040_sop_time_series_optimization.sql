-- Restaurant Krong Thai SOP Management System
-- SOP Time-Series Data Optimization
-- Migration 040: Time-series data structures optimized for pattern analysis and forecasting
-- Created: 2025-07-28

-- Enable TimescaleDB extension for time-series optimization
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ===========================================
-- TIME-SERIES OPTIMIZATION ENUMS
-- ===========================================

-- Time-series data types
CREATE TYPE time_series_metric AS ENUM (
    'execution_count', 'success_rate', 'completion_time', 'quality_score',
    'error_rate', 'user_engagement', 'resource_usage', 'cost_metrics',
    'training_effectiveness', 'compliance_score', 'efficiency_rating'
);

-- Aggregation granularities
CREATE TYPE time_granularity AS ENUM (
    'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'
);

-- Seasonality patterns
CREATE TYPE seasonality_pattern AS ENUM (
    'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'none'
);

-- Trend directions
CREATE TYPE trend_direction AS ENUM (
    'increasing', 'decreasing', 'stable', 'volatile', 'cyclical'
);

-- ===========================================
-- TIME-SERIES CORE TABLES
-- ===========================================

-- Main time-series data table (optimized for high-frequency data)
CREATE TABLE IF NOT EXISTS sop_time_series_data (
    time TIMESTAMPTZ NOT NULL,
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    sop_category_id UUID,
    user_id UUID,
    
    -- Metric identification
    metric_type time_series_metric NOT NULL,
    metric_name VARCHAR(100),
    
    -- Core metric values
    value DECIMAL(15,6) NOT NULL,
    count INTEGER DEFAULT 1, -- For aggregated metrics
    min_value DECIMAL(15,6),
    max_value DECIMAL(15,6),
    
    -- Statistical measures
    std_deviation DECIMAL(15,6),
    variance DECIMAL(15,6),
    percentile_25 DECIMAL(15,6),
    percentile_50 DECIMAL(15,6), -- Median
    percentile_75 DECIMAL(15,6),
    percentile_95 DECIMAL(15,6),
    
    -- Context and metadata
    granularity time_granularity DEFAULT 'hour',
    tags JSONB DEFAULT '{}', -- Flexible tagging system
    metadata JSONB DEFAULT '{}', -- Additional context
    
    -- Data quality indicators
    data_quality_score DECIMAL(4,2) DEFAULT 100,
    is_interpolated BOOLEAN DEFAULT false,
    interpolation_method VARCHAR(50),
    is_anomaly BOOLEAN DEFAULT false,
    anomaly_score DECIMAL(5,4),
    
    -- Seasonal adjustments
    seasonal_adjustment DECIMAL(10,6) DEFAULT 0,
    seasonally_adjusted_value DECIMAL(15,6),
    
    CONSTRAINT fk_ts_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_sop_category FOREIGN KEY (sop_category_id) REFERENCES sop_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL
);

-- Convert to hypertable for time-series optimization (TimescaleDB)
SELECT create_hypertable('sop_time_series_data', 'time', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create additional dimension partitioning by restaurant
SELECT add_dimension('sop_time_series_data', 'restaurant_id', 
    number_partitions => 4, 
    if_not_exists => TRUE
);

-- Time-series patterns and trends analysis
CREATE TABLE IF NOT EXISTS sop_time_series_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    
    -- Pattern identification
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL, -- 'trend', 'seasonal', 'cyclical', 'irregular'
    metric_type time_series_metric NOT NULL,
    
    -- Pattern parameters
    pattern_start_time TIMESTAMPTZ NOT NULL,
    pattern_end_time TIMESTAMPTZ,
    pattern_strength DECIMAL(5,4), -- 0-1, how strong the pattern is
    pattern_significance DECIMAL(5,4), -- Statistical significance
    
    -- Trend analysis
    trend_direction trend_direction,
    trend_slope DECIMAL(15,8), -- Rate of change
    trend_intercept DECIMAL(15,6),
    trend_r_squared DECIMAL(5,4),
    trend_p_value DECIMAL(10,8),
    
    -- Seasonality analysis
    seasonality_pattern seasonality_pattern DEFAULT 'none',
    seasonal_period_hours INTEGER,
    seasonal_amplitude DECIMAL(15,6),
    seasonal_phase_shift DECIMAL(6,3), -- Phase shift in hours
    
    -- Cyclical patterns
    cycle_length_hours INTEGER,
    cycle_amplitude DECIMAL(15,6),
    cycles_detected INTEGER DEFAULT 0,
    
    -- Pattern forecasting
    forecast_horizon_hours INTEGER,
    forecast_accuracy DECIMAL(5,2), -- Percentage accuracy
    forecast_confidence_interval DECIMAL(5,2),
    
    -- Pattern stability
    pattern_stability_score DECIMAL(5,4), -- How consistent the pattern is
    last_validation_time TIMESTAMPTZ,
    validation_accuracy DECIMAL(5,2),
    
    -- Pattern metadata
    detection_method VARCHAR(100), -- Algorithm used to detect pattern
    detection_parameters JSONB DEFAULT '{}',
    pattern_description TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ts_pattern_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_pattern_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id)
);

-- Time-series forecasts
CREATE TABLE IF NOT EXISTS sop_time_series_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    
    -- Forecast metadata
    forecast_name VARCHAR(255) NOT NULL,
    metric_type time_series_metric NOT NULL,
    forecast_model VARCHAR(100) NOT NULL, -- 'arima', 'exponential_smoothing', 'prophet', etc.
    
    -- Forecast parameters
    forecast_start_time TIMESTAMPTZ NOT NULL,
    forecast_end_time TIMESTAMPTZ NOT NULL,
    forecast_horizon_hours INTEGER NOT NULL,
    training_data_start TIMESTAMPTZ NOT NULL,
    training_data_end TIMESTAMPTZ NOT NULL,
    
    -- Model parameters
    model_parameters JSONB DEFAULT '{}',
    model_accuracy_metrics JSONB DEFAULT '{}',
    cross_validation_score DECIMAL(5,4),
    
    -- Forecast results
    forecasted_values JSONB NOT NULL, -- Array of {time, value, confidence_lower, confidence_upper}
    confidence_level DECIMAL(5,2) DEFAULT 95.0,
    prediction_intervals JSONB DEFAULT '{}',
    
    -- Model performance
    mae DECIMAL(15,6), -- Mean Absolute Error
    mape DECIMAL(5,2), -- Mean Absolute Percentage Error
    rmse DECIMAL(15,6), -- Root Mean Squared Error
    mase DECIMAL(15,6), -- Mean Absolute Scaled Error
    
    -- Forecast validation
    actual_vs_predicted JSONB DEFAULT '{}',
    forecast_accuracy DECIMAL(5,2),
    forecast_bias DECIMAL(10,6),
    
    -- Business impact
    forecast_impact_assessment TEXT,
    confidence_in_forecast DECIMAL(5,4),
    business_decisions_made JSONB DEFAULT '{}',
    
    -- Forecast lifecycle
    is_active BOOLEAN DEFAULT true,
    forecast_expiry TIMESTAMPTZ,
    actual_values_updated BOOLEAN DEFAULT false,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ts_forecast_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_forecast_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_ts_forecast_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Time-series anomaly detection
CREATE TABLE IF NOT EXISTS sop_time_series_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    
    -- Anomaly identification
    anomaly_time TIMESTAMPTZ NOT NULL,
    metric_type time_series_metric NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL, -- 'point', 'contextual', 'collective'
    
    -- Anomaly measurements
    observed_value DECIMAL(15,6) NOT NULL,
    expected_value DECIMAL(15,6),
    anomaly_score DECIMAL(5,4) NOT NULL, -- 0-1, higher = more anomalous
    severity_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Detection method
    detection_algorithm VARCHAR(100), -- 'isolation_forest', 'statistical', 'lstm_autoencoder'
    detection_parameters JSONB DEFAULT '{}',
    detection_confidence DECIMAL(5,4),
    
    -- Context analysis
    contextual_factors JSONB DEFAULT '{}',
    temporal_context JSONB DEFAULT '{}', -- Time-based context (day of week, hour, etc.)
    environmental_factors JSONB DEFAULT '{}',
    
    -- Anomaly classification
    is_true_anomaly BOOLEAN,
    anomaly_category VARCHAR(100), -- 'operational', 'seasonal', 'external', 'error'
    root_cause_analysis TEXT,
    
    -- Impact assessment
    business_impact_level VARCHAR(20) DEFAULT 'medium',
    estimated_cost_impact DECIMAL(10,2),
    operational_disruption_minutes INTEGER DEFAULT 0,
    
    -- Resolution tracking
    status VARCHAR(50) DEFAULT 'detected', -- 'detected', 'investigating', 'resolved', 'false_positive'
    investigated_by UUID,
    investigated_at TIMESTAMPTZ,
    resolution_action TEXT,
    resolved_at TIMESTAMPTZ,
    
    -- Follow-up actions
    prevention_measures JSONB DEFAULT '{}',
    monitoring_adjustments JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ts_anomaly_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_anomaly_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_ts_anomaly_investigated_by FOREIGN KEY (investigated_by) REFERENCES auth_users(id)
);

-- Time-series data compression policies
CREATE TABLE IF NOT EXISTS sop_time_series_compression_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Policy identification
    policy_name VARCHAR(255) NOT NULL,
    metric_types time_series_metric[] DEFAULT '{}',
    
    -- Compression rules
    compress_after_days INTEGER NOT NULL DEFAULT 7,
    compression_ratio DECIMAL(5,2) DEFAULT 80.0, -- Target compression percentage
    aggregation_granularity time_granularity DEFAULT 'hour',
    
    -- Retention policies
    raw_data_retention_days INTEGER DEFAULT 30,
    compressed_data_retention_days INTEGER DEFAULT 365,
    archive_data_retention_days INTEGER DEFAULT 2555, -- ~7 years
    
    -- Compression settings
    compression_algorithm VARCHAR(50) DEFAULT 'timescaledb',
    compression_level INTEGER DEFAULT 1, -- 1-9, higher = more compression
    enable_delta_compression BOOLEAN DEFAULT true,
    enable_dictionary_compression BOOLEAN DEFAULT true,
    
    -- Performance settings
    chunk_size_mb INTEGER DEFAULT 100,
    max_compression_time_minutes INTEGER DEFAULT 60,
    compression_schedule JSONB DEFAULT '{"frequency": "daily", "time": "02:00"}',
    
    -- Monitoring
    is_active BOOLEAN DEFAULT true,
    last_compression_run TIMESTAMPTZ,
    compression_statistics JSONB DEFAULT '{}',
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ts_compression_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_compression_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- ===========================================
-- CONTINUOUS AGGREGATES (TimescaleDB)
-- ===========================================

-- Hourly aggregates for fast queries
CREATE MATERIALIZED VIEW sop_time_series_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS time_bucket,
    restaurant_id,
    sop_document_id,
    metric_type,
    
    -- Statistical aggregates
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    SUM(value) as sum_value,
    COUNT(*) as data_points,
    STDDEV(value) as std_dev,
    
    -- Percentiles
    percentile_cont(0.25) WITHIN GROUP (ORDER BY value) as p25,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY value) as p50,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY value) as p75,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY value) as p95,
    
    -- Data quality
    AVG(data_quality_score) as avg_data_quality,
    COUNT(*) FILTER (WHERE is_anomaly = true) as anomaly_count
    
FROM sop_time_series_data
GROUP BY time_bucket, restaurant_id, sop_document_id, metric_type;

-- Daily aggregates
CREATE MATERIALIZED VIEW sop_time_series_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', time) AS time_bucket,
    restaurant_id,
    sop_document_id,
    metric_type,
    
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    SUM(value) as sum_value,
    COUNT(*) as data_points,
    STDDEV(value) as std_dev,
    
    -- Daily patterns
    EXTRACT(DOW FROM time_bucket) as day_of_week,
    AVG(value) FILTER (WHERE EXTRACT(HOUR FROM time) BETWEEN 6 AND 14) as morning_avg,
    AVG(value) FILTER (WHERE EXTRACT(HOUR FROM time) BETWEEN 14 AND 22) as evening_avg,
    AVG(value) FILTER (WHERE EXTRACT(HOUR FROM time) NOT BETWEEN 6 AND 22) as night_avg
    
FROM sop_time_series_data
GROUP BY time_bucket, restaurant_id, sop_document_id, metric_type;

-- ===========================================
-- OPTIMIZED INDEXES
-- ===========================================

-- Time-series data indexes (optimized for time-based queries)
CREATE INDEX idx_ts_data_time_restaurant ON sop_time_series_data (time DESC, restaurant_id);
CREATE INDEX idx_ts_data_restaurant_metric_time ON sop_time_series_data (restaurant_id, metric_type, time DESC);
CREATE INDEX idx_ts_data_sop_document_time ON sop_time_series_data (sop_document_id, time DESC);
CREATE INDEX idx_ts_data_anomaly ON sop_time_series_data (time DESC) WHERE is_anomaly = true;
CREATE INDEX idx_ts_data_quality ON sop_time_series_data (data_quality_score) WHERE data_quality_score < 90;

-- Time-series patterns indexes
CREATE INDEX idx_ts_patterns_restaurant ON sop_time_series_patterns(restaurant_id);
CREATE INDEX idx_ts_patterns_type_active ON sop_time_series_patterns(pattern_type) WHERE is_active = true;
CREATE INDEX idx_ts_patterns_metric_type ON sop_time_series_patterns(metric_type);
CREATE INDEX idx_ts_patterns_strength ON sop_time_series_patterns(pattern_strength DESC);
CREATE INDEX idx_ts_patterns_time_range ON sop_time_series_patterns(pattern_start_time, pattern_end_time);

-- Time-series forecasts indexes
CREATE INDEX idx_ts_forecasts_restaurant ON sop_time_series_forecasts(restaurant_id);
CREATE INDEX idx_ts_forecasts_metric_active ON sop_time_series_forecasts(metric_type) WHERE is_active = true;
CREATE INDEX idx_ts_forecasts_accuracy ON sop_time_series_forecasts(forecast_accuracy DESC);
CREATE INDEX idx_ts_forecasts_time_range ON sop_time_series_forecasts(forecast_start_time, forecast_end_time);

-- Time-series anomalies indexes
CREATE INDEX idx_ts_anomalies_restaurant_time ON sop_time_series_anomalies(restaurant_id, anomaly_time DESC);
CREATE INDEX idx_ts_anomalies_metric_type ON sop_time_series_anomalies(metric_type);
CREATE INDEX idx_ts_anomalies_severity ON sop_time_series_anomalies(severity_level);
CREATE INDEX idx_ts_anomalies_status ON sop_time_series_anomalies(status);
CREATE INDEX idx_ts_anomalies_score ON sop_time_series_anomalies(anomaly_score DESC);

-- Compression policies indexes
CREATE INDEX idx_ts_compression_restaurant ON sop_time_series_compression_policies(restaurant_id);
CREATE INDEX idx_ts_compression_active ON sop_time_series_compression_policies(is_active) WHERE is_active = true;

-- ===========================================
-- DATA RETENTION POLICIES
-- ===========================================

-- Add retention policy for raw data (keep for 30 days)
SELECT add_retention_policy('sop_time_series_data', INTERVAL '30 days', if_not_exists => true);

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('sop_time_series_data', INTERVAL '7 days', if_not_exists => true);

-- Continuous aggregate refresh policies
SELECT add_continuous_aggregate_policy('sop_time_series_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => true
);

SELECT add_continuous_aggregate_policy('sop_time_series_daily',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => true
);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on time-series tables
ALTER TABLE sop_time_series_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_time_series_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_time_series_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_time_series_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_time_series_compression_policies ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Time series data restaurant access"
ON sop_time_series_data FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Time series patterns restaurant access"
ON sop_time_series_patterns FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Time series forecasts restaurant access"
ON sop_time_series_forecasts FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Time series anomalies restaurant access"
ON sop_time_series_anomalies FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Time series compression policies restaurant access"
ON sop_time_series_compression_policies FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND FUNCTIONS
-- ===========================================

-- Function to detect anomalies in real-time
CREATE OR REPLACE FUNCTION detect_time_series_anomaly()
RETURNS TRIGGER AS $$
DECLARE
    mean_value DECIMAL;
    std_dev DECIMAL;
    z_score DECIMAL;
    anomaly_threshold DECIMAL := 3.0; -- 3 standard deviations
BEGIN
    -- Calculate rolling statistics for the same metric over past 24 hours
    SELECT AVG(value), STDDEV(value)
    INTO mean_value, std_dev
    FROM sop_time_series_data
    WHERE restaurant_id = NEW.restaurant_id
      AND metric_type = NEW.metric_type
      AND time >= NEW.time - INTERVAL '24 hours'
      AND time < NEW.time;
    
    -- Calculate z-score
    IF std_dev > 0 THEN
        z_score := ABS(NEW.value - mean_value) / std_dev;
        
        -- Mark as anomaly if z-score exceeds threshold
        IF z_score > anomaly_threshold THEN
            NEW.is_anomaly := true;
            NEW.anomaly_score := LEAST(z_score / 10.0, 1.0); -- Normalize to 0-1
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for anomaly detection
CREATE TRIGGER time_series_anomaly_detection
    BEFORE INSERT ON sop_time_series_data
    FOR EACH ROW
    EXECUTE FUNCTION detect_time_series_anomaly();

-- Update triggers
CREATE TRIGGER update_sop_time_series_patterns_updated_at 
    BEFORE UPDATE ON sop_time_series_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_time_series_forecasts_updated_at 
    BEFORE UPDATE ON sop_time_series_forecasts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_time_series_compression_policies_updated_at 
    BEFORE UPDATE ON sop_time_series_compression_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- UTILITY FUNCTIONS
-- ===========================================

-- Function to calculate time-series statistics
CREATE OR REPLACE FUNCTION calculate_time_series_statistics(
    p_restaurant_id UUID,
    p_metric_type time_series_metric,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS TABLE (
    mean_value DECIMAL,
    std_dev DECIMAL,
    min_value DECIMAL,
    max_value DECIMAL,
    trend_slope DECIMAL,
    data_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AVG(value)::DECIMAL as mean_value,
        STDDEV(value)::DECIMAL as std_dev,
        MIN(value)::DECIMAL as min_value,
        MAX(value)::DECIMAL as max_value,
        REGR_SLOPE(value::NUMERIC, EXTRACT(EPOCH FROM time)::NUMERIC)::DECIMAL as trend_slope,
        COUNT(*)::INTEGER as data_points
    FROM sop_time_series_data
    WHERE restaurant_id = p_restaurant_id
      AND metric_type = p_metric_type
      AND time BETWEEN p_start_time AND p_end_time;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_time_series_data IS 'High-performance time-series data storage with TimescaleDB optimization';
COMMENT ON TABLE sop_time_series_patterns IS 'Pattern analysis and trend detection for time-series metrics';
COMMENT ON TABLE sop_time_series_forecasts IS 'Time-series forecasting models and predictions';
COMMENT ON TABLE sop_time_series_anomalies IS 'Anomaly detection and classification for time-series data';
COMMENT ON TABLE sop_time_series_compression_policies IS 'Data compression and retention policies for time-series optimization';

COMMENT ON VIEW sop_time_series_hourly IS 'Continuous aggregate for hourly time-series rollups';
COMMENT ON VIEW sop_time_series_daily IS 'Continuous aggregate for daily time-series rollups with pattern analysis';

-- Performance optimization
ANALYZE sop_time_series_data;
ANALYZE sop_time_series_patterns;
ANALYZE sop_time_series_forecasts;
ANALYZE sop_time_series_anomalies;
ANALYZE sop_time_series_compression_policies;