/**
 * Performance Tests for Translation System
 * Restaurant Krong Thai SOP Management System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useTranslations, useTranslationLoader, translationDevUtils } from '@/hooks/use-translations-db';
import { translationCache } from '@/lib/translation-client-cache';
import {
  mockApiResponseBuilders,
  testScenarios,
  createMockTranslationCache
} from '../mocks/translation-mocks';
import { createTestQueryClient, mockFetch } from '../utils/test-utils';
import type { Locale } from '@/types/translation';

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

// Test wrapper component
const createWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

describe('Translation System Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    // Mock performance.now for consistent timing
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Translation Loading Performance', () => {
    it('should load translations in under 100ms for cached data', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      
      // Setup cache hit
      mockTranslationCache.get.mockReturnValue(mockResponse);
      mockTranslationCache.has.mockReturnValue(true);

      const startTime = performance.now();
      
      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(100); // Should be under 100ms
      expect(result.current.error).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled(); // Should use cache
    });

    it('should load translations in under 500ms for API requests', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      
      // Setup cache miss
      mockTranslationCache.get.mockReturnValue(null);
      mockTranslationCache.has.mockReturnValue(false);
      
      // Mock API response time
      mockFetch.mockFetchSuccess(mockResponse);

      const startTime = performance.now();
      
      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(500); // Should be under 500ms
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle large translation sets efficiently', async () => {
      // Create large translation set
      const largeTranslations: Record<string, string> = {};
      for (let i = 0; i < 10000; i++) {
        largeTranslations[`test.key.${i}`] = `Test translation value ${i}`;
      }

      const mockResponse = {
        locale: 'en' as Locale,
        translations: largeTranslations,
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          cachedAt: new Date().toISOString(),
          locale: 'en' as Locale,
          totalKeys: 10000,
        },
      };

      mockFetch.mockFetchSuccess(mockResponse);
      mockTranslationCache.get.mockReturnValue(null);
      mockTranslationCache.has.mockReturnValue(false);

      const startTime = performance.now();
      
      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(1000); // Should handle 10k translations in under 1s
      expect(result.current.error).toBeNull();
      
      // Test translation lookup performance
      const lookupStart = performance.now();
      const translation = result.current.t('test.key.5000');
      const lookupEnd = performance.now();
      
      expect(lookupEnd - lookupStart).toBeLessThan(10); // Lookup should be under 10ms
      expect(translation).toBe('Test translation value 5000');
    });

    it('should maintain performance with high-frequency translation calls', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockTranslationCache.get.mockReturnValue(mockResponse);
      mockTranslationCache.has.mockReturnValue(true);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Perform many translation calls rapidly
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        result.current.t('common.welcome', { name: `User${i}` });
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // 1000 calls in under 100ms
      expect(totalTime / 1000).toBeLessThan(0.1); // Under 0.1ms per call
    });
  });

  describe('Cache Performance', () => {
    it('should achieve >95% cache hit rate in typical usage', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      
      // Initial cache miss, then hits
      mockTranslationCache.get
        .mockReturnValueOnce(null) // First call: cache miss
        .mockReturnValue(mockResponse); // Subsequent calls: cache hits
      
      mockTranslationCache.has
        .mockReturnValueOnce(false) // First call: not in cache
        .mockReturnValue(true); // Subsequent calls: in cache

      mockFetch.mockFetchSuccess(mockResponse);

      // First load (cache miss)
      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate multiple subsequent uses (cache hits)
      for (let i = 0; i < 100; i++) {
        result.current.t('common.welcome');
      }

      const stats = result.current.cacheStats;
      expect(stats.hitRate).toBeGreaterThan(0.95); // >95% hit rate
    });

    it('should manage cache memory efficiently', async () => {
      const scenarios = testScenarios.createPerformanceScenarios();
      
      // Test with large translation set
      const largeSet = scenarios.largeTranslationSet;
      
      const startMemory = mockTranslationCache.getStats().memory;
      
      // Store large translation set
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale: 'en' as Locale,
        totalKeys: largeSet.length,
      };

      const translations: Record<string, string> = {};
      largeSet.forEach(item => {
        translations[item.key] = item.translations.en;
      });

      mockTranslationCache.set('en', translations, metadata);

      const endMemory = mockTranslationCache.getStats().memory;
      const memoryIncrease = endMemory - startMemory;

      // Memory usage should be reasonable (implementation-dependent)
      expect(memoryIncrease).toBeGreaterThan(0);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Under 100MB
    });

    it('should handle cache invalidation efficiently', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockTranslationCache.get.mockReturnValue(mockResponse);
      mockTranslationCache.has.mockReturnValue(true);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test cache invalidation performance
      const invalidationStart = performance.now();
      
      result.current.invalidateCache(['common.welcome', 'auth.login']);
      
      const invalidationEnd = performance.now();
      const invalidationTime = invalidationEnd - invalidationStart;

      expect(invalidationTime).toBeLessThan(50); // Under 50ms for targeted invalidation

      // Test full cache clear performance
      const clearStart = performance.now();
      
      result.current.invalidateCache(); // Clear all
      
      const clearEnd = performance.now();
      const clearTime = clearEnd - clearStart;

      expect(clearTime).toBeLessThan(100); // Under 100ms for full clear
    });

    it('should handle concurrent cache operations efficiently', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      // Create multiple concurrent hook instances
      const hooks = Array.from({ length: 10 }, () =>
        renderHook(() => useTranslations(), { wrapper: createWrapper() })
      );

      const startTime = performance.now();

      await Promise.all(
        hooks.map(({ result }) =>
          waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          })
        )
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // All 10 hooks should load in under 1s

      // All hooks should be functional
      hooks.forEach(({ result }) => {
        expect(result.current.error).toBeNull();
        expect(typeof result.current.t).toBe('function');
      });

      // Cleanup
      hooks.forEach(({ unmount }) => unmount());
    });
  });

  describe('ICU Message Format Performance', () => {
    it('should format simple messages quickly', () => {
      const message = 'Hello, {name}!';
      const variables = { name: 'John' };

      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        translationDevUtils.testICU(message, variables);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / 10000;

      expect(avgTime).toBeLessThan(0.1); // Under 0.1ms per formatting operation
    });

    it('should handle complex ICU messages efficiently', () => {
      const complexMessage = '{count, plural, =0 {No {type, select, user {users} admin {administrators} other {items}}} =1 {One {type, select, user {user} admin {administrator} other {item}}} other {# {type, select, user {users} admin {administrators} other {items}}}}';
      
      const testCases = [
        { count: 0, type: 'user' },
        { count: 1, type: 'admin' },
        { count: 5, type: 'other' },
      ];

      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        testCases.forEach(variables => {
          translationDevUtils.testICU(complexMessage, variables);
        });
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / (1000 * testCases.length);

      expect(avgTime).toBeLessThan(1); // Under 1ms per complex formatting operation
    });

    it('should handle large variable sets efficiently', () => {
      const variables: Record<string, any> = {};
      let message = 'Complex message with many variables: ';
      
      // Create 100 variables
      for (let i = 0; i < 100; i++) {
        variables[`var${i}`] = `value${i}`;
        message += `{var${i}} `;
      }

      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        translationDevUtils.testICU(message, variables);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / 100;

      expect(avgTime).toBeLessThan(10); // Under 10ms per operation with 100 variables
    });
  });

  describe('Preloading Performance', () => {
    it('should preload all translations efficiently', async () => {
      const mockResponses = [
        mockApiResponseBuilders.buildTranslationsResponse('en'),
        mockApiResponseBuilders.buildTranslationsResponse('fr'),
      ];

      // Mock multiple API calls for different namespaces
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[0]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[1]),
        });

      const { result } = renderHook(() => useTranslationLoader(), {
        wrapper: createWrapper(),
      });

      const startTime = performance.now();
      
      result.current.preloadAll();

      await waitFor(() => {
        expect(result.current.isPreloading).toBe(false);
      });

      const endTime = performance.now();
      const preloadTime = endTime - startTime;

      expect(preloadTime).toBeLessThan(2000); // Should preload all in under 2s
      expect(result.current.preloadError).toBeNull();
    });

    it('should handle selective prefetching efficiently', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockTranslationCache.prefetch = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const namespaces = ['common', 'auth', 'sop', 'training'];
      
      const startTime = performance.now();
      
      await result.current.prefetch(namespaces);
      
      const endTime = performance.now();
      const prefetchTime = endTime - startTime;

      expect(prefetchTime).toBeLessThan(1000); // Should prefetch 4 namespaces in under 1s
      expect(mockTranslationCache.prefetch).toHaveBeenCalledWith('en', namespaces);
    });
  });

  describe('Stress Testing', () => {
    it('should handle 100 concurrent translation requests', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const startTime = performance.now();

      // Create 100 concurrent requests
      const requests = Array.from({ length: 100 }, () =>
        renderHook(() => useTranslations(), { wrapper: createWrapper() })
      );

      await Promise.all(
        requests.map(({ result }) =>
          waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          })
        )
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // Should handle 100 requests in under 5s

      // All requests should succeed
      requests.forEach(({ result }) => {
        expect(result.current.error).toBeNull();
      });

      // Cleanup
      requests.forEach(({ unmount }) => unmount());
    });

    it('should maintain performance under memory pressure', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockTranslationCache.get.mockReturnValue(mockResponse);
      mockTranslationCache.has.mockReturnValue(true);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate memory pressure with many operations
      const operations = [];
      
      for (let i = 0; i < 10000; i++) {
        operations.push(() => {
          result.current.t('common.welcome', { name: `User${i}` });
          result.current.hasTranslation('auth.login');
          if (i % 100 === 0) {
            result.current.invalidateCache([`test.key.${i}`]);
          }
        });
      }

      const startTime = performance.now();
      
      operations.forEach(op => op());
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // 10k operations in under 1s
      expect(result.current.error).toBeNull();
    });

    it('should handle rapid locale switching', async () => {
      const enResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      const frResponse = mockApiResponseBuilders.buildTranslationsResponse('fr');

      // Mock store to control locale switching
      const mockStore = {
        language: 'en',
        isOnline: true,
      };

      vi.mocked(vi.doMock('@/lib/stores/global-store', () => ({
        useGlobalStore: () => mockStore,
      })));

      const { result, rerender } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      // Rapidly switch locales
      const locales = ['en', 'fr', 'en', 'fr', 'en'];
      const startTime = performance.now();

      for (const locale of locales) {
        mockStore.language = locale;
        const response = locale === 'en' ? enResponse : frResponse;
        mockTranslationCache.get.mockReturnValue(response);
        
        rerender();
        
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // 5 locale switches in under 1s
      expect(result.current.error).toBeNull();
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle restaurant peak hours simulation', async () => {
      // Simulate peak restaurant hours with high translation usage
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockTranslationCache.get.mockReturnValue(mockResponse);
      mockTranslationCache.has.mockReturnValue(true);

      const { result } = renderHook(() => useTranslations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate peak usage patterns
      const restaurantOperations = [
        () => result.current.t('sop.food_safety.title'),
        () => result.current.t('training.module.progress', { current: 5, total: 10 }),
        () => result.current.t('analytics.performance_score', { score: 95 }),
        () => result.current.t('common.welcome', { name: 'Staff Member' }),
        () => result.current.t('auth.login'),
      ];

      const startTime = performance.now();

      // Simulate 1 hour of peak operations (1 operation per second)
      for (let i = 0; i < 3600; i++) {
        const operation = restaurantOperations[i % restaurantOperations.length];
        operation();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // 3600 operations in under 1s
      expect(result.current.error).toBeNull();
    });

    it('should handle multi-tablet deployment scenario', async () => {
      // Simulate 10 tablets accessing translations simultaneously
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const tablets = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        hook: renderHook(() => useTranslations(), { wrapper: createWrapper() }),
      }));

      const startTime = performance.now();

      // All tablets initialize simultaneously
      await Promise.all(
        tablets.map(tablet =>
          waitFor(() => {
            expect(tablet.hook.result.current.isLoading).toBe(false);
          })
        )
      );

      // All tablets perform operations simultaneously
      for (let round = 0; round < 100; round++) {
        tablets.forEach(tablet => {
          tablet.hook.result.current.t('common.welcome', { name: `Tablet${tablet.id}` });
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(2000); // 10 tablets with 100 operations each in under 2s

      // All tablets should be functional
      tablets.forEach(tablet => {
        expect(tablet.hook.result.current.error).toBeNull();
      });

      // Cleanup
      tablets.forEach(tablet => tablet.hook.unmount());
    });
  });
});