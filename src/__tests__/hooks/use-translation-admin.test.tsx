/**
 * Unit Tests for useTranslationAdmin Hook
 * Restaurant Krong Thai SOP Management System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import {
  useTranslationKeys,
  useCreateTranslationKey,
  useUpdateTranslationKey,
  useDeleteTranslationKey,
  useTranslationEditor,
  useBulkTranslationOperations,
  useTranslationDashboardStats,
  useTranslationAnalytics,
  useTranslationWorkflow,
  useTranslationImportExport,
  useTranslationCategories,
  useTranslationPreview
} from '@/hooks/use-translation-admin';

import {
  mockApiResponseBuilders,
  testScenarios,
  SAMPLE_TRANSLATION_KEYS,
  SAMPLE_TRANSLATIONS
} from '../mocks/translation-mocks';
import { mockFetch, createTestQueryClient, mockApiResponses } from '../utils/test-utils';

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast,
}));

// Test wrapper component
const createWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

describe('Translation Admin Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useTranslationKeys', () => {
    it('should fetch translation keys with default parameters', async () => {
      const mockResponse = mockApiResponses.mockPaginatedResponse(
        SAMPLE_TRANSLATION_KEYS.map(key => ({ translation_key: key, translations: [], usage_stats: {} }))
      );
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslationKeys(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.isError).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/translation-keys?page=1&limit=20&sortBy=updated_at&sortOrder=desc')
      );
    });

    it('should apply filters correctly', async () => {
      const mockResponse = mockApiResponses.mockPaginatedResponse([]);
      mockFetch.mockFetchSuccess(mockResponse);

      const filters = {
        category: 'common',
        status: 'published',
        search: 'welcome',
      };

      const { result } = renderHook(
        () => useTranslationKeys({ filters }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=common&status=published&search=welcome')
      );
    });

    it('should handle pagination correctly', async () => {
      const mockResponse = mockApiResponses.mockPaginatedResponse(
        SAMPLE_TRANSLATION_KEYS,
        2,
        10
      );
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(
        () => useTranslationKeys({ pagination: { page: 2, limit: 10 } }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2&limit=10')
      );

      expect(result.current.hasNextPage).toBe(false);
    });

    it('should handle API errors', async () => {
      mockFetch.mockFetchError('Failed to fetch keys', 500);

      const { result } = renderHook(() => useTranslationKeys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useCreateTranslationKey', () => {
    it('should create translation key successfully', async () => {
      const newKey = {
        key: 'test.new.key',
        category: 'common',
        description: 'Test key',
        translations: {
          en: { value: 'Test value', status: 'draft' },
          fr: { value: 'Valeur test', status: 'draft' },
        },
      };

      const mockResponse = mockApiResponses.mockSuccessResponse({
        id: 'new-key-id',
        ...newKey,
      });
      mockFetch.mockFetchSuccess(mockResponse);

      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateTranslationKey(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(newKey);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/translation-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['translation-keys'],
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Translation key created',
        description: 'The translation key has been successfully created.',
      });
    });

    it('should handle creation errors', async () => {
      mockFetch.mockFetchError('Key already exists', 409);

      const { result } = renderHook(() => useCreateTranslationKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          key: 'existing.key',
          category: 'common',
          description: 'Test key',
          translations: {},
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to create translation key',
        variant: 'destructive',
      });
    });
  });

  describe('useUpdateTranslationKey', () => {
    it('should update translation key successfully', async () => {
      const updateData = {
        description: 'Updated description',
        category: 'auth',
      };

      const mockResponse = mockApiResponses.mockSuccessResponse({
        id: 'key-1',
        ...updateData,
      });
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useUpdateTranslationKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'key-1', data: updateData });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/translation-keys/key-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    });
  });

  describe('useDeleteTranslationKey', () => {
    it('should delete translation key successfully', async () => {
      const mockResponse = mockApiResponses.mockSuccessResponse({
        message: 'Translation key deleted',
      });
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useDeleteTranslationKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('key-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/translation-keys/key-1', {
        method: 'DELETE',
      });
    });
  });

  describe('useTranslationEditor', () => {
    it('should load translation data for editing', async () => {
      const mockTranslationData = {
        translation_key: SAMPLE_TRANSLATION_KEYS[0],
        translations: SAMPLE_TRANSLATIONS.filter(t => t.translation_key_id === 'key-1'),
      };
      mockFetch.mockFetchSuccess(mockTranslationData);

      const { result } = renderHook(
        () => useTranslationEditor({ keyId: 'key-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.state.selectedKey).toEqual(SAMPLE_TRANSLATION_KEYS[0]);
      expect(result.current.state.translations.en).toBeTruthy();
      expect(result.current.state.translations.fr).toBeTruthy();
    });

    it('should save translation correctly', async () => {
      const mockTranslationData = {
        translation_key: SAMPLE_TRANSLATION_KEYS[0],
        translations: SAMPLE_TRANSLATIONS.filter(t => t.translation_key_id === 'key-1'),
      };
      mockFetch.mockFetchSuccess(mockTranslationData);

      const { result } = renderHook(
        () => useTranslationEditor({ keyId: 'key-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock successful save
      const saveResponse = mockApiResponses.mockSuccessResponse({
        id: 'trans-1-en',
        value: 'Updated value',
      });
      mockFetch.mockFetchSuccess(saveResponse);

      await act(async () => {
        result.current.actions.saveTranslation('en');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/translations/'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should save all translations at once', async () => {
      const mockTranslationData = {
        translation_key: SAMPLE_TRANSLATION_KEYS[0],
        translations: SAMPLE_TRANSLATIONS.filter(t => t.translation_key_id === 'key-1'),
      };
      mockFetch.mockFetchSuccess(mockTranslationData);

      const { result } = renderHook(
        () => useTranslationEditor({ keyId: 'key-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock successful saves for all locales
      mockFetch.mockFetchSuccess(mockApiResponses.mockSuccessResponse({}));

      await act(async () => {
        const success = await result.current.actions.saveAllTranslations();
        expect(success).toBe(true);
      });
    });
  });

  describe('useBulkTranslationOperations', () => {
    it('should handle bulk import successfully', async () => {
      const bulkData = testScenarios.createBulkImportScenario();
      const mockResponse = {
        processed: 2,
        created: 2,
        updated: 0,
        errors: [],
      };
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useBulkTranslationOperations(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(bulkData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/translations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData),
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Bulk operation completed',
        description: 'Processed 2 items successfully.',
      });
    });

    it('should handle bulk operation errors', async () => {
      mockFetch.mockFetchError('Bulk operation failed', 400);

      const { result } = renderHook(() => useBulkTranslationOperations(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(testScenarios.createBulkImportScenario());
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Bulk operation failed',
        description: 'Bulk operation failed',
        variant: 'destructive',
      });
    });
  });

  describe('useTranslationDashboardStats', () => {
    it('should fetch dashboard statistics', async () => {
      const mockStats = mockApiResponseBuilders.buildDashboardStatsResponse();
      mockFetch.mockFetchSuccess(mockStats);

      const { result } = renderHook(() => useTranslationDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/translations/dashboard-stats');
    });

    it('should refetch stats periodically', async () => {
      const mockStats = mockApiResponseBuilders.buildDashboardStatsResponse();
      mockFetch.mockFetchSuccess(mockStats);

      const { result } = renderHook(() => useTranslationDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The hook should be configured to refetch every 30 seconds
      expect(result.current.data).toBeTruthy();
    });
  });

  describe('useTranslationAnalytics', () => {
    it('should fetch analytics data with default parameters', async () => {
      const mockAnalytics = mockApiResponseBuilders.buildAnalyticsResponse();
      mockFetch.mockFetchSuccess(mockAnalytics);

      const { result } = renderHook(() => useTranslationAnalytics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAnalytics);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/translations/analytics?period=30d'
      );
    });

    it('should apply period and locale filters', async () => {
      const mockAnalytics = mockApiResponseBuilders.buildAnalyticsResponse();
      mockFetch.mockFetchSuccess(mockAnalytics);

      const { result } = renderHook(
        () => useTranslationAnalytics('7d', 'en'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/translations/analytics?period=7d&locale=en'
      );
    });
  });

  describe('useTranslationWorkflow', () => {
    it('should fetch pending translations', async () => {
      const pendingTranslations = SAMPLE_TRANSLATIONS.filter(t => t.status === 'review');
      mockFetch.mockFetchSuccess(pendingTranslations);

      const { result } = renderHook(() => useTranslationWorkflow(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingPending).toBe(false);
      });

      expect(result.current.pendingTranslations).toEqual(pendingTranslations);
    });

    it('should update translation status', async () => {
      mockFetch.mockFetchSuccess({ updated: 2 });

      const { result } = renderHook(() => useTranslationWorkflow(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.updateStatus({
          translationIds: ['trans-1', 'trans-2'],
          newStatus: 'approved',
          comment: 'Approved by admin',
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/translations/workflow/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            translation_ids: ['trans-1', 'trans-2'],
            new_status: 'approved',
            comment: 'Approved by admin',
          }),
        }
      );
    });
  });

  describe('useTranslationImportExport', () => {
    it('should handle file import', async () => {
      const mockFile = new File(['{"key": "value"}'], 'translations.json', {
        type: 'application/json',
      });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('format', 'json');

      const mockResponse = {
        processed: 10,
        created: 8,
        updated: 2,
        errors: [],
      };
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslationImportExport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.import(formData);
      });

      await waitFor(() => {
        expect(result.current.isImporting).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/translations/import', {
        method: 'POST',
        body: formData,
      });
    });

    it('should handle export request', async () => {
      const mockResponse = {
        download_url: '/api/admin/translations/download/export-123.json',
        filename: 'translations-export.json',
      };
      mockFetch.mockFetchSuccess(mockResponse);

      // Mock document methods for download
      const createElement = vi.spyOn(document, 'createElement');
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      createElement.mockReturnValue(mockLink as any);

      const appendChild = vi.spyOn(document.body, 'appendChild');
      const removeChild = vi.spyOn(document.body, 'removeChild');
      appendChild.mockImplementation(() => mockLink as any);
      removeChild.mockImplementation(() => mockLink as any);

      const { result } = renderHook(() => useTranslationImportExport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.export({ format: 'json', locale: 'en' });
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });

      expect(mockLink.href).toBe('/api/admin/translations/download/export-123.json');
      expect(mockLink.download).toBe('translations-export.json');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('useTranslationCategories', () => {
    it('should fetch translation categories', async () => {
      const mockCategories = ['common', 'auth', 'sop', 'training', 'analytics'];
      mockFetch.mockFetchSuccess(mockCategories);

      const { result } = renderHook(() => useTranslationCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/translation-keys/categories');
    });
  });

  describe('useTranslationPreview', () => {
    it('should fetch translation preview', async () => {
      const mockPreview = {
        key: 'common.welcome',
        locale: 'en',
        value: 'Welcome, {name}!',
        rendered: 'Welcome, John!',
        variables: { name: 'John' },
      };
      mockFetch.mockFetchSuccess(mockPreview);

      const { result } = renderHook(
        () => useTranslationPreview('common.welcome', 'en'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockPreview);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/translations/preview/common.welcome?locale=en'
      );
    });

    it('should not fetch when key is not provided', () => {
      const { result } = renderHook(
        () => useTranslationPreview(undefined, 'en'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});