/**
 * SOP API Types and Interfaces
 * Comprehensive type definitions for Restaurant Krong Thai SOP Management API
 */

import { Database } from '@/types/supabase';

// Base types from database
export type SOPDocument = Database['public']['Tables']['sop_documents']['Row'];
export type SOPCategory = Database['public']['Tables']['sop_categories']['Row'];
export type SOPDocumentInsert = Database['public']['Tables']['sop_documents']['Insert'];
export type SOPDocumentUpdate = Database['public']['Tables']['sop_documents']['Update'];

// Standard API response structure
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  timestamp?: string;
}

// Pagination interface
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// SOP DOCUMENTS API
// =============================================================================

export interface SOPDocumentFilters {
  category_id?: string;
  status?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  created_by?: string;
  updated_after?: string;
  review_due?: boolean;
}

export interface CreateSOPDocumentRequest {
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  category_id: string;
  tags: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_read_time: number;
  review_due_date?: string;
}

export interface UpdateSOPDocumentRequest extends Partial<CreateSOPDocumentRequest> {
  version?: string;
  status?: 'draft' | 'review' | 'approved' | 'archived';
}

export interface SOPDocumentResponse extends SOPDocument {
  category?: SOPCategory;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  updated_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// =============================================================================
// SOP CATEGORIES API
// =============================================================================

export interface CreateSOPCategoryRequest {
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  icon?: string;
  color?: string;
  sort_order: number;
}

export interface UpdateSOPCategoryRequest extends Partial<CreateSOPCategoryRequest> {
  is_active?: boolean;
}

export interface SOPCategoryWithStats extends SOPCategory {
  document_count: number;
  completed_count: number;
  pending_reviews: number;
}

// =============================================================================
// SOP COMPLETIONS API
// =============================================================================

export interface SOPCompletion {
  id: string;
  restaurant_id: string;
  user_id: string;
  sop_id: string;
  completion_percentage: number;
  time_spent_minutes: number;
  completed_at?: string;
  verification_photos?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSOPCompletionRequest {
  sop_id: string;
  completion_percentage: number;
  time_spent_minutes: number;
  verification_photos?: string[];
  notes?: string;
}

export interface UpdateSOPCompletionRequest extends Partial<CreateSOPCompletionRequest> {
  completed_at?: string;
}

export interface SOPCompletionStats {
  total_completions: number;
  average_completion_time: number;
  completion_rate: number;
  most_completed_sop: SOPDocumentResponse;
  recent_completions: SOPCompletion[];
}

// =============================================================================
// SOP ASSIGNMENTS API
// =============================================================================

export interface SOPAssignment {
  id: string;
  restaurant_id: string;
  sop_id: string;
  assigned_to: string;
  assigned_by: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSOPAssignmentRequest {
  sop_id: string;
  assigned_to: string[];
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

export interface UpdateSOPAssignmentRequest {
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

export interface SOPAssignmentWithDetails extends SOPAssignment {
  sop: SOPDocumentResponse;
  assigned_to_user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  assigned_by_user: {
    id: string;
    full_name: string;
    email: string;
  };
}

// =============================================================================
// SOP ANALYTICS API
// =============================================================================

export interface SOPAnalyticsFilters {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  user_id?: string;
  department?: string;
}

export interface SOPAnalyticsResponse {
  overview: {
    total_sops: number;
    total_completions: number;
    average_completion_rate: number;
    average_time_per_sop: number;
  };
  completion_trends: {
    date: string;
    completions: number;
    unique_users: number;
  }[];
  category_performance: {
    category: SOPCategory;
    completion_rate: number;
    average_time: number;
    total_completions: number;
  }[];
  user_performance: {
    user_id: string;
    full_name: string;
    completions: number;
    average_time: number;
    completion_rate: number;
  }[];
  most_accessed_sops: SOPDocumentResponse[];
  least_accessed_sops: SOPDocumentResponse[];
}

// =============================================================================
// SOP SEARCH API
// =============================================================================

export interface SOPSearchFilters extends SOPDocumentFilters {
  query?: string;
  search_fields?: ('title' | 'content' | 'tags')[];
  locale?: 'en' | 'fr';
  fuzzy?: boolean;
}

export interface SOPSearchResult {
  document: SOPDocumentResponse;
  relevance_score: number;
  highlighted_text?: string;
  match_type: 'title' | 'content' | 'tags';
}

export interface SOPSearchResponse extends APIResponse<SOPSearchResult[]> {
  query: string;
  total_results: number;
  search_time_ms: number;
  suggestions?: string[];
}

// =============================================================================
// SOP VERSIONS API
// =============================================================================

export interface SOPVersion {
  id: string;
  sop_id: string;
  version: string;
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  changes_summary: string;
  created_by: string;
  created_at: string;
}

export interface CreateSOPVersionRequest {
  sop_id: string;
  changes_summary: string;
}

export interface SOPVersionComparison {
  sop_id: string;
  from_version: string;
  to_version: string;
  changes: {
    field: string;
    old_value: string;
    new_value: string;
    change_type: 'added' | 'removed' | 'modified';
  }[];
  created_at: string;
}

// =============================================================================
// SOP APPROVALS API
// =============================================================================

export interface SOPApproval {
  id: string;
  sop_id: string;
  submitted_by: string;
  approver_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  comments?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSOPApprovalRequest {
  sop_id: string;
  approver_id?: string;
  comments?: string;
}

export interface UpdateSOPApprovalRequest {
  status: 'approved' | 'rejected' | 'needs_revision';
  comments?: string;
}

export interface SOPApprovalWithDetails extends SOPApproval {
  sop: SOPDocumentResponse;
  submitted_by_user: {
    id: string;
    full_name: string;
    email: string;
  };
  approver_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// =============================================================================
// SOP SCHEDULE API
// =============================================================================

export interface SOPSchedule {
  id: string;
  restaurant_id: string;
  sop_id: string;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  schedule_config: {
    days_of_week?: number[];
    time?: string;
    dates?: string[];
    interval?: number;
  };
  assigned_roles: string[];
  is_active: boolean;
  next_due_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSOPScheduleRequest {
  sop_id: string;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  schedule_config: SOPSchedule['schedule_config'];
  assigned_roles: string[];
}

export interface UpdateSOPScheduleRequest extends Partial<CreateSOPScheduleRequest> {
  is_active?: boolean;
}

// =============================================================================
// QR CODE API
// =============================================================================

export interface QRCodeGenerateRequest {
  sop_id: string;
  size?: number;
  format?: 'png' | 'svg' | 'pdf';
  include_title?: boolean;
  custom_data?: Record<string, any>;
}

export interface QRCodeResponse extends APIResponse {
  data: {
    qr_code_url: string;
    sop_id: string;
    access_url: string;
    expires_at?: string;
  };
}

// =============================================================================
// FILE UPLOAD API
// =============================================================================

export interface SOPPhotoUploadRequest {
  sop_id: string;
  completion_id?: string;
  files: File[];
  caption?: string;
  verification_type?: 'before' | 'during' | 'after' | 'evidence';
}

export interface SOPPhotoUploadResponse extends APIResponse {
  data: {
    uploaded_files: {
      id: string;
      filename: string;
      file_path: string;
      file_size: number;
      content_type: string;
      verification_type?: string;
    }[];
  };
}

// =============================================================================
// NOTIFICATIONS API
// =============================================================================

export interface SOPNotification {
  id: string;
  restaurant_id: string;
  user_id?: string;
  notification_type: 'assignment' | 'due_reminder' | 'completion' | 'approval' | 'update';
  title: string;
  title_fr: string;
  message: string;
  message_fr: string;
  sop_id?: string;
  assignment_id?: string;
  is_read: boolean;
  sent_at?: string;
  created_at: string;
}

export interface CreateSOPNotificationRequest {
  user_ids?: string[];
  notification_type: SOPNotification['notification_type'];
  title: string;
  title_fr: string;
  message: string;
  message_fr: string;
  sop_id?: string;
  assignment_id?: string;
  send_immediately?: boolean;
}

export interface SOPNotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  assignment_notifications: boolean;
  due_reminder_notifications: boolean;
  completion_notifications: boolean;
  approval_notifications: boolean;
  update_notifications: boolean;
}

// =============================================================================
// PERFORMANCE METRICS API
// =============================================================================

export interface SOPPerformanceMetrics {
  restaurant_id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  start_date: string;
  end_date: string;
  metrics: {
    total_sop_views: number;
    unique_users: number;
    completion_rate: number;
    average_completion_time: number;
    on_time_completion_rate: number;
    user_engagement_score: number;
    category_performance: {
      category_id: string;
      views: number;
      completions: number;
      average_time: number;
    }[];
    user_performance: {
      user_id: string;
      views: number;
      completions: number;
      average_time: number;
      on_time_rate: number;
    }[];
  };
}

// =============================================================================
// EXPORT/IMPORT API
// =============================================================================

export interface SOPExportRequest {
  format: 'json' | 'csv' | 'pdf' | 'excel';
  include_content?: boolean;
  include_analytics?: boolean;
  filters?: SOPDocumentFilters;
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

export interface SOPExportResponse extends APIResponse {
  data: {
    export_id: string;
    download_url: string;
    expires_at: string;
    file_size: number;
    record_count: number;
  };
}

export interface SOPImportRequest {
  file_url: string;
  import_type: 'sops' | 'categories' | 'assignments';
  options: {
    update_existing?: boolean;
    create_missing_categories?: boolean;
    notify_users?: boolean;
    dry_run?: boolean;
  };
}

export interface SOPImportResponse extends APIResponse {
  data: {
    import_id: string;
    status: 'processing' | 'completed' | 'failed';
    processed_records: number;
    successful_imports: number;
    failed_imports: number;
    errors: {
      row: number;
      field: string;
      message: string;
    }[];
  };
}

// =============================================================================
// WEBSOCKET API
// =============================================================================

export interface SOPWebSocketEvent {
  type: 'sop_updated' | 'sop_completed' | 'assignment_created' | 'approval_changed';
  data: {
    sop_id?: string;
    user_id?: string;
    restaurant_id: string;
    timestamp: string;
    details: Record<string, any>;
  };
}

export interface SOPWebSocketSubscription {
  channel: string;
  events: SOPWebSocketEvent['type'][];
  filters?: {
    restaurant_id?: string;
    user_id?: string;
    sop_ids?: string[];
  };
}

// =============================================================================
// MIDDLEWARE TYPES
// =============================================================================

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    restaurant_id: string;
  };
  session: {
    token: string;
    expires_at: string;
  };
}

export interface SOPAuthContext {
  userId: string;
  restaurantId: string;
  role: string;
  permissions: string[];
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface SOPAPIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
  method: string;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}