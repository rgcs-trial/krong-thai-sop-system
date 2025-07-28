-- Restaurant Krong Thai SOP Management System
-- SOP Equipment Utilization Tracking
-- Migration 045: Equipment usage monitoring and maintenance scheduling
-- Created: 2025-07-28

-- ===========================================
-- EQUIPMENT UTILIZATION ENUMS
-- ===========================================

-- Equipment categories
CREATE TYPE equipment_category AS ENUM (
    'cooking', 'refrigeration', 'food_prep', 'cleaning', 'serving', 'storage',
    'pos_system', 'display', 'audio_visual', 'safety', 'hvac', 'lighting'
);

-- Equipment status
CREATE TYPE equipment_status AS ENUM (
    'operational', 'maintenance_required', 'out_of_service', 'scheduled_maintenance',
    'under_repair', 'decommissioned', 'new', 'testing'
);

-- Utilization levels
CREATE TYPE utilization_status AS ENUM ('underutilized', 'optimal', 'overutilized', 'critical');

-- Maintenance types
CREATE TYPE maintenance_type AS ENUM (
    'preventive', 'corrective', 'predictive', 'emergency', 'routine', 'compliance'
);

-- Equipment priorities
CREATE TYPE equipment_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ===========================================
-- EQUIPMENT REGISTRY AND TRACKING
-- ===========================================

-- Equipment inventory and specifications
CREATE TABLE IF NOT EXISTS sop_equipment_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Equipment identification
    equipment_code VARCHAR(50) NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(100),
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Classification and specifications
    category equipment_category NOT NULL,
    subcategory VARCHAR(100),
    equipment_type VARCHAR(100), -- Specific type within category
    capacity_rating VARCHAR(100), -- Power, volume, speed ratings
    energy_rating VARCHAR(20), -- Energy efficiency rating
    
    -- Physical attributes
    dimensions JSONB DEFAULT '{}', -- Length, width, height, weight
    installation_location VARCHAR(255),
    installation_date DATE,
    warranty_expiry_date DATE,
    
    -- Operational parameters
    rated_capacity DECIMAL(10,2), -- Units per hour, volume, etc.
    max_operating_hours_per_day INTEGER DEFAULT 24,
    recommended_utilization_percentage DECIMAL(5,2) DEFAULT 80,
    minimum_idle_time_hours DECIMAL(6,2) DEFAULT 0,
    
    -- Cost information
    purchase_cost DECIMAL(12,2),
    installation_cost DECIMAL(10,2),
    annual_maintenance_cost DECIMAL(10,2),
    energy_cost_per_hour DECIMAL(8,4),
    depreciation_rate DECIMAL(6,4), -- Annual depreciation percentage
    
    -- Maintenance schedule
    maintenance_frequency_days INTEGER DEFAULT 30,
    last_maintenance_date DATE,
    next_maintenance_due DATE,
    maintenance_window_hours INTEGER DEFAULT 4, -- Hours needed for maintenance
    
    -- Safety and compliance
    safety_certifications TEXT[],
    compliance_requirements TEXT[],
    safety_inspection_due DATE,
    operator_certification_required BOOLEAN DEFAULT false,
    
    -- Current status
    status equipment_status DEFAULT 'operational',
    current_location VARCHAR(255),
    assigned_to_sops UUID[], -- Array of SOP document IDs
    primary_operator_id UUID,
    
    -- Performance baselines
    baseline_efficiency_percentage DECIMAL(5,2) DEFAULT 100,
    baseline_throughput_per_hour DECIMAL(10,2),
    baseline_energy_consumption DECIMAL(8,4), -- kWh per hour
    baseline_maintenance_hours DECIMAL(6,2),
    
    -- Monitoring configuration
    iot_sensor_enabled BOOLEAN DEFAULT false,
    sensor_data_frequency_minutes INTEGER DEFAULT 15,
    alert_thresholds JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_equipment_registry_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_registry_primary_operator FOREIGN KEY (primary_operator_id) REFERENCES auth_users(id),
    CONSTRAINT fk_equipment_registry_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_equipment_code UNIQUE (restaurant_id, equipment_code)
);

