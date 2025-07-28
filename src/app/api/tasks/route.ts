// Restaurant Krong Thai Task Management System
// Tasks API Endpoints - CRUD Operations
// GET /api/tasks - List tasks with filtering
// POST /api/tasks - Create new task

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import type { 
  Task, 
  CreateTaskRequest, 
  TaskSearchParams,
  TaskDashboardStats 
} from '@/types/task-management';

// Validation schema for creating tasks
const createTaskSchema = z.object({
  template_id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  title_fr: z.string().min(1).max(500),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  task_type: z.enum(['sop_execution', 'cleaning', 'maintenance', 'training', 'audit', 'inventory', 'customer_service', 'admin', 'custom']),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent']).default('medium'),
  scheduled_for: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  estimated_duration_minutes: z.number().int().positive().optional(),
  location: z.string().optional(),
  required_skills: z.array(z.string()).default([]),
  equipment_needed: z.array(z.string()).default([]),
  checklist_items: z.array(z.object({
    id: z.string(),
    text: z.string(),
    required: z.boolean(),
    estimated_minutes: z.number().optional(),
    order: z.number()
  })).default([]),
  checklist_items_fr: z.array(z.object({
    id: z.string(),
    text: z.string(),
    required: z.boolean(),
    estimated_minutes: z.number().optional(),
    order: z.number()
  })).default([]),
  assigned_to: z.string().uuid().optional(),
  requires_approval: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

// Validation schema for search parameters
const searchParamsSchema = z.object({
  status: z.array(z.enum(['pending', 'assigned', 'in_progress', 'blocked', 'completed', 'cancelled', 'overdue', 'escalated'])).optional(),
  priority: z.array(z.enum(['low', 'medium', 'high', 'critical', 'urgent'])).optional(),
  task_type: z.array(z.enum(['sop_execution', 'cleaning', 'maintenance', 'training', 'audit', 'inventory', 'customer_service', 'admin', 'custom'])).optional(),
  assigned_to: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(),
  due_date_from: z.string().datetime().optional(),
  due_date_to: z.string().datetime().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  include_completed: z.boolean().default(false),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse and validate search parameters
    const params = Object.fromEntries(searchParams.entries());
    
    // Handle array parameters
    ['status', 'priority', 'task_type', 'tags'].forEach(key => {
      if (params[key]) {
        params[key] = params[key].split(',');
      }
    });
    
    // Convert string numbers to numbers
    ['page', 'limit'].forEach(key => {
      if (params[key]) {
        params[key] = parseInt(params[key], 10);
      }
    });
    
    // Convert boolean strings
    if (params.include_completed) {
      params.include_completed = params.include_completed === 'true';
    }
    
    const validatedParams = searchParamsSchema.parse(params);
    
    // Get current user's restaurant context
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
    
    // Build query based on user role and filters
    let query = supabase
      .from('tasks')
      .select(`
        *,
        template:task_templates(name, name_fr, category),
        assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr, role),
        creator:auth_users!tasks_created_by_fkey(id, full_name, full_name_fr),
        restaurant:restaurants(name, name_fr)
      `)
      .eq('restaurant_id', userRecord.restaurant_id);
    
    // Apply role-based filtering
    if (userRecord.role === 'staff') {
      // Staff can only see tasks assigned to them or unassigned pending tasks
      query = query.or(`assigned_to.eq.${user.id},and(assigned_to.is.null,status.eq.pending),created_by.eq.${user.id}`);
    }
    
    // Apply filters
    if (validatedParams.status && validatedParams.status.length > 0) {
      query = query.in('status', validatedParams.status);
    }
    
    if (validatedParams.priority && validatedParams.priority.length > 0) {
      query = query.in('priority', validatedParams.priority);
    }
    
    if (validatedParams.task_type && validatedParams.task_type.length > 0) {
      query = query.in('task_type', validatedParams.task_type);
    }
    
    if (validatedParams.assigned_to) {
      query = query.eq('assigned_to', validatedParams.assigned_to);
    }
    
    if (validatedParams.created_by) {
      query = query.eq('created_by', validatedParams.created_by);
    }
    
    if (validatedParams.due_date_from) {
      query = query.gte('due_date', validatedParams.due_date_from);
    }
    
    if (validatedParams.due_date_to) {
      query = query.lte('due_date', validatedParams.due_date_to);
    }
    
    if (validatedParams.location) {
      query = query.ilike('location', `%${validatedParams.location}%`);
    }
    
    if (validatedParams.tags && validatedParams.tags.length > 0) {
      query = query.overlaps('tags', validatedParams.tags);
    }
    
    if (!validatedParams.include_completed) {
      query = query.not('status', 'in', ['completed', 'cancelled']);
    }
    
    // Full-text search
    if (validatedParams.search) {
      query = query.or(
        `title.ilike.%${validatedParams.search}%,` +
        `title_fr.ilike.%${validatedParams.search}%,` +
        `description.ilike.%${validatedParams.search}%,` +
        `description_fr.ilike.%${validatedParams.search}%`
      );
    }
    
    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true });
    
    // Apply pagination and ordering
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    query = query
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + validatedParams.limit - 1);
    
    const { data: tasks, error: tasksError } = await query;
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks', success: false },
        { status: 500 }
      );
    }
    
    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / validatedParams.limit);
    const hasNext = validatedParams.page < totalPages;
    const hasPrev = validatedParams.page > 1;
    
    return NextResponse.json({
      data: tasks,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: count || 0,
        total_pages: totalPages,
        has_next: hasNext,
        has_prev: hasPrev
      },
      success: true
    });
    
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
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

