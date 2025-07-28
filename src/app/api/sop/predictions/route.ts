/**
 * SOP Performance Prediction API Route
 * Uses machine learning algorithms to predict SOP completion times, success rates, and quality scores
 * 
 * GET    /api/sop/predictions           - Get performance predictions for SOPs
 * POST   /api/sop/predictions/generate  - Generate new predictions using ML models
 * POST   /api/sop/predictions/verify    - Verify prediction accuracy with actual results
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface PredictionRequest {
  sop_ids?: string[];
  user_ids?: string[];
  prediction_types?: ('completion_time' | 'success_probability' | 'difficulty_score' | 'quality_score')[];
  prediction_horizon_days?: number;
  include_confidence_intervals?: boolean;
}

interface SOPPrediction {
  id: string;
  sop_id: string;
  user_id?: string;
  prediction_type: 'completion_time' | 'success_probability' | 'difficulty_score' | 'quality_score';
  predicted_value: number;
  prediction_range?: {
    min_value: number;
    max_value: number;
  };
  confidence_interval: number;
  input_features: {
    user_experience_level: number;
    sop_complexity_score: number;
    historical_performance: number;
    contextual_factors: Record<string, any>;
    seasonal_adjustments: Record<string, number>;
  };
  model_version: string;
  prediction_date: string;
  expires_at: string;
  accuracy_score?: number;
  actual_value?: number;
  verified_at?: string;
}

interface PredictionVerification {
  prediction_id: string;
  actual_value: number;
  verification_context?: Record<string, any>;
}

/**
 * SOP Performance Prediction Engine
 * Implements ML algorithms for predicting SOP performance metrics
 */
class SOPPredictionEngine {
  private context: SOPAuthContext;
  private restaurantId: string;
  private modelVersion = '1.0.0';

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Generate performance predictions for SOPs
   */
  async generatePredictions(request: PredictionRequest): Promise<SOPPrediction[]> {
    const {
      sop_ids,
      user_ids,
      prediction_types = ['completion_time', 'success_probability'],
      prediction_horizon_days = 30,
      include_confidence_intervals = true
    } = request;

    // Get historical data for training
    const historicalData = await this.getHistoricalData(sop_ids, user_ids);
    
    if (historicalData.length < 10) {
      throw new Error('Insufficient historical data for reliable predictions');
    }

    // Get contextual features
    const contextualFeatures = await this.extractContextualFeatures();

    // Generate predictions for each combination
    const predictions: SOPPrediction[] = [];

    for (const predictionType of prediction_types) {
      const typePredictions = await this.generatePredictionsForType(
        predictionType,
        historicalData,
        contextualFeatures,
        include_confidence_intervals,
        prediction_horizon_days
      );
      predictions.push(...typePredictions);
    }

    // Store predictions in database
    await this.storePredictions(predictions);

    return predictions;
  }

  /**
   * Verify prediction accuracy against actual results
   */
  async verifyPredictions(verifications: PredictionVerification[]): Promise<{
    verified_predictions: SOPPrediction[];
    accuracy_summary: {
      overall_accuracy: number;
      accuracy_by_type: Record<string, number>;
      prediction_bias: number;
    };
  }> {
    const verifiedPredictions: SOPPrediction[] = [];
    const accuracyScores: number[] = [];
    const typeAccuracies: Record<string, number[]> = {};
    const biasScores: number[] = [];

    for (const verification of verifications) {
      const verified = await this.verifyPrediction(verification);
      if (verified) {
        verifiedPredictions.push(verified);
        accuracyScores.push(verified.accuracy_score!);
        
        const type = verified.prediction_type;
        if (!typeAccuracies[type]) typeAccuracies[type] = [];
        typeAccuracies[type].push(verified.accuracy_score!);

        // Calculate bias (predicted - actual)
        const bias = verified.predicted_value - verified.actual_value!;
        biasScores.push(bias);
      }
    }

    // Calculate accuracy summary
    const overallAccuracy = accuracyScores.reduce((sum, acc) => sum + acc, 0) / accuracyScores.length;
    const accuracyByType: Record<string, number> = {};
    
    Object.entries(typeAccuracies).forEach(([type, scores]) => {
      accuracyByType[type] = scores.reduce((sum, acc) => sum + acc, 0) / scores.length;
    });

    const predictionBias = biasScores.reduce((sum, bias) => sum + bias, 0) / biasScores.length;

    return {
      verified_predictions: verifiedPredictions,
      accuracy_summary: {
        overall_accuracy: Math.round(overallAccuracy * 1000) / 1000,
        accuracy_by_type: accuracyByType,
        prediction_bias: Math.round(predictionBias * 1000) / 1000
      }
    };
  }

