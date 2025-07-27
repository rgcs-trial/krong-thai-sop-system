'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Languages, 
  FileText, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Users,
  Activity,
  BarChart3,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Globe,
  Target,
  Zap
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/hooks/use-toast';
import type { 
  TranslationManagementDashboardProps,
  TranslationDashboardStats,
  TranslationAdminFilters,
  Locale
} from '@/types/translation-admin';

// Sub-components
import { TranslationKeyManager } from './translation-key-manager';
import { TranslationEditor } from './translation-editor';
import { BulkTranslationManager } from './bulk-translation-manager';
import { TranslationWorkflowManager } from './translation-workflow-manager';
import { TranslationAnalyticsDashboard } from './translation-analytics-dashboard';
import { TranslationPreviewPanel } from './translation-preview-panel';

/**
 * Main Translation Management Dashboard Component
 * Tablet-optimized interface for managing translations and content localization
 */
export function TranslationManagementDashboard({
  className = '',
  initialFilters,
  onNavigate
}: TranslationManagementDashboardProps) {
  const { t, locale, formatNumberLocale, formatDateLocale } = useI18n();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<TranslationAdminFilters>(
    initialFilters || { locale: 'all', status: 'all', category: 'all' }
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dashboard statistics
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    error: statsError,
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['translation-dashboard-stats', refreshKey],
    queryFn: async (): Promise<TranslationDashboardStats> => {
      const response = await fetch('/api/admin/translations/dashboard-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent activity
  const { 
    data: recentActivity, 
    isLoading: isLoadingActivity 
  } = useQuery({
    queryKey: ['translation-recent-activity', refreshKey],
    queryFn: async () => {
      const response = await fetch('/api/admin/translations/recent-activity?limit=5');
      if (!response.ok) throw new Error('Failed to fetch recent activity');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
    await refetchStats();
    toast({
      title: t('admin.translation.refreshed'),
      description: t('admin.translation.dataUpdated'),
    });
  };

  // Navigation handler
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate?.(tab);
  };

  // Quick actions
  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'export':
        // Trigger export dialog
        break;
      case 'import':
        // Trigger import dialog
        break;
      case 'sync':
        await handleRefresh();
        break;
      default:
        console.warn('Unknown quick action:', action);
    }
  };

  // Memoized statistics for performance
  const dashboardMetrics = useMemo(() => {
    if (!stats) return null;

    return {
      totalKeys: stats.total_keys,
      totalTranslations: stats.total_translations,
      completionRate: Math.round(stats.completion_rate.overall),
      pendingApprovals: stats.pending_approvals,
      missingTranslations: stats.missing_translations,
      qualityScore: Math.round(stats.quality_metrics.average_score),
    };
  }, [stats]);

  return (
    <div className={`translation-management-dashboard space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary flex items-center gap-3">
            <Languages size={32} className="text-primary" />
            {t('admin.translation.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.translation.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isLoadingStats}
            className="min-h-[48px]"
          >
            <RefreshCw 
              size={16} 
              className={`mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} 
            />
            {t('common.refresh')}
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleQuickAction('export')}
            className="min-h-[48px]"
          >
            <Download size={16} className="mr-2" />
            {t('common.export')}
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleQuickAction('import')}
            className="min-h-[48px]"
          >
            <Upload size={16} className="mr-2" />
            {t('common.import')}
          </Button>
          <Button 
            onClick={() => handleTabChange('editor')}
            className="min-h-[48px] bg-primary hover:bg-primary/90"
          >
            <FileText size={16} className="mr-2" />
            {t('admin.translation.newTranslation')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {statsError && (
        <Alert variant="destructive">
          <AlertTriangle size={16} />
          <AlertDescription>
            {t('admin.translation.errorLoadingStats')}: {statsError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Statistics Cards */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                {t('admin.translation.totalKeys')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatNumberLocale(dashboardMetrics.totalKeys)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumberLocale(dashboardMetrics.totalTranslations)} {t('admin.translation.totalTranslations')}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target size={16} className="text-green-600" />
                {t('admin.translation.completionRate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboardMetrics.completionRate}%
              </div>
              <Progress 
                value={dashboardMetrics.completionRate} 
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                {t('admin.translation.pendingApprovals')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatNumberLocale(dashboardMetrics.pendingApprovals)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('admin.translation.requiresReview')}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                {t('admin.translation.qualityScore')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardMetrics.qualityScore}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('admin.translation.averageQuality')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Insights */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity size={18} />
                {t('admin.translation.statusBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.status_breakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(status)}>
                        {t(`admin.translation.status.${status}`)}
                      </Badge>
                    </div>
                    <span className="font-medium">{formatNumberLocale(count)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Locale Completion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe size={18} />
                {t('admin.translation.localeCompletion')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.completion_rate.by_locale).map(([localeCode, rate]) => (
                  <div key={localeCode} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {getLocaleName(localeCode as Locale)}
                      </span>
                      <span className="text-sm font-medium">{Math.round(rate)}%</span>
                    </div>
                    <Progress value={rate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-6 h-12">
              <TabsTrigger value="overview" className="text-xs">
                <BarChart3 size={14} className="mr-1" />
                {t('admin.translation.tabs.overview')}
              </TabsTrigger>
              <TabsTrigger value="keys" className="text-xs">
                <FileText size={14} className="mr-1" />
                {t('admin.translation.tabs.keys')}
              </TabsTrigger>
              <TabsTrigger value="editor" className="text-xs">
                <Languages size={14} className="mr-1" />
                {t('admin.translation.tabs.editor')}
              </TabsTrigger>
              <TabsTrigger value="bulk" className="text-xs">
                <Upload size={14} className="mr-1" />
                {t('admin.translation.tabs.bulk')}
              </TabsTrigger>
              <TabsTrigger value="workflow" className="text-xs">
                <Users size={14} className="mr-1" />
                {t('admin.translation.tabs.workflow')}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">
                <TrendingUp size={14} className="mr-1" />
                {t('admin.translation.tabs.analytics')}
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity size={18} />
                    {t('admin.translation.recentActivity')}
                  </h3>
                  {isLoadingActivity ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : recentActivity?.length > 0 ? (
                    <div className="space-y-2">
                      {recentActivity.map((activity: any, index: number) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            <div>
                              <p className="text-sm font-medium">{activity.action}</p>
                              <p className="text-xs text-muted-foreground">
                                {activity.key} • {activity.locale}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateLocale(new Date(activity.timestamp), 'time')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      {t('admin.translation.noRecentActivity')}
                    </p>
                  )}
                </div>

                {/* Missing Translations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600" />
                    {t('admin.translation.missingTranslations')}
                  </h3>
                  {stats?.missing_translations > 0 ? (
                    <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                      <p className="text-sm text-amber-800">
                        {t('admin.translation.missingTranslationsCount', { 
                          count: stats.missing_translations 
                        })}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => handleTabChange('keys')}
                      >
                        {t('admin.translation.viewMissing')}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <p className="text-sm text-green-800">
                          {t('admin.translation.allTranslationsComplete')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="keys">
              <TranslationKeyManager 
                selectedKeys={[]}
                onSelectionChange={() => {}}
                onKeyEdit={() => {}}
                onKeyCreate={() => {}}
              />
            </TabsContent>

            <TabsContent value="editor">
              <TranslationEditor 
                onSave={() => {}}
                onCancel={() => {}}
              />
            </TabsContent>

            <TabsContent value="bulk">
              <BulkTranslationManager 
                selectedItems={[]}
                onOperationComplete={() => {}}
              />
            </TabsContent>

            <TabsContent value="workflow">
              <TranslationWorkflowManager 
                onStatusChange={() => {}}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <TranslationAnalyticsDashboard />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

// Helper functions
function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    case 'review':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'published':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

function getLocaleName(locale: Locale): string {
  const names = {
    en: 'English',
    fr: 'Français',
    th: 'ไทย'
  };
  return names[locale] || locale;
}

export default TranslationManagementDashboard;