-- Restaurant Krong Thai SOP Management System
-- IoT System Sample Data
-- Migration 070: IoT Sample Data

-- Insert sample IoT devices for the main restaurant
INSERT INTO iot_devices (
  id,
  restaurant_id,
  device_type,
  device_name,
  device_name_fr,
  description,
  description_fr,
  mac_address,
  serial_number,
  manufacturer,
  model,
  firmware_version,
  location,
  location_fr,
  zone,
  coordinates,
  installation_date,
  status,
  is_online,
  config,
  thresholds,
  calibration_data,
  maintenance_schedule,
  created_by
) VALUES 
-- Kitchen Temperature Sensors
(
  uuid_generate_v4(),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'temperature_sensor',
  'Kitchen Cold Storage Sensor',
  'Capteur de Stockage Froid Cuisine',
  'Temperature sensor for cold storage area',
  'Capteur de température pour zone de stockage froid',
  '00:1B:63:84:45:E6',
  'KT-TEMP-001',
  'SensorTech',
  'ST-TEMP-PRO',
  '2.1.4',
  'Cold Storage Room',
  'Chambre Froide',
  'kitchen',
  '{"x": 10, "y": 15, "z": 2}',
  NOW() - INTERVAL '30 days',
  'active',
  true,
  '{"sampling_rate": 60, "battery_level": 85}',
  '{"temperature": {"min": -5, "max": 5, "critical_min": -10, "critical_max": 8}}',
  '{"offset": 0.2, "last_calibrated": "2024-01-15"}',
  '{"routine_check": "monthly", "battery_replacement": "annually"}',
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
),
(
  uuid_generate_v4(),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'temperature_sensor',
  'Kitchen Prep Area Sensor',
  'Capteur Zone de Préparation',
  'Temperature sensor for food preparation area',
  'Capteur de température pour zone de préparation',
  '00:1B:63:84:45:E7',
  'KT-TEMP-002',
  'SensorTech',
  'ST-TEMP-PRO',
  '2.1.4',
  'Prep Station',
  'Station de Préparation',
  'kitchen',
  '{"x": 25, "y": 10, "z": 1.5}',
  NOW() - INTERVAL '25 days',
  'active',
  true,
  '{"sampling_rate": 30, "battery_level": 92}',
  '{"temperature": {"min": 18, "max": 25, "critical_min": 15, "critical_max": 30}}',
  '{"offset": -0.1, "last_calibrated": "2024-01-15"}',
  '{"routine_check": "monthly", "battery_replacement": "annually"}',
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
),

-- Refrigerator IoT Device
(
  uuid_generate_v4(),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'refrigerator',
  'Main Kitchen Refrigerator',
  'Réfrigérateur Principal Cuisine',
  'Smart refrigerator with IoT monitoring',
  'Réfrigérateur intelligent avec surveillance IoT',
  '00:1B:63:84:45:E8',
  'KT-FRIDGE-001',
  'CoolTech',
  'CT-SMART-500',
  '3.2.1',
  'Kitchen Main Area',
  'Zone Principale Cuisine',
  'kitchen',
  '{"x": 5, "y": 20, "z": 0}',
  NOW() - INTERVAL '60 days',
  'active',
  true,
  '{"power_monitoring": true, "door_alerts": true, "defrost_cycle": "auto"}',
  '{"temperature": {"min": 2, "max": 6, "critical_min": 0, "critical_max": 10}, "humidity": {"max": 85}}',
  '{"temperature_offset": 0.0, "humidity_offset": 2.0, "last_calibrated": "2024-01-10"}',
  '{"filter_change": "quarterly", "coil_cleaning": "semi_annually", "full_service": "annually"}',
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
),

