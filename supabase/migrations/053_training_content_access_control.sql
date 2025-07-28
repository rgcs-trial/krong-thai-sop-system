-- Training Content Access Control System
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Implement role-based access control for training content with security measures

-- ===========================================
-- TRAINING ACCESS CONTROL ENUMS
-- ===========================================

-- Content access levels
CREATE TYPE training_access_level AS ENUM (
    'public', 'internal', 'restricted', 'confidential', 'classified'
);

-- Permission types
CREATE TYPE training_permission_type AS ENUM (
    'view', 'edit', 'create', 'delete', 'assign', 'approve', 'audit'
);

-- Access request status
CREATE TYPE access_request_status AS ENUM (
    'pending', 'approved', 'denied', 'expired', 'revoked'
);

-- Content sensitivity levels
CREATE TYPE content_sensitivity AS ENUM (
    'low', 'medium', 'high', 'critical', 'trade_secret'
);

-- ===========================================
-- TRAINING ACCESS CONTROL TABLES
-- ===========================================

-- Training roles definition
CREATE TABLE IF NOT EXISTS training_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID,
    
    -- Role identification
    role_name VARCHAR(100) NOT NULL,
    role_code VARCHAR(20) NOT NULL, -- 'TRAINER', 'MANAGER', 'STAFF', 'ADMIN'
    description TEXT,
    
    -- Role hierarchy
    parent_role_id UUID, -- For role inheritance
    hierarchy_level INTEGER NOT NULL DEFAULT 1, -- 1=highest authority
    inherits_permissions BOOLEAN DEFAULT true,
    
    -- Role attributes
    is_system_role BOOLEAN DEFAULT false, -- System-defined vs custom
    max_simultaneous_sessions INTEGER DEFAULT 5,
    session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
    requires_mfa BOOLEAN DEFAULT false,
    
    -- Access restrictions
    allowed_ip_ranges INET[], -- Array of allowed IP ranges
    allowed_time_ranges JSONB DEFAULT '{}', -- Time-based access restrictions
    geographic_restrictions JSONB DEFAULT '{}', -- Location-based restrictions
    device_restrictions JSONB DEFAULT '{}', -- Device type restrictions
    
    -- Role status
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_training_role_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_role_parent FOREIGN KEY (parent_role_id) REFERENCES training_roles(id),
    CONSTRAINT fk_training_role_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_training_role_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT unique_role_per_restaurant UNIQUE (restaurant_id, role_code)
);

-- Role permissions mapping
CREATE TABLE IF NOT EXISTS training_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,
    
    -- Permission definition
    permission_type training_permission_type NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'module', 'section', 'assessment', 'certificate'
    resource_identifier VARCHAR(100), -- Specific resource or wildcard '*'
    
    -- Permission scope
    access_level training_access_level NOT NULL DEFAULT 'public',
    scope_conditions JSONB DEFAULT '{}', -- Additional conditions for permission
    
    -- Permission attributes
    is_inherited BOOLEAN DEFAULT false, -- From parent role
    can_delegate BOOLEAN DEFAULT false, -- Can grant this permission to others
    is_revocable BOOLEAN DEFAULT true, -- Can be revoked
    
    -- Time-based permissions
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    time_restrictions JSONB DEFAULT '{}', -- Hour/day restrictions
    
    -- Approval requirements
    requires_approval BOOLEAN DEFAULT false,
    approval_level INTEGER DEFAULT 0, -- Number of approvals needed
    auto_approve_conditions JSONB DEFAULT '{}',
    
    granted_by UUID,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    
    CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id) REFERENCES training_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permission_granted_by FOREIGN KEY (granted_by) REFERENCES auth_users(id),
    CONSTRAINT unique_role_permission UNIQUE (role_id, permission_type, resource_type, resource_identifier)
);

-- User role assignments
CREATE TABLE IF NOT EXISTS training_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Assignment details
    assigned_by UUID NOT NULL,
    assignment_reason TEXT,
    assignment_type VARCHAR(20) DEFAULT 'permanent', -- 'permanent', 'temporary', 'conditional'
    
    -- Assignment scope
    scope_limitations JSONB DEFAULT '{}', -- Additional restrictions on this assignment
    department_restrictions TEXT[], -- Limit to specific departments
    location_restrictions TEXT[], -- Limit to specific locations
    
    -- Time-based assignment
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    auto_expire BOOLEAN DEFAULT false,
    
    -- Assignment status
    is_active BOOLEAN DEFAULT true,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID,
    suspension_reason TEXT,
    
    -- Monitoring
    last_activity_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    failed_access_attempts INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES training_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_assigned_by FOREIGN KEY (assigned_by) REFERENCES auth_users(id),
    CONSTRAINT fk_user_role_suspended_by FOREIGN KEY (suspended_by) REFERENCES auth_users(id),
    CONSTRAINT unique_user_role_assignment UNIQUE (user_id, role_id, restaurant_id)
);

