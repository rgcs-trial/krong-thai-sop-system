-- Restaurant Krong Thai SOP Management System
-- SOP Cost Analysis Data Structures
-- Migration 044: Advanced cost tracking and operational efficiency analytics
-- Created: 2025-07-28

-- ===========================================
-- COST ANALYSIS ENUMS
-- ===========================================

-- Cost categories
CREATE TYPE cost_category AS ENUM (
    'labor', 'materials', 'equipment', 'utilities', 'training', 'compliance',
    'maintenance', 'waste', 'inventory', 'overhead', 'technology', 'quality_control'
);

-- Cost types
CREATE TYPE cost_type AS ENUM (
    'direct', 'indirect', 'fixed', 'variable', 'overhead', 'opportunity'
);

-- Cost allocation methods
CREATE TYPE cost_allocation_method AS ENUM (
    'direct_assignment', 'activity_based', 'time_based', 'volume_based', 
    'weighted_average', 'standard_cost', 'actual_cost'
);

-- Resource utilization levels
CREATE TYPE utilization_level AS ENUM ('low', 'optimal', 'high', 'critical');

-- Cost variance types
CREATE TYPE variance_type AS ENUM ('favorable', 'unfavorable', 'neutral');

-- Budget periods
CREATE TYPE budget_period AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- ===========================================
-- SOP COST TRACKING TABLES
-- ===========================================

-- SOP cost centers and activity definitions
CREATE TABLE IF NOT EXISTS sop_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Cost center identification
    cost_center_code VARCHAR(50) NOT NULL,
    cost_center_name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100), -- Kitchen, service, bar, etc.
    
    -- Hierarchical structure
    parent_cost_center_id UUID,
    cost_center_level INTEGER DEFAULT 1,
    is_profit_center BOOLEAN DEFAULT false,
    
    -- Cost allocation settings
    allocation_method cost_allocation_method DEFAULT 'activity_based',
    allocation_drivers JSONB DEFAULT '{}', -- Factors used for cost allocation
    overhead_rate DECIMAL(8,4) DEFAULT 0, -- Percentage for overhead allocation
    
    -- Budget and targets
    monthly_budget DECIMAL(12,2) DEFAULT 0,
    yearly_budget DECIMAL(12,2) DEFAULT 0,
    cost_per_transaction_target DECIMAL(8,4) DEFAULT 0,
    efficiency_target_percentage DECIMAL(5,2) DEFAULT 100,
    
    -- Operational metrics
    capacity_units INTEGER DEFAULT 0, -- Maximum processing capacity
    standard_processing_time_minutes DECIMAL(8,2) DEFAULT 0,
    standard_labor_hours DECIMAL(8,2) DEFAULT 0,
    quality_standards JSONB DEFAULT '{}',
    
    -- Financial settings
    currency_code CHAR(3) DEFAULT 'CAD',
    tax_rate DECIMAL(6,4) DEFAULT 0,
    depreciation_method VARCHAR(50), -- 'straight_line', 'declining_balance'
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_cost_center_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_center_parent FOREIGN KEY (parent_cost_center_id) REFERENCES sop_cost_centers(id),
    CONSTRAINT fk_cost_center_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_cost_center_code UNIQUE (restaurant_id, cost_center_code)
);

