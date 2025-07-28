-- ================================================
-- CROSS-LOCATION INVENTORY TRACKING SYSTEM
-- Migration: 074_cross_location_inventory.sql
-- Created: 2025-07-28
-- Purpose: Real-time inventory management and optimization across multiple restaurant locations
-- ================================================

-- Enable required extensions for inventory management
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ===========================================
-- INVENTORY ENUMS AND TYPES
-- ===========================================

-- Inventory item status enum
CREATE TYPE inventory_status AS ENUM ('active', 'inactive', 'discontinued', 'recalled', 'expired');

-- Inventory category enum
CREATE TYPE inventory_category AS ENUM (
    'raw_ingredients', 'processed_food', 'beverages', 'condiments', 'packaging', 
    'cleaning_supplies', 'equipment', 'utensils', 'disposables', 'other'
);

-- Unit of measure enum
CREATE TYPE unit_measure AS ENUM (
    'kg', 'g', 'lbs', 'oz', 'l', 'ml', 'gal', 'pieces', 'boxes', 'cases', 'bags', 'bottles'
);

-- Storage requirement enum
CREATE TYPE storage_requirement AS ENUM (
    'ambient', 'refrigerated', 'frozen', 'dry_storage', 'climate_controlled', 'hazmat'
);

-- Inventory transaction type enum
CREATE TYPE inventory_transaction_type AS ENUM (
    'purchase', 'sale', 'waste', 'transfer_out', 'transfer_in', 'adjustment', 
    'production_use', 'sampling', 'promotion', 'return', 'theft', 'spoilage'
);

-- Supplier status enum
CREATE TYPE supplier_status AS ENUM ('active', 'inactive', 'suspended', 'preferred', 'backup');

-- Transfer status enum
CREATE TYPE transfer_status AS ENUM ('pending', 'approved', 'in_transit', 'delivered', 'cancelled', 'rejected');

-- Inventory alert type enum
CREATE TYPE inventory_alert_type AS ENUM (
    'low_stock', 'overstock', 'expiring_soon', 'expired', 'negative_stock', 
    'unusual_consumption', 'supplier_issue', 'quality_concern'
);

-- ===========================================
-- INVENTORY MASTER DATA
-- ===========================================

-- Master inventory items (chain-wide)
CREATE TABLE inventory_items_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    barcode VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    description TEXT,
    description_th TEXT,
    category inventory_category NOT NULL,
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    manufacturer VARCHAR(255),
    primary_unit unit_measure NOT NULL,
    secondary_unit unit_measure,
    conversion_factor DECIMAL(10,4) DEFAULT 1.0, -- primary to secondary unit
    storage_requirement storage_requirement NOT NULL,
    temperature_min DECIMAL(5,2), -- Celsius
    temperature_max DECIMAL(5,2), -- Celsius
    humidity_requirements JSONB DEFAULT '{}',
    shelf_life_days INTEGER,
    safety_stock_days INTEGER DEFAULT 7,
    reorder_point_days INTEGER DEFAULT 14,
    economic_order_quantity DECIMAL(10,3),
    abc_classification CHAR(1) DEFAULT 'B', -- A, B, C analysis
    seasonal_factor JSONB DEFAULT '{}', -- monthly adjustment factors
    nutritional_info JSONB DEFAULT '{}',
    allergen_info JSONB DEFAULT '{}',
    regulatory_info JSONB DEFAULT '{}',
    tags VARCHAR(100)[] DEFAULT '{}',
    is_perishable BOOLEAN DEFAULT true,
    is_controlled_substance BOOLEAN DEFAULT false,
    is_halal_certified BOOLEAN DEFAULT false,
    is_organic BOOLEAN DEFAULT false,
    status inventory_status DEFAULT 'active',
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, item_code)
);

-- Inventory suppliers
CREATE TABLE inventory_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    supplier_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    address_th TEXT,
    tax_id VARCHAR(50),
    payment_terms_days INTEGER DEFAULT 30,
    credit_limit DECIMAL(15,2),
    delivery_lead_time_days INTEGER DEFAULT 2,
    minimum_order_amount DECIMAL(12,2),
    delivery_schedule JSONB DEFAULT '{}', -- days of week, times
    quality_rating DECIMAL(3,2) DEFAULT 5.00, -- 1-5 scale
    reliability_score DECIMAL(3,2) DEFAULT 5.00, -- 1-5 scale
    price_competitiveness DECIMAL(3,2) DEFAULT 5.00, -- 1-5 scale
    certifications JSONB DEFAULT '[]',
    preferred_payment_method VARCHAR(50),
    contract_start_date DATE,
    contract_end_date DATE,
    status supplier_status DEFAULT 'active',
    notes TEXT,
    notes_th TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, supplier_code)
);

