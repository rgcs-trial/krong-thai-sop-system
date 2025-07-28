-- Training Monitoring and Alerting System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive monitoring and alerting system for training system health and performance

-- ===========================================
-- MONITORING AND ALERTING ENUMS
-- ===========================================

-- Alert severity levels
CREATE TYPE alert_severity AS ENUM (
    'critical', 'high', 'medium', 'low', 'info'
);

-- Alert status
CREATE TYPE alert_status AS ENUM (
    'active', 'acknowledged', 'resolved', 'suppressed', 'escalated'
);

-- Monitor types
CREATE TYPE monitor_type AS ENUM (
    'availability', 'performance', 'error_rate', 'capacity', 'security',
    'data_quality', 'user_activity', 'system_health', 'compliance', 'business_metric'
);

-- Alert channel types
CREATE TYPE alert_channel_type AS ENUM (
    'email', 'sms', 'slack', 'webhook', 'dashboard', 'mobile_push', 'in_app'
);

-- Metric data types
CREATE TYPE metric_data_type AS ENUM (
    'counter', 'gauge', 'histogram', 'summary', 'boolean', 'percentage'
);

-- Threshold comparison operators
CREATE TYPE threshold_operator AS ENUM (
    'greater_than', 'less_than', 'equals', 'not_equals', 'greater_than_or_equal', 'less_than_or_equal'
);

-- ===========================================
-- MONITORING AND ALERTING TABLES
-- ===========================================

-- System health monitors
CREATE TABLE IF NOT EXISTS training_system_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Monitor identification
    monitor_id VARCHAR(128) NOT NULL UNIQUE,
    monitor_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Monitor configuration
    monitor_type monitor_type NOT NULL,
    target_system VARCHAR(100) NOT NULL, -- 'training_modules', 'assessments', 'certificates', etc.
    metric_name VARCHAR(100) NOT NULL,
    metric_data_type metric_data_type NOT NULL,
    
    -- Scope and filtering
    restaurant_id UUID,
    scope_filters JSONB DEFAULT '{}', -- Additional filtering criteria
    aggregation_method VARCHAR(50) DEFAULT 'avg', -- avg, sum, count, min, max
    aggregation_window_minutes INTEGER DEFAULT 5,
    
    -- Thresholds and alerting
    warning_threshold DECIMAL(15,4),
    warning_operator threshold_operator,
    critical_threshold DECIMAL(15,4),
    critical_operator threshold_operator,
    
    -- Data collection
    collection_interval_seconds INTEGER DEFAULT 300, -- 5 minutes
    data_retention_days INTEGER DEFAULT 90,
    enabled BOOLEAN DEFAULT true,
    
    -- Alert configuration
    alert_enabled BOOLEAN DEFAULT true,
    alert_cooldown_minutes INTEGER DEFAULT 15,
    escalation_enabled BOOLEAN DEFAULT false,
    escalation_delay_minutes INTEGER DEFAULT 30,
    
    -- Notification settings
    notification_channels alert_channel_type[] DEFAULT '{email}',
    notification_recipients JSONB DEFAULT '{}',
    custom_message_template TEXT,
    
    -- Advanced settings
    require_consecutive_failures INTEGER DEFAULT 2,
    auto_resolve_enabled BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,
    dependencies UUID[] DEFAULT '{}', -- Other monitors this depends on
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL,
    last_modified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_monitors_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_monitors_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_monitors_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id),
    CONSTRAINT valid_collection_interval CHECK (collection_interval_seconds > 0),
    CONSTRAINT valid_aggregation_window CHECK (aggregation_window_minutes > 0),
    CONSTRAINT valid_consecutive_failures CHECK (require_consecutive_failures > 0),
    CONSTRAINT valid_thresholds CHECK (
        (warning_threshold IS NULL OR critical_threshold IS NULL) OR
        (warning_operator = critical_operator AND warning_threshold != critical_threshold)
    )
);

-- Metric data storage
CREATE TABLE IF NOT EXISTS training_system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Metric identification
    monitor_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Metric data
    metric_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_value DECIMAL(15,4) NOT NULL,
    metric_metadata JSONB DEFAULT '{}',
    
    -- Aggregated values for different time windows
    hourly_avg DECIMAL(15,4),
    daily_avg DECIMAL(15,4),
    weekly_avg DECIMAL(15,4),
    
    -- Context information
    source_system VARCHAR(100),
    source_component VARCHAR(100),
    collection_method VARCHAR(50) DEFAULT 'automated',
    
    -- Data quality indicators
    data_quality_score INTEGER DEFAULT 100 CHECK (data_quality_score BETWEEN 0 AND 100),
    is_anomaly BOOLEAN DEFAULT false,
    anomaly_score DECIMAL(5,2),
    
    -- Partitioning helper
    metric_date DATE GENERATED ALWAYS AS (metric_timestamp::DATE) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_metrics_monitor FOREIGN KEY (monitor_id) REFERENCES training_system_monitors(id) ON DELETE CASCADE,
    CONSTRAINT fk_metrics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Create partitioning for metrics table (by date)
-- Note: This would typically be done with pg_partman or similar in production
CREATE INDEX idx_metrics_timestamp_date ON training_system_metrics(metric_timestamp, metric_date);

