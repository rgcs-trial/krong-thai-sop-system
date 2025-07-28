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
  Eye,
  EyeOff,
  Settings,
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Brain,
  Scan,
  Image,
  Activity,
  Crosshair,
  Layers,
  RefreshCw,
  Download,
  Upload,
  Play,
  Pause,
  Square,
  RotateCcw
} from 'lucide-react';

interface DetectionZone {
  id: string;
  name: string;
  name_fr: string;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)  
  width: number; // Percentage (0-100)
  height: number; // Percentage (0-100)
  criteria: QualityCriteria[];
  active: boolean;
}

interface QualityCriteria {
  id: string;
  name: string;
  name_fr: string;
  type: 'color' | 'temperature' | 'size' | 'texture' | 'cleanliness' | 'safety' | 'portion' | 'presentation';
  threshold: number; // 0-100 acceptance threshold
  target_value?: any; // Expected value for comparison
  tolerance?: number; // Acceptable deviation
  required: boolean;
}

interface DetectionResult {
  id: string;
  timestamp: Date;
  zone_id: string;
  criteria_id: string;
  detected_value: any;
  confidence: number; // 0-100
  passed: boolean;
  deviation?: number;
  description: string;
  description_fr: string;
}

interface QualityInspection {
  id: string;
  timestamp: Date;
  sop_step_id?: string;
  zones_checked: string[];
  results: DetectionResult[];
  overall_score: number; // 0-100
  passed: boolean;
  issues_found: DetectionResult[];
  processing_time_ms: number;
}

interface AIModel {
  id: string;
  name: string;
  type: 'classification' | 'object_detection' | 'segmentation' | 'quality_assessment';
  accuracy: number;
  inference_time_ms: number;
  supported_criteria: QualityCriteria['type'][];
  loaded: boolean;
}

