/**
 * SOP API Validation Utilities
 * Comprehensive validation for all SOP-related API requests
 */

import { ValidationResult, ValidationError } from '@/types/api/sop';

// Helper function to create validation error
function createValidationError(field: string, message: string, value?: any): ValidationError {
  return { field, message, value };
}

// Helper function to validate required fields
function validateRequired(value: any, field: string): ValidationError | null {
  if (value === undefined || value === null || value === '') {
    return createValidationError(field, `${field} is required`);
  }
  return null;
}

// Helper function to validate string length
function validateStringLength(
  value: string,
  field: string,
  min?: number,
  max?: number
): ValidationError | null {
  if (min !== undefined && value.length < min) {
    return createValidationError(field, `${field} must be at least ${min} characters long`, value);
  }
  if (max !== undefined && value.length > max) {
    return createValidationError(field, `${field} must be no more than ${max} characters long`, value);
  }
  return null;
}

// Helper function to validate email format
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate UUID format
function validateUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Helper function to validate date format (ISO 8601)
function validateDateISO(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}

// Helper function to validate enum values
function validateEnum<T extends string>(
  value: T,
  field: string,
  allowedValues: readonly T[]
): ValidationError | null {
  if (!allowedValues.includes(value)) {
    return createValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
      value
    );
  }
  return null;
}

// =============================================================================
// SOP DOCUMENT VALIDATION
// =============================================================================

