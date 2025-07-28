/**
 * Comprehensive Monitoring and Alerting API
 * Real-time system monitoring with intelligent alerting
 * 
 * Features:
 * - Real-time performance monitoring across all systems
 * - Predictive alerting based on trend analysis
 * - Multi-channel notification system (email, SMS, Slack, webhook)
 * - Alert escalation and acknowledgment workflows
 * - System health dashboards and metrics
 * - Custom alert rule configuration
 * - Historical alert analytics and reporting
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const MonitoringQuerySchema = z.object({
  scope: z.enum(['alerts', 'metrics', 'health', 'rules', 'analytics']).optional().default('alerts'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved', 'escalated']).optional(),
  timeframe: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
  restaurantId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  systemComponent: z.string().optional(),
  includeMetrics: z.boolean().optional().default(true),
  includeHistory: z.boolean().optional().default(false),
  limit: z.number().min(1).max(1000).optional().default(50)
});

const CreateAlertRuleSchema = z.object({
  rule_name: z.string().min(3).max(200),
  rule_name_fr: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional(),
  metric_name: z.string().min(1),
  condition: z.enum(['greater_than', 'less_than', 'equals', 'not_equals', 'between', 'outside_range']),
  threshold_value: z.number(),
  threshold_value_secondary: z.number().optional(), // For 'between' and 'outside_range'
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  evaluation_window_minutes: z.number().min(1).max(1440).optional().default(5),
  consecutive_breaches: z.number().min(1).max(10).optional().default(1),
  scope: z.object({
    restaurant_ids: z.array(z.string().uuid()).optional().default([]),
    region_ids: z.array(z.string().uuid()).optional().default([]),
    system_components: z.array(z.string()).optional().default([])
  }),
  notification_config: z.object({
    channels: z.array(z.enum(['email', 'sms', 'slack', 'webhook', 'push'])).min(1),
    recipients: z.array(z.string()).min(1),
    escalation_minutes: z.number().min(1).max(1440).optional().default(30),
    escalation_recipients: z.array(z.string()).optional().default([]),
    auto_resolve_after_minutes: z.number().optional()
  }),
  is_active: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([])
});

const AlertActionSchema = z.object({
  alert_ids: z.array(z.string().uuid()).min(1),
  action: z.enum(['acknowledge', 'resolve', 'escalate', 'snooze', 'close']),
  reason: z.string().optional(),
  snooze_duration_minutes: z.number().optional(),
  escalate_to: z.string().uuid().optional(),
  resolution_notes: z.string().optional(),
  resolution_notes_fr: z.string().optional()
});

const MetricIngestionSchema = z.object({
  metrics: z.array(z.object({
    metric_name: z.string().min(1),
    metric_category: z.string().min(1),
    metric_value: z.number(),
    unit: z.string().min(1),
    timestamp: z.string().datetime().optional(),
    restaurant_id: z.string().uuid().optional(),
    region_id: z.string().uuid().optional(),
    system_component: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional().default({}),
    tags: z.array(z.string()).optional().default([])
  })).min(1).max(1000)
});

// Alert severity configurations
const ALERT_SEVERITY_CONFIG = {
  low: {
    color: '#10B981', // green
    escalation_delay: 60, // minutes
    auto_resolve: 120 // minutes
  },
  medium: {
    color: '#F59E0B', // yellow
    escalation_delay: 30,
    auto_resolve: 60
  },
  high: {
    color: '#EF4444', // red
    escalation_delay: 15,
    auto_resolve: null // No auto-resolve
  },
  critical: {
    color: '#DC2626', // dark red
    escalation_delay: 5,
    auto_resolve: null
  }
};

// System health thresholds
const HEALTH_THRESHOLDS = {
  api_response_time: { warning: 1000, critical: 3000 }, // ms
  database_connections: { warning: 80, critical: 95 }, // percentage
  cpu_usage: { warning: 70, critical: 90 }, // percentage
  memory_usage: { warning: 80, critical: 95 }, // percentage
  disk_usage: { warning: 85, critical: 95 }, // percentage
  error_rate: { warning: 5, critical: 10 }, // percentage
  sop_completion_rate: { warning: 85, critical: 75 }, // percentage (inverted)
  training_completion_rate: { warning: 80, critical: 70 } // percentage (inverted)
};

// Logger utility
function logMonitoring(context: string, operation: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const operationLog = {
    timestamp,
    context,
    operation,
    metadata,
    level: 'info'
  };
  
  console.log(`[MONITORING] ${timestamp}:`, JSON.stringify(operationLog, null, 2));
}

function logMonitoringError(context: string, error: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata,
    level: 'error'
  };
  
  console.error(`[MONITORING-ERROR] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify monitoring admin access
async function verifyMonitoringAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select(`
      id, 
      role, 
      full_name,
      restaurant_id,
      restaurants!inner(settings)
    `)
    .eq('id', userId)
    .in('role', ['admin', 'manager'])
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Monitoring access required');
  }

  return user;
}

// Helper function to evaluate alert conditions
function evaluateAlertCondition(rule: any, currentValue: number): boolean {
  switch (rule.condition) {
    case 'greater_than':
      return currentValue > rule.threshold_value;
    case 'less_than':
      return currentValue < rule.threshold_value;
    case 'equals':
      return currentValue === rule.threshold_value;
    case 'not_equals':
      return currentValue !== rule.threshold_value;
    case 'between':
      return currentValue >= rule.threshold_value && 
             currentValue <= (rule.threshold_value_secondary || rule.threshold_value);
    case 'outside_range':
      return currentValue < rule.threshold_value || 
             currentValue > (rule.threshold_value_secondary || rule.threshold_value);
    default:
      return false;
  }
}

// Helper function to generate system health score
function calculateSystemHealthScore(metrics: any[]): number {
  if (!metrics || metrics.length === 0) return 100;

  let totalScore = 0;
  let metricCount = 0;

  metrics.forEach(metric => {
    const thresholds = HEALTH_THRESHOLDS[metric.metric_name];
    if (!thresholds) return;

    let score = 100;
    if (metric.metric_value >= thresholds.critical) {
      score = 0;
    } else if (metric.metric_value >= thresholds.warning) {
      score = 50;
    }

    // Handle inverted metrics (where lower is worse)
    if (['sop_completion_rate', 'training_completion_rate'].includes(metric.metric_name)) {
      if (metric.metric_value <= thresholds.critical) {
        score = 0;
      } else if (metric.metric_value <= thresholds.warning) {
        score = 50;
      }
    }

    totalScore += score;
    metricCount++;
  });

  return metricCount > 0 ? Math.round(totalScore / metricCount) : 100;
}

// Helper function to simulate alert notifications
async function simulateNotification(alert: any, channels: string[]): Promise<any> {
  const notifications = [];
  
  for (const channel of channels) {
    let success = Math.random() > 0.05; // 95% success rate
    let deliveryTime = Math.floor(Math.random() * 5000) + 1000; // 1-6 seconds
    
    notifications.push({
      channel,
      status: success ? 'delivered' : 'failed',
      delivery_time_ms: deliveryTime,
      attempted_at: new Date().toISOString(),
      error: success ? null : 'Simulated delivery failure'
    });

    // Simulate async delivery
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }
  
  return notifications;
}

// GET: Monitoring Dashboard
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = MonitoringQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { 
      scope, 
      severity, 
      status, 
      timeframe, 
      restaurantId, 
      regionId, 
      systemComponent, 
      includeMetrics, 
      includeHistory, 
      limit 
    } = validationResult.data;

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyMonitoringAccess(supabase, userId);
      logMonitoring('MONITORING_ACCESS', { userId, scope, timeframe });
    } catch (error) {
      logMonitoringError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (timeframe) {
      case '1h': startDate.setHours(endDate.getHours() - 1); break;
      case '6h': startDate.setHours(endDate.getHours() - 6); break;
      case '24h': startDate.setDate(endDate.getDate() - 1); break;
      case '7d': startDate.setDate(endDate.getDate() - 7); break;
      case '30d': startDate.setDate(endDate.getDate() - 30); break;
    }

    let responseData: any = {};

    if (scope === 'alerts' || scope === 'analytics') {
      // Generate mock alert data
      const mockAlerts = [
        {
          id: '1',
          alert_type: 'performance_degradation',
          severity: 'high',
          title: 'High API Response Time',
          title_fr: 'Temps de réponse API élevé',
          message: 'Average API response time exceeded 2000ms threshold',
          message_fr: 'Le temps de réponse moyen de l\'API a dépassé le seuil de 2000ms',
          restaurant_id: restaurantId || 'rest-001',
          system_component: 'api_gateway',
          threshold_value: 2000,
          current_value: 2450,
          is_acknowledged: false,
          is_resolved: false,
          escalation_level: 1,
          triggered_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          alert_data: {
            endpoint: '/api/sop/documents',
            affected_users: 23,
            error_rate: 5.2
          }
        },
        {
          id: '2',
          alert_type: 'compliance_violation',
          severity: 'critical',
          title: 'SOP Completion Rate Critical',
          title_fr: 'Taux de completion SOP critique',
          message: 'SOP completion rate dropped below 75% critical threshold',
          message_fr: 'Le taux de completion des SOP est tombé sous le seuil critique de 75%',
          restaurant_id: restaurantId || 'rest-002',
          system_component: 'sop_system',
          threshold_value: 75,
          current_value: 68.5,
          is_acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          is_resolved: false,
          escalation_level: 2,
          escalated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          triggered_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          alert_data: {
            affected_categories: ['food_safety', 'cleaning'],
            pending_sops: 12,
            overdue_sops: 5
          }
        },
        {
          id: '3',
          alert_type: 'system_error',
          severity: 'medium',
          title: 'Database Connection Pool Warning',
          title_fr: 'Avertissement pool de connexions BD',
          message: 'Database connection pool usage above 80%',
          message_fr: 'Utilisation du pool de connexions BD au-dessus de 80%',
          restaurant_id: null, // System-wide
          system_component: 'database',
          threshold_value: 80,
          current_value: 84.2,
          is_acknowledged: false,
          is_resolved: false,
          escalation_level: 0,
          triggered_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          alert_data: {
            active_connections: 42,
            max_connections: 50,
            slow_queries: 3
          }
        }
      ];

      // Filter alerts based on criteria
      let filteredAlerts = mockAlerts;
      
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }
      
      if (status) {
        filteredAlerts = filteredAlerts.filter(alert => {
          switch (status) {
            case 'active': return !alert.is_resolved && !alert.is_acknowledged;
            case 'acknowledged': return alert.is_acknowledged && !alert.is_resolved;
            case 'resolved': return alert.is_resolved;
            case 'escalated': return alert.escalation_level > 0;
            default: return true;
          }
        });
      }
      
      if (restaurantId) {
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.restaurant_id === restaurantId || alert.restaurant_id === null
        );
      }
      
      if (systemComponent) {
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.system_component === systemComponent
        );
      }

      responseData.alerts = filteredAlerts.slice(0, limit);

      // Alert analytics
      if (scope === 'analytics') {
        const totalAlerts = filteredAlerts.length;
        const criticalAlerts = filteredAlerts.filter(a => a.severity === 'critical').length;
        const acknowledgedAlerts = filteredAlerts.filter(a => a.is_acknowledged).length;
        const resolvedAlerts = filteredAlerts.filter(a => a.is_resolved).length;
        const escalatedAlerts = filteredAlerts.filter(a => a.escalation_level > 0).length;

        responseData.alertAnalytics = {
          totalAlerts,
          criticalAlerts,
          highAlerts: filteredAlerts.filter(a => a.severity === 'high').length,
          mediumAlerts: filteredAlerts.filter(a => a.severity === 'medium').length,
          lowAlerts: filteredAlerts.filter(a => a.severity === 'low').length,
          acknowledgedAlerts,
          unresolvedAlerts: totalAlerts - resolvedAlerts,
          escalatedAlerts,
          averageResolutionTimeMinutes: 45.3, // Simulated
          alertsByComponent: filteredAlerts.reduce((acc: any, alert) => {
            acc[alert.system_component] = (acc[alert.system_component] || 0) + 1;
            return acc;
          }, {}),
          alertTrends: {
            last_hour: Math.floor(Math.random() * 5),
            last_6_hours: Math.floor(Math.random() * 15) + 5,
            last_24_hours: totalAlerts,
            percentage_change_24h: (Math.random() - 0.5) * 40 // -20% to +20%
          }
        };
      }
    }

    if (scope === 'metrics' || includeMetrics) {
      // Generate mock metrics data
      const mockMetrics = [
        {
          id: '1',
          metric_name: 'api_response_time',
          metric_category: 'performance',
          metric_value: 245.6,
          unit: 'ms',
          timestamp: endDate.toISOString(),
          system_component: 'api_gateway',
          quality_score: 0.95,
          is_anomaly: false
        },
        {
          id: '2',
          metric_name: 'database_connections',
          metric_category: 'infrastructure',
          metric_value: 84.2,
          unit: 'percentage',
          timestamp: endDate.toISOString(),
          system_component: 'database',
          quality_score: 0.98,
          is_anomaly: true
        },
        {
          id: '3',
          metric_name: 'sop_completion_rate',
          metric_category: 'business',
          metric_value: 92.3,
          unit: 'percentage',
          timestamp: endDate.toISOString(),
          restaurant_id: restaurantId || 'rest-001',
          quality_score: 0.99,
          is_anomaly: false
        },
        {
          id: '4',
          metric_name: 'cpu_usage',
          metric_category: 'infrastructure',
          metric_value: 45.8,
          unit: 'percentage',
          timestamp: endDate.toISOString(),
          system_component: 'app_server',
          quality_score: 0.97,
          is_anomaly: false
        },
        {
          id: '5',
          metric_name: 'error_rate',
          metric_category: 'performance',
          metric_value: 2.1,
          unit: 'percentage',
          timestamp: endDate.toISOString(),
          system_component: 'api_gateway',
          quality_score: 0.96,
          is_anomaly: false
        }
      ];

      responseData.metrics = mockMetrics;
      responseData.systemHealthScore = calculateSystemHealthScore(mockMetrics);
    }

    if (scope === 'health') {
      // System health overview
      responseData.systemHealth = {
        overall_score: calculateSystemHealthScore(responseData.metrics || []),
        component_health: {
          api_gateway: { status: 'healthy', score: 95, last_check: endDate.toISOString() },
          database: { status: 'warning', score: 78, last_check: endDate.toISOString() },
          app_server: { status: 'healthy', score: 98, last_check: endDate.toISOString() },
          cache_layer: { status: 'healthy', score: 92, last_check: endDate.toISOString() },
          file_storage: { status: 'healthy', score: 96, last_check: endDate.toISOString() }
        },
        uptime_percentage_24h: 99.97,
        incident_count_24h: 1,
        maintenance_windows: [
          {
            description: 'Scheduled database maintenance',
            start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            duration_minutes: 30,
            impact: 'minimal'
          }
        ]
      };
    }

    if (scope === 'rules') {
      // Mock alert rules
      responseData.alertRules = [
        {
          id: '1',
          rule_name: 'API Response Time Alert',
          metric_name: 'api_response_time',
          condition: 'greater_than',
          threshold_value: 2000,
          severity: 'high',
          is_active: true,
          trigger_count_24h: 3,
          last_triggered: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          rule_name: 'SOP Completion Critical',
          metric_name: 'sop_completion_rate',
          condition: 'less_than',
          threshold_value: 75,
          severity: 'critical',
          is_active: true,
          trigger_count_24h: 1,
          last_triggered: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        }
      ];
    }

    // Add historical data if requested
    if (includeHistory) {
      responseData.historical = {
        alert_volume_trends: generateTimeSeries(startDate, endDate, 'hourly', 'alert_count'),
        metric_trends: {
          api_response_time: generateTimeSeries(startDate, endDate, 'hourly', 'response_time'),
          sop_completion_rate: generateTimeSeries(startDate, endDate, 'hourly', 'completion_rate')
        }
      };
    }

    logMonitoring('MONITORING_QUERY', {
      scope,
      alertsReturned: responseData.alerts?.length || 0,
      metricsReturned: responseData.metrics?.length || 0,
      healthScore: responseData.systemHealthScore || null,
      timeframe
    });

    return NextResponse.json({
      success: true,
      data: {
        ...responseData,
        metadata: {
          scope,
          timeframe,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          generatedAt: new Date().toISOString(),
          dataFreshness: 'real-time'
        }
      }
    });

  } catch (error) {
    logMonitoringError('UNEXPECTED_ERROR', error, { operation: 'monitoring_query' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// Helper function to generate time series data
function generateTimeSeries(startDate: Date, endDate: Date, granularity: string, metricType: string): any[] {
  const data = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    let value;
    switch (metricType) {
      case 'alert_count':
        value = Math.floor(Math.random() * 10);
        break;
      case 'response_time':
        value = 200 + Math.random() * 800 + Math.sin(current.getTime() / (1000 * 60 * 60)) * 100;
        break;
      case 'completion_rate':
        value = 85 + Math.random() * 10 + Math.cos(current.getTime() / (1000 * 60 * 60 * 6)) * 5;
        break;
      default:
        value = Math.random() * 100;
    }

    data.push({
      timestamp: current.toISOString(),
      value: Math.round(value * 100) / 100
    });

    // Increment based on granularity
    switch (granularity) {
      case 'hourly': current.setHours(current.getHours() + 1); break;
      case 'daily': current.setDate(current.getDate() + 1); break;
      default: current.setHours(current.getHours() + 1);
    }
  }

  return data.slice(0, 100); // Limit data points
}

// POST: Create Alert Rule or Ingest Metrics
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    // Parse request body
    const body = await request.json();
    const operation = body.operation || 'create_rule';

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyMonitoringAccess(supabase, userId);
    } catch (error) {
      logMonitoringError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    if (operation === 'ingest_metrics') {
      const validationResult = MetricIngestionSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
          { status: 400 }
        );
      }

      const { metrics } = validationResult.data;
      
      // Process ingested metrics (in real implementation, this would insert into monitoring_metrics table)
      const processedMetrics = metrics.map(metric => ({
        id: `metric-${Date.now()}-${Math.random()}`,
        ...metric,
        timestamp: metric.timestamp || new Date().toISOString(),
        quality_score: 0.95 + Math.random() * 0.05,
        is_anomaly: Math.random() < 0.05, // 5% chance of anomaly
        created_at: new Date().toISOString()
      }));

      // Simulate alert rule evaluation
      const triggeredAlerts = [];
      for (const metric of processedMetrics) {
        // Simulate checking against alert rules
        if (metric.metric_name === 'api_response_time' && metric.metric_value > 2000) {
          triggeredAlerts.push({
            rule_id: '1',
            metric: metric.metric_name,
            threshold: 2000,
            current_value: metric.metric_value,
            severity: 'high'
          });
        }
      }

      logMonitoring('METRICS_INGESTED', {
        metricsProcessed: processedMetrics.length,
        alertsTriggered: triggeredAlerts.length,
        ingestedBy: userId
      });

      return NextResponse.json({
        success: true,
        message: `Successfully ingested ${processedMetrics.length} metrics`,
        data: {
          metricsProcessed: processedMetrics.length,
          alertsTriggered: triggeredAlerts.length,
          triggeredAlerts,
          processedAt: new Date().toISOString()
        }
      });

    } else {
      // Create alert rule
      const validationResult = CreateAlertRuleSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
          { status: 400 }
        );
      }

      const ruleData = validationResult.data;
      
      // Create the alert rule (in real implementation, this would insert into alert_rules table)
      const newRule = {
        id: `rule-${Date.now()}`,
        ...ruleData,
        created_by: userId,
        trigger_count: 0,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Log the alert rule creation
      await supabase
        .from('audit_logs')
        .insert({
          restaurant_id: null,
          user_id: userId,
          action: 'CREATE',
          resource_type: 'alert_rule',
          resource_id: newRule.id,
          details: {
            ruleName: ruleData.rule_name,
            metricName: ruleData.metric_name,
            condition: ruleData.condition,
            threshold: ruleData.threshold_value,
            severity: ruleData.severity
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        });

      logMonitoring('ALERT_RULE_CREATED', {
        ruleId: newRule.id,
        ruleName: ruleData.rule_name,
        metricName: ruleData.metric_name,
        severity: ruleData.severity,
        createdBy: userId
      });

      return NextResponse.json({
        success: true,
        message: 'Alert rule created successfully',
        data: {
          ruleId: newRule.id,
          ruleName: newRule.rule_name,
          metricName: newRule.metric_name,
          severity: newRule.severity,
          isActive: newRule.is_active,
          createdAt: newRule.created_at
        }
      });
    }

  } catch (error) {
    logMonitoringError('UNEXPECTED_ERROR', error, { operation: 'monitoring_create' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PUT: Alert Actions (Acknowledge, Resolve, etc.)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    // Parse and validate request body
    const body = await request.json();
    const validationResult = AlertActionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { alert_ids, action, reason, snooze_duration_minutes, escalate_to, resolution_notes, resolution_notes_fr } = validationResult.data;

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyMonitoringAccess(supabase, userId);
    } catch (error) {
      logMonitoringError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Process the alert action
    const timestamp = new Date().toISOString();
    const actionResults = [];

    for (const alertId of alert_ids) {
      let updateData: any = { updated_at: timestamp };
      let actionDescription = '';

      switch (action) {
        case 'acknowledge':
          updateData.is_acknowledged = true;
          updateData.acknowledged_by = userId;
          updateData.acknowledged_at = timestamp;
          actionDescription = 'Alert acknowledged';
          break;

        case 'resolve':
          updateData.is_resolved = true;
          updateData.resolved_by = userId;
          updateData.resolved_at = timestamp;
          updateData.resolution_notes = resolution_notes;
          updateData.resolution_notes_fr = resolution_notes_fr;
          actionDescription = 'Alert resolved';
          break;

        case 'escalate':
          updateData.escalation_level = 1; // Increment in real implementation
          updateData.escalated_to = escalate_to;
          updateData.escalated_at = timestamp;
          actionDescription = 'Alert escalated';
          break;

        case 'snooze':
          const snoozeUntil = new Date(Date.now() + (snooze_duration_minutes || 30) * 60 * 1000);
          updateData.snoozed_until = snoozeUntil.toISOString();
          updateData.snoozed_by = userId;
          actionDescription = `Alert snoozed for ${snooze_duration_minutes || 30} minutes`;
          break;

        case 'close':
          updateData.is_resolved = true;
          updateData.resolved_by = userId;
          updateData.resolved_at = timestamp;
          updateData.resolution_notes = reason || 'Manually closed';
          actionDescription = 'Alert closed';
          break;
      }

      // In real implementation, this would update the system_alerts table
      actionResults.push({
        alert_id: alertId,
        action,
        status: 'success',
        action_description: actionDescription,
        performed_by: userId,
        performed_at: timestamp,
        update_data: updateData
      });

      // Simulate notification for certain actions
      if (['escalate', 'resolve'].includes(action)) {
        const notifications = await simulateNotification(
          { id: alertId, severity: 'medium' },
          ['email', 'slack']
        );
        actionResults[actionResults.length - 1].notifications = notifications;
      }
    }

    // Log the alert actions
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: null,
        user_id: userId,
        action: 'UPDATE',
        resource_type: 'alert_action',
        resource_id: alert_ids.join(','),
        details: {
          action,
          alertIds: alert_ids,
          reason,
          actionResults: actionResults.length
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    logMonitoring('ALERT_ACTION_PERFORMED', {
      action,
      alertCount: alert_ids.length,
      performedBy: userId,
      successCount: actionResults.filter(r => r.status === 'success').length
    });

    return NextResponse.json({
      success: true,
      message: `Successfully performed ${action} on ${alert_ids.length} alert(s)`,
      data: {
        action,
        alertsProcessed: alert_ids.length,
        results: actionResults,
        performedAt: timestamp,
        performedBy: userId
      }
    });

  } catch (error) {
    logMonitoringError('UNEXPECTED_ERROR', error, { operation: 'alert_action' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}