-- Detailed SOP cost tracking for each document
CREATE TABLE IF NOT EXISTS sop_cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    cost_center_id UUID,
    
    -- Cost period and context
    cost_date DATE NOT NULL,
    cost_period budget_period DEFAULT 'daily',
    shift_type VARCHAR(50), -- morning, afternoon, evening, night
    business_volume INTEGER DEFAULT 0, -- Transactions, covers, etc.
    
    -- Labor costs
    direct_labor_hours DECIMAL(8,2) DEFAULT 0,
    direct_labor_cost DECIMAL(10,2) DEFAULT 0,
    indirect_labor_hours DECIMAL(8,2) DEFAULT 0,
    indirect_labor_cost DECIMAL(10,2) DEFAULT 0,
    training_hours DECIMAL(8,2) DEFAULT 0,
    training_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Material and supply costs
    raw_materials_cost DECIMAL(10,2) DEFAULT 0,
    consumables_cost DECIMAL(10,2) DEFAULT 0,
    packaging_cost DECIMAL(10,2) DEFAULT 0,
    cleaning_supplies_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Equipment and facility costs
    equipment_usage_cost DECIMAL(10,2) DEFAULT 0,
    equipment_maintenance_cost DECIMAL(10,2) DEFAULT 0,
    energy_consumption_cost DECIMAL(10,2) DEFAULT 0,
    facility_overhead_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Technology and system costs
    software_licensing_cost DECIMAL(10,2) DEFAULT 0,
    system_maintenance_cost DECIMAL(10,2) DEFAULT 0,
    data_storage_cost DECIMAL(10,2) DEFAULT 0,
    connectivity_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Quality and compliance costs
    quality_control_cost DECIMAL(10,2) DEFAULT 0,
    compliance_audit_cost DECIMAL(10,2) DEFAULT 0,
    certification_cost DECIMAL(10,2) DEFAULT 0,
    inspection_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Waste and inefficiency costs
    food_waste_cost DECIMAL(10,2) DEFAULT 0,
    time_waste_cost DECIMAL(10,2) DEFAULT 0,
    rework_cost DECIMAL(10,2) DEFAULT 0,
    error_correction_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Calculated totals
    total_direct_cost DECIMAL(12,2) GENERATED ALWAYS AS (
        direct_labor_cost + raw_materials_cost + consumables_cost + 
        packaging_cost + equipment_usage_cost
    ) STORED,
    total_indirect_cost DECIMAL(12,2) GENERATED ALWAYS AS (
        indirect_labor_cost + facility_overhead_cost + software_licensing_cost + 
        system_maintenance_cost + compliance_audit_cost
    ) STORED,
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
        direct_labor_cost + indirect_labor_cost + training_cost +
        raw_materials_cost + consumables_cost + packaging_cost + 
        cleaning_supplies_cost + equipment_usage_cost + equipment_maintenance_cost +
        energy_consumption_cost + facility_overhead_cost + software_licensing_cost +
        system_maintenance_cost + data_storage_cost + connectivity_cost +
        quality_control_cost + compliance_audit_cost + certification_cost +
        inspection_cost + food_waste_cost + time_waste_cost + rework_cost + 
        error_correction_cost
    ) STORED,
    
    -- Performance metrics
    cost_per_execution DECIMAL(10,4) GENERATED ALWAYS AS (
        CASE WHEN business_volume > 0 THEN (
            direct_labor_cost + indirect_labor_cost + training_cost +
            raw_materials_cost + consumables_cost + packaging_cost + 
            cleaning_supplies_cost + equipment_usage_cost + equipment_maintenance_cost +
            energy_consumption_cost + facility_overhead_cost + software_licensing_cost +
            system_maintenance_cost + data_storage_cost + connectivity_cost +
            quality_control_cost + compliance_audit_cost + certification_cost +
            inspection_cost + food_waste_cost + time_waste_cost + rework_cost + 
            error_correction_cost
        ) / business_volume ELSE 0 END
    ) STORED,
    
    -- Variance analysis
    budget_variance DECIMAL(10,2) DEFAULT 0,
    efficiency_variance DECIMAL(10,2) DEFAULT 0,
    volume_variance DECIMAL(10,2) DEFAULT 0,
    
    -- Additional context
    notes TEXT,
    cost_drivers JSONB DEFAULT '{}', -- Factors affecting costs
    external_factors JSONB DEFAULT '{}', -- Weather, events, promotions, etc.
    
    -- Data quality
    data_source VARCHAR(100), -- 'manual', 'pos_system', 'inventory_system', 'payroll'
    confidence_level DECIMAL(4,2) DEFAULT 100, -- 0-100
    is_estimated BOOLEAN DEFAULT false,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_cost_tracking_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_tracking_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_tracking_cost_center FOREIGN KEY (cost_center_id) REFERENCES sop_cost_centers(id),
    CONSTRAINT fk_cost_tracking_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_sop_cost_date UNIQUE (restaurant_id, sop_document_id, cost_date, shift_type)
);

