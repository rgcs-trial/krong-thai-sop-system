'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Camera,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  Shield
} from 'lucide-react';

interface SOPStep {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  order: number;
  estimated_time: number; // in minutes
  is_critical: boolean;
  requires_photo: boolean;
  requires_signature: boolean;
  safety_notes?: string[];
  tips?: string[];
  equipment_needed?: string[];
}

interface StepProgress {
  step_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  time_spent: number; // in seconds
  notes?: string;
  photo_urls?: string[];
  signature_data?: string;
}

interface SOPStepChecklistProps {
  /** Array of SOP steps */
  steps: SOPStep[];
  /** Current progress for each step */
  progress: StepProgress[];
  /** Allow step reordering */
  allowReorder?: boolean;
  /** Show time tracking */
  showTimeTracking?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Auto-advance to next step */
  autoAdvance?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when step status changes */
  onStepStatusChange?: (stepId: string, status: StepProgress['status']) => void;
  /** Callback when photo is required */
  onPhotoCapture?: (stepId: string) => void;
  /** Callback when signature is required */
  onSignatureCapture?: (stepId: string) => void;
  /** Callback when notes are added */
  onNotesUpdate?: (stepId: string, notes: string) => void;
  /** Callback when time tracking starts/stops */
  onTimeTrackingChange?: (stepId: string, action: 'start' | 'pause' | 'reset') => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SOPStepChecklist - Interactive step-by-step checklist for SOP procedures
 * 
 * Features:
 * - Touch-friendly step completion interface
 * - Real-time progress tracking with visual indicators
 * - Time tracking for each step with start/pause/reset
 * - Photo and signature capture integration
 * - Safety notes and tips display
 * - Critical step highlighting
 * - Collapsible step details
 * - Accessibility support with keyboard navigation
 * - Tablet-optimized responsive design
 * 
 * @param props SOPStepChecklistProps
 * @returns JSX.Element
 */
const SOPStepChecklist: React.FC<SOPStepChecklistProps> = ({
  steps,
  progress,
  allowReorder = false,
  showTimeTracking = true,
  showProgress = true,
  autoAdvance = false,
  isLoading = false,
  onStepStatusChange,
  onPhotoCapture,
  onSignatureCapture,
  onNotesUpdate,
  onTimeTrackingChange,
  className
}) => {
  const t = useTranslations('sop.checklist');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [currentTimer, setCurrentTimer] = useState<{ stepId: string; startTime: number } | null>(null);

  // Calculate overall progress
  const completedSteps = progress.filter(p => p.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Get progress for a specific step
  const getStepProgress = useCallback((stepId: string): StepProgress => {
    return progress.find(p => p.step_id === stepId) || {
      step_id: stepId,
      status: 'pending',
      time_spent: 0
    };
  }, [progress]);

  // Toggle step expansion
  const toggleStepExpansion = useCallback((stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  // Handle step status change
  const handleStepStatusChange = useCallback((stepId: string, newStatus: StepProgress['status']) => {
    onStepStatusChange?.(stepId, newStatus);
    
    // Auto-advance to next step if enabled
    if (autoAdvance && newStatus === 'completed') {
      const currentIndex = steps.findIndex(s => s.id === stepId);
      if (currentIndex < steps.length - 1) {
        const nextStep = steps[currentIndex + 1];
        const nextProgress = getStepProgress(nextStep.id);
        if (nextProgress.status === 'pending') {
          setTimeout(() => {
            onStepStatusChange?.(nextStep.id, 'in_progress');
          }, 500);
        }
      }
    }
  }, [onStepStatusChange, autoAdvance, steps, getStepProgress]);

  // Handle time tracking
  const handleTimeTracking = useCallback((stepId: string, action: 'start' | 'pause' | 'reset') => {
    onTimeTrackingChange?.(stepId, action);
    
    if (action === 'start') {
      setCurrentTimer({ stepId, startTime: Date.now() });
    } else {
      setCurrentTimer(null);
    }
  }, [onTimeTrackingChange]);

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get step status icon
  const getStatusIcon = useCallback((status: StepProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-jade-green" />;
      case 'in_progress':
        return <Circle className="w-6 h-6 text-golden-saffron animate-pulse" />;
      case 'skipped':
        return <Circle className="w-6 h-6 text-gray-400" />;
      default:
        return <Circle className="w-6 h-6 text-muted-foreground" />;
    }
  }, []);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Progress Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        {/* Steps Skeleton */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded flex-1 animate-pulse" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overall Progress */}
      {showProgress && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center justify-between">
              {t('progress.title')}
              <Badge variant="secondary" className="text-tablet-sm">
                {completedSteps}/{totalSteps}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <Progress value={progressPercentage} className="h-4" />
              <div className="flex justify-between text-tablet-sm text-muted-foreground">
                <span>{t('progress.completed', { count: completedSteps })}</span>
                <span>{Math.round(progressPercentage)}% {t('progress.complete')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const stepProgress = getStepProgress(step.id);
          const isExpanded = expandedSteps.has(step.id);
          const isActive = stepProgress.status === 'in_progress';
          const isCompleted = stepProgress.status === 'completed';
          const isCritical = step.is_critical;

          return (
            <Card 
              key={step.id}
              className={cn(
                "border-2 transition-all duration-200",
                isActive && "border-krong-red bg-krong-red/5",
                isCompleted && "border-jade-green bg-jade-green/5",
                isCritical && !isCompleted && "border-red-500 bg-red-50"
              )}
            >
              <CardHeader 
                className={cn(
                  "pb-3 cursor-pointer hover:bg-gray-50",
                  "touch-manipulation select-none"
                )}
                onClick={() => toggleStepExpansion(step.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Step Status */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(stepProgress.status)}
                  </div>

                  {/* Step Number */}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-tablet-sm font-mono w-12 justify-center",
                      isCompleted && "bg-jade-green text-white",
                      isActive && "bg-krong-red text-white"
                    )}
                  >
                    {step.order}
                  </Badge>

                  {/* Step Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "text-tablet-lg font-heading font-semibold leading-tight",
                      isCompleted && "text-jade-green",
                      isActive && "text-krong-red"
                    )}>
                      {step.title}
                    </h3>
                    
                    {/* Critical Step Indicator */}
                    {isCritical && (
                      <Badge variant="destructive" className="text-tablet-xs mt-1">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {t('critical')}
                      </Badge>
                    )}
                  </div>

                  {/* Time Estimate */}
                  <div className="flex items-center gap-2 text-tablet-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{step.estimated_time}m</span>
                  </div>

                  {/* Expand Toggle */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="flex-shrink-0"
                    aria-label={isExpanded ? t('collapse') : t('expand')}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Step Description */}
                    <p className="text-tablet-base font-body leading-relaxed text-krong-black">
                      {step.description}
                    </p>

                    {/* Equipment Needed */}
                    {step.equipment_needed && step.equipment_needed.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-tablet-sm font-body font-semibold text-krong-black flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          {t('equipmentNeeded')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {step.equipment_needed.map((equipment, idx) => (
                            <Badge key={idx} variant="outline" className="text-tablet-xs">
                              {equipment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Safety Notes */}
                    {step.safety_notes && step.safety_notes.length > 0 && (
                      <div className="space-y-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="text-tablet-sm font-body font-semibold text-red-700 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {t('safetyNotes')}
                        </h4>
                        <ul className="space-y-1">
                          {step.safety_notes.map((note, idx) => (
                            <li key={idx} className="text-tablet-sm text-red-600 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tips */}
                    {step.tips && step.tips.length > 0 && (
                      <div className="space-y-2 p-4 bg-golden-saffron/10 border border-golden-saffron/30 rounded-lg">
                        <h4 className="text-tablet-sm font-body font-semibold text-golden-saffron flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          {t('tips')}
                        </h4>
                        <ul className="space-y-1">
                          {step.tips.map((tip, idx) => (
                            <li key={idx} className="text-tablet-sm text-muted-foreground">
                              • {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-border/40">
                      {/* Status Control */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={stepProgress.status === 'completed'}
                          onCheckedChange={(checked) => {
                            handleStepStatusChange(
                              step.id, 
                              checked ? 'completed' : 'pending'
                            );
                          }}
                          className="w-5 h-5"
                        />
                        <span className="text-tablet-sm font-body">
                          {t('markComplete')}
                        </span>
                      </div>

                      {/* Time Tracking */}
                      {showTimeTracking && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTimeTracking(
                              step.id, 
                              stepProgress.status === 'in_progress' ? 'pause' : 'start'
                            )}
                            disabled={stepProgress.status === 'completed'}
                          >
                            {stepProgress.status === 'in_progress' ? (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                {t('pause')}
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                {t('start')}
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTimeTracking(step.id, 'reset')}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('reset')}
                          </Button>
                          
                          <span className="text-tablet-sm font-mono">
                            {formatTime(stepProgress.time_spent)}
                          </span>
                        </div>
                      )}

                      {/* Photo Capture */}
                      {step.requires_photo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPhotoCapture?.(step.id)}
                          className="flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          {t('takePhoto')}
                        </Button>
                      )}

                      {/* Signature Capture */}
                      {step.requires_signature && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSignatureCapture?.(step.id)}
                          className="flex items-center gap-2"
                        >
                          {t('addSignature')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Completion Summary */}
      {completedSteps === totalSteps && totalSteps > 0 && (
        <Card className="border-2 border-jade-green bg-jade-green/5">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-jade-green mx-auto mb-4" />
            <h3 className="text-tablet-xl font-heading font-bold text-jade-green mb-2">
              {t('completion.title')}
            </h3>
            <p className="text-tablet-base font-body text-muted-foreground">
              {t('completion.message')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SOPStepChecklist;