-- Alert incidents
CREATE TABLE IF NOT EXISTS training_system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert identification
    alert_id VARCHAR(128) NOT NULL UNIQUE,
    alert_title VARCHAR(300) NOT NULL,
    alert_description TEXT,
    
    -- Alert source
    monitor_id UUID NOT NULL,
    trigger_metric_id UUID,
    restaurant_id UUID,
    
    -- Alert classification
    severity alert_severity NOT NULL,
    monitor_type monitor_type NOT NULL,
    alert_category VARCHAR(100), -- 'performance_degradation', 'service_unavailable', etc.
    
    -- Threshold information
    threshold_value DECIMAL(15,4),
    actual_value DECIMAL(15,4),
    threshold_operator threshold_operator,
    deviation_percentage DECIMAL(5,2),
    
    -- Timeline
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Status and lifecycle
    status alert_status DEFAULT 'active',
    occurrence_count INTEGER DEFAULT 1,
    suppression_count INTEGER DEFAULT 0,
    escalation_level INTEGER DEFAULT 0,
    
    -- Impact assessment
    affected_users_count INTEGER DEFAULT 0,
    affected_systems TEXT[] DEFAULT '{}',
    business_impact_description TEXT,
    estimated_downtime_minutes INTEGER,
    
    -- Response tracking
    acknowledged_by UUID,
    resolved_by UUID,
    resolution_notes TEXT,
    resolution_method VARCHAR(100), -- 'manual', 'automatic', 'escalated'
    
    -- Notification tracking
    notifications_sent INTEGER DEFAULT 0,
    last_notification_at TIMESTAMPTZ,
    notification_failures INTEGER DEFAULT 0,
    notification_log JSONB DEFAULT '[]',
    
    -- Root cause and correlation
    root_cause TEXT,
    correlated_alerts UUID[] DEFAULT '{}',
    similar_incidents_count INTEGER DEFAULT 0,
    investigation_notes TEXT,
    
    -- Follow-up actions
    action_items JSONB DEFAULT '[]',
    prevention_measures TEXT[] DEFAULT '{}',
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_due_date DATE,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_alerts_monitor FOREIGN KEY (monitor_id) REFERENCES training_system_monitors(id) ON DELETE CASCADE,
    CONSTRAINT fk_alerts_trigger_metric FOREIGN KEY (trigger_metric_id) REFERENCES training_system_metrics(id),
    CONSTRAINT fk_alerts_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_alerts_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES auth_users(id),
    CONSTRAINT fk_alerts_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_timeline CHECK (first_detected_at <= last_detected_at),
    CONSTRAINT valid_acknowledgment CHECK (acknowledged_at IS NULL OR acknowledged_at >= first_detected_at),
    CONSTRAINT valid_resolution CHECK (resolved_at IS NULL OR resolved_at >= first_detected_at),
    CONSTRAINT valid_escalation_level CHECK (escalation_level >= 0),
    CONSTRAINT valid_occurrence_count CHECK (occurrence_count > 0)
);

-- Alert notification channels and preferences
CREATE TABLE IF NOT EXISTS training_alert_notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Channel identification
    channel_id VARCHAR(128) NOT NULL UNIQUE,
    channel_name VARCHAR(200) NOT NULL,
    channel_type alert_channel_type NOT NULL,
    description TEXT,
    
    -- Channel configuration
    restaurant_id UUID,
    configuration JSONB NOT NULL, -- Channel-specific settings (webhook URL, email addresses, etc.)
    authentication_config JSONB DEFAULT '{}', -- API keys, tokens, etc.
    
    -- Delivery settings
    enabled BOOLEAN DEFAULT true,
    priority_level INTEGER DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 30,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Filtering and routing
    alert_severity_filter alert_severity[] DEFAULT '{critical,high,medium,low,info}',
    monitor_type_filter monitor_type[] DEFAULT '{}', -- Empty means all types
    time_window_restrictions JSONB DEFAULT '{}', -- Business hours, etc.
    
    -- Rate limiting
    rate_limit_enabled BOOLEAN DEFAULT false,
    max_alerts_per_hour INTEGER DEFAULT 100,
    burst_protection_enabled BOOLEAN DEFAULT true,
    
    -- Template and formatting
    message_template JSONB DEFAULT '{}', -- Per alert type templates
    custom_formatting_rules JSONB DEFAULT '{}',
    include_graphs BOOLEAN DEFAULT false,
    include_historical_data BOOLEAN DEFAULT false,
    
    -- Delivery tracking
    total_notifications_sent BIGINT DEFAULT 0,
    successful_deliveries BIGINT DEFAULT 0,
    failed_deliveries BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Health monitoring
    health_check_enabled BOOLEAN DEFAULT false,
    health_check_interval_minutes INTEGER DEFAULT 60,
    last_health_check_at TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown', -- healthy, degraded, unhealthy, unknown
    
    -- Maintenance and lifecycle
    maintenance_mode BOOLEAN DEFAULT false,
    scheduled_maintenance JSONB DEFAULT '[]',
    deprecation_date DATE,
    replacement_channel_id UUID,
    
    -- Metadata
    created_by UUID NOT NULL,
    last_modified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_channels_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_channels_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_channels_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id),
    CONSTRAINT fk_channels_replacement FOREIGN KEY (replacement_channel_id) REFERENCES training_alert_notification_channels(id),
    CONSTRAINT valid_retry_settings CHECK (retry_attempts >= 0 AND retry_delay_seconds > 0),
    CONSTRAINT valid_rate_limit CHECK (NOT rate_limit_enabled OR max_alerts_per_hour > 0)
);

