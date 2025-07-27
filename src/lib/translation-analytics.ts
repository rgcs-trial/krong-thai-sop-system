/**
 * Translation Usage Analytics Integration
 * Restaurant Krong Thai SOP Management System
 * 
 * Provides comprehensive analytics tracking for translation usage patterns,
 * performance monitoring, and optimization insights
 */

'use client';

import { 
  type Locale,
  type TrackTranslationUsageRequest,
  type TrackTranslationUsageResponse,
  type TranslationAnalyticsParams,
  type TranslationAnalyticsResponse 
} from '@/types/translation';
import { type AllTranslationKeys } from '@/types/translation-keys';

// Analytics configuration
const ANALYTICS_CONFIG = {
  BATCH_SIZE: 50,
  FLUSH_INTERVAL: 5000, // 5 seconds
  MAX_QUEUE_SIZE: 1000,
  STORAGE_KEY: 'krong-thai-translation-analytics',
  SESSION_DURATION: 30 * 60 * 1000, // 30 minutes
  DEBOUNCE_DELAY: 1000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 2000,
} as const;

// Usage event structure
export interface UsageEvent {
  key: string;
  locale: Locale;
  timestamp: number;
  sessionId: string;
  userId?: string;
  context?: string;
  loadTime?: number;
  cacheHit?: boolean;
  source: 'hook' | 'direct' | 'fallback';
  namespace?: string;
}

// Session analytics
export interface SessionAnalytics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  locale: Locale;
  userId?: string;
  pageViews: number;
  translationRequests: number;
  uniqueKeys: Set<string>;
  avgLoadTime: number;
  cacheHitRate: number;
  errors: number;
  contexts: Set<string>;
}

// Performance metrics
export interface PerformanceMetrics {
  averageLoadTime: number;
  cacheHitRate: number;
  errorRate: number;
  keyUsageFrequency: Map<string, number>;
  localeDistribution: Map<Locale, number>;
  sessionMetrics: SessionAnalytics;
  hotKeys: Array<{ key: string; count: number; avgTime: number }>;
  slowKeys: Array<{ key: string; avgTime: number; count: number }>;
}

// Analytics event types
export type AnalyticsEventType = 
  | 'translation_request'
  | 'translation_loaded'
  | 'translation_error'
  | 'cache_hit'
  | 'cache_miss'
  | 'fallback_used'
  | 'session_start'
  | 'session_end';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  data: any;
  timestamp: number;
  sessionId: string;
}

/**
 * Translation Analytics Manager
 */
export class TranslationAnalyticsManager {
  private queue: UsageEvent[] = [];
  private session: SessionAnalytics;
  private flushTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private performance: PerformanceMetrics;
  private eventListeners: Map<AnalyticsEventType, Set<(event: AnalyticsEvent) => void>> = new Map();