-- Real-time equipment usage tracking
CREATE TABLE IF NOT EXISTS sop_equipment_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    equipment_id UUID NOT NULL,
    sop_document_id UUID,
    
    -- Usage session details
    usage_start TIMESTAMPTZ NOT NULL,
    usage_end TIMESTAMPTZ,
    duration_minutes INTEGER,
    operator_id UUID,
    shift_type VARCHAR(50),
    
    -- Usage context
    task_description TEXT,
    usage_purpose VARCHAR(100), -- 'production', 'cleaning', 'maintenance', 'training'
    batch_size INTEGER DEFAULT 1,
    output_quantity DECIMAL(10,2),
    
    -- Performance metrics
    actual_throughput_per_hour DECIMAL(10,2),
    efficiency_percentage DECIMAL(5,2), -- Actual vs rated capacity
    utilization_percentage DECIMAL(5,2), -- Time used vs available time
    quality_score DECIMAL(5,2) DEFAULT 100, -- Output quality rating
    
    -- Resource consumption
    energy_consumed_kwh DECIMAL(8,4),
    water_consumed_liters DECIMAL(8,2),
    consumables_used JSONB DEFAULT '{}', -- Materials consumed during operation
    
    -- Operational conditions
    ambient_temperature_celsius DECIMAL(5,2),
    ambient_humidity_percentage DECIMAL(5,2),
    load_factor DECIMAL(5,2), -- Percentage of maximum load
    operating_mode VARCHAR(100), -- Normal, intensive, eco, maintenance
    
    -- Issue tracking
    issues_encountered INTEGER DEFAULT 0,
    issue_descriptions TEXT[],
    downtime_minutes INTEGER DEFAULT 0,
    error_codes TEXT[],
    
    -- Maintenance indicators
    vibration_level DECIMAL(8,4), -- For rotating equipment
    temperature_readings JSONB DEFAULT '{}', -- Various temperature sensors
    pressure_readings JSONB DEFAULT '{}', -- Pressure sensors
    flow_rates JSONB DEFAULT '{}', -- Flow rate measurements
    
    -- Economic metrics
    operating_cost DECIMAL(10,2), -- Energy + consumables + labor
    revenue_generated DECIMAL(10,2), -- If directly measurable
    cost_per_unit DECIMAL(8,4), -- Operating cost per output unit
    
    -- Data source and quality
    data_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'iot_sensor', 'pos_integration'
    data_quality_score DECIMAL(4,2) DEFAULT 100,
    sensor_data JSONB DEFAULT '{}', -- Raw sensor readings
    
    -- Session notes
    operator_notes TEXT,
    supervisor_notes TEXT,
    maintenance_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_equipment_usage_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_usage_equipment FOREIGN KEY (equipment_id) REFERENCES sop_equipment_registry(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_usage_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_equipment_usage_operator FOREIGN KEY (operator_id) REFERENCES auth_users(id),
    CONSTRAINT valid_usage_duration CHECK (usage_end IS NULL OR usage_end >= usage_start)
);

