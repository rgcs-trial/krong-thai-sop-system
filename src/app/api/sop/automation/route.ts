/**
 * SOP Workflow Automation API Route
 * Handles automated workflows, triggers, and conditions for SOP management
 * 
 * GET    /api/sop/automation           - Get workflow automation rules
 * POST   /api/sop/automation           - Create new automation rules
 * PUT    /api/sop/automation/:id       - Update automation rule
 * DELETE /api/sop/automation/:id       - Delete automation rule
 * POST   /api/sop/automation/execute   - Manually execute automation rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPAuthContext 
} from '@/types/api/sop';

interface AutomationRule {
  id?: string;
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  rule_type: 'trigger' | 'condition' | 'action' | 'schedule';
  trigger_events: string[];
  conditions: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
    value: any;
    logic?: 'AND' | 'OR';
  }[];
  actions: {
    type: 'assign_sop' | 'send_notification' | 'update_status' | 'create_schedule' | 'escalate' | 'auto_complete';
    parameters: Record<string, any>;
  }[];
  priority: number;
  is_active: boolean;
  execution_count?: number;
  last_executed_at?: string;
  success_rate?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface AutomationExecution {
  id?: string;
  rule_id: string;
  trigger_event: string;
  trigger_data: Record<string, any>;
  execution_status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps_completed: number;
  total_steps: number;
  execution_log: {
    timestamp: string;
    step: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    data?: Record<string, any>;
  }[];
  error_messages?: string[];
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

interface TriggerEvent {
  event_type: string;
  event_data: Record<string, any>;
  source: string;
  timestamp: string;
}

/**
 * SOP Workflow Automation Engine
 * Manages automated workflows, triggers, and actions
 */
class SOPAutomationEngine {
  private context: SOPAuthContext;
  private restaurantId: string;

  constructor(context: SOPAuthContext) {
    this.context = context;
    this.restaurantId = context.restaurantId;
  }

  /**
   * Process trigger event and execute matching automation rules
   */
  async processTriggerEvent(event: TriggerEvent): Promise<AutomationExecution[]> {
    // Get active automation rules that match this event
    const matchingRules = await this.getMatchingRules(event);
    
    if (matchingRules.length === 0) {
      return [];
    }

    // Execute matching rules in priority order
    const executions: AutomationExecution[] = [];
    
    for (const rule of matchingRules.sort((a, b) => b.priority - a.priority)) {
      try {
        const execution = await this.executeRule(rule, event);
        executions.push(execution);
      } catch (error) {
        console.error(`Error executing automation rule ${rule.id}:`, error);
      }
    }

    return executions;
  }

  /**
   * Get automation rules that match the trigger event
   */
  private async getMatchingRules(event: TriggerEvent): Promise<AutomationRule[]> {
    const { data: rules } = await supabaseAdmin
      .from('workflow_automation_rules')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .eq('is_active', true)
      .contains('trigger_events', [event.event_type]);

    if (!rules) return [];

    // Filter rules based on conditions
    const matchingRules: AutomationRule[] = [];
    
    for (const rule of rules) {
      if (await this.evaluateConditions(rule.conditions, event.event_data)) {
        matchingRules.push(rule);
      }
    }

    return matchingRules;
  }

