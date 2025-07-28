/**
 * Multi-Restaurant Management API
 * Centralized restaurant chain management dashboard
 * 
 * Features:
 * - Chain overview and health metrics
 * - Restaurant performance comparison
 * - Centralized configuration management
 * - Multi-location user management
 * - Brand consistency monitoring
 * - Operational efficiency tracking
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const ChainOverviewQuerySchema = z.object({
  dateRange: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  includeMetrics: z.boolean().optional().default(true),
  includeAlerts: z.boolean().optional().default(true),
  regionId: z.string().uuid().optional(),
  performanceThreshold: z.number().min(0).max(100).optional().default(75)
});

const RestaurantConfigUpdateSchema = z.object({
  restaurantIds: z.array(z.string().uuid()).min(1),
  configUpdates: z.object({
    operationalHours: z.record(z.string(), z.object({
      open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean().optional()
    })).optional(),
    settings: z.record(z.string(), z.any()).optional(),
    brandStandards: z.object({
      menuCompliance: z.boolean().optional(),
      serviceStandards: z.boolean().optional(),
      cleaningProtocols: z.boolean().optional(),
      staffingRequirements: z.boolean().optional()
    }).optional()
  })
});

const StaffManagementSchema = z.object({
  action: z.enum(['transfer', 'promote', 'demote', 'deactivate', 'reactivate']),
  staffId: z.string().uuid(),
  targetRestaurantId: z.string().uuid().optional(),
  newRole: z.enum(['admin', 'manager', 'staff']).optional(),
  reason: z.string().min(10).max(500).optional(),
  effectiveDate: z.string().datetime().optional()
});

// Logger utility
function logError(context: string, error: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata
  };
  
  console.error(`[MULTI-RESTAURANT-MGMT] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify chain admin access
async function verifyChainAdminAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('id, role, restaurant_id, restaurants!inner(id, name)')
    .eq('id', userId)
    .eq('role', 'admin')
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Chain admin access required');
  }

  return user;
}

// GET: Chain Overview Dashboard
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
    
    const validationResult = ChainOverviewQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { dateRange, includeMetrics, includeAlerts, regionId, performanceThreshold } = validationResult.data;

    // Get current user and verify chain admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Mock user ID extraction - in real implementation, decode JWT token
    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyChainAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Calculate date filter
    const endDate = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d': startDate.setDate(endDate.getDate() - 7); break;
      case '30d': startDate.setDate(endDate.getDate() - 30); break;
      case '90d': startDate.setDate(endDate.getDate() - 90); break;
      case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
    }

    // Get chain overview data
    const chainOverviewQuery = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        name_fr,
        address,
        phone,
        email,
        timezone,
        is_active,
        settings,
        created_at,
        updated_at,
        auth_users!inner(count),
        sop_documents!inner(count),
        training_modules!inner(count)
      `)
      .eq('is_active', true);

    if (regionId) {
      chainOverviewQuery.eq('settings->>region_id', regionId);
    }

    const { data: restaurants, error: restaurantsError } = await chainOverviewQuery;

    if (restaurantsError) {
      logError('CHAIN_OVERVIEW_QUERY', restaurantsError);
      return NextResponse.json(
        { error: 'Failed to fetch chain overview', code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    // Get performance metrics if requested
    let performanceMetrics = null;
    if (includeMetrics) {
      const { data: metrics, error: metricsError } = await supabase
        .from('performance_metrics')
        .select(`
          restaurant_id,
          metric_type,
          metric_value,
          recorded_at,
          restaurants!inner(name, name_fr)
        `)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .in('metric_type', ['sop_completion_rate', 'training_completion_rate', 'compliance_score', 'efficiency_score']);

      if (!metricsError && metrics) {
        performanceMetrics = metrics.reduce((acc: any, metric: any) => {
          if (!acc[metric.restaurant_id]) {
            acc[metric.restaurant_id] = {
              restaurantName: metric.restaurants.name,
              restaurantNameFr: metric.restaurants.name_fr,
              metrics: {}
            };
          }
          acc[metric.restaurant_id].metrics[metric.metric_type] = metric.metric_value;
          return acc;
        }, {});
      }
    }

    // Get system alerts if requested
    let systemAlerts = null;
    if (includeAlerts) {
      const { data: alerts, error: alertsError } = await supabase
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
          restaurants!inner(name, name_fr)
        `)
        .eq('is_resolved', false)
        .in('severity', ['high', 'critical'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (!alertsError) {
        systemAlerts = alerts;
      }
    }

    // Calculate chain-wide statistics
    const chainStats = {
      totalRestaurants: restaurants?.length || 0,
      activeRestaurants: restaurants?.filter(r => r.is_active).length || 0,
      totalStaff: restaurants?.reduce((sum, r) => sum + (r.auth_users?.[0]?.count || 0), 0) || 0,
      totalSOPs: restaurants?.reduce((sum, r) => sum + (r.sop_documents?.[0]?.count || 0), 0) || 0,
      totalTrainingModules: restaurants?.reduce((sum, r) => sum + (r.training_modules?.[0]?.count || 0), 0) || 0,
      averagePerformance: performanceMetrics ? 
        Object.values(performanceMetrics).reduce((sum: number, rest: any) => {
          const avgScore = Object.values(rest.metrics).reduce((s: number, m: any) => s + m, 0) / 
                          Object.keys(rest.metrics).length;
          return sum + avgScore;
        }, 0) / Object.keys(performanceMetrics).length : null
    };

    // Identify underperforming restaurants
    const underperformingRestaurants = performanceMetrics ? 
      Object.entries(performanceMetrics)
        .filter(([_, data]: any) => {
          const avgScore = Object.values(data.metrics).reduce((s: number, m: any) => s + m, 0) / 
                          Object.keys(data.metrics).length;
          return avgScore < performanceThreshold;
        })
        .map(([restaurantId, data]: any) => ({
          restaurantId,
          ...data,
          averageScore: Object.values(data.metrics).reduce((s: number, m: any) => s + m, 0) / 
                       Object.keys(data.metrics).length
        })) : [];

    return NextResponse.json({
      success: true,
      data: {
        chainStats,
        restaurants: restaurants?.map(r => ({
          id: r.id,
          name: r.name,
          nameFr: r.name_fr,
          address: r.address,
          phone: r.phone,
          email: r.email,
          timezone: r.timezone,
          isActive: r.is_active,
          settings: r.settings,
          staffCount: r.auth_users?.[0]?.count || 0,
          sopCount: r.sop_documents?.[0]?.count || 0,
          trainingModuleCount: r.training_modules?.[0]?.count || 0,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })),
        performanceMetrics,
        underperformingRestaurants,
        systemAlerts,
        queryParams: {
          dateRange,
          includeMetrics,
          includeAlerts,
          regionId,
          performanceThreshold
        }
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'chain_overview' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Bulk Restaurant Configuration Updates
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
    const validationResult = RestaurantConfigUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { restaurantIds, configUpdates } = validationResult.data;

    // Verify chain admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyChainAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Build settings object
    const settingsUpdates: any = {};
    
    if (configUpdates.operationalHours) {
      settingsUpdates.operational_hours = configUpdates.operationalHours;
    }
    
    if (configUpdates.brandStandards) {
      settingsUpdates.brand_standards = configUpdates.brandStandards;
    }
    
    if (configUpdates.settings) {
      Object.assign(settingsUpdates, configUpdates.settings);
    }

    if (Object.keys(settingsUpdates).length > 0) {
      // Get current settings for each restaurant and merge
      const { data: currentRestaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, settings')
        .in('id', restaurantIds);

      if (fetchError) {
        logError('FETCH_CURRENT_SETTINGS', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch current settings', code: 'FETCH_FAILED' },
          { status: 500 }
        );
      }

      // Update each restaurant with merged settings
      const updatePromises = currentRestaurants?.map(async (restaurant) => {
        const mergedSettings = {
          ...(restaurant.settings || {}),
          ...settingsUpdates,
          lastUpdatedBy: userId,
          lastUpdatedAt: new Date().toISOString()
        };

        return supabase
          .from('restaurants')
          .update({
            settings: mergedSettings,
            updated_at: updateData.updated_at
          })
          .eq('id', restaurant.id);
      });

      const results = await Promise.all(updatePromises || []);
      const failedUpdates = results.filter(result => result.error);

      if (failedUpdates.length > 0) {
        logError('BULK_UPDATE_PARTIAL_FAILURE', failedUpdates.map(r => r.error));
        return NextResponse.json(
          { 
            error: 'Some updates failed', 
            code: 'PARTIAL_FAILURE',
            failedCount: failedUpdates.length,
            successCount: results.length - failedUpdates.length
          },
          { status: 207 }
        );
      }
    }

    // Log configuration change for audit
    const auditPromises = restaurantIds.map(restaurantId => 
      supabase
        .from('audit_logs')
        .insert({
          restaurant_id: restaurantId,
          user_id: userId,
          action: 'UPDATE',
          resource_type: 'restaurant_configuration',
          resource_id: restaurantId,
          details: {
            configUpdates,
            updatedFields: Object.keys(settingsUpdates),
            updateType: 'bulk_configuration_update'
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        })
    );

    await Promise.all(auditPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully updated configuration for ${restaurantIds.length} restaurants`,
      data: {
        updatedRestaurants: restaurantIds.length,
        configUpdates: Object.keys(settingsUpdates),
        timestamp: updateData.updated_at
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'bulk_config_update' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PUT: Staff Management Across Locations
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
    const validationResult = StaffManagementSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { action, staffId, targetRestaurantId, newRole, reason, effectiveDate } = validationResult.data;

    // Verify chain admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyChainAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Get current staff member details
    const { data: staffMember, error: staffError } = await supabase
      .from('auth_users')
      .select(`
        id,
        email,
        role,
        full_name,
        full_name_fr,
        restaurant_id,
        is_active,
        restaurants!inner(name, name_fr)
      `)
      .eq('id', staffId)
      .single();

    if (staffError || !staffMember) {
      return NextResponse.json(
        { error: 'Staff member not found', code: 'STAFF_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Perform the requested action
    let updateData: any = { updated_at: new Date().toISOString() };
    let actionDescription = '';

    switch (action) {
      case 'transfer':
        if (!targetRestaurantId) {
          return NextResponse.json(
            { error: 'Target restaurant ID required for transfer', code: 'MISSING_TARGET' },
            { status: 400 }
          );
        }
        updateData.restaurant_id = targetRestaurantId;
        actionDescription = `Transferred to new location`;
        break;

      case 'promote':
      case 'demote':
        if (!newRole) {
          return NextResponse.json(
            { error: 'New role required for promotion/demotion', code: 'MISSING_ROLE' },
            { status: 400 }
          );
        }
        updateData.role = newRole;
        actionDescription = `Role changed to ${newRole}`;
        break;

      case 'deactivate':
        updateData.is_active = false;
        actionDescription = 'Staff member deactivated';
        break;

      case 'reactivate':
        updateData.is_active = true;
        actionDescription = 'Staff member reactivated';
        break;
    }

    // Update staff member
    const { data: updatedStaff, error: updateError } = await supabase
      .from('auth_users')
      .update(updateData)
      .eq('id', staffId)
      .select(`
        id,
        email,
        role,
        full_name,
        full_name_fr,
        restaurant_id,
        is_active,
        updated_at,
        restaurants!inner(name, name_fr)
      `)
      .single();

    if (updateError) {
      logError('STAFF_UPDATE_FAILED', updateError, { staffId, action, updateData });
      return NextResponse.json(
        { error: 'Failed to update staff member', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    // Log the staff management action
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: staffMember.restaurant_id,
        user_id: userId,
        action: 'UPDATE',
        resource_type: 'staff_management',
        resource_id: staffId,
        details: {
          action,
          previousData: {
            role: staffMember.role,
            restaurant_id: staffMember.restaurant_id,
            is_active: staffMember.is_active
          },
          newData: updateData,
          reason,
          effectiveDate: effectiveDate || new Date().toISOString(),
          actionDescription
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: actionDescription,
      data: {
        staffMember: {
          id: updatedStaff.id,
          email: updatedStaff.email,
          role: updatedStaff.role,
          fullName: updatedStaff.full_name,
          fullNameFr: updatedStaff.full_name_fr,
          restaurantId: updatedStaff.restaurant_id,
          restaurantName: updatedStaff.restaurants.name,
          restaurantNameFr: updatedStaff.restaurants.name_fr,
          isActive: updatedStaff.is_active,
          updatedAt: updatedStaff.updated_at
        },
        action,
        reason,
        effectiveDate: effectiveDate || new Date().toISOString()
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'staff_management' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}