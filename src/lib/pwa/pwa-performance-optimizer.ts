/**
 * PWA Performance Optimizer with Lighthouse Scoring
 * Advanced performance monitoring and optimization for restaurant tablet deployment
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  
  // Additional Vitals
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  
  // PWA Specific Metrics
  pwaScore: number;
  installability: boolean;
  serviceWorkerStatus: 'active' | 'installing' | 'waiting' | 'none';
  cacheHitRate: number;
  offlineCapability: boolean;
  
  // Device & Network
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string;
  effectiveType: string;
  downlink: number;
  saveData: boolean;
  
  // Application Metrics
  firstRender: number;
  domReady: number;
  pageLoadTime: number;
  resourceTimings: PerformanceResourceTiming[];
  
  // Memory & Performance
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  
  timestamp: number;
}

interface LighthouseAudit {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  details: {
    audits: Record<string, any>;
    opportunities: Array<{
      id: string;
      title: string;
      description: string;
      score: number;
      impact: 'low' | 'medium' | 'high';
      recommendation: string;
    }>;
  };
}

interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  category: 'loading' | 'interactivity' | 'visual_stability' | 'pwa' | 'accessibility';
  apply: () => Promise<void>;
  revert?: () => Promise<void>;
}

class PWAPerformanceOptimizer {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private optimizationStrategies: Map<string, OptimizationStrategy> = new Map();
  private appliedOptimizations: Set<string> = new Set();
  private monitoringActive = false;
  private reportingEndpoint = '/api/performance/metrics';

  constructor() {
    this.initializeOptimizationStrategies();
    this.startPerformanceMonitoring();
    this.setupNetworkMonitoring();
  }

  // Core Web Vitals Collection
  private startPerformanceMonitoring(): void {
    if (this.monitoringActive) return;
    this.monitoringActive = true;

    // Collect Core Web Vitals
    getCLS(this.onCLSReport.bind(this));
    getFID(this.onFIDReport.bind(this));
    getFCP(this.onFCPReport.bind(this));
    getLCP(this.onLCPReport.bind(this));
    getTTFB(this.onTTFBReport.bind(this));

    // Custom performance observers
    this.observeResourceTimings();
    this.observeNavigationTimings();
    this.observeLongTasks();
    this.observeLayoutShifts();
    this.observeFirstRender();

    // Memory monitoring
    this.monitorMemoryUsage();

    // PWA specific monitoring
    this.monitorPWAMetrics();

    console.log('[PWAPerformance] Performance monitoring started');
  }

  private onCLSReport(metric: Metric): void {
    this.metrics.cls = metric.value;
    this.evaluateAndOptimize('visual_stability');
    this.reportMetric('cls', metric.value);
  }

  private onFIDReport(metric: Metric): void {
    this.metrics.fid = metric.value;
    this.evaluateAndOptimize('interactivity');
    this.reportMetric('fid', metric.value);
  }

  private onFCPReport(metric: Metric): void {
    this.metrics.fcp = metric.value;
    this.evaluateAndOptimize('loading');
    this.reportMetric('fcp', metric.value);
  }

  private onLCPReport(metric: Metric): void {
    this.metrics.lcp = metric.value;
    this.evaluateAndOptimize('loading');
    this.reportMetric('lcp', metric.value);
  }

  private onTTFBReport(metric: Metric): void {
    this.metrics.ttfb = metric.value;
    this.evaluateAndOptimize('loading');
    this.reportMetric('ttfb', metric.value);
  }

  // Performance Observers
  private observeResourceTimings(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];
        this.metrics.resourceTimings = [...(this.metrics.resourceTimings || []), ...entries];
        this.analyzeResourcePerformance(entries);
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    }
  }

  private observeNavigationTimings(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceNavigationTiming[];
        entries.forEach(entry => {
          this.metrics.domReady = entry.domContentLoadedEventEnd - entry.navigationStart;
          this.metrics.pageLoadTime = entry.loadEventEnd - entry.navigationStart;
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    }
  }

  private observeLongTasks(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const longTasks = list.getEntries();
        if (longTasks.length > 0) {
          console.warn(`[PWAPerformance] Detected ${longTasks.length} long tasks`);
          this.applyOptimization('reduce-main-thread-work');
        }
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', observer);
      } catch (e) {
        // Long task observer not supported
        console.log('[PWAPerformance] Long task observer not supported');
      }
    }
  }

  private observeLayoutShifts(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            console.warn('[PWAPerformance] Unexpected layout shift detected');
            this.applyOptimization('prevent-layout-shifts');
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', observer);
      } catch (e) {
        console.log('[PWAPerformance] Layout shift observer not supported');
      }
    }
  }

  private observeFirstRender(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          this.metrics.firstRender = entries[0].startTime;
        }
      });

      try {
        observer.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', observer);
      } catch (e) {
        console.log('[PWAPerformance] Paint observer not supported');
      }
    }
  }

  // Memory and PWA Monitoring
  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const updateMemoryStats = () => {
        const memory = (performance as any).memory;
        this.metrics.usedJSHeapSize = memory.usedJSHeapSize;
        this.metrics.totalJSHeapSize = memory.totalJSHeapSize;
        this.metrics.jsHeapSizeLimit = memory.jsHeapSizeLimit;

        // Check for memory pressure
        const memoryUsageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        if (memoryUsageRatio > 0.9) {
          console.warn('[PWAPerformance] High memory usage detected');
          this.applyOptimization('memory-management');
        }
      };

      updateMemoryStats();
      setInterval(updateMemoryStats, 30000); // Every 30 seconds
    }
  }

  private async monitorPWAMetrics(): Promise<void> {
    // Service Worker status
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        if (registration.active) {
          this.metrics.serviceWorkerStatus = 'active';
        } else if (registration.installing) {
          this.metrics.serviceWorkerStatus = 'installing';
        } else if (registration.waiting) {
          this.metrics.serviceWorkerStatus = 'waiting';
        }
      } else {
        this.metrics.serviceWorkerStatus = 'none';
      }
    }

    // Cache hit rate monitoring
    this.monitorCacheHitRate();

    // Installability check
    this.checkInstallability();

    // Offline capability
    this.metrics.offlineCapability = await this.testOfflineCapability();
  }

  private setupNetworkMonitoring(): void {
    // Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.connectionType = connection.type || 'unknown';
      this.metrics.effectiveType = connection.effectiveType || 'unknown';
      this.metrics.downlink = connection.downlink || 0;
      this.metrics.saveData = connection.saveData || false;

      connection.addEventListener('change', () => {
        this.metrics.connectionType = connection.type;
        this.metrics.effectiveType = connection.effectiveType;
        this.metrics.downlink = connection.downlink;
        this.adaptToNetworkConditions();
      });
    }

    // Device type detection
    this.detectDeviceType();
  }

  // Optimization Strategies
  private initializeOptimizationStrategies(): void {
    // Loading Performance Optimizations
    this.optimizationStrategies.set('preload-critical-resources', {
      id: 'preload-critical-resources',
      name: 'Preload Critical Resources',
      description: 'Preload critical fonts, images, and scripts for faster rendering',
      impact: 'high',
      effort: 'low',
      category: 'loading',
      apply: async () => {
        this.preloadCriticalResources();
      }
    });

    this.optimizationStrategies.set('lazy-load-images', {
      id: 'lazy-load-images',
      name: 'Lazy Load Images',
      description: 'Defer loading of off-screen images to improve initial load time',
      impact: 'medium',
      effort: 'low',
      category: 'loading',
      apply: async () => {
        this.enableLazyLoading();
      }
    });

    this.optimizationStrategies.set('optimize-images', {
      id: 'optimize-images',
      name: 'Optimize Images',
      description: 'Serve WebP/AVIF images and appropriate sizes for device',
      impact: 'high',
      effort: 'medium',
      category: 'loading',
      apply: async () => {
        this.optimizeImageDelivery();
      }
    });

    // Interactivity Optimizations
    this.optimizationStrategies.set('reduce-main-thread-work', {
      id: 'reduce-main-thread-work',
      name: 'Reduce Main Thread Work',
      description: 'Minimize JavaScript execution time to improve responsiveness',
      impact: 'high',
      effort: 'high',
      category: 'interactivity',
      apply: async () => {
        this.optimizeMainThreadWork();
      }
    });

    this.optimizationStrategies.set('defer-non-critical-js', {
      id: 'defer-non-critical-js',
      name: 'Defer Non-Critical JavaScript',
      description: 'Load non-essential scripts after critical content',
      impact: 'medium',
      effort: 'medium',
      category: 'interactivity',
      apply: async () => {
        this.deferNonCriticalJS();
      }
    });

    // Visual Stability Optimizations
    this.optimizationStrategies.set('prevent-layout-shifts', {
      id: 'prevent-layout-shifts',
      name: 'Prevent Layout Shifts',
      description: 'Set explicit dimensions and reserve space for dynamic content',
      impact: 'high',
      effort: 'medium',
      category: 'visual_stability',
      apply: async () => {
        this.preventLayoutShifts();
      }
    });

    // PWA Optimizations
    this.optimizationStrategies.set('optimize-caching', {
      id: 'optimize-caching',
      name: 'Optimize Caching Strategy',
      description: 'Implement intelligent caching for better offline performance',
      impact: 'high',
      effort: 'medium',
      category: 'pwa',
      apply: async () => {
        this.optimizeCachingStrategy();
      }
    });

    this.optimizationStrategies.set('memory-management', {
      id: 'memory-management',
      name: 'Memory Management',
      description: 'Clean up unused resources and optimize memory usage',
      impact: 'medium',
      effort: 'low',
      category: 'interactivity',
      apply: async () => {
        this.optimizeMemoryUsage();
      }
    });
  }

  // Optimization Implementations
  private preloadCriticalResources(): void {
    const criticalResources = [
      '/fonts/eb-garamond-sc.woff2',
      '/fonts/source-serif-pro.woff2',
      '/fonts/inter.woff2',
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png',
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      if (resource.includes('.woff2')) {
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
      } else if (resource.includes('.png') || resource.includes('.jpg')) {
        link.as = 'image';
      }
      
      document.head.appendChild(link);
    });

    console.log('[PWAPerformance] Critical resources preloaded');
  }

  private enableLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const images = document.querySelectorAll('img[data-src]');
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src!;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
      console.log(`[PWAPerformance] Lazy loading enabled for ${images.length} images`);
    }
  }

  private optimizeImageDelivery(): void {
    // Check WebP/AVIF support
    const supportsWebP = this.checkWebPSupport();
    const supportsAVIF = this.checkAVIFSupport();

    // Replace image sources with optimized versions
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.src.includes('optimized')) {
        let optimizedSrc = img.src;
        
        if (supportsAVIF) {
          optimizedSrc = optimizedSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif');
        } else if (supportsWebP) {
          optimizedSrc = optimizedSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
        
        // Add device-appropriate sizing
        const devicePixelRatio = window.devicePixelRatio || 1;
        if (devicePixelRatio > 1) {
          optimizedSrc += `?w=${Math.round(img.width * devicePixelRatio)}&h=${Math.round(img.height * devicePixelRatio)}`;
        }
        
        img.src = optimizedSrc;
      }
    });

    console.log('[PWAPerformance] Image delivery optimized');
  }

  private optimizeMainThreadWork(): void {
    // Implement requestIdleCallback for non-critical work
    if ('requestIdleCallback' in window) {
      const deferWork = (callback: Function) => {
        (window as any).requestIdleCallback(callback, { timeout: 5000 });
      };

      // Defer analytics tracking
      deferWork(() => {
        this.deferAnalyticsWork();
      });

      // Defer image processing
      deferWork(() => {
        this.processImagesInBackground();
      });
    }

    // Break up long tasks using MessageChannel
    this.scheduleWork();
  }

  private deferNonCriticalJS(): void {
    const nonCriticalScripts = document.querySelectorAll('script[data-defer]');
    nonCriticalScripts.forEach(script => {
      const newScript = document.createElement('script');
      newScript.src = script.getAttribute('src')!;
      newScript.async = true;
      
      // Load after main content
      if (document.readyState === 'complete') {
        document.head.appendChild(newScript);
      } else {
        window.addEventListener('load', () => {
          document.head.appendChild(newScript);
        });
      }
    });

    console.log(`[PWAPerformance] Deferred ${nonCriticalScripts.length} non-critical scripts`);
  }

  private preventLayoutShifts(): void {
    // Set explicit dimensions for images without them
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach(img => {
      if (img.naturalWidth && img.naturalHeight) {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
      }
    });

    // Reserve space for dynamic content
    const dynamicContainers = document.querySelectorAll('[data-dynamic-content]');
    dynamicContainers.forEach(container => {
      const element = container as HTMLElement;
      if (!element.style.minHeight) {
        element.style.minHeight = '200px'; // Default reservation
      }
    });

    console.log('[PWAPerformance] Layout shift prevention applied');
  }

  private optimizeCachingStrategy(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'OPTIMIZE_CACHE',
        strategies: {
          images: 'cache-first',
          api: 'network-first',
          static: 'stale-while-revalidate'
        }
      });
    }
  }

  private optimizeMemoryUsage(): void {
    // Clean up event listeners
    this.cleanupEventListeners();

    // Clear unused caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        const oldCaches = cacheNames.filter(name => name.includes('old') || name.includes('v1'));
        oldCaches.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    console.log('[PWAPerformance] Memory optimization applied');
  }

  // Performance Analysis
  private analyzeResourcePerformance(entries: PerformanceResourceTiming[]): void {
    entries.forEach(entry => {
      const duration = entry.responseEnd - entry.requestStart;
      
      if (duration > 1000) { // Slow resource (>1s)
        console.warn(`[PWAPerformance] Slow resource: ${entry.name} (${duration}ms)`);
        
        if (entry.name.includes('.js')) {
          this.applyOptimization('defer-non-critical-js');
        } else if (entry.name.includes('.jpg') || entry.name.includes('.png')) {
          this.applyOptimization('optimize-images');
        }
      }
    });
  }

  private async evaluateAndOptimize(category: OptimizationStrategy['category']): Promise<void> {
    const strategies = Array.from(this.optimizationStrategies.values())
      .filter(strategy => strategy.category === category)
      .sort((a, b) => {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        const effortOrder = { low: 3, medium: 2, high: 1 };
        
        const aScore = impactOrder[a.impact] * effortOrder[a.effort];
        const bScore = impactOrder[b.impact] * effortOrder[b.effort];
        
        return bScore - aScore;
      });

    // Apply high-impact, low-effort optimizations automatically
    for (const strategy of strategies) {
      if (strategy.impact === 'high' && strategy.effort === 'low') {
        await this.applyOptimization(strategy.id);
      }
    }
  }

  // Lighthouse Score Calculation
  public calculateLighthouseScore(): LighthouseAudit {
    const performance = this.calculatePerformanceScore();
    const accessibility = this.calculateAccessibilityScore();
    const bestPractices = this.calculateBestPracticesScore();
    const seo = this.calculateSEOScore();
    const pwa = this.calculatePWAScore();

    return {
      performance,
      accessibility,
      bestPractices,
      seo,
      pwa,
      details: {
        audits: this.getDetailedAudits(),
        opportunities: this.getOptimizationOpportunities(),
      }
    };
  }

  private calculatePerformanceScore(): number {
    let score = 100;

    // LCP scoring (0-4s scale)
    if (this.metrics.lcp) {
      if (this.metrics.lcp > 4000) score -= 30;
      else if (this.metrics.lcp > 2500) score -= 15;
    }

    // FID scoring (0-300ms scale)
    if (this.metrics.fid) {
      if (this.metrics.fid > 300) score -= 25;
      else if (this.metrics.fid > 100) score -= 10;
    }

    // CLS scoring (0-0.25 scale)
    if (this.metrics.cls) {
      if (this.metrics.cls > 0.25) score -= 20;
      else if (this.metrics.cls > 0.1) score -= 10;
    }

    // FCP scoring
    if (this.metrics.fcp) {
      if (this.metrics.fcp > 3000) score -= 15;
      else if (this.metrics.fcp > 1800) score -= 8;
    }

    return Math.max(0, score);
  }

  private calculateAccessibilityScore(): number {
    // Simplified accessibility scoring
    let score = 90; // Base score assuming good practices
    
    // Check for common accessibility issues
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) score -= 10;

    const buttons = document.querySelectorAll('button:not([aria-label]):not([title])');
    if (buttons.length > 0) score -= 5;

    return Math.max(0, score);
  }

  private calculateBestPracticesScore(): number {
    let score = 95; // Base score

    // Check HTTPS
    if (location.protocol !== 'https:') score -= 20;

    // Check for console errors
    if (this.hasConsoleErrors()) score -= 10;

    return Math.max(0, score);
  }

  private calculateSEOScore(): number {
    let score = 90; // Base score

    // Check meta description
    if (!document.querySelector('meta[name="description"]')) score -= 10;

    // Check title
    if (!document.title || document.title.length < 10) score -= 10;

    return Math.max(0, score);
  }

  private calculatePWAScore(): number {
    let score = 0;

    // Service Worker
    if (this.metrics.serviceWorkerStatus === 'active') score += 30;

    // Manifest
    if (this.hasValidManifest()) score += 20;

    // Installability
    if (this.metrics.installability) score += 20;

    // Offline capability
    if (this.metrics.offlineCapability) score += 15;

    // HTTPS
    if (location.protocol === 'https:') score += 15;

    return Math.min(100, score);
  }

  // Helper Methods
  private async applyOptimization(optimizationId: string): Promise<void> {
    if (this.appliedOptimizations.has(optimizationId)) return;

    const strategy = this.optimizationStrategies.get(optimizationId);
    if (!strategy) return;

    try {
      await strategy.apply();
      this.appliedOptimizations.add(optimizationId);
      console.log(`[PWAPerformance] Applied optimization: ${strategy.name}`);
    } catch (error) {
      console.error(`[PWAPerformance] Failed to apply optimization ${optimizationId}:`, error);
    }
  }

  private adaptToNetworkConditions(): void {
    const connection = (navigator as any).connection;
    
    if (connection?.effectiveType === '2g' || connection?.saveData) {
      // Low bandwidth optimizations
      this.applyOptimization('optimize-images');
      this.applyOptimization('defer-non-critical-js');
      
      // Reduce image quality
      this.reduceImageQuality();
    } else if (connection?.effectiveType === '4g') {
      // High bandwidth - preload more resources
      this.applyOptimization('preload-critical-resources');
    }
  }

  private detectDeviceType(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/ipad|tablet/i.test(userAgent) || (window.screen.width >= 768 && window.screen.width < 1024)) {
      this.metrics.deviceType = 'tablet';
    } else if (/mobile|android|iphone/i.test(userAgent) || window.screen.width < 768) {
      this.metrics.deviceType = 'mobile';
    } else {
      this.metrics.deviceType = 'desktop';
    }
  }

  private monitorCacheHitRate(): void {
    // Monitor cache performance through service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'GET_CACHE_STATS'
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CACHE_STATS') {
          const stats = event.data.stats;
          this.metrics.cacheHitRate = stats.hitRate || 0;
        }
      });
    }
  }

  private checkInstallability(): void {
    this.metrics.installability = 
      'serviceWorker' in navigator &&
      this.hasValidManifest() &&
      location.protocol === 'https:';
  }

  private async testOfflineCapability(): Promise<boolean> {
    // Test if critical resources are available offline
    try {
      const cache = await caches.open('krong-thai-critical-v1.2.0');
      const keys = await cache.keys();
      return keys.length > 0;
    } catch {
      return false;
    }
  }

  private hasValidManifest(): boolean {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    return !!manifestLink;
  }

  private hasConsoleErrors(): boolean {
    // This would need to be implemented with error tracking
    return false; // Simplified
  }

  private checkWebPSupport(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
  }

  private checkAVIFSupport(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('avif') !== -1;
  }

  // Advanced Optimization Methods
  private scheduleWork(): void {
    const channel = new MessageChannel();
    channel.port2.onmessage = () => {
      // Process queued work
      this.processWorkQueue();
    };

    const scheduleTask = (callback: Function) => {
      channel.port1.postMessage(null);
      setTimeout(callback, 0);
    };

    // Use for heavy operations
    (window as any).scheduleWork = scheduleTask;
  }

  private processWorkQueue(): void {
    // Process background tasks
    const tasks = this.getBackgroundTasks();
    tasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('[PWAPerformance] Background task failed:', error);
      }
    });
  }

  private getBackgroundTasks(): Function[] {
    return [
      () => this.cleanupEventListeners(),
      () => this.updateMetricsCache(),
      () => this.preloadNextPageResources(),
    ];
  }

  private cleanupEventListeners(): void {
    // Remove unused event listeners to prevent memory leaks
    const unusedListeners = this.getUnusedListeners();
    unusedListeners.forEach(listener => {
      listener.element.removeEventListener(listener.event, listener.handler);
    });
  }

  private getUnusedListeners(): Array<{element: Element, event: string, handler: Function}> {
    // This would track listeners in a real implementation
    return [];
  }

  private deferAnalyticsWork(): void {
    // Move analytics to idle time
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.processAnalytics();
      });
    }
  }

  private processAnalytics(): void {
    // Process queued analytics events
    const events = this.getQueuedAnalyticsEvents();
    events.forEach(event => {
      this.sendAnalyticsEvent(event);
    });
  }

  private processImagesInBackground(): void {
    const images = document.querySelectorAll('img[data-process]');
    images.forEach(img => {
      this.processImageOptimization(img as HTMLImageElement);
    });
  }

  private processImageOptimization(img: HTMLImageElement): void {
    // Apply image optimizations in background
    if (img.naturalWidth > 1920) {
      // Create optimized version
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 1920;
        canvas.height = (img.naturalHeight * 1920) / img.naturalWidth;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            img.src = url;
          }
        }, 'image/webp', 0.8);
      }
    }
  }

  private reduceImageQuality(): void {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.src.includes('quality=')) {
        img.src += (img.src.includes('?') ? '&' : '?') + 'quality=60';
      }
    });
  }

  private updateMetricsCache(): void {
    this.metrics.timestamp = Date.now();
    localStorage.setItem('pwa-performance-metrics', JSON.stringify(this.metrics));
  }

  private preloadNextPageResources(): void {
    // Preload likely next page resources based on user behavior
    const nextPageResources = this.predictNextPageResources();
    nextPageResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  private predictNextPageResources(): string[] {
    // Simple prediction based on current page
    const currentPath = location.pathname;
    if (currentPath.includes('/sop/')) {
      return ['/api/sop/categories', '/api/training/modules'];
    } else if (currentPath.includes('/training/')) {
      return ['/api/training/progress', '/api/certificates'];
    }
    return [];
  }

  // Reporting and Analytics
  private reportMetric(name: string, value: number): void {
    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        event_category: 'performance',
        event_label: name,
        value: Math.round(value),
      });
    }

    // Send to performance endpoint
    this.sendPerformanceData({ [name]: value });
  }

  private async sendPerformanceData(data: any): Promise<void> {
    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          ...data,
          deviceType: this.metrics.deviceType,
          connectionType: this.metrics.connectionType,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('[PWAPerformance] Failed to send performance data:', error);
    }
  }

  private getDetailedAudits(): Record<string, any> {
    return {
      'largest-contentful-paint': {
        score: this.getLCPScore(),
        value: this.metrics.lcp,
        threshold: 2500,
      },
      'first-input-delay': {
        score: this.getFIDScore(),
        value: this.metrics.fid,
        threshold: 100,
      },
      'cumulative-layout-shift': {
        score: this.getCLSScore(),
        value: this.metrics.cls,
        threshold: 0.1,
      },
      'service-worker': {
        score: this.metrics.serviceWorkerStatus === 'active' ? 1 : 0,
        value: this.metrics.serviceWorkerStatus,
      },
      'installable-manifest': {
        score: this.metrics.installability ? 1 : 0,
        value: this.metrics.installability,
      },
    };
  }

  private getOptimizationOpportunities(): Array<{
    id: string;
    title: string;
    description: string;
    score: number;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }> {
    const opportunities = [];

    if (this.metrics.lcp && this.metrics.lcp > 2500) {
      opportunities.push({
        id: 'improve-lcp',
        title: 'Improve Largest Contentful Paint',
        description: 'Optimize loading of the largest element',
        score: this.getLCPScore(),
        impact: 'high' as const,
        recommendation: 'Preload critical resources and optimize images',
      });
    }

    if (this.metrics.cls && this.metrics.cls > 0.1) {
      opportunities.push({
        id: 'reduce-cls',
        title: 'Reduce Cumulative Layout Shift',
        description: 'Minimize unexpected layout shifts',
        score: this.getCLSScore(),
        impact: 'high' as const,
        recommendation: 'Set explicit dimensions for images and reserve space for dynamic content',
      });
    }

    if (!this.metrics.offlineCapability) {
      opportunities.push({
        id: 'add-offline-support',
        title: 'Add Offline Support',
        description: 'Enable offline functionality for better user experience',
        score: 0,
        impact: 'medium' as const,
        recommendation: 'Implement service worker caching strategies',
      });
    }

    return opportunities;
  }

  // Score calculations
  private getLCPScore(): number {
    if (!this.metrics.lcp) return 0;
    if (this.metrics.lcp <= 2500) return 1;
    if (this.metrics.lcp <= 4000) return 0.5;
    return 0;
  }

  private getFIDScore(): number {
    if (!this.metrics.fid) return 0;
    if (this.metrics.fid <= 100) return 1;
    if (this.metrics.fid <= 300) return 0.5;
    return 0;
  }

  private getCLSScore(): number {
    if (!this.metrics.cls) return 0;
    if (this.metrics.cls <= 0.1) return 1;
    if (this.metrics.cls <= 0.25) return 0.5;
    return 0;
  }

  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  private getQueuedAnalyticsEvents(): any[] {
    // Return queued analytics events
    return [];
  }

  private sendAnalyticsEvent(event: any): void {
    // Send individual analytics event
    if (typeof gtag !== 'undefined') {
      gtag('event', event.name, event.data);
    }
  }

  // Public API
  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  public async runOptimizations(): Promise<void> {
    console.log('[PWAPerformance] Running all optimizations...');
    
    for (const [id, strategy] of this.optimizationStrategies) {
      if (strategy.impact === 'high') {
        await this.applyOptimization(id);
      }
    }
  }

  public dispose(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.monitoringActive = false;
  }
}

export default PWAPerformanceOptimizer;
export type { PerformanceMetrics, LighthouseAudit, OptimizationStrategy };