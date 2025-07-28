/**
 * SOP Automated Scheduling API Route
 * Handles intelligent scheduling of SOPs based on restaurant flow, peak times, and operational patterns
 * 
 * GET    /api/sop/auto-schedule         - Get automated schedule recommendations
 * POST   /api/sop/auto-schedule         - Create automated schedules
 * PUT    /api/sop/auto-schedule         - Update schedule configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface AutoScheduleConfig {
  id?: string;
  sop_id: string;
  schedule_type: 'peak_based' | 'flow_based' | 'staff_based' | 'maintenance' | 'smart_adaptive';
  priority: 'low' | 'medium' | 'high' | 'critical';
  operational_context: {
    service_periods?: ('breakfast' | 'lunch' | 'dinner' | 'late_night' | 'off_hours')[];
    staff_requirements?: {
      min_staff_count: number;
      required_roles: string[];
      skill_level_required?: number;
    };
    equipment_dependencies?: string[];
    peak_avoidance?: boolean;
    optimal_timing?: 'pre_service' | 'during_service' | 'post_service' | 'any';
  };
  frequency_config: {
    base_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed';
    adaptive_adjustment: boolean;
    max_frequency_per_day?: number;
    min_interval_hours?: number;
  };
  performance_criteria: {
    target_completion_rate: number;
    max_completion_time: number;
    quality_threshold: number;
  };
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ScheduleRecommendation {
  sop_id: string;
  recommended_times: {
    datetime: string;
    confidence_score: number;
    reasoning: string[];
    optimal_duration_minutes: number;
    staff_availability: {
      available_count: number;
      required_roles_present: boolean;
      skill_match_score: number;
    };
    operational_factors: {
      peak_hour_conflict: boolean;
      equipment_available: boolean;
      contextual_appropriateness: number;
    };
  }[];
  schedule_type: string;
  next_review_date: string;
}

/**
 * Intelligent SOP Scheduling Engine
 * Analyzes restaurant operations to optimize SOP scheduling
 */
