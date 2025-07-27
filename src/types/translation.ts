/**
 * TypeScript type definitions for Translation API operations
 * Restaurant Krong Thai SOP Management System
 */

import { ApiResponse, PaginatedApiResponse, ValidationError } from './api';

// Translation status enum
export type TranslationStatus = 'draft' | 'review' | 'approved' | 'published';

// Supported locales
export type Locale = 'en' | 'fr';

// Translation Key types from database
export interface TranslationKey {
  id: string;
  key: string;
  category: string;
  description?: string;
  interpolation_vars: string[];
  context?: string;
  created_at: string;
  updated_at: string;
}

export interface TranslationKeyInsert {
  key: string;
  category: string;
  description?: string;
  interpolation_vars: string[];
  context?: string;
}

export interface TranslationKeyUpdate {
  id?: string;
  key?: string;
  category?: string;
  description?: string;
  interpolation_vars?: string[];
  context?: string;
  updated_at?: string;
}

// Translation types from database
export interface Translation {
  id: string;
  translation_key_id: string;
  locale: Locale;
  value: string;
  status: TranslationStatus;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface TranslationInsert {
  translation_key_id: string;
  locale: Locale;
  value: string;
  status?: TranslationStatus;
  created_by?: string;
  updated_by?: string;
}

export interface TranslationUpdate {
  id?: string;
  translation_key_id?: string;
  locale?: Locale;
  value?: string;
  status?: TranslationStatus;
  updated_by?: string;
  updated_at?: string;
}

// Translation History for audit trail
export interface TranslationHistory {
  id: string;
  translation_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  change_reason?: string;
}

// Translation Cache for performance
export interface TranslationCache {
  id: string;
  locale: Locale;
  key: string;
  value: string;
  cached_at: string;
  expires_at: string;
  version: string;
}

// Translation Analytics for usage tracking
export interface TranslationAnalytics {
  id: string;
  translation_key_id: string;
  locale: Locale;
  usage_count: number;
  last_accessed: string;
  context_usage: Record<string, number>;
}

// Translation Projects for management
export interface TranslationProject {
  id: string;
  name: string;
  description?: string;
  source_locale: Locale;
  target_locales: Locale[];
  status: 'active' | 'completed' | 'archived';
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Translation Project Assignments
export interface TranslationProjectAssignment {
  id: string;
  project_id: string;
  translation_key_id: string;
  assigned_to?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_at: string;
  completed_at?: string;
}

// Combined types for API responses
export interface TranslationKeyWithTranslations extends TranslationKey {
  translations: Translation[];
}

export interface TranslationResponse extends Translation {
  translation_key: TranslationKey;
}

// Public API types for frontend consumption
export interface GetTranslationsParams {
  locale: Locale;
  keys?: string[];
  category?: string;
  includeContext?: boolean;
  version?: string;
}

export interface TranslationsData {
  [key: string]: string;
}

export interface TranslationsMetadata {
  version: string;
  lastUpdated: string;
  cachedAt: string;
  locale: Locale;
  totalKeys: number;
}

export interface GetTranslationsResponse {
  locale: Locale;
  translations: TranslationsData;
  metadata: TranslationsMetadata;
}

export interface GetTranslationByKeyParams {
  locale: Locale;
  keyPath: string;
  interpolation?: Record<string, string | number>;
  fallbackLocale?: Locale;
}

export interface GetTranslationByKeyResponse {
  key: string;
  value: string;
  locale: Locale;
  interpolated: boolean;
  fallbackUsed: boolean;
  metadata: {
    category: string;
    description?: string;
    interpolation_vars: string[];
    context?: string;
  };
}

// Usage tracking
export interface TrackTranslationUsageRequest {
  keys: string[];
  locale: Locale;
  context?: string;
  sessionId?: string;
  userId?: string;
}

export interface TrackTranslationUsageResponse {
  tracked: number;
  sessionId: string;
  timestamp: string;
}

// Admin Management API types
export interface ListTranslationsParams {
  page?: number;
  limit?: number;
  locale?: Locale;
  status?: TranslationStatus;
  category?: string;
  search?: string;
  keyFilter?: string;
  sortBy?: 'key' | 'value' | 'updated_at' | 'status' | 'category';
  sortOrder?: 'asc' | 'desc';
  includeUnused?: boolean;
  modifiedSince?: string;
}

export interface TranslationListItem {
  id: string;
  key: string;
  category: string;
  description?: string;
  translations: {
    locale: Locale;
    value: string;
    status: TranslationStatus;
    updated_at: string;
  }[];
  interpolation_vars: string[];
  context?: string;
  usage_count: number;
  last_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListTranslationsResponse extends PaginatedApiResponse<TranslationListItem> {
  summary: {
    totalKeys: number;
    totalTranslations: number;
    statusBreakdown: Record<TranslationStatus, number>;
    localeBreakdown: Record<Locale, number>;
    categoryBreakdown: Record<string, number>;
  };
}

// Create translation key and translations
export interface CreateTranslationRequest {
  key: string;
  category: string;
  description?: string;
  interpolation_vars?: string[];
  context?: string;
  translations: {
    locale: Locale;
    value: string;
    status?: TranslationStatus;
  }[];
}

export interface CreateTranslationResponse {
  translation_key: TranslationKey;
  translations: Translation[];
  created: number;
  warnings: string[];
}

// Update translation
export interface UpdateTranslationRequest {
  value: string;
  status?: TranslationStatus;
  change_reason?: string;
}

export interface UpdateTranslationResponse {
  translation: Translation;
  previous_value: string;
  history_id: string;
  cache_updated: boolean;
}

// Update translation key
export interface UpdateTranslationKeyRequest {
  key?: string;
  category?: string;
  description?: string;
  interpolation_vars?: string[];
  context?: string;
}

export interface UpdateTranslationKeyResponse {
  translation_key: TranslationKey;
  affected_translations: number;
  cache_invalidated: boolean;
}

// Bulk operations
export interface BulkTranslationOperation {
  operation: 'create' | 'update' | 'delete' | 'change_status';
  items: Array<{
    id?: string;
    key?: string;
    locale?: Locale;
    value?: string;
    status?: TranslationStatus;
    category?: string;
  }>;
  change_reason?: string;
}

export interface BulkTranslationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    item: any;
    error: string;
    details?: ValidationError[];
  }>;
  warnings: string[];
  cache_updates: number;
}

// Import/Export
export interface ImportTranslationsRequest {
  format: 'json' | 'csv' | 'xlsx';
  data: any;
  merge_strategy: 'overwrite' | 'merge' | 'skip_existing';
  default_status?: TranslationStatus;
  import_category?: string;
}

export interface ImportTranslationsResponse {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    key?: string;
    error: string;
  }>;
  warnings: string[];
  summary: {
    new_keys: number;
    new_translations: number;
    updated_translations: number;
  };
}

export interface ExportTranslationsParams {
  format: 'json' | 'csv' | 'xlsx';
  locale?: Locale;
  category?: string;
  status?: TranslationStatus;
  includeMetadata?: boolean;
  includeUsageStats?: boolean;
}

export interface ExportTranslationsResponse {
  filename: string;
  download_url: string;
  format: string;
  total_records: number;
  expires_at: string;
}

// Translation Projects
export interface CreateTranslationProjectRequest {
  name: string;
  description?: string;
  source_locale: Locale;
  target_locales: Locale[];
  due_date?: string;
  translation_keys?: string[];
}

export interface CreateTranslationProjectResponse {
  project: TranslationProject;
  assignments: TranslationProjectAssignment[];
  estimated_workload: number;
}

export interface ListTranslationProjectsParams {
  status?: TranslationProject['status'];
  assigned_to?: string;
  due_before?: string;
  page?: number;
  limit?: number;
}

export interface TranslationProjectWithStats extends TranslationProject {
  total_assignments: number;
  completed_assignments: number;
  progress_percentage: number;
  assigned_translators: number;
  estimated_completion: string | null;
}

// Status workflow
export interface UpdateTranslationStatusRequest {
  status: TranslationStatus;
  change_reason?: string;
  notify_team?: boolean;
}