-- Supplier item catalog with pricing
CREATE TABLE supplier_item_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items_master(id) ON DELETE CASCADE,
    supplier_item_code VARCHAR(100),
    supplier_item_name VARCHAR(255),
    pack_size DECIMAL(10,3) NOT NULL,
    pack_unit unit_measure NOT NULL,
    unit_price DECIMAL(12,4) NOT NULL,
    bulk_pricing JSONB DEFAULT '{}', -- quantity breaks and pricing
    lead_time_days INTEGER DEFAULT 2,
    minimum_order_quantity DECIMAL(10,3) DEFAULT 1,
    maximum_order_quantity DECIMAL(10,3),
    is_preferred BOOLEAN DEFAULT false,
    quality_grade VARCHAR(10),
    last_price_update TIMESTAMPTZ DEFAULT NOW(),
    price_history JSONB DEFAULT '[]',
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(supplier_id, inventory_item_id, effective_from)
);

-- ===========================================
-- LOCATION-SPECIFIC INVENTORY
-- ===========================================

-- Location inventory levels and settings
CREATE TABLE inventory_location_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items_master(id) ON DELETE CASCADE,
    current_stock DECIMAL(12,3) DEFAULT 0,
    reserved_stock DECIMAL(12,3) DEFAULT 0, -- reserved for orders/production
    available_stock DECIMAL(12,3) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    minimum_stock DECIMAL(10,3) NOT NULL,
    maximum_stock DECIMAL(10,3) NOT NULL,
    reorder_point DECIMAL(10,3) NOT NULL,
    economic_order_qty DECIMAL(10,3),
    safety_stock DECIMAL(10,3) NOT NULL,
    average_daily_usage DECIMAL(10,3) DEFAULT 0,
    usage_variance DECIMAL(10,3) DEFAULT 0,
    last_usage_calculation TIMESTAMPTZ DEFAULT NOW(),
    storage_location VARCHAR(100),
    storage_zone VARCHAR(50),
    shelf_position VARCHAR(50),
    cost_per_unit DECIMAL(12,4),
    average_cost DECIMAL(12,4), -- weighted average cost
    fifo_cost_layers JSONB DEFAULT '[]', -- for FIFO costing
    last_received_date TIMESTAMPTZ,
    last_used_date TIMESTAMPTZ,
    last_count_date TIMESTAMPTZ,
    cycle_count_frequency_days INTEGER DEFAULT 30,
    next_cycle_count_date DATE,
    variance_threshold_pct DECIMAL(5,2) DEFAULT 5.0, -- alert threshold
    auto_reorder_enabled BOOLEAN DEFAULT true,
    preferred_supplier_id UUID REFERENCES inventory_suppliers(id),
    status inventory_status DEFAULT 'active',
    notes TEXT,
    notes_th TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, inventory_item_id)
);

-- Inventory transactions log
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items_master(id) ON DELETE CASCADE,
    transaction_type inventory_transaction_type NOT NULL,
    reference_number VARCHAR(100), -- PO number, transfer number, etc.
    quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,4),
    total_cost DECIMAL(15,2),
    supplier_id UUID REFERENCES inventory_suppliers(id),
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    expiry_date DATE,
    received_date TIMESTAMPTZ,
    quality_check_passed BOOLEAN DEFAULT true,
    quality_notes TEXT,
    source_restaurant_id UUID REFERENCES restaurants(id), -- for transfers
    target_restaurant_id UUID REFERENCES restaurants(id), -- for transfers
    related_transaction_id UUID REFERENCES inventory_transactions(id),
    stock_before DECIMAL(12,3),
    stock_after DECIMAL(12,3),
    reason_code VARCHAR(50),
    reason_description TEXT,
    reason_description_th TEXT,
    created_by UUID NOT NULL REFERENCES auth_users(id),
    approved_by UUID REFERENCES auth_users(id),
    approved_at TIMESTAMPTZ,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-location inventory transfers
CREATE TABLE inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(100) NOT NULL UNIQUE,
    source_restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    target_restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    requested_by UUID NOT NULL REFERENCES auth_users(id),
    approved_by UUID REFERENCES auth_users(id),
    shipped_by UUID REFERENCES auth_users(id),
    received_by UUID REFERENCES auth_users(id),
    transfer_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'emergency', 'redistribution'
    priority_level INTEGER DEFAULT 1, -- 1-5 scale
    requested_date TIMESTAMPTZ DEFAULT NOW(),
    approved_date TIMESTAMPTZ,
    shipped_date TIMESTAMPTZ,
    expected_delivery_date TIMESTAMPTZ,
    delivered_date TIMESTAMPTZ,
    status transfer_status DEFAULT 'pending',
    total_items INTEGER DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    insurance_cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    notes_th TEXT,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    shipping_method VARCHAR(100),
    temperature_controlled BOOLEAN DEFAULT false,
    special_handling_requirements TEXT,
    quality_check_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfer line items
