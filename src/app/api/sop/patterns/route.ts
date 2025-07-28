/**
 * SOP Completion Pattern Analysis API Route
 * Analyzes completion patterns to identify trends, bottlenecks, and optimization opportunities
 * 
 * GET    /api/sop/patterns              - Get pattern analysis for SOPs
 * POST   /api/sop/patterns/analyze      - Trigger new pattern analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface CompletionPattern {
  id: string;
  sop_id: string;
  pattern_type: 'completion_time' | 'success_rate' | 'error_patterns' | 'seasonal' | 'difficulty';
  time_period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  pattern_data: {
    avg_completion_time?: number;
    median_completion_time?: number;
    success_rate?: number;
    failure_rate?: number;
    common_errors?: string[];
    peak_hours?: number[];
    seasonal_trends?: Record<string, number>;
    difficulty_distribution?: Record<string, number>;
  };
  statistical_metrics: {
    sample_size: number;
    confidence_interval: number;
    standard_deviation?: number;
    trend_direction?: 'increasing' | 'decreasing' | 'stable';
    anomaly_score?: number;
  };
  insights: {
    key_findings: string[];
    recommendations: string[];
    optimization_opportunities: string[];
    risk_factors?: string[];
  };
  confidence_level: number;
  created_at: string;
  updated_at: string;
}

interface PatternAnalysisRequest {
  sop_ids?: string[];
  pattern_types?: string[];
  time_period?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  minimum_sample_size?: number;
}

/**
 * SOP Pattern Analysis Engine
 * Analyzes completion data to identify patterns and trends
 */
class SOPPatternAnalyzer {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Analyze completion patterns for SOPs
   */
  async analyzePatterns(request: PatternAnalysisRequest): Promise<CompletionPattern[]> {
    const {
      sop_ids,
      pattern_types = ['completion_time', 'success_rate', 'error_patterns'],
      time_period = 'weekly',
      date_range,
      minimum_sample_size = 10
    } = request;

    // Get completion data
    const completionData = await this.getCompletionData(sop_ids, date_range);
    
    if (completionData.length < minimum_sample_size) {
      return [];
    }

    const patterns: CompletionPattern[] = [];

    // Analyze each pattern type
    for (const patternType of pattern_types) {
      const patternResults = await this.analyzePatternType(
        patternType as CompletionPattern['pattern_type'],
        time_period as CompletionPattern['time_period'],
        completionData,
        minimum_sample_size
      );
      patterns.push(...patternResults);
    }

    // Store patterns in database
    await this.storePatterns(patterns);

    return patterns;
  }

  /**
   * Get completion data for analysis
   */
  private async getCompletionData(sopIds?: string[], dateRange?: { start_date: string; end_date: string }) {
    let query = supabaseAdmin
      .from('user_progress')
      .select(`
        *,
        sop_document:sop_documents!inner(
          id, title, title_fr, category_id, difficulty_level, tags,
          category:sop_categories!inner(id, name, name_fr)
        ),
        user:auth_users!inner(id, role, full_name)
      `)
      .eq('restaurant_id', this.restaurantId);

    if (sopIds && sopIds.length > 0) {
      query = query.in('sop_id', sopIds);
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start_date)
        .lte('created_at', dateRange.end_date);
    } else {
      // Default to last 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', ninetyDaysAgo);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  /**
   * Analyze specific pattern type
   */
  private async analyzePatternType(
    patternType: CompletionPattern['pattern_type'],
    timePeriod: CompletionPattern['time_period'],
    completionData: any[],
    minimumSampleSize: number
  ): Promise<CompletionPattern[]> {
    // Group data by SOP
    const sopGroups = this.groupBySOP(completionData);
    const patterns: CompletionPattern[] = [];

    for (const [sopId, sopData] of Object.entries(sopGroups)) {
      const data = sopData as any[];
      
      if (data.length < minimumSampleSize) continue;

      let pattern: CompletionPattern;

      switch (patternType) {
        case 'completion_time':
          pattern = this.analyzeCompletionTimePattern(sopId, timePeriod, data);
          break;
        case 'success_rate':
          pattern = this.analyzeSuccessRatePattern(sopId, timePeriod, data);
          break;
        case 'error_patterns':
          pattern = this.analyzeErrorPatterns(sopId, timePeriod, data);
          break;
        case 'seasonal':
          pattern = this.analyzeSeasonalPatterns(sopId, timePeriod, data);
          break;
        case 'difficulty':
          pattern = this.analyzeDifficultyPatterns(sopId, timePeriod, data);
          break;
        default:
          continue;
      }

      if (pattern.confidence_level >= 0.6) { // Only include patterns with reasonable confidence
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Analyze completion time patterns
   */
  private analyzeCompletionTimePattern(sopId: string, timePeriod: string, data: any[]): CompletionPattern {
    const completionTimes = data.map(d => d.time_spent).filter(t => t > 0);
    
    const avgCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
    const sortedTimes = completionTimes.sort((a, b) => a - b);
    const medianCompletionTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
    
    // Calculate standard deviation
    const variance = completionTimes.reduce((sum, time) => sum + Math.pow(time - avgCompletionTime, 2), 0) / completionTimes.length;
    const standardDeviation = Math.sqrt(variance);

    // Detect trend
    const timeGroupedData = this.groupByTimePeriod(data, timePeriod);
    const trendDirection = this.detectTrend(timeGroupedData, 'time_spent');

    // Identify peak hours
    const hourlyData = this.groupByHour(data);
    const peakHours = Object.entries(hourlyData)
      .sort(([,a], [,b]) => (b as any[]).length - (a as any[]).length)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Generate insights
    const insights = this.generateCompletionTimeInsights(
      avgCompletionTime,
      medianCompletionTime,
      standardDeviation,
      trendDirection,
      peakHours,
      data[0]?.sop_document
    );

    return {
      id: `pattern_${sopId}_completion_time_${Date.now()}`,
      sop_id: sopId,
      pattern_type: 'completion_time',
      time_period: timePeriod as CompletionPattern['time_period'],
      pattern_data: {
        avg_completion_time: Math.round(avgCompletionTime),
        median_completion_time: Math.round(medianCompletionTime),
        peak_hours: peakHours
      },
      statistical_metrics: {
        sample_size: completionTimes.length,
        confidence_interval: this.calculateConfidenceInterval(completionTimes),
        standard_deviation: Math.round(standardDeviation),
        trend_direction: trendDirection
      },
      insights,
      confidence_level: this.calculateConfidenceLevel(completionTimes.length, standardDeviation / avgCompletionTime),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Analyze success rate patterns
   */
  private analyzeSuccessRatePattern(sopId: string, timePeriod: string, data: any[]): CompletionPattern {
    const completedCount = data.filter(d => d.progress_percentage === 100).length;
    const totalCount = data.length;
    const successRate = (completedCount / totalCount) * 100;
    const failureRate = 100 - successRate;

    // Analyze success rate over time
    const timeGroupedData = this.groupByTimePeriod(data, timePeriod);
    const trendDirection = this.detectTrend(timeGroupedData, 'success_rate');

    // Generate insights
    const insights = this.generateSuccessRateInsights(successRate, failureRate, trendDirection, data[0]?.sop_document);

    return {
      id: `pattern_${sopId}_success_rate_${Date.now()}`,
      sop_id: sopId,
      pattern_type: 'success_rate',
      time_period: timePeriod as CompletionPattern['time_period'],
      pattern_data: {
        success_rate: Math.round(successRate * 100) / 100,
        failure_rate: Math.round(failureRate * 100) / 100
      },
      statistical_metrics: {
        sample_size: totalCount,
        confidence_interval: this.calculateConfidenceInterval([successRate]),
        trend_direction: trendDirection
      },
      insights,
      confidence_level: this.calculateConfidenceLevel(totalCount, 0.1),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrorPatterns(sopId: string, timePeriod: string, data: any[]): CompletionPattern {
    const incompleteData = data.filter(d => d.progress_percentage < 100);
    const abandonmentRate = (incompleteData.length / data.length) * 100;

    // Analyze abandonment points
    const abandonmentPoints = incompleteData.map(d => d.progress_percentage);
    const commonAbandonmentPoint = this.findMostCommonValue(abandonmentPoints);

    // Identify common error patterns (this would be more sophisticated with actual error data)
    const commonErrors = this.identifyCommonErrors(incompleteData);

    const insights = this.generateErrorPatternInsights(abandonmentRate, commonAbandonmentPoint, commonErrors, data[0]?.sop_document);

    return {
      id: `pattern_${sopId}_error_patterns_${Date.now()}`,
      sop_id: sopId,
      pattern_type: 'error_patterns',
      time_period: timePeriod as CompletionPattern['time_period'],
      pattern_data: {
        failure_rate: Math.round(abandonmentRate * 100) / 100,
        common_errors: commonErrors
      },
      statistical_metrics: {
        sample_size: data.length,
        confidence_interval: this.calculateConfidenceInterval([abandonmentRate])
      },
      insights,
      confidence_level: this.calculateConfidenceLevel(data.length, 0.15),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Analyze seasonal patterns
   */
  private analyzeSeasonalPatterns(sopId: string, timePeriod: string, data: any[]): CompletionPattern {
    const seasonalData = this.groupBySeason(data);
    const seasonalTrends: Record<string, number> = {};

    Object.entries(seasonalData).forEach(([season, seasonData]) => {
      const avgTime = (seasonData as any[]).reduce((sum, d) => sum + d.time_spent, 0) / (seasonData as any[]).length;
      seasonalTrends[season] = Math.round(avgTime);
    });

    const insights = this.generateSeasonalInsights(seasonalTrends, data[0]?.sop_document);

    return {
      id: `pattern_${sopId}_seasonal_${Date.now()}`,
      sop_id: sopId,
      pattern_type: 'seasonal',
      time_period: timePeriod as CompletionPattern['time_period'],
      pattern_data: {
        seasonal_trends: seasonalTrends
      },
      statistical_metrics: {
        sample_size: data.length,
        confidence_interval: this.calculateConfidenceInterval(Object.values(seasonalTrends))
      },
      insights,
      confidence_level: this.calculateConfidenceLevel(data.length, 0.2),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Analyze difficulty patterns
   */
  private analyzeDifficultyPatterns(sopId: string, timePeriod: string, data: any[]): CompletionPattern {
    const difficultyLevel = data[0]?.sop_document?.difficulty_level;
    const userRoles = data.map(d => d.user.role);
    const rolePerformance: Record<string, { avg_time: number; success_rate: number }> = {};

    // Analyze performance by user role
    const roleGroups = this.groupBy(data, 'user.role');
    Object.entries(roleGroups).forEach(([role, roleData]) => {
      const avgTime = (roleData as any[]).reduce((sum, d) => sum + d.time_spent, 0) / (roleData as any[]).length;
      const successRate = ((roleData as any[]).filter(d => d.progress_percentage === 100).length / (roleData as any[]).length) * 100;
      rolePerformance[role] = { avg_time: Math.round(avgTime), success_rate: Math.round(successRate * 100) / 100 };
    });

    const insights = this.generateDifficultyInsights(difficultyLevel, rolePerformance, data[0]?.sop_document);

    return {
      id: `pattern_${sopId}_difficulty_${Date.now()}`,
      sop_id: sopId,
      pattern_type: 'difficulty',
      time_period: timePeriod as CompletionPattern['time_period'],
      pattern_data: {
        difficulty_distribution: rolePerformance
      },
      statistical_metrics: {
        sample_size: data.length,
        confidence_interval: this.calculateConfidenceInterval([Object.keys(rolePerformance).length])
      },
      insights,
      confidence_level: this.calculateConfidenceLevel(data.length, 0.25),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Helper methods for data analysis
   */
  private groupBySOP(data: any[]): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const key = item.sop_id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  private groupBy(data: any[], key: string): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const value = this.getNestedValue(item, key);
      if (!groups[value]) groups[value] = [];
      groups[value].push(item);
      return groups;
    }, {});
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private groupByTimePeriod(data: any[], timePeriod: string): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const date = new Date(item.created_at);
      let key: string;

      switch (timePeriod) {
        case 'hourly':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'daily':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'weekly':
          const weekNumber = this.getWeekNumber(date);
          key = `${date.getFullYear()}-W${weekNumber}`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
        default:
          key = date.toDateString();
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  private groupByHour(data: any[]): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const hour = new Date(item.created_at).getHours().toString();
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(item);
      return groups;
    }, {});
  }

  private groupBySeason(data: any[]): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const month = new Date(item.created_at).getMonth();
      let season: string;
      
      if (month >= 2 && month <= 4) season = 'spring';
      else if (month >= 5 && month <= 7) season = 'summer';
      else if (month >= 8 && month <= 10) season = 'fall';
      else season = 'winter';

      if (!groups[season]) groups[season] = [];
      groups[season].push(item);
      return groups;
    }, {});
  }

  private detectTrend(timeGroupedData: Record<string, any[]>, metric: string): 'increasing' | 'decreasing' | 'stable' {
    const periods = Object.keys(timeGroupedData).sort();
    if (periods.length < 3) return 'stable';

    const values = periods.map(period => {
      const data = timeGroupedData[period];
      switch (metric) {
        case 'time_spent':
          return data.reduce((sum, d) => sum + d.time_spent, 0) / data.length;
        case 'success_rate':
          return (data.filter(d => d.progress_percentage === 100).length / data.length) * 100;
        default:
          return 0;
      }
    });

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.ceil(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = Math.abs(secondAvg - firstAvg) / firstAvg;
    
    if (change < 0.05) return 'stable';
    return secondAvg > firstAvg ? 'increasing' : 'decreasing';
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private findMostCommonValue(values: number[]): number {
    const frequency: Record<number, number> = {};
    values.forEach(val => {
      const rounded = Math.round(val / 10) * 10; // Round to nearest 10%
      frequency[rounded] = (frequency[rounded] || 0) + 1;
    });
    
    return parseInt(Object.entries(frequency).sort(([,a], [,b]) => b - a)[0]?.[0] || '0');
  }

  private identifyCommonErrors(incompleteData: any[]): string[] {
    // This would analyze actual error data if available
    // For now, we'll infer common issues based on abandonment points
    const errors: string[] = [];
    
    const abandonmentPoints = incompleteData.map(d => d.progress_percentage);
    const avgAbandonmentPoint = abandonmentPoints.reduce((sum, point) => sum + point, 0) / abandonmentPoints.length;

    if (avgAbandonmentPoint < 25) {
      errors.push('Initial understanding difficulties');
    } else if (avgAbandonmentPoint < 50) {
      errors.push('Mid-process complexity issues');
    } else if (avgAbandonmentPoint < 75) {
      errors.push('Implementation challenges');
    } else {
      errors.push('Final step completion issues');
    }

    return errors;
  }

  private calculateConfidenceInterval(values: number[]): number {
    if (values.length < 2) return 0.5;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdError = Math.sqrt(variance / values.length);
    
    // 95% confidence interval approximation
    return Math.min(0.95, 0.5 + (1.96 * stdError) / mean);
  }

  private calculateConfidenceLevel(sampleSize: number, variabilityCoeff: number): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence with larger sample size
    if (sampleSize >= 100) confidence += 0.3;
    else if (sampleSize >= 50) confidence += 0.2;
    else if (sampleSize >= 20) confidence += 0.1;
    
    // Decrease confidence with higher variability
    confidence -= Math.min(0.3, variabilityCoeff);
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Generate insights for different pattern types
   */
  private generateCompletionTimeInsights(
    avgTime: number,
    medianTime: number,
    stdDev: number,
    trend: string,
    peakHours: number[],
    sopDoc: any
  ) {
    const keyFindings = [];
    const recommendations = [];
    const optimizationOpportunities = [];

    // Analyze completion time
    if (avgTime > sopDoc?.estimated_read_time * 1.5) {
      keyFindings.push(`Actual completion time (${Math.round(avgTime)} min) significantly exceeds estimated time (${sopDoc?.estimated_read_time} min)`);
      recommendations.push('Consider breaking down complex steps or providing additional training materials');
    }

    // Analyze variability
    const coeffVariation = stdDev / avgTime;
    if (coeffVariation > 0.5) {
      keyFindings.push('High variability in completion times suggests inconsistent performance');
      optimizationOpportunities.push('Standardize training approach to reduce performance variations');
    }

    // Analyze trend
    if (trend === 'increasing') {
      keyFindings.push('Completion times are increasing over time');
      recommendations.push('Investigate potential causes such as complexity creep or training gaps');
    } else if (trend === 'decreasing') {
      keyFindings.push('Completion times are improving over time');
      recommendations.push('Document and replicate successful optimization practices');
    }

    // Analyze peak hours
    if (peakHours.length > 0) {
      keyFindings.push(`Most completions occur during hours: ${peakHours.join(', ')}`);
      optimizationOpportunities.push('Optimize resource allocation during peak completion hours');
    }

    return {
      key_findings: keyFindings,
      recommendations,
      optimization_opportunities: optimizationOpportunities
    };
  }

  private generateSuccessRateInsights(successRate: number, failureRate: number, trend: string, sopDoc: any) {
    const keyFindings = [];
    const recommendations = [];
    const optimizationOpportunities = [];
    const riskFactors = [];

    if (successRate < 70) {
      keyFindings.push(`Low success rate (${successRate.toFixed(1)}%) indicates significant completion challenges`);
      recommendations.push('Review SOP complexity and provide additional support materials');
      riskFactors.push('High failure rate may impact operational efficiency');
    } else if (successRate > 90) {
      keyFindings.push(`Excellent success rate (${successRate.toFixed(1)}%) indicates well-designed SOP`);
      optimizationOpportunities.push('Use this SOP as a template for other procedures');
    }

    if (trend === 'decreasing') {
      keyFindings.push('Success rate is declining over time');
      riskFactors.push('Declining performance may indicate training decay or process drift');
      recommendations.push('Implement refresher training and process review');
    }

    return {
      key_findings: keyFindings,
      recommendations,
      optimization_opportunities: optimizationOpportunities,
      risk_factors: riskFactors
    };
  }

  private generateErrorPatternInsights(abandonmentRate: number, commonPoint: number, errors: string[], sopDoc: any) {
    const keyFindings = [];
    const recommendations = [];
    const optimizationOpportunities = [];

    keyFindings.push(`${abandonmentRate.toFixed(1)}% of attempts are not completed`);
    
    if (commonPoint < 50) {
      keyFindings.push(`Most abandonments occur early in the process (around ${commonPoint}%)`);
      recommendations.push('Improve initial instructions and prerequisites');
    } else {
      keyFindings.push(`Most abandonments occur later in the process (around ${commonPoint}%)`);
      recommendations.push('Review final steps for complexity or resource requirements');
    }

    errors.forEach(error => {
      keyFindings.push(error);
    });

    optimizationOpportunities.push('Target interventions at identified failure points');

    return {
      key_findings: keyFindings,
      recommendations,
      optimization_opportunities: optimizationOpportunities
    };
  }

  private generateSeasonalInsights(seasonalTrends: Record<string, number>, sopDoc: any) {
    const keyFindings = [];
    const recommendations = [];
    const optimizationOpportunities = [];

    const seasons = Object.keys(seasonalTrends);
    const times = Object.values(seasonalTrends);
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const maxSeason = seasons[times.indexOf(maxTime)];
    const minSeason = seasons[times.indexOf(minTime)];

    if (maxTime / minTime > 1.3) {
      keyFindings.push(`Significant seasonal variation: ${maxSeason} (${maxTime} min) vs ${minSeason} (${minTime} min)`);
      recommendations.push(`Provide additional support during ${maxSeason} when completion times are highest`);
      optimizationOpportunities.push('Develop season-specific training materials or resources');
    } else {
      keyFindings.push('Consistent performance across seasons');
    }

    return {
      key_findings: keyFindings,
      recommendations,
      optimization_opportunities: optimizationOpportunities
    };
  }

  private generateDifficultyInsights(difficultyLevel: string, rolePerformance: Record<string, any>, sopDoc: any) {
    const keyFindings = [];
    const recommendations = [];
    const optimizationOpportunities = [];

    keyFindings.push(`SOP difficulty level: ${difficultyLevel}`);

    Object.entries(rolePerformance).forEach(([role, performance]) => {
      keyFindings.push(`${role}: ${performance.avg_time} min avg, ${performance.success_rate}% success rate`);
    });

    // Find best and worst performing roles
    const roles = Object.keys(rolePerformance);
    if (roles.length > 1) {
      const bestRole = roles.reduce((best, role) => 
        rolePerformance[role].success_rate > rolePerformance[best].success_rate ? role : best
      );
      const worstRole = roles.reduce((worst, role) => 
        rolePerformance[role].success_rate < rolePerformance[worst].success_rate ? role : worst
      );

      if (rolePerformance[bestRole].success_rate - rolePerformance[worstRole].success_rate > 20) {
        recommendations.push(`Provide additional training for ${worstRole} role based on ${bestRole} best practices`);
        optimizationOpportunities.push(`Create role-specific variations of the SOP`);
      }
    }

    return {
      key_findings: keyFindings,
      recommendations,
      optimization_opportunities: optimizationOpportunities
    };
  }

  /**
   * Store patterns in database
   */
  private async storePatterns(patterns: CompletionPattern[]): Promise<void> {
    const patternData = patterns.map(pattern => ({
      restaurant_id: this.restaurantId,
      sop_document_id: pattern.sop_id,
      pattern_type: pattern.pattern_type,
      time_period: pattern.time_period,
      pattern_data: pattern.pattern_data,
      statistical_metrics: pattern.statistical_metrics,
      insights: pattern.insights,
      confidence_level: pattern.confidence_level
    }));

    await supabaseAdmin
      .from('sop_completion_patterns')
      .insert(patternData);
  }
}

/**
 * GET /api/sop/patterns - Get pattern analysis for SOPs
 */
async function handleGetPatterns(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sopIds = searchParams.get('sop_ids')?.split(',').filter(Boolean);
    const patternTypes = searchParams.get('pattern_types')?.split(',').filter(Boolean);
    const timePeriod = searchParams.get('time_period');
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0.6');

    // Validate pagination
    const paginationValidation = validatePagination({ page, limit });
    if (!paginationValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters',
        details: paginationValidation.errors,
      } as APIResponse, { status: 400 });
    }

    // Build query
    let query = supabaseAdmin
      .from('sop_completion_patterns')
      .select(`
        *,
        sop_document:sop_documents!inner(
          id, title, title_fr, difficulty_level,
          category:sop_categories!inner(id, name, name_fr)
        )
      `, { count: 'exact' })
      .eq('restaurant_id', context.restaurantId)
      .gte('confidence_level', minConfidence);

    if (sopIds && sopIds.length > 0) {
      query = query.in('sop_document_id', sopIds);
    }

    if (patternTypes && patternTypes.length > 0) {
      query = query.in('pattern_type', patternTypes);
    }

    if (timePeriod) {
      query = query.eq('time_period', timePeriod);
    }

    query = query
      .order('confidence_level', { ascending: false })
      .order('updated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: patterns, error, count } = await query;

    if (error) {
      console.error('Error fetching completion patterns:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch completion patterns',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const response = {
      success: true,
      data: patterns || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/patterns:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/patterns/analyze - Trigger new pattern analysis
 */
async function handleAnalyzePatterns(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const analysisRequest = sanitizeInput(body) as PatternAnalysisRequest;

    // Create analyzer and run analysis
    const analyzer = new SOPPatternAnalyzer(context);
    const patterns = await analyzer.analyzePatterns(analysisRequest);

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'pattern_analysis',
      `analysis_${Date.now()}`,
      null,
      { 
        request: analysisRequest,
        patterns_generated: patterns.length 
      },
      request
    );

    const response: APIResponse<CompletionPattern[]> = {
      success: true,
      data: patterns,
      message: `Generated ${patterns.length} pattern analyses`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/patterns/analyze:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetPatterns, PERMISSIONS.SOP.READ, {
  maxRequests: 200,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleAnalyzePatterns, PERMISSIONS.SOP.CREATE, {
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