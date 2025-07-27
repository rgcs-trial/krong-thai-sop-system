/**
 * Emergency Push Notifications API
 * Handles high-priority emergency notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import webpush from 'web-push';

// Configure VAPID keys for emergency notifications
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, priority = 'high', immediate = true } = body;

    // Validate emergency notification payload
    if (!payload || !payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Invalid emergency notification payload' },
        { status: 400 }
      );
    }

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Emergency] VAPID keys not configured');
      return NextResponse.json(
        { error: 'Emergency notifications not configured' },
        { status: 500 }
      );
    }

    

    // Emergency notifications require admin privileges
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role (implement based on your auth system)
    // For now, we'll assume any authenticated user can send emergency notifications
    // In production, add proper role checking

    // Get ALL active subscriptions for emergency
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to get emergency subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to get subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions for emergency notification',
        sent: 0,
        failed: 0
      });
    }

    // Enhanced emergency notification payload
    const emergencyNotification = {
      title: `🚨 EMERGENCY: ${payload.title}`,
      body: payload.body,
      icon: payload.icon || '/icons/emergency-icon.png',
      badge: payload.badge || '/icons/emergency-badge.png',
      image: payload.image,
      tag: `emergency-${Date.now()}`,
      data: {
        url: payload.data?.url || '/sop/emergency',
        timestamp: Date.now(),
        type: 'emergency',
        priority: 'critical',
        category: payload.data?.category || 'general',
        ...payload.data
      },
      actions: [
        {
          action: 'acknowledge',
          title: 'Acknowledge',
          icon: '/icons/action-view.png'
        },
        {
          action: 'view-procedures',
          title: 'View Procedures',
          icon: '/icons/action-view.png'
        }
      ],
      requireInteraction: true,
      silent: false,
      vibrate: [500, 200, 500, 200, 500, 200, 500] // Strong vibration pattern
    };

    // Log emergency notification
    const { data: logEntry } = await supabase
      .from('emergency_notifications')
      .insert({
        title: payload.title,
        message: payload.body,
        category: payload.data?.category || 'general',
        sent_by: session.user.id,
        sent_at: new Date().toISOString(),
        payload: emergencyNotification
      })
      .select()
      .single();

    // Send emergency notifications with high urgency
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
            JSON.stringify(emergencyNotification),
            {
              TTL: 86400, // 24 hours
              urgency: 'high',
              headers: {
                'Topic': 'emergency'
              }
            }
          );

          // Log successful emergency send
          await supabase
            .from('notification_logs')
            .insert({
              subscription_id: sub.id,
              notification_type: 'emergency',
              emergency_notification_id: logEntry?.id,
              payload: emergencyNotification,
              status: 'sent',
              sent_at: new Date().toISOString()
            });

          return { success: true, subscriptionId: sub.id };
        } catch (error: any) {
          console.error(`[Emergency] Failed to send to subscription ${sub.id}:`, error);

          // Log failed emergency send
          await supabase
            .from('notification_logs')
            .insert({
              subscription_id: sub.id,
              notification_type: 'emergency',
              emergency_notification_id: logEntry?.id,
              payload: emergencyNotification,
              status: 'failed',
              error_message: error.message,
              sent_at: new Date().toISOString()
            });

          // Mark invalid subscriptions as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }

          return { success: false, subscriptionId: sub.id, error: error.message };
        }
      })
    );

    // Count results
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    const failed = results.length - successful;

    // Update emergency notification log with results
    if (logEntry) {
      await supabase
        .from('emergency_notifications')
        .update({
          total_sent: successful,
          total_failed: failed,
          delivery_completed_at: new Date().toISOString()
        })
        .eq('id', logEntry.id);
    }

    console.log(`[Emergency] Emergency notification sent: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Emergency notification sent to ${successful} devices`,
      sent: successful,
      failed,
      total: results.length,
      emergencyId: logEntry?.id,
      priority: 'critical'
    });

  } catch (error) {
    console.error('Emergency notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    
    
    // Get emergency notification history (requires admin access)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: emergencyHistory, error } = await supabase
      .from('emergency_notifications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to get emergency history:', error);
      return NextResponse.json(
        { error: 'Failed to get emergency history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emergencyHistory: emergencyHistory || [],
      count: emergencyHistory?.length || 0
    });

  } catch (error) {
    console.error('Get emergency history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}