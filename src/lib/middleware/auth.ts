/**
 * Authentication Middleware for SOP API Routes
 * Handles session validation, role-based access control, and request context
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SOPAuthContext, APIResponse } from '@/types/api/sop';
import { getAuthErrorMessage, mapErrorToCode } from '@/lib/auth-errors';

// Environment configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Logger utility
function logAuthEvent(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    metadata: {
      ...metadata,
      environment: process.env.NODE_ENV,
    },
  };
  
  if (level === 'error') {
    console.error(`[AUTH-${level.toUpperCase()}]`, JSON.stringify(logEntry, null, 2));
  } else {
    console.log(`[AUTH-${level.toUpperCase()}]`, JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Create authenticated Supabase client with service role
 */
function createAuthenticatedSupabaseClient(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing required Supabase configuration');
  }

  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set() {
        // Handled by response
      },
      remove() {
        // Handled by response
      },
    },
  });
}

/**
 * Extract and validate session token from request
 */
function extractSessionToken(request: NextRequest): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookie
  const sessionCookie = request.cookies.get('auth-session');
  return sessionCookie?.value || null;
}

/**
 * Decode and validate session token
 */
function decodeSessionToken(token: string): any {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Validate token structure
    if (!decoded.userId || !decoded.restaurantId || !decoded.expiresAt) {
      throw new Error('Invalid token structure');
    }

    // Check expiration
    const expiresAt = new Date(decoded.expiresAt);
    if (expiresAt <= new Date()) {
      throw new Error('Token expired');
    }

    return decoded;
  } catch (error) {
    logAuthEvent('error', 'Token decode failed', { error: error?.message });
    throw new Error('Invalid session token');
  }
}

/**
 * Get user details from database
 */
async function getUserDetails(userId: string, restaurantId: string, supabase: any) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('*')
    .eq('id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .single();

  if (error || !user) {
    throw new Error('User not found or inactive');
  }

  return user;
}

/**
 * Get user permissions based on role
 */
function getUserPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    admin: [
      'sop:read', 'sop:write', 'sop:delete', 'sop:approve',
      'category:read', 'category:write', 'category:delete',
      'assignment:read', 'assignment:write', 'assignment:delete',
      'analytics:read', 'analytics:export',
      'user:read', 'user:write', 'user:delete',
      'system:admin'
    ],
    manager: [
      'sop:read', 'sop:write', 'sop:approve',
      'category:read', 'category:write',
      'assignment:read', 'assignment:write',
      'analytics:read',
      'user:read'
    ],
    chef: [
      'sop:read', 'sop:write',
      'category:read',
      'assignment:read', 'assignment:update_own',
      'analytics:read_own'
    ],
    server: [
      'sop:read',
      'category:read',
      'assignment:read_own', 'assignment:update_own',
      'analytics:read_own'
    ],
    staff: [
      'sop:read',
      'category:read',
      'assignment:read_own', 'assignment:update_own'
    ]
  };

  return permissions[role] || permissions.staff;
}

/**
 * Check if user has required permission
 */
function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('system:admin');
}

/**
 * Rate limiting check
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(key);

  if (!userLimit) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > userLimit.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Create error response
 */
