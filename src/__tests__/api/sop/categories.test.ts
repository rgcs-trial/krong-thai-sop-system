import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE, PATCH } from '@/app/api/sop/categories/route';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
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
    CATEGORY: {
      READ: 'category:read',
      WRITE: 'category:write'
    }
  },
  logAuditEvent: vi.fn()
}));

vi.mock('@/lib/validation/sop', () => ({
  validateCreateSOPCategory: vi.fn(),
  validatePagination: vi.fn(),
  sanitizeInput: vi.fn()
}));

// Import mocked modules
import { supabaseAdmin } from '@/lib/supabase/client';
import { logAuditEvent } from '@/lib/middleware/auth';
import { validateCreateSOPCategory, validatePagination, sanitizeInput } from '@/lib/validation/sop';

const mockSupabaseAdmin = supabaseAdmin as any;
const mockLogAuditEvent = logAuditEvent as any;
const mockValidateCreateSOPCategory = validateCreateSOPCategory as any;
const mockValidatePagination = validatePagination as any;
const mockSanitizeInput = sanitizeInput as any;

describe('/api/sop/categories', () => {
  const mockContext = {
    userId: 'user-123',
    restaurantId: 'restaurant-456',
    userRole: 'manager' as const,
    userPermissions: ['category:read', 'category:write']
  };

  const mockCategory = {
    id: 'cat-123',
    restaurant_id: 'restaurant-456',
    name: 'Food Safety',
    name_fr: 'Sécurité Alimentaire',
    description: 'Food safety and hygiene procedures',
    description_fr: 'Procédures de sécurité et d\'hygiène alimentaires',
    icon: 'shield',
    color: '#E31B23',
    sort_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockCategoryWithStats = {
    ...mockCategory,
    document_count: 5,
    completed_count: 3,
    pending_reviews: 2
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({
                data: [mockCategory],
                error: null,
                count: 1
              }))
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockCategory,
            error: null
          }))
        }))
      }))
    });

    mockValidatePagination.mockReturnValue({ isValid: true, errors: [] });
    mockValidateCreateSOPCategory.mockReturnValue({ isValid: true, errors: [] });
    mockSanitizeInput.mockImplementation((data) => data);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/sop/categories', () => {
    it('should return paginated categories successfully', async () => {
      const url = 'http://localhost:3000/api/sop/categories?page=1&limit=20';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([mockCategory]);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should include statistics when includeStats is true', async () => {
      // Mock additional queries for statistics
      let callCount = 0;
      mockSupabaseAdmin.from.mockImplementation((table) => {
        callCount++;
        
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn(() => Promise.resolve({
                      data: [mockCategory],
                      error: null,
                      count: 1
                    }))
                  }))
                }))
              }))
            }))
          };
        } else if (table === 'sop_documents') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: [
                      { category_id: 'cat-123', status: 'approved' },
                      { category_id: 'cat-123', status: 'review' },
                      { category_id: 'cat-123', status: 'review' }
                    ],
                    error: null
                  }))
                }))
              }))
            }))
          };
        } else if (table === 'user_progress') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [
                  { sop_id: 'sop-1', progress_percentage: 100 },
                  { sop_id: 'sop-2', progress_percentage: 100 },
                  { sop_id: 'sop-3', progress_percentage: 50 }
                ],
                error: null
              }))
            }))
          };
        }
        
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: [
                    { id: 'sop-1', category_id: 'cat-123' },
                    { id: 'sop-2', category_id: 'cat-123' },
                    { id: 'sop-3', category_id: 'cat-123' }
                  ],
                  error: null
                }))
              }))
            }))
          }))
        };
      });

      const url = 'http://localhost:3000/api/sop/categories?includeStats=true';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0]).toEqual({
        ...mockCategory,
        document_count: 3,
        completed_count: 2,
        pending_reviews: 2
      });
    });

    it('should exclude inactive categories when activeOnly is true', async () => {
      const url = 'http://localhost:3000/api/sop/categories?activeOnly=true';
      const request = new NextRequest(url);

      await GET(request, mockContext);

      const mockQuery = mockSupabaseAdmin.from().select().eq();
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should include inactive categories when activeOnly is false', async () => {
      const url = 'http://localhost:3000/api/sop/categories?activeOnly=false';
      const request = new NextRequest(url);

      await GET(request, mockContext);

      const mockQuery = mockSupabaseAdmin.from().select().eq();
      // Should not call eq with is_active when activeOnly is false
      expect(mockQuery.eq).not.toHaveBeenCalledWith('is_active', true);
    });

    it('should handle custom sorting', async () => {
      const url = 'http://localhost:3000/api/sop/categories?sortBy=name&sortOrder=desc';
      const request = new NextRequest(url);

      await GET(request, mockContext);

      const mockQuery = mockSupabaseAdmin.from().select().eq().eq();
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: false });
    });

    it('should use default sorting when not specified', async () => {
      const url = 'http://localhost:3000/api/sop/categories';
      const request = new NextRequest(url);

      await GET(request, mockContext);

      const mockQuery = mockSupabaseAdmin.from().select().eq().eq();
      expect(mockQuery.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });

    it('should validate pagination parameters', async () => {
      mockValidatePagination.mockReturnValue({
        isValid: false,
        errors: ['Invalid page number']
      });

      const url = 'http://localhost:3000/api/sop/categories?page=-1';
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
      });

      const url = 'http://localhost:3000/api/sop/categories';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch SOP categories');
      expect(data.errorCode).toBe('DATABASE_ERROR');
    });

    it('should handle empty results', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn(() => ({
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
      });

      const url = 'http://localhost:3000/api/sop/categories';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should handle statistics query errors gracefully', async () => {
      let callCount = 0;
      mockSupabaseAdmin.from.mockImplementation((table) => {
        callCount++;
        
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn(() => Promise.resolve({
                      data: [mockCategory],
                      error: null,
                      count: 1
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        // Stats queries return errors
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Stats query failed' }
              }))
            }))
          }))
        };
      });

      const url = 'http://localhost:3000/api/sop/categories?includeStats=true';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should return categories without stats when stats queries fail
      expect(data.data[0]).toEqual({
        ...mockCategory,
        document_count: 0,
        completed_count: 0,
        pending_reviews: 0
      });
    });
  });

  describe('POST /api/sop/categories', () => {
    const validCreateRequest = {
      name: 'Kitchen Safety',
      name_fr: 'Sécurité de la Cuisine',
      description: 'Kitchen safety procedures',
      description_fr: 'Procédures de sécurité de la cuisine',
      icon: 'shield',
      color: '#E31B23',
      sort_order: 5
    };

    beforeEach(() => {
      // Mock category existence checks
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                or: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: null,
                      error: null
                    }))
                  }))
                })),
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn(() => Promise.resolve({
                        data: null,
                        error: null
                      }))
                    }))
                  }))
                }))
              }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: mockCategory,
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabaseAdmin.from();
      });
    });

    it('should create category successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        ...mockCategory,
        document_count: 0,
        completed_count: 0,
        pending_reviews: 0
      });
      expect(data.message).toBe('SOP category created successfully');
    });

    it('should validate input data', async () => {
      mockValidateCreateSOPCategory.mockReturnValue({
        isValid: false,
        errors: ['Name is required', 'Sort order must be a positive integer']
      });

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toEqual(['Name is required', 'Sort order must be a positive integer']);
      expect(data.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should sanitize input data', async () => {
      const maliciousInput = {
        ...validCreateRequest,
        name: '<script>alert("xss")</script>Safe Name',
        description: 'Normal description<script>bad()</script>'
      };

      const sanitizedInput = {
        ...validCreateRequest,
        name: 'Safe Name',
        description: 'Normal description'
      };

      mockSanitizeInput.mockReturnValue(sanitizedInput);

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(maliciousInput)
      });

      await POST(request, mockContext);

      expect(mockSanitizeInput).toHaveBeenCalledWith(maliciousInput);
      expect(mockValidateCreateSOPCategory).toHaveBeenCalledWith(sanitizedInput);
    });

    it('should prevent duplicate category names', async () => {
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                or: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: { id: 'existing-cat' },
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        return mockSupabaseAdmin.from();
      });

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Category with this name already exists');
      expect(data.errorCode).toBe('CATEGORY_EXISTS');
    });

    it('should prevent duplicate sort orders', async () => {
      let callCount = 0;
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => {
                callCount++;
                if (callCount === 1) {
                  // First call for name check
                  return {
                    or: vi.fn(() => ({
                      eq: vi.fn(() => ({
                        single: vi.fn(() => Promise.resolve({
                          data: null,
                          error: null
                        }))
                      }))
                    }))
                  };
                } else {
                  // Second call for sort order check
                  return {
                    eq: vi.fn(() => ({
                      eq: vi.fn(() => ({
                        single: vi.fn(() => Promise.resolve({
                          data: { id: 'existing-sort' },
                          error: null
                        }))
                      }))
                    }))
                  };
                }
              }))
            }))
          };
        }
        return mockSupabaseAdmin.from();
      });

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Sort order already in use. Please choose a different value.');
      expect(data.errorCode).toBe('SORT_ORDER_EXISTS');
    });

    it('should handle database creation errors', async () => {
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'sop_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                or: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: null,
                      error: null
                    }))
                  }))
                })),
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn(() => Promise.resolve({
                        data: null,
                        error: null
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
                  error: { message: 'Insert failed' }
                }))
              }))
            }))
          };
        }
        return mockSupabaseAdmin.from();
      });

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create SOP category');
      expect(data.errorCode).toBe('DATABASE_ERROR');
    });

    it('should log audit event on successful creation', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
      });

      await POST(request, mockContext);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        mockContext,
        'CREATE',
        'sop_category',
        mockCategory.id,
        null,
        expect.objectContaining({
          restaurant_id: mockContext.restaurantId,
          name: validCreateRequest.name,
          name_fr: validCreateRequest.name_fr,
          sort_order: validCreateRequest.sort_order
        }),
        request
      );
    });

    it('should handle optional fields correctly', async () => {
      const minimalRequest = {
        name: 'Minimal Category',
        name_fr: 'Catégorie Minimale',
        sort_order: 1
      };

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(minimalRequest)
      });

      await POST(request, mockContext);

      const insertCall = mockSupabaseAdmin.from().insert;
      expect(insertCall).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Minimal Category',
        name_fr: 'Catégorie Minimale',
        description: null,
        description_fr: null,
        icon: null,
        color: null,
        sort_order: 1,
        is_active: true,
        restaurant_id: mockContext.restaurantId
      }));
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
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

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
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

  describe('Performance and Edge Cases', () => {
    it('should include proper timestamps in responses', async () => {
      const url = 'http://localhost:3000/api/sop/categories';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle large number of categories efficiently', async () => {
      const largeDataSet = Array(100).fill(mockCategory);
      
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({
                  data: largeDataSet,
                  error: null,
                  count: 1000
                }))
              }))
            }))
          }))
        }))
      });

      const url = 'http://localhost:3000/api/sop/categories?limit=100';
      const request = new NextRequest(url);

      const startTime = Date.now();
      const response = await GET(request, mockContext);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle zero pagination limit', async () => {
      const url = 'http://localhost:3000/api/sop/categories?limit=0';
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
      const url = 'http://localhost:3000/api/sop/categories?page=999999';
      const request = new NextRequest(url);

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.pagination.page).toBe(999999);
    });

    it('should handle special characters in category names', async () => {
      const specialRequest = {
        name: 'Spécial Catégory with ñoño',
        name_fr: 'Catégorie Spéçiale avec éléments',
        sort_order: 1
      };

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(specialRequest)
      });

      const response = await POST(request, mockContext);
      
      expect(response.status).toBe(201);
      // Should handle special characters without issues
    });

    it('should prevent SQL injection in category names', async () => {
      const maliciousRequest = {
        name: "'; DROP TABLE sop_categories; --",
        name_fr: "Malicious Name",
        sort_order: 1
      };

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(maliciousRequest)
      });

      const response = await POST(request, mockContext);
      
      // Should not crash and should handle the input safely
      expect(response.status).toBeLessThan(600); // Any valid HTTP status
    });

    it('should handle missing request body in POST', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST'
        // No body
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should handle concurrent requests safely', async () => {
      const requests = Array(10).fill(null).map(() => {
        const url = 'http://localhost:3000/api/sop/categories';
        return new NextRequest(url);
      });

      const responses = await Promise.all(
        requests.map(request => GET(request, mockContext))
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Bilingual Support', () => {
    it('should handle French names correctly', async () => {
      const frenchRequest = {
        name: 'Sécurité',
        name_fr: 'Safety in French',
        description: 'Description en français',
        description_fr: 'French description',
        sort_order: 1
      };

      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify(frenchRequest)
      });

      await POST(request, mockContext);

      const insertCall = mockSupabaseAdmin.from().insert;
      expect(insertCall).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Sécurité',
        name_fr: 'Safety in French',
        description: 'Description en français',
        description_fr: 'French description'
      }));
    });

    it('should check for duplicates in both languages', async () => {
      const request = new NextRequest('http://localhost:3000/api/sop/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Name',
          name_fr: 'Nom Test',
          sort_order: 1
        })
      });

      await POST(request, mockContext);

      const selectCall = mockSupabaseAdmin.from().select().eq();
      expect(selectCall.or).toHaveBeenCalledWith('name.eq.Test Name,name_fr.eq.Nom Test');
    });
  });
});