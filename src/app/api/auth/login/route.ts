/**
 * Main Authentication API Route
 * Handles both manager and staff login with PIN validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import bcrypt from 'bcryptjs';
import { getAuthErrorMessage, mapErrorToCode } from '@/lib/auth-errors';

// Logger utility
function logError(context: string, error: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata
  };
  
  console.error(`[AUTH-ERROR] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Create Supabase client
function createSupabaseClient(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('Supabase configuration missing');
    logError('SUPABASE_CONFIG', error, {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
    throw error;
  }

  try {
    // Use service role key for auth operations to bypass RLS
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            // Will be handled by response cookies
          },
          remove(name, options) {
            // Will be handled by response cookies
          },
        },
      }
    );
  } catch (error) {
    logError('SUPABASE_CLIENT_INIT', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[AUTH-DEBUG] Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
    });

    const body = await request.json();
    const { email, pin, deviceFingerprint } = body;
    
    console.log('[AUTH-DEBUG] Login attempt:', { email, pinLength: pin?.length });

    // Validate input
    if (!email || !pin) {
      const errorInfo = getAuthErrorMessage('MISSING_CREDENTIALS', 'en');
      return NextResponse.json(
        { 
          success: false, 
          error: errorInfo.userMessage,
          errorCode: errorInfo.code,
          severity: errorInfo.severity
        },
        { status: 400 }
      );
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      const errorInfo = getAuthErrorMessage('INVALID_PIN_FORMAT', 'en');
      return NextResponse.json(
        { 
          success: false, 
          error: errorInfo.userMessage,
          errorCode: errorInfo.code,
          severity: errorInfo.severity
        },
        { status: 400 }
      );
    }

    // Create Supabase client and authenticate
    const supabase = createSupabaseClient(request);
    console.log('[AUTH-DEBUG] Supabase client created successfully');

    // Use Supabase for authentication
    console.log('[AUTH-DEBUG] Querying auth_users for:', email.toLowerCase());
    const { data: user, error } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();
    
    console.log('[AUTH-DEBUG] Database query result:', { 
      hasUser: !!user, 
      error: error?.message,
      errorCode: error?.code 
    });

    if (error) {
      logError('DATABASE_QUERY', error, {
        operation: 'auth_users_lookup',
        email: email.toLowerCase(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      const errorCode = mapErrorToCode(error);
      const errorInfo = getAuthErrorMessage(errorCode, 'en');
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorInfo.userMessage,
          errorCode: errorInfo.code,
          severity: errorInfo.severity
        },
        { status: 503 }
      );
    }

    if (!user) {
      // Log failed login attempt (don't log the actual PIN)
      logError('AUTH_FAILED', 'User not found or inactive', {
        email: email.toLowerCase(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      const errorInfo = getAuthErrorMessage('USER_NOT_FOUND', 'en');
      return NextResponse.json(
        { 
          success: false, 
          error: errorInfo.userMessage,
          errorCode: errorInfo.code,
          severity: errorInfo.severity
        },
        { status: 401 }
      );
    }

    // Verify PIN
    const pinValid = await bcrypt.compare(pin, user.pin_hash);
    if (!pinValid) {
      logError('AUTH_FAILED', 'Invalid PIN', {
        userId: user.id,
        email: email.toLowerCase(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      const errorInfo = getAuthErrorMessage('WRONG_PIN', 'en');
      return NextResponse.json(
        { 
          success: false, 
          error: errorInfo.userMessage,
          errorCode: errorInfo.code,
          severity: errorInfo.severity
        },
        { status: 401 }
      );
    }

    // Create session token (simplified for development)
    const sessionToken = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurant_id,
      deviceFingerprint,
      loginTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
    })).toString('base64');

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        restaurantId: user.restaurant_id
      },
      message: 'Authentication successful'
    });

    // Set secure session cookie
    response.cookies.set('auth-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/'
    });

    return response;

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, {
      operation: 'login',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json(
      { success: false, error: 'Service temporarily unavailable', code: 'SERVICE_DOWN' },
      { status: 503 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}