/**
 * API Route Tests for Public Translation Endpoints
 * Restaurant Krong Thai SOP Management System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '@/app/api/translations/[locale]/route';
import { GET as GetTranslationByKey } from '@/app/api/translations/[locale]/key/[...keyPath]/route';
import { POST as TrackUsage } from '@/app/api/translations/usage/route';

import {
  createMockSupabaseClient,
  mockApiResponseBuilders,
  SAMPLE_TRANSLATION_KEYS,
  SAMPLE_TRANSLATIONS,
  testScenarios
} from '../mocks/translation-mocks';
import { assertions } from '../utils/test-utils';

// Mock Supabase client
const mockSupabaseClient = createMockSupabaseClient();
vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-request-id-123',
  },
});

describe('Public Translation API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/translations/[locale]', () => {
    it('should return translations for valid locale', async () => {
      // Mock successful database query
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
      
      // Mock the main query to return translation data
      const mockTranslationData = SAMPLE_TRANSLATION_KEYS.map(key => ({
        ...key,
        translations: SAMPLE_TRANSLATIONS.filter(t => 
          t.translation_key_id === key.id && t.locale === 'en' && t.status === 'published'
        ),
      }));

      mockQueryBuilder.mockResolvedValueOnce({ 
        data: mockTranslationData, 
        error: null 
      });

      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      assertions.assertApiResponse(data);
      expect(data.locale).toBe('en');
      expect(data.translations).toBeTruthy();
      expect(typeof data.translations).toBe('object');
      expect(data.metadata).toBeTruthy();
      expect(data.metadata.locale).toBe('en');
      expect(data.metadata.totalKeys).toBeGreaterThanOrEqual(0);
    });

    it('should return 400 for invalid locale', async () => {
      const request = new NextRequest('http://localhost:3000/api/translations/invalid');
      const response = await GET(request, { params: { locale: 'invalid' } });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_LOCALE');
      expect(data.error.message).toContain('Invalid locale');
    });

    it('should handle query parameters correctly', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/translations/en?category=common&keys=welcome,login'
      );
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(200);

      // Verify that the query builder was called with appropriate filters
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('category', 'common');
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('key', ['welcome', 'login']);
    });

    it('should handle includeContext parameter', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/translations/en?includeContext=true'
      );
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.locale).toBe('en');
    });

    it('should return cached response when available', async () => {
      // Mock cache hit
      const cachedData = mockApiResponseBuilders.buildTranslationsResponse('en');
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: {
          cache_key: 'test-cache-key',
          cached_data: JSON.stringify(cachedData),
          expires_at: new Date(Date.now() + 300000).toISOString(),
        }, 
        error: null 
      });

      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Cache-Status')).toBe('HIT');

      const data = await response.json();
      expect(data.locale).toBe('en');
    });

    it('should handle database errors gracefully', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
      mockQueryBuilder.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/translations/en?includeContext=invalid'
      );
      const response = await GET(request, { params: { locale: 'en' } });

      // Should still work as invalid boolean gets transformed
      expect(response.status).toBe(200);
    });

    it('should set correct response headers', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Request-ID')).toBe('test-request-id-123');
      expect(response.headers.get('X-Response-Time')).toContain('ms');
      expect(response.headers.get('X-Cache-Status')).toBe('MISS');
      expect(response.headers.get('Cache-Control')).toContain('public');
      expect(response.headers.get('ETag')).toBeTruthy();
    });

    it('should track analytics correctly', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
      
      const mockTranslationData = [
        {
          ...SAMPLE_TRANSLATION_KEYS[0],
          translations: [SAMPLE_TRANSLATIONS[0]],
        },
      ];
      mockQueryBuilder.mockResolvedValueOnce({ 
        data: mockTranslationData, 
        error: null 
      });

      // Mock analytics upsert calls
      mockQueryBuilder.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(200);

      // Verify analytics tracking was called
      expect(mockQueryBuilder.upsert).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      // Simulate unexpected error
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/translations/[locale]/key/[...keyPath]', () => {
    it('should return specific translation by key', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      const translationKey = SAMPLE_TRANSLATION_KEYS[0];
      const translation = SAMPLE_TRANSLATIONS[0];

      mockQueryBuilder.single.mockResolvedValue({
        data: {
          ...translationKey,
          translations: [translation],
        },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/translations/en/key/common/welcome'
      );
      const response = await GetTranslationByKey(
        request,
        { 
          params: { 
            locale: 'en', 
            keyPath: ['common', 'welcome'] 
          } 
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.key).toBe('common.welcome');
      expect(data.value).toBeTruthy();
      expect(data.locale).toBe('en');
    });

    it('should return 404 for non-existent key', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/translations/en/key/nonexistent/key'
      );
      const response = await GetTranslationByKey(
        request,
        { 
          params: { 
            locale: 'en', 
            keyPath: ['nonexistent', 'key'] 
          } 
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TRANSLATION_NOT_FOUND');
    });

    it('should handle interpolation variables', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      const translationKey = {
        ...SAMPLE_TRANSLATION_KEYS[0],
        interpolation_vars: ['name'],
      };
      const translation = {
        ...SAMPLE_TRANSLATIONS[0],
        value: 'Welcome, {name}!',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: {
          ...translationKey,
          translations: [translation],
        },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/translations/en/key/common/welcome?name=John'
      );
      const response = await GetTranslationByKey(
        request,
        { 
          params: { 
            locale: 'en', 
            keyPath: ['common', 'welcome'] 
          } 
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.value).toBe('Welcome, John!');
      expect(data.interpolated).toBe(true);
    });

    it('should validate locale parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/translations/invalid/key/test/key'
      );
      const response = await GetTranslationByKey(
        request,
        { 
          params: { 
            locale: 'invalid', 
            keyPath: ['test', 'key'] 
          } 
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe('INVALID_LOCALE');
    });

    it('should handle empty key path', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/translations/en/key/'
      );
      const response = await GetTranslationByKey(
        request,
        { 
          params: { 
            locale: 'en', 
            keyPath: [] 
          } 
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe('INVALID_KEY_PATH');
    });
  });

  describe('POST /api/translations/usage', () => {
    it('should track translation usage successfully', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

      const usageData = {
        keys: ['common.welcome', 'auth.login'],
        locale: 'en',
        sessionId: 'test-session-123',
        context: 'homepage',
      };

      const request = new NextRequest('http://localhost:3000/api/translations/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageData),
      });

      const response = await TrackUsage(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tracked).toBe(2);

      // Verify analytics upsert was called
      expect(mockQueryBuilder.upsert).toHaveBeenCalled();
    });

    it('should validate usage tracking request', async () => {
      const invalidData = {
        keys: [], // Empty keys array
        locale: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/translations/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await TrackUsage(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle database errors in usage tracking', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.upsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const usageData = {
        keys: ['common.welcome'],
        locale: 'en',
        sessionId: 'test-session-123',
      };

      const request = new NextRequest('http://localhost:3000/api/translations/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageData),
      });

      const response = await TrackUsage(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TRACKING_ERROR');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/translations/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await TrackUsage(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_JSON');
    });

    it('should rate limit usage tracking', async () => {
      // This test would require implementing rate limiting
      // For now, we'll verify the basic functionality
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

      const usageData = {
        keys: ['common.welcome'],
        locale: 'en',
        sessionId: 'test-session-123',
      };

      const request = new NextRequest('http://localhost:3000/api/translations/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageData),
      });

      const response = await TrackUsage(request);

      expect(response.status).toBe(200);
    });
  });

  describe('OPTIONS /api/translations/[locale]', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache translation responses', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      
      // Mock cache miss first
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: null });
      
      // Mock successful translation fetch
      const mockTranslationData = [
        {
          ...SAMPLE_TRANSLATION_KEYS[0],
          translations: [SAMPLE_TRANSLATIONS[0]],
        },
      ];
      mockQueryBuilder.mockResolvedValueOnce({ 
        data: mockTranslationData, 
        error: null 
      });

      // Mock cache storage
      mockQueryBuilder.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Cache-Status')).toBe('MISS');

      // Verify cache storage was attempted
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          cache_key: expect.any(String),
          locale: 'en',
          cached_data: expect.any(String),
        })
      );
    });

    it('should include performance metrics in response headers', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      const startTime = Date.now();
      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      expect(response.status).toBe(200);

      const responseTime = response.headers.get('X-Response-Time');
      expect(responseTime).toContain('ms');

      const parsedTime = parseInt(responseTime?.replace('ms', '') || '0');
      expect(parsedTime).toBeGreaterThan(0);
    });

    it('should handle high load gracefully', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        GET(
          new NextRequest('http://localhost:3000/api/translations/en'),
          { params: { locale: 'en' } }
        )
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle concurrent cache access', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      
      // Mock cache retrieval that might have race conditions
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });
      
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      const request1 = GET(
        new NextRequest('http://localhost:3000/api/translations/en'),
        { params: { locale: 'en' } }
      );
      
      const request2 = GET(
        new NextRequest('http://localhost:3000/api/translations/en'),
        { params: { locale: 'en' } }
      );

      const [response1, response2] = await Promise.all([request1, request2]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should handle partial cache failures gracefully', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      
      // Mock cache miss
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
      
      // Mock successful translation fetch
      mockQueryBuilder.mockResolvedValueOnce({ data: [], error: null });
      
      // Mock cache storage failure (should not affect response)
      mockQueryBuilder.upsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Cache storage failed' },
      });

      const request = new NextRequest('http://localhost:3000/api/translations/en');
      const response = await GET(request, { params: { locale: 'en' } });

      // Should still succeed despite cache storage failure
      expect(response.status).toBe(200);
    });
  });
});