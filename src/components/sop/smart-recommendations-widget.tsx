'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Brain, 
  Clock, 
  Users, 
  TrendingUp,
  Star,
  AlertTriangle,
  ChefHat,
  Utensils,
  Coffee,
  Thermometer,
  Timer,
  BookOpen,
  Target,
  Zap,
  ArrowRight,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle
} from 'lucide-react';

interface ContextualFactor {
  id: string;
  type: 'time' | 'weather' | 'occupancy' | 'staff_level' | 'menu_demand' | 'equipment_status' | 'inventory_level' | 'past_performance';
  value: string | number;
  weight: number;
  confidence: number;
}

interface SOPRecommendation {
  id: string;
  sop_id: string;
  title: string;
  title_fr: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  relevance_score: number;
  confidence: number;
  reasoning: string;
  reasoning_fr: string;
  estimated_time: number; // minutes
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  contextual_factors: ContextualFactor[];
  predicted_outcome: {
    success_rate: number;
    time_savings: number;
    quality_improvement: number;
    efficiency_gain: number;
  };
  similar_situations: Array<{
    date: string;
    outcome: 'success' | 'partial' | 'failure';
    notes: string;
  }>;
  prerequisites?: string[];
  related_sops?: string[];
}

interface SmartRecommendationsWidgetProps {
  /** Current restaurant context */
  restaurantContext: {
    location_id: string;
    current_time: string;
    occupancy_level: number; // 0-100
    staff_count: number;
    weather_conditions?: string;
    menu_rush_items?: string[];
    equipment_alerts?: string[];
    inventory_low?: string[];
  };
  /** Current user role and experience */
  userProfile: {
    id: string;
    role: string;
    experience_level: 1 | 2 | 3 | 4 | 5;
    specializations: string[];
    recent_sops: string[];
    performance_score: number;
  };
  /** Current SOP being viewed/executed */
  currentSOP?: {
    id: string;
    category: string;
    difficulty: number;
    tags: string[];
  };
  /** Maximum number of recommendations to show */
  maxRecommendations?: number;
  /** Enable auto-refresh */
  autoRefresh?: boolean;
  /** Refresh interval in seconds */
  refreshInterval?: number;
  /** Show detailed explanations */
  showReasoning?: boolean;
  /** Enable quick actions */
  enableQuickActions?: boolean;
  /** Callback when recommendation is selected */
  onRecommendationSelect?: (recommendation: SOPRecommendation) => void;
  /** Callback when recommendation is dismissed */
  onRecommendationDismiss?: (recommendationId: string, reason: string) => void;
  /** Callback when feedback is provided */
  onFeedback?: (recommendationId: string, rating: number, comment?: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SmartRecommendationsWidget - AI-powered contextual SOP recommendations
 * 
 * Features:
 * - Real-time context analysis (time, occupancy, staff, weather, equipment)
 * - Machine learning-powered relevance scoring
 * - Predictive outcome modeling based on historical data
 * - User experience and role-based personalization
 * - Intelligent reasoning explanations
 * - Quick action buttons for immediate SOP execution
 * - Feedback loop for continuous improvement
 * - Bilingual recommendation descriptions
 * - Restaurant-specific optimization patterns
 * 
 * @param props SmartRecommendationsWidgetProps
 * @returns JSX.Element
 */
const SmartRecommendationsWidget: React.FC<SmartRecommendationsWidgetProps> = ({
  restaurantContext,
  userProfile,
  currentSOP,
  maxRecommendations = 5,
  autoRefresh = true,
  refreshInterval = 300, // 5 minutes
  showReasoning = false,
  enableQuickActions = true,
  onRecommendationSelect,
  onRecommendationDismiss,
  onFeedback,
  className
}) => {
  const t = useTranslations('sop.smartRecommendations');
  
  const [recommendations, setRecommendations] = useState<SOPRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<string[]>([]);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Generate contextual recommendations using AI analysis
  const generateRecommendations = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Simulate AI recommendation engine with contextual analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockRecommendations: SOPRecommendation[] = [
        {
          id: 'rec-1',
          sop_id: 'sop-lunch-prep',
          title: 'Lunch Rush Preparation Protocol',
          title_fr: 'Protocole de Préparation Rush Déjeuner',
          category: 'Kitchen Operations',
          priority: 'high',
          relevance_score: 0.92,
          confidence: 0.88,
          reasoning: 'High occupancy detected (85%) with lunch rush approaching. Similar situations showed 23% faster service with this protocol.',
          reasoning_fr: 'Occupation élevée détectée (85%) avec rush déjeuner qui approche. Des situations similaires ont montré 23% de service plus rapide avec ce protocole.',
          estimated_time: 15,
          difficulty_level: 3,
          tags: ['lunch', 'high-traffic', 'preparation'],
          contextual_factors: [
            { id: 'time', type: 'time', value: '11:30 AM', weight: 0.8, confidence: 1.0 },
            { id: 'occupancy', type: 'occupancy', value: 85, weight: 0.9, confidence: 0.95 },
            { id: 'staff', type: 'staff_level', value: restaurantContext.staff_count, weight: 0.7, confidence: 1.0 }
          ],
          predicted_outcome: {
            success_rate: 0.87,
            time_savings: 8,
            quality_improvement: 0.15,
            efficiency_gain: 0.23
          },
          similar_situations: [
            { date: '2025-01-20', outcome: 'success', notes: 'Reduced wait time by 25%' },
            { date: '2025-01-15', outcome: 'success', notes: 'Smooth lunch service' }
          ],
          prerequisites: ['Kitchen staff availability', 'Ingredients stocked'],
          related_sops: ['sop-kitchen-cleaning', 'sop-order-management']
        },
        {
          id: 'rec-2',
          sop_id: 'sop-equipment-check',
          title: 'Equipment Status Verification',
          title_fr: 'Vérification du Statut des Équipements',
          category: 'Maintenance',
          priority: 'critical',
          relevance_score: 0.95,
          confidence: 0.92,
          reasoning: 'Equipment alerts detected. Proactive maintenance prevents service disruptions during peak hours.',
          reasoning_fr: 'Alertes d\'équipement détectées. La maintenance proactive prévient les interruptions de service pendant les heures de pointe.',
          estimated_time: 10,
          difficulty_level: 2,
          tags: ['maintenance', 'equipment', 'preventive'],
          contextual_factors: [
            { id: 'equipment', type: 'equipment_status', value: 'alerts', weight: 1.0, confidence: 1.0 },
            { id: 'time', type: 'time', value: '11:30 AM', weight: 0.6, confidence: 1.0 }
          ],
          predicted_outcome: {
            success_rate: 0.94,
            time_savings: 30,
            quality_improvement: 0.08,
            efficiency_gain: 0.35
          },
          similar_situations: [
            { date: '2025-01-18', outcome: 'success', notes: 'Prevented fryer breakdown' }
          ]
        },
        {
          id: 'rec-3',
          sop_id: 'sop-inventory-priority',
          title: 'Priority Inventory Restocking',
          title_fr: 'Réapprovisionnement d\'Inventaire Prioritaire',
          category: 'Inventory',
          priority: 'medium',
          relevance_score: 0.78,
          confidence: 0.82,
          reasoning: 'Low inventory detected for popular menu items. Restocking now prevents stockouts during lunch rush.',
          reasoning_fr: 'Inventaire faible détecté pour les articles de menu populaires. Le réapprovisionnement maintenant évite les ruptures de stock pendant le rush déjeuner.',
          estimated_time: 20,
          difficulty_level: 2,
          tags: ['inventory', 'restocking', 'menu-items'],
          contextual_factors: [
            { id: 'inventory', type: 'inventory_level', value: 'low', weight: 0.85, confidence: 0.9 },
            { id: 'demand', type: 'menu_demand', value: 'high', weight: 0.7, confidence: 0.8 }
          ],
          predicted_outcome: {
            success_rate: 0.79,
            time_savings: 5,
            quality_improvement: 0.12,
            efficiency_gain: 0.18
          },
          similar_situations: [
            { date: '2025-01-19', outcome: 'success', notes: 'Avoided menu item unavailability' }
          ]
        }
      ];

      // Filter out dismissed recommendations
      const filteredRecommendations = mockRecommendations
        .filter(rec => !dismissedRecommendations.includes(rec.id))
        .slice(0, maxRecommendations);

      setRecommendations(filteredRecommendations);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantContext, userProfile, currentSOP, maxRecommendations, dismissedRecommendations]);

