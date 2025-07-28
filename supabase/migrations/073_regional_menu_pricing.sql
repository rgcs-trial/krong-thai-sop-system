-- ================================================
-- REGIONAL MENU AND PRICING MANAGEMENT SYSTEM
-- Migration: 073_regional_menu_pricing.sql
-- Created: 2025-07-28
-- Purpose: Comprehensive menu and pricing management for multi-location restaurant chains
-- ================================================

-- Enable required extensions for menu management
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- ===========================================
-- MENU MANAGEMENT ENUMS AND TYPES
-- ===========================================

-- Menu item status enum
CREATE TYPE menu_item_status AS ENUM ('active', 'inactive', 'seasonal', 'testing', 'discontinued');

-- Price adjustment type enum
CREATE TYPE price_adjustment_type AS ENUM ('fixed_amount', 'percentage', 'base_multiplier', 'custom_formula');

-- Menu category type enum
CREATE TYPE menu_category_type AS ENUM ('appetizer', 'main_course', 'dessert', 'beverage', 'side_dish', 'combo', 'special');

-- Dietary classification enum
CREATE TYPE dietary_classification AS ENUM (
    'none', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'spicy', 'halal', 'organic'
);

-- Price approval status enum
CREATE TYPE price_approval_status AS ENUM ('pending', 'approved', 'rejected', 'auto_approved');

-- Menu item availability enum
CREATE TYPE availability_status AS ENUM ('available', 'out_of_stock', 'limited', 'pre_order_only');

-- ===========================================
-- MENU STRUCTURE TABLES
-- ===========================================

-- Menu categories (hierarchical structure)
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    parent_category_id UUID REFERENCES menu_categories(id),
    category_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    description TEXT,
    description_th TEXT,
    category_type menu_category_type NOT NULL,
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(100),
    color_code VARCHAR(7),
    is_featured BOOLEAN DEFAULT false,
    age_restriction INTEGER, -- Minimum age (for alcohol, etc.)
    dietary_tags dietary_classification[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, category_code)
);

-- Master menu items (chain-wide templates)
CREATE TABLE menu_items_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    description TEXT,
    description_th TEXT,
    long_description TEXT,
    long_description_th TEXT,
    recipe_instructions JSONB DEFAULT '{}',
    recipe_instructions_th JSONB DEFAULT '{}',
    ingredients JSONB DEFAULT '[]',
    ingredients_th JSONB DEFAULT '[]',
    allergen_info JSONB DEFAULT '{}',
    allergen_info_th JSONB DEFAULT '{}',
    nutritional_info JSONB DEFAULT '{}',
    portion_size VARCHAR(100),
    portion_size_th VARCHAR(100),
    preparation_time_minutes INTEGER,
    dietary_classifications dietary_classification[] DEFAULT '{}',
    spice_level INTEGER DEFAULT 0, -- 0-5 scale
    base_cost DECIMAL(10,4),
    suggested_price DECIMAL(10,2),
    profit_margin_target DECIMAL(5,2),
    image_urls JSONB DEFAULT '[]',
    tags VARCHAR(100)[] DEFAULT '{}',
    tags_th VARCHAR(100)[] DEFAULT '{}',
    seasonal_availability JSONB DEFAULT '{}', -- months when available
    custom_attributes JSONB DEFAULT '{}',
    is_signature_dish BOOLEAN DEFAULT false,
    status menu_item_status DEFAULT 'active',
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, item_code)
);

-- Location-specific menu items (inherit from master or custom)
CREATE TABLE menu_items_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    master_item_id UUID REFERENCES menu_items_master(id),
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    local_name VARCHAR(255),
    local_name_th VARCHAR(255),
    local_description TEXT,
    local_description_th TEXT,
    local_recipe_modifications JSONB DEFAULT '{}',
    local_ingredients_substitutions JSONB DEFAULT '{}',
    local_preparation_notes TEXT,
    local_preparation_notes_th TEXT,
    availability_status availability_status DEFAULT 'available',
    availability_schedule JSONB DEFAULT '{}', -- hours/days when available
    max_daily_quantity INTEGER,
    current_stock_level INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    auto_disable_when_out BOOLEAN DEFAULT true,
    local_tags VARCHAR(100)[] DEFAULT '{}',
    local_customizations JSONB DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_chef_special BOOLEAN DEFAULT false,
    promotion_eligible BOOLEAN DEFAULT true,
    last_sold_at TIMESTAMPTZ,
    times_ordered_today INTEGER DEFAULT 0,
    times_ordered_total INTEGER DEFAULT 0,
    customer_rating DECIMAL(3,2) DEFAULT 0.00,
    customer_review_count INTEGER DEFAULT 0,
    status menu_item_status DEFAULT 'active',
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, item_code, effective_from)
);

