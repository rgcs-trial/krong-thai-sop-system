/**
 * TanStack Query hooks for SOP data fetching with optimistic updates
 * Restaurant Krong Thai SOP Management System
 */

import { useQuery, useInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys, queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import type { 
  SOPCategory, 
  SOPDocument, 
  SOPSearchParams,
  ApiResponse,
  PaginatedResponse 
} from '@/types/database';

// Base fetcher functions
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Request failed');
  }

  return result.data;
};

/**
 * SOP Categories Queries
 */

// Get all SOP categories
export const useSOPCategories = (options: {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean;
} = {}) => {
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: queryKeys.sopCategories.list({ language }),
    queryFn: () => fetchWithAuth('/api/sop/categories'),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    enabled: options.enabled !== false,
    ...options,
  });
};

// Get categories with document counts
export const useCategoriesWithCounts = (options: {
  enabled?: boolean;
  includeInactive?: boolean;
} = {}) => {
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: queryKeys.sopCategories.list({ 
      language, 
      includeInactive: options.includeInactive,
      withCounts: true 
    }),
    queryFn: () => fetchWithAuth(`/api/sop/categories?with_counts=true${options.includeInactive ? '&include_inactive=true' : ''}`),
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: options.enabled !== false,
  });
};

// Get single category
export const useSOPCategory = (
  categoryId: string | null,
  options: {
    enabled?: boolean;
    includeDocuments?: boolean;
  } = {}
) => {
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: queryKeys.sopCategories.detail(categoryId!),
    queryFn: () => fetchWithAuth(`/api/sop/categories/${categoryId}${options.includeDocuments ? '?include_documents=true' : ''}`),
    enabled: !!categoryId && options.enabled !== false,
    staleTime: 20 * 60 * 1000, // 20 minutes
  });
};

// Suspense version for categories
export const useSOPCategoriesSuspense = () => {
  const language = useSettingsStore(state => state.app.language);
  
  return useSuspenseQuery({
    queryKey: queryKeys.sopCategories.list({ language }),
    queryFn: () => fetchWithAuth('/api/sop/categories'),
    staleTime: 30 * 60 * 1000,
  });
};

/**
 * SOP Documents Queries
 */

// Get paginated SOP documents
export const useSOPDocuments = (
  params: {
    categoryId?: string;
    search?: string;
    filters?: SOPSearchParams;
    page?: number;
    limit?: number;
  } = {},
  options: {
    enabled?: boolean;
    keepPreviousData?: boolean;
  } = {}
) => {
  const language = useSettingsStore(state => state.app.language);
  
  const queryParams = new URLSearchParams();
  if (params.categoryId) queryParams.set('category_id', params.categoryId);
  if (params.search) queryParams.set('search', params.search);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  
  // Add filters
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.set(key, String(value));
        }
      }
    });
  }

  queryParams.set('language', language);

  return useQuery({
    queryKey: queryKeys.sopDocuments.list({ ...params, language }),
    queryFn: () => fetchWithAuth(`/api/sop/documents?${queryParams}`),
    staleTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: options.keepPreviousData !== false,
    enabled: options.enabled !== false,
  });
};

// Infinite query for scrolling documents
export const useInfiniteSOPDocuments = (
  params: {
    categoryId?: string;
    search?: string;
    filters?: SOPSearchParams;
    limit?: number;
  } = {},
  options: {
    enabled?: boolean;
  } = {}
) => {
  const language = useSettingsStore(state => state.app.language);

  return useInfiniteQuery({
    queryKey: queryKeys.sopDocuments.list({ ...params, language, infinite: true }),
    queryFn: ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams();
      if (params.categoryId) queryParams.set('category_id', params.categoryId);
      if (params.search) queryParams.set('search', params.search);
      queryParams.set('page', pageParam.toString());
      queryParams.set('limit', (params.limit || 20).toString());
      queryParams.set('language', language);
      
      // Add filters
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, v));
            } else {
              queryParams.set(key, String(value));
            }
          }
        });
      }

      return fetchWithAuth(`/api/sop/documents?${queryParams}`);
    },
    getNextPageParam: (lastPage: PaginatedResponse<SOPDocument>) => {
      return lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 10 * 60 * 1000,
    enabled: options.enabled !== false,
  });
};

// Get single SOP document
export const useSOPDocument = (
  documentId: string | null,
  options: {
    enabled?: boolean;
    includeRelated?: boolean;
    markAsViewed?: boolean;
  } = {}
) => {
  const user = useAuthStore(state => state.user);
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: queryKeys.sopDocuments.detail(documentId!),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set('language', language);
      if (options.includeRelated) queryParams.set('include_related', 'true');
      if (options.markAsViewed && user) queryParams.set('mark_viewed', 'true');
      
      return fetchWithAuth(`/api/sop/documents/${documentId}?${queryParams}`);
    },
    enabled: !!documentId && options.enabled !== false,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Get documents by category
