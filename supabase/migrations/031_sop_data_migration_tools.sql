-- SOP Data Migration Tools for System Updates
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive data migration system for schema updates and data transformations

-- ===========================================
-- MIGRATION SYSTEM ENUMS
-- ===========================================

-- Migration type enum
CREATE TYPE migration_type AS ENUM (
    'schema_change', 'data_transformation', 'version_upgrade', 
    'structure_refactor', 'index_optimization', 'constraint_update',
    'content_migration', 'translation_migration', 'bulk_import'
);

-- Migration status enum
CREATE TYPE migration_status AS ENUM (
    'pending', 'running', 'completed', 'failed', 'rolled_back', 
    'partially_completed', 'requires_approval', 'cancelled'
);

-- Migration priority enum
CREATE TYPE migration_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ===========================================
-- MIGRATION SYSTEM TABLES
-- ===========================================

-- Migration templates table
CREATE TABLE IF NOT EXISTS sop_migration_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    migration_type migration_type NOT NULL,
    
    -- Migration definition
    up_sql TEXT NOT NULL, -- SQL to apply the migration
    down_sql TEXT NOT NULL, -- SQL to rollback the migration
    pre_checks JSONB DEFAULT '[]', -- Pre-migration validation checks
    post_checks JSONB DEFAULT '[]', -- Post-migration validation checks
    
    -- Dependencies and prerequisites
    dependencies VARCHAR(255)[] DEFAULT '{}', -- Required migrations
    prerequisites JSONB DEFAULT '{}', -- System requirements
    
    -- Risk assessment
    risk_level migration_priority DEFAULT 'medium',
    estimated_duration_minutes INTEGER,
    affects_live_data BOOLEAN DEFAULT false,
    requires_downtime BOOLEAN DEFAULT false,
    
    -- Compatibility
    min_postgres_version VARCHAR(20),
    min_app_version VARCHAR(20),
    max_app_version VARCHAR(20),
    
    -- Metadata
    tags VARCHAR(255)[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_migration_template_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_migration_template_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id)
);

-- Migration executions table
CREATE TABLE IF NOT EXISTS sop_migration_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID,
    restaurant_id UUID NOT NULL,
    
    -- Migration details
    migration_name VARCHAR(255) NOT NULL,
    migration_type migration_type NOT NULL,
    status migration_status DEFAULT 'pending',
    priority migration_priority DEFAULT 'medium',
    
    -- Execution context
    target_version VARCHAR(50),
    source_version VARCHAR(50),
    execution_environment VARCHAR(50) DEFAULT 'production',
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Progress tracking
    total_steps INTEGER DEFAULT 1,
    completed_steps INTEGER DEFAULT 0,
    current_step_description TEXT,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Data metrics
    records_affected BIGINT DEFAULT 0,
    records_migrated BIGINT DEFAULT 0,
    records_failed BIGINT DEFAULT 0,
    tables_affected INTEGER DEFAULT 0,
    
    -- Performance metrics
    duration_seconds INTEGER,
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    
    -- Results and logs
    execution_log TEXT,
    error_message TEXT,
    error_details JSONB,
    validation_results JSONB DEFAULT '{}',
    
    -- Rollback information
    rollback_sql TEXT,
    rollback_available BOOLEAN DEFAULT true,
    rollback_executed_at TIMESTAMPTZ,
    rollback_by UUID,
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    initiated_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_migration_execution_template FOREIGN KEY (template_id) REFERENCES sop_migration_templates(id),
    CONSTRAINT fk_migration_execution_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_migration_execution_initiated_by FOREIGN KEY (initiated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_migration_execution_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_migration_execution_rollback_by FOREIGN KEY (rollback_by) REFERENCES auth_users(id)
);

-- Migration validation rules table
CREATE TABLE IF NOT EXISTS sop_migration_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Validation details
    validation_type VARCHAR(100) NOT NULL, -- 'pre_check', 'post_check', 'data_integrity'
    validation_name VARCHAR(255) NOT NULL,
    validation_sql TEXT NOT NULL,
    expected_result JSONB,
    
    -- Execution
    executed_at TIMESTAMPTZ,
    actual_result JSONB,
    validation_passed BOOLEAN,
    is_critical BOOLEAN DEFAULT false,
    
    -- Results
    error_message TEXT,
    execution_time_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_validation_execution FOREIGN KEY (execution_id) REFERENCES sop_migration_executions(id) ON DELETE CASCADE,
    CONSTRAINT fk_validation_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Data transformation mappings table
