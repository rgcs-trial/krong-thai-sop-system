/**
 * Custom hooks for Translation Admin API operations
 * Restaurant Krong Thai SOP Management System
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type {
  TranslationAdminItem,
  TranslationAdminFilters,
  TranslationAdminSortOptions,
  UseTranslationKeysOptions,
  UseTranslationKeysResult,
  UseTranslationEditorOptions,
  UseTranslationEditorResult,
  TranslationKeyFormData,
  BulkOperationData,
  BulkOperationResult,
  TranslationDashboardStats,
  TranslationAnalyticsData,
  WorkflowState,
  TranslationStatus,
  Locale
} from '@/types/translation-admin';
import { PaginatedApiResponse } from '@/types/api';

/**
 * Hook for fetching translation keys with filtering, sorting, and pagination
 */
export function useTranslationKeys(options: UseTranslationKeysOptions = {}): UseTranslationKeysResult {
  const {
    filters = {},
    sort = { sortBy: 'updated_at', sortOrder: 'desc' },
    pagination = { page: 1, limit: 20 },
    enabled = true
  } = options;

  const queryKey = ['translation-keys', filters, sort, pagination];

  const {
    data,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage
  } = useQuery<PaginatedApiResponse<TranslationAdminItem>>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`/api/admin/translation-keys?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch translation keys');
      }
      return response.json();
    },
    enabled,
  });

  return {
    data,
    isLoading,
    isError: !!error,
    error: error as Error | null,
    refetch,
    hasNextPage: data ? data.page < Math.ceil(data.total / data.limit) : false,
    fetchNextPage: () => {
      // This would be implemented with proper infinite query logic
      console.log('fetchNextPage called');
    }
  };
}

/**
 * Hook for creating translation keys
 */
export function useCreateTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TranslationKeyFormData) => {
      const response = await fetch('/api/admin/translation-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create translation key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      toast({
        title: 'Translation key created',
        description: 'The translation key has been successfully created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for updating translation keys
 */
export function useUpdateTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TranslationKeyFormData> }) => {
      const response = await fetch(`/api/admin/translation-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update translation key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      toast({
        title: 'Translation key updated',
        description: 'The translation key has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for deleting translation keys
 */
export function useDeleteTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/translation-keys/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete translation key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      toast({
        title: 'Translation key deleted',
        description: 'The translation key has been successfully deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for translation editor functionality
 */
export function useTranslationEditor(options: UseTranslationEditorOptions): UseTranslationEditorResult {
  const { keyId, enabled = true } = options;
  const queryClient = useQueryClient();

  // Fetch translation data
  const { data, isLoading, error } = useQuery({
    queryKey: ['translation-editor', keyId],
    queryFn: async () => {
      if (!keyId) return null;
      const response = await fetch(`/api/admin/translations/${keyId}/with-key`);
      if (!response.ok) throw new Error('Failed to fetch translation data');
      return response.json();
    },
    enabled: enabled && !!keyId,
  });

  // Save translation mutation
  const saveTranslationMutation = useMutation({
    mutationFn: async ({ locale, value, status }: { locale: Locale; value: string; status?: string }) => {
      if (!data?.translation_key) throw new Error('No translation key loaded');
      
      const translationId = data.translations?.find((t: any) => t.locale === locale)?.id;
      const url = translationId 
        ? `/api/admin/translations/${translationId}`
        : '/api/admin/translations';
      
      const method = translationId ? 'PUT' : 'POST';
      const body = translationId 
        ? { value, status }
        : { 
            translation_key_id: data.translation_key.id,
            locale,
            value,
            status: status || 'draft'
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save translation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-editor', keyId] });
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
    },
  });

  // Create editor state and actions
  const state = {
    selectedKey: data?.translation_key || null,
    activeLocale: 'en' as Locale,
    translations: {
      en: data?.translations?.find((t: any) => t.locale === 'en') || null,
      fr: data?.translations?.find((t: any) => t.locale === 'fr') || null,
      th: data?.translations?.find((t: any) => t.locale === 'th') || null,
    },
    isDirty: false,
    isLoading: saveTranslationMutation.isPending,
    errors: {},
    lastSaved: null as Date | null
  };

  const actions = {
    selectKey: () => {}, // Implementation would go here
    setActiveLocale: () => {},
    updateTranslation: () => {},
    saveTranslation: (locale: Locale) => 
      saveTranslationMutation.mutate({ locale, value: state.translations[locale]?.value || '' }),
    saveAllTranslations: async () => {
      const promises = Object.entries(state.translations)
        .filter(([_, translation]) => translation?.value?.trim())
        .map(([locale, translation]) => 
          saveTranslationMutation.mutateAsync({ 
            locale: locale as Locale, 
            value: translation!.value 
          })
        );
      
      await Promise.all(promises);
      return true;
    },
    resetChanges: () => {},
    previewTranslation: (locale: Locale, value: string) => value
  };

  return {
    state,
    actions,
    isLoading,
    error: error as Error | null
  };
}

/**
 * Hook for bulk translation operations
 */
export function useBulkTranslationOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operation: BulkOperationData): Promise<BulkOperationResult> => {
      const response = await fetch('/api/admin/translations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation),
      });
      
      if (!response.ok) throw new Error('Bulk operation failed');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      toast({
        title: 'Bulk operation completed',
        description: `Processed ${result.processed} items successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk operation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for fetching dashboard statistics
 */
export function useTranslationDashboardStats() {
  return useQuery<TranslationDashboardStats>({
    queryKey: ['translation-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/translations/dashboard-stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard statistics');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook for fetching translation analytics
 */
export function useTranslationAnalytics(
  period: string = '30d', 
  locale?: Locale,
  options?: UseQueryOptions<TranslationAnalyticsData>
) {
  return useQuery<TranslationAnalyticsData>({
    queryKey: ['translation-analytics', period, locale],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        ...(locale && locale !== 'all' && { locale })
      });
      
      const response = await fetch(`/api/admin/translations/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    ...options
  });
}

/**
 * Hook for workflow management
 */
export function useTranslationWorkflow() {
  const queryClient = useQueryClient();

  const statusChangeMutation = useMutation({
    mutationFn: async ({ 
      translationIds, 
      newStatus, 
      comment 
    }: { 
      translationIds: string[]; 
      newStatus: TranslationStatus; 
      comment?: string;
    }) => {
      const response = await fetch('/api/admin/translations/workflow/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translation_ids: translationIds,
          new_status: newStatus,
          comment,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update translation status');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-pending-translations'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-history'] });
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      
      toast({
        title: 'Status updated',
        description: `Updated ${variables.translationIds.length} translation(s) to ${variables.newStatus}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Status update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch pending translations
  const { data: pendingTranslations, isLoading: isLoadingPending } = useQuery({
    queryKey: ['workflow-pending-translations'],
    queryFn: async () => {
      const response = await fetch('/api/admin/translations/workflow/pending');
      if (!response.ok) throw new Error('Failed to fetch pending translations');
      return response.json();
    },
  });

  // Fetch workflow history
  const { data: workflowHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['workflow-history'],
    queryFn: async () => {
      const response = await fetch('/api/admin/translations/workflow/history?limit=50');
      if (!response.ok) throw new Error('Failed to fetch workflow history');
      return response.json();
    },
  });

  // Fetch workflow statistics
  const { data: workflowStats } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/translations/workflow/stats');
      if (!response.ok) throw new Error('Failed to fetch workflow stats');
      return response.json();
    },
  });

  return {
    pendingTranslations,
    workflowHistory,
    workflowStats,
    isLoadingPending,
    isLoadingHistory,
    updateStatus: statusChangeMutation.mutate,
    isUpdatingStatus: statusChangeMutation.isPending
  };
}

/**
 * Hook for translation import/export operations
 */
export function useTranslationImportExport() {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/admin/translations/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Import failed');
      return response.json();
    },
    onSuccess: (result: BulkOperationResult) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      toast({
        title: 'Import completed',
        description: `Imported ${result.processed} translations successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (options: any) => {
      const params = new URLSearchParams(options);
      const response = await fetch(`/api/admin/translations/export?${params}`);
      
      if (!response.ok) throw new Error('Export failed');
      return response.json();
    },
    onSuccess: (result: { download_url: string; filename: string }) => {
      // Trigger download
      const link = document.createElement('a');
      link.href = result.download_url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Export completed',
        description: 'Download started successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    import: importMutation.mutate,
    export: exportMutation.mutate,
    isImporting: importMutation.isPending,
    isExporting: exportMutation.isPending
  };
}

/**
 * Hook for translation categories
 */
export function useTranslationCategories() {
  return useQuery({
    queryKey: ['translation-categories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/translation-keys/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for translation preview
 */
export function useTranslationPreview(translationKey?: string, locale: Locale = 'en') {
  return useQuery({
    queryKey: ['translation-preview', translationKey, locale],
    queryFn: async () => {
      if (!translationKey) return null;
      
      const response = await fetch(
        `/api/admin/translations/preview/${translationKey}?locale=${locale}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch translation');
      return response.json();
    },
    enabled: !!translationKey,
  });
}

/**
 * Hook for real-time translation updates
 */
export function useTranslationRealtimeUpdates() {
  const queryClient = useQueryClient();

  // This would typically use WebSocket or Server-Sent Events
  // For now, it's a placeholder that could be implemented with a real-time service
  
  const connectToUpdates = () => {
    // Implementation would connect to WebSocket
    console.log('Connecting to real-time translation updates...');
  };

  const disconnectFromUpdates = () => {
    // Implementation would disconnect from WebSocket
    console.log('Disconnecting from real-time translation updates...');
  };

  return {
    connectToUpdates,
    disconnectFromUpdates
  };
}