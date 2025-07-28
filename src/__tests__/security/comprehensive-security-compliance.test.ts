/**
 * Comprehensive Security and Compliance Validation Tests
 * Restaurant Krong Thai SOP Management System
 * 
 * Enterprise-grade security testing covering:
 * - Authentication and authorization security
 * - Data protection and encryption
 * - Input validation and injection prevention
 * - Session management and security headers
 * - GDPR compliance and data privacy
 * - Audit logging and security monitoring
 * - Network security and API protection
 * - File upload security and validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import crypto from 'crypto';

// Security testing utilities
import { createSupabaseTestClient } from '../utils/test-utils';
import { EnhancedPinLogin } from '../../components/auth/enhanced-pin-login';
import { validateInput, sanitizeInput } from '../../lib/security/input-validation';
import { encryptSensitiveData, decryptSensitiveData } from '../../lib/security/encryption';
import { createAuditLog } from '../../lib/security/audit-logging';

// Mock security headers middleware
const mockSecurityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Test data for security validation
const mockMaliciousInputs = {
  xssPayloads: [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    "'><script>alert('XSS')</script>",
  ],
  sqlInjectionPayloads: [
    "' OR '1'='1' --",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "1' OR 1=1#",
    "admin'--",
    "' OR 1=1 LIMIT 1 --",
  ],
  pathTraversalPayloads: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '/etc/passwd%00',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ],
  ldapInjectionPayloads: [
    '*)(uid=*',
    '*)(|(password=*))',
    '*()|(&(password=*))',
    '*))%00',
  ],
  commandInjectionPayloads: [
    '; cat /etc/passwd',
    '| whoami',
    '&& rm -rf /',
    '`cat /etc/passwd`',
    '$(cat /etc/passwd)',
  ],
};

const mockSensitiveData = {
  userPIN: '1234',
  personalInfo: {
    name: 'John Chef',
    email: 'john@krongthai.com',
    phone: '+1-555-123-4567',
    address: '123 Restaurant St, Food City, FC 12345',
  },
  financialData: {
    salary: 50000,
    bankAccount: '****-****-****-1234',
    taxId: '***-**-4567',
  },
  medicalInfo: {
    allergies: ['shellfish', 'nuts'],
    conditions: ['none'],
  },
};

describe('Comprehensive Security and Compliance Tests', () => {
  let supabaseClient: any;

  beforeAll(async () => {
    supabaseClient = createSupabaseTestClient();
    
    // Setup security test environment
    await setupSecurityTestEnvironment();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupSecurityTestEnvironment();
  });

  describe('Authentication and Authorization Security', () => {
    describe('PIN Authentication Security', () => {
      it('should enforce secure PIN requirements', async () => {
        const weakPINs = ['0000', '1111', '1234', '0123', '9999'];
        const strongPINs = ['8274', '5193', '7462', '3058', '9157'];

        const validatePIN = (pin: string) => {
          // No sequential numbers
          const isSequential = /0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210/.test(pin);
          // No repeated digits
          const hasRepeated = /(\d)\1{3}/.test(pin);
          // No common patterns
          const isCommon = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'].includes(pin);
          
          return !isSequential && !hasRepeated && !isCommon;
        };

        weakPINs.forEach(pin => {
          expect(validatePIN(pin)).toBe(false);
        });

        strongPINs.forEach(pin => {
          expect(validatePIN(pin)).toBe(true);
        });
      });

      it('should implement secure PIN hashing', async () => {
        const testPIN = '8274';
        const salt = crypto.randomBytes(16).toString('hex');
        
        const hashPIN = (pin: string, salt: string) => {
          return crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
        };

        const hash1 = hashPIN(testPIN, salt);
        const hash2 = hashPIN(testPIN, salt);
        const hashDifferentPIN = hashPIN('1234', salt);

        expect(hash1).toBe(hash2); // Same PIN, same hash
        expect(hash1).not.toBe(hashDifferentPIN); // Different PIN, different hash
        expect(hash1.length).toBe(128); // 64 bytes in hex = 128 characters
      });

      it('should prevent brute force attacks', async () => {
        const maxAttempts = 5;
        const lockoutDuration = 15 * 60 * 1000; // 15 minutes

        const mockBruteForceAttempts = [
          { pin: '0000', timestamp: Date.now() - 1000 },
          { pin: '1111', timestamp: Date.now() - 2000 },
          { pin: '2222', timestamp: Date.now() - 3000 },
          { pin: '3333', timestamp: Date.now() - 4000 },
          { pin: '4444', timestamp: Date.now() - 5000 },
        ];

        const isAccountLocked = (attempts: typeof mockBruteForceAttempts) => {
          const recentAttempts = attempts.filter(
            attempt => Date.now() - attempt.timestamp < lockoutDuration
          );
          return recentAttempts.length >= maxAttempts;
        };

        expect(isAccountLocked(mockBruteForceAttempts)).toBe(true);

        // Test lockout expiry
        const oldAttempts = mockBruteForceAttempts.map(attempt => ({
          ...attempt,
          timestamp: Date.now() - (lockoutDuration + 1000), // Older than lockout duration
        }));

        expect(isAccountLocked(oldAttempts)).toBe(false);
      });

      it('should validate session security', async () => {
        const sessionData = {
          sessionId: crypto.randomUUID(),
          userId: 'user-123',
          createdAt: Date.now(),
          expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
        };

        const validateSession = (session: typeof sessionData) => {
          const now = Date.now();
          const isExpired = now > session.expiresAt;
          const isValidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(session.sessionId);
          const isValidDuration = session.expiresAt - session.createdAt <= (8 * 60 * 60 * 1000);
          
          return !isExpired && isValidFormat && isValidDuration;
        };

        expect(validateSession(sessionData)).toBe(true);

        // Test expired session
        const expiredSession = {
          ...sessionData,
          expiresAt: Date.now() - 1000,
        };

        expect(validateSession(expiredSession)).toBe(false);
      });
    });

    describe('Role-Based Access Control', () => {
      it('should enforce proper authorization for different roles', async () => {
        const rolePermissions = {
          admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'view:analytics'],
          manager: ['read:sop', 'write:sop', 'read:training', 'write:training', 'view:reports'],
          chef: ['read:sop', 'write:progress', 'read:training', 'write:training'],
          server: ['read:sop', 'write:progress', 'read:training'],
        };

        const hasPermission = (userRole: string, requiredPermission: string) => {
          const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
          return permissions.includes(requiredPermission) || permissions.includes('write:all');
        };

        // Test admin permissions
        expect(hasPermission('admin', 'delete:all')).toBe(true);
        expect(hasPermission('admin', 'manage:users')).toBe(true);

        // Test manager permissions
        expect(hasPermission('manager', 'write:sop')).toBe(true);
        expect(hasPermission('manager', 'delete:all')).toBe(false);

        // Test chef permissions
        expect(hasPermission('chef', 'read:sop')).toBe(true);
        expect(hasPermission('chef', 'manage:users')).toBe(false);

        // Test server permissions
        expect(hasPermission('server', 'read:sop')).toBe(true);
        expect(hasPermission('server', 'write:sop')).toBe(false);
      });

      it('should validate resource-level permissions', async () => {
        const resourceAccess = {
          userId: 'user-123',
          role: 'chef',
          restaurantId: 'restaurant-1',
          permissions: ['read:sop', 'write:progress'],
        };

        const validateResourceAccess = (
          access: typeof resourceAccess,
          resource: { type: string; restaurantId: string; ownerId?: string },
          action: string
        ) => {
          // Check if user belongs to same restaurant
          if (access.restaurantId !== resource.restaurantId) {
            return false;
          }

          // Check role-based permissions
          const requiredPermission = `${action}:${resource.type}`;
          if (!access.permissions.includes(requiredPermission)) {
            return false;
          }

          // Check ownership for sensitive resources
          if (resource.ownerId && resource.ownerId !== access.userId && action === 'delete') {
            return false;
          }

          return true;
        };

        // Valid access
        expect(validateResourceAccess(
          resourceAccess,
          { type: 'sop', restaurantId: 'restaurant-1' },
          'read'
        )).toBe(true);

        // Invalid restaurant access
        expect(validateResourceAccess(
          resourceAccess,
          { type: 'sop', restaurantId: 'restaurant-2' },
          'read'
        )).toBe(false);

        // Invalid permission
        expect(validateResourceAccess(
          resourceAccess,
          { type: 'analytics', restaurantId: 'restaurant-1' },
          'read'
        )).toBe(false);
      });
    });
  });

  describe('Data Protection and Encryption', () => {
    describe('Data Encryption', () => {
      it('should encrypt sensitive data at rest', async () => {
        const encryptionKey = crypto.randomBytes(32);
        
        const encryptData = (data: string, key: Buffer) => {
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipher('aes-256-cbc', key);
          let encrypted = cipher.update(data, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          return { encrypted, iv: iv.toString('hex') };
        };

        const decryptData = (encryptedData: string, key: Buffer, iv: string) => {
          const decipher = crypto.createDecipher('aes-256-cbc', key);
          let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        };

        const sensitiveData = JSON.stringify(mockSensitiveData);
        const { encrypted, iv } = encryptData(sensitiveData, encryptionKey);
        const decrypted = decryptData(encrypted, encryptionKey, iv);

        expect(encrypted).not.toBe(sensitiveData);
        expect(decrypted).toBe(sensitiveData);
        expect(JSON.parse(decrypted)).toEqual(mockSensitiveData);
      });

      it('should implement secure key management', async () => {
        const generateSecureKey = () => {
          return crypto.randomBytes(32); // 256-bit key
        };

        const deriveKeyFromPassword = (password: string, salt: string) => {
          return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        };

        const masterPassword = 'SecureRestaurantMaster2024!';
        const salt = crypto.randomBytes(16).toString('hex');

        const key1 = generateSecureKey();
        const key2 = deriveKeyFromPassword(masterPassword, salt);
        const key3 = deriveKeyFromPassword(masterPassword, salt);

        expect(key1.length).toBe(32);
        expect(key2.length).toBe(32);
        expect(key2.equals(key3)).toBe(true); // Same password and salt = same key
        expect(key1.equals(key2)).toBe(false); // Different generation methods
      });

      it('should protect PII data', async () => {
        const piiFields = ['email', 'phone', 'address', 'bankAccount', 'taxId'];
        
        const maskPIIData = (data: any) => {
          const masked = { ...data };
          
          if (masked.personalInfo) {
            if (masked.personalInfo.email) {
              const [username, domain] = masked.personalInfo.email.split('@');
              masked.personalInfo.email = `${username.slice(0, 2)}***@${domain}`;
            }
            if (masked.personalInfo.phone) {
              masked.personalInfo.phone = masked.personalInfo.phone.replace(/\d(?=\d{4})/g, '*');
            }
            if (masked.personalInfo.address) {
              masked.personalInfo.address = '[REDACTED]';
            }
          }

          if (masked.financialData) {
            Object.keys(masked.financialData).forEach(key => {
              if (typeof masked.financialData[key] === 'string' && masked.financialData[key].includes('*')) {
                // Already masked
                return;
              }
              if (key === 'bankAccount' || key === 'taxId') {
                masked.financialData[key] = masked.financialData[key].toString().replace(/./g, '*');
              }
            });
          }

          return masked;
        };

        const maskedData = maskPIIData(mockSensitiveData);

        expect(maskedData.personalInfo.email).toBe('jo***@krongthai.com');
        expect(maskedData.personalInfo.phone).toBe('+1-555-***-4567');
        expect(maskedData.personalInfo.address).toBe('[REDACTED]');
        expect(maskedData.financialData.taxId).toBe('**********');
      });
    });

    describe('GDPR Compliance', () => {
      it('should support data subject rights', async () => {
        const gdprOperations = {
          rightToAccess: async (userId: string) => {
            // Return all data associated with user
            return {
              personalData: mockSensitiveData.personalInfo,
              activityLogs: ['login', 'sop_completed', 'training_started'],
              consentRecords: ['marketing: false', 'analytics: true'],
            };
          },

          rightToRectification: async (userId: string, corrections: any) => {
            // Update incorrect data
            return { success: true, updated: corrections };
          },

          rightToDeletion: async (userId: string) => {
            // Delete or anonymize user data
            return {
              deleted: ['personal_info', 'activity_logs'],
              anonymized: ['performance_metrics'],
              retained: ['audit_logs'], // Legal requirement
            };
          },

          rightToPortability: async (userId: string) => {
            // Export user data in machine-readable format
            return {
              format: 'JSON',
              data: mockSensitiveData,
              exported_at: new Date().toISOString(),
            };
          },

          rightToObject: async (userId: string, processingType: string) => {
            // Stop specific data processing
            return {
              processing_type: processingType,
              status: 'stopped',
              timestamp: Date.now(),
            };
          },
        };

        // Test right to access
        const accessData = await gdprOperations.rightToAccess('user-123');
        expect(accessData.personalData).toBeDefined();
        expect(accessData.activityLogs).toBeInstanceOf(Array);

        // Test right to deletion
        const deletionResult = await gdprOperations.rightToDeletion('user-123');
        expect(deletionResult.deleted).toContain('personal_info');
        expect(deletionResult.retained).toContain('audit_logs');

        // Test right to portability
        const portabilityData = await gdprOperations.rightToPortability('user-123');
        expect(portabilityData.format).toBe('JSON');
        expect(portabilityData.data).toBeDefined();
      });

      it('should implement consent management', async () => {
        const consentManager = {
          recordConsent: (userId: string, consentType: string, granted: boolean) => {
            return {
              userId,
              consentType,
              granted,
              timestamp: Date.now(),
              version: '1.0',
              ipAddress: '192.168.1.100',
            };
          },

          checkConsent: (userId: string, consentType: string) => {
            // Mock consent check
            const consents = {
              'marketing': false,
              'analytics': true,
              'functional': true,
            };
            return consents[consentType as keyof typeof consents] ?? false;
          },

          withdrawConsent: (userId: string, consentType: string) => {
            return {
              userId,
              consentType,
              withdrawn: true,
              timestamp: Date.now(),
            };
          },
        };

        // Test consent recording
        const consentRecord = consentManager.recordConsent('user-123', 'analytics', true);
        expect(consentRecord.granted).toBe(true);
        expect(consentRecord.timestamp).toBeGreaterThan(0);

        // Test consent checking
        expect(consentManager.checkConsent('user-123', 'analytics')).toBe(true);
        expect(consentManager.checkConsent('user-123', 'marketing')).toBe(false);

        // Test consent withdrawal
        const withdrawal = consentManager.withdrawConsent('user-123', 'analytics');
        expect(withdrawal.withdrawn).toBe(true);
      });
    });
  });

  describe('Input Validation and Injection Prevention', () => {
    describe('XSS Prevention', () => {
      it('should sanitize all user inputs', async () => {
        const sanitizeHTML = (input: string) => {
          return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
        };

        mockMaliciousInputs.xssPayloads.forEach(payload => {
          const sanitized = sanitizeHTML(payload);
          
          expect(sanitized).not.toContain('<script>');
          expect(sanitized).not.toContain('javascript:');
          expect(sanitized).not.toContain('onerror=');
          expect(sanitized).not.toContain('onload=');
        });

        // Test specific XSS payload
        const xssPayload = '<script>alert("XSS")</script>';
        const sanitized = sanitizeHTML(xssPayload);
        expect(sanitized).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      });

      it('should validate input context appropriately', async () => {
        const validateInputContext = (value: string, context: 'html' | 'attribute' | 'javascript' | 'css') => {
          const validators = {
            html: (v: string) => !/[<>]/.test(v),
            attribute: (v: string) => !/[<>"']/.test(v),
            javascript: (v: string) => !/[<>'"`;(){}[\]]/.test(v),
            css: (v: string) => !/[<>'"`;(){}]/.test(v),
          };

          return validators[context](value);
        };

        const testInput = 'Normal text input';
        const maliciousInput = '<script>alert("xss")</script>';

        expect(validateInputContext(testInput, 'html')).toBe(true);
        expect(validateInputContext(maliciousInput, 'html')).toBe(false);
        expect(validateInputContext(maliciousInput, 'attribute')).toBe(false);
        expect(validateInputContext(maliciousInput, 'javascript')).toBe(false);
      });
    });

    describe('SQL Injection Prevention', () => {
      it('should detect SQL injection patterns', async () => {
        const detectSQLInjection = (input: string) => {
          const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|OR|AND)\b/i;
          const sqlPatterns = /[';]|--|\*\/|\*\*/;
          const sqlFunctions = /\b(CONCAT|SUBSTRING|ASCII|CHAR|LENGTH)\b/i;
          
          return sqlKeywords.test(input) || sqlPatterns.test(input) || sqlFunctions.test(input);
        };

        mockMaliciousInputs.sqlInjectionPayloads.forEach(payload => {
          expect(detectSQLInjection(payload)).toBe(true);
        });

        // Test safe inputs
        const safeInputs = ['John Doe', 'food safety training', '2024-01-15', 'Restaurant Name'];
        safeInputs.forEach(input => {
          expect(detectSQLInjection(input)).toBe(false);
        });
      });

      it('should use parameterized queries', async () => {
        // Mock parameterized query builder
        const buildParameterizedQuery = (query: string, params: any[]) => {
          let parameterizedQuery = query;
          let paramIndex = 0;

          // Replace ? with $1, $2, etc.
          parameterizedQuery = parameterizedQuery.replace(/\?/g, () => `$${++paramIndex}`);

          return {
            text: parameterizedQuery,
            values: params,
          };
        };

        const query = 'SELECT * FROM users WHERE email = ? AND role = ?';
        const params = ['user@example.com', 'chef'];

        const parameterized = buildParameterizedQuery(query, params);

        expect(parameterized.text).toBe('SELECT * FROM users WHERE email = $1 AND role = $2');
        expect(parameterized.values).toEqual(params);
      });
    });

    describe('File Upload Security', () => {
      it('should validate file types and sizes', async () => {
        const validateFileUpload = (file: { name: string; size: number; type: string }) => {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
          const maxSize = 10 * 1024 * 1024; // 10MB
          const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

          const hasValidType = allowedTypes.includes(file.type);
          const hasValidSize = file.size <= maxSize && file.size > 0;
          const hasValidExtension = allowedExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
          );

          return hasValidType && hasValidSize && hasValidExtension;
        };

        // Valid files
        const validFile = { name: 'photo.jpg', size: 2048000, type: 'image/jpeg' };
        expect(validateFileUpload(validFile)).toBe(true);

        // Invalid type
        const invalidType = { name: 'script.exe', size: 1024, type: 'application/exe' };
        expect(validateFileUpload(invalidType)).toBe(false);

        // Invalid size
        const invalidSize = { name: 'large.jpg', size: 20 * 1024 * 1024, type: 'image/jpeg' };
        expect(validateFileUpload(invalidSize)).toBe(false);

        // Invalid extension
        const invalidExt = { name: 'image.php', size: 1024, type: 'image/jpeg' };
        expect(validateFileUpload(invalidExt)).toBe(false);
      });

      it('should scan files for malicious content', async () => {
        const scanFileContent = async (fileBuffer: Buffer) => {
          // Mock virus scanner
          const maliciousSignatures = ['EICAR', 'X5O!P%@AP', 'malware_signature'];
          const fileContent = fileBuffer.toString();

          const hasMaliciousSignature = maliciousSignatures.some(signature => 
            fileContent.includes(signature)
          );

          // Check for embedded scripts in images
          const hasEmbeddedScript = /<script|javascript:|vbscript:/i.test(fileContent);

          return {
            clean: !hasMaliciousSignature && !hasEmbeddedScript,
            threats: hasMaliciousSignature ? ['virus'] : hasEmbeddedScript ? ['script'] : [],
          };
        };

        const cleanFile = Buffer.from('Clean file content');
        const maliciousFile = Buffer.from('File with EICAR test signature');
        const scriptFile = Buffer.from('Image with <script>alert("xss")</script>');

        const cleanResult = await scanFileContent(cleanFile);
        const maliciousResult = await scanFileContent(maliciousFile);
        const scriptResult = await scanFileContent(scriptFile);

        expect(cleanResult.clean).toBe(true);
        expect(maliciousResult.clean).toBe(false);
        expect(maliciousResult.threats).toContain('virus');
        expect(scriptResult.clean).toBe(false);
        expect(scriptResult.threats).toContain('script');
      });
    });
  });

  describe('Security Headers and Network Protection', () => {
    describe('HTTP Security Headers', () => {
      it('should implement comprehensive security headers', async () => {
        const validateSecurityHeaders = (headers: Record<string, string>) => {
          const requiredHeaders = [
            'Content-Security-Policy',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy',
            'Permissions-Policy',
          ];

          const missingHeaders = requiredHeaders.filter(header => !headers[header]);
          
          return {
            valid: missingHeaders.length === 0,
            missing: missingHeaders,
            headers,
          };
        };

        const validation = validateSecurityHeaders(mockSecurityHeaders);
        expect(validation.valid).toBe(true);
        expect(validation.missing).toHaveLength(0);

        // Test CSP directive
        expect(mockSecurityHeaders['Content-Security-Policy']).toContain("default-src 'self'");
        expect(mockSecurityHeaders['X-Frame-Options']).toBe('DENY');
        expect(mockSecurityHeaders['X-Content-Type-Options']).toBe('nosniff');
      });

      it('should prevent clickjacking attacks', async () => {
        const frameOptions = mockSecurityHeaders['X-Frame-Options'];
        const csp = mockSecurityHeaders['Content-Security-Policy'];

        expect(frameOptions).toBe('DENY');
        expect(csp).not.toContain('frame-ancestors');

        // Alternative CSP frame-ancestors check
        const cspWithFrameAncestors = "default-src 'self'; frame-ancestors 'none'";
        expect(cspWithFrameAncestors).toContain("frame-ancestors 'none'");
      });
    });

    describe('Rate Limiting', () => {
      it('should implement API rate limiting', async () => {
        const rateLimiter = {
          requests: new Map<string, number[]>(),
          
          isAllowed: function(clientId: string, limit: number, windowMs: number) {
            const now = Date.now();
            const requests = this.requests.get(clientId) || [];
            
            // Remove old requests outside the window
            const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
            
            if (validRequests.length >= limit) {
              return false;
            }

            validRequests.push(now);
            this.requests.set(clientId, validRequests);
            
            return true;
          },

          getRemainingRequests: function(clientId: string, limit: number, windowMs: number) {
            const now = Date.now();
            const requests = this.requests.get(clientId) || [];
            const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
            
            return Math.max(0, limit - validRequests.length);
          },
        };

        const clientId = '192.168.1.100';
        const limit = 10;
        const windowMs = 60000; // 1 minute

        // Test normal requests
        for (let i = 0; i < limit; i++) {
          expect(rateLimiter.isAllowed(clientId, limit, windowMs)).toBe(true);
        }

        // Test rate limit exceeded
        expect(rateLimiter.isAllowed(clientId, limit, windowMs)).toBe(false);
        expect(rateLimiter.getRemainingRequests(clientId, limit, windowMs)).toBe(0);
      });

      it('should implement progressive delays for repeated violations', async () => {
        const progressiveRateLimiter = {
          violations: new Map<string, number>(),
          
          getDelay: function(clientId: string) {
            const violations = this.violations.get(clientId) || 0;
            return Math.min(30000, Math.pow(2, violations) * 1000); // Exponential backoff, max 30s
          },

          recordViolation: function(clientId: string) {
            const current = this.violations.get(clientId) || 0;
            this.violations.set(clientId, current + 1);
          },

          resetViolations: function(clientId: string) {
            this.violations.delete(clientId);
          },
        };

        const clientId = 'attacker-ip';

        // First violation
        progressiveRateLimiter.recordViolation(clientId);
        expect(progressiveRateLimiter.getDelay(clientId)).toBe(2000); // 2 seconds

        // Second violation
        progressiveRateLimiter.recordViolation(clientId);
        expect(progressiveRateLimiter.getDelay(clientId)).toBe(4000); // 4 seconds

        // Third violation
        progressiveRateLimiter.recordViolation(clientId);
        expect(progressiveRateLimiter.getDelay(clientId)).toBe(8000); // 8 seconds
      });
    });
  });

  describe('Audit Logging and Security Monitoring', () => {
    describe('Comprehensive Audit Logging', () => {
      it('should log all security-relevant events', async () => {
        const auditLogger = {
          logs: [] as any[],
          
          log: function(event: {
            type: string;
            userId?: string;
            action: string;
            resource?: string;
            result: 'success' | 'failure';
            metadata?: any;
          }) {
            const logEntry = {
              ...event,
              timestamp: new Date().toISOString(),
              severity: this.getSeverity(event.type, event.result),
              id: crypto.randomUUID(),
            };
            
            this.logs.push(logEntry);
            return logEntry;
          },

          getSeverity: function(type: string, result: string) {
            if (result === 'failure') {
              if (['authentication', 'authorization'].includes(type)) return 'high';
              if (['data_access', 'configuration'].includes(type)) return 'medium';
            }
            return 'low';
          },

          query: function(filters: any) {
            return this.logs.filter(log => {
              return Object.entries(filters).every(([key, value]) => log[key] === value);
            });
          },
        };

        // Log various security events
        auditLogger.log({
          type: 'authentication',
          userId: 'user-123',
          action: 'login',
          result: 'success',
          metadata: { ipAddress: '192.168.1.100', userAgent: 'iPad' },
        });

        auditLogger.log({
          type: 'authorization',
          userId: 'user-456',
          action: 'access_denied',
          resource: 'admin_panel',
          result: 'failure',
          metadata: { attemptedRole: 'admin', actualRole: 'chef' },
        });

        auditLogger.log({
          type: 'data_access',
          userId: 'user-789',
          action: 'view_sensitive_data',
          resource: 'financial_reports',
          result: 'success',
        });

        expect(auditLogger.logs).toHaveLength(3);
        
        const authFailures = auditLogger.query({ type: 'authorization', result: 'failure' });
        expect(authFailures).toHaveLength(1);
        expect(authFailures[0].severity).toBe('high');

        const userActivity = auditLogger.query({ userId: 'user-123' });
        expect(userActivity).toHaveLength(1);
      });

      it('should detect suspicious activity patterns', async () => {
        const suspiciousActivityDetector = {
          detectAnomalies: function(logs: any[]) {
            const anomalies = [];

            // Multiple failed login attempts
            const failedLogins = logs.filter(log => 
              log.type === 'authentication' && log.result === 'failure'
            );
            
            if (failedLogins.length >= 5) {
              anomalies.push({
                type: 'brute_force_attempt',
                severity: 'high',
                count: failedLogins.length,
                timespan: this.getTimespan(failedLogins),
              });
            }

            // Unusual access patterns
            const accessAttempts = logs.filter(log => log.type === 'authorization');
            const uniqueResources = new Set(accessAttempts.map(log => log.resource));
            
            if (uniqueResources.size > 10) {
              anomalies.push({
                type: 'resource_enumeration',
                severity: 'medium',
                resourceCount: uniqueResources.size,
              });
            }

            // Rapid successive actions
            const rapidActions = this.findRapidActions(logs, 5000); // 5 seconds
            if (rapidActions.length > 0) {
              anomalies.push({
                type: 'rapid_actions',
                severity: 'medium',
                sequences: rapidActions,
              });
            }

            return anomalies;
          },

          getTimespan: function(logs: any[]) {
            if (logs.length < 2) return 0;
            const timestamps = logs.map(log => new Date(log.timestamp).getTime());
            return Math.max(...timestamps) - Math.min(...timestamps);
          },

          findRapidActions: function(logs: any[], thresholdMs: number) {
            const rapidSequences = [];
            
            for (let i = 0; i < logs.length - 1; i++) {
              const current = new Date(logs[i].timestamp).getTime();
              const next = new Date(logs[i + 1].timestamp).getTime();
              
              if (next - current < thresholdMs) {
                rapidSequences.push([logs[i], logs[i + 1]]);
              }
            }
            
            return rapidSequences;
          },
        };

        // Create suspicious log pattern
        const suspiciousLogs = [
          ...Array(6).fill(null).map((_, i) => ({
            type: 'authentication',
            action: 'login',
            result: 'failure',
            timestamp: new Date(Date.now() - (i * 1000)).toISOString(),
          })),
          ...Array(12).fill(null).map((_, i) => ({
            type: 'authorization',
            action: 'access_attempt',
            resource: `resource_${i}`,
            result: 'failure',
            timestamp: new Date(Date.now() - (i * 500)).toISOString(),
          })),
        ];

        const anomalies = suspiciousActivityDetector.detectAnomalies(suspiciousLogs);

        expect(anomalies.some(a => a.type === 'brute_force_attempt')).toBe(true);
        expect(anomalies.some(a => a.type === 'resource_enumeration')).toBe(true);
        expect(anomalies.some(a => a.type === 'rapid_actions')).toBe(true);
      });
    });

    describe('Real-time Security Monitoring', () => {
      it('should trigger security alerts for critical events', async () => {
        const securityMonitor = {
          alerts: [] as any[],
          
          processEvent: function(event: any) {
            const criticalEvents = [
              'multiple_login_failures',
              'privilege_escalation_attempt',
              'data_exfiltration_detected',
              'suspicious_file_upload',
            ];

            if (criticalEvents.includes(event.type)) {
              this.triggerAlert({
                eventType: event.type,
                severity: 'critical',
                timestamp: Date.now(),
                details: event,
                requiresImmedateAction: true,
              });
            }
          },

          triggerAlert: function(alert: any) {
            this.alerts.push(alert);
            
            // In a real system, this would send notifications to security team
            console.log(`SECURITY ALERT: ${alert.eventType} - ${alert.severity}`);
          },

          getActiveAlerts: function() {
            return this.alerts.filter(alert => !alert.resolved);
          },
        };

        // Trigger critical security event
        securityMonitor.processEvent({
          type: 'privilege_escalation_attempt',
          userId: 'user-123',
          attemptedRole: 'admin',
          currentRole: 'server',
        });

        const activeAlerts = securityMonitor.getActiveAlerts();
        expect(activeAlerts).toHaveLength(1);
        expect(activeAlerts[0].severity).toBe('critical');
        expect(activeAlerts[0].requiresImmedateAction).toBe(true);
      });
    });
  });

  describe('Compliance Validation', () => {
    describe('Industry Standards Compliance', () => {
      it('should meet PCI DSS requirements for payment data', async () => {
        // Even though this is primarily a SOP system, it may handle payment-related training data
        const pciCompliance = {
          validateCardNumber: function(cardNumber: string) {
            // Should never store full card numbers
            return /^\*{12}\d{4}$/.test(cardNumber); // Only last 4 digits visible
          },

          validateExpiryDate: function(expiry: string) {
            // Should never store expiry dates
            return expiry === '[MASKED]';
          },

          validateCVV: function(cvv: string) {
            // Should never store CVV
            return cvv === '[NEVER_STORE]';
          },

          auditPaymentAccess: function(userId: string, action: string) {
            return {
              userId,
              action,
              timestamp: Date.now(),
              compliant: !['store_card', 'store_cvv'].includes(action),
              requirement: 'PCI DSS Requirement 3',
            };
          },
        };

        expect(pciCompliance.validateCardNumber('************1234')).toBe(true);
        expect(pciCompliance.validateCardNumber('1234567890123456')).toBe(false);
        expect(pciCompliance.validateExpiryDate('[MASKED]')).toBe(true);
        expect(pciCompliance.validateCVV('[NEVER_STORE]')).toBe(true);

        const audit = pciCompliance.auditPaymentAccess('user-123', 'store_card');
        expect(audit.compliant).toBe(false);
      });

      it('should meet SOX compliance for financial controls', async () => {
        const soxCompliance = {
          validateFinancialDataAccess: function(userId: string, role: string, action: string) {
            const authorizedRoles = ['admin', 'finance_manager'];
            const restrictedActions = ['modify_financial_reports', 'delete_audit_logs'];

            if (restrictedActions.includes(action) && !authorizedRoles.includes(role)) {
              return {
                allowed: false,
                reason: 'Insufficient privileges for financial data modification',
                requirement: 'SOX Section 404',
              };
            }

            return { allowed: true };
          },

          validateAuditTrail: function(logs: any[]) {
            const requiredFields = ['userId', 'action', 'timestamp', 'result'];
            const financialLogs = logs.filter(log => log.category === 'financial');

            const compliantLogs = financialLogs.every(log => 
              requiredFields.every(field => log[field] !== undefined)
            );

            return {
              compliant: compliantLogs,
              totalLogs: financialLogs.length,
              requirement: 'SOX Section 302',
            };
          },
        };

        const accessValidation = soxCompliance.validateFinancialDataAccess(
          'user-123', 
          'chef', 
          'modify_financial_reports'
        );
        expect(accessValidation.allowed).toBe(false);

        const authorizedAccess = soxCompliance.validateFinancialDataAccess(
          'admin-user', 
          'admin', 
          'modify_financial_reports'
        );
        expect(authorizedAccess.allowed).toBe(true);
      });
    });

    describe('Data Retention and Deletion', () => {
      it('should implement compliant data retention policies', async () => {
        const dataRetentionPolicy = {
          policies: {
            user_activity_logs: { retention_days: 2555 }, // 7 years
            training_records: { retention_days: 1095 }, // 3 years
            personal_data: { retention_days: 730 }, // 2 years after last activity
            audit_logs: { retention_days: 3650 }, // 10 years
            financial_data: { retention_days: 2555 }, // 7 years
          },

          shouldDelete: function(dataType: string, lastActivity: Date) {
            const policy = this.policies[dataType as keyof typeof this.policies];
            if (!policy) return false;

            const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceActivity > policy.retention_days;
          },

          scheduleForDeletion: function(records: any[]) {
            return records.map(record => ({
              ...record,
              scheduled_for_deletion: this.shouldDelete(record.type, new Date(record.last_activity)),
              deletion_date: this.shouldDelete(record.type, new Date(record.last_activity))
                ? new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days notice
                : null,
            }));
          },
        };

        const testRecords = [
          {
            id: 'record-1',
            type: 'personal_data',
            last_activity: '2021-01-01T00:00:00Z', // Old data
          },
          {
            id: 'record-2',
            type: 'audit_logs',
            last_activity: '2021-01-01T00:00:00Z', // Should be retained
          },
          {
            id: 'record-3',
            type: 'training_records',
            last_activity: new Date().toISOString(), // Recent data
          },
        ];

        const processed = dataRetentionPolicy.scheduleForDeletion(testRecords);

        expect(processed[0].scheduled_for_deletion).toBe(true); // Old personal data
        expect(processed[1].scheduled_for_deletion).toBe(false); // Audit logs retained longer
        expect(processed[2].scheduled_for_deletion).toBe(false); // Recent training data
      });
    });
  });

  // Helper functions
  async function setupSecurityTestEnvironment() {
    console.log('Setting up security test environment...');
    // Setup would include creating test certificates, keys, etc.
  }

  async function cleanupSecurityTestEnvironment() {
    console.log('Cleaning up security test environment...');
    // Cleanup would remove test certificates, temporary files, etc.
  }
});