/**
 * Test Utilities for Translation System Testing
 * Restaurant Krong Thai SOP Management System
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, MockedFunction } from 'vitest';
import type {
  TranslationKey,
  Translation,
  TranslationAdminItem,
  TranslationKeyFormData,
  BulkOperationData,
  TranslationAnalyticsData,
  TranslationDashboardStats,
  Locale,
  TranslationStatus,
  GetTranslationsResponse,
  TranslationMetadata
} from '@/types/translation';
import type { TranslationAdminFilters } from '@/types/translation-admin';

// Test providers wrapper
interface AllTheProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ 
  children, 
  queryClient: customQueryClient 
}) => {
  const queryClient = customQueryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  {
    queryClient,
    ...renderOptions
  }: RenderOptions & { queryClient?: QueryClient } = {}
): RenderResult => {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProvidersProps queryClient={queryClient}>
        {children}
      </AllTheProvidersProps>
    ),
    ...renderOptions,
  });
};

// Create test query client
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Mock data generators
export const mockDataGenerators = {
  /**
   * Create a mock translation key
   */
  createMockTranslationKey(overrides: Partial<TranslationKey> = {}): TranslationKey {
    return {
      id: `key-${Math.random().toString(36).substr(2, 9)}`,
      key: `test.${Math.random().toString(36).substr(2, 5)}`,
      category: 'common',
      description: 'Test translation key',
      interpolation_vars: [],
      context: 'Test context',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'test-user',
      ...overrides,
    };
  },

  /**
   * Create a mock translation
   */
  createMockTranslation(overrides: Partial<Translation> = {}): Translation {
    return {
      id: `trans-${Math.random().toString(36).substr(2, 9)}`,
      translation_key_id: 'test-key-id',
      locale: 'en' as Locale,
      value: 'Test translation value',
      status: 'published' as TranslationStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'test-user',
      updated_by: 'test-user',
      version: 1,
      ...overrides,
    };
  },

  /**
   * Create a mock translation admin item
   */
  createMockTranslationAdminItem(overrides: Partial<TranslationAdminItem> = {}): TranslationAdminItem {
    const key = mockDataGenerators.createMockTranslationKey();
    const translations = [
      mockDataGenerators.createMockTranslation({ locale: 'en', translation_key_id: key.id }),
      mockDataGenerators.createMockTranslation({ locale: 'fr', translation_key_id: key.id }),
    ];

    return {
      translation_key: key,
      translations,
      usage_stats: {
        total_usage: 100,
        cache_hits: 85,
        last_accessed: new Date().toISOString(),
        performance_score: 95,
      },
      workflow_status: 'published',
      ...overrides,
    };
  },

  /**
   * Create mock translation key form data
   */
  createMockTranslationKeyFormData(overrides: Partial<TranslationKeyFormData> = {}): TranslationKeyFormData {
    return {
      key: `test.${Math.random().toString(36).substr(2, 5)}`,
      category: 'common',
      description: 'Test form data',
      interpolation_vars: ['name', 'count'],
      context: 'Test context',
      translations: {
        en: { value: 'Test English value', status: 'draft' },
        fr: { value: 'Test French value', status: 'draft' },
      },
      ...overrides,
    };
  },

  /**
   * Create mock bulk operation data
   */
  createMockBulkOperationData(overrides: Partial<BulkOperationData> = {}): BulkOperationData {
    return {
      operation: 'import',
      format: 'json',
      data: [
        {
          key: 'test.bulk.key1',
          category: 'common',
          translations: {
            en: 'English value 1',
            fr: 'French value 1',
          },
        },
        {
          key: 'test.bulk.key2',
          category: 'common',
          translations: {
            en: 'English value 2',
            fr: 'French value 2',
          },
        },
      ],
      options: {
        overwrite: false,
        validate: true,
        create_missing_keys: true,
      },
      ...overrides,
    };
  },

  /**
   * Create mock analytics data
   */
  createMockAnalyticsData(overrides: Partial<TranslationAnalyticsData> = {}): TranslationAnalyticsData {
    return {
      usage_by_key: [
        { key: 'common.welcome', usage_count: 150, cache_hit_rate: 0.85 },
        { key: 'auth.login', usage_count: 120, cache_hit_rate: 0.90 },
        { key: 'sop.title', usage_count: 200, cache_hit_rate: 0.88 },
      ],
      usage_by_locale: [
        { locale: 'en', usage_count: 300, cache_hit_rate: 0.87 },
        { locale: 'fr', usage_count: 170, cache_hit_rate: 0.89 },
      ],
      performance_metrics: {
        avg_response_time: 45,
        cache_hit_rate: 0.88,
        error_rate: 0.001,
        total_requests: 1000,
      },
      trending_keys: [
        { key: 'dashboard.new_feature', usage_growth: 0.45 },
        { key: 'training.module', usage_growth: 0.30 },
      ],
      quality_metrics: {
        completion_rate: 0.95,
        missing_translations: 12,
        outdated_translations: 8,
        validation_errors: 2,
      },
      period: '30d',
      ...overrides,
    };
  },

  /**
   * Create mock dashboard stats
   */
  createMockDashboardStats(overrides: Partial<TranslationDashboardStats> = {}): TranslationDashboardStats {
    return {
      total_keys: 150,
      total_translations: 300,
      completion_by_locale: {
        en: 0.98,
        fr: 0.92,
      },
      pending_review: 8,
      recent_activity: [
        {
          type: 'created',
          key: 'new.translation.key',
          locale: 'en',
          timestamp: new Date().toISOString(),
          user: 'test-user',
        },
        {
          type: 'updated',
          key: 'existing.key',
          locale: 'fr',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'test-user-2',
        },
      ],
      performance_summary: {
        avg_load_time: 42,
        cache_efficiency: 0.89,
        error_rate: 0.002,
      },
      ...overrides,
    };
  },

  /**
   * Create mock get translations response
   */
  createMockGetTranslationsResponse(overrides: Partial<GetTranslationsResponse> = {}): GetTranslationsResponse {
    return {
      locale: 'en',
      translations: {
        'common.welcome': 'Welcome',
        'common.loading': 'Loading...',
        'auth.login': 'Login',
        'auth.logout': 'Logout',
        'sop.title': 'Standard Operating Procedures',
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale: 'en',
        totalKeys: 5,
      },
      ...overrides,
    };
  },

  /**
   * Create multiple mock items
   */
  createMockTranslationKeyList(count: number = 5): TranslationKey[] {
    return Array.from({ length: count }, (_, index) =>
      mockDataGenerators.createMockTranslationKey({
        key: `test.key.${index + 1}`,
        category: index % 2 === 0 ? 'common' : 'auth',
      })
    );
  },

  /**
   * Create translations for a key in multiple locales
   */
  createMockTranslationSet(keyId: string, locales: Locale[] = ['en', 'fr']): Translation[] {
    return locales.map(locale =>
      mockDataGenerators.createMockTranslation({
        translation_key_id: keyId,
        locale,
        value: `Test value in ${locale}`,
      })
    );
  },
};

