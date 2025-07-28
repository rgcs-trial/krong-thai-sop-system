'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square,
  SkipForward,
  SkipBack,
  Settings,
  Mic,
  MicOff,
  Languages,
  Speaker,
  Headphones
} from 'lucide-react';

interface VoiceSettings {
  language: 'en' | 'fr';
  voice?: string;
  rate: number; // 0.1 to 2.0
  pitch: number; // 0.0 to 2.0
  volume: number; // 0.0 to 1.0
  autoPlay: boolean;
  pauseBetweenSteps: number; // seconds
}

interface VoiceGuidanceStep {
  id: string;
  text: string;
  text_fr: string;
  order: number;
  duration?: number; // estimated speaking time in seconds
  emphasis?: 'normal' | 'strong' | 'critical';
  pauseAfter?: number; // additional pause in seconds
}

interface VoiceGuidanceSystemProps {
  /** Array of guidance steps */
  steps: VoiceGuidanceStep[];
  /** Current active step index */
  currentStepIndex?: number;
  /** Voice settings */
  settings?: Partial<VoiceSettings>;
  /** Auto-start guidance */
  autoStart?: boolean;
  /** Show visual controls */
  showControls?: boolean;
  /** Enable step navigation */
  enableNavigation?: boolean;
  /** Enable voice commands */
  enableVoiceCommands?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when step changes */
  onStepChange?: (stepIndex: number) => void;
  /** Callback when guidance starts */
  onGuidanceStart?: () => void;
  /** Callback when guidance ends */
  onGuidanceEnd?: () => void;
  /** Callback when voice command detected */
  onVoiceCommand?: (command: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * VoiceGuidanceSystem - Multilingual text-to-speech system for SOP guidance
 * 
 * Features:
 * - Multi-language TTS support (EN/FR)
 * - Customizable voice settings (rate, pitch, volume)
 * - Step-by-step guidance with auto-progression
 * - Voice command recognition for hands-free operation
 * - Visual feedback and controls
 * - Tablet-optimized interface
 * - Accessibility support with screen reader compatibility
 * 
 * @param props VoiceGuidanceSystemProps
 * @returns JSX.Element
 */
const VoiceGuidanceSystem: React.FC<VoiceGuidanceSystemProps> = ({
  steps,
  currentStepIndex = 0,
  settings = {},
  autoStart = false,
  showControls = true,
  enableNavigation = true,
  enableVoiceCommands = false,
  isLoading = false,
  onStepChange,
  onGuidanceStart,
  onGuidanceEnd,
  onVoiceCommand,
  className
}) => {
  const t = useTranslations('sop.voiceGuidance');
  
  // Default voice settings
  const defaultSettings: VoiceSettings = {
    language: 'en',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    autoPlay: true,
    pauseBetweenSteps: 2,
    ...settings
  };

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultSettings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(currentStepIndex);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // Refs
  const speechSynthesis = useRef<SpeechSynthesis | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const recognition = useRef<any>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.current = window.speechSynthesis;
      
      // Load available voices
      const loadVoices = () => {
        const voices = speechSynthesis.current?.getVoices() || [];
        setAvailableVoices(voices);
      };
      
      loadVoices();
      if (speechSynthesis.current) {
        speechSynthesis.current.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (enableVoiceCommands && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setRecognitionSupported(true);
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = true;
        recognition.current.interimResults = false;
        recognition.current.lang = voiceSettings.language === 'fr' ? 'fr-FR' : 'en-US';
        
        recognition.current.onresult = (event: any) => {
          const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
          handleVoiceCommand(command);
        };
        
        recognition.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognition.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [enableVoiceCommands, voiceSettings.language]);

  // Auto-start guidance
  useEffect(() => {
    if (autoStart && steps.length > 0 && !isLoading) {
      startGuidance();
    }
  }, [autoStart, steps.length, isLoading]);

  // Update current step
  useEffect(() => {
    setCurrentStep(currentStepIndex);
  }, [currentStepIndex]);

  // Get current step text based on language
  const getCurrentStepText = useCallback((stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return '';
    
    return voiceSettings.language === 'fr' ? step.text_fr : step.text;
  }, [steps, voiceSettings.language]);

  // Get appropriate voice for current language
  const getVoiceForLanguage = useCallback(() => {
    const voices = availableVoices.filter(voice => 
      voiceSettings.language === 'fr' 
        ? voice.lang.startsWith('fr')
        : voice.lang.startsWith('en')
    );
    
    if (voiceSettings.voice) {
      const selectedVoice = voices.find(v => v.name === voiceSettings.voice);
      if (selectedVoice) return selectedVoice;
    }
    
    return voices[0] || availableVoices[0];
  }, [availableVoices, voiceSettings.voice, voiceSettings.language]);

  // Start guidance
  const startGuidance = useCallback(() => {
    if (!speechSynthesis.current || steps.length === 0) return;
    
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentStep(0);
    onGuidanceStart?.();
    
    speakStep(0);
  }, [steps.length, onGuidanceStart]);

  // Speak specific step
  const speakStep = useCallback((stepIndex: number) => {
    if (!speechSynthesis.current || stepIndex >= steps.length) {
      // End of guidance
      setIsPlaying(false);
      setProgress(100);
      onGuidanceEnd?.();
      return;
    }
    
    const text = getCurrentStepText(stepIndex);
    const step = steps[stepIndex];
    
    if (!text.trim()) {
      // Skip empty steps
      setTimeout(() => speakStep(stepIndex + 1), 500);
      return;
    }
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getVoiceForLanguage();
    
    if (voice) utterance.voice = voice;
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    
    // Add emphasis for critical steps
    if (step.emphasis === 'critical') {
      utterance.rate = Math.max(0.1, voiceSettings.rate - 0.2);
      utterance.volume = Math.min(1.0, voiceSettings.volume + 0.1);
    } else if (step.emphasis === 'strong') {
      utterance.rate = Math.max(0.1, voiceSettings.rate - 0.1);
    }
    
    utterance.onstart = () => {
      setCurrentStep(stepIndex);
      onStepChange?.(stepIndex);
      
      // Start progress tracking
      const estimatedDuration = (step.duration || text.length * 50) * (2 - voiceSettings.rate);
      let elapsed = 0;
      
      progressInterval.current = setInterval(() => {
        elapsed += 100;
        const stepProgress = Math.min(100, (elapsed / estimatedDuration) * 100);
        const overallProgress = ((stepIndex / steps.length) * 100) + (stepProgress / steps.length);
        setProgress(overallProgress);
      }, 100);
    };
    
    utterance.onend = () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      // Pause between steps
      const pauseDuration = (step.pauseAfter || voiceSettings.pauseBetweenSteps) * 1000;
      
      setTimeout(() => {
        if (isPlaying && !isPaused) {
          speakStep(stepIndex + 1);
        }
      }, pauseDuration);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
    
    currentUtterance.current = utterance;
    speechSynthesis.current.speak(utterance);
  }, [steps, getCurrentStepText, getVoiceForLanguage, voiceSettings, isPlaying, isPaused, onStepChange, onGuidanceEnd]);

  // Pause guidance
  const pauseGuidance = useCallback(() => {
    if (speechSynthesis.current && currentUtterance.current) {
      speechSynthesis.current.pause();
      setIsPaused(true);
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
  }, []);

  // Resume guidance
  const resumeGuidance = useCallback(() => {
    if (speechSynthesis.current && currentUtterance.current) {
      speechSynthesis.current.resume();
      setIsPaused(false);
    }
  }, []);

  // Stop guidance
  const stopGuidance = useCallback(() => {
    if (speechSynthesis.current) {
      speechSynthesis.current.cancel();
    }
    
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentStep(0);
    setProgress(0);
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
  }, []);

  // Navigate to specific step
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= steps.length) return;
    
    if (speechSynthesis.current) {
      speechSynthesis.current.cancel();
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    setCurrentStep(stepIndex);
    
    if (isPlaying) {
      speakStep(stepIndex);
    }
  }, [steps.length, isPlaying, speakStep]);

  // Handle voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    onVoiceCommand?.(command);
    
    // Built-in voice commands
    if (command.includes('play') || command.includes('start') || command.includes('begin')) {
      if (!isPlaying) startGuidance();
    } else if (command.includes('pause') || command.includes('stop')) {
      if (isPlaying && !isPaused) pauseGuidance();
      else if (isPlaying && isPaused) stopGuidance();
    } else if (command.includes('resume') || command.includes('continue')) {
      if (isPaused) resumeGuidance();
    } else if (command.includes('next')) {
      goToStep(currentStep + 1);
    } else if (command.includes('previous') || command.includes('back')) {
      goToStep(currentStep - 1);
    } else if (command.includes('repeat')) {
      goToStep(currentStep);
    }
  }, [isPlaying, isPaused, currentStep, startGuidance, pauseGuidance, resumeGuidance, stopGuidance, goToStep, onVoiceCommand]);