  /**
   * Evaluate rule conditions against event data
   */
  private async evaluateConditions(
    conditions: AutomationRule['conditions'],
    eventData: Record<string, any>
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogic: 'AND' | 'OR' = 'AND';

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateSingleCondition(condition, eventData);

      if (i === 0) {
        result = conditionResult;
      } else {
        if (currentLogic === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }

      // Set logic for next condition
      if (condition.logic) {
        currentLogic = condition.logic;
      }
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateSingleCondition(
    condition: AutomationRule['conditions'][0],
    eventData: Record<string, any>
  ): boolean {
    const fieldValue = this.getNestedValue(eventData, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Execute an automation rule
   */
  private async executeRule(rule: AutomationRule, event: TriggerEvent): Promise<AutomationExecution> {
    const execution: AutomationExecution = {
      rule_id: rule.id!,
      trigger_event: event.event_type,
      trigger_data: event.event_data,
      execution_status: 'running',
      steps_completed: 0,
      total_steps: rule.actions.length,
      execution_log: [],
      started_at: new Date().toISOString()
    };

    // Store execution record
    const { data: storedExecution } = await supabaseAdmin
      .from('workflow_executions')
      .insert({
        restaurant_id: this.restaurantId,
        rule_id: rule.id!,
        trigger_event: event.event_type,
        trigger_data: event.event_data,
        execution_status: 'running',
        steps_completed: 0,
        total_steps: rule.actions.length,
        execution_log: [],
        started_at: execution.started_at
      })
      .select()
      .single();

    if (storedExecution) {
      execution.id = storedExecution.id;
    }

    // Execute actions sequentially
    for (let i = 0; i < rule.actions.length; i++) {
      const action = rule.actions[i];
      
      try {
        await this.executeAction(action, event.event_data, execution);
        execution.steps_completed++;
        
        execution.execution_log.push({
          timestamp: new Date().toISOString(),
          step: `action_${i + 1}`,
          status: 'success',
          message: `Successfully executed ${action.type}`,
          data: action.parameters
        });
      } catch (error) {
        execution.execution_log.push({
          timestamp: new Date().toISOString(),
          step: `action_${i + 1}`,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: action.parameters
        });

        if (!execution.error_messages) execution.error_messages = [];
        execution.error_messages.push(`Action ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        break;
      }
    }

    // Mark execution as completed or failed
    execution.execution_status = execution.steps_completed === rule.actions.length ? 'completed' : 'failed';
    execution.completed_at = new Date().toISOString();
    execution.duration_ms = new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime();

    // Update execution record
    if (execution.id) {
      await supabaseAdmin
        .from('workflow_executions')
        .update({
          execution_status: execution.execution_status,
          steps_completed: execution.steps_completed,
          execution_log: execution.execution_log,
          error_messages: execution.error_messages,
          completed_at: execution.completed_at,
          duration_ms: execution.duration_ms
        })
        .eq('id', execution.id);
    }

    // Update rule statistics
    await this.updateRuleStatistics(rule.id!, execution.execution_status === 'completed');

    return execution;
  }

  /**
   * Execute a specific action
   */
  private async executeAction(
    action: AutomationRule['actions'][0],
    eventData: Record<string, any>,
    execution: AutomationExecution
  ): Promise<void> {
    switch (action.type) {
      case 'assign_sop':
        await this.executeAssignSOPAction(action.parameters, eventData);
        break;
      case 'send_notification':
        await this.executeSendNotificationAction(action.parameters, eventData);
        break;
      case 'update_status':
        await this.executeUpdateStatusAction(action.parameters, eventData);
        break;
      case 'create_schedule':
        await this.executeCreateScheduleAction(action.parameters, eventData);
        break;
      case 'escalate':
        await this.executeEscalateAction(action.parameters, eventData);
        break;
      case 'auto_complete':
        await this.executeAutoCompleteAction(action.parameters, eventData);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute assign SOP action
   */
  private async executeAssignSOPAction(parameters: Record<string, any>, eventData: Record<string, any>): Promise<void> {
    const { sop_id, assigned_to, due_date_days, priority } = parameters;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (due_date_days || 3));

    const assignmentData = {
      restaurant_id: this.restaurantId,
      sop_id: sop_id || eventData.sop_id,
      assigned_to: assigned_to || eventData.user_id,
      assigned_by: this.context.userId,
      due_date: dueDate.toISOString(),
      priority: priority || 'medium',
      status: 'pending',
      notes: 'Auto-assigned by workflow automation'
    };

    const { error } = await supabaseAdmin
      .from('sop_assignments')
      .insert(assignmentData);

    if (error) {
      throw new Error(`Failed to assign SOP: ${error.message}`);
    }
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotificationAction(parameters: Record<string, any>, eventData: Record<string, any>): Promise<void> {
    const { user_ids, notification_type, title, title_fr, message, message_fr } = parameters;
    
    const targetUserIds = user_ids || [eventData.user_id];
    if (!targetUserIds || targetUserIds.length === 0) {
      throw new Error('No target users specified for notification');
    }

    const notificationData = targetUserIds.map((userId: string) => ({
      restaurant_id: this.restaurantId,
      user_id: userId,
      notification_type: notification_type || 'automation',
      title: title || 'Automated Notification',
      title_fr: title_fr || 'Notification Automatisée',
      message: message || 'This is an automated notification',
      message_fr: message_fr || 'Ceci est une notification automatisée',
      sop_id: eventData.sop_id,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
      .from('sop_notifications')
      .insert(notificationData);

    if (error) {
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Execute update status action
   */
  private async executeUpdateStatusAction(parameters: Record<string, any>, eventData: Record<string, any>): Promise<void> {
    const { target_table, target_id_field, new_status, where_conditions } = parameters;
    
    if (!target_table || !new_status) {
      throw new Error('Missing required parameters for status update');
    }

    const targetId = eventData[target_id_field] || eventData.id;
    if (!targetId) {
      throw new Error('Could not determine target ID for status update');
    }

    let query = supabaseAdmin
      .from(target_table)
      .update({ status: new_status, updated_at: new Date().toISOString() })
      .eq(target_id_field || 'id', targetId)
      .eq('restaurant_id', this.restaurantId);

    // Apply additional where conditions
    if (where_conditions) {
      Object.entries(where_conditions).forEach(([field, value]) => {
        query = query.eq(field, value);
      });
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Execute create schedule action
   */
  private async executeCreateScheduleAction(parameters: Record<string, any>, eventData: Record<string, any>): Promise<void> {
    const { sop_id, schedule_type, schedule_config, assigned_roles } = parameters;

    const scheduleData = {
      restaurant_id: this.restaurantId,
      sop_id: sop_id || eventData.sop_id,
      schedule_type: schedule_type || 'weekly',
      schedule_config: schedule_config || { days_of_week: [1, 2, 3, 4, 5], time: '09:00' },
      assigned_roles: assigned_roles || ['server'],
      is_active: true,
      next_due_date: this.calculateNextDueDate(schedule_config)
    };

    const { error } = await supabaseAdmin
      .from('sop_schedules')
      .insert(scheduleData);

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }
  }

  /**
   * Execute escalate action
   */
  private async executeEscalateAction(parameters: Record<string, any>, eventData: Record<string, any>): Promise<void> {
    const { escalate_to_role, escalation_message, include_context } = parameters;

    // Find users with the escalation role
    const { data: escalationUsers } = await supabaseAdmin
      .from('auth_users')
      .select('id, full_name, email')
      .eq('restaurant_id', this.restaurantId)
      .eq('role', escalate_to_role || 'manager')
      .eq('is_active', true);

    if (!escalationUsers || escalationUsers.length === 0) {
      throw new Error(`No users found with role: ${escalate_to_role}`);
    }

    // Create escalation notifications
    const notificationData = escalationUsers.map(user => ({
      restaurant_id: this.restaurantId,
      user_id: user.id,
      notification_type: 'escalation',
      title: 'Escalation Alert',
      title_fr: 'Alerte d\'Escalade',
      message: escalation_message || 'An issue requires your attention',
      message_fr: escalation_message || 'Un problème nécessite votre attention',
      sop_id: eventData.sop_id,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
      .from('sop_notifications')
      .insert(notificationData);

    if (error) {
      throw new Error(`Failed to escalate: ${error.message}`);
    }
  }

  /**
   * Execute auto complete action
   */
  private async executeAutoCompleteAction(parameters: Record<string, any>, eventData: Record<string, any>): Promise<void> {
    const { assignment_id, completion_percentage, notes } = parameters;

    const targetAssignmentId = assignment_id || eventData.assignment_id;
    if (!targetAssignmentId) {
      throw new Error('No assignment ID provided for auto-completion');
    }

    // Update assignment status
    const { error: assignmentError } = await supabaseAdmin
      .from('sop_assignments')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', targetAssignmentId)
      .eq('restaurant_id', this.restaurantId);

    if (assignmentError) {
      throw new Error(`Failed to update assignment: ${assignmentError.message}`);
    }

    // Create or update user progress
    const { data: assignment } = await supabaseAdmin
      .from('sop_assignments')
      .select('sop_id, assigned_to')
      .eq('id', targetAssignmentId)
      .single();

    if (assignment) {
      const { error: progressError } = await supabaseAdmin
        .from('user_progress')
        .upsert({
          restaurant_id: this.restaurantId,
          user_id: assignment.assigned_to,
          sop_id: assignment.sop_id,
          progress_percentage: completion_percentage || 100,
          time_spent: 0, // Auto-completed
          last_accessed: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (progressError) {
        throw new Error(`Failed to update progress: ${progressError.message}`);
      }
    }
  }

  /**
   * Helper methods
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateNextDueDate(scheduleConfig: any): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString();
  }

  private async updateRuleStatistics(ruleId: string, success: boolean): Promise<void> {
    const { data: currentStats } = await supabaseAdmin
      .from('workflow_automation_rules')
      .select('execution_count, success_rate')
      .eq('id', ruleId)
      .single();

    if (currentStats) {
      const newExecutionCount = (currentStats.execution_count || 0) + 1;
      const currentSuccesses = Math.round((currentStats.success_rate || 1) * (currentStats.execution_count || 0));
      const newSuccesses = currentSuccesses + (success ? 1 : 0);
      const newSuccessRate = newSuccesses / newExecutionCount;

      await supabaseAdmin
        .from('workflow_automation_rules')
        .update({
          execution_count: newExecutionCount,
          success_rate: newSuccessRate,
          last_executed_at: new Date().toISOString()
        })
        .eq('id', ruleId);
    }
  }

  /**
   * Create a new automation rule
   */
  async createAutomationRule(rule: AutomationRule): Promise<AutomationRule> {
    const ruleData = {
      restaurant_id: this.restaurantId,
      name: rule.name,
      name_fr: rule.name_fr,
      description: rule.description,
      description_fr: rule.description_fr,
      rule_type: rule.rule_type,
      trigger_events: rule.trigger_events,
      conditions: rule.conditions,
      actions: rule.actions,
      priority: rule.priority || 0,
      is_active: rule.is_active !== false,
      execution_count: 0,
      success_rate: 1.0,
      created_by: this.context.userId
    };

    const { data: createdRule, error } = await supabaseAdmin
      .from('workflow_automation_rules')
      .insert(ruleData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create automation rule: ${error.message}`);
    }

    return createdRule;
  }
}

/**
 * GET /api/sop/automation - Get workflow automation rules
 */
async function handleGetAutomationRules(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const ruleType = searchParams.get('rule_type');
    const isActive = searchParams.get('is_active');
    const triggerEvent = searchParams.get('trigger_event');

    // Validate pagination
    const paginationValidation = validatePagination({ page, limit });
    if (!paginationValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters',
        details: paginationValidation.errors,
      } as APIResponse, { status: 400 });
    }

    // Build query
    let query = supabaseAdmin
      .from('workflow_automation_rules')
      .select(`
        *,
        created_by_user:auth_users!created_by(id, full_name, email),
        recent_executions:workflow_executions(
          id, execution_status, started_at, completed_at, duration_ms
        )
      `, { count: 'exact' })
      .eq('restaurant_id', context.restaurantId);

    if (ruleType) {
      query = query.eq('rule_type', ruleType);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (triggerEvent) {
      query = query.contains('trigger_events', [triggerEvent]);
    }

    query = query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: rules, error, count } = await query;

    if (error) {
      console.error('Error fetching automation rules:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch automation rules',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const response = {
      success: true,
      data: rules || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/automation:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/automation - Create new automation rule
 */
async function handleCreateAutomationRule(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const ruleData = sanitizeInput(body) as AutomationRule;

    // Validate required fields
    if (!ruleData.name || !ruleData.name_fr || !ruleData.rule_type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, name_fr, and rule_type',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    if (!ruleData.trigger_events || ruleData.trigger_events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one trigger event is required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    if (!ruleData.actions || ruleData.actions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one action is required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const engine = new SOPAutomationEngine(context);
    const createdRule = await engine.createAutomationRule(ruleData);

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'automation_rule',
      createdRule.id!,
      null,
      ruleData,
      request
    );

    const response: APIResponse<AutomationRule> = {
      success: true,
      data: createdRule,
      message: 'Automation rule created successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/automation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'CREATION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * PUT /api/sop/automation/:id - Update automation rule
 */
async function handleUpdateAutomationRule(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const ruleId = url.pathname.split('/').pop();

    if (!ruleId) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID is required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const body = await request.json();
    const updateData = sanitizeInput(body) as Partial<AutomationRule>;

    // Remove fields that shouldn't be updated
    delete (updateData as any).id;
    delete (updateData as any).created_by;
    delete (updateData as any).created_at;
    delete (updateData as any).execution_count;
    delete (updateData as any).success_rate;

    const { data: updatedRule, error } = await supabaseAdmin
      .from('workflow_automation_rules')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId)
      .eq('restaurant_id', context.restaurantId)
      .select()
      .single();

    if (error || !updatedRule) {
      return NextResponse.json({
        success: false,
        error: 'Automation rule not found or access denied',
        errorCode: 'NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'automation_rule',
      ruleId,
      null,
      updateData,
      request
    );

    const response: APIResponse<AutomationRule> = {
      success: true,
      data: updatedRule,
      message: 'Automation rule updated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in PUT /api/sop/automation:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * DELETE /api/sop/automation/:id - Delete automation rule
 */
async function handleDeleteAutomationRule(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const ruleId = url.pathname.split('/').pop();

    if (!ruleId) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID is required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const { data: deletedRule, error } = await supabaseAdmin
      .from('workflow_automation_rules')
      .delete()
      .eq('id', ruleId)
      .eq('restaurant_id', context.restaurantId)
      .select()
      .single();

    if (error || !deletedRule) {
      return NextResponse.json({
        success: false,
        error: 'Automation rule not found or access denied',
        errorCode: 'NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'DELETE',
      'automation_rule',
      ruleId,
      deletedRule,
      null,
      request
    );

    const response: APIResponse = {
      success: true,
      message: 'Automation rule deleted successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in DELETE /api/sop/automation:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/automation/execute - Manually execute automation rule
 */
async function handleExecuteAutomationRule(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { rule_id, trigger_event, event_data } = sanitizeInput(body);

    if (!rule_id || !trigger_event) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID and trigger event are required',
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    const triggerEventData: TriggerEvent = {
      event_type: trigger_event,
      event_data: event_data || {},
      source: 'manual_execution',
      timestamp: new Date().toISOString()
    };

    const engine = new SOPAutomationEngine(context);
    const executions = await engine.processTriggerEvent(triggerEventData);

    // Log audit event
    logAuditEvent(
      context,
      'EXECUTE',
      'automation_rule',
      rule_id,
      null,
      { trigger_event, event_data, executions_count: executions.length },
      request
    );

    const response: APIResponse<AutomationExecution[]> = {
      success: true,
      data: executions,
      message: `Executed ${executions.length} automation rules`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/automation/execute:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorCode: 'EXECUTION_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetAutomationRules, PERMISSIONS.SOP.READ, {
  maxRequests: 200,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(async (request: NextRequest, context: SOPAuthContext) => {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/execute')) {
    return handleExecuteAutomationRule(request, context);
  } else {
    return handleCreateAutomationRule(request, context);
  }
}, PERMISSIONS.SOP.CREATE, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

export const PUT = withAuth(handleUpdateAutomationRule, PERMISSIONS.SOP.UPDATE, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export const DELETE = withAuth(handleDeleteAutomationRule, PERMISSIONS.SOP.DELETE, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}