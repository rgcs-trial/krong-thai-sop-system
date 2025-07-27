/**
 * Training Analytics Dashboard API
 * GET /api/training/analytics/dashboard - Get training dashboard statistics
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

    // Only managers and admins can view analytics dashboard
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
      // Get total modules
      const { data: moduleStats, error: moduleError } = await supabase
        .from('training_modules')
        .select('id, is_active')
        .eq('restaurant_id', user.restaurant_id);

      if (moduleError) throw moduleError;

      const totalModules = moduleStats?.length || 0;
      const activeModules = moduleStats?.filter(m => m.is_active).length || 0;

      // Get user enrollment and completion stats
      const { data: progressStats, error: progressError } = await supabase
        .from('user_training_progress')
        .select(`
          id,
          user_id,
          module_id,
          status,
          progress_percentage,
          completed_at,
          time_spent_minutes,
          module:training_modules!inner(
            restaurant_id
          )
        `)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr);

      if (progressError) throw progressError;

      const totalEnrollments = progressStats?.length || 0;
      const completedProgress = progressStats?.filter(p => p.status === 'completed') || [];
      const userCompleted = new Set(completedProgress.map(p => p.user_id)).size;

      // Calculate completion rate
      const totalUniqueUsers = new Set(progressStats?.map(p => p.user_id) || []).size;
      const averageCompletionRate = totalUniqueUsers > 0 
        ? Math.round((userCompleted / totalUniqueUsers) * 100) 
        : 0;

      // Get assessment stats
      const { data: assessmentStats, error: assessmentError } = await supabase
        .from('training_assessments')
        .select(`
          id,
          status,
          score_percentage,
          module:training_modules!inner(
            restaurant_id
          )
        `)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('completed_at', startDateStr);

      if (assessmentError) throw assessmentError;

      const passedAssessments = assessmentStats?.filter(a => a.status === 'passed') || [];
      const averageScore = passedAssessments.length > 0
        ? Math.round(passedAssessments.reduce((sum, a) => sum + a.score_percentage, 0) / passedAssessments.length)
        : 0;

      // Get certificate stats
      const { data: certificateStats, error: certificateError } = await supabase
        .from('training_certificates')
        .select(`
          id,
          status,
          expires_at,
          module:training_modules!inner(
            restaurant_id
          )
        `)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('issued_at', startDateStr);

      if (certificateError) throw certificateError;

      const certificatesEarned = certificateStats?.filter(c => c.status === 'active').length || 0;
      
      // Calculate expiring certificates (within next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const certificatesExpiring = certificateStats?.filter(c => 
        c.status === 'active' && 
        new Date(c.expires_at) <= thirtyDaysFromNow
      ).length || 0;

      // Get recent activity trends
      const { data: recentActivity, error: activityError } = await supabase
        .from('user_training_progress')
        .select(`
          created_at,
          updated_at,
          status,
          module:training_modules!inner(
            restaurant_id,
            title,
            title_th
          )
        `)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('updated_at', startDateStr)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (activityError) throw activityError;

      // Get top performing modules
      const { data: modulePerformance, error: performanceError } = await supabase
        .from('training_modules')
        .select(`
          id,
          title,
          title_th,
          progress:user_training_progress(
            id,
            status,
            progress_percentage
          )
        `)
        .eq('restaurant_id', user.restaurant_id)
        .eq('is_active', true);

      if (performanceError) throw performanceError;

      const topModules = modulePerformance?.map(module => {
        const progressArray = module.progress || [];
        const completedCount = progressArray.filter((p: any) => p.status === 'completed').length;
        const totalCount = progressArray.length;
        const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return {
          id: module.id,
          title: module.title,
          title_th: module.title_th,
          enrollments: totalCount,
          completions: completedCount,
          completion_rate: completionRate
        };
      }).sort((a, b) => b.completion_rate - a.completion_rate).slice(0, 5) || [];

      const dashboardStats = {
        // Overview metrics
        total_modules: totalModules,
        active_modules: activeModules,
        total_enrollments: totalEnrollments,
        user_completed: userCompleted,
        average_completion_rate: averageCompletionRate,
        average_score: averageScore,
        certificates_earned: certificatesEarned,
        certificates_expiring: certificatesExpiring,
        
        // Trends and insights
        recent_activity: recentActivity || [],
        top_modules: topModules,
        
        // Period info
        period,
        start_date: startDateStr,
        generated_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        data: dashboardStats
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch analytics data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training analytics dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}