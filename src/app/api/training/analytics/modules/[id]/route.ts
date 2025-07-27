/**
 * Training Module Analytics API
 * GET /api/training/analytics/modules/[id] - Get analytics for specific training module
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only managers and admins can view detailed module analytics
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const moduleId = params.id;
    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
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
      // Get module details
      const { data: module, error: moduleError } = await supabase
        .from('training_modules')
        .select(`
          id,
          title,
          title_th,
          description,
          description_th,
          estimated_duration,
          difficulty_level,
          is_active,
          created_at,
          updated_at,
          category,
          prerequisites,
          learning_objectives,
          learning_objectives_th
        `)
        .eq('id', moduleId)
        .eq('restaurant_id', user.restaurant_id)
        .single();

      if (moduleError || !module) {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }

      // Get progress data for this module
      const { data: progressData, error: progressError } = await supabase
        .from('user_training_progress')
        .select(`
          id,
          user_id,
          status,
          progress_percentage,
          time_spent_minutes,
          current_section_id,
          started_at,
          completed_at,
          last_accessed_at,
          user:auth_users!inner(
            id,
            email,
            role,
            department,
            restaurant_id
          )
        `)
        .eq('module_id', moduleId)
        .eq('user.restaurant_id', user.restaurant_id)
        .gte('started_at', startDateStr);

      if (progressError) throw progressError;

      // Get section progress data
      const { data: sectionProgress, error: sectionError } = await supabase
        .from('user_section_progress')
        .select(`
          id,
          section_id,
          progress_id,
          time_spent_minutes,
          is_completed,
          completed_at,
          notes,
          progress:user_training_progress!inner(
            module_id,
            user_id
          )
        `)
        .eq('progress.module_id', moduleId)
        .gte('completed_at', startDateStr);

      if (sectionError) console.warn('Section progress unavailable:', sectionError);

      // Get assessment data for this module
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('training_assessments')
        .select(`
          id,
          user_id,
          status,
          score_percentage,
          passed_at,
          failed_at,
          attempts,
          time_spent_minutes,
          started_at,
          completed_at
        `)
        .eq('module_id', moduleId)
        .gte('started_at', startDateStr);

      if (assessmentError) console.warn('Assessment data unavailable:', assessmentError);

      // Get certificate data
      const { data: certificateData, error: certificateError } = await supabase
        .from('training_certificates')
        .select(`
          id,
          user_id,
          status,
          issued_at,
          expires_at,
          certificate_number
        `)
        .eq('module_id', moduleId)
        .gte('issued_at', startDateStr);

      if (certificateError) console.warn('Certificate data unavailable:', certificateError);

      // Process analytics data
      const totalEnrollments = progressData?.length || 0;
      const completedProgress = progressData?.filter(p => p.status === 'completed') || [];
      const inProgressUsers = progressData?.filter(p => p.status === 'in_progress') || [];
      const notStartedUsers = progressData?.filter(p => p.status === 'not_started') || [];

      const completionRate = totalEnrollments > 0 
        ? Math.round((completedProgress.length / totalEnrollments) * 100)
        : 0;

      // Average time spent
      const avgTimeSpent = totalEnrollments > 0
        ? Math.round(progressData.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) / totalEnrollments)
        : 0;

      // Assessment analytics
      const totalAssessments = assessmentData?.length || 0;
      const passedAssessments = assessmentData?.filter(a => a.status === 'passed') || [];
      const avgAssessmentScore = passedAssessments.length > 0
        ? Math.round(passedAssessments.reduce((sum, a) => sum + a.score_percentage, 0) / passedAssessments.length)
        : 0;

      const assessmentPassRate = totalAssessments > 0
        ? Math.round((passedAssessments.length / totalAssessments) * 100)
        : 0;

      // Certificate analytics
      const activeCertificates = certificateData?.filter(c => c.status === 'active').length || 0;

      // User performance breakdown
      const userPerformance = (progressData || []).map(progress => {
        const userAssessments = assessmentData?.filter(a => a.user_id === progress.user_id) || [];
        const userCertificates = certificateData?.filter(c => c.user_id === progress.user_id) || [];
        const userSectionProgress = sectionProgress?.filter(sp => sp.progress_id === progress.id) || [];

        return {
          userId: progress.user_id,
          userEmail: progress.user?.email,
          userRole: progress.user?.role,
          userDepartment: progress.user?.department,
          status: progress.status,
          progressPercentage: progress.progress_percentage,
          timeSpentMinutes: progress.time_spent_minutes,
          startedAt: progress.started_at,
          completedAt: progress.completed_at,
          lastAccessedAt: progress.last_accessed_at,
          assessmentAttempts: userAssessments.length,
          bestAssessmentScore: userAssessments.length > 0 
            ? Math.max(...userAssessments.map(a => a.score_percentage))
            : null,
          hasCertificate: userCertificates.length > 0,
          sectionsCompleted: userSectionProgress.filter(sp => sp.is_completed).length,
          totalSections: userSectionProgress.length
        };
      });

      // Department breakdown
      const departmentStats = userPerformance.reduce((acc, user) => {
        const dept = user.userDepartment || 'Unknown';
        if (!acc[dept]) {
          acc[dept] = {
            totalUsers: 0,
            completedUsers: 0,
            avgProgress: 0,
            avgTimeSpent: 0,
            certificates: 0
          };
        }
        
        acc[dept].totalUsers++;
        if (user.status === 'completed') acc[dept].completedUsers++;
        acc[dept].avgProgress += user.progressPercentage || 0;
        acc[dept].avgTimeSpent += user.timeSpentMinutes || 0;
        if (user.hasCertificate) acc[dept].certificates++;
        
        return acc;
      }, {} as Record<string, any>);

      // Finalize department stats
      Object.keys(departmentStats).forEach(dept => {
        const stats = departmentStats[dept];
        stats.avgProgress = Math.round(stats.avgProgress / stats.totalUsers);
        stats.avgTimeSpent = Math.round(stats.avgTimeSpent / stats.totalUsers);
        stats.completionRate = Math.round((stats.completedUsers / stats.totalUsers) * 100);
      });

      // Timeline data (daily enrollments and completions)
      const timelineData = [];
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * dayInMs);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const dayEnrollments = progressData?.filter(p => {
          const startDate = new Date(p.started_at);
          return startDate >= dayStart && startDate <= dayEnd;
        }).length || 0;

        const dayCompletions = progressData?.filter(p => {
          const completeDate = p.completed_at ? new Date(p.completed_at) : null;
          return completeDate && completeDate >= dayStart && completeDate <= dayEnd;
        }).length || 0;

        timelineData.push({
          date: dayStart.toISOString().split('T')[0],
          enrollments: dayEnrollments,
          completions: dayCompletions
        });
      }

      // Top performers
      const topPerformers = userPerformance
        .filter(user => user.status === 'completed')
        .sort((a, b) => {
          // Sort by best assessment score, then by completion time
          if (a.bestAssessmentScore !== b.bestAssessmentScore) {
            return (b.bestAssessmentScore || 0) - (a.bestAssessmentScore || 0);
          }
          return (a.timeSpentMinutes || 0) - (b.timeSpentMinutes || 0);
        })
        .slice(0, 5);

      // Users needing attention
      const needsAttention = userPerformance
        .filter(user => 
          user.status === 'in_progress' && 
          (user.progressPercentage < 50 || 
           (user.lastAccessedAt && new Date(user.lastAccessedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
        )
        .slice(0, 5);

      const moduleAnalytics = {
        // Module details
        module: {
          id: module.id,
          title: module.title,
          titleTh: module.title_th,
          description: module.description,
          descriptionTh: module.description_th,
          estimatedDuration: module.estimated_duration,
          difficultyLevel: module.difficulty_level,
          isActive: module.is_active,
          category: module.category,
          prerequisites: module.prerequisites,
          learningObjectives: module.learning_objectives,
          learningObjectivesTh: module.learning_objectives_th
        },

        // Summary statistics
        summary: {
          totalEnrollments,
          completedUsers: completedProgress.length,
          inProgressUsers: inProgressUsers.length,
          notStartedUsers: notStartedUsers.length,
          completionRate,
          avgTimeSpent,
          totalAssessments,
          assessmentPassRate,
          avgAssessmentScore,
          activeCertificates,
          period,
          startDate: startDateStr,
          generatedAt: new Date().toISOString()
        },

        // User performance data
        userPerformance,

        // Department breakdown
        departments: departmentStats,

        // Timeline data
        timeline: timelineData,

        // Insights
        insights: {
          topPerformers,
          needsAttention,
          
          // Performance indicators
          indicators: {
            engagementScore: Math.round((totalEnrollments / Math.max(1, module.estimated_duration || 60)) * 10),
            effectivenessScore: completionRate,
            difficultyScore: 100 - assessmentPassRate,
            satisfactionScore: Math.min(100, avgAssessmentScore + 10) // Proxy based on assessment scores
          },

          // Recommendations
          recommendations: [
            ...(completionRate < 70 ? ['Consider reviewing module content for clarity'] : []),
            ...(assessmentPassRate < 80 ? ['Review assessment difficulty and content alignment'] : []),
            ...(avgTimeSpent > (module.estimated_duration || 60) * 1.5 ? ['Module may be too complex or unclear'] : []),
            ...(needsAttention.length > 0 ? ['Follow up with users who have stalled progress'] : []),
            ...(avgAssessmentScore > 95 ? ['Consider increasing assessment difficulty'] : [])
          ]
        }
      };

      return NextResponse.json({
        success: true,
        data: moduleAnalytics
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch module analytics',
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Module analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}