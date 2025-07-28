// Restaurant Krong Thai Task Management System
// Task Management Types and Interfaces
// Created: 2025-07-28

// ===========================================
// TASK MANAGEMENT ENUMS
// ===========================================

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'cancelled' | 'overdue' | 'escalated';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';
export type TaskType = 'sop_execution' | 'cleaning' | 'maintenance' | 'training' | 'audit' | 'inventory' | 'customer_service' | 'admin' | 'custom';
export type AssignmentStatus = 'assigned' | 'accepted' | 'declined' | 'completed';
export type NotificationType = 'task_assigned' | 'task_due' | 'task_overdue' | 'task_completed' | 'escalation' | 'reminder' | 'dependency_ready' | 'workflow_trigger';
export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';
export type WorkflowTriggerType = 'time_based' | 'event_based' | 'completion_based' | 'manual' | 'conditional';

// ===========================================
// TASK MANAGEMENT INTERFACES
// ===========================================

// Task Template interface
export interface TaskTemplate {
  id: string;
  restaurant_id: string;
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  category?: string;
  task_type: TaskType;
  estimated_duration_minutes?: number;
  priority: TaskPriority;
  required_skills: string[];
  equipment_needed: string[];
  location_specific: boolean;
  locations: string[];
  checklist_items: ChecklistItem[];
  checklist_items_fr: ChecklistItem[];
  sop_document_id?: string;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  dependencies: string[];
  auto_assign_rules: AutoAssignRules;
  approval_required: boolean;
  tags: string[];
  is_active: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: import('./database').Restaurant;
  sop_document?: import('./database').SOPDocument;
  creator?: import('./database').AuthUser;
  updater?: import('./database').AuthUser;
}

// Task interface
export interface Task {
  id: string;
  restaurant_id: string;
  template_id?: string;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  
  // Scheduling
  scheduled_for?: string;
  due_date?: string;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  
  // Location and requirements
  location?: string;
  location_details: Record<string, any>;
  required_skills: string[];
  equipment_needed: string[];
  
  // Task execution
  checklist_items: ChecklistItem[];
  checklist_items_fr: ChecklistItem[];
  checklist_progress: Record<string, boolean>;
  attachments: string[];
  notes?: string;
  notes_fr?: string;
  
  // Assignment and workflow
  assigned_to?: string;
  assigned_by?: string;
  assigned_at?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  
  // Dependencies and workflow
  parent_task_id?: string;
  workflow_id?: string;
  dependencies: string[];
  dependent_tasks: string[];
  
  // Quality and approval
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  quality_score?: number;
  feedback?: string;
  
  // Metadata
  metadata: Record<string, any>;
  tags: string[];
  version: number;
  is_recurring_instance: boolean;
  recurrence_id?: string;
  
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: import('./database').Restaurant;
  template?: TaskTemplate;
  assignee?: import('./database').AuthUser;
  assigner?: import('./database').AuthUser;
  approver?: import('./database').AuthUser;
  creator?: import('./database').AuthUser;
  updater?: import('./database').AuthUser;
  parent_task?: Task;
  assignments?: TaskAssignment[];
}

// Staff Skills interface
export interface StaffSkill {
  id: string;
  user_id: string;
  skill_name: string;
  skill_category?: string;
  proficiency_level: number; // 1-5
  certified: boolean;
  certification_date?: string;
  certification_expires?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  user?: import('./database').AuthUser;
}

// Staff Availability interface
export interface StaffAvailability {
  id: string;
  user_id: string;
  restaurant_id: string;
  date: string;
  shift_start?: string;
  shift_end?: string;
  break_start?: string;
  break_end?: string;
  is_available: boolean;
  max_concurrent_tasks: number;
  current_workload_percentage: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  user?: import('./database').AuthUser;
  restaurant?: import('./database').Restaurant;
}

// Task Assignment interface
export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string;
  assignment_status: AssignmentStatus;
  assigned_at: string;
  accepted_at?: string;
  declined_at?: string;
  completed_at?: string;
  decline_reason?: string;
  auto_assigned: boolean;
  assignment_score?: number;
  notes?: string;
  
  // Relations
  task?: Task;
  user?: import('./database').AuthUser;
  assigner?: import('./database').AuthUser;
}

// Task Workflow interface
export interface TaskWorkflow {
  id: string;
  restaurant_id: string;
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  category?: string;
  workflow_definition: WorkflowDefinition;
  trigger_conditions: Record<string, any>;
  trigger_type: WorkflowTriggerType;
  is_active: boolean;
  success_criteria: Record<string, any>;
  failure_handling: Record<string, any>;
  estimated_total_duration?: number;
  tags: string[];
  version: number;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: import('./database').Restaurant;
  creator?: import('./database').AuthUser;
  updater?: import('./database').AuthUser;
}

