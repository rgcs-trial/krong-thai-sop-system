/**
 * Admin Translation Status Management API
 * /api/admin/translations/[id]/status
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdmin } from '@/lib/supabase/client';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  UpdateTranslationStatusRequest,
  UpdateTranslationStatusResponse,
  TranslationStatus,
  isValidTranslationStatus,
} from '@/types/translation';
import { ApiResponse } from '@/types/api';

// Validation schemas
const updateStatusRequestSchema = z.object({
  status: z.string().refine(isValidTranslationStatus, { message: 'Invalid status' }),
  change_reason: z.string().max(500).optional(),
  notify_team: z.boolean().optional().default(false),
});

// Status workflow rules
const STATUS_WORKFLOW: Record<TranslationStatus, TranslationStatus[]> = {
  draft: ['review', 'approved'], // Draft can go to review or directly to approved
  review: ['draft', 'approved'], // Review can go back to draft or to approved
  approved: ['published', 'review'], // Approved can be published or sent back for review
  published: ['review'], // Published can only be sent back for review
};

/**
 * PUT /api/admin/translations/[id]/status - Update translation status with workflow validation
 */
async function handleUpdateTranslationStatus(
  req: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const translationId = params.id;

    if (!translationId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ID',
          message: 'Translation ID is required',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = updateStatusRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.errors,
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    const statusRequest = validationResult.data as UpdateTranslationStatusRequest;

    // Get current translation with key information
    const { data: currentTranslation, error: fetchError } = await dbAdmin
      .from('translations')
      .select(`
        id,
        locale,
        value,
        status,
        translation_key_id,
        translation_key:translation_keys(
          id,
          key,
          category
        )
      `)
      .eq('id', translationId)
      .single();

    if (fetchError || !currentTranslation) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TRANSLATION_NOT_FOUND',
          message: 'Translation not found',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 404 });
    }

    const currentStatus = currentTranslation.status as TranslationStatus;
    const newStatus = statusRequest.status as TranslationStatus;

    // Validate status transition
    if (currentStatus === newStatus) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'STATUS_UNCHANGED',
          message: 'Translation is already in the requested status',
          severity: 'low' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    // Check if the status transition is allowed
    const allowedTransitions = STATUS_WORKFLOW[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ')}`,
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 409 });
    }

    // Check user permissions for specific status transitions
    const hasPermission = await checkStatusPermission(req, currentStatus, newStatus);
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `You don't have permission to change status from '${currentStatus}' to '${newStatus}'`,
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 403 });
    }

    // Perform additional validations based on target status
    const validationErrors = await validateStatusRequirements(currentTranslation, newStatus);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'STATUS_REQUIREMENTS_NOT_MET',
          message: 'Status change requirements not met',
          details: validationErrors,
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 422 });
    }

    // Update the translation status
    const { data: updatedTranslation, error: updateError } = await dbAdmin
      .from('translations')
      .update({
        status: newStatus,
        updated_by: req.auth?.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', translationId)
      .select()
      .single();

    if (updateError || !updatedTranslation) {
      console.error('Database error updating translation status:', updateError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update translation status',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Record status change in history
    const { data: historyRecord, error: historyError } = await dbAdmin
      .from('translation_history')
      .insert({
        translation_id: translationId,
        field_name: 'status',
        old_value: currentStatus,
        new_value: newStatus,
        changed_by: req.auth?.user.id,
        change_reason: statusRequest.change_reason,
      })
      .select('id')
      .single();

    if (historyError) {
      console.warn('Failed to record status change history:', historyError);
    }

    // Invalidate cache for the affected locale and category
    const category = currentTranslation.translation_key?.category;
    await invalidateTranslationCache([currentTranslation.locale], category ? [category] : []);

    // Send notifications if requested
    let workflowNotifications = 0;
    if (statusRequest.notify_team) {
      workflowNotifications = await sendStatusNotifications(
        currentTranslation,
        currentStatus,
        newStatus,
        req.auth?.user.id || '',
        statusRequest.change_reason
      );
    }

    // Log audit event
    await logAuditEvent(req, 'STATUS_CHANGE', 'translation', translationId, {
      status: currentStatus,
    }, {
      status: newStatus,
      change_reason: statusRequest.change_reason,
    });

    // Prepare response
    const response: UpdateTranslationStatusResponse = {
      translation: updatedTranslation,
      previous_status: currentStatus,
      workflow_notifications: workflowNotifications,
      cache_updated: true,
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<UpdateTranslationStatusResponse>, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in update translation status API:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        severity: 'high' as const,
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse, { status: 500 });
  }
}

/**
 * Check if user has permission for the status transition
 */
async function checkStatusPermission(
  req: EnhancedRequest,
  currentStatus: TranslationStatus,
  newStatus: TranslationStatus
): Promise<boolean> {
  if (!req.auth) return false;

  const userPermissions = req.auth.permissions;
  const userRole = req.auth.user.role;

  // Define permission requirements for status transitions
  const statusPermissions: Record<string, string[]> = {
    'draft->review': ['translations:submit_for_review'],
    'draft->approved': ['translations:approve'], // Direct approval requires special permission
    'review->draft': ['translations:reject'],
    'review->approved': ['translations:approve'],
    'approved->published': ['translations:publish'],
    'approved->review': ['translations:reject'],
    'published->review': ['translations:unpublish'],
  };

  const transitionKey = `${currentStatus}->${newStatus}`;
  const requiredPermissions = statusPermissions[transitionKey];

  if (!requiredPermissions) {
    // If no specific permissions are defined, allow managers and above
    return ['manager', 'admin'].includes(userRole);
  }

  // Check if user has any of the required permissions
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

/**
 * Validate requirements for specific status changes
 */
async function validateStatusRequirements(
  translation: any,
  newStatus: TranslationStatus
): Promise<string[]> {
  const errors: string[] = [];

  switch (newStatus) {
    case 'review':
      // Ensure translation has content
      if (!translation.value || translation.value.trim().length === 0) {
        errors.push('Translation must have content to be submitted for review');
      }
      break;

    case 'approved':
      // Ensure translation meets quality standards
      if (!translation.value || translation.value.trim().length === 0) {
        errors.push('Translation must have content to be approved');
      }
      
      // Check for placeholder patterns that might indicate incomplete translation
      if (translation.value && /\{[^}]*\}/.test(translation.value)) {
        const translationKey = translation.translation_key;
        if (translationKey?.interpolation_vars?.length === 0) {
          errors.push('Translation contains placeholders but no interpolation variables are defined');
        }
      }
      break;

    case 'published':
      // Ensure all sibling translations in other locales are at least approved
      const { data: siblingTranslations, error } = await dbAdmin
        .from('translations')
        .select('locale, status')
        .eq('translation_key_id', translation.translation_key_id)
        .neq('id', translation.id);

      if (error) {
        errors.push('Unable to validate sibling translations');
      } else {
        const incompleteLocales = siblingTranslations
          ?.filter(t => !['approved', 'published'].includes(t.status))
          .map(t => t.locale) || [];

        if (incompleteLocales.length > 0) {
          errors.push(`Cannot publish: translations in these locales are not approved: ${incompleteLocales.join(', ')}`);
        }
      }
      break;
  }

  return errors;
}

/**
 * Send notifications to team members about status changes
 */
async function sendStatusNotifications(
  translation: any,
  oldStatus: TranslationStatus,
  newStatus: TranslationStatus,
  changedBy: string,
  reason?: string
): Promise<number> {
  try {
    // In a real implementation, this would:
    // 1. Find relevant team members (translators, reviewers, managers)
    // 2. Send notifications via email, Slack, or internal notification system
    // 3. Create notification records in the database

    // For now, we'll just log the notification
    console.log('Status notification:', {
      translation_key: translation.translation_key?.key,
      locale: translation.locale,
      oldStatus,
      newStatus,
      changedBy,
      reason,
    });

    // Return the number of notifications sent
    return 1; // Simplified for demo
  } catch (error) {
    console.error('Error sending status notifications:', error);
    return 0;
  }
}

/**
 * Invalidate translation cache
 */
async function invalidateTranslationCache(locales: string[], categories: string[]): Promise<void> {
  try {
    let query = dbAdmin.from('translation_cache').delete();

    if (locales.length > 0) {
      query = query.in('locale', locales);
    }

    await query;
  } catch (error) {
    console.error('Error invalidating translation cache:', error);
  }
}

/**
 * Log audit event
 */
async function logAuditEvent(
  req: EnhancedRequest,
  action: string,
  resourceType: string,
  resourceId: string,
  oldValues: any,
  newValues: any
): Promise<void> {
  try {
    if (!req.auth) return;

    await dbAdmin.from('audit_logs').insert({
      restaurant_id: req.auth.restaurantId,
      user_id: req.auth.user.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

// Export handler with middleware
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return withMiddleware(
    (req: EnhancedRequest) => handleUpdateTranslationStatus(req, context),
    {
      requireAuth: true,
      requiredRole: 'staff', // Allow staff to submit for review
      requiredPermissions: ['translations:update_status'],
      validation: {
        body: updateStatusRequestSchema,
      },
      rateLimit: {
        maxRequests: 50,
        windowMinutes: 15,
      },
      audit: true,
    }
  )(request);
}