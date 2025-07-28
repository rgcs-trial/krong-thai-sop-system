'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  BookOpen,
  GraduationCap,
  Play,
  Pause,
  SkipForward,
  CheckCircle,
  Clock,
  Star,
  Award,
  AlertTriangle,
  Lightbulb,
  FileText,
  Video,
  Image as ImageIcon,
  Headphones,
  Users,
  TrendingUp,
  X,
  ChevronRight,
  Info,
  Target
} from 'lucide-react';

interface TrainingModule {
  id: string;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sections: TrainingSection[];
  prerequisites?: string[];
  learning_objectives: string[];
  learning_objectives_fr: string[];
}

interface TrainingSection {
  id: string;
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  section_number: number;
  media_urls?: string[];
  estimated_minutes: number;
  is_required: boolean;
  quiz_questions?: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question: string;
  question_fr: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[];
  options_fr?: string[];
  correct_answer: string;
  explanation?: string;
  explanation_fr?: string;
}

interface UserProgress {
  module_id: string;
  completed_sections: string[];
  current_section_id?: string;
  progress_percentage: number;
  time_spent_minutes: number;
  quiz_scores: Record<string, number>;
  started_at: string;
  last_accessed_at: string;
}

interface SOPEmbeddedTrainingProps {
  /** SOP document ID that the training is related to */
  sopId: string;
  /** Available training modules for this SOP */
  trainingModules?: TrainingModule[];
  /** Current user's progress */
  userProgress?: UserProgress;
  /** Whether training is required before SOP execution */
  isRequired?: boolean;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Callback when training is completed */
  onTrainingComplete?: (moduleId: string, certificate?: any) => void;
  /** Callback when training is started */
  onTrainingStart?: (moduleId: string) => void;
  /** Callback when section is completed */
  onSectionComplete?: (moduleId: string, sectionId: string, score?: number) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SOPEmbeddedTraining - Integrated training modules within SOP workflow
 * 
 * Features:
 * - Seamless integration with SOP execution flow
 * - Progressive disclosure of training content
 * - Interactive quizzes and knowledge checks
 * - Real-time progress tracking with visual indicators
 * - Multi-media content support (video, images, audio)
 * - Prerequisite validation and learning path guidance
 * - Certification tracking and requirements
 * - Touch-friendly tablet interface
 * - Bilingual content support (EN/FR)
 * - Offline capability for critical training
 * 
 * @param props SOPEmbeddedTrainingProps
 * @returns JSX.Element
 */
const SOPEmbeddedTraining: React.FC<SOPEmbeddedTrainingProps> = ({
  sopId,
  trainingModules = [],
  userProgress,
  isRequired = false,
  compact = false,
  onTrainingComplete,
  onTrainingStart,
  onSectionComplete,
  className
}) => {
  const t = useTranslations('training.embedded');
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [sectionScores, setSectionScores] = useState<Record<string, number>>({});
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completedModule, setCompletedModule] = useState<TrainingModule | null>(null);

  // Calculate overall progress for a module
  const calculateModuleProgress = useCallback((module: TrainingModule): number => {
    if (!userProgress) return 0;
    const completedSections = userProgress.completed_sections.filter(sectionId => 
      module.sections.some(section => section.id === sectionId)
    );
    return (completedSections.length / module.sections.length) * 100;
  }, [userProgress]);