// Workflow Execution interface
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  restaurant_id: string;
  status: string;
  triggered_by?: string;
  trigger_event: Record<string, any>;
  started_at: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  current_step: number;
  total_steps?: number;
  execution_context: Record<string, any>;
  results: Record<string, any>;
  
  // Relations
  workflow?: TaskWorkflow;
  restaurant?: import('./database').Restaurant;
  triggered_by_user?: import('./database').AuthUser;
}

// Task Recurrence interface
export interface TaskRecurrence {
  id: string;
  template_id: string;
  restaurant_id: string;
  name: string;
  recurrence_pattern: RecurrencePattern;
  timezone: string;
  is_active: boolean;
  next_run_at?: string;
  last_run_at?: string;
  total_runs: number;
  failed_runs: number;
  end_date?: string;
  max_runs?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  template?: TaskTemplate;
  restaurant?: import('./database').Restaurant;
  creator?: import('./database').AuthUser;
}

// Task Notification interface
export interface TaskNotification {
  id: string;
  task_id?: string;
  workflow_id?: string;
  user_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  title: string;
  title_fr: string;
  message: string;
  message_fr: string;
  scheduled_for: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  clicked_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  metadata: Record<string, any>;
  
  // Relations
  task?: Task;
  workflow?: TaskWorkflow;
  user?: import('./database').AuthUser;
}

// Task Performance Metrics interface
export interface TaskPerformanceMetrics {
  id: string;
  restaurant_id: string;
  task_id?: string;
  template_id?: string;
  user_id?: string;
  workflow_id?: string;
  metric_date: string;
  
  // Timing metrics
  avg_completion_time_minutes?: number;
  min_completion_time_minutes?: number;
  max_completion_time_minutes?: number;
  on_time_completion_rate?: number;
  
  // Quality metrics
  avg_quality_score?: number;
  approval_rate?: number;
  rework_rate?: number;
  
  // Volume metrics
  total_tasks: number;
  completed_tasks: number;
  cancelled_tasks: number;
  overdue_tasks: number;
  
  // Efficiency metrics
  utilization_rate?: number;
  productivity_score?: number;
  efficiency_trend?: number;
  
  created_at: string;
  
  // Relations
  restaurant?: import('./database').Restaurant;
  task?: Task;
  template?: TaskTemplate;
  user?: import('./database').AuthUser;
  workflow?: TaskWorkflow;
}

// ===========================================
// SUPPORTING INTERFACES
// ===========================================

export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  estimated_minutes?: number;
  order: number;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  month_of_year?: number;
  hour: number;
  minute: number;
  timezone: string;
}

export interface AutoAssignRules {
  enabled: boolean;
  required_skills?: string[];
  preferred_skills?: string[];
  max_workload_percentage?: number;
  location_preference?: string;
  skill_weight: number;
  availability_weight: number;
  workload_weight: number;
  location_weight: number;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  start_node: string;
  end_nodes: string[];
}

