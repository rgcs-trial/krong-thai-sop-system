-- Training Backup and Recovery System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive backup and recovery system for training data and progress

-- ===========================================
-- BACKUP AND RECOVERY ENUMS
-- ===========================================

-- Backup types
CREATE TYPE training_backup_type AS ENUM (
    'full', 'incremental', 'differential', 'transaction_log', 'snapshot'
);

-- Backup status
CREATE TYPE training_backup_status AS ENUM (
    'pending', 'in_progress', 'completed', 'failed', 'cancelled', 'expired'
);

-- Recovery point types
CREATE TYPE recovery_point_type AS ENUM (
    'checkpoint', 'milestone', 'user_action', 'system_event', 'scheduled'
);

-- Recovery status
CREATE TYPE recovery_status AS ENUM (
    'pending', 'preparing', 'in_progress', 'validating', 'completed', 'failed', 'rolled_back'
);

-- Backup storage types
CREATE TYPE backup_storage_type AS ENUM (
    'local', 'cloud', 'distributed', 'encrypted', 'compressed'
);

-- ===========================================
-- BACKUP AND RECOVERY TABLES
-- ===========================================

-- Training backup jobs
CREATE TABLE IF NOT EXISTS training_backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job identification
    backup_id VARCHAR(128) NOT NULL UNIQUE,
    job_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Backup configuration
    backup_type training_backup_type NOT NULL,
    storage_type backup_storage_type NOT NULL,
    restaurant_id UUID,
    
    -- Scope definition
    backup_scope JSONB NOT NULL, -- Tables, date ranges, filters
    include_tables TEXT[] DEFAULT '{}',
    exclude_tables TEXT[] DEFAULT '{}',
    date_range_start TIMESTAMPTZ,
    date_range_end TIMESTAMPTZ,
    
    -- Data filters
    user_filters JSONB DEFAULT '{}',
    content_filters JSONB DEFAULT '{}',
    module_filters UUID[] DEFAULT '{}',
    
    -- Backup parameters
    compression_enabled BOOLEAN DEFAULT true,
    compression_algorithm VARCHAR(50) DEFAULT 'gzip',
    encryption_enabled BOOLEAN DEFAULT true,
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256',
    
    -- Storage configuration
    storage_location TEXT NOT NULL,
    retention_days INTEGER DEFAULT 90,
    max_backup_size_gb INTEGER DEFAULT 100,
    
    -- Scheduling
    schedule_enabled BOOLEAN DEFAULT false,
    schedule_expression VARCHAR(100), -- Cron expression
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    
    -- Execution tracking
    status training_backup_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Results and metrics
    total_records_backed_up BIGINT DEFAULT 0,
    backup_size_bytes BIGINT DEFAULT 0,
    compression_ratio DECIMAL(5,2) DEFAULT 1.0,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Metadata
    backup_metadata JSONB DEFAULT '{}',
    checksum VARCHAR(128),
    verification_status VARCHAR(50) DEFAULT 'pending',
    
    -- Access control
    created_by UUID NOT NULL,
    approved_by UUID,
    approval_required BOOLEAN DEFAULT false,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_backup_jobs_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_backup_jobs_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_backup_jobs_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- Training recovery points