-- ===========================================
-- PRICING MANAGEMENT TABLES
-- ===========================================

-- Regional pricing rules
CREATE TABLE regional_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    region_id UUID REFERENCES chain_regions(id),
    rule_name VARCHAR(255) NOT NULL,
    rule_name_th VARCHAR(255),
    description TEXT,
    description_th TEXT,
    price_adjustment_type price_adjustment_type NOT NULL,
    adjustment_value DECIMAL(10,4) NOT NULL,
    adjustment_formula TEXT, -- For custom formulas
    category_filters UUID[] DEFAULT '{}', -- menu_categories ids
    item_filters UUID[] DEFAULT '{}', -- menu_items_master ids
    dietary_filters dietary_classification[] DEFAULT '{}',
    minimum_base_price DECIMAL(10,2),
    maximum_base_price DECIMAL(10,2),
    minimum_final_price DECIMAL(10,2),
    maximum_final_price DECIMAL(10,2),
    rounding_strategy VARCHAR(50) DEFAULT 'nearest_5', -- nearest_1, nearest_5, nearest_10
    applies_to_promotions BOOLEAN DEFAULT false,
    priority_order INTEGER DEFAULT 1000,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth_users(id),
    approved_by UUID REFERENCES auth_users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location-specific pricing
CREATE TABLE menu_item_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL, -- Can reference either master or location item
    item_source VARCHAR(20) DEFAULT 'master', -- 'master' or 'location'
    base_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,4),
    profit_margin DECIMAL(5,2),
    tax_rate DECIMAL(5,4) DEFAULT 0.07, -- 7% VAT in Thailand
    tax_inclusive BOOLEAN DEFAULT true,
    regional_adjustments JSONB DEFAULT '{}',
    promotional_price DECIMAL(10,2),
    promotional_start TIMESTAMPTZ,
    promotional_end TIMESTAMPTZ,
    happy_hour_price DECIMAL(10,2),
    happy_hour_schedule JSONB DEFAULT '{}',
    bulk_pricing JSONB DEFAULT '{}', -- quantity-based pricing
    combo_pricing JSONB DEFAULT '{}', -- when part of combo meals
    price_history JSONB DEFAULT '[]',
    competitor_pricing JSONB DEFAULT '{}',
    price_elasticity_score DECIMAL(5,2),
    optimal_price_suggestion DECIMAL(10,2),
    last_price_change TIMESTAMPTZ,
    price_change_reason TEXT,
    approval_status price_approval_status DEFAULT 'pending',
    approved_by UUID REFERENCES auth_users(id),
    approved_at TIMESTAMPTZ,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, menu_item_id, item_source, effective_from)
);

