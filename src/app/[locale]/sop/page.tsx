'use client';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Search, 
  Star, 
  Clock, 
  QrCode, 
  BookOpen, 
  Settings, 
  History, 
  HelpCircle,
  Grid3X3,
  BarChart3,
  Share2,
  Wifi,
  WifiOff,
  Bell,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SOPCategoriesDashboard } from '@/components/sop';
import { RecentViewedCarousel } from '@/components/sop';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';

interface SOPMainHubProps {
  params: Promise<{ locale: string }>;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  description: string;
  badge?: string;
}

export default function SOPMainHub({ params }: SOPMainHubProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const t = useTranslations('sop');
  const { user } = useAuthStore();

  // Track client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Monitor online status - only on client
  useEffect(() => {
    if (!isClient || typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    handleOnlineStatus(); // Set initial state
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [isClient]);

  // Show loading while params are resolving or client is not ready
  if (!resolvedParams || !isClient) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  // Quick action buttons for main navigation
  const quickActions: QuickAction[] = [
    {
      id: 'scanner',
      label: t('actions.scanner'),
      icon: QrCode,
      href: `/sop/scanner`,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: t('actions.scannerDesc'),
    },
    {
      id: 'search',
      label: t('actions.search'),
      icon: Search,
      href: `/sop/search`,
      color: 'bg-green-500 hover:bg-green-600',
      description: t('actions.searchDesc'),
    },
    {
      id: 'favorites',
      label: t('actions.favorites'),
      icon: Star,
      href: `/sop/favorites`,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      description: t('actions.favoritesDesc'),
    },
    {
      id: 'history',
      label: t('actions.history'),
      icon: History,
      href: `/sop/history`,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: t('actions.historyDesc'),
    },
    {
      id: 'offline',
      label: t('actions.offline'),
      icon: isOnline ? Wifi : WifiOff,
      href: `/sop/offline`,
      color: isOnline ? 'bg-gray-500 hover:bg-gray-600' : 'bg-orange-500 hover:bg-orange-600',
      description: t('actions.offlineDesc'),
      badge: !isOnline ? t('status.offline') : undefined,
    },
    {
      id: 'analytics',
      label: t('actions.analytics'),
      icon: BarChart3,
      href: `/sop/analytics`,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: t('actions.analyticsDesc'),
    },
  ];

  const handleCategorySelect = (category: any) => {
    router.push(`/${locale}/sop/categories/${category.id}`);
  };

  const handleQuickSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/${locale}/sop/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    router.push(`/${locale}${action.href}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title and Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('subtitle', { user: user?.full_name || 'Staff' })}
                  </p>
                </div>
              </div>
              
              {/* Online Status Indicator */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                isOnline 
                  ? "bg-green-100 text-green-700" 
                  : "bg-orange-100 text-orange-700"
              )}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? t('status.online') : t('status.offline')}
              </div>
            </div>

            {/* Quick Search */}
            <div className="flex gap-2 min-w-0 lg:w-96">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
                  className="pl-10 h-12 text-base border-gray-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <Button 
                onClick={handleQuickSearch}
                className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white"
              >
                {t('search.button')}
              </Button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="ghost"
                  onClick={() => handleQuickAction(action)}
                  className={cn(
                    "h-20 flex flex-col items-center justify-center gap-2 text-white rounded-xl transition-all duration-200 hover:scale-105",
                    action.color
                  )}
                >
                  <div className="relative">
                    <Icon className="w-6 h-6" />
                    {action.badge && (
                      <Badge className="absolute -top-2 -right-2 text-xs px-1 py-0 bg-red-500 text-white">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">
                    {action.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Primary Content - SOP Categories */}
          <div className="xl:col-span-3">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('categories.title')}
              </h2>
              <p className="text-gray-600">
                {t('categories.description')}
              </p>
            </div>
            
            <SOPCategoriesDashboard
              locale={locale}
              onCategorySelect={handleCategorySelect}
              className="bg-white rounded-xl shadow-sm"
            />
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Recent SOPs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  {t('recent.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RecentViewedCarousel locale={locale} />
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-gray-600" />
                  {t('quickLinks.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${locale}/sop/shortcuts`)}
                  className="w-full justify-start h-auto p-3 text-left"
                >
                  <div>
                    <div className="font-medium">{t('quickLinks.shortcuts')}</div>
                    <div className="text-sm text-gray-500">{t('quickLinks.shortcutsDesc')}</div>
                  </div>
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${locale}/sop/notifications`)}
                  className="w-full justify-start h-auto p-3 text-left"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {t('quickLinks.notifications')}
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="text-sm text-gray-500">{t('quickLinks.notificationsDesc')}</div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${locale}/sop/help`)}
                  className="w-full justify-start h-auto p-3 text-left"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {t('quickLinks.help')}
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div className="text-sm text-gray-500">{t('quickLinks.helpDesc')}</div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${locale}/sop/settings`)}
                  className="w-full justify-start h-auto p-3 text-left"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {t('quickLinks.settings')}
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="text-sm text-gray-500">{t('quickLinks.settingsDesc')}</div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {t('status.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('status.connection')}</span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isOnline ? "bg-green-500" : "bg-red-500"
                  )} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('status.lastSync')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date().toLocaleTimeString(locale)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}