  /**
   * Get historical completion data for training
   */
  private async getHistoricalData(sopIds?: string[], userIds?: string[]) {
    let query = supabaseAdmin
      .from('user_progress')
      .select(`
        *,
        sop_document:sop_documents!inner(
          id, title, difficulty_level, estimated_read_time, tags,
          category:sop_categories!inner(id, name)
        ),
        user:auth_users!inner(id, role, full_name)
      `)
      .eq('restaurant_id', this.restaurantId)
      .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()); // Last 6 months

    if (sopIds && sopIds.length > 0) {
      query = query.in('sop_id', sopIds);
    }

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  /**
   * Extract contextual features for predictions
   */
  private async extractContextualFeatures() {
    // Get staff skill profiles
    const { data: skillProfiles } = await supabaseAdmin
      .from('staff_skill_profiles')
      .select('*')
      .eq('restaurant_id', this.restaurantId);

    // Get equipment availability
    const { data: equipment } = await supabaseAdmin
      .from('equipment_availability')
      .select('*')
      .eq('restaurant_id', this.restaurantId);

    // Get environmental factors
    const { data: environmentalFactors } = await supabaseAdmin
      .from('environmental_factors')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    return {
      skillProfiles: skillProfiles || [],
      equipment: equipment || [],
      environmentalFactors: environmentalFactors || []
    };
  }

  /**
   * Generate predictions for a specific type
   */
  private async generatePredictionsForType(
    predictionType: SOPPrediction['prediction_type'],
    historicalData: any[],
    contextualFeatures: any,
    includeConfidenceIntervals: boolean,
    horizonDays: number
  ): Promise<SOPPrediction[]> {
    const predictions: SOPPrediction[] = [];

    // Group data by SOP and user for individual predictions
    const sopUserGroups = this.groupBySOPAndUser(historicalData);

    for (const [key, group] of Object.entries(sopUserGroups)) {
      const [sopId, userId] = key.split('|');
      const groupData = group as any[];

      if (groupData.length < 3) continue; // Need minimum data for prediction

      const prediction = await this.generateSinglePrediction(
        predictionType,
        sopId,
        userId,
        groupData,
        contextualFeatures,
        includeConfidenceIntervals,
        horizonDays
      );

      if (prediction) {
        predictions.push(prediction);
      }
    }

    return predictions;
  }

