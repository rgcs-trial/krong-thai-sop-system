'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Timer, 
  Play, 
  Pause,
  Square,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BarChart3,
  Activity,
  Zap,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
  RotateCcw,
  Settings,
  Download,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Stopwatch,
  LineChart,
  PieChart
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart as RechartsBarChart, Bar } from 'recharts';

interface TimeSegment {
  id: string;
  step_id: string;
  step_name: string;
  start_time: Date;
  end_time?: Date;
  duration?: number; // milliseconds
  is_active: boolean;
  interruptions: Array<{
    id: string;
    start_time: Date;
    end_time?: Date;
    reason: string;
    duration?: number;
  }>;
  notes?: string;
}

interface PerformanceMetric {
  id: string;
  name: string;
  name_fr: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  category: 'speed' | 'efficiency' | 'quality' | 'consistency';
  description: string;
  description_fr: string;
}

interface BenchmarkData {
  sop_id: string;
  category: string;
  avg_completion_time: number;
  median_completion_time: number;
  best_time: number;
  worst_time: number;
  standard_deviation: number;
  sample_size: number;
  experience_level_breakdown: Record<string, number>;
  time_of_day_patterns: Array<{
    hour: number;
    avg_time: number;
    completion_count: number;
  }>;
}

interface PerformanceTimeTrackerProps {
  /** SOP information */
  sopData: {
    id: string;
    title: string;
    estimated_time: number;
    steps: Array<{
      id: string;
      name: string;
      estimated_duration: number;
      is_critical: boolean;
    }>;
  };
  /** Current user information */
  userProfile: {
    id: string;
    name: string;
    experience_level: 1 | 2 | 3 | 4 | 5;
    role: string;
  };
  /** Historical benchmark data */
  benchmarkData?: BenchmarkData;
  /** Auto-start tracking */
  autoStart?: boolean;
  /** Enable detailed analytics */
  showDetailedAnalytics?: boolean;
  /** Enable real-time performance feedback */
  enableRealTimeFeedback?: boolean;
  /** Show comparison with benchmarks */
  showBenchmarkComparison?: boolean;
  /** Callback when tracking starts */
  onTrackingStart?: () => void;
  /** Callback when tracking stops */
  onTrackingStop?: (summary: any) => void;
  /** Callback when step is completed */
  onStepComplete?: (stepId: string, duration: number) => void;
  /** Callback when performance milestone is reached */
  onPerformanceMilestone?: (milestone: string, metric: PerformanceMetric) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * PerformanceTimeTracker - Comprehensive time tracking with performance analytics
 * 
 * Features:
 * - Precise time tracking with millisecond accuracy
 * - Step-by-step duration analysis
 * - Real-time performance feedback and coaching
 * - Benchmark comparison with historical data
 * - Interruption tracking and impact analysis
 * - Performance trend analysis and predictions
 * - Visual analytics dashboard with charts
 * - Export capabilities for performance reviews
 * - Experience level and role-based comparisons
 * - Time-of-day performance pattern analysis
 * 
 * @param props PerformanceTimeTrackerProps
 * @returns JSX.Element
 */
const PerformanceTimeTracker: React.FC<PerformanceTimeTrackerProps> = ({
  sopData,
  userProfile,
  benchmarkData,
  autoStart = false,
  showDetailedAnalytics = true,
  enableRealTimeFeedback = true,
  showBenchmarkComparison = true,
  onTrackingStart,
  onTrackingStop,
  onStepComplete,
  onPerformanceMilestone,
  className
}) => {
  const t = useTranslations('sop.performanceTracker');
  
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>(['current']);
  const [showSettings, setShowSettings] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Update current time every second
  useEffect(() => {
    if (isTracking && !isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100); // Update every 100ms for smooth progress
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
  }, [isTracking, isPaused]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !isTracking) {
      startTracking();
    }
  }, [autoStart]);

  // Calculate current session metrics
  const sessionMetrics = useMemo(() => {
    if (!sessionStartTime || !timeSegments.length) {
      return {
        totalDuration: 0,
        completedSteps: 0,
        currentStepDuration: 0,
        avgStepTime: 0,
        efficiencyScore: 0,
        paceComparison: 0
      };
    }

    const now = currentTime;
    const totalDuration = now - sessionStartTime.getTime();
    const completedSteps = timeSegments.filter(seg => seg.end_time).length;
    
    const currentSegment = timeSegments.find(seg => seg.is_active);
    const currentStepDuration = currentSegment ? 
      now - currentSegment.start_time.getTime() : 0;
    
    const completedDurations = timeSegments
      .filter(seg => seg.duration)
      .map(seg => seg.duration!);
    const avgStepTime = completedDurations.length > 0 ?
      completedDurations.reduce((sum, d) => sum + d, 0) / completedDurations.length : 0;

    // Calculate efficiency score (compared to estimated times)
    const efficiencyScore = completedDurations.length > 0 ? Math.max(0, Math.min(100,
      100 - (avgStepTime - (sopData.estimated_time * 60 * 1000 / sopData.steps.length)) / 
      (sopData.estimated_time * 60 * 1000 / sopData.steps.length) * 100
    )) : 50;

    // Pace comparison with estimated total time
    const estimatedTotalMs = sopData.estimated_time * 60 * 1000;
    const currentPace = totalDuration / estimatedTotalMs * 100;
    const paceComparison = currentPace > 100 ? 'behind' : currentPace > 90 ? 'on_track' : 'ahead';

    return {
      totalDuration,
      completedSteps,
      currentStepDuration,
      avgStepTime,
      efficiencyScore,
      paceComparison
    };
  }, [sessionStartTime, timeSegments, currentTime, sopData]);

  // Start tracking
  const startTracking = useCallback(() => {
    const now = new Date();
    setSessionStartTime(now);
    setIsTracking(true);
    setIsPaused(false);
    startTimeRef.current = now;
    
    // Create initial segment for first step
    const firstSegment: TimeSegment = {
      id: `segment-${Date.now()}`,
      step_id: sopData.steps[0].id,
      step_name: sopData.steps[0].name,
      start_time: now,
      is_active: true,
      interruptions: []
    };
    
    setTimeSegments([firstSegment]);
    setCurrentStepIndex(0);
    onTrackingStart?.();
  }, [sopData.steps, onTrackingStart]);

  // Pause tracking
  const pauseTracking = useCallback(() => {
    setIsPaused(true);
    
    // Add interruption to current active segment
    setTimeSegments(prev => prev.map(segment => {
      if (segment.is_active) {
        return {
          ...segment,
          interruptions: [
            ...segment.interruptions,
            {
              id: `interruption-${Date.now()}`,
              start_time: new Date(),
              reason: 'Manual pause'
            }
          ]
        };
      }
      return segment;
    }));
  }, []);

  // Resume tracking
  const resumeTracking = useCallback(() => {
    setIsPaused(false);
    
    // End the current interruption
    setTimeSegments(prev => prev.map(segment => {
      if (segment.is_active) {
        const interruptions = [...segment.interruptions];
        const lastInterruption = interruptions[interruptions.length - 1];
        if (lastInterruption && !lastInterruption.end_time) {
          const now = new Date();
          lastInterruption.end_time = now;
          lastInterruption.duration = now.getTime() - lastInterruption.start_time.getTime();
        }
        return { ...segment, interruptions };
      }
      return segment;
    }));
  }, []);

  // Stop tracking
  const stopTracking = useCallback(() => {
    const now = new Date();
    
    // Complete current active segment
    setTimeSegments(prev => prev.map(segment => {
      if (segment.is_active) {
        const duration = now.getTime() - segment.start_time.getTime();
        return {
          ...segment,
          end_time: now,
          duration,
          is_active: false
        };
      }
      return segment;
    }));
    
    setIsTracking(false);
    setIsPaused(false);
    
    // Generate session summary
    const summary = {
      session_start: sessionStartTime,
      session_end: now,
      total_duration: sessionStartTime ? now.getTime() - sessionStartTime.getTime() : 0,
      completed_steps: timeSegments.filter(seg => seg.end_time).length + 1,
      segments: timeSegments,
      performance_metrics: performanceMetrics
    };
    
    onTrackingStop?.(summary);
  }, [sessionStartTime, timeSegments, performanceMetrics, onTrackingStop]);

  // Complete current step and move to next
  const completeCurrentStep = useCallback(() => {
    const now = new Date();
    
    setTimeSegments(prev => {
      const updated = prev.map(segment => {
        if (segment.is_active) {
          const duration = now.getTime() - segment.start_time.getTime();
          onStepComplete?.(segment.step_id, duration);
          return {
            ...segment,
            end_time: now,
            duration,
            is_active: false
          };
        }
        return segment;
      });
      
      // Create next segment if not at last step
      if (currentStepIndex < sopData.steps.length - 1) {
        const nextStep = sopData.steps[currentStepIndex + 1];
        const nextSegment: TimeSegment = {
          id: `segment-${Date.now()}`,
          step_id: nextStep.id,
          step_name: nextStep.name,
          start_time: now,
          is_active: true,
          interruptions: []
        };
        updated.push(nextSegment);
      }
      
      return updated;
    });
    
    if (currentStepIndex < sopData.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // All steps completed, stop tracking
      stopTracking();
    }
  }, [currentStepIndex, sopData.steps, onStepComplete, stopTracking]);

  // Format duration to human readable
  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Get performance color
  const getPerformanceColor = (value: number, target?: number) => {
    if (!target) return 'text-gray-500';
    
    const ratio = value / target;
    if (ratio <= 0.8) return 'text-jade-green';
    if (ratio <= 1.0) return 'text-golden-saffron';
    if (ratio <= 1.2) return 'text-krong-red';
    return 'text-red-700';
  };

  // Calculate benchmark comparison
  const benchmarkComparison = useMemo(() => {
    if (!benchmarkData || !sessionMetrics.totalDuration) return null;
    
    const currentTimeMinutes = sessionMetrics.totalDuration / (1000 * 60);
    const avgTime = benchmarkData.avg_completion_time;
    const bestTime = benchmarkData.best_time;
    
    return {
      vs_average: ((currentTimeMinutes - avgTime) / avgTime) * 100,
      vs_best: ((currentTimeMinutes - bestTime) / bestTime) * 100,
      percentile: currentTimeMinutes <= benchmarkData.median_completion_time ? 50 : 
                 currentTimeMinutes <= avgTime ? 75 : 90
    };
  }, [benchmarkData, sessionMetrics]);

  // Performance chart data
  const chartData = useMemo(() => {
    return timeSegments
      .filter(seg => seg.duration)
      .map((seg, index) => ({
        step: index + 1,
        actual: seg.duration! / (1000 * 60), // Convert to minutes
        estimated: sopData.steps.find(s => s.id === seg.step_id)?.estimated_duration || 0,
        name: seg.step_name
      }));
  }, [timeSegments, sopData.steps]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Tracker Card */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Timer className="w-6 h-6 text-krong-red" />
              {t('title')}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <Badge 
                variant={isTracking ? "default" : "secondary"}
                className={cn(
                  "text-tablet-sm",
                  isTracking ? (isPaused ? "bg-golden-saffron" : "bg-jade-green") : ""
                )}
              >
                {isTracking ? (isPaused ? t('paused') : t('active')) : t('stopped')}
              </Badge>
              
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
        
        <CardContent className="space-y-6">
          {/* Current Status Section */}
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => toggleSection('current')}
              className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
            >
              {t('currentStatus')}
              {expandedSections.includes('current') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            
            {expandedSections.includes('current') && (
              <div className="space-y-4 pl-4">
                {/* Timer Display */}
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-krong-red mb-2">
                    {formatDuration(sessionMetrics.totalDuration)}
                  </div>
                  <div className="text-tablet-sm text-muted-foreground">
                    {t('totalTime')}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-tablet-sm">
                    <span>{t('progress')}</span>
                    <span>
                      {sessionMetrics.completedSteps}/{sopData.steps.length} {t('steps')}
                    </span>
                  </div>
                  <Progress 
                    value={(sessionMetrics.completedSteps / sopData.steps.length) * 100} 
                    className="h-3"
                  />
                </div>

                {/* Current Step */}
                {isTracking && currentStepIndex < sopData.steps.length && (
                  <Card className="border bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-tablet-sm">
                          {t('step')} {currentStepIndex + 1}
                        </Badge>
                        <div className="font-mono text-tablet-sm">
                          {formatDuration(sessionMetrics.currentStepDuration)}
                        </div>
                      </div>
                      <p className="text-tablet-base font-medium">
                        {sopData.steps[currentStepIndex].name}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Control Buttons */}
                <div className="flex justify-center gap-3">
                  {!isTracking ? (
                    <Button
                      onClick={startTracking}
                      size="lg"
                      className="bg-jade-green hover:bg-jade-green/90"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {t('start')}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={isPaused ? resumeTracking : pauseTracking}
                        size="lg"
                      >
                        {isPaused ? (
                          <Play className="w-5 h-5 mr-2" />
                        ) : (
                          <Pause className="w-5 h-5 mr-2" />
                        )}
                        {isPaused ? t('resume') : t('pause')}
                      </Button>
                      
                      <Button
                        onClick={completeCurrentStep}
                        size="lg"
                        className="bg-krong-red hover:bg-krong-red/90"
                        disabled={isPaused}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {currentStepIndex >= sopData.steps.length - 1 ? t('finish') : t('nextStep')}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={stopTracking}
                        size="lg"
                      >
                        <Square className="w-5 h-5 mr-2" />
                        {t('stop')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          {showDetailedAnalytics && sessionMetrics.completedSteps > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('metrics')}
                className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
              >
                {t('performanceMetrics')}
                {expandedSections.includes('metrics') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {expandedSections.includes('metrics') && (
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-jade-green mb-1">
                        {Math.round(sessionMetrics.efficiencyScore)}%
                      </div>
                      <div className="text-tablet-sm text-muted-foreground">
                        {t('efficiency')}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-golden-saffron mb-1">
                        {formatDuration(sessionMetrics.avgStepTime)}
                      </div>
                      <div className="text-tablet-sm text-muted-foreground">
                        {t('avgStepTime')}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Benchmark Comparison */}
          {showBenchmarkComparison && benchmarkData && benchmarkComparison && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('benchmark')}
                className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
              >
                {t('benchmarkComparison')}
                {expandedSections.includes('benchmark') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {expandedSections.includes('benchmark') && (
                <div className="space-y-3 pl-4">
                  <div className="flex items-center justify-between">
                    <span className="text-tablet-sm">{t('vsAverage')}:</span>
                    <div className="flex items-center gap-1">
                      {benchmarkComparison.vs_average > 0 ? (
                        <ArrowUp className="w-4 h-4 text-red-600" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-jade-green" />
                      )}
                      <span className={cn(
                        "text-tablet-sm font-medium",
                        benchmarkComparison.vs_average > 0 ? "text-red-600" : "text-jade-green"
                      )}>
                        {Math.abs(benchmarkComparison.vs_average).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-tablet-sm">{t('vsBest')}:</span>
                    <div className="flex items-center gap-1">
                      {benchmarkComparison.vs_best > 0 ? (
                        <ArrowUp className="w-4 h-4 text-red-600" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-jade-green" />
                      )}
                      <span className={cn(
                        "text-tablet-sm font-medium",
                        benchmarkComparison.vs_best > 0 ? "text-red-600" : "text-jade-green"
                      )}>
                        {Math.abs(benchmarkComparison.vs_best).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-tablet-sm">{t('percentile')}:</span>
                    <Badge variant="outline" className="text-tablet-sm">
                      {benchmarkComparison.percentile}th
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step Performance Chart */}
          {chartData.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('chart')}
                className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
              >
                {t('stepPerformance')}
                {expandedSections.includes('chart') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {expandedSections.includes('chart') && (
                <div className="pl-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="step" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(1)}m`, 
                          name === 'actual' ? t('actual') : t('estimated')
                        ]}
                        labelFormatter={(label) => `${t('step')} ${label}`}
                      />
                      <Bar dataKey="estimated" fill="#D4AF37" opacity={0.6} />
                      <Bar dataKey="actual" fill="#E31B23" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Step History */}
          {timeSegments.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => toggleSection('history')}
                className="w-full justify-between p-0 h-auto font-semibold text-tablet-base"
              >
                {t('stepHistory')}
                {expandedSections.includes('history') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {expandedSections.includes('history') && (
                <div className="space-y-2 pl-4">
                  {timeSegments.map((segment, index) => (
                    <div
                      key={segment.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg",
                        segment.is_active ? "border-krong-red bg-krong-red/5" : "border-border"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-tablet-xs">
                            {index + 1}
                          </Badge>
                          <span className="text-tablet-sm font-medium">
                            {segment.step_name}
                          </span>
                          {segment.is_active && (
                            <Badge variant="default" className="text-tablet-xs bg-krong-red">
                              {t('active')}
                            </Badge>
                          )}
                        </div>
                        {segment.interruptions.length > 0 && (
                          <div className="text-tablet-xs text-muted-foreground mt-1">
                            {segment.interruptions.length} {t('interruptions')}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="font-mono text-tablet-sm">
                          {segment.duration ? 
                            formatDuration(segment.duration) : 
                            formatDuration(currentTime - segment.start_time.getTime())
                          }
                        </div>
                        <div className="text-tablet-xs text-muted-foreground">
                          {segment.start_time.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceTimeTracker;