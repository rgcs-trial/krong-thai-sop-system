/**
 * SOP Intelligent Assignment Optimization API Route
 * Optimally assigns SOPs to staff based on skills, availability, workload, and performance
 * 
 * GET    /api/sop/smart-assign           - Get optimal assignment recommendations
 * POST   /api/sop/smart-assign           - Create optimized assignments
 * PUT    /api/sop/smart-assign/optimize  - Re-optimize existing assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface AssignmentRequest {
  sop_ids: string[];
  target_completion_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignment_criteria?: {
    skill_weight: number;        // 0-1: How much to weight skill matching
    availability_weight: number; // 0-1: How much to weight staff availability
    workload_weight: number;     // 0-1: How much to weight current workload
    performance_weight: number;  // 0-1: How much to weight historical performance
    fairness_weight: number;     // 0-1: How much to weight workload distribution fairness
  };
  constraints?: {
    max_assignments_per_person?: number;
    required_roles?: string[];
    exclude_users?: string[];
    must_include_users?: string[];
  };
}

interface OptimalAssignment {
  sop_id: string;
  assigned_to: string;
  assignment_score: number;
  reasoning: {
    skill_match_score: number;
    availability_score: number;
    workload_score: number;
    performance_score: number;
    overall_confidence: number;
    key_factors: string[];
  };
  estimated_completion_time: number;
  recommended_due_date: string;
  alternative_assignees?: {
    user_id: string;
    score: number;
    reason: string;
  }[];
}

interface AssignmentOptimization {
  assignments: OptimalAssignment[];
  optimization_metrics: {
    total_score: number;
    skill_utilization: number;
    workload_balance: number;
    expected_completion_rate: number;
    fairness_index: number;
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Intelligent SOP Assignment Engine
 * Uses optimization algorithms to assign SOPs optimally to staff
 */
class SOPAssignmentOptimizer {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Generate optimal SOP assignments
   */
  async optimizeAssignments(request: AssignmentRequest): Promise<AssignmentOptimization> {
    // Get available staff and their profiles
    const staff = await this.getAvailableStaff(request.constraints);
    
    if (staff.length === 0) {
      throw new Error('No available staff found for assignment');
    }

    // Get SOPs to assign
    const sops = await this.getSOPsForAssignment(request.sop_ids);
    
    if (sops.length === 0) {
      throw new Error('No valid SOPs found for assignment');
    }

    // Calculate assignment scores for all SOP-staff combinations
    const assignmentMatrix = await this.calculateAssignmentMatrix(sops, staff, request);

    // Apply optimization algorithm to find optimal assignments
    const optimizedAssignments = this.optimizeAssignmentMatrix(assignmentMatrix, request);

    // Calculate optimization metrics
    const metrics = this.calculateOptimizationMetrics(optimizedAssignments, staff);

    // Generate recommendations and warnings
    const recommendations = this.generateRecommendations(optimizedAssignments, metrics);
    const warnings = this.generateWarnings(optimizedAssignments, staff, sops);

    return {
      assignments: optimizedAssignments,
      optimization_metrics: metrics,
      recommendations,
      warnings
    };
  }

  /**
   * Get available staff with their skills and current workload
   */
  private async getAvailableStaff(constraints?: AssignmentRequest['constraints']) {
    let query = supabaseAdmin
      .from('auth_users')
      .select(`
        id, full_name, email, role, is_active,
        skill_profiles:staff_skill_profiles(*),
        current_assignments:sop_assignments!assigned_to(
          id, sop_id, due_date, status, priority,
          sop_document:sop_documents!inner(estimated_read_time)
        ),
        performance_history:user_progress(
          progress_percentage, time_spent, last_accessed,
          sop_document:sop_documents!inner(difficulty_level)
        )
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    if (constraints?.required_roles && constraints.required_roles.length > 0) {
      query = query.in('role', constraints.required_roles);
    }

    if (constraints?.exclude_users && constraints.exclude_users.length > 0) {
      query = query.not('id', 'in', `(${constraints.exclude_users.join(',')})`);
    }

    const { data: staff } = await query;
    return staff || [];
  }

  /**
   * Get SOPs that need to be assigned
   */
  private async getSOPsForAssignment(sopIds: string[]) {
    const { data: sops } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        id, title, title_fr, difficulty_level, estimated_read_time, tags,
        category:sop_categories!inner(id, name, name_fr),
        completion_history:user_progress(
          progress_percentage, time_spent, user_id,
          user:auth_users!inner(role)
        )
      `)
      .in('id', sopIds)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    return sops || [];
  }

