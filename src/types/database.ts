// Restaurant Krong Thai SOP Management System
// Database Types and Interfaces
// This file defines TypeScript types for database entities

export type UserRole = 'admin' | 'manager' | 'staff';
export type SOPStatus = 'draft' | 'review' | 'approved' | 'archived';
export type SOPPriority = 'low' | 'medium' | 'high' | 'critical';
export type SubmissionStatus = 'submitted' | 'reviewed' | 'approved' | 'rejected';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'DOWNLOAD' | 'UPLOAD' | 'APPROVE' | 'REJECT';

// Core entity interfaces matching database schema
export interface Restaurant {
  id: string;
  name: string;
  name_fr?: string;
  address?: string;
  address_fr?: string;
  phone?: string;
  email?: string;
  timezone: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  pin_hash?: string;
  role: UserRole;
  full_name: string;
  full_name_fr?: string;
  phone?: string;
  position?: string;
  position_fr?: string;
  restaurant_id: string;
  is_active: boolean;
  last_login_at?: string;
  pin_changed_at?: string;
  pin_attempts: number;
  locked_until?: string;
  device_fingerprint?: string;
  created_at: string;
  updated_at: string;
  
  // Relation
  restaurant?: Restaurant;
}

export interface SOPCategory {
  id: string;
  code: string;
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SOPDocument {
  id: string;
  category_id: string;
  restaurant_id: string;
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  steps?: SOPStep[];
  steps_fr?: SOPStep[];
  attachments: string[];
  tags?: string[];
  tags_fr?: string[];
  version: number;
  status: SOPStatus;
  priority: SOPPriority;
  effective_date?: string;
  review_date?: string;
  created_by: string;
  updated_by?: string;
  approved_by?: string;
  approved_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: SOPCategory;
  restaurant?: Restaurant;
  creator?: AuthUser;
  updater?: AuthUser;
  approver?: AuthUser;
}

export interface SOPStep {
  step: number;
  action: string;
  note?: string;
  duration?: string;
  warning?: string;
  tools?: string[];
  image?: string;
}

export interface FormTemplate {
  id: string;
  restaurant_id: string;
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  category?: string;
  schema: FormSchema;
  schema_fr?: FormSchema;
  validation_rules: Record<string, any>;
  settings: Record<string, any>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: Restaurant;
  creator?: AuthUser;
}

export interface FormSchema {
  fields: FormField[];
}

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[] | { value: string; label: string }[];
  min?: number;
  max?: number;
  validation?: string; // regex pattern
  help?: string;
}

export interface FormSubmission {
  id: string;
  template_id: string;
  restaurant_id: string;
  submitted_by: string;
  data: Record<string, any>;
  attachments: string[];
  location?: string;
  ip_address?: string;
  user_agent?: string;
  submission_date: string;
  status: SubmissionStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  notes_fr?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  template?: FormTemplate;
  restaurant?: Restaurant;
  submitter?: AuthUser;
  reviewer?: AuthUser;
}

export interface AuditLog {
  id: string;
  restaurant_id: string;
  user_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
  
