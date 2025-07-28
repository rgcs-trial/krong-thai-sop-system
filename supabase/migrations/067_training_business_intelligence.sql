-- Training Business Intelligence System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive business intelligence and reporting system for training analytics

-- ===========================================
-- BUSINESS INTELLIGENCE ENUMS
-- ===========================================

-- Report types
CREATE TYPE bi_report_type AS ENUM (
    'executive_summary', 'operational_dashboard', 'compliance_report', 
    'performance_analysis', 'cost_analysis', 'roi_analysis', 'trend_analysis',
    'comparative_analysis', 'predictive_analytics', 'custom_report'
);

-- Data granularity levels
CREATE TYPE data_granularity AS ENUM (
    'real_time', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
);

-- Visualization types
CREATE TYPE chart_type AS ENUM (
    'line', 'bar', 'pie', 'scatter', 'heatmap', 'gauge', 'table', 'kpi_card', 'funnel', 'waterfall'
);

-- Metric categories
CREATE TYPE metric_category AS ENUM (
    'engagement', 'performance', 'completion', 'quality', 'efficiency', 
    'cost', 'roi', 'compliance', 'satisfaction', 'productivity'
);

-- ===========================================
-- BUSINESS INTELLIGENCE TABLES
-- ===========================================

-- BI metrics definitions and calculations
CREATE TABLE IF NOT EXISTS training_bi_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Metric identification
    metric_id VARCHAR(128) NOT NULL UNIQUE,
    metric_name VARCHAR(200) NOT NULL,
    display_name JSONB NOT NULL, -- {"en": "English Name", "fr": "French Name"}
    description JSONB,
    
    -- Metric categorization
    metric_category metric_category NOT NULL,
    business_domain VARCHAR(100), -- 'training', 'compliance', 'performance', etc.
    metric_type VARCHAR(50) NOT NULL, -- 'count', 'percentage', 'average', 'sum', 'ratio'
    
    -- Calculation definition
    calculation_query TEXT NOT NULL, -- SQL query to calculate the metric
    calculation_parameters JSONB DEFAULT '{}', -- Parameters for the query
    aggregation_method VARCHAR(50) DEFAULT 'sum', -- sum, avg, count, min, max
    
    -- Data requirements
    required_tables TEXT[] NOT NULL,
    required_columns TEXT[] NOT NULL,
    data_freshness_hours INTEGER DEFAULT 24, -- How fresh the data should be
    
    -- Display configuration
    display_format VARCHAR(50) DEFAULT 'number', -- number, percentage, currency, duration
    decimal_places INTEGER DEFAULT 2,
    unit_of_measure VARCHAR(50),
    target_value DECIMAL(15,4), -- Target or benchmark value
    threshold_warning DECIMAL(15,4), -- Warning threshold
    threshold_critical DECIMAL(15,4), -- Critical threshold
    
    -- Visualization settings
    default_chart_type chart_type DEFAULT 'kpi_card',
    color_scheme JSONB DEFAULT '{}',
    visualization_config JSONB DEFAULT '{}',
    
    -- Business context
    business_impact_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    kpi_tier INTEGER DEFAULT 3 CHECK (kpi_tier BETWEEN 1 AND 3), -- 1=Executive, 2=Operational, 3=Tactical
    stakeholder_groups TEXT[] DEFAULT '{}', -- 'executives', 'managers', 'staff', 'regulators'
    
    -- Data lineage and quality
    data_sources JSONB NOT NULL, -- Source tables and transformations
    data_quality_score INTEGER DEFAULT 100 CHECK (data_quality_score BETWEEN 0 AND 100),
    last_quality_check TIMESTAMPTZ,
    calculation_complexity INTEGER DEFAULT 1 CHECK (calculation_complexity BETWEEN 1 AND 5),
    
    -- Lifecycle management
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0',
    deprecated_at TIMESTAMPTZ,
    replacement_metric_id UUID,
    
    -- Access control
    visibility_level VARCHAR(20) DEFAULT 'internal', -- public, internal, restricted, confidential
    allowed_roles TEXT[] DEFAULT '{admin,manager}',
    data_sensitivity_level VARCHAR(20) DEFAULT 'normal', -- low, normal, high, sensitive
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL,
    last_modified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bi_metrics_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_metrics_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_metrics_replacement FOREIGN KEY (replacement_metric_id) REFERENCES training_bi_metrics(id)
);

-- BI reports and dashboards
CREATE TABLE IF NOT EXISTS training_bi_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Report identification
    report_id VARCHAR(128) NOT NULL UNIQUE,
    report_name VARCHAR(200) NOT NULL,
    display_name JSONB NOT NULL,
    description JSONB,
    
    -- Report configuration
    report_type bi_report_type NOT NULL,
    report_category VARCHAR(100), -- 'operational', 'strategic', 'compliance', 'financial'
    target_audience TEXT[] NOT NULL, -- 'executives', 'managers', 'staff', 'board'
    
    -- Content structure
    sections JSONB NOT NULL, -- Report sections and their configurations
    metrics_included UUID[] NOT NULL, -- References to training_bi_metrics
    charts_config JSONB DEFAULT '{}', -- Chart configurations and layouts
    
    -- Data parameters
    default_time_period VARCHAR(50) DEFAULT '30d', -- 1d, 7d, 30d, 90d, 1y, custom
    default_granularity data_granularity DEFAULT 'daily',
    default_filters JSONB DEFAULT '{}',
    dynamic_filtering_enabled BOOLEAN DEFAULT true,
    
    -- Scheduling and automation
    auto_generation_enabled BOOLEAN DEFAULT false,
    generation_schedule VARCHAR(100), -- Cron expression
    next_generation_at TIMESTAMPTZ,
    last_generated_at TIMESTAMPTZ,
    
    -- Distribution settings
    auto_distribution_enabled BOOLEAN DEFAULT false,
    distribution_list JSONB DEFAULT '{}', -- Email addresses, Slack channels, etc.
    distribution_formats TEXT[] DEFAULT '{pdf}', -- pdf, excel, csv, json
    
    -- Performance and caching
    cache_enabled BOOLEAN DEFAULT true,
    cache_duration_hours INTEGER DEFAULT 4,
    generation_timeout_minutes INTEGER DEFAULT 30,
    max_data_points INTEGER DEFAULT 10000,
    
    -- Access control and sharing
    is_public BOOLEAN DEFAULT false,
    sharing_enabled BOOLEAN DEFAULT true,
    allowed_roles TEXT[] DEFAULT '{admin,manager}',
    allowed_restaurants UUID[] DEFAULT '{}',
    
    -- Usage tracking
    view_count BIGINT DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    generation_count BIGINT DEFAULT 0,
    average_generation_time_seconds INTEGER DEFAULT 0,
    
    -- Quality and validation
    data_quality_threshold INTEGER DEFAULT 90, -- Minimum data quality score required
    validation_rules JSONB DEFAULT '{}',
    last_validation_at TIMESTAMPTZ,
    validation_status VARCHAR(20) DEFAULT 'pending',
    
    -- Lifecycle management
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, archived, deprecated
    version VARCHAR(20) DEFAULT '1.0',
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_properties JSONB DEFAULT '{}',
    created_by UUID NOT NULL,
    last_modified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bi_reports_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_reports_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_reports_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_cache_duration CHECK (NOT cache_enabled OR cache_duration_hours > 0),
    CONSTRAINT valid_generation_timeout CHECK (generation_timeout_minutes > 0),
    CONSTRAINT valid_data_quality_threshold CHECK (data_quality_threshold BETWEEN 0 AND 100)
);