CREATE TABLE IF NOT EXISTS sop_data_transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transformation_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Source and target
    source_table VARCHAR(255) NOT NULL,
    target_table VARCHAR(255) NOT NULL,
    source_schema VARCHAR(255) DEFAULT 'public',
    target_schema VARCHAR(255) DEFAULT 'public',
    
    -- Transformation logic
    transformation_sql TEXT NOT NULL,
    field_mappings JSONB DEFAULT '{}', -- Column mapping configuration
    data_filters JSONB DEFAULT '{}', -- WHERE clause conditions
    
    -- Validation
    validation_queries JSONB DEFAULT '[]',
    expected_row_count_min INTEGER,
    expected_row_count_max INTEGER,
    
    -- Dependencies
    depends_on VARCHAR(255)[] DEFAULT '{}',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_transformation_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT unique_transformation_name UNIQUE (transformation_name)
);

-- ===========================================
-- MIGRATION SYSTEM INDEXES
-- ===========================================

-- Migration templates indexes
CREATE INDEX idx_migration_templates_type ON sop_migration_templates(migration_type);
CREATE INDEX idx_migration_templates_active ON sop_migration_templates(is_active);
CREATE INDEX idx_migration_templates_risk ON sop_migration_templates(risk_level);

-- Migration executions indexes
CREATE INDEX idx_migration_executions_restaurant ON sop_migration_executions(restaurant_id);
CREATE INDEX idx_migration_executions_status ON sop_migration_executions(status);
CREATE INDEX idx_migration_executions_scheduled ON sop_migration_executions(scheduled_at);
CREATE INDEX idx_migration_executions_type_status ON sop_migration_executions(migration_type, status);
CREATE INDEX idx_migration_executions_initiated_by ON sop_migration_executions(initiated_by);

-- Migration validations indexes
CREATE INDEX idx_migration_validations_execution ON sop_migration_validations(execution_id);
CREATE INDEX idx_migration_validations_type ON sop_migration_validations(validation_type);
CREATE INDEX idx_migration_validations_critical ON sop_migration_validations(is_critical, validation_passed);

-- Data transformations indexes
CREATE INDEX idx_transformations_source_table ON sop_data_transformations(source_table);
CREATE INDEX idx_transformations_target_table ON sop_data_transformations(target_table);
CREATE INDEX idx_transformations_active ON sop_data_transformations(is_active);

-- ===========================================
-- MIGRATION FUNCTIONS
-- ===========================================

