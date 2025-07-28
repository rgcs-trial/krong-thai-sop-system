-- SOP Data Validation Rules and Constraints
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive data validation with custom rules and automated constraint checking

-- ===========================================
-- DATA VALIDATION ENUMS
-- ===========================================

-- Validation rule type enum
CREATE TYPE validation_rule_type AS ENUM (
    'required_field', 'format_check', 'length_limit', 'range_check',
    'unique_constraint', 'foreign_key_check', 'custom_logic',
    'business_rule', 'cross_field_validation', 'conditional_rule'
);

-- Validation severity enum
CREATE TYPE validation_severity AS ENUM ('info', 'warning', 'error', 'critical');

-- Validation status enum
CREATE TYPE validation_status AS ENUM ('active', 'inactive', 'testing', 'deprecated');

-- Data quality level enum
CREATE TYPE data_quality_level AS ENUM ('excellent', 'good', 'fair', 'poor', 'critical');

-- ===========================================
-- DATA VALIDATION TABLES
-- ===========================================

-- Validation rules definition table
CREATE TABLE IF NOT EXISTS sop_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Rule identification
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    rule_type validation_rule_type NOT NULL,
    severity validation_severity DEFAULT 'error',
    
    -- Target scope
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255),
    applies_to_operations VARCHAR(50)[] DEFAULT '{"INSERT", "UPDATE"}',
    
    -- Validation logic
    validation_sql TEXT NOT NULL, -- SQL that returns TRUE if valid, FALSE if invalid
    error_message_template TEXT NOT NULL,
    error_code VARCHAR(50),
    
    -- Conditions and parameters
    rule_parameters JSONB DEFAULT '{}',
    conditional_logic TEXT, -- When this rule should apply
    depends_on_rules UUID[] DEFAULT '{}', -- Other rules this depends on
    
    -- Execution settings
    execution_order INTEGER DEFAULT 100,
    is_blocking BOOLEAN DEFAULT true, -- Whether violations prevent the operation
    auto_fix_sql TEXT, -- Optional SQL to automatically fix violations
    
    -- Status and metadata
    status validation_status DEFAULT 'active',
    category VARCHAR(100), -- 'data_integrity', 'business_logic', 'format', 'security'
    tags VARCHAR(255)[] DEFAULT '{}',
    
    -- Performance
    timeout_seconds INTEGER DEFAULT 30,
    max_violations_to_report INTEGER DEFAULT 100,
    
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_validation_rule_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_validation_rule_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_validation_rule_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT unique_rule_name_restaurant UNIQUE (restaurant_id, rule_name)
);

-- Validation execution history
CREATE TABLE IF NOT EXISTS sop_validation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Execution context
    operation_type VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'BULK_CHECK'
    target_table VARCHAR(255) NOT NULL,
    target_record_id UUID,
    batch_id UUID, -- For batch validations
    
    -- Execution details
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    execution_duration_ms INTEGER,
    validation_passed BOOLEAN NOT NULL,
    
    -- Results
    violations_found INTEGER DEFAULT 0,
    violations_fixed INTEGER DEFAULT 0,
    validation_result JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    
    -- Context data
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    session_id TEXT,
    
    CONSTRAINT fk_validation_execution_rule FOREIGN KEY (rule_id) REFERENCES sop_validation_rules(id) ON DELETE CASCADE,
    CONSTRAINT fk_validation_execution_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_validation_execution_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- Data quality scores and metrics
CREATE TABLE IF NOT EXISTS sop_data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Scope
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255),
    
    -- Quality metrics
    total_records BIGINT DEFAULT 0,
    valid_records BIGINT DEFAULT 0,
    invalid_records BIGINT DEFAULT 0,
    null_records BIGINT DEFAULT 0,
    duplicate_records BIGINT DEFAULT 0,
    
    -- Calculated scores (0-100)
    completeness_score DECIMAL(5,2) DEFAULT 0, -- % of non-null values
    validity_score DECIMAL(5,2) DEFAULT 0, -- % of valid values
    uniqueness_score DECIMAL(5,2) DEFAULT 0, -- % of unique values
    consistency_score DECIMAL(5,2) DEFAULT 0, -- % consistent with rules
    overall_quality_score DECIMAL(5,2) DEFAULT 0,
    
    -- Quality level
    quality_level data_quality_level,
    
    -- Violation summary
    critical_violations INTEGER DEFAULT 0,
    error_violations INTEGER DEFAULT 0,
    warning_violations INTEGER DEFAULT 0,
    info_violations INTEGER DEFAULT 0,
    
    -- Trends
    score_trend DECIMAL(5,2) DEFAULT 0, -- Change from previous measurement
    trend_direction VARCHAR(10), -- 'improving', 'declining', 'stable'
    
    -- Measurement details
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    measurement_duration_ms INTEGER,
    
    CONSTRAINT fk_quality_metrics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Validation violation tracking
