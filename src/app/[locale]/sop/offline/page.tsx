'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Trash2, 
  RefreshCw, 
  HardDrive,
  ArrowLeft,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  Database,
  Smartphone,
  Star,
  Calendar,
  FileDown,
  Settings,
  Info,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SOPOfflinePageProps {
  params: Promise<{ locale: string }>;
}

interface OfflineSOP {
  id: string;
  title: string;
  title_fr: string;
  category: string;
  category_fr: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number;
  size_mb: number;
  downloaded_at: string;
  last_accessed: string;
  is_required: boolean;
  is_favorite: boolean;
  has_updates: boolean;
  sync_status: 'synced' | 'pending' | 'failed';
}

interface OfflineSettings {
  auto_download_required: boolean;
  auto_download_favorites: boolean;
  download_on_wifi_only: boolean;
  max_storage_mb: number;
  auto_cleanup_days: number;
}

// Mock offline SOPs
const MOCK_OFFLINE_SOPS: OfflineSOP[] = [
  {
    id: '1',
    title: 'Hand Washing Procedure',
    title_fr: 'Procédure de Lavage des Mains',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    difficulty: 'easy',
    estimated_time: 5,
    size_mb: 2.4,
    downloaded_at: '2024-01-25T10:00:00Z',
    last_accessed: '2024-01-25T14:30:00Z',
    is_required: true,
    is_favorite: false,
    has_updates: false,
    sync_status: 'synced'
  },
  {
    id: '2',
    title: 'Temperature Control Monitoring',
    title_fr: 'Surveillance du Contrôle de Température',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    difficulty: 'medium',
    estimated_time: 15,
    size_mb: 5.8,
    downloaded_at: '2024-01-24T16:00:00Z',
    last_accessed: '2024-01-25T10:15:00Z',
    is_required: true,
    is_favorite: true,
    has_updates: true,
    sync_status: 'pending'
  },
  {
    id: '3',
    title: 'Kitchen Equipment Cleaning',
    title_fr: 'Nettoyage de l\'Équipement de Cuisine',
    category: 'Cleaning',
    category_fr: 'Nettoyage',
    difficulty: 'medium',
    estimated_time: 30,
    size_mb: 8.2,
    downloaded_at: '2024-01-23T12:00:00Z',
    last_accessed: '2024-01-24T16:00:00Z',
    is_required: false,
    is_favorite: false,
    has_updates: false,
    sync_status: 'failed'
  }
];

const DEFAULT_SETTINGS: OfflineSettings = {
  auto_download_required: true,
  auto_download_favorites: false,
  download_on_wifi_only: true,
  max_storage_mb: 500,
  auto_cleanup_days: 30,
};

