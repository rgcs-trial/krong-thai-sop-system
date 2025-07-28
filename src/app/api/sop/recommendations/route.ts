/**
 * SOP AI Recommendations API Route
 * Handles AI-powered SOP recommendations based on user behavior, skills, and context
 * 
 * GET    /api/sop/recommendations      - Get personalized SOP recommendations
 * POST   /api/sop/recommendations      - Track recommendation interaction (accepted/dismissed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  PaginatedResponse,
  SOPAuthContext 
} from '@/types/api/sop';

// Types for AI recommendation system
interface SOPRecommendation {
  id: string;
  sop_document_id: string;
  recommendation_type: 'similar' | 'next_step' | 'skill_based' | 'contextual' | 'trending';
  confidence_score: number;
  reasoning: {
    factors: string[];
    score_breakdown: Record<string, number>;
    context_match: number;
  };
  context_factors: {
    user_role: string;
    recent_completions: string[];
    skill_level: number;
    time_of_day: string;
    restaurant_context: Record<string, any>;
  };
  sop: {
    id: string;
    title: string;
    title_fr: string;
    category_name: string;
    category_name_fr: string;
    difficulty_level: string;
    estimated_read_time: number;
    tags: string[];
  };
  expires_at: string;
  created_at: string;
}

interface RecommendationInteraction {
  recommendation_id: string;
  action: 'viewed' | 'accepted' | 'dismissed';
  interaction_context?: Record<string, any>;
}

/**
 * AI Recommendation Scoring Algorithm
 * Combines multiple factors to generate personalized SOP recommendations
 */
class SOPRecommendationEngine {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Generate personalized SOP recommendations
   */
  async generateRecommendations(limit: number = 10): Promise<SOPRecommendation[]> {
    // Get user profile and behavior data
    const userProfile = await this.getUserProfile();
    const recentActivity = await this.getRecentActivity();
    const skillProfile = await this.getUserSkillProfile();
    const contextualFactors = await this.getContextualFactors();

    // Get candidate SOPs
    const candidateSOPs = await this.getCandidateSOPs();

    // Score and rank recommendations
    const scoredRecommendations = await Promise.all(
      candidateSOPs.map(sop => this.scoreRecommendation(sop, {
        userProfile,
        recentActivity,
        skillProfile,
        contextualFactors
      }))
    );

    // Sort by confidence score and filter top recommendations
    const topRecommendations = scoredRecommendations
      .filter(rec => rec.confidence_score > 0.3) // Minimum confidence threshold
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, limit);

    // Store recommendations in database
    await this.storeRecommendations(topRecommendations);

