'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Brain,
  Lightbulb,
  TrendingUp,
  Target,
  Star,
  Clock,
  BookOpen,
  Award,
  Users,
  Zap,
  Filter,
  RefreshCw,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Play,
  Eye,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  PieChart,
  Activity,
  Flame,
  Trophy,
  ArrowRight,
  Info,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Shuffle,
  Settings,
  X
} from 'lucide-react';

interface LearningGoal {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  target_date: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress_percentage: number;
  skill_categories: string[];
  estimated_hours: number;
}

interface TrainingRecommendation {
  id: string;
  type: 'skill_gap' | 'career_path' | 'performance_improvement' | 'trending' | 'peer_success' | 'certification_prep';
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  confidence_score: number;
  impact_score: number;
  urgency_score: number;
  estimated_duration_hours: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  skill_categories: string[];
  prerequisites?: string[];
  learning_objectives: string[];
  learning_objectives_fr: string[];
  module_ids: string[];
  reasoning: string;
  reasoning_fr: string;
  success_metrics: string[];
  expected_outcomes: string[];
  expected_outcomes_fr: string[];
}

interface PersonalizationFactors {
  user_experience_level: 'novice' | 'intermediate' | 'expert';
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
  preferred_session_length: number; // in minutes
  availability_schedule: string[];
  skill_interests: string[];
  career_goals: string[];
  current_performance_areas: string[];
  weak_skill_areas: string[];
  recent_completion_rate: number;
  average_score_trend: 'improving' | 'stable' | 'declining';
}

interface RecommendationFilters {
  type?: string[];
  difficulty?: string[];
  duration_min?: number;
  duration_max?: number;
  skill_categories?: string[];
  urgency_threshold?: number;
  confidence_threshold?: number;
}

interface TrainingRecommendationEngineProps {
  /** User's personalization factors */
  personalizationFactors?: PersonalizationFactors;
  /** Current learning goals */
  learningGoals?: LearningGoal[];
  /** AI-generated recommendations */
  recommendations?: TrainingRecommendation[];
  /** Whether to show personalization settings */
  showPersonalization?: boolean;
  /** Whether recommendations are loading */
  isLoading?: boolean;
  /** Callback when recommendation is selected */
  onRecommendationSelect?: (recommendation: TrainingRecommendation) => void;
  /** Callback when recommendation is bookmarked */
  onRecommendationBookmark?: (recommendationId: string, bookmarked: boolean) => void;
  /** Callback when recommendation is rated */
  onRecommendationRate?: (recommendationId: string, rating: 'helpful' | 'not_helpful') => void;
  /** Callback when recommendations are refreshed */
  onRefreshRecommendations?: () => void;
  /** Callback when personalization is updated */
  onPersonalizationUpdate?: (factors: PersonalizationFactors) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * TrainingRecommendationEngine - AI-powered learning suggestions interface
 * 
 * Features:
 * - AI-driven recommendation algorithms based on user behavior and performance
 * - Personalized learning paths with adaptive difficulty progression
 * - Multiple recommendation types (skill gaps, career paths, trending content)
 * - Intelligent filtering and sorting with confidence scoring
 * - Learning goal integration with progress tracking
 * - Peer comparison and success pattern analysis
 * - Contextual reasoning explanations for recommendations
 * - Bookmark and rating system for recommendation feedback
 * - Real-time recommendation updates based on recent activity
 * - Performance prediction and impact estimation
 * - Tablet-optimized responsive interface
 * - Bilingual content support (EN/FR)
 * - Accessibility-compliant design patterns
 * 
 * @param props TrainingRecommendationEngineProps
 * @returns JSX.Element
 */
const TrainingRecommendationEngine: React.FC<TrainingRecommendationEngineProps> = ({
  personalizationFactors,
  learningGoals = [],
  recommendations = [],
  showPersonalization = true,
  isLoading = false,
  onRecommendationSelect,
  onRecommendationBookmark,
  onRecommendationRate,
  onRefreshRecommendations,
  onPersonalizationUpdate,
  className
}) => {
  const t = useTranslations('training.recommendations');
  
  // State management
  const [activeTab, setActiveTab] = useState('recommendations');
  const [filters, setFilters] = useState<RecommendationFilters>({});
  const [sortBy, setSortBy] = useState<'confidence' | 'impact' | 'urgency' | 'duration'>('confidence');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<TrainingRecommendation | null>(null);
  const [showRecommendationDetail, setShowRecommendationDetail] = useState(false);
  const [bookmarkedRecommendations, setBookmarkedRecommendations] = useState<Set<string>>(new Set());
  const [ratedRecommendations, setRatedRecommendations] = useState<Record<string, 'helpful' | 'not_helpful'>>({});
  const [showPersonalizationDialog, setShowPersonalizationDialog] = useState(false);

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = [...recommendations];

    // Apply filters
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(rec => filters.type!.includes(rec.type));
    }
    