  constructor(userId?: string) {
    this.session = this.createSession(userId);
    this.performance = this.initializePerformanceMetrics();
    
    // Load existing analytics from storage
    this.loadFromStorage();
    
    // Start periodic flushing
    this.startPeriodicFlush();
    
    // Handle page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      window.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Track translation usage
   */
  public track(
    key: AllTranslationKeys,
    locale: Locale,
    options: {
      context?: string;
      loadTime?: number;
      cacheHit?: boolean;
      source?: 'hook' | 'direct' | 'fallback';
      namespace?: string;
      userId?: string;
    } = {}
  ): void {
    const event: UsageEvent = {
      key,
      locale,
      timestamp: Date.now(),
      sessionId: this.session.sessionId,
      userId: options.userId || this.session.userId,
      context: options.context,
      loadTime: options.loadTime,
      cacheHit: options.cacheHit,
      source: options.source || 'hook',
      namespace: options.namespace,
    };

    this.addToQueue(event);
    this.updateSessionMetrics(event);
    this.updatePerformanceMetrics(event);
    
    // Emit analytics event
    this.emitEvent('translation_request', event);
    
    if (options.cacheHit) {
      this.emitEvent('cache_hit', event);
    } else {
      this.emitEvent('cache_miss', event);
    }
    
    this.debouncedFlush();
  }

  /**
   * Track translation loading completion
   */
  public trackLoaded(
    key: AllTranslationKeys,
    locale: Locale,
    loadTime: number,
    cacheHit: boolean = false
  ): void {
    const event = {
      key,
      locale,
      loadTime,
      cacheHit,
      timestamp: Date.now(),
      sessionId: this.session.sessionId,
    };

    this.emitEvent('translation_loaded', event);
    this.updateLoadTimeMetrics(key, loadTime);
  }

  /**
   * Track translation errors
   */
  public trackError(
    key: AllTranslationKeys,
    locale: Locale,
    error: Error,
    context?: string
  ): void {
    const event = {
      key,
      locale,
      error: error.message,
      context,
      timestamp: Date.now(),
      sessionId: this.session.sessionId,
    };

    this.session.errors++;
    this.emitEvent('translation_error', event);
  }

  /**
   * Track fallback usage
   */
  public trackFallback(
    key: AllTranslationKeys,
    locale: Locale,
    fallbackValue: string,
    reason: string
  ): void {
    const event = {
      key,
      locale,
      fallbackValue,
      reason,
      timestamp: Date.now(),
      sessionId: this.session.sessionId,
    };

    this.emitEvent('fallback_used', event);
  }

  /**
   * Get current session analytics
   */
  public getSessionMetrics(): SessionAnalytics {
    return {
      ...this.session,
      uniqueKeys: new Set(this.session.uniqueKeys),
      contexts: new Set(this.session.contexts),
    };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return {
      ...this.performance,
      keyUsageFrequency: new Map(this.performance.keyUsageFrequency),
      localeDistribution: new Map(this.performance.localeDistribution),
      sessionMetrics: this.getSessionMetrics(),
    };
  }

  /**
   * Get analytics report
   */
  public async getAnalyticsReport(params: TranslationAnalyticsParams): Promise<TranslationAnalyticsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.date_from) queryParams.set('date_from', params.date_from);
      if (params.date_to) queryParams.set('date_to', params.date_to);
      if (params.locale) queryParams.set('locale', params.locale);
      if (params.category) queryParams.set('category', params.category);
      if (params.group_by) queryParams.set('group_by', params.group_by);

