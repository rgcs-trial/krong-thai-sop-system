// Restaurant Krong Thai Task Management System
// Task Escalation and Workflow Engine API
// POST /api/tasks/escalation - Process task escalations
// GET /api/tasks/escalation - Get escalation rules and pending escalations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import type { TaskEscalationRule } from '@/types/task-management';

// Validation schema for escalation rules
const escalationRuleSchema = z.object({
  task_type: z.enum(['sop_execution', 'cleaning', 'maintenance', 'training', 'audit', 'inventory', 'customer_service', 'admin', 'custom']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent']).optional(),
  overdue_minutes: z.number().int().positive(),
  escalate_to_role: z.enum(['admin', 'manager', 'staff']),
  escalate_to_users: z.array(z.string().uuid()).optional(),
  notification_channels: z.array(z.enum(['push', 'email', 'sms', 'in_app'])),
  auto_reassign: z.boolean().default(false),
  max_escalations: z.number().int().positive().max(5).default(3)
});

// Validation schema for manual escalation
const manualEscalationSchema = z.object({
  task_id: z.string().uuid(),
  escalate_to: z.string().uuid().optional(),
  escalate_to_role: z.enum(['admin', 'manager', 'staff']).optional(),
  reason: z.string().min(1).max(500),
  urgent: z.boolean().default(false)
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
    
    const type = searchParams.get('type') || 'pending'; // 'pending', 'rules', 'history'
    
    let response: any = { success: true };
    
    if (type === 'pending' || type === 'all') {
      // Get tasks that need escalation (overdue tasks)
      const now = new Date().toISOString();
      
      let overdueQuery = supabase
        .from('tasks')
        .select(`
          id, title, title_fr, task_type, priority, status,
          due_date, assigned_to, created_at, 
          estimated_duration_minutes, actual_duration_minutes,
          assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr, email),
          creator:auth_users!tasks_created_by_fkey(id, full_name, full_name_fr)
        `)
        .eq('restaurant_id', userRecord.restaurant_id)
        .lt('due_date', now)
        .not('status', 'in', ['completed', 'cancelled']);
      
      // Role-based filtering
      if (userRecord.role === 'staff') {
        overdueQuery = overdueQuery.eq('assigned_to', user.id);
      }
      
      const { data: overdueTasks, error: overdueError } = await overdueQuery;
      
      if (overdueError) {
        console.error('Error fetching overdue tasks:', overdueError);
        return NextResponse.json(
          { error: 'Failed to fetch overdue tasks', success: false },
          { status: 500 }
        );
      }
      
      // Calculate escalation levels for each task
      const escalationTasks = overdueTasks?.map(task => {
        const overdueMinutes = Math.floor(
          (new Date().getTime() - new Date(task.due_date).getTime()) / 60000
        );
        
        let escalationLevel = 0;
        if (overdueMinutes > 60) escalationLevel = 1;      // 1 hour overdue
        if (overdueMinutes > 240) escalationLevel = 2;     // 4 hours overdue
        if (overdueMinutes > 720) escalationLevel = 3;     // 12 hours overdue
        
        return {
          ...task,
          overdue_minutes: overdueMinutes,
          escalation_level: escalationLevel,
          requires_escalation: escalationLevel > 0
        };
      }).filter(task => task.requires_escalation) || [];
      
      response.pending_escalations = escalationTasks;
    }
    
    if (type === 'rules' || type === 'all') {
      // Get escalation rules (would be stored in restaurant settings or dedicated table)
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('settings')
        .eq('id', userRecord.restaurant_id)
        .single();
      
      const escalationRules = restaurant?.settings?.escalation_rules || [
        {
          id: 'default-high',
          priority: 'high',
          overdue_minutes: 60,
          escalate_to_role: 'manager',
          notification_channels: ['in_app', 'email'],
          auto_reassign: false,
          max_escalations: 3
        },
        {
          id: 'default-critical',
          priority: 'critical',
          overdue_minutes: 30,
          escalate_to_role: 'admin',
          notification_channels: ['in_app', 'email', 'sms'],
          auto_reassign: true,
          max_escalations: 2
        }
      ];
      
      response.escalation_rules = escalationRules;
    }
    
    if (type === 'history' || type === 'all') {
      // Get escalation history from audit logs
      const { data: escalationHistory } = await supabase
        .from('audit_logs')
        .select(`
          id, created_at, user_id, resource_id, metadata,
          user:auth_users(full_name, full_name_fr, role)
        `)
        .eq('restaurant_id', userRecord.restaurant_id)
        .eq('resource_type', 'tasks')
        .eq('action', 'UPDATE')
        .contains('metadata', { operation: 'escalation' })
        .order('created_at', { ascending: false })
        .limit(50);
      
      response.escalation_history = escalationHistory || [];
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in GET /api/tasks/escalation:', error);
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
    const operation = searchParams.get('op') || 'manual'; // 'manual', 'auto', 'rules'
    
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
      case 'manual':
        return handleManualEscalation(supabase, body, user.id, userRecord);
      case 'auto':
        return handleAutoEscalation(supabase, userRecord.restaurant_id);
      case 'rules':
        return handleUpdateEscalationRules(supabase, body, userRecord);
      default:
        return NextResponse.json(
          { error: 'Invalid operation', success: false },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error in POST /api/tasks/escalation:', error);
    
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

async function handleManualEscalation(
  supabase: any,
  body: any,
  escalatedBy: string,
  userRecord: any
) {
  const validatedData = manualEscalationSchema.parse(body);
  
  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', validatedData.task_id)
    .eq('restaurant_id', userRecord.restaurant_id)
    .single();
  
  if (taskError || !task) {
    return NextResponse.json(
      { error: 'Task not found', success: false },
      { status: 404 }
    );
  }
  
  // Check permissions
  const canEscalate = 
    userRecord.role === 'admin' ||
    userRecord.role === 'manager' ||
    task.assigned_to === escalatedBy ||
    task.created_by === escalatedBy;
  
  if (!canEscalate) {
    return NextResponse.json(
      { error: 'Insufficient permissions to escalate task', success: false },
      { status: 403 }
    );
  }
  
  let escalateToUsers: string[] = [];
  
  // Find escalation targets
  if (validatedData.escalate_to) {
    // Specific user escalation
    const { data: targetUser, error: targetError } = await supabase
      .from('auth_users')
      .select('id, role')
      .eq('id', validatedData.escalate_to)
      .eq('restaurant_id', userRecord.restaurant_id)
      .single();
    
    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Invalid escalation target', success: false },
        { status: 400 }
      );
    }
    
    escalateToUsers = [validatedData.escalate_to];
  } else if (validatedData.escalate_to_role) {
    // Role-based escalation
    const { data: roleUsers, error: roleError } = await supabase
      .from('auth_users')
      .select('id, full_name, full_name_fr')
      .eq('restaurant_id', userRecord.restaurant_id)
      .eq('role', validatedData.escalate_to_role)
      .eq('is_active', true);
    
    if (roleError || !roleUsers || roleUsers.length === 0) {
      return NextResponse.json(
        { error: `No active users found with role: ${validatedData.escalate_to_role}`, success: false },
        { status: 400 }
      );
    }
    
    escalateToUsers = roleUsers.map(u => u.id);
  } else {
    // Default escalation to managers/admins
    const { data: managers, error: managerError } = await supabase
      .from('auth_users')
      .select('id')
      .eq('restaurant_id', userRecord.restaurant_id)
      .in('role', ['admin', 'manager'])
      .eq('is_active', true);
    
    if (managerError || !managers || managers.length === 0) {
      return NextResponse.json(
        { error: 'No managers or admins available for escalation', success: false },
        { status: 400 }
      );
    }
    
    escalateToUsers = managers.map(m => m.id);
  }
  
  // Update task status
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'escalated',
      priority: validatedData.urgent ? 'urgent' : task.priority,
      updated_by: escalatedBy,
      updated_at: new Date().toISOString(),
      metadata: {
        ...task.metadata,
        escalation: {
          escalated_at: new Date().toISOString(),
          escalated_by: escalatedBy,
          escalation_reason: validatedData.reason,
          escalation_level: (task.metadata?.escalation?.escalation_level || 0) + 1
        }
      }
    })
    .eq('id', validatedData.task_id)
    .select('*')
    .single();
  
  if (updateError) {
    console.error('Error updating task for escalation:', updateError);
    return NextResponse.json(
      { error: 'Failed to escalate task', success: false },
      { status: 500 }
    );
  }
  
  // Create notifications for escalation targets
  const notifications = escalateToUsers.map(userId => ({
    task_id: validatedData.task_id,
    user_id: userId,
    notification_type: 'escalation',
    channel: 'in_app',
    title: `Task Escalated: ${task.title}`,
    title_fr: `Tâche escaladée: ${task.title_fr}`,
    message: `Task has been escalated. Reason: ${validatedData.reason}`,
    message_fr: `La tâche a été escaladée. Raison: ${validatedData.reason}`,
    metadata: {
      task_id: validatedData.task_id,
      escalation_reason: validatedData.reason,
      escalated_by: escalatedBy,
      urgent: validatedData.urgent
    }
  }));
  
  const { error: notificationError } = await supabase
    .from('task_notifications')
    .insert(notifications);
  
  if (notificationError) {
    console.warn('Failed to create escalation notifications:', notificationError);
  }
  
  // Log escalation in audit trail
  await supabase
    .from('audit_logs')
    .insert({
      restaurant_id: userRecord.restaurant_id,
      user_id: escalatedBy,
      action: 'UPDATE',
      resource_type: 'tasks',
      resource_id: validatedData.task_id,
      old_values: { status: task.status, priority: task.priority },
      new_values: { status: 'escalated', priority: updatedTask.priority },
      metadata: {
        operation: 'escalation',
        escalation_reason: validatedData.reason,
        escalated_to_users: escalateToUsers,
        escalation_type: 'manual'
      }
    });
  
  return NextResponse.json({
    data: {
      task: updatedTask,
      escalated_to: escalateToUsers,
      escalation_level: updatedTask.metadata?.escalation?.escalation_level || 1
    },
    message: `Task escalated to ${escalateToUsers.length} user(s)`,
    success: true
  });
}

async function handleAutoEscalation(
  supabase: any,
  restaurantId: string
) {
  // This would typically be called by a scheduled job/cron
  const now = new Date();
  const escalatedTasks = [];
  const errors = [];
  
  // Get overdue tasks that haven't been escalated recently
  const { data: overdueTasks, error: overdueError } = await supabase
    .from('tasks')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .lt('due_date', now.toISOString())
    .not('status', 'in', ['completed', 'cancelled', 'escalated']);
  
  if (overdueError) {
    return NextResponse.json(
      { error: 'Failed to fetch overdue tasks', success: false },
      { status: 500 }
    );
  }
  
  if (!overdueTasks || overdueTasks.length === 0) {
    return NextResponse.json({
      data: { escalated_tasks: [], total_processed: 0 },
      message: 'No tasks require auto-escalation',
      success: true
    });
  }
  
  // Get escalation rules
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('settings')
    .eq('id', restaurantId)
    .single();
  
  const escalationRules = restaurant?.settings?.escalation_rules || [];
  
  for (const task of overdueTasks) {
    try {
      const overdueMinutes = Math.floor(
        (now.getTime() - new Date(task.due_date).getTime()) / 60000
      );
      
      // Find applicable escalation rule
      const applicableRule = escalationRules.find((rule: any) => {
        if (rule.task_type && rule.task_type !== task.task_type) return false;
        if (rule.priority && rule.priority !== task.priority) return false;
        return overdueMinutes >= rule.overdue_minutes;
      });
      
      if (!applicableRule) continue;
      
      // Check if already escalated too many times
      const currentEscalationLevel = task.metadata?.escalation?.escalation_level || 0;
      if (currentEscalationLevel >= applicableRule.max_escalations) continue;
      
      // Find escalation targets
      const { data: escalationTargets } = await supabase
        .from('auth_users')
        .select('id, email, full_name')
        .eq('restaurant_id', restaurantId)
        .eq('role', applicableRule.escalate_to_role)
        .eq('is_active', true);
      
      if (!escalationTargets || escalationTargets.length === 0) continue;
      
      // Update task
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'escalated',
          updated_at: now.toISOString(),
          metadata: {
            ...task.metadata,
            escalation: {
              escalated_at: now.toISOString(),
              escalation_reason: `Auto-escalated: ${overdueMinutes} minutes overdue`,
              escalation_level: currentEscalationLevel + 1,
              auto_escalated: true,
              rule_applied: applicableRule.id
            }
          }
        })
        .eq('id', task.id);
      
      if (updateError) {
        errors.push({ task_id: task.id, error: updateError.message });
        continue;
      }
      
      // Create notifications
      const notifications = escalationTargets.map((target: any) => ({
        task_id: task.id,
        user_id: target.id,
        notification_type: 'escalation',
        channel: 'in_app',
        title: `Auto-Escalated Task: ${task.title}`,
        title_fr: `Tâche auto-escaladée: ${task.title_fr}`,
        message: `Task automatically escalated due to being ${overdueMinutes} minutes overdue`,
        message_fr: `Tâche automatiquement escaladée car en retard de ${overdueMinutes} minutes`,
        metadata: {
          task_id: task.id,
          auto_escalated: true,
          overdue_minutes: overdueMinutes,
          escalation_rule: applicableRule.id
        }
      }));
      
      await supabase
        .from('task_notifications')
        .insert(notifications);
      
      // Auto-reassign if configured
      if (applicableRule.auto_reassign && escalationTargets.length > 0) {
        const newAssignee = escalationTargets[0]; // Assign to first available
        
        await supabase
          .from('tasks')
          .update({
            assigned_to: newAssignee.id,
            assigned_at: now.toISOString(),
            status: 'assigned'
          })
          .eq('id', task.id);
      }
      
      escalatedTasks.push({
        task_id: task.id,
        task_title: task.title,
        overdue_minutes: overdueMinutes,
        escalated_to: escalationTargets.length,
        rule_applied: applicableRule.id,
        auto_reassigned: applicableRule.auto_reassign
      });
      
    } catch (error) {
      errors.push({ 
        task_id: task.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  return NextResponse.json({
    data: {
      escalated_tasks: escalatedTasks,
      errors: errors,
      total_processed: overdueTasks.length,
      successful_escalations: escalatedTasks.length,
      failed_escalations: errors.length
    },
    message: `Auto-escalation completed: ${escalatedTasks.length} tasks escalated, ${errors.length} errors`,
    success: true
  });
}

async function handleUpdateEscalationRules(
  supabase: any,
  body: any,
  userRecord: any
) {
  // Only admins can update escalation rules
  if (userRecord.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only administrators can update escalation rules', success: false },
      { status: 403 }
    );
  }
  
  const { rules } = body;
  
  if (!Array.isArray(rules)) {
    return NextResponse.json(
      { error: 'Rules must be an array', success: false },
      { status: 400 }
    );
  }
  
  // Validate each rule
  const validatedRules = rules.map((rule, index) => {
    try {
      return {
        id: rule.id || `rule-${index}`,
        ...escalationRuleSchema.parse(rule)
      };
    } catch (error) {
      throw new Error(`Invalid rule at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  // Update restaurant settings
  const { data: currentRestaurant } = await supabase
    .from('restaurants')
    .select('settings')
    .eq('id', userRecord.restaurant_id)
    .single();
  
  const updatedSettings = {
    ...currentRestaurant?.settings,
    escalation_rules: validatedRules,
    escalation_rules_updated_at: new Date().toISOString(),
    escalation_rules_updated_by: userRecord.id
  };
  
  const { error: updateError } = await supabase
    .from('restaurants')
    .update({ settings: updatedSettings })
    .eq('id', userRecord.restaurant_id);
  
  if (updateError) {
    console.error('Error updating escalation rules:', updateError);
    return NextResponse.json(
      { error: 'Failed to update escalation rules', success: false },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    data: { rules: validatedRules },
    message: 'Escalation rules updated successfully',
    success: true
  });
}