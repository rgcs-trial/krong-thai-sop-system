/**
 * Training Feedback and Rating System Component
 * Comprehensive feedback collection and rating system for training quality
 * Features multi-dimensional ratings, qualitative feedback, instructor evaluation,
 * content assessment, and improvement recommendations
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Star,
  StarHalf,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  Edit,
  Trash2,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Award,
  Target,
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  Calendar,
  MapPin,
  Video,
  Heart,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Flag,
  Share2,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Info,
  HelpCircle,
  Smile,
  Meh,
  Frown,
  Activity,
  Zap,
  Shield,
  Archive,
  Bookmark,
  Tag,
  ExternalLink
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarContent, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

// Feedback and rating interfaces
interface TrainingFeedback {
  id: string;
  trainingSessionId: string;
  moduleId: string;
  moduleName: string;
  instructorId: string;
  instructorName: string;
  userId: string;
  userName: string;
  userRole: string;
  
  // Multi-dimensional ratings (1-5 scale)
  ratings: {
    overall: number;
    contentQuality: number;
    instructorEffectiveness: number;
    materialClarity: number;
    practicalRelevance: number;
    engagementLevel: number;
    paceAppropriateness: number;
    facilitiesQuality: number;
    technologyUsage: number;
    learningObjectivesMet: number;
  };
  
  // Qualitative feedback
  feedback: {
    whatWorkedWell: string;
    whatWorkedWell_fr: string;
    areasForImprovement: string;
    areasForImprovement_fr: string;
    additionalComments: string;
    additionalComments_fr: string;
    wouldRecommend: boolean;
    recommendationReason: string;
    recommendationReason_fr: string;
  };
  
  // Instructor-specific feedback
  instructorFeedback: {
    knowledgeLevel: number;
    communicationSkills: number;
    preparedness: number;
    responsiveness: number;
    encouragement: number;
    timeManagement: number;
    specificComments: string;
    specificComments_fr: string;
  };
  
  // Content assessment
  contentAssessment: {
    relevanceToJob: number;
    difficultyLevel: 'too_easy' | 'just_right' | 'too_difficult';
    contentAmount: 'too_little' | 'just_right' | 'too_much';
    updateNeeded: boolean;
    missingTopics: string[];
    redundantContent: string[];
    suggestedImprovements: string;
    suggestedImprovements_fr: string;
  };
  
  // Learning outcomes
  learningOutcomes: {
    skillsGained: string[];
    confidenceIncrease: number;
    immediateApplicability: number;
    knowledgeRetention: number;
    behaviorChangeIntention: number;
    performanceImprovement: number;
    followUpNeeds: string[];
  };
  
  // Session logistics
  sessionLogistics: {
    duration: 'too_short' | 'just_right' | 'too_long';
    timing: 'too_early' | 'just_right' | 'too_late';
    location: number; // 1-5 rating
    technology: number; // 1-5 rating
    materials: number; // 1-5 rating
    support: number; // 1-5 rating
  };
  
  // Metadata
  submittedAt: string;
  isAnonymous: boolean;
  status: 'pending' | 'reviewed' | 'acknowledged';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  helpfulnessVotes: number;
  flagged: boolean;
  flagReason?: string;
  
  // Response tracking
  instructorResponse?: string;
  instructorResponse_fr?: string;
  instructorResponseDate?: string;
  adminNotes?: string;
  actionItems?: string[];
  followUpRequired: boolean;
}

interface FeedbackSummary {
  moduleId: string;
  moduleName: string;
  totalFeedbacks: number;
  averageRatings: TrainingFeedback['ratings'];
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  recommendationRate: number;
  commonThemes: {
    strengths: string[];
    improvements: string[];
  };
  actionableInsights: string[];
  trendsOverTime: {
    period: string;
    rating: number;
    count: number;
  }[];
}

interface InstructorFeedbackSummary {
  instructorId: string;
  instructorName: string;
  totalSessions: number;
  averageRating: number;
  totalFeedbacks: number;
  strengths: string[];
  improvementAreas: string[];
  studentSatisfaction: number;
  expertiseRating: number;
  communicationRating: number;
  trendData: {
    month: string;
    rating: number;
    sessions: number;
  }[];
}

interface FeedbackFilter {
  dateRange: { start: string; end: string };
  modules: string[];
  instructors: string[];
  ratings: { min: number; max: number };
  sentiment: string[];
  status: string[];
  priority: string[];
  anonymous: boolean | null;
  flagged: boolean | null;
  searchQuery: string;
}

interface TrainingFeedbackRatingProps {
  className?: string;
  sessionId?: string;
  moduleId?: string;
  instructorId?: string;
  onFeedbackSubmit?: (feedback: Partial<TrainingFeedback>) => void;
  onFeedbackUpdate?: (id: string, updates: Partial<TrainingFeedback>) => void;
  viewMode?: 'submit' | 'manage' | 'analyze';
}

export function TrainingFeedbackRating({
  className,
  sessionId,
  moduleId,
  instructorId,
  onFeedbackSubmit,
  onFeedbackUpdate,
  viewMode = 'submit'
}: TrainingFeedbackRatingProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [feedbackSummaries, setFeedbackSummaries] = useState<FeedbackSummary[]>([]);
  const [instructorSummaries, setInstructorSummaries] = useState<InstructorFeedbackSummary[]>([]);
  
  const [currentFeedback, setCurrentFeedback] = useState<Partial<TrainingFeedback>>({
    ratings: {
      overall: 0,
      contentQuality: 0,
      instructorEffectiveness: 0,
      materialClarity: 0,
      practicalRelevance: 0,
      engagementLevel: 0,
      paceAppropriateness: 0,
      facilitiesQuality: 0,
      technologyUsage: 0,
      learningObjectivesMet: 0
    },
    feedback: {
      whatWorkedWell: '',
      whatWorkedWell_fr: '',
      areasForImprovement: '',
      areasForImprovement_fr: '',
      additionalComments: '',
      additionalComments_fr: '',
      wouldRecommend: true,
      recommendationReason: '',
      recommendationReason_fr: ''
    },
    instructorFeedback: {
      knowledgeLevel: 0,
      communicationSkills: 0,
      preparedness: 0,
      responsiveness: 0,
      encouragement: 0,
      timeManagement: 0,
      specificComments: '',
      specificComments_fr: ''
    },
    contentAssessment: {
      relevanceToJob: 0,
      difficultyLevel: 'just_right',
      contentAmount: 'just_right',
      updateNeeded: false,
      missingTopics: [],
      redundantContent: [],
      suggestedImprovements: '',
      suggestedImprovements_fr: ''
    },
    learningOutcomes: {
      skillsGained: [],
      confidenceIncrease: 0,
      immediateApplicability: 0,
      knowledgeRetention: 0,
      behaviorChangeIntention: 0,
      performanceImprovement: 0,
      followUpNeeds: []
    },
    sessionLogistics: {
      duration: 'just_right',
      timing: 'just_right',
      location: 0,
      technology: 0,
      materials: 0,
      support: 0
    },
    isAnonymous: false,
    priority: 'medium',
    tags: [],
    followUpRequired: false
  });
  
  const [filters, setFilters] = useState<FeedbackFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    modules: [],
    instructors: [],
    ratings: { min: 1, max: 5 },
    sentiment: [],
    status: [],
    priority: [],
    anonymous: null,
    flagged: null,
    searchQuery: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showFeedbackDetails, setShowFeedbackDetails] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<TrainingFeedback | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Load feedback data
  useEffect(() => {
    const loadFeedbackData = async () => {
      setIsLoading(true);
      try {
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock feedback data
        const mockFeedbacks: TrainingFeedback[] = [
          {
            id: '1',
            trainingSessionId: 'session-1',
            moduleId: 'module-1',
            moduleName: 'Food Safety Fundamentals',
            instructorId: 'instructor-1',
            instructorName: 'Chef Laurent Dubois',
            userId: 'user-1',
            userName: 'สมชาย ใจดี (Somchai Jaidee)',
            userRole: 'Chef',
            ratings: {
              overall: 4.5,
              contentQuality: 4.8,
              instructorEffectiveness: 4.7,
              materialClarity: 4.3,
              practicalRelevance: 4.9,
              engagementLevel: 4.6,
              paceAppropriateness: 4.2,
              facilitiesQuality: 4.0,
              technologyUsage: 4.1,
              learningObjectivesMet: 4.8
            },
            feedback: {
              whatWorkedWell: 'Excellent hands-on demonstrations and real-world examples',
              whatWorkedWell_fr: 'Excellentes démonstrations pratiques et exemples du monde réel',
              areasForImprovement: 'Could use more interactive quizzes',
              areasForImprovement_fr: 'Pourrait utiliser plus de quiz interactifs',
              additionalComments: 'Very comprehensive and well-structured',
              additionalComments_fr: 'Très complet et bien structuré',
              wouldRecommend: true,
              recommendationReason: 'Essential knowledge for kitchen staff',
              recommendationReason_fr: 'Connaissances essentielles pour le personnel de cuisine'
            },
            instructorFeedback: {
              knowledgeLevel: 5.0,
              communicationSkills: 4.5,
              preparedness: 4.8,
              responsiveness: 4.6,
              encouragement: 4.7,
              timeManagement: 4.3,
              specificComments: 'Very knowledgeable and approachable',
              specificComments_fr: 'Très compétent et accessible'
            },
            contentAssessment: {
              relevanceToJob: 5.0,
              difficultyLevel: 'just_right',
              contentAmount: 'just_right',
              updateNeeded: false,
              missingTopics: [],
              redundantContent: [],
              suggestedImprovements: 'More case studies would be helpful',
              suggestedImprovements_fr: 'Plus d\'études de cas seraient utiles'
            },
            learningOutcomes: {
              skillsGained: ['HACCP principles', 'Temperature control', 'Cross-contamination prevention'],
              confidenceIncrease: 4.5,
              immediateApplicability: 4.8,
              knowledgeRetention: 4.6,
              behaviorChangeIntention: 4.9,
              performanceImprovement: 4.4,
              followUpNeeds: ['Advanced HACCP', 'Allergy management']
            },
            sessionLogistics: {
              duration: 'just_right',
              timing: 'just_right',
              location: 4.2,
              technology: 4.0,
              materials: 4.5,
              support: 4.3
            },
            submittedAt: '2024-01-20T16:30:00Z',
            isAnonymous: false,
            status: 'reviewed',
            priority: 'medium',
            tags: ['excellent', 'comprehensive'],
            sentiment: 'positive',
            helpfulnessVotes: 8,
            flagged: false,
            instructorResponse: 'Thank you for the detailed feedback!',
            instructorResponse_fr: 'Merci pour les commentaires détaillés !',
            instructorResponseDate: '2024-01-21T09:15:00Z',
            followUpRequired: false
          }
        ];
        
        setFeedbacks(mockFeedbacks);
        
        // Generate summaries
        const mockSummaries: FeedbackSummary[] = [
          {
            moduleId: 'module-1',
            moduleName: 'Food Safety Fundamentals',
            totalFeedbacks: 28,
            averageRatings: {
              overall: 4.3,
              contentQuality: 4.5,
              instructorEffectiveness: 4.4,
              materialClarity: 4.1,
              practicalRelevance: 4.7,
              engagementLevel: 4.2,
              paceAppropriateness: 4.0,
              facilitiesQuality: 3.9,
              technologyUsage: 3.8,
              learningObjectivesMet: 4.5
            },
            sentimentDistribution: {
              positive: 21,
              neutral: 5,
              negative: 2
            },
            recommendationRate: 89,
            commonThemes: {
              strengths: ['Practical examples', 'Expert instructor', 'Clear explanations'],
              improvements: ['More interactive elements', 'Better technology', 'Longer sessions']
            },
            actionableInsights: [
              'Add more interactive quizzes',
              'Upgrade AV equipment',
              'Consider extending session duration'
            ],
            trendsOverTime: [
              { period: '2024-01', rating: 4.1, count: 15 },
              { period: '2024-02', rating: 4.3, count: 18 },
              { period: '2024-03', rating: 4.5, count: 22 }
            ]
          }
        ];
        
        setFeedbackSummaries(mockSummaries);
        
        const mockInstructorSummaries: InstructorFeedbackSummary[] = [
          {
            instructorId: 'instructor-1',
            instructorName: 'Chef Laurent Dubois',
            totalSessions: 12,
            averageRating: 4.4,
            totalFeedbacks: 48,
            strengths: ['Deep expertise', 'Clear communication', 'Practical approach'],
            improvementAreas: ['Time management', 'Technology usage'],
            studentSatisfaction: 4.3,
            expertiseRating: 4.8,
            communicationRating: 4.2,
            trendData: [
              { month: '2024-01', rating: 4.2, sessions: 4 },
              { month: '2024-02', rating: 4.4, sessions: 5 },
              { month: '2024-03', rating: 4.6, sessions: 3 }
            ]
          }
        ];
        
        setInstructorSummaries(mockInstructorSummaries);
        
      } catch (error) {
        console.error('Failed to load feedback data:', error);
        toast({
          title: t('error.load_failed'),
          description: t('error.feedback_load_failed'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (viewMode !== 'submit') {
      loadFeedbackData();
    }
  }, [viewMode, t]);

  // Handle feedback submission
  const handleSubmitFeedback = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!currentFeedback.ratings?.overall || currentFeedback.ratings.overall < 1) {
        toast({
          title: t('error.validation_failed'),
          description: t('training.overall_rating_required'),
          variant: 'destructive',
        });
        return;
      }
      
      // Simulate API submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newFeedback: TrainingFeedback = {
        id: `feedback-${Date.now()}`,
        trainingSessionId: sessionId || 'current-session',
        moduleId: moduleId || 'current-module',
        moduleName: 'Current Training Module',
        instructorId: instructorId || 'current-instructor',
        instructorName: 'Current Instructor',
        userId: 'current-user',
        userName: 'Current User',
        userRole: 'Staff',
        ...currentFeedback,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        sentiment: currentFeedback.ratings!.overall >= 4 ? 'positive' : 
                  currentFeedback.ratings!.overall >= 3 ? 'neutral' : 'negative',
        helpfulnessVotes: 0,
        flagged: false
      } as TrainingFeedback;
      
      onFeedbackSubmit?.(newFeedback);
      
      toast({
        title: t('training.feedback_submitted'),
        description: t('training.feedback_submitted_desc'),
      });
      
      // Reset form
      setCurrentStep(1);
      setCurrentFeedback({
        ratings: {
          overall: 0,
          contentQuality: 0,
          instructorEffectiveness: 0,
          materialClarity: 0,
          practicalRelevance: 0,
          engagementLevel: 0,
          paceAppropriateness: 0,
          facilitiesQuality: 0,
          technologyUsage: 0,
          learningObjectivesMet: 0
        },
        feedback: {
          whatWorkedWell: '',
          whatWorkedWell_fr: '',
          areasForImprovement: '',
          areasForImprovement_fr: '',
          additionalComments: '',
          additionalComments_fr: '',
          wouldRecommend: true,
          recommendationReason: '',
          recommendationReason_fr: ''
        },
        instructorFeedback: {
          knowledgeLevel: 0,
          communicationSkills: 0,
          preparedness: 0,
          responsiveness: 0,
          encouragement: 0,
          timeManagement: 0,
          specificComments: '',
          specificComments_fr: ''
        },
        isAnonymous: false,
        priority: 'medium',
        tags: [],
        followUpRequired: false
      });
      
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: t('error.submit_failed'),
        description: t('error.feedback_submit_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentFeedback, sessionId, moduleId, instructorId, onFeedbackSubmit, t]);

  // Render star rating component
  const renderStarRating = (value: number, onChange?: (rating: number) => void, size: 'sm' | 'md' | 'lg' = 'md') => {
    const starSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            disabled={!onChange}
            className={cn(
              starSize,
              star <= value ? 'text-yellow-400 fill-current' : 'text-gray-300',
              onChange && 'hover:text-yellow-400 transition-colors'
            )}
          >
            <Star className={starSize} />
          </button>
        ))}
        {onChange && (
          <span className="ml-2 text-sm text-muted-foreground">
            {value > 0 ? `${value}/5` : t('training.no_rating')}
          </span>
        )}
      </div>
    );
  };

  // Render feedback submission form
  const renderSubmissionForm = () => (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step <= currentStep
                  ? 'bg-krong-red text-white'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {step}
            </div>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {t('training.step_of', { current: currentStep, total: 4 })}
        </span>
      </div>

      {/* Step 1: Overall Ratings */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              {t('training.overall_ratings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center">
                  {t('training.overall_satisfaction')}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                {renderStarRating(
                  currentFeedback.ratings?.overall || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings!, overall: rating }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.content_quality')}</Label>
                {renderStarRating(
                  currentFeedback.ratings?.contentQuality || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings!, contentQuality: rating }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.instructor_effectiveness')}</Label>
                {renderStarRating(
                  currentFeedback.ratings?.instructorEffectiveness || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings!, instructorEffectiveness: rating }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.practical_relevance')}</Label>
                {renderStarRating(
                  currentFeedback.ratings?.practicalRelevance || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings!, practicalRelevance: rating }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.engagement_level')}</Label>
                {renderStarRating(
                  currentFeedback.ratings?.engagementLevel || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings!, engagementLevel: rating }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.learning_objectives_met')}</Label>
                {renderStarRating(
                  currentFeedback.ratings?.learningObjectivesMet || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings!, learningObjectivesMet: rating }
                  }))
                )}
              </div>
            </div>
            
            <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  {showAdvancedOptions ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      {t('training.hide_detailed_ratings')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      {t('training.show_detailed_ratings')}
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('training.material_clarity')}</Label>
                    {renderStarRating(
                      currentFeedback.ratings?.materialClarity || 0,
                      (rating) => setCurrentFeedback(prev => ({
                        ...prev,
                        ratings: { ...prev.ratings!, materialClarity: rating }
                      }))
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('training.pace_appropriateness')}</Label>
                    {renderStarRating(
                      currentFeedback.ratings?.paceAppropriateness || 0,
                      (rating) => setCurrentFeedback(prev => ({
                        ...prev,
                        ratings: { ...prev.ratings!, paceAppropriateness: rating }
                      }))
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('training.facilities_quality')}</Label>
                    {renderStarRating(
                      currentFeedback.ratings?.facilitiesQuality || 0,
                      (rating) => setCurrentFeedback(prev => ({
                        ...prev,
                        ratings: { ...prev.ratings!, facilitiesQuality: rating }
                      }))
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('training.technology_usage')}</Label>
                    {renderStarRating(
                      currentFeedback.ratings?.technologyUsage || 0,
                      (rating) => setCurrentFeedback(prev => ({
                        ...prev,
                        ratings: { ...prev.ratings!, technologyUsage: rating }
                      }))
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Qualitative Feedback */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
              {t('training.qualitative_feedback')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>{t('training.what_worked_well')}</Label>
                <Textarea
                  value={currentFeedback.feedback?.whatWorkedWell || ''}
                  onChange={(e) => setCurrentFeedback(prev => ({
                    ...prev,
                    feedback: { 
                      ...prev.feedback!, 
                      whatWorkedWell: e.target.value 
                    }
                  }))}
                  placeholder={t('training.what_worked_well_placeholder')}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>{t('training.areas_for_improvement')}</Label>
                <Textarea
                  value={currentFeedback.feedback?.areasForImprovement || ''}
                  onChange={(e) => setCurrentFeedback(prev => ({
                    ...prev,
                    feedback: { 
                      ...prev.feedback!, 
                      areasForImprovement: e.target.value 
                    }
                  }))}
                  placeholder={t('training.areas_for_improvement_placeholder')}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>{t('training.additional_comments')}</Label>
                <Textarea
                  value={currentFeedback.feedback?.additionalComments || ''}
                  onChange={(e) => setCurrentFeedback(prev => ({
                    ...prev,
                    feedback: { 
                      ...prev.feedback!, 
                      additionalComments: e.target.value 
                    }
                  }))}
                  placeholder={t('training.additional_comments_placeholder')}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <Label>{t('training.would_recommend')}</Label>
                <Switch
                  checked={currentFeedback.feedback?.wouldRecommend || false}
                  onCheckedChange={(checked) => setCurrentFeedback(prev => ({
                    ...prev,
                    feedback: { 
                      ...prev.feedback!, 
                      wouldRecommend: checked 
                    }
                  }))}
                />
              </div>
              
              {currentFeedback.feedback?.wouldRecommend && (
                <div>
                  <Label>{t('training.recommendation_reason')}</Label>
                  <Textarea
                    value={currentFeedback.feedback?.recommendationReason || ''}
                    onChange={(e) => setCurrentFeedback(prev => ({
                      ...prev,
                      feedback: { 
                        ...prev.feedback!, 
                        recommendationReason: e.target.value 
                      }
                    }))}
                    placeholder={t('training.recommendation_reason_placeholder')}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Instructor Feedback */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-green-500" />
              {t('training.instructor_feedback')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>{t('training.knowledge_level')}</Label>
                {renderStarRating(
                  currentFeedback.instructorFeedback?.knowledgeLevel || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    instructorFeedback: { 
                      ...prev.instructorFeedback!, 
                      knowledgeLevel: rating 
                    }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.communication_skills')}</Label>
                {renderStarRating(
                  currentFeedback.instructorFeedback?.communicationSkills || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    instructorFeedback: { 
                      ...prev.instructorFeedback!, 
                      communicationSkills: rating 
                    }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.preparedness')}</Label>
                {renderStarRating(
                  currentFeedback.instructorFeedback?.preparedness || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    instructorFeedback: { 
                      ...prev.instructorFeedback!, 
                      preparedness: rating 
                    }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.responsiveness')}</Label>
                {renderStarRating(
                  currentFeedback.instructorFeedback?.responsiveness || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    instructorFeedback: { 
                      ...prev.instructorFeedback!, 
                      responsiveness: rating 
                    }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.encouragement')}</Label>
                {renderStarRating(
                  currentFeedback.instructorFeedback?.encouragement || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    instructorFeedback: { 
                      ...prev.instructorFeedback!, 
                      encouragement: rating 
                    }
                  }))
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('training.time_management')}</Label>
                {renderStarRating(
                  currentFeedback.instructorFeedback?.timeManagement || 0,
                  (rating) => setCurrentFeedback(prev => ({
                    ...prev,
                    instructorFeedback: { 
                      ...prev.instructorFeedback!, 
                      timeManagement: rating 
                    }
                  }))
                )}
              </div>
            </div>
            
            <div>
              <Label>{t('training.instructor_specific_comments')}</Label>
              <Textarea
                value={currentFeedback.instructorFeedback?.specificComments || ''}
                onChange={(e) => setCurrentFeedback(prev => ({
                  ...prev,
                  instructorFeedback: { 
                    ...prev.instructorFeedback!, 
                    specificComments: e.target.value 
                  }
                }))}
                placeholder={t('training.instructor_comments_placeholder')}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Final Details */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-purple-500" />
              {t('training.final_details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-3">
              <Label>{t('training.submit_anonymously')}</Label>
              <Switch
                checked={currentFeedback.isAnonymous || false}
                onCheckedChange={(checked) => setCurrentFeedback(prev => ({
                  ...prev,
                  isAnonymous: checked
                }))}
              />
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            
            <div className="flex items-center space-x-3">
              <Label>{t('training.follow_up_required')}</Label>
              <Switch
                checked={currentFeedback.followUpRequired || false}
                onCheckedChange={(checked) => setCurrentFeedback(prev => ({
                  ...prev,
                  followUpRequired: checked
                }))}
              />
            </div>
            
            <div>
              <Label>{t('training.feedback_summary')}</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('training.overall_rating')}:</span>
                    <div className="flex items-center space-x-2">
                      {renderStarRating(currentFeedback.ratings?.overall || 0, undefined, 'sm')}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('training.would_recommend')}:</span>
                    <span>{currentFeedback.feedback?.wouldRecommend ? t('common.yes') : t('common.no')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('training.anonymous_submission')}:</span>
                    <span>{currentFeedback.isAnonymous ? t('common.yes') : t('common.no')}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          {t('common.previous')}
        </Button>
        
        {currentStep < 4 ? (
          <Button
            onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
            disabled={currentStep === 1 && (!currentFeedback.ratings?.overall || currentFeedback.ratings.overall < 1)}
          >
            {t('common.next')}
          </Button>
        ) : (
          <Button
            onClick={handleSubmitFeedback}
            disabled={isSubmitting}
            className="bg-krong-red hover:bg-krong-red/90"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t('common.submitting')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('training.submit_feedback')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  // Main render based on view mode
  if (viewMode === 'submit') {
    return (
      <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center">
            <Star className="w-8 h-8 mr-3 text-yellow-500" />
            {t('training.training_feedback')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('training.feedback_help_improve')}
          </p>
        </div>
        
        {renderSubmissionForm()}
      </div>
    );
  }

  // Management and analysis views would go here
  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center py-8">
        <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t('training.feedback_management')}</h2>
        <p className="text-muted-foreground">
          {t('training.feedback_management_coming_soon')}
        </p>
      </div>
    </div>
  );
}

export default TrainingFeedbackRating;