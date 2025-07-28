-- Restaurant Krong Thai SOP Management System
-- SOP Environmental Data Integration
-- Migration 046: Environmental monitoring and impact tracking for operations
-- Created: 2025-07-28

-- ===========================================
-- ENVIRONMENTAL DATA ENUMS
-- ===========================================

-- Environmental sensor types
CREATE TYPE sensor_type AS ENUM (
    'temperature', 'humidity', 'air_quality', 'noise_level', 'light_level',
    'co2_level', 'particulate_matter', 'pressure', 'water_quality', 'energy_meter'
);

-- Environmental zones
CREATE TYPE environmental_zone AS ENUM (
    'kitchen', 'dining_room', 'bar_area', 'storage', 'prep_area', 'walk_in_cooler',
    'freezer', 'dish_pit', 'office', 'restroom', 'outdoor_seating', 'loading_dock'
);

-- Data quality levels
CREATE TYPE data_quality AS ENUM ('excellent', 'good', 'fair', 'poor', 'failed');

-- Alert severity levels
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical', 'emergency');

-- Compliance status
CREATE TYPE compliance_status AS ENUM ('compliant', 'warning', 'violation', 'unknown');

-- ===========================================
-- ENVIRONMENTAL MONITORING INFRASTRUCTURE
-- ===========================================

-- Environmental sensors registry and configuration
CREATE TABLE IF NOT EXISTS sop_environmental_sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Sensor identification
    sensor_code VARCHAR(50) NOT NULL,
    sensor_name VARCHAR(255) NOT NULL,
    sensor_type sensor_type NOT NULL,
    manufacturer VARCHAR(100),
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Physical installation
    zone environmental_zone NOT NULL,
    location_description TEXT,
    installation_coordinates POINT, -- GPS coordinates if applicable
    installation_height_meters DECIMAL(5,2),
    installation_date DATE,
    
    -- Technical specifications
    measurement_unit VARCHAR(20) NOT NULL, -- °C, %, ppm, dB, lux, etc.
    measurement_range_min DECIMAL(12,6),
    measurement_range_max DECIMAL(12,6),
    accuracy_percentage DECIMAL(5,2), -- Measurement accuracy
    resolution DECIMAL(12,6), -- Smallest detectable change
    
    -- Data collection settings
    sampling_frequency_seconds INTEGER DEFAULT 300, -- How often to collect data
    data_retention_days INTEGER DEFAULT 365,
    transmission_method VARCHAR(50), -- 'wifi', 'ethernet', 'cellular', 'zigbee'
    
    -- Calibration and maintenance
    last_calibration_date DATE,
    calibration_frequency_days INTEGER DEFAULT 90,
    next_calibration_due DATE,
    calibration_certificate_url TEXT,
    
    -- Alert thresholds
    warning_threshold_min DECIMAL(12,6),
    warning_threshold_max DECIMAL(12,6),
    critical_threshold_min DECIMAL(12,6),
    critical_threshold_max DECIMAL(12,6),
    
    -- Operational status
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT true,
    last_data_received TIMESTAMPTZ,
    battery_level_percentage INTEGER, -- For battery-powered sensors
    signal_strength_percentage INTEGER,
    
    -- Quality control
    data_validation_enabled BOOLEAN DEFAULT true,
    outlier_detection_enabled BOOLEAN DEFAULT true,
    smoothing_algorithm VARCHAR(50), -- 'moving_average', 'exponential', 'none'
    
    -- Integration settings
    api_endpoint TEXT,
    authentication_token TEXT,
    data_format VARCHAR(20) DEFAULT 'json', -- 'json', 'xml', 'csv'
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_env_sensor_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_env_sensor_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_sensor_code UNIQUE (restaurant_id, sensor_code)
);