-- Performance dashboards and visualizations
CREATE TABLE IF NOT EXISTS training_performance_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dashboard identification
    dashboard_id VARCHAR(128) NOT NULL UNIQUE,
    dashboard_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Dashboard configuration
    restaurant_id UUID,
    dashboard_type VARCHAR(50) NOT NULL, -- 'executive', 'operational', 'technical', 'custom'
    target_audience VARCHAR(100), -- 'managers', 'staff', 'it_team', 'executives'
    
    -- Layout and visualization
    layout_config JSONB NOT NULL, -- Grid layout, widget positions, etc.
    widgets JSONB NOT NULL, -- Widget definitions, data sources, visualizations
    refresh_interval_seconds INTEGER DEFAULT 300,
    auto_refresh_enabled BOOLEAN DEFAULT true,
    
    -- Data sources and filters
    data_sources JSONB NOT NULL, -- Monitors, metrics, custom queries
    default_time_range VARCHAR(50) DEFAULT '24h', -- 1h, 24h, 7d, 30d, custom
    default_filters JSONB DEFAULT '{}',
    drill_down_enabled BOOLEAN DEFAULT true,
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    allowed_roles TEXT[] DEFAULT '{admin,manager}',
    allowed_users UUID[] DEFAULT '{}',
    require_authentication BOOLEAN DEFAULT true,
    
    -- Sharing and collaboration
    shareable_link VARCHAR(255),
    link_expires_at TIMESTAMPTZ,
    allow_embedding BOOLEAN DEFAULT false,
    export_enabled BOOLEAN DEFAULT true,
    export_formats TEXT[] DEFAULT '{pdf,png,csv}',
    
    -- Alerting integration
    alert_overlay_enabled BOOLEAN DEFAULT true,
    alert_severity_display alert_severity[] DEFAULT '{critical,high}',
    show_alert_history BOOLEAN DEFAULT false,
    
    -- Performance and caching
    cache_enabled BOOLEAN DEFAULT true,
    cache_duration_minutes INTEGER DEFAULT 5,
    background_refresh_enabled BOOLEAN DEFAULT false,
    
    -- Usage tracking
    view_count BIGINT DEFAULT 0,
    unique_viewers_count BIGINT DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    average_session_duration_seconds INTEGER DEFAULT 0,
    
    -- Lifecycle management
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, archived, deprecated
    version VARCHAR(20) DEFAULT '1.0',
    last_modified_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_properties JSONB DEFAULT '{}',
    created_by UUID NOT NULL,
    last_modified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_dashboards_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_dashboards_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_dashboards_modified_by FOREIGN KEY (last_modified_by) REFERENCES auth_users(id),
    CONSTRAINT valid_refresh_interval CHECK (refresh_interval_seconds > 0),
    CONSTRAINT valid_cache_duration CHECK (NOT cache_enabled OR cache_duration_minutes > 0)
);

-- System health reports
CREATE TABLE IF NOT EXISTS training_system_health_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Report identification
    report_id VARCHAR(128) NOT NULL UNIQUE,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'incident', 'ad_hoc'
    
    -- Report scope and period
    restaurant_id UUID,
    report_period_start TIMESTAMPTZ NOT NULL,
    report_period_end TIMESTAMPTZ NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Overall health assessment
    overall_health_score INTEGER CHECK (overall_health_score BETWEEN 0 AND 100),
    health_status VARCHAR(20), -- 'excellent', 'good', 'fair', 'poor', 'critical'
    health_trend VARCHAR(20), -- 'improving', 'stable', 'declining'
    
    -- Key performance indicators
    system_availability_percentage DECIMAL(5,2),
    average_response_time_ms DECIMAL(10,2),
    error_rate_percentage DECIMAL(5,2),
    user_satisfaction_score DECIMAL(3,1),
    training_completion_rate DECIMAL(5,2),
    
    -- Metric summaries
    total_alerts_generated INTEGER DEFAULT 0,
    critical_alerts_count INTEGER DEFAULT 0,
    high_alerts_count INTEGER DEFAULT 0,
    average_resolution_time_minutes INTEGER,
    unresolved_alerts_count INTEGER DEFAULT 0,
    
    -- System performance metrics
    peak_concurrent_users INTEGER DEFAULT 0,
    total_training_sessions BIGINT DEFAULT 0,
    data_processing_volume_gb DECIMAL(10,2) DEFAULT 0,
    backup_success_rate DECIMAL(5,2),
    security_incident_count INTEGER DEFAULT 0,
    
    -- Detailed analysis
    performance_analysis JSONB DEFAULT '{}',
    capacity_analysis JSONB DEFAULT '{}',
    security_analysis JSONB DEFAULT '{}',
    user_activity_analysis JSONB DEFAULT '{}',
    
    -- Issues and recommendations
    identified_issues JSONB DEFAULT '[]',
    performance_bottlenecks JSONB DEFAULT '[]',
    recommended_actions JSONB DEFAULT '[]',
    capacity_recommendations JSONB DEFAULT '[]',
    
    -- Trends and forecasting
    historical_comparison JSONB DEFAULT '{}',
    trend_analysis JSONB DEFAULT '{}',
    forecasted_metrics JSONB DEFAULT '{}',
    seasonal_patterns JSONB DEFAULT '{}',
    
    -- Business impact
    business_impact_summary TEXT,
    affected_business_processes TEXT[] DEFAULT '{}',
    estimated_financial_impact DECIMAL(12,2),
    customer_impact_assessment TEXT,
    
    -- Report generation
    data_sources_used JSONB NOT NULL,
    generation_duration_seconds INTEGER,
    report_size_bytes BIGINT,
    report_format VARCHAR(20) DEFAULT 'json', -- json, pdf, html, csv
    
    -- Distribution and sharing
    recipients JSONB DEFAULT '{}',
    distribution_channels TEXT[] DEFAULT '{}',
    published_at TIMESTAMPTZ,
    public_summary_available BOOLEAN DEFAULT false,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_metrics JSONB DEFAULT '{}',
    generated_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_health_reports_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_health_reports_generated_by FOREIGN KEY (generated_by) REFERENCES auth_users(id),
    CONSTRAINT valid_report_period CHECK (report_period_start <= report_period_end),
    CONSTRAINT valid_percentages CHECK (
        (system_availability_percentage IS NULL OR system_availability_percentage BETWEEN 0 AND 100) AND
        (error_rate_percentage IS NULL OR error_rate_percentage BETWEEN 0 AND 100) AND
        (training_completion_rate IS NULL OR training_completion_rate BETWEEN 0 AND 100) AND
        (backup_success_rate IS NULL OR backup_success_rate BETWEEN 0 AND 100)
    )
);

