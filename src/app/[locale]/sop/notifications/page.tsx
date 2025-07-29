'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Bell, 
  Settings, 
  Check, 
  X, 
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  CheckCircle,
  Info,
  Zap,
  Filter,
  Search,
  MoreVertical,
  Trash2,
  Archive,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';

interface SOPNotificationsPageProps {
  params: Promise<{ locale: string }>;
}

interface SOPNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'reminder' | 'update';
  title: string;
  message: string;
  is_read: boolean;
  is_important: boolean;
  created_at: string;
  action_url?: string;
  action_text?: string;
  related_sop?: {
    id: string;
    title: string;
    category: string;
  };
  sender?: string;
}

interface NotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  sop_updates: boolean;
  assignment_reminders: boolean;
  deadline_alerts: boolean;
  completion_confirmations: boolean;
  system_announcements: boolean;
  training_reminders: boolean;
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
}

// Mock notifications
const MOCK_NOTIFICATIONS: SOPNotification[] = [
  {
    id: '1',
    type: 'reminder',
    title: 'SOP Training Reminder',
    message: 'Complete your Food Safety certification by end of week',
    is_read: false,
    is_important: true,
    created_at: '2024-01-25T14:30:00Z',
    action_url: '/training/food-safety',
    action_text: 'Start Training',
    sender: 'Training System',
  },
  {
    id: '2',
    type: 'update',
    title: 'SOP Updated',
    message: 'Hand Washing Procedure has been updated to version 2.1',
    is_read: false,
    is_important: false,
    created_at: '2024-01-25T10:15:00Z',
    action_url: '/sop/documents/1',
    action_text: 'View Changes',
    related_sop: {
      id: '1',
      title: 'Hand Washing Procedure',
      category: 'Food Safety',
    },
    sender: 'SOP Management',
  },
  {
    id: '3',
    type: 'success',
    title: 'Completion Streak!',
    message: 'Congratulations! You\'ve completed SOPs for 7 days straight',
    is_read: true,
    is_important: false,
    created_at: '2024-01-24T18:00:00Z',
    sender: 'Achievement System',
  },
  {
    id: '4',
    type: 'warning',
    title: 'Missed SOP Assignment',
    message: 'Temperature Control Monitoring was due yesterday',
    is_read: false,
    is_important: true,
    created_at: '2024-01-24T09:00:00Z',
    action_url: '/sop/documents/2',
    action_text: 'Complete Now',
    related_sop: {
      id: '2',
      title: 'Temperature Control Monitoring',
      category: 'Food Safety',
    },
    sender: 'Management',
  },
  {
    id: '5',
    type: 'info',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight from 2 AM to 4 AM',
    is_read: true,
    is_important: false,
    created_at: '2024-01-23T15:30:00Z',
    sender: 'IT Department',
  },
];

const DEFAULT_SETTINGS: NotificationSettings = {
  push_enabled: true,
  email_enabled: false,
  sop_updates: true,
  assignment_reminders: true,
  deadline_alerts: true,
  completion_confirmations: true,
  system_announcements: true,
  training_reminders: true,
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
};