CREATE TABLE IF NOT EXISTS sop_validation_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL,
    rule_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Violation details
    violation_description TEXT NOT NULL,
    severity validation_severity NOT NULL,
    error_code VARCHAR(50),
    
    -- Location
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255),
    record_id UUID,
    field_value TEXT,
    
    -- Context
    violation_data JSONB DEFAULT '{}',
    suggested_fix TEXT,
    auto_fixable BOOLEAN DEFAULT false,
    
    -- Resolution
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'fixed', 'ignored', 'false_positive'
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_notes TEXT,
    
    -- Fix tracking
    fix_applied BOOLEAN DEFAULT false,
    fix_sql_executed TEXT,
    fix_applied_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_violation_execution FOREIGN KEY (execution_id) REFERENCES sop_validation_executions(id) ON DELETE CASCADE,
    CONSTRAINT fk_violation_rule FOREIGN KEY (rule_id) REFERENCES sop_validation_rules(id) ON DELETE CASCADE,
    CONSTRAINT fk_violation_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_violation_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_users(id)
);

-- ===========================================
-- DATA VALIDATION INDEXES
-- ===========================================

-- Validation rules indexes
CREATE INDEX idx_validation_rules_restaurant ON sop_validation_rules(restaurant_id);
CREATE INDEX idx_validation_rules_table ON sop_validation_rules(table_name);
CREATE INDEX idx_validation_rules_status ON sop_validation_rules(status);
CREATE INDEX idx_validation_rules_type ON sop_validation_rules(rule_type);
CREATE INDEX idx_validation_rules_execution_order ON sop_validation_rules(execution_order, created_at);

-- Validation executions indexes
CREATE INDEX idx_validation_executions_rule ON sop_validation_executions(rule_id);
CREATE INDEX idx_validation_executions_restaurant ON sop_validation_executions(restaurant_id);
CREATE INDEX idx_validation_executions_executed_at ON sop_validation_executions(executed_at);
CREATE INDEX idx_validation_executions_operation ON sop_validation_executions(operation_type, target_table);
CREATE INDEX idx_validation_executions_batch ON sop_validation_executions(batch_id) WHERE batch_id IS NOT NULL;

-- Data quality metrics indexes
CREATE INDEX idx_quality_metrics_restaurant ON sop_data_quality_metrics(restaurant_id);
CREATE INDEX idx_quality_metrics_table ON sop_data_quality_metrics(table_name);
CREATE INDEX idx_quality_metrics_measured_at ON sop_data_quality_metrics(measured_at);
CREATE INDEX idx_quality_metrics_score ON sop_data_quality_metrics(overall_quality_score);

-- Validation violations indexes
CREATE INDEX idx_violations_execution ON sop_validation_violations(execution_id);
CREATE INDEX idx_violations_rule ON sop_validation_violations(rule_id);
CREATE INDEX idx_violations_restaurant ON sop_validation_violations(restaurant_id);
CREATE INDEX idx_violations_status ON sop_validation_violations(status);
CREATE INDEX idx_violations_severity ON sop_validation_violations(severity);
CREATE INDEX idx_violations_table_record ON sop_validation_violations(table_name, record_id);

-- ===========================================
-- DATA VALIDATION FUNCTIONS
-- ===========================================