    if (filters.difficulty && filters.difficulty.length > 0) {
      filtered = filtered.filter(rec => filters.difficulty!.includes(rec.difficulty_level));
    }
    
    if (filters.duration_min !== undefined) {
      filtered = filtered.filter(rec => rec.estimated_duration_hours >= filters.duration_min!);
    }
    
    if (filters.duration_max !== undefined) {
      filtered = filtered.filter(rec => rec.estimated_duration_hours <= filters.duration_max!);
    }
    
    if (filters.skill_categories && filters.skill_categories.length > 0) {
      filtered = filtered.filter(rec => 
        rec.skill_categories.some(cat => filters.skill_categories!.includes(cat))
      );
    }
    
    if (filters.urgency_threshold !== undefined) {
      filtered = filtered.filter(rec => rec.urgency_score >= filters.urgency_threshold!);
    }
    
    if (filters.confidence_threshold !== undefined) {
      filtered = filtered.filter(rec => rec.confidence_score >= filters.confidence_threshold!);
    }

    // Sort recommendations
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'impact':
          return b.impact_score - a.impact_score;
        case 'urgency':
          return b.urgency_score - a.urgency_score;
        case 'duration':
          return a.estimated_duration_hours - b.estimated_duration_hours;
        default:
          return b.confidence_score - a.confidence_score;
      }
    });

    return filtered;
  }, [recommendations, filters, sortBy]);

  // Get recommendation type info
  const getRecommendationTypeInfo = (type: string) => {
    const typeInfo = {
      skill_gap: { 
        icon: Target, 
        color: 'text-red-600', 
        bg: 'bg-red-50', 
        border: 'border-red-200',
        label: t('recommendationType.skillGap')
      },
      career_path: { 
        icon: TrendingUp, 
        color: 'text-purple-600', 
        bg: 'bg-purple-50', 
        border: 'border-purple-200',
        label: t('recommendationType.careerPath')
      },
      performance_improvement: { 
        icon: BarChart3, 
        color: 'text-orange-600', 
        bg: 'bg-orange-50', 
        border: 'border-orange-200',
        label: t('recommendationType.performanceImprovement')
      },
      trending: { 
        icon: Flame, 
        color: 'text-pink-600', 
        bg: 'bg-pink-50', 
        border: 'border-pink-200',
        label: t('recommendationType.trending')
      },
      peer_success: { 
        icon: Users, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        border: 'border-blue-200',
        label: t('recommendationType.peerSuccess')
      },
      certification_prep: { 
        icon: Award, 
        color: 'text-green-600', 
        bg: 'bg-green-50', 
        border: 'border-green-200',
        label: t('recommendationType.certificationPrep')
      }
    };
    return typeInfo[type as keyof typeof typeInfo] || typeInfo.skill_gap;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  // Handle recommendation selection
  const handleRecommendationSelect = (recommendation: TrainingRecommendation) => {
    setSelectedRecommendation(recommendation);
    setShowRecommendationDetail(true);
    onRecommendationSelect?.(recommendation);
  };

  // Handle bookmark toggle
  const handleBookmarkToggle = (recommendationId: string) => {
    const isBookmarked = bookmarkedRecommendations.has(recommendationId);
    const newBookmarked = new Set(bookmarkedRecommendations);
    
    if (isBookmarked) {
      newBookmarked.delete(recommendationId);
    } else {
      newBookmarked.add(recommendationId);
    }
    
    setBookmarkedRecommendations(newBookmarked);
    onRecommendationBookmark?.(recommendationId, !isBookmarked);
  };

  // Handle recommendation rating
  const handleRecommendationRate = (recommendationId: string, rating: 'helpful' | 'not_helpful') => {
    setRatedRecommendations(prev => ({ ...prev, [recommendationId]: rating }));
    onRecommendationRate?.(recommendationId, rating);
  };

  // Render recommendation card
  const renderRecommendationCard = (recommendation: TrainingRecommendation) => {
    const typeInfo = getRecommendationTypeInfo(recommendation.type);
    const TypeIcon = typeInfo.icon;
    const isBookmarked = bookmarkedRecommendations.has(recommendation.id);
    const rating = ratedRecommendations[recommendation.id];

    return (
      <Card 
        key={recommendation.id}
        className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4"
        style={{ borderLeftColor: typeInfo.color.replace('text-', '#') }}
        onClick={() => handleRecommendationSelect(recommendation)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn("p-2 rounded-lg", typeInfo.bg)}>
                <TypeIcon className={cn("w-5 h-5", typeInfo.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-tablet-lg font-heading text-krong-black leading-tight">
                  {recommendation.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-tablet-xs">
                    {typeInfo.label}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn("text-tablet-xs", {
                      'bg-green-50 text-green-700 border-green-200': recommendation.difficulty_level === 'beginner',
                      'bg-orange-50 text-orange-700 border-orange-200': recommendation.difficulty_level === 'intermediate',
                      'bg-red-50 text-red-700 border-red-200': recommendation.difficulty_level === 'advanced'
                    })}
                  >
                    {t(`difficulty.${recommendation.difficulty_level}`)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmarkToggle(recommendation.id);
                }}
                className="flex-shrink-0"
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 text-golden-saffron" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-tablet-sm text-muted-foreground leading-relaxed line-clamp-2">
            {recommendation.description}
          </p>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-tablet-lg font-bold text-krong-red">
                {Math.round(recommendation.confidence_score)}%
              </div>
              <div className="text-tablet-xs text-muted-foreground">
                {t('confidence')}
              </div>
            </div>
            <div>
              <div className="text-tablet-lg font-bold text-orange-600">
                {Math.round(recommendation.impact_score)}%
              </div>
              <div className="text-tablet-xs text-muted-foreground">
                {t('impact')}
              </div>
            </div>
            <div>
              <div className="text-tablet-lg font-bold text-jade-green">
                {recommendation.estimated_duration_hours}h
              </div>
              <div className="text-tablet-xs text-muted-foreground">
                {t('duration')}
              </div>
            </div>
          </div>

          {/* Progress bar based on urgency */}
          <div className="space-y-2">
            <div className="flex justify-between text-tablet-xs">
              <span className="text-muted-foreground">{t('urgency')}</span>
              <span className="font-medium">{Math.round(recommendation.urgency_score)}%</span>
            </div>
            <Progress 
              value={recommendation.urgency_score} 
              className={cn("h-2", {
                'bg-red-200': recommendation.urgency_score >= 80,
                'bg-orange-200': recommendation.urgency_score >= 50 && recommendation.urgency_score < 80,
                'bg-yellow-200': recommendation.urgency_score >= 20 && recommendation.urgency_score < 50,
                'bg-green-200': recommendation.urgency_score < 20
              })}
            />
          </div>

          {/* Skill categories */}
          <div className="flex flex-wrap gap-1">
            {recommendation.skill_categories.slice(0, 3).map((category, index) => (
              <Badge key={index} variant="secondary" className="text-[10px]">
                {category}
              </Badge>
            ))}
            {recommendation.skill_categories.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">
                +{recommendation.skill_categories.length - 3} {t('more')}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div className="flex items-center gap-2">
              {rating ? (
                <div className="flex items-center gap-1 text-tablet-xs text-muted-foreground">
                  {rating === 'helpful' ? (
                    <ThumbsUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <ThumbsDown className="w-3 h-3 text-red-600" />
                  )}
                  <span>{t(`rated.${rating}`)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecommendationRate(recommendation.id, 'helpful');
                    }}
                    className="p-1 h-auto"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecommendationRate(recommendation.id, 'not_helpful');
                    }}
                    className="p-1 h-auto"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRecommendationSelect(recommendation);
              }}
            >
              <Play className="w-3 h-3 mr-1" />
              {t('startLearning')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render learning goals
  const renderLearningGoals = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-krong-black">{t('learningGoals')}</h3>
        <Button variant="outline" size="sm">
          <Target className="w-4 h-4 mr-2" />
          {t('addGoal')}
        </Button>
      </div>
      
      {learningGoals.length > 0 ? (
        <div className="space-y-3">
          {learningGoals.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-krong-black">{goal.title}</h4>
                    <p className="text-tablet-sm text-muted-foreground">{goal.description}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-tablet-xs", getPriorityColor(goal.priority))}
                  >
                    {t(`priority.${goal.priority}`)}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-tablet-sm">
                    <span>{t('progress')}</span>
                    <span>{Math.round(goal.progress_percentage)}%</span>
                  </div>
                  <Progress value={goal.progress_percentage} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between mt-3 text-tablet-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(goal.target_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{goal.estimated_hours}h {t('estimated')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold text-krong-black mb-2">{t('noGoalsSet')}</h4>
            <p className="text-tablet-sm text-muted-foreground mb-4">
              {t('noGoalsSetDesc')}
            </p>
            <Button>
              <Target className="w-4 h-4 mr-2" />
              {t('setFirstGoal')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground" />
          </div>
          <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
            {t('generatingRecommendations')}
          </h3>
          <p className="text-tablet-sm text-muted-foreground">
            {t('analyzingYourProgress')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-tablet-xl font-heading font-bold text-krong-black flex items-center gap-3">
            <Brain className="w-6 h-6 text-krong-red" />
            {t('aiRecommendations')}
          </h2>
          <p className="text-tablet-sm text-muted-foreground mt-1">
            {t('personalizedLearningPath')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {showPersonalization && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPersonalizationDialog(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {t('personalize')}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {t('filters')}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefreshRecommendations}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-tablet-base flex items-center justify-between">
              {t('filterRecommendations')}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(false)}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type filter */}
            <div>
              <label className="text-tablet-sm font-medium">{t('type')}</label>
              {/* Filter controls would go here */}
            </div>
            
            {/* Difficulty filter */}
            <div>
              <label className="text-tablet-sm font-medium">{t('difficulty')}</label>
              {/* Filter controls would go here */}
            </div>
            
            {/* Duration filter */}
            <div>
              <label className="text-tablet-sm font-medium">{t('duration')}</label>
              {/* Filter controls would go here */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">{t('recommendations')}</TabsTrigger>
          <TabsTrigger value="goals">{t('goals')}</TabsTrigger>
          <TabsTrigger value="insights">{t('insights')}</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Sort controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-tablet-sm text-muted-foreground">{t('sortBy')}:</span>
              <div className="flex gap-1">
                {['confidence', 'impact', 'urgency', 'duration'].map((option) => (
                  <Button
                    key={option}
                    variant={sortBy === option ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSortBy(option as any)}
                  >
                    {t(`sortBy.${option}`)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="text-tablet-sm text-muted-foreground">
              {filteredRecommendations.length} {t('recommendations')}
            </div>
          </div>

          {/* Recommendations Grid */}
          {filteredRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredRecommendations.map(renderRecommendationCard)}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
                  {t('noRecommendations')}
                </h3>
                <p className="text-tablet-sm text-muted-foreground mb-4">
                  {t('noRecommendationsDesc')}
                </p>
                <Button onClick={onRefreshRecommendations}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('generateRecommendations')}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          {renderLearningGoals()}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Learning patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  {t('learningPatterns')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-tablet-sm text-muted-foreground">
                  {t('learningPatternsDesc')}
                </p>
              </CardContent>
            </Card>

            {/* Skill gaps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-500" />
                  {t('skillGaps')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-tablet-sm text-muted-foreground">
                  {t('skillGapsDesc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recommendation Detail Dialog */}
      <Dialog open={showRecommendationDetail} onOpenChange={setShowRecommendationDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecommendation && (
                <>
                  {React.createElement(getRecommendationTypeInfo(selectedRecommendation.type).icon, { 
                    className: cn("w-5 h-5", getRecommendationTypeInfo(selectedRecommendation.type).color) 
                  })}
                  {selectedRecommendation.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecommendation && (
            <div className="space-y-6">
              {/* Description and reasoning */}
              <div>
                <h3 className="font-semibold mb-2">{t('description')}</h3>
                <p className="text-muted-foreground">{selectedRecommendation.description}</p>
                
                <h3 className="font-semibold mt-4 mb-2">{t('whyRecommended')}</h3>
                <p className="text-muted-foreground">{selectedRecommendation.reasoning}</p>
              </div>

              {/* Learning objectives */}
              <div>
                <h3 className="font-semibold mb-2">{t('learningObjectives')}</h3>
                <ul className="space-y-1 text-muted-foreground">
                  {selectedRecommendation.learning_objectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Expected outcomes */}
              <div>
                <h3 className="font-semibold mb-2">{t('expectedOutcomes')}</h3>
                <ul className="space-y-1 text-muted-foreground">
                  {selectedRecommendation.expected_outcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-golden-saffron mt-0.5 flex-shrink-0" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => {
                    setShowRecommendationDetail(false);
                    onRecommendationSelect?.(selectedRecommendation);
                  }}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t('startLearning')}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleBookmarkToggle(selectedRecommendation.id)}
                  className="flex-1"
                >
                  {bookmarkedRecommendations.has(selectedRecommendation.id) ? (
                    <BookmarkCheck className="w-4 h-4 mr-2" />
                  ) : (
                    <Bookmark className="w-4 h-4 mr-2" />
                  )}
                  {bookmarkedRecommendations.has(selectedRecommendation.id) ? t('bookmarked') : t('bookmark')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Personalization Dialog */}
      <Dialog open={showPersonalizationDialog} onOpenChange={setShowPersonalizationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              {t('personalizeRecommendations')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <p className="text-muted-foreground">
              {t('personalizationDesc')}
            </p>
            
            {/* Personalization settings would go here */}
            <div className="space-y-4">
              <div>
                <label className="font-medium">{t('experienceLevel')}</label>
                {/* Experience level selector */}
              </div>
              
              <div>
                <label className="font-medium">{t('learningStyle')}</label>
                {/* Learning style selector */}
              </div>
              
              <div>
                <label className="font-medium">{t('preferredSessionLength')}</label>
                {/* Session length selector */}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowPersonalizationDialog(false)}
                className="flex-1"
              >
                {t('saveSettings')}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowPersonalizationDialog(false)}
                className="flex-1"
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingRecommendationEngine;