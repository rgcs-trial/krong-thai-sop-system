/**
 * Staff PIN Login API Route
 * Handles staff authentication via PIN in location-bound sessions
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            // For POST requests, we might need to set cookies
          },
          remove(name, options) {
            // For POST requests, we might need to remove cookies
          },
        },
      }
    );
    const { pin, locationSessionId, deviceFingerprint } = await request.json();

    // Validate required fields
    if (!pin || !locationSessionId || !deviceFingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4 digits' },
        { status: 400 }
      );
    }

    // Verify location session is active and valid
    const { data: locationSession, error: sessionError } = await supabase
      .from('location_sessions')
      .select(`
        id,
        restaurant_id,
        tablet_device_id,
        session_token,
        expires_at,
        is_active,
        restaurants (
          id,
          name,
          name_th
        )
      `)
      .eq('id', locationSessionId)
      .eq('tablet_device_id', deviceFingerprint)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !locationSession) {
      return NextResponse.json(
        { error: 'Invalid or expired location session' },
        { status: 401 }
      );
    }

    // Find staff user with matching PIN in this restaurant
    const { data: staffUsers, error: staffError } = await supabase
      .from('auth_users')
      .select('id, email, pin_hash, role, full_name, full_name_th, restaurant_id, last_login_at')
      .eq('restaurant_id', locationSession.restaurant_id)
      .eq('role', 'staff')
      .eq('is_active', true);

    if (staffError) {
      console.error('Error fetching staff users:', staffError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }

    // Find matching staff by PIN
    let authenticatedStaff = null;
    for (const staff of staffUsers || []) {
      if (staff.pin_hash && await bcrypt.compare(pin, staff.pin_hash)) {
        authenticatedStaff = staff;
        break;
      }
    }

    if (!authenticatedStaff) {
      // Log failed attempt
      await supabase
        .from('audit_logs')
        .insert({
          restaurant_id: locationSession.restaurant_id,
          action: 'LOGIN',
          resource_type: 'staff_pin_auth',
          metadata: {
            action_description: 'Failed staff PIN authentication attempt',
            location_session_id: locationSessionId,
            pin_attempt: pin.replace(/./g, '*')
          },
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
          user_agent: request.headers.get('user-agent') || 'Unknown'
        });

      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Generate session token for staff user
    const userSessionToken = randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    // Create user session
    const { data: userSession, error: userSessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: authenticatedStaff.id,
        session_token: userSessionToken,
        device_id: deviceFingerprint,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        expires_at: sessionExpiresAt.toISOString(),
        session_type: 'location_bound',
        location_bound_restaurant_id: locationSession.restaurant_id
      })
      .select('id, session_token, expires_at')
      .single();

    if (userSessionError) {
      console.error('Error creating user session:', userSessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Update location session with last staff login
    await supabase
      .from('location_sessions')
      .update({
        last_staff_login_at: new Date().toISOString(),
        last_staff_user_id: authenticatedStaff.id
      })
      .eq('id', locationSessionId);

    // Update user's last login time
    await supabase
      .from('auth_users')
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq('id', authenticatedStaff.id);

    // Log successful login
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: locationSession.restaurant_id,
        user_id: authenticatedStaff.id,
        action: 'LOGIN',
        resource_type: 'staff_pin_auth',
        metadata: {
          action_description: 'Successful staff PIN authentication',
          location_session_id: locationSessionId,
          session_type: 'location_bound'
        },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        session_id: userSession.session_token
      });

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedStaff.id,
        email: authenticatedStaff.email,
        role: authenticatedStaff.role,
        fullName: authenticatedStaff.full_name,
        fullNameTh: authenticatedStaff.full_name_th,
        restaurantId: authenticatedStaff.restaurant_id,
        restaurant: locationSession.restaurants
      },
      expiresAt: userSession.expires_at,
      locationSession: {
        id: locationSession.id,
        restaurant: locationSession.restaurants
      }
    });

    // Set secure session cookie
    response.cookies.set('session_token', userSession.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiresAt,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Staff PIN login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}