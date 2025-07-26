/**
 * Location Session Create API Route
 * Creates a new location-bound session for restaurant tablet
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

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
    const { restaurantId, deviceFingerprint, managerId } = await request.json();

    // Validate required fields
    if (!restaurantId || !deviceFingerprint || !managerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify manager permissions
    const { data: manager, error: managerError } = await supabase
      .from('auth_users')
      .select('id, role, restaurant_id, full_name, full_name_th')
      .eq('id', managerId)
      .eq('is_active', true)
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { error: 'Manager not found or inactive' },
        { status: 403 }
      );
    }

    if (!['admin', 'manager'].includes(manager.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // For managers, ensure they can only bind their own restaurant
    if (manager.role === 'manager' && manager.restaurant_id !== restaurantId) {
      return NextResponse.json(
        { error: 'Cannot bind to this restaurant location' },
        { status: 403 }
      );
    }

    // Verify restaurant exists and is active
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, name_th, is_active')
      .eq('id', restaurantId)
      .eq('is_active', true)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or inactive' },
        { status: 404 }
      );
    }

    // Deactivate any existing sessions for this device
    await supabase
      .from('location_sessions')
      .update({ is_active: false })
      .eq('tablet_device_id', deviceFingerprint);

    // Generate session token and expiry (8 hours)
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now

    // Create new location session
    const { data: locationSession, error: sessionError } = await supabase
      .from('location_sessions')
      .insert({
        restaurant_id: restaurantId,
        tablet_device_id: deviceFingerprint,
        bound_by_manager_id: managerId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        metadata: {
          created_by_ip: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
          user_agent: request.headers.get('user-agent') || 'Unknown'
        }
      })
      .select(`
        id,
        session_token,
        bound_at,
        expires_at,
        restaurants (
          id,
          name,
          name_th
        )
      `)
      .single();

    if (sessionError) {
      console.error('Error creating location session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create location session' },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: restaurantId,
        user_id: managerId,
        action: 'CREATE',
        resource_type: 'location_session',
        resource_id: locationSession.id,
        new_values: {
          restaurant_id: restaurantId,
          device_fingerprint: deviceFingerprint,
          expires_at: expiresAt.toISOString()
        },
        metadata: {
          action_description: 'Manager bound tablet to restaurant location',
          session_duration_hours: 8
        },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || 'Unknown'
      });

    return NextResponse.json({
      success: true,
      locationSession: {
        id: locationSession.id,
        restaurant: locationSession.restaurants,
        boundByManager: manager.full_name,
        expiresAt: locationSession.expires_at,
        sessionToken: locationSession.session_token
      }
    });

  } catch (error) {
    console.error('Location session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}