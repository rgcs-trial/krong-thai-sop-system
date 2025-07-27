/**
 * Training User Analytics API
 * GET /api/training/analytics/users/[userId] - Get analytics for specific user's training progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
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
    const { data: currentUser, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUserId = params.userId;
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Users can view their own analytics, managers and admins can view any user's analytics
    if (currentUser.id !== targetUserId && !['admin', 'manager'].includes(currentUser.role)) {
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
      // Get target user details
      const { data: targetUser, error: targetUserError } = await supabase
        .from('auth_users')
        .select('id, email, role, department, created_at, last_active_at')
        .eq('id', targetUserId)
        .eq('restaurant_id', currentUser.restaurant_id)
        .single();

      if (targetUserError || !targetUser) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
      }

      // Get all training progress for this user
      const { data: userProgress, error: progressError } = await supabase
        .from('user_training_progress')
        .select(`
          id,
          module_id,
          status,
          progress_percentage,
          time_spent_minutes,
          current_section_id,
          started_at,
          completed_at,
          last_accessed_at,
          module:training_modules!inner(
            id,
            title,
            title_th,
            category,
            difficulty_level,
            estimated_duration,
            restaurant_id
          )
        `)
        .eq('user_id', targetUserId)
        .eq('module.restaurant_id', currentUser.restaurant_id)
        .gte('started_at', startDateStr)
        .order('started_at', { ascending: false });

      if (progressError) throw progressError;

      // Get section progress
      const progressIds = userProgress?.map(p => p.id) || [];
      const { data: sectionProgress, error: sectionError } = await supabase
        .from('user_section_progress')
        .select(`
          id,
          section_id,
          progress_id,
          time_spent_minutes,
          is_completed,
          completed_at,
          notes
        `)
        .in('progress_id', progressIds)
        .gte('completed_at', startDateStr);

      if (sectionError) console.warn('Section progress unavailable:', sectionError);

      // Get assessment data
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('training_assessments')
        .select(`
          id,
          module_id,
          status,
          score_percentage,
          passed_at,
          failed_at,
          attempts,
          time_spent_minutes,
          started_at,
          completed_at,
          module:training_modules!inner(
            title,
            title_th,
            restaurant_id
          )
        `)
        .eq('user_id', targetUserId)
        .eq('module.restaurant_id', currentUser.restaurant_id)
        .gte('started_at', startDateStr)
        .order('started_at', { ascending: false });

      if (assessmentError) console.warn('Assessment data unavailable:', assessmentError);

      // Get certificates
      const { data: certificates, error: certificateError } = await supabase
        .from('training_certificates')
        .select(`
          id,
          module_id,
          status,
          issued_at,
          expires_at,
          certificate_number,
          module:training_modules!inner(
            title,
            title_th,
            restaurant_id
          )
        `)
        .eq('user_id', targetUserId)
        .eq('module.restaurant_id', currentUser.restaurant_id)
        .gte('issued_at', startDateStr)
        .order('issued_at', { ascending: false });

      if (certificateError) console.warn('Certificate data unavailable:', certificateError);

      // Process analytics
      const totalModules = userProgress?.length || 0;
      const completedModules = userProgress?.filter(p => p.status === 'completed').length || 0;
      const inProgressModules = userProgress?.filter(p => p.status === 'in_progress').length || 0;
      const notStartedModules = userProgress?.filter(p => p.status === 'not_started').length || 0;

      const overallProgress = totalModules > 0
        ? Math.round(userProgress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / totalModules)
        : 0;

      const totalTimeSpent = userProgress?.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) || 0;

      // Assessment analytics
      const totalAssessments = assessmentData?.length || 0;
      const passedAssessments = assessmentData?.filter(a => a.status === 'passed').length || 0;
      const failedAssessments = assessmentData?.filter(a => a.status === 'failed').length || 0;
      const avgAssessmentScore = passedAssessments > 0
        ? Math.round(assessmentData.filter(a => a.status === 'passed').reduce((sum, a) => sum + a.score_percentage, 0) / passedAssessments)
        : 0;

      // Certificate analytics
      const activeCertificates = certificates?.filter(c => c.status === 'active').length || 0;
      const expiredCertificates = certificates?.filter(c => c.status === 'expired').length || 0;

      // Learning streak calculation
      const sortedProgress = [...(userProgress || [])].sort((a, b) => 
        new Date(a.last_accessed_at || a.started_at).getTime() - new Date(b.last_accessed_at || b.started_at).getTime()
      );

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      for (let i = 0; i < sortedProgress.length; i++) {
        const currentDate = new Date(sortedProgress[i].last_accessed_at || sortedProgress[i].started_at);
        const prevDate = i > 0 ? new Date(sortedProgress[i-1].last_accessed_at || sortedProgress[i-1].started_at) : null;
        
        if (prevDate) {
          const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
      
      // Check if user is currently active (last 7 days)
      const lastActivity = sortedProgress.length > 0 
        ? new Date(sortedProgress[sortedProgress.length - 1].last_accessed_at || sortedProgress[sortedProgress.length - 1].started_at)
        : null;
      
      if (lastActivity && (Date.now() - lastActivity.getTime()) <= 7 * 24 * 60 * 60 * 1000) {
        currentStreak = tempStreak;
      }

      // Module performance breakdown
      const modulePerformance = (userProgress || []).map(progress => {
        const moduleAssessments = assessmentData?.filter(a => a.module_id === progress.module_id) || [];
        const moduleCertificates = certificates?.filter(c => c.module_id === progress.module_id) || [];
        const moduleSections = sectionProgress?.filter(sp => sp.progress_id === progress.id) || [];
        
        const bestScore = moduleAssessments.length > 0 
          ? Math.max(...moduleAssessments.map(a => a.score_percentage))
          : null;

        return {
          moduleId: progress.module_id,
          moduleTitle: progress.module?.title,
          moduleTitleTh: progress.module?.title_th,
          category: progress.module?.category,
          difficultyLevel: progress.module?.difficulty_level,
          estimatedDuration: progress.module?.estimated_duration,
          status: progress.status,
          progressPercentage: progress.progress_percentage,
          timeSpentMinutes: progress.time_spent_minutes,
          startedAt: progress.started_at,
          completedAt: progress.completed_at,
          lastAccessedAt: progress.last_accessed_at,
          assessmentAttempts: moduleAssessments.length,
          bestAssessmentScore: bestScore,
          hasCertificate: moduleCertificates.length > 0,
          sectionsCompleted: moduleSections.filter(s => s.is_completed).length,
          totalSections: moduleSections.length,
          efficiency: progress.module?.estimated_duration && progress.time_spent_minutes
            ? Math.round((progress.module.estimated_duration / progress.time_spent_minutes) * 100)
            : null
        };
      });

      // Category breakdown
      const categoryStats = modulePerformance.reduce((acc, module) => {
        const category = module.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = {
            totalModules: 0,
            completedModules: 0,
            avgProgress: 0,
            avgTimeSpent: 0,
            avgScore: 0,
            certificates: 0
          };
        }
        
        acc[category].totalModules++;
        if (module.status === 'completed') acc[category].completedModules++;
        acc[category].avgProgress += module.progressPercentage || 0;
        acc[category].avgTimeSpent += module.timeSpentMinutes || 0;
        if (module.bestAssessmentScore) acc[category].avgScore += module.bestAssessmentScore;
        if (module.hasCertificate) acc[category].certificates++;
        
        return acc;
      }, {} as Record<string, any>);

      // Finalize category stats
      Object.keys(categoryStats).forEach(category => {
        const stats = categoryStats[category];
        stats.avgProgress = Math.round(stats.avgProgress / stats.totalModules);
        stats.avgTimeSpent = Math.round(stats.avgTimeSpent / stats.totalModules);
        stats.avgScore = stats.totalModules > 0 ? Math.round(stats.avgScore / stats.totalModules) : 0;
        stats.completionRate = Math.round((stats.completedModules / stats.totalModules) * 100);
      });

      // Learning timeline (daily activity)
      const timelineData = [];
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * dayInMs);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const dayProgress = userProgress?.filter(p => {
          const accessDate = new Date(p.last_accessed_at || p.started_at);
          return accessDate >= dayStart && accessDate <= dayEnd;
        }) || [];

        const dayAssessments = assessmentData?.filter(a => {
          const assessmentDate = new Date(a.completed_at || a.started_at);
          return assessmentDate >= dayStart && assessmentDate <= dayEnd;
        }) || [];

        timelineData.push({
          date: dayStart.toISOString().split('T')[0],
          modulesAccessed: dayProgress.length,
          timeSpent: dayProgress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0),
          assessmentsCompleted: dayAssessments.length,
          avgScore: dayAssessments.length > 0 
            ? Math.round(dayAssessments.reduce((sum, a) => sum + a.score_percentage, 0) / dayAssessments.length)
            : 0
        });
      }

      // Achievements and milestones
      const achievements = [];
      if (completedModules >= 5) achievements.push('Module Marathon');
      if (avgAssessmentScore >= 90) achievements.push('High Achiever');
      if (longestStreak >= 7) achievements.push('Consistent Learner');
      if (activeCertificates >= 3) achievements.push('Certified Professional');
      if (totalTimeSpent >= 500) achievements.push('Dedicated Student');

      // Learning goals and recommendations
      const recommendations = [];
      if (inProgressModules > completedModules) {
        recommendations.push('Focus on completing current modules before starting new ones');
      }
      if (avgAssessmentScore < 70) {
        recommendations.push('Review module content more thoroughly before assessments');
      }
      if (currentStreak === 0 && lastActivity) {
        recommendations.push('Resume learning to maintain momentum');
      }
      if (totalTimeSpent > 0 && totalModules > 0) {
        const avgTimePerModule = totalTimeSpent / totalModules;
        const estimatedTime = modulePerformance.reduce((sum, m) => sum + (m.estimatedDuration || 60), 0) / modulePerformance.length;
        if (avgTimePerModule > estimatedTime * 1.5) {
          recommendations.push('Consider breaking learning sessions into smaller chunks');
        }
      }

      const userAnalytics = {
        // User details
        user: {
          id: targetUser.id,
          email: targetUser.email,
          role: targetUser.role,
          department: targetUser.department,
          joinedAt: targetUser.created_at,
          lastActiveAt: targetUser.last_active_at
        },

        // Summary statistics
        summary: {
          totalModules,
          completedModules,
          inProgressModules,
          notStartedModules,
          overallProgress,
          totalTimeSpent,
          totalAssessments,
          passedAssessments,
          failedAssessments,
          avgAssessmentScore,
          activeCertificates,
          expiredCertificates,
          currentStreak,
          longestStreak,
          period,
          startDate: startDateStr,
          generatedAt: new Date().toISOString()
        },

        // Module performance
        modules: modulePerformance,

        // Category breakdown
        categories: categoryStats,

        // Learning timeline
        timeline: timelineData,

        // Assessments details
        assessments: assessmentData?.map(assessment => ({
          id: assessment.id,
          moduleTitle: assessment.module?.title,
          moduleTitleTh: assessment.module?.title_th,
          status: assessment.status,
          scorePercentage: assessment.score_percentage,
          attempts: assessment.attempts,
          timeSpentMinutes: assessment.time_spent_minutes,
          startedAt: assessment.started_at,
          completedAt: assessment.completed_at,
          passedAt: assessment.passed_at,
          failedAt: assessment.failed_at
        })) || [],

        // Certificates details
        certificates: certificates?.map(cert => ({
          id: cert.id,
          moduleTitle: cert.module?.title,
          moduleTitleTh: cert.module?.title_th,
          status: cert.status,
          issuedAt: cert.issued_at,
          expiresAt: cert.expires_at,
          certificateNumber: cert.certificate_number
        })) || [],

        // Performance insights
        insights: {
          achievements,
          
          // Performance scores
          scores: {
            learningVelocity: Math.min(100, Math.round((completedModules / Math.max(1, totalModules)) * 100)),
            assessmentPerformance: avgAssessmentScore,
            consistency: Math.min(100, longestStreak * 10),
            efficiency: modulePerformance.length > 0 
              ? Math.round(modulePerformance.reduce((sum, m) => sum + (m.efficiency || 50), 0) / modulePerformance.length)
              : 50
          },

          // Strengths and areas for improvement
          strengths: [
            ...(avgAssessmentScore >= 85 ? ['Strong assessment performance'] : []),
            ...(currentStreak >= 3 ? ['Consistent learning habits'] : []),
            ...(activeCertificates >= 2 ? ['Good certification achievement'] : []),
            ...(overallProgress >= 75 ? ['High completion rate'] : [])
          ],

          areasForImprovement: [
            ...(avgAssessmentScore < 70 ? ['Assessment scores'] : []),
            ...(currentStreak === 0 ? ['Learning consistency'] : []),
            ...(inProgressModules > completedModules * 2 ? ['Focus on module completion'] : []),
            ...(overallProgress < 50 ? ['Overall progress rate'] : [])
          ],

          // Recommendations
          recommendations
        }
      };

      return NextResponse.json({
        success: true,
        data: userAnalytics
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch user analytics',
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('User analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}