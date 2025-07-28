/**
 * SOP Compliance Monitoring API Route
 * Handles automated compliance checking, violation detection, and alert generation
 * 
 * GET    /api/sop/compliance-monitor           - Get compliance status and violations
 * POST   /api/sop/compliance-monitor           - Run compliance check manually
 * POST   /api/sop/compliance-monitor/alerts    - Configure compliance alerts
 * GET    /api/sop/compliance-monitor/reports   - Generate compliance reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface ComplianceViolation {
  id: string;
  violation_type: 'overdue' | 'incomplete' | 'skipped' | 'quality_issue' | 'frequency_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sop_id: string;
  user_id: string;
  assignment_id?: string;
  description: string;
  description_fr: string;
  detected_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  auto_resolved: boolean;
  metadata: {
    days_overdue?: number;
    completion_percentage?: number;
    expected_frequency?: string;
    last_completed?: string;
    quality_score?: number;
  };
}

interface ComplianceAlert {
  id?: string;
  alert_type: 'violation' | 'trend' | 'threshold' | 'escalation';
  trigger_conditions: {
    violation_types: string[];
    severity_levels: string[];
    threshold_count?: number;
    time_window_hours?: number;
    role_filters?: string[];
    sop_category_filters?: string[];
  };
  notification_config: {
    notify_users: string[];
    notify_roles: string[];
    email_enabled: boolean;
    sms_enabled: boolean;
    dashboard_alert: boolean;
    escalation_delay_minutes?: number;
  };
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface ComplianceReport {
  report_id: string;
  generated_at: string;
  time_period: {
    start_date: string;
    end_date: string;
  };
  overall_compliance_score: number;
  total_sops_tracked: number;
  total_violations: number;
  violations_by_type: Record<string, number>;
  violations_by_severity: Record<string, number>;
  top_violating_sops: Array<{
    sop_id: string;
    title: string;
    violation_count: number;
    compliance_score: number;
  }>;
  user_performance: Array<{
    user_id: string;
    full_name: string;
    role: string;
    compliance_score: number;
    violation_count: number;
  }>;
  trends: {
    improvement_percentage: number;
    recurring_issues: string[];
    recommendations: string[];
  };
}

/**
 * SOP Compliance Monitoring Engine
 * Monitors SOP compliance, detects violations, and generates alerts
 */
class SOPComplianceMonitor {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Run comprehensive compliance check
   */
  async runComplianceCheck(): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Check for overdue assignments
    const overdueViolations = await this.checkOverdueAssignments();
    violations.push(...overdueViolations);

    // Check for incomplete assignments
    const incompleteViolations = await this.checkIncompleteAssignments();
    violations.push(...incompleteViolations);

    // Check for skipped SOPs
    const skippedViolations = await this.checkSkippedSOPs();
    violations.push(...skippedViolations);

    // Check SOP frequency violations
    const frequencyViolations = await this.checkFrequencyViolations();
    violations.push(...frequencyViolations);

    // Check quality issues
    const qualityViolations = await this.checkQualityIssues();
    violations.push(...qualityViolations);

    // Store violations in database
    await this.storeViolations(violations);

    // Generate alerts for new violations
    await this.processComplianceAlerts(violations);

