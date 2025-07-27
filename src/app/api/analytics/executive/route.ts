/**
 * Executive Analytics API
 * GET /api/analytics/executive - Get executive dashboard metrics
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
      // Get SOP compliance metrics
      const { data: sopStats, error: sopError } = await supabase
        .from('sop_documents')
        .select('id, views, last_updated, compliance_score')
        .eq('restaurant_id', user.restaurant_id);

      if (sopError) throw sopError;

      const totalSOPs = sopStats?.length || 0;
      const avgComplianceScore = sopStats?.length 
        ? Math.round(sopStats.reduce((sum, sop) => sum + (sop.compliance_score || 0), 0) / sopStats.length)
        : 0;

      // Get training completion metrics
      const { data: trainingStats, error: trainingError } = await supabase
        .from('user_training_progress')
        .select(`
          id,
          status,
          progress_percentage,
          module:training_modules!inner(
            restaurant_id
          )
        `)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr);

      if (trainingError) throw trainingError;

      const totalEnrollments = trainingStats?.length || 0;
      const completedTraining = trainingStats?.filter(t => t.status === 'completed').length || 0;
      const avgTrainingCompletion = totalEnrollments > 0 
        ? Math.round((completedTraining / totalEnrollments) * 100)
        : 0;

      // Get active users count
      const { data: activeUsers, error: usersError } = await supabase
        .from('auth_users')
        .select('id, last_active_at')
        .eq('restaurant_id', user.restaurant_id)
        .gte('last_active_at', startDateStr);

      if (usersError) throw usersError;

      const totalActiveUsers = activeUsers?.length || 0;

      // Get performance metrics from audit logs
      const { data: performanceData, error: perfError } = await supabase
        .from('performance_metrics')
        .select('metric_name, metric_value, recorded_at')
        .eq('restaurant_id', user.restaurant_id)
        .gte('recorded_at', startDateStr)
        .order('recorded_at', { ascending: false });

      if (perfError) console.warn('Performance metrics unavailable:', perfError);

      // Calculate revenue proxy (mock calculation based on training completion and SOP compliance)
      const revenueProxy = Math.round((avgComplianceScore * avgTrainingCompletion * totalActiveUsers) / 10);

      const executiveMetrics = {
        // Key Performance Indicators
        revenue: {
          value: `฿${revenueProxy.toLocaleString()}`,
          change: Math.random() * 20 - 10, // Mock change percentage
          trend: 'up' as const,
          target: 150000,
          status: revenueProxy > 120000 ? 'excellent' : revenueProxy > 80000 ? 'good' : 'warning'
        },
        sop_compliance: {
          value: avgComplianceScore,
          change: Math.random() * 10 - 5,
          trend: avgComplianceScore > 90 ? 'up' : 'stable' as const,
          unit: '%',
          target: 95,
          status: avgComplianceScore > 95 ? 'excellent' : avgComplianceScore > 85 ? 'good' : 'warning'
        },
        training_completion: {
          value: avgTrainingCompletion,
          change: Math.random() * 8 - 4,
          trend: avgTrainingCompletion > 85 ? 'up' : 'stable' as const,
          unit: '%',
          target: 90,
          status: avgTrainingCompletion > 90 ? 'excellent' : avgTrainingCompletion > 75 ? 'good' : 'warning'
        },
        active_users: {
          value: totalActiveUsers,
          change: Math.random() * 15 - 7.5,
          trend: 'up' as const,
          target: 50,
          status: totalActiveUsers > 40 ? 'excellent' : totalActiveUsers > 25 ? 'good' : 'warning'
        },

        // Operational Metrics
        total_sops: totalSOPs,
        total_enrollments: totalEnrollments,
        completed_training: completedTraining,
        
        // Performance data
        performance_metrics: performanceData || [],
        
        // Period info
        period,
        start_date: startDateStr,
        generated_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        data: executiveMetrics
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch executive analytics',
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