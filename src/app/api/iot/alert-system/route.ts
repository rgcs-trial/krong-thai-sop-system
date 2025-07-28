import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import type { 
  IoTAlert,
  IoTAlertRequest,
  IoTAlertFilters,
  IoTAlertSeverity,
  ApiResponse 
} from '@/types/database';

// GET: Fetch IoT alerts with filtering and escalation status
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
      .select('restaurant_id, role')
      .eq('id', user.id)
      .single();

    if (!authUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Parse filters
    const filters: IoTAlertFilters = {
      device_id: searchParams.get('device_id') || undefined,
      severity: searchParams.get('severity')?.split(',') as IoTAlertSeverity[],
      is_resolved: searchParams.get('is_resolved') === 'true' ? true : 
                   searchParams.get('is_resolved') === 'false' ? false : undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      alert_type: searchParams.get('alert_type') || undefined
    };

    const unacknowledgedOnly = searchParams.get('unacknowledged_only') === 'true';
    const escalatedOnly = searchParams.get('escalated_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('iot_alerts')
      .select(`
        *,
        device:iot_devices!inner(
          id,
          device_name,
          device_name_fr,
          device_type,
          location,
          location_fr,
          zone
        ),
        restaurant:restaurants(name, name_fr),
        acknowledged_by_user:auth_users!iot_alerts_acknowledged_by_fkey(
          full_name,
          full_name_fr
        ),
        resolved_by_user:auth_users!iot_alerts_resolved_by_fkey(
          full_name,
          full_name_fr
        ),
        escalated_to_user:auth_users!iot_alerts_escalated_to_fkey(
          full_name,
          full_name_fr
        )
      `)
      .eq('restaurant_id', authUser.restaurant_id)
      .order('triggered_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (filters.device_id) {
      query = query.eq('device_id', filters.device_id);
    }

    if (filters.severity?.length) {
      query = query.in('severity', filters.severity);
    }

    if (filters.is_resolved !== undefined) {
      query = query.eq('is_resolved', filters.is_resolved);
    }

    if (filters.alert_type) {
      query = query.eq('alert_type', filters.alert_type);
    }

    if (filters.date_from) {
      query = query.gte('triggered_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('triggered_at', filters.date_to);
    }

    if (unacknowledgedOnly) {
      query = query.eq('is_acknowledged', false);
    }

    if (escalatedOnly) {
      query = query.gt('escalation_level', 0);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to fetch alerts'
      }, { status: 500 });
    }

    // Calculate alert statistics
    const stats = calculateAlertStats(alerts || []);

    return NextResponse.json<ApiResponse<{
      alerts: IoTAlert[],
      statistics: typeof stats
    }>>({
      success: true,
      data: {
        alerts: alerts || [],
        statistics: stats
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

// POST: Create new IoT alert with automatic escalation rules
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
    const alertData: IoTAlertRequest = await request.json();

    // Validate required fields
    if (!alertData.device_id || !alertData.alert_type || !alertData.severity || !alertData.title || !alertData.message) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device ID, alert type, severity, title, and message are required'
      }, { status: 400 });
    }

    // Verify device exists and get restaurant
    const { data: device, error: deviceError } = await supabase
      .from('iot_devices')
      .select('id, restaurant_id, device_name, zone')
      .eq('id', alertData.device_id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device not found'
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

    // Check for duplicate unresolved alerts
    const { data: existingAlert } = await supabase
      .from('iot_alerts')
      .select('id')
      .eq('device_id', alertData.device_id)
      .eq('alert_type', alertData.alert_type)
      .eq('is_resolved', false)
      .single();

    if (existingAlert) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Similar unresolved alert already exists for this device'
      }, { status: 409 });
    }

    // Prepare alert data
    const newAlert = {
      device_id: alertData.device_id,
      restaurant_id: device.restaurant_id,
      alert_type: alertData.alert_type,
      severity: alertData.severity,
      title: alertData.title,
      title_fr: alertData.title_fr,
      message: alertData.message,
      message_fr: alertData.message_fr,
      threshold_value: alertData.threshold_value,
      actual_value: alertData.actual_value,
      condition_met: alertData.condition_met,
      alert_data: alertData.alert_data || {},
      escalation_level: 0,
      notifications_sent: [],
      triggered_at: new Date().toISOString()
    };

    // Insert alert
    const { data: insertedAlert, error: insertError } = await supabase
      .from('iot_alerts')
      .insert(newAlert)
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
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to create alert'
      }, { status: 500 });
    }

    // Send immediate notifications
    const notifications = await sendAlertNotifications(
      supabase, 
      insertedAlert, 
      device.restaurant_id
    );

    // Check if immediate escalation is needed
    let escalation = null;
    if (shouldEscalateImmediately(insertedAlert)) {
      escalation = await escalateAlert(supabase, insertedAlert.id, device.restaurant_id);
    }

    return NextResponse.json<ApiResponse<{
      alert: IoTAlert,
      notifications_sent: any[],
      escalation?: any
    }>>({
      success: true,
      data: {
        alert: insertedAlert,
        notifications_sent: notifications,
        escalation
      },
      message: 'Alert created and notifications sent successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT: Update alert status (acknowledge, resolve, escalate)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    const action = searchParams.get('action'); // 'acknowledge', 'resolve', 'escalate'

    if (!alertId || !action) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Alert ID and action are required'
      }, { status: 400 });
    }

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user's restaurant and role
    const { data: authUser } = await supabase
      .from('auth_users')
      .select('restaurant_id, role')
      .eq('id', user.id)
      .single();

    if (!authUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Get existing alert
    const { data: existingAlert, error: fetchError } = await supabase
      .from('iot_alerts')
      .select('*')
      .eq('id', alertId)
      .eq('restaurant_id', authUser.restaurant_id)
      .single();

    if (fetchError || !existingAlert) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Alert not found'
      }, { status: 404 });
    }

    // Parse additional data from request body
    const updateData = await request.json();
    let updatedFields: any = {};

    switch (action) {
      case 'acknowledge':
        if (existingAlert.is_acknowledged) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Alert is already acknowledged'
          }, { status: 409 });
        }
        updatedFields = {
          is_acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString()
        };
        break;

      case 'resolve':
        updatedFields = {
          is_resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: updateData.resolution_notes,
          resolution_notes_fr: updateData.resolution_notes_fr
        };
        
        // Auto-acknowledge if not already acknowledged
        if (!existingAlert.is_acknowledged) {
          updatedFields.is_acknowledged = true;
          updatedFields.acknowledged_by = user.id;
          updatedFields.acknowledged_at = new Date().toISOString();
        }
        break;

      case 'escalate':
        if (!['admin', 'manager'].includes(authUser.role)) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Insufficient permissions to escalate'
          }, { status: 403 });
        }
        
        const escalationResult = await escalateAlert(
          supabase, 
          alertId, 
          authUser.restaurant_id,
          updateData.escalate_to
        );
        
        if (!escalationResult) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Failed to escalate alert'
          }, { status: 500 });
        }
        
        updatedFields = {
          escalation_level: escalationResult.level,
          escalated_at: new Date().toISOString(),
          escalated_to: escalationResult.escalated_to
        };
        break;

      default:
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    // Update alert
    const { data: updatedAlert, error: updateError } = await supabase
      .from('iot_alerts')
      .update(updatedFields)
      .eq('id', alertId)
      .select(`
        *,
        device:iot_devices(
          id,
          device_name,
          device_name_fr,
          device_type,
          location
        ),
        acknowledged_by_user:auth_users!iot_alerts_acknowledged_by_fkey(
          full_name,
          full_name_fr
        ),
        resolved_by_user:auth_users!iot_alerts_resolved_by_fkey(
          full_name,
          full_name_fr
        ),
        escalated_to_user:auth_users!iot_alerts_escalated_to_fkey(
          full_name,
          full_name_fr
        )
      `)
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to update alert'
      }, { status: 500 });
    }

    // Log the alert action
    await supabase.from('audit_logs').insert({
      restaurant_id: authUser.restaurant_id,
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'iot_alert',
      resource_id: alertId,
      old_values: existingAlert,
      new_values: updatedAlert,
      metadata: {
        action_type: action,
        alert_type: existingAlert.alert_type,
        severity: existingAlert.severity
      }
    });

    // Send notifications for status changes
    let notifications = [];
    if (action === 'escalate') {
      notifications = await sendEscalationNotifications(
        supabase,
        updatedAlert,
        authUser.restaurant_id
      );
    } else if (action === 'resolve') {
      notifications = await sendResolutionNotifications(
        supabase,
        updatedAlert,
        authUser.restaurant_id
      );
    }

    return NextResponse.json<ApiResponse<{
      alert: IoTAlert,
      notifications_sent?: any[]
    }>>({
      success: true,
      data: {
        alert: updatedAlert,
        notifications_sent: notifications
      },
      message: `Alert ${action}d successfully`
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to calculate alert statistics
function calculateAlertStats(alerts: IoTAlert[]) {
  const total = alerts.length;
  const unresolved = alerts.filter(a => !a.is_resolved).length;
  const critical = alerts.filter(a => a.severity === 'critical').length;
  const emergency = alerts.filter(a => a.severity === 'emergency').length;
  const escalated = alerts.filter(a => a.escalation_level > 0).length;
  const unacknowledged = alerts.filter(a => !a.is_acknowledged).length;

  // Group by alert type
  const byType = alerts.reduce((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by device
  const byDevice = alerts.reduce((acc, alert) => {
    const deviceName = alert.device?.device_name || 'Unknown';
    acc[deviceName] = (acc[deviceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate average response time for resolved alerts
  const resolvedAlerts = alerts.filter(a => a.is_resolved && a.resolved_at);
  const avgResponseTime = resolvedAlerts.length > 0 ? 
    resolvedAlerts.reduce((sum, alert) => {
      const triggered = new Date(alert.triggered_at).getTime();
      const resolved = new Date(alert.resolved_at!).getTime();
      return sum + (resolved - triggered);
    }, 0) / resolvedAlerts.length / (1000 * 60) : 0; // Convert to minutes

  return {
    total,
    unresolved,
    critical,
    emergency,
    escalated,
    unacknowledged,
    resolution_rate: total > 0 ? ((total - unresolved) / total * 100) : 100,
    average_response_time_minutes: Math.round(avgResponseTime),
    by_type: byType,
    by_device: byDevice,
    trends: {
      last_24h: alerts.filter(a => {
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return new Date(a.triggered_at).getTime() > dayAgo;
      }).length,
      last_week: alerts.filter(a => {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return new Date(a.triggered_at).getTime() > weekAgo;
      }).length
    }
  };
}

// Helper function to check if alert should be escalated immediately
function shouldEscalateImmediately(alert: IoTAlert): boolean {
  return alert.severity === 'emergency' || 
         (alert.severity === 'critical' && alert.alert_type.includes('safety'));
}

// Helper function to send alert notifications
async function sendAlertNotifications(
  supabase: any, 
  alert: IoTAlert, 
  restaurantId: string
): Promise<any[]> {
  try {
    // Get users to notify based on alert severity and role
    let roleFilter = ['admin', 'manager'];
    if (alert.severity === 'emergency') {
      roleFilter = ['admin', 'manager', 'staff']; // Notify everyone for emergencies
    }

    const { data: usersToNotify } = await supabase
      .from('auth_users')
      .select('id, full_name, role')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .in('role', roleFilter);

    const notifications = [];

    for (const notifyUser of usersToNotify || []) {
      // Create notification record (would integrate with push notification service)
      const notification = {
        user_id: notifyUser.id,
        type: 'iot_alert',
        title: `${alert.severity.toUpperCase()}: ${alert.title}`,
        message: alert.message,
        data: {
          alert_id: alert.id,
          device_id: alert.device_id,
          severity: alert.severity,
          alert_type: alert.alert_type
        },
        sent_at: new Date().toISOString()
      };

      notifications.push(notification);
    }

    // Update alert with notification records
    await supabase
      .from('iot_alerts')
      .update({
        notifications_sent: notifications
      })
      .eq('id', alert.id);

    return notifications;

  } catch (error) {
    console.error('Error sending notifications:', error);
    return [];
  }
}

// Helper function to escalate alert
async function escalateAlert(
  supabase: any, 
  alertId: string, 
  restaurantId: string,
  escalateTo?: string
): Promise<any> {
  try {
    // Get current escalation level
    const { data: currentAlert } = await supabase
      .from('iot_alerts')
      .select('escalation_level, severity')
      .eq('id', alertId)
      .single();

    if (!currentAlert) return null;

    const newLevel = currentAlert.escalation_level + 1;
    let escalatedToUser = escalateTo;

    // Auto-determine escalation target if not specified
    if (!escalatedToUser) {
      const roleHierarchy = ['admin', 'manager'];
      const targetRole = roleHierarchy[Math.min(newLevel - 1, roleHierarchy.length - 1)];
      
      const { data: escalationTarget } = await supabase
        .from('auth_users')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('role', targetRole)
        .eq('is_active', true)
        .limit(1)
        .single();

      escalatedToUser = escalationTarget?.id;
    }

    return {
      level: newLevel,
      escalated_to: escalatedToUser
    };

  } catch (error) {
    console.error('Error escalating alert:', error);
    return null;
  }
}

// Helper function to send escalation notifications
async function sendEscalationNotifications(
  supabase: any,
  alert: IoTAlert,
  restaurantId: string
): Promise<any[]> {
  // Similar to sendAlertNotifications but for escalation
  return []; // Placeholder
}

// Helper function to send resolution notifications
async function sendResolutionNotifications(
  supabase: any,
  alert: IoTAlert,
  restaurantId: string
): Promise<any[]> {
  // Similar to sendAlertNotifications but for resolution
  return []; // Placeholder
}