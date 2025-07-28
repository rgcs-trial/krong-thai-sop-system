/**
 * Mobile Training Optimization for Restaurant Tablets
 * Tablet-first training interface optimized for restaurant environments
 * Features touch-friendly interactions, landscape/portrait support,
 * one-handed operation, and restaurant-specific workflows
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateScreenIcon,
  Smartphone,
  Tablet,
  Monitor,
  ZoomIn,
  ZoomOut,
  Hand,
  Fingerprint,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Timer,
  Clock,
  Users,
  Settings,
  Home,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  X,
  Check,
  Star,
  Award,
  Target,
  BookOpen,
  Headphones,
  Mic,
  Camera,
  Image,
  Video,
  FileText,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  HelpCircle,
  Search,
  Filter,
  Menu,
  Grid,
  List,
  Layout,
  Layers,
  Move,
  RotateCcw,
  Share2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Flag
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

interface MobileOptimizationSettings {
  // Device orientation and layout
  preferredOrientation: 'landscape' | 'portrait' | 'auto';
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  buttonSize: 'small' | 'medium' | 'large' | 'extra-large';
  touchTargetSize: number; // Minimum 44px for accessibility
  
  // Interaction preferences
  oneHandedMode: boolean;
  gestureNavigation: boolean;
  swipeActions: boolean;
  pinchZoom: boolean;
  doubleTapAction: 'zoom' | 'next' | 'bookmark' | 'none';
  
  // Visual optimization
  brightness: number;
  textScale: number;
  iconScale: number;
  highContrast: boolean;
  darkMode: boolean;
  reducedMotion: boolean;
  
  // Audio and media
  autoPlay: boolean;
  mediaControls: 'minimal' | 'full' | 'floating';
  volumeBoost: boolean;
  subtitles: boolean;
  
  // Restaurant-specific
  quickAccess: string[]; // IDs of frequently accessed training modules
  shiftMode: 'prep' | 'service' | 'cleanup' | 'closing';
  waterResistantMode: boolean; // Prevent accidental touches
  gloveMode: boolean; // Enhanced touch sensitivity
  noiseReduction: boolean; // For noisy kitchen environments
}

interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'pinch' | 'rotate';
  action: string;
  description: string;
  enabled: boolean;
}

interface DeviceCapabilities {
  screenSize: { width: number; height: number };
  pixelRatio: number;
  orientation: 'landscape' | 'portrait';
  touchSupport: boolean;
  batteryLevel?: number;
  networkStatus: 'online' | 'offline' | 'slow';
  brightness?: number;
  isTablet: boolean;
  isMobile: boolean;
}

interface TrainingModule {
  id: string;
  title: string;
  title_fr: string;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  sections: TrainingSection[];
  progress: number;
  completed: boolean;
  bookmarked: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface TrainingSection {
  id: string;
  type: 'text' | 'video' | 'audio' | 'interactive' | 'quiz';
  title: string;
  content: string;
  mediaUrl?: string;
  duration?: number;
  completed: boolean;
}

interface MobileTrainingOptimizationProps {
  className?: string;
  trainingModules?: TrainingModule[];
  currentModule?: TrainingModule;
  onModuleSelect?: (moduleId: string) => void;
  onSectionComplete?: (sectionId: string) => void;
  onSettingsChange?: (settings: MobileOptimizationSettings) => void;
}

const DEFAULT_SETTINGS: MobileOptimizationSettings = {
  preferredOrientation: 'auto',
  layoutDensity: 'comfortable',
  buttonSize: 'large',
  touchTargetSize: 48,
  oneHandedMode: false,
  gestureNavigation: true,
  swipeActions: true,
  pinchZoom: true,
  doubleTapAction: 'zoom',
  brightness: 0.8,
  textScale: 1.0,
  iconScale: 1.0,
  highContrast: false,
  darkMode: false,
  reducedMotion: false,
  autoPlay: false,
  mediaControls: 'full',
  volumeBoost: false,
  subtitles: false,
  quickAccess: [],
  shiftMode: 'service',
  waterResistantMode: false,
  gloveMode: false,
  noiseReduction: false
};

const TOUCH_GESTURES: TouchGesture[] = [
  {
    type: 'tap',
    action: 'Select/Activate',
    description: 'Single tap to select or activate elements',
    enabled: true
  },
  {
    type: 'double-tap',
    action: 'Zoom/Quick Action',
    description: 'Double tap to zoom or perform quick action',
    enabled: true
  },
  {
    type: 'long-press',
    action: 'Context Menu',
    description: 'Long press to show context menu',
    enabled: true
  },
  {
    type: 'swipe-left',
    action: 'Next Section',
    description: 'Swipe left to go to next section',
    enabled: true
  },
  {
    type: 'swipe-right',
    action: 'Previous Section',
    description: 'Swipe right to go to previous section',
    enabled: true
  },
  {
    type: 'swipe-up',
    action: 'Scroll Up',
    description: 'Swipe up to scroll content up',
    enabled: true
  },
  {
    type: 'swipe-down',
    action: 'Scroll Down/Refresh',
    description: 'Swipe down to scroll or refresh content',
    enabled: true
  },
  {
    type: 'pinch',
    action: 'Zoom In/Out',
    description: 'Pinch to zoom in or out of content',
    enabled: true
  }
];

export function MobileTrainingOptimization({
  className,
  trainingModules = [],
  currentModule,
  onModuleSelect,
  onSectionComplete,
  onSettingsChange
}: MobileTrainingOptimizationProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [settings, setSettings] = useState<MobileOptimizationSettings>(DEFAULT_SETTINGS);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities>({
    screenSize: { width: 0, height: 0 },
    pixelRatio: 1,
    orientation: 'landscape',
    touchSupport: false,
    networkStatus: 'online',
    isTablet: false,
    isMobile: false
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showGestureHelp, setShowGestureHelp] = useState(false);
  const [currentSection, setCurrentSection] = useState<TrainingSection | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [gestureType, setGestureType] = useState<string | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Detect device capabilities
  useEffect(() => {
    const updateDeviceCapabilities = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isTablet = screenWidth >= 768 && screenWidth <= 1024;
      const isMobile = screenWidth < 768;
      
      setDeviceCapabilities({
        screenSize: { width: screenWidth, height: screenHeight },
        pixelRatio: window.devicePixelRatio || 1,
        orientation: screenWidth > screenHeight ? 'landscape' : 'portrait',
        touchSupport: 'ontouchstart' in window,
        networkStatus: navigator.onLine ? 'online' : 'offline',
        isTablet,
        isMobile,
        batteryLevel: (navigator as any).getBattery ? undefined : 0.8 // Fallback
      });
    };
    
    updateDeviceCapabilities();
    window.addEventListener('resize', updateDeviceCapabilities);
    window.addEventListener('orientationchange', updateDeviceCapabilities);
    
    // Battery API (if supported)
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setDeviceCapabilities(prev => ({
            ...prev,
            batteryLevel: battery.level
          }));
        };
        
        battery.addEventListener('levelchange', updateBattery);
        updateBattery();
      });
    }
    
    return () => {
      window.removeEventListener('resize', updateDeviceCapabilities);
      window.removeEventListener('orientationchange', updateDeviceCapabilities);
    };
  }, []);
  
  // Apply mobile optimization settings
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Apply text and icon scaling
    container.style.setProperty('--text-scale', settings.textScale.toString());
    container.style.setProperty('--icon-scale', settings.iconScale.toString());
    container.style.setProperty('--touch-target-size', `${settings.touchTargetSize}px`);
    
    // Apply theme settings
    container.classList.toggle('dark-mode', settings.darkMode);
    container.classList.toggle('high-contrast', settings.highContrast);
    container.classList.toggle('reduced-motion', settings.reducedMotion);
    container.classList.toggle('one-handed-mode', settings.oneHandedMode);
    container.classList.toggle('water-resistant', settings.waterResistantMode);
    container.classList.toggle('glove-mode', settings.gloveMode);
    
    // Apply layout density
    container.classList.remove('compact', 'comfortable', 'spacious');
    container.classList.add(settings.layoutDensity);
    
    // Apply button size
    container.classList.remove('btn-small', 'btn-medium', 'btn-large', 'btn-extra-large');
    container.classList.add(`btn-${settings.buttonSize}`);
    
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);
  
  // Touch gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!settings.gestureNavigation || settings.waterResistantMode) return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    setTouchStartTime(Date.now());
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    
    // Long press detection
    gestureTimeoutRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        handleGesture('long-press');
      }
    }, 500);
  }, [settings.gestureNavigation, settings.waterResistantMode]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !settings.gestureNavigation) return;
    
    // Clear long press timeout on move
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Detect swipe gestures
    if (distance > 50) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      if (Math.abs(angle) < 45) {
        handleGesture('swipe-right');
      } else if (Math.abs(angle) > 135) {
        handleGesture('swipe-left');
      } else if (angle > 45 && angle < 135) {
        handleGesture('swipe-down');
      } else if (angle < -45 && angle > -135) {
        handleGesture('swipe-up');
      }
    }
  }, [settings.gestureNavigation]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    // Clear long press timeout
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }
    
    const touchDuration = Date.now() - touchStartRef.current.time;
    
    // Detect tap or double tap
    if (touchDuration < 200) {
      // Check for double tap
      const timeSinceLastTap = Date.now() - touchStartTime;
      if (timeSinceLastTap < 300) {
        handleGesture('double-tap');
      } else {
        setTimeout(() => {
          if (Date.now() - touchStartTime > 250) {
            handleGesture('tap');
          }
        }, 250);
      }
    }
    
    touchStartRef.current = null;
    setIsGestureActive(false);
    setGestureType(null);
  }, [touchStartTime]);
  
  // Handle gestures
  const handleGesture = (gesture: string) => {
    const gestureConfig = TOUCH_GESTURES.find(g => g.type === gesture);
    if (!gestureConfig?.enabled) return;
    
    setIsGestureActive(true);
    setGestureType(gesture);
    
    switch (gesture) {
      case 'swipe-left':
        if (settings.swipeActions) {
          handleNextSection();
        }
        break;
      case 'swipe-right':
        if (settings.swipeActions) {
          handlePreviousSection();
        }
        break;
      case 'double-tap':
        if (settings.doubleTapAction === 'zoom') {
          handleZoom();
        } else if (settings.doubleTapAction === 'next') {
          handleNextSection();
        }
        break;
      case 'long-press':
        // Show context menu or section options
        break;
      case 'pinch':
        if (settings.pinchZoom) {
          // Handle pinch zoom
        }
        break;
    }
    
    // Visual feedback
    if (containerRef.current) {
      containerRef.current.classList.add('gesture-active');
      setTimeout(() => {
        containerRef.current?.classList.remove('gesture-active');
      }, 200);
    }
  };
  
  // Navigation handlers
  const handleNextSection = () => {
    if (!currentModule || !currentSection) return;
    
    const currentIndex = currentModule.sections.findIndex(s => s.id === currentSection.id);
    const nextSection = currentModule.sections[currentIndex + 1];
    
    if (nextSection) {
      setCurrentSection(nextSection);
      toast({
        title: t('training.next_section'),
        description: nextSection.title,
      });
    } else {
      toast({
        title: t('training.module_complete'),
        description: t('training.congratulations'),
      });
    }
  };
  
  const handlePreviousSection = () => {
    if (!currentModule || !currentSection) return;
    
    const currentIndex = currentModule.sections.findIndex(s => s.id === currentSection.id);
    const previousSection = currentModule.sections[currentIndex - 1];
    
    if (previousSection) {
      setCurrentSection(previousSection);
      toast({
        title: t('training.previous_section'),
        description: previousSection.title,
      });
    }
  };
  
  // Zoom handlers
  const handleZoom = () => {
    setZoomLevel(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1);
  };
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };
  
  // Fullscreen handlers
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Settings update
  const updateSetting = <K extends keyof MobileOptimizationSettings>(
    key: K,
    value: MobileOptimizationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  // Render mobile-optimized header
  const renderMobileHeader = () => (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.history.back()}
            className="touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate">
              {currentModule?.title || t('training.training')}
            </h1>
            {currentSection && (
              <p className="text-xs text-muted-foreground truncate">
                {currentSection.title}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Battery indicator */}
          {deviceCapabilities.batteryLevel !== undefined && (
            <div className="flex items-center space-x-1">
              {deviceCapabilities.batteryLevel < 0.2 ? (
                <BatteryLow className="w-4 h-4 text-red-500" />
              ) : (
                <Battery className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {Math.round(deviceCapabilities.batteryLevel * 100)}%
              </span>
            </div>
          )}
          
          {/* Network status */}
          <div className="flex items-center">
            {deviceCapabilities.networkStatus === 'online' ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
          
          {/* Settings menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="touch-target">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-2" />
                {t('common.settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGestureHelp(true)}>
                <Hand className="w-4 h-4 mr-2" />
                {t('training.gesture_help')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 mr-2" />
                    {t('training.exit_fullscreen')}
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 mr-2" />
                    {t('training.fullscreen')}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                {t('training.share')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Flag className="w-4 h-4 mr-2" />
                {t('training.report_issue')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Progress indicator */}
      {currentModule && (
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{t('training.progress')}</span>
            <span>{Math.round(currentModule.progress)}%</span>
          </div>
          <Progress value={currentModule.progress} className="h-1" />
        </div>
      )}
    </div>
  );
  
  // Render mobile-optimized content
  const renderMobileContent = () => (
    <div 
      className="flex-1 overflow-hidden"
      style={{ 
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top left'
      }}
    >
      {currentSection ? (
        <div className="p-4 space-y-4" data-training-content>
          {/* Section header */}
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-xs">
              {t(`training.section_type_${currentSection.type}`)}
            </Badge>
            <h2 className="text-lg font-semibold">
              {currentSection.title}
            </h2>
            {currentSection.duration && (
              <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{currentSection.duration}m</span>
              </div>
            )}
          </div>
          
          {/* Section content */}
          <div className="space-y-4">
            {currentSection.type === 'text' && (
              <div className="prose prose-sm max-w-none">
                <p className="text-base leading-relaxed">
                  {currentSection.content}
                </p>
              </div>
            )}
            
            {currentSection.type === 'video' && currentSection.mediaUrl && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={currentSection.mediaUrl}
                  controls={settings.mediaControls !== 'minimal'}
                  autoPlay={settings.autoPlay}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {currentSection.type === 'audio' && currentSection.mediaUrl && (
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Headphones className="w-8 h-8 text-muted-foreground" />
                  <div className="flex-1">
                    <h4 className="font-medium">{t('training.audio_content')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {currentSection.duration}m audio
                    </p>
                  </div>
                </div>
                <audio
                  src={currentSection.mediaUrl}
                  controls
                  className="w-full mt-3"
                  autoPlay={settings.autoPlay}
                />
              </div>
            )}
            
            {currentSection.type === 'interactive' && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 text-center">
                <Target className="w-12 h-12 mx-auto text-blue-500 mb-3" />
                <h4 className="font-semibold mb-2">{t('training.interactive_content')}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('training.tap_to_interact')}
                </p>
                <Button>
                  {t('training.start_interaction')}
                </Button>
              </div>
            )}
            
            {currentSection.type === 'quiz' && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 text-center">
                <FileText className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <h4 className="font-semibold mb-2">{t('training.knowledge_check')}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('training.test_your_knowledge')}
                </p>
                <Button>
                  {t('training.start_quiz')}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">{t('training.select_module')}</h3>
            <p className="text-muted-foreground">
              {t('training.choose_training_module')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
  
  // Render mobile navigation
  const renderMobileNavigation = () => (
    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t p-3">
      <div className="flex items-center justify-between">
        <Button
          size="lg"
          variant="outline"
          onClick={handlePreviousSection}
          disabled={!currentModule || !currentSection}
          className="touch-target"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('common.previous')}
        </Button>
        
        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="touch-target"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-sm font-medium px-2">
            {Math.round(zoomLevel * 100)}%
          </span>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="touch-target"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          size="lg"
          onClick={handleNextSection}
          disabled={!currentModule || !currentSection}
          className="touch-target"
        >
          {t('common.next')}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
      
      {/* Section completion button */}
      {currentSection && !currentSection.completed && (
        <div className="mt-3">
          <Button
            size="lg"
            className="w-full touch-target"
            onClick={() => {
              if (currentSection) {
                onSectionComplete?.(currentSection.id);
                // Update section as completed
                setCurrentSection(prev => prev ? { ...prev, completed: true } : null);
                
                toast({
                  title: t('training.section_completed'),
                  description: t('training.great_job'),
                });
              }
            }}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {t('training.mark_complete')}
          </Button>
        </div>
      )}
    </div>
  );
  
  // Render settings dialog
  const renderSettingsDialog = () => (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Smartphone className="w-5 h-5 mr-2" />
            {t('training.mobile_settings')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Touch and Gestures */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('training.touch_gestures')}</h4>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('training.gesture_navigation')}</span>
              <Switch
                checked={settings.gestureNavigation}
                onCheckedChange={(checked) => updateSetting('gestureNavigation', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('training.swipe_actions')}</span>
              <Switch
                checked={settings.swipeActions}
                onCheckedChange={(checked) => updateSetting('swipeActions', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('training.pinch_zoom')}</span>
              <Switch
                checked={settings.pinchZoom}
                onCheckedChange={(checked) => updateSetting('pinchZoom', checked)}
              />
            </div>
          </div>
          
          {/* Visual Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('training.visual_settings')}</h4>
            
            <div>
              <label className="text-sm font-medium">
                {t('training.text_size')}: {settings.textScale}x
              </label>
              <Slider
                value={[settings.textScale]}
                onValueChange={([value]) => updateSetting('textScale', value)}
                min={0.8}
                max={2.0}
                step={0.1}
                className="mt-2"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">
                {t('training.button_size')}
              </label>
              <Select 
                value={settings.buttonSize} 
                onValueChange={(value: any) => updateSetting('buttonSize', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t('training.small')}</SelectItem>
                  <SelectItem value="medium">{t('training.medium')}</SelectItem>
                  <SelectItem value="large">{t('training.large')}</SelectItem>
                  <SelectItem value="extra-large">{t('training.extra_large')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('training.dark_mode')}</span>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => updateSetting('darkMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('training.high_contrast')}</span>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>
          </div>
          
          {/* Restaurant-specific */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('training.restaurant_mode')}</h4>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('training.water_resistant')}</span>
              <Switch
                checked={settings.waterResistantMode}
                onCheckedChange={(checked) => updateSetting('waterResistantMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('training.glove_mode')}</span>
              <Switch
                checked={settings.gloveMode}
                onCheckedChange={(checked) => updateSetting('gloveMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('training.one_handed')}</span>
              <Switch
                checked={settings.oneHandedMode}
                onCheckedChange={(checked) => updateSetting('oneHandedMode', checked)}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
  
  // Render gesture help dialog
  const renderGestureHelp = () => (
    <Dialog open={showGestureHelp} onOpenChange={setShowGestureHelp}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Hand className="w-5 h-5 mr-2" />
            {t('training.gesture_help')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {TOUCH_GESTURES.filter(g => g.enabled).map((gesture) => (
            <div key={gesture.type} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
              <div className="p-2 bg-krong-red/10 rounded-lg">
                <Fingerprint className="w-4 h-4 text-krong-red" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-sm">{gesture.action}</h5>
                <p className="text-xs text-muted-foreground mt-1">
                  {gesture.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        'flex flex-col h-screen bg-background mobile-optimized',
        settings.layoutDensity,
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile header */}
      {renderMobileHeader()}
      
      {/* Main content */}
      <div ref={contentRef} className="flex-1 overflow-hidden">
        {renderMobileContent()}
      </div>
      
      {/* Mobile navigation */}
      {renderMobileNavigation()}
      
      {/* Settings dialog */}
      {renderSettingsDialog()}
      
      {/* Gesture help dialog */}
      {renderGestureHelp()}
      
      {/* Gesture feedback */}
      {isGestureActive && gestureType && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-black/75 text-white px-4 py-2 rounded-lg">
            {t(`training.gesture_${gestureType}`)}
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileTrainingOptimization;