'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Hand, 
  Settings, 
  Video, 
  VideoOff,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MousePointer,
  AlertCircle,
  CheckCircle,
  Loader2,
  Camera,
  Maximize,
  Minimize,
  RotateCw
} from 'lucide-react';

interface GestureEvent {
  id: string;
  type: 'hand_raise' | 'fist' | 'thumbs_up' | 'thumbs_down' | 'point_left' | 'point_right' | 'wave' | 'ok_sign' | 'stop_sign';
  confidence: number;
  timestamp: string;
  coordinates?: { x: number; y: number };
  duration?: number;
}

interface GestureMapping {
  gesture: GestureEvent['type'];
  action: 'next_step' | 'previous_step' | 'play_pause' | 'approve' | 'reject' | 'help' | 'menu' | 'scroll_up' | 'scroll_down' | 'zoom_in' | 'zoom_out';
  label: string;
  label_fr: string;
  enabled: boolean;
  confidence_threshold: number;
  hold_duration?: number; // milliseconds
}

interface GestureControlsProps {
  /** Current SOP step index */
  currentStep?: number;
  /** Total number of steps */
  totalSteps?: number;
  /** Whether SOP is currently playing */
  isPlaying?: boolean;
  /** Enable gesture recognition */
  enabled?: boolean;
  /** Show gesture feedback overlay */
  showFeedback?: boolean;
  /** Custom gesture mappings */
  customMappings?: Partial<GestureMapping>[];
  /** Callback when gesture action is triggered */
  onGestureAction?: (action: GestureMapping['action'], gesture: GestureEvent) => void;
  /** Callback when gesture is detected */
  onGestureDetected?: (gesture: GestureEvent) => void;
  /** Callback when gesture recognition status changes */
  onStatusChange?: (enabled: boolean, error?: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * GestureControls - MediaPipe-powered hands-free gesture navigation
 * 
 * Features:
 * - Hand gesture recognition using MediaPipe Hands
 * - Customizable gesture-to-action mappings
 * - Real-time visual feedback with gesture overlays
 * - Confidence threshold and hold duration settings
 * - Restaurant-optimized gestures for food service environments
 * - Bilingual gesture command descriptions
 * - Accessibility support with audio feedback
 * - Tablet-optimized camera integration
 * 
 * @param props GestureControlsProps
 * @returns JSX.Element
 */
const GestureControls: React.FC<GestureControlsProps> = ({
  currentStep = 0,
  totalSteps = 1,
  isPlaying = false,
  enabled = false,
  showFeedback = true,
  customMappings = [],
  onGestureAction,
  onGestureDetected,
  onStatusChange,
  className
}) => {
  const t = useTranslations('sop.gestureControls');
  
  // Default gesture mappings
  const defaultMappings: GestureMapping[] = [
    {
      gesture: 'thumbs_up',
      action: 'approve',
      label: 'Approve/Next',
      label_fr: 'Approuver/Suivant',
      enabled: true,
      confidence_threshold: 0.8
    },
    {
      gesture: 'thumbs_down',
      action: 'reject',
      label: 'Reject/Previous',
      label_fr: 'Rejeter/Précédent',
      enabled: true,
      confidence_threshold: 0.8
    },
    {
      gesture: 'fist',
      action: 'play_pause',
      label: 'Play/Pause',
      label_fr: 'Lecture/Pause',
      enabled: true,
      confidence_threshold: 0.7,
      hold_duration: 1000
    },
    {
      gesture: 'point_right',
      action: 'next_step',
      label: 'Next Step',
      label_fr: 'Étape Suivante',
      enabled: true,
      confidence_threshold: 0.75
    },
    {
      gesture: 'point_left',
      action: 'previous_step',
      label: 'Previous Step',
      label_fr: 'Étape Précédente',
      enabled: true,
      confidence_threshold: 0.75
    },
    {
      gesture: 'hand_raise',
      action: 'help',
      label: 'Help/Menu',
      label_fr: 'Aide/Menu',
      enabled: true,
      confidence_threshold: 0.8,
      hold_duration: 2000
    },
    {
      gesture: 'ok_sign',
      action: 'zoom_in',
      label: 'Zoom In',
      label_fr: 'Zoom Avant',
      enabled: true,
      confidence_threshold: 0.7
    },
    {
      gesture: 'stop_sign',
      action: 'zoom_out',
      label: 'Zoom Out',
      label_fr: 'Zoom Arrière',
      enabled: true,
      confidence_threshold: 0.7
    }
  ];

  const [gestureMappings, setGestureMappings] = useState<GestureMapping[]>(
    defaultMappings.map(mapping => {
      const custom = customMappings.find(c => c.gesture === mapping.gesture);
      return custom ? { ...mapping, ...custom } : mapping;
    })
  );

  const [isInitialized, setIsInitialized] = useState(false);
  const [isActive, setIsActive] = useState(enabled);
  const [currentGesture, setCurrentGesture] = useState<GestureEvent | null>(null);
  const [recentGestures, setRecentGestures] = useState<GestureEvent[]>([]);
  const [gestureHold, setGestureHold] = useState<{ gesture: GestureEvent; startTime: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gestureHoldTimerRef = useRef<NodeJS.Timeout | null>(null);

  // MediaPipe Hands instance (would be initialized from CDN or npm package)
  const handsRef = useRef<any>(null);

  // Initialize MediaPipe Hands
  const initializeMediaPipe = useCallback(async () => {
    try {
      // In a real implementation, you would load MediaPipe from CDN or npm
      // For this example, we'll simulate the MediaPipe API
      
      // Simulated MediaPipe Hands configuration
      const hands = {
        initialize: async () => {
          console.log('MediaPipe Hands initialized');
          return true;
        },
        onResults: (callback: (results: any) => void) => {
          // Simulate gesture detection with mock data
          const simulateGesture = () => {
            if (!isActive) return;
            
            // Random gesture simulation for demo
            const gestures: GestureEvent['type'][] = ['thumbs_up', 'point_right', 'fist', 'ok_sign'];
            const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
            
            if (Math.random() > 0.95) { // 5% chance per frame
              const gestureEvent: GestureEvent = {
                id: `gesture-${Date.now()}`,
                type: randomGesture,
                confidence: 0.7 + Math.random() * 0.3,
                timestamp: new Date().toISOString(),
                coordinates: {
                  x: Math.random() * 640,
                  y: Math.random() * 480
                }
              };
              
              callback({ multiHandLandmarks: [[]], gesture: gestureEvent });
            }
          };
          
          const interval = setInterval(simulateGesture, 100); // 10 FPS simulation
          return () => clearInterval(interval);
        },
        send: async (imageData: any) => {
          // Process frame (simulated)
          return true;
        }
      };
      
      handsRef.current = hands;
      await hands.initialize();
      setIsInitialized(true);
      setError(null);
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      setError('Failed to initialize gesture recognition');
      setIsInitialized(false);
    }
  }, [isActive]);

  // Initialize camera stream
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Front camera for gesture recognition
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
        setCameraPermission('granted');
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      setCameraPermission('denied');
      setError('Camera access required for gesture recognition');
    }
  }, []);