// Mock API response helpers
export const mockApiResponses = {
  /**
   * Mock successful API response
   */
  mockSuccessResponse<T>(data: T) {
    return {
      success: true,
      data,
      requestId: 'test-request-id',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Mock error API response
   */
  mockErrorResponse(message: string, code = 'TEST_ERROR') {
    return {
      success: false,
      error: {
        code,
        message,
        severity: 'medium' as const,
      },
      requestId: 'test-request-id',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Mock paginated API response
   */
  mockPaginatedResponse<T>(items: T[], page = 1, limit = 20) {
    return {
      data: items.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
        hasNext: page * limit < items.length,
        hasPrev: page > 1,
      },
    };
  },
};

// Mock fetch utilities
export const mockFetch = {
  /**
   * Setup mock fetch for success response
   */
  mockFetchSuccess<T>(data: T, status = 200) {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status,
      json: () => Promise.resolve(data),
      headers: new Headers(),
    });
    global.fetch = mockFetch as any;
    return mockFetch;
  },

  /**
   * Setup mock fetch for error response
   */
  mockFetchError(message: string, status = 500) {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: message,
      json: () => Promise.resolve({ error: message }),
      headers: new Headers(),
    });
    global.fetch = mockFetch as any;
    return mockFetch;
  },

  /**
   * Setup mock fetch for network error
   */
  mockFetchNetworkError() {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch as any;
    return mockFetch;
  },

  /**
   * Reset fetch mock
   */
  resetFetchMock() {
    if (vi.isMockFunction(global.fetch)) {
      (global.fetch as MockedFunction<typeof fetch>).mockReset();
    }
  },
};

