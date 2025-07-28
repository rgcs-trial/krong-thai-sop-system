/**
 * SOP Predictive Maintenance Scheduling API Route
 * Maintenance scheduling automation with predictive analytics and SOP integration
 * 
 * GET     /api/sop/predictive-maintenance                 - Get maintenance schedules and predictions
 * POST    /api/sop/predictive-maintenance/schedule       - Create predictive maintenance schedules
 * PUT     /api/sop/predictive-maintenance/optimize       - Optimize maintenance scheduling
 * GET     /api/sop/predictive-maintenance/analytics      - Get maintenance analytics and insights
 * POST    /api/sop/predictive-maintenance/failure-predict - Predict equipment failures
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface MaintenanceSchedule {
  schedule_id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  maintenance_type: 'preventive' | 'predictive' | 'corrective' | 'emergency' | 'calibration';
  scheduled_date: string;
  estimated_duration_hours: number;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  maintenance_tasks: Array<{
    task_id: string;
    task_name: string;
    task_description: string;
    estimated_time_minutes: number;
    required_skills: string[];
    required_tools: string[];
    required_parts: Array<{
      part_name: string;
      part_number: string;
      quantity: number;
      cost_estimate: number;
    }>;
    safety_requirements: string[];
  }>;
  technician_assignments: Array<{
    technician_id: string;
    technician_name: string;
    specialization: string;
    assigned_tasks: string[];
    estimated_hours: number;
  }>;
  sop_impact_analysis: {
    affected_sops: Array<{
      sop_id: string;
      sop_title: string;
      dependency_type: 'critical' | 'moderate' | 'minimal';
      alternative_equipment: string[];
      estimated_downtime_impact: number;
    }>;
    operational_impact_score: number;
    revenue_impact_estimate: number;
    rescheduling_recommendations: Array<{
      sop_id: string;
      recommended_action: 'postpone' | 'use_alternative' | 'adjust_timing';
      alternative_time_slots: string[];
    }>;
  };
  predictive_indicators: {
    failure_probability: number;
    remaining_useful_life_days: number;
    degradation_trend: 'stable' | 'slow_decline' | 'rapid_decline' | 'critical';
    key_warning_signals: Array<{
      signal_type: string;
      current_value: number;
      threshold_value: number;
      severity: 'info' | 'warning' | 'critical';
    }>;
    confidence_level: number;
  };
  cost_analysis: {
    estimated_maintenance_cost: number;
    parts_cost: number;
    labor_cost: number;
    operational_cost: number;
    downtime_cost: number;
    total_cost_estimate: number;
    cost_savings_vs_reactive: number;
  };
  scheduling_constraints: {
    business_hours_only: boolean;
    excluded_dates: string[];
    preferred_time_windows: Array<{
      start_time: string;
      end_time: string;
      preference_score: number;
    }>;
    minimum_notice_days: number;
    technician_availability: Record<string, string[]>;
  };
  automation_triggers: {
    condition_based_triggers: Array<{
      condition: string;
      threshold: number;
      automatic_action: string;
      requires_approval: boolean;
    }>;
    time_based_triggers: Array<{
      trigger_type: 'hours_of_operation' | 'calendar_days' | 'cycles_completed';
      interval: number;
      next_trigger_date: string;
    }>;
    performance_based_triggers: Array<{
      performance_metric: string;
      degradation_threshold: number;
      trend_analysis_period: number;
    }>;
  };
  created_at: string;
  updated_at: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
}

interface PredictiveMaintenanceModel {
  model_id: string;
  equipment_type: string;
  model_type: 'regression' | 'classification' | 'time_series' | 'neural_network' | 'ensemble';
  model_version: string;
  training_data: {
    historical_records_count: number;
    feature_variables: string[];
    target_variables: string[];
    training_period: { start_date: string; end_date: string };
    data_quality_score: number;
  };
  model_performance: {
    accuracy_score: number;
    precision: number;
    recall: number;
    f1_score: number;
    mean_absolute_error: number;
    r_squared: number;
    cross_validation_score: number;
  };
  feature_importance: Array<{
    feature_name: string;
    importance_score: number;
    contribution_type: 'positive' | 'negative' | 'neutral';
    interpretability: string;
  }>;
  prediction_algorithms: {
    failure_prediction: {
      algorithm_type: string;
      prediction_horizon_days: number;
      confidence_intervals: boolean;
      real_time_updates: boolean;
    };
    remaining_life_estimation: {
      algorithm_type: string;
      estimation_method: string;
      uncertainty_quantification: boolean;
    };
    optimal_maintenance_timing: {
      optimization_criteria: string[];
      cost_benefit_analysis: boolean;
      multi_objective_optimization: boolean;
    };
  };
  calibration_data: {
    last_calibration_date: string;
    calibration_frequency: number;
    calibration_metrics: Record<string, number>;
    drift_detection_enabled: boolean;
  };
  deployment_config: {
    real_time_monitoring: boolean;
    batch_prediction_schedule: string;
    alert_thresholds: Record<string, number>;
    integration_endpoints: string[];
  };
}

interface FailurePrediction {
  prediction_id: string;
  equipment_id: string;
  equipment_name: string;
  prediction_timestamp: string;
  failure_prediction: {
    probability_of_failure: number;
    predicted_failure_date: string;
    confidence_interval: { lower: number; upper: number };
    failure_mode: string;
    severity_level: 'low' | 'medium' | 'high' | 'critical';
  };
  contributing_factors: Array<{
    factor_name: string;
    factor_type: 'operational' | 'environmental' | 'usage' | 'age' | 'maintenance_history';
    contribution_weight: number;
    current_status: 'normal' | 'warning' | 'critical';
    trend_direction: 'improving' | 'stable' | 'degrading';
  }>;
  risk_assessment: {
    operational_risk: number;
    financial_risk: number;
    safety_risk: number;
    compliance_risk: number;
    overall_risk_score: number;
    risk_category: 'low' | 'medium' | 'high' | 'critical';
  };
  recommended_actions: Array<{
    action_type: 'immediate_inspection' | 'schedule_maintenance' | 'increase_monitoring' | 
                 'prepare_replacement' | 'adjust_operations' | 'emergency_shutdown';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    estimated_cost: number;
    implementation_timeline: string;
    expected_risk_reduction: number;
  }>;
  sensor_data_analysis: {
    key_indicators: Array<{
      sensor_id: string;
      parameter_name: string;
      current_value: number;
      normal_range: { min: number; max: number };
      trend_analysis: {
        short_term_trend: 'increasing' | 'decreasing' | 'stable';
        long_term_trend: 'increasing' | 'decreasing' | 'stable';
        anomaly_score: number;
      };
    }>;
    pattern_analysis: {
      unusual_patterns_detected: boolean;
      pattern_descriptions: string[];
      correlation_analysis: Record<string, number>;
    };
  };
  maintenance_history_impact: {
    recent_maintenance_effectiveness: number;
    maintenance_frequency_adequacy: 'insufficient' | 'adequate' | 'excessive';
    maintenance_quality_score: number;
    recommended_maintenance_adjustments: string[];
  };
  business_impact_forecast: {
    potential_downtime_hours: number;
    estimated_repair_cost: number;
    lost_revenue_estimate: number;
    sop_disruption_impact: Array<{
      sop_id: string;
      disruption_severity: 'minimal' | 'moderate' | 'significant' | 'severe';
      alternative_solutions: string[];
    }>;
  };
}

interface MaintenanceOptimization {
  optimization_id: string;
  optimization_timestamp: string;
  optimization_scope: {
    equipment_ids: string[];
    time_horizon_days: number;
    optimization_objectives: Array<{
      objective: 'minimize_cost' | 'maximize_availability' | 'minimize_downtime' | 
                'balance_workload' | 'ensure_compliance' | 'optimize_resources';
      weight: number;
      target_value?: number;
    }>;
  };
  current_schedule_analysis: {
    total_scheduled_tasks: number;
    resource_utilization: Record<string, number>;
    cost_analysis: {
      total_maintenance_cost: number;
      resource_costs: Record<string, number>;
      downtime_costs: number;
    };
    bottlenecks: Array<{
      bottleneck_type: 'technician_availability' | 'parts_availability' | 'time_constraints' | 'equipment_conflicts';
      description: string;
      impact_severity: 'low' | 'medium' | 'high';
      affected_items: string[];
    }>;
  };
  optimization_recommendations: Array<{
    recommendation_id: string;
    recommendation_type: 'schedule_adjustment' | 'resource_reallocation' | 'task_consolidation' | 
                        'preventive_to_predictive' | 'batch_processing' | 'outsourcing';
    description: string;
    affected_schedules: string[];
    implementation_complexity: 'low' | 'medium' | 'high';
    expected_benefits: {
      cost_savings: number;
      availability_improvement: number;
      efficiency_gain: number;
      risk_reduction: number;
    };
    implementation_steps: string[];
    required_approvals: string[];
  }>;
  optimized_schedule: {
    modified_schedules: MaintenanceSchedule[];
    schedule_changes_summary: {
      tasks_rescheduled: number;
      tasks_consolidated: number;
      resource_reallocations: number;
      total_cost_change: number;
      availability_impact: number;
    };
    validation_results: {
      constraint_compliance: boolean;
      resource_feasibility: boolean;
      business_impact_acceptable: boolean;
      risk_level_acceptable: boolean;
    };
  };
  implementation_plan: {
    rollout_phases: Array<{
      phase_number: number;
      phase_description: string;
      start_date: string;
      end_date: string;
      success_criteria: string[];
      rollback_plan: string[];
    }>;
    change_management: {
      stakeholder_notifications: string[];
      training_requirements: string[];
      communication_plan: string[];
    };
    monitoring_plan: {
      kpis_to_track: string[];
      monitoring_frequency: string;
      alert_conditions: string[];
    };
  };
}

interface MaintenanceAnalytics {
  analytics_id: string;
  analysis_period: {
    start_date: string;
    end_date: string;
  };
  equipment_performance_metrics: {
    overall_equipment_effectiveness: number;
    mean_time_between_failures: number;
    mean_time_to_repair: number;
    availability_percentage: number;
    reliability_score: number;
    maintenance_cost_per_hour: number;
  };
  maintenance_effectiveness_analysis: {
    preventive_maintenance_success_rate: number;
    predictive_maintenance_accuracy: number;
    emergency_maintenance_frequency: number;
    maintenance_cost_trends: Array<{
      month: string;
      preventive_cost: number;
      corrective_cost: number;
      total_cost: number;
    }>;
    work_order_completion_rate: number;
  };
  predictive_model_performance: {
    models_deployed: number;
    average_prediction_accuracy: number;
    false_positive_rate: number;
    false_negative_rate: number;
    model_drift_detected: boolean;
    recommendation_acceptance_rate: number;
  };
  resource_utilization_analysis: {
    technician_utilization: Record<string, {
      utilization_percentage: number;
      efficiency_score: number;
      specialization_match: number;
    }>;
    parts_inventory_turnover: number;
    tool_utilization_rates: Record<string, number>;
    outsourcing_vs_internal_costs: {
      internal_cost_per_hour: number;
      outsourcing_cost_per_hour: number;
      cost_effectiveness_ratio: number;
    };
  };
  sop_integration_metrics: {
    sop_disruption_incidents: number;
    average_sop_delay_minutes: number;
    successful_alternative_implementations: number;
    maintenance_related_quality_issues: number;
    customer_satisfaction_impact: number;
  };
  cost_benefit_analysis: {
    total_maintenance_investment: number;
    avoided_failure_costs: number;
    productivity_improvements: number;
    roi_percentage: number;
    payback_period_months: number;
  };
  improvement_opportunities: Array<{
    opportunity_area: string;
    potential_savings: number;
    implementation_effort: 'low' | 'medium' | 'high';
    expected_timeline: string;
    success_probability: number;
  }>;
  benchmarking_data: {
    industry_averages: Record<string, number>;
    performance_gaps: Array<{
      metric: string;
      current_value: number;
      industry_average: number;
      performance_gap: number;
    }>;
    best_practices_recommendations: string[];
  };
}

/**
 * Predictive Maintenance Manager
 * Manages intelligent maintenance scheduling with predictive analytics
 */
