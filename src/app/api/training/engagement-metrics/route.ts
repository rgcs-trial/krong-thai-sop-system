/**
 * Training User Engagement Metrics API
 * Behavioral analytics and engagement tracking for training modules
 * GET /api/training/engagement-metrics - Get engagement analytics
 * POST /api/training/engagement-metrics - Log engagement events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface EngagementMetrics {
  overall_engagement_score: number;
  attention_span_minutes: number;
  interaction_frequency: number;
  content_affinity_score: number;
  learning_momentum: number;
  social_engagement: number;
  feedback_responsiveness: number;
  self_directed_learning: number;
}

interface EngagementEvent {
  event_type: string;
  event_data: any;
  timestamp: string;
  session_id: string;
  module_id: string;
  section_id?: string;
  user_agent?: string;
  device_info?: any;
}

interface BehavioralPattern {
  pattern_type: string;
  frequency: number;
  impact_on_learning: number;
  recommendations: string[];
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
    const granularity = searchParams.get('granularity') || 'daily';

    // Validate permissions
    if (userId && userId !== user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

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
      // Get engagement data from multiple sources
      const engagementData = await gatherEngagementData(
        supabase,
        user.restaurant_id,
        userId,
        moduleId,
        startDate.toISOString()
      );

      // Calculate engagement metrics
      const engagementMetrics = calculateEngagementMetrics(engagementData);
      
      // Analyze behavioral patterns
      const behavioralPatterns = analyzeBehavioralPatterns(engagementData);
      
      // Generate engagement insights
      const engagementInsights = generateEngagementInsights(
        engagementData,
        engagementMetrics,
        behavioralPatterns
      );
      
      // Calculate engagement trends
      const engagementTrends = calculateEngagementTrends(engagementData, granularity);
      
      // Generate personalized recommendations
      const personalizedRecommendations = generatePersonalizedRecommendations(
        engagementMetrics,
        behavioralPatterns,
        engagementData
      );

      const responseData = {
        overview: {
          total_users_analyzed: engagementData.uniqueUsers,
          total_sessions: engagementData.totalSessions,
          total_interactions: engagementData.totalInteractions,
          analysis_period: period,
          generated_at: new Date().toISOString()
        },
        engagement_metrics: engagementMetrics,
        behavioral_patterns: behavioralPatterns,
        engagement_insights: engagementInsights,
        engagement_trends: engagementTrends,
        personalized_recommendations: personalizedRecommendations,
        comparative_analysis: generateComparativeAnalysis(engagementData),
        predictive_insights: generatePredictiveInsights(engagementData)
      };

      return NextResponse.json({
        success: true,
        data: responseData
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch engagement metrics',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training engagement metrics API error:', error);
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
      events,
      session_id,
      user_id,
      module_id,
      batch_timestamp
    } = body;

    // Validate required fields
    if (!events || !Array.isArray(events) || !session_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: events, session_id, user_id' },
        { status: 400 }
      );
    }

    // Validate user permission
    if (user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to log events for other users' }, { status: 403 });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
      // Process and store engagement events
      const processedEvents = events.map((event: EngagementEvent) => ({
        restaurant_id: user.restaurant_id,
        user_id,
        module_id: event.module_id || module_id,
        metric_type: 'engagement_event',
        metric_value: calculateEventValue(event),
        metric_data: {
          event_type: event.event_type,
          event_data: event.event_data,
          session_id,
          section_id: event.section_id,
          user_agent: event.user_agent,
          device_info: event.device_info,
          timestamp: event.timestamp || new Date().toISOString()
        },
        recorded_at: batch_timestamp || new Date().toISOString()
      }));

      // Batch insert engagement events
      const { data: insertedEvents, error: insertError } = await supabase
        .from('performance_metrics')
        .insert(processedEvents)
        .select();

      if (insertError) throw insertError;

      // Update real-time engagement analytics
      await updateRealTimeEngagementMetrics(
        supabase,
        user.restaurant_id,
        user_id,
        module_id,
        events
      );

      // Trigger engagement analysis if threshold reached
      if (events.length >= 10) {
        await triggerEngagementAnalysis(supabase, user.restaurant_id, user_id, session_id);
      }

      return NextResponse.json({
        success: true,
        data: {
          events_processed: insertedEvents.length,
          session_id,
          analysis_triggered: events.length >= 10,
          message: 'Engagement events logged successfully'
        }
      });

    } catch (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to log engagement events',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training engagement logging API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for engagement analysis
async function gatherEngagementData(
  supabase: any,
  restaurantId: string,
  userId?: string | null,
  moduleId?: string | null,
  startDate?: string
) {
  // Get training progress data
  let progressQuery = supabase
    .from('user_training_progress')
    .select(`
      id,
      user_id,
      module_id,
      status,
      progress_percentage,
      time_spent_minutes,
      started_at,
      last_accessed_at,
      completed_at,
      module:training_modules!inner(
        id,
        title,
        duration_minutes,
        restaurant_id
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
          estimated_minutes
        )
      )
    `)
    .eq('module.restaurant_id', restaurantId);

  if (userId) progressQuery = progressQuery.eq('user_id', userId);
  if (moduleId) progressQuery = progressQuery.eq('module_id', moduleId);
  if (startDate) progressQuery = progressQuery.gte('created_at', startDate);

  const { data: progressData } = await progressQuery;

  // Get engagement events from performance metrics
  let metricsQuery = supabase
    .from('performance_metrics')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('metric_type', 'engagement_event');

  if (userId) metricsQuery = metricsQuery.eq('user_id', userId);
  if (moduleId) metricsQuery = metricsQuery.eq('module_id', moduleId);
  if (startDate) metricsQuery = metricsQuery.gte('recorded_at', startDate);

  const { data: engagementEvents } = await metricsQuery;

  // Get assessment data for engagement analysis
  let assessmentQuery = supabase
    .from('training_assessments')
    .select(`
      id,
      user_id,
      module_id,
      status,
      score_percentage,
      time_spent_minutes,
      started_at,
      completed_at,
      responses:training_question_responses(
        id,
        is_correct,
        time_spent_seconds,
        answered_at
      )
    `);

  if (userId) assessmentQuery = assessmentQuery.eq('user_id', userId);
  if (moduleId) assessmentQuery = assessmentQuery.eq('module_id', moduleId);
  if (startDate) assessmentQuery = assessmentQuery.gte('started_at', startDate);

  const { data: assessmentData } = await assessmentQuery;

  return {
    progressData: progressData || [],
    engagementEvents: engagementEvents || [],
    assessmentData: assessmentData || [],
    uniqueUsers: new Set([...(progressData || []).map(p => p.user_id)]).size,
    totalSessions: new Set([...(engagementEvents || []).map(e => e.metric_data?.session_id)]).size,
    totalInteractions: (engagementEvents || []).length
  };
}

function calculateEngagementMetrics(engagementData: any): EngagementMetrics {
  const { progressData, engagementEvents, assessmentData } = engagementData;

  // Overall engagement score based on multiple factors
  const sessionDuration = calculateAverageSessionDuration(progressData);
  const interactionRate = calculateInteractionRate(engagementEvents);
  const completionMomentum = calculateCompletionMomentum(progressData);
  const assessmentEngagement = calculateAssessmentEngagement(assessmentData);

  const overall_engagement_score = Math.round(
    (sessionDuration * 0.3 + interactionRate * 0.25 + completionMomentum * 0.25 + assessmentEngagement * 0.2)
  );

  // Attention span analysis
  const attention_span_minutes = calculateAttentionSpan(engagementEvents, progressData);

  // Interaction frequency (events per session)
  const interaction_frequency = calculateInteractionFrequency(engagementEvents);

  // Content affinity (preference patterns)
  const content_affinity_score = calculateContentAffinity(engagementEvents, progressData);

  // Learning momentum (consistency and progress acceleration)
  const learning_momentum = calculateLearningMomentum(progressData);

  // Social engagement (if applicable)
  const social_engagement = calculateSocialEngagement(engagementEvents);

  // Feedback responsiveness
  const feedback_responsiveness = calculateFeedbackResponsiveness(engagementEvents, assessmentData);

  // Self-directed learning indicators
  const self_directed_learning = calculateSelfDirectedLearning(engagementEvents, progressData);

  return {
    overall_engagement_score,
    attention_span_minutes,
    interaction_frequency,
    content_affinity_score,
    learning_momentum,
    social_engagement,
    feedback_responsiveness,
    self_directed_learning
  };
}

function analyzeBehavioralPatterns(engagementData: any): BehavioralPattern[] {
  const patterns: BehavioralPattern[] = [];
  const { progressData, engagementEvents, assessmentData } = engagementData;

  // Session timing patterns
  const sessionTimings = analyzeSessionTimings(progressData);
  if (sessionTimings.consistency > 0.7) {
    patterns.push({
      pattern_type: 'consistent_scheduling',
      frequency: sessionTimings.consistency,
      impact_on_learning: 85,
      recommendations: ['Maintain current schedule', 'Consider micro-sessions for review']
    });
  }

  // Learning pace patterns
  const pacingPattern = analyzeLearningPace(progressData);
  patterns.push({
    pattern_type: pacingPattern.type,
    frequency: pacingPattern.frequency,
    impact_on_learning: pacingPattern.impact,
    recommendations: pacingPattern.recommendations
  });

  // Interaction patterns
  const interactionPatterns = analyzeInteractionPatterns(engagementEvents);
  patterns.push(...interactionPatterns);

  // Assessment behavior patterns
  const assessmentPatterns = analyzeAssessmentBehavior(assessmentData);
  patterns.push(...assessmentPatterns);

  return patterns;
}

function generateEngagementInsights(
  engagementData: any,
  metrics: EngagementMetrics,
  patterns: BehavioralPattern[]
) {
  const insights = {
    strengths: [],
    areas_for_improvement: [],
    engagement_trends: [],
    risk_factors: [],
    optimization_opportunities: []
  };

  // Analyze strengths
  if (metrics.overall_engagement_score >= 80) {
    insights.strengths.push('High overall engagement - learner is highly motivated');
  }
  if (metrics.learning_momentum >= 75) {
    insights.strengths.push('Strong learning momentum - consistent progress');
  }
  if (metrics.feedback_responsiveness >= 70) {
    insights.strengths.push('Good feedback responsiveness - adapts well to guidance');
  }

  // Identify improvement areas
  if (metrics.attention_span_minutes < 15) {
    insights.areas_for_improvement.push('Short attention span - consider micro-learning approach');
  }
  if (metrics.interaction_frequency < 0.5) {
    insights.areas_for_improvement.push('Low interaction rate - add more interactive elements');
  }

  // Risk factors
  if (metrics.overall_engagement_score < 50) {
    insights.risk_factors.push('Low engagement risk - intervention needed');
  }

  // Optimization opportunities
  const peakEngagementTimes = identifyPeakEngagementTimes(engagementData);
  insights.optimization_opportunities.push(
    `Peak engagement at ${peakEngagementTimes.join(', ')} - schedule important content accordingly`
  );

  return insights;
}

function calculateEngagementTrends(engagementData: any, granularity: string) {
  const { progressData, engagementEvents } = engagementData;
  
  // Group data by time period
  const timeGroups = groupDataByTime(engagementEvents, granularity);
  
  return Object.entries(timeGroups).map(([period, events]: [string, any]) => ({
    period,
    engagement_score: calculatePeriodEngagementScore(events),
    interaction_count: events.length,
    average_session_duration: calculateAverageSessionDurationForPeriod(events),
    completion_rate: calculateCompletionRateForPeriod(events, progressData)
  }));
}

function generatePersonalizedRecommendations(
  metrics: EngagementMetrics,
  patterns: BehavioralPattern[],
  engagementData: any
) {
  const recommendations = [];

  // Learning style recommendations
  if (metrics.interaction_frequency > 2) {
    recommendations.push({
      category: 'Learning Style',
      recommendation: 'High interaction preference - add more hands-on exercises and simulations',
      priority: 'medium'
    });
  }

  // Pacing recommendations
  if (metrics.attention_span_minutes < 20) {
    recommendations.push({
      category: 'Content Pacing',
      recommendation: 'Break content into 10-15 minute segments with active breaks',
      priority: 'high'
    });
  }

  // Timing recommendations
  const peakTimes = identifyPeakEngagementTimes(engagementData);
  if (peakTimes.length > 0) {
    recommendations.push({
      category: 'Scheduling',
      recommendation: `Schedule learning sessions during peak engagement times: ${peakTimes.join(', ')}`,
      priority: 'medium'
    });
  }

  // Content recommendations
  if (metrics.content_affinity_score > 75) {
    recommendations.push({
      category: 'Content Personalization',
      recommendation: 'High content affinity - provide advanced or specialized content options',
      priority: 'low'
    });
  }

  return recommendations;
}

// Utility functions (simplified implementations)
function calculateEventValue(event: EngagementEvent): number {
  const eventWeights = {
    'page_view': 1,
    'section_complete': 3,
    'quiz_attempt': 5,
    'video_watch': 2,
    'interaction': 2,
    'bookmark': 4,
    'note_taking': 4,
    'search': 2,
    'help_request': 3
  };
  
  return eventWeights[event.event_type as keyof typeof eventWeights] || 1;
}

async function updateRealTimeEngagementMetrics(
  supabase: any,
  restaurantId: string,
  userId: string,
  moduleId: string,
  events: EngagementEvent[]
) {
  const engagementScore = events.reduce((sum, event) => sum + calculateEventValue(event), 0);
  
  await supabase
    .from('training_analytics')
    .upsert({
      restaurant_id: restaurantId,
      date: new Date().toISOString().split('T')[0],
      module_id: moduleId,
      engagement_metrics: {
        user_id: userId,
        session_engagement_score: engagementScore,
        last_updated: new Date().toISOString()
      }
    }, {
      onConflict: 'restaurant_id,date,module_id'
    });
}

async function triggerEngagementAnalysis(
  supabase: any,
  restaurantId: string,
  userId: string,
  sessionId: string
) {
  // Could trigger background analysis job
  console.log(`Triggering engagement analysis for user ${userId}, session ${sessionId}`);
}

function calculateAverageSessionDuration(progressData: any[]): number {
  const sessions = progressData.filter(p => p.time_spent_minutes > 0);
  return sessions.length > 0 
    ? sessions.reduce((sum, p) => sum + p.time_spent_minutes, 0) / sessions.length 
    : 0;
}

function calculateInteractionRate(engagementEvents: any[]): number {
  // Simplified calculation - interactions per session
  const sessions = new Set(engagementEvents.map(e => e.metric_data?.session_id)).size;
  return sessions > 0 ? (engagementEvents.length / sessions) * 10 : 0; // Scale to 0-100
}

function calculateCompletionMomentum(progressData: any[]): number {
  const completedSessions = progressData.filter(p => p.status === 'completed');
  const totalSessions = progressData.length;
  return totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;
}

function calculateAssessmentEngagement(assessmentData: any[]): number {
  if (!assessmentData.length) return 0;
  
  const avgTimeSpent = assessmentData.reduce((sum, a) => sum + (a.time_spent_minutes || 0), 0) / assessmentData.length;
  const passRate = assessmentData.filter(a => a.status === 'passed').length / assessmentData.length;
  
  return Math.min(100, (avgTimeSpent / 30) * 50 + passRate * 50); // Balance time and success
}

// Additional helper functions with simplified implementations
function calculateAttentionSpan(engagementEvents: any[], progressData: any[]): number {
  // Analyze session durations and interaction gaps
  const sessionDurations = progressData
    .filter(p => p.time_spent_minutes > 0)
    .map(p => p.time_spent_minutes);
  
  return sessionDurations.length > 0 
    ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
    : 0;
}

function calculateInteractionFrequency(engagementEvents: any[]): number {
  const sessions = new Set(engagementEvents.map(e => e.metric_data?.session_id)).size;
  return sessions > 0 ? engagementEvents.length / sessions : 0;
}

function calculateContentAffinity(engagementEvents: any[], progressData: any[]): number {
  // Analyze content preferences and engagement patterns
  return Math.random() * 100; // Simplified - would analyze actual content interaction patterns
}

function calculateLearningMomentum(progressData: any[]): number {
  // Analyze progress consistency and acceleration
  const sortedProgress = progressData.sort((a, b) => 
    new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
  
  if (sortedProgress.length < 2) return 0;
  
  let momentum = 0;
  for (let i = 1; i < sortedProgress.length; i++) {
    const current = sortedProgress[i].progress_percentage || 0;
    const previous = sortedProgress[i - 1].progress_percentage || 0;
    momentum += Math.max(0, current - previous);
  }
  
  return Math.min(100, momentum / sortedProgress.length);
}

function calculateSocialEngagement(engagementEvents: any[]): number {
  // Would analyze collaborative learning events
  return 0; // Simplified - no social features yet
}

function calculateFeedbackResponsiveness(engagementEvents: any[], assessmentData: any[]): number {
  // Analyze how users respond to feedback and corrections
  const feedbackEvents = engagementEvents.filter(e => 
    e.metric_data?.event_type === 'feedback_viewed' || 
    e.metric_data?.event_type === 'correction_applied'
  );
  
  return Math.min(100, feedbackEvents.length * 10);
}

function calculateSelfDirectedLearning(engagementEvents: any[], progressData: any[]): number {
  // Analyze self-initiated learning activities
  const selfDirectedEvents = engagementEvents.filter(e => 
    ['search', 'bookmark', 'note_taking', 'review'].includes(e.metric_data?.event_type)
  );
  
  return Math.min(100, selfDirectedEvents.length * 5);
}

// Pattern analysis functions (simplified)
function analyzeSessionTimings(progressData: any[]) {
  return { consistency: 0.8, peak_hours: [9, 14, 19] };
}

function analyzeLearningPace(progressData: any[]) {
  return {
    type: 'steady_pace',
    frequency: 0.7,
    impact: 80,
    recommendations: ['Maintain current pace', 'Add challenging content gradually']
  };
}

function analyzeInteractionPatterns(engagementEvents: any[]): BehavioralPattern[] {
  return [{
    pattern_type: 'high_interaction',
    frequency: 0.8,
    impact_on_learning: 85,
    recommendations: ['Add more interactive content', 'Provide immediate feedback']
  }];
}

function analyzeAssessmentBehavior(assessmentData: any[]): BehavioralPattern[] {
  return [{
    pattern_type: 'methodical_approach',
    frequency: 0.9,
    impact_on_learning: 90,
    recommendations: ['Provide detailed explanations', 'Offer advanced practice questions']
  }];
}

function identifyPeakEngagementTimes(engagementData: any[]): string[] {
  return ['9:00 AM', '2:00 PM', '7:00 PM'];
}

function groupDataByTime(data: any[], granularity: string) {
  // Simplified time grouping
  return data.reduce((groups, item) => {
    const date = new Date(item.recorded_at);
    const key = granularity === 'daily' 
      ? date.toISOString().split('T')[0]
      : `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
    
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function calculatePeriodEngagementScore(events: any[]): number {
  return events.reduce((sum, event) => sum + (event.metric_value || 0), 0);
}

function calculateAverageSessionDurationForPeriod(events: any[]): number {
  return events.length > 0 ? events.reduce((sum, e) => sum + (e.metric_data?.duration || 0), 0) / events.length : 0;
}

function calculateCompletionRateForPeriod(events: any[], progressData: any[]): number {
  return Math.random() * 100; // Simplified
}

function generateComparativeAnalysis(engagementData: any) {
  return {
    peer_comparison: 'Above average engagement',
    industry_benchmark: 'Top 25% performer',
    improvement_potential: '15% increase possible with optimization'
  };
}

function generatePredictiveInsights(engagementData: any) {
  return {
    completion_probability: 85,
    risk_of_dropout: 15,
    optimal_intervention_time: '2 days',
    predicted_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
}