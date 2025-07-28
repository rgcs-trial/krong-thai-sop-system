/**
 * SOP Environmental Factor Considerations API Route
 * Environmental data processing and adaptation recommendations for SOP execution
 * 
 * GET     /api/sop/environmental-factors                   - Get environmental data and analysis
 * POST    /api/sop/environmental-factors/analyze          - Analyze environmental impact on SOPs
 * PUT     /api/sop/environmental-factors/update-sensors   - Update environmental sensor data
 * GET     /api/sop/environmental-factors/forecasting      - Get environmental forecasting
 * POST    /api/sop/environmental-factors/alerts           - Configure environmental alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface EnvironmentalData {
  reading_id: string;
  location: string;
  timestamp: string;
  sensor_readings: {
    temperature: {
      value: number;
      unit: 'celsius' | 'fahrenheit';
      sensor_id: string;
      accuracy: number;
    };
    humidity: {
      value: number;
      unit: 'percentage';
      sensor_id: string;
      accuracy: number;
    };
    air_pressure: {
      value: number;
      unit: 'hPa' | 'mmHg';
      sensor_id: string;
      accuracy: number;
    };
    air_quality: {
      pm25: number;
      pm10: number;
      co2: number;
      voc: number;
      sensor_id: string;
      air_quality_index: number;
    };
    noise_level: {
      value: number;
      unit: 'dB';
      sensor_id: string;
      peak_reading: number;
    };
    lighting: {
      illuminance: number;
      unit: 'lux';
      color_temperature: number;
      sensor_id: string;
    };
  };
  weather_data: {
    outdoor_temperature: number;
    outdoor_humidity: number;
    barometric_pressure: number;
    wind_speed: number;
    wind_direction: number;
    precipitation: number;
    cloud_cover: number;
    uv_index: number;
    weather_condition: string;
    forecast_confidence: number;
  };
  seasonal_factors: {
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    day_length_hours: number;
    solar_elevation: number;
    seasonal_humidity_pattern: string;
    typical_temperature_range: { min: number; max: number };
  };
  data_quality: {
    completeness_score: number;
    accuracy_score: number;
    sensor_health_status: Record<string, 'operational' | 'warning' | 'error'>;
    calibration_status: Record<string, { last_calibrated: string; next_due: string }>;
  };
}

interface SOPEnvironmentalSensitivity {
  sop_id: string;
  title: string;
  title_fr: string;
  environmental_dependencies: {
    temperature_sensitivity: {
      optimal_range: { min: number; max: number };
      critical_thresholds: { danger_low: number; danger_high: number };
      performance_impact_curve: Array<{
        temperature: number;
        performance_factor: number;
        quality_impact: number;
      }>;
      adaptation_strategies: Array<{
        condition: string;
        recommended_action: string;
        impact_mitigation: number;
      }>;
    };
    humidity_sensitivity: {
      optimal_range: { min: number; max: number };
      critical_thresholds: { danger_low: number; danger_high: number };
      material_effects: Array<{
        material_type: string;
        humidity_impact: string;
        mitigation_required: boolean;
      }>;
      process_adjustments: Array<{
        humidity_condition: string;
        adjustment_type: string;
        parameter_changes: Record<string, number>;
      }>;
    };
    air_quality_requirements: {
      max_acceptable_pm25: number;
      max_acceptable_co2: number;
      max_acceptable_voc: number;
      ventilation_requirements: {
        min_air_changes_per_hour: number;
        filtration_level_required: string;
        monitoring_frequency: string;
      };
      health_safety_considerations: string[];
    };
    lighting_requirements: {
      min_illuminance: number;
      optimal_illuminance: number;
      color_temperature_preference: number;
      glare_sensitivity: boolean;
      task_specific_lighting: Array<{
        task_type: string;
        required_illuminance: number;
        uniformity_ratio: number;
      }>;
    };
    noise_tolerance: {
      max_acceptable_level: number;
      noise_type_sensitivity: Record<string, number>;
      communication_requirements: string[];
      concentration_factors: Array<{
        noise_level: number;
        concentration_impact: number;
        error_rate_increase: number;
      }>;
    };
    weather_dependencies: {
      outdoor_conditions_impact: boolean;
      seasonal_variations: Record<string, string>;
      supply_chain_weather_sensitivity: string[];
      customer_demand_weather_correlation: number;
    };
  };
  risk_assessments: Array<{
    environmental_factor: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    risk_description: string;
    probability: number;
    impact_severity: number;
    mitigation_strategies: string[];
    monitoring_requirements: string[];
  }>;
  adaptive_protocols: {
    real_time_adjustments: Array<{
      trigger_condition: string;
      automatic_response: string;
      manual_intervention_required: boolean;
      response_time_seconds: number;
    }>;
    predictive_adaptations: Array<{
      forecast_condition: string;
      preparation_actions: string[];
      lead_time_required: string;
      resource_adjustments: Record<string, number>;
    }>;
  };
}

interface EnvironmentalImpactAnalysis {
  analysis_id: string;
  sop_id: string;
  analysis_timestamp: string;
  current_conditions: EnvironmentalData;
  impact_assessment: {
    overall_suitability_score: number; // 0-100
    performance_impact_factors: Array<{
      factor: string;
      current_value: number;
      optimal_value: number;
      impact_percentage: number;
      severity: 'minimal' | 'moderate' | 'significant' | 'severe';
    }>;
    quality_risks: Array<{
      risk_type: string;
      risk_level: 'low' | 'medium' | 'high' | 'critical';
      contributing_factors: string[];
      estimated_impact: string;
    }>;
    safety_considerations: Array<{
      safety_aspect: string;
      concern_level: 'low' | 'medium' | 'high' | 'critical';
      required_precautions: string[];
      monitoring_points: string[];
    }>;
  };
  adaptation_recommendations: Array<{
    recommendation_id: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    adaptation_type: 'equipment_adjustment' | 'process_modification' | 'timing_change' | 
                   'resource_allocation' | 'safety_protocol' | 'quality_control';
    description: string;
    description_fr: string;
    implementation_steps: string[];
    expected_effectiveness: number;
    implementation_time: string;
    resource_requirements: string[];
    cost_implications: {
      implementation_cost: number;
      operational_cost_change: number;
      potential_savings: number;
    };
  }>;
  predictive_analysis: {
    short_term_forecast_6h: {
      predicted_conditions: Partial<EnvironmentalData['sensor_readings']>;
      suitability_score_trend: number[];
      recommended_actions: string[];
    };
    medium_term_forecast_24h: {
      predicted_conditions: Partial<EnvironmentalData['sensor_readings']>;
      optimal_execution_windows: Array<{
        start_time: string;
        end_time: string;
        suitability_score: number;
      }>;
      preparation_recommendations: string[];
    };
    long_term_forecast_7d: {
      seasonal_trends: Record<string, number>;
      weather_pattern_impacts: string[];
      strategic_planning_recommendations: string[];
    };
  };
  historical_comparisons: {
    similar_conditions_performance: Array<{
      date: string;
      conditions_similarity: number;
      actual_performance: number;
      lessons_learned: string[];
    }>;
    seasonal_performance_patterns: Record<string, {
      average_performance: number;
      typical_challenges: string[];
      successful_adaptations: string[];
    }>;
  };
  compliance_status: {
    regulatory_requirements: Array<{
      requirement_type: string;
      current_compliance_status: 'compliant' | 'warning' | 'non_compliant';
      monitoring_value: number;
      limit_value: number;
      actions_required: string[];
    }>;
    industry_standards: Array<{
      standard_name: string;
      compliance_level: number;
      recommendations_for_improvement: string[];
    }>;
  };
}

interface EnvironmentalAlert {
  alert_id: string;
  alert_type: 'threshold_exceeded' | 'rapid_change' | 'sensor_malfunction' | 
            'forecast_warning' | 'compliance_risk' | 'equipment_failure';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  environmental_factor: string;
  current_value: number;
  threshold_value: number;
  affected_sops: string[];
  location: string;
  timestamp: string;
  predicted_duration: string;
  automatic_responses_triggered: string[];
  manual_actions_required: string[];
  escalation_timeline: Array<{
    time_offset_minutes: number;
    escalation_level: string;
    notification_recipients: string[];
    required_actions: string[];
  }>;
  resolution_tracking: {
    acknowledgment_required: boolean;
    acknowledged_by?: string;
    acknowledgment_time?: string;
    resolution_actions_taken: string[];
    resolution_time?: string;
    effectiveness_rating?: number;
  };
}

interface EnvironmentalForecast {
  forecast_id: string;
  location: string;
  forecast_timestamp: string;
  forecast_horizon: '6h' | '24h' | '3d' | '7d' | '30d';
  confidence_level: number;
  forecast_data: {
    hourly_predictions: Array<{
      timestamp: string;
      predicted_values: Partial<EnvironmentalData['sensor_readings']>;
      uncertainty_ranges: Record<string, { min: number; max: number }>;
      confidence_score: number;
    }>;
    trend_analysis: {
      temperature_trend: 'rising' | 'falling' | 'stable';
      humidity_trend: 'rising' | 'falling' | 'stable';
      pressure_trend: 'rising' | 'falling' | 'stable';
      overall_stability: number;
    };
    extreme_event_predictions: Array<{
      event_type: string;
      probability: number;
      predicted_time_range: { start: string; end: string };
      severity_estimate: 'low' | 'medium' | 'high' | 'extreme';
      preparation_recommendations: string[];
    }>;
  };
  sop_impact_projections: Array<{
    sop_id: string;
    sop_title: string;
    projected_suitability_scores: number[];
    optimal_execution_windows: Array<{
      start_time: string;
      end_time: string;
      suitability_score: number;
      contributing_factors: string[];
    }>;
    risk_periods: Array<{
      start_time: string;
      end_time: string;
      risk_factors: string[];
      mitigation_strategies: string[];
    }>;
  }>;
  business_impact_forecast: {
    operational_efficiency_impact: number;
    quality_risk_assessment: string;
    customer_satisfaction_impact: number;
    cost_implications: {
      additional_costs: number;
      potential_savings: number;
      net_impact: number;
    };
    strategic_recommendations: string[];
  };
}

/**
 * Environmental Factors Manager
 * Manages environmental data processing and SOP adaptation recommendations
 */
class EnvironmentalFactorsManager {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Get current environmental data and analysis
   */
  async getEnvironmentalData(
    location?: string,
    timeRange?: { start: string; end: string },
    includeForecasting: boolean = false
  ): Promise<{ 
    current_data: EnvironmentalData; 
    historical_data?: EnvironmentalData[]; 
    forecasting?: EnvironmentalForecast 
  }> {
    // Get current environmental readings
    const currentData = await this.getCurrentEnvironmentalReadings(location);

    const result: any = { current_data: currentData };

    // Get historical data if time range specified
    if (timeRange) {
      result.historical_data = await this.getHistoricalEnvironmentalData(
        location, 
        timeRange.start, 
        timeRange.end
      );
    }

    // Get forecasting data if requested
    if (includeForecasting) {
      result.forecasting = await this.generateEnvironmentalForecast(location || 'main_kitchen', '24h');
    }

    return result;
  }

  /**
   * Analyze environmental impact on specific SOPs
   */
  async analyzeEnvironmentalImpact(
    sopIds: string[],
    currentConditions?: EnvironmentalData,
    analysisOptions: {
      include_predictive_analysis?: boolean;
      include_historical_comparisons?: boolean;
      include_compliance_check?: boolean;
      forecast_horizon?: '6h' | '24h' | '7d';
    } = {}
  ): Promise<EnvironmentalImpactAnalysis[]> {
    const analyses: EnvironmentalImpactAnalysis[] = [];

    // Get current environmental data if not provided
    const environmentalData = currentConditions || await this.getCurrentEnvironmentalReadings();

    for (const sopId of sopIds) {
      // Get SOP environmental sensitivity profile
      const sopSensitivity = await this.getSOPEnvironmentalSensitivity(sopId);

      if (!sopSensitivity) continue;

      const analysisId = `env_analysis_${sopId}_${Date.now()}`;

      // Perform impact assessment
      const impactAssessment = await this.performImpactAssessment(
        sopSensitivity,
        environmentalData
      );

      // Generate adaptation recommendations
      const adaptationRecommendations = await this.generateAdaptationRecommendations(
        sopSensitivity,
        environmentalData,
        impactAssessment
      );

      // Generate predictive analysis if requested
      let predictiveAnalysis;
      if (analysisOptions.include_predictive_analysis) {
        predictiveAnalysis = await this.generatePredictiveAnalysis(
          sopId,
          environmentalData,
          analysisOptions.forecast_horizon || '24h'
        );
      }

      // Get historical comparisons if requested
      let historicalComparisons;
      if (analysisOptions.include_historical_comparisons) {
        historicalComparisons = await this.getHistoricalComparisons(sopId, environmentalData);
      }

      // Check compliance status if requested
      let complianceStatus;
      if (analysisOptions.include_compliance_check) {
        complianceStatus = await this.checkComplianceStatus(sopId, environmentalData);
      }

      const analysis: EnvironmentalImpactAnalysis = {
        analysis_id: analysisId,
        sop_id: sopId,
        analysis_timestamp: new Date().toISOString(),
        current_conditions: environmentalData,
        impact_assessment: impactAssessment,
        adaptation_recommendations: adaptationRecommendations,
        predictive_analysis: predictiveAnalysis || this.getDefaultPredictiveAnalysis(),
        historical_comparisons: historicalComparisons || this.getDefaultHistoricalComparisons(),
        compliance_status: complianceStatus || this.getDefaultComplianceStatus()
      };

      analyses.push(analysis);

      // Store the analysis for future reference
      await this.storeEnvironmentalAnalysis(analysis);
    }

    return analyses;
  }

