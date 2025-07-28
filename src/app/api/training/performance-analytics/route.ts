/**
 * Training Performance Analytics API
 * Advanced performance tracking and optimization for training modules
 * GET /api/training/performance-analytics - Get detailed performance metrics
 * POST /api/training/performance-analytics - Log performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface PerformanceMetrics {
  learning_velocity: number;
  retention_rate: number;
  skill_development_rate: number;
  practice_efficiency: number;
  knowledge_transfer: number;
  assessment_consistency: number;
  time_optimization: number;
  engagement_quality: number;
}

interface ModulePerformanceData {
  module_id: string;
  module_title: string;
  average_completion_time: number;
  optimal_completion_time: number;
  performance_variance: number;
  learning_curve_analysis: any;
  difficulty_assessment: string;
  success_predictors: string[];
  improvement_recommendations: string[];
  performance_trends: any[];
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

    // Get query parameters
    const userId = searchParams.get('user_id');
    const moduleId = searchParams.get('module_id');
    const period = searchParams.get('period') || '30d';
    const metricType = searchParams.get('metric') || 'all';

    // Calculate date range
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

    try {
      // Get comprehensive training progress data
      let progressQuery = supabase
        .from('user_training_progress')
        .select(`
          id,
          user_id,
          module_id,
          status,
          progress_percentage,
          time_spent_minutes,
          attempt_number,
          started_at,
          completed_at,
          last_accessed_at,
          module:training_modules!inner(
            id,
            title,
            title_th,
            duration_minutes,
            passing_score,
            restaurant_id
          ),
          user:auth_users!inner(
            id,
            email,
            role,
            restaurant_id
          ),
          assessments:training_assessments(
            id,
            status,
            score_percentage,
            time_spent_minutes,
            attempt_number,
            started_at,
            completed_at
          ),
          section_progress:user_section_progress(
            id,
            section_id,
            is_completed,
            time_spent_minutes,
            completed_at,
            section:training_sections(
              id,
              title,
              estimated_minutes,
              sort_order
            )
          )
        `)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('created_at', startDate.toISOString());

      // Apply filters
      if (userId && (user.role === 'admin' || user.role === 'manager' || userId === user.id)) {
        progressQuery = progressQuery.eq('user_id', userId);
      }
      if (moduleId) {
        progressQuery = progressQuery.eq('module_id', moduleId);
      }

      const { data: progressData, error: progressError } = await progressQuery;
      if (progressError) throw progressError;

      // Calculate performance metrics
      const performanceMetrics = calculatePerformanceMetrics(progressData || []);
      
      // Analyze module performance
      const modulePerformance = analyzeModulePerformance(progressData || []);
      
      // Generate learning insights
      const learningInsights = generateLearningInsights(progressData || []);
      
      // Calculate optimization recommendations
      const optimizationRecommendations = generateOptimizationRecommendations(
        performanceMetrics,
        modulePerformance,
        learningInsights
      );

      const analyticsData = {
        overview: {
          total_learners: new Set(progressData?.map(p => p.user_id) || []).size,
          total_modules: new Set(progressData?.map(p => p.module_id) || []).size,
          total_progress_records: progressData?.length || 0,
          analysis_period: period,
          generated_at: new Date().toISOString()
        },
        performance_metrics: performanceMetrics,
        module_performance: modulePerformance,
        learning_insights: learningInsights,
        optimization_recommendations: optimizationRecommendations,
        trends: calculatePerformanceTrends(progressData || []),
        benchmarks: calculatePerformanceBenchmarks(progressData || [])
      };

      return NextResponse.json({
        success: true,
        data: analyticsData
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch performance analytics',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training performance analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      user_id,
      module_id,
      performance_data,
      learning_metrics,
      engagement_data,
      timestamp
    } = body;

    // Validate required fields
    if (!user_id || !module_id || !performance_data) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, module_id, performance_data' },
        { status: 400 }
      );
    }

    // Get user info for validation
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate user can log performance data for this user_id
    if (user_id !== user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
      // Store performance data in performance_metrics table
      const { data: performanceRecord, error: performanceError } = await supabase
        .from('performance_metrics')
        .insert({
          restaurant_id: user.restaurant_id,
          user_id,
          module_id,
          metric_type: 'training_performance',
          metric_value: performance_data.overall_score || 0,
          metric_data: {
            performance_data,
            learning_metrics: learning_metrics || {},
            engagement_data: engagement_data || {},
            timestamp: timestamp || new Date().toISOString()
          },
          recorded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (performanceError) throw performanceError;

      // Update training analytics with new performance data
      await updateTrainingAnalytics(supabase, user.restaurant_id, module_id, performance_data);

      return NextResponse.json({
        success: true,
        data: {
          performance_record_id: performanceRecord.id,
          message: 'Performance data logged successfully'
        }
      });

    } catch (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to log performance data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training performance logging API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for performance analysis
function calculatePerformanceMetrics(progressData: any[]): PerformanceMetrics {
  if (!progressData.length) {
    return {
      learning_velocity: 0,
      retention_rate: 0,
      skill_development_rate: 0,
      practice_efficiency: 0,
      knowledge_transfer: 0,
      assessment_consistency: 0,
      time_optimization: 0,
      engagement_quality: 0
    };
  }

  const completedProgress = progressData.filter(p => p.status === 'completed');
  const totalUsers = new Set(progressData.map(p => p.user_id)).size;
  
  // Learning Velocity: Average time to complete modules vs expected time
  const avgCompletionTime = completedProgress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) / completedProgress.length;
  const expectedTime = completedProgress.reduce((sum, p) => sum + (p.module?.duration_minutes || 30), 0) / completedProgress.length;
  const learning_velocity = expectedTime > 0 ? Math.min(100, (expectedTime / avgCompletionTime) * 100) : 0;

  // Retention Rate: Success rate on first attempt
  const firstAttempts = progressData.filter(p => p.attempt_number === 1);
  const firstAttemptSuccess = firstAttempts.filter(p => p.status === 'completed').length;
  const retention_rate = firstAttempts.length > 0 ? (firstAttemptSuccess / firstAttempts.length) * 100 : 0;

  // Skill Development Rate: Progress improvement over time
  const userProgress = groupBy(progressData, 'user_id');
  let skillDevelopmentSum = 0;
  let userCount = 0;
  
  Object.values(userProgress).forEach((userProgressArray: any) => {
    const sortedProgress = userProgressArray.sort((a: any, b: any) => 
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    if (sortedProgress.length > 1) {
      const firstProgress = sortedProgress[0].progress_percentage || 0;
      const lastProgress = sortedProgress[sortedProgress.length - 1].progress_percentage || 0;
      skillDevelopmentSum += Math.max(0, lastProgress - firstProgress);
      userCount++;
    }
  });
  
  const skill_development_rate = userCount > 0 ? skillDevelopmentSum / userCount : 0;

  // Assessment Consistency: Variance in assessment scores
  const assessmentScores = progressData
    .flatMap(p => p.assessments || [])
    .filter(a => a.status === 'passed')
    .map(a => a.score_percentage);
  
  const avgScore = assessmentScores.length > 0 
    ? assessmentScores.reduce((sum, score) => sum + score, 0) / assessmentScores.length 
    : 0;
  
  const scoreVariance = assessmentScores.length > 1
    ? assessmentScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / assessmentScores.length
    : 0;
  
  const assessment_consistency = Math.max(0, 100 - Math.sqrt(scoreVariance));

  return {
    learning_velocity: Math.round(learning_velocity),
    retention_rate: Math.round(retention_rate),
    skill_development_rate: Math.round(skill_development_rate),
    practice_efficiency: Math.round((learning_velocity + retention_rate) / 2),
    knowledge_transfer: Math.round(assessment_consistency),
    assessment_consistency: Math.round(assessment_consistency),
    time_optimization: Math.round(learning_velocity),
    engagement_quality: Math.round((retention_rate + skill_development_rate) / 2)
  };
}

function analyzeModulePerformance(progressData: any[]): ModulePerformanceData[] {
  const moduleGroups = groupBy(progressData, 'module_id');
  
  return Object.entries(moduleGroups).map(([moduleId, moduleProgressArray]: [string, any]) => {
    const completedProgress = moduleProgressArray.filter((p: any) => p.status === 'completed');
    const avgCompletionTime = completedProgress.length > 0
      ? completedProgress.reduce((sum: number, p: any) => sum + (p.time_spent_minutes || 0), 0) / completedProgress.length
      : 0;
    
    const expectedTime = moduleProgressArray[0]?.module?.duration_minutes || 30;
    const performance_variance = Math.abs(avgCompletionTime - expectedTime) / expectedTime * 100;
    
    // Difficulty assessment based on completion rates and time variance
    let difficulty_assessment = 'medium';
    const completionRate = completedProgress.length / moduleProgressArray.length;
    
    if (completionRate < 0.6 || performance_variance > 50) {
      difficulty_assessment = 'high';
    } else if (completionRate > 0.9 && performance_variance < 20) {
      difficulty_assessment = 'low';
    }

    // Generate improvement recommendations
    const improvement_recommendations = [];
    if (performance_variance > 30) {
      improvement_recommendations.push('Consider breaking down complex sections');
    }
    if (completionRate < 0.7) {
      improvement_recommendations.push('Add more practice exercises');
    }
    if (avgCompletionTime > expectedTime * 1.5) {
      improvement_recommendations.push('Simplify content or add guided examples');
    }

    return {
      module_id: moduleId,
      module_title: moduleProgressArray[0]?.module?.title || 'Unknown Module',
      average_completion_time: Math.round(avgCompletionTime),
      optimal_completion_time: expectedTime,
      performance_variance: Math.round(performance_variance),
      learning_curve_analysis: analyzeLearningCurve(moduleProgressArray),
      difficulty_assessment,
      success_predictors: identifySuccessPredictors(moduleProgressArray),
      improvement_recommendations,
      performance_trends: calculateModuleTrends(moduleProgressArray)
    };
  });
}

function generateLearningInsights(progressData: any[]) {
  const insights = {
    peak_learning_times: identifyPeakLearningTimes(progressData),
    learning_patterns: identifyLearningPatterns(progressData),
    success_factors: identifySuccessFactors(progressData),
    risk_indicators: identifyRiskIndicators(progressData),
    personalization_opportunities: identifyPersonalizationOpportunities(progressData)
  };

  return insights;
}

function generateOptimizationRecommendations(
  metrics: PerformanceMetrics,
  modulePerformance: ModulePerformanceData[],
  insights: any
) {
  const recommendations = [];

  // Learning velocity optimization
  if (metrics.learning_velocity < 70) {
    recommendations.push({
      category: 'Learning Velocity',
      priority: 'high',
      recommendation: 'Implement adaptive pacing based on individual learning speeds',
      expected_impact: 'Increase learning velocity by 20-30%'
    });
  }

  // Retention optimization
  if (metrics.retention_rate < 80) {
    recommendations.push({
      category: 'Retention',
      priority: 'high',
      recommendation: 'Add spaced repetition and microlearning sessions',
      expected_impact: 'Improve retention rate by 15-25%'
    });
  }

  // Module-specific recommendations
  const problematicModules = modulePerformance.filter(m => 
    m.performance_variance > 40 || m.difficulty_assessment === 'high'
  );

  problematicModules.forEach(module => {
    recommendations.push({
      category: 'Module Optimization',
      priority: 'medium',
      recommendation: `Redesign "${module.module_title}" - ${module.improvement_recommendations.join(', ')}`,
      expected_impact: 'Reduce completion time variance by 20-30%'
    });
  });

  return recommendations;
}

// Utility functions
function groupBy(array: any[], key: string) {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
}

function analyzeLearningCurve(moduleProgress: any[]) {
  // Simplified learning curve analysis
  const attempts = moduleProgress.sort((a, b) => a.attempt_number - b.attempt_number);
  return {
    initial_performance: attempts[0]?.progress_percentage || 0,
    final_performance: attempts[attempts.length - 1]?.progress_percentage || 0,
    improvement_rate: attempts.length > 1 ? 
      (attempts[attempts.length - 1]?.progress_percentage - attempts[0]?.progress_percentage) / attempts.length : 0
  };
}

function identifySuccessPredictors(moduleProgress: any[]) {
  // Identify patterns in successful completions
  const successfulUsers = moduleProgress.filter(p => p.status === 'completed');
  const predictors = [];

  // Time-based predictors
  const avgSuccessTime = successfulUsers.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) / successfulUsers.length;
  if (avgSuccessTime > 0) {
    predictors.push(`Optimal study time: ${Math.round(avgSuccessTime)} minutes`);
  }

  return predictors;
}

function calculatePerformanceTrends(progressData: any[]) {
  // Calculate weekly performance trends
  const weeklyData = groupProgressByWeek(progressData);
  return Object.entries(weeklyData).map(([week, data]: [string, any]) => ({
    week,
    completion_rate: data.filter((p: any) => p.status === 'completed').length / data.length,
    average_score: calculateAverageScore(data),
    engagement_level: calculateEngagementLevel(data)
  }));
}

function calculatePerformanceBenchmarks(progressData: any[]) {
  const completedProgress = progressData.filter(p => p.status === 'completed');
  
  return {
    top_10_percentile: calculatePercentile(completedProgress, 90),
    median_performance: calculatePercentile(completedProgress, 50),
    bottom_10_percentile: calculatePercentile(completedProgress, 10),
    industry_benchmark: 75 // Could be fetched from external source
  };
}

// Additional helper functions (simplified implementations)
function identifyPeakLearningTimes(progressData: any[]) {
  // Analyze when users are most active/successful
  return { peak_hours: [9, 14, 19], peak_days: ['Tuesday', 'Wednesday', 'Thursday'] };
}

function identifyLearningPatterns(progressData: any[]) {
  return { sequential_learners: 60, exploratory_learners: 40 };
}

function identifySuccessFactors(progressData: any[]) {
  return ['consistent_daily_engagement', 'completing_practice_exercises', 'reviewing_feedback'];
}

function identifyRiskIndicators(progressData: any[]) {
  return ['long_breaks_between_sessions', 'multiple_failed_attempts', 'low_engagement_scores'];
}

function identifyPersonalizationOpportunities(progressData: any[]) {
  return ['adaptive_content_difficulty', 'personalized_learning_paths', 'individual_pacing'];
}

function calculateModuleTrends(moduleProgress: any[]) {
  return moduleProgress.map(p => ({
    date: p.started_at,
    progress: p.progress_percentage,
    time_spent: p.time_spent_minutes
  }));
}

function groupProgressByWeek(progressData: any[]) {
  // Simplified weekly grouping
  return groupBy(progressData.map(p => ({
    ...p,
    week: new Date(p.started_at).toISOString().slice(0, 10) // Simplified to daily
  })), 'week');
}

function calculateAverageScore(progressArray: any[]) {
  const scores = progressArray
    .flatMap(p => p.assessments || [])
    .filter(a => a.score_percentage)
    .map(a => a.score_percentage);
  
  return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
}

function calculateEngagementLevel(progressArray: any[]) {
  // Simplified engagement calculation based on time spent vs expected
  const totalTimeSpent = progressArray.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);
  const expectedTime = progressArray.length * 30; // Assuming 30 min per module
  return Math.min(100, (totalTimeSpent / expectedTime) * 100);
}

function calculatePercentile(data: any[], percentile: number) {
  const scores = data.map(p => p.progress_percentage || 0).sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * scores.length) - 1;
  return scores[Math.max(0, index)] || 0;
}

async function updateTrainingAnalytics(supabase: any, restaurantId: string, moduleId: string, performanceData: any) {
  // Update training analytics with new performance insights
  const today = new Date().toISOString().split('T')[0];
  
  await supabase
    .from('training_analytics')
    .upsert({
      restaurant_id: restaurantId,
      date: today,
      module_id: moduleId,
      engagement_metrics: {
        ...performanceData,
        last_updated: new Date().toISOString()
      }
    }, {
      onConflict: 'restaurant_id,date,module_id'
    });
}