/**
 * API utility functions and response helpers
 * Restaurant Krong Thai SOP Management System
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  ApiResponse, 
  PaginatedApiResponse, 
  ApiError,
  PaginationParams 
} from '@/types/api';
import { AuditAction } from '@/types/database';
import { dbAdmin } from '@/lib/supabase/client';

/**
 * Create standardized API response
 */
export function createApiResponse<T>(
  data: T,
  success: boolean = true,
  message?: string,
  requestId?: string
): ApiResponse<T> {
  return {
    data,
    success,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || crypto.randomUUID(),
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  code: string = 'API_ERROR',
  status: number = 500,
  details?: Record<string, any>,
  requestId?: string
): NextResponse {
  const error: ApiError = {
    code,
    message,
    severity: status >= 500 ? 'critical' : status >= 400 ? 'medium' : 'low',
    details,
  };

  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    requestId: requestId || crypto.randomUUID(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
  requestId?: string
): NextResponse {
  const response = createApiResponse(data, true, message, requestId);
  return NextResponse.json(response, { status });
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string,
  requestId?: string
): NextResponse {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  const response: PaginatedApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || crypto.randomUUID(),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  };

  return NextResponse.json(response);
}

/**
 * Extract pagination parameters from request
 */
export function extractPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Extract sort parameters from request
 */
export function extractSortParams(
  searchParams: URLSearchParams,
  defaultSortBy: string = 'created_at',
  allowedSortFields: string[] = []
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const sortBy = searchParams.get('sortBy') || defaultSortBy;
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Validate sort field
  const validSortBy = allowedSortFields.length > 0 && !allowedSortFields.includes(sortBy)
    ? defaultSortBy
    : sortBy;

  return {
    sortBy: validSortBy,
    sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc',
  };
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>\"'%;()&+]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500); // Limit length
}

/**
 * Generate cache key for API responses
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, any>,
  userId?: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const paramsString = JSON.stringify(sortedParams);
  const hash = crypto.createHash('md5').update(paramsString).digest('hex');
  
  return `${prefix}:${userId || 'anonymous'}:${hash}`;
}

/**
 * Check if request is from a mobile device
 */
export function isMobileDevice(userAgent: string): boolean {
  const mobileRegex = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const connectingIP = request.headers.get('x-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || connectingIP || 'unknown';
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Convert database field names to camelCase
 */
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        result[camelKey] = toCamelCase(obj[key]);
      }
    }
    
    return result;
  }
  
  return obj;
}

/**
 * Convert camelCase field names to snake_case
 */
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        result[snakeKey] = toSnakeCase(obj[key]);
      }
    }
    
    return result;
  }
  
  return obj;
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  restaurantId: string,
  userId: string,
  action: AuditAction,
  resourceType: string,
  resourceId?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  metadata?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string
): Promise<void> {
  try {
    await dbAdmin.from('audit_logs').insert({
      restaurant_id: restaurantId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: oldValues,
      new_values: newValues,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to avoid disrupting main operation
  }
}

/**
 * Generate secure token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate file upload path
 */
export function generateUploadPath(
  restaurantId: string,
  category: string,
  filename: string
): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(4).toString('hex');
  const extension = filename.split('.').pop() || '';
  
  return `uploads/${restaurantId}/${category}/${timestamp}_${randomString}.${extension}`;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSize: number
): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Generate thumbnail URL for images
 */
export function generateThumbnailUrl(originalUrl: string, size: number = 150): string {
  // This would integrate with your image processing service
  // For now, return the original URL
  return originalUrl;
}

/**
 * Calculate reading time for SOP content
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return Math.max(1, minutes);
}

/**
 * Extract highlights from search results
 */
export function extractHighlights(
  content: string,
  searchTerm: string,
  maxLength: number = 200
): string {
  const lowerContent = content.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const termIndex = lowerContent.indexOf(lowerTerm);
  
  if (termIndex === -1) {
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, termIndex - 50);
  const end = Math.min(content.length, termIndex + searchTerm.length + 50);
  
  let highlight = content.substring(start, end);
  
  if (start > 0) highlight = '...' + highlight;
  if (end < content.length) highlight = highlight + '...';
  
  // Wrap search term in highlight tags
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  highlight = highlight.replace(regex, '<mark>$1</mark>');
  
  return highlight;
}

/**
 * Convert database timestamps to local timezone
 */
export function convertToLocalTime(
  timestamp: string,
  timezone: string = 'Asia/Bangkok'
): string {
  return new Date(timestamp).toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Check if user has permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Get error message in French
 */
export function getFrenchErrorMessage(errorCode: string): string {
  const frenchMessages: Record<string, string> = {
    'VALIDATION_ERROR': 'Données incorrectes',
    'AUTHENTICATION_REQUIRED': 'Connexion requise',
    'INSUFFICIENT_PRIVILEGES': 'Privilèges insuffisants',
    'RESOURCE_NOT_FOUND': 'Ressource non trouvée',
    'DUPLICATE_RESOURCE': 'Ressource dupliquée',
    'RATE_LIMIT_EXCEEDED': 'Limite d’utilisation dépassée',
    'INTERNAL_SERVER_ERROR': 'Erreur interne du serveur',
    'INVALID_REQUEST': 'Requête invalide',
    'FILE_TOO_LARGE': 'Fichier trop volumineux',
    'INVALID_FILE_TYPE': 'Type de fichier invalide',
  };

  return frenchMessages[errorCode] || 'Une erreur est survenue';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Debounce function for search
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate and normalize phone number
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add Thai country code if not present
  if (digits.length === 9 && digits.startsWith('0')) {
    return `+66${digits.substring(1)}`;
  }
  
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+66${digits.substring(1)}`;
  }
  
  if (digits.length === 9) {
    return `+66${digits}`;
  }
  
  return phone;
}

/**
 * Generate SEO-friendly slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Export commonly used constants
export const API_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  DEFAULT_PAGINATION_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
  CACHE_TTL: {
    SHORT: 5 * 60, // 5 minutes
    MEDIUM: 30 * 60, // 30 minutes
    LONG: 24 * 60 * 60, // 24 hours
  },
};