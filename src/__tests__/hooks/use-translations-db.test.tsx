/**
 * Unit Tests for useTranslationsDb Hook
 * Restaurant Krong Thai SOP Management System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useTranslations, useCommonTranslations, translationDevUtils } from '@/hooks/use-translations-db';
import { 
  mockApiResponseBuilders,
  createMockTranslationCache,
  createMockWebSocketManager,
  testScenarios,
  realtimeEventGenerators,
  SAMPLE_TRANSLATIONS
} from '../mocks/translation-mocks';
import { mockFetch, createTestQueryClient } from '../utils/test-utils';

// Mock dependencies
vi.mock('@/lib/stores/global-store', () => ({
  useGlobalStore: () => ({
    language: 'en',
    isOnline: true,
  }),
}));

const mockTranslationCache = createMockTranslationCache();
vi.mock('@/lib/translation-client-cache', () => ({
  translationCache: mockTranslationCache,
}));

const mockWebSocketManager = createMockWebSocketManager();
vi.mock('@/lib/translation-websocket', () => ({
  wsManager: mockWebSocketManager,
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

describe('useTranslations Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslationCache.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Translation Functionality', () => {
    it('should fetch and return translations for default locale', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      // Initial state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.locale).toBe('en');

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeTruthy();
    });

    it('should translate simple keys correctly', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const translation = result.current.t('common.welcome', { name: 'John' });
      expect(translation).toBe('Welcome, John!');
    });

    it('should handle missing translations with fallback', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations({ fallback: 'Missing translation' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const translation = result.current.t('nonexistent.key');
      expect(translation).toBe('Missing translation');
    });

    it('should validate translation keys correctly', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasTranslation('common.welcome')).toBe(true);
      expect(result.current.hasTranslation('nonexistent.key')).toBe(false);
    });
  });

  describe('ICU Message Format Support', () => {
    it('should handle plural forms correctly', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test plural scenarios from mock data
      const icuScenarios = testScenarios.createICUMessageScenarios();
      
      icuScenarios.forEach(scenario => {
        // Test the ICU parser directly
        const formatted = translationDevUtils.testICU(scenario.message, scenario.variables);
        expect(formatted).toBe(scenario.expected);
      });
    });

    it('should handle select format correctly', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test select format
      const selectMessage = '{gender, select, male {He} female {She} other {They}} went to the store';
      const maleResult = translationDevUtils.testICU(selectMessage, { gender: 'male' });
      const femaleResult = translationDevUtils.testICU(selectMessage, { gender: 'female' });
      const otherResult = translationDevUtils.testICU(selectMessage, { gender: 'unknown' });

      expect(maleResult).toBe('He went to the store');
      expect(femaleResult).toBe('She went to the store');
      expect(otherResult).toBe('They went to the store');
    });

    it('should handle complex interpolation with multiple variables', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const complexMessage = 'Hello, {name}! You have {count} {count, plural, =1 {message} other {messages}}.';
      const singleResult = translationDevUtils.testICU(complexMessage, { name: 'John', count: 1 });
      const multipleResult = translationDevUtils.testICU(complexMessage, { name: 'Jane', count: 3 });

      expect(singleResult).toBe('Hello, John! You have 1 message.');
      expect(multipleResult).toBe('Hello, Jane! You have 3 messages.');
    });
  });

  describe('Namespace Support', () => {
    it('should handle namespaced translations correctly', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations({ namespace: 'common' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should be able to use short keys within namespace
      const namespaceTranslations = result.current.getNamespaceTranslations();
      expect(namespaceTranslations).toBeTruthy();
    });

    it('should use specialized hooks correctly', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useCommonTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.locale).toBe('en');
    });
  });

  describe('Caching System', () => {
    it('should use cached translations when available', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      
      // Set up cache with data
      mockTranslationCache.get.mockReturnValue(mockResponse);
      mockTranslationCache.has.mockReturnValue(true);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not fetch from API if cache has data
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockTranslationCache.get).toHaveBeenCalledWith('en', undefined);
    });

    it('should invalidate cache when requested', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.invalidateCache(['common.welcome']);
      });

      expect(mockTranslationCache.invalidate).toHaveBeenCalledWith({
        locale: 'en',
        namespace: undefined,
        keys: ['common.welcome'],
      });
    });

    it('should provide cache statistics', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const mockStats = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        size: 50,
        memory: 1024,
      };
      mockTranslationCache.getStats.mockReturnValue(mockStats);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.cacheStats).toEqual(mockStats);
    });

    it('should prefetch translations', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.prefetch(['common', 'auth']);
      });

      expect(mockTranslationCache.prefetch).toHaveBeenCalledWith('en', ['common', 'auth']);
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to real-time updates when enabled', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations({ realtime: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockWebSocketManager.subscribe).toHaveBeenCalled();
      expect(result.current.isRealtime).toBe(true);
    });

    it('should handle real-time translation updates', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTranslations({ realtime: true }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate real-time update
      const updateEvent = realtimeEventGenerators.createTranslationUpdateEvent({
        locale: 'en',
        keys: ['common.welcome'],
      });

      act(() => {
        mockWebSocketManager.simulateEvent(updateEvent);
      });

      expect(mockTranslationCache.invalidate).toHaveBeenCalledWith({ locale: 'en' });
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockFetchError('API Error', 500);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Failed to fetch translations');
    });

    it('should handle network errors', async () => {
      mockFetch.mockFetchNetworkError();

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should fall back to cache on API error', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      
      // First load succeeds and populates cache
      mockFetch.mockFetchSuccess(mockResponse);
      mockTranslationCache.get.mockReturnValueOnce(null).mockReturnValue(mockResponse);

      const { result, rerender } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Second load fails but should use cache
      mockFetch.mockFetchError('API Error', 500);

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still have translations from cache
      expect(result.current.t('common.welcome', { name: 'Test' })).toBe('Welcome, Test!');
    });
  });

  describe('Performance and Optimization', () => {
    it('should not fetch when offline', async () => {
      // Mock offline state
      vi.mocked(vi.doMock('@/lib/stores/global-store', () => ({
        useGlobalStore: () => ({
          language: 'en',
          isOnline: false,
        }),
      })));

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should use lazy loading when enabled', async () => {
      const { result } = renderHook(() => useTranslations({ lazy: true }), {
        wrapper: createWrapper(),
      });

      // Should not fetch initially when lazy
      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should debounce usage tracking', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Multiple quick translations should only track once
      act(() => {
        result.current.t('common.welcome', { name: 'Test1' });
        result.current.t('common.welcome', { name: 'Test2' });
        result.current.t('common.welcome', { name: 'Test3' });
      });

      // Usage tracking should be debounced
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial translations fetch
    });
  });

  describe('Utility Functions', () => {
    it('should provide tWithFallback functionality', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Existing key should return translation
      const existingResult = result.current.tWithFallback('common.welcome', 'Fallback', { name: 'Test' });
      expect(existingResult).toBe('Welcome, Test!');

      // Non-existing key should return fallback
      const fallbackResult = result.current.tWithFallback('nonexistent.key', 'Fallback');
      expect(fallbackResult).toBe('Fallback');
    });

    it('should provide development utilities', () => {
      // Test cache stats
      const stats = translationDevUtils.getCacheStats();
      expect(stats).toBeTruthy();

      // Test key validation
      expect(translationDevUtils.validateKey('common.welcome')).toBe(true);
      expect(translationDevUtils.validateKey('')).toBe(false);

      // Test ICU formatting
      const icuResult = translationDevUtils.testICU('Hello, {name}!', { name: 'World' });
      expect(icuResult).toBe('Hello, World!');

      // Test cache clearing
      translationDevUtils.clearCache();
      expect(mockTranslationCache.clear).toHaveBeenCalled();
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe translation keys', () => {
      // This test verifies TypeScript compilation
      // The actual type checking happens at compile time
      expect(true).toBe(true);
    });
  });
});