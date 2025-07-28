-- ================================================
-- CHAIN-WIDE PERFORMANCE METRICS DATABASE
-- Migration: 072_chain_performance_metrics.sql
-- Created: 2025-07-28
-- Purpose: Comprehensive performance metrics aggregation for multi-restaurant chains
-- ================================================

-- Enable required extensions for analytics
CREATE EXTENSION IF NOT EXISTS "pg_partman";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ===========================================
-- PERFORMANCE METRICS ENUMS AND TYPES
-- ===========================================

-- Metric aggregation type enum
CREATE TYPE metric_aggregation AS ENUM ('sum', 'avg', 'min', 'max', 'count', 'percentile', 'stddev');

-- Performance category enum
CREATE TYPE performance_category AS ENUM (
    'operational', 'financial', 'customer', 'staff', 'quality', 'efficiency', 'compliance', 'sustainability'
);

-- Metric frequency enum
CREATE TYPE metric_frequency AS ENUM ('realtime', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- Alert severity enum
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Benchmark comparison type enum
CREATE TYPE benchmark_type AS ENUM ('chain_average', 'regional_average', 'industry_standard', 'historical_trend');

-- ===========================================
-- CHAIN PERFORMANCE CONFIGURATION
-- ===========================================

-- Performance metric definitions
CREATE TABLE chain_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_name_th VARCHAR(255),
    category performance_category NOT NULL,
    description TEXT,
    description_th TEXT,
    calculation_formula TEXT NOT NULL,
    unit_of_measure VARCHAR(50),
    aggregation_type metric_aggregation DEFAULT 'avg',
    target_value DECIMAL(15,4),
    min_threshold DECIMAL(15,4),
    max_threshold DECIMAL(15,4),
    weight_factor DECIMAL(5,2) DEFAULT 1.0,
    is_kpi BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, metric_name)
);

-- Performance benchmarks
CREATE TABLE performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    benchmark_type benchmark_type NOT NULL,
    benchmark_value DECIMAL(15,4) NOT NULL,
    confidence_level DECIMAL(5,2) DEFAULT 95.0,
    sample_size INTEGER,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance targets by location
CREATE TABLE location_performance_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    target_value DECIMAL(15,4) NOT NULL,
    stretch_target DECIMAL(15,4),
    minimum_acceptable DECIMAL(15,4),
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    notes TEXT,
    notes_th TEXT,
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, metric_id, effective_from)
);

-- ===========================================
-- REAL-TIME METRICS COLLECTION
-- ===========================================

-- Real-time performance data (partitioned by time)
CREATE TABLE chain_performance_data (
    id UUID DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    value DECIMAL(15,4) NOT NULL,
    raw_data JSONB DEFAULT '{}',
    data_source VARCHAR(100),
    quality_score DECIMAL(5,2) DEFAULT 100.0,
    is_outlier BOOLEAN DEFAULT false,
    calculation_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions for performance data
CREATE TABLE chain_performance_data_2025_01 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE chain_performance_data_2025_02 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE chain_performance_data_2025_03 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE chain_performance_data_2025_04 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE chain_performance_data_2025_05 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE chain_performance_data_2025_06 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE chain_performance_data_2025_07 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE chain_performance_data_2025_08 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE chain_performance_data_2025_09 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE chain_performance_data_2025_10 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE chain_performance_data_2025_11 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE chain_performance_data_2025_12 PARTITION OF chain_performance_data
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- ===========================================
-- AGGREGATED METRICS TABLES
-- ===========================================

-- Hourly aggregated metrics
CREATE TABLE chain_metrics_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    hour_timestamp TIMESTAMPTZ NOT NULL,
    avg_value DECIMAL(15,4),
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    sum_value DECIMAL(15,4),
    count_value INTEGER,
    stddev_value DECIMAL(15,4),
    percentile_50 DECIMAL(15,4),
    percentile_95 DECIMAL(15,4),
    trend_direction SMALLINT, -- -1 down, 0 stable, 1 up
    quality_score DECIMAL(5,2) DEFAULT 100.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, metric_id, hour_timestamp)
);