-- Content access control metadata
CREATE TABLE IF NOT EXISTS training_content_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content reference
    content_type VARCHAR(50) NOT NULL, -- 'module', 'section', 'question', 'media'
    content_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Access control settings
    access_level training_access_level NOT NULL DEFAULT 'internal',
    sensitivity_level content_sensitivity NOT NULL DEFAULT 'medium',
    classification_tags TEXT[] DEFAULT '{}',
    
    -- Access requirements
    required_roles TEXT[] DEFAULT '{}', -- Array of role codes required
    required_permissions TEXT[] DEFAULT '{}', -- Array of specific permissions
    minimum_clearance_level INTEGER DEFAULT 1,
    
    -- Additional security measures
    requires_background_check BOOLEAN DEFAULT false,
    requires_confidentiality_agreement BOOLEAN DEFAULT false,
    requires_supervisor_approval BOOLEAN DEFAULT false,
    watermark_required BOOLEAN DEFAULT false,
    
    -- Access restrictions
    max_concurrent_users INTEGER, -- Limit simultaneous access
    download_allowed BOOLEAN DEFAULT false,
    print_allowed BOOLEAN DEFAULT false,
    screenshot_allowed BOOLEAN DEFAULT false,
    copy_allowed BOOLEAN DEFAULT false,
    
    -- Time-based restrictions
    access_window_start TIME,
    access_window_end TIME,
    allowed_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday
    blackout_periods JSONB DEFAULT '[]',
    
    -- Geographic restrictions
    allowed_countries VARCHAR(2)[], -- ISO country codes
    allowed_ip_ranges INET[],
    geo_fencing_enabled BOOLEAN DEFAULT false,
    geo_fence_coordinates JSONB,
    
    -- Device restrictions
    allowed_device_types TEXT[] DEFAULT '{"tablet","desktop","mobile"}',
    require_managed_device BOOLEAN DEFAULT false,
    minimum_os_version JSONB DEFAULT '{}',
    
    -- Audit and compliance
    retention_period_days INTEGER DEFAULT 2555, -- 7 years
    automatic_declassification_date DATE,
    compliance_frameworks TEXT[] DEFAULT '{}', -- GDPR, HIPAA, etc.
    
    -- Metadata
    classification_date DATE DEFAULT CURRENT_DATE,
    classified_by UUID,
    review_date DATE,
    next_review_due DATE,
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_content_access_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_content_access_classified_by FOREIGN KEY (classified_by) REFERENCES auth_users(id),
    CONSTRAINT fk_content_access_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_content_access_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    CONSTRAINT unique_content_access_control UNIQUE (content_type, content_id)
);

-- Access requests and approvals
CREATE TABLE IF NOT EXISTS training_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request details
    requester_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    
    -- Request information
    request_reason TEXT NOT NULL,
    business_justification TEXT,
    access_duration_days INTEGER DEFAULT 30,
    urgency_level VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    
    -- Approval workflow
    status access_request_status DEFAULT 'pending',
    approver_id UUID,
    approval_date TIMESTAMPTZ,
    approval_comments TEXT,
    denial_reason TEXT,
    
    -- Conditional approval
    conditions JSONB DEFAULT '{}',
    additional_restrictions JSONB DEFAULT '{}',
    supervisor_notification_sent BOOLEAN DEFAULT false,
    
    -- Time tracking
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    auto_expire BOOLEAN DEFAULT true,
    
    -- Escalation
    escalated BOOLEAN DEFAULT false,
    escalation_level INTEGER DEFAULT 0,
    escalated_to UUID,
    escalated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_access_request_requester FOREIGN KEY (requester_id) REFERENCES auth_users(id),
    CONSTRAINT fk_access_request_approver FOREIGN KEY (approver_id) REFERENCES auth_users(id),
    CONSTRAINT fk_access_request_escalated_to FOREIGN KEY (escalated_to) REFERENCES auth_users(id),
    CONSTRAINT fk_access_request_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Access audit log
