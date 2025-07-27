/**
 * Location Session Check API Route
 * Checks for existing active location session on tablet
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            // For GET requests, we don't set cookies
          },
          remove(name, options) {
            // For GET requests, we don't remove cookies
          },
        },
      }
    );
    
    // Get device fingerprint from headers or generate one
    const userAgent = request.headers.get('user-agent') || '';
    const deviceId = request.headers.get('x-device-id') || 
      Buffer.from(userAgent + new Date().getDate()).toString('base64').slice(0, 32);

    // Check for active location session for this device
    const { data: locationSessions, error } = await supabase
      .from('location_sessions')
      .select(`
        id,
        session_token,
        bound_at,
        expires_at,
        last_staff_login_at,
        restaurants (
          id,
          name,
          name_th
        ),
        auth_users!bound_by_manager_id (
          full_name,
          full_name_th
        )
      `)
      .eq('tablet_device_id', deviceId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking location session:', error);
      return NextResponse.json(
        { error: 'Failed to check location session' },
        { status: 500 }
      );
    }

    const activeSession = locationSessions?.[0];

    if (activeSession) {
      return NextResponse.json({
        success: true,
        locationSession: {
          id: activeSession.id,
          restaurant: activeSession.restaurants,
          boundByManager: activeSession.auth_users?.full_name || 'Unknown Manager',
          expiresAt: activeSession.expires_at,
          sessionToken: activeSession.session_token,
          lastStaffLogin: activeSession.last_staff_login_at
        }
      });
    }

    return NextResponse.json({
      success: true,
      locationSession: null
    });

  } catch (error) {
    console.error('Location session check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}