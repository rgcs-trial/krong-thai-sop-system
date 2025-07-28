'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  VrHeadset, 
  Play, 
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Settings,
  Eye,
  EyeOff,
  Move3D,
  Hand,
  Compass,
  Target,
  Timer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Users,
  Trophy,
  BookOpen,
  Zap
} from 'lucide-react';

interface VRScene {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  environment: 'kitchen' | 'dining' | 'prep' | 'storage' | 'office';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration_minutes: number;
  objectives: string[];
  objectives_fr: string[];
  assets: {
    models: string[];
    textures: string[];
    sounds: string[];
    animations: string[];
  };
}

interface VRInteractionPoint {
  id: string;
  position: { x: number; y: number; z: number };
  type: 'grab' | 'touch' | 'look' | 'gesture' | 'voice';
  trigger: string;
  feedback: 'haptic' | 'visual' | 'audio' | 'combined';
  required: boolean;
  completed: boolean;
  instruction: string;
  instruction_fr: string;
}

interface VRTrainingModule {
  id: string;
  title: string;
  title_fr: string;
  scene: VRScene;
  interactions: VRInteractionPoint[];
  assessment_criteria: {
    accuracy_threshold: number;
    time_limit_minutes: number;
    required_interactions: string[];
  };
  multiplayer_enabled: boolean;
  collaborative_features: string[];
}

interface VRSessionMetrics {
  startTime: Date;
  headMovement: { x: number; y: number; z: number }[];
  handPositions: { left: { x: number; y: number; z: number }; right: { x: number; y: number; z: number } }[];
  interactionAccuracy: number;
  completionTime: number;
  mistakeCount: number;
  helpRequested: number;
}

interface VRTrainingEnvironmentProps {
  /** Training module configuration */
  module: VRTrainingModule;
  /** Enable multiplayer mode */
  enableMultiplayer?: boolean;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Enable spatial audio */
  enableSpatialAudio?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when training starts */
  onTrainingStart?: () => void;
  /** Callback when training completes */
  onTrainingComplete?: (metrics: VRSessionMetrics) => void;
  /** Callback when interaction occurs */
  onInteraction?: (interactionId: string, success: boolean) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * VRTrainingEnvironment - Immersive VR training system for complex procedures
 * 
 * Features:
 * - WebXR-based virtual reality environment
 * - Realistic 3D restaurant kitchen simulations
 * - Hand tracking and gesture recognition
 * - Spatial audio and haptic feedback
 * - Multi-user collaborative training
 * - Real-time performance assessment
 * - Progressive difficulty adaptation
 * - Immersive scenario-based learning
 * - Safety training in virtual environment
 * - Equipment operation simulation
 * 
 * @param props VRTrainingEnvironmentProps
 * @returns JSX.Element
 */
const VRTrainingEnvironment: React.FC<VRTrainingEnvironmentProps> = ({
  module,
  enableMultiplayer = false,
  enableHaptics = true,
  enableSpatialAudio = true,
  isLoading = false,
  onTrainingStart,
  onTrainingComplete,
  onInteraction,
  className
}) => {
  const t = useTranslations('training.vr');
  
  // VR State Management
  const [isVRActive, setIsVRActive] = useState(false);
  const [vrSupported, setVRSupported] = useState(false);
  const [vrSession, setVRSession] = useState<any>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  
  // Training State
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completedInteractions, setCompletedInteractions] = useState<Set<string>>(new Set());
  const [currentObjective, setCurrentObjective] = useState(0);
  const [sessionMetrics, setSessionMetrics] = useState<VRSessionMetrics | null>(null);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(true);
  const [multiplayer, setMultiplayer] = useState(enableMultiplayer);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  
  // Refs
  const vrCanvasRef = useRef<HTMLCanvasElement>(null);
  const vrRendererRef = useRef<any>(null);
  const vrSceneRef = useRef<any>(null);
  const vrCameraRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize VR System
  useEffect(() => {
    const initializeVR = async () => {
      try {
        // Check WebXR support
        if (!('xr' in navigator)) {
          console.warn('WebXR not supported');
          setVRSupported(false);
          return;
        }

        const xr = (navigator as any).xr;
        const supported = await xr.isSessionSupported('immersive-vr');
        setVRSupported(supported);

        if (supported) {
          console.log('VR is supported');
          
          // Initialize VR renderer (placeholder for Three.js or similar)
          if (vrCanvasRef.current) {
            // In a real implementation, this would initialize Three.js WebXR renderer
            vrRendererRef.current = {
              setSize: (width: number, height: number) => {},
              render: (scene: any, camera: any) => {},
              xr: {
                enabled: true,
                setSession: (session: any) => {}
              }
            };
          }
        }

      } catch (error) {
        console.error('VR initialization failed:', error);
        setVRSupported(false);
      }
    };

    initializeVR();
  }, []);

