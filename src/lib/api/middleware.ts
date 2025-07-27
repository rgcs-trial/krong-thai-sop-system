/**
 * API middleware for authentication, validation, and security
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Rate limiting dependencies temporarily disabled for build compatibility
// import { rateLimit } from 'express-rate-limit';
// import { RedisStore } from 'rate-limit-redis';
// import Redis from 'ioredis';
import crypto from 'crypto';

import { dbAdmin, createAuthenticatedClient } from '@/lib/supabase/client';
import { formatValidationErrors } from '@/lib/validations';
import { ApiResponse, AuthContext, ValidationError } from '@/types/api';
import { AuthUser, UserRole } from '@/types/database';

// Redis client for rate limiting (temporarily disabled for build compatibility)
const redis = null; // process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

/**
 * API middleware options
 */
export interface MiddlewareOptions {
  requireAuth?: boolean;
  requiredRole?: UserRole;
  requiredPermissions?: string[];
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  rateLimit?: {
    maxRequests: number;
    windowMinutes: number;
    keyGenerator?: (req: NextRequest) => string;
  };
  cors?: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
  };
  audit?: boolean;
}

/**
 * Enhanced request object with middleware context
 */
export interface EnhancedRequest extends NextRequest {
  auth?: AuthContext;
  validatedBody?: any;
  validatedQuery?: any;
  validatedParams?: any;
  requestId: string;
  startTime: number;
}

/**
 * Main API middleware function
 */
