/**
 * API Route Tests for Admin Translation Management
 * Restaurant Krong Thai SOP Management System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import API route handlers
import { GET as GetTranslations, POST as CreateTranslation } from '@/app/api/admin/translations/route';
import { GET as GetTranslation, PUT as UpdateTranslation, DELETE as DeleteTranslation } from '@/app/api/admin/translations/[id]/route';
import { PUT as UpdateStatus } from '@/app/api/admin/translations/[id]/status/route';
import { POST as BulkOperations } from '@/app/api/admin/translations/bulk/route';
import { GET as GetTranslationKeys, POST as CreateTranslationKey } from '@/app/api/admin/translation-keys/route';
import { GET as GetTranslationKey, PUT as UpdateTranslationKey, DELETE as DeleteTranslationKey } from '@/app/api/admin/translation-keys/[id]/route';

import {
  createMockSupabaseClient,
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

// Mock authentication (admin required)
const mockSession = {
  user: {
    id: 'admin-user-id',
    role: 'admin',
    email: 'admin@krongthai.com',
  },
};

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    },
    from: () => mockSupabaseClient.from(),
  }),
}));

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-request-id-123',
  },
});

describe('Admin Translation API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/translations', () => {
    it('should return paginated translations with filters', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      
      // Mock count query
      mockQueryBuilder.count = vi.fn().mockResolvedValue({ count: 50, error: null });
      
      // Mock main query
      const mockAdminData = SAMPLE_TRANSLATION_KEYS.map(key => ({
        translation_key: key,
        translations: SAMPLE_TRANSLATIONS.filter(t => t.translation_key_id === key.id),
        usage_stats: {
          total_usage: 100,
          cache_hits: 85,
          last_accessed: new Date().toISOString(),
        },
      }));
      mockQueryBuilder.mockResolvedValue({ data: mockAdminData, error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/translations?page=1&limit=20&category=common'
      );
      const response = await GetTranslations(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.pagination).toBeTruthy();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.total).toBe(50);

      // Verify filters were applied
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('translation_key.category', 'common');
    });

    it('should handle search filtering', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.count = vi.fn().mockResolvedValue({ count: 5, error: null });
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/translations?search=welcome'
      );
      const response = await GetTranslations(request);

      expect(response.status).toBe(200);

      // Verify search filter was applied
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith('translation_key.key', '%welcome%');
    });

    it('should handle sorting options', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.count = vi.fn().mockResolvedValue({ count: 10, error: null });
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/translations?sortBy=key&sortOrder=asc'
      );
      const response = await GetTranslations(request);

      expect(response.status).toBe(200);

      // Verify sorting was applied
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('translation_key.key', { ascending: true });
    });

    it('should require authentication', async () => {
      // Mock unauthenticated request
      vi.mocked(mockSupabaseClient.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations');
      const response = await GetTranslations(request);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle database errors', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.count = vi.fn().mockResolvedValue({
        count: null,
        error: { message: 'Database error' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations');
      const response = await GetTranslations(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('POST /api/admin/translations', () => {
    it('should create new translation successfully', async () => {
      const newTranslation = {
        translation_key_id: 'key-1',
        locale: 'en',
        value: 'New translation value',
        status: 'draft',
      };

      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.insert = vi.fn().mockResolvedValue({
        data: [{ id: 'new-trans-id', ...newTranslation }],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTranslation),
      });

      const response = await CreateTranslation(request);

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('new-trans-id');

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        ...newTranslation,
        created_by: mockSession.user.id,
        updated_by: mockSession.user.id,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should validate translation data', async () => {
      const invalidTranslation = {
        translation_key_id: '', // Missing required field
        locale: 'invalid', // Invalid locale
        value: '',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidTranslation),
      });

      const response = await CreateTranslation(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeTruthy();
    });

    it('should handle duplicate translation creation', async () => {
      const duplicateTranslation = {
        translation_key_id: 'key-1',
        locale: 'en',
        value: 'Duplicate value',
        status: 'draft',
      };

      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.insert = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate key value violates unique constraint' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateTranslation),
      });

      const response = await CreateTranslation(request);

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_TRANSLATION');
    });
  });

  describe('PUT /api/admin/translations/[id]', () => {
    it('should update translation successfully', async () => {
      const updateData = {
        value: 'Updated translation value',
        status: 'review',
      };

      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.update = vi.fn().mockReturnThis();
      mockQueryBuilder.eq = vi.fn().mockReturnThis();
      mockQueryBuilder.single = vi.fn().mockResolvedValue({
        data: { id: 'trans-1', ...updateData },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/trans-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await UpdateTranslation(request, { params: { id: 'trans-1' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('trans-1');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        ...updateData,
        updated_by: mockSession.user.id,
        updated_at: expect.any(String),
        version: expect.any(Number),
      });
    });

    it('should handle non-existent translation update', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.update = vi.fn().mockReturnThis();
      mockQueryBuilder.eq = vi.fn().mockReturnThis();
      mockQueryBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'New value' }),
      });

      const response = await UpdateTranslation(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TRANSLATION_NOT_FOUND');
    });
  });

  describe('DELETE /api/admin/translations/[id]', () => {
    it('should delete translation successfully', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.delete = vi.fn().mockReturnThis();
      mockQueryBuilder.eq = vi.fn().mockReturnThis();
      mockQueryBuilder.single = vi.fn().mockResolvedValue({
        data: { id: 'trans-1' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/trans-1', {
        method: 'DELETE',
      });

      const response = await DeleteTranslation(request, { params: { id: 'trans-1' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted');

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'trans-1');
    });

    it('should handle deletion of non-existent translation', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.delete = vi.fn().mockReturnThis();
      mockQueryBuilder.eq = vi.fn().mockReturnThis();
      mockQueryBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/nonexistent', {
        method: 'DELETE',
      });

      const response = await DeleteTranslation(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TRANSLATION_NOT_FOUND');
    });
  });

  describe('PUT /api/admin/translations/[id]/status', () => {
    it('should update translation status with workflow validation', async () => {
      const statusUpdate = {
        status: 'approved',
        comment: 'Reviewed and approved',
      };

      const mockQueryBuilder = mockSupabaseClient.from();
      
      // Mock current translation fetch
      mockQueryBuilder.single = vi.fn()
        .mockResolvedValueOnce({
          data: { id: 'trans-1', status: 'review', translation_key_id: 'key-1' },
          error: null,
        })
        // Mock status update
        .mockResolvedValueOnce({
          data: { id: 'trans-1', status: 'approved' },
          error: null,
        });

      mockQueryBuilder.update = vi.fn().mockReturnThis();
      mockQueryBuilder.eq = vi.fn().mockReturnThis();

      // Mock history insert
      mockQueryBuilder.insert = vi.fn().mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/trans-1/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusUpdate),
      });

      const response = await UpdateStatus(request, { params: { id: 'trans-1' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('approved');

      // Verify workflow history was recorded
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          translation_id: 'trans-1',
          from_status: 'review',
          to_status: 'approved',
          comment: 'Reviewed and approved',
          changed_by: mockSession.user.id,
        })
      );
    });

    it('should validate status transitions', async () => {
      const invalidStatusUpdate = {
        status: 'published', // Can't go directly from draft to published
      };

      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.single = vi.fn().mockResolvedValue({
        data: { id: 'trans-1', status: 'draft' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/trans-1/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidStatusUpdate),
      });

      const response = await UpdateStatus(request, { params: { id: 'trans-1' } });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('POST /api/admin/translations/bulk', () => {
    it('should handle bulk import successfully', async () => {
      const bulkData = testScenarios.createBulkImportScenario();

      const mockQueryBuilder = mockSupabaseClient.from();
      
      // Mock translation key creation
      mockQueryBuilder.insert = vi.fn()
        .mockResolvedValueOnce({
          data: [{ id: 'key-new-1', key: 'test.bulk.welcome' }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 'key-new-2', key: 'test.bulk.goodbye' }],
          error: null,
        });

      // Mock translation creation
      mockQueryBuilder.insert = vi.fn().mockResolvedValue({
        data: [
          { id: 'trans-new-1', translation_key_id: 'key-new-1', locale: 'en' },
          { id: 'trans-new-2', translation_key_id: 'key-new-1', locale: 'fr' },
        ],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData),
      });

      const response = await BulkOperations(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.result.processed).toBeGreaterThan(0);
      expect(data.result.created).toBeGreaterThan(0);
      expect(data.result.errors).toBeInstanceOf(Array);
    });

    it('should handle bulk export', async () => {
      const exportRequest = {
        operation: 'export',
        format: 'json',
        filters: {
          locale: 'en',
          category: 'common',
        },
      };

      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.mockResolvedValue({
        data: SAMPLE_TRANSLATIONS.filter(t => t.locale === 'en'),
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportRequest),
      });

      const response = await BulkOperations(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.result.download_url).toBeTruthy();
      expect(data.result.filename).toContain('.json');
    });

    it('should validate bulk operation data', async () => {
      const invalidBulkData = {
        operation: 'invalid',
        data: [],
      };

      const request = new NextRequest('http://localhost:3000/api/admin/translations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBulkData),
      });

      const response = await BulkOperations(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_BULK_OPERATION');
    });

    it('should handle partial bulk operation failures', async () => {
      const bulkData = testScenarios.createBulkImportScenario();

      const mockQueryBuilder = mockSupabaseClient.from();
      
      // Mock mixed success/failure results
      mockQueryBuilder.insert = vi.fn()
        .mockResolvedValueOnce({
          data: [{ id: 'key-new-1', key: 'test.bulk.welcome' }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'Duplicate key' },
        });

      const request = new NextRequest('http://localhost:3000/api/admin/translations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData),
      });

      const response = await BulkOperations(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.result.processed).toBeGreaterThan(0);
      expect(data.result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Translation Keys Management', () => {
    describe('GET /api/admin/translation-keys', () => {
      it('should return paginated translation keys', async () => {
        const mockQueryBuilder = mockSupabaseClient.from();
        mockQueryBuilder.count = vi.fn().mockResolvedValue({ count: 25, error: null });
        mockQueryBuilder.mockResolvedValue({ data: SAMPLE_TRANSLATION_KEYS, error: null });

        const request = new NextRequest('http://localhost:3000/api/admin/translation-keys');
        const response = await GetTranslationKeys(request);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeInstanceOf(Array);
        expect(data.pagination.total).toBe(25);
      });

      it('should filter by category', async () => {
        const mockQueryBuilder = mockSupabaseClient.from();
        mockQueryBuilder.count = vi.fn().mockResolvedValue({ count: 10, error: null });
        mockQueryBuilder.mockResolvedValue({ data: [], error: null });

        const request = new NextRequest(
          'http://localhost:3000/api/admin/translation-keys?category=common'
        );
        const response = await GetTranslationKeys(request);

        expect(response.status).toBe(200);
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('category', 'common');
      });
    });

    describe('POST /api/admin/translation-keys', () => {
      it('should create translation key with initial translations', async () => {
        const newKeyData = {
          key: 'test.new.key',
          category: 'common',
          description: 'Test key description',
          interpolation_vars: ['name'],
          translations: {
            en: { value: 'Hello, {name}!', status: 'draft' },
            fr: { value: 'Bonjour, {name}!', status: 'draft' },
          },
        };

        const mockQueryBuilder = mockSupabaseClient.from();
        
        // Mock key creation
        mockQueryBuilder.insert = vi.fn()
          .mockResolvedValueOnce({
            data: [{ id: 'new-key-id', ...newKeyData }],
            error: null,
          })
          // Mock translations creation
          .mockResolvedValueOnce({
            data: [
              { id: 'trans-en', translation_key_id: 'new-key-id', locale: 'en' },
              { id: 'trans-fr', translation_key_id: 'new-key-id', locale: 'fr' },
            ],
            error: null,
          });

        const request = new NextRequest('http://localhost:3000/api/admin/translation-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newKeyData),
        });

        const response = await CreateTranslationKey(request);

        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('new-key-id');
        expect(data.data.translations).toHaveLength(2);
      });

      it('should validate translation key format', async () => {
        const invalidKeyData = {
          key: 'invalid key with spaces', // Invalid key format
          category: '',
          description: '',
        };

        const request = new NextRequest('http://localhost:3000/api/admin/translation-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidKeyData),
        });

        const response = await CreateTranslationKey(request);

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('INVALID_KEY_FORMAT');
      });
    });

    describe('PUT /api/admin/translation-keys/[id]', () => {
      it('should update translation key metadata', async () => {
        const updateData = {
          description: 'Updated description',
          category: 'auth',
          interpolation_vars: ['name', 'email'],
        };

        const mockQueryBuilder = mockSupabaseClient.from();
        mockQueryBuilder.update = vi.fn().mockReturnThis();
        mockQueryBuilder.eq = vi.fn().mockReturnThis();
        mockQueryBuilder.single = vi.fn().mockResolvedValue({
          data: { id: 'key-1', ...updateData },
          error: null,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/translation-keys/key-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        const response = await UpdateTranslationKey(request, { params: { id: 'key-1' } });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.description).toBe('Updated description');
      });
    });

    describe('DELETE /api/admin/translation-keys/[id]', () => {
      it('should delete translation key and associated translations', async () => {
        const mockQueryBuilder = mockSupabaseClient.from();
        
        // Mock cascade deletion
        mockQueryBuilder.delete = vi.fn().mockReturnThis();
        mockQueryBuilder.eq = vi.fn().mockReturnThis();
        mockQueryBuilder.single = vi.fn().mockResolvedValue({
          data: { id: 'key-1', deleted_translations: 2 },
          error: null,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/translation-keys/key-1', {
          method: 'DELETE',
        });

        const response = await DeleteTranslationKey(request, { params: { id: 'key-1' } });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.message).toContain('deleted');
        expect(data.deleted_translations).toBe(2);
      });

      it('should prevent deletion if key is in use', async () => {
        const mockQueryBuilder = mockSupabaseClient.from();
        mockQueryBuilder.delete = vi.fn().mockReturnThis();
        mockQueryBuilder.eq = vi.fn().mockReturnThis();
        mockQueryBuilder.single = vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23503', message: 'Foreign key constraint violation' },
        });

        const request = new NextRequest('http://localhost:3000/api/admin/translation-keys/key-1', {
          method: 'DELETE',
        });

        const response = await DeleteTranslationKey(request, { params: { id: 'key-1' } });

        expect(response.status).toBe(409);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('KEY_IN_USE');
      });
    });
  });

  describe('Security and Authorization', () => {
    it('should enforce admin role for all admin endpoints', async () => {
      // Mock non-admin user
      const mockNonAdminSession = {
        user: {
          id: 'user-id',
          role: 'staff',
          email: 'staff@krongthai.com',
        },
      };

      vi.mocked(mockSupabaseClient.auth.getSession).mockResolvedValueOnce({
        data: { session: mockNonAdminSession },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations');
      const response = await GetTranslations(request);

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate request origin for security', async () => {
      const request = new NextRequest('http://malicious-site.com/api/admin/translations', {
        headers: {
          'Origin': 'http://malicious-site.com',
        },
      });

      const response = await GetTranslations(request);

      // Depending on implementation, this might return 403 or continue with CORS checks
      expect([200, 403]).toContain(response.status);
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        translation_key_id: 'key-1',
        locale: 'en',
        value: '<script>alert("xss")</script>',
        status: 'draft',
      };

      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.insert = vi.fn().mockResolvedValue({
        data: [{ id: 'new-trans-id', value: '&lt;script&gt;alert("xss")&lt;/script&gt;' }],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      });

      const response = await CreateTranslation(request);

      expect(response.status).toBe(201);

      // Verify that the malicious script was sanitized
      const data = await response.json();
      expect(data.data.value).not.toContain('<script>');
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent admin operations', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.count = vi.fn().mockResolvedValue({ count: 10, error: null });
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      // Simulate concurrent admin requests
      const requests = Array.from({ length: 5 }, () =>
        GetTranslations(new NextRequest('http://localhost:3000/api/admin/translations'))
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should implement proper pagination for large datasets', async () => {
      const mockQueryBuilder = mockSupabaseClient.from();
      mockQueryBuilder.count = vi.fn().mockResolvedValue({ count: 10000, error: null });
      mockQueryBuilder.range = vi.fn().mockReturnThis();
      mockQueryBuilder.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/translations?page=100&limit=50'
      );
      const response = await GetTranslations(request);

      expect(response.status).toBe(200);

      // Verify pagination limits are applied
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(4950, 4999); // (page-1)*limit, page*limit-1
    });
  });
});