-- BI data warehouse (aggregated metrics storage)
CREATE TABLE IF NOT EXISTS training_bi_data_warehouse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Data identification
    metric_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Time dimensions
    timestamp TIMESTAMPTZ NOT NULL,
    date_dimension DATE GENERATED ALWAYS AS (timestamp::DATE) STORED,
    hour_dimension INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM timestamp)) STORED,
    day_of_week INTEGER GENERATED ALWAYS AS (EXTRACT(DOW FROM timestamp)) STORED,
    month_dimension INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM timestamp)) STORED,
    quarter_dimension INTEGER GENERATED ALWAYS AS (EXTRACT(QUARTER FROM timestamp)) STORED,
    year_dimension INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM timestamp)) STORED,
    
    -- Metric values
    metric_value DECIMAL(15,4) NOT NULL,
    previous_value DECIMAL(15,4), -- Previous period value for comparison
    target_value DECIMAL(15,4), -- Target or benchmark value
    
    -- Aggregation levels
    raw_value DECIMAL(15,4), -- Original unaggregated value
    hourly_avg DECIMAL(15,4),
    daily_avg DECIMAL(15,4),
    weekly_avg DECIMAL(15,4),
    monthly_avg DECIMAL(15,4),
    
    -- Statistical measures
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    std_deviation DECIMAL(15,4),
    variance DECIMAL(15,4),
    percentile_25 DECIMAL(15,4),
    percentile_50 DECIMAL(15,4), -- Median
    percentile_75 DECIMAL(15,4),
    
    -- Categorical dimensions
    user_role VARCHAR(50),
    training_category VARCHAR(100),
    difficulty_level INTEGER,
    business_unit VARCHAR(100),
    geographic_region VARCHAR(100),
    
    -- Data quality and lineage
    data_quality_score INTEGER DEFAULT 100 CHECK (data_quality_score BETWEEN 0 AND 100),
    source_system VARCHAR(100) DEFAULT 'training_system',
    calculation_method VARCHAR(100),
    data_freshness_minutes INTEGER,
    
    -- Flags and indicators
    is_anomaly BOOLEAN DEFAULT false,
    anomaly_score DECIMAL(5,2),
    is_forecast BOOLEAN DEFAULT false, -- True for predicted/forecasted values
    confidence_interval DECIMAL(5,2), -- For forecasted values
    
    -- Change tracking
    period_over_period_change DECIMAL(15,4), -- Change from previous period
    period_over_period_change_percent DECIMAL(5,2),
    year_over_year_change DECIMAL(15,4),
    year_over_year_change_percent DECIMAL(5,2),
    
    -- Metadata
    calculation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    etl_batch_id VARCHAR(128),
    source_record_count INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bi_warehouse_metric FOREIGN KEY (metric_id) REFERENCES training_bi_metrics(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_warehouse_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT valid_hour CHECK (hour_dimension BETWEEN 0 AND 23),
    CONSTRAINT valid_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT valid_month CHECK (month_dimension BETWEEN 1 AND 12),
    CONSTRAINT valid_quarter CHECK (quarter_dimension BETWEEN 1 AND 4)
);

-- Create partitioning for data warehouse (by date)
CREATE INDEX idx_bi_warehouse_date_metric ON training_bi_data_warehouse(date_dimension, metric_id, restaurant_id);

-- BI insights and analysis results
CREATE TABLE IF NOT EXISTS training_bi_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Insight identification
    insight_id VARCHAR(128) NOT NULL UNIQUE,
    insight_title VARCHAR(300) NOT NULL,
    insight_description TEXT NOT NULL,
    
    -- Insight categorization
    insight_type VARCHAR(50) NOT NULL, -- 'trend', 'anomaly', 'correlation', 'prediction', 'recommendation'
    insight_category metric_category NOT NULL,
    business_impact_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Analysis scope
    restaurant_id UUID,
    analysis_period_start TIMESTAMPTZ NOT NULL,
    analysis_period_end TIMESTAMPTZ NOT NULL,
    metrics_analyzed UUID[] NOT NULL,
    
    -- Insight content
    key_findings JSONB NOT NULL, -- Structured findings data
    statistical_significance DECIMAL(5,4), -- P-value or confidence level
    confidence_level DECIMAL(5,2) DEFAULT 95.0,
    
    -- Recommendations and actions
    recommendations JSONB DEFAULT '[]',
    suggested_actions JSONB DEFAULT '[]',
    expected_impact TEXT,
    implementation_complexity VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    
    -- Supporting data
    supporting_charts JSONB DEFAULT '{}',
    data_visualizations JSONB DEFAULT '{}',
    related_metrics JSONB DEFAULT '{}',
    comparative_analysis JSONB DEFAULT '{}',
    
    -- Validation and quality
    insight_quality_score INTEGER DEFAULT 75 CHECK (insight_quality_score BETWEEN 0 AND 100),
    validation_method VARCHAR(100),
    peer_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    
    -- Lifecycle and tracking
    status VARCHAR(50) DEFAULT 'active', -- active, implemented, dismissed, expired
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    
    -- Impact tracking
    implemented BOOLEAN DEFAULT false,
    implementation_date DATE,
    actual_impact_description TEXT,
    impact_measurement JSONB DEFAULT '{}',
    
    -- Generation metadata
    generation_method VARCHAR(50) DEFAULT 'automated', -- automated, manual, hybrid
    algorithm_used VARCHAR(100),
    generation_duration_seconds INTEGER,
    data_points_analyzed BIGINT,
    
    -- Access and sharing
    visibility_level VARCHAR(20) DEFAULT 'internal', -- public, internal, restricted
    shared_with_roles TEXT[] DEFAULT '{admin,manager}',
    notification_sent BOOLEAN DEFAULT false,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_attributes JSONB DEFAULT '{}',
    generated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bi_insights_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_insights_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_insights_generated_by FOREIGN KEY (generated_by) REFERENCES auth_users(id),
    CONSTRAINT valid_analysis_period CHECK (analysis_period_start <= analysis_period_end),
    CONSTRAINT valid_confidence_level CHECK (confidence_level BETWEEN 0 AND 100),
    CONSTRAINT valid_significance CHECK (statistical_significance IS NULL OR (statistical_significance >= 0 AND statistical_significance <= 1))
);

