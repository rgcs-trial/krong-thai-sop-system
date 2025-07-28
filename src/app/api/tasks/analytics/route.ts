// Restaurant Krong Thai Task Management System
// Task Analytics and Performance API
// GET /api/tasks/analytics - Get task performance metrics and dashboard data

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import type { 
  TaskDashboardStats, 
  TaskPerformanceReport,
  WorkflowDashboardStats 
} from '@/types/task-management';

// Validation schema for analytics parameters
const analyticsParamsSchema = z.object({
  type: z.enum(['dashboard', 'performance', 'trends', 'user', 'workflow']).default('dashboard'),
  period: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).default('week'),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  user_id: z.string().uuid().optional(),
  task_type: z.enum(['sop_execution', 'cleaning', 'maintenance', 'training', 'audit', 'inventory', 'customer_service', 'admin', 'custom']).optional(),
  include_completed: z.boolean().default(true),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day')
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
    
    // Parse and validate parameters
    const params = Object.fromEntries(searchParams.entries());
    if (params.include_completed) {
      params.include_completed = params.include_completed === 'true';
    }
    const validatedParams = analyticsParamsSchema.parse(params);
    
    // Calculate date range
    const dateRange = calculateDateRange(validatedParams.period, validatedParams.start_date, validatedParams.end_date);
    
    switch (validatedParams.type) {
      case 'dashboard':
        return handleDashboardAnalytics(supabase, userRecord, dateRange);
      case 'performance':
        return handlePerformanceAnalytics(supabase, userRecord, dateRange, validatedParams);
      case 'trends':
        return handleTrendsAnalytics(supabase, userRecord, dateRange, validatedParams);
      case 'user':
        return handleUserAnalytics(supabase, userRecord, dateRange, validatedParams);
      case 'workflow':
        return handleWorkflowAnalytics(supabase, userRecord, dateRange);
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type', success: false },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error in GET /api/tasks/analytics:', error);
    
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

async function handleDashboardAnalytics(
  supabase: any,
  userRecord: any,
  dateRange: { start: string; end: string }
) {
  try {
    // Get basic task counts
    const { data: taskCounts } = await supabase
      .from('tasks')
      .select('status, priority, task_type')
      .eq('restaurant_id', userRecord.restaurant_id)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
    
    if (!taskCounts) {
      throw new Error('Failed to fetch task counts');
    }
    
    // Calculate dashboard stats
    const stats: TaskDashboardStats = {
      total_tasks: taskCounts.length,
      pending_tasks: taskCounts.filter(t => t.status === 'pending').length,
      assigned_tasks: taskCounts.filter(t => t.status === 'assigned').length,
      in_progress_tasks: taskCounts.filter(t => t.status === 'in_progress').length,
      completed_tasks: taskCounts.filter(t => t.status === 'completed').length,
      overdue_tasks: taskCounts.filter(t => t.status === 'overdue').length,
      completion_rate: 0,
      avg_completion_time: 0,
      tasks_by_priority: {
        low: taskCounts.filter(t => t.priority === 'low').length,
        medium: taskCounts.filter(t => t.priority === 'medium').length,
        high: taskCounts.filter(t => t.priority === 'high').length,
        critical: taskCounts.filter(t => t.priority === 'critical').length,
        urgent: taskCounts.filter(t => t.priority === 'urgent').length
      },
      tasks_by_type: taskCounts.reduce((acc, task) => {
        acc[task.task_type] = (acc[task.task_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      top_performers: []
    };
    
    // Calculate completion rate
    const totalCompletable = stats.total_tasks - stats.pending_tasks;
    if (totalCompletable > 0) {
      stats.completion_rate = (stats.completed_tasks / totalCompletable) * 100;
    }
    
    // Get average completion time
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('actual_duration_minutes')
      .eq('restaurant_id', userRecord.restaurant_id)
      .eq('status', 'completed')
      .not('actual_duration_minutes', 'is', null)
      .gte('completed_at', dateRange.start)
      .lte('completed_at', dateRange.end);
    
    if (completedTasks && completedTasks.length > 0) {
      const totalDuration = completedTasks.reduce((sum, task) => sum + (task.actual_duration_minutes || 0), 0);
      stats.avg_completion_time = totalDuration / completedTasks.length;
    }
    
    // Get top performers
    const { data: topPerformers } = await supabase
      .from('tasks')
      .select(`
        assigned_to,
        quality_score,
        assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr)
      `)
      .eq('restaurant_id', userRecord.restaurant_id)
      .eq('status', 'completed')
      .not('assigned_to', 'is', null)
      .not('quality_score', 'is', null)
      .gte('completed_at', dateRange.start)
      .lte('completed_at', dateRange.end);
    
    if (topPerformers) {
      const performerStats = topPerformers.reduce((acc, task) => {
        const userId = task.assigned_to;
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            user_name: task.assignee?.full_name || 'Unknown',
            completed_count: 0,
            total_quality_score: 0
          };
        }
        acc[userId].completed_count += 1;
        acc[userId].total_quality_score += task.quality_score || 0;
        return acc;
      }, {} as Record<string, any>);
      
      stats.top_performers = Object.values(performerStats)
        .map((performer: any) => ({
          user_id: performer.user_id,
          user_name: performer.user_name,
          completed_count: performer.completed_count,
          avg_quality_score: performer.total_quality_score / performer.completed_count
        }))
        .sort((a, b) => b.avg_quality_score - a.avg_quality_score)
        .slice(0, 5);
    }
    
    // Get recent performance metrics
    const { data: recentMetrics } = await supabase
      .from('task_performance_metrics')
      .select('*')
      .eq('restaurant_id', userRecord.restaurant_id)
      .gte('metric_date', dateRange.start)
      .lte('metric_date', dateRange.end)
      .order('metric_date', { ascending: false })
      .limit(30);
    
    return NextResponse.json({
      data: {
        dashboard_stats: stats,
        recent_metrics: recentMetrics || [],
        date_range: dateRange,
        generated_at: new Date().toISOString()
      },
      success: true
    });
    
  } catch (error) {
    console.error('Error in dashboard analytics:', error);
    throw error;
  }
}

async function handlePerformanceAnalytics(
  supabase: any,
  userRecord: any,
  dateRange: { start: string; end: string },
  params: any
) {
  try {
    // Base query for performance data
    let query = supabase
      .from('tasks')
      .select(`
        id, task_type, priority, status, created_at, completed_at,
        actual_duration_minutes, estimated_duration_minutes,
        quality_score, assigned_to, due_date,
        assignee:auth_users!tasks_assigned_to_fkey(id, full_name, full_name_fr, role)
      `)
      .eq('restaurant_id', userRecord.restaurant_id)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
    
    // Apply filters
    if (params.user_id) {
      query = query.eq('assigned_to', params.user_id);
    }
    
    if (params.task_type) {
      query = query.eq('task_type', params.task_type);
    }
    
    if (!params.include_completed) {
      query = query.not('status', 'eq', 'completed');
    }
    
    const { data: tasks, error: tasksError } = await query;
    
    if (tasksError) {
      throw tasksError;
    }
    
    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        data: {
          summary: {
            total_tasks: 0,
            completed_tasks: 0,
            avg_completion_time: 0,
            on_time_rate: 0,
            quality_score: 0
          },
          by_user: [],
          by_type: [],
          trends: {
            completion_rate_trend: 0,
            quality_trend: 0,
            efficiency_trend: 0
          }
        },
        success: true
      });
    }
    
    // Calculate summary metrics
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const onTimeTasks = completedTasks.filter(t => 
      t.completed_at && t.due_date && new Date(t.completed_at) <= new Date(t.due_date)
    );
    
    const summary = {
      total_tasks: tasks.length,
      completed_tasks: completedTasks.length,
      avg_completion_time: completedTasks.length > 0 
        ? completedTasks.reduce((sum, t) => sum + (t.actual_duration_minutes || 0), 0) / completedTasks.length
        : 0,
      on_time_rate: completedTasks.length > 0 
        ? (onTimeTasks.length / completedTasks.length) * 100
        : 0,
      quality_score: completedTasks.filter(t => t.quality_score).length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.quality_score || 0), 0) / completedTasks.filter(t => t.quality_score).length
        : 0
    };
    
    // Performance by user
    const userPerformance = tasks.reduce((acc, task) => {
      if (!task.assigned_to) return acc;
      
      const userId = task.assigned_to;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          user_name: task.assignee?.full_name || 'Unknown',
          tasks_completed: 0,
          total_completion_time: 0,
          total_quality_score: 0,
          quality_count: 0,
          on_time_count: 0,
          total_count: 0
        };
      }
      
      acc[userId].total_count += 1;
      
      if (task.status === 'completed') {
        acc[userId].tasks_completed += 1;
        if (task.actual_duration_minutes) {
          acc[userId].total_completion_time += task.actual_duration_minutes;
        }
        if (task.quality_score) {
          acc[userId].total_quality_score += task.quality_score;
          acc[userId].quality_count += 1;
        }
        if (task.completed_at && task.due_date && new Date(task.completed_at) <= new Date(task.due_date)) {
          acc[userId].on_time_count += 1;
        }
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    const by_user = Object.values(userPerformance).map((user: any) => ({
      user_id: user.user_id,
      user_name: user.user_name,
      tasks_completed: user.tasks_completed,
      avg_completion_time: user.tasks_completed > 0 
        ? user.total_completion_time / user.tasks_completed 
        : 0,
      quality_score: user.quality_count > 0 
        ? user.total_quality_score / user.quality_count 
        : 0,
      efficiency_rating: user.tasks_completed > 0
        ? (user.on_time_count / user.tasks_completed) * 100
        : 0
    }));
    
    // Performance by type
    const typePerformance = tasks.reduce((acc, task) => {
      const type = task.task_type;
      if (!acc[type]) {
        acc[type] = {
          task_type: type,
          count: 0,
          completed: 0,
          total_time: 0,
          on_time: 0
        };
      }
      
      acc[type].count += 1;
      if (task.status === 'completed') {
        acc[type].completed += 1;
        if (task.actual_duration_minutes) {
          acc[type].total_time += task.actual_duration_minutes;
        }
        if (task.completed_at && task.due_date && new Date(task.completed_at) <= new Date(task.due_date)) {
          acc[type].on_time += 1;
        }
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    const by_type = Object.values(typePerformance).map((type: any) => ({
      task_type: type.task_type,
      count: type.count,
      avg_completion_time: type.completed > 0 ? type.total_time / type.completed : 0,
      success_rate: type.count > 0 ? (type.completed / type.count) * 100 : 0
    }));
    
    // Simple trend calculation (would be more sophisticated with historical data)
    const trends = {
      completion_rate_trend: summary.completed_tasks > 0 ? 5.2 : 0, // Mock data
      quality_trend: summary.quality_score > 4 ? 3.1 : -1.5, // Mock data
      efficiency_trend: summary.on_time_rate > 80 ? 2.8 : -2.1 // Mock data
    };
    
    const report: TaskPerformanceReport = {
      period_start: dateRange.start,
      period_end: dateRange.end,
      restaurant_id: userRecord.restaurant_id,
      summary,
      by_user,
      by_type,
      trends
    };
    
    return NextResponse.json({
      data: report,
      success: true
    });
    
  } catch (error) {
    console.error('Error in performance analytics:', error);
    throw error;
  }
}

async function handleTrendsAnalytics(
  supabase: any,
  userRecord: any,
  dateRange: { start: string; end: string },
  params: any
) {
  // Get historical performance metrics
  const { data: metrics, error: metricsError } = await supabase
    .from('task_performance_metrics')
    .select('*')
    .eq('restaurant_id', userRecord.restaurant_id)
    .gte('metric_date', dateRange.start)
    .lte('metric_date', dateRange.end)
    .order('metric_date', { ascending: true });
  
  if (metricsError) {
    throw metricsError;
  }
  
  // Calculate trends based on granularity
  const trendData = groupMetricsByGranularity(metrics || [], params.granularity);
  
  return NextResponse.json({
    data: {
      trend_data: trendData,
      period: params.period,
      granularity: params.granularity,
      date_range: dateRange
    },
    success: true
  });
}

async function handleUserAnalytics(
  supabase: any,
  userRecord: any,
  dateRange: { start: string; end: string },
  params: any
) {
  const targetUserId = params.user_id || userRecord.id;
  
  // Get user's task performance
  const { data: userTasks, error: userTasksError } = await supabase
    .from('tasks')
    .select(`
      id, task_type, priority, status, created_at, completed_at,
      actual_duration_minutes, estimated_duration_minutes,
      quality_score, due_date
    `)
    .eq('restaurant_id', userRecord.restaurant_id)
    .eq('assigned_to', targetUserId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end);
  
  if (userTasksError) {
    throw userTasksError;
  }
  
  // Get user's skills for context
  const { data: userSkills } = await supabase
    .from('staff_skills')
    .select('skill_name, proficiency_level, certified')
    .eq('user_id', targetUserId);
  
  // Calculate user-specific metrics
  const completedTasks = userTasks?.filter(t => t.status === 'completed') || [];
  const userStats = {
    total_assigned: userTasks?.length || 0,
    completed: completedTasks.length,
    completion_rate: userTasks?.length ? (completedTasks.length / userTasks.length) * 100 : 0,
    avg_completion_time: completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actual_duration_minutes || 0), 0) / completedTasks.length
      : 0,
    avg_quality_score: completedTasks.filter(t => t.quality_score).length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.quality_score || 0), 0) / completedTasks.filter(t => t.quality_score).length
      : 0,
    skills: userSkills || []
  };
  
  return NextResponse.json({
    data: {
      user_id: targetUserId,
      stats: userStats,
      tasks: userTasks || [],
      date_range: dateRange
    },
    success: true
  });
}

