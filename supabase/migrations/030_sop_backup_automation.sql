-- SOP Backup Automation with Point-in-Time Recovery
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Comprehensive backup system with automated scheduling and point-in-time recovery

-- ===========================================
-- BACKUP SYSTEM ENUMS
-- ===========================================

-- Backup type enum
CREATE TYPE backup_type AS ENUM (
    'full', 'incremental', 'differential', 'schema_only', 'data_only', 'point_in_time'
);

-- Backup status enum
CREATE TYPE backup_status AS ENUM (
    'scheduled', 'running', 'completed', 'failed', 'cancelled', 'expired', 'corrupted'
);

-- Recovery type enum
CREATE TYPE recovery_type AS ENUM (
    'full_restore', 'partial_restore', 'point_in_time_restore', 'schema_restore', 'data_restore'
);

-- ===========================================
-- BACKUP SYSTEM TABLES
-- ===========================================

-- Backup configurations table
CREATE TABLE IF NOT EXISTS sop_backup_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    config_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Backup settings
    backup_type backup_type NOT NULL DEFAULT 'incremental',
    schedule_cron VARCHAR(100), -- Cron expression for scheduling
    retention_days INTEGER DEFAULT 30,
    compression_enabled BOOLEAN DEFAULT true,
    encryption_enabled BOOLEAN DEFAULT true,
    
    -- Backup scope
    include_schema BOOLEAN DEFAULT true,
    include_data BOOLEAN DEFAULT true,
    include_indexes BOOLEAN DEFAULT true,
    include_functions BOOLEAN DEFAULT true,
    table_filters JSONB DEFAULT '{}', -- Include/exclude specific tables
    
    -- Storage settings
    storage_location TEXT, -- S3 bucket, local path, etc.
    storage_config JSONB DEFAULT '{}', -- Connection details, credentials, etc.
    max_backup_size_mb INTEGER DEFAULT 1000,
    
    -- Notification settings
    notify_on_success BOOLEAN DEFAULT false,
    notify_on_failure BOOLEAN DEFAULT true,
    notification_emails TEXT[] DEFAULT '{}',
    slack_webhook_url TEXT,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    last_backup_at TIMESTAMPTZ,
    next_backup_at TIMESTAMPTZ,
    total_backups INTEGER DEFAULT 0,
    failed_backups INTEGER DEFAULT 0,
    
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_backup_config_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_backup_config_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_backup_config_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT unique_config_name_restaurant UNIQUE (restaurant_id, config_name)
);

-- Backup jobs table (individual backup executions)
CREATE TABLE IF NOT EXISTS sop_backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Job details
    backup_type backup_type NOT NULL,
    status backup_status DEFAULT 'scheduled',
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Backup metadata
    backup_size_bytes BIGINT,
    compressed_size_bytes BIGINT,
    compression_ratio DECIMAL(5,2),
    file_count INTEGER,
    table_count INTEGER,
    record_count BIGINT,
    
    -- File information
    backup_filename TEXT,
    backup_path TEXT,
    backup_checksum TEXT,
    storage_url TEXT,
    
    -- Performance metrics
    duration_seconds INTEGER,
    transfer_rate_mbps DECIMAL(10,2),
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_mb INTEGER,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Recovery information
    recovery_point_lsn TEXT, -- Log Sequence Number for point-in-time recovery
    wal_files_included TEXT[], -- Write-Ahead Log files included
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_backup_job_config FOREIGN KEY (config_id) REFERENCES sop_backup_configs(id) ON DELETE CASCADE,
    CONSTRAINT fk_backup_job_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_backup_job_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Backup recovery jobs table
