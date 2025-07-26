/**
 * Interactive Training Session Component
 * Provides step-by-step training guidance with progress tracking
 * Optimized for tablet experience with touch-friendly interactions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Circle,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  Heart,
  Award,
  Star
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

import { 
  useTraining, 
  useTrainingNavigation, 
  useTrainingProgress,
  useTrainingGamification 
} from '@/lib/stores/training-store';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

import type { 
  TrainingModule, 
  TrainingSection, 
  UserTrainingProgress 
} from '@/types/database';

interface TrainingSessionProps {
  moduleId: string;
  className?: string;
  onComplete?: () => void;
  onExit?: () => void;
}

export function TrainingSession({ 
  moduleId, 
  className, 
  onComplete, 
  onExit 
}: TrainingSessionProps) {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  
  // Training store hooks
  const {
    currentModule,
    currentSection,
    currentProgress,
    isLoading,
    error,
    startTraining,
    resumeTraining,
    endTraining,
  } = useTraining();

  const {
    navigateToSection,
    completeSection,
    getNextSection,
    getPreviousSection,
  } = useTrainingNavigation();

  const {
    calculateProgress,
    updateProgress,
  } = useTrainingProgress();

  const {
    totalPoints,
    achievements,
    calculatePoints,
  } = useTrainingGamification();

  // Local state
  const [isPlaying, setIsPlaying] = useState(false);
  const [sectionStartTime, setSectionStartTime] = useState<Date | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showGamificationReward, setShowGamificationReward] = useState(false);

  // Initialize training session
  useEffect(() => {
    const initializeTraining = async () => {
      if (!currentModule || currentModule.id !== moduleId) {
        const success = await startTraining(moduleId);
        if (!success) {
          toast({
            title: t('error.training_start_failed'),
            description: t('error.training_start_failed_desc'),
            variant: 'destructive',
          });
          return;
        }
      }
      
      setIsPlaying(true);
      setSectionStartTime(new Date());
    };

    initializeTraining();
  }, [moduleId, currentModule, startTraining, t]);

  // Handle section timing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && sectionStartTime) {
      interval = setInterval(() => {
        // Update progress every 30 seconds while playing
        if (currentSection) {
          const timeSpent = Math.round(
            (Date.now() - sectionStartTime.getTime()) / (1000 * 60)
          );
          
          if (timeSpent > 0 && timeSpent % 0.5 === 0) { // Every 30 seconds
            updateProgress({
              section_id: currentSection.id,
              time_spent_minutes: 0.5,
            });
          }
        }
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, sectionStartTime, currentSection, updateProgress]);

  // Calculate time spent in current section
  const getCurrentSectionTimeSpent = useCallback(() => {
    if (!sectionStartTime) return 0;
    return Math.round((Date.now() - sectionStartTime.getTime()) / (1000 * 60));
  }, [sectionStartTime]);

  // Handle section completion
  const handleCompleteSection = async () => {
    if (!currentSection || !currentProgress) return;

    const timeSpent = getCurrentSectionTimeSpent();
    
    const success = await completeSection(
      currentSection.id,
      timeSpent,
      userNotes || undefined
    );

    if (success) {
      // Show completion feedback
      toast({
        title: t('training.section_completed'),
        description: t('training.section_completed_desc', { 
          title: locale === 'th' ? currentSection.title_th : currentSection.title 
        }),
        variant: 'default',
      });

      // Check if this completes the entire module
      const newProgress = calculateProgress(currentProgress.module_id);
      if (newProgress >= 100) {
        setShowCompletionDialog(true);
        setShowGamificationReward(true);
      } else {
        // Move to next section automatically
        const nextSection = getNextSection();
        if (nextSection) {
          await navigateToSection(nextSection.id);
          setSectionStartTime(new Date());
          setUserNotes('');
        }
      }
    } else {
      toast({
        title: t('error.section_completion_failed'),
        description: t('error.section_completion_failed_desc'),
        variant: 'destructive',
      });
    }
  };

  // Handle navigation
  const handleNavigateToSection = async (section: TrainingSection) => {
    // Save current section progress
    if (currentSection && sectionStartTime) {
      const timeSpent = getCurrentSectionTimeSpent();
      await updateProgress({
        section_id: currentSection.id,
        time_spent_minutes: timeSpent,
        notes: userNotes || undefined,
      });
    }

    const success = await navigateToSection(section.id);
    if (success) {
      setSectionStartTime(new Date());
      setUserNotes('');
    }
  };

  // Handle training completion
  const handleCompleteTraining = () => {
    setShowCompletionDialog(false);
    onComplete?.();
  };

  // Handle exit training
  const handleExitTraining = () => {
    if (currentSection && sectionStartTime) {
      const timeSpent = getCurrentSectionTimeSpent();
      updateProgress({
        section_id: currentSection.id,
        time_spent_minutes: timeSpent,
        notes: userNotes || undefined,
      });
    }
    
    endTraining();
    onExit?.();
  };

  // Handle media type icons
  const getMediaIcon = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <ImageIcon className="h-4 w-4" />;
    } else if (['mp4', 'webm', 'mov'].includes(extension || '')) {
      return <Video className="h-4 w-4" />;
    } else if (['pdf', 'doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-4 w-4" />;
    }
    return <Download className="h-4 w-4" />;
  };

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <Circle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('error.training_session_error')}</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.back()}>{t('common.go_back')}</Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !currentModule || !currentSection || !currentProgress) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <Circle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('training.loading_session')}</h3>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = calculateProgress(currentModule.id);
  const sections = currentModule.sections || [];
  const sectionTitle = locale === 'th' ? currentSection.title_th : currentSection.title;
  const sectionContent = locale === 'th' ? currentSection.content_th : currentSection.content;
  const moduleTitle = locale === 'th' ? currentModule.title_th : currentModule.title;

  return (
    <div className={cn('w-full max-w-6xl mx-auto space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{moduleTitle}</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{t('training.estimated_time', { minutes: currentModule.duration_minutes })}</span>
                  </span>
                  <span>•</span>
                  <span>{t('training.section_progress', { 
                    current: currentSection.section_number, 
                    total: sections.length 
                  })}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAudioEnabled(!audioEnabled)}
              >
                {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              
              <Button variant="outline" onClick={handleExitTraining}>
                {t('training.exit_training')}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex-1">
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <div className="text-sm font-medium">
              {progressPercentage}%
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Navigation Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('training.sections')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.map((section, index) => (
              <Button
                key={section.id}
                variant={section.id === currentSection.id ? 'default' : 'ghost'}
                className="w-full justify-start h-auto p-3"
                onClick={() => handleNavigateToSection(section)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="flex-shrink-0">
                    {section.id === currentSection.id ? (
                      <Circle className="h-5 w-5 fill-current" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">
                      {locale === 'th' ? section.title_th : section.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('training.estimated_minutes', { minutes: section.estimated_minutes })}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Section Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{sectionTitle}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary">
                      {t('training.section')} {currentSection.section_number}
                    </Badge>
                    {currentSection.is_required && (
                      <Badge variant="destructive">
                        {t('training.required')}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Section Content */}
              <div className="prose prose-slate max-w-none">
                <div dangerouslySetInnerHTML={{ __html: sectionContent }} />
              </div>

              {/* Media Attachments */}
              {currentSection.media_urls && currentSection.media_urls.length > 0 && (
                <div className="space-y-4">
                  <Separator />
                  <h4 className="font-semibold">{t('training.media_resources')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {currentSection.media_urls.map((url, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center space-y-2"
                        onClick={() => window.open(url, '_blank')}
                      >
                        {getMediaIcon(url)}
                        <span className="text-xs text-center break-all">
                          {url.split('/').pop()?.substring(0, 20)}...
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              <div className="space-y-4">
                <Separator />
                <Button
                  variant="outline"
                  onClick={() => setShowNotes(!showNotes)}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showNotes ? t('training.hide_notes') : t('training.show_notes')}
                </Button>
                
                {showNotes && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('training.section_notes')}</label>
                    <textarea
                      className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                      placeholder={t('training.notes_placeholder')}
                      value={userNotes}
                      onChange={(e) => setUserNotes(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  disabled={!getPreviousSection()}
                  onClick={() => {
                    const prevSection = getPreviousSection();
                    if (prevSection) handleNavigateToSection(prevSection);
                  }}
                >
                  <SkipBack className="h-4 w-4 mr-2" />
                  {t('training.previous_section')}
                </Button>

                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {totalPoints}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('training.points')}
                    </div>
                  </div>
                  
                  <Button
                    size="lg"
                    onClick={handleCompleteSection}
                    className="px-8"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('training.complete_section')}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  disabled={!getNextSection()}
                  onClick={() => {
                    const nextSection = getNextSection();
                    if (nextSection) handleNavigateToSection(nextSection);
                  }}
                >
                  {t('training.next_section')}
                  <SkipForward className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Training Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="mb-4">
                <Award className="h-16 w-16 mx-auto text-yellow-500" />
              </div>
              {t('training.module_completed')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              {t('training.module_completed_desc', { title: moduleTitle })}
            </p>
            
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {progressPercentage}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('training.completed')}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  +{calculatePoints()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('training.points_earned')}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowCompletionDialog(false)}>
                {t('training.continue_learning')}
              </Button>
              <Button onClick={handleCompleteTraining}>
                {t('training.take_assessment')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gamification Reward Dialog */}
      <Dialog open={showGamificationReward} onOpenChange={setShowGamificationReward}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="mb-4">
                <Star className="h-16 w-16 mx-auto text-yellow-500 animate-pulse" />
              </div>
              {t('training.achievement_unlocked')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">{t('training.module_master')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('training.module_master_desc')}
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="font-medium">+50 {t('training.bonus_points')}</span>
            </div>
            
            <Button onClick={() => setShowGamificationReward(false)}>
              {t('common.awesome')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TrainingSession;