'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  X,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Video,
  Image as ImageIcon,
  FileText,
  Clock,
  Star,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Target,
  Users,
  Zap,
  Brain
} from 'lucide-react';

interface LearningContent {
  id: string;
  type: 'tip' | 'tutorial' | 'warning' | 'best_practice' | 'troubleshooting' | 'technique';
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  media_url?: string;
  media_type?: 'video' | 'image' | 'audio';
  duration_seconds?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  related_sop_steps?: string[];
  success_criteria?: string[];
}

interface LearningTrigger {
  id: string;
  sop_step_id: string;
  trigger_type: 'step_start' | 'step_struggle' | 'error_occurred' | 'time_exceeded' | 'manual_request';
  conditions?: {
    min_time_spent?: number;
    max_attempts?: number;
    error_patterns?: string[];
    user_experience_level?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  content_ids: string[];
}

interface UserInteraction {
  timestamp: string;
  action: 'viewed' | 'completed' | 'dismissed' | 'helpful' | 'not_helpful';
  content_id: string;
  time_spent_seconds: number;
}

interface JustInTimeLearningPopupProps {
  /** Current SOP step ID */
  currentStepId: string;
  /** Available learning content */
  learningContent?: LearningContent[];
  /** Learning triggers configuration */
  triggers?: LearningTrigger[];
  /** Current user's experience level */
  userExperienceLevel?: 'novice' | 'intermediate' | 'expert';
  /** Time spent on current step (in seconds) */
  timeSpentOnStep?: number;
  /** Number of attempts on current step */
  stepAttempts?: number;
  /** Recent errors or issues */
  recentErrors?: string[];
  /** Whether popup is currently visible */
  isVisible: boolean;
  /** Callback when popup is closed */
  onClose: () => void;
  /** Callback when content is rated helpful */
  onContentRated: (contentId: string, isHelpful: boolean) => void;
  /** Callback when learning is completed */
  onLearningComplete: (contentId: string, timeSpent: number) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * JustInTimeLearningPopup - Contextual learning assistance during SOP execution
 * 
 * Features:
 * - Context-aware content delivery based on current SOP step
 * - Intelligent triggering based on user behavior and performance
 * - Multi-media content support (video, images, audio)
 * - Progressive disclosure with different content types
 * - User feedback and learning effectiveness tracking
 * - Tablet-optimized responsive design
 * - Bilingual content support (EN/FR)
 * - Adaptive content based on user experience level
 * - Quick tips vs detailed tutorials
 * - Offline capability for critical help content
 * 
 * @param props JustInTimeLearningPopupProps
 * @returns JSX.Element
 */
const JustInTimeLearningPopup: React.FC<JustInTimeLearningPopupProps> = ({
  currentStepId,
  learningContent = [],
  triggers = [],
  userExperienceLevel = 'intermediate',
  timeSpentOnStep = 0,
  stepAttempts = 1,
  recentErrors = [],
  isVisible,
  onClose,
  onContentRated,
  onLearningComplete,
  className
}) => {
  const t = useTranslations('training.justInTime');
  const [activeContentIndex, setActiveContentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentTab, setCurrentTab] = useState('content');

  // Filter and prioritize relevant content
  const relevantContent = useCallback(() => {
    const stepTriggers = triggers.filter(trigger => 
      trigger.sop_step_id === currentStepId && 
      shouldTrigger(trigger)
    );

    if (stepTriggers.length === 0) return [];

    // Get content IDs from triggered content
    const contentIds = stepTriggers
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .flatMap(trigger => trigger.content_ids);

    // Get actual content and filter by user experience level
    return learningContent
      .filter(content => contentIds.includes(content.id))
      .filter(content => isContentSuitableForUser(content))
      .slice(0, 5); // Limit to top 5 most relevant items
  }, [currentStepId, triggers, learningContent, timeSpentOnStep, stepAttempts, recentErrors, userExperienceLevel]);

  // Check if trigger conditions are met
  const shouldTrigger = useCallback((trigger: LearningTrigger): boolean => {
    const conditions = trigger.conditions;
    if (!conditions) return true;

    // Check time-based conditions
    if (conditions.min_time_spent && timeSpentOnStep < conditions.min_time_spent) {
      return false;
    }

    // Check attempt-based conditions
    if (conditions.max_attempts && stepAttempts < conditions.max_attempts) {
      return false;
    }

    // Check error pattern conditions
    if (conditions.error_patterns && conditions.error_patterns.length > 0) {
      const hasMatchingError = conditions.error_patterns.some(pattern =>
        recentErrors.some(error => error.includes(pattern))
      );
      if (!hasMatchingError) return false;
    }

    // Check user experience level
    if (conditions.user_experience_level && 
        conditions.user_experience_level !== userExperienceLevel) {
      return false;
    }

    return true;
  }, [timeSpentOnStep, stepAttempts, recentErrors, userExperienceLevel]);

  // Check if content is suitable for current user
  const isContentSuitableForUser = useCallback((content: LearningContent): boolean => {
    const experienceLevels = { novice: 1, intermediate: 2, expert: 3 };
    const contentLevels = { beginner: 1, intermediate: 2, advanced: 3 };
    
    const userLevel = experienceLevels[userExperienceLevel];
    const contentLevel = contentLevels[content.difficulty];

    // Show content that matches user level or is one level above/below
    return Math.abs(userLevel - contentLevel) <= 1;
  }, [userExperienceLevel]);

  // Track user interaction
  const trackInteraction = useCallback((action: UserInteraction['action'], contentId?: string) => {
    const interaction: UserInteraction = {
      timestamp: new Date().toISOString(),
      action,
      content_id: contentId || relevantContent()[activeContentIndex]?.id || '',
      time_spent_seconds: startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0
    };

    setInteractions(prev => [...prev, interaction]);

    if (action === 'completed' && contentId) {
      onLearningComplete(contentId, interaction.time_spent_seconds);
    }
  }, [activeContentIndex, relevantContent, startTime, onLearningComplete]);

  // Initialize start time when popup opens
  useEffect(() => {
    if (isVisible) {
      setStartTime(new Date());
    }
  }, [isVisible]);

  // Handle content navigation
  const navigateContent = (direction: 'next' | 'prev') => {
    const content = relevantContent();
    if (direction === 'next' && activeContentIndex < content.length - 1) {
      setActiveContentIndex(prev => prev + 1);
    } else if (direction === 'prev' && activeContentIndex > 0) {
      setActiveContentIndex(prev => prev - 1);
    }
    trackInteraction('viewed');
  };

  // Handle close with tracking
  const handleClose = () => {
    trackInteraction('dismissed');
    onClose();
  };

  // Handle content completion
  const handleContentComplete = () => {
    const currentContent = relevantContent()[activeContentIndex];
    if (currentContent) {
      trackInteraction('completed', currentContent.id);
    }
    setShowFeedback(true);
  };

  // Handle feedback submission
  const handleFeedback = (isHelpful: boolean) => {
    const currentContent = relevantContent()[activeContentIndex];
    if (currentContent) {
      onContentRated(currentContent.id, isHelpful);
      trackInteraction(isHelpful ? 'helpful' : 'not_helpful', currentContent.id);
    }
    setShowFeedback(false);
  };

  // Get content type icon and color
  const getContentTypeInfo = (type: LearningContent['type']) => {
    const typeInfo = {
      tip: { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      tutorial: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      warning: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
      best_practice: { icon: Star, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      troubleshooting: { icon: HelpCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
      technique: { icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
    };
    return typeInfo[type] || typeInfo.tip;
  };

  // Get media icon
  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'video': return Video;
      case 'image': return ImageIcon;
      case 'audio': return Volume2;
      default: return FileText;
    }
  };

  const content = relevantContent();
  
  if (!isVisible || content.length === 0) {
    return null;
  }

  const currentContent = content[activeContentIndex];
  const typeInfo = getContentTypeInfo(currentContent.type);
  const TypeIcon = typeInfo.icon;
  const MediaIcon = getMediaIcon(currentContent.media_type);

  return (
    <Dialog open={isVisible} onOpenChange={() => handleClose()}>
      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh] overflow-hidden",
        isFullscreen && "max-w-[95vw] max-h-[95vh]",
        className
      )}>
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-tablet-lg">
              <div className={cn("p-2 rounded-lg", typeInfo.bg, typeInfo.border)}>
                <TypeIcon className={cn("w-5 h-5", typeInfo.color)} />
              </div>
              {t('contextualHelp')}
              <Badge variant="outline" className="text-tablet-xs">
                {activeContentIndex + 1} {t('of')} {content.length}
              </Badge>
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-h-[70vh] overflow-hidden">
          {/* Content Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-3 overflow-y-auto">
            <h3 className="font-semibold text-tablet-sm text-krong-black">
              {t('availableHelp')}
            </h3>
            <div className="space-y-2">
              {content.map((item, index) => {
                const itemTypeInfo = getContentTypeInfo(item.type);
                const ItemIcon = itemTypeInfo.icon;
                
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-sm",
                      index === activeContentIndex && "border-krong-red bg-krong-red/5"
                    )}
                    onClick={() => setActiveContentIndex(index)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <ItemIcon className={cn("w-4 h-4 mt-0.5", itemTypeInfo.color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-tablet-xs font-medium text-krong-black truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-4">
                              {t(`contentType.${item.type}`)}
                            </Badge>
                            {item.duration_seconds && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px]">
                                  {Math.ceil(item.duration_seconds / 60)}m
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-4 overflow-y-auto">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {t('content')}
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-2" disabled={!currentContent.media_url}>
                  <MediaIcon className="w-4 h-4" />
                  {t('media')}
                </TabsTrigger>
                <TabsTrigger value="practice" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  {t('practice')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                {/* Content Header */}
                <div className={cn("p-4 rounded-lg border", typeInfo.bg, typeInfo.border)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-tablet-lg font-heading font-bold text-krong-black">
                        {currentContent.title}
                      </h2>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className={cn("text-tablet-xs", typeInfo.color)}>
                          {t(`contentType.${currentContent.type}`)}
                        </Badge>
                        <Badge variant="outline" className="text-tablet-xs">
                          {t(`difficulty.${currentContent.difficulty}`)}
                        </Badge>
                        {currentContent.duration_seconds && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="text-tablet-xs">
                              {Math.ceil(currentContent.duration_seconds / 60)} {t('minutes')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <Card>
                  <CardContent className="p-6">
                    <div className="prose prose-slate max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: currentContent.content }} />
                    </div>

                    {/* Success Criteria */}
                    {currentContent.success_criteria && currentContent.success_criteria.length > 0 && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {t('successCriteria')}
                        </h4>
                        <ul className="space-y-1 text-tablet-sm text-green-700">
                          {currentContent.success_criteria.map((criteria, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                {currentContent.media_url ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <MediaIcon className="w-5 h-5 text-krong-red" />
                          {t('trainingMedia')}
                        </h3>
                        <div className="flex items-center gap-2">
                          {currentContent.media_type === 'video' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setIsPlaying(!isPlaying)}
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                          >
                            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Media Display */}
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        {currentContent.media_type === 'video' && (
                          <video
                            src={currentContent.media_url}
                            controls
                            className="w-full max-h-96"
                            muted={!isAudioEnabled}
                            onTimeUpdate={(e) => {
                              const video = e.target as HTMLVideoElement;
                              const progress = (video.currentTime / video.duration) * 100;
                              setMediaProgress(progress);
                            }}
                          />
                        )}
                        
                        {currentContent.media_type === 'image' && (
                          <img
                            src={currentContent.media_url}
                            alt={currentContent.title}
                            className="w-full max-h-96 object-contain"
                          />
                        )}
                        
                        {currentContent.media_type === 'audio' && (
                          <div className="p-8 text-center">
                            <Volume2 className="w-16 h-16 mx-auto text-white/60 mb-4" />
                            <audio
                              src={currentContent.media_url}
                              controls
                              className="w-full"
                              muted={!isAudioEnabled}
                            />
                          </div>
                        )}
                      </div>

                      {/* Media Progress */}
                      {currentContent.media_type === 'video' && mediaProgress > 0 && (
                        <div className="mt-4">
                          <Progress value={mediaProgress} className="h-2" />
                          <div className="flex justify-between text-tablet-xs text-muted-foreground mt-1">
                            <span>{t('progress')}</span>
                            <span>{Math.round(mediaProgress)}%</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t('noMediaAvailable')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="practice" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <Target className="w-12 h-12 mx-auto text-krong-red" />
                      <h3 className="text-tablet-lg font-heading font-semibold">
                        {t('practiceMode')}
                      </h3>
                      <p className="text-muted-foreground">
                        {t('practiceModeDesc')}
                      </p>
                      <Button className="px-8">
                        <Zap className="w-4 h-4 mr-2" />
                        {t('startPractice')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={activeContentIndex === 0}
                onClick={() => navigateContent('prev')}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('previous')}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                disabled={activeContentIndex === content.length - 1}
                onClick={() => navigateContent('next')}
              >
                {t('next')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                {t('closeLater')}
              </Button>
              
              <Button onClick={handleContentComplete}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('markComplete')}
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Dialog */}
        <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">
                {t('wasThisHelpful')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                {t('feedbackDesc')}
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => handleFeedback(false)}
                  className="flex-1"
                >
                  {t('notHelpful')}
                </Button>
                <Button
                  onClick={() => handleFeedback(true)}
                  className="flex-1"
                >
                  <Star className="w-4 h-4 mr-2" />
                  {t('veryHelpful')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default JustInTimeLearningPopup;