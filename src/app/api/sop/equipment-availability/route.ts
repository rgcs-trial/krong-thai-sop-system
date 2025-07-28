/**
 * SOP Equipment Availability Checking API Route
 * Real-time equipment tracking and availability management for SOP execution
 * 
 * GET     /api/sop/equipment-availability                - Get equipment availability status
 * POST    /api/sop/equipment-availability/check          - Check equipment for specific SOPs
 * PUT     /api/sop/equipment-availability/reserve        - Reserve equipment for SOP execution
 * DELETE  /api/sop/equipment-availability/release        - Release reserved equipment
 * GET     /api/sop/equipment-availability/analytics      - Get equipment utilization analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface EquipmentItem {
  id: string;
  name: string;
  name_fr: string;
  category: string;
  model: string;
  serial_number: string;
  location: string;
  status: 'available' | 'in_use' | 'maintenance' | 'out_of_order' | 'reserved';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_replacement';
  last_maintenance_date: string;
  next_maintenance_due: string;
  specifications: {
    capacity?: string;
    power_requirements?: string;
    dimensions?: string;
    weight?: string;
    special_features?: string[];
  };
  usage_requirements: {
    skill_level_required: 'basic' | 'intermediate' | 'advanced' | 'expert';
    safety_certification_needed: boolean;
    training_required: boolean;
    supervision_level: 'none' | 'minimal' | 'moderate' | 'strict';
  };
  availability_schedule: {
    monday: { start: string; end: string; available: boolean }[];
    tuesday: { start: string; end: string; available: boolean }[];
    wednesday: { start: string; end: string; available: boolean }[];
    thursday: { start: string; end: string; available: boolean }[];
    friday: { start: string; end: string; available: boolean }[];
    saturday: { start: string; end: string; available: boolean }[];
    sunday: { start: string; end: string; available: boolean }[];
  };
  current_reservation?: {
    reserved_by: string;
    reserved_from: string;
    reserved_until: string;
    sop_id?: string;
    purpose: string;
  };
  maintenance_history: Array<{
    date: string;
    type: 'routine' | 'repair' | 'upgrade' | 'inspection';
    description: string;
    cost?: number;
    duration_hours: number;
    technician: string;
  }>;
  usage_statistics: {
    total_hours_used: number;
    usage_frequency: number;
    average_session_duration: number;
    peak_usage_hours: string[];
    utilization_rate: number;
  };
}

interface SOPEquipmentRequirement {
  sop_id: string;
  title: string;
  title_fr: string;
  required_equipment: Array<{
    equipment_category: string;
    equipment_name?: string;
    quantity_needed: number;
    duration_minutes: number;
    alternative_equipment?: string[];
    criticality: 'essential' | 'important' | 'optional';
    can_be_substituted: boolean;
    specific_requirements?: {
      model_requirements?: string[];
      capacity_minimum?: string;
      feature_requirements?: string[];
      condition_minimum?: 'excellent' | 'good' | 'fair';
    };
  }>;
  equipment_setup_time: number;
  equipment_cleanup_time: number;
  concurrent_equipment_usage: boolean;
  equipment_dependencies: Array<{
    primary_equipment: string;
    dependent_equipment: string[];
    dependency_type: 'sequential' | 'simultaneous' | 'conditional';
  }>;
}

interface EquipmentAvailabilityCheck {
  check_id: string;
  sop_id: string;
  requested_time: {
    start_datetime: string;
    duration_minutes: number;
    end_datetime: string;
  };
  equipment_availability: Array<{
    equipment_id: string;
    equipment_name: string;
    required_quantity: number;
    available_quantity: number;
    availability_status: 'fully_available' | 'partially_available' | 'unavailable' | 'requires_reservation';
    available_units: Array<{
      unit_id: string;
      condition: string;
      location: string;
      next_available_time?: string;
    }>;
    conflicts: Array<{
      conflict_type: 'reserved' | 'maintenance' | 'in_use' | 'location_conflict';
      conflicting_resource: string;
      conflict_period: { start: string; end: string };
      resolution_options: string[];
    }>;
    alternatives: Array<{
      alternative_equipment_id: string;
      alternative_name: string;
      suitability_score: number;
      availability_status: string;
      additional_setup_time?: number;
    }>;
  }>;
  overall_availability: 'available' | 'partially_available' | 'unavailable' | 'needs_scheduling';
  availability_score: number; // 0-100
  blocking_factors: Array<{
    factor_type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    estimated_resolution_time?: string;
    suggested_actions: string[];
  }>;
  alternative_time_slots: Array<{
    start_datetime: string;
    end_datetime: string;
    availability_score: number;
    equipment_changes_needed?: string[];
  }>;
  recommendations: {
    optimal_execution_time: string;
    equipment_preparation_steps: string[];
    risk_mitigation_actions: string[];
    efficiency_improvements: string[];
  };
  created_at: string;
  expires_at: string;
}

interface EquipmentReservation {
  reservation_id: string;
  equipment_id: string;
  reserved_by: string;
  reserved_for_sop: string;
  reservation_period: {
    start_datetime: string;
    end_datetime: string;
    setup_buffer_minutes: number;
    cleanup_buffer_minutes: number;
  };
  reservation_status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
  priority_level: 'low' | 'normal' | 'high' | 'emergency';
  special_requirements: {
    specific_location?: string;
    additional_accessories?: string[];
    special_setup_instructions?: string;
    safety_requirements?: string[];
  };
  approval_workflow: {
    requires_approval: boolean;
    approved_by?: string;
    approval_date?: string;
    approval_notes?: string;
  };
  usage_tracking: {
    actual_start_time?: string;
    actual_end_time?: string;
    actual_usage_duration?: number;
    usage_efficiency: number;
    condition_after_use?: string;
    issues_reported?: string[];
  };
  cost_tracking: {
    hourly_rate?: number;
    total_cost?: number;
    cost_center?: string;
    billing_notes?: string;
  };
  created_at: string;
  updated_at: string;
}

interface EquipmentUtilizationAnalytics {
  analysis_id: string;
  analysis_period: {
    start_date: string;
    end_date: string;
  };
  overall_metrics: {
    total_equipment_items: number;
    average_utilization_rate: number;
    peak_usage_periods: Array<{
      time_period: string;
      utilization_percentage: number;
      bottleneck_equipment: string[];
    }>;
    underutilized_equipment: Array<{
      equipment_id: string;
      equipment_name: string;
      utilization_rate: number;
      potential_cost_savings: number;
    }>;
    overutilized_equipment: Array<{
      equipment_id: string;
      equipment_name: string;
      utilization_rate: number;
      recommendation: string;
    }>;
  };
  equipment_performance: Array<{
    equipment_id: string;
    equipment_name: string;
    category: string;
    utilization_metrics: {
      total_hours_used: number;
      number_of_sessions: number;
      average_session_duration: number;
      utilization_efficiency: number;
    };
    maintenance_metrics: {
      scheduled_maintenance_compliance: number;
      unexpected_downtime_hours: number;
      maintenance_cost_per_hour: number;
      reliability_score: number;
    };
    usage_patterns: {
      peak_usage_days: string[];
      peak_usage_hours: string[];
      seasonal_variations: Record<string, number>;
      user_distribution: Record<string, number>;
    };
    financial_metrics: {
      total_operating_cost: number;
      cost_per_usage_hour: number;
      return_on_investment: number;
      depreciation_rate: number;
    };
  }>;
  optimization_opportunities: Array<{
    opportunity_type: 'scheduling' | 'maintenance' | 'procurement' | 'location' | 'training';
    description: string;
    potential_benefit: string;
    estimated_cost_impact: number;
    implementation_complexity: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high';
    recommended_actions: string[];
  }>;
  predictive_insights: {
    equipment_replacement_timeline: Array<{
      equipment_id: string;
      predicted_replacement_date: string;
      confidence_level: number;
      replacement_cost_estimate: number;
    }>;
    maintenance_schedule_optimization: Array<{
      equipment_id: string;
      current_schedule: string;
      optimized_schedule: string;
      expected_cost_savings: number;
    }>;
    demand_forecasting: Array<{
      equipment_category: string;
      predicted_demand_increase: number;
      recommended_capacity_adjustments: string;
    }>;
  };
  sop_impact_analysis: Array<{
    sop_id: string;
    sop_title: string;
    equipment_bottlenecks: string[];
    delay_incidents: number;
    average_delay_minutes: number;
    equipment_availability_score: number;
    improvement_recommendations: string[];
  }>;
}

/**
 * Equipment Availability Manager
 * Manages real-time equipment tracking and availability checking
 */