-- Cost benchmarking and comparative analysis
CREATE TABLE IF NOT EXISTS sop_cost_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Benchmark identification
    benchmark_name VARCHAR(255) NOT NULL,
    benchmark_type VARCHAR(100), -- 'internal', 'industry', 'best_practice', 'theoretical'
    benchmark_source VARCHAR(255), -- Source of benchmark data
    benchmark_date DATE NOT NULL,
    
    -- Scope and category
    sop_category_id UUID,
    cost_center_id UUID,
    business_segment VARCHAR(100), -- fast_casual, fine_dining, etc.
    
    -- Benchmark metrics
    benchmark_cost_per_unit DECIMAL(10,4) NOT NULL,
    benchmark_labor_efficiency DECIMAL(8,4), -- Hours per unit
    benchmark_material_efficiency DECIMAL(8,4), -- Cost per unit
    benchmark_quality_score DECIMAL(5,2), -- 0-100
    
    -- Performance ranges
    excellent_threshold DECIMAL(10,4), -- Top 10% performance
    good_threshold DECIMAL(10,4), -- Top 25% performance
    average_threshold DECIMAL(10,4), -- Average performance
    poor_threshold DECIMAL(10,4), -- Bottom 25% performance
    
    -- Contextual factors
    volume_range_min INTEGER, -- Minimum volume for benchmark applicability
    volume_range_max INTEGER, -- Maximum volume for benchmark applicability
    seasonal_adjustments JSONB DEFAULT '{}', -- Monthly adjustment factors
    regional_adjustments JSONB DEFAULT '{}', -- Geographic adjustment factors
    
    -- Statistical data
    sample_size INTEGER,
    confidence_interval DECIMAL(5,2), -- Percentage
    standard_deviation DECIMAL(10,4),
    data_reliability_score DECIMAL(4,2) DEFAULT 100, -- 0-100
    
    -- Update tracking
    last_updated DATE,
    update_frequency VARCHAR(50), -- 'monthly', 'quarterly', 'annually'
    next_update_due DATE,
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_cost_benchmark_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_benchmark_category FOREIGN KEY (sop_category_id) REFERENCES sop_categories(id),
    CONSTRAINT fk_cost_benchmark_cost_center FOREIGN KEY (cost_center_id) REFERENCES sop_cost_centers(id),
    CONSTRAINT fk_cost_benchmark_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_benchmark_name_date UNIQUE (restaurant_id, benchmark_name, benchmark_date)
);

-- SOP cost optimization opportunities and recommendations
CREATE TABLE IF NOT EXISTS sop_cost_optimization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID,
    cost_center_id UUID,
    
    -- Optimization identification
    opportunity_title VARCHAR(255) NOT NULL,
    opportunity_type VARCHAR(100), -- 'process_improvement', 'technology', 'training', 'supplier'
    priority_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Current state analysis
    current_cost_per_unit DECIMAL(10,4),
    current_process_time_minutes DECIMAL(8,2),
    current_quality_score DECIMAL(5,2),
    current_utilization_rate DECIMAL(5,2),
    
    -- Proposed improvements
    proposed_solution TEXT NOT NULL,
    implementation_steps JSONB DEFAULT '{}',
    required_resources JSONB DEFAULT '{}',
    
    -- Financial impact
    estimated_cost_reduction DECIMAL(10,2),
    estimated_investment_required DECIMAL(10,2),
    payback_period_months DECIMAL(6,2),
    roi_percentage DECIMAL(8,4),
    annual_savings_potential DECIMAL(12,2),
    
    -- Implementation details
    implementation_timeline_weeks INTEGER,
    implementation_complexity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    required_approvals TEXT[],
    stakeholders_involved TEXT[],
    
    -- Risk assessment
    implementation_risks JSONB DEFAULT '{}',
    success_probability DECIMAL(5,2) DEFAULT 75, -- 0-100
    risk_mitigation_plan TEXT,
    
    -- Impact metrics
    expected_time_savings_minutes DECIMAL(8,2),
    expected_quality_improvement DECIMAL(5,2),
    expected_waste_reduction_percentage DECIMAL(5,2),
    customer_impact_assessment TEXT,
    
    -- Tracking and status
    status VARCHAR(50) DEFAULT 'identified', -- 'identified', 'approved', 'in_progress', 'implemented', 'rejected'
    assigned_to UUID,
    target_implementation_date DATE,
    actual_implementation_date DATE,
    
    -- Results tracking
    actual_cost_reduction DECIMAL(10,2),
    actual_roi_percentage DECIMAL(8,4),
    lessons_learned TEXT,
    
    -- Validation
    approved_by UUID,
    approval_date DATE,
    approval_notes TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_cost_optimization_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_optimization_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_cost_optimization_cost_center FOREIGN KEY (cost_center_id) REFERENCES sop_cost_centers(id),
    CONSTRAINT fk_cost_optimization_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth_users(id),
    CONSTRAINT fk_cost_optimization_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_cost_optimization_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Real-time cost monitoring and alerts