  // Relations
  restaurant?: Restaurant;
  user?: AuthUser;
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Authentication types
export interface PINAuthRequest {
  email: string;
  pin: string;
  device_fingerprint?: string;
}

export interface PINAuthResponse {
  user: AuthUser;
  session_token: string;
  expires_at: string;
  restaurant: Restaurant;
}

// Search and filter types
export interface SOPSearchParams {
  category_id?: string;
  status?: SOPStatus;
  priority?: SOPPriority;
  search?: string;
  tags?: string[];
  created_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface FormSubmissionFilters {
  template_id?: string;
  status?: SubmissionStatus;
  submitted_by?: string;
  date_from?: string;
  date_to?: string;
  location?: string;
}

// Audit and reporting types
export interface AuditFilters {
  user_id?: string;
  action?: AuditAction;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
}

export interface DashboardStats {
  total_sops: number;
  approved_sops: number;
  pending_sops: number;
  form_submissions_today: number;
  form_submissions_week: number;
  active_users: number;
  categories_with_sops: number;
}

// Error types
export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

// Language support
export interface BilingualContent {
  en: string;
  fr: string;
}

// File upload types
export interface FileUpload {
  file: File;
  bucket: string;
  path: string;
  metadata?: Record<string, any>;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
}

// Training system types
export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';
export type AssessmentStatus = 'pending' | 'passed' | 'failed' | 'retake_required';
export type CertificateStatus = 'active' | 'expired' | 'revoked';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ReminderType = 'due_soon' | 'overdue' | 'mandatory' | 'certificate_expiring';

export interface TrainingModule {
  id: string;
  restaurant_id: string;
  sop_document_id: string;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  validity_days: number;
  is_mandatory: boolean;
  is_active: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: Restaurant;
  sop_document?: SOPDocument;
  creator?: AuthUser;
  updater?: AuthUser;
  sections?: TrainingSection[];
  questions?: TrainingQuestion[];
}

export interface TrainingSection {
  id: string;
  module_id: string;
  section_number: number;
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  media_urls: string[];
  estimated_minutes: number;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  module?: TrainingModule;
  questions?: TrainingQuestion[];
}

export interface TrainingQuestion {
  id: string;
  module_id: string;
  section_id?: string;
  question_type: QuestionType;
  question: string;
  question_fr: string;
  options?: string[];
  options_fr?: string[];
  correct_answer: string;
  explanation?: string;
  explanation_fr?: string;
  points: number;
  difficulty: DifficultyLevel;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  module?: TrainingModule;
  section?: TrainingSection;
}

export interface UserTrainingProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: TrainingStatus;
  progress_percentage: number;
  current_section_id?: string;
  started_at?: string;
  last_accessed_at?: string;
  completed_at?: string;
  time_spent_minutes: number;
  attempt_number: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  user?: AuthUser;
  module?: TrainingModule;
  current_section?: TrainingSection;
  section_progress?: UserSectionProgress[];
  assessments?: TrainingAssessment[];
}

export interface UserSectionProgress {
  id: string;
  user_id: string;
  section_id: string;
  progress_id: string;
  is_completed: boolean;
  time_spent_minutes: number;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  user?: AuthUser;
  section?: TrainingSection;
  progress?: UserTrainingProgress;
}

export interface TrainingAssessment {
  id: string;
  user_id: string;
  module_id: string;
  progress_id: string;
  attempt_number: number;
  status: AssessmentStatus;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  time_spent_minutes: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
  
  // Relations
  user?: AuthUser;
  module?: TrainingModule;
  progress?: UserTrainingProgress;
  question_responses?: TrainingQuestionResponse[];
  certificate?: TrainingCertificate;
}

export interface TrainingQuestionResponse {
  id: string;
  assessment_id: string;
  question_id: string;
  user_answer?: string;
  is_correct: boolean;
  points_earned: number;
  time_spent_seconds: number;
  answered_at: string;
  
  // Relations
  assessment?: TrainingAssessment;
  question?: TrainingQuestion;
}

export interface TrainingCertificate {
  id: string;
  user_id: string;
  module_id: string;
  assessment_id: string;
  certificate_number: string;
  status: CertificateStatus;
  issued_at: string;
  expires_at?: string;
  revoked_at?: string;
  revoked_by?: string;
  revoked_reason?: string;
  certificate_data: Record<string, any>;
  created_at: string;
  
  // Relations
  user?: AuthUser;
  module?: TrainingModule;
  assessment?: TrainingAssessment;
  revoker?: AuthUser;
}

export interface TrainingReminder {
  id: string;
  user_id: string;
  module_id: string;
  reminder_type: ReminderType;
  title: string;
  title_fr: string;
  message: string;
  message_fr: string;
  scheduled_for: string;
  sent_at?: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  
  // Relations
  user?: AuthUser;
  module?: TrainingModule;
}

export interface TrainingAnalytics {
  id: string;
  restaurant_id: string;
  date: string;
  module_id?: string;
  total_enrollments: number;
  total_completions: number;
  total_failures: number;
  average_score: number;
  average_completion_time: number;
  engagement_metrics: Record<string, any>;
  created_at: string;
  