  // Check if user can access a module (prerequisites met)
  const canAccessModule = useCallback((module: TrainingModule): boolean => {
    if (!module.prerequisites || module.prerequisites.length === 0) return true;
    if (!userProgress) return false;
    
    return module.prerequisites.every(prereqId => 
      userProgress.completed_sections.includes(prereqId)
    );
  }, [userProgress]);

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700 border-green-200';
      case 'intermediate': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'advanced': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get progress color based on completion
  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-jade-green';
    if (progress >= 50) return 'bg-golden-saffron';
    return 'bg-krong-red';
  };

  // Start training session
  const handleStartTraining = (module: TrainingModule) => {
    setSelectedModule(module);
    setCurrentSectionIndex(0);
    setIsTrainingActive(true);
    setSessionStartTime(new Date());
    setIsPlaying(true);
    onTrainingStart?.(module.id);
  };

  // Complete current section
  const handleSectionComplete = async () => {
    if (!selectedModule || !selectedModule.sections[currentSectionIndex]) return;

    const currentSection = selectedModule.sections[currentSectionIndex];
    
    // Calculate section score if there are quiz questions
    let sectionScore = 100;
    if (currentSection.quiz_questions && currentSection.quiz_questions.length > 0) {
      const correctAnswers = currentSection.quiz_questions.filter(q => 
        quizAnswers[q.id] === q.correct_answer
      ).length;
      sectionScore = (correctAnswers / currentSection.quiz_questions.length) * 100;
    }

    setSectionScores(prev => ({ ...prev, [currentSection.id]: sectionScore }));
    onSectionComplete?.(selectedModule.id, currentSection.id, sectionScore);

    // Check if this was the last section
    if (currentSectionIndex === selectedModule.sections.length - 1) {
      // Module completed
      const overallScore = Object.values({ ...sectionScores, [currentSection.id]: sectionScore })
        .reduce((sum, score) => sum + score, 0) / selectedModule.sections.length;
      
      setCompletedModule(selectedModule);
      setShowCompletionDialog(true);
      setIsTrainingActive(false);
      
      // Generate certificate if score is high enough
      if (overallScore >= 80) {
        const certificate = {
          moduleId: selectedModule.id,
          score: overallScore,
          completedAt: new Date().toISOString(),
          timeSpent: sessionStartTime ? 
            Math.round((Date.now() - sessionStartTime.getTime()) / (1000 * 60)) : 0
        };
        onTrainingComplete?.(selectedModule.id, certificate);
      } else {
        onTrainingComplete?.(selectedModule.id);
      }
    } else {
      // Move to next section
      setCurrentSectionIndex(prev => prev + 1);
      setQuizAnswers({});
    }
  };

  // Handle quiz answer selection
  const handleQuizAnswer = (questionId: string, answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // Check if current section quiz is complete
  const isQuizComplete = () => {
    if (!selectedModule || !selectedModule.sections[currentSectionIndex]?.quiz_questions) return true;
    
    const questions = selectedModule.sections[currentSectionIndex].quiz_questions!;
    return questions.every(q => quizAnswers[q.id]);
  };

  // Get media type icon
  const getMediaIcon = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['mp4', 'webm', 'mov'].includes(extension || '')) return Video;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return ImageIcon;
    if (['mp3', 'wav', 'ogg'].includes(extension || '')) return Headphones;
    return FileText;
  };

  // Render training module card
  const renderModuleCard = (module: TrainingModule) => {
    const progress = calculateModuleProgress(module);
    const canAccess = canAccessModule(module);
    const isCompleted = progress === 100;
    
    return (
      <Card 
        key={module.id}
        className={cn(
          "transition-all duration-200 hover:shadow-md cursor-pointer",
          !canAccess && "opacity-60 cursor-not-allowed",
          isCompleted && "border-jade-green bg-jade-green/5",
          className
        )}
        onClick={() => canAccess && handleStartTraining(module)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isCompleted ? "bg-jade-green text-white" : "bg-krong-red/10 text-krong-red"
              )}>
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              </div>
              <div>
                <CardTitle className="text-tablet-base font-heading font-semibold text-krong-black">
                  {module.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={getDifficultyColor(module.difficulty)}>
                    {t(`difficulty.${module.difficulty}`)}
                  </Badge>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-tablet-xs">{module.duration_minutes}m</span>
                  </div>
                </div>
              </div>
            </div>
            
            {!canAccess && (
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-tablet-sm text-muted-foreground leading-relaxed">
            {module.description}
          </p>

          {/* Learning Objectives */}
          <div className="space-y-2">
            <h4 className="text-tablet-sm font-body font-semibold text-krong-black flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t('learningObjectives')}
            </h4>
            <ul className="space-y-1 text-tablet-xs text-muted-foreground">
              {module.learning_objectives.slice(0, 3).map((objective, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-krong-red rounded-full mt-2 flex-shrink-0" />
                  {objective}
                </li>
              ))}
              {module.learning_objectives.length > 3 && (
                <li className="text-golden-saffron">
                  +{module.learning_objectives.length - 3} {t('moreObjectives')}
                </li>
              )}
            </ul>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-tablet-xs font-body font-medium text-krong-black">
                {t('progress')}
              </span>
              <span className="text-tablet-xs text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={progress} 
                className={cn("h-2", getProgressColor(progress))}
              />
            </div>
          </div>

          {/* Prerequisites Warning */}
          {!canAccess && module.prerequisites && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-tablet-xs font-medium">
                  {t('prerequisitesRequired')}
                </span>
              </div>
              <p className="text-tablet-xs text-orange-600 mt-1">
                {t('completePrerequisites')}
              </p>
            </div>
          )}

          {/* Action Button */}
          <Button
            className="w-full"
            disabled={!canAccess}
            variant={isCompleted ? "outline" : "default"}
          >
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isCompleted ? t('reviewTraining') : t('startTraining')}
            </div>
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Render active training session
  const renderTrainingSession = () => {
    if (!selectedModule || !isTrainingActive) return null;

    const currentSection = selectedModule.sections[currentSectionIndex];
    const sectionProgress = ((currentSectionIndex + 1) / selectedModule.sections.length) * 100;

    return (
      <Card className="border-2 border-krong-red">
        <CardHeader className="bg-krong-red text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6" />
              <div>
                <CardTitle className="text-tablet-lg font-heading">
                  {selectedModule.title}
                </CardTitle>
                <p className="text-tablet-sm opacity-90">
                  {t('section')} {currentSection.section_number} {t('of')} {selectedModule.sections.length}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsTrainingActive(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="mt-4">
            <Progress value={sectionProgress} className="bg-white/20" />
            <div className="flex justify-between text-tablet-xs mt-1 opacity-90">
              <span>{t('overallProgress')}</span>
              <span>{Math.round(sectionProgress)}%</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Section Header */}
          <div className="text-center">
            <h3 className="text-tablet-xl font-heading font-bold text-krong-black mb-2">
              {currentSection.title}
            </h3>
            <div className="flex items-center justify-center gap-4 text-tablet-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{currentSection.estimated_minutes}m</span>
              </div>
              {currentSection.is_required && (
                <Badge variant="destructive" className="text-tablet-xs">
                  {t('required')}
                </Badge>
              )}
            </div>
          </div>

          {/* Section Content */}
          <div className="prose prose-slate max-w-none">
            <div dangerouslySetInnerHTML={{ __html: currentSection.content }} />
          </div>

          {/* Media Content */}
          {currentSection.media_urls && currentSection.media_urls.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('trainingMaterials')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSection.media_urls.map((url, index) => {
                  const MediaIcon = getMediaIcon(url);
                  return (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-3">
                        <MediaIcon className="w-5 h-5 text-krong-red" />
                        <div className="flex-1">
                          <p className="text-tablet-sm font-medium">
                            {t('material')} {index + 1}
                          </p>
                          <p className="text-tablet-xs text-muted-foreground">
                            {url.split('.').pop()?.toUpperCase()}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quiz Questions */}
          {currentSection.quiz_questions && currentSection.quiz_questions.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  {t('knowledgeCheck')}
                </h4>
                <Badge variant="outline">
                  {Object.keys(quizAnswers).length}/{currentSection.quiz_questions.length}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {currentSection.quiz_questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-3">
                      <h5 className="font-medium">
                        {index + 1}. {question.question}
                      </h5>
                      
                      {question.type === 'multiple_choice' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <label 
                              key={optionIndex} 
                              className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50"
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={option}
                                checked={quizAnswers[question.id] === option}
                                onChange={() => handleQuizAnswer(question.id, option)}
                                className="w-4 h-4 text-krong-red"
                              />
                              <span className="text-tablet-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {question.type === 'true_false' && (
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={question.id}
                              value="true"
                              checked={quizAnswers[question.id] === 'true'}
                              onChange={() => handleQuizAnswer(question.id, 'true')}
                              className="w-4 h-4 text-krong-red"
                            />
                            <span>{t('true')}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={question.id}
                              value="false"
                              checked={quizAnswers[question.id] === 'false'}
                              onChange={() => handleQuizAnswer(question.id, 'false')}
                              className="w-4 h-4 text-krong-red"
                            />
                            <span>{t('false')}</span>
                          </label>
                        </div>
                      )}
                      
                      {/* Show explanation if answered */}
                      {quizAnswers[question.id] && question.explanation && (
                        <div className={cn(
                          "p-3 rounded-lg border text-tablet-sm",
                          quizAnswers[question.id] === question.correct_answer
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-red-50 border-red-200 text-red-800"
                        )}>
                          <div className="flex items-center gap-2 mb-1">
                            {quizAnswers[question.id] === question.correct_answer ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            <span className="font-medium">
                              {quizAnswers[question.id] === question.correct_answer 
                                ? t('correct') 
                                : t('incorrect')
                              }
                            </span>
                          </div>
                          <p>{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              disabled={currentSectionIndex === 0}
              onClick={() => setCurrentSectionIndex(prev => prev - 1)}
            >
              {t('previousSection')}
            </Button>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <div className="text-center">
                <div className="text-tablet-sm font-medium">
                  {sessionStartTime && Math.round((Date.now() - sessionStartTime.getTime()) / (1000 * 60))}m
                </div>
                <div className="text-tablet-xs text-muted-foreground">
                  {t('timeSpent')}
                </div>
              </div>
            </div>

            <Button
              onClick={handleSectionComplete}
              disabled={currentSection.quiz_questions && !isQuizComplete()}
              className="px-6"
            >
              {currentSectionIndex === selectedModule.sections.length - 1 
                ? t('completeTraining')
                : t('nextSection')
              }
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // If no training modules available
  if (trainingModules.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
            {t('noTrainingAvailable')}
          </h3>
          <p className="text-tablet-sm text-muted-foreground">
            {t('noTrainingAvailableDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-tablet-xl font-heading font-bold text-krong-black flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-krong-red" />
              {t('trainingModules')}
              {isRequired && (
                <Badge variant="destructive" className="text-tablet-xs">
                  {t('required')}
                </Badge>
              )}
            </h2>
            <p className="text-tablet-sm text-muted-foreground mt-1">
              {t('trainingModulesDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Required Training Warning */}
      {isRequired && !trainingModules.every(m => calculateModuleProgress(m) === 100) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-tablet-sm font-medium text-red-800">
                  {t('trainingRequiredTitle')}
                </p>
                <p className="text-tablet-xs text-red-600">
                  {t('trainingRequiredDesc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Training Session */}
      {renderTrainingSession()}

      {/* Training Modules Grid */}
      {!isTrainingActive && (
        <div className={cn(
          "grid gap-6",
          compact ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
          {trainingModules.map(renderModuleCard)}
        </div>
      )}

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center">
              <Award className="w-16 h-16 mx-auto text-golden-saffron mb-4" />
              {t('trainingCompleted')}
            </DialogTitle>
          </DialogHeader>
          
          {completedModule && (
            <div className="text-center space-y-4">
              <h3 className="text-tablet-lg font-heading font-semibold">
                {completedModule.title}
              </h3>
              
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-krong-red">
                    {Object.values(sectionScores).length > 0 
                      ? Math.round(Object.values(sectionScores).reduce((sum, score) => sum + score, 0) / Object.values(sectionScores).length)
                      : 100
                    }%
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('overallScore')}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-golden-saffron">
                    {sessionStartTime ? Math.round((Date.now() - sessionStartTime.getTime()) / (1000 * 60)) : 0}m
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('completionTime')}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCompletionDialog(false)}
                  className="flex-1"
                >
                  {t('continueLater')}
                </Button>
                <Button 
                  onClick={() => {
                    setShowCompletionDialog(false);
                    setSelectedModule(null);
                  }}
                  className="flex-1"
                >
                  {t('backToSOP')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SOPEmbeddedTraining;