-- Equipment performance analytics and trends
CREATE TABLE IF NOT EXISTS sop_equipment_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    equipment_id UUID NOT NULL,
    
    -- Performance period
    analysis_date DATE NOT NULL,
    analysis_period VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
    
    -- Utilization metrics
    total_operating_hours DECIMAL(8,2) DEFAULT 0,
    available_hours DECIMAL(8,2) DEFAULT 0,
    scheduled_downtime_hours DECIMAL(8,2) DEFAULT 0,
    unscheduled_downtime_hours DECIMAL(8,2) DEFAULT 0,
    
    -- Calculated utilization rates
    overall_utilization_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN available_hours > 0 THEN 
            (total_operating_hours / available_hours) * 100 
        ELSE 0 END
    ) STORED,
    availability_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN (available_hours + unscheduled_downtime_hours) > 0 THEN 
            (available_hours / (available_hours + unscheduled_downtime_hours)) * 100 
        ELSE 0 END
    ) STORED,
    
    -- Performance indicators
    average_efficiency_percentage DECIMAL(5,2) DEFAULT 0,
    peak_efficiency_percentage DECIMAL(5,2) DEFAULT 0,
    efficiency_standard_deviation DECIMAL(5,2) DEFAULT 0,
    throughput_variance_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Quality metrics
    average_quality_score DECIMAL(5,2) DEFAULT 100,
    quality_incidents INTEGER DEFAULT 0,
    defect_rate_percentage DECIMAL(5,2) DEFAULT 0,
    rework_instances INTEGER DEFAULT 0,
    
    -- Economic performance
    total_operating_cost DECIMAL(12,2) DEFAULT 0,
    cost_per_operating_hour DECIMAL(8,4) DEFAULT 0,
    energy_efficiency_rating DECIMAL(5,2) DEFAULT 100, -- Compared to baseline
    maintenance_cost_ratio DECIMAL(5,2) DEFAULT 0, -- Maintenance cost vs operating cost
    
    -- Reliability metrics
    failure_count INTEGER DEFAULT 0,
    mean_time_between_failures_hours DECIMAL(10,2) DEFAULT 0,
    mean_time_to_repair_hours DECIMAL(8,2) DEFAULT 0,
    reliability_score DECIMAL(5,2) DEFAULT 100,
    
    -- Trend indicators
    utilization_trend VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
    efficiency_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
    cost_trend VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
    
    -- Predictive indicators
    predicted_failure_risk DECIMAL(5,2) DEFAULT 0, -- 0-100 probability
    maintenance_urgency_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    replacement_recommendation BOOLEAN DEFAULT false,
    
    -- Comparative analysis
    performance_vs_baseline DECIMAL(8,4) DEFAULT 100, -- Percentage of baseline performance
    peer_equipment_comparison DECIMAL(8,4) DEFAULT 100, -- Compared to similar equipment
    industry_benchmark_comparison DECIMAL(8,4) DEFAULT 100,
    
    -- Environmental impact
    carbon_footprint_kg DECIMAL(10,4) DEFAULT 0,
    water_usage_efficiency DECIMAL(8,4) DEFAULT 100,
    waste_generation_kg DECIMAL(8,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_equipment_performance_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_performance_equipment FOREIGN KEY (equipment_id) REFERENCES sop_equipment_registry(id) ON DELETE CASCADE,
    CONSTRAINT unique_equipment_analysis_date UNIQUE (restaurant_id, equipment_id, analysis_date, analysis_period)
);

