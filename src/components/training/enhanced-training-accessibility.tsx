/**
 * Enhanced Training Accessibility Features
 * Advanced accessibility support for inclusive training experiences
 * Features screen reader optimization, keyboard navigation, voice controls,
 * visual adjustments, cognitive support, and multi-sensory learning
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Type,
  Palette,
  MousePointer,
  Keyboard,
  Mic,
  MicOff,
  Pause,
  Play,
  SkipForward,
  SkipBack,
  RotateCcw,
  Focus,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Move,
  Settings,
  Users,
  Brain,
  Heart,
  Timer,
  Headphones,
  Captions,
  Languages,
  Subtitles,
  BookOpen,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Home,
  Menu,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

interface AccessibilitySettings {
  // Visual accessibility
  fontSize: number;
  lineHeight: number;
  contrast: 'normal' | 'high' | 'extra-high';
  colorTheme: 'default' | 'dark' | 'high-contrast' | 'colorblind-friendly';
  reducedMotion: boolean;
  focusIndicator: 'default' | 'enhanced' | 'high-visibility';
  
  // Audio accessibility
  audioEnabled: boolean;
  audioSpeed: number;
  audioVolume: number;
  textToSpeech: boolean;
  audioDescriptions: boolean;
  soundEffects: boolean;
  
  // Navigation accessibility
  keyboardNavigation: boolean;
  voiceControl: boolean;
  skipLinks: boolean;
  breadcrumbs: boolean;
  pageStructure: boolean;
  
  // Cognitive accessibility
  simplifiedInterface: boolean;
  readingGuide: boolean;
  progressIndicators: boolean;
  timeExtensions: boolean;
  contentSummaries: boolean;
  glossarySupport: boolean;
  
  // Motor accessibility
  clickTargetSize: 'normal' | 'large' | 'extra-large';
  dwellTime: number;
  stickyKeys: boolean;
  oneHandedMode: boolean;
  gestureAlternatives: boolean;
  
  // Language accessibility
  captionsEnabled: boolean;
  signLanguage: boolean;
  translations: boolean;
  pictorialSupport: boolean;
}

interface VoiceCommand {
  command: string;
  action: string;
  description: string;
  examples: string[];
}

interface AccessibilityError {
  type: 'contrast' | 'focus' | 'alt-text' | 'keyboard' | 'structure' | 'timing';
  element: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  fix?: string;
}

interface EnhancedTrainingAccessibilityProps {
  children: React.ReactNode;
  className?: string;
  trainingContent?: any;
  onSettingsChange?: (settings: AccessibilitySettings) => void;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 16,
  lineHeight: 1.5,
  contrast: 'normal',
  colorTheme: 'default',
  reducedMotion: false,
  focusIndicator: 'default',
  audioEnabled: true,
  audioSpeed: 1.0,
  audioVolume: 0.8,
  textToSpeech: false,
  audioDescriptions: false,
  soundEffects: true,
  keyboardNavigation: true,
  voiceControl: false,
  skipLinks: true,
  breadcrumbs: true,
  pageStructure: true,
  simplifiedInterface: false,
  readingGuide: false,
  progressIndicators: true,
  timeExtensions: false,
  contentSummaries: false,
  glossarySupport: false,
  clickTargetSize: 'normal',
  dwellTime: 500,
  stickyKeys: false,
  oneHandedMode: false,
  gestureAlternatives: true,
  captionsEnabled: false,
  signLanguage: false,
  translations: false,
  pictorialSupport: false
};

const VOICE_COMMANDS: VoiceCommand[] = [
  {
    command: 'next',
    action: 'Navigate to next section',
    description: 'Move to the next training section',
    examples: ['next', 'go forward', 'continue']
  },
  {
    command: 'previous',
    action: 'Navigate to previous section',
    description: 'Move to the previous training section',
    examples: ['previous', 'go back', 'back']
  },
  {
    command: 'play',
    action: 'Start audio playback',
    description: 'Begin playing audio content',
    examples: ['play', 'start', 'begin audio']
  },
  {
    command: 'pause',
    action: 'Pause audio playback',
    description: 'Pause the current audio',
    examples: ['pause', 'stop', 'halt']
  },
  {
    command: 'repeat',
    action: 'Repeat current section',
    description: 'Replay the current content',
    examples: ['repeat', 'replay', 'again']
  },
  {
    command: 'help',
    action: 'Show help information',
    description: 'Display available commands and assistance',
    examples: ['help', 'assistance', 'what can I do']
  }
];

export function EnhancedTrainingAccessibility({ 
  children, 
  className, 
  trainingContent,
  onSettingsChange 
}: EnhancedTrainingAccessibilityProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentFocus, setCurrentFocus] = useState<string | null>(null);
  const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);
  const [voiceCommandsVisible, setVoiceCommandsVisible] = useState(false);
  const [accessibilityErrors, setAccessibilityErrors] = useState<AccessibilityError[]>([]);
  const [readingPosition, setReadingPosition] = useState(0);
  const [isReading, setIsReading] = useState(false);
  
  // Refs
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const focusableElements = useRef<HTMLElement[]>([]);
  const currentFocusIndex = useRef(0);
  const readingGuideRef = useRef<HTMLDivElement>(null);
  
  // Initialize accessibility features
  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error);
      }
    }
    
    // Initialize voice recognition if supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = locale === 'fr' ? 'fr-FR' : 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        handleVoiceCommand(command);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
      };
    }
    
    // Scan for accessibility issues
    scanAccessibilityIssues();
    
    // Update focusable elements list
    updateFocusableElements();
    
    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [locale]);
  
  // Apply accessibility settings
  useEffect(() => {
    applyAccessibilitySettings();
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!settings.keyboardNavigation) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Tab':
          if (event.shiftKey) {
            navigateToElement('previous');
          } else {
            navigateToElement('next');
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          navigateToElement('next');
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          navigateToElement('previous');
          break;
        case 'Home':
          event.preventDefault();
          navigateToElement('first');
          break;
        case 'End':
          event.preventDefault();
          navigateToElement('last');
          break;
        case 'Enter':
        case ' ':
          if (event.target && (event.target as HTMLElement).tagName === 'BUTTON') {
            (event.target as HTMLElement).click();
          }
          break;
        case 'Escape':
          setShowAccessibilityPanel(false);
          setKeyboardHelpVisible(false);
          setVoiceCommandsVisible(false);
          break;
        case 'h':
          if (event.altKey) {
            event.preventDefault();
            setKeyboardHelpVisible(true);
          }
          break;
        case 'a':
          if (event.altKey) {
            event.preventDefault();
            setShowAccessibilityPanel(true);
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation]);
  
  // Apply accessibility settings to DOM
  const applyAccessibilitySettings = () => {
    const root = document.documentElement;
    
    // Visual settings
    root.style.fontSize = `${settings.fontSize}px`;
    root.style.lineHeight = settings.lineHeight.toString();
    
    // Color theme
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${settings.colorTheme}`);
    
    // Contrast
    root.classList.toggle('high-contrast', settings.contrast === 'high');
    root.classList.toggle('extra-high-contrast', settings.contrast === 'extra-high');
    
    // Motion
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    
    // Focus indicators
    root.classList.toggle('enhanced-focus', settings.focusIndicator === 'enhanced');
    root.classList.toggle('high-visibility-focus', settings.focusIndicator === 'high-visibility');
    
    // Click target sizes
    root.classList.toggle('large-targets', settings.clickTargetSize === 'large');
    root.classList.toggle('extra-large-targets', settings.clickTargetSize === 'extra-large');
    
    // Interface simplification
    root.classList.toggle('simplified-interface', settings.simplifiedInterface);
  };
  
  // Update focusable elements
  const updateFocusableElements = () => {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    focusableElements.current = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  };
  
  // Navigate between focusable elements
  const navigateToElement = (direction: 'next' | 'previous' | 'first' | 'last') => {
    updateFocusableElements();
    const elements = focusableElements.current;
    
    if (elements.length === 0) return;
    
    let nextIndex = 0;
    
    switch (direction) {
      case 'next':
        nextIndex = (currentFocusIndex.current + 1) % elements.length;
        break;
      case 'previous':
        nextIndex = currentFocusIndex.current - 1;
        if (nextIndex < 0) nextIndex = elements.length - 1;
        break;
      case 'first':
        nextIndex = 0;
        break;
      case 'last':
        nextIndex = elements.length - 1;
        break;
    }
    
    currentFocusIndex.current = nextIndex;
    elements[nextIndex]?.focus();
    setCurrentFocus(elements[nextIndex]?.id || `element-${nextIndex}`);
  };
  
  // Handle voice commands
  const handleVoiceCommand = (command: string) => {
    const matchedCommand = VOICE_COMMANDS.find(cmd => 
      cmd.examples.some(example => command.includes(example))
    );
    
    if (matchedCommand) {
      switch (matchedCommand.command) {
        case 'next':
          navigateToElement('next');
          break;
        case 'previous':
          navigateToElement('previous');
          break;
        case 'play':
          startTextToSpeech();
          break;
        case 'pause':
          stopTextToSpeech();
          break;
        case 'repeat':
          repeatCurrentSection();
          break;
        case 'help':
          setVoiceCommandsVisible(true);
          break;
      }
      
      announceAction(matchedCommand.action);
    } else {
      announceAction(t('accessibility.command_not_recognized'));
    }
  };
  
  // Text-to-speech functionality
  const startTextToSpeech = (text?: string) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    const textToRead = text || getReadableContent();
    if (!textToRead) return;
    
    speechSynthesisRef.current = new SpeechSynthesisUtterance(textToRead);
    speechSynthesisRef.current.rate = settings.audioSpeed;
    speechSynthesisRef.current.volume = settings.audioVolume;
    speechSynthesisRef.current.lang = locale === 'fr' ? 'fr-FR' : 'en-US';
    
    speechSynthesisRef.current.onstart = () => setIsReading(true);
    speechSynthesisRef.current.onend = () => setIsReading(false);
    speechSynthesisRef.current.onerror = () => setIsReading(false);
    
    window.speechSynthesis.speak(speechSynthesisRef.current);
  };
  
  const stopTextToSpeech = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
  };
  
  // Get readable content from current view
  const getReadableContent = (): string => {
    const content = document.querySelector('[data-training-content]');
    if (content) {
      return content.textContent || '';
    }
    return document.body.textContent || '';
  };
  
  // Announce actions for screen readers
  const announceAction = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };
  
  // Toggle voice control
  const toggleVoiceControl = () => {
    if (!recognitionRef.current) {
      toast({
        title: t('accessibility.voice_not_supported'),
        description: t('accessibility.voice_not_supported_desc'),
        variant: 'destructive',
      });
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };
  
  // Scan for accessibility issues
  const scanAccessibilityIssues = () => {
    const errors: AccessibilityError[] = [];
    
    // Check for missing alt text
    const images = document.querySelectorAll('img:not([alt])');
    images.forEach((img, index) => {
      errors.push({
        type: 'alt-text',
        element: `Image ${index + 1}`,
        message: t('accessibility.missing_alt_text'),
        severity: 'error',
        fix: t('accessibility.add_alt_text')
      });
    });
    
    // Check for low contrast (simplified check)
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');
    // This would need a proper contrast calculation in a real implementation
    
    // Check for keyboard accessibility
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
    interactiveElements.forEach((element, index) => {
      if (!element.getAttribute('tabindex') && element.tagName !== 'BUTTON' && element.tagName !== 'A') {
        errors.push({
          type: 'keyboard',
          element: `${element.tagName} ${index + 1}`,
          message: t('accessibility.not_keyboard_accessible'),
          severity: 'warning',
          fix: t('accessibility.add_tabindex')
        });
      }
    });
    
    setAccessibilityErrors(errors);
  };
  
  // Repeat current section
  const repeatCurrentSection = () => {
    const currentContent = document.querySelector('[data-current-section]');
    if (currentContent) {
      startTextToSpeech(currentContent.textContent || '');
    }
  };
  
  // Settings handlers
  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  // Render accessibility toolbar
  const renderAccessibilityToolbar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAccessibilityPanel(true)}
            aria-label={t('accessibility.open_settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('accessibility.settings')}
          </Button>
          
          {settings.skipLinks && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateToElement('next')}
                aria-label={t('accessibility.skip_to_content')}
              >
                {t('accessibility.skip_to_content')}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => document.querySelector('[data-main-navigation]')?.focus()}
                aria-label={t('accessibility.skip_to_navigation')}
              >
                {t('accessibility.skip_to_navigation')}
              </Button>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {settings.textToSpeech && (
            <Button
              size="sm"
              variant={isReading ? 'default' : 'outline'}
              onClick={isReading ? stopTextToSpeech : () => startTextToSpeech()}
              aria-label={isReading ? t('accessibility.stop_reading') : t('accessibility.start_reading')}
            >
              {isReading ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          )}
          
          {settings.voiceControl && (
            <Button
              size="sm"
              variant={isListening ? 'default' : 'outline'}
              onClick={toggleVoiceControl}
              aria-label={isListening ? t('accessibility.stop_listening') : t('accessibility.start_listening')}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setKeyboardHelpVisible(true)}
            aria-label={t('accessibility.keyboard_shortcuts')}
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {settings.progressIndicators && (
        <div className="px-4 pb-2">
          <Progress value={readingPosition} className="h-1" />
        </div>
      )}
    </div>
  );
  
  // Render accessibility settings panel
  const renderSettingsPanel = () => (
    <Dialog open={showAccessibilityPanel} onOpenChange={setShowAccessibilityPanel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            {t('accessibility.accessibility_settings')}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="visual">{t('accessibility.visual')}</TabsTrigger>
            <TabsTrigger value="audio">{t('accessibility.audio')}</TabsTrigger>
            <TabsTrigger value="navigation">{t('accessibility.navigation')}</TabsTrigger>
            <TabsTrigger value="cognitive">{t('accessibility.cognitive')}</TabsTrigger>
            <TabsTrigger value="motor">{t('accessibility.motor')}</TabsTrigger>
          </TabsList>
          
          {/* Visual Accessibility */}
          <TabsContent value="visual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  {t('accessibility.visual_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('accessibility.font_size')}: {settings.fontSize}px</Label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([value]) => updateSetting('fontSize', value)}
                      min={12}
                      max={24}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>{t('accessibility.line_height')}: {settings.lineHeight}</Label>
                    <Slider
                      value={[settings.lineHeight]}
                      onValueChange={([value]) => updateSetting('lineHeight', value)}
                      min={1.0}
                      max={2.0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('accessibility.contrast')}</Label>
                    <Select value={settings.contrast} onValueChange={(value: any) => updateSetting('contrast', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">{t('accessibility.normal_contrast')}</SelectItem>
                        <SelectItem value="high">{t('accessibility.high_contrast')}</SelectItem>
                        <SelectItem value="extra-high">{t('accessibility.extra_high_contrast')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>{t('accessibility.color_theme')}</Label>
                    <Select value={settings.colorTheme} onValueChange={(value: any) => updateSetting('colorTheme', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">{t('accessibility.default_theme')}</SelectItem>
                        <SelectItem value="dark">{t('accessibility.dark_theme')}</SelectItem>
                        <SelectItem value="high-contrast">{t('accessibility.high_contrast_theme')}</SelectItem>
                        <SelectItem value="colorblind-friendly">{t('accessibility.colorblind_friendly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.reduced_motion')}</Label>
                  <Switch
                    checked={settings.reducedMotion}
                    onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.reading_guide')}</Label>
                  <Switch
                    checked={settings.readingGuide}
                    onCheckedChange={(checked) => updateSetting('readingGuide', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Audio Accessibility */}
          <TabsContent value="audio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Volume2 className="w-5 h-5 mr-2" />
                  {t('accessibility.audio_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.text_to_speech')}</Label>
                  <Switch
                    checked={settings.textToSpeech}
                    onCheckedChange={(checked) => updateSetting('textToSpeech', checked)}
                  />
                </div>
                
                {settings.textToSpeech && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <Label>{t('accessibility.speech_speed')}: {settings.audioSpeed}x</Label>
                      <Slider
                        value={[settings.audioSpeed]}
                        onValueChange={([value]) => updateSetting('audioSpeed', value)}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label>{t('accessibility.volume')}: {Math.round(settings.audioVolume * 100)}%</Label>
                      <Slider
                        value={[settings.audioVolume]}
                        onValueChange={([value]) => updateSetting('audioVolume', value)}
                        min={0}
                        max={1}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.audio_descriptions')}</Label>
                  <Switch
                    checked={settings.audioDescriptions}
                    onCheckedChange={(checked) => updateSetting('audioDescriptions', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.captions')}</Label>
                  <Switch
                    checked={settings.captionsEnabled}
                    onCheckedChange={(checked) => updateSetting('captionsEnabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.sound_effects')}</Label>
                  <Switch
                    checked={settings.soundEffects}
                    onCheckedChange={(checked) => updateSetting('soundEffects', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Navigation Accessibility */}
          <TabsContent value="navigation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Keyboard className="w-5 h-5 mr-2" />
                  {t('accessibility.navigation_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.keyboard_navigation')}</Label>
                  <Switch
                    checked={settings.keyboardNavigation}
                    onCheckedChange={(checked) => updateSetting('keyboardNavigation', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.voice_control')}</Label>
                  <Switch
                    checked={settings.voiceControl}
                    onCheckedChange={(checked) => updateSetting('voiceControl', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.skip_links')}</Label>
                  <Switch
                    checked={settings.skipLinks}
                    onCheckedChange={(checked) => updateSetting('skipLinks', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.breadcrumbs')}</Label>
                  <Switch
                    checked={settings.breadcrumbs}
                    onCheckedChange={(checked) => updateSetting('breadcrumbs', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Cognitive Accessibility */}
          <TabsContent value="cognitive" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  {t('accessibility.cognitive_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.simplified_interface')}</Label>
                  <Switch
                    checked={settings.simplifiedInterface}
                    onCheckedChange={(checked) => updateSetting('simplifiedInterface', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.progress_indicators')}</Label>
                  <Switch
                    checked={settings.progressIndicators}
                    onCheckedChange={(checked) => updateSetting('progressIndicators', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.time_extensions')}</Label>
                  <Switch
                    checked={settings.timeExtensions}
                    onCheckedChange={(checked) => updateSetting('timeExtensions', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.content_summaries')}</Label>
                  <Switch
                    checked={settings.contentSummaries}
                    onCheckedChange={(checked) => updateSetting('contentSummaries', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.glossary_support')}</Label>
                  <Switch
                    checked={settings.glossarySupport}
                    onCheckedChange={(checked) => updateSetting('glossarySupport', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Motor Accessibility */}
          <TabsContent value="motor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MousePointer className="w-5 h-5 mr-2" />
                  {t('accessibility.motor_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('accessibility.click_target_size')}</Label>
                  <Select value={settings.clickTargetSize} onValueChange={(value: any) => updateSetting('clickTargetSize', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">{t('accessibility.normal_size')}</SelectItem>
                      <SelectItem value="large">{t('accessibility.large_size')}</SelectItem>
                      <SelectItem value="extra-large">{t('accessibility.extra_large_size')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('accessibility.dwell_time')}: {settings.dwellTime}ms</Label>
                  <Slider
                    value={[settings.dwellTime]}
                    onValueChange={([value]) => updateSetting('dwellTime', value)}
                    min={200}
                    max={2000}
                    step={100}
                    className="mt-2"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.sticky_keys')}</Label>
                  <Switch
                    checked={settings.stickyKeys}
                    onCheckedChange={(checked) => updateSetting('stickyKeys', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.one_handed_mode')}</Label>
                  <Switch
                    checked={settings.oneHandedMode}
                    onCheckedChange={(checked) => updateSetting('oneHandedMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t('accessibility.gesture_alternatives')}</Label>
                  <Switch
                    checked={settings.gestureAlternatives}
                    onCheckedChange={(checked) => updateSetting('gestureAlternatives', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Accessibility Issues */}
        {accessibilityErrors.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {t('accessibility.issues_found')} ({accessibilityErrors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {accessibilityErrors.slice(0, 5).map((error, index) => (
                  <div key={index} className="flex items-start space-x-3 p-2 bg-white rounded">
                    <div className={cn(
                      "p-1 rounded",
                      error.severity === 'error' ? 'bg-red-100 text-red-600' :
                      error.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    )}>
                      {error.severity === 'error' ? <X className="w-3 h-3" /> :
                       error.severity === 'warning' ? <AlertTriangle className="w-3 h-3" /> :
                       <Info className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{error.element}</div>
                      <div className="text-xs text-muted-foreground">{error.message}</div>
                      {error.fix && (
                        <div className="text-xs text-blue-600 mt-1">{error.fix}</div>
                      )}
                    </div>
                  </div>
                ))}
                {accessibilityErrors.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{accessibilityErrors.length - 5} {t('accessibility.more_issues')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
  
  // Render keyboard help
  const renderKeyboardHelp = () => (
    <Dialog open={keyboardHelpVisible} onOpenChange={setKeyboardHelpVisible}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Keyboard className="w-5 h-5 mr-2" />
            {t('accessibility.keyboard_shortcuts')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded text-sm">Tab</code>
              <span className="text-sm">{t('accessibility.next_element')}</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded text-sm">Shift + Tab</code>
              <span className="text-sm">{t('accessibility.previous_element')}</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded text-sm">Arrow Keys</code>
              <span className="text-sm">{t('accessibility.navigate')}</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded text-sm">Enter/Space</code>
              <span className="text-sm">{t('accessibility.activate')}</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded text-sm">Escape</code>
              <span className="text-sm">{t('accessibility.close')}</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded text-sm">Alt + A</code>
              <span className="text-sm">{t('accessibility.open_settings')}</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded text-sm">Alt + H</code>
              <span className="text-sm">{t('accessibility.show_help')}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className={cn('relative', className)}>
      {/* Accessibility toolbar */}
      {renderAccessibilityToolbar()}
      
      {/* Skip links for screen readers */}
      {settings.skipLinks && (
        <div className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50">
          <Button
            onClick={() => document.querySelector('[data-main-content]')?.focus()}
            className="m-2"
          >
            {t('accessibility.skip_to_main_content')}
          </Button>
        </div>
      )}
      
      {/* Reading guide overlay */}
      {settings.readingGuide && (
        <div
          ref={readingGuideRef}
          className="fixed inset-0 pointer-events-none z-40"
          style={{
            background: `linear-gradient(to bottom, 
              rgba(0,0,0,0.1) 0%, 
              transparent 20%, 
              transparent 80%, 
              rgba(0,0,0,0.1) 100%)`
          }}
        />
      )}
      
      {/* Main content with accessibility enhancements */}
      <div 
        data-main-content
        tabIndex={-1}
        className={cn(
          'pt-16', // Account for toolbar
          settings.simplifiedInterface && 'simplified-interface',
          settings.readingGuide && 'reading-guide-active'
        )}
      >
        {children}
      </div>
      
      {/* Settings panel */}
      {renderSettingsPanel()}
      
      {/* Keyboard help */}
      {renderKeyboardHelp()}
      
      {/* Voice commands help */}
      <Dialog open={voiceCommandsVisible} onOpenChange={setVoiceCommandsVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Mic className="w-5 h-5 mr-2" />
              {t('accessibility.voice_commands')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {VOICE_COMMANDS.map((command) => (
              <div key={command.command} className="border rounded p-3">
                <div className="font-medium">{t(`accessibility.command_${command.command}`)}</div>
                <div className="text-sm text-muted-foreground mb-2">{command.description}</div>
                <div className="text-xs">
                  <strong>{t('accessibility.examples')}:</strong> {command.examples.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" />
      <div aria-live="assertive" aria-atomic="true" className="sr-only" />
    </div>
  );
}

export default EnhancedTrainingAccessibility;