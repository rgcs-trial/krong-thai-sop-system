-- Training Progress Data Encryption System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Implement comprehensive encryption for sensitive training progress data

-- ===========================================
-- ENCRYPTION ENUMS AND TYPES
-- ===========================================

-- Encryption algorithms
CREATE TYPE encryption_algorithm AS ENUM (
    'AES_256_GCM', 'AES_256_CBC', 'ChaCha20_Poly1305', 'RSA_2048', 'RSA_4096'
);

-- Data classification for encryption
CREATE TYPE data_classification AS ENUM (
    'public', 'internal', 'sensitive', 'restricted', 'confidential'
);

-- Key rotation status
CREATE TYPE key_rotation_status AS ENUM (
    'active', 'rotating', 'deprecated', 'revoked', 'archived'
);

-- Encryption status
CREATE TYPE encryption_status AS ENUM (
    'encrypted', 'decrypted', 'failed', 'pending', 'corrupted'
);

-- ===========================================
-- ENCRYPTION KEY MANAGEMENT
-- ===========================================

-- Master encryption keys
CREATE TABLE IF NOT EXISTS training_encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Key identification
    key_name VARCHAR(100) NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    key_purpose VARCHAR(50) NOT NULL, -- 'data_encryption', 'key_encryption', 'signing'
    
    -- Key attributes
    algorithm encryption_algorithm NOT NULL,
    key_size INTEGER NOT NULL, -- Key size in bits
    key_hash VARCHAR(128) NOT NULL, -- SHA-512 hash of key for verification
    
    -- Key metadata
    created_by UUID,
    creation_source VARCHAR(50) DEFAULT 'system', -- 'system', 'imported', 'generated'
    key_derivation_info JSONB DEFAULT '{}',
    
    -- Key lifecycle
    status key_rotation_status DEFAULT 'active',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    rotation_due_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    
    -- Usage tracking
    encryption_count BIGINT DEFAULT 0,
    decryption_count BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    usage_limit BIGINT, -- Optional usage limit
    
    -- Security attributes
    is_hardware_backed BOOLEAN DEFAULT false,
    requires_dual_control BOOLEAN DEFAULT false,
    minimum_clearance_level INTEGER DEFAULT 1,
    geographic_restrictions JSONB DEFAULT '{}',
    
    -- Backup and recovery
    backup_key_id UUID, -- Reference to backup key
    recovery_shares INTEGER DEFAULT 5, -- For secret sharing
    recovery_threshold INTEGER DEFAULT 3,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_encryption_key_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_encryption_key_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_encryption_key_backup FOREIGN KEY (backup_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT unique_key_version UNIQUE (restaurant_id, key_name, key_version)
);

