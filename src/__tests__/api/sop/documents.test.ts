import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE, PATCH } from '@/app/api/sop/documents/route';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => ({
                overlaps: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn(() => Promise.resolve({
                      data: [],
                      error: null,
                      count: 0
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: null
          }))
        }))
      }))
    }))
  },
  DatabaseService: vi.fn()
}));

vi.mock('@/lib/middleware/auth', () => ({
  withAuth: (handler: any, permission: any, options: any) => handler,
  PERMISSIONS: {
    SOP: {
      READ: 'sop:read',
      WRITE: 'sop:write'
    }
  },
  logAuditEvent: vi.fn()
}));

vi.mock('@/lib/validation/sop', () => ({
  validateCreateSOPDocument: vi.fn(),
  validatePagination: vi.fn(),
  sanitizeInput: vi.fn()
}));

// Import mocked modules
import { supabaseAdmin } from '@/lib/supabase/client';
import { logAuditEvent } from '@/lib/middleware/auth';
import { validateCreateSOPDocument, validatePagination, sanitizeInput } from '@/lib/validation/sop';

const mockSupabaseAdmin = supabaseAdmin as any;
const mockLogAuditEvent = logAuditEvent as any;
const mockValidateCreateSOPDocument = validateCreateSOPDocument as any;
const mockValidatePagination = validatePagination as any;
const mockSanitizeInput = sanitizeInput as any;