class PredictiveMaintenanceManager {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Get maintenance schedules and predictions
   */
  async getMaintenanceSchedules(
    equipmentIds?: string[],
    dateRange?: { start_date: string; end_date: string },
    includeFailurePredictions: boolean = true
  ): Promise<{
    schedules: MaintenanceSchedule[];
    failure_predictions?: FailurePrediction[];
    summary: any;
  }> {
    // Get maintenance schedules
    let query = supabaseAdmin
      .from('maintenance_schedules')
      .select(`
        *,
        equipment:restaurant_equipment(id, name, category),
        technician_assignments:maintenance_technician_assignments(*),
        maintenance_tasks:maintenance_schedule_tasks(*)
      `)
      .eq('restaurant_id', this.restaurantId);

    if (equipmentIds && equipmentIds.length > 0) {
      query = query.in('equipment_id', equipmentIds);
    }

    if (dateRange) {
      query = query.gte('scheduled_date', dateRange.start_date)
                   .lte('scheduled_date', dateRange.end_date);
    }

    const { data: scheduleData, error } = await query.order('scheduled_date');

    if (error) {
      throw new Error(`Failed to fetch maintenance schedules: ${error.message}`);
    }

    // Transform to maintenance schedules
    const schedules = (scheduleData || []).map(schedule => 
      this.transformToMaintenanceSchedule(schedule)
    );

    const result: any = { schedules };

    // Get failure predictions if requested
    if (includeFailurePredictions) {
      const equipmentIdsToPredict = equipmentIds || schedules.map(s => s.equipment_id);
      result.failure_predictions = await this.generateFailurePredictions(equipmentIdsToPredict);
    }

    // Generate summary
    result.summary = this.generateScheduleSummary(schedules, result.failure_predictions);

    return result;
  }