    return topRecommendations;
  }

  /**
   * Get user profile information
   */
  private async getUserProfile() {
    const { data: user } = await supabaseAdmin
      .from('auth_users')
      .select(`
        id, role, full_name, email,
        user_progress(
          sop_id, 
          progress_percentage, 
          time_spent, 
          last_accessed,
          sop_documents(category_id, difficulty_level, tags)
        )
      `)
      .eq('id', this.context.userId)
      .single();

    return user;
  }

  /**
   * Get recent user activity and behavior patterns
   */
  private async getRecentActivity() {
    const { data: activity } = await supabaseAdmin
      .from('user_behavior_patterns')
      .select('*')
      .eq('user_id', this.context.userId)
      .eq('restaurant_id', this.restaurantId)
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('timestamp', { ascending: false })
      .limit(100);

    return activity || [];
  }

  /**
   * Get user skill profile
   */
  private async getUserSkillProfile() {
    const { data: skills } = await supabaseAdmin
      .from('staff_skill_profiles')
      .select('*')
      .eq('user_id', this.context.userId)
      .eq('restaurant_id', this.restaurantId);

    return skills || [];
  }

  /**
   * Get contextual factors (time, restaurant state, equipment, etc.)
   */
  private async getContextualFactors() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Determine service period
    let servicePeriod = 'off';
    if (hour >= 6 && hour < 11) servicePeriod = 'breakfast';
    else if (hour >= 11 && hour < 15) servicePeriod = 'lunch';
    else if (hour >= 17 && hour < 22) servicePeriod = 'dinner';

    // Get equipment availability
    const { data: equipment } = await supabaseAdmin
      .from('equipment_availability')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .eq('status', 'available');

    // Get environmental factors
    const { data: environmentalFactors } = await supabaseAdmin
      .from('environmental_factors')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('recorded_at', { ascending: false })
      .limit(10);

    return {
      hour,
      dayOfWeek,
      servicePeriod,
      availableEquipment: equipment || [],
      environmentalFactors: environmentalFactors || []
    };
  }

  /**
   * Get candidate SOPs for recommendation
   */
  private async getCandidateSOPs() {
    const { data: sops } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        *,
        category:sop_categories!inner(id, name, name_fr, icon, color),
        completion_stats:user_progress(progress_percentage, last_accessed)
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .eq('status', 'approved');

    return sops || [];
  }

  /**
   * Score a single SOP recommendation based on multiple factors
   */
  private async scoreRecommendation(sop: any, userContext: {
    userProfile: any;
    recentActivity: any[];
    skillProfile: any[];
    contextualFactors: any;
  }): Promise<SOPRecommendation> {
    const scores: Record<string, number> = {};
    const factors: string[] = [];

    // 1. Skill-based scoring (0-0.3)
    const skillScore = this.calculateSkillScore(sop, userContext.skillProfile);
    scores.skill_match = skillScore;
    if (skillScore > 0.2) factors.push('skill_alignment');

    // 2. Role-based relevance (0-0.25)
    const roleScore = this.calculateRoleRelevance(sop, userContext.userProfile.role);
    scores.role_relevance = roleScore;
    if (roleScore > 0.15) factors.push('role_specific');

    // 3. Contextual relevance (0-0.2)
    const contextScore = this.calculateContextualRelevance(sop, userContext.contextualFactors);
    scores.contextual_relevance = contextScore;
    if (contextScore > 0.1) factors.push('contextually_relevant');

    // 4. Completion pattern analysis (0-0.15)
    const patternScore = this.calculatePatternScore(sop, userContext.recentActivity);
    scores.pattern_match = patternScore;
    if (patternScore > 0.1) factors.push('follows_pattern');

    // 5. Freshness and priority (0-0.1)
    const freshnessScore = this.calculateFreshnessScore(sop);
    scores.freshness = freshnessScore;
    if (freshnessScore > 0.05) factors.push('recently_updated');

    // Calculate final confidence score
    const confidenceScore = Math.min(1.0, Object.values(scores).reduce((sum, score) => sum + score, 0));

    // Determine recommendation type
    let recommendationType: SOPRecommendation['recommendation_type'] = 'contextual';
    if (skillScore > 0.2) recommendationType = 'skill_based';
    else if (patternScore > 0.1) recommendationType = 'similar';
    else if (contextScore > 0.15) recommendationType = 'contextual';

    return {
      id: `rec_${sop.id}_${Date.now()}`,
      sop_document_id: sop.id,
      recommendation_type: recommendationType,
      confidence_score: Math.round(confidenceScore * 1000) / 1000,
      reasoning: {
        factors,
        score_breakdown: scores,
        context_match: contextScore
      },
      context_factors: {
        user_role: userContext.userProfile.role,
        recent_completions: userContext.recentActivity
          .filter(a => a.behavior_type === 'sop_access')
          .slice(0, 5)
          .map(a => a.behavior_data?.sop_id)
          .filter(Boolean),
        skill_level: this.getAverageSkillLevel(userContext.skillProfile),
        time_of_day: userContext.contextualFactors.servicePeriod,
        restaurant_context: {
          available_equipment: userContext.contextualFactors.availableEquipment.length,
          environmental_factors: userContext.contextualFactors.environmentalFactors.length
        }
      },
      sop: {
        id: sop.id,
        title: sop.title,
        title_fr: sop.title_fr,
        category_name: sop.category.name,
        category_name_fr: sop.category.name_fr,
        difficulty_level: sop.difficulty_level,
        estimated_read_time: sop.estimated_read_time,
        tags: sop.tags || []
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      created_at: new Date().toISOString()
    };
  }

  /**
   * Calculate skill-based scoring
   */
  private calculateSkillScore(sop: any, skillProfile: any[]): number {
    if (!skillProfile.length) return 0.1; // Base score for users without skill data

    // Map SOP tags to skills
    const sopSkills = sop.tags || [];
    const relevantSkills = skillProfile.filter(skill => 
      sopSkills.some(tag => tag.toLowerCase().includes(skill.skill_name.toLowerCase()))
    );

    if (!relevantSkills.length) return 0.05;

    // Calculate average proficiency for relevant skills
    const avgProficiency = relevantSkills.reduce((sum, skill) => sum + skill.proficiency_level, 0) / relevantSkills.length;
    
    // Score based on skill alignment with SOP difficulty
    const difficultyMultiplier = {
      'beginner': avgProficiency <= 4 ? 1.0 : 0.7,
      'intermediate': avgProficiency >= 4 && avgProficiency <= 7 ? 1.0 : 0.8,
      'advanced': avgProficiency >= 7 ? 1.0 : 0.6
    };

    return Math.min(0.3, (avgProficiency / 10) * (difficultyMultiplier[sop.difficulty_level as keyof typeof difficultyMultiplier] || 0.5));
  }

  /**
   * Calculate role-based relevance
   */
  private calculateRoleRelevance(sop: any, userRole: string): number {
    const roleRelevance: Record<string, string[]> = {
      'chef': ['food_preparation', 'cooking', 'kitchen', 'recipes'],
      'server': ['service', 'customer', 'dining', 'orders'],
      'manager': ['management', 'oversight', 'operations', 'admin'],
      'admin': [] // Admin can access all SOPs equally
    };

    if (userRole === 'admin') return 0.2; // Base relevance for admin

    const roleKeywords = roleRelevance[userRole] || [];
    const sopTags = (sop.tags || []).map((tag: string) => tag.toLowerCase());
    const sopTitle = sop.title.toLowerCase();
    const sopCategory = sop.category.name.toLowerCase();

    let relevanceScore = 0.05; // Base score

    // Check tag matches
    const tagMatches = roleKeywords.filter(keyword => 
      sopTags.some(tag => tag.includes(keyword))
    ).length;

    // Check title matches
    const titleMatches = roleKeywords.filter(keyword => 
      sopTitle.includes(keyword)
    ).length;

    // Check category matches
    const categoryMatches = roleKeywords.filter(keyword => 
      sopCategory.includes(keyword)
    ).length;

    relevanceScore += (tagMatches * 0.05) + (titleMatches * 0.07) + (categoryMatches * 0.08);

    return Math.min(0.25, relevanceScore);
  }

  /**
   * Calculate contextual relevance based on time, equipment, etc.
   */
  private calculateContextualRelevance(sop: any, contextualFactors: any): number {
    let contextScore = 0;

    // Time-based relevance
    const timeRelevant = this.isTimeRelevant(sop, contextualFactors.servicePeriod);
    if (timeRelevant) contextScore += 0.1;

    // Equipment availability
    const requiredEquipment = this.extractRequiredEquipment(sop);
    const availableEquipmentNames = contextualFactors.availableEquipment.map((eq: any) => eq.equipment_name.toLowerCase());
    const equipmentAvailable = requiredEquipment.every(req => 
      availableEquipmentNames.some(avail => avail.includes(req.toLowerCase()))
    );
    if (equipmentAvailable) contextScore += 0.05;

    // Environmental factors
    if (contextualFactors.environmentalFactors.length > 0) {
      const environmentalMatch = this.checkEnvironmentalMatch(sop, contextualFactors.environmentalFactors);
      contextScore += environmentalMatch ? 0.05 : 0;
    }

    return Math.min(0.2, contextScore);
  }

  /**
   * Calculate pattern-based scoring
   */
  private calculatePatternScore(sop: any, recentActivity: any[]): number {
    if (!recentActivity.length) return 0.05;

    // Analyze recent SOP access patterns
    const recentSOPs = recentActivity
      .filter(activity => activity.behavior_type === 'sop_access')
      .map(activity => activity.behavior_data?.sop_id)
      .filter(Boolean);

    if (!recentSOPs.length) return 0.05;

    // Check if this SOP is in a similar category or has similar tags
    const similarityScore = this.calculateSOPSimilarity(sop, recentSOPs);
    
    return Math.min(0.15, similarityScore);
  }

  /**
   * Calculate freshness score
   */
  private calculateFreshnessScore(sop: any): number {
    const now = new Date();
    const updatedAt = new Date(sop.updated_at);
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Fresher SOPs get higher scores
    if (daysSinceUpdate <= 7) return 0.1;
    if (daysSinceUpdate <= 30) return 0.07;
    if (daysSinceUpdate <= 90) return 0.05;
    return 0.02;
  }

  /**
   * Helper methods
   */
  private getAverageSkillLevel(skillProfile: any[]): number {
    if (!skillProfile.length) return 5; // Default middle skill level
    return skillProfile.reduce((sum, skill) => sum + skill.proficiency_level, 0) / skillProfile.length;
  }

  private isTimeRelevant(sop: any, servicePeriod: string): boolean {
    const sopTags = (sop.tags || []).map((tag: string) => tag.toLowerCase());
    const timeKeywords: Record<string, string[]> = {
      'breakfast': ['breakfast', 'morning', 'opening'],
      'lunch': ['lunch', 'midday', 'service'],
      'dinner': ['dinner', 'evening', 'closing'],
      'off': ['cleaning', 'prep', 'maintenance']
    };

    const relevantKeywords = timeKeywords[servicePeriod] || [];
    return relevantKeywords.some(keyword => 
      sopTags.some(tag => tag.includes(keyword)) || 
      sop.title.toLowerCase().includes(keyword)
    );
  }

  private extractRequiredEquipment(sop: any): string[] {
    // Simple extraction from title and tags
    const equipment = ['oven', 'grill', 'fryer', 'mixer', 'blender', 'refrigerator', 'freezer'];
    const sopText = `${sop.title} ${(sop.tags || []).join(' ')}`.toLowerCase();
    
    return equipment.filter(eq => sopText.includes(eq));
  }

  private checkEnvironmentalMatch(sop: any, environmentalFactors: any[]): boolean {
    // Simple environmental factor matching
    return environmentalFactors.some(factor => 
      factor.factor_type === 'peak_hours' || factor.factor_type === 'staff_levels'
    );
  }

  private calculateSOPSimilarity(sop: any, recentSOPs: string[]): number {
    // This would ideally use embedding similarity, but for now we'll use category and tag similarity
    let similarityScore = 0.05; // Base score

    // Check if any recent SOPs are from the same category
    // Note: This would require fetching the recent SOPs' details
    // For now, we'll return a modest similarity score
    
    return similarityScore;
  }

  /**
   * Store recommendations in the database
   */
  private async storeRecommendations(recommendations: SOPRecommendation[]): Promise<void> {
    const recommendationData = recommendations.map(rec => ({
      user_id: this.context.userId,
      restaurant_id: this.restaurantId,
      sop_document_id: rec.sop_document_id,
      recommendation_type: rec.recommendation_type,
      confidence_score: rec.confidence_score,
      reasoning: rec.reasoning,
      context_factors: rec.context_factors,
      expires_at: rec.expires_at
    }));

    await supabaseAdmin
      .from('sop_recommendations')
      .insert(recommendationData);
  }
}