-- Pricing approval workflow
CREATE TABLE pricing_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    pricing_id UUID NOT NULL REFERENCES menu_item_pricing(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES auth_users(id),
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    price_change_pct DECIMAL(5,2),
    justification TEXT NOT NULL,
    justification_th TEXT,
    supporting_data JSONB DEFAULT '{}',
    urgency_level INTEGER DEFAULT 1, -- 1-5 scale
    business_impact_assessment TEXT,
    competitive_analysis JSONB DEFAULT '{}',
    expected_volume_impact DECIMAL(5,2),
    expected_revenue_impact DECIMAL(12,2),
    approval_deadline TIMESTAMPTZ,
    status price_approval_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth_users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    review_notes_th TEXT,
    auto_approval_rule_id UUID,
    escalated_to UUID REFERENCES auth_users(id),
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- MENU CUSTOMIZATION AND MODIFIERS
-- ===========================================

-- Menu item modifiers (add-ons, variations)
CREATE TABLE menu_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    modifier_group_name VARCHAR(255) NOT NULL,
    modifier_group_name_th VARCHAR(255) NOT NULL,
    modifier_name VARCHAR(255) NOT NULL,
    modifier_name_th VARCHAR(255) NOT NULL,
    description TEXT,
    description_th TEXT,
    modifier_type VARCHAR(50) NOT NULL, -- 'addon', 'substitution', 'size', 'style'
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    cost_adjustment DECIMAL(10,4) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    max_quantity INTEGER DEFAULT 1,
    dietary_impact dietary_classification[] DEFAULT '{}',
    availability_schedule JSONB DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu item modifier associations
CREATE TABLE menu_item_modifier_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL, -- Can be master or location item
    item_source VARCHAR(20) DEFAULT 'master',
    modifier_id UUID NOT NULL REFERENCES menu_item_modifiers(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT true,
    location_price_override DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(menu_item_id, item_source, modifier_id)
);

-- ===========================================
-- MENU ANALYTICS AND PERFORMANCE
-- ===========================================

-- Menu item performance tracking
CREATE TABLE menu_item_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL,
    item_source VARCHAR(20) DEFAULT 'master',
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity_sold INTEGER DEFAULT 0,
    gross_revenue DECIMAL(12,2) DEFAULT 0.00,
    net_revenue DECIMAL(12,2) DEFAULT 0.00,
    total_cost DECIMAL(12,2) DEFAULT 0.00,
    gross_profit DECIMAL(12,2) DEFAULT 0.00,
    profit_margin DECIMAL(5,2) DEFAULT 0.00,
    average_order_value DECIMAL(10,2) DEFAULT 0.00,
    customer_rating_avg DECIMAL(3,2) DEFAULT 0.00,
    customer_rating_count INTEGER DEFAULT 0,
    return_rate DECIMAL(5,2) DEFAULT 0.00,
    complaint_count INTEGER DEFAULT 0,
    waste_quantity INTEGER DEFAULT 0,
    waste_cost DECIMAL(10,2) DEFAULT 0.00,
    preparation_time_avg INTEGER, -- minutes
    peak_hour_sales JSONB DEFAULT '{}',
    seasonal_performance JSONB DEFAULT '{}',
    competitor_comparison JSONB DEFAULT '{}',
    menu_engineering_category VARCHAR(20), -- 'star', 'plow_horse', 'puzzle', 'dog'
    recommendation_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, menu_item_id, item_source, date_recorded)
);

-- Menu optimization suggestions
CREATE TABLE menu_optimization_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL,
    item_source VARCHAR(20) DEFAULT 'master',
    suggestion_type VARCHAR(100) NOT NULL, -- 'price_increase', 'price_decrease', 'discontinue', 'promote', 'reposition'
    current_value DECIMAL(15,4),
    suggested_value DECIMAL(15,4),
    confidence_score DECIMAL(5,2) NOT NULL,
    expected_impact JSONB NOT NULL,
    supporting_data JSONB DEFAULT '{}',
    reasoning TEXT NOT NULL,
    reasoning_th TEXT,
    implementation_difficulty INTEGER DEFAULT 1, -- 1-5 scale
    priority_score DECIMAL(5,2) NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth_users(id),
    reviewed_at TIMESTAMPTZ,
    implementation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'implemented'
    implementation_date TIMESTAMPTZ,
    actual_impact JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ADVANCED INDEXING
-- ===========================================

-- Menu categories indexes
CREATE INDEX idx_menu_categories_chain_id ON menu_categories(chain_id);
CREATE INDEX idx_menu_categories_parent ON menu_categories(parent_category_id);
CREATE INDEX idx_menu_categories_type ON menu_categories(category_type);
CREATE INDEX idx_menu_categories_active ON menu_categories(is_active);
CREATE INDEX idx_menu_categories_display_order ON menu_categories(display_order);