-- ===========================================
-- MONITORING INDEXES
-- ===========================================

-- System monitors indexes
CREATE UNIQUE INDEX idx_monitors_monitor_id ON training_system_monitors(monitor_id);
CREATE INDEX idx_monitors_restaurant ON training_system_monitors(restaurant_id);
CREATE INDEX idx_monitors_type ON training_system_monitors(monitor_type);
CREATE INDEX idx_monitors_enabled ON training_system_monitors(enabled) WHERE enabled = true;
CREATE INDEX idx_monitors_alert_enabled ON training_system_monitors(alert_enabled) WHERE alert_enabled = true;
CREATE INDEX idx_monitors_target_system ON training_system_monitors(target_system);
CREATE INDEX idx_monitors_metric_name ON training_system_monitors(metric_name);

-- Metrics indexes
CREATE INDEX idx_metrics_monitor_timestamp ON training_system_metrics(monitor_id, metric_timestamp DESC);
CREATE INDEX idx_metrics_restaurant_timestamp ON training_system_metrics(restaurant_id, metric_timestamp DESC);
CREATE INDEX idx_metrics_date ON training_system_metrics(metric_date);
CREATE INDEX idx_metrics_anomaly ON training_system_metrics(is_anomaly) WHERE is_anomaly = true;
CREATE INDEX idx_metrics_timestamp_value ON training_system_metrics(metric_timestamp, metric_value);

-- Alerts indexes
CREATE UNIQUE INDEX idx_alerts_alert_id ON training_system_alerts(alert_id);
CREATE INDEX idx_alerts_monitor ON training_system_alerts(monitor_id);
CREATE INDEX idx_alerts_restaurant ON training_system_alerts(restaurant_id);
CREATE INDEX idx_alerts_status ON training_system_alerts(status);
CREATE INDEX idx_alerts_severity ON training_system_alerts(severity);
CREATE INDEX idx_alerts_active ON training_system_alerts(status) WHERE status = 'active';
CREATE INDEX idx_alerts_first_detected ON training_system_alerts(first_detected_at DESC);
CREATE INDEX idx_alerts_resolved ON training_system_alerts(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX idx_alerts_escalation ON training_system_alerts(escalation_level) WHERE escalation_level > 0;

-- Notification channels indexes
CREATE UNIQUE INDEX idx_channels_channel_id ON training_alert_notification_channels(channel_id);
CREATE INDEX idx_channels_restaurant ON training_alert_notification_channels(restaurant_id);
CREATE INDEX idx_channels_type ON training_alert_notification_channels(channel_type);
CREATE INDEX idx_channels_enabled ON training_alert_notification_channels(enabled) WHERE enabled = true;
CREATE INDEX idx_channels_health_status ON training_alert_notification_channels(health_status);

-- Performance dashboards indexes
CREATE UNIQUE INDEX idx_dashboards_dashboard_id ON training_performance_dashboards(dashboard_id);
CREATE INDEX idx_dashboards_restaurant ON training_performance_dashboards(restaurant_id);
CREATE INDEX idx_dashboards_type ON training_performance_dashboards(dashboard_type);
CREATE INDEX idx_dashboards_status ON training_performance_dashboards(status);
CREATE INDEX idx_dashboards_public ON training_performance_dashboards(is_public) WHERE is_public = true;
CREATE INDEX idx_dashboards_last_viewed ON training_performance_dashboards(last_viewed_at DESC);

-- Health reports indexes
CREATE UNIQUE INDEX idx_health_reports_report_id ON training_system_health_reports(report_id);
CREATE INDEX idx_health_reports_restaurant ON training_system_health_reports(restaurant_id);
CREATE INDEX idx_health_reports_type ON training_system_health_reports(report_type);
CREATE INDEX idx_health_reports_period ON training_system_health_reports(report_period_start, report_period_end);
CREATE INDEX idx_health_reports_generated_at ON training_system_health_reports(generated_at DESC);
CREATE INDEX idx_health_reports_health_score ON training_system_health_reports(overall_health_score);

-- JSONB indexes for complex queries
CREATE INDEX idx_monitors_scope_filters ON training_system_monitors USING GIN(scope_filters);
CREATE INDEX idx_metrics_metadata ON training_system_metrics USING GIN(metric_metadata);
CREATE INDEX idx_alerts_notification_log ON training_system_alerts USING GIN(notification_log);
CREATE INDEX idx_channels_configuration ON training_alert_notification_channels USING GIN(configuration);
CREATE INDEX idx_dashboards_widgets ON training_performance_dashboards USING GIN(widgets);
CREATE INDEX idx_health_reports_analysis ON training_system_health_reports USING GIN(performance_analysis);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on monitoring tables
ALTER TABLE training_system_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_alert_notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_performance_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_system_health_reports ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Monitors restaurant isolation"
ON training_system_monitors FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Metrics restaurant isolation"
ON training_system_metrics FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Alerts restaurant isolation"
ON training_system_alerts FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Channels restaurant isolation"
ON training_alert_notification_channels FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Dashboards restaurant isolation"
ON training_performance_dashboards FOR ALL TO authenticated
USING (
    restaurant_id IS NULL OR 
    restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()) OR
    (is_public = true AND EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())) OR
    auth.uid() = ANY(allowed_users) OR
    (SELECT role FROM auth_users WHERE id = auth.uid()) = ANY(allowed_roles)
);

