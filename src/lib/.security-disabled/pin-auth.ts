/**
 * PIN Authentication System for Restaurant Krong Thai SOP Management System
 * Handles 4-digit PIN authentication with security features optimized for tablet use
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { SECURITY_CONFIG } from './config';
import { SecurityAudit } from './audit-logger';
import { RateLimiter } from './rate-limiter';
import { DeviceBinding } from './device-binding';
import type { Database } from '@/types/database';

// Types
export interface PinAuthenticationRequest {
  email: string;
  pin: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
}

export interface PinAuthenticationResult {
  success: boolean;
  sessionToken?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    fullName: string;
    fullNameTh: string;
    restaurantId: string;
  };
  expiresAt?: Date;
  error?: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

export interface PinValidationResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
}

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  restaurantId: string;
  deviceId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}

/**
 * PIN Authentication Class
 */
export class PinAuthenticator {
  private static supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Authenticate user with PIN
   */
  static async authenticate(request: PinAuthenticationRequest): Promise<PinAuthenticationResult> {
    try {
      // Check rate limiting first
      const rateLimitCheck = await RateLimiter.checkPinAttempts(request.email, request.ipAddress);
      if (!rateLimitCheck.allowed) {
        await SecurityAudit.logSecurityEvent('pin_rate_limit_exceeded', {
          email: request.email,
          ipAddress: request.ipAddress,
          attemptsRemaining: rateLimitCheck.attemptsRemaining,
          retryAfter: rateLimitCheck.retryAfter,
        });

        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again later.',
            retryAfter: rateLimitCheck.retryAfter,
          },
        };
      }