CREATE TABLE IF NOT EXISTS sop_cost_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Alert configuration
    alert_name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(100), -- 'budget_variance', 'cost_spike', 'efficiency_drop', 'quality_issue'
    monitoring_scope VARCHAR(100), -- 'sop', 'category', 'cost_center', 'restaurant'
    target_id UUID, -- ID of the monitored entity
    
    -- Threshold settings
    warning_threshold DECIMAL(15,6),
    critical_threshold DECIMAL(15,6),
    threshold_type VARCHAR(20) DEFAULT 'absolute', -- 'absolute', 'percentage', 'deviation'
    comparison_period VARCHAR(50) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
    
    -- Alert conditions
    condition_logic JSONB NOT NULL, -- Complex conditions in JSON format
    aggregation_method VARCHAR(50) DEFAULT 'sum', -- 'sum', 'average', 'max', 'min', 'count'
    lookback_period_hours INTEGER DEFAULT 24,
    
    -- Alert delivery
    notification_methods TEXT[] DEFAULT '{"email"}', -- 'email', 'sms', 'webhook', 'dashboard'
    recipient_roles TEXT[] DEFAULT '{"manager"}',
    escalation_rules JSONB DEFAULT '{}',
    
    -- Current status
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    current_value DECIMAL(15,6),
    alert_status VARCHAR(20) DEFAULT 'normal', -- 'normal', 'warning', 'critical'
    
    -- Suppression rules
    suppression_enabled BOOLEAN DEFAULT false,
    suppression_start_time TIME,
    suppression_end_time TIME,
    suppression_days_of_week INTEGER[] DEFAULT '{}', -- 0=Sunday, 6=Saturday
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_cost_alert_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_alert_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_alert_name UNIQUE (restaurant_id, alert_name)
);

-- Cost analysis reporting and dashboards data
CREATE TABLE IF NOT EXISTS sop_cost_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Report identification
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100), -- 'variance_analysis', 'trend_analysis', 'benchmark_comparison', 'optimization'
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    
    -- Report scope
    scope_type VARCHAR(50), -- 'restaurant', 'department', 'sop_category', 'cost_center'
    scope_filters JSONB DEFAULT '{}',
    
    -- Report data
    summary_metrics JSONB NOT NULL, -- Key performance indicators
    detailed_breakdown JSONB DEFAULT '{}', -- Detailed cost breakdown
    variance_analysis JSONB DEFAULT '{}', -- Budget vs actual analysis
    trend_data JSONB DEFAULT '{}', -- Historical trend information
    
    -- Comparative analysis
    benchmark_comparisons JSONB DEFAULT '{}',
    peer_comparisons JSONB DEFAULT '{}',
    historical_comparisons JSONB DEFAULT '{}',
    
    -- Insights and recommendations
    key_insights TEXT[],
    cost_drivers_identified TEXT[],
    optimization_opportunities JSONB DEFAULT '{}',
    action_items JSONB DEFAULT '{}',
    
    -- Report metadata
    generated_by UUID,
    generation_time_seconds DECIMAL(8,3),
    data_freshness_hours INTEGER, -- How old is the source data
    confidence_score DECIMAL(4,2) DEFAULT 100, -- 0-100
    
    -- Distribution and access
    shared_with UUID[], -- Array of user IDs with access
    access_level VARCHAR(20) DEFAULT 'restricted', -- 'public', 'restricted', 'confidential'
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_cost_report_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_report_generated_by FOREIGN KEY (generated_by) REFERENCES auth_users(id),
    CONSTRAINT valid_report_period CHECK (report_period_end >= report_period_start)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Cost centers indexes
