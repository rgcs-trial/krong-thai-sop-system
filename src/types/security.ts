/**
 * TypeScript type definitions for security-related schemas
 * Restaurant Krong Thai SOP System
 */

// User roles and permissions
export type UserRole = 'admin' | 'manager' | 'staff';

// Authentication types
export interface PinAuthRequest {
  email: string;
  pin: string;
  deviceFingerprint: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface PinAuthResponse {
  success: boolean;
  sessionToken?: string;
  user?: AuthenticatedUser;
  deviceId?: string;
  expiresAt?: string;
  error?: SecurityError;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  fullNameTh?: string;
  position?: string;
  positionTh?: string;
  restaurantId: string;
  lastLoginAt?: string;
  permissions: string[];
}

// Session management
export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: Session;
  user?: AuthenticatedUser;
  needsRefresh?: boolean;
  error?: SecurityError;
}

// Device binding and fingerprinting
export interface DeviceFingerprint {
  userAgent: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  canvas?: string; // Canvas fingerprint hash
  webgl?: string; // WebGL fingerprint hash
}

export interface RegisteredDevice {
  id: string;
  userId: string;
  fingerprint: string;
  name: string;
  type: 'tablet' | 'desktop' | 'mobile';
  lastUsedAt: Date;
  registeredAt: Date;
  isActive: boolean;
  location?: string;
}

// Rate limiting
export interface RateLimitState {
  key: string;
  attempts: number;
  windowStart: Date;
  isLocked: boolean;
  lockUntil?: Date;
  lastAttempt: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  isLocked: boolean;
  lockUntil?: Date;
}

// Audit logging
export interface AuditLogEntry {
  id: string;
  restaurantId: string;
  userId?: string;
  action: SecurityEvent;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: Date;
}

export interface AuditMetadata {
  deviceId?: string;
  location?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'security' | 'system';
  success: boolean;
  errorCode?: string;
  additionalInfo?: Record<string, any>;
}

// Security validation
export interface SecurityValidationRule {
  name: string;
  validate: (value: any, context?: any) => boolean;
  errorMessage: string;
  errorMessageTh?: string;
}

export interface PinValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

// Security middleware types
export interface SecurityContext {
  user?: AuthenticatedUser;
  session?: Session;
  device?: RegisteredDevice;
  permissions: string[];
  rateLimitInfo: RateLimitResult;
  auditInfo: Partial<AuditLogEntry>;
}

export interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  requiredRole?: UserRole;
  requiredPermissions?: string[];
  rateLimit?: {
    maxAttempts: number;
    windowMinutes: number;
  };
  auditLog?: boolean;
  deviceBinding?: boolean;
}

// Error types
export interface SecurityError {
  code: string;
  message: string;
  messageTh?: string;
  details?: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityViolation extends SecurityError {
  userId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  attemptedAction: string;
  riskScore: number;
}

// PIN-specific types
export interface PinHash {
  hash: string;
  salt: string;
  algorithm: string;
  rounds: number;
  createdAt: Date;
}

export interface PinChangeRequest {
  currentPin: string;
  newPin: string;
  confirmPin: string;
  deviceFingerprint: string;
}

export interface PinPolicy {
  minLength: number;
  maxLength: number;
  requireDifferentFromCurrent: boolean;
  preventReuse: number; // Number of previous PINs to prevent reuse
  expiryDays?: number;
  forceChangeOnFirstLogin: boolean;
}

// Security headers and CSP
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'X-XSS-Protection'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'Strict-Transport-Security'?: string;
}

// Restaurant-specific security types
export interface RestaurantSecuritySettings {
  shiftBasedAccess: boolean;
  shiftHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  locationValidation: boolean;
  allowedLocations?: string[];
  multiLanguageSecurity: boolean;
  defaultLanguage: 'en' | 'th';
  customSecurityRules?: SecurityValidationRule[];
}

// Encryption types
export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
  algorithm: string;
}

export interface EncryptionKey {
  key: string;
  salt: string;
  iterations: number;
  createdAt: Date;
  expiresAt?: Date;
}

// Security event types (from config)
export type SecurityEvent = 
  | 'PIN_LOGIN_SUCCESS'
  | 'PIN_LOGIN_FAILED'
  | 'PIN_CHANGED'
  | 'SESSION_CREATED'
  | 'SESSION_EXPIRED'
  | 'SESSION_TERMINATED'
  | 'DEVICE_REGISTERED'
  | 'DEVICE_UNREGISTERED'
  | 'SUSPICIOUS_DEVICE'
  | 'RATE_LIMIT_TRIGGERED'
  | 'BRUTE_FORCE_DETECTED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'PRIVILEGE_ESCALATION'
  | 'SENSITIVE_DATA_ACCESS'
  | 'DATA_EXPORT'
  | 'SECURITY_CONFIG_CHANGED';

// Utility types for security operations
export type SecurityOperation = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';

export interface Permission {
  resource: string;
  operation: SecurityOperation;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  inherits?: UserRole[];
}

// API response types with security context
export interface SecureApiResponse<T = any> {
  data?: T;
  success: boolean;
  error?: SecurityError;
  metadata: {
    requestId: string;
    timestamp: Date;
    rateLimitInfo: RateLimitResult;
    securityContext: Partial<SecurityContext>;
  };
}