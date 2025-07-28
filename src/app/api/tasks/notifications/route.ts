// Restaurant Krong Thai Task Management System
// Task Notification Delivery System API
// GET /api/tasks/notifications - Get user notifications
// POST /api/tasks/notifications - Send notifications
// PUT /api/tasks/notifications - Update notification status (mark as read, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import type { 
  TaskNotification, 
  NotificationPreferences,
  NotificationChannel,
  NotificationType 
} from '@/types/task-management';

// Validation schema for notification creation
const createNotificationSchema = z.object({
  task_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  notification_type: z.enum(['task_assigned', 'task_due', 'task_overdue', 'task_completed', 'escalation', 'reminder', 'dependency_ready', 'workflow_trigger']),
  channel: z.enum(['push', 'email', 'sms', 'in_app']),
  title: z.string().min(1).max(255),
  title_fr: z.string().min(1).max(255),
  message: z.string().min(1),
  message_fr: z.string().min(1),
  scheduled_for: z.string().datetime().optional(),
  metadata: z.record(z.any()).default({})
});

// Validation schema for bulk notifications
const bulkNotificationSchema = z.object({
  user_ids: z.array(z.string().uuid()),
  notification_type: z.enum(['task_assigned', 'task_due', 'task_overdue', 'task_completed', 'escalation', 'reminder', 'dependency_ready', 'workflow_trigger']),
  channels: z.array(z.enum(['push', 'email', 'sms', 'in_app'])),
  title: z.string().min(1).max(255),
  title_fr: z.string().min(1).max(255),
  message: z.string().min(1),
  message_fr: z.string().min(1),
  task_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  scheduled_for: z.string().datetime().optional(),
  metadata: z.record(z.any()).default({})
});