CREATE TABLE IF NOT EXISTS sop_recovery_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Recovery details
    recovery_type recovery_type NOT NULL,
    target_timestamp TIMESTAMPTZ, -- For point-in-time recovery
    status backup_status DEFAULT 'scheduled',
    
    -- Recovery scope
    restore_schema BOOLEAN DEFAULT true,
    restore_data BOOLEAN DEFAULT true,
    restore_indexes BOOLEAN DEFAULT true,
    restore_functions BOOLEAN DEFAULT true,
    table_filters JSONB DEFAULT '{}',
    
    -- Target database
    target_database TEXT,
    target_schema TEXT DEFAULT 'public',
    create_new_database BOOLEAN DEFAULT false,
    
    -- Execution details
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Progress tracking
    total_steps INTEGER,
    completed_steps INTEGER,
    current_step_description TEXT,
    progress_percentage DECIMAL(5,2),
    
    -- Performance
    duration_seconds INTEGER,
    records_restored BIGINT,
    tables_restored INTEGER,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    rollback_completed BOOLEAN DEFAULT false,
    
    -- Validation
    data_integrity_check BOOLEAN DEFAULT true,
    integrity_check_passed BOOLEAN,
    validation_results JSONB,
    
    initiated_by UUID NOT NULL,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_recovery_job_backup FOREIGN KEY (backup_job_id) REFERENCES sop_backup_jobs(id),
    CONSTRAINT fk_recovery_job_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_recovery_job_initiated_by FOREIGN KEY (initiated_by) REFERENCES auth_users(id),
    CONSTRAINT fk_recovery_job_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id)
);

-- Backup verification table
CREATE TABLE IF NOT EXISTS sop_backup_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Verification details
    verification_type VARCHAR(50) NOT NULL, -- 'checksum', 'restore_test', 'data_integrity'
    status backup_status DEFAULT 'scheduled',
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results
    verification_passed BOOLEAN,
    checksum_verified BOOLEAN,
    file_integrity_verified BOOLEAN,
    data_consistency_verified BOOLEAN,
    
    -- Details
    verification_results JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Performance
    duration_seconds INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_verification_backup FOREIGN KEY (backup_job_id) REFERENCES sop_backup_jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_verification_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- ===========================================
-- BACKUP SYSTEM INDEXES
-- ===========================================

-- Backup configs indexes
CREATE INDEX idx_backup_configs_restaurant ON sop_backup_configs(restaurant_id);
CREATE INDEX idx_backup_configs_active ON sop_backup_configs(is_active);
CREATE INDEX idx_backup_configs_next_backup ON sop_backup_configs(next_backup_at) WHERE is_active = true;

-- Backup jobs indexes
CREATE INDEX idx_backup_jobs_config ON sop_backup_jobs(config_id);
CREATE INDEX idx_backup_jobs_restaurant ON sop_backup_jobs(restaurant_id);
CREATE INDEX idx_backup_jobs_status ON sop_backup_jobs(status);
CREATE INDEX idx_backup_jobs_scheduled ON sop_backup_jobs(scheduled_at);
CREATE INDEX idx_backup_jobs_type_status ON sop_backup_jobs(backup_type, status);
CREATE INDEX idx_backup_jobs_created_at ON sop_backup_jobs(created_at);

-- Recovery jobs indexes
CREATE INDEX idx_recovery_jobs_backup ON sop_recovery_jobs(backup_job_id);
CREATE INDEX idx_recovery_jobs_restaurant ON sop_recovery_jobs(restaurant_id);
CREATE INDEX idx_recovery_jobs_status ON sop_recovery_jobs(status);
CREATE INDEX idx_recovery_jobs_initiated ON sop_recovery_jobs(initiated_by, created_at);

-- Verification indexes
CREATE INDEX idx_verification_backup ON sop_backup_verification(backup_job_id);
CREATE INDEX idx_verification_restaurant ON sop_backup_verification(restaurant_id);
CREATE INDEX idx_verification_status ON sop_backup_verification(status);

-- ===========================================
-- BACKUP AUTOMATION FUNCTIONS
-- ===========================================