-- Equipment maintenance scheduling and tracking
CREATE TABLE IF NOT EXISTS sop_equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    equipment_id UUID NOT NULL,
    
    -- Maintenance identification
    maintenance_order_number VARCHAR(50),
    maintenance_type maintenance_type NOT NULL,
    priority equipment_priority DEFAULT 'medium',
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_start_time TIME,
    estimated_duration_hours DECIMAL(6,2),
    maintenance_window_start TIMESTAMPTZ,
    maintenance_window_end TIMESTAMPTZ,
    
    -- Execution tracking
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    actual_duration_hours DECIMAL(6,2),
    
    -- Maintenance details
    work_description TEXT NOT NULL,
    maintenance_checklist JSONB DEFAULT '{}',
    parts_replaced JSONB DEFAULT '{}',
    consumables_used JSONB DEFAULT '{}',
    
    -- Personnel and resources
    primary_technician_id UUID,
    assistant_technicians UUID[],
    external_contractor VARCHAR(255),
    specialized_tools_required TEXT[],
    
    -- Costs
    labor_cost DECIMAL(10,2) DEFAULT 0,
    parts_cost DECIMAL(10,2) DEFAULT 0,
    external_service_cost DECIMAL(10,2) DEFAULT 0,
    total_maintenance_cost DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(labor_cost, 0) + COALESCE(parts_cost, 0) + COALESCE(external_service_cost, 0)
    ) STORED,
    
    -- Quality and compliance
    quality_inspection_passed BOOLEAN DEFAULT true,
    compliance_requirements_met BOOLEAN DEFAULT true,
    safety_protocols_followed BOOLEAN DEFAULT true,
    documentation_complete BOOLEAN DEFAULT false,
    
    -- Results and outcomes
    maintenance_status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'deferred'
    completion_notes TEXT,
    issues_found TEXT[],
    recommendations TEXT[],
    
    -- Performance impact
    pre_maintenance_efficiency DECIMAL(5,2),
    post_maintenance_efficiency DECIMAL(5,2),
    performance_improvement DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE WHEN pre_maintenance_efficiency > 0 THEN
            ((COALESCE(post_maintenance_efficiency, 0) - pre_maintenance_efficiency) / pre_maintenance_efficiency) * 100
        ELSE 0 END
    ) STORED,
    
    -- Next maintenance prediction
    next_maintenance_type maintenance_type,
    next_maintenance_due_date DATE,
    maintenance_frequency_adjustment_days INTEGER DEFAULT 0,
    
    -- Documentation
    before_photos TEXT[], -- URLs to before photos
    after_photos TEXT[], -- URLs to after photos
    maintenance_report_url TEXT,
    warranty_claim_number VARCHAR(100),
    
    -- Approval and sign-off
    approved_by UUID,
    approval_date DATE,
    supervisor_signoff UUID,
    signoff_date DATE,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_equipment_maintenance_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_maintenance_equipment FOREIGN KEY (equipment_id) REFERENCES sop_equipment_registry(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_maintenance_technician FOREIGN KEY (primary_technician_id) REFERENCES auth_users(id),
    CONSTRAINT fk_equipment_maintenance_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_equipment_maintenance_supervisor FOREIGN KEY (supervisor_signoff) REFERENCES auth_users(id),
    CONSTRAINT fk_equipment_maintenance_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT valid_maintenance_window CHECK (maintenance_window_end IS NULL OR maintenance_window_end >= maintenance_window_start)
);

-- Equipment alerts and monitoring
CREATE TABLE IF NOT EXISTS sop_equipment_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    equipment_id UUID NOT NULL,
    
    -- Alert identification
    alert_type VARCHAR(100) NOT NULL, -- 'overutilization', 'efficiency_drop', 'maintenance_due', 'failure_risk'
    alert_severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    alert_status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
    
    -- Alert trigger details
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_condition TEXT NOT NULL,
    threshold_value DECIMAL(15,6),
    actual_value DECIMAL(15,6),
    deviation_percentage DECIMAL(8,4),
    
    -- Alert context
    sop_context UUID, -- SOP being executed when alert triggered
    operator_context UUID, -- User operating equipment when alert triggered
    usage_session_id UUID, -- Reference to usage session
    
    -- Alert message and details
    alert_title VARCHAR(255) NOT NULL,
    alert_description TEXT,
    recommended_actions TEXT[],
    urgency_level INTEGER DEFAULT 3, -- 1-5 scale
    
    -- Response tracking
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    response_actions TEXT[],
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    
    -- Escalation
    escalated BOOLEAN DEFAULT false,
    escalated_to UUID,
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    
    -- Impact assessment
    impact_on_operations VARCHAR(20) DEFAULT 'low', -- 'none', 'low', 'medium', 'high', 'critical'
    estimated_downtime_hours DECIMAL(6,2) DEFAULT 0,
    estimated_cost_impact DECIMAL(10,2) DEFAULT 0,
    customer_impact BOOLEAN DEFAULT false,
    
    -- Prevention and learning
    root_cause_analysis TEXT,
    prevention_measures TEXT[],
    similar_incidents_count INTEGER DEFAULT 0,
    
    -- Notification tracking
    notifications_sent INTEGER DEFAULT 0,
    notification_methods TEXT[], -- 'email', 'sms', 'push', 'dashboard'
    last_notification_sent TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_equipment_alert_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_alert_equipment FOREIGN KEY (equipment_id) REFERENCES sop_equipment_registry(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_alert_sop FOREIGN KEY (sop_context) REFERENCES sop_documents(id),
    CONSTRAINT fk_equipment_alert_operator FOREIGN KEY (operator_context) REFERENCES auth_users(id),
    CONSTRAINT fk_equipment_alert_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES auth_users(id),
    CONSTRAINT fk_equipment_alert_escalated_to FOREIGN KEY (escalated_to) REFERENCES auth_users(id)
);

-- Equipment ROI and business impact analysis
CREATE TABLE IF NOT EXISTS sop_equipment_business_impact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    equipment_id UUID NOT NULL,
    
    -- Analysis period
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    analysis_type VARCHAR(50) DEFAULT 'quarterly', -- 'monthly', 'quarterly', 'annual'
    
    -- Financial metrics
    total_operating_cost DECIMAL(12,2) DEFAULT 0,
    total_maintenance_cost DECIMAL(10,2) DEFAULT 0,
    total_energy_cost DECIMAL(10,2) DEFAULT 0,
    total_downtime_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Revenue contribution
    direct_revenue_generated DECIMAL(12,2) DEFAULT 0,
    indirect_revenue_contribution DECIMAL(12,2) DEFAULT 0,
    revenue_per_operating_hour DECIMAL(8,4) DEFAULT 0,
    
    -- ROI calculations
    return_on_investment_percentage DECIMAL(8,4) DEFAULT 0,
    payback_period_months DECIMAL(6,2) DEFAULT 0,
    net_present_value DECIMAL(12,2) DEFAULT 0,
    total_cost_of_ownership DECIMAL(12,2) DEFAULT 0,
    
    -- Productivity impact
    productivity_improvement_percentage DECIMAL(8,4) DEFAULT 0,
    labor_savings_hours DECIMAL(8,2) DEFAULT 0,
    process_efficiency_gain DECIMAL(8,4) DEFAULT 0,
    quality_improvement_percentage DECIMAL(8,4) DEFAULT 0,
    
    -- Operational benefits
    capacity_increase_percentage DECIMAL(8,4) DEFAULT 0,
    waste_reduction_percentage DECIMAL(8,4) DEFAULT 0,
    energy_efficiency_improvement DECIMAL(8,4) DEFAULT 0,
    compliance_improvement BOOLEAN DEFAULT false,
    
    -- Risk mitigation
    safety_incidents_prevented INTEGER DEFAULT 0,
    compliance_violations_avoided INTEGER DEFAULT 0,
    customer_complaints_reduced INTEGER DEFAULT 0,
    reputation_impact_score DECIMAL(5,2) DEFAULT 100, -- 0-100
    
    -- Comparative analysis
    performance_vs_previous_period DECIMAL(8,4) DEFAULT 0,
    performance_vs_industry_average DECIMAL(8,4) DEFAULT 0,
    replacement_cost_comparison DECIMAL(12,2) DEFAULT 0,
    
    -- Future projections
    projected_lifespan_years DECIMAL(6,2),
    projected_annual_savings DECIMAL(12,2) DEFAULT 0,
    upgrade_recommendation BOOLEAN DEFAULT false,
    replacement_timeline_months INTEGER,
    
    -- Strategic impact
    supports_business_objectives BOOLEAN DEFAULT true,
    customer_satisfaction_impact DECIMAL(5,2) DEFAULT 0, -- -100 to +100
    staff_satisfaction_impact DECIMAL(5,2) DEFAULT 0, -- -100 to +100
    competitive_advantage_score DECIMAL(5,2) DEFAULT 50, -- 0-100
    
    -- Recommendations
    optimization_opportunities TEXT[],
    cost_reduction_recommendations TEXT[],
    performance_improvement_actions TEXT[],
    investment_recommendations TEXT[],
    
    -- Analysis metadata
    analyzed_by UUID,
    analysis_confidence_level DECIMAL(4,2) DEFAULT 80, -- 0-100
    data_sources_used TEXT[],
    assumptions_made TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_equipment_impact_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_impact_equipment FOREIGN KEY (equipment_id) REFERENCES sop_equipment_registry(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_impact_analyzed_by FOREIGN KEY (analyzed_by) REFERENCES auth_users(id),
    CONSTRAINT valid_analysis_period CHECK (analysis_period_end >= analysis_period_start),
    CONSTRAINT unique_equipment_analysis_period UNIQUE (restaurant_id, equipment_id, analysis_period_start, analysis_period_end)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Equipment registry indexes
CREATE INDEX idx_equipment_registry_restaurant ON sop_equipment_registry(restaurant_id);
CREATE INDEX idx_equipment_registry_category ON sop_equipment_registry(category);
CREATE INDEX idx_equipment_registry_status ON sop_equipment_registry(status);
CREATE INDEX idx_equipment_registry_active ON sop_equipment_registry(is_active) WHERE is_active = true;
CREATE INDEX idx_equipment_registry_maintenance_due ON sop_equipment_registry(next_maintenance_due);

-- Equipment usage indexes
CREATE INDEX idx_equipment_usage_restaurant_equipment ON sop_equipment_usage(restaurant_id, equipment_id);
CREATE INDEX idx_equipment_usage_start_time ON sop_equipment_usage(usage_start);
CREATE INDEX idx_equipment_usage_sop ON sop_equipment_usage(sop_document_id);
CREATE INDEX idx_equipment_usage_operator ON sop_equipment_usage(operator_id);
CREATE INDEX idx_equipment_usage_duration ON sop_equipment_usage(duration_minutes);

-- Equipment performance indexes
CREATE INDEX idx_equipment_performance_restaurant_equipment ON sop_equipment_performance(restaurant_id, equipment_id);
CREATE INDEX idx_equipment_performance_date ON sop_equipment_performance(analysis_date);
CREATE INDEX idx_equipment_performance_utilization ON sop_equipment_performance(overall_utilization_rate);
CREATE INDEX idx_equipment_performance_efficiency ON sop_equipment_performance(average_efficiency_percentage);

-- Equipment maintenance indexes
CREATE INDEX idx_equipment_maintenance_restaurant_equipment ON sop_equipment_maintenance(restaurant_id, equipment_id);
CREATE INDEX idx_equipment_maintenance_scheduled_date ON sop_equipment_maintenance(scheduled_date);
CREATE INDEX idx_equipment_maintenance_status ON sop_equipment_maintenance(maintenance_status);
CREATE INDEX idx_equipment_maintenance_type ON sop_equipment_maintenance(maintenance_type);

-- Equipment alerts indexes
CREATE INDEX idx_equipment_alerts_restaurant_equipment ON sop_equipment_alerts(restaurant_id, equipment_id);
CREATE INDEX idx_equipment_alerts_status ON sop_equipment_alerts(alert_status);
CREATE INDEX idx_equipment_alerts_severity ON sop_equipment_alerts(alert_severity);
CREATE INDEX idx_equipment_alerts_triggered_at ON sop_equipment_alerts(triggered_at);

-- Equipment impact indexes
CREATE INDEX idx_equipment_impact_restaurant_equipment ON sop_equipment_business_impact(restaurant_id, equipment_id);
CREATE INDEX idx_equipment_impact_period ON sop_equipment_business_impact(analysis_period_start, analysis_period_end);
CREATE INDEX idx_equipment_impact_roi ON sop_equipment_business_impact(return_on_investment_percentage);

-- Composite indexes for analytics
CREATE INDEX idx_equipment_utilization_analytics ON sop_equipment_usage(restaurant_id, equipment_id, usage_start, utilization_percentage);
CREATE INDEX idx_equipment_cost_analytics ON sop_equipment_maintenance(restaurant_id, scheduled_date, total_maintenance_cost, maintenance_type);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on equipment tables
ALTER TABLE sop_equipment_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_equipment_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_equipment_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_equipment_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_equipment_business_impact ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Equipment registry restaurant access"
ON sop_equipment_registry FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Equipment usage restaurant access"
ON sop_equipment_usage FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Equipment performance restaurant access"
ON sop_equipment_performance FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Equipment maintenance restaurant access"
ON sop_equipment_maintenance FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Equipment alerts restaurant access"
ON sop_equipment_alerts FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Equipment impact restaurant access"
ON sop_equipment_business_impact FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_equipment_registry_updated_at 
    BEFORE UPDATE ON sop_equipment_registry 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_equipment_maintenance_updated_at 
    BEFORE UPDATE ON sop_equipment_maintenance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_equipment_alerts_updated_at 
    BEFORE UPDATE ON sop_equipment_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- EQUIPMENT ANALYTICS FUNCTIONS
-- ===========================================

-- Function to calculate equipment utilization
CREATE OR REPLACE FUNCTION calculate_equipment_utilization(
    p_restaurant_id UUID,
    p_equipment_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_usage_hours DECIMAL,
    available_hours DECIMAL,
    utilization_rate DECIMAL,
    efficiency_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH usage_stats AS (
        SELECT 
            SUM(duration_minutes) / 60.0 as usage_hours,
            AVG(efficiency_percentage) as avg_efficiency
        FROM sop_equipment_usage
        WHERE restaurant_id = p_restaurant_id
          AND equipment_id = p_equipment_id
          AND usage_start::date BETWEEN p_start_date AND p_end_date
    ),
    availability_stats AS (
        SELECT 
            (p_end_date - p_start_date + 1) * 24.0 as total_hours
    )
    SELECT 
        COALESCE(u.usage_hours, 0) as total_usage_hours,
        a.total_hours as available_hours,
        CASE WHEN a.total_hours > 0 THEN 
            (COALESCE(u.usage_hours, 0) / a.total_hours) * 100 
        ELSE 0 END as utilization_rate,
        COALESCE(u.avg_efficiency, 0) as efficiency_rate
    FROM usage_stats u
    CROSS JOIN availability_stats a;
END;
$$ LANGUAGE plpgsql;

-- Function to predict maintenance needs
CREATE OR REPLACE FUNCTION predict_maintenance_urgency(
    p_equipment_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    urgency_score INTEGER DEFAULT 0;
    last_maintenance_days INTEGER;
    failure_indicators INTEGER;
    utilization_rate DECIMAL;
BEGIN
    -- Calculate days since last maintenance
    SELECT 
        COALESCE(CURRENT_DATE - last_maintenance_date, 365)
    INTO last_maintenance_days
    FROM sop_equipment_registry
    WHERE id = p_equipment_id;
    
    -- Count recent failure indicators
    SELECT COUNT(*)
    INTO failure_indicators
    FROM sop_equipment_alerts
    WHERE equipment_id = p_equipment_id
      AND triggered_at >= NOW() - INTERVAL '30 days'
      AND alert_type IN ('efficiency_drop', 'failure_risk');
    
    -- Get recent utilization rate
    SELECT COALESCE(AVG(utilization_percentage), 0)
    INTO utilization_rate
    FROM sop_equipment_usage
    WHERE equipment_id = p_equipment_id
      AND usage_start >= NOW() - INTERVAL '7 days';
    
    -- Calculate urgency score
    urgency_score := 
        LEAST(50, last_maintenance_days / 2) + -- Age factor (max 50 points)
        (failure_indicators * 15) + -- Failure indicators (15 points each)
        LEAST(25, utilization_rate / 4); -- Utilization factor (max 25 points)
    
    RETURN LEAST(100, urgency_score);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_equipment_registry IS 'Equipment inventory with specifications, maintenance schedules, and operational parameters';
COMMENT ON TABLE sop_equipment_usage IS 'Real-time tracking of equipment usage with performance and resource consumption metrics';
COMMENT ON TABLE sop_equipment_performance IS 'Equipment performance analytics with utilization rates and trend analysis';
COMMENT ON TABLE sop_equipment_maintenance IS 'Maintenance scheduling and execution tracking with cost analysis';
COMMENT ON TABLE sop_equipment_alerts IS 'Equipment monitoring alerts with response tracking and escalation management';
COMMENT ON TABLE sop_equipment_business_impact IS 'ROI and business impact analysis for equipment investments and optimization';

-- Performance optimization
ANALYZE sop_equipment_registry;
ANALYZE sop_equipment_usage;
ANALYZE sop_equipment_performance;
ANALYZE sop_equipment_maintenance;
ANALYZE sop_equipment_alerts;
ANALYZE sop_equipment_business_impact;