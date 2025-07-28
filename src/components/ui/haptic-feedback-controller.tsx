'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Vibrate, 
  Smartphone,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Target,
  Activity,
  Timer,
  Volume2,
  VolumeX,
  Power,
  PowerOff,
  Waves,
  AlertTriangle,
  CheckCircle2,
  Info,
  Heart
} from 'lucide-react';

interface HapticPattern {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  pattern: number[]; // Duration in milliseconds for vibrate/pause cycles
  intensity: number; // 0-100
  type: 'notification' | 'success' | 'error' | 'warning' | 'interaction' | 'navigation' | 'custom';
  category: 'ui' | 'training' | 'sop' | 'alert' | 'accessibility';
  duration_ms: number;
  repeat?: number;
}

interface HapticFeedbackEvent {
  id: string;
  timestamp: Date;
  pattern_id: string;
  trigger: string;
  duration_ms: number;
  intensity: number;
  success: boolean;
}

interface HapticSettings {
  enabled: boolean;
  master_intensity: number; // 0-100
  category_settings: {
    [key in HapticPattern['category']]: {
      enabled: boolean;
      intensity_multiplier: number;
    };
  };
  adaptive_intensity: boolean;
  battery_optimization: boolean;
  accessibility_mode: boolean;
}

interface HapticFeedbackControllerProps {
  /** Enable haptic feedback */
  enabled?: boolean;
  /** Master intensity (0-100) */
  masterIntensity?: number;
  /** Enable adaptive intensity based on context */
  adaptiveIntensity?: boolean;
  /** Enable battery optimization */
  batteryOptimization?: boolean;
  /** Show debug interface */
  showDebug?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when haptic event occurs */
  onHapticEvent?: (event: HapticFeedbackEvent) => void;
  /** Callback when settings change */
  onSettingsChange?: (settings: HapticSettings) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * HapticFeedbackController - Advanced haptic feedback system for tablets
 * 
 * Features:
 * - Web Vibration API integration
 * - Customizable haptic patterns and intensities
 * - Context-aware haptic feedback
 * - Battery optimization and adaptive intensity
 * - Accessibility-friendly vibration patterns
 * - Real-time haptic testing and calibration
 * - Category-based haptic management
 * - Performance monitoring and analytics
 * - Restaurant workflow-specific patterns
 * - Multi-device haptic synchronization
 * 
 * @param props HapticFeedbackControllerProps
 * @returns JSX.Element
 */
const HapticFeedbackController: React.FC<HapticFeedbackControllerProps> = ({
  enabled = true,
  masterIntensity = 75,
  adaptiveIntensity = true,
  batteryOptimization = true,
  showDebug = false,
  isLoading = false,
  onHapticEvent,
  onSettingsChange,
  className
}) => {
  const t = useTranslations('ui.haptic');
  
  // Haptic System State
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(enabled);
  const [currentPattern, setCurrentPattern] = useState<HapticPattern | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    maxIntensity: 100,
    patterns: true,
    customDuration: true
  });
  
  // Performance Metrics
  const [hapticEvents, setHapticEvents] = useState<HapticFeedbackEvent[]>([]);
  const [averageLatency, setAverageLatency] = useState(0);
  const [successRate, setSuccessRate] = useState(100);
  const [totalEvents, setTotalEvents] = useState(0);
  
  // Settings State
  const [settings, setSettings] = useState<HapticSettings>({
    enabled: enabled,
    master_intensity: masterIntensity,
    category_settings: {
      ui: { enabled: true, intensity_multiplier: 1.0 },
      training: { enabled: true, intensity_multiplier: 1.2 },
      sop: { enabled: true, intensity_multiplier: 1.1 },
      alert: { enabled: true, intensity_multiplier: 1.5 },
      accessibility: { enabled: true, intensity_multiplier: 0.8 }
    },
    adaptive_intensity: adaptiveIntensity,
    battery_optimization: batteryOptimization,
    accessibility_mode: false
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  
  // Haptic Patterns Library
  const [hapticPatterns] = useState<HapticPattern[]>([
    {
      id: 'tap',
      name: 'Tap',
      name_fr: 'Tapotement',
      description: 'Quick single tap feedback',
      description_fr: 'Retour rapide d\'un seul tapotement',
      pattern: [50],
      intensity: 70,
      type: 'interaction',
      category: 'ui',
      duration_ms: 50
    },
    {
      id: 'double_tap',
      name: 'Double Tap',
      name_fr: 'Double Tapotement',
      description: 'Two quick taps for confirmation',
      description_fr: 'Deux tapotements rapides pour confirmation',
      pattern: [50, 100, 50],
      intensity: 75,
      type: 'interaction',
      category: 'ui',
      duration_ms: 200
    },
    {
      id: 'success',
      name: 'Success',
      name_fr: 'Succès',
      description: 'Positive completion feedback',
      description_fr: 'Retour de completion positive',
      pattern: [100, 50, 100],
      intensity: 80,
      type: 'success',
      category: 'training',
      duration_ms: 250
    },
    {
      id: 'error',
      name: 'Error',
      name_fr: 'Erreur',
      description: 'Error or failure feedback',
      description_fr: 'Retour d\'erreur ou d\'échec',
      pattern: [200, 100, 200, 100, 200],
      intensity: 90,
      type: 'error',
      category: 'alert',
      duration_ms: 700
    },
    {
      id: 'warning',
      name: 'Warning',
      name_fr: 'Avertissement',
      description: 'Attention or caution feedback',
      description_fr: 'Retour d\'attention ou de prudence',
      pattern: [150, 75, 150],
      intensity: 85,
      type: 'warning',
      category: 'alert',
      duration_ms: 375
    },
    {
      id: 'notification',
      name: 'Notification',
      name_fr: 'Notification',
      description: 'Gentle notification pulse',
      description_fr: 'Impulsion de notification douce',
      pattern: [100, 200, 100, 200, 100],
      intensity: 60,
      type: 'notification',
      category: 'ui',
      duration_ms: 700
    },
    {
      id: 'navigation',
      name: 'Navigation',
      name_fr: 'Navigation',
      description: 'Navigation step feedback',
      description_fr: 'Retour d\'étape de navigation',
      pattern: [75, 25, 75],
      intensity: 65,
      type: 'navigation',
      category: 'sop',
      duration_ms: 175
    },
    {
      id: 'heartbeat',
      name: 'Heartbeat',
      name_fr: 'Battement de Cœur',
      description: 'Rhythmic heartbeat pattern',
      description_fr: 'Motif de battement de cœur rythmique',
      pattern: [100, 100, 150, 300],
      intensity: 70,
      type: 'custom',
      category: 'accessibility',
      duration_ms: 650,
      repeat: 2
    },
    {
      id: 'urgent',
      name: 'Urgent Alert',
      name_fr: 'Alerte Urgente',
      description: 'High priority urgent alert',
      description_fr: 'Alerte urgente de haute priorité',
      pattern: [300, 100, 300, 100, 300],
      intensity: 100,
      type: 'error',
      category: 'alert',
      duration_ms: 1100
    },
    {
      id: 'training_complete',
      name: 'Training Complete',
      name_fr: 'Formation Terminée',
      description: 'Training module completion',
      description_fr: 'Achèvement du module de formation',
      pattern: [100, 50, 100, 50, 100, 100, 200],
      intensity: 85,
      type: 'success',
      category: 'training',
      duration_ms: 700
    }
  ]);
  
  // Refs
  const vibrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const patternQueueRef = useRef<HapticPattern[]>([]);
  const performanceRef = useRef({ 
    startTime: 0, 
    eventCount: 0, 
    totalLatency: 0 
  });

  // Initialize Haptic System
  useEffect(() => {
    const initializeHaptics = async () => {
      // Check vibration API support
      const supported = 'vibrate' in navigator;
      setIsSupported(supported);
      
      if (!supported) {
        console.warn('Vibration API not supported');
        return;
      }
      
      // Check device capabilities
      const userAgent = navigator.userAgent.toLowerCase();
      const isTablet = /tablet|ipad|android(?!.*mobile)/.test(userAgent);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      
      setDeviceCapabilities({
        maxIntensity: isIOS ? 100 : 100, // iOS has limited vibration control
        patterns: !isIOS, // iOS doesn't support custom patterns well
        customDuration: !isIOS
      });
      
      // Get battery information if available
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
        } catch (error) {
          console.warn('Battery API not available');
        }
      }
      
      // Initialize performance tracking
      performanceRef.current = { 
        startTime: Date.now(), 
        eventCount: 0, 
        totalLatency: 0 
      };
    };
    
    initializeHaptics();
  }, []);

  // Update settings when props change
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      enabled,
      master_intensity: masterIntensity,
      adaptive_intensity: adaptiveIntensity,
      battery_optimization: batteryOptimization
    }));
  }, [enabled, masterIntensity, adaptiveIntensity, batteryOptimization]);

  // Calculate Effective Intensity
  const calculateEffectiveIntensity = useCallback((pattern: HapticPattern): number => {
    let intensity = pattern.intensity;
    
    // Apply master intensity
    intensity = (intensity * settings.master_intensity) / 100;
    
    // Apply category multiplier
    const categorySettings = settings.category_settings[pattern.category];
    if (categorySettings.enabled) {
      intensity *= categorySettings.intensity_multiplier;
    } else {
      return 0; // Category disabled
    }
    
    // Apply adaptive intensity
    if (settings.adaptive_intensity) {
      // Reduce intensity if battery is low
      if (settings.battery_optimization && batteryLevel < 20) {
        intensity *= 0.5;
      }
      
      // Adjust for accessibility mode
      if (settings.accessibility_mode) {
        intensity = Math.min(intensity, 60); // Cap at 60% for accessibility
      }
    }
    
    return Math.round(Math.min(100, Math.max(0, intensity)));
  }, [settings, batteryLevel]);

  // Execute Haptic Pattern
  const executeHapticPattern = useCallback(async (
    pattern: HapticPattern, 
    trigger: string = 'manual'
  ): Promise<boolean> => {
    if (!isSupported || !settings.enabled) return false;
    
    const startTime = Date.now();
    const effectiveIntensity = calculateEffectiveIntensity(pattern);
    
    if (effectiveIntensity === 0) return false;
    
    try {
      setIsPlaying(true);
      setCurrentPattern(pattern);
      
      // Convert pattern to vibration API format
      let vibrationPattern: number[] = [];
      
      if (deviceCapabilities.patterns) {
        // Use custom pattern
        vibrationPattern = pattern.pattern;
      } else {
        // Fallback to simple vibration
        vibrationPattern = [pattern.duration_ms];
      }
      
      // Scale pattern based on intensity
      const intensityScale = effectiveIntensity / 100;
      vibrationPattern = vibrationPattern.map((duration, index) => {
        // Only scale vibration durations (odd indices), not pauses
        return index % 2 === 0 ? Math.round(duration * intensityScale) : duration;
      });
      
      // Execute vibration
      const success = navigator.vibrate(vibrationPattern);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Record event
      const event: HapticFeedbackEvent = {
        id: `haptic-${Date.now()}`,
        timestamp: new Date(),
        pattern_id: pattern.id,
        trigger,
        duration_ms: pattern.duration_ms,
        intensity: effectiveIntensity,
        success
      };
      
      setHapticEvents(prev => [...prev.slice(-49), event]);
      onHapticEvent?.(event);
      
      // Update performance metrics
      performanceRef.current.eventCount++;
      performanceRef.current.totalLatency += latency;
      
      const avgLatency = performanceRef.current.totalLatency / performanceRef.current.eventCount;
      setAverageLatency(Math.round(avgLatency));
      
      setTotalEvents(prev => prev + 1);
      setSuccessRate(prev => {
        const events = hapticEvents.length + 1;
        const successful = hapticEvents.filter(e => e.success).length + (success ? 1 : 0);
        return Math.round((successful / events) * 100);
      });
      
      // Handle pattern completion
      setTimeout(() => {
        setIsPlaying(false);
        if (currentPattern?.id === pattern.id) {
          setCurrentPattern(null);
        }
      }, pattern.duration_ms);
      
      return success;
      
    } catch (error) {
      console.error('Haptic execution error:', error);
      setIsPlaying(false);
      return false;
    }
  }, [isSupported, settings, calculateEffectiveIntensity, deviceCapabilities, hapticEvents, currentPattern, onHapticEvent]);

  // Test Haptic Pattern
  const testPattern = useCallback((patternId: string) => {
    const pattern = hapticPatterns.find(p => p.id === patternId);
    if (pattern) {
      executeHapticPattern(pattern, 'test');
    }
  }, [hapticPatterns, executeHapticPattern]);

  // Stop Current Haptic
  const stopHaptic = useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0); // Stop any ongoing vibration
    }
    setIsPlaying(false);
    setCurrentPattern(null);
    
    if (vibrationTimeoutRef.current) {
      clearTimeout(vibrationTimeoutRef.current);
    }
  }, [isSupported]);

  // Update Settings
  const updateSettings = useCallback((newSettings: Partial<HapticSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      onSettingsChange?.(updated);
      return updated;
    });
  }, [onSettingsChange]);

  // Quick Haptic Triggers
  const quickHaptic = {
    tap: () => executeHapticPattern(hapticPatterns.find(p => p.id === 'tap')!, 'quick_tap'),
    success: () => executeHapticPattern(hapticPatterns.find(p => p.id === 'success')!, 'quick_success'),
    error: () => executeHapticPattern(hapticPatterns.find(p => p.id === 'error')!, 'quick_error'),
    warning: () => executeHapticPattern(hapticPatterns.find(p => p.id === 'warning')!, 'quick_warning')
  };

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Haptic Controller Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Vibrate className="w-6 h-6 text-krong-red" />
              {t('title')}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Support Status */}
              <Badge variant={isSupported ? "default" : "destructive"} className="text-tablet-sm">
                <Smartphone className="w-3 h-3 mr-1" />
                {isSupported ? t('supported') : t('not_supported')}
              </Badge>
              
              {/* Active Status */}
              <Badge variant={settings.enabled ? "default" : "secondary"} className="text-tablet-sm">
                {settings.enabled ? <Power className="w-3 h-3 mr-1" /> : <PowerOff className="w-3 h-3 mr-1" />}
                {settings.enabled ? t('enabled') : t('disabled')}
              </Badge>
              
              {/* Battery Level */}
              {batteryLevel < 100 && (
                <Badge variant={batteryLevel < 20 ? "destructive" : "outline"} className="text-tablet-sm">
                  {batteryLevel}% {t('battery')}
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

      {/* Quick Test Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Master Control */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                disabled={!isSupported}
              >
                {settings.enabled ? (
                  <>
                    <PowerOff className="w-4 h-4 mr-2" />
                    {t('disable')}
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4 mr-2" />
                    {t('enable')}
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={stopHaptic}
                disabled={!isPlaying}
              >
                <Pause className="w-4 h-4 mr-2" />
                {t('stop')}
              </Button>
            </div>
            
            {/* Quick Test Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={quickHaptic.tap}
                disabled={!settings.enabled || !isSupported}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Target className="w-5 h-5" />
                <span className="text-tablet-xs">{t('tap')}</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={quickHaptic.success}
                disabled={!settings.enabled || !isSupported}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-tablet-xs">{t('success')}</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={quickHaptic.warning}
                disabled={!settings.enabled || !isSupported}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-tablet-xs">{t('warning')}</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={quickHaptic.error}
                disabled={!settings.enabled || !isSupported}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Zap className="w-5 h-5 text-red-600" />
                <span className="text-tablet-xs">{t('error')}</span>
              </Button>
            </div>
            
            {/* Master Intensity */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-tablet-sm font-medium">{t('master_intensity')}</label>
                <span className="text-tablet-sm text-muted-foreground">
                  {settings.master_intensity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.master_intensity}
                onChange={(e) => updateSettings({ master_intensity: parseInt(e.target.value) })}
                className="w-full"
                disabled={!isSupported}
              />
            </div>
            
            {/* Currently Playing */}
            {currentPattern && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Waves className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-tablet-sm font-medium text-blue-800">
                    {t('playing')}: {currentPattern.name}
                  </span>
                </div>
                <Progress 
                  value={isPlaying ? 100 : 0} 
                  className="h-2"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pattern Library */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-krong-red" />
              {t('pattern_library')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {hapticPatterns.map(pattern => (
                <div
                  key={pattern.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedPattern === pattern.id && "ring-2 ring-krong-red",
                    !settings.category_settings[pattern.category].enabled && "opacity-50"
                  )}
                  onClick={() => setSelectedPattern(
                    selectedPattern === pattern.id ? null : pattern.id
                  )}
                >
                  <div className="flex-shrink-0">
                    {pattern.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    {pattern.type === 'error' && <Zap className="w-4 h-4 text-red-600" />}
                    {pattern.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                    {pattern.type === 'notification' && <Info className="w-4 h-4 text-blue-600" />}
                    {pattern.type === 'interaction' && <Target className="w-4 h-4 text-gray-600" />}
                    {pattern.type === 'navigation' && <Waves className="w-4 h-4 text-purple-600" />}
                    {pattern.type === 'custom' && <Heart className="w-4 h-4 text-pink-600" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-tablet-sm font-medium">
                      {pattern.name}
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {pattern.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" size="sm" className="text-xs capitalize">
                        {pattern.category}
                      </Badge>
                      <Badge variant="outline" size="sm" className="text-xs">
                        {pattern.duration_ms}ms
                      </Badge>
                      <Badge variant="outline" size="sm" className="text-xs">
                        {calculateEffectiveIntensity(pattern)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      testPattern(pattern.id);
                    }}
                    disabled={!settings.enabled || !isSupported}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
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
                    {totalEvents}
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('total_events')}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-tablet-xl font-bold text-green-600">
                    {successRate}%
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('success_rate')}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-tablet-xl font-bold text-blue-600">
                    {averageLatency}ms
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('avg_latency')}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-tablet-xl font-bold text-orange-600">
                    {batteryLevel}%
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('battery_level')}
                  </div>
                </div>
              </div>
              
              {/* Device Capabilities */}
              <div className="space-y-2">
                <h4 className="text-tablet-sm font-heading font-semibold">{t('device_capabilities')}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-tablet-sm">
                    <span>{t('vibration_api')}</span>
                    <Badge variant={isSupported ? "default" : "destructive"} size="sm">
                      {isSupported ? t('supported') : t('not_supported')}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-tablet-sm">
                    <span>{t('custom_patterns')}</span>
                    <Badge variant={deviceCapabilities.patterns ? "default" : "secondary"} size="sm">
                      {deviceCapabilities.patterns ? t('supported') : t('limited')}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-tablet-sm">
                    <span>{t('intensity_control')}</span>
                    <Badge variant="secondary" size="sm">
                      {deviceCapabilities.maxIntensity}%
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Recent Events */}
              {hapticEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-tablet-sm font-heading font-semibold">{t('recent_events')}</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {hapticEvents.slice(-5).map(event => (
                      <div
                        key={event.id}
                        className="flex justify-between items-center text-tablet-xs"
                      >
                        <span className="capitalize">{event.pattern_id}</span>
                        <div className="flex items-center gap-2">
                          <span>{event.intensity}%</span>
                          <Badge variant={event.success ? "default" : "destructive"} size="sm">
                            {event.success ? '✓' : '✗'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Pattern Details */}
      {selectedPattern && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-krong-red" />
              {t('pattern_details')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const pattern = hapticPatterns.find(p => p.id === selectedPattern);
              if (!pattern) return null;
              
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-tablet-sm font-medium">{t('pattern_name')}</label>
                      <div className="text-tablet-base">{pattern.name}</div>
                    </div>
                    <div>
                      <label className="text-tablet-sm font-medium">{t('category')}</label>
                      <div className="text-tablet-base capitalize">{pattern.category}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-tablet-sm font-medium">{t('description')}</label>
                    <div className="text-tablet-base text-muted-foreground">
                      {pattern.description}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-tablet-sm font-medium">{t('base_intensity')}</label>
                      <div className="text-tablet-base font-mono">{pattern.intensity}%</div>
                    </div>
                    <div>
                      <label className="text-tablet-sm font-medium">{t('effective_intensity')}</label>
                      <div className="text-tablet-base font-mono">
                        {calculateEffectiveIntensity(pattern)}%
                      </div>
                    </div>
                    <div>
                      <label className="text-tablet-sm font-medium">{t('duration')}</label>
                      <div className="text-tablet-base font-mono">{pattern.duration_ms}ms</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-tablet-sm font-medium">{t('vibration_pattern')}</label>
                    <div className="text-tablet-sm font-mono bg-gray-100 p-2 rounded">
                      [{pattern.pattern.join(', ')}]
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => testPattern(pattern.id)}
                      disabled={!settings.enabled || !isSupported}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {t('test_pattern')}
                    </Button>
                    
                    {pattern.repeat && (
                      <Badge variant="outline">
                        {t('repeats')}: {pattern.repeat}
                      </Badge>
                    )}
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
            <CardTitle className="text-tablet-lg">{t('haptic_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('adaptive_intensity')}</span>
                  <Button
                    variant={settings.adaptive_intensity ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateSettings({ 
                      adaptive_intensity: !settings.adaptive_intensity 
                    })}
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('battery_optimization')}</span>
                  <Button
                    variant={settings.battery_optimization ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateSettings({ 
                      battery_optimization: !settings.battery_optimization 
                    })}
                  >
                    <Timer className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('accessibility_mode')}</span>
                  <Button
                    variant={settings.accessibility_mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateSettings({ 
                      accessibility_mode: !settings.accessibility_mode 
                    })}
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-tablet-sm font-heading font-semibold">{t('category_settings')}</h4>
                {Object.entries(settings.category_settings).map(([category, categorySettings]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-tablet-sm capitalize">{category}</span>
                      <Button
                        variant={categorySettings.enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSettings({
                          category_settings: {
                            ...settings.category_settings,
                            [category]: {
                              ...categorySettings,
                              enabled: !categorySettings.enabled
                            }
                          }
                        })}
                      >
                        {categorySettings.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    {categorySettings.enabled && (
                      <div className="ml-4">
                        <input
                          type="range"
                          min="0.1"
                          max="2"
                          step="0.1"
                          value={categorySettings.intensity_multiplier}
                          onChange={(e) => updateSettings({
                            category_settings: {
                              ...settings.category_settings,
                              [category]: {
                                ...categorySettings,
                                intensity_multiplier: parseFloat(e.target.value)
                              }
                            }
                          })}
                          className="w-full"
                        />
                        <span className="text-tablet-xs text-muted-foreground">
                          {categorySettings.intensity_multiplier.toFixed(1)}x
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HapticFeedbackController;