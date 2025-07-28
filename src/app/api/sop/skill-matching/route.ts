/**
 * SOP Staff Skill Matching API Route
 * Handles intelligent staff-SOP matching based on skills, competencies, and performance
 * 
 * GET    /api/sop/skill-matching                - Get skill-based SOP assignments and analysis
 * POST   /api/sop/skill-matching                - Generate skill-based assignments
 * PUT    /api/sop/skill-matching/config         - Update skill matching configuration
 * GET    /api/sop/skill-matching/analysis       - Get skill gap analysis
 * POST   /api/sop/skill-matching/evaluate       - Evaluate staff-SOP compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface SkillMatchingConfiguration {
  id?: string;
  matching_algorithm: 'weighted_score' | 'machine_learning' | 'competency_based' | 'hybrid';
  skill_categories: {
    category_name: string;
    weight: number;
    required_minimum_level: number;
    skills: Array<{
      skill_name: string;
      importance: number;
      weight: number;
    }>;
  }[];
  performance_factors: {
    completion_time_weight: number;
    quality_score_weight: number;
    error_rate_weight: number;
    consistency_weight: number;
    learning_curve_weight: number;
  };
  assignment_preferences: {
    prefer_skill_development: boolean;
    prefer_efficiency: boolean;
    prefer_quality: boolean;
    balance_workload: boolean;
    consider_availability: boolean;
  };
  threshold_settings: {
    minimum_skill_match_score: number;
    minimum_competency_level: number;
    maximum_skill_gap_allowed: number;
  };
  learning_settings: {
    enable_skill_progression: boolean;
    track_improvement_rates: boolean;
    suggest_training_opportunities: boolean;
    adaptive_difficulty_matching: boolean;
  };
  last_update_at?: string;
  matching_status: 'active' | 'error' | 'disabled';
  error_message?: string;
}

interface StaffSkillProfile {
  user_id: string;
  full_name: string;
  role: string;
  skill_levels: {
    skill_category: string;
    skill_name: string;
    current_level: number; // 1-10 scale
    certified_level?: number;
    last_assessed: string;
    assessment_method: 'self_reported' | 'manager_evaluated' | 'peer_reviewed' | 'performance_based';
    improvement_rate: number; // Skills gained per month
    confidence_score: number;
  }[];
  competency_areas: {
    area_name: string;
    proficiency_level: 'novice' | 'intermediate' | 'advanced' | 'expert';
    years_experience: number;
    certification_status: 'none' | 'in_progress' | 'certified' | 'expired';
    strengths: string[];
    areas_for_improvement: string[];
  }[];
  performance_history: {
    sop_id: string;
    completion_time_minutes: number;
    quality_score: number;
    error_count: number;
    attempts_needed: number;
    completion_date: string;
    feedback_received?: string;
  }[];
  availability: {
    preferred_shifts: string[];
    max_concurrent_sops: number;
    learning_capacity: 'low' | 'medium' | 'high';
    cross_training_interest: string[];
  };
  learning_progress: {
    skills_in_development: string[];
    training_programs_enrolled: string[];
    skill_improvement_goals: Array<{
      skill_name: string;
      target_level: number;
      target_date: string;
    }>;
  };
}

interface SOPSkillRequirements {
  sop_id: string;
  title: string;
  title_fr: string;
  required_skills: {
    skill_category: string;
    skill_name: string;
    minimum_level: number;
    importance: 'low' | 'medium' | 'high' | 'critical';
    can_be_trained: boolean;
  }[];
  competency_requirements: {
    area_name: string;
    minimum_proficiency: 'novice' | 'intermediate' | 'advanced' | 'expert';
    certification_required: boolean;
    experience_months_required: number;
  }[];
  difficulty_indicators: {
    technical_complexity: 'low' | 'medium' | 'high' | 'expert';
    physical_demands: 'low' | 'medium' | 'high';
    time_pressure: 'low' | 'medium' | 'high';
    safety_criticality: 'low' | 'medium' | 'high' | 'critical';
    customer_interaction: 'none' | 'low' | 'medium' | 'high';
  };
  learning_characteristics: {
    estimated_learning_time_hours: number;
    prerequisite_sops: string[];
    progressive_difficulty: boolean;
    mentorship_recommended: boolean;
    hands_on_practice_required: boolean;
  };
}

interface SkillMatchingResult {
  matching_id: string;
  sop_id: string;
  user_id: string;
  match_score: number; // 0-100 scale
  confidence_level: number; // 0-1 scale
  skill_compatibility: {
    matched_skills: Array<{
      skill_name: string;
      required_level: number;
      current_level: number;
      gap: number;
      match_percentage: number;
    }>;
    skill_gaps: Array<{
      skill_name: string;
      required_level: number;
      current_level: number;
      gap_severity: 'minor' | 'moderate' | 'major' | 'critical';
      training_time_estimate: number;
    }>;
    overall_skill_coverage: number;
  };
  performance_prediction: {
    estimated_completion_time_minutes: number;
    predicted_quality_score: number;
    estimated_error_rate: number;
    success_probability: number;
    training_time_needed_hours: number;
  };
  assignment_recommendation: {
    recommendation_type: 'immediate' | 'with_training' | 'with_mentorship' | 'not_recommended';
    reasoning: string;
    reasoning_fr: string;
    suggested_preparation: string[];
    risk_factors: string[];
    benefits: string[];
  };
  development_opportunities: {
    skills_to_develop: string[];
    suggested_training_path: Array<{
      step: number;
      training_type: string;
      estimated_duration: string;
      expected_skill_gain: number;
    }>;
    stretch_assignment_potential: boolean;
  };
  created_at: string;
  expires_at: string;
}

interface SkillGapAnalysis {
  analysis_id: string;
  analysis_date: string;
  restaurant_skill_overview: {
    total_staff_analyzed: number;
    skill_categories_covered: string[];
    overall_competency_level: number;
    areas_of_strength: string[];
    critical_skill_gaps: string[];
  };
  sop_coverage_analysis: {
    total_sops_analyzed: number;
    fully_covered_sops: number;
    partially_covered_sops: number;
    uncovered_sops: number;
    high_risk_sops: Array<{
      sop_id: string;
      title: string;
      risk_reason: string;
      mitigation_suggestions: string[];
    }>;
  };
  individual_recommendations: Array<{
    user_id: string;
    full_name: string;
    current_role: string;
    skill_development_priorities: Array<{
      skill_name: string;
      current_level: number;
      target_level: number;
      business_impact: 'low' | 'medium' | 'high' | 'critical';
      development_path: string[];
    }>;
    cross_training_opportunities: string[];
    promotion_readiness: {
      ready_for_roles: string[];
      skills_needed_for_advancement: string[];
    };
  }>;
  team_optimization_suggestions: Array<{
    suggestion_type: string;
    description: string;
    expected_benefit: string;
    implementation_effort: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Staff Skill Matching Manager
 * Manages intelligent matching of staff to SOPs based on skills and competencies
 */