-- Function to create validation rule
CREATE OR REPLACE FUNCTION create_validation_rule(
    p_restaurant_id UUID,
    p_rule_name VARCHAR(255),
    p_rule_type validation_rule_type,
    p_table_name VARCHAR(255),
    p_validation_sql TEXT,
    p_error_message_template TEXT,
    p_severity validation_severity DEFAULT 'error',
    p_created_by UUID,
    p_column_name VARCHAR(255) DEFAULT NULL,
    p_rule_parameters JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rule_id UUID;
BEGIN
    -- Validate the validation SQL by testing it
    BEGIN
        EXECUTE 'SELECT (' || p_validation_sql || ') as result LIMIT 1';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid validation SQL: %', SQLERRM;
    END;
    
    -- Insert validation rule
    INSERT INTO sop_validation_rules (
        restaurant_id, rule_name, rule_type, table_name, column_name,
        validation_sql, error_message_template, severity, rule_parameters, created_by
    ) VALUES (
        p_restaurant_id, p_rule_name, p_rule_type, p_table_name, p_column_name,
        p_validation_sql, p_error_message_template, p_severity, p_rule_parameters, p_created_by
    ) RETURNING id INTO rule_id;
    
    -- Log rule creation
    INSERT INTO audit_logs (
        restaurant_id, action, resource_type, resource_id, user_id, metadata
    ) VALUES (
        p_restaurant_id, 'CREATE'::audit_action, 'validation_rule', rule_id, p_created_by,
        jsonb_build_object(
            'rule_name', p_rule_name,
            'rule_type', p_rule_type,
            'table_name', p_table_name,
            'severity', p_severity
        )
    );
    
    RETURN rule_id;
END;
$$;

-- Function to execute validation rules
CREATE OR REPLACE FUNCTION execute_validation_rules(
    p_restaurant_id UUID,
    p_table_name VARCHAR(255),
    p_operation_type VARCHAR(50),
    p_record_id UUID DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    rule_id UUID,
    rule_name VARCHAR(255),
    validation_passed BOOLEAN,
    violations_found INTEGER,
    execution_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rule_record RECORD;
    execution_id UUID;
    validation_result BOOLEAN;
    violation_count INTEGER := 0;
    start_time TIMESTAMPTZ := NOW();
    execution_time INTEGER;
    violation_id UUID;
BEGIN
    -- Execute all applicable validation rules
    FOR rule_record IN 
        SELECT * FROM sop_validation_rules
        WHERE (restaurant_id = p_restaurant_id OR restaurant_id IS NULL)
        AND table_name = p_table_name
        AND p_operation_type = ANY(applies_to_operations)
        AND status = 'active'
        ORDER BY execution_order, created_at
    LOOP
        validation_result := true;
        violation_count := 0;
        
        BEGIN
            -- Create execution record
            INSERT INTO sop_validation_executions (
                rule_id, restaurant_id, operation_type, target_table,
                target_record_id, old_values, new_values, user_id
            ) VALUES (
                rule_record.id, p_restaurant_id, p_operation_type, p_table_name,
                p_record_id, p_old_values, p_new_values, p_user_id
            ) RETURNING id INTO execution_id;
            
            -- Execute validation SQL with timeout protection
            EXECUTE format('SELECT (%s) as validation_result', rule_record.validation_sql) 
            INTO validation_result;
            
            -- If validation failed, create violation record
            IF NOT validation_result THEN
                violation_count := 1;
                
                INSERT INTO sop_validation_violations (
                    execution_id, rule_id, restaurant_id, violation_description,
                    severity, error_code, table_name, column_name, record_id,
                    field_value, suggested_fix, auto_fixable
                ) VALUES (
                    execution_id, rule_record.id, p_restaurant_id,
                    rule_record.error_message_template, rule_record.severity,
                    rule_record.error_code, p_table_name, rule_record.column_name,
                    p_record_id, 
                    CASE WHEN p_new_values IS NOT NULL THEN p_new_values->>rule_record.column_name ELSE NULL END,
                    'Review and correct the data according to business rules',
                    rule_record.auto_fix_sql IS NOT NULL
                ) RETURNING id INTO violation_id;
                
                -- Attempt auto-fix if available and appropriate
                IF rule_record.auto_fix_sql IS NOT NULL AND rule_record.severity != 'critical' THEN
                    BEGIN
                        EXECUTE rule_record.auto_fix_sql;
                        
                        UPDATE sop_validation_violations 
                        SET fix_applied = true, fix_sql_executed = rule_record.auto_fix_sql,
                            fix_applied_at = NOW(), status = 'fixed'
                        WHERE id = violation_id;
                        
                        violation_count := 0; -- Fix applied successfully
                        validation_result := true;
                    EXCEPTION WHEN OTHERS THEN
                        -- Auto-fix failed, keep violation
                        UPDATE sop_validation_violations 
                        SET resolution_notes = 'Auto-fix failed: ' || SQLERRM
                        WHERE id = violation_id;
                    END;
                END IF;
            END IF;
            
            execution_time := EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER * 1000;
            
            -- Update execution record
            UPDATE sop_validation_executions 
            SET 
                execution_duration_ms = execution_time,
                validation_passed = validation_result,
                violations_found = violation_count,
                validation_result = jsonb_build_object(
                    'passed', validation_result,
                    'violations', violation_count,
                    'auto_fixed', CASE WHEN violation_count = 0 AND violation_id IS NOT NULL THEN true ELSE false END
                )
            WHERE id = execution_id;
            
        EXCEPTION WHEN OTHERS THEN
            validation_result := false;
            violation_count := 1;
            
            -- Update execution with error
            UPDATE sop_validation_executions 
            SET 
                execution_duration_ms = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER * 1000,
                validation_passed = false,
                violations_found = 1,
                error_details = jsonb_build_object(
                    'error_code', SQLSTATE,
                    'error_message', SQLERRM,
                    'rule_sql', rule_record.validation_sql
                )
            WHERE id = execution_id;
            
            -- Create violation for execution error
            INSERT INTO sop_validation_violations (
                execution_id, rule_id, restaurant_id, violation_description,
                severity, table_name, record_id, violation_data
            ) VALUES (
                execution_id, rule_record.id, p_restaurant_id,
                'Validation rule execution failed: ' || SQLERRM,
                'error', p_table_name, p_record_id,
                jsonb_build_object('error_code', SQLSTATE, 'error_message', SQLERRM)
            );
        END;
        
        -- Return result for this rule
        RETURN QUERY SELECT 
            rule_record.id, rule_record.rule_name, validation_result, violation_count, execution_id;
    END LOOP;
END;
$$;

-- Function to calculate data quality metrics
CREATE OR REPLACE FUNCTION calculate_data_quality_metrics(
    p_restaurant_id UUID,
    p_table_name VARCHAR(255),
    p_column_name VARCHAR(255) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    metric_id UUID;
    total_count BIGINT;
    valid_count BIGINT;
    null_count BIGINT;
    duplicate_count BIGINT;
    completeness DECIMAL(5,2);
    validity DECIMAL(5,2);
    uniqueness DECIMAL(5,2);
    overall_score DECIMAL(5,2);
    quality_level data_quality_level;
    start_time TIMESTAMPTZ := NOW();
    measurement_time INTEGER;
BEGIN
    -- Get basic counts
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE restaurant_id = $1', p_table_name) 
    INTO total_count USING p_restaurant_id;
    
    IF p_column_name IS NOT NULL THEN
        -- Column-specific metrics
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE restaurant_id = $1 AND %I IS NOT NULL', 
                      p_table_name, p_column_name) 
        INTO valid_count USING p_restaurant_id;
        
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE restaurant_id = $1 AND %I IS NULL', 
                      p_table_name, p_column_name) 
        INTO null_count USING p_restaurant_id;
        
        EXECUTE format('SELECT COUNT(*) - COUNT(DISTINCT %I) FROM %I WHERE restaurant_id = $1 AND %I IS NOT NULL', 
                      p_column_name, p_table_name, p_column_name) 
        INTO duplicate_count USING p_restaurant_id;
    ELSE
        -- Table-level metrics
        valid_count := total_count; -- Assume valid for table-level
        null_count := 0;
        duplicate_count := 0;
    END IF;
    
    -- Calculate scores
    IF total_count > 0 THEN
        completeness := ((total_count - null_count)::DECIMAL / total_count * 100);
        validity := (valid_count::DECIMAL / total_count * 100);
        uniqueness := ((total_count - duplicate_count)::DECIMAL / total_count * 100);
        overall_score := (completeness + validity + uniqueness) / 3;
    ELSE
        completeness := 0;
        validity := 0;
        uniqueness := 0;
        overall_score := 0;
    END IF;
    
    -- Determine quality level
    CASE 
        WHEN overall_score >= 95 THEN quality_level := 'excellent';
        WHEN overall_score >= 85 THEN quality_level := 'good';
        WHEN overall_score >= 70 THEN quality_level := 'fair';
        WHEN overall_score >= 50 THEN quality_level := 'poor';
        ELSE quality_level := 'critical';
    END CASE;
    
    measurement_time := EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER * 1000;
    
    -- Insert metrics
    INSERT INTO sop_data_quality_metrics (
        restaurant_id, table_name, column_name, total_records, valid_records,
        invalid_records, null_records, duplicate_records, completeness_score,
        validity_score, uniqueness_score, overall_quality_score, quality_level,
        measurement_duration_ms
    ) VALUES (
        p_restaurant_id, p_table_name, p_column_name, total_count, valid_count,
        (total_count - valid_count), null_count, duplicate_count, completeness,
        validity, uniqueness, overall_score, quality_level, measurement_time
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;

-- Function to get validation summary
CREATE OR REPLACE FUNCTION get_validation_summary(
    p_restaurant_id UUID,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_validations INTEGER,
    passed_validations INTEGER,
    failed_validations INTEGER,
    critical_violations INTEGER,
    error_violations INTEGER,
    warning_violations INTEGER,
    auto_fixes_applied INTEGER,
    avg_data_quality_score DECIMAL(5,2),
    trending_direction TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    cutoff_time TIMESTAMPTZ := NOW() - (p_hours_back || ' hours')::INTERVAL;
BEGIN
    RETURN QUERY
    WITH validation_stats AS (
        SELECT 
            COUNT(*) as total_vals,
            COUNT(*) FILTER (WHERE validation_passed = true) as passed_vals,
            COUNT(*) FILTER (WHERE validation_passed = false) as failed_vals
        FROM sop_validation_executions
        WHERE restaurant_id = p_restaurant_id AND executed_at > cutoff_time
    ),
    violation_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE severity = 'critical') as critical_viols,
            COUNT(*) FILTER (WHERE severity = 'error') as error_viols,
            COUNT(*) FILTER (WHERE severity = 'warning') as warning_viols,
            COUNT(*) FILTER (WHERE fix_applied = true) as auto_fixes
        FROM sop_validation_violations v
        JOIN sop_validation_executions e ON v.execution_id = e.id
        WHERE v.restaurant_id = p_restaurant_id AND e.executed_at > cutoff_time
    ),
    quality_stats AS (
        SELECT 
            AVG(overall_quality_score) as avg_quality,
            CASE 
                WHEN AVG(score_trend) > 1 THEN 'improving'
                WHEN AVG(score_trend) < -1 THEN 'declining'
                ELSE 'stable'
            END as trend_dir
        FROM sop_data_quality_metrics
        WHERE restaurant_id = p_restaurant_id AND measured_at > cutoff_time
    )
    SELECT 
        COALESCE(vs.total_vals, 0)::INTEGER,
        COALESCE(vs.passed_vals, 0)::INTEGER,
        COALESCE(vs.failed_vals, 0)::INTEGER,
        COALESCE(vios.critical_viols, 0)::INTEGER,
        COALESCE(vios.error_viols, 0)::INTEGER,
        COALESCE(vios.warning_viols, 0)::INTEGER,
        COALESCE(vios.auto_fixes, 0)::INTEGER,
        COALESCE(qs.avg_quality, 0)::DECIMAL(5,2),
        COALESCE(qs.trend_dir, 'stable')::TEXT
    FROM validation_stats vs
    CROSS JOIN violation_stats vios
    CROSS JOIN quality_stats qs;
END;
$$;

-- Function to fix violations automatically
CREATE OR REPLACE FUNCTION fix_violations_automatically(
    p_restaurant_id UUID,
    p_severity validation_severity[] DEFAULT ARRAY['warning', 'error']
)
RETURNS TABLE (
    violation_id UUID,
    fix_applied BOOLEAN,
    fix_result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    violation_record RECORD;
    fix_successful BOOLEAN;
    fix_message TEXT;
BEGIN
    FOR violation_record IN 
        SELECT v.*, r.auto_fix_sql
        FROM sop_validation_violations v
        JOIN sop_validation_rules r ON v.rule_id = r.id
        WHERE v.restaurant_id = p_restaurant_id
        AND v.status = 'open'
        AND v.severity = ANY(p_severity)
        AND v.auto_fixable = true
        AND r.auto_fix_sql IS NOT NULL
        ORDER BY v.severity DESC, v.created_at
    LOOP
        fix_successful := false;
        fix_message := 'Fix attempted';
        
        BEGIN
            -- Execute auto-fix SQL
            EXECUTE violation_record.auto_fix_sql;
            
            -- Update violation as fixed
            UPDATE sop_validation_violations 
            SET 
                fix_applied = true,
                fix_sql_executed = violation_record.auto_fix_sql,
                fix_applied_at = NOW(),
                status = 'fixed',
                resolution_notes = 'Automatically fixed by system'
            WHERE id = violation_record.id;
            
            fix_successful := true;
            fix_message := 'Successfully applied automatic fix';
            
        EXCEPTION WHEN OTHERS THEN
            fix_successful := false;
            fix_message := 'Auto-fix failed: ' || SQLERRM;
            
            -- Update violation with error details
            UPDATE sop_validation_violations 
            SET resolution_notes = fix_message
            WHERE id = violation_record.id;
        END;
        
        RETURN QUERY SELECT violation_record.id, fix_successful, fix_message;
    END LOOP;
END;
$$;

-- ===========================================
-- TRIGGERS FOR DATA VALIDATION
-- ===========================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_validation_rules_updated_at 
    BEFORE UPDATE ON sop_validation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on validation tables
ALTER TABLE sop_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_validation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_data_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_validation_violations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Validation rules restaurant isolation"
ON sop_validation_rules FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Validation executions restaurant isolation"
ON sop_validation_executions FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Data quality metrics restaurant isolation"
ON sop_data_quality_metrics FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Validation violations restaurant isolation"
ON sop_validation_violations FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION create_validation_rule TO authenticated;
GRANT EXECUTE ON FUNCTION execute_validation_rules TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_data_quality_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_validation_summary TO authenticated;
GRANT EXECUTE ON FUNCTION fix_violations_automatically TO authenticated;

-- ===========================================
-- DEFAULT VALIDATION RULES
-- ===========================================

-- Insert default validation rules for SOP documents
DO $$
DECLARE
    restaurant_record RECORD;
    admin_user_id UUID;
BEGIN
    FOR restaurant_record IN SELECT id FROM restaurants LOOP
        -- Get admin user for this restaurant
        SELECT id INTO admin_user_id 
        FROM auth_users 
        WHERE restaurant_id = restaurant_record.id AND role = 'admin' 
        LIMIT 1;
        
        IF admin_user_id IS NOT NULL THEN
            -- SOP Title validation
            PERFORM create_validation_rule(
                restaurant_record.id,
                'SOP Title Required',
                'required_field',
                'sop_documents',
                'title IS NOT NULL AND LENGTH(TRIM(title)) > 0',
                'SOP title is required and cannot be empty',
                'error',
                admin_user_id,
                'title'
            );
            
            -- SOP Content validation
            PERFORM create_validation_rule(
                restaurant_record.id,
                'SOP Content Required',
                'required_field',
                'sop_documents',
                'content IS NOT NULL AND LENGTH(TRIM(content)) >= 50',
                'SOP content is required and must be at least 50 characters',
                'error',
                admin_user_id,
                'content'
            );
            
            -- SOP Title Length Check
            PERFORM create_validation_rule(
                restaurant_record.id,
                'SOP Title Length Limit',
                'length_limit',
                'sop_documents',
                'LENGTH(title) <= 255',
                'SOP title cannot exceed 255 characters',
                'error',
                admin_user_id,
                'title'
            );
            
            -- SOP Effective Date Logic
            PERFORM create_validation_rule(
                restaurant_record.id,
                'SOP Effective Date Valid',
                'business_rule',
                'sop_documents',
                'effective_date IS NULL OR effective_date <= CURRENT_DATE + INTERVAL ''1 year''',
                'SOP effective date cannot be more than 1 year in the future',
                'warning',
                admin_user_id,
                'effective_date'
            );
            
            -- SOP Expiry Date Logic
            PERFORM create_validation_rule(
                restaurant_record.id,
                'SOP Expiry After Effective',
                'cross_field_validation',
                'sop_documents',
                'expiry_date IS NULL OR effective_date IS NULL OR expiry_date > effective_date',
                'SOP expiry date must be after effective date',
                'error',
                admin_user_id,
                'expiry_date'
            );
        END IF;
    END LOOP;
END $$;

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

ANALYZE sop_validation_rules;
ANALYZE sop_validation_executions;
ANALYZE sop_data_quality_metrics;
ANALYZE sop_validation_violations;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_validation_rules IS 'Configurable validation rules for data integrity and business logic';
COMMENT ON TABLE sop_validation_executions IS 'Execution history and results of validation rule checks';
COMMENT ON TABLE sop_data_quality_metrics IS 'Data quality scores and metrics for continuous monitoring';
COMMENT ON TABLE sop_validation_violations IS 'Detailed tracking of data validation violations and resolutions';

COMMENT ON FUNCTION create_validation_rule IS 'Creates new validation rule with SQL syntax validation';
COMMENT ON FUNCTION execute_validation_rules IS 'Executes applicable validation rules for data operations';
COMMENT ON FUNCTION calculate_data_quality_metrics IS 'Calculates comprehensive data quality metrics';
COMMENT ON FUNCTION get_validation_summary IS 'Returns validation summary and trends for dashboard';
COMMENT ON FUNCTION fix_violations_automatically IS 'Applies automatic fixes to qualifying violations';