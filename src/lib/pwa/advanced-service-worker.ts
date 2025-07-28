/**
 * Advanced Service Worker with Intelligent Caching
 * Optimized for restaurant operations with offline-first architecture
 */

// Cache names with versioning for better cache management
const CACHE_NAME = 'krong-thai-sop-v1.2.0';
const CRITICAL_CACHE = 'krong-thai-critical-v1.2.0';
const DYNAMIC_CACHE = 'krong-thai-dynamic-v1.2.0';
const SOP_CACHE = 'krong-thai-sop-v1.2.0';
const ASSETS_CACHE = 'krong-thai-assets-v1.2.0';
const API_CACHE = 'krong-thai-api-v1.2.0';

// Cache configuration for different resource types
const CACHE_CONFIG = {
  // Critical resources that must be cached
  critical: {
    urls: [
      '/',
      '/manifest.json',
      '/favicon.ico',
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png',
      '/offline',
      '/auth/login',
      '/dashboard',
      '/sop',
      '/sop/emergency',
      '/sop/food-safety',
    ],
    strategy: 'CacheFirst',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  // Static assets
  assets: {
    patterns: [/\.(js|css|woff2?|png|jpg|jpeg|svg|webp|avif)$/],
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // SOP documents and training materials
  sop: {
    patterns: [/\/api\/sop/, /\/api\/training/, /\/api\/certificates/],
    strategy: 'NetworkFirst',
    maxAge: 24 * 60 * 60, // 24 hours
    networkTimeoutSeconds: 3,
  },
  // API responses
  api: {
    patterns: [/\/api\//],
    strategy: 'NetworkFirst',
    maxAge: 5 * 60, // 5 minutes
    networkTimeoutSeconds: 2,
  },
  // Dynamic content
  dynamic: {
    patterns: [/\/(en|fr)\//],
    strategy: 'NetworkFirst',
    maxAge: 60 * 60, // 1 hour
    networkTimeoutSeconds: 5,
  },
};

// Advanced caching strategies
class CacheStrategy {
  static async cacheFirst(request: Request, cacheName: string, maxAge?: number): Promise<Response> {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && (!maxAge || this.isCacheValid(cachedResponse, maxAge))) {
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }
  
  static async networkFirst(
    request: Request, 
    cacheName: string, 
    options: { maxAge?: number; networkTimeoutSeconds?: number } = {}
  ): Promise<Response> {
    const { maxAge, networkTimeoutSeconds = 3 } = options;
    const cache = await caches.open(cacheName);
    
    try {
      const networkResponse = await Promise.race([
        fetch(request),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), networkTimeoutSeconds * 1000)
        ),
      ]);
      
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse && (!maxAge || this.isCacheValid(cachedResponse, maxAge))) {
        return cachedResponse;
      }
      
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        const offlineResponse = await cache.match('/offline');
        if (offlineResponse) {
          return offlineResponse;
        }
      }
      
      throw error;
    }
  }
  
  static async staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });
    
    return cachedResponse || fetchPromise;
  }
  
  private static isCacheValid(response: Response, maxAge: number): boolean {
    const dateHeader = response.headers.get('date');
    if (!dateHeader) return false;
    
    const responseTime = new Date(dateHeader).getTime();
    const now = Date.now();
    return (now - responseTime) < (maxAge * 1000);
  }
}

// Background sync for critical operations
class BackgroundSyncManager {
  private static readonly SYNC_TAG = 'krong-thai-background-sync';
  private static readonly CRITICAL_SYNC_TAG = 'krong-thai-critical-sync';
  