class StaffSkillMatchingManager {
  private context: SOPAuthContext;
  private restaurantId: string;
  private config?: SkillMatchingConfiguration;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Initialize skill matching configuration
   */
  async initialize(): Promise<void> {
    const { data: config } = await supabaseAdmin
      .from('skill_matching_configurations')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .single();

    this.config = config;
  }

  /**
   * Generate skill-based SOP assignments
   */
  async generateSkillBasedAssignments(sopIds: string[], targetDate?: string): Promise<SkillMatchingResult[]> {
    if (!this.config) {
      throw new Error('Skill matching configuration not initialized');
    }

    // Get staff skill profiles
    const staffProfiles = await this.getStaffSkillProfiles();
    
    // Get SOP skill requirements
    const sopRequirements = await this.getSOPSkillRequirements(sopIds);
    
    const matchingResults: SkillMatchingResult[] = [];

    // Generate matches for each SOP-staff combination
    for (const sopReq of sopRequirements) {
      for (const staff of staffProfiles) {
        const matchResult = await this.calculateSkillMatch(staff, sopReq);
        
        if (matchResult.match_score >= this.config.threshold_settings.minimum_skill_match_score) {
          matchingResults.push(matchResult);
        }
      }
    }

    // Optimize assignments to avoid conflicts and balance workload
    const optimizedAssignments = await this.optimizeAssignments(matchingResults);

    // Store matching results
    await this.storeMatchingResults(optimizedAssignments);

    return optimizedAssignments;
  }

  /**
   * Get staff skill profiles
   */
  private async getStaffSkillProfiles(): Promise<StaffSkillProfile[]> {
    const { data: staffData } = await supabaseAdmin
      .from('auth_users')
      .select(`
        id, full_name, role,
        skill_profiles:staff_skill_profiles(*),
        performance_history:user_progress(
          sop_id, progress_percentage, time_spent, last_accessed,
          sop_documents(id, title, difficulty_level)
        ),
        training_progress:training_progress(*)
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    if (!staffData) return [];

    return staffData.map(staff => this.transformToSkillProfile(staff));
  }

  /**
   * Get SOP skill requirements
   */
  private async getSOPSkillRequirements(sopIds: string[]): Promise<SOPSkillRequirements[]> {
    const { data: sopData } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        id, title, title_fr, content, tags, difficulty_level, estimated_read_time,
        category:sop_categories!inner(id, name, name_fr)
      `)
      .eq('restaurant_id', this.restaurantId)
      .in('id', sopIds)
      .eq('is_active', true);

    if (!sopData) return [];

    return sopData.map(sop => this.extractSOPSkillRequirements(sop));
  }