  // Auto-refresh recommendations
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(generateRecommendations, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, generateRecommendations]);

  // Initial load
  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  // Toggle reasoning expansion
  const toggleReasoning = useCallback((recommendationId: string) => {
    setExpandedReasoning(prev => 
      prev.includes(recommendationId)
        ? prev.filter(id => id !== recommendationId)
        : [...prev, recommendationId]
    );
  }, []);

  // Handle recommendation dismissal
  const handleDismiss = useCallback((recommendationId: string, reason: string = 'not_relevant') => {
    setDismissedRecommendations(prev => [...prev, recommendationId]);
    onRecommendationDismiss?.(recommendationId, reason);
  }, [onRecommendationDismiss]);

  // Get priority color
  const getPriorityColor = (priority: SOPRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-krong-red bg-krong-red/5 border-krong-red/20';
      case 'medium': return 'text-golden-saffron bg-golden-saffron/5 border-golden-saffron/20';
      case 'low': return 'text-jade-green bg-jade-green/5 border-jade-green/20';
    }
  };

  // Get difficulty level stars
  const getDifficultyStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-3 h-3",
          i < level ? "text-golden-saffron fill-current" : "text-gray-300"
        )}
      />
    ));
  };

  // Context insights
  const contextInsights = useMemo(() => {
    const insights = [];
    
    if (restaurantContext.occupancy_level > 80) {
      insights.push({
        icon: <Users className="w-4 h-4 text-krong-red" />,
        text: t('insights.highOccupancy', { level: restaurantContext.occupancy_level })
      });
    }
    
    if (restaurantContext.equipment_alerts?.length > 0) {
      insights.push({
        icon: <AlertTriangle className="w-4 h-4 text-golden-saffron" />,
        text: t('insights.equipmentAlerts', { count: restaurantContext.equipment_alerts.length })
      });
    }
    
    if (restaurantContext.inventory_low?.length > 0) {
      insights.push({
        icon: <TrendingUp className="w-4 h-4 text-red-600" />,
        text: t('insights.lowInventory', { count: restaurantContext.inventory_low.length })
      });
    }
    
    return insights;
  }, [restaurantContext, t]);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Brain className="w-4 h-4 mr-2" />
        {t('showRecommendations')}
      </Button>
    );
  }

  return (
    <Card className={cn("border-2 shadow-lg", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
            <Brain className="w-6 h-6 text-krong-red" />
            {t('title')}
            {recommendations.length > 0 && (
              <Badge variant="secondary" className="text-tablet-sm ml-2">
                {recommendations.length}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={generateRecommendations}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            
            {/* Settings */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            {/* Visibility Toggle */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsVisible(false)}
            >
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Context Insights */}
        {contextInsights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {contextInsights.map((insight, index) => (
              <div key={index} className="flex items-center gap-1 text-tablet-xs text-muted-foreground">
                {insight.icon}
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Last Updated */}
        {lastUpdated && (
          <p className="text-tablet-xs text-muted-foreground mt-1">
            {t('lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Loading State */}
        {isLoading && recommendations.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Brain className="w-8 h-8 text-krong-red animate-pulse mx-auto mb-2" />
              <p className="text-tablet-base font-medium text-krong-black">
                {t('analyzingContext')}
              </p>
              <p className="text-tablet-sm text-muted-foreground">
                {t('generatingRecommendations')}
              </p>
            </div>
          </div>
        )}

        {/* Recommendations List */}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            {recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-tablet-xs border", getPriorityColor(recommendation.priority))}
                      >
                        {t(`priority.${recommendation.priority}`)}
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        {getDifficultyStars(recommendation.difficulty_level)}
                      </div>
                      
                      <Badge variant="secondary" className="text-tablet-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {recommendation.estimated_time}m
                      </Badge>
                    </div>
                    
                    <h4 className="text-tablet-base font-semibold text-krong-black mb-1">
                      {recommendation.title}
                    </h4>
                    
                    <p className="text-tablet-sm text-muted-foreground">
                      {recommendation.category}
                    </p>
                  </div>
                  
                  {/* Confidence Score */}
                  <div className="text-center ml-4">
                    <div className="text-tablet-lg font-bold text-krong-red">
                      {Math.round(recommendation.relevance_score * 100)}%
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {t('relevance')}
                    </div>
                  </div>
                </div>

                {/* Predicted Outcomes */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 text-tablet-sm">
                    <Target className="w-4 h-4 text-jade-green" />
                    <span>
                      {t('successRate')}: {Math.round(recommendation.predicted_outcome.success_rate * 100)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-tablet-sm">
                    <Zap className="w-4 h-4 text-golden-saffron" />
                    <span>
                      {t('timeSavings')}: {recommendation.predicted_outcome.time_savings}m
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {recommendation.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-tablet-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Reasoning */}
                {showReasoning && (
                  <div className="mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReasoning(recommendation.id)}
                      className="p-0 h-auto text-tablet-sm font-medium text-krong-red hover:text-krong-red/80"
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      {t('whyRecommended')}
                      {expandedReasoning.includes(recommendation.id) ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </Button>
                    
                    {expandedReasoning.includes(recommendation.id) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded border">
                        <p className="text-tablet-sm text-gray-700">
                          {recommendation.reasoning}
                        </p>
                        
                        {/* Historical Performance */}
                        {recommendation.similar_situations.length > 0 && (
                          <div className="mt-3">
                            <p className="text-tablet-xs font-medium text-gray-600 mb-2">
                              {t('historicalPerformance')}:
                            </p>
                            <div className="space-y-1">
                              {recommendation.similar_situations.map((situation, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-tablet-xs">
                                  <CheckCircle className="w-3 h-3 text-jade-green" />
                                  <span className="text-gray-600">
                                    {new Date(situation.date).toLocaleDateString()}: {situation.notes}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {enableQuickActions && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => onRecommendationSelect?.(recommendation)}
                        className="bg-krong-red hover:bg-krong-red/90"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        {t('startSOP')}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* View details */}}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {t('viewDetails')}
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(recommendation.id)}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && recommendations.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-tablet-base font-medium text-gray-600 mb-2">
              {t('noRecommendations')}
            </h4>
            <p className="text-tablet-sm text-muted-foreground">
              {t('noRecommendationsDescription')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartRecommendationsWidget;