/**
 * SOP Analytics API Route
 * Provides comprehensive analytics and reporting for SOP usage and performance
 * 
 * GET    /api/sop/analytics    - Get SOP analytics data
 * POST   /api/sop/analytics    - Generate custom analytics report
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS } from '@/lib/middleware/auth';
import { sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAnalyticsResponse,
  SOPAnalyticsFilters,
  SOPAuthContext 
} from '@/types/api/sop';

/**
 * Validate analytics request parameters
 */
function validateAnalyticsRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.start_date && !isValidDate(data.start_date)) {
    errors.push('start_date must be a valid ISO 8601 date');
  }

  if (data.end_date && !isValidDate(data.end_date)) {
    errors.push('end_date must be a valid ISO 8601 date');
  }

  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (startDate >= endDate) {
      errors.push('start_date must be before end_date');
    }
  }

  if (data.category_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.category_id)) {
    errors.push('category_id must be a valid UUID');
  }

  if (data.user_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.user_id)) {
    errors.push('user_id must be a valid UUID');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
}

/**
 * Get default date range (last 30 days)
 */
function getDefaultDateRange(): { start_date: string; end_date: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  };
}

/**
 * Generate completion trends data
 */
async function getCompletionTrends(
  restaurantId: string,
  filters: SOPAnalyticsFilters
): Promise<{ date: string; completions: number; unique_users: number }[]> {
  const { start_date, end_date } = filters.start_date && filters.end_date 
    ? { start_date: filters.start_date, end_date: filters.end_date }
    : getDefaultDateRange();

  let query = supabaseAdmin
    .from('user_progress')
    .select('updated_at, user_id')
    .eq('restaurant_id', restaurantId)
    .eq('progress_percentage', 100)
    .gte('updated_at', start_date)
    .lte('updated_at', end_date);

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  const { data: completions } = await query;

  // Group by date
  const dailyData = new Map<string, { completions: Set<string>; users: Set<string> }>();
  
  completions?.forEach(completion => {
    const date = completion.updated_at.split('T')[0];
    if (!dailyData.has(date)) {
      dailyData.set(date, { completions: new Set(), users: new Set() });
    }
    const dayData = dailyData.get(date)!;
    dayData.completions.add(completion.updated_at);
    dayData.users.add(completion.user_id);
  });

  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      completions: data.completions.size,
      unique_users: data.users.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get category performance data
 */
async function getCategoryPerformance(
  restaurantId: string,
  filters: SOPAnalyticsFilters
): Promise<any[]> {
  const { start_date, end_date } = filters.start_date && filters.end_date 
    ? { start_date: filters.start_date, end_date: filters.end_date }
    : getDefaultDateRange();

  // Get all categories
  let categoryQuery = supabaseAdmin
    .from('sop_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);

  if (filters.category_id) {
    categoryQuery = categoryQuery.eq('id', filters.category_id);
  }

  const { data: categories } = await categoryQuery;

  if (!categories || categories.length === 0) {
    return [];
  }

  const categoryPerformance = [];

  for (const category of categories) {
    // Get SOPs in this category
    const { data: categorySOPs } = await supabaseAdmin
      .from('sop_documents')
      .select('id')
      .eq('category_id', category.id)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (!categorySOPs || categorySOPs.length === 0) {
      categoryPerformance.push({
        category,
        completion_rate: 0,
        average_time: 0,
        total_completions: 0,
      });
      continue;
    }

    const sopIds = categorySOPs.map(sop => sop.id);

    // Get completions for this category
    let completionQuery = supabaseAdmin
      .from('user_progress')
      .select('progress_percentage, time_spent, updated_at')
      .in('sop_id', sopIds)
      .eq('restaurant_id', restaurantId)
      .gte('updated_at', start_date)
      .lte('updated_at', end_date);

    if (filters.user_id) {
      completionQuery = completionQuery.eq('user_id', filters.user_id);
    }

    const { data: completions } = await completionQuery;

    const totalProgress = completions?.length || 0;
    const completedCount = completions?.filter(c => c.progress_percentage === 100).length || 0;
    const averageTime = totalProgress > 0 
      ? completions.reduce((sum, c) => sum + c.time_spent, 0) / totalProgress 
      : 0;
    const completionRate = totalProgress > 0 ? (completedCount / totalProgress) * 100 : 0;

    categoryPerformance.push({
      category,
      completion_rate: Math.round(completionRate * 100) / 100,
      average_time: Math.round(averageTime),
      total_completions: completedCount,
    });
  }

  return categoryPerformance.sort((a, b) => b.total_completions - a.total_completions);
}

/**
 * Get user performance data
 */
async function getUserPerformance(
  restaurantId: string,
  filters: SOPAnalyticsFilters
): Promise<any[]> {
  const { start_date, end_date } = filters.start_date && filters.end_date 
    ? { start_date: filters.start_date, end_date: filters.end_date }
    : getDefaultDateRange();

  // Get user progress data
  let query = supabaseAdmin
    .from('user_progress')
    .select(`
      user_id,
      progress_percentage,
      time_spent,
      auth_users!inner(id, full_name, role)
    `)
    .eq('restaurant_id', restaurantId)
    .gte('updated_at', start_date)
    .lte('updated_at', end_date);

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters.department) {
    query = query.eq('auth_users.role', filters.department);
  }

  const { data: userProgress } = await query;

  // Group by user
  const userStats = new Map<string, {
    user: any;
    completions: number;
    totalTime: number;
    totalProgress: number;
  }>();

  userProgress?.forEach(progress => {
    const userId = progress.user_id;
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        user: progress.auth_users,
        completions: 0,
        totalTime: 0,
        totalProgress: 0,
      });
    }
    
    const userStat = userStats.get(userId)!;
    if (progress.progress_percentage === 100) {
      userStat.completions++;
    }
    userStat.totalTime += progress.time_spent;
    userStat.totalProgress++;
  });

  return Array.from(userStats.entries())
    .map(([userId, stats]) => ({
      user_id: userId,
      full_name: stats.user.full_name,
      completions: stats.completions,
      average_time: stats.totalProgress > 0 ? Math.round(stats.totalTime / stats.totalProgress) : 0,
      completion_rate: stats.totalProgress > 0 ? Math.round((stats.completions / stats.totalProgress) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.completions - a.completions)
    .slice(0, 20); // Top 20 users
}

/**
 * Get most and least accessed SOPs
 */
async function getSOPAccessStats(
  restaurantId: string,
  filters: SOPAnalyticsFilters
): Promise<{ mostAccessed: any[]; leastAccessed: any[] }> {
  const { start_date, end_date } = filters.start_date && filters.end_date 
    ? { start_date: filters.start_date, end_date: filters.end_date }
    : getDefaultDateRange();

  // Get access metrics from performance_metrics table
  let metricsQuery = supabaseAdmin
    .from('performance_metrics')
    .select('metadata')
    .eq('restaurant_id', restaurantId)
    .eq('metric_type', 'sop_access')
    .eq('metric_name', 'document_view')
    .gte('timestamp', start_date)
    .lte('timestamp', end_date);

  const { data: metrics } = await metricsQuery;

  // Count access by SOP ID
  const accessCounts = new Map<string, number>();
  metrics?.forEach(metric => {
    const sopId = metric.metadata?.sop_id;
    if (sopId) {
      accessCounts.set(sopId, (accessCounts.get(sopId) || 0) + 1);
    }
  });

  // Get SOP details for the most and least accessed
  const sopIds = Array.from(accessCounts.keys());
  if (sopIds.length === 0) {
    return { mostAccessed: [], leastAccessed: [] };
  }

  const { data: sops } = await supabaseAdmin
    .from('sop_documents')
    .select(`
      *,
      category:sop_categories!inner(id, name, name_fr, icon, color)
    `)
    .in('id', sopIds)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);

  const sopsWithAccess = (sops || []).map(sop => ({
    ...sop,
    access_count: accessCounts.get(sop.id) || 0,
  }));

  const sorted = sopsWithAccess.sort((a, b) => b.access_count - a.access_count);

  return {
    mostAccessed: sorted.slice(0, 10),
    leastAccessed: sorted.slice(-10).reverse(),
  };
}

/**
 * GET /api/sop/analytics - Get SOP analytics data
 */
async function handleGetAnalytics(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: SOPAnalyticsFilters = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      user_id: searchParams.get('user_id') || undefined,
      department: searchParams.get('department') || undefined,
    };

    // Validate request
    const validation = validateAnalyticsRequest(filters);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid analytics parameters',
        details: validation.errors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // For non-admin users, restrict access to their own data
    if (context.role !== 'admin' && context.role !== 'manager') {
      filters.user_id = context.userId;
    }

    const { start_date, end_date } = filters.start_date && filters.end_date 
      ? { start_date: filters.start_date, end_date: filters.end_date }
      : getDefaultDateRange();

    // Parallel data fetching for better performance
    const [
      overviewData,
      completionTrends,
      categoryPerformance,
      userPerformance,
      sopAccessStats,
    ] = await Promise.all([
      // Overview statistics
      (async () => {
        const { data: totalSOPs } = await supabaseAdmin
          .from('sop_documents')
          .select('id', { count: 'exact' })
          .eq('restaurant_id', context.restaurantId)
          .eq('is_active', true);

        let completionQuery = supabaseAdmin
          .from('user_progress')
          .select('progress_percentage, time_spent')
          .eq('restaurant_id', context.restaurantId)
          .gte('updated_at', start_date)
          .lte('updated_at', end_date);

        if (filters.user_id) {
          completionQuery = completionQuery.eq('user_id', filters.user_id);
        }

        const { data: completions } = await completionQuery;

        const totalCompletions = completions?.length || 0;
        const completedSOPs = completions?.filter(c => c.progress_percentage === 100).length || 0;
        const averageTime = totalCompletions > 0 
          ? completions.reduce((sum, c) => sum + c.time_spent, 0) / totalCompletions 
          : 0;
        const completionRate = totalCompletions > 0 ? (completedSOPs / totalCompletions) * 100 : 0;

        return {
          total_sops: totalSOPs?.length || 0,
          total_completions: totalCompletions,
          average_completion_rate: Math.round(completionRate * 100) / 100,
          average_time_per_sop: Math.round(averageTime),
        };
      })(),
      getCompletionTrends(context.restaurantId, filters),
      getCategoryPerformance(context.restaurantId, filters),
      getUserPerformance(context.restaurantId, filters),
      getSOPAccessStats(context.restaurantId, filters),
    ]);

    const analyticsResponse: SOPAnalyticsResponse = {
      overview: overviewData,
      completion_trends: completionTrends,
      category_performance: categoryPerformance,
      user_performance: userPerformance,
      most_accessed_sops: sopAccessStats.mostAccessed,
      least_accessed_sops: sopAccessStats.leastAccessed,
    };

    // Log analytics access
    await supabaseAdmin
      .from('performance_metrics')
      .insert({
        restaurant_id: context.restaurantId,
        metric_type: 'analytics_access',
        metric_name: 'sop_analytics_viewed',
        metric_value: 1,
        measurement_unit: 'count',
        timestamp: new Date().toISOString(),
        metadata: {
          user_id: context.userId,
          filters,
          date_range: { start_date, end_date },
        },
      });

    const response: APIResponse<SOPAnalyticsResponse> = {
      success: true,
      data: analyticsResponse,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/analytics - Generate custom analytics report
 */
async function handleCreateAnalyticsReport(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const filters = sanitizeInput(body) as SOPAnalyticsFilters;

    // Validate request
    const validation = validateAnalyticsRequest(filters);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid analytics parameters',
        details: validation.errors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // For non-admin users, restrict access to their own data
    if (context.role !== 'admin' && context.role !== 'manager') {
      filters.user_id = context.userId;
    }

    // Use the same logic as GET but with POST body filters
    const url = new URL(request.url);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    const getRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers,
    });

    return handleGetAnalytics(getRequest, context);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetAnalytics, PERMISSIONS.ANALYTICS.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleCreateAnalyticsReport, PERMISSIONS.ANALYTICS.READ, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}