class SOPSchedulingEngine {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Generate automated scheduling recommendations
   */
  async generateScheduleRecommendations(sopIds?: string[]): Promise<ScheduleRecommendation[]> {
    // Get SOPs to schedule
    const sops = await this.getSchedulableSops(sopIds);
    
    // Get operational context
    const operationalData = await this.getOperationalContext();
    
    // Generate recommendations for each SOP
    const recommendations: ScheduleRecommendation[] = [];
    
    for (const sop of sops) {
      const recommendation = await this.generateSopScheduleRecommendation(sop, operationalData);
      if (recommendation.recommended_times.length > 0) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Create automated schedules based on recommendations
   */
  async createAutomatedSchedules(configs: AutoScheduleConfig[]): Promise<AutoScheduleConfig[]> {
    const createdSchedules: AutoScheduleConfig[] = [];

    for (const config of configs) {
      // Validate SOP exists and is schedulable
      const sopExists = await this.validateSop(config.sop_id);
      if (!sopExists) continue;

      // Generate initial schedule recommendations
      const recommendations = await this.generateScheduleRecommendations([config.sop_id]);
      if (recommendations.length === 0) continue;

      // Create schedule configuration
      const scheduleConfig = await this.createScheduleConfig(config, recommendations[0]);
      if (scheduleConfig) {
        createdSchedules.push(scheduleConfig);
      }
    }

    return createdSchedules;
  }

  /**
   * Get SOPs that can be scheduled
   */
  private async getSchedulableSops(sopIds?: string[]) {
    let query = supabaseAdmin
      .from('sop_documents')
      .select(`
        *,
        category:sop_categories!inner(id, name, name_fr),
        completion_stats:user_progress(
          progress_percentage,
          time_spent,
          last_accessed,
          user_id,
          user:auth_users!inner(role)
        )
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .eq('status', 'approved');

    if (sopIds && sopIds.length > 0) {
      query = query.in('id', sopIds);
    }

    const { data } = await query;
    return data || [];
  }

  /**
   * Get operational context for scheduling decisions
   */
  private async getOperationalContext() {
    // Get recent completion patterns
    const { data: completionPatterns } = await supabaseAdmin
      .from('sop_completion_patterns')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('confidence_level', { ascending: false });

    // Get staff availability patterns
    const { data: staffPatterns } = await supabaseAdmin
      .from('user_behavior_patterns')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .eq('behavior_type', 'sop_access')
      .gte('timestamp', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) // Last 14 days
      .order('timestamp', { ascending: false });

    // Get equipment availability
    const { data: equipment } = await supabaseAdmin
      .from('equipment_availability')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .in('status', ['available', 'maintenance']);

    // Get environmental factors
    const { data: environmentalFactors } = await supabaseAdmin
      .from('environmental_factors')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('recorded_at', { ascending: false });

    // Get current staff on duty
    const { data: currentStaff } = await supabaseAdmin
      .from('auth_users')
      .select('id, role, full_name')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    return {
      completionPatterns: completionPatterns || [],
      staffPatterns: staffPatterns || [],
      equipment: equipment || [],
      environmentalFactors: environmentalFactors || [],
      currentStaff: currentStaff || []
    };
  }

  /**
   * Generate schedule recommendation for a specific SOP
   */
  private async generateSopScheduleRecommendation(sop: any, operationalData: any): Promise<ScheduleRecommendation> {
    const now = new Date();
    const recommendedTimes: ScheduleRecommendation['recommended_times'] = [];

    // Analyze historical completion patterns for this SOP
    const sopPatterns = operationalData.completionPatterns.filter(
      (pattern: any) => pattern.sop_document_id === sop.id
    );

    // Determine optimal schedule type based on SOP characteristics
    const scheduleType = this.determineOptimalScheduleType(sop, sopPatterns);

    // Generate recommendations for the next 7 days
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayRecommendations = await this.generateDayRecommendations(
        sop,
        targetDate,
        operationalData,
        scheduleType
      );
      recommendedTimes.push(...dayRecommendations);
    }

    // Sort by confidence score and take top recommendations
    recommendedTimes.sort((a, b) => b.confidence_score - a.confidence_score);

    return {
      sop_id: sop.id,
      recommended_times: recommendedTimes.slice(0, 10), // Top 10 recommendations
      schedule_type: scheduleType,
      next_review_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Determine optimal schedule type for SOP
   */
  private determineOptimalScheduleType(sop: any, patterns: any[]): string {
    const tags = sop.tags || [];
    const category = sop.category.name.toLowerCase();
    
    // Maintenance-related SOPs
    if (tags.some((tag: string) => tag.toLowerCase().includes('maintenance')) ||
        category.includes('maintenance') || category.includes('cleaning')) {
      return 'maintenance';
    }

    // Food safety and critical operations
    if (tags.some((tag: string) => ['safety', 'critical', 'opening', 'closing'].includes(tag.toLowerCase())) ||
        sop.difficulty_level === 'advanced') {
      return 'peak_based';
    }

    // Training and skill-based SOPs
    if (tags.some((tag: string) => ['training', 'skill', 'learn'].includes(tag.toLowerCase())) ||
        category.includes('training')) {
      return 'staff_based';
    }

    // Check if patterns suggest specific timing preferences
    const timePattern = patterns.find((p: any) => p.pattern_type === 'completion_time');
    if (timePattern && timePattern.pattern_data.peak_hours) {
      return 'flow_based';
    }

    return 'smart_adaptive';
  }

  /**
   * Generate recommendations for a specific day
   */
  private async generateDayRecommendations(
    sop: any,
    targetDate: Date,
    operationalData: any,
    scheduleType: string
  ): Promise<ScheduleRecommendation['recommended_times']> {
    const recommendations: ScheduleRecommendation['recommended_times'] = [];
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Define potential time slots based on restaurant operations
    const timeSlots = this.getTimeSlots(scheduleType, isWeekend);

    for (const slot of timeSlots) {
      const slotDateTime = new Date(targetDate);
      slotDateTime.setHours(slot.hour, slot.minute, 0, 0);

      // Skip past times
      if (slotDateTime < new Date()) continue;

      const recommendation = await this.evaluateTimeSlot(
        sop,
        slotDateTime,
        operationalData,
        scheduleType
      );

      if (recommendation.confidence_score > 0.4) { // Minimum confidence threshold
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Get potential time slots based on schedule type
   */
  private getTimeSlots(scheduleType: string, isWeekend: boolean): { hour: number; minute: number }[] {
    const baseSlots = [
      { hour: 6, minute: 0 },   // Early morning
      { hour: 8, minute: 30 },  // Pre-breakfast
      { hour: 10, minute: 0 },  // Post-breakfast
      { hour: 14, minute: 0 },  // Post-lunch
      { hour: 16, minute: 30 }, // Pre-dinner prep
      { hour: 22, minute: 0 },  // Post-dinner
      { hour: 23, minute: 30 }  // Late cleaning
    ];

    switch (scheduleType) {
      case 'maintenance':
        return isWeekend 
          ? [{ hour: 8, minute: 0 }, { hour: 14, minute: 0 }, { hour: 20, minute: 0 }]
          : [{ hour: 6, minute: 0 }, { hour: 15, minute: 0 }, { hour: 23, minute: 0 }];
      
      case 'peak_based':
        return [
          { hour: 7, minute: 0 },   // Before breakfast rush
          { hour: 11, minute: 0 },  // Before lunch rush  
          { hour: 17, minute: 0 }   // Before dinner rush
        ];
      
      case 'staff_based':
        return [
          { hour: 9, minute: 0 },   // After morning setup
          { hour: 15, minute: 30 }, // Between lunch and dinner
          { hour: 21, minute: 0 }   // After dinner service
        ];
      
      case 'flow_based':
        return baseSlots.filter(slot => 
          ![11, 12, 13, 18, 19, 20].includes(slot.hour) // Avoid peak service hours
        );
      
      default: // smart_adaptive
        return baseSlots;
    }
  }

  /**
   * Evaluate a specific time slot for scheduling
   */
  private async evaluateTimeSlot(
    sop: any,
    slotDateTime: Date,
    operationalData: any,
    scheduleType: string
  ): Promise<ScheduleRecommendation['recommended_times'][0]> {
    let confidenceScore = 0.5; // Base confidence
    const reasoning: string[] = [];
    const hour = slotDateTime.getHours();

    // Historical performance analysis
    const historicalScore = this.analyzeHistoricalPerformance(sop, hour, operationalData);
    confidenceScore += historicalScore * 0.3;
    if (historicalScore > 0.7) reasoning.push('Strong historical performance at this time');

    // Staff availability analysis
    const staffAnalysis = this.analyzeStaffAvailability(sop, hour, operationalData);
    confidenceScore += staffAnalysis.availability_score * 0.25;
    if (staffAnalysis.required_roles_present) reasoning.push('Required staff roles available');

    // Peak hour conflict analysis
    const isPeakHour = this.isPeakHour(hour);
    const peakScore = isPeakHour ? -0.3 : 0.2;
    confidenceScore += peakScore;
    if (!isPeakHour) reasoning.push('Scheduled outside peak service hours');

    // Equipment availability
    const equipmentAvailable = this.checkEquipmentAvailability(sop, operationalData);
    if (equipmentAvailable) {
      confidenceScore += 0.1;
      reasoning.push('Required equipment available');
    }

    // Contextual appropriateness
    const contextScore = this.evaluateContextualAppropriatenss(sop, hour, scheduleType);
    confidenceScore += contextScore * 0.15;
    if (contextScore > 0.7) reasoning.push('Contextually appropriate timing');

    // Ensure confidence is within bounds
    confidenceScore = Math.max(0, Math.min(1, confidenceScore));

    return {
      datetime: slotDateTime.toISOString(),
      confidence_score: Math.round(confidenceScore * 1000) / 1000,
      reasoning,
      optimal_duration_minutes: this.estimateOptimalDuration(sop, operationalData),
      staff_availability: {
        available_count: staffAnalysis.available_count,
        required_roles_present: staffAnalysis.required_roles_present,
        skill_match_score: staffAnalysis.skill_match_score
      },
      operational_factors: {
        peak_hour_conflict: isPeakHour,
        equipment_available: equipmentAvailable,
        contextual_appropriateness: contextScore
      }
    };
  }

  /**
   * Analyze historical performance at specific hours
   */
  private analyzeHistoricalPerformance(sop: any, hour: number, operationalData: any): number {
    const completions = sop.completion_stats || [];
    const hourlyCompletions = completions.filter((completion: any) => {
      const completionHour = new Date(completion.last_accessed).getHours();
      return Math.abs(completionHour - hour) <= 1; // Within 1 hour
    });

    if (hourlyCompletions.length === 0) return 0.5; // Neutral score

    const avgCompletionRate = hourlyCompletions.filter((c: any) => c.progress_percentage === 100).length / hourlyCompletions.length;
    const avgTime = hourlyCompletions.reduce((sum: number, c: any) => sum + c.time_spent, 0) / hourlyCompletions.length;
    const estimatedTime = sop.estimated_read_time || 30;

    let score = avgCompletionRate; // Base on completion rate
    if (avgTime <= estimatedTime * 1.2) score += 0.2; // Bonus for meeting time expectations

    return Math.min(1, score);
  }

  /**
   * Analyze staff availability for the time slot
   */
  private analyzeStaffAvailability(sop: any, hour: number, operationalData: any): {
    available_count: number;
    required_roles_present: boolean;
    skill_match_score: number;
    availability_score: number;
  } {
    const currentStaff = operationalData.currentStaff;
    
    // Estimate staff availability based on typical restaurant staffing patterns
    let expectedStaffCount = currentStaff.length;
    
    // Adjust for time of day
    if (hour >= 6 && hour <= 9) expectedStaffCount *= 0.7; // Morning prep
    else if (hour >= 10 && hour <= 15) expectedStaffCount *= 0.9; // Lunch service
    else if (hour >= 16 && hour <= 21) expectedStaffCount *= 1.0; // Dinner service
    else expectedStaffCount *= 0.5; // Off hours

    // Determine required roles based on SOP
    const requiredRoles = this.inferRequiredRoles(sop);
    const availableRoles = currentStaff.map((staff: any) => staff.role);
    const requiredRolesPresent = requiredRoles.every(role => availableRoles.includes(role));

    // Calculate skill match score (simplified)
    const skillMatchScore = requiredRolesPresent ? 0.8 : 0.4;

    // Calculate overall availability score
    const availabilityScore = Math.min(1, expectedStaffCount / Math.max(1, requiredRoles.length)) * 
                             (requiredRolesPresent ? 1 : 0.6);

    return {
      available_count: Math.round(expectedStaffCount),
      required_roles_present: requiredRolesPresent,
      skill_match_score: skillMatchScore,
      availability_score: availabilityScore
    };
  }

  /**
   * Check if time slot is during peak hours
   */
  private isPeakHour(hour: number): boolean {
    return (hour >= 7 && hour <= 9) ||   // Breakfast
           (hour >= 11 && hour <= 14) ||  // Lunch
           (hour >= 17 && hour <= 21);    // Dinner
  }

  /**
   * Check equipment availability for SOP
   */
  private checkEquipmentAvailability(sop: any, operationalData: any): boolean {
    const requiredEquipment = this.inferRequiredEquipment(sop);
    const availableEquipment = operationalData.equipment.filter((eq: any) => eq.status === 'available');
    
    return requiredEquipment.every(required => 
      availableEquipment.some((available: any) => 
        available.equipment_name.toLowerCase().includes(required.toLowerCase())
      )
    );
  }

  /**
   * Evaluate contextual appropriateness of timing
   */
  private evaluateContextualAppropriatenss(sop: any, hour: number, scheduleType: string): number {
    const tags = (sop.tags || []).map((tag: string) => tag.toLowerCase());
    const title = sop.title.toLowerCase();
    
    let score = 0.5; // Base score

    // Morning-appropriate tasks
    if ((hour >= 6 && hour <= 10) && 
        (tags.includes('opening') || tags.includes('prep') || title.includes('opening'))) {
      score += 0.3;
    }

    // Evening-appropriate tasks
    if ((hour >= 20 && hour <= 23) && 
        (tags.includes('closing') || tags.includes('cleaning') || title.includes('closing'))) {
      score += 0.3;
    }

    // Avoid inappropriate timing
    if ((hour >= 11 && hour <= 14) && tags.includes('maintenance')) {
      score -= 0.4; // Don't do maintenance during lunch
    }

    // Schedule type appropriateness
    if (scheduleType === 'maintenance' && (hour < 6 || hour > 23)) {
      score -= 0.2; // Maintenance should be during reasonable hours
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Estimate optimal duration for SOP completion
   */
  private estimateOptimalDuration(sop: any, operationalData: any): number {
    const completions = sop.completion_stats || [];
    
    if (completions.length > 0) {
      const avgTime = completions.reduce((sum: any, c: any) => sum + c.time_spent, 0) / completions.length;
      return Math.round(avgTime);
    }

    // Fallback to estimated read time with buffer
    return Math.round((sop.estimated_read_time || 30) * 1.2);
  }

  /**
   * Infer required roles for SOP
   */
  private inferRequiredRoles(sop: any): string[] {
    const tags = (sop.tags || []).map((tag: string) => tag.toLowerCase());
    const title = sop.title.toLowerCase();
    const category = sop.category.name.toLowerCase();

    const roles: string[] = [];

    if (tags.includes('kitchen') || title.includes('cook') || category.includes('food')) {
      roles.push('chef');
    }
    if (tags.includes('service') || title.includes('customer') || category.includes('service')) {
      roles.push('server');
    }
    if (tags.includes('management') || sop.difficulty_level === 'advanced') {
      roles.push('manager');
    }

    return roles.length > 0 ? roles : ['server']; // Default to server
  }

  /**
   * Infer required equipment for SOP
   */
  private inferRequiredEquipment(sop: any): string[] {
    const content = `${sop.title} ${(sop.tags || []).join(' ')}`.toLowerCase();
    const equipment: string[] = [];

    const equipmentKeywords = [
      'oven', 'grill', 'fryer', 'mixer', 'blender', 'refrigerator', 
      'freezer', 'dishwasher', 'register', 'terminal'
    ];

    equipmentKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        equipment.push(keyword);
      }
    });

    return equipment;
  }

  /**
   * Create schedule configuration in database
   */
  private async createScheduleConfig(config: AutoScheduleConfig, recommendation: ScheduleRecommendation): Promise<AutoScheduleConfig | null> {
    try {
      const scheduleData = {
        restaurant_id: this.restaurantId,
        sop_id: config.sop_id,
        schedule_type: config.schedule_type,
        schedule_config: {
          operational_context: config.operational_context,
          frequency_config: config.frequency_config,
          performance_criteria: config.performance_criteria,
          ai_recommendations: recommendation.recommended_times.slice(0, 3) // Store top 3 recommendations
        },
        assigned_roles: config.operational_context.staff_requirements?.required_roles || ['server'],
        is_active: config.is_active
      };

      const { data, error } = await supabaseAdmin
        .from('sop_schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (error) {
        console.error('Error creating schedule config:', error);
        return null;
      }

      return {
        ...config,
        id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error in createScheduleConfig:', error);
      return null;
    }
  }

  /**
   * Validate that SOP exists and can be scheduled
   */
  private async validateSop(sopId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('sop_documents')
      .select('id')
      .eq('id', sopId)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .single();

    return !!data;
  }
}

/**
 * GET /api/sop/auto-schedule - Get automated schedule recommendations
 */
async function handleGetAutoSchedule(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    const sopIds = searchParams.get('sop_ids')?.split(',').filter(Boolean);
    const days = parseInt(searchParams.get('days') || '7');
    const includeConfigurations = searchParams.get('include_configs') === 'true';

    if (days > 30) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 30 days allowed for scheduling recommendations',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const engine = new SOPSchedulingEngine(context);
    const recommendations = await engine.generateScheduleRecommendations(sopIds);

    let configurations = [];
    if (includeConfigurations) {
      // Fetch existing schedule configurations
      let query = supabaseAdmin
        .from('sop_schedules')
        .select(`
          *,
          sop_document:sop_documents!inner(id, title, title_fr)
        `)
        .eq('restaurant_id', context.restaurantId)
        .eq('is_active', true);

      if (sopIds && sopIds.length > 0) {
        query = query.in('sop_id', sopIds);
      }

      const { data: configs } = await query;
      configurations = configs || [];
    }

    const response: APIResponse = {
      success: true,
      data: {
        recommendations,
        configurations: includeConfigurations ? configurations : undefined,
        metadata: {
          recommendation_count: recommendations.length,
          sop_count: sopIds?.length || 'all',
          days_ahead: days,
          generated_at: new Date().toISOString()
        }
      },
      message: `Generated ${recommendations.length} schedule recommendations`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/auto-schedule:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/auto-schedule - Create automated schedules
 */
async function handleCreateAutoSchedule(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const configs = sanitizeInput(body.configs || [body]) as AutoScheduleConfig[];

    if (!Array.isArray(configs) && typeof configs === 'object') {
      // Single config object
      configs = [configs as AutoScheduleConfig];
    }

    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No schedule configurations provided',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Validate configurations
    for (const config of configs) {
      if (!config.sop_id || !config.schedule_type) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: sop_id and schedule_type',
          errorCode: 'VALIDATION_ERROR',
        } as APIResponse, { status: 400 });
      }
    }

    const engine = new SOPSchedulingEngine(context);
    const createdSchedules = await engine.createAutomatedSchedules(configs);

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'auto_schedule',
      `bulk_${Date.now()}`,
      null,
      { 
        configs_requested: configs.length,
        schedules_created: createdSchedules.length 
      },
      request
    );

    const response: APIResponse<AutoScheduleConfig[]> = {
      success: true,
      data: createdSchedules,
      message: `Created ${createdSchedules.length} automated schedules`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/auto-schedule:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * PUT /api/sop/auto-schedule - Update schedule configuration
 */
async function handleUpdateAutoSchedule(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const update = sanitizeInput(body) as Partial<AutoScheduleConfig> & { id: string };

    if (!update.id) {
      return NextResponse.json({
        success: false,
        error: 'Schedule ID is required for updates',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Update schedule configuration
    const updateData: any = {};
    if (update.schedule_type) updateData.schedule_type = update.schedule_type;
    if (update.operational_context || update.frequency_config || update.performance_criteria) {
      updateData.schedule_config = {
        operational_context: update.operational_context,
        frequency_config: update.frequency_config,
        performance_criteria: update.performance_criteria
      };
    }
    if (update.is_active !== undefined) updateData.is_active = update.is_active;
    if (update.operational_context?.staff_requirements?.required_roles) {
      updateData.assigned_roles = update.operational_context.staff_requirements.required_roles;
    }

    const { data: updatedSchedule, error } = await supabaseAdmin
      .from('sop_schedules')
      .update(updateData)
      .eq('id', update.id)
      .eq('restaurant_id', context.restaurantId)
      .select()
      .single();

    if (error || !updatedSchedule) {
      return NextResponse.json({
        success: false,
        error: 'Schedule not found or access denied',
        errorCode: 'NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'auto_schedule',
      update.id,
      null,
      updateData,
      request
    );

    const response: APIResponse = {
      success: true,
      data: updatedSchedule,
      message: 'Automated schedule updated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in PUT /api/sop/auto-schedule:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetAutoSchedule, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleCreateAutoSchedule, PERMISSIONS.SOP.CREATE, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

export const PUT = withAuth(handleUpdateAutoSchedule, PERMISSIONS.SOP.UPDATE, {
  maxRequests: 100,
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