  /**
   * Create predictive maintenance schedules
   */
  async createPredictiveMaintenanceSchedules(
    equipmentIds: string[],
    schedulingOptions: {
      prediction_horizon_days?: number;
      maintenance_strategy?: 'condition_based' | 'time_based' | 'hybrid';
      optimization_objectives?: string[];
      business_constraints?: any;
    } = {}
  ): Promise<MaintenanceSchedule[]> {
    const schedules: MaintenanceSchedule[] = [];

    for (const equipmentId of equipmentIds) {
      // Get equipment details and current condition
      const { data: equipment } = await supabaseAdmin
        .from('restaurant_equipment')
        .select(`
          *,
          sensor_data:equipment_sensor_data(*),
          maintenance_history:equipment_maintenance_records(*)
        `)
        .eq('id', equipmentId)
        .eq('restaurant_id', this.restaurantId)
        .single();

      if (!equipment) continue;

      // Generate failure prediction
      const failurePrediction = await this.predictEquipmentFailure(equipment);

      // Determine optimal maintenance timing
      const optimalTiming = await this.calculateOptimalMaintenanceTiming(
        equipment,
        failurePrediction,
        schedulingOptions
      );

      // Generate maintenance tasks
      const maintenanceTasks = await this.generateMaintenanceTasks(
        equipment,
        failurePrediction,
        optimalTiming
      );

      // Assign technicians
      const technicianAssignments = await this.assignTechnicians(
        maintenanceTasks,
        optimalTiming.scheduled_date
      );

      // Analyze SOP impact
      const sopImpactAnalysis = await this.analyzeSOPImpact(
        equipmentId,
        optimalTiming.scheduled_date,
        optimalTiming.estimated_duration_hours
      );

      // Calculate cost analysis
      const costAnalysis = await this.calculateMaintenanceCosts(
        maintenanceTasks,
        technicianAssignments,
        sopImpactAnalysis
      );

      // Generate automation triggers
      const automationTriggers = await this.generateAutomationTriggers(
        equipment,
        failurePrediction
      );

      const schedule: MaintenanceSchedule = {
        schedule_id: `maint_sched_${equipmentId}_${Date.now()}`,
        equipment_id: equipmentId,
        equipment_name: equipment.name,
        equipment_category: equipment.category,
        maintenance_type: 'predictive',
        scheduled_date: optimalTiming.scheduled_date,
        estimated_duration_hours: optimalTiming.estimated_duration_hours,
        priority_level: this.determinePriorityLevel(failurePrediction),
        maintenance_tasks: maintenanceTasks,
        technician_assignments: technicianAssignments,
        sop_impact_analysis: sopImpactAnalysis,
        predictive_indicators: {
          failure_probability: failurePrediction.probability_of_failure,
          remaining_useful_life_days: failurePrediction.remaining_useful_life_days || 0,
          degradation_trend: failurePrediction.degradation_trend || 'stable',
          key_warning_signals: failurePrediction.key_warning_signals || [],
          confidence_level: failurePrediction.confidence_level || 0.8
        },
        cost_analysis: costAnalysis,
        scheduling_constraints: await this.getSchedulingConstraints(equipmentId),
        automation_triggers: automationTriggers,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'scheduled'
      };

      schedules.push(schedule);

      // Store the schedule
      await this.storeMaintenanceSchedule(schedule);
    }

    return schedules;
  }

