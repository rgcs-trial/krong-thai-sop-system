/**
 * Push Notification Subscription API
 * Handles subscription registration for push notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userAgent, timestamp } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }


    // Get user session (if available)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // Store subscription in database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys?.p256dh || null,
        auth_key: subscription.keys?.auth || null,
        user_id: userId,
        user_agent: userAgent,
        created_at: new Date(timestamp).toISOString(),
        is_active: true,
        subscription_data: subscription
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Failed to store subscription:', error);
      return NextResponse.json(
        { error: 'Failed to store subscription' },
        { status: 500 }
      );
    }

    console.log('[Push] Subscription registered:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      userId,
      timestamp: new Date(timestamp).toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription registered successfully',
      subscriptionId: data?.[0]?.id
    });

  } catch (error) {
    console.error('Subscription registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    
    // Get subscription statistics (for admin dashboard)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: stats, error } = await supabase
      .from('push_subscriptions')
      .select('id, created_at, is_active, user_agent')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to get subscription stats:', error);
      return NextResponse.json(
        { error: 'Failed to get statistics' },
        { status: 500 }
      );
    }

    const totalSubscriptions = stats?.length || 0;
    const recentSubscriptions = stats?.filter(sub => {
      const created = new Date(sub.created_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return created > dayAgo;
    }).length || 0;

    return NextResponse.json({
      success: true,
      statistics: {
        totalSubscriptions,
        recentSubscriptions,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get subscription stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}