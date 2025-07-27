/**
 * Schedule Push Notifications API
 * Handles scheduling of push notifications for training reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      sopId,
      sopTitle,
      dueDate,
      userId,
      scheduleTime,
      message,
      priority = 'normal'
    } = body;

    // Validate required fields
    if (!type || !scheduleTime) {
      return NextResponse.json(
        { error: 'Missing required fields: type, scheduleTime' },
        { status: 400 }
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

    // Prepare notification payload based on type
    let notificationPayload;
    
    switch (type) {
      case 'training-reminder':
        notificationPayload = {
          title: 'Training Reminder',
          body: `SOP Training Due: ${sopTitle}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: `training-reminder-${sopId}`,
          data: {
            url: `/sop/documents/${sopId}`,
            sopId,
            dueDate,
            type: 'training-reminder'
          },
          actions: [
            {
              action: 'start-training',
              title: 'Start Training',
              icon: '/icons/action-view.png'
            },
            {
              action: 'snooze',
              title: 'Remind Later',
              icon: '/icons/action-dismiss.png'
            }
          ],
          requireInteraction: true,
          vibrate: [200, 100, 200]
        };
        break;

      case 'sop-update-reminder':
        notificationPayload = {
          title: 'SOP Update Available',
          body: `${sopTitle} has been updated. Please review.`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: `sop-update-${sopId}`,
          data: {
            url: `/sop/documents/${sopId}`,
            sopId,
            type: 'sop-update'
          },
          actions: [
            {
              action: 'view-changes',
              title: 'View Changes',
              icon: '/icons/action-view.png'
            }
          ]
        };
        break;

      case 'compliance-reminder':
        notificationPayload = {
          title: 'Compliance Check',
          body: message || 'Please complete your compliance training',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: `compliance-reminder-${userId}`,
          data: {
            url: '/dashboard/compliance',
            type: 'compliance-reminder'
          },
          requireInteraction: true
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown notification type' },
          { status: 400 }
        );
    }

    // Store scheduled notification
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        type,
        sop_id: sopId,
        user_id: userId,
        scheduled_for: new Date(scheduleTime).toISOString(),
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        payload: notificationPayload,
        priority,
        status: 'scheduled',
        created_by: session.user.id,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Failed to schedule notification:', error);
      return NextResponse.json(
        { error: 'Failed to schedule notification' },
        { status: 500 }
      );
    }

    console.log(`[Push] Notification scheduled: ${type} for ${scheduleTime}`);

    return NextResponse.json({
      success: true,
      message: 'Notification scheduled successfully',
      scheduledId: data?.[0]?.id,
      scheduledFor: scheduleTime,
      type
    });

  } catch (error) {
    console.error('Schedule notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'scheduled';

    

    // Get user session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query
    let query = supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', status)
      .order('scheduled_for', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Failed to get scheduled notifications:', error);
      return NextResponse.json(
        { error: 'Failed to get scheduled notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      count: notifications?.length || 0
    });

  } catch (error) {
    console.error('Get scheduled notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID required' },
        { status: 400 }
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

    // Cancel scheduled notification
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: session.user.id
      })
      .eq('id', notificationId)
      .eq('status', 'scheduled')
      .select();

    if (error) {
      console.error('Failed to cancel notification:', error);
      return NextResponse.json(
        { error: 'Failed to cancel notification' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}