-- Real-time environmental data collection
CREATE TABLE IF NOT EXISTS sop_environmental_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sensor_id UUID NOT NULL,
    
    -- Measurement details
    measurement_timestamp TIMESTAMPTZ DEFAULT NOW(),
    measurement_value DECIMAL(12,6) NOT NULL,
    measurement_unit VARCHAR(20) NOT NULL,
    
    -- Data context
    sop_document_id UUID, -- SOP being executed during measurement
    user_id UUID, -- User present during measurement
    shift_type VARCHAR(50),
    business_activity VARCHAR(100), -- 'prep', 'service', 'cleaning', 'idle'
    
    -- Environmental context
    zone environmental_zone NOT NULL,
    outdoor_temperature DECIMAL(6,2), -- External temperature for context
    outdoor_humidity DECIMAL(5,2), -- External humidity for context
    weather_conditions VARCHAR(100), -- 'sunny', 'rainy', 'cloudy', etc.
    
    -- Data quality indicators
    data_quality data_quality DEFAULT 'good',
    confidence_level DECIMAL(4,2) DEFAULT 100, -- 0-100 confidence in measurement
    is_estimated BOOLEAN DEFAULT false, -- True if value is interpolated
    validation_flags JSONB DEFAULT '{}', -- Quality control flags
    
    -- Sensor status at time of reading
    sensor_battery_level INTEGER,
    sensor_signal_strength INTEGER,
    sensor_temperature DECIMAL(6,2), -- Internal sensor temperature
    
    -- Derived metrics
    comfort_index DECIMAL(5,2), -- Calculated comfort level (0-100)
    health_safety_score DECIMAL(5,2), -- Health/safety impact score (0-100)
    compliance_score DECIMAL(5,2), -- Regulatory compliance score (0-100)
    
    -- Correlations
    concurrent_measurements JSONB DEFAULT '{}', -- Other sensor readings at same time
    equipment_usage_context JSONB DEFAULT '{}', -- Equipment operating during measurement
    customer_count INTEGER, -- Number of customers present
    staff_count INTEGER, -- Number of staff present
    
    -- Processing metadata
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    processing_flags JSONB DEFAULT '{}',
    raw_data JSONB DEFAULT '{}', -- Original sensor data if transformed
    
    -- Partitioning hint for time-series optimization
    measurement_date DATE GENERATED ALWAYS AS (measurement_timestamp::date) STORED,
    
    CONSTRAINT fk_env_data_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_env_data_sensor FOREIGN KEY (sensor_id) REFERENCES sop_environmental_sensors(id) ON DELETE CASCADE,
    CONSTRAINT fk_env_data_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_env_data_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- Environmental conditions impact on SOP performance
