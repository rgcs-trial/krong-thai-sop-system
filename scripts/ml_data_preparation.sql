-- Restaurant Krong Thai SOP Management System
-- ML Data Preparation and Aggregation Utilities
-- Purpose: Data aggregation scripts and ML preparation utilities for SOP optimization
-- Created: 2025-07-28

-- ===========================================
-- ML DATA PREPARATION FUNCTIONS
-- ===========================================

-- Function to prepare training dataset for SOP recommendation model
CREATE OR REPLACE FUNCTION prepare_sop_recommendation_training_data(
    p_restaurant_id UUID DEFAULT NULL,
    p_days_back INTEGER DEFAULT 90,
    p_min_interactions INTEGER DEFAULT 5
)
RETURNS TABLE (
    user_id UUID,
    sop_document_id UUID,
    interaction_score DECIMAL,
    user_features JSONB,
    sop_features JSONB,
    contextual_features JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH user_interactions AS (
        SELECT 
            ui.user_id,
            ui.sop_document_id,
            -- Normalize interaction scores
            AVG(ui.interaction_value) as avg_interaction,
            COUNT(*) as interaction_count,
            MAX(ui.interaction_timestamp) as last_interaction,
            AVG(ui.completion_rate) as avg_completion_rate
        FROM sop_user_interactions ui
        WHERE (p_restaurant_id IS NULL OR ui.restaurant_id = p_restaurant_id)
          AND ui.interaction_timestamp >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
        GROUP BY ui.user_id, ui.sop_document_id
        HAVING COUNT(*) >= p_min_interactions
    ),
    user_profile_features AS (
        SELECT 
            up.user_id,
            JSONB_BUILD_OBJECT(
                'skill_proficiency', COALESCE(up.skill_proficiency, '{}'),
                'preferred_categories', COALESCE(up.preferred_sop_categories, '{}'),
                'performance_score', COALESCE(up.overall_performance_score, 0.5),
                'learning_style', COALESCE(up.learning_style, 'visual'),
                'difficulty_preference', COALESCE(up.preferred_difficulty_range, '{"min": 1, "max": 10}'),
                'activity_pattern', COALESCE(up.activity_pattern_weekdays, '{}')
            ) as user_features
        FROM sop_user_profiles up
        WHERE (p_restaurant_id IS NULL OR up.restaurant_id = p_restaurant_id)
    ),
    sop_content_features AS (
        SELECT 
            scf.sop_document_id,
            JSONB_BUILD_OBJECT(
                'difficulty_level', scf.difficulty_level,
                'estimated_time', scf.estimated_time_minutes,
                'average_rating', COALESCE(scf.average_rating, 3.0),
                'success_rate', COALESCE(scf.completion_success_rate, 0.8),
                'categories', COALESCE(scf.secondary_categories, '{}'),
                'skill_requirements', COALESCE(scf.skill_requirements, '{}'),
                'equipment_required', COALESCE(scf.equipment_required, '{}')
            ) as sop_features
        FROM sop_content_features scf
        WHERE (p_restaurant_id IS NULL OR scf.restaurant_id = p_restaurant_id)
    )
    SELECT 
        ui.user_id,
        ui.sop_document_id,
        -- Weighted interaction score (0-1)
        LEAST(1.0, (ui.avg_interaction * 0.6 + ui.avg_completion_rate * 0.4))::DECIMAL as interaction_score,
        COALESCE(upf.user_features, '{}'::JSONB) as user_features,
        COALESCE(scf.sop_features, '{}'::JSONB) as sop_features,
        JSONB_BUILD_OBJECT(
            'interaction_count', ui.interaction_count,
            'recency_days', EXTRACT(DAYS FROM CURRENT_DATE - ui.last_interaction::DATE),
            'time_of_day_pattern', EXTRACT(HOUR FROM ui.last_interaction),
            'day_of_week', EXTRACT(DOW FROM ui.last_interaction)
        ) as contextual_features
    FROM user_interactions ui
    LEFT JOIN user_profile_features upf ON ui.user_id = upf.user_id
    LEFT JOIN sop_content_features scf ON ui.sop_document_id = scf.sop_document_id;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate SOP performance metrics for ML training
CREATE OR REPLACE FUNCTION aggregate_sop_performance_features(
    p_restaurant_id UUID DEFAULT NULL,
    p_aggregation_period aggregation_period DEFAULT 'daily',
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    sop_document_id UUID,
    time_period TIMESTAMPTZ,
    performance_features JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH time_buckets AS (
        SELECT 
            CASE 
                WHEN p_aggregation_period = 'hourly' THEN time_bucket('1 hour', time)
                WHEN p_aggregation_period = 'daily' THEN time_bucket('1 day', time)
                WHEN p_aggregation_period = 'weekly' THEN time_bucket('1 week', time)
                ELSE time_bucket('1 day', time)
            END as time_bucket,
            restaurant_id,
            sop_document_id,
            value,
            metric_type,
            count
        FROM sop_time_series_data
        WHERE time >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
          AND (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
    ),
    aggregated_metrics AS (
        SELECT 
            tb.sop_document_id,
            tb.time_bucket,
            -- Performance metrics
            AVG(tb.value) FILTER (WHERE tb.metric_type = 'completion_time') as avg_completion_time,
            AVG(tb.value) FILTER (WHERE tb.metric_type = 'success_rate') as avg_success_rate,
            AVG(tb.value) FILTER (WHERE tb.metric_type = 'quality_score') as avg_quality_score,
            AVG(tb.value) FILTER (WHERE tb.metric_type = 'error_rate') as avg_error_rate,
            SUM(tb.count) FILTER (WHERE tb.metric_type = 'execution_count') as total_executions,
            -- Statistical features
            STDDEV(tb.value) FILTER (WHERE tb.metric_type = 'completion_time') as completion_time_std,
            MIN(tb.value) FILTER (WHERE tb.metric_type = 'completion_time') as min_completion_time,
            MAX(tb.value) FILTER (WHERE tb.metric_type = 'completion_time') as max_completion_time
        FROM time_buckets tb
        GROUP BY tb.sop_document_id, tb.time_bucket
    )
    SELECT 
        am.sop_document_id,
        am.time_bucket as time_period,
        JSONB_BUILD_OBJECT(
            'avg_completion_time', COALESCE(am.avg_completion_time, 0),
            'success_rate', COALESCE(am.avg_success_rate, 0.8),
            'quality_score', COALESCE(am.avg_quality_score, 3.0),
            'error_rate', COALESCE(am.avg_error_rate, 0.1),
            'execution_volume', COALESCE(am.total_executions, 0),
            'completion_time_variability', COALESCE(am.completion_time_std, 0),
            'performance_stability', CASE 
                WHEN am.completion_time_std > 0 THEN 1.0 / (1.0 + am.completion_time_std)
                ELSE 1.0 
            END,
            'efficiency_score', CASE 
                WHEN am.avg_completion_time > 0 THEN LEAST(1.0, 1.0 / am.avg_completion_time * 100)
                ELSE 0.5
            END
        ) as performance_features
    FROM aggregated_metrics am
    WHERE am.sop_document_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to generate feature matrix for predictive modeling
CREATE OR REPLACE FUNCTION generate_ml_feature_matrix(
    p_restaurant_id UUID,
    p_target_metric ab_metric_type DEFAULT 'completion_time',
    p_feature_window_days INTEGER DEFAULT 7,
    p_prediction_horizon_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    feature_id UUID,
    features JSONB,
    target_value DECIMAL,
    sample_weight DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH feature_window AS (
        SELECT 
            tsd.sop_document_id,
            tsd.user_id,
            tsd.time,
            -- Temporal features
            EXTRACT(HOUR FROM tsd.time) as hour_of_day,
            EXTRACT(DOW FROM tsd.time) as day_of_week,
            EXTRACT(DAY FROM tsd.time) as day_of_month,
            -- Lagged features (past performance)
            LAG(tsd.value, 1) OVER (
                PARTITION BY tsd.sop_document_id, tsd.user_id 
                ORDER BY tsd.time
            ) as lag_1_value,
            LAG(tsd.value, 24) OVER (
                PARTITION BY tsd.sop_document_id, tsd.user_id 
                ORDER BY tsd.time
            ) as lag_24_value,
            -- Rolling averages
            AVG(tsd.value) OVER (
                PARTITION BY tsd.sop_document_id, tsd.user_id 
                ORDER BY tsd.time 
                RANGE BETWEEN INTERVAL '24 hours' PRECEDING AND CURRENT ROW
            ) as rolling_24h_avg,
            AVG(tsd.value) OVER (
                PARTITION BY tsd.sop_document_id, tsd.user_id 
                ORDER BY tsd.time 
                RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
            ) as rolling_7d_avg,
            tsd.value as current_value
        FROM sop_time_series_data tsd
        WHERE tsd.restaurant_id = p_restaurant_id
          AND tsd.metric_type::TEXT = p_target_metric::TEXT
          AND tsd.time >= CURRENT_DATE - INTERVAL '1 day' * (p_feature_window_days + 7)
    ),
    enriched_features AS (
        SELECT 
            fw.*,
            -- User features
            up.overall_performance_score,
            up.skill_proficiency,
            up.preferred_difficulty_range,
            -- SOP features
            scf.difficulty_level,
            scf.average_rating,
            scf.completion_success_rate,
            scf.estimated_time_minutes,
            -- Environmental features
            CASE 
                WHEN fw.hour_of_day BETWEEN 6 AND 11 THEN 'morning'
                WHEN fw.hour_of_day BETWEEN 12 AND 17 THEN 'afternoon'
                WHEN fw.hour_of_day BETWEEN 18 AND 22 THEN 'evening'
                ELSE 'night'
            END as time_period,
            CASE 
                WHEN fw.day_of_week IN (1, 7) THEN 'weekend'
                ELSE 'weekday'  
            END as day_type
        FROM feature_window fw
        LEFT JOIN sop_user_profiles up ON fw.user_id = up.user_id
        LEFT JOIN sop_content_features scf ON fw.sop_document_id = scf.sop_document_id
        WHERE fw.lag_1_value IS NOT NULL -- Ensure we have historical data
    ),
    target_values AS (
        SELECT 
            ef.*,
            -- Future target value (what we want to predict)
            LEAD(ef.current_value, p_prediction_horizon_hours) OVER (
                PARTITION BY ef.sop_document_id, ef.user_id 
                ORDER BY ef.time
            ) as target_value
        FROM enriched_features ef
    )
    SELECT 
        gen_random_uuid() as feature_id,
        JSONB_BUILD_OBJECT(
            -- Temporal features
            'hour_of_day', tv.hour_of_day,
            'day_of_week', tv.day_of_week,
            'day_of_month', tv.day_of_month,
            'time_period', tv.time_period,
            'day_type', tv.day_type,
            -- Historical features
            'lag_1_value', COALESCE(tv.lag_1_value, tv.current_value),
            'lag_24_value', COALESCE(tv.lag_24_value, tv.current_value),
            'rolling_24h_avg', COALESCE(tv.rolling_24h_avg, tv.current_value),
            'rolling_7d_avg', COALESCE(tv.rolling_7d_avg, tv.current_value),
            'current_value', tv.current_value,
            -- Trend features
            'short_term_trend', COALESCE(tv.current_value - tv.lag_1_value, 0),
            'long_term_trend', COALESCE(tv.current_value - tv.lag_24_value, 0),
            'volatility', ABS(COALESCE(tv.current_value - tv.rolling_24h_avg, 0)),
            -- User features
            'user_performance', COALESCE(tv.overall_performance_score, 0.5),
            'user_skill_match', CASE 
                WHEN tv.skill_proficiency ? tv.sop_document_id::TEXT 
                THEN (tv.skill_proficiency ->> tv.sop_document_id::TEXT)::DECIMAL / 10.0
                ELSE 0.5
            END,
            -- SOP features
            'sop_difficulty', COALESCE(tv.difficulty_level, 5),
            'sop_rating', COALESCE(tv.average_rating, 3.0),
            'sop_success_rate', COALESCE(tv.completion_success_rate, 0.8),
            'sop_estimated_time', COALESCE(tv.estimated_time_minutes, 30)
        ) as features,
        tv.target_value::DECIMAL,
        -- Sample weight based on data quality and recency
        (1.0 / (1.0 + EXTRACT(DAYS FROM CURRENT_DATE - tv.time::DATE)))::DECIMAL as sample_weight
    FROM target_values tv
    WHERE tv.target_value IS NOT NULL
      AND tv.target_value > 0; -- Valid target values only
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- DATA QUALITY AND VALIDATION FUNCTIONS
-- ===========================================

-- Function to validate ML training data quality
CREATE OR REPLACE FUNCTION validate_ml_training_data_quality(
    p_dataset_id UUID
)
RETURNS TABLE (
    validation_metric VARCHAR,
    metric_value DECIMAL,
    status VARCHAR,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH dataset_info AS (
        SELECT * FROM sop_training_datasets WHERE id = p_dataset_id
    ),
    data_quality_checks AS (
        -- Data completeness check
        SELECT 
            'completeness' as metric,
            ds.completeness_score as value,
            CASE 
                WHEN ds.completeness_score >= 95 THEN 'excellent'
                WHEN ds.completeness_score >= 85 THEN 'good'
                WHEN ds.completeness_score >= 70 THEN 'fair'
                ELSE 'poor'
            END as status,
            JSONB_BUILD_OBJECT(
                'total_rows', ds.row_count,
                'null_percentage', ds.null_percentage,
                'duplicate_count', ds.duplicate_count
            ) as details
        FROM dataset_info ds
        
        UNION ALL
        
        -- Data consistency check
        SELECT 
            'consistency' as metric,
            ds.consistency_score as value,
            CASE 
                WHEN ds.consistency_score >= 95 THEN 'excellent'
                WHEN ds.consistency_score >= 85 THEN 'good'
                WHEN ds.consistency_score >= 70 THEN 'fair'
                ELSE 'poor'
            END as status,
            ds.data_quality_report as details
        FROM dataset_info ds
        
        UNION ALL
        
        -- Data validity check
        SELECT 
            'validity' as metric,
            ds.validity_score as value,
            CASE 
                WHEN ds.validity_score >= 95 THEN 'excellent'
                WHEN ds.validity_score >= 85 THEN 'good'
                WHEN ds.validity_score >= 70 THEN 'fair'
                ELSE 'poor'
            END as status,
            JSONB_BUILD_OBJECT(
                'validation_rules_passed', ds.data_quality_report -> 'validation_rules'
            ) as details
        FROM dataset_info ds
    )
    SELECT 
        dqc.metric::VARCHAR as validation_metric,
        dqc.value::DECIMAL as metric_value,
        dqc.status::VARCHAR,
        dqc.details
    FROM data_quality_checks dqc;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ML MODEL PERFORMANCE MONITORING
-- ===========================================

-- Function to calculate model drift metrics
CREATE OR REPLACE FUNCTION calculate_model_drift_metrics(
    p_model_id UUID,
    p_reference_period_days INTEGER DEFAULT 30,
    p_comparison_period_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    drift_metric VARCHAR,
    drift_score DECIMAL,
    drift_detected BOOLEAN,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH reference_data AS (
        SELECT 
            input_features,
            predicted_value,
            actual_value,
            prediction_confidence
        FROM sop_model_predictions
        WHERE model_id = p_model_id
          AND prediction_date >= CURRENT_DATE - INTERVAL '1 day' * (p_reference_period_days + p_comparison_period_days)
          AND prediction_date < CURRENT_DATE - INTERVAL '1 day' * p_comparison_period_days
          AND actual_value IS NOT NULL
    ),
    comparison_data AS (
        SELECT 
            input_features,
            predicted_value,
            actual_value,
            prediction_confidence
        FROM sop_model_predictions
        WHERE model_id = p_model_id
          AND prediction_date >= CURRENT_DATE - INTERVAL '1 day' * p_comparison_period_days
          AND actual_value IS NOT NULL
    ),
    drift_calculations AS (
        -- Prediction drift (distribution of predictions)
        SELECT 
            'prediction_drift' as metric,
            ABS(
                (SELECT AVG(predicted_value) FROM comparison_data) - 
                (SELECT AVG(predicted_value) FROM reference_data)
            ) / NULLIF((SELECT STDDEV(predicted_value) FROM reference_data), 0) as drift_score,
            JSONB_BUILD_OBJECT(
                'reference_mean', (SELECT AVG(predicted_value) FROM reference_data),
                'comparison_mean', (SELECT AVG(predicted_value) FROM comparison_data),
                'reference_std', (SELECT STDDEV(predicted_value) FROM reference_data),
                'comparison_std', (SELECT STDDEV(predicted_value) FROM comparison_data)
            ) as details
        
        UNION ALL
        
        -- Accuracy drift
        SELECT 
            'accuracy_drift' as metric,
            ABS(
                (SELECT AVG(ABS(predicted_value - actual_value)) FROM comparison_data) - 
                (SELECT AVG(ABS(predicted_value - actual_value)) FROM reference_data)
            ) as drift_score,
            JSONB_BUILD_OBJECT(
                'reference_mae', (SELECT AVG(ABS(predicted_value - actual_value)) FROM reference_data),
                'comparison_mae', (SELECT AVG(ABS(predicted_value - actual_value)) FROM comparison_data)
            ) as details
        
        UNION ALL
        
        -- Confidence drift
        SELECT 
            'confidence_drift' as metric,
            ABS(
                (SELECT AVG(prediction_confidence) FROM comparison_data) - 
                (SELECT AVG(prediction_confidence) FROM reference_data)
            ) as drift_score,
            JSONB_BUILD_OBJECT(
                'reference_confidence', (SELECT AVG(prediction_confidence) FROM reference_data),
                'comparison_confidence', (SELECT AVG(prediction_confidence) FROM comparison_data)
            ) as details
    )
    SELECT 
        dc.metric::VARCHAR as drift_metric,
        COALESCE(dc.drift_score, 0)::DECIMAL as drift_score,
        (COALESCE(dc.drift_score, 0) > 0.1)::BOOLEAN as drift_detected, -- Threshold for drift detection
        dc.details
    FROM drift_calculations dc;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- AUTOMATED ML PIPELINE FUNCTIONS
-- ===========================================

-- Function to prepare daily ML aggregation
CREATE OR REPLACE FUNCTION run_daily_ml_aggregation()
RETURNS void AS $$
DECLARE
    restaurant RECORD;
BEGIN
    -- Loop through active restaurants
    FOR restaurant IN 
        SELECT id, name FROM restaurants WHERE is_active = true
    LOOP
        -- Update performance aggregates
        INSERT INTO sop_performance_aggregates (
            restaurant_id,
            sop_document_id,
            metric_type,
            aggregation_period,
            period_start,
            period_end,
            total_executions,
            avg_completion_time_seconds,
            success_rate,
            data_completeness,
            last_calculated_at
        )
        SELECT 
            restaurant.id,
            tsd.sop_document_id,
            tsd.metric_type::performance_metric_type,
            'daily'::aggregation_period,
            DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day'),
            DATE_TRUNC('day', CURRENT_DATE),
            COUNT(*),
            AVG(tsd.value),
            AVG(CASE WHEN tsd.value > 0 THEN 1.0 ELSE 0.0 END),
            AVG(tsd.data_quality_score),
            NOW()
        FROM sop_time_series_data tsd
        WHERE tsd.restaurant_id = restaurant.id
          AND tsd.time >= CURRENT_DATE - INTERVAL '1 day'
          AND tsd.time < CURRENT_DATE
        GROUP BY tsd.sop_document_id, tsd.metric_type
        ON CONFLICT (restaurant_id, sop_document_id, metric_type, aggregation_period, period_start) 
        DO UPDATE SET
            total_executions = EXCLUDED.total_executions,
            avg_completion_time_seconds = EXCLUDED.avg_completion_time_seconds,
            success_rate = EXCLUDED.success_rate,
            data_completeness = EXCLUDED.data_completeness,
            last_calculated_at = EXCLUDED.last_calculated_at;
        
        -- Update user profiles based on recent interactions
        PERFORM update_user_profile_from_interactions(au.id)
        FROM auth_users au
        WHERE au.restaurant_id = restaurant.id;
        
        RAISE NOTICE 'Completed daily ML aggregation for restaurant: %', restaurant.name;
    END LOOP;
    
    -- Refresh materialized views
    PERFORM refresh_performance_analytics_views();
    
    RAISE NOTICE 'Daily ML aggregation completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to detect and log anomalies in ML predictions
CREATE OR REPLACE FUNCTION detect_prediction_anomalies()
RETURNS void AS $$
DECLARE
    model RECORD;
    anomaly_threshold DECIMAL := 0.7; -- Anomaly score threshold
BEGIN
    -- Check active predictive models for anomalies
    FOR model IN 
        SELECT id, model_name, restaurant_id 
        FROM sop_predictive_models 
        WHERE is_active = true AND is_deployed = true
    LOOP
        -- Insert anomalies detected in recent predictions
        INSERT INTO sop_time_series_anomalies (
            restaurant_id,
            anomaly_time,
            metric_type,
            anomaly_type,
            observed_value,
            expected_value,
            anomaly_score,
            detection_algorithm,
            severity_level
        )
        SELECT 
            model.restaurant_id,
            mp.prediction_date,
            'prediction_quality'::time_series_metric,
            'point'::VARCHAR,
            mp.prediction_accuracy,
            0.8, -- Expected baseline accuracy
            mp.anomaly_score,
            'statistical',
            CASE 
                WHEN mp.anomaly_score > 0.9 THEN 'critical'
                WHEN mp.anomaly_score > 0.7 THEN 'high'
                WHEN mp.anomaly_score > 0.5 THEN 'medium'
                ELSE 'low'
            END
        FROM sop_model_predictions mp
        WHERE mp.model_id = model.id
          AND mp.anomaly_score > anomaly_threshold
          AND mp.prediction_date >= CURRENT_DATE - INTERVAL '1 day'
          AND NOT EXISTS (
              SELECT 1 FROM sop_time_series_anomalies sta
              WHERE sta.restaurant_id = model.restaurant_id
                AND sta.anomaly_time = mp.prediction_date
          );
        
        RAISE NOTICE 'Processed anomaly detection for model: %', model.model_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- SCHEDULED JOBS CONFIGURATION
-- ===========================================

-- Note: These would typically be configured as cron jobs or scheduled functions
-- Example configurations:

COMMENT ON FUNCTION run_daily_ml_aggregation() IS 
'Scheduled daily at 2:00 AM: Aggregates ML training data and updates performance metrics';

COMMENT ON FUNCTION detect_prediction_anomalies() IS 
'Scheduled every 4 hours: Detects anomalies in ML model predictions and logs them';

COMMENT ON FUNCTION refresh_performance_analytics_views() IS 
'Scheduled every hour: Refreshes materialized views for performance analytics';

-- ===========================================
-- UTILITY VIEWS FOR ML OPERATIONS
-- ===========================================

-- View for ML model health dashboard
CREATE OR REPLACE VIEW ml_model_health_dashboard AS
SELECT 
    pm.id as model_id,
    pm.model_name,
    pm.restaurant_id,
    r.name as restaurant_name,
    pm.prediction_type,
    pm.algorithm,
    pm.is_deployed,
    pm.current_performance_score,
    pm.last_prediction_date,
    pm.prediction_count,
    pm.average_inference_time_ms,
    -- Recent performance metrics
    mpt.overall_accuracy as recent_accuracy,
    mpt.drift_detected,
    mpt.performance_status,
    -- Alert counts
    (SELECT COUNT(*) FROM sop_time_series_anomalies 
     WHERE restaurant_id = pm.restaurant_id 
       AND anomaly_time >= CURRENT_DATE - INTERVAL '7 days'
       AND severity_level IN ('high', 'critical')) as recent_critical_alerts
FROM sop_predictive_models pm
LEFT JOIN restaurants r ON pm.restaurant_id = r.id
LEFT JOIN sop_model_performance_tracking mpt ON pm.id = mpt.model_id 
    AND mpt.evaluation_date = (
        SELECT MAX(evaluation_date) 
        FROM sop_model_performance_tracking mpt2 
        WHERE mpt2.model_id = pm.id
    )
WHERE pm.is_active = true;

COMMENT ON VIEW ml_model_health_dashboard IS 'Real-time dashboard view for ML model health monitoring';

-- ===========================================
-- DOCUMENTATION AND COMMENTS
-- ===========================================

COMMENT ON FUNCTION prepare_sop_recommendation_training_data IS 'Prepares training dataset for SOP recommendation models with user and content features';
COMMENT ON FUNCTION aggregate_sop_performance_features IS 'Aggregates SOP performance metrics into ML-ready feature vectors';
COMMENT ON FUNCTION generate_ml_feature_matrix IS 'Generates complete feature matrix for predictive modeling with temporal and contextual features';
COMMENT ON FUNCTION validate_ml_training_data_quality IS 'Validates ML training data quality and returns quality metrics';
COMMENT ON FUNCTION calculate_model_drift_metrics IS 'Calculates model drift metrics for performance monitoring';

-- Performance hints
ANALYZE sop_user_interactions;
ANALYZE sop_content_features;
ANALYZE sop_user_profiles;
ANALYZE sop_time_series_data;
ANALYZE sop_model_predictions;