  // Relations
  restaurant?: Restaurant;
  module?: TrainingModule;
}

// Training API request/response types
export interface CreateTrainingModuleRequest {
  sop_document_id: string;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  duration_minutes?: number;
  passing_score?: number;
  max_attempts?: number;
  validity_days?: number;
  is_mandatory?: boolean;
  sections: CreateTrainingSectionRequest[];
  questions: CreateTrainingQuestionRequest[];
}

export interface CreateTrainingSectionRequest {
  section_number: number;
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  media_urls?: string[];
  estimated_minutes?: number;
  is_required?: boolean;
  sort_order?: number;
}

export interface CreateTrainingQuestionRequest {
  section_id?: string;
  question_type: QuestionType;
  question: string;
  question_fr: string;
  options?: string[];
  options_fr?: string[];
  correct_answer: string;
  explanation?: string;
  explanation_fr?: string;
  points?: number;
  difficulty?: DifficultyLevel;
  sort_order?: number;
}

export interface StartTrainingRequest {
  module_id: string;
}

export interface UpdateTrainingProgressRequest {
  section_id: string;
  time_spent_minutes?: number;
  notes?: string;
}

export interface SubmitAssessmentRequest {
  assessment_id: string;
  responses: AssessmentResponse[];
}

export interface AssessmentResponse {
  question_id: string;
  user_answer: string;
  time_spent_seconds?: number;
}

export interface TrainingDashboardStats {
  total_modules: number;
  active_modules: number;
  mandatory_modules: number;
  user_enrolled: number;
  user_completed: number;
  user_in_progress: number;
  certificates_earned: number;
  certificates_expiring: number;
  average_completion_rate: number;
  average_score: number;
}

export interface TrainingListParams {
  status?: TrainingStatus;
  module_id?: string;
  user_id?: string;
  is_mandatory?: boolean;
  include_expired?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface TrainingSearchParams {
  category_id?: string;
  difficulty?: DifficultyLevel;
  duration_min?: number;
  duration_max?: number;
  search?: string;
  tags?: string[];
}

// Task Management Types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue' | 'delegated';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';
export type TaskType = 'sop_execution' | 'training' | 'maintenance' | 'inspection' | 'cleaning' | 'custom';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
export type EscalationLevel = 'none' | 'supervisor' | 'manager' | 'regional' | 'corporate';
export type DifficultyRating = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Task {
  id: string;
  restaurant_id: string;
  created_by: string;
  assigned_to?: string;
  delegated_by?: string;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  difficulty: DifficultyRating;
  
  // SOP integration
  sop_document_id?: string;
  sop_category_id?: string;
  
  // Scheduling
  scheduled_date?: string;
  due_date?: string;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  
  // Dependencies and prerequisites
  prerequisite_task_ids: string[];
  dependent_task_ids: string[];
  prerequisite_skills: string[];
  required_equipment: string[];
  
  // Collaboration
  team_task: boolean;
  team_members: string[];
  max_team_size?: number;
  
  // Recurrence
  recurrence: TaskRecurrence;
  recurrence_config?: TaskRecurrenceConfig;
  parent_template_id?: string;
  
  // Progress tracking
  progress_percentage: number;
  checklist_completed: number;
  checklist_total: number;
  
  // Performance
  performance_score?: number;
  performance_notes?: string;
  performance_notes_fr?: string;
  
  // Escalation
  escalation_level: EscalationLevel;
  escalation_triggered_at?: string;
  escalation_reason?: string;
  
  // Timestamps
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: Restaurant;
  creator?: AuthUser;
  assignee?: AuthUser;
  delegator?: AuthUser;
  sop_document?: SOPDocument;
  sop_category?: SOPCategory;
  team_member_users?: AuthUser[];
  comments?: TaskComment[];
  notifications?: TaskNotification[];
  checklist_items?: TaskChecklistItem[];
  time_entries?: TaskTimeEntry[];
}

export interface TaskRecurrenceConfig {
  interval: number;
  days_of_week?: number[]; // 0-6, Sunday = 0
  day_of_month?: number;
  end_date?: string;
  max_occurrences?: number;
  timezone?: string;
}

export interface TaskTemplate {
  id: string;
  restaurant_id: string;
  created_by: string;
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  type: TaskType;
  priority: TaskPriority;
  difficulty: DifficultyRating;
  estimated_duration_minutes: number;
  
  // Template configuration
  sop_document_id?: string;
  prerequisite_skills: string[];
  required_equipment: string[];
  checklist_template: TaskChecklistTemplate[];
  
  // Default recurrence
  default_recurrence: TaskRecurrence;
  default_recurrence_config?: TaskRecurrenceConfig;
  