-- Master menu items indexes
CREATE INDEX idx_menu_items_master_chain_id ON menu_items_master(chain_id);
CREATE INDEX idx_menu_items_master_category ON menu_items_master(category_id);
CREATE INDEX idx_menu_items_master_status ON menu_items_master(status);
CREATE INDEX idx_menu_items_master_dietary ON menu_items_master USING GIN(dietary_classifications);
CREATE INDEX idx_menu_items_master_tags ON menu_items_master USING GIN(tags);
CREATE INDEX idx_menu_items_master_search ON menu_items_master USING GIN(to_tsvector('english', name || ' ' || description));

-- Location menu items indexes
CREATE INDEX idx_menu_items_location_restaurant ON menu_items_location(restaurant_id);
CREATE INDEX idx_menu_items_location_master ON menu_items_location(master_item_id);
CREATE INDEX idx_menu_items_location_category ON menu_items_location(category_id);
CREATE INDEX idx_menu_items_location_status ON menu_items_location(status);
CREATE INDEX idx_menu_items_location_availability ON menu_items_location(availability_status);
CREATE INDEX idx_menu_items_location_effective ON menu_items_location(effective_from, effective_to);

-- Pricing indexes
CREATE INDEX idx_menu_item_pricing_restaurant ON menu_item_pricing(restaurant_id);
CREATE INDEX idx_menu_item_pricing_item ON menu_item_pricing(menu_item_id, item_source);
CREATE INDEX idx_menu_item_pricing_effective ON menu_item_pricing(effective_from, effective_to);
CREATE INDEX idx_menu_item_pricing_promotional ON menu_item_pricing(promotional_start, promotional_end) WHERE promotional_price IS NOT NULL;

-- Regional pricing rules indexes
CREATE INDEX idx_regional_pricing_rules_chain ON regional_pricing_rules(chain_id);
CREATE INDEX idx_regional_pricing_rules_region ON regional_pricing_rules(region_id);
CREATE INDEX idx_regional_pricing_rules_effective ON regional_pricing_rules(effective_from, effective_to);
CREATE INDEX idx_regional_pricing_rules_priority ON regional_pricing_rules(priority_order);

-- Performance tracking indexes
CREATE INDEX idx_menu_item_performance_restaurant_date ON menu_item_performance(restaurant_id, date_recorded);
CREATE INDEX idx_menu_item_performance_item ON menu_item_performance(menu_item_id, item_source);
CREATE INDEX idx_menu_item_performance_revenue ON menu_item_performance(gross_revenue DESC);

-- ===========================================
-- MENU MANAGEMENT FUNCTIONS
-- ===========================================

