/**
 * Performance Monitoring System for Restaurant Krong Thai SOP Management
 * Tracks Web Vitals, custom metrics, and tablet-specific performance indicators
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

// Performance metrics interface
interface PerformanceMetrics {
  // Core Web Vitals
  cls?: number;  // Cumulative Layout Shift
  fid?: number;  // First Input Delay
  fcp?: number;  // First Contentful Paint
  lcp?: number;  // Largest Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  sopLoadTime?: number;
  searchLatency?: number;
  imageLoadTime?: number;
  offlineAccessTime?: number;
  
  // Device information
  deviceType: 'tablet' | 'mobile' | 'desktop';
  connectionType: string;
  screenSize: string;
  memoryInfo?: {
    used: number;
    total: number;
    jsHeapSizeLimit: number;
  };
  
  // Context
  userAgent: string;
  timestamp: number;
  url: string;
  language: string;
}

// Performance thresholds (optimized for tablets)
const PERFORMANCE_THRESHOLDS = {
  lcp: { good: 2000, needsImprovement: 3000 }, // Largest Contentful Paint
  fid: { good: 50, needsImprovement: 200 },    // First Input Delay
  cls: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  fcp: { good: 1500, needsImprovement: 2500 }, // First Contentful Paint
  ttfb: { good: 500, needsImprovement: 1000 }, // Time to First Byte
  sopLoad: { good: 1000, needsImprovement: 2000 }, // SOP document load time
  search: { good: 300, needsImprovement: 800 },     // Search response time
};

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;
  private analyticsEndpoint: string = '/api/analytics/performance';

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Collect basic device information
    this.collectDeviceInfo();

    // Initialize Web Vitals monitoring
    this.initializeWebVitals();

    // Initialize custom performance observers
    this.initializeCustomObservers();

    // Monitor network changes
    this.monitorNetworkChanges();

    // Monitor memory usage (if available)
    this.monitorMemoryUsage();

    // Send metrics periodically
    this.scheduleMetricsSending();
  }

  private collectDeviceInfo(): void {
    const userAgent = navigator.userAgent;
    this.metrics.userAgent = userAgent;
    this.metrics.timestamp = Date.now();
    this.metrics.url = window.location.href;
    this.metrics.language = navigator.language;
    this.metrics.screenSize = `${screen.width}x${screen.height}`;

    // Detect device type
    if (/tablet|ipad/i.test(userAgent)) {
      this.metrics.deviceType = 'tablet';
    } else if (/mobile|android|iphone/i.test(userAgent)) {
      this.metrics.deviceType = 'mobile';
    } else {
      this.metrics.deviceType = 'desktop';
    }

    // Get connection information
    const connection = (navigator as any).connection;
    if (connection) {
      this.metrics.connectionType = connection.effectiveType || 'unknown';
    } else {
      this.metrics.connectionType = 'unknown';
    }
  }

  private initializeWebVitals(): void {
    // Largest Contentful Paint
    getLCP((metric: Metric) => {
      this.metrics.lcp = metric.value;
      this.evaluateMetric('lcp', metric.value);
    });

    // First Input Delay
    getFID((metric: Metric) => {
      this.metrics.fid = metric.value;
      this.evaluateMetric('fid', metric.value);
    });

    // Cumulative Layout Shift
    getCLS((metric: Metric) => {
      this.metrics.cls = metric.value;
      this.evaluateMetric('cls', metric.value);
    });

    // First Contentful Paint
    getFCP((metric: Metric) => {
      this.metrics.fcp = metric.value;
      this.evaluateMetric('fcp', metric.value);
    });

    // Time to First Byte
    getTTFB((metric: Metric) => {
      this.metrics.ttfb = metric.value;
      this.evaluateMetric('ttfb', metric.value);
    });
  }

  private initializeCustomObservers(): void {
    // Resource timing observer for images and API calls
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processResourceTiming(entry as PerformanceResourceTiming);
          }
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);

        // Navigation timing observer
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processNavigationTiming(entry as PerformanceNavigationTiming);
          }
        });
        
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);

        // Long task observer (for identifying performance bottlenecks)
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processLongTask(entry);
          }
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('[PerformanceMonitor] Failed to initialize observers:', error);
      }
    }
  }

  private processResourceTiming(entry: PerformanceResourceTiming): void {
    const url = entry.name;
    const duration = entry.responseEnd - entry.requestStart;

    // Track SOP document loading
    if (url.includes('/api/sop/documents')) {
      this.metrics.sopLoadTime = Math.max(this.metrics.sopLoadTime || 0, duration);
      this.evaluateMetric('sopLoad', duration);
    }

    // Track search API calls
    if (url.includes('/api/sop/search')) {
      this.metrics.searchLatency = Math.max(this.metrics.searchLatency || 0, duration);
      this.evaluateMetric('search', duration);
    }

    // Track image loading
    if (entry.initiatorType === 'img' || /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)) {
      this.metrics.imageLoadTime = Math.max(this.metrics.imageLoadTime || 0, duration);
    }
  }

  private processNavigationTiming(entry: PerformanceNavigationTiming): void {
    // Calculate additional navigation metrics
    const dnsTime = entry.domainLookupEnd - entry.domainLookupStart;
    const tcpTime = entry.connectEnd - entry.connectStart;
    const requestTime = entry.responseStart - entry.requestStart;
    const responseTime = entry.responseEnd - entry.responseStart;
    const domParseTime = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;

    // Log detailed navigation timing for analysis
    console.log('[PerformanceMonitor] Navigation Timing:', {
      dnsTime,
      tcpTime,
      requestTime,
      responseTime,
      domParseTime,
      totalLoadTime: entry.loadEventEnd - entry.navigationStart,
    });
  }

  private processLongTask(entry: PerformanceEntry): void {
    if (entry.duration > 50) { // Tasks longer than 50ms
      console.warn('[PerformanceMonitor] Long Task Detected:', {
        duration: entry.duration,
        startTime: entry.startTime,
        name: entry.name,
      });

      // Send alert for critical long tasks
      if (entry.duration > 200) {
        this.sendAlert('long-task', {
          duration: entry.duration,
          url: window.location.href,
          timestamp: Date.now(),
        });
      }
    }
  }

  private monitorNetworkChanges(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.trackEvent('network-online', { timestamp: Date.now() });
    });

    window.addEventListener('offline', () => {
      this.trackEvent('network-offline', { timestamp: Date.now() });
    });

    // Monitor connection changes (if supported)
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.metrics.connectionType = connection.effectiveType;
        this.trackEvent('connection-change', {
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
          downlink: connection.downlink,
        });
      });
    }
  }

  private monitorMemoryUsage(): void {
    const memory = (performance as any).memory;
    if (memory) {
      this.metrics.memoryInfo = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };

      // Monitor memory usage periodically
      setInterval(() => {
        const currentMemory = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };

        // Alert if memory usage is high (>80% of limit)
        const usagePercent = (currentMemory.used / currentMemory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          this.sendAlert('high-memory-usage', {
            usagePercent,
            memoryInfo: currentMemory,
            url: window.location.href,
          });
        }

        this.metrics.memoryInfo = currentMemory;
      }, 30000); // Check every 30 seconds
    }
  }

  private evaluateMetric(metricName: keyof typeof PERFORMANCE_THRESHOLDS, value: number): void {
    const threshold = PERFORMANCE_THRESHOLDS[metricName];
    if (!threshold) return;

    let status: 'good' | 'needs-improvement' | 'poor';
    if (value <= threshold.good) {
      status = 'good';
    } else if (value <= threshold.needsImprovement) {
      status = 'needs-improvement';
    } else {
      status = 'poor';
    }

    console.log(`[PerformanceMonitor] ${metricName.toUpperCase()}:`, {
      value,
      status,
      threshold,
    });

    // Send alert for poor performance
    if (status === 'poor') {
      this.sendAlert('poor-performance', {
        metric: metricName,
        value,
        threshold,
        url: window.location.href,
      });
    }
  }

  // Public methods for custom tracking
  public trackSOPLoad(sopId: string, startTime: number): void {
    const loadTime = Date.now() - startTime;
    this.metrics.sopLoadTime = loadTime;
    this.evaluateMetric('sopLoad', loadTime);

    this.trackEvent('sop-load', {
      sopId,
      loadTime,
      timestamp: Date.now(),
    });
  }

  public trackSearch(query: string, resultsCount: number, startTime: number): void {
    const searchTime = Date.now() - startTime;
    this.metrics.searchLatency = searchTime;
    this.evaluateMetric('search', searchTime);

    this.trackEvent('search-performed', {
      query: query.substring(0, 50), // Limit query length for privacy
      resultsCount,
      searchTime,
      timestamp: Date.now(),
    });
  }

  public trackOfflineAccess(resource: string, startTime: number): void {
    const accessTime = Date.now() - startTime;
    this.metrics.offlineAccessTime = accessTime;

    this.trackEvent('offline-access', {
      resource,
      accessTime,
      timestamp: Date.now(),
    });
  }

  public trackUserInteraction(action: string, context: Record<string, any> = {}): void {
    this.trackEvent('user-interaction', {
      action,
      ...context,
      timestamp: Date.now(),
    });
  }

  private trackEvent(eventName: string, data: Record<string, any>): void {
    // Store events for batch sending
    const event = {
      name: eventName,
      data,
      timestamp: Date.now(),
      url: window.location.href,
      deviceType: this.metrics.deviceType,
    };

    // Send immediately for critical events
    const criticalEvents = ['poor-performance', 'long-task', 'high-memory-usage'];
    if (criticalEvents.includes(eventName)) {
      this.sendMetricsImmediate([event]);
    } else {
      // Queue for batch sending
      this.queueEvent(event);
    }
  }

  private sendAlert(alertType: string, data: Record<string, any>): void {
    console.warn(`[PerformanceMonitor] ALERT - ${alertType}:`, data);
    
    // Send alert to monitoring service
    fetch('/api/analytics/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: alertType,
        data,
        timestamp: Date.now(),
        userAgent: this.metrics.userAgent,
        url: window.location.href,
      }),
    }).catch((error) => {
      console.error('[PerformanceMonitor] Failed to send alert:', error);
    });
  }

  private queueEvent(event: any): void {
    // Use localStorage as a simple queue
    try {
      const queue = JSON.parse(localStorage.getItem('performance-events') || '[]');
      queue.push(event);
      
      // Limit queue size
      if (queue.length > 100) {
        queue.splice(0, 50); // Remove oldest 50 events
      }
      
      localStorage.setItem('performance-events', JSON.stringify(queue));
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to queue event:', error);
    }
  }

  private scheduleMetricsSending(): void {
    // Send metrics every 30 seconds
    setInterval(() => {
      this.sendQueuedMetrics();
    }, 30000);

    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.sendQueuedMetrics(true);
    });

    // Send metrics when page becomes hidden (tab switch, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendQueuedMetrics(true);
      }
    });
  }

  private sendQueuedMetrics(useBeacon = false): void {
    try {
      const queue = JSON.parse(localStorage.getItem('performance-events') || '[]');
      if (queue.length === 0) return;

      const payload = {
        metrics: this.metrics,
        events: queue,
        timestamp: Date.now(),
      };

      if (useBeacon && navigator.sendBeacon) {
        // Use sendBeacon for reliable sending during page unload
        navigator.sendBeacon(
          this.analyticsEndpoint,
          JSON.stringify(payload)
        );
      } else {
        // Use regular fetch
        fetch(this.analyticsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }).catch((error) => {
          console.error('[PerformanceMonitor] Failed to send metrics:', error);
        });
      }

      // Clear the queue after successful sending
      localStorage.removeItem('performance-events');
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to send queued metrics:', error);
    }
  }

  private sendMetricsImmediate(events: any[]): void {
    const payload = {
      metrics: this.metrics,
      events,
      timestamp: Date.now(),
    };

    fetch(this.analyticsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error('[PerformanceMonitor] Failed to send immediate metrics:', error);
    });
  }

  // Public API
  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  public reset(): void {
    this.metrics = {};
    this.collectDeviceInfo();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export function initPerformanceMonitoring(): void {
  // Initialize on page load
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        performanceMonitor.enable();
      });
    } else {
      performanceMonitor.enable();
    }
  }
}

export function trackSOPPerformance(sopId: string): () => void {
  const startTime = Date.now();
  return () => {
    performanceMonitor.trackSOPLoad(sopId, startTime);
  };
}

export function trackSearchPerformance(query: string, resultsCount: number): () => void {
  const startTime = Date.now();
  return () => {
    performanceMonitor.trackSearch(query, resultsCount, startTime);
  };
}

export function trackOfflinePerformance(resource: string): () => void {
  const startTime = Date.now();
  return () => {
    performanceMonitor.trackOfflineAccess(resource, startTime);
  };
}

// React hook for performance tracking
export function usePerformanceTracking() {
  return {
    trackSOPLoad: trackSOPPerformance,
    trackSearch: trackSearchPerformance,
    trackOfflineAccess: trackOfflinePerformance,
    trackInteraction: performanceMonitor.trackUserInteraction.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
  };
}