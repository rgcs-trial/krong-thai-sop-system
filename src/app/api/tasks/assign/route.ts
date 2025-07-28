// Restaurant Krong Thai Task Management System
// Task Assignment API Endpoints
// POST /api/tasks/assign - Assign task to user
// POST /api/tasks/assign/auto - Auto-assign task based on algorithm

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import type { TaskAssignmentRequest, AssignmentAlgorithmResult } from '@/types/task-management';

// Validation schema for task assignment
const assignTaskSchema = z.object({
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  notes: z.string().optional()
});

// Validation schema for auto-assignment
const autoAssignSchema = z.object({
  task_id: z.string().uuid(),
  max_candidates: z.number().int().positive().max(10).default(5)
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const isAutoAssign = searchParams.get('auto') === 'true';
    
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
    
    // Check permissions for assignment
    if (!['admin', 'manager'].includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to assign tasks', success: false },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    if (isAutoAssign) {
      return handleAutoAssignment(supabase, body, user.id, userRecord.restaurant_id);
    } else {
      return handleManualAssignment(supabase, body, user.id, userRecord.restaurant_id);
    }
    
  } catch (error) {
    console.error('Error in POST /api/tasks/assign:', error);
    
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

async function handleManualAssignment(
  supabase: any, 
  body: any, 
  assignedBy: string, 
  restaurantId: string
) {
  const validatedData = assignTaskSchema.parse(body);
  
  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', validatedData.task_id)
    .eq('restaurant_id', restaurantId)
    .single();
  
  if (taskError || !task) {
    return NextResponse.json(
      { error: 'Task not found', success: false },
      { status: 404 }
    );
  }
  
  // Check if task is already assigned
  if (task.assigned_to) {
    return NextResponse.json(
      { error: 'Task is already assigned', success: false },
      { status: 400 }
    );
  }
  
  // Verify assignee exists and is in the same restaurant
  const { data: assignee, error: assigneeError } = await supabase
    .from('auth_users')
    .select('id, full_name, full_name_fr, role, email')
    .eq('id', validatedData.user_id)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .single();
  
  if (assigneeError || !assignee) {
    return NextResponse.json(
      { error: 'Invalid assignee', success: false },
      { status: 400 }
    );
  }
  
  // Check assignee's current workload
  const { data: currentTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('assigned_to', validatedData.user_id)
    .in('status', ['assigned', 'in_progress'])
    .eq('restaurant_id', restaurantId);
  
  const currentWorkload = currentTasks?.length || 0;
  
  // Update task with assignment
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      assigned_to: validatedData.user_id,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
      updated_by: assignedBy,
      updated_at: new Date().toISOString()
    })
    .eq('id', validatedData.task_id)
    .select(`
      *,
      assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr, role),
      assigner:auth_users!tasks_assigned_by_fkey(id, full_name, full_name_fr, role)
    `)
    .single();
  
  if (updateError) {
    console.error('Error updating task assignment:', updateError);
    return NextResponse.json(
      { error: 'Failed to assign task', success: false },
      { status: 500 }
    );
  }
  
  // Create assignment record
  const { data: assignment, error: assignmentError } = await supabase
    .from('task_assignments')
    .insert({
      task_id: validatedData.task_id,
      user_id: validatedData.user_id,
      assigned_by: assignedBy,
      assignment_status: 'assigned',
      auto_assigned: false,
      notes: validatedData.notes
    })
    .select('*')
    .single();
  
  if (assignmentError) {
    console.warn('Failed to create assignment record:', assignmentError);
  }
  
  // Create notification for assignee
  const { error: notificationError } = await supabase
    .from('task_notifications')
    .insert({
      task_id: validatedData.task_id,
      user_id: validatedData.user_id,
      notification_type: 'task_assigned',
      channel: 'in_app',
      title: `New Task Assigned: ${task.title}`,
      title_fr: `Nouvelle tâche assignée: ${task.title_fr}`,
      message: `You have been assigned a new ${task.task_type} task with ${task.priority} priority`,
      message_fr: `Une nouvelle tâche ${task.task_type} de priorité ${task.priority} vous a été assignée`,
      metadata: {
        task_id: validatedData.task_id,
        priority: task.priority,
        due_date: task.due_date,
        estimated_duration: task.estimated_duration_minutes
      }
    });
  
  if (notificationError) {
    console.warn('Failed to create notification:', notificationError);
  }
  
  // Update staff availability workload
  await supabase
    .from('staff_availability')
    .update({
      current_workload_percentage: Math.min(100, (currentWorkload + 1) * 25) // Simple calculation
    })
    .eq('user_id', validatedData.user_id)
    .eq('date', new Date().toISOString().split('T')[0]);
  
  return NextResponse.json({
    data: {
      task: updatedTask,
      assignment: assignment,
      assignee: assignee
    },
    message: 'Task assigned successfully',
    success: true
  });
}

async function handleAutoAssignment(
  supabase: any, 
  body: any, 
  assignedBy: string, 
  restaurantId: string
) {
  const validatedData = autoAssignSchema.parse(body);
  
  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', validatedData.task_id)
    .eq('restaurant_id', restaurantId)
    .single();
  
  if (taskError || !task) {
    return NextResponse.json(
      { error: 'Task not found', success: false },
      { status: 404 }
    );
  }
  
  // Check if task is already assigned
  if (task.assigned_to) {
    return NextResponse.json(
      { error: 'Task is already assigned', success: false },
      { status: 400 }
    );
  }
  
  // Use the database function to find best assignees
  const { data: candidates, error: candidatesError } = await supabase
    .rpc('find_best_assignee', {
      p_restaurant_id: restaurantId,
      p_required_skills: task.required_skills || [],
      p_location: task.location,
      p_scheduled_for: task.scheduled_for || new Date().toISOString(),
      p_required_role: 'staff'
    });
  
  if (candidatesError) {
    console.error('Error finding assignment candidates:', candidatesError);
    return NextResponse.json(
      { error: 'Failed to find assignment candidates', success: false },
      { status: 500 }
    );
  }
  
  if (!candidates || candidates.length === 0) {
    return NextResponse.json(
      { 
        error: 'No suitable candidates found for assignment',
        candidates: [],
        success: false 
      },
      { status: 404 }
    );
  }
  
  // Format candidates with additional details
  const formattedCandidates: AssignmentAlgorithmResult[] = candidates.slice(0, validatedData.max_candidates).map((candidate: any) => ({
    user_id: candidate.user_id,
    assignment_score: candidate.assignment_score,
    user_name: candidate.user_name,
    user_role: candidate.user_role,
    skill_match_score: candidate.assignment_score * 0.4, // Approximate breakdown
    availability_score: candidate.assignment_score * 0.3,
    workload_score: candidate.assignment_score * 0.2,
    location_score: candidate.assignment_score * 0.1,
    confidence_level: candidate.assignment_score >= 80 ? 'high' : 
                      candidate.assignment_score >= 60 ? 'medium' : 'low',
    reasons: [
      `Assignment score: ${candidate.assignment_score.toFixed(1)}`,
      `Role: ${candidate.user_role}`,
      candidate.assignment_score >= 80 ? 'High skill match' : 'Moderate skill match'
    ]
  }));
  
  // Auto-assign to the best candidate
  const bestCandidate = formattedCandidates[0];
  
  // Use the database function for auto-assignment
  const { data: assignedUserId, error: autoAssignError } = await supabase
    .rpc('auto_assign_task', {
      p_task_id: validatedData.task_id,
      p_assigned_by: assignedBy
    });
  
  if (autoAssignError) {
    console.error('Error auto-assigning task:', autoAssignError);
    return NextResponse.json(
      { error: 'Failed to auto-assign task', success: false },
      { status: 500 }
    );
  }
  
  if (!assignedUserId) {
    return NextResponse.json(
      { 
        error: 'Auto-assignment failed - no suitable assignee',
        candidates: formattedCandidates,
        success: false 
      },
      { status: 400 }
    );
  }
  
  // Get the updated task
  const { data: updatedTask, error: fetchError } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr, role),
      assigner:auth_users!tasks_assigned_by_fkey(id, full_name, full_name_fr, role)
    `)
    .eq('id', validatedData.task_id)
    .single();
  
  if (fetchError) {
    console.error('Error fetching updated task:', fetchError);
  }
  
  // Create notification for assignee
  await supabase
    .from('task_notifications')
    .insert({
      task_id: validatedData.task_id,
      user_id: assignedUserId,
      notification_type: 'task_assigned',
      channel: 'in_app',
      title: `Auto-Assigned Task: ${task.title}`,
      title_fr: `Tâche auto-assignée: ${task.title_fr}`,
      message: `You have been automatically assigned a ${task.task_type} task (Score: ${bestCandidate.assignment_score.toFixed(1)})`,
      message_fr: `Une tâche ${task.task_type} vous a été automatiquement assignée (Score: ${bestCandidate.assignment_score.toFixed(1)})`,
      metadata: {
        task_id: validatedData.task_id,
        auto_assigned: true,
        assignment_score: bestCandidate.assignment_score,
        algorithm_version: '1.0'
      }
    });
  
  return NextResponse.json({
    data: {
      task: updatedTask || task,
      assigned_to: assignedUserId,
      assignment_score: bestCandidate.assignment_score,
      candidates: formattedCandidates,
      algorithm_details: {
        total_candidates: candidates.length,
        selected_candidate: bestCandidate,
        assignment_method: 'automatic',
        confidence_level: bestCandidate.confidence_level
      }
    },
    message: 'Task auto-assigned successfully',
    success: true
  });
}