import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import type { 
  IoTEquipmentStatus,
  IoTMaintenanceSchedule,
  ApiResponse 
} from '@/types/database';

// GET: Fetch equipment status and predictive maintenance data
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

    const deviceId = searchParams.get('device_id');
    const includeHistory = searchParams.get('include_history') === 'true';
    const includePredictions = searchParams.get('include_predictions') === 'true';
    const maintenanceDue = searchParams.get('maintenance_due') === 'true';

    // Build base query for equipment status
    let query = supabase
      .from('iot_equipment_status')
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
          restaurant_id,
          thresholds,
          maintenance_schedule
        )
      `);

    // Filter by user's restaurant devices
    query = query.eq('device.restaurant_id', authUser.restaurant_id);

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    // Get latest status for each device
    query = query.order('status_at', { ascending: false });

    const { data: equipmentStatus, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to fetch equipment status'
      }, { status: 500 });
    }

    // Get unique latest status per device
    const latestStatusMap = new Map<string, any>();
    equipmentStatus?.forEach(status => {
      if (!latestStatusMap.has(status.device_id)) {
        latestStatusMap.set(status.device_id, status);
      }
    });

    let result: any = {
      equipment_status: Array.from(latestStatusMap.values())
    };

    // Include historical data if requested
    if (includeHistory && deviceId) {
      const { data: historyData } = await supabase
        .from('iot_equipment_status')
        .select('*')
        .eq('device_id', deviceId)
        .order('status_at', { ascending: false })
        .limit(50);
      
      result.history = historyData;
    }

    // Include predictive maintenance data if requested
    if (includePredictions) {
      const deviceIds = Array.from(latestStatusMap.keys());
      
      const predictions = await Promise.all(
        deviceIds.map(async (id) => {
          const prediction = await generateMaintenancePrediction(supabase, id);
          return { device_id: id, ...prediction };
        })
      );

      result.maintenance_predictions = predictions;
    }

    // Get maintenance schedules if requested
    if (maintenanceDue || deviceId) {
      let maintenanceQuery = supabase
        .from('iot_maintenance_schedule')
        .select(`
          *,
          device:iot_devices!inner(
            id,
            device_name,
            device_name_fr,
            device_type,
            restaurant_id
          ),
          assignee:auth_users(full_name, full_name_fr)
        `)
        .eq('device.restaurant_id', authUser.restaurant_id);

      if (deviceId) {
        maintenanceQuery = maintenanceQuery.eq('device_id', deviceId);
      }

      if (maintenanceDue) {
        maintenanceQuery = maintenanceQuery.in('status', ['due', 'overdue', 'scheduled']);
      }

      const { data: maintenanceSchedules } = await maintenanceQuery
        .order('scheduled_date', { ascending: true });

      result.maintenance_schedules = maintenanceSchedules;
    }

    // Calculate overall equipment health scores
    const healthScores = result.equipment_status.map((status: any) => ({
      device_id: status.device_id,
      device_name: status.device?.device_name,
      health_score: status.health_score,
      prediction: calculateEquipmentHealthTrend(status)
    }));

    result.health_summary = {
      average_health: healthScores.reduce((sum, h) => sum + h.health_score, 0) / healthScores.length,
      devices_at_risk: healthScores.filter(h => h.health_score < 0.7).length,
      maintenance_required: healthScores.filter(h => h.prediction === 'maintenance_due').length,
      devices: healthScores
    };

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

// POST: Update equipment status and run predictive maintenance analysis
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

    // Parse request body
    const statusData = await request.json();

    // Validate required fields
    if (!statusData.device_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device ID is required'
      }, { status: 400 });
    }

    // Verify device exists and user has access
    const { data: device, error: deviceError } = await supabase
      .from('iot_devices')
      .select('id, restaurant_id, device_name, device_type, maintenance_schedule')
      .eq('id', statusData.device_id)
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

    // Calculate health score based on various factors
    const healthScore = calculateHealthScore(statusData);

    // Prepare equipment status data
    const newStatusData = {
      device_id: statusData.device_id,
      is_running: statusData.is_running ?? false,
      power_consumption: statusData.power_consumption,
      cycle_count: statusData.cycle_count ?? 0,
      runtime_hours: statusData.runtime_hours ?? 0,
      efficiency_percentage: statusData.efficiency_percentage,
      temperature_avg: statusData.temperature_avg,
      vibration_level: statusData.vibration_level,
      error_count: statusData.error_count ?? 0,
      health_score: healthScore,
      status_data: statusData.status_data || {},
      error_codes: statusData.error_codes || [],
      status_at: statusData.status_at || new Date().toISOString()
    };

    // Insert equipment status
    const { data: insertedStatus, error: insertError } = await supabase
      .from('iot_equipment_status')
      .insert(newStatusData)
      .select(`
        *,
        device:iot_devices(
          id,
          device_name,
          device_name_fr,
          device_type,
          location
        )
      `)
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to record equipment status'
      }, { status: 500 });
    }

    // Update device online status
    await supabase
      .from('iot_devices')
      .update({ 
        is_online: true, 
        last_seen_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', statusData.device_id);

    // Run predictive maintenance analysis
    const maintenancePrediction = await generateMaintenancePrediction(
      supabase, 
      statusData.device_id
    );

    // Check if maintenance should be scheduled
    let scheduledMaintenance = null;
    if (maintenancePrediction.should_schedule) {
      scheduledMaintenance = await schedulePreventiveMaintenance(
        supabase,
        device,
        maintenancePrediction,
        authUser.restaurant_id
      );
    }

    // Check for critical alerts
    const criticalAlerts = [];
    if (healthScore < 0.3) {
      criticalAlerts.push({
        type: 'critical_health',
        message: `Equipment health critically low: ${Math.round(healthScore * 100)}%`
      });
    }

    if (statusData.error_count > 5) {
      criticalAlerts.push({
        type: 'high_error_rate',
        message: `High error count detected: ${statusData.error_count} errors`
      });
    }

    return NextResponse.json<ApiResponse<{
      equipment_status: IoTEquipmentStatus,
      maintenance_prediction: any,
      scheduled_maintenance?: IoTMaintenanceSchedule,
      critical_alerts: any[]
    }>>({
      success: true,
      data: {
        equipment_status: insertedStatus,
        maintenance_prediction: maintenancePrediction,
        scheduled_maintenance: scheduledMaintenance,
        critical_alerts: criticalAlerts
      },
      message: 'Equipment status updated successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to calculate health score
function calculateHealthScore(statusData: any): number {
  let score = 1.0;

  // Factor in efficiency
  if (statusData.efficiency_percentage !== undefined) {
    const efficiencyFactor = statusData.efficiency_percentage / 100;
    score *= (0.3 + 0.7 * efficiencyFactor); // 30% base + 70% efficiency based
  }

  // Factor in error count
  if (statusData.error_count > 0) {
    const errorPenalty = Math.min(statusData.error_count * 0.1, 0.5);
    score -= errorPenalty;
  }

  // Factor in vibration levels (if available)
  if (statusData.vibration_level !== undefined) {
    if (statusData.vibration_level > 10) { // Assuming high vibration threshold
      score -= 0.2;
    }
  }

  // Factor in temperature (if equipment is overheating)
  if (statusData.temperature_avg !== undefined) {
    // Assume equipment optimal temp is under 60°C, critical over 80°C
    if (statusData.temperature_avg > 80) {
      score -= 0.3;
    } else if (statusData.temperature_avg > 60) {
      score -= 0.1;
    }
  }

  // Factor in runtime hours (wear and tear)
  if (statusData.runtime_hours > 8760) { // More than a year of continuous operation
    const wearFactor = Math.min((statusData.runtime_hours - 8760) / 8760 * 0.2, 0.3);
    score -= wearFactor;
  }

  return Math.max(0, Math.min(1, score));
}

// Helper function to generate maintenance predictions
async function generateMaintenancePrediction(supabase: any, deviceId: string) {
  try {
    // Get historical equipment status data
    const { data: historyData } = await supabase
      .from('iot_equipment_status')
      .select('*')
      .eq('device_id', deviceId)
      .order('status_at', { ascending: false })
      .limit(30);

    if (!historyData || historyData.length < 5) {
      return {
        confidence: 0.1,
        days_until_maintenance: null,
        should_schedule: false,
        prediction_factors: ['insufficient_data']
      };
    }

    const latest = historyData[0];
    const factors = [];
    let riskScore = 0;

    // Analyze health score trend
    const healthScores = historyData.map(h => h.health_score).slice(0, 10);
    const healthTrend = calculateTrend(healthScores);
    
    if (healthTrend < -0.02) { // Declining health
      riskScore += 0.3;
      factors.push('declining_health');
    }

    // Analyze error count trend
    const errorCounts = historyData.map(h => h.error_count).slice(0, 10);
    const errorTrend = calculateTrend(errorCounts);
    
    if (errorTrend > 0.1) { // Increasing errors
      riskScore += 0.2;
      factors.push('increasing_errors');
    }

    // Check runtime hours
    if (latest.runtime_hours > 8000) {
      riskScore += 0.2;
      factors.push('high_runtime');
    }

    // Check efficiency
    if (latest.efficiency_percentage && latest.efficiency_percentage < 70) {
      riskScore += 0.15;
      factors.push('low_efficiency');
    }

    // Check for recent maintenance
    const { data: recentMaintenance } = await supabase
      .from('iot_maintenance_schedule')
      .select('completed_at')
      .eq('device_id', deviceId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    let daysSinceLastMaintenance = 365; // Default if no maintenance history
    if (recentMaintenance?.completed_at) {
      const lastMaintenanceDate = new Date(recentMaintenance.completed_at);
      const daysSince = (Date.now() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24);
      daysSinceLastMaintenance = daysSince;
    }

    if (daysSinceLastMaintenance > 90) {
      riskScore += 0.1;
      factors.push('overdue_maintenance');
    }

    // Calculate prediction
    const confidence = Math.min(historyData.length / 30, 1); // More data = higher confidence
    const shouldSchedule = riskScore > 0.4;
    const daysUntilMaintenance = shouldSchedule ? 
      Math.max(1, Math.round(30 * (1 - riskScore))) : null;

    return {
      confidence,
      risk_score: riskScore,
      days_until_maintenance: daysUntilMaintenance,
      should_schedule: shouldSchedule,
      prediction_factors: factors,
      recommended_actions: generateRecommendedActions(factors, latest)
    };

  } catch (error) {
    console.error('Error generating maintenance prediction:', error);
    return {
      confidence: 0,
      days_until_maintenance: null,
      should_schedule: false,
      prediction_factors: ['prediction_error']
    };
  }
}

// Helper function to calculate trend (simple linear regression slope)
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

// Helper function to generate recommended actions
function generateRecommendedActions(factors: string[], latestStatus: any): string[] {
  const actions = [];

  if (factors.includes('declining_health')) {
    actions.push('Perform comprehensive equipment inspection');
  }

  if (factors.includes('increasing_errors')) {
    actions.push('Check error logs and diagnose fault patterns');
  }

  if (factors.includes('high_runtime')) {
    actions.push('Schedule extended maintenance window for component replacement');
  }

  if (factors.includes('low_efficiency')) {
    actions.push('Clean and calibrate equipment components');
  }

  if (factors.includes('overdue_maintenance')) {
    actions.push('Schedule immediate preventive maintenance');
  }

  if (latestStatus.temperature_avg > 60) {
    actions.push('Check cooling systems and ventilation');
  }

  if (latestStatus.vibration_level > 5) {
    actions.push('Inspect mounting and mechanical components');
  }

  return actions.length > 0 ? actions : ['Continue regular monitoring'];
}

// Helper function to schedule preventive maintenance
async function schedulePreventiveMaintenance(
  supabase: any,
  device: any,
  prediction: any,
  restaurantId: string
): Promise<IoTMaintenanceSchedule | null> {
  try {
    // Check if maintenance is already scheduled
    const { data: existingMaintenance } = await supabase
      .from('iot_maintenance_schedule')
      .select('id')
      .eq('device_id', device.id)
      .in('status', ['scheduled', 'due'])
      .single();

    if (existingMaintenance) {
      return null; // Already scheduled
    }

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + (prediction.days_until_maintenance || 7));

    const maintenanceData = {
      device_id: device.id,
      restaurant_id: restaurantId,
      maintenance_type: 'predictive',
      title: `Predictive Maintenance - ${device.device_name}`,
      title_fr: `Maintenance Prédictive - ${device.device_name}`,
      description: `Automated scheduling based on equipment condition analysis. Risk factors: ${prediction.prediction_factors.join(', ')}`,
      description_fr: `Planification automatisée basée sur l'analyse de l'état de l'équipement. Facteurs de risque: ${prediction.prediction_factors.join(', ')}`,
      scheduled_date: scheduledDate.toISOString(),
      estimated_duration_minutes: 120,
      status: 'scheduled' as const,
      priority: prediction.risk_score > 0.7 ? 'high' : 'medium',
      predictive_score: prediction.risk_score
    };

    const { data: scheduledMaintenance, error } = await supabase
      .from('iot_maintenance_schedule')
      .insert(maintenanceData)
      .select()
      .single();

    if (error) {
      console.error('Error scheduling maintenance:', error);
      return null;
    }

    return scheduledMaintenance;

  } catch (error) {
    console.error('Error in schedulePreventiveMaintenance:', error);
    return null;
  }
}

// Helper function to calculate equipment health trend
function calculateEquipmentHealthTrend(status: any): string {
  const healthScore = status.health_score;
  
  if (healthScore < 0.3) return 'critical';
  if (healthScore < 0.5) return 'maintenance_due';
  if (healthScore < 0.7) return 'monitoring_required';
  return 'good';
}