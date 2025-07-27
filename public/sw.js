// Restaurant Krong Thai SOP Management System - Service Worker
// Advanced offline-first PWA implementation with SOP-specific caching

const CACHE_VERSION = '2';
const CACHE_NAME = `krong-thai-sop-v${CACHE_VERSION}`;
const CRITICAL_CACHE_NAME = `krong-thai-critical-v${CACHE_VERSION}`;
const SOP_CACHE_NAME = `krong-thai-sop-documents-v${CACHE_VERSION}`;
const MEDIA_CACHE_NAME = `krong-thai-media-v${CACHE_VERSION}`;
const API_CACHE_NAME = `krong-thai-api-v${CACHE_VERSION}`;
const FONTS_CACHE_NAME = `krong-thai-fonts-v${CACHE_VERSION}`;
const PERFORMANCE_CACHE_NAME = `krong-thai-performance-v${CACHE_VERSION}`;

// Performance monitoring
const PERFORMANCE_METRICS = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  offlineRequests: 0
};

// Critical SOPs that must be available offline (restaurant safety essentials)
const CRITICAL_SOPS = [
  '/api/sop/documents/food-safety',
  '/api/sop/documents/emergency-procedures',
  '/api/sop/documents/fire-safety',
  '/api/sop/documents/first-aid',
  '/api/sop/documents/cleaning-protocols',
  '/api/sop/documents/allergen-management',
  '/api/sop/documents/equipment-safety',
  '/api/sop/documents/customer-safety',
  '/api/sop/documents/staff-training-basics',
  '/api/sop/documents/health-department-compliance',
];

// High-priority SOPs for faster caching
const HIGH_PRIORITY_SOPS = [
  '/api/sop/categories/food-safety',
  '/api/sop/categories/kitchen-operations',
  '/api/sop/categories/customer-service',
  '/api/sop/categories/emergency-procedures',
];

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  CRITICAL: 7 * 24 * 60 * 60 * 1000,      // 7 days
  REGULAR: 3 * 24 * 60 * 60 * 1000,       // 3 days
  MEDIA: 30 * 24 * 60 * 60 * 1000,        // 30 days
  FONTS: 365 * 24 * 60 * 60 * 1000,       // 365 days
  API: 24 * 60 * 60 * 1000,               // 24 hours
};

// Essential pages for offline functionality
const ESSENTIAL_PAGES = [
  '/',
  '/en',
  '/fr',
  '/en/dashboard',
  '/fr/dashboard',
  '/en/login',
  '/fr/login',
  '/offline',
];

// Install event - cache critical resources with enhanced performance
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache essential pages
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching essential pages');
        return cache.addAll(ESSENTIAL_PAGES);
      }),
      
      // Cache critical SOPs with error handling
      caches.open(CRITICAL_CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching critical SOPs');
        const cachePromises = CRITICAL_SOPS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response.clone());
              console.log(`[SW] ✓ Cached critical SOP: ${url}`);
            }
          } catch (error) {
            console.log(`[SW] ⚠ Could not cache critical SOP: ${url} - ${error.message}`);
          }
        });
        
        await Promise.allSettled(cachePromises);
      }),
      
      // Cache high-priority SOPs
      caches.open(SOP_CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching high-priority SOPs');
        const cachePromises = HIGH_PRIORITY_SOPS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response.clone());
              console.log(`[SW] ✓ Cached high-priority SOP: ${url}`);
            }
          } catch (error) {
            console.log(`[SW] ⚠ Could not cache high-priority SOP: ${url} - ${error.message}`);
          }
        });
        
        await Promise.allSettled(cachePromises);
      }),
      
      // Pre-cache essential fonts and assets
      caches.open(FONTS_CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-caching fonts');
        const fontUrls = [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
          'https://fonts.googleapis.com/css2?family=EB+Garamond+SC:wght@400;700&display=swap',
          'https://fonts.googleapis.com/css2?family=Source+Serif+Pro:wght@400;600&display=swap',
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        ];
        
        return Promise.allSettled(
          fontUrls.map(url => cache.add(url).catch(err => console.log(`[SW] Font cache failed: ${url}`)))
        );
      }),
      
    ]).then(() => {
      console.log('[SW] Installation complete - v' + CACHE_VERSION);
      PERFORMANCE_METRICS.cacheHits = 0; // Reset metrics
      self.skipWaiting();
    }).catch((error) => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Activate event - clean up old caches with enhanced logic
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);
  
  const currentCaches = new Set([
    CACHE_NAME,
    CRITICAL_CACHE_NAME,
    SOP_CACHE_NAME,
    MEDIA_CACHE_NAME,
    API_CACHE_NAME,
    FONTS_CACHE_NAME,
    PERFORMANCE_CACHE_NAME
  ]);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        const deletionPromises = cacheNames
          .filter(cacheName => !currentCaches.has(cacheName))
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletionPromises);
      }),
      
      // Claim all clients immediately
      self.clients.claim(),
      
      // Initialize performance tracking
      self.clients.matchAll().then(clients => {
        console.log(`[SW] Managing ${clients.length} client(s)`);
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION,
            timestamp: Date.now()
          });
        });
      })
      
    ]).then(() => {
      console.log('[SW] Activation complete - v' + CACHE_VERSION);
      console.log('[SW] Active caches:', Array.from(currentCaches));
    }).catch((error) => {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// Fetch event - implement offline-first strategies with performance monitoring
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except for known APIs)
  if (url.origin !== location.origin && !isKnownExternalAPI(url.origin)) {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  PERFORMANCE_METRICS.networkRequests++;
  
  event.respondWith(handleFetch(request));
});