export interface WorkflowNode {
  id: string;
  type: 'task' | 'decision' | 'parallel' | 'wait' | 'notification';
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

// ===========================================
// API REQUEST/RESPONSE TYPES
// ===========================================

export interface CreateTaskRequest {
  template_id?: string;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  task_type: TaskType;
  priority?: TaskPriority;
  scheduled_for?: string;
  due_date?: string;
  estimated_duration_minutes?: number;
  location?: string;
  required_skills?: string[];
  equipment_needed?: string[];
  checklist_items?: ChecklistItem[];
  checklist_items_fr?: ChecklistItem[];
  assigned_to?: string;
  requires_approval?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTaskRequest {
  title?: string;
  title_fr?: string;
  description?: string;
  description_fr?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  scheduled_for?: string;
  due_date?: string;
  actual_duration_minutes?: number;
  location?: string;
  checklist_progress?: Record<string, boolean>;
  notes?: string;
  notes_fr?: string;
  quality_score?: number;
  feedback?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TaskSearchParams {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  task_type?: TaskType[];
  assigned_to?: string;
  created_by?: string;
  due_date_from?: string;
  due_date_to?: string;
  location?: string;
  tags?: string[];
  search?: string;
  include_completed?: boolean;
}

export interface TaskAssignmentRequest {
  task_id: string;
  user_id: string;
  notes?: string;
}

export interface BulkTaskOperationRequest {
  task_ids: string[];
  operation: 'assign' | 'complete' | 'cancel' | 'update_priority' | 'add_tags';
  parameters: Record<string, any>;
}

export interface TaskDashboardStats {
  total_tasks: number;
  pending_tasks: number;
  assigned_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  avg_completion_time: number;
  tasks_by_priority: Record<TaskPriority, number>;
  tasks_by_type: Record<TaskType, number>;
  top_performers: Array<{
    user_id: string;
    user_name: string;
    completed_count: number;
    avg_quality_score: number;
  }>;
}

export interface WorkflowDashboardStats {
  total_workflows: number;
  active_workflows: number;
  running_executions: number;
  completed_executions: number;
  failed_executions: number;
  avg_execution_time: number;
  success_rate: number;
}

export interface CreateWorkflowRequest {
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  category?: string;
  workflow_definition: WorkflowDefinition;
  trigger_conditions?: Record<string, any>;
  trigger_type: WorkflowTriggerType;
  success_criteria?: Record<string, any>;
  failure_handling?: Record<string, any>;
  tags?: string[];
}

export interface CreateTaskTemplateRequest {
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  category?: string;
  task_type: TaskType;
  estimated_duration_minutes?: number;
  priority?: TaskPriority;
  required_skills?: string[];
  equipment_needed?: string[];
  location_specific?: boolean;
  locations?: string[];
  checklist_items?: ChecklistItem[];
  checklist_items_fr?: ChecklistItem[];
  sop_document_id?: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  dependencies?: string[];
  auto_assign_rules?: AutoAssignRules;
  approval_required?: boolean;
  tags?: string[];
}

export interface AssignmentAlgorithmResult {
  user_id: string;
  assignment_score: number;
  user_name: string;
  user_role: string;
  skill_match_score: number;
  availability_score: number;
  workload_score: number;
  location_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface TaskEscalationRule {
  id: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  overdue_minutes: number;
  escalate_to_role: string;
  escalate_to_users?: string[];
  notification_channels: NotificationChannel[];
  auto_reassign: boolean;
  max_escalations: number;
}

export interface TaskPerformanceReport {
  period_start: string;
  period_end: string;
  restaurant_id: string;
  summary: {
    total_tasks: number;
    completed_tasks: number;
    avg_completion_time: number;
    on_time_rate: number;
    quality_score: number;
  };
  by_user: Array<{
    user_id: string;
    user_name: string;
    tasks_completed: number;
    avg_completion_time: number;
    quality_score: number;
    efficiency_rating: number;
  }>;
  by_type: Array<{
    task_type: TaskType;
    count: number;
    avg_completion_time: number;
    success_rate: number;
  }>;
  trends: {
    completion_rate_trend: number;
    quality_trend: number;
    efficiency_trend: number;
  };
}

export interface NotificationPreferences {
  user_id: string;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    in_app: boolean;
  };
  notification_types: {
    task_assigned: boolean;
    task_due: boolean;
    task_overdue: boolean;
    escalation: boolean;
    workflow_updates: boolean;
    performance_reports: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  frequency_limits: {
    max_per_hour: number;
    max_per_day: number;
    batch_similar: boolean;
  };
}

// ===========================================
// INTEGRATION TYPES
// ===========================================

export interface TaskSOPIntegration {
  task_id: string;
  sop_document_id: string;
  integration_type: 'reference' | 'execution' | 'training';
  completion_requirements: {
    read_sop: boolean;
    complete_checklist: boolean;
    pass_assessment: boolean;
    photo_evidence: boolean;
  };
  progress: {
    sop_read: boolean;
    checklist_completed: number;
    assessment_passed: boolean;
    photos_uploaded: number;
  };
}

export interface TaskMobileSync {
  last_sync: string;
  pending_uploads: TaskMobileSyncItem[];
  offline_tasks: Task[];
  sync_conflicts: TaskSyncConflict[];
}

export interface TaskMobileSyncItem {
  type: 'task_update' | 'checklist_progress' | 'photo_upload' | 'status_change';
  task_id: string;
  data: Record<string, any>;
  timestamp: string;
  retry_count: number;
}

export interface TaskSyncConflict {
  task_id: string;
  field: string;
  local_value: any;
  server_value: any;
  timestamp: string;
  resolution: 'pending' | 'use_local' | 'use_server' | 'merge';
}

export interface TaskBackupEntry {
  id: string;
  restaurant_id: string;
  backup_type: 'full' | 'incremental' | 'point_in_time';
  backup_date: string;
  data_size: number;
  file_path: string;
  encryption_key_id: string;
  retention_until: string;
  verification_status: 'pending' | 'verified' | 'failed';
  restore_tested: boolean;
}

export interface TaskRecoveryPlan {
  restaurant_id: string;
  recovery_point_objective: number; // minutes
  recovery_time_objective: number; // minutes
  backup_frequency: number; // hours
  backup_retention: number; // days
  failover_procedures: Array<{
    step: number;
    action: string;
    responsible_role: string;
    estimated_duration: number;
  }>;
  contact_list: Array<{
    role: string;
    name: string;
    phone: string;
    email: string;
  }>;
}