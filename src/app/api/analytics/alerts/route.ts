/**
 * Analytics Alerts API
 * POST /api/analytics/alerts - Receive system alerts
 * GET /api/analytics/alerts - Get system alerts and notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    const body = await request.json();
    const { type, data, timestamp, userAgent, url } = body;

    // Validate request body
    if (!type || !data || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data, timestamp' },
        { status: 400 }
      );
    }

    try {
      // Determine alert severity based on type and data
      let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'medium';
      let title = 'System Alert';
      let message = 'System alert detected';

      switch (type) {
        case 'poor-performance':
          severity = data.metric === 'cls' ? 'high' : 'medium';
          title = `Poor ${data.metric.toUpperCase()} Performance`;
          message = `${data.metric} is ${data.value}${data.threshold?.unit || ''}, exceeding threshold of ${data.threshold?.needsImprovement || 'unknown'}`;
          break;
        
        case 'long-task':
          severity = data.duration > 200 ? 'high' : 'medium';
          title = 'Long Task Detected';
          message = `Task took ${data.duration}ms to complete, blocking main thread`;
          break;
        
        case 'high-memory-usage':
          severity = data.usagePercent > 90 ? 'critical' : 'high';
          title = 'High Memory Usage';
          message = `Memory usage at ${data.usagePercent.toFixed(1)}% of available heap`;
          break;
        
        case 'network-offline':
          severity = 'high';
          title = 'Network Connection Lost';
          message = 'Device has gone offline, switching to offline mode';
          break;
        
        case 'network-online':
          severity = 'info';
          title = 'Network Connection Restored';
          message = 'Device is back online, syncing data';
          break;
        
        case 'sop-access-denied':
          severity = 'medium';
          title = 'SOP Access Denied';
          message = `User attempted to access restricted SOP: ${data.sopTitle || 'Unknown'}`;
          break;
        
        case 'training-failed':
          severity = 'medium';
          title = 'Training Assessment Failed';
          message = `User failed training assessment: ${data.moduleTitle || 'Unknown'}`;
          break;
        
        case 'security-violation':
          severity = 'critical';
          title = 'Security Policy Violation';
          message = data.message || 'Security policy violation detected';
          break;

        default:
          title = `System Alert: ${type}`;
          message = typeof data === 'string' ? data : JSON.stringify(data);
      }

      // Create alert record
      const alertRecord = {
        alert_type: type,
        severity,
        title,
        message,
        source: 'system',
        metadata: {
          originalData: data,
          userAgent,
          url,
          timestamp: new Date(timestamp).toISOString()
        },
        is_resolved: false,
        created_at: new Date().toISOString()
      };

      const { data: insertedAlert, error: insertError } = await supabase
        .from('system_alerts')
        .insert([alertRecord])
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert alert:', insertError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to store alert',
            details: insertError.message 
          },
          { status: 500 }
        );
      }

      // For critical alerts, create audit log entry
      if (severity === 'critical') {
        await supabase
          .from('audit_logs')
          .insert([{
            action: 'alert_created',
            resource_type: 'system_alert',
            resource_id: insertedAlert.id,
            metadata: {
              alertType: type,
              severity,
              title
            }
          }]);
      }

      return NextResponse.json({
        success: true,
        message: 'Alert recorded successfully',
        alertId: insertedAlert.id,
        severity
      });

    } catch (dbError) {
      console.error('Database error in alerts API:', dbError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to store alert',
          details: dbError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Alerts POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    const { searchParams } = new URL(request.url);
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const severity = searchParams.get('severity') || 'all';
    const status = searchParams.get('status') || 'all'; // resolved, unresolved, all
    const limit = parseInt(searchParams.get('limit') || '50');
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default: // 30d
        startDate.setDate(startDate.getDate() - 30);
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    try {
      // Build alerts query
      let alertsQuery = supabase
        .from('system_alerts')
        .select('*')
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (severity !== 'all') {
        alertsQuery = alertsQuery.eq('severity', severity);
      }

      if (status === 'resolved') {
        alertsQuery = alertsQuery.eq('is_resolved', true);
      } else if (status === 'unresolved') {
        alertsQuery = alertsQuery.eq('is_resolved', false);
      }

      const { data: alerts, error: alertsError } = await alertsQuery;

      if (alertsError) throw alertsError;

      // Process alerts for response
      const processedAlerts = (alerts || []).map(alert => ({
        id: alert.id,
        type: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        source: alert.source,
        isResolved: alert.is_resolved,
        timestamp: alert.created_at,
        resolvedAt: alert.resolved_at,
        resolvedBy: alert.resolved_by,
        acknowledgement: alert.acknowledgement_note ? {
          by: alert.acknowledged_by,
          at: alert.acknowledged_at,
          note: alert.acknowledgement_note
        } : null,
        metadata: alert.metadata
      }));

      // Calculate summary statistics
      const summary = {
        total: processedAlerts.length,
        unresolved: processedAlerts.filter(a => !a.isResolved).length,
        critical: processedAlerts.filter(a => a.severity === 'critical').length,
        high: processedAlerts.filter(a => a.severity === 'high').length,
        medium: processedAlerts.filter(a => a.severity === 'medium').length,
        low: processedAlerts.filter(a => a.severity === 'low').length,
        info: processedAlerts.filter(a => a.severity === 'info').length
      };

      // Group alerts by type for analytics
      const alertsByType = processedAlerts.reduce((acc, alert) => {
        if (!acc[alert.type]) {
          acc[alert.type] = { count: 0, unresolved: 0, lastOccurred: null };
        }
        acc[alert.type].count++;
        if (!alert.isResolved) acc[alert.type].unresolved++;
        if (!acc[alert.type].lastOccurred || alert.timestamp > acc[alert.type].lastOccurred) {
          acc[alert.type].lastOccurred = alert.timestamp;
        }
        return acc;
      }, {} as Record<string, any>);

      // Recent critical alerts
      const recentCritical = processedAlerts
        .filter(a => a.severity === 'critical' && !a.isResolved)
        .slice(0, 5);

      // Alert trends (daily counts for the period)
      const alertTrends = [];
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * dayInMs);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const dayAlerts = processedAlerts.filter(alert => {
          const alertDate = new Date(alert.timestamp);
          return alertDate >= dayStart && alertDate <= dayEnd;
        });

        alertTrends.push({
          date: dayStart.toISOString().split('T')[0],
          total: dayAlerts.length,
          critical: dayAlerts.filter(a => a.severity === 'critical').length,
          high: dayAlerts.filter(a => a.severity === 'high').length,
          medium: dayAlerts.filter(a => a.severity === 'medium').length,
          resolved: dayAlerts.filter(a => a.isResolved).length
        });
      }

      const alertsAnalytics = {
        // Summary statistics
        summary: {
          ...summary,
          period,
          startDate: startDateStr,
          generatedAt: new Date().toISOString()
        },

        // Alert list
        alerts: processedAlerts,

        // Analytics
        analytics: {
          byType: alertsByType,
          trends: alertTrends,
          recentCritical,
          
          // Top alert types
          topTypes: Object.entries(alertsByType)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 5)
            .map(([type, data]) => ({ type, ...data })),

          // Resolution rate
          resolutionRate: summary.total > 0 
            ? Math.round(((summary.total - summary.unresolved) / summary.total) * 100)
            : 100
        },

        // Recommendations
        recommendations: [
          ...(summary.critical > 0 ? ['Address critical alerts immediately'] : []),
          ...(summary.unresolved > 10 ? ['Review alert resolution process'] : []),
          ...(alertsByType['poor-performance']?.count > 5 ? ['Investigate performance issues'] : []),
          ...(alertsByType['high-memory-usage']?.count > 3 ? ['Optimize memory usage'] : [])
        ]
      };

      return NextResponse.json({
        success: true,
        data: alertsAnalytics
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch alerts',
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH endpoint for resolving alerts
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    const body = await request.json();
    const { alertIds, action, note } = body;

    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role, email')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and admins can manage alerts
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid alertIds array' },
        { status: 400 }
      );
    }

    try {
      let updateData: any = {};
      
      switch (action) {
        case 'resolve':
          updateData = {
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: user.email
          };
          break;
        
        case 'acknowledge':
          updateData = {
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: user.email,
            acknowledgement_note: note || 'Alert acknowledged'
          };
          break;
        
        case 'unresolve':
          updateData = {
            is_resolved: false,
            resolved_at: null,
            resolved_by: null
          };
          break;
        
        default:
          return NextResponse.json(
            { error: 'Invalid action. Use: resolve, acknowledge, or unresolve' },
            { status: 400 }
          );
      }

      const { data: updatedAlerts, error: updateError } = await supabase
        .from('system_alerts')
        .update(updateData)
        .in('id', alertIds)
        .select();

      if (updateError) {
        return NextResponse.json(
          { 
            error: 'Failed to update alerts',
            details: updateError.message 
          },
          { status: 500 }
        );
      }

      // Create audit log entry
      await supabase
        .from('audit_logs')
        .insert([{
          action: `alert_${action}`,
          resource_type: 'system_alert',
          resource_id: alertIds.join(','),
          user_id: user.id,
          metadata: {
            action,
            alertCount: alertIds.length,
            note
          }
        }]);

      return NextResponse.json({
        success: true,
        message: `Successfully ${action}d ${alertIds.length} alert(s)`,
        updatedAlerts: updatedAlerts?.length || 0
      });

    } catch (dbError) {
      console.error('Database error in alert update:', dbError);
      return NextResponse.json(
        { 
          error: 'Failed to update alerts',
          details: dbError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Alerts PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}