'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  Download,
  Share2,
  Bookmark,
  BookmarkCheck,
  Clock,
  Users,
  Star,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  FastForward,
  Rewind,
  MonitorSpeaker,
  Languages,
  Zap,
  CheckCircle
} from 'lucide-react';

interface VideoChapter {
  id: string;
  title: string;
  title_fr: string;
  startTime: number; // in seconds
  endTime: number;
  description?: string;
  description_fr?: string;
  thumbnail?: string;
  keyPoints?: string[];
  isCompleted?: boolean;
}

interface VideoSubtitle {
  id: string;
  language: 'en' | 'fr';
  label: string;
  src: string; // VTT file URL
  isDefault?: boolean;
}

interface VideoQuality {
  id: string;
  label: string;
  height: number;
  src: string;
  bitrate?: number;
}

interface VideoTutorial {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  duration: number; // in seconds
  thumbnail: string;
  videoSources: VideoQuality[];
  subtitles?: VideoSubtitle[];
  chapters?: VideoChapter[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  instructor?: {
    name: string;
    avatar?: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  rating?: number;
  isBookmarked?: boolean;
}

interface VideoTutorialPlayerProps {
  /** Video tutorial data */
  tutorial: VideoTutorial;
  /** Auto-play video */
  autoPlay?: boolean;
  /** Show video controls */
  showControls?: boolean;
  /** Enable fullscreen */
  allowFullscreen?: boolean;
  /** Show chapters sidebar */
  showChapters?: boolean;
  /** Show progress tracking */
  showProgress?: boolean;
  /** Enable bookmarking */
  enableBookmarking?: boolean;
  /** Enable sharing */
  enableSharing?: boolean;
  /** Enable comments */
  enableComments?: boolean;
  /** Playback speed options */
  playbackSpeeds?: number[];
  /** Initial playback speed */
  initialSpeed?: number;
  /** Initial quality */
  initialQuality?: string;
  /** Initial volume (0-1) */
  initialVolume?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when video starts */
  onVideoStart?: (tutorialId: string) => void;
  /** Callback when video ends */
  onVideoEnd?: (tutorialId: string, watchTime: number) => void;
  /** Callback when chapter is completed */
  onChapterComplete?: (tutorialId: string, chapterId: string) => void;
  /** Callback when video is bookmarked */
  onBookmark?: (tutorialId: string, isBookmarked: boolean) => void;
  /** Callback when video is shared */
  onShare?: (tutorialId: string) => void;
  /** Callback when progress is updated */
  onProgressUpdate?: (tutorialId: string, currentTime: number, duration: number) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * VideoTutorialPlayer - Advanced video player for SOP training content
 * 
 * Features:
 * - Multi-quality video streaming with adaptive bitrate
 * - Chapter-based navigation with progress tracking
 * - Multilingual subtitles with EN/FR support
 * - Fullscreen support with tablet optimization
 * - Playback speed control and seeking
 * - Progress tracking and completion status
 * - Bookmarking and sharing functionality
 * - Interactive chapters with key points
 * - Accessibility support with keyboard controls
 * - Responsive design for tablet interfaces
 * 
 * @param props VideoTutorialPlayerProps
 * @returns JSX.Element
 */
const VideoTutorialPlayer: React.FC<VideoTutorialPlayerProps> = ({
  tutorial,
  autoPlay = false,
  showControls = true,
  allowFullscreen = true,
  showChapters = true,
  showProgress = true,
  enableBookmarking = true,
  enableSharing = true,
  enableComments = false,
  playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2],
  initialSpeed = 1,
  initialQuality = 'auto',
  initialVolume = 0.8,
  isLoading = false,
  onVideoStart,
  onVideoEnd,
  onChapterComplete,
  onBookmark,
  onShare,
  onProgressUpdate,
  className
}) => {
  const t = useTranslations('sop.videoTutorial');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(initialSpeed);
  const [currentQuality, setCurrentQuality] = useState(initialQuality);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<string>('');
  
  // UI state
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'chapters' | 'info' | 'comments'>('chapters');
  const [currentChapter, setCurrentChapter] = useState<VideoChapter | null>(null);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [isBookmarked, setIsBookmarked] = useState(tutorial.isBookmarked || false);
  const [watchStartTime, setWatchStartTime] = useState<number>(Date.now());
  
  // Control visibility timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update current chapter based on time
  const updateCurrentChapter = useCallback((time: number) => {
    if (!tutorial.chapters) return;
    
    const chapter = tutorial.chapters.find(
      ch => time >= ch.startTime && time < ch.endTime
    );
    
    if (chapter && chapter.id !== currentChapter?.id) {
      setCurrentChapter(chapter);
      
      // Mark previous chapter as completed if we moved past it
      if (currentChapter && time >= currentChapter.endTime) {
        setCompletedChapters(prev => new Set([...prev, currentChapter.id]));
        onChapterComplete?.(tutorial.id, currentChapter.id);
      }
    }
  }, [tutorial.chapters, currentChapter, onChapterComplete, tutorial.id]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    updateCurrentChapter(time);
    onProgressUpdate?.(tutorial.id, time, duration);
  }, [updateCurrentChapter, onProgressUpdate, tutorial.id, duration]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    
    const videoDuration = videoRef.current.duration;
    setDuration(videoDuration);
    
    // Set initial quality
    if (initialQuality !== 'auto') {
      const quality = tutorial.videoSources.find(q => q.id === initialQuality);
      if (quality && videoRef.current.src !== quality.src) {
        const currentTime = videoRef.current.currentTime;
        videoRef.current.src = quality.src;
        videoRef.current.currentTime = currentTime;
      }
    }
    
    // Set initial subtitle track
    if (tutorial.subtitles && tutorial.subtitles.length > 0) {
      const defaultTrack = tutorial.subtitles.find(sub => sub.isDefault);
      if (defaultTrack) {
        setCurrentSubtitleTrack(defaultTrack.id);
      }
    }
  }, [initialQuality, tutorial.videoSources, tutorial.subtitles]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    if (!watchStartTime) {
      setWatchStartTime(Date.now());
      onVideoStart?.(tutorial.id);
    }
  }, [watchStartTime, onVideoStart, tutorial.id]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    const totalWatchTime = Date.now() - watchStartTime;
    onVideoEnd?.(tutorial.id, totalWatchTime);
    
    // Mark last chapter as completed
    if (currentChapter) {
      setCompletedChapters(prev => new Set([...prev, currentChapter.id]));
      onChapterComplete?.(tutorial.id, currentChapter.id);
    }
  }, [watchStartTime, onVideoEnd, tutorial.id, currentChapter, onChapterComplete]);

  // Control functions
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const skipForward = useCallback(() => {
    seekTo(currentTime + 10);
  }, [currentTime, seekTo]);

  const skipBackward = useCallback(() => {
    seekTo(currentTime - 10);
  }, [currentTime, seekTo]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const changeVolume = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    
    const vol = Math.max(0, Math.min(1, newVolume));
    videoRef.current.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const changeQuality = useCallback((qualityId: string) => {
    if (!videoRef.current) return;
    
    const quality = tutorial.videoSources.find(q => q.id === qualityId);
    if (!quality) return;
    
    const currentTime = videoRef.current.currentTime;
    const wasPlaying = isPlaying;
    
    videoRef.current.src = quality.src;
    videoRef.current.currentTime = currentTime;
    
    if (wasPlaying) {
      videoRef.current.play();
    }
    
    setCurrentQuality(qualityId);
  }, [tutorial.videoSources, isPlaying]);

  const jumpToChapter = useCallback((chapter: VideoChapter) => {
    seekTo(chapter.startTime);
    setCurrentChapter(chapter);
  }, [seekTo]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  const toggleBookmark = useCallback(() => {
    const newBookmarked = !isBookmarked;
    setIsBookmarked(newBookmarked);
    onBookmark?.(tutorial.id, newBookmarked);
  }, [isBookmarked, onBookmark, tutorial.id]);

  const shareVideo = useCallback(() => {
    onShare?.(tutorial.id);
    
    // Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: tutorial.title,
        text: tutorial.description,
        url: window.location.href
      });
    }
  }, [onShare, tutorial.id, tutorial.title, tutorial.description]);

  // Hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    setShowControlsOverlay(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControlsOverlay(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!showControls) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(volume - 0.1);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          if (allowFullscreen) toggleFullscreen();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay, skipBackward, skipForward, changeVolume, volume, toggleMute, toggleFullscreen, allowFullscreen, showControls]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Mouse movement handler for controls
  useEffect(() => {
    const handleMouseMove = () => {
      if (showControls) {
        resetControlsTimeout();
      }
    };
    
    if (containerRef.current) {
      containerRef.current.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, resetControlsTimeout]);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="aspect-video bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-black rounded-lg overflow-hidden",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
    >
      {/* Video Container */}
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          autoPlay={autoPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          crossOrigin="anonymous"
        >
          {/* Video sources */}
          {tutorial.videoSources.map(source => (
            <source key={source.id} src={source.src} type="video/mp4" />
          ))}
          
          {/* Subtitle tracks */}
          {tutorial.subtitles?.map(subtitle => (
            <track
              key={subtitle.id}
              kind="subtitles"
              src={subtitle.src}
              srcLang={subtitle.language}
              label={subtitle.label}
              default={subtitle.isDefault}
            />
          ))}
        </video>

        {/* Controls Overlay */}
        {showControls && showControlsOverlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <h3 className="text-white text-tablet-lg font-heading font-semibold">
                  {tutorial.title}
                </h3>
                <Badge variant="outline" className="text-white border-white/30">
                  {tutorial.difficulty}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                {enableBookmarking && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleBookmark}
                    className="text-white hover:bg-white/20"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-5 h-5" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </Button>
                )}
                
                {enableSharing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={shareVideo}
                    className="text-white hover:bg-white/20"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Center Play Button */}
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
            </div>

            {/* Bottom Controls */}
            <div className="p-4 space-y-3">
              {/* Progress Bar */}
              <div className="space-y-1">
                <Slider
                  value={[currentTime]}
                  onValueChange={([value]) => seekTo(value)}
                  max={duration}
                  step={1}
                  className="w-full"
                />
                
                {/* Chapter Markers */}
                {tutorial.chapters && (
                  <div className="relative h-1">
                    {tutorial.chapters.map(chapter => (
                      <div
                        key={chapter.id}
                        className={cn(
                          "absolute top-0 w-1 h-1 rounded-full cursor-pointer",
                          completedChapters.has(chapter.id) ? "bg-jade-green" : "bg-white/50"
                        )}
                        style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                        onClick={() => jumpToChapter(chapter)}
                        title={chapter.title}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Control Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={skipBackward}
                    className="text-white hover:bg-white/20"
                  >
                    <Rewind className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={skipForward}
                    className="text-white hover:bg-white/20"
                  >
                    <FastForward className="w-4 h-4" />
                  </Button>
                  
                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      onValueChange={([value]) => changeVolume(value)}
                      max={1}
                      step={0.1}
                      className="w-16"
                    />
                  </div>
                  
                  {/* Time Display */}
                  <span className="text-white text-tablet-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Speed Control */}
                  <Badge variant="outline" className="text-white border-white/30 text-tablet-xs">
                    {playbackRate}x
                  </Badge>
                  
                  {/* Subtitles Toggle */}
                  {tutorial.subtitles && tutorial.subtitles.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowSubtitles(!showSubtitles)}
                      className={cn(
                        "text-white hover:bg-white/20",
                        showSubtitles && "bg-white/20"
                      )}
                    >
                      <Subtitles className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {/* Fullscreen Toggle */}
                  {allowFullscreen && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20"
                    >
                      {isFullscreen ? (
                        <Minimize className="w-4 h-4" />
                      ) : (
                        <Maximize className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <Card className="absolute top-16 right-4 w-64 bg-black/90 text-white border-white/20 z-10">
            <CardHeader className="pb-2">
              <CardTitle className="text-tablet-sm">{t('settings.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quality Selection */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('settings.quality')}</label>
                <div className="space-y-1">
                  {tutorial.videoSources.map(quality => (
                    <Button
                      key={quality.id}
                      variant={currentQuality === quality.id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => changeQuality(quality.id)}
                      className="w-full justify-start text-white"
                    >
                      {quality.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Speed Selection */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('settings.speed')}</label>
                <div className="grid grid-cols-3 gap-1">
                  {playbackSpeeds.map(speed => (
                    <Button
                      key={speed}
                      variant={playbackRate === speed ? "default" : "ghost"}
                      size="sm"
                      onClick={() => changePlaybackRate(speed)}
                      className="text-white text-tablet-xs"
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </div>

              {/* Subtitle Selection */}
              {tutorial.subtitles && tutorial.subtitles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('settings.subtitles')}</label>
                  <div className="space-y-1">
                    <Button
                      variant={!showSubtitles ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setShowSubtitles(false)}
                      className="w-full justify-start text-white"
                    >
                      {t('settings.subtitlesOff')}
                    </Button>
                    {tutorial.subtitles.map(subtitle => (
                      <Button
                        key={subtitle.id}
                        variant={currentSubtitleTrack === subtitle.id && showSubtitles ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          setCurrentSubtitleTrack(subtitle.id);
                          setShowSubtitles(true);
                        }}
                        className="w-full justify-start text-white"
                      >
                        {subtitle.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Panel */}
      {showChapters && !isFullscreen && (
        <div className="bg-krong-white border-t">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="chapters" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('tabs.chapters')}
                {tutorial.chapters && (
                  <Badge variant="secondary" className="text-xs">
                    {completedChapters.size}/{tutorial.chapters.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger value="info" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {t('tabs.info')}
              </TabsTrigger>
              
              {enableComments && (
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('tabs.comments')}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="chapters" className="mt-0">
              <ScrollArea className="h-64 p-4">
                {tutorial.chapters && tutorial.chapters.length > 0 ? (
                  <div className="space-y-3">
                    {tutorial.chapters.map((chapter, index) => (
                      <Card
                        key={chapter.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md",
                          currentChapter?.id === chapter.id && "border-krong-red bg-krong-red/5",
                          completedChapters.has(chapter.id) && "border-jade-green bg-jade-green/5"
                        )}
                        onClick={() => jumpToChapter(chapter)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {completedChapters.has(chapter.id) ? (
                                <CheckCircle className="w-5 h-5 text-jade-green" />
                              ) : currentChapter?.id === chapter.id ? (
                                <Play className="w-5 h-5 text-krong-red" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-tablet-sm font-medium truncate">
                                  {index + 1}. {chapter.title}
                                </h4>
                                <span className="text-tablet-xs text-muted-foreground font-mono">
                                  {formatTime(chapter.startTime)}
                                </span>
                              </div>
                              
                              {chapter.description && (
                                <p className="text-tablet-xs text-muted-foreground line-clamp-2">
                                  {chapter.description}
                                </p>
                              )}
                              
                              {chapter.keyPoints && chapter.keyPoints.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {chapter.keyPoints.slice(0, 3).map((point, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {point}
                                    </Badge>
                                  ))}
                                  {chapter.keyPoints.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{chapter.keyPoints.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-tablet-sm">{t('chapters.empty')}</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="info" className="mt-0">
              <ScrollArea className="h-64 p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-tablet-lg font-heading font-semibold mb-2">
                      {tutorial.title}
                    </h3>
                    <p className="text-tablet-sm text-muted-foreground leading-relaxed">
                      {tutorial.description}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{tutorial.category}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {tutorial.difficulty}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(tutorial.duration)}
                    </Badge>
                    {tutorial.rating && (
                      <Badge variant="outline">
                        <Star className="w-3 h-3 mr-1" />
                        {tutorial.rating}/5
                      </Badge>
                    )}
                  </div>

                  {tutorial.instructor && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-krong-red text-white flex items-center justify-center font-semibold">
                        {tutorial.instructor.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-tablet-sm font-medium">
                          {tutorial.instructor.name}
                        </p>
                        <p className="text-tablet-xs text-muted-foreground">
                          {tutorial.instructor.role}
                        </p>
                      </div>
                    </div>
                  )}

                  {tutorial.tags && tutorial.tags.length > 0 && (
                    <div>
                      <h4 className="text-tablet-sm font-medium mb-2">{t('info.tags')}</h4>
                      <div className="flex flex-wrap gap-1">
                        {tutorial.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {showProgress && (
                    <div>
                      <h4 className="text-tablet-sm font-medium mb-2">{t('info.progress')}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-tablet-sm">
                          <span>{t('info.watched')}</span>
                          <span>{Math.round((currentTime / duration) * 100)}%</span>
                        </div>
                        <Progress value={(currentTime / duration) * 100} className="h-2" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {enableComments && (
              <TabsContent value="comments" className="mt-0">
                <ScrollArea className="h-64 p-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-tablet-sm">{t('comments.comingSoon')}</p>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default VideoTutorialPlayer;