-- Daily aggregated metrics
CREATE TABLE chain_metrics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    date_recorded DATE NOT NULL,
    avg_value DECIMAL(15,4),
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    sum_value DECIMAL(15,4),
    count_value INTEGER,
    stddev_value DECIMAL(15,4),
    variance_from_target DECIMAL(15,4),
    target_achievement_pct DECIMAL(5,2),
    benchmark_comparison JSONB DEFAULT '{}',
    performance_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, metric_id, date_recorded)
);

-- Weekly aggregated metrics
CREATE TABLE chain_metrics_weekly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    avg_value DECIMAL(15,4),
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    sum_value DECIMAL(15,4),
    count_value INTEGER,
    week_over_week_change DECIMAL(15,4),
    week_over_week_pct DECIMAL(5,2),
    volatility_score DECIMAL(5,2),
    consistency_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, metric_id, week_start_date)
);

-- Monthly aggregated metrics
CREATE TABLE chain_metrics_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- First day of month
    avg_value DECIMAL(15,4),
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    sum_value DECIMAL(15,4),
    count_value INTEGER,
    month_over_month_change DECIMAL(15,4),
    month_over_month_pct DECIMAL(5,2),
    year_over_year_change DECIMAL(15,4),
    year_over_year_pct DECIMAL(5,2),
    seasonal_adjustment DECIMAL(15,4),
    trend_coefficient DECIMAL(10,6),
    performance_ranking INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, metric_id, month_year)
);

-- ===========================================
-- CHAIN-LEVEL AGGREGATIONS
-- ===========================================

-- Chain-wide daily summaries
CREATE TABLE chain_summary_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    date_recorded DATE NOT NULL,
    total_locations INTEGER,
    reporting_locations INTEGER,
    chain_avg_value DECIMAL(15,4),
    chain_min_value DECIMAL(15,4),
    chain_max_value DECIMAL(15,4),
    chain_sum_value DECIMAL(15,4),
    chain_stddev_value DECIMAL(15,4),
    top_performer_id UUID REFERENCES restaurants(id),
    bottom_performer_id UUID REFERENCES restaurants(id),
    locations_above_target INTEGER,
    locations_below_target INTEGER,
    overall_performance_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, metric_id, date_recorded)
);

-- Regional performance summaries
CREATE TABLE regional_performance_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES chain_regions(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    date_recorded DATE NOT NULL,
    total_locations INTEGER,
    reporting_locations INTEGER,
    regional_avg_value DECIMAL(15,4),
    regional_min_value DECIMAL(15,4),
    regional_max_value DECIMAL(15,4),
    regional_stddev_value DECIMAL(15,4),
    vs_chain_variance DECIMAL(15,4),
    vs_chain_variance_pct DECIMAL(5,2),
    regional_ranking INTEGER,
    improvement_trend SMALLINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(region_id, metric_id, date_recorded)
);

-- ===========================================
-- PERFORMANCE ALERTS AND NOTIFICATIONS
-- ===========================================

-- Performance alerts configuration
CREATE TABLE performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES chain_performance_metrics(id) ON DELETE CASCADE,
    alert_name VARCHAR(255) NOT NULL,
    alert_name_th VARCHAR(255),
    condition_sql TEXT NOT NULL,
    threshold_value DECIMAL(15,4),
    severity alert_severity DEFAULT 'medium',
    notification_channels JSONB DEFAULT '[]', -- email, sms, slack, etc.
    escalation_rules JSONB DEFAULT '{}',
    frequency_limit_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert instances and tracking