  /**
   * Calculate assignment scores for all SOP-staff combinations
   */
  private async calculateAssignmentMatrix(
    sops: any[],
    staff: any[],
    request: AssignmentRequest
  ): Promise<Map<string, Map<string, OptimalAssignment>>> {
    const matrix = new Map<string, Map<string, OptimalAssignment>>();
    const criteria = request.assignment_criteria || this.getDefaultCriteria();

    for (const sop of sops) {
      const sopAssignments = new Map<string, OptimalAssignment>();

      for (const staffMember of staff) {
        const assignment = await this.calculateSingleAssignment(
          sop,
          staffMember,
          criteria,
          request.priority || 'medium'
        );

        sopAssignments.set(staffMember.id, assignment);
      }

      matrix.set(sop.id, sopAssignments);
    }

    return matrix;
  }

  /**
   * Calculate assignment score for a single SOP-staff combination
   */
  private async calculateSingleAssignment(
    sop: any,
    staffMember: any,
    criteria: AssignmentRequest['assignment_criteria'],
    priority: string
  ): Promise<OptimalAssignment> {
    // Calculate individual scores
    const skillScore = this.calculateSkillMatchScore(sop, staffMember);
    const availabilityScore = this.calculateAvailabilityScore(staffMember);
    const workloadScore = this.calculateWorkloadScore(staffMember);
    const performanceScore = this.calculatePerformanceScore(sop, staffMember);

    // Calculate weighted overall score
    const overallScore = 
      (skillScore * (criteria?.skill_weight || 0.3)) +
      (availabilityScore * (criteria?.availability_weight || 0.25)) +
      (workloadScore * (criteria?.workload_weight || 0.2)) +
      (performanceScore * (criteria?.performance_weight || 0.25));

    // Determine key factors
    const keyFactors = this.identifyKeyFactors({
      skill: skillScore,
      availability: availabilityScore,
      workload: workloadScore,
      performance: performanceScore
    });

    // Estimate completion time
    const estimatedTime = this.estimateCompletionTime(sop, staffMember);

    // Calculate recommended due date
    const recommendedDueDate = this.calculateRecommendedDueDate(estimatedTime, priority);

    return {
      sop_id: sop.id,
      assigned_to: staffMember.id,
      assignment_score: Math.round(overallScore * 1000) / 1000,
      reasoning: {
        skill_match_score: Math.round(skillScore * 1000) / 1000,
        availability_score: Math.round(availabilityScore * 1000) / 1000,
        workload_score: Math.round(workloadScore * 1000) / 1000,
        performance_score: Math.round(performanceScore * 1000) / 1000,
        overall_confidence: Math.min(0.95, overallScore),
        key_factors: keyFactors
      },
      estimated_completion_time: Math.round(estimatedTime),
      recommended_due_date: recommendedDueDate
    };
  }

