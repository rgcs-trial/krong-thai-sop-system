-- ================================================
-- CHAIN ANALYTICS DATA WAREHOUSE
-- Migration: 076_chain_analytics_warehouse.sql
-- Created: 2025-07-28
-- Purpose: Comprehensive business intelligence and analytics data warehouse for multi-restaurant chains
-- ================================================

-- Enable required extensions for analytics and data warehousing
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "tablefunc";

-- ===========================================
-- ANALYTICS ENUMS AND TYPES
-- ===========================================

-- Analytics dimension type enum
CREATE TYPE dimension_type AS ENUM ('time', 'location', 'product', 'customer', 'staff', 'operation', 'financial');

-- Measure aggregation type enum
CREATE TYPE measure_aggregation_type AS ENUM ('sum', 'avg', 'min', 'max', 'count', 'distinct_count', 'percentile', 'variance', 'stddev');

-- Data granularity enum
CREATE TYPE data_granularity AS ENUM ('minute', 'hour', 'day', 'week', 'month', 'quarter', 'year');

-- Report type enum
CREATE TYPE report_type AS ENUM (
    'operational', 'financial', 'strategic', 'compliance', 'performance', 
    'forecast', 'comparison', 'trend', 'exception', 'summary'
);

-- Data quality status enum
CREATE TYPE data_quality_status AS ENUM ('excellent', 'good', 'acceptable', 'poor', 'critical');

-- ETL status enum
CREATE TYPE etl_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');

-- ===========================================
-- DIMENSIONAL MODEL FOUNDATION
-- ===========================================

