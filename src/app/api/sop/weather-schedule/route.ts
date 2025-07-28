/**
 * SOP Weather-Based Scheduling API Route
 * Handles weather data integration for intelligent SOP scheduling adjustments
 * 
 * GET    /api/sop/weather-schedule              - Get weather-adjusted SOP schedule
 * POST   /api/sop/weather-schedule              - Generate weather-based schedule adjustments
 * PUT    /api/sop/weather-schedule/config       - Update weather integration configuration
 * GET    /api/sop/weather-schedule/forecast     - Get weather forecast with SOP implications
 * POST   /api/sop/weather-schedule/override     - Override weather-based adjustments
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface WeatherConfiguration {
  id?: string;
  weather_provider: 'openweather' | 'weatherapi' | 'accuweather' | 'custom';
  api_key: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  update_frequency_minutes: number;
  scheduling_enabled: boolean;
  adjustment_rules: {
    temperature_thresholds: {
      hot_temp_celsius: number;      // Above this temp
      cold_temp_celsius: number;     // Below this temp
      extreme_hot_celsius: number;   // Extreme hot
      extreme_cold_celsius: number;  // Extreme cold
    };
    precipitation_thresholds: {
      light_rain_mm: number;         // Light rain threshold
      heavy_rain_mm: number;         // Heavy rain threshold
      snow_threshold_mm: number;     // Snow threshold
    };
    wind_speed_threshold_kmh: number;
    humidity_threshold_percent: number;
  };
  sop_adjustments: {
    outdoor_sops: string[];           // SOPs affected by outdoor conditions
    temperature_sensitive_sops: string[];
    delivery_sops: string[];          // SOPs for delivery operations
    maintenance_sops: string[];       // SOPs for equipment/maintenance
  };
  notification_preferences: {
    advance_notice_hours: number;
    notify_roles: string[];
    severity_levels: string[];
  };
  last_update_at?: string;
  integration_status: 'active' | 'error' | 'disabled';
  error_message?: string;
}

interface WeatherData {
  timestamp: string;
  current: {
    temperature_celsius: number;
    temperature_fahrenheit: number;
    humidity_percent: number;
    precipitation_mm: number;
    wind_speed_kmh: number;
    wind_direction: string;
    pressure_mb: number;
    visibility_km: number;
    uv_index: number;
    conditions: string;
    conditions_description: string;
  };
  forecast: Array<{
    date: string;
    temperature_high: number;
    temperature_low: number;
    precipitation_probability: number;
    precipitation_mm: number;
    wind_speed_kmh: number;
    conditions: string;
    conditions_description: string;
  }>;
  alerts: Array<{
    alert_type: string;
    severity: 'minor' | 'moderate' | 'severe' | 'extreme';
    title: string;
    description: string;
    start_time: string;
    end_time: string;
  }>;
}

interface WeatherSOPAdjustment {
  adjustment_id: string;
  sop_id: string;
  original_schedule_time: string;
  adjusted_schedule_time: string;
  adjustment_type: 'reschedule' | 'priority_change' | 'resource_adjustment' | 'cancellation' | 'additional_prep';
  weather_condition: string;
  weather_severity: 'low' | 'medium' | 'high' | 'extreme';
  reasoning: {
    weather_factor: string;
    impact_description: string;
    recommended_action: string;
  };
  affected_resources: {
    staff_adjustments?: {
      additional_staff_needed: number;
      skill_requirements: string[];
    };
    equipment_requirements?: {
      additional_equipment: string[];
      equipment_checks: string[];
    };
    supply_adjustments?: {
      additional_supplies: string[];
      inventory_checks: string[];
    };
  };
  confidence_score: number;
  is_active: boolean;
  override_reason?: string;
  created_at: string;
  effective_until: string;
}

interface WeatherImpactAnalysis {
  impact_level: 'none' | 'low' | 'medium' | 'high' | 'severe';
  affected_sop_categories: string[];
  estimated_delays_minutes: number;
  resource_impact: {
    staff_impact: 'none' | 'minor' | 'moderate' | 'major';
    equipment_impact: 'none' | 'minor' | 'moderate' | 'major';
    supply_impact: 'none' | 'minor' | 'moderate' | 'major';
  };
  recommendations: Array<{
    category: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
    time_sensitive: boolean;
  }>;
  historical_patterns?: {
    similar_weather_events: number;
    average_impact_duration_hours: number;
    common_adjustments_made: string[];
  };
}

/**
 * Weather-Based SOP Scheduling Manager
 * Integrates weather data to optimize SOP scheduling
 */
