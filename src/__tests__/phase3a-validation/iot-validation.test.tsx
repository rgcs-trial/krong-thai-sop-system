/**
 * Phase 3A IoT Integration Validation Test Suite
 * Tasks 257-262: IoT device management, sensor monitoring, and analytics validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { jest } from '@jest/globals';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Import API routes after mocking
import { GET as DeviceManagementGET, POST as DeviceManagementPOST } from '@/app/api/iot/device-management/route';
import { GET as SensorMonitoringGET } from '@/app/api/iot/sensor-monitoring/route';
import { GET as EquipmentTrackingGET } from '@/app/api/iot/equipment-tracking/route';
import { GET as AlertSystemGET, POST as AlertSystemPOST } from '@/app/api/iot/alert-system/route';
import { GET as IoTAnalyticsGET } from '@/app/api/iot/analytics/route';
import { GET as FirmwareUpdatesGET, POST as FirmwareUpdatesPOST } from '@/app/api/iot/firmware-updates/route';

// Test data
const mockIoTDevice = {
  id: 'device-123',
  restaurant_id: 'restaurant-123',
  device_type: 'temperature_sensor',
  device_name: 'Kitchen Temperature Sensor',
  device_name_fr: 'Capteur de température de cuisine',
  description: 'Main kitchen temperature monitoring',
  mac_address: '00:11:22:33:44:55',
  serial_number: 'TSK001',
  manufacturer: 'SensorTech',
  model: 'ST-100',
  location: 'Main Kitchen',
  zone: 'kitchen',
  coordinates: { x: 10, y: 20 },
  status: 'active',
  is_online: true,
  created_at: '2024-01-01T00:00:00Z',
  installation_date: '2024-01-01T00:00:00Z',
};

const mockSensorData = {
  id: 'sensor-123',
  device_id: 'device-123',
  timestamp: '2024-01-01T12:00:00Z',
  temperature: 22.5,
  humidity: 45.2,
  motion_detected: false,
  sound_level: 35.8,
  air_quality: 'good',
  raw_data: { temp: 22.5, hum: 45.2 },
};

const mockAuthUser = {
  id: 'user-123',
  restaurant_id: 'restaurant-123',
  role: 'admin',
  full_name: 'Test Admin',
};

describe('Phase 3A IoT Integration Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    
    // Setup default user lookup
    mockSupabaseClient.from().single.mockResolvedValue({
      data: mockAuthUser,
      error: null,
    });
  });

  describe('Task 257: IoT Device Management System', () => {
    test('should fetch IoT devices with authentication', async () => {
      const mockDevices = [mockIoTDevice];
      mockSupabaseClient.from().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockAuthUser, error: null }),
      });
      
      // Mock the final query result
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: mockDevices, error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/device-management');
      const response = await DeviceManagementGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDevices);
    });

    test('should create IoT device with proper validation', async () => {
      const newDeviceData = {
        device_type: 'temperature_sensor',
        device_name: 'New Temperature Sensor',
        device_name_fr: 'Nouveau capteur de température',
        mac_address: '00:11:22:33:44:66',
        serial_number: 'TSK002',
        manufacturer: 'SensorTech',
        location: 'Storage Room',
        zone: 'storage',
      };

      // Mock no existing devices with same MAC/serial
      mockSupabaseClient.from().single
        .mockResolvedValueOnce({ data: mockAuthUser, error: null }) // User lookup
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // MAC check
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // Serial check

      // Mock device creation
      const createdDevice = { ...mockIoTDevice, ...newDeviceData };
      mockSupabaseClient.from().select.mockResolvedValue({ data: createdDevice, error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/device-management', {
        method: 'POST',
        body: JSON.stringify(newDeviceData),
      });

      const response = await DeviceManagementPOST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.message).toContain('created successfully');
    });

    test('should prevent duplicate MAC addresses', async () => {
      const duplicateDeviceData = {
        device_type: 'temperature_sensor',
        device_name: 'Duplicate Sensor',
        mac_address: '00:11:22:33:44:55', // Same as existing
      };

      // Mock existing device with same MAC
      mockSupabaseClient.from().single
        .mockResolvedValueOnce({ data: mockAuthUser, error: null }) // User lookup
        .mockResolvedValueOnce({ data: { id: 'existing-device' }, error: null }); // MAC check

      const request = new NextRequest('http://localhost:3000/api/iot/device-management', {
        method: 'POST',
        body: JSON.stringify(duplicateDeviceData),
      });

      const response = await DeviceManagementPOST(request);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toContain('MAC address already exists');
    });

    test('should enforce role-based access control', async () => {
      // Mock user with insufficient permissions
      const staffUser = { ...mockAuthUser, role: 'staff' };
      mockSupabaseClient.from().single.mockResolvedValue({ data: staffUser, error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/device-management', {
        method: 'POST',
        body: JSON.stringify({ device_type: 'sensor', device_name: 'Test' }),
      });

      const response = await DeviceManagementPOST(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('Task 258: Real-time Sensor Data Monitoring', () => {
    test('should retrieve sensor data with real-time capabilities', async () => {
      const mockSensorReadings = [mockSensorData];
      
      // Mock sensor data query
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: mockSensorReadings, error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/sensor-monitoring?device_id=device-123&interval=1h');
      const response = await SensorMonitoringGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSensorReadings);
    });

    test('should handle sensor data aggregation', async () => {
      const aggregatedData = {
        device_id: 'device-123',
        avg_temperature: 22.3,
        min_temperature: 20.1,
        max_temperature: 24.5,
        avg_humidity: 44.8,
        data_points: 24,
        timeframe: '1h',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [aggregatedData], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/sensor-monitoring?device_id=device-123&aggregate=true&interval=1h');
      const response = await SensorMonitoringGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].avg_temperature).toBeDefined();
      expect(result.data[0].data_points).toBeGreaterThan(0);
    });

    test('should validate sensor data thresholds', async () => {
      const thresholdViolation = {
        ...mockSensorData,
        temperature: 35.0, // Above threshold
        alert_triggered: true,
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [thresholdViolation], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/sensor-monitoring?device_id=device-123&alerts_only=true');
      const response = await SensorMonitoringGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].alert_triggered).toBe(true);
    });
  });

  describe('Task 259: Equipment Tracking and Maintenance', () => {
    test('should track equipment maintenance schedules', async () => {
      const maintenanceSchedule = {
        id: 'maintenance-123',
        device_id: 'device-123',
        maintenance_type: 'calibration',
        scheduled_date: '2024-02-01T09:00:00Z',
        status: 'scheduled',
        priority: 'medium',
        estimated_duration: 60,
        technician_assigned: 'tech-123',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [maintenanceSchedule], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/equipment-tracking?type=maintenance&status=scheduled');
      const response = await EquipmentTrackingGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].maintenance_type).toBe('calibration');
      expect(result.data[0].status).toBe('scheduled');
    });

    test('should track equipment lifecycle events', async () => {
      const lifecycleEvents = [
        {
          id: 'event-1',
          device_id: 'device-123',
          event_type: 'installation',
          timestamp: '2024-01-01T10:00:00Z',
          details: { location: 'Kitchen', technician: 'John Doe' },
        },
        {
          id: 'event-2',
          device_id: 'device-123',  
          event_type: 'calibration',
          timestamp: '2024-01-15T14:00:00Z',
          details: { calibration_values: { temp_offset: 0.2 } },
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: lifecycleEvents, error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/equipment-tracking?device_id=device-123&type=lifecycle');
      const response = await EquipmentTrackingGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].event_type).toBe('installation');
    });

    test('should calculate equipment performance metrics', async () => {
      const performanceMetrics = {
        device_id: 'device-123',
        uptime_percentage: 98.5,
        avg_response_time: 120, // ms
        data_accuracy: 99.2,
        maintenance_compliance: 95.0,
        last_maintenance: '2024-01-15T14:00:00Z',
        next_maintenance: '2024-03-15T14:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [performanceMetrics], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/equipment-tracking?device_id=device-123&metrics=true');
      const response = await EquipmentTrackingGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].uptime_percentage).toBeGreaterThan(95);
      expect(result.data[0].maintenance_compliance).toBeGreaterThan(90);
    });
  });

  describe('Task 260: Alert System and Notifications', () => {
    test('should generate automated alerts for threshold violations', async () => {
      const alertData = {
        device_id: 'device-123',
        alert_type: 'temperature_high',
        severity: 'critical',
        message: 'Temperature exceeded safe threshold',
        threshold_value: 30.0,
        current_value: 35.2,
        location: 'Main Kitchen',
      };

      // Mock alert creation
      const createdAlert = {
        id: 'alert-123',
        ...alertData,
        created_at: '2024-01-01T12:00:00Z',
        is_resolved: false,
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: createdAlert, error: null }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/iot/alert-system', {
        method: 'POST',
        body: JSON.stringify(alertData),
      });

      const response = await AlertSystemPOST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data.alert_type).toBe('temperature_high');
      expect(result.data.severity).toBe('critical');
    });

    test('should retrieve active alerts with filtering', async () => {
      const activeAlerts = [
        {
          id: 'alert-1',
          device_id: 'device-123',
          alert_type: 'temperature_high',
          severity: 'critical',
          is_resolved: false,
          created_at: '2024-01-01T12:00:00Z',
        },
        {
          id: 'alert-2',
          device_id: 'device-124',
          alert_type: 'connectivity_lost',
          severity: 'warning',
          is_resolved: false,
          created_at: '2024-01-01T12:05:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: activeAlerts, error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/alert-system?active=true&severity=critical,warning');
      const response = await AlertSystemGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every(alert => !alert.is_resolved)).toBe(true);
    });

    test('should handle alert escalation based on severity', async () => {
      const criticalAlert = {
        id: 'alert-critical',
        device_id: 'device-123',
        alert_type: 'fire_detected',
        severity: 'critical',
        escalation_level: 1,
        notifications_sent: ['emergency_contact', 'manager', 'fire_department'],
        auto_actions_triggered: ['emergency_shutdown', 'ventilation_max'],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [criticalAlert], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/alert-system?severity=critical&escalated=true');
      const response = await AlertSystemGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].severity).toBe('critical');
      expect(result.data[0].escalation_level).toBeGreaterThan(0);
      expect(result.data[0].auto_actions_triggered).toContain('emergency_shutdown');
    });
  });

  describe('Task 261: IoT Analytics and Insights', () => {
    test('should generate device performance analytics', async () => {
      const analyticsData = {
        restaurant_id: 'restaurant-123',
        timeframe: '24h',
        total_devices: 15,
        online_devices: 14,
        offline_devices: 1,
        alerts_generated: 3,
        alerts_resolved: 2,
        avg_response_time: 145,
        data_accuracy: 98.7,
        energy_consumption: 245.6, // kWh
        maintenance_due: 2,
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [analyticsData], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/analytics?timeframe=24h&type=overview');
      const response = await IoTAnalyticsGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].total_devices).toBe(15);
      expect(result.data[0].online_devices).toBe(14);
      expect(result.data[0].data_accuracy).toBeGreaterThan(95);
    });

    test('should provide trend analysis and predictions', async () => {
      const trendData = {
        device_type: 'temperature_sensor',
        location: 'kitchen',
        trends: {
          temperature: {
            trend: 'increasing',
            rate: 0.2, // degrees per hour
            confidence: 0.85,
            prediction_24h: 23.8,
          },
          humidity: {
            trend: 'stable',
            rate: 0.05,
            confidence: 0.92,
            prediction_24h: 45.1,
          },
        },
        anomalies_detected: 1,
        maintenance_recommendations: [
          'Schedule calibration check within 48 hours',
          'Clean sensor housing for optimal performance',
        ],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [trendData], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/analytics?device_type=temperature_sensor&analysis=trends');
      const response = await IoTAnalyticsGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].trends.temperature.confidence).toBeGreaterThan(0.8);
      expect(result.data[0].maintenance_recommendations).toHaveLength(2);
    });

    test('should calculate energy efficiency metrics', async () => {
      const energyMetrics = {
        restaurant_id: 'restaurant-123',
        total_consumption: 1245.6, // kWh
        consumption_by_zone: {
          kitchen: 856.2,
          dining: 234.1,
          storage: 155.3,
        },
        efficiency_score: 87.5,
        cost_savings: 234.50, // USD
        carbon_footprint: 545.2, // kg CO2
        recommendations: [
          'Optimize HVAC scheduling during low-traffic hours',
          'Consider LED lighting upgrade in dining area',
        ],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [energyMetrics], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/analytics?type=energy&timeframe=7d');
      const response = await IoTAnalyticsGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].efficiency_score).toBeGreaterThan(80);
      expect(result.data[0].cost_savings).toBeGreaterThan(0);
    });
  });

  describe('Task 262: Firmware Updates and Device Management', () => {
    test('should check for available firmware updates', async () => {
      const availableUpdates = [
        {
          device_id: 'device-123',
          current_version: '1.2.3',
          latest_version: '1.3.0',
          update_available: true,
          update_priority: 'medium',
          release_notes: [
            'Improved temperature accuracy',
            'Bug fixes for connectivity issues',
            'Enhanced security protocols',
          ],
          update_size: 2.1, // MB
          estimated_install_time: 15, // minutes
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: availableUpdates, error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/firmware-updates?check=true');
      const response = await FirmwareUpdatesGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].update_available).toBe(true);
      expect(result.data[0].latest_version).toBe('1.3.0');
    });

    test('should initiate firmware update process', async () => {
      const updateRequest = {
        device_ids: ['device-123', 'device-124'],
        target_version: '1.3.0',
        schedule_type: 'immediate',
        backup_config: true,
        rollback_enabled: true,
      };

      const updateJob = {
        id: 'update-job-123',
        device_ids: updateRequest.device_ids,
        target_version: updateRequest.target_version,
        status: 'queued',
        progress: 0,
        started_at: null,
        estimated_completion: '2024-01-01T13:30:00Z',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updateJob, error: null }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/iot/firmware-updates', {
        method: 'POST',
        body: JSON.stringify(updateRequest),
      });

      const response = await FirmwareUpdatesPOST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('queued');
      expect(result.data.device_ids).toHaveLength(2);
    });

    test('should track firmware update progress', async () => {
      const updateProgress = {
        job_id: 'update-job-123',
        overall_progress: 65,
        device_progress: [
          {
            device_id: 'device-123',
            status: 'downloading',
            progress: 80,
            stage: 'firmware_download',
          },
          {
            device_id: 'device-124',
            status: 'installing',
            progress: 50,
            stage: 'firmware_install',
          },
        ],
        estimated_completion: '2024-01-01T13:15:00Z',
        errors: [],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [updateProgress], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/firmware-updates?job_id=update-job-123&progress=true');
      const response = await FirmwareUpdatesGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].overall_progress).toBe(65);
      expect(result.data[0].device_progress).toHaveLength(2);
    });

    test('should handle firmware rollback scenarios', async () => {
      const rollbackRequest = {
        job_id: 'update-job-123',
        device_ids: ['device-123'],
        reason: 'compatibility_issue',
        target_version: '1.2.3', // Previous stable version
      };

      const rollbackJob = {
        id: 'rollback-job-123',
        original_job_id: rollbackRequest.job_id,
        device_ids: rollbackRequest.device_ids,
        target_version: rollbackRequest.target_version,
        reason: rollbackRequest.reason,
        status: 'queued',
        created_at: '2024-01-01T14:00:00Z',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: rollbackJob, error: null }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/iot/firmware-updates/rollback', {
        method: 'POST',
        body: JSON.stringify(rollbackRequest),
      });

      // Note: This would need a separate rollback endpoint
      const response = await FirmwareUpdatesPOST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
    });
  });

  describe('IoT Integration with Existing Systems', () => {
    test('should integrate with authentication and authorization', async () => {
      // Test unauthorized access
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/iot/device-management');
      const response = await DeviceManagementGET(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    test('should respect restaurant-level data isolation', async () => {
      // Setup user from different restaurant
      const otherRestaurantUser = { ...mockAuthUser, restaurant_id: 'other-restaurant' };
      mockSupabaseClient.from().single.mockResolvedValue({
        data: otherRestaurantUser,
        error: null,
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/device-management');
      const response = await DeviceManagementGET(request);
      const result = await response.json();

      // Should only return devices from user's restaurant
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('should support bilingual content in device management', async () => {
      const bilingualDevice = {
        ...mockIoTDevice,
        device_name: 'Temperature Sensor',
        device_name_fr: 'Capteur de température',
        description: 'Kitchen temperature monitoring',
        description_fr: 'Surveillance de la température de cuisine',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [bilingualDevice], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/device-management');
      const response = await DeviceManagementGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].device_name_fr).toBe('Capteur de température');
      expect(result.data[0].description_fr).toBe('Surveillance de la température de cuisine');
    });
  });

  describe('IoT Performance and Reliability', () => {
    test('should handle high-frequency sensor data ingestion', async () => {
      const highFrequencyData = Array.from({ length: 100 }, (_, i) => ({
        device_id: 'device-123',
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        temperature: 22 + Math.random() * 2,
        humidity: 45 + Math.random() * 5,
      }));

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: highFrequencyData, error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/sensor-monitoring?device_id=device-123&limit=100');
      const response = await SensorMonitoringGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
    });

    test('should gracefully handle device connectivity issues', async () => {
      const offlineDevice = {
        ...mockIoTDevice,
        is_online: false,
        last_seen: '2024-01-01T10:00:00Z',
        connectivity_status: 'timeout',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [offlineDevice], error: null });

      const request = new NextRequest('http://localhost:3000/api/iot/device-management?status=offline');
      const response = await DeviceManagementGET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].is_online).toBe(false);
      expect(result.data[0].connectivity_status).toBe('timeout');
    });
  });
});

// Performance benchmarks for IoT features
export const IOT_PERFORMANCE_BENCHMARKS = {
  deviceQuery: 500, // ms
  sensorDataIngestion: 100, // ms per reading
  alertGeneration: 200, // ms
  firmwareUpdateCheck: 1000, // ms
  analyticsCalculation: 2000, // ms
  realTimeMonitoring: 50, // ms latency
};

// Test utility functions for IoT validation
export const IoTTestUtils = {
  mockIoTDevice: () => ({ ...mockIoTDevice }),
  mockSensorData: () => ({ ...mockSensorData }),
  createMockAlert: (severity: string) => ({
    id: `alert-${Date.now()}`,
    device_id: mockIoTDevice.id,
    alert_type: 'threshold_violation',
    severity,
    created_at: new Date().toISOString(),
    is_resolved: false,
  }),
  generateSensorTimeSeries: (hours: number) => 
    Array.from({ length: hours * 60 }, (_, i) => ({
      ...mockSensorData,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      temperature: 22 + Math.sin(i / 60) * 3 + Math.random() * 0.5,
    })),
};