/**
 * GET /api/sop/recommendations - Get personalized SOP recommendations
 */
async function handleGetRecommendations(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 recommendations
    const recommendationType = searchParams.get('type') as SOPRecommendation['recommendation_type'] | null;
    const includeExpired = searchParams.get('include_expired') === 'true';
    const refresh = searchParams.get('refresh') === 'true';

    // Validate pagination
    const paginationValidation = validatePagination({ page, limit });
    if (!paginationValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters',
        details: paginationValidation.errors,
      } as APIResponse, { status: 400 });
    }

    let recommendations: SOPRecommendation[] = [];

    if (refresh) {
      // Generate fresh recommendations using AI engine
      const engine = new SOPRecommendationEngine(context);
      recommendations = await engine.generateRecommendations(limit);
    } else {
      // Fetch existing recommendations from database
      let query = supabaseAdmin
        .from('sop_recommendations')
        .select(`
          *,
          sop_document:sop_documents!inner(
            id, title, title_fr, difficulty_level, estimated_read_time, tags,
            category:sop_categories!inner(id, name, name_fr, icon, color)
          )
        `)
        .eq('user_id', context.userId)
        .eq('restaurant_id', context.restaurantId)
        .is('is_dismissed', false);

      if (!includeExpired) {
        query = query.gt('expires_at', new Date().toISOString());
      }

      if (recommendationType) {
        query = query.eq('recommendation_type', recommendationType);
      }

      query = query
        .order('confidence_score', { ascending: false })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data: dbRecommendations, error } = await query;

      if (error) {
        console.error('Error fetching recommendations:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch recommendations',
          errorCode: 'DATABASE_ERROR',
        } as APIResponse, { status: 500 });
      }

      // Transform database results to expected format
      recommendations = (dbRecommendations || []).map(rec => ({
        id: rec.id,
        sop_document_id: rec.sop_document_id,
        recommendation_type: rec.recommendation_type,
        confidence_score: rec.confidence_score,
        reasoning: rec.reasoning,
        context_factors: rec.context_factors,
        sop: {
          id: rec.sop_document.id,
          title: rec.sop_document.title,
          title_fr: rec.sop_document.title_fr,
          category_name: rec.sop_document.category.name,
          category_name_fr: rec.sop_document.category.name_fr,
          difficulty_level: rec.sop_document.difficulty_level,
          estimated_read_time: rec.sop_document.estimated_read_time,
          tags: rec.sop_document.tags || []
        },
        expires_at: rec.expires_at,
        created_at: rec.created_at
      }));

      // If no existing recommendations found, generate fresh ones
      if (recommendations.length === 0) {
        const engine = new SOPRecommendationEngine(context);
        recommendations = await engine.generateRecommendations(limit);
      }
    }

    // Record behavior for future recommendations
    await supabaseAdmin
      .from('user_behavior_patterns')
      .insert({
        user_id: context.userId,
        restaurant_id: context.restaurantId,
        behavior_type: 'sop_access',
        behavior_data: {
          action: 'view_recommendations',
          recommendation_count: recommendations.length,
          recommendation_types: [...new Set(recommendations.map(r => r.recommendation_type))]
        },
        context_data: {
          page,
          limit,
          refresh,
          user_agent: request.headers.get('user-agent')
        }
      });

    const response: APIResponse<SOPRecommendation[]> = {
      success: true,
      data: recommendations,
      message: refresh ? 'Fresh recommendations generated' : 'Recommendations retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/recommendations:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/recommendations - Track recommendation interaction
 */
async function handleRecommendationInteraction(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const interaction = sanitizeInput(body) as RecommendationInteraction;

    if (!interaction.recommendation_id || !interaction.action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: recommendation_id and action',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    if (!['viewed', 'accepted', 'dismissed'].includes(interaction.action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be one of: viewed, accepted, dismissed',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Update recommendation in database
    const updateData: any = {};
    
    if (interaction.action === 'viewed') {
      updateData.viewed_at = new Date().toISOString();
    } else if (interaction.action === 'accepted') {
      updateData.is_accepted = true;
      updateData.accepted_at = new Date().toISOString();
    } else if (interaction.action === 'dismissed') {
      updateData.is_dismissed = true;
      updateData.dismissed_at = new Date().toISOString();
    }

    const { data: updatedRecommendation, error } = await supabaseAdmin
      .from('sop_recommendations')
      .update(updateData)
      .eq('id', interaction.recommendation_id)
      .eq('user_id', context.userId)
      .eq('restaurant_id', context.restaurantId)
      .select('*')
      .single();

    if (error || !updatedRecommendation) {
      return NextResponse.json({
        success: false,
        error: 'Recommendation not found or access denied',
        errorCode: 'NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Record interaction behavior for future learning
    await supabaseAdmin
      .from('user_behavior_patterns')
      .insert({
        user_id: context.userId,
        restaurant_id: context.restaurantId,
        behavior_type: 'interaction',
        behavior_data: {
          action: `recommendation_${interaction.action}`,
          recommendation_id: interaction.recommendation_id,
          recommendation_type: updatedRecommendation.recommendation_type,
          confidence_score: updatedRecommendation.confidence_score,
          sop_id: updatedRecommendation.sop_document_id,
          context: interaction.interaction_context || {}
        }
      });

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'sop_recommendation',
      interaction.recommendation_id,
      null,
      { action: interaction.action },
      request
    );

    const response: APIResponse = {
      success: true,
      data: updatedRecommendation,
      message: `Recommendation ${interaction.action} recorded successfully`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/recommendations:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetRecommendations, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleRecommendationInteraction, PERMISSIONS.SOP.READ, {
  maxRequests: 200,
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