-- Freezer IoT Device
(
  uuid_generate_v4(),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'freezer',
  'Walk-in Freezer Unit',
  'Congélateur de Marche',
  'Walk-in freezer with temperature monitoring',
  'Congélateur de marche avec surveillance température',
  '00:1B:63:84:45:E9',
  'KT-FREEZE-001',
  'CoolTech',
  'CT-FREEZE-300',
  '3.1.8',
  'Storage Area',
  'Zone de Stockage',
  'storage',
  '{"x": 2, "y": 25, "z": 0}',
  NOW() - INTERVAL '45 days',
  'active',
  true,
  '{"power_monitoring": true, "door_alerts": true, "defrost_cycle": "scheduled"}',
  '{"temperature": {"min": -20, "max": -15, "critical_min": -25, "critical_max": -10}}',
  '{"temperature_offset": 0.5, "last_calibrated": "2024-01-05"}',
  '{"defrost_check": "weekly", "coil_cleaning": "monthly", "full_service": "semi_annually"}',
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
),

-- Kitchen Equipment - Oven
(
  uuid_generate_v4(),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'oven',
  'Commercial Convection Oven',
  'Four à Convection Commercial',
  'Smart commercial oven with temperature control',
  'Four commercial intelligent avec contrôle température',
  '00:1B:63:84:45:EA',
  'KT-OVEN-001',
  'ChefTech',
  'CT-CONV-2000',
  '1.5.3',
  'Cooking Line',
  'Ligne de Cuisson',
  'kitchen',
  '{"x": 30, "y": 5, "z": 0}',
  NOW() - INTERVAL '90 days',
  'active',
  true,
  '{"preheat_monitoring": true, "energy_tracking": true, "maintenance_alerts": true}',
  '{"temperature": {"max": 250}, "power_consumption": {"max": 15000}}',
  '{"temperature_offset": 2.0, "last_calibrated": "2024-01-01"}',
  '{"daily_cleaning": true, "monthly_deep_clean": true, "annual_service": true}',
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
),

-- Humidity Sensor
(
  uuid_generate_v4(),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'humidity_sensor',
  'Dining Area Climate Sensor',
  'Capteur Climatique Salle à Manger',
  'Combined temperature and humidity sensor for dining area',
  'Capteur combiné température et humidité pour salle à manger',
  '00:1B:63:84:45:EB',
  'KT-HUMID-001',
  'ClimateTech',
  'CLT-TH-100',
  '1.8.2',
  'Dining Room',
  'Salle à Manger',
  'dining',
  '{"x": 15, "y": 30, "z": 2.5}',
  NOW() - INTERVAL '20 days',
  'active',
  true,
  '{"sampling_rate": 300, "wireless_range": "high"}',
  '{"temperature": {"min": 20, "max": 26}, "humidity": {"min": 40, "max": 60}}',
  '{"temperature_offset": 0.0, "humidity_offset": 1.5, "last_calibrated": "2024-01-20"}',
  '{"battery_check": "monthly", "sensor_cleaning": "quarterly"}',
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
);

-- Insert sample firmware updates
INSERT INTO iot_firmware_updates (
  id,
  manufacturer,
  model,
  version,
  previous_version,
  package_url,
  package_size_bytes,
  package_checksum,
  release_notes,
  release_notes_fr,
  security_fixes,
  bug_fixes,
  new_features,
  is_mandatory,
  is_rollback,
  is_published,
  published_at,
  test_results,
  created_by,
  approved_by,
  approved_at
) VALUES 
(
  uuid_generate_v4(),
  'SensorTech',
  'ST-TEMP-PRO',
  '2.1.5',
  '2.1.4',
  'https://updates.sensortech.com/ST-TEMP-PRO_2.1.5.bin',
  2048576,
  'sha256:abc123def456',
  'Bug fixes and improved battery management',
  'Corrections de bogues et amélioration de la gestion de la batterie',
  ARRAY['Fixed potential buffer overflow in temperature reading'],
  ARRAY['Improved battery life estimation', 'Fixed occasional sensor freezing'],
  ARRAY['Enhanced low-power mode', 'Better wireless connectivity'],
  false,
  false,
  true,
  NOW() - INTERVAL '5 days',
  '{"compatibility_test": "passed", "stress_test": "passed", "battery_test": "passed"}',
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com'),
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com'),
  NOW() - INTERVAL '3 days'
),
(
  uuid_generate_v4(),
  'CoolTech',
  'CT-SMART-500',
  '3.2.2',
  '3.2.1',
  'https://updates.cooltech.com/CT-SMART-500_3.2.2.bin',
  4194304,
  'sha256:def789ghi012',
  'Security update and new energy efficiency features',
  'Mise à jour de sécurité et nouvelles fonctionnalités d\'efficacité énergétique',
  ARRAY['Patched authentication vulnerability', 'Updated TLS certificates'],
  ARRAY['Fixed door sensor calibration issue', 'Improved temperature stability'],
  ARRAY['Smart defrost scheduling', 'Energy usage analytics'],
  true,
  false,
  true,
  NOW() - INTERVAL '2 days',
  '{"security_audit": "passed", "energy_test": "passed", "door_test": "passed"}',
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com'),
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com'),
  NOW() - INTERVAL '1 day'
);