CREATE TABLE inventory_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items_master(id) ON DELETE CASCADE,
    requested_quantity DECIMAL(12,3) NOT NULL,
    approved_quantity DECIMAL(12,3),
    shipped_quantity DECIMAL(12,3),
    received_quantity DECIMAL(12,3),
    damaged_quantity DECIMAL(12,3) DEFAULT 0,
    unit_cost DECIMAL(12,4),
    total_cost DECIMAL(15,2),
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    expiry_date DATE,
    quality_check_passed BOOLEAN DEFAULT true,
    quality_notes TEXT,
    reason_for_transfer TEXT,
    reason_for_transfer_th TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INVENTORY ANALYTICS AND OPTIMIZATION
-- ===========================================

-- Inventory consumption patterns
CREATE TABLE inventory_consumption_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items_master(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_usage_avg DECIMAL(12,3),
    daily_usage_stddev DECIMAL(12,3),
    weekly_usage_avg DECIMAL(12,3),
    monthly_usage_avg DECIMAL(12,3),
    seasonal_adjustment_factor DECIMAL(5,3) DEFAULT 1.0,
    trend_coefficient DECIMAL(10,6), -- positive = increasing, negative = decreasing
    day_of_week_factors JSONB DEFAULT '{}', -- Monday=1.2, Tuesday=0.8, etc.
    menu_correlation JSONB DEFAULT '{}', -- correlation with menu item sales
    waste_percentage DECIMAL(5,2) DEFAULT 0,
    stockout_frequency INTEGER DEFAULT 0, -- times out of stock this period
    overstock_frequency INTEGER DEFAULT 0, -- times overstocked this period
    optimal_reorder_point DECIMAL(10,3),
    optimal_order_quantity DECIMAL(10,3),
    lead_time_variability DECIMAL(5,2),
    service_level_target DECIMAL(5,2) DEFAULT 95.0, -- desired in-stock percentage
    actual_service_level DECIMAL(5,2),
    cost_of_stockout DECIMAL(12,2) DEFAULT 0,
    cost_of_overstock DECIMAL(12,2) DEFAULT 0,
    inventory_turnover_ratio DECIMAL(8,3),
    days_of_supply DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, inventory_item_id, analysis_date)
);

-- Chain-wide inventory optimization suggestions
CREATE TABLE inventory_optimization_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items_master(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(100) NOT NULL, -- 'redistribute', 'bulk_purchase', 'eliminate_waste', 'adjust_par_levels'
    priority_score DECIMAL(5,2) NOT NULL,
    source_restaurants UUID[] DEFAULT '{}',
    target_restaurants UUID[] DEFAULT '{}',
    current_situation JSONB NOT NULL,
    suggested_action JSONB NOT NULL,
    expected_benefits JSONB NOT NULL,
    implementation_cost DECIMAL(12,2),
    potential_savings DECIMAL(12,2),
    roi_percentage DECIMAL(5,2),
    confidence_level DECIMAL(5,2) NOT NULL,
    reasoning TEXT NOT NULL,
    reasoning_th TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth_users(id),
    reviewed_at TIMESTAMPTZ,
    implementation_status VARCHAR(50) DEFAULT 'pending',
    implementation_date TIMESTAMPTZ,
    actual_results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory alerts and notifications
CREATE TABLE inventory_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items_master(id) ON DELETE CASCADE,
    alert_type inventory_alert_type NOT NULL,
    severity INTEGER NOT NULL DEFAULT 1, -- 1-5 scale
    current_stock DECIMAL(12,3),
    threshold_value DECIMAL(12,3),
    message TEXT NOT NULL,
    message_th TEXT,
    suggested_action TEXT,
    suggested_action_th TEXT,
    auto_generated BOOLEAN DEFAULT true,
    acknowledged_by UUID REFERENCES auth_users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth_users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    escalated BOOLEAN DEFAULT false,
    escalated_to UUID REFERENCES auth_users(id),
    escalated_at TIMESTAMPTZ,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ADVANCED INDEXING
-- ===========================================

-- Master inventory items indexes
CREATE INDEX idx_inventory_items_master_chain_id ON inventory_items_master(chain_id);
CREATE INDEX idx_inventory_items_master_category ON inventory_items_master(category);
CREATE INDEX idx_inventory_items_master_status ON inventory_items_master(status);
CREATE INDEX idx_inventory_items_master_barcode ON inventory_items_master(barcode);
CREATE INDEX idx_inventory_items_master_perishable ON inventory_items_master(is_perishable);
CREATE INDEX idx_inventory_items_master_tags ON inventory_items_master USING GIN(tags);

-- Location inventory indexes
CREATE INDEX idx_inventory_location_items_restaurant ON inventory_location_items(restaurant_id);
CREATE INDEX idx_inventory_location_items_item ON inventory_location_items(inventory_item_id);
CREATE INDEX idx_inventory_location_items_low_stock ON inventory_location_items(restaurant_id) 
    WHERE available_stock <= reorder_point;
CREATE INDEX idx_inventory_location_items_negative ON inventory_location_items(restaurant_id) 
    WHERE current_stock < 0;

-- Transactions indexes
CREATE INDEX idx_inventory_transactions_restaurant_date ON inventory_transactions(restaurant_id, transaction_date);
CREATE INDEX idx_inventory_transactions_item_date ON inventory_transactions(inventory_item_id, transaction_date);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_number);
CREATE INDEX idx_inventory_transactions_batch ON inventory_transactions(batch_number) WHERE batch_number IS NOT NULL;

