/**
 * Training Assessment Component
 * Interactive quiz system with bilingual support and progress tracking
 * Optimized for tablet experience with touch-friendly interactions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Award,
  TrendingUp,
  Target,
  Timer,
  Lightbulb,
  Star,
  Trophy
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

import { 
  useTrainingAssessment,
  useTrainingProgress,
  useTrainingCertificates 
} from '@/lib/stores/training-store';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

import type { 
  TrainingModule,
  TrainingQuestion, 
  TrainingAssessment as AssessmentType,
  TrainingQuestionResponse,
  QuestionType
} from '@/types/database';

interface TrainingAssessmentProps {
  moduleId: string;
  module?: TrainingModule;
  className?: string;
  onComplete?: (assessment: AssessmentType) => void;
  onCancel?: () => void;
}

interface QuestionState {
  questionId: string;
  answer: string;
  timeSpent: number;
  startTime: Date;
}

export function TrainingAssessment({ 
  moduleId, 
  module,
  className, 
  onComplete, 
  onCancel 
}: TrainingAssessmentProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  
  // Training store hooks
  const {
    currentAssessment,
    assessmentQuestions,
    userResponses,
    isLoadingAssessment,
    assessmentError,
    startAssessment,
    submitAnswer,
    submitAssessment,
    retakeAssessment,
  } = useTrainingAssessment();

  const { loadCertificates } = useTrainingCertificates();

  // Local state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [assessmentStartTime, setAssessmentStartTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [completedAssessment, setCompletedAssessment] = useState<AssessmentType | null>(null);
  const [showRetakeDialog, setShowRetakeDialog] = useState(false);
  const [showQuestionFeedback, setShowQuestionFeedback] = useState(false);
  const [feedbackQuestion, setFeedbackQuestion] = useState<TrainingQuestion | null>(null);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [instantFeedbackEnabled, setInstantFeedbackEnabled] = useState(true);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(true);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());

  // Initialize assessment
  useEffect(() => {
    const initializeAssessment = async () => {
      if (!currentAssessment || currentAssessment.module_id !== moduleId) {
        const success = await startAssessment(moduleId);
        if (!success) {
          toast({
            title: t('error.assessment_start_failed'),
            description: t('error.assessment_start_failed_desc'),
            variant: 'destructive',
          });
          return;
        }
      }
      
      setAssessmentStartTime(new Date());
      
      // Initialize question states
      const states: Record<string, QuestionState> = {};
      assessmentQuestions.forEach(question => {
        states[question.id] = {
          questionId: question.id,
          answer: '',
          timeSpent: 0,
          startTime: new Date(),
        };
      });
      setQuestionStates(states);
    };

    if (assessmentQuestions.length > 0) {
      initializeAssessment();
    }
  }, [moduleId, currentAssessment, assessmentQuestions, startAssessment, t]);

  // Assessment timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (assessmentStartTime && !showResults) {
      interval = setInterval(() => {
        const elapsed = Date.now() - assessmentStartTime.getTime();
        const maxTime = (module?.duration_minutes || 30) * 60 * 1000; // Convert to milliseconds
        const remaining = Math.max(0, maxTime - elapsed);
        
        setTimeRemaining(remaining);
        
        // Auto-submit when time runs out
        if (remaining === 0) {
          handleSubmitAssessment();
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [assessmentStartTime, showResults, module?.duration_minutes]);

  // Question timer
  useEffect(() => {
    const currentQuestion = assessmentQuestions[currentQuestionIndex];
    if (currentQuestion && questionStates[currentQuestion.id]) {
      const state = questionStates[currentQuestion.id];
      state.startTime = new Date();
      
      setQuestionStates(prev => ({
        ...prev,
        [currentQuestion.id]: state,
      }));
    }
  }, [currentQuestionIndex, assessmentQuestions, questionStates]);

  // Calculate question time spent
  const updateQuestionTimeSpent = useCallback((questionId: string) => {
    const state = questionStates[questionId];
    if (state) {
      const timeSpent = Math.round((Date.now() - state.startTime.getTime()) / 1000);
      setQuestionStates(prev => ({
        ...prev,
        [questionId]: {
          ...state,
          timeSpent: state.timeSpent + timeSpent,
        },
      }));
    }
  }, [questionStates]);

  // Handle answer selection
  const handleAnswerChange = (questionId: string, answer: string) => {
    const state = questionStates[questionId];
    if (state) {
      updateQuestionTimeSpent(questionId);
      
      setQuestionStates(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          answer,
          startTime: new Date(),
        },
      }));

      // Submit answer to store
      submitAnswer(questionId, answer, state.timeSpent + 1);
    }
  };

  // Navigate to question
  const navigateToQuestion = (index: number) => {
    const currentQuestion = assessmentQuestions[currentQuestionIndex];
    if (currentQuestion) {
      updateQuestionTimeSpent(currentQuestion.id);
    }
    
    setCurrentQuestionIndex(index);
  };

  // Handle assessment submission
  const handleSubmitAssessment = async () => {
    // Update time spent for all questions
    assessmentQuestions.forEach(question => {
      updateQuestionTimeSpent(question.id);
    });

    const success = await submitAssessment();
    
    if (success && currentAssessment) {
      setCompletedAssessment(currentAssessment);
      setShowResults(true);
      
      // Load certificates if passed
      if (currentAssessment.status === 'passed') {
        await loadCertificates();
        
        toast({
          title: t('training.assessment_passed'),
          description: t('training.assessment_passed_desc'),
          variant: 'default',
        });
      } else {
        toast({
          title: t('training.assessment_failed'),
          description: t('training.assessment_failed_desc'),
          variant: 'destructive',
        });
      }
      
      onComplete?.(currentAssessment);
    } else {
      toast({
        title: t('error.assessment_submit_failed'),
        description: t('error.assessment_submit_failed_desc'),
        variant: 'destructive',
      });
    }
  };

  // Handle retake
  const handleRetakeAssessment = async () => {
    if (currentAssessment) {
      const success = await retakeAssessment(currentAssessment.id);
      if (success) {
        setShowRetakeDialog(false);
        setShowResults(false);
        setCurrentQuestionIndex(0);
        setAssessmentStartTime(new Date());
        
        // Reset question states
        const states: Record<string, QuestionState> = {};
        assessmentQuestions.forEach(question => {
          states[question.id] = {
            questionId: question.id,
            answer: '',
            timeSpent: 0,
            startTime: new Date(),
          };
        });
        setQuestionStates(states);
      }
    }
  };

  // Format time display
  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get question component based on type
  const renderQuestion = (question: TrainingQuestion, answer: string) => {
    const questionText = locale === 'th' ? question.question_th : question.question;
    const options = locale === 'th' ? question.options_th : question.options;

    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{questionText}</h3>
            <RadioGroup
              value={answer}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="space-y-3"
            >
              {options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`}
                    className="flex-1 cursor-pointer p-3 rounded-lg border hover:bg-muted/50"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{questionText}</h3>
            <RadioGroup
              value={answer}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="flex space-x-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">
                  {t('common.true')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">
                  {t('common.false')}
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 'short_answer':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{questionText}</h3>
            <Textarea
              value={answer}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={t('training.enter_answer')}
              rows={4}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (assessmentError) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <XCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('error.assessment_error')}</h3>
          <p className="text-muted-foreground mb-4">{assessmentError}</p>
          <div className="flex space-x-3 justify-center">
            <Button variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => startAssessment(moduleId)}>
              {t('training.retry_assessment')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingAssessment || !currentAssessment) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <Clock className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('training.loading_assessment')}</h3>
        </CardContent>
      </Card>
    );
  }

  if (showInstructions) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t('training.assessment_instructions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-3">
                <HelpCircle className="h-8 w-8 text-blue-600 mx-auto" />
              </div>
              <h3 className="font-semibold mb-2">{t('training.total_questions')}</h3>
              <p className="text-2xl font-bold text-primary">{assessmentQuestions.length}</p>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-3">
                <Target className="h-8 w-8 text-green-600 mx-auto" />
              </div>
              <h3 className="font-semibold mb-2">{t('training.passing_score')}</h3>
              <p className="text-2xl font-bold text-primary">{module?.passing_score || 80}%</p>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-3">
                <Timer className="h-8 w-8 text-orange-600 mx-auto" />
              </div>
              <h3 className="font-semibold mb-2">{t('training.time_limit')}</h3>
              <p className="text-2xl font-bold text-primary">
                {module?.duration_minutes || 30} {t('common.minutes')}
              </p>
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h4 className="font-semibold flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
              {t('training.important_notes')}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>• {t('training.instruction_1')}</li>
              <li>• {t('training.instruction_2')}</li>
              <li>• {t('training.instruction_3')}</li>
              <li>• {t('training.instruction_4')}</li>
            </ul>
          </div>

          <div className="flex space-x-4 justify-center">
            <Button variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => setShowInstructions(false)} size="lg">
              {t('training.start_assessment')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showResults && completedAssessment) {
    const passed = completedAssessment.status === 'passed';
    const scorePercentage = completedAssessment.score_percentage;
    const passingScore = module?.passing_score || 80;

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            <div className="mb-4">
              {passed ? (
                <Trophy className="h-16 w-16 mx-auto text-yellow-500" />
              ) : (
                <XCircle className="h-16 w-16 mx-auto text-red-500" />
              )}
            </div>
            {passed ? t('training.assessment_passed') : t('training.assessment_failed')}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                <span className={passed ? 'text-green-600' : 'text-red-600'}>
                  {scorePercentage}%
                </span>
              </div>
              <p className="text-muted-foreground">{t('training.your_score')}</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold mb-2 text-primary">
                {completedAssessment.correct_answers}/{completedAssessment.total_questions}
              </div>
              <p className="text-muted-foreground">{t('training.correct_answers')}</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold mb-2 text-blue-600">
                {completedAssessment.time_spent_minutes}
              </div>
              <p className="text-muted-foreground">{t('training.time_spent')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>{t('training.passing_score')}: {passingScore}%</span>
              <Badge variant={passed ? 'default' : 'destructive'}>
                {passed ? t('common.passed') : t('common.failed')}
              </Badge>
            </div>
            
            <Progress 
              value={scorePercentage} 
              className={`h-4 ${passed ? 'text-green-600' : 'text-red-600'}`} 
            />
          </div>

          {!passed && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h4 className="font-semibold text-orange-800">
                  {t('training.improvement_needed')}
                </h4>
              </div>
              <p className="text-orange-700 text-sm">
                {t('training.retake_suggestion')}
              </p>
            </div>
          )}

          <div className="flex space-x-4 justify-center">
            <Button 
              variant="outline" 
              onClick={() => setShowExplanation(true)}
            >
              {t('training.view_explanations')}
            </Button>
            
            {!passed && (
              <Button onClick={() => setShowRetakeDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('training.retake_assessment')}
              </Button>
            )}
            
            {passed && (
              <Button onClick={() => onComplete?.(completedAssessment)}>
                <Award className="h-4 w-4 mr-2" />
                {t('training.view_certificate')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const currentAnswer = questionStates[currentQuestion?.id]?.answer || '';
  const progress = ((currentQuestionIndex + 1) / assessmentQuestions.length) * 100;

  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {t('training.assessment')} - {module?.title || t('training.training_module')}
              </CardTitle>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                <span>{t('training.question_progress', { 
                  current: currentQuestionIndex + 1, 
                  total: assessmentQuestions.length 
                })}</span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(timeRemaining)}</span>
                </span>
              </div>
            </div>
            
            <Button variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          </div>
          
          <Progress value={progress} className="h-3 mt-4" />
        </CardHeader>
      </Card>

      {/* Question Content */}
      <Card>
        <CardContent className="p-8">
          {currentQuestion && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {t('training.question')} {currentQuestionIndex + 1}
                </Badge>
                <div className="flex items-center space-x-2">
                  <Badge variant={currentQuestion.difficulty === 'easy' ? 'default' : 
                                 currentQuestion.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                    {t(`training.difficulty_${currentQuestion.difficulty}`)}
                  </Badge>
                  <Badge variant="outline">
                    {currentQuestion.points} {t('training.points')}
                  </Badge>
                </div>
              </div>

              {renderQuestion(currentQuestion, currentAnswer)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={currentQuestionIndex === 0}
              onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
            >
              {t('training.previous_question')}
            </Button>

            <div className="flex items-center space-x-2">
              {assessmentQuestions.map((_, index) => (
                <Button
                  key={index}
                  variant={index === currentQuestionIndex ? 'default' : 'outline'}
                  size="sm"
                  className="w-10 h-10 p-0"
                  onClick={() => navigateToQuestion(index)}
                >
                  {index + 1}
                </Button>
              ))}
            </div>

            {currentQuestionIndex === assessmentQuestions.length - 1 ? (
              <Button onClick={handleSubmitAssessment} size="lg">
                {t('training.submit_assessment')}
              </Button>
            ) : (
              <Button
                onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
              >
                {t('training.next_question')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Retake Dialog */}
      <Dialog open={showRetakeDialog} onOpenChange={setShowRetakeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('training.retake_assessment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{t('training.retake_confirmation')}</p>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowRetakeDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleRetakeAssessment}>
                {t('training.confirm_retake')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TrainingAssessment;