class WeatherSchedulingManager {
  private context: SOPAuthContext;
  private restaurantId: string;
  private config?: WeatherConfiguration;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Initialize weather configuration
   */
  async initialize(): Promise<void> {
    const { data: config } = await supabaseAdmin
      .from('weather_configurations')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .single();

    this.config = config;
  }

  /**
   * Fetch current weather data
   */
  async fetchWeatherData(): Promise<WeatherData> {
    if (!this.config) {
      throw new Error('Weather configuration not initialized');
    }

    const { latitude, longitude } = this.config.location;
    
    let weatherData: WeatherData;

    switch (this.config.weather_provider) {
      case 'openweather':
        weatherData = await this.fetchOpenWeatherData(latitude, longitude);
        break;
      case 'weatherapi':
        weatherData = await this.fetchWeatherAPIData(latitude, longitude);
        break;
      case 'accuweather':
        weatherData = await this.fetchAccuWeatherData(latitude, longitude);
        break;
      default:
        throw new Error(`Unsupported weather provider: ${this.config.weather_provider}`);
    }

    // Store weather data for historical analysis
    await this.storeWeatherData(weatherData);

    return weatherData;
  }

  /**
   * Fetch weather data from OpenWeather API
   */
  private async fetchOpenWeatherData(lat: number, lon: number): Promise<WeatherData> {
    if (!this.config) throw new Error('Config not initialized');

    // Current weather
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.config.api_key}&units=metric`
    );

    if (!currentResponse.ok) {
      throw new Error(`OpenWeather API error: ${currentResponse.status}`);
    }

    const currentData = await currentResponse.json();

    // 5-day forecast
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.config.api_key}&units=metric`
    );

    if (!forecastResponse.ok) {
      throw new Error(`OpenWeather Forecast API error: ${forecastResponse.status}`);
    }

    const forecastData = await forecastResponse.json();

    // Weather alerts
    const alertsResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${this.config.api_key}&exclude=minutely,hourly`
    );

    let alertsData = { alerts: [] };
    if (alertsResponse.ok) {
      alertsData = await alertsResponse.json();
    }

    return {
      timestamp: new Date().toISOString(),
      current: {
        temperature_celsius: currentData.main.temp,
        temperature_fahrenheit: (currentData.main.temp * 9/5) + 32,
        humidity_percent: currentData.main.humidity,
        precipitation_mm: currentData.rain?.['1h'] || currentData.snow?.['1h'] || 0,
        wind_speed_kmh: currentData.wind.speed * 3.6,
        wind_direction: this.degreesToDirection(currentData.wind.deg),
        pressure_mb: currentData.main.pressure,
        visibility_km: currentData.visibility / 1000,
        uv_index: 0, // Would need UV index API call
        conditions: currentData.weather[0].main,
        conditions_description: currentData.weather[0].description
      },
      forecast: this.processForecastData(forecastData.list),
      alerts: (alertsData.alerts || []).map((alert: any) => ({
        alert_type: alert.event,
        severity: this.mapAlertSeverity(alert.severity),
        title: alert.event,
        description: alert.description,
        start_time: new Date(alert.start * 1000).toISOString(),
        end_time: new Date(alert.end * 1000).toISOString()
      }))
    };
  }

  /**
   * Fetch weather data from WeatherAPI
   */
  private async fetchWeatherAPIData(lat: number, lon: number): Promise<WeatherData> {
    if (!this.config) throw new Error('Config not initialized');

    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${this.config.api_key}&q=${lat},${lon}&days=5&aqi=no&alerts=yes`
    );

    if (!response.ok) {
      throw new Error(`WeatherAPI error: ${response.status}`);
    }

    const data = await response.json();

    return {
      timestamp: new Date().toISOString(),
      current: {
        temperature_celsius: data.current.temp_c,
        temperature_fahrenheit: data.current.temp_f,
        humidity_percent: data.current.humidity,
        precipitation_mm: data.current.precip_mm,
        wind_speed_kmh: data.current.wind_kph,
        wind_direction: data.current.wind_dir,
        pressure_mb: data.current.pressure_mb,
        visibility_km: data.current.vis_km,
        uv_index: data.current.uv,
        conditions: data.current.condition.text,
        conditions_description: data.current.condition.text
      },
      forecast: data.forecast.forecastday.map((day: any) => ({
        date: day.date,
        temperature_high: day.day.maxtemp_c,
        temperature_low: day.day.mintemp_c,
        precipitation_probability: day.day.daily_chance_of_rain,
        precipitation_mm: day.day.totalprecip_mm,
        wind_speed_kmh: day.day.maxwind_kph,
        conditions: day.day.condition.text,
        conditions_description: day.day.condition.text
      })),
      alerts: (data.alerts?.alert || []).map((alert: any) => ({
        alert_type: alert.event,
        severity: 'moderate' as const,
        title: alert.headline,
        description: alert.desc,
        start_time: alert.effective,
        end_time: alert.expires
      }))
    };
  }

  /**
   * Fetch weather data from AccuWeather (simplified implementation)
   */
  private async fetchAccuWeatherData(lat: number, lon: number): Promise<WeatherData> {
    // This would require AccuWeather API implementation
    // For now, return a basic structure
    throw new Error('AccuWeather integration not yet implemented');
  }

  /**
   * Analyze weather impact on SOP operations
   */
  async analyzeWeatherImpact(weatherData: WeatherData): Promise<WeatherImpactAnalysis> {
    if (!this.config) {
      throw new Error('Weather configuration not initialized');
    }

    const current = weatherData.current;
    const rules = this.config.adjustment_rules;

    let impactLevel: WeatherImpactAnalysis['impact_level'] = 'none';
    const affectedCategories: string[] = [];
    let estimatedDelays = 0;
    const recommendations: WeatherImpactAnalysis['recommendations'] = [];

    // Temperature impact analysis
    if (current.temperature_celsius >= rules.temperature_thresholds.extreme_hot_celsius) {
      impactLevel = 'severe';
      affectedCategories.push('outdoor_operations', 'equipment_maintenance');
      estimatedDelays += 30;
      recommendations.push({
        category: 'temperature',
        action: 'Increase cooling system checks and adjust outdoor work schedules',
        priority: 'high',
        time_sensitive: true
      });
    } else if (current.temperature_celsius >= rules.temperature_thresholds.hot_temp_celsius) {
      impactLevel = Math.max(impactLevel === 'none' ? 'medium' : impactLevel, 'medium') as any;
      affectedCategories.push('outdoor_operations');
      estimatedDelays += 15;
    }

    if (current.temperature_celsius <= rules.temperature_thresholds.extreme_cold_celsius) {
      impactLevel = 'severe';
      affectedCategories.push('outdoor_operations', 'delivery_operations');
      estimatedDelays += 25;
      recommendations.push({
        category: 'temperature',
        action: 'Implement cold weather protocols and equipment warm-up procedures',
        priority: 'high',
        time_sensitive: true
      });
    } else if (current.temperature_celsius <= rules.temperature_thresholds.cold_temp_celsius) {
      impactLevel = Math.max(impactLevel === 'none' ? 'medium' : impactLevel, 'medium') as any;
      affectedCategories.push('outdoor_operations');
      estimatedDelays += 10;
    }

    // Precipitation impact analysis
    if (current.precipitation_mm >= rules.precipitation_thresholds.heavy_rain_mm) {
      impactLevel = 'high';
      affectedCategories.push('delivery_operations', 'outdoor_operations', 'safety_procedures');
      estimatedDelays += 20;
      recommendations.push({
        category: 'precipitation',
        action: 'Activate wet weather protocols and increase safety measures',
        priority: 'high',
        time_sensitive: true
      });
    } else if (current.precipitation_mm >= rules.precipitation_thresholds.light_rain_mm) {
      impactLevel = Math.max(impactLevel === 'none' ? 'low' : impactLevel, 'low') as any;
      affectedCategories.push('delivery_operations');
      estimatedDelays += 5;
    }

    // Wind impact analysis
    if (current.wind_speed_kmh >= rules.wind_speed_threshold_kmh) {
      impactLevel = Math.max(impactLevel === 'none' ? 'medium' : impactLevel, 'medium') as any;
      affectedCategories.push('outdoor_operations', 'delivery_operations');
      estimatedDelays += 10;
      recommendations.push({
        category: 'wind',
        action: 'Secure outdoor equipment and adjust delivery routes',
        priority: 'medium',
        time_sensitive: true
      });
    }

    // Humidity impact analysis
    if (current.humidity_percent >= rules.humidity_threshold_percent) {
      impactLevel = Math.max(impactLevel === 'none' ? 'low' : impactLevel, 'low') as any;
      affectedCategories.push('food_storage', 'equipment_maintenance');
      recommendations.push({
        category: 'humidity',
        action: 'Increase ventilation checks and monitor food storage conditions',
        priority: 'low',
        time_sensitive: false
      });
    }

    // Weather alerts impact
    for (const alert of weatherData.alerts) {
      if (alert.severity === 'severe' || alert.severity === 'extreme') {
        impactLevel = 'severe';
        estimatedDelays += 45;
        recommendations.push({
          category: 'alert',
          action: `Weather alert: ${alert.title} - Implement emergency protocols`,
          priority: 'high',
          time_sensitive: true
        });
      }
    }

    // Get historical patterns
    const historicalPatterns = await this.getHistoricalWeatherPatterns(current.conditions);

    return {
      impact_level: impactLevel,
      affected_sop_categories: [...new Set(affectedCategories)],
      estimated_delays_minutes: estimatedDelays,
      resource_impact: {
        staff_impact: estimatedDelays > 20 ? 'major' : estimatedDelays > 10 ? 'moderate' : estimatedDelays > 0 ? 'minor' : 'none',
        equipment_impact: affectedCategories.includes('equipment_maintenance') ? 'moderate' : 'minor',
        supply_impact: affectedCategories.includes('delivery_operations') ? 'moderate' : 'minor'
      },
      recommendations,
      historical_patterns: historicalPatterns
    };
  }

  /**
   * Generate weather-based SOP adjustments
   */
  async generateSOPAdjustments(weatherData: WeatherData, impactAnalysis: WeatherImpactAnalysis): Promise<WeatherSOPAdjustment[]> {
    if (!this.config) {
      throw new Error('Weather configuration not initialized');
    }

    const adjustments: WeatherSOPAdjustment[] = [];
    const now = new Date();
    const effectiveUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Get SOPs that might be affected
    const { data: affectedSOPs } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        id, title, title_fr, tags, 
        category:sop_categories!inner(id, name),
        scheduled_assignments:sop_assignments(
          id, scheduled_for, status, assigned_to
        )
      `)
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .gte('scheduled_assignments.scheduled_for', now.toISOString())
      .lte('scheduled_assignments.scheduled_for', new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()); // Next 48 hours

    if (!affectedSOPs) return adjustments;

    for (const sop of affectedSOPs) {
      const sopTags = sop.tags || [];
      const categoryName = sop.category.name.toLowerCase();
      
      // Check if SOP is affected by current weather conditions
      let isAffected = false;
      let adjustmentType: WeatherSOPAdjustment['adjustment_type'] = 'reschedule';
      let weatherFactor = '';
      let impactDescription = '';
      let recommendedAction = '';

      // Check outdoor operations
      if (this.config.sop_adjustments.outdoor_sops.includes(sop.id) ||
          sopTags.some(tag => ['outdoor', 'delivery', 'maintenance'].includes(tag.toLowerCase())) ||
          categoryName.includes('outdoor')) {
        
        if (impactAnalysis.impact_level === 'severe') {
          isAffected = true;
          adjustmentType = 'cancellation';
          weatherFactor = 'Severe weather conditions';
          impactDescription = 'Outdoor operations unsafe due to weather';
          recommendedAction = 'Cancel or reschedule to indoor alternative';
        } else if (impactAnalysis.impact_level === 'high') {
          isAffected = true;
          adjustmentType = 'reschedule';
          weatherFactor = 'High weather impact';
          impactDescription = 'Outdoor operations may be delayed or require additional precautions';
          recommendedAction = 'Reschedule or implement weather protocols';
        }
      }

      // Check temperature-sensitive operations
      if (this.config.sop_adjustments.temperature_sensitive_sops.includes(sop.id) ||
          sopTags.some(tag => ['temperature', 'cooling', 'heating'].includes(tag.toLowerCase()))) {
        
        const temp = weatherData.current.temperature_celsius;
        if (temp >= this.config.adjustment_rules.temperature_thresholds.extreme_hot_celsius ||
            temp <= this.config.adjustment_rules.temperature_thresholds.extreme_cold_celsius) {
          isAffected = true;
          adjustmentType = 'additional_prep';
          weatherFactor = 'Extreme temperature';
          impactDescription = 'Temperature-sensitive processes require additional monitoring';
          recommendedAction = 'Implement temperature control measures and increase monitoring frequency';
        }
      }

      // Check delivery operations
      if (this.config.sop_adjustments.delivery_sops.includes(sop.id) ||
          sopTags.some(tag => ['delivery', 'transport'].includes(tag.toLowerCase())) ||
          categoryName.includes('delivery')) {
        
        if (weatherData.current.precipitation_mm >= this.config.adjustment_rules.precipitation_thresholds.heavy_rain_mm ||
            weatherData.current.wind_speed_kmh >= this.config.adjustment_rules.wind_speed_threshold_kmh) {
          isAffected = true;
          adjustmentType = 'resource_adjustment';
          weatherFactor = 'Poor weather conditions for delivery';
          impactDescription = 'Delivery operations require additional time and safety measures';
          recommendedAction = 'Allow extra time for deliveries and implement safety protocols';
        }
      }

      if (isAffected && sop.scheduled_assignments?.length > 0) {
        for (const assignment of sop.scheduled_assignments) {
          if (assignment.status !== 'completed' && assignment.status !== 'cancelled') {
            const originalTime = new Date(assignment.scheduled_for);
            let adjustedTime = new Date(originalTime);

            // Calculate adjusted time based on adjustment type
            if (adjustmentType === 'reschedule') {
              adjustedTime = new Date(originalTime.getTime() + impactAnalysis.estimated_delays_minutes * 60 * 1000);
            } else if (adjustmentType === 'additional_prep') {
              adjustedTime = new Date(originalTime.getTime() - 30 * 60 * 1000); // Start 30 min earlier
            }

            const adjustment: WeatherSOPAdjustment = {
              adjustment_id: `weather_${sop.id}_${assignment.id}_${Date.now()}`,
              sop_id: sop.id,
              original_schedule_time: assignment.scheduled_for,
              adjusted_schedule_time: adjustmentType === 'cancellation' ? assignment.scheduled_for : adjustedTime.toISOString(),
              adjustment_type: adjustmentType,
              weather_condition: weatherData.current.conditions,
              weather_severity: impactAnalysis.impact_level === 'severe' ? 'extreme' :
                               impactAnalysis.impact_level === 'high' ? 'high' :
                               impactAnalysis.impact_level === 'medium' ? 'medium' : 'low',
              reasoning: {
                weather_factor: weatherFactor,
                impact_description: impactDescription,
                recommended_action: recommendedAction
              },
              affected_resources: this.calculateResourceAdjustments(adjustmentType, impactAnalysis),
              confidence_score: this.calculateConfidenceScore(impactAnalysis, sopTags, categoryName),
              is_active: true,
              created_at: now.toISOString(),
              effective_until: effectiveUntil.toISOString()
            };

            adjustments.push(adjustment);
          }
        }
      }
    }

    // Store adjustments in database
    if (adjustments.length > 0) {
      await this.storeWeatherAdjustments(adjustments);
    }

    return adjustments;
  }

  /**
   * Calculate resource adjustments based on weather impact
   */
  private calculateResourceAdjustments(
    adjustmentType: WeatherSOPAdjustment['adjustment_type'], 
    impactAnalysis: WeatherImpactAnalysis
  ): WeatherSOPAdjustment['affected_resources'] {
    const resources: WeatherSOPAdjustment['affected_resources'] = {};

    if (impactAnalysis.resource_impact.staff_impact !== 'none') {
      resources.staff_adjustments = {
        additional_staff_needed: impactAnalysis.impact_level === 'severe' ? 2 : 
                                impactAnalysis.impact_level === 'high' ? 1 : 0,
        skill_requirements: impactAnalysis.affected_sop_categories.includes('safety_procedures') ? 
                           ['safety_certified'] : []
      };
    }

    if (impactAnalysis.resource_impact.equipment_impact !== 'none') {
      resources.equipment_requirements = {
        additional_equipment: impactAnalysis.affected_sop_categories.includes('outdoor_operations') ?
                             ['weather_protection', 'heating_equipment'] : [],
        equipment_checks: ['weather_sealing', 'temperature_monitoring']
      };
    }

    if (impactAnalysis.resource_impact.supply_impact !== 'none') {
      resources.supply_adjustments = {
        additional_supplies: ['weather_protection_materials', 'emergency_supplies'],
        inventory_checks: ['temperature_sensitive_items', 'outdoor_equipment']
      };
    }

    return resources;
  }

  /**
   * Calculate confidence score for weather adjustment
   */
  private calculateConfidenceScore(
    impactAnalysis: WeatherImpactAnalysis, 
    sopTags: string[], 
    categoryName: string
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for severe weather
    if (impactAnalysis.impact_level === 'severe') confidence += 0.4;
    else if (impactAnalysis.impact_level === 'high') confidence += 0.3;
    else if (impactAnalysis.impact_level === 'medium') confidence += 0.2;

    // Higher confidence for directly weather-related SOPs
    const weatherTags = ['outdoor', 'delivery', 'temperature', 'weather'];
    const hasWeatherTags = sopTags.some(tag => 
      weatherTags.some(wt => tag.toLowerCase().includes(wt))
    );
    if (hasWeatherTags) confidence += 0.2;

    // Higher confidence with historical patterns
    if (impactAnalysis.historical_patterns?.similar_weather_events && 
        impactAnalysis.historical_patterns.similar_weather_events > 3) {
      confidence += 0.1;
    }

    return Math.min(1.0, Math.max(0.1, Math.round(confidence * 100) / 100));
  }

  /**
   * Store weather data for historical analysis
   */
  private async storeWeatherData(weatherData: WeatherData): Promise<void> {
    await supabaseAdmin
      .from('weather_data_history')
      .insert({
        restaurant_id: this.restaurantId,
        timestamp: weatherData.timestamp,
        temperature_celsius: weatherData.current.temperature_celsius,
        humidity_percent: weatherData.current.humidity_percent,
        precipitation_mm: weatherData.current.precipitation_mm,
        wind_speed_kmh: weatherData.current.wind_speed_kmh,
        conditions: weatherData.current.conditions,
        conditions_description: weatherData.current.conditions_description,
        weather_data: weatherData
      });
  }

  /**
   * Store weather adjustments in database
   */
  private async storeWeatherAdjustments(adjustments: WeatherSOPAdjustment[]): Promise<void> {
    const adjustmentData = adjustments.map(adj => ({
      restaurant_id: this.restaurantId,
      adjustment_id: adj.adjustment_id,
      sop_id: adj.sop_id,
      original_schedule_time: adj.original_schedule_time,
      adjusted_schedule_time: adj.adjusted_schedule_time,
      adjustment_type: adj.adjustment_type,
      weather_condition: adj.weather_condition,
      weather_severity: adj.weather_severity,
      reasoning: adj.reasoning,
      affected_resources: adj.affected_resources,
      confidence_score: adj.confidence_score,
      is_active: adj.is_active,
      created_at: adj.created_at,
      effective_until: adj.effective_until
    }));

    await supabaseAdmin
      .from('weather_sop_adjustments')
      .insert(adjustmentData);
  }

  /**
   * Get historical weather patterns
   */
  private async getHistoricalWeatherPatterns(currentConditions: string): Promise<WeatherImpactAnalysis['historical_patterns']> {
    const { data: historicalData } = await supabaseAdmin
      .from('weather_data_history')
      .select('timestamp, conditions, weather_data')
      .eq('restaurant_id', this.restaurantId)
      .eq('conditions', currentConditions)
      .gte('timestamp', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()) // Last year
      .limit(50);

    if (!historicalData || historicalData.length === 0) {
      return undefined;
    }

    // Get corresponding adjustments made during similar weather
    const { data: historicalAdjustments } = await supabaseAdmin
      .from('weather_sop_adjustments')
      .select('adjustment_type, weather_condition, created_at, effective_until')
      .eq('restaurant_id', this.restaurantId)
      .eq('weather_condition', currentConditions)
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    const avgDuration = historicalAdjustments && historicalAdjustments.length > 0 ?
      historicalAdjustments.reduce((sum, adj) => {
        const duration = new Date(adj.effective_until).getTime() - new Date(adj.created_at).getTime();
        return sum + (duration / (1000 * 60 * 60)); // Convert to hours
      }, 0) / historicalAdjustments.length : 0;

    const commonAdjustments = historicalAdjustments ?
      [...new Set(historicalAdjustments.map(adj => adj.adjustment_type))] : [];

    return {
      similar_weather_events: historicalData.length,
      average_impact_duration_hours: Math.round(avgDuration * 10) / 10,
      common_adjustments_made: commonAdjustments
    };
  }

  /**
   * Helper methods
   */
  private processForecastData(forecastList: any[]): WeatherData['forecast'] {
    const dailyForecasts = new Map<string, any>();

    // Group forecast data by date
    for (const item of forecastList) {
      const date = item.dt_txt.split(' ')[0];
      
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, {
          date,
          temperature_high: item.main.temp_max,
          temperature_low: item.main.temp_min,
          precipitation_probability: item.pop * 100,
          precipitation_mm: item.rain?.['3h'] || item.snow?.['3h'] || 0,
          wind_speed_kmh: item.wind.speed * 3.6,
          conditions: item.weather[0].main,
          conditions_description: item.weather[0].description
        });
      } else {
        const existing = dailyForecasts.get(date);
        existing.temperature_high = Math.max(existing.temperature_high, item.main.temp_max);
        existing.temperature_low = Math.min(existing.temperature_low, item.main.temp_min);
        existing.precipitation_probability = Math.max(existing.precipitation_probability, item.pop * 100);
        existing.precipitation_mm += item.rain?.['3h'] || item.snow?.['3h'] || 0;
      }
    }

    return Array.from(dailyForecasts.values()).slice(0, 5); // Next 5 days
  }

  private degreesToDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  private mapAlertSeverity(severity: string): 'minor' | 'moderate' | 'severe' | 'extreme' {
    switch (severity?.toLowerCase()) {
      case 'minor': return 'minor';
      case 'moderate': return 'moderate';
      case 'severe': return 'severe';
      case 'extreme': return 'extreme';
      default: return 'moderate';
    }
  }
}

/**
 * GET /api/sop/weather-schedule - Get weather-adjusted SOP schedule
 */
async function handleGetWeatherSchedule(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const includeAdjustments = searchParams.get('include_adjustments') === 'true';
    const includeForecast = searchParams.get('include_forecast') === 'true';
    const days = Math.min(parseInt(searchParams.get('days') || '3'), 7);

    const manager = new WeatherSchedulingManager(context);
    await manager.initialize();

    // Get current weather data
    const weatherData = await manager.fetchWeatherData();
    
    // Analyze weather impact
    const impactAnalysis = await manager.analyzeWeatherImpact(weatherData);

    const responseData: any = {
      current_weather: weatherData.current,
      impact_analysis: impactAnalysis
    };

    if (includeAdjustments) {
      // Get active weather adjustments
      const { data: adjustments } = await supabaseAdmin
        .from('weather_sop_adjustments')
        .select(`
          *,
          sop_documents(id, title, title_fr, category:sop_categories(name, name_fr))
        `)
        .eq('restaurant_id', context.restaurantId)
        .eq('is_active', true)
        .gt('effective_until', new Date().toISOString())
        .order('confidence_score', { ascending: false });

      responseData.active_adjustments = adjustments || [];
    }

    if (includeForecast) {
      responseData.forecast = weatherData.forecast.slice(0, days);
      responseData.weather_alerts = weatherData.alerts;
    }

    const response: APIResponse = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/weather-schedule:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'WEATHER_FETCH_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/weather-schedule - Generate weather-based schedule adjustments
 */
async function handleGenerateWeatherAdjustments(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { force_update = false, notification_enabled = true } = sanitizeInput(body);

    const manager = new WeatherSchedulingManager(context);
    await manager.initialize();

    // Fetch current weather data
    const weatherData = await manager.fetchWeatherData();
    
    // Analyze weather impact
    const impactAnalysis = await manager.analyzeWeatherImpact(weatherData);
    
    // Generate SOP adjustments
    const adjustments = await manager.generateSOPAdjustments(weatherData, impactAnalysis);

    // Send notifications if enabled and there are significant adjustments
    if (notification_enabled && adjustments.length > 0) {
      await this.sendWeatherNotifications(context, adjustments, impactAnalysis);
    }

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'weather_adjustments',
      null,
      null,
      { 
        adjustments_generated: adjustments.length,
        weather_condition: weatherData.current.conditions,
        impact_level: impactAnalysis.impact_level
      },
      request
    );

    const response: APIResponse<WeatherSOPAdjustment[]> = {
      success: true,
      data: adjustments,
      message: `Generated ${adjustments.length} weather-based SOP adjustments`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/weather-schedule:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'WEATHER_ADJUSTMENT_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * Send weather-related notifications
 */
async function sendWeatherNotifications(
  context: SOPAuthContext, 
  adjustments: WeatherSOPAdjustment[], 
  impactAnalysis: WeatherImpactAnalysis
): Promise<void> {
  // Get configuration for notification preferences
  const { data: config } = await supabaseAdmin
    .from('weather_configurations')
    .select('notification_preferences')
    .eq('restaurant_id', context.restaurantId)
    .single();

  if (!config?.notification_preferences) return;

  const { notify_roles, severity_levels } = config.notification_preferences;

  // Check if impact level warrants notifications
  if (!severity_levels.includes(impactAnalysis.impact_level)) return;

  // Get users to notify
  const { data: usersToNotify } = await supabaseAdmin
    .from('auth_users')
    .select('id, full_name, role')
    .eq('restaurant_id', context.restaurantId)
    .in('role', notify_roles)
    .eq('is_active', true);

  if (!usersToNotify || usersToNotify.length === 0) return;

  // Create notifications
  const notifications = usersToNotify.map(user => ({
    restaurant_id: context.restaurantId,
    user_id: user.id,
    notification_type: 'weather_alert',
    title: 'Weather Impact Alert',
    title_fr: 'Alerte d\'Impact Météorologique',
    message: `Weather conditions have generated ${adjustments.length} SOP schedule adjustments`,
    message_fr: `Les conditions météorologiques ont généré ${adjustments.length} ajustements d'horaire SOP`,
    is_read: false,
    created_at: new Date().toISOString(),
    metadata: {
      impact_level: impactAnalysis.impact_level,
      adjustments_count: adjustments.length,
      affected_categories: impactAnalysis.affected_sop_categories
    }
  }));

  await supabaseAdmin
    .from('sop_notifications')
    .insert(notifications);
}

// Route handlers with authentication
export const GET = withAuth(handleGetWeatherSchedule, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleGenerateWeatherAdjustments, PERMISSIONS.SOP.CREATE, {
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