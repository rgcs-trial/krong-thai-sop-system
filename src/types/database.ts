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
  explanation_th?: string;
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
  message_th: string;
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
  explanation_th?: string;
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
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      sop_status: SOPStatus;
      sop_priority: SOPPriority;
      submission_status: SubmissionStatus;
      audit_action: AuditAction;
    };
  };
}