  // Initialize Training Session
  const initializeTrainingSession = useCallback(() => {
    const metrics: VRSessionMetrics = {
      startTime: new Date(),
      headMovement: [],
      handPositions: [],
      interactionAccuracy: 0,
      completionTime: 0,
      mistakeCount: 0,
      helpRequested: 0
    };
    
    setSessionMetrics(metrics);
    setCompletedInteractions(new Set());
    setCurrentObjective(0);
  }, []);

  // Start VR Training Session
  const startVRSession = useCallback(async () => {
    if (!vrSupported) {
      console.error('VR not supported');
      return;
    }

    try {
      setIsCalibrating(true);
      
      // Simulate calibration process
      for (let i = 0; i <= 100; i += 10) {
        setCalibrationProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const xr = (navigator as any).xr;
      const session = await xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'hit-test']
      });
      
      setVRSession(session);
      setIsVRActive(true);
      setIsCalibrating(false);
      setTrainingStarted(true);
      
      initializeTrainingSession();
      onTrainingStart?.();
      
      // Set up session event listeners
      session.addEventListener('end', () => {
        setIsVRActive(false);
        setVRSession(null);
        setTrainingStarted(false);
      });

      // Initialize VR scene
      initializeVRScene(session);
      
    } catch (error) {
      console.error('Failed to start VR session:', error);
      setIsCalibrating(false);
    }
  }, [vrSupported, onTrainingStart, initializeTrainingSession]);

  // Initialize VR Scene
  const initializeVRScene = useCallback((session: any) => {
    // In a real implementation, this would create a Three.js scene
    // with restaurant environment, equipment, and interactive objects
    
    const scene = {
      environment: module.scene.environment,
      objects: [],
      lighting: 'realistic',
      physics: true
    };
    
    vrSceneRef.current = scene;
    
    // Start render loop
    const renderLoop = () => {
      if (session && vrRendererRef.current && vrSceneRef.current && vrCameraRef.current) {
        // Update VR scene
        updateVRScene();
        
        // Render frame
        vrRendererRef.current.render(vrSceneRef.current, vrCameraRef.current);
      }
      
      if (isVRActive) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };
    
    renderLoop();
  }, [module.scene.environment, isVRActive]);

  // Update VR Scene
  const updateVRScene = useCallback(() => {
    if (!sessionMetrics || !vrSession) return;
    
    // Update metrics (simulated data)
    const now = Date.now();
    const elapsed = now - sessionMetrics.startTime.getTime();
    
    // Simulate head tracking
    sessionMetrics.headMovement.push({
      x: Math.sin(elapsed / 1000) * 0.1,
      y: Math.cos(elapsed / 1000) * 0.05,
      z: 0
    });
    
    // Simulate hand tracking
    if (handTrackingEnabled) {
      sessionMetrics.handPositions.push({
        left: { x: -0.3, y: 0.8, z: -0.5 },
        right: { x: 0.3, y: 0.8, z: -0.5 }
      });
    }
    
    setSessionMetrics({ ...sessionMetrics });
  }, [sessionMetrics, handTrackingEnabled, vrSession]);

  // End VR Session
  const endVRSession = useCallback(() => {
    if (vrSession) {
      vrSession.end();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Calculate final metrics
    if (sessionMetrics) {
      const finalMetrics = {
        ...sessionMetrics,
        completionTime: Date.now() - sessionMetrics.startTime.getTime(),
        interactionAccuracy: (completedInteractions.size / module.interactions.length) * 100
      };
      
      onTrainingComplete?.(finalMetrics);
    }
    
    setIsVRActive(false);
    setVRSession(null);
    setTrainingStarted(false);
  }, [vrSession, sessionMetrics, completedInteractions.size, module.interactions.length, onTrainingComplete]);

  // Handle Interaction
  const handleInteraction = useCallback((interactionId: string) => {
    const interaction = module.interactions.find(i => i.id === interactionId);
    if (!interaction) return;
    
    const success = Math.random() > 0.3; // Simulate success rate
    
    if (success) {
      setCompletedInteractions(prev => new Set([...prev, interactionId]));
      
      // Haptic feedback
      if (enableHaptics && vrSession) {
        // In a real implementation, this would trigger haptic feedback
        console.log('Haptic feedback triggered');
      }
      
      // Progress to next objective if needed
      if (completedInteractions.size + 1 >= module.interactions.filter(i => i.required).length) {
        if (currentObjective < module.scene.objectives.length - 1) {
          setCurrentObjective(prev => prev + 1);
        }
      }
    } else {
      // Increment mistake count
      if (sessionMetrics) {
        sessionMetrics.mistakeCount++;
        setSessionMetrics({ ...sessionMetrics });
      }
    }
    
    onInteraction?.(interactionId, success);
  }, [module.interactions, enableHaptics, vrSession, completedInteractions.size, currentObjective, sessionMetrics, onInteraction]);

  // Calculate progress
  const requiredInteractions = module.interactions.filter(i => i.required);
  const progress = requiredInteractions.length > 0 
    ? (completedInteractions.size / requiredInteractions.length) * 100 
    : 0;

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
      {/* VR Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <VrHeadset className="w-6 h-6 text-krong-red" />
              {module.title}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* VR Status */}
              <Badge variant={isVRActive ? "default" : "secondary"} className="text-tablet-sm">
                <Eye className="w-3 h-3 mr-1" />
                {isVRActive ? t('vr_active') : t('vr_inactive')}
              </Badge>
              
              {/* Difficulty */}
              <Badge 
                variant={module.scene.difficulty === 'expert' ? "destructive" : "outline"} 
                className="text-tablet-sm capitalize"
              >
                {module.scene.difficulty}
              </Badge>
              
              {/* Multiplayer Status */}
              {multiplayer && (
                <Badge variant="outline" className="text-tablet-sm">
                  <Users className="w-3 h-3 mr-1" />
                  {connectedUsers.length + 1}
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
              <span>{t('objective', { current: currentObjective + 1, total: module.scene.objectives.length })}</span>
              <span>{Math.round(progress)}% {t('complete')}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* VR Environment */}
      <Card className="relative overflow-hidden">
        <div className="relative aspect-video bg-gradient-to-b from-gray-900 to-gray-800">
          {/* VR Canvas */}
          <canvas
            ref={vrCanvasRef}
            className="absolute inset-0 w-full h-full"
            width={1920}
            height={1080}
          />
          
          {/* VR Controls Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
            {!isVRActive && !isCalibrating && (
              <div className="pointer-events-auto text-center space-y-4">
                {vrSupported ? (
                  <>
                    <Button
                      size="lg"
                      onClick={startVRSession}
                      className="bg-krong-red hover:bg-krong-red/90 text-white px-8 py-4"
                    >
                      <VrHeadset className="w-6 h-6 mr-2" />
                      {t('enter_vr')}
                    </Button>
                    <p className="text-white text-tablet-sm max-w-md">
                      {t('vr_instructions')}
                    </p>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500" />
                    <h3 className="text-tablet-lg font-heading text-white">{t('vr_not_supported')}</h3>
                    <p className="text-tablet-base text-gray-300 max-w-md">
                      {t('vr_not_supported_desc')}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Calibration Overlay */}
            {isCalibrating && (
              <div className="pointer-events-auto text-center space-y-4 bg-black/80 p-8 rounded-lg">
                <div className="animate-spin mb-4">
                  <VrHeadset className="w-16 h-16 mx-auto text-krong-red" />
                </div>
                <h3 className="text-tablet-lg font-heading text-white">{t('calibrating_vr')}</h3>
                <Progress value={calibrationProgress} className="w-64 h-3" />
                <p className="text-tablet-sm text-gray-300">
                  {t('calibration_instructions')}
                </p>
              </div>
            )}
          </div>
          
          {/* VR Action Buttons */}
          {isVRActive && (
            <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ zIndex: 20 }}>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setAudioEnabled(!audioEnabled)}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setHandTrackingEnabled(!handTrackingEnabled)}
              >
                <Hand className={cn("w-4 h-4", handTrackingEnabled && "text-krong-red")} />
              </Button>
              
              <Button
                variant="destructive"
                size="icon"
                onClick={endVRSession}
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Training Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Objective */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-krong-red" />
              {t('current_objective')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-tablet-base font-medium">
                {module.scene.objectives[currentObjective]}
              </p>
              
              <div className="space-y-2">
                <h4 className="text-tablet-sm font-heading font-semibold">{t('required_interactions')}</h4>
                <div className="space-y-1">
                  {module.interactions.filter(i => i.required).map((interaction) => (
                    <div
                      key={interaction.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border",
                        completedInteractions.has(interaction.id) 
                          ? "bg-green-50 border-green-200" 
                          : "bg-gray-50 border-gray-200"
                      )}
                    >
                      {completedInteractions.has(interaction.id) ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="text-tablet-sm flex-1">
                        {interaction.instruction}
                      </span>
                      <Badge variant="outline" size="sm" className="capitalize">
                        {interaction.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-krong-red" />
              {t('performance_metrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-tablet-xl font-bold text-krong-red">
                      {Math.round((Date.now() - sessionMetrics.startTime.getTime()) / 1000 / 60)}m
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {t('elapsed_time')}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-tablet-xl font-bold text-green-600">
                      {Math.round(progress)}%
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {t('accuracy')}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-tablet-xl font-bold text-blue-600">
                      {completedInteractions.size}
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {t('completed_actions')}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-tablet-xl font-bold text-orange-600">
                      {sessionMetrics.mistakeCount}
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {t('mistakes')}
                    </div>
                  </div>
                </div>
                
                {/* Real-time Feedback */}
                <div className="space-y-2">
                  <h4 className="text-tablet-sm font-heading font-semibold">{t('real_time_feedback')}</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-tablet-sm">
                      <span>{t('hand_tracking')}</span>
                      <Badge variant={handTrackingEnabled ? "default" : "secondary"} size="sm">
                        {handTrackingEnabled ? t('active') : t('inactive')}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-tablet-sm">
                      <span>{t('spatial_audio')}</span>
                      <Badge variant={enableSpatialAudio ? "default" : "secondary"} size="sm">
                        {enableSpatialAudio ? t('enabled') : t('disabled')}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-tablet-sm">
                      <span>{t('haptic_feedback')}</span>
                      <Badge variant={enableHaptics ? "default" : "secondary"} size="sm">
                        {enableHaptics ? t('enabled') : t('disabled')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2" />
                <p className="text-tablet-sm">{t('metrics_available_after_start')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-tablet-lg">{t('vr_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('hand_tracking')}</span>
                  <Button
                    variant={handTrackingEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHandTrackingEnabled(!handTrackingEnabled)}
                  >
                    <Hand className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('spatial_audio')}</span>
                  <Button
                    variant={audioEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('multiplayer_mode')}</span>
                  <Button
                    variant={multiplayer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMultiplayer(!multiplayer)}
                    disabled={!module.multiplayer_enabled}
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('environment_quality')}</label>
                  <select className="w-full p-2 border rounded-md text-tablet-sm">
                    <option value="high">{t('high_quality')}</option>
                    <option value="medium">{t('medium_quality')}</option>
                    <option value="low">{t('low_quality')}</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('difficulty_adaptation')}</label>
                  <select className="w-full p-2 border rounded-md text-tablet-sm">
                    <option value="adaptive">{t('adaptive')}</option>
                    <option value="fixed">{t('fixed')}</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <VrHeadset className="w-6 h-6 text-krong-red" />
              {t('vr_training_instructions')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">{t('before_you_begin')}</h4>
              <ul className="text-tablet-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>{t('instruction_1')}</li>
                <li>{t('instruction_2')}</li>
                <li>{t('instruction_3')}</li>
                <li>{t('instruction_4')}</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">{t('vr_controls')}</h4>
              <div className="grid grid-cols-2 gap-2 text-tablet-sm">
                <div className="flex items-center gap-2">
                  <Hand className="w-4 h-4" />
                  <span>{t('use_hands')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Move3D className="w-4 h-4" />
                  <span>{t('move_around')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>{t('point_select')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span>{t('voice_commands')}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowInstructions(false)}>
                {t('skip')}
              </Button>
              <Button onClick={() => setShowInstructions(false)}>
                {t('got_it')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VRTrainingEnvironment;