CREATE POLICY "Health reports restaurant isolation"
ON training_system_health_reports FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- Admin and manager access policies
CREATE POLICY "Monitoring admin manager access"
ON training_system_monitors FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- MONITORING FUNCTIONS
-- ===========================================

-- Function to collect system metrics
CREATE OR REPLACE FUNCTION collect_training_system_metrics()
RETURNS INTEGER AS $$
DECLARE
    collected_count INTEGER := 0;
    monitor_record RECORD;
    metric_value DECIMAL(15,4);
    restaurant_uuid UUID;
BEGIN
    -- Loop through all enabled monitors
    FOR monitor_record IN 
        SELECT * FROM training_system_monitors 
        WHERE enabled = true 
        ORDER BY collection_interval_seconds
    LOOP
        -- Skip if not time to collect (simple check)
        IF monitor_record.collection_interval_seconds > 0 AND 
           EXTRACT(EPOCH FROM (NOW() - (
               SELECT MAX(metric_timestamp) 
               FROM training_system_metrics 
               WHERE monitor_id = monitor_record.id
           ))) < monitor_record.collection_interval_seconds THEN
            CONTINUE;
        END IF;
        
        restaurant_uuid := monitor_record.restaurant_id;
        
        -- Collect metrics based on monitor type and target system
        CASE monitor_record.target_system
            WHEN 'training_modules' THEN
                CASE monitor_record.metric_name
                    WHEN 'total_modules' THEN
                        SELECT COUNT(*)::DECIMAL INTO metric_value
                        FROM training_modules
                        WHERE (restaurant_uuid IS NULL OR restaurant_id = restaurant_uuid);
                    
                    WHEN 'active_modules' THEN
                        SELECT COUNT(*)::DECIMAL INTO metric_value
                        FROM training_modules
                        WHERE (restaurant_uuid IS NULL OR restaurant_id = restaurant_uuid)
                        AND is_active = true;
                    
                    WHEN 'completion_rate' THEN
                        SELECT AVG(
                            CASE WHEN status = 'completed' THEN 100.0 ELSE 0.0 END
                        ) INTO metric_value
                        FROM user_training_progress
                        WHERE (restaurant_uuid IS NULL OR 
                               user_id IN (SELECT id FROM auth_users WHERE restaurant_id = restaurant_uuid))
                        AND created_at >= NOW() - INTERVAL '24 hours';
                END CASE;
            
            WHEN 'training_assessments' THEN
                CASE monitor_record.metric_name
                    WHEN 'total_assessments' THEN
                        SELECT COUNT(*)::DECIMAL INTO metric_value
                        FROM training_assessments
                        WHERE (restaurant_uuid IS NULL OR 
                               user_id IN (SELECT id FROM auth_users WHERE restaurant_id = restaurant_uuid));
                    
                    WHEN 'pass_rate' THEN
                        SELECT AVG(
                            CASE WHEN status = 'passed' THEN 100.0 ELSE 0.0 END
                        ) INTO metric_value
                        FROM training_assessments
                        WHERE (restaurant_uuid IS NULL OR 
                               user_id IN (SELECT id FROM auth_users WHERE restaurant_id = restaurant_uuid))
                        AND created_at >= NOW() - INTERVAL '24 hours';
                    
                    WHEN 'average_score' THEN
                        SELECT AVG(score) INTO metric_value
                        FROM training_assessments
                        WHERE (restaurant_uuid IS NULL OR 
                               user_id IN (SELECT id FROM auth_users WHERE restaurant_id = restaurant_uuid))
                        AND created_at >= NOW() - INTERVAL '24 hours'
                        AND score IS NOT NULL;
                END CASE;
            
            WHEN 'user_activity' THEN
                CASE monitor_record.metric_name
                    WHEN 'active_users_24h' THEN
                        SELECT COUNT(DISTINCT user_id)::DECIMAL INTO metric_value
                        FROM user_training_progress
                        WHERE (restaurant_uuid IS NULL OR 
                               user_id IN (SELECT id FROM auth_users WHERE restaurant_id = restaurant_uuid))
                        AND updated_at >= NOW() - INTERVAL '24 hours';
                    
                    WHEN 'training_sessions_24h' THEN
                        SELECT COUNT(*)::DECIMAL INTO metric_value
                        FROM user_training_progress
                        WHERE (restaurant_uuid IS NULL OR 
                               user_id IN (SELECT id FROM auth_users WHERE restaurant_id = restaurant_uuid))
                        AND updated_at >= NOW() - INTERVAL '24 hours';
                END CASE;
            
            WHEN 'system_performance' THEN
                CASE monitor_record.metric_name
                    WHEN 'database_connections' THEN
                        SELECT COUNT(*)::DECIMAL INTO metric_value
                        FROM pg_stat_activity
                        WHERE state = 'active';
                    
                    WHEN 'query_duration_avg' THEN
                        SELECT AVG(EXTRACT(EPOCH FROM (NOW() - query_start)))::DECIMAL INTO metric_value
                        FROM pg_stat_activity
                        WHERE state = 'active' AND query_start IS NOT NULL;
                END CASE;
        END CASE;
        
        -- Insert metric if value was collected
        IF metric_value IS NOT NULL THEN
            INSERT INTO training_system_metrics (
                monitor_id,
                restaurant_id,
                metric_value,
                metric_metadata,
                source_system,
                source_component
            ) VALUES (
                monitor_record.id,
                restaurant_uuid,
                metric_value,
                jsonb_build_object(
                    'collection_method', 'automated',
                    'monitor_type', monitor_record.monitor_type,
                    'metric_name', monitor_record.metric_name
                ),
                monitor_record.target_system,
                'metrics_collector'
            );
            
            collected_count := collected_count + 1;
        END IF;
    END LOOP;
    
    RETURN collected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to evaluate alert conditions