// Handle different types of requests with appropriate strategies
async function handleFetch(request) {
  const url = new URL(request.url);
  const startTime = performance.now();
  
  try {
    let response;
    
    // API requests - Network First with intelligent fallback
    if (url.pathname.startsWith('/api/')) {
      response = await handleAPIRequest(request);
    }
    // SOP documents - Cache First for critical, Network First for others
    else if (url.pathname.includes('/sop/')) {
      response = await handleSOPRequest(request);
    }
    // Fonts - Cache First with long expiry
    else if (isFontRequest(url)) {
      response = await handleFontRequest(request);
    }
    // Static assets - Cache First with performance optimization
    else if (isStaticAsset(url.pathname)) {
      response = await handleStaticAsset(request);
    }
    // Images - Cache First with compression
    else if (isImageRequest(url.pathname)) {
      response = await handleImageRequest(request);
    }
    // Pages - Network First with offline fallback
    else {
      response = await handlePageRequest(request);
    }
    
    // Track performance metrics
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (response) {
      const isFromCache = response.headers.get('x-served-by') === 'sw-cache';
      if (isFromCache) {
        PERFORMANCE_METRICS.cacheHits++;
      } else {
        PERFORMANCE_METRICS.cacheMisses++;
      }
      
      // Log slow requests (tablet performance optimization)
      if (duration > 1000) {
        console.warn(`[SW] Slow request (${duration.toFixed(2)}ms): ${url.pathname}`);
      }
    }
    
    return response;
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    PERFORMANCE_METRICS.offlineRequests++;
    return await getOfflineFallback(request);
  }
}

// Handle API requests with intelligent caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const cacheName = API_CACHE_NAME;
  
  // Critical SOPs - serve from cache first
  if (CRITICAL_SOPS.some(criticalPath => url.pathname.includes(criticalPath.split('/').pop()))) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then(response => {
        if (response.ok) {
          caches.open(CRITICAL_CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
          });
        }
      }).catch(() => {
        // Silently fail background updates
      });
      return cachedResponse;
    }
  }
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      
      // Also cache in critical cache if it's a critical SOP
      if (CRITICAL_SOPS.some(criticalPath => url.pathname.includes(criticalPath.split('/').pop()))) {
        const criticalCache = await caches.open(CRITICAL_CACHE_NAME);
        criticalCache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This resource is not available offline',
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

// Handle SOP document requests
async function handleSOPRequest(request) {
  const url = new URL(request.url);
  
  // For SOP documents, prefer cache to ensure fast loading
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update in background
    fetch(request).then(response => {
      if (response.ok) {
        caches.open(SOP_CACHE_NAME).then(cache => {
          cache.put(request, response.clone());
        });
      }
    }).catch(() => {
      // Silently fail background updates
    });
    return cachedResponse;
  }
  
  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(SOP_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return await getOfflineFallback(request);
  }
}

