'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GitBranch, 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  HelpCircle,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Play,
  Pause,
  FastForward,
  Clock,
  Target,
  TrendingUp,
  Zap,
  Settings
} from 'lucide-react';

type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';

interface Condition {
  id: string;
  field: string; // Field name to check (e.g., 'step_1_answer', 'user_role', 'location')
  operator: ConditionOperator;
  value: any;
  label?: string; // Human-readable description
}

interface BranchRule {
  id: string;
  name: string;
  conditions: Condition[];
  logic: 'AND' | 'OR'; // How to combine multiple conditions
  priority: number; // Higher priority rules are evaluated first
  description?: string;
}

interface DynamicStep {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  type: 'checkbox' | 'radio' | 'select' | 'text' | 'number' | 'boolean' | 'info';
  required: boolean;
  order: number;
  
  // Branching logic
  showConditions?: BranchRule[]; // Rules that determine if this step should be shown
  nextStepRules?: { ruleId: string; nextStepId: string | 'end' }[]; // Rules for next step selection
  
  // Step options (for radio, select, checkbox)
  options?: Array<{
    id: string;
    label: string;
    label_fr: string;
    value: any;
    nextStepOverride?: string; // Override next step for this option
  }>;
  
  // Validation
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customMessage?: string;
  };
  
  // Additional metadata
  estimatedTime?: number;
  category?: string;
  tags?: string[];
  isConditional?: boolean;
}

interface StepResponse {
  stepId: string;
  value: any;
  selectedOptions?: string[];
  timestamp: string;
  timeSpent: number;
}