export default function SOPOfflinePage({ params }: SOPOfflinePageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineSops, setOfflineSops] = useState<OfflineSOP[]>(MOCK_OFFLINE_SOPS);
  const [settings, setSettings] = useState<OfflineSettings>(DEFAULT_SETTINGS);
  const [storageUsed, setStorageUsed] = useState(16.4); // MB
  const [isDownloading, setIsDownloading] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const router = useRouter();
  const t = useTranslations('sop');

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Monitor online status
  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    handleOnlineStatus(); // Set initial state
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const handleDownloadSOP = async (sopId: string) => {
    setIsDownloading(prev => new Set(prev).add(sopId));
    
    try {
      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update SOP status
      setOfflineSops(prev => prev.map(sop => 
        sop.id === sopId 
          ? { ...sop, downloaded_at: new Date().toISOString(), sync_status: 'synced' as const }
          : sop
      ));
      
      toast({
        title: t('offline.downloadComplete'),
        description: t('offline.downloadCompleteDescription'),
      });
    } catch (error) {
      toast({
        title: t('offline.downloadError'),
        description: t('offline.downloadErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(prev => {
        const newSet = new Set(prev);
        newSet.delete(sopId);
        return newSet;
      });
    }
  };

  const handleDeleteSOP = (sopId: string) => {
    setOfflineSops(prev => prev.filter(sop => sop.id !== sopId));
    setStorageUsed(prev => prev - (offlineSops.find(sop => sop.id === sopId)?.size_mb || 0));
    
    toast({
      title: t('offline.deleted'),
      description: t('offline.deletedDescription'),
    });
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setOfflineSops(prev => prev.map(sop => ({ 
        ...sop, 
        sync_status: 'synced' as const,
        has_updates: false 
      })));
      
      toast({
        title: t('offline.syncComplete'),
        description: t('offline.syncCompleteDescription'),
      });
    } catch (error) {
      toast({
        title: t('offline.syncError'),
        description: t('offline.syncErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateSetting = <K extends keyof OfflineSettings>(key: K, value: OfflineSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSOPSelect = (sop: OfflineSOP) => {
    router.push(`/${locale}/sop/documents/${sop.id}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('time.justNow');
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

  const storagePercentage = (storageUsed / settings.max_storage_mb) * 100;
  const pendingSyncs = offlineSops.filter(sop => sop.sync_status === 'pending' || sop.has_updates).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  isOnline ? "bg-blue-600" : "bg-orange-600"
                )}>
                  {isOnline ? <Wifi className="w-6 h-6 text-white" /> : <WifiOff className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('offline.title')}
                  </h1>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-600">
                      {offlineSops.length} {t('offline.sopsAvailable')}
                    </p>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      isOnline 
                        ? "bg-green-100 text-green-700" 
                        : "bg-orange-100 text-orange-700"
                    )}>
                      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {isOnline ? t('status.online') : t('status.offline')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOnline && pendingSyncs > 0 && (
                <Button
                  variant="outline"
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                  {isSyncing ? t('offline.syncing') : t('offline.syncAll')}
                  {pendingSyncs > 0 && (
                    <Badge variant="secondary">{pendingSyncs}</Badge>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/sop/settings`)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                {t('offline.settings')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="downloaded" className="space-y-6">
          <TabsList>
            <TabsTrigger value="downloaded" className="gap-2">
              <HardDrive className="w-4 h-4" />
              {t('offline.tabs.downloaded')}
            </TabsTrigger>
            <TabsTrigger value="storage" className="gap-2">
              <Database className="w-4 h-4" />
              {t('offline.tabs.storage')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              {t('offline.tabs.settings')}
            </TabsTrigger>
          </TabsList>

          {/* Downloaded SOPs */}
          <TabsContent value="downloaded" className="space-y-6">
            {/* Status Alert */}
            {!isOnline && (
              <Alert>
                <WifiOff className="w-4 h-4" />
                <AlertDescription>
                  {t('offline.offlineMode')}
                </AlertDescription>
              </Alert>
            )}

            {offlineSops.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <HardDrive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('offline.noSops.title')}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t('offline.noSops.description')}
                  </p>
                  <Button
                    onClick={() => router.push(`/${locale}/sop`)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {t('offline.browseSops')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {offlineSops.map((sop) => (
                  <Card key={sop.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            sop.sync_status === 'synced' ? "bg-green-100" :
                            sop.sync_status === 'pending' ? "bg-yellow-100" : "bg-red-100"
                          )}>
                            {sop.sync_status === 'synced' ? (
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            ) : sop.sync_status === 'pending' ? (
                              <Clock className="w-6 h-6 text-yellow-600" />
                            ) : (
                              <AlertTriangle className="w-6 h-6 text-red-600" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {locale === 'fr' ? sop.title_fr : sop.title}
                              </h3>
                              {sop.is_required && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700">
                                  {t('status.required')}
                                </Badge>
                              )}
                              {sop.is_favorite && (
                                <Badge className="bg-yellow-100 text-yellow-700">
                                  <Star className="w-3 h-3 mr-1 fill-current" />
                                  {t('status.favorite')}
                                </Badge>
                              )}
                              <Badge className={getDifficultyColor(sop.difficulty)}>
                                {t(`difficulty.${sop.difficulty}`)}
                              </Badge>
                              {sop.has_updates && (
                                <Badge className="bg-blue-100 text-blue-700">
                                  {t('offline.hasUpdates')}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatRelativeTime(sop.last_accessed)}
                              </span>
                              <span className="flex items-center gap-1">
                                <HardDrive className="w-4 h-4" />
                                {sop.size_mb.toFixed(1)} MB
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {sop.estimated_time} {t('time.minutes')}
                              </span>
                              <Badge className={getSyncStatusColor(sop.sync_status)}>
                                {t(`offline.status.${sop.sync_status}`)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isDownloading.has(sop.id) ? (
                            <Button disabled className="gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              {t('offline.downloading')}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleDeleteSOP(sop.id)}
                                className="gap-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                                {t('offline.delete')}
                              </Button>
                              <Button
                                onClick={() => handleSOPSelect(sop)}
                                className="bg-red-600 hover:bg-red-700 gap-2"
                              >
                                <Play className="w-4 h-4" />
                                {t('offline.open')}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Storage Management */}
          <TabsContent value="storage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <HardDrive className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('offline.storage.used')}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {storageUsed.toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Database className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('offline.storage.available')}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(settings.max_storage_mb - storageUsed).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <FileDown className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('offline.storage.sops')}</p>
                      <p className="text-2xl font-bold text-gray-900">{offlineSops.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('offline.storage.usage')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('offline.storage.progress')}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {storageUsed.toFixed(1)} / {settings.max_storage_mb} MB
                    </span>
                  </div>
                  <Progress value={storagePercentage} className="h-2" />
                  
                  {storagePercentage > 90 && (
                    <Alert>
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        {t('offline.storage.warning')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('offline.storage.breakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Food Safety', 'Cleaning', 'Service'].map((category) => {
                    const categorySOPs = offlineSops.filter(sop => sop.category === category);
                    const categorySize = categorySOPs.reduce((sum, sop) => sum + sop.size_mb, 0);
                    const percentage = (categorySize / storageUsed) * 100;
                    
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">{category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{categorySize.toFixed(1)} MB</span>
                          <span className="text-xs text-gray-500">({percentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offline Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  {t('offline.settings.download')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('offline.settings.autoDownloadRequired')}</Label>
                    <p className="text-sm text-gray-600">{t('offline.settings.autoDownloadRequiredDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.auto_download_required}
                    onCheckedChange={(checked) => handleUpdateSetting('auto_download_required', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('offline.settings.autoDownloadFavorites')}</Label>
                    <p className="text-sm text-gray-600">{t('offline.settings.autoDownloadFavoritesDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.auto_download_favorites}
                    onCheckedChange={(checked) => handleUpdateSetting('auto_download_favorites', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('offline.settings.wifiOnly')}</Label>
                    <p className="text-sm text-gray-600">{t('offline.settings.wifiOnlyDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.download_on_wifi_only}
                    onCheckedChange={(checked) => handleUpdateSetting('download_on_wifi_only', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  {t('offline.settings.storage')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">{t('offline.settings.maxStorage')}</Label>
                    <p className="text-sm text-gray-600">{t('offline.settings.maxStorageDescription')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">100 MB</span>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="100"
                        max="2000"
                        step="50"
                        value={settings.max_storage_mb}
                        onChange={(e) => handleUpdateSetting('max_storage_mb', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm text-gray-600">2 GB</span>
                  </div>
                  <div className="text-center">
                    <span className="font-medium">{settings.max_storage_mb} MB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}