-- Time dimension (comprehensive business calendar)
CREATE TABLE dim_time (
    time_key INTEGER PRIMARY KEY,
    full_date DATE NOT NULL UNIQUE,
    date_name VARCHAR(50) NOT NULL,
    date_name_th VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    day_name_th VARCHAR(20) NOT NULL,
    day_of_month INTEGER NOT NULL,
    day_of_year INTEGER NOT NULL,
    weekday_flag BOOLEAN NOT NULL,
    week_of_year INTEGER NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    month_number INTEGER NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    month_name_th VARCHAR(20) NOT NULL,
    month_year VARCHAR(10) NOT NULL,
    quarter_number INTEGER NOT NULL,
    quarter_name VARCHAR(10) NOT NULL,
    year_number INTEGER NOT NULL,
    fiscal_year INTEGER,
    fiscal_quarter INTEGER,
    fiscal_month INTEGER,
    business_day_flag BOOLEAN NOT NULL,
    holiday_flag BOOLEAN DEFAULT false,
    holiday_name VARCHAR(100),
    holiday_name_th VARCHAR(100),
    season VARCHAR(20),
    thai_calendar_date VARCHAR(50),
    lunar_phase VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location dimension (restaurants and regions)
CREATE TABLE dim_location (
    location_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id),
    chain_id UUID REFERENCES restaurant_chains(id),
    region_id UUID REFERENCES chain_regions(id),
    location_code VARCHAR(50) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_name_th VARCHAR(255) NOT NULL,
    location_type VARCHAR(50), -- 'restaurant', 'region', 'chain', 'corporate'
    address TEXT,
    address_th TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Thailand',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    phone VARCHAR(20),
    email VARCHAR(255),
    opening_date DATE,
    closure_date DATE,
    seating_capacity INTEGER,
    square_footage INTEGER,
    parking_spaces INTEGER,
    drive_thru_flag BOOLEAN DEFAULT false,
    delivery_flag BOOLEAN DEFAULT true,
    takeout_flag BOOLEAN DEFAULT true,
    operating_hours JSONB DEFAULT '{}',
    manager_name VARCHAR(255),
    manager_name_th VARCHAR(255),
    location_tier VARCHAR(20), -- 'flagship', 'standard', 'express', 'kiosk'
    investment_level DECIMAL(15,2),
    market_segment VARCHAR(50),
    competition_density INTEGER,
    foot_traffic_rating INTEGER,
    is_active BOOLEAN DEFAULT true,
    hierarchy_path LTREE, -- for hierarchical queries
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product dimension (menu items and inventory)
CREATE TABLE dim_product (
    product_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID, -- can reference menu items or inventory items
    product_source VARCHAR(20), -- 'menu', 'inventory', 'combo', 'promotion'
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_name_th VARCHAR(255) NOT NULL,
    category_id UUID,
    category_name VARCHAR(255),
    category_name_th VARCHAR(255),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    supplier VARCHAR(255),
    unit_of_measure unit_measure,
    base_cost DECIMAL(12,4),
    suggested_price DECIMAL(10,2),
    profit_margin DECIMAL(5,2),
    preparation_time INTEGER,
    calories INTEGER,
    ingredients JSONB DEFAULT '[]',
    allergens JSONB DEFAULT '[]',
    dietary_classifications dietary_classification[] DEFAULT '{}',
    spice_level INTEGER DEFAULT 0,
    popularity_rank INTEGER,
    abc_classification CHAR(1),
    seasonal_flag BOOLEAN DEFAULT false,
    promotional_flag BOOLEAN DEFAULT false,
    signature_dish_flag BOOLEAN DEFAULT false,
    new_item_flag BOOLEAN DEFAULT false,
    discontinued_flag BOOLEAN DEFAULT false,
    menu_engineering_category VARCHAR(20), -- 'star', 'plow_horse', 'puzzle', 'dog'
    created_date DATE,
    discontinued_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff dimension
CREATE TABLE dim_staff (
    staff_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_profile_id UUID REFERENCES staff_profiles(id),
    user_id UUID REFERENCES auth_users(id),
    employee_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    full_name_th VARCHAR(255),
    position VARCHAR(100),
    position_th VARCHAR(100),
    department VARCHAR(100),
    employment_type VARCHAR(50),
    hire_date DATE,
    termination_date DATE,
    hourly_rate DECIMAL(8,2),
    salary DECIMAL(12,2),
    experience_level VARCHAR(50),
    education_level VARCHAR(50),
    certifications JSONB DEFAULT '[]',
    skills JSONB DEFAULT '[]',
    languages VARCHAR(10)[] DEFAULT '{}',
    age_group VARCHAR(20),
    gender VARCHAR(10),
    work_locations UUID[] DEFAULT '{}',
    direct_manager_id UUID,
    team_size INTEGER DEFAULT 0,
    performance_rating DECIMAL(3,2),
    is_supervisor BOOLEAN DEFAULT false,
    is_trainer BOOLEAN DEFAULT false,
    can_open_close BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer dimension (for future customer analytics)
CREATE TABLE dim_customer (
    customer_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(100), -- external customer ID
    customer_type VARCHAR(50) DEFAULT 'guest', -- 'member', 'vip', 'corporate', 'guest'
    age_group VARCHAR(20),
    gender VARCHAR(10),
    preferred_language VARCHAR(10),
    registration_date DATE,
    last_visit_date DATE,
    total_visits INTEGER DEFAULT 0,
    total_spend DECIMAL(12,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    preferred_location_id UUID,
    preferred_order_method VARCHAR(50), -- 'dine_in', 'takeout', 'delivery', 'online'
    dietary_preferences JSONB DEFAULT '[]',
    loyalty_tier VARCHAR(20),
    loyalty_points INTEGER DEFAULT 0,
    marketing_consent BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- FACT TABLES (STAR SCHEMA)
-- ===========================================

-- Sales fact table (primary business transactions)
CREATE TABLE fact_sales (
    sales_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_key INTEGER NOT NULL REFERENCES dim_time(time_key),
    location_key UUID NOT NULL REFERENCES dim_location(location_key),
    product_key UUID NOT NULL REFERENCES dim_product(product_key),
    staff_key UUID REFERENCES dim_staff(staff_key),
    customer_key UUID REFERENCES dim_customer(customer_key),
    transaction_id VARCHAR(100),
    order_id VARCHAR(100),
    line_item_number INTEGER,
    sale_date DATE NOT NULL,
    sale_hour INTEGER,
    sale_minute INTEGER,
    day_of_week INTEGER,
    order_type VARCHAR(50), -- 'dine_in', 'takeout', 'delivery', 'online'
    payment_method VARCHAR(50),
    -- Measures
    quantity_sold DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    gross_sales_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    net_sales_amount DECIMAL(12,2) NOT NULL,
    cost_of_goods_sold DECIMAL(10,2) DEFAULT 0,
    gross_profit DECIMAL(10,2) DEFAULT 0,
    service_charge DECIMAL(8,2) DEFAULT 0,
    tip_amount DECIMAL(8,2) DEFAULT 0,
    -- Additional measures
    preparation_time_actual INTEGER,
    customer_wait_time INTEGER,
    customer_satisfaction_score DECIMAL(3,2),
    returned_flag BOOLEAN DEFAULT false,
    voided_flag BOOLEAN DEFAULT false,
    promotion_applied BOOLEAN DEFAULT false,
    promotion_discount DECIMAL(8,2) DEFAULT 0,
    loyalty_points_earned INTEGER DEFAULT 0,
    loyalty_points_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory fact table (stock levels and movements)
CREATE TABLE fact_inventory (
    inventory_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_key INTEGER NOT NULL REFERENCES dim_time(time_key),
    location_key UUID NOT NULL REFERENCES dim_location(location_key),
    product_key UUID NOT NULL REFERENCES dim_product(product_key),
    staff_key UUID REFERENCES dim_staff(staff_key),
    transaction_date DATE NOT NULL,
    transaction_type inventory_transaction_type NOT NULL,
    reference_number VARCHAR(100),
    batch_number VARCHAR(100),
    supplier_key UUID, -- will reference dim_supplier when created
    -- Measures
    quantity_change DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,4),
    total_cost DECIMAL(15,2),
    stock_before DECIMAL(12,3),
    stock_after DECIMAL(12,3),
    stock_value_before DECIMAL(15,2),
    stock_value_after DECIMAL(15,2),
    days_supply DECIMAL(8,2),
    reorder_point DECIMAL(10,3),
    safety_stock DECIMAL(10,3),
    -- Quality measures
    quality_score DECIMAL(5,2) DEFAULT 100,
    waste_flag BOOLEAN DEFAULT false,
    expiry_flag BOOLEAN DEFAULT false,
    damaged_flag BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Labor fact table (staff hours and performance)
CREATE TABLE fact_labor (
    labor_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_key INTEGER NOT NULL REFERENCES dim_time(time_key),
    location_key UUID NOT NULL REFERENCES dim_location(location_key),
    staff_key UUID NOT NULL REFERENCES dim_staff(staff_key),
    shift_date DATE NOT NULL,
    shift_type shift_type DEFAULT 'regular',
    position VARCHAR(100),
    -- Measures
    scheduled_hours DECIMAL(6,2) NOT NULL,
    actual_hours DECIMAL(6,2),
    break_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    regular_pay DECIMAL(10,2),
    overtime_pay DECIMAL(10,2),
    bonus_pay DECIMAL(8,2) DEFAULT 0,
    total_pay DECIMAL(10,2),
    productivity_score DECIMAL(5,2),
    punctuality_score DECIMAL(5,2),
    performance_rating DECIMAL(3,2),
    customer_service_score DECIMAL(5,2),
    -- Additional measures
    late_arrival_minutes INTEGER DEFAULT 0,
    early_departure_minutes INTEGER DEFAULT 0,
    no_show_flag BOOLEAN DEFAULT false,
    training_hours DECIMAL(4,2) DEFAULT 0,
    cross_training_flag BOOLEAN DEFAULT false,
    supervision_required_flag BOOLEAN DEFAULT false,
    safety_incidents INTEGER DEFAULT 0,
    customer_complaints INTEGER DEFAULT 0,
    sales_generated DECIMAL(12,2) DEFAULT 0,
    orders_processed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operational performance fact table
CREATE TABLE fact_operations (
    operations_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_key INTEGER NOT NULL REFERENCES dim_time(time_key),
    location_key UUID NOT NULL REFERENCES dim_location(location_key),
    operation_date DATE NOT NULL,
    operation_hour INTEGER,
    -- Customer flow measures
    customer_count INTEGER DEFAULT 0,
    walk_in_customers INTEGER DEFAULT 0,
    delivery_orders INTEGER DEFAULT 0,
    takeout_orders INTEGER DEFAULT 0,
    online_orders INTEGER DEFAULT 0,
    average_wait_time DECIMAL(6,2),
    peak_wait_time DECIMAL(6,2),
    table_turnover_rate DECIMAL(5,2),
    -- Operational efficiency measures
    order_accuracy_rate DECIMAL(5,2),
    food_waste_kg DECIMAL(8,3) DEFAULT 0,
    food_waste_cost DECIMAL(10,2) DEFAULT 0,
    energy_consumption_kwh DECIMAL(10,3),
    water_consumption_liters DECIMAL(10,2),
    cleaning_supply_cost DECIMAL(8,2),
    maintenance_cost DECIMAL(10,2),
    -- Quality measures
    health_inspection_score DECIMAL(5,2),
    customer_satisfaction_avg DECIMAL(3,2),
    customer_complaints INTEGER DEFAULT 0,
    food_safety_incidents INTEGER DEFAULT 0,
    equipment_downtime_minutes INTEGER DEFAULT 0,
    pos_system_downtime_minutes INTEGER DEFAULT 0,
    -- Compliance measures
    sop_compliance_score DECIMAL(5,2),
    training_compliance_rate DECIMAL(5,2),
    safety_compliance_score DECIMAL(5,2),
    environmental_compliance_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial performance fact table
CREATE TABLE fact_financial (
    financial_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_key INTEGER NOT NULL REFERENCES dim_time(time_key),
    location_key UUID NOT NULL REFERENCES dim_location(location_key),
    financial_date DATE NOT NULL,
    account_category VARCHAR(100), -- 'revenue', 'cogs', 'labor', 'overhead', 'marketing'
    account_subcategory VARCHAR(100),
    -- Revenue measures
    gross_revenue DECIMAL(15,2) DEFAULT 0,
    net_revenue DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    promotion_cost DECIMAL(10,2) DEFAULT 0,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    -- Cost measures
    food_cost DECIMAL(12,2) DEFAULT 0,
    beverage_cost DECIMAL(10,2) DEFAULT 0,
    packaging_cost DECIMAL(8,2) DEFAULT 0,
    labor_cost DECIMAL(12,2) DEFAULT 0,
    utility_cost DECIMAL(10,2) DEFAULT 0,
    rent_cost DECIMAL(10,2) DEFAULT 0,
    insurance_cost DECIMAL(8,2) DEFAULT 0,
    marketing_cost DECIMAL(10,2) DEFAULT 0,
    maintenance_cost DECIMAL(8,2) DEFAULT 0,
    supplies_cost DECIMAL(8,2) DEFAULT 0,
    other_expenses DECIMAL(10,2) DEFAULT 0,
    -- Profit measures
    gross_profit DECIMAL(15,2) DEFAULT 0,
    operating_profit DECIMAL(15,2) DEFAULT 0,
    net_profit DECIMAL(15,2) DEFAULT 0,
    -- Ratios and percentages
    food_cost_percentage DECIMAL(5,2),
    labor_cost_percentage DECIMAL(5,2),
    profit_margin_percentage DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- AGGREGATED ANALYTICS TABLES
-- ===========================================

-- Pre-aggregated daily summaries for fast querying
CREATE TABLE agg_daily_summary (
    summary_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_key UUID NOT NULL REFERENCES dim_location(location_key),
    summary_date DATE NOT NULL,
    -- Sales aggregates
    total_transactions INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    total_items_sold DECIMAL(12,3) DEFAULT 0,
    gross_sales DECIMAL(15,2) DEFAULT 0,
    net_sales DECIMAL(15,2) DEFAULT 0,
    average_transaction_value DECIMAL(10,2) DEFAULT 0,
    -- Labor aggregates
    total_staff_hours DECIMAL(10,2) DEFAULT 0,
    total_labor_cost DECIMAL(12,2) DEFAULT 0,
    labor_productivity_score DECIMAL(5,2),
    -- Operational aggregates
    customer_satisfaction_avg DECIMAL(3,2),
    order_accuracy_rate DECIMAL(5,2),
    average_wait_time DECIMAL(6,2),
    food_waste_cost DECIMAL(10,2) DEFAULT 0,
    -- Financial aggregates
    total_costs DECIMAL(15,2) DEFAULT 0,
    gross_profit DECIMAL(15,2) DEFAULT 0,
    profit_margin DECIMAL(5,2),
    -- Performance indicators
    sales_vs_target_pct DECIMAL(5,2),
    cost_vs_budget_pct DECIMAL(5,2),
    overall_performance_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(location_key, summary_date)
);

-- Chain-wide KPI dashboard
CREATE TABLE agg_chain_kpis (
    kpi_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id),
    kpi_date DATE NOT NULL,
    time_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    -- Sales KPIs
    total_revenue DECIMAL(18,2) DEFAULT 0,
    same_store_sales_growth DECIMAL(5,2),
    average_transaction_value DECIMAL(10,2) DEFAULT 0,
    transactions_per_location DECIMAL(10,2) DEFAULT 0,
    revenue_per_square_foot DECIMAL(8,2),
    -- Operational KPIs
    customer_satisfaction_score DECIMAL(3,2),
    food_quality_score DECIMAL(3,2),
    service_quality_score DECIMAL(3,2),
    order_accuracy_rate DECIMAL(5,2),
    average_service_time DECIMAL(6,2),
    -- Financial KPIs
    food_cost_percentage DECIMAL(5,2),
    labor_cost_percentage DECIMAL(5,2),
    operating_margin DECIMAL(5,2),
    net_profit_margin DECIMAL(5,2),
    return_on_investment DECIMAL(5,2),
    -- Staff KPIs
    employee_turnover_rate DECIMAL(5,2),
    training_completion_rate DECIMAL(5,2),
    safety_incident_rate DECIMAL(5,2),
    staff_productivity_score DECIMAL(5,2),
    -- Compliance KPIs
    health_inspection_avg_score DECIMAL(5,2),
    sop_compliance_rate DECIMAL(5,2),
    food_safety_compliance DECIMAL(5,2),
    -- Growth KPIs
    new_customer_rate DECIMAL(5,2),
    customer_retention_rate DECIMAL(5,2),
    market_share_percentage DECIMAL(5,2),
    brand_awareness_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, kpi_date, time_period)
);

-- ===========================================
-- DATA QUALITY AND ETL MONITORING
-- ===========================================

-- ETL job tracking
CREATE TABLE etl_job_logs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(255) NOT NULL,
    job_type VARCHAR(100), -- 'extract', 'transform', 'load', 'aggregate', 'cleanup'
    source_system VARCHAR(100),
    target_table VARCHAR(100),
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status etl_status DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_seconds INTEGER,
    data_quality_score DECIMAL(5,2),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data quality metrics
CREATE TABLE data_quality_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_records BIGINT DEFAULT 0,
    valid_records BIGINT DEFAULT 0,
    invalid_records BIGINT DEFAULT 0,
    null_records BIGINT DEFAULT 0,
    duplicate_records BIGINT DEFAULT 0,
    completeness_score DECIMAL(5,2), -- % of required fields populated
    accuracy_score DECIMAL(5,2), -- % of records passing validation
    consistency_score DECIMAL(5,2), -- % of records consistent with business rules
    timeliness_score DECIMAL(5,2), -- % of records processed within SLA
    overall_quality_score DECIMAL(5,2),
    quality_status data_quality_status,
    issues_identified JSONB DEFAULT '[]',
    corrective_actions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- BUSINESS INTELLIGENCE VIEWS
-- ===========================================

-- Sales performance view
CREATE VIEW vw_sales_performance AS
SELECT 
    dl.location_name,
    dl.location_name_th,
    dt.full_date,
    dt.month_name,
    dt.year_number,
    dp.category_name,
    SUM(fs.quantity_sold) as total_quantity,
    SUM(fs.gross_sales_amount) as gross_sales,
    SUM(fs.net_sales_amount) as net_sales,
    SUM(fs.gross_profit) as gross_profit,
    AVG(fs.unit_price) as avg_unit_price,
    COUNT(DISTINCT fs.transaction_id) as transaction_count,
    AVG(fs.customer_satisfaction_score) as avg_satisfaction
FROM fact_sales fs
JOIN dim_time dt ON dt.time_key = fs.time_key
JOIN dim_location dl ON dl.location_key = fs.location_key
JOIN dim_product dp ON dp.product_key = fs.product_key
GROUP BY dl.location_name, dl.location_name_th, dt.full_date, 
         dt.month_name, dt.year_number, dp.category_name;

-- Labor efficiency view
CREATE VIEW vw_labor_efficiency AS
SELECT 
    dl.location_name,
    dl.location_name_th,
    dt.full_date,
    ds.position,
    COUNT(*) as shift_count,
    SUM(fl.scheduled_hours) as total_scheduled_hours,
    SUM(fl.actual_hours) as total_actual_hours,
    SUM(fl.total_pay) as total_labor_cost,
    AVG(fl.productivity_score) as avg_productivity,
    AVG(fl.punctuality_score) as avg_punctuality,
    SUM(fl.sales_generated) / SUM(fl.actual_hours) as sales_per_hour,
    SUM(fl.total_pay) / SUM(fl.actual_hours) as cost_per_hour
FROM fact_labor fl
JOIN dim_time dt ON dt.time_key = fl.time_key
JOIN dim_location dl ON dl.location_key = fl.location_key
JOIN dim_staff ds ON ds.staff_key = fl.staff_key
GROUP BY dl.location_name, dl.location_name_th, dt.full_date, ds.position;

-- Profitability analysis view
CREATE VIEW vw_profitability_analysis AS
SELECT 
    dl.location_name,
    dl.location_name_th,
    dt.month_name,
    dt.year_number,
    SUM(ff.gross_revenue) as total_revenue,
    SUM(ff.food_cost + ff.beverage_cost) as total_cogs,
    SUM(ff.labor_cost) as total_labor,
    SUM(ff.gross_revenue) - SUM(ff.food_cost + ff.beverage_cost + ff.labor_cost + ff.other_expenses) as operating_profit,
    (SUM(ff.food_cost + ff.beverage_cost) / NULLIF(SUM(ff.gross_revenue), 0)) * 100 as food_cost_pct,
    (SUM(ff.labor_cost) / NULLIF(SUM(ff.gross_revenue), 0)) * 100 as labor_cost_pct,
    (SUM(ff.operating_profit) / NULLIF(SUM(ff.gross_revenue), 0)) * 100 as operating_margin_pct
FROM fact_financial ff
JOIN dim_time dt ON dt.time_key = ff.time_key
JOIN dim_location dl ON dl.location_key = ff.location_key
GROUP BY dl.location_name, dl.location_name_th, dt.month_name, dt.year_number;

-- ===========================================
-- ADVANCED INDEXING FOR ANALYTICS
-- ===========================================

-- Fact tables indexes for star schema queries
CREATE INDEX idx_fact_sales_time ON fact_sales(time_key);
CREATE INDEX idx_fact_sales_location ON fact_sales(location_key);
CREATE INDEX idx_fact_sales_product ON fact_sales(product_key);
CREATE INDEX idx_fact_sales_staff ON fact_sales(staff_key);
CREATE INDEX idx_fact_sales_date ON fact_sales(sale_date);
CREATE INDEX idx_fact_sales_order_type ON fact_sales(order_type);

-- Composite indexes for common query patterns
CREATE INDEX idx_fact_sales_location_date ON fact_sales(location_key, sale_date);
CREATE INDEX idx_fact_sales_product_date ON fact_sales(product_key, sale_date);
CREATE INDEX idx_fact_sales_time_location_product ON fact_sales(time_key, location_key, product_key);

-- Labor fact indexes
CREATE INDEX idx_fact_labor_time ON fact_labor(time_key);
CREATE INDEX idx_fact_labor_location ON fact_labor(location_key);
CREATE INDEX idx_fact_labor_staff ON fact_labor(staff_key);
CREATE INDEX idx_fact_labor_date ON fact_labor(shift_date);
CREATE INDEX idx_fact_labor_position ON fact_labor(position);

-- Operational fact indexes
CREATE INDEX idx_fact_operations_time ON fact_operations(time_key);
CREATE INDEX idx_fact_operations_location ON fact_operations(location_key);
CREATE INDEX idx_fact_operations_date ON fact_operations(operation_date);

-- Aggregated table indexes
CREATE INDEX idx_agg_daily_summary_location_date ON agg_daily_summary(location_key, summary_date);
CREATE INDEX idx_agg_chain_kpis_chain_date ON agg_chain_kpis(chain_id, kpi_date);
CREATE INDEX idx_agg_chain_kpis_period ON agg_chain_kpis(time_period, kpi_date);

-- Dimension table indexes
CREATE INDEX idx_dim_time_date ON dim_time(full_date);
CREATE INDEX idx_dim_time_month_year ON dim_time(month_number, year_number);
CREATE INDEX idx_dim_time_quarter_year ON dim_time(quarter_number, year_number);
CREATE INDEX idx_dim_location_chain ON dim_location(chain_id);
CREATE INDEX idx_dim_location_region ON dim_location(region_id);
CREATE INDEX idx_dim_location_type ON dim_location(location_type);
CREATE INDEX idx_dim_product_category ON dim_product(category_name);
CREATE INDEX idx_dim_product_source ON dim_product(product_source);
CREATE INDEX idx_dim_staff_position ON dim_staff(position);
CREATE INDEX idx_dim_staff_department ON dim_staff(department);

-- ===========================================
-- ANALYTICS FUNCTIONS
-- ===========================================

-- Function to calculate same-store sales growth
CREATE OR REPLACE FUNCTION calculate_same_store_sales_growth(
    p_chain_id UUID,
    p_current_period_start DATE,
    p_current_period_end DATE,
    p_comparison_period_start DATE,
    p_comparison_period_end DATE
)
RETURNS TABLE(
    location_key UUID,
    location_name VARCHAR,
    current_sales DECIMAL,
    comparison_sales DECIMAL,
    growth_amount DECIMAL,
    growth_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH current_sales AS (
        SELECT 
            fs.location_key,
            SUM(fs.net_sales_amount) as current_period_sales
        FROM fact_sales fs
        JOIN dim_time dt ON dt.time_key = fs.time_key
        JOIN dim_location dl ON dl.location_key = fs.location_key
        WHERE dl.chain_id = p_chain_id
        AND dt.full_date BETWEEN p_current_period_start AND p_current_period_end
        AND dl.opening_date <= p_comparison_period_start -- Only include stores open in both periods
        GROUP BY fs.location_key
    ),
    comparison_sales AS (
        SELECT 
            fs.location_key,
            SUM(fs.net_sales_amount) as comparison_period_sales
        FROM fact_sales fs
        JOIN dim_time dt ON dt.time_key = fs.time_key
        JOIN dim_location dl ON dl.location_key = fs.location_key
        WHERE dl.chain_id = p_chain_id
        AND dt.full_date BETWEEN p_comparison_period_start AND p_comparison_period_end
        GROUP BY fs.location_key
    )
    SELECT 
        dl.location_key,
        dl.location_name,
        COALESCE(cs.current_period_sales, 0),
        COALESCE(cmp.comparison_period_sales, 0),
        COALESCE(cs.current_period_sales, 0) - COALESCE(cmp.comparison_period_sales, 0),
        CASE 
            WHEN COALESCE(cmp.comparison_period_sales, 0) = 0 THEN NULL
            ELSE ROUND(((COALESCE(cs.current_period_sales, 0) - COALESCE(cmp.comparison_period_sales, 0)) / cmp.comparison_period_sales) * 100, 2)
        END
    FROM dim_location dl
    LEFT JOIN current_sales cs ON cs.location_key = dl.location_key
    LEFT JOIN comparison_sales cmp ON cmp.location_key = dl.location_key
    WHERE dl.chain_id = p_chain_id
    AND dl.location_type = 'restaurant'
    AND dl.is_active = true
    ORDER BY dl.location_name;
END;
$$ LANGUAGE plpgsql;

-- Function to generate executive dashboard metrics
CREATE OR REPLACE FUNCTION generate_executive_dashboard(
    p_chain_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    metric_name VARCHAR,
    metric_value DECIMAL,
    metric_unit VARCHAR,
    trend_percentage DECIMAL,
    status VARCHAR
) AS $$
DECLARE
    yesterday_date DATE := p_date - INTERVAL '1 day';
    last_week_date DATE := p_date - INTERVAL '7 days';
    last_month_date DATE := p_date - INTERVAL '30 days';
BEGIN
    RETURN QUERY
    -- Daily Sales
    SELECT 
        'Daily Sales'::VARCHAR,
        COALESCE(SUM(ads.net_sales), 0),
        'THB'::VARCHAR,
        CASE 
            WHEN yesterday_sales.sales = 0 THEN NULL
            ELSE ROUND(((COALESCE(SUM(ads.net_sales), 0) - yesterday_sales.sales) / yesterday_sales.sales) * 100, 2)
        END,
        CASE 
            WHEN COALESCE(SUM(ads.net_sales), 0) > yesterday_sales.sales THEN 'up'
            WHEN COALESCE(SUM(ads.net_sales), 0) < yesterday_sales.sales THEN 'down'
            ELSE 'stable'
        END::VARCHAR
    FROM agg_daily_summary ads
    JOIN dim_location dl ON dl.location_key = ads.location_key
    CROSS JOIN (
        SELECT COALESCE(SUM(ads2.net_sales), 0) as sales
        FROM agg_daily_summary ads2
        JOIN dim_location dl2 ON dl2.location_key = ads2.location_key
        WHERE dl2.chain_id = p_chain_id
        AND ads2.summary_date = yesterday_date
    ) yesterday_sales
    WHERE dl.chain_id = p_chain_id
    AND ads.summary_date = p_date
    
    UNION ALL
    
    -- Customer Count
    SELECT 
        'Customer Count'::VARCHAR,
        COALESCE(SUM(ads.total_customers), 0),
        'customers'::VARCHAR,
        CASE 
            WHEN yesterday_customers.customers = 0 THEN NULL
            ELSE ROUND(((COALESCE(SUM(ads.total_customers), 0) - yesterday_customers.customers) / yesterday_customers.customers) * 100, 2)
        END,
        CASE 
            WHEN COALESCE(SUM(ads.total_customers), 0) > yesterday_customers.customers THEN 'up'
            WHEN COALESCE(SUM(ads.total_customers), 0) < yesterday_customers.customers THEN 'down'
            ELSE 'stable'
        END::VARCHAR
    FROM agg_daily_summary ads
    JOIN dim_location dl ON dl.location_key = ads.location_key
    CROSS JOIN (
        SELECT COALESCE(SUM(ads2.total_customers), 0) as customers
        FROM agg_daily_summary ads2
        JOIN dim_location dl2 ON dl2.location_key = ads2.location_key
        WHERE dl2.chain_id = p_chain_id
        AND ads2.summary_date = yesterday_date
    ) yesterday_customers
    WHERE dl.chain_id = p_chain_id
    AND ads.summary_date = p_date
    
    UNION ALL
    
    -- Average Transaction Value
    SELECT 
        'Average Transaction Value'::VARCHAR,
        CASE 
            WHEN COALESCE(SUM(ads.total_transactions), 0) = 0 THEN 0
            ELSE ROUND(COALESCE(SUM(ads.net_sales), 0) / SUM(ads.total_transactions), 2)
        END,
        'THB'::VARCHAR,
        NULL, -- Calculate if needed
        'stable'::VARCHAR
    FROM agg_daily_summary ads
    JOIN dim_location dl ON dl.location_key = ads.location_key
    WHERE dl.chain_id = p_chain_id
    AND ads.summary_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to populate time dimension
CREATE OR REPLACE FUNCTION populate_time_dimension(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    current_date DATE := p_start_date;
    record_count INTEGER := 0;
    thai_months TEXT[] := ARRAY['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                                'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    thai_days TEXT[] := ARRAY['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
BEGIN
    WHILE current_date <= p_end_date LOOP
        INSERT INTO dim_time (
            time_key, full_date, date_name, date_name_th,
            day_of_week, day_name, day_name_th, day_of_month, day_of_year,
            weekday_flag, week_of_year, week_start_date, week_end_date,
            month_number, month_name, month_name_th, month_year,
            quarter_number, quarter_name, year_number,
            business_day_flag, season
        ) VALUES (
            EXTRACT(EPOCH FROM current_date)::INTEGER,
            current_date,
            TO_CHAR(current_date, 'DD Mon YYYY'),
            TO_CHAR(current_date, 'DD') || ' ' || thai_months[EXTRACT(MONTH FROM current_date)] || ' ' || (EXTRACT(YEAR FROM current_date) + 543),
            EXTRACT(DOW FROM current_date),
            TO_CHAR(current_date, 'Day'),
            thai_days[EXTRACT(DOW FROM current_date) + 1],
            EXTRACT(DAY FROM current_date),
            EXTRACT(DOY FROM current_date),
            EXTRACT(DOW FROM current_date) BETWEEN 1 AND 5,
            EXTRACT(WEEK FROM current_date),
            current_date - EXTRACT(DOW FROM current_date)::INTEGER,
            current_date - EXTRACT(DOW FROM current_date)::INTEGER + 6,
            EXTRACT(MONTH FROM current_date),
            TO_CHAR(current_date, 'Month'),
            thai_months[EXTRACT(MONTH FROM current_date)],
            TO_CHAR(current_date, 'Mon YYYY'),
            EXTRACT(QUARTER FROM current_date),
            'Q' || EXTRACT(QUARTER FROM current_date),
            EXTRACT(YEAR FROM current_date),
            EXTRACT(DOW FROM current_date) BETWEEN 1 AND 5,
            CASE 
                WHEN EXTRACT(MONTH FROM current_date) IN (12, 1, 2) THEN 'Winter'
                WHEN EXTRACT(MONTH FROM current_date) IN (3, 4, 5) THEN 'Summer'
                WHEN EXTRACT(MONTH FROM current_date) IN (6, 7, 8, 9, 10, 11) THEN 'Rainy'
            END
        )
        ON CONFLICT (time_key) DO NOTHING;
        
        current_date := current_date + INTERVAL '1 day';
        record_count := record_count + 1;
    END LOOP;
    
    RETURN record_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ETL AND DATA WAREHOUSE PROCEDURES
-- ===========================================

-- Procedure to refresh daily aggregations
CREATE OR REPLACE FUNCTION refresh_daily_aggregations(p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS VOID AS $$
BEGIN
    -- Refresh daily summary
    INSERT INTO agg_daily_summary (
        location_key, summary_date, total_transactions, total_customers,
        total_items_sold, gross_sales, net_sales, average_transaction_value,
        total_staff_hours, total_labor_cost, customer_satisfaction_avg,
        order_accuracy_rate, average_wait_time
    )
    SELECT 
        fs.location_key,
        p_date,
        COUNT(DISTINCT fs.transaction_id),
        COUNT(DISTINCT fs.customer_key),
        SUM(fs.quantity_sold),
        SUM(fs.gross_sales_amount),
        SUM(fs.net_sales_amount),
        AVG(fs.gross_sales_amount),
        COALESCE(labor_stats.total_hours, 0),
        COALESCE(labor_stats.total_cost, 0),
        AVG(fs.customer_satisfaction_score),
        AVG(CASE WHEN fs.returned_flag = false THEN 100 ELSE 0 END),
        AVG(fs.customer_wait_time)
    FROM fact_sales fs
    JOIN dim_time dt ON dt.time_key = fs.time_key
    LEFT JOIN (
        SELECT 
            fl.location_key,
            SUM(fl.actual_hours) as total_hours,
            SUM(fl.total_pay) as total_cost
        FROM fact_labor fl
        JOIN dim_time dt2 ON dt2.time_key = fl.time_key
        WHERE dt2.full_date = p_date
        GROUP BY fl.location_key
    ) labor_stats ON labor_stats.location_key = fs.location_key
    WHERE dt.full_date = p_date
    GROUP BY fs.location_key, labor_stats.total_hours, labor_stats.total_cost
    ON CONFLICT (location_key, summary_date) DO UPDATE SET
        total_transactions = EXCLUDED.total_transactions,
        total_customers = EXCLUDED.total_customers,
        total_items_sold = EXCLUDED.total_items_sold,
        gross_sales = EXCLUDED.gross_sales,
        net_sales = EXCLUDED.net_sales,
        average_transaction_value = EXCLUDED.average_transaction_value,
        total_staff_hours = EXCLUDED.total_staff_hours,
        total_labor_cost = EXCLUDED.total_labor_cost,
        customer_satisfaction_avg = EXCLUDED.customer_satisfaction_avg,
        order_accuracy_rate = EXCLUDED.order_accuracy_rate,
        average_wait_time = EXCLUDED.average_wait_time,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- SAMPLE DATA POPULATION
-- ===========================================

-- Populate time dimension for current year and next year
SELECT populate_time_dimension('2025-01-01'::DATE, '2026-12-31'::DATE);

-- Insert sample location dimension data
INSERT INTO dim_location (
    location_key, restaurant_id, chain_id, region_id, location_code,
    location_name, location_name_th, location_type, hierarchy_path
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001', -- location_key
    '550e8400-e29b-41d4-a716-446655440000', -- restaurant_id
    '11111111-1111-1111-1111-111111111111', -- chain_id
    '22222222-2222-2222-2222-222222222222', -- region_id
    'KTC-001',
    'Krong Thai Restaurant',
    'ร้านกรองไทย',
    'restaurant',
    'chain.region.restaurant'::LTREE
);

-- Insert sample product dimension data
INSERT INTO dim_product (
    product_key, product_id, product_source, product_code,
    product_name, product_name_th, category_name, category_name_th
)
SELECT 
    gen_random_uuid(),
    id,
    'menu',
    item_code,
    name,
    name_th,
    'Thai Cuisine',
    'อาหารไทย'
FROM menu_items_master
WHERE chain_id = '11111111-1111-1111-1111-111111111111';

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all new tables
ALTER TABLE dim_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_financial ENABLE ROW LEVEL SECURITY;
ALTER TABLE agg_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE agg_chain_kpis ENABLE ROW LEVEL SECURITY;

-- Analytics data access policy (chain-based)
CREATE POLICY "Analytics data chain access"
ON dim_location FOR ALL
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
    )
);

-- Fact tables access through location dimension
CREATE POLICY "Fact sales access policy"
ON fact_sales FOR ALL
TO authenticated
USING (
    location_key IN (
        SELECT dl.location_key FROM dim_location dl
        JOIN restaurants r ON r.id = dl.restaurant_id
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
-- PERFORMANCE OPTIMIZATIONS
-- ===========================================

-- Analyze all tables for query optimization
ANALYZE dim_time;
ANALYZE dim_location;
ANALYZE dim_product;
ANALYZE dim_staff;
ANALYZE fact_sales;
ANALYZE fact_inventory;
ANALYZE fact_labor;
ANALYZE fact_operations;
ANALYZE fact_financial;
ANALYZE agg_daily_summary;
ANALYZE agg_chain_kpis;

-- Create materialized view for real-time dashboard
CREATE MATERIALIZED VIEW mv_realtime_dashboard AS
SELECT 
    dl.chain_id,
    dl.location_name,
    dl.location_name_th,
    COUNT(DISTINCT fs.transaction_id) as today_transactions,
    SUM(fs.net_sales_amount) as today_sales,
    AVG(fs.customer_satisfaction_score) as avg_satisfaction,
    COUNT(DISTINCT CASE WHEN fl.no_show_flag = false THEN fl.staff_key END) as staff_present,
    AVG(fo.customer_count) as avg_customers_per_hour
FROM fact_sales fs
JOIN dim_time dt ON dt.time_key = fs.time_key
JOIN dim_location dl ON dl.location_key = fs.location_key
LEFT JOIN fact_labor fl ON fl.location_key = fs.location_key AND fl.time_key = fs.time_key
LEFT JOIN fact_operations fo ON fo.location_key = fs.location_key AND fo.time_key = fs.time_key
WHERE dt.full_date = CURRENT_DATE
GROUP BY dl.chain_id, dl.location_name, dl.location_name_th;

-- Create index on materialized view
CREATE INDEX idx_mv_realtime_dashboard_chain ON mv_realtime_dashboard(chain_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_realtime_dashboard;
END;
$$ LANGUAGE plpgsql;

COMMENT ON MIGRATION IS 'Comprehensive chain analytics data warehouse with dimensional modeling, fact tables, KPI aggregations, and business intelligence functions for enterprise restaurant chain operations';