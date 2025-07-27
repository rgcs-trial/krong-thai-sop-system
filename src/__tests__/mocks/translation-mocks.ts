/**
 * Mock Data Generators for Translation System Tests
 * Restaurant Krong Thai SOP Management System
 */

import { vi } from 'vitest';
import type {
  TranslationKey,
  Translation,
  TranslationAdminItem,
  GetTranslationsResponse,
  TrackTranslationUsageRequest,
  TranslationUpdateEvent,
  Locale,
  TranslationStatus
} from '@/types/translation';
import type {
  TranslationKeyFormData,
  BulkOperationData,
  BulkOperationResult,
  TranslationDashboardStats,
  TranslationAnalyticsData
} from '@/types/translation-admin';

// Sample translation keys for comprehensive testing
export const SAMPLE_TRANSLATION_KEYS: TranslationKey[] = [
  {
    id: 'key-1',
    key: 'common.welcome',
    category: 'common',
    description: 'Welcome message',
    interpolation_vars: ['name'],
    context: 'Greeting shown on homepage',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
  },
  {
    id: 'key-2',
    key: 'auth.login',
    category: 'auth',
    description: 'Login button text',
    interpolation_vars: [],
    context: 'Login form submit button',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
  },
  {
    id: 'key-3',
    key: 'sop.procedures_count',
    category: 'sop',
    description: 'Number of procedures',
    interpolation_vars: ['count'],
    context: 'SOP dashboard counter with pluralization',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
  },
  {
    id: 'key-4',
    key: 'training.module_progress',
    category: 'training',
    description: 'Training progress indicator',
    interpolation_vars: ['current', 'total', 'percentage'],
    context: 'Shows progress through training modules',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
  },
  {
    id: 'key-5',
    key: 'analytics.performance_score',
    category: 'analytics',
    description: 'Performance score display',
    interpolation_vars: ['score', 'grade'],
    context: 'Analytics dashboard performance metric',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
  },
];