  static async registerSync(tag: string = this.SYNC_TAG): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
    }
  }
  
  static async handleBackgroundSync(event: any): Promise<void> {
    if (event.tag === this.SYNC_TAG || event.tag === this.CRITICAL_SYNC_TAG) {
      await this.syncPendingOperations();
    }
  }
  
  private static async syncPendingOperations(): Promise<void> {
    try {
      const pendingOperations = await this.getPendingOperations();
      
      for (const operation of pendingOperations) {
        try {
          await this.executeSync(operation);
          await this.removePendingOperation(operation.id);
        } catch (error) {
          console.error('Sync operation failed:', error);
          // Keep operation for next sync attempt
        }
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
  
  private static async getPendingOperations(): Promise<any[]> {
    // Implementation would fetch from IndexedDB
    return [];
  }
  
  private static async executeSync(operation: any): Promise<void> {
    // Implementation would execute the pending operation
  }
  
  private static async removePendingOperation(id: string): Promise<void> {
    // Implementation would remove from IndexedDB
  }
}

// Intelligent cache management
class CacheManager {
  static async cleanupOldCaches(): Promise<void> {
    const cacheNames = await caches.keys();
    const currentCaches = [CACHE_NAME, CRITICAL_CACHE, DYNAMIC_CACHE, SOP_CACHE, ASSETS_CACHE, API_CACHE];
    
    await Promise.all(
      cacheNames
        .filter(cacheName => !currentCaches.includes(cacheName))
        .map(cacheName => caches.delete(cacheName))
    );
  }
  
  static async preloadCriticalResources(): Promise<void> {
    const cache = await caches.open(CRITICAL_CACHE);
    
    await Promise.all(
      CACHE_CONFIG.critical.urls.map(async url => {
        const request = new Request(url);
        const cachedResponse = await cache.match(request);
        
        if (!cachedResponse) {
          try {
            const response = await fetch(request);
            if (response.ok) {
              await cache.put(request, response);
            }
          } catch (error) {
            console.warn(`Failed to preload: ${url}`, error);
          }
        }
      })
    );
  }
  
  static async handleOfflineRequest(request: Request): Promise<Response> {
    // Try to find a cached version of the resource
    const cacheNames = [CRITICAL_CACHE, SOP_CACHE, DYNAMIC_CACHE, ASSETS_CACHE, API_CACHE];
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CRITICAL_CACHE);
      const offlineResponse = await cache.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Return a meaningful offline response
    return new Response(
      JSON.stringify({
        error: 'Resource not available offline',
        message: 'This content requires an internet connection.',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Push notification handler
class PushNotificationHandler {
  static async handlePushEvent(event: any): Promise<void> {
    const options = {
      title: 'Krong Thai SOP',
      body: 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'krong-thai-notification',
      data: {},
      actions: [],
      ...event.data?.json(),
    };
    
    await self.registration.showNotification(options.title, options);
  }
  
  static async handleNotificationClick(event: any): Promise<void> {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
}

// Service Worker event handlers
declare const self: ServiceWorkerGlobalScope;

// Install event - cache critical resources
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    (async () => {
      await CacheManager.preloadCriticalResources();
      await self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    (async () => {
      await CacheManager.cleanupOldCaches();
      await self.clients.claim();
    })()
  );
});

// Fetch event - handle network requests with intelligent caching
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests and non-GET requests for caching
  if (url.origin !== location.origin || request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        return await handleFetchRequest(request);
      } catch (error) {
        console.error('[SW] Fetch error:', error);
        return CacheManager.handleOfflineRequest(request);
      }
    })()
  );
});

// Background sync event
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Background sync triggered:', event.tag);
  event.waitUntil(BackgroundSyncManager.handleBackgroundSync(event));
});

// Push notification events
self.addEventListener('push', (event: any) => {
  console.log('[SW] Push notification received');
  event.waitUntil(PushNotificationHandler.handlePushEvent(event));
});

self.addEventListener('notificationclick', (event: any) => {
  console.log('[SW] Notification clicked');
  event.waitUntil(PushNotificationHandler.handleNotificationClick(event));
});

// Request routing logic
async function handleFetchRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Critical resources
  if (CACHE_CONFIG.critical.urls.includes(pathname)) {
    return CacheStrategy.cacheFirst(request, CRITICAL_CACHE, CACHE_CONFIG.critical.maxAge);
  }
  
  // Static assets
  if (CACHE_CONFIG.assets.patterns.some(pattern => pattern.test(pathname))) {
    return CacheStrategy.cacheFirst(request, ASSETS_CACHE, CACHE_CONFIG.assets.maxAge);
  }
  
  // SOP and training API endpoints
  if (CACHE_CONFIG.sop.patterns.some(pattern => pattern.test(pathname))) {
    return CacheStrategy.networkFirst(request, SOP_CACHE, {
      maxAge: CACHE_CONFIG.sop.maxAge,
      networkTimeoutSeconds: CACHE_CONFIG.sop.networkTimeoutSeconds,
    });
  }
  
  // General API endpoints
  if (CACHE_CONFIG.api.patterns.some(pattern => pattern.test(pathname))) {
    return CacheStrategy.networkFirst(request, API_CACHE, {
      maxAge: CACHE_CONFIG.api.maxAge,
      networkTimeoutSeconds: CACHE_CONFIG.api.networkTimeoutSeconds,
    });
  }
  
  // Dynamic content (pages)
  if (CACHE_CONFIG.dynamic.patterns.some(pattern => pattern.test(pathname))) {
    return CacheStrategy.networkFirst(request, DYNAMIC_CACHE, {
      maxAge: CACHE_CONFIG.dynamic.maxAge,
      networkTimeoutSeconds: CACHE_CONFIG.dynamic.networkTimeoutSeconds,
    });
  }
  
  // Default to network first for other requests
  return CacheStrategy.networkFirst(request, DYNAMIC_CACHE);
}

// Performance monitoring
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

async function getCacheStats(): Promise<any> {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      size: keys.length,
      keys: keys.map(key => key.url),
    };
  }
  
  return stats;
}

export {};