CREATE INDEX idx_cost_centers_restaurant ON sop_cost_centers(restaurant_id);
CREATE INDEX idx_cost_centers_active ON sop_cost_centers(is_active) WHERE is_active = true;
CREATE INDEX idx_cost_centers_department ON sop_cost_centers(department);
CREATE INDEX idx_cost_centers_parent ON sop_cost_centers(parent_cost_center_id);

-- Cost tracking indexes
CREATE INDEX idx_cost_tracking_restaurant_sop ON sop_cost_tracking(restaurant_id, sop_document_id);
CREATE INDEX idx_cost_tracking_date ON sop_cost_tracking(cost_date);
CREATE INDEX idx_cost_tracking_cost_center ON sop_cost_tracking(cost_center_id);
CREATE INDEX idx_cost_tracking_period ON sop_cost_tracking(cost_period, cost_date);
CREATE INDEX idx_cost_tracking_total_cost ON sop_cost_tracking(total_cost);

-- Cost benchmarks indexes
CREATE INDEX idx_cost_benchmarks_restaurant ON sop_cost_benchmarks(restaurant_id);
CREATE INDEX idx_cost_benchmarks_category ON sop_cost_benchmarks(sop_category_id);
CREATE INDEX idx_cost_benchmarks_type ON sop_cost_benchmarks(benchmark_type);
CREATE INDEX idx_cost_benchmarks_active ON sop_cost_benchmarks(is_active) WHERE is_active = true;

-- Cost optimization indexes
CREATE INDEX idx_cost_optimization_restaurant ON sop_cost_optimization(restaurant_id);
CREATE INDEX idx_cost_optimization_sop ON sop_cost_optimization(sop_document_id);
CREATE INDEX idx_cost_optimization_status ON sop_cost_optimization(status);
CREATE INDEX idx_cost_optimization_priority ON sop_cost_optimization(priority_level);
CREATE INDEX idx_cost_optimization_roi ON sop_cost_optimization(roi_percentage);

-- Cost alerts indexes
CREATE INDEX idx_cost_alerts_restaurant ON sop_cost_alerts(restaurant_id);
CREATE INDEX idx_cost_alerts_active ON sop_cost_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_cost_alerts_status ON sop_cost_alerts(alert_status);
CREATE INDEX idx_cost_alerts_last_triggered ON sop_cost_alerts(last_triggered);

-- Cost reports indexes
CREATE INDEX idx_cost_reports_restaurant ON sop_cost_reports(restaurant_id);
CREATE INDEX idx_cost_reports_type ON sop_cost_reports(report_type);
CREATE INDEX idx_cost_reports_period ON sop_cost_reports(report_period_start, report_period_end);
CREATE INDEX idx_cost_reports_generated_by ON sop_cost_reports(generated_by);

