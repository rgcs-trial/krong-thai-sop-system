'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Volume2, 
  VolumeX,
  Headphones,
  Settings,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Compass,
  MapPin,
  Waves,
  Radio,
  Zap,
  Target,
  Move3D,
  Orbit,
  Mic,
  Speaker,
  Activity,
  Ear
} from 'lucide-react';

interface AudioSource {
  id: string;
  name: string;
  name_fr: string;
  url: string;
  position: { x: number; y: number; z: number };
  volume: number;
  loop: boolean;
  autoplay: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'ambient' | 'voice' | 'effect' | 'music' | 'notification' | 'equipment';
  distance_model: 'linear' | 'inverse' | 'exponential';
  max_distance: number;
  cone_angle?: number;
  cone_outer_gain?: number;
}

interface ListenerPosition {
  x: number;
  y: number;
  z: number;
  orientation: {
    forward: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
  };
}

interface SpatialAudioScene {
  id: string;
  name: string;
  name_fr: string;
  environment: 'kitchen' | 'dining' | 'storage' | 'office' | 'outdoor';
  sources: AudioSource[];
  listener: ListenerPosition;
  room_properties: {
    size: { x: number; y: number; z: number };
    absorption: number;
    reverb: number;
    echo_delay: number;
  };
  ambient_settings: {
    background_volume: number;
    noise_floor: number;
    dynamic_range: number;
  };
}

interface SpatialAudioSystemProps {
  /** Current audio scene */
  scene: SpatialAudioScene;
  /** Enable 3D audio processing */
  enable3D?: boolean;
  /** Enable HRTF (Head-Related Transfer Function) */
  enableHRTF?: boolean;
  /** Enable reverb effects */
  enableReverb?: boolean;
  /** Master volume (0-100) */
  masterVolume?: number;
  /** Auto-update listener position */
  autoUpdateListener?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when audio starts playing */
  onAudioStart?: (sourceId: string) => void;
  /** Callback when audio stops */
  onAudioStop?: (sourceId: string) => void;
  /** Callback when listener position changes */
  onListenerMove?: (position: ListenerPosition) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SpatialAudioSystem - Immersive 3D audio environment for training
 * 
 * Features:
 * - Web Audio API-based 3D spatial audio
 * - HRTF-processed binaural audio
 * - Dynamic reverb and environmental effects
 * - Multi-source audio mixing and positioning
 * - Real-time listener tracking and orientation
 * - Restaurant environment audio simulation
 * - Voice guidance with spatial positioning
 * - Equipment sounds with distance modeling
 * - Ambient soundscapes for immersion
 * - Performance-optimized audio processing
 * 
 * @param props SpatialAudioSystemProps
 * @returns JSX.Element
 */
const SpatialAudioSystem: React.FC<SpatialAudioSystemProps> = ({
  scene,
  enable3D = true,
  enableHRTF = true,
  enableReverb = true,
  masterVolume = 75,
  autoUpdateListener = true,
  isLoading = false,
  onAudioStart,
  onAudioStop,
  onListenerMove,
  className
}) => {
  const t = useTranslations('training.spatial_audio');
  
  // Audio System State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(scene);
  const [activeAudioSources, setActiveAudioSources] = useState<Set<string>>(new Set());
  const [listenerPosition, setListenerPosition] = useState<ListenerPosition>(scene.listener);
  
  // Audio Processing State
  const [audioQuality, setAudioQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [spatialAccuracy, setSpatialAccuracy] = useState(100);
  const [processingLatency, setProcessingLatency] = useState(0);
  const [activeChannels, setActiveChannels] = useState(0);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [volumeSettings, setVolumeSettings] = useState({
    master: masterVolume,
    ambient: 60,
    voice: 80,
    effects: 70,
    music: 50
  });
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const listenerRef = useRef<AudioListener | null>(null);
  const pannerNodesRef = useRef<Map<string, PannerNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const bufferSourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const convolverRef = useRef<ConvolverNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Spatial Audio System
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Create Audio Context
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.error('Web Audio API not supported');
          return;
        }
        
        audioContextRef.current = new AudioContextClass();
        const audioContext = audioContextRef.current;
        
        // Create master gain node
        masterGainRef.current = audioContext.createGain();
        masterGainRef.current.connect(audioContext.destination);
        masterGainRef.current.gain.value = volumeSettings.master / 100;
        
        // Create convolver for reverb
        if (enableReverb) {
          convolverRef.current = audioContext.createConvolver();
          const reverbBuffer = await createReverbImpulseResponse(audioContext, scene.room_properties);
          convolverRef.current.buffer = reverbBuffer;
          convolverRef.current.connect(masterGainRef.current);
        }
        
        // Create analyser for visualization
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.connect(masterGainRef.current);
        
        // Set up listener
        listenerRef.current = audioContext.listener;
        updateListenerPosition(listenerPosition);
        
        // Load audio buffers for all sources
        await loadAudioSources(scene.sources);
        
        setIsInitialized(true);
        setActiveChannels(scene.sources.length);
        setSpatialAccuracy(95);
        setProcessingLatency(10);
        
      } catch (error) {
        console.error('Audio initialization failed:', error);
      }
    };
    
    initializeAudio();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scene, enableReverb, volumeSettings.master, listenerPosition]);

  // Create Reverb Impulse Response
  const createReverbImpulseResponse = useCallback(async (
    audioContext: AudioContext, 
    roomProperties: SpatialAudioScene['room_properties']
  ): Promise<AudioBuffer> => {
    const { size, absorption, reverb, echo_delay } = roomProperties;
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * (reverb + echo_delay);
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    
    // Generate impulse response based on room properties
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const time = i / sampleRate;
        const decay = Math.pow(1 - absorption, time);
        const noise = (Math.random() * 2 - 1) * decay;
        
        // Add early reflections
        if (time < 0.1) {
          const reflection = Math.sin(time * Math.PI * 50) * decay * 0.3;
          channelData[i] = noise + reflection;
        } else {
          channelData[i] = noise;
        }
      }
    }
    
    return impulse;
  }, []);

  // Load Audio Sources
  const loadAudioSources = useCallback(async (sources: AudioSource[]) => {
    if (!audioContextRef.current) return;
    
    const audioContext = audioContextRef.current;
    
    for (const source of sources) {
      try {
        // Simulate audio loading (in real implementation, would fetch actual audio files)
        const buffer = audioContext.createBuffer(2, audioContext.sampleRate * 5, audioContext.sampleRate);
        
        // Generate procedural audio content based on source type
        for (let channel = 0; channel < 2; channel++) {
          const channelData = buffer.getChannelData(channel);
          
          for (let i = 0; i < channelData.length; i++) {
            const time = i / audioContext.sampleRate;
            let sample = 0;
            
            switch (source.type) {
              case 'ambient':
                sample = Math.sin(time * Math.PI * 2 * 200) * 0.1 * Math.random();
                break;
              case 'voice':
                sample = Math.sin(time * Math.PI * 2 * 400) * 0.3;
                break;
              case 'effect':
                sample = Math.sin(time * Math.PI * 2 * 800) * 0.2;
                break;
              case 'equipment':
                sample = Math.sin(time * Math.PI * 2 * 100) * 0.4 + Math.random() * 0.1;
                break;
              default:
                sample = Math.sin(time * Math.PI * 2 * 440) * 0.2;
            }
            
            channelData[i] = sample;
          }
        }
        
        audioBuffersRef.current.set(source.id, buffer);
        
      } catch (error) {
        console.error(`Failed to load audio source ${source.id}:`, error);
      }
    }
  }, []);

  // Create Spatial Audio Source
  const createSpatialAudioSource = useCallback((source: AudioSource): AudioBufferSourceNode | null => {
    if (!audioContextRef.current || !masterGainRef.current) return null;
    
    const audioContext = audioContextRef.current;
    const buffer = audioBuffersRef.current.get(source.id);
    if (!buffer) return null;
    
    // Create audio source
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = source.loop;
    
    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = source.volume * (volumeSettings.master / 100);
    
    // Create panner node for 3D positioning
    let pannerNode: PannerNode | null = null;
    if (enable3D) {
      pannerNode = audioContext.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = source.distance_model;
      pannerNode.maxDistance = source.max_distance;
      pannerNode.refDistance = 1;
      pannerNode.rolloffFactor = 1;
      
      // Set 3D position
      pannerNode.positionX.value = source.position.x;
      pannerNode.positionY.value = source.position.y;
      pannerNode.positionZ.value = source.position.z;
      
      // Set cone properties if specified
      if (source.cone_angle !== undefined) {
        pannerNode.coneInnerAngle = source.cone_angle;
        pannerNode.coneOuterAngle = source.cone_angle * 2;
        pannerNode.coneOuterGain = source.cone_outer_gain || 0.1;
      }
    }
    
    // Connect audio graph
    bufferSource.connect(gainNode);
    
    if (pannerNode) {
      gainNode.connect(pannerNode);
      if (enableReverb && convolverRef.current) {
        pannerNode.connect(convolverRef.current);
        pannerNode.connect(masterGainRef.current); // Direct + reverb
      } else {
        pannerNode.connect(masterGainRef.current);
      }
      pannerNodesRef.current.set(source.id, pannerNode);
    } else {
      gainNode.connect(masterGainRef.current);
    }
    
    if (analyserRef.current) {
      gainNode.connect(analyserRef.current);
    }
    
    gainNodesRef.current.set(source.id, gainNode);
    bufferSourcesRef.current.set(source.id, bufferSource);
    
    // Set up event handlers
    bufferSource.onended = () => {
      setActiveAudioSources(prev => {
        const newSet = new Set(prev);
        newSet.delete(source.id);
        return newSet;
      });
      onAudioStop?.(source.id);
      
      // Clean up nodes
      pannerNodesRef.current.delete(source.id);
      gainNodesRef.current.delete(source.id);
      bufferSourcesRef.current.delete(source.id);
    };
    
    return bufferSource;
  }, [enable3D, enableReverb, volumeSettings.master, onAudioStop]);

  // Update Listener Position
  const updateListenerPosition = useCallback((position: ListenerPosition) => {
    if (!listenerRef.current) return;
    
    const listener = listenerRef.current;
    
    // Set position
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
      
      // Set orientation
      listener.forwardX.value = position.orientation.forward.x;
      listener.forwardY.value = position.orientation.forward.y;
      listener.forwardZ.value = position.orientation.forward.z;
      
      listener.upX.value = position.orientation.up.x;
      listener.upY.value = position.orientation.up.y;
      listener.upZ.value = position.orientation.up.z;
    } else {
      // Fallback for older browsers
      (listener as any).setPosition(position.x, position.y, position.z);
      (listener as any).setOrientation(
        position.orientation.forward.x,
        position.orientation.forward.y,
        position.orientation.forward.z,
        position.orientation.up.x,
        position.orientation.up.y,
        position.orientation.up.z
      );
    }
    
    setListenerPosition(position);
    onListenerMove?.(position);
  }, [onListenerMove]);

  // Start Audio Playback
  const startAudioPlayback = useCallback(() => {
    if (!isInitialized || !audioContextRef.current) return;
    
    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Start all audio sources
    currentScene.sources.forEach(source => {
      if (source.autoplay) {
        const audioSource = createSpatialAudioSource(source);
        if (audioSource) {
          audioSource.start();
          setActiveAudioSources(prev => new Set([...prev, source.id]));
          onAudioStart?.(source.id);
        }
      }
    });
    
    setIsPlaying(true);
    
    // Start visualization update loop
    if (showVisualization) {
      startVisualizationLoop();
    }
  }, [isInitialized, currentScene.sources, createSpatialAudioSource, showVisualization, onAudioStart]);

  // Stop Audio Playback
  const stopAudioPlayback = useCallback(() => {
    // Stop all active audio sources
    bufferSourcesRef.current.forEach((source, id) => {
      source.stop();
      onAudioStop?.(id);
    });
    
    setActiveAudioSources(new Set());
    setIsPlaying(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [onAudioStop]);

  // Start Visualization Loop
  const startVisualizationLoop = useCallback(() => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateVisualization = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Update processing metrics (simplified)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      setProcessingLatency(Math.round(5 + Math.random() * 10));
      
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      }
    };
    
    updateVisualization();
  }, [isPlaying]);

  // Play Specific Audio Source
  const playAudioSource = useCallback((sourceId: string) => {
    const source = currentScene.sources.find(s => s.id === sourceId);
    if (!source || activeAudioSources.has(sourceId)) return;
    
    const audioSource = createSpatialAudioSource(source);
    if (audioSource) {
      audioSource.start();
      setActiveAudioSources(prev => new Set([...prev, sourceId]));
      onAudioStart?.(sourceId);
    }
  }, [currentScene.sources, activeAudioSources, createSpatialAudioSource, onAudioStart]);

  // Stop Specific Audio Source
  const stopAudioSource = useCallback((sourceId: string) => {
    const bufferSource = bufferSourcesRef.current.get(sourceId);
    if (bufferSource) {
      bufferSource.stop();
    }
  }, []);

  // Move Listener
  const moveListener = useCallback((direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down') => {
    const newPosition = { ...listenerPosition };
    const step = 0.5;
    
    switch (direction) {
      case 'forward':
        newPosition.z -= step;
        break;
      case 'backward':
        newPosition.z += step;
        break;
      case 'left':
        newPosition.x -= step;
        break;
      case 'right':
        newPosition.x += step;
        break;
      case 'up':
        newPosition.y += step;
        break;
      case 'down':
        newPosition.y -= step;
        break;
    }
    
    updateListenerPosition(newPosition);
  }, [listenerPosition, updateListenerPosition]);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Spatial Audio Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Headphones className="w-6 h-6 text-krong-red" />
              {currentScene.name}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Status */}
              <Badge variant={isPlaying ? "default" : "secondary"} className="text-tablet-sm">
                <Speaker className="w-3 h-3 mr-1" />
                {isPlaying ? t('playing') : t('stopped')}
              </Badge>
              
              {/* Active Sources */}
              <Badge variant="outline" className="text-tablet-sm">
                <Radio className="w-3 h-3 mr-1" />
                {activeAudioSources.size} / {currentScene.sources.length}
              </Badge>
              
              {/* Quality */}
              <Badge variant="outline" className="text-tablet-sm">
                {spatialAccuracy}% {t('accuracy')}
              </Badge>
              
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

      {/* Audio Control Panel */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Main Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => moveListener('left')}
                disabled={!isInitialized}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                size="lg"
                onClick={isPlaying ? stopAudioPlayback : startAudioPlayback}
                disabled={!isInitialized}
                className="bg-krong-red hover:bg-krong-red/90 px-8"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-6 h-6 mr-2" />
                    {t('stop')}
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 mr-2" />
                    {t('start')}
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => moveListener('right')}
                disabled={!isInitialized}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Master Volume */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-tablet-sm font-medium">{t('master_volume')}</label>
                <span className="text-tablet-sm text-muted-foreground">
                  {volumeSettings.master}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={volumeSettings.master}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setVolumeSettings(prev => ({ ...prev, master: value }));
                  if (masterGainRef.current) {
                    masterGainRef.current.gain.value = value / 100;
                  }
                }}
                className="w-full"
              />
            </div>
            
            {/* Listener Position */}
            <div className="space-y-3">
              <h4 className="text-tablet-sm font-heading font-semibold">{t('listener_position')}</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-tablet-xs text-muted-foreground">X</div>
                  <div className="text-tablet-sm font-mono">
                    {listenerPosition.x.toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-tablet-xs text-muted-foreground">Y</div>
                  <div className="text-tablet-sm font-mono">
                    {listenerPosition.y.toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-tablet-xs text-muted-foreground">Z</div>
                  <div className="text-tablet-sm font-mono">
                    {listenerPosition.z.toFixed(1)}
                  </div>
                </div>
              </div>
              
              {/* Movement Controls */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveListener('left')}
                  disabled={!isInitialized}
                >
                  ←
                </Button>
                <div className="grid grid-rows-2 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveListener('forward')}
                    disabled={!isInitialized}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveListener('backward')}
                    disabled={!isInitialized}
                  >
                    ↓
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveListener('right')}
                  disabled={!isInitialized}
                >
                  →
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Waves className="w-5 h-5 text-krong-red" />
              {t('audio_sources')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {currentScene.sources.map(source => (
                <div
                  key={source.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    activeAudioSources.has(source.id) 
                      ? "bg-green-50 border-green-200" 
                      : "bg-gray-50 border-gray-200",
                    selectedSource === source.id && "ring-2 ring-krong-red"
                  )}
                  onClick={() => setSelectedSource(
                    selectedSource === source.id ? null : source.id
                  )}
                >
                  <div className="flex-shrink-0">
                    {activeAudioSources.has(source.id) ? (
                      <Speaker className="w-5 h-5 text-green-600" />
                    ) : (
                      <Radio className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-tablet-sm font-medium">
                      {source.name}
                    </div>
                    <div className="text-tablet-xs text-muted-foreground capitalize">
                      {source.type} • {source.priority} priority
                    </div>
                    <div className="text-tablet-xs text-muted-foreground font-mono">
                      ({source.position.x.toFixed(1)}, {source.position.y.toFixed(1)}, {source.position.z.toFixed(1)})
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeAudioSources.has(source.id)) {
                          stopAudioSource(source.id);
                        } else {
                          playAudioSource(source.id);
                        }
                      }}
                    >
                      {activeAudioSources.has(source.id) ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </Button>
                    
                    <Badge variant="outline" size="sm" className="text-xs">
                      {Math.round(source.volume * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-krong-red" />
              {t('performance_metrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-tablet-xl font-bold text-krong-red">
                    {processingLatency}ms
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('latency')}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-tablet-xl font-bold text-blue-600">
                    {activeChannels}
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('active_channels')}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-tablet-xl font-bold text-green-600">
                    {spatialAccuracy}%
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('spatial_accuracy')}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-tablet-xl font-bold text-orange-600">
                    {audioQuality.toUpperCase()}
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('quality')}
                  </div>
                </div>
              </div>
              
              {/* Audio Features Status */}
              <div className="space-y-2">
                <h4 className="text-tablet-sm font-heading font-semibold">{t('audio_features')}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-tablet-sm">
                    <span>{t('spatial_3d')}</span>
                    <Badge variant={enable3D ? "default" : "secondary"} size="sm">
                      {enable3D ? t('enabled') : t('disabled')}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-tablet-sm">
                    <span>{t('hrtf_processing')}</span>
                    <Badge variant={enableHRTF ? "default" : "secondary"} size="sm">
                      {enableHRTF ? t('enabled') : t('disabled')}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-tablet-sm">
                    <span>{t('reverb_effects')}</span>
                    <Badge variant={enableReverb ? "default" : "secondary"} size="sm">
                      {enableReverb ? t('enabled') : t('disabled')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Source Details */}
      {selectedSource && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-krong-red" />
              {t('source_details')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const source = currentScene.sources.find(s => s.id === selectedSource);
              if (!source) return null;
              
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-tablet-sm font-medium">{t('source_name')}</label>
                      <div className="text-tablet-base">{source.name}</div>
                    </div>
                    <div>
                      <label className="text-tablet-sm font-medium">{t('type')}</label>
                      <div className="text-tablet-base capitalize">{source.type}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-tablet-sm font-medium">{t('volume')}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={source.volume}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        const gainNode = gainNodesRef.current.get(source.id);
                        if (gainNode) {
                          gainNode.gain.value = value * (volumeSettings.master / 100);
                        }
                        // Update source volume in real implementation
                      }}
                      className="w-full"
                    />
                    <span className="text-tablet-xs text-muted-foreground">
                      {Math.round(source.volume * 100)}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-tablet-sm font-medium">{t('position_x')}</label>
                      <div className="text-tablet-base font-mono">{source.position.x.toFixed(1)}</div>
                    </div>
                    <div>
                      <label className="text-tablet-sm font-medium">{t('position_y')}</label>
                      <div className="text-tablet-base font-mono">{source.position.y.toFixed(1)}</div>
                    </div>
                    <div>
                      <label className="text-tablet-sm font-medium">{t('position_z')}</label>
                      <div className="text-tablet-base font-mono">{source.position.z.toFixed(1)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-tablet-sm">{t('loop')}</span>
                      <Badge variant={source.loop ? "default" : "secondary"} size="sm">
                        {source.loop ? t('yes') : t('no')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-tablet-sm">{t('autoplay')}</span>
                      <Badge variant={source.autoplay ? "default" : "secondary"} size="sm">
                        {source.autoplay ? t('yes') : t('no')}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-tablet-lg">{t('audio_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('audio_quality')}</label>
                  <select 
                    value={audioQuality}
                    onChange={(e) => setAudioQuality(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full p-2 border rounded-md text-tablet-sm"
                  >
                    <option value="low">{t('low_quality')}</option>
                    <option value="medium">{t('medium_quality')}</option>
                    <option value="high">{t('high_quality')}</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('enable_3d_audio')}</span>
                  <Button
                    variant={enable3D ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      // In real implementation, would toggle 3D audio
                      console.log('3D audio toggled');
                    }}
                  >
                    <Move3D className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('enable_hrtf')}</span>
                  <Button
                    variant={enableHRTF ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      // In real implementation, would toggle HRTF
                      console.log('HRTF toggled');
                    }}
                  >
                    <Ear className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('enable_reverb')}</span>
                  <Button
                    variant={enableReverb ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      // In real implementation, would toggle reverb
                      console.log('Reverb toggled');
                    }}
                  >
                    <Waves className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('auto_update_listener')}</span>
                  <Button
                    variant={autoUpdateListener ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      // In real implementation, would toggle auto update
                      console.log('Auto update toggled');
                    }}
                  >
                    <Compass className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('show_visualization')}</span>
                  <Button
                    variant={showVisualization ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowVisualization(!showVisualization)}
                  >
                    <Orbit className="w-4 h-4" />
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

export default SpatialAudioSystem;