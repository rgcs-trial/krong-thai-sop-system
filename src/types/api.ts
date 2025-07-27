/**
 * TypeScript type definitions for SOP API operations
 * Restaurant Krong Thai SOP Management System
 */

import { 
  SOPDocument, 
  SOPCategory, 
  AuthUser, 
  AuditLog, 
  UserRole, 
  SOPStatus, 
  SOPPriority 
} from './database';

// Base API response types
export interface ApiResponse<T = any> {
  data?: T;
  success: boolean;
  error?: ApiError;
  message?: string;
  timestamp: string;
  requestId: string;
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  messageTh?: string;
  details?: Record<string, any>;
  field?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// SOP Categories API types
export interface CreateCategoryRequest {
  code: string;
  name: string;
  nameTh: string;
  description?: string;
  descriptionTh?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
  isActive?: boolean;
}

export interface CategoryListParams {
  includeInactive?: boolean;
  sortBy?: 'name' | 'sortOrder' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// SOP Documents API types
export interface CreateSOPRequest {
  categoryId: string;
  title: string;
  titleTh: string;
  content: string;
  contentTh: string;
  steps?: SOPStepRequest[];
  stepsTh?: SOPStepRequest[];
  attachments?: string[];
  tags?: string[];
  tagsTh?: string[];
  priority?: SOPPriority;
  effectiveDate?: string;
  reviewDate?: string;
}

export interface UpdateSOPRequest extends Partial<CreateSOPRequest> {
  id: string;
  status?: SOPStatus;
  version?: number;
  isActive?: boolean;
}

export interface SOPStepRequest {
  step: number;
  action: string;
  note?: string;
  duration?: string;
  warning?: string;
  tools?: string[];
  image?: string;
}

export interface SOPListParams {
  categoryId?: string;
  status?: SOPStatus;
  priority?: SOPPriority;
  createdBy?: string;
  search?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  includeInactive?: boolean;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SOPResponse extends Omit<SOPDocument, 'creator' | 'updater' | 'approver'> {
  category: SOPCategory;
  creator: Pick<AuthUser, 'id' | 'full_name' | 'full_name_th' | 'position' | 'position_th'>;
  updater?: Pick<AuthUser, 'id' | 'full_name' | 'full_name_th' | 'position' | 'position_th'>;
  approver?: Pick<AuthUser, 'id' | 'full_name' | 'full_name_th' | 'position' | 'position_th'>;
}

// Search API types
export interface SearchRequest {
  query: string;
  language?: 'en' | 'th' | 'both';
  categoryId?: string;
  status?: SOPStatus;
  priority?: SOPPriority;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  titleTh: string;
  content: string;
  contentTh: string;
  categoryId: string;
  categoryName: string;
  categoryNameTh: string;
  status: SOPStatus;
  priority: SOPPriority;
  tags: string[];
  tagsTh: string[];
  matchScore: number;
  highlights: {
    title?: string;
    titleTh?: string;
    content?: string;
    contentTh?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
  suggestions?: string[];
}

// Bookmarks API types
export interface CreateBookmarkRequest {
  sopId: string;
  notes?: string;
  notesTh?: string;
}

export interface UpdateBookmarkRequest {
  id: string;
  notes?: string;
  notesTh?: string;
}

export interface BookmarkResponse {
  id: string;
  sopId: string;
  userId: string;
  notes?: string;
  notesTh?: string;
  createdAt: string;
  updatedAt: string;
  sop: Pick<SOPDocument, 'id' | 'title' | 'title_th' | 'category_id' | 'status' | 'priority'>;
  category: Pick<SOPCategory, 'id' | 'name' | 'name_th' | 'icon' | 'color'>;
}

export interface BookmarkListParams {
  categoryId?: string;
  status?: SOPStatus;
  priority?: SOPPriority;
  sortBy?: 'createdAt' | 'title' | 'priority';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// User Progress API types
export interface UserProgressResponse {
  userId: string;
  restaurantId: string;
  totalSOPs: number;
  viewedSOPs: number;
  completedSOPs: number;
  bookmarkedSOPs: number;
  progressByCategory: CategoryProgress[];
  recentActivity: ProgressActivity[];
  completionPercentage: number;
  lastActiveAt: string;
}

export interface CategoryProgress {
  categoryId: string;
  categoryName: string;
  categoryNameTh: string;
  totalSOPs: number;
  viewedSOPs: number;
  completedSOPs: number;
  completionPercentage: number;
}

export interface ProgressActivity {
  id: string;
  sopId: string;
  sopTitle: string;
  sopTitleTh: string;
  action: 'viewed' | 'completed' | 'bookmarked' | 'downloaded';
  timestamp: string;
  duration?: number; // seconds spent on SOP
}

export interface UpdateProgressRequest {
  sopId: string;
  action: 'view' | 'complete' | 'bookmark' | 'download';
  duration?: number;
  notes?: string;
}

// File Upload API types
export interface FileUploadRequest {
  file: File;
  sopId?: string;
  category: 'sop_attachment' | 'sop_step_image' | 'user_avatar' | 'restaurant_logo';
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  bucket: string;
  path: string;
  uploadedBy: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface FileListParams {
  sopId?: string;
  category?: string;
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Audit Log API types
export interface AuditLogParams {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  page?: number;
  limit?: number;
}

export interface AuditLogResponse extends Omit<AuditLog, 'user'> {
  user?: Pick<AuthUser, 'id' | 'full_name' | 'full_name_th' | 'email' | 'role'>;
}

// Authentication context for API
export interface AuthContext {
  user: AuthUser;
  sessionId: string;
  permissions: string[];
  restaurantId: string;
  deviceId?: string;
}

// API middleware types
export interface MiddlewareContext {
  auth?: AuthContext;
  requestId: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  locale: 'en' | 'th';
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: string;
  retryAfter?: number;
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  messageTh?: string;
  code: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Bulk operations
export interface BulkSOPOperation {
  operation: 'update' | 'delete' | 'approve' | 'archive';
  sopIds: string[];
  data?: Partial<UpdateSOPRequest>;
}

export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    sopId: string;
    error: string;
  }>;
}

// Analytics and reporting types
export interface SOPAnalytics {
  totalSOPs: number;
  sopsByStatus: Record<SOPStatus, number>;
  sopsByPriority: Record<SOPPriority, number>;
  sopsByCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
  recentlyUpdated: SOPResponse[];
  mostViewed: SOPResponse[];
  pendingApproval: SOPResponse[];
}

export interface UsageMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  sopViews: number;
  bookmarks: number;
  searches: number;
  uploads: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    views: number;
  }>;
  userActivity: Array<{
    userId: string;
    userName: string;
    lastActive: string;
    sopViews: number;
    bookmarks: number;
  }>;
}

// Export specific types to avoid conflicts
// Don't re-export all types to prevent conflicts