CREATE OR REPLACE FUNCTION evaluate_alert_conditions()
RETURNS INTEGER AS $$
DECLARE
    alerts_triggered INTEGER := 0;
    monitor_record RECORD;
    latest_metric RECORD;
    alert_triggered BOOLEAN := false;
    alert_severity alert_severity;
    threshold_breached DECIMAL(15,4);
    threshold_operator threshold_operator;
BEGIN
    -- Loop through all monitors with alerting enabled
    FOR monitor_record IN 
        SELECT * FROM training_system_monitors 
        WHERE enabled = true AND alert_enabled = true
    LOOP
        -- Get latest metric for this monitor
        SELECT * INTO latest_metric
        FROM training_system_metrics
        WHERE monitor_id = monitor_record.id
        ORDER BY metric_timestamp DESC
        LIMIT 1;
        
        IF latest_metric.id IS NULL THEN
            CONTINUE;
        END IF;
        
        alert_triggered := false;
        alert_severity := 'info';
        threshold_breached := NULL;
        threshold_operator := NULL;
        
        -- Check critical threshold first
        IF monitor_record.critical_threshold IS NOT NULL THEN
            CASE monitor_record.critical_operator
                WHEN 'greater_than' THEN
                    IF latest_metric.metric_value > monitor_record.critical_threshold THEN
                        alert_triggered := true;
                        alert_severity := 'critical';
                        threshold_breached := monitor_record.critical_threshold;
                        threshold_operator := monitor_record.critical_operator;
                    END IF;
                WHEN 'less_than' THEN
                    IF latest_metric.metric_value < monitor_record.critical_threshold THEN
                        alert_triggered := true;
                        alert_severity := 'critical';
                        threshold_breached := monitor_record.critical_threshold;
                        threshold_operator := monitor_record.critical_operator;
                    END IF;
                WHEN 'equals' THEN
                    IF latest_metric.metric_value = monitor_record.critical_threshold THEN
                        alert_triggered := true;
                        alert_severity := 'critical';
                        threshold_breached := monitor_record.critical_threshold;
                        threshold_operator := monitor_record.critical_operator;
                    END IF;
            END CASE;
        END IF;
        
        -- Check warning threshold if not critical
        IF NOT alert_triggered AND monitor_record.warning_threshold IS NOT NULL THEN
            CASE monitor_record.warning_operator
                WHEN 'greater_than' THEN
                    IF latest_metric.metric_value > monitor_record.warning_threshold THEN
                        alert_triggered := true;
                        alert_severity := 'medium';
                        threshold_breached := monitor_record.warning_threshold;
                        threshold_operator := monitor_record.warning_operator;
                    END IF;
                WHEN 'less_than' THEN
                    IF latest_metric.metric_value < monitor_record.warning_threshold THEN
                        alert_triggered := true;
                        alert_severity := 'medium';
                        threshold_breached := monitor_record.warning_threshold;
                        threshold_operator := monitor_record.warning_operator;
                    END IF;
                WHEN 'equals' THEN
                    IF latest_metric.metric_value = monitor_record.warning_threshold THEN
                        alert_triggered := true;
                        alert_severity := 'medium';
                        threshold_breached := monitor_record.warning_threshold;
                        threshold_operator := monitor_record.warning_operator;
                    END IF;
            END CASE;
        END IF;
        
        -- Create alert if triggered and not in cooldown
        IF alert_triggered THEN
            -- Check if there's an active alert for this monitor within cooldown period
            IF NOT EXISTS (
                SELECT 1 FROM training_system_alerts
                WHERE monitor_id = monitor_record.id
                AND status = 'active'
                AND first_detected_at >= NOW() - (monitor_record.alert_cooldown_minutes || ' minutes')::INTERVAL
            ) THEN
                -- Create new alert
                INSERT INTO training_system_alerts (
                    alert_id,
                    alert_title,
                    alert_description,
                    monitor_id,
                    trigger_metric_id,
                    restaurant_id,
                    severity,
                    monitor_type,
                    threshold_value,
                    actual_value,
                    threshold_operator,
                    deviation_percentage,
                    affected_systems,
                    notification_log
                ) VALUES (
                    'ALERT-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || encode(gen_random_bytes(4), 'hex'),
                    monitor_record.monitor_name || ' - ' || alert_severity || ' Alert',
                    'Threshold breached for ' || monitor_record.metric_name || ' on ' || monitor_record.target_system,
                    monitor_record.id,
                    latest_metric.id,
                    monitor_record.restaurant_id,
                    alert_severity,
                    monitor_record.monitor_type,
                    threshold_breached,
                    latest_metric.metric_value,
                    threshold_operator,
                    CASE WHEN threshold_breached > 0 THEN
                        ABS((latest_metric.metric_value - threshold_breached) / threshold_breached * 100)
                    ELSE 0 END,
                    ARRAY[monitor_record.target_system],
                    jsonb_build_array(
                        jsonb_build_object(
                            'timestamp', NOW(),
                            'event', 'alert_created',
                            'details', 'Alert automatically generated by monitoring system'
                        )
                    )
                );
                
                alerts_triggered := alerts_triggered + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN alerts_triggered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate system health score
