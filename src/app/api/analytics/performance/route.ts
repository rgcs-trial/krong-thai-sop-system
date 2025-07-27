/**
 * Performance Analytics API
 * POST /api/analytics/performance - Receive performance monitoring data
 * GET /api/analytics/performance - Get performance analytics
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
    const { metrics, events, timestamp } = body;

    // Validate request body
    if (!metrics || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: metrics, timestamp' },
        { status: 400 }
      );
    }

    try {
      // Store performance metrics in database
      const performanceRecords = [];

      // Process Web Vitals metrics
      if (metrics.lcp) {
        performanceRecords.push({
          metric_name: 'largest_contentful_paint',
          metric_value: metrics.lcp,
          metric_unit: 'ms',
          device_type: metrics.deviceType || 'unknown',
          connection_type: metrics.connectionType || 'unknown',
          url: metrics.url || '',
          user_agent: metrics.userAgent || '',
          recorded_at: new Date(timestamp).toISOString()
        });
      }

      if (metrics.fid) {
        performanceRecords.push({
          metric_name: 'first_input_delay',
          metric_value: metrics.fid,
          metric_unit: 'ms',
          device_type: metrics.deviceType || 'unknown',
          connection_type: metrics.connectionType || 'unknown',
          url: metrics.url || '',
          user_agent: metrics.userAgent || '',
          recorded_at: new Date(timestamp).toISOString()
        });
      }

      if (metrics.cls) {
        performanceRecords.push({
          metric_name: 'cumulative_layout_shift',
          metric_value: metrics.cls,
          metric_unit: 'score',
          device_type: metrics.deviceType || 'unknown',
          connection_type: metrics.connectionType || 'unknown',
          url: metrics.url || '',
          user_agent: metrics.userAgent || '',
          recorded_at: new Date(timestamp).toISOString()
        });
      }

      if (metrics.fcp) {
        performanceRecords.push({
          metric_name: 'first_contentful_paint',
          metric_value: metrics.fcp,
          metric_unit: 'ms',
          device_type: metrics.deviceType || 'unknown',
          connection_type: metrics.connectionType || 'unknown',
          url: metrics.url || '',
          user_agent: metrics.userAgent || '',
          recorded_at: new Date(timestamp).toISOString()
        });
      }

      if (metrics.ttfb) {
        performanceRecords.push({
          metric_name: 'time_to_first_byte',
          metric_value: metrics.ttfb,
          metric_unit: 'ms',
          device_type: metrics.deviceType || 'unknown',
          connection_type: metrics.connectionType || 'unknown',
          url: metrics.url || '',
          user_agent: metrics.userAgent || '',
          recorded_at: new Date(timestamp).toISOString()
        });
      }

      // Process custom metrics
      if (metrics.sopLoadTime) {
        performanceRecords.push({
          metric_name: 'sop_load_time',
          metric_value: metrics.sopLoadTime,
          metric_unit: 'ms',
          device_type: metrics.deviceType || 'unknown',
          connection_type: metrics.connectionType || 'unknown',
          url: metrics.url || '',
          user_agent: metrics.userAgent || '',
          recorded_at: new Date(timestamp).toISOString()
        });
      }

      if (metrics.searchLatency) {
        performanceRecords.push({
          metric_name: 'search_latency',
          metric_value: metrics.searchLatency,
          metric_unit: 'ms',
          device_type: metrics.deviceType || 'unknown',
          connection_type: metrics.connectionType || 'unknown',
          url: metrics.url || '',
          user_agent: metrics.userAgent || '',
          recorded_at: new Date(timestamp).toISOString()
        });
      }

      // Memory metrics
      if (metrics.memoryInfo) {
        performanceRecords.push({
          metric_name: 'memory_usage',
          metric_value: (metrics.memoryInfo.used / metrics.memoryInfo.jsHeapSizeLimit) * 100,
          metric_unit: 'percentage',
          device_type: metrics.deviceType || 'unknown',
          connection_type: metrics.connectionType || 'unknown',
          url: metrics.url || '',
          user_agent: metrics.userAgent || '',
          recorded_at: new Date(timestamp).toISOString(),
          metadata: {
            used: metrics.memoryInfo.used,
            total: metrics.memoryInfo.total,
            limit: metrics.memoryInfo.jsHeapSizeLimit
          }
        });
      }

      // Insert performance records
      if (performanceRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('performance_metrics')
          .insert(performanceRecords);

        if (insertError) {
          console.error('Failed to insert performance metrics:', insertError);
          // Don't fail the request, just log the error
        }
      }

      // Process and store events if provided
      if (events && Array.isArray(events)) {
        const eventRecords = events.map(event => ({
          event_name: event.name,
          event_data: event.data,
          device_type: event.deviceType || metrics.deviceType || 'unknown',
          url: event.url || metrics.url || '',
          recorded_at: new Date(event.timestamp || timestamp).toISOString()
        }));

        if (eventRecords.length > 0) {
          const { error: eventError } = await supabase
            .from('performance_events')
            .insert(eventRecords);

          if (eventError) {
            console.error('Failed to insert performance events:', eventError);
            // Don't fail the request, just log the error
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Performance data recorded successfully',
        recordsInserted: performanceRecords.length
      });

    } catch (dbError) {
      console.error('Database error in performance analytics:', dbError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to store performance data',
          details: dbError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Performance analytics POST error:', error);
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

    // Only managers and admins can view performance analytics
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get date range parameters
    const period = searchParams.get('period') || '30d';
    const metricType = searchParams.get('metric') || 'all';
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
      // Get performance metrics
      let metricsQuery = supabase
        .from('performance_metrics')
        .select('*')
        .gte('recorded_at', startDateStr)
        .order('recorded_at', { ascending: false });

      if (metricType !== 'all') {
        metricsQuery = metricsQuery.eq('metric_name', metricType);
      }

      const { data: performanceMetrics, error: metricsError } = await metricsQuery;

      if (metricsError) throw metricsError;

      // Get performance events
      const { data: performanceEvents, error: eventsError } = await supabase
        .from('performance_events')
        .select('*')
        .gte('recorded_at', startDateStr)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (eventsError) console.warn('Performance events unavailable:', eventsError);

      // Process metrics for analytics
      const metricsByType = (performanceMetrics || []).reduce((acc, metric) => {
        if (!acc[metric.metric_name]) {
          acc[metric.metric_name] = [];
        }
        acc[metric.metric_name].push(metric);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate summary statistics
      const summaryStats = Object.entries(metricsByType).map(([metricName, records]) => {
        const values = records.map(r => r.metric_value);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const p50 = values.sort((a, b) => a - b)[Math.floor(values.length * 0.5)];
        const p95 = values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)];

        // Determine status based on thresholds
        let status = 'good';
        if (metricName.includes('paint') || metricName.includes('load') || metricName.includes('latency')) {
          if (p95 > 3000) status = 'poor';
          else if (p95 > 1500) status = 'warning';
        } else if (metricName === 'cumulative_layout_shift') {
          if (p95 > 0.25) status = 'poor';
          else if (p95 > 0.1) status = 'warning';
        } else if (metricName === 'memory_usage') {
          if (p95 > 80) status = 'poor';
          else if (p95 > 60) status = 'warning';
        }

        return {
          metric: metricName,
          average: Math.round(avg * 100) / 100,
          min,
          max,
          p50,
          p95,
          count: records.length,
          status,
          unit: records[0]?.metric_unit || 'ms'
        };
      });

      // Device and connection breakdown
      const deviceBreakdown = (performanceMetrics || []).reduce((acc, metric) => {
        const device = metric.device_type || 'unknown';
        if (!acc[device]) {
          acc[device] = { count: 0, avgValue: 0, totalValue: 0 };
        }
        acc[device].count++;
        acc[device].totalValue += metric.metric_value;
        acc[device].avgValue = acc[device].totalValue / acc[device].count;
        return acc;
      }, {} as Record<string, any>);

      const connectionBreakdown = (performanceMetrics || []).reduce((acc, metric) => {
        const connection = metric.connection_type || 'unknown';
        if (!acc[connection]) {
          acc[connection] = { count: 0, avgValue: 0, totalValue: 0 };
        }
        acc[connection].count++;
        acc[connection].totalValue += metric.metric_value;
        acc[connection].avgValue = acc[connection].totalValue / acc[connection].count;
        return acc;
      }, {} as Record<string, any>);

      // Timeline data for charts
      const timelineData = [];
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * dayInMs);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const dayMetrics = (performanceMetrics || []).filter(metric => {
          const metricDate = new Date(metric.recorded_at);
          return metricDate >= dayStart && metricDate <= dayEnd;
        });

        const dayData = {
          date: dayStart.toISOString().split('T')[0],
          metrics: Object.keys(metricsByType).reduce((acc, metricName) => {
            const dayTypeMetrics = dayMetrics.filter(m => m.metric_name === metricName);
            if (dayTypeMetrics.length > 0) {
              const avg = dayTypeMetrics.reduce((sum, m) => sum + m.metric_value, 0) / dayTypeMetrics.length;
              acc[metricName] = Math.round(avg * 100) / 100;
            }
            return acc;
          }, {} as Record<string, number>)
        };

        timelineData.push(dayData);
      }

      // Critical issues and alerts
      const criticalIssues = summaryStats.filter(stat => stat.status === 'poor');
      const warnings = summaryStats.filter(stat => stat.status === 'warning');

      const performanceAnalytics = {
        // Summary
        summary: {
          totalMetrics: (performanceMetrics || []).length,
          criticalIssues: criticalIssues.length,
          warnings: warnings.length,
          avgOverallPerformance: summaryStats.length > 0
            ? Math.round(summaryStats.reduce((sum, stat) => {
                let score = 100;
                if (stat.status === 'warning') score = 70;
                else if (stat.status === 'poor') score = 30;
                return sum + score;
              }, 0) / summaryStats.length)
            : 100,
          period,
          startDate: startDateStr,
          generatedAt: new Date().toISOString()
        },

        // Metrics breakdown
        metrics: summaryStats,

        // Device and connection analysis
        breakdown: {
          devices: deviceBreakdown,
          connections: connectionBreakdown
        },

        // Timeline data for charts
        timeline: timelineData,

        // Recent events
        recentEvents: (performanceEvents || []).slice(0, 20).map(event => ({
          id: event.id,
          name: event.event_name,
          data: event.event_data,
          deviceType: event.device_type,
          url: event.url,
          timestamp: event.recorded_at
        })),

        // Performance insights
        insights: {
          topIssues: criticalIssues.concat(warnings).slice(0, 5),
          performanceScore: Math.round(
            summaryStats.reduce((sum, stat) => {
              let score = 100;
              if (stat.status === 'warning') score = 70;
              else if (stat.status === 'poor') score = 30;
              return sum + score;
            }, 0) / Math.max(summaryStats.length, 1)
          ),
          recommendations: [
            ...(criticalIssues.length > 0 ? ['Address critical performance issues immediately'] : []),
            ...(warnings.length > 0 ? ['Monitor warning-level metrics closely'] : []),
            'Implement performance budgets for key metrics',
            'Consider tablet-specific optimizations'
          ]
        }
      };

      return NextResponse.json({
        success: true,
        data: performanceAnalytics
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch performance analytics',
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Performance analytics GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}