// Validation schema for notification updates
const updateNotificationSchema = z.object({
  notification_ids: z.array(z.string().uuid()),
  action: z.enum(['mark_read', 'mark_unread', 'mark_clicked', 'mark_delivered', 'mark_failed']),
  failure_reason: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    const unread_only = searchParams.get('unread_only') === 'true';
    const channel = searchParams.get('channel') as NotificationChannel;
    const type = searchParams.get('type') as NotificationType;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query
    let query = supabase
      .from('task_notifications')
      .select(`
        id, task_id, workflow_id, notification_type, channel,
        title, title_fr, message, message_fr, scheduled_for,
        sent_at, delivered_at, read_at, clicked_at, failed_at,
        failure_reason, retry_count, metadata,
        task:tasks(id, title, title_fr, status, priority),
        workflow:task_workflows(id, name, name_fr)
      `)
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: false });
    
    // Apply filters
    if (unread_only) {
      query = query.is('read_at', null);
    }
    
    if (channel) {
      query = query.eq('channel', channel);
    }
    
    if (type) {
      query = query.eq('notification_type', type);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: notifications, error: notificationsError } = await query;
    
    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications', success: false },
        { status: 500 }
      );
    }
    
    // Get notification counts
    const { data: counts } = await supabase
      .from('task_notifications')
      .select('read_at, notification_type')
      .eq('user_id', user.id);
    
    const notificationCounts = {
      total: counts?.length || 0,
      unread: counts?.filter(n => !n.read_at).length || 0,
      by_type: counts?.reduce((acc, n) => {
        acc[n.notification_type] = (acc[n.notification_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };
    
    // Get user notification preferences
    const { data: userRecord } = await supabase
      .from('auth_users')
      .select('restaurant_id, settings')
      .eq('id', user.id)
      .single();
    
    const preferences = userRecord?.settings?.notification_preferences || getDefaultNotificationPreferences();
    
    return NextResponse.json({
      data: {
        notifications: notifications || [],
        counts: notificationCounts,
        preferences: preferences,
        pagination: {
          limit,
          offset,
          has_more: notifications?.length === limit
        }
      },
      success: true
    });
    
  } catch (error) {
    console.error('Error in GET /api/tasks/notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('op') || 'single'; // 'single', 'bulk', 'scheduled'
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    // Get user's restaurant and role
    const { data: userRecord, error: userError } = await supabase
      .from('auth_users')
      .select('restaurant_id, role')
      .eq('id', user.id)
      .single();
    
    if (userError || !userRecord) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    
    switch (operation) {
      case 'single':
        return handleSingleNotification(supabase, body, userRecord);
      case 'bulk':
        return handleBulkNotifications(supabase, body, userRecord);
      case 'scheduled':
        return handleScheduledNotifications(supabase, userRecord.restaurant_id);
      default:
        return NextResponse.json(
          { error: 'Invalid operation', success: false },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error in POST /api/tasks/notifications:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.errors,
          success: false 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const validatedData = updateNotificationSchema.parse(body);
    
    // Verify user owns these notifications
    const { data: notifications, error: verifyError } = await supabase
      .from('task_notifications')
      .select('id, user_id')
      .in('id', validatedData.notification_ids)
      .eq('user_id', user.id);
    
    if (verifyError || !notifications || notifications.length !== validatedData.notification_ids.length) {
      return NextResponse.json(
        { error: 'Invalid notification IDs or access denied', success: false },
        { status: 404 }
      );
    }
    
    // Prepare update data based on action
    let updateData: any = {};
    const now = new Date().toISOString();
    
    switch (validatedData.action) {
      case 'mark_read':
        updateData.read_at = now;
        break;
      case 'mark_unread':
        updateData.read_at = null;
        break;
      case 'mark_clicked':
        updateData.clicked_at = now;
        if (!updateData.read_at) {
          updateData.read_at = now; // Auto-mark as read when clicked
        }
        break;
      case 'mark_delivered':
        updateData.delivered_at = now;
        break;
      case 'mark_failed':
        updateData.failed_at = now;
        updateData.failure_reason = validatedData.failure_reason;
        break;
    }
    
    // Update notifications
    const { data: updatedNotifications, error: updateError } = await supabase
      .from('task_notifications')
      .update(updateData)
      .in('id', validatedData.notification_ids)
      .select('id, notification_type, read_at, clicked_at');
    
    if (updateError) {
      console.error('Error updating notifications:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notifications', success: false },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: {
        updated_notifications: updatedNotifications,
        action: validatedData.action,
        updated_count: updatedNotifications?.length || 0
      },
      message: `Successfully ${validatedData.action.replace('_', ' ')} ${updatedNotifications?.length || 0} notification(s)`,
      success: true
    });
    
  } catch (error) {
    console.error('Error in PUT /api/tasks/notifications:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.errors,
          success: false 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// Helper functions
async function handleSingleNotification(
  supabase: any,
  body: any,
  userRecord: any
) {
  const validatedData = createNotificationSchema.parse(body);
  
  // Verify target user exists and is in the same restaurant
  const { data: targetUser, error: userError } = await supabase
    .from('auth_users')
    .select('id, restaurant_id, settings')
    .eq('id', validatedData.user_id)
    .eq('restaurant_id', userRecord.restaurant_id)
    .single();
  
  if (userError || !targetUser) {
    return NextResponse.json(
      { error: 'Target user not found or not in same restaurant', success: false },
      { status: 404 }
    );
  }
  
  // Check user notification preferences
  const preferences = targetUser.settings?.notification_preferences || getDefaultNotificationPreferences();
  
  if (!shouldSendNotification(validatedData.notification_type, validatedData.channel, preferences)) {
    return NextResponse.json({
      data: { skipped: true, reason: 'User preferences block this notification' },
      message: 'Notification skipped due to user preferences',
      success: true
    });
  }
  
  // Create notification
  const notificationData = {
    ...validatedData,
    scheduled_for: validatedData.scheduled_for || new Date().toISOString(),
    retry_count: 0,
    metadata: validatedData.metadata
  };
  
  const { data: notification, error: createError } = await supabase
    .from('task_notifications')
    .insert(notificationData)
    .select('*')
    .single();
  
  if (createError) {
    console.error('Error creating notification:', createError);
    return NextResponse.json(
      { error: 'Failed to create notification', success: false },
      { status: 500 }
    );
  }
  
  // Attempt immediate delivery for in-app notifications
  if (validatedData.channel === 'in_app') {
    await supabase
      .from('task_notifications')
      .update({ 
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString()
      })
      .eq('id', notification.id);
  }
  
  return NextResponse.json({
    data: notification,
    message: 'Notification created successfully',
    success: true
  });
}

async function handleBulkNotifications(
  supabase: any,
  body: any,
  userRecord: any
) {
  const validatedData = bulkNotificationSchema.parse(body);
  
  // Verify all target users exist and are in the same restaurant
  const { data: targetUsers, error: usersError } = await supabase
    .from('auth_users')
    .select('id, settings')
    .in('id', validatedData.user_ids)
    .eq('restaurant_id', userRecord.restaurant_id);
  
  if (usersError || !targetUsers || targetUsers.length !== validatedData.user_ids.length) {
    return NextResponse.json(
      { error: 'Some target users not found or not in same restaurant', success: false },
      { status: 404 }
    );
  }
  
  const notifications = [];
  const skipped = [];
  
  // Create notifications for each user and channel combination
  for (const userId of validatedData.user_ids) {
    const user = targetUsers.find(u => u.id === userId);
    const preferences = user?.settings?.notification_preferences || getDefaultNotificationPreferences();
    
    for (const channel of validatedData.channels) {
      if (shouldSendNotification(validatedData.notification_type, channel, preferences)) {
        notifications.push({
          task_id: validatedData.task_id,
          workflow_id: validatedData.workflow_id,
          user_id: userId,
          notification_type: validatedData.notification_type,
          channel: channel,
          title: validatedData.title,
          title_fr: validatedData.title_fr,
          message: validatedData.message,
          message_fr: validatedData.message_fr,
          scheduled_for: validatedData.scheduled_for || new Date().toISOString(),
          retry_count: 0,
          metadata: validatedData.metadata
        });
      } else {
        skipped.push({ user_id: userId, channel, reason: 'User preferences' });
      }
    }
  }
  
  if (notifications.length === 0) {
    return NextResponse.json({
      data: { created: [], skipped },
      message: 'All notifications skipped due to user preferences',
      success: true
    });
  }
  
  // Bulk insert notifications
  const { data: createdNotifications, error: createError } = await supabase
    .from('task_notifications')
    .insert(notifications)
    .select('id, user_id, channel');
  
  if (createError) {
    console.error('Error creating bulk notifications:', createError);
    return NextResponse.json(
      { error: 'Failed to create bulk notifications', success: false },
      { status: 500 }
    );
  }
  
  // Mark in-app notifications as sent/delivered immediately
  const inAppNotifications = createdNotifications?.filter(n => n.channel === 'in_app') || [];
  if (inAppNotifications.length > 0) {
    const now = new Date().toISOString();
    await supabase
      .from('task_notifications')
      .update({ sent_at: now, delivered_at: now })
      .in('id', inAppNotifications.map(n => n.id));
  }
  
  return NextResponse.json({
    data: {
      created: createdNotifications || [],
      skipped,
      total_created: createdNotifications?.length || 0,
      total_skipped: skipped.length
    },
    message: `Created ${createdNotifications?.length || 0} notifications, skipped ${skipped.length}`,
    success: true
  });
}

async function handleScheduledNotifications(
  supabase: any,
  restaurantId: string
) {
  // This would typically be called by a scheduled job
  const now = new Date().toISOString();
  
  // Get pending scheduled notifications
  const { data: pendingNotifications, error: pendingError } = await supabase
    .from('task_notifications')
    .select('*')
    .lte('scheduled_for', now)
    .is('sent_at', null)
    .lt('retry_count', 3) // Max 3 retries
    .limit(100); // Process in batches
  
  if (pendingError) {
    throw pendingError;
  }
  
  if (!pendingNotifications || pendingNotifications.length === 0) {
    return NextResponse.json({
      data: { processed: 0, successful: 0, failed: 0 },
      message: 'No pending notifications to process',
      success: true
    });
  }
  
  const results = {
    processed: pendingNotifications.length,
    successful: 0,
    failed: 0,
    details: [] as any[]
  };
  
  for (const notification of pendingNotifications) {
    try {
      const deliveryResult = await deliverNotification(notification);
      
      if (deliveryResult.success) {
        await supabase
          .from('task_notifications')
          .update({
            sent_at: now,
            delivered_at: deliveryResult.delivered_at || now
          })
          .eq('id', notification.id);
        
        results.successful++;
      } else {
        await supabase
          .from('task_notifications')
          .update({
            failed_at: now,
            failure_reason: deliveryResult.error,
            retry_count: notification.retry_count + 1
          })
          .eq('id', notification.id);
        
        results.failed++;
      }
      
      results.details.push({
        notification_id: notification.id,
        channel: notification.channel,
        success: deliveryResult.success,
        error: deliveryResult.error
      });
      
    } catch (error) {
      results.failed++;
      results.details.push({
        notification_id: notification.id,
        channel: notification.channel,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return NextResponse.json({
    data: results,
    message: `Processed ${results.processed} notifications: ${results.successful} successful, ${results.failed} failed`,
    success: true
  });
}

// Mock notification delivery function (would integrate with real services)
async function deliverNotification(notification: any) {
  // Simulate delivery based on channel
  switch (notification.channel) {
    case 'in_app':
      return { success: true, delivered_at: new Date().toISOString() };
      
    case 'email':
      // Would integrate with email service (SendGrid, AWS SES, etc.)
      // For now, simulate success/failure
      return Math.random() > 0.1 
        ? { success: true, delivered_at: new Date().toISOString() }
        : { success: false, error: 'Email delivery failed' };
        
    case 'sms':
      // Would integrate with SMS service (Twilio, AWS SNS, etc.)
      return Math.random() > 0.05
        ? { success: true, delivered_at: new Date().toISOString() }
        : { success: false, error: 'SMS delivery failed' };
        
    case 'push':
      // Would integrate with push notification service (FCM, APNS, etc.)
      return Math.random() > 0.15
        ? { success: true, delivered_at: new Date().toISOString() }
        : { success: false, error: 'Push notification failed' };
        
    default:
      return { success: false, error: 'Unknown notification channel' };
  }
}

function shouldSendNotification(
  type: NotificationType,
  channel: NotificationChannel,
  preferences: NotificationPreferences
): boolean {
  // Check if channel is enabled
  if (!preferences.channels[channel]) {
    return false;
  }
  
  // Check if notification type is enabled
  if (!preferences.notification_types[type]) {
    return false;
  }
  
  // Check quiet hours (only for non-urgent notifications)
  if (preferences.quiet_hours.enabled && !['escalation', 'task_overdue'].includes(type)) {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(preferences.quiet_hours.start_time.split(':')[0]);
    const endHour = parseInt(preferences.quiet_hours.end_time.split(':')[0]);
    
    if (startHour <= endHour) {
      // Same day quiet hours
      if (currentHour >= startHour && currentHour < endHour) {
        return false;
      }
    } else {
      // Overnight quiet hours
      if (currentHour >= startHour || currentHour < endHour) {
        return false;
      }
    }
  }
  
  return true;
}

function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    user_id: '',
    channels: {
      push: true,
      email: true,
      sms: false,
      in_app: true
    },
    notification_types: {
      task_assigned: true,
      task_due: true,
      task_overdue: true,
      escalation: true,
      workflow_updates: true,
      performance_reports: false
    },
    quiet_hours: {
      enabled: true,
      start_time: '22:00',
      end_time: '07:00',
      timezone: 'Asia/Bangkok'
    },
    frequency_limits: {
      max_per_hour: 10,
      max_per_day: 50,
      batch_similar: true
    }
  };
}