      // Validate PIN format
      const pinValidation = this.validatePinFormat(request.pin);
      if (!pinValidation.isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_PIN_FORMAT',
            message: 'PIN must be exactly 4 digits.',
          },
        };
      }

      // Authenticate with database
      const { data: authResult, error: dbError } = await this.supabase
        .rpc('validate_pin', {
          user_email: request.email,
          pin_input: request.pin,
        })
        .single();

      if (dbError || !authResult) {
        await SecurityAudit.logSecurityEvent('pin_auth_failure', {
          email: request.email,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          reason: 'database_error',
        });

        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid email or PIN.',
          },
        };
      }

      if (!authResult.is_valid) {
        // Record failed attempt
        await RateLimiter.recordPinAttempt(request.email, request.ipAddress, false);
        
        await SecurityAudit.logSecurityEvent('pin_auth_failure', {
          userId: authResult.user_id,
          email: request.email,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          reason: 'invalid_pin',
        });

        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or PIN.',
          },
        };
      }

      // Check and register device
      const deviceResult = await DeviceBinding.validateOrRegisterDevice(
        authResult.user_id,
        request.deviceFingerprint,
        request.userAgent,
        request.ipAddress
      );

      if (!deviceResult.success) {
        await SecurityAudit.logSecurityEvent('device_registration_failed', {
          userId: authResult.user_id,
          email: request.email,
          deviceFingerprint: request.deviceFingerprint,
          reason: deviceResult.error,
        });

        return {
          success: false,
          error: {
            code: 'DEVICE_NOT_AUTHORIZED',
            message: 'Device not authorized. Please contact your supervisor.',
          },
        };
      }

      // Record successful attempt
      await RateLimiter.recordPinAttempt(request.email, request.ipAddress, true);

      // Create session
      const sessionResult = await this.createSession({
        userId: authResult.user_id,
        email: request.email,
        role: authResult.role,
        restaurantId: authResult.restaurant_id,
        deviceId: deviceResult.deviceId!,
      });

      if (!sessionResult.success) {
        return {
          success: false,
          error: {
            code: 'SESSION_CREATION_FAILED',
            message: 'Failed to create session. Please try again.',
          },
        };
      }

      // Update last login timestamp
      await this.supabase
        .from('auth_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authResult.user_id);

      // Log successful authentication
      await SecurityAudit.logSecurityEvent('pin_auth_success', {
        userId: authResult.user_id,
        email: request.email,
        role: authResult.role,
        restaurantId: authResult.restaurant_id,
        deviceId: deviceResult.deviceId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });

      return {
        success: true,
        sessionToken: sessionResult.sessionToken!,
        user: {
          id: authResult.user_id,
          email: request.email,
          role: authResult.role,
          fullName: authResult.full_name,
          fullNameTh: authResult.full_name_th,
          restaurantId: authResult.restaurant_id,
        },
        expiresAt: sessionResult.expiresAt!,
      };

    } catch (error) {
      console.error('PIN authentication error:', error);
      
      await SecurityAudit.logSecurityEvent('pin_auth_error', {
        email: request.email,
        ipAddress: request.ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication service temporarily unavailable.',
        },
      };
    }
  }

  /**
   * Validate PIN format and strength
   */
  static validatePinFormat(pin: string): PinValidationResult {
    const issues: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'medium';

    // Check length
    if (pin.length !== SECURITY_CONFIG.PIN.LENGTH) {
      issues.push(`PIN must be exactly ${SECURITY_CONFIG.PIN.LENGTH} digits`);
      return { isValid: false, strength: 'weak', issues };
    }

    // Check if all digits
    if (!/^\d+$/.test(pin)) {
      issues.push('PIN must contain only digits');
      return { isValid: false, strength: 'weak', issues };
    }

    // Check forbidden patterns
    if (SECURITY_CONFIG.PIN.ALLOWED_PATTERNS.FORBIDDEN_SEQUENCES.includes(pin)) {
      issues.push('PIN cannot be a common sequence');
      strength = 'weak';
    }

    // Check for repeated digits
    if (!SECURITY_CONFIG.PIN.ALLOWED_PATTERNS.ALLOW_REPEATED && /^(\d)\1+$/.test(pin)) {
      issues.push('PIN cannot be all the same digit');
      strength = 'weak';
    }

    // Check for consecutive digits
    if (!SECURITY_CONFIG.PIN.ALLOWED_PATTERNS.ALLOW_CONSECUTIVE) {
      const isAscending = pin.split('').every((digit, i) => 
        i === 0 || parseInt(digit) === parseInt(pin[i - 1]) + 1
      );
      const isDescending = pin.split('').every((digit, i) => 
        i === 0 || parseInt(digit) === parseInt(pin[i - 1]) - 1
      );
      
      if (isAscending || isDescending) {
        issues.push('PIN cannot be consecutive digits');
        strength = 'weak';
      }
    }

    // Calculate strength based on digit variety
    const uniqueDigits = new Set(pin.split('')).size;
    if (uniqueDigits === 4) {
      strength = 'strong';
    } else if (uniqueDigits >= 3) {
      strength = 'medium';
    } else {
      strength = 'weak';
    }

    return {
      isValid: issues.length === 0 || strength !== 'weak',
      strength,
      issues,
    };
  }

  /**
   * Hash PIN for storage
   */
  static async hashPin(pin: string): Promise<string> {
    const validation = this.validatePinFormat(pin);
    if (!validation.isValid) {
      throw new Error(`Invalid PIN: ${validation.issues.join(', ')}`);
    }

    return bcrypt.hash(pin, SECURITY_CONFIG.PIN.HASH_ROUNDS);
  }

  /**
   * Verify PIN against hash
   */
  static async verifyPin(pin: string, hash: string): Promise<boolean> {
    return bcrypt.compare(pin, hash);
  }

  /**
   * Create user session
   */
  private static async createSession(userData: {
    userId: string;
    email: string;
    role: string;
    restaurantId: string;
    deviceId: string;
  }): Promise<{ success: boolean; sessionToken?: string; expiresAt?: Date }> {
    try {
      const sessionId = crypto.randomUUID();
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + SECURITY_CONFIG.SESSION.DURATION);

      // Store session in database (you might want to create a sessions table)
      // For now, we'll create a JWT token
      const sessionData: SessionData = {
        userId: userData.userId,
        email: userData.email,
        role: userData.role,
        restaurantId: userData.restaurantId,
        deviceId: userData.deviceId,
        createdAt,
        expiresAt,
        lastActivity: createdAt,
      };

      // Create session token (you might want to use a proper JWT library)
      const sessionToken = Buffer.from(JSON.stringify({
        sessionId,
        ...sessionData,
      })).toString('base64');

      return {
        success: true,
        sessionToken,
        expiresAt,
      };

    } catch (error) {
      console.error('Session creation error:', error);
      return { success: false };
    }
  }

  /**
   * Validate session token
   */
  static async validateSession(sessionToken: string): Promise<{
    valid: boolean;
    sessionData?: SessionData;
    error?: string;
  }> {
    try {
      // Decode session token
      const decoded = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
      const sessionData: SessionData = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        restaurantId: decoded.restaurantId,
        deviceId: decoded.deviceId,
        createdAt: new Date(decoded.createdAt),
        expiresAt: new Date(decoded.expiresAt),
        lastActivity: new Date(decoded.lastActivity),
      };

      // Check expiration
      if (sessionData.expiresAt < new Date()) {
        return { valid: false, error: 'Session expired' };
      }

      // Check idle timeout
      const idleTimeout = new Date(sessionData.lastActivity.getTime() + SECURITY_CONFIG.SESSION.IDLE_TIMEOUT);
      if (idleTimeout < new Date()) {
        return { valid: false, error: 'Session timed out due to inactivity' };
      }

      // Verify user still exists and is active
      const { data: user } = await this.supabase
        .from('auth_users')
        .select('id, is_active')
        .eq('id', sessionData.userId)
        .single();

      if (!user || !user.is_active) {
        return { valid: false, error: 'User not found or inactive' };
      }

      return { valid: true, sessionData };

    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, error: 'Invalid session token' };
    }
  }

  /**
   * Refresh session activity
   */
  static async refreshSession(sessionToken: string): Promise<string | null> {
    const validation = await this.validateSession(sessionToken);
    if (!validation.valid || !validation.sessionData) {
      return null;
    }

    // Update last activity
    const updatedSessionData = {
      ...validation.sessionData,
      lastActivity: new Date(),
    };

    // Create new token with updated activity
    const newSessionToken = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
    return newSessionToken;
  }

  /**
   * Logout and invalidate session
   */
  static async logout(sessionToken: string): Promise<boolean> {
    try {
      const validation = await this.validateSession(sessionToken);
      if (validation.valid && validation.sessionData) {
        await SecurityAudit.logSecurityEvent('user_logout', {
          userId: validation.sessionData.userId,
          email: validation.sessionData.email,
          deviceId: validation.sessionData.deviceId,
        });
      }

      // In a real implementation, you would invalidate the session in your session store
      return true;

    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
}