  // Usage stats
  usage_count: number;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: Restaurant;
  creator?: AuthUser;
  sop_document?: SOPDocument;
}

export interface TaskChecklistTemplate {
  id: string;
  step_number: number;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  is_required: boolean;
  estimated_minutes?: number;
  verification_required: boolean;
  photo_required: boolean;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  template_id?: string;
  step_number: number;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  is_required: boolean;
  is_completed: boolean;
  verification_required: boolean;
  verified_by?: string;
  verified_at?: string;
  photo_required: boolean;
  photo_url?: string;
  notes?: string;
  notes_fr?: string;
  completed_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  task?: Task;
  template?: TaskChecklistTemplate;
  completed_by_user?: AuthUser;
  verified_by_user?: AuthUser;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  comment_fr?: string;
  is_internal: boolean;
  is_system_generated: boolean;
  reply_to_id?: string;
  attachments: string[];
  created_at: string;
  updated_at: string;
  
  // Relations
  task?: Task;
  user?: AuthUser;
  reply_to?: TaskComment;
  replies?: TaskComment[];
}

export interface TaskNotification {
  id: string;
  task_id: string;
  user_id: string;
  type: TaskNotificationType;
  title: string;
  title_fr: string;
  message: string;
  message_fr: string;
  scheduled_for?: string;
  sent_at?: string;
  read_at?: string;
  action_url?: string;
  is_dismissed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  
  // Relations
  task?: Task;
  user?: AuthUser;
}

export type TaskNotificationType = 
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_completed'
  | 'task_cancelled'
  | 'task_delegated'
  | 'task_escalated'
  | 'comment_added'
  | 'prerequisite_completed'
  | 'team_member_added'
  | 'schedule_changed';

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  is_break: boolean;
  break_reason?: string;
  notes?: string;
  notes_fr?: string;
  created_at: string;
  
  // Relations
  task?: Task;
  user?: AuthUser;
}

export interface TaskDependency {
  id: string;
  prerequisite_task_id: string;
  dependent_task_id: string;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_minutes?: number;
  is_critical: boolean;
  created_at: string;
  
  // Relations
  prerequisite_task?: Task;
  dependent_task?: Task;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_by: string;
  assigned_to: string;
  assigned_at: string;
  accepted_at?: string;
  declined_at?: string;
  decline_reason?: string;
  decline_reason_fr?: string;
  delegation_notes?: string;
  delegation_notes_fr?: string;
  
  // Relations
  task?: Task;
  assigner?: AuthUser;
  assignee?: AuthUser;
}

export interface TaskCalendarEvent {
  id: string;
  task_id: string;
  title: string;
  title_fr: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  calendar_type: 'scheduled' | 'due' | 'reminder';
  reminder_minutes?: number;
  location?: string;
  created_at: string;
  
