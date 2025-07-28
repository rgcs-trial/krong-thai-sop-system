'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Clock,
  Coffee,
  Timer,
  Zap,
  AlertCircle,
  CheckCircle2,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslationsDB } from '@/hooks/use-translations-db';
import { 
  Task, 
  TaskTimeEntry 
} from '@/types/database';

interface TaskTimerComponentProps {
  task: Task;
  locale: string;
  userId: string;
  className?: string;
  onTimeUpdate?: (timeEntry: TaskTimeEntry) => void;
  onTaskComplete?: (task: Task, totalTime: number) => void;
  onBreakStart?: (reason: string) => void;
  onBreakEnd?: () => void;
}

interface TimerState {
  isRunning: boolean;
  currentTime: number; // in seconds
  sessionStartTime: Date | null;
  totalSessionTime: number;
  breakTime: number;
  isOnBreak: boolean;
  breakReason?: string;
}

interface BreakReason {
  id: string;
  label: string;
  label_fr: string;
  color: string;
}

const breakReasons: BreakReason[] = [
  { id: 'lunch', label: 'Lunch break', label_fr: 'Pause déjeuner', color: 'bg-green-100 text-green-800' },
  { id: 'rest', label: 'Rest break', label_fr: 'Pause repos', color: 'bg-blue-100 text-blue-800' },
  { id: 'meeting', label: 'Meeting', label_fr: 'Réunion', color: 'bg-purple-100 text-purple-800' },
  { id: 'equipment', label: 'Equipment issue', label_fr: 'Problème d\'équipement', color: 'bg-orange-100 text-orange-800' },
  { id: 'supplies', label: 'Get supplies', label_fr: 'Chercher des fournitures', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'other', label: 'Other', label_fr: 'Autre', color: 'bg-gray-100 text-gray-800' }
];