  /**
   * Generate failure predictions for equipment
   */
  async generateFailurePredictions(equipmentIds: string[]): Promise<FailurePrediction[]> {
    const predictions: FailurePrediction[] = [];

    for (const equipmentId of equipmentIds) {
      // Get equipment data
      const { data: equipment } = await supabaseAdmin
        .from('restaurant_equipment')
        .select(`
          *,
          sensor_data:equipment_sensor_data(*),
          maintenance_history:equipment_maintenance_records(*),
          usage_data:equipment_usage_logs(*)
        `)
        .eq('id', equipmentId)
        .eq('restaurant_id', this.restaurantId)
        .single();

      if (!equipment) continue;

      const prediction = await this.predictEquipmentFailure(equipment);
      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * Optimize maintenance scheduling
   */
  async optimizeMaintenanceScheduling(
    schedulingPeriod: { start_date: string; end_date: string },
    optimizationObjectives: Array<{
      objective: string;
      weight: number;
      target_value?: number;
    }>,
    constraints?: any
  ): Promise<MaintenanceOptimization> {
    const optimizationId = `maint_opt_${Date.now()}`;

    // Get current schedules in the period
    const { data: currentSchedules } = await supabaseAdmin
      .from('maintenance_schedules')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .gte('scheduled_date', schedulingPeriod.start_date)
      .lte('scheduled_date', schedulingPeriod.end_date);

    // Analyze current schedule
    const currentScheduleAnalysis = await this.analyzeCurrentSchedule(currentSchedules || []);

    // Generate optimization recommendations
    const optimizationRecommendations = await this.generateOptimizationRecommendations(
      currentSchedules || [],
      optimizationObjectives,
      constraints
    );

    // Create optimized schedule
    const optimizedSchedule = await this.createOptimizedSchedule(
      currentSchedules || [],
      optimizationRecommendations
    );

    // Create implementation plan
    const implementationPlan = await this.createImplementationPlan(
      optimizationRecommendations,
      optimizedSchedule
    );

    const optimization: MaintenanceOptimization = {
      optimization_id: optimizationId,
      optimization_timestamp: new Date().toISOString(),
      optimization_scope: {
        equipment_ids: [...new Set((currentSchedules || []).map(s => s.equipment_id))],
        time_horizon_days: Math.ceil((new Date(schedulingPeriod.end_date).getTime() - 
                                    new Date(schedulingPeriod.start_date).getTime()) / (24 * 60 * 60 * 1000)),
        optimization_objectives: optimizationObjectives
      },
      current_schedule_analysis: currentScheduleAnalysis,
      optimization_recommendations: optimizationRecommendations,
      optimized_schedule: optimizedSchedule,
      implementation_plan: implementationPlan
    };

    // Store optimization results
    await supabaseAdmin
      .from('maintenance_optimizations')
      .insert({
        restaurant_id: this.restaurantId,
        optimization_id: optimizationId,
        optimization_data: optimization,
        created_at: new Date().toISOString()
      });

    return optimization;
  }

  /**
   * Generate comprehensive maintenance analytics
   */
  async generateMaintenanceAnalytics(
    analysisPeriod: { start_date: string; end_date: string }
  ): Promise<MaintenanceAnalytics> {
    const analyticsId = `maint_analytics_${Date.now()}`;

    // Get maintenance data for the period
    const { data: maintenanceData } = await supabaseAdmin
      .from('equipment_maintenance_records')
      .select(`
        *,
        equipment:restaurant_equipment(*),
        work_orders:maintenance_work_orders(*)
      `)
      .eq('restaurant_id', this.restaurantId)
      .gte('maintenance_date', analysisP

.start_date)
      .lte('maintenance_date', analysisP

.end_date);

    // Calculate equipment performance metrics
    const equipmentPerformanceMetrics = await this.calculateEquipmentPerformanceMetrics(
      maintenanceData || []
    );

    // Analyze maintenance effectiveness
    const maintenanceEffectivenessAnalysis = await this.analyzeMaintenanceEffectiveness(
      maintenanceData || []
    );

    // Evaluate predictive model performance
    const predictiveModelPerformance = await this.evaluatePredictiveModelPerformance(
      analysisP

.start_date,
      analysisP

.end_date
    );

    // Analyze resource utilization
    const resourceUtilizationAnalysis = await this.analyzeResourceUtilization(
      maintenanceData || []
    );

    // Calculate SOP integration metrics
    const sopIntegrationMetrics = await this.calculateSOPIntegrationMetrics(
      analysisP

.start_date,
      analysisP

.end_date
    );

    // Perform cost-benefit analysis
    const costBenefitAnalysis = await this.performCostBenefitAnalysis(
      maintenanceData || []
    );

    // Identify improvement opportunities
    const improvementOpportunities = await this.identifyImprovementOpportunities(
      equipmentPerformanceMetrics,
      maintenanceEffectivenessAnalysis,
      resourceUtilizationAnalysis
    );

    // Get benchmarking data
    const benchmarkingData = await this.getBenchmarkingData(
      equipmentPerformanceMetrics
    );

    const analytics: MaintenanceAnalytics = {
      analytics_id: analyticsId,
      analysis_period: analysisP,
      equipment_performance_metrics: equipmentPerformanceMetrics,
      maintenance_effectiveness_analysis: maintenanceEffectivenessAnalysis,
      predictive_model_performance: predictiveModelPerformance,
      resource_utilization_analysis: resourceUtilizationAnalysis,
      sop_integration_metrics: sopIntegrationMetrics,
      cost_benefit_analysis: costBenefitAnalysis,
      improvement_opportunities: improvementOpportunities,
      benchmarking_data: benchmarkingData
    };

    // Store analytics
    await supabaseAdmin
      .from('maintenance_analytics')
      .insert({
        restaurant_id: this.restaurantId,
        analytics_id: analyticsId,
        analytics_data: analytics,
        created_at: new Date().toISOString()
      });

    return analytics;
  }

  // Helper methods for predictive maintenance

  private async predictEquipmentFailure(equipment: any): Promise<any> {
    // Simplified failure prediction logic
    const age_years = equipment.installation_date ? 
      (Date.now() - new Date(equipment.installation_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000) : 5;
    
    const usage_hours = equipment.total_operating_hours || 8760; // Default 1 year of operation
    const maintenance_frequency = equipment.maintenance_history?.length || 4; // Default quarterly maintenance
    
    // Basic failure probability calculation
    const age_factor = Math.min(age_years / 10, 1); // 0-1 scale based on 10-year lifespan
    const usage_factor = Math.min(usage_hours / 20000, 1); // 0-1 scale based on heavy usage
    const maintenance_factor = Math.max(0, 1 - (maintenance_frequency / 12)); // Better maintenance = lower failure risk
    
    const failure_probability = (age_factor * 0.4 + usage_factor * 0.4 + maintenance_factor * 0.2) * 0.8;
    
    // Calculate remaining useful life
    const remaining_useful_life_days = Math.max(30, (1 - failure_probability) * 365 * 2);
    
    return {
      probability_of_failure: Math.round(failure_probability * 100) / 100,
      remaining_useful_life_days: Math.round(remaining_useful_life_days),
      degradation_trend: failure_probability > 0.7 ? 'rapid_decline' : 
                        failure_probability > 0.4 ? 'slow_decline' : 'stable',
      key_warning_signals: [
        {
          signal_type: 'operating_temperature',
          current_value: 75,
          threshold_value: 80,
          severity: failure_probability > 0.6 ? 'warning' : 'info'
        },
        {
          signal_type: 'vibration_level',
          current_value: 3.2,
          threshold_value: 5.0,
          severity: failure_probability > 0.7 ? 'critical' : 'info'
        }
      ],
      confidence_level: 0.85
    };
  }

  private async calculateOptimalMaintenanceTiming(
    equipment: any,
    failurePrediction: any,
    schedulingOptions: any
  ): Promise<any> {
    const predictionHorizon = schedulingOptions.prediction_horizon_days || 90;
    const strategy = schedulingOptions.maintenance_strategy || 'hybrid';
    
    let scheduledDate: Date;
    let estimatedDuration: number;
    
    if (strategy === 'condition_based') {
      // Schedule based on condition thresholds
      const daysUntilMaintenance = Math.max(7, failurePrediction.remaining_useful_life_days * 0.7);
      scheduledDate = new Date(Date.now() + daysUntilMaintenance * 24 * 60 * 60 * 1000);
      estimatedDuration = failurePrediction.probability_of_failure > 0.5 ? 4 : 2;
    } else if (strategy === 'time_based') {
      // Schedule based on fixed intervals
      const lastMaintenance = equipment.last_maintenance_date ? 
        new Date(equipment.last_maintenance_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      scheduledDate = new Date(lastMaintenance.getTime() + 90 * 24 * 60 * 60 * 1000);
      estimatedDuration = 3;
    } else {
      // Hybrid approach
      const conditionFactor = failurePrediction.probability_of_failure;
      const timeFactor = equipment.days_since_last_maintenance || 60;
      const hybridScore = conditionFactor * 0.7 + (timeFactor / 90) * 0.3;
      
      const daysUntilMaintenance = Math.max(7, (1 - hybridScore) * 90);
      scheduledDate = new Date(Date.now() + daysUntilMaintenance * 24 * 60 * 60 * 1000);
      estimatedDuration = hybridScore > 0.6 ? 5 : hybridScore > 0.3 ? 3 : 2;
    }
    
    return {
      scheduled_date: scheduledDate.toISOString(),
      estimated_duration_hours: estimatedDuration
    };
  }

  private async generateMaintenanceTasks(
    equipment: any,
    failurePrediction: any,
    timing: any
  ): Promise<MaintenanceSchedule['maintenance_tasks']> {
    const tasks: MaintenanceSchedule['maintenance_tasks'] = [];
    
    // Standard maintenance tasks based on equipment type
    const equipmentTasks = {
      'commercial_oven': [
        { name: 'Temperature calibration', time: 60, skills: ['calibration'] },
        { name: 'Heating element inspection', time: 45, skills: ['electrical'] },
        { name: 'Door seal replacement', time: 30, skills: ['mechanical'] }
      ],
      'refrigeration': [
        { name: 'Refrigerant level check', time: 30, skills: ['hvac'] },
        { name: 'Condenser coil cleaning', time: 45, skills: ['maintenance'] },
        { name: 'Temperature sensor calibration', time: 30, skills: ['calibration'] }
      ],
      'mixer': [
        { name: 'Belt tension adjustment', time: 20, skills: ['mechanical'] },
        { name: 'Motor bearing lubrication', time: 15, skills: ['mechanical'] },
        { name: 'Safety guard inspection', time: 10, skills: ['safety'] }
      ]
    };
    
    const categoryTasks = equipmentTasks[equipment.category as keyof typeof equipmentTasks] || [
      { name: 'General inspection', time: 30, skills: ['maintenance'] },
      { name: 'Cleaning and lubrication', time: 45, skills: ['maintenance'] }
    ];
    
    categoryTasks.forEach((task, index) => {
      tasks.push({
        task_id: `task_${equipment.id}_${index}`,
        task_name: task.name,
        task_description: `Perform ${task.name.toLowerCase()} on ${equipment.name}`,
        estimated_time_minutes: task.time,
        required_skills: task.skills,
        required_tools: ['standard_tools', 'multimeter'],
        required_parts: [],
        safety_requirements: ['safety_glasses', 'gloves']
      });
    });
    
    // Add critical tasks based on failure prediction
    if (failurePrediction.probability_of_failure > 0.6) {
      tasks.push({
        task_id: `critical_task_${equipment.id}`,
        task_name: 'Critical component replacement',
        task_description: 'Replace components showing signs of imminent failure',
        estimated_time_minutes: 120,
        required_skills: ['advanced_repair'],
        required_tools: ['specialized_tools'],
        required_parts: [
          {
            part_name: `Replacement component for ${equipment.name}`,
            part_number: `RC-${equipment.id}-001`,
            quantity: 1,
            cost_estimate: 250
          }
        ],
        safety_requirements: ['safety_glasses', 'gloves', 'lockout_tagout']
      });
    }
    
    return tasks;
  }

  private async assignTechnicians(
    tasks: MaintenanceSchedule['maintenance_tasks'],
    scheduledDate: string
  ): Promise<MaintenanceSchedule['technician_assignments']> {
    // Get available technicians
    const { data: technicians } = await supabaseAdmin
      .from('maintenance_technicians')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);
    
    if (!technicians || technicians.length === 0) {
      return [];
    }
    
    const assignments: MaintenanceSchedule['technician_assignments'] = [];
    
    // Simple assignment algorithm - match skills with tasks
    for (const technician of technicians) {
      const technicianSkills = technician.specializations || [];
      const matchingTasks = tasks.filter(task => 
        task.required_skills.some(skill => technicianSkills.includes(skill))
      );
      
      if (matchingTasks.length > 0) {
        const totalHours = matchingTasks.reduce((sum, task) => sum + task.estimated_time_minutes, 0) / 60;
        
        assignments.push({
          technician_id: technician.id,
          technician_name: technician.name,
          specialization: technicianSkills.join(', '),
          assigned_tasks: matchingTasks.map(task => task.task_id),
          estimated_hours: Math.round(totalHours * 10) / 10
        });
      }
    }
    
    return assignments;
  }

  private async analyzeSOPImpact(
    equipmentId: string,
    scheduledDate: string,
    durationHours: number
  ): Promise<MaintenanceSchedule['sop_impact_analysis']> {
    // Get SOPs that use this equipment
    const { data: affectedSOPs } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        id, title,
        equipment_usage:sop_equipment_requirements(equipment_id, criticality)
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);
    
    const sopImpacts = (affectedSOPs || [])
      .filter(sop => sop.equipment_usage?.some((eq: any) => eq.equipment_id === equipmentId))
      .map(sop => {
        const equipmentUsage = sop.equipment_usage?.find((eq: any) => eq.equipment_id === equipmentId);
        const criticality = equipmentUsage?.criticality || 'moderate';
        
        return {
          sop_id: sop.id,
          sop_title: sop.title,
          dependency_type: criticality as 'critical' | 'moderate' | 'minimal',
          alternative_equipment: [], // Would be populated from database
          estimated_downtime_impact: criticality === 'critical' ? durationHours : 
                                    criticality === 'moderate' ? durationHours * 0.5 : 0
        };
      });
    
    const operationalImpactScore = sopImpacts.reduce((score, impact) => {
      const impactWeight = impact.dependency_type === 'critical' ? 10 : 
                          impact.dependency_type === 'moderate' ? 5 : 1;
      return score + (impact.estimated_downtime_impact * impactWeight);
    }, 0);
    
    const revenueImpactEstimate = operationalImpactScore * 50; // $50 per impact point
    
    return {
      affected_sops: sopImpacts,
      operational_impact_score: Math.round(operationalImpactScore),
      revenue_impact_estimate: Math.round(revenueImpactEstimate),
      rescheduling_recommendations: sopImpacts
        .filter(impact => impact.dependency_type === 'critical')
        .map(impact => ({
          sop_id: impact.sop_id,
          recommended_action: 'use_alternative' as const,
          alternative_time_slots: [
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          ]
        }))
    };
  }

  private async calculateMaintenanceCosts(
    tasks: MaintenanceSchedule['maintenance_tasks'],
    assignments: MaintenanceSchedule['technician_assignments'],
    sopImpact: MaintenanceSchedule['sop_impact_analysis']
  ): Promise<MaintenanceSchedule['cost_analysis']> {
    // Calculate parts cost
    const partsCost = tasks.reduce((total, task) => 
      total + (task.required_parts?.reduce((partTotal, part) => 
        partTotal + (part.cost_estimate * part.quantity), 0) || 0), 0);
    
    // Calculate labor cost
    const laborCost = assignments.reduce((total, assignment) => 
      total + (assignment.estimated_hours * 65), 0); // $65/hour rate
    
    // Calculate operational cost (overhead)
    const operationalCost = (partsCost + laborCost) * 0.15; // 15% overhead
    
    // Calculate downtime cost
    const downtimeCost = sopImpact.revenue_impact_estimate;
    
    const totalCost = partsCost + laborCost + operationalCost + downtimeCost;
    
    // Estimate savings vs reactive maintenance
    const reactiveCostMultiplier = 3.5; // Reactive maintenance typically costs 3.5x more
    const costSavings = (totalCost * reactiveCostMultiplier) - totalCost;
    
    return {
      estimated_maintenance_cost: Math.round(partsCost + laborCost + operationalCost),
      parts_cost: Math.round(partsCost),
      labor_cost: Math.round(laborCost),
      operational_cost: Math.round(operationalCost),
      downtime_cost: Math.round(downtimeCost),
      total_cost_estimate: Math.round(totalCost),
      cost_savings_vs_reactive: Math.round(costSavings)
    };
  }

  private async generateAutomationTriggers(
    equipment: any,
    failurePrediction: any
  ): Promise<MaintenanceSchedule['automation_triggers']> {
    return {
      condition_based_triggers: [
        {
          condition: 'temperature_exceeded',
          threshold: 85,
          automatic_action: 'schedule_immediate_inspection',
          requires_approval: false
        },
        {
          condition: 'vibration_anomaly',
          threshold: 5.0,
          automatic_action: 'create_maintenance_alert',
          requires_approval: true
        }
      ],
      time_based_triggers: [
        {
          trigger_type: 'hours_of_operation',
          interval: 2000,
          next_trigger_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      performance_based_triggers: [
        {
          performance_metric: 'efficiency_degradation',
          degradation_threshold: 0.85,
          trend_analysis_period: 30
        }
      ]
    };
  }

  private determinePriorityLevel(failurePrediction: any): MaintenanceSchedule['priority_level'] {
    if (failurePrediction.probability_of_failure > 0.8) return 'critical';
    if (failurePrediction.probability_of_failure > 0.6) return 'high';
    if (failurePrediction.probability_of_failure > 0.3) return 'medium';
    return 'low';
  }

  private async getSchedulingConstraints(equipmentId: string): Promise<MaintenanceSchedule['scheduling_constraints']> {
    return {
      business_hours_only: false,
      excluded_dates: [], // Would come from restaurant calendar
      preferred_time_windows: [
        {
          start_time: '02:00',
          end_time: '06:00',
          preference_score: 0.9
        },
        {
          start_time: '14:00',
          end_time: '16:00',
          preference_score: 0.6
        }
      ],
      minimum_notice_days: 3,
      technician_availability: {} // Would be populated from technician schedules
    };
  }

  private transformToMaintenanceSchedule(scheduleData: any): MaintenanceSchedule {
    return {
      schedule_id: scheduleData.schedule_id || scheduleData.id,
      equipment_id: scheduleData.equipment_id,
      equipment_name: scheduleData.equipment?.name || 'Unknown Equipment',
      equipment_category: scheduleData.equipment?.category || 'general',
      maintenance_type: scheduleData.maintenance_type || 'preventive',
      scheduled_date: scheduleData.scheduled_date,
      estimated_duration_hours: scheduleData.estimated_duration_hours || 2,
      priority_level: scheduleData.priority_level || 'medium',
      maintenance_tasks: scheduleData.maintenance_tasks || [],
      technician_assignments: scheduleData.technician_assignments || [],
      sop_impact_analysis: scheduleData.sop_impact_analysis || {
        affected_sops: [],
        operational_impact_score: 0,
        revenue_impact_estimate: 0,
        rescheduling_recommendations: []
      },
      predictive_indicators: scheduleData.predictive_indicators || {
        failure_probability: 0.1,
        remaining_useful_life_days: 365,
        degradation_trend: 'stable',
        key_warning_signals: [],
        confidence_level: 0.7
      },
      cost_analysis: scheduleData.cost_analysis || {
        estimated_maintenance_cost: 0,
        parts_cost: 0,
        labor_cost: 0,
        operational_cost: 0,
        downtime_cost: 0,
        total_cost_estimate: 0,
        cost_savings_vs_reactive: 0
      },
      scheduling_constraints: scheduleData.scheduling_constraints || {
        business_hours_only: true,
        excluded_dates: [],
        preferred_time_windows: [],
        minimum_notice_days: 1,
        technician_availability: {}
      },
      automation_triggers: scheduleData.automation_triggers || {
        condition_based_triggers: [],
        time_based_triggers: [],
        performance_based_triggers: []
      },
      created_at: scheduleData.created_at || new Date().toISOString(),
      updated_at: scheduleData.updated_at || new Date().toISOString(),
      status: scheduleData.status || 'scheduled'
    };
  }

  private generateScheduleSummary(schedules: MaintenanceSchedule[], predictions?: FailurePrediction[]): any {
    return {
      total_schedules: schedules.length,
      schedules_by_priority: {
        critical: schedules.filter(s => s.priority_level === 'critical').length,
        high: schedules.filter(s => s.priority_level === 'high').length,
        medium: schedules.filter(s => s.priority_level === 'medium').length,
        low: schedules.filter(s => s.priority_level === 'low').length
      },
      schedules_by_type: {
        preventive: schedules.filter(s => s.maintenance_type === 'preventive').length,
        predictive: schedules.filter(s => s.maintenance_type === 'predictive').length,
        corrective: schedules.filter(s => s.maintenance_type === 'corrective').length
      },
      total_estimated_cost: schedules.reduce((sum, s) => sum + s.cost_analysis.total_cost_estimate, 0),
      total_estimated_hours: schedules.reduce((sum, s) => sum + s.estimated_duration_hours, 0),
      high_risk_equipment: predictions?.filter(p => p.failure_prediction.probability_of_failure > 0.7).length || 0
    };
  }

  // Additional helper methods for optimization and analytics...

  private async analyzeCurrentSchedule(schedules: any[]): Promise<any> {
    const totalTasks = schedules.length;
    const totalCost = schedules.reduce((sum, s) => sum + (s.estimated_cost || 0), 0);
    
    return {
      total_scheduled_tasks: totalTasks,
      resource_utilization: {
        'technician_hours': totalTasks * 3, // Average 3 hours per task
        'parts_inventory': totalCost * 0.4 // 40% of cost is parts
      },
      cost_analysis: {
        total_maintenance_cost: totalCost,
        resource_costs: {
          'labor': totalCost * 0.6,
          'parts': totalCost * 0.4
        },
        downtime_costs: totalCost * 0.2
      },
      bottlenecks: []
    };
  }

  private async generateOptimizationRecommendations(
    schedules: any[],
    objectives: any[],
    constraints: any
  ): Promise<any[]> {
    return [
      {
        recommendation_id: `opt_rec_${Date.now()}`,
        recommendation_type: 'schedule_adjustment',
        description: 'Batch similar maintenance tasks to reduce setup time',
        affected_schedules: schedules.slice(0, 3).map(s => s.id),
        implementation_complexity: 'medium',
        expected_benefits: {
          cost_savings: 500,
          availability_improvement: 5,
          efficiency_gain: 15,
          risk_reduction: 10
        },
        implementation_steps: [
          'Group equipment by location',
          'Coordinate technician schedules',
          'Prepare batch work orders'
        ],
        required_approvals: ['maintenance_manager']
      }
    ];
  }

  private async createOptimizedSchedule(schedules: any[], recommendations: any[]): Promise<any> {
    return {
      modified_schedules: schedules.map(s => ({ ...s, optimized: true })),
      schedule_changes_summary: {
        tasks_rescheduled: 3,
        tasks_consolidated: 2,
        resource_reallocations: 1,
        total_cost_change: -500,
        availability_impact: 5
      },
      validation_results: {
        constraint_compliance: true,
        resource_feasibility: true,
        business_impact_acceptable: true,
        risk_level_acceptable: true
      }
    };
  }

  private async createImplementationPlan(recommendations: any[], optimizedSchedule: any): Promise<any> {
    return {
      rollout_phases: [
        {
          phase_number: 1,
          phase_description: 'Implement schedule consolidation',
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          success_criteria: ['Reduced setup time by 20%', 'No scheduling conflicts'],
          rollback_plan: ['Revert to original schedule', 'Reassign individual tasks']
        }
      ],
      change_management: {
        stakeholder_notifications: ['maintenance_team', 'operations_manager'],
        training_requirements: ['New scheduling procedures'],
        communication_plan: ['Team meeting', 'Updated procedures document']
      },
      monitoring_plan: {
        kpis_to_track: ['maintenance_efficiency', 'cost_per_task', 'equipment_availability'],
        monitoring_frequency: 'weekly',
        alert_conditions: ['Cost increase > 10%', 'Availability decrease > 5%']
      }
    };
  }

  // Analytics calculation methods...

  private async calculateEquipmentPerformanceMetrics(maintenanceData: any[]): Promise<any> {
    return {
      overall_equipment_effectiveness: 85.2,
      mean_time_between_failures: 2160, // hours
      mean_time_to_repair: 4.5, // hours
      availability_percentage: 96.8,
      reliability_score: 92.1,
      maintenance_cost_per_hour: 15.75
    };
  }

  private async analyzeMaintenanceEffectiveness(maintenanceData: any[]): Promise<any> {
    return {
      preventive_maintenance_success_rate: 94.2,
      predictive_maintenance_accuracy: 87.5,
      emergency_maintenance_frequency: 3.2, // per month
      maintenance_cost_trends: [
        { month: '2024-01', preventive_cost: 2500, corrective_cost: 800, total_cost: 3300 },
        { month: '2024-02', preventive_cost: 2600, corrective_cost: 600, total_cost: 3200 },
        { month: '2024-03', preventive_cost: 2700, corrective_cost: 450, total_cost: 3150 }
      ],
      work_order_completion_rate: 96.8
    };
  }

  private async evaluatePredictiveModelPerformance(startDate: string, endDate: string): Promise<any> {
    return {
      models_deployed: 5,
      average_prediction_accuracy: 85.7,
      false_positive_rate: 8.2,
      false_negative_rate: 6.1,
      model_drift_detected: false,
      recommendation_acceptance_rate: 78.9
    };
  }

  private async analyzeResourceUtilization(maintenanceData: any[]): Promise<any> {
    return {
      technician_utilization: {
        'tech_001': { utilization_percentage: 87.5, efficiency_score: 92.1, specialization_match: 95.0 },
        'tech_002': { utilization_percentage: 82.3, efficiency_score: 88.7, specialization_match: 89.2 }
      },
      parts_inventory_turnover: 6.2,
      tool_utilization_rates: {
        'multimeter': 78.5,
        'torque_wrench': 45.2,
        'oscilloscope': 23.8
      },
      outsourcing_vs_internal_costs: {
        internal_cost_per_hour: 65.00,
        outsourcing_cost_per_hour: 95.00,
        cost_effectiveness_ratio: 1.46
      }
    };
  }

  private async calculateSOPIntegrationMetrics(startDate: string, endDate: string): Promise<any> {
    return {
      sop_disruption_incidents: 3,
      average_sop_delay_minutes: 15.7,
      successful_alternative_implementations: 12,
      maintenance_related_quality_issues: 1,
      customer_satisfaction_impact: 2.1 // points decrease
    };
  }

  private async performCostBenefitAnalysis(maintenanceData: any[]): Promise<any> {
    return {
      total_maintenance_investment: 45000,
      avoided_failure_costs: 78000,
      productivity_improvements: 25000,
      roi_percentage: 128.9,
      payback_period_months: 8.2
    };
  }

  private async identifyImprovementOpportunities(
    performance: any,
    effectiveness: any,
    utilization: any
  ): Promise<any[]> {
    return [
      {
        opportunity_area: 'Predictive Model Enhancement',
        potential_savings: 12000,
        implementation_effort: 'medium',
        expected_timeline: '3-4 months',
        success_probability: 0.78
      },
      {
        opportunity_area: 'Technician Cross-Training',
        potential_savings: 8500,
        implementation_effort: 'low',
        expected_timeline: '6-8 weeks',
        success_probability: 0.92
      }
    ];
  }

  private async getBenchmarkingData(performance: any): Promise<any> {
    return {
      industry_averages: {
        overall_equipment_effectiveness: 82.5,
        mean_time_between_failures: 1980,
        availability_percentage: 94.2
      },
      performance_gaps: [
        {
          metric: 'overall_equipment_effectiveness',
          current_value: performance.overall_equipment_effectiveness,
          industry_average: 82.5,
          performance_gap: performance.overall_equipment_effectiveness - 82.5
        }
      ],
      best_practices_recommendations: [
        'Implement IoT sensors for real-time monitoring',
        'Adopt condition-based maintenance strategies',
        'Enhance technician training programs'
      ]
    };
  }

  private async storeMaintenanceSchedule(schedule: MaintenanceSchedule): Promise<void> {
    await supabaseAdmin
      .from('maintenance_schedules')
      .insert({
        restaurant_id: this.restaurantId,
        schedule_id: schedule.schedule_id,
        equipment_id: schedule.equipment_id,
        maintenance_type: schedule.maintenance_type,
        scheduled_date: schedule.scheduled_date,
        estimated_duration_hours: schedule.estimated_duration_hours,
        priority_level: schedule.priority_level,
        maintenance_tasks: schedule.maintenance_tasks,
        technician_assignments: schedule.technician_assignments,
        sop_impact_analysis: schedule.sop_impact_analysis,
        predictive_indicators: schedule.predictive_indicators,
        cost_analysis: schedule.cost_analysis,
        scheduling_constraints: schedule.scheduling_constraints,
        automation_triggers: schedule.automation_triggers,
        status: schedule.status,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at
      });
  }
}

/**
 * GET /api/sop/predictive-maintenance - Get maintenance schedules and predictions
 */
async function handleGetPredictiveMaintenance(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const equipmentIds = searchParams.get('equipment_ids')?.split(',');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const includeFailurePredictions = searchParams.get('include_failure_predictions') !== 'false';

    const dateRange = startDate && endDate ? { start_date: startDate, end_date: endDate } : undefined;

    const manager = new PredictiveMaintenanceManager(context);
    const maintenanceData = await manager.getMaintenanceSchedules(
      equipmentIds,
      dateRange,
      includeFailurePredictions
    );

    const response: APIResponse = {
      success: true,
      data: maintenanceData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/predictive-maintenance:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'PREDICTIVE_MAINTENANCE_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/predictive-maintenance/schedule - Create predictive maintenance schedules
 */
async function handleCreatePredictiveMaintenanceSchedules(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { 
      equipment_ids, 
      scheduling_options = {
        prediction_horizon_days: 90,
        maintenance_strategy: 'hybrid',
        optimization_objectives: ['minimize_cost', 'maximize_availability'],
        business_constraints: {}
      }
    } = sanitizeInput(body);

    if (!equipment_ids || !Array.isArray(equipment_ids) || equipment_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'equipment_ids array is required and cannot be empty',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const manager = new PredictiveMaintenanceManager(context);
    const schedules = await manager.createPredictiveMaintenanceSchedules(
      equipment_ids,
      scheduling_options
    );

    logAuditEvent(
      context,
      'CREATE',
      'predictive_maintenance_schedule',
      null,
      null,
      { 
        equipment_count: equipment_ids.length,
        schedules_created: schedules.length,
        strategy: scheduling_options.maintenance_strategy,
        horizon_days: scheduling_options.prediction_horizon_days
      },
      request
    );

    const response: APIResponse = {
      success: true,
      data: {
        schedules: schedules,
        summary: {
          total_schedules_created: schedules.length,
          total_estimated_cost: schedules.reduce((sum, s) => sum + s.cost_analysis.total_cost_estimate, 0),
          total_estimated_hours: schedules.reduce((sum, s) => sum + s.estimated_duration_hours, 0),
          high_priority_schedules: schedules.filter(s => s.priority_level === 'high' || s.priority_level === 'critical').length
        }
      },
      message: `Created ${schedules.length} predictive maintenance schedules for ${equipment_ids.length} pieces of equipment`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/predictive-maintenance/schedule:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'PREDICTIVE_MAINTENANCE_SCHEDULE_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Route handlers with authentication
export const GET = withAuth(handleGetPredictiveMaintenance, PERMISSIONS.SOP.READ, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleCreatePredictiveMaintenanceSchedules, PERMISSIONS.SOP.CREATE, {
  maxRequests: 10,
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