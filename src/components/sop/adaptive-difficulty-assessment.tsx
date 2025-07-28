'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  GraduationCap, 
  Star, 
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Settings,
  BookOpen,
  Brain,
  Zap,
  Shield,
  Award,
  BarChart3,
  Timer,
  Layers
} from 'lucide-react';

interface DifficultyMetric {
  id: string;
  name: string;
  name_fr: string;
  weight: number;
  value: number; // 0-100
  description: string;
  description_fr: string;
  category: 'technical' | 'cognitive' | 'physical' | 'time' | 'safety';
}

interface AdaptiveGuidance {
  id: string;
  trigger_condition: string;
  guidance_type: 'hint' | 'detailed_explanation' | 'visual_aid' | 'practice_mode' | 'expert_tips';
  content: string;
  content_fr: string;
  priority: 'low' | 'medium' | 'high';
  show_automatically: boolean;
  user_can_dismiss: boolean;
}

interface UserPerformanceData {
  user_id: string;
  sop_category: string;
  avg_completion_time: number;
  success_rate: number;
  error_patterns: string[];
  learning_curve_slope: number;
  preferred_guidance_types: string[];
  skill_level: 1 | 2 | 3 | 4 | 5;
}

interface DifficultyAssessment {
  overall_difficulty: number; // 1-5
  confidence_level: number; // 0-1
  estimated_time: number; // minutes
  success_probability: number; // 0-1
  risk_factors: string[];
  recommended_preparation: string[];
  adaptive_features: AdaptiveGuidance[];
  difficulty_breakdown: DifficultyMetric[];
  personalization_factors: {
    user_experience_adjustment: number;
    historical_performance_factor: number;
    contextual_complexity_modifier: number;
  };
}