export const useDocumentsByCategory = (
  categoryId: string | null,
  options: {
    enabled?: boolean;
    limit?: number;
    sortBy?: 'title' | 'created_at' | 'updated_at' | 'priority';
    sortOrder?: 'asc' | 'desc';
  } = {}
) => {
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: queryKeys.sopDocuments.list({ 
      categoryId: categoryId!, 
      language,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      limit: options.limit
    }),
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set('language', language);
      if (options.limit) queryParams.set('limit', options.limit.toString());
      if (options.sortBy) queryParams.set('sort_by', options.sortBy);
      if (options.sortOrder) queryParams.set('sort_order', options.sortOrder);
      
      return fetchWithAuth(`/api/sop/categories/${categoryId}/documents?${queryParams}`);
    },
    enabled: !!categoryId && options.enabled !== false,
    staleTime: 10 * 60 * 1000,
  });
};

// Get related documents
export const useRelatedDocuments = (
  documentId: string | null,
  options: {
    enabled?: boolean;
    limit?: number;
  } = {}
) => {
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: ['related-documents', documentId, language, options.limit],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set('language', language);
      if (options.limit) queryParams.set('limit', options.limit.toString());
      
      return fetchWithAuth(`/api/sop/documents/${documentId}/related?${queryParams}`);
    },
    enabled: !!documentId && options.enabled !== false,
    staleTime: 20 * 60 * 1000,
  });
};

/**
 * Search and Filtering Queries
 */

// Search SOP documents
export const useSOPSearch = (
  query: string,
  filters: SOPSearchParams = {},
  options: {
    enabled?: boolean;
    debounceMs?: number;
  } = {}
) => {
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: queryKeys.sopDocuments.search(query, { ...filters, language }),
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set('search', query);
      queryParams.set('language', language);
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.set(key, String(value));
          }
        }
      });

      return fetchWithAuth(`/api/sop/search?${queryParams}`);
    },
    enabled: !!query.trim() && query.length >= 2 && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
  });
};

// Get search suggestions
export const useSearchSuggestions = (
  query: string,
  options: {
    enabled?: boolean;
    limit?: number;
  } = {}
) => {
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: ['search-suggestions', query, language, options.limit],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set('q', query);
      queryParams.set('language', language);
      if (options.limit) queryParams.set('limit', options.limit.toString());
      
      return fetchWithAuth(`/api/sop/search/suggestions?${queryParams}`);
    },
    enabled: !!query.trim() && query.length >= 1 && options.enabled !== false,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * User-specific Queries
 */

// Get user's favorite documents
export const useFavoriteDocuments = (
  userId?: string,
  options: {
    enabled?: boolean;
  } = {}
) => {
  const currentUser = useAuthStore(state => state.user);
  const targetUserId = userId || currentUser?.id;
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: queryKeys.sopDocuments.favorites(targetUserId!),
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set('language', language);
      if (userId) queryParams.set('user_id', userId);
      
      return fetchWithAuth(`/api/sop/bookmarks?${queryParams}`);
    },
    enabled: !!targetUserId && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get user's recently viewed documents