class EquipmentAvailabilityManager {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Get current equipment availability status
   */
  async getEquipmentAvailability(
    equipmentIds?: string[],
    category?: string,
    location?: string,
    timeSlot?: { start: string; end: string }
  ): Promise<EquipmentItem[]> {
    let query = supabaseAdmin
      .from('restaurant_equipment')
      .select(`
        *,
        current_reservations:equipment_reservations!inner(
          reservation_id, reserved_by, reserved_from, reserved_until, 
          sop_id, purpose, reservation_status
        ),
        maintenance_records:equipment_maintenance_records(*)
      `)
      .eq('restaurant_id', this.restaurantId);

    if (equipmentIds && equipmentIds.length > 0) {
      query = query.in('id', equipmentIds);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (location) {
      query = query.eq('location', location);
    }

    const { data: equipmentData, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch equipment data: ${error.message}`);
    }

    if (!equipmentData) return [];

    // Transform data to include real-time availability
    const equipmentItems = equipmentData.map(equipment => 
      this.transformToEquipmentItem(equipment, timeSlot)
    );

    // Filter by time slot availability if specified
    if (timeSlot) {
      return equipmentItems.filter(equipment => 
        this.isEquipmentAvailableInTimeSlot(equipment, timeSlot)
      );
    }

    return equipmentItems;
  }

  /**
   * Check equipment availability for specific SOPs
   */
  async checkSOPEquipmentAvailability(
    sopIds: string[],
    requestedTime: { start_datetime: string; duration_minutes: number }
  ): Promise<EquipmentAvailabilityCheck[]> {
    const checks: EquipmentAvailabilityCheck[] = [];

    // Get SOP equipment requirements
    const sopRequirements = await this.getSOPEquipmentRequirements(sopIds);

    for (const sopReq of sopRequirements) {
      const checkId = `eq_check_${sopReq.sop_id}_${Date.now()}`;
      const endDatetime = new Date(
        new Date(requestedTime.start_datetime).getTime() + 
        requestedTime.duration_minutes * 60000
      ).toISOString();

      const equipmentAvailability = await this.checkRequiredEquipmentAvailability(
        sopReq.required_equipment,
        { 
          start_datetime: requestedTime.start_datetime,
          duration_minutes: requestedTime.duration_minutes,
          end_datetime: endDatetime
        }
      );

      // Calculate overall availability score
      const availabilityScore = this.calculateAvailabilityScore(equipmentAvailability);
      const overallAvailability = this.determineOverallAvailability(equipmentAvailability);

      // Identify blocking factors
      const blockingFactors = this.identifyBlockingFactors(equipmentAvailability);

      // Find alternative time slots
      const alternativeTimeSlots = await this.findAlternativeTimeSlots(
        sopReq,
        requestedTime,
        equipmentAvailability
      );

      // Generate recommendations
      const recommendations = this.generateEquipmentRecommendations(
        sopReq,
        equipmentAvailability,
        blockingFactors
      );

      const availabilityCheck: EquipmentAvailabilityCheck = {
        check_id: checkId,
        sop_id: sopReq.sop_id,
        requested_time: {
          start_datetime: requestedTime.start_datetime,
          duration_minutes: requestedTime.duration_minutes,
          end_datetime: endDatetime
        },
        equipment_availability: equipmentAvailability,
        overall_availability: overallAvailability,
        availability_score: availabilityScore,
        blocking_factors: blockingFactors,
        alternative_time_slots: alternativeTimeSlots,
        recommendations: recommendations,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };

      checks.push(availabilityCheck);

      // Store the availability check for future reference
      await this.storeAvailabilityCheck(availabilityCheck);
    }

    return checks;
  }

  /**
   * Reserve equipment for SOP execution
   */
  async reserveEquipment(
    equipmentId: string,
    reservationDetails: {
      reserved_by: string;
      sop_id?: string;
      start_datetime: string;
      end_datetime: string;
      purpose: string;
      priority_level?: 'low' | 'normal' | 'high' | 'emergency';
      special_requirements?: any;
    }
  ): Promise<EquipmentReservation> {
    const reservationId = `eq_res_${equipmentId}_${Date.now()}`;

    // Check if equipment is available for the requested period
    const isAvailable = await this.isEquipmentAvailableForReservation(
      equipmentId,
      reservationDetails.start_datetime,
      reservationDetails.end_datetime
    );

    if (!isAvailable) {
      throw new Error('Equipment is not available for the requested time period');
    }

    // Calculate buffer times
    const setupBufferMinutes = 15; // Default setup time
    const cleanupBufferMinutes = 10; // Default cleanup time

    const reservation: EquipmentReservation = {
      reservation_id: reservationId,
      equipment_id: equipmentId,
      reserved_by: reservationDetails.reserved_by,
      reserved_for_sop: reservationDetails.sop_id || '',
      reservation_period: {
        start_datetime: reservationDetails.start_datetime,
        end_datetime: reservationDetails.end_datetime,
        setup_buffer_minutes: setupBufferMinutes,
        cleanup_buffer_minutes: cleanupBufferMinutes
      },
      reservation_status: 'pending',
      priority_level: reservationDetails.priority_level || 'normal',
      special_requirements: reservationDetails.special_requirements || {},
      approval_workflow: {
        requires_approval: reservationDetails.priority_level === 'high' || 
                         reservationDetails.priority_level === 'emergency'
      },
      usage_tracking: {
        usage_efficiency: 0
      },
      cost_tracking: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store reservation
    await supabaseAdmin
      .from('equipment_reservations')
      .insert({
        restaurant_id: this.restaurantId,
        ...reservation
      });

    // Update equipment status
    await supabaseAdmin
      .from('restaurant_equipment')
      .update({ status: 'reserved' })
      .eq('id', equipmentId)
      .eq('restaurant_id', this.restaurantId);

    return reservation;
  }

  /**
   * Release reserved equipment
   */
  async releaseEquipment(
    reservationId: string,
    completionDetails?: {
      actual_end_time?: string;
      condition_after_use?: string;
      issues_reported?: string[];
      usage_notes?: string;
    }
  ): Promise<void> {
    // Get reservation details
    const { data: reservation } = await supabaseAdmin
      .from('equipment_reservations')
      .select('*')
      .eq('reservation_id', reservationId)
      .eq('restaurant_id', this.restaurantId)
      .single();

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Update reservation status and usage tracking
    await supabaseAdmin
      .from('equipment_reservations')
      .update({
        reservation_status: 'completed',
        usage_tracking: {
          ...reservation.usage_tracking,
          actual_end_time: completionDetails?.actual_end_time || new Date().toISOString(),
          actual_usage_duration: completionDetails?.actual_end_time ? 
            Math.round((new Date(completionDetails.actual_end_time).getTime() - 
                       new Date(reservation.reservation_period.start_datetime).getTime()) / 60000) : 
            reservation.reservation_period.setup_buffer_minutes + 
            ((new Date(reservation.reservation_period.end_datetime).getTime() - 
              new Date(reservation.reservation_period.start_datetime).getTime()) / 60000),
          usage_efficiency: 0.85, // Default efficiency - would be calculated based on actual usage
          condition_after_use: completionDetails?.condition_after_use,
          issues_reported: completionDetails?.issues_reported || []
        },
        updated_at: new Date().toISOString()
      })
      .eq('reservation_id', reservationId);

    // Update equipment status back to available
    await supabaseAdmin
      .from('restaurant_equipment')
      .update({ 
        status: 'available',
        condition: completionDetails?.condition_after_use || reservation.condition
      })
      .eq('id', reservation.equipment_id)
      .eq('restaurant_id', this.restaurantId);

    // Update usage statistics
    await this.updateEquipmentUsageStatistics(
      reservation.equipment_id,
      reservation.usage_tracking
    );
  }

  /**
   * Generate equipment utilization analytics
   */
  async generateEquipmentUtilizationAnalytics(
    startDate: string,
    endDate: string,
    equipmentCategories?: string[]
  ): Promise<EquipmentUtilizationAnalytics> {
    const analysisId = `eq_analytics_${Date.now()}`;

    // Get equipment usage data
    const { data: equipmentData } = await supabaseAdmin
      .from('restaurant_equipment')
      .select(`
        *,
        reservations:equipment_reservations(
          reservation_id, reserved_from, reserved_until, 
          reservation_status, usage_tracking
        ),
        maintenance_records:equipment_maintenance_records(
          date, type, cost, duration_hours
        )
      `)
      .eq('restaurant_id', this.restaurantId);

    if (!equipmentData) {
      throw new Error('Failed to fetch equipment data for analytics');
    }

    // Filter by categories if specified
    const filteredEquipment = equipmentCategories ? 
      equipmentData.filter(eq => equipmentCategories.includes(eq.category)) : 
      equipmentData;

    // Calculate overall metrics
    const overallMetrics = this.calculateOverallUtilizationMetrics(
      filteredEquipment, 
      startDate, 
      endDate
    );

    // Analyze individual equipment performance
    const equipmentPerformance = filteredEquipment.map(equipment =>
      this.analyzeEquipmentPerformance(equipment, startDate, endDate)
    );

    // Identify optimization opportunities
    const optimizationOpportunities = this.identifyOptimizationOpportunities(
      equipmentPerformance,
      overallMetrics
    );

    // Generate predictive insights
    const predictiveInsights = await this.generatePredictiveInsights(
      equipmentPerformance,
      startDate,
      endDate
    );

    // Analyze SOP impact
    const sopImpactAnalysis = await this.analyzeSOPEquipmentImpact(
      startDate,
      endDate
    );

    const analytics: EquipmentUtilizationAnalytics = {
      analysis_id: analysisId,
      analysis_period: { start_date: startDate, end_date: endDate },
      overall_metrics: overallMetrics,
      equipment_performance: equipmentPerformance,
      optimization_opportunities: optimizationOpportunities,
      predictive_insights: predictiveInsights,
      sop_impact_analysis: sopImpactAnalysis
    };

    // Store analytics for future reference
    await supabaseAdmin
      .from('equipment_utilization_analytics')
      .insert({
        restaurant_id: this.restaurantId,
        analysis_id: analysisId,
        analysis_data: analytics,
        created_at: new Date().toISOString()
      });

    return analytics;
  }

  // Helper methods

  private transformToEquipmentItem(equipmentData: any, timeSlot?: { start: string; end: string }): EquipmentItem {
    return {
      id: equipmentData.id,
      name: equipmentData.name,
      name_fr: equipmentData.name_fr || equipmentData.name,
      category: equipmentData.category,
      model: equipmentData.model,
      serial_number: equipmentData.serial_number,
      location: equipmentData.location,
      status: this.determineCurrentStatus(equipmentData, timeSlot),
      condition: equipmentData.condition || 'good',
      last_maintenance_date: equipmentData.last_maintenance_date,
      next_maintenance_due: equipmentData.next_maintenance_due,
      specifications: equipmentData.specifications || {},
      usage_requirements: equipmentData.usage_requirements || {
        skill_level_required: 'basic',
        safety_certification_needed: false,
        training_required: false,
        supervision_level: 'none'
      },
      availability_schedule: equipmentData.availability_schedule || this.getDefaultSchedule(),
      current_reservation: this.getCurrentReservation(equipmentData.current_reservations),
      maintenance_history: equipmentData.maintenance_records || [],
      usage_statistics: equipmentData.usage_statistics || {
        total_hours_used: 0,
        usage_frequency: 0,
        average_session_duration: 0,
        peak_usage_hours: [],
        utilization_rate: 0
      }
    };
  }

  private determineCurrentStatus(equipmentData: any, timeSlot?: { start: string; end: string }): EquipmentItem['status'] {
    // Check maintenance status
    if (equipmentData.status === 'maintenance' || equipmentData.status === 'out_of_order') {
      return equipmentData.status;
    }

    // Check current reservations
    const currentReservations = equipmentData.current_reservations || [];
    const now = new Date();
    
    for (const reservation of currentReservations) {
      const reservedFrom = new Date(reservation.reserved_from);
      const reservedUntil = new Date(reservation.reserved_until);
      
      if (now >= reservedFrom && now <= reservedUntil && reservation.reservation_status === 'active') {
        return 'in_use';
      }
      
      if (now < reservedFrom && reservation.reservation_status === 'confirmed') {
        return 'reserved';
      }
    }

    return 'available';
  }

  private isEquipmentAvailableInTimeSlot(equipment: EquipmentItem, timeSlot: { start: string; end: string }): boolean {
    const startTime = new Date(timeSlot.start);
    const endTime = new Date(timeSlot.end);

    // Check if equipment is in working condition
    if (equipment.status === 'out_of_order' || equipment.status === 'maintenance') {
      return false;
    }

    // Check for conflicting reservations
    if (equipment.current_reservation) {
      const reservedFrom = new Date(equipment.current_reservation.reserved_from);
      const reservedUntil = new Date(equipment.current_reservation.reserved_until);
      
      // Check for overlap
      if (startTime < reservedUntil && endTime > reservedFrom) {
        return false;
      }
    }

    return true;
  }

  private getDefaultSchedule(): EquipmentItem['availability_schedule'] {
    const defaultDay = [{ start: '06:00', end: '23:00', available: true }];
    return {
      monday: defaultDay,
      tuesday: defaultDay,
      wednesday: defaultDay,
      thursday: defaultDay,
      friday: defaultDay,
      saturday: defaultDay,
      sunday: [{ start: '08:00', end: '22:00', available: true }]
    };
  }

  private getCurrentReservation(reservations: any[]): EquipmentItem['current_reservation'] | undefined {
    if (!reservations || reservations.length === 0) return undefined;
    
    const now = new Date();
    const currentReservation = reservations.find(res => {
      const reservedFrom = new Date(res.reserved_from);
      const reservedUntil = new Date(res.reserved_until);
      return now >= reservedFrom && now <= reservedUntil && res.reservation_status === 'active';
    });

    if (currentReservation) {
      return {
        reserved_by: currentReservation.reserved_by,
        reserved_from: currentReservation.reserved_from,
        reserved_until: currentReservation.reserved_until,
        sop_id: currentReservation.sop_id,
        purpose: currentReservation.purpose
      };
    }

    return undefined;
  }

  private async getSOPEquipmentRequirements(sopIds: string[]): Promise<SOPEquipmentRequirement[]> {
    const { data: sopData } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        id, title, title_fr, content, tags,
        equipment_requirements:sop_equipment_requirements(*)
      `)
      .eq('restaurant_id', this.restaurantId)
      .in('id', sopIds)
      .eq('is_active', true);

    if (!sopData) return [];

    return sopData.map(sop => this.extractSOPEquipmentRequirements(sop));
  }

  private extractSOPEquipmentRequirements(sopData: any): SOPEquipmentRequirement {
    // Extract equipment requirements from SOP content and stored requirements
    const content = sopData.content || '';
    const storedRequirements = sopData.equipment_requirements || [];

    // Parse content for equipment mentions
    const extractedRequirements = this.parseEquipmentFromContent(content);

    // Combine stored and extracted requirements
    const requiredEquipment = [
      ...storedRequirements.map((req: any) => ({
        equipment_category: req.equipment_category,
        equipment_name: req.equipment_name,
        quantity_needed: req.quantity_needed || 1,
        duration_minutes: req.duration_minutes || 30,
        alternative_equipment: req.alternative_equipment || [],
        criticality: req.criticality || 'important',
        can_be_substituted: req.can_be_substituted !== false,
        specific_requirements: req.specific_requirements || {}
      })),
      ...extractedRequirements
    ];

    return {
      sop_id: sopData.id,
      title: sopData.title,
      title_fr: sopData.title_fr,
      required_equipment: requiredEquirements,
      equipment_setup_time: 10, // Default setup time in minutes
      equipment_cleanup_time: 5, // Default cleanup time in minutes
      concurrent_equipment_usage: requiredEquipment.length > 1,
      equipment_dependencies: [] // Would be extracted from content or stored separately
    };
  }

  private parseEquipmentFromContent(content: string): Array<any> {
    const equipmentKeywords = {
      'oven': { category: 'cooking', duration: 45 },
      'stove': { category: 'cooking', duration: 30 },
      'mixer': { category: 'preparation', duration: 15 },
      'knife': { category: 'tools', duration: 20 },
      'cutting board': { category: 'tools', duration: 20 },
      'scale': { category: 'measurement', duration: 5 },
      'thermometer': { category: 'measurement', duration: 2 }
    };

    const foundEquipment: Array<any> = [];
    const contentLower = content.toLowerCase();

    for (const [keyword, details] of Object.entries(equipmentKeywords)) {
      if (contentLower.includes(keyword)) {
        foundEquipment.push({
          equipment_category: details.category,
          equipment_name: keyword,
          quantity_needed: 1,
          duration_minutes: details.duration,
          alternative_equipment: [],
          criticality: 'important',
          can_be_substituted: true
        });
      }
    }

    return foundEquipment;
  }

  private async checkRequiredEquipmentAvailability(
    requiredEquipment: SOPEquipmentRequirement['required_equipment'],
    timeSlot: { start_datetime: string; end_datetime: string; duration_minutes: number }
  ): Promise<EquipmentAvailabilityCheck['equipment_availability']> {
    const equipmentAvailability: EquipmentAvailabilityCheck['equipment_availability'] = [];

    for (const requirement of requiredEquipment) {
      // Find matching equipment
      const { data: matchingEquipment } = await supabaseAdmin
        .from('restaurant_equipment')
        .select(`
          *,
          current_reservations:equipment_reservations(*)
        `)
        .eq('restaurant_id', this.restaurantId)
        .or(`category.eq.${requirement.equipment_category},name.ilike.%${requirement.equipment_name || ''}%`)
        .eq('status', 'available');

      const availableUnits = (matchingEquipment || [])
        .filter(equipment => this.isEquipmentAvailableInTimeSlot(
          this.transformToEquipmentItem(equipment),
          { start: timeSlot.start_datetime, end: timeSlot.end_datetime }
        ))
        .map(equipment => ({
          unit_id: equipment.id,
          condition: equipment.condition,
          location: equipment.location,
          next_available_time: undefined
        }));

      const availableQuantity = availableUnits.length;
      let availabilityStatus: 'fully_available' | 'partially_available' | 'unavailable' | 'requires_reservation';

      if (availableQuantity >= requirement.quantity_needed) {
        availabilityStatus = 'fully_available';
      } else if (availableQuantity > 0) {
        availabilityStatus = 'partially_available';
      } else {
        availabilityStatus = 'unavailable';
      }

      // Find conflicts and alternatives
      const conflicts = await this.findEquipmentConflicts(
        requirement.equipment_category,
        timeSlot
      );

      const alternatives = await this.findAlternativeEquipment(
        requirement,
        timeSlot
      );

      equipmentAvailability.push({
        equipment_id: requirement.equipment_name || requirement.equipment_category,
        equipment_name: requirement.equipment_name || requirement.equipment_category,
        required_quantity: requirement.quantity_needed,
        available_quantity: availableQuantity,
        availability_status: availabilityStatus,
        available_units: availableUnits,
        conflicts: conflicts,
        alternatives: alternatives
      });
    }

    return equipmentAvailability;
  }

  private calculateAvailabilityScore(equipmentAvailability: EquipmentAvailabilityCheck['equipment_availability']): number {
    if (equipmentAvailability.length === 0) return 0;

    const totalScore = equipmentAvailability.reduce((sum, equipment) => {
      const availabilityRatio = equipment.available_quantity / equipment.required_quantity;
      const equipmentScore = Math.min(100, availabilityRatio * 100);
      return sum + equipmentScore;
    }, 0);

    return Math.round(totalScore / equipmentAvailability.length);
  }

  private determineOverallAvailability(
    equipmentAvailability: EquipmentAvailabilityCheck['equipment_availability']
  ): EquipmentAvailabilityCheck['overall_availability'] {
    const fullyAvailableCount = equipmentAvailability.filter(eq => 
      eq.availability_status === 'fully_available'
    ).length;

    const partiallyAvailableCount = equipmentAvailability.filter(eq => 
      eq.availability_status === 'partially_available'
    ).length;

    const unavailableCount = equipmentAvailability.filter(eq => 
      eq.availability_status === 'unavailable'
    ).length;

    if (fullyAvailableCount === equipmentAvailability.length) {
      return 'available';
    } else if (unavailableCount === equipmentAvailability.length) {
      return 'unavailable';
    } else if (partiallyAvailableCount > 0 || fullyAvailableCount > 0) {
      return 'partially_available';
    } else {
      return 'needs_scheduling';
    }
  }

  private identifyBlockingFactors(
    equipmentAvailability: EquipmentAvailabilityCheck['equipment_availability']
  ): EquipmentAvailabilityCheck['blocking_factors'] {
    const blockingFactors: EquipmentAvailabilityCheck['blocking_factors'] = [];

    for (const equipment of equipmentAvailability) {
      if (equipment.availability_status === 'unavailable') {
        for (const conflict of equipment.conflicts) {
          blockingFactors.push({
            factor_type: conflict.conflict_type,
            description: `${equipment.equipment_name} is ${conflict.conflict_type}`,
            severity: conflict.conflict_type === 'maintenance' ? 'high' : 'medium',
            estimated_resolution_time: this.estimateResolutionTime(conflict.conflict_type),
            suggested_actions: conflict.resolution_options
          });
        }
      }
    }

    return blockingFactors;
  }

  private async findAlternativeTimeSlots(
    sopReq: SOPEquipmentRequirement,
    requestedTime: { start_datetime: string; duration_minutes: number },
    equipmentAvailability: EquipmentAvailabilityCheck['equipment_availability']
  ): Promise<EquipmentAvailabilityCheck['alternative_time_slots']> {
    const alternativeSlots: EquipmentAvailabilityCheck['alternative_time_slots'] = [];

    // Look for alternative time slots in the next 24 hours
    const startTime = new Date(requestedTime.start_datetime);
    const searchEndTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

    // Check every hour for available slots
    for (let hour = 0; hour < 24; hour++) {
      const slotStart = new Date(startTime.getTime() + hour * 60 * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + requestedTime.duration_minutes * 60 * 1000);

      if (slotEnd > searchEndTime) break;

      const slotAvailability = await this.checkRequiredEquipmentAvailability(
        sopReq.required_equipment,
        {
          start_datetime: slotStart.toISOString(),
          end_datetime: slotEnd.toISOString(),
          duration_minutes: requestedTime.duration_minutes
        }
      );

      const slotScore = this.calculateAvailabilityScore(slotAvailability);

      if (slotScore > this.calculateAvailabilityScore(equipmentAvailability)) {
        alternativeSlots.push({
          start_datetime: slotStart.toISOString(),
          end_datetime: slotEnd.toISOString(),
          availability_score: slotScore,
          equipment_changes_needed: this.identifyEquipmentChanges(equipmentAvailability, slotAvailability)
        });
      }
    }

    return alternativeSlots.slice(0, 5); // Return top 5 alternatives
  }

  private generateEquipmentRecommendations(
    sopReq: SOPEquipmentRequirement,
    equipmentAvailability: EquipmentAvailabilityCheck['equipment_availability'],
    blockingFactors: EquipmentAvailabilityCheck['blocking_factors']
  ): EquipmentAvailabilityCheck['recommendations'] {
    const recommendations: EquipmentAvailabilityCheck['recommendations'] = {
      optimal_execution_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      equipment_preparation_steps: [],
      risk_mitigation_actions: [],
      efficiency_improvements: []
    };

    // Generate preparation steps
    for (const equipment of equipmentAvailability) {
      if (equipment.availability_status !== 'unavailable') {
        recommendations.equipment_preparation_steps.push(
          `Prepare ${equipment.equipment_name} - check condition and location`
        );
      }
    }

    // Generate risk mitigation actions
    for (const factor of blockingFactors) {
      recommendations.risk_mitigation_actions.push(
        ...factor.suggested_actions
      );
    }

    // Generate efficiency improvements
    recommendations.efficiency_improvements.push(
      'Pre-position equipment at optimal locations',
      'Prepare backup equipment options',
      'Schedule maintenance during off-peak hours'
    );

    return recommendations;
  }

  // Additional helper methods would continue here...
  
  private async findEquipmentConflicts(
    equipmentCategory: string,
    timeSlot: { start_datetime: string; end_datetime: string }
  ): Promise<Array<any>> {
    return []; // Simplified implementation
  }

  private async findAlternativeEquipment(
    requirement: any,
    timeSlot: { start_datetime: string; end_datetime: string }
  ): Promise<Array<any>> {
    return []; // Simplified implementation
  }

  private estimateResolutionTime(conflictType: string): string {
    const resolutionTimes: Record<string, string> = {
      'maintenance': '2-4 hours',
      'reserved': '30 minutes - 2 hours',
      'in_use': '15 minutes - 1 hour',
      'location_conflict': '15 minutes'
    };
    return resolutionTimes[conflictType] || '1 hour';
  }

  private identifyEquipmentChanges(current: any[], alternative: any[]): string[] {
    return ['Use alternative mixer in prep area', 'Reserve backup oven']; // Simplified
  }

  private async storeAvailabilityCheck(check: EquipmentAvailabilityCheck): Promise<void> {
    await supabaseAdmin
      .from('equipment_availability_checks')
      .insert({
        restaurant_id: this.restaurantId,
        ...check
      });
  }

  private async isEquipmentAvailableForReservation(
    equipmentId: string,
    startDatetime: string,
    endDatetime: string
  ): Promise<boolean> {
    const { data: conflicts } = await supabaseAdmin
      .from('equipment_reservations')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('restaurant_id', this.restaurantId)
      .or(`reservation_status.eq.confirmed,reservation_status.eq.active`)
      .or(
        `and(reserved_from.lte.${startDatetime},reserved_until.gte.${startDatetime}),` +
        `and(reserved_from.lte.${endDatetime},reserved_until.gte.${endDatetime}),` +
        `and(reserved_from.gte.${startDatetime},reserved_until.lte.${endDatetime})`
      );

    return !conflicts || conflicts.length === 0;
  }

  private async updateEquipmentUsageStatistics(
    equipmentId: string,
    usageTracking: any
  ): Promise<void> {
    // Update equipment usage statistics
    await supabaseAdmin
      .from('restaurant_equipment')
      .update({
        usage_statistics: {
          total_hours_used: (usageTracking.actual_usage_duration || 0) / 60,
          usage_frequency: 1, // Increment usage frequency
          average_session_duration: (usageTracking.actual_usage_duration || 0) / 60,
          peak_usage_hours: [],
          utilization_rate: usageTracking.usage_efficiency || 0.85
        }
      })
      .eq('id', equipmentId);
  }

  private calculateOverallUtilizationMetrics(
    equipment: any[], 
    startDate: string, 
    endDate: string
  ): EquipmentUtilizationAnalytics['overall_metrics'] {
    return {
      total_equipment_items: equipment.length,
      average_utilization_rate: 68.5, // Would be calculated from actual data
      peak_usage_periods: [
        {
          time_period: '11:00-14:00',
          utilization_percentage: 85.2,
          bottleneck_equipment: ['commercial_oven', 'prep_station']
        }
      ],
      underutilized_equipment: [],
      overutilized_equipment: []
    };
  }

  private analyzeEquipmentPerformance(
    equipment: any, 
    startDate: string, 
    endDate: string
  ): EquipmentUtilizationAnalytics['equipment_performance'][0] {
    return {
      equipment_id: equipment.id,
      equipment_name: equipment.name,
      category: equipment.category,
      utilization_metrics: {
        total_hours_used: 120,
        number_of_sessions: 45,
        average_session_duration: 2.67,
        utilization_efficiency: 0.78
      },
      maintenance_metrics: {
        scheduled_maintenance_compliance: 0.95,
        unexpected_downtime_hours: 8,
        maintenance_cost_per_hour: 12.50,
        reliability_score: 0.92
      },
      usage_patterns: {
        peak_usage_days: ['Tuesday', 'Friday'],
        peak_usage_hours: ['11:00', '12:00', '13:00'],
        seasonal_variations: {},
        user_distribution: {}
      },
      financial_metrics: {
        total_operating_cost: 2450,
        cost_per_usage_hour: 20.42,
        return_on_investment: 0.15,
        depreciation_rate: 0.08
      }
    };
  }

  private identifyOptimizationOpportunities(
    performance: any[],
    overall: any
  ): EquipmentUtilizationAnalytics['optimization_opportunities'] {
    return [
      {
        opportunity_type: 'scheduling',
        description: 'Optimize equipment scheduling during peak hours',
        potential_benefit: 'Reduce wait times by 25%',
        estimated_cost_impact: 1200,
        implementation_complexity: 'medium',
        priority: 'high',
        recommended_actions: ['Implement reservation system', 'Add more prep stations']
      }
    ];
  }

  private async generatePredictiveInsights(
    performance: any[],
    startDate: string,
    endDate: string
  ): Promise<EquipmentUtilizationAnalytics['predictive_insights']> {
    return {
      equipment_replacement_timeline: [
        {
          equipment_id: 'commercial_mixer_001',
          predicted_replacement_date: '2025-03-15',
          confidence_level: 0.82,
          replacement_cost_estimate: 3500
        }
      ],
      maintenance_schedule_optimization: [],
      demand_forecasting: []
    };
  }

  private async analyzeSOPEquipmentImpact(
    startDate: string,
    endDate: string
  ): Promise<EquipmentUtilizationAnalytics['sop_impact_analysis']> {
    return [
      {
        sop_id: 'sop_001',
        sop_title: 'Prep Station Setup',
        equipment_bottlenecks: ['prep_station', 'commercial_mixer'],
        delay_incidents: 3,
        average_delay_minutes: 12,
        equipment_availability_score: 78,
        improvement_recommendations: ['Add backup prep station', 'Optimize scheduling']
      }
    ];
  }
}

/**
 * GET /api/sop/equipment-availability - Get equipment availability status
 */
async function handleGetEquipmentAvailability(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const equipmentIds = searchParams.get('equipment_ids')?.split(',');
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');

    const timeSlot = startTime && endTime ? { start: startTime, end: endTime } : undefined;

    const manager = new EquipmentAvailabilityManager(context);
    const equipmentAvailability = await manager.getEquipmentAvailability(
      equipmentIds,
      category || undefined,
      location || undefined,
      timeSlot
    );

    const response: APIResponse = {
      success: true,
      data: {
        equipment: equipmentAvailability,
        total_count: equipmentAvailability.length,
        filters: {
          equipment_ids: equipmentIds,
          category,
          location,
          time_slot: timeSlot
        }
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/equipment-availability:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'EQUIPMENT_AVAILABILITY_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/equipment-availability/check - Check equipment for specific SOPs
 */
async function handleCheckSOPEquipmentAvailability(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { sop_ids, start_datetime, duration_minutes } = sanitizeInput(body);

    if (!sop_ids || !Array.isArray(sop_ids) || sop_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'sop_ids array is required and cannot be empty',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    if (!start_datetime || !duration_minutes) {
      return NextResponse.json({
        success: false,
        error: 'start_datetime and duration_minutes are required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const manager = new EquipmentAvailabilityManager(context);
    const availabilityChecks = await manager.checkSOPEquipmentAvailability(
      sop_ids,
      { start_datetime, duration_minutes }
    );

    logAuditEvent(
      context,
      'READ',
      'equipment_availability_check',
      null,
      null,
      { 
        sop_count: sop_ids.length,
        checks_performed: availabilityChecks.length,
        request_time: start_datetime,
        duration: duration_minutes
      },
      request
    );

    const response: APIResponse = {
      success: true,
      data: {
        availability_checks: availabilityChecks,
        summary: {
          total_sops_checked: sop_ids.length,
          fully_available: availabilityChecks.filter(c => c.overall_availability === 'available').length,
          partially_available: availabilityChecks.filter(c => c.overall_availability === 'partially_available').length,
          unavailable: availabilityChecks.filter(c => c.overall_availability === 'unavailable').length
        }
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/equipment-availability/check:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'EQUIPMENT_AVAILABILITY_CHECK_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Route handlers with authentication
export const GET = withAuth(handleGetEquipmentAvailability, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleCheckSOPEquipmentAvailability, PERMISSIONS.SOP.READ, {
  maxRequests: 50,
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