  // Relations
  task?: Task;
}

// API Request/Response Types
export interface CreateTaskRequest {
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  type: TaskType;
  priority: TaskPriority;
  difficulty: DifficultyRating;
  assigned_to?: string;
  sop_document_id?: string;
  scheduled_date?: string;
  due_date?: string;
  estimated_duration_minutes?: number;
  prerequisite_task_ids?: string[];
  team_task?: boolean;
  team_members?: string[];
  recurrence?: TaskRecurrence;
  recurrence_config?: TaskRecurrenceConfig;
  checklist_items?: CreateTaskChecklistItemRequest[];
}

export interface CreateTaskChecklistItemRequest {
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  is_required?: boolean;
  verification_required?: boolean;
  photo_required?: boolean;
  step_number?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  title_fr?: string;
  description?: string;
  description_fr?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  scheduled_date?: string;
  due_date?: string;
  estimated_duration_minutes?: number;
  progress_percentage?: number;
}

export interface TaskBulkOperation {
  task_ids: string[];
  operation: 'assign' | 'complete' | 'cancel' | 'reschedule' | 'change_priority';
  parameters: Record<string, any>;
}

export interface TaskSearchParams {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  type?: TaskType[];
  assigned_to?: string;
  created_by?: string;
  sop_category_id?: string;
  team_task?: boolean;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  tags?: string[];
  difficulty?: DifficultyRating[];
  overdue_only?: boolean;
  my_tasks_only?: boolean;
}

export interface TaskCalendarParams {
  start_date: string;
  end_date: string;
  view_type: 'month' | 'week' | 'day';
  include_completed?: boolean;
  user_id?: string;
  team_tasks_only?: boolean;
}

export interface TaskDashboardStats {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_today: number;
  overdue_tasks: number;
  high_priority_tasks: number;
  team_tasks: number;
  my_tasks: number;
  completion_rate: number;
  average_completion_time: number;
  escalated_tasks: number;
}

export interface TaskPerformanceMetrics {
  task_id: string;
  completion_time_minutes: number;
  quality_score: number;
  efficiency_rating: number;
  teammate_rating?: number;
  supervisor_rating?: number;
  notes?: string;
  notes_fr?: string;
  improvement_suggestions: string[];
  improvement_suggestions_fr: string[];
  created_at: string;
}

export interface TaskAnalytics {
  restaurant_id: string;
  date: string;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  average_completion_time: number;
  efficiency_metrics: Record<string, number>;
  user_performance: Record<string, TaskPerformanceMetrics>;
  category_performance: Record<string, number>;
  created_at: string;
}

// IoT System Types
export type IoTDeviceType = 
  | 'temperature_sensor'
  | 'humidity_sensor'
  | 'pressure_sensor'
  | 'door_sensor'
  | 'motion_sensor'
  | 'weight_scale'
  | 'refrigerator'
  | 'freezer'
  | 'oven'
  | 'grill'
  | 'fryer'
  | 'dishwasher'
  | 'ventilation_fan'
  | 'ice_machine'
  | 'coffee_maker'
  | 'pos_terminal'
  | 'camera'
  | 'beacon'
  | 'gateway'
  | 'other';

export type IoTDeviceStatus = 'active' | 'inactive' | 'maintenance' | 'error' | 'offline' | 'updating';
export type IoTAlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type IoTMaintenanceStatus = 'scheduled' | 'due' | 'overdue' | 'in_progress' | 'completed' | 'cancelled';

export interface IoTDevice {
  id: string;
  restaurant_id: string;
  device_type: IoTDeviceType;
  device_name: string;
  device_name_fr?: string;
  description?: string;
  description_fr?: string;
  
  // Device identification
  mac_address?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  firmware_version?: string;
  
  // Location and installation
  location?: string;
  location_fr?: string;
  zone?: string;
  coordinates?: { x: number; y: number; z?: number };
  installation_date?: string;
  
  // Status and connectivity
  status: IoTDeviceStatus;
  is_online: boolean;
  last_seen_at?: string;
  ip_address?: string;
  
  // Configuration
  config: Record<string, any>;
  thresholds: Record<string, any>;
  calibration_data: Record<string, any>;
  
  // Maintenance
  maintenance_schedule: Record<string, any>;
  warranty_expires_at?: string;
  
  // Audit fields
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: Restaurant;
  creator?: AuthUser;
  updater?: AuthUser;
}

export interface IoTSensorData {
  id: string;
  device_id: string;
  
  // Sensor readings
  temperature?: number;
  humidity?: number;
  pressure?: number;
  motion_detected?: boolean;
  door_open?: boolean;
  weight?: number;
  
  // Generic sensor data
  sensor_type?: string;
  value?: number;
  unit?: string;
  metadata: Record<string, any>;
  
  // Data quality
  quality_score: number;
  is_anomaly: boolean;
  
  // Timestamps
  recorded_at: string;
  received_at: string;
  created_at: string;
  
  // Relations
  device?: IoTDevice;
}

export interface IoTEquipmentStatus {
  id: string;
  device_id: string;
  
  // Equipment state
  is_running: boolean;
  power_consumption?: number;
  cycle_count: number;
  runtime_hours: number;
  
  // Performance metrics
  efficiency_percentage?: number;
  temperature_avg?: number;
  vibration_level?: number;
  error_count: number;
  
  // Predictive maintenance
  health_score: number;
  remaining_life_days?: number;
  next_maintenance_date?: string;
  
  // Status data
  status_data: Record<string, any>;
  error_codes: string[];
  
  // Timestamps
  status_at: string;
  created_at: string;
  
  // Relations
  device?: IoTDevice;
}

export interface IoTAlert {
  id: string;
  device_id: string;
  restaurant_id: string;
  
  // Alert details
  alert_type: string;
  severity: IoTAlertSeverity;
  title: string;
  title_fr?: string;
  message: string;
  message_fr?: string;
  
  // Alert conditions
  threshold_value?: number;
  actual_value?: number;
  condition_met?: string;
  
