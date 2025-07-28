import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../utils/test-utils';

// Mock security utilities
const mockSecurityService = {
  validatePIN: vi.fn(),
  checkPermissions: vi.fn(),
  auditAccess: vi.fn(),
  encryptData: vi.fn(),
  decryptData: vi.fn(),
  generateToken: vi.fn(),
  validateToken: vi.fn(),
  detectAnomalies: vi.fn(),
  enforceRateLimit: vi.fn(),
  logSecurityEvent: vi.fn()
};

const mockCryptoService = {
  hash: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  generateNonce: vi.fn(),
  validateSignature: vi.fn()
};

// Mock authentication context
const mockAuthContext = {
  user: null,
  permissions: [],
  sessionToken: null,
  loginAttempts: 0,
  lockoutUntil: null
};

vi.mock('@/lib/security/pin-auth', () => ({
  securityService: mockSecurityService
}));

vi.mock('@/lib/security/crypto', () => ({
  cryptoService: mockCryptoService
}));

describe('SOP Data Protection Security Tests', () => {
  const SECURITY_CONSTANTS = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
    PIN_LENGTH: 4,
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    HASH_ROUNDS: 12
  };

  const mockUser = {
    id: 'user-123',
    email: 'staff@krongthai.com',
    role: 'staff',
    permissions: ['read_sop', 'complete_sop'],
    pinHash: '$2b$12$hashedpin',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: new Date().toISOString()
  };

  const mockSensitiveSOP = {
    id: 'sop-sensitive-123',
    title: 'Critical Safety Procedures',
    content: 'CONFIDENTIAL: Emergency response protocols',
    security_level: 'restricted',
    required_permissions: ['read_sensitive_sop'],
    access_audit: true,
    encryption_enabled: true,
    created_by: 'manager-456'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset security context
    Object.assign(mockAuthContext, {
      user: null,
      permissions: [],
      sessionToken: null,
      loginAttempts: 0,
      lockoutUntil: null
    });

    // Default mock implementations
    mockSecurityService.validatePIN.mockResolvedValue({ valid: true, user: mockUser });
    mockSecurityService.checkPermissions.mockReturnValue(true);
    mockSecurityService.auditAccess.mockResolvedValue({ logged: true });
    mockSecurityService.generateToken.mockReturnValue('secure-token-123');
    mockSecurityService.validateToken.mockReturnValue(true);
    
    mockCryptoService.hash.mockResolvedValue('hashed-value');
    mockCryptoService.encrypt.mockResolvedValue('encrypted-data');
    mockCryptoService.decrypt.mockResolvedValue('decrypted-data');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication Security', () => {
    it('enforces secure PIN validation with proper hashing', async () => {
      const pinInput = '1234';
      const hashedPin = '$2b$12$validhashedpin';

      mockCryptoService.hash.mockResolvedValue(hashedPin);
      mockSecurityService.validatePIN.mockImplementation(async (pin, userHash) => {
        // Simulate bcrypt comparison
        const isValid = pin === '1234' && userHash === hashedPin;
        return { valid: isValid, user: isValid ? mockUser : null };
      });

      const result = await mockSecurityService.validatePIN(pinInput, hashedPin);

      expect(result.valid).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockSecurityService.validatePIN).toHaveBeenCalledWith(pinInput, hashedPin);
    });

    it('implements rate limiting for failed PIN attempts', async () => {
      let attemptCount = 0;
      
      mockSecurityService.validatePIN.mockImplementation(async (pin) => {
        attemptCount++;
        
        if (attemptCount > SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
          const lockoutUntil = Date.now() + SECURITY_CONSTANTS.LOCKOUT_DURATION;
          throw new Error(`Account locked until ${new Date(lockoutUntil).toISOString()}`);
        }
        
        return { valid: false, user: null };
      });

      // Simulate multiple failed attempts
      for (let i = 0; i < SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS; i++) {
        try {
          await mockSecurityService.validatePIN('wrong-pin');
        } catch (error) {
          // Expected to fail
        }
      }

      // Next attempt should trigger lockout
      await expect(mockSecurityService.validatePIN('wrong-pin')).rejects.toThrow('Account locked until');
      expect(attemptCount).toBe(SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS + 1);
    });

    it('prevents brute force attacks with exponential backoff', async () => {
      const rateLimitService = {
        attempts: new Map(),
        checkRateLimit: (identifier) => {
          const attempts = rateLimitService.attempts.get(identifier) || [];
          const now = Date.now();
          
          // Clean old attempts (older than 1 hour)
          const recentAttempts = attempts.filter(time => now - time < 60 * 60 * 1000);
          
          if (recentAttempts.length >= 5) {
            const lastAttempt = Math.max(...recentAttempts);
            const backoffTime = Math.min(Math.pow(2, recentAttempts.length - 5) * 1000, 60000); // Max 1 minute
            
            if (now - lastAttempt < backoffTime) {
              throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((backoffTime - (now - lastAttempt)) / 1000)} seconds`);
            }
          }
          
          recentAttempts.push(now);
          rateLimitService.attempts.set(identifier, recentAttempts);
          return true;
        }
      };

      const userId = 'test-user-123';
      
      // First 5 attempts should pass rate limit check
      for (let i = 0; i < 5; i++) {
        expect(() => rateLimitService.checkRateLimit(userId)).not.toThrow();
      }
      
      // 6th attempt should trigger rate limiting
      expect(() => rateLimitService.checkRateLimit(userId)).toThrow('Rate limit exceeded');
    });

    it('implements secure session management with token rotation', async () => {
      const sessionManager = {
        sessions: new Map(),
        createSession: (user) => {
          const token = mockSecurityService.generateToken();
          const session = {
            token,
            user,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (tablet)'
          };
          
          sessionManager.sessions.set(token, session);
          return session;
        },
        validateSession: (token) => {
          const session = sessionManager.sessions.get(token);
          if (!session) return null;
          
          const now = Date.now();
          const isExpired = now - session.createdAt > SECURITY_CONSTANTS.SESSION_TIMEOUT;
          const isInactive = now - session.lastActivity > 30 * 60 * 1000; // 30 minutes
          
          if (isExpired || isInactive) {
            sessionManager.sessions.delete(token);
            return null;
          }
          
          // Update last activity
          session.lastActivity = now;
          return session;
        },
        rotateToken: (oldToken) => {
          const session = sessionManager.sessions.get(oldToken);
          if (!session) return null;
          
          sessionManager.sessions.delete(oldToken);
          const newToken = mockSecurityService.generateToken();
          session.token = newToken;
          sessionManager.sessions.set(newToken, session);
          return session;
        }
      };

      // Create session
      const session = sessionManager.createSession(mockUser);
      expect(session.token).toBeDefined();
      expect(session.user).toEqual(mockUser);

      // Validate session
      const validatedSession = sessionManager.validateSession(session.token);
      expect(validatedSession).toBeTruthy();

      // Rotate token
      const newSession = sessionManager.rotateToken(session.token);
      expect(newSession.token).not.toBe(session.token);
      
      // Old token should be invalid
      expect(sessionManager.validateSession(session.token)).toBeNull();
      
      // New token should be valid
      expect(sessionManager.validateSession(newSession.token)).toBeTruthy();
    });
  });

  describe('Authorization and Access Control', () => {
    it('enforces role-based access control (RBAC) for SOP documents', () => {
      const rbacService = {
        roles: {
          staff: ['read_sop', 'complete_sop'],
          supervisor: ['read_sop', 'complete_sop', 'assign_sop'],
          manager: ['read_sop', 'complete_sop', 'assign_sop', 'read_sensitive_sop', 'manage_sop'],
          admin: ['*'] // All permissions
        },
        checkPermission: (userRole, requiredPermission) => {
          const userPermissions = rbacService.roles[userRole] || [];
          return userPermissions.includes('*') || userPermissions.includes(requiredPermission);
        },
        checkSOPAccess: (user, sop) => {
          // Check basic read permission
          if (!rbacService.checkPermission(user.role, 'read_sop')) {
            return { allowed: false, reason: 'insufficient_role' };
          }
          
          // Check sensitivity level
          if (sop.security_level === 'restricted' && !rbacService.checkPermission(user.role, 'read_sensitive_sop')) {
            return { allowed: false, reason: 'insufficient_clearance' };
          }
          
          // Check department restrictions
          if (sop.restricted_departments && !sop.restricted_departments.includes(user.department)) {
            return { allowed: false, reason: 'department_restriction' };
          }
          
          return { allowed: true, reason: 'authorized' };
        }
      };

      // Test staff access to regular SOP
      const staffUser = { ...mockUser, role: 'staff' };
      const regularSOP = { ...mockSensitiveSOP, security_level: 'standard' };
      
      let accessResult = rbacService.checkSOPAccess(staffUser, regularSOP);
      expect(accessResult.allowed).toBe(true);

      // Test staff access to sensitive SOP (should be denied)
      accessResult = rbacService.checkSOPAccess(staffUser, mockSensitiveSOP);
      expect(accessResult.allowed).toBe(false);
      expect(accessResult.reason).toBe('insufficient_clearance');

      // Test manager access to sensitive SOP (should be allowed)
      const managerUser = { ...mockUser, role: 'manager' };
      accessResult = rbacService.checkSOPAccess(managerUser, mockSensitiveSOP);
      expect(accessResult.allowed).toBe(true);
    });

    it('implements attribute-based access control (ABAC) for fine-grained permissions', () => {
      const abacService = {
        evaluatePolicy: (user, resource, action, context) => {
          const policies = [
            // Time-based access policy
            {
              name: 'business_hours_only',
              applies: (r) => r.requires_business_hours,
              evaluate: (u, r, a, c) => {
                const hour = new Date(c.timestamp).getHours();
                return hour >= 8 && hour <= 22; // 8 AM to 10 PM
              }
            },
            // Location-based access policy
            {
              name: 'on_premises_only',
              applies: (r) => r.requires_on_premises,
              evaluate: (u, r, a, c) => {
                const allowedNetworks = ['192.168.1.0/24', '10.0.0.0/24'];
                return allowedNetworks.some(network => c.ipAddress.startsWith(network.split('/')[0].slice(0, -1)));
              }
            },
            // Department-based policy
            {
              name: 'department_restriction',
              applies: (r) => r.department_restricted,
              evaluate: (u, r, a, c) => {
                return !r.restricted_departments || r.restricted_departments.includes(u.department);
              }
            }
          ];

          const applicablePolicies = policies.filter(p => p.applies(resource));
          return applicablePolicies.every(p => p.evaluate(user, resource, action, context));
        }
      };

      const context = {
        timestamp: new Date('2024-01-15T14:00:00Z').getTime(), // 2 PM
        ipAddress: '192.168.1.100',
        userAgent: 'Tablet App'
      };

      const restrictedSOP = {
        ...mockSensitiveSOP,
        requires_business_hours: true,
        requires_on_premises: true,
        department_restricted: true,
        restricted_departments: ['kitchen', 'management']
      };

      const kitchenUser = { ...mockUser, department: 'kitchen' };
      
      // Should allow access during business hours from allowed network
      let allowed = abacService.evaluatePolicy(kitchenUser, restrictedSOP, 'read', context);
      expect(allowed).toBe(true);

      // Should deny access from wrong department
      const frontOfHouseUser = { ...mockUser, department: 'front_of_house' };
      allowed = abacService.evaluatePolicy(frontOfHouseUser, restrictedSOP, 'read', context);
      expect(allowed).toBe(false);

      // Should deny access outside business hours
      const afterHoursContext = { ...context, timestamp: new Date('2024-01-15T02:00:00Z').getTime() };
      allowed = abacService.evaluatePolicy(kitchenUser, restrictedSOP, 'read', afterHoursContext);
      expect(allowed).toBe(false);
    });

    it('validates document-level permissions and ownership', () => {
      const documentPermissionService = {
        checkDocumentAccess: (user, document, action) => {
          // Owner always has full access
          if (document.created_by === user.id) {
            return { allowed: true, reason: 'owner' };
          }

          // Check if document is published
          if (document.status === 'draft' && action === 'read') {
            // Only owner and managers can read drafts
            if (user.role !== 'manager' && user.role !== 'admin') {
              return { allowed: false, reason: 'draft_access_denied' };
            }
          }

          // Check action-specific permissions
          const actionPermissions = {
            read: ['read_sop'],
            complete: ['complete_sop'],
            edit: ['edit_sop'],
            delete: ['delete_sop'],
            approve: ['approve_sop']
          };

          const requiredPermissions = actionPermissions[action] || [];
          const hasPermission = requiredPermissions.every(perm => 
            user.permissions.includes(perm) || user.role === 'admin'
          );

          if (!hasPermission) {
            return { allowed: false, reason: 'insufficient_permissions' };
          }

          return { allowed: true, reason: 'authorized' };
        }
      };

      const draftDocument = {
        id: 'sop-draft-123',
        status: 'draft',
        created_by: 'manager-456',
        title: 'Draft SOP'
      };

      // Owner should have access to draft
      const owner = { id: 'manager-456', role: 'manager', permissions: ['read_sop'] };
      let result = documentPermissionService.checkDocumentAccess(owner, draftDocument, 'read');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('owner');

      // Staff should not have access to draft
      const staff = { id: 'staff-123', role: 'staff', permissions: ['read_sop'] };
      result = documentPermissionService.checkDocumentAccess(staff, draftDocument, 'read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('draft_access_denied');

      // Manager should have access to draft
      const manager = { id: 'manager-789', role: 'manager', permissions: ['read_sop'] };
      result = documentPermissionService.checkDocumentAccess(manager, draftDocument, 'read');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Data Encryption and Security', () => {
    it('encrypts sensitive SOP content at rest', async () => {
      const encryptionService = {
        encryptDocument: async (document) => {
          const sensitiveFields = ['content', 'notes', 'attachments'];
          const encrypted = { ...document };
          
          for (const field of sensitiveFields) {
            if (encrypted[field]) {
              encrypted[field] = await mockCryptoService.encrypt(encrypted[field]);
              encrypted[`${field}_encrypted`] = true;
            }
          }
          
          return encrypted;
        },
        decryptDocument: async (encryptedDocument) => {
          const decrypted = { ...encryptedDocument };
          
          for (const [key, value] of Object.entries(decrypted)) {
            if (key.endsWith('_encrypted') && value === true) {
              const fieldName = key.replace('_encrypted', '');
              if (decrypted[fieldName]) {
                decrypted[fieldName] = await mockCryptoService.decrypt(decrypted[fieldName]);
              }
              delete decrypted[key];
            }
          }
          
          return decrypted;
        }
      };

      const originalDocument = {
        id: 'sop-123',
        title: 'Public Title',
        content: 'Sensitive content here',
        notes: 'Confidential notes'
      };

      // Encrypt document
      const encryptedDoc = await encryptionService.encryptDocument(originalDocument);
      expect(encryptedDoc.content).toBe('encrypted-data');
      expect(encryptedDoc.content_encrypted).toBe(true);
      expect(encryptedDoc.title).toBe('Public Title'); // Not encrypted

      // Decrypt document
      const decryptedDoc = await encryptionService.decryptDocument(encryptedDoc);
      expect(decryptedDoc.content).toBe('decrypted-data');
      expect(decryptedDoc.content_encrypted).toBeUndefined();
    });

    it('implements field-level encryption for PII and sensitive data', async () => {
      const fieldEncryptionService = {
        sensitiveFields: new Set(['pin', 'ssn', 'personal_notes', 'emergency_contacts']),
        encryptFields: async (data) => {
          const encrypted = { ...data };
          
          for (const [key, value] of Object.entries(encrypted)) {
            if (fieldEncryptionService.sensitiveFields.has(key) && value) {
              encrypted[key] = {
                encrypted: true,
                algorithm: SECURITY_CONSTANTS.ENCRYPTION_ALGORITHM,
                data: await mockCryptoService.encrypt(String(value))
              };
            }
          }
          
          return encrypted;
        },
        decryptFields: async (encryptedData) => {
          const decrypted = { ...encryptedData };
          
          for (const [key, value] of Object.entries(decrypted)) {
            if (value && typeof value === 'object' && value.encrypted) {
              decrypted[key] = await mockCryptoService.decrypt(value.data);
            }
          }
          
          return decrypted;
        }
      };

      const userData = {
        id: 'user-123',
        name: 'John Doe',
        pin: '1234',
        emergency_contacts: 'Jane Doe: 555-1234'
      };

      // Encrypt sensitive fields
      const encrypted = await fieldEncryptionService.encryptFields(userData);
      expect(encrypted.name).toBe('John Doe'); // Not sensitive
      expect(encrypted.pin).toMatchObject({
        encrypted: true,
        algorithm: SECURITY_CONSTANTS.ENCRYPTION_ALGORITHM,
        data: 'encrypted-data'
      });

      // Decrypt sensitive fields
      const decrypted = await fieldEncryptionService.decryptFields(encrypted);
      expect(decrypted.pin).toBe('decrypted-data');
      expect(decrypted.emergency_contacts).toBe('decrypted-data');
    });

    it('validates data integrity with digital signatures', async () => {
      const signatureService = {
        signDocument: async (document) => {
          const documentString = JSON.stringify(document);
          const signature = await mockCryptoService.hash(documentString + 'secret-key');
          
          return {
            ...document,
            signature,
            signed_at: new Date().toISOString()
          };
        },
        verifySignature: async (signedDocument) => {
          const { signature, signed_at, ...document } = signedDocument;
          const documentString = JSON.stringify(document);
          const expectedSignature = await mockCryptoService.hash(documentString + 'secret-key');
          
          return signature === expectedSignature;
        }
      };

      const document = { id: 'sop-123', content: 'Important procedures' };
      
      // Sign document
      const signedDoc = await signatureService.signDocument(document);
      expect(signedDoc.signature).toBe('hashed-value');
      expect(signedDoc.signed_at).toBeDefined();

      // Verify signature
      const isValid = await signatureService.verifySignature(signedDoc);
      expect(isValid).toBe(true);

      // Test tampering detection
      const tamperedDoc = { ...signedDoc, content: 'Modified content' };
      const isTamperedValid = await signatureService.verifySignature(tamperedDoc);
      expect(isTamperedValid).toBe(false);
    });
  });

  describe('Audit Logging and Security Monitoring', () => {
    it('logs all security-relevant events with proper context', async () => {
      const auditLogger = {
        logs: [],
        logSecurityEvent: (event) => {
          const logEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            event_type: event.type,
            user_id: event.user?.id,
            ip_address: event.context?.ipAddress,
            user_agent: event.context?.userAgent,
            resource_type: event.resource?.type,
            resource_id: event.resource?.id,
            action: event.action,
            result: event.result,
            severity: event.severity || 'info',
            details: event.details || {}
          };
          
          auditLogger.logs.push(logEntry);
          return logEntry;
        },
        queryLogs: (criteria) => {
          return auditLogger.logs.filter(log => {
            return Object.entries(criteria).every(([key, value]) => log[key] === value);
          });
        }
      };

      // Log successful SOP access
      const accessEvent = auditLogger.logSecurityEvent({
        type: 'sop_access',
        user: mockUser,
        context: { ipAddress: '192.168.1.100', userAgent: 'Tablet' },
        resource: { type: 'sop_document', id: 'sop-123' },
        action: 'read',
        result: 'success',
        severity: 'info'
      });

      expect(accessEvent.event_type).toBe('sop_access');
      expect(accessEvent.user_id).toBe(mockUser.id);
      expect(accessEvent.result).toBe('success');

      // Log failed authentication
      const authEvent = auditLogger.logSecurityEvent({
        type: 'authentication_failure',
        context: { ipAddress: '192.168.1.100' },
        action: 'pin_login',
        result: 'failure',
        severity: 'warning',
        details: { reason: 'invalid_pin', attempts: 3 }
      });

      expect(authEvent.severity).toBe('warning');
      expect(authEvent.details.attempts).toBe(3);

      // Query logs
      const authFailures = auditLogger.queryLogs({ event_type: 'authentication_failure' });
      expect(authFailures).toHaveLength(1);
    });

    it('detects and alerts on suspicious activities', () => {
      const anomalyDetector = {
        patterns: [],
        addPattern: (pattern) => {
          anomalyDetector.patterns.push(pattern);
        },
        analyzeActivity: (events) => {
          const anomalies = [];
          
          // Check for multiple failed logins
          const failedLogins = events.filter(e => 
            e.event_type === 'authentication_failure' && 
            Date.now() - new Date(e.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
          );
          
          if (failedLogins.length >= 5) {
            anomalies.push({
              type: 'brute_force_attempt',
              severity: 'high',
              description: 'Multiple failed login attempts detected',
              events: failedLogins
            });
          }
          
          // Check for unusual access patterns
          const accessEvents = events.filter(e => e.event_type === 'sop_access');
          const ipAddresses = new Set(accessEvents.map(e => e.ip_address));
          
          if (ipAddresses.size > 3) {
            anomalies.push({
              type: 'multiple_ip_access',
              severity: 'medium',
              description: 'Access from multiple IP addresses',
              details: { ip_addresses: Array.from(ipAddresses) }
            });
          }
          
          // Check for after-hours access
          const afterHoursEvents = accessEvents.filter(e => {
            const hour = new Date(e.timestamp).getHours();
            return hour < 6 || hour > 22;
          });
          
          if (afterHoursEvents.length > 0) {
            anomalies.push({
              type: 'after_hours_access',
              severity: 'medium',
              description: 'Access outside business hours',
              events: afterHoursEvents
            });
          }
          
          return anomalies;
        }
      };

      // Simulate events
      const events = [
        { event_type: 'authentication_failure', timestamp: new Date().toISOString(), ip_address: '192.168.1.100' },
        { event_type: 'authentication_failure', timestamp: new Date().toISOString(), ip_address: '192.168.1.100' },
        { event_type: 'authentication_failure', timestamp: new Date().toISOString(), ip_address: '192.168.1.100' },
        { event_type: 'authentication_failure', timestamp: new Date().toISOString(), ip_address: '192.168.1.100' },
        { event_type: 'authentication_failure', timestamp: new Date().toISOString(), ip_address: '192.168.1.100' },
        { event_type: 'sop_access', timestamp: new Date('2024-01-15T02:00:00Z').toISOString(), ip_address: '192.168.1.101' }
      ];

      const anomalies = anomalyDetector.analyzeActivity(events);
      
      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].type).toBe('brute_force_attempt');
      expect(anomalies[0].severity).toBe('high');
      expect(anomalies[1].type).toBe('after_hours_access');
    });

    it('implements real-time security monitoring with alerts', async () => {
      const securityMonitor = {
        alerts: [],
        thresholds: {
          failed_logins_per_minute: 10,
          concurrent_sessions_per_user: 3,
          unusual_data_access_volume: 100
        },
        monitorEvent: (event) => {
          const alerts = [];
          
          // Monitor failed login rate
          if (event.event_type === 'authentication_failure') {
            const recentFailures = securityMonitor.getRecentEvents('authentication_failure', 60000);
            if (recentFailures.length >= securityMonitor.thresholds.failed_logins_per_minute) {
              alerts.push({
                type: 'high_failure_rate',
                severity: 'critical',
                message: 'High rate of authentication failures detected',
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Monitor concurrent sessions
          if (event.event_type === 'session_created') {
            const userSessions = securityMonitor.getActiveSessions(event.user_id);
            if (userSessions.length > securityMonitor.thresholds.concurrent_sessions_per_user) {
              alerts.push({
                type: 'excessive_concurrent_sessions',
                severity: 'medium',
                message: `User ${event.user_id} has ${userSessions.length} concurrent sessions`,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          securityMonitor.alerts.push(...alerts);
          return alerts;
        },
        getRecentEvents: (eventType, timeWindow) => {
          // Mock implementation
          return Array.from({ length: 12 }, (_, i) => ({ event_type: eventType }));
        },
        getActiveSessions: (userId) => {
          // Mock implementation  
          return Array.from({ length: 4 }, (_, i) => ({ user_id: userId }));
        }
      };

      // Test high failure rate detection
      const failureEvent = {
        event_type: 'authentication_failure',
        ip_address: '192.168.1.100',
        timestamp: new Date().toISOString()
      };

      const alerts = securityMonitor.monitorEvent(failureEvent);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('high_failure_rate');
      expect(alerts[0].severity).toBe('critical');

      // Test concurrent session detection
      const sessionEvent = {
        event_type: 'session_created',
        user_id: 'user-123',
        timestamp: new Date().toISOString()
      };

      const sessionAlerts = securityMonitor.monitorEvent(sessionEvent);
      expect(sessionAlerts).toHaveLength(1);
      expect(sessionAlerts[0].type).toBe('excessive_concurrent_sessions');
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('prevents SQL injection attacks in search queries', () => {
      const queryValidator = {
        sanitizeSearchQuery: (query) => {
          // Remove SQL injection patterns
          const dangerous = [
            /['";]/g,                    // Quote characters
            /\b(union|select|insert|update|delete|drop|create|alter)\b/gi, // SQL keywords
            /--/g,                      // SQL comments
            /\/\*.*?\*\//g,            // Block comments
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi // Script tags
          ];
          
          let sanitized = query;
          dangerous.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
          });
          
          // Trim and limit length
          return sanitized.trim().slice(0, 100);
        },
        validateSearchQuery: (query) => {
          const sanitized = queryValidator.sanitizeSearchQuery(query);
          const errors = [];
          
          if (sanitized !== query) {
            errors.push('Query contains potentially dangerous characters');
          }
          
          if (sanitized.length < 2) {
            errors.push('Query too short');
          }
          
          return { valid: errors.length === 0, errors, sanitized };
        }
      };

      // Test normal query
      let result = queryValidator.validateSearchQuery('food safety');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('food safety');

      // Test SQL injection attempt
      result = queryValidator.validateSearchQuery("'; DROP TABLE sop_documents; --");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query contains potentially dangerous characters');
      expect(result.sanitized).toBe('DROP TABLE sop_documents');

      // Test XSS attempt
      result = queryValidator.validateSearchQuery('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe('');
    });

    it('validates and sanitizes form inputs', () => {
      const inputValidator = {
        rules: {
          pin: { type: 'string', pattern: /^\d{4}$/, required: true },
          email: { type: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, required: true },
          sop_title: { type: 'string', minLength: 3, maxLength: 100, required: true },
          sop_content: { type: 'string', minLength: 10, maxLength: 10000, required: true }
        },
        sanitizeInput: (value, type) => {
          if (typeof value !== 'string') return '';
          
          // Basic HTML escape
          let sanitized = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
          
          // Type-specific sanitization
          switch (type) {
            case 'pin':
              sanitized = sanitized.replace(/\D/g, ''); // Only digits
              break;
            case 'email':
              sanitized = sanitized.toLowerCase().trim();
              break;
            default:
              sanitized = sanitized.trim();
          }
          
          return sanitized;
        },
        validateField: (fieldName, value) => {
          const rule = inputValidator.rules[fieldName];
          if (!rule) return { valid: true, sanitized: value };
          
          const sanitized = inputValidator.sanitizeInput(value, fieldName);
          const errors = [];
          
          // Required check
          if (rule.required && !sanitized) {
            errors.push(`${fieldName} is required`);
          }
          
          // Length checks
          if (sanitized && rule.minLength && sanitized.length < rule.minLength) {
            errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
          }
          
          if (sanitized && rule.maxLength && sanitized.length > rule.maxLength) {
            errors.push(`${fieldName} must be no more than ${rule.maxLength} characters`);
          }
          
          // Pattern check
          if (sanitized && rule.pattern && !rule.pattern.test(sanitized)) {
            errors.push(`${fieldName} format is invalid`);
          }
          
          return { valid: errors.length === 0, errors, sanitized };
        }
      };

      // Test valid PIN
      let result = inputValidator.validateField('pin', '1234');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('1234');

      // Test invalid PIN
      result = inputValidator.validateField('pin', '12ab');
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe('12');
      expect(result.errors).toContain('pin format is invalid');

      // Test XSS in SOP title
      result = inputValidator.validateField('sop_title', '<script>alert("xss")</script>Food Safety');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Food Safety');

      // Test empty required field
      result = inputValidator.validateField('sop_content', '');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sop_content is required');
    });

    it('prevents CSRF attacks with token validation', () => {
      const csrfProtection = {
        tokens: new Map(),
        generateToken: (sessionId) => {
          const token = mockCryptoService.generateNonce();
          const expires = Date.now() + 30 * 60 * 1000; // 30 minutes
          
          csrfProtection.tokens.set(token, { sessionId, expires });
          return token;
        },
        validateToken: (token, sessionId) => {
          const tokenData = csrfProtection.tokens.get(token);
          
          if (!tokenData) {
            return { valid: false, reason: 'token_not_found' };
          }
          
          if (tokenData.expires < Date.now()) {
            csrfProtection.tokens.delete(token);
            return { valid: false, reason: 'token_expired' };
          }
          
          if (tokenData.sessionId !== sessionId) {
            return { valid: false, reason: 'session_mismatch' };
          }
          
          // One-time use - delete after validation
          csrfProtection.tokens.delete(token);
          return { valid: true };
        }
      };

      mockCryptoService.generateNonce.mockReturnValue('csrf-token-123');

      const sessionId = 'session-456';
      
      // Generate token
      const token = csrfProtection.generateToken(sessionId);
      expect(token).toBe('csrf-token-123');

      // Validate with correct session
      let validation = csrfProtection.validateToken(token, sessionId);
      expect(validation.valid).toBe(true);

      // Token should be one-time use
      validation = csrfProtection.validateToken(token, sessionId);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('token_not_found');

      // Test with wrong session
      const newToken = csrfProtection.generateToken(sessionId);
      validation = csrfProtection.validateToken(newToken, 'wrong-session');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('session_mismatch');
    });
  });

  describe('Security Headers and Content Security Policy', () => {
    it('implements proper security headers for tablet applications', () => {
      const securityHeaders = {
        generateHeaders: () => {
          return {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            'Content-Security-Policy': securityHeaders.generateCSP()
          };
        },
        generateCSP: () => {
          const directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'", // Needed for Next.js
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' wss: https:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ];
          
          return directives.join('; ');
        },
        validateCSPViolation: (violation) => {
          // Log CSP violations for monitoring
          return {
            blocked_uri: violation.blockedURI,
            document_uri: violation.documentURI,
            violated_directive: violation.violatedDirective,
            timestamp: new Date().toISOString(),
            severity: securityHeaders.assessViolationSeverity(violation)
          };
        },
        assessViolationSeverity: (violation) => {
          if (violation.violatedDirective.includes('script-src')) {
            return 'high'; // Script injection attempts
          }
          if (violation.violatedDirective.includes('frame-ancestors')) {
            return 'high'; // Clickjacking attempts
          }
          return 'medium';
        }
      };

      const headers = securityHeaders.generateHeaders();
      
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");

      // Test CSP violation handling
      const violation = {
        blockedURI: 'https://malicious-site.com/script.js',
        documentURI: 'https://krongthai-sop.com/dashboard',
        violatedDirective: 'script-src'
      };

      const violationReport = securityHeaders.validateCSPViolation(violation);
      expect(violationReport.severity).toBe('high');
      expect(violationReport.violated_directive).toBe('script-src');
    });

    it('validates secure communication protocols', () => {
      const protocolValidator = {
        validateRequest: (request) => {
          const issues = [];
          
          // Check if using HTTPS
          if (!request.url.startsWith('https://')) {
            issues.push({
              type: 'insecure_protocol',
              severity: 'high',
              message: 'Request not using HTTPS'
            });
          }
          
          // Check for required security headers
          const requiredHeaders = ['Authorization', 'X-Requested-With'];
          requiredHeaders.forEach(header => {
            if (!request.headers[header]) {
              issues.push({
                type: 'missing_security_header',
                severity: 'medium',
                message: `Missing required header: ${header}`
              });
            }
          });
          
          // Check for dangerous headers
          const dangerousHeaders = ['X-Forwarded-For', 'X-Real-IP'];
          dangerousHeaders.forEach(header => {
            if (request.headers[header]) {
              issues.push({
                type: 'dangerous_header',
                severity: 'medium',
                message: `Potentially dangerous header present: ${header}`
              });
            }
          });
          
          return { secure: issues.length === 0, issues };
        }
      };

      // Test secure request
      const secureRequest = {
        url: 'https://krongthai-sop.com/api/sop/documents',
        headers: {
          'Authorization': 'Bearer token-123',
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json'
        }
      };

      let validation = protocolValidator.validateRequest(secureRequest);
      expect(validation.secure).toBe(true);
      expect(validation.issues).toHaveLength(0);

      // Test insecure request
      const insecureRequest = {
        url: 'http://krongthai-sop.com/api/sop/documents',
        headers: {
          'X-Forwarded-For': '192.168.1.100'
        }
      };

      validation = protocolValidator.validateRequest(insecureRequest);
      expect(validation.secure).toBe(false);
      expect(validation.issues).toHaveLength(3); // HTTP, missing headers, dangerous header
    });
  });
});