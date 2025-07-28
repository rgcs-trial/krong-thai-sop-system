-- ================================================
-- MULTI-RESTAURANT DATA SYNCHRONIZATION SYSTEM
-- Migration: 071_multi_restaurant_data_sync.sql
-- Created: 2025-07-28
-- Purpose: Comprehensive chain-wide data synchronization with conflict resolution
-- ================================================

-- Enable required extensions for advanced synchronization
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ===========================================
-- ENUMS AND TYPES
-- ===========================================

-- Synchronization status enum
CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'conflict');

-- Conflict resolution strategy enum
CREATE TYPE conflict_resolution AS ENUM ('last_write_wins', 'manual_review', 'priority_based', 'merge_strategy');

-- Data operation type enum
CREATE TYPE sync_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'SCHEMA_CHANGE');

-- Chain hierarchy level enum
CREATE TYPE chain_level AS ENUM ('corporate', 'regional', 'location', 'department');

-- ===========================================
-- CHAIN HIERARCHY MANAGEMENT
-- ===========================================

-- Restaurant chain hierarchy
CREATE TABLE restaurant_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),
    code VARCHAR(50) UNIQUE NOT NULL,
    corporate_settings JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    default_currency VARCHAR(3) DEFAULT 'THB',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regional divisions within chains
CREATE TABLE chain_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),
    code VARCHAR(50) NOT NULL,
    manager_user_id UUID,
    regional_settings JSONB DEFAULT '{}',
    timezone VARCHAR(50),
    operating_hours JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, code)
);

-- Enhanced restaurant table for chain management
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS chain_id UUID REFERENCES restaurant_chains(id),
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES chain_regions(id),
ADD COLUMN IF NOT EXISTS location_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS chain_level chain_level DEFAULT 'location',
ADD COLUMN IF NOT EXISTS parent_location_id UUID REFERENCES restaurants(id),
ADD COLUMN IF NOT EXISTS franchise_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sync_priority INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;

-- Add indexes for chain hierarchy
CREATE INDEX idx_restaurants_chain_id ON restaurants(chain_id);
CREATE INDEX idx_restaurants_region_id ON restaurants(region_id);
CREATE INDEX idx_restaurants_location_code ON restaurants(location_code);
CREATE INDEX idx_restaurants_sync_priority ON restaurants(sync_priority);
CREATE INDEX idx_chain_regions_chain_id ON chain_regions(chain_id);

-- ===========================================
-- SYNCHRONIZATION CONFIGURATION
-- ===========================================

-- Synchronization rules configuration
CREATE TABLE sync_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    sync_direction VARCHAR(50) NOT NULL, -- 'bidirectional', 'top_down', 'bottom_up'
    conflict_resolution conflict_resolution DEFAULT 'last_write_wins',
    sync_frequency_minutes INTEGER DEFAULT 60,
    batch_size INTEGER DEFAULT 1000,
    priority_weight INTEGER DEFAULT 100,
    field_mappings JSONB DEFAULT '{}',
    filter_conditions JSONB DEFAULT '{}',
    transformation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, table_name)
);

-- Synchronization schedules
CREATE TABLE sync_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES sync_configurations(id) ON DELETE CASCADE,
    source_restaurant_id UUID REFERENCES restaurants(id),
    target_restaurant_id UUID REFERENCES restaurants(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    sync_type VARCHAR(50) DEFAULT 'incremental', -- 'full', 'incremental', 'delta'
    status sync_status DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- SYNCHRONIZATION TRACKING
-- ===========================================

-- Data synchronization logs
CREATE TABLE sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id),
    source_restaurant_id UUID REFERENCES restaurants(id),
    target_restaurant_id UUID REFERENCES restaurants(id),
    table_name VARCHAR(100) NOT NULL,
    operation sync_operation NOT NULL,
    record_id UUID,
    record_ids UUID[] DEFAULT '{}',
    old_data JSONB,
    new_data JSONB,
    sync_batch_id UUID,
    status sync_status DEFAULT 'pending',
    conflict_detected BOOLEAN DEFAULT false,
    conflict_resolution_strategy conflict_resolution,
    resolved_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synchronization conflicts tracking
CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_operation_id UUID NOT NULL REFERENCES sync_operations(id) ON DELETE CASCADE,
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    conflict_type VARCHAR(100) NOT NULL, -- 'data_mismatch', 'concurrent_update', 'version_conflict'
    source_data JSONB NOT NULL,
    target_data JSONB NOT NULL,
    conflicting_fields JSONB DEFAULT '[]',
    resolution_strategy conflict_resolution,
    resolved_data JSONB,
    resolved_by UUID REFERENCES auth_users(id),
    resolved_at TIMESTAMPTZ,
    auto_resolved BOOLEAN DEFAULT false,
    priority_score INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    status sync_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synchronization performance metrics
CREATE TABLE sync_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id),
    sync_batch_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    restaurant_count INTEGER NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_success INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    execution_time_ms BIGINT DEFAULT 0,
    network_latency_ms INTEGER DEFAULT 0,
    throughput_records_per_sec DECIMAL(10,2) DEFAULT 0,
    memory_usage_mb INTEGER DEFAULT 0,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0,
    error_rate_percent DECIMAL(5,2) DEFAULT 0,
    sync_quality_score DECIMAL(5,2) DEFAULT 100,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ADVANCED INDEXING
-- ===========================================

-- Sync operations indexes
CREATE INDEX idx_sync_operations_chain_id ON sync_operations(chain_id);
CREATE INDEX idx_sync_operations_source_restaurant ON sync_operations(source_restaurant_id);
CREATE INDEX idx_sync_operations_target_restaurant ON sync_operations(target_restaurant_id);
CREATE INDEX idx_sync_operations_table_name ON sync_operations(table_name);
CREATE INDEX idx_sync_operations_status ON sync_operations(status);
CREATE INDEX idx_sync_operations_batch_id ON sync_operations(sync_batch_id);
CREATE INDEX idx_sync_operations_created_at ON sync_operations(created_at);
CREATE INDEX idx_sync_operations_conflict ON sync_operations(conflict_detected);

-- Composite indexes for performance
CREATE INDEX idx_sync_operations_chain_status_date ON sync_operations(chain_id, status, created_at);
CREATE INDEX idx_sync_operations_table_status ON sync_operations(table_name, status);

-- Sync conflicts indexes
CREATE INDEX idx_sync_conflicts_chain_id ON sync_conflicts(chain_id);
CREATE INDEX idx_sync_conflicts_table_record ON sync_conflicts(table_name, record_id);
CREATE INDEX idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX idx_sync_conflicts_priority ON sync_conflicts(priority_score DESC);
CREATE INDEX idx_sync_conflicts_resolved_at ON sync_conflicts(resolved_at);

-- Sync schedules indexes
CREATE INDEX idx_sync_schedules_config_id ON sync_schedules(config_id);
CREATE INDEX idx_sync_schedules_scheduled_at ON sync_schedules(scheduled_at);
CREATE INDEX idx_sync_schedules_status ON sync_schedules(status);
CREATE INDEX idx_sync_schedules_source_target ON sync_schedules(source_restaurant_id, target_restaurant_id);

-- Performance metrics indexes
CREATE INDEX idx_sync_performance_chain_batch ON sync_performance_metrics(chain_id, sync_batch_id);
CREATE INDEX idx_sync_performance_table_date ON sync_performance_metrics(table_name, started_at);
CREATE INDEX idx_sync_performance_quality_score ON sync_performance_metrics(sync_quality_score);

-- ===========================================
-- SYNCHRONIZATION FUNCTIONS
-- ===========================================

