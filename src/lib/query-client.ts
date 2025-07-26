/**
 * TanStack Query Client Configuration for Restaurant Krong Thai SOP Management System
 * Optimized for tablet usage with aggressive caching and offline support
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Tablet-optimized default options
const queryConfig: DefaultOptions = {
  queries: {
    // Cache data for 30 minutes by default (tablet usage patterns)
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
    
    // Retry configuration for unreliable connections
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Background refetch settings optimized for tablet
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    
    // Network mode for offline support
    networkMode: 'offlineFirst',
  },
  mutations: {
    // Retry mutations for network errors
    retry: (failureCount, error: any) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: 'offlineFirst',
  },
};

// Create query client with tablet-optimized configuration
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// Storage persister for offline capabilities
const localStoragePersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : null,
  key: 'krong-thai-query-cache',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Persist query client for offline support
if (typeof window !== 'undefined') {
  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    buster: 'v1.0.0', // Increment to invalidate cache on app updates
  });
}

// Query keys factory for consistent key management
export const queryKeys = {
  // Authentication
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    devices: (userId: string) => [...queryKeys.auth.all, 'devices', userId] as const,
  },
  
  // SOP Categories
  sopCategories: {
    all: ['sop-categories'] as const,
    lists: () => [...queryKeys.sopCategories.all, 'list'] as const,
    list: (filters: Record<string, any> = {}) => 
      [...queryKeys.sopCategories.lists(), filters] as const,
    details: () => [...queryKeys.sopCategories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sopCategories.details(), id] as const,
  },
  
  // SOP Documents
  sopDocuments: {
    all: ['sop-documents'] as const,
    lists: () => [...queryKeys.sopDocuments.all, 'list'] as const,
    list: (filters: Record<string, any> = {}) => 
      [...queryKeys.sopDocuments.lists(), filters] as const,
    details: () => [...queryKeys.sopDocuments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sopDocuments.details(), id] as const,
    search: (query: string, filters: Record<string, any> = {}) =>
      [...queryKeys.sopDocuments.all, 'search', query, filters] as const,
    favorites: (userId: string) =>
      [...queryKeys.sopDocuments.all, 'favorites', userId] as const,
  },
  
  // Training & Progress
  training: {
    all: ['training'] as const,
    progress: (userId: string) => [...queryKeys.training.all, 'progress', userId] as const,
    assessments: (userId: string) => [...queryKeys.training.all, 'assessments', userId] as const,
    certifications: (userId: string) => [...queryKeys.training.all, 'certifications', userId] as const,
  },
  
  // Form Templates & Submissions
  forms: {
    all: ['forms'] as const,
    templates: () => [...queryKeys.forms.all, 'templates'] as const,
    template: (id: string) => [...queryKeys.forms.templates(), id] as const,
    submissions: (filters: Record<string, any> = {}) =>
      [...queryKeys.forms.all, 'submissions', filters] as const,
    submission: (id: string) => [...queryKeys.forms.all, 'submission', id] as const,
  },
  
  // Settings & Configuration
  settings: {
    all: ['settings'] as const,
    user: (userId: string) => [...queryKeys.settings.all, 'user', userId] as const,
    restaurant: (restaurantId: string) => [...queryKeys.settings.all, 'restaurant', restaurantId] as const,
  },
  
  // Dashboard & Analytics
  dashboard: {
    all: ['dashboard'] as const,
    stats: (restaurantId: string) => [...queryKeys.dashboard.all, 'stats', restaurantId] as const,
    activities: (userId: string) => [...queryKeys.dashboard.all, 'activities', userId] as const,
  },
} as const;

// Cache invalidation helpers
export const cacheUtils = {
  // Invalidate all SOP-related queries
  invalidateSOPData: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sopCategories.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.sopDocuments.all });
  },
  
  // Invalidate user-specific data
  invalidateUserData: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.training.progress(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sopDocuments.favorites(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.user(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activities(userId) });
  },
  
  // Invalidate authentication data
  invalidateAuthData: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
  },
  
  // Clear all cached data (useful for logout)
  clearAllCache: () => {
    queryClient.clear();
  },
  
  // Remove offline cached data
  clearOfflineCache: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('krong-thai-query-cache');
    }
  },
};

// Network status utilities for offline handling
export const networkUtils = {
  // Check if browser supports online/offline events
  isOnlineSupported: () => typeof navigator !== 'undefined' && 'onLine' in navigator,
  
  // Get current online status
  isOnline: () => {
    if (!networkUtils.isOnlineSupported()) return true;
    return navigator.onLine;
  },
  
  // Set up network status listeners
  setupNetworkListeners: () => {
    if (!networkUtils.isOnlineSupported()) return;
    
    const handleOnline = () => {
      queryClient.resumePausedMutations();
      queryClient.invalidateQueries();
    };
    
    const handleOffline = () => {
      // Queries will automatically pause when offline
      console.log('Application is offline - queries paused');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};

// Performance monitoring utilities
export const performanceUtils = {
  // Get cache size information
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const mutations = queryClient.getMutationCache();
    
    return {
      queryCount: cache.getAll().length,
      mutationCount: mutations.getAll().length,
      cacheSize: JSON.stringify(cache.getAll()).length,
    };
  },
  
  // Clear stale queries to free memory
  clearStaleQueries: () => {
    const staleTime = 60 * 60 * 1000; // 1 hour
    const cache = queryClient.getQueryCache();
    
    cache.getAll().forEach((query) => {
      if (query.state.dataUpdatedAt < Date.now() - staleTime) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  },
  
  // Prefetch critical data for better performance
  prefetchCriticalData: async (userId: string, restaurantId: string) => {
    const prefetchPromises = [
      // Prefetch user profile and settings
      queryClient.prefetchQuery({
        queryKey: queryKeys.auth.user(),
        queryFn: () => fetch('/api/auth/user').then(res => res.json()),
        staleTime: 60 * 60 * 1000, // 1 hour
      }),
      
      // Prefetch SOP categories
      queryClient.prefetchQuery({
        queryKey: queryKeys.sopCategories.list(),
        queryFn: () => fetch('/api/sop/categories').then(res => res.json()),
        staleTime: 30 * 60 * 1000, // 30 minutes
      }),
      
      // Prefetch user favorites
      queryClient.prefetchQuery({
        queryKey: queryKeys.sopDocuments.favorites(userId),
        queryFn: () => fetch(`/api/sop/bookmarks?user_id=${userId}`).then(res => res.json()),
        staleTime: 15 * 60 * 1000, // 15 minutes
      }),
    ];
    
    try {
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      console.warn('Some critical data could not be prefetched:', error);
    }
  },
};

// Error handling utilities
export const errorUtils = {
  // Check if error is a network error
  isNetworkError: (error: any): boolean => {
    return !error?.response && (
      error?.code === 'NETWORK_ERROR' ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('NetworkError')
    );
  },
  
  // Check if error is a server error (5xx)
  isServerError: (error: any): boolean => {
    return error?.response?.status >= 500;
  },
  
  // Check if error is a client error (4xx)
  isClientError: (error: any): boolean => {
    const status = error?.response?.status;
    return status >= 400 && status < 500;
  },
  
  // Get user-friendly error message
  getErrorMessage: (error: any, fallback = 'An unexpected error occurred'): string => {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (errorUtils.isNetworkError(error)) {
      return 'Network connection error. Please check your internet connection.';
    }
    
    return fallback;
  },
};

export default queryClient;