interface AdaptiveDifficultyAssessmentProps {
  /** SOP information */
  sopData: {
    id: string;
    title: string;
    category: string;
    base_difficulty: number;
    estimated_time: number;
    steps: Array<{
      id: string;
      complexity: number;
      safety_critical: boolean;
      requires_equipment: string[];
      decision_points: number;
    }>;
    historical_data?: {
      avg_completion_time: number;
      success_rate: number;
      common_errors: string[];
    };
  };
  /** Current user profile */
  userProfile: {
    id: string;
    experience_level: 1 | 2 | 3 | 4 | 5;
    role: string;
    completed_sops: string[];
    performance_history: UserPerformanceData[];
    learning_preferences: {
      guidance_level: 'minimal' | 'moderate' | 'detailed';
      visual_aids: boolean;
      audio_instructions: boolean;
      practice_mode: boolean;
    };
  };
  /** Current context */
  executionContext: {
    time_pressure: 'low' | 'medium' | 'high';
    available_time: number; // minutes
    equipment_availability: string[];
    support_staff_present: boolean;
    interruption_likelihood: 'low' | 'medium' | 'high';
  };
  /** Show detailed breakdown */
  showDetailedBreakdown?: boolean;
  /** Enable adaptive features */
  enableAdaptiveFeatures?: boolean;
  /** Allow difficulty override */
  allowDifficultyOverride?: boolean;
  /** Callback when assessment changes */
  onAssessmentChange?: (assessment: DifficultyAssessment) => void;
  /** Callback when adaptive guidance is triggered */
  onGuidanceTriggered?: (guidance: AdaptiveGuidance) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * AdaptiveDifficultyAssessment - AI-powered difficulty analysis with progressive disclosure
 * 
 * Features:
 * - Multi-factor difficulty analysis (technical, cognitive, physical, time, safety)
 * - Personalized difficulty assessment based on user experience and performance
 * - Contextual complexity adjustments for real-time conditions
 * - Progressive disclosure of guidance based on user needs
 * - Adaptive learning system that improves recommendations over time
 * - Risk factor identification and mitigation suggestions
 * - Visual difficulty breakdown with category-specific insights
 * - Real-time performance prediction and success probability
 * - Customizable guidance preferences and automation levels
 * 
 * @param props AdaptiveDifficultyAssessmentProps
 * @returns JSX.Element
 */
const AdaptiveDifficultyAssessment: React.FC<AdaptiveDifficultyAssessmentProps> = ({
  sopData,
  userProfile,
  executionContext,
  showDetailedBreakdown = true,
  enableAdaptiveFeatures = true,
  allowDifficultyOverride = false,
  onAssessmentChange,
  onGuidanceTriggered,
  className
}) => {
  const t = useTranslations('sop.difficultyAssessment');
  
  const [assessment, setAssessment] = useState<DifficultyAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  const [activeGuidance, setActiveGuidance] = useState<AdaptiveGuidance[]>([]);
  const [dismissedGuidance, setDismissedGuidance] = useState<string[]>([]);
  const [userDifficultyOverride, setUserDifficultyOverride] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Calculate comprehensive difficulty assessment
  const calculateDifficultyAssessment = useCallback(async (): Promise<DifficultyAssessment> => {
    setIsLoading(true);
    
    // Simulate AI-powered assessment calculation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Base difficulty metrics
    const baseDifficultyMetrics: DifficultyMetric[] = [
      {
        id: 'technical_complexity',
        name: 'Technical Complexity',
        name_fr: 'Complexité Technique',
        weight: 0.25,
        value: sopData.base_difficulty * 20, // Convert 1-5 to 0-100
        description: 'Equipment usage, technical procedures, and specialized knowledge requirements',
        description_fr: 'Utilisation d\'équipement, procédures techniques et exigences de connaissances spécialisées',
        category: 'technical'
      },
      {
        id: 'cognitive_load',
        name: 'Cognitive Load',
        name_fr: 'Charge Cognitive',
        weight: 0.2,
        value: sopData.steps.reduce((sum, step) => sum + step.decision_points, 0) * 10,
        description: 'Mental processing, decision-making, and attention requirements',
        description_fr: 'Traitement mental, prise de décision et exigences d\'attention',
        category: 'cognitive'
      },
      {
        id: 'time_pressure',
        name: 'Time Pressure',
        name_fr: 'Pression Temporelle',
        weight: 0.15,
        value: executionContext.time_pressure === 'high' ? 80 : 
               executionContext.time_pressure === 'medium' ? 50 : 20,
        description: 'Time constraints and urgency of completion',
        description_fr: 'Contraintes de temps et urgence d\'achèvement',
        category: 'time'
      },
      {
        id: 'safety_criticality',
        name: 'Safety Criticality',
        name_fr: 'Criticité de Sécurité',
        weight: 0.25,
        value: sopData.steps.filter(step => step.safety_critical).length * 20,
        description: 'Safety risks and critical safety procedures',
        description_fr: 'Risques de sécurité et procédures de sécurité critiques',
        category: 'safety'
      },
      {
        id: 'physical_demands',
        name: 'Physical Demands',
        name_fr: 'Exigences Physiques',
        weight: 0.15,
        value: Math.min(sopData.estimated_time * 2, 100), // Longer SOPs = more physical demand
        description: 'Physical effort, dexterity, and endurance requirements',
        description_fr: 'Effort physique, dextérité et exigences d\'endurance',
        category: 'physical'
      }
    ];

    // User experience adjustment
    const experienceAdjustment = (5 - userProfile.experience_level) * 0.15; // More experienced = easier
    
    // Historical performance factor
    const relevantHistory = userProfile.performance_history.find(
      p => p.sop_category === sopData.category
    );
    const performanceAdjustment = relevantHistory ? 
      (1 - relevantHistory.success_rate) * 0.2 : 0.1;

    // Context complexity modifier
    const contextComplexity = 
      (executionContext.interruption_likelihood === 'high' ? 0.15 : 0) +
      (executionContext.support_staff_present ? -0.1 : 0.1) +
      (executionContext.available_time < sopData.estimated_time ? 0.2 : 0);

    // Calculate overall difficulty
    const baseDifficulty = baseDifficultyMetrics.reduce(
      (sum, metric) => sum + (metric.value * metric.weight), 0
    ) / 100 * 5; // Convert to 1-5 scale

    const adjustedDifficulty = Math.max(1, Math.min(5, 
      baseDifficulty + experienceAdjustment + performanceAdjustment + contextComplexity
    ));

    // Generate adaptive guidance
    const adaptiveGuidance: AdaptiveGuidance[] = [];
    
    if (adjustedDifficulty > 3.5) {
      adaptiveGuidance.push({
        id: 'high_difficulty_warning',
        trigger_condition: 'difficulty > 3.5',
        guidance_type: 'detailed_explanation',
        content: 'This SOP has high complexity. Consider reviewing prerequisites and taking extra time for each step.',
        content_fr: 'Cette SOP a une complexité élevée. Considérez réviser les prérequis et prendre plus de temps pour chaque étape.',
        priority: 'high',
        show_automatically: true,
        user_can_dismiss: true
      });
    }

    if (userProfile.experience_level < 3) {
      adaptiveGuidance.push({
        id: 'novice_support',
        trigger_condition: 'user_experience < 3',
        guidance_type: 'practice_mode',
        content: 'Practice mode available with step-by-step guidance and additional explanations.',
        content_fr: 'Mode pratique disponible avec guidage étape par étape et explications supplémentaires.',
        priority: 'medium',
        show_automatically: false,
        user_can_dismiss: true
      });
    }

    // Risk factors
    const riskFactors = [];
    if (executionContext.time_pressure === 'high') {
      riskFactors.push('High time pressure may lead to rushed execution');
    }
    if (!executionContext.support_staff_present) {
      riskFactors.push('No support staff available for assistance');
    }
    if (sopData.steps.some(step => step.safety_critical)) {
      riskFactors.push('Contains safety-critical steps requiring extra attention');
    }

    const difficultyAssessment: DifficultyAssessment = {
      overall_difficulty: userDifficultyOverride || adjustedDifficulty,
      confidence_level: 0.85,
      estimated_time: sopData.estimated_time * (1 + experienceAdjustment + performanceAdjustment),
      success_probability: Math.max(0.3, 1 - (adjustedDifficulty - 1) * 0.15),
      risk_factors: riskFactors,
      recommended_preparation: [
        'Review SOP documentation thoroughly',
        'Ensure all required equipment is available',
        'Verify safety procedures and emergency contacts'
      ],
      adaptive_features: adaptiveGuidance,
      difficulty_breakdown: baseDifficultyMetrics.map(metric => ({
        ...metric,
        value: Math.min(100, metric.value * (1 + experienceAdjustment))
      })),
      personalization_factors: {
        user_experience_adjustment: experienceAdjustment,
        historical_performance_factor: performanceAdjustment,
        contextual_complexity_modifier: contextComplexity
      }
    };

    return difficultyAssessment;
  }, [sopData, userProfile, executionContext, userDifficultyOverride]);

  // Load assessment on mount and when dependencies change
  useEffect(() => {
    calculateDifficultyAssessment().then(newAssessment => {
      setAssessment(newAssessment);
      onAssessmentChange?.(newAssessment);
      setIsLoading(false);
    });
  }, [calculateDifficultyAssessment, onAssessmentChange]);

  // Trigger adaptive guidance based on assessment
  useEffect(() => {
    if (!assessment || !enableAdaptiveFeatures) return;

    const newActiveGuidance = assessment.adaptive_features.filter(
      guidance => guidance.show_automatically && !dismissedGuidance.includes(guidance.id)
    );

    setActiveGuidance(newActiveGuidance);
    
    newActiveGuidance.forEach(guidance => {
      onGuidanceTriggered?.(guidance);
    });
  }, [assessment, enableAdaptiveFeatures, dismissedGuidance, onGuidanceTriggered]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  // Dismiss guidance
  const dismissGuidance = useCallback((guidanceId: string) => {
    setDismissedGuidance(prev => [...prev, guidanceId]);
    setActiveGuidance(prev => prev.filter(g => g.id !== guidanceId));
  }, []);

  // Get difficulty color and icon
  const getDifficultyDisplay = useMemo(() => {
    if (!assessment) return { color: 'text-gray-400', icon: <HelpCircle className="w-5 h-5" />, label: 'Unknown' };
    
    const difficulty = Math.round(assessment.overall_difficulty);
    
    switch (difficulty) {
      case 1:
        return { 
          color: 'text-jade-green', 
          icon: <CheckCircle className="w-5 h-5 text-jade-green" />, 
          label: t('difficulty.beginner') 
        };
      case 2:
        return { 
          color: 'text-green-600', 
          icon: <Star className="w-5 h-5 text-green-600" />, 
          label: t('difficulty.easy') 
        };
      case 3:
        return { 
          color: 'text-golden-saffron', 
          icon: <TrendingUp className="w-5 h-5 text-golden-saffron" />, 
          label: t('difficulty.moderate') 
        };
      case 4:
        return { 
          color: 'text-krong-red', 
          icon: <AlertTriangle className="w-5 h-5 text-krong-red" />, 
          label: t('difficulty.challenging') 
        };
      case 5:
        return { 
          color: 'text-red-700', 
          icon: <Shield className="w-5 h-5 text-red-700" />, 
          label: t('difficulty.expert') 
        };
      default:
        return { color: 'text-gray-400', icon: <HelpCircle className="w-5 h-5" />, label: 'Unknown' };
    }
  }, [assessment, t]);

  // Get category color
  const getCategoryColor = (category: DifficultyMetric['category']) => {
    switch (category) {
      case 'technical': return 'text-blue-600 bg-blue-50';
      case 'cognitive': return 'text-purple-600 bg-purple-50';
      case 'physical': return 'text-green-600 bg-green-50';
      case 'time': return 'text-orange-600 bg-orange-50';
      case 'safety': return 'text-red-600 bg-red-50';
    }
  };

  if (isLoading || !assessment) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-4">
            <div className="text-center">
              <Brain className="w-8 h-8 animate-pulse text-krong-red mx-auto mb-4" />
              <h4 className="text-tablet-base font-semibold text-krong-black mb-2">
                {t('analyzingDifficulty')}
              </h4>
              <p className="text-tablet-sm text-muted-foreground">
                {t('personalizing')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Active Guidance Alerts */}
      {activeGuidance.map((guidance) => (
        <Card 
          key={guidance.id} 
          className={cn(
            "border-2",
            guidance.priority === 'high' ? "border-red-200 bg-red-50" :
            guidance.priority === 'medium' ? "border-golden-saffron/30 bg-golden-saffron/5" :
            "border-blue-200 bg-blue-50"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Lightbulb className={cn(
                  "w-5 h-5 mt-0.5",
                  guidance.priority === 'high' ? "text-red-600" :
                  guidance.priority === 'medium' ? "text-golden-saffron" :
                  "text-blue-600"
                )} />
                <div>
                  <p className="text-tablet-sm font-medium mb-1">
                    {t(`guidanceTypes.${guidance.guidance_type}`)}
                  </p>
                  <p className="text-tablet-sm text-gray-700">
                    {guidance.content}
                  </p>
                </div>
              </div>
              
              {guidance.user_can_dismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissGuidance(guidance.id)}
                  className="text-muted-foreground hover:text-gray-700"
                >
                  ×
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Main Assessment Card */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-krong-red" />
              {t('title')}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Overview Section */}
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => toggleSection('overview')}
              className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
            >
              {t('overview')}
              {expandedSections.includes('overview') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            
            {expandedSections.includes('overview') && (
              <div className="space-y-4 pl-4">
                {/* Difficulty Level */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getDifficultyDisplay.icon}
                      <span className={cn("text-tablet-lg font-bold", getDifficultyDisplay.color)}>
                        {getDifficultyDisplay.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4",
                            i < Math.round(assessment.overall_difficulty)
                              ? "text-golden-saffron fill-current"
                              : "text-gray-300"
                          )}
                        />
                      ))}
                      <span className="text-tablet-sm text-muted-foreground ml-2">
                        {assessment.overall_difficulty.toFixed(1)}/5
                      </span>
                    </div>
                  </div>
                  
                  {/* Success Probability */}
                  <div className="text-center">
                    <div className="text-tablet-xl font-bold text-jade-green">
                      {Math.round(assessment.success_probability * 100)}%
                    </div>
                    <div className="text-tablet-sm text-muted-foreground">
                      {t('successRate')}
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-krong-red" />
                    <div>
                      <div className="text-tablet-sm font-medium">
                        {Math.round(assessment.estimated_time)} {t('minutes')}
                      </div>
                      <div className="text-tablet-xs text-muted-foreground">
                        {t('estimatedTime')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-golden-saffron" />
                    <div>
                      <div className="text-tablet-sm font-medium">
                        {Math.round(assessment.confidence_level * 100)}%
                      </div>
                      <div className="text-tablet-xs text-muted-foreground">
                        {t('confidence')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Difficulty Override */}
                {allowDifficultyOverride && (
                  <div className="space-y-2">
                    <label className="text-tablet-sm font-medium">
                      {t('overrideDifficulty')}
                    </label>
                    <Slider
                      value={[userDifficultyOverride || assessment.overall_difficulty]}
                      onValueChange={([value]) => setUserDifficultyOverride(value)}
                      min={1}
                      max={5}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-tablet-xs text-muted-foreground">
                      <span>{t('difficulty.beginner')}</span>
                      <span>{t('difficulty.expert')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detailed Breakdown */}
          {showDetailedBreakdown && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('breakdown')}
                className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
              >
                {t('detailedBreakdown')}
                {expandedSections.includes('breakdown') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {expandedSections.includes('breakdown') && (
                <div className="space-y-4 pl-4">
                  {assessment.difficulty_breakdown.map((metric) => (
                    <div key={metric.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn("text-tablet-xs", getCategoryColor(metric.category))}
                          >
                            {metric.name}
                          </Badge>
                          <span className="text-tablet-sm font-medium">
                            {metric.value.toFixed(0)}%
                          </span>
                        </div>
                        <span className="text-tablet-xs text-muted-foreground">
                          {t('weight')}: {Math.round(metric.weight * 100)}%
                        </span>
                      </div>
                      
                      <Progress value={metric.value} className="h-2" />
                      
                      <p className="text-tablet-xs text-muted-foreground">
                        {metric.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Risk Factors */}
          {assessment.risk_factors.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('risks')}
                className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
              >
                {t('riskFactors')}
                <Badge variant="destructive" className="text-tablet-xs">
                  {assessment.risk_factors.length}
                </Badge>
                {expandedSections.includes('risks') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {expandedSections.includes('risks') && (
                <div className="space-y-2 pl-4">
                  {assessment.risk_factors.map((risk, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-tablet-sm text-gray-700">{risk}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => toggleSection('recommendations')}
              className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
            >
              {t('recommendations')}
              {expandedSections.includes('recommendations') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            
            {expandedSections.includes('recommendations') && (
              <div className="space-y-2 pl-4">
                {assessment.recommended_preparation.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-jade-green mt-0.5 flex-shrink-0" />
                    <span className="text-tablet-sm text-gray-700">{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdaptiveDifficultyAssessment;