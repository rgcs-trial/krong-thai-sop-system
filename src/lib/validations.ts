/**
 * Zod validation schemas for SOP API operations
 * Restaurant Krong Thai SOP Management System
 */

import { z } from 'zod';

// Base validation schemas
export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const LocaleSchema = z.enum(['en', 'th'], {
  errorMap: () => ({ message: 'Locale must be either "en" or "th"' })
});

export const DateStringSchema = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  { message: 'Invalid date format' }
);

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// User role and status enums
export const UserRoleSchema = z.enum(['admin', 'manager', 'staff']);
export const SOPStatusSchema = z.enum(['draft', 'review', 'approved', 'archived']);
export const SOPPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

// SOP Categories validation
export const CreateCategorySchema = z.object({
  code: z.string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code must not exceed 20 characters')
    .regex(/^[A-Z_]+$/, 'Code must contain only uppercase letters and underscores'),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters')
    .trim(),
  nameTh: z.string()
    .min(1, 'Thai name is required')
    .max(255, 'Thai name must not exceed 255 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  descriptionTh: z.string()
    .max(1000, 'Thai description must not exceed 1000 characters')
    .optional(),
  icon: z.string()
    .max(50, 'Icon name must not exceed 50 characters')
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code')
    .optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  id: UUIDSchema,
  isActive: z.boolean().optional(),
});

export const CategoryListParamsSchema = z.object({
  includeInactive: z.boolean().default(false),
  sortBy: z.enum(['name', 'sortOrder', 'createdAt']).default('sortOrder'),
  sortOrder: SortOrderSchema,
});

// SOP Step validation
export const SOPStepSchema = z.object({
  step: z.number().int().min(1),
  action: z.string().min(1, 'Action is required').max(500, 'Action must not exceed 500 characters'),
  note: z.string().max(1000, 'Note must not exceed 1000 characters').optional(),
  duration: z.string().max(50, 'Duration must not exceed 50 characters').optional(),
  warning: z.string().max(500, 'Warning must not exceed 500 characters').optional(),
  tools: z.array(z.string().max(100)).optional(),
  image: z.string().url('Invalid image URL').optional(),
});

// SOP Documents validation
export const CreateSOPSchema = z.object({
  categoryId: UUIDSchema,
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must not exceed 500 characters')
    .trim(),
  titleTh: z.string()
    .min(1, 'Thai title is required')
    .max(500, 'Thai title must not exceed 500 characters')
    .trim(),
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must not exceed 50,000 characters'),
  contentTh: z.string()
    .min(1, 'Thai content is required')
    .max(50000, 'Thai content must not exceed 50,000 characters'),
  steps: z.array(SOPStepSchema).optional(),
  stepsTh: z.array(SOPStepSchema).optional(),
  attachments: z.array(z.string().url('Invalid attachment URL')).default([]),
  tags: z.array(z.string().max(50, 'Tag must not exceed 50 characters')).default([]),
  tagsTh: z.array(z.string().max(50, 'Thai tag must not exceed 50 characters')).default([]),
  priority: SOPPrioritySchema.default('medium'),
  effectiveDate: DateStringSchema.optional(),
  reviewDate: DateStringSchema.optional(),
}).refine(
  (data) => {
    if (data.effectiveDate && data.reviewDate) {
      return new Date(data.effectiveDate) <= new Date(data.reviewDate);
    }
    return true;
  },
  {
    message: 'Review date must be after effective date',
    path: ['reviewDate']
  }
);

export const UpdateSOPSchema = CreateSOPSchema.partial().extend({
  id: UUIDSchema,
  status: SOPStatusSchema.optional(),
  version: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const SOPListParamsSchema = z.object({
  categoryId: UUIDSchema.optional(),
  status: SOPStatusSchema.optional(),
  priority: SOPPrioritySchema.optional(),
  createdBy: UUIDSchema.optional(),
  search: z.string().max(500, 'Search query must not exceed 500 characters').optional(),
  tags: z.array(z.string().max(50)).optional(),
  dateFrom: DateStringSchema.optional(),
  dateTo: DateStringSchema.optional(),
  includeInactive: z.boolean().default(false),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'priority', 'status']).default('updatedAt'),
  sortOrder: SortOrderSchema,
}).merge(PaginationSchema);

// Search validation
export const SearchRequestSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Search query must not exceed 500 characters')
    .trim(),
  language: z.enum(['en', 'th', 'both']).default('both'),
  categoryId: UUIDSchema.optional(),
  status: SOPStatusSchema.optional(),
  priority: SOPPrioritySchema.optional(),
  tags: z.array(z.string().max(50)).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

// Bookmarks validation
export const CreateBookmarkSchema = z.object({
  sopId: UUIDSchema,
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
  notesTh: z.string().max(1000, 'Thai notes must not exceed 1000 characters').optional(),
});

export const UpdateBookmarkSchema = z.object({
  id: UUIDSchema,
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
  notesTh: z.string().max(1000, 'Thai notes must not exceed 1000 characters').optional(),
});

export const BookmarkListParamsSchema = z.object({
  categoryId: UUIDSchema.optional(),
  status: SOPStatusSchema.optional(),
  priority: SOPPrioritySchema.optional(),
  sortBy: z.enum(['createdAt', 'title', 'priority']).default('createdAt'),
  sortOrder: SortOrderSchema,
}).merge(PaginationSchema);

// User Progress validation
export const UpdateProgressSchema = z.object({
  sopId: UUIDSchema,
  action: z.enum(['view', 'complete', 'bookmark', 'download']),
  duration: z.number().int().min(0).max(86400).optional(), // Max 24 hours in seconds
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
});

// File Upload validation
export const FileUploadSchema = z.object({
  sopId: UUIDSchema.optional(),
  category: z.enum(['sop_attachment', 'sop_step_image', 'user_avatar', 'restaurant_logo']),
  metadata: z.record(z.unknown()).optional(),
});

export const FileListParamsSchema = z.object({
  sopId: UUIDSchema.optional(),
  category: z.string().max(50).optional(),
  uploadedBy: UUIDSchema.optional(),
  dateFrom: DateStringSchema.optional(),
  dateTo: DateStringSchema.optional(),
}).merge(PaginationSchema);

// Audit Log validation
export const AuditLogParamsSchema = z.object({
  userId: UUIDSchema.optional(),
  action: z.string().max(50).optional(),
  resourceType: z.string().max(100).optional(),
  resourceId: UUIDSchema.optional(),
  dateFrom: DateStringSchema.optional(),
  dateTo: DateStringSchema.optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
}).merge(PaginationSchema);

// Authentication validation
export const PinAuthSchema = z.object({
  email: z.string().email('Invalid email format'),
  pin: z.string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only digits'),
  deviceFingerprint: z.string()
    .min(10, 'Device fingerprint required')
    .max(500, 'Device fingerprint too long'),
  userAgent: z.string().max(1000).optional(),
  ipAddress: z.string().ip().optional(),
});

export const ChangePinSchema = z.object({
  currentPin: z.string()
    .length(4, 'Current PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'Current PIN must contain only digits'),
  newPin: z.string()
    .length(4, 'New PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'New PIN must contain only digits'),
  confirmPin: z.string()
    .length(4, 'Confirm PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'Confirm PIN must contain only digits'),
  deviceFingerprint: z.string().min(10).max(500),
}).refine(
  (data) => data.newPin === data.confirmPin,
  {
    message: 'PIN confirmation does not match',
    path: ['confirmPin']
  }
).refine(
  (data) => data.currentPin !== data.newPin,
  {
    message: 'New PIN must be different from current PIN',
    path: ['newPin']
  }
);

// Bulk operations validation
export const BulkSOPOperationSchema = z.object({
  operation: z.enum(['update', 'delete', 'approve', 'archive']),
  sopIds: z.array(UUIDSchema).min(1, 'At least one SOP ID is required').max(100, 'Cannot process more than 100 SOPs at once'),
  data: UpdateSOPSchema.omit({ id: true }).optional(),
});

// API key validation for external integrations
export const ApiKeySchema = z.string()
  .min(32, 'API key must be at least 32 characters')
  .max(128, 'API key must not exceed 128 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'API key contains invalid characters');

// Content security validation
export const ContentSecuritySchema = z.object({
  allowHtml: z.boolean().default(false),
  allowScripts: z.boolean().default(false),
  maxLinks: z.number().int().min(0).max(50).default(10),
  allowedDomains: z.array(z.string().url()).optional(),
});

// Rate limiting validation
export const RateLimitSchema = z.object({
  maxRequests: z.number().int().min(1).max(10000),
  windowMinutes: z.number().int().min(1).max(1440), // Max 24 hours
  identifier: z.string().max(255),
});

// Custom validation functions
export const validateThai = (text: string): boolean => {
  // Check if text contains Thai characters (Unicode range U+0E00-U+0E7F)
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
};

export const validateEnglish = (text: string): boolean => {
  // Check if text contains primarily English characters
  const englishRegex = /^[A-Za-z0-9\s\.,!?\-_()'"\/\\@#$%^&*+={}[\]:;|<>~`]+$/;
  return englishRegex.test(text);
};

export const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:/gi, '');
};

// Validation error handler
export interface ValidationErrorDetail {
  field: string;
  message: string;
  messageTh?: string;
  code: string;
  value?: any;
}

export const formatValidationErrors = (error: z.ZodError): ValidationErrorDetail[] => {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    messageTh: getThaiErrorMessage(err.code, err.path.join('.')),
    code: err.code,
    value: err.path.length > 0 ? err.path.reduce((obj, key) => obj?.[key], error as any) : undefined,
  }));
};

const getThaiErrorMessage = (code: string, field: string): string => {
  const errorMessages: Record<string, string> = {
    'invalid_type': `ประเภทข้อมูลของ ${field} ไม่ถูกต้อง`,
    'too_small': `${field} มีขนาดเล็กเกินไป`,
    'too_big': `${field} มีขนาดใหญ่เกินไป`,
    'invalid_string': `รูปแบบของ ${field} ไม่ถูกต้อง`,
    'invalid_email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'invalid_url': 'รูปแบบ URL ไม่ถูกต้อง',
    'custom': `ข้อมูลของ ${field} ไม่ถูกต้อง`,
  };
  
  return errorMessages[code] || `ข้อมูลของ ${field} ไม่ถูกต้อง`;
};

// Export all schemas for use in API routes
export const validationSchemas = {
  // Categories
  createCategory: CreateCategorySchema,
  updateCategory: UpdateCategorySchema,
  categoryListParams: CategoryListParamsSchema,
  
  // SOPs
  createSOP: CreateSOPSchema,
  updateSOP: UpdateSOPSchema,
  sopListParams: SOPListParamsSchema,
  
  // Search
  searchRequest: SearchRequestSchema,
  
  // Bookmarks
  createBookmark: CreateBookmarkSchema,
  updateBookmark: UpdateBookmarkSchema,
  bookmarkListParams: BookmarkListParamsSchema,
  
  // Progress
  updateProgress: UpdateProgressSchema,
  
  // Files
  fileUpload: FileUploadSchema,
  fileListParams: FileListParamsSchema,
  
  // Audit
  auditLogParams: AuditLogParamsSchema,
  
  // Auth
  pinAuth: PinAuthSchema,
  changePin: ChangePinSchema,
  
  // Bulk operations
  bulkSOPOperation: BulkSOPOperationSchema,
  
  // Common
  uuid: UUIDSchema,
  locale: LocaleSchema,
  pagination: PaginationSchema,
  sortOrder: SortOrderSchema,
};