    return violations;
  }

  /**
   * Check for overdue SOP assignments
   */
  private async checkOverdueAssignments(): Promise<ComplianceViolation[]> {
    const { data: overdueAssignments } = await supabaseAdmin
      .from('sop_assignments')
      .select(`
        id, sop_id, assigned_to, due_date, status,
        sop_documents(id, title, title_fr, category_id),
        auth_users(id, full_name, role)
      `)
      .eq('restaurant_id', this.restaurantId)
      .lt('due_date', new Date().toISOString())
      .neq('status', 'completed')
      .neq('status', 'cancelled');

    if (!overdueAssignments) return [];

    return overdueAssignments.map(assignment => {
      const daysOverdue = Math.floor(
        (Date.now() - new Date(assignment.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      let severity: ComplianceViolation['severity'] = 'low';
      if (daysOverdue > 7) severity = 'critical';
      else if (daysOverdue > 3) severity = 'high';
      else if (daysOverdue > 1) severity = 'medium';

      return {
        id: `overdue_${assignment.id}`,
        violation_type: 'overdue',
        severity,
        sop_id: assignment.sop_id,
        user_id: assignment.assigned_to,
        assignment_id: assignment.id,
        description: `SOP "${assignment.sop_documents.title}" is ${daysOverdue} days overdue`,
        description_fr: `SOP "${assignment.sop_documents.title_fr}" est en retard de ${daysOverdue} jours`,
        detected_at: new Date().toISOString(),
        auto_resolved: false,
        metadata: {
          days_overdue: daysOverdue
        }
      };
    });
  }

  /**
   * Check for incomplete SOP assignments
   */
  private async checkIncompleteAssignments(): Promise<ComplianceViolation[]> {
    const { data: incompleteAssignments } = await supabaseAdmin
      .from('sop_assignments')
      .select(`
        id, sop_id, assigned_to, created_at, status,
        sop_documents(id, title, title_fr, estimated_read_time),
        auth_users(id, full_name, role),
        user_progress(progress_percentage, time_spent, last_accessed)
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('status', 'in_progress')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Older than 24 hours

    if (!incompleteAssignments) return [];

    return incompleteAssignments
      .filter(assignment => {
        const progress = assignment.user_progress?.[0];
        return !progress || progress.progress_percentage < 100;
      })
      .map(assignment => {
        const progress = assignment.user_progress?.[0];
        const completionPercentage = progress?.progress_percentage || 0;
        const hoursStagnant = Math.floor(
          (Date.now() - new Date(progress?.last_accessed || assignment.created_at).getTime()) / (1000 * 60 * 60)
        );

        let severity: ComplianceViolation['severity'] = 'low';
        if (completionPercentage < 25 && hoursStagnant > 48) severity = 'high';
        else if (completionPercentage < 50 && hoursStagnant > 24) severity = 'medium';

        return {
          id: `incomplete_${assignment.id}`,
          violation_type: 'incomplete',
          severity,
          sop_id: assignment.sop_id,
          user_id: assignment.assigned_to,
          assignment_id: assignment.id,
          description: `SOP "${assignment.sop_documents.title}" is ${completionPercentage}% complete and stagnant for ${hoursStagnant} hours`,
          description_fr: `SOP "${assignment.sop_documents.title_fr}" est complété à ${completionPercentage}% et stagnant depuis ${hoursStagnant} heures`,
          detected_at: new Date().toISOString(),
          auto_resolved: false,
          metadata: {
            completion_percentage: completionPercentage
          }
        };
      });
  }

  /**
   * Check for skipped SOPs (assigned but never started)
   */
  private async checkSkippedSOPs(): Promise<ComplianceViolation[]> {
    const { data: skippedAssignments } = await supabaseAdmin
      .from('sop_assignments')
      .select(`
        id, sop_id, assigned_to, created_at,
        sop_documents(id, title, title_fr),
        auth_users(id, full_name, role)
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()) // Older than 72 hours
      .is('user_progress.progress_percentage', null);

    if (!skippedAssignments) return [];

    return skippedAssignments.map(assignment => {
      const hoursSkipped = Math.floor(
        (Date.now() - new Date(assignment.created_at).getTime()) / (1000 * 60 * 60)
      );

      let severity: ComplianceViolation['severity'] = 'medium';
      if (hoursSkipped > 168) severity = 'high'; // More than a week

      return {
        id: `skipped_${assignment.id}`,
        violation_type: 'skipped',
        severity,
        sop_id: assignment.sop_id,
        user_id: assignment.assigned_to,
        assignment_id: assignment.id,
        description: `SOP "${assignment.sop_documents.title}" has been skipped for ${hoursSkipped} hours`,
        description_fr: `SOP "${assignment.sop_documents.title_fr}" est ignoré depuis ${hoursSkipped} heures`,
        detected_at: new Date().toISOString(),
        auto_resolved: false,
        metadata: {}
      };
    });
  }

  /**
   * Check for SOP frequency violations (not following required schedules)
   */
  private async checkFrequencyViolations(): Promise<ComplianceViolation[]> {
    const { data: scheduledSOPs } = await supabaseAdmin
      .from('sop_schedules')
      .select(`
        id, sop_id, schedule_type, schedule_config, next_due_date,
        sop_documents(id, title, title_fr),
        sop_assignments(created_at, status)
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .lt('next_due_date', new Date().toISOString());

    if (!scheduledSOPs) return [];

    const violations: ComplianceViolation[] = [];

    for (const schedule of scheduledSOPs) {
      const lastCompletion = schedule.sop_assignments
        ?.filter((a: any) => a.status === 'completed')
        ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.[0];

      if (!lastCompletion) {
        const daysMissed = Math.floor(
          (Date.now() - new Date(schedule.next_due_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        let severity: ComplianceViolation['severity'] = 'medium';
        if (daysMissed > 7) severity = 'high';
        if (daysMissed > 14) severity = 'critical';

        violations.push({
          id: `frequency_${schedule.id}`,
          violation_type: 'frequency_violation',
          severity,
          sop_id: schedule.sop_id,
          user_id: this.context.userId, // System violation
          description: `Scheduled SOP "${schedule.sop_documents.title}" missed ${daysMissed} days`,
          description_fr: `SOP programmé "${schedule.sop_documents.title_fr}" manqué depuis ${daysMissed} jours`,
          detected_at: new Date().toISOString(),
          auto_resolved: false,
          metadata: {
            expected_frequency: schedule.schedule_type,
            last_completed: lastCompletion?.created_at
          }
        });
      }
    }

    return violations;
  }

  /**
   * Check for quality issues based on user feedback and completion patterns
   */
  private async checkQualityIssues(): Promise<ComplianceViolation[]> {
    // Check for SOPs with low completion rates or poor feedback
    const { data: qualityIssues } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        id, title, title_fr,
        user_progress(progress_percentage, time_spent, created_at),
        sop_feedback(rating, feedback_text, created_at)
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    if (!qualityIssues) return [];

    const violations: ComplianceViolation[] = [];

    for (const sop of qualityIssues) {
      // Calculate completion rate
      const progressRecords = sop.user_progress || [];
      const completedCount = progressRecords.filter((p: any) => p.progress_percentage >= 100).length;
      const completionRate = progressRecords.length > 0 ? completedCount / progressRecords.length : 1;

      // Calculate average rating
      const feedbacks = sop.sop_feedback || [];
      const averageRating = feedbacks.length > 0 
        ? feedbacks.reduce((sum: number, f: any) => sum + f.rating, 0) / feedbacks.length 
        : 5;

      // Check for quality issues
      if (completionRate < 0.7 || averageRating < 3.5) {
        let severity: ComplianceViolation['severity'] = 'low';
        if (completionRate < 0.5 || averageRating < 2.5) severity = 'medium';
        if (completionRate < 0.3 || averageRating < 2.0) severity = 'high';

        violations.push({
          id: `quality_${sop.id}`,
          violation_type: 'quality_issue',
          severity,
          sop_id: sop.id,
          user_id: this.context.userId, // System violation
          description: `SOP "${sop.title}" has quality issues (${Math.round(completionRate * 100)}% completion, ${averageRating.toFixed(1)} rating)`,
          description_fr: `SOP "${sop.title_fr}" a des problèmes de qualité (${Math.round(completionRate * 100)}% completion, ${averageRating.toFixed(1)} évaluation)`,
          detected_at: new Date().toISOString(),
          auto_resolved: false,
          metadata: {
            completion_percentage: Math.round(completionRate * 100),
            quality_score: Math.round(averageRating * 10) / 10
          }
        });
      }
    }

    return violations;
  }

  /**
   * Store violations in database
   */
  private async storeViolations(violations: ComplianceViolation[]): Promise<void> {
    if (violations.length === 0) return;

    const violationData = violations.map(violation => ({
      restaurant_id: this.restaurantId,
      violation_type: violation.violation_type,
      severity: violation.severity,
      sop_id: violation.sop_id,
      user_id: violation.user_id,
      assignment_id: violation.assignment_id,
      description: violation.description,
      description_fr: violation.description_fr,
      detected_at: violation.detected_at,
      auto_resolved: violation.auto_resolved,
      metadata: violation.metadata
    }));

    // Insert new violations (avoid duplicates)
    await supabaseAdmin
      .from('compliance_violations')
      .upsert(violationData, {
        onConflict: 'restaurant_id,violation_type,sop_id,user_id',
        ignoreDuplicates: false
      });
  }

  /**
   * Process compliance alerts for new violations
   */
  private async processComplianceAlerts(violations: ComplianceViolation[]): Promise<void> {
    if (violations.length === 0) return;

    // Get active alert configurations
    const { data: alertConfigs } = await supabaseAdmin
      .from('compliance_alerts')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    if (!alertConfigs) return;

    for (const config of alertConfigs) {
      const matchingViolations = this.filterViolationsForAlert(violations, config);
      
      if (matchingViolations.length > 0) {
        await this.sendComplianceAlert(config, matchingViolations);
      }
    }
  }

  /**
   * Filter violations that match alert configuration
   */
  private filterViolationsForAlert(violations: ComplianceViolation[], config: ComplianceAlert): ComplianceViolation[] {
    return violations.filter(violation => {
      const conditions = config.trigger_conditions;
      
      // Check violation type
      if (conditions.violation_types.length > 0 && 
          !conditions.violation_types.includes(violation.violation_type)) {
        return false;
      }
      
      // Check severity
      if (conditions.severity_levels.length > 0 && 
          !conditions.severity_levels.includes(violation.severity)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Send compliance alert notification
   */
  private async sendComplianceAlert(config: ComplianceAlert, violations: ComplianceViolation[]): Promise<void> {
    const notificationData = [];

    // Notify specific users
    for (const userId of config.notification_config.notify_users) {
      notificationData.push({
        restaurant_id: this.restaurantId,
        user_id: userId,
        notification_type: 'compliance_alert',
        title: 'Compliance Alert',
        title_fr: 'Alerte de Conformité',
        message: `${violations.length} compliance violations detected`,
        message_fr: `${violations.length} violations de conformité détectées`,
        is_read: false,
        created_at: new Date().toISOString(),
        metadata: {
          alert_id: config.id,
          violation_count: violations.length,
          severity_breakdown: this.getSeverityBreakdown(violations)
        }
      });
    }

    // Notify users by role
    if (config.notification_config.notify_roles.length > 0) {
      const { data: roleUsers } = await supabaseAdmin
        .from('auth_users')
        .select('id')
        .eq('restaurant_id', this.restaurantId)
        .in('role', config.notification_config.notify_roles)
        .eq('is_active', true);

      if (roleUsers) {
        for (const user of roleUsers) {
          notificationData.push({
            restaurant_id: this.restaurantId,
            user_id: user.id,
            notification_type: 'compliance_alert',
            title: 'Compliance Alert',
            title_fr: 'Alerte de Conformité',
            message: `${violations.length} compliance violations detected`,
            message_fr: `${violations.length} violations de conformité détectées`,
            is_read: false,
            created_at: new Date().toISOString(),
            metadata: {
              alert_id: config.id,
              violation_count: violations.length,
              severity_breakdown: this.getSeverityBreakdown(violations)
            }
          });
        }
      }
    }

    if (notificationData.length > 0) {
      await supabaseAdmin
        .from('sop_notifications')
        .insert(notificationData);
    }
  }

  /**
   * Get severity breakdown for violations
   */
  private getSeverityBreakdown(violations: ComplianceViolation[]): Record<string, number> {
    return violations.reduce((breakdown, violation) => {
      breakdown[violation.severity] = (breakdown[violation.severity] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: string, endDate: string): Promise<ComplianceReport> {
    // Get violations in time period
    const { data: violations } = await supabaseAdmin
      .from('compliance_violations')
      .select(`
        *,
        sop_documents(id, title, title_fr, category_id),
        auth_users(id, full_name, role)
      `)
      .eq('restaurant_id', this.restaurantId)
      .gte('detected_at', startDate)
      .lte('detected_at', endDate);

    // Get all SOPs for compliance tracking
    const { data: allSOPs } = await supabaseAdmin
      .from('sop_documents')
      .select('id, title')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    const totalSOPs = allSOPs?.length || 0;
    const totalViolations = violations?.length || 0;

    // Calculate violations by type and severity
    const violationsByType = violations?.reduce((acc, v) => {
      acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const violationsBySeverity = violations?.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate overall compliance score (0-100)
    const maxPossibleViolations = totalSOPs * 30; // Assuming 30 days max
    const complianceScore = Math.max(0, Math.min(100, 
      Math.round(((maxPossibleViolations - totalViolations) / maxPossibleViolations) * 100)
    ));

    // Top violating SOPs
    const sopViolations = violations?.reduce((acc, v) => {
      const sopId = v.sop_id;
      if (!acc[sopId]) {
        acc[sopId] = {
          sop_id: sopId,
          title: v.sop_documents?.title || 'Unknown',
          violation_count: 0
        };
      }
      acc[sopId].violation_count++;
      return acc;
    }, {} as Record<string, any>) || {};

    const topViolatingSops = Object.values(sopViolations)
      .sort((a: any, b: any) => b.violation_count - a.violation_count)
      .slice(0, 10)
      .map((sop: any) => ({
        ...sop,
        compliance_score: Math.max(0, 100 - (sop.violation_count * 10))
      }));

    // User performance
    const userViolations = violations?.reduce((acc, v) => {
      const userId = v.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          full_name: v.auth_users?.full_name || 'Unknown',
          role: v.auth_users?.role || 'unknown',
          violation_count: 0
        };
      }
      acc[userId].violation_count++;
      return acc;
    }, {} as Record<string, any>) || {};

    const userPerformance = Object.values(userViolations)
      .map((user: any) => ({
        ...user,
        compliance_score: Math.max(0, 100 - (user.violation_count * 5))
      }))
      .sort((a: any, b: any) => b.compliance_score - a.compliance_score);

    return {
      report_id: `compliance_${Date.now()}`,
      generated_at: new Date().toISOString(),
      time_period: { start_date: startDate, end_date: endDate },
      overall_compliance_score: complianceScore,
      total_sops_tracked: totalSOPs,
      total_violations: totalViolations,
      violations_by_type: violationsByType,
      violations_by_severity: violationsBySeverity,
      top_violating_sops: topViolatingSops,
      user_performance: userPerformance,
      trends: {
        improvement_percentage: 0, // Would need historical data
        recurring_issues: Object.keys(violationsByType).slice(0, 3),
        recommendations: this.generateRecommendations(violationsByType, violationsBySeverity)
      }
    };
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(
    violationsByType: Record<string, number>, 
    violationsBySeverity: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (violationsByType.overdue && violationsByType.overdue > 5) {
      recommendations.push('Consider adjusting SOP assignment deadlines or providing additional training');
    }

    if (violationsByType.quality_issue && violationsByType.quality_issue > 3) {
      recommendations.push('Review and update SOPs with quality issues based on user feedback');
    }

    if (violationsBySeverity.critical && violationsBySeverity.critical > 0) {
      recommendations.push('Implement immediate escalation procedures for critical violations');
    }

    if (violationsByType.frequency_violation && violationsByType.frequency_violation > 2) {
      recommendations.push('Review SOP scheduling to ensure realistic frequency requirements');
    }

    return recommendations;
  }
}

/**
 * GET /api/sop/compliance-monitor - Get compliance status and violations
 */
async function handleGetComplianceStatus(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const violationType = searchParams.get('type');
    const severity = searchParams.get('severity');
    const userId = searchParams.get('user_id');
    const sopId = searchParams.get('sop_id');

    // Validate pagination
    const paginationValidation = validatePagination({ page, limit });
    if (!paginationValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters',
        details: paginationValidation.errors,
      } as APIResponse, { status: 400 });
    }

    // Build query for violations
    let query = supabaseAdmin
      .from('compliance_violations')
      .select(`
        *,
        sop_documents(id, title, title_fr, category_id),
        auth_users(id, full_name, role, email),
        sop_assignments(id, status, due_date)
      `, { count: 'exact' })
      .eq('restaurant_id', context.restaurantId)
      .is('resolved_at', null); // Only unresolved violations

    if (violationType) {
      query = query.eq('violation_type', violationType);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (sopId) {
      query = query.eq('sop_id', sopId);
    }

    query = query
      .order('severity', { ascending: false })
      .order('detected_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: violations, error, count } = await query;

    if (error) {
      console.error('Error fetching compliance violations:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch compliance status',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Get compliance summary
    const { data: summary } = await supabaseAdmin
      .from('compliance_violations')
      .select('violation_type, severity')
      .eq('restaurant_id', context.restaurantId)
      .is('resolved_at', null);

    const violationSummary = {
      total: summary?.length || 0,
      by_type: summary?.reduce((acc, v) => {
        acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      by_severity: summary?.reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };

    const totalPages = Math.ceil((count || 0) / limit);

    const response = {
      success: true,
      data: {
        violations: violations || [],
        summary: violationSummary
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/compliance-monitor:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/compliance-monitor - Run compliance check manually
 */
async function handleRunComplianceCheck(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { force_check = false, notify_alerts = true } = sanitizeInput(body);

    const monitor = new SOPComplianceMonitor(context);
    const violations = await monitor.runComplianceCheck();

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'compliance_check',
      null,
      null,
      { 
        violations_found: violations.length,
        force_check,
        violation_types: [...new Set(violations.map(v => v.violation_type))]
      },
      request
    );

    const response: APIResponse<ComplianceViolation[]> = {
      success: true,
      data: violations,
      message: `Compliance check completed. Found ${violations.length} violations.`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/compliance-monitor:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'COMPLIANCE_CHECK_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Route handlers with authentication
export const GET = withAuth(handleGetComplianceStatus, PERMISSIONS.SOP.READ, {
  maxRequests: 200,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleRunComplianceCheck, PERMISSIONS.SOP.CREATE, {
  maxRequests: 20,
  windowMs: 60000, // 1 minute
});

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}