// Handle font requests with aggressive caching
async function handleFontRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    const responseWithCacheHeader = new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: {
        ...Object.fromEntries(cachedResponse.headers.entries()),
        'x-served-by': 'sw-cache'
      }
    });
    return responseWithCacheHeader;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(FONTS_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Font not available offline', { status: 503 });
  }
}

// Handle image requests with optimization
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    const responseWithCacheHeader = new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: {
        ...Object.fromEntries(cachedResponse.headers.entries()),
        'x-served-by': 'sw-cache'
      }
    });
    return responseWithCacheHeader;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return await getOfflineFallback(request);
  }
}

// Handle static assets (JS, CSS) with enhanced caching
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    const responseWithCacheHeader = new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: {
        ...Object.fromEntries(cachedResponse.headers.entries()),
        'x-served-by': 'sw-cache'
      }
    });
    return responseWithCacheHeader;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return await getOfflineFallback(request);
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return await getOfflineFallback(request);
  }
}

// Get offline fallback response
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Try to serve a cached version of the offline page
  const offlinePage = await caches.match('/offline');
  if (offlinePage) {
    return offlinePage;
  }
  
  // Return a basic offline response
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Offline - Krong Thai SOP</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 2rem;
                text-align: center;
                background: #fcfcfc;
                color: #231f20;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
            }
            .logo {
                color: #e31b23;
                font-size: 2rem;
                font-weight: bold;
                margin-bottom: 1rem;
            }
            .message {
                font-size: 1.2rem;
                margin-bottom: 2rem;
            }
            .instructions {
                background: #f5f5f5;
                padding: 1rem;
                border-radius: 8px;
                text-align: left;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">Restaurant Krong Thai</div>
            <h1>You're Offline</h1>
            <div class="message">
                Some content is not available while offline. Critical SOPs like Food Safety and Emergency Procedures are still accessible.
            </div>
            <div class="instructions">
                <h3>Available Offline:</h3>
                <ul>
                    <li>Food Safety Procedures</li>
                    <li>Emergency Protocols</li>
                    <li>Fire Safety Guidelines</li>
                    <li>First Aid Instructions</li>
                    <li>Cleaning Protocols</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    `,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}

// Utility functions
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.js') ||
    pathname.includes('.css') ||
    pathname.includes('.map') ||
    pathname.includes('.json')
  );
}

function isImageRequest(pathname) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i.test(pathname);
}

function isFontRequest(url) {
  return (
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    /\.(woff|woff2|ttf|eot|otf)$/i.test(url.pathname)
  );
}

function isMediaFile(url) {
  return isImageRequest(url);
}

function isKnownExternalAPI(origin) {
  const knownAPIs = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];
  return knownAPIs.includes(origin);
}

// Cache cleanup utility
async function cleanupExpiredCache(cacheName, expirationTime) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const cacheDate = new Date(dateHeader);
          const now = new Date();
          
          if (now.getTime() - cacheDate.getTime() > expirationTime) {
            await cache.delete(request);
            console.log(`[SW] Cleaned expired cache entry: ${request.url}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[SW] Cache cleanup failed for ${cacheName}:`, error);
  }
}

// Performance metrics reporting
function reportPerformanceMetrics() {
  const totalRequests = PERFORMANCE_METRICS.cacheHits + PERFORMANCE_METRICS.cacheMisses;
  const cacheHitRate = totalRequests > 0 ? (PERFORMANCE_METRICS.cacheHits / totalRequests * 100).toFixed(2) : 0;
  
  console.log('[SW] Performance Metrics:', {
    cacheHitRate: `${cacheHitRate}%`,
    totalRequests,
    cacheHits: PERFORMANCE_METRICS.cacheHits,
    cacheMisses: PERFORMANCE_METRICS.cacheMisses,
    networkRequests: PERFORMANCE_METRICS.networkRequests,
    offlineRequests: PERFORMANCE_METRICS.offlineRequests
  });
  
  // Send metrics to clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PERFORMANCE_METRICS',
        metrics: PERFORMANCE_METRICS,
        cacheHitRate: parseFloat(cacheHitRate)
      });
    });
  });
}

// Background sync for SOP updates
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sop-sync') {
    event.waitUntil(syncSOPUpdates());
  }
  
  if (event.tag === 'progress-sync') {
    event.waitUntil(syncProgressUpdates());
  }
});

// Sync SOP updates when back online
async function syncSOPUpdates() {
  try {
    console.log('[SW] Syncing SOP updates...');
    
    // Check for updated SOPs
    const response = await fetch('/api/sop/updates');
    if (response.ok) {
      const updates = await response.json();
      
      // Update cached SOPs if needed
      for (const update of updates) {
        if (update.needsUpdate) {
          const sopResponse = await fetch(`/api/sop/documents/${update.id}`);
          if (sopResponse.ok) {
            const cache = await caches.open(SOP_CACHE_NAME);
            cache.put(`/api/sop/documents/${update.id}`, sopResponse.clone());
            
            // Also update critical cache if applicable
            if (CRITICAL_SOPS.some(path => path.includes(update.id))) {
              const criticalCache = await caches.open(CRITICAL_CACHE_NAME);
              criticalCache.put(`/api/sop/documents/${update.id}`, sopResponse.clone());
            }
          }
        }
      }
      
      console.log('[SW] SOP sync completed');
    }
  } catch (error) {
    console.error('[SW] SOP sync failed:', error);
  }
}

// Sync progress updates when back online
async function syncProgressUpdates() {
  try {
    console.log('[SW] Syncing progress updates...');
    
    // Get pending progress updates from IndexedDB
    const pendingUpdates = await getPendingProgressUpdates();
    
    for (const update of pendingUpdates) {
      try {
        const response = await fetch('/api/sop/user/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        });
        
        if (response.ok) {
          await removePendingProgressUpdate(update.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync progress update:', error);
      }
    }
    
    console.log('[SW] Progress sync completed');
  } catch (error) {
    console.error('[SW] Progress sync failed:', error);
  }
}

// IndexedDB helpers for offline progress tracking
async function getPendingProgressUpdates() {
  // This would integrate with the offline storage system
  return [];
}

async function removePendingProgressUpdate(id) {
  // This would integrate with the offline storage system
  return true;
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'New SOP updates available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'sop-update',
    data: {
      url: '/dashboard',
    },
    actions: [
      {
        action: 'view',
        title: 'View Updates',
        icon: '/icons/action-view.png',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png',
      },
    ],
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Restaurant Krong Thai SOP', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Periodic cache cleanup and performance monitoring
setInterval(() => {
  // Clean up expired caches
  cleanupExpiredCache(SOP_CACHE_NAME, CACHE_EXPIRATION.REGULAR);
  cleanupExpiredCache(MEDIA_CACHE_NAME, CACHE_EXPIRATION.MEDIA);
  cleanupExpiredCache(API_CACHE_NAME, CACHE_EXPIRATION.API);
  
  // Report performance metrics every 5 minutes
  reportPerformanceMetrics();
}, 5 * 60 * 1000); // 5 minutes

// Handle messages from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'GET_PERFORMANCE_METRICS':
      reportPerformanceMetrics();
      break;
      
    case 'FORCE_CACHE_UPDATE':
      // Force update critical SOPs
      if (data && data.sopId) {
        updateSOPCache(data.sopId);
      }
      break;
      
    case 'CLEAR_CACHE':
      // Clear all caches (for debugging)
      clearAllCaches();
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Force update SOP cache
async function updateSOPCache(sopId) {
  try {
    const url = `/api/sop/documents/${sopId}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const cache = await caches.open(SOP_CACHE_NAME);
      await cache.put(url, response.clone());
      console.log(`[SW] Force updated SOP cache: ${sopId}`);
    }
  } catch (error) {
    console.error(`[SW] Failed to force update SOP cache: ${sopId}`, error);
  }
}

// Clear all caches (for debugging)
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error);
  }
}

console.log('[SW] Service Worker loaded successfully - v' + CACHE_VERSION);
console.log('[SW] Enhanced tablet performance optimizations active');
console.log('[SW] Restaurant-specific SOP caching strategies enabled');