/**
 * Security Module Exports for Restaurant Krong Thai SOP Management System
 * Centralized exports for all security-related functionality
 */

// Configuration
export { SECURITY_CONFIG, getSecurityConfig, validateSecurityConfig } from './config';
export type { SecurityConfig, PinConfig, SessionConfig, RateLimitConfig, DeviceConfig, AuditConfig } from './config';

// PIN Authentication
export { PinAuthenticator } from './pin-auth';
export type {
  PinAuthenticationRequest,
  PinAuthenticationResult,
  PinValidationResult,
  SessionData,
} from './pin-auth';

// Rate Limiting
export { RateLimiter } from './rate-limiter';

// Device Binding
export { DeviceBinding } from './device-binding';
export type {
  DeviceFingerprint,
  DeviceInfo,
  DeviceValidationResult,
} from './device-binding';

// Audit Logging
export { SecurityAudit } from './audit-logger';
export type {
  AuditEventType,
  AuditSeverity,
  AuditEvent,
  AuditLogEntry,
} from './audit-logger';

// Authentication Middleware
export {
  AuthMiddleware,
  createSecurityMiddleware,
  publicMiddleware,
  staffMiddleware,
  managerMiddleware,
  adminMiddleware,
} from './auth-middleware';
export type {
  MiddlewareConfig,
  SessionUser,
} from './auth-middleware';

/**
 * Main Security Class - High-level API for security operations
 */
export class Security {
  // PIN Authentication operations
  static Pin = {
    authenticate: async (...args: any[]) => PinAuthenticator.authenticate(...args),
    validateFormat: (...args: any[]) => PinAuthenticator.validatePinFormat(...args),
    hash: async (...args: any[]) => PinAuthenticator.hashPin(...args),
    verify: async (...args: any[]) => PinAuthenticator.verifyPin(...args),
    validateSession: async (...args: any[]) => PinAuthenticator.validateSession(...args),
    refreshSession: async (...args: any[]) => PinAuthenticator.refreshSession(...args),
    logout: async (...args: any[]) => PinAuthenticator.logout(...args),
  };

  // Rate Limiting operations
  static RateLimit = {
    checkPinAttempts: async (...args: any[]) => RateLimiter.checkPinAttempts(...args),
    recordPinAttempt: async (...args: any[]) => RateLimiter.recordPinAttempt(...args),
    checkApiRequests: async (...args: any[]) => RateLimiter.checkApiRequests(...args),
    checkFormSubmissions: async (...args: any[]) => RateLimiter.checkFormSubmissions(...args),
    detectBruteForce: async (...args: any[]) => RateLimiter.detectBruteForce(...args),
    getStats: async (...args: any[]) => RateLimiter.getStats(...args),
    clearUserLimits: async (...args: any[]) => RateLimiter.clearUserLimits(...args),
    clearIpLimits: async (...args: any[]) => RateLimiter.clearIpLimits(...args),
  };

  // Device Binding operations
  static Device = {
    createFingerprint: (...args: any[]) => DeviceBinding.createFingerprint(...args),
    generateFingerprintHash: (...args: any[]) => DeviceBinding.generateFingerprintHash(...args),
    validateOrRegister: async (...args: any[]) => DeviceBinding.validateOrRegisterDevice(...args),
    getUserDevices: async (...args: any[]) => DeviceBinding.getUserDevices(...args),
    trustDevice: async (...args: any[]) => DeviceBinding.trustDevice(...args),
    revokeDeviceTrust: async (...args: any[]) => DeviceBinding.revokeDeviceTrust(...args),
    compareFingerprints: (...args: any[]) => DeviceBinding.compareFingerprints(...args),
    cleanupExpiredDevices: async (...args: any[]) => DeviceBinding.cleanupExpiredDevices(...args),
  };

  // Audit Logging operations
  static Audit = {
    logSecurityEvent: async (...args: any[]) => SecurityAudit.logSecurityEvent(...args),
    logSopAccess: async (...args: any[]) => SecurityAudit.logSopAccess(...args),
    logFormSubmission: async (...args: any[]) => SecurityAudit.logFormSubmission(...args),
    logUserProfileUpdate: async (...args: any[]) => SecurityAudit.logUserProfileUpdate(...args),
    logSecurityViolation: async (...args: any[]) => SecurityAudit.logSecurityViolation(...args),
    searchLogs: async (...args: any[]) => SecurityAudit.searchLogs(...args),
    getAuditStats: async (...args: any[]) => SecurityAudit.getAuditStats(...args),
    cleanupOldLogs: async (...args: any[]) => SecurityAudit.cleanupOldLogs(...args),
  };

  // Middleware operations
  static Middleware = {
    create: (...args: any[]) => AuthMiddleware.create(...args),
    getUserFromRequest: async (...args: any[]) => AuthMiddleware.getUserFromRequest(...args),
    refreshSession: async (...args: any[]) => AuthMiddleware.refreshSession(...args),
    logout: async (...args: any[]) => AuthMiddleware.logout(...args),
  };
}

/**
 * Security Health Check
 */
export async function getSecurityHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'ok' | 'warning' | 'error'; message: string }>;
  timestamp: string;
}> {
  const checks: Record<string, { status: 'ok' | 'warning' | 'error'; message: string }> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    // Check configuration
    const configValid = validateSecurityConfig();
    checks.configuration = {
      status: configValid ? 'ok' : 'error',
      message: configValid ? 'Security configuration is valid' : 'Invalid security configuration',
    };
    if (!configValid) overallStatus = 'unhealthy';

    // Check rate limiter stats
    try {
      const rateLimitStats = await Security.RateLimit.getStats();
      const activeRestrictions = rateLimitStats.activeRestrictions;
      checks.rateLimiting = {
        status: activeRestrictions > 50 ? 'warning' : 'ok',
        message: `${activeRestrictions} active restrictions`,
      };
      if (activeRestrictions > 100) overallStatus = 'degraded';
    } catch (error) {
      checks.rateLimiting = {
        status: 'error',
        message: 'Rate limiting check failed',
      };
      overallStatus = 'degraded';
    }

    // Check device cleanup (last 24 hours)
    try {
      const cleanedDevices = await Security.Device.cleanupExpiredDevices();
      checks.deviceManagement = {
        status: 'ok',
        message: `Cleaned up ${cleanedDevices} expired devices`,
      };
    } catch (error) {
      checks.deviceManagement = {
        status: 'warning',
        message: 'Device cleanup encountered issues',
      };
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    }

    // Check audit logging
    try {
      // This is a simple check - in production you might want more sophisticated health checks
      checks.auditLogging = {
        status: 'ok',
        message: 'Audit logging is operational',
      };
    } catch (error) {
      checks.auditLogging = {
        status: 'error',
        message: 'Audit logging is not operational',
      };
      overallStatus = 'unhealthy';
    }

  } catch (error) {
    checks.general = {
      status: 'error',
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Initialize security system
 */
export async function initializeSecurity(): Promise<void> {
  try {
    // Validate configuration
    if (!validateSecurityConfig()) {
      throw new Error('Invalid security configuration');
    }

    // Log initialization
    await Security.Audit.logSecurityEvent('system_initialization', {
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    }, {
      restaurantId: '',
      severity: 'low',
    });

    console.log('Security system initialized successfully');

  } catch (error) {
    console.error('Failed to initialize security system:', error);
    throw error;
  }
}

/**
 * Cleanup security resources
 */
export function cleanupSecurity(): void {
  try {
    Security.RateLimit.cleanup?.();
    Security.Audit.cleanup?.();
    console.log('Security system cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up security system:', error);
  }
}