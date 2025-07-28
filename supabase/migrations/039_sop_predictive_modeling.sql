-- Restaurant Krong Thai SOP Management System
-- SOP Predictive Modeling Data Structures
-- Migration 039: Predictive modeling framework for SOP optimization
-- Created: 2025-07-28

-- ===========================================
-- PREDICTIVE MODELING ENUMS
-- ===========================================

-- Prediction types
CREATE TYPE prediction_type AS ENUM (
    'completion_time', 'success_probability', 'quality_score', 'efficiency_rating',
    'resource_demand', 'staff_workload', 'equipment_usage', 'cost_prediction',
    'training_need', 'error_likelihood', 'maintenance_schedule', 'peak_detection'
);

-- Model algorithms
CREATE TYPE model_algorithm AS ENUM (
    'linear_regression', 'logistic_regression', 'random_forest', 'gradient_boosting',
    'neural_network', 'svm', 'decision_tree', 'arima', 'lstm', 'transformer',
    'ensemble', 'bayesian', 'knn', 'naive_bayes'
);

-- Prediction horizon
CREATE TYPE prediction_horizon AS ENUM (
    'short_term', 'medium_term', 'long_term', 'real_time'
);

-- Feature types for modeling
CREATE TYPE feature_type AS ENUM (
    'numerical', 'categorical', 'temporal', 'text', 'boolean', 'geospatial', 'json'
);

-- ===========================================
-- PREDICTIVE MODELING TABLES
-- ===========================================

-- Predictive models registry
CREATE TABLE IF NOT EXISTS sop_predictive_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Model identification
    model_name VARCHAR(255) NOT NULL,
    model_version VARCHAR(50) DEFAULT '1.0.0',
    description TEXT,
    prediction_type prediction_type NOT NULL,
    algorithm model_algorithm NOT NULL,
    
    -- Model configuration
    hyperparameters JSONB DEFAULT '{}',
    feature_configuration JSONB DEFAULT '{}',
    target_variable VARCHAR(100) NOT NULL,
    prediction_horizon prediction_horizon DEFAULT 'short_term',
    
    -- Training metadata
    training_dataset_size INTEGER DEFAULT 0,
    training_features_count INTEGER DEFAULT 0,
    training_start_date TIMESTAMPTZ,
    training_end_date TIMESTAMPTZ,
    training_duration_minutes INTEGER,
    
    -- Model performance metrics
    training_accuracy DECIMAL(5,4), -- 0-1
    validation_accuracy DECIMAL(5,4), -- 0-1
    test_accuracy DECIMAL(5,4), -- 0-1
    cross_validation_score DECIMAL(5,4), -- 0-1
    
    -- Regression metrics (if applicable)
    mae DECIMAL(10,6), -- Mean Absolute Error
    mse DECIMAL(10,6), -- Mean Squared Error
    rmse DECIMAL(10,6), -- Root Mean Squared Error
    r_squared DECIMAL(5,4), -- R-squared coefficient
    
    -- Classification metrics (if applicable)
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    auc_roc DECIMAL(5,4), -- Area Under ROC Curve
    
    -- Business impact metrics
    expected_improvement_percent DECIMAL(5,2),
    cost_savings_estimate DECIMAL(10,2),
    time_savings_estimate_minutes INTEGER,
    risk_reduction_score DECIMAL(5,4),
    
    -- Model storage and deployment
    model_file_path TEXT,
    model_binary BYTEA, -- For small models
    model_size_mb DECIMAL(8,2),
    deployment_config JSONB DEFAULT '{}',
    
    -- Production status
    is_deployed BOOLEAN DEFAULT false,
    deployment_date TIMESTAMPTZ,
    last_prediction_date TIMESTAMPTZ,
    prediction_count INTEGER DEFAULT 0,
    average_inference_time_ms DECIMAL(8,3),
    
    -- Model monitoring
    drift_detection_enabled BOOLEAN DEFAULT true,
    performance_threshold DECIMAL(5,4) DEFAULT 0.8,
    last_performance_check TIMESTAMPTZ,
    current_performance_score DECIMAL(5,4),
    
    -- Retraining schedule
    retrain_frequency_days INTEGER DEFAULT 30,
    next_retrain_date TIMESTAMPTZ,
    auto_retrain_enabled BOOLEAN DEFAULT true,
    retrain_trigger_conditions JSONB DEFAULT '{}',
    
    -- Model lifecycle
    is_active BOOLEAN DEFAULT true,
    retired_date TIMESTAMPTZ,
    retirement_reason TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_pred_model_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_pred_model_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_model_version UNIQUE (restaurant_id, model_name, model_version)
);

