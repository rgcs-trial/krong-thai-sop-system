-- Restaurant Krong Thai SOP Management System
-- IoT System Row Level Security Policies
-- Migration 069: IoT RLS Policies

-- Enable RLS on all IoT tables
ALTER TABLE iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_equipment_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_maintenance_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_firmware_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_device_updates ENABLE ROW LEVEL SECURITY;

-- IoT Devices Policies
CREATE POLICY "iot_devices_restaurant_access" ON iot_devices
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "iot_devices_insert_manager_admin" ON iot_devices
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "iot_devices_update_manager_admin" ON iot_devices
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- IoT Sensor Data Policies
CREATE POLICY "iot_sensor_data_restaurant_access" ON iot_sensor_data
  FOR SELECT USING (
    device_id IN (
      SELECT id FROM iot_devices 
      WHERE restaurant_id IN (
        SELECT restaurant_id FROM auth_users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "iot_sensor_data_insert_system" ON iot_sensor_data
  FOR INSERT WITH CHECK (
    device_id IN (
      SELECT id FROM iot_devices 
      WHERE restaurant_id IN (
        SELECT restaurant_id FROM auth_users 
        WHERE id = auth.uid()
      )
    )
  );

-- IoT Equipment Status Policies
CREATE POLICY "iot_equipment_status_restaurant_access" ON iot_equipment_status
  FOR SELECT USING (
    device_id IN (
      SELECT id FROM iot_devices 
      WHERE restaurant_id IN (
        SELECT restaurant_id FROM auth_users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "iot_equipment_status_insert_system" ON iot_equipment_status
  FOR INSERT WITH CHECK (
    device_id IN (
      SELECT id FROM iot_devices 
      WHERE restaurant_id IN (
        SELECT restaurant_id FROM auth_users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "iot_equipment_status_update_manager_admin" ON iot_equipment_status
  FOR UPDATE USING (
    device_id IN (
      SELECT id FROM iot_devices 
      WHERE restaurant_id IN (
        SELECT restaurant_id FROM auth_users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  );

-- IoT Alerts Policies
CREATE POLICY "iot_alerts_restaurant_access" ON iot_alerts
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "iot_alerts_insert_system" ON iot_alerts
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "iot_alerts_update_acknowledge" ON iot_alerts
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    )
  );

-- IoT Maintenance Schedule Policies
CREATE POLICY "iot_maintenance_restaurant_access" ON iot_maintenance_schedule
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "iot_maintenance_insert_manager_admin" ON iot_maintenance_schedule
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "iot_maintenance_update_assigned_or_manager" ON iot_maintenance_schedule
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    ) AND (
      assigned_to = auth.uid() OR
      auth.uid() IN (
        SELECT id FROM auth_users 
        WHERE restaurant_id = iot_maintenance_schedule.restaurant_id 
        AND role IN ('admin', 'manager')
      )
    )
  );

-- IoT Analytics Data Policies
CREATE POLICY "iot_analytics_restaurant_access" ON iot_analytics_data
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "iot_analytics_insert_system" ON iot_analytics_data
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "iot_analytics_update_system" ON iot_analytics_data
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM auth_users 
      WHERE id = auth.uid()
    )
  );

-- IoT Firmware Updates Policies (Global access with role restrictions)
CREATE POLICY "iot_firmware_select_all" ON iot_firmware_updates
  FOR SELECT USING (true);

CREATE POLICY "iot_firmware_insert_admin" ON iot_firmware_updates
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth_users 
      WHERE role = 'admin'
    )
  );

CREATE POLICY "iot_firmware_update_admin" ON iot_firmware_updates
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth_users 
      WHERE role = 'admin'
    )
  );

-- IoT Device Updates Policies
CREATE POLICY "iot_device_updates_restaurant_access" ON iot_device_updates
  FOR SELECT USING (
    device_id IN (
      SELECT id FROM iot_devices 
      WHERE restaurant_id IN (
        SELECT restaurant_id FROM auth_users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "iot_device_updates_insert_manager_admin" ON iot_device_updates
  FOR INSERT WITH CHECK (
    device_id IN (
      SELECT id FROM iot_devices 
      WHERE restaurant_id IN (
        SELECT restaurant_id FROM auth_users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  );

CREATE POLICY "iot_device_updates_update_manager_admin" ON iot_device_updates
  FOR UPDATE USING (
    device_id IN (
      SELECT id FROM iot_devices 
      WHERE restaurant_id IN (
        SELECT restaurant_id FROM auth_users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT ON iot_devices TO authenticated;
GRANT SELECT ON iot_sensor_data TO authenticated;
GRANT SELECT ON iot_equipment_status TO authenticated;
GRANT SELECT ON iot_alerts TO authenticated;
GRANT SELECT ON iot_maintenance_schedule TO authenticated;
GRANT SELECT ON iot_analytics_data TO authenticated;
GRANT SELECT ON iot_firmware_updates TO authenticated;
GRANT SELECT ON iot_device_updates TO authenticated;

-- Grant INSERT/UPDATE permissions based on role
GRANT INSERT, UPDATE ON iot_devices TO authenticated;
GRANT INSERT ON iot_sensor_data TO authenticated;
GRANT INSERT, UPDATE ON iot_equipment_status TO authenticated;
GRANT INSERT, UPDATE ON iot_alerts TO authenticated;
GRANT INSERT, UPDATE ON iot_maintenance_schedule TO authenticated;
GRANT INSERT, UPDATE ON iot_analytics_data TO authenticated;
GRANT INSERT, UPDATE ON iot_firmware_updates TO authenticated;
GRANT INSERT, UPDATE ON iot_device_updates TO authenticated;

-- Create function to check device ownership
CREATE OR REPLACE FUNCTION check_device_restaurant_access(device_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM iot_devices d
    JOIN auth_users u ON d.restaurant_id = u.restaurant_id
    WHERE d.id = device_uuid AND u.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check maintenance assignment
CREATE OR REPLACE FUNCTION check_maintenance_assignment(maintenance_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM iot_maintenance_schedule m
    JOIN auth_users u ON m.restaurant_id = u.restaurant_id
    WHERE m.id = maintenance_uuid 
    AND (
      m.assigned_to = auth.uid() OR
      u.role IN ('admin', 'manager')
    )
    AND u.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user restaurant devices
CREATE OR REPLACE FUNCTION get_user_restaurant_devices()
RETURNS TABLE(device_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id FROM iot_devices d
  JOIN auth_users u ON d.restaurant_id = u.restaurant_id
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON POLICY "iot_devices_restaurant_access" ON iot_devices IS 'Users can access IoT devices in their restaurant';
COMMENT ON POLICY "iot_sensor_data_restaurant_access" ON iot_sensor_data IS 'Users can view sensor data from devices in their restaurant';
COMMENT ON POLICY "iot_alerts_restaurant_access" ON iot_alerts IS 'Users can view and manage alerts from their restaurant devices';
COMMENT ON POLICY "iot_maintenance_restaurant_access" ON iot_maintenance_schedule IS 'Users can view maintenance schedules for their restaurant devices';
COMMENT ON FUNCTION check_device_restaurant_access(UUID) IS 'Checks if user has access to specific IoT device';
COMMENT ON FUNCTION check_maintenance_assignment(UUID) IS 'Checks if user can manage specific maintenance task';
COMMENT ON FUNCTION get_user_restaurant_devices() IS 'Returns all device IDs accessible to current user';