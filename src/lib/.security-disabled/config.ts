/**
 * Security Configuration for Restaurant Krong Thai SOP Management System
 * Centralized configuration for PIN authentication, session management, and security policies
 */

export const SECURITY_CONFIG = {
  // PIN Authentication Configuration
  PIN: {
    LENGTH: 4,
    HASH_ROUNDS: 12,
    VALIDATION_TIMEOUT: 30000, // 30 seconds
    ALLOWED_PATTERNS: {
      // Prevent common weak patterns
      FORBIDDEN_SEQUENCES: ['1234', '4321', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '0000'],
      ALLOW_CONSECUTIVE: false,
      ALLOW_REPEATED: false,
    },
  },

  // Session Management Configuration
  SESSION: {
    DURATION: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
    REFRESH_THRESHOLD: 30 * 60 * 1000, // 30 minutes before expiry
    IDLE_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours idle timeout
    CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour cleanup interval
    TOKEN_ALGORITHM: 'HS256',
    COOKIE_NAME: 'krong_thai_session',
    COOKIE_OPTIONS: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    },
  },

  // Rate Limiting Configuration
  RATE_LIMIT: {
    PIN_ATTEMPTS: {
      MAX_ATTEMPTS: 5,
      WINDOW_MINUTES: 15,
      LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
      PROGRESSIVE_DELAY: true,
    },
    API_REQUESTS: {
      MAX_REQUESTS: 100,
      WINDOW_MINUTES: 1,
      BURST_LIMIT: 20,
    },
    FORM_SUBMISSIONS: {
      MAX_SUBMISSIONS: 10,
      WINDOW_MINUTES: 5,
    },
  },

  // Device Binding Configuration
  DEVICE: {
    MAX_DEVICES_PER_USER: 3,
    DEVICE_EXPIRY_DAYS: 30,
    FINGERPRINT_ALGORITHM: 'sha256',
    TRUST_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Audit Logging Configuration
  AUDIT: {
    LOG_RETENTION_DAYS: 90,
    SENSITIVE_FIELDS: ['pin', 'password', 'pin_hash', 'session_token'],
    BATCH_SIZE: 100,
    FLUSH_INTERVAL: 30 * 1000, // 30 seconds
    LOG_LEVELS: {
      LOW: 'info',
      MEDIUM: 'warn',
      HIGH: 'error',
      CRITICAL: 'fatal',
    },
  },

  // Security Headers Configuration
  SECURITY_HEADERS: {
    CONTENT_SECURITY_POLICY: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'blob:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'child-src': ["'self'"],
      'worker-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
    },
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    PERMISSIONS_POLICY: {
      camera: [],
      microphone: [],
      geolocation: [],
      'display-capture': [],
    },
  },

  // Encryption Configuration
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
    PBKDF2_ITERATIONS: 100000,
  },

  // Restaurant-specific Configuration
  RESTAURANT: {
    TIMEZONE: 'Asia/Bangkok',
    SHIFT_DURATION: 8 * 60 * 60 * 1000, // 8 hours
    OPERATING_HOURS: {
      OPEN: '06:00',
      CLOSE: '23:00',
    },
    MAX_CONCURRENT_SESSIONS: 50,
    TABLET_SCREEN_LOCK_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  },

  // Development/Testing Configuration
  DEVELOPMENT: {
    BYPASS_RATE_LIMITING: process.env.NODE_ENV === 'development',
    ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
    MOCK_AUTHENTICATION: false,
    REDUCED_SECURITY: process.env.NODE_ENV === 'development',
  },
} as const;

/**
 * Environment-specific security configuration
 */
export const getSecurityConfig = () => {
  const baseConfig = SECURITY_CONFIG;
  
  // Apply environment-specific overrides
  if (process.env.NODE_ENV === 'production') {
    return {
      ...baseConfig,
      SESSION: {
        ...baseConfig.SESSION,
        COOKIE_OPTIONS: {
          ...baseConfig.SESSION.COOKIE_OPTIONS,
          secure: true,
        },
      },
      DEVELOPMENT: {
        ...baseConfig.DEVELOPMENT,
        BYPASS_RATE_LIMITING: false,
        ENABLE_DEBUG_LOGS: false,
        REDUCED_SECURITY: false,
      },
    };
  }

  return baseConfig;
};

/**
 * Security configuration validation
 */
export const validateSecurityConfig = (): boolean => {
  const config = getSecurityConfig();
  
  // Validate PIN configuration
  if (config.PIN.LENGTH < 4 || config.PIN.LENGTH > 8) {
    console.error('Invalid PIN length configuration');
    return false;
  }

  if (config.PIN.HASH_ROUNDS < 10 || config.PIN.HASH_ROUNDS > 15) {
    console.error('Invalid PIN hash rounds configuration');
    return false;
  }

  // Validate session configuration
  if (config.SESSION.DURATION < 60 * 60 * 1000) { // Minimum 1 hour
    console.error('Session duration too short');
    return false;
  }

  // Validate rate limiting
  if (config.RATE_LIMIT.PIN_ATTEMPTS.MAX_ATTEMPTS < 3) {
    console.error('PIN attempts limit too restrictive');
    return false;
  }

  return true;
};

/**
 * Security configuration types
 */
export type SecurityConfig = typeof SECURITY_CONFIG;
export type PinConfig = typeof SECURITY_CONFIG.PIN;
export type SessionConfig = typeof SECURITY_CONFIG.SESSION;
export type RateLimitConfig = typeof SECURITY_CONFIG.RATE_LIMIT;
export type DeviceConfig = typeof SECURITY_CONFIG.DEVICE;
export type AuditConfig = typeof SECURITY_CONFIG.AUDIT;