-- Insert sample sensor data (last 7 days)
-- This would typically be generated by actual IoT devices
DO $$
DECLARE
    device_record RECORD;
    sample_date DATE;
    sample_hour INTEGER;
    temp_value DECIMAL;
    humid_value DECIMAL;
BEGIN
    -- Loop through devices and generate sample data
    FOR device_record IN 
        SELECT id, device_type FROM iot_devices 
        WHERE restaurant_id = (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant')
    LOOP
        -- Generate data for last 7 days
        FOR i IN 0..6 LOOP
            sample_date := CURRENT_DATE - i;
            
            -- Generate hourly data for some sensors
            IF device_record.device_type IN ('temperature_sensor', 'humidity_sensor') THEN
                FOR sample_hour IN 6..22 LOOP -- Business hours data
                    -- Generate realistic temperature values based on device type
                    CASE device_record.device_type
                        WHEN 'temperature_sensor' THEN
                            temp_value := 3.0 + (RANDOM() * 4.0); -- 3-7°C for cold storage
                        WHEN 'humidity_sensor' THEN
                            temp_value := 22.0 + (RANDOM() * 4.0); -- 22-26°C for dining area
                            humid_value := 45.0 + (RANDOM() * 10.0); -- 45-55% humidity
                        ELSE
                            temp_value := 20.0 + (RANDOM() * 5.0);
                    END CASE;
                    
                    INSERT INTO iot_sensor_data (
                        device_id,
                        temperature,
                        humidity,
                        sensor_type,
                        quality_score,
                        is_anomaly,
                        recorded_at,
                        received_at
                    ) VALUES (
                        device_record.id,
                        temp_value,
                        CASE WHEN device_record.device_type = 'humidity_sensor' THEN humid_value ELSE NULL END,
                        device_record.device_type,
                        0.95 + (RANDOM() * 0.05), -- Quality score between 0.95-1.0
                        RANDOM() < 0.02, -- 2% chance of anomaly
                        sample_date + (sample_hour || ' hours')::INTERVAL + (RANDOM() * 60 || ' minutes')::INTERVAL,
                        sample_date + (sample_hour || ' hours')::INTERVAL + (RANDOM() * 60 || ' minutes')::INTERVAL + '5 seconds'::INTERVAL
                    );
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Insert sample equipment status data
DO $$
DECLARE
    device_record RECORD;
    sample_date DATE;
    runtime_hours DECIMAL;
    power_consumption DECIMAL;
    efficiency_pct DECIMAL;
    health_score DECIMAL;
BEGIN
    FOR device_record IN 
        SELECT id, device_type FROM iot_devices 
        WHERE restaurant_id = (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant')
        AND device_type IN ('refrigerator', 'freezer', 'oven')
    LOOP
        FOR i IN 0..6 LOOP
            sample_date := CURRENT_DATE - i;
            
            -- Generate realistic equipment metrics
            CASE device_record.device_type
                WHEN 'refrigerator' THEN
                    runtime_hours := 22.0 + (RANDOM() * 2.0); -- Almost always running
                    power_consumption := 3.5 + (RANDOM() * 1.0); -- 3.5-4.5 kWh
                    efficiency_pct := 85.0 + (RANDOM() * 10.0); -- 85-95%
                WHEN 'freezer' THEN
                    runtime_hours := 23.0 + (RANDOM() * 1.0); -- Always running
                    power_consumption := 5.0 + (RANDOM() * 1.5); -- 5.0-6.5 kWh
                    efficiency_pct := 80.0 + (RANDOM() * 15.0); -- 80-95%
                WHEN 'oven' THEN
                    runtime_hours := 8.0 + (RANDOM() * 4.0); -- 8-12 hours during service
                    power_consumption := 12.0 + (RANDOM() * 8.0); -- 12-20 kWh
                    efficiency_pct := 75.0 + (RANDOM() * 20.0); -- 75-95%
            END CASE;
            
            health_score := 0.85 + (RANDOM() * 0.1); -- 85-95% health
            
            INSERT INTO iot_equipment_status (
                device_id,
                is_running,
                power_consumption,
                cycle_count,
                runtime_hours,
                efficiency_percentage,
                temperature_avg,
                error_count,
                health_score,
                status_data,
                error_codes,
                status_at
            ) VALUES (
                device_record.id,
                RANDOM() < 0.9, -- 90% chance of running
                power_consumption,
                FLOOR(RANDOM() * 50)::INTEGER, -- 0-50 cycles
                runtime_hours,
                efficiency_pct,
                CASE 
                    WHEN device_record.device_type = 'refrigerator' THEN 4.0 + (RANDOM() * 2.0)
                    WHEN device_record.device_type = 'freezer' THEN -18.0 + (RANDOM() * 2.0)
                    WHEN device_record.device_type = 'oven' THEN 45.0 + (RANDOM() * 10.0)
                END,
                CASE WHEN RANDOM() < 0.1 THEN FLOOR(RANDOM() * 3)::INTEGER ELSE 0 END, -- Occasional errors
                health_score,
                '{"last_maintenance": "2024-01-15", "next_service": "2024-07-15"}',
                CASE WHEN RANDOM() < 0.05 THEN ARRAY['WARN_001'] ELSE ARRAY[]::TEXT[] END,
                sample_date + '14:00:00'::TIME + (RANDOM() * 8 || ' hours')::INTERVAL
            );
        END LOOP;
    END LOOP;
END $$;

-- Insert some sample alerts
INSERT INTO iot_alerts (
  id,
  device_id,
  restaurant_id,
  alert_type,
  severity,
  title,
  title_fr,
  message,
  message_fr,
  threshold_value,
  actual_value,
  condition_met,
  is_acknowledged,
  is_resolved,
  escalation_level,
  alert_data,
  triggered_at
) VALUES 
(
  uuid_generate_v4(),
  (SELECT id FROM iot_devices WHERE device_name = 'Kitchen Cold Storage Sensor'),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'temperature_high',
  'warning',
  'Temperature Above Threshold',
  'Température Au-dessus du Seuil',
  'Cold storage temperature reached 7°C, exceeding safe threshold of 5°C',
  'La température de stockage froid a atteint 7°C, dépassant le seuil de sécurité de 5°C',
  5.0,
  7.2,
  'above',
  true,
  true,
  0,
  '{"location": "Cold Storage Room", "duration_minutes": 15}',
  NOW() - INTERVAL '2 days'
),
(
  uuid_generate_v4(),
  (SELECT id FROM iot_devices WHERE device_name = 'Main Kitchen Refrigerator'),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'door_open_extended',
  'info',
  'Door Left Open',
  'Porte Laissée Ouverte',
  'Refrigerator door has been open for more than 5 minutes',
  'La porte du réfrigérateur est restée ouverte pendant plus de 5 minutes',
  300,
  420,
  'extended_open',
  true,
  true,
  0,
  '{"location": "Kitchen Main Area", "door_open_duration": 420}',
  NOW() - INTERVAL '1 day'
),
(
  uuid_generate_v4(),
  (SELECT id FROM iot_devices WHERE device_name = 'Commercial Convection Oven'),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'maintenance_due',
  'warning',
  'Scheduled Maintenance Due',
  'Maintenance Programmée Due',
  'Equipment is due for scheduled maintenance based on usage hours',
  'L\'équipement nécessite une maintenance programmée basée sur les heures d\'utilisation',
  2000,
  2150,
  'above',
  false,
  false,
  0,
  '{"usage_hours": 2150, "last_maintenance": "2024-01-01"}',
  NOW() - INTERVAL '6 hours'
);

-- Insert sample maintenance schedules
INSERT INTO iot_maintenance_schedule (
  id,
  device_id,
  restaurant_id,
  maintenance_type,
  title,
  title_fr,
  description,
  description_fr,
  scheduled_date,
  estimated_duration_minutes,
  status,
  priority,
  assigned_to,
  predictive_score,
  created_by
) VALUES 
(
  uuid_generate_v4(),
  (SELECT id FROM iot_devices WHERE device_name = 'Main Kitchen Refrigerator'),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'routine',
  'Monthly Filter Replacement',
  'Remplacement Mensuel du Filtre',
  'Replace air filter and check refrigerant levels',
  'Remplacer le filtre à air et vérifier les niveaux de réfrigérant',
  CURRENT_DATE + INTERVAL '3 days',
  60,
  'scheduled',
  'medium',
  (SELECT id FROM auth_users WHERE email = 'manager@krongthai.com'),
  0.3,
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
),
(
  uuid_generate_v4(),
  (SELECT id FROM iot_devices WHERE device_name = 'Commercial Convection Oven'),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'predictive',
  'Predictive Maintenance - Commercial Convection Oven',
  'Maintenance Prédictive - Four à Convection Commercial',
  'Automated scheduling based on equipment condition analysis. Risk factors: high_runtime, declining_efficiency',
  'Planification automatisée basée sur l\'analyse de l\'état de l\'équipement. Facteurs de risque: high_runtime, declining_efficiency',
  CURRENT_DATE + INTERVAL '1 day',
  120,
  'due',
  'high',
  (SELECT id FROM auth_users WHERE email = 'manager@krongthai.com'),
  0.75,
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
),
(
  uuid_generate_v4(),
  (SELECT id FROM iot_devices WHERE device_name = 'Walk-in Freezer Unit'),
  (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant'),
  'routine',
  'Quarterly Deep Clean',
  'Nettoyage en Profondeur Trimestriel',
  'Deep clean coils, check door seals, and test temperature accuracy',
  'Nettoyer en profondeur les serpentins, vérifier les joints de porte et tester la précision de la température',
  CURRENT_DATE + INTERVAL '7 days',
  180,
  'scheduled',
  'medium',
  (SELECT id FROM auth_users WHERE email = 'chef@krongthai.com'),
  0.2,
  (SELECT id FROM auth_users WHERE email = 'admin@krongthai.com')
);

-- Generate some analytics data for the past week
INSERT INTO iot_analytics_data (
  restaurant_id,
  device_id,
  date_period,
  avg_temperature,
  min_temperature,
  max_temperature,
  avg_humidity,
  min_humidity,
  max_humidity,
  total_runtime_minutes,
  power_consumption_khw,
  cycle_count,
  efficiency_score,
  total_alerts,
  critical_alerts,
  uptime_percentage,
  health_score,
  anomaly_count,
  custom_metrics
)
SELECT 
  d.restaurant_id,
  d.id,
  generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '1 day', '1 day')::DATE,
  CASE 
    WHEN d.device_type = 'temperature_sensor' THEN 3.5 + (RANDOM() * 2.0)
    WHEN d.device_type = 'humidity_sensor' THEN 23.0 + (RANDOM() * 2.0)
    WHEN d.device_type IN ('refrigerator', 'freezer') THEN 
      CASE WHEN d.device_type = 'refrigerator' THEN 4.0 + (RANDOM() * 1.0) 
           ELSE -18.0 + (RANDOM() * 1.0) END
    ELSE NULL
  END,
  CASE 
    WHEN d.device_type = 'temperature_sensor' THEN 2.0 + (RANDOM() * 1.0)
    WHEN d.device_type = 'humidity_sensor' THEN 21.0 + (RANDOM() * 1.0)
    WHEN d.device_type IN ('refrigerator', 'freezer') THEN 
      CASE WHEN d.device_type = 'refrigerator' THEN 3.0 + (RANDOM() * 1.0) 
           ELSE -20.0 + (RANDOM() * 1.0) END
    ELSE NULL
  END,
  CASE 
    WHEN d.device_type = 'temperature_sensor' THEN 5.0 + (RANDOM() * 2.0)
    WHEN d.device_type = 'humidity_sensor' THEN 25.0 + (RANDOM() * 2.0)
    WHEN d.device_type IN ('refrigerator', 'freezer') THEN 
      CASE WHEN d.device_type = 'refrigerator' THEN 5.0 + (RANDOM() * 1.0) 
           ELSE -16.0 + (RANDOM() * 1.0) END
    ELSE NULL
  END,
  CASE WHEN d.device_type = 'humidity_sensor' THEN 48.0 + (RANDOM() * 8.0) ELSE NULL END,
  CASE WHEN d.device_type = 'humidity_sensor' THEN 42.0 + (RANDOM() * 4.0) ELSE NULL END,
  CASE WHEN d.device_type = 'humidity_sensor' THEN 58.0 + (RANDOM() * 4.0) ELSE NULL END,
  CASE 
    WHEN d.device_type IN ('refrigerator', 'freezer', 'oven') THEN 
      CASE 
        WHEN d.device_type = 'refrigerator' THEN 1320 + (RANDOM() * 120)::INTEGER -- ~22 hours
        WHEN d.device_type = 'freezer' THEN 1380 + (RANDOM() * 60)::INTEGER -- ~23 hours
        WHEN d.device_type = 'oven' THEN 480 + (RANDOM() * 240)::INTEGER -- 8-12 hours
      END
    ELSE 0
  END,
  CASE 
    WHEN d.device_type IN ('refrigerator', 'freezer', 'oven') THEN 
      CASE 
        WHEN d.device_type = 'refrigerator' THEN 3.8 + (RANDOM() * 0.8)
        WHEN d.device_type = 'freezer' THEN 5.5 + (RANDOM() * 1.0)
        WHEN d.device_type = 'oven' THEN 15.0 + (RANDOM() * 5.0)
      END
    ELSE 0
  END,
  CASE 
    WHEN d.device_type IN ('refrigerator', 'freezer', 'oven') THEN (RANDOM() * 30)::INTEGER
    ELSE 0
  END,
  CASE 
    WHEN d.device_type IN ('refrigerator', 'freezer', 'oven') THEN 85.0 + (RANDOM() * 10.0)
    ELSE NULL
  END,
  CASE WHEN RANDOM() < 0.1 THEN 1 ELSE 0 END, -- 10% chance of alert
  0, -- No critical alerts in sample data
  95.0 + (RANDOM() * 5.0), -- 95-100% uptime
  0.88 + (RANDOM() * 0.1), -- 88-98% health score
  CASE WHEN RANDOM() < 0.05 THEN 1 ELSE 0 END, -- 5% chance of anomaly
  '{"data_points": 288, "collection_rate": 95.5}'::JSONB
FROM iot_devices d
WHERE d.restaurant_id = (SELECT id FROM restaurants WHERE name = 'Krong Thai Restaurant');

-- Add some comments for documentation
COMMENT ON TABLE iot_devices IS 'Sample IoT devices including temperature sensors, refrigerator, freezer, and oven with realistic configurations';
COMMENT ON TABLE iot_sensor_data IS 'Sample sensor readings for the past 7 days with realistic temperature and humidity values';
COMMENT ON TABLE iot_equipment_status IS 'Sample equipment status data showing runtime, power consumption, and health metrics';
COMMENT ON TABLE iot_alerts IS 'Sample alerts including temperature warnings, door alerts, and maintenance notifications';
COMMENT ON TABLE iot_maintenance_schedule IS 'Sample maintenance schedules including routine and predictive maintenance';
COMMENT ON TABLE iot_analytics_data IS 'Sample aggregated analytics data for operational insights and trending';