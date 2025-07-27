/**
 * Secure Environment Configuration Validation
 * Restaurant Krong Thai SOP Management System
 * 
 * This module validates and sanitizes environment variables with proper
 * separation between client-safe and server-only configuration.
 */

import { z } from 'zod';

// Environment validation schemas
const ServerOnlyEnvSchema = z.object({
  // Database secrets (NEVER expose to client)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service role key is required'),
  SUPABASE_DB_URL: z.string().url().optional(),
  
  // Authentication secrets
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters for security'),
  JWT_ALGORITHM: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
  
  // Session configuration
  SESSION_DURATION_HOURS: z.coerce.number().min(1).max(24).default(8),
  SESSION_REFRESH_THRESHOLD_MINUTES: z.coerce.number().min(5).max(120).default(30),
  SESSION_COOKIE_NAME: z.string().default('krong_thai_session'),
  
  // PIN security
  PIN_HASH_ROUNDS: z.coerce.number().min(10).max(15).default(12),
  PIN_MAX_ATTEMPTS: z.coerce.number().min(3).max(10).default(5),
  PIN_LOCKOUT_DURATION_MINUTES: z.coerce.number().min(5).max(60).default(15),
  PIN_MIN_STRENGTH: z.enum(['weak', 'medium', 'strong']).default('medium'),
  
  // Device security
  DEVICE_FINGERPRINT_REQUIRED: z.coerce.boolean().default(true),
  DEVICE_TRUST_DURATION_DAYS: z.coerce.number().min(1).max(90).default(30),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().default(5),
  API_RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().default(60),
  API_RATE_LIMIT_BURST_SIZE: z.coerce.number().default(10),
  
  // Security headers
  CSP_REPORT_URI: z.string().default('/api/security/csp-report'),
  CSP_REPORT_ONLY: z.coerce.boolean().default(false),
  
  // CORS configuration
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  CORS_ALLOWED_METHODS: z.string().default('GET,POST,PUT,DELETE,OPTIONS'),
  CORS_ALLOW_CREDENTIALS: z.coerce.boolean().default(true),
  
  // Encryption
  DATA_ENCRYPTION_KEY: z.string().optional(),
  COOKIE_SECRET: z.string().optional(),
  
  // Audit and compliance
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().default(90),
  AUDIT_LOG_SENSITIVE_DATA: z.coerce.boolean().default(false),
  AUDIT_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  GDPR_ENABLED: z.coerce.boolean().default(true),
  DATA_RETENTION_DAYS: z.coerce.number().default(365),
  ANONYMIZE_LOGS: z.coerce.boolean().default(true),
  
  // File upload security
  MAX_FILE_SIZE_MB: z.coerce.number().default(50),
  ALLOWED_FILE_TYPES: z.string().default('pdf,doc,docx,jpg,jpeg,png,webp'),
  VIRUS_SCANNING_ENABLED: z.coerce.boolean().default(false),
  
  // External services
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  
  // Development overrides
  SECURITY_DISABLE_RATE_LIMITING: z.coerce.boolean().default(false),
  SECURITY_DISABLE_CSRF: z.coerce.boolean().default(false),
  SECURITY_ALLOW_HTTP: z.coerce.boolean().default(true),
  SECURITY_DISABLE_DEVICE_BINDING: z.coerce.boolean().default(false),
  DEBUG_AUTH_TOKENS: z.coerce.boolean().default(false),
  DEBUG_DATABASE_QUERIES: z.coerce.boolean().default(false),
  DEBUG_SECURITY_HEADERS: z.coerce.boolean().default(false),
  
  // Backup
  BACKUP_ENABLED: z.coerce.boolean().default(true),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'),
  BACKUP_RETENTION_DAYS: z.coerce.number().default(30),
});

const ClientSafeEnvSchema = z.object({
  // Core application (CLIENT-SAFE)
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Krong Thai SOP System'),
  
  // Supabase public configuration (CLIENT-SAFE)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Localization (CLIENT-SAFE)
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['en', 'th']).default('en'),
  NEXT_PUBLIC_SUPPORTED_LOCALES: z.string().default('en,th'),
  NEXT_PUBLIC_DEFAULT_TIMEZONE: z.string().default('Asia/Bangkok'),
  
  // Analytics (CLIENT-SAFE)
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  
  // Development features (CLIENT-SAFE)
  NEXT_PUBLIC_DEV_MODE: z.coerce.boolean().default(false),
});

