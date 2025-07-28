// Restaurant Krong Thai Task Management System
// Individual Task API Endpoints
// GET /api/tasks/[id] - Get task by ID
// PUT /api/tasks/[id] - Update task
// DELETE /api/tasks/[id] - Delete task

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import type { UpdateTaskRequest } from '@/types/task-management';

// Validation schema for updating tasks
const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  title_fr: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  status: z.enum(['pending', 'assigned', 'in_progress', 'blocked', 'completed', 'cancelled', 'overdue', 'escalated']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent']).optional(),
  scheduled_for: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  actual_duration_minutes: z.number().int().positive().optional(),
  location: z.string().optional(),
  checklist_progress: z.record(z.boolean()).optional(),
  notes: z.string().optional(),
  notes_fr: z.string().optional(),
  quality_score: z.number().int().min(1).max(5).optional(),
  feedback: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createClient();
    const taskId = params.id;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format', success: false },
        { status: 400 }
      );
    }
    
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
    
    // Get task with comprehensive relations
    let query = supabase
      .from('tasks')
      .select(`
        *,
        template:task_templates(
          id, name, name_fr, category, task_type, 
          checklist_items, checklist_items_fr,
          sop_document:sop_documents(id, title, title_fr)
        ),
        assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr, role, email),
        assigner:auth_users!tasks_assigned_by_fkey(id, full_name, full_name_fr, role),
        creator:auth_users!tasks_created_by_fkey(id, full_name, full_name_fr, role),
        approver:auth_users!tasks_approved_by_fkey(id, full_name, full_name_fr, role),
        restaurant:restaurants(id, name, name_fr),
        assignments:task_assignments(
          id, assignment_status, assigned_at, accepted_at, declined_at,
          auto_assigned, assignment_score, notes,
          user:auth_users(id, full_name, full_name_fr, role)
        ),
        parent_task:tasks!tasks_parent_task_id_fkey(id, title, title_fr, status)
      `)
      .eq('id', taskId)
      .eq('restaurant_id', userRecord.restaurant_id);
    
    // Apply role-based access control
    if (userRecord.role === 'staff') {
      query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id},and(assigned_to.is.null,status.eq.pending)`);
    }
    
    const { data: task, error: taskError } = await query.single();
    
    if (taskError) {
      if (taskError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found or access denied', success: false },
          { status: 404 }
        );
      }
      
      console.error('Error fetching task:', taskError);
      return NextResponse.json(
        { error: 'Failed to fetch task', success: false },
        { status: 500 }
      );
    }
    
    // Get dependent tasks
    const { data: dependentTasks } = await supabase
      .from('tasks')
      .select('id, title, title_fr, status, priority')
      .contains('dependencies', [taskId])
      .eq('restaurant_id', userRecord.restaurant_id);
    
    // Get dependency tasks
    const dependencyIds = task.dependencies || [];
    let dependencyTasks = [];
    
    if (dependencyIds.length > 0) {
      const { data: deps } = await supabase
        .from('tasks')
        .select('id, title, title_fr, status, priority, completed_at')
        .in('id', dependencyIds)
        .eq('restaurant_id', userRecord.restaurant_id);
      
      dependencyTasks = deps || [];
    }
    
    // Get recent notifications for this task
    const { data: notifications } = await supabase
      .from('task_notifications')
      .select('id, notification_type, title, title_fr, sent_at, read_at')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(5);
    
    return NextResponse.json({
      data: {
        ...task,
        dependent_tasks: dependentTasks || [],
        dependency_tasks: dependencyTasks,
        notifications: notifications || []
      },
      success: true
    });
    
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createClient();
    const taskId = params.id;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format', success: false },
        { status: 400 }
      );
    }
    
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
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);
    
    // Get current task to check permissions and current state
    const { data: currentTask, error: currentTaskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('restaurant_id', userRecord.restaurant_id)
      .single();
    
    if (currentTaskError || !currentTask) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    // Check permissions
    const canUpdate = 
      userRecord.role === 'admin' || 
      userRecord.role === 'manager' ||
      currentTask.assigned_to === user.id ||
      currentTask.created_by === user.id;
    
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    
    // Only include provided fields
    Object.keys(validatedData).forEach(key => {
      if (validatedData[key] !== undefined) {
        updateData[key] = validatedData[key];
      }
    });
    
    // Handle status changes with automatic timestamps
    if (validatedData.status && validatedData.status !== currentTask.status) {
      switch (validatedData.status) {
        case 'in_progress':
          if (!currentTask.started_at) {
            updateData.started_at = new Date().toISOString();
          }
          break;
        case 'completed':
          updateData.completed_at = new Date().toISOString();
          // If actual duration not provided, calculate it
          if (!validatedData.actual_duration_minutes && currentTask.started_at) {
            const startTime = new Date(currentTask.started_at);
            const endTime = new Date();
            updateData.actual_duration_minutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
          }
          break;
        case 'cancelled':
          updateData.cancelled_at = new Date().toISOString();
          break;
      }
    }
    
    // Handle checklist progress updates
    if (validatedData.checklist_progress) {
      // Merge with existing progress
      const currentProgress = currentTask.checklist_progress || {};
      updateData.checklist_progress = {
        ...currentProgress,
        ...validatedData.checklist_progress
      };
    }
    
    // Update the task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        template:task_templates(name, name_fr, category),
        assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr, role),
        creator:auth_users!tasks_created_by_fkey(id, full_name, full_name_fr),
        restaurant:restaurants(name, name_fr)
      `)
      .single();
    
    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json(
        { error: 'Failed to update task', success: false },
        { status: 500 }
      );
    }
    
    // Handle notifications for status changes
    if (validatedData.status && validatedData.status !== currentTask.status) {
      const notifications = [];
      
      // Notify assignee about status change
      if (currentTask.assigned_to && currentTask.assigned_to !== user.id) {
        notifications.push({
          task_id: taskId,
          user_id: currentTask.assigned_to,
          notification_type: validatedData.status === 'completed' ? 'task_completed' : 'escalation',
          channel: 'in_app',
          title: `Task Status Updated: ${currentTask.title}`,
          title_fr: `Statut de tâche mis à jour: ${currentTask.title_fr}`,
          message: `Task status changed to: ${validatedData.status}`,
          message_fr: `Le statut de la tâche a changé pour: ${validatedData.status}`,
          metadata: {
            task_id: taskId,
            old_status: currentTask.status,
            new_status: validatedData.status
          }
        });
      }
      
      // Notify creator if different from assignee and updater
      if (currentTask.created_by && 
          currentTask.created_by !== user.id && 
          currentTask.created_by !== currentTask.assigned_to) {
        notifications.push({
          task_id: taskId,
          user_id: currentTask.created_by,
          notification_type: validatedData.status === 'completed' ? 'task_completed' : 'escalation',
          channel: 'in_app',
          title: `Task Status Updated: ${currentTask.title}`,
          title_fr: `Statut de tâche mis à jour: ${currentTask.title_fr}`,
          message: `Task status changed to: ${validatedData.status}`,
          message_fr: `Le statut de la tâche a changé pour: ${validatedData.status}`,
          metadata: {
            task_id: taskId,
            old_status: currentTask.status,
            new_status: validatedData.status
          }
        });
      }
      
      if (notifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('task_notifications')
          .insert(notifications);
        
        if (notificationError) {
          console.warn('Failed to create status change notifications:', notificationError);
        }
      }
    }
    
    // If task is completed, check if it unblocks dependent tasks
    if (validatedData.status === 'completed') {
      const { data: dependentTasks } = await supabase
        .from('tasks')
        .select('id, dependencies')
        .contains('dependencies', [taskId])
        .eq('restaurant_id', userRecord.restaurant_id)
        .eq('status', 'blocked');
      
      if (dependentTasks && dependentTasks.length > 0) {
        for (const depTask of dependentTasks) {
          // Check if all dependencies are now completed
          const { data: deps } = await supabase
            .from('tasks')
            .select('id, status')
            .in('id', depTask.dependencies)
            .eq('restaurant_id', userRecord.restaurant_id);
          
          const allCompleted = deps?.every(d => d.status === 'completed');
          
          if (allCompleted) {
            // Unblock the dependent task
            await supabase
              .from('tasks')
              .update({ status: 'pending' })
              .eq('id', depTask.id);
            
            // Notify about dependency resolution
            if (depTask.assigned_to) {
              await supabase
                .from('task_notifications')
                .insert({
                  task_id: depTask.id,
                  user_id: depTask.assigned_to,
                  notification_type: 'dependency_ready',
                  channel: 'in_app',
                  title: 'Task Dependencies Resolved',
                  title_fr: 'Dépendances de tâche résolues',
                  message: 'Your blocked task is now ready to start',
                  message_fr: 'Votre tâche bloquée est maintenant prête à commencer',
                  metadata: { unblocked_by_task: taskId }
                });
            }
          }
        }
      }
    }
    
    return NextResponse.json({
      data: updatedTask,
      message: 'Task updated successfully',
      success: true
    });
    
  } catch (error) {
    console.error('Error in PUT /api/tasks/[id]:', error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createClient();
    const taskId = params.id;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format', success: false },
        { status: 400 }
      );
    }
    
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
    
    // Only admins and managers can delete tasks
    if (!['admin', 'manager'].includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      );
    }
    
    // Check if task exists and belongs to user's restaurant
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, title_fr, status, assigned_to')
      .eq('id', taskId)
      .eq('restaurant_id', userRecord.restaurant_id)
      .single();
    
    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    // Check if task can be deleted (not in progress or completed)
    if (['in_progress', 'completed'].includes(task.status)) {
      return NextResponse.json(
        { error: 'Cannot delete task that is in progress or completed', success: false },
        { status: 400 }
      );
    }
    
    // Check for dependent tasks
    const { data: dependentTasks } = await supabase
      .from('tasks')
      .select('id, title, title_fr')
      .contains('dependencies', [taskId])
      .eq('restaurant_id', userRecord.restaurant_id);
    
    if (dependentTasks && dependentTasks.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete task with dependent tasks', 
          details: dependentTasks,
          success: false 
        },
        { status: 400 }
      );
    }
    
    // Delete the task (cascading deletes will handle related records)
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    
    if (deleteError) {
      console.error('Error deleting task:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete task', success: false },
        { status: 500 }
      );
    }
    
    // Notify assignee if task was assigned
    if (task.assigned_to) {
      await supabase
        .from('task_notifications')
        .insert({
          user_id: task.assigned_to,
          notification_type: 'escalation',
          channel: 'in_app',
          title: `Task Deleted: ${task.title}`,
          title_fr: `Tâche supprimée: ${task.title_fr}`,
          message: 'A task assigned to you has been deleted',
          message_fr: 'Une tâche qui vous était assignée a été supprimée',
          metadata: {
            deleted_task_id: taskId,
            deleted_by: user.id
          }
        });
    }
    
    return NextResponse.json({
      message: 'Task deleted successfully',
      success: true
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}