-- Feature engineering pipeline
CREATE TABLE IF NOT EXISTS sop_feature_engineering (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    model_id UUID,
    
    -- Feature identification
    feature_name VARCHAR(255) NOT NULL,
    feature_type feature_type NOT NULL,
    source_column VARCHAR(255),
    source_table VARCHAR(255),
    
    -- Feature transformation
    transformation_type VARCHAR(100) NOT NULL, -- 'scaling', 'encoding', 'binning', 'aggregation'
    transformation_function TEXT NOT NULL, -- SQL function or Python code
    transformation_parameters JSONB DEFAULT '{}',
    
    -- Feature statistics
    min_value DECIMAL(15,6),
    max_value DECIMAL(15,6),
    mean_value DECIMAL(15,6),
    std_deviation DECIMAL(15,6),
    null_percentage DECIMAL(5,2) DEFAULT 0,
    cardinality INTEGER, -- Number of unique values
    
    -- Feature importance
    importance_score DECIMAL(5,4) DEFAULT 0, -- 0-1
    correlation_with_target DECIMAL(6,4), -- -1 to 1
    feature_rank INTEGER,
    is_selected BOOLEAN DEFAULT true,
    
    -- Validation rules
    validation_rules JSONB DEFAULT '{}',
    data_quality_score DECIMAL(5,2) DEFAULT 100,
    outlier_detection_enabled BOOLEAN DEFAULT true,
    outlier_threshold DECIMAL(5,2) DEFAULT 3.0, -- Standard deviations
    
    -- Computation metadata
    computation_cost_score INTEGER DEFAULT 1, -- 1-10 scale
    update_frequency VARCHAR(50) DEFAULT 'daily',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_real_time BOOLEAN DEFAULT false,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_feature_eng_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_feature_eng_model FOREIGN KEY (model_id) REFERENCES sop_predictive_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_feature_eng_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_feature_per_model UNIQUE (model_id, feature_name)
);

-- Model predictions storage
CREATE TABLE IF NOT EXISTS sop_model_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    model_id UUID NOT NULL,
    
    -- Prediction context
    sop_document_id UUID,
    user_id UUID,
    prediction_date TIMESTAMPTZ DEFAULT NOW(),
    prediction_horizon_hours INTEGER,
    
    -- Input features
    input_features JSONB NOT NULL,
    feature_vector_hash TEXT, -- Hash of input features for deduplication
    
    -- Prediction output
    predicted_value DECIMAL(15,6) NOT NULL,
    prediction_confidence DECIMAL(5,4), -- 0-1
    prediction_interval_lower DECIMAL(15,6),
    prediction_interval_upper DECIMAL(15,6),
    prediction_probability DECIMAL(5,4), -- For classification models
    
    -- Multiple predictions (for ensemble models)
    ensemble_predictions JSONB DEFAULT '{}',
    prediction_variance DECIMAL(15,6),
    
    -- Model metadata at prediction time
    model_version VARCHAR(50),
    algorithm_used model_algorithm,
    inference_time_ms DECIMAL(8,3),
    
    -- Business context
    business_impact_category VARCHAR(100),
    expected_outcome TEXT,
    decision_threshold DECIMAL(5,4),
    action_recommended TEXT,
    
    -- Validation and feedback
    actual_value DECIMAL(15,6),
    prediction_error DECIMAL(15,6),
    absolute_percentage_error DECIMAL(5,2),
    feedback_provided BOOLEAN DEFAULT false,
    feedback_rating INTEGER, -- 1-5 scale
    feedback_comments TEXT,
    
    -- Monitoring flags
    is_outlier BOOLEAN DEFAULT false,
    outlier_score DECIMAL(5,4),
    requires_review BOOLEAN DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_pred_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_pred_model FOREIGN KEY (model_id) REFERENCES sop_predictive_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_pred_sop_document FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_pred_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_pred_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES auth_users(id)
);