  /**
   * Calculate skill match score between SOP and staff member
   */
  private calculateSkillMatchScore(sop: any, staffMember: any): number {
    const sopTags = (sop.tags || []).map((tag: string) => tag.toLowerCase());
    const sopCategory = sop.category.name.toLowerCase();
    const sopDifficulty = sop.difficulty_level;
    const staffRole = staffMember.role;
    const staffSkills = staffMember.skill_profiles || [];

    let skillScore = 0.5; // Base score

    // Role-based matching
    const roleSkillMatch = this.getRoleSkillMatch(staffRole, sopCategory, sopTags);
    skillScore += roleSkillMatch * 0.4;

    // Specific skill matching
    if (staffSkills.length > 0) {
      const relevantSkills = staffSkills.filter((skill: any) =>
        sopTags.some(tag => tag.includes(skill.skill_name.toLowerCase())) ||
        skill.skill_category.toLowerCase().includes(sopCategory)
      );

      if (relevantSkills.length > 0) {
        const avgSkillLevel = relevantSkills.reduce((sum: number, skill: any) => 
          sum + skill.proficiency_level, 0) / relevantSkills.length;
        
        // Match skill level with SOP difficulty
        const difficultyLevelMap = { 'beginner': 3, 'intermediate': 6, 'advanced': 9 };
        const requiredLevel = difficultyLevelMap[sopDifficulty as keyof typeof difficultyLevelMap] || 5;
        
        const skillLevelMatch = 1 - Math.abs(avgSkillLevel - requiredLevel) / 10;
        skillScore += Math.max(0, skillLevelMatch) * 0.4;
      }
    }

    // Experience-based matching
    const experienceScore = this.calculateExperienceMatch(sop, staffMember);
    skillScore += experienceScore * 0.2;

    return Math.max(0, Math.min(1, skillScore));
  }

  /**
   * Calculate staff availability score
   */
  private calculateAvailabilityScore(staffMember: any): number {
    const currentAssignments = staffMember.current_assignments || [];
    const activeAssignments = currentAssignments.filter((a: any) => 
      ['pending', 'in_progress'].includes(a.status)
    );

    // Base availability (higher is better)
    let availabilityScore = 1.0;

    // Reduce score based on current workload
    const workloadPenalty = Math.min(0.8, activeAssignments.length * 0.1);
    availabilityScore -= workloadPenalty;

    // Check for overdue assignments
    const overdueAssignments = activeAssignments.filter((a: any) => 
      new Date(a.due_date) < new Date()
    );
    
    if (overdueAssignments.length > 0) {
      availabilityScore -= overdueAssignments.length * 0.15;
    }

    // Consider priority of existing assignments
    const highPriorityAssignments = activeAssignments.filter((a: any) => 
      ['high', 'urgent'].includes(a.priority)
    );
    
    if (highPriorityAssignments.length > 0) {
      availabilityScore -= highPriorityAssignments.length * 0.1;
    }

    return Math.max(0.1, Math.min(1, availabilityScore));
  }

  /**
   * Calculate workload balance score
   */
  private calculateWorkloadScore(staffMember: any): number {
    const currentAssignments = staffMember.current_assignments || [];
    const activeAssignments = currentAssignments.filter((a: any) => 
      ['pending', 'in_progress'].includes(a.status)
    );

    // Calculate total estimated time for current assignments
    const totalEstimatedTime = activeAssignments.reduce((sum: number, assignment: any) => 
      sum + (assignment.sop_document?.estimated_read_time || 30), 0
    );

    // Ideal workload is around 2-4 hours per day
    const idealWorkload = 180; // 3 hours in minutes
    const workloadRatio = totalEstimatedTime / idealWorkload;

    // Score is highest when workload is near ideal, decreases as it gets too high or too low
    let workloadScore: number;
    
    if (workloadRatio <= 0.5) {
      // Under-utilized
      workloadScore = 0.7 + (workloadRatio * 0.6); // 0.7 to 1.0
    } else if (workloadRatio <= 1.0) {
      // Optimal range
      workloadScore = 1.0;
    } else if (workloadRatio <= 1.5) {
      // Slightly overloaded
      workloadScore = 1.0 - ((workloadRatio - 1.0) * 0.4); // 1.0 to 0.8
    } else {
      // Overloaded
      workloadScore = Math.max(0.2, 0.8 - ((workloadRatio - 1.5) * 0.3));
    }

    return Math.max(0.1, Math.min(1, workloadScore));
  }

