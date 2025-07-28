// Restaurant Krong Thai Task Management System
// Task Template Management API
// GET /api/tasks/templates - List task templates
// POST /api/tasks/templates - Create new task template

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import type { 
  TaskTemplate, 
  CreateTaskTemplateRequest,
  ChecklistItem,
  RecurrencePattern,
  AutoAssignRules 
} from '@/types/task-management';

// Validation schema for creating task templates
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  name_fr: z.string().min(1).max(255),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  category: z.string().optional(),
  task_type: z.enum(['sop_execution', 'cleaning', 'maintenance', 'training', 'audit', 'inventory', 'customer_service', 'admin', 'custom']),
  estimated_duration_minutes: z.number().int().positive().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent']).default('medium'),
  required_skills: z.array(z.string()).default([]),
  equipment_needed: z.array(z.string()).default([]),
  location_specific: z.boolean().default(false),
  locations: z.array(z.string()).default([]),
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
  sop_document_id: z.string().uuid().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.object({
    type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
    interval: z.number().int().positive(),
    days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    month_of_year: z.number().int().min(1).max(12).optional(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    timezone: z.string().default('Asia/Bangkok')
  }).optional(),
  dependencies: z.array(z.string().uuid()).default([]),
  auto_assign_rules: z.object({
    enabled: z.boolean(),
    required_skills: z.array(z.string()).optional(),
    preferred_skills: z.array(z.string()).optional(),
    max_workload_percentage: z.number().int().min(0).max(100).optional(),
    location_preference: z.string().optional(),
    skill_weight: z.number().min(0).max(1).default(0.4),
    availability_weight: z.number().min(0).max(1).default(0.3),
    workload_weight: z.number().min(0).max(1).default(0.2),
    location_weight: z.number().min(0).max(1).default(0.1)
  }).default({ enabled: false, skill_weight: 0.4, availability_weight: 0.3, workload_weight: 0.2, location_weight: 0.1 }),
  approval_required: z.boolean().default(false),
  tags: z.array(z.string()).default([])
});

