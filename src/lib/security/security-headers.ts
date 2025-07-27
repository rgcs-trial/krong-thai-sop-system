/**
 * Security Headers Configuration
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements comprehensive security headers for protection against
 * common web vulnerabilities and restaurant-specific security threats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { envConfig } from '@/lib/env-config';

// Content Security Policy configuration
export class CSPBuilder {
  private directives: Record<string, string[]> = {};

  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults() {
    const config = envConfig.client;
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Default CSP directives for restaurant tablet environment
    this.directives = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Next.js in development
        "'unsafe-eval'", // Required for Next.js development tools
        ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]),
        'https://cdn.jsdelivr.net', // For external libraries
        'https://unpkg.com', // For external libraries
        config.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and CSS-in-JS
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'data:' // For base64 encoded fonts
      ],
      'img-src': [
        "'self'",
        'data:', // For base64 images
        'blob:', // For dynamically generated images
        'https:', // For external images
        config.NEXT_PUBLIC_SUPABASE_URL || '',
        config.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      ],
      'media-src': [
        "'self'",
        'data:',
        'blob:'
      ],
      'connect-src': [
        "'self'",
        config.NEXT_PUBLIC_SUPABASE_URL || '',
        config.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'https://api.sentry.io', // For error reporting
        'wss:', // For WebSocket connections
        'ws:' // For development WebSocket
      ],
      'frame-src': [
        "'none'" // Prevent iframe embedding for security
      ],
      'frame-ancestors': [
        "'none'" // Prevent being embedded in frames
      ],
      'object-src': [
        "'none'" // Block plugins like Flash
      ],
      'base-uri': [
        "'self'" // Restrict base element URLs
      ],
      'form-action': [
        "'self'" // Restrict form submissions
      ],
      'worker-src': [
        "'self'",
        'blob:' // For service workers
      ],
      'manifest-src': [
        "'self'" // PWA manifest
      ]
    };

    // Add report URI if configured
    const config_server = envConfig.server;
    if (config_server.CSP_REPORT_URI) {
      this.directives['report-uri'] = [config_server.CSP_REPORT_URI];
    }
  }

  public addDirective(directive: string, sources: string[]): this {
    if (!this.directives[directive]) {
      this.directives[directive] = [];
    }
    this.directives[directive].push(...sources);
    return this;
  }

  public removeDirective(directive: string): this {
    delete this.directives[directive];
    return this;
  }

  public build(): string {
    return Object.entries(this.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }

  public buildReportOnly(): string {
    // Clone current directives for report-only mode
    const reportOnlyDirectives = { ...this.directives };
    
    // Remove enforcement directives that shouldn't be in report-only
    delete reportOnlyDirectives['report-uri'];
    
    return Object.entries(reportOnlyDirectives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }
}

// Security headers configuration
export interface SecurityHeadersConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableNOSNIFF: boolean;
  enableXSSProtection: boolean;
  enableFrameOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
  customHeaders?: Record<string, string>;
}

export class SecurityHeaders {
  private config: SecurityHeadersConfig;
  private envConfig = envConfig.server;

  constructor(config?: Partial<SecurityHeadersConfig>) {
    this.config = {
      enableCSP: true,
      enableHSTS: process.env.NODE_ENV === 'production',
      enableNOSNIFF: true,
      enableXSSProtection: true,
      enableFrameOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      ...config
    };
  }

  public getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Content Security Policy
    if (this.config.enableCSP) {
      const csp = new CSPBuilder();
      
      if (this.envConfig.CSP_REPORT_ONLY) {
        headers['Content-Security-Policy-Report-Only'] = csp.buildReportOnly();
      } else {
        headers['Content-Security-Policy'] = csp.build();
      }
    }

    // HTTP Strict Transport Security (HTTPS only)
    if (this.config.enableHSTS && process.env.NODE_ENV === 'production') {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    // X-Content-Type-Options
    if (this.config.enableNOSNIFF) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // X-XSS-Protection (legacy but still useful)
    if (this.config.enableXSSProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    // X-Frame-Options
    if (this.config.enableFrameOptions) {
      headers['X-Frame-Options'] = 'DENY';
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    }

    // Permissions Policy (formerly Feature Policy)
    if (this.config.enablePermissionsPolicy) {
      headers['Permissions-Policy'] = this.buildPermissionsPolicy();
    }

    // Additional restaurant-specific security headers
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    headers['Cross-Origin-Embedder-Policy'] = 'credentialless';
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    headers['Cross-Origin-Resource-Policy'] = 'same-origin';

    // Custom security headers for restaurant environment
    headers['X-Restaurant-Security'] = 'tablet-optimized';
    headers['X-Content-Duration'] = '8h'; // Match restaurant shift duration

    // Cache control for sensitive pages
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';

    // Add custom headers if provided
    if (this.config.customHeaders) {
      Object.assign(headers, this.config.customHeaders);
    }

    return headers;
  }

  private buildPermissionsPolicy(): string {
    // Disable potentially dangerous features for restaurant tablets
    const policies = [
      'camera=self', // Allow camera for QR code scanning
      'microphone=()', // Disable microphone
      'geolocation=()', // Disable location (device should be stationary)
      'accelerometer=()', // Disable motion sensors
      'gyroscope=()', // Disable motion sensors
      'magnetometer=()', // Disable compass
      'payment=()', // Disable payment APIs
      'usb=()', // Disable USB access
      'serial=()', // Disable serial port access
      'bluetooth=()', // Disable Bluetooth
      'midi=()', // Disable MIDI
      'ambient-light-sensor=()', // Disable light sensor
      'autoplay=()', // Disable autoplay
      'encrypted-media=()', // Disable DRM
      'fullscreen=self', // Allow fullscreen for kiosk mode
      'picture-in-picture=()', // Disable PiP
      'display-capture=()', // Disable screen capture
      'web-share=self', // Allow sharing SOP documents
      'clipboard-read=self', // Allow clipboard for form filling
      'clipboard-write=self' // Allow clipboard for copying procedures
    ];

    return policies.join(', ');
  }

  public applyToResponse(response: NextResponse): NextResponse {
    const headers = this.getHeaders();
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}

// CORS configuration for restaurant environment
export class CORSHandler {
  private allowedOrigins: string[];
  private allowedMethods: string[];
  private allowCredentials: boolean;
  private maxAge: number;

  constructor() {
    const config = envConfig.server;
    this.allowedOrigins = config.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    this.allowedMethods = config.CORS_ALLOWED_METHODS.split(',').map(method => method.trim());
    this.allowCredentials = config.CORS_ALLOW_CREDENTIALS;
    this.maxAge = 86400; // 24 hours
  }

  public handleCORS(request: NextRequest, response: NextResponse): NextResponse {
    const origin = request.headers.get('origin');
    
    // Check if origin is allowed
    if (origin && this.isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (this.allowedOrigins.includes('*')) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    // Set CORS headers
    response.headers.set('Access-Control-Allow-Methods', this.allowedMethods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Restaurant-ID',
      'X-Device-Fingerprint',
      'X-Session-Token'
    ].join(', '));
    
    if (this.allowCredentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    response.headers.set('Access-Control-Max-Age', this.maxAge.toString());

    return response;
  }

  private isOriginAllowed(origin: string): boolean {
    // Exact match
    if (this.allowedOrigins.includes(origin)) {
      return true;
    }

    // Wildcard subdomain matching for development
    if (process.env.NODE_ENV === 'development') {
      const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/;
      if (localhostPattern.test(origin)) {
        return true;
      }
    }

    return false;
  }

  public handlePreflight(request: NextRequest): NextResponse {
    // Handle OPTIONS preflight requests
    const response = new NextResponse(null, { status: 200 });
    return this.handleCORS(request, response);
  }
}

// Rate limiting for security headers
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export function addRateLimitHeaders(response: NextResponse, rateLimitInfo: RateLimitInfo): NextResponse {
  response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());
  
  if (rateLimitInfo.retryAfter) {
    response.headers.set('Retry-After', rateLimitInfo.retryAfter.toString());
  }

  return response;
}

// Security event logging
export interface SecurityEvent {
  type: 'csp_violation' | 'cors_violation' | 'rate_limit_exceeded' | 'suspicious_activity';
  source: string;
  details: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    timestamp: event.timestamp.toISOString(),
    type: event.type,
    source: event.source,
    details: event.details,
    userAgent: event.userAgent,
    ip: event.ip
  };

  // Log to console in development, should integrate with proper logging service in production
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔒 Security Event:', JSON.stringify(logEntry, null, 2));
  }

  // In production, this should integrate with:
  // - Sentry for error tracking
  // - CloudWatch/DataDog for monitoring
  // - SIEM system for security analysis
  // - Audit logging database
}

// CSP violation reporting endpoint handler
export function handleCSPViolation(request: NextRequest): NextResponse {
  return new Promise(async (resolve) => {
    try {
      const violation = await request.json();
      
      logSecurityEvent({
        type: 'csp_violation',
        source: 'csp_report',
        details: violation,
        timestamp: new Date(),
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
           request.headers.get('x-real-ip') || 
           'unknown'
      });

      resolve(new NextResponse(null, { status: 204 }));
    } catch (error) {
      console.error('Failed to process CSP violation report:', error);
      resolve(new NextResponse('Bad Request', { status: 400 }));
    }
  });
}

// Export configured instances
export const securityHeaders = new SecurityHeaders();
export const corsHandler = new CORSHandler();