-- BI advanced analytics and ML models
CREATE TABLE IF NOT EXISTS training_bi_ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Model identification
    model_id VARCHAR(128) NOT NULL UNIQUE,
    model_name VARCHAR(200) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'regression', 'classification', 'clustering', 'forecasting', 'anomaly_detection'
    description TEXT,
    
    -- Model configuration
    algorithm VARCHAR(100) NOT NULL, -- 'linear_regression', 'random_forest', 'neural_network', etc.
    hyperparameters JSONB DEFAULT '{}',
    feature_columns TEXT[] NOT NULL,
    target_column VARCHAR(100),
    
    -- Training data
    training_data_query TEXT NOT NULL,
    training_period_start TIMESTAMPTZ,
    training_period_end TIMESTAMPTZ,
    training_data_size BIGINT,
    
    -- Model performance
    accuracy_score DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    r_squared DECIMAL(5,4),
    rmse DECIMAL(15,4),
    mae DECIMAL(15,4),
    
    -- Cross-validation results
    cv_scores DECIMAL(5,4)[],
    cv_mean DECIMAL(5,4),
    cv_std DECIMAL(5,4),
    
    -- Feature importance
    feature_importance JSONB DEFAULT '{}',
    selected_features TEXT[],
    feature_selection_method VARCHAR(100),
    
    -- Model lifecycle
    training_status VARCHAR(50) DEFAULT 'pending', -- pending, training, completed, failed, deployed
    trained_at TIMESTAMPTZ,
    training_duration_seconds INTEGER,
    deployed_at TIMESTAMPTZ,
    last_prediction_at TIMESTAMPTZ,
    
    -- Versioning and updates
    version VARCHAR(20) DEFAULT '1.0',
    parent_model_id UUID,
    is_production BOOLEAN DEFAULT false,
    auto_retrain_enabled BOOLEAN DEFAULT false,
    retrain_frequency_days INTEGER DEFAULT 30,
    
    -- Performance monitoring
    prediction_count BIGINT DEFAULT 0,
    prediction_accuracy_drift DECIMAL(5,4),
    data_drift_score DECIMAL(5,4),
    model_drift_threshold DECIMAL(5,4) DEFAULT 0.1,
    
    -- Business application
    use_cases TEXT[] DEFAULT '{}',
    business_value_description TEXT,
    stakeholders TEXT[] DEFAULT '{}',
    
    -- Technical metadata
    model_artifact_location TEXT, -- Path to serialized model
    model_size_bytes BIGINT,
    inference_time_ms DECIMAL(10,2),
    memory_usage_mb DECIMAL(10,2),
    
    -- Access control
    is_active BOOLEAN DEFAULT true,
    access_level VARCHAR(20) DEFAULT 'internal', -- public, internal, restricted
    allowed_users UUID[] DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL,
    last_modified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bi_ml_models_parent FOREIGN KEY (parent_model_id) REFERENCES training_bi_ml_models(id),
    CONSTRAINT fk_bi_ml_models_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_ml_models_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id),
    CONSTRAINT valid_performance_scores CHECK (
        (accuracy_score IS NULL OR (accuracy_score >= 0 AND accuracy_score <= 1)) AND
        (precision_score IS NULL OR (precision_score >= 0 AND precision_score <= 1)) AND
        (recall_score IS NULL OR (recall_score >= 0 AND recall_score <= 1)) AND
        (r_squared IS NULL OR r_squared >= 0)
    ),
    CONSTRAINT valid_drift_threshold CHECK (model_drift_threshold > 0 AND model_drift_threshold <= 1)
);

