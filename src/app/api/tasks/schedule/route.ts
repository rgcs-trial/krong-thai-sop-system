// Restaurant Krong Thai Task Management System
// Task Scheduling and Automation API
// POST /api/tasks/schedule - Create scheduled/recurring tasks
// GET /api/tasks/schedule - List scheduled tasks and recurrence patterns

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import type { TaskRecurrence, RecurrencePattern } from '@/types/task-management';

// Validation schema for creating recurring tasks
const createRecurrenceSchema = z.object({
  template_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  recurrence_pattern: z.object({
    type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
    interval: z.number().int().positive(),
    days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    month_of_year: z.number().int().min(1).max(12).optional(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    timezone: z.string().default('Asia/Bangkok')
  }),
  timezone: z.string().default('Asia/Bangkok'),
  end_date: z.string().date().optional(),
  max_runs: z.number().int().positive().optional()
});

// Validation schema for scheduling individual tasks
const scheduleTaskSchema = z.object({
  template_id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  title_fr: z.string().min(1).max(500),
  scheduled_for: z.string().datetime(),
  due_date: z.string().datetime().optional(),
  assign_to: z.string().uuid().optional(),
  auto_assign: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent']).default('medium'),
  metadata: z.record(z.any()).default({})
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
    
    // Get user's restaurant context
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
    
    const type = searchParams.get('type') || 'all'; // 'recurring', 'scheduled', 'all'
    const active_only = searchParams.get('active_only') === 'true';
    
    let response: any = { success: true };
    
    if (type === 'recurring' || type === 'all') {
      // Get recurring task schedules
      let recurrenceQuery = supabase
        .from('task_recurrence')
        .select(`
          *,
          template:task_templates(
            id, name, name_fr, task_type, priority, 
            estimated_duration_minutes, required_skills
          ),
          restaurant:restaurants(name, name_fr)
        `)
        .eq('restaurant_id', userRecord.restaurant_id);
      
      if (active_only) {
        recurrenceQuery = recurrenceQuery.eq('is_active', true);
      }
      
      recurrenceQuery = recurrenceQuery.order('next_run_at', { ascending: true });
      
      const { data: recurrences, error: recurrenceError } = await recurrenceQuery;
      
      if (recurrenceError) {
        console.error('Error fetching recurrences:', recurrenceError);
        return NextResponse.json(
          { error: 'Failed to fetch recurring tasks', success: false },
          { status: 500 }
        );
      }
      
      response.recurring_tasks = recurrences || [];
    }
    
    if (type === 'scheduled' || type === 'all') {
      // Get scheduled tasks (future tasks with scheduled_for)
      const now = new Date().toISOString();
      
      let scheduledQuery = supabase
        .from('tasks')
        .select(`
          id, title, title_fr, task_type, priority, status,
          scheduled_for, due_date, estimated_duration_minutes,
          assigned_to, created_by, is_recurring_instance,
          assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr),
          template:task_templates(name, name_fr, category)
        `)
        .eq('restaurant_id', userRecord.restaurant_id)
        .gte('scheduled_for', now)
        .in('status', ['pending', 'assigned']);
      
      scheduledQuery = scheduledQuery.order('scheduled_for', { ascending: true });
      
      const { data: scheduled, error: scheduledError } = await scheduledQuery;
      
      if (scheduledError) {
        console.error('Error fetching scheduled tasks:', scheduledError);
        return NextResponse.json(
          { error: 'Failed to fetch scheduled tasks', success: false },
          { status: 500 }
        );
      }
      
      response.scheduled_tasks = scheduled || [];
    }
    
    if (type === 'all') {
      // Get scheduling statistics
      const { data: stats } = await supabase
        .rpc('get_scheduling_stats', {
          p_restaurant_id: userRecord.restaurant_id
        });
      
      response.statistics = stats || {
        total_recurring: 0,
        active_recurring: 0,
        scheduled_today: 0,
        scheduled_this_week: 0,
        overdue_tasks: 0
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in GET /api/tasks/schedule:', error);
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
    const operation = searchParams.get('op') || 'schedule'; // 'schedule', 'recurring', 'bulk'
    
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
    
    // Check permissions
    if (!['admin', 'manager'].includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    switch (operation) {
      case 'recurring':
        return handleCreateRecurring(supabase, body, user.id, userRecord.restaurant_id);
      case 'schedule':
        return handleScheduleTask(supabase, body, user.id, userRecord.restaurant_id);
      case 'bulk':
        return handleBulkSchedule(supabase, body, user.id, userRecord.restaurant_id);
      default:
        return NextResponse.json(
          { error: 'Invalid operation', success: false },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error in POST /api/tasks/schedule:', error);
    
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

async function handleCreateRecurring(
  supabase: any,
  body: any,
  createdBy: string,
  restaurantId: string
) {
  const validatedData = createRecurrenceSchema.parse(body);
  
  // Verify template exists
  const { data: template, error: templateError } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', validatedData.template_id)
    .eq('restaurant_id', restaurantId)
    .single();
  
  if (templateError || !template) {
    return NextResponse.json(
      { error: 'Task template not found', success: false },
      { status: 404 }
    );
  }
  
  // Calculate next run time
  const nextRunAt = calculateNextRun(validatedData.recurrence_pattern);
  
  // Create recurrence schedule
  const { data: recurrence, error: recurrenceError } = await supabase
    .from('task_recurrence')
    .insert({
      template_id: validatedData.template_id,
      restaurant_id: restaurantId,
      name: validatedData.name,
      recurrence_pattern: validatedData.recurrence_pattern,
      timezone: validatedData.timezone,
      next_run_at: nextRunAt,
      end_date: validatedData.end_date,
      max_runs: validatedData.max_runs,
      is_active: true,
      total_runs: 0,
      failed_runs: 0,
      created_by: createdBy
    })
    .select(`
      *,
      template:task_templates(name, name_fr, task_type, priority)
    `)
    .single();
  
  if (recurrenceError) {
    console.error('Error creating recurrence:', recurrenceError);
    return NextResponse.json(
      { error: 'Failed to create recurring task', success: false },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    data: recurrence,
    message: 'Recurring task created successfully',
    next_run: nextRunAt,
    success: true
  });
}

async function handleScheduleTask(
  supabase: any,
  body: any,
  createdBy: string,
  restaurantId: string
) {
  const validatedData = scheduleTaskSchema.parse(body);
  
  let taskData: any = {
    restaurant_id: restaurantId,
    title: validatedData.title,
    title_fr: validatedData.title_fr,
    task_type: 'custom',
    priority: validatedData.priority,
    scheduled_for: validatedData.scheduled_for,
    due_date: validatedData.due_date,
    status: 'pending',
    metadata: validatedData.metadata,
    created_by: createdBy
  };
  
  // If using a template, populate from template
  if (validatedData.template_id) {
    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', validatedData.template_id)
      .eq('restaurant_id', restaurantId)
      .single();
    
    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Task template not found', success: false },
        { status: 404 }
      );
    }
    
    // Use database function to create task from template
    const { data: newTaskId, error: createError } = await supabase
      .rpc('create_task_from_template', {
        p_template_id: validatedData.template_id,
        p_scheduled_for: validatedData.scheduled_for,
        p_assigned_to: validatedData.assign_to,
        p_created_by: createdBy
      });
    
    if (createError) {
      console.error('Error creating task from template:', createError);
      return NextResponse.json(
        { error: 'Failed to create scheduled task', success: false },
        { status: 500 }
      );
    }
    
    // Get the created task
    const { data: createdTask, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        *,
        template:task_templates(name, name_fr, category),
        assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr)
      `)
      .eq('id', newTaskId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching created task:', fetchError);
    }
    
    return NextResponse.json({
      data: createdTask,
      message: 'Task scheduled successfully from template',
      success: true
    });
  }
  
  // Create task directly
  if (validatedData.assign_to) {
    // Verify assignee
    const { data: assignee, error: assigneeError } = await supabase
      .from('auth_users')
      .select('id')
      .eq('id', validatedData.assign_to)
      .eq('restaurant_id', restaurantId)
      .single();
    
    if (assigneeError || !assignee) {
      return NextResponse.json(
        { error: 'Invalid assignee', success: false },
        { status: 400 }
      );
    }
    
    taskData.assigned_to = validatedData.assign_to;
    taskData.assigned_by = createdBy;
    taskData.assigned_at = new Date().toISOString();
    taskData.status = 'assigned';
  } else if (validatedData.auto_assign) {
    // Will be auto-assigned later
    taskData.metadata.auto_assign_requested = true;
  }
  
  const { data: newTask, error: createError } = await supabase
    .from('tasks')
    .insert(taskData)
    .select(`
      *,
      assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr)
    `)
    .single();
  
  if (createError) {
    console.error('Error creating scheduled task:', createError);
    return NextResponse.json(
      { error: 'Failed to create scheduled task', success: false },
      { status: 500 }
    );
  }
  
  // Auto-assign if requested
  if (validatedData.auto_assign && !validatedData.assign_to) {
    const { error: autoAssignError } = await supabase
      .rpc('auto_assign_task', {
        p_task_id: newTask.id,
        p_assigned_by: createdBy
      });
    
    if (autoAssignError) {
      console.warn('Auto-assignment failed for scheduled task:', autoAssignError);
    }
  }
  
  return NextResponse.json({
    data: newTask,
    message: 'Task scheduled successfully',
    success: true
  });
}

async function handleBulkSchedule(
  supabase: any,
  body: any,
  createdBy: string,
  restaurantId: string
) {
  const { tasks, default_settings } = body;
  
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json(
      { error: 'No tasks provided for bulk scheduling', success: false },
      { status: 400 }
    );
  }
  
  if (tasks.length > 50) {
    return NextResponse.json(
      { error: 'Too many tasks for bulk operation (max 50)', success: false },
      { status: 400 }
    );
  }
  
  const results = [];
  const errors = [];
  
  for (const [index, taskData] of tasks.entries()) {
    try {
      const mergedData = { ...default_settings, ...taskData };
      const validatedTask = scheduleTaskSchema.parse(mergedData);
      
      const result = await handleScheduleTask(supabase, validatedTask, createdBy, restaurantId);
      const resultData = await result.json();
      
      if (resultData.success) {
        results.push({
          index,
          task: resultData.data,
          status: 'success'
        });
      } else {
        errors.push({
          index,
          error: resultData.error,
          status: 'failed'
        });
      }
      
    } catch (error) {
      errors.push({
        index,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      });
    }
  }
  
  return NextResponse.json({
    data: {
      successful: results,
      failed: errors,
      total_requested: tasks.length,
      successful_count: results.length,
      failed_count: errors.length
    },
    message: `Bulk scheduling completed: ${results.length} successful, ${errors.length} failed`,
    success: errors.length === 0
  });
}

// Helper function to calculate next run time based on recurrence pattern
function calculateNextRun(pattern: RecurrencePattern): string {
  const now = new Date();
  const tz = pattern.timezone || 'Asia/Bangkok';
  
  // Create date in the specified timezone
  const baseDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  
  let nextRun = new Date(baseDate);
  nextRun.setHours(pattern.hour, pattern.minute, 0, 0);
  
  // If the time has already passed today, move to next occurrence
  if (nextRun <= now) {
    switch (pattern.type) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + pattern.interval);
        break;
        
      case 'weekly':
        const targetDay = pattern.days_of_week?.[0] || 0;
        const currentDay = nextRun.getDay();
        let daysUntilTarget = (targetDay - currentDay + 7) % 7;
        if (daysUntilTarget === 0) daysUntilTarget = 7 * pattern.interval;
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;
        
      case 'monthly':
        const targetDayOfMonth = pattern.day_of_month || 1;
        nextRun.setMonth(nextRun.getMonth() + pattern.interval);
        nextRun.setDate(targetDayOfMonth);
        break;
        
      case 'yearly':
        nextRun.setFullYear(nextRun.getFullYear() + pattern.interval);
        if (pattern.month_of_year) {
          nextRun.setMonth(pattern.month_of_year - 1);
        }
        if (pattern.day_of_month) {
          nextRun.setDate(pattern.day_of_month);
        }
        break;
    }
  }
  
  return nextRun.toISOString();
}