interface DynamicChecklistBranchingProps {
  /** Array of dynamic steps with branching logic */
  steps: DynamicStep[];
  /** Initial step ID to start from */
  initialStepId?: string;
  /** Current user context for conditions */
  userContext?: Record<string, any>;
  /** Session data for conditions */
  sessionData?: Record<string, any>;
  /** Auto-advance after selection */
  autoAdvance?: boolean;
  /** Show branching visualization */
  showBranchingPath?: boolean;
  /** Enable step navigation */
  allowNavigation?: boolean;
  /** Show progress estimation */
  showProgress?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when step is completed */
  onStepComplete?: (stepId: string, response: StepResponse) => void;
  /** Callback when checklist is finished */
  onChecklistComplete?: (responses: StepResponse[]) => void;
  /** Callback when step changes */
  onStepChange?: (fromStepId: string, toStepId: string, reason: 'navigation' | 'branching' | 'completion') => void;
  /** Callback when branching occurs */
  onBranchingTriggered?: (stepId: string, triggeredRule: BranchRule, nextStepId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * DynamicChecklistBranching - Intelligent checklist with conditional logic and branching
 * 
 * Features:
 * - Dynamic step flow based on user responses and conditions
 * - Multiple condition types with logical operators (AND/OR)
 * - Smart branching with priority-based rule evaluation
 * - Real-time progress calculation for dynamic paths
 * - Context-aware step visibility and validation
 * - Step navigation with branching history
 * - Tablet-optimized responsive interface
 * - Accessibility support with ARIA labels
 * 
 * @param props DynamicChecklistBranchingProps
 * @returns JSX.Element
 */
const DynamicChecklistBranching: React.FC<DynamicChecklistBranchingProps> = ({
  steps,
  initialStepId,
  userContext = {},
  sessionData = {},
  autoAdvance = true,
  showBranchingPath = true,
  allowNavigation = true,
  showProgress = true,
  isLoading = false,
  onStepComplete,
  onChecklistComplete,
  onStepChange,
  onBranchingTriggered,
  className
}) => {
  const t = useTranslations('sop.dynamicChecklist');
  
  const [currentStepId, setCurrentStepId] = useState<string>(initialStepId || steps[0]?.id || '');
  const [responses, setResponses] = useState<Record<string, StepResponse>>({});
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  const [visibleSteps, setVisibleSteps] = useState<Set<string>>(new Set());
  const [currentValue, setCurrentValue] = useState<any>(null);
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());
  const [showBranchingTree, setShowBranchingTree] = useState(false);
  const [estimatedProgress, setEstimatedProgress] = useState(0);

  // Get current step
  const currentStep = useMemo(() => {
    return steps.find(step => step.id === currentStepId);
  }, [steps, currentStepId]);

  // Evaluate a single condition
  const evaluateCondition = useCallback((condition: Condition, context: Record<string, any>): boolean => {
    const fieldValue = context[condition.field];
    const conditionValue = condition.value;
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }, []);

  // Evaluate a branch rule
  const evaluateBranchRule = useCallback((rule: BranchRule, context: Record<string, any>): boolean => {
    if (rule.conditions.length === 0) return true;
    
    const results = rule.conditions.map(condition => evaluateCondition(condition, context));
    
    return rule.logic === 'AND' 
      ? results.every(result => result)
      : results.some(result => result);
  }, [evaluateCondition]);

  // Get the combined context for condition evaluation
  const getEvaluationContext = useCallback(() => {
    const responseValues = Object.entries(responses).reduce((acc, [stepId, response]) => {
      acc[stepId] = response.value;
      acc[`${stepId}_selected_options`] = response.selectedOptions;
      return acc;
    }, {} as Record<string, any>);
    
    return {
      ...userContext,
      ...sessionData,
      ...responseValues,
      current_step: currentStepId,
      completed_steps: Object.keys(responses),
      total_responses: Object.keys(responses).length
    };
  }, [responses, userContext, sessionData, currentStepId]);

  // Determine which steps should be visible based on current context
  const updateVisibleSteps = useCallback(() => {
    const context = getEvaluationContext();
    const visible = new Set<string>();
    
    steps.forEach(step => {
      if (!step.showConditions || step.showConditions.length === 0) {
        // No conditions means always visible
        visible.add(step.id);
      } else {
        // Check if any show condition is met
        const shouldShow = step.showConditions
          .sort((a, b) => b.priority - a.priority) // Sort by priority
          .some(rule => evaluateBranchRule(rule, context));
        
        if (shouldShow) {
          visible.add(step.id);
        }
      }
    });
    
    setVisibleSteps(visible);
  }, [steps, evaluateBranchRule, getEvaluationContext]);

  // Calculate estimated progress based on current path
  const calculateProgress = useCallback(() => {
    const context = getEvaluationContext();
    const completedSteps = Object.keys(responses).length;
    
    // Simple estimation: completed steps / visible steps
    const totalVisible = visibleSteps.size;
    const progress = totalVisible > 0 ? (completedSteps / totalVisible) * 100 : 0;
    
    setEstimatedProgress(Math.min(100, Math.max(0, progress)));
  }, [responses, visibleSteps, getEvaluationContext]);

  // Find the next step based on branching rules
  const findNextStep = useCallback((fromStepId: string, response: StepResponse): string | null => {
    const step = steps.find(s => s.id === fromStepId);
    if (!step) return null;
    
    const context = { ...getEvaluationContext(), [fromStepId]: response.value };
    
    // Check for option-specific next step override
    if (step.options && response.selectedOptions) {
      for (const optionId of response.selectedOptions) {
        const option = step.options.find(opt => opt.id === optionId);
        if (option?.nextStepOverride) {
          return option.nextStepOverride === 'end' ? null : option.nextStepOverride;
        }
      }
    }
    
    // Check step-level next step rules
    if (step.nextStepRules) {
      for (const { ruleId, nextStepId } of step.nextStepRules) {
        const rule = steps.find(s => s.nextStepRules?.some(r => r.ruleId === ruleId));
        // In a real implementation, you'd have a separate rules collection
        // For now, we'll use a simplified approach
        
        if (nextStepId === 'end') return null;
        
        // Check if the next step is visible
        if (visibleSteps.has(nextStepId)) {
          return nextStepId;
        }
      }
    }
    
    // Default: find the next visible step in order
    const currentIndex = steps.findIndex(s => s.id === fromStepId);
    for (let i = currentIndex + 1; i < steps.length; i++) {
      if (visibleSteps.has(steps[i].id)) {
        return steps[i].id;
      }
    }
    
    return null; // End of checklist
  }, [steps, visibleSteps, getEvaluationContext]);

  // Handle step completion
  const completeStep = useCallback((value: any, selectedOptions?: string[]) => {
    if (!currentStep) return;
    
    const response: StepResponse = {
      stepId: currentStep.id,
      value,
      selectedOptions,
      timestamp: new Date().toISOString(),
      timeSpent: Date.now() - stepStartTime
    };
    
    setResponses(prev => ({ ...prev, [currentStep.id]: response }));
    onStepComplete?.(currentStep.id, response);
    
    // Find next step
    const nextStepId = findNextStep(currentStep.id, response);
    
    if (nextStepId) {
      // Continue to next step
      setCurrentStepId(nextStepId);
      setStepHistory(prev => [...prev, currentStep.id]);
      setStepStartTime(Date.now());
      setCurrentValue(null);
      
      onStepChange?.(currentStep.id, nextStepId, 'branching');
      
      // Check if branching occurred
      const expectedNextStepIndex = steps.findIndex(s => s.id === currentStep.id) + 1;
      const expectedNextStep = steps[expectedNextStepIndex];
      
      if (expectedNextStep && expectedNextStep.id !== nextStepId) {
        // Branching occurred
        const rule: BranchRule = {
          id: 'dynamic',
          name: 'Dynamic Branching',
          conditions: [],
          logic: 'AND',
          priority: 1,
          description: `Branched from step ${currentStep.title} to ${steps.find(s => s.id === nextStepId)?.title}`
        };
        
        onBranchingTriggered?.(currentStep.id, rule, nextStepId);
      }
    } else {
      // Checklist complete
      const allResponses = Object.values({ ...responses, [currentStep.id]: response });
      onChecklistComplete?.(allResponses);
    }
  }, [
    currentStep, 
    stepStartTime, 
    onStepComplete, 
    findNextStep, 
    steps, 
    onStepChange, 
    onBranchingTriggered, 
    onChecklistComplete, 
    responses
  ]);

  // Handle value change
  const handleValueChange = useCallback((value: any, selectedOptions?: string[]) => {
    setCurrentValue(value);
    
    if (autoAdvance && currentStep) {
      // Auto-advance for certain step types
      if (currentStep.type === 'boolean' || 
          (currentStep.type === 'radio' && value !== null) ||
          (currentStep.type === 'select' && value !== null)) {
        setTimeout(() => completeStep(value, selectedOptions), 300);
      }
    }
  }, [autoAdvance, currentStep, completeStep]);

  // Navigation functions
  const goToPreviousStep = useCallback(() => {
    if (stepHistory.length > 0 && allowNavigation) {
      const previousStepId = stepHistory[stepHistory.length - 1];
      setCurrentStepId(previousStepId);
      setStepHistory(prev => prev.slice(0, -1));
      setStepStartTime(Date.now());
      
      // Restore previous value
      const previousResponse = responses[previousStepId];
      setCurrentValue(previousResponse?.value || null);
      
      onStepChange?.(currentStepId, previousStepId, 'navigation');
    }
  }, [stepHistory, allowNavigation, responses, currentStepId, onStepChange]);

  const restartChecklist = useCallback(() => {
    setCurrentStepId(initialStepId || steps[0]?.id || '');
    setResponses({});
    setStepHistory([]);
    setCurrentValue(null);
    setStepStartTime(Date.now());
  }, [initialStepId, steps]);

  // Update visible steps when context changes
  useEffect(() => {
    updateVisibleSteps();
  }, [updateVisibleSteps]);

  // Calculate progress when responses change
  useEffect(() => {
    calculateProgress();
  }, [calculateProgress]);

  // Initialize step start time
  useEffect(() => {
    setStepStartTime(Date.now());
  }, [currentStepId]);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-32 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentStep) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-jade-green mx-auto mb-4" />
          <h3 className="text-tablet-xl font-heading font-bold text-jade-green mb-2">
            {t('completion.title')}
          </h3>
          <p className="text-tablet-base font-body text-muted-foreground mb-4">
            {t('completion.message')}
          </p>
          <Button onClick={restartChecklist} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('restart')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress and Navigation */}
      {showProgress && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-krong-red" />
                {t('title')}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {currentStep.isConditional && (
                  <Badge variant="outline" className="text-tablet-sm">
                    <Zap className="w-3 h-3 mr-1" />
                    {t('conditional')}
                  </Badge>
                )}
                
                {showBranchingPath && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowBranchingTree(!showBranchingTree)}
                  >
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-tablet-sm text-muted-foreground">
                <span>
                  {t('progress.step')} {stepHistory.length + 1} 
                  {visibleSteps.size > 0 && ` / ~${visibleSteps.size}`}
                </span>
                <span>{Math.round(estimatedProgress)}% {t('progress.complete')}</span>
              </div>
              <Progress value={estimatedProgress} className="h-2" />
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Branching Tree Visualization */}
      {showBranchingTree && showBranchingPath && (
        <Card className="border-2 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-sm font-heading">
              {t('branchingPath')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-tablet-sm">
              {stepHistory.concat(currentStepId).map((stepId, index) => {
                const step = steps.find(s => s.id === stepId);
                const isLast = index === stepHistory.length;
                
                return (
                  <React.Fragment key={stepId}>
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-lg border",
                      isLast ? "bg-krong-red text-white" : "bg-white"
                    )}>
                      <Circle className="w-3 h-3" />
                      <span className="truncate max-w-32">
                        {step?.title || stepId}
                      </span>
                    </div>
                    {!isLast && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Step */}
      <Card className="border-2 border-krong-red bg-krong-red/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-tablet-sm font-mono">
                {stepHistory.length + 1}
              </Badge>
              <CardTitle className="text-tablet-lg font-heading">
                {currentStep.title}
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              {currentStep.estimatedTime && (
                <Badge variant="outline" className="text-tablet-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {currentStep.estimatedTime}m
                </Badge>
              )}
              
              {currentStep.required && (
                <Badge variant="destructive" className="text-tablet-xs">
                  {t('required')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Step Description */}
          <p className="text-tablet-base font-body leading-relaxed text-krong-black">
            {currentStep.description}
          </p>

          {/* Step Input */}
          <div className="space-y-4">
            {currentStep.type === 'checkbox' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={currentStep.id}
                  checked={currentValue === true}
                  onCheckedChange={(checked) => handleValueChange(checked)}
                />
                <Label htmlFor={currentStep.id} className="text-tablet-base">
                  {t('markComplete')}
                </Label>
              </div>
            )}

            {currentStep.type === 'boolean' && (
              <RadioGroup
                value={currentValue?.toString() || ''}
                onValueChange={(value) => handleValueChange(value === 'true')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="yes" />
                  <Label htmlFor="yes">{t('yes')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="no" />
                  <Label htmlFor="no">{t('no')}</Label>
                </div>
              </RadioGroup>
            )}

            {currentStep.type === 'radio' && currentStep.options && (
              <RadioGroup
                value={currentValue || ''}
                onValueChange={(value) => {
                  const selectedOption = currentStep.options?.find(opt => opt.value === value);
                  handleValueChange(value, selectedOption ? [selectedOption.id] : []);
                }}
              >
                {currentStep.options.map(option => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.id} />
                    <Label htmlFor={option.id} className="text-tablet-base">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentStep.type === 'select' && currentStep.options && (
              <Select
                value={currentValue || ''}
                onValueChange={(value) => {
                  const selectedOption = currentStep.options?.find(opt => opt.value === value);
                  handleValueChange(value, selectedOption ? [selectedOption.id] : []);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectOption')} />
                </SelectTrigger>
                <SelectContent>
                  {currentStep.options.map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {currentStep.type === 'info' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-tablet-sm text-blue-700">
                      {currentStep.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-border/40">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              {allowNavigation && stepHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousStep}
                >
                  {t('previous')}
                </Button>
              )}
            </div>

            {/* Progress Actions */}
            <div className="flex items-center gap-2">
              {!autoAdvance && currentStep.type !== 'info' && (
                <Button
                  onClick={() => completeStep(currentValue)}
                  disabled={currentStep.required && (currentValue === null || currentValue === undefined)}
                  className="bg-krong-red hover:bg-krong-red/90"
                >
                  {t('continue')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              
              {currentStep.type === 'info' && (
                <Button
                  onClick={() => completeStep(true)}
                  className="bg-krong-red hover:bg-krong-red/90"
                >
                  {t('continue')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Summary */}
      {Object.keys(responses).length > 0 && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-sm font-heading">
              {t('summary.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(responses).map(response => {
                const step = steps.find(s => s.id === response.stepId);
                return (
                  <div key={response.stepId} className="flex items-center justify-between text-tablet-sm">
                    <span className="font-medium">{step?.title}</span>
                    <span className="text-muted-foreground">
                      {typeof response.value === 'boolean' 
                        ? (response.value ? t('yes') : t('no'))
                        : String(response.value)
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DynamicChecklistBranching;