CREATE OR REPLACE FUNCTION calculate_system_health_score(
    p_restaurant_id UUID DEFAULT NULL,
    p_time_window_hours INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
    health_score INTEGER := 100;
    active_critical_alerts INTEGER;
    active_high_alerts INTEGER;
    avg_response_time DECIMAL(10,2);
    error_rate DECIMAL(5,2);
    availability_score INTEGER;
    performance_score INTEGER;
    alert_score INTEGER;
BEGIN
    -- Calculate availability score (based on system uptime metrics)
    availability_score := 100; -- Simplified - would typically check actual uptime metrics
    
    -- Calculate performance score (based on response times)
    SELECT AVG(metric_value) INTO avg_response_time
    FROM training_system_metrics tsm
    JOIN training_system_monitors tsmon ON tsm.monitor_id = tsmon.id
    WHERE (p_restaurant_id IS NULL OR tsm.restaurant_id = p_restaurant_id)
    AND tsmon.metric_name LIKE '%response_time%'
    AND tsm.metric_timestamp >= NOW() - (p_time_window_hours || ' hours')::INTERVAL;
    
    performance_score := CASE 
        WHEN avg_response_time IS NULL THEN 100
        WHEN avg_response_time <= 100 THEN 100
        WHEN avg_response_time <= 500 THEN 90
        WHEN avg_response_time <= 1000 THEN 75
        WHEN avg_response_time <= 2000 THEN 50
        ELSE 25
    END;
    
    -- Calculate alert score (based on active alerts)
    SELECT 
        COUNT(*) FILTER (WHERE severity = 'critical'),
        COUNT(*) FILTER (WHERE severity = 'high')
    INTO active_critical_alerts, active_high_alerts
    FROM training_system_alerts
    WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
    AND status = 'active'
    AND first_detected_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL;
    
    alert_score := 100 - (active_critical_alerts * 25) - (active_high_alerts * 10);
    alert_score := GREATEST(alert_score, 0);
    
    -- Calculate overall health score (weighted average)
    health_score := (
        availability_score * 0.4 +  -- 40% weight on availability
        performance_score * 0.35 +  -- 35% weight on performance
        alert_score * 0.25           -- 25% weight on alerts
    )::INTEGER;
    
    health_score := GREATEST(LEAST(health_score, 100), 0);
    
    RETURN health_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-resolve alerts
CREATE OR REPLACE FUNCTION auto_resolve_alerts()
RETURNS INTEGER AS $$
DECLARE
    resolved_count INTEGER := 0;
    alert_record RECORD;
    latest_metric_value DECIMAL(15,4);
    should_resolve BOOLEAN := false;
BEGIN
    -- Loop through active alerts that have auto-resolution enabled
    FOR alert_record IN 
        SELECT a.*, m.auto_resolve_enabled, m.critical_threshold, m.critical_operator,
               m.warning_threshold, m.warning_operator
        FROM training_system_alerts a
        JOIN training_system_monitors m ON a.monitor_id = m.id
        WHERE a.status = 'active'
        AND m.auto_resolve_enabled = true
        ORDER BY a.first_detected_at
    LOOP
        -- Get latest metric value
        SELECT metric_value INTO latest_metric_value
        FROM training_system_metrics
        WHERE monitor_id = alert_record.monitor_id
        ORDER BY metric_timestamp DESC
        LIMIT 1;
        
        IF latest_metric_value IS NULL THEN
            CONTINUE;
        END IF;
        
        should_resolve := false;
        
        -- Check if conditions are back to normal
        IF alert_record.severity = 'critical' AND alert_record.critical_threshold IS NOT NULL THEN
            CASE alert_record.critical_operator
                WHEN 'greater_than' THEN
                    should_resolve := latest_metric_value <= alert_record.critical_threshold;
                WHEN 'less_than' THEN
                    should_resolve := latest_metric_value >= alert_record.critical_threshold;
                WHEN 'equals' THEN
                    should_resolve := latest_metric_value != alert_record.critical_threshold;
            END CASE;
        ELSIF alert_record.warning_threshold IS NOT NULL THEN
            CASE alert_record.warning_operator
                WHEN 'greater_than' THEN
                    should_resolve := latest_metric_value <= alert_record.warning_threshold;
                WHEN 'less_than' THEN
                    should_resolve := latest_metric_value >= alert_record.warning_threshold;
                WHEN 'equals' THEN
                    should_resolve := latest_metric_value != alert_record.warning_threshold;
            END CASE;
        END IF;
        
        -- Auto-resolve if conditions are met
        IF should_resolve THEN
            UPDATE training_system_alerts
            SET 
                status = 'resolved',
                resolved_at = NOW(),
                resolution_method = 'automatic',
                resolution_notes = 'Automatically resolved - metric value returned to normal range',
                notification_log = notification_log || jsonb_build_array(
                    jsonb_build_object(
                        'timestamp', NOW(),
                        'event', 'auto_resolved',
                        'metric_value', latest_metric_value,
                        'details', 'Alert automatically resolved by monitoring system'
                    )
                )
            WHERE id = alert_record.id;
            
            resolved_count := resolved_count + 1;
        END IF;
    END LOOP;
    
    RETURN resolved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- DEFAULT MONITORING CONFIGURATION
-- ===========================================

-- Create default system monitors for each restaurant
INSERT INTO training_system_monitors (
    monitor_id,
    monitor_name,
    description,
    monitor_type,
    target_system,
    metric_name,
    metric_data_type,
    restaurant_id,
    warning_threshold,
    warning_operator,
    critical_threshold,
    critical_operator,
    collection_interval_seconds,
    alert_cooldown_minutes,
    created_by
)
SELECT 
    'training_completion_rate_' || r.id::TEXT,
    'Training Completion Rate - ' || r.name,
    'Monitor training completion rate for quality assurance',
    'business_metric',
    'training_modules',
    'completion_rate',
    'percentage',
    r.id,
    70.0,  -- Warning if below 70%
    'less_than',
    50.0,  -- Critical if below 50%
    'less_than',
    3600,  -- Check every hour
    60,    -- 1 hour cooldown
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role = 'admin')

