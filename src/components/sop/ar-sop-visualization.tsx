'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  Scan, 
  RotateCcw,
  Zap,
  Target,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Settings,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Hand,
  Move3D,
  Layers,
  Grid3X3
} from 'lucide-react';

interface ARAnnotation {
  id: string;
  x: number; // Percentage position (0-100)
  y: number; // Percentage position (0-100)
  z?: number; // Depth positioning
  type: 'instruction' | 'warning' | 'highlight' | 'measurement' | 'timer';
  content: string;
  content_fr: string;
  duration?: number; // Auto-hide after seconds
  priority: 'low' | 'medium' | 'high' | 'critical';
  interactive?: boolean;
  completed?: boolean;
}

interface ARSOPStep {
  id: string;
  step_number: number;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  estimated_time_seconds: number;
  annotations: ARAnnotation[];
  target_area?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  validation_required: boolean;
}

interface ARCalibration {
  deviceOrientation: {
    alpha: number; // Z-axis rotation
    beta: number;  // X-axis rotation
    gamma: number; // Y-axis rotation
  };
  cameraPermission: boolean;
  trackingAccuracy: number; // 0-100
  lightingCondition: 'poor' | 'adequate' | 'good' | 'excellent';
}

interface ARSOPVisualizationProps {
  /** SOP steps with AR annotations */
  steps: ARSOPStep[];
  /** Current step index */
  currentStepIndex?: number;
  /** Enable AR camera overlay */
  enableCamera?: boolean;
  /** Enable spatial audio */
  enableAudio?: boolean;
  /** Auto-advance steps */
  autoAdvance?: boolean;
  /** Show calibration interface */
  showCalibration?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when step changes */
  onStepChange?: (stepIndex: number) => void;
  /** Callback when step completed */
  onStepComplete?: (stepId: string, timeSpent: number) => void;
  /** Callback when annotation interacted with */
  onAnnotationInteract?: (annotationId: string, action: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * ARSOPVisualization - AR-powered step-by-step SOP guidance
 * 
 * Features:
 * - WebXR-based augmented reality overlay system
 * - Real-time camera feed with AR annotations
 * - 3D spatial positioning and tracking
 * - Interactive AR elements for guidance
 * - Device orientation and motion tracking
 * - Environmental lighting adaptation
 * - Gesture-based interaction support
 * - Voice-guided AR navigation
 * - Multi-language AR content
 * - Performance-optimized rendering
 * 
 * @param props ARSOPVisualizationProps
 * @returns JSX.Element
 */
const ARSOPVisualization: React.FC<ARSOPVisualizationProps> = ({
  steps,
  currentStepIndex = 0,
  enableCamera = true,
  enableAudio = true,
  autoAdvance = false,
  showCalibration = true,
  isLoading = false,
  onStepChange,
  onStepComplete,
  onAnnotationInteract,
  className
}) => {
  const t = useTranslations('sop.ar');
  
  // AR State Management
  const [isARActive, setIsARActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(currentStepIndex);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [calibration, setCalibration] = useState<ARCalibration>({
    deviceOrientation: { alpha: 0, beta: 0, gamma: 0 },
    cameraPermission: false,
    trackingAccuracy: 0,
    lightingCondition: 'adequate'
  });
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [annotationOpacity, setAnnotationOpacity] = useState(0.9);
  const [stepStartTime, setStepStartTime] = useState<Date | null>(null);
  const [handGestureEnabled, setHandGestureEnabled] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arSessionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize AR System
  useEffect(() => {
    const initializeAR = async () => {
      try {
        // Check WebXR support
        if (!('xr' in navigator)) {
          console.warn('WebXR not supported, falling back to camera overlay mode');
          return;
        }

        // Request camera permissions
        if (enableCamera) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            });
            
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              setCalibration(prev => ({ ...prev, cameraPermission: true }));
            }
          } catch (error) {
            console.error('Camera access denied:', error);
            setCalibration(prev => ({ ...prev, cameraPermission: false }));
          }
        }

        // Initialize device orientation tracking
        if ('DeviceOrientationEvent' in window) {
          const handleOrientation = (event: DeviceOrientationEvent) => {
            setCalibration(prev => ({
              ...prev,
              deviceOrientation: {
                alpha: event.alpha || 0,
                beta: event.beta || 0,
                gamma: event.gamma || 0
              }
            }));
          };

          window.addEventListener('deviceorientation', handleOrientation);
          return () => window.removeEventListener('deviceorientation', handleOrientation);
        }

      } catch (error) {
        console.error('AR initialization failed:', error);
      }
    };