-- Function to generate unique sync batch ID
CREATE OR REPLACE FUNCTION generate_sync_batch_id()
RETURNS UUID AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate synchronization priority
CREATE OR REPLACE FUNCTION calculate_sync_priority(
    p_table_name VARCHAR,
    p_operation_type sync_operation,
    p_restaurant_priority INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    base_priority INTEGER := 1000;
    table_weight INTEGER := 100;
    operation_weight INTEGER := 100;
BEGIN
    -- Table-specific weights
    table_weight := CASE p_table_name
        WHEN 'sop_documents' THEN 500
        WHEN 'auth_users' THEN 400
        WHEN 'menu_items' THEN 300
        WHEN 'inventory_items' THEN 250
        WHEN 'staff_schedules' THEN 200
        ELSE 100
    END;
    
    -- Operation-specific weights
    operation_weight := CASE p_operation_type
        WHEN 'DELETE' THEN 300
        WHEN 'INSERT' THEN 200
        WHEN 'UPDATE' THEN 150
        WHEN 'BULK_UPDATE' THEN 100
        ELSE 50
    END;
    
    RETURN base_priority + table_weight + operation_weight + COALESCE(p_restaurant_priority, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to detect synchronization conflicts
CREATE OR REPLACE FUNCTION detect_sync_conflicts(
    p_table_name VARCHAR,
    p_record_id UUID,
    p_source_data JSONB,
    p_target_data JSONB
)
RETURNS TABLE(
    has_conflict BOOLEAN,
    conflict_type VARCHAR,
    conflicting_fields JSONB
) AS $$
DECLARE
    conflicting_keys TEXT[] := '{}';
    source_key TEXT;
    target_value JSONB;
    source_value JSONB;
    conflict_found BOOLEAN := false;
    conflict_type_result VARCHAR := 'data_mismatch';
BEGIN
    -- Compare each key in source and target data
    FOR source_key IN SELECT jsonb_object_keys(p_source_data)
    LOOP
        source_value := p_source_data -> source_key;
        target_value := p_target_data -> source_key;
        
        -- Check for data mismatch
        IF target_value IS NOT NULL AND source_value != target_value THEN
            conflicting_keys := array_append(conflicting_keys, source_key);
            conflict_found := true;
        END IF;
    END LOOP;
    
    -- Check for version conflicts (if both have updated_at)
    IF (p_source_data ? 'updated_at') AND (p_target_data ? 'updated_at') THEN
        IF (p_source_data ->> 'updated_at')::TIMESTAMPTZ < (p_target_data ->> 'updated_at')::TIMESTAMPTZ THEN
            conflict_type_result := 'version_conflict';
        END IF;
    END IF;
    
    RETURN QUERY SELECT 
        conflict_found,
        conflict_type_result,
        array_to_json(conflicting_keys)::JSONB;
END;
$$ LANGUAGE plpgsql;

-- Function to resolve conflicts automatically
CREATE OR REPLACE FUNCTION resolve_sync_conflict_auto(
    p_conflict_id UUID,
    p_resolution_strategy conflict_resolution
)
RETURNS JSONB AS $$
DECLARE
    conflict_record RECORD;
    resolved_data JSONB := '{}';
    source_key TEXT;
    source_value JSONB;
    target_value JSONB;
BEGIN
    -- Get conflict details
    SELECT * INTO conflict_record
    FROM sync_conflicts
    WHERE id = p_conflict_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conflict not found: %', p_conflict_id;
    END IF;
    
    -- Apply resolution strategy
    CASE p_resolution_strategy
        WHEN 'last_write_wins' THEN
            -- Use the data with the latest updated_at timestamp
            IF (conflict_record.source_data ->> 'updated_at')::TIMESTAMPTZ > 
               (conflict_record.target_data ->> 'updated_at')::TIMESTAMPTZ THEN
                resolved_data := conflict_record.source_data;
            ELSE
                resolved_data := conflict_record.target_data;
            END IF;
            
        WHEN 'priority_based' THEN
            -- Use source data (higher priority location)
            resolved_data := conflict_record.source_data;
            
        WHEN 'merge_strategy' THEN
            -- Merge non-conflicting fields
            resolved_data := conflict_record.target_data;
            FOR source_key IN SELECT jsonb_object_keys(conflict_record.source_data)
            LOOP
                source_value := conflict_record.source_data -> source_key;
                target_value := conflict_record.target_data -> source_key;
                
                -- Use source value if target doesn't have it or if source is newer
                IF target_value IS NULL OR 
                   (source_key = 'updated_at' AND source_value > target_value) THEN
                    resolved_data := jsonb_set(resolved_data, ARRAY[source_key], source_value);
                END IF;
            END LOOP;
            
        ELSE
            -- Default to last_write_wins
            resolved_data := conflict_record.source_data;
    END CASE;
    
    -- Update conflict record
    UPDATE sync_conflicts 
    SET resolved_data = resolved_data,
        auto_resolved = true,
        resolved_at = NOW(),
        status = 'completed'
    WHERE id = p_conflict_id;
    
    RETURN resolved_data;
END;
$$ LANGUAGE plpgsql;

-- Function to initiate data synchronization
CREATE OR REPLACE FUNCTION initiate_data_sync(
    p_chain_id UUID,
    p_table_name VARCHAR,
    p_source_restaurant_id UUID DEFAULT NULL,
    p_target_restaurant_ids UUID[] DEFAULT NULL,
    p_sync_type VARCHAR DEFAULT 'incremental'
)
RETURNS UUID AS $$
DECLARE
    sync_batch_id UUID;
    config_record RECORD;
    restaurant_id UUID;
    sync_schedule_id UUID;
BEGIN
    -- Generate batch ID
    sync_batch_id := generate_sync_batch_id();
    
    -- Get sync configuration
    SELECT * INTO config_record
    FROM sync_configurations
    WHERE chain_id = p_chain_id AND table_name = p_table_name AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No sync configuration found for chain % table %', p_chain_id, p_table_name;
    END IF;
    
    -- Create sync schedules for each target restaurant
    IF p_target_restaurant_ids IS NOT NULL THEN
        FOREACH restaurant_id IN ARRAY p_target_restaurant_ids
        LOOP
            INSERT INTO sync_schedules (
                config_id, source_restaurant_id, target_restaurant_id,
                scheduled_at, sync_type, metadata
            ) VALUES (
                config_record.id, p_source_restaurant_id, restaurant_id,
                NOW(), p_sync_type, jsonb_build_object('batch_id', sync_batch_id)
            ) RETURNING id INTO sync_schedule_id;
        END LOOP;
    ELSE
        -- Sync to all restaurants in chain
        INSERT INTO sync_schedules (
            config_id, source_restaurant_id, target_restaurant_id,
            scheduled_at, sync_type, metadata
        )
        SELECT 
            config_record.id, p_source_restaurant_id, r.id,
            NOW(), p_sync_type, jsonb_build_object('batch_id', sync_batch_id)
        FROM restaurants r
        WHERE r.chain_id = p_chain_id 
        AND r.id != COALESCE(p_source_restaurant_id, '00000000-0000-0000-0000-000000000000')
        AND r.sync_enabled = true;
    END IF;
    
    RETURN sync_batch_id;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- REAL-TIME SYNCHRONIZATION TRIGGERS
-- ===========================================

-- Function to trigger sync on data changes
CREATE OR REPLACE FUNCTION trigger_sync_on_change()
RETURNS TRIGGER AS $$
DECLARE
    chain_id_val UUID;
    sync_config RECORD;
    operation_type sync_operation;
BEGIN
    -- Determine operation type
    operation_type := CASE TG_OP
        WHEN 'INSERT' THEN 'INSERT'::sync_operation
        WHEN 'UPDATE' THEN 'UPDATE'::sync_operation
        WHEN 'DELETE' THEN 'DELETE'::sync_operation
    END;
    
    -- Get chain ID based on table
    IF TG_TABLE_NAME = 'restaurants' THEN
        chain_id_val := COALESCE(NEW.chain_id, OLD.chain_id);
    ELSIF TG_TABLE_NAME = 'sop_documents' THEN
        SELECT r.chain_id INTO chain_id_val
        FROM restaurants r
        WHERE r.id = COALESCE(NEW.restaurant_id, OLD.restaurant_id);
    ELSIF TG_TABLE_NAME = 'auth_users' THEN
        SELECT r.chain_id INTO chain_id_val
        FROM restaurants r
        WHERE r.id = COALESCE(NEW.restaurant_id, OLD.restaurant_id);
    END IF;
    
    -- Check if sync is configured for this table
    SELECT * INTO sync_config
    FROM sync_configurations
    WHERE chain_id = chain_id_val 
    AND table_name = TG_TABLE_NAME 
    AND is_active = true;
    
    IF FOUND THEN
        -- Create sync operation record
        INSERT INTO sync_operations (
            chain_id, source_restaurant_id, table_name, operation,
            record_id, old_data, new_data, sync_batch_id,
            status, created_at
        ) VALUES (
            chain_id_val,
            CASE 
                WHEN TG_TABLE_NAME = 'restaurants' THEN COALESCE(NEW.id, OLD.id)
                ELSE (
                    SELECT r.id FROM restaurants r 
                    WHERE r.id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
                )
            END,
            TG_TABLE_NAME,
            operation_type,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::JSONB ELSE NULL END,
            CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::JSONB ELSE NULL END,
            generate_sync_batch_id(),
            'pending',
            NOW()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- APPLY TRIGGERS TO CORE TABLES
-- ===========================================

-- SOP documents sync trigger
CREATE TRIGGER trigger_sop_documents_sync
    AFTER INSERT OR UPDATE OR DELETE ON sop_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_on_change();

-- Auth users sync trigger
CREATE TRIGGER trigger_auth_users_sync
    AFTER INSERT OR UPDATE OR DELETE ON auth_users
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_on_change();

-- Restaurants sync trigger
CREATE TRIGGER trigger_restaurants_sync
    AFTER INSERT OR UPDATE OR DELETE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_on_change();

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_restaurant_chains_updated_at 
    BEFORE UPDATE ON restaurant_chains 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chain_regions_updated_at 
    BEFORE UPDATE ON chain_regions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_configurations_updated_at 
    BEFORE UPDATE ON sync_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_schedules_updated_at 
    BEFORE UPDATE ON sync_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_operations_updated_at 
    BEFORE UPDATE ON sync_operations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_conflicts_updated_at 
    BEFORE UPDATE ON sync_conflicts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all new tables
ALTER TABLE restaurant_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Restaurant chains access policy
CREATE POLICY "Chain access policy"
ON restaurant_chains FOR ALL
TO authenticated
USING (
    id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
    )
    OR auth.uid() IN (
        SELECT id FROM auth_users WHERE role = 'admin'
    )
);

-- Chain regions access policy
CREATE POLICY "Chain regions access policy"
ON chain_regions FOR ALL
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
    )
    OR auth.uid() IN (
        SELECT id FROM auth_users WHERE role = 'admin'
    )
);

-- Sync configurations - admin and manager access
CREATE POLICY "Sync configurations access policy"
ON sync_configurations FOR ALL
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
);

-- Sync operations - read access for chain members
CREATE POLICY "Sync operations access policy"
ON sync_operations FOR SELECT
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
    )
);

-- Sync conflicts - manager access for resolution
CREATE POLICY "Sync conflicts access policy"
ON sync_conflicts FOR ALL
TO authenticated
USING (
    chain_id IN (
        SELECT r.chain_id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
);

-- ===========================================
-- SAMPLE CHAIN DATA
-- ===========================================

-- Insert sample restaurant chain
INSERT INTO restaurant_chains (id, name, name_th, code, corporate_settings) VALUES
('11111111-1111-1111-1111-111111111111', 
 'Krong Thai Restaurant Chain', 
 'เครือข่ายร้านกรองไทย',
 'KTC',
 '{
    "sync_frequency_minutes": 30,
    "conflict_resolution_default": "last_write_wins",
    "auto_sync_enabled": true,
    "priority_locations": [],
    "compliance_requirements": {
        "audit_retention_days": 365,
        "sync_encryption": true,
        "conflict_notification": true
    }
 }'::JSONB);

-- Insert sample region
INSERT INTO chain_regions (id, chain_id, name, name_th, code, regional_settings) VALUES
('22222222-2222-2222-2222-222222222222',
 '11111111-1111-1111-1111-111111111111',
 'Bangkok Metropolitan Region',
 'เขตกรุงเทพมหานคร',
 'BKK',
 '{
    "operating_hours": {
        "monday": {"open": "10:00", "close": "22:00"},
        "tuesday": {"open": "10:00", "close": "22:00"},
        "wednesday": {"open": "10:00", "close": "22:00"},
        "thursday": {"open": "10:00", "close": "22:00"},
        "friday": {"open": "10:00", "close": "23:00"},
        "saturday": {"open": "10:00", "close": "23:00"},
        "sunday": {"open": "10:00", "close": "22:00"}
    },
    "regional_pricing_multiplier": 1.0,
    "local_compliance": ["thai_health_dept", "bkk_municipal"]
 }'::JSONB);

-- Update existing restaurant with chain information
UPDATE restaurants 
SET chain_id = '11111111-1111-1111-1111-111111111111',
    region_id = '22222222-2222-2222-2222-222222222222',
    location_code = 'KTC-001',
    sync_priority = 1000,
    sync_enabled = true
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Insert sample sync configurations
INSERT INTO sync_configurations (chain_id, table_name, sync_direction, conflict_resolution, sync_frequency_minutes) VALUES
('11111111-1111-1111-1111-111111111111', 'sop_documents', 'bidirectional', 'last_write_wins', 30),
('11111111-1111-1111-1111-111111111111', 'auth_users', 'top_down', 'priority_based', 60),
('11111111-1111-1111-1111-111111111111', 'sop_categories', 'top_down', 'priority_based', 120),
('11111111-1111-1111-1111-111111111111', 'form_templates', 'bidirectional', 'merge_strategy', 45);

-- ===========================================
-- PERFORMANCE OPTIMIZATIONS
-- ===========================================

-- Analyze new tables for query optimization
ANALYZE restaurant_chains;
ANALYZE chain_regions;
ANALYZE sync_configurations;
ANALYZE sync_operations;
ANALYZE sync_conflicts;
ANALYZE sync_performance_metrics;

-- Set statistics targets for better performance
ALTER TABLE sync_operations ALTER COLUMN old_data SET STATISTICS 1000;
ALTER TABLE sync_operations ALTER COLUMN new_data SET STATISTICS 1000;
ALTER TABLE sync_conflicts ALTER COLUMN source_data SET STATISTICS 1000;
ALTER TABLE sync_conflicts ALTER COLUMN target_data SET STATISTICS 1000;

-- ===========================================
-- MONITORING AND MAINTENANCE
-- ===========================================

-- Create materialized view for sync health monitoring
CREATE MATERIALIZED VIEW sync_health_dashboard AS
SELECT 
    rc.name as chain_name,
    sc.table_name,
    COUNT(so.id) as total_operations,
    COUNT(so.id) FILTER (WHERE so.status = 'completed') as completed_operations,
    COUNT(so.id) FILTER (WHERE so.status = 'failed') as failed_operations,
    COUNT(so.id) FILTER (WHERE so.conflict_detected = true) as conflict_operations,
    AVG(so.execution_time_ms) as avg_execution_time_ms,
    MAX(so.created_at) as last_sync_at,
    CASE 
        WHEN COUNT(so.id) = 0 THEN 100
        ELSE ROUND((COUNT(so.id) FILTER (WHERE so.status = 'completed')::DECIMAL / COUNT(so.id)) * 100, 2)
    END as success_rate_percent
FROM restaurant_chains rc
JOIN sync_configurations sc ON sc.chain_id = rc.id
LEFT JOIN sync_operations so ON so.chain_id = rc.id AND so.table_name = sc.table_name
WHERE so.created_at >= NOW() - INTERVAL '24 hours' OR so.id IS NULL
GROUP BY rc.id, rc.name, sc.table_name;

-- Create index on materialized view
CREATE INDEX idx_sync_health_dashboard_chain_table ON sync_health_dashboard(chain_name, table_name);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_sync_health_dashboard()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY sync_health_dashboard;
END;
$$ LANGUAGE plpgsql;

COMMENT ON MIGRATION IS 'Multi-restaurant data synchronization system with conflict resolution, real-time triggers, and comprehensive monitoring for enterprise chain operations';