export default function SOPNotificationsPage({ params }: SOPNotificationsPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const router = useRouter();
  const t = useTranslations('sop');
  const { user } = useAuthStore();

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchQuery === '' ||
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesRead = !showUnreadOnly || !notification.is_read;
    
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const importantCount = notifications.filter(n => n.is_important && !n.is_read).length;

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast({
      title: t('notifications.allMarkedRead'),
      description: t('notifications.allMarkedReadDescription'),
    });
  };

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    toast({
      title: t('notifications.deleted'),
      description: t('notifications.deletedDescription'),
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    if (notification.action_url) {
      router.push(`/${locale}${notification.action_url}`);
    }
  };

  const updateNotificationSetting = <K extends keyof NotificationSettings>(
    key: K, 
    value: NotificationSettings[K]
  ) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    // In a real app, save to API
    toast({
      title: t('notifications.settingsSaved'),
      description: t('notifications.settingsSavedDescription'),
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      case 'reminder': return Clock;
      case 'update': return Zap;
      default: return Info;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-red-100 text-red-700';
      case 'success': return 'bg-green-100 text-green-700';
      case 'reminder': return 'bg-yellow-100 text-yellow-700';
      case 'update': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return t('time.justNow');
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
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
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center relative">
                  <Bell className="w-6 h-6 text-white" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{unreadCount}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('notifications.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {unreadCount > 0 
                      ? t('notifications.unreadCount', { count: unreadCount })
                      : t('notifications.allCaughtUp')
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleMarkAllAsRead}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('notifications.markAllRead')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Bell className="w-4 h-4" />
              {t('notifications.tabs.all')}
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="important" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t('notifications.tabs.important')}
              {importantCount > 0 && (
                <Badge variant="destructive">{importantCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              {t('notifications.tabs.settings')}
            </TabsTrigger>
          </TabsList>

          {/* All Notifications */}
          <TabsContent value="all" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={t('notifications.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('notifications.filters.allTypes')}</SelectItem>
                      <SelectItem value="reminder">{t('notifications.types.reminder')}</SelectItem>
                      <SelectItem value="update">{t('notifications.types.update')}</SelectItem>
                      <SelectItem value="warning">{t('notifications.types.warning')}</SelectItem>
                      <SelectItem value="success">{t('notifications.types.success')}</SelectItem>
                      <SelectItem value="info">{t('notifications.types.info')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showUnreadOnly}
                      onCheckedChange={setShowUnreadOnly}
                    />
                    <Label className="text-sm">{t('notifications.unreadOnly')}</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || typeFilter !== 'all' || showUnreadOnly
                      ? t('notifications.noResults')
                      : t('notifications.empty')
                    }
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery || typeFilter !== 'all' || showUnreadOnly
                      ? t('notifications.noResultsDescription')
                      : t('notifications.emptyDescription')
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <Card
                      key={notification.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        !notification.is_read && "border-l-4 border-l-blue-500 bg-blue-50/50"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            getNotificationColor(notification.type)
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={cn(
                                    "font-medium text-gray-900",
                                    !notification.is_read && "font-semibold"
                                  )}>
                                    {notification.title}
                                  </h3>
                                  {notification.is_important && (
                                    <Badge variant="destructive" className="text-xs">
                                      {t('notifications.important')}
                                    </Badge>
                                  )}
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                                
                                <p className="text-gray-700 mb-2">{notification.message}</p>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {notification.sender}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatRelativeTime(notification.created_at)}
                                  </div>
                                  {notification.related_sop && (
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs">
                                        {notification.related_sop.category}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                                
                                {notification.action_text && (
                                  <div className="mt-3">
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNotificationClick(notification);
                                      }}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {notification.action_text}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}>
                                    {notification.is_read ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                                    {notification.is_read ? t('notifications.markUnread') : t('notifications.markRead')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    // Archive notification
                                  }}>
                                    <Archive className="w-4 h-4 mr-2" />
                                    {t('notifications.archive')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notification.id);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('notifications.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Important Notifications */}
          <TabsContent value="important" className="space-y-6">
            <div className="space-y-3">
              {notifications.filter(n => n.is_important).map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <Card
                    key={notification.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500",
                      !notification.is_read && "bg-red-50/50"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          getNotificationColor(notification.type)
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{notification.title}</h3>
                          <p className="text-gray-700 mb-2">{notification.message}</p>
                          <div className="text-sm text-gray-500">
                            {formatRelativeTime(notification.created_at)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('notifications.settings.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* General Settings */}
                <div>
                  <Label className="text-base font-medium mb-3 block">{t('notifications.settings.general')}</Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t('notifications.settings.pushNotifications')}</Label>
                        <p className="text-sm text-gray-600">{t('notifications.settings.pushDescription')}</p>
                      </div>
                      <Switch
                        checked={notificationSettings.push_enabled}
                        onCheckedChange={(checked) => updateNotificationSetting('push_enabled', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t('notifications.settings.emailNotifications')}</Label>
                        <p className="text-sm text-gray-600">{t('notifications.settings.emailDescription')}</p>
                      </div>
                      <Switch
                        checked={notificationSettings.email_enabled}
                        onCheckedChange={(checked) => updateNotificationSetting('email_enabled', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* SOP Notifications */}
                <div>
                  <Label className="text-base font-medium mb-3 block">{t('notifications.settings.sop')}</Label>
                  <div className="space-y-4">
                    {[
                      { key: 'sop_updates', label: t('notifications.settings.sopUpdates'), desc: t('notifications.settings.sopUpdatesDesc') },
                      { key: 'assignment_reminders', label: t('notifications.settings.assignments'), desc: t('notifications.settings.assignmentsDesc') },
                      { key: 'deadline_alerts', label: t('notifications.settings.deadlines'), desc: t('notifications.settings.deadlinesDesc') },
                      { key: 'completion_confirmations', label: t('notifications.settings.completions'), desc: t('notifications.settings.completionsDesc') },
                      { key: 'training_reminders', label: t('notifications.settings.training'), desc: t('notifications.settings.trainingDesc') },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label>{label}</Label>
                          <p className="text-sm text-gray-600">{desc}</p>
                        </div>
                        <Switch
                          checked={notificationSettings[key as keyof NotificationSettings] as boolean}
                          onCheckedChange={(checked) => updateNotificationSetting(key as keyof NotificationSettings, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Quiet Hours */}
                <div>
                  <Label className="text-base font-medium mb-3 block">{t('notifications.settings.quietHours')}</Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t('notifications.settings.enableQuietHours')}</Label>
                        <p className="text-sm text-gray-600">{t('notifications.settings.quietHoursDesc')}</p>
                      </div>
                      <Switch
                        checked={notificationSettings.quiet_hours_enabled}
                        onCheckedChange={(checked) => updateNotificationSetting('quiet_hours_enabled', checked)}
                      />
                    </div>
                    
                    {notificationSettings.quiet_hours_enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('notifications.settings.quietStart')}</Label>
                          <Input
                            type="time"
                            value={notificationSettings.quiet_start}
                            onChange={(e) => updateNotificationSetting('quiet_start', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>{t('notifications.settings.quietEnd')}</Label>
                          <Input
                            type="time"
                            value={notificationSettings.quiet_end}
                            onChange={(e) => updateNotificationSetting('quiet_end', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button onClick={handleSaveSettings} className="w-full">
                  {t('notifications.settings.save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}