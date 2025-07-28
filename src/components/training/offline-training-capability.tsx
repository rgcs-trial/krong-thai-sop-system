/**
 * Offline Training Capability Manager
 * Comprehensive offline training support for network outages
 * Features content caching, offline sync, progress persistence,
 * and seamless online/offline transitions
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  SyncOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Pause,
  Play,
  RotateCcw,
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
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Smartphone,
  Monitor,
  Globe,
  MapPin,
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
  Briefcase,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  Activity,
  Gauge
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
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

interface OfflineTrainingModule {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedSize: number; // MB
  downloadedSize: number; // MB
  lastUpdated: string;
  downloadedAt?: string;
  expiresAt?: string;
  sections: OfflineSection[];
  progress: number;
  isDownloaded: boolean;
  isDownloading: boolean;
  isPinned: boolean;
  isExpired: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'failed';
}

interface OfflineSection {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'interactive' | 'quiz';
  title: string;
  content: string;
  mediaUrls: string[];
  estimatedSize: number;
  isDownloaded: boolean;
  lastAccessed?: string;
}

interface OfflineProgress {
  moduleId: string;
  sectionId: string;
  userId: string;
  progress: number;
  completed: boolean;
  timeSpent: number;
  score?: number;
  responses?: Record<string, any>;
  completedAt?: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  lastModified: string;
}

interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
}

interface StorageInfo {
  totalSpace: number; // MB
  usedSpace: number; // MB
  availableSpace: number; // MB
  trainingDataSize: number; // MB
  cacheSize: number; // MB
  maxAllowedSize: number; // MB
}

interface OfflineSettings {
  autoDownload: boolean;
  downloadOnWifi: boolean;
  downloadOnCellular: boolean;
  maxStorageSize: number; // MB
  cacheExpiration: number; // days
  syncInterval: number; // minutes
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  prefetchNextModules: boolean;
  backgroundSync: boolean;
  lowDataMode: boolean;
  batteryOptimization: boolean;
}

interface OfflineTrainingCapabilityProps {
  className?: string;
  userId?: string;
  onModuleSelect?: (moduleId: string) => void;
  onSettingsChange?: (settings: OfflineSettings) => void;
}

const DEFAULT_SETTINGS: OfflineSettings = {
  autoDownload: true,
  downloadOnWifi: true,
  downloadOnCellular: false,
  maxStorageSize: 1024, // 1GB
  cacheExpiration: 30, // 30 days
  syncInterval: 15, // 15 minutes
  compressionLevel: 'medium',
  prefetchNextModules: true,
  backgroundSync: true,
  lowDataMode: false,
  batteryOptimization: true
};

export function OfflineTrainingCapability({
  className,
  userId = 'current-user',
  onModuleSelect,
  onSettingsChange
}: OfflineTrainingCapabilityProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [offlineModules, setOfflineModules] = useState<OfflineTrainingModule[]>([]);
  const [offlineProgress, setOfflineProgress] = useState<OfflineProgress[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  });
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    totalSpace: 0,
    usedSpace: 0,
    availableSpace: 0,
    trainingDataSize: 0,
    cacheSize: 0,
    maxAllowedSize: 1024
  });
  const [settings, setSettings] = useState<OfflineSettings>(DEFAULT_SETTINGS);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [downloadQueue, setDownloadQueue] = useState<string[]>([]);
  const [syncQueue, setSyncQueue] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  
  // Refs
  const dbRef = useRef<IDBDatabase | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const downloadWorkerRef = useRef<Worker | null>(null);
  
  // Initialize offline capabilities
  useEffect(() => {
    initializeOfflineDatabase();
    initializeNetworkMonitoring();
    initializeStorageMonitoring();
    setupSyncInterval();
    loadOfflineModules();
    loadOfflineProgress();
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (downloadWorkerRef.current) {
        downloadWorkerRef.current.terminate();
      }
    };
  }, []);
  
  // Initialize IndexedDB for offline storage
  const initializeOfflineDatabase = async () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('KrongThaiTraining', 2);
      
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
        }
        
        // Progress store
        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', { keyPath: ['moduleId', 'sectionId', 'userId'] });
          progressStore.createIndex('moduleId', 'moduleId', { unique: false });
          progressStore.createIndex('userId', 'userId', { unique: false });
          progressStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }
        
        // Media cache store
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'url' });
          mediaStore.createIndex('size', 'size', { unique: false });
          mediaStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  };
  
  // Initialize network monitoring
  const initializeNetworkMonitoring = () => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false
      });
    };
    
    updateNetworkStatus();
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }
  };
  
  // Initialize storage monitoring
  const initializeStorageMonitoring = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        
        setStorageInfo(prev => ({
          ...prev,
          totalSpace: Math.round(quota / 1024 / 1024),
          usedSpace: Math.round(usage / 1024 / 1024),
          availableSpace: Math.round((quota - usage) / 1024 / 1024)
        }));
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
    
    // Calculate training data size
    calculateTrainingDataSize();
  };
  
  // Setup automatic sync interval
  const setupSyncInterval = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    if (settings.backgroundSync && settings.syncInterval > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (networkStatus.isOnline) {
          syncProgressData();
        }
      }, settings.syncInterval * 60 * 1000);
    }
  };
  
  // Load offline modules from IndexedDB
  const loadOfflineModules = async () => {
    if (!dbRef.current) return;
    
    const transaction = dbRef.current.transaction(['modules'], 'readonly');
    const store = transaction.objectStore('modules');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const modules = request.result as OfflineTrainingModule[];
      setOfflineModules(modules);
    };
  };
  
  // Load offline progress from IndexedDB
  const loadOfflineProgress = async () => {
    if (!dbRef.current) return;
    
    const transaction = dbRef.current.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const index = store.index('userId');
    const request = index.getAll(userId);
    
    request.onsuccess = () => {
      const progress = request.result as OfflineProgress[];
      setOfflineProgress(progress);
    };
  };
  
  // Calculate training data size
  const calculateTrainingDataSize = async () => {
    if (!dbRef.current) return;
    
    let totalSize = 0;
    let cacheSize = 0;
    
    // Calculate modules size
    const moduleTransaction = dbRef.current.transaction(['modules'], 'readonly');
    const moduleStore = moduleTransaction.objectStore('modules');
    const moduleRequest = moduleStore.getAll();
    
    moduleRequest.onsuccess = () => {
      const modules = moduleRequest.result as OfflineTrainingModule[];
      totalSize += modules.reduce((sum, module) => sum + module.downloadedSize, 0);
      
      // Calculate media cache size
      const mediaTransaction = dbRef.current!.transaction(['media'], 'readonly');
      const mediaStore = mediaTransaction.objectStore('media');
      const mediaRequest = mediaStore.getAll();
      
      mediaRequest.onsuccess = () => {
        const mediaFiles = mediaRequest.result;
        cacheSize = mediaFiles.reduce((sum: number, file: any) => sum + (file.size || 0), 0) / 1024 / 1024;
        
        setStorageInfo(prev => ({
          ...prev,
          trainingDataSize: totalSize,
          cacheSize: Math.round(cacheSize)
        }));
      };
    };
  };
  
  // Download training module for offline use
  const downloadModule = async (moduleId: string) => {
    const module = offlineModules.find(m => m.id === moduleId);
    if (!module || module.isDownloading || module.isDownloaded) return;
    
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
    
    // Start download
    setOfflineModules(prev => prev.map(m => 
      m.id === moduleId ? { ...m, isDownloading: true, downloadedSize: 0 } : m
    ));
    
    setDownloadQueue(prev => [...prev, moduleId]);
    
    try {
      // Simulate download process (in real implementation, this would fetch actual content)
      const downloadProgress = async () => {
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const downloadedSize = (module.estimatedSize * progress) / 100;
          setOfflineModules(prev => prev.map(m => 
            m.id === moduleId ? { ...m, downloadedSize } : m
          ));
        }
      };
      
      await downloadProgress();
      
      // Save to IndexedDB
      const transaction = dbRef.current!.transaction(['modules'], 'readwrite');
      const store = transaction.objectStore('modules');
      
      const updatedModule = {
        ...module,
        isDownloaded: true,
        isDownloading: false,
        downloadedSize: module.estimatedSize,
        downloadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + settings.cacheExpiration * 24 * 60 * 60 * 1000).toISOString()
      };
      
      store.put(updatedModule);
      
      setOfflineModules(prev => prev.map(m => 
        m.id === moduleId ? updatedModule : m
      ));
      
      toast({
        title: t('training.download_complete'),
        description: t('training.module_available_offline', { title: module.title }),
      });
      
    } catch (error) {
      console.error('Download failed:', error);
      
      setOfflineModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, isDownloading: false, downloadedSize: 0 } : m
      ));
      
      toast({
        title: t('training.download_failed'),
        description: t('training.download_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setDownloadQueue(prev => prev.filter(id => id !== moduleId));
    }
  };
  
  // Remove offline module
  const removeModule = async (moduleId: string) => {
    if (!dbRef.current) return;
    
    const transaction = dbRef.current.transaction(['modules', 'media'], 'readwrite');
    const moduleStore = transaction.objectStore('modules');
    const mediaStore = transaction.objectStore('media');
    
    // Remove module
    moduleStore.delete(moduleId);
    
    // Remove associated media files
    const module = offlineModules.find(m => m.id === moduleId);
    if (module) {
      for (const section of module.sections) {
        for (const mediaUrl of section.mediaUrls) {
          mediaStore.delete(mediaUrl);
        }
      }
    }
    
    setOfflineModules(prev => prev.filter(m => m.id !== moduleId));
    
    toast({
      title: t('training.module_removed'),
      description: t('training.module_removed_desc'),
    });
    
    // Recalculate storage
    calculateTrainingDataSize();
  };
  
  // Sync progress data
  const syncProgressData = async () => {
    if (!networkStatus.isOnline || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const pendingProgress = offlineProgress.filter(p => p.syncStatus === 'pending');
      
      if (pendingProgress.length === 0) {
        setLastSyncTime(new Date());
        return;
      }
      
      // Simulate API sync (in real implementation, this would call actual API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update sync status
      const transaction = dbRef.current!.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      
      for (const progress of pendingProgress) {
        const updated = { ...progress, syncStatus: 'synced' as const };
        store.put(updated);
      }
      
      setOfflineProgress(prev => prev.map(p => 
        pendingProgress.some(pp => 
          pp.moduleId === p.moduleId && 
          pp.sectionId === p.sectionId && 
          pp.userId === p.userId
        ) ? { ...p, syncStatus: 'synced' } : p
      ));
      
      setLastSyncTime(new Date());
      
      toast({
        title: t('training.sync_complete'),
        description: t('training.progress_synced', { count: pendingProgress.length }),
      });
      
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
  };
  
  // Save progress offline
  const saveProgressOffline = async (progress: Omit<OfflineProgress, 'lastModified' | 'syncStatus'>) => {
    if (!dbRef.current) return;
    
    const fullProgress: OfflineProgress = {
      ...progress,
      lastModified: new Date().toISOString(),
      syncStatus: 'pending'
    };
    
    const transaction = dbRef.current.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');
    store.put(fullProgress);
    
    setOfflineProgress(prev => [
      ...prev.filter(p => !(
        p.moduleId === progress.moduleId && 
        p.sectionId === progress.sectionId && 
        p.userId === progress.userId
      )),
      fullProgress
    ]);
    
    // Trigger sync if online
    if (networkStatus.isOnline && settings.backgroundSync) {
      setTimeout(() => syncProgressData(), 1000);
    }
  };
  
  // Clear cache
  const clearCache = async () => {
    if (!dbRef.current) return;
    
    const transaction = dbRef.current.transaction(['media'], 'readwrite');
    const store = transaction.objectStore('media');
    store.clear();
    
    toast({
      title: t('training.cache_cleared'),
      description: t('training.cache_cleared_desc'),
    });
    
    calculateTrainingDataSize();
  };
  
  // Update settings
  const updateSetting = <K extends keyof OfflineSettings>(
    key: K,
    value: OfflineSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
    
    // Update sync interval if changed
    if (key === 'syncInterval' || key === 'backgroundSync') {
      setupSyncInterval();
    }
  };
  
  // Get connection quality indicator
  const getConnectionQuality = () => {
    if (!networkStatus.isOnline) return 'offline';
    
    if (networkStatus.effectiveType === '4g' && networkStatus.downlink > 1.5) {
      return 'excellent';
    } else if (networkStatus.effectiveType === '4g' || networkStatus.downlink > 0.5) {
      return 'good';
    } else if (networkStatus.effectiveType === '3g') {
      return 'fair';
    } else {
      return 'poor';
    }
  };
  
  // Render connection status
  const renderConnectionStatus = () => {
    const quality = getConnectionQuality();
    
    return (
      <div className="flex items-center space-x-2">
        {networkStatus.isOnline ? (
          <>
            {quality === 'excellent' && <SignalHigh className="w-4 h-4 text-green-500" />}
            {quality === 'good' && <SignalMedium className="w-4 h-4 text-green-500" />}
            {quality === 'fair' && <SignalLow className="w-4 h-4 text-yellow-500" />}
            {quality === 'poor' && <SignalZero className="w-4 h-4 text-red-500" />}
            <span className="text-sm font-medium">
              {t(`training.connection_${quality}`)}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">
              {t('training.offline')}
            </span>
          </>
        )}
      </div>
    );
  };
  
  // Render offline module list
  const renderOfflineModules = () => (
    <div className="space-y-4">
      {offlineModules.map((module) => (
        <Card 
          key={module.id} 
          className={cn(
            "hover:shadow-md transition-shadow",
            module.isExpired && "border-orange-200 bg-orange-50"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-semibold truncate">
                    {locale === 'fr' ? module.title_fr : module.title}
                  </h4>
                  <Badge 
                    variant={
                      module.priority === 'critical' ? 'destructive' :
                      module.priority === 'high' ? 'default' :
                      'secondary'
                    }
                    className="text-xs"
                  >
                    {t(`training.priority_${module.priority}`)}
                  </Badge>
                  {module.isPinned && <Star className="w-4 h-4 text-yellow-500" />}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {locale === 'fr' ? module.description_fr : module.description}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center space-x-1">
                    <Package className="w-3 h-3" />
                    <span>{module.estimatedSize}MB</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <BookOpen className="w-3 h-3" />
                    <span>{module.sections.length} {t('training.sections')}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Activity className="w-3 h-3" />
                    <span>{Math.round(module.progress)}% {t('training.complete')}</span>
                  </span>
                  {module.downloadedAt && (
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(module.downloadedAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
                
                {module.isDownloading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t('training.downloading')}</span>
                      <span>{Math.round((module.downloadedSize / module.estimatedSize) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(module.downloadedSize / module.estimatedSize) * 100} 
                      className="h-1"
                    />
                  </div>
                )}
                
                {module.isExpired && (
                  <div className="mt-2 p-2 bg-orange-100 rounded-lg">
                    <div className="flex items-center space-x-2 text-orange-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('training.content_expired')}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <div className="flex items-center space-x-1">
                  {module.isDownloaded && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {module.syncStatus === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                  {module.syncStatus === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {module.isDownloaded ? (
                      <>
                        <DropdownMenuItem onClick={() => onModuleSelect?.(module.id)}>
                          <Play className="w-4 h-4 mr-2" />
                          {t('training.start_training')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => removeModule(module.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('training.remove_offline')}
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem 
                        onClick={() => downloadModule(module.id)}
                        disabled={module.isDownloading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {module.isDownloading ? t('training.downloading') : t('training.download')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <BookmarkPlus className="w-4 h-4 mr-2" />
                      {module.isPinned ? t('training.unpin') : t('training.pin')}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Info className="w-4 h-4 mr-2" />
                      {t('training.details')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {offlineModules.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <CloudOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('training.no_offline_modules')}</h3>
            <p className="text-muted-foreground">
              {t('training.download_modules_for_offline')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
  
  // Render storage manager
  const renderStorageManager = () => (
    <Dialog open={showStorageManager} onOpenChange={setShowStorageManager}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HardDrive className="w-5 h-5 mr-2" />
            {t('training.storage_manager')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Storage overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('training.storage_overview')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('training.training_data')}</span>
                  <span>{storageInfo.trainingDataSize}MB</span>
                </div>
                <Progress 
                  value={(storageInfo.trainingDataSize / storageInfo.maxAllowedSize) * 100} 
                  className="h-2"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('training.cache_data')}</span>
                  <span>{storageInfo.cacheSize}MB</span>
                </div>
                <Progress 
                  value={(storageInfo.cacheSize / storageInfo.maxAllowedSize) * 100} 
                  className="h-2"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {storageInfo.totalSpace}MB
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('training.total_space')}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {storageInfo.usedSpace}MB
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('training.used_space')}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {storageInfo.availableSpace}MB
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('training.available_space')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Storage actions */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={clearCache} className="flex-1">
              <Trash2 className="w-4 h-4 mr-2" />
              {t('training.clear_cache')}
            </Button>
            <Button variant="outline" onClick={calculateTrainingDataSize} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('training.refresh_storage')}
            </Button>
          </div>
          
          {/* Storage settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('training.storage_settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('training.max_storage_size')}: {settings.maxStorageSize}MB</Label>
                <Slider
                  value={[settings.maxStorageSize]}
                  onValueChange={([value]) => updateSetting('maxStorageSize', value)}
                  min={256}
                  max={4096}
                  step={256}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>{t('training.cache_expiration')}: {settings.cacheExpiration} {t('training.days')}</Label>
                <Slider
                  value={[settings.cacheExpiration]}
                  onValueChange={([value]) => updateSetting('cacheExpiration', value)}
                  min={1}
                  max={90}
                  step={1}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
  
  // Render settings dialog
  const renderSettingsDialog = () => (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            {t('training.offline_settings')}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="download" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="download">{t('training.download')}</TabsTrigger>
            <TabsTrigger value="sync">{t('training.sync')}</TabsTrigger>
            <TabsTrigger value="storage">{t('training.storage')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="download" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t('training.auto_download')}</Label>
              <Switch
                checked={settings.autoDownload}
                onCheckedChange={(checked) => updateSetting('autoDownload', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('training.download_on_wifi')}</Label>
              <Switch
                checked={settings.downloadOnWifi}
                onCheckedChange={(checked) => updateSetting('downloadOnWifi', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('training.download_on_cellular')}</Label>
              <Switch
                checked={settings.downloadOnCellular}
                onCheckedChange={(checked) => updateSetting('downloadOnCellular', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('training.prefetch_next_modules')}</Label>
              <Switch
                checked={settings.prefetchNextModules}
                onCheckedChange={(checked) => updateSetting('prefetchNextModules', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('training.low_data_mode')}</Label>
              <Switch
                checked={settings.lowDataMode}
                onCheckedChange={(checked) => updateSetting('lowDataMode', checked)}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="sync" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t('training.background_sync')}</Label>
              <Switch
                checked={settings.backgroundSync}
                onCheckedChange={(checked) => updateSetting('backgroundSync', checked)}
              />
            </div>
            
            <div>
              <Label>{t('training.sync_interval')}: {settings.syncInterval} {t('training.minutes')}</Label>
              <Slider
                value={[settings.syncInterval]}
                onValueChange={([value]) => updateSetting('syncInterval', value)}
                min={5}
                max={60}
                step={5}
                className="mt-2"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('training.battery_optimization')}</Label>
              <Switch
                checked={settings.batteryOptimization}
                onCheckedChange={(checked) => updateSetting('batteryOptimization', checked)}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="storage" className="space-y-4">
            <div>
              <Label>{t('training.compression_level')}</Label>
              <Select 
                value={settings.compressionLevel} 
                onValueChange={(value: any) => updateSetting('compressionLevel', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('training.compression_none')}</SelectItem>
                  <SelectItem value="low">{t('training.compression_low')}</SelectItem>
                  <SelectItem value="medium">{t('training.compression_medium')}</SelectItem>
                  <SelectItem value="high">{t('training.compression_high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowStorageManager(true)}
              className="w-full"
            >
              <Storage className="w-4 h-4 mr-2" />
              {t('training.manage_storage')}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <CloudDownload className="w-6 h-6 mr-3 text-krong-red" />
            {t('training.offline_training')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('training.offline_training_desc')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            {t('common.settings')}
          </Button>
          
          <Button 
            onClick={syncProgressData}
            disabled={!networkStatus.isOnline || isSyncing}
          >
            <Sync className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
            {isSyncing ? t('training.syncing') : t('training.sync_now')}
          </Button>
        </div>
      </div>
      
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.connection_status')}</p>
                {renderConnectionStatus()}
              </div>
              {networkStatus.isOnline ? (
                <Wifi className="w-8 h-8 text-green-500" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
        
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
                <p className="text-sm text-muted-foreground">{t('training.storage_used')}</p>
                <div className="text-2xl font-bold">
                  {storageInfo.trainingDataSize}MB
                </div>
              </div>
              <HardDrive className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sync status */}
      {lastSyncTime && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-800">{t('training.last_sync')}</h4>
                <p className="text-sm text-green-700">
                  {lastSyncTime.toLocaleString()} • {offlineProgress.filter(p => p.syncStatus === 'pending').length} {t('training.pending_items')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Offline modules */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('training.available_offline')}</h3>
        {renderOfflineModules()}
      </div>
      
      {/* Settings dialog */}
      {renderSettingsDialog()}
      
      {/* Storage manager */}
      {renderStorageManager()}
    </div>
  );
}

export default OfflineTrainingCapability;