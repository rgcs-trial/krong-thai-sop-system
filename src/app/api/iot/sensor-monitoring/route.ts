import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import type { 
  IoTSensorData, 
  IoTSensorDataRequest,
  IoTAlert,
  ApiResponse 
} from '@/types/database';

// GET: Fetch sensor data with filtering and aggregation
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user's restaurant
    const { data: authUser } = await supabase
      .from('auth_users')
      .select('restaurant_id')
      .eq('id', user.id)
      .single();

    if (!authUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Parse query parameters
    const deviceId = searchParams.get('device_id');
    const sensorType = searchParams.get('sensor_type');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') || '100');
    const aggregate = searchParams.get('aggregate'); // 'hourly', 'daily'
    const realtime = searchParams.get('realtime') === 'true';

    // Build base query
    let query = supabase
      .from('iot_sensor_data')
      .select(`
        *,
        device:iot_devices!inner(
          id,
          device_name,
          device_name_fr,
          device_type,
          location,
          location_fr,
          zone,
          restaurant_id
        )
      `);

    // Filter by user's restaurant devices
    query = query.eq('device.restaurant_id', authUser.restaurant_id);

    // Apply filters
    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    if (sensorType) {
      query = query.eq('sensor_type', sensorType);
    }

    if (dateFrom) {
      query = query.gte('recorded_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('recorded_at', dateTo);
    }

    // Order and limit
    query = query.order('recorded_at', { ascending: false }).limit(limit);

    const { data: sensorData, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to fetch sensor data'
      }, { status: 500 });
    }

    // If aggregation is requested, process the data
    let processedData = sensorData || [];

    if (aggregate && sensorData) {
      processedData = aggregateSensorData(sensorData, aggregate);
    }

    // If realtime is requested, also include the latest values
    let realtimeData = null;
    if (realtime && deviceId) {
      const { data: latest } = await supabase
        .from('iot_sensor_data')
        .select('*')
        .eq('device_id', deviceId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      
      realtimeData = latest;
    }

    return NextResponse.json<ApiResponse<{
      sensor_data: IoTSensorData[],
      realtime_data?: IoTSensorData,
      summary?: {
        total_readings: number,
        date_range: { from: string, to: string },
        devices_count: number
      }
    }>>({
      success: true,
      data: {
        sensor_data: processedData,
        realtime_data: realtimeData,
        summary: {
          total_readings: processedData.length,
          date_range: {
            from: dateFrom || '',
            to: dateTo || ''
          },
          devices_count: new Set(processedData.map(d => d.device_id)).size
        }
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST: Record new sensor data and check for alerts
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Authentication check (could be from device or authenticated user)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Parse request body
    const sensorData: IoTSensorDataRequest = await request.json();

    // Validate required fields
    if (!sensorData.device_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device ID is required'
      }, { status: 400 });
    }

    // Verify device exists and user has access
    const { data: device, error: deviceError } = await supabase
      .from('iot_devices')
      .select('id, restaurant_id, device_name, thresholds, status')
      .eq('id', sensorData.device_id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device not found or access denied'
      }, { status: 404 });
    }

    // Verify user has access to this device's restaurant
    const { data: authUser } = await supabase
      .from('auth_users')
      .select('restaurant_id')
      .eq('id', user.id)
      .single();

    if (!authUser || authUser.restaurant_id !== device.restaurant_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Prepare sensor data for insertion
    const newSensorData = {
      device_id: sensorData.device_id,
      temperature: sensorData.temperature,
      humidity: sensorData.humidity,
      pressure: sensorData.pressure,
      motion_detected: sensorData.motion_detected,
      door_open: sensorData.door_open,
      weight: sensorData.weight,
      sensor_type: sensorData.sensor_type,
      value: sensorData.value,
      unit: sensorData.unit,
      metadata: sensorData.metadata || {},
      recorded_at: sensorData.recorded_at || new Date().toISOString(),
      received_at: new Date().toISOString(),
      quality_score: calculateQualityScore(sensorData),
      is_anomaly: await detectAnomaly(supabase, sensorData)
    };

    // Insert sensor data
    const { data: insertedData, error: insertError } = await supabase
      .from('iot_sensor_data')
      .insert(newSensorData)
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to record sensor data'
      }, { status: 500 });
    }

    // Update device online status
    await supabase
      .from('iot_devices')
      .update({ 
        is_online: true, 
        last_seen_at: new Date().toISOString(),
        status: device.status === 'offline' ? 'active' : device.status
      })
      .eq('id', sensorData.device_id);

    // Check for threshold alerts
    const alerts = await checkThresholdAlerts(supabase, device, newSensorData);

    // If alerts were generated, return them in the response
    return NextResponse.json<ApiResponse<{
      sensor_data: IoTSensorData,
      alerts_generated?: IoTAlert[]
    }>>({
      success: true,
      data: {
        sensor_data: insertedData,
        alerts_generated: alerts
      },
      message: `Sensor data recorded successfully${alerts?.length ? ` with ${alerts.length} alert(s) generated` : ''}`
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to calculate data quality score
function calculateQualityScore(sensorData: IoTSensorDataRequest): number {
  let score = 1.0;
  
  // Reduce score for missing expected data
  if (sensorData.sensor_type === 'temperature' && sensorData.temperature === undefined) {
    score -= 0.3;
  }
  
  if (sensorData.sensor_type === 'humidity' && sensorData.humidity === undefined) {
    score -= 0.3;
  }
  
  // Check for reasonable value ranges
  if (sensorData.temperature !== undefined) {
    if (sensorData.temperature < -50 || sensorData.temperature > 100) {
      score -= 0.4; // Unreasonable temperature
    }
  }
  
  if (sensorData.humidity !== undefined) {
    if (sensorData.humidity < 0 || sensorData.humidity > 100) {
      score -= 0.4; // Invalid humidity percentage
    }
  }
  
  return Math.max(0, score);
}

// Helper function to detect anomalies
async function detectAnomaly(
  supabase: any, 
  sensorData: IoTSensorDataRequest
): Promise<boolean> {
  try {
    // Get recent historical data for comparison
    const { data: recentData } = await supabase
      .from('iot_sensor_data')
      .select('temperature, humidity, pressure, value')
      .eq('device_id', sensorData.device_id)
      .eq('sensor_type', sensorData.sensor_type || 'temperature')
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (!recentData || recentData.length < 5) {
      return false; // Not enough data for anomaly detection
    }

    // Simple anomaly detection based on standard deviation
    const currentValue = sensorData.temperature || sensorData.humidity || sensorData.value || 0;
    const values = recentData.map(d => 
      d.temperature || d.humidity || d.pressure || d.value || 0
    ).filter(v => v !== 0);

    if (values.length === 0) return false;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Flag as anomaly if value is more than 2 standard deviations from mean
    return Math.abs(currentValue - mean) > (2 * stdDev);

  } catch (error) {
    console.error('Anomaly detection error:', error);
    return false;
  }
}

// Helper function to check threshold alerts
async function checkThresholdAlerts(
  supabase: any,
  device: any,
  sensorData: any
): Promise<IoTAlert[]> {
  const alerts: IoTAlert[] = [];
  const thresholds = device.thresholds || {};

  try {
    // Check temperature thresholds
    if (sensorData.temperature !== undefined && thresholds.temperature) {
      const tempThresholds = thresholds.temperature;
      
      if (tempThresholds.max && sensorData.temperature > tempThresholds.max) {
        const alert = await createAlert(supabase, {
          device_id: device.id,
          restaurant_id: device.restaurant_id,
          alert_type: 'temperature_high',
          severity: tempThresholds.critical_max && sensorData.temperature > tempThresholds.critical_max ? 'critical' : 'warning',
          title: 'High Temperature Alert',
          title_fr: 'Alerte de Température Élevée',
          message: `Temperature ${sensorData.temperature}°C exceeds threshold of ${tempThresholds.max}°C`,
          message_fr: `La température ${sensorData.temperature}°C dépasse le seuil de ${tempThresholds.max}°C`,
          threshold_value: tempThresholds.max,
          actual_value: sensorData.temperature,
          condition_met: 'above'
        });
        if (alert) alerts.push(alert);
      }

      if (tempThresholds.min && sensorData.temperature < tempThresholds.min) {
        const alert = await createAlert(supabase, {
          device_id: device.id,
          restaurant_id: device.restaurant_id,
          alert_type: 'temperature_low',
          severity: tempThresholds.critical_min && sensorData.temperature < tempThresholds.critical_min ? 'critical' : 'warning',
          title: 'Low Temperature Alert',
          title_fr: 'Alerte de Température Basse',
          message: `Temperature ${sensorData.temperature}°C below threshold of ${tempThresholds.min}°C`,
          message_fr: `La température ${sensorData.temperature}°C est en dessous du seuil de ${tempThresholds.min}°C`,
          threshold_value: tempThresholds.min,
          actual_value: sensorData.temperature,
          condition_met: 'below'
        });
        if (alert) alerts.push(alert);
      }
    }

    // Check humidity thresholds
    if (sensorData.humidity !== undefined && thresholds.humidity) {
      const humidityThresholds = thresholds.humidity;
      
      if (humidityThresholds.max && sensorData.humidity > humidityThresholds.max) {
        const alert = await createAlert(supabase, {
          device_id: device.id,
          restaurant_id: device.restaurant_id,
          alert_type: 'humidity_high',
          severity: 'warning',
          title: 'High Humidity Alert',
          title_fr: 'Alerte d\'Humidité Élevée',
          message: `Humidity ${sensorData.humidity}% exceeds threshold of ${humidityThresholds.max}%`,
          message_fr: `L'humidité ${sensorData.humidity}% dépasse le seuil de ${humidityThresholds.max}%`,
          threshold_value: humidityThresholds.max,
          actual_value: sensorData.humidity,
          condition_met: 'above'
        });
        if (alert) alerts.push(alert);
      }
    }

    // Check for door open alerts (for refrigerators/freezers)
    if (sensorData.door_open && (device.device_type === 'refrigerator' || device.device_type === 'freezer')) {
      // Check if door has been open for too long by looking at recent data
      const { data: recentDoorData } = await supabase
        .from('iot_sensor_data')
        .select('door_open, recorded_at')
        .eq('device_id', device.id)
        .order('recorded_at', { ascending: false })
        .limit(5);

      const allDoorsOpen = recentDoorData?.every(d => d.door_open) || false;
      if (allDoorsOpen && recentDoorData && recentDoorData.length >= 3) {
        const alert = await createAlert(supabase, {
          device_id: device.id,
          restaurant_id: device.restaurant_id,
          alert_type: 'door_open_extended',
          severity: 'warning',
          title: 'Door Left Open',
          title_fr: 'Porte Laissée Ouverte',
          message: `${device.device_name} door has been open for an extended period`,
          message_fr: `La porte du ${device.device_name} est restée ouverte pendant une période prolongée`,
          actual_value: 1,
          condition_met: 'extended_open'
        });
        if (alert) alerts.push(alert);
      }
    }

  } catch (error) {
    console.error('Error checking threshold alerts:', error);
  }

  return alerts;
}

// Helper function to create an alert
async function createAlert(supabase: any, alertData: any): Promise<IoTAlert | null> {
  try {
    // Check if similar alert already exists and is unresolved
    const { data: existingAlert } = await supabase
      .from('iot_alerts')
      .select('id')
      .eq('device_id', alertData.device_id)
      .eq('alert_type', alertData.alert_type)
      .eq('is_resolved', false)
      .order('triggered_at', { ascending: false })
      .limit(1)
      .single();

    // Don't create duplicate alerts
    if (existingAlert) {
      return null;
    }

    const { data: alert, error } = await supabase
      .from('iot_alerts')
      .insert({
        ...alertData,
        triggered_at: new Date().toISOString(),
        alert_data: {
          sensor_reading: alertData.actual_value,
          threshold: alertData.threshold_value,
          condition: alertData.condition_met
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return null;
    }

    return alert;
  } catch (error) {
    console.error('Error in createAlert:', error);
    return null;
  }
}

// Helper function to aggregate sensor data
function aggregateSensorData(data: IoTSensorData[], aggregateType: string): IoTSensorData[] {
  if (aggregateType === 'hourly') {
    // Group by hour and calculate averages
    const groupedData = new Map<string, IoTSensorData[]>();
    
    data.forEach(item => {
      const hourKey = new Date(item.recorded_at).toISOString().slice(0, 13); // YYYY-MM-DDTHH
      if (!groupedData.has(hourKey)) {
        groupedData.set(hourKey, []);
      }
      groupedData.get(hourKey)!.push(item);
    });

    return Array.from(groupedData.entries()).map(([hourKey, items]) => ({
      id: `aggregated_${hourKey}`,
      device_id: items[0].device_id,
      temperature: items.filter(i => i.temperature).length > 0 ? 
        items.reduce((sum, i) => sum + (i.temperature || 0), 0) / items.filter(i => i.temperature).length : undefined,
      humidity: items.filter(i => i.humidity).length > 0 ? 
        items.reduce((sum, i) => sum + (i.humidity || 0), 0) / items.filter(i => i.humidity).length : undefined,
      pressure: items.filter(i => i.pressure).length > 0 ? 
        items.reduce((sum, i) => sum + (i.pressure || 0), 0) / items.filter(i => i.pressure).length : undefined,
      sensor_type: items[0].sensor_type,
      value: items.filter(i => i.value).length > 0 ? 
        items.reduce((sum, i) => sum + (i.value || 0), 0) / items.filter(i => i.value).length : undefined,
      unit: items[0].unit,
      metadata: { aggregated: true, count: items.length },
      quality_score: items.reduce((sum, i) => sum + i.quality_score, 0) / items.length,
      is_anomaly: items.some(i => i.is_anomaly),
      recorded_at: `${hourKey}:00:00.000Z`,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }));
  }

  return data; // Return original data if no aggregation
}