      const response = await fetch(`/api/translations/analytics?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch analytics report:', error);
      throw error;
    }
  }

  /**
   * Subscribe to analytics events
   */
  public on(eventType: AnalyticsEventType, handler: (event: AnalyticsEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(handler);
    
    return () => {
      this.eventListeners.get(eventType)?.delete(handler);
    };
  }

  /**
   * Clear all analytics data
   */
  public clear(): void {
    this.queue = [];
    this.session = this.createSession(this.session.userId);
    this.performance = this.initializePerformanceMetrics();
    this.clearStorage();
    this.emitEvent('session_start', { sessionId: this.session.sessionId });
  }

  /**
   * Export analytics data
   */
  public exportData(): {
    session: SessionAnalytics;
    performance: PerformanceMetrics;
    queuedEvents: UsageEvent[];
  } {
    return {
      session: this.getSessionMetrics(),
      performance: this.getPerformanceMetrics(),
      queuedEvents: [...this.queue],
    };
  }

  /**
   * Force flush all queued events
   */
  public async flush(): Promise<void> {
    await this.flushQueue();
  }

  /**
   * Destroy analytics manager
   */
  public destroy(): void {
    this.session.endTime = Date.now();
    this.emitEvent('session_end', this.getSessionMetrics());
    
    // Flush remaining events
    this.flushQueue();
    
    // Clean up timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Save final state
    this.saveToStorage();
  }

  /**
   * Create new session
   */
  private createSession(userId?: string): SessionAnalytics {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sessionId,
      startTime: Date.now(),
      locale: 'en', // Default, will be updated on first usage
      userId,
      pageViews: 1,
      translationRequests: 0,
      uniqueKeys: new Set(),
      avgLoadTime: 0,
      cacheHitRate: 0,
      errors: 0,
      contexts: new Set(),
    };
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      averageLoadTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      keyUsageFrequency: new Map(),
      localeDistribution: new Map(),
      sessionMetrics: this.session,
      hotKeys: [],
      slowKeys: [],
    };
  }

  /**
   * Add event to queue
   */
  private addToQueue(event: UsageEvent): void {
    if (this.queue.length >= ANALYTICS_CONFIG.MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest event
    }
    
    this.queue.push(event);
  }

  /**
   * Update session metrics
   */
  private updateSessionMetrics(event: UsageEvent): void {
    this.session.translationRequests++;
    this.session.uniqueKeys.add(event.key);
    this.session.locale = event.locale;
    
    if (event.context) {
      this.session.contexts.add(event.context);
    }
    
    // Update average load time
    if (event.loadTime !== undefined) {
      const currentAvg = this.session.avgLoadTime;
      const count = this.session.translationRequests;
      this.session.avgLoadTime = (currentAvg * (count - 1) + event.loadTime) / count;
    }
    
    // Update cache hit rate
    if (event.cacheHit !== undefined) {
      const hits = this.queue.filter(e => e.cacheHit === true).length;
      const total = this.queue.filter(e => e.cacheHit !== undefined).length;
      this.session.cacheHitRate = total > 0 ? hits / total : 0;
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(event: UsageEvent): void {
    // Update key usage frequency
    const currentCount = this.performance.keyUsageFrequency.get(event.key) || 0;
    this.performance.keyUsageFrequency.set(event.key, currentCount + 1);
    
    // Update locale distribution
    const localeCount = this.performance.localeDistribution.get(event.locale) || 0;
    this.performance.localeDistribution.set(event.locale, localeCount + 1);
    
    // Update hot keys (top 10 most used)
    this.updateHotKeys();
    
    // Update slow keys (keys with highest average load time)
    if (event.loadTime !== undefined) {
      this.updateSlowKeys(event.key, event.loadTime);
    }
  }

  /**
   * Update load time metrics
   */
  private updateLoadTimeMetrics(key: string, loadTime: number): void {
    // Update global average
    const events = this.queue.filter(e => e.loadTime !== undefined);
    const totalTime = events.reduce((sum, e) => sum + (e.loadTime || 0), 0);
    this.performance.averageLoadTime = events.length > 0 ? totalTime / events.length : 0;
    
    // Update slow keys
    this.updateSlowKeys(key, loadTime);
  }

  /**
   * Update hot keys list
   */
  private updateHotKeys(): void {
    const sortedKeys = Array.from(this.performance.keyUsageFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    this.performance.hotKeys = sortedKeys.map(([key, count]) => {
      const keyEvents = this.queue.filter(e => e.key === key && e.loadTime !== undefined);
      const avgTime = keyEvents.length > 0 
        ? keyEvents.reduce((sum, e) => sum + (e.loadTime || 0), 0) / keyEvents.length
        : 0;
      
      return { key, count, avgTime };
    });
  }

  /**
   * Update slow keys list
   */
  private updateSlowKeys(key: string, loadTime: number): void {
    const existingIndex = this.performance.slowKeys.findIndex(item => item.key === key);
    
    if (existingIndex >= 0) {
      const existing = this.performance.slowKeys[existingIndex];
      const newCount = existing.count + 1;
      const newAvgTime = (existing.avgTime * existing.count + loadTime) / newCount;
      
      this.performance.slowKeys[existingIndex] = {
        key,
        avgTime: newAvgTime,
        count: newCount,
      };
    } else {
      this.performance.slowKeys.push({
        key,
        avgTime: loadTime,
        count: 1,
      });
    }
    
    // Keep only top 10 slowest keys
    this.performance.slowKeys = this.performance.slowKeys
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
  }

  /**
   * Emit analytics event
   */
  private emitEvent(type: AnalyticsEventType, data: any): void {
    const event: AnalyticsEvent = {
      type,
      data,
      timestamp: Date.now(),
      sessionId: this.session.sessionId,
    };
    
    this.eventListeners.get(type)?.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.warn('Analytics event handler error:', error);
      }
    });
  }

  /**
   * Debounced flush
   */
  private debouncedFlush = (): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.flushQueue();
    }, ANALYTICS_CONFIG.DEBOUNCE_DELAY);
  };

  /**
   * Flush queued events to server
   */
  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const eventsToSend = this.queue.splice(0, ANALYTICS_CONFIG.BATCH_SIZE);
    
    try {
      const request: TrackTranslationUsageRequest = {
        keys: eventsToSend.map(e => e.key),
        locale: this.session.locale,
        context: Array.from(this.session.contexts).join(','),
        sessionId: this.session.sessionId,
        userId: this.session.userId,
      };

      const response = await fetch('/api/translations/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Analytics tracking failed: ${response.status}`);
      }

      const result: TrackTranslationUsageResponse = await response.json();
      
      // Continue flushing if there are more events
      if (this.queue.length > 0) {
        setTimeout(() => this.flushQueue(), 100);
      }
      
    } catch (error) {
      console.warn('Failed to send analytics data:', error);
      // Re-add events to queue for retry
      this.queue.unshift(...eventsToSend);
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, ANALYTICS_CONFIG.FLUSH_INTERVAL);
  }

  /**
   * Handle page before unload
   */
  private handleBeforeUnload = (): void => {
    this.session.endTime = Date.now();
    this.flushQueue();
    this.saveToStorage();
  };

  /**
   * Handle visibility change
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.flushQueue();
      this.saveToStorage();
    }
  };

  /**
   * Save analytics to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data = {
        session: {
          ...this.session,
          uniqueKeys: Array.from(this.session.uniqueKeys),
          contexts: Array.from(this.session.contexts),
        },
        performance: {
          ...this.performance,
          keyUsageFrequency: Array.from(this.performance.keyUsageFrequency.entries()),
          localeDistribution: Array.from(this.performance.localeDistribution.entries()),
        },
        queue: this.queue,
      };
      
      localStorage.setItem(ANALYTICS_CONFIG.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save analytics to storage:', error);
    }
  }

  /**
   * Load analytics from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(ANALYTICS_CONFIG.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.session) {
        this.session = {
          ...data.session,
          uniqueKeys: new Set(data.session.uniqueKeys || []),
          contexts: new Set(data.session.contexts || []),
        };
      }
      
      if (data.performance) {
        this.performance = {
          ...data.performance,
          keyUsageFrequency: new Map(data.performance.keyUsageFrequency || []),
          localeDistribution: new Map(data.performance.localeDistribution || []),
          sessionMetrics: this.session,
        };
      }
      
      if (data.queue) {
        this.queue = data.queue;
      }
    } catch (error) {
      console.warn('Failed to load analytics from storage:', error);
    }
  }

  /**
   * Clear storage
   */
  private clearStorage(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(ANALYTICS_CONFIG.STORAGE_KEY);
  }
}