// Environment variable validation and parsing
export class EnvConfig {
  private static instance: EnvConfig;
  private serverConfig: z.infer<typeof ServerOnlyEnvSchema>;
  private clientConfig: z.infer<typeof ClientSafeEnvSchema>;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.validateAndParseEnvironment();
  }

  public static getInstance(): EnvConfig {
    if (!EnvConfig.instance) {
      EnvConfig.instance = new EnvConfig();
    }
    return EnvConfig.instance;
  }

  private validateAndParseEnvironment(): void {
    try {
      // Validate server-only configuration
      this.serverConfig = ServerOnlyEnvSchema.parse(process.env);
      
      // Validate client-safe configuration
      this.clientConfig = ClientSafeEnvSchema.parse(process.env);
      
      // Additional production-specific validations
      if (this.isProduction) {
        this.validateProductionRequirements();
      }
      
      // Log successful validation (non-sensitive info only)
      console.log(`✅ Environment configuration validated for ${process.env.NODE_ENV}`);
      
    } catch (error) {
      console.error('❌ Environment configuration validation failed:', error);
      throw new Error('Invalid environment configuration. Check your .env files.');
    }
  }

  private validateProductionRequirements(): void {
    const productionRequirements = [
      {
        check: () => this.serverConfig.JWT_SECRET.length >= 32,
        message: 'JWT_SECRET must be at least 32 characters in production'
      },
      {
        check: () => !this.serverConfig.SECURITY_DISABLE_RATE_LIMITING,
        message: 'Rate limiting cannot be disabled in production'
      },
      {
        check: () => !this.serverConfig.SECURITY_DISABLE_CSRF,
        message: 'CSRF protection cannot be disabled in production'
      },
      {
        check: () => !this.serverConfig.SECURITY_ALLOW_HTTP,
        message: 'HTTP must be disabled in production (HTTPS only)'
      },
      {
        check: () => this.serverConfig.PIN_HASH_ROUNDS >= 12,
        message: 'PIN_HASH_ROUNDS must be at least 12 in production'
      },
    ];

    const failures = productionRequirements.filter(req => !req.check());
    
    if (failures.length > 0) {
      const messages = failures.map(f => f.message).join('\n');
      throw new Error(`Production security requirements not met:\n${messages}`);
    }
  }

  // Getters for server-only configuration (only available on server)
  public get server() {
    if (typeof window !== 'undefined') {
      throw new Error('Server configuration accessed on client side - security violation');
    }
    return this.serverConfig;
  }

  // Getters for client-safe configuration (available everywhere)
  public get client() {
    return this.clientConfig;
  }

  // Utility methods for common security checks
  public isSecureEnvironment(): boolean {
    return this.isProduction || 
           (!this.serverConfig.SECURITY_DISABLE_RATE_LIMITING && 
            !this.serverConfig.SECURITY_DISABLE_CSRF);
  }

  public isRateLimitingEnabled(): boolean {
    return !this.serverConfig.SECURITY_DISABLE_RATE_LIMITING;
  }

  public isCSRFProtectionEnabled(): boolean {
    return !this.serverConfig.SECURITY_DISABLE_CSRF;
  }

  public getMaxFileSize(): number {
    return this.serverConfig.MAX_FILE_SIZE_MB * 1024 * 1024; // Convert to bytes
  }

  public getAllowedFileTypes(): string[] {
    return this.serverConfig.ALLOWED_FILE_TYPES.split(',').map(type => type.trim());
  }

  public getCORSOrigins(): string[] {
    return this.serverConfig.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  }

  public getSessionCookieConfig() {
    return {
      name: this.serverConfig.SESSION_COOKIE_NAME,
      maxAge: this.serverConfig.SESSION_DURATION_HOURS * 60 * 60 * 1000, // milliseconds
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  // Security validation utilities
  public validateSecretStrength(secret: string, minLength: number = 32): boolean {
    if (secret.length < minLength) return false;
    
    // Check for complexity
    const hasUpperCase = /[A-Z]/.test(secret);
    const hasLowerCase = /[a-z]/.test(secret);
    const hasNumbers = /\d/.test(secret);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(secret);
    
    return [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length >= 3;
  }

  // Environment info for debugging (non-sensitive)
  public getEnvironmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV,
      isProduction: this.isProduction,
      hasSupabaseConfig: Boolean(this.clientConfig.NEXT_PUBLIC_SUPABASE_URL),
      hasJWTSecret: Boolean(this.serverConfig.JWT_SECRET),
      rateLimitingEnabled: this.isRateLimitingEnabled(),
      csrfEnabled: this.isCSRFProtectionEnabled(),
      deviceBindingEnabled: this.serverConfig.DEVICE_FINGERPRINT_REQUIRED,
      auditingEnabled: this.serverConfig.AUDIT_LOG_RETENTION_DAYS > 0,
    };
  }
}

// Singleton instance
export const envConfig = EnvConfig.getInstance();

// Type exports for type safety
export type ServerOnlyConfig = z.infer<typeof ServerOnlyEnvSchema>;
export type ClientSafeConfig = z.infer<typeof ClientSafeEnvSchema>;

// Helper functions for common use cases
export function getSupabaseConfig() {
  const config = envConfig.client;
  return {
    url: config.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseAdminConfig() {
  const config = envConfig.server;
  const clientConfig = envConfig.client;
  return {
    url: clientConfig.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getJWTConfig() {
  const config = envConfig.server;
  return {
    secret: config.JWT_SECRET,
    algorithm: config.JWT_ALGORITHM,
    expiresIn: `${config.SESSION_DURATION_HOURS}h`,
  };
}