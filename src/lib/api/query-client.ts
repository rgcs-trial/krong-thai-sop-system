import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/query-devtools';

// Query client configuration optimized for restaurant tablet environment
const queryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache time: 5 minutes for most queries
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry delay: exponential backoff
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time updates
      refetchOnWindowFocus: true,
      // Refetch when network reconnects
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
};

// Create query client instance
export const queryClient = new QueryClient(queryClientConfig);

// Query keys factory for consistent key management
export const queryKeys = {
  // Authentication queries
  auth: {
    session: ['auth', 'session'] as const,
    user: (userId: string) => ['auth', 'user', userId] as const,
    permissions: (userId: string) => ['auth', 'permissions', userId] as const,
  },
  
  // SOP queries
  sop: {
    all: ['sop'] as const,
    categories: () => [...queryKeys.sop.all, 'categories'] as const,
    category: (id: string) => [...queryKeys.sop.categories(), id] as const,
    documents: (filters?: Record<string, unknown>) => 
      [...queryKeys.sop.all, 'documents', filters] as const,
    document: (id: string) => [...queryKeys.sop.all, 'document', id] as const,
    search: (query: string, filters?: Record<string, unknown>) => 
      [...queryKeys.sop.all, 'search', query, filters] as const,
    bookmarks: (userId: string) => [...queryKeys.sop.all, 'bookmarks', userId] as const,
  },
  
  // Training queries
  training: {
    all: ['training'] as const,
    modules: (filters?: Record<string, unknown>) => 
      [...queryKeys.training.all, 'modules', filters] as const,
    module: (id: string) => [...queryKeys.training.all, 'module', id] as const,
    progress: (userId: string) => [...queryKeys.training.all, 'progress', userId] as const,
    assessments: (moduleId: string) => 
      [...queryKeys.training.all, 'assessments', moduleId] as const,
    certificates: (userId: string) => 
      [...queryKeys.training.all, 'certificates', userId] as const,
  },
  
  // User queries
  user: {
    all: ['users'] as const,
    profile: (id: string) => [...queryKeys.user.all, 'profile', id] as const,
    preferences: (id: string) => [...queryKeys.user.all, 'preferences', id] as const,
  },
} as const;

// Query invalidation helpers
export const invalidateQueries = {
  // Invalidate all SOP-related queries
  allSOP: () => queryClient.invalidateQueries({ queryKey: queryKeys.sop.all }),
  
  // Invalidate specific category
  sopCategory: (categoryId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.sop.category(categoryId) }),
  
  // Invalidate documents for a category
  sopDocuments: (filters?: Record<string, unknown>) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.sop.documents(filters) }),
  
  // Invalidate user's training progress
  userProgress: (userId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.training.progress(userId) }),
  
  // Invalidate all training data
  allTraining: () => queryClient.invalidateQueries({ queryKey: queryKeys.training.all }),
};

// Prefetching helpers for better tablet performance
export const prefetchQueries = {
  // Prefetch SOP categories for faster navigation
  sopCategories: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.sop.categories(),
      queryFn: async () => {
        const response = await fetch('/api/sop/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        return response.json();
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  },
  
  // Prefetch critical SOPs for offline access
  criticalSOPs: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.sop.documents({ is_critical: true }),
      queryFn: async () => {
        const response = await fetch('/api/sop/documents?is_critical=true');
        if (!response.ok) throw new Error('Failed to fetch critical SOPs');
        return response.json();
      },
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  },
  
  // Prefetch user's training progress
  userTrainingProgress: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.training.progress(userId),
      queryFn: async () => {
        const response = await fetch(`/api/training/progress?userId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch training progress');
        return response.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },
};

// Optimistic update helpers
export const optimisticUpdates = {
  // Update SOP document optimistically
  updateSOPDocument: (documentId: string, updatedData: Partial<any>) => {
    queryClient.setQueryData(
      queryKeys.sop.document(documentId),
      (oldData: any) => oldData ? { ...oldData, ...updatedData } : oldData
    );
  },
  
  // Update user progress optimistically
  updateUserProgress: (userId: string, moduleId: string, progress: number) => {
    queryClient.setQueryData(
      queryKeys.training.progress(userId),
      (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedModules = oldData.modules?.map((module: any) => 
          module.id === moduleId 
            ? { ...module, progress_percentage: progress }
            : module
        ) || [];
        
        return { ...oldData, modules: updatedModules };
      }
    );
  },
  
  // Add bookmark optimistically
  addBookmark: (userId: string, documentId: string) => {
    queryClient.setQueryData(
      queryKeys.sop.bookmarks(userId),
      (oldData: any[]) => {
        if (!oldData) return [{ document_id: documentId, created_at: new Date().toISOString() }];
        return [...oldData, { document_id: documentId, created_at: new Date().toISOString() }];
      }
    );
  },
};

// Error handling
export const queryErrorHandler = (error: Error) => {
  console.error('Query Error:', error);
  
  // Handle specific error types
  if (error.message.includes('unauthorized')) {
    // Redirect to login or refresh token
    window.location.href = '/login';
  } else if (error.message.includes('network')) {
    // Handle network errors
    console.warn('Network error detected, app will work in offline mode');
  }
};

// Background refetch for tablet environment
export const setupBackgroundRefetch = () => {
  // Refetch critical data every 15 minutes when app is active
  const refetchInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      queryClient.refetchQueries({ 
        queryKey: queryKeys.sop.categories(),
        type: 'active' 
      });
    }
  }, 15 * 60 * 1000);
  
  // Cleanup on app unload
  window.addEventListener('beforeunload', () => {
    clearInterval(refetchInterval);
  });
  
  return refetchInterval;
};

export { QueryClient, QueryClientProvider, ReactQueryDevtools };