export async function POST(request: NextRequest) {
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
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);
    
    // Prepare task data
    const taskData = {
      restaurant_id: userRecord.restaurant_id,
      template_id: validatedData.template_id,
      title: validatedData.title,
      title_fr: validatedData.title_fr,
      description: validatedData.description,
      description_fr: validatedData.description_fr,
      task_type: validatedData.task_type,
      priority: validatedData.priority,
      scheduled_for: validatedData.scheduled_for,
      due_date: validatedData.due_date,
      estimated_duration_minutes: validatedData.estimated_duration_minutes,
      location: validatedData.location,
      location_details: {},
      required_skills: validatedData.required_skills,
      equipment_needed: validatedData.equipment_needed,
      checklist_items: validatedData.checklist_items,
      checklist_items_fr: validatedData.checklist_items_fr,
      checklist_progress: {},
      attachments: [],
      dependencies: [],
      dependent_tasks: [],
      requires_approval: validatedData.requires_approval,
      metadata: validatedData.metadata,
      tags: validatedData.tags,
      version: 1,
      is_recurring_instance: false,
      created_by: user.id
    };
    
    // If assigned_to is specified, validate the assignee and set status
    if (validatedData.assigned_to) {
      // Verify assignee exists and is in the same restaurant
      const { data: assignee, error: assigneeError } = await supabase
        .from('auth_users')
        .select('id, restaurant_id, role')
        .eq('id', validatedData.assigned_to)
        .eq('restaurant_id', userRecord.restaurant_id)
        .single();
      
      if (assigneeError || !assignee) {
        return NextResponse.json(
          { error: 'Invalid assignee', success: false },
          { status: 400 }
        );
      }
      
      taskData.assigned_to = validatedData.assigned_to;
      taskData.assigned_by = user.id;
      taskData.assigned_at = new Date().toISOString();
      taskData.status = 'assigned';
    }
    
    // Create the task
    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert(taskData)
      .select(`
        *,
        template:task_templates(name, name_fr, category),
        assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr, role),
        creator:auth_users!tasks_created_by_fkey(id, full_name, full_name_fr),
        restaurant:restaurants(name, name_fr)
      `)
      .single();
    
    if (createError) {
      console.error('Error creating task:', createError);
      return NextResponse.json(
        { error: 'Failed to create task', success: false },
        { status: 500 }
      );
    }
    
    // If task is assigned, create assignment record
    if (validatedData.assigned_to) {
      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .insert({
          task_id: newTask.id,
          user_id: validatedData.assigned_to,
          assigned_by: user.id,
          assignment_status: 'assigned',
          auto_assigned: false
        });
      
      if (assignmentError) {
        console.warn('Failed to create assignment record:', assignmentError);
      }
      
      // Create notification for assignee
      const { error: notificationError } = await supabase
        .from('task_notifications')
        .insert({
          task_id: newTask.id,
          user_id: validatedData.assigned_to,
          notification_type: 'task_assigned',
          channel: 'in_app',
          title: `New Task Assigned: ${validatedData.title}`,
          title_fr: `Nouvelle tâche assignée: ${validatedData.title_fr}`,
          message: `You have been assigned a new ${validatedData.task_type} task`,
          message_fr: `Une nouvelle tâche ${validatedData.task_type} vous a été assignée`,
          metadata: {
            task_id: newTask.id,
            priority: validatedData.priority,
            due_date: validatedData.due_date
          }
        });
      
      if (notificationError) {
        console.warn('Failed to create notification:', notificationError);
      }
    }
    
    return NextResponse.json({
      data: newTask,
      message: 'Task created successfully',
      success: true
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    
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