UNION ALL

SELECT 
    'assessment_pass_rate_' || r.id::TEXT,
    'Assessment Pass Rate - ' || r.name,
    'Monitor assessment pass rate for training effectiveness',
    'business_metric',
    'training_assessments',
    'pass_rate',
    'percentage',
    r.id,
    75.0,  -- Warning if below 75%
    'less_than',
    60.0,  -- Critical if below 60%
    'less_than',
    1800,  -- Check every 30 minutes
    30,    -- 30 minute cooldown
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role = 'admin')

UNION ALL

SELECT 
    'active_users_24h_' || r.id::TEXT,
    'Active Users (24h) - ' || r.name,
    'Monitor daily active users in training system',
    'user_activity',
    'user_activity',
    'active_users_24h',
    'counter',
    r.id,
    5.0,   -- Warning if less than 5 active users
    'less_than',
    2.0,   -- Critical if less than 2 active users
    'less_than',
    3600,  -- Check every hour
    120,   -- 2 hour cooldown
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role = 'admin')
ON CONFLICT (monitor_id) DO NOTHING;

-- Create default notification channels
INSERT INTO training_alert_notification_channels (
    channel_id,
    channel_name,
    channel_type,
    description,
    restaurant_id,
    configuration,
    alert_severity_filter,
    created_by
)
SELECT 
    'email_alerts_' || r.id::TEXT,
    'Email Alerts - ' || r.name,
    'email',
    'Primary email notification channel for training system alerts',
    r.id,
    jsonb_build_object(
        'recipients', jsonb_build_array(
            (SELECT email FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
        ),
        'subject_template', '[TRAINING ALERT] {severity} - {title}',
        'include_charts', false
    ),
    '{critical,high,medium}',
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role = 'admin')
ON CONFLICT (channel_id) DO NOTHING;

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Trigger for updated_at columns
CREATE TRIGGER update_monitors_updated_at
    BEFORE UPDATE ON training_system_monitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON training_system_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON training_alert_notification_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at
    BEFORE UPDATE ON training_performance_dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_reports_updated_at
    BEFORE UPDATE ON training_system_health_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_system_monitors IS 'Configurable system monitors for training infrastructure with threshold-based alerting';
COMMENT ON TABLE training_system_metrics IS 'Time-series metric data collection with automated aggregation and anomaly detection';
COMMENT ON TABLE training_system_alerts IS 'Alert incident management with escalation, notification tracking, and resolution workflow';
COMMENT ON TABLE training_alert_notification_channels IS 'Multi-channel alert delivery system with rate limiting and health monitoring';
COMMENT ON TABLE training_performance_dashboards IS 'Interactive performance dashboards with real-time visualization and sharing capabilities';
COMMENT ON TABLE training_system_health_reports IS 'Comprehensive system health reporting with trend analysis and business impact assessment';

-- Performance optimization
ANALYZE training_system_monitors;
ANALYZE training_system_metrics;
ANALYZE training_system_alerts;
ANALYZE training_alert_notification_channels;
ANALYZE training_performance_dashboards;
ANALYZE training_system_health_reports;