CREATE TABLE IF NOT EXISTS sop_environmental_impact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    
    -- Analysis period
    analysis_date DATE NOT NULL,
    analysis_period VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
    
    -- Environmental conditions summary
    avg_temperature_celsius DECIMAL(6,2),
    avg_humidity_percentage DECIMAL(5,2),
    avg_air_quality_index DECIMAL(6,2),
    avg_noise_level_db DECIMAL(6,2),
    avg_light_level_lux DECIMAL(8,2),
    avg_co2_level_ppm DECIMAL(8,2),
    
    -- Condition ranges
    temperature_range_celsius DECIMAL(6,2), -- Max - Min
    humidity_range_percentage DECIMAL(5,2),
    air_quality_range DECIMAL(6,2),
    
    -- Performance correlation
    sop_completion_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of successful completions
    average_completion_time_minutes DECIMAL(8,2) DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of errors/issues
    quality_score DECIMAL(5,2) DEFAULT 100, -- Output quality rating
    
    -- Staff performance correlation
    staff_efficiency_score DECIMAL(5,2) DEFAULT 100,
    staff_comfort_level DECIMAL(5,2) DEFAULT 100, -- Based on environmental conditions
    fatigue_indicators DECIMAL(5,2) DEFAULT 0, -- Signs of staff fatigue due to environment
    
    -- Customer impact
    customer_satisfaction_correlation DECIMAL(8,4) DEFAULT 0, -- Correlation coefficient
    complaint_correlation DECIMAL(8,4) DEFAULT 0,
    service_speed_correlation DECIMAL(8,4) DEFAULT 0,
    
    -- Energy consumption correlation
    hvac_energy_consumption_kwh DECIMAL(10,4) DEFAULT 0,
    lighting_energy_consumption_kwh DECIMAL(10,4) DEFAULT 0,
    total_energy_consumption_kwh DECIMAL(10,4) DEFAULT 0,
    energy_efficiency_score DECIMAL(5,2) DEFAULT 100,
    
    -- Compliance metrics
    health_code_compliance compliance_status DEFAULT 'compliant',
    safety_regulation_compliance compliance_status DEFAULT 'compliant',
    environmental_regulation_compliance compliance_status DEFAULT 'compliant',
    violations_count INTEGER DEFAULT 0,
    
    -- Optimization opportunities
    temperature_optimization_potential DECIMAL(8,4) DEFAULT 0, -- Potential energy savings
    humidity_optimization_potential DECIMAL(8,4) DEFAULT 0,
    air_quality_improvement_needed BOOLEAN DEFAULT false,
    lighting_optimization_potential DECIMAL(8,4) DEFAULT 0,
    
    -- Predictive indicators
    equipment_stress_level DECIMAL(5,2) DEFAULT 0, -- Environmental stress on equipment
    maintenance_urgency_increase DECIMAL(5,2) DEFAULT 0,
    food_safety_risk_level DECIMAL(5,2) DEFAULT 0,
    
    -- Statistical analysis
    data_points_analyzed INTEGER DEFAULT 0,
    confidence_interval DECIMAL(5,2) DEFAULT 95,
    correlation_significance DECIMAL(8,6) DEFAULT 0, -- P-value
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_env_impact_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_env_impact_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT unique_sop_env_analysis UNIQUE (restaurant_id, sop_document_id, analysis_date, analysis_period)
);

-- Environmental compliance tracking and reporting
CREATE TABLE IF NOT EXISTS sop_environmental_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Compliance framework
    regulation_type VARCHAR(100) NOT NULL, -- 'health_code', 'fire_safety', 'environmental', 'osha'
    regulation_name VARCHAR(255) NOT NULL,
    regulation_code VARCHAR(50),
    effective_date DATE,
    
    -- Requirements
    parameter_name VARCHAR(100) NOT NULL, -- 'temperature', 'humidity', 'air_quality', etc.
    zone environmental_zone,
    min_allowed_value DECIMAL(12,6),
    max_allowed_value DECIMAL(12,6),
    target_value DECIMAL(12,6),
    tolerance_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Monitoring requirements
    monitoring_frequency_hours INTEGER DEFAULT 1,
    documentation_required BOOLEAN DEFAULT true,
    alert_required BOOLEAN DEFAULT true,
    immediate_action_required BOOLEAN DEFAULT false,
    
    -- Current compliance status
    compliance_status compliance_status DEFAULT 'unknown',
    last_compliance_check TIMESTAMPTZ,
    days_in_compliance INTEGER DEFAULT 0,
    violations_this_period INTEGER DEFAULT 0,
    
    -- Historical compliance
    compliance_rate_30_days DECIMAL(5,2) DEFAULT 100, -- Percentage compliant in last 30 days
    compliance_rate_90_days DECIMAL(5,2) DEFAULT 100,
    compliance_rate_annual DECIMAL(5,2) DEFAULT 100,
    total_violations_annual INTEGER DEFAULT 0,
    
    -- Risk assessment
    violation_risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    potential_penalty_amount DECIMAL(10,2) DEFAULT 0,
    business_impact_level VARCHAR(20) DEFAULT 'low',
    
    -- Corrective actions
    standard_corrective_actions JSONB DEFAULT '{}',
    escalation_procedures JSONB DEFAULT '{}',
    responsible_roles TEXT[],
    
    -- Reporting
    report_to_authorities_required BOOLEAN DEFAULT false,
    reporting_frequency VARCHAR(50), -- 'immediate', 'daily', 'weekly', 'monthly'
    last_report_submitted TIMESTAMPTZ,
    next_report_due TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_env_compliance_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_env_compliance_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_compliance_regulation UNIQUE (restaurant_id, regulation_type, parameter_name, zone)
);

