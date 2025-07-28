-- Restaurant Krong Thai SOP Management System
-- IoT Kitchen Monitoring and Device Integration Schema
-- Migration 068: IoT System Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- IoT Device Types enum
CREATE TYPE iot_device_type AS ENUM (
  'temperature_sensor',
  'humidity_sensor',
  'pressure_sensor',
  'door_sensor',
  'motion_sensor',
  'weight_scale',
  'refrigerator',
  'freezer',
  'oven',
  'grill',
  'fryer',
  'dishwasher',
  'ventilation_fan',
  'ice_machine',
  'coffee_maker',
  'pos_terminal',
  'camera',
  'beacon',
  'gateway',
  'other'
);

-- IoT Device Status enum
CREATE TYPE iot_device_status AS ENUM (
  'active',
  'inactive',
  'maintenance',
  'error',
  'offline',
  'updating'
);

-- IoT Alert Severity enum
CREATE TYPE iot_alert_severity AS ENUM (
  'info',
  'warning',
  'critical',
  'emergency'
);

-- IoT Maintenance Status enum
CREATE TYPE iot_maintenance_status AS ENUM (
  'scheduled',
  'due',
  'overdue',
  'in_progress',
  'completed',
  'cancelled'
);

-- IoT Devices table
CREATE TABLE iot_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  device_type iot_device_type NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_name_fr VARCHAR(255),
  description TEXT,
  description_fr TEXT,
  
  -- Device identification
  mac_address VARCHAR(17) UNIQUE,
  serial_number VARCHAR(100) UNIQUE,
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  firmware_version VARCHAR(50),
  
  -- Location and installation
  location VARCHAR(255),
  location_fr VARCHAR(255),
  zone VARCHAR(100), -- kitchen, dining, storage, etc.
  coordinates JSONB, -- {x, y, z} coordinates within restaurant
  installation_date TIMESTAMPTZ,
  
  -- Status and connectivity
  status iot_device_status DEFAULT 'inactive',
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  ip_address INET,
  
  -- Configuration
  config JSONB DEFAULT '{}',
  thresholds JSONB DEFAULT '{}', -- alert thresholds
  calibration_data JSONB DEFAULT '{}',
  
  -- Maintenance
  maintenance_schedule JSONB DEFAULT '{}',
  warranty_expires_at TIMESTAMPTZ,
  
  -- Audit fields
  created_by UUID REFERENCES auth_users(id),
  updated_by UUID REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IoT Sensor Data table
CREATE TABLE iot_sensor_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  
  -- Sensor readings
  temperature DECIMAL(5,2), -- Celsius
  humidity DECIMAL(5,2), -- Percentage
  pressure DECIMAL(8,2), -- Pascal
  motion_detected BOOLEAN,
  door_open BOOLEAN,
  weight DECIMAL(10,3), -- Kilograms
  
  -- Generic sensor data
  sensor_type VARCHAR(50),
  value DECIMAL(15,6),
  unit VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  
  -- Data quality
  quality_score DECIMAL(3,2) DEFAULT 1.0, -- 0-1 scale
  is_anomaly BOOLEAN DEFAULT false,
  
  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IoT Equipment Status table
CREATE TABLE iot_equipment_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  
  -- Equipment state
  is_running BOOLEAN DEFAULT false,
  power_consumption DECIMAL(8,3), -- kWh
  cycle_count INTEGER DEFAULT 0,
  runtime_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Performance metrics
  efficiency_percentage DECIMAL(5,2),
  temperature_avg DECIMAL(5,2),
  vibration_level DECIMAL(8,4),
  error_count INTEGER DEFAULT 0,
  
  -- Predictive maintenance
  health_score DECIMAL(3,2) DEFAULT 1.0, -- 0-1 scale
  remaining_life_days INTEGER,
  next_maintenance_date TIMESTAMPTZ,
  
  -- Status data
  status_data JSONB DEFAULT '{}',
  error_codes TEXT[],
  
  -- Timestamps
  status_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IoT Alerts table