-- Encrypted data registry
CREATE TABLE IF NOT EXISTS training_encrypted_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Data identification  
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Encryption details
    encryption_key_id UUID NOT NULL,
    algorithm encryption_algorithm NOT NULL,
    initialization_vector BYTEA, -- IV for symmetric encryption
    salt BYTEA, -- Salt for key derivation
    tag BYTEA, -- Authentication tag for AEAD
    
    -- Data classification
    classification data_classification NOT NULL DEFAULT 'sensitive',
    sensitivity_tags TEXT[] DEFAULT '{}',
    
    -- Encryption metadata
    encrypted_at TIMESTAMPTZ DEFAULT NOW(),
    encrypted_by UUID,
    encryption_context JSONB DEFAULT '{}', -- Additional authenticated data
    
    -- Data integrity
    original_hash VARCHAR(128), -- Hash of original data
    encrypted_size_bytes INTEGER,
    compression_applied BOOLEAN DEFAULT false,
    compression_algorithm VARCHAR(20),
    
    -- Access tracking
    last_decrypted_at TIMESTAMPTZ,
    decryption_count INTEGER DEFAULT 0,
    failed_decryption_attempts INTEGER DEFAULT 0,
    
    -- Key rotation
    previous_key_id UUID,
    rotation_scheduled BOOLEAN DEFAULT false,
    rotation_completed_at TIMESTAMPTZ,
    
    -- Compliance and retention
    retention_period_days INTEGER DEFAULT 2555, -- 7 years
    legal_hold BOOLEAN DEFAULT false,
    compliance_tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_encrypted_data_key FOREIGN KEY (encryption_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_encrypted_data_previous_key FOREIGN KEY (previous_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_encrypted_data_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_encrypted_data_encrypted_by FOREIGN KEY (encrypted_by) REFERENCES auth_users(id),
    CONSTRAINT unique_encrypted_record UNIQUE (table_name, column_name, record_id)
);

-- Key access log
CREATE TABLE IF NOT EXISTS training_key_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Access details
    key_id UUID NOT NULL,
    user_id UUID,
    operation VARCHAR(50) NOT NULL, -- 'encrypt', 'decrypt', 'rotate', 'revoke'
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    request_id UUID,
    
    -- Operation details
    data_table VARCHAR(100),
    data_column VARCHAR(100),
    record_count INTEGER DEFAULT 1,
    
    -- Result
    success BOOLEAN NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Performance metrics
    operation_duration_ms INTEGER,
    cpu_time_ms INTEGER,
    memory_used_mb INTEGER,
    
    -- Security context
    authentication_method VARCHAR(50),
    authorization_level INTEGER,
    dual_control_verified BOOLEAN DEFAULT false,
    
    -- Compliance
    audit_trail_id UUID,
    regulation_context TEXT[], -- GDPR, HIPAA, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_key_access_key FOREIGN KEY (key_id) REFERENCES training_encryption_keys(id) ON DELETE CASCADE,
    CONSTRAINT fk_key_access_user FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

-- ===========================================
-- ENCRYPTED TRAINING DATA TABLES
-- ===========================================

-- Encrypted user training progress (extends existing table)
CREATE TABLE IF NOT EXISTS training_progress_encrypted (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_id UUID NOT NULL, -- Reference to user_training_progress
    
    -- Encrypted sensitive fields
    encrypted_notes BYTEA, -- Encrypted personal notes or comments
    encrypted_performance_data BYTEA, -- Encrypted detailed performance metrics
    encrypted_learning_path BYTEA, -- Encrypted personalized learning recommendations
    encrypted_weakness_analysis BYTEA, -- Encrypted analysis of learning weaknesses
    encrypted_feedback BYTEA, -- Encrypted trainer/peer feedback
    
    -- Encryption metadata for each field
    notes_encryption_key_id UUID,
    performance_encryption_key_id UUID,
    learning_path_encryption_key_id UUID,
    weakness_encryption_key_id UUID,
    feedback_encryption_key_id UUID,
    
    -- Field-level access control
    notes_access_level data_classification DEFAULT 'sensitive',
    performance_access_level data_classification DEFAULT 'restricted',
    learning_path_access_level data_classification DEFAULT 'sensitive',
    weakness_access_level data_classification DEFAULT 'confidential',
    feedback_access_level data_classification DEFAULT 'restricted',
    
    -- Encryption status per field
    notes_status encryption_status DEFAULT 'encrypted',
    performance_status encryption_status DEFAULT 'encrypted',
    learning_path_status encryption_status DEFAULT 'encrypted',
    weakness_status encryption_status DEFAULT 'encrypted',
    feedback_status encryption_status DEFAULT 'encrypted',
    
    -- Data integrity checksums
    notes_checksum VARCHAR(64),
    performance_checksum VARCHAR(64),
    learning_path_checksum VARCHAR(64),
    weakness_checksum VARCHAR(64),
    feedback_checksum VARCHAR(64),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_progress_encrypted_main FOREIGN KEY (progress_id) REFERENCES user_training_progress(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_notes_key FOREIGN KEY (notes_encryption_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_progress_performance_key FOREIGN KEY (performance_encryption_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_progress_learning_key FOREIGN KEY (learning_path_encryption_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_progress_weakness_key FOREIGN KEY (weakness_encryption_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_progress_feedback_key FOREIGN KEY (feedback_encryption_key_id) REFERENCES training_encryption_keys(id)
);

-- Encrypted assessment responses (extends existing table)
CREATE TABLE IF NOT EXISTS training_responses_encrypted (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL, -- Reference to training_question_responses
    
    -- Encrypted response data
    encrypted_answer_details BYTEA, -- Detailed answer explanation
    encrypted_thought_process BYTEA, -- Student's reasoning process
    encrypted_confidence_notes BYTEA, -- Self-assessment notes
    encrypted_struggle_points BYTEA, -- Areas where student struggled
    
    -- Encryption keys for each field
    answer_details_key_id UUID,
    thought_process_key_id UUID,
    confidence_key_id UUID,
    struggle_key_id UUID,
    
    -- Field access levels
    answer_details_classification data_classification DEFAULT 'sensitive',
    thought_process_classification data_classification DEFAULT 'confidential',
    confidence_classification data_classification DEFAULT 'sensitive',
    struggle_classification data_classification DEFAULT 'confidential',
    
    -- Encryption status
    answer_details_status encryption_status DEFAULT 'encrypted',
    thought_process_status encryption_status DEFAULT 'encrypted',
    confidence_status encryption_status DEFAULT 'encrypted',
    struggle_status encryption_status DEFAULT 'encrypted',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_response_encrypted_main FOREIGN KEY (response_id) REFERENCES training_question_responses(id) ON DELETE CASCADE,
    CONSTRAINT fk_response_answer_key FOREIGN KEY (answer_details_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_response_thought_key FOREIGN KEY (thought_process_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_response_confidence_key FOREIGN KEY (confidence_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_response_struggle_key FOREIGN KEY (struggle_key_id) REFERENCES training_encryption_keys(id)
);

-- Encrypted personal development plans
CREATE TABLE IF NOT EXISTS training_development_plans_encrypted (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Encrypted plan data
    encrypted_goals BYTEA, -- Personal learning goals
    encrypted_weaknesses BYTEA, -- Identified weaknesses
    encrypted_strengths BYTEA, -- Identified strengths
    encrypted_recommendations BYTEA, -- Personalized recommendations
    encrypted_career_path BYTEA, -- Career development path
    encrypted_mentor_notes BYTEA, -- Mentor feedback and notes
    
    -- Encryption keys
    goals_key_id UUID,
    weaknesses_key_id UUID,
    strengths_key_id UUID,
    recommendations_key_id UUID,
    career_path_key_id UUID,
    mentor_notes_key_id UUID,
    
    -- Data classifications
    goals_classification data_classification DEFAULT 'sensitive',
    weaknesses_classification data_classification DEFAULT 'confidential',
    strengths_classification data_classification DEFAULT 'sensitive',
    recommendations_classification data_classification DEFAULT 'restricted',
    career_path_classification data_classification DEFAULT 'confidential',
    mentor_notes_classification data_classification DEFAULT 'restricted',
    
    -- Plan metadata
    plan_version INTEGER DEFAULT 1,
    created_by UUID,
    approved_by UUID,
    approval_date TIMESTAMPTZ,
    next_review_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_dev_plan_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_dev_plan_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_dev_plan_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_dev_plan_approved_by FOREIGN KEY (approved_by) REFERENCES auth_users(id),
    CONSTRAINT fk_dev_plan_goals_key FOREIGN KEY (goals_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_dev_plan_weaknesses_key FOREIGN KEY (weaknesses_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_dev_plan_strengths_key FOREIGN KEY (strengths_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_dev_plan_recommendations_key FOREIGN KEY (recommendations_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_dev_plan_career_key FOREIGN KEY (career_path_key_id) REFERENCES training_encryption_keys(id),
    CONSTRAINT fk_dev_plan_mentor_key FOREIGN KEY (mentor_notes_key_id) REFERENCES training_encryption_keys(id)
);

-- ===========================================
-- ENCRYPTION INDEXES
-- ===========================================

-- Encryption keys indexes
CREATE INDEX idx_encryption_keys_restaurant ON training_encryption_keys(restaurant_id);
CREATE INDEX idx_encryption_keys_status ON training_encryption_keys(status);
CREATE INDEX idx_encryption_keys_purpose ON training_encryption_keys(key_purpose);
CREATE INDEX idx_encryption_keys_expires ON training_encryption_keys(expires_at);
CREATE INDEX idx_encryption_keys_rotation_due ON training_encryption_keys(rotation_due_at);

-- Encrypted data indexes
CREATE INDEX idx_encrypted_data_table_record ON training_encrypted_data(table_name, record_id);
CREATE INDEX idx_encrypted_data_key ON training_encrypted_data(encryption_key_id);
CREATE INDEX idx_encrypted_data_restaurant ON training_encrypted_data(restaurant_id);
CREATE INDEX idx_encrypted_data_classification ON training_encrypted_data(classification);
CREATE INDEX idx_encrypted_data_encrypted_at ON training_encrypted_data(encrypted_at);

-- Key access log indexes
CREATE INDEX idx_key_access_key ON training_key_access_log(key_id);
CREATE INDEX idx_key_access_user ON training_key_access_log(user_id);
CREATE INDEX idx_key_access_operation ON training_key_access_log(operation);
CREATE INDEX idx_key_access_created_at ON training_key_access_log(created_at);
CREATE INDEX idx_key_access_success ON training_key_access_log(success);

-- Encrypted training data indexes
CREATE INDEX idx_progress_encrypted_progress ON training_progress_encrypted(progress_id);
CREATE INDEX idx_responses_encrypted_response ON training_responses_encrypted(response_id);
CREATE INDEX idx_dev_plans_user ON training_development_plans_encrypted(user_id);
CREATE INDEX idx_dev_plans_restaurant ON training_development_plans_encrypted(restaurant_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on encryption tables
ALTER TABLE training_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_encrypted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_key_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress_encrypted ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_responses_encrypted ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_development_plans_encrypted ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Encryption keys restaurant isolation"
ON training_encryption_keys FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Encrypted data restaurant isolation"
ON training_encrypted_data FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Development plans user isolation"
ON training_development_plans_encrypted FOR ALL TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM auth_users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
        AND restaurant_id = training_development_plans_encrypted.restaurant_id
    )
);

-- ===========================================
-- ENCRYPTION UTILITY FUNCTIONS
-- ===========================================

-- Function to get active encryption key
CREATE OR REPLACE FUNCTION get_active_encryption_key(
    p_restaurant_id UUID,
    p_key_purpose VARCHAR(50) DEFAULT 'data_encryption'
)
RETURNS UUID AS $$
DECLARE
    key_id UUID;
BEGIN
    SELECT id INTO key_id
    FROM training_encryption_keys
    WHERE restaurant_id = p_restaurant_id
    AND key_purpose = p_key_purpose
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY key_version DESC
    LIMIT 1;
    
    RETURN key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log key access
CREATE OR REPLACE FUNCTION log_key_access(
    p_key_id UUID,
    p_user_id UUID,
    p_operation VARCHAR(50),
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_data_table VARCHAR(100) DEFAULT NULL,
    p_data_column VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO training_key_access_log (
        key_id,
        user_id,
        operation,
        success,
        error_message,
        data_table,
        data_column,
        created_at
    ) VALUES (
        p_key_id,
        p_user_id,
        p_operation,
        p_success,
        p_error_message,
        p_data_table,
        p_data_column,
        NOW()
    ) RETURNING id INTO log_id;
    
    -- Update key usage statistics
    UPDATE training_encryption_keys
    SET 
        encryption_count = encryption_count + CASE WHEN p_operation = 'encrypt' AND p_success THEN 1 ELSE 0 END,
        decryption_count = decryption_count + CASE WHEN p_operation = 'decrypt' AND p_success THEN 1 ELSE 0 END,
        last_used_at = CASE WHEN p_success THEN NOW() ELSE last_used_at END
    WHERE id = p_key_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register encrypted data
CREATE OR REPLACE FUNCTION register_encrypted_data(
    p_table_name VARCHAR(100),
    p_column_name VARCHAR(100),
    p_record_id UUID,
    p_restaurant_id UUID,
    p_encryption_key_id UUID,
    p_algorithm encryption_algorithm,
    p_classification data_classification DEFAULT 'sensitive',
    p_original_hash VARCHAR(128) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    registry_id UUID;
BEGIN
    INSERT INTO training_encrypted_data (
        table_name,
        column_name,
        record_id,
        restaurant_id,
        encryption_key_id,
        algorithm,
        classification,
        original_hash,
        encrypted_by,
        encrypted_at
    ) VALUES (
        p_table_name,
        p_column_name,
        p_record_id,
        p_restaurant_id,
        p_encryption_key_id,
        p_algorithm,
        p_classification,
        p_original_hash,
        auth.uid(),
        NOW()
    ) RETURNING id INTO registry_id;
    
    RETURN registry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if key rotation is needed
CREATE OR REPLACE FUNCTION check_key_rotation_needed()
RETURNS TABLE (
    key_id UUID,
    key_name VARCHAR(100),
    restaurant_id UUID,
    rotation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tek.id,
        tek.key_name,
        tek.restaurant_id,
        CASE 
            WHEN tek.rotation_due_at <= NOW() THEN 'Scheduled rotation due'
            WHEN tek.encryption_count >= COALESCE(tek.usage_limit, 1000000) THEN 'Usage limit reached'
            WHEN tek.expires_at <= NOW() + INTERVAL '30 days' THEN 'Key expiring soon'
            ELSE 'Unknown'
        END as rotation_reason
    FROM training_encryption_keys tek
    WHERE tek.status = 'active'
    AND (
        tek.rotation_due_at <= NOW() OR
        tek.encryption_count >= COALESCE(tek.usage_limit, 1000000) OR
        tek.expires_at <= NOW() + INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- DEFAULT ENCRYPTION KEYS SETUP
-- ===========================================

-- Create default encryption keys for each restaurant
INSERT INTO training_encryption_keys (
    restaurant_id, 
    key_name, 
    key_purpose, 
    algorithm, 
    key_size, 
    key_hash,
    expires_at,
    rotation_due_at
)
SELECT 
    r.id,
    'Default Training Data Key',
    'data_encryption',
    'AES_256_GCM',
    256,
    encode(sha256(random()::text::bytea), 'hex'), -- Placeholder hash
    NOW() + INTERVAL '2 years',
    NOW() + INTERVAL '1 year'
FROM restaurants r
ON CONFLICT (restaurant_id, key_name, key_version) DO NOTHING;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_encryption_keys IS 'Master encryption keys with lifecycle management and usage tracking';
COMMENT ON TABLE training_encrypted_data IS 'Registry of encrypted data with metadata and access tracking';
COMMENT ON TABLE training_key_access_log IS 'Audit log of all encryption key access and operations';
COMMENT ON TABLE training_progress_encrypted IS 'Encrypted sensitive training progress data with field-level encryption';
COMMENT ON TABLE training_responses_encrypted IS 'Encrypted detailed assessment response data';
COMMENT ON TABLE training_development_plans_encrypted IS 'Encrypted personal development plans with multi-field encryption';

-- Performance optimization
ANALYZE training_encryption_keys;
ANALYZE training_encrypted_data;
ANALYZE training_key_access_log;
ANALYZE training_progress_encrypted;
ANALYZE training_responses_encrypted;
ANALYZE training_development_plans_encrypted;