// Zustand store mock utilities
export const mockStores = {
  /**
   * Create mock global store
   */
  createMockGlobalStore() {
    return {
      language: 'en',
      isOnline: true,
      setLanguage: vi.fn(),
      setOnlineStatus: vi.fn(),
    };
  },

  /**
   * Mock useGlobalStore hook
   */
  mockUseGlobalStore() {
    const mockStore = mockStores.createMockGlobalStore();
    vi.doMock('@/lib/stores/global-store', () => ({
      useGlobalStore: () => mockStore,
    }));
    return mockStore;
  },
};

// WebSocket mock utilities
export const mockWebSocket = {
  /**
   * Create mock WebSocket
   */
  createMockWebSocket() {
    return {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    };
  },

  /**
   * Mock WebSocket constructor
   */
  mockWebSocketConstructor() {
    const mockWS = mockWebSocket.createMockWebSocket();
    global.WebSocket = vi.fn(() => mockWS) as any;
    return mockWS;
  },
};

// Translation cache mock utilities
export const mockTranslationCache = {
  /**
   * Create mock translation cache
   */
  createMockCache() {
    return {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      invalidate: vi.fn(),
      clear: vi.fn(),
      getStats: vi.fn(() => ({
        hits: 50,
        misses: 10,
        hitRate: 0.83,
        size: 100,
        memory: 1024,
      })),
      getEntries: vi.fn(() => ({})),
      prefetch: vi.fn(),
    };
  },

  /**
   * Mock translation cache module
   */
  mockTranslationCacheModule() {
    const mockCache = mockTranslationCache.createMockCache();
    vi.doMock('@/lib/translation-client-cache', () => ({
      translationCache: mockCache,
    }));
    return mockCache;
  },
};

// Test assertion helpers
export const assertions = {
  /**
   * Assert translation key structure
   */
  assertTranslationKey(key: any): asserts key is TranslationKey {
    expect(key).toHaveProperty('id');
    expect(key).toHaveProperty('key');
    expect(key).toHaveProperty('category');
    expect(key).toHaveProperty('created_at');
    expect(key).toHaveProperty('updated_at');
    expect(typeof key.id).toBe('string');
    expect(typeof key.key).toBe('string');
    expect(typeof key.category).toBe('string');
  },

  /**
   * Assert translation structure
   */
  assertTranslation(translation: any): asserts translation is Translation {
    expect(translation).toHaveProperty('id');
    expect(translation).toHaveProperty('translation_key_id');
    expect(translation).toHaveProperty('locale');
    expect(translation).toHaveProperty('value');
    expect(translation).toHaveProperty('status');
    expect(['en', 'fr', 'th']).toContain(translation.locale);
    expect(['draft', 'review', 'approved', 'published']).toContain(translation.status);
  },

  /**
   * Assert API response structure
   */
  assertApiResponse(response: any) {
    expect(response).toHaveProperty('success');
    expect(typeof response.success).toBe('boolean');
    if (response.success) {
      expect(response).toHaveProperty('data');
    } else {
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
    }
  },
};

// Export all utilities
export * from '@testing-library/react';
export { customRender as render };
export { vi, type MockedFunction } from 'vitest';