  /**
   * Calculate performance score based on historical completion data
   */
  private calculatePerformanceScore(sop: any, staffMember: any): number {
    const performanceHistory = staffMember.performance_history || [];
    
    if (performanceHistory.length === 0) {
      return 0.6; // Neutral score for new staff
    }

    // Filter relevant performance data
    const relevantHistory = performanceHistory.filter((history: any) => {
      const historyDifficulty = history.sop_document?.difficulty_level;
      return historyDifficulty === sop.difficulty_level; // Same difficulty level
    });

    let performanceScore = 0.5; // Base score

    // Overall completion rate
    const completionRate = performanceHistory.filter((h: any) => h.progress_percentage === 100).length / 
                          performanceHistory.length;
    performanceScore += completionRate * 0.4;

    // Time efficiency (completing within estimated time)
    const timeEfficiencyScores = performanceHistory
      .filter((h: any) => h.progress_percentage === 100)
      .map((h: any) => {
        const estimatedTime = 30; // Default if not available
        const actualTime = h.time_spent;
        return Math.max(0, Math.min(1, estimatedTime / Math.max(actualTime, 1)));
      });

    if (timeEfficiencyScores.length > 0) {
      const avgTimeEfficiency = timeEfficiencyScores.reduce((sum, score) => sum + score, 0) / 
                               timeEfficiencyScores.length;
      performanceScore += avgTimeEfficiency * 0.3;
    }

    // Recent performance trend
    const recentHistory = performanceHistory
      .filter((h: any) => new Date(h.last_accessed) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .sort((a: any, b: any) => new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime());

    if (recentHistory.length >= 3) {
      const recentCompletionRate = recentHistory.filter((h: any) => h.progress_percentage === 100).length / 
                                  recentHistory.length;
      const trendBonus = (recentCompletionRate - completionRate) * 0.3;
      performanceScore += trendBonus;
    }

    return Math.max(0.1, Math.min(1, performanceScore));
  }

  /**
   * Optimize assignment matrix using Hungarian algorithm approximation
   */
  private optimizeAssignmentMatrix(
    matrix: Map<string, Map<string, OptimalAssignment>>,
    request: AssignmentRequest
  ): OptimalAssignment[] {
    const sops = Array.from(matrix.keys());
    const assignments: OptimalAssignment[] = [];
    const assignedStaff = new Set<string>();
    const maxAssignmentsPerPerson = request.constraints?.max_assignments_per_person || 3;
    const staffAssignmentCounts = new Map<string, number>();

    // Sort SOPs by priority and complexity
    const sortedSops = sops.sort((a, b) => {
      const sopAMatrix = matrix.get(a)!;
      const sopBMatrix = matrix.get(b)!;
      
      // Get best scores for comparison
      const bestScoreA = Math.max(...Array.from(sopAMatrix.values()).map(a => a.assignment_score));
      const bestScoreB = Math.max(...Array.from(sopBMatrix.values()).map(a => a.assignment_score));
      
      return bestScoreB - bestScoreA; // Higher scores first
    });

    // Greedy assignment with constraints
    for (const sopId of sortedSops) {
      const sopAssignments = matrix.get(sopId)!;
      
      // Sort staff by assignment score for this SOP
      const sortedAssignments = Array.from(sopAssignments.values())
        .sort((a, b) => b.assignment_score - a.assignment_score);

      // Find best available staff member
      let assigned = false;
      for (const assignment of sortedAssignments) {
        const staffId = assignment.assigned_to;
        const currentCount = staffAssignmentCounts.get(staffId) || 0;

        // Check constraints
        if (currentCount >= maxAssignmentsPerPerson) continue;
        if (request.constraints?.exclude_users?.includes(staffId)) continue;

        // Apply fairness consideration
        const fairnessScore = this.calculateFairness(staffId, staffAssignmentCounts, request);
        const adjustedScore = assignment.assignment_score * fairnessScore;

        if (adjustedScore > 0.4) { // Minimum threshold
          // Add alternative assignees
          assignment.alternative_assignees = sortedAssignments
            .filter(alt => alt.assigned_to !== staffId)
            .slice(0, 2)
            .map(alt => ({
              user_id: alt.assigned_to,
              score: alt.assignment_score,
              reason: alt.reasoning.key_factors[0] || 'Alternative option'
            }));

          assignments.push(assignment);
          staffAssignmentCounts.set(staffId, currentCount + 1);
          assigned = true;
          break;
        }
      }

      // If no suitable assignment found, assign to least loaded staff
      if (!assigned && sortedAssignments.length > 0) {
        const leastLoadedAssignment = sortedAssignments.reduce((min, current) => {
          const minCount = staffAssignmentCounts.get(min.assigned_to) || 0;
          const currentCount = staffAssignmentCounts.get(current.assigned_to) || 0;
          return currentCount < minCount ? current : min;
        });

        const staffId = leastLoadedAssignment.assigned_to;
        const currentCount = staffAssignmentCounts.get(staffId) || 0;
        
        if (currentCount < maxAssignmentsPerPerson) {
          assignments.push(leastLoadedAssignment);
          staffAssignmentCounts.set(staffId, currentCount + 1);
        }
      }
    }

    return assignments;
  }

  /**
   * Calculate fairness score for workload distribution
   */
  private calculateFairness(
    staffId: string,
    currentCounts: Map<string, number>,
    request: AssignmentRequest
  ): number {
    const fairnessWeight = request.assignment_criteria?.fairness_weight || 0.2;
    
    if (fairnessWeight === 0) return 1.0;

    const currentCount = currentCounts.get(staffId) || 0;
    const allCounts = Array.from(currentCounts.values());
    const avgCount = allCounts.length > 0 ? allCounts.reduce((sum, count) => sum + count, 0) / allCounts.length : 0;

    // Prefer staff with lower than average assignments
    const fairnessScore = Math.max(0.3, 1 - (Math.max(0, currentCount - avgCount) * 0.3));
    
    return 1 - fairnessWeight + (fairnessWeight * fairnessScore);
  }

  /**
   * Calculate optimization metrics
   */
  private calculateOptimizationMetrics(
    assignments: OptimalAssignment[],
    staff: any[]
  ): AssignmentOptimization['optimization_metrics'] {
    if (assignments.length === 0) {
      return {
        total_score: 0,
        skill_utilization: 0,
        workload_balance: 0,
        expected_completion_rate: 0,
        fairness_index: 0
      };
    }

    // Total score
    const totalScore = assignments.reduce((sum, a) => sum + a.assignment_score, 0) / assignments.length;

    // Skill utilization
    const skillUtilization = assignments.reduce((sum, a) => sum + a.reasoning.skill_match_score, 0) / assignments.length;

    // Workload balance (standard deviation of assignments per person)
    const assignmentCounts = new Map<string, number>();
    assignments.forEach(a => {
      assignmentCounts.set(a.assigned_to, (assignmentCounts.get(a.assigned_to) || 0) + 1);
    });

    const counts = Array.from(assignmentCounts.values());
    const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / counts.length;
    const workloadBalance = Math.max(0, 1 - Math.sqrt(variance) / Math.max(1, avgCount));

    // Expected completion rate
    const expectedCompletionRate = assignments.reduce((sum, a) => sum + a.reasoning.overall_confidence, 0) / assignments.length;

    // Fairness index (Gini coefficient approximation)
    const sortedCounts = counts.sort((a, b) => a - b);
    let giniSum = 0;
    for (let i = 0; i < sortedCounts.length; i++) {
      giniSum += (2 * (i + 1) - sortedCounts.length - 1) * sortedCounts[i];
    }
    const giniCoeff = giniSum / (sortedCounts.length * sortedCounts.reduce((sum, count) => sum + count, 0));
    const fairnessIndex = 1 - Math.abs(giniCoeff);

    return {
      total_score: Math.round(totalScore * 1000) / 1000,
      skill_utilization: Math.round(skillUtilization * 1000) / 1000,
      workload_balance: Math.round(workloadBalance * 1000) / 1000,
      expected_completion_rate: Math.round(expectedCompletionRate * 1000) / 1000,
      fairness_index: Math.round(fairnessIndex * 1000) / 1000
    };
  }

  /**
   * Helper methods
   */
  private getDefaultCriteria(): AssignmentRequest['assignment_criteria'] {
    return {
      skill_weight: 0.3,
      availability_weight: 0.25,
      workload_weight: 0.2,
      performance_weight: 0.25,
      fairness_weight: 0.2
    };
  }

  private getRoleSkillMatch(role: string, category: string, tags: string[]): number {
    const roleSkillMaps: Record<string, string[]> = {
      'chef': ['cooking', 'food', 'kitchen', 'prep', 'recipe'],
      'server': ['service', 'customer', 'dining', 'order', 'table'],
      'manager': ['management', 'admin', 'supervision', 'operation'],
      'admin': [] // Admin can handle all categories
    };

    if (role === 'admin') return 0.8;

    const roleSkills = roleSkillMaps[role] || [];
    const matchCount = roleSkills.filter(skill => 
      category.includes(skill) || tags.some(tag => tag.includes(skill))
    ).length;

    return Math.min(1, matchCount / Math.max(1, roleSkills.length)) * 0.8;
  }

  private calculateExperienceMatch(sop: any, staffMember: any): number {
    const performanceHistory = staffMember.performance_history || [];
    const relevantExperience = performanceHistory.filter((h: any) => 
      h.sop_document?.difficulty_level === sop.difficulty_level
    );

    if (relevantExperience.length === 0) return 0.3;

    const completionRate = relevantExperience.filter((h: any) => h.progress_percentage === 100).length / 
                          relevantExperience.length;
    
    return Math.min(1, completionRate + (relevantExperience.length * 0.05));
  }

  private identifyKeyFactors(scores: Record<string, number>): string[] {
    const factors: string[] = [];
    const sortedScores = Object.entries(scores).sort(([,a], [,b]) => b - a);

    for (const [factor, score] of sortedScores) {
      if (score > 0.7) {
        factors.push(`Strong ${factor} match`);
      } else if (score > 0.5) {
        factors.push(`Good ${factor} alignment`);
      } else if (score < 0.3) {
        factors.push(`Limited ${factor} match`);
      }
    }

    return factors.slice(0, 3); // Top 3 factors
  }

  private estimateCompletionTime(sop: any, staffMember: any): number {
    const baseTime = sop.estimated_read_time || 30;
    const skillProfiles = staffMember.skill_profiles || [];
    const performanceHistory = staffMember.performance_history || [];

    let adjustedTime = baseTime;

    // Skill-based adjustment
    if (skillProfiles.length > 0) {
      const avgSkillLevel = skillProfiles.reduce((sum: number, skill: any) => 
        sum + skill.proficiency_level, 0) / skillProfiles.length;
      const skillMultiplier = 1 - ((avgSkillLevel - 5) / 10) * 0.3;
      adjustedTime *= Math.max(0.5, skillMultiplier);
    }

    // Experience-based adjustment
    if (performanceHistory.length > 0) {
      const avgActualTime = performanceHistory
        .filter((h: any) => h.progress_percentage === 100)
        .reduce((sum: number, h: any) => sum + h.time_spent, 0) / performanceHistory.length;
      
      if (avgActualTime > 0) {
        const experienceMultiplier = avgActualTime / baseTime;
        adjustedTime = (adjustedTime + avgActualTime) / 2; // Blend estimate with historical average
      }
    }

    return Math.max(10, adjustedTime); // Minimum 10 minutes
  }

  private calculateRecommendedDueDate(estimatedTime: number, priority: string): string {
    const now = new Date();
    let daysToAdd: number;

    switch (priority) {
      case 'urgent':
        daysToAdd = 1;
        break;
      case 'high':
        daysToAdd = 2;
        break;
      case 'medium':
        daysToAdd = 3;
        break;
      case 'low':
        daysToAdd = 5;
        break;
      default:
        daysToAdd = 3;
    }

    // Add extra time for complex SOPs
    if (estimatedTime > 60) daysToAdd += 1;
    if (estimatedTime > 120) daysToAdd += 1;

    const dueDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return dueDate.toISOString();
  }

  private generateRecommendations(
    assignments: OptimalAssignment[],
    metrics: AssignmentOptimization['optimization_metrics']
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.skill_utilization < 0.6) {
      recommendations.push('Consider providing additional training to improve skill matching');
    }

    if (metrics.workload_balance < 0.7) {
      recommendations.push('Workload distribution could be more balanced across team members');
    }

    if (metrics.expected_completion_rate < 0.8) {
      recommendations.push('Some assignments may need additional support or extended deadlines');
    }

    if (assignments.some(a => a.assignment_score < 0.5)) {
      recommendations.push('Some SOPs may require reassignment or additional training resources');
    }

    if (metrics.fairness_index < 0.8) {
      recommendations.push('Consider redistributing assignments to improve fairness');
    }

    return recommendations;
  }