-- Function to calculate final price with regional adjustments
CREATE OR REPLACE FUNCTION calculate_final_price(
    p_restaurant_id UUID,
    p_base_price DECIMAL,
    p_menu_item_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    final_price DECIMAL(10,2) := p_base_price;
    pricing_rule RECORD;
    region_id_val UUID;
    chain_id_val UUID;
    adjustment_amount DECIMAL(10,2);
BEGIN
    -- Get restaurant's region and chain
    SELECT r.region_id, r.chain_id INTO region_id_val, chain_id_val
    FROM restaurants r
    WHERE r.id = p_restaurant_id;
    
    -- Apply regional pricing rules in priority order
    FOR pricing_rule IN 
        SELECT * FROM regional_pricing_rules rpr
        WHERE rpr.chain_id = chain_id_val
        AND (rpr.region_id IS NULL OR rpr.region_id = region_id_val)
        AND (rpr.category_filters = '{}' OR p_category_id = ANY(rpr.category_filters))
        AND (rpr.item_filters = '{}' OR p_menu_item_id = ANY(rpr.item_filters))
        AND (rpr.minimum_base_price IS NULL OR p_base_price >= rpr.minimum_base_price)
        AND (rpr.maximum_base_price IS NULL OR p_base_price <= rpr.maximum_base_price)
        AND rpr.effective_from <= NOW()
        AND (rpr.effective_to IS NULL OR rpr.effective_to > NOW())
        AND rpr.is_active = true
        ORDER BY rpr.priority_order ASC
    LOOP
        -- Apply price adjustment based on type
        CASE pricing_rule.price_adjustment_type
            WHEN 'fixed_amount' THEN
                adjustment_amount := pricing_rule.adjustment_value;
            WHEN 'percentage' THEN
                adjustment_amount := final_price * (pricing_rule.adjustment_value / 100);
            WHEN 'base_multiplier' THEN
                adjustment_amount := (final_price * pricing_rule.adjustment_value) - final_price;
            WHEN 'custom_formula' THEN
                -- Simplified formula evaluation (would need more complex logic in production)
                adjustment_amount := pricing_rule.adjustment_value;
        END CASE;
        
        final_price := final_price + adjustment_amount;
        
        -- Apply min/max constraints
        IF pricing_rule.minimum_final_price IS NOT NULL THEN
            final_price := GREATEST(final_price, pricing_rule.minimum_final_price);
        END IF;
        
        IF pricing_rule.maximum_final_price IS NOT NULL THEN
            final_price := LEAST(final_price, pricing_rule.maximum_final_price);
        END IF;
    END LOOP;
    
    -- Apply rounding strategy (simplified)
    final_price := ROUND(final_price * 20) / 20; -- Round to nearest 0.05 (5 satang)
    
    RETURN final_price;
END;
$$ LANGUAGE plpgsql;

-- Function to get menu item with location-specific customizations
CREATE OR REPLACE FUNCTION get_location_menu_item(
    p_restaurant_id UUID,
    p_item_code VARCHAR,
    p_language VARCHAR DEFAULT 'en'
)
RETURNS TABLE(
    item_id UUID,
    item_code VARCHAR,
    name VARCHAR,
    description TEXT,
    category_name VARCHAR,
    base_price DECIMAL,
    selling_price DECIMAL,
    availability_status availability_status,
    dietary_classifications dietary_classification[],
    preparation_time INTEGER,
    is_featured BOOLEAN
) AS $$
DECLARE
    location_item RECORD;
    master_item RECORD;
BEGIN
    -- First try to find location-specific item
    SELECT mil.*, mc.name as cat_name, mic.name_th as cat_name_th
    INTO location_item
    FROM menu_items_location mil
    JOIN menu_categories mc ON mc.id = mil.category_id
    WHERE mil.restaurant_id = p_restaurant_id
    AND mil.item_code = p_item_code
    AND mil.status = 'active'
    AND (mil.effective_to IS NULL OR mil.effective_to > NOW())
    ORDER BY mil.effective_from DESC
    LIMIT 1;
    
    IF location_item.id IS NOT NULL THEN
        -- Return location-specific item
        RETURN QUERY
        SELECT 
            location_item.id,
            location_item.item_code,
            CASE WHEN p_language = 'th' THEN 
                COALESCE(location_item.local_name_th, location_item.local_name)
            ELSE 
                COALESCE(location_item.local_name, location_item.local_name_th)
            END,
            CASE WHEN p_language = 'th' THEN 
                COALESCE(location_item.local_description_th, location_item.local_description)
            ELSE 
                COALESCE(location_item.local_description, location_item.local_description_th)
            END,
            CASE WHEN p_language = 'th' THEN location_item.cat_name_th ELSE location_item.cat_name END,
            NULL::DECIMAL, -- Will be calculated separately
            NULL::DECIMAL, -- Will be calculated separately
            location_item.availability_status,
            '{}', -- Will be filled from master item
            NULL::INTEGER, -- Will be filled from master item
            location_item.is_featured;
    ELSE
        -- Try to find master item and create virtual location item
        SELECT mim.*, mc.name as cat_name, mc.name_th as cat_name_th
        INTO master_item
        FROM menu_items_master mim
        JOIN menu_categories mc ON mc.id = mim.category_id
        JOIN restaurants r ON r.chain_id = mim.chain_id
        WHERE r.id = p_restaurant_id
        AND mim.item_code = p_item_code
        AND mim.status = 'active';
        
        IF master_item.id IS NOT NULL THEN
            RETURN QUERY
            SELECT 
                master_item.id,
                master_item.item_code,
                CASE WHEN p_language = 'th' THEN master_item.name_th ELSE master_item.name END,
                CASE WHEN p_language = 'th' THEN master_item.description_th ELSE master_item.description END,
                CASE WHEN p_language = 'th' THEN master_item.cat_name_th ELSE master_item.cat_name END,
                master_item.base_cost,
                master_item.suggested_price,
                'available'::availability_status,
                master_item.dietary_classifications,
                master_item.preparation_time_minutes,
                master_item.is_signature_dish;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze menu performance and generate suggestions
CREATE OR REPLACE FUNCTION analyze_menu_performance(
    p_restaurant_id UUID,
    p_analysis_period_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    item_code VARCHAR,
    item_name VARCHAR,
    category VARCHAR,
    total_quantity INTEGER,
    total_revenue DECIMAL,
    profit_margin DECIMAL,
    menu_engineering_category VARCHAR,
    suggestion_type VARCHAR,
    suggestion_reasoning TEXT
) AS $$
DECLARE
    avg_quantity DECIMAL;
    avg_profit_margin DECIMAL;
    item_record RECORD;
BEGIN
    -- Calculate overall averages
    SELECT 
        AVG(mip.quantity_sold),
        AVG(mip.profit_margin)
    INTO avg_quantity, avg_profit_margin
    FROM menu_item_performance mip
    WHERE mip.restaurant_id = p_restaurant_id
    AND mip.date_recorded >= CURRENT_DATE - (p_analysis_period_days || ' days')::INTERVAL;
    
    -- Analyze each menu item
    FOR item_record IN
        SELECT 
            mil.item_code,
            COALESCE(mil.local_name, mim.name) as name,
            mc.name as category,
            SUM(mip.quantity_sold) as total_qty,
            SUM(mip.gross_revenue) as total_rev,
            AVG(mip.profit_margin) as avg_margin
        FROM menu_items_location mil
        LEFT JOIN menu_items_master mim ON mim.id = mil.master_item_id
        JOIN menu_categories mc ON mc.id = mil.category_id
        LEFT JOIN menu_item_performance mip ON mip.menu_item_id = mil.id 
            AND mip.item_source = 'location'
            AND mip.date_recorded >= CURRENT_DATE - (p_analysis_period_days || ' days')::INTERVAL
        WHERE mil.restaurant_id = p_restaurant_id
        AND mil.status = 'active'
        GROUP BY mil.id, mil.item_code, mil.local_name, mim.name, mc.name
    LOOP
        -- Menu engineering categorization
        DECLARE
            me_category VARCHAR := 'dog'; -- Default
            suggestion VARCHAR := 'monitor';
            reasoning TEXT := 'Standard performance item';
        BEGIN
            -- High quantity, high margin = Star
            IF item_record.total_qty > avg_quantity AND item_record.avg_margin > avg_profit_margin THEN
                me_category := 'star';
                suggestion := 'promote';
                reasoning := 'Top performer - promote heavily and maintain quality';
            -- High quantity, low margin = Plow Horse
            ELSIF item_record.total_qty > avg_quantity AND item_record.avg_margin <= avg_profit_margin THEN
                me_category := 'plow_horse';
                suggestion := 'price_increase';
                reasoning := 'Popular but low margin - consider price increase or cost reduction';
            -- Low quantity, high margin = Puzzle
            ELSIF item_record.total_qty <= avg_quantity AND item_record.avg_margin > avg_profit_margin THEN
                me_category := 'puzzle';
                suggestion := 'reposition';
                reasoning := 'High margin but low sales - improve marketing or reposition on menu';
            -- Low quantity, low margin = Dog
            ELSE
                me_category := 'dog';
                suggestion := 'discontinue';
                reasoning := 'Poor performer - consider discontinuing or major changes';
            END IF;
            
            RETURN QUERY SELECT 
                item_record.item_code,
                item_record.name,
                item_record.category,
                COALESCE(item_record.total_qty, 0),
                COALESCE(item_record.total_rev, 0),
                COALESCE(item_record.avg_margin, 0),
                me_category,
                suggestion,
                reasoning;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to synchronize master menu changes to locations
CREATE OR REPLACE FUNCTION sync_master_menu_to_locations(
    p_master_item_id UUID,
    p_target_restaurant_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    master_item RECORD;
    restaurant_id UUID;
    locations_updated INTEGER := 0;
BEGIN
    -- Get master item details
    SELECT * INTO master_item
    FROM menu_items_master
    WHERE id = p_master_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Master menu item not found: %', p_master_item_id;
    END IF;
    
    -- Get target restaurants
    FOR restaurant_id IN
        SELECT r.id
        FROM restaurants r
        WHERE r.chain_id = master_item.chain_id
        AND (p_target_restaurant_ids IS NULL OR r.id = ANY(p_target_restaurant_ids))
        AND r.sync_enabled = true
    LOOP
        -- Update or insert location-specific item
        INSERT INTO menu_items_location (
            restaurant_id, master_item_id, category_id, item_code,
            local_name, local_name_th, local_description, local_description_th,
            status, effective_from
        ) VALUES (
            restaurant_id, p_master_item_id, master_item.category_id, 
            master_item.item_code, master_item.name, master_item.name_th,
            master_item.description, master_item.description_th,
            master_item.status, NOW()
        )
        ON CONFLICT (restaurant_id, item_code, effective_from) DO UPDATE SET
            category_id = EXCLUDED.category_id,
            local_name = EXCLUDED.local_name,
            local_name_th = EXCLUDED.local_name_th,
            local_description = EXCLUDED.local_description,
            local_description_th = EXCLUDED.local_description_th,
            status = EXCLUDED.status,
            updated_at = NOW();
        
        locations_updated := locations_updated + 1;
    END LOOP;
    
    RETURN locations_updated;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS FOR MENU SYNCHRONIZATION
-- ===========================================

-- Trigger to sync master menu changes
CREATE OR REPLACE FUNCTION trigger_master_menu_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if it's an update to active items
    IF TG_OP = 'UPDATE' AND NEW.status = 'active' THEN
        PERFORM sync_master_menu_to_locations(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_menu_items_master_sync
    AFTER UPDATE ON menu_items_master
    FOR EACH ROW EXECUTE FUNCTION trigger_master_menu_sync();

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all new tables
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifier_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_optimization_suggestions ENABLE ROW LEVEL SECURITY;

-- Menu categories - chain-wide access
CREATE POLICY "Menu categories chain access"
ON menu_categories FOR ALL
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
    )
);

-- Master menu items - chain-wide access
CREATE POLICY "Master menu items chain access"
ON menu_items_master FOR ALL
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
    )
);

