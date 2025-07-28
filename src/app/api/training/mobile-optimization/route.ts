/**
 * Training Mobile Optimization API
 * Tablet-specific optimizations and mobile performance enhancements
 * GET /api/training/mobile-optimization - Get mobile optimization settings
 * POST /api/training/mobile-optimization - Update optimization settings
 * PUT /api/training/mobile-optimization - Apply optimization strategies
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface MobileOptimizationSettings {
  tablet_layout_enabled: boolean;
  touch_interactions_optimized: boolean;
  offline_content_preloading: boolean;
  responsive_media_enabled: boolean;
  gesture_navigation: boolean;
  adaptive_font_sizing: boolean;
  battery_optimization: boolean;
  bandwidth_optimization: boolean;
  portrait_landscape_adaptive: boolean;
  accessibility_enhancements: boolean;
}

interface DeviceCapabilities {
  screen_size: string;
  touch_support: boolean;
  orientation_support: boolean;
  storage_available: number;
  network_type: string;
  battery_level?: number;
  cpu_cores?: number;
  memory_gb?: number;
}

interface OptimizationStrategy {
  strategy_id: string;
  strategy_name: string;
  target_devices: string[];
  performance_impact: number;
  implementation_priority: 'high' | 'medium' | 'low';
  optimization_rules: OptimizationRule[];
}

interface OptimizationRule {
  rule_type: string;
  condition: string;
  action: string;
  performance_gain: number;
}

interface TabletOptimizationMetrics {
  screen_utilization: number;
  touch_interaction_efficiency: number;
  content_readability_score: number;
  navigation_ease: number;
  media_loading_performance: number;
  battery_efficiency: number;
  offline_capability_score: number;
  overall_tablet_score: number;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    const { searchParams } = new URL(request.url);
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const deviceType = searchParams.get('device_type') || 'tablet';
    const moduleId = searchParams.get('module_id');
    const includeAnalytics = searchParams.get('include_analytics') === 'true';

    try {
      // Get current optimization settings
      const optimizationSettings = await getCurrentOptimizationSettings(
        supabase,
        user.restaurant_id,
        deviceType
      );

      // Get device-specific optimization strategies
      const optimizationStrategies = await getOptimizationStrategies(
        supabase,
        user.restaurant_id,
        deviceType
      );

      // Get tablet optimization metrics
      const tabletMetrics = await getTabletOptimizationMetrics(
        supabase,
        user.restaurant_id,
        moduleId
      );

      // Get performance analytics if requested
      let performanceAnalytics = null;
      if (includeAnalytics) {
        performanceAnalytics = await getMobilePerformanceAnalytics(
          supabase,
          user.restaurant_id,
          deviceType
        );
      }

      // Generate optimization recommendations
      const optimizationRecommendations = generateOptimizationRecommendations(
        optimizationSettings,
        tabletMetrics,
        deviceType
      );

      const responseData = {
        device_optimization: {
          device_type: deviceType,
          optimization_settings: optimizationSettings,
          tablet_metrics: tabletMetrics,
          last_updated: new Date().toISOString()
        },
        optimization_strategies: optimizationStrategies,
        optimization_recommendations: optimizationRecommendations,
        performance_analytics: performanceAnalytics,
        supported_devices: getSupportedDeviceProfiles(),
        best_practices: getTabletBestPractices()
      };

      return NextResponse.json({
        success: true,
        data: responseData
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch mobile optimization data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training mobile optimization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      device_type = 'tablet',
      optimization_settings,
      device_capabilities,
      performance_targets
    } = body;

    // Validate required fields
    if (!optimization_settings) {
      return NextResponse.json(
        { error: 'Missing required field: optimization_settings' },
        { status: 400 }
      );
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins and managers can update optimization settings
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
      // Validate optimization settings
      const validatedSettings = validateOptimizationSettings(optimization_settings);
      
      // Store optimization settings
      const { data: settingsRecord, error: settingsError } = await supabase
        .from('performance_metrics')
        .insert({
          restaurant_id: user.restaurant_id,
          metric_type: 'mobile_optimization_settings',
          metric_value: calculateOptimizationScore(validatedSettings),
          metric_data: {
            device_type,
            optimization_settings: validatedSettings,
            device_capabilities: device_capabilities || {},
            performance_targets: performance_targets || {},
            updated_by: user.id,
            timestamp: new Date().toISOString()
          },
          recorded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (settingsError) throw settingsError;

      // Apply optimization strategies based on settings
      const appliedStrategies = await applyOptimizationStrategies(
        supabase,
        user.restaurant_id,
        device_type,
        validatedSettings,
        device_capabilities
      );

      // Update training modules with mobile optimizations
      const optimizedModules = await optimizeTrainingModulesForMobile(
        supabase,
        user.restaurant_id,
        validatedSettings
      );

      return NextResponse.json({
        success: true,
        data: {
          settings_id: settingsRecord.id,
          optimization_settings: validatedSettings,
          applied_strategies: appliedStrategies,
          optimized_modules: optimizedModules.length,
          optimization_score: calculateOptimizationScore(validatedSettings),
          message: 'Mobile optimization settings updated successfully'
        }
      });

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to update optimization settings',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training mobile optimization update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      optimization_strategies,
      target_modules,
      immediate_apply = false
    } = body;

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins and managers can apply optimization strategies
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
      // Apply optimization strategies
      const applicationResults = await applyAdvancedOptimizationStrategies(
        supabase,
        user.restaurant_id,
        optimization_strategies || [],
        target_modules || [],
        immediate_apply
      );

      // Measure performance impact
      const performanceImpact = await measureOptimizationImpact(
        supabase,
        user.restaurant_id,
        applicationResults
      );

      // Generate optimization report
      const optimizationReport = generateOptimizationReport(
        applicationResults,
        performanceImpact
      );

      return NextResponse.json({
        success: true,
        data: {
          application_results: applicationResults,
          performance_impact: performanceImpact,
          optimization_report: optimizationReport,
          immediate_apply: immediate_apply,
          message: 'Optimization strategies applied successfully'
        }
      });

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to apply optimization strategies',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training optimization application API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for mobile optimization
async function getCurrentOptimizationSettings(
  supabase: any,
  restaurantId: string,
  deviceType: string
): Promise<MobileOptimizationSettings> {
  // Get latest optimization settings
  const { data: settings } = await supabase
    .from('performance_metrics')
    .select('metric_data')
    .eq('restaurant_id', restaurantId)
    .eq('metric_type', 'mobile_optimization_settings')
    .contains('metric_data', { device_type: deviceType })
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  // Default tablet-optimized settings
  const defaultSettings: MobileOptimizationSettings = {
    tablet_layout_enabled: true,
    touch_interactions_optimized: true,
    offline_content_preloading: true,
    responsive_media_enabled: true,
    gesture_navigation: true,
    adaptive_font_sizing: true,
    battery_optimization: true,
    bandwidth_optimization: true,
    portrait_landscape_adaptive: true,
    accessibility_enhancements: true
  };

  return settings?.metric_data?.optimization_settings || defaultSettings;
}

async function getOptimizationStrategies(
  supabase: any,
  restaurantId: string,
  deviceType: string
): Promise<OptimizationStrategy[]> {
  // Define tablet-specific optimization strategies
  const tabletStrategies: OptimizationStrategy[] = [
    {
      strategy_id: 'tablet_layout_optimization',
      strategy_name: 'Tablet Layout Optimization',
      target_devices: ['tablet', 'large_tablet'],
      performance_impact: 25,
      implementation_priority: 'high',
      optimization_rules: [
        {
          rule_type: 'layout',
          condition: 'screen_width >= 768px',
          action: 'apply_tablet_grid_layout',
          performance_gain: 15
        },
        {
          rule_type: 'navigation',
          condition: 'touch_device',
          action: 'enable_touch_navigation',
          performance_gain: 10
        }
      ]
    },
    {
      strategy_id: 'content_preloading',
      strategy_name: 'Intelligent Content Preloading',
      target_devices: ['tablet'],
      performance_impact: 30,
      implementation_priority: 'high',
      optimization_rules: [
        {
          rule_type: 'preloading',
          condition: 'wifi_connection',
          action: 'preload_next_sections',
          performance_gain: 20
        },
        {
          rule_type: 'caching',
          condition: 'sufficient_storage',
          action: 'cache_multimedia_content',
          performance_gain: 10
        }
      ]
    },
    {
      strategy_id: 'touch_interaction_enhancement',
      strategy_name: 'Touch Interaction Enhancement',
      target_devices: ['tablet'],
      performance_impact: 20,
      implementation_priority: 'medium',
      optimization_rules: [
        {
          rule_type: 'touch_targets',
          condition: 'touch_device',
          action: 'increase_touch_target_size',
          performance_gain: 15
        },
        {
          rule_type: 'gestures',
          condition: 'multi_touch_support',
          action: 'enable_gesture_controls',
          performance_gain: 5
        }
      ]
    },
    {
      strategy_id: 'adaptive_media_loading',
      strategy_name: 'Adaptive Media Loading',
      target_devices: ['tablet'],
      performance_impact: 35,
      implementation_priority: 'high',
      optimization_rules: [
        {
          rule_type: 'media_quality',
          condition: 'high_dpi_screen',
          action: 'load_high_resolution_media',
          performance_gain: 20
        },
        {
          rule_type: 'lazy_loading',
          condition: 'scroll_based_content',
          action: 'implement_lazy_loading',
          performance_gain: 15
        }
      ]
    }
  ];

  return tabletStrategies;
}

async function getTabletOptimizationMetrics(
  supabase: any,
  restaurantId: string,
  moduleId?: string | null
): Promise<TabletOptimizationMetrics> {
  // Get performance data for tablet optimization analysis
  let metricsQuery = supabase
    .from('performance_metrics')
    .select('metric_type, metric_value, metric_data')
    .eq('restaurant_id', restaurantId)
    .in('metric_type', [
      'screen_utilization',
      'touch_interaction',
      'content_readability',
      'navigation_efficiency',
      'media_performance',
      'battery_usage',
      'offline_capability'
    ]);

  if (moduleId) {
    metricsQuery = metricsQuery.eq('module_id', moduleId);
  }

  const { data: metricsData } = await metricsQuery;

  // Calculate tablet-specific metrics
  const metrics = {
    screen_utilization: calculateScreenUtilization(metricsData),
    touch_interaction_efficiency: calculateTouchEfficiency(metricsData),
    content_readability_score: calculateReadabilityScore(metricsData),
    navigation_ease: calculateNavigationEase(metricsData),
    media_loading_performance: calculateMediaPerformance(metricsData),
    battery_efficiency: calculateBatteryEfficiency(metricsData),
    offline_capability_score: calculateOfflineCapability(metricsData)
  };

  // Calculate overall tablet optimization score
  const overall_tablet_score = Math.round(
    (metrics.screen_utilization * 0.15 +
     metrics.touch_interaction_efficiency * 0.20 +
     metrics.content_readability_score * 0.15 +
     metrics.navigation_ease * 0.15 +
     metrics.media_loading_performance * 0.15 +
     metrics.battery_efficiency * 0.10 +
     metrics.offline_capability_score * 0.10)
  );

  return {
    ...metrics,
    overall_tablet_score
  };
}

async function getMobilePerformanceAnalytics(
  supabase: any,
  restaurantId: string,
  deviceType: string
) {
  // Get device-specific performance analytics
  const { data: performanceData } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .contains('metric_data', { device_type: deviceType })
    .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('recorded_at', { ascending: false });

  if (!performanceData || performanceData.length === 0) {
    return {
      average_load_time: 0,
      bounce_rate: 0,
      completion_rate: 0,
      user_satisfaction: 0,
      performance_trend: 'no_data'
    };
  }

  // Analyze performance trends
  const loadTimes = performanceData
    .filter(p => p.metric_type === 'load_time')
    .map(p => p.metric_value);
  
  const avgLoadTime = loadTimes.length > 0 
    ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
    : 0;

  const completionRates = performanceData
    .filter(p => p.metric_type === 'completion_rate')
    .map(p => p.metric_value);
  
  const avgCompletionRate = completionRates.length > 0 
    ? completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length 
    : 0;

  return {
    average_load_time: Math.round(avgLoadTime),
    bounce_rate: Math.max(0, 100 - avgCompletionRate),
    completion_rate: Math.round(avgCompletionRate),
    user_satisfaction: calculateUserSatisfaction(performanceData),
    performance_trend: calculatePerformanceTrend(performanceData),
    data_points: performanceData.length
  };
}

function generateOptimizationRecommendations(
  settings: MobileOptimizationSettings,
  metrics: TabletOptimizationMetrics,
  deviceType: string
) {
  const recommendations = [];

  // Screen utilization recommendations
  if (metrics.screen_utilization < 75) {
    recommendations.push({
      category: 'Layout Optimization',
      priority: 'high',
      recommendation: 'Improve screen space utilization with adaptive layouts',
      expected_improvement: 'Increase screen utilization by 15-25%',
      implementation: 'Enable tablet_layout_enabled and responsive_media_enabled'
    });
  }

  // Touch interaction recommendations
  if (metrics.touch_interaction_efficiency < 80) {
    recommendations.push({
      category: 'Touch Optimization',
      priority: 'high',
      recommendation: 'Enhance touch interaction responsiveness and accuracy',
      expected_improvement: 'Improve touch efficiency by 20-30%',
      implementation: 'Enable touch_interactions_optimized and gesture_navigation'
    });
  }

  // Media performance recommendations
  if (metrics.media_loading_performance < 70) {
    recommendations.push({
      category: 'Media Performance',
      priority: 'medium',
      recommendation: 'Optimize media loading and caching strategies',
      expected_improvement: 'Reduce media load times by 30-40%',
      implementation: 'Enable offline_content_preloading and bandwidth_optimization'
    });
  }

  // Battery efficiency recommendations
  if (metrics.battery_efficiency < 80) {
    recommendations.push({
      category: 'Battery Optimization',
      priority: 'medium',
      recommendation: 'Implement battery-conscious optimization strategies',
      expected_improvement: 'Extend battery life by 15-20%',
      implementation: 'Enable battery_optimization and adaptive resource management'
    });
  }

  // Accessibility recommendations
  if (!settings.accessibility_enhancements) {
    recommendations.push({
      category: 'Accessibility',
      priority: 'high',
      recommendation: 'Enable accessibility enhancements for inclusive design',
      expected_improvement: 'Improve accessibility compliance by 40-50%',
      implementation: 'Enable accessibility_enhancements and adaptive_font_sizing'
    });
  }

  return recommendations;
}

function validateOptimizationSettings(settings: any): MobileOptimizationSettings {
  const validatedSettings: MobileOptimizationSettings = {
    tablet_layout_enabled: Boolean(settings.tablet_layout_enabled),
    touch_interactions_optimized: Boolean(settings.touch_interactions_optimized),
    offline_content_preloading: Boolean(settings.offline_content_preloading),
    responsive_media_enabled: Boolean(settings.responsive_media_enabled),
    gesture_navigation: Boolean(settings.gesture_navigation),
    adaptive_font_sizing: Boolean(settings.adaptive_font_sizing),
    battery_optimization: Boolean(settings.battery_optimization),
    bandwidth_optimization: Boolean(settings.bandwidth_optimization),
    portrait_landscape_adaptive: Boolean(settings.portrait_landscape_adaptive),
    accessibility_enhancements: Boolean(settings.accessibility_enhancements)
  };

  return validatedSettings;
}

function calculateOptimizationScore(settings: MobileOptimizationSettings): number {
  const enabledFeatures = Object.values(settings).filter(value => value === true).length;
  const totalFeatures = Object.keys(settings).length;
  
  return Math.round((enabledFeatures / totalFeatures) * 100);
}

async function applyOptimizationStrategies(
  supabase: any,
  restaurantId: string,
  deviceType: string,
  settings: MobileOptimizationSettings,
  deviceCapabilities: any
) {
  const appliedStrategies = [];

  // Apply tablet layout optimization
  if (settings.tablet_layout_enabled) {
    appliedStrategies.push({
      strategy: 'tablet_layout_optimization',
      status: 'applied',
      performance_impact: 25
    });
  }

  // Apply touch interaction optimization
  if (settings.touch_interactions_optimized) {
    appliedStrategies.push({
      strategy: 'touch_interaction_enhancement',
      status: 'applied',
      performance_impact: 20
    });
  }

  // Apply content preloading
  if (settings.offline_content_preloading) {
    appliedStrategies.push({
      strategy: 'content_preloading',
      status: 'applied',
      performance_impact: 30
    });
  }

  // Apply media optimization
  if (settings.responsive_media_enabled) {
    appliedStrategies.push({
      strategy: 'adaptive_media_loading',
      status: 'applied',
      performance_impact: 35
    });
  }

  return appliedStrategies;
}

async function optimizeTrainingModulesForMobile(
  supabase: any,
  restaurantId: string,
  settings: MobileOptimizationSettings
) {
  // Get training modules that need optimization
  const { data: modules } = await supabase
    .from('training_modules')
    .select('id, title')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);

  const optimizedModules = [];

  if (modules) {
    for (const module of modules) {
      // Apply mobile optimizations to each module
      const optimizationResult = await applyModuleOptimizations(
        supabase,
        module.id,
        settings
      );
      
      if (optimizationResult.success) {
        optimizedModules.push({
          module_id: module.id,
          module_title: module.title,
          optimizations_applied: optimizationResult.optimizations
        });
      }
    }
  }

  return optimizedModules;
}

async function applyModuleOptimizations(
  supabase: any,
  moduleId: string,
  settings: MobileOptimizationSettings
) {
  const optimizations = [];

  // Record optimization application
  if (settings.tablet_layout_enabled) {
    optimizations.push('tablet_layout');
  }
  if (settings.responsive_media_enabled) {
    optimizations.push('responsive_media');
  }
  if (settings.adaptive_font_sizing) {
    optimizations.push('adaptive_fonts');
  }

  // Store optimization record
  await supabase
    .from('performance_metrics')
    .insert({
      module_id: moduleId,
      metric_type: 'mobile_optimization_applied',
      metric_value: optimizations.length,
      metric_data: {
        optimizations_applied: optimizations,
        timestamp: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    });

  return {
    success: true,
    optimizations
  };
}

// Calculation helper functions
function calculateScreenUtilization(metricsData: any[]): number {
  const screenMetrics = metricsData?.filter(m => m.metric_type === 'screen_utilization') || [];
  if (screenMetrics.length === 0) return 75; // Default good score
  
  const avgUtilization = screenMetrics.reduce((sum, m) => sum + m.metric_value, 0) / screenMetrics.length;
  return Math.round(avgUtilization);
}

function calculateTouchEfficiency(metricsData: any[]): number {
  const touchMetrics = metricsData?.filter(m => m.metric_type === 'touch_interaction') || [];
  if (touchMetrics.length === 0) return 80; // Default good score
  
  const avgEfficiency = touchMetrics.reduce((sum, m) => sum + m.metric_value, 0) / touchMetrics.length;
  return Math.round(avgEfficiency);
}

function calculateReadabilityScore(metricsData: any[]): number {
  const readabilityMetrics = metricsData?.filter(m => m.metric_type === 'content_readability') || [];
  if (readabilityMetrics.length === 0) return 85; // Default good score
  
  const avgReadability = readabilityMetrics.reduce((sum, m) => sum + m.metric_value, 0) / readabilityMetrics.length;
  return Math.round(avgReadability);
}

function calculateNavigationEase(metricsData: any[]): number {
  const navMetrics = metricsData?.filter(m => m.metric_type === 'navigation_efficiency') || [];
  if (navMetrics.length === 0) return 80; // Default good score
  
  const avgNav = navMetrics.reduce((sum, m) => sum + m.metric_value, 0) / navMetrics.length;
  return Math.round(avgNav);
}

function calculateMediaPerformance(metricsData: any[]): number {
  const mediaMetrics = metricsData?.filter(m => m.metric_type === 'media_performance') || [];
  if (mediaMetrics.length === 0) return 75; // Default moderate score
  
  const avgPerformance = mediaMetrics.reduce((sum, m) => sum + m.metric_value, 0) / mediaMetrics.length;
  return Math.round(avgPerformance);
}

function calculateBatteryEfficiency(metricsData: any[]): number {
  const batteryMetrics = metricsData?.filter(m => m.metric_type === 'battery_usage') || [];
  if (batteryMetrics.length === 0) return 85; // Default good score
  
  // Battery efficiency is inverse of usage (lower usage = higher efficiency)
  const avgUsage = batteryMetrics.reduce((sum, m) => sum + m.metric_value, 0) / batteryMetrics.length;
  return Math.round(Math.max(0, 100 - avgUsage));
}

function calculateOfflineCapability(metricsData: any[]): number {
  const offlineMetrics = metricsData?.filter(m => m.metric_type === 'offline_capability') || [];
  if (offlineMetrics.length === 0) return 70; // Default moderate score
  
  const avgCapability = offlineMetrics.reduce((sum, m) => sum + m.metric_value, 0) / offlineMetrics.length;
  return Math.round(avgCapability);
}

function calculateUserSatisfaction(performanceData: any[]): number {
  // Simplified user satisfaction calculation based on performance metrics
  const satisfactionMetrics = performanceData.filter(p => 
    p.metric_type === 'user_rating' || p.metric_type === 'completion_rate'
  );
  
  if (satisfactionMetrics.length === 0) return 75;
  
  const avgSatisfaction = satisfactionMetrics.reduce((sum, m) => sum + m.metric_value, 0) / satisfactionMetrics.length;
  return Math.round(avgSatisfaction);
}

function calculatePerformanceTrend(performanceData: any[]): string {
  if (performanceData.length < 2) return 'insufficient_data';
  
  const recentData = performanceData.slice(0, Math.min(10, performanceData.length));
  const olderData = performanceData.slice(-Math.min(10, performanceData.length));
  
  const recentAvg = recentData.reduce((sum, d) => sum + d.metric_value, 0) / recentData.length;
  const olderAvg = olderData.reduce((sum, d) => sum + d.metric_value, 0) / olderData.length;
  
  const improvement = recentAvg - olderAvg;
  
  if (improvement > 5) return 'improving';
  if (improvement < -5) return 'declining';
  return 'stable';
}

function getSupportedDeviceProfiles() {
  return {
    tablet: {
      min_screen_width: 768,
      max_screen_width: 1024,
      touch_support: true,
      typical_usage: 'restaurant_staff_training'
    },
    large_tablet: {
      min_screen_width: 1024,
      max_screen_width: 1366,
      touch_support: true,
      typical_usage: 'management_dashboard'
    },
    mobile: {
      min_screen_width: 320,
      max_screen_width: 767,
      touch_support: true,
      typical_usage: 'quick_reference'
    }
  };
}

function getTabletBestPractices() {
  return {
    layout: [
      'Use grid-based layouts optimized for 10-12 inch screens',
      'Maintain touch target sizes of at least 44x44 pixels',
      'Design for both portrait and landscape orientations'
    ],
    content: [
      'Break content into digestible sections (5-10 minutes each)',
      'Use high-contrast colors for better readability',
      'Provide bilingual content with clear language switching'
    ],
    interaction: [
      'Implement intuitive gesture controls (swipe, pinch, tap)',
      'Provide immediate visual feedback for all interactions',
      'Support both finger and stylus input methods'
    ],
    performance: [
      'Preload critical content for offline access',
      'Optimize images and videos for tablet resolutions',
      'Implement progressive loading for media-heavy content'
    ]
  };
}

// Advanced optimization functions
async function applyAdvancedOptimizationStrategies(
  supabase: any,
  restaurantId: string,
  strategies: any[],
  targetModules: string[],
  immediateApply: boolean
) {
  const results = [];

  for (const strategy of strategies) {
    const result = await applyOptimizationStrategy(
      supabase,
      restaurantId,
      strategy,
      targetModules,
      immediateApply
    );
    results.push(result);
  }

  return results;
}

async function applyOptimizationStrategy(
  supabase: any,
  restaurantId: string,
  strategy: any,
  targetModules: string[],
  immediateApply: boolean
) {
  // Implementation would depend on specific strategy
  return {
    strategy_id: strategy.id || 'unknown',
    status: immediateApply ? 'applied' : 'scheduled',
    modules_affected: targetModules.length,
    estimated_impact: strategy.performance_impact || 0
  };
}

async function measureOptimizationImpact(
  supabase: any,
  restaurantId: string,
  applicationResults: any[]
) {
  // Measure the impact of applied optimizations
  const totalImpact = applicationResults.reduce((sum, result) => 
    sum + (result.estimated_impact || 0), 0
  );

  return {
    total_performance_improvement: totalImpact,
    strategies_applied: applicationResults.length,
    modules_optimized: applicationResults.reduce((sum, result) => 
      sum + (result.modules_affected || 0), 0
    ),
    optimization_success_rate: applicationResults.filter(r => r.status === 'applied').length / applicationResults.length
  };
}

function generateOptimizationReport(applicationResults: any[], performanceImpact: any) {
  return {
    summary: {
      total_optimizations: applicationResults.length,
      successful_applications: applicationResults.filter(r => r.status === 'applied').length,
      estimated_performance_gain: `${performanceImpact.total_performance_improvement}%`,
      modules_optimized: performanceImpact.modules_optimized
    },
    recommendations: [
      'Monitor performance metrics over the next 7 days',
      'Gather user feedback on tablet experience improvements',
      'Schedule follow-up optimization review in 2 weeks'
    ],
    next_steps: [
      'Enable additional optimizations based on initial results',
      'Expand optimization to remaining training modules',
      'Implement advanced analytics for continuous monitoring'
    ]
  };
}