-- Environmental alerts and incident management
CREATE TABLE IF NOT EXISTS sop_environmental_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sensor_id UUID,
    
    -- Alert identification
    alert_type VARCHAR(100) NOT NULL, -- 'threshold_exceeded', 'sensor_failure', 'compliance_violation'
    alert_severity alert_severity NOT NULL,
    alert_category VARCHAR(100), -- 'health_safety', 'comfort', 'compliance', 'equipment'
    
    -- Alert trigger details
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_value DECIMAL(12,6),
    threshold_value DECIMAL(12,6),
    parameter_name VARCHAR(100),
    zone environmental_zone,
    
    -- Alert context
    sop_context UUID, -- SOP being executed when alert triggered
    environmental_conditions JSONB DEFAULT '{}', -- Other sensor readings at time of alert
    business_context JSONB DEFAULT '{}', -- Customer count, staff count, activities
    
    -- Alert message and impact
    alert_title VARCHAR(255) NOT NULL,
    alert_description TEXT,
    potential_impacts TEXT[], -- Health, safety, compliance, comfort impacts
    recommended_actions TEXT[],
    
    -- Urgency and priority
    urgency_score INTEGER DEFAULT 3, -- 1-5 scale
    estimated_resolution_time_minutes INTEGER,
    business_impact_level VARCHAR(20) DEFAULT 'low',
    customer_facing BOOLEAN DEFAULT false,
    
    -- Response tracking
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    response_actions_taken TEXT[],
    corrective_measures TEXT[],
    resolution_time_minutes INTEGER,
    
    -- Alert resolution
    resolved_at TIMESTAMPTZ,
    resolution_method VARCHAR(100), -- 'automatic', 'manual_adjustment', 'equipment_repair'
    resolution_notes TEXT,
    effectiveness_rating INTEGER, -- 1-5 rating of resolution effectiveness
    
    -- Escalation tracking
    escalated BOOLEAN DEFAULT false,
    escalated_to UUID,
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    
    -- Follow-up actions
    preventive_actions_identified TEXT[],
    training_required BOOLEAN DEFAULT false,
    policy_update_required BOOLEAN DEFAULT false,
    equipment_maintenance_scheduled BOOLEAN DEFAULT false,
    
    -- Pattern analysis
    similar_alerts_count INTEGER DEFAULT 0,
    is_recurring_issue BOOLEAN DEFAULT false,
    root_cause_identified BOOLEAN DEFAULT false,
    root_cause_description TEXT,
    
    -- Compliance implications
    compliance_violation BOOLEAN DEFAULT false,
    reporting_required BOOLEAN DEFAULT false,
    reported_to_authorities BOOLEAN DEFAULT false,
    report_reference_number VARCHAR(100),
    
    -- Cost impact
    estimated_cost_impact DECIMAL(10,2) DEFAULT 0,
    actual_cost_impact DECIMAL(10,2) DEFAULT 0,
    lost_revenue_estimate DECIMAL(10,2) DEFAULT 0,
    
    alert_status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_env_alert_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_env_alert_sensor FOREIGN KEY (sensor_id) REFERENCES sop_environmental_sensors(id),
    CONSTRAINT fk_env_alert_sop_context FOREIGN KEY (sop_context) REFERENCES sop_documents(id),
    CONSTRAINT fk_env_alert_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES auth_users(id),
    CONSTRAINT fk_env_alert_escalated_to FOREIGN KEY (escalated_to) REFERENCES auth_users(id)
);