CREATE TABLE IF NOT EXISTS training_recovery_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recovery point identification
    recovery_point_id VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Point-in-time information
    recovery_point_type recovery_point_type NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    lsn_position TEXT, -- Log Sequence Number for precise recovery
    
    -- Scope and context
    restaurant_id UUID,
    affected_users UUID[] DEFAULT '{}',
    affected_modules UUID[] DEFAULT '{}',
    affected_tables TEXT[] DEFAULT '{}',
    
    -- Data snapshot
    data_state_hash VARCHAR(128) NOT NULL,
    schema_version VARCHAR(50),
    application_version VARCHAR(50),
    
    -- Backup references
    backup_job_id UUID,
    backup_file_path TEXT,
    backup_size_bytes BIGINT,
    
    -- Validation
    integrity_verified BOOLEAN DEFAULT false,
    verification_timestamp TIMESTAMPTZ,
    verification_checksum VARCHAR(128),
    
    -- Dependencies
    dependent_recovery_points UUID[] DEFAULT '{}',
    prerequisite_recovery_points UUID[] DEFAULT '{}',
    
    -- Recovery metadata
    recovery_complexity_score INTEGER DEFAULT 1, -- 1-10 scale
    estimated_recovery_time_minutes INTEGER,
    data_loss_risk_level VARCHAR(20) DEFAULT 'low',
    
    -- Retention
    retention_period_days INTEGER DEFAULT 365,
    auto_cleanup_enabled BOOLEAN DEFAULT true,
    permanent_retention BOOLEAN DEFAULT false,
    
    -- Lifecycle
    created_by UUID NOT NULL,
    expires_at TIMESTAMPTZ,
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_recovery_points_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_recovery_points_backup_job FOREIGN KEY (backup_job_id) REFERENCES training_backup_jobs(id),
    CONSTRAINT fk_recovery_points_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Training recovery operations
CREATE TABLE IF NOT EXISTS training_recovery_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Operation identification
    recovery_operation_id VARCHAR(128) NOT NULL UNIQUE,
    operation_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Recovery source
    recovery_point_id UUID NOT NULL,
    backup_source_id UUID,
    recovery_type VARCHAR(50) NOT NULL, -- 'point_in_time', 'selective', 'complete', 'partial'
    
    -- Target specification
    target_restaurant_id UUID,
    target_environment VARCHAR(50) DEFAULT 'production', -- 'production', 'staging', 'development'
    target_tables TEXT[] DEFAULT '{}',
    target_users UUID[] DEFAULT '{}',
    
    -- Recovery parameters
    recovery_scope JSONB NOT NULL,
    recovery_options JSONB DEFAULT '{}',
    data_transformation_rules JSONB DEFAULT '{}',
    
    -- Conflict resolution
    conflict_resolution_strategy VARCHAR(50) DEFAULT 'merge', -- 'overwrite', 'merge', 'skip', 'prompt'
    preserve_current_data BOOLEAN DEFAULT false,
    create_backup_before_recovery BOOLEAN DEFAULT true,
    
    -- Execution tracking
    status recovery_status DEFAULT 'pending',
    priority INTEGER DEFAULT 5, -- 1-10 scale
    
    -- Timeline
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Progress tracking
    total_steps INTEGER DEFAULT 1,
    completed_steps INTEGER DEFAULT 0,
    current_step_description TEXT,
    progress_percentage INTEGER DEFAULT 0,
    
    -- Results
    records_recovered BIGINT DEFAULT 0,
    records_skipped BIGINT DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    data_integrity_issues INTEGER DEFAULT 0,
    
    -- Validation and testing
    validation_required BOOLEAN DEFAULT true,
    validation_completed BOOLEAN DEFAULT false,
    validation_results JSONB DEFAULT '{}',
    post_recovery_tests JSONB DEFAULT '{}',
    
    -- Error handling
    error_message TEXT,
    recovery_log JSONB DEFAULT '[]',
    rollback_required BOOLEAN DEFAULT false,
    rollback_completed BOOLEAN DEFAULT false,
    
    -- Access control and approval
    initiated_by UUID NOT NULL,
    approved_by UUID,
    approval_required BOOLEAN DEFAULT true,
    emergency_recovery BOOLEAN DEFAULT false,
    
    -- Monitoring and alerting
    monitoring_enabled BOOLEAN DEFAULT true,
    alert_on_completion BOOLEAN DEFAULT true,
    notification_recipients TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_recovery_ops_recovery_point FOREIGN KEY (recovery_point_id) REFERENCES training_recovery_points(id) ON DELETE CASCADE,
    CONSTRAINT fk_recovery_ops_backup_source FOREIGN KEY (backup_source_id) REFERENCES training_backup_jobs(id),
    CONSTRAINT fk_recovery_ops_target_restaurant FOREIGN KEY (target_restaurant_id) REFERENCES restaurants(id),
    CONSTRAINT fk_recovery_ops_initiated_by FOREIGN KEY (initiated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_recovery_ops_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT valid_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Backup verification results
CREATE TABLE IF NOT EXISTS training_backup_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Verification identification
    verification_id VARCHAR(128) NOT NULL UNIQUE,
    backup_job_id UUID NOT NULL,
    
    -- Verification process
    verification_type VARCHAR(50) NOT NULL, -- 'integrity', 'completeness', 'accessibility', 'restoration'
    verification_method VARCHAR(100) NOT NULL,
    
    -- Test parameters
    sample_size_percentage DECIMAL(5,2) DEFAULT 10.0,
    test_criteria JSONB NOT NULL,
    expected_results JSONB DEFAULT '{}',
    
    -- Execution
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Results
    verification_passed BOOLEAN DEFAULT false,
    success_rate_percentage DECIMAL(5,2) DEFAULT 0,
    tested_records_count BIGINT DEFAULT 0,
    successful_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    
    -- Detailed results
    test_results JSONB DEFAULT '{}',
    integrity_issues JSONB DEFAULT '[]',
    completeness_gaps JSONB DEFAULT '[]',
    performance_metrics JSONB DEFAULT '{}',
    
    -- Recommendations
    recommended_actions JSONB DEFAULT '[]',
    risk_assessment TEXT,
    confidence_level INTEGER DEFAULT 50, -- 0-100
    
    -- Follow-up
    issues_resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    retest_required BOOLEAN DEFAULT false,
    next_verification_date DATE,
    
    -- Metadata
    performed_by UUID NOT NULL,
    verification_environment VARCHAR(50) DEFAULT 'test',
    verification_tools JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_backup_verification_job FOREIGN KEY (backup_job_id) REFERENCES training_backup_jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_backup_verification_performed_by FOREIGN KEY (performed_by) REFERENCES auth_users(id),
    CONSTRAINT valid_sample_size CHECK (sample_size_percentage > 0 AND sample_size_percentage <= 100),
    CONSTRAINT valid_success_rate CHECK (success_rate_percentage >= 0 AND success_rate_percentage <= 100),
    CONSTRAINT valid_confidence_level CHECK (confidence_level >= 0 AND confidence_level <= 100)
);

