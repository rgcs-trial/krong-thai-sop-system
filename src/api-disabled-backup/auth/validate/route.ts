/**
 * Session Validation API Route for Restaurant Krong Thai SOP Management System
 * Validates session tokens and returns user information
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Security } from '@/lib/security';
import { SECURITY_CONFIG } from '@/lib/security/config';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie or header
    const sessionToken = request.cookies.get(SECURITY_CONFIG.SESSION.COOKIE_NAME)?.value ||
                         request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'No session token provided',
          code: 'NO_SESSION' 
        },
        { status: 401 }
      );
    }

    // Validate session
    const validation = await Security.Pin.validateSession(sessionToken);

    if (validation.valid && validation.sessionData) {
      return NextResponse.json({
        valid: true,
        user: {
          id: validation.sessionData.userId,
          email: validation.sessionData.email,
          role: validation.sessionData.role,
          restaurantId: validation.sessionData.restaurantId,
          deviceId: validation.sessionData.deviceId,
        },
        session: {
          expiresAt: validation.sessionData.expiresAt,
          lastActivity: validation.sessionData.lastActivity,
        },
      });

    } else {
      const response = NextResponse.json(
        { 
          valid: false,
          error: validation.error || 'Invalid session',
          code: 'INVALID_SESSION' 
        },
        { status: 401 }
      );

      // Clear invalid session cookie
      response.cookies.set(SECURITY_CONFIG.SESSION.COOKIE_NAME, '', {
        ...SECURITY_CONFIG.SESSION.COOKIE_OPTIONS,
        expires: new Date(0),
      });

      return response;
    }

  } catch (error) {
    console.error('Session validation API error:', error);
    
    return NextResponse.json(
      { 
        valid: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    );
  }
}