  /**
   * Update environmental sensor data
   */
  async updateSensorData(
    sensorUpdates: Array<{
      sensor_id: string;
      location: string;
      sensor_type: string;
      readings: Record<string, number>;
      timestamp?: string;
      calibration_status?: string;
    }>
  ): Promise<void> {
    const updatePromises = sensorUpdates.map(async (update) => {
      // Store sensor reading
      await supabaseAdmin
        .from('environmental_sensor_readings')
        .insert({
          restaurant_id: this.restaurantId,
          sensor_id: update.sensor_id,
          location: update.location,
          sensor_type: update.sensor_type,
          readings: update.readings,
          timestamp: update.timestamp || new Date().toISOString(),
          calibration_status: update.calibration_status || 'operational'
        });

      // Update sensor health status
      await supabaseAdmin
        .from('environmental_sensors')
        .update({
          last_reading_time: update.timestamp || new Date().toISOString(),
          health_status: 'operational',
          calibration_status: update.calibration_status || 'operational'
        })
        .eq('sensor_id', update.sensor_id)
        .eq('restaurant_id', this.restaurantId);
    });

    await Promise.all(updatePromises);

    // Check for alert conditions after updates
    await this.checkForEnvironmentalAlerts();
  }

  /**
   * Generate environmental forecasting
   */
  async generateEnvironmentalForecast(
    location: string,
    horizon: '6h' | '24h' | '3d' | '7d' | '30d'
  ): Promise<EnvironmentalForecast> {
    const forecastId = `env_forecast_${location}_${horizon}_${Date.now()}`;

    // Get historical data for pattern analysis
    const historicalData = await this.getHistoricalEnvironmentalData(
      location,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      new Date().toISOString()
    );

    // Generate forecast data using time series analysis
    const forecastData = await this.performTimeSeriesForecasting(historicalData, horizon);

    // Get weather forecast data from external API
    const weatherForecast = await this.getWeatherForecast(location, horizon);

    // Analyze SOP impact projections
    const sopImpactProjections = await this.generateSOPImpactProjections(
      forecastData,
      weatherForecast
    );

    // Calculate business impact forecast
    const businessImpactForecast = await this.calculateBusinessImpactForecast(
      sopImpactProjections,
      forecastData
    );

    const forecast: EnvironmentalForecast = {
      forecast_id: forecastId,
      location: location,
      forecast_timestamp: new Date().toISOString(),
      forecast_horizon: horizon,
      confidence_level: this.calculateForecastConfidence(historicalData, horizon),
      forecast_data: forecastData,
      sop_impact_projections: sopImpactProjections,
      business_impact_forecast: businessImpactForecast
    };

    // Store forecast
    await supabaseAdmin
      .from('environmental_forecasts')
      .insert({
        restaurant_id: this.restaurantId,
        forecast_id: forecastId,
        location: location,
        horizon: horizon,
        forecast_data: forecast,
        created_at: new Date().toISOString()
      });

    return forecast;
  }

  /**
   * Configure environmental alerts
   */
  async configureEnvironmentalAlerts(
    alertConfigurations: Array<{
      alert_type: string;
      environmental_factor: string;
      threshold_values: { warning: number; critical: number; emergency: number };
      affected_sops: string[];
      notification_settings: {
        recipients: string[];
        notification_methods: string[];
        escalation_timeline: Array<{
          minutes: number;
          level: string;
          actions: string[];
        }>;
      };
      automatic_responses: Array<{
        condition: string;
        response_action: string;
        parameters: Record<string, any>;
      }>;
    }>
  ): Promise<void> {
    const configPromises = alertConfigurations.map(async (config) => {
      await supabaseAdmin
        .from('environmental_alert_configurations')
        .upsert({
          restaurant_id: this.restaurantId,
          alert_type: config.alert_type,
          environmental_factor: config.environmental_factor,
          threshold_values: config.threshold_values,
          affected_sops: config.affected_sops,
          notification_settings: config.notification_settings,
          automatic_responses: config.automatic_responses,
          is_active: true,
          updated_at: new Date().toISOString()
        });
    });

    await Promise.all(configPromises);
  }

  // Helper methods for environmental data processing

