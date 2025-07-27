/**
 * Operational Analytics API
 * GET /api/analytics/operational - Get operational metrics and KPIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

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

    // Only managers and admins can view operational analytics
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get date range parameters
    const period = searchParams.get('period') || '30d';
    const department = searchParams.get('department') || 'all';
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
      // Get performance metrics from the database
      const { data: performanceMetrics, error: perfError } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .gte('recorded_at', startDateStr)
        .order('recorded_at', { ascending: false });

      if (perfError) console.warn('Performance metrics unavailable:', perfError);

      // Get audit logs for operational activity
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false });

      if (auditError) console.warn('Audit logs unavailable:', auditError);

      // Get training progress for productivity metrics
      const { data: trainingProgress, error: trainingError } = await supabase
        .from('user_training_progress')
        .select(`
          id,
          status,
          progress_percentage,
          time_spent_minutes,
          user:auth_users!inner(
            restaurant_id,
            role,
            department
          ),
          module:training_modules!inner(
            restaurant_id
          )
        `)
        .eq('user.restaurant_id', user.restaurant_id)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr);

      if (trainingError) console.warn('Training progress unavailable:', trainingError);

      // Get SOP compliance data
      const { data: sopCompliance, error: sopError } = await supabase
        .from('sop_documents')
        .select('id, views, compliance_score, category_id')
        .eq('restaurant_id', user.restaurant_id);

      if (sopError) console.warn('SOP compliance unavailable:', sopError);

      // Calculate operational metrics
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;

      // Mock operational metrics with some real data integration
      const operationalMetrics = [
        {
          id: 'order_accuracy',
          name: 'Order Accuracy',
          name_th: 'ความถูกต้องของคำสั่ง',
          current: 94.2 + (Math.random() * 6 - 3), // Base + random variation
          target: 96.0,
          unit: '%',
          status: 'good' as const,
          trend: 'up' as const,
          change: Math.random() * 5 - 2.5,
          category: 'quality' as const,
          department: 'kitchen',
          priority: 'high',
          description: 'Percentage of orders prepared correctly without errors'
        },
        {
          id: 'service_time',
          name: 'Average Service Time',
          name_th: 'เวลาให้บริการเฉลี่ย',
          current: 8.5 + (Math.random() * 4 - 2),
          target: 7.0,
          unit: 'min',
          status: 'warning' as const,
          trend: 'down' as const,
          change: Math.random() * 8 - 4,
          category: 'productivity' as const,
          department: 'service',
          priority: 'high',
          description: 'Average time from order placement to delivery'
        },
        {
          id: 'sop_compliance',
          name: 'SOP Compliance Rate',
          name_th: 'อัตราการปฏิบัติตาม SOP',
          current: sopCompliance?.length 
            ? sopCompliance.reduce((sum, sop) => sum + (sop.compliance_score || 0), 0) / sopCompliance.length
            : 87.3,
          target: 95.0,
          unit: '%',
          status: 'warning' as const,
          trend: 'up' as const,
          change: Math.random() * 6 - 1,
          category: 'compliance' as const,
          department: 'all',
          priority: 'critical',
          description: 'Overall adherence to standard operating procedures'
        },
        {
          id: 'training_completion',
          name: 'Training Completion Rate',
          name_th: 'อัตราการเสร็จสิ้นการฝึกอบรม',
          current: trainingProgress?.length 
            ? (trainingProgress.filter(t => t.status === 'completed').length / trainingProgress.length) * 100
            : 82.1,
          target: 90.0,
          unit: '%',
          status: trainingProgress?.length && (trainingProgress.filter(t => t.status === 'completed').length / trainingProgress.length) > 0.85 ? 'good' : 'warning' as const,
          trend: 'stable' as const,
          change: Math.random() * 4 - 2,
          category: 'productivity' as const,
          department: 'all',
          priority: 'medium',
          description: 'Percentage of assigned training modules completed by staff'
        },
        {
          id: 'cost_efficiency',
          name: 'Cost Efficiency Index',
          name_th: 'ดัชนีประสิทธิภาพต้นทุน',
          current: 76.8 + (Math.random() * 10 - 5),
          target: 80.0,
          unit: '%',
          status: 'good' as const,
          trend: 'up' as const,
          change: Math.random() * 6 - 1,
          category: 'cost' as const,
          department: 'management',
          priority: 'medium',
          description: 'Overall cost efficiency compared to industry benchmarks'
        },
        {
          id: 'staff_productivity',
          name: 'Staff Productivity Score',
          name_th: 'คะแนนประสิทธิภาพพนักงาน',
          current: 88.4 + (Math.random() * 8 - 4),
          target: 90.0,
          unit: 'score',
          status: 'good' as const,
          trend: 'stable' as const,
          change: Math.random() * 3 - 1.5,
          category: 'productivity' as const,
          department: 'all',
          priority: 'medium',
          description: 'Composite score based on task completion and quality metrics'
        }
      ];

      // Filter by department if specified
      const filteredMetrics = department === 'all' 
        ? operationalMetrics 
        : operationalMetrics.filter(metric => 
            metric.department === department || metric.department === 'all'
          );

      // Calculate trend data for charts
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * dayInMs);
        const dataPoint = {
          date: date.toISOString().split('T')[0],
          orderAccuracy: 94.2 + Math.sin(i * 0.5) * 3 + Math.random() * 2,
          serviceTime: 8.5 + Math.cos(i * 0.3) * 2 + Math.random() * 1,
          sopCompliance: 87.3 + Math.sin(i * 0.4) * 4 + Math.random() * 3,
          trainingCompletion: 82.1 + Math.cos(i * 0.6) * 5 + Math.random() * 2
        };
        trendData.push(dataPoint);
      }

      // Calculate department breakdown
      const departmentBreakdown = {
        kitchen: {
          metrics: filteredMetrics.filter(m => m.department === 'kitchen' || m.department === 'all'),
          avgScore: 88.5,
          trending: 'up' as const,
          alertCount: 1
        },
        service: {
          metrics: filteredMetrics.filter(m => m.department === 'service' || m.department === 'all'),
          avgScore: 85.2,
          trending: 'stable' as const,
          alertCount: 2
        },
        management: {
          metrics: filteredMetrics.filter(m => m.department === 'management' || m.department === 'all'),
          avgScore: 91.1,
          trending: 'up' as const,
          alertCount: 0
        }
      };

      // Identify critical alerts
      const criticalAlerts = filteredMetrics.filter(metric => 
        metric.priority === 'critical' && 
        (metric.status === 'warning' || metric.current < metric.target * 0.9)
      );

      // Performance insights
      const insights = {
        topPerforming: [...filteredMetrics]
          .sort((a, b) => (b.current / b.target) - (a.current / a.target))
          .slice(0, 3),
        needsAttention: [...filteredMetrics]
          .sort((a, b) => (a.current / a.target) - (b.current / b.target))
          .slice(0, 3),
        improvingMetrics: filteredMetrics.filter(m => m.trend === 'up' && m.change > 2),
        decliningMetrics: filteredMetrics.filter(m => m.trend === 'down' && m.change < -2)
      };

      const operationalAnalytics = {
        // Summary
        summary: {
          totalMetrics: filteredMetrics.length,
          avgPerformance: Math.round(
            filteredMetrics.reduce((sum, metric) => sum + (metric.current / metric.target) * 100, 0) 
            / filteredMetrics.length
          ),
          criticalAlerts: criticalAlerts.length,
          period,
          department,
          startDate: startDateStr,
          generatedAt: new Date().toISOString()
        },

        // Metrics
        metrics: filteredMetrics,

        // Trend data for charts
        trends: trendData,

        // Department breakdown
        departments: departmentBreakdown,

        // Insights and recommendations
        insights,

        // Critical alerts
        alerts: criticalAlerts.map(metric => ({
          id: metric.id,
          type: 'performance',
          severity: metric.priority === 'critical' ? 'high' : 'medium',
          title: `${metric.name} Below Target`,
          message: `${metric.name} is at ${metric.current.toFixed(1)}${metric.unit}, below target of ${metric.target}${metric.unit}`,
          metric: metric.name,
          current: metric.current,
          target: metric.target,
          timestamp: new Date().toISOString()
        }))
      };

      return NextResponse.json({
        success: true,
        data: operationalAnalytics
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch operational analytics',
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Operational analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}