/**
 * Session Refresh API Route for Restaurant Krong Thai SOP Management System
 * Handles session token refresh for maintaining user sessions
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Security } from '@/lib/security';
import { SECURITY_CONFIG } from '@/lib/security/config';

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie or header
    const sessionToken = request.cookies.get(SECURITY_CONFIG.SESSION.COOKIE_NAME)?.value ||
                         request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json(
        { 
          error: 'No session token provided',
          code: 'NO_SESSION' 
        },
        { status: 401 }
      );
    }

    // Attempt to refresh session
    const newToken = await Security.Pin.refreshSession(sessionToken);

    if (newToken) {
      // Calculate new expiry time
      const expiresAt = new Date(Date.now() + SECURITY_CONFIG.SESSION.DURATION);

      // Create response with new session info
      const response = NextResponse.json({
        success: true,
        message: 'Session refreshed successfully',
        expiresAt,
      });

      // Set new session cookie
      response.cookies.set(SECURITY_CONFIG.SESSION.COOKIE_NAME, newToken, {
        ...SECURITY_CONFIG.SESSION.COOKIE_OPTIONS,
        expires: expiresAt,
      });

      return response;

    } else {
      // Session couldn't be refreshed
      const response = NextResponse.json(
        { 
          error: 'Session refresh failed',
          code: 'REFRESH_FAILED' 
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
    console.error('Session refresh API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    );
  }
}