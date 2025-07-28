-- SOP Machine Learning Training Data Tables
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: ML training data collection and model storage for SOP optimization

-- ===========================================
-- ML TRAINING DATA ENUMS
-- ===========================================

-- ML model types
CREATE TYPE ml_model_type AS ENUM (
    'sop_recommendation', 'performance_prediction', 'usage_pattern', 
    'optimization_suggestion', 'anomaly_detection', 'time_series_forecast',
    'classification', 'clustering', 'regression', 'neural_network'
);

-- Training data types
CREATE TYPE training_data_type AS ENUM (
    'sop_usage', 'performance_metrics', 'user_behavior', 'time_patterns',
    'completion_rates', 'error_patterns', 'seasonal_data', 'staff_patterns'
);

-- Model status
CREATE TYPE ml_model_status AS ENUM (
    'training', 'trained', 'deployed', 'retired', 'failed', 'testing'
);

-- Feature importance levels
CREATE TYPE feature_importance AS ENUM ('low', 'medium', 'high', 'critical');

-- ===========================================
-- ML TRAINING DATA TABLES
-- ===========================================

-- ML models registry
CREATE TABLE IF NOT EXISTS sop_ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Model identification
    model_name VARCHAR(255) NOT NULL,
    model_type ml_model_type NOT NULL,
    version VARCHAR(50) DEFAULT '1.0.0',
    description TEXT,
    
    -- Model configuration
    algorithm VARCHAR(100), -- 'random_forest', 'neural_network', 'svm', etc.
    hyperparameters JSONB DEFAULT '{}',
    feature_columns TEXT[], -- Array of column names used as features
    target_column VARCHAR(255), -- Target variable for supervised learning
    
    -- Model metadata
    training_data_size INTEGER DEFAULT 0,
    validation_accuracy DECIMAL(5,2), -- 0-100%
    test_accuracy DECIMAL(5,2), -- 0-100%
    f1_score DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    
    -- Model files and storage
    model_file_path TEXT, -- Path to serialized model
    model_checksum VARCHAR(64), -- SHA-256 hash for integrity
    model_size_bytes BIGINT DEFAULT 0,
    
    -- Training details
    training_started_at TIMESTAMPTZ,
    training_completed_at TIMESTAMPTZ,
    training_duration_seconds INTEGER,
    training_loss DECIMAL(10,6),
    validation_loss DECIMAL(10,6),
    
    -- Deployment
    status ml_model_status DEFAULT 'training',
    deployed_at TIMESTAMPTZ,
    last_prediction_at TIMESTAMPTZ,
    prediction_count INTEGER DEFAULT 0,
    
    -- Performance monitoring
    accuracy_threshold DECIMAL(5,2) DEFAULT 85.0, -- Minimum acceptable accuracy
    drift_threshold DECIMAL(5,2) DEFAULT 5.0, -- Performance degradation threshold
    last_evaluation_at TIMESTAMPTZ,
    current_performance DECIMAL(5,2),
    
    -- Resource requirements
    memory_usage_mb INTEGER DEFAULT 0,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0,
    inference_time_ms DECIMAL(8,3) DEFAULT 0,
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ml_model_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ml_model_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_ml_model_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT unique_model_version UNIQUE (restaurant_id, model_name, version),
    CONSTRAINT valid_accuracy_range CHECK (validation_accuracy IS NULL OR (validation_accuracy >= 0 AND validation_accuracy <= 100))
);