-- Function to create a backup job
CREATE OR REPLACE FUNCTION create_backup_job(
    p_config_id UUID,
    p_backup_type backup_type DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    config_record RECORD;
    job_id UUID;
    effective_backup_type backup_type;
BEGIN
    -- Get backup configuration
    SELECT * INTO config_record 
    FROM sop_backup_configs 
    WHERE id = p_config_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup configuration not found or inactive: %', p_config_id;
    END IF;
    
    -- Use specified type or default from config
    effective_backup_type := COALESCE(p_backup_type, config_record.backup_type);
    
    -- Create backup job
    INSERT INTO sop_backup_jobs (
        config_id, restaurant_id, backup_type, scheduled_at, created_by
    ) VALUES (
        p_config_id, config_record.restaurant_id, effective_backup_type, 
        p_scheduled_at, p_created_by
    ) RETURNING id INTO job_id;
    
    -- Update config last backup schedule
    UPDATE sop_backup_configs 
    SET next_backup_at = calculate_next_backup_time(schedule_cron, p_scheduled_at),
        updated_at = NOW()
    WHERE id = p_config_id;
    
    -- Log the backup job creation
    INSERT INTO audit_logs (
        restaurant_id, action, resource_type, resource_id, user_id, metadata
    ) VALUES (
        config_record.restaurant_id, 'CREATE'::audit_action, 'backup_job', job_id, p_created_by,
        jsonb_build_object(
            'config_id', p_config_id,
            'backup_type', effective_backup_type,
            'scheduled_at', p_scheduled_at
        )
    );
    
    RETURN job_id;
END;
$$;

-- Function to calculate next backup time from cron expression
CREATE OR REPLACE FUNCTION calculate_next_backup_time(
    p_cron_expression TEXT,
    p_from_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    next_time TIMESTAMPTZ;
BEGIN
    -- Simplified cron calculation - in production, use pg_cron or similar
    -- This is a basic implementation for common patterns
    
    CASE 
        WHEN p_cron_expression = '0 2 * * *' THEN -- Daily at 2 AM
            next_time := DATE_TRUNC('day', p_from_time) + INTERVAL '1 day 2 hours';
        WHEN p_cron_expression = '0 2 * * 0' THEN -- Weekly on Sunday at 2 AM
            next_time := DATE_TRUNC('week', p_from_time) + INTERVAL '1 week 2 hours';
        WHEN p_cron_expression = '0 3 1 * *' THEN -- Monthly on 1st at 3 AM
            next_time := DATE_TRUNC('month', p_from_time) + INTERVAL '1 month 3 hours';
        WHEN p_cron_expression = '0 */6 * * *' THEN -- Every 6 hours
            next_time := DATE_TRUNC('hour', p_from_time) + INTERVAL '6 hours';
        ELSE -- Default to daily
            next_time := DATE_TRUNC('day', p_from_time) + INTERVAL '1 day 2 hours';
    END CASE;
    
    -- Ensure next time is in the future
    IF next_time <= p_from_time THEN
        next_time := next_time + INTERVAL '1 day';
    END IF;
    
    RETURN next_time;
END;
$$;

-- Function to execute backup (mock implementation - would integrate with actual backup tools)
CREATE OR REPLACE FUNCTION execute_backup_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_record RECORD;
    config_record RECORD;
    backup_filename TEXT;
    backup_size BIGINT;
    start_time TIMESTAMPTZ := NOW();
    end_time TIMESTAMPTZ;
    success BOOLEAN := true;
BEGIN
    -- Get job and config details
    SELECT bj.*, bc.* 
    INTO job_record
    FROM sop_backup_jobs bj
    JOIN sop_backup_configs bc ON bj.config_id = bc.id
    WHERE bj.id = p_job_id AND bj.status = 'scheduled';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup job not found or not scheduled: %', p_job_id;
    END IF;
    
    -- Update job status to running
    UPDATE sop_backup_jobs 
    SET status = 'running', started_at = start_time, updated_at = start_time
    WHERE id = p_job_id;
    
    BEGIN
        -- Generate backup filename
        backup_filename := format(
            'sop_backup_%s_%s_%s.sql',
            job_record.restaurant_id,
            job_record.backup_type,
            to_char(start_time, 'YYYY-MM-DD_HH24-MI-SS')
        );
        
        -- Simulate backup execution (in production, this would call pg_dump or similar)
        -- Calculate approximate backup size based on SOP data
        SELECT 
            COUNT(*) * 50 + -- Approximate size per document
            SUM(LENGTH(content) + LENGTH(content_th)) 
        INTO backup_size
        FROM sop_documents 
        WHERE restaurant_id = job_record.restaurant_id AND is_active = true;
        
        -- Simulate processing time (1-5 seconds)
        PERFORM pg_sleep(1 + random() * 4);
        
        end_time := NOW();
        
        -- Update job with success
        UPDATE sop_backup_jobs 
        SET 
            status = 'completed',
            completed_at = end_time,
            backup_filename = backup_filename,
            backup_path = '/backups/' || backup_filename,
            backup_size_bytes = backup_size,
            compressed_size_bytes = backup_size * 0.7, -- Simulate compression
            compression_ratio = 30.0,
            file_count = 1,
            table_count = 10,
            record_count = (SELECT COUNT(*) FROM sop_documents WHERE restaurant_id = job_record.restaurant_id),
            duration_seconds = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER,
            backup_checksum = md5(backup_filename || start_time::TEXT),
            recovery_point_lsn = pg_current_wal_lsn()::TEXT,
            updated_at = end_time
        WHERE id = p_job_id;
        
        -- Update config statistics
        UPDATE sop_backup_configs 
        SET 
            last_backup_at = end_time,
            total_backups = total_backups + 1,
            updated_at = end_time
        WHERE id = job_record.config_id;
        
        -- Schedule verification job
        INSERT INTO sop_backup_verification (
            backup_job_id, restaurant_id, verification_type, scheduled_at
        ) VALUES (
            p_job_id, job_record.restaurant_id, 'checksum', end_time + INTERVAL '5 minutes'
        );
        
    EXCEPTION WHEN OTHERS THEN
        success := false;
        
        -- Update job with failure
        UPDATE sop_backup_jobs 
        SET 
            status = 'failed',
            failed_at = NOW(),
            error_message = SQLERRM,
            error_details = jsonb_build_object(
                'error_code', SQLSTATE,
                'error_message', SQLERRM,
                'error_context', 'backup_execution'
            ),
            retry_count = retry_count + 1,
            updated_at = NOW()
        WHERE id = p_job_id;
        
        -- Update config failure count
        UPDATE sop_backup_configs 
        SET failed_backups = failed_backups + 1, updated_at = NOW()
        WHERE id = job_record.config_id;
        
        -- Log error
        INSERT INTO audit_logs (
            restaurant_id, action, resource_type, resource_id, metadata
        ) VALUES (
            job_record.restaurant_id, 'ERROR'::audit_action, 'backup_job', p_job_id,
            jsonb_build_object(
                'error_message', SQLERRM,
                'error_code', SQLSTATE,
                'job_type', job_record.backup_type
            )
        );
    END;
    
    RETURN success;
END;
$$;

-- Function to create recovery job
CREATE OR REPLACE FUNCTION create_recovery_job(
    p_backup_job_id UUID,
    p_recovery_type recovery_type,
    p_target_timestamp TIMESTAMPTZ DEFAULT NULL,
    p_initiated_by UUID,
    p_target_database TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    backup_record RECORD;
    recovery_id UUID;
BEGIN
    -- Get backup job details
    SELECT bj.*, bc.restaurant_id 
    INTO backup_record
    FROM sop_backup_jobs bj
    JOIN sop_backup_configs bc ON bj.config_id = bc.id
    WHERE bj.id = p_backup_job_id AND bj.status = 'completed';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup job not found or not completed: %', p_backup_job_id;
    END IF;
    
    -- Validate point-in-time recovery request
    IF p_recovery_type = 'point_in_time_restore' AND p_target_timestamp IS NULL THEN
        RAISE EXCEPTION 'Target timestamp required for point-in-time recovery';
    END IF;
    
    -- Create recovery job
    INSERT INTO sop_recovery_jobs (
        backup_job_id, restaurant_id, recovery_type, target_timestamp,
        target_database, initiated_by, scheduled_at
    ) VALUES (
        p_backup_job_id, backup_record.restaurant_id, p_recovery_type, p_target_timestamp,
        COALESCE(p_target_database, 'postgres'), p_initiated_by, NOW()
    ) RETURNING id INTO recovery_id;
    
    -- Log recovery job creation
    INSERT INTO audit_logs (
        restaurant_id, action, resource_type, resource_id, user_id, metadata
    ) VALUES (
        backup_record.restaurant_id, 'CREATE'::audit_action, 'recovery_job', recovery_id, p_initiated_by,
        jsonb_build_object(
            'backup_job_id', p_backup_job_id,
            'recovery_type', p_recovery_type,
            'target_timestamp', p_target_timestamp,
            'target_database', p_target_database
        )
    );
    
    RETURN recovery_id;
END;
$$;

-- Function to get backup status summary
CREATE OR REPLACE FUNCTION get_backup_status_summary(p_restaurant_id UUID)
RETURNS TABLE (
    total_configs INTEGER,
    active_configs INTEGER,
    total_backups INTEGER,
    successful_backups INTEGER,
    failed_backups INTEGER,
    last_backup_time TIMESTAMPTZ,
    next_backup_time TIMESTAMPTZ,
    total_backup_size_gb DECIMAL(10,2),
    avg_backup_duration_minutes DECIMAL(10,2)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH backup_stats AS (
        SELECT 
            COUNT(DISTINCT bc.id) as total_configs,
            COUNT(DISTINCT bc.id) FILTER (WHERE bc.is_active = true) as active_configs,
            COUNT(bj.id) as total_backups,
            COUNT(bj.id) FILTER (WHERE bj.status = 'completed') as successful_backups,
            COUNT(bj.id) FILTER (WHERE bj.status = 'failed') as failed_backups,
            MAX(bj.completed_at) as last_backup_time,
            MIN(bc.next_backup_at) FILTER (WHERE bc.is_active = true) as next_backup_time,
            COALESCE(SUM(bj.backup_size_bytes) / (1024.0^3), 0) as total_size_gb,
            COALESCE(AVG(bj.duration_seconds) / 60.0, 0) as avg_duration_minutes
        FROM sop_backup_configs bc
        LEFT JOIN sop_backup_jobs bj ON bc.id = bj.config_id
        WHERE bc.restaurant_id = p_restaurant_id
    )
    SELECT 
        bs.total_configs::INTEGER,
        bs.active_configs::INTEGER,
        bs.total_backups::INTEGER,
        bs.successful_backups::INTEGER,
        bs.failed_backups::INTEGER,
        bs.last_backup_time,
        bs.next_backup_time,
        bs.total_size_gb,
        bs.avg_duration_minutes
    FROM backup_stats bs;
END;
$$;

-- Function to cleanup old backups based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_backups(p_restaurant_id UUID DEFAULT NULL)
RETURNS TABLE (
    backups_expired INTEGER,
    space_freed_gb DECIMAL(10,2),
    cleanup_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    config_record RECORD;
    expired_count INTEGER := 0;
    total_size BIGINT := 0;
    total_expired INTEGER := 0;
    total_freed BIGINT := 0;
BEGIN
    -- Process each backup configuration
    FOR config_record IN 
        SELECT * FROM sop_backup_configs 
        WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
        AND is_active = true
    LOOP
        -- Mark old backups as expired
        WITH expired_backups AS (
            UPDATE sop_backup_jobs 
            SET status = 'expired', updated_at = NOW()
            WHERE config_id = config_record.id
            AND status = 'completed'
            AND completed_at < (NOW() - (config_record.retention_days || ' days')::INTERVAL)
            RETURNING backup_size_bytes
        )
        SELECT COUNT(*), COALESCE(SUM(backup_size_bytes), 0)
        INTO expired_count, total_size
        FROM expired_backups;
        
        total_expired := total_expired + expired_count;
        total_freed := total_freed + total_size;
    END LOOP;
    
    -- Return summary
    RETURN QUERY SELECT 
        total_expired,
        (total_freed / (1024.0^3))::DECIMAL(10,2),
        jsonb_build_object(
            'cleanup_date', NOW(),
            'restaurant_filter', p_restaurant_id IS NOT NULL,
            'configs_processed', (
                SELECT COUNT(*) FROM sop_backup_configs 
                WHERE (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
                AND is_active = true
            )
        );
END;
$$;

-- ===========================================
-- TRIGGERS FOR BACKUP AUTOMATION
-- ===========================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_backup_configs_updated_at 
    BEFORE UPDATE ON sop_backup_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backup_jobs_updated_at 
    BEFORE UPDATE ON sop_backup_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recovery_jobs_updated_at 
    BEFORE UPDATE ON sop_recovery_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on backup tables
ALTER TABLE sop_backup_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_recovery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_backup_verification ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Backup configs restaurant isolation"
ON sop_backup_configs FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Backup jobs restaurant isolation"
ON sop_backup_jobs FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Recovery jobs restaurant isolation"
ON sop_recovery_jobs FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Backup verification restaurant isolation"
ON sop_backup_verification FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION create_backup_job TO authenticated;
GRANT EXECUTE ON FUNCTION execute_backup_job TO authenticated;
GRANT EXECUTE ON FUNCTION create_recovery_job TO authenticated;
GRANT EXECUTE ON FUNCTION get_backup_status_summary TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_backups TO authenticated;

-- ===========================================
-- DEFAULT BACKUP CONFIGURATIONS
-- ===========================================

-- Create default backup configurations for existing restaurants
INSERT INTO sop_backup_configs (
    restaurant_id, config_name, description, backup_type, schedule_cron,
    retention_days, compression_enabled, encryption_enabled, created_by
)
SELECT 
    r.id,
    'Daily SOP Backup',
    'Automated daily backup of all SOP documents and related data',
    'incremental',
    '0 2 * * *', -- Daily at 2 AM
    30, -- 30 days retention
    true,
    true,
    (SELECT id FROM auth_users WHERE restaurant_id = r.id AND role = 'admin' LIMIT 1)
FROM restaurants r
WHERE NOT EXISTS (
    SELECT 1 FROM sop_backup_configs 
    WHERE restaurant_id = r.id
);

-- Update next backup times
UPDATE sop_backup_configs 
SET next_backup_at = calculate_next_backup_time(schedule_cron, NOW())
WHERE next_backup_at IS NULL AND is_active = true;

-- ===========================================
-- PERFORMANCE OPTIMIZATION
-- ===========================================

ANALYZE sop_backup_configs;
ANALYZE sop_backup_jobs;
ANALYZE sop_recovery_jobs;
ANALYZE sop_backup_verification;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_backup_configs IS 'Configurable backup schedules and policies for SOP data';
COMMENT ON TABLE sop_backup_jobs IS 'Individual backup job executions with detailed metrics';
COMMENT ON TABLE sop_recovery_jobs IS 'Point-in-time and full recovery job tracking';
COMMENT ON TABLE sop_backup_verification IS 'Backup integrity verification and testing';

COMMENT ON FUNCTION create_backup_job IS 'Creates a new backup job from configuration';
COMMENT ON FUNCTION execute_backup_job IS 'Executes a scheduled backup job with full logging';
COMMENT ON FUNCTION create_recovery_job IS 'Creates a recovery job for point-in-time or full restore';
COMMENT ON FUNCTION get_backup_status_summary IS 'Returns comprehensive backup status and metrics';
COMMENT ON FUNCTION cleanup_old_backups IS 'Removes expired backups according to retention policies';