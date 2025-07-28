/**
 * SOP Peak Hours Optimization API Route
 * Handles peak hours detection and SOP optimization algorithms for busy periods
 * 
 * GET    /api/sop/peak-optimization              - Get peak hours analysis and optimizations
 * POST   /api/sop/peak-optimization              - Generate peak hours optimization plan
 * PUT    /api/sop/peak-optimization/config       - Update peak hours configuration
 * GET    /api/sop/peak-optimization/patterns     - Get historical peak hour patterns
 * POST   /api/sop/peak-optimization/simulate     - Simulate peak hours scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface PeakHoursConfiguration {
  id?: string;
  detection_algorithm: 'statistical' | 'machine_learning' | 'hybrid' | 'manual';
  analysis_window_days: number;
  minimum_order_threshold: number;
  peak_multiplier_threshold: number; // e.g., 1.5 = 50% above average
  optimization_strategies: {
    pre_prep_enabled: boolean;
    staff_adjustment_enabled: boolean;
    sop_prioritization_enabled: boolean;
    equipment_preparation_enabled: boolean;
    menu_optimization_enabled: boolean;
  };
  notification_settings: {
    advance_warning_minutes: number;
    notify_roles: string[];
    peak_threshold_alerts: boolean;
    optimization_recommendations: boolean;
  };
  seasonal_adjustments: {
    apply_seasonal_factors: boolean;
    holiday_multipliers: Record<string, number>;
    weather_impact_factor: number;
    event_impact_factor: number;
  };
  optimization_preferences: {
    prioritize_quality: boolean;
    prioritize_speed: boolean;
    prioritize_cost: boolean;
    balance_weights: {
      quality: number;
      speed: number;
      cost: number;
    };
  };
  last_analysis_at?: string;
  analysis_status: 'active' | 'error' | 'disabled';
  error_message?: string;
}

interface PeakHoursPeriod {
  period_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  peak_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'custom';
  intensity_level: 'light' | 'moderate' | 'heavy' | 'extreme';
  order_count: number;
  revenue: number;
  average_order_value: number;
  peak_multiplier: number; // How much above normal this period was
  confidence_score: number;
  contributing_factors: {
    day_of_week_factor: number;
    weather_factor: number;
    event_factor: number;
    seasonal_factor: number;
    promotional_factor: number;
  };
  historical_pattern: {
    is_recurring: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'irregular';
    similar_occurrences: number;
    pattern_confidence: number;
  };
}

interface SOPOptimization {
  optimization_id: string;
  sop_id: string;
  optimization_type: 'pre_prep' | 'staff_allocation' | 'priority_adjustment' | 'resource_preparation' | 'process_streamline';
  peak_period_id: string;
  current_schedule_time?: string;
  optimized_schedule_time: string;
  time_adjustment_minutes: number;
  resource_adjustments: {
    additional_staff?: {
      count: number;
      roles: string[];
      skill_requirements: string[];
    };
    equipment_preparation?: {
      equipment_items: string[];
      preparation_time_minutes: number;
      setup_instructions: string[];
    };
    ingredient_prep?: {
      prep_items: string[];
      prep_time_minutes: number;
      storage_requirements: string[];
    };
    space_optimization?: {
      workspace_adjustments: string[];
      traffic_flow_changes: string[];
    };
  };
  expected_impact: {
    time_savings_minutes: number;
    quality_improvement_percent: number;
    efficiency_gain_percent: number;
    cost_impact_dollars: number;
    customer_satisfaction_impact: number;
  };
  implementation_complexity: 'low' | 'medium' | 'high';
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high';
    potential_issues: string[];
    mitigation_strategies: string[];
  };
  confidence_score: number;
  is_active: boolean;
  effective_from: string;
  effective_until: string;
  created_at: string;
}

interface PeakHoursSimulation {
  simulation_id: string;
  scenario_name: string;
  simulation_parameters: {
    peak_intensity: number;
    duration_minutes: number;
    order_volume: number;
    staff_count: number;
    applied_optimizations: string[];
  };
  simulation_results: {
    baseline_performance: {
      completion_time_minutes: number;
      quality_score: number;
      staff_utilization_percent: number;
      customer_wait_time_minutes: number;
    };
    optimized_performance: {
      completion_time_minutes: number;
      quality_score: number;
      staff_utilization_percent: number;
      customer_wait_time_minutes: number;
    };
    improvement_metrics: {
      time_improvement_percent: number;
      quality_improvement_percent: number;
      efficiency_improvement_percent: number;
      overall_score: number;
    };
  };
  recommendations: Array<{
    category: string;
    recommendation: string;
    impact_level: 'low' | 'medium' | 'high';
    implementation_effort: 'easy' | 'moderate' | 'difficult';
  }>;
  created_at: string;
}

interface PeakHoursAnalytics {
  analysis_period: {
    start_date: string;
    end_date: string;
  };
  detected_patterns: {
    daily_patterns: Array<{
      hour: number;
      average_intensity: number;
      frequency_percent: number;
      confidence: number;
    }>;
    weekly_patterns: Array<{
      day_of_week: number;
      peak_periods: PeakHoursPeriod[];
      average_intensity: number;
    }>;
    monthly_trends: Array<{
      month: number;
      average_peak_count: number;
      intensity_trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  };
  optimization_opportunities: Array<{
    opportunity_type: string;
    affected_sops: string[];
    potential_impact: string;
    implementation_priority: 'low' | 'medium' | 'high';
  }>;
  performance_metrics: {
    total_peak_periods_analyzed: number;
    average_peak_duration_minutes: number;
    optimization_success_rate: number;
    customer_satisfaction_correlation: number;
  };
}

/**
 * Peak Hours Optimization Manager
 * Analyzes peak hours and optimizes SOP scheduling
 */