-- BI custom queries and analysis
CREATE TABLE IF NOT EXISTS training_bi_custom_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Query identification
    query_id VARCHAR(128) NOT NULL UNIQUE,
    query_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Query definition
    sql_query TEXT NOT NULL,
    query_parameters JSONB DEFAULT '{}',
    query_type VARCHAR(50) DEFAULT 'analytical', -- analytical, operational, diagnostic, exploratory
    
    -- Execution configuration
    timeout_seconds INTEGER DEFAULT 300,
    max_rows INTEGER DEFAULT 10000,
    cache_enabled BOOLEAN DEFAULT true,
    cache_duration_minutes INTEGER DEFAULT 60,
    
    -- Data governance
    data_sources TEXT[] NOT NULL,
    data_sensitivity_level VARCHAR(20) DEFAULT 'normal', -- low, normal, high, sensitive
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    -- Usage tracking
    execution_count BIGINT DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    average_execution_time_seconds INTEGER DEFAULT 0,
    total_execution_time_seconds BIGINT DEFAULT 0,
    
    -- Performance metrics
    query_complexity_score INTEGER DEFAULT 1 CHECK (query_complexity_score BETWEEN 1 AND 10),
    estimated_cost DECIMAL(10,4), -- Query execution cost estimate
    resource_usage JSONB DEFAULT '{}',
    
    -- Results and output
    last_result_count BIGINT,
    last_result_size_bytes BIGINT,
    output_format VARCHAR(50) DEFAULT 'json', -- json, csv, excel, pdf
    visualization_config JSONB DEFAULT '{}',
    
    -- Scheduling and automation
    scheduled_execution BOOLEAN DEFAULT false,
    schedule_expression VARCHAR(100), -- Cron expression
    next_execution_at TIMESTAMPTZ,
    
    -- Quality and validation
    query_validation_status VARCHAR(20) DEFAULT 'pending', -- pending, valid, invalid, warning
    validation_errors JSONB DEFAULT '[]',
    last_validated_at TIMESTAMPTZ,
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    allowed_roles TEXT[] DEFAULT '{admin}',
    allowed_users UUID[] DEFAULT '{}',
    restaurant_access_level VARCHAR(20) DEFAULT 'own', -- own, all, specific
    allowed_restaurants UUID[] DEFAULT '{}',
    
    -- Lifecycle management
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, deprecated, archived
    version VARCHAR(20) DEFAULT '1.0',
    deprecated_at TIMESTAMPTZ,
    replacement_query_id UUID,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    business_purpose TEXT,
    created_by UUID NOT NULL,
    last_modified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_bi_queries_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_queries_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_queries_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_bi_queries_replacement FOREIGN KEY (replacement_query_id) REFERENCES training_bi_custom_queries(id),
    CONSTRAINT valid_timeout CHECK (timeout_seconds > 0),
    CONSTRAINT valid_max_rows CHECK (max_rows > 0),
    CONSTRAINT valid_cache_duration CHECK (NOT cache_enabled OR cache_duration_minutes > 0)
);

-- ===========================================
-- BUSINESS INTELLIGENCE INDEXES
-- ===========================================

-- BI metrics indexes
CREATE UNIQUE INDEX idx_bi_metrics_metric_id ON training_bi_metrics(metric_id);
CREATE INDEX idx_bi_metrics_category ON training_bi_metrics(metric_category);
CREATE INDEX idx_bi_metrics_business_domain ON training_bi_metrics(business_domain);
CREATE INDEX idx_bi_metrics_active ON training_bi_metrics(is_active) WHERE is_active = true;
CREATE INDEX idx_bi_metrics_kpi_tier ON training_bi_metrics(kpi_tier);
CREATE INDEX idx_bi_metrics_visibility ON training_bi_metrics(visibility_level);

-- BI reports indexes
CREATE UNIQUE INDEX idx_bi_reports_report_id ON training_bi_reports(report_id);
CREATE INDEX idx_bi_reports_type ON training_bi_reports(report_type);
CREATE INDEX idx_bi_reports_category ON training_bi_reports(report_category);
CREATE INDEX idx_bi_reports_status ON training_bi_reports(status);
CREATE INDEX idx_bi_reports_auto_generation ON training_bi_reports(auto_generation_enabled) WHERE auto_generation_enabled = true;
CREATE INDEX idx_bi_reports_next_generation ON training_bi_reports(next_generation_at) WHERE auto_generation_enabled = true;
CREATE INDEX idx_bi_reports_last_viewed ON training_bi_reports(last_viewed_at DESC);

-- Data warehouse indexes
CREATE INDEX idx_bi_warehouse_metric_date ON training_bi_data_warehouse(metric_id, date_dimension DESC);
CREATE INDEX idx_bi_warehouse_restaurant_date ON training_bi_data_warehouse(restaurant_id, date_dimension DESC);
CREATE INDEX idx_bi_warehouse_timestamp ON training_bi_data_warehouse(timestamp DESC);
CREATE INDEX idx_bi_warehouse_anomaly ON training_bi_data_warehouse(is_anomaly) WHERE is_anomaly = true;
CREATE INDEX idx_bi_warehouse_forecast ON training_bi_data_warehouse(is_forecast) WHERE is_forecast = true;
CREATE INDEX idx_bi_warehouse_time_dimensions ON training_bi_data_warehouse(year_dimension, quarter_dimension, month_dimension);

-- BI insights indexes
CREATE UNIQUE INDEX idx_bi_insights_insight_id ON training_bi_insights(insight_id);
CREATE INDEX idx_bi_insights_restaurant ON training_bi_insights(restaurant_id);
CREATE INDEX idx_bi_insights_type ON training_bi_insights(insight_type);
CREATE INDEX idx_bi_insights_category ON training_bi_insights(insight_category);
CREATE INDEX idx_bi_insights_status ON training_bi_insights(status);
CREATE INDEX idx_bi_insights_impact_level ON training_bi_insights(business_impact_level);
CREATE INDEX idx_bi_insights_priority ON training_bi_insights(priority_level);
CREATE INDEX idx_bi_insights_follow_up ON training_bi_insights(follow_up_required) WHERE follow_up_required = true;
CREATE INDEX idx_bi_insights_analysis_period ON training_bi_insights(analysis_period_start, analysis_period_end);

-- ML models indexes
CREATE UNIQUE INDEX idx_bi_ml_models_model_id ON training_bi_ml_models(model_id);
CREATE INDEX idx_bi_ml_models_type ON training_bi_ml_models(model_type);
CREATE INDEX idx_bi_ml_models_algorithm ON training_bi_ml_models(algorithm);
CREATE INDEX idx_bi_ml_models_status ON training_bi_ml_models(training_status);
CREATE INDEX idx_bi_ml_models_production ON training_bi_ml_models(is_production) WHERE is_production = true;
CREATE INDEX idx_bi_ml_models_active ON training_bi_ml_models(is_active) WHERE is_active = true;
CREATE INDEX idx_bi_ml_models_retrain ON training_bi_ml_models(auto_retrain_enabled) WHERE auto_retrain_enabled = true;

-- Custom queries indexes
CREATE UNIQUE INDEX idx_bi_queries_query_id ON training_bi_custom_queries(query_id);
CREATE INDEX idx_bi_queries_type ON training_bi_custom_queries(query_type);
CREATE INDEX idx_bi_queries_status ON training_bi_custom_queries(status);
CREATE INDEX idx_bi_queries_scheduled ON training_bi_custom_queries(scheduled_execution) WHERE scheduled_execution = true;
CREATE INDEX idx_bi_queries_next_execution ON training_bi_custom_queries(next_execution_at) WHERE scheduled_execution = true;
CREATE INDEX idx_bi_queries_complexity ON training_bi_custom_queries(query_complexity_score);

