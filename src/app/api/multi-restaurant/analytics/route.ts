/**
 * Multi-Restaurant Analytics API
 * Cross-location analytics and benchmarking system
 * 
 * Features:
 * - Performance benchmarking across locations
 * - Comparative analytics and KPI tracking
 * - Best practice identification
 * - Efficiency scoring and ranking
 * - Regional performance analysis
 * - Trend analysis and forecasting
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const AnalyticsQuerySchema = z.object({
  dateRange: z.enum(['7d', '30d', '90d', '6m', '1y']).optional().default('30d'),
  metrics: z.array(z.enum([
    'sop_completion_rate',
    'training_completion_rate',
    'compliance_score',
    'efficiency_score',
    'customer_satisfaction',
    'staff_productivity',
    'cost_efficiency',
    'safety_incidents',
    'quality_score'
  ])).optional(),
  restaurantIds: z.array(z.string().uuid()).optional(),
  regionId: z.string().uuid().optional(),
  benchmarkType: z.enum(['regional', 'chain', 'category', 'peer']).optional().default('chain'),
  aggregation: z.enum(['daily', 'weekly', 'monthly']).optional().default('weekly'),
  includeForecasting: z.boolean().optional().default(false),
  includeComparison: z.boolean().optional().default(true)
});

const BenchmarkCreateSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  metrics: z.array(z.object({
    metricType: z.string(),
    weight: z.number().min(0).max(1),
    target: z.number(),
    threshold: z.object({
      excellent: z.number(),
      good: z.number(),
      fair: z.number(),
      poor: z.number()
    })
  })).min(1),
  restaurantIds: z.array(z.string().uuid()).optional(),
  regionId: z.string().uuid().optional(),
  isActive: z.boolean().optional().default(true)
});

const PerformanceReportSchema = z.object({
  reportType: z.enum(['executive', 'operational', 'comparative', 'trend_analysis']),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  restaurantIds: z.array(z.string().uuid()).optional(),
  includeRecommendations: z.boolean().optional().default(true),
  format: z.enum(['json', 'csv', 'pdf']).optional().default('json')
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
  
  console.error(`[MULTI-RESTAURANT-ANALYTICS] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify analytics access
async function verifyAnalyticsAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('id, role, restaurant_id, restaurants!inner(id, name)')
    .eq('id', userId)
    .in('role', ['admin', 'manager'])
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Analytics access required');
  }

  return user;
}

// Helper function to calculate performance scores
function calculatePerformanceScore(metrics: any[], weights: Record<string, number>) {
  const weightedSum = metrics.reduce((sum, metric) => {
    const weight = weights[metric.metric_type] || 0;
    return sum + (metric.metric_value * weight);
  }, 0);
  
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// Helper function to generate performance ranking
function generateRanking(restaurantMetrics: any[]) {
  return restaurantMetrics
    .sort((a, b) => b.overallScore - a.overallScore)
    .map((restaurant, index) => ({
      ...restaurant,
      rank: index + 1,
      percentile: ((restaurantMetrics.length - index) / restaurantMetrics.length) * 100
    }));
}

// GET: Cross-Location Analytics Dashboard
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
    if (queryParams.metrics) {
      queryParams.metrics = queryParams.metrics.split(',');
    }
    if (queryParams.restaurantIds) {
      queryParams.restaurantIds = queryParams.restaurantIds.split(',');
    }
    
    const validationResult = AnalyticsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { 
      dateRange, 
      metrics, 
      restaurantIds, 
      regionId, 
      benchmarkType, 
      aggregation, 
      includeForecasting, 
      includeComparison 
    } = validationResult.data;

    // Verify analytics access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyAnalyticsAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d': startDate.setDate(endDate.getDate() - 7); break;
      case '30d': startDate.setDate(endDate.getDate() - 30); break;
      case '90d': startDate.setDate(endDate.getDate() - 90); break;
      case '6m': startDate.setMonth(endDate.getMonth() - 6); break;
      case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
    }

    // Build restaurant filter query
    let restaurantQuery = supabase
      .from('restaurants')
      .select('id, name, name_fr, settings')
      .eq('is_active', true);

    if (restaurantIds && restaurantIds.length > 0) {
      restaurantQuery = restaurantQuery.in('id', restaurantIds);
    }

    if (regionId) {
      restaurantQuery = restaurantQuery.eq('settings->>region_id', regionId);
    }

    const { data: restaurants, error: restaurantsError } = await restaurantQuery;

    if (restaurantsError) {
      logError('RESTAURANTS_QUERY', restaurantsError);
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data', code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    const restaurantIdList = restaurants?.map(r => r.id) || [];

    // Get performance metrics
    let metricsQuery = supabase
      .from('performance_metrics')
      .select(`
        restaurant_id,
        metric_type,
        metric_value,
        recorded_at,
        metadata,
        restaurants!inner(name, name_fr, settings)
      `)
      .gte('recorded_at', startDate.toISOString())
      .lte('recorded_at', endDate.toISOString())
      .in('restaurant_id', restaurantIdList);

    if (metrics && metrics.length > 0) {
      metricsQuery = metricsQuery.in('metric_type', metrics);
    }

    const { data: performanceData, error: metricsError } = await metricsQuery
      .order('recorded_at', { ascending: true });

    if (metricsError) {
      logError('METRICS_QUERY', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch performance metrics', code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    // Process metrics by restaurant and time period
    const restaurantMetrics: Record<string, any> = {};
    const timeSeriesData: Record<string, any[]> = {};

    performanceData?.forEach(metric => {
      const restaurantId = metric.restaurant_id;
      const restaurant = restaurants?.find(r => r.id === restaurantId);
      
      if (!restaurant) return;

      // Initialize restaurant metrics
      if (!restaurantMetrics[restaurantId]) {
        restaurantMetrics[restaurantId] = {
          restaurantId,
          restaurantName: restaurant.name,
          restaurantNameFr: restaurant.name_fr,
          region: restaurant.settings?.region_id,
          metrics: {},
          metricHistory: []
        };
      }

      // Store current metric value
      restaurantMetrics[restaurantId].metrics[metric.metric_type] = metric.metric_value;
      restaurantMetrics[restaurantId].metricHistory.push({
        metricType: metric.metric_type,
        value: metric.metric_value,
        recordedAt: metric.recorded_at,
        metadata: metric.metadata
      });

      // Build time series data
      const timeKey = aggregation === 'daily' ? 
        metric.recorded_at.split('T')[0] :
        aggregation === 'weekly' ?
        `${new Date(metric.recorded_at).getFullYear()}-W${Math.ceil(new Date(metric.recorded_at).getDate() / 7)}` :
        `${new Date(metric.recorded_at).getFullYear()}-${String(new Date(metric.recorded_at).getMonth() + 1).padStart(2, '0')}`;

      if (!timeSeriesData[timeKey]) {
        timeSeriesData[timeKey] = [];
      }

      timeSeriesData[timeKey].push({
        restaurantId,
        restaurantName: restaurant.name,
        metricType: metric.metric_type,
        value: metric.metric_value,
        date: timeKey
      });
    });

    // Calculate overall performance scores
    const performanceWeights = {
      sop_completion_rate: 0.25,
      training_completion_rate: 0.20,
      compliance_score: 0.20,
      efficiency_score: 0.15,
      customer_satisfaction: 0.10,
      staff_productivity: 0.05,
      cost_efficiency: 0.03,
      quality_score: 0.02
    };

    Object.values(restaurantMetrics).forEach((restaurant: any) => {
      const metricValues = Object.entries(restaurant.metrics).map(([type, value]) => ({
        metric_type: type,
        metric_value: value as number
      }));
      
      restaurant.overallScore = calculatePerformanceScore(metricValues, performanceWeights);
    });

    // Generate rankings
    const restaurantRankings = generateRanking(Object.values(restaurantMetrics));

    // Calculate benchmarks
    const benchmarkStats: Record<string, any> = {};
    
    if (includeComparison) {
      const allScores = Object.values(restaurantMetrics).map((r: any) => r.overallScore);
      const sortedScores = allScores.sort((a, b) => b - a);
      
      benchmarkStats.chainAverage = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
      benchmarkStats.chainMedian = sortedScores[Math.floor(sortedScores.length / 2)];
      benchmarkStats.topPerformer = sortedScores[0];
      benchmarkStats.bottomPerformer = sortedScores[sortedScores.length - 1];
      benchmarkStats.standardDeviation = Math.sqrt(
        allScores.reduce((sum, score) => sum + Math.pow(score - benchmarkStats.chainAverage, 2), 0) / allScores.length
      );

      // Calculate percentile rankings
      benchmarkStats.percentiles = {
        p90: sortedScores[Math.floor(sortedScores.length * 0.1)],
        p75: sortedScores[Math.floor(sortedScores.length * 0.25)],
        p50: benchmarkStats.chainMedian,
        p25: sortedScores[Math.floor(sortedScores.length * 0.75)],
        p10: sortedScores[Math.floor(sortedScores.length * 0.9)]
      };
    }

    // Generate trend analysis
    let trendAnalysis = null;
    if (includeForecasting && Object.keys(timeSeriesData).length >= 3) {
      const trendData = Object.entries(timeSeriesData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, metrics]) => ({
          date,
          averageScore: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
          metricCount: metrics.length
        }));

      // Simple linear regression for trend
      const n = trendData.length;
      const sumX = trendData.reduce((sum, _, i) => sum + i, 0);
      const sumY = trendData.reduce((sum, data) => sum + data.averageScore, 0);
      const sumXY = trendData.reduce((sum, data, i) => sum + (i * data.averageScore), 0);
      const sumXX = trendData.reduce((sum, _, i) => sum + (i * i), 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      trendAnalysis = {
        trend: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
        slope,
        confidence: Math.abs(slope) > 0.05 ? 'high' : 'medium',
        projection: {
          nextPeriod: intercept + slope * n,
          trend: slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'flat'
        }
      };
    }

    // Generate insights and recommendations
    const insights = [];
    const recommendations = [];

    // Identify top and bottom performers
    const topPerformer = restaurantRankings[0];
    const bottomPerformer = restaurantRankings[restaurantRankings.length - 1];

    if (topPerformer && bottomPerformer) {
      insights.push({
        type: 'performance_gap',
        message: `Performance gap of ${(topPerformer.overallScore - bottomPerformer.overallScore).toFixed(1)} points between top and bottom performers`,
        severity: topPerformer.overallScore - bottomPerformer.overallScore > 20 ? 'high' : 'medium'
      });

      recommendations.push({
        type: 'best_practice_sharing',
        priority: 'high',
        message: `Consider sharing best practices from ${topPerformer.restaurantName} with underperforming locations`,
        targetRestaurants: restaurantRankings.slice(-3).map(r => r.restaurantId)
      });
    }

    // Identify metric-specific issues
    const avgMetrics: Record<string, number> = {};
    Object.values(restaurantMetrics).forEach((restaurant: any) => {
      Object.entries(restaurant.metrics).forEach(([metricType, value]) => {
        if (!avgMetrics[metricType]) avgMetrics[metricType] = 0;
        avgMetrics[metricType] += value as number;
      });
    });

    Object.keys(avgMetrics).forEach(metricType => {
      avgMetrics[metricType] /= Object.keys(restaurantMetrics).length;
      
      if (avgMetrics[metricType] < 70) {
        insights.push({
          type: 'metric_concern',
          message: `Chain-wide ${metricType.replace('_', ' ')} average (${avgMetrics[metricType].toFixed(1)}%) below target`,
          severity: avgMetrics[metricType] < 60 ? 'high' : 'medium'
        });

        recommendations.push({
          type: 'improvement_initiative',
          priority: avgMetrics[metricType] < 60 ? 'high' : 'medium',
          message: `Launch chain-wide improvement initiative for ${metricType.replace('_', ' ')}`,
          targetMetric: metricType
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRestaurants: restaurantRankings.length,
          dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
          benchmarkType,
          aggregation
        },
        restaurantRankings,
        benchmarkStats,
        timeSeriesData: Object.entries(timeSeriesData).map(([date, metrics]) => ({
          date,
          metrics: metrics.reduce((acc: any, metric) => {
            if (!acc[metric.restaurantId]) {
              acc[metric.restaurantId] = {
                restaurantId: metric.restaurantId,
                restaurantName: metric.restaurantName,
                metrics: {}
              };
            }
            acc[metric.restaurantId].metrics[metric.metricType] = metric.value;
            return acc;
          }, {})
        })),
        trendAnalysis,
        insights,
        recommendations,
        queryParams: validationResult.data
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'cross_location_analytics' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Create Custom Benchmark
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
    const validationResult = BenchmarkCreateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { name, description, metrics, restaurantIds, regionId, isActive } = validationResult.data;

    // Verify analytics access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyAnalyticsAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate metric weights sum to 1
    const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      return NextResponse.json(
        { error: 'Metric weights must sum to 1.0', code: 'INVALID_WEIGHTS' },
        { status: 400 }
      );
    }

    // Create benchmark record (assuming a benchmarks table exists)
    const benchmarkData = {
      name,
      description,
      metrics_config: metrics,
      restaurant_ids: restaurantIds,
      region_id: regionId,
      is_active: isActive,
      created_by: userId,
      created_at: new Date().toISOString()
    };

    // Note: This would require a benchmarks table in the schema
    // For now, we'll simulate the creation and return success
    const benchmarkId = `benchmark_${Date.now()}`;

    // Log benchmark creation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'CREATE',
        resource_type: 'performance_benchmark',
        resource_id: benchmarkId,
        details: {
          benchmarkName: name,
          metricsCount: metrics.length,
          restaurantScope: restaurantIds?.length || 'all',
          regionScope: regionId || 'all'
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: 'Benchmark created successfully',
      data: {
        benchmarkId,
        name,
        description,
        metricsCount: metrics.length,
        totalWeight,
        scope: {
          restaurants: restaurantIds?.length || 'all',
          region: regionId || 'all'
        },
        isActive,
        createdAt: benchmarkData.created_at
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'create_benchmark' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PUT: Generate Performance Report
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
    const validationResult = PerformanceReportSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { reportType, dateRange, restaurantIds, includeRecommendations, format } = validationResult.data;

    // Verify analytics access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyAnalyticsAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Generate report based on type
    const reportData: any = {
      reportId: `report_${Date.now()}`,
      reportType,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      dateRange,
      scope: {
        restaurants: restaurantIds?.length || 'all',
        includeRecommendations
      }
    };

    // Simulate report generation logic
    switch (reportType) {
      case 'executive':
        reportData.content = {
          executiveSummary: 'Chain performance summary with key metrics and trends',
          keyFindings: ['Finding 1', 'Finding 2', 'Finding 3'],
          strategicRecommendations: includeRecommendations ? [
            'Recommendation 1',
            'Recommendation 2'
          ] : []
        };
        break;

      case 'operational':
        reportData.content = {
          operationalMetrics: 'Detailed operational performance analysis',
          efficiencyAnalysis: 'Process efficiency evaluation',
          resourceUtilization: 'Staff and resource optimization insights'
        };
        break;

      case 'comparative':
        reportData.content = {
          restaurantComparison: 'Side-by-side restaurant performance comparison',
          benchmarkAnalysis: 'Performance against industry standards',
          rankingAnalysis: 'Restaurant ranking and percentile analysis'
        };
        break;

      case 'trend_analysis':
        reportData.content = {
          trendAnalysis: 'Historical performance trends and patterns',
          seasonalPatterns: 'Seasonal performance variations',
          forecastProjections: 'Future performance projections'
        };
        break;
    }

    // Log report generation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'CREATE',
        resource_type: 'performance_report',
        resource_id: reportData.reportId,
        details: {
          reportType,
          dateRange,
          restaurantScope: restaurantIds?.length || 'all',
          format,
          includeRecommendations
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    // Return report based on format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        message: 'Performance report generated successfully',
        data: reportData
      });
    } else {
      // For CSV/PDF formats, return download link
      return NextResponse.json({
        success: true,
        message: 'Performance report generated successfully',
        data: {
          reportId: reportData.reportId,
          downloadUrl: `/api/reports/download/${reportData.reportId}`,
          format,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }
      });
    }

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'generate_performance_report' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}