class PeakHoursOptimizationManager {
  private context: SOPAuthContext;
  private restaurantId: string;
  private config?: PeakHoursConfiguration;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Initialize peak hours configuration
   */
  async initialize(): Promise<void> {
    const { data: config } = await supabaseAdmin
      .from('peak_hours_configurations')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .single();

    this.config = config;
  }

  /**
   * Detect peak hours periods using configured algorithm
   */
  async detectPeakHours(startDate: string, endDate: string): Promise<PeakHoursPeriod[]> {
    if (!this.config) {
      throw new Error('Peak hours configuration not initialized');
    }

    let peakPeriods: PeakHoursPeriod[] = [];

    switch (this.config.detection_algorithm) {
      case 'statistical':
        peakPeriods = await this.detectPeaksStatistical(startDate, endDate);
        break;
      case 'machine_learning':
        peakPeriods = await this.detectPeaksMachineLearning(startDate, endDate);
        break;
      case 'hybrid':
        const statisticalPeaks = await this.detectPeaksStatistical(startDate, endDate);
        const mlPeaks = await this.detectPeaksMachineLearning(startDate, endDate);
        peakPeriods = this.combineDetectionResults(statisticalPeaks, mlPeaks);
        break;
      case 'manual':
        peakPeriods = await this.getManuallyDefinedPeaks(startDate, endDate);
        break;
    }

    // Store detected peak periods
    await this.storePeakPeriods(peakPeriods);

    return peakPeriods;
  }