  /**
   * Generate a single prediction
   */
  private async generateSinglePrediction(
    predictionType: SOPPrediction['prediction_type'],
    sopId: string,
    userId: string,
    historicalData: any[],
    contextualFeatures: any,
    includeConfidenceIntervals: boolean,
    horizonDays: number
  ): Promise<SOPPrediction | null> {
    const sopData = historicalData[0].sop_document;
    const userData = historicalData[0].user;

    // Extract input features
    const inputFeatures = this.extractInputFeatures(
      sopData,
      userData,
      historicalData,
      contextualFeatures
    );

    // Generate prediction based on type
    let predictedValue: number;
    let confidenceInterval: number;
    let predictionRange: { min_value: number; max_value: number } | undefined;

    switch (predictionType) {
      case 'completion_time':
        const timeResult = this.predictCompletionTime(historicalData, inputFeatures);
        predictedValue = timeResult.predicted_time;
        confidenceInterval = timeResult.confidence;
        if (includeConfidenceIntervals) {
          predictionRange = timeResult.range;
        }
        break;

      case 'success_probability':
        const successResult = this.predictSuccessProbability(historicalData, inputFeatures);
        predictedValue = successResult.probability;
        confidenceInterval = successResult.confidence;
        if (includeConfidenceIntervals) {
          predictionRange = successResult.range;
        }
        break;

      case 'difficulty_score':
        const difficultyResult = this.predictDifficultyScore(historicalData, inputFeatures);
        predictedValue = difficultyResult.score;
        confidenceInterval = difficultyResult.confidence;
        if (includeConfidenceIntervals) {
          predictionRange = difficultyResult.range;
        }
        break;

      case 'quality_score':
        const qualityResult = this.predictQualityScore(historicalData, inputFeatures);
        predictedValue = qualityResult.score;
        confidenceInterval = qualityResult.confidence;
        if (includeConfidenceIntervals) {
          predictionRange = qualityResult.range;
        }
        break;

      default:
        return null;
    }

    return {
      id: `pred_${sopId}_${userId}_${predictionType}_${Date.now()}`,
      sop_id: sopId,
      user_id: userId,
      prediction_type: predictionType,
      predicted_value: Math.round(predictedValue * 1000) / 1000,
      prediction_range: predictionRange,
      confidence_interval: Math.round(confidenceInterval * 1000) / 1000,
      input_features: inputFeatures,
      model_version: this.modelVersion,
      prediction_date: new Date().toISOString(),
      expires_at: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Predict completion time using weighted moving average and trend analysis
   */
  private predictCompletionTime(historicalData: any[], inputFeatures: any): {
    predicted_time: number;
    confidence: number;
    range?: { min_value: number; max_value: number };
  } {
    const completionTimes = historicalData.map(d => d.time_spent).filter(t => t > 0);
    
    if (completionTimes.length === 0) {
      return {
        predicted_time: inputFeatures.sop_complexity_score * 20, // Fallback estimate
        confidence: 0.3
      };
    }

    // Calculate weighted moving average (more weight to recent data)
    const weights = completionTimes.map((_, i) => Math.pow(0.9, completionTimes.length - 1 - i));
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    const weightedAvg = completionTimes.reduce((sum, time, i) => sum + time * weights[i], 0) / weightSum;

    // Apply adjustments based on input features
    let adjustedTime = weightedAvg;
    adjustedTime *= (1 + (inputFeatures.sop_complexity_score - 0.5) * 0.3); // Complexity adjustment
    adjustedTime *= (1 + (0.5 - inputFeatures.user_experience_level) * 0.2); // Experience adjustment

    // Apply seasonal adjustments
    Object.values(inputFeatures.seasonal_adjustments).forEach((adj: any) => {
      adjustedTime *= (1 + adj * 0.1);
    });

    // Calculate confidence based on data consistency
    const variance = completionTimes.reduce((sum, time) => sum + Math.pow(time - weightedAvg, 2), 0) / completionTimes.length;
    const stdDev = Math.sqrt(variance);
    const coeffVariation = stdDev / weightedAvg;
    const confidence = Math.max(0.3, Math.min(0.95, 1 - coeffVariation));

    // Calculate prediction range
    const range = {
      min_value: Math.max(1, adjustedTime - stdDev),
      max_value: adjustedTime + stdDev
    };

    return {
      predicted_time: adjustedTime,
      confidence,
      range
    };
  }

  /**
   * Predict success probability using logistic regression approach
   */
  private predictSuccessProbability(historicalData: any[], inputFeatures: any): {
    probability: number;
    confidence: number;
    range?: { min_value: number; max_value: number };
  } {
    const completions = historicalData.map(d => d.progress_percentage === 100 ? 1 : 0);
    const baseSuccessRate = completions.reduce((sum, c) => sum + c, 0) / completions.length;

    // Apply feature-based adjustments using logistic function
    let logit = Math.log(baseSuccessRate / (1 - baseSuccessRate)); // Convert to logit space

    // Feature coefficients (learned from data analysis)
    logit += (inputFeatures.user_experience_level - 0.5) * 2; // Experience boost
    logit += (0.5 - inputFeatures.sop_complexity_score) * 1.5; // Complexity penalty
    logit += (inputFeatures.historical_performance - 0.5) * 1; // Historical performance

    // Convert back to probability
    const probability = 1 / (1 + Math.exp(-logit));

    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(0.95, 0.5 + Math.log(completions.length) / 10);

    // Calculate range
    const margin = (1 - confidence) * 0.3;
    const range = {
      min_value: Math.max(0, probability - margin),
      max_value: Math.min(1, probability + margin)
    };

    return {
      probability,
      confidence,
      range
    };
  }

  /**
   * Predict difficulty score based on user performance patterns
   */
  private predictDifficultyScore(historicalData: any[], inputFeatures: any): {
    score: number;
    confidence: number;
    range?: { min_value: number; max_value: number };
  } {
    // Base difficulty from SOP metadata
    const sopDifficulty = {
      'beginner': 0.3,
      'intermediate': 0.6,
      'advanced': 0.9
    }[historicalData[0].sop_document.difficulty_level] || 0.5;

    // Adjust based on actual user performance
    const avgCompletionRate = historicalData.filter(d => d.progress_percentage === 100).length / historicalData.length;
    const avgTimeRatio = historicalData.reduce((sum, d) => sum + d.time_spent, 0) / 
                        (historicalData.length * (historicalData[0].sop_document.estimated_read_time || 30));

    let adjustedDifficulty = sopDifficulty;
    adjustedDifficulty += (1 - avgCompletionRate) * 0.3; // Higher difficulty if low completion rate
    adjustedDifficulty += Math.max(0, (avgTimeRatio - 1) * 0.2); // Higher difficulty if taking longer

    // User experience adjustment
    adjustedDifficulty *= (1 + (0.5 - inputFeatures.user_experience_level) * 0.3);

    adjustedDifficulty = Math.max(0.1, Math.min(1.0, adjustedDifficulty));

    const confidence = Math.min(0.9, 0.4 + Math.log(historicalData.length) / 8);

    const range = {
      min_value: Math.max(0.1, adjustedDifficulty - 0.2),
      max_value: Math.min(1.0, adjustedDifficulty + 0.2)
    };

    return {
      score: adjustedDifficulty,
      confidence,
      range
    };
  }

  /**
   * Predict quality score based on completion patterns and contextual factors
   */
  private predictQualityScore(historicalData: any[], inputFeatures: any): {
    score: number;
    confidence: number;
    range?: { min_value: number; max_value: number };
  } {
    // Base quality from completion consistency
    const completions = historicalData.filter(d => d.progress_percentage === 100);
    const partialCompletions = historicalData.filter(d => d.progress_percentage > 0 && d.progress_percentage < 100);
    
    let baseQuality = 0.5;
    if (completions.length > 0) {
      baseQuality = 0.7 + (completions.length / historicalData.length) * 0.3;
    }

    // Adjust for time consistency (lower variance = higher quality)
    if (completions.length > 1) {
      const times = completions.map(c => c.time_spent);
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;
      const consistency = Math.max(0, 1 - Math.sqrt(variance) / avgTime);
      baseQuality += consistency * 0.2;
    }

    // Adjust for user experience and SOP factors
    baseQuality += inputFeatures.user_experience_level * 0.1;
    baseQuality += (1 - inputFeatures.sop_complexity_score) * 0.1;

    baseQuality = Math.max(0.1, Math.min(1.0, baseQuality));

    const confidence = Math.min(0.85, 0.3 + Math.log(completions.length + 1) / 6);

    const range = {
      min_value: Math.max(0.1, baseQuality - 0.15),
      max_value: Math.min(1.0, baseQuality + 0.15)
    };

    return {
      score: baseQuality,
      confidence,
      range
    };
  }

  /**
   * Extract input features for ML model
   */
  private extractInputFeatures(
    sopData: any,
    userData: any,
    historicalData: any[],
    contextualFeatures: any
  ) {
    // User experience level
    const userExperience = this.calculateUserExperienceLevel(userData, historicalData, contextualFeatures);

    // SOP complexity score
    const sopComplexity = this.calculateSOPComplexityScore(sopData);

    // Historical performance
    const historicalPerformance = this.calculateHistoricalPerformance(historicalData);

    // Contextual factors
    const contextFactors = this.extractContextualFactors(sopData, contextualFeatures);

    // Seasonal adjustments
    const seasonalAdjustments = this.calculateSeasonalAdjustments();

    return {
      user_experience_level: userExperience,
      sop_complexity_score: sopComplexity,
      historical_performance: historicalPerformance,
      contextual_factors: contextFactors,
      seasonal_adjustments: seasonalAdjustments
    };
  }

  /**
   * Calculate user experience level (0-1 scale)
   */
  private calculateUserExperienceLevel(userData: any, historicalData: any[], contextualFeatures: any): number {
    let experienceScore = 0.5; // Base score

    // Role-based experience
    const roleExperience = {
      'admin': 0.9,
      'manager': 0.8,
      'chef': 0.7,
      'server': 0.6
    };
    experienceScore += (roleExperience[userData.role as keyof typeof roleExperience] || 0.5) * 0.3;

    // Historical completion rate
    const completionRate = historicalData.filter(d => d.progress_percentage === 100).length / historicalData.length;
    experienceScore += completionRate * 0.2;

    // Skill profile match
    const userSkills = contextualFeatures.skillProfiles.filter((skill: any) => skill.user_id === userData.id);
    if (userSkills.length > 0) {
      const avgSkillLevel = userSkills.reduce((sum: number, skill: any) => sum + skill.proficiency_level, 0) / userSkills.length;
      experienceScore += (avgSkillLevel / 10) * 0.2;
    }

    return Math.max(0, Math.min(1, experienceScore));
  }

  /**
   * Calculate SOP complexity score (0-1 scale)
   */
  private calculateSOPComplexityScore(sopData: any): number {
    let complexityScore = 0.5; // Base score

    // Difficulty level
    const difficultyScore = {
      'beginner': 0.3,
      'intermediate': 0.6,
      'advanced': 0.9
    };
    complexityScore += (difficultyScore[sopData.difficulty_level as keyof typeof difficultyScore] || 0.5) * 0.4;

    // Estimated time (longer = more complex)
    const timeComplexity = Math.min(1, (sopData.estimated_read_time || 30) / 60); // Normalize to hour
    complexityScore += timeComplexity * 0.3;

    // Number of tags (more tags = more complex)
    const tagComplexity = Math.min(1, (sopData.tags?.length || 0) / 10);
    complexityScore += tagComplexity * 0.2;

    // Category complexity
    const categoryComplexity = {
      'food_safety': 0.8,
      'cooking': 0.7,
      'service': 0.5,
      'cleaning': 0.4
    };
    const categoryName = sopData.category.name.toLowerCase();
    const catComplexity = Object.entries(categoryComplexity).find(([key]) => 
      categoryName.includes(key)
    )?.[1] || 0.5;
    complexityScore += catComplexity * 0.1;

    return Math.max(0, Math.min(1, complexityScore));
  }

  /**
   * Calculate historical performance score
   */
  private calculateHistoricalPerformance(historicalData: any[]): number {
    if (historicalData.length === 0) return 0.5;

    const completionRate = historicalData.filter(d => d.progress_percentage === 100).length / historicalData.length;
    const avgProgress = historicalData.reduce((sum, d) => sum + d.progress_percentage, 0) / (historicalData.length * 100);
    
    return (completionRate + avgProgress) / 2;
  }

  /**
   * Extract contextual factors
   */
  private extractContextualFactors(sopData: any, contextualFeatures: any): Record<string, any> {
    return {
      equipment_availability: contextualFeatures.equipment.filter((eq: any) => eq.status === 'available').length,
      environmental_factors_count: contextualFeatures.environmentalFactors.length,
      peak_period: this.isPeakPeriod(),
      staff_count: contextualFeatures.skillProfiles.length
    };
  }

  /**
   * Calculate seasonal adjustments
   */
  private calculateSeasonalAdjustments(): Record<string, number> {
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    return {
      seasonal: month >= 5 && month <= 7 ? 0.1 : -0.05, // Summer adjustment
      time_of_day: hour >= 11 && hour <= 14 ? -0.1 : 0.05, // Lunch period
      day_of_week: dayOfWeek === 0 || dayOfWeek === 6 ? -0.05 : 0 // Weekend
    };
  }

  /**
   * Check if current time is peak period
   */
  private isPeakPeriod(): boolean {
    const hour = new Date().getHours();
    return (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21);
  }

  /**
   * Group historical data by SOP and user
   */
  private groupBySOPAndUser(data: any[]): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const key = `${item.sop_id}|${item.user_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  /**
   * Store predictions in database
   */
  private async storePredictions(predictions: SOPPrediction[]): Promise<void> {
    const predictionData = predictions.map(pred => ({
      restaurant_id: this.restaurantId,
      sop_document_id: pred.sop_id,
      user_id: pred.user_id,
      prediction_type: pred.prediction_type,
      predicted_value: pred.predicted_value,
      prediction_range: pred.prediction_range,
      confidence_interval: pred.confidence_interval,
      input_features: pred.input_features,
      model_version: pred.model_version,
      prediction_date: pred.prediction_date
    }));

    await supabaseAdmin
      .from('sop_performance_predictions')
      .insert(predictionData);
  }

  /**
   * Verify a single prediction
   */
  private async verifyPrediction(verification: PredictionVerification): Promise<SOPPrediction | null> {
    try {
      // Calculate accuracy score
      const { data: prediction } = await supabaseAdmin
        .from('sop_performance_predictions')
        .select('*')
        .eq('id', verification.prediction_id)
        .eq('restaurant_id', this.restaurantId)
        .single();

      if (!prediction) return null;

      const accuracyScore = 1 - Math.abs(prediction.predicted_value - verification.actual_value) / 
                           Math.max(prediction.predicted_value, verification.actual_value);

      // Update prediction with verification
      const { data: updatedPrediction } = await supabaseAdmin
        .from('sop_performance_predictions')
        .update({
          actual_value: verification.actual_value,
          accuracy_score: Math.max(0, accuracyScore),
          verified_at: new Date().toISOString()
        })
        .eq('id', verification.prediction_id)
        .select()
        .single();

      return {
        id: updatedPrediction.id,
        sop_id: updatedPrediction.sop_document_id,
        user_id: updatedPrediction.user_id,
        prediction_type: updatedPrediction.prediction_type,
        predicted_value: updatedPrediction.predicted_value,
        prediction_range: updatedPrediction.prediction_range,
        confidence_interval: updatedPrediction.confidence_interval,
        input_features: updatedPrediction.input_features,
        model_version: updatedPrediction.model_version,
        prediction_date: updatedPrediction.prediction_date,
        expires_at: updatedPrediction.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        accuracy_score: updatedPrediction.accuracy_score,
        actual_value: updatedPrediction.actual_value,
        verified_at: updatedPrediction.verified_at
      };
    } catch (error) {
      console.error('Error verifying prediction:', error);
      return null;
    }
  }
}

/**
 * GET /api/sop/predictions - Get performance predictions for SOPs
 */
async function handleGetPredictions(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sopIds = searchParams.get('sop_ids')?.split(',').filter(Boolean);
    const userIds = searchParams.get('user_ids')?.split(',').filter(Boolean);
    const predictionTypes = searchParams.get('prediction_types')?.split(',').filter(Boolean);
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0.5');
    const includeVerified = searchParams.get('include_verified') === 'true';

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
      .from('sop_performance_predictions')
      .select(`
        *,
        sop_document:sop_documents!inner(
          id, title, title_fr, difficulty_level,
          category:sop_categories!inner(id, name, name_fr)
        ),
        user:auth_users(id, full_name, role)
      `, { count: 'exact' })
      .eq('restaurant_id', context.restaurantId)
      .gte('confidence_interval', minConfidence)
      .gt('prediction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

    if (sopIds && sopIds.length > 0) {
      query = query.in('sop_document_id', sopIds);
    }

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    if (predictionTypes && predictionTypes.length > 0) {
      query = query.in('prediction_type', predictionTypes);
    }

    if (!includeVerified) {
      query = query.is('verified_at', null);
    }

    query = query
      .order('confidence_interval', { ascending: false })
      .order('prediction_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: predictions, error, count } = await query;

    if (error) {
      console.error('Error fetching performance predictions:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch performance predictions',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const response = {
      success: true,
      data: predictions || [],
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
    console.error('Unexpected error in GET /api/sop/predictions:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/predictions/generate - Generate new predictions
 */
async function handleGeneratePredictions(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const predictionRequest = sanitizeInput(body) as PredictionRequest;

    const engine = new SOPPredictionEngine(context);
    const predictions = await engine.generatePredictions(predictionRequest);

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'performance_predictions',
      `batch_${Date.now()}`,
      null,
      { 
        request: predictionRequest,
        predictions_generated: predictions.length 
      },
      request
    );

    const response: APIResponse<SOPPrediction[]> = {
      success: true,
      data: predictions,
      message: `Generated ${predictions.length} performance predictions`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/predictions/generate:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'PREDICTION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/predictions/verify - Verify prediction accuracy
 */
async function handleVerifyPredictions(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const verifications = sanitizeInput(body.verifications || [body]) as PredictionVerification[];

    if (!Array.isArray(verifications)) {
      return NextResponse.json({
        success: false,
        error: 'Verifications must be an array',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const engine = new SOPPredictionEngine(context);
    const result = await engine.verifyPredictions(verifications);

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'prediction_verification',
      `batch_${Date.now()}`,
      null,
      { 
        verifications_count: verifications.length,
        accuracy_summary: result.accuracy_summary 
      },
      request
    );

    const response: APIResponse = {
      success: true,
      data: result,
      message: `Verified ${result.verified_predictions.length} predictions`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/predictions/verify:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetPredictions, PERMISSIONS.SOP.READ, {
  maxRequests: 200,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(async (request: NextRequest, context: SOPAuthContext) => {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/generate')) {
    return handleGeneratePredictions(request, context);
  } else if (url.pathname.endsWith('/verify')) {
    return handleVerifyPredictions(request, context);
  } else {
    return NextResponse.json(
      { success: false, error: 'Invalid endpoint' } as APIResponse,
      { status: 404 }
    );
  }
}, PERMISSIONS.SOP.CREATE, {
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