export const useRecentlyViewed = (
  limit = 10,
  options: {
    enabled?: boolean;
  } = {}
) => {
  const user = useAuthStore(state => state.user);
  const language = useSettingsStore(state => state.app.language);
  
  return useQuery({
    queryKey: ['recently-viewed', user?.id, language, limit],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set('language', language);
      queryParams.set('limit', limit.toString());
      
      return fetchWithAuth(`/api/sop/user/recently-viewed?${queryParams}`);
    },
    enabled: !!user && options.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get user's progress on documents
export const useUserProgress = (
  documentIds?: string[],
  options: {
    enabled?: boolean;
  } = {}
) => {
  const user = useAuthStore(state => state.user);
  
  return useQuery({
    queryKey: ['user-progress', user?.id, documentIds],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      if (documentIds) {
        documentIds.forEach(id => queryParams.append('document_id', id));
      }
      
      return fetchWithAuth(`/api/sop/user/progress?${queryParams}`);
    },
    enabled: !!user && options.enabled !== false,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Dashboard and Analytics Queries
 */

// Get dashboard stats
export const useDashboardStats = (
  options: {
    enabled?: boolean;
    dateRange?: { from: Date; to: Date };
  } = {}
) => {
  const user = useAuthStore(state => state.user);
  
  return useQuery({
    queryKey: queryKeys.dashboard.stats(user?.restaurant_id || 'default'),
    queryFn: () => {
      const queryParams = new URLSearchParams();
      if (options.dateRange) {
        queryParams.set('from', options.dateRange.from.toISOString());
        queryParams.set('to', options.dateRange.to.toISOString());
      }
      
      return fetchWithAuth(`/api/dashboard/stats?${queryParams}`);
    },
    enabled: !!user && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
};

// Get user activity
export const useUserActivity = (
  limit = 20,
  options: {
    enabled?: boolean;
  } = {}
) => {
  const user = useAuthStore(state => state.user);
  
  return useQuery({
    queryKey: queryKeys.dashboard.activities(user?.id!),
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set('limit', limit.toString());
      
      return fetchWithAuth(`/api/user/activity?${queryParams}`);
    },
    enabled: !!user && options.enabled !== false,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Prefetching Utilities
 */

// Prefetch related data for a document
export const prefetchDocumentData = async (documentId: string) => {
  const language = useSettingsStore.getState().app.language;
  
  // Prefetch document details
  queryClient.prefetchQuery({
    queryKey: queryKeys.sopDocuments.detail(documentId),
    queryFn: () => fetchWithAuth(`/api/sop/documents/${documentId}?language=${language}`),
    staleTime: 15 * 60 * 1000,
  });
  
  // Prefetch related documents
  queryClient.prefetchQuery({
    queryKey: ['related-documents', documentId, language, 3],
    queryFn: () => fetchWithAuth(`/api/sop/documents/${documentId}/related?language=${language}&limit=3`),
    staleTime: 20 * 60 * 1000,
  });
};

// Prefetch category documents
export const prefetchCategoryDocuments = async (categoryId: string) => {
  const language = useSettingsStore.getState().app.language;
  
  queryClient.prefetchQuery({
    queryKey: queryKeys.sopDocuments.list({ categoryId, language, limit: 20 }),
    queryFn: () => fetchWithAuth(`/api/sop/categories/${categoryId}/documents?language=${language}&limit=20`),
    staleTime: 10 * 60 * 1000,
  });
};

// Prefetch user-specific data
export const prefetchUserData = async (userId: string) => {
  const language = useSettingsStore.getState().app.language;
  
  // Prefetch favorites
  queryClient.prefetchQuery({
    queryKey: queryKeys.sopDocuments.favorites(userId),
    queryFn: () => fetchWithAuth(`/api/sop/bookmarks?language=${language}`),
    staleTime: 5 * 60 * 1000,
  });
  
  // Prefetch recently viewed
  queryClient.prefetchQuery({
    queryKey: ['recently-viewed', userId, language, 10],
    queryFn: () => fetchWithAuth(`/api/sop/user/recently-viewed?language=${language}&limit=10`),
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Cache Management Utilities
 */

// Invalidate SOP-related queries
export const invalidateSOPQueries = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.sopCategories.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.sopDocuments.all });
};

// Update document in cache
export const updateDocumentInCache = (documentId: string, updates: Partial<SOPDocument>) => {
  // Update document detail cache
  queryClient.setQueryData(
    queryKeys.sopDocuments.detail(documentId),
    (old: SOPDocument | undefined) => old ? { ...old, ...updates } : undefined
  );
  
  // Update document in list caches
  queryClient.setQueriesData(
    { queryKey: queryKeys.sopDocuments.lists() },
    (old: PaginatedResponse<SOPDocument> | undefined) => {
      if (!old) return old;
      
      return {
        ...old,
        data: old.data.map(doc => 
          doc.id === documentId ? { ...doc, ...updates } : doc
        ),
      };
    }
  );
};

// Remove document from cache
export const removeDocumentFromCache = (documentId: string) => {
  // Remove document detail
  queryClient.removeQueries({ queryKey: queryKeys.sopDocuments.detail(documentId) });
  
  // Remove from list caches
  queryClient.setQueriesData(
    { queryKey: queryKeys.sopDocuments.lists() },
    (old: PaginatedResponse<SOPDocument> | undefined) => {
      if (!old) return old;
      
      return {
        ...old,
        data: old.data.filter(doc => doc.id !== documentId),
        pagination: {
          ...old.pagination,
          total: old.pagination.total - 1,
        },
      };
    }
  );
};

export default {
  // Categories
  useSOPCategories,
  useCategoriesWithCounts,
  useSOPCategory,
  useSOPCategoriesSuspense,
  
  // Documents
  useSOPDocuments,
  useInfiniteSOPDocuments,
  useSOPDocument,
  useDocumentsByCategory,
  useRelatedDocuments,
  
  // Search
  useSOPSearch,
  useSearchSuggestions,
  
  // User-specific
  useFavoriteDocuments,
  useRecentlyViewed,
  useUserProgress,
  
  // Dashboard
  useDashboardStats,
  useUserActivity,
  
  // Utilities
  prefetchDocumentData,
  prefetchCategoryDocuments,
  prefetchUserData,
  invalidateSOPQueries,
  updateDocumentInCache,
  removeDocumentFromCache,
};