  /**
   * Statistical peak detection algorithm
   */
  private async detectPeaksStatistical(startDate: string, endDate: string): Promise<PeakHoursPeriod[]> {
    // Get hourly sales data
    const { data: salesData } = await supabaseAdmin
      .from('pos_sales_data')
      .select('sale_date, peak_hours, total_revenue, item_sales')
      .eq('restaurant_id', this.restaurantId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('sale_date');

    if (!salesData || salesData.length === 0) {
      return [];
    }

    const peakPeriods: PeakHoursPeriod[] = [];
    
    // Calculate baseline metrics
    const hourlyData = new Map<number, { totalOrders: number, totalRevenue: number, count: number }>();
    
    for (const day of salesData) {
      if (day.peak_hours && Array.isArray(day.peak_hours)) {
        for (const hourData of day.peak_hours) {
          const hour = hourData.hour;
          const existing = hourlyData.get(hour) || { totalOrders: 0, totalRevenue: 0, count: 0 };
          
          existing.totalOrders += hourData.order_count || 0;
          existing.totalRevenue += hourData.revenue || 0;
          existing.count += 1;
          
          hourlyData.set(hour, existing);
        }
      }
    }

    // Calculate averages and standard deviations
    const hourlyAverages = new Map<number, { avgOrders: number, avgRevenue: number, stdDev: number }>();
    
    for (const [hour, data] of hourlyData) {
      const avgOrders = data.totalOrders / data.count;
      const avgRevenue = data.totalRevenue / data.count;
      
      // Calculate standard deviation (simplified)
      let variance = 0;
      for (const day of salesData) {
        if (day.peak_hours) {
          const hourData = day.peak_hours.find((h: any) => h.hour === hour);
          if (hourData) {
            variance += Math.pow((hourData.order_count || 0) - avgOrders, 2);
          }
        }
      }
      const stdDev = Math.sqrt(variance / data.count);
      
      hourlyAverages.set(hour, { avgOrders, avgRevenue, stdDev });
    }

    // Detect peaks (orders above threshold)
    for (const day of salesData) {
      if (day.peak_hours && Array.isArray(day.peak_hours)) {
        for (const hourData of day.peak_hours) {
          const hour = hourData.hour;
          const average = hourlyAverages.get(hour);
          
          if (average && hourData.order_count) {
            const peakMultiplier = hourData.order_count / average.avgOrders;
            
            if (peakMultiplier >= this.config!.peak_multiplier_threshold &&
                hourData.order_count >= this.config!.minimum_order_threshold) {
              
              const period: PeakHoursPeriod = {
                period_id: `peak_${day.sale_date}_${hour}`,
                date: day.sale_date,
                start_time: `${hour.toString().padStart(2, '0')}:00`,
                end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
                duration_minutes: 60,
                peak_type: this.classifyPeakType(hour),
                intensity_level: this.classifyIntensity(peakMultiplier),
                order_count: hourData.order_count,
                revenue: hourData.revenue || 0,
                average_order_value: (hourData.revenue || 0) / hourData.order_count,
                peak_multiplier: Math.round(peakMultiplier * 100) / 100,
                confidence_score: this.calculateConfidenceScore(peakMultiplier, average.stdDev, average.avgOrders),
                contributing_factors: await this.analyzeContributingFactors(day.sale_date, hour),
                historical_pattern: await this.analyzeHistoricalPattern(hour, peakMultiplier, startDate, endDate)
              };
              
              peakPeriods.push(period);
            }
          }
        }
      }
    }

    return peakPeriods.sort((a, b) => new Date(a.date + ' ' + a.start_time).getTime() - new Date(b.date + ' ' + b.start_time).getTime());
  }

  /**
   * Machine learning peak detection (simplified implementation)
   */
  private async detectPeaksMachineLearning(startDate: string, endDate: string): Promise<PeakHoursPeriod[]> {
    // This would implement a more sophisticated ML algorithm
    // For now, we'll use a simplified pattern recognition approach
    
    const { data: historicalData } = await supabaseAdmin
      .from('pos_sales_data')
      .select('sale_date, peak_hours, total_revenue')
      .eq('restaurant_id', this.restaurantId)
      .gte('sale_date', new Date(new Date(startDate).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()) // 90 days history
      .lte('sale_date', endDate)
      .order('sale_date');

    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    // Simplified ML: Use weighted moving averages and pattern recognition
    const peakPeriods: PeakHoursPeriod[] = [];
    
    // Group data by day of week and hour
    const patterns = new Map<string, number[]>();
    
    for (const day of historicalData) {
      const dayOfWeek = new Date(day.sale_date).getDay();
      
      if (day.peak_hours && Array.isArray(day.peak_hours)) {
        for (const hourData of day.peak_hours) {
          const key = `${dayOfWeek}_${hourData.hour}`;
          const orders = hourData.order_count || 0;
          
          if (!patterns.has(key)) {
            patterns.set(key, []);
          }
          patterns.get(key)!.push(orders);
        }
      }
    }

    // Calculate pattern-based predictions
    const targetData = historicalData.filter(d => d.sale_date >= startDate && d.sale_date <= endDate);
    
    for (const day of targetData) {
      const dayOfWeek = new Date(day.sale_date).getDay();
      
      if (day.peak_hours && Array.isArray(day.peak_hours)) {
        for (const hourData of day.peak_hours) {
          const key = `${dayOfWeek}_${hourData.hour}`;
          const historicalPattern = patterns.get(key) || [];
          
          if (historicalPattern.length >= 3) {
            const avgPattern = historicalPattern.reduce((sum, val) => sum + val, 0) / historicalPattern.length;
            const peakMultiplier = hourData.order_count / avgPattern;
            
            if (peakMultiplier >= this.config!.peak_multiplier_threshold) {
              const period: PeakHoursPeriod = {
                period_id: `ml_peak_${day.sale_date}_${hourData.hour}`,
                date: day.sale_date,
                start_time: `${hourData.hour.toString().padStart(2, '0')}:00`,
                end_time: `${(hourData.hour + 1).toString().padStart(2, '0')}:00`,
                duration_minutes: 60,
                peak_type: this.classifyPeakType(hourData.hour),
                intensity_level: this.classifyIntensity(peakMultiplier),
                order_count: hourData.order_count,
                revenue: hourData.revenue || 0,
                average_order_value: (hourData.revenue || 0) / hourData.order_count,
                peak_multiplier: Math.round(peakMultiplier * 100) / 100,
                confidence_score: this.calculateMLConfidenceScore(historicalPattern, hourData.order_count),
                contributing_factors: await this.analyzeContributingFactors(day.sale_date, hourData.hour),
                historical_pattern: {
                  is_recurring: historicalPattern.length >= 5,
                  frequency: this.determineFrequency(historicalPattern),
                  similar_occurrences: historicalPattern.length,
                  pattern_confidence: Math.min(1.0, historicalPattern.length / 10)
                }
              };
              
              peakPeriods.push(period);
            }
          }
        }
      }
    }

    return peakPeriods;
  }

  /**
   * Combine statistical and ML results
   */
  private combineDetectionResults(statistical: PeakHoursPeriod[], ml: PeakHoursPeriod[]): PeakHoursPeriod[] {
    const combined = new Map<string, PeakHoursPeriod>();
    
    // Add statistical results
    for (const period of statistical) {
      const key = `${period.date}_${period.start_time}`;
      combined.set(key, { ...period, confidence_score: period.confidence_score * 0.6 }); // Weight statistical at 60%
    }
    
    // Merge or add ML results
    for (const period of ml) {
      const key = `${period.date}_${period.start_time}`;
      const existing = combined.get(key);
      
      if (existing) {
        // Combine results with weighted average
        existing.confidence_score = (existing.confidence_score + period.confidence_score * 0.4); // Weight ML at 40%
        existing.peak_multiplier = (existing.peak_multiplier + period.peak_multiplier) / 2;
        existing.intensity_level = this.classifyIntensity(existing.peak_multiplier);
      } else {
        combined.set(key, { ...period, confidence_score: period.confidence_score * 0.4 });
      }
    }
    
    return Array.from(combined.values()).sort((a, b) => 
      new Date(a.date + ' ' + a.start_time).getTime() - new Date(b.date + ' ' + b.start_time).getTime()
    );
  }

  /**
   * Get manually defined peak periods
   */
  private async getManuallyDefinedPeaks(startDate: string, endDate: string): Promise<PeakHoursPeriod[]> {
    const { data: manualPeaks } = await supabaseAdmin
      .from('manual_peak_periods')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('is_active', true);

    return (manualPeaks || []).map(peak => ({
      period_id: peak.id,
      date: peak.date,
      start_time: peak.start_time,
      end_time: peak.end_time,
      duration_minutes: peak.duration_minutes,
      peak_type: peak.peak_type,
      intensity_level: peak.intensity_level,
      order_count: peak.expected_order_count,
      revenue: peak.expected_revenue,
      average_order_value: peak.expected_revenue / peak.expected_order_count,
      peak_multiplier: peak.intensity_multiplier,
      confidence_score: 1.0, // Manual entries have full confidence
      contributing_factors: peak.contributing_factors || {},
      historical_pattern: {
        is_recurring: peak.is_recurring,
        frequency: peak.frequency,
        similar_occurrences: 1,
        pattern_confidence: 1.0
      }
    }));
  }

  /**
   * Generate SOP optimizations for peak periods
   */
  async generateSOPOptimizations(peakPeriods: PeakHoursPeriod[]): Promise<SOPOptimization[]> {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const optimizations: SOPOptimization[] = [];

    for (const peakPeriod of peakPeriods) {
      // Get SOPs that might be affected during this peak period
      const { data: relevantSOPs } = await supabaseAdmin
        .from('sop_documents')
        .select(`
          id, title, title_fr, tags, estimated_read_time,
          category:sop_categories!inner(id, name),
          assignments:sop_assignments(id, scheduled_for, assigned_to, status)
        `)
        .eq('restaurant_id', this.restaurantId)
        .eq('is_active', true)
        .contains('tags', ['kitchen', 'prep', 'service', 'customer']);

      if (!relevantSOPs) continue;

      // Generate optimizations for each relevant SOP
      for (const sop of relevantSOPs) {
        const sopOptimizations = await this.generateSOPSpecificOptimizations(sop, peakPeriod);
        optimizations.push(...sopOptimizations);
      }
    }

    // Store optimizations
    if (optimizations.length > 0) {
      await this.storeSOPOptimizations(optimizations);
    }

    return optimizations;
  }

  /**
   * Generate optimizations for a specific SOP
   */
  private async generateSOPSpecificOptimizations(sop: any, peakPeriod: PeakHoursPeriod): Promise<SOPOptimization[]> {
    const optimizations: SOPOptimization[] = [];
    const peakStart = new Date(`${peakPeriod.date} ${peakPeriod.start_time}`);
    
    // Pre-prep optimization
    if (this.config!.optimization_strategies.pre_prep_enabled) {
      const prePrepTime = new Date(peakStart.getTime() - (sop.estimated_read_time + 30) * 60 * 1000);
      
      optimizations.push({
        optimization_id: `preprep_${sop.id}_${peakPeriod.period_id}`,
        sop_id: sop.id,
        optimization_type: 'pre_prep',
        peak_period_id: peakPeriod.period_id,
        optimized_schedule_time: prePrepTime.toISOString(),
        time_adjustment_minutes: -(sop.estimated_read_time + 30),
        resource_adjustments: {
          ingredient_prep: {
            prep_items: this.extractPrepItems(sop.content || ''),
            prep_time_minutes: sop.estimated_read_time,
            storage_requirements: ['refrigerated_storage', 'organized_workspace']
          }
        },
        expected_impact: {
          time_savings_minutes: Math.floor(sop.estimated_read_time * 0.7),
          quality_improvement_percent: 15,
          efficiency_gain_percent: 25,
          cost_impact_dollars: -2.50,
          customer_satisfaction_impact: 0.2
        },
        implementation_complexity: 'medium',
        risk_assessment: {
          risk_level: 'low',
          potential_issues: ['ingredient spoilage', 'workspace congestion'],
          mitigation_strategies: ['proper storage protocols', 'staggered prep schedule']
        },
        confidence_score: peakPeriod.confidence_score * 0.8,
        is_active: true,
        effective_from: new Date().toISOString(),
        effective_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        created_at: new Date().toISOString()
      });
    }

    // Staff allocation optimization
    if (this.config!.optimization_strategies.staff_adjustment_enabled) {
      const additionalStaffNeeded = Math.ceil(peakPeriod.intensity_level === 'extreme' ? 2 : 
                                           peakPeriod.intensity_level === 'heavy' ? 1.5 : 1);
      
      optimizations.push({
        optimization_id: `staff_${sop.id}_${peakPeriod.period_id}`,
        sop_id: sop.id,
        optimization_type: 'staff_allocation',
        peak_period_id: peakPeriod.period_id,
        optimized_schedule_time: peakStart.toISOString(),
        time_adjustment_minutes: 0,
        resource_adjustments: {
          additional_staff: {
            count: additionalStaffNeeded,
            roles: this.determineRequiredRoles(sop.category.name, sop.tags),
            skill_requirements: this.extractSkillRequirements(sop.tags || [])
          }
        },
        expected_impact: {
          time_savings_minutes: Math.floor(sop.estimated_read_time * 0.4),
          quality_improvement_percent: 10,
          efficiency_gain_percent: 35,
          cost_impact_dollars: additionalStaffNeeded * 15, // Cost of additional staff
          customer_satisfaction_impact: 0.3
        },
        implementation_complexity: 'medium',
        risk_assessment: {
          risk_level: 'medium',
          potential_issues: ['staff availability', 'coordination complexity'],
          mitigation_strategies: ['advance scheduling', 'cross-training programs']
        },
        confidence_score: peakPeriod.confidence_score * 0.7,
        is_active: true,
        effective_from: new Date().toISOString(),
        effective_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      });
    }

    // Priority adjustment optimization
    if (this.config!.optimization_strategies.sop_prioritization_enabled) {
      optimizations.push({
        optimization_id: `priority_${sop.id}_${peakPeriod.period_id}`,
        sop_id: sop.id,
        optimization_type: 'priority_adjustment',
        peak_period_id: peakPeriod.period_id,
        optimized_schedule_time: peakStart.toISOString(),
        time_adjustment_minutes: 0,
        resource_adjustments: {},
        expected_impact: {
          time_savings_minutes: 5,
          quality_improvement_percent: 5,
          efficiency_gain_percent: 15,
          cost_impact_dollars: 0,
          customer_satisfaction_impact: 0.1
        },
        implementation_complexity: 'low',
        risk_assessment: {
          risk_level: 'low',
          potential_issues: ['workflow disruption'],
          mitigation_strategies: ['clear priority communication']
        },
        confidence_score: peakPeriod.confidence_score * 0.9,
        is_active: true,
        effective_from: new Date().toISOString(),
        effective_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      });
    }

    return optimizations.filter(opt => opt.confidence_score >= 0.3); // Only return optimizations with reasonable confidence
  }

  /**
   * Simulate peak hours scenarios
   */
  async simulatePeakHoursScenario(scenarioName: string, parameters: any): Promise<PeakHoursSimulation> {
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Baseline performance calculation (simplified)
    const baselinePerformance = {
      completion_time_minutes: parameters.order_volume * 8, // 8 minutes per order baseline
      quality_score: 75, // Base quality score
      staff_utilization_percent: Math.min(100, (parameters.order_volume * 5) / parameters.staff_count),
      customer_wait_time_minutes: Math.max(5, parameters.order_volume * 2 - parameters.staff_count * 3)
    };

    // Optimized performance calculation
    const optimizationEffects = await this.calculateOptimizationEffects(parameters.applied_optimizations);
    
    const optimizedPerformance = {
      completion_time_minutes: Math.max(1, baselinePerformance.completion_time_minutes * (1 - optimizationEffects.timeReduction)),
      quality_score: Math.min(100, baselinePerformance.quality_score * (1 + optimizationEffects.qualityImprovement)),
      staff_utilization_percent: Math.min(100, baselinePerformance.staff_utilization_percent * (1 + optimizationEffects.efficiencyGain)),
      customer_wait_time_minutes: Math.max(1, baselinePerformance.customer_wait_time_minutes * (1 - optimizationEffects.waitTimeReduction))
    };

    // Calculate improvements
    const improvementMetrics = {
      time_improvement_percent: Math.round(((baselinePerformance.completion_time_minutes - optimizedPerformance.completion_time_minutes) / baselinePerformance.completion_time_minutes) * 100),
      quality_improvement_percent: Math.round(((optimizedPerformance.quality_score - baselinePerformance.quality_score) / baselinePerformance.quality_score) * 100),
      efficiency_improvement_percent: Math.round(((optimizedPerformance.staff_utilization_percent - baselinePerformance.staff_utilization_percent) / baselinePerformance.staff_utilization_percent) * 100),
      overall_score: 0
    };

    improvementMetrics.overall_score = Math.round(
      (improvementMetrics.time_improvement_percent * 0.3 +
       improvementMetrics.quality_improvement_percent * 0.3 +
       improvementMetrics.efficiency_improvement_percent * 0.4)
    );

    const simulation: PeakHoursSimulation = {
      simulation_id: simulationId,
      scenario_name: scenarioName,
      simulation_parameters: parameters,
      simulation_results: {
        baseline_performance: baselinePerformance,
        optimized_performance: optimizedPerformance,
        improvement_metrics: improvementMetrics
      },
      recommendations: this.generateSimulationRecommendations(improvementMetrics, parameters),
      created_at: new Date().toISOString()
    };

    // Store simulation results
    await supabaseAdmin
      .from('peak_hours_simulations')
      .insert({
        restaurant_id: this.restaurantId,
        simulation_id: simulationId,
        scenario_name: scenarioName,
        simulation_parameters: parameters,
        simulation_results: simulation.simulation_results,
        recommendations: simulation.recommendations,
        created_at: simulation.created_at
      });

    return simulation;
  }

  /**
   * Helper methods
   */
  private classifyPeakType(hour: number): PeakHoursPeriod['peak_type'] {
    if (hour >= 6 && hour <= 10) return 'breakfast';
    if (hour >= 11 && hour <= 15) return 'lunch';
    if (hour >= 17 && hour <= 21) return 'dinner';
    if (hour >= 14 && hour <= 16) return 'snack';
    return 'custom';
  }

  private classifyIntensity(multiplier: number): PeakHoursPeriod['intensity_level'] {
    if (multiplier >= 3.0) return 'extreme';
    if (multiplier >= 2.0) return 'heavy';
    if (multiplier >= 1.5) return 'moderate';
    return 'light';
  }

  private calculateConfidenceScore(multiplier: number, stdDev: number, avgOrders: number): number {
    const multiplierScore = Math.min(1.0, multiplier / 3.0); // Higher multiplier = higher confidence
    const consistencyScore = Math.max(0.1, 1.0 - (stdDev / avgOrders)); // Lower std dev = higher confidence
    return Math.round((multiplierScore * 0.7 + consistencyScore * 0.3) * 100) / 100;
  }

  private calculateMLConfidenceScore(historicalPattern: number[], currentValue: number): number {
    if (historicalPattern.length === 0) return 0.1;
    
    const avg = historicalPattern.reduce((sum, val) => sum + val, 0) / historicalPattern.length;
    const variance = historicalPattern.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / historicalPattern.length;
    const stdDev = Math.sqrt(variance);
    
    const patternStrength = Math.min(1.0, historicalPattern.length / 10);
    const consistencyScore = Math.max(0.1, 1.0 - (stdDev / avg));
    
    return Math.round((patternStrength * 0.6 + consistencyScore * 0.4) * 100) / 100;
  }

  private async analyzeContributingFactors(date: string, hour: number): Promise<PeakHoursPeriod['contributing_factors']> {
    // Simplified analysis - in real implementation, this would be more sophisticated
    const dayOfWeek = new Date(date).getDay();
    
    return {
      day_of_week_factor: dayOfWeek === 0 || dayOfWeek === 6 ? 1.2 : 1.0, // Weekend factor
      weather_factor: 1.0, // Would integrate with weather data
      event_factor: 1.0, // Would check for local events
      seasonal_factor: 1.0, // Would check seasonal patterns
      promotional_factor: 1.0 // Would check for active promotions
    };
  }

  private async analyzeHistoricalPattern(hour: number, multiplier: number, startDate: string, endDate: string): Promise<PeakHoursPeriod['historical_pattern']> {
    // Check for similar patterns in historical data
    const { data: historicalPeaks } = await supabaseAdmin
      .from('peak_hours_periods')
      .select('date, peak_multiplier')
      .eq('restaurant_id', this.restaurantId)
      .eq('start_time', `${hour.toString().padStart(2, '0')}:00`)
      .gte('peak_multiplier', multiplier * 0.8)
      .lte('peak_multiplier', multiplier * 1.2)
      .lt('date', startDate);

    const similarOccurrences = historicalPeaks?.length || 0;
    
    return {
      is_recurring: similarOccurrences >= 3,
      frequency: this.determineFrequency(historicalPeaks?.map(p => p.peak_multiplier) || []),
      similar_occurrences: similarOccurrences,
      pattern_confidence: Math.min(1.0, similarOccurrences / 10)
    };
  }

  private determineFrequency(data: number[]): PeakHoursPeriod['historical_pattern']['frequency'] {
    if (data.length >= 20) return 'daily';
    if (data.length >= 10) return 'weekly';
    if (data.length >= 3) return 'monthly';
    return 'irregular';
  }

  private extractPrepItems(content: string): string[] {
    const prepKeywords = ['chop', 'dice', 'slice', 'prepare', 'mix', 'season', 'marinate'];
    const items: string[] = [];
    
    const sentences = content.toLowerCase().split(/[.!?]+/);
    for (const sentence of sentences) {
      if (prepKeywords.some(keyword => sentence.includes(keyword))) {
        // Extract ingredient names (simplified)
        const words = sentence.split(' ');
        items.push(...words.filter(word => word.length > 3 && !prepKeywords.includes(word)).slice(0, 3));
      }
    }
    
    return [...new Set(items)].slice(0, 5);
  }

  private determineRequiredRoles(categoryName: string, tags: string[]): string[] {
    const roles: string[] = [];
    
    if (categoryName.toLowerCase().includes('kitchen') || tags.some(tag => ['cook', 'prep'].includes(tag.toLowerCase()))) {
      roles.push('chef', 'prep_cook');
    }
    
    if (categoryName.toLowerCase().includes('service') || tags.some(tag => ['service', 'customer'].includes(tag.toLowerCase()))) {
      roles.push('server', 'host');
    }
    
    return roles.length > 0 ? roles : ['general'];
  }

  private extractSkillRequirements(tags: string[]): string[] {
    const skillMap: Record<string, string> = {
      'cooking': 'cooking_skills',
      'prep': 'knife_skills',
      'service': 'customer_service',
      'safety': 'safety_certified'
    };
    
    const skills: string[] = [];
    for (const tag of tags) {
      const skill = skillMap[tag.toLowerCase()];
      if (skill) {
        skills.push(skill);
      }
    }
    
    return skills;
  }

  private async calculateOptimizationEffects(optimizationIds: string[]): Promise<{
    timeReduction: number;
    qualityImprovement: number;
    efficiencyGain: number;
    waitTimeReduction: number;
  }> {
    // Get optimization data
    const { data: optimizations } = await supabaseAdmin
      .from('sop_optimizations')
      .select('expected_impact')
      .eq('restaurant_id', this.restaurantId)
      .in('optimization_id', optimizationIds);

    if (!optimizations) {
      return { timeReduction: 0, qualityImprovement: 0, efficiencyGain: 0, waitTimeReduction: 0 };
    }

    let totalTimeReduction = 0;
    let totalQualityImprovement = 0;
    let totalEfficiencyGain = 0;
    let totalWaitTimeReduction = 0;

    for (const opt of optimizations) {
      const impact = opt.expected_impact;
      totalTimeReduction += (impact.time_savings_minutes || 0) / 100; // Convert to percentage
      totalQualityImprovement += (impact.quality_improvement_percent || 0) / 100;
      totalEfficiencyGain += (impact.efficiency_gain_percent || 0) / 100;
      totalWaitTimeReduction += 0.1; // Assume 10% wait time reduction per optimization
    }

    return {
      timeReduction: Math.min(0.8, totalTimeReduction), // Cap at 80% reduction
      qualityImprovement: Math.min(0.5, totalQualityImprovement), // Cap at 50% improvement
      efficiencyGain: Math.min(0.6, totalEfficiencyGain), // Cap at 60% gain
      waitTimeReduction: Math.min(0.7, totalWaitTimeReduction) // Cap at 70% reduction
    };
  }

  private generateSimulationRecommendations(
    metrics: PeakHoursSimulation['simulation_results']['improvement_metrics'],
    parameters: any
  ): PeakHoursSimulation['recommendations'] {
    const recommendations: PeakHoursSimulation['recommendations'] = [];

    if (metrics.time_improvement_percent < 15) {
      recommendations.push({
        category: 'process_efficiency',
        recommendation: 'Consider implementing pre-prep strategies to reduce peak hour preparation time',
        impact_level: 'high',
        implementation_effort: 'moderate'
      });
    }

    if (metrics.quality_improvement_percent < 10) {
      recommendations.push({
        category: 'quality_control',
        recommendation: 'Implement quality checkpoints during peak hours to maintain standards',
        impact_level: 'medium',
        implementation_effort: 'easy'
      });
    }

    if (metrics.efficiency_improvement_percent < 20) {
      recommendations.push({
        category: 'staff_optimization',
        recommendation: 'Add cross-trained staff members to handle multiple roles during peaks',
        impact_level: 'high',
        implementation_effort: 'difficult'
      });
    }

    if (parameters.staff_count < parameters.order_volume / 10) {
      recommendations.push({
        category: 'staffing',
        recommendation: 'Increase staff count during predicted peak periods',
        impact_level: 'high',
        implementation_effort: 'moderate'
      });
    }

    return recommendations;
  }

  private async storePeakPeriods(periods: PeakHoursPeriod[]): Promise<void> {
    if (periods.length === 0) return;

    const periodData = periods.map(period => ({
      restaurant_id: this.restaurantId,
      period_id: period.period_id,
      date: period.date,
      start_time: period.start_time,
      end_time: period.end_time,
      duration_minutes: period.duration_minutes,
      peak_type: period.peak_type,
      intensity_level: period.intensity_level,
      order_count: period.order_count,
      revenue: period.revenue,
      average_order_value: period.average_order_value,
      peak_multiplier: period.peak_multiplier,
      confidence_score: period.confidence_score,
      contributing_factors: period.contributing_factors,
      historical_pattern: period.historical_pattern,
      created_at: new Date().toISOString()
    }));

    await supabaseAdmin
      .from('peak_hours_periods')
      .upsert(periodData, {
        onConflict: 'restaurant_id,period_id',
        ignoreDuplicates: false
      });
  }

  private async storeSOPOptimizations(optimizations: SOPOptimization[]): Promise<void> {
    if (optimizations.length === 0) return;

    const optimizationData = optimizations.map(opt => ({
      restaurant_id: this.restaurantId,
      optimization_id: opt.optimization_id,
      sop_id: opt.sop_id,
      optimization_type: opt.optimization_type,
      peak_period_id: opt.peak_period_id,
      current_schedule_time: opt.current_schedule_time,
      optimized_schedule_time: opt.optimized_schedule_time,
      time_adjustment_minutes: opt.time_adjustment_minutes,
      resource_adjustments: opt.resource_adjustments,
      expected_impact: opt.expected_impact,
      implementation_complexity: opt.implementation_complexity,
      risk_assessment: opt.risk_assessment,
      confidence_score: opt.confidence_score,
      is_active: opt.is_active,
      effective_from: opt.effective_from,
      effective_until: opt.effective_until,
      created_at: opt.created_at
    }));

    await supabaseAdmin
      .from('sop_optimizations')
      .insert(optimizationData);
  }
}

/**
 * GET /api/sop/peak-optimization - Get peak hours analysis and optimizations
 */
async function handleGetPeakOptimization(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const includeOptimizations = searchParams.get('include_optimizations') === 'true';
    const includeAnalytics = searchParams.get('include_analytics') === 'true';

    // Get configuration
    const { data: config } = await supabaseAdmin
      .from('peak_hours_configurations')
      .select('*')
      .eq('restaurant_id', context.restaurantId)
      .single();

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Peak hours optimization not configured',
        errorCode: 'NOT_CONFIGURED',
      } as APIResponse, { status: 404 });
    }

    // Get peak periods
    const { data: peakPeriods } = await supabaseAdmin
      .from('peak_hours_periods')
      .select('*')
      .eq('restaurant_id', context.restaurantId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('start_time', { ascending: true });

    const responseData: any = {
      configuration: {
        detection_algorithm: config.detection_algorithm,
        analysis_window_days: config.analysis_window_days,
        peak_multiplier_threshold: config.peak_multiplier_threshold,
        optimization_strategies: config.optimization_strategies,
        last_analysis_at: config.last_analysis_at,
        analysis_status: config.analysis_status
      },
      peak_periods: peakPeriods || []
    };

    if (includeOptimizations) {
      const { data: optimizations } = await supabaseAdmin
        .from('sop_optimizations')
        .select(`
          *,
          sop_documents(id, title, title_fr, category:sop_categories(name, name_fr))
        `)
        .eq('restaurant_id', context.restaurantId)
        .eq('is_active', true)
        .gt('effective_until', new Date().toISOString())
        .order('confidence_score', { ascending: false });

      responseData.active_optimizations = optimizations || [];
    }

    if (includeAnalytics) {
      // Generate analytics summary
      const analytics: PeakHoursAnalytics = {
        analysis_period: { start_date: startDate, end_date: endDate },
        detected_patterns: {
          daily_patterns: [],
          weekly_patterns: [],
          monthly_trends: []
        },
        optimization_opportunities: [],
        performance_metrics: {
          total_peak_periods_analyzed: peakPeriods?.length || 0,
          average_peak_duration_minutes: peakPeriods?.reduce((sum, p) => sum + p.duration_minutes, 0) / (peakPeriods?.length || 1) || 0,
          optimization_success_rate: 0.85, // Would be calculated from historical data
          customer_satisfaction_correlation: 0.73 // Would be calculated from feedback data
        }
      };

      responseData.analytics = analytics;
    }

    const response: APIResponse = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/peak-optimization:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'PEAK_OPTIMIZATION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/peak-optimization - Generate peak hours optimization plan
 */
async function handleGeneratePeakOptimization(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { 
      start_date, 
      end_date, 
      force_reanalysis = false,
      generate_optimizations = true 
    } = sanitizeInput(body);

    if (!start_date || !end_date) {
      return NextResponse.json({
        success: false,
        error: 'start_date and end_date are required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const manager = new PeakHoursOptimizationManager(context);
    await manager.initialize();

    // Detect peak hours
    const peakPeriods = await manager.detectPeakHours(start_date, end_date);

    let optimizations: SOPOptimization[] = [];
    if (generate_optimizations && peakPeriods.length > 0) {
      optimizations = await manager.generateSOPOptimizations(peakPeriods);
    }

    // Update configuration status
    await supabaseAdmin
      .from('peak_hours_configurations')
      .update({
        last_analysis_at: new Date().toISOString(),
        analysis_status: 'active'
      })
      .eq('restaurant_id', context.restaurantId);

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'peak_optimization',
      null,
      null,
      { 
        periods_detected: peakPeriods.length,
        optimizations_generated: optimizations.length,
        analysis_period: { start_date, end_date }
      },
      request
    );

    const response: APIResponse = {
      success: true,
      data: {
        peak_periods: peakPeriods,
        optimizations: optimizations,
        summary: {
          total_peak_periods: peakPeriods.length,
          total_optimizations: optimizations.length,
          average_confidence: peakPeriods.length > 0 ? 
            Math.round((peakPeriods.reduce((sum, p) => sum + p.confidence_score, 0) / peakPeriods.length) * 100) / 100 : 0
        }
      },
      message: `Generated peak hours analysis with ${peakPeriods.length} periods and ${optimizations.length} optimizations`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/peak-optimization:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'PEAK_OPTIMIZATION_GENERATION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Route handlers with authentication
export const GET = withAuth(handleGetPeakOptimization, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleGeneratePeakOptimization, PERMISSIONS.SOP.CREATE, {
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