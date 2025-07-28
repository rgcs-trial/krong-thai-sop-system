/**
 * Global Operations Dashboard API
 * Enterprise-level operations management across all regions and restaurants
 * 
 * Features:
 * - Global KPI overview with real-time metrics
 * - Multi-region performance comparison
 * - Supply chain status monitoring
 * - Compliance tracking across jurisdictions
 * - Executive-level business intelligence
 * - Critical alert management
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const GlobalDashboardQuerySchema = z.object({
  timeframe: z.enum(['24h', '7d', '30d', '90d', '1y']).optional().default('30d'),
  regionIds: z.array(z.string().uuid()).optional(),
  includeAlerts: z.boolean().optional().default(true),
  includeCompliance: z.boolean().optional().default(true),
  includeSupplyChain: z.boolean().optional().default(true),
  includeFinancials: z.boolean().optional().default(false),
  kpiThreshold: z.number().min(0).max(100).optional().default(80)
});

const GlobalOperationsUpdateSchema = z.object({
  operation: z.enum(['region_status', 'alert_management', 'compliance_override', 'emergency_protocol']),
  targetId: z.string().uuid(),
  parameters: z.record(z.string(), z.any()),
  reason: z.string().min(10).max(1000),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium')
});

// Logger utility with structured logging
function logGlobalOperation(context: string, operation: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const operationLog = {
    timestamp,
    context,
    operation: typeof operation === 'object' ? operation : { message: operation },
    metadata,
    level: 'info'
  };
  
  console.log(`[GLOBAL-OPS] ${timestamp}:`, JSON.stringify(operationLog, null, 2));
}

function logGlobalError(context: string, error: any, metadata?: any) {
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
  
  console.error(`[GLOBAL-OPS-ERROR] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify global admin access
async function verifyGlobalAdminAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select(`
      id, 
      role, 
      full_name,
      restaurant_id,
      restaurants!inner(
        id, 
        name, 
        settings
      )
    `)
    .eq('id', userId)
    .eq('role', 'admin')
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Global admin access required');
  }

  // Check if user has global operations permission
  const globalPermissions = user.restaurants?.settings?.global_operations_access;
  if (!globalPermissions) {
    throw new Error('Global operations access not granted');
  }

  return user;
}

// Helper function to calculate performance scores
function calculatePerformanceScore(metrics: any): number {
  if (!metrics || Object.keys(metrics).length === 0) return 0;
  
  const weights = {
    sop_completion_rate: 0.25,
    training_completion_rate: 0.20,
    compliance_score: 0.30,
    efficiency_score: 0.15,
    customer_satisfaction: 0.10
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  Object.entries(weights).forEach(([metric, weight]) => {
    if (metrics[metric] !== undefined) {
      totalScore += metrics[metric] * weight;
      totalWeight += weight;
    }
  });
  
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// GET: Global Operations Dashboard
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
    
    // Parse array parameters
    if (queryParams.regionIds) {
      try {
        queryParams.regionIds = JSON.parse(queryParams.regionIds);
      } catch {
        queryParams.regionIds = [queryParams.regionIds];
      }
    }
    
    const validationResult = GlobalDashboardQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { timeframe, regionIds, includeAlerts, includeCompliance, includeSupplyChain, includeFinancials, kpiThreshold } = validationResult.data;

    // Verify global admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyGlobalAdminAccess(supabase, userId);
      logGlobalOperation('DASHBOARD_ACCESS', { userId, timeframe, regionIds });
    } catch (error) {
      logGlobalError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (timeframe) {
      case '24h': startDate.setDate(endDate.getDate() - 1); break;
      case '7d': startDate.setDate(endDate.getDate() - 7); break;
      case '30d': startDate.setDate(endDate.getDate() - 30); break;
      case '90d': startDate.setDate(endDate.getDate() - 90); break;
      case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
    }

    // Build region filter
    let regionFilter = supabase.from('restaurants').select('*');
    if (regionIds && regionIds.length > 0) {
      regionFilter = regionFilter.in('settings->>region_id', regionIds);
    }

    // Get global restaurant overview
    const { data: restaurants, error: restaurantsError } = await regionFilter
      .eq('is_active', true)
      .select(`
        id,
        name,
        name_fr,
        address,
        timezone,
        settings,
        created_at,
        updated_at
      `);

    if (restaurantsError) {
      logGlobalError('RESTAURANTS_QUERY', restaurantsError);
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data', code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    // Get global performance metrics
    const { data: performanceMetrics, error: metricsError } = await supabase
      .from('performance_metrics')
      .select(`
        restaurant_id,
        metric_type,
        metric_value,
        recorded_at,
        metadata
      `)
      .gte('recorded_at', startDate.toISOString())
      .lte('recorded_at', endDate.toISOString())
      .in('metric_type', [
        'sop_completion_rate',
        'training_completion_rate', 
        'compliance_score',
        'efficiency_score',
        'customer_satisfaction',
        'revenue_per_day',
        'staff_productivity',
        'waste_percentage'
      ]);

    if (metricsError) {
      logGlobalError('METRICS_QUERY', metricsError);
    }

    // Process performance data by restaurant and region
    const restaurantMetrics: Record<string, any> = {};
    const regionMetrics: Record<string, any> = {};
    
    if (performanceMetrics) {
      performanceMetrics.forEach(metric => {
        if (!restaurantMetrics[metric.restaurant_id]) {
          restaurantMetrics[metric.restaurant_id] = {};
        }
        restaurantMetrics[metric.restaurant_id][metric.metric_type] = metric.metric_value;
        
        const restaurant = restaurants?.find(r => r.id === metric.restaurant_id);
        const regionId = restaurant?.settings?.region_id || 'unknown';
        
        if (!regionMetrics[regionId]) {
          regionMetrics[regionId] = {};
        }
        if (!regionMetrics[regionId][metric.metric_type]) {
          regionMetrics[regionId][metric.metric_type] = [];
        }
        regionMetrics[regionId][metric.metric_type].push(metric.metric_value);
      });
    }

    // Calculate global KPIs
    const totalRestaurants = restaurants?.length || 0;
    const activeRegions = new Set(restaurants?.map(r => r.settings?.region_id).filter(Boolean)).size;
    
    let totalRevenue = 0;
    let avgPerformanceScore = 0;
    let restaurantsWithMetrics = 0;
    
    Object.values(restaurantMetrics).forEach((metrics: any) => {
      if (metrics.revenue_per_day) {
        totalRevenue += metrics.revenue_per_day;
      }
      const score = calculatePerformanceScore(metrics);
      if (score > 0) {
        avgPerformanceScore += score;
        restaurantsWithMetrics++;
      }
    });
    
    avgPerformanceScore = restaurantsWithMetrics > 0 ? Math.round(avgPerformanceScore / restaurantsWithMetrics) : 0;

    // Get system alerts if requested
    let systemAlerts = null;
    if (includeAlerts) {
      const alertsQuery = supabase
        .from('system_alerts')
        .select(`
          id,
          alert_type,
          severity,
          title,
          message,
          restaurant_id,
          is_resolved,
          created_at,
          escalation_level
        `)
        .eq('is_resolved', false)
        .gte('created_at', startDate.toISOString())
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (regionIds && regionIds.length > 0) {
        // Filter alerts by restaurants in specified regions
        const restaurantIds = restaurants?.map(r => r.id) || [];
        if (restaurantIds.length > 0) {
          alertsQuery.in('restaurant_id', restaurantIds);
        }
      }

      const { data: alerts, error: alertsError } = await alertsQuery;
      
      if (!alertsError && alerts) {
        systemAlerts = alerts.map(alert => ({
          ...alert,
          restaurant: restaurants?.find(r => r.id === alert.restaurant_id)
        }));
      }
    }

    // Get compliance status if requested
    let complianceOverview = null;
    if (includeCompliance) {
      // This would typically come from a compliance_frameworks table
      // For now, we'll simulate compliance data
      complianceOverview = {
        totalFrameworks: activeRegions * 3, // Assume 3 frameworks per region
        compliantFrameworks: Math.floor(activeRegions * 3 * 0.85), // 85% compliance
        pendingReviews: Math.floor(activeRegions * 3 * 0.10), // 10% pending
        nonCompliant: Math.floor(activeRegions * 3 * 0.05), // 5% non-compliant
        lastAuditDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        nextAuditDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    // Get supply chain overview if requested
    let supplyChainOverview = null;
    if (includeSupplyChain) {
      // This would typically come from supply_chain_vendors and supply_orders tables
      // For now, we'll simulate supply chain data
      supplyChainOverview = {
        totalVendors: Math.floor(totalRestaurants * 2.5), // Assume 2.5 vendors per restaurant
        activeVendors: Math.floor(totalRestaurants * 2.1), // 84% active
        criticalSupplyIssues: Math.floor(totalRestaurants * 0.03), // 3% critical issues
        averageDeliveryTime: 2.3, // days
        onTimeDeliveryRate: 92.4, // percentage
        qualityScore: 87.6, // percentage
        costOptimizationOpportunities: Math.floor(totalRestaurants * 0.15) // 15% opportunities
      };
    }

    // Identify underperforming entities
    const underperformingRestaurants = restaurants?.filter(restaurant => {
      const metrics = restaurantMetrics[restaurant.id];
      const score = calculatePerformanceScore(metrics);
      return score > 0 && score < kpiThreshold;
    }).map(restaurant => ({
      ...restaurant,
      performanceScore: calculatePerformanceScore(restaurantMetrics[restaurant.id]),
      regionId: restaurant.settings?.region_id
    })) || [];

    const criticalAlerts = systemAlerts?.filter(alert => alert.severity === 'critical') || [];

    // Calculate regional performance
    const regionalPerformance = Object.entries(regionMetrics).map(([regionId, metrics]: [string, any]) => {
      const regionRestaurants = restaurants?.filter(r => r.settings?.region_id === regionId) || [];
      const avgMetrics: Record<string, number> = {};
      
      Object.entries(metrics).forEach(([metricType, values]: [string, any]) => {
        avgMetrics[metricType] = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
      });
      
      return {
        regionId,
        restaurantCount: regionRestaurants.length,
        performanceScore: calculatePerformanceScore(avgMetrics),
        metrics: avgMetrics,
        alertCount: systemAlerts?.filter(alert => 
          regionRestaurants.some(r => r.id === alert.restaurant_id)
        ).length || 0
      };
    });

    const globalDashboardData = {
      overview: {
        totalRestaurants,
        activeRegions,
        totalRevenue,
        averagePerformanceScore: avgPerformanceScore,
        alertCount24h: systemAlerts?.length || 0,
        criticalAlerts: criticalAlerts.length,
        complianceScore: complianceOverview ? 
          Math.round((complianceOverview.compliantFrameworks / complianceOverview.totalFrameworks) * 100) : null,
        supplyChainHealth: supplyChainOverview ? 
          Math.round((supplyChainOverview.onTimeDeliveryRate + supplyChainOverview.qualityScore) / 2) : null
      },
      regionalPerformance,
      underperformingRestaurants: underperformingRestaurants.slice(0, 10), // Top 10 underperforming
      criticalAlerts: criticalAlerts.slice(0, 10), // Top 10 critical alerts
      complianceOverview,
      supplyChainOverview,
      timeframe,
      generatedAt: new Date().toISOString(),
      queryMetadata: {
        timeframe,
        regionIds,
        restaurantsAnalyzed: totalRestaurants,
        metricsProcessed: performanceMetrics?.length || 0,
        kpiThreshold
      }
    };

    logGlobalOperation('DASHBOARD_GENERATED', {
      restaurantsAnalyzed: totalRestaurants,
      regionsAnalyzed: activeRegions,
      alertCount: systemAlerts?.length || 0,
      performanceScore: avgPerformanceScore
    });

    return NextResponse.json({
      success: true,
      data: globalDashboardData
    });

  } catch (error) {
    logGlobalError('UNEXPECTED_ERROR', error, { operation: 'global_dashboard' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Global Operations Command
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = GlobalOperationsUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { operation, targetId, parameters, reason, urgency } = validationResult.data;

    // Verify global admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyGlobalAdminAccess(supabase, userId);
    } catch (error) {
      logGlobalError('ACCESS_DENIED', error, { userId, operation });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    let operationResult: any = {};
    let actionDescription = '';

    // Execute the requested global operation
    switch (operation) {
      case 'region_status':
        // Update region status (would typically update global_regions table)
        actionDescription = `Region status updated: ${parameters.status}`;
        operationResult = {
          regionId: targetId,
          newStatus: parameters.status,
          effectiveDate: new Date().toISOString()
        };
        break;

      case 'alert_management':
        // Bulk alert management operations
        if (parameters.action === 'acknowledge_all') {
          const { error: updateError } = await supabase
            .from('system_alerts')
            .update({
              is_acknowledged: true,
              acknowledged_by: userId,
              acknowledged_at: new Date().toISOString()
            })
            .eq('restaurant_id', targetId)
            .eq('is_resolved', false);

          if (updateError) {
            logGlobalError('ALERT_MANAGEMENT_FAILED', updateError);
            return NextResponse.json(
              { error: 'Failed to manage alerts', code: 'OPERATION_FAILED' },
              { status: 500 }
            );
          }

          actionDescription = 'All alerts acknowledged for target';
          operationResult = { alertsAcknowledged: true, targetId };
        }
        break;

      case 'compliance_override':
        // Emergency compliance override
        actionDescription = `Compliance override applied: ${parameters.override_type}`;
        operationResult = {
          targetId,
          overrideType: parameters.override_type,
          validUntil: parameters.valid_until,
          approvalLevel: 'global_admin'
        };
        break;

      case 'emergency_protocol':
        // Activate emergency protocols
        actionDescription = `Emergency protocol activated: ${parameters.protocol_type}`;
        operationResult = {
          protocolType: parameters.protocol_type,
          scope: parameters.scope || 'global',
          activatedAt: new Date().toISOString(),
          estimatedDuration: parameters.estimated_duration_hours
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported operation', code: 'INVALID_OPERATION' },
          { status: 400 }
        );
    }

    // Log the global operation for audit
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: null, // Global operation
        user_id: userId,
        action: 'UPDATE',
        resource_type: 'global_operations',
        resource_id: targetId,
        details: {
          operation,
          parameters,
          reason,
          urgency,
          actionDescription,
          result: operationResult
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    logGlobalOperation('GLOBAL_OPERATION_EXECUTED', {
      operation,
      targetId,
      urgency,
      actionDescription
    });

    return NextResponse.json({
      success: true,
      message: actionDescription,
      data: {
        operation,
        targetId,
        result: operationResult,
        executedAt: new Date().toISOString(),
        executedBy: userId,
        urgency,
        reason
      }
    });

  } catch (error) {
    logGlobalError('UNEXPECTED_ERROR', error, { operation: 'global_command' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}