  /**
   * Calculate skill match between staff and SOP
   */
  private async calculateSkillMatch(staff: StaffSkillProfile, sopReq: SOPSkillRequirements): Promise<SkillMatchingResult> {
    const matchedSkills: SkillMatchingResult['skill_compatibility']['matched_skills'] = [];
    const skillGaps: SkillMatchingResult['skill_compatibility']['skill_gaps'] = [];
    
    let totalSkillScore = 0;
    let totalPossibleScore = 0;

    // Analyze each required skill
    for (const requiredSkill of sopReq.required_skills) {
      const staffSkill = staff.skill_levels.find(s => 
        s.skill_name.toLowerCase() === requiredSkill.skill_name.toLowerCase() ||
        s.skill_category.toLowerCase() === requiredSkill.skill_category.toLowerCase()
      );

      const currentLevel = staffSkill?.current_level || 0;
      const requiredLevel = requiredSkill.minimum_level;
      const gap = Math.max(0, requiredLevel - currentLevel);
      
      const skillWeight = this.getSkillWeight(requiredSkill.importance);
      const matchPercentage = Math.max(0, Math.min(100, (currentLevel / requiredLevel) * 100));
      
      totalSkillScore += matchPercentage * skillWeight;
      totalPossibleScore += 100 * skillWeight;

      if (gap === 0) {
        matchedSkills.push({
          skill_name: requiredSkill.skill_name,
          required_level: requiredLevel,
          current_level: currentLevel,
          gap: 0,
          match_percentage: matchPercentage
        });
      } else {
        skillGaps.push({
          skill_name: requiredSkill.skill_name,
          required_level: requiredLevel,
          current_level: currentLevel,
          gap_severity: this.classifyGapSeverity(gap, requiredSkill.importance),
          training_time_estimate: this.estimateTrainingTime(gap, requiredSkill.can_be_trained)
        });
      }
    }

    const overallSkillCoverage = totalPossibleScore > 0 ? (totalSkillScore / totalPossibleScore) : 0;
    const matchScore = Math.round(overallSkillCoverage);

    // Calculate performance prediction
    const performancePrediction = await this.predictPerformance(staff, sopReq, overallSkillCoverage);

    // Generate assignment recommendation
    const assignmentRecommendation = this.generateAssignmentRecommendation(
      matchScore, 
      skillGaps, 
      performancePrediction,
      staff
    );

    // Identify development opportunities
    const developmentOpportunities = this.identifyDevelopmentOpportunities(staff, sopReq, skillGaps);

    return {
      matching_id: `match_${staff.user_id}_${sopReq.sop_id}_${Date.now()}`,
      sop_id: sopReq.sop_id,
      user_id: staff.user_id,
      match_score: matchScore,
      confidence_level: this.calculateConfidenceLevel(staff, matchedSkills, skillGaps),
      skill_compatibility: {
        matched_skills: matchedSkills,
        skill_gaps: skillGaps,
        overall_skill_coverage: Math.round(overallSkillCoverage)
      },
      performance_prediction: performancePrediction,
      assignment_recommendation: assignmentRecommendation,
      development_opportunities: developmentOpportunities,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
  }

  /**
   * Transform staff data to skill profile format
   */
  private transformToSkillProfile(staffData: any): StaffSkillProfile {
    return {
      user_id: staffData.id,
      full_name: staffData.full_name,
      role: staffData.role,
      skill_levels: (staffData.skill_profiles || []).map((skill: any) => ({
        skill_category: skill.skill_category || 'general',
        skill_name: skill.skill_name,
        current_level: skill.proficiency_level || 1,
        certified_level: skill.certified_level,
        last_assessed: skill.last_assessed || new Date().toISOString(),
        assessment_method: skill.assessment_method || 'self_reported',
        improvement_rate: skill.improvement_rate || 0.1,
        confidence_score: skill.confidence_score || 0.7
      })),
      competency_areas: this.extractCompetencyAreas(staffData.role, staffData.skill_profiles || []),
      performance_history: (staffData.performance_history || []).map((perf: any) => ({
        sop_id: perf.sop_id,
        completion_time_minutes: perf.time_spent || 30,
        quality_score: (perf.progress_percentage || 0) >= 100 ? 85 : 70,
        error_count: 0, // Would need to track this separately
        attempts_needed: 1,
        completion_date: perf.last_accessed,
        feedback_received: undefined
      })),
      availability: {
        preferred_shifts: ['morning', 'afternoon'], // Would be stored separately
        max_concurrent_sops: 3,
        learning_capacity: 'medium',
        cross_training_interest: []
      },
      learning_progress: {
        skills_in_development: [],
        training_programs_enrolled: (staffData.training_progress || []).map((tp: any) => tp.module_id),
        skill_improvement_goals: []
      }
    };
  }

  /**
   * Extract SOP skill requirements from content and metadata
   */
  private extractSOPSkillRequirements(sopData: any): SOPSkillRequirements {
    const content = sopData.content || '';
    const tags = sopData.tags || [];
    
    // Extract skills from content and tags
    const requiredSkills = this.extractSkillsFromContent(content, tags, sopData.difficulty_level);
    const competencyRequirements = this.extractCompetencyRequirements(sopData.category.name, tags, sopData.difficulty_level);
    const difficultyIndicators = this.analyzeDifficultyIndicators(content, tags, sopData.difficulty_level);
    const learningCharacteristics = this.analyzeLearningCharacteristics(content, sopData.estimated_read_time);

    return {
      sop_id: sopData.id,
      title: sopData.title,
      title_fr: sopData.title_fr,
      required_skills: requiredSkills,
      competency_requirements: competencyRequirements,
      difficulty_indicators: difficultyIndicators,
      learning_characteristics: learningCharacteristics
    };
  }

  /**
   * Extract skills from SOP content and tags
   */
  private extractSkillsFromContent(content: string, tags: string[], difficulty: string): SOPSkillRequirements['required_skills'] {
    const skills: SOPSkillRequirements['required_skills'] = [];
    
    // Skill detection patterns
    const skillPatterns = {
      'knife_skills': ['chop', 'dice', 'slice', 'julienne', 'mince'],
      'cooking_skills': ['sauté', 'grill', 'roast', 'braise', 'steam'],
      'food_safety': ['temperature', 'sanitize', 'clean', 'wash', 'store'],
      'customer_service': ['greet', 'serve', 'explain', 'recommend', 'assist'],
      'time_management': ['timing', 'schedule', 'coordinate', 'prioritize'],
      'communication': ['inform', 'report', 'discuss', 'explain', 'coordinate'],
      'equipment_operation': ['operate', 'adjust', 'maintain', 'clean', 'setup']
    };

    const contentLower = content.toLowerCase();
    const allTags = tags.map(tag => tag.toLowerCase());

    for (const [skillName, keywords] of Object.entries(skillPatterns)) {
      const keywordMatches = keywords.filter(keyword => 
        contentLower.includes(keyword) || allTags.some(tag => tag.includes(keyword))
      ).length;

      if (keywordMatches > 0) {
        const importance = this.determineSkillImportance(keywordMatches, keywords.length, difficulty);
        const minimumLevel = this.calculateMinimumSkillLevel(importance, difficulty);
        
        skills.push({
          skill_category: this.categorizeSkill(skillName),
          skill_name: skillName,
          minimum_level: minimumLevel,
          importance: importance,
          can_be_trained: true
        });
      }
    }

    return skills;
  }

  /**
   * Extract competency requirements
   */
  private extractCompetencyRequirements(categoryName: string, tags: string[], difficulty: string): SOPSkillRequirements['competency_requirements'] {
    const competencies: SOPSkillRequirements['competency_requirements'] = [];
    
    const competencyMap: Record<string, {
      area_name: string;
      minimum_proficiency: SOPSkillRequirements['competency_requirements'][0]['minimum_proficiency'];
      certification_required: boolean;
    }> = {
      'kitchen': { area_name: 'culinary_arts', minimum_proficiency: 'intermediate', certification_required: false },
      'service': { area_name: 'customer_service', minimum_proficiency: 'intermediate', certification_required: false },
      'management': { area_name: 'leadership', minimum_proficiency: 'advanced', certification_required: true },
      'safety': { area_name: 'food_safety', minimum_proficiency: 'intermediate', certification_required: true }
    };

    const categoryKey = categoryName.toLowerCase();
    const tagKeys = tags.map(tag => tag.toLowerCase());

    // Check category-based competencies
    if (competencyMap[categoryKey]) {
      competencies.push({
        ...competencyMap[categoryKey],
        experience_months_required: this.calculateExperienceRequirement(difficulty, competencyMap[categoryKey].minimum_proficiency)
      });
    }

    // Check tag-based competencies
    for (const tag of tagKeys) {
      if (competencyMap[tag] && !competencies.find(c => c.area_name === competencyMap[tag].area_name)) {
        competencies.push({
          ...competencyMap[tag],
          experience_months_required: this.calculateExperienceRequirement(difficulty, competencyMap[tag].minimum_proficiency)
        });
      }
    }

    return competencies;
  }

  /**
   * Analyze difficulty indicators
   */
  private analyzeDifficultyIndicators(content: string, tags: string[], difficulty: string): SOPSkillRequirements['difficulty_indicators'] {
    const contentLower = content.toLowerCase();
    const tagLower = tags.map(t => t.toLowerCase());

    // Technical complexity
    const technicalKeywords = ['precise', 'exact', 'careful', 'specific', 'technical', 'complex'];
    const technicalComplexity = technicalKeywords.filter(kw => contentLower.includes(kw)).length > 2 ? 'high' : 
                               difficulty === 'advanced' ? 'high' : 
                               difficulty === 'intermediate' ? 'medium' : 'low';

    // Physical demands
    const physicalKeywords = ['lift', 'carry', 'stand', 'move', 'heavy', 'physical'];
    const physicalDemands = physicalKeywords.filter(kw => contentLower.includes(kw)).length > 1 ? 'high' : 'low';

    // Time pressure
    const timeKeywords = ['quickly', 'fast', 'immediate', 'urgent', 'rush', 'peak'];
    const timePressure = timeKeywords.filter(kw => contentLower.includes(kw)).length > 1 ? 'high' : 'medium';

    // Safety criticality
    const safetyKeywords = ['safety', 'danger', 'caution', 'warning', 'critical', 'temperature', 'sanitize'];
    const safetyCriticality = safetyKeywords.filter(kw => contentLower.includes(kw)).length > 2 ? 'critical' : 
                             tagLower.includes('safety') ? 'high' : 'medium';

    // Customer interaction
    const customerKeywords = ['customer', 'guest', 'serve', 'present', 'explain', 'interact'];
    const customerInteraction = customerKeywords.filter(kw => contentLower.includes(kw)).length > 1 ? 'high' : 
                               tagLower.includes('service') ? 'medium' : 'none';

    return {
      technical_complexity: technicalComplexity as any,
      physical_demands: physicalDemands as any,
      time_pressure: timePressure as any,
      safety_criticality: safetyCriticality as any,
      customer_interaction: customerInteraction as any
    };
  }

  /**
   * Analyze learning characteristics
   */
  private analyzeLearningCharacteristics(content: string, estimatedReadTime: number): SOPSkillRequirements['learning_characteristics'] {
    const contentLower = content.toLowerCase();
    
    const learningTimeMultiplier = contentLower.includes('practice') ? 3 : 
                                  contentLower.includes('hands-on') ? 2.5 : 2;

    return {
      estimated_learning_time_hours: Math.max(1, Math.round((estimatedReadTime || 15) * learningTimeMultiplier / 60)),
      prerequisite_sops: [], // Would need to analyze dependencies
      progressive_difficulty: contentLower.includes('step') || contentLower.includes('sequence'),
      mentorship_recommended: contentLower.includes('complex') || contentLower.includes('advanced'),
      hands_on_practice_required: contentLower.includes('practice') || contentLower.includes('demonstrate')
    };
  }

  /**
   * Predict staff performance on SOP
   */
  private async predictPerformance(
    staff: StaffSkillProfile, 
    sopReq: SOPSkillRequirements, 
    skillCoverage: number
  ): Promise<SkillMatchingResult['performance_prediction']> {
    // Get historical performance for similar SOPs
    const similarSOPsPerformance = staff.performance_history.filter(perf => 
      // Simple similarity check - in practice, this would be more sophisticated
      Math.abs(perf.completion_time_minutes - (sopReq.learning_characteristics.estimated_learning_time_hours * 60)) <= 30
    );

    const avgCompletionTime = similarSOPsPerformance.length > 0 ?
      similarSOPsPerformance.reduce((sum, perf) => sum + perf.completion_time_minutes, 0) / similarSOPsPerformance.length :
      sopReq.learning_characteristics.estimated_learning_time_hours * 60;

    const avgQualityScore = similarSOPsPerformance.length > 0 ?
      similarSOPsPerformance.reduce((sum, perf) => sum + perf.quality_score, 0) / similarSOPsPerformance.length :
      75; // Base score

    // Adjust predictions based on skill coverage
    const skillFactor = skillCoverage / 100;
    const experienceFactor = Math.min(1.2, staff.performance_history.length / 10);

    return {
      estimated_completion_time_minutes: Math.round(avgCompletionTime * (2 - skillFactor) * (2 - experienceFactor)),
      predicted_quality_score: Math.round(avgQualityScore * skillFactor * experienceFactor),
      estimated_error_rate: Math.max(0.01, (1 - skillFactor) * 0.1),
      success_probability: Math.min(0.95, skillFactor * experienceFactor * 0.9),
      training_time_needed_hours: Math.max(0, (1 - skillFactor) * sopReq.learning_characteristics.estimated_learning_time_hours)
    };
  }

  /**
   * Generate assignment recommendation
   */
  private generateAssignmentRecommendation(
    matchScore: number,
    skillGaps: SkillMatchingResult['skill_compatibility']['skill_gaps'],
    performance: SkillMatchingResult['performance_prediction'],
    staff: StaffSkillProfile
  ): SkillMatchingResult['assignment_recommendation'] {
    const criticalGaps = skillGaps.filter(gap => gap.gap_severity === 'critical').length;
    const majorGaps = skillGaps.filter(gap => gap.gap_severity === 'major').length;

    let recommendationType: SkillMatchingResult['assignment_recommendation']['recommendation_type'];
    let reasoning: string;
    let reasoningFr: string;
    let suggestedPreparation: string[] = [];
    let riskFactors: string[] = [];
    let benefits: string[] = [];

    if (matchScore >= 80 && criticalGaps === 0) {
      recommendationType = 'immediate';
      reasoning = 'Staff member has excellent skill match and can proceed immediately';
      reasoningFr = 'Le membre du personnel a une excellente correspondance de compétences et peut procéder immédiatement';
      benefits = ['High success probability', 'Minimal training needed', 'Efficient assignment'];
    } else if (matchScore >= 60 && criticalGaps === 0 && majorGaps <= 1) {
      recommendationType = 'with_training';
      reasoning = 'Staff member shows good potential but needs targeted training in specific areas';
      reasoningFr = 'Le membre du personnel montre un bon potentiel mais a besoin d\'une formation ciblée dans des domaines spécifiques';
      suggestedPreparation = skillGaps.map(gap => `Training in ${gap.skill_name}`);
      benefits = ['Skill development opportunity', 'Manageable learning curve'];
    } else if (matchScore >= 40 && criticalGaps <= 1) {
      recommendationType = 'with_mentorship';
      reasoning = 'Staff member needs mentorship and guided learning to succeed';
      reasoningFr = 'Le membre du personnel a besoin de mentorat et d\'apprentissage guidé pour réussir';
      suggestedPreparation = ['Assign experienced mentor', 'Structured learning plan', 'Regular check-ins'];
      riskFactors = ['Longer learning curve', 'May require multiple attempts'];
      benefits = ['Significant skill development', 'Long-term capability building'];
    } else {
      recommendationType = 'not_recommended';
      reasoning = 'Staff member currently lacks essential skills for this SOP';
      reasoningFr = 'Le membre du personnel manque actuellement de compétences essentielles pour cette SOP';
      riskFactors = ['High failure probability', 'Extensive training required', 'May impact quality'];
    }

    return {
      recommendation_type: recommendationType,
      reasoning,
      reasoning_fr: reasoningFr,
      suggested_preparation: suggestedPreparation,
      risk_factors: riskFactors,
      benefits: benefits
    };
  }

  /**
   * Identify development opportunities
   */
  private identifyDevelopmentOpportunities(
    staff: StaffSkillProfile,
    sopReq: SOPSkillRequirements,
    skillGaps: SkillMatchingResult['skill_compatibility']['skill_gaps']
  ): SkillMatchingResult['development_opportunities'] {
    const skillsToDevelop = skillGaps
      .filter(gap => gap.gap_severity !== 'critical' && gap.training_time_estimate <= 40)
      .map(gap => gap.skill_name)
      .slice(0, 3);

    const trainingPath = skillsToDevelop.map((skill, index) => ({
      step: index + 1,
      training_type: `${skill} development`,
      estimated_duration: `${2 + index} weeks`,
      expected_skill_gain: Math.max(1, 3 - index)
    }));

    const stretchAssignmentPotential = skillGaps.length <= 2 && 
      staff.learning_progress.skills_in_development.length < 2 &&
      staff.availability.learning_capacity !== 'low';

    return {
      skills_to_develop: skillsToDevelop,
      suggested_training_path: trainingPath,
      stretch_assignment_potential: stretchAssignmentPotential
    };
  }

  /**
   * Optimize assignments to balance workload and avoid conflicts
   */
  private async optimizeAssignments(matchingResults: SkillMatchingResult[]): Promise<SkillMatchingResult[]> {
    // Group by SOP
    const sopGroups = new Map<string, SkillMatchingResult[]>();
    
    for (const result of matchingResults) {
      if (!sopGroups.has(result.sop_id)) {
        sopGroups.set(result.sop_id, []);
      }
      sopGroups.get(result.sop_id)!.push(result);
    }

    const optimizedResults: SkillMatchingResult[] = [];

    // For each SOP, select the best matches while balancing workload
    for (const [sopId, matches] of sopGroups) {
      // Sort by match score and confidence
      const sortedMatches = matches.sort((a, b) => {
        const scoreA = a.match_score * a.confidence_level;
        const scoreB = b.match_score * b.confidence_level;
        return scoreB - scoreA;
      });

      // Select top matches (could be multiple for backup assignments)
      const selectedMatches = sortedMatches.slice(0, Math.min(3, sortedMatches.length));
      optimizedResults.push(...selectedMatches);
    }

    return optimizedResults;
  }

  /**
   * Generate comprehensive skill gap analysis
   */
  async generateSkillGapAnalysis(): Promise<SkillGapAnalysis> {
    const staffProfiles = await this.getStaffSkillProfiles();
    const { data: allSOPs } = await supabaseAdmin
      .from('sop_documents')
      .select('id, title, tags, difficulty_level')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    const analysisId = `gap_analysis_${Date.now()}`;
    const analysisDate = new Date().toISOString();

    // Analyze restaurant skill overview
    const restaurantSkillOverview = this.analyzeRestaurantSkills(staffProfiles);

    // Analyze SOP coverage
    const sopCoverageAnalysis = await this.analyzeSOpCoverage(staffProfiles, allSOPs || []);

    // Generate individual recommendations
    const individualRecommendations = staffProfiles.map(staff => 
      this.generateIndividualRecommendations(staff, allSOPs || [])
    );

    // Generate team optimization suggestions
    const teamOptimizationSuggestions = this.generateTeamOptimizationSuggestions(
      staffProfiles, 
      sopCoverageAnalysis
    );

    const analysis: SkillGapAnalysis = {
      analysis_id: analysisId,
      analysis_date: analysisDate,
      restaurant_skill_overview: restaurantSkillOverview,
      sop_coverage_analysis: sopCoverageAnalysis,
      individual_recommendations: individualRecommendations,
      team_optimization_suggestions: teamOptimizationSuggestions
    };

    // Store analysis results
    await supabaseAdmin
      .from('skill_gap_analyses')
      .insert({
        restaurant_id: this.restaurantId,
        analysis_id: analysisId,
        analysis_data: analysis,
        created_at: analysisDate
      });

    return analysis;
  }

  /**
   * Helper methods
   */
  private getSkillWeight(importance: string): number {
    const weights = { low: 0.5, medium: 1.0, high: 1.5, critical: 2.0 };
    return weights[importance as keyof typeof weights] || 1.0;
  }

  private classifyGapSeverity(gap: number, importance: string): SkillMatchingResult['skill_compatibility']['skill_gaps'][0]['gap_severity'] {
    if (importance === 'critical' && gap > 0) return 'critical';
    if (gap >= 4) return 'critical';
    if (gap >= 3) return 'major';
    if (gap >= 2) return 'moderate';
    return 'minor';
  }

  private estimateTrainingTime(gap: number, canBeTrained: boolean): number {
    if (!canBeTrained) return 0;
    return Math.min(80, gap * 8); // 8 hours per skill level gap, max 80 hours
  }

  private categorizeSkill(skillName: string): string {
    const categoryMap: Record<string, string> = {
      'knife_skills': 'technical',
      'cooking_skills': 'technical',
      'food_safety': 'safety',
      'customer_service': 'interpersonal',
      'time_management': 'organizational',
      'communication': 'interpersonal',
      'equipment_operation': 'technical'
    };
    return categoryMap[skillName] || 'general';
  }

  private determineSkillImportance(matches: number, total: number, difficulty: string): SkillMatchingResult['skill_compatibility']['matched_skills'][0] extends { importance?: infer T } ? T : never {
    const matchRatio = matches / total;
    if (difficulty === 'advanced' && matchRatio >= 0.6) return 'critical' as any;
    if (matchRatio >= 0.8) return 'high' as any;
    if (matchRatio >= 0.4) return 'medium' as any;
    return 'low' as any;
  }

  private calculateMinimumSkillLevel(importance: string, difficulty: string): number {
    const baseLevel = { beginner: 3, intermediate: 5, advanced: 7 }[difficulty] || 5;
    const importanceBonus = { low: 0, medium: 1, high: 2, critical: 3 }[importance] || 0;
    return Math.min(10, baseLevel + importanceBonus);
  }

  private calculateExperienceRequirement(difficulty: string, proficiency: string): number {
    const base = { beginner: 3, intermediate: 12, advanced: 24 }[difficulty] || 12;
    const proficiencyMultiplier = { novice: 0.5, intermediate: 1, advanced: 1.5, expert: 2 }[proficiency] || 1;
    return Math.round(base * proficiencyMultiplier);
  }

  private calculateConfidenceLevel(staff: StaffSkillProfile, matched: any[], gaps: any[]): number {
    const matchRatio = matched.length / (matched.length + gaps.length);
    const experienceBonus = Math.min(0.3, staff.performance_history.length / 20);
    const skillAssessmentQuality = staff.skill_levels.length > 0 ? 
      staff.skill_levels.reduce((sum, skill) => sum + skill.confidence_score, 0) / staff.skill_levels.length : 0.5;
    
    return Math.min(1.0, matchRatio * 0.6 + experienceBonus + skillAssessmentQuality * 0.1);
  }

  private extractCompetencyAreas(role: string, skillProfiles: any[]): StaffSkillProfile['competency_areas'] {
    // Simplified competency extraction based on role
    const roleCompetencies: Record<string, string[]> = {
      'chef': ['culinary_arts', 'food_safety', 'leadership'],
      'server': ['customer_service', 'communication', 'multitasking'],
      'manager': ['leadership', 'operations_management', 'problem_solving'],
      'prep_cook': ['culinary_arts', 'food_safety', 'efficiency']
    };

    const competencies = roleCompetencies[role] || ['general'];
    
    return competencies.map(comp => ({
      area_name: comp,
      proficiency_level: 'intermediate' as const,
      years_experience: 2,
      certification_status: 'none' as const,
      strengths: [],
      areas_for_improvement: []
    }));
  }

  private analyzeRestaurantSkills(staffProfiles: StaffSkillProfile[]): SkillGapAnalysis['restaurant_skill_overview'] {
    const allSkills = new Set<string>();
    const skillCategories = new Set<string>();
    let totalCompetency = 0;

    for (const staff of staffProfiles) {
      for (const skill of staff.skill_levels) {
        allSkills.add(skill.skill_name);
        skillCategories.add(skill.skill_category);
        totalCompetency += skill.current_level;
      }
    }

    const avgCompetency = staffProfiles.length > 0 ? totalCompetency / (staffProfiles.length * 10) * 100 : 0;

    return {
      total_staff_analyzed: staffProfiles.length,
      skill_categories_covered: Array.from(skillCategories),
      overall_competency_level: Math.round(avgCompetency),
      areas_of_strength: ['food_preparation', 'customer_service'], // Would be calculated
      critical_skill_gaps: ['advanced_cooking', 'leadership'] // Would be calculated
    };
  }

  private async analyzeSOpCoverage(staffProfiles: StaffSkillProfile[], sops: any[]): Promise<SkillGapAnalysis['sop_coverage_analysis']> {
    let fullyCovered = 0;
    let partiallyCovered = 0;
    let uncovered = 0;
    const highRiskSOPs: SkillGapAnalysis['sop_coverage_analysis']['high_risk_sops'] = [];

    for (const sop of sops) {
      const sopRequirements = this.extractSOPSkillRequirements(sop);
      const coverage = this.calculateSOPCoverage(staffProfiles, sopRequirements);

      if (coverage >= 0.8) fullyCovered++;
      else if (coverage >= 0.4) partiallyCovered++;
      else {
        uncovered++;
        if (coverage < 0.2) {
          highRiskSOPs.push({
            sop_id: sop.id,
            title: sop.title,
            risk_reason: 'Insufficient staff skills',
            mitigation_suggestions: ['Hire skilled staff', 'Intensive training program']
          });
        }
      }
    }

    return {
      total_sops_analyzed: sops.length,
      fully_covered_sops: fullyCovered,
      partially_covered_sops: partiallyCovered,
      uncovered_sops: uncovered,
      high_risk_sops: highRiskSOPs
    };
  }

  private calculateSOPCoverage(staffProfiles: StaffSkillProfile[], sopReq: SOPSkillRequirements): number {
    // Find the staff member with the best coverage for this SOP
    let bestCoverage = 0;

    for (const staff of staffProfiles) {
      let coverage = 0;
      let totalRequired = 0;

      for (const requiredSkill of sopReq.required_skills) {
        const staffSkill = staff.skill_levels.find(s => s.skill_name === requiredSkill.skill_name);
        const skillLevel = staffSkill?.current_level || 0;
        const requiredLevel = requiredSkill.minimum_level;
        
        coverage += Math.min(1, skillLevel / requiredLevel);
        totalRequired += 1;
      }

      const staffCoverage = totalRequired > 0 ? coverage / totalRequired : 0;
      bestCoverage = Math.max(bestCoverage, staffCoverage);
    }

    return bestCoverage;
  }

  private generateIndividualRecommendations(staff: StaffSkillProfile, sops: any[]): SkillGapAnalysis['individual_recommendations'][0] {
    // Analyze skill development priorities
    const skillDevelopmentPriorities = staff.skill_levels
      .filter(skill => skill.current_level < 7) // Below proficient level
      .map(skill => ({
        skill_name: skill.skill_name,
        current_level: skill.current_level,
        target_level: Math.min(10, skill.current_level + 2),
        business_impact: skill.current_level < 4 ? 'high' as const : 'medium' as const,
        development_path: [`${skill.skill_name} training`, 'Practice assignments', 'Skill assessment']
      }))
      .slice(0, 3);

    return {
      user_id: staff.user_id,
      full_name: staff.full_name,
      current_role: staff.role,
      skill_development_priorities: skillDevelopmentPriorities,
      cross_training_opportunities: ['customer_service', 'food_safety'], // Would be calculated
      promotion_readiness: {
        ready_for_roles: staff.role === 'server' ? ['senior_server'] : [],
        skills_needed_for_advancement: ['leadership', 'training_skills']
      }
    };
  }

  private generateTeamOptimizationSuggestions(
    staffProfiles: StaffSkillProfile[], 
    coverage: SkillGapAnalysis['sop_coverage_analysis']
  ): SkillGapAnalysis['team_optimization_suggestions'] {
    const suggestions: SkillGapAnalysis['team_optimization_suggestions'] = [];

    if (coverage.uncovered_sops > coverage.total_sops_analyzed * 0.2) {
      suggestions.push({
        suggestion_type: 'skill_development',
        description: 'Focus on developing critical skills to improve SOP coverage',
        expected_benefit: 'Reduced operational risk and improved service quality',
        implementation_effort: 'medium',
        priority: 'high'
      });
    }

    if (staffProfiles.length < 5) {
      suggestions.push({
        suggestion_type: 'staffing',
        description: 'Consider hiring additional staff with complementary skills',
        expected_benefit: 'Better SOP coverage and reduced individual workload',
        implementation_effort: 'high',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  private async storeMatchingResults(results: SkillMatchingResult[]): Promise<void> {
    if (results.length === 0) return;

    const matchingData = results.map(result => ({
      restaurant_id: this.restaurantId,
      matching_id: result.matching_id,
      sop_id: result.sop_id,
      user_id: result.user_id,
      match_score: result.match_score,
      confidence_level: result.confidence_level,
      skill_compatibility: result.skill_compatibility,
      performance_prediction: result.performance_prediction,
      assignment_recommendation: result.assignment_recommendation,
      development_opportunities: result.development_opportunities,
      created_at: result.created_at,
      expires_at: result.expires_at
    }));

    await supabaseAdmin
      .from('skill_matching_results')
      .insert(matchingData);
  }
}

/**
 * GET /api/sop/skill-matching - Get skill-based SOP assignments and analysis
 */
async function handleGetSkillMatching(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const sopId = searchParams.get('sop_id');
    const userId = searchParams.get('user_id');
    const includeAnalysis = searchParams.get('include_analysis') === 'true';
    const minMatchScore = parseInt(searchParams.get('min_match_score') || '50');

    // Get skill matching configuration
    const { data: config } = await supabaseAdmin
      .from('skill_matching_configurations')
      .select('*')
      .eq('restaurant_id', context.restaurantId)
      .single();

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Skill matching not configured',
        errorCode: 'NOT_CONFIGURED',
      } as APIResponse, { status: 404 });
    }

    // Build query for skill matching results
    let query = supabaseAdmin
      .from('skill_matching_results')
      .select(`
        *,
        sop_documents(id, title, title_fr, category:sop_categories(name, name_fr)),
        auth_users(id, full_name, role)
      `)
      .eq('restaurant_id', context.restaurantId)
      .gte('match_score', minMatchScore)
      .gt('expires_at', new Date().toISOString());

    if (sopId) {
      query = query.eq('sop_id', sopId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    query = query
      .order('match_score', { ascending: false })
      .order('confidence_level', { ascending: false })
      .limit(50);

    const { data: matchingResults, error } = await query;

    if (error) {
      console.error('Error fetching skill matching results:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch skill matching results',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    const responseData: any = {
      configuration: {
        matching_algorithm: config.matching_algorithm,
        threshold_settings: config.threshold_settings,
        assignment_preferences: config.assignment_preferences,
        matching_status: config.matching_status
      },
      matching_results: matchingResults || []
    };

    if (includeAnalysis) {
      const manager = new StaffSkillMatchingManager(context);
      await manager.initialize();
      
      const skillGapAnalysis = await manager.generateSkillGapAnalysis();
      responseData.skill_gap_analysis = skillGapAnalysis;
    }

    const response: APIResponse = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/skill-matching:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'SKILL_MATCHING_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/skill-matching - Generate skill-based assignments
 */
async function handleGenerateSkillMatching(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { sop_ids, target_date, include_development_opportunities = true } = sanitizeInput(body);

    if (!sop_ids || !Array.isArray(sop_ids) || sop_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'sop_ids array is required and cannot be empty',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const manager = new StaffSkillMatchingManager(context);
    await manager.initialize();

    // Generate skill-based assignments
    const matchingResults = await manager.generateSkillBasedAssignments(sop_ids, target_date);

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'skill_matching',
      null,
      null,
      { 
        sop_count: sop_ids.length,
        matches_generated: matchingResults.length,
        target_date
      },
      request
    );

    const response: APIResponse<SkillMatchingResult[]> = {
      success: true,
      data: matchingResults,
      message: `Generated ${matchingResults.length} skill-based SOP assignments`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/skill-matching:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'SKILL_MATCHING_GENERATION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Route handlers with authentication
export const GET = withAuth(handleGetSkillMatching, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleGenerateSkillMatching, PERMISSIONS.SOP.CREATE, {
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