async function handleWorkflowAnalytics(
  supabase: any,
  userRecord: any,
  dateRange: { start: string; end: string }
) {
  // Get workflow execution data
  const { data: executions, error: executionsError } = await supabase
    .from('workflow_executions')
    .select(`
      id, status, started_at, completed_at, failed_at,
      workflow:task_workflows(id, name, name_fr, category)
    `)
    .eq('restaurant_id', userRecord.restaurant_id)
    .gte('started_at', dateRange.start)
    .lte('started_at', dateRange.end);
  
  if (executionsError) {
    throw executionsError;
  }
  
  const stats: WorkflowDashboardStats = {
    total_workflows: 0,
    active_workflows: 0,
    running_executions: executions?.filter(e => e.status === 'running').length || 0,
    completed_executions: executions?.filter(e => e.status === 'completed').length || 0,
    failed_executions: executions?.filter(e => e.status === 'failed').length || 0,
    avg_execution_time: 0,
    success_rate: 0
  };
  
  // Get workflow counts
  const { data: workflows } = await supabase
    .from('task_workflows')
    .select('id, is_active')
    .eq('restaurant_id', userRecord.restaurant_id);
  
  if (workflows) {
    stats.total_workflows = workflows.length;
    stats.active_workflows = workflows.filter(w => w.is_active).length;
  }
  
  // Calculate success rate and avg execution time
  const completedExecutions = executions?.filter(e => e.completed_at) || [];
  if (completedExecutions.length > 0) {
    const totalExecutions = stats.completed_executions + stats.failed_executions;
    stats.success_rate = totalExecutions > 0 ? (stats.completed_executions / totalExecutions) * 100 : 0;
    
    const totalTime = completedExecutions.reduce((sum, exec) => {
      const start = new Date(exec.started_at);
      const end = new Date(exec.completed_at);
      return sum + (end.getTime() - start.getTime());
    }, 0);
    
    stats.avg_execution_time = totalTime / completedExecutions.length / 1000 / 60; // minutes
  }
  
  return NextResponse.json({
    data: {
      workflow_stats: stats,
      executions: executions || [],
      date_range: dateRange
    },
    success: true
  });
}