  private generateWarnings(
    assignments: OptimalAssignment[],
    staff: any[],
    sops: any[]
  ): string[] {
    const warnings: string[] = [];

    // Check for overloaded staff
    const assignmentCounts = new Map<string, number>();
    assignments.forEach(a => {
      assignmentCounts.set(a.assigned_to, (assignmentCounts.get(a.assigned_to) || 0) + 1);
    });

    assignmentCounts.forEach((count, staffId) => {
      if (count > 4) {
        const staffMember = staff.find(s => s.id === staffId);
        warnings.push(`${staffMember?.full_name || 'Staff member'} assigned ${count} SOPs - may be overloaded`);
      }
    });

    // Check for low-confidence assignments
    const lowConfidenceAssignments = assignments.filter(a => a.assignment_score < 0.4);
    if (lowConfidenceAssignments.length > 0) {
      warnings.push(`${lowConfidenceAssignments.length} assignments have low confidence scores`);
    }

    // Check for unassigned SOPs
    const unassignedSOPs = sops.filter(sop => !assignments.some(a => a.sop_id === sop.id));
    if (unassignedSOPs.length > 0) {
      warnings.push(`${unassignedSOPs.length} SOPs could not be assigned optimally`);
    }

    return warnings;
  }

  /**
   * Create assignments in database
   */
  async createAssignments(assignments: OptimalAssignment[]): Promise<any[]> {
    const assignmentData = assignments.map(assignment => ({
      restaurant_id: this.restaurantId,
      sop_id: assignment.sop_id,
      assigned_to: assignment.assigned_to,
      assigned_by: this.context.userId,
      due_date: assignment.recommended_due_date,
      priority: 'medium', // Default priority
      status: 'pending',
      notes: `AI-optimized assignment (score: ${assignment.assignment_score})`
    }));

    const { data: createdAssignments, error } = await supabaseAdmin
      .from('sop_assignments')
      .insert(assignmentData)
      .select(`
        *,
        sop_document:sop_documents!inner(id, title, title_fr),
        assigned_to_user:auth_users!assigned_to(id, full_name, email, role),
        assigned_by_user:auth_users!assigned_by(id, full_name, email)
      `);

    if (error) {
      throw new Error(`Failed to create assignments: ${error.message}`);
    }

    return createdAssignments || [];
  }
}

