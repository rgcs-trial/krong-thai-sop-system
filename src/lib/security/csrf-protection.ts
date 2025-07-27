/**
 * CSRF Protection Implementation
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements Cross-Site Request Forgery protection using the synchronizer token pattern
 * optimized for restaurant tablet environments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';
import { envConfig } from '@/lib/env-config';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_SECRET_HEADER = 'x-csrf-secret';

// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Paths that should be exempt from CSRF protection
const EXEMPT_PATHS = [
  '/api/security/csp-report',
  '/api/health',
  '/api/auth/logout' // Logout should work even with invalid CSRF
];

/**
 * CSRF Protection Service
 */
export class CSRFProtection {
  private secret: string;

  constructor() {
    // Use configured secret or generate one for this instance
    this.secret = envConfig.server.COOKIE_SECRET || this.generateSecret();
  }

  /**
   * Generate a cryptographically secure secret
   */
  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a CSRF token for a session
   */
  public generateToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const random = randomBytes(CSRF_TOKEN_LENGTH / 2).toString('hex');
    const payload = `${sessionId}:${timestamp}:${random}`;
    
    const hmac = createHmac('sha256', this.secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    
    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  /**
   * Validate a CSRF token
   */
  public validateToken(token: string, sessionId: string): boolean {
    try {
      // Decode the token
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts = decoded.split(':');
      
      if (parts.length !== 4) {
        return false;
      }

      const [tokenSessionId, timestamp, random, signature] = parts;

      // Verify session ID matches
      if (tokenSessionId !== sessionId) {
        return false;
      }

      // Check token age (valid for 24 hours)
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - tokenTime > maxAge) {
        return false;
      }

      // Verify signature
      const payload = `${tokenSessionId}:${timestamp}:${random}`;
      const hmac = createHmac('sha256', this.secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      return signature === expectedSignature;

    } catch (error) {
      console.error('CSRF token validation error:', error);
      return false;
    }
  }

  /**
   * Extract session ID from request (various sources)
   */
  private getSessionId(request: NextRequest): string | null {
    // Try different session cookie names
    const sessionCookies = [
      'krong_thai_session',
      'session_token',
      'auth-session'
    ];

    for (const cookieName of sessionCookies) {
      const sessionId = request.cookies.get(cookieName)?.value;
      if (sessionId) {
        return sessionId;
      }
    }

    return null;
  }

  /**
   * Check if path should be exempt from CSRF protection
   */
  private isExemptPath(pathname: string): boolean {
    return EXEMPT_PATHS.some(exemptPath => pathname.startsWith(exemptPath));
  }

  /**
   * Check if method requires CSRF protection
   */
  private requiresProtection(method: string): boolean {
    return PROTECTED_METHODS.includes(method.toUpperCase());
  }

  /**
   * Validate CSRF token for a request
   */
  public validateRequest(request: NextRequest): {
    valid: boolean;
    error?: string;
    generateNewToken?: boolean;
  } {
    const pathname = request.nextUrl.pathname;
    const method = request.method;

    // Skip CSRF protection if disabled
    if (envConfig.server.SECURITY_DISABLE_CSRF) {
      return { valid: true };
    }

    // Skip for exempt paths
    if (this.isExemptPath(pathname)) {
      return { valid: true };
    }

    // Skip for methods that don't require protection
    if (!this.requiresProtection(method)) {
      return { valid: true };
    }

    // Get session ID
    const sessionId = this.getSessionId(request);
    if (!sessionId) {
      return { 
        valid: false, 
        error: 'No valid session found',
        generateNewToken: true 
      };
    }

    // Get CSRF token from header or body
    let csrfToken = request.headers.get(CSRF_TOKEN_HEADER);
    
    // For form submissions, token might be in the body
    if (!csrfToken && method === 'POST') {
      // This would require parsing the body, which is complex in middleware
      // For now, we'll rely on header-based tokens
    }

    if (!csrfToken) {
      return { 
        valid: false, 
        error: 'CSRF token missing',
        generateNewToken: true 
      };
    }

    // Validate the token
    const isValid = this.validateToken(csrfToken, sessionId);
    if (!isValid) {
      return { 
        valid: false, 
        error: 'Invalid CSRF token',
        generateNewToken: true 
      };
    }

    return { valid: true };
  }

  /**
   * Add CSRF token to response headers
   */
  public addTokenToResponse(response: NextResponse, sessionId: string): NextResponse {
    if (!sessionId) {
      return response;
    }

    const token = this.generateToken(sessionId);
    
    // Add token to response headers for JavaScript access
    response.headers.set(CSRF_TOKEN_HEADER, token);
    
    // Set token in a cookie for automatic inclusion in requests
    response.cookies.set(CSRF_TOKEN_COOKIE, token, {
      httpOnly: false, // Allow JavaScript access for AJAX requests
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;
  }

  /**
   * Generate CSRF protection middleware
   */
  public middleware() {
    return (request: NextRequest): NextResponse | null => {
      const validation = this.validateRequest(request);
      
      if (!validation.valid) {
        console.warn(`CSRF validation failed: ${validation.error}`, {
          path: request.nextUrl.pathname,
          method: request.method,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          userAgent: request.headers.get('user-agent')
        });

        // Return 403 Forbidden for CSRF failures
        const response = new NextResponse('Forbidden: CSRF token invalid', { 
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Generate new token if needed
        if (validation.generateNewToken) {
          const sessionId = this.getSessionId(request);
          if (sessionId) {
            this.addTokenToResponse(response, sessionId);
          }
        }

        return response;
      }

      // CSRF validation passed, continue to next middleware
      return null;
    };
  }
}

/**
 * Double Submit Cookie CSRF Protection
 * Alternative implementation using double submit cookie pattern
 */
export class DoubleSubmitCSRF {
  private secret: string;

  constructor() {
    this.secret = envConfig.server.COOKIE_SECRET || randomBytes(32).toString('hex');
  }

  /**
   * Generate a double submit token
   */
  public generateToken(): { token: string; cookieValue: string } {
    const token = randomBytes(32).toString('hex');
    
    // Create HMAC of token with secret
    const hmac = createHmac('sha256', this.secret);
    hmac.update(token);
    const cookieValue = hmac.digest('hex');

    return { token, cookieValue };
  }

  /**
   * Validate double submit token
   */
  public validateToken(token: string, cookieValue: string): boolean {
    try {
      const hmac = createHmac('sha256', this.secret);
      hmac.update(token);
      const expectedCookieValue = hmac.digest('hex');

      return cookieValue === expectedCookieValue;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate request using double submit pattern
   */
  public validateRequest(request: NextRequest): boolean {
    const pathname = request.nextUrl.pathname;
    const method = request.method;

    // Skip for exempt paths and safe methods
    if (!PROTECTED_METHODS.includes(method) || 
        EXEMPT_PATHS.some(path => pathname.startsWith(path))) {
      return true;
    }

    const token = request.headers.get(CSRF_TOKEN_HEADER);
    const cookieValue = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;

    if (!token || !cookieValue) {
      return false;
    }

    return this.validateToken(token, cookieValue);
  }
}

// Utility functions for React components
export const CSRFUtils = {
  /**
   * Get CSRF token from meta tag or cookie for client-side use
   */
  getTokenFromDOM(): string | null {
    if (typeof window === 'undefined') return null;

    // Try to get from meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }

    // Try to get from cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === CSRF_TOKEN_COOKIE) {
        return decodeURIComponent(value);
      }
    }

    return null;
  },

  /**
   * Add CSRF token to fetch request headers
   */
  addTokenToHeaders(headers: HeadersInit = {}): HeadersInit {
    const token = this.getTokenFromDOM();
    if (token) {
      return {
        ...headers,
        [CSRF_TOKEN_HEADER]: token
      };
    }
    return headers;
  },

  /**
   * Create fetch wrapper with automatic CSRF token inclusion
   */
  createSecureFetch() {
    return (url: string, options: RequestInit = {}): Promise<Response> => {
      const secureOptions = {
        ...options,
        headers: this.addTokenToHeaders(options.headers)
      };

      return fetch(url, secureOptions);
    };
  }
};

// Singleton instances
export const csrfProtection = new CSRFProtection();
export const doubleSubmitCSRF = new DoubleSubmitCSRF();

// Export constants for use in components
export { CSRF_TOKEN_HEADER, CSRF_TOKEN_COOKIE };