-- Function to create migration execution from template
CREATE OR REPLACE FUNCTION create_migration_execution(
    p_template_id UUID,
    p_restaurant_id UUID,
    p_target_version VARCHAR(50) DEFAULT NULL,
    p_initiated_by UUID,
    p_scheduled_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    template_record RECORD;
    execution_id UUID;
BEGIN
    -- Get migration template
    SELECT * INTO template_record 
    FROM sop_migration_templates 
    WHERE id = p_template_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Migration template not found or inactive: %', p_template_id;
    END IF;
    
    -- Check dependencies
    IF array_length(template_record.dependencies, 1) > 0 THEN
        IF EXISTS (
            SELECT 1 FROM unnest(template_record.dependencies) AS dep
            WHERE NOT EXISTS (
                SELECT 1 FROM sop_migration_executions
                WHERE migration_name = dep
                AND restaurant_id = p_restaurant_id
                AND status = 'completed'
            )
        ) THEN
            RAISE EXCEPTION 'Migration dependencies not satisfied for template: %', template_record.template_name;
        END IF;
    END IF;
    
    -- Create migration execution
    INSERT INTO sop_migration_executions (
        template_id, restaurant_id, migration_name, migration_type, priority,
        target_version, scheduled_at, initiated_by, requires_approval,
        rollback_sql
    ) VALUES (
        p_template_id, p_restaurant_id, template_record.template_name, 
        template_record.migration_type, template_record.risk_level,
        p_target_version, p_scheduled_at, p_initiated_by,
        template_record.risk_level IN ('high', 'critical'),
        template_record.down_sql
    ) RETURNING id INTO execution_id;
    
    -- Create validation rules from template
    INSERT INTO sop_migration_validations (
        execution_id, restaurant_id, validation_type, validation_name, 
        validation_sql, expected_result, is_critical
    )
    SELECT 
        execution_id, p_restaurant_id, 'pre_check', 
        check_rule->>'name', check_rule->>'sql', 
        check_rule->'expected', (check_rule->>'critical')::BOOLEAN
    FROM jsonb_array_elements(template_record.pre_checks) AS check_rule;
    
    INSERT INTO sop_migration_validations (
        execution_id, restaurant_id, validation_type, validation_name, 
        validation_sql, expected_result, is_critical
    )
    SELECT 
        execution_id, p_restaurant_id, 'post_check', 
        check_rule->>'name', check_rule->>'sql', 
        check_rule->'expected', (check_rule->>'critical')::BOOLEAN
    FROM jsonb_array_elements(template_record.post_checks) AS check_rule;
    
    -- Log migration creation
    INSERT INTO audit_logs (
        restaurant_id, action, resource_type, resource_id, user_id, metadata
    ) VALUES (
        p_restaurant_id, 'CREATE'::audit_action, 'migration_execution', execution_id, p_initiated_by,
        jsonb_build_object(
            'template_id', p_template_id,
            'migration_name', template_record.template_name,
            'target_version', p_target_version,
            'scheduled_at', p_scheduled_at
        )
    );
    
    RETURN execution_id;
END;
$$;

-- Function to execute migration with validation
CREATE OR REPLACE FUNCTION execute_migration(p_execution_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    execution_record RECORD;
    template_record RECORD;
    validation_record RECORD;
    step_count INTEGER := 0;
    completed_steps INTEGER := 0;
    start_time TIMESTAMPTZ := NOW();
    end_time TIMESTAMPTZ;
    success BOOLEAN := true;
    affected_rows BIGINT := 0;
BEGIN
    -- Get execution and template details
    SELECT e.*, t.up_sql, t.estimated_duration_minutes
    INTO execution_record
    FROM sop_migration_executions e
    LEFT JOIN sop_migration_templates t ON e.template_id = t.id
    WHERE e.id = p_execution_id AND e.status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Migration execution not found or not in pending status: %', p_execution_id;
    END IF;
    
    -- Check if approval is required and granted
    IF execution_record.requires_approval AND execution_record.approved_at IS NULL THEN
        RAISE EXCEPTION 'Migration requires approval before execution: %', p_execution_id;
    END IF;
    
    -- Update status to running
    UPDATE sop_migration_executions 
    SET status = 'running', started_at = start_time, updated_at = start_time
    WHERE id = p_execution_id;
    
    BEGIN
        -- Count total steps (pre-checks + migration + post-checks)
        SELECT COUNT(*) INTO step_count FROM sop_migration_validations
        WHERE execution_id = p_execution_id;
        step_count := step_count + 1; -- Add 1 for actual migration step
        
        UPDATE sop_migration_executions 
        SET total_steps = step_count, current_step_description = 'Starting pre-migration validation'
        WHERE id = p_execution_id;
        
        -- Execute pre-migration validations
        FOR validation_record IN 
            SELECT * FROM sop_migration_validations
            WHERE execution_id = p_execution_id AND validation_type = 'pre_check'
            ORDER BY is_critical DESC, validation_name
        LOOP
            PERFORM execute_validation_check(validation_record.id);
            completed_steps := completed_steps + 1;
            
            UPDATE sop_migration_executions 
            SET completed_steps = completed_steps,
                progress_percentage = (completed_steps::DECIMAL / step_count * 100),
                current_step_description = 'Pre-check: ' || validation_record.validation_name
            WHERE id = p_execution_id;
        END LOOP;
        
        -- Check if any critical pre-checks failed
        IF EXISTS (
            SELECT 1 FROM sop_migration_validations 
            WHERE execution_id = p_execution_id 
            AND validation_type = 'pre_check' 
            AND is_critical = true 
            AND validation_passed = false
        ) THEN
            RAISE EXCEPTION 'Critical pre-migration validation failed';
        END IF;
        
        -- Execute the actual migration
        UPDATE sop_migration_executions 
        SET current_step_description = 'Executing migration: ' || execution_record.migration_name
        WHERE id = p_execution_id;
        
        -- Execute migration SQL
        IF execution_record.up_sql IS NOT NULL THEN
            EXECUTE execution_record.up_sql;
            GET DIAGNOSTICS affected_rows = ROW_COUNT;
        END IF;
        
        completed_steps := completed_steps + 1;
        UPDATE sop_migration_executions 
        SET completed_steps = completed_steps,
            progress_percentage = (completed_steps::DECIMAL / step_count * 100),
            records_affected = affected_rows
        WHERE id = p_execution_id;
        
        -- Execute post-migration validations
        FOR validation_record IN 
            SELECT * FROM sop_migration_validations
            WHERE execution_id = p_execution_id AND validation_type = 'post_check'
            ORDER BY is_critical DESC, validation_name
        LOOP
            PERFORM execute_validation_check(validation_record.id);
            completed_steps := completed_steps + 1;
            
            UPDATE sop_migration_executions 
            SET completed_steps = completed_steps,
                progress_percentage = (completed_steps::DECIMAL / step_count * 100),
                current_step_description = 'Post-check: ' || validation_record.validation_name
            WHERE id = p_execution_id;
        END LOOP;
        
        -- Check if any critical post-checks failed
        IF EXISTS (
            SELECT 1 FROM sop_migration_validations 
            WHERE execution_id = p_execution_id 
            AND validation_type = 'post_check' 
            AND is_critical = true 
            AND validation_passed = false
        ) THEN
            RAISE EXCEPTION 'Critical post-migration validation failed';
        END IF;
        
        end_time := NOW();
        
        -- Update execution with success
        UPDATE sop_migration_executions 
        SET 
            status = 'completed',
            completed_at = end_time,
            progress_percentage = 100,
            current_step_description = 'Migration completed successfully',
            duration_seconds = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER,
            records_migrated = affected_rows,
            updated_at = end_time
        WHERE id = p_execution_id;
        
    EXCEPTION WHEN OTHERS THEN
        success := false;
        
        -- Update execution with failure
        UPDATE sop_migration_executions 
        SET 
            status = 'failed',
            failed_at = NOW(),
            error_message = SQLERRM,
            error_details = jsonb_build_object(
                'error_code', SQLSTATE,
                'error_message', SQLERRM,
                'error_context', 'migration_execution',
                'step', completed_steps
            ),
            updated_at = NOW()
        WHERE id = p_execution_id;
        
        -- Log error
        INSERT INTO audit_logs (
            restaurant_id, action, resource_type, resource_id, metadata
        ) VALUES (
            execution_record.restaurant_id, 'ERROR'::audit_action, 'migration_execution', p_execution_id,
            jsonb_build_object(
                'error_message', SQLERRM,
                'error_code', SQLSTATE,
                'migration_name', execution_record.migration_name,
                'completed_steps', completed_steps
            )
        );
    END;
    
    RETURN success;
END;
$$;

-- Function to execute a validation check
CREATE OR REPLACE FUNCTION execute_validation_check(p_validation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    validation_record RECORD;
    actual_result JSONB;
    check_passed BOOLEAN := false;
    start_time TIMESTAMPTZ := NOW();
    execution_time INTEGER;
BEGIN
    -- Get validation details
    SELECT * INTO validation_record 
    FROM sop_migration_validations 
    WHERE id = p_validation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Validation not found: %', p_validation_id;
    END IF;
    
    BEGIN
        -- Execute validation SQL and capture result
        EXECUTE 'SELECT to_jsonb(result) FROM (' || validation_record.validation_sql || ') AS result'
        INTO actual_result;
        
        execution_time := EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER * 1000;
        
        -- Compare with expected result
        IF validation_record.expected_result IS NULL THEN
            check_passed := actual_result IS NOT NULL;
        ELSE
            check_passed := actual_result = validation_record.expected_result;
        END IF;
        
        -- Update validation record
        UPDATE sop_migration_validations 
        SET 
            executed_at = start_time,
            actual_result = actual_result,
            validation_passed = check_passed,
            execution_time_ms = execution_time
        WHERE id = p_validation_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Update validation with error
        UPDATE sop_migration_validations 
        SET 
            executed_at = start_time,
            validation_passed = false,
            error_message = SQLERRM,
            execution_time_ms = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER * 1000
        WHERE id = p_validation_id;
        
        check_passed := false;
    END;
    
    RETURN check_passed;
END;
$$;

-- Function to rollback migration
CREATE OR REPLACE FUNCTION rollback_migration(
    p_execution_id UUID,
    p_rollback_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    execution_record RECORD;
    success BOOLEAN := true;
BEGIN
    -- Get execution details
    SELECT * INTO execution_record 
    FROM sop_migration_executions 
    WHERE id = p_execution_id 
    AND status = 'completed' 
    AND rollback_available = true
    AND rollback_executed_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Migration execution not found or cannot be rolled back: %', p_execution_id;
    END IF;
    
    BEGIN
        -- Execute rollback SQL
        IF execution_record.rollback_sql IS NOT NULL THEN
            EXECUTE execution_record.rollback_sql;
        END IF;
        
        -- Update execution record
        UPDATE sop_migration_executions 
        SET 
            status = 'rolled_back',
            rollback_executed_at = NOW(),
            rollback_by = p_rollback_by,
            approval_notes = COALESCE(approval_notes || E'\n\n', '') || 'ROLLBACK: ' || COALESCE(p_notes, 'Manual rollback'),
            updated_at = NOW()
        WHERE id = p_execution_id;
        
        -- Log rollback
        INSERT INTO audit_logs (
            restaurant_id, action, resource_type, resource_id, user_id, metadata
        ) VALUES (
            execution_record.restaurant_id, 'ROLLBACK'::audit_action, 'migration_execution', p_execution_id, p_rollback_by,
            jsonb_build_object(
                'migration_name', execution_record.migration_name,
                'rollback_notes', p_notes,
                'original_completion', execution_record.completed_at
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        success := false;
        
        -- Update with rollback failure
        UPDATE sop_migration_executions 
        SET 
            error_message = 'Rollback failed: ' || SQLERRM,
            error_details = COALESCE(error_details, '{}'::JSONB) || jsonb_build_object(
                'rollback_error', SQLERRM,
                'rollback_attempted_at', NOW()
            ),
            updated_at = NOW()
        WHERE id = p_execution_id;
    END;
    
    RETURN success;
END;
$$;

-- Function to get migration status summary
CREATE OR REPLACE FUNCTION get_migration_status_summary(p_restaurant_id UUID)
RETURNS TABLE (
    total_migrations INTEGER,
    completed_migrations INTEGER,
    failed_migrations INTEGER,
    pending_migrations INTEGER,
    rollback_available INTEGER,
    last_migration_date TIMESTAMPTZ,
    next_scheduled_migration TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_migrations,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_migrations,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_migrations,
        COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending_migrations,
        COUNT(*) FILTER (WHERE status = 'completed' AND rollback_available = true AND rollback_executed_at IS NULL)::INTEGER as rollback_available,
        MAX(completed_at) as last_migration_date,
        MIN(scheduled_at) FILTER (WHERE status = 'pending') as next_scheduled_migration
    FROM sop_migration_executions
    WHERE restaurant_id = p_restaurant_id;
END;
$$;

-- Function to create data transformation
CREATE OR REPLACE FUNCTION create_data_transformation(
    p_transformation_name VARCHAR(255),
    p_source_table VARCHAR(255),
    p_target_table VARCHAR(255),
    p_transformation_sql TEXT,
    p_field_mappings JSONB DEFAULT '{}',
    p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    transformation_id UUID;
BEGIN
    INSERT INTO sop_data_transformations (
        transformation_name, source_table, target_table, transformation_sql,
        field_mappings, created_by
    ) VALUES (
        p_transformation_name, p_source_table, p_target_table, p_transformation_sql,
        p_field_mappings, p_created_by
    ) RETURNING id INTO transformation_id;
    
    RETURN transformation_id;
END;
$$;

-- ===========================================
-- TRIGGERS FOR MIGRATION AUTOMATION
-- ===========================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_migration_templates_updated_at 
    BEFORE UPDATE ON sop_migration_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_migration_executions_updated_at 
    BEFORE UPDATE ON sop_migration_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_transformations_updated_at 
    BEFORE UPDATE ON sop_data_transformations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on migration tables
ALTER TABLE sop_migration_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_migration_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_migration_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_data_transformations ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates (global access for admins)
CREATE POLICY "Migration templates access"
ON sop_migration_templates FOR ALL TO authenticated
USING (true); -- Templates are globally accessible

-- RLS policies for executions
CREATE POLICY "Migration executions restaurant isolation"
ON sop_migration_executions FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- RLS policies for validations
CREATE POLICY "Migration validations restaurant isolation"
ON sop_migration_validations FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- RLS policies for transformations (global access)
CREATE POLICY "Data transformations access"
ON sop_data_transformations FOR ALL TO authenticated
USING (true);

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION create_migration_execution TO authenticated;
GRANT EXECUTE ON FUNCTION execute_migration TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_migration TO authenticated;
GRANT EXECUTE ON FUNCTION get_migration_status_summary TO authenticated;
GRANT EXECUTE ON FUNCTION create_data_transformation TO authenticated;

-- ===========================================
-- SAMPLE MIGRATION TEMPLATES
-- ===========================================

-- Insert sample migration templates
INSERT INTO sop_migration_templates (
    template_name, description, migration_type, up_sql, down_sql,
    pre_checks, post_checks, risk_level, estimated_duration_minutes,
    affects_live_data, requires_downtime, created_by
) VALUES
(
    'add_sop_version_tracking',
    'Add version tracking columns to SOP documents table',
    'schema_change',
    'ALTER TABLE sop_documents ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
     ALTER TABLE sop_documents ADD COLUMN IF NOT EXISTS version_notes TEXT;
     CREATE INDEX IF NOT EXISTS idx_sop_version ON sop_documents(version_number);',
    'ALTER TABLE sop_documents DROP COLUMN IF EXISTS version_number;
     ALTER TABLE sop_documents DROP COLUMN IF EXISTS version_notes;
     DROP INDEX IF EXISTS idx_sop_version;',
    '[
        {
            "name": "check_table_exists",
            "sql": "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ''sop_documents'')",
            "expected": true,
            "critical": true
        }
    ]',
    '[
        {
            "name": "verify_columns_added",
            "sql": "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ''sop_documents'' AND column_name IN (''version_number'', ''version_notes'')",
            "expected": 2,
            "critical": true
        }
    ]',
    'low',
    5,
    false,
    false,
    (SELECT id FROM auth_users WHERE role = 'admin' LIMIT 1)
),
(
    'migrate_legacy_content',
    'Migrate legacy SOP content format to new bilingual structure',
    'data_transformation',
    'UPDATE sop_documents SET 
        content_th = COALESCE(content_th, content),
        title_th = COALESCE(title_th, title)
     WHERE content_th IS NULL OR title_th IS NULL;',
    'UPDATE sop_documents SET 
        content_th = NULL,
        title_th = NULL
     WHERE content_th = content AND title_th = title;',
    '[
        {
            "name": "check_missing_translations",
            "sql": "SELECT COUNT(*) FROM sop_documents WHERE content_th IS NULL OR title_th IS NULL",
            "expected": null,
            "critical": false
        }
    ]',
    '[
        {
            "name": "verify_all_have_translations",
            "sql": "SELECT COUNT(*) FROM sop_documents WHERE content_th IS NULL OR title_th IS NULL",
            "expected": 0,
            "critical": true
        }
    ]',
    'medium',
    10,
    true,
    false,
    (SELECT id FROM auth_users WHERE role = 'admin' LIMIT 1)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

ANALYZE sop_migration_templates;
ANALYZE sop_migration_executions;
ANALYZE sop_migration_validations;
ANALYZE sop_data_transformations;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_migration_templates IS 'Reusable migration templates for schema and data changes';
COMMENT ON TABLE sop_migration_executions IS 'Individual migration execution tracking with validation';
COMMENT ON TABLE sop_migration_validations IS 'Pre and post migration validation checks';
COMMENT ON TABLE sop_data_transformations IS 'Data transformation definitions for complex migrations';

COMMENT ON FUNCTION create_migration_execution IS 'Creates migration execution from template with dependency checking';
COMMENT ON FUNCTION execute_migration IS 'Executes migration with full validation and logging';
COMMENT ON FUNCTION rollback_migration IS 'Safely rolls back completed migration';
COMMENT ON FUNCTION get_migration_status_summary IS 'Returns migration status summary for restaurant';