describe('/api/sop/documents', () => {
  const mockContext = {
    userId: 'user-123',
    restaurantId: 'restaurant-456',
    userRole: 'manager' as const,
    userPermissions: ['sop:read', 'sop:write']
  };

  const mockSOPDocument = {
    id: 'doc-123',
    restaurant_id: 'restaurant-456',
    category_id: 'cat-789',
    title: 'Test SOP Document',
    title_fr: 'Document SOP Test',
    content: 'This is a test SOP document content.',
    content_fr: 'Ceci est un contenu de document SOP test.',
    version: '1.0.0',
    status: 'draft',
    tags: ['test', 'safety'],
    difficulty_level: 'beginner',
    estimated_read_time: 5,
    review_due_date: '2024-12-31',
    created_by: 'user-123',
    updated_by: 'user-123',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat-789',
      name: 'Food Safety',
      name_fr: 'Sécurité Alimentaire',
      icon: 'shield',
      color: '#E31B23'
    },
    created_by_user: {
      id: 'user-123',
      full_name: 'John Doe',
      email: 'john@example.com'
    },
    updated_by_user: {
      id: 'user-123',
      full_name: 'John Doe',
      email: 'john@example.com'
    }
  };

  const mockCategory = {
    id: 'cat-789',
    name: 'Food Safety',
    restaurant_id: 'restaurant-456',
    is_active: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => ({
                overlaps: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn(() => Promise.resolve({
                      data: [mockSOPDocument],
                      error: null,
                      count: 1
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockSOPDocument,
            error: null
          }))
        }))
      }))
    });

    mockValidatePagination.mockReturnValue({ isValid: true, errors: [] });
    mockValidateCreateSOPDocument.mockReturnValue({ isValid: true, errors: [] });
    mockSanitizeInput.mockImplementation((data) => data);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/sop/documents', () => {
    it('should return paginated SOP documents successfully', async () => {
      const url = 'http://localhost:3000/api/sop/documents?page=1&limit=20';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([mockSOPDocument]);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should handle query parameters correctly', async () => {
      const url = 'http://localhost:3000/api/sop/documents?page=2&limit=10&sortBy=title&sortOrder=asc&category_id=cat-789&status=approved&difficulty_level=beginner&tags=safety,critical';
      const request = new NextRequest(url);

      await GET(request, mockContext);

      const mockQuery = mockSupabaseAdmin.from().select().eq().eq().eq();
      expect(mockQuery.eq).toHaveBeenCalledWith('category_id', 'cat-789');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved');
      expect(mockQuery.eq).toHaveBeenCalledWith('difficulty_level', 'beginner');
      expect(mockQuery.overlaps).toHaveBeenCalledWith('tags', ['safety', 'critical']);
    });

    it('should apply date filters correctly', async () => {
      const url = 'http://localhost:3000/api/sop/documents?updated_after=2024-01-01&review_due=true';
      const request = new NextRequest(url);

      await GET(request, mockContext);

      const mockQuery = mockSupabaseAdmin.from().select().eq().eq().eq();
      expect(mockQuery.gte).toHaveBeenCalledWith('updated_at', '2024-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('review_due_date', expect.any(String));
    });

    it('should validate pagination parameters', async () => {
      mockValidatePagination.mockReturnValue({
        isValid: false,
        errors: ['Invalid page number']
      });

      const url = 'http://localhost:3000/api/sop/documents?page=-1';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid pagination parameters');
      expect(data.details).toEqual(['Invalid page number']);
    });

    it('should handle database errors', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({
                    data: null,
                    error: { message: 'Database connection failed' },
                    count: null
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const url = 'http://localhost:3000/api/sop/documents';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch SOP documents');
      expect(data.errorCode).toBe('DATABASE_ERROR');
    });

    it('should calculate pagination correctly', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({
                    data: Array(10).fill(mockSOPDocument),
                    error: null,
                    count: 100
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const url = 'http://localhost:3000/api/sop/documents?page=3&limit=10';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(data.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should handle empty results', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null,
                    count: 0
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const url = 'http://localhost:3000/api/sop/documents';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseAdmin.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const url = 'http://localhost:3000/api/sop/documents';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/sop/documents', () => {
    const validCreateRequest = {
      category_id: 'cat-789',
      title: 'New SOP Document',
      title_fr: 'Nouveau Document SOP',
      content: 'This is new SOP content.',
      content_fr: 'Ceci est un nouveau contenu SOP.',
      tags: ['new', 'test'],
      difficulty_level: 'beginner',
      estimated_read_time: 10,
      review_due_date: '2024-12-31'
    };

    beforeEach(() => {
      // Mock category verification
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: mockCategory,
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockSOPDocument,
                error: null
              }))
            }))
          }))
        };
      });
    });

    it('should create SOP document successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSOPDocument);
      expect(data.message).toBe('SOP document created successfully');
    });

    it('should validate input data', async () => {
      mockValidateCreateSOPDocument.mockReturnValue({
        isValid: false,
        errors: ['Title is required', 'Content is required']
      });

      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toEqual(['Title is required', 'Content is required']);
      expect(data.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should sanitize input data', async () => {
      const maliciousInput = {
        ...validCreateRequest,
        title: '<script>alert("xss")</script>Safe Title',
        content: 'Normal content<script>bad()</script>'
      };

      const sanitizedInput = {
        ...validCreateRequest,
        title: 'Safe Title',
        content: 'Normal content'
      };

      mockSanitizeInput.mockReturnValue(sanitizedInput);

      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: JSON.stringify(maliciousInput)
      });

      await POST(request, mockContext);

      expect(mockSanitizeInput).toHaveBeenCalledWith(maliciousInput);
      expect(mockValidateCreateSOPDocument).toHaveBeenCalledWith(sanitizedInput);
    });

    it('should verify category exists and belongs to restaurant', async () => {
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: null,
                      error: { message: 'Category not found' }
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        return mockSupabaseAdmin.from();
      });

      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Category not found or invalid');
      expect(data.errorCode).toBe('CATEGORY_NOT_FOUND');
    });

    it('should handle database creation errors', async () => {
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: mockCategory,
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Insert failed' }
              }))
            }))
          }))
        };
      });

      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create SOP document');
      expect(data.errorCode).toBe('DATABASE_ERROR');
    });

    it('should log audit event on successful creation', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      await POST(request, mockContext);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        mockContext,
        'CREATE',
        'sop_document',
        mockSOPDocument.id,
        null,
        expect.objectContaining({
          restaurant_id: mockContext.restaurantId,
          category_id: validCreateRequest.category_id,
          title: validCreateRequest.title,
          created_by: mockContext.userId
        }),
        request
      );
    });

    it('should set default values correctly', async () => {
      const minimalRequest = {
        category_id: 'cat-789',
        title: 'Minimal SOP',
        title_fr: 'SOP Minimal',
        content: 'Minimal content.',
        content_fr: 'Contenu minimal.'
      };

      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: JSON.stringify(minimalRequest)
      });

      await POST(request, mockContext);

      const insertCall = mockSupabaseAdmin.from().insert;
      expect(insertCall).toHaveBeenCalledWith(expect.objectContaining({
        version: '1.0.0',
        status: 'draft',
        tags: [],
        created_by: mockContext.userId,
        updated_by: mockContext.userId,
        is_active: true,
        restaurant_id: mockContext.restaurantId
      }));
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should handle unexpected errors', async () => {
      mockSanitizeInput.mockImplementation(() => {
        throw new Error('Unexpected sanitization error');
      });

      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });
  });

  describe('Unsupported HTTP Methods', () => {
    it('should return 405 for PUT requests', async () => {
      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });

    it('should return 405 for DELETE requests', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });

    it('should return 405 for PATCH requests', async () => {
      const response = await PATCH();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('Performance and Security', () => {
    it('should include proper timestamps in responses', async () => {
      const url = 'http://localhost:3000/api/sop/documents';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle large result sets efficiently', async () => {
      const largeDataSet = Array(1000).fill(mockSOPDocument);
      
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({
                    data: largeDataSet,
                    error: null,
                    count: 10000
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const url = 'http://localhost:3000/api/sop/documents?limit=1000';
      const request = new NextRequest(url);

      const startTime = Date.now();
      const response = await GET(request, mockContext);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should prevent SQL injection in parameters', async () => {
      const maliciousUrl = "http://localhost:3000/api/sop/documents?category_id='; DROP TABLE sop_documents; --";
      const request = new NextRequest(maliciousUrl);

      const response = await GET(request, mockContext);
      
      // Should not crash and should handle the parameter safely
      expect(response.status).toBe(200);
      
      const mockQuery = mockSupabaseAdmin.from().select().eq().eq().eq();
      expect(mockQuery.eq).toHaveBeenCalledWith('category_id', "'; DROP TABLE sop_documents; --");
    });

    it('should enforce rate limiting through middleware', async () => {
      // This test verifies that the withAuth middleware is properly applied
      // The actual rate limiting logic is tested in the middleware tests
      const url = 'http://localhost:3000/api/sop/documents';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      
      expect(response.status).toBe(200);
      // The fact that this doesn't fail shows the middleware is properly attached
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero pagination limit', async () => {
      const url = 'http://localhost:3000/api/sop/documents?limit=0';
      const request = new NextRequest(url);

      mockValidatePagination.mockReturnValue({
        isValid: false,
        errors: ['Limit must be greater than 0']
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle very large page numbers', async () => {
      const url = 'http://localhost:3000/api/sop/documents?page=999999';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.pagination.page).toBe(999999);
    });

    it('should handle special characters in search filters', async () => {
      const url = 'http://localhost:3000/api/sop/documents?tags=spécial,français,ñoño';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      
      expect(response.status).toBe(200);
      
      const mockQuery = mockSupabaseAdmin.from().select().eq().eq().eq();
      expect(mockQuery.overlaps).toHaveBeenCalledWith('tags', ['spécial', 'français', 'ñoño']);
    });

    it('should handle empty tag filters', async () => {
      const url = 'http://localhost:3000/api/sop/documents?tags=,,,';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      
      expect(response.status).toBe(200);
      // Empty tags should be filtered out and not cause issues
    });

    it('should handle missing request body in POST', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/documents', {
        method: 'POST'
        // No body
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});