-- Composite indexes for complex queries
CREATE INDEX idx_cost_tracking_analytics ON sop_cost_tracking(restaurant_id, cost_date, cost_center_id, total_cost);
CREATE INDEX idx_cost_optimization_impact ON sop_cost_optimization(restaurant_id, status, estimated_cost_reduction, roi_percentage);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on cost analysis tables
ALTER TABLE sop_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_cost_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_cost_optimization ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_cost_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_cost_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Cost centers restaurant access"
ON sop_cost_centers FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Cost tracking restaurant access"
ON sop_cost_tracking FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Cost benchmarks restaurant access"
ON sop_cost_benchmarks FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Cost optimization restaurant access"
ON sop_cost_optimization FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Cost alerts restaurant access"
ON sop_cost_alerts FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Cost reports restaurant access"
ON sop_cost_reports FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_cost_centers_updated_at 
    BEFORE UPDATE ON sop_cost_centers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_cost_optimization_updated_at 
    BEFORE UPDATE ON sop_cost_optimization 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_cost_alerts_updated_at 
    BEFORE UPDATE ON sop_cost_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- COST ANALYSIS FUNCTIONS
-- ===========================================

-- Function to calculate cost variance
CREATE OR REPLACE FUNCTION calculate_cost_variance(
    p_restaurant_id UUID,
    p_sop_document_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    budget_variance DECIMAL,
    efficiency_variance DECIMAL,
    volume_variance DECIMAL,
    total_variance DECIMAL
) AS $$
DECLARE
    actual_costs DECIMAL;
    budgeted_costs DECIMAL;
    standard_cost_per_unit DECIMAL;
    actual_volume INTEGER;
    budgeted_volume INTEGER;
BEGIN
    -- Get actual costs
    SELECT SUM(total_cost) INTO actual_costs
    FROM sop_cost_tracking
    WHERE restaurant_id = p_restaurant_id
      AND sop_document_id = p_sop_document_id
      AND cost_date BETWEEN p_start_date AND p_end_date;
    
    -- Calculate variances (simplified example)
    budget_variance := COALESCE(actual_costs, 0) - COALESCE(budgeted_costs, 0);
    efficiency_variance := 0; -- Would require more complex calculation
    volume_variance := 0; -- Would require more complex calculation
    total_variance := budget_variance + efficiency_variance + volume_variance;
    
    RETURN QUERY SELECT budget_variance, efficiency_variance, volume_variance, total_variance;
END;
$$ LANGUAGE plpgsql;

-- Function to get cost trends
CREATE OR REPLACE FUNCTION get_cost_trends(
    p_restaurant_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    cost_date DATE,
    total_cost DECIMAL,
    labor_cost DECIMAL,
    material_cost DECIMAL,
    overhead_cost DECIMAL,
    cost_per_unit DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.cost_date,
        SUM(ct.total_cost) as total_cost,
        SUM(ct.direct_labor_cost + ct.indirect_labor_cost + ct.training_cost) as labor_cost,
        SUM(ct.raw_materials_cost + ct.consumables_cost + ct.packaging_cost) as material_cost,
        SUM(ct.facility_overhead_cost + ct.software_licensing_cost) as overhead_cost,
        AVG(ct.cost_per_execution) as cost_per_unit
    FROM sop_cost_tracking ct
    WHERE ct.restaurant_id = p_restaurant_id
      AND ct.cost_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    GROUP BY ct.cost_date
    ORDER BY ct.cost_date;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_cost_centers IS 'Cost centers and activity-based costing structure for restaurant operations';
COMMENT ON TABLE sop_cost_tracking IS 'Detailed cost tracking for SOP execution with comprehensive cost categories';
COMMENT ON TABLE sop_cost_benchmarks IS 'Cost benchmarking data for performance comparison and target setting';
COMMENT ON TABLE sop_cost_optimization IS 'Cost optimization opportunities with ROI analysis and implementation tracking';
COMMENT ON TABLE sop_cost_alerts IS 'Real-time cost monitoring and alerting system for budget control';
COMMENT ON TABLE sop_cost_reports IS 'Generated cost analysis reports with insights and recommendations';

-- Performance optimization
ANALYZE soo_cost_centers;
ANALYZE sop_cost_tracking;
ANALYZE sop_cost_benchmarks;
ANALYZE sop_cost_optimization;
ANALYZE sop_cost_alerts;
ANALYZE sop_cost_reports;