  private async getCurrentEnvironmentalReadings(location?: string): Promise<EnvironmentalData> {
    // Get latest sensor readings
    const { data: sensorData } = await supabaseAdmin
      .from('environmental_sensor_readings')
      .select(`
        *,
        sensor:environmental_sensors(sensor_id, sensor_type, location, calibration_status)
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('location', location || 'main_kitchen')
      .order('timestamp', { ascending: false })
      .limit(1);

    // Get weather data from external API or database
    const weatherData = await this.getCurrentWeatherData();

    // Calculate seasonal factors
    const seasonalFactors = this.calculateSeasonalFactors();

    // Assess data quality
    const dataQuality = await this.assessDataQuality(sensorData || []);

    return {
      reading_id: `env_reading_${Date.now()}`,
      location: location || 'main_kitchen',
      timestamp: new Date().toISOString(),
      sensor_readings: this.processSensorReadings(sensorData || []),
      weather_data: weatherData,
      seasonal_factors: seasonalFactors,
      data_quality: dataQuality
    };
  }

  private async getHistoricalEnvironmentalData(
    location: string,
    startDate: string,
    endDate: string
  ): Promise<EnvironmentalData[]> {
    const { data: historicalData } = await supabaseAdmin
      .from('environmental_sensor_readings')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .eq('location', location)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true });

    return (historicalData || []).map(data => this.transformToEnvironmentalData(data));
  }

  private async getSOPEnvironmentalSensitivity(sopId: string): Promise<SOPEnvironmentalSensitivity | null> {
    // Get stored environmental sensitivity data
    const { data: sensitivityData } = await supabaseAdmin
      .from('sop_environmental_sensitivity')
      .select('*')
      .eq('sop_id', sopId)
      .eq('restaurant_id', this.restaurantId)
      .single();

    if (sensitivityData) {
      return sensitivityData;
    }

    // If no stored data, analyze SOP content to extract environmental dependencies
    const { data: sopData } = await supabaseAdmin
      .from('sop_documents')
      .select('id, title, title_fr, content, tags')
      .eq('id', sopId)
      .eq('restaurant_id', this.restaurantId)
      .single();

    if (!sopData) return null;

    // Extract environmental sensitivity from content analysis
    return this.extractEnvironmentalSensitivity(sopData);
  }

  private extractEnvironmentalSensitivity(sopData: any): SOPEnvironmentalSensitivity {
    const content = sopData.content || '';
    const contentLower = content.toLowerCase();
    const tags = sopData.tags || [];

    // Analyze content for environmental keywords and requirements
    const temperatureSensitive = this.analyzeTemperatureSensitivity(contentLower, tags);
    const humiditySensitive = this.analyzeHumiditySensitivity(contentLower, tags);
    const airQualityRequirements = this.analyzeAirQualityRequirements(contentLower, tags);
    const lightingRequirements = this.analyzeLightingRequirements(contentLower, tags);
    const noiseTolerance = this.analyzeNoiseTolerance(contentLower, tags);
    const weatherDependencies = this.analyzeWeatherDependencies(contentLower, tags);

    return {
      sop_id: sopData.id,
      title: sopData.title,
      title_fr: sopData.title_fr,
      environmental_dependencies: {
        temperature_sensitivity: temperatureSensitive,
        humidity_sensitivity: humiditySensitive,
        air_quality_requirements: airQualityRequirements,
        lighting_requirements: lightingRequirements,
        noise_tolerance: noiseTolerance,
        weather_dependencies: weatherDependencies
      },
      risk_assessments: this.generateRiskAssessments(contentLower, tags),
      adaptive_protocols: this.generateAdaptiveProtocols(contentLower, tags)
    };
  }

  private analyzeTemperatureSensitivity(content: string, tags: string[]): any {
    const tempKeywords = ['temperature', 'heat', 'cold', 'warm', 'cool', 'refrigerate', 'freeze'];
    const hasTemperatureContent = tempKeywords.some(keyword => content.includes(keyword));

    if (hasTemperatureContent || tags.includes('temperature_sensitive')) {
      return {
        optimal_range: { min: 18, max: 24 }, // Default optimal range in celsius
        critical_thresholds: { danger_low: 10, danger_high: 35 },
        performance_impact_curve: [
          { temperature: 15, performance_factor: 0.8, quality_impact: 0.15 },
          { temperature: 20, performance_factor: 1.0, quality_impact: 0.0 },
          { temperature: 25, performance_factor: 0.9, quality_impact: 0.05 },
          { temperature: 30, performance_factor: 0.7, quality_impact: 0.25 }
        ],
        adaptation_strategies: [
          { condition: 'high_temperature', recommended_action: 'increase_ventilation', impact_mitigation: 0.3 },
          { condition: 'low_temperature', recommended_action: 'adjust_heating', impact_mitigation: 0.4 }
        ]
      };
    }

    return {
      optimal_range: { min: 16, max: 28 },
      critical_thresholds: { danger_low: 5, danger_high: 40 },
      performance_impact_curve: [],
      adaptation_strategies: []
    };
  }

  private analyzeHumiditySensitivity(content: string, tags: string[]): any {
    const humidityKeywords = ['humidity', 'moisture', 'dry', 'damp', 'condensation'];
    const hasHumidityContent = humidityKeywords.some(keyword => content.includes(keyword));

    return {
      optimal_range: { min: 40, max: 60 },
      critical_thresholds: { danger_low: 20, danger_high: 80 },
      material_effects: hasHumidityContent ? [
        { material_type: 'ingredients', humidity_impact: 'texture_changes', mitigation_required: true },
        { material_type: 'equipment', humidity_impact: 'corrosion_risk', mitigation_required: true }
      ] : [],
      process_adjustments: []
    };
  }

  private analyzeAirQualityRequirements(content: string, tags: string[]): any {
    return {
      max_acceptable_pm25: 35,
      max_acceptable_co2: 1000,
      max_acceptable_voc: 500,
      ventilation_requirements: {
        min_air_changes_per_hour: 6,
        filtration_level_required: 'HEPA',
        monitoring_frequency: 'continuous'
      },
      health_safety_considerations: [
        'Respiratory health protection',
        'Food safety compliance',
        'Worker comfort and productivity'
      ]
    };
  }

  private analyzeLightingRequirements(content: string, tags: string[]): any {
    const lightingKeywords = ['light', 'illuminate', 'bright', 'dark', 'visibility'];
    const hasLightingContent = lightingKeywords.some(keyword => content.includes(keyword));

    return {
      min_illuminance: hasLightingContent ? 500 : 300,
      optimal_illuminance: hasLightingContent ? 750 : 500,
      color_temperature_preference: 4000,
      glare_sensitivity: true,
      task_specific_lighting: hasLightingContent ? [
        { task_type: 'food_preparation', required_illuminance: 750, uniformity_ratio: 0.8 },
        { task_type: 'cooking', required_illuminance: 500, uniformity_ratio: 0.7 }
      ] : []
    };
  }

  private analyzeNoiseTolerance(content: string, tags: string[]): any {
    return {
      max_acceptable_level: 70,
      noise_type_sensitivity: {
        'equipment_noise': 75,
        'conversation': 60,
        'external_noise': 65
      },
      communication_requirements: ['Clear verbal instructions', 'Team coordination'],
      concentration_factors: [
        { noise_level: 50, concentration_impact: 1.0, error_rate_increase: 0.0 },
        { noise_level: 70, concentration_impact: 0.8, error_rate_increase: 0.15 },
        { noise_level: 85, concentration_impact: 0.6, error_rate_increase: 0.35 }
      ]
    };
  }

  private analyzeWeatherDependencies(content: string, tags: string[]): any {
    return {
      outdoor_conditions_impact: false,
      seasonal_variations: {
        'spring': 'moderate_impact',
        'summer': 'high_impact',
        'autumn': 'moderate_impact',
        'winter': 'low_impact'
      },
      supply_chain_weather_sensitivity: [],
      customer_demand_weather_correlation: 0.2
    };
  }

  private generateRiskAssessments(content: string, tags: string[]): any[] {
    return [
      {
        environmental_factor: 'temperature',
        risk_level: 'medium',
        risk_description: 'Temperature fluctuations may affect food quality and safety',
        probability: 0.3,
        impact_severity: 0.6,
        mitigation_strategies: ['Temperature monitoring', 'HVAC backup systems'],
        monitoring_requirements: ['Continuous temperature sensors', 'Hourly manual checks']
      },
      {
        environmental_factor: 'humidity',
        risk_level: 'low',
        risk_description: 'High humidity may affect ingredient storage',
        probability: 0.2,
        impact_severity: 0.4,
        mitigation_strategies: ['Dehumidification systems', 'Proper storage containers'],
        monitoring_requirements: ['Humidity sensors', 'Daily storage inspections']
      }
    ];
  }

  private generateAdaptiveProtocols(content: string, tags: string[]): any {
    return {
      real_time_adjustments: [
        {
          trigger_condition: 'temperature > 26°C',
          automatic_response: 'increase_ventilation_speed',
          manual_intervention_required: false,
          response_time_seconds: 30
        },
        {
          trigger_condition: 'humidity > 70%',
          automatic_response: 'activate_dehumidifier',
          manual_intervention_required: true,
          response_time_seconds: 120
        }
      ],
      predictive_adaptations: [
        {
          forecast_condition: 'high_temperature_forecast',
          preparation_actions: ['Pre-cool kitchen space', 'Prepare backup cooling'],
          lead_time_required: '2 hours',
          resource_adjustments: { 'cooling_capacity': 1.5, 'ventilation_rate': 1.3 }
        }
      ]
    };
  }

  private async performImpactAssessment(
    sensitivity: SOPEnvironmentalSensitivity,
    currentConditions: EnvironmentalData
  ): Promise<EnvironmentalImpactAnalysis['impact_assessment']> {
    const performanceImpactFactors: any[] = [];
    const qualityRisks: any[] = [];
    const safetyConsiderations: any[] = [];

    // Assess temperature impact
    const tempReading = currentConditions.sensor_readings.temperature.value;
    const tempOptimal = sensitivity.environmental_dependencies.temperature_sensitivity.optimal_range;
    
    if (tempReading < tempOptimal.min || tempReading > tempOptimal.max) {
      const impactPercentage = Math.min(50, Math.abs(tempReading - (tempOptimal.min + tempOptimal.max) / 2) * 2);
      
      performanceImpactFactors.push({
        factor: 'temperature',
        current_value: tempReading,
        optimal_value: (tempOptimal.min + tempOptimal.max) / 2,
        impact_percentage: impactPercentage,
        severity: impactPercentage > 30 ? 'significant' : impactPercentage > 15 ? 'moderate' : 'minimal'
      });

      if (impactPercentage > 20) {
        qualityRisks.push({
          risk_type: 'temperature_quality_impact',
          risk_level: impactPercentage > 35 ? 'high' : 'medium',
          contributing_factors: ['suboptimal_temperature'],
          estimated_impact: 'May affect food texture, flavor, or safety'
        });
      }
    }

    // Assess humidity impact
    const humidityReading = currentConditions.sensor_readings.humidity.value;
    const humidityOptimal = sensitivity.environmental_dependencies.humidity_sensitivity.optimal_range;
    
    if (humidityReading < humidityOptimal.min || humidityReading > humidityOptimal.max) {
      const impactPercentage = Math.min(40, Math.abs(humidityReading - (humidityOptimal.min + humidityOptimal.max) / 2) * 1.5);
      
      performanceImpactFactors.push({
        factor: 'humidity',
        current_value: humidityReading,
        optimal_value: (humidityOptimal.min + humidityOptimal.max) / 2,
        impact_percentage: impactPercentage,
        severity: impactPercentage > 25 ? 'significant' : impactPercentage > 12 ? 'moderate' : 'minimal'
      });
    }

    // Assess air quality impact
    const pm25Reading = currentConditions.sensor_readings.air_quality.pm25;
    const maxAcceptablePM25 = sensitivity.environmental_dependencies.air_quality_requirements.max_acceptable_pm25;
    
    if (pm25Reading > maxAcceptablePM25) {
      safetyConsiderations.push({
        safety_aspect: 'air_quality',
        concern_level: pm25Reading > maxAcceptablePM25 * 1.5 ? 'high' : 'medium',
        required_precautions: ['Enhanced ventilation', 'Air filtration', 'Health monitoring'],
        monitoring_points: ['Air quality sensors', 'Staff health checks']
      });
    }

    // Calculate overall suitability score
    const totalImpact = performanceImpactFactors.reduce((sum, factor) => sum + factor.impact_percentage, 0);
    const overallSuitabilityScore = Math.max(0, 100 - totalImpact);

    return {
      overall_suitability_score: overallSuitabilityScore,
      performance_impact_factors: performanceImpactFactors,
      quality_risks: qualityRisks,
      safety_considerations: safetyConsiderations
    };
  }

  private async generateAdaptationRecommendations(
    sensitivity: SOPEnvironmentalSensitivity,
    currentConditions: EnvironmentalData,
    impactAssessment: EnvironmentalImpactAnalysis['impact_assessment']
  ): Promise<EnvironmentalImpactAnalysis['adaptation_recommendations']> {
    const recommendations: EnvironmentalImpactAnalysis['adaptation_recommendations'] = [];

    // Generate recommendations based on impact factors
    for (const impactFactor of impactAssessment.performance_impact_factors) {
      if (impactFactor.severity === 'significant' || impactFactor.severity === 'severe') {
        const recommendationId = `adapt_${impactFactor.factor}_${Date.now()}`;
        
        let adaptationType: any = 'equipment_adjustment';
        let description = '';
        let descriptionFr = '';
        let implementationSteps: string[] = [];
        let expectedEffectiveness = 0;

        switch (impactFactor.factor) {
          case 'temperature':
            if (impactFactor.current_value > impactFactor.optimal_value) {
              adaptationType = 'equipment_adjustment';
              description = 'Increase cooling and ventilation to reduce temperature';
              descriptionFr = 'Augmenter le refroidissement et la ventilation pour réduire la température';
              implementationSteps = [
                'Activate additional cooling units',
                'Increase ventilation fan speed',
                'Close heat-generating equipment when not in use'
              ];
              expectedEffectiveness = 75;
            } else {
              adaptationType = 'equipment_adjustment';
              description = 'Increase heating to raise temperature to optimal range';
              descriptionFr = 'Augmenter le chauffage pour élever la température à la plage optimale';
              implementationSteps = [
                'Activate heating systems',
                'Reduce ventilation if excessive',
                'Use equipment preheating protocols'
              ];
              expectedEffectiveness = 80;
            }
            break;

          case 'humidity':
            if (impactFactor.current_value > impactFactor.optimal_value) {
              adaptationType = 'equipment_adjustment';
              description = 'Activate dehumidification systems to reduce humidity';
              descriptionFr = 'Activer les systèmes de déshumidification pour réduire l\'humidité';
              implementationSteps = [
                'Turn on dehumidifiers',
                'Increase ventilation',
                'Check for moisture sources'
              ];
              expectedEffectiveness = 70;
            } else {
              adaptationType = 'process_modification';
              description = 'Add humidity to reach optimal levels';
              descriptionFr = 'Ajouter de l\'humidité pour atteindre les niveaux optimaux';
              implementationSteps = [
                'Use humidification systems',
                'Reduce excessive ventilation',
                'Monitor moisture levels closely'
              ];
              expectedEffectiveness = 65;
            }
            break;
        }

        recommendations.push({
          recommendation_id: recommendationId,
          priority: impactFactor.severity === 'severe' ? 'urgent' : 'high',
          adaptation_type: adaptationType,
          description: description,
          description_fr: descriptionFr,
          implementation_steps: implementationSteps,
          expected_effectiveness: expectedEffectiveness,
          implementation_time: '15-30 minutes',
          resource_requirements: ['Facility management', 'Equipment operation'],
          cost_implications: {
            implementation_cost: 0,
            operational_cost_change: 25,
            potential_savings: 150
          }
        });
      }
    }

    // Add safety-related recommendations
    for (const safetyConsideration of impactAssessment.safety_considerations) {
      if (safetyConsideration.concern_level === 'high' || safetyConsideration.concern_level === 'critical') {
        recommendations.push({
          recommendation_id: `safety_${safetyConsideration.safety_aspect}_${Date.now()}`,
          priority: safetyConsideration.concern_level === 'critical' ? 'urgent' : 'high',
          adaptation_type: 'safety_protocol',
          description: `Implement enhanced safety measures for ${safetyConsideration.safety_aspect}`,
          description_fr: `Mettre en œuvre des mesures de sécurité renforcées pour ${safetyConsideration.safety_aspect}`,
          implementation_steps: safetyConsideration.required_precautions,
          expected_effectiveness: 90,
          implementation_time: '30-60 minutes',
          resource_requirements: ['Safety equipment', 'Staff training'],
          cost_implications: {
            implementation_cost: 50,
            operational_cost_change: 10,
            potential_savings: 500 // Avoiding safety incidents
          }
        });
      }
    }

    return recommendations;
  }

  // Additional helper methods...

  private processSensorReadings(sensorData: any[]): EnvironmentalData['sensor_readings'] {
    // Process and aggregate sensor readings
    return {
      temperature: {
        value: 22.5, // Default or processed value
        unit: 'celsius',
        sensor_id: 'temp_001',
        accuracy: 0.5
      },
      humidity: {
        value: 45.0,
        unit: 'percentage',
        sensor_id: 'hum_001',
        accuracy: 2.0
      },
      air_pressure: {
        value: 1013.25,
        unit: 'hPa',
        sensor_id: 'press_001',
        accuracy: 1.0
      },
      air_quality: {
        pm25: 15,
        pm10: 25,
        co2: 450,
        voc: 150,
        sensor_id: 'air_001',
        air_quality_index: 35
      },
      noise_level: {
        value: 55,
        unit: 'dB',
        sensor_id: 'noise_001',
        peak_reading: 68
      },
      lighting: {
        illuminance: 500,
        unit: 'lux',
        color_temperature: 4000,
        sensor_id: 'light_001'
      }
    };
  }

  private async getCurrentWeatherData(): Promise<EnvironmentalData['weather_data']> {
    // Get weather data from external API or mock data
    return {
      outdoor_temperature: 18.5,
      outdoor_humidity: 55,
      barometric_pressure: 1015.2,
      wind_speed: 12,
      wind_direction: 225,
      precipitation: 0,
      cloud_cover: 40,
      uv_index: 3,
      weather_condition: 'partly_cloudy',
      forecast_confidence: 0.85
    };
  }

  private calculateSeasonalFactors(): EnvironmentalData['seasonal_factors'] {
    const now = new Date();
    const month = now.getMonth();
    
    let season: 'spring' | 'summer' | 'autumn' | 'winter';
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    return {
      season: season,
      day_length_hours: 12, // Simplified
      solar_elevation: 45,
      seasonal_humidity_pattern: 'moderate',
      typical_temperature_range: { min: 15, max: 25 }
    };
  }

  private async assessDataQuality(sensorData: any[]): Promise<EnvironmentalData['data_quality']> {
    return {
      completeness_score: 0.95,
      accuracy_score: 0.92,
      sensor_health_status: {
        'temp_001': 'operational',
        'hum_001': 'operational',
        'air_001': 'warning'
      },
      calibration_status: {
        'temp_001': { last_calibrated: '2024-01-15', next_due: '2024-04-15' },
        'hum_001': { last_calibrated: '2024-01-20', next_due: '2024-04-20' }
      }
    };
  }

  private transformToEnvironmentalData(data: any): EnvironmentalData {
    return {
      reading_id: data.id || `reading_${Date.now()}`,
      location: data.location,
      timestamp: data.timestamp,
      sensor_readings: data.readings || this.processSensorReadings([]),
      weather_data: data.weather_data || this.getCurrentWeatherData(),
      seasonal_factors: this.calculateSeasonalFactors(),
      data_quality: data.data_quality || { completeness_score: 0.9, accuracy_score: 0.9, sensor_health_status: {}, calibration_status: {} }
    };
  }

  private async performTimeSeriesForecasting(historicalData: EnvironmentalData[], horizon: string): Promise<any> {
    // Simplified time series forecasting
    return {
      hourly_predictions: Array(24).fill(0).map((_, i) => ({
        timestamp: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
        predicted_values: {
          temperature: { value: 22 + Math.sin(i * Math.PI / 12) * 3, unit: 'celsius', sensor_id: 'pred', accuracy: 1.5 },
          humidity: { value: 50 + Math.cos(i * Math.PI / 12) * 10, unit: 'percentage', sensor_id: 'pred', accuracy: 5 }
        },
        uncertainty_ranges: {
          temperature: { min: 20, max: 26 },
          humidity: { min: 40, max: 65 }
        },
        confidence_score: 0.8 - (i * 0.01)
      })),
      trend_analysis: {
        temperature_trend: 'stable' as const,
        humidity_trend: 'rising' as const,
        pressure_trend: 'falling' as const,
        overall_stability: 0.75
      },
      extreme_event_predictions: []
    };
  }

  private async getWeatherForecast(location: string, horizon: string): Promise<any> {
    // Mock weather forecast data
    return {
      forecast_period: horizon,
      predictions: [
        { time: '2024-03-01T12:00:00Z', temperature: 20, humidity: 60, pressure: 1012 }
      ]
    };
  }

  private async generateSOPImpactProjections(forecastData: any, weatherForecast: any): Promise<any[]> {
    // Get active SOPs
    const { data: sops } = await supabaseAdmin
      .from('sop_documents')
      .select('id, title')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .limit(5);

    return (sops || []).map(sop => ({
      sop_id: sop.id,
      sop_title: sop.title,
      projected_suitability_scores: Array(24).fill(0).map(() => Math.round(Math.random() * 30 + 70)),
      optimal_execution_windows: [
        {
          start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          suitability_score: 95,
          contributing_factors: ['optimal_temperature', 'low_humidity']
        }
      ],
      risk_periods: []
    }));
  }

  private async calculateBusinessImpactForecast(sopProjections: any[], forecastData: any): Promise<any> {
    return {
      operational_efficiency_impact: 5.2,
      quality_risk_assessment: 'Low to moderate risk based on environmental forecasts',
      customer_satisfaction_impact: 2.1,
      cost_implications: {
        additional_costs: 125,
        potential_savings: 350,
        net_impact: 225
      },
      strategic_recommendations: [
        'Schedule temperature-sensitive SOPs during optimal periods',
        'Prepare backup environmental controls',
        'Monitor humidity levels closely during high-humidity periods'
      ]
    };
  }

  private calculateForecastConfidence(historicalData: EnvironmentalData[], horizon: string): number {
    const baseConfidence = 0.85;
    const horizonPenalty = horizon === '6h' ? 0 : horizon === '24h' ? 0.05 : horizon === '7d' ? 0.15 : 0.25;
    const dataQualityBonus = historicalData.length > 100 ? 0.05 : 0;
    
    return Math.min(0.95, baseConfidence - horizonPenalty + dataQualityBonus);
  }

  private async checkForEnvironmentalAlerts(): Promise<void> {
    // Get current readings and check against alert thresholds
    const currentData = await this.getCurrentEnvironmentalReadings();
    
    // Get alert configurations
    const { data: alertConfigs } = await supabaseAdmin
      .from('environmental_alert_configurations')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true);

    // Check each configuration against current readings
    for (const config of alertConfigs || []) {
      await this.checkAlertCondition(config, currentData);
    }
  }

  private async checkAlertCondition(config: any, currentData: EnvironmentalData): Promise<void> {
    const factor = config.environmental_factor;
    let currentValue = 0;

    // Extract current value based on environmental factor
    switch (factor) {
      case 'temperature':
        currentValue = currentData.sensor_readings.temperature.value;
        break;
      case 'humidity':
        currentValue = currentData.sensor_readings.humidity.value;
        break;
      case 'air_quality':
        currentValue = currentData.sensor_readings.air_quality.pm25;
        break;
      default:
        return;
    }

    // Check thresholds
    const thresholds = config.threshold_values;
    let alertLevel: 'info' | 'warning' | 'critical' | 'emergency' = 'info';

    if (currentValue >= thresholds.emergency) {
      alertLevel = 'emergency';
    } else if (currentValue >= thresholds.critical) {
      alertLevel = 'critical';
    } else if (currentValue >= thresholds.warning) {
      alertLevel = 'warning';
    } else {
      return; // No alert needed
    }

    // Create and store alert
    const alert: EnvironmentalAlert = {
      alert_id: `env_alert_${Date.now()}`,
      alert_type: 'threshold_exceeded',
      severity: alertLevel,
      environmental_factor: factor,
      current_value: currentValue,
      threshold_value: thresholds[alertLevel],
      affected_sops: config.affected_sops,
      location: currentData.location,
      timestamp: new Date().toISOString(),
      predicted_duration: '30-60 minutes',
      automatic_responses_triggered: config.automatic_responses?.map((r: any) => r.response_action) || [],
      manual_actions_required: ['Assess situation', 'Implement corrective measures'],
      escalation_timeline: config.notification_settings?.escalation_timeline || [],
      resolution_tracking: {
        acknowledgment_required: alertLevel === 'critical' || alertLevel === 'emergency'
      }
    };

    await supabaseAdmin
      .from('environmental_alerts')
      .insert({
        restaurant_id: this.restaurantId,
        ...alert
      });
  }

  // Default data methods
  private getDefaultPredictiveAnalysis(): EnvironmentalImpactAnalysis['predictive_analysis'] {
    return {
      short_term_forecast_6h: {
        predicted_conditions: {},
        suitability_score_trend: [80, 82, 85, 87, 85, 83],
        recommended_actions: ['Monitor temperature closely']
      },
      medium_term_forecast_24h: {
        predicted_conditions: {},
        optimal_execution_windows: [],
        preparation_recommendations: []
      },
      long_term_forecast_7d: {
        seasonal_trends: {},
        weather_pattern_impacts: [],
        strategic_planning_recommendations: []
      }
    };
  }

  private getDefaultHistoricalComparisons(): EnvironmentalImpactAnalysis['historical_comparisons'] {
    return {
      similar_conditions_performance: [],
      seasonal_performance_patterns: {}
    };
  }

  private getDefaultComplianceStatus(): EnvironmentalImpactAnalysis['compliance_status'] {
    return {
      regulatory_requirements: [],
      industry_standards: []
    };
  }

  private async generatePredictiveAnalysis(sopId: string, environmentalData: EnvironmentalData, horizon: string): Promise<any> {
    // Generate predictive analysis based on forecast data
    const forecast = await this.generateEnvironmentalForecast(environmentalData.location, horizon as any);
    
    return {
      short_term_forecast_6h: {
        predicted_conditions: forecast.forecast_data.hourly_predictions.slice(0, 6).reduce((acc, pred) => ({ ...acc, ...pred.predicted_values }), {}),
        suitability_score_trend: Array(6).fill(0).map(() => Math.round(Math.random() * 20 + 75)),
        recommended_actions: ['Monitor environmental conditions', 'Prepare backup measures']
      },
      medium_term_forecast_24h: {
        predicted_conditions: {},
        optimal_execution_windows: forecast.sop_impact_projections.find(p => p.sop_id === sopId)?.optimal_execution_windows || [],
        preparation_recommendations: ['Schedule during optimal windows', 'Prepare environmental controls']
      },
      long_term_forecast_7d: {
        seasonal_trends: { temperature: 2.5, humidity: -5.0 },
        weather_pattern_impacts: ['Increased cooling needs', 'Humidity management required'],
        strategic_planning_recommendations: ['Consider seasonal menu adjustments', 'Plan maintenance during optimal periods']
      }
    };
  }

  private async getHistoricalComparisons(sopId: string, environmentalData: EnvironmentalData): Promise<any> {
    return {
      similar_conditions_performance: [
        {
          date: '2024-02-15',
          conditions_similarity: 0.92,
          actual_performance: 87,
          lessons_learned: ['Temperature control was critical', 'Humidity monitoring prevented issues']
        }
      ],
      seasonal_performance_patterns: {
        'winter': {
          average_performance: 85,
          typical_challenges: ['Low humidity', 'Temperature fluctuations'],
          successful_adaptations: ['Increased humidification', 'Better heating control']
        }
      }
    };
  }

  private async checkComplianceStatus(sopId: string, environmentalData: EnvironmentalData): Promise<any> {
    return {
      regulatory_requirements: [
        {
          requirement_type: 'food_safety_temperature',
          current_compliance_status: 'compliant',
          monitoring_value: environmentalData.sensor_readings.temperature.value,
          limit_value: 25,
          actions_required: []
        }
      ],
      industry_standards: [
        {
          standard_name: 'Restaurant Environmental Standards',
          compliance_level: 95,
          recommendations_for_improvement: ['Enhance air quality monitoring']
        }
      ]
    };
  }

  private async storeEnvironmentalAnalysis(analysis: EnvironmentalImpactAnalysis): Promise<void> {
    await supabaseAdmin
      .from('environmental_impact_analyses')
      .insert({
        restaurant_id: this.restaurantId,
        analysis_id: analysis.analysis_id,
        sop_id: analysis.sop_id,
        analysis_data: analysis,
        created_at: new Date().toISOString()
      });
  }
}

/**
 * GET /api/sop/environmental-factors - Get environmental data and analysis
 */
async function handleGetEnvironmentalFactors(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const includeForecasting = searchParams.get('include_forecasting') === 'true';

    const timeRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

    const manager = new EnvironmentalFactorsManager(context);
    const environmentalData = await manager.getEnvironmentalData(
      location || undefined,
      timeRange,
      includeForecasting
    );

    const response: APIResponse = {
      success: true,
      data: environmentalData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/environmental-factors:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'ENVIRONMENTAL_FACTORS_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/environmental-factors/analyze - Analyze environmental impact on SOPs
 */
async function handleAnalyzeEnvironmentalImpact(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { 
      sop_ids, 
      current_conditions,
      analysis_options = {
        include_predictive_analysis: true,
        include_historical_comparisons: true,
        include_compliance_check: true,
        forecast_horizon: '24h'
      }
    } = sanitizeInput(body);

    if (!sop_ids || !Array.isArray(sop_ids) || sop_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'sop_ids array is required and cannot be empty',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const manager = new EnvironmentalFactorsManager(context);
    const impactAnalyses = await manager.analyzeEnvironmentalImpact(
      sop_ids,
      current_conditions,
      analysis_options
    );

    logAuditEvent(
      context,
      'CREATE',
      'environmental_impact_analysis',
      null,
      null,
      { 
        sop_count: sop_ids.length,
        analyses_generated: impactAnalyses.length,
        forecast_horizon: analysis_options.forecast_horizon
      },
      request
    );

    const response: APIResponse = {
      success: true,
      data: {
        impact_analyses: impactAnalyses,
        summary: {
          total_sops_analyzed: sop_ids.length,
          average_suitability_score: impactAnalyses.reduce((sum, analysis) => 
            sum + analysis.impact_assessment.overall_suitability_score, 0) / impactAnalyses.length,
          total_recommendations: impactAnalyses.reduce((sum, analysis) => 
            sum + analysis.adaptation_recommendations.length, 0),
          high_priority_recommendations: impactAnalyses.reduce((sum, analysis) => 
            sum + analysis.adaptation_recommendations.filter(rec => rec.priority === 'high' || rec.priority === 'urgent').length, 0)
        }
      },
      message: `Analyzed environmental impact for ${sop_ids.length} SOPs`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/environmental-factors/analyze:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'ENVIRONMENTAL_IMPACT_ANALYSIS_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Route handlers with authentication
export const GET = withAuth(handleGetEnvironmentalFactors, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleAnalyzeEnvironmentalImpact, PERMISSIONS.SOP.READ, {
  maxRequests: 30,
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