-- Environmental sustainability tracking
CREATE TABLE IF NOT EXISTS sop_environmental_sustainability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Tracking period
    tracking_date DATE NOT NULL,
    tracking_period VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    
    -- Energy consumption
    total_energy_consumption_kwh DECIMAL(12,4) DEFAULT 0,
    renewable_energy_percentage DECIMAL(5,2) DEFAULT 0,
    hvac_energy_consumption_kwh DECIMAL(10,4) DEFAULT 0,
    lighting_energy_consumption_kwh DECIMAL(10,4) DEFAULT 0,
    equipment_energy_consumption_kwh DECIMAL(10,4) DEFAULT 0,
    
    -- Water consumption
    total_water_consumption_liters DECIMAL(12,2) DEFAULT 0,
    hot_water_consumption_liters DECIMAL(10,2) DEFAULT 0,
    recycled_water_percentage DECIMAL(5,2) DEFAULT 0,
    water_efficiency_score DECIMAL(5,2) DEFAULT 100,
    
    -- Waste management
    total_waste_generated_kg DECIMAL(10,2) DEFAULT 0,
    food_waste_kg DECIMAL(8,2) DEFAULT 0,
    packaging_waste_kg DECIMAL(8,2) DEFAULT 0,
    recyclable_waste_kg DECIMAL(8,2) DEFAULT 0,
    composted_waste_kg DECIMAL(8,2) DEFAULT 0,
    waste_diversion_rate DECIMAL(5,2) DEFAULT 0, -- Percentage diverted from landfill
    
    -- Carbon footprint
    direct_co2_emissions_kg DECIMAL(12,4) DEFAULT 0, -- Scope 1 emissions
    indirect_co2_emissions_kg DECIMAL(12,4) DEFAULT 0, -- Scope 2 emissions
    total_carbon_footprint_kg DECIMAL(12,4) DEFAULT 0,
    carbon_intensity_per_customer DECIMAL(8,4) DEFAULT 0,
    
    -- Resource efficiency
    energy_per_customer_kwh DECIMAL(8,4) DEFAULT 0,
    water_per_customer_liters DECIMAL(8,2) DEFAULT 0,
    waste_per_customer_kg DECIMAL(6,4) DEFAULT 0,
    
    -- Sustainable practices
    local_sourcing_percentage DECIMAL(5,2) DEFAULT 0,
    organic_ingredients_percentage DECIMAL(5,2) DEFAULT 0,
    sustainable_packaging_percentage DECIMAL(5,2) DEFAULT 0,
    biodegradable_products_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Environmental impact scores
    overall_sustainability_score DECIMAL(5,2) DEFAULT 50, -- 0-100 composite score
    environmental_impact_score DECIMAL(5,2) DEFAULT 50, -- 0-100, lower is better
    green_certification_score DECIMAL(5,2) DEFAULT 0, -- Points toward green certifications
    
    -- Comparative metrics
    improvement_vs_baseline DECIMAL(8,4) DEFAULT 0, -- Percentage improvement
    performance_vs_target DECIMAL(8,4) DEFAULT 0, -- Performance against sustainability targets
    industry_benchmark_comparison DECIMAL(8,4) DEFAULT 0, -- Comparison to industry average
    
    -- Cost implications
    sustainability_investments DECIMAL(10,2) DEFAULT 0,
    cost_savings_from_efficiency DECIMAL(10,2) DEFAULT 0,
    environmental_cost_avoidance DECIMAL(10,2) DEFAULT 0,
    
    -- Future projections
    projected_annual_savings DECIMAL(12,2) DEFAULT 0,
    sustainability_roi_percentage DECIMAL(8,4) DEFAULT 0,
    payback_period_months DECIMAL(6,2) DEFAULT 0,
    
    -- Certifications and compliance
    green_certifications TEXT[],
    sustainability_awards TEXT[],
    environmental_compliance_score DECIMAL(5,2) DEFAULT 100,
    
    -- Reporting and transparency
    sustainability_report_data JSONB DEFAULT '{}',
    public_disclosure_data JSONB DEFAULT '{}',
    stakeholder_engagement_score DECIMAL(5,2) DEFAULT 50,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_env_sustainability_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_sustainability_tracking UNIQUE (restaurant_id, tracking_date, tracking_period)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Environmental sensors indexes