// Sample translations with ICU message format examples
export const SAMPLE_TRANSLATIONS: Translation[] = [
  // English translations
  {
    id: 'trans-1-en',
    translation_key_id: 'key-1',
    locale: 'en',
    value: 'Welcome, {name}!',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  {
    id: 'trans-2-en',
    translation_key_id: 'key-2',
    locale: 'en',
    value: 'Login',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  {
    id: 'trans-3-en',
    translation_key_id: 'key-3',
    locale: 'en',
    value: '{count, plural, =0 {No procedures} =1 {1 procedure} other {# procedures}}',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  {
    id: 'trans-4-en',
    translation_key_id: 'key-4',
    locale: 'en',
    value: 'Progress: {current}/{total} ({percentage}%)',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  {
    id: 'trans-5-en',
    translation_key_id: 'key-5',
    locale: 'en',
    value: 'Performance Score: {score} ({grade, select, A {Excellent} B {Good} C {Average} D {Poor} other {Unknown}})',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  
  // French translations
  {
    id: 'trans-1-fr',
    translation_key_id: 'key-1',
    locale: 'fr',
    value: 'Bienvenue, {name} !',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  {
    id: 'trans-2-fr',
    translation_key_id: 'key-2',
    locale: 'fr',
    value: 'Connexion',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  {
    id: 'trans-3-fr',
    translation_key_id: 'key-3',
    locale: 'fr',
    value: '{count, plural, =0 {Aucune procédure} =1 {1 procédure} other {# procédures}}',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  {
    id: 'trans-4-fr',
    translation_key_id: 'key-4',
    locale: 'fr',
    value: 'Progression : {current}/{total} ({percentage}%)',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
  {
    id: 'trans-5-fr',
    translation_key_id: 'key-5',
    locale: 'fr',
    value: 'Score de Performance : {score} ({grade, select, A {Excellent} B {Bon} C {Moyen} D {Faible} other {Inconnu}})',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1,
  },
];

// Mock Supabase client factory
export function createMockSupabaseClient() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: vi.fn(() => mockQueryBuilder),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    realtime: {
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockReturnThis(),
      })),
    },
  };
}

// Mock translation cache
export function createMockTranslationCache() {
  const cache = new Map();
  
  return {
    get: vi.fn((locale: Locale, namespace?: string) => {
      const key = `${locale}-${namespace || 'default'}`;
      return cache.get(key);
    }),
    
    set: vi.fn((locale: Locale, translations: Record<string, string>, metadata: any, namespace?: string) => {
      const key = `${locale}-${namespace || 'default'}`;
      cache.set(key, { locale, translations, metadata });
    }),
    
    has: vi.fn((locale: Locale, namespace?: string) => {
      const key = `${locale}-${namespace || 'default'}`;
      return cache.has(key);
    }),
    
    invalidate: vi.fn((options: any) => {
      if (options.keys) {
        // Selective invalidation
        options.keys.forEach((key: string) => cache.delete(key));
      } else {
        // Full invalidation
        cache.clear();
      }
    }),
    
    clear: vi.fn(() => cache.clear()),
    
    getStats: vi.fn(() => ({
      hits: 100,
      misses: 20,
      hitRate: 0.83,
      size: cache.size,
      memory: cache.size * 100, // Mock memory usage
    })),
    
    getEntries: vi.fn(() => Object.fromEntries(cache)),
    
    prefetch: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock WebSocket manager
export function createMockWebSocketManager() {
  const listeners = new Set<(event: TranslationUpdateEvent) => void>();
  
  return {
    subscribe: vi.fn((listener: (event: TranslationUpdateEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    
    disconnect: vi.fn(() => listeners.clear()),
    
    // Helper to simulate WebSocket events
    simulateEvent: (event: TranslationUpdateEvent) => {
      listeners.forEach(listener => listener(event));
    },
  };
}

// Mock usage tracker
export function createMockUsageTracker() {
  return {
    track: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  };
}

// Test scenario data generators
export const testScenarios = {
  /**
   * Generate test data for bulk import scenario
   */
  createBulkImportScenario(): BulkOperationData {
    return {
      operation: 'import',
      format: 'json',
      data: [
        {
          key: 'test.bulk.welcome',
          category: 'common',
          description: 'Bulk import test welcome message',
          translations: {
            en: 'Welcome to our system',
            fr: 'Bienvenue dans notre système',
          },
        },
        {
          key: 'test.bulk.goodbye',
          category: 'common',
          description: 'Bulk import test goodbye message',
          translations: {
            en: 'Goodbye',
            fr: 'Au revoir',
          },
        },
      ],
      options: {
        overwrite: false,
        validate: true,
        create_missing_keys: true,
      },
    };
  },

  /**
   * Generate test data for workflow scenario
   */
  createWorkflowScenario() {
    return {
      pendingReview: SAMPLE_TRANSLATIONS.filter(t => t.status === 'review'),
      approvedTranslations: SAMPLE_TRANSLATIONS.filter(t => t.status === 'approved'),
      draftTranslations: SAMPLE_TRANSLATIONS.filter(t => t.status === 'draft'),
    };
  },

  /**
   * Generate test data for ICU message format scenarios
   */
  createICUMessageScenarios() {
    return [
      {
        message: '{count, plural, =0 {No items} =1 {1 item} other {# items}}',
        variables: { count: 0 },
        expected: 'No items',
      },
      {
        message: '{count, plural, =0 {No items} =1 {1 item} other {# items}}',
        variables: { count: 1 },
        expected: '1 item',
      },
      {
        message: '{count, plural, =0 {No items} =1 {1 item} other {# items}}',
        variables: { count: 5 },
        expected: '5 items',
      },
      {
        message: '{gender, select, male {He} female {She} other {They}} went to the store',
        variables: { gender: 'male' },
        expected: 'He went to the store',
      },
      {
        message: 'Hello, {name}! You have {count} {count, plural, =1 {message} other {messages}}.',
        variables: { name: 'John', count: 3 },
        expected: 'Hello, John! You have 3 messages.',
      },
    ];
  },

  /**
   * Generate performance test scenarios
   */
  createPerformanceScenarios() {
    return {
      largeTranslationSet: Array.from({ length: 1000 }, (_, i) => ({
        key: `performance.test.${i}`,
        translations: {
          en: `Performance test message ${i}`,
          fr: `Message de test de performance ${i}`,
        },
      })),
      
      cacheMissScenario: {
        locale: 'en' as Locale,
        requestedKeys: ['nonexistent.key.1', 'nonexistent.key.2'],
      },
      
      cacheHitScenario: {
        locale: 'en' as Locale,
        requestedKeys: ['common.welcome', 'auth.login'],
      },
    };
  },

  /**
   * Generate error scenarios for testing
   */
  createErrorScenarios() {
    return {
      invalidLocale: {
        locale: 'invalid',
        expectedError: 'INVALID_LOCALE',
      },
      
      databaseError: {
        mockError: new Error('Database connection failed'),
        expectedError: 'DATABASE_ERROR',
      },
      
      validationError: {
        invalidKey: '',
        expectedError: 'INVALID_KEY',
      },
      
      networkError: {
        mockError: new Error('Network request failed'),
        expectedError: 'NETWORK_ERROR',
      },
    };
  },
};

// Real-time update event generators
export const realtimeEventGenerators = {
  /**
   * Create translation update event
   */
  createTranslationUpdateEvent(overrides: Partial<TranslationUpdateEvent> = {}): TranslationUpdateEvent {
    return {
      type: 'translation_updated',
      locale: 'en',
      keys: ['common.welcome'],
      timestamp: new Date().toISOString(),
      userId: 'test-user',
      ...overrides,
    };
  },

  /**
   * Create key creation event
   */
  createKeyCreationEvent(key: string): TranslationUpdateEvent {
    return {
      type: 'key_created',
      locale: 'en',
      keys: [key],
      timestamp: new Date().toISOString(),
      userId: 'test-user',
    };
  },

  /**
   * Create bulk update event
   */
  createBulkUpdateEvent(keys: string[]): TranslationUpdateEvent {
    return {
      type: 'bulk_update',
      locale: 'en',
      keys,
      timestamp: new Date().toISOString(),
      userId: 'test-user',
    };
  },
};

// Mock API response builders
export const mockApiResponseBuilders = {
  /**
   * Build mock translations API response
   */
  buildTranslationsResponse(locale: Locale, keys?: string[]): GetTranslationsResponse {
    const filteredTranslations = SAMPLE_TRANSLATIONS
      .filter(t => t.locale === locale && t.status === 'published')
      .filter(t => !keys || keys.includes(SAMPLE_TRANSLATION_KEYS.find(k => k.id === t.translation_key_id)?.key || ''));

    const translations: Record<string, string> = {};
    filteredTranslations.forEach(t => {
      const key = SAMPLE_TRANSLATION_KEYS.find(k => k.id === t.translation_key_id)?.key;
      if (key) {
        translations[key] = t.value;
      }
    });

    return {
      locale,
      translations,
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: Object.keys(translations).length,
      },
    };
  },

  /**
   * Build mock analytics response
   */
  buildAnalyticsResponse(): TranslationAnalyticsData {
    return {
      usage_by_key: [
        { key: 'common.welcome', usage_count: 150, cache_hit_rate: 0.85 },
        { key: 'auth.login', usage_count: 120, cache_hit_rate: 0.90 },
        { key: 'sop.procedures_count', usage_count: 200, cache_hit_rate: 0.88 },
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
    };
  },

  /**
   * Build mock dashboard stats response
   */
  buildDashboardStatsResponse(): TranslationDashboardStats {
    return {
      total_keys: SAMPLE_TRANSLATION_KEYS.length,
      total_translations: SAMPLE_TRANSLATIONS.length,
      completion_by_locale: {
        en: 1.0,
        fr: 1.0,
      },
      pending_review: 3,
      recent_activity: [
        {
          type: 'created',
          key: 'common.welcome',
          locale: 'en',
          timestamp: new Date().toISOString(),
          user: 'admin',
        },
        {
          type: 'updated',
          key: 'auth.login',
          locale: 'fr',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'translator',
        },
      ],
      performance_summary: {
        avg_load_time: 42,
        cache_efficiency: 0.89,
        error_rate: 0.002,
      },
    };
  },
};

// Export all mocks and utilities
export {
  SAMPLE_TRANSLATION_KEYS,
  SAMPLE_TRANSLATIONS,
  createMockSupabaseClient,
  createMockTranslationCache,
  createMockWebSocketManager,
  createMockUsageTracker,
  testScenarios,
  realtimeEventGenerators,
  mockApiResponseBuilders,
};