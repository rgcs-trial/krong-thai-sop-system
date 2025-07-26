-- User Devices Table Migration
-- Support for device binding and management in the security system
-- Created: 2025-07-26

-- Create device type enum
CREATE TYPE device_type AS ENUM ('tablet', 'desktop', 'mobile');

-- Create user_devices table
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    fingerprint_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type device_type NOT NULL DEFAULT 'tablet',
    location VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    is_active BOOLEAN DEFAULT true,
    is_trusted BOOLEAN DEFAULT false,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    trusted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT fk_user_devices_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON user_devices(fingerprint_hash);
CREATE INDEX idx_user_devices_active ON user_devices(is_active);
CREATE INDEX idx_user_devices_trusted ON user_devices(is_trusted);
CREATE INDEX idx_user_devices_last_used ON user_devices(last_used_at);
CREATE INDEX idx_user_devices_user_active ON user_devices(user_id, is_active);

-- Composite index for device lookup
CREATE UNIQUE INDEX idx_user_devices_user_fingerprint_active 
ON user_devices(user_id, fingerprint_hash) 
WHERE is_active = true;

-- Create trigger for updated_at
CREATE TRIGGER update_user_devices_updated_at 
    BEFORE UPDATE ON user_devices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_devices
CREATE POLICY "Users can manage their own devices"
ON user_devices FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
    OR auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE role IN ('admin', 'manager')
        AND restaurant_id = (
            SELECT restaurant_id FROM auth_users WHERE id = user_devices.user_id
        )
    )
);

-- Function to clean up expired devices
CREATE OR REPLACE FUNCTION cleanup_expired_devices()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mark devices as inactive if not used for more than 30 days
    UPDATE user_devices 
    SET is_active = false,
        updated_at = NOW()
    WHERE is_active = true 
    AND last_used_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get device stats for a user
CREATE OR REPLACE FUNCTION get_user_device_stats(p_user_id UUID)
RETURNS TABLE(
    total_devices INTEGER,
    active_devices INTEGER,
    trusted_devices INTEGER,
    tablet_devices INTEGER,
    last_device_used TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_devices,
        COUNT(*) FILTER (WHERE is_active = true)::INTEGER as active_devices,
        COUNT(*) FILTER (WHERE is_trusted = true AND is_active = true)::INTEGER as trusted_devices,
        COUNT(*) FILTER (WHERE type = 'tablet' AND is_active = true)::INTEGER as tablet_devices,
        MAX(last_used_at) as last_device_used
    FROM user_devices
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add some comments for documentation
COMMENT ON TABLE user_devices IS 'Stores device fingerprints and binding information for users';
COMMENT ON COLUMN user_devices.fingerprint_hash IS 'SHA-256 hash of device fingerprint for identification';
COMMENT ON COLUMN user_devices.name IS 'User-friendly device name (e.g., "Kitchen Tablet #1")';
COMMENT ON COLUMN user_devices.type IS 'Device type (tablet, desktop, mobile)';
COMMENT ON COLUMN user_devices.is_trusted IS 'Whether this device is explicitly trusted by admin';
COMMENT ON COLUMN user_devices.metadata IS 'Additional device information (screen resolution, capabilities, etc.)';

-- Insert some sample device registrations for testing
INSERT INTO user_devices (user_id, fingerprint_hash, name, type, user_agent, ip_address, is_trusted) VALUES
(
    '660e8400-e29b-41d4-a716-446655440000', -- admin user
    'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
    'Admin Tablet #1',
    'tablet',
    'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    '192.168.1.100',
    true
),
(
    '770e8400-e29b-41d4-a716-446655440000', -- manager user
    'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
    'Manager Tablet #1',
    'tablet',
    'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    '192.168.1.101',
    true
),
(
    '880e8400-e29b-41d4-a716-446655440000', -- staff user
    'c3d4e5f6789012345678901234567890123456789012345678901234567890a1b2',
    'Kitchen Tablet #1',
    'tablet',
    'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    '192.168.1.102',
    false
);

-- Analyze table for better query planning
ANALYZE user_devices;