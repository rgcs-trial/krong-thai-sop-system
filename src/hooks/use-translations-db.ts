/**
 * Enhanced useTranslations Hook with Database Integration
 * Restaurant Krong Thai SOP Management System
 * 
 * Provides type-safe translations with autocomplete, database integration,
 * real-time updates, intelligent caching, and ICU message format support
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useGlobalStore } from '@/lib/stores/global-store';
import { translationCache, type CacheStats } from '@/lib/translation-client-cache';
import { 
  type Locale,
  type GetTranslationsResponse,
  type GetTranslationByKeyResponse,
  type TrackTranslationUsageRequest,
  type TranslationUpdateEvent 
} from '@/types/translation';
import { 
  type AllTranslationKeys,
  type TranslationDomains,
  type RequiresVariables,
  type OptionalVariables,
  type TranslationHookOptions,
  type DomainKey,
  isValidTranslationKey,
  isValidDomain 
} from '@/types/translation-keys';

// Hook configuration
const HOOK_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  CACHE_TIME: 30 * 60 * 1000, // 30 minutes
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
  USAGE_TRACKING_DEBOUNCE: 1000,
  WEBSOCKET_RECONNECT_DELAY: 5000,
} as const;

// ICU message format parser (simplified implementation)
class ICUMessageParser {
  private static formatMessage(
    message: string, 
    variables: Record<string, string | number> = {}
  ): string {
    return message.replace(/\{([^}]+)\}/g, (match, key) => {
      if (key.includes(',')) {
        // Handle ICU format (plural, select, etc.)
        return ICUMessageParser.handleICUFormat(key, variables);
      }
      
      // Simple variable substitution
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }

  private static handleICUFormat(
    icuExpression: string, 
    variables: Record<string, string | number>
  ): string {
    const [varName, type, ...options] = icuExpression.split(',').map(s => s.trim());
    const value = variables[varName];

    if (type === 'plural') {
      return ICUMessageParser.handlePlural(value as number, options.join(','), variables);
    }
    
    if (type === 'select') {
      return ICUMessageParser.handleSelect(value as string, options.join(','), variables);
    }

    return String(value || '');
  }

  private static handlePlural(
    count: number, 
    rules: string, 
    variables: Record<string, string | number>
  ): string {
    const ruleMap = ICUMessageParser.parseOptions(rules);
    
    // Handle exact matches first
    if (ruleMap[`=${count}`]) {
      return ICUMessageParser.formatMessage(ruleMap[`=${count}`], { ...variables, '#': count });
    }
    
    // Handle plural rules
    if (count === 0 && ruleMap.zero) {
      return ICUMessageParser.formatMessage(ruleMap.zero, { ...variables, '#': count });
    }
    
    if (count === 1 && ruleMap.one) {
      return ICUMessageParser.formatMessage(ruleMap.one, { ...variables, '#': count });
    }
    
    if (ruleMap.other) {
      return ICUMessageParser.formatMessage(ruleMap.other, { ...variables, '#': count });
    }
    
    return String(count);
  }

  private static handleSelect(
    value: string, 
    options: string,
    variables: Record<string, string | number>
  ): string {
    const optionMap = ICUMessageParser.parseOptions(options);
    return ICUMessageParser.formatMessage(optionMap[value] || optionMap.other || value, variables);
  }

  private static parseOptions(optionsString: string): Record<string, string> {
    const options: Record<string, string> = {};
    const regex = /(\w+|=\d+)\s*\{([^}]*)\}/g;
    let match;
    
    while ((match = regex.exec(optionsString)) !== null) {
      options[match[1]] = match[2];
    }
    
    return options;
  }

  static format = ICUMessageParser.formatMessage;
}

// WebSocket manager for real-time updates
class TranslationWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(event: TranslationUpdateEvent) => void> = new Set();
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:3000/api/translations/ws'
        : `wss://${window.location.host}/api/translations/ws`;
        
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.debug('Translation WebSocket connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const updateEvent: TranslationUpdateEvent = JSON.parse(event.data);
          this.listeners.forEach(listener => listener(updateEvent));
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.warn('Translation WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.warn('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, HOOK_CONFIG.WEBSOCKET_RECONNECT_DELAY);
  }

  subscribe(listener: (event: TranslationUpdateEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.listeners.clear();
  }
}

// Singleton WebSocket manager
const wsManager = new TranslationWebSocketManager();

// Usage tracking manager
class UsageTracker {
  private queue: Set<string> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  track(key: string, locale: Locale, context?: string): void {
    this.queue.add(JSON.stringify({ key, locale, context }));
    this.debounceFlush();
  }

  private debounceFlush(): void {
    if (this.timer) clearTimeout(this.timer);
    
    this.timer = setTimeout(() => {
      this.flush();
    }, HOOK_CONFIG.USAGE_TRACKING_DEBOUNCE);
  }

  private async flush(): void {
    if (this.queue.size === 0) return;

    const entries = Array.from(this.queue).map(entry => JSON.parse(entry));
    this.queue.clear();

    // Group by locale
    const grouped = entries.reduce((acc, { key, locale, context }) => {
      if (!acc[locale]) acc[locale] = { keys: [], context };
      acc[locale].keys.push(key);
      return acc;
    }, {} as Record<Locale, { keys: string[]; context?: string }>);

    // Send tracking requests
    await Promise.allSettled(
      Object.entries(grouped).map(([locale, { keys, context }]) =>
        this.sendUsageTracking(locale as Locale, keys, context)
      )
    );
  }

  private async sendUsageTracking(
    locale: Locale, 
    keys: string[], 
    context?: string
  ): Promise<void> {
    try {
      const request: TrackTranslationUsageRequest = {
        keys,
        locale,
        context,
        sessionId: this.sessionId,
      };

      const response = await fetch('/api/translations/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Usage tracking failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to track translation usage:', error);
    }
  }
}

const usageTracker = new UsageTracker();

// Main hook implementation
export function useTranslations<T extends keyof TranslationDomains = never>(
  options: TranslationHookOptions & { namespace?: T } = {}
): {
  // Core translation function with overloads for type safety
  t: T extends keyof TranslationDomains
    ? <K extends DomainKey<T>>(
        key: K,
        ...args: RequiresVariables<`${T}.${K & string}`> extends never 
          ? [variables?: OptionalVariables<`${T}.${K & string}`>]
          : [variables: RequiresVariables<`${T}.${K & string}`>]
      ) => string
    : <K extends AllTranslationKeys>(
        key: K,
        ...args: RequiresVariables<K> extends never 
          ? [variables?: OptionalVariables<K>] 
          : [variables: RequiresVariables<K>]
      ) => string;

  // Utility functions
  tWithFallback: (key: string, fallback: string, variables?: Record<string, string | number>) => string;
  hasTranslation: (key: string) => boolean;
  getNamespaceTranslations: () => Record<string, string> | null;
  
  // State
  locale: Locale;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
  lastUpdated: string | null;
  
  // Cache management
  cacheStats: CacheStats;
  invalidateCache: (keys?: string[]) => void;
  prefetch: (namespaces?: string[]) => Promise<void>;
  
  // Real-time features
  isRealtime: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
} {
  const queryClient = useQueryClient();
  const { language: globalLanguage, isOnline } = useGlobalStore();
  const locale = globalLanguage as Locale;
  
  // State management
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [cacheStats, setCacheStats] = useState<CacheStats>(() => translationCache.getStats());
  
  // Refs for stable references
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Query key generation
  const queryKey = useMemo(() => {
    const key = ['translations', locale];
    if (options.namespace) key.push(options.namespace);
    return key;
  }, [locale, options.namespace]);

  // Fetch function
  const fetchTranslations = useCallback(async (): Promise<GetTranslationsResponse> => {
    // Try cache first
    const cached = translationCache.get(locale, options.namespace);
    if (cached && !optionsRef.current.realtime) {
      return cached;
    }

    // Fetch from API
    const url = options.namespace 
      ? `/api/translations/${locale}?namespace=${options.namespace}`
      : `/api/translations/${locale}`;
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch translations: ${response.status} ${response.statusText}`);
    }
    
    const data: GetTranslationsResponse = await response.json();
    
    // Cache the result
    translationCache.set(locale, data.translations, data.metadata, options.namespace);
    
    return data;
  }, [locale, options.namespace]);

  // Main query
  const {
    data,
    isLoading,
    error,
    isStale,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: fetchTranslations,
    enabled: isOnline && !optionsRef.current.lazy,
    staleTime: HOOK_CONFIG.STALE_TIME,
    gcTime: HOOK_CONFIG.CACHE_TIME,
    retry: HOOK_CONFIG.RETRY_COUNT,
    retryDelay: HOOK_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Real-time WebSocket subscription
  useEffect(() => {
    if (!options.realtime) return;

    const unsubscribe = wsManager.subscribe((event: TranslationUpdateEvent) => {
      if (event.locale === locale) {
        // Invalidate cache and refetch
        translationCache.invalidate({ locale: event.locale });
        queryClient.invalidateQueries({ queryKey });
        setCacheStats(translationCache.getStats());
      }
    });

    return unsubscribe;
  }, [locale, options.realtime, queryClient, queryKey]);

  // Update cache stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(translationCache.getStats());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Core translation function
  const translate = useCallback((
    key: string,
    variables?: Record<string, string | number>
  ): string => {
    // Validate key
    if (!isValidTranslationKey(key)) {
      console.warn(`Invalid translation key: ${key}`);
      return key;
    }

    // Track usage
    usageTracker.track(key, locale);

    // Get translation from data
    const translations = data?.translations;
    if (!translations) {
      return options.fallback || key;
    }

    // Handle namespaced keys
    const fullKey = options.namespace ? `${options.namespace}.${key}` : key;
    let translation = translations[fullKey] || translations[key];
    
    if (!translation) {
      console.warn(`Translation missing for key: ${fullKey}`);
      return options.fallback || key;
    }

    // Apply ICU formatting if variables provided
    if (variables && Object.keys(variables).length > 0) {
      try {
        translation = ICUMessageParser.format(translation, variables);
      } catch (error) {
        console.warn(`ICU formatting failed for key ${fullKey}:`, error);
      }
    }

    return translation;
  }, [data?.translations, locale, options.fallback, options.namespace]);

  // Translation function with fallback
  const tWithFallback = useCallback((
    key: string, 
    fallback: string, 
    variables?: Record<string, string | number>
  ): string => {
    try {
      const result = translate(key, variables);
      return result === key ? fallback : result;
    } catch {
      return fallback;
    }
  }, [translate]);

  // Check if translation exists
  const hasTranslation = useCallback((key: string): boolean => {
    const translations = data?.translations;
    if (!translations) return false;
    
    const fullKey = options.namespace ? `${options.namespace}.${key}` : key;
    return fullKey in translations || key in translations;
  }, [data?.translations, options.namespace]);

  // Get all translations for current namespace
  const getNamespaceTranslations = useCallback((): Record<string, string> | null => {
    const translations = data?.translations;
    if (!translations) return null;

    if (!options.namespace) return translations;

    const prefix = `${options.namespace}.`;
    const namespaceTranslations: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(translations)) {
      if (key.startsWith(prefix)) {
        const shortKey = key.substring(prefix.length);
        namespaceTranslations[shortKey] = value;
      }
    }
    
    return namespaceTranslations;
  }, [data?.translations, options.namespace]);

  // Cache invalidation
  const invalidateCache = useCallback((keys?: string[]) => {
    if (keys) {
      translationCache.invalidate({ 
        locale, 
        namespace: options.namespace,
        keys: keys as AllTranslationKeys[]
      });
    } else {
      translationCache.invalidate({ locale, namespace: options.namespace });
    }
    
    queryClient.invalidateQueries({ queryKey });
    setCacheStats(translationCache.getStats());
  }, [locale, options.namespace, queryClient, queryKey]);

  // Prefetch function
  const prefetch = useCallback(async (namespaces?: string[]) => {
    const namespacesToPrefetch = namespaces || (options.namespace ? [options.namespace] : []);
    await translationCache.prefetch(locale, namespacesToPrefetch);
    setCacheStats(translationCache.getStats());
  }, [locale, options.namespace]);

  return {
    t: translate as any, // Type assertion needed due to complex overloads
    tWithFallback,
    hasTranslation,
    getNamespaceTranslations,
    locale,
    isLoading: isLoading && !translationCache.has(locale, options.namespace),
    error: error as Error | null,
    isStale,
    lastUpdated: data?.metadata.lastUpdated || null,
    cacheStats,
    invalidateCache,
    prefetch,
    isRealtime: Boolean(options.realtime),
    connectionStatus,
  };
}

// Specialized hooks for common domains
export function useCommonTranslations() {
  return useTranslations({ namespace: 'common' as const });
}

export function useAuthTranslations() {
  return useTranslations({ namespace: 'auth' as const });
}

export function useSopTranslations() {
  return useTranslations({ namespace: 'sop' as const });
}

export function useNavigationTranslations() {
  return useTranslations({ namespace: 'navigation' as const });
}

export function useSearchTranslations() {
  return useTranslations({ namespace: 'search' as const });
}

export function useDashboardTranslations() {
  return useTranslations({ namespace: 'dashboard' as const });
}

export function useAnalyticsTranslations() {
  return useTranslations({ namespace: 'analytics' as const });
}

export function useTrainingTranslations() {
  return useTranslations({ namespace: 'training' as const });
}

// Hook for managing translation loading states across the app
export function useTranslationLoader() {
  const queryClient = useQueryClient();
  const { language } = useGlobalStore();
  
  const preloadAll = useMutation({
    mutationFn: async () => {
      const domains = ['common', 'auth', 'sop', 'navigation', 'search', 'dashboard'];
      await translationCache.prefetch(language as Locale, domains, 'high');
      
      // Prefetch queries
      await Promise.allSettled(
        domains.map(domain =>
          queryClient.prefetchQuery({
            queryKey: ['translations', language, domain],
            queryFn: () => fetch(`/api/translations/${language}?namespace=${domain}`).then(r => r.json()),
            staleTime: HOOK_CONFIG.STALE_TIME,
          })
        )
      );
    },
  });

  return {
    preloadAll: preloadAll.mutate,
    isPreloading: preloadAll.isPending,
    preloadError: preloadAll.error,
  };
}

// Alias for useTranslations for backward compatibility with task components
export const useTranslationsDB = useTranslations;

// Utility for development and debugging
export const translationDevUtils = {
  /**
   * Get cache statistics
   */
  getCacheStats: () => translationCache.getStats(),

  /**
   * Clear all cached translations
   */
  clearCache: () => translationCache.clear(),

  /**
   * Get all cache entries for debugging
   */
  getCacheEntries: () => translationCache.getEntries(),

  /**
   * Validate translation key structure
   */
  validateKey: isValidTranslationKey,

  /**
   * Test ICU message formatting
   */
  testICU: (message: string, variables: Record<string, string | number>) =>
    ICUMessageParser.format(message, variables),

  /**
   * Disconnect WebSocket (for testing)
   */
  disconnectWebSocket: () => wsManager.disconnect(),
};