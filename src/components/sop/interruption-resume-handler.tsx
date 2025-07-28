'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Pause, 
  Play, 
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Users,
  Utensils,
  AlertCircle,
  BookOpen,
  Timer,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Save,
  X,
  PlusCircle,
  MinusCircle,
  Layers,
  History,
  Target,
  Zap,
  Shield,
  Bell,
  BellOff,
  Settings,
  Camera,
  Mic,
  FileText,
  Calendar
} from 'lucide-react';

interface InterruptionEvent {
  id: string;
  type: 'customer_request' | 'phone_call' | 'equipment_issue' | 'urgent_task' | 'staff_question' | 'delivery' | 'inspection' | 'emergency' | 'break' | 'other';
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_time: Date;
  end_time?: Date;
  duration?: number; // milliseconds
  notes?: string;
  impact_assessment?: {
    workflow_disruption: 1 | 2 | 3 | 4 | 5;
    safety_concern: boolean;
    time_lost: number; // minutes
    quality_impact: 'none' | 'minimal' | 'moderate' | 'significant';
  };
  resolution?: {
    action_taken: string;
    follow_up_required: boolean;
    follow_up_notes?: string;
  };
}

interface WorkflowState {
  sop_id: string;
  current_step_index: number;
  current_step_id: string;
  step_progress: number; // 0-100
  context_notes: string;
  time_spent: number; // milliseconds
  completion_percentage: number;
  last_checkpoint: {
    step_index: number;
    timestamp: Date;
    context: string;
  };
}

interface ResumeGuidance {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  priority: 'high' | 'medium' | 'low';
  action_items: Array<{
    id: string;
    task: string;
    task_fr: string;
    completed: boolean;
    estimated_time: number; // minutes
  }>;
  safety_checks?: Array<{
    id: string;
    check: string;
    check_fr: string;
    critical: boolean;
    completed: boolean;
  }>;
}