/**
 * GET /api/sop/smart-assign - Get optimal assignment recommendations
 */
async function handleGetSmartAssignments(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    const sopIds = searchParams.get('sop_ids')?.split(',').filter(Boolean);
    const targetDate = searchParams.get('target_completion_date');
    const priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | 'urgent' | null;

    if (!sopIds || sopIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one SOP ID is required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const assignmentRequest: AssignmentRequest = {
      sop_ids: sopIds,
      target_completion_date: targetDate || undefined,
      priority: priority || 'medium'
    };

    const optimizer = new SOPAssignmentOptimizer(context);
    const optimization = await optimizer.optimizeAssignments(assignmentRequest);

    const response: APIResponse = {
      success: true,
      data: optimization,
      message: `Generated optimal assignments for ${sopIds.length} SOPs`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/smart-assign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'OPTIMIZATION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/smart-assign - Create optimized assignments
 */
async function handleCreateSmartAssignments(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const assignmentRequest = sanitizeInput(body) as AssignmentRequest;

    if (!assignmentRequest.sop_ids || assignmentRequest.sop_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one SOP ID is required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const optimizer = new SOPAssignmentOptimizer(context);
    
    // Generate optimization
    const optimization = await optimizer.optimizeAssignments(assignmentRequest);
    
    // Create assignments in database
    const createdAssignments = await optimizer.createAssignments(optimization.assignments);

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'smart_assignments',
      `batch_${Date.now()}`,
      null,
      { 
        request: assignmentRequest,
        assignments_created: createdAssignments.length,
        optimization_score: optimization.optimization_metrics.total_score
      },
      request
    );

    const response: APIResponse = {
      success: true,
      data: {
        created_assignments: createdAssignments,
        optimization_summary: optimization.optimization_metrics,
        recommendations: optimization.recommendations,
        warnings: optimization.warnings
      },
      message: `Created ${createdAssignments.length} optimized assignments`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/smart-assign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'CREATION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * PUT /api/sop/smart-assign/optimize - Re-optimize existing assignments
 */
async function handleOptimizeExistingAssignments(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { assignment_ids, optimization_criteria } = sanitizeInput(body);

    if (!assignment_ids || assignment_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one assignment ID is required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Get existing assignments
    const { data: existingAssignments } = await supabaseAdmin
      .from('sop_assignments')
      .select('id, sop_id, assigned_to, status')
      .in('id', assignment_ids)
      .eq('restaurant_id', context.restaurantId)
      .in('status', ['pending', 'in_progress']);

    if (!existingAssignments || existingAssignments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No optimizable assignments found',
        errorCode: 'NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    const sopIds = existingAssignments.map(a => a.sop_id);
    
    const assignmentRequest: AssignmentRequest = {
      sop_ids: sopIds,
      assignment_criteria: optimization_criteria
    };

    const optimizer = new SOPAssignmentOptimizer(context);
    const optimization = await optimizer.optimizeAssignments(assignmentRequest);

    // Update existing assignments with optimized assignments
    const updatePromises = optimization.assignments.map(async (optimizedAssignment) => {
      const existingAssignment = existingAssignments.find(ea => ea.sop_id === optimizedAssignment.sop_id);
      if (existingAssignment) {
        return supabaseAdmin
          .from('sop_assignments')
          .update({
            assigned_to: optimizedAssignment.assigned_to,
            due_date: optimizedAssignment.recommended_due_date,
            notes: `Re-optimized assignment (score: ${optimizedAssignment.assignment_score})`
          })
          .eq('id', existingAssignment.id)
          .select()
          .single();
      }
      return null;
    });

    const updateResults = await Promise.all(updatePromises);
    const updatedAssignments = updateResults.filter(result => result?.data).map(result => result!.data);

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'assignment_optimization',
      `batch_${Date.now()}`,
      null,
      { 
        assignments_optimized: updatedAssignments.length,
        optimization_score: optimization.optimization_metrics.total_score
      },
      request
    );

    const response: APIResponse = {
      success: true,
      data: {
        updated_assignments: updatedAssignments,
        optimization_summary: optimization.optimization_metrics,
        recommendations: optimization.recommendations,
        warnings: optimization.warnings
      },
      message: `Re-optimized ${updatedAssignments.length} assignments`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in PUT /api/sop/smart-assign/optimize:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetSmartAssignments, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleCreateSmartAssignments, PERMISSIONS.SOP.CREATE, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

export const PUT = withAuth(async (request: NextRequest, context: SOPAuthContext) => {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/optimize')) {
    return handleOptimizeExistingAssignments(request, context);
  } else {
    return NextResponse.json(
      { success: false, error: 'Invalid endpoint' } as APIResponse,
      { status: 404 }
    );
  }
}, PERMISSIONS.SOP.UPDATE, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

// Handle unsupported methods
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