-- Training datasets
CREATE TABLE IF NOT EXISTS sop_training_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Dataset identification
    dataset_name VARCHAR(255) NOT NULL,
    data_type training_data_type NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',
    
    -- Data source information
    source_tables TEXT[], -- Array of source table names
    source_query TEXT, -- SQL query used to generate dataset
    data_collection_start TIMESTAMPTZ,
    data_collection_end TIMESTAMPTZ,
    
    -- Dataset statistics
    row_count INTEGER DEFAULT 0,
    column_count INTEGER DEFAULT 0,
    null_percentage DECIMAL(5,2) DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    
    -- Data quality metrics
    completeness_score DECIMAL(5,2) DEFAULT 100, -- 0-100%
    consistency_score DECIMAL(5,2) DEFAULT 100, -- 0-100%
    validity_score DECIMAL(5,2) DEFAULT 100, -- 0-100%
    data_quality_report JSONB DEFAULT '{}',
    
    -- Feature engineering
    features_extracted JSONB DEFAULT '{}', -- List of engineered features
    feature_selection_method VARCHAR(100), -- 'correlation', 'mutual_info', 'pca', etc.
    dimensionality_reduction JSONB DEFAULT '{}',
    
    -- Dataset splits
    train_split_percentage DECIMAL(5,2) DEFAULT 70.0,
    validation_split_percentage DECIMAL(5,2) DEFAULT 15.0,
    test_split_percentage DECIMAL(5,2) DEFAULT 15.0,
    stratified_split BOOLEAN DEFAULT true,
    
    -- Storage and access
    file_path TEXT, -- Path to dataset file
    file_format VARCHAR(50) DEFAULT 'parquet', -- 'csv', 'parquet', 'json'
    file_size_bytes BIGINT DEFAULT 0,
    compression_type VARCHAR(20), -- 'gzip', 'snappy', 'lz4'
    
    -- Data lineage
    parent_dataset_id UUID, -- Reference to parent dataset if derived
    transformation_applied TEXT, -- Description of transformations
    
    -- Versioning and lifecycle
    is_active BOOLEAN DEFAULT true,
    archived_at TIMESTAMPTZ,
    retention_days INTEGER DEFAULT 365,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_training_dataset_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_dataset_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_training_dataset_parent FOREIGN KEY (parent_dataset_id) REFERENCES sop_training_datasets(id),
    CONSTRAINT valid_split_percentages CHECK (
        train_split_percentage + validation_split_percentage + test_split_percentage = 100.0
    )
);

-- Feature store for reusable ML features
CREATE TABLE IF NOT EXISTS sop_ml_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Feature identification
    feature_name VARCHAR(255) NOT NULL,
    feature_group VARCHAR(100), -- 'user_behavior', 'sop_performance', 'time_patterns'
    description TEXT,
    data_type VARCHAR(50) NOT NULL, -- 'numeric', 'categorical', 'text', 'datetime', 'boolean'
    
    -- Feature computation
    computation_logic TEXT NOT NULL, -- SQL or description of how to compute
    dependencies TEXT[], -- Array of dependent features or tables
    computation_frequency VARCHAR(50) DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly'
    
    -- Feature statistics
    min_value DECIMAL(15,6),
    max_value DECIMAL(15,6),
    mean_value DECIMAL(15,6),
    std_deviation DECIMAL(15,6),
    null_percentage DECIMAL(5,2) DEFAULT 0,
    unique_values_count INTEGER,
    
    -- Feature engineering details
    transformation_type VARCHAR(100), -- 'normalization', 'standardization', 'encoding', 'binning'
    transformation_params JSONB DEFAULT '{}',
    encoding_mapping JSONB DEFAULT '{}', -- For categorical features
    
    -- Feature importance and usage
    importance_score feature_importance DEFAULT 'medium',
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    models_using TEXT[], -- Array of model names using this feature
    
    -- Data quality and monitoring
    drift_detection_enabled BOOLEAN DEFAULT true,
    drift_threshold DECIMAL(5,2) DEFAULT 10.0, -- Percentage change threshold
    last_drift_check_at TIMESTAMPTZ,
    drift_detected BOOLEAN DEFAULT false,
    
    -- Storage and caching
    is_cached BOOLEAN DEFAULT false,
    cache_ttl_hours INTEGER DEFAULT 24,
    last_computed_at TIMESTAMPTZ,
    computation_time_ms INTEGER DEFAULT 0,
    
    -- Validation rules
    validation_rules JSONB DEFAULT '{}', -- Min/max bounds, allowed values, etc.
    validation_status VARCHAR(20) DEFAULT 'valid', -- 'valid', 'invalid', 'warning'
    last_validation_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ml_feature_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ml_feature_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_feature_name UNIQUE (restaurant_id, feature_name)
);