  // Status and resolution
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  resolution_notes_fr?: string;
  
  // Escalation
  escalation_level: number;
  escalated_at?: string;
  escalated_to?: string;
  
  // Notification tracking
  notifications_sent: any[];
  
  // Alert data
  alert_data: Record<string, any>;
  
  // Timestamps
  triggered_at: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  device?: IoTDevice;
  restaurant?: Restaurant;
  acknowledged_by_user?: AuthUser;
  resolved_by_user?: AuthUser;
  escalated_to_user?: AuthUser;
}

export interface IoTMaintenanceSchedule {
  id: string;
  device_id: string;
  restaurant_id: string;
  
  // Maintenance details
  maintenance_type: string;
  title: string;
  title_fr?: string;
  description?: string;
  description_fr?: string;
  
  // Scheduling
  scheduled_date: string;
  estimated_duration_minutes: number;
  recurrence_pattern?: string;
  recurrence_config: Record<string, any>;
  
  // Assignment
  assigned_to?: string;
  assigned_team: string[];
  
  // Status
  status: IoTMaintenanceStatus;
  priority: string;
  
  // Completion
  started_at?: string;
  completed_at?: string;
  actual_duration_minutes?: number;
  completion_notes?: string;
  completion_notes_fr?: string;
  parts_used: any[];
  cost_estimate?: number;
  actual_cost?: number;
  
  // Next maintenance prediction
  next_due_date?: string;
  predictive_score?: number;
  
  // Audit fields
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  device?: IoTDevice;
  restaurant?: Restaurant;
  assignee?: AuthUser;
  creator?: AuthUser;
  updater?: AuthUser;
}

export interface IoTAnalyticsData {
  id: string;
  restaurant_id: string;
  device_id?: string;
  
  // Analytics period
  date_period: string;
  hour_period?: number;
  
  // Aggregated metrics
  avg_temperature?: number;
  min_temperature?: number;
  max_temperature?: number;
  avg_humidity?: number;
  min_humidity?: number;
  max_humidity?: number;
  
  // Equipment metrics
  total_runtime_minutes: number;
  power_consumption_kwh: number;
  cycle_count: number;
  efficiency_score?: number;
  
  // Alert metrics
  total_alerts: number;
  critical_alerts: number;
  avg_response_time_minutes?: number;
  
  // Performance metrics
  uptime_percentage: number;
  health_score: number;
  anomaly_count: number;
  
  // Custom metrics
  custom_metrics: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations
  restaurant?: Restaurant;
  device?: IoTDevice;
}

export interface IoTFirmwareUpdate {
  id: string;
  
  // Firmware details
  manufacturer: string;
  model: string;
  version: string;
  previous_version?: string;
  
  // Update package
  package_url?: string;
  package_size_bytes?: number;
  package_checksum?: string;
  encryption_key?: string;
  
  // Release information
  release_notes?: string;
  release_notes_fr?: string;
  security_fixes: string[];
  bug_fixes: string[];
  new_features: string[];
  
  // Deployment
  is_mandatory: boolean;
  is_rollback: boolean;
  rollback_from_version?: string;
  
  // Status
  is_published: boolean;
  published_at?: string;
  deprecated_at?: string;
  
  // Validation
  test_results: Record<string, any>;
  approved_by?: string;
  approved_at?: string;
  
  // Audit fields
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  approver?: AuthUser;
  creator?: AuthUser;
}

export interface IoTDeviceUpdate {
  id: string;
  device_id: string;
  firmware_update_id: string;
  
  // Update process
  status: string;
  progress_percentage: number;
  
  // Scheduling
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  
  // Results
  success?: boolean;
  error_message?: string;
  error_code?: string;
  
  // Backup
  backup_created: boolean;
  backup_location?: string;
  
  // Validation
  pre_update_version?: string;
  post_update_version?: string;
  validation_tests: Record<string, any>;
  
  // Rollback capability
  can_rollback: boolean;
  rollback_performed: boolean;
  rollback_reason?: string;
  
  // Retry logic
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  
  // Audit fields
  created_at: string;
  updated_at: string;
  