export function apiMiddleware(options: MiddlewareOptions = {}) {
  return async function middleware(
    request: NextRequest,
    handler: (req: EnhancedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    // Enhance request object
    const enhancedReq = request as EnhancedRequest;
    enhancedReq.requestId = requestId;
    enhancedReq.startTime = startTime;

    try {
      // Set security headers
      const response = await handleSecurityHeaders(enhancedReq);
      if (response) return response;

      // Handle CORS
      if (options.cors) {
        const corsResponse = await handleCors(enhancedReq, options.cors);
        if (corsResponse) return corsResponse;
      }

      // Apply rate limiting
      if (options.rateLimit) {
        const rateLimitResponse = await handleRateLimit(enhancedReq, options.rateLimit);
        if (rateLimitResponse) return rateLimitResponse;
      }

      // Validate authentication
      if (options.requireAuth) {
        const authResponse = await handleAuthentication(enhancedReq, options.requiredRole, options.requiredPermissions);
        if (authResponse) return authResponse;
      }

      // Validate request data
      if (options.validation) {
        const validationResponse = await handleValidation(enhancedReq, options.validation);
        if (validationResponse) return validationResponse;
      }

      // Execute the actual handler
      const result = await handler(enhancedReq);

      // Add response headers
      result.headers.set('X-Request-ID', requestId);
      result.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

      // Audit logging
      if (options.audit && enhancedReq.auth) {
        await logAuditEvent(enhancedReq, result.status, Date.now() - startTime);
      }

      return result;

    } catch (error) {
      console.error('Middleware error:', error);
      return createErrorResponse(
        'Internal server error',
        500,
        requestId,
        Date.now() - startTime
      );
    }
  };
}

/**
 * Set security headers
 */
async function handleSecurityHeaders(req: EnhancedRequest): Promise<NextResponse | null> {
  // Security headers are handled in Next.js middleware
  return null;
}

/**
 * Handle CORS
 */
async function handleCors(
  req: EnhancedRequest,
  corsOptions: NonNullable<MiddlewareOptions['cors']>
): Promise<NextResponse | null> {
  const origin = req.headers.get('origin');
  const method = req.method;

  // Handle preflight requests
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    
    if (corsOptions.origins && origin) {
      if (corsOptions.origins.includes(origin) || corsOptions.origins.includes('*')) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
    }
    
    if (corsOptions.methods) {
      response.headers.set('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    }
    
    if (corsOptions.headers) {
      response.headers.set('Access-Control-Allow-Headers', corsOptions.headers.join(', '));
    }
    
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  return null;
}

/**
 * Handle rate limiting
 */
async function handleRateLimit(
  req: EnhancedRequest,
  rateLimitOptions: NonNullable<MiddlewareOptions['rateLimit']>
): Promise<NextResponse | null> {
  const { maxRequests, windowMinutes, keyGenerator } = rateLimitOptions;
  
  // Generate rate limit key
  const key = keyGenerator ? keyGenerator(req) : 
    `rate_limit:${req.ip || 'unknown'}:${new URL(req.url).pathname}`;
  
  // Simple in-memory rate limiting if Redis is not available
  if (!redis) {
    return handleInMemoryRateLimit(req, key, maxRequests, windowMinutes);
  }

  // Redis-based rate limiting
  const windowStart = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
  const redisKey = `${key}:${windowStart}`;
  
  try {
    const current = await redis.incr(redisKey);
    
    if (current === 1) {
      await redis.expire(redisKey, windowMinutes * 60);
    }
    
    if (current > maxRequests) {
      return createErrorResponse(
        'Rate limit exceeded',
        429,
        req.requestId,
        Date.now() - req.startTime,
        {
          retryAfter: windowMinutes * 60,
          limit: maxRequests,
          remaining: 0,
          resetTime: new Date((windowStart + 1) * windowMinutes * 60 * 1000).toISOString(),
        }
      );
    }

    return null;
  } catch (error) {
    console.error('Redis rate limiting error:', error);
    // Fallback to allowing the request
    return null;
  }
}

/**
 * In-memory rate limiting fallback
 */
const inMemoryRateLimit = new Map<string, { count: number; resetTime: number }>();

async function handleInMemoryRateLimit(
  req: EnhancedRequest,
  key: string,
  maxRequests: number,
  windowMinutes: number
): Promise<NextResponse | null> {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetTime = windowStart + windowMs;
  
  const current = inMemoryRateLimit.get(key);
  
  if (!current || current.resetTime <= now) {
    inMemoryRateLimit.set(key, { count: 1, resetTime });
    
    // Clean up expired entries
    for (const [k, v] of inMemoryRateLimit.entries()) {
      if (v.resetTime <= now) {
        inMemoryRateLimit.delete(k);
      }
    }
    
    return null;
  }

  current.count++;
  
  if (current.count > maxRequests) {
    return createErrorResponse(
      'Rate limit exceeded',
      429,
      req.requestId,
      Date.now() - req.startTime,
      {
        retryAfter: Math.ceil((resetTime - now) / 1000),
        limit: maxRequests,
        remaining: 0,
        resetTime: new Date(resetTime).toISOString(),
      }
    );
  }

  return null;
}

/**
 * Handle authentication
 */
async function handleAuthentication(
  req: EnhancedRequest,
  requiredRole?: UserRole,
  requiredPermissions?: string[]
): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse(
      'Authentication required',
      401,
      req.requestId,
      Date.now() - req.startTime
    );
  }

  const token = authHeader.substring(7);
  
  try {
    // Validate session token
    const { data: session, error } = await dbAdmin
      .from('user_sessions')
      .select(`
        id,
        user_id,
        expires_at,
        is_active,
        device_id,
        user:auth_users(
          id,
          email,
          role,
          full_name,
          full_name_fr,
          position,
          position_fr,
          restaurant_id,
          is_active
        )
      `)
      .eq('token_hash', crypto.createHash('sha256').update(token).digest('hex'))
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session || !session.user) {
      return createErrorResponse(
        'Invalid or expired token',
        401,
        req.requestId,
        Date.now() - req.startTime
      );
    }

    const user = session.user as AuthUser;

    // Check if user is active
    if (!user.is_active) {
      return createErrorResponse(
        'Account is disabled',
        403,
        req.requestId,
        Date.now() - req.startTime
      );
    }

    // Check role requirements
    if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
      return createErrorResponse(
        'Insufficient privileges',
        403,
        req.requestId,
        Date.now() - req.startTime
      );
    }

    // Check permission requirements
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = await getUserPermissions(user.id, user.role);
      
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        return createErrorResponse(
          'Insufficient permissions',
          403,
          req.requestId,
          Date.now() - req.startTime
        );
      }
    }

    // Set auth context
    req.auth = {
      user,
      sessionId: session.id,
      permissions: await getUserPermissions(user.id, user.role),
      restaurantId: user.restaurant_id,
      deviceId: session.device_id,
    };

    // Update last accessed time
    await dbAdmin
      .from('user_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', session.id);

    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return createErrorResponse(
      'Authentication failed',
      401,
      req.requestId,
      Date.now() - req.startTime
    );
  }
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    staff: 1,
    manager: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Get user permissions based on role
 */
