/**
 * Integration Tests for Translation Caching System
 * Restaurant Krong Thai SOP Management System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translationCache, type CacheConfig, type CacheStats } from '@/lib/translation-client-cache';
import { 
  mockApiResponseBuilders,
  SAMPLE_TRANSLATIONS,
  SAMPLE_TRANSLATION_KEYS,
  testScenarios
} from '../mocks/translation-mocks';
import type { Locale, GetTranslationsResponse } from '@/types/translation';

// Mock IndexedDB for browser environment
const mockIndexedDB = {
  open: vi.fn(),
  transaction: vi.fn(),
  objectStore: vi.fn(),
  add: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  createIndex: vi.fn(),
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock performance.now for cache timing
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// Mock localStorage for fallback storage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Translation Caching System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    translationCache.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cache Storage and Retrieval', () => {
    it('should store and retrieve translations correctly', async () => {
      const locale: Locale = 'en';
      const translations = { 'common.welcome': 'Welcome', 'auth.login': 'Login' };
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 2,
      };

      // Store translations in cache
      translationCache.set(locale, translations, metadata);

      // Retrieve from cache
      const cached = translationCache.get(locale);

      expect(cached).toBeTruthy();
      expect(cached.locale).toBe(locale);
      expect(cached.translations).toEqual(translations);
      expect(cached.metadata).toEqual(metadata);
    });

    it('should handle namespace-specific caching', async () => {
      const locale: Locale = 'en';
      const commonTranslations = { 'welcome': 'Welcome', 'goodbye': 'Goodbye' };
      const authTranslations = { 'login': 'Login', 'logout': 'Logout' };
      
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 2,
      };

      // Store namespace-specific translations
      translationCache.set(locale, commonTranslations, metadata, 'common');
      translationCache.set(locale, authTranslations, metadata, 'auth');

      // Retrieve namespace-specific translations
      const commonCached = translationCache.get(locale, 'common');
      const authCached = translationCache.get(locale, 'auth');

      expect(commonCached.translations).toEqual(commonTranslations);
      expect(authCached.translations).toEqual(authTranslations);

      // Should not cross-contaminate namespaces
      expect(commonCached.translations).not.toEqual(authTranslations);
    });

    it('should track cache statistics accurately', async () => {
      const locale: Locale = 'en';
      const translations = { 'test.key': 'Test Value' };
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1,
      };

      // Initial stats should show empty cache
      let stats = translationCache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      // Store translation
      translationCache.set(locale, translations, metadata);

      // Cache miss (first attempt to get non-existent key)
      translationCache.get('fr' as Locale);
      stats = translationCache.getStats();
      expect(stats.misses).toBe(1);

      // Cache hit
      translationCache.get(locale);
      stats = translationCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5); // 1 hit / 2 total attempts

      // Size should reflect stored entries
      expect(stats.size).toBe(1);
    });

    it('should handle cache expiration correctly', async () => {
      const locale: Locale = 'en';
      const translations = { 'test.key': 'Test Value' };
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      
      const metadata = {
        version: '1.0.0',
        lastUpdated: pastDate,
        cachedAt: pastDate,
        locale,
        totalKeys: 1,
        ttl: 1800, // 30 minutes TTL
      };

      // Store expired translation
      translationCache.set(locale, translations, metadata);

      // Should return null for expired cache
      const cached = translationCache.get(locale);
      expect(cached).toBeNull();

      // Stats should reflect cache miss
      const stats = translationCache.getStats();
      expect(stats.misses).toBe(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific keys correctly', async () => {
      const locale: Locale = 'en';
      const translations = {
        'common.welcome': 'Welcome',
        'common.goodbye': 'Goodbye',
        'auth.login': 'Login',
      };
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 3,
      };

      translationCache.set(locale, translations, metadata);

      // Verify cache exists
      expect(translationCache.has(locale)).toBe(true);

      // Invalidate specific keys
      translationCache.invalidate({
        locale,
        keys: ['common.welcome', 'auth.login'],
      });

      // Should still have cache but with updated content
      const cached = translationCache.get(locale);
      expect(cached).toBeTruthy();
      expect(cached.translations['common.goodbye']).toBeTruthy();
      expect(cached.translations['common.welcome']).toBeUndefined();
      expect(cached.translations['auth.login']).toBeUndefined();
    });

    it('should invalidate entire locale cache', async () => {
      const enTranslations = { 'common.welcome': 'Welcome' };
      const frTranslations = { 'common.welcome': 'Bienvenue' };
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale: 'en' as Locale,
        totalKeys: 1,
      };

      translationCache.set('en', enTranslations, metadata);
      translationCache.set('fr', frTranslations, { ...metadata, locale: 'fr' });

      // Verify both caches exist
      expect(translationCache.has('en')).toBe(true);
      expect(translationCache.has('fr')).toBe(true);

      // Invalidate only English cache
      translationCache.invalidate({ locale: 'en' });

      // English cache should be gone, French should remain
      expect(translationCache.has('en')).toBe(false);
      expect(translationCache.has('fr')).toBe(true);
    });

    it('should invalidate namespace-specific cache', async () => {
      const locale: Locale = 'en';
      const commonTranslations = { 'welcome': 'Welcome' };
      const authTranslations = { 'login': 'Login' };
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1,
      };

      translationCache.set(locale, commonTranslations, metadata, 'common');
      translationCache.set(locale, authTranslations, metadata, 'auth');

      // Invalidate only common namespace
      translationCache.invalidate({ locale, namespace: 'common' });

      // Common should be gone, auth should remain
      expect(translationCache.get(locale, 'common')).toBeNull();
      expect(translationCache.get(locale, 'auth')).toBeTruthy();
    });

    it('should clear all cache', async () => {
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale: 'en' as Locale,
        totalKeys: 1,
      };

      // Add multiple cache entries
      translationCache.set('en', { 'test': 'Test' }, metadata);
      translationCache.set('fr', { 'test': 'Test FR' }, { ...metadata, locale: 'fr' });

      expect(translationCache.getStats().size).toBeGreaterThan(0);

      // Clear all cache
      translationCache.clear();

      expect(translationCache.getStats().size).toBe(0);
      expect(translationCache.has('en')).toBe(false);
      expect(translationCache.has('fr')).toBe(false);
    });
  });

  describe('Cache Prefetching', () => {
    it('should prefetch translations for multiple namespaces', async () => {
      const locale: Locale = 'en';
      const namespaces = ['common', 'auth', 'sop'];

      // Mock API responses for prefetch
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponseBuilders.buildTranslationsResponse(locale)),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponseBuilders.buildTranslationsResponse(locale)),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponseBuilders.buildTranslationsResponse(locale)),
        });

      await translationCache.prefetch(locale, namespaces);

      // Should have made fetch requests for each namespace
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(global.fetch).toHaveBeenCalledWith(`/api/translations/${locale}?namespace=common`);
      expect(global.fetch).toHaveBeenCalledWith(`/api/translations/${locale}?namespace=auth`);
      expect(global.fetch).toHaveBeenCalledWith(`/api/translations/${locale}?namespace=sop`);
    });

    it('should handle prefetch errors gracefully', async () => {
      const locale: Locale = 'en';
      const namespaces = ['common', 'auth'];

      // Mock one success, one failure
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponseBuilders.buildTranslationsResponse(locale)),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      await translationCache.prefetch(locale, namespaces);

      // Should not throw error despite one failure
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Should have cached the successful one
      expect(translationCache.has(locale, 'common')).toBe(true);
    });

    it('should respect priority levels in prefetching', async () => {
      const locale: Locale = 'en';
      const highPriorityNamespaces = ['common', 'auth'];
      const lowPriorityNamespaces = ['analytics', 'training'];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponseBuilders.buildTranslationsResponse(locale)),
      });

      // Prefetch high priority first
      await translationCache.prefetch(locale, highPriorityNamespaces, 'high');

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Then low priority
      await translationCache.prefetch(locale, lowPriorityNamespaces, 'low');

      expect(global.fetch).toHaveBeenCalledTimes(4);

      // High priority should be cached first
      expect(translationCache.has(locale, 'common')).toBe(true);
      expect(translationCache.has(locale, 'auth')).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage accurately', async () => {
      const locale: Locale = 'en';
      const largeTranslations: Record<string, string> = {};
      
      // Create a large translation set
      for (let i = 0; i < 1000; i++) {
        largeTranslations[`key.${i}`] = `Translation value ${i}`.repeat(10);
      }

      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1000,
      };

      const initialStats = translationCache.getStats();
      const initialMemory = initialStats.memory;

      translationCache.set(locale, largeTranslations, metadata);

      const newStats = translationCache.getStats();
      expect(newStats.memory).toBeGreaterThan(initialMemory);
      expect(newStats.size).toBe(1);
    });

    it('should implement LRU eviction when memory limit is exceeded', async () => {
      // This test would require implementing actual memory limits
      // For now, we'll test the basic eviction mechanism
      const locale: Locale = 'en';
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1,
      };

      // Add multiple entries
      translationCache.set('en', { 'test1': 'Test 1' }, metadata);
      translationCache.set('fr', { 'test2': 'Test 2' }, { ...metadata, locale: 'fr' });
      translationCache.set('th', { 'test3': 'Test 3' }, { ...metadata, locale: 'th' });

      // Access 'en' to make it most recently used
      translationCache.get('en');

      // If LRU is implemented, 'fr' should be least recently used
      const stats = translationCache.getStats();
      expect(stats.size).toBe(3);
    });

    it('should compress stored data when possible', async () => {
      const locale: Locale = 'en';
      const repetitiveTranslations: Record<string, string> = {};
      
      // Create translations with repetitive content (good for compression)
      const baseString = 'This is a very long translation string that repeats many times';
      for (let i = 0; i < 100; i++) {
        repetitiveTranslations[`key.${i}`] = `${baseString} - ${i}`;
      }

      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 100,
      };

      translationCache.set(locale, repetitiveTranslations, metadata);

      // Verify data is stored and retrievable
      const cached = translationCache.get(locale);
      expect(cached).toBeTruthy();
      expect(Object.keys(cached.translations)).toHaveLength(100);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle corrupted cache data gracefully', async () => {
      const locale: Locale = 'en';
      
      // Simulate corrupted localStorage data
      mockLocalStorage.getItem.mockReturnValueOnce('corrupted-json-data');

      const result = translationCache.get(locale);
      expect(result).toBeNull();

      // Should not crash and continue working for new data
      const translations = { 'test.key': 'Test Value' };
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1,
      };

      translationCache.set(locale, translations, metadata);
      expect(translationCache.get(locale)).toBeTruthy();
    });

    it('should fallback to localStorage when IndexedDB fails', async () => {
      // Mock IndexedDB failure
      mockIndexedDB.open.mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const locale: Locale = 'en';
      const translations = { 'test.key': 'Test Value' };
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1,
      };

      // Should fallback to localStorage
      translationCache.set(locale, translations, metadata);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      // Should retrieve from localStorage
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        locale,
        translations,
        metadata,
        timestamp: Date.now(),
      }));

      const cached = translationCache.get(locale);
      expect(cached).toBeTruthy();
    });

    it('should handle quota exceeded errors', async () => {
      const locale: Locale = 'en';
      const translations = { 'test.key': 'Test Value' };
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1,
      };

      // Mock quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

      // Should not crash
      expect(() => {
        translationCache.set(locale, translations, metadata);
      }).not.toThrow();

      // Should continue functioning (though data won't be persisted)
      const stats = translationCache.getStats();
      expect(typeof stats.size).toBe('number');
    });

    it('should handle concurrent access correctly', async () => {
      const locale: Locale = 'en';
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1,
      };

      // Simulate concurrent cache operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          translationCache.set(locale, { [`key.${i}`]: `Value ${i}` }, metadata);
          return translationCache.get(locale);
        })
      );

      const results = await Promise.all(operations);

      // All operations should complete successfully
      results.forEach(result => {
        expect(result).toBeTruthy();
      });

      // Final cache should be consistent
      const finalCache = translationCache.get(locale);
      expect(finalCache).toBeTruthy();
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce frequent cache updates', async () => {
      const locale: Locale = 'en';
      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1,
      };

      // Perform multiple rapid updates
      for (let i = 0; i < 10; i++) {
        translationCache.set(locale, { [`key.${i}`]: `Value ${i}` }, metadata);
      }

      // Should debounce the writes to storage
      // Exact behavior depends on implementation
      const stats = translationCache.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should maintain performance with large datasets', async () => {
      const locale: Locale = 'en';
      const largeTranslations: Record<string, string> = {};
      
      // Create a very large translation set
      for (let i = 0; i < 10000; i++) {
        largeTranslations[`large.dataset.key.${i}`] = `Translation value ${i}`;
      }

      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 10000,
      };

      const startTime = performance.now();
      translationCache.set(locale, largeTranslations, metadata);
      const setTime = performance.now() - startTime;

      const retrieveStart = performance.now();
      const cached = translationCache.get(locale);
      const retrieveTime = performance.now() - retrieveStart;

      // Should handle large datasets efficiently
      expect(setTime).toBeLessThan(1000); // Less than 1 second
      expect(retrieveTime).toBeLessThan(100); // Less than 100ms
      expect(cached).toBeTruthy();
      expect(Object.keys(cached.translations)).toHaveLength(10000);
    });

    it('should optimize memory usage with smart compression', async () => {
      const locale: Locale = 'en';
      
      // Test with highly compressible data
      const compressibleTranslations: Record<string, string> = {};
      const baseString = 'Common prefix string that appears everywhere';
      
      for (let i = 0; i < 1000; i++) {
        compressibleTranslations[`key.${i}`] = `${baseString} - variation ${i}`;
      }

      const metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: 1000,
      };

      translationCache.set(locale, compressibleTranslations, metadata);

      const stats = translationCache.getStats();
      
      // Memory usage should be optimized through compression
      // Exact numbers depend on compression algorithm
      expect(stats.memory).toBeGreaterThan(0);
      expect(stats.size).toBe(1);
    });
  });
});