  // Relations
  device?: IoTDevice;
  firmware_update?: IoTFirmwareUpdate;
}

// IoT API Request/Response Types
export interface CreateIoTDeviceRequest {
  device_type: IoTDeviceType;
  device_name: string;
  device_name_fr?: string;
  description?: string;
  description_fr?: string;
  mac_address?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  location_fr?: string;
  zone?: string;
  coordinates?: { x: number; y: number; z?: number };
  config?: Record<string, any>;
  thresholds?: Record<string, any>;
}

export interface IoTSensorDataRequest {
  device_id: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  motion_detected?: boolean;
  door_open?: boolean;
  weight?: number;
  sensor_type?: string;
  value?: number;
  unit?: string;
  metadata?: Record<string, any>;
  recorded_at?: string;
}

export interface IoTAlertRequest {
  device_id: string;
  alert_type: string;
  severity: IoTAlertSeverity;
  title: string;
  title_fr?: string;
  message: string;
  message_fr?: string;
  threshold_value?: number;
  actual_value?: number;
  condition_met?: string;
  alert_data?: Record<string, any>;
}

export interface IoTMaintenanceRequest {
  device_id: string;
  maintenance_type: string;
  title: string;
  title_fr?: string;
  description?: string;
  description_fr?: string;
  scheduled_date: string;
  estimated_duration_minutes?: number;
  assigned_to?: string;
  priority?: string;
  recurrence_pattern?: string;
  recurrence_config?: Record<string, any>;
}

export interface IoTDashboardStats {
  total_devices: number;
  active_devices: number;
  offline_devices: number;
  devices_in_maintenance: number;
  total_alerts: number;
  unresolved_alerts: number;
  critical_alerts: number;
  scheduled_maintenance: number;
  overdue_maintenance: number;
  average_uptime: number;
  power_consumption_today: number;
  efficiency_score: number;
}

export interface IoTSearchParams {
  device_type?: IoTDeviceType[];
  status?: IoTDeviceStatus[];
  zone?: string;
  manufacturer?: string;
  search?: string;
  is_online?: boolean;
  has_alerts?: boolean;
  maintenance_due?: boolean;
}

export interface IoTAlertFilters {
  device_id?: string;
  severity?: IoTAlertSeverity[];
  is_resolved?: boolean;
  date_from?: string;
  date_to?: string;
  alert_type?: string;
}

export interface IoTMaintenanceFilters {
  device_id?: string;
  status?: IoTMaintenanceStatus[];
  assigned_to?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
  maintenance_type?: string;
}

// Database schema type for Supabase (Use the generated type from supabase.ts instead)
export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: Restaurant;
        Insert: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>>;
      };
      auth_users: {
        Row: AuthUser;
        Insert: Omit<AuthUser, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AuthUser, 'id' | 'created_at' | 'updated_at'>>;
      };
      sop_categories: {
        Row: SOPCategory;
        Insert: Omit<SOPCategory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SOPCategory, 'id' | 'created_at' | 'updated_at'>>;
      };
      sop_documents: {
        Row: SOPDocument;
        Insert: Omit<SOPDocument, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SOPDocument, 'id' | 'created_at' | 'updated_at'>>;
      };
      form_templates: {
        Row: FormTemplate;
        Insert: Omit<FormTemplate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FormTemplate, 'id' | 'created_at' | 'updated_at'>>;
      };
      form_submissions: {
        Row: FormSubmission;
        Insert: Omit<FormSubmission, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FormSubmission, 'id' | 'created_at' | 'updated_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>;
      };
      // Task Management Tables
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_templates: {
        Row: TaskTemplate;
        Insert: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_checklist_items: {
        Row: TaskChecklistItem;
        Insert: Omit<TaskChecklistItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TaskChecklistItem, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_comments: {
        Row: TaskComment;
        Insert: Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_notifications: {
        Row: TaskNotification;
        Insert: Omit<TaskNotification, 'id' | 'created_at'>;
        Update: Partial<Omit<TaskNotification, 'id' | 'created_at'>>;
      };
      task_time_entries: {
        Row: TaskTimeEntry;
        Insert: Omit<TaskTimeEntry, 'id' | 'created_at'>;
        Update: Partial<Omit<TaskTimeEntry, 'id' | 'created_at'>>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      sop_status: SOPStatus;
      sop_priority: SOPPriority;
      submission_status: SubmissionStatus;
      audit_action: AuditAction;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      task_type: TaskType;
      task_recurrence: TaskRecurrence;
      escalation_level: EscalationLevel;
      difficulty_rating: DifficultyRating;
      task_notification_type: TaskNotificationType;
    };
  };
}