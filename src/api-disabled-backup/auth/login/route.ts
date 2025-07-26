/**
 * Login API Route for Restaurant Krong Thai SOP Management System
 * Handles PIN-based authentication with security features
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Security } from '@/lib/security';
import { SECURITY_CONFIG } from '@/lib/security/config';

export async function POST(request: NextRequest) {
  try {
    const { email, pin, deviceFingerprint } = await request.json();

    // Validate required fields
    if (!email || !pin || !deviceFingerprint) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR' 
        },
        { status: 400 }
      );
    }

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Attempt authentication
    const result = await Security.Pin.authenticate({
      email: email.trim(),
      pin: pin.trim(),
      deviceFingerprint,
      ipAddress,
      userAgent,
    });

    if (result.success && result.sessionToken && result.user) {
      // Create response with user data
      const response = NextResponse.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          fullName: result.user.fullName,
          fullNameTh: result.user.fullNameTh,
          restaurantId: result.user.restaurantId,
        },
        expiresAt: result.expiresAt,
      });

      // Set secure session cookie
      response.cookies.set(SECURITY_CONFIG.SESSION.COOKIE_NAME, result.sessionToken, {
        ...SECURITY_CONFIG.SESSION.COOKIE_OPTIONS,
        expires: result.expiresAt,
      });

      return response;

    } else {
      // Authentication failed
      const status = result.error?.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 401;
      
      const response = NextResponse.json({
        success: false,
        error: result.error?.message || 'Authentication failed',
        code: result.error?.code || 'AUTH_FAILED',
      }, { status });

      // Add retry-after header for rate limiting
      if (result.error?.retryAfter) {
        response.headers.set('Retry-After', result.error.retryAfter.toString());
      }

      return response;
    }

  } catch (error) {
    console.error('Login API error:', error);
    
    // Log security error
    await Security.Audit.logSecurityEvent('api_error', {
      endpoint: '/api/auth/login',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      restaurantId: '',
      ipAddress: '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'high',
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    );
  }
}