-- Transfers indexes
CREATE INDEX idx_inventory_transfers_source ON inventory_transfers(source_restaurant_id);
CREATE INDEX idx_inventory_transfers_target ON inventory_transfers(target_restaurant_id);
CREATE INDEX idx_inventory_transfers_status ON inventory_transfers(status);
CREATE INDEX idx_inventory_transfers_date ON inventory_transfers(requested_date);
CREATE INDEX idx_inventory_transfers_number ON inventory_transfers(transfer_number);

-- Analytics indexes
CREATE INDEX idx_inventory_consumption_restaurant_date ON inventory_consumption_analytics(restaurant_id, analysis_date);
CREATE INDEX idx_inventory_consumption_item_date ON inventory_consumption_analytics(inventory_item_id, analysis_date);
CREATE INDEX idx_inventory_consumption_turnover ON inventory_consumption_analytics(inventory_turnover_ratio);

-- Alerts indexes
CREATE INDEX idx_inventory_alerts_restaurant ON inventory_alerts(restaurant_id);
CREATE INDEX idx_inventory_alerts_type_severity ON inventory_alerts(alert_type, severity);
CREATE INDEX idx_inventory_alerts_unresolved ON inventory_alerts(triggered_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_inventory_alerts_item ON inventory_alerts(inventory_item_id);

-- ===========================================
-- INVENTORY MANAGEMENT FUNCTIONS
-- ===========================================

-- Function to calculate optimal reorder point
CREATE OR REPLACE FUNCTION calculate_optimal_reorder_point(
    p_restaurant_id UUID,
    p_inventory_item_id UUID,
    p_service_level_target DECIMAL DEFAULT 95.0
)
RETURNS DECIMAL(10,3) AS $$
DECLARE
    avg_daily_usage DECIMAL(10,3);
    usage_stddev DECIMAL(10,3);
    lead_time_days INTEGER;
    safety_factor DECIMAL(5,3);
    optimal_reorder_point DECIMAL(10,3);
BEGIN
    -- Get consumption analytics
    SELECT 
        COALESCE(ica.daily_usage_avg, 0),
        COALESCE(ica.daily_usage_stddev, 0)
    INTO avg_daily_usage, usage_stddev
    FROM inventory_consumption_analytics ica
    WHERE ica.restaurant_id = p_restaurant_id
    AND ica.inventory_item_id = p_inventory_item_id
    ORDER BY ica.analysis_date DESC
    LIMIT 1;
    
    -- Get lead time from preferred supplier
    SELECT COALESCE(sic.lead_time_days, 2) INTO lead_time_days
    FROM inventory_location_items ili
    LEFT JOIN supplier_item_catalog sic ON sic.supplier_id = ili.preferred_supplier_id 
        AND sic.inventory_item_id = ili.inventory_item_id
    WHERE ili.restaurant_id = p_restaurant_id
    AND ili.inventory_item_id = p_inventory_item_id;
    
    -- Calculate safety factor based on service level (using normal distribution approximation)
    safety_factor := CASE 
        WHEN p_service_level_target >= 99.0 THEN 2.33
        WHEN p_service_level_target >= 95.0 THEN 1.65
        WHEN p_service_level_target >= 90.0 THEN 1.28
        WHEN p_service_level_target >= 85.0 THEN 1.04
        ELSE 0.84
    END;
    
    -- Calculate optimal reorder point
    optimal_reorder_point := (avg_daily_usage * lead_time_days) + 
                            (safety_factor * usage_stddev * SQRT(lead_time_days));
    
    RETURN GREATEST(optimal_reorder_point, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory levels
CREATE OR REPLACE FUNCTION update_inventory_level(
    p_restaurant_id UUID,
    p_inventory_item_id UUID,
    p_quantity_change DECIMAL(12,3),
    p_transaction_type inventory_transaction_type,
    p_unit_cost DECIMAL(12,4) DEFAULT NULL,
    p_reference_number VARCHAR(100) DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    current_stock_before DECIMAL(12,3);
    current_stock_after DECIMAL(12,3);
    transaction_id UUID;
    total_cost DECIMAL(15,2);
BEGIN
    -- Get current stock level
    SELECT current_stock INTO current_stock_before
    FROM inventory_location_items
    WHERE restaurant_id = p_restaurant_id
    AND inventory_item_id = p_inventory_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item not found for restaurant';
    END IF;
    
    -- Calculate new stock level
    current_stock_after := current_stock_before + p_quantity_change;
    
    -- Calculate total cost
    total_cost := COALESCE(p_unit_cost * ABS(p_quantity_change), 0);
    
    -- Update inventory level
    UPDATE inventory_location_items
    SET current_stock = current_stock_after,
        last_used_date = CASE WHEN p_quantity_change < 0 THEN NOW() ELSE last_used_date END,
        last_received_date = CASE WHEN p_quantity_change > 0 THEN NOW() ELSE last_received_date END,
        updated_at = NOW()
    WHERE restaurant_id = p_restaurant_id
    AND inventory_item_id = p_inventory_item_id;
    
    -- Create transaction record
    INSERT INTO inventory_transactions (
        restaurant_id, inventory_item_id, transaction_type, reference_number,
        quantity, unit_cost, total_cost, stock_before, stock_after,
        created_by, transaction_date
    ) VALUES (
        p_restaurant_id, p_inventory_item_id, p_transaction_type, p_reference_number,
        p_quantity_change, p_unit_cost, total_cost, current_stock_before, current_stock_after,
        p_user_id, NOW()
    ) RETURNING id INTO transaction_id;
    
    -- Check for alerts
    PERFORM check_inventory_alerts(p_restaurant_id, p_inventory_item_id);
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check and create inventory alerts
CREATE OR REPLACE FUNCTION check_inventory_alerts(
    p_restaurant_id UUID,
    p_inventory_item_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    item_info RECORD;
    alert_count INTEGER := 0;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Get inventory item information
    SELECT 
        ili.current_stock,
        ili.available_stock,
        ili.minimum_stock,
        ili.maximum_stock,
        ili.reorder_point,
        iim.name,
        iim.name_th,
        iim.is_perishable
    INTO item_info
    FROM inventory_location_items ili
    JOIN inventory_items_master iim ON iim.id = ili.inventory_item_id
    WHERE ili.restaurant_id = p_restaurant_id
    AND ili.inventory_item_id = p_inventory_item_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Check for low stock alert
    IF item_info.available_stock <= item_info.reorder_point THEN
        INSERT INTO inventory_alerts (
            restaurant_id, inventory_item_id, alert_type, severity,
            current_stock, threshold_value, message, message_th,
            suggested_action, suggested_action_th
        ) VALUES (
            p_restaurant_id, p_inventory_item_id, 'low_stock', 
            CASE WHEN item_info.available_stock <= item_info.minimum_stock THEN 4 ELSE 2 END,
            item_info.current_stock, item_info.reorder_point,
            format('Low stock alert for %s: %s units remaining (reorder point: %s)', 
                item_info.name, item_info.available_stock, item_info.reorder_point),
            format('แจ้งเตือนสินค้าใกล้หมด %s: เหลือ %s หน่วย (จุดสั่งซื้อใหม่: %s)', 
                item_info.name_th, item_info.available_stock, item_info.reorder_point),
            'Place purchase order immediately',
            'สั่งซื้อสินค้าทันที'
        );
        alert_count := alert_count + 1;
    END IF;
    
    -- Check for negative stock alert
    IF item_info.current_stock < 0 THEN
        INSERT INTO inventory_alerts (
            restaurant_id, inventory_item_id, alert_type, severity,
            current_stock, threshold_value, message, message_th,
            suggested_action, suggested_action_th
        ) VALUES (
            p_restaurant_id, p_inventory_item_id, 'negative_stock', 5,
            item_info.current_stock, 0,
            format('Negative stock for %s: %s units', item_info.name, item_info.current_stock),
            format('สต็อกติดลบ %s: %s หน่วย', item_info.name_th, item_info.current_stock),
            'Investigate and correct inventory count immediately',
            'ตรวจสอบและแก้ไขจำนวนสินค้าทันที'
        );
        alert_count := alert_count + 1;
    END IF;
    
    -- Check for overstock alert
    IF item_info.current_stock > item_info.maximum_stock THEN
        INSERT INTO inventory_alerts (
            restaurant_id, inventory_item_id, alert_type, severity,
            current_stock, threshold_value, message, message_th,
            suggested_action, suggested_action_th
        ) VALUES (
            p_restaurant_id, p_inventory_item_id, 'overstock', 2,
            item_info.current_stock, item_info.maximum_stock,
            format('Overstock alert for %s: %s units (max: %s)', 
                item_info.name, item_info.current_stock, item_info.maximum_stock),
            format('แจ้งเตือนสินค้าเกินจำนวน %s: %s หน่วย (สูงสุด: %s)', 
                item_info.name_th, item_info.current_stock, item_info.maximum_stock),
            'Consider transferring excess to other locations',
            'พิจารณาโอนสินค้าเกินไปยังสาขาอื่น'
        );
        alert_count := alert_count + 1;
    END IF;
    
    -- Check for expiring items (for perishables)
    IF item_info.is_perishable THEN
        -- This would need integration with batch/lot tracking for specific expiry dates
        -- For now, we'll create a placeholder alert based on general shelf life
        DECLARE
            days_until_expiry INTEGER;
        BEGIN
            SELECT MIN(EXTRACT(days FROM (expiry_date - current_date)))::INTEGER 
            INTO days_until_expiry
            FROM inventory_transactions it
            WHERE it.restaurant_id = p_restaurant_id
            AND it.inventory_item_id = p_inventory_item_id
            AND it.expiry_date IS NOT NULL
            AND it.expiry_date > current_date
            AND it.stock_after > 0;
            
            IF days_until_expiry IS NOT NULL AND days_until_expiry <= 3 THEN
                INSERT INTO inventory_alerts (
                    restaurant_id, inventory_item_id, alert_type, severity,
                    current_stock, threshold_value, message, message_th,
                    suggested_action, suggested_action_th
                ) VALUES (
                    p_restaurant_id, p_inventory_item_id, 'expiring_soon', 3,
                    item_info.current_stock, days_until_expiry,
                    format('%s expires in %s days', item_info.name, days_until_expiry),
                    format('%s จะหมดอายุใน %s วัน', item_info.name_th, days_until_expiry),
                    'Use immediately or transfer to other location',
                    'ใช้ทันทีหรือโอนไปสาขาอื่น'
                );
                alert_count := alert_count + 1;
            END IF;
        END;
    END IF;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- Function to suggest inventory transfers between locations
CREATE OR REPLACE FUNCTION suggest_inventory_transfers(
    p_chain_id UUID,
    p_max_suggestions INTEGER DEFAULT 10
)
RETURNS TABLE(
    source_restaurant_id UUID,
    target_restaurant_id UUID,
    inventory_item_id UUID,
    item_name VARCHAR,
    surplus_quantity DECIMAL,
    deficit_quantity DECIMAL,
    suggested_transfer_qty DECIMAL,
    priority_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH inventory_status AS (
        SELECT 
            ili.restaurant_id,
            ili.inventory_item_id,
            iim.name,
            ili.available_stock,
            ili.minimum_stock,
            ili.maximum_stock,
            ili.reorder_point,
            ili.average_daily_usage,
            r.chain_id,
            CASE 
                WHEN ili.available_stock < ili.minimum_stock THEN 'deficit'
                WHEN ili.available_stock > ili.maximum_stock THEN 'surplus'
                ELSE 'normal'
            END as stock_status,
            CASE 
                WHEN ili.available_stock < ili.minimum_stock THEN ili.minimum_stock - ili.available_stock
                ELSE 0
            END as deficit_qty,
            CASE 
                WHEN ili.available_stock > ili.maximum_stock THEN ili.available_stock - ili.maximum_stock
                ELSE 0
            END as surplus_qty
        FROM inventory_location_items ili
        JOIN inventory_items_master iim ON iim.id = ili.inventory_item_id
        JOIN restaurants r ON r.id = ili.restaurant_id
        WHERE r.chain_id = p_chain_id
        AND ili.status = 'active'
    ),
    transfer_opportunities AS (
        SELECT 
            surplus.restaurant_id as source_id,
            deficit.restaurant_id as target_id,
            surplus.inventory_item_id,
            surplus.name,
            surplus.surplus_qty,
            deficit.deficit_qty,
            LEAST(surplus.surplus_qty, deficit.deficit_qty) as transfer_qty,
            -- Priority scoring based on urgency and efficiency
            (deficit.deficit_qty / NULLIF(deficit.minimum_stock, 0) * 50) + -- urgency score
            (surplus.surplus_qty / NULLIF(surplus.maximum_stock, 0) * 30) + -- excess score
            (LEAST(surplus.surplus_qty, deficit.deficit_qty) / GREATEST(surplus.surplus_qty, deficit.deficit_qty) * 20) as priority
        FROM inventory_status surplus
        JOIN inventory_status deficit ON deficit.inventory_item_id = surplus.inventory_item_id
        WHERE surplus.stock_status = 'surplus'
        AND deficit.stock_status = 'deficit'
        AND surplus.restaurant_id != deficit.restaurant_id
        AND surplus.surplus_qty > 0
        AND deficit.deficit_qty > 0
    )
    SELECT 
        to.source_id,
        to.target_id,
        to.inventory_item_id,
        to.name,
        to.surplus_qty,
        to.deficit_qty,
        to.transfer_qty,
        to.priority
    FROM transfer_opportunities to
    ORDER BY to.priority DESC
    LIMIT p_max_suggestions;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS FOR INVENTORY MANAGEMENT
-- ===========================================

-- Trigger to automatically update consumption analytics
CREATE OR REPLACE FUNCTION trigger_update_consumption_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage statistics when inventory is consumed
    IF NEW.transaction_type IN ('sale', 'production_use', 'waste') AND NEW.quantity < 0 THEN
        -- Update daily average usage (simplified moving average)
        UPDATE inventory_location_items
        SET average_daily_usage = (
            COALESCE(average_daily_usage, 0) * 0.9 + ABS(NEW.quantity) * 0.1
        ),
        last_usage_calculation = NOW()
        WHERE restaurant_id = NEW.restaurant_id
        AND inventory_item_id = NEW.inventory_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventory_transactions_analytics
    AFTER INSERT ON inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_consumption_analytics();

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all new tables
ALTER TABLE inventory_items_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_item_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_location_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_consumption_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_optimization_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Inventory master items - chain access
CREATE POLICY "Inventory master items chain access"
ON inventory_items_master FOR ALL
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
    )
);

-- Location inventory - restaurant access
CREATE POLICY "Location inventory restaurant access"
ON inventory_location_items FOR ALL
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

-- Inventory transactions - restaurant access
CREATE POLICY "Inventory transactions restaurant access"
ON inventory_transactions FOR ALL
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

-- Inventory transfers - source/target restaurant access
CREATE POLICY "Inventory transfers access"
ON inventory_transfers FOR ALL
TO authenticated
USING (
    source_restaurant_id IN (
        SELECT r.id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
        OR (u.role IN ('admin', 'manager') AND r.chain_id IN (
            SELECT r2.chain_id FROM restaurants r2
            JOIN auth_users u2 ON u2.restaurant_id = r2.id
            WHERE u2.id = auth.uid()
        ))
    )
    OR target_restaurant_id IN (
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
-- SAMPLE INVENTORY DATA
-- ===========================================

-- Insert sample inventory items
INSERT INTO inventory_items_master (
    chain_id, item_code, name, name_th, category, primary_unit, 
    storage_requirement, shelf_life_days, safety_stock_days, reorder_point_days
) VALUES
('11111111-1111-1111-1111-111111111111', 'RICE_001', 'Thai Jasmine Rice', 'ข้าวหอมมะลิไทย', 'raw_ingredients', 'kg', 'dry_storage', 365, 7, 14),
('11111111-1111-1111-1111-111111111111', 'CHICKEN_001', 'Fresh Chicken Breast', 'เนื้อไก่สดส่วนอก', 'raw_ingredients', 'kg', 'refrigerated', 3, 1, 2),
('11111111-1111-1111-1111-111111111111', 'COCONUT_001', 'Coconut Milk', 'กะทิ', 'raw_ingredients', 'l', 'ambient', 730, 5, 10),
('11111111-1111-1111-1111-111111111111', 'CURRY_001', 'Green Curry Paste', 'น้ำพริกแกงเขียวหวาน', 'condiments', 'kg', 'refrigerated', 90, 3, 7),
('11111111-1111-1111-1111-111111111111', 'NOODLES_001', 'Rice Noodles', 'ก๋วยเตี๋ยวเส้นใหญ่', 'processed_food', 'kg', 'dry_storage', 180, 5, 10);

-- Insert sample supplier
INSERT INTO inventory_suppliers (
    chain_id, supplier_code, name, name_th, contact_person, phone, email
) VALUES
('11111111-1111-1111-1111-111111111111', 'SUP_001', 'Bangkok Food Supplies Co., Ltd.', 'บริษัท กรุงเทพอาหารซัพพลาย จำกัด', 'Somchai Supplier', '+66-2-555-0001', 'orders@bkk-food.com');

-- Insert sample supplier catalog
INSERT INTO supplier_item_catalog (
    supplier_id, inventory_item_id, pack_size, pack_unit, unit_price
)
SELECT 
    s.id,
    iim.id,
    CASE iim.item_code
        WHEN 'RICE_001' THEN 25.0
        WHEN 'CHICKEN_001' THEN 5.0
        WHEN 'COCONUT_001' THEN 12.0
        WHEN 'CURRY_001' THEN 2.0
        WHEN 'NOODLES_001' THEN 10.0
    END,
    iim.primary_unit,
    CASE iim.item_code
        WHEN 'RICE_001' THEN 32.50
        WHEN 'CHICKEN_001' THEN 185.00
        WHEN 'COCONUT_001' THEN 28.00
        WHEN 'CURRY_001' THEN 95.00
        WHEN 'NOODLES_001' THEN 42.00
    END
FROM inventory_suppliers s
CROSS JOIN inventory_items_master iim
WHERE s.supplier_code = 'SUP_001'
AND iim.chain_id = '11111111-1111-1111-1111-111111111111';

-- Insert sample location inventory
INSERT INTO inventory_location_items (
    restaurant_id, inventory_item_id, current_stock, minimum_stock, 
    maximum_stock, reorder_point, safety_stock, preferred_supplier_id
)
SELECT 
    '550e8400-e29b-41d4-a716-446655440000',
    iim.id,
    CASE iim.item_code
        WHEN 'RICE_001' THEN 150.00
        WHEN 'CHICKEN_001' THEN 25.00
        WHEN 'COCONUT_001' THEN 48.00
        WHEN 'CURRY_001' THEN 8.00
        WHEN 'NOODLES_001' THEN 60.00
    END,
    CASE iim.item_code
        WHEN 'RICE_001' THEN 50.00
        WHEN 'CHICKEN_001' THEN 10.00
        WHEN 'COCONUT_001' THEN 12.00
        WHEN 'CURRY_001' THEN 2.00
        WHEN 'NOODLES_001' THEN 20.00
    END,
    CASE iim.item_code
        WHEN 'RICE_001' THEN 200.00
        WHEN 'CHICKEN_001' THEN 50.00
        WHEN 'COCONUT_001' THEN 60.00
        WHEN 'CURRY_001' THEN 15.00
        WHEN 'NOODLES_001' THEN 80.00
    END,
    CASE iim.item_code
        WHEN 'RICE_001' THEN 75.00
        WHEN 'CHICKEN_001' THEN 15.00
        WHEN 'COCONUT_001' THEN 18.00
        WHEN 'CURRY_001' THEN 3.00
        WHEN 'NOODLES_001' THEN 30.00
    END,
    CASE iim.item_code
        WHEN 'RICE_001' THEN 25.00
        WHEN 'CHICKEN_001' THEN 5.00
        WHEN 'COCONUT_001' THEN 6.00
        WHEN 'CURRY_001' THEN 1.00
        WHEN 'NOODLES_001' THEN 10.00
    END,
    (SELECT id FROM inventory_suppliers WHERE supplier_code = 'SUP_001')
FROM inventory_items_master iim
WHERE iim.chain_id = '11111111-1111-1111-1111-111111111111';

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_inventory_items_master_updated_at 
    BEFORE UPDATE ON inventory_items_master 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_suppliers_updated_at 
    BEFORE UPDATE ON inventory_suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_item_catalog_updated_at 
    BEFORE UPDATE ON supplier_item_catalog 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_location_items_updated_at 
    BEFORE UPDATE ON inventory_location_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_transfers_updated_at 
    BEFORE UPDATE ON inventory_transfers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- PERFORMANCE OPTIMIZATIONS
-- ===========================================

-- Analyze new tables for query optimization
ANALYZE inventory_items_master;
ANALYZE inventory_suppliers;
ANALYZE supplier_item_catalog;
ANALYZE inventory_location_items;
ANALYZE inventory_transactions;
ANALYZE inventory_transfers;
ANALYZE inventory_alerts;

-- Set statistics targets for better performance
ALTER TABLE inventory_items_master ALTER COLUMN tags SET STATISTICS 1000;
ALTER TABLE inventory_transactions ALTER COLUMN batch_number SET STATISTICS 500;
ALTER TABLE inventory_location_items ALTER COLUMN storage_location SET STATISTICS 500;

COMMENT ON MIGRATION IS 'Cross-location inventory tracking system with real-time synchronization, optimization suggestions, and comprehensive analytics for multi-restaurant chains';