CREATE TABLE performance_alert_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES performance_alerts(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_value DECIMAL(15,4),
    threshold_value DECIMAL(15,4),
    severity alert_severity,
    alert_message TEXT,
    alert_message_th TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth_users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth_users(id),
    resolution_notes TEXT,
    escalated BOOLEAN DEFAULT false,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ADVANCED INDEXING FOR PERFORMANCE
-- ===========================================

-- Chain performance metrics indexes
CREATE INDEX idx_chain_performance_metrics_chain_id ON chain_performance_metrics(chain_id);
CREATE INDEX idx_chain_performance_metrics_category ON chain_performance_metrics(category);
CREATE INDEX idx_chain_performance_metrics_active ON chain_performance_metrics(is_active);
CREATE INDEX idx_chain_performance_metrics_kpi ON chain_performance_metrics(is_kpi);

-- Performance data indexes (on partitioned table)
CREATE INDEX idx_chain_performance_data_restaurant_time ON chain_performance_data(restaurant_id, recorded_at);
CREATE INDEX idx_chain_performance_data_metric_time ON chain_performance_data(metric_id, recorded_at);
CREATE INDEX idx_chain_performance_data_recorded_at ON chain_performance_data(recorded_at);
CREATE INDEX idx_chain_performance_data_quality ON chain_performance_data(quality_score);
CREATE INDEX idx_chain_performance_data_outlier ON chain_performance_data(is_outlier);

-- Aggregated metrics indexes
CREATE INDEX idx_chain_metrics_hourly_restaurant_time ON chain_metrics_hourly(restaurant_id, hour_timestamp);
CREATE INDEX idx_chain_metrics_daily_restaurant_date ON chain_metrics_daily(restaurant_id, date_recorded);
CREATE INDEX idx_chain_metrics_weekly_restaurant_week ON chain_metrics_weekly(restaurant_id, week_start_date);
CREATE INDEX idx_chain_metrics_monthly_restaurant_month ON chain_metrics_monthly(restaurant_id, month_year);

-- Chain summary indexes
CREATE INDEX idx_chain_summary_daily_chain_date ON chain_summary_daily(chain_id, date_recorded);
CREATE INDEX idx_regional_performance_region_date ON regional_performance_summary(region_id, date_recorded);

-- Alert indexes
CREATE INDEX idx_performance_alerts_chain_metric ON performance_alerts(chain_id, metric_id);
CREATE INDEX idx_performance_alert_instances_triggered ON performance_alert_instances(triggered_at);
CREATE INDEX idx_performance_alert_instances_unresolved ON performance_alert_instances(resolved_at) WHERE resolved_at IS NULL;

-- ===========================================
-- ANALYTICS FUNCTIONS
-- ===========================================

-- Function to calculate performance score
CREATE OR REPLACE FUNCTION calculate_performance_score(
    p_metric_value DECIMAL,
    p_target_value DECIMAL,
    p_min_threshold DECIMAL,
    p_max_threshold DECIMAL,
    p_weight_factor DECIMAL DEFAULT 1.0
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    score DECIMAL(5,2);
    range_size DECIMAL;
BEGIN
    -- Handle null values
    IF p_metric_value IS NULL OR p_target_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate score based on performance relative to target
    IF p_min_threshold IS NOT NULL AND p_max_threshold IS NOT NULL THEN
        range_size := p_max_threshold - p_min_threshold;
        IF range_size = 0 THEN
            score := CASE WHEN p_metric_value = p_target_value THEN 100.0 ELSE 0.0 END;
        ELSE
            score := GREATEST(0, LEAST(100, 
                ((p_metric_value - p_min_threshold) / range_size) * 100
            ));
        END IF;
    ELSE
        -- Simple percentage of target
        IF p_target_value = 0 THEN
            score := CASE WHEN p_metric_value = 0 THEN 100.0 ELSE 0.0 END;
        ELSE
            score := GREATEST(0, LEAST(200, (p_metric_value / p_target_value) * 100));
        END IF;
    END IF;
    
    -- Apply weight factor
    RETURN ROUND(score * p_weight_factor, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to detect outliers using IQR method
CREATE OR REPLACE FUNCTION detect_metric_outliers(
    p_restaurant_id UUID,
    p_metric_id UUID,
    p_lookback_hours INTEGER DEFAULT 168 -- 1 week
)
RETURNS TABLE(
    data_id UUID,
    value DECIMAL(15,4),
    is_outlier BOOLEAN,
    outlier_score DECIMAL(5,2)
) AS $$
DECLARE
    q1 DECIMAL(15,4);
    q3 DECIMAL(15,4);
    iqr DECIMAL(15,4);
    lower_bound DECIMAL(15,4);
    upper_bound DECIMAL(15,4);
BEGIN
    -- Calculate quartiles
    SELECT 
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value),
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value)
    INTO q1, q3
    FROM chain_performance_data
    WHERE restaurant_id = p_restaurant_id
    AND metric_id = p_metric_id
    AND recorded_at >= NOW() - (p_lookback_hours || ' hours')::INTERVAL;
    
    -- Calculate IQR and bounds
    iqr := q3 - q1;
    lower_bound := q1 - (1.5 * iqr);
    upper_bound := q3 + (1.5 * iqr);
    
    -- Return outlier analysis
    RETURN QUERY
    SELECT 
        cpd.id,
        cpd.value,
        (cpd.value < lower_bound OR cpd.value > upper_bound) as is_outlier,
        CASE 
            WHEN cpd.value < lower_bound THEN 
                ROUND(((lower_bound - cpd.value) / NULLIF(iqr, 0)) * 100, 2)
            WHEN cpd.value > upper_bound THEN 
                ROUND(((cpd.value - upper_bound) / NULLIF(iqr, 0)) * 100, 2)
            ELSE 0.0
        END as outlier_score
    FROM chain_performance_data cpd
    WHERE cpd.restaurant_id = p_restaurant_id
    AND cpd.metric_id = p_metric_id
    AND cpd.recorded_at >= NOW() - (p_lookback_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate metrics by time period
CREATE OR REPLACE FUNCTION aggregate_chain_metrics(
    p_chain_id UUID,
    p_period metric_frequency,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE(
    metric_name VARCHAR,
    period_start TIMESTAMPTZ,
    avg_value DECIMAL(15,4),
    locations_count INTEGER,
    performance_score DECIMAL(5,2)
) AS $$
BEGIN
    CASE p_period
        WHEN 'daily' THEN
            RETURN QUERY
            SELECT 
                cpm.metric_name,
                cmd.date_recorded::TIMESTAMPTZ as period_start,
                AVG(cmd.avg_value) as avg_value,
                COUNT(DISTINCT cmd.restaurant_id)::INTEGER as locations_count,
                AVG(cmd.performance_score) as performance_score
            FROM chain_metrics_daily cmd
            JOIN chain_performance_metrics cpm ON cpm.id = cmd.metric_id
            JOIN restaurants r ON r.id = cmd.restaurant_id
            WHERE r.chain_id = p_chain_id
            AND cmd.date_recorded >= p_start_date::DATE
            AND cmd.date_recorded <= p_end_date::DATE
            GROUP BY cpm.metric_name, cmd.date_recorded
            ORDER BY cmd.date_recorded, cpm.metric_name;
            
        WHEN 'weekly' THEN
            RETURN QUERY
            SELECT 
                cpm.metric_name,
                cmw.week_start_date::TIMESTAMPTZ as period_start,
                AVG(cmw.avg_value) as avg_value,
                COUNT(DISTINCT cmw.restaurant_id)::INTEGER as locations_count,
                AVG(cmw.consistency_score) as performance_score
            FROM chain_metrics_weekly cmw
            JOIN chain_performance_metrics cpm ON cpm.id = cmw.metric_id
            JOIN restaurants r ON r.id = cmw.restaurant_id
            WHERE r.chain_id = p_chain_id
            AND cmw.week_start_date >= p_start_date::DATE
            AND cmw.week_start_date <= p_end_date::DATE
            GROUP BY cpm.metric_name, cmw.week_start_date
            ORDER BY cmw.week_start_date, cpm.metric_name;
            
        WHEN 'monthly' THEN
            RETURN QUERY
            SELECT 
                cpm.metric_name,
                cmm.month_year::TIMESTAMPTZ as period_start,
                AVG(cmm.avg_value) as avg_value,
                COUNT(DISTINCT cmm.restaurant_id)::INTEGER as locations_count,
                AVG(cmm.performance_ranking::DECIMAL) as performance_score
            FROM chain_metrics_monthly cmm
            JOIN chain_performance_metrics cpm ON cpm.id = cmm.metric_id
            JOIN restaurants r ON r.id = cmm.restaurant_id
            WHERE r.chain_id = p_chain_id
            AND cmm.month_year >= DATE_TRUNC('month', p_start_date)
            AND cmm.month_year <= DATE_TRUNC('month', p_end_date)
            GROUP BY cpm.metric_name, cmm.month_year
            ORDER BY cmm.month_year, cpm.metric_name;
            
        ELSE
            -- Default to daily for unsupported periods
            RETURN QUERY SELECT NULL::VARCHAR, NULL::TIMESTAMPTZ, NULL::DECIMAL, NULL::INTEGER, NULL::DECIMAL LIMIT 0;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger performance alerts
CREATE OR REPLACE FUNCTION check_performance_alerts()
RETURNS INTEGER AS $$
DECLARE
    alert_record RECORD;
    alert_triggered BOOLEAN;
    alert_count INTEGER := 0;
    metric_value DECIMAL(15,4);
    restaurant_record RECORD;
BEGIN
    -- Loop through active alerts
    FOR alert_record IN 
        SELECT pa.*, cpm.metric_name, cpm.unit_of_measure
        FROM performance_alerts pa
        JOIN chain_performance_metrics cpm ON cpm.id = pa.metric_id
        WHERE pa.is_active = true
    LOOP
        -- Check alert condition for each restaurant in the chain
        FOR restaurant_record IN
            SELECT r.id, r.name
            FROM restaurants r
            WHERE r.chain_id = alert_record.chain_id
            AND r.sync_enabled = true
        LOOP
            -- Get latest metric value
            SELECT value INTO metric_value
            FROM chain_performance_data cpd
            WHERE cpd.restaurant_id = restaurant_record.id
            AND cpd.metric_id = alert_record.metric_id
            ORDER BY cpd.recorded_at DESC
            LIMIT 1;
            
            -- Evaluate alert condition (simplified example)
            alert_triggered := CASE
                WHEN alert_record.condition_sql LIKE '%>' THEN 
                    COALESCE(metric_value, 0) > alert_record.threshold_value
                WHEN alert_record.condition_sql LIKE '%<' THEN 
                    COALESCE(metric_value, 0) < alert_record.threshold_value
                ELSE false
            END;
            
            -- Create alert instance if triggered
            IF alert_triggered THEN
                INSERT INTO performance_alert_instances (
                    alert_id, restaurant_id, metric_value, threshold_value,
                    severity, alert_message, triggered_at
                ) VALUES (
                    alert_record.id, restaurant_record.id, metric_value, 
                    alert_record.threshold_value, alert_record.severity,
                    format('Alert: %s at %s exceeded threshold (%.2f > %.2f)',
                        alert_record.alert_name, restaurant_record.name, 
                        metric_value, alert_record.threshold_value),
                    NOW()
                );
                
                alert_count := alert_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- AGGREGATION TRIGGERS AND PROCEDURES
-- ===========================================

-- Function to aggregate hourly metrics
CREATE OR REPLACE FUNCTION aggregate_hourly_metrics()
RETURNS VOID AS $$
DECLARE
    current_hour TIMESTAMPTZ;
BEGIN
    current_hour := DATE_TRUNC('hour', NOW() - INTERVAL '1 hour');
    
    INSERT INTO chain_metrics_hourly (
        restaurant_id, metric_id, hour_timestamp,
        avg_value, min_value, max_value, sum_value, count_value, stddev_value,
        percentile_50, percentile_95, trend_direction, quality_score
    )
    SELECT 
        restaurant_id,
        metric_id,
        current_hour,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        SUM(value) as sum_value,
        COUNT(*) as count_value,
        STDDEV(value) as stddev_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as percentile_50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as percentile_95,
        CASE 
            WHEN AVG(value) > LAG(AVG(value)) OVER (PARTITION BY restaurant_id, metric_id ORDER BY current_hour) THEN 1
            WHEN AVG(value) < LAG(AVG(value)) OVER (PARTITION BY restaurant_id, metric_id ORDER BY current_hour) THEN -1
            ELSE 0
        END as trend_direction,
        AVG(quality_score) as quality_score
    FROM chain_performance_data
    WHERE recorded_at >= current_hour
    AND recorded_at < current_hour + INTERVAL '1 hour'
    GROUP BY restaurant_id, metric_id
    ON CONFLICT (restaurant_id, metric_id, hour_timestamp) DO UPDATE SET
        avg_value = EXCLUDED.avg_value,
        min_value = EXCLUDED.min_value,
        max_value = EXCLUDED.max_value,
        sum_value = EXCLUDED.sum_value,
        count_value = EXCLUDED.count_value,
        stddev_value = EXCLUDED.stddev_value,
        percentile_50 = EXCLUDED.percentile_50,
        percentile_95 = EXCLUDED.percentile_95,
        quality_score = EXCLUDED.quality_score;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_metrics()
RETURNS VOID AS $$
DECLARE
    current_date DATE;
BEGIN
    current_date := CURRENT_DATE - INTERVAL '1 day';
    
    INSERT INTO chain_metrics_daily (
        restaurant_id, metric_id, date_recorded,
        avg_value, min_value, max_value, sum_value, count_value, stddev_value,
        variance_from_target, target_achievement_pct, performance_score
    )
    SELECT 
        cmh.restaurant_id,
        cmh.metric_id,
        current_date,
        AVG(cmh.avg_value) as avg_value,
        MIN(cmh.min_value) as min_value,
        MAX(cmh.max_value) as max_value,
        SUM(cmh.sum_value) as sum_value,
        SUM(cmh.count_value) as count_value,
        AVG(cmh.stddev_value) as stddev_value,
        AVG(cmh.avg_value) - cpm.target_value as variance_from_target,
        CASE 
            WHEN cpm.target_value = 0 THEN NULL
            ELSE ROUND((AVG(cmh.avg_value) / cpm.target_value) * 100, 2)
        END as target_achievement_pct,
        calculate_performance_score(
            AVG(cmh.avg_value), 
            cpm.target_value, 
            cpm.min_threshold, 
            cpm.max_threshold, 
            cpm.weight_factor
        ) as performance_score
    FROM chain_metrics_hourly cmh
    JOIN chain_performance_metrics cpm ON cpm.id = cmh.metric_id
    WHERE DATE_TRUNC('day', cmh.hour_timestamp) = current_date
    GROUP BY cmh.restaurant_id, cmh.metric_id, cpm.target_value, 
             cpm.min_threshold, cpm.max_threshold, cpm.weight_factor
    ON CONFLICT (restaurant_id, metric_id, date_recorded) DO UPDATE SET
        avg_value = EXCLUDED.avg_value,
        min_value = EXCLUDED.min_value,
        max_value = EXCLUDED.max_value,
        sum_value = EXCLUDED.sum_value,
        count_value = EXCLUDED.count_value,
        stddev_value = EXCLUDED.stddev_value,
        variance_from_target = EXCLUDED.variance_from_target,
        target_achievement_pct = EXCLUDED.target_achievement_pct,
        performance_score = EXCLUDED.performance_score;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all new tables
ALTER TABLE chain_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_performance_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_performance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_metrics_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_metrics_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_metrics_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_summary_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_performance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alert_instances ENABLE ROW LEVEL SECURITY;

-- Chain performance metrics access
CREATE POLICY "Chain performance metrics access policy"
ON chain_performance_metrics FOR ALL
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
    )
);

-- Performance data access (restaurant-specific)
CREATE POLICY "Performance data access policy"
ON chain_performance_data FOR ALL
TO authenticated
USING (
    restaurant_id IN (
        SELECT r.id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
        OR (u.role IN ('admin', 'manager') AND r.chain_id IN (
            SELECT r2.chain_id FROM restaurants r2
            JOIN auth_users u2 ON u2.restaurant_id = r2.id
            WHERE u2.id = auth.uid()
        ))
    )
);

-- ===========================================
-- SAMPLE PERFORMANCE METRICS
-- ===========================================

-- Insert sample performance metrics for Krong Thai chain
INSERT INTO chain_performance_metrics (
    chain_id, metric_name, metric_name_th, category, description, description_th,
    calculation_formula, unit_of_measure, aggregation_type, target_value,
    min_threshold, max_threshold, weight_factor, is_kpi
) VALUES
('11111111-1111-1111-1111-111111111111', 'Average Order Value', 'มูลค่าออเดอร์เฉลี่ย', 'financial', 
 'Average value of customer orders', 'มูลค่าเฉลี่ยของคำสั่งซื้อลูกค้า',
 'SUM(order_total) / COUNT(orders)', 'THB', 'avg', 450.00, 300.00, 800.00, 1.5, true),

('11111111-1111-1111-1111-111111111111', 'Customer Satisfaction Score', 'คะแนนความพึงพอใจลูกค้า', 'customer',
 'Average customer rating score', 'คะแนนเฉลี่ยความพึงพอใจของลูกค้า',
 'AVG(customer_rating)', 'score', 'avg', 4.5, 3.0, 5.0, 2.0, true),

('11111111-1111-1111-1111-111111111111', 'Food Safety Compliance', 'การปฏิบัติตามมาตรฐานความปลอดภัยอาหาร', 'compliance',
 'Percentage of food safety checks passed', 'เปอร์เซ็นต์การผ่านการตรวจสอบความปลอดภัยอาหาร',
 '(passed_checks / total_checks) * 100', 'percentage', 'avg', 98.0, 90.0, 100.0, 2.5, true),

('11111111-1111-1111-1111-111111111111', 'Staff Productivity', 'ประสิทธิภาพพนักงาน', 'operational',
 'Orders processed per staff member per hour', 'จำนวนออเดอร์ที่ประมวลผลต่อพนักงานต่อชั่วโมง',
 'COUNT(orders) / (staff_hours)', 'orders/hour', 'avg', 12.0, 8.0, 20.0, 1.0, false),

('11111111-1111-1111-1111-111111111111', 'Inventory Turnover', 'อัตราการหมุนเวียนสินค้าคงคลัง', 'efficiency',
 'Rate of inventory turnover per month', 'อัตราการหมุนเวียนสินค้าคงคลังต่อเดือน',
 'cost_of_goods_sold / average_inventory', 'ratio', 'avg', 6.0, 4.0, 10.0, 1.2, false);

-- Insert sample performance targets
INSERT INTO location_performance_targets (
    restaurant_id, metric_id, target_value, stretch_target, minimum_acceptable
) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000',
    id,
    target_value,
    target_value * 1.15, -- 15% stretch target
    min_threshold
FROM chain_performance_metrics
WHERE chain_id = '11111111-1111-1111-1111-111111111111';

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_chain_performance_metrics_updated_at 
    BEFORE UPDATE ON chain_performance_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_benchmarks_updated_at 
    BEFORE UPDATE ON performance_benchmarks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_performance_targets_updated_at 
    BEFORE UPDATE ON location_performance_targets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_alerts_updated_at 
    BEFORE UPDATE ON performance_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- PERFORMANCE ANALYSIS VIEWS
-- ===========================================

-- Materialized view for chain performance dashboard
CREATE MATERIALIZED VIEW chain_performance_dashboard AS
SELECT 
    rc.name as chain_name,
    cpm.metric_name,
    cpm.category,
    cpm.unit_of_measure,
    csd.date_recorded,
    csd.chain_avg_value,
    csd.total_locations,
    csd.reporting_locations,
    csd.locations_above_target,
    csd.locations_below_target,
    csd.overall_performance_score,
    CASE 
        WHEN csd.overall_performance_score >= 90 THEN 'Excellent'
        WHEN csd.overall_performance_score >= 75 THEN 'Good'
        WHEN csd.overall_performance_score >= 60 THEN 'Fair'
        ELSE 'Needs Improvement'
    END as performance_category,
    ROW_NUMBER() OVER (PARTITION BY rc.id ORDER BY csd.overall_performance_score DESC) as performance_rank
FROM chain_summary_daily csd
JOIN restaurant_chains rc ON rc.id = csd.chain_id
JOIN chain_performance_metrics cpm ON cpm.id = csd.metric_id
WHERE csd.date_recorded >= CURRENT_DATE - INTERVAL '30 days';

-- Create index on materialized view
CREATE INDEX idx_chain_performance_dashboard_chain_date ON chain_performance_dashboard(chain_name, date_recorded);

-- ===========================================
-- PERFORMANCE OPTIMIZATIONS
-- ===========================================

-- Analyze new tables for query optimization
ANALYZE chain_performance_metrics;
ANALYZE performance_benchmarks;
ANALYZE location_performance_targets;
ANALYZE chain_performance_data;
ANALYZE chain_metrics_hourly;
ANALYZE chain_metrics_daily;
ANALYZE chain_summary_daily;
ANALYZE performance_alerts;

-- Set statistics targets for better performance
ALTER TABLE chain_performance_data ALTER COLUMN raw_data SET STATISTICS 500;
ALTER TABLE chain_performance_data ALTER COLUMN calculation_metadata SET STATISTICS 500;

COMMENT ON MIGRATION IS 'Chain-wide performance metrics database with real-time aggregation, alerting, and comprehensive analytics for multi-restaurant operations';