CREATE TABLE iot_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(100) NOT NULL,
  severity iot_alert_severity NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_fr VARCHAR(255),
  message TEXT NOT NULL,
  message_fr TEXT,
  
  -- Alert conditions
  threshold_value DECIMAL(15,6),
  actual_value DECIMAL(15,6),
  condition_met VARCHAR(100), -- "above", "below", "equals", etc.
  
  -- Status and resolution
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth_users(id),
  acknowledged_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth_users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolution_notes_fr TEXT,
  
  -- Escalation
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES auth_users(id),
  
  -- Notification tracking
  notifications_sent JSONB DEFAULT '[]',
  
  -- Alert data
  alert_data JSONB DEFAULT '{}',
  
  -- Timestamps
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IoT Maintenance Schedule table
CREATE TABLE iot_maintenance_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  
  -- Maintenance details
  maintenance_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_fr VARCHAR(255),
  description TEXT,
  description_fr TEXT,
  
  -- Scheduling
  scheduled_date TIMESTAMPTZ NOT NULL,
  estimated_duration_minutes INTEGER DEFAULT 60,
  recurrence_pattern VARCHAR(50), -- "daily", "weekly", "monthly", "quarterly", "annually"
  recurrence_config JSONB DEFAULT '{}',
  
  -- Assignment
  assigned_to UUID REFERENCES auth_users(id),
  assigned_team TEXT[],
  
  -- Status
  status iot_maintenance_status DEFAULT 'scheduled',
  priority VARCHAR(20) DEFAULT 'medium',
  
  -- Completion
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_duration_minutes INTEGER,
  completion_notes TEXT,
  completion_notes_fr TEXT,
  parts_used JSONB DEFAULT '[]',
  cost_estimate DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  
  -- Next maintenance prediction
  next_due_date TIMESTAMPTZ,
  predictive_score DECIMAL(3,2), -- 0-1 scale for urgency
  
  -- Audit fields
  created_by UUID REFERENCES auth_users(id),
  updated_by UUID REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IoT Analytics Data table
CREATE TABLE iot_analytics_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  device_id UUID REFERENCES iot_devices(id) ON DELETE CASCADE,
  
  -- Analytics period
  date_period DATE NOT NULL,
  hour_period INTEGER, -- 0-23 for hourly data
  
  -- Aggregated metrics
  avg_temperature DECIMAL(5,2),
  min_temperature DECIMAL(5,2),
  max_temperature DECIMAL(5,2),
  avg_humidity DECIMAL(5,2),
  min_humidity DECIMAL(5,2),
  max_humidity DECIMAL(5,2),
  
  -- Equipment metrics
  total_runtime_minutes INTEGER DEFAULT 0,
  power_consumption_kwh DECIMAL(10,4) DEFAULT 0,
  cycle_count INTEGER DEFAULT 0,
  efficiency_score DECIMAL(3,2),
  
  -- Alert metrics
  total_alerts INTEGER DEFAULT 0,
  critical_alerts INTEGER DEFAULT 0,
  avg_response_time_minutes DECIMAL(8,2),
  
  -- Performance metrics
  uptime_percentage DECIMAL(5,2) DEFAULT 100,
  health_score DECIMAL(3,2) DEFAULT 1.0,
  anomaly_count INTEGER DEFAULT 0,
  
  -- Custom metrics
  custom_metrics JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for period
  UNIQUE(restaurant_id, device_id, date_period, hour_period)
);

-- IoT Firmware Updates table
CREATE TABLE iot_firmware_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Firmware details
  manufacturer VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  previous_version VARCHAR(50),
  
  -- Update package
  package_url VARCHAR(500),
  package_size_bytes BIGINT,
  package_checksum VARCHAR(128),
  encryption_key VARCHAR(256),
  
  -- Release information
  release_notes TEXT,
  release_notes_fr TEXT,
  security_fixes TEXT[],
  bug_fixes TEXT[],
  new_features TEXT[],
  
  -- Deployment
  is_mandatory BOOLEAN DEFAULT false,
  is_rollback BOOLEAN DEFAULT false,
  rollback_from_version VARCHAR(50),
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  
  -- Validation
  test_results JSONB DEFAULT '{}',
  approved_by UUID REFERENCES auth_users(id),
  approved_at TIMESTAMPTZ,
  
  -- Audit fields
  created_by UUID REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(manufacturer, model, version)
);

-- IoT Device Updates table
CREATE TABLE iot_device_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  firmware_update_id UUID NOT NULL REFERENCES iot_firmware_updates(id) ON DELETE CASCADE,
  
  -- Update process
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, downloading, installing, completed, failed, rolled_back
  progress_percentage INTEGER DEFAULT 0,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  success BOOLEAN,
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Backup
  backup_created BOOLEAN DEFAULT false,
  backup_location VARCHAR(500),
  
  -- Validation
  pre_update_version VARCHAR(50),
  post_update_version VARCHAR(50),
  validation_tests JSONB DEFAULT '{}',
  
  -- Rollback capability
  can_rollback BOOLEAN DEFAULT true,
  rollback_performed BOOLEAN DEFAULT false,
  rollback_reason TEXT,
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_iot_devices_restaurant_id ON iot_devices(restaurant_id);
CREATE INDEX idx_iot_devices_status ON iot_devices(status);
CREATE INDEX idx_iot_devices_type ON iot_devices(device_type);
CREATE INDEX idx_iot_devices_mac_address ON iot_devices(mac_address);

CREATE INDEX idx_iot_sensor_data_device_id ON iot_sensor_data(device_id);
CREATE INDEX idx_iot_sensor_data_recorded_at ON iot_sensor_data(recorded_at);
CREATE INDEX idx_iot_sensor_data_device_recorded ON iot_sensor_data(device_id, recorded_at);

CREATE INDEX idx_iot_equipment_status_device_id ON iot_equipment_status(device_id);
CREATE INDEX idx_iot_equipment_status_at ON iot_equipment_status(status_at);

CREATE INDEX idx_iot_alerts_device_id ON iot_alerts(device_id);
CREATE INDEX idx_iot_alerts_restaurant_id ON iot_alerts(restaurant_id);
CREATE INDEX idx_iot_alerts_severity ON iot_alerts(severity);
CREATE INDEX idx_iot_alerts_resolved ON iot_alerts(is_resolved);
CREATE INDEX idx_iot_alerts_triggered_at ON iot_alerts(triggered_at);

CREATE INDEX idx_iot_maintenance_device_id ON iot_maintenance_schedule(device_id);
CREATE INDEX idx_iot_maintenance_restaurant_id ON iot_maintenance_schedule(restaurant_id);
CREATE INDEX idx_iot_maintenance_status ON iot_maintenance_schedule(status);
CREATE INDEX idx_iot_maintenance_scheduled_date ON iot_maintenance_schedule(scheduled_date);

CREATE INDEX idx_iot_analytics_restaurant_id ON iot_analytics_data(restaurant_id);
CREATE INDEX idx_iot_analytics_device_id ON iot_analytics_data(device_id);
CREATE INDEX idx_iot_analytics_date_period ON iot_analytics_data(date_period);

CREATE INDEX idx_iot_firmware_manufacturer_model ON iot_firmware_updates(manufacturer, model);
CREATE INDEX idx_iot_firmware_published ON iot_firmware_updates(is_published);

CREATE INDEX idx_iot_device_updates_device_id ON iot_device_updates(device_id);
CREATE INDEX idx_iot_device_updates_status ON iot_device_updates(status);
CREATE INDEX idx_iot_device_updates_scheduled_at ON iot_device_updates(scheduled_at);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_iot_devices_updated_at BEFORE UPDATE ON iot_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iot_alerts_updated_at BEFORE UPDATE ON iot_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iot_maintenance_schedule_updated_at BEFORE UPDATE ON iot_maintenance_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iot_analytics_data_updated_at BEFORE UPDATE ON iot_analytics_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iot_firmware_updates_updated_at BEFORE UPDATE ON iot_firmware_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iot_device_updates_updated_at BEFORE UPDATE ON iot_device_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE iot_devices IS 'IoT devices registered in restaurant kitchens for monitoring and automation';
COMMENT ON TABLE iot_sensor_data IS 'Real-time sensor data from IoT devices including temperature, humidity, and other metrics';
COMMENT ON TABLE iot_equipment_status IS 'Equipment status tracking for predictive maintenance and performance monitoring';
COMMENT ON TABLE iot_alerts IS 'Automated alerts from IoT devices with escalation and notification tracking';
COMMENT ON TABLE iot_maintenance_schedule IS 'Scheduled and predictive maintenance for IoT equipment';
COMMENT ON TABLE iot_analytics_data IS 'Aggregated analytics data for IoT device performance and insights';
COMMENT ON TABLE iot_firmware_updates IS 'Firmware update packages for IoT devices';
COMMENT ON TABLE iot_device_updates IS 'Device-specific firmware update tracking and status';