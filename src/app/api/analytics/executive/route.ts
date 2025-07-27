/**
 * Executive Analytics API
 * GET /api/analytics/executive - Get executive dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { searchParams } = new URL(request.url);
    
    // Get user session and validate permissions
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and admins can view executive analytics
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get date range parameters
    const period = searchParams.get('period') || '30d';
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
      // Log performance metric
      await supabase.rpc('log_query_performance', {
        p_query_type: 'executive_analytics',
        p_execution_time_ms: 0, // Will be updated after query
        p_restaurant_id: user.restaurant_id,
        p_user_id: user.id
      }).catch(() => {}); // Ignore if function doesn't exist

      const queryStartTime = Date.now();

      // Get SOP compliance metrics
      const { data: sopStats, error: sopError } = await supabase
        .from('sop_documents')
        .select(`
          id,
          status,
          priority,
          created_at,
          sop_categories!inner(name)
        `)
        .eq('restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr);

      if (sopError) throw sopError;

      const totalSops = sopStats?.length || 0;
      const approvedSops = sopStats?.filter(s => s.status === 'approved').length || 0;
      const criticalSops = sopStats?.filter(s => s.priority === 'critical').length || 0;
      const sopComplianceRate = totalSops > 0 ? Math.round((approvedSops / totalSops) * 100) : 0;

      // Get training metrics
      const { data: trainingStats, error: trainingError } = await supabase
        .from('user_training_progress')
        .select(`
          id,
          status,
          progress_percentage,
          completed_at,
          module:training_modules!inner(
            restaurant_id,
            title
          )
        `)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr);

      if (trainingError) throw trainingError;

      const totalTrainingEnrollments = trainingStats?.length || 0;
      const completedTraining = trainingStats?.filter(t => t.status === 'completed').length || 0;
      const trainingCompletionRate = totalTrainingEnrollments > 0 
        ? Math.round((completedTraining / totalTrainingEnrollments) * 100) 
        : 0;

      // Get active users
      const { data: userStats, error: userError } = await supabase
        .from('auth_users')
        .select('id, last_login_at, is_active')
        .eq('restaurant_id', user.restaurant_id)
        .eq('is_active', true);

      if (userError) throw userError;

      const totalUsers = userStats?.length || 0;
      const recentActiveUsers = userStats?.filter(u => 
        u.last_login_at && 
        new Date(u.last_login_at) >= startDate
      ).length || 0;

      // Get system alerts
      const { data: alertStats, error: alertError } = await supabase
        .from('system_alerts')
        .select('id, severity, is_resolved')
        .eq('restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr)
        .catch(() => ({ data: [], error: null })); // Table may not exist

      const totalAlerts = alertStats?.length || 0;
      const criticalAlerts = alertStats?.filter(a => a.severity === 'critical' && !a.is_resolved).length || 0;

      // Get audit activity
      const { data: auditStats, error: auditStatsError } = await supabase
        .from('audit_logs')
        .select('id, action, created_at')
        .eq('restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditStatsError) throw auditStatsError;

      const totalActivity = auditStats?.length || 0;

      // Calculate trends (mock data for now - would need historical comparison)
      const mockTrends = {
        sopCompliance: 2.1,
        trainingCompletion: -1.3,
        activeUsers: 5.2,
        systemHealth: 0.8
      };

      // Build metrics response
      const executiveMetrics = {
        kpi_metrics: [
          {
            id: 'sop_compliance',
            title: 'SOP Compliance Rate',
            value: sopComplianceRate,
            change: mockTrends.sopCompliance,
            trend: mockTrends.sopCompliance > 0 ? 'up' : 'down',
            format: 'percentage',
            target: 95,
            status: sopComplianceRate >= 95 ? 'excellent' : sopComplianceRate >= 85 ? 'good' : 'warning'
          },
          {
            id: 'training_completion',
            title: 'Training Completion Rate',
            value: trainingCompletionRate,
            change: mockTrends.trainingCompletion,
            trend: mockTrends.trainingCompletion > 0 ? 'up' : 'down',
            format: 'percentage',
            target: 90,
            status: trainingCompletionRate >= 90 ? 'excellent' : trainingCompletionRate >= 75 ? 'good' : 'warning'
          },
          {
            id: 'active_users',
            title: 'Active Users',
            value: recentActiveUsers,
            change: mockTrends.activeUsers,
            trend: mockTrends.activeUsers > 0 ? 'up' : 'down',
            format: 'number',
            target: totalUsers,
            status: recentActiveUsers >= totalUsers * 0.8 ? 'excellent' : recentActiveUsers >= totalUsers * 0.6 ? 'good' : 'warning'
          },
          {
            id: 'total_sops',
            title: 'Total SOPs',
            value: totalSops,
            change: 0,
            trend: 'stable',
            format: 'number',
            status: 'good'
          },
          {
            id: 'critical_alerts',
            title: 'Critical Alerts',
            value: criticalAlerts,
            change: 0,
            trend: 'stable',
            format: 'number',
            status: criticalAlerts === 0 ? 'excellent' : criticalAlerts <= 2 ? 'warning' : 'critical'
          }
        ],
        
        summary_stats: {
          total_sops: totalSops,
          approved_sops: approvedSops,
          critical_sops: criticalSops,
          sop_compliance_rate: sopComplianceRate,
          
          total_training_enrollments: totalTrainingEnrollments,
          completed_training: completedTraining,
          training_completion_rate: trainingCompletionRate,
          
          total_users: totalUsers,
          recent_active_users: recentActiveUsers,
          
          total_alerts: totalAlerts,
          critical_alerts: criticalAlerts,
          
          total_activity: totalActivity
        },
        
        recent_activity: auditStats?.slice(0, 10) || [],
        
        period,
        start_date: startDateStr,
        generated_at: new Date().toISOString()
      };

      const queryTime = Date.now() - queryStartTime;

      // Log actual query performance
      await supabase.rpc('log_query_performance', {
        p_query_type: 'executive_analytics',
        p_execution_time_ms: queryTime,
        p_restaurant_id: user.restaurant_id,
        p_user_id: user.id
      }).catch(() => {}); // Ignore if function doesn't exist

      return NextResponse.json({
        success: true,
        data: executiveMetrics,
        performance: {
          query_time_ms: queryTime,
          cached: false
        }
      });

    } catch (dbError) {
      console.error('Database query error in executive analytics:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch executive analytics data',
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Executive analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}