export function validateCreateSOPDocument(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  const requiredError = validateRequired(data.title, 'title');
  if (requiredError) errors.push(requiredError);

  const titleFrError = validateRequired(data.title_fr, 'title_fr');
  if (titleFrError) errors.push(titleFrError);

  const contentError = validateRequired(data.content, 'content');
  if (contentError) errors.push(contentError);

  const contentFrError = validateRequired(data.content_fr, 'content_fr');
  if (contentFrError) errors.push(contentFrError);

  const categoryError = validateRequired(data.category_id, 'category_id');
  if (categoryError) errors.push(categoryError);

  // String length validations
  if (data.title) {
    const titleLengthError = validateStringLength(data.title, 'title', 1, 255);
    if (titleLengthError) errors.push(titleLengthError);
  }

  if (data.title_fr) {
    const titleFrLengthError = validateStringLength(data.title_fr, 'title_fr', 1, 255);
    if (titleFrLengthError) errors.push(titleFrLengthError);
  }

  if (data.content) {
    const contentLengthError = validateStringLength(data.content, 'content', 1, 50000);
    if (contentLengthError) errors.push(contentLengthError);
  }

  if (data.content_fr) {
    const contentFrLengthError = validateStringLength(data.content_fr, 'content_fr', 1, 50000);
    if (contentFrLengthError) errors.push(contentFrLengthError);
  }

  // UUID validation
  if (data.category_id && !validateUUID(data.category_id)) {
    errors.push(createValidationError('category_id', 'category_id must be a valid UUID', data.category_id));
  }

  // Enum validations
  if (data.difficulty_level) {
    const difficultyError = validateEnum(
      data.difficulty_level,
      'difficulty_level',
      ['beginner', 'intermediate', 'advanced'] as const
    );
    if (difficultyError) errors.push(difficultyError);
  }

  // Number validations
  if (data.estimated_read_time !== undefined) {
    if (typeof data.estimated_read_time !== 'number' || data.estimated_read_time < 1 || data.estimated_read_time > 600) {
      errors.push(createValidationError(
        'estimated_read_time',
        'estimated_read_time must be a number between 1 and 600 minutes',
        data.estimated_read_time
      ));
    }
  }

  // Array validations
  if (data.tags) {
    if (!Array.isArray(data.tags)) {
      errors.push(createValidationError('tags', 'tags must be an array', data.tags));
    } else {
      data.tags.forEach((tag: any, index: number) => {
        if (typeof tag !== 'string') {
          errors.push(createValidationError(`tags[${index}]`, 'tag must be a string', tag));
        } else if (tag.length > 50) {
          errors.push(createValidationError(`tags[${index}]`, 'tag must be no more than 50 characters', tag));
        }
      });
      
      if (data.tags.length > 20) {
        errors.push(createValidationError('tags', 'maximum 20 tags allowed', data.tags));
      }
    }
  }

  // Date validations
  if (data.review_due_date && !validateDateISO(data.review_due_date)) {
    errors.push(createValidationError(
      'review_due_date',
      'review_due_date must be a valid ISO 8601 date',
      data.review_due_date
    ));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateUpdateSOPDocument(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Optional field validations (same as create but all optional)
  if (data.title !== undefined) {
    const titleLengthError = validateStringLength(data.title, 'title', 1, 255);
    if (titleLengthError) errors.push(titleLengthError);
  }

  if (data.title_fr !== undefined) {
    const titleFrLengthError = validateStringLength(data.title_fr, 'title_fr', 1, 255);
    if (titleFrLengthError) errors.push(titleFrLengthError);
  }

  if (data.category_id !== undefined && !validateUUID(data.category_id)) {
    errors.push(createValidationError('category_id', 'category_id must be a valid UUID', data.category_id));
  }

  if (data.status !== undefined) {
    const statusError = validateEnum(
      data.status,
      'status',
      ['draft', 'review', 'approved', 'archived'] as const
    );
    if (statusError) errors.push(statusError);
  }

  if (data.difficulty_level !== undefined) {
    const difficultyError = validateEnum(
      data.difficulty_level,
      'difficulty_level',
      ['beginner', 'intermediate', 'advanced'] as const
    );
    if (difficultyError) errors.push(difficultyError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// SOP CATEGORY VALIDATION
// =============================================================================

export function validateCreateSOPCategory(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  const nameError = validateRequired(data.name, 'name');
  if (nameError) errors.push(nameError);

  const nameFrError = validateRequired(data.name_fr, 'name_fr');
  if (nameFrError) errors.push(nameFrError);

  const sortOrderError = validateRequired(data.sort_order, 'sort_order');
  if (sortOrderError) errors.push(sortOrderError);

  // String length validations
  if (data.name) {
    const nameLengthError = validateStringLength(data.name, 'name', 1, 100);
    if (nameLengthError) errors.push(nameLengthError);
  }

  if (data.name_fr) {
    const nameFrLengthError = validateStringLength(data.name_fr, 'name_fr', 1, 100);
    if (nameFrLengthError) errors.push(nameFrLengthError);
  }

  if (data.description) {
    const descLengthError = validateStringLength(data.description, 'description', 0, 500);
    if (descLengthError) errors.push(descLengthError);
  }

  if (data.description_fr) {
    const descFrLengthError = validateStringLength(data.description_fr, 'description_fr', 0, 500);
    if (descFrLengthError) errors.push(descFrLengthError);
  }

  // Number validations
  if (data.sort_order !== undefined) {
    if (typeof data.sort_order !== 'number' || data.sort_order < 0 || data.sort_order > 9999) {
      errors.push(createValidationError(
        'sort_order',
        'sort_order must be a number between 0 and 9999',
        data.sort_order
      ));
    }
  }

  // Color validation (hex color)
  if (data.color) {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(data.color)) {
      errors.push(createValidationError('color', 'color must be a valid hex color code', data.color));
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// SOP COMPLETION VALIDATION
// =============================================================================

export function validateCreateSOPCompletion(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  const sopIdError = validateRequired(data.sop_id, 'sop_id');
  if (sopIdError) errors.push(sopIdError);

  const percentageError = validateRequired(data.completion_percentage, 'completion_percentage');
  if (percentageError) errors.push(percentageError);

  const timeError = validateRequired(data.time_spent_minutes, 'time_spent_minutes');
  if (timeError) errors.push(timeError);

  // UUID validation
  if (data.sop_id && !validateUUID(data.sop_id)) {
    errors.push(createValidationError('sop_id', 'sop_id must be a valid UUID', data.sop_id));
  }

  // Number validations
  if (data.completion_percentage !== undefined) {
    if (typeof data.completion_percentage !== 'number' || 
        data.completion_percentage < 0 || 
        data.completion_percentage > 100) {
      errors.push(createValidationError(
        'completion_percentage',
        'completion_percentage must be a number between 0 and 100',
        data.completion_percentage
      ));
    }
  }

  if (data.time_spent_minutes !== undefined) {
    if (typeof data.time_spent_minutes !== 'number' || data.time_spent_minutes < 0) {
      errors.push(createValidationError(
        'time_spent_minutes',
        'time_spent_minutes must be a non-negative number',
        data.time_spent_minutes
      ));
    }
  }

  // Array validation for photos
  if (data.verification_photos) {
    if (!Array.isArray(data.verification_photos)) {
      errors.push(createValidationError(
        'verification_photos',
        'verification_photos must be an array',
        data.verification_photos
      ));
    } else if (data.verification_photos.length > 10) {
      errors.push(createValidationError(
        'verification_photos',
        'maximum 10 verification photos allowed',
        data.verification_photos
      ));
    }
  }

  // Notes length validation
  if (data.notes) {
    const notesLengthError = validateStringLength(data.notes, 'notes', 0, 1000);
    if (notesLengthError) errors.push(notesLengthError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// SOP ASSIGNMENT VALIDATION
// =============================================================================

export function validateCreateSOPAssignment(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  const sopIdError = validateRequired(data.sop_id, 'sop_id');
  if (sopIdError) errors.push(sopIdError);

  const assignedToError = validateRequired(data.assigned_to, 'assigned_to');
  if (assignedToError) errors.push(assignedToError);

  const priorityError = validateRequired(data.priority, 'priority');
  if (priorityError) errors.push(priorityError);

  // UUID validation
  if (data.sop_id && !validateUUID(data.sop_id)) {
    errors.push(createValidationError('sop_id', 'sop_id must be a valid UUID', data.sop_id));
  }

  // Array validation for assigned users
  if (data.assigned_to) {
    if (!Array.isArray(data.assigned_to)) {
      errors.push(createValidationError('assigned_to', 'assigned_to must be an array', data.assigned_to));
    } else {
      data.assigned_to.forEach((userId: any, index: number) => {
        if (!validateUUID(userId)) {
          errors.push(createValidationError(
            `assigned_to[${index}]`,
            'user ID must be a valid UUID',
            userId
          ));
        }
      });
      
      if (data.assigned_to.length === 0) {
        errors.push(createValidationError('assigned_to', 'at least one user must be assigned', data.assigned_to));
      }

      if (data.assigned_to.length > 50) {
        errors.push(createValidationError('assigned_to', 'maximum 50 users can be assigned', data.assigned_to));
      }
    }
  }

  // Enum validation
  if (data.priority) {
    const priorityEnumError = validateEnum(
      data.priority,
      'priority',
      ['low', 'medium', 'high', 'urgent'] as const
    );
    if (priorityEnumError) errors.push(priorityEnumError);
  }

  // Date validation
  if (data.due_date && !validateDateISO(data.due_date)) {
    errors.push(createValidationError(
      'due_date',
      'due_date must be a valid ISO 8601 date',
      data.due_date
    ));
  }

  // Notes length validation
  if (data.notes) {
    const notesLengthError = validateStringLength(data.notes, 'notes', 0, 1000);
    if (notesLengthError) errors.push(notesLengthError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// SEARCH VALIDATION
// =============================================================================

export function validateSOPSearch(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Query validation
  if (data.query) {
    const queryLengthError = validateStringLength(data.query, 'query', 1, 200);
    if (queryLengthError) errors.push(queryLengthError);
  }

  // Locale validation
  if (data.locale) {
    const localeError = validateEnum(data.locale, 'locale', ['en', 'fr'] as const);
    if (localeError) errors.push(localeError);
  }

  // Search fields validation
  if (data.search_fields) {
    if (!Array.isArray(data.search_fields)) {
      errors.push(createValidationError('search_fields', 'search_fields must be an array', data.search_fields));
    } else {
      const allowedFields = ['title', 'content', 'tags'];
      data.search_fields.forEach((field: any, index: number) => {
        if (!allowedFields.includes(field)) {
          errors.push(createValidationError(
            `search_fields[${index}]`,
            `search field must be one of: ${allowedFields.join(', ')}`,
            field
          ));
        }
      });
    }
  }

  // Pagination validation
  if (data.page !== undefined) {
    if (typeof data.page !== 'number' || data.page < 1) {
      errors.push(createValidationError('page', 'page must be a positive number', data.page));
    }
  }

  if (data.limit !== undefined) {
    if (typeof data.limit !== 'number' || data.limit < 1 || data.limit > 100) {
      errors.push(createValidationError('limit', 'limit must be between 1 and 100', data.limit));
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// EXPORT VALIDATION
// =============================================================================

export function validateSOPExport(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required format
  const formatError = validateRequired(data.format, 'format');
  if (formatError) errors.push(formatError);

  // Format validation
  if (data.format) {
    const formatEnumError = validateEnum(
      data.format,
      'format',
      ['json', 'csv', 'pdf', 'excel'] as const
    );
    if (formatEnumError) errors.push(formatEnumError);
  }

  // Date range validation
  if (data.date_range) {
    if (typeof data.date_range !== 'object') {
      errors.push(createValidationError('date_range', 'date_range must be an object', data.date_range));
    } else {
      if (data.date_range.start_date && !validateDateISO(data.date_range.start_date)) {
        errors.push(createValidationError(
          'date_range.start_date',
          'start_date must be a valid ISO 8601 date',
          data.date_range.start_date
        ));
      }

      if (data.date_range.end_date && !validateDateISO(data.date_range.end_date)) {
        errors.push(createValidationError(
          'date_range.end_date',
          'end_date must be a valid ISO 8601 date',
          data.date_range.end_date
        ));
      }

      if (data.date_range.start_date && data.date_range.end_date) {
        const startDate = new Date(data.date_range.start_date);
        const endDate = new Date(data.date_range.end_date);
        if (startDate >= endDate) {
          errors.push(createValidationError(
            'date_range',
            'start_date must be before end_date',
            data.date_range
          ));
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// GENERIC PAGINATION VALIDATION
// =============================================================================

export function validatePagination(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (data.page !== undefined) {
    if (typeof data.page !== 'number' || data.page < 1) {
      errors.push(createValidationError('page', 'page must be a positive number', data.page));
    }
  }

  if (data.limit !== undefined) {
    if (typeof data.limit !== 'number' || data.limit < 1 || data.limit > 100) {
      errors.push(createValidationError('limit', 'limit must be between 1 and 100', data.limit));
    }
  }

  if (data.sortBy !== undefined) {
    const allowedSortFields = [
      'created_at', 'updated_at', 'title', 'title_fr', 'status', 
      'difficulty_level', 'estimated_read_time', 'sort_order'
    ];
    if (!allowedSortFields.includes(data.sortBy)) {
      errors.push(createValidationError(
        'sortBy',
        `sortBy must be one of: ${allowedSortFields.join(', ')}`,
        data.sortBy
      ));
    }
  }

  if (data.sortOrder !== undefined) {
    const sortOrderError = validateEnum(data.sortOrder, 'sortOrder', ['asc', 'desc'] as const);
    if (sortOrderError) errors.push(sortOrderError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}