CREATE INDEX idx_env_sensors_restaurant ON sop_environmental_sensors(restaurant_id);
CREATE INDEX idx_env_sensors_type ON sop_environmental_sensors(sensor_type);
CREATE INDEX idx_env_sensors_zone ON sop_environmental_sensors(zone);
CREATE INDEX idx_env_sensors_active ON sop_environmental_sensors(is_active) WHERE is_active = true;
CREATE INDEX idx_env_sensors_online ON sop_environmental_sensors(is_online) WHERE is_online = true;

-- Environmental data indexes (time-series optimized)
CREATE INDEX idx_env_data_sensor_time ON sop_environmental_data(sensor_id, measurement_timestamp);
CREATE INDEX idx_env_data_restaurant_date ON sop_environmental_data(restaurant_id, measurement_date);
CREATE INDEX idx_env_data_zone_time ON sop_environmental_data(zone, measurement_timestamp);
CREATE INDEX idx_env_data_sop ON sop_environmental_data(sop_document_id);
CREATE INDEX idx_env_data_quality ON sop_environmental_data(data_quality);

-- Partitioning hint index for time-series optimization
CREATE INDEX idx_env_data_timestamp_date ON sop_environmental_data(measurement_timestamp, measurement_date);

-- Environmental impact indexes
CREATE INDEX idx_env_impact_restaurant_sop ON sop_environmental_impact(restaurant_id, sop_document_id);
CREATE INDEX idx_env_impact_date ON sop_environmental_impact(analysis_date);
CREATE INDEX idx_env_impact_period ON sop_environmental_impact(analysis_period);

-- Environmental compliance indexes
CREATE INDEX idx_env_compliance_restaurant ON sop_environmental_compliance(restaurant_id);
CREATE INDEX idx_env_compliance_type ON sop_environmental_compliance(regulation_type);
CREATE INDEX idx_env_compliance_status ON sop_environmental_compliance(compliance_status);
CREATE INDEX idx_env_compliance_active ON sop_environmental_compliance(is_active) WHERE is_active = true;

-- Environmental alerts indexes
CREATE INDEX idx_env_alerts_restaurant ON sop_environmental_alerts(restaurant_id);
CREATE INDEX idx_env_alerts_sensor ON sop_environmental_alerts(sensor_id);
CREATE INDEX idx_env_alerts_severity ON sop_environmental_alerts(alert_severity);
CREATE INDEX idx_env_alerts_status ON sop_environmental_alerts(alert_status);
CREATE INDEX idx_env_alerts_triggered_at ON sop_environmental_alerts(triggered_at);

-- Environmental sustainability indexes
CREATE INDEX idx_env_sustainability_restaurant ON sop_environmental_sustainability(restaurant_id);
CREATE INDEX idx_env_sustainability_date ON sop_environmental_sustainability(tracking_date);
CREATE INDEX idx_env_sustainability_period ON sop_environmental_sustainability(tracking_period);
CREATE INDEX idx_env_sustainability_score ON sop_environmental_sustainability(overall_sustainability_score);