-- Location menu items - restaurant-specific access
CREATE POLICY "Location menu items restaurant access"
ON menu_items_location FOR ALL
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

-- Menu item pricing - restaurant access
CREATE POLICY "Menu item pricing restaurant access"
ON menu_item_pricing FOR ALL
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

-- ===========================================
-- SAMPLE MENU DATA
-- ===========================================

-- Insert sample menu categories
INSERT INTO menu_categories (chain_id, category_code, name, name_th, category_type, display_order) VALUES
('11111111-1111-1111-1111-111111111111', 'APPETIZERS', 'Appetizers', 'อาหารเรียกน้ำย่อย', 'appetizer', 1),
('11111111-1111-1111-1111-111111111111', 'SOUPS', 'Thai Soups', 'ซุปไทย', 'appetizer', 2),
('11111111-1111-1111-1111-111111111111', 'CURRY', 'Thai Curries', 'แกงไทย', 'main_course', 3),
('11111111-1111-1111-1111-111111111111', 'STIR_FRY', 'Stir-Fried Dishes', 'อาหารผัด', 'main_course', 4),
('11111111-1111-1111-1111-111111111111', 'NOODLES', 'Noodle Dishes', 'อาหารจานเส้น', 'main_course', 5),
('11111111-1111-1111-1111-111111111111', 'DESSERTS', 'Thai Desserts', 'ของหวานไทย', 'dessert', 6),
('11111111-1111-1111-1111-111111111111', 'BEVERAGES', 'Beverages', 'เครื่องดื่ม', 'beverage', 7);