-- JSONB indexes for complex queries
CREATE INDEX idx_bi_metrics_calculation_params ON training_bi_metrics USING GIN(calculation_parameters);
CREATE INDEX idx_bi_reports_sections ON training_bi_reports USING GIN(sections);
CREATE INDEX idx_bi_warehouse_metric_metadata ON training_bi_data_warehouse USING GIN(CASE WHEN metric_value IS NOT NULL THEN jsonb_build_object('value', metric_value) ELSE NULL END);
CREATE INDEX idx_bi_insights_key_findings ON training_bi_insights USING GIN(key_findings);
CREATE INDEX idx_bi_ml_models_hyperparameters ON training_bi_ml_models USING GIN(hyperparameters);
CREATE INDEX idx_bi_queries_parameters ON training_bi_custom_queries USING GIN(query_parameters);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on BI tables
ALTER TABLE training_bi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_bi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_bi_data_warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_bi_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_bi_ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_bi_custom_queries ENABLE ROW LEVEL SECURITY;

-- Admin and manager access policies
CREATE POLICY "BI metrics admin manager access"
ON training_bi_metrics FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "BI reports restaurant access"
ON training_bi_reports FOR ALL TO authenticated
USING (
    is_public = true OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND (
            role IN ('admin', 'manager') OR
            (SELECT role FROM auth_users WHERE id = auth.uid()) = ANY(allowed_roles)
        )
    )
);

CREATE POLICY "BI warehouse restaurant isolation"
ON training_bi_data_warehouse FOR ALL TO authenticated
USING (
    restaurant_id IS NULL OR 
    restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

CREATE POLICY "BI insights restaurant access"
ON training_bi_insights FOR ALL TO authenticated
USING (
    restaurant_id IS NULL OR 
    restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "ML models admin access"
ON training_bi_ml_models FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role = 'admin'
    ) OR
    auth.uid() = ANY(allowed_users)
);