-- Model performance tracking
CREATE TABLE IF NOT EXISTS sop_model_performance_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    model_id UUID NOT NULL,
    
    -- Evaluation period
    evaluation_date DATE NOT NULL,
    evaluation_period_days INTEGER DEFAULT 7,
    prediction_count INTEGER DEFAULT 0,
    
    -- Accuracy metrics
    overall_accuracy DECIMAL(5,4),
    accuracy_by_category JSONB DEFAULT '{}',
    accuracy_trend DECIMAL(6,4), -- Change from previous period
    
    -- Error metrics
    mean_absolute_error DECIMAL(10,6),
    root_mean_squared_error DECIMAL(10,6),
    mean_percentage_error DECIMAL(5,2),
    
    -- Business metrics
    true_positives INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    true_negatives INTEGER DEFAULT 0,
    false_negatives INTEGER DEFAULT 0,
    precision_current DECIMAL(5,4),
    recall_current DECIMAL(5,4),
    f1_current DECIMAL(5,4),
    
    -- Performance degradation detection
    performance_degradation_percent DECIMAL(5,2),
    drift_detected BOOLEAN DEFAULT false,
    drift_score DECIMAL(5,4),
    concept_drift_indicator DECIMAL(5,4),
    data_drift_indicator DECIMAL(5,4),
    
    -- Model reliability
    prediction_consistency_score DECIMAL(5,4), -- How consistent are predictions
    edge_case_handling_score DECIMAL(5,4), -- Performance on unusual inputs
    robustness_score DECIMAL(5,4), -- Overall model robustness
    
    -- Business impact assessment
    cost_savings_realized DECIMAL(10,2),
    time_savings_realized_minutes INTEGER,
    decision_accuracy_improvement DECIMAL(5,2),
    operational_efficiency_gain DECIMAL(5,2),
    
    -- Recommendations
    performance_status VARCHAR(50) DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor'
    recommended_actions JSONB DEFAULT '{}',
    retraining_recommended BOOLEAN DEFAULT false,
    model_retirement_suggested BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_perf_track_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_track_model FOREIGN KEY (model_id) REFERENCES sop_predictive_models(id) ON DELETE CASCADE,
    CONSTRAINT unique_model_evaluation_date UNIQUE (model_id, evaluation_date)
);

-- Prediction scenarios and what-if analysis
CREATE TABLE IF NOT EXISTS sop_prediction_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    model_id UUID NOT NULL,
    
    -- Scenario identification
    scenario_name VARCHAR(255) NOT NULL,
    scenario_description TEXT,
    scenario_type VARCHAR(100), -- 'what_if', 'stress_test', 'optimization', 'planning'
    
    -- Scenario parameters
    input_modifications JSONB NOT NULL, -- Changes to input features
    constraint_conditions JSONB DEFAULT '{}', -- Any constraints to apply
    optimization_objective VARCHAR(100), -- What to optimize for
    
    -- Scenario results
    baseline_prediction DECIMAL(15,6),
    scenario_prediction DECIMAL(15,6),
    prediction_difference DECIMAL(15,6),
    improvement_percentage DECIMAL(5,2),
    
    -- Multiple model comparison
    model_predictions JSONB DEFAULT '{}', -- Results from different models
    consensus_prediction DECIMAL(15,6),
    prediction_agreement_score DECIMAL(5,4), -- How much models agree
    
    -- Business analysis
    business_impact_assessment TEXT,
    implementation_feasibility VARCHAR(50), -- 'easy', 'moderate', 'difficult', 'infeasible'
    estimated_implementation_cost DECIMAL(10,2),
    expected_roi DECIMAL(5,2),
    risk_assessment JSONB DEFAULT '{}',
    
    -- Scenario validation
    is_validated BOOLEAN DEFAULT false,
    validation_method VARCHAR(100),
    validation_results JSONB DEFAULT '{}',
    confidence_in_scenario DECIMAL(5,4),
    
    -- Scheduling and execution
    execution_planned BOOLEAN DEFAULT false,
    planned_execution_date TIMESTAMPTZ,
    actual_execution_date TIMESTAMPTZ,
    execution_results JSONB DEFAULT '{}',
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_scenario_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_scenario_model FOREIGN KEY (model_id) REFERENCES sop_predictive_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_scenario_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Predictive models indexes
CREATE INDEX idx_pred_models_restaurant ON sop_predictive_models(restaurant_id);
CREATE INDEX idx_pred_models_type ON sop_predictive_models(prediction_type);
CREATE INDEX idx_pred_models_deployed ON sop_predictive_models(is_deployed) WHERE is_deployed = true;
CREATE INDEX idx_pred_models_active ON sop_predictive_models(is_active) WHERE is_active = true;
CREATE INDEX idx_pred_models_next_retrain ON sop_predictive_models(next_retrain_date) WHERE auto_retrain_enabled = true;
CREATE INDEX idx_pred_models_performance ON sop_predictive_models(current_performance_score);

-- Feature engineering indexes
CREATE INDEX idx_feature_eng_restaurant ON sop_feature_engineering(restaurant_id);
CREATE INDEX idx_feature_eng_model ON sop_feature_engineering(model_id);
CREATE INDEX idx_feature_eng_importance ON sop_feature_engineering(importance_score DESC);
CREATE INDEX idx_feature_eng_selected ON sop_feature_engineering(is_selected) WHERE is_selected = true;
CREATE INDEX idx_feature_eng_type ON sop_feature_engineering(feature_type);

-- Model predictions indexes
CREATE INDEX idx_pred_restaurant_date ON sop_model_predictions(restaurant_id, prediction_date);
CREATE INDEX idx_pred_model_date ON sop_model_predictions(model_id, prediction_date);
CREATE INDEX idx_pred_sop_document ON sop_model_predictions(sop_document_id);
CREATE INDEX idx_pred_user ON sop_model_predictions(user_id);
CREATE INDEX idx_pred_confidence ON sop_model_predictions(prediction_confidence);
CREATE INDEX idx_pred_outlier ON sop_model_predictions(is_outlier) WHERE is_outlier = true;
CREATE INDEX idx_pred_feedback ON sop_model_predictions(feedback_provided) WHERE feedback_provided = true;
CREATE INDEX idx_pred_review_required ON sop_model_predictions(requires_review) WHERE requires_review = true;

-- Performance tracking indexes
CREATE INDEX idx_perf_track_model_date ON sop_model_performance_tracking(model_id, evaluation_date);
CREATE INDEX idx_perf_track_restaurant ON sop_model_performance_tracking(restaurant_id);
CREATE INDEX idx_perf_track_accuracy ON sop_model_performance_tracking(overall_accuracy);
CREATE INDEX idx_perf_track_drift ON sop_model_performance_tracking(drift_detected) WHERE drift_detected = true;
CREATE INDEX idx_perf_track_status ON sop_model_performance_tracking(performance_status);

-- Prediction scenarios indexes
CREATE INDEX idx_scenarios_restaurant ON sop_prediction_scenarios(restaurant_id);
CREATE INDEX idx_scenarios_model ON sop_prediction_scenarios(model_id);
CREATE INDEX idx_scenarios_type ON sop_prediction_scenarios(scenario_type);
CREATE INDEX idx_scenarios_validated ON sop_prediction_scenarios(is_validated) WHERE is_validated = true;
CREATE INDEX idx_scenarios_execution_planned ON sop_prediction_scenarios(execution_planned) WHERE execution_planned = true;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on predictive modeling tables
ALTER TABLE sop_predictive_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_feature_engineering ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_model_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_model_performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_prediction_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Predictive models restaurant access"
ON sop_predictive_models FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Feature engineering restaurant access"
ON sop_feature_engineering FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Model predictions restaurant access"
ON sop_model_predictions FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Performance tracking restaurant access"
ON sop_model_performance_tracking FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Prediction scenarios restaurant access"
ON sop_prediction_scenarios FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_predictive_models_updated_at 
    BEFORE UPDATE ON sop_predictive_models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_feature_engineering_updated_at 
    BEFORE UPDATE ON sop_feature_engineering 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_prediction_scenarios_updated_at 
    BEFORE UPDATE ON sop_prediction_scenarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- UTILITY FUNCTIONS
-- ===========================================

-- Function to calculate prediction accuracy
CREATE OR REPLACE FUNCTION calculate_prediction_accuracy(
    p_model_id UUID,
    p_days_back INTEGER DEFAULT 7
)
RETURNS DECIMAL AS $$
DECLARE
    accuracy DECIMAL;
BEGIN
    SELECT 
        1 - AVG(ABS(predicted_value - actual_value) / NULLIF(actual_value, 0))
    INTO accuracy
    FROM sop_model_predictions
    WHERE model_id = p_model_id
      AND actual_value IS NOT NULL
      AND prediction_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back;
      
    RETURN COALESCE(accuracy, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to detect model drift
CREATE OR REPLACE FUNCTION detect_model_drift(
    p_model_id UUID,
    p_drift_threshold DECIMAL DEFAULT 0.05
)
RETURNS BOOLEAN AS $$
DECLARE
    current_accuracy DECIMAL;
    baseline_accuracy DECIMAL;
    drift_detected BOOLEAN DEFAULT false;
BEGIN
    -- Get current accuracy (last 7 days)
    current_accuracy := calculate_prediction_accuracy(p_model_id, 7);
    
    -- Get baseline accuracy from model training
    SELECT test_accuracy INTO baseline_accuracy
    FROM sop_predictive_models
    WHERE id = p_model_id;
    
    -- Check if drift exceeds threshold
    IF current_accuracy < baseline_accuracy - p_drift_threshold THEN
        drift_detected := true;
    END IF;
    
    RETURN drift_detected;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_predictive_models IS 'Registry and metadata for predictive models used in SOP optimization';
COMMENT ON TABLE sop_feature_engineering IS 'Feature engineering pipeline configuration and statistics';
COMMENT ON TABLE sop_model_predictions IS 'Storage for model predictions with validation and feedback';
COMMENT ON TABLE sop_model_performance_tracking IS 'Performance monitoring and drift detection for deployed models';
COMMENT ON TABLE sop_prediction_scenarios IS 'What-if analysis and scenario planning using predictive models';

-- Performance optimization
ANALYZE sop_predictive_models;
ANALYZE sop_feature_engineering;
ANALYZE sop_model_predictions;
ANALYZE sop_model_performance_tracking;
ANALYZE sop_prediction_scenarios;