export interface UpdateTranslationStatusResponse {
  translation: Translation;
  previous_status: TranslationStatus;
  workflow_notifications: number;
  cache_updated: boolean;
}

// Real-time updates
export interface TranslationUpdateEvent {
  type: 'translation_updated' | 'translation_created' | 'translation_deleted' | 'status_changed';
  translation_id: string;
  translation_key: string;
  locale: Locale;
  previous_value?: string;
  new_value?: string;
  previous_status?: TranslationStatus;
  new_status?: TranslationStatus;
  changed_by: string;
  timestamp: string;
  restaurant_id: string;
}

// Cache management
export interface CacheStats {
  total_cached_keys: number;
  cache_hit_rate: number;
  cache_size_mb: number;
  last_cache_update: string;
  cache_expiry_distribution: Record<string, number>;
  hot_keys: Array<{
    key: string;
    locale: Locale;
    access_count: number;
    last_accessed: string;
  }>;
}

export interface InvalidateCacheRequest {
  keys?: string[];
  locales?: Locale[];
  categories?: string[];
  force?: boolean;
}

export interface InvalidateCacheResponse {
  invalidated_entries: number;
  affected_keys: string[];
  cache_rebuild_triggered: boolean;
  estimated_rebuild_time: number;
}

// Analytics and reporting
export interface TranslationAnalyticsParams {
  date_from?: string;
  date_to?: string;
  locale?: Locale;
  category?: string;
  group_by?: 'day' | 'week' | 'month';
}

export interface TranslationAnalyticsResponse {
  total_usage: number;
  unique_keys_used: number;
  usage_by_locale: Record<Locale, number>;
  usage_by_category: Record<string, number>;
  top_used_keys: Array<{
    key: string;
    usage_count: number;
    locales: Locale[];
  }>;
  usage_trends: Array<{
    date: string;
    usage_count: number;
    unique_keys: number;
  }>;
  missing_translations: Array<{
    key: string;
    missing_locales: Locale[];
    usage_count: number;
  }>;
  performance_metrics: {
    average_response_time: number;
    cache_hit_rate: number;
    error_rate: number;
  };
}

// Validation schemas
export interface TranslationValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  suggestions: string[];
}

// ICU Message Format support
export interface ICUValidationResult {
  isValid: boolean;
  syntax_errors: Array<{
    position: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
  variables_found: string[];
  variables_expected: string[];
  missing_variables: string[];
  extra_variables: string[];
  plural_rules_valid: boolean;
  select_rules_valid: boolean;
}

// Type guards and utilities
export function isValidLocale(locale: string): locale is Locale {
  return ['en', 'fr'].includes(locale);
}

export function isValidTranslationStatus(status: string): status is TranslationStatus {
  return ['draft', 'review', 'approved', 'published'].includes(status);
}

// Database schema types for Supabase integration
export interface TranslationDatabaseSchema {
  translation_keys: {
    Row: TranslationKey;
    Insert: TranslationKeyInsert;
    Update: TranslationKeyUpdate;
  };
  translations: {
    Row: Translation;
    Insert: TranslationInsert;
    Update: TranslationUpdate;
  };
  translation_history: {
    Row: TranslationHistory;
    Insert: Omit<TranslationHistory, 'id' | 'changed_at'>;
    Update: Partial<TranslationHistory>;
  };
  translation_cache: {
    Row: TranslationCache;
    Insert: Omit<TranslationCache, 'id' | 'cached_at'>;
    Update: Partial<TranslationCache>;
  };
  translation_analytics: {
    Row: TranslationAnalytics;
    Insert: Omit<TranslationAnalytics, 'id'>;
    Update: Partial<TranslationAnalytics>;
  };
  translation_projects: {
    Row: TranslationProject;
    Insert: Omit<TranslationProject, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<TranslationProject>;
  };
  translation_project_assignments: {
    Row: TranslationProjectAssignment;
    Insert: Omit<TranslationProjectAssignment, 'id' | 'assigned_at'>;
    Update: Partial<TranslationProjectAssignment>;
  };
}

// Re-export common types
export type { ApiResponse, PaginatedApiResponse, ValidationError };