CREATE TABLE IF NOT EXISTS training_access_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Access attempt details
    user_id UUID,
    session_id TEXT,
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    restaurant_id UUID,
    
    -- Access result
    access_granted BOOLEAN NOT NULL,
    access_method VARCHAR(50), -- 'direct', 'role_based', 'approved_request'
    denial_reason TEXT,
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    geolocation JSONB,
    
    -- Security context
    authentication_method VARCHAR(50),
    mfa_verified BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0, -- 0-100 risk assessment
    anomaly_detected BOOLEAN DEFAULT false,
    
    -- Session information
    session_start_time TIMESTAMPTZ,
    session_duration_seconds INTEGER,
    actions_performed JSONB DEFAULT '{}',
    data_accessed JSONB DEFAULT '{}',
    
    -- Compliance
    data_classification VARCHAR(50),
    retention_required BOOLEAN DEFAULT true,
    audit_trail_id UUID, -- Link to external audit systems
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_access_audit_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    CONSTRAINT fk_access_audit_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- ===========================================
-- TRAINING ACCESS CONTROL INDEXES
-- ===========================================

-- Training roles indexes
CREATE INDEX idx_training_roles_restaurant ON training_roles(restaurant_id);
CREATE INDEX idx_training_roles_code ON training_roles(role_code);
CREATE INDEX idx_training_roles_active ON training_roles(is_active) WHERE is_active = true;
CREATE INDEX idx_training_roles_hierarchy ON training_roles(hierarchy_level);

-- Role permissions indexes
CREATE INDEX idx_role_permissions_role ON training_role_permissions(role_id);
CREATE INDEX idx_role_permissions_type ON training_role_permissions(permission_type);
CREATE INDEX idx_role_permissions_resource ON training_role_permissions(resource_type);
CREATE INDEX idx_role_permissions_access_level ON training_role_permissions(access_level);

-- User roles indexes
CREATE INDEX idx_user_roles_user ON training_user_roles(user_id);
CREATE INDEX idx_user_roles_role ON training_user_roles(role_id);
CREATE INDEX idx_user_roles_restaurant ON training_user_roles(restaurant_id);
CREATE INDEX idx_user_roles_active ON training_user_roles(is_active) WHERE is_active = true;
CREATE INDEX idx_user_roles_effective ON training_user_roles(effective_from, effective_until);

-- Content access control indexes
CREATE INDEX idx_content_access_type_id ON training_content_access_control(content_type, content_id);
CREATE INDEX idx_content_access_level ON training_content_access_control(access_level);
CREATE INDEX idx_content_access_sensitivity ON training_content_access_control(sensitivity_level);
CREATE INDEX idx_content_access_restaurant ON training_content_access_control(restaurant_id);

-- Access requests indexes
CREATE INDEX idx_access_requests_requester ON training_access_requests(requester_id);
CREATE INDEX idx_access_requests_status ON training_access_requests(status);
CREATE INDEX idx_access_requests_content ON training_access_requests(content_type, content_id);
CREATE INDEX idx_access_requests_restaurant ON training_access_requests(restaurant_id);
CREATE INDEX idx_access_requests_expires ON training_access_requests(expires_at);

-- Audit log indexes
CREATE INDEX idx_access_audit_user ON training_access_audit_log(user_id);
CREATE INDEX idx_access_audit_content ON training_access_audit_log(content_type, content_id);
CREATE INDEX idx_access_audit_created_at ON training_access_audit_log(created_at);
CREATE INDEX idx_access_audit_restaurant ON training_access_audit_log(restaurant_id);
CREATE INDEX idx_access_audit_ip ON training_access_audit_log(ip_address);
CREATE INDEX idx_access_audit_granted ON training_access_audit_log(access_granted);

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all access control tables
ALTER TABLE training_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_content_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_access_audit_log ENABLE ROW LEVEL SECURITY;

-- Restaurant isolation policies
CREATE POLICY "Training roles restaurant isolation"
ON training_roles FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "User roles restaurant isolation"
ON training_user_roles FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Content access control restaurant isolation"
ON training_content_access_control FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Access requests restaurant isolation"
ON training_access_requests FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Access audit restaurant isolation"
ON training_access_audit_log FOR ALL TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- Role-based access policies
CREATE POLICY "Role permissions access"
ON training_role_permissions FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM training_user_roles tur
        JOIN training_roles tr ON tur.role_id = tr.id
        WHERE tur.user_id = auth.uid()
        AND tur.is_active = true
        AND tr.hierarchy_level <= 2
    )
);

