/**
 * Offline-First Query Client Configuration
 * TanStack Query setup with offline capabilities and sync functionality
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { offlineStorage, isOnline, requestBackgroundSync } from './offline-storage';
import { performanceMonitor } from './performance-monitor';

// Offline-aware query functions
export const createOfflineQueryClient = () => {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      console.error('[QueryClient] Query error:', error, query.queryKey);
      
      // Track query errors for performance monitoring
      performanceMonitor.trackUserInteraction('query-error', {
        queryKey: query.queryKey,
        error: error.message,
      });
    },
    onSuccess: (data, query) => {
      // Cache successful query results offline if they're critical
      if (isCriticalQuery(query.queryKey)) {
        cacheQueryDataOffline(query.queryKey, data);
      }
    },
  });

  const mutationCache = new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error('[QueryClient] Mutation error:', error, mutation.options.mutationKey);
      
      // Store failed mutations for retry when online
      if (!navigator.onLine) {
        storeMutationForRetry(mutation.options.mutationKey, variables, context);
      }
    },
    onSuccess: (data, variables, context, mutation) => {
      // Track successful mutations
      performanceMonitor.trackUserInteraction('mutation-success', {
        mutationKey: mutation.options.mutationKey,
      });
    },
  });

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        // Retry configuration optimized for tablet/mobile
        retry: (failureCount, error: any) => {
          // Don't retry if offline
          if (!navigator.onLine) return false;
          
          // Don't retry 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) return false;
          
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Stale time optimized for SOP content
        staleTime: 5 * 60 * 1000, // 5 minutes for most data
        cacheTime: 30 * 60 * 1000, // 30 minutes cache retention
        
        // Network mode for offline-first behavior
        networkMode: 'offlineFirst',
        
        // Custom query function that checks offline storage first
        queryFn: async ({ queryKey, signal }) => {
          const trackPerformance = performanceMonitor.trackUserInteraction.bind(
            performanceMonitor
          );
          
          const startTime = Date.now();
          
          try {
            // For critical SOPs, try offline storage first
            if (isCriticalQuery(queryKey)) {
              const offlineData = await getOfflineQueryData(queryKey);
              if (offlineData) {
                trackPerformance('query-offline-hit', {
                  queryKey,
                  duration: Date.now() - startTime,
                });
                
                // Still fetch from network in background to update cache
                if (navigator.onLine) {
                  fetchAndUpdateCache(queryKey).catch(console.error);
                }
                
                return offlineData;
              }
            }
            
            // If online or no offline data, fetch from network
            if (navigator.onLine) {
              const response = await fetch(buildAPIUrl(queryKey), { signal });
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              const data = await response.json();
              
              trackPerformance('query-network-success', {
                queryKey,
                duration: Date.now() - startTime,
              });
              
              return data;
            }
            
            // Offline and no cached data - check if we have any offline fallback
            const fallbackData = await getOfflineFallbackData(queryKey);
            if (fallbackData) {
              trackPerformance('query-offline-fallback', {
                queryKey,
                duration: Date.now() - startTime,
              });
              return fallbackData;
            }
            
            throw new Error('No offline data available and network is unreachable');
            
          } catch (error) {
            trackPerformance('query-error', {
              queryKey,
              error: error.message,
              duration: Date.now() - startTime,
            });
            throw error;
          }
        },
      },
      mutations: {
        // Custom mutation function for offline support
        mutationFn: async ({ mutationKey, variables }) => {
          if (!navigator.onLine) {
            // Store mutation for background sync
            await storeMutationForSync(mutationKey, variables);
            
            // Schedule background sync
            requestBackgroundSync('mutation-sync');
            
            // Return optimistic response
            return getOptimisticResponse(mutationKey, variables);
          }
          
          // Online mutation
          const response = await fetch(buildMutationUrl(mutationKey), {
            method: getMutationMethod(mutationKey),
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(variables),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return response.json();
        },
      },
    },
  });
};

// Helper functions
function isCriticalQuery(queryKey: unknown[]): boolean {
  const key = String(queryKey[0]);
  const criticalQueries = [
    'sop-documents',
    'sop-categories',
    'critical-sops',
    'emergency-procedures',
    'food-safety',
  ];
  
  return criticalQueries.some(critical => key.includes(critical));
}

async function cacheQueryDataOffline(queryKey: unknown[], data: any): Promise<void> {
  try {
    const key = String(queryKey[0]);
    
    if (key.includes('sop-documents')) {
      const sopId = queryKey[1] as string;
      await offlineStorage.storeSOP({
        id: sopId,
        title: data.title,
        content: data.content,
        category: data.category,
        language: data.language,
        lastUpdated: data.updatedAt,
        isCritical: data.isCritical || false,
        mediaFiles: data.mediaFiles,
      });
    } else if (key.includes('sop-categories')) {
      await offlineStorage.storeCategory({
        id: data.id,
        name: data.name,
        description: data.description,
        language: data.language,
        sopIds: data.sopIds,
        lastUpdated: data.updatedAt,
      });
    }
  } catch (error) {
    console.error('[OfflineQuery] Failed to cache data offline:', error);
  }
}

async function getOfflineQueryData(queryKey: unknown[]): Promise<any> {
  try {
    const key = String(queryKey[0]);
    
    if (key.includes('sop-documents')) {
      const sopId = queryKey[1] as string;
      return await offlineStorage.getSOP(sopId);
    } else if (key.includes('sop-categories')) {
      const language = (queryKey[1] as string) || 'en';
      return await offlineStorage.getCategories(language as 'en' | 'th');
    } else if (key.includes('critical-sops')) {
      const language = (queryKey[1] as string) || 'en';
      return await offlineStorage.getCriticalSOPs(language as 'en' | 'th');
    }
    
    return null;
  } catch (error) {
    console.error('[OfflineQuery] Failed to get offline data:', error);
    return null;
  }
}

async function getOfflineFallbackData(queryKey: unknown[]): Promise<any> {
  const key = String(queryKey[0]);
  
  // Provide fallback data for essential queries
  if (key.includes('sop-categories')) {
    return [
      {
        id: 'food-safety',
        name: 'Food Safety',
        description: 'Critical food safety procedures',
        language: 'en',
        sopIds: ['food-safety-001'],
        lastUpdated: new Date().toISOString(),
        isOfflineFallback: true,
      },
      {
        id: 'emergency',
        name: 'Emergency Procedures',
        description: 'Emergency response protocols',
        language: 'en',
        sopIds: ['emergency-001'],
        lastUpdated: new Date().toISOString(),
        isOfflineFallback: true,
      },
    ];
  }
  
  return null;
}

async function fetchAndUpdateCache(queryKey: unknown[]): Promise<void> {
  try {
    const response = await fetch(buildAPIUrl(queryKey));
    if (response.ok) {
      const data = await response.json();
      await cacheQueryDataOffline(queryKey, data);
    }
  } catch (error) {
    console.error('[OfflineQuery] Background cache update failed:', error);
  }
}

function buildAPIUrl(queryKey: unknown[]): string {
  const key = String(queryKey[0]);
  
  if (key.includes('sop-documents')) {
    const sopId = queryKey[1];
    return `/api/sop/documents/${sopId}`;
  } else if (key.includes('sop-categories')) {
    const language = queryKey[1] || 'en';
    return `/api/sop/categories?lang=${language}`;
  } else if (key.includes('critical-sops')) {
    const language = queryKey[1] || 'en';
    return `/api/sop/documents/critical?lang=${language}`;
  } else if (key.includes('user-progress')) {
    const userId = queryKey[1];
    return `/api/sop/user/progress/${userId}`;
  } else if (key.includes('user-bookmarks')) {
    const userId = queryKey[1];
    return `/api/sop/bookmarks?userId=${userId}`;
  }
  
  return '/api/health'; // fallback
}

function buildMutationUrl(mutationKey: unknown[]): string {
  const key = String(mutationKey?.[0] || '');
  
  if (key.includes('bookmark-sop')) {
    return '/api/sop/bookmarks';
  } else if (key.includes('update-progress')) {
    return '/api/sop/user/progress';
  } else if (key.includes('complete-sop')) {
    return '/api/sop/user/progress';
  }
  
  return '/api/sop/user/progress'; // default
}

function getMutationMethod(mutationKey: unknown[]): string {
  const key = String(mutationKey?.[0] || '');
  
  if (key.includes('delete') || key.includes('remove')) {
    return 'DELETE';
  } else if (key.includes('update')) {
    return 'PUT';
  }
  
  return 'POST'; // default
}

async function storeMutationForSync(mutationKey: unknown[], variables: any): Promise<void> {
  try {
    const key = String(mutationKey?.[0] || '');
    
    if (key.includes('bookmark-sop')) {
      await offlineStorage.storeBookmark({
        userId: variables.userId,
        sopId: variables.sopId,
        createdAt: new Date().toISOString(),
        synced: false,
      });
    } else if (key.includes('update-progress')) {
      await offlineStorage.storeProgressUpdate({
        userId: variables.userId,
        sopId: variables.sopId,
        action: variables.action,
        timestamp: new Date().toISOString(),
        synced: false,
        metadata: variables.metadata,
      });
    }
  } catch (error) {
    console.error('[OfflineQuery] Failed to store mutation for sync:', error);
  }
}

async function storeMutationForRetry(mutationKey: unknown[], variables: any, context: any): Promise<void> {
  // Store failed mutations in a retry queue
  try {
    const retryData = {
      mutationKey,
      variables,
      context,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    const retryQueue = JSON.parse(localStorage.getItem('mutation-retry-queue') || '[]');
    retryQueue.push(retryData);
    localStorage.setItem('mutation-retry-queue', JSON.stringify(retryQueue));
  } catch (error) {
    console.error('[OfflineQuery] Failed to store mutation for retry:', error);
  }
}

function getOptimisticResponse(mutationKey: unknown[], variables: any): any {
  const key = String(mutationKey?.[0] || '');
  
  if (key.includes('bookmark-sop')) {
    return {
      id: `${variables.userId}-${variables.sopId}`,
      userId: variables.userId,
      sopId: variables.sopId,
      createdAt: new Date().toISOString(),
      synced: false,
    };
  } else if (key.includes('update-progress')) {
    return {
      id: `${variables.userId}-${variables.sopId}-${Date.now()}`,
      userId: variables.userId,
      sopId: variables.sopId,
      action: variables.action,
      timestamp: new Date().toISOString(),
      synced: false,
    };
  }
  
  return { success: true, synced: false };
}

// Retry failed mutations when coming back online
export async function retryFailedMutations(queryClient: QueryClient): Promise<void> {
  try {
    const retryQueue = JSON.parse(localStorage.getItem('mutation-retry-queue') || '[]');
    const maxRetries = 3;
    
    for (const item of retryQueue) {
      if (item.retryCount >= maxRetries) {
        console.warn('[OfflineQuery] Max retries reached for mutation:', item.mutationKey);
        continue;
      }
      
      try {
        await queryClient.getMutationCache().build(queryClient, {
          mutationKey: item.mutationKey,
          mutationFn: ({ mutationKey, variables }) => 
            fetch(buildMutationUrl(mutationKey), {
              method: getMutationMethod(mutationKey),
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(variables),
            }).then(res => res.json()),
        }).execute(item.variables);
        
        // Remove successful mutation from retry queue
        const updatedQueue = retryQueue.filter((queueItem: any) => queueItem !== item);
        localStorage.setItem('mutation-retry-queue', JSON.stringify(updatedQueue));
        
      } catch (error) {
        // Increment retry count
        item.retryCount++;
        console.error('[OfflineQuery] Mutation retry failed:', error);
      }
    }
    
    // Update retry queue with failed attempts
    localStorage.setItem('mutation-retry-queue', JSON.stringify(retryQueue));
  } catch (error) {
    console.error('[OfflineQuery] Failed to retry mutations:', error);
  }
}

// Sync offline data when coming back online
export async function syncOfflineData(): Promise<void> {
  if (!navigator.onLine) return;
  
  try {
    console.log('[OfflineQuery] Syncing offline data...');
    
    // Sync with the API
    const syncResult = await offlineStorage.syncWithServer('/api/sop');
    
    console.log('[OfflineQuery] Sync completed:', syncResult);
    
    if (syncResult.success) {
      // Trigger background sync for any remaining updates
      requestBackgroundSync('sop-sync');
    }
  } catch (error) {
    console.error('[OfflineQuery] Sync failed:', error);
  }
}

// Network status hooks for React components
export function useNetworkStatus() {
  const [isOnlineState, setIsOnlineState] = React.useState(navigator.onLine);
  
  React.useEffect(() => {
    const handleOnline = () => setIsOnlineState(true);
    const handleOffline = () => setIsOnlineState(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnlineState;
}

// Initialize offline query client on app start
export function initializeOfflineQueryClient(): QueryClient {
  const queryClient = createOfflineQueryClient();
  
  // Set up online/offline event listeners
  window.addEventListener('online', () => {
    console.log('[OfflineQuery] Coming back online, syncing data...');
    syncOfflineData();
    retryFailedMutations(queryClient);
  });
  
  window.addEventListener('offline', () => {
    console.log('[OfflineQuery] Going offline, enabling offline mode...');
  });
  
  return queryClient;
}