-- Composite indexes for analytics
CREATE INDEX idx_env_data_analytics ON sop_environmental_data(restaurant_id, zone, measurement_timestamp, measurement_value);
CREATE INDEX idx_env_compliance_monitoring ON sop_environmental_compliance(restaurant_id, compliance_status, last_compliance_check);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on environmental tables
ALTER TABLE sop_environmental_sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_environmental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_environmental_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_environmental_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_environmental_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_environmental_sustainability ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Environmental sensors restaurant access"
ON sop_environmental_sensors FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Environmental data restaurant access"
ON sop_environmental_data FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Environmental impact restaurant access"
ON sop_environmental_impact FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Environmental compliance restaurant access"
ON sop_environmental_compliance FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Environmental alerts restaurant access"
ON sop_environmental_alerts FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Environmental sustainability restaurant access"
ON sop_environmental_sustainability FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_environmental_sensors_updated_at 
    BEFORE UPDATE ON sop_environmental_sensors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_environmental_compliance_updated_at 
    BEFORE UPDATE ON sop_environmental_compliance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_environmental_alerts_updated_at 
    BEFORE UPDATE ON sop_environmental_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ENVIRONMENTAL ANALYTICS FUNCTIONS
-- ===========================================

-- Function to calculate environmental comfort index
CREATE OR REPLACE FUNCTION calculate_comfort_index(
    p_temperature_celsius DECIMAL,
    p_humidity_percentage DECIMAL,
    p_air_quality_index DECIMAL DEFAULT NULL,
    p_noise_level_db DECIMAL DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    temperature_score DECIMAL DEFAULT 0;
    humidity_score DECIMAL DEFAULT 0;
    air_quality_score DECIMAL DEFAULT 100;
    noise_score DECIMAL DEFAULT 100;
    comfort_index DECIMAL DEFAULT 0;
BEGIN
    -- Temperature comfort score (optimal range 20-24°C)
    temperature_score := CASE
        WHEN p_temperature_celsius BETWEEN 20 AND 24 THEN 100
        WHEN p_temperature_celsius BETWEEN 18 AND 26 THEN 80
        WHEN p_temperature_celsius BETWEEN 16 AND 28 THEN 60
        WHEN p_temperature_celsius BETWEEN 14 AND 30 THEN 40
        ELSE 20
    END;
    
    -- Humidity comfort score (optimal range 40-60%)
    humidity_score := CASE
        WHEN p_humidity_percentage BETWEEN 40 AND 60 THEN 100
        WHEN p_humidity_percentage BETWEEN 30 AND 70 THEN 80
        WHEN p_humidity_percentage BETWEEN 25 AND 75 THEN 60
        WHEN p_humidity_percentage BETWEEN 20 AND 80 THEN 40
        ELSE 20
    END;
    
    -- Air quality score (lower is better, <50 is excellent)
    IF p_air_quality_index IS NOT NULL THEN
        air_quality_score := CASE
            WHEN p_air_quality_index <= 50 THEN 100
            WHEN p_air_quality_index <= 100 THEN 80
            WHEN p_air_quality_index <= 150 THEN 60
            WHEN p_air_quality_index <= 200 THEN 40
            ELSE 20
        END;
    END IF;
    
    -- Noise level score (optimal <60 dB for restaurants)
    IF p_noise_level_db IS NOT NULL THEN
        noise_score := CASE
            WHEN p_noise_level_db <= 60 THEN 100
            WHEN p_noise_level_db <= 70 THEN 80
            WHEN p_noise_level_db <= 80 THEN 60
            WHEN p_noise_level_db <= 90 THEN 40
            ELSE 20
        END;
    END IF;
    
    -- Weighted average (temperature and humidity are most important)
    comfort_index := (temperature_score * 0.35 + humidity_score * 0.35 + 
                     air_quality_score * 0.20 + noise_score * 0.10);
    
    RETURN ROUND(comfort_index, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to check compliance status
CREATE OR REPLACE FUNCTION check_environmental_compliance(
    p_restaurant_id UUID,
    p_zone environmental_zone,
    p_parameter VARCHAR,
    p_current_value DECIMAL
)
RETURNS compliance_status AS $$
DECLARE
    compliance_record RECORD;
    status compliance_status DEFAULT 'unknown';
BEGIN
    -- Get compliance requirements
    SELECT min_allowed_value, max_allowed_value, tolerance_percentage
    INTO compliance_record
    FROM sop_environmental_compliance
    WHERE restaurant_id = p_restaurant_id
      AND zone = p_zone
      AND parameter_name = p_parameter
      AND is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN 'unknown';
    END IF;
    
    -- Calculate tolerance ranges
    DECLARE
        min_with_tolerance DECIMAL;
        max_with_tolerance DECIMAL;
        warning_buffer DECIMAL DEFAULT 0.1; -- 10% buffer for warnings
    BEGIN
        min_with_tolerance := compliance_record.min_allowed_value * 
                             (1 - COALESCE(compliance_record.tolerance_percentage, 0) / 100);
        max_with_tolerance := compliance_record.max_allowed_value * 
                             (1 + COALESCE(compliance_record.tolerance_percentage, 0) / 100);
        
        -- Determine compliance status
        IF p_current_value BETWEEN min_with_tolerance AND max_with_tolerance THEN
            status := 'compliant';
        ELSIF p_current_value BETWEEN 
              (min_with_tolerance * (1 - warning_buffer)) AND 
              (max_with_tolerance * (1 + warning_buffer)) THEN
            status := 'warning';
        ELSE
            status := 'violation';
        END IF;
    END;
    
    RETURN status;
END;
$$ LANGUAGE plpgsql;

-- Function to get environmental trends
CREATE OR REPLACE FUNCTION get_environmental_trends(
    p_restaurant_id UUID,
    p_sensor_type sensor_type,
    p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    measurement_date DATE,
    avg_value DECIMAL,
    min_value DECIMAL,
    max_value DECIMAL,
    trend_direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            ed.measurement_date,
            AVG(ed.measurement_value) as avg_value,
            MIN(ed.measurement_value) as min_value,
            MAX(ed.measurement_value) as max_value,
            ROW_NUMBER() OVER (ORDER BY ed.measurement_date) as row_num
        FROM sop_environmental_data ed
        JOIN sop_environmental_sensors es ON ed.sensor_id = es.id
        WHERE ed.restaurant_id = p_restaurant_id
          AND es.sensor_type = p_sensor_type
          AND ed.measurement_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
        GROUP BY ed.measurement_date
    ),
    with_trends AS (
        SELECT 
            ds.*,
            CASE 
                WHEN LAG(ds.avg_value) OVER (ORDER BY ds.measurement_date) IS NULL THEN 'stable'
                WHEN ds.avg_value > LAG(ds.avg_value) OVER (ORDER BY ds.measurement_date) * 1.05 THEN 'increasing'
                WHEN ds.avg_value < LAG(ds.avg_value) OVER (ORDER BY ds.measurement_date) * 0.95 THEN 'decreasing'
                ELSE 'stable'
            END as trend_direction
        FROM daily_stats ds
    )
    SELECT 
        wt.measurement_date,
        wt.avg_value,
        wt.min_value,
        wt.max_value,
        wt.trend_direction
    FROM with_trends wt
    ORDER BY wt.measurement_date;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_environmental_sensors IS 'Environmental sensor registry with specifications and monitoring configuration';
COMMENT ON TABLE sop_environmental_data IS 'Real-time environmental measurements with quality indicators and context';
COMMENT ON TABLE sop_environmental_impact IS 'Analysis of environmental conditions impact on SOP performance and outcomes';
COMMENT ON TABLE sop_environmental_compliance IS 'Environmental compliance tracking and regulatory requirement management';
COMMENT ON TABLE sop_environmental_alerts IS 'Environmental monitoring alerts with incident management and response tracking';
COMMENT ON TABLE sop_environmental_sustainability IS 'Sustainability metrics and environmental impact tracking for reporting';

-- Performance optimization
ANALYZE sop_environmental_sensors;
ANALYZE sop_environmental_data;
ANALYZE sop_environmental_impact;
ANALYZE sop_environmental_compliance;
ANALYZE sop_environmental_alerts;
ANALYZE sop_environmental_sustainability;