interface InterruptionResumeHandlerProps {
  /** Current SOP workflow state */
  workflowState: WorkflowState;
  /** SOP information */
  sopData: {
    id: string;
    title: string;
    steps: Array<{
      id: string;
      name: string;
      name_fr: string;
      instructions: string;
      safety_critical: boolean;
      estimated_time: number;
      checkpoints?: string[];
    }>;
  };
  /** Current user information */
  userProfile: {
    id: string;
    name: string;
    role: string;
  };
  /** Enable auto-save of workflow state */
  enableAutoSave?: boolean;
  /** Auto-save interval in seconds */
  autoSaveInterval?: number;
  /** Enable interruption alerts */
  enableInterruptionAlerts?: boolean;
  /** Maximum interruption duration before alert (minutes) */
  maxInterruptionDuration?: number;
  /** Callback when workflow is paused */
  onWorkflowPause?: (reason: string, interruptionEvent: InterruptionEvent) => void;
  /** Callback when workflow is resumed */
  onWorkflowResume?: (resumeGuidance: ResumeGuidance) => void;
  /** Callback when workflow state is saved */
  onStateSave?: (state: WorkflowState) => void;
  /** Callback when interruption is logged */
  onInterruptionLog?: (interruption: InterruptionEvent) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * InterruptionResumeHandler - Intelligent workflow pause/resume system for busy restaurant environment
 * 
 * Features:
 * - Smart workflow state preservation with context capture
 * - Categorized interruption tracking with priority levels
 * - Intelligent resume guidance with safety checks
 * - Impact assessment and time tracking
 * - Auto-save and checkpoint system
 * - Restaurant-specific interruption types (orders, calls, emergencies)
 * - Safety-critical step protection and validation
 * - Performance impact analysis and reporting
 * - Multi-language support for international staff
 * - Integration with restaurant communication systems
 * 
 * @param props InterruptionResumeHandlerProps
 * @returns JSX.Element
 */
const InterruptionResumeHandler: React.FC<InterruptionResumeHandlerProps> = ({
  workflowState,
  sopData,
  userProfile,
  enableAutoSave = true,
  autoSaveInterval = 30,
  enableInterruptionAlerts = true,
  maxInterruptionDuration = 15,
  onWorkflowPause,
  onWorkflowResume,
  onStateSave,
  onInterruptionLog,
  className
}) => {
  const t = useTranslations('sop.interruptionHandler');
  
  const [isPaused, setIsPaused] = useState(false);
  const [currentInterruption, setCurrentInterruption] = useState<InterruptionEvent | null>(null);
  const [interruptionHistory, setInterruptionHistory] = useState<InterruptionEvent[]>([]);
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeGuidance, setResumeGuidance] = useState<ResumeGuidance | null>(null);
  const [interruptionForm, setInterruptionForm] = useState({
    type: 'other' as InterruptionEvent['type'],
    reason: '',
    priority: 'medium' as InterruptionEvent['priority'],
    notes: ''
  });
  const [savedStates, setSavedStates] = useState<WorkflowState[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(enableInterruptionAlerts);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interruptionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseStartTimeRef = useRef<Date | null>(null);

  // Interruption type configurations
  const interruptionTypes = useMemo(() => [
    { 
      value: 'customer_request', 
      label: t('interruptionTypes.customerRequest'), 
      priority: 'high',
      icon: <Users className="w-4 h-4" />,
      color: 'text-krong-red'
    },
    { 
      value: 'phone_call', 
      label: t('interruptionTypes.phoneCall'), 
      priority: 'medium',
      icon: <Phone className="w-4 h-4" />,
      color: 'text-blue-600'
    },
    { 
      value: 'equipment_issue', 
      label: t('interruptionTypes.equipmentIssue'), 
      priority: 'high',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-red-600'
    },
    { 
      value: 'urgent_task', 
      label: t('interruptionTypes.urgentTask'), 
      priority: 'high',
      icon: <Zap className="w-4 h-4" />,
      color: 'text-golden-saffron'
    },
    { 
      value: 'staff_question', 
      label: t('interruptionTypes.staffQuestion'), 
      priority: 'medium',
      icon: <Users className="w-4 h-4" />,
      color: 'text-green-600'
    },
    { 
      value: 'delivery', 
      label: t('interruptionTypes.delivery'), 
      priority: 'medium',
      icon: <Utensils className="w-4 h-4" />,
      color: 'text-purple-600'
    },
    { 
      value: 'inspection', 
      label: t('interruptionTypes.inspection'), 
      priority: 'critical',
      icon: <Shield className="w-4 h-4" />,
      color: 'text-red-700'
    },
    { 
      value: 'emergency', 
      label: t('interruptionTypes.emergency'), 
      priority: 'critical',
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'text-red-800'
    },
    { 
      value: 'break', 
      label: t('interruptionTypes.break'), 
      priority: 'low',
      icon: <Timer className="w-4 h-4" />,
      color: 'text-gray-600'
    },
    { 
      value: 'other', 
      label: t('interruptionTypes.other'), 
      priority: 'medium',
      icon: <FileText className="w-4 h-4" />,
      color: 'text-gray-500'
    }
  ], [t]);

  // Auto-save workflow state
  const saveWorkflowState = useCallback(() => {
    const stateToSave = {
      ...workflowState,
      last_checkpoint: {
        step_index: workflowState.current_step_index,
        timestamp: new Date(),
        context: workflowState.context_notes
      }
    };
    
    setSavedStates(prev => [stateToSave, ...prev.slice(0, 4)]); // Keep last 5 states
    onStateSave?.(stateToSave);
  }, [workflowState, onStateSave]);

  // Setup auto-save timer
  useEffect(() => {
    if (enableAutoSave && !isPaused) {
      autoSaveTimerRef.current = setInterval(saveWorkflowState, autoSaveInterval * 1000);
    } else {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [enableAutoSave, autoSaveInterval, saveWorkflowState, isPaused]);

  // Generate resume guidance based on workflow state and interruption
  const generateResumeGuidance = useCallback((interruption: InterruptionEvent): ResumeGuidance => {
    const currentStep = sopData.steps[workflowState.current_step_index];
    const interruptionDuration = interruption.duration || 0;
    const longInterruption = interruptionDuration > 10 * 60 * 1000; // 10+ minutes
    
    const actionItems = [];
    const safetyChecks = [];
    
    // Standard resume actions
    actionItems.push({
      id: 'review-current-step',
      task: `Review current step: ${currentStep?.name || 'Unknown'}`,
      task_fr: `Réviser l'étape actuelle: ${currentStep?.name || 'Inconnue'}`,
      completed: false,
      estimated_time: 2
    });
    
    // Add context-specific actions based on interruption type
    if (interruption.type === 'equipment_issue') {
      actionItems.push({
        id: 'verify-equipment',
        task: 'Verify all equipment is functioning properly',
        task_fr: 'Vérifier que tout l\'équipement fonctionne correctement',
        completed: false,
        estimated_time: 3
      });
      
      safetyChecks.push({
        id: 'equipment-safety',
        check: 'Equipment safety systems operational',
        check_fr: 'Systèmes de sécurité des équipements opérationnels',
        critical: true,
        completed: false
      });
    }
    
    if (longInterruption) {
      actionItems.push({
        id: 'check-materials',
        task: 'Verify all materials and ingredients are still available and fresh',
        task_fr: 'Vérifier que tous les matériaux et ingrédients sont encore disponibles et frais',
        completed: false,
        estimated_time: 5
      });
    }
    
    if (currentStep?.safety_critical) {
      safetyChecks.push({
        id: 'safety-protocols',
        check: 'Review safety protocols for current step',
        check_fr: 'Réviser les protocoles de sécurité pour l\'étape actuelle',
        critical: true,
        completed: false
      });
    }
    
    // Temperature-sensitive checks for food service
    if (sopData.title.toLowerCase().includes('food') || sopData.title.toLowerCase().includes('cooking')) {
      actionItems.push({
        id: 'temperature-check',
        task: 'Check food temperatures and storage conditions',
        task_fr: 'Vérifier les températures des aliments et les conditions de stockage',
        completed: false,
        estimated_time: 3
      });
    }
    
    return {
      id: `guidance-${Date.now()}`,
      title: 'Resume Workflow Guidance',
      title_fr: 'Guide de Reprise du Flux de Travail',
      description: `Resume from step ${workflowState.current_step_index + 1} after ${interruption.type.replace('_', ' ')} interruption`,
      description_fr: `Reprendre à partir de l'étape ${workflowState.current_step_index + 1} après interruption ${interruption.type.replace('_', ' ')}`,
      priority: currentStep?.safety_critical ? 'high' : 'medium',
      action_items: actionItems,
      safety_checks: safetyChecks.length > 0 ? safetyChecks : undefined
    };
  }, [workflowState, sopData]);

  // Pause workflow
  const pauseWorkflow = useCallback((quickPause = false) => {
    if (quickPause) {
      // Quick pause without detailed form
      const interruption: InterruptionEvent = {
        id: `interruption-${Date.now()}`,
        type: 'other',
        reason: 'Quick pause',
        priority: 'low',
        start_time: new Date(),
        notes: 'Quick workflow pause'
      };
      
      setCurrentInterruption(interruption);
      setIsPaused(true);
      pauseStartTimeRef.current = new Date();
      
      onWorkflowPause?.('Quick pause', interruption);
      
      // Start interruption timer for alerts
      if (alertsEnabled && maxInterruptionDuration > 0) {
        interruptionTimerRef.current = setTimeout(() => {
          // Alert for long interruption
          console.log('Long interruption alert');
        }, maxInterruptionDuration * 60 * 1000);
      }
    } else {
      setShowInterruptionModal(true);
    }
  }, [onWorkflowPause, alertsEnabled, maxInterruptionDuration]);

  // Complete interruption logging
  const completeInterruption = useCallback(() => {
    const now = new Date();
    const startTime = pauseStartTimeRef.current || now;
    const duration = now.getTime() - startTime.getTime();
    
    const interruption: InterruptionEvent = {
      id: `interruption-${Date.now()}`,
      type: interruptionForm.type,
      reason: interruptionForm.reason,
      priority: interruptionForm.priority,
      start_time: startTime,
      end_time: now,
      duration,
      notes: interruptionForm.notes,
      impact_assessment: {
        workflow_disruption: duration > 15 * 60 * 1000 ? 4 : duration > 5 * 60 * 1000 ? 3 : 2,
        safety_concern: interruptionForm.type === 'emergency' || interruptionForm.type === 'equipment_issue',
        time_lost: Math.round(duration / (60 * 1000)),
        quality_impact: duration > 20 * 60 * 1000 ? 'significant' : 
                       duration > 10 * 60 * 1000 ? 'moderate' : 
                       duration > 5 * 60 * 1000 ? 'minimal' : 'none'
      }
    };
    
    setCurrentInterruption(interruption);
    setInterruptionHistory(prev => [interruption, ...prev]);
    setIsPaused(true);
    pauseStartTimeRef.current = startTime;
    
    onWorkflowPause?.(interruptionForm.reason, interruption);
    onInterruptionLog?.(interruption);
    
    setShowInterruptionModal(false);
    setInterruptionForm({
      type: 'other',
      reason: '',
      priority: 'medium',
      notes: ''
    });
    
    // Clear interruption timer
    if (interruptionTimerRef.current) {
      clearTimeout(interruptionTimerRef.current);
      interruptionTimerRef.current = null;
    }
  }, [interruptionForm, onWorkflowPause, onInterruptionLog]);

  // Resume workflow
  const resumeWorkflow = useCallback(() => {
    if (!currentInterruption) return;
    
    // Complete the interruption record
    const now = new Date();
    const completedInterruption = {
      ...currentInterruption,
      end_time: now,
      duration: now.getTime() - currentInterruption.start_time.getTime()
    };
    
    // Generate resume guidance
    const guidance = generateResumeGuidance(completedInterruption);
    setResumeGuidance(guidance);
    setShowResumeModal(true);
    
    // Update interruption history
    setInterruptionHistory(prev => 
      prev.map(int => int.id === currentInterruption.id ? completedInterruption : int)
    );
    
    setCurrentInterruption(null);
    setIsPaused(false);
    pauseStartTimeRef.current = null;
    
    onWorkflowResume?.(guidance);
  }, [currentInterruption, generateResumeGuidance, onWorkflowResume]);

  // Skip resume guidance
  const skipResumeGuidance = useCallback(() => {
    setShowResumeModal(false);
    setResumeGuidance(null);
  }, []);

  // Complete resume guidance
  const completeResumeGuidance = useCallback(() => {
    if (resumeGuidance) {
      // Mark all action items as completed
      const completedGuidance = {
        ...resumeGuidance,
        action_items: resumeGuidance.action_items.map(item => ({ ...item, completed: true })),
        safety_checks: resumeGuidance.safety_checks?.map(check => ({ ...check, completed: true }))
      };
      setResumeGuidance(completedGuidance);
    }
    
    setShowResumeModal(false);
    setResumeGuidance(null);
  }, [resumeGuidance]);

  // Get interruption type info
  const getInterruptionTypeInfo = useCallback((type: InterruptionEvent['type']) => {
    return interruptionTypes.find(t => t.value === type) || interruptionTypes[interruptionTypes.length - 1];
  }, [interruptionTypes]);

  // Calculate total interruption time
  const totalInterruptionTime = useMemo(() => {
    return interruptionHistory.reduce((total, interruption) => {
      return total + (interruption.duration || 0);
    }, 0);
  }, [interruptionHistory]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Control Card */}
      <Card className={cn("border-2", isPaused ? "border-golden-saffron bg-golden-saffron/5" : "border-border")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              {isPaused ? (
                <Pause className="w-6 h-6 text-golden-saffron" />
              ) : (
                <Play className="w-6 h-6 text-jade-green" />
              )}
              {t('workflowControl')}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <Badge 
                variant={isPaused ? "default" : "secondary"}
                className={cn(
                  "text-tablet-sm",
                  isPaused ? "bg-golden-saffron text-white" : "bg-jade-green text-white"
                )}
              >
                {isPaused ? t('paused') : t('active')}
              </Badge>
              
              {/* Interruption count */}
              {interruptionHistory.length > 0 && (
                <Badge variant="outline" className="text-tablet-sm">
                  {interruptionHistory.length} {t('interruptions')}
                </Badge>
              )}
              
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
        
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-tablet-base font-semibold text-krong-black">
                {t('currentStep')}: {workflowState.current_step_index + 1}/{sopData.steps.length}
              </div>
              <div className="text-tablet-sm text-muted-foreground mt-1">
                {sopData.steps[workflowState.current_step_index]?.name || t('unknownStep')}
              </div>
              {workflowState.completion_percentage > 0 && (
                <div className="text-tablet-xs text-muted-foreground mt-1">
                  {Math.round(workflowState.completion_percentage)}% {t('complete')}
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-tablet-base font-mono">
                {Math.round(workflowState.time_spent / (60 * 1000))}m
              </div>
              <div className="text-tablet-xs text-muted-foreground">
                {t('timeSpent')}
              </div>
            </div>
          </div>

          {/* Current Interruption */}
          {isPaused && currentInterruption && (
            <Card className="border-golden-saffron/30 bg-golden-saffron/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getInterruptionTypeInfo(currentInterruption.type).icon}
                    <div>
                      <div className="text-tablet-base font-semibold">
                        {getInterruptionTypeInfo(currentInterruption.type).label}
                      </div>
                      <div className="text-tablet-sm text-muted-foreground">
                        {currentInterruption.reason}
                      </div>
                      <div className="text-tablet-xs text-muted-foreground mt-1">
                        {t('started')}: {currentInterruption.start_time.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-tablet-xs",
                      currentInterruption.priority === 'critical' ? "border-red-600 text-red-600" :
                      currentInterruption.priority === 'high' ? "border-krong-red text-krong-red" :
                      currentInterruption.priority === 'medium' ? "border-golden-saffron text-golden-saffron" :
                      "border-gray-400 text-gray-600"
                    )}
                  >
                    {t(`priority.${currentInterruption.priority}`)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Control Buttons */}
          <div className="flex justify-center gap-3">
            {!isPaused ? (
              <>
                <Button
                  onClick={() => pauseWorkflow(true)}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Pause className="w-5 h-5" />
                  {t('quickPause')}
                </Button>
                
                <Button
                  onClick={() => pauseWorkflow(false)}
                  size="lg"
                  className="bg-golden-saffron hover:bg-golden-saffron/90 flex items-center gap-2"
                >
                  <Clock className="w-5 h-5" />
                  {t('pauseWithDetails')}
                </Button>
              </>
            ) : (
              <Button
                onClick={resumeWorkflow}
                size="lg"
                className="bg-jade-green hover:bg-jade-green/90 flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t('resumeWorkflow')}
              </Button>
            )}
            
            <Button
              onClick={saveWorkflowState}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {t('saveState')}
            </Button>
          </div>

          {/* Interruption Summary */}
          {interruptionHistory.length > 0 && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-tablet-base font-semibold flex items-center gap-2">
                  <History className="w-4 h-4" />
                  {t('interruptionSummary')}
                </h4>
                <Badge variant="outline" className="text-tablet-sm">
                  {Math.round(totalInterruptionTime / (60 * 1000))}m {t('total')}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {interruptionHistory.slice(0, 3).map((interruption) => (
                  <div key={interruption.id} className="flex items-center justify-between text-tablet-sm">
                    <div className="flex items-center gap-2">
                      {getInterruptionTypeInfo(interruption.type).icon}
                      <span>{getInterruptionTypeInfo(interruption.type).label}</span>
                    </div>
                    <span className="font-mono">
                      {Math.round((interruption.duration || 0) / (60 * 1000))}m
                    </span>
                  </div>
                ))}
                {interruptionHistory.length > 3 && (
                  <div className="text-tablet-xs text-muted-foreground text-center">
                    +{interruptionHistory.length - 3} {t('moreInterruptions')}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interruption Form Modal */}
      {showInterruptionModal && (
        <Card className="border-2 border-golden-saffron">
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Clock className="w-6 h-6 text-golden-saffron" />
              {t('logInterruption')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Interruption Type */}
            <div className="space-y-2">
              <label className="text-tablet-sm font-medium">{t('interruptionType')}</label>
              <Select
                value={interruptionForm.type}
                onValueChange={(value) => setInterruptionForm(prev => ({ ...prev, type: value as InterruptionEvent['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interruptionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {type.icon}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-tablet-sm font-medium">{t('reason')}</label>
              <Input
                value={interruptionForm.reason}
                onChange={(e) => setInterruptionForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={t('reasonPlaceholder')}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-tablet-sm font-medium">{t('priority')}</label>
              <Select
                value={interruptionForm.priority}
                onValueChange={(value) => setInterruptionForm(prev => ({ ...prev, priority: value as InterruptionEvent['priority'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('priority.low')}</SelectItem>
                  <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                  <SelectItem value="high">{t('priority.high')}</SelectItem>
                  <SelectItem value="critical">{t('priority.critical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-tablet-sm font-medium">{t('notes')} ({t('optional')})</label>
              <Textarea
                value={interruptionForm.notes}
                onChange={(e) => setInterruptionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('notesPlaceholder')}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowInterruptionModal(false)}
              >
                <X className="w-4 h-4 mr-2" />
                {t('cancel')}
              </Button>
              
              <Button
                onClick={completeInterruption}
                disabled={!interruptionForm.reason.trim()}
                className="bg-golden-saffron hover:bg-golden-saffron/90"
              >
                <Clock className="w-4 h-4 mr-2" />
                {t('startInterruption')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resume Guidance Modal */}
      {showResumeModal && resumeGuidance && (
        <Card className="border-2 border-jade-green">
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Play className="w-6 h-6 text-jade-green" />
              {resumeGuidance.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-tablet-sm text-muted-foreground">
              {resumeGuidance.description}
            </p>

            {/* Action Items */}
            <div className="space-y-3">
              <h4 className="text-tablet-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                {t('actionItems')}
              </h4>
              
              {resumeGuidance.action_items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      const updatedGuidance = {
                        ...resumeGuidance,
                        action_items: resumeGuidance.action_items.map(ai => 
                          ai.id === item.id ? { ...ai, completed: !ai.completed } : ai
                        )
                      };
                      setResumeGuidance(updatedGuidance);
                    }}
                  >
                    {item.completed ? (
                      <CheckCircle className="w-4 h-4 text-jade-green" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                  
                  <div className="flex-1">
                    <p className={cn(
                      "text-tablet-sm",
                      item.completed ? "line-through text-muted-foreground" : ""
                    )}>
                      {item.task}
                    </p>
                    <p className="text-tablet-xs text-muted-foreground">
                      ~{item.estimated_time}m
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Safety Checks */}
            {resumeGuidance.safety_checks && resumeGuidance.safety_checks.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-tablet-base font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  {t('safetyChecks')}
                </h4>
                
                {resumeGuidance.safety_checks.map((check) => (
                  <div key={check.id} className={cn(
                    "flex items-start gap-3 p-3 border rounded-lg",
                    check.critical ? "border-red-200 bg-red-50" : "border-border"
                  )}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        const updatedGuidance = {
                          ...resumeGuidance,
                          safety_checks: resumeGuidance.safety_checks?.map(sc => 
                            sc.id === check.id ? { ...sc, completed: !sc.completed } : sc
                          )
                        };
                        setResumeGuidance(updatedGuidance);
                      }}
                    >
                      {check.completed ? (
                        <CheckCircle className="w-4 h-4 text-jade-green" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </Button>
                    
                    <div className="flex-1">
                      <p className={cn(
                        "text-tablet-sm",
                        check.completed ? "line-through text-muted-foreground" : "",
                        check.critical ? "font-medium text-red-800" : ""
                      )}>
                        {check.check}
                      </p>
                      {check.critical && (
                        <Badge variant="destructive" className="text-tablet-xs mt-1">
                          {t('critical')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={skipResumeGuidance}
              >
                {t('skipGuidance')}
              </Button>
              
              <Button
                onClick={completeResumeGuidance}
                className="bg-jade-green hover:bg-jade-green/90"
                disabled={
                  !resumeGuidance.action_items.every(item => item.completed) ||
                  (resumeGuidance.safety_checks && !resumeGuidance.safety_checks.every(check => check.completed))
                }
              >
                <Play className="w-4 h-4 mr-2" />
                {t('resumeWorkflow')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InterruptionResumeHandler;