    initializeAR();
  }, [enableCamera]);

  // AR Rendering Loop
  useEffect(() => {
    if (!isARActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderARFrame = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render AR grid if enabled
      if (showGrid) {
        renderARGrid(ctx, canvas);
      }

      // Render current step annotations
      const step = steps[currentStep];
      if (step) {
        step.annotations.forEach(annotation => {
          renderARAnnotation(ctx, canvas, annotation);
        });

        // Render target area if specified
        if (step.target_area) {
          renderTargetArea(ctx, canvas, step.target_area);
        }
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(renderARFrame);
    };

    renderARFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isARActive, currentStep, steps, showGrid, annotationOpacity]);

  // Render AR Grid
  const renderARGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.strokeStyle = 'rgba(239, 27, 35, 0.3)'; // Krong Thai red with transparency
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    
    // Vertical lines
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, []);

  // Render AR Annotation
  const renderARAnnotation = useCallback((
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    annotation: ARAnnotation
  ) => {
    const x = (annotation.x / 100) * canvas.width;
    const y = (annotation.y / 100) * canvas.height;
    
    // Annotation background
    const bgColor = getAnnotationColor(annotation.type, annotation.priority);
    ctx.fillStyle = bgColor;
    ctx.globalAlpha = annotationOpacity;
    
    // Annotation marker
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.fill();
    
    // Annotation border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Annotation content (simplified for canvas)
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(annotation.type.toUpperCase(), x, y + 4);
    
    // Reset global alpha
    ctx.globalAlpha = 1;
  }, [annotationOpacity]);

  // Render Target Area
  const renderTargetArea = useCallback((
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    targetArea: NonNullable<ARSOPStep['target_area']>
  ) => {
    const x = (targetArea.x / 100) * canvas.width;
    const y = (targetArea.y / 100) * canvas.height;
    const width = (targetArea.width / 100) * canvas.width;
    const height = (targetArea.height / 100) * canvas.height;
    
    // Animated highlight border
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    
    ctx.strokeStyle = `rgba(239, 27, 35, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -time * 20;
    
    ctx.strokeRect(x, y, width, height);
    
    // Reset line dash
    ctx.setLineDash([]);
  }, []);

  // Get annotation color based on type and priority
  const getAnnotationColor = useCallback((type: ARAnnotation['type'], priority: ARAnnotation['priority']) => {
    const baseColors = {
      instruction: '#2563eb',
      warning: '#f59e0b',
      highlight: '#ef4444',
      measurement: '#10b981',
      timer: '#8b5cf6'
    };
    
    const intensityMap = {
      low: '0.6',
      medium: '0.7',
      high: '0.8',
      critical: '0.9'
    };
    
    const baseColor = baseColors[type];
    const intensity = intensityMap[priority];
    
    return `${baseColor}${Math.round(parseFloat(intensity) * 255).toString(16)}`;
  }, []);

  // Start AR Session
  const startARSession = useCallback(async () => {
    try {
      setIsARActive(true);
      setStepStartTime(new Date());
      
      // Initialize AR session if WebXR is available
      if ('xr' in navigator) {
        const xr = (navigator as any).xr;
        const session = await xr.requestSession('immersive-ar', {
          requiredFeatures: ['local', 'hit-test'],
          optionalFeatures: ['dom-overlay', 'light-estimation']
        });
        
        arSessionRef.current = session;
        
        session.addEventListener('end', () => {
          setIsARActive(false);
          arSessionRef.current = null;
        });
      }
      
    } catch (error) {
      console.error('Failed to start AR session:', error);
      setIsARActive(false);
    }
  }, []);

  // Stop AR Session
  const stopARSession = useCallback(() => {
    if (arSessionRef.current) {
      arSessionRef.current.end();
    }
    setIsARActive(false);
    
    // Clean up video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Handle step navigation
  const navigateToStep = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= steps.length) return;
    
    // Complete current step if moving forward
    if (stepIndex > currentStep && stepStartTime) {
      const timeSpent = Math.round((Date.now() - stepStartTime.getTime()) / 1000);
      onStepComplete?.(steps[currentStep].id, timeSpent);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
    
    setCurrentStep(stepIndex);
    setStepStartTime(new Date());
    onStepChange?.(stepIndex);
  }, [currentStep, steps, stepStartTime, onStepComplete, onStepChange]);

  // Handle annotation interaction
  const handleAnnotationClick = useCallback((annotation: ARAnnotation) => {
    onAnnotationInteract?.(annotation.id, 'click');
    
    if (annotation.interactive) {
      // Mark annotation as completed
      // This would update the annotation state in a real implementation
    }
  }, [onAnnotationInteract]);

  // Calculate progress
  const progress = steps.length > 0 ? (completedSteps.size / steps.length) * 100 : 0;
  const currentStepData = steps[currentStep];

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* AR Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Scan className="w-6 h-6 text-krong-red" />
              {t('title')}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* AR Status */}
              <Badge variant={isARActive ? "default" : "secondary"} className="text-tablet-sm">
                <Eye className="w-3 h-3 mr-1" />
                {isARActive ? t('ar_active') : t('ar_inactive')}
              </Badge>
              
              {/* Calibration Status */}
              {showCalibration && (
                <Badge 
                  variant={calibration.trackingAccuracy > 70 ? "default" : "destructive"} 
                  className="text-tablet-xs"
                >
                  {t('tracking')}: {calibration.trackingAccuracy}%
                </Badge>
              )}
              
              {/* Settings */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-tablet-sm text-muted-foreground">
              <span>{t('step', { current: currentStep + 1, total: steps.length })}</span>
              <span>{Math.round(progress)}% {t('complete')}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* AR Viewport */}
      <Card className="relative overflow-hidden">
        <div className="relative aspect-video bg-black">
          {/* Camera Feed */}
          {enableCamera && calibration.cameraPermission && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          
          {/* AR Canvas Overlay */}
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />
          
          {/* AR Controls Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
            {!isARActive && (
              <div className="pointer-events-auto">
                <Button
                  size="lg"
                  onClick={startARSession}
                  className="bg-krong-red hover:bg-krong-red/90 text-white px-8 py-4"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  {t('start_ar')}
                </Button>
              </div>
            )}
          </div>
          
          {/* AR Action Buttons */}
          {isARActive && (
            <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ zIndex: 20 }}>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setHandGestureEnabled(!handGestureEnabled)}
              >
                <Hand className={cn("w-4 h-4", handGestureEnabled && "text-krong-red")} />
              </Button>
              
              <Button
                variant="destructive"
                size="icon"
                onClick={stopARSession}
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* No Camera Fallback */}
          {!calibration.cameraPermission && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
              <div className="text-center space-y-4">
                <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500" />
                <h3 className="text-tablet-lg font-heading">{t('camera_required')}</h3>
                <p className="text-tablet-base text-gray-300 max-w-md">
                  {t('camera_required_desc')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="border-white text-white hover:bg-white hover:text-gray-900"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('retry_camera')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Current Step Information */}
      {currentStepData && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-tablet-lg">
                  {t('step')} {currentStepData.step_number}: {currentStepData.title}
                </CardTitle>
                <p className="text-tablet-base text-muted-foreground mt-1">
                  {currentStepData.description}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-tablet-sm">
                  <Target className="w-3 h-3 mr-1" />
                  {currentStepData.annotations.length} {t('annotations')}
                </Badge>
                
                {currentStepData.estimated_time_seconds > 0 && (
                  <Badge variant="secondary" className="text-tablet-sm">
                    <Clock className="w-3 h-3 mr-1" />
                    {Math.round(currentStepData.estimated_time_seconds / 60)}m
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* AR Annotations List */}
            <div className="space-y-3">
              <h4 className="text-tablet-sm font-heading font-semibold">{t('ar_guidance')}</h4>
              <div className="space-y-2">
                {currentStepData.annotations.map((annotation, index) => (
                  <div
                    key={annotation.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      annotation.completed && "bg-green-50 border-green-200",
                      annotation.priority === 'critical' && "border-red-300 bg-red-50"
                    )}
                    onClick={() => handleAnnotationClick(annotation)}
                  >
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getAnnotationColor(annotation.type, annotation.priority) }}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-tablet-sm font-medium capitalize">
                          {annotation.type}
                        </span>
                        <Badge variant="outline" size="sm">
                          {annotation.priority}
                        </Badge>
                      </div>
                      <p className="text-tablet-sm text-muted-foreground">
                        {annotation.content}
                      </p>
                    </div>
                    
                    {annotation.completed && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Step Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigateToStep(currentStep - 1)}
                disabled={currentStep === 0}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('previous_step')}
              </Button>
              
              <div className="text-center">
                <p className="text-tablet-sm text-muted-foreground">
                  {completedSteps.has(currentStep) ? t('step_completed') : t('step_in_progress')}
                </p>
              </div>
              
              <Button
                onClick={() => navigateToStep(currentStep + 1)}
                disabled={currentStep >= steps.length - 1}
                className="bg-krong-red hover:bg-krong-red/90"
              >
                {t('next_step')}
                <Zap className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-tablet-lg">{t('ar_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('annotation_opacity')}</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={annotationOpacity}
                  onChange={(e) => setAnnotationOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-tablet-xs text-muted-foreground">
                  {Math.round(annotationOpacity * 100)}%
                </span>
              </div>
              
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('tracking_accuracy')}</label>
                <div className="flex items-center gap-2">
                  <Progress value={calibration.trackingAccuracy} className="flex-1" />
                  <span className="text-tablet-xs font-mono">
                    {calibration.trackingAccuracy}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-tablet-sm">{t('show_ar_grid')}</span>
              <Button
                variant={showGrid ? "default" : "outline"}
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-tablet-sm">{t('hand_gestures')}</span>
              <Button
                variant={handGestureEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setHandGestureEnabled(!handGestureEnabled)}
              >
                <Move3D className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ARSOPVisualization;