/**
 * TypeScript type definitions for Translation Admin UI Components
 * Restaurant Krong Thai SOP Management System
 */

import { Translation, TranslationKey, TranslationStatus, Locale } from './translation';
import { ApiResponse, PaginatedApiResponse } from './api';

// Admin UI specific interfaces
export interface TranslationAdminFilters {
  search?: string;
  locale?: Locale | 'all';
  status?: TranslationStatus | 'all';
  category?: string | 'all';
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'all';
  modifiedSince?: string;
  keyFilter?: string;
}

export interface TranslationAdminSortOptions {
  sortBy: 'key' | 'value' | 'updated_at' | 'status' | 'category' | 'usage_count';
  sortOrder: 'asc' | 'desc';
}

// Enhanced translation item for admin interface
export interface TranslationAdminItem extends Translation {
  translation_key: TranslationKey;
  usage_count: number;
  last_used: string | null;
  quality_score: number;
  confidence: number;
  created_by_name?: string;
  updated_by_name?: string;
  has_pending_changes: boolean;
  version: number;
}

// Translation dashboard statistics
export interface TranslationDashboardStats {
  total_keys: number;
  total_translations: number;
  completion_rate: {
    overall: number;
    by_locale: Record<Locale, number>;
  };
  status_breakdown: Record<TranslationStatus, number>;
  category_breakdown: Record<string, number>;
  recent_activity: number;
  pending_approvals: number;
  missing_translations: number;
  quality_metrics: {
    average_score: number;
    high_quality_count: number;
    needs_review_count: number;
  };
}

// Translation key management
export interface TranslationKeyFormData {
  key: string;
  category: string;
  description?: string;
  interpolation_vars: string[];
  context?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface TranslationKeyValidation {
  isValid: boolean;
  errors: {
    key?: string;
    category?: string;
    interpolation_vars?: string;
    [field: string]: string | undefined;
  };
  warnings: string[];
  suggestions: string[];
}

// Translation editor interfaces
export interface TranslationEditorState {
  selectedKey: TranslationKey | null;
  activeLocale: Locale;
  translations: Record<Locale, Translation | null>;
  isDirty: boolean;
  isLoading: boolean;
  errors: Record<string, string>;
  lastSaved: Date | null;
}

export interface TranslationEditorActions {
  selectKey: (key: TranslationKey) => void;
  setActiveLocale: (locale: Locale) => void;
  updateTranslation: (locale: Locale, value: string) => void;
  saveTranslation: (locale: Locale) => Promise<boolean>;
  saveAllTranslations: () => Promise<boolean>;
  resetChanges: () => void;
  previewTranslation: (locale: Locale, value: string) => string;
}

// Bulk operations
export interface BulkOperationData {
  operation: 'import' | 'export' | 'delete' | 'update_status' | 'change_category';
  items: string[]; // Translation IDs or keys
  params?: {
    status?: TranslationStatus;
    category?: string;
    format?: 'json' | 'csv' | 'xlsx';
    merge_strategy?: 'overwrite' | 'merge' | 'skip_existing';
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  errors: Array<{
    item: string;
    error: string;
    line?: number;
  }>;
  warnings: string[];
  download_url?: string;
}

// Import/Export structures
export interface ImportPreviewData {
  valid_rows: number;
  invalid_rows: number;
  new_keys: number;
  existing_keys: number;
  conflicts: Array<{
    key: string;
    existing_value: string;
    new_value: string;
    locale: Locale;
  }>;
  errors: Array<{
    row: number;
    key?: string;
    error: string;
  }>;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  filters: TranslationAdminFilters;
  include_metadata: boolean;
  include_usage_stats: boolean;
  template_mode: boolean;
}

// Workflow management
export interface WorkflowAction {
  id: string;
  type: 'status_change' | 'approval' | 'rejection' | 'review_request';
  from_status: TranslationStatus;
  to_status: TranslationStatus;
  requires_permission: string[];
  requires_comment: boolean;
  notification_recipients: string[];
}

export interface WorkflowState {
  current_status: TranslationStatus;
  available_actions: WorkflowAction[];
  pending_approvals: number;
  workflow_history: Array<{
    id: string;
    action: string;
    from_status: TranslationStatus;
    to_status: TranslationStatus;
    comment?: string;
    performed_by: string;
    performed_at: string;
  }>;
}

// Analytics interfaces
export interface TranslationAnalyticsData {
  usage_trends: Array<{
    date: string;
    total_requests: number;
    unique_keys: number;
    cache_hits: number;
    response_time: number;
  }>;
  popular_keys: Array<{
    key: string;
    category: string;
    usage_count: number;
    locales: Locale[];
    last_used: string;
  }>;
  performance_metrics: {
    average_response_time: number;
    cache_hit_rate: number;
    error_rate: number;
    uptime: number;
  };
  quality_metrics: {
    completion_rates: Record<Locale, number>;
    quality_scores: Record<string, number>;
    review_status: Record<TranslationStatus, number>;
  };
  missing_translations: Array<{
    key: string;
    category: string;
    missing_locales: Locale[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }>;
}

// Preview panel interfaces
export interface PreviewContext {
  component: string;
  props: Record<string, any>;
  mock_data?: Record<string, any>;
}

export interface PreviewConfiguration {
  locale: Locale;
  device: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  context: PreviewContext;
  interpolation_values: Record<string, string | number>;
}

// Component prop interfaces
export interface TranslationManagementDashboardProps {
  className?: string;
  initialFilters?: Partial<TranslationAdminFilters>;
  onNavigate?: (section: string) => void;
}

export interface TranslationKeyManagerProps {
  className?: string;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  onKeyEdit?: (key: TranslationKey) => void;
  onKeyCreate?: () => void;
}

export interface TranslationEditorProps {
  className?: string;
  keyId?: string;
  initialLocale?: Locale;
  readonly?: boolean;
  onSave?: (translation: Translation) => void;
  onCancel?: () => void;
}

export interface BulkTranslationManagerProps {
  className?: string;
  selectedItems?: string[];
  onOperationComplete?: (result: BulkOperationResult) => void;
}

export interface TranslationWorkflowManagerProps {
  className?: string;
  translationId?: string;
  onStatusChange?: (newStatus: TranslationStatus) => void;
}

export interface TranslationAnalyticsDashboardProps {
  className?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  refreshInterval?: number;
}

export interface TranslationPreviewPanelProps {
  className?: string;
  translationKey?: string;
  configuration: PreviewConfiguration;
  onConfigurationChange?: (config: PreviewConfiguration) => void;
}

// API hook interfaces
export interface UseTranslationKeysOptions {
  filters?: TranslationAdminFilters;
  sort?: TranslationAdminSortOptions;
  pagination?: {
    page: number;
    limit: number;
  };
  enabled?: boolean;
}

export interface UseTranslationKeysResult {
  data: PaginatedApiResponse<TranslationAdminItem> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

export interface UseTranslationEditorOptions {
  keyId: string;
  enabled?: boolean;
}

export interface UseTranslationEditorResult {
  state: TranslationEditorState;
  actions: TranslationEditorActions;
  isLoading: boolean;
  error: Error | null;
}

// Notification and toast interfaces
export interface TranslationNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  duration?: number;
  dismissible?: boolean;
}

// Form validation interfaces
export interface TranslationFormValidation {
  value: string;
  locale: Locale;
  interpolation_vars: string[];
}

export interface TranslationFormValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  interpolation_issues: Array<{
    variable: string;
    issue: 'missing' | 'extra' | 'invalid_syntax';
    suggestion?: string;
  }>;
}

// Search and filtering
export interface TranslationSearchOptions {
  query: string;
  filters: TranslationAdminFilters;
  search_fields: ('key' | 'value' | 'category' | 'description' | 'context')[];
  fuzzy_matching: boolean;
  case_sensitive: boolean;
}

export interface TranslationSearchResult {
  total: number;
  results: Array<{
    item: TranslationAdminItem;
    score: number;
    matches: Array<{
      field: string;
      text: string;
      highlights: Array<{ start: number; end: number }>;
    }>;
  }>;
  facets: {
    categories: Record<string, number>;
    statuses: Record<TranslationStatus, number>;
    locales: Record<Locale, number>;
  };
}

// Real-time updates
export interface TranslationUpdateEvent {
  type: 'translation_updated' | 'translation_created' | 'translation_deleted' | 'key_updated' | 'status_changed';
  translation_id?: string;
  translation_key_id?: string;
  locale?: Locale;
  previous_value?: string;
  new_value?: string;
  previous_status?: TranslationStatus;
  new_status?: TranslationStatus;
  changed_by: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Accessibility and UI preferences
export interface TranslationUIPreferences {
  table_density: 'compact' | 'normal' | 'comfortable';
  show_interpolation_vars: boolean;
  show_usage_stats: boolean;
  auto_save_interval: number;
  confirmation_dialogs: boolean;
  keyboard_shortcuts: boolean;
  screen_reader_optimized: boolean;
}

// Cache management
export interface TranslationCacheInfo {
  key: string;
  locale: Locale;
  cached_at: string;
  expires_at: string;
  size_bytes: number;
  hit_count: number;
  is_stale: boolean;
}

export interface TranslationCacheStats {
  total_entries: number;
  total_size_mb: number;
  hit_rate: number;
  miss_rate: number;
  oldest_entry: string;
  newest_entry: string;
  hot_keys: TranslationCacheInfo[];
  stale_entries: number;
}

// Error handling
export interface TranslationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
  suggestion?: string;
  documentation_link?: string;
}

export interface TranslationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: Record<string, any> | null;
  recovery_options: Array<{
    label: string;
    action: () => void;
  }>;
}

// Configuration and settings
export interface TranslationAdminConfig {
  features: {
    bulk_operations: boolean;
    workflow_management: boolean;
    analytics_dashboard: boolean;
    real_time_preview: boolean;
    import_export: boolean;
    version_history: boolean;
  };
  limits: {
    max_bulk_operations: number;
    max_file_size_mb: number;
    auto_save_interval_seconds: number;
    search_results_limit: number;
  };
  permissions: {
    can_create_keys: boolean;
    can_edit_keys: boolean;
    can_delete_keys: boolean;
    can_approve_translations: boolean;
    can_manage_workflow: boolean;
    can_export_data: boolean;
    can_import_data: boolean;
  };
}

// Integration with existing types
export interface TranslationAdminContextValue {
  config: TranslationAdminConfig;
  preferences: TranslationUIPreferences;
  notifications: TranslationNotification[];
  updatePreferences: (preferences: Partial<TranslationUIPreferences>) => void;
  showNotification: (notification: Omit<TranslationNotification, 'id'>) => void;
  dismissNotification: (id: string) => void;
}

// Export all types for easy importing
export type {
  // Re-export from base translation types
  Translation,
  TranslationKey,
  TranslationStatus,
  Locale,
} from './translation';