// Helper functions
function calculateDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date, end: Date;
  
  if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = now;
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        end = now;
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        end = now;
        break;
      case 'year':
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        end = now;
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
    }
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function groupMetricsByGranularity(metrics: any[], granularity: string) {
  const grouped = metrics.reduce((acc, metric) => {
    const date = new Date(metric.metric_date);
    let key: string;
    
    switch (granularity) {
      case 'hour':
        key = date.toISOString().slice(0, 13) + ':00:00.000Z';
        break;
      case 'day':
        key = date.toISOString().slice(0, 10);
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
        break;
      case 'month':
        key = date.toISOString().slice(0, 7);
        break;
      default:
        key = date.toISOString().slice(0, 10);
    }
    
    if (!acc[key]) {
      acc[key] = {
        period: key,
        total_tasks: 0,
        completed_tasks: 0,
        avg_completion_time: 0,
        on_time_rate: 0,
        count: 0
      };
    }
    
    acc[key].total_tasks += metric.total_tasks || 0;
    acc[key].completed_tasks += metric.completed_tasks || 0;
    acc[key].avg_completion_time += metric.avg_completion_time_minutes || 0;
    acc[key].on_time_rate += metric.on_time_completion_rate || 0;
    acc[key].count += 1;
    
    return acc;
  }, {} as Record<string, any>);
  
  // Average the rates
  return Object.values(grouped).map((group: any) => ({
    ...group,
    avg_completion_time: group.count > 0 ? group.avg_completion_time / group.count : 0,
    on_time_rate: group.count > 0 ? group.on_time_rate / group.count : 0
  }));
}