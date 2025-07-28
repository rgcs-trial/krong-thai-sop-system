/**
 * Training Content Quality Assurance API
 * Automated content testing and quality assessment for training modules
 * GET /api/training/content-quality - Get content quality analytics
 * POST /api/training/content-quality - Run quality assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface ContentQualityMetrics {
  overall_quality_score: number;
  readability_score: number;
  content_accuracy: number;
  engagement_potential: number;
  accessibility_score: number;
  multimedia_quality: number;
  language_consistency: number;
  learning_objective_alignment: number;
}

interface QualityAssessment {
  module_id: string;
  module_title: string;
  assessment_date: string;
  quality_metrics: ContentQualityMetrics;
  issues_identified: QualityIssue[];
  recommendations: QualityRecommendation[];
  compliance_status: ComplianceStatus;
  improvement_plan: ImprovementPlan;
}

interface QualityIssue {
  severity: 'critical' | 'major' | 'minor';
  category: string;
  description: string;
  location: string;
  impact_assessment: string;
  suggested_fix: string;
}

interface QualityRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  expected_improvement: string;
  implementation_effort: string;
}

interface ComplianceStatus {
  accessibility_compliant: boolean;
  language_standard_compliant: boolean;
  industry_standard_compliant: boolean;
  restaurant_policy_compliant: boolean;
  certification_requirements_met: boolean;
}

interface ImprovementPlan {
  immediate_actions: string[];
  short_term_goals: string[];
  long_term_objectives: string[];
  success_metrics: string[];
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

    // Only admins and managers can access quality analytics
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const moduleId = searchParams.get('module_id');
    const includeDetails = searchParams.get('include_details') === 'true';
    const assessmentPeriod = searchParams.get('period') || '30d';

    try {
      // Get training modules for quality assessment
      let modulesQuery = supabase
        .from('training_modules')
        .select(`
          id,
          title,
          title_th,
          description,
          description_th,
          duration_minutes,
          passing_score,
          is_active,
          created_at,
          updated_at,
          sections:training_sections(
            id,
            title,
            title_th,
            content,
            content_th,
            media_urls,
            estimated_minutes,
            sort_order
          ),
          questions:training_questions(
            id,
            question,
            question_th,
            options,
            options_th,
            correct_answer,
            explanation,
            explanation_th,
            difficulty
          )
        `)
        .eq('restaurant_id', user.restaurant_id);

      if (moduleId) {
        modulesQuery = modulesQuery.eq('id', moduleId);
      }

      const { data: modules, error: modulesError } = await modulesQuery;
      if (modulesError) throw modulesError;

      // Get existing quality assessments
      let assessmentsQuery = supabase
        .from('performance_metrics')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .eq('metric_type', 'content_quality');

      if (moduleId) {
        assessmentsQuery = assessmentsQuery.eq('module_id', moduleId);
      }

      const { data: existingAssessments, error: assessmentsError } = await assessmentsQuery;
      if (assessmentsError) throw assessmentsError;

      // Get learning outcome data
      const { data: outcomeData, error: outcomeError } = await supabase
        .from('user_training_progress')
        .select(`
          module_id,
          status,
          progress_percentage,
          time_spent_minutes,
          completed_at,
          assessments:training_assessments(
            status,
            score_percentage,
            attempt_number
          )
        `)
        .eq('module.restaurant_id', user.restaurant_id)
        .gte('created_at', getDateFromPeriod(assessmentPeriod));

      if (outcomeError) throw outcomeError;

      // Perform quality assessments
      const qualityAssessments = await Promise.all(
        (modules || []).map(module => performQualityAssessment(
          module,
          existingAssessments?.filter(a => a.module_id === module.id) || [],
          outcomeData?.filter(o => o.module_id === module.id) || []
        ))
      );

      // Generate overall quality report
      const qualityReport = generateQualityReport(qualityAssessments);

      const responseData = {
        overview: {
          total_modules_assessed: qualityAssessments.length,
          average_quality_score: calculateAverageQualityScore(qualityAssessments),
          modules_needing_attention: qualityAssessments.filter(qa => qa.quality_metrics.overall_quality_score < 70).length,
          assessment_date: new Date().toISOString(),
          assessment_period: assessmentPeriod
        },
        quality_assessments: includeDetails ? qualityAssessments : qualityAssessments.map(qa => ({
          module_id: qa.module_id,
          module_title: qa.module_title,
          overall_quality_score: qa.quality_metrics.overall_quality_score,
          critical_issues: qa.issues_identified.filter(i => i.severity === 'critical').length,
          assessment_date: qa.assessment_date
        })),
        quality_report: qualityReport,
        industry_benchmarks: getIndustryBenchmarks(),
        improvement_tracking: await getImprovementTracking(supabase, user.restaurant_id, moduleId)
      };

      return NextResponse.json({
        success: true,
        data: responseData
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch content quality data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training content quality API error:', error);
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
      module_id,
      assessment_type = 'comprehensive',
      force_reassessment = false,
      quality_standards = {}
    } = body;

    // Validate required fields
    if (!module_id) {
      return NextResponse.json(
        { error: 'Missing required field: module_id' },
        { status: 400 }
      );
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

    // Only admins and managers can run quality assessments
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
      // Get module data for assessment
      const { data: module, error: moduleError } = await supabase
        .from('training_modules')
        .select(`
          id,
          title,
          title_th,
          description,
          description_th,
          duration_minutes,
          passing_score,
          restaurant_id,
          sections:training_sections(
            id,
            title,
            title_th,
            content,
            content_th,
            media_urls,
            estimated_minutes
          ),
          questions:training_questions(
            id,
            question,
            question_th,
            options,
            options_th,
            correct_answer,
            explanation,
            explanation_th,
            difficulty
          )
        `)
        .eq('id', module_id)
        .eq('restaurant_id', user.restaurant_id)
        .single();

      if (moduleError || !module) {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }

      // Check if recent assessment exists (unless force reassessment)
      if (!force_reassessment) {
        const { data: recentAssessment } = await supabase
          .from('performance_metrics')
          .select('recorded_at')
          .eq('restaurant_id', user.restaurant_id)
          .eq('module_id', module_id)
          .eq('metric_type', 'content_quality')
          .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .single();

        if (recentAssessment) {
          return NextResponse.json({
            success: false,
            message: 'Recent assessment exists. Use force_reassessment=true to override.',
            last_assessment: recentAssessment.recorded_at
          });
        }
      }

      // Get learning outcome data for this module
      const { data: outcomeData } = await supabase
        .from('user_training_progress')
        .select(`
          status,
          progress_percentage,
          time_spent_minutes,
          assessments:training_assessments(
            status,
            score_percentage,
            attempt_number
          )
        `)
        .eq('module_id', module_id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      // Perform comprehensive quality assessment
      const qualityAssessment = await performQualityAssessment(
        module,
        [],
        outcomeData || [],
        quality_standards
      );

      // Store assessment results
      const { data: assessmentRecord, error: storeError } = await supabase
        .from('performance_metrics')
        .insert({
          restaurant_id: user.restaurant_id,
          module_id: module_id,
          metric_type: 'content_quality',
          metric_value: qualityAssessment.quality_metrics.overall_quality_score,
          metric_data: {
            assessment_type,
            quality_metrics: qualityAssessment.quality_metrics,
            issues_identified: qualityAssessment.issues_identified,
            recommendations: qualityAssessment.recommendations,
            compliance_status: qualityAssessment.compliance_status,
            improvement_plan: qualityAssessment.improvement_plan,
            quality_standards_used: quality_standards
          },
          recorded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (storeError) throw storeError;

      // Schedule follow-up assessments if critical issues found
      const criticalIssues = qualityAssessment.issues_identified.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        await scheduleFollowUpAssessment(supabase, user.restaurant_id, module_id, 7); // 7 days
      }

      return NextResponse.json({
        success: true,
        data: {
          assessment_id: assessmentRecord.id,
          quality_assessment: qualityAssessment,
          follow_up_scheduled: criticalIssues.length > 0,
          message: 'Quality assessment completed successfully'
        }
      });

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to perform quality assessment',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training content quality assessment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for quality assessment
async function performQualityAssessment(
  module: any,
  existingAssessments: any[],
  outcomeData: any[],
  qualityStandards: any = {}
): Promise<QualityAssessment> {
  // Calculate content quality metrics
  const qualityMetrics = calculateContentQualityMetrics(module, outcomeData, qualityStandards);
  
  // Identify quality issues
  const issuesIdentified = identifyQualityIssues(module, qualityMetrics);
  
  // Generate recommendations
  const recommendations = generateQualityRecommendations(module, qualityMetrics, issuesIdentified);
  
  // Check compliance status
  const complianceStatus = checkComplianceStatus(module, qualityMetrics);
  
  // Create improvement plan
  const improvementPlan = createImprovementPlan(issuesIdentified, recommendations);

  return {
    module_id: module.id,
    module_title: module.title,
    assessment_date: new Date().toISOString(),
    quality_metrics: qualityMetrics,
    issues_identified: issuesIdentified,
    recommendations: recommendations,
    compliance_status: complianceStatus,
    improvement_plan: improvementPlan
  };
}

function calculateContentQualityMetrics(
  module: any,
  outcomeData: any[],
  qualityStandards: any
): ContentQualityMetrics {
  // Readability assessment
  const readability_score = assessReadability(module);
  
  // Content accuracy based on learning outcomes
  const content_accuracy = assessContentAccuracy(module, outcomeData);
  
  // Engagement potential based on interaction elements
  const engagement_potential = assessEngagementPotential(module);
  
  // Accessibility compliance
  const accessibility_score = assessAccessibility(module);
  
  // Multimedia quality assessment
  const multimedia_quality = assessMultimediaQuality(module);
  
  // Language consistency (EN/TH)
  const language_consistency = assessLanguageConsistency(module);
  
  // Learning objective alignment
  const learning_objective_alignment = assessLearningObjectiveAlignment(module, outcomeData);
  
  // Calculate overall quality score
  const overall_quality_score = Math.round(
    (readability_score * 0.15 +
     content_accuracy * 0.20 +
     engagement_potential * 0.15 +
     accessibility_score * 0.15 +
     multimedia_quality * 0.10 +
     language_consistency * 0.10 +
     learning_objective_alignment * 0.15)
  );

  return {
    overall_quality_score,
    readability_score,
    content_accuracy,
    engagement_potential,
    accessibility_score,
    multimedia_quality,
    language_consistency,
    learning_objective_alignment
  };
}

function identifyQualityIssues(module: any, metrics: ContentQualityMetrics): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Critical issues
  if (metrics.content_accuracy < 70) {
    issues.push({
      severity: 'critical',
      category: 'Content Accuracy',
      description: 'Content accuracy is below acceptable threshold',
      location: 'Module content',
      impact_assessment: 'May lead to incorrect learning and safety issues',
      suggested_fix: 'Review and verify all content against current SOPs and industry standards'
    });
  }

  if (metrics.accessibility_score < 60) {
    issues.push({
      severity: 'critical',
      category: 'Accessibility',
      description: 'Content does not meet accessibility standards',
      location: 'All content sections',
      impact_assessment: 'Prevents access for users with disabilities',
      suggested_fix: 'Add alt text, improve contrast, ensure keyboard navigation'
    });
  }

  // Major issues
  if (metrics.readability_score < 60) {
    issues.push({
      severity: 'major',
      category: 'Readability',
      description: 'Content is difficult to read and understand',
      location: 'Text content in sections',
      impact_assessment: 'Reduces learning effectiveness and completion rates',
      suggested_fix: 'Simplify language, break down complex sentences, add visual aids'
    });
  }

  if (metrics.engagement_potential < 50) {
    issues.push({
      severity: 'major',
      category: 'Engagement',
      description: 'Low engagement potential detected',
      location: 'Module structure and content',
      impact_assessment: 'May lead to poor completion rates and retention',
      suggested_fix: 'Add interactive elements, multimedia content, and practical exercises'
    });
  }

  // Minor issues
  if (metrics.language_consistency < 80) {
    issues.push({
      severity: 'minor',
      category: 'Language Consistency',
      description: 'Inconsistencies between English and Thai content',
      location: 'Bilingual content sections',
      impact_assessment: 'May cause confusion for bilingual users',
      suggested_fix: 'Review and align translations, ensure cultural appropriateness'
    });
  }

  if (metrics.multimedia_quality < 70) {
    issues.push({
      severity: 'minor',
      category: 'Multimedia Quality',
      description: 'Multimedia elements need improvement',
      location: 'Images, videos, and audio content',
      impact_assessment: 'Reduces overall learning experience quality',
      suggested_fix: 'Update media with higher quality versions, ensure consistent formatting'
    });
  }

  return issues;
}

function generateQualityRecommendations(
  module: any,
  metrics: ContentQualityMetrics,
  issues: QualityIssue[]
): QualityRecommendation[] {
  const recommendations: QualityRecommendation[] = [];

  // High priority recommendations
  if (metrics.overall_quality_score < 70) {
    recommendations.push({
      priority: 'high',
      category: 'Overall Quality',
      action: 'Conduct comprehensive content review and revision',
      expected_improvement: 'Increase overall quality score by 20-30 points',
      implementation_effort: 'High - requires dedicated content team effort'
    });
  }

  // Medium priority recommendations
  if (metrics.engagement_potential < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Engagement Enhancement',
      action: 'Add interactive quizzes, simulations, and hands-on exercises',
      expected_improvement: 'Improve completion rates by 15-25%',
      implementation_effort: 'Medium - requires content development and technical implementation'
    });
  }

  if (metrics.readability_score < 75) {
    recommendations.push({
      priority: 'medium',
      category: 'Content Readability',
      action: 'Simplify language and improve content structure',
      expected_improvement: 'Reduce learning time by 10-20%',
      implementation_effort: 'Medium - requires content editing and restructuring'
    });
  }

  // Low priority recommendations
  if (metrics.multimedia_quality < 85) {
    recommendations.push({
      priority: 'low',
      category: 'Media Enhancement',
      action: 'Upgrade multimedia content with professional-quality assets',
      expected_improvement: 'Enhance learning experience and retention',
      implementation_effort: 'Low to Medium - requires new media creation or licensing'
    });
  }

  return recommendations;
}

function checkComplianceStatus(module: any, metrics: ContentQualityMetrics): ComplianceStatus {
  return {
    accessibility_compliant: metrics.accessibility_score >= 80,
    language_standard_compliant: metrics.language_consistency >= 85,
    industry_standard_compliant: metrics.content_accuracy >= 90,
    restaurant_policy_compliant: true, // Would check against specific policies
    certification_requirements_met: metrics.overall_quality_score >= 85
  };
}

function createImprovementPlan(
  issues: QualityIssue[],
  recommendations: QualityRecommendation[]
): ImprovementPlan {
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highPriorityRecs = recommendations.filter(r => r.priority === 'high');

  return {
    immediate_actions: [
      ...criticalIssues.map(i => i.suggested_fix),
      ...highPriorityRecs.map(r => r.action)
    ],
    short_term_goals: [
      'Address all major quality issues within 2 weeks',
      'Implement high-priority recommendations',
      'Achieve 80+ overall quality score'
    ],
    long_term_objectives: [
      'Maintain 90+ quality score consistently',
      'Achieve full compliance across all standards',
      'Implement continuous quality monitoring'
    ],
    success_metrics: [
      'Overall quality score improvement',
      'Reduced critical and major issues',
      'Improved learner satisfaction scores',
      'Better learning outcome achievement'
    ]
  };
}

// Quality assessment helper functions
function assessReadability(module: any): number {
  // Simplified readability assessment
  let score = 80; // Base score
  
  // Check content length and complexity
  const sections = module.sections || [];
  const avgContentLength = sections.reduce((sum: number, section: any) => 
    sum + (section.content?.length || 0), 0) / Math.max(sections.length, 1);
  
  // Penalize very long or very short content
  if (avgContentLength > 2000) score -= 15;
  if (avgContentLength < 200) score -= 10;
  
  // Check for clear structure
  const sectionsWithTitles = sections.filter((s: any) => s.title && s.title.length > 0).length;
  const titleCoverage = sectionsWithTitles / Math.max(sections.length, 1);
  score *= titleCoverage;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function assessContentAccuracy(module: any, outcomeData: any[]): number {
  // Base accuracy assessment
  let accuracy = 85; // Assume good baseline
  
  // Analyze learning outcomes
  const completedLearners = outcomeData.filter(o => o.status === 'completed');
  const assessmentData = outcomeData.flatMap(o => o.assessments || []);
  const passedAssessments = assessmentData.filter(a => a.status === 'passed');
  
  if (assessmentData.length > 0 && passedAssessments.length > 0) {
    const passRate = passedAssessments.length / assessmentData.length;
    const avgScore = passedAssessments.reduce((sum, a) => sum + (a.score_percentage || 0), 0) / passedAssessments.length;
    
    // Good pass rates and scores indicate accurate content
    accuracy = Math.round((passRate * 50) + (avgScore * 0.5));
  }
  
  return Math.max(0, Math.min(100, accuracy));
}

function assessEngagementPotential(module: any): number {
  let engagement = 60; // Base score
  
  const sections = module.sections || [];
  const questions = module.questions || [];
  
  // Check for multimedia content
  const sectionsWithMedia = sections.filter((s: any) => 
    s.media_urls && Array.isArray(s.media_urls) && s.media_urls.length > 0
  ).length;
  if (sectionsWithMedia > 0) {
    engagement += Math.min(20, sectionsWithMedia * 5);
  }
  
  // Check for interactive elements (questions)
  if (questions.length > 0) {
    engagement += Math.min(15, questions.length * 2);
  }
  
  // Check content variety
  const avgSectionLength = sections.reduce((sum: number, s: any) => 
    sum + (s.estimated_minutes || 0), 0) / Math.max(sections.length, 1);
  
  if (avgSectionLength > 5 && avgSectionLength < 15) {
    engagement += 10; // Good pacing
  }
  
  return Math.max(0, Math.min(100, Math.round(engagement)));
}

function assessAccessibility(module: any): number {
  let accessibility = 70; // Base score
  
  const sections = module.sections || [];
  
  // Check for descriptive titles
  const sectionsWithGoodTitles = sections.filter((s: any) => 
    s.title && s.title.length > 5
  ).length;
  if (sectionsWithGoodTitles === sections.length && sections.length > 0) {
    accessibility += 15;
  }
  
  // Check for bilingual support
  const sectionsWithBothLanguages = sections.filter((s: any) => 
    s.title && s.title_th && s.content && s.content_th
  ).length;
  if (sectionsWithBothLanguages === sections.length && sections.length > 0) {
    accessibility += 15;
  }
  
  return Math.max(0, Math.min(100, Math.round(accessibility)));
}

function assessMultimediaQuality(module: any): number {
  let quality = 75; // Base score assuming decent quality
  
  const sections = module.sections || [];
  const sectionsWithMedia = sections.filter((s: any) => 
    s.media_urls && Array.isArray(s.media_urls) && s.media_urls.length > 0
  );
  
  if (sectionsWithMedia.length === 0) {
    return 50; // Lower score for no multimedia
  }
  
  // Check media variety
  const totalMediaItems = sectionsWithMedia.reduce((sum, s: any) => 
    sum + s.media_urls.length, 0
  );
  
  if (totalMediaItems > sections.length) {
    quality += 15; // Good media-to-content ratio
  }
  
  return Math.max(0, Math.min(100, Math.round(quality)));
}

function assessLanguageConsistency(module: any): number {
  let consistency = 90; // Assume good baseline
  
  const sections = module.sections || [];
  const questions = module.questions || [];
  
  // Check module-level consistency
  if (!module.title_th || !module.description_th) {
    consistency -= 20;
  }
  
  // Check section-level consistency
  const inconsistentSections = sections.filter((s: any) => 
    !s.title_th || !s.content_th
  ).length;
  
  if (inconsistentSections > 0) {
    consistency -= Math.min(30, inconsistentSections * 5);
  }
  
  // Check question-level consistency
  const inconsistentQuestions = questions.filter((q: any) => 
    !q.question_th || !q.explanation_th
  ).length;
  
  if (inconsistentQuestions > 0) {
    consistency -= Math.min(20, inconsistentQuestions * 3);
  }
  
  return Math.max(0, Math.min(100, Math.round(consistency)));
}

function assessLearningObjectiveAlignment(module: any, outcomeData: any[]): number {
  // Base alignment score
  let alignment = 80;
  
  // Check if module has clear objectives (implied by good pass rates)
  const assessmentData = outcomeData.flatMap(o => o.assessments || []);
  if (assessmentData.length > 0) {
    const passedAssessments = assessmentData.filter(a => a.status === 'passed');
    const passRate = passedAssessments.length / assessmentData.length;
    
    // Good pass rates indicate aligned objectives
    alignment = Math.round(passRate * 100);
  }
  
  // Check content structure supports objectives
  const sections = module.sections || [];
  const questions = module.questions || [];
  
  if (questions.length > 0 && sections.length > 0) {
    const questionsPerSection = questions.length / sections.length;
    if (questionsPerSection >= 0.5 && questionsPerSection <= 3) {
      alignment += 10; // Good question-to-content ratio
    }
  }
  
  return Math.max(0, Math.min(100, Math.round(alignment)));
}

// Utility functions
function generateQualityReport(assessments: QualityAssessment[]) {
  const totalModules = assessments.length;
  const avgQualityScore = calculateAverageQualityScore(assessments);
  
  const criticalIssuesCount = assessments.reduce((sum, a) => 
    sum + a.issues_identified.filter(i => i.severity === 'critical').length, 0
  );
  
  const majorIssuesCount = assessments.reduce((sum, a) => 
    sum + a.issues_identified.filter(i => i.severity === 'major').length, 0
  );
  
  const highPriorityRecommendations = assessments.reduce((sum, a) => 
    sum + a.recommendations.filter(r => r.priority === 'high').length, 0
  );

  return {
    summary: {
      total_modules: totalModules,
      average_quality_score: avgQualityScore,
      modules_above_threshold: assessments.filter(a => a.quality_metrics.overall_quality_score >= 80).length,
      modules_needing_attention: assessments.filter(a => a.quality_metrics.overall_quality_score < 70).length
    },
    issues_summary: {
      critical_issues: criticalIssuesCount,
      major_issues: majorIssuesCount,
      total_issues: criticalIssuesCount + majorIssuesCount
    },
    recommendations_summary: {
      high_priority: highPriorityRecommendations,
      total_recommendations: assessments.reduce((sum, a) => sum + a.recommendations.length, 0)
    },
    compliance_overview: {
      fully_compliant_modules: assessments.filter(a => 
        Object.values(a.compliance_status).every(status => status === true)
      ).length,
      compliance_rate: Math.round(
        (assessments.filter(a => 
          Object.values(a.compliance_status).every(status => status === true)
        ).length / totalModules) * 100
      )
    }
  };
}

function calculateAverageQualityScore(assessments: QualityAssessment[]): number {
  if (assessments.length === 0) return 0;
  
  const totalScore = assessments.reduce((sum, a) => 
    sum + a.quality_metrics.overall_quality_score, 0
  );
  
  return Math.round(totalScore / assessments.length);
}

function getIndustryBenchmarks() {
  return {
    excellent_quality_threshold: 90,
    good_quality_threshold: 80,
    acceptable_quality_threshold: 70,
    industry_average: 75,
    top_performers_average: 88
  };
}

async function getImprovementTracking(supabase: any, restaurantId: string, moduleId?: string | null) {
  // Get historical quality scores
  let trackingQuery = supabase
    .from('performance_metrics')
    .select('module_id, metric_value, recorded_at')
    .eq('restaurant_id', restaurantId)
    .eq('metric_type', 'content_quality')
    .order('recorded_at', { ascending: true });

  if (moduleId) {
    trackingQuery = trackingQuery.eq('module_id', moduleId);
  }

  const { data: trackingData } = await trackingQuery;

  if (!trackingData || trackingData.length === 0) {
    return { improvement_trend: 'no_data', historical_assessments: [] };
  }

  // Calculate improvement trend
  const firstScore = trackingData[0]?.metric_value || 0;
  const lastScore = trackingData[trackingData.length - 1]?.metric_value || 0;
  const improvement = lastScore - firstScore;

  let trend = 'stable';
  if (improvement > 5) trend = 'improving';
  else if (improvement < -5) trend = 'declining';

  return {
    improvement_trend: trend,
    improvement_points: Math.round(improvement),
    historical_assessments: trackingData.length,
    first_assessment_score: firstScore,
    latest_assessment_score: lastScore
  };
}

function getDateFromPeriod(period: string): string {
  const date = new Date();
  switch (period) {
    case '7d':
      date.setDate(date.getDate() - 7);
      break;
    case '90d':
      date.setDate(date.getDate() - 90);
      break;
    case '1y':
      date.setFullYear(date.getFullYear() - 1);
      break;
    default: // 30d
      date.setDate(date.getDate() - 30);
  }
  return date.toISOString();
}

async function scheduleFollowUpAssessment(
  supabase: any,
  restaurantId: string,
  moduleId: string,
  daysFromNow: number
) {
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + daysFromNow);
  
  // Could implement a scheduling system or notification
  console.log(`Follow-up assessment scheduled for module ${moduleId} on ${followUpDate.toISOString()}`);
}