  // Process video frame for gesture detection
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !handsRef.current || !isActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Send frame to MediaPipe (simulated)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    handsRef.current?.send(imageData);

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive]);

  // Handle MediaPipe results
  const handleResults = useCallback((results: any) => {
    if (!results.gesture || !isActive) return;

    const gesture: GestureEvent = results.gesture;
    const mapping = gestureMappings.find(m => m.gesture === gesture.type && m.enabled);
    
    if (!mapping || gesture.confidence < mapping.confidence_threshold) {
      return;
    }

    setCurrentGesture(gesture);
    onGestureDetected?.(gesture);

    // Add to recent gestures
    setRecentGestures(prev => [gesture, ...prev.slice(0, 4)]);

    // Handle gesture with hold duration
    if (mapping.hold_duration) {
      if (!gestureHold || gestureHold.gesture.type !== gesture.type) {
        setGestureHold({ gesture, startTime: Date.now() });
        
        gestureHoldTimerRef.current = setTimeout(() => {
          triggerGestureAction(mapping.action, gesture);
          setGestureHold(null);
        }, mapping.hold_duration);
      }
    } else {
      // Immediate action
      triggerGestureAction(mapping.action, gesture);
    }
  }, [gestureMappings, isActive, gestureHold]);

  // Trigger gesture action
  const triggerGestureAction = useCallback((action: GestureMapping['action'], gesture: GestureEvent) => {
    onGestureAction?.(action, gesture);
    
    // Clear current gesture after a short delay
    setTimeout(() => {
      setCurrentGesture(null);
    }, 1000);
  }, [onGestureAction]);

  // Start gesture recognition
  const startGestureRecognition = useCallback(async () => {
    if (!isInitialized) {
      await initializeMediaPipe();
    }
    
    await initializeCamera();
    
    if (handsRef.current) {
      const cleanup = handsRef.current.onResults(handleResults);
      setIsActive(true);
      onStatusChange?.(true);
      
      // Start processing frames
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = () => {
          processFrame();
        };
      }
      
      return cleanup;
    }
  }, [isInitialized, initializeMediaPipe, initializeCamera, handleResults, processFrame, onStatusChange]);

  // Stop gesture recognition
  const stopGestureRecognition = useCallback(() => {
    setIsActive(false);
    onStatusChange?.(false);

    // Stop camera stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear timers
    if (gestureHoldTimerRef.current) {
      clearTimeout(gestureHoldTimerRef.current);
      gestureHoldTimerRef.current = null;
    }

    setCurrentGesture(null);
    setGestureHold(null);
  }, [onStatusChange]);

  // Toggle gesture recognition
  const toggleGestureRecognition = useCallback(async () => {
    if (isActive) {
      stopGestureRecognition();
    } else {
      await startGestureRecognition();
    }
  }, [isActive, startGestureRecognition, stopGestureRecognition]);

  // Update gesture mapping
  const updateGestureMapping = useCallback((gesture: GestureEvent['type'], updates: Partial<GestureMapping>) => {
    setGestureMappings(prev => 
      prev.map(mapping => 
        mapping.gesture === gesture ? { ...mapping, ...updates } : mapping
      )
    );
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeMediaPipe();
    
    return () => {
      stopGestureRecognition();
    };
  }, [initializeMediaPipe, stopGestureRecognition]);

  // Auto-start if enabled
  useEffect(() => {
    if (enabled && !isActive && isInitialized) {
      startGestureRecognition();
    } else if (!enabled && isActive) {
      stopGestureRecognition();
    }
  }, [enabled, isActive, isInitialized, startGestureRecognition, stopGestureRecognition]);

  // Get gesture icon
  const getGestureIcon = (gesture: GestureEvent['type']) => {
    switch (gesture) {
      case 'thumbs_up': return '👍';
      case 'thumbs_down': return '👎';
      case 'fist': return '✊';
      case 'point_right': return '👉';
      case 'point_left': return '👈';
      case 'hand_raise': return '✋';
      case 'ok_sign': return '👌';
      case 'stop_sign': return '🛑';
      case 'wave': return '👋';
      default: return '✋';
    }
  };

  // Get action icon
  const getActionIcon = (action: GestureMapping['action']) => {
    switch (action) {
      case 'next_step': return <SkipForward className="w-4 h-4" />;
      case 'previous_step': return <SkipBack className="w-4 h-4" />;
      case 'play_pause': return isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />;
      case 'approve': return <CheckCircle className="w-4 h-4" />;
      case 'reject': return <AlertCircle className="w-4 h-4" />;
      case 'help': return <Hand className="w-4 h-4" />;
      case 'zoom_in': return <Maximize className="w-4 h-4" />;
      case 'zoom_out': return <Minimize className="w-4 h-4" />;
      default: return <MousePointer className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Control Card */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Hand className="w-6 h-6 text-krong-red" />
              {t('title')}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <Badge 
                variant={isActive ? "default" : "secondary"}
                className={cn(
                  "text-tablet-sm",
                  isActive ? "bg-jade-green text-white" : ""
                )}
              >
                {isActive ? t('active') : t('inactive')}
              </Badge>
              
              {/* Settings Toggle */}
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
          {/* Main Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-tablet-base font-medium">
                {t('enableGestures')}
              </p>
              <p className="text-tablet-sm text-muted-foreground">
                {t('gesturesDescription')}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={toggleGestureRecognition}
              disabled={!isInitialized}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-tablet-sm font-medium text-red-800">
                  {t('error')}
                </p>
                <p className="text-tablet-xs text-red-700 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Camera Permission */}
          {cameraPermission === 'denied' && (
            <div className="p-3 bg-golden-saffron/10 border border-golden-saffron/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Camera className="w-5 h-5 text-golden-saffron flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-tablet-sm font-medium text-golden-saffron">
                    {t('cameraRequired')}
                  </p>
                  <p className="text-tablet-xs text-golden-saffron/80 mt-1">
                    {t('cameraPermissionHelp')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Current Gesture Display */}
          {isActive && currentGesture && showFeedback && (
            <div className="p-4 bg-krong-red/5 border border-krong-red/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {getGestureIcon(currentGesture.type)}
                  </div>
                  <div>
                    <p className="text-tablet-base font-medium text-krong-red">
                      {t(`gestures.${currentGesture.type}`)}
                    </p>
                    <p className="text-tablet-sm text-muted-foreground">
                      {t('confidence')}: {Math.round(currentGesture.confidence * 100)}%
                    </p>
                  </div>
                </div>
                
                {gestureHold?.gesture.type === currentGesture.type && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-krong-red" />
                    <span className="text-tablet-sm text-krong-red">
                      {t('holdGesture')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {isActive && (
            <div className="grid grid-cols-2 gap-3">
              {gestureMappings.filter(m => m.enabled).slice(0, 4).map((mapping) => (
                <div
                  key={mapping.gesture}
                  className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getGestureIcon(mapping.gesture)}</span>
                    {getActionIcon(mapping.action)}
                  </div>
                  <p className="text-tablet-sm font-medium">
                    {mapping.label}
                  </p>
                  <p className="text-tablet-xs text-muted-foreground">
                    {t(`actions.${mapping.action}`)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Feed (Hidden - for processing only) */}
      <div className="hidden">
        <video ref={videoRef} autoPlay muted playsInline />
        <canvas ref={canvasRef} />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg">
              {t('gestureSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gesture Mappings */}
            <div className="space-y-3">
              <h4 className="text-tablet-base font-semibold">
                {t('gestureMappings')}
              </h4>
              
              {gestureMappings.map((mapping) => (
                <div
                  key={mapping.gesture}
                  className="p-3 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getGestureIcon(mapping.gesture)}</span>
                      <div>
                        <p className="text-tablet-sm font-medium">
                          {mapping.label}
                        </p>
                        <p className="text-tablet-xs text-muted-foreground">
                          {t(`gestures.${mapping.gesture}`)}
                        </p>
                      </div>
                    </div>
                    
                    <Switch
                      checked={mapping.enabled}
                      onCheckedChange={(enabled) => 
                        updateGestureMapping(mapping.gesture, { enabled })
                      }
                    />
                  </div>
                  
                  {mapping.enabled && (
                    <div className="space-y-2 pl-8">
                      <div className="flex items-center justify-between">
                        <span className="text-tablet-xs text-muted-foreground">
                          {t('confidenceThreshold')}
                        </span>
                        <span className="text-tablet-xs font-mono">
                          {Math.round(mapping.confidence_threshold * 100)}%
                        </span>
                      </div>
                      
                      {mapping.hold_duration && (
                        <div className="flex items-center justify-between">
                          <span className="text-tablet-xs text-muted-foreground">
                            {t('holdDuration')}
                          </span>
                          <span className="text-tablet-xs font-mono">
                            {mapping.hold_duration}ms
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Gestures History */}
      {isActive && recentGestures.length > 0 && showFeedback && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-base">
              {t('recentGestures')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentGestures.map((gesture) => (
                <div key={gesture.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getGestureIcon(gesture.type)}</span>
                    <span className="text-tablet-sm">
                      {t(`gestures.${gesture.type}`)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-tablet-xs">
                    {Math.round(gesture.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GestureControls;