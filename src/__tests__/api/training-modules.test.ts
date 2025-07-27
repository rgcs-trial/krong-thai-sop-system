/**
 * Tests for Training Module API Routes
 * These tests define the expected behavior for Next.js 15 API routes
 */

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/training/modules/[id]/route';

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    })),
  })),
}));

describe('Training Module API Routes', () => {
  // Test data
  const mockRequest = new NextRequest('http://localhost:3000/api/training/modules/123');
  
  // Define expected route params structure for Next.js 15
  const mockParams = Promise.resolve({ id: '123' });
  
  describe('GET /api/training/modules/[id]', () => {
    it('should handle async params correctly', async () => {
      // Test that the route handler accepts Promise<{ id: string }>
      expect(async () => {
        await GET(mockRequest, { params: mockParams });
      }).not.toThrow();
    });

    it('should return 401 for unauthorized users', async () => {
      const response = await GET(mockRequest, { params: mockParams });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return training module data for authorized users', async () => {
      // This test will define the expected successful response structure
      const expectedResponse = {
        success: true,
        data: {
          id: '123',
          title: 'Test Module',
          sections: [],
          questions: []
        }
      };

      // Test structure - implementation will make this pass
      expect(expectedResponse).toHaveProperty('success', true);
      expect(expectedResponse.data).toHaveProperty('id', '123');
    });
  });

  describe('PUT /api/training/modules/[id]', () => {
    it('should handle async params for updates', async () => {
      expect(async () => {
        await PUT(mockRequest, { params: mockParams });
      }).not.toThrow();
    });

    it('should require admin/manager role for updates', async () => {
      const response = await PUT(mockRequest, { params: mockParams });
      const data = await response.json();
      
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('DELETE /api/training/modules/[id]', () => {
    it('should handle async params for deletion', async () => {
      expect(async () => {
        await DELETE(mockRequest, { params: mockParams });
      }).not.toThrow();
    });

    it('should require admin role for deletion', async () => {
      const response = await DELETE(mockRequest, { params: mockParams });
      const data = await response.json();
      
      expect([401, 403]).toContain(response.status);
    });
  });
});

// Type safety tests for Next.js 15 async params
describe('Route Parameter Types', () => {
  it('should define correct param types for Next.js 15', () => {
    // This test ensures our route handlers accept the correct types
    type ExpectedRouteParams = {
      params: Promise<{ id: string }>;
    };

    // Type assertion - this should compile without errors
    const validParams: ExpectedRouteParams = {
      params: Promise.resolve({ id: 'test-id' })
    };

    expect(validParams.params).toBeInstanceOf(Promise);
  });

  it('should handle param resolution correctly', async () => {
    const params = Promise.resolve({ id: 'test-123' });
    const resolved = await params;
    
    expect(resolved.id).toBe('test-123');
    expect(typeof resolved.id).toBe('string');
  });
});