function createErrorResponse(
  error: string,
  status: number = 401,
  errorCode?: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): NextResponse {
  const response: APIResponse = {
    success: false,
    error,
    errorCode,
    severity,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Main authentication middleware
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredPermission?: string,
  options: {
    rateLimitKey?: string;
    maxRequests?: number;
    windowMs?: number;
  } = {}
): Promise<{ success: true; context: SOPAuthContext } | { success: false; response: NextResponse }> {
  try {
    // Rate limiting
    const rateLimitKey = options.rateLimitKey || 
      `${request.ip || 'unknown'}:${request.nextUrl.pathname}`;
    
    if (!checkRateLimit(rateLimitKey, options.maxRequests, options.windowMs)) {
      logAuthEvent('warn', 'Rate limit exceeded', {
        key: rateLimitKey,
        path: request.nextUrl.pathname,
        ip: request.ip,
      });
      
      return {
        success: false,
        response: createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', 'medium'),
      };
    }

    // Extract session token
    const sessionToken = extractSessionToken(request);
    if (!sessionToken) {
      return {
        success: false,
        response: createErrorResponse('Authentication required', 401, 'MISSING_AUTH_TOKEN'),
      };
    }

    // Decode session token
    let sessionData;
    try {
      sessionData = decodeSessionToken(sessionToken);
    } catch (error) {
      return {
        success: false,
        response: createErrorResponse('Invalid session token', 401, 'INVALID_SESSION_TOKEN'),
      };
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(request);

    // Verify user exists and is active
    let user;
    try {
      user = await getUserDetails(sessionData.userId, sessionData.restaurantId, supabase);
    } catch (error) {
      logAuthEvent('error', 'User verification failed', {
        userId: sessionData.userId,
        restaurantId: sessionData.restaurantId,
        error: error?.message,
      });
      
      return {
        success: false,
        response: createErrorResponse('User not found or inactive', 401, 'USER_NOT_FOUND'),
      };
    }

    // Get user permissions
    const permissions = getUserPermissions(user.role);

    // Check required permission
    if (requiredPermission && !hasPermission(permissions, requiredPermission)) {
      logAuthEvent('warn', 'Permission denied', {
        userId: user.id,
        role: user.role,
        requiredPermission,
        userPermissions: permissions,
        path: request.nextUrl.pathname,
      });
      
      return {
        success: false,
        response: createErrorResponse(
          'Insufficient permissions',
          403,
          'INSUFFICIENT_PERMISSIONS',
          'medium'
        ),
      };
    }

    // Log successful authentication
    logAuthEvent('info', 'Authentication successful', {
      userId: user.id,
      role: user.role,
      restaurantId: user.restaurant_id,
      path: request.nextUrl.pathname,
      method: request.method,
    });

    // Return auth context
    const context: SOPAuthContext = {
      userId: user.id,
      restaurantId: user.restaurant_id,
      role: user.role,
      permissions,
    };

    return { success: true, context };

  } catch (error) {
    logAuthEvent('error', 'Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.nextUrl.pathname,
      method: request.method,
    });

    return {
      success: false,
      response: createErrorResponse(
        'Authentication service error',
        503,
        'AUTH_SERVICE_ERROR',
        'high'
      ),
    };
  }
}

/**
 * Wrapper for API routes with authentication
 */
export function withAuth(
  handler: (request: NextRequest, context: SOPAuthContext) => Promise<NextResponse>,
  requiredPermission?: string,
  options?: {
    rateLimitKey?: string;
    maxRequests?: number;
    windowMs?: number;
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request, requiredPermission, options);
    
    if (!authResult.success) {
      return authResult.response;
    }

    try {
      return await handler(request, authResult.context);
    } catch (error) {
      logAuthEvent('error', 'Handler execution error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: request.nextUrl.pathname,
        userId: authResult.context.userId,
      });

      return createErrorResponse(
        'Internal server error',
        500,
        'HANDLER_ERROR',
        'high'
      );
    }
  };
}

/**
 * Permission constants for easier usage
 */
export const PERMISSIONS = {
  SOP: {
    READ: 'sop:read',
    WRITE: 'sop:write',
    DELETE: 'sop:delete',
    APPROVE: 'sop:approve',
  },
  CATEGORY: {
    READ: 'category:read',
    WRITE: 'category:write',
    DELETE: 'category:delete',
  },
  ASSIGNMENT: {
    READ: 'assignment:read',
    WRITE: 'assignment:write',
    DELETE: 'assignment:delete',
    UPDATE_OWN: 'assignment:update_own',
    READ_OWN: 'assignment:read_own',
  },
  ANALYTICS: {
    READ: 'analytics:read',
    READ_OWN: 'analytics:read_own',
    EXPORT: 'analytics:export',
  },
  USER: {
    READ: 'user:read',
    WRITE: 'user:write',
    DELETE: 'user:delete',
  },
  SYSTEM: {
    ADMIN: 'system:admin',
  },
} as const;

/**
 * Role-based access helpers
 */
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CHEF: 'chef',
  SERVER: 'server',
  STAFF: 'staff',
} as const;

/**
 * Check if user can access resource owned by another user
 */
export function canAccessResource(
  userRole: string,
  userId: string,
  resourceOwnerId: string
): boolean {
  // Admins and managers can access all resources
  if (userRole === ROLES.ADMIN || userRole === ROLES.MANAGER) {
    return true;
  }
  
  // Users can access their own resources
  return userId === resourceOwnerId;
}

/**
 * Audit logging for sensitive operations
 */
export function logAuditEvent(
  context: SOPAuthContext,
  action: string,
  resourceType: string,
  resourceId?: string,
  oldValues?: any,
  newValues?: any,
  request?: NextRequest
) {
  const auditLog = {
    restaurant_id: context.restaurantId,
    user_id: context.userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    old_values: oldValues,
    new_values: newValues,
    ip_address: request?.ip || request?.headers.get('x-forwarded-for') || null,
    user_agent: request?.headers.get('user-agent') || null,
    timestamp: new Date().toISOString(),
  };

  // In a production environment, this would be saved to the audit_logs table
  logAuthEvent('info', 'Audit event', auditLog);
}