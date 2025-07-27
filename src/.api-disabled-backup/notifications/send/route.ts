/**
 * Send Push Notifications API
 * Handles sending push notifications to subscribed users
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import webpush from 'web-push';

// Configure VAPID keys (these should be in environment variables)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@krongthaisop.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload, targetUsers = 'all', priority = 'normal' } = body;

    // Validate required fields
    if (!payload || !payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Invalid notification payload' },
        { status: 400 }
      );
    }

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push] VAPID keys not configured');
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 500 }
      );
    }


    // Get user session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get active subscriptions based on target
    let subscriptionsQuery = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (targetUsers !== 'all' && Array.isArray(targetUsers)) {
      subscriptionsQuery = subscriptionsQuery.in('user_id', targetUsers);
    }

    const { data: subscriptions, error } = await subscriptionsQuery;

    if (error) {
      console.error('Failed to get subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to get subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        sent: 0,
        failed: 0
      });
    }

    // Prepare notification data
    const notificationData: NotificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      image: payload.image,
      tag: payload.tag || `notification-${Date.now()}`,
      data: {
        url: payload.data?.url || '/dashboard',
        timestamp: Date.now(),
        type,
        priority,
        ...payload.data
      },
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || priority === 'high',
      vibrate: payload.vibrate || (priority === 'high' ? [200, 100, 200] : [100])
    };

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          };

          await webpush.sendNotification(
            subscription,
            JSON.stringify(notificationData),
            {
              TTL: priority === 'high' ? 86400 : 3600, // 24h for high priority, 1h for normal
              urgency: priority === 'high' ? 'high' : 'normal'
            }
          );

          // Log successful send
          await supabase
            .from('notification_logs')
            .insert({
              subscription_id: sub.id,
              notification_type: type,
              payload: notificationData,
              status: 'sent',
              sent_at: new Date().toISOString()
            });

          return { success: true, subscriptionId: sub.id };
        } catch (error: any) {
          // Log failed send
          await supabase
            .from('notification_logs')
            .insert({
              subscription_id: sub.id,
              notification_type: type,
              payload: notificationData,
              status: 'failed',
              error_message: error.message,
              sent_at: new Date().toISOString()
            });

          // If subscription is invalid, mark it as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }

          console.error(`[Push] Failed to send to subscription ${sub.id}:`, error);
          return { success: false, subscriptionId: sub.id, error: error.message };
        }
      })
    );

    // Count results
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    const failed = results.length - successful;

    console.log(`[Push] Notification sent: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${successful} devices`,
      sent: successful,
      failed,
      total: results.length,
      type,
      priority
    });

  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test endpoint for development
export async function GET(request: NextRequest) {
  try {
    
    // Get notification statistics
    const { data: stats, error } = await supabase
      .from('notification_logs')
      .select('status, notification_type, sent_at')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Failed to get notification stats:', error);
      return NextResponse.json(
        { error: 'Failed to get statistics' },
        { status: 500 }
      );
    }

    const totalSent = stats?.filter(s => s.status === 'sent').length || 0;
    const totalFailed = stats?.filter(s => s.status === 'failed').length || 0;
    const byType = stats?.reduce((acc: any, s) => {
      acc[s.notification_type] = (acc[s.notification_type] || 0) + 1;
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      statistics: {
        last24Hours: {
          sent: totalSent,
          failed: totalFailed,
          total: totalSent + totalFailed
        },
        byType,
        vapidConfigured: !!(vapidPublicKey && vapidPrivateKey)
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}