// Validation schema for search parameters
const searchParamsSchema = z.object({
  category: z.string().optional(),
  task_type: z.enum(['sop_execution', 'cleaning', 'maintenance', 'training', 'audit', 'inventory', 'customer_service', 'admin', 'custom']).optional(),
  is_recurring: z.boolean().optional(),
  is_active: z.boolean().default(true),
  has_sop: z.boolean().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
    if (params.tags) {
      params.tags = params.tags.split(',');
    }
    
    // Convert string numbers to numbers
    ['page', 'limit'].forEach(key => {
      if (params[key]) {
        params[key] = parseInt(params[key], 10);
      }
    });
    
    // Convert boolean strings
    ['is_recurring', 'is_active', 'has_sop'].forEach(key => {
      if (params[key]) {
        params[key] = params[key] === 'true';
      }
    });
    
    const validatedParams = searchParamsSchema.parse(params);
    
    // Get current user's restaurant context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    // Get user's restaurant
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
    
    // Build query
    let query = supabase
      .from('task_templates')
      .select(`
        *,
        sop_document:sop_documents(id, title, title_fr, category),
        creator:auth_users!task_templates_created_by_fkey(id, full_name, full_name_fr),
        restaurant:restaurants(name, name_fr)
      `)
      .eq('restaurant_id', userRecord.restaurant_id);
    
    // Apply filters
    if (validatedParams.category) {
      query = query.eq('category', validatedParams.category);
    }
    
    if (validatedParams.task_type) {
      query = query.eq('task_type', validatedParams.task_type);
    }
    
    if (validatedParams.is_recurring !== undefined) {
      query = query.eq('is_recurring', validatedParams.is_recurring);
    }
    
    if (validatedParams.is_active !== undefined) {
      query = query.eq('is_active', validatedParams.is_active);
    }
    
    if (validatedParams.has_sop !== undefined) {
      if (validatedParams.has_sop) {
        query = query.not('sop_document_id', 'is', null);
      } else {
        query = query.is('sop_document_id', null);
      }
    }
    
    if (validatedParams.tags && validatedParams.tags.length > 0) {
      query = query.overlaps('tags', validatedParams.tags);
    }
    
    // Full-text search
    if (validatedParams.search) {
      query = query.or(
        `name.ilike.%${validatedParams.search}%,` +
        `name_fr.ilike.%${validatedParams.search}%,` +
        `description.ilike.%${validatedParams.search}%,` +
        `description_fr.ilike.%${validatedParams.search}%`
      );
    }
    
    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true });
    
    // Apply pagination and ordering
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    query = query
      .order('name', { ascending: true })
      .range(offset, offset + validatedParams.limit - 1);
    
    const { data: templates, error: templatesError } = await query;
    
    if (templatesError) {
      console.error('Error fetching task templates:', templatesError);
      return NextResponse.json(
        { error: 'Failed to fetch task templates', success: false },
        { status: 500 }
      );
    }
    
    // Get template usage statistics
    const templateIds = templates?.map(t => t.id) || [];
    let usageStats = [];
    
    if (templateIds.length > 0) {
      const { data: usage } = await supabase
        .from('tasks')
        .select('template_id, status')
        .in('template_id', templateIds)
        .not('template_id', 'is', null);
      
      usageStats = templateIds.map(templateId => {
        const templateUsage = usage?.filter(u => u.template_id === templateId) || [];
        return {
          template_id: templateId,
          total_uses: templateUsage.length,
          completed_uses: templateUsage.filter(u => u.status === 'completed').length,
          success_rate: templateUsage.length > 0 
            ? (templateUsage.filter(u => u.status === 'completed').length / templateUsage.length) * 100
            : 0
        };
      });
    }
    
    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / validatedParams.limit);
    const hasNext = validatedParams.page < totalPages;
    const hasPrev = validatedParams.page > 1;
    
    return NextResponse.json({
      data: templates?.map(template => ({
        ...template,
        usage_stats: usageStats.find(u => u.template_id === template.id) || {
          template_id: template.id,
          total_uses: 0,
          completed_uses: 0,
          success_rate: 0
        }
      })) || [],
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
    console.error('Error in GET /api/tasks/templates:', error);
    
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
    
    // Check permissions - only admins and managers can create templates
    if (!['admin', 'manager'].includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create task templates', success: false },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);
    
    // Verify SOP document exists if provided
    if (validatedData.sop_document_id) {
      const { data: sopDoc, error: sopError } = await supabase
        .from('sop_documents')
        .select('id, restaurant_id')
        .eq('id', validatedData.sop_document_id)
        .eq('restaurant_id', userRecord.restaurant_id)
        .single();
      
      if (sopError || !sopDoc) {
        return NextResponse.json(
          { error: 'SOP document not found or access denied', success: false },
          { status: 404 }
        );
      }
    }
    
    // Verify dependency templates exist if provided
    if (validatedData.dependencies.length > 0) {
      const { data: depTemplates, error: depError } = await supabase
        .from('task_templates')
        .select('id')
        .in('id', validatedData.dependencies)
        .eq('restaurant_id', userRecord.restaurant_id);
      
      if (depError || !depTemplates || depTemplates.length !== validatedData.dependencies.length) {
        return NextResponse.json(
          { error: 'Some dependency templates not found', success: false },
          { status: 400 }
        );
      }
    }
    
    // Prepare template data
    const templateData = {
      restaurant_id: userRecord.restaurant_id,
      name: validatedData.name,
      name_fr: validatedData.name_fr,
      description: validatedData.description,
      description_fr: validatedData.description_fr,
      category: validatedData.category,
      task_type: validatedData.task_type,
      estimated_duration_minutes: validatedData.estimated_duration_minutes,
      priority: validatedData.priority,
      required_skills: validatedData.required_skills,
      equipment_needed: validatedData.equipment_needed,
      location_specific: validatedData.location_specific,
      locations: validatedData.locations,
      checklist_items: validatedData.checklist_items,
      checklist_items_fr: validatedData.checklist_items_fr,
      sop_document_id: validatedData.sop_document_id,
      is_recurring: validatedData.is_recurring,
      recurrence_pattern: validatedData.recurrence_pattern,
      dependencies: validatedData.dependencies,
      auto_assign_rules: validatedData.auto_assign_rules,
      approval_required: validatedData.approval_required,
      tags: validatedData.tags,
      is_active: true,
      created_by: user.id
    };
    
    // Create the template
    const { data: newTemplate, error: createError } = await supabase
      .from('task_templates')
      .insert(templateData)
      .select(`
        *,
        sop_document:sop_documents(id, title, title_fr, category),
        creator:auth_users!task_templates_created_by_fkey(id, full_name, full_name_fr),
        restaurant:restaurants(name, name_fr)
      `)
      .single();
    
    if (createError) {
      console.error('Error creating task template:', createError);
      return NextResponse.json(
        { error: 'Failed to create task template', success: false },
        { status: 500 }
      );
    }
    
    // If template is recurring, create recurrence schedule
    if (validatedData.is_recurring && validatedData.recurrence_pattern) {
      const nextRunAt = calculateNextRun(validatedData.recurrence_pattern);
      
      const { error: recurrenceError } = await supabase
        .from('task_recurrence')
        .insert({
          template_id: newTemplate.id,
          restaurant_id: userRecord.restaurant_id,
          name: `${validatedData.name} - Auto Schedule`,
          recurrence_pattern: validatedData.recurrence_pattern,
          timezone: validatedData.recurrence_pattern.timezone,
          next_run_at: nextRunAt,
          is_active: true,
          total_runs: 0,
          failed_runs: 0,
          created_by: user.id
        });
      
      if (recurrenceError) {
        console.warn('Failed to create recurrence schedule:', recurrenceError);
      }
    }
    
    return NextResponse.json({
      data: newTemplate,
      message: 'Task template created successfully',
      success: true
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error in POST /api/tasks/templates:', error);
    
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