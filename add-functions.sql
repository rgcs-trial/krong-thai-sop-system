-- Add missing database functions for Krong Thai SOP System
-- This script adds the essential functions needed for authentication and auditing

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PIN validation function for secure authentication
CREATE OR REPLACE FUNCTION validate_pin(user_email TEXT, pin_input TEXT)
RETURNS TABLE(
    user_id UUID,
    is_valid BOOLEAN,
    role user_role,
    restaurant_id UUID,
    full_name VARCHAR(255),
    full_name_th VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        (u.pin_hash = crypt(pin_input, u.pin_hash)) as is_valid,
        u.role,
        u.restaurant_id,
        u.full_name,
        u.full_name_th
    FROM auth_users u
    WHERE u.email = user_email 
    AND u.is_active = true
    AND (u.locked_until IS NULL OR u.locked_until < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_restaurant_id UUID,
    p_user_id UUID,
    p_action audit_action,
    p_resource_type VARCHAR(100),
    p_resource_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        restaurant_id, user_id, action, resource_type, resource_id,
        old_values, new_values, metadata
    ) VALUES (
        p_restaurant_id, p_user_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_metadata
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;