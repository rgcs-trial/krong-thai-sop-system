/**
 * Logout API Route for Restaurant Krong Thai SOP Management System
 * Handles session termination and cleanup
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

    if (sessionToken) {
      // Validate and logout session
      await Security.Pin.logout(sessionToken);
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful',
    });

    // Clear session cookie
    response.cookies.set(SECURITY_CONFIG.SESSION.COOKIE_NAME, '', {
      ...SECURITY_CONFIG.SESSION.COOKIE_OPTIONS,
      expires: new Date(0),
    });

    return response;

  } catch (error) {
    console.error('Logout API error:', error);
    
    // Even if logout fails, clear the cookie and return success
    const response = NextResponse.json({
      success: true,
      message: 'Logout completed',
    });

    response.cookies.set(SECURITY_CONFIG.SESSION.COOKIE_NAME, '', {
      ...SECURITY_CONFIG.SESSION.COOKIE_OPTIONS,
      expires: new Date(0),
    });

    return response;
  }
}