export default function TaskTimerComponent({
  task,
  locale,
  userId,
  className = '',
  onTimeUpdate,
  onTaskComplete,
  onBreakStart,
  onBreakEnd
}: TaskTimerComponentProps) {
  const { t } = useTranslationsDB();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    currentTime: 0,
    sessionStartTime: null,
    totalSessionTime: task.actual_duration_minutes ? task.actual_duration_minutes * 60 : 0,
    breakTime: 0,
    isOnBreak: false
  });
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  // Start timer
  const startTimer = () => {
    if (timerState.isOnBreak) return;
    
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      sessionStartTime: new Date()
    }));
  };

  // Pause timer
  const pauseTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      totalSessionTime: prev.totalSessionTime + prev.currentTime,
      currentTime: 0,
      sessionStartTime: null
    }));
  };

  // Stop timer and complete task
  const stopTimer = () => {
    const totalTime = timerState.totalSessionTime + timerState.currentTime;
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      currentTime: 0,
      sessionStartTime: null
    }));
    setShowCompleteDialog(true);
  };

  // Reset timer
  const resetTimer = () => {
    setTimerState({
      isRunning: false,
      currentTime: 0,
      sessionStartTime: null,
      totalSessionTime: 0,
      breakTime: 0,
      isOnBreak: false
    });
  };

  // Start break
  const startBreak = (reason: string) => {
    if (timerState.isRunning) {
      pauseTimer();
    }
    
    setTimerState(prev => ({
      ...prev,
      isOnBreak: true,
      breakReason: reason
    }));
    
    setShowBreakDialog(false);
    onBreakStart?.(reason);
  };

  // End break
  const endBreak = () => {
    setTimerState(prev => ({
      ...prev,
      isOnBreak: false,
      breakReason: undefined
    }));
    
    onBreakEnd?.();
  };

  // Complete task
  const completeTask = () => {
    const totalTime = timerState.totalSessionTime + timerState.currentTime;
    const timeEntry: TaskTimeEntry = {
      id: `time-${Date.now()}`,
      task_id: task.id,
      user_id: userId,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_minutes: Math.round(totalTime / 60),
      is_break: false,
      notes: completionNotes,
      created_at: new Date().toISOString()
    };
    
    onTimeUpdate?.(timeEntry);
    onTaskComplete?.(task, totalTime);
    setShowCompleteDialog(false);
    resetTimer();
  };

  // Timer effect
  useEffect(() => {
    if (timerState.isRunning && !timerState.isOnBreak) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          currentTime: prev.currentTime + 1
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.isOnBreak]);

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const totalElapsedTime = timerState.totalSessionTime + timerState.currentTime;
  const estimatedSeconds = (task.estimated_duration_minutes || 60) * 60;
  const progressPercentage = Math.min((totalElapsedTime / estimatedSeconds) * 100, 100);
  const isOvertime = totalElapsedTime > estimatedSeconds;

  // Get timer status
  const getTimerStatus = () => {
    if (timerState.isOnBreak) {
      return {
        icon: <Coffee className="w-5 h-5" />,
        label: t('tasks.timer.on_break'),
        color: 'bg-yellow-100 text-yellow-800'
      };
    }
    if (timerState.isRunning) {
      return {
        icon: <Play className="w-5 h-5" />,
        label: t('tasks.timer.running'),
        color: 'bg-green-100 text-green-800'
      };
    }
    if (totalElapsedTime > 0) {
      return {
        icon: <Pause className="w-5 h-5" />,
        label: t('tasks.timer.paused'),
        color: 'bg-blue-100 text-blue-800'
      };
    }
    return {
      icon: <Clock className="w-5 h-5" />,
      label: t('tasks.timer.ready'),
      color: 'bg-gray-100 text-gray-800'
    };
  };

  const timerStatus = getTimerStatus();
  const title = locale === 'fr' ? task.title_fr : task.title;

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {t('tasks.timer.title')}
            </CardTitle>
            <Badge className={timerStatus.color}>
              {timerStatus.icon}
              <span className="ml-2">{timerStatus.label}</span>
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">{title}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className={`text-4xl font-mono font-bold ${
              isOvertime ? 'text-red-600' : 'text-gray-900'
            }`}>
              {formatTime(totalElapsedTime)}
            </div>
            
            {task.estimated_duration_minutes && (
              <div className="text-sm text-gray-500 mt-2">
                {t('tasks.timer.estimated')}: {formatTime(task.estimated_duration_minutes * 60)}
                {isOvertime && (
                  <span className="text-red-500 ml-2">
                    (+{formatTime(totalElapsedTime - estimatedSeconds)} {t('tasks.timer.overtime')})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {task.estimated_duration_minutes && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('tasks.timer.progress')}</span>
                <span className={isOvertime ? 'text-red-600 font-medium' : 'text-gray-900'}>
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress 
                value={progressPercentage} 
                className={`h-2 ${isOvertime ? '[&>div]:bg-red-500' : ''}`}
              />
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-3">
            {!timerState.isRunning && !timerState.isOnBreak && (
              <Button
                onClick={startTimer}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                {totalElapsedTime > 0 ? t('tasks.timer.resume') : t('tasks.timer.start')}
              </Button>
            )}

            {timerState.isRunning && !timerState.isOnBreak && (
              <Button
                onClick={pauseTimer}
                variant="outline"
                size="lg"
              >
                <Pause className="w-4 h-4 mr-2" />
                {t('tasks.timer.pause')}
              </Button>
            )}

            {timerState.isOnBreak && (
              <Button
                onClick={endBreak}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                {t('tasks.timer.end_break')}
              </Button>
            )}

            {!timerState.isOnBreak && (
              <Dialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    <Coffee className="w-4 h-4 mr-2" />
                    {t('tasks.timer.break')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('tasks.timer.break_reason_title')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      {t('tasks.timer.break_reason_description')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {breakReasons.map((reason) => (
                        <Button
                          key={reason.id}
                          variant="outline"
                          onClick={() => startBreak(reason.id)}
                          className="h-auto p-4 text-left"
                        >
                          <div>
                            <div className="font-medium">
                              {locale === 'fr' ? reason.label_fr : reason.label}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {totalElapsedTime > 0 && (
              <Button
                onClick={stopTimer}
                className="bg-[#E31B23] hover:bg-[#E31B23]/90"
                size="lg"
              >
                <Square className="w-4 h-4 mr-2" />
                {t('tasks.timer.complete')}
              </Button>
            )}

            {totalElapsedTime > 0 && !timerState.isRunning && (
              <Button
                onClick={resetTimer}
                variant="outline"
                size="lg"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('tasks.timer.reset')}
              </Button>
            )}
          </div>

          {/* Break Status */}
          {timerState.isOnBreak && timerState.breakReason && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {t('tasks.timer.on_break')}
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                {t('tasks.timer.break_type')}: {
                  breakReasons.find(r => r.id === timerState.breakReason)?.[locale === 'fr' ? 'label_fr' : 'label']
                }
              </p>
            </div>
          )}

          {/* Time Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatTime(timerState.totalSessionTime)}
              </div>
              <div className="text-xs text-gray-500">
                {t('tasks.timer.session_time')}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatTime(timerState.currentTime)}
              </div>
              <div className="text-xs text-gray-500">
                {t('tasks.timer.current_session')}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {Math.round(totalElapsedTime / 60)}m
              </div>
              <div className="text-xs text-gray-500">
                {t('tasks.timer.total_minutes')}
              </div>
            </div>
          </div>

          {/* Efficiency Indicator */}
          {task.estimated_duration_minutes && totalElapsedTime > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isOvertime ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : progressPercentage > 75 ? (
                    <Zap className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Target className="w-5 h-5 text-green-500" />
                  )}
                  <span className="font-medium text-gray-900">
                    {t('tasks.timer.efficiency')}
                  </span>
                </div>
                <div className={`font-semibold ${
                  isOvertime ? 'text-red-600' : 
                  progressPercentage > 75 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {isOvertime ? t('tasks.timer.overtime') : t('tasks.timer.on_track')}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Completion Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              {t('tasks.timer.complete_task')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">{title}</h4>
              <div className="text-sm text-green-700">
                <p>{t('tasks.timer.total_time')}: {formatTime(totalElapsedTime)}</p>
                {task.estimated_duration_minutes && (
                  <p>
                    {t('tasks.timer.estimated')}: {formatTime(task.estimated_duration_minutes * 60)}
                    {isOvertime && (
                      <span className="text-red-600 ml-2">
                        ({t('tasks.timer.overtime')}: {formatTime(totalElapsedTime - estimatedSeconds)})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tasks.timer.completion_notes')}
              </label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={t('tasks.timer.notes_placeholder')}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowCompleteDialog(false)}
                variant="outline"
                className="flex-1"
              >
                {t('tasks.timer.continue_working')}
              </Button>
              <Button
                onClick={completeTask}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('tasks.timer.mark_complete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}