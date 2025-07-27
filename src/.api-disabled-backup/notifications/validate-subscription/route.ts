/**
 * Validate Push Subscription API
 * Checks if a push subscription is still valid
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    

    // Check if subscription exists and is active
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, is_active, created_at, user_id')
      .eq('endpoint', subscription.endpoint)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (!data.is_active) {
      return NextResponse.json(
        { error: 'Subscription is inactive' },
        { status: 410 }
      );
    }

    // Update last validated timestamp
    await supabase
      .from('push_subscriptions')
      .update({
        last_validated: new Date().toISOString()
      })
      .eq('id', data.id);

    return NextResponse.json({
      success: true,
      message: 'Subscription is valid',
      subscriptionId: data.id,
      isActive: data.is_active,
      createdAt: data.created_at,
      userId: data.user_id
    });

  } catch (error) {
    console.error('Subscription validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}