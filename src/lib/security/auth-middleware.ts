/**
 * Authentication Middleware for Restaurant Krong Thai SOP Management System
 * Handles session validation, route protection, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { PinAuthenticator } from './pin-auth';
import { RateLimiter } from './rate-limiter';
import { SecurityAudit } from './audit-logger';
import { SECURITY_CONFIG } from './config';

// Types
export interface MiddlewareConfig {
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'manager' | 'staff';
  rateLimit?: {
    maxAttempts: number;
    windowMinutes: number;
  };
  auditLog?: boolean;
  publicPaths?: string[];
  authPaths?: string[];
}

export interface SessionUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  fullName: string;
  fullNameTh: string;
  restaurantId: string;
  deviceId: string;
}

/**
 * Authentication Middleware Class
 */
export class AuthMiddleware {
  /**
   * Create security middleware with configuration
   */
  static create(config: MiddlewareConfig = {}) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const response = NextResponse.next();
      
      try {
        // Add security headers
        this.addSecurityHeaders(response);

        // Get request metadata
        const requestMetadata = this.getRequestMetadata(request);
        
        // Check if path requires authentication
        if (!this.requiresAuth(request.nextUrl.pathname, config)) {
          return response;
        }

        // Apply rate limiting if configured
        if (config.rateLimit) {
          const rateLimitResult = await this.checkRateLimit(request, config.rateLimit);
          if (!rateLimitResult.allowed) {
            return this.createRateLimitResponse(rateLimitResult);
          }
        }

        // Validate session
        const sessionResult = await this.validateSession(request);
        if (!sessionResult.valid) {
          return this.createUnauthorizedResponse(request, sessionResult.error);
        }

        // Check role permissions
        if (config.requiredRole && !this.hasRequiredRole(sessionResult.user!, config.requiredRole)) {
          await SecurityAudit.logSecurityEvent('unauthorized_access_attempt', {
            userId: sessionResult.user!.id,
            requiredRole: config.requiredRole,
            userRole: sessionResult.user!.role,
            path: request.nextUrl.pathname,
          }, {
            restaurantId: sessionResult.user!.restaurantId,
            userId: sessionResult.user!.id,
            ipAddress: requestMetadata.ipAddress,
            userAgent: requestMetadata.userAgent,
            severity: 'high',
          });

          return this.createForbiddenResponse();
        }

        // Add user info to response headers for client-side access
        response.headers.set('x-user-id', sessionResult.user!.id);
        response.headers.set('x-user-role', sessionResult.user!.role);
        response.headers.set('x-restaurant-id', sessionResult.user!.restaurantId);

        // Audit log if enabled
        if (config.auditLog) {
          await SecurityAudit.logSecurityEvent('api_request', {
            path: request.nextUrl.pathname,
            method: request.method,
          }, {
            restaurantId: sessionResult.user!.restaurantId,
            userId: sessionResult.user!.id,
            ipAddress: requestMetadata.ipAddress,
            userAgent: requestMetadata.userAgent,
            severity: 'low',
          });
        }

        return response;

      } catch (error) {
        console.error('Middleware error:', error);
        
        // Log security error
        const requestMetadata = this.getRequestMetadata(request);
        await SecurityAudit.logSecurityEvent('middleware_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: request.nextUrl.pathname,
        }, {
          restaurantId: '',
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
          severity: 'high',
        });

        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  }

  /**
   * Check if path requires authentication
   */
  private static requiresAuth(pathname: string, config: MiddlewareConfig): boolean {
    // Use path without locale if available
    const pathToCheck = pathname;
    
    // Public paths don't require auth
    const publicPaths = config.publicPaths || ['/login', '/api/auth/login', '/api/health'];
    if (publicPaths.some(path => pathToCheck.startsWith(path) || pathToCheck === path)) {
      return false;
    }

    // Auth paths require authentication
    const authPaths = config.authPaths || ['/dashboard', '/sops', '/api'];
    return authPaths.some(path => pathToCheck.startsWith(path) || pathToCheck === path);
  }

  /**
   * Validate session from request
   */
  private static async validateSession(request: NextRequest): Promise<{
    valid: boolean;
    user?: SessionUser;
    error?: string;
  }> {
    try {
      // Get session token from cookie or header
      const sessionToken = request.cookies.get(SECURITY_CONFIG.SESSION.COOKIE_NAME)?.value ||
                           request.headers.get('authorization')?.replace('Bearer ', '');

      if (!sessionToken) {
        return { valid: false, error: 'No session token' };
      }

      // Validate session with PinAuthenticator
      const sessionValidation = await PinAuthenticator.validateSession(sessionToken);
      if (!sessionValidation.valid || !sessionValidation.sessionData) {
        return { valid: false, error: sessionValidation.error || 'Invalid session' };
      }

      // Create user object
      const user: SessionUser = {
        id: sessionValidation.sessionData.userId,
        email: sessionValidation.sessionData.email,
        role: sessionValidation.sessionData.role as 'admin' | 'manager' | 'staff',
        fullName: '', // You might want to fetch this from the session data
        fullNameTh: '', // You might want to fetch this from the session data
        restaurantId: sessionValidation.sessionData.restaurantId,
        deviceId: sessionValidation.sessionData.deviceId,
      };

      return { valid: true, user };

    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, error: 'Session validation failed' };
    }
  }

  /**
   * Check if user has required role
   */
  private static hasRequiredRole(user: SessionUser, requiredRole: string): boolean {
    const roleHierarchy = {
      'staff': 1,
      'manager': 2,
      'admin': 3,
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Check rate limits
   */
  private static async checkRateLimit(
    request: NextRequest,
    config: { maxAttempts: number; windowMinutes: number }
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const requestMetadata = this.getRequestMetadata(request);
    const endpoint = request.nextUrl.pathname;

    const rateLimitResult = await RateLimiter.checkApiRequests(
      requestMetadata.ipAddress,
      endpoint
    );

    return {
      allowed: rateLimitResult.allowed,
      retryAfter: rateLimitResult.retryAfter,
    };
  }

  /**
   * Get request metadata
   */
  private static getRequestMetadata(request: NextRequest) {
    const ipAddress = request.ip || 
                     request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     '127.0.0.1';

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    return { ipAddress, userAgent };
  }

  /**
   * Add security headers to response
   */
  private static addSecurityHeaders(response: NextResponse): void {
    const config = SECURITY_CONFIG.SECURITY_HEADERS;

    // Content Security Policy
    const csp = Object.entries(config.CONTENT_SECURITY_POLICY)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
    response.headers.set('Content-Security-Policy', csp);

    // Other security headers
    response.headers.set('X-Frame-Options', config.X_FRAME_OPTIONS);
    response.headers.set('X-Content-Type-Options', config.X_CONTENT_TYPE_OPTIONS);
    response.headers.set('X-XSS-Protection', config.X_XSS_PROTECTION);
    response.headers.set('Referrer-Policy', config.REFERRER_POLICY);

    // Permissions Policy
    const permissionsPolicy = Object.entries(config.PERMISSIONS_POLICY)
      .map(([directive, allowlist]) => `${directive}=(${allowlist.join(' ')})`)
      .join(', ');
    response.headers.set('Permissions-Policy', permissionsPolicy);

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  /**
   * Create rate limit response
   */
  private static createRateLimitResponse(rateLimitResult: { retryAfter?: number }): NextResponse {
    const response = NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 }
    );

    if (rateLimitResult.retryAfter) {
      response.headers.set('Retry-After', rateLimitResult.retryAfter.toString());
    }

    return response;
  }

  /**
   * Create unauthorized response
   */
  private static createUnauthorizedResponse(request: NextRequest, error?: string): NextResponse {
    // For API routes, return JSON
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error },
        { status: 401 }
      );
    }

    // For page routes, redirect to login with locale support
    // Try to extract locale from referrer or use default
    const referrer = request.headers.get('referer');
    let locale = 'en'; // default
    
    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        const pathSegments = referrerUrl.pathname.split('/').filter(Boolean);
        const firstSegment = pathSegments[0];
        if (firstSegment && ['en', 'th'].includes(firstSegment)) {
          locale = firstSegment;
        }
      } catch {
        // Use default locale if referrer parsing fails
      }
    }
    
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  /**
   * Create forbidden response
   */
  private static createForbiddenResponse(): NextResponse {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  /**
   * Extract user from request (for use in API routes)
   */
  static async getUserFromRequest(request: NextRequest): Promise<SessionUser | null> {
    const sessionResult = await this.validateSession(request);
    return sessionResult.valid ? sessionResult.user! : null;
  }

  /**
   * Refresh session middleware
   */
  static refreshSession() {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        const sessionToken = request.cookies.get(SECURITY_CONFIG.SESSION.COOKIE_NAME)?.value;
        
        if (!sessionToken) {
          return NextResponse.json({ error: 'No session token' }, { status: 401 });
        }

        const newToken = await PinAuthenticator.refreshSession(sessionToken);
        
        if (!newToken) {
          return NextResponse.json({ error: 'Session refresh failed' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });
        
        // Set new session cookie
        response.cookies.set(SECURITY_CONFIG.SESSION.COOKIE_NAME, newToken, {
          ...SECURITY_CONFIG.SESSION.COOKIE_OPTIONS,
          expires: new Date(Date.now() + SECURITY_CONFIG.SESSION.DURATION),
        });

        return response;

      } catch (error) {
        console.error('Session refresh error:', error);
        return NextResponse.json({ error: 'Session refresh failed' }, { status: 500 });
      }
    };
  }

  /**
   * Logout middleware
   */
  static logout() {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        const sessionToken = request.cookies.get(SECURITY_CONFIG.SESSION.COOKIE_NAME)?.value;
        
        if (sessionToken) {
          await PinAuthenticator.logout(sessionToken);
        }

        const response = NextResponse.json({ success: true });
        
        // Clear session cookie
        response.cookies.set(SECURITY_CONFIG.SESSION.COOKIE_NAME, '', {
          ...SECURITY_CONFIG.SESSION.COOKIE_OPTIONS,
          expires: new Date(0),
        });

        return response;

      } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
      }
    };
  }
}

/**
 * Create middleware with default configuration for different route types
 */
export const createSecurityMiddleware = (config?: MiddlewareConfig) => {
  const defaultConfig: MiddlewareConfig = {
    requireAuth: true,
    auditLog: true,
    publicPaths: ['/login', '/api/auth/login', '/api/health'],
    authPaths: ['/dashboard', '/sops', '/api'],
    ...config,
  };

  return AuthMiddleware.create(defaultConfig);
};

/**
 * Pre-configured middleware for common use cases
 */
export const publicMiddleware = AuthMiddleware.create({
  requireAuth: false,
  auditLog: false,
});

export const staffMiddleware = AuthMiddleware.create({
  requireAuth: true,
  requiredRole: 'staff',
  auditLog: true,
});

export const managerMiddleware = AuthMiddleware.create({
  requireAuth: true,
  requiredRole: 'manager',
  auditLog: true,
});

export const adminMiddleware = AuthMiddleware.create({
  requireAuth: true,
  requiredRole: 'admin',
  auditLog: true,
  rateLimit: {
    maxAttempts: 200,
    windowMinutes: 1,
  },
});