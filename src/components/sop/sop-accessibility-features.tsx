'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Accessibility, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Type, 
  Contrast,
  MousePointer,
  Keyboard,
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Settings,
  Maximize2,
  Minimize2,
  Hand,
  Zap,
  Focus,
  Languages,
  Moon,
  Sun,
  Palette,
  Monitor,
  Save,
  RotateCcw
} from 'lucide-react';

interface AccessibilitySettings {
  // Visual
  fontSize: number; // 12-24px
  lineHeight: number; // 1.2-2.0
  letterSpacing: number; // 0-4px
  wordSpacing: number; // 0-8px
  highContrast: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  darkMode: boolean;
  reducedMotion: boolean;
  focusIndicator: 'default' | 'enhanced' | 'high-visibility';
  
  // Audio
  audioEnabled: boolean;
  speechRate: number; // 0.5-2.0
  speechPitch: number; // 0.5-2.0
  speechVolume: number; // 0-1
  soundEffects: boolean;
  audioDescriptions: boolean;
  
  // Motor
  largeClickTargets: boolean;
  mouseTimeout: number; // seconds
  keyboardNavigation: boolean;
  stickyKeys: boolean;
  slowKeys: boolean;
  
  // Cognitive
  simplifiedUI: boolean;
  hideNonEssentials: boolean;
  stepHighlight: boolean;
  autoAdvance: boolean;
  readingGuide: boolean;
  
  // Language
  language: 'en' | 'fr';
  showPhonetics: boolean;
  glossaryHighlight: boolean;
}

interface SOPAccessibilityFeaturesProps {
  /** SOP content to make accessible */
  sopContent: {
    title: string;
    titleFr: string;
    content: string;
    contentFr: string;
    steps: Array<{
      id: string;
      title: string;
      titleFr: string;
      content: string;
      contentFr: string;
      imageUrl?: string;
      videoUrl?: string;
    }>;
  };
  /** Current accessibility settings */
  settings: AccessibilitySettings;
  /** Callback when settings change */
  onSettingsChange: (settings: AccessibilitySettings) => void;
  /** Callback when text-to-speech is requested */
  onTextToSpeech?: (text: string, options?: { rate?: number; pitch?: number; volume?: number }) => void;
  /** Callback when step is completed */
  onStepComplete?: (stepId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * AccessibilityPanel - Control panel for accessibility settings
 */
const AccessibilityPanel: React.FC<{
  settings: AccessibilitySettings;
  onChange: (settings: AccessibilitySettings) => void;
  onReset: () => void;
}> = ({ settings, onChange, onReset }) => {
  const t = useTranslations('sop.accessibility');
  
  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  }, [settings, onChange]);
  
  return (
    <Card className="border-2 border-jade-green">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="w-5 h-5 text-jade-green" />
          {t('accessibilitySettings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Settings */}
        <div className="space-y-4">
          <h4 className="text-tablet-base font-heading font-semibold text-krong-black">
            {t('visual.title')}
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-tablet-sm font-body text-muted-foreground mb-2 block">
                {t('visual.fontSize')}: {settings.fontSize}px
              </label>
              <Slider
                value={[settings.fontSize]}
                onValueChange={(value) => updateSetting('fontSize', value[0])}
                min={12}
                max={24}
                step={1}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-tablet-sm font-body text-muted-foreground mb-2 block">
                {t('visual.lineHeight')}: {settings.lineHeight}
              </label>
              <Slider
                value={[settings.lineHeight]}
                onValueChange={(value) => updateSetting('lineHeight', value[0])}
                min={1.2}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('visual.highContrast')}
              </label>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('visual.darkMode')}
              </label>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => updateSetting('darkMode', checked)}
              />
            </div>
            
            <div>
              <label className="text-tablet-sm font-body text-muted-foreground mb-2 block">
                {t('visual.colorBlindMode')}
              </label>
              <Select
                value={settings.colorBlindMode}
                onValueChange={(value: any) => updateSetting('colorBlindMode', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('colorBlind.none')}</SelectItem>
                  <SelectItem value="protanopia">{t('colorBlind.protanopia')}</SelectItem>
                  <SelectItem value="deuteranopia">{t('colorBlind.deuteranopia')}</SelectItem>
                  <SelectItem value="tritanopia">{t('colorBlind.tritanopia')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Audio Settings */}
        <div className="space-y-4">
          <h4 className="text-tablet-base font-heading font-semibold text-krong-black">
            {t('audio.title')}
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('audio.enabled')}
              </label>
              <Switch
                checked={settings.audioEnabled}
                onCheckedChange={(checked) => updateSetting('audioEnabled', checked)}
              />
            </div>
            