-- Insert sample master menu items
INSERT INTO menu_items_master (
    chain_id, category_id, item_code, name, name_th, description, description_th,
    base_cost, suggested_price, preparation_time_minutes, dietary_classifications, spice_level
) VALUES
('11111111-1111-1111-1111-111111111111', 
 (SELECT id FROM menu_categories WHERE category_code = 'CURRY'), 
 'CURRY_001', 'Green Curry with Chicken', 'แกงเขียวหวานไก่',
 'Traditional Thai green curry with chicken, bamboo shoots, and basil', 'แกงเขียวหวานไทยดั้งเดิมใส่ไก่ หน่อไผ่ และใบโหระพา',
 85.00, 180.00, 15, '{"spicy"}', 3),

('11111111-1111-1111-1111-111111111111',
 (SELECT id FROM menu_categories WHERE category_code = 'STIR_FRY'),
 'STIR_001', 'Pad Thai', 'ผัดไทย',
 'Classic stir-fried rice noodles with shrimp, tofu, and peanuts', 'ก๋วยเตี๋ยวผัดไทยคลาสสิกใส่กุ้ง เต้าหู้ และถั่วลิสง',
 65.00, 150.00, 10, '{}', 1),

('11111111-1111-1111-1111-111111111111',
 (SELECT id FROM menu_categories WHERE category_code = 'SOUPS'),
 'SOUP_001', 'Tom Yum Goong', 'ต้มยำกุ้ง',
 'Spicy and sour soup with prawns, mushrooms, and herbs', 'ซุปรสเปรียวเผ็ดใส่กุ้ง เห็ด และสมุนไพร',
 95.00, 200.00, 12, '{"spicy"}', 4);