-- ===========================================
-- ACCESS CONTROL UTILITY FUNCTIONS
-- ===========================================

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_training_permission(
    p_user_id UUID,
    p_permission_type training_permission_type,
    p_resource_type VARCHAR(50),
    p_resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    user_restaurant_id UUID;
BEGIN
    -- Get user's restaurant
    SELECT restaurant_id INTO user_restaurant_id
    FROM auth_users WHERE id = p_user_id;
    
    -- Check direct role permissions
    SELECT EXISTS (
        SELECT 1
        FROM training_user_roles tur
        JOIN training_role_permissions trp ON tur.role_id = trp.role_id
        WHERE tur.user_id = p_user_id
        AND tur.is_active = true
        AND tur.restaurant_id = user_restaurant_id
        AND trp.permission_type = p_permission_type
        AND trp.resource_type = p_resource_type
        AND (trp.resource_identifier = '*' OR trp.resource_identifier = p_resource_id::TEXT)
        AND (trp.valid_until IS NULL OR trp.valid_until > NOW())
        AND trp.valid_from <= NOW()
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_training_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_type training_permission_type,
    resource_type VARCHAR(50),
    resource_identifier VARCHAR(100),
    access_level training_access_level,
    role_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        trp.permission_type,
        trp.resource_type,
        trp.resource_identifier,
        trp.access_level,
        tr.role_name
    FROM training_user_roles tur
    JOIN training_roles tr ON tur.role_id = tr.id
    JOIN training_role_permissions trp ON tr.id = trp.role_id
    WHERE tur.user_id = p_user_id
    AND tur.is_active = true
    AND tr.is_active = true
    AND (tur.effective_until IS NULL OR tur.effective_until > NOW())
    AND (trp.valid_until IS NULL OR trp.valid_until > NOW())
    AND trp.valid_from <= NOW()
    ORDER BY tr.hierarchy_level, trp.permission_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log access attempts
CREATE OR REPLACE FUNCTION log_training_access_attempt(
    p_user_id UUID,
    p_content_type VARCHAR(50),
    p_content_id UUID,
    p_access_granted BOOLEAN,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_denial_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    user_restaurant_id UUID;
BEGIN
    -- Get user's restaurant
    SELECT restaurant_id INTO user_restaurant_id
    FROM auth_users WHERE id = p_user_id;
    
    -- Insert audit log entry
    INSERT INTO training_access_audit_log (
        user_id,
        content_type,
        content_id,
        restaurant_id,
        access_granted,
        denial_reason,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_user_id,
        p_content_type,
        p_content_id,
        user_restaurant_id,
        p_access_granted,
        p_denial_reason,
        p_ip_address,
        p_user_agent,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- DEFAULT TRAINING ROLES SETUP
-- ===========================================

-- Insert default system roles for each restaurant
INSERT INTO training_roles (restaurant_id, role_name, role_code, description, hierarchy_level, is_system_role, requires_mfa)
SELECT 
    r.id,
    'Training Administrator',
    'TRAINING_ADMIN',
    'Full access to all training content and user management',
    1,
    true,
    true
FROM restaurants r
ON CONFLICT (restaurant_id, role_code) DO NOTHING;

INSERT INTO training_roles (restaurant_id, role_name, role_code, description, hierarchy_level, is_system_role)
SELECT 
    r.id,
    'Training Manager',
    'TRAINING_MANAGER',
    'Manage training content and monitor progress',
    2,
    true
FROM restaurants r
ON CONFLICT (restaurant_id, role_code) DO NOTHING;

INSERT INTO training_roles (restaurant_id, role_name, role_code, description, hierarchy_level, is_system_role)
SELECT 
    r.id,
    'Trainer',
    'TRAINER',
    'Create and deliver training content',
    3,
    true
FROM restaurants r
ON CONFLICT (restaurant_id, role_code) DO NOTHING;

INSERT INTO training_roles (restaurant_id, role_name, role_code, description, hierarchy_level, is_system_role)
SELECT 
    r.id,
    'Training Participant',
    'PARTICIPANT',
    'Access assigned training content',
    4,
    true
FROM restaurants r
ON CONFLICT (restaurant_id, role_code) DO NOTHING;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE training_roles IS 'Training system roles with hierarchical permissions and access control';
COMMENT ON TABLE training_role_permissions IS 'Granular permissions assigned to training roles';
COMMENT ON TABLE training_user_roles IS 'User assignments to training roles with time-based restrictions';
COMMENT ON TABLE training_content_access_control IS 'Access control metadata for training content with security classifications';
COMMENT ON TABLE training_access_requests IS 'User requests for additional access to restricted training content';
COMMENT ON TABLE training_access_audit_log IS 'Comprehensive audit trail of all training content access attempts';

-- Performance optimization
ANALYZE training_roles;
ANALYZE training_role_permissions;
ANALYZE training_user_roles;
ANALYZE training_content_access_control;
ANALYZE training_access_requests;
ANALYZE training_access_audit_log;