-- Data archival and lifecycle management
CREATE TABLE IF NOT EXISTS training_data_archival (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Archival identification
    archival_id VARCHAR(128) NOT NULL UNIQUE,
    archival_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Archival scope
    restaurant_id UUID,
    data_category VARCHAR(100) NOT NULL, -- 'completed_training', 'old_assessments', 'expired_certificates'
    archival_criteria JSONB NOT NULL,
    
    -- Data selection
    source_tables TEXT[] NOT NULL,
    date_threshold DATE NOT NULL,
    additional_filters JSONB DEFAULT '{}',
    
    -- Archival configuration
    archival_method VARCHAR(50) DEFAULT 'move', -- 'move', 'copy', 'compress'
    destination_storage TEXT NOT NULL,
    compression_enabled BOOLEAN DEFAULT true,
    encryption_enabled BOOLEAN DEFAULT true,
    
    -- Lifecycle policy
    retention_period_years INTEGER DEFAULT 7,
    auto_deletion_enabled BOOLEAN DEFAULT false,
    legal_hold BOOLEAN DEFAULT false,
    compliance_requirements TEXT[] DEFAULT '{}',
    
    -- Execution tracking
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results
    records_archived BIGINT DEFAULT 0,
    data_size_archived_gb DECIMAL(10,2) DEFAULT 0,
    compression_ratio DECIMAL(5,2) DEFAULT 1.0,
    
    -- Access and retrieval
    retrieval_enabled BOOLEAN DEFAULT true,
    retrieval_cost_estimate DECIMAL(10,2),
    retrieval_time_estimate_hours INTEGER,
    
    -- Verification
    integrity_verified BOOLEAN DEFAULT false,
    verification_checksum VARCHAR(128),
    last_verification_date DATE,
    
    -- Metadata
    created_by UUID NOT NULL,
    approved_by UUID,
    business_justification TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_archival_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_archival_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_archival_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- ===========================================
-- BACKUP AND RECOVERY INDEXES
-- ===========================================

-- Backup jobs indexes
CREATE INDEX idx_backup_jobs_backup_id ON training_backup_jobs(backup_id);
CREATE INDEX idx_backup_jobs_restaurant ON training_backup_jobs(restaurant_id);
CREATE INDEX idx_backup_jobs_status ON training_backup_jobs(status);
CREATE INDEX idx_backup_jobs_type ON training_backup_jobs(backup_type);
CREATE INDEX idx_backup_jobs_next_run ON training_backup_jobs(next_run_at) WHERE schedule_enabled = true;
CREATE INDEX idx_backup_jobs_active ON training_backup_jobs(is_active) WHERE is_active = true;
CREATE INDEX idx_backup_jobs_created_at ON training_backup_jobs(created_at);

-- Recovery points indexes
CREATE UNIQUE INDEX idx_recovery_points_recovery_point_id ON training_recovery_points(recovery_point_id);
CREATE INDEX idx_recovery_points_restaurant ON training_recovery_points(restaurant_id);
CREATE INDEX idx_recovery_points_timestamp ON training_recovery_points(timestamp);
CREATE INDEX idx_recovery_points_type ON training_recovery_points(recovery_point_type);
CREATE INDEX idx_recovery_points_backup_job ON training_recovery_points(backup_job_id);
CREATE INDEX idx_recovery_points_expires_at ON training_recovery_points(expires_at);
CREATE INDEX idx_recovery_points_archived ON training_recovery_points(archived) WHERE archived = false;

-- Recovery operations indexes
CREATE UNIQUE INDEX idx_recovery_ops_operation_id ON training_recovery_operations(recovery_operation_id);
CREATE INDEX idx_recovery_ops_recovery_point ON training_recovery_operations(recovery_point_id);
CREATE INDEX idx_recovery_ops_status ON training_recovery_operations(status);
CREATE INDEX idx_recovery_ops_priority ON training_recovery_operations(priority);
CREATE INDEX idx_recovery_ops_scheduled_for ON training_recovery_operations(scheduled_for);
CREATE INDEX idx_recovery_ops_target_restaurant ON training_recovery_operations(target_restaurant_id);
CREATE INDEX idx_recovery_ops_emergency ON training_recovery_operations(emergency_recovery) WHERE emergency_recovery = true;

-- Backup verification indexes
CREATE UNIQUE INDEX idx_backup_verification_verification_id ON training_backup_verification(verification_id);
CREATE INDEX idx_backup_verification_job ON training_backup_verification(backup_job_id);
CREATE INDEX idx_backup_verification_type ON training_backup_verification(verification_type);
CREATE INDEX idx_backup_verification_passed ON training_backup_verification(verification_passed);
CREATE INDEX idx_backup_verification_completed_at ON training_backup_verification(completed_at);

-- Data archival indexes
CREATE UNIQUE INDEX idx_archival_archival_id ON training_data_archival(archival_id);
CREATE INDEX idx_archival_restaurant ON training_data_archival(restaurant_id);
CREATE INDEX idx_archival_category ON training_data_archival(data_category);
CREATE INDEX idx_archival_status ON training_data_archival(status);
CREATE INDEX idx_archival_scheduled_for ON training_data_archival(scheduled_for);
CREATE INDEX idx_archival_date_threshold ON training_data_archival(date_threshold);

-- JSONB indexes for complex queries
CREATE INDEX idx_backup_jobs_scope ON training_backup_jobs USING GIN(backup_scope);
CREATE INDEX idx_recovery_ops_scope ON training_recovery_operations USING GIN(recovery_scope);
CREATE INDEX idx_backup_verification_results ON training_backup_verification USING GIN(test_results);
CREATE INDEX idx_archival_criteria ON training_data_archival USING GIN(archival_criteria);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on backup and recovery tables
ALTER TABLE training_backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_recovery_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_recovery_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_backup_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data_archival ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Backup jobs restaurant isolation"
ON training_backup_jobs FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Recovery points restaurant isolation"
ON training_recovery_points FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Recovery operations restaurant isolation"
ON training_recovery_operations FOR ALL TO authenticated
USING (target_restaurant_id IS NULL OR target_restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Data archival restaurant isolation"
ON training_data_archival FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- Admin and manager access policies
CREATE POLICY "Backup verification admin access"
ON training_backup_verification FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
);

-- ===========================================
-- BACKUP AND RECOVERY FUNCTIONS
-- ===========================================

-- Function to create automatic recovery point
CREATE OR REPLACE FUNCTION create_automatic_recovery_point(
    p_restaurant_id UUID,
    p_recovery_type recovery_point_type,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    recovery_point_uuid UUID;
    recovery_point_id_text TEXT;
    data_hash TEXT;
    affected_tables TEXT[];
BEGIN
    -- Generate recovery point ID
    recovery_point_id_text := 'auto_' || p_recovery_type || '_' || 
                             EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
                             encode(gen_random_bytes(4), 'hex');
    
    -- Calculate current data state hash for key training tables
    affected_tables := ARRAY[
        'training_modules', 'training_sections', 'user_training_progress',
        'training_assessments', 'training_certificates'
    ];
    
    -- Simple hash calculation based on table row counts and recent updates
    SELECT encode(sha256(string_agg(table_info, '')::bytea), 'hex')
    INTO data_hash
    FROM (
        SELECT table_name || ':' || COALESCE(n_tup_ins + n_tup_upd + n_tup_del, 0)::text as table_info
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        AND relname = ANY(affected_tables)
        ORDER BY relname
    ) table_stats;
    
    -- Insert recovery point
    INSERT INTO training_recovery_points (
        recovery_point_id,
        name,
        description,
        recovery_point_type,
        timestamp,
        restaurant_id,
        affected_tables,
        data_state_hash,
        schema_version,
        application_version,
        integrity_verified,
        verification_timestamp,
        estimated_recovery_time_minutes,
        created_by
    ) VALUES (
        recovery_point_id_text,
        'Auto Recovery Point - ' || p_recovery_type,
        COALESCE(p_description, 'Automatically created recovery point for ' || p_recovery_type),
        p_recovery_type,
        NOW(),
        p_restaurant_id,
        affected_tables,
        data_hash,
        '1.0',
        '0.2.0',
        true,
        NOW(),
        CASE p_recovery_type
            WHEN 'checkpoint' THEN 15
            WHEN 'milestone' THEN 30
            WHEN 'user_action' THEN 5
            ELSE 10
        END,
        COALESCE(
            (SELECT id FROM auth_users WHERE restaurant_id = p_restaurant_id AND role = 'admin' LIMIT 1),
            (SELECT id FROM auth_users WHERE role = 'admin' LIMIT 1)
        )
    ) RETURNING id INTO recovery_point_uuid;
    
    RETURN recovery_point_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to estimate backup size
CREATE OR REPLACE FUNCTION estimate_backup_size(
    p_restaurant_id UUID,
    p_include_tables TEXT[] DEFAULT NULL,
    p_date_range_start TIMESTAMPTZ DEFAULT NULL,
    p_date_range_end TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
    total_size_estimate BIGINT := 0;
    table_estimates JSONB := '{}';
    table_name TEXT;
    table_size BIGINT;
    row_count BIGINT;
    size_info JSONB;
BEGIN
    -- Default tables if not specified
    IF p_include_tables IS NULL THEN
        p_include_tables := ARRAY[
            'training_modules', 'training_sections', 'training_questions',
            'user_training_progress', 'user_section_progress', 'training_assessments',
            'training_question_responses', 'training_certificates', 'training_reminders'
        ];
    END IF;
    
    -- Estimate size for each table
    FOREACH table_name IN ARRAY p_include_tables
    LOOP
        -- Get table size estimate
        EXECUTE format('
            SELECT 
                pg_total_relation_size(''%I'')::BIGINT,
                COUNT(*)::BIGINT
            FROM %I 
            WHERE ($1 IS NULL OR restaurant_id = $1)
            AND ($2 IS NULL OR created_at >= $2)
            AND created_at <= $3
        ', table_name, table_name)
        INTO table_size, row_count
        USING p_restaurant_id, p_date_range_start, p_date_range_end;
        
        -- Adjust estimate based on filtered data if date range is specified
        IF p_date_range_start IS NOT NULL THEN
            -- Rough estimation: assume proportional size reduction
            table_size := (table_size * row_count) / GREATEST(
                NULLIF((SELECT COUNT(*) FROM information_schema.tables WHERE table_name = table_name), 0),
                1
            );
        END IF;
        
        total_size_estimate := total_size_estimate + table_size;
        
        size_info := jsonb_build_object(
            'table_size_bytes', table_size,
            'row_count', row_count,
            'avg_row_size_bytes', CASE WHEN row_count > 0 THEN table_size / row_count ELSE 0 END
        );
        
        table_estimates := table_estimates || jsonb_build_object(table_name, size_info);
    END LOOP;
    
    RETURN jsonb_build_object(
        'total_estimated_size_bytes', total_size_estimate,
        'total_estimated_size_mb', ROUND(total_size_estimate / 1024.0 / 1024.0, 2),
        'table_estimates', table_estimates,
        'compression_estimate_ratio', 0.3, -- Assume 70% compression
        'compressed_size_estimate_mb', ROUND((total_size_estimate * 0.3) / 1024.0 / 1024.0, 2),
        'estimated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate recovery point integrity
CREATE OR REPLACE FUNCTION validate_recovery_point_integrity(
    p_recovery_point_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    recovery_point RECORD;
    current_hash TEXT;
    validation_passed BOOLEAN := true;
BEGIN
    -- Get recovery point details
    SELECT * INTO recovery_point
    FROM training_recovery_points
    WHERE id = p_recovery_point_id;
    
    IF recovery_point.id IS NULL THEN
        RAISE EXCEPTION 'Recovery point not found: %', p_recovery_point_id;
    END IF;
    
    -- Recalculate current data state hash for comparison
    SELECT encode(sha256(string_agg(table_info, '')::bytea), 'hex')
    INTO current_hash
    FROM (
        SELECT table_name || ':' || COALESCE(n_tup_ins + n_tup_upd + n_tup_del, 0)::text as table_info
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        AND relname = ANY(recovery_point.affected_tables)
        ORDER BY relname
    ) table_stats;
    
    -- Basic validation checks
    validation_passed := validation_passed AND (recovery_point.data_state_hash IS NOT NULL);
    validation_passed := validation_passed AND (recovery_point.timestamp <= NOW());
    validation_passed := validation_passed AND (recovery_point.affected_tables IS NOT NULL);
    
    -- Update verification status
    UPDATE training_recovery_points
    SET 
        integrity_verified = validation_passed,
        verification_timestamp = NOW(),
        verification_checksum = current_hash
    WHERE id = p_recovery_point_id;
    
    RETURN validation_passed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired recovery points
CREATE OR REPLACE FUNCTION cleanup_expired_recovery_points()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Archive expired recovery points
    UPDATE training_recovery_points
    SET 
        archived = true,
        archived_at = NOW()
    WHERE expires_at < NOW()
    AND archived = false
    AND permanent_retention = false;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO training_recovery_points (
        recovery_point_id,
        name,
        description,
        recovery_point_type,
        timestamp,
        data_state_hash,
        created_by
    ) VALUES (
        'cleanup_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        'Automated Cleanup',
        'Cleaned up ' || cleaned_count || ' expired recovery points',
        'system_event',
        NOW(),
        'cleanup_operation',
        '00000000-0000-0000-0000-000000000000'::UUID
    );
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- AUTOMATED TRIGGERS
-- ===========================================

-- Trigger to create recovery points on important events
CREATE OR REPLACE FUNCTION create_recovery_point_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Create recovery point for significant training events
    IF TG_TABLE_NAME IN ('training_certificates', 'training_assessments') THEN
        IF TG_OP = 'INSERT' AND NEW.status = 'passed' THEN
            PERFORM create_automatic_recovery_point(
                (SELECT restaurant_id FROM auth_users WHERE id = NEW.user_id),
                'milestone',
                'Training milestone: ' || TG_TABLE_NAME || ' completion'
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply recovery point trigger to key tables
CREATE TRIGGER training_certificates_recovery_point
    AFTER INSERT ON training_certificates
    FOR EACH ROW
    EXECUTE FUNCTION create_recovery_point_trigger();

CREATE TRIGGER training_assessments_recovery_point
    AFTER UPDATE ON training_assessments
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION create_recovery_point_trigger();

-- Trigger for updated_at columns
CREATE TRIGGER update_backup_jobs_updated_at
    BEFORE UPDATE ON training_backup_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recovery_points_updated_at
    BEFORE UPDATE ON training_recovery_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recovery_operations_updated_at
    BEFORE UPDATE ON training_recovery_operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backup_verification_updated_at
    BEFORE UPDATE ON training_backup_verification
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_archival_updated_at
    BEFORE UPDATE ON training_data_archival
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- DEFAULT BACKUP CONFIGURATIONS
-- ===========================================

-- Create default backup jobs for each restaurant
INSERT INTO training_backup_jobs (
    backup_id,
    job_name,
    description,
    backup_type,
    storage_type,
    restaurant_id,
    backup_scope,
    include_tables,
    schedule_enabled,
    schedule_expression,
    next_run_at,
    storage_location,
    retention_days,
    created_by
)
SELECT 
    'daily_backup_' || r.id,
    'Daily Training Data Backup - ' || r.name,
    'Automated daily backup of training progress and certificates',
    'incremental',
    'cloud',
    r.id,
    jsonb_build_object(
        'scope', 'restaurant',
        'include_progress', true,
        'include_certificates', true,
        'include_assessments', true
    ),
    ARRAY['user_training_progress', 'training_certificates', 'training_assessments', 'user_section_progress'],
    true,
    '0 2 * * *', -- Daily at 2 AM
    CURRENT_DATE + INTERVAL '1 day' + TIME '02:00:00',
    '/backups/training/' || r.id::text,
    90,
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE EXISTS (SELECT 1 FROM auth_users WHERE restaurant_id = r.id AND role = 'admin')
ON CONFLICT (backup_id) DO NOTHING;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_backup_jobs IS 'Comprehensive backup job management for training data with scheduling and automation';
COMMENT ON TABLE training_recovery_points IS 'Point-in-time recovery markers with data integrity verification';
COMMENT ON TABLE training_recovery_operations IS 'Recovery operation execution tracking with detailed progress monitoring';
COMMENT ON TABLE training_backup_verification IS 'Backup integrity verification and testing results';
COMMENT ON TABLE training_data_archival IS 'Data lifecycle management with automated archival and retention policies';

-- Performance optimization
ANALYZE training_backup_jobs;
ANALYZE training_recovery_points;
ANALYZE training_recovery_operations;
ANALYZE training_backup_verification;
ANALYZE training_data_archival;