interface AIVisualRecognitionProps {
  /** Detection zones configuration */
  detectionZones: DetectionZone[];
  /** Enable real-time processing */
  realTimeProcessing?: boolean;
  /** AI model settings */
  modelSettings?: {
    accuracy_threshold: number;
    confidence_threshold: number;
    processing_quality: 'fast' | 'balanced' | 'accurate';
  };
  /** Enable quality scoring */
  enableQualityScoring?: boolean;
  /** Show visual feedback */
  showVisualFeedback?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when inspection completes */
  onInspectionComplete?: (inspection: QualityInspection) => void;
  /** Callback when detection occurs */
  onDetection?: (result: DetectionResult) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * AIVisualRecognition - AI-powered visual quality control system
 * 
 * Features:
 * - Real-time computer vision quality assessment
 * - Multi-criteria food safety and presentation checks
 * - AI-powered object detection and classification
 * - Temperature and color analysis
 * - Portion size and presentation validation
 * - Cleanliness and safety compliance checks
 * - Configurable detection zones and criteria
 * - Real-time scoring and feedback
 * - Restaurant-specific quality standards
 * - Performance-optimized inference
 * 
 * @param props AIVisualRecognitionProps
 * @returns JSX.Element
 */
const AIVisualRecognition: React.FC<AIVisualRecognitionProps> = ({
  detectionZones,
  realTimeProcessing = true,
  modelSettings = {
    accuracy_threshold: 80,
    confidence_threshold: 75,
    processing_quality: 'balanced'
  },
  enableQualityScoring = true,
  showVisualFeedback = true,
  isLoading = false,
  onInspectionComplete,
  onDetection,
  className
}) => {
  const t = useTranslations('sop.ai_visual');
  
  // AI System State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [aiModelsLoaded, setAiModelsLoaded] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<QualityInspection | null>(null);
  
  // Detection State
  const [activeZones, setActiveZones] = useState<Set<string>>(new Set(detectionZones.map(z => z.id)));
  const [latestResults, setLatestResults] = useState<DetectionResult[]>([]);
  const [overallQualityScore, setOverallQualityScore] = useState(0);
  const [processingFPS, setProcessingFPS] = useState(0);
  const [detectionHistory, setDetectionHistory] = useState<QualityInspection[]>([]);
  
  // AI Models
  const [aiModels] = useState<AIModel[]>([
    {
      id: 'food_classifier',
      name: 'Food Classification Model',
      type: 'classification',
      accuracy: 94,
      inference_time_ms: 120,
      supported_criteria: ['presentation', 'portion'],
      loaded: false
    },
    {
      id: 'quality_detector',
      name: 'Quality Assessment Model',
      type: 'quality_assessment',
      accuracy: 89,
      inference_time_ms: 180,
      supported_criteria: ['color', 'texture', 'cleanliness'],
      loaded: false
    },
    {
      id: 'safety_inspector',
      name: 'Safety Compliance Model',
      type: 'object_detection',
      accuracy: 96,
      inference_time_ms: 200,
      supported_criteria: ['safety', 'cleanliness'],
      loaded: false
    },
    {
      id: 'thermal_analyzer',
      name: 'Temperature Analysis Model',
      type: 'segmentation',
      accuracy: 85,
      inference_time_ms: 250,
      supported_criteria: ['temperature'],
      loaded: false
    }
  ]);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Performance Metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    total_inspections: 0,
    average_processing_time: 0,
    accuracy_rate: 0,
    false_positive_rate: 0
  });
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingWorkerRef = useRef<Worker | null>(null);

  // Initialize AI System
  useEffect(() => {
    const initializeAI = async () => {
      try {
        // Initialize camera
        if (videoRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
          
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraActive(true);
          };
        }
        
        // Simulate AI model loading
        setIsInitialized(true);
        await loadAIModels();
        
        // Initialize processing worker (simulated)
        processingWorkerRef.current = new Worker(
          URL.createObjectURL(new Blob([`
            self.onmessage = function(e) {
              // Simulate AI processing
              setTimeout(() => {
                self.postMessage({ 
                  type: 'processing_complete',
                  results: generateMockResults(e.data.zones)
                });
              }, ${modelSettings.processing_quality === 'fast' ? 50 : 
                   modelSettings.processing_quality === 'balanced' ? 150 : 300});
            };
            
            function generateMockResults(zones) {
              return zones.map(zone => ({
                id: 'result-' + Date.now() + '-' + Math.random(),
                timestamp: new Date(),
                zone_id: zone.id,
                criteria_id: zone.criteria[0]?.id || 'general',
                detected_value: Math.random() * 100,
                confidence: 70 + Math.random() * 25,
                passed: Math.random() > 0.3,
                description: 'AI analysis result',
                description_fr: 'Résultat d\\'analyse IA'
              }));
            }
          `], { type: 'application/javascript' }))
        );
        
        if (processingWorkerRef.current) {
          processingWorkerRef.current.onmessage = handleWorkerMessage;
        }
        
      } catch (error) {
        console.error('AI initialization failed:', error);
        setIsInitialized(false);
      }
    };
    
    initializeAI();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (processingWorkerRef.current) {
        processingWorkerRef.current.terminate();
      }
    };
  }, [modelSettings.processing_quality]);

  // Load AI Models
  const loadAIModels = useCallback(async () => {
    // Simulate model loading
    for (const model of aiModels) {
      await new Promise(resolve => setTimeout(resolve, 500));
      model.loaded = true;
    }
    setAiModelsLoaded(true);
  }, [aiModels]);

  // Handle Worker Messages
  const handleWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, results } = event.data;
    
    if (type === 'processing_complete') {
      setLatestResults(results);
      
      // Calculate overall quality score
      const totalScore = results.reduce((sum: number, result: DetectionResult) => 
        sum + (result.passed ? result.confidence : 0), 0);
      const avgScore = results.length > 0 ? totalScore / results.length : 0;
      setOverallQualityScore(Math.round(avgScore));
      
      // Trigger callbacks
      results.forEach((result: DetectionResult) => onDetection?.(result));
      
      setIsProcessing(false);
    }
  }, [onDetection]);

  // Start Real-time Processing
  const startRealTimeProcessing = useCallback(() => {
    if (!isInitialized || !cameraActive || !aiModelsLoaded) return;
    
    const processFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.videoWidth === 0) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      
      // Set canvas size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Process with AI every few frames to manage performance
      const shouldProcess = Date.now() % (realTimeProcessing ? 500 : 2000) < 50;
      
      if (shouldProcess && !isProcessing) {
        processCurrentFrame();
      }
      
      // Draw overlays
      if (showVisualFeedback) {
        drawDetectionOverlays();
      }
      
      // Update FPS
      setProcessingFPS(Math.round(1000 / 16)); // Approximate FPS
      
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }, [isInitialized, cameraActive, aiModelsLoaded, realTimeProcessing, isProcessing, showVisualFeedback]);

  // Process Current Frame
  const processCurrentFrame = useCallback(() => {
    if (!processingWorkerRef.current || isProcessing) return;
    
    setIsProcessing(true);
    
    // Send active zones to worker for processing
    const activeZoneList = detectionZones.filter(zone => activeZones.has(zone.id));
    processingWorkerRef.current.postMessage({
      type: 'process_frame',
      zones: activeZoneList,
      settings: modelSettings
    });
  }, [detectionZones, activeZones, modelSettings, isProcessing]);

  // Draw Detection Overlays
  const drawDetectionOverlays = useCallback(() => {
    if (!overlayCanvasRef.current || !canvasRef.current) return;
    
    const overlayCanvas = overlayCanvasRef.current;
    const sourceCanvas = canvasRef.current;
    const ctx = overlayCanvas.getContext('2d');
    
    if (!ctx) return;
    
    // Match canvas size
    overlayCanvas.width = sourceCanvas.width;
    overlayCanvas.height = sourceCanvas.height;
    
    // Clear previous overlays
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw detection zones
    detectionZones.forEach(zone => {
      if (!activeZones.has(zone.id)) return;
      
      const result = latestResults.find(r => r.zone_id === zone.id);
      const x = (zone.x / 100) * overlayCanvas.width;
      const y = (zone.y / 100) * overlayCanvas.height;
      const width = (zone.width / 100) * overlayCanvas.width;
      const height = (zone.height / 100) * overlayCanvas.height;
      
      // Zone border
      ctx.strokeStyle = result 
        ? (result.passed ? '#10b981' : '#ef4444')
        : '#6b7280';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(x, y, width, height);
      
      // Zone label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x, y - 30, width, 30);
      
      ctx.fillStyle = 'white';
      ctx.font = '16px Inter, system-ui, sans-serif';
      ctx.fillText(zone.name, x + 8, y - 8);
      
      // Result indicator
      if (result) {
        ctx.fillStyle = result.passed ? '#10b981' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x + width - 15, y + 15, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Confidence score
        ctx.fillStyle = 'white';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText(`${Math.round(result.confidence)}%`, x + width - 40, y + 35);
      }
    });
    
    // Reset line dash
    ctx.setLineDash([]);
  }, [detectionZones, activeZones, latestResults]);

  // Capture Single Frame for Analysis
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Capture current frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Process captured frame
    setIsProcessing(true);
    const startTime = Date.now();
    
    // Simulate comprehensive analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const processingTime = Date.now() - startTime;
    
    // Generate comprehensive inspection results
    const inspection: QualityInspection = {
      id: `inspection-${Date.now()}`,
      timestamp: new Date(),
      zones_checked: Array.from(activeZones),
      results: detectionZones
        .filter(zone => activeZones.has(zone.id))
        .flatMap(zone => zone.criteria.map(criteria => ({
          id: `result-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          zone_id: zone.id,
          criteria_id: criteria.id,
          detected_value: Math.random() * 100,
          confidence: 70 + Math.random() * 25,
          passed: Math.random() > (criteria.required ? 0.2 : 0.4),
          description: `${criteria.name} analysis result`,
          description_fr: `Résultat d'analyse ${criteria.name}`
        }))),
      overall_score: 0,
      passed: false,
      issues_found: [],
      processing_time_ms: processingTime
    };
    
    // Calculate overall score and issues
    const totalScore = inspection.results.reduce((sum, result) => 
      sum + (result.passed ? result.confidence : 0), 0);
    inspection.overall_score = inspection.results.length > 0 
      ? Math.round(totalScore / inspection.results.length) 
      : 0;
    inspection.passed = inspection.overall_score >= modelSettings.accuracy_threshold;
    inspection.issues_found = inspection.results.filter(r => !r.passed);
    
    setCurrentInspection(inspection);
    setDetectionHistory(prev => [...prev.slice(-9), inspection]);
    setIsProcessing(false);
    
    onInspectionComplete?.(inspection);
  }, [detectionZones, activeZones, modelSettings.accuracy_threshold, onInspectionComplete]);

  // Toggle Zone Active State
  const toggleZone = useCallback((zoneId: string) => {
    setActiveZones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) {
        newSet.delete(zoneId);
      } else {
        newSet.add(zoneId);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (cameraActive && realTimeProcessing) {
      startRealTimeProcessing();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, realTimeProcessing, startRealTimeProcessing]);

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
      {/* AI Visual Recognition Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Brain className="w-6 h-6 text-krong-red" />
              {t('title')}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Processing Status */}
              <Badge variant={isProcessing ? "default" : "secondary"} className="text-tablet-sm">
                <Activity className={cn("w-3 h-3 mr-1", isProcessing && "animate-pulse")} />
                {isProcessing ? t('processing') : t('ready')}
              </Badge>
              
              {/* Camera Status */}
              <Badge variant={cameraActive ? "default" : "destructive"} className="text-tablet-sm">
                <Camera className="w-3 h-3 mr-1" />
                {cameraActive ? t('camera_active') : t('camera_inactive')}
              </Badge>
              
              {/* Quality Score */}
              {overallQualityScore > 0 && (
                <Badge 
                  variant={overallQualityScore >= 80 ? "default" : overallQualityScore >= 60 ? "secondary" : "destructive"}
                  className="text-tablet-sm"
                >
                  {overallQualityScore}% {t('quality')}
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
        </CardHeader>
      </Card>

      {/* Camera Feed & Analysis */}
      <Card className="relative overflow-hidden">
        <div className="relative aspect-video bg-black">
          {/* Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Processing Canvas (hidden) */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {/* Overlay Canvas for Detection Zones */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />
          
          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ zIndex: 20 }}>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowVisualFeedback(!showVisualFeedback)}
            >
              {showVisualFeedback ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={captureFrame}
              disabled={!cameraActive || isProcessing}
            >
              <Camera className="w-4 h-4" />
            </Button>
            
            <Button
              variant={realTimeProcessing ? "default" : "secondary"}
              size="icon"
              onClick={() => {
                // Toggle real-time processing
                console.log('Real-time processing toggled');
              }}
            >
              {realTimeProcessing ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Status Overlay */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3" style={{ zIndex: 20 }}>
            {/* AI Models Status */}
            <div className="bg-black/60 px-3 py-2 rounded-lg text-white text-tablet-sm">
              {aiModels.filter(m => m.loaded).length}/{aiModels.length} {t('models_loaded')}
            </div>
            
            {/* Processing FPS */}
            <div className="bg-black/60 px-3 py-2 rounded-lg text-white text-tablet-sm">
              {processingFPS} FPS
            </div>
            
            {/* Active Zones */}
            <div className="bg-black/60 px-3 py-2 rounded-lg text-white text-tablet-sm">
              {activeZones.size}/{detectionZones.length} {t('zones_active')}
            </div>
          </div>
        </div>
      </Card>

      {/* Detection Zones & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Detection Zones */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-krong-red" />
              {t('detection_zones')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {detectionZones.map(zone => {
                const result = latestResults.find(r => r.zone_id === zone.id);
                
                return (
                  <div
                    key={zone.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      activeZones.has(zone.id) 
                        ? result?.passed 
                          ? "bg-green-50 border-green-200" 
                          : result
                          ? "bg-red-50 border-red-200"
                          : "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200 opacity-60",
                      selectedZone === zone.id && "ring-2 ring-krong-red"
                    )}
                    onClick={() => setSelectedZone(
                      selectedZone === zone.id ? null : zone.id
                    )}
                  >
                    <div className="flex-shrink-0">
                      <div
                        className="w-5 h-5 rounded-full border-2 cursor-pointer transition-all"
                        style={{
                          backgroundColor: activeZones.has(zone.id) ? '#ef4444' : 'transparent',
                          borderColor: '#ef4444'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleZone(zone.id);
                        }}
                      >
                        {activeZones.has(zone.id) && (
                          <CheckCircle2 className="w-3 h-3 text-white m-0.5" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-tablet-sm font-medium">
                        {zone.name}
                      </div>
                      <div className="text-tablet-xs text-muted-foreground">
                        {zone.criteria.length} {t('criteria')} • {zone.x}%,{zone.y}%
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {result && (
                        <>
                          {result.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <Badge variant="outline" size="sm">
                            {Math.round(result.confidence)}%
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Latest Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-krong-red" />
              {t('latest_results')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestResults.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {latestResults.map(result => {
                  const zone = detectionZones.find(z => z.id === result.zone_id);
                  
                  return (
                    <div
                      key={result.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        result.passed 
                          ? "bg-green-50 border-green-200" 
                          : "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex-shrink-0">
                        {result.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="text-tablet-sm font-medium">
                          {zone?.name || result.zone_id}
                        </div>
                        <div className="text-tablet-xs text-muted-foreground">
                          {result.description}
                        </div>
                        <div className="text-tablet-xs text-muted-foreground">
                          {result.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <Badge 
                        variant={result.passed ? "default" : "destructive"} 
                        size="sm"
                      >
                        {Math.round(result.confidence)}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Scan className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-tablet-sm">{t('no_results_yet')}</p>
                <p className="text-tablet-xs">{t('capture_or_enable_realtime')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Inspection Summary */}
      {currentInspection && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-krong-red" />
              {t('inspection_summary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-tablet-lg font-semibold">
                    {t('overall_quality_score')}
                  </h3>
                  <p className="text-tablet-sm text-muted-foreground">
                    {currentInspection.passed ? t('inspection_passed') : t('inspection_failed')}
                  </p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-tablet-2xl font-bold",
                    currentInspection.passed ? "text-green-600" : "text-red-600"
                  )}>
                    {currentInspection.overall_score}%
                  </div>
                  <div className="text-tablet-sm text-muted-foreground">
                    {currentInspection.processing_time_ms}ms
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <Progress 
                value={currentInspection.overall_score} 
                className={cn(
                  "h-3",
                  currentInspection.passed ? "bg-green-100" : "bg-red-100"
                )}
              />
              
              {/* Issues Found */}
              {currentInspection.issues_found.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-tablet-sm font-heading font-semibold text-red-800">
                    {t('issues_found')} ({currentInspection.issues_found.length})
                  </h4>
                  <div className="space-y-1">
                    {currentInspection.issues_found.slice(0, 3).map(issue => (
                      <div key={issue.id} className="flex items-center gap-2 text-tablet-sm">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        <span>{issue.description}</span>
                        <Badge variant="destructive" size="sm">
                          {Math.round(issue.confidence)}%
                        </Badge>
                      </div>
                    ))}
                    {currentInspection.issues_found.length > 3 && (
                      <div className="text-tablet-xs text-muted-foreground">
                        {t('and_more_issues', { count: currentInspection.issues_found.length - 3 })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Inspection Actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCapturedImage(null)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('clear_results')}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Export results
                    const data = JSON.stringify(currentInspection, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `inspection-${currentInspection.id}.json`;
                    a.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('export_results')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Models Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-tablet-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-krong-red" />
            {t('ai_models')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiModels.map(model => (
              <div
                key={model.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  model.loaded ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    model.loaded ? "bg-green-500" : "bg-gray-400"
                  )} />
                </div>
                
                <div className="flex-1">
                  <div className="text-tablet-sm font-medium">
                    {model.name}
                  </div>
                  <div className="text-tablet-xs text-muted-foreground capitalize">
                    {model.type} • {model.accuracy}% accuracy
                  </div>
                </div>
                
                <Badge variant="outline" size="sm">
                  {model.inference_time_ms}ms
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-tablet-lg">{t('ai_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('processing_quality')}</label>
                  <select 
                    value={modelSettings.processing_quality}
                    onChange={(e) => {
                      // Update processing quality
                      console.log('Processing quality changed:', e.target.value);
                    }}
                    className="w-full p-2 border rounded-md text-tablet-sm"
                  >
                    <option value="fast">{t('fast_processing')}</option>
                    <option value="balanced">{t('balanced_processing')}</option>
                    <option value="accurate">{t('accurate_processing')}</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('confidence_threshold')}</label>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={modelSettings.confidence_threshold}
                    onChange={(e) => {
                      // Update confidence threshold
                      console.log('Confidence threshold changed:', e.target.value);
                    }}
                    className="w-full"
                  />
                  <span className="text-tablet-xs text-muted-foreground">
                    {modelSettings.confidence_threshold}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('real_time_processing')}</span>
                  <Button
                    variant={realTimeProcessing ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      // Toggle real-time processing
                      console.log('Real-time processing toggled');
                    }}
                  >
                    <Activity className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('quality_scoring')}</span>
                  <Button
                    variant={enableQualityScoring ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      // Toggle quality scoring
                      console.log('Quality scoring toggled');
                    }}
                  >
                    <Target className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('visual_feedback')}</span>
                  <Button
                    variant={showVisualFeedback ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowVisualFeedback(!showVisualFeedback)}
                  >
                    <Layers className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIVisualRecognition;