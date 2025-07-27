/**
 * Enhanced Translation System Example Component
 * Restaurant Krong Thai SOP Management System
 * 
 * Demonstrates usage of the new type-safe useTranslations hook with:
 * - Full TypeScript autocomplete
 * - Database integration
 * - Real-time updates
 * - ICU message formatting
 * - Analytics tracking
 * - Performance monitoring
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  useTranslations,
  useCommonTranslations,
  useSopTranslations,
  useSearchTranslations,
  useTranslationLoader,
  translationDevUtils 
} from '@/hooks/use-translations-db';
import { useTranslationAnalytics } from '@/lib/translation-analytics';
import { useTranslationWebSocket } from '@/lib/translation-websocket';
import { cacheUtils } from '@/lib/translation-client-cache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/**
 * Example component showing basic translation usage with type safety
 */
export function BasicTranslationExample() {
  // ✅ Type-safe hook with full autocomplete
  const { t, hasTranslation, isLoading, error } = useCommonTranslations();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{t('welcome')}</CardTitle> {/* ✅ Full autocomplete */}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic translations with type safety */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline">{t('save')}</Button>
          <Button variant="outline">{t('cancel')}</Button>
          <Button variant="outline">{t('edit')}</Button>
          <Button variant="outline">{t('delete')}</Button>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          <Badge variant={isLoading ? 'default' : 'secondary'}>
            {isLoading ? t('loading') : t('success')}
          </Badge>
          {error && (
            <Badge variant="destructive">{t('error')}</Badge>
          )}
        </div>

        {/* Translation validation */}
        <div className="text-sm text-muted-foreground">
          Has welcome translation: {hasTranslation('welcome') ? '✅' : '❌'}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Advanced example with ICU message formatting and variables
 */
export function ICUFormattingExample() {
  const { t } = useSearchTranslations();
  const [searchResults, setSearchResults] = useState({ count: 0, query: '' });

  // Simulate search
  const performSearch = (query: string) => {
    const count = Math.floor(Math.random() * 100);
    setSearchResults({ count, query });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>ICU Message Formatting Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={() => performSearch('food safety')}>
            Search "food safety"
          </Button>
          <Button onClick={() => performSearch('cleaning')}>
            Search "cleaning"
          </Button>
        </div>

        {searchResults.count > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            {/* ✅ ICU message with type-safe variables */}
            <p>{t('resultsCount', { 
              count: searchResults.count, 
              query: searchResults.query 
            })}</p>
            
            {/* Conditional pluralization example */}
            <p className="text-sm text-muted-foreground mt-2">
              {searchResults.count === 1 ? 'One result found' : `${searchResults.count} results found`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Real-time translation updates example
 */
export function RealTimeTranslationExample() {
  const { t, isRealtime, connectionStatus, lastUpdated } = useTranslations({ 
    realtime: true 
  });
  const { connectionState } = useTranslationWebSocket({
    locales: ['en', 'fr'],
    namespaces: ['common', 'sop'],
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Real-time Translation Updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={isRealtime ? 'default' : 'secondary'}>
            Real-time: {isRealtime ? 'Enabled' : 'Disabled'}
          </Badge>
          <Badge variant={
            connectionState === 'connected' ? 'default' : 
            connectionState === 'connecting' ? 'secondary' : 'destructive'
          }>
            WebSocket: {connectionState}
          </Badge>
        </div>

        {lastUpdated && (
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}

        <div className="space-y-2">
          <p>{t('common.welcome')}</p>
          <p className="text-sm text-muted-foreground">
            This translation will update automatically when changed in the admin panel
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Performance monitoring and cache management example
 */
export function PerformanceExample() {
  const { cacheStats, invalidateCache, prefetch } = useTranslations();
  const { metrics } = useTranslationAnalytics();
  const [isPrefetching, setIsPrefetching] = useState(false);

  const handlePrefetch = async () => {
    setIsPrefetching(true);
    try {
      await prefetch(['common', 'sop', 'navigation']);
    } finally {
      setIsPrefetching(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Performance & Cache Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cache Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Cache Stats</h4>
            <div className="text-sm space-y-1">
              <div>Entries: {cacheStats.totalEntries}</div>
              <div>Hit Rate: {(cacheStats.hitRate * 100).toFixed(1)}%</div>
              <div>Size: {(cacheStats.totalSize / 1024).toFixed(1)} KB</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Performance</h4>
            <div className="text-sm space-y-1">
              <div>Avg Load: {metrics.averageLoadTime.toFixed(1)}ms</div>
              <div>Requests: {metrics.sessionMetrics.translationRequests}</div>
              <div>Errors: {metrics.sessionMetrics.errors}</div>
            </div>
          </div>
        </div>

        {/* Progress bar for cache hit rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Cache Hit Rate</span>
            <span>{(cacheStats.hitRate * 100).toFixed(1)}%</span>
          </div>
          <Progress value={cacheStats.hitRate * 100} />
        </div>

        {/* Cache management actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePrefetch}
            disabled={isPrefetching}
          >
            {isPrefetching ? 'Prefetching...' : 'Prefetch Translations'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => invalidateCache()}
          >
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Namespace-specific translation example
 */
export function NamespaceExample() {
  const sopT = useSopTranslations();
  const commonT = useCommonTranslations();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Namespace-specific Translations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SOP-specific translations */}
        <div className="space-y-2">
          <h4 className="font-medium">{sopT.t('title')}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Badge variant="outline">{sopT.t('active')}</Badge>
            <Badge variant="outline">{sopT.t('high')}</Badge>
            <Badge variant="secondary">{sopT.t('version')}</Badge>
            <Badge variant="secondary">{sopT.t('status')}</Badge>
          </div>
        </div>

        {/* Common translations */}
        <div className="space-y-2">
          <h4 className="font-medium">Common Actions</h4>
          <div className="flex gap-2">
            <Button size="sm">{commonT.t('save')}</Button>
            <Button size="sm" variant="outline">{commonT.t('edit')}</Button>
            <Button size="sm" variant="destructive">{commonT.t('delete')}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Translation debugging and development tools
 */
export function DevelopmentToolsExample() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const showDebugInfo = () => {
    const info = {
      cacheStats: translationDevUtils.getCacheStats(),
      cacheEntries: translationDevUtils.getCacheEntries().slice(0, 5), // First 5 entries
      testICU: translationDevUtils.testICU(
        'Found {count, plural, =0 {no results} =1 {one result} other {# results}}',
        { count: 5 }
      ),
    };
    setDebugInfo(info);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Development Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={showDebugInfo}>Show Debug Info</Button>
          <Button 
            variant="outline" 
            onClick={() => translationDevUtils.clearCache()}
          >
            Clear Cache
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Translation preloading example
 */
export function PreloadingExample() {
  const { preloadAll, isPreloading, preloadError } = useTranslationLoader();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Translation Preloading</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Preload all translation domains for faster subsequent access
        </p>

        <Button 
          onClick={preloadAll}
          disabled={isPreloading}
          className="w-full"
        >
          {isPreloading ? 'Preloading...' : 'Preload All Translations'}
        </Button>

        {preloadError && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            Error: {preloadError.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Complete example component showing all features
 */
export function EnhancedTranslationShowcase() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Enhanced Translation System</h1>
        <p className="text-muted-foreground">
          Complete type-safe translation system with database integration, 
          real-time updates, and comprehensive analytics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BasicTranslationExample />
        <ICUFormattingExample />
        <RealTimeTranslationExample />
        <PerformanceExample />
        <NamespaceExample />
        <PreloadingExample />
      </div>

      <div className="w-full">
        <DevelopmentToolsExample />
      </div>
    </div>
  );
}

export default EnhancedTranslationShowcase;