-- ML training jobs and experiments
CREATE TABLE IF NOT EXISTS sop_ml_training_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    model_id UUID,
    dataset_id UUID,
    
    -- Job identification
    job_name VARCHAR(255) NOT NULL,
    experiment_name VARCHAR(255), -- For grouping related experiments
    description TEXT,
    
    -- Training configuration
    algorithm_config JSONB DEFAULT '{}',
    training_parameters JSONB DEFAULT '{}',
    cross_validation_folds INTEGER DEFAULT 5,
    early_stopping_enabled BOOLEAN DEFAULT true,
    early_stopping_patience INTEGER DEFAULT 10,
    
    -- Resource allocation
    max_training_time_minutes INTEGER DEFAULT 60,
    memory_limit_mb INTEGER DEFAULT 4096,
    cpu_cores INTEGER DEFAULT 4,
    gpu_enabled BOOLEAN DEFAULT false,
    
    -- Job execution
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    exit_code INTEGER,
    
    -- Training progress
    current_epoch INTEGER DEFAULT 0,
    total_epochs INTEGER DEFAULT 100,
    current_loss DECIMAL(10,6),
    best_validation_score DECIMAL(10,6),
    epochs_without_improvement INTEGER DEFAULT 0,
    
    -- Results and metrics
    final_metrics JSONB DEFAULT '{}',
    feature_importance JSONB DEFAULT '{}',
    model_artifacts JSONB DEFAULT '{}', -- Paths to generated files
    training_log TEXT, -- Detailed training log
    
    -- Error handling
    error_message TEXT,
    error_traceback TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Monitoring and notifications
    progress_callback_url TEXT,
    notification_emails TEXT[], -- Array of emails for notifications
    slack_webhook_url TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_training_job_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_job_model FOREIGN KEY (model_id) REFERENCES sop_ml_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_job_dataset FOREIGN KEY (dataset_id) REFERENCES sop_training_datasets(id),
    CONSTRAINT fk_training_job_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- ML model predictions and inference logs
CREATE TABLE IF NOT EXISTS sop_ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    model_id UUID NOT NULL,
    
    -- Prediction context
    prediction_type VARCHAR(100), -- 'recommendation', 'classification', 'regression', 'anomaly'
    input_features JSONB NOT NULL, -- Feature values used for prediction
    prediction_result JSONB NOT NULL, -- Model output
    confidence_score DECIMAL(5,4), -- 0-1 confidence score
    
    -- Business context
    sop_document_id UUID, -- If prediction is SOP-related
    user_id UUID, -- User requesting prediction
    session_id TEXT,
    request_context JSONB DEFAULT '{}', -- Additional context
    
    -- Prediction metadata
    model_version VARCHAR(50),
    inference_time_ms DECIMAL(8,3),
    preprocessing_time_ms DECIMAL(8,3),
    postprocessing_time_ms DECIMAL(8,3),
    
    -- Feedback and evaluation
    feedback_provided BOOLEAN DEFAULT false,
    feedback_score INTEGER, -- 1-5 rating
    actual_outcome JSONB, -- Actual result for evaluation
    prediction_accuracy DECIMAL(5,4), -- Accuracy of this specific prediction
    
    -- A/B testing
    experiment_id UUID, -- Reference to A/B test
    control_group BOOLEAN DEFAULT false,
    variant_name VARCHAR(100),
    
    -- Monitoring
    flagged_as_anomaly BOOLEAN DEFAULT false,
    anomaly_score DECIMAL(5,4),
    reviewed_by_human BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_ml_prediction_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ml_prediction_model FOREIGN KEY (model_id) REFERENCES sop_ml_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_ml_prediction_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_ml_prediction_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- ===========================================