// Create singleton instance
export const translationAnalytics = new TranslationAnalyticsManager();

// React hook for analytics integration
export function useTranslationAnalytics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => 
    translationAnalytics.getPerformanceMetrics()
  );
  
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(translationAnalytics.getPerformanceMetrics());
    };
    
    // Subscribe to analytics events
    const unsubscribes = [
      translationAnalytics.on('translation_request', updateMetrics),
      translationAnalytics.on('translation_loaded', updateMetrics),
      translationAnalytics.on('translation_error', updateMetrics),
    ];
    
    // Periodic updates
    const interval = setInterval(updateMetrics, 5000);
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearInterval(interval);
    };
  }, []);
  
  return {
    metrics,
    sessionMetrics: translationAnalytics.getSessionMetrics(),
    getReport: translationAnalytics.getAnalyticsReport.bind(translationAnalytics),
    exportData: translationAnalytics.exportData.bind(translationAnalytics),
    clear: translationAnalytics.clear.bind(translationAnalytics),
  };
}

// Export utilities
export const analyticsUtils = {
  getMetrics: () => translationAnalytics.getPerformanceMetrics(),
  getSession: () => translationAnalytics.getSessionMetrics(),
  exportData: () => translationAnalytics.exportData(),
  clear: () => translationAnalytics.clear(),
  flush: () => translationAnalytics.flush(),
};