-- Insert sample regional pricing rules
INSERT INTO regional_pricing_rules (
    chain_id, region_id, rule_name, rule_name_th, 
    price_adjustment_type, adjustment_value, description, description_th
) VALUES
('11111111-1111-1111-1111-111111111111', 
 '22222222-2222-2222-2222-222222222222',
 'Bangkok Premium Location', 'ที่ตั้งพรีเมียมกรุงเทพ',
 'percentage', 15.00, 
 'Premium pricing for Bangkok metropolitan locations', 'ราคาพรีเมียมสำหรับสถานที่ในเขตกรุงเทพมหานคร');

-- Insert sample location menu items
INSERT INTO menu_items_location (
    restaurant_id, master_item_id, category_id, item_code, status
)
SELECT 
    '550e8400-e29b-41d4-a716-446655440000',
    mim.id,
    mim.category_id,
    mim.item_code,
    'active'
FROM menu_items_master mim
WHERE mim.chain_id = '11111111-1111-1111-1111-111111111111';

-- Insert sample pricing
INSERT INTO menu_item_pricing (
    restaurant_id, menu_item_id, item_source, base_price, selling_price, cost_price
)
SELECT 
    mil.restaurant_id,
    mil.id,
    'location',
    mim.suggested_price,
    calculate_final_price(mil.restaurant_id, mim.suggested_price, mim.id, mim.category_id),
    mim.base_cost
FROM menu_items_location mil
JOIN menu_items_master mim ON mim.id = mil.master_item_id
WHERE mil.restaurant_id = '550e8400-e29b-41d4-a716-446655440000';

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_menu_categories_updated_at 
    BEFORE UPDATE ON menu_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_master_updated_at 
    BEFORE UPDATE ON menu_items_master 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_location_updated_at 
    BEFORE UPDATE ON menu_items_location 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regional_pricing_rules_updated_at 
    BEFORE UPDATE ON regional_pricing_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_item_pricing_updated_at 
    BEFORE UPDATE ON menu_item_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_approvals_updated_at 
    BEFORE UPDATE ON pricing_approvals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- PERFORMANCE OPTIMIZATIONS
-- ===========================================

-- Analyze new tables for query optimization
ANALYZE menu_categories;
ANALYZE menu_items_master;
ANALYZE menu_items_location;
ANALYZE regional_pricing_rules;
ANALYZE menu_item_pricing;
ANALYZE menu_item_performance;

-- Set statistics targets for better performance
ALTER TABLE menu_items_master ALTER COLUMN ingredients SET STATISTICS 1000;
ALTER TABLE menu_items_master ALTER COLUMN recipe_instructions SET STATISTICS 1000;
ALTER TABLE menu_items_location ALTER COLUMN local_customizations SET STATISTICS 500;

COMMENT ON MIGRATION IS 'Regional menu and pricing management system with location-specific customization, automated pricing rules, and performance analytics for multi-restaurant chains';