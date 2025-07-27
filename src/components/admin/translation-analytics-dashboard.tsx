'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart3,
  TrendingUp,
  Globe,
  Clock,
  Users,
  Zap,
  AlertTriangle,
  RefreshCw,
  Download
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import type { 
  TranslationAnalyticsDashboardProps,
  TranslationAnalyticsData,
  Locale
} from '@/types/translation-admin';

/**
 * Translation Analytics Dashboard Component
 * Displays usage statistics, performance metrics, and insights
 */
export function TranslationAnalyticsDashboard({
  className = '',
  dateRange = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  },
  refreshInterval = 300000 // 5 minutes
}: TranslationAnalyticsDashboardProps) {
  const { t, formatNumberLocale, formatDateLocale } = useI18n();
  
  // State management
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedLocale, setSelectedLocale] = useState<Locale | 'all'>('all');

  // Fetch analytics data
  const { 
    data: analyticsData, 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['translation-analytics', selectedPeriod, selectedLocale],
    queryFn: async (): Promise<TranslationAnalyticsData> => {
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(selectedLocale !== 'all' && { locale: selectedLocale })
      });
      
      const response = await fetch(`/api/admin/translations/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Memoized statistics
  const keyMetrics = useMemo(() => {
    if (!analyticsData) return null;

    return {
      totalRequests: analyticsData.usage_trends.reduce((sum, day) => sum + day.total_requests, 0),
      avgResponseTime: analyticsData.performance_metrics.average_response_time,
      cacheHitRate: analyticsData.performance_metrics.cache_hit_rate,
      errorRate: analyticsData.performance_metrics.error_rate,
      uptime: analyticsData.performance_metrics.uptime
    };
  }, [analyticsData]);

  return (
    <div className={`translation-analytics-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <BarChart3 size={20} />
            {t('admin.translation.analytics')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.translation.analyticsDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('admin.translation.last7Days')}</SelectItem>
              <SelectItem value="30d">{t('admin.translation.last30Days')}</SelectItem>
              <SelectItem value="90d">{t('admin.translation.last90Days')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedLocale} onValueChange={(value: any) => setSelectedLocale(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.translation.allLocales')}</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="th">ไทย</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {keyMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumberLocale(keyMetrics.totalRequests)}
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.totalRequests')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {keyMetrics.avgResponseTime.toFixed(0)}ms
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.avgResponseTime')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(keyMetrics.cacheHitRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.cacheHitRate')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {(keyMetrics.errorRate * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.errorRate')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-teal-600">
                {(keyMetrics.uptime * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.uptime')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <TrendingUp size={16} />
            {t('admin.translation.usage')}
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap size={16} />
            {t('admin.translation.performance')}
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Globe size={16} />
            {t('admin.translation.quality')}
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertTriangle size={16} />
            {t('admin.translation.issues')}
          </TabsTrigger>
        </TabsList>

        {/* Usage Analytics */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Keys */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('admin.translation.popularKeys')}</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData?.popular_keys?.length > 0 ? (
                  <div className="space-y-3">
                    {analyticsData.popular_keys.slice(0, 10).map((key, index) => (
                      <div key={key.key} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs truncate">{key.key}</p>
                          <p className="text-xs text-muted-foreground">{key.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {formatNumberLocale(key.usage_count)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    {t('admin.translation.noUsageData')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Usage by Locale */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('admin.translation.usageByLocale')}</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData?.usage_trends?.length > 0 ? (
                  <div className="space-y-4">
                    {(['en', 'fr', 'th'] as Locale[]).map(locale => (
                      <div key={locale} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{locale.toUpperCase()}</span>
                          <span className="text-sm">
                            {analyticsData.quality_metrics.completion_rates[locale]?.toFixed(1) || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2" 
                            style={{ 
                              width: `${analyticsData.quality_metrics.completion_rates[locale] || 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    {t('admin.translation.noLocaleData')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Analytics */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('admin.translation.performanceMetrics')}</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 border rounded">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('admin.translation.avgResponseTime')}
                      </div>
                      <div className="text-2xl font-bold">
                        {analyticsData.performance_metrics.average_response_time.toFixed(0)}ms
                      </div>
                    </div>
                    <div className="p-4 border rounded">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('admin.translation.cacheHitRate')}
                      </div>
                      <div className="text-2xl font-bold">
                        {(analyticsData.performance_metrics.cache_hit_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 border rounded">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('admin.translation.errorRate')}
                      </div>
                      <div className="text-2xl font-bold">
                        {(analyticsData.performance_metrics.error_rate * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-4 border rounded">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('admin.translation.uptime')}
                      </div>
                      <div className="text-2xl font-bold">
                        {(analyticsData.performance_metrics.uptime * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t('admin.translation.noPerformanceData')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Analytics */}
        <TabsContent value="quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('admin.translation.qualityMetrics')}</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData ? (
                <div className="space-y-6">
                  {/* Completion Rates */}
                  <div>
                    <h4 className="font-medium mb-4">{t('admin.translation.completionRates')}</h4>
                    <div className="space-y-3">
                      {Object.entries(analyticsData.quality_metrics.completion_rates).map(([locale, rate]) => (
                        <div key={locale} className="flex items-center justify-between">
                          <span className="font-medium">{locale.toUpperCase()}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div 
                                className="bg-green-500 rounded-full h-2" 
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {rate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review Status */}
                  <div>
                    <h4 className="font-medium mb-4">{t('admin.translation.reviewStatus')}</h4>
                    <div className="space-y-3">
                      {Object.entries(analyticsData.quality_metrics.review_status).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <Badge variant="outline">
                            {t(`admin.translation.status.${status}`)}
                          </Badge>
                          <span className="font-medium">{formatNumberLocale(count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t('admin.translation.noQualityData')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Analytics */}
        <TabsContent value="issues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('admin.translation.missingTranslations')}</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData?.missing_translations?.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.translation.key')}</TableHead>
                        <TableHead>{t('admin.translation.category')}</TableHead>
                        <TableHead>{t('admin.translation.missingLocales')}</TableHead>
                        <TableHead>{t('admin.translation.priority')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData.missing_translations.map((missing, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">{missing.key}</TableCell>
                          <TableCell>{missing.category}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {missing.missing_locales.map(locale => (
                                <Badge key={locale} variant="outline" className="text-xs">
                                  {locale.toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={missing.priority === 'high' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {missing.priority}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{t('admin.translation.noMissingTranslations')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TranslationAnalyticsDashboard;