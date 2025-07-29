'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Settings, 
  Bell, 
  Monitor, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX,
  Globe,
  Camera,
  Download,
  Upload,
  Trash2,
  ArrowLeft,
  User,
  Shield,
  Database,
  Smartphone,
  Wifi,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Languages,
  Palette,
  Zap,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';

interface SOPSettingsPageProps {
  params: Promise<{ locale: string }>;
}

interface UserSettings {
  // Display
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'fr';
  fontSize: number;
  highContrast: boolean;
  reduceMotion: boolean;
  
  // Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  sopReminders: boolean;
  deadlineAlerts: boolean;
  completionNotifications: boolean;
  
  // Audio & Video
  soundEnabled: boolean;
  volume: number;
  voiceInstructions: boolean;
  autoplayVideos: boolean;
  
  // Privacy & Security
  shareUsageData: boolean;
  allowOfflineStorage: boolean;
  biometricAuth: boolean;
  sessionTimeout: number; // in minutes
  
  // SOP Preferences
  autoSaveProgress: boolean;
  showStepEstimates: boolean;
  confirmStepCompletion: boolean;
  showDifficultyWarnings: boolean;
  defaultView: 'grid' | 'list';
  
  // Camera & Media
  photoQuality: 'low' | 'medium' | 'high';
  autoUploadPhotos: boolean;
  compressPhotos: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  // Display
  theme: 'auto',
  language: 'en',
  fontSize: 16,
  highContrast: false,
  reduceMotion: false,
  
  // Notifications
  pushNotifications: true,
  emailNotifications: false,
  sopReminders: true,
  deadlineAlerts: true,
  completionNotifications: true,
  
  // Audio & Video
  soundEnabled: true,
  volume: 75,
  voiceInstructions: false,
  autoplayVideos: false,
  
  // Privacy & Security
  shareUsageData: false,
  allowOfflineStorage: true,
  biometricAuth: false,
  sessionTimeout: 480, // 8 hours
  
  // SOP Preferences
  autoSaveProgress: true,
  showStepEstimates: true,
  confirmStepCompletion: true,
  showDifficultyWarnings: true,
  defaultView: 'grid',
  
  // Camera & Media
  photoQuality: 'high',
  autoUploadPhotos: true,
  compressPhotos: true,
};

