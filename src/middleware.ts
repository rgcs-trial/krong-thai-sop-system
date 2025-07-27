/**
 * Enhanced Security Middleware
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements comprehensive security measures including authentication,
 * rate limiting, security headers, and restaurant-specific protections.
 */

import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n';
import { securityHeaders, corsHandler, logSecurityEvent } from './lib/security/security-headers';

// Internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security middleware configuration
interface SecurityConfig {
  enableRateLimit: boolean;
  enableSecurityHeaders: boolean;
  enableCORS: boolean;
  enableAuthentication: boolean;
}

const securityConfig: SecurityConfig = {
  enableRateLimit: process.env.SECURITY_DISABLE_RATE_LIMITING !== 'true',
  enableSecurityHeaders: true,
  enableCORS: true,
  enableAuthentication: true
};

/**
 * Rate limiting implementation
 */
function checkRateLimit(request: NextRequest): { allowed: boolean; retryAfter?: number } {
  if (!securityConfig.enableRateLimit) {
    return { allowed: true };
  }

  const ip = getClientIP(request);
  const key = `rate_limit:${ip}`;
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // New window or expired window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    
    logSecurityEvent({
      type: 'rate_limit_exceeded',
      source: 'middleware',
      details: {
        ip,
        count: current.count,
        maxRequests,
        windowMs,
        path: request.nextUrl.pathname
      },
      timestamp: new Date(),
      userAgent: request.headers.get('user-agent') || undefined,
      ip
    });

    return { allowed: false, retryAfter };
  }

  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return { allowed: true };
}

/**
 * Authentication check for protected routes
 */
function checkAuthentication(request: NextRequest): { authenticated: boolean; redirect?: string } {
  if (!securityConfig.enableAuthentication) {
    return { authenticated: true };
  }

  const pathname = request.nextUrl.pathname;
  
  // Public routes that don't require authentication
  const publicPaths = [
    '/api/health',
    '/api/security/csp-report',
    '/favicon.ico',
    '/manifest.json',
    '/sw.js',
    '/offline'
  ];

  // Check if current path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return { authenticated: true };
  }

  // Check for locale-prefixed public paths
  const localePattern = new RegExp(`^/(${locales.join('|')})`);
  const pathWithoutLocale = pathname.replace(localePattern, '');
  
  // Auth-related paths
  const authPaths = ['/login', '/auth'];
  if (authPaths.some(path => pathWithoutLocale.startsWith(path))) {
    return { authenticated: true };
  }

  // Check for session token
  const sessionToken = request.cookies.get('krong_thai_session')?.value ||
                      request.cookies.get('session_token')?.value ||
                      request.cookies.get('auth-session')?.value;

  if (!sessionToken) {
    // Not authenticated, redirect to login
    const locale = pathname.match(localePattern)?.[1] || defaultLocale;
    return { 
      authenticated: false, 
      redirect: `/${locale}/login?redirect=${encodeURIComponent(pathname)}`
    };
  }

  // In a full implementation, validate the session token here
  // For now, we'll assume valid if token exists
  return { authenticated: true };
}

/**
 * Extract client IP address
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') ||
         request.headers.get('x-client-ip') ||
         request.headers.get('cf-connecting-ip') || // Cloudflare
         '127.0.0.1';
}

/**
 * Device fingerprint validation for tablet security
 */
function validateDeviceFingerprint(request: NextRequest): boolean {
  // Skip validation if disabled
  if (process.env.SECURITY_DISABLE_DEVICE_BINDING === 'true') {
    return true;
  }

  const fingerprint = request.headers.get('x-device-fingerprint');
  const userAgent = request.headers.get('user-agent');

  // Basic device validation for restaurant tablets
  if (userAgent) {
    // Check for suspicious user agents
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      logSecurityEvent({
        type: 'suspicious_activity',
        source: 'device_validation',
        details: {
          userAgent,
          fingerprint,
          reason: 'suspicious_user_agent'
        },
        timestamp: new Date(),
        userAgent,
        ip: getClientIP(request)
      });
      return false;
    }
  }

  return true;
}

/**
 * Main middleware function
 */
export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return corsHandler.handlePreflight(request);
  }

  // 2. Device fingerprint validation
  if (!validateDeviceFingerprint(request)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // 3. Rate limiting check
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    const response = new NextResponse('Too Many Requests', { status: 429 });
    if (rateLimitResult.retryAfter) {
      response.headers.set('Retry-After', rateLimitResult.retryAfter.toString());
    }
    return response;
  }

  // 4. Handle API routes separately
  if (pathname.startsWith('/api/')) {
    return handleAPIRoute(request);
  }

  // 5. Authentication check for protected routes
  const authResult = checkAuthentication(request);
  if (!authResult.authenticated && authResult.redirect) {
    return NextResponse.redirect(new URL(authResult.redirect, request.url));
  }

  // 6. Apply internationalization
  const intlResponse = intlMiddleware(request);
  
  // 7. Apply security headers
  const response = intlResponse || NextResponse.next();
  
  if (securityConfig.enableSecurityHeaders) {
    securityHeaders.applyToResponse(response);
  }

  if (securityConfig.enableCORS) {
    corsHandler.handleCORS(request, response);
  }

  return response;
}

/**
 * Handle API routes with specific security measures
 */
function handleAPIRoute(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  // Handle CSP violation reports
  if (pathname === '/api/security/csp-report') {
    // This should be handled by the actual API route
    return NextResponse.next();
  }

  // Apply stricter rate limiting for auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const ip = getClientIP(request);
    const key = `auth_rate_limit:${ip}`;
    const now = Date.now();
    const windowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
    const maxAttempts = parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '5');

    const current = rateLimitStore.get(key);
    
    if (current && now <= current.resetTime && current.count >= maxAttempts) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        source: 'auth_middleware',
        details: {
          ip,
          count: current.count,
          maxAttempts,
          windowMs,
          path: pathname
        },
        timestamp: new Date(),
        userAgent: request.headers.get('user-agent') || undefined,
        ip
      });

      const response = new NextResponse('Too Many Requests', { status: 429 });
      response.headers.set('Retry-After', retryAfter.toString());
      return response;
    }

    // Update auth rate limit counter
    if (!current || now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      current.count++;
      rateLimitStore.set(key, current);
    }
  }

  // Continue to API route with security headers
  const response = NextResponse.next();
  
  if (securityConfig.enableSecurityHeaders) {
    securityHeaders.applyToResponse(response);
  }

  if (securityConfig.enableCORS) {
    corsHandler.handleCORS(request, response);
  }

  return response;
}

// Middleware configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};