async function getUserPermissions(userId: string, role: UserRole): Promise<string[]> {
  // Define role-based permissions
  const rolePermissions: Record<UserRole, string[]> = {
    staff: [
      'sop:read',
      'bookmark:create',
      'bookmark:read',
      'bookmark:update',
      'bookmark:delete',
      'progress:update',
      'file:upload',
    ],
    manager: [
      'sop:read',
      'sop:create',
      'sop:update',
      'category:read',
      'category:create',
      'category:update',
      'bookmark:create',
      'bookmark:read',
      'bookmark:update',
      'bookmark:delete',
      'progress:read',
      'progress:update',
      'file:upload',
      'file:delete',
      'audit:read',
    ],
    admin: [
      'sop:read',
      'sop:create',
      'sop:update',
      'sop:delete',
      'sop:approve',
      'category:read',
      'category:create',
      'category:update',
      'category:delete',
      'bookmark:create',
      'bookmark:read',
      'bookmark:update',
      'bookmark:delete',
      'progress:read',
      'progress:update',
      'file:upload',
      'file:delete',
      'audit:read',
      'user:read',
      'user:create',
      'user:update',
      'analytics:read',
    ],
  };

  return rolePermissions[role] || [];
}

/**
 * Handle request validation
 */
async function handleValidation(
  req: EnhancedRequest,
  validation: NonNullable<MiddlewareOptions['validation']>
): Promise<NextResponse | null> {
  const errors: ValidationError[] = [];

  try {
    // Validate body
    if (validation.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = await req.json().catch(() => ({}));
      const result = validation.body.safeParse(body);
      
      if (!result.success) {
        errors.push(...formatValidationErrors(result.error));
      } else {
        req.validatedBody = result.data;
      }
    }

    // Validate query parameters
    if (validation.query) {
      const url = new URL(req.url);
      const query = Object.fromEntries(url.searchParams.entries());
      const result = validation.query.safeParse(query);
      
      if (!result.success) {
        errors.push(...formatValidationErrors(result.error));
      } else {
        req.validatedQuery = result.data;
      }
    }

    // Validate path parameters
    if (validation.params) {
      // Extract params from URL (this would need to be implemented based on your routing)
      const params = {}; // Extract from req.url
      const result = validation.params.safeParse(params);
      
      if (!result.success) {
        errors.push(...formatValidationErrors(result.error));
      } else {
        req.validatedParams = result.data;
      }
    }

    if (errors.length > 0) {
      return createErrorResponse(
        'Validation failed',
        400,
        req.requestId,
        Date.now() - req.startTime,
        { validationErrors: errors }
      );
    }

    return null;
  } catch (error) {
    console.error('Validation error:', error);
    return createErrorResponse(
      'Invalid request data',
      400,
      req.requestId,
      Date.now() - req.startTime
    );
  }
}

/**
 * Log audit events
 */
async function logAuditEvent(
  req: EnhancedRequest,
  responseStatus: number,
  responseTime: number
): Promise<void> {
  if (!req.auth) return;

  try {
    const url = new URL(req.url);
    const action = `${req.method} ${url.pathname}`;
    
    await dbAdmin.from('audit_logs').insert({
      restaurant_id: req.auth.restaurantId,
      user_id: req.auth.user.id,
      action: responseStatus < 400 ? 'VIEW' : 'ERROR',
      resource_type: 'api_endpoint',
      resource_id: url.pathname,
      metadata: {
        method: req.method,
        url: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        response_status: responseStatus,
        response_time: responseTime,
        user_agent: req.headers.get('user-agent'),
        ip_address: req.ip,
        request_id: req.requestId,
      },
      ip_address: req.ip,
      user_agent: req.headers.get('user-agent'),
      session_id: req.auth.sessionId,
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  message: string,
  status: number,
  requestId: string,
  responseTime: number,
  additionalData?: any
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: {
      code: `API_ERROR_${status}`,
      message,
      severity: status >= 500 ? 'high' : status >= 400 ? 'medium' : 'low',
    },
    timestamp: new Date().toISOString(),
    requestId,
    ...additionalData,
  };

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Request-ID': requestId,
      'X-Response-Time': `${responseTime}ms`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Utility function to wrap API handlers with middleware
 */
export function withMiddleware(
  handler: (req: EnhancedRequest) => Promise<NextResponse>,
  options: MiddlewareOptions = {}
) {
  const middlewareHandler = apiMiddleware(options);
  
  return async (request: NextRequest): Promise<NextResponse> => {
    return middlewareHandler(request, handler);
  };
}

// Export types for external use
export type { MiddlewareOptions, EnhancedRequest, AuthContext };