CREATE POLICY "Custom queries access control"
ON training_bi_custom_queries FOR ALL TO authenticated
USING (
    is_public = true OR
    created_by = auth.uid() OR
    auth.uid() = ANY(allowed_users) OR
    (SELECT role FROM auth_users WHERE id = auth.uid()) = ANY(allowed_roles) OR
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- ===========================================
-- BUSINESS INTELLIGENCE FUNCTIONS
-- ===========================================

-- Function to calculate metric values
CREATE OR REPLACE FUNCTION calculate_bi_metric(
    p_metric_id UUID,
    p_restaurant_id UUID DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS DECIMAL(15,4) AS $$
DECLARE
    metric_record RECORD;
    metric_result DECIMAL(15,4);
    dynamic_query TEXT;
BEGIN
    -- Get metric definition
    SELECT * INTO metric_record
    FROM training_bi_metrics
    WHERE id = p_metric_id AND is_active = true;
    
    IF metric_record.id IS NULL THEN
        RAISE EXCEPTION 'Metric not found or inactive: %', p_metric_id;
    END IF;
    
    -- Build dynamic query with parameters
    dynamic_query := metric_record.calculation_query;
    
    -- Replace common parameters
    dynamic_query := REPLACE(dynamic_query, '${restaurant_id}', 
        CASE WHEN p_restaurant_id IS NULL THEN 'NULL' ELSE '''' || p_restaurant_id::TEXT || '''::UUID' END);
    dynamic_query := REPLACE(dynamic_query, '${start_date}', '''' || p_start_date::TEXT || '''::TIMESTAMPTZ');
    dynamic_query := REPLACE(dynamic_query, '${end_date}', '''' || p_end_date::TEXT || '''::TIMESTAMPTZ');
    
    -- Execute the query
    EXECUTE dynamic_query INTO metric_result;
    
    -- Store result in data warehouse
    INSERT INTO training_bi_data_warehouse (
        metric_id,
        restaurant_id,
        timestamp,
        metric_value,
        raw_value,
        data_quality_score,
        calculation_method,
        source_system
    ) VALUES (
        p_metric_id,
        p_restaurant_id,
        NOW(),
        metric_result,
        metric_result,
        100,
        'automated_calculation',
        'training_system'
    );
    
    RETURN COALESCE(metric_result, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate business insights
CREATE OR REPLACE FUNCTION generate_training_insights(
    p_restaurant_id UUID DEFAULT NULL,
    p_analysis_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    insights_generated INTEGER := 0;
    analysis_start TIMESTAMPTZ;
    analysis_end TIMESTAMPTZ;
    completion_rate DECIMAL(5,2);
    prev_completion_rate DECIMAL(5,2);
    assessment_pass_rate DECIMAL(5,2);
    trend_direction TEXT;
    insight_record RECORD;
BEGIN
    analysis_end := NOW();
    analysis_start := analysis_end - (p_analysis_days || ' days')::INTERVAL;
    
    -- Calculate current training completion rate
    SELECT AVG(
        CASE WHEN status = 'completed' THEN 100.0 ELSE 0.0 END
    ) INTO completion_rate
    FROM user_training_progress utp
    JOIN auth_users au ON utp.user_id = au.id
    WHERE (p_restaurant_id IS NULL OR au.restaurant_id = p_restaurant_id)
    AND utp.updated_at >= analysis_start;
    
    -- Calculate previous period completion rate
    SELECT AVG(
        CASE WHEN status = 'completed' THEN 100.0 ELSE 0.0 END
    ) INTO prev_completion_rate
    FROM user_training_progress utp
    JOIN auth_users au ON utp.user_id = au.id
    WHERE (p_restaurant_id IS NULL OR au.restaurant_id = p_restaurant_id)
    AND utp.updated_at BETWEEN (analysis_start - (p_analysis_days || ' days')::INTERVAL) AND analysis_start;
    
    -- Determine trend
    trend_direction := CASE
        WHEN completion_rate > prev_completion_rate + 5 THEN 'improving'
        WHEN completion_rate < prev_completion_rate - 5 THEN 'declining'
        ELSE 'stable'
    END;
    
    -- Generate completion rate insight
    IF completion_rate IS NOT NULL THEN
        INSERT INTO training_bi_insights (
            insight_id,
            insight_title,
            insight_description,
            insight_type,
            insight_category,
            business_impact_level,
            restaurant_id,
            analysis_period_start,
            analysis_period_end,
            metrics_analyzed,
            key_findings,
            recommendations,
            confidence_level,
            insight_quality_score,
            generation_method,
            generated_by
        ) VALUES (
            'completion_rate_' || TO_CHAR(NOW(), 'YYYYMMDD') || '_' || encode(gen_random_bytes(4), 'hex'),
            'Training Completion Rate Trend Analysis',
            'Analysis of training completion rates over the last ' || p_analysis_days || ' days showing ' || trend_direction || ' trend',
            'trend',
            'completion',
            CASE 
                WHEN completion_rate < 50 THEN 'critical'
                WHEN completion_rate < 70 THEN 'high'
                ELSE 'medium'
            END,
            p_restaurant_id,
            analysis_start,
            analysis_end,
            ARRAY[(SELECT id FROM training_bi_metrics WHERE metric_id = 'training_completion_rate' LIMIT 1)],
            jsonb_build_object(
                'current_completion_rate', completion_rate,
                'previous_completion_rate', prev_completion_rate,
                'trend_direction', trend_direction,
                'period_change', completion_rate - COALESCE(prev_completion_rate, 0),
                'analysis_period_days', p_analysis_days
            ),
            CASE trend_direction
                WHEN 'declining' THEN jsonb_build_array(
                    'Review training content engagement',
                    'Identify barriers to completion',
                    'Consider additional support or incentives',
                    'Analyze completion patterns by user role'
                )
                WHEN 'improving' THEN jsonb_build_array(
                    'Continue current training strategies',
                    'Document successful practices',
                    'Consider expanding successful programs'
                )
                ELSE jsonb_build_array(
                    'Monitor for changes',
                    'Benchmark against industry standards'
                )
            END,
            95.0,
            85,
            'automated',
            '00000000-0000-0000-0000-000000000000'::UUID
        );
        
        insights_generated := insights_generated + 1;
    END IF;
    
    -- Calculate assessment pass rate
    SELECT AVG(
        CASE WHEN status = 'passed' THEN 100.0 ELSE 0.0 END
    ) INTO assessment_pass_rate
    FROM training_assessments ta
    JOIN auth_users au ON ta.user_id = au.id
    WHERE (p_restaurant_id IS NULL OR au.restaurant_id = p_restaurant_id)
    AND ta.created_at >= analysis_start;
    
    -- Generate assessment performance insight
    IF assessment_pass_rate IS NOT NULL THEN
        INSERT INTO training_bi_insights (
            insight_id,
            insight_title,
            insight_description,
            insight_type,
            insight_category,
            business_impact_level,
            restaurant_id,
            analysis_period_start,
            analysis_period_end,
            metrics_analyzed,
            key_findings,
            recommendations,
            confidence_level,
            insight_quality_score,
            generation_method,
            generated_by
        ) VALUES (
            'assessment_performance_' || TO_CHAR(NOW(), 'YYYYMMDD') || '_' || encode(gen_random_bytes(4), 'hex'),
            'Assessment Performance Analysis',
            'Assessment pass rate analysis for the last ' || p_analysis_days || ' days',
            'performance',
            'quality',
            CASE 
                WHEN assessment_pass_rate < 60 THEN 'critical'
                WHEN assessment_pass_rate < 75 THEN 'high'
                ELSE 'medium'
            END,
            p_restaurant_id,
            analysis_start,
            analysis_end,
            ARRAY[(SELECT id FROM training_bi_metrics WHERE metric_id = 'assessment_pass_rate' LIMIT 1)],
            jsonb_build_object(
                'pass_rate_percent', assessment_pass_rate,
                'performance_level', CASE 
                    WHEN assessment_pass_rate >= 85 THEN 'excellent'
                    WHEN assessment_pass_rate >= 75 THEN 'good'
                    WHEN assessment_pass_rate >= 60 THEN 'fair'
                    ELSE 'needs_improvement'
                END,
                'analysis_period_days', p_analysis_days
            ),
            CASE 
                WHEN assessment_pass_rate < 60 THEN jsonb_build_array(
                    'Review assessment difficulty and content alignment',
                    'Provide additional training support',
                    'Analyze common failure patterns',
                    'Consider remedial training programs'
                )
                WHEN assessment_pass_rate < 75 THEN jsonb_build_array(
                    'Identify areas for improvement',
                    'Provide targeted support for struggling learners',
                    'Review training materials effectiveness'
                )
                ELSE jsonb_build_array(
                    'Maintain current training quality',
                    'Share best practices across teams',
                    'Consider advanced training modules'
                )
            END,
            90.0,
            80,
            'automated',
            '00000000-0000-0000-0000-000000000000'::UUID
        );
        
        insights_generated := insights_generated + 1;
    END IF;
    
    RETURN insights_generated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute custom BI queries
CREATE OR REPLACE FUNCTION execute_bi_query(
    p_query_id UUID,
    p_parameters JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    query_record RECORD;
    dynamic_query TEXT;
    result_json JSONB;
    execution_start TIMESTAMPTZ;
    execution_end TIMESTAMPTZ;
    execution_duration INTEGER;
    result_count BIGINT;
BEGIN
    execution_start := NOW();
    
    -- Get query definition
    SELECT * INTO query_record
    FROM training_bi_custom_queries
    WHERE id = p_query_id AND status = 'active';
    
    IF query_record.id IS NULL THEN
        RAISE EXCEPTION 'Query not found or inactive: %', p_query_id;
    END IF;
    
    -- Check permissions
    IF NOT (
        query_record.is_public = true OR
        query_record.created_by = auth.uid() OR
        auth.uid() = ANY(query_record.allowed_users) OR
        (SELECT role FROM auth_users WHERE id = auth.uid()) = ANY(query_record.allowed_roles)
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to execute query: %', p_query_id;
    END IF;
    
    -- Build dynamic query with parameters
    dynamic_query := query_record.sql_query;
    
    -- Replace parameters (simplified parameter substitution)
    IF p_parameters IS NOT NULL THEN
        -- This is a simplified implementation - in production, use proper parameter binding
        dynamic_query := REPLACE(dynamic_query, '${restaurant_id}', 
            COALESCE((p_parameters->>'restaurant_id')::TEXT, 'NULL'));
    END IF;
    
    -- Execute query with timeout (simplified - use proper timeout handling in production)
    BEGIN
        EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t))) FROM (' || dynamic_query || ') t'
        INTO result_json;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
    END;
    
    execution_end := NOW();
    execution_duration := EXTRACT(EPOCH FROM (execution_end - execution_start))::INTEGER;
    
    -- Get result count
    result_count := CASE 
        WHEN result_json IS NULL THEN 0
        ELSE jsonb_array_length(result_json)
    END;
    
    -- Update query statistics
    UPDATE training_bi_custom_queries
    SET 
        execution_count = execution_count + 1,
        last_executed_at = execution_start,
        average_execution_time_seconds = (
            (average_execution_time_seconds * (execution_count - 1) + execution_duration) / 
            execution_count
        ),
        total_execution_time_seconds = total_execution_time_seconds + execution_duration,
        last_result_count = result_count,
        updated_at = NOW()
    WHERE id = p_query_id;
    
    RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh BI data warehouse
CREATE OR REPLACE FUNCTION refresh_bi_data_warehouse()
RETURNS INTEGER AS $$
DECLARE
    metrics_processed INTEGER := 0;
    metric_record RECORD;
    restaurant_record RECORD;
    calculated_value DECIMAL(15,4);
BEGIN
    -- Process all active metrics
    FOR metric_record IN 
        SELECT * FROM training_bi_metrics 
        WHERE is_active = true 
        ORDER BY kpi_tier, metric_category
    LOOP
        -- Calculate for each restaurant and globally
        FOR restaurant_record IN 
            SELECT id, NULL::UUID as id_null FROM restaurants
            UNION ALL
            SELECT NULL::UUID, NULL::UUID -- Global calculation
        LOOP
            BEGIN
                -- Calculate metric value
                calculated_value := calculate_bi_metric(
                    metric_record.id,
                    restaurant_record.id,
                    NOW() - INTERVAL '1 day',
                    NOW()
                );
                
                metrics_processed := metrics_processed + 1;
                
            EXCEPTION
                WHEN OTHERS THEN
                    -- Log error but continue processing
                    RAISE NOTICE 'Error calculating metric % for restaurant %: %', 
                        metric_record.metric_id, 
                        COALESCE(restaurant_record.id::TEXT, 'GLOBAL'), 
                        SQLERRM;
            END;
        END LOOP;
    END LOOP;
    
    -- Clean up old data (keep last 90 days)
    DELETE FROM training_bi_data_warehouse
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    RETURN metrics_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- DEFAULT BI METRICS AND REPORTS
-- ===========================================

-- Create default BI metrics
INSERT INTO training_bi_metrics (
    metric_id,
    metric_name,
    display_name,
    description,
    metric_category,
    business_domain,
    metric_type,
    calculation_query,
    required_tables,
    required_columns,
    default_chart_type,
    kpi_tier,
    created_by
) VALUES 
-- Training Completion Rate
(
    'training_completion_rate',
    'Training Completion Rate',
    '{"en": "Training Completion Rate", "fr": "Taux de Complétion de Formation"}',
    '{"en": "Percentage of training modules completed by users", "fr": "Pourcentage de modules de formation complétés par les utilisateurs"}',
    'completion',
    'training',
    'percentage',
    'SELECT AVG(CASE WHEN utp.status = ''completed'' THEN 100.0 ELSE 0.0 END) FROM user_training_progress utp JOIN auth_users au ON utp.user_id = au.id WHERE (${restaurant_id} IS NULL OR au.restaurant_id = ${restaurant_id}) AND utp.updated_at BETWEEN ${start_date} AND ${end_date}',
    ARRAY['user_training_progress', 'auth_users'],
    ARRAY['status', 'user_id', 'restaurant_id', 'updated_at'],
    'gauge',
    1,
    '00000000-0000-0000-0000-000000000000'::UUID
),
-- Assessment Pass Rate
(
    'assessment_pass_rate',
    'Assessment Pass Rate',
    '{"en": "Assessment Pass Rate", "fr": "Taux de Réussite des Évaluations"}',
    '{"en": "Percentage of assessments passed by users", "fr": "Pourcentage d''évaluations réussies par les utilisateurs"}',
    'quality',
    'training',
    'percentage',
    'SELECT AVG(CASE WHEN ta.status = ''passed'' THEN 100.0 ELSE 0.0 END) FROM training_assessments ta JOIN auth_users au ON ta.user_id = au.id WHERE (${restaurant_id} IS NULL OR au.restaurant_id = ${restaurant_id}) AND ta.created_at BETWEEN ${start_date} AND ${end_date}',
    ARRAY['training_assessments', 'auth_users'],
    ARRAY['status', 'user_id', 'restaurant_id', 'created_at'],
    'gauge',
    1,
    '00000000-0000-0000-0000-000000000000'::UUID
),
-- Average Training Score
(
    'average_training_score',
    'Average Training Score',
    '{"en": "Average Training Score", "fr": "Score Moyen de Formation"}',
    '{"en": "Average score achieved across all training assessments", "fr": "Score moyen obtenu dans toutes les évaluations de formation"}',
    'performance',
    'training',
    'average',
    'SELECT AVG(ta.score) FROM training_assessments ta JOIN auth_users au ON ta.user_id = au.id WHERE (${restaurant_id} IS NULL OR au.restaurant_id = ${restaurant_id}) AND ta.created_at BETWEEN ${start_date} AND ${end_date} AND ta.score IS NOT NULL',
    ARRAY['training_assessments', 'auth_users'],
    ARRAY['score', 'user_id', 'restaurant_id', 'created_at'],
    'kpi_card',
    2,
    '00000000-0000-0000-0000-000000000000'::UUID
),
-- Active Training Users
(
    'active_training_users',
    'Active Training Users',
    '{"en": "Active Training Users", "fr": "Utilisateurs Actifs en Formation"}',
    '{"en": "Number of users actively engaged in training", "fr": "Nombre d''utilisateurs activement engagés dans la formation"}',
    'engagement',
    'training',
    'count',
    'SELECT COUNT(DISTINCT utp.user_id) FROM user_training_progress utp JOIN auth_users au ON utp.user_id = au.id WHERE (${restaurant_id} IS NULL OR au.restaurant_id = ${restaurant_id}) AND utp.last_accessed_at BETWEEN ${start_date} AND ${end_date}',
    ARRAY['user_training_progress', 'auth_users'],
    ARRAY['user_id', 'restaurant_id', 'last_accessed_at'],
    'kpi_card',
    2,
    '00000000-0000-0000-0000-000000000000'::UUID
),
-- Certificate Generation Rate
(
    'certificate_generation_rate',
    'Certificate Generation Rate',
    '{"en": "Certificate Generation Rate", "fr": "Taux de Génération de Certificats"}',
    '{"en": "Number of certificates generated per day", "fr": "Nombre de certificats générés par jour"}',
    'productivity',
    'training',
    'count',
    'SELECT COUNT(*) FROM training_certificates tc JOIN auth_users au ON tc.user_id = au.id WHERE (${restaurant_id} IS NULL OR au.restaurant_id = ${restaurant_id}) AND tc.issue_date BETWEEN ${start_date} AND ${end_date}',
    ARRAY['training_certificates', 'auth_users'],
    ARRAY['user_id', 'restaurant_id', 'issue_date'],
    'line',
    3,
    '00000000-0000-0000-0000-000000000000'::UUID
)
ON CONFLICT (metric_id) DO NOTHING;

-- Create default executive dashboard report
INSERT INTO training_bi_reports (
    report_id,
    report_name,
    display_name,
    description,
    report_type,
    report_category,
    target_audience,
    sections,
    metrics_included,
    charts_config,
    auto_generation_enabled,
    generation_schedule,
    created_by
) VALUES (
    'executive_training_dashboard',
    'Executive Training Dashboard',
    '{"en": "Executive Training Dashboard", "fr": "Tableau de Bord Exécutif de Formation"}',
    '{"en": "High-level training metrics for executive decision making", "fr": "Métriques de formation de haut niveau pour la prise de décision exécutive"}',
    'executive_summary',
    'strategic',
    ARRAY['executives', 'board'],
    jsonb_build_object(
        'overview', jsonb_build_object(
            'title', 'Training Overview',
            'widgets', jsonb_build_array('completion_rate', 'pass_rate', 'active_users', 'certificates')
        ),
        'trends', jsonb_build_object(
            'title', 'Performance Trends',
            'widgets', jsonb_build_array('completion_trend', 'score_trend')
        ),
        'insights', jsonb_build_object(
            'title', 'Key Insights',
            'widgets', jsonb_build_array('recent_insights', 'recommendations')
        )
    ),
    (SELECT array_agg(id) FROM training_bi_metrics WHERE kpi_tier = 1),
    jsonb_build_object(
        'layout', 'grid',
        'refresh_interval', 300,
        'theme', 'executive'
    ),
    true,
    '0 8 * * *', -- Daily at 8 AM
    '00000000-0000-0000-0000-000000000000'::UUID
) ON CONFLICT (report_id) DO NOTHING;

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Trigger for updated_at columns
CREATE TRIGGER update_bi_metrics_updated_at
    BEFORE UPDATE ON training_bi_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bi_reports_updated_at
    BEFORE UPDATE ON training_bi_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bi_warehouse_updated_at
    BEFORE UPDATE ON training_bi_data_warehouse
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bi_insights_updated_at
    BEFORE UPDATE ON training_bi_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bi_ml_models_updated_at
    BEFORE UPDATE ON training_bi_ml_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bi_queries_updated_at
    BEFORE UPDATE ON training_bi_custom_queries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ===========================================

-- Create materialized view for training summary statistics
CREATE MATERIALIZED VIEW training_bi_summary AS
SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    COUNT(DISTINCT au.id) as total_users,
    COUNT(DISTINCT tm.id) as total_modules,
    COUNT(DISTINCT utp.id) as total_enrollments,
    COUNT(DISTINCT CASE WHEN utp.status = 'completed' THEN utp.id END) as completed_enrollments,
    COUNT(DISTINCT ta.id) as total_assessments,
    COUNT(DISTINCT CASE WHEN ta.status = 'passed' THEN ta.id END) as passed_assessments,
    COUNT(DISTINCT tc.id) as total_certificates,
    COALESCE(AVG(ta.score), 0) as average_score,
    COALESCE(
        COUNT(DISTINCT CASE WHEN utp.status = 'completed' THEN utp.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT utp.id), 0), 
        0
    ) as completion_rate,
    COALESCE(
        COUNT(DISTINCT CASE WHEN ta.status = 'passed' THEN ta.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT ta.id), 0), 
        0
    ) as pass_rate,
    NOW() as last_updated
FROM restaurants r
LEFT JOIN auth_users au ON r.id = au.restaurant_id
LEFT JOIN training_modules tm ON r.id = tm.restaurant_id OR tm.restaurant_id IS NULL
LEFT JOIN user_training_progress utp ON au.id = utp.user_id
LEFT JOIN training_assessments ta ON au.id = ta.user_id
LEFT JOIN training_certificates tc ON au.id = tc.user_id
GROUP BY r.id, r.name;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_training_bi_summary_restaurant ON training_bi_summary(restaurant_id);

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_bi_metrics IS 'Comprehensive business intelligence metrics definitions with automated calculation and visualization configuration';
COMMENT ON TABLE training_bi_reports IS 'Configurable business intelligence reports and dashboards with automated generation and distribution';
COMMENT ON TABLE training_bi_data_warehouse IS 'Time-series data warehouse for training metrics with multi-dimensional analysis capabilities';
COMMENT ON TABLE training_bi_insights IS 'AI-generated business insights with recommendations and impact tracking';
COMMENT ON TABLE training_bi_ml_models IS 'Machine learning models for predictive analytics and automated insights generation';
COMMENT ON TABLE training_bi_custom_queries IS 'Custom analytical queries with execution tracking and result caching';

COMMENT ON MATERIALIZED VIEW training_bi_summary IS 'Pre-aggregated training statistics for fast dashboard loading and reporting';

-- Performance optimization
ANALYZE training_bi_metrics;
ANALYZE training_bi_reports;
ANALYZE training_bi_data_warehouse;
ANALYZE training_bi_insights;
ANALYZE training_bi_ml_models;
ANALYZE training_bi_custom_queries;