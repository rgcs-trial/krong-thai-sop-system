import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import type { 
  IoTAnalyticsData,
  IoTDashboardStats,
  ApiResponse 
} from '@/types/database';

// GET: Fetch IoT analytics data and insights
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
    const dateFrom = searchParams.get('date_from') || getDateDaysAgo(30);
    const dateTo = searchParams.get('date_to') || new Date().toISOString().split('T')[0];
    const aggregationType = searchParams.get('aggregation') || 'daily'; // 'hourly', 'daily', 'weekly'
    const includeRealtime = searchParams.get('include_realtime') === 'true';
    const includeComparisons = searchParams.get('include_comparisons') === 'true';
    const metricsOnly = searchParams.get('metrics_only') === 'true';

    // If only metrics requested, return dashboard stats
    if (metricsOnly) {
      const dashboardStats = await generateDashboardStats(supabase, authUser.restaurant_id);
      return NextResponse.json<ApiResponse<IoTDashboardStats>>({
        success: true,
        data: dashboardStats
      });
    }

    // Build analytics query
    let analyticsQuery = supabase
      .from('iot_analytics_data')
      .select(`
        *,
        device:iot_devices(
          id,
          device_name,
          device_name_fr,
          device_type,
          location,
          zone
        )
      `)
      .eq('restaurant_id', authUser.restaurant_id)
      .gte('date_period', dateFrom)
      .lte('date_period', dateTo);

    if (deviceId) {
      analyticsQuery = analyticsQuery.eq('device_id', deviceId);
    }

    // Order by date
    analyticsQuery = analyticsQuery.order('date_period', { ascending: true });

    const { data: analyticsData, error: analyticsError } = await analyticsQuery;

    if (analyticsError) {
      console.error('Analytics query error:', analyticsError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to fetch analytics data'
      }, { status: 500 });
    }

    // Aggregate data based on requested aggregation type
    const aggregatedData = aggregateAnalyticsData(analyticsData || [], aggregationType);

    // Prepare result object
    let result: any = {
      analytics_data: aggregatedData,
      date_range: { from: dateFrom, to: dateTo },
      aggregation_type: aggregationType
    };

    // Include real-time data if requested
    if (includeRealtime) {
      const realtimeData = await generateRealtimeInsights(supabase, authUser.restaurant_id, deviceId);
      result.realtime_insights = realtimeData;
    }

    // Include comparison data if requested
    if (includeComparisons) {
      const comparisons = await generateComparisonData(
        supabase, 
        authUser.restaurant_id, 
        dateFrom, 
        dateTo,
        deviceId
      );
      result.comparisons = comparisons;
    }

    // Generate insights and recommendations
    const insights = generateAnalyticsInsights(aggregatedData);
    result.insights = insights;

    // Generate performance trends
    const trends = calculatePerformanceTrends(aggregatedData);
    result.trends = trends;

    // Generate energy and efficiency analytics
    const efficiency = calculateEfficiencyMetrics(aggregatedData);
    result.efficiency_metrics = efficiency;

    return NextResponse.json<ApiResponse<typeof result>>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST: Generate and store analytics data (typically called by system cron job)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { data: authUser } = await supabase
      .from('auth_users')
      .select('restaurant_id, role')
      .eq('id', user.id)
      .single();

    if (!authUser || !['admin', 'manager'].includes(authUser.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Parse request body
    const { date_period, device_id, force_refresh } = await request.json();
    const targetDate = date_period || new Date().toISOString().split('T')[0];

    // Generate analytics for specified date/device
    const generatedAnalytics = await generateAnalyticsForPeriod(
      supabase,
      authUser.restaurant_id,
      targetDate,
      device_id,
      force_refresh
    );

    return NextResponse.json<ApiResponse<{
      generated_records: number,
      date_period: string,
      devices_processed: number
    }>>({
      success: true,
      data: {
        generated_records: generatedAnalytics.length,
        date_period: targetDate,
        devices_processed: new Set(generatedAnalytics.map(a => a.device_id)).size
      },
      message: 'Analytics data generated successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to get date N days ago
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// Helper function to generate dashboard statistics
async function generateDashboardStats(
  supabase: any, 
  restaurantId: string
): Promise<IoTDashboardStats> {
  try {
    // Get device counts
    const { data: devices } = await supabase
      .from('iot_devices')
      .select('id, status, is_online')
      .eq('restaurant_id', restaurantId);

    const totalDevices = devices?.length || 0;
    const activeDevices = devices?.filter(d => d.status === 'active').length || 0;
    const offlineDevices = devices?.filter(d => !d.is_online).length || 0;
    const maintenanceDevices = devices?.filter(d => d.status === 'maintenance').length || 0;

    // Get alert counts
    const { data: alerts } = await supabase
      .from('iot_alerts')
      .select('id, severity, is_resolved')
      .eq('restaurant_id', restaurantId);

    const totalAlerts = alerts?.length || 0;
    const unresolvedAlerts = alerts?.filter(a => !a.is_resolved).length || 0;
    const criticalAlerts = alerts?.filter(a => a.severity === 'critical' && !a.is_resolved).length || 0;

    // Get maintenance counts
    const { data: maintenance } = await supabase
      .from('iot_maintenance_schedule')
      .select('id, status, scheduled_date')
      .eq('restaurant_id', restaurantId);

    const scheduledMaintenance = maintenance?.filter(m => m.status === 'scheduled').length || 0;
    const overdueMaintenance = maintenance?.filter(m => {
      return m.status === 'overdue' || 
             (m.status === 'scheduled' && new Date(m.scheduled_date) < new Date());
    }).length || 0;

    // Calculate uptime from recent analytics
    const { data: recentAnalytics } = await supabase
      .from('iot_analytics_data')
      .select('uptime_percentage')
      .eq('restaurant_id', restaurantId)
      .gte('date_period', getDateDaysAgo(7))
      .not('uptime_percentage', 'is', null);

    const averageUptime = recentAnalytics && recentAnalytics.length > 0 ?
      recentAnalytics.reduce((sum, a) => sum + (a.uptime_percentage || 0), 0) / recentAnalytics.length : 100;

    // Calculate power consumption
    const { data: powerData } = await supabase
      .from('iot_analytics_data')
      .select('power_consumption_kwh')
      .eq('restaurant_id', restaurantId)
      .eq('date_period', new Date().toISOString().split('T')[0])
      .not('power_consumption_kwh', 'is', null);

    const powerConsumptionToday = powerData?.reduce((sum, p) => sum + (p.power_consumption_kwh || 0), 0) || 0;

    // Calculate efficiency score
    const { data: efficiencyData } = await supabase
      .from('iot_analytics_data')
      .select('efficiency_score')
      .eq('restaurant_id', restaurantId)
      .gte('date_period', getDateDaysAgo(7))
      .not('efficiency_score', 'is', null);

    const efficiencyScore = efficiencyData && efficiencyData.length > 0 ?
      efficiencyData.reduce((sum, e) => sum + (e.efficiency_score || 0), 0) / efficiencyData.length : 85;

    return {
      total_devices: totalDevices,
      active_devices: activeDevices,
      offline_devices: offlineDevices,
      devices_in_maintenance: maintenanceDevices,
      total_alerts: totalAlerts,
      unresolved_alerts: unresolvedAlerts,
      critical_alerts: criticalAlerts,
      scheduled_maintenance: scheduledMaintenance,
      overdue_maintenance: overdueMaintenance,
      average_uptime: Math.round(averageUptime * 100) / 100,
      power_consumption_today: Math.round(powerConsumptionToday * 100) / 100,
      efficiency_score: Math.round(efficiencyScore * 100) / 100
    };

  } catch (error) {
    console.error('Error generating dashboard stats:', error);
    return {
      total_devices: 0,
      active_devices: 0,
      offline_devices: 0,
      devices_in_maintenance: 0,
      total_alerts: 0,
      unresolved_alerts: 0,
      critical_alerts: 0,
      scheduled_maintenance: 0,
      overdue_maintenance: 0,
      average_uptime: 0,
      power_consumption_today: 0,
      efficiency_score: 0
    };
  }
}

// Helper function to aggregate analytics data
function aggregateAnalyticsData(data: IoTAnalyticsData[], aggregationType: string): IoTAnalyticsData[] {
  if (aggregationType === 'hourly' || data.length === 0) {
    return data; // Return as-is for hourly or if no data
  }

  const aggregatedMap = new Map<string, IoTAnalyticsData[]>();

  data.forEach(item => {
    let key: string;
    const date = new Date(item.date_period);

    if (aggregationType === 'weekly') {
      // Group by week
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      key = startOfWeek.toISOString().split('T')[0];
    } else {
      // Daily aggregation (default)
      key = item.date_period;
    }

    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, []);
    }
    aggregatedMap.get(key)!.push(item);
  });

  return Array.from(aggregatedMap.entries()).map(([dateKey, items]) => {
    const deviceIds = [...new Set(items.map(i => i.device_id))];
    
    return {
      id: `aggregated_${dateKey}`,
      restaurant_id: items[0].restaurant_id,
      device_id: deviceIds.length === 1 ? deviceIds[0] : undefined,
      date_period: dateKey,
      hour_period: undefined,
      
      // Temperature aggregations
      avg_temperature: calculateAverage(items.map(i => i.avg_temperature)),
      min_temperature: Math.min(...items.map(i => i.min_temperature || Infinity).filter(v => v !== Infinity)),
      max_temperature: Math.max(...items.map(i => i.max_temperature || -Infinity).filter(v => v !== -Infinity)),
      
      // Humidity aggregations
      avg_humidity: calculateAverage(items.map(i => i.avg_humidity)),
      min_humidity: Math.min(...items.map(i => i.min_humidity || Infinity).filter(v => v !== Infinity)),
      max_humidity: Math.max(...items.map(i => i.max_humidity || -Infinity).filter(v => v !== -Infinity)),
      
      // Equipment metrics
      total_runtime_minutes: items.reduce((sum, i) => sum + (i.total_runtime_minutes || 0), 0),
      power_consumption_kwh: items.reduce((sum, i) => sum + (i.power_consumption_kwh || 0), 0),
      cycle_count: items.reduce((sum, i) => sum + (i.cycle_count || 0), 0),
      efficiency_score: calculateAverage(items.map(i => i.efficiency_score)),
      
      // Alert metrics
      total_alerts: items.reduce((sum, i) => sum + (i.total_alerts || 0), 0),
      critical_alerts: items.reduce((sum, i) => sum + (i.critical_alerts || 0), 0),
      avg_response_time_minutes: calculateAverage(items.map(i => i.avg_response_time_minutes)),
      
      // Performance metrics
      uptime_percentage: calculateAverage(items.map(i => i.uptime_percentage)),
      health_score: calculateAverage(items.map(i => i.health_score)),
      anomaly_count: items.reduce((sum, i) => sum + (i.anomaly_count || 0), 0),
      
      // Custom metrics
      custom_metrics: items.reduce((merged, i) => ({ ...merged, ...i.custom_metrics }), {}),
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }).sort((a, b) => a.date_period.localeCompare(b.date_period));
}

// Helper function to calculate average, ignoring null/undefined values
function calculateAverage(values: (number | undefined | null)[]): number | undefined {
  const validValues = values.filter(v => v != null) as number[];
  return validValues.length > 0 ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length : undefined;
}

// Helper function to generate real-time insights
async function generateRealtimeInsights(
  supabase: any, 
  restaurantId: string, 
  deviceId?: string
): Promise<any> {
  try {
    // Get latest sensor data
    let sensorQuery = supabase
      .from('iot_sensor_data')
      .select(`
        *,
        device:iot_devices!inner(device_name, device_type, zone)
      `)
      .eq('device.restaurant_id', restaurantId)
      .order('recorded_at', { ascending: false })
      .limit(deviceId ? 10 : 50);

    if (deviceId) {
      sensorQuery = sensorQuery.eq('device_id', deviceId);
    }

    const { data: latestSensorData } = await sensorQuery;

    // Get latest equipment status
    let equipmentQuery = supabase
      .from('iot_equipment_status')
      .select(`
        *,
        device:iot_devices!inner(device_name, device_type, zone)
      `)
      .eq('device.restaurant_id', restaurantId)
      .order('status_at', { ascending: false })
      .limit(deviceId ? 5 : 25);

    if (deviceId) {
      equipmentQuery = equipmentQuery.eq('device_id', deviceId);
    }

    const { data: latestEquipmentData } = await equipmentQuery;

    // Get active alerts
    const { data: activeAlerts } = await supabase
      .from('iot_alerts')
      .select(`
        *,
        device:iot_devices(device_name, device_type, zone)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_resolved', false)
      .order('triggered_at', { ascending: false });

    return {
      latest_sensor_readings: latestSensorData?.slice(0, 10) || [],
      equipment_status: latestEquipmentData?.slice(0, 10) || [],
      active_alerts: activeAlerts || [],
      summary: {
        devices_reporting: new Set(latestSensorData?.map(s => s.device_id) || []).size,
        average_temperature: calculateAverage(latestSensorData?.map(s => s.temperature) || []),
        average_humidity: calculateAverage(latestSensorData?.map(s => s.humidity) || []),
        equipment_running: latestEquipmentData?.filter(e => e.is_running).length || 0,
        critical_alerts: activeAlerts?.filter(a => a.severity === 'critical').length || 0
      }
    };

  } catch (error) {
    console.error('Error generating realtime insights:', error);
    return null;
  }
}

// Helper function to generate comparison data
async function generateComparisonData(
  supabase: any,
  restaurantId: string,
  dateFrom: string,
  dateTo: string,
  deviceId?: string
): Promise<any> {
  try {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get comparison period (same length, previous period)
    const comparisonToDate = new Date(fromDate);
    comparisonToDate.setDate(comparisonToDate.getDate() - 1);
    const comparisonFromDate = new Date(comparisonToDate);
    comparisonFromDate.setDate(comparisonFromDate.getDate() - daysDiff);

    // Get current period analytics
    let currentQuery = supabase
      .from('iot_analytics_data')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('date_period', dateFrom)
      .lte('date_period', dateTo);

    // Get comparison period analytics
    let comparisonQuery = supabase
      .from('iot_analytics_data')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('date_period', comparisonFromDate.toISOString().split('T')[0])
      .lte('date_period', comparisonToDate.toISOString().split('T')[0]);

    if (deviceId) {
      currentQuery = currentQuery.eq('device_id', deviceId);
      comparisonQuery = comparisonQuery.eq('device_id', deviceId);
    }

    const [{ data: currentData }, { data: comparisonData }] = await Promise.all([
      currentQuery,
      comparisonQuery
    ]);

    // Calculate aggregated metrics for both periods
    const currentMetrics = calculatePeriodMetrics(currentData || []);
    const comparisonMetrics = calculatePeriodMetrics(comparisonData || []);

    // Calculate percentage changes
    const changes = {
      power_consumption: calculatePercentChange(currentMetrics.total_power, comparisonMetrics.total_power),
      efficiency: calculatePercentChange(currentMetrics.avg_efficiency, comparisonMetrics.avg_efficiency),
      uptime: calculatePercentChange(currentMetrics.avg_uptime, comparisonMetrics.avg_uptime),
      alerts: calculatePercentChange(currentMetrics.total_alerts, comparisonMetrics.total_alerts),
      runtime: calculatePercentChange(currentMetrics.total_runtime, comparisonMetrics.total_runtime)
    };

    return {
      current_period: {
        date_range: { from: dateFrom, to: dateTo },
        metrics: currentMetrics
      },
      comparison_period: {
        date_range: { 
          from: comparisonFromDate.toISOString().split('T')[0], 
          to: comparisonToDate.toISOString().split('T')[0] 
        },
        metrics: comparisonMetrics
      },
      changes
    };

  } catch (error) {
    console.error('Error generating comparison data:', error);
    return null;
  }
}

// Helper function to calculate period metrics
function calculatePeriodMetrics(data: IoTAnalyticsData[]) {
  return {
    total_power: data.reduce((sum, d) => sum + (d.power_consumption_kwh || 0), 0),
    avg_efficiency: calculateAverage(data.map(d => d.efficiency_score)) || 0,
    avg_uptime: calculateAverage(data.map(d => d.uptime_percentage)) || 0,
    total_alerts: data.reduce((sum, d) => sum + (d.total_alerts || 0), 0),
    total_runtime: data.reduce((sum, d) => sum + (d.total_runtime_minutes || 0), 0),
    avg_temperature: calculateAverage(data.map(d => d.avg_temperature)) || 0,
    avg_humidity: calculateAverage(data.map(d => d.avg_humidity)) || 0
  };
}

// Helper function to calculate percentage change
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

// Helper function to generate analytics insights
function generateAnalyticsInsights(data: IoTAnalyticsData[]): any {
  if (data.length === 0) {
    return { insights: [], recommendations: [] };
  }

  const insights = [];
  const recommendations = [];

  // Analyze efficiency trends
  const efficiencyData = data.map(d => d.efficiency_score).filter(e => e != null) as number[];
  if (efficiencyData.length > 1) {
    const trend = calculateTrend(efficiencyData);
    if (trend < -0.02) {
      insights.push({
        type: 'declining_efficiency',
        severity: 'warning',
        message: 'Equipment efficiency is declining over time',
        value: Math.round(trend * 100 * 100) / 100
      });
      recommendations.push('Schedule equipment maintenance and cleaning');
    }
  }

  // Analyze power consumption
  const powerData = data.map(d => d.power_consumption_kwh).filter(p => p != null) as number[];
  if (powerData.length > 0) {
    const avgPower = powerData.reduce((sum, p) => sum + p, 0) / powerData.length;
    const maxPower = Math.max(...powerData);
    
    if (maxPower > avgPower * 1.5) {
      insights.push({
        type: 'high_power_consumption',
        severity: 'info',
        message: 'Peak power consumption detected',
        value: Math.round(maxPower * 100) / 100
      });
      recommendations.push('Review equipment usage patterns during peak periods');
    }
  }

  // Analyze alert patterns
  const alertData = data.map(d => d.total_alerts).filter(a => a != null) as number[];
  if (alertData.length > 0) {
    const avgAlerts = alertData.reduce((sum, a) => sum + a, 0) / alertData.length;
    if (avgAlerts > 2) {
      insights.push({
        type: 'high_alert_frequency',
        severity: 'warning',
        message: 'High frequency of equipment alerts',
        value: Math.round(avgAlerts * 100) / 100
      });
      recommendations.push('Investigate recurring alert patterns and root causes');
    }
  }

  return { insights, recommendations };
}

// Helper function to calculate performance trends
function calculatePerformanceTrends(data: IoTAnalyticsData[]): any {
  if (data.length < 2) {
    return { trends: {}, confidence: 0 };
  }

  const efficiency = data.map(d => d.efficiency_score).filter(e => e != null) as number[];
  const uptime = data.map(d => d.uptime_percentage).filter(u => u != null) as number[];
  const alerts = data.map(d => d.total_alerts).filter(a => a != null) as number[];

  return {
    trends: {
      efficiency: calculateTrend(efficiency),
      uptime: calculateTrend(uptime),
      alerts: calculateTrend(alerts)
    },
    confidence: Math.min(data.length / 30, 1) // Higher confidence with more data points
  };
}

// Helper function to calculate efficiency metrics
function calculateEfficiencyMetrics(data: IoTAnalyticsData[]): any {
  if (data.length === 0) {
    return { overall_efficiency: 0, energy_efficiency: 0, operational_efficiency: 0 };
  }

  const efficiencyScores = data.map(d => d.efficiency_score).filter(e => e != null) as number[];
  const powerData = data.map(d => d.power_consumption_kwh).filter(p => p != null) as number[];
  const runtimeData = data.map(d => d.total_runtime_minutes).filter(r => r != null) as number[];

  const overallEfficiency = efficiencyScores.length > 0 ? 
    efficiencyScores.reduce((sum, e) => sum + e, 0) / efficiencyScores.length : 0;

  // Energy efficiency: power per runtime hour
  const energyEfficiency = powerData.length > 0 && runtimeData.length > 0 ?
    (powerData.reduce((sum, p) => sum + p, 0) / (runtimeData.reduce((sum, r) => sum + r, 0) / 60)) : 0;

  // Operational efficiency: uptime vs alerts
  const uptimeData = data.map(d => d.uptime_percentage).filter(u => u != null) as number[];
  const alertData = data.map(d => d.total_alerts).filter(a => a != null) as number[];
  
  const avgUptime = uptimeData.length > 0 ? uptimeData.reduce((sum, u) => sum + u, 0) / uptimeData.length : 100;
  const avgAlerts = alertData.length > 0 ? alertData.reduce((sum, a) => sum + a, 0) / alertData.length : 0;
  
  const operationalEfficiency = Math.max(0, avgUptime - (avgAlerts * 5)); // Penalize alerts

  return {
    overall_efficiency: Math.round(overallEfficiency * 100) / 100,
    energy_efficiency: Math.round(energyEfficiency * 100) / 100,
    operational_efficiency: Math.round(operationalEfficiency * 100) / 100
  };
}

// Helper function to calculate trend using simple linear regression
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, val) => sum + val, 0) / n;
  
  const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (values[i] - yMean), 0);
  const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// Helper function to generate analytics for a specific period
async function generateAnalyticsForPeriod(
  supabase: any,
  restaurantId: string,
  datePeriod: string,
  deviceId?: string,
  forceRefresh = false
): Promise<IoTAnalyticsData[]> {
  try {
    // Check if analytics already exist for this period
    if (!forceRefresh) {
      let existingQuery = supabase
        .from('iot_analytics_data')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('date_period', datePeriod);

      if (deviceId) {
        existingQuery = existingQuery.eq('device_id', deviceId);
      }

      const { data: existing } = await existingQuery;
      if (existing && existing.length > 0) {
        return []; // Already generated
      }
    }

    // Get devices to process
    let deviceQuery = supabase
      .from('iot_devices')
      .select('id, device_type')
      .eq('restaurant_id', restaurantId);

    if (deviceId) {
      deviceQuery = deviceQuery.eq('id', deviceId);
    }

    const { data: devices } = await deviceQuery;
    if (!devices || devices.length === 0) {
      return [];
    }

    const generatedAnalytics = [];

    for (const device of devices) {
      // Generate analytics for this device and date
      const analytics = await generateDeviceAnalytics(supabase, device.id, datePeriod, restaurantId);
      if (analytics) {
        generatedAnalytics.push(analytics);
      }
    }

    return generatedAnalytics;

  } catch (error) {
    console.error('Error generating analytics for period:', error);
    return [];
  }
}

// Helper function to generate analytics for a specific device and date
async function generateDeviceAnalytics(
  supabase: any,
  deviceId: string,
  datePeriod: string,
  restaurantId: string
): Promise<IoTAnalyticsData | null> {
  try {
    const startDate = new Date(datePeriod);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    // Get sensor data for the period
    const { data: sensorData } = await supabase
      .from('iot_sensor_data')
      .select('*')
      .eq('device_id', deviceId)
      .gte('recorded_at', startDate.toISOString())
      .lt('recorded_at', endDate.toISOString());

    // Get equipment status data for the period
    const { data: equipmentData } = await supabase
      .from('iot_equipment_status')
      .select('*')
      .eq('device_id', deviceId)
      .gte('status_at', startDate.toISOString())
      .lt('status_at', endDate.toISOString());

    // Get alerts for the period
    const { data: alertData } = await supabase
      .from('iot_alerts')
      .select('*')
      .eq('device_id', deviceId)
      .gte('triggered_at', startDate.toISOString())
      .lt('triggered_at', endDate.toISOString());

    // Calculate aggregated metrics
    const analytics = {
      restaurant_id: restaurantId,
      device_id: deviceId,
      date_period: datePeriod,
      
      // Temperature metrics
      avg_temperature: calculateAverage(sensorData?.map(s => s.temperature) || []),
      min_temperature: sensorData && sensorData.length > 0 ? 
        Math.min(...sensorData.map(s => s.temperature).filter(t => t != null)) : undefined,
      max_temperature: sensorData && sensorData.length > 0 ? 
        Math.max(...sensorData.map(s => s.temperature).filter(t => t != null)) : undefined,
      
      // Humidity metrics
      avg_humidity: calculateAverage(sensorData?.map(s => s.humidity) || []),
      min_humidity: sensorData && sensorData.length > 0 ? 
        Math.min(...sensorData.map(s => s.humidity).filter(h => h != null)) : undefined,
      max_humidity: sensorData && sensorData.length > 0 ? 
        Math.max(...sensorData.map(s => s.humidity).filter(h => h != null)) : undefined,
      
      // Equipment metrics
      total_runtime_minutes: equipmentData?.reduce((sum, e) => sum + (e.runtime_hours || 0), 0) * 60 || 0,
      power_consumption_kwh: equipmentData?.reduce((sum, e) => sum + (e.power_consumption || 0), 0) || 0,
      cycle_count: equipmentData?.reduce((sum, e) => sum + (e.cycle_count || 0), 0) || 0,
      efficiency_score: calculateAverage(equipmentData?.map(e => e.efficiency_percentage) || []),
      
      // Alert metrics
      total_alerts: alertData?.length || 0,
      critical_alerts: alertData?.filter(a => a.severity === 'critical').length || 0,
      
      // Performance metrics
      uptime_percentage: equipmentData && equipmentData.length > 0 ? 
        (equipmentData.filter(e => e.is_running).length / equipmentData.length) * 100 : 100,
      health_score: calculateAverage(equipmentData?.map(e => e.health_score) || []) || 1.0,
      anomaly_count: sensorData?.filter(s => s.is_anomaly).length || 0,
      
      custom_metrics: {}
    };

    // Insert analytics data
    const { data: insertedAnalytics, error } = await supabase
      .from('iot_analytics_data')
      .upsert(analytics, { onConflict: 'restaurant_id,device_id,date_period' })
      .select()
      .single();

    if (error) {
      console.error('Error inserting analytics:', error);
      return null;
    }

    return insertedAnalytics;

  } catch (error) {
    console.error('Error generating device analytics:', error);
    return null;
  }
}