  // Toggle voice recognition
  const toggleVoiceRecognition = useCallback(() => {
    if (!recognition.current) return;
    
    if (isListening) {
      recognition.current.stop();
      setIsListening(false);
    } else {
      recognition.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Update voice settings
  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-4">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
            <Speaker className="w-6 h-6 text-krong-red" />
            {t('title')}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Language Badge */}
            <Badge variant="outline" className="text-tablet-sm">
              <Languages className="w-3 h-3 mr-1" />
              {voiceSettings.language.toUpperCase()}
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
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-tablet-sm text-muted-foreground">
            <span>{t('step', { current: currentStep + 1, total: steps.length })}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-krong-red h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Step Display */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-start gap-3">
            <Badge variant="default" className="text-tablet-sm font-mono flex-shrink-0">
              {currentStep + 1}
            </Badge>
            <div className="flex-1">
              <p className="text-tablet-base font-body leading-relaxed">
                {getCurrentStepText(currentStep)}
              </p>
              {steps[currentStep]?.emphasis === 'critical' && (
                <Badge variant="destructive" className="text-tablet-xs mt-2">
                  {t('critical')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Controls */}
        {showControls && (
          <div className="flex items-center justify-center gap-3">
            {/* Navigation */}
            {enableNavigation && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToStep(currentStep - 1)}
                  disabled={currentStep === 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToStep(currentStep + 1)}
                  disabled={currentStep >= steps.length - 1}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </>
            )}
            
            {/* Play/Pause */}
            <Button
              variant="default"
              size="icon-lg"
              onClick={() => {
                if (!isPlaying) {
                  startGuidance();
                } else if (isPaused) {
                  resumeGuidance();
                } else {
                  pauseGuidance();
                }
              }}
              className="bg-krong-red hover:bg-krong-red/90"
            >
              {!isPlaying ? (
                <Play className="w-6 h-6" />
              ) : isPaused ? (
                <Play className="w-6 h-6" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </Button>
            
            {/* Stop */}
            <Button
              variant="outline"
              size="icon"
              onClick={stopGuidance}
              disabled={!isPlaying}
            >
              <Square className="w-4 h-4" />
            </Button>

            {/* Voice Commands */}
            {enableVoiceCommands && recognitionSupported && (
              <Button
                variant={isListening ? "default" : "outline"}
                size="icon"
                onClick={toggleVoiceRecognition}
                className={isListening ? "bg-krong-red text-white" : ""}
              >
                {isListening ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-tablet-sm font-heading font-semibold">{t('settings.title')}</h4>
            
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-tablet-sm font-body font-medium">{t('settings.language')}</label>
              <Select
                value={voiceSettings.language}
                onValueChange={(value: 'en' | 'fr') => updateSettings({ language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-tablet-sm font-body font-medium">{t('settings.voice')}</label>
              <Select
                value={voiceSettings.voice || ''}
                onValueChange={(value) => updateSettings({ voice: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.defaultVoice')} />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices
                    .filter(voice => 
                      voiceSettings.language === 'fr' 
                        ? voice.lang.startsWith('fr')
                        : voice.lang.startsWith('en')
                    )
                    .map(voice => (
                      <SelectItem key={voice.name} value={voice.name}>
                        {voice.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-tablet-sm font-body font-medium">{t('settings.speed')}</label>
                <span className="text-tablet-xs text-muted-foreground">{voiceSettings.rate.toFixed(1)}x</span>
              </div>
              <Slider
                value={[voiceSettings.rate]}
                onValueChange={([value]) => updateSettings({ rate: value })}
                min={0.1}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Pitch Control */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-tablet-sm font-body font-medium">{t('settings.pitch')}</label>
                <span className="text-tablet-xs text-muted-foreground">{voiceSettings.pitch.toFixed(1)}</span>
              </div>
              <Slider
                value={[voiceSettings.pitch]}
                onValueChange={([value]) => updateSettings({ pitch: value })}
                min={0.0}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-tablet-sm font-body font-medium">{t('settings.volume')}</label>
                <span className="text-tablet-xs text-muted-foreground">{Math.round(voiceSettings.volume * 100)}%</span>
              </div>
              <Slider
                value={[voiceSettings.volume]}
                onValueChange={([value]) => updateSettings({ volume: value })}
                min={0.0}
                max={1.0}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Voice Commands Help */}
        {enableVoiceCommands && recognitionSupported && isListening && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-tablet-sm text-blue-700 mb-2">{t('voiceCommands.listening')}</p>
            <div className="text-tablet-xs text-blue-600 space-y-1">
              <p>• "{t('voiceCommands.play')}" - {t('voiceCommands.playDescription')}</p>
              <p>• "{t('voiceCommands.pause')}" - {t('voiceCommands.pauseDescription')}</p>
              <p>• "{t('voiceCommands.next')}" - {t('voiceCommands.nextDescription')}</p>
              <p>• "{t('voiceCommands.previous')}" - {t('voiceCommands.previousDescription')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceGuidanceSystem;