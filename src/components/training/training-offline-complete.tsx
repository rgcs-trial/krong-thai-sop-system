/**
 * Complete Training Offline Capability Component
 * Comprehensive offline training system with advanced features
 * Features full offline mode, smart sync, conflict resolution,
 * progressive download, and seamless online/offline transitions
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Wifi,
  WifiOff,
  Download,
  Upload,
  Cloud,
  CloudOff,
  CloudDownload,
  CloudUpload,
  Database,
  HardDrive,
  Sync,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Storage,
  Trash2,
  Archive,
  FileText,
  Image,
  Video,
  Headphones,
  BookOpen,
  Users,
  Calendar,
  Timer,
  Signal,
  Smartphone,
  Monitor,
  Zap,
  Battery,
  BatteryLow,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  X,
  Check,
  Info,
  AlertTriangle,
  Star,
  Bookmark,
  BookmarkPlus,
  Flag,
  Tag,
  Layers,
  Package,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  Activity,
  Gauge,
  Globe,
  MapPin,
  Navigation,
  Compass,
  Route,
  Home,
  Building,
  Briefcase,
  GraduationCap,
  Search,
  Filter,
  Sort,
  List,
  Grid,
  Map,
  Calendar as CalendarIcon,
  MessageSquare,
  Bell,
  BellOff,
  Volume2,
  VolumeOff
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarContent, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

// Enhanced offline training interfaces
interface OfflineTrainingModule {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  
  // Content structure
  sections: OfflineSection[];
  assessments: OfflineAssessment[];
  resources: OfflineResource[];
  
  // Download management
  estimatedSize: number; // MB
  downloadedSize: number; // MB
  downloadProgress: number; // 0-100
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadPaused: boolean;
  downloadSpeed: number; // KB/s
  
  // Status and metadata
  lastUpdated: string;
  downloadedAt?: string;
  expiresAt?: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'failed' | 'outdated';
  version: number;
  
  // User interaction
  progress: number; // 0-100
  isCompleted: boolean;
  isPinned: boolean;
  isFavorite: boolean;
  isRequired: boolean;
  
  // Offline capabilities
  supportsOfflineMode: boolean;
  requiresInternetConnection: boolean;
  hasInteractiveElements: boolean;
  hasMultimediaContent: boolean;
  
  // Learning analytics
  averageCompletionTime: number; // minutes
  averageScore: number;
  completionRate: number;
  userRating: number;
  reviewCount: number;
  
  // Accessibility
  hasSubtitles: boolean;
  hasAudioDescription: boolean;
  supportedLanguages: string[];
  accessibilityFeatures: string[];
}

interface OfflineSection {
  id: string;
  moduleId: string;
  title: string;
  title_fr: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'interactive' | 'quiz' | 'simulation';
  content: string;
  content_fr: string;
  
  // Media content
  mediaUrls: string[];
  thumbnailUrl?: string;
  transcripts: { language: string; content: string }[];
  
  // Download status
  estimatedSize: number; // MB
  isDownloaded: boolean;
  downloadPriority: number; // 1-10
  
  // User progress
  isCompleted: boolean;
  timeSpent: number; // minutes
  lastAccessed?: string;
  bookmarks: number[]; // timestamps for video/audio
  notes: string;
  
  // Prerequisites
  prerequisites: string[]; // section IDs
  unlocked: boolean;
  
  // Interactive features
  interactions: InteractiveElement[];
  hasQuizzes: boolean;
  hasSimulations: boolean;
}

interface OfflineAssessment {
  id: string;
  moduleId: string;
  title: string;
  title_fr: string;
  type: 'quiz' | 'practical' | 'simulation' | 'final_exam';
  questions: OfflineQuestion[];
  
  // Assessment settings
  timeLimit?: number; // minutes
  passingScore: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  showResults: boolean;
  
  // User progress
  attempts: AssessmentAttempt[];
  bestScore?: number;
  isCompleted: boolean;
  isPassed: boolean;
  
  // Offline capability
  isDownloaded: boolean;
  requiresOnlineValidation: boolean;
}

interface OfflineQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'matching' | 'drag_drop';
  question: string;
  question_fr: string;
  options?: string[];
  options_fr?: string[];
  correctAnswer: string;
  explanation?: string;
  explanation_fr?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  
  // Media attachments
  mediaUrls: string[];
  isDownloaded: boolean;
}

interface OfflineResource {
  id: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'link' | 'tool';
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  url: string;
  size: number; // bytes
  isDownloaded: boolean;
  isRequired: boolean;
  category: string;
}

interface InteractiveElement {
  id: string;
  type: 'hotspot' | 'simulation' | 'drag_drop' | 'timeline' | 'calculator';
  data: Record<string, any>;
  isDownloaded: boolean;
  requiresInternet: boolean;
}

interface AssessmentAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  score?: number;
  responses: QuestionResponse[];
  timeSpent: number;
  syncStatus: 'pending' | 'synced' | 'failed';
}

interface QuestionResponse {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  timestamp: string;
}

interface OfflineProgress {
  moduleId: string;
  sectionId?: string;
  userId: string;
  progress: number;
  completed: boolean;
  timeSpent: number;
  score?: number;
  responses?: Record<string, any>;
  notes?: string;
  bookmarks?: number[];
  completedAt?: string;
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict';
  lastModified: string;
  version: number;
}

interface SyncConflict {
  id: string;
  type: 'progress' | 'assessment' | 'notes' | 'bookmarks';
  description: string;
  localData: any;
  serverData: any;
  timestamp: string;
  resolution?: 'use_local' | 'use_server' | 'merge' | 'manual';
}

interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
  isStable: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

interface StorageInfo {
  totalSpace: number; // MB
  usedSpace: number; // MB
  availableSpace: number; // MB
  trainingDataSize: number; // MB
  cacheSize: number; // MB
  mediaSize: number; // MB
  maxAllowedSize: number; // MB
  warningThreshold: number; // MB
  criticalThreshold: number; // MB
}

interface OfflineSettings {
  // Download preferences
  autoDownload: boolean;
  downloadOnWifi: boolean;
  downloadOnCellular: boolean;
  smartDownload: boolean; // AI-powered download prioritization
  progressiveDownload: boolean; // Download sections as needed
  
  // Storage management
  maxStorageSize: number; // MB
  cacheExpiration: number; // days
  autoCleanup: boolean;
  cleanupFrequency: 'daily' | 'weekly' | 'monthly';
  
  // Sync preferences
  backgroundSync: boolean;
  syncInterval: number; // minutes
  conflictResolution: 'ask' | 'prefer_local' | 'prefer_server' | 'auto_merge';
  
  // Performance optimization
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  imageQuality: 'low' | 'medium' | 'high' | 'original';
  videoQuality: '360p' | '720p' | '1080p' | 'original';
  prefetchNextSections: boolean;
  adaptiveStreaming: boolean;
  
  // User experience
  offlineIndicator: boolean;
  downloadProgress: boolean;
  lowDataMode: boolean;
  batteryOptimization: boolean;
  accessibilityMode: boolean;
  
  // Security
  encryptOfflineData: boolean;
  autoLockTimeout: number; // minutes
  biometricUnlock: boolean;
  deviceRegistration: boolean;
}

interface DownloadJob {
  id: string;
  moduleId: string;
  type: 'full' | 'section' | 'media' | 'assessment';
  priority: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  downloadSpeed: number;
  eta: number; // seconds
  retryCount: number;
  error?: string;
}

interface OfflineCapabilityProps {
  className?: string;
  userId?: string;
  moduleId?: string;
  onModuleSelect?: (moduleId: string) => void;
  onSettingsChange?: (settings: OfflineSettings) => void;
  onSyncComplete?: (results: any) => void;
}

const DEFAULT_SETTINGS: OfflineSettings = {
  autoDownload: true,
  downloadOnWifi: true,
  downloadOnCellular: false,
  smartDownload: true,
  progressiveDownload: true,
  maxStorageSize: 2048, // 2GB
  cacheExpiration: 30,
  autoCleanup: true,
  cleanupFrequency: 'weekly',
  backgroundSync: true,
  syncInterval: 15,
  conflictResolution: 'ask',
  compressionLevel: 'medium',
  imageQuality: 'medium',
  videoQuality: '720p',
  prefetchNextSections: true,
  adaptiveStreaming: true,
  offlineIndicator: true,
  downloadProgress: true,
  lowDataMode: false,
  batteryOptimization: true,
  accessibilityMode: false,
  encryptOfflineData: true,
  autoLockTimeout: 30,
  biometricUnlock: false,
  deviceRegistration: true
};

export function TrainingOfflineComplete({
  className,
  userId = 'current-user',
  moduleId,
  onModuleSelect,
  onSettingsChange,
  onSyncComplete
}: OfflineCapabilityProps) {
  const { t, locale } = useI18n();
  
  // Core state
  const [offlineModules, setOfflineModules] = useState<OfflineTrainingModule[]>([]);
  const [offlineProgress, setOfflineProgress] = useState<OfflineProgress[]>([]);
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([]);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  
  // Network and storage
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false,
    isStable: true,
    quality: 'offline'
  });
  
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    totalSpace: 0,
    usedSpace: 0,
    availableSpace: 0,
    trainingDataSize: 0,
    cacheSize: 0,
    mediaSize: 0,
    maxAllowedSize: 2048,
    warningThreshold: 1800,
    criticalThreshold: 1900
  });
  
  const [settings, setSettings] = useState<OfflineSettings>(DEFAULT_SETTINGS);
  
  // UI state
  const [activeTab, setActiveTab] = useState('available');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'progress' | 'priority' | 'updated'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'downloaded' | 'downloading' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showSettings, setShowSettings] = useState(false);
  const [showDownloadManager, setShowDownloadManager] = useState(false);
  const [showSyncManager, setShowSyncManager] = useState(false);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  
  // Refs
  const dbRef = useRef<IDBDatabase | null>(null);
  const syncWorkerRef = useRef<Worker | null>(null);
  const downloadManagerRef = useRef<any>(null);
  const networkMonitorRef = useRef<any>(null);

  // Mock data for demonstration
  const mockModules: OfflineTrainingModule[] = useMemo(() => [
    {
      id: 'mod-1',
      title: 'Food Safety Fundamentals',
      title_fr: 'Principes de base de la sécurité alimentaire',
      description: 'Complete guide to food safety practices and regulations',
      description_fr: 'Guide complet des pratiques et réglementations de sécurité alimentaire',
      category: 'Compliance',
      priority: 'critical',
      difficulty: 'beginner',
      sections: [],
      assessments: [],
      resources: [],
      estimatedSize: 125,
      downloadedSize: 125,
      downloadProgress: 100,
      isDownloaded: true,
      isDownloading: false,
      downloadPaused: false,
      downloadSpeed: 0,
      lastUpdated: '2024-01-25T10:00:00Z',
      downloadedAt: '2024-01-20T14:30:00Z',
      expiresAt: '2024-03-20T14:30:00Z',
      syncStatus: 'synced',
      version: 2,
      progress: 45,
      isCompleted: false,
      isPinned: true,
      isFavorite: true,
      isRequired: true,
      supportsOfflineMode: true,
      requiresInternetConnection: false,
      hasInteractiveElements: true,
      hasMultimediaContent: true,
      averageCompletionTime: 240,
      averageScore: 87,
      completionRate: 92,
      userRating: 4.6,
      reviewCount: 156,
      hasSubtitles: true,
      hasAudioDescription: false,
      supportedLanguages: ['en', 'fr', 'th'],
      accessibilityFeatures: ['subtitles', 'high_contrast', 'keyboard_navigation']
    },
    {
      id: 'mod-2',
      title: 'Customer Service Excellence',
      title_fr: 'Excellence du service client',
      description: 'Advanced customer service techniques and best practices',
      description_fr: 'Techniques avancées de service client et meilleures pratiques',
      category: 'Skills',
      priority: 'high',
      difficulty: 'intermediate',
      sections: [],
      assessments: [],
      resources: [],
      estimatedSize: 89,
      downloadedSize: 0,
      downloadProgress: 0,
      isDownloaded: false,
      isDownloading: false,
      downloadPaused: false,
      downloadSpeed: 0,
      lastUpdated: '2024-01-28T15:00:00Z',
      syncStatus: 'pending',
      version: 1,
      progress: 0,
      isCompleted: false,
      isPinned: false,
      isFavorite: false,
      isRequired: false,
      supportsOfflineMode: true,
      requiresInternetConnection: false,
      hasInteractiveElements: true,
      hasMultimediaContent: true,
      averageCompletionTime: 180,
      averageScore: 82,
      completionRate: 78,
      userRating: 4.2,
      reviewCount: 98,
      hasSubtitles: true,
      hasAudioDescription: true,
      supportedLanguages: ['en', 'fr'],
      accessibilityFeatures: ['subtitles', 'audio_description', 'keyboard_navigation']
    },
    {
      id: 'mod-3',
      title: 'Kitchen Operations Mastery',
      title_fr: 'Maîtrise des opérations de cuisine',
      description: 'Comprehensive kitchen management and operations',
      description_fr: 'Gestion complète et opérations de cuisine',
      category: 'Operational',
      priority: 'medium',
      difficulty: 'advanced',
      sections: [],
      assessments: [],
      resources: [],
      estimatedSize: 234,
      downloadedSize: 117,
      downloadProgress: 50,
      isDownloaded: false,
      isDownloading: true,
      downloadPaused: false,
      downloadSpeed: 850, // KB/s
      lastUpdated: '2024-01-30T09:00:00Z',
      syncStatus: 'pending',
      version: 3,
      progress: 15,
      isCompleted: false,
      isPinned: true,
      isFavorite: false,
      isRequired: true,
      supportsOfflineMode: true,
      requiresInternetConnection: false,
      hasInteractiveElements: true,
      hasMultimediaContent: true,
      averageCompletionTime: 320,
      averageScore: 91,
      completionRate: 85,
      userRating: 4.8,
      reviewCount: 134,
      hasSubtitles: true,
      hasAudioDescription: false,
      supportedLanguages: ['en', 'fr', 'th'],
      accessibilityFeatures: ['subtitles', 'high_contrast', 'keyboard_navigation', 'slow_motion']
    }
  ], []);

  // Initialize offline system
  useEffect(() => {
    const initializeOfflineSystem = async () => {
      try {
        await initializeDatabase();
        await initializeNetworkMonitoring();
        await initializeStorageMonitoring();
        await loadOfflineData();
        startBackgroundServices();
      } catch (error) {
        console.error('Failed to initialize offline system:', error);
        toast({
          title: t('error.initialization_failed'),
          description: t('error.offline_system_init_failed'),
          variant: 'destructive',
        });
      }
    };

    initializeOfflineSystem();
    
    return () => {
      cleanupBackgroundServices();
    };
  }, []);

  // Initialize IndexedDB
  const initializeDatabase = async () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('KrongThaiTrainingOffline', 3);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        dbRef.current = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Training modules store
        if (!db.objectStoreNames.contains('modules')) {
          const moduleStore = db.createObjectStore('modules', { keyPath: 'id' });
          moduleStore.createIndex('category', 'category', { unique: false });
          moduleStore.createIndex('priority', 'priority', { unique: false });
          moduleStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
          moduleStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
        
        // Sections store
        if (!db.objectStoreNames.contains('sections')) {
          const sectionStore = db.createObjectStore('sections', { keyPath: 'id' });
          sectionStore.createIndex('moduleId', 'moduleId', { unique: false });
          sectionStore.createIndex('type', 'type', { unique: false });
        }
        
        // Progress store
        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', { keyPath: ['moduleId', 'sectionId', 'userId'] });
          progressStore.createIndex('moduleId', 'moduleId', { unique: false });
          progressStore.createIndex('userId', 'userId', { unique: false });
          progressStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }
        
        // Assessments store
        if (!db.objectStoreNames.contains('assessments')) {
          const assessmentStore = db.createObjectStore('assessments', { keyPath: 'id' });
          assessmentStore.createIndex('moduleId', 'moduleId', { unique: false });
          assessmentStore.createIndex('type', 'type', { unique: false });
        }
        
        // Media cache store
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'url' });
          mediaStore.createIndex('size', 'size', { unique: false });
          mediaStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          mediaStore.createIndex('moduleId', 'moduleId', { unique: false });
        }
        
        // Download jobs store
        if (!db.objectStoreNames.contains('downloadJobs')) {
          const jobStore = db.createObjectStore('downloadJobs', { keyPath: 'id' });
          jobStore.createIndex('status', 'status', { unique: false });
          jobStore.createIndex('priority', 'priority', { unique: false });
        }
        
        // Sync conflicts store
        if (!db.objectStoreNames.contains('syncConflicts')) {
          const conflictStore = db.createObjectStore('syncConflicts', { keyPath: 'id' });
          conflictStore.createIndex('type', 'type', { unique: false });
          conflictStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  };

  // Initialize network monitoring
  const initializeNetworkMonitoring = async () => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      const newStatus: NetworkStatus = {
        isOnline: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false,
        isStable: true, // TODO: Implement stability detection
        quality: getConnectionQuality(navigator.onLine, connection?.effectiveType, connection?.downlink)
      };
      
      setNetworkStatus(newStatus);
      
      // Handle online/offline transitions
      if (newStatus.isOnline && !networkStatus.isOnline) {
        handleOnlineTransition();
      } else if (!newStatus.isOnline && networkStatus.isOnline) {
        handleOfflineTransition();
      }
    };
    
    updateNetworkStatus();
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }
    
    // Periodic connection quality check
    networkMonitorRef.current = setInterval(() => {
      if (navigator.onLine) {
        checkConnectionStability();
      }
    }, 30000); // Check every 30 seconds
  };

  // Get connection quality
  const getConnectionQuality = (
    isOnline: boolean, 
    effectiveType: string, 
    downlink: number
  ): NetworkStatus['quality'] => {
    if (!isOnline) return 'offline';
    
    if (effectiveType === '4g' && downlink > 2) return 'excellent';
    if (effectiveType === '4g' && downlink > 1) return 'good';
    if (effectiveType === '3g' || (effectiveType === '4g' && downlink > 0.5)) return 'fair';
    return 'poor';
  };

  // Check connection stability
  const checkConnectionStability = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const responseTime = Date.now() - startTime;
      
      const isStable = response.ok && responseTime < 3000;
      
      setNetworkStatus(prev => ({ ...prev, isStable }));
    } catch (error) {
      setNetworkStatus(prev => ({ ...prev, isStable: false }));
    }
  };

  // Handle online transition
  const handleOnlineTransition = () => {
    setIsOfflineMode(false);
    
    toast({
      title: t('training.back_online'),
      description: t('training.back_online_desc'),
    });
    
    // Auto-start sync if enabled
    if (settings.backgroundSync) {
      setTimeout(() => {
        syncOfflineData();
      }, 2000);
    }
  };

  // Handle offline transition
  const handleOfflineTransition = () => {
    setIsOfflineMode(true);
    
    toast({
      title: t('training.now_offline'),
      description: t('training.now_offline_desc'),
      variant: 'destructive',
    });
    
    // Pause active downloads
    pauseAllDownloads();
  };

  // Initialize storage monitoring
  const initializeStorageMonitoring = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        
        const storageData = await calculateDetailedStorageUsage();
        
        setStorageInfo({
          totalSpace: Math.round(quota / 1024 / 1024),
          usedSpace: Math.round(usage / 1024 / 1024),
          availableSpace: Math.round((quota - usage) / 1024 / 1024),
          trainingDataSize: storageData.trainingData,
          cacheSize: storageData.cache,
          mediaSize: storageData.media,
          maxAllowedSize: settings.maxStorageSize,
          warningThreshold: settings.maxStorageSize * 0.8,
          criticalThreshold: settings.maxStorageSize * 0.9
        });
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
  };

  // Calculate detailed storage usage
  const calculateDetailedStorageUsage = async () => {
    if (!dbRef.current) return { trainingData: 0, cache: 0, media: 0 };
    
    let trainingData = 0;
    let cache = 0;
    let media = 0;
    
    try {
      // Calculate training data size
      const moduleTransaction = dbRef.current.transaction(['modules'], 'readonly');
      const moduleStore = moduleTransaction.objectStore('modules');
      const moduleRequest = moduleStore.getAll();
      
      moduleRequest.onsuccess = () => {
        const modules = moduleRequest.result as OfflineTrainingModule[];
        trainingData = modules.reduce((sum, module) => sum + module.downloadedSize, 0);
      };
      
      // Calculate media cache size  
      const mediaTransaction = dbRef.current.transaction(['media'], 'readonly');
      const mediaStore = mediaTransaction.objectStore('media');
      const mediaRequest = mediaStore.getAll();
      
      mediaRequest.onsuccess = () => {
        const mediaFiles = mediaRequest.result;
        media = mediaFiles.reduce((sum: number, file: any) => sum + (file.size || 0), 0) / 1024 / 1024;
      };
      
      // Calculate cache size (temporary data, thumbnails, etc.)
      cache = 25; // Estimated app cache size
      
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
    }
    
    return { trainingData, cache, media };
  };

  // Load offline data
  const loadOfflineData = async () => {
    try {
      // Load modules from storage or use mock data
      setOfflineModules(mockModules);
      
      // Generate mock progress data
      const mockProgress: OfflineProgress[] = mockModules.map(module => ({
        moduleId: module.id,
        userId,
        progress: module.progress,
        completed: module.isCompleted,
        timeSpent: Math.floor(Math.random() * 120),
        syncStatus: module.syncStatus as any,
        lastModified: new Date().toISOString(),
        version: 1
      }));
      
      setOfflineProgress(mockProgress);
      
      // Generate mock download jobs
      const activeJobs: DownloadJob[] = mockModules
        .filter(m => m.isDownloading)
        .map(m => ({
          id: `job-${m.id}`,
          moduleId: m.id,
          type: 'full',
          priority: m.priority === 'critical' ? 10 : m.priority === 'high' ? 8 : 5,
          status: 'downloading',
          progress: m.downloadProgress,
          downloadedBytes: m.downloadedSize * 1024 * 1024,
          totalBytes: m.estimatedSize * 1024 * 1024,
          downloadSpeed: m.downloadSpeed,
          eta: Math.floor((m.estimatedSize - m.downloadedSize) * 1024 / Math.max(m.downloadSpeed, 1)),
          retryCount: 0
        }));
      
      setDownloadJobs(activeJobs);
      
    } catch (error) {
      console.error('Failed to load offline data:', error);
      toast({
        title: t('error.load_failed'),
        description: t('error.offline_data_load_failed'),
        variant: 'destructive',
      });
    }
  };

  // Start background services
  const startBackgroundServices = () => {
    // Start sync worker if background sync is enabled
    if (settings.backgroundSync && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registered:', registration);
      }).catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }
  };

  // Cleanup background services
  const cleanupBackgroundServices = () => {
    if (networkMonitorRef.current) {
      clearInterval(networkMonitorRef.current);
    }
    
    if (syncWorkerRef.current) {
      syncWorkerRef.current.terminate();
    }
  };

  // Download module
  const downloadModule = useCallback(async (moduleId: string, priority: number = 5) => {
    const module = offlineModules.find(m => m.id === moduleId);
    if (!module || module.isDownloaded || module.isDownloading) return;
    
    // Check storage space
    if (storageInfo.availableSpace < module.estimatedSize) {
      toast({
        title: t('training.insufficient_storage'),
        description: t('training.insufficient_storage_desc'),
        variant: 'destructive',
      });
      return;
    }
    
    // Check network conditions
    if (!networkStatus.isOnline) {
      toast({
        title: t('training.offline_mode'),
        description: t('training.cannot_download_offline'),
        variant: 'destructive',
      });
      return;
    }
    
    if (networkStatus.connectionType === 'cellular' && !settings.downloadOnCellular) {
      toast({
        title: t('training.cellular_download_disabled'),
        description: t('training.enable_cellular_download'),
        variant: 'destructive',
      });
      return;
    }
    
    // Create download job
    const job: DownloadJob = {
      id: `job-${moduleId}-${Date.now()}`,
      moduleId,
      type: 'full',
      priority,
      status: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: module.estimatedSize * 1024 * 1024,
      downloadSpeed: 0,
      eta: 0,
      retryCount: 0
    };
    
    setDownloadJobs(prev => [...prev, job]);
    
    // Update module status
    setOfflineModules(prev => prev.map(m => 
      m.id === moduleId 
        ? { ...m, isDownloading: true, downloadProgress: 0, downloadedSize: 0 }
        : m
    ));
    
    // Simulate download progress
    simulateDownload(job);
    
    toast({
      title: t('training.download_started'),
      description: t('training.download_started_desc', { title: module.title }),
    });
  }, [offlineModules, storageInfo, networkStatus, settings, t]);

  // Simulate download progress
  const simulateDownload = async (job: DownloadJob) => {
    const module = offlineModules.find(m => m.id === job.moduleId);
    if (!module) return;
    
    const updateInterval = 500; // ms
    const totalTime = 10000 + Math.random() * 20000; // 10-30 seconds
    const incrementsPerSecond = 1000 / updateInterval;
    const totalIncrements = totalTime / updateInterval;
    const progressPerIncrement = 100 / totalIncrements;
    
    let currentProgress = 0;
    let currentBytes = 0;
    const speed = job.totalBytes / (totalTime / 1000); // bytes per second
    
    const interval = setInterval(() => {
      currentProgress = Math.min(100, currentProgress + progressPerIncrement);
      currentBytes = Math.floor((currentProgress / 100) * job.totalBytes);
      
      // Update job
      setDownloadJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              progress: currentProgress,
              downloadedBytes: currentBytes,
              downloadSpeed: speed / 1024, // KB/s
              eta: Math.floor((job.totalBytes - currentBytes) / speed)
            }
          : j
      ));
      
      // Update module
      setOfflineModules(prev => prev.map(m => 
        m.id === job.moduleId 
          ? { 
              ...m, 
              downloadProgress: currentProgress,
              downloadedSize: currentBytes / 1024 / 1024,
              downloadSpeed: speed / 1024
            }
          : m
      ));
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        completeDownload(job);
      }
    }, updateInterval);
  };

  // Complete download
  const completeDownload = async (job: DownloadJob) => {
    const module = offlineModules.find(m => m.id === job.moduleId);
    if (!module) return;
    
    // Update job status
    setDownloadJobs(prev => prev.map(j => 
      j.id === job.id ? { ...j, status: 'completed', progress: 100 } : j
    ));
    
    // Update module status
    setOfflineModules(prev => prev.map(m => 
      m.id === job.moduleId 
        ? { 
            ...m, 
            isDownloaded: true,
            isDownloading: false,
            downloadProgress: 100,
            downloadedSize: m.estimatedSize,
            downloadedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + settings.cacheExpiration * 24 * 60 * 60 * 1000).toISOString()
          }
        : m
    ));
    
    // Save to IndexedDB
    if (dbRef.current) {
      const transaction = dbRef.current.transaction(['modules'], 'readwrite');
      const store = transaction.objectStore('modules');
      
      const updatedModule = {
        ...module,
        isDownloaded: true,
        isDownloading: false,
        downloadProgress: 100,
        downloadedSize: module.estimatedSize,
        downloadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + settings.cacheExpiration * 24 * 60 * 60 * 1000).toISOString()
      };
      
      store.put(updatedModule);
    }
    
    toast({
      title: t('training.download_complete'),
      description: t('training.module_available_offline', { title: module.title }),
    });
    
    // Remove completed job after a delay
    setTimeout(() => {
      setDownloadJobs(prev => prev.filter(j => j.id !== job.id));
    }, 3000);
  };

  // Pause all downloads
  const pauseAllDownloads = () => {
    setDownloadJobs(prev => prev.map(job => 
      job.status === 'downloading' ? { ...job, status: 'paused' } : job
    ));
    
    setOfflineModules(prev => prev.map(m => 
      m.isDownloading ? { ...m, downloadPaused: true } : m
    ));
  };

  // Resume downloads
  const resumeDownloads = () => {
    if (!networkStatus.isOnline) return;
    
    setDownloadJobs(prev => prev.map(job => 
      job.status === 'paused' ? { ...job, status: 'downloading' } : job
    ));
    
    setOfflineModules(prev => prev.map(m => 
      m.downloadPaused ? { ...m, downloadPaused: false } : m
    ));
  };

  // Sync offline data
  const syncOfflineData = useCallback(async () => {
    if (!networkStatus.isOnline || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const pendingProgress = offlineProgress.filter(p => p.syncStatus === 'pending');
      
      if (pendingProgress.length === 0) {
        setLastSyncTime(new Date());
        return;
      }
      
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for conflicts
      const conflicts: SyncConflict[] = [];
      
      // For demo purposes, create a mock conflict
      if (Math.random() < 0.2) { // 20% chance of conflict
        conflicts.push({
          id: `conflict-${Date.now()}`,
          type: 'progress',
          description: t('training.sync_conflict_desc'),
          localData: { progress: 45, timeSpent: 120 },
          serverData: { progress: 52, timeSpent: 98 },
          timestamp: new Date().toISOString()
        });
      }
      
      if (conflicts.length > 0) {
        setSyncConflicts(conflicts);
        setShowConflictResolver(true);
      } else {
        // Update sync status
        setOfflineProgress(prev => prev.map(p => 
          pendingProgress.some(pp => 
            pp.moduleId === p.moduleId && 
            pp.userId === p.userId
          ) ? { ...p, syncStatus: 'synced' } : p
        ));
        
        setLastSyncTime(new Date());
        
        toast({
          title: t('training.sync_complete'),
          description: t('training.progress_synced', { count: pendingProgress.length }),
        });
      }
      
      onSyncComplete?.({ synced: pendingProgress.length, conflicts: conflicts.length });
      
    } catch (error) {
      console.error('Sync failed:', error);
      
      toast({
        title: t('training.sync_failed'),
        description: t('training.sync_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [networkStatus.isOnline, isSyncing, offlineProgress, onSyncComplete, t]);

  // Remove offline module
  const removeOfflineModule = async (moduleId: string) => {
    if (!dbRef.current) return;
    
    try {
      const transaction = dbRef.current.transaction(['modules', 'media', 'sections', 'assessments'], 'readwrite');
      
      // Remove module
      transaction.objectStore('modules').delete(moduleId);
      
      // Remove associated data
      const mediaStore = transaction.objectStore('media');
      const mediaIndex = mediaStore.index('moduleId');
      mediaIndex.openCursor(IDBKeyRange.only(moduleId)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      // Update state
      setOfflineModules(prev => prev.filter(m => m.id !== moduleId));
      
      toast({
        title: t('training.module_removed'),
        description: t('training.module_removed_desc'),
      });
      
      // Update storage info
      await initializeStorageMonitoring();
      
    } catch (error) {
      console.error('Failed to remove module:', error);
      toast({
        title: t('error.remove_failed'),
        description: t('error.module_remove_failed'),
        variant: 'destructive',
      });
    }
  };

  // Filter and sort modules
  const filteredAndSortedModules = useMemo(() => {
    let filtered = offlineModules;
    
    // Apply filters
    if (filterBy !== 'all') {
      filtered = filtered.filter(module => {
        switch (filterBy) {
          case 'downloaded':
            return module.isDownloaded;
          case 'downloading':
            return module.isDownloading;
          case 'pending':
            return !module.isDownloaded && !module.isDownloading;
          default:
            return true;
        }
      });
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(module => 
        module.title.toLowerCase().includes(query) ||
        module.title_fr.toLowerCase().includes(query) ||
        module.description.toLowerCase().includes(query) ||
        module.category.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'size':
          return b.estimatedSize - a.estimatedSize;
        case 'progress':
          return b.progress - a.progress;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'updated':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [offlineModules, filterBy, searchQuery, sortBy]);

  // Get connection status icon and color
  const getConnectionStatusIcon = () => {
    if (isOfflineMode || !networkStatus.isOnline) {
      return { icon: WifiOff, color: 'text-red-500' };
    }
    
    switch (networkStatus.quality) {
      case 'excellent':
        return { icon: Wifi, color: 'text-green-500' };
      case 'good':
        return { icon: Wifi, color: 'text-green-400' };
      case 'fair':
        return { icon: Wifi, color: 'text-yellow-500' };
      case 'poor':
        return { icon: Wifi, color: 'text-orange-500' };
      default:
        return { icon: WifiOff, color: 'text-red-500' };
    }
  };

  // Render module card
  const renderModuleCard = (module: OfflineTrainingModule) => {
    const progressColor = module.progress >= 80 ? 'bg-green-500' : 
                         module.progress >= 50 ? 'bg-blue-500' : 
                         module.progress >= 20 ? 'bg-yellow-500' : 'bg-gray-300';
    
    return (
      <Card 
        key={module.id}
        className={cn(
          "relative overflow-hidden transition-all duration-200 hover:shadow-lg",
          selectedModules.has(module.id) && "ring-2 ring-krong-red",
          module.isRequired && "border-l-4 border-l-orange-500",
          viewMode === 'compact' && "p-2"
        )}
      >
        {/* Priority indicator */}
        <div className={cn(
          "absolute top-2 right-2 w-3 h-3 rounded-full",
          module.priority === 'critical' ? 'bg-red-500' :
          module.priority === 'high' ? 'bg-orange-500' :
          module.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
        )} />
        
        <CardContent className={cn("p-4", viewMode === 'compact' && "p-3")}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <Checkbox
                checked={selectedModules.has(module.id)}
                onCheckedChange={(checked) => {
                  const newSelected = new Set(selectedModules);
                  if (checked) {
                    newSelected.add(module.id);
                  } else {
                    newSelected.delete(module.id);
                  }
                  setSelectedModules(newSelected);
                }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className={cn(
                    "font-semibold truncate",
                    viewMode === 'compact' ? "text-sm" : "text-base"
                  )}>
                    {locale === 'fr' ? module.title_fr : module.title}
                  </h3>
                  
                  {module.isPinned && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                  {module.isFavorite && <Heart className="w-4 h-4 text-red-500 fill-current" />}
                  {module.isRequired && <Flag className="w-4 h-4 text-orange-500" />}
                </div>
                
                <p className={cn(
                  "text-muted-foreground mb-2 line-clamp-2",
                  viewMode === 'compact' ? "text-xs" : "text-sm"
                )}>
                  {locale === 'fr' ? module.description_fr : module.description}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center space-x-1">
                    <Package className="w-3 h-3" />
                    <span>{module.estimatedSize}MB</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <GraduationCap className="w-3 h-3" />
                    <span>{t(`training.difficulty_${module.difficulty}`)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Activity className="w-3 h-3" />
                    <span>{Math.round(module.progress)}% {t('training.complete')}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>{module.userRating.toFixed(1)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">
                {module.isDownloaded ? t('training.learning_progress') : t('training.download_progress')}
              </span>
              <span className="text-xs text-muted-foreground">
                {module.isDownloaded ? `${Math.round(module.progress)}%` : `${Math.round(module.downloadProgress)}%`}
              </span>
            </div>
            <Progress 
              value={module.isDownloaded ? module.progress : module.downloadProgress} 
              className="h-2"
            />
          </div>
          
          {/* Download/Status info */}
          {module.isDownloading && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-blue-700">{t('training.downloading')}</span>
                </div>
                <span className="text-blue-600">
                  {(module.downloadSpeed / 1024).toFixed(1)} MB/s
                </span>
              </div>
            </div>
          )}
          
          {module.isDownloaded && (
            <div className="mb-3 p-2 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span>{t('training.available_offline')}</span>
                {module.expiresAt && (
                  <span className="text-xs">
                    • {t('training.expires')} {new Date(module.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Sync status */}
          {module.syncStatus !== 'synced' && (
            <div className={cn(
              "mb-3 p-2 rounded-lg text-sm flex items-center space-x-2",
              module.syncStatus === 'pending' ? 'bg-yellow-50 text-yellow-700' :
              module.syncStatus === 'conflict' ? 'bg-red-50 text-red-700' :
              module.syncStatus === 'failed' ? 'bg-red-50 text-red-700' :
              'bg-orange-50 text-orange-700'
            )}>
              {module.syncStatus === 'pending' && <Clock className="w-4 h-4" />}
              {module.syncStatus === 'conflict' && <AlertTriangle className="w-4 h-4" />}
              {module.syncStatus === 'failed' && <XCircle className="w-4 h-4" />}
              {module.syncStatus === 'outdated' && <RefreshCw className="w-4 h-4" />}
              <span>{t(`training.sync_status_${module.syncStatus}`)}</span>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {module.isDownloaded ? (
                <Button 
                  size="sm" 
                  onClick={() => onModuleSelect?.(module.id)}
                  className="bg-krong-red hover:bg-krong-red/90"
                >
                  <Play className="w-4 h-4 mr-1" />
                  {t('training.start')}
                </Button>
              ) : module.isDownloading ? (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    // Pause/resume download logic
                  }}
                >
                  {module.downloadPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      {t('training.resume')}
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      {t('training.pause')}
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadModule(module.id)}
                  disabled={!networkStatus.isOnline}
                >
                  <Download className="w-4 h-4 mr-1" />
                  {t('training.download')}
                </Button>
              )}
              
              <Button size="sm" variant="ghost">
                <BookmarkPlus className="w-4 h-4" />
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Info className="w-4 h-4 mr-2" />
                  {t('training.details')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('training.share')}
                </DropdownMenuItem>
                {module.isDownloaded && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => removeOfflineModule(module.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('training.remove_offline')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <CloudDownload className="w-8 h-8 mr-3 text-krong-red" />
            {t('training.offline_training')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('training.offline_training_complete_desc')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {(() => {
              const { icon: Icon, color } = getConnectionStatusIcon();
              return (
                <>
                  <Icon className={cn('w-5 h-5', color)} />
                  <span className={cn('text-sm font-medium', color)}>
                    {isOfflineMode ? t('training.offline_mode') : 
                     networkStatus.quality === 'offline' ? t('training.offline') :
                     t(`training.connection_${networkStatus.quality}`)}
                  </span>
                </>
              );
            })()}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDownloadManager(true)}
            disabled={downloadJobs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('training.downloads')} ({downloadJobs.filter(j => j.status === 'downloading').length})
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSyncManager(true)}
            disabled={offlineProgress.filter(p => p.syncStatus === 'pending').length === 0}
          >
            <Sync className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
            {t('training.sync')} ({offlineProgress.filter(p => p.syncStatus === 'pending').length})
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            {t('common.settings')}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.offline_modules')}</p>
                <div className="text-2xl font-bold">
                  {offlineModules.filter(m => m.isDownloaded).length}
                </div>
              </div>
              <CloudDownload className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.active_downloads')}</p>
                <div className="text-2xl font-bold">
                  {downloadJobs.filter(j => j.status === 'downloading').length}
                </div>
              </div>
              <Download className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.storage_used')}</p>
                <div className="text-2xl font-bold">
                  {storageInfo.trainingDataSize} MB
                </div>
              </div>
              <HardDrive className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.pending_sync')}</p>
                <div className="text-2xl font-bold">
                  {offlineProgress.filter(p => p.syncStatus === 'pending').length}
                </div>
              </div>
              <Sync className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('training.search_modules')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('training.all_modules')}</SelectItem>
              <SelectItem value="downloaded">{t('training.downloaded')}</SelectItem>
              <SelectItem value="downloading">{t('training.downloading')}</SelectItem>
              <SelectItem value="pending">{t('training.pending')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t('training.sort_name')}</SelectItem>
              <SelectItem value="size">{t('training.sort_size')}</SelectItem>
              <SelectItem value="progress">{t('training.sort_progress')}</SelectItem>
              <SelectItem value="priority">{t('training.sort_priority')}</SelectItem>
              <SelectItem value="updated">{t('training.sort_updated')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'compact' ? 'default' : 'outline'}
            onClick={() => setViewMode('compact')}
          >
            <Layers className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Module Grid */}
      <div className={cn(
        "grid gap-4",
        viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        viewMode === 'list' ? 'grid-cols-1' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      )}>
        {filteredAndSortedModules.map(renderModuleCard)}
      </div>
      
      {filteredAndSortedModules.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <CloudOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('training.no_modules_found')}</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterBy !== 'all' 
                ? t('training.try_different_filters') 
                : t('training.no_offline_modules_desc')
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedModules.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border rounded-lg shadow-lg p-4 flex items-center space-x-3">
          <span className="text-sm font-medium">
            {selectedModules.size} {t('training.modules_selected')}
          </span>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t('training.download_selected')}
          </Button>
          <Button size="sm" variant="outline">
            <Trash2 className="w-4 h-4 mr-2" />
            {t('training.remove_selected')}
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setSelectedModules(new Set())}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Settings Dialog - Placeholder */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              {t('training.offline_settings')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center py-8">
              <Settings className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('training.advanced_settings')}</h3>
              <p className="text-muted-foreground">
                {t('training.settings_coming_soon')}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Manager Dialog - Placeholder */}
      <Dialog open={showDownloadManager} onOpenChange={setShowDownloadManager}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Download className="w-5 h-5 mr-2" />
              {t('training.download_manager')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center py-8">
              <Download className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('training.download_manager')}</h3>
              <p className="text-muted-foreground">
                {t('training.download_manager_coming_soon')}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadManager(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TrainingOfflineComplete;