export default function SOPSettingsPage({ params }: SOPSettingsPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const t = useTranslations('sop');
  const { user } = useAuthStore();

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Load user settings
  useEffect(() => {
    // In a real app, load settings from API or localStorage
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('sop-settings');
      if (savedSettings) {
        try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real app, save to API
      if (typeof window !== 'undefined') {
        localStorage.setItem('sop-settings', JSON.stringify(settings));
      }
      setHasChanges(false);
      toast({
        title: t('settings.saved'),
        description: t('settings.savedDescription'),
      });
    } catch (error) {
      toast({
        title: t('settings.saveError'),
        description: t('settings.saveErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    toast({
      title: t('settings.reset'),
      description: t('settings.resetDescription'),
    });
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sop-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings({ ...DEFAULT_SETTINGS, ...imported });
          setHasChanges(true);
          toast({
            title: t('settings.imported'),
            description: t('settings.importedDescription'),
          });
        } catch (error) {
          toast({
            title: t('settings.importError'),
            description: t('settings.importErrorDescription'),
            variant: 'destructive',
          });
        }
      };
      reader.readAsText(file);
    }
  };

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
                <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('settings.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('settings.subtitle', { user: user?.full_name || 'User' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {t('settings.unsavedChanges')}
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={handleResetSettings}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t('settings.reset')}
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={!hasChanges || isSaving}
                className="bg-red-600 hover:bg-red-700 gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? t('settings.saving') : t('settings.save')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="display" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="display" className="gap-2">
              <Monitor className="w-4 h-4" />
              {t('settings.tabs.display')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              {t('settings.tabs.notifications')}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="w-4 h-4" />
              {t('settings.tabs.privacy')}
            </TabsTrigger>
            <TabsTrigger value="sop" className="gap-2">
              <Zap className="w-4 h-4" />
              {t('settings.tabs.sop')}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Database className="w-4 h-4" />
              {t('settings.tabs.advanced')}
            </TabsTrigger>
          </TabsList>

          {/* Display Settings */}
          <TabsContent value="display" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  {t('settings.display.appearance')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.display.theme')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.display.themeDescription')}</p>
                  </div>
                  <Select value={settings.theme} onValueChange={(value: any) => updateSetting('theme', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          {t('settings.display.light')}
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4" />
                          {t('settings.display.dark')}
                        </div>
                      </SelectItem>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          {t('settings.display.auto')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.display.language')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.display.languageDescription')}</p>
                  </div>
                  <Select value={settings.language} onValueChange={(value: any) => updateSetting('language', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          English
                        </div>
                      </SelectItem>
                      <SelectItem value="fr">
                        <div className="flex items-center gap-2">
                          <Languages className="w-4 h-4" />
                          Français
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">{t('settings.display.fontSize')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.display.fontSizeDescription')}</p>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([value]) => updateSetting('fontSize', value)}
                      min={12}
                      max={24}
                      step={2}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{t('settings.display.small')}</span>
                      <span className="font-medium">{settings.fontSize}px</span>
                      <span>{t('settings.display.large')}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.display.highContrast')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.display.highContrastDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.highContrast}
                    onCheckedChange={(checked) => updateSetting('highContrast', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.display.reduceMotion')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.display.reduceMotionDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.reduceMotion}
                    onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {t('settings.notifications.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.notifications.push')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.notifications.pushDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.notifications.email')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.notifications.emailDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.notifications.sopReminders')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.notifications.sopRemindersDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.sopReminders}
                    onCheckedChange={(checked) => updateSetting('sopReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.notifications.deadlines')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.notifications.deadlinesDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.deadlineAlerts}
                    onCheckedChange={(checked) => updateSetting('deadlineAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.notifications.completions')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.notifications.completionsDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.completionNotifications}
                    onCheckedChange={(checked) => updateSetting('completionNotifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  {t('settings.audio.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.audio.sounds')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.audio.soundsDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
                  />
                </div>

                {settings.soundEnabled && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">{t('settings.audio.volume')}</Label>
                      <p className="text-sm text-gray-600">{t('settings.audio.volumeDescription')}</p>
                    </div>
                    <div className="space-y-2">
                      <Slider
                        value={[settings.volume]}
                        onValueChange={([value]) => updateSetting('volume', value)}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500">
                        <VolumeX className="w-4 h-4" />
                        <span className="font-medium">{settings.volume}%</span>
                        <Volume2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.audio.voiceInstructions')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.audio.voiceInstructionsDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.voiceInstructions}
                    onCheckedChange={(checked) => updateSetting('voiceInstructions', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t('settings.privacy.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.privacy.shareData')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.privacy.shareDataDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.shareUsageData}
                    onCheckedChange={(checked) => updateSetting('shareUsageData', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.privacy.offlineStorage')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.privacy.offlineStorageDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.allowOfflineStorage}
                    onCheckedChange={(checked) => updateSetting('allowOfflineStorage', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.privacy.sessionTimeout')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.privacy.sessionTimeoutDescription')}</p>
                  </div>
                  <Select 
                    value={settings.sessionTimeout.toString()} 
                    onValueChange={(value) => updateSetting('sessionTimeout', parseInt(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 {t('time.hour')}</SelectItem>
                      <SelectItem value="240">4 {t('time.hours')}</SelectItem>
                      <SelectItem value="480">8 {t('time.hours')}</SelectItem>
                      <SelectItem value="720">12 {t('time.hours')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SOP Settings */}
          <TabsContent value="sop" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {t('settings.sop.preferences')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.sop.autoSave')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.sop.autoSaveDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.autoSaveProgress}
                    onCheckedChange={(checked) => updateSetting('autoSaveProgress', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.sop.stepEstimates')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.sop.stepEstimatesDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.showStepEstimates}
                    onCheckedChange={(checked) => updateSetting('showStepEstimates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.sop.confirmSteps')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.sop.confirmStepsDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.confirmStepCompletion}
                    onCheckedChange={(checked) => updateSetting('confirmStepCompletion', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.sop.difficultyWarnings')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.sop.difficultyWarningsDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.showDifficultyWarnings}
                    onCheckedChange={(checked) => updateSetting('showDifficultyWarnings', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.sop.defaultView')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.sop.defaultViewDescription')}</p>
                  </div>
                  <Select value={settings.defaultView} onValueChange={(value: any) => updateSetting('defaultView', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">{t('settings.sop.grid')}</SelectItem>
                      <SelectItem value="list">{t('settings.sop.list')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {t('settings.camera.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.camera.quality')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.camera.qualityDescription')}</p>
                  </div>
                  <Select value={settings.photoQuality} onValueChange={(value: any) => updateSetting('photoQuality', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('settings.camera.low')}</SelectItem>
                      <SelectItem value="medium">{t('settings.camera.medium')}</SelectItem>
                      <SelectItem value="high">{t('settings.camera.high')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.camera.autoUpload')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.camera.autoUploadDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.autoUploadPhotos}
                    onCheckedChange={(checked) => updateSetting('autoUploadPhotos', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.camera.compress')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.camera.compressDescription')}</p>
                  </div>
                  <Switch
                    checked={settings.compressPhotos}
                    onCheckedChange={(checked) => updateSetting('compressPhotos', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {t('settings.advanced.dataManagement')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.advanced.exportSettings')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.advanced.exportDescription')}</p>
                  </div>
                  <Button variant="outline" onClick={handleExportSettings} className="gap-2">
                    <Download className="w-4 h-4" />
                    {t('settings.advanced.export')}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('settings.advanced.importSettings')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.advanced.importDescription')}</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportSettings}
                      className="hidden"
                      id="import-settings"
                    />
                    <Button variant="outline" onClick={() => document.getElementById('import-settings')?.click()} className="gap-2">
                      <Upload className="w-4 h-4" />
                      {t('settings.advanced.import')}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium text-red-600">{t('settings.advanced.clearData')}</Label>
                    <p className="text-sm text-gray-600">{t('settings.advanced.clearDataDescription')}</p>
                  </div>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    {t('settings.advanced.clear')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  {t('settings.advanced.troubleshooting')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">{t('settings.advanced.version')}</Label>
                    <p className="text-gray-600">v2.1.0</p>
                  </div>
                  <div>
                    <Label className="font-medium">{t('settings.advanced.lastSync')}</Label>
                    <p className="text-gray-600">{new Date().toLocaleString(locale)}</p>
                  </div>
                  <div>
                    <Label className="font-medium">{t('settings.advanced.storageUsed')}</Label>
                    <p className="text-gray-600">45.2 MB</p>
                  </div>
                  <div>
                    <Label className="font-medium">{t('settings.advanced.cacheSize')}</Label>
                    <p className="text-gray-600">12.8 MB</p>
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