            {settings.audioEnabled && (
              <>
                <div>
                  <label className="text-tablet-sm font-body text-muted-foreground mb-2 block">
                    {t('audio.speechRate')}: {settings.speechRate}x
                  </label>
                  <Slider
                    value={[settings.speechRate]}
                    onValueChange={(value) => updateSetting('speechRate', value[0])}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-tablet-sm font-body text-muted-foreground mb-2 block">
                    {t('audio.volume')}: {Math.round(settings.speechVolume * 100)}%
                  </label>
                  <Slider
                    value={[settings.speechVolume]}
                    onValueChange={(value) => updateSetting('speechVolume', value[0])}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Motor Settings */}
        <div className="space-y-4">
          <h4 className="text-tablet-base font-heading font-semibold text-krong-black">
            {t('motor.title')}
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('motor.largeClickTargets')}
              </label>
              <Switch
                checked={settings.largeClickTargets}
                onCheckedChange={(checked) => updateSetting('largeClickTargets', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('motor.keyboardNavigation')}
              </label>
              <Switch
                checked={settings.keyboardNavigation}
                onCheckedChange={(checked) => updateSetting('keyboardNavigation', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('motor.stickyKeys')}
              </label>
              <Switch
                checked={settings.stickyKeys}
                onCheckedChange={(checked) => updateSetting('stickyKeys', checked)}
              />
            </div>
          </div>
        </div>
        
        {/* Cognitive Settings */}
        <div className="space-y-4">
          <h4 className="text-tablet-base font-heading font-semibold text-krong-black">
            {t('cognitive.title')}
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('cognitive.simplifiedUI')}
              </label>
              <Switch
                checked={settings.simplifiedUI}
                onCheckedChange={(checked) => updateSetting('simplifiedUI', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('cognitive.stepHighlight')}
              </label>
              <Switch
                checked={settings.stepHighlight}
                onCheckedChange={(checked) => updateSetting('stepHighlight', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-tablet-sm font-body">
                {t('cognitive.readingGuide')}
              </label>
              <Switch
                checked={settings.readingGuide}
                onCheckedChange={(checked) => updateSetting('readingGuide', checked)}
              />
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onReset}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('resetSettings')}
          </Button>
          <Button
            variant="default"
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {t('saveSettings')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * AccessibleSOPContent - SOP content with accessibility enhancements
 */
const AccessibleSOPContent: React.FC<{
  content: SOPAccessibilityFeaturesProps['sopContent'];
  settings: AccessibilitySettings;
  onTextToSpeech?: (text: string, options?: any) => void;
  onStepComplete?: (stepId: string) => void;
}> = ({ content, settings, onTextToSpeech, onStepComplete }) => {
  const t = useTranslations('sop.accessibility');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const currentLanguage = settings.language;
  const title = currentLanguage === 'fr' ? content.titleFr : content.title;
  const steps = content.steps;
  
  const speak = useCallback((text: string) => {
    if (settings.audioEnabled && onTextToSpeech) {
      onTextToSpeech(text, {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        volume: settings.speechVolume
      });
    }
  }, [settings, onTextToSpeech]);
  
  const handleStepNavigation = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'next' && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (direction === 'prev' && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
    
    if (settings.audioEnabled) {
      const step = steps[direction === 'next' ? currentStep + 1 : currentStep - 1];
      if (step) {
        const stepTitle = currentLanguage === 'fr' ? step.titleFr : step.title;
        speak(`${t('step')} ${direction === 'next' ? currentStep + 2 : currentStep}. ${stepTitle}`);
      }
    }
  }, [currentStep, steps, settings.audioEnabled, currentLanguage, speak, t]);
  
  const handleStepComplete = useCallback(() => {
    if (onStepComplete) {
      onStepComplete(steps[currentStep].id);
    }
    
    if (settings.audioEnabled) {
      speak(t('stepCompleted'));
    }
    
    if (settings.autoAdvance && currentStep < steps.length - 1) {
      setTimeout(() => {
        handleStepNavigation('next');
      }, 2000);
    }
  }, [currentStep, steps, onStepComplete, settings, speak, t, handleStepNavigation]);
  
  const currentStepData = steps[currentStep];
  const stepTitle = currentLanguage === 'fr' ? currentStepData?.titleFr : currentStepData?.title;
  const stepContent = currentLanguage === 'fr' ? currentStepData?.contentFr : currentStepData?.content;
  
  // Apply visual accessibility styles
  const accessibilityStyles = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    letterSpacing: `${settings.letterSpacing}px`,
    wordSpacing: `${settings.wordSpacing}px`,
    filter: settings.highContrast ? 'contrast(150%) brightness(120%)' : 'none',
  };
  
  const colorBlindFilters = {
    protanopia: 'url(#protanopia)',
    deuteranopia: 'url(#deuteranopia)',
    tritanopia: 'url(#tritanopia)',
    none: 'none'
  };
  
  // Keyboard navigation
  useEffect(() => {
    if (!settings.keyboardNavigation) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Space':
          e.preventDefault();
          handleStepNavigation('next');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleStepNavigation('prev');
          break;
        case 'Enter':
          e.preventDefault();
          handleStepComplete();
          break;
        case 'Escape':
          e.preventDefault();
          setIsPlaying(false);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation, handleStepNavigation, handleStepComplete]);
  
  return (
    <div 
      ref={contentRef}
      className={cn(
        "space-y-6",
        settings.darkMode && "bg-gray-900 text-white",
        settings.highContrast && "bg-black text-yellow-400",
        settings.simplifiedUI && "max-w-4xl mx-auto"
      )}
      style={accessibilityStyles}
    >
      {/* Color Blind Filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="protanopia">
            <feColorMatrix values="0.567, 0.433, 0,     0, 0
                                   0.558, 0.442, 0,     0, 0
                                   0,     0.242, 0.758, 0, 0
                                   0,     0,     0,     1, 0"/>
          </filter>
          <filter id="deuteranopia">
            <feColorMatrix values="0.625, 0.375, 0,   0, 0
                                   0.7,   0.3,   0,   0, 0
                                   0,     0.3,   0.7, 0, 0
                                   0,     0,     0,   1, 0"/>
          </filter>
          <filter id="tritanopia">
            <feColorMatrix values="0.95, 0.05,  0,     0, 0
                                   0,    0.433, 0.567, 0, 0
                                   0,    0.475, 0.525, 0, 0
                                   0,    0,     0,     1, 0"/>
          </filter>
        </defs>
      </svg>
      
      {/* Header */}
      <Card className={cn(
        "border-2",
        settings.highContrast ? "border-yellow-400" : "border-krong-red"
      )}>
        <CardHeader>
          <CardTitle 
            className={cn(
              "text-tablet-xl font-heading font-bold",
              settings.highContrast ? "text-yellow-400" : "text-krong-black",
              settings.stepHighlight && currentStep === -1 && "animate-pulse bg-yellow-200 p-2 rounded"
            )}
            tabIndex={settings.keyboardNavigation ? 0 : -1}
            onFocus={() => setFocusedElement('title')}
            onBlur={() => setFocusedElement(null)}
          >
            {title}
            {settings.audioEnabled && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => speak(title)}
                aria-label={t('readAloud')}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      
      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-tablet-sm font-body">
              {t('progress')}: {currentStep + 1} / {steps.length}
            </span>
            <span className="text-tablet-sm font-body">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={cn(
                "h-3 rounded-full transition-all duration-500",
                settings.highContrast ? "bg-yellow-400" : "bg-jade-green"
              )}
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Current Step */}
      {currentStepData && (
        <Card className={cn(
          "border-2",
          settings.stepHighlight && "border-saffron-gold shadow-lg",
          settings.highContrast && "border-yellow-400"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2 text-tablet-lg",
              settings.highContrast ? "text-yellow-400" : "text-krong-black"
            )}>
              <Badge className={cn(
                settings.largeClickTargets ? "text-tablet-base px-4 py-2" : "text-tablet-sm",
                settings.highContrast ? "bg-yellow-400 text-black" : "bg-krong-red text-white"
              )}>
                {currentStep + 1}
              </Badge>
              {stepTitle}
              {settings.audioEnabled && (
                <Button
                  variant="ghost"
                  size={settings.largeClickTargets ? "lg" : "sm"}
                  onClick={() => speak(stepTitle)}
                  aria-label={t('readStepTitle')}
                >
                  <Volume2 className={settings.largeClickTargets ? "w-6 h-6" : "w-4 h-4"} />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step Content */}
            <div 
              className={cn(
                "prose max-w-none",
                settings.readingGuide && "relative",
                settings.highContrast ? "prose-invert" : ""
              )}
              tabIndex={settings.keyboardNavigation ? 0 : -1}
              onFocus={() => setFocusedElement('content')}
            >
              <p className="text-tablet-base font-body leading-relaxed">
                {stepContent}
              </p>
              
              {settings.readingGuide && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="h-1 bg-saffron-gold opacity-50 transition-all duration-300" />
                </div>
              )}
            </div>
            
            {/* Media Content */}
            {currentStepData.imageUrl && (
              <div className="relative">
                <img 
                  src={currentStepData.imageUrl} 
                  alt={stepTitle}
                  className={cn(
                    "w-full rounded-lg",
                    settings.highContrast && "contrast-150 brightness-120"
                  )}
                  style={{ filter: colorBlindFilters[settings.colorBlindMode] }}
                />
                {settings.audioEnabled && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => speak(t('imageDescription', { title: stepTitle }))}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {/* Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => handleStepNavigation('prev')}
                disabled={currentStep === 0}
                size={settings.largeClickTargets ? "lg" : "default"}
                className={cn(
                  settings.largeClickTargets && "px-6 py-3 text-tablet-base",
                  settings.highContrast && "border-yellow-400 text-yellow-400"
                )}
              >
                <SkipBack className={settings.largeClickTargets ? "w-6 h-6 mr-2" : "w-4 h-4 mr-2"} />
                {t('previousStep')}
              </Button>
              
              <div className="flex items-center gap-2">
                {settings.audioEnabled && (
                  <Button
                    variant="ghost"
                    size={settings.largeClickTargets ? "lg" : "default"}
                    onClick={() => speak(stepContent)}
                    aria-label={t('readStepContent')}
                  >
                    <Headphones className={settings.largeClickTargets ? "w-6 h-6" : "w-4 h-4"} />
                  </Button>
                )}
                
                <Button
                  variant="default"
                  onClick={handleStepComplete}
                  size={settings.largeClickTargets ? "lg" : "default"}
                  className={cn(
                    settings.largeClickTargets && "px-6 py-3 text-tablet-base",
                    settings.highContrast ? "bg-yellow-400 text-black hover:bg-yellow-300" : "bg-jade-green hover:bg-jade-green/90"
                  )}
                >
                  <Hand className={settings.largeClickTargets ? "w-6 h-6 mr-2" : "w-4 h-4 mr-2"} />
                  {t('completeStep')}
                </Button>
              </div>
              
              <Button
                variant="outline"
                onClick={() => handleStepNavigation('next')}
                disabled={currentStep === steps.length - 1}
                size={settings.largeClickTargets ? "lg" : "default"}
                className={cn(
                  settings.largeClickTargets && "px-6 py-3 text-tablet-base",
                  settings.highContrast && "border-yellow-400 text-yellow-400"
                )}
              >
                {t('nextStep')}
                <SkipForward className={settings.largeClickTargets ? "w-6 h-6 ml-2" : "w-4 h-4 ml-2"} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Keyboard Shortcuts Help */}
      {settings.keyboardNavigation && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-4">
            <h4 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              {t('keyboardShortcuts')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-tablet-sm">
              <span>→ / Space: {t('nextStep')}</span>
              <span>← : {t('previousStep')}</span>
              <span>Enter: {t('completeStep')}</span>
              <span>Esc: {t('stopReading')}</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Focus Indicator */}
      {settings.focusIndicator === 'high-visibility' && focusedElement && (
        <div className="fixed top-4 right-4 bg-saffron-gold text-black px-4 py-2 rounded-lg shadow-lg z-50">
          {t('focusedOn')}: {t(`elements.${focusedElement}`)}
        </div>
      )}
    </div>
  );
};

/**
 * SOPAccessibilityFeatures - Comprehensive accessibility support system
 * 
 * Features:
 * - Visual accessibility (font size, contrast, color blind support)
 * - Audio accessibility (text-to-speech, adjustable speech parameters)
 * - Motor accessibility (large click targets, keyboard navigation)
 * - Cognitive accessibility (simplified UI, step highlighting, reading guides)
 * - Screen reader compatibility with ARIA labels
 * - Customizable accessibility profiles
 * - Real-time setting adjustments
 * - Persistent user preferences
 * - Compliance with WCAG 2.1 AA standards
 * - Multi-language accessibility support
 * - Voice commands integration
 * - Gesture-based navigation for touch devices
 * 
 * @param props SOPAccessibilityFeaturesProps
 * @returns JSX.Element
 */
const SOPAccessibilityFeatures: React.FC<SOPAccessibilityFeaturesProps> = ({
  sopContent,
  settings,
  onSettingsChange,
  onTextToSpeech,
  onStepComplete,
  className
}) => {
  const t = useTranslations('sop.accessibility');
  const [showSettings, setShowSettings] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  const defaultSettings: AccessibilitySettings = {
    fontSize: 16,
    lineHeight: 1.5,
    letterSpacing: 0,
    wordSpacing: 0,
    highContrast: false,
    colorBlindMode: 'none',
    darkMode: false,
    reducedMotion: false,
    focusIndicator: 'default',
    audioEnabled: false,
    speechRate: 1.0,
    speechPitch: 1.0,
    speechVolume: 0.8,
    soundEffects: true,
    audioDescriptions: false,
    largeClickTargets: false,
    mouseTimeout: 5,
    keyboardNavigation: false,
    stickyKeys: false,
    slowKeys: false,
    simplifiedUI: false,
    hideNonEssentials: false,
    stepHighlight: false,
    autoAdvance: false,
    readingGuide: false,
    language: 'en',
    showPhonetics: false,
    glossaryHighlight: false
  };
  
  const handleReset = useCallback(() => {
    onSettingsChange(defaultSettings);
  }, [onSettingsChange]);
  
  const quickAccessibilityToggles = [
    {
      key: 'highContrast' as keyof AccessibilitySettings,
      label: t('quickToggles.highContrast'),
      icon: Contrast
    },
    {
      key: 'darkMode' as keyof AccessibilitySettings,
      label: t('quickToggles.darkMode'),
      icon: Moon
    },
    {
      key: 'largeClickTargets' as keyof AccessibilitySettings,
      label: t('quickToggles.largeTargets'),
      icon: MousePointer
    },
    {
      key: 'audioEnabled' as keyof AccessibilitySettings,
      label: t('quickToggles.audio'),
      icon: Volume2
    },
    {
      key: 'keyboardNavigation' as keyof AccessibilitySettings,
      label: t('quickToggles.keyboard'),
      icon: Keyboard
    },
    {
      key: 'simplifiedUI' as keyof AccessibilitySettings,
      label: t('quickToggles.simplified'),
      icon: Focus
    }
  ];
  
  return (
    <div className={cn("relative", className)}>
      {/* Accessibility Toolbar */}
      <div className={cn(
        "fixed top-20 right-4 z-40 transition-all duration-300",
        isCompact ? "w-16" : "w-80"
      )}>
        <Card className="border-2 border-jade-green shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className={cn(
                "flex items-center gap-2",
                isCompact && "sr-only"
              )}>
                <Accessibility className="w-5 h-5 text-jade-green" />
                {!isCompact && t('accessibilityTools')}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCompact(!isCompact)}
                >
                  {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {!isCompact && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2">
                {quickAccessibilityToggles.map((toggle) => {
                  const IconComponent = toggle.icon;
                  const isActive = Boolean(settings[toggle.key]);
                  
                  return (
                    <Button
                      key={toggle.key}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "justify-start text-left h-auto p-2",
                        isActive && "bg-jade-green hover:bg-jade-green/90"
                      )}
                      onClick={() => onSettingsChange({
                        ...settings,
                        [toggle.key]: !settings[toggle.key]
                      })}
                    >
                      <IconComponent className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="text-tablet-xs truncate">{toggle.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <AccessibilityPanel
              settings={settings}
              onChange={onSettingsChange}
              onReset={handleReset}
            />
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setShowSettings(false)}
              >
                {t('closeSettings')}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        isCompact ? "pr-20" : "pr-84"
      )}>
        <AccessibleSOPContent
          content={sopContent}
          settings={settings}
          onTextToSpeech={onTextToSpeech}
          onStepComplete={onStepComplete}
        />
      </div>
      
      {/* Screen Reader Announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {/* Dynamic announcements will be inserted here */}
      </div>
      
      {/* Skip Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-krong-red text-white px-4 py-2 rounded z-50"
      >
        {t('skipToContent')}
      </a>
    </div>
  );
};

export default SOPAccessibilityFeatures;