-- ML TRAINING DATA INDEXES
-- ===========================================

-- ML models indexes
CREATE INDEX idx_ml_models_restaurant ON sop_ml_models(restaurant_id);
CREATE INDEX idx_ml_models_type ON sop_ml_models(model_type);
CREATE INDEX idx_ml_models_status ON sop_ml_models(status);
CREATE INDEX idx_ml_models_deployed_at ON sop_ml_models(deployed_at) WHERE status = 'deployed';
CREATE INDEX idx_ml_models_performance ON sop_ml_models(current_performance) WHERE status = 'deployed';

-- Training datasets indexes
CREATE INDEX idx_training_datasets_restaurant ON sop_training_datasets(restaurant_id);
CREATE INDEX idx_training_datasets_type ON sop_training_datasets(data_type);
CREATE INDEX idx_training_datasets_active ON sop_training_datasets(is_active) WHERE is_active = true;
CREATE INDEX idx_training_datasets_collection_period ON sop_training_datasets(data_collection_start, data_collection_end);

-- ML features indexes
CREATE INDEX idx_ml_features_restaurant ON sop_ml_features(restaurant_id);
CREATE INDEX idx_ml_features_group ON sop_ml_features(feature_group);
CREATE INDEX idx_ml_features_importance ON sop_ml_features(importance_score);
CREATE INDEX idx_ml_features_active ON sop_ml_features(is_active) WHERE is_active = true;
CREATE INDEX idx_ml_features_last_used ON sop_ml_features(last_used_at);

-- Training jobs indexes
CREATE INDEX idx_training_jobs_restaurant ON sop_ml_training_jobs(restaurant_id);
CREATE INDEX idx_training_jobs_model ON sop_ml_training_jobs(model_id);
CREATE INDEX idx_training_jobs_status ON sop_ml_training_jobs(status);
CREATE INDEX idx_training_jobs_experiment ON sop_ml_training_jobs(experiment_name);
CREATE INDEX idx_training_jobs_created_at ON sop_ml_training_jobs(created_at);

-- ML predictions indexes
CREATE INDEX idx_ml_predictions_restaurant ON sop_ml_predictions(restaurant_id);
CREATE INDEX idx_ml_predictions_model ON sop_ml_predictions(model_id);
CREATE INDEX idx_ml_predictions_type ON sop_ml_predictions(prediction_type);
CREATE INDEX idx_ml_predictions_user ON sop_ml_predictions(user_id);
CREATE INDEX idx_ml_predictions_created_at ON sop_ml_predictions(created_at);
CREATE INDEX idx_ml_predictions_confidence ON sop_ml_predictions(confidence_score);
CREATE INDEX idx_ml_predictions_feedback ON sop_ml_predictions(feedback_provided) WHERE feedback_provided = true;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on ML training tables
ALTER TABLE sop_ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_ml_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_ml_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_ml_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "ML models restaurant isolation"
ON sop_ml_models FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Training datasets restaurant isolation"
ON sop_training_datasets FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "ML features restaurant isolation"
ON sop_ml_features FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Training jobs restaurant isolation"
ON sop_ml_training_jobs FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "ML predictions restaurant isolation"
ON sop_ml_predictions FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_ml_models IS 'Registry of machine learning models with metadata, performance metrics, and deployment status';
COMMENT ON TABLE sop_training_datasets IS 'Training datasets with data quality metrics and feature engineering details';
COMMENT ON TABLE sop_ml_features IS 'Feature store for reusable ML features with importance scores and drift detection';
COMMENT ON TABLE sop_ml_training_jobs IS 'ML training job execution tracking with resource usage and progress monitoring';
COMMENT ON TABLE sop_ml_predictions IS 'ML model inference logs with confidence scores and feedback collection';

-- Performance optimization
ANALYZE sop_ml_models;
ANALYZE sop_training_datasets;
ANALYZE sop_ml_features;
ANALYZE sop_ml_training_jobs;
ANALYZE sop_ml_predictions;