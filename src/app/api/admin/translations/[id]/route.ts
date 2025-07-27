/**
 * Admin Individual Translation Management API
 * /api/admin/translations/[id]
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdmin } from '@/lib/supabase/client';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  UpdateTranslationRequest,
  UpdateTranslationResponse,
  TranslationStatus,
  Locale,
  isValidTranslationStatus,
} from '@/types/translation';
import { ApiResponse } from '@/types/api';

// Validation schemas
const updateTranslationRequestSchema = z.object({
  value: z.string().min(1),
  status: z.string().refine(isValidTranslationStatus, { message: 'Invalid status' }).optional(),
  change_reason: z.string().max(500).optional(),
});

/**
 * GET /api/admin/translations/[id] - Get specific translation
 */
async function handleGetTranslation(
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

    // Fetch translation with related data
    const { data: translation, error } = await dbAdmin
      .from('translations')
      .select(`
        id,
        locale,
        value,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by,
        translation_key:translation_keys(
          id,
          key,
          category,
          description,
          interpolation_vars,
          context,
          created_at,
          updated_at
        )
      `)
      .eq('id', translationId)
      .single();

    if (error || !translation) {
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

    // Get usage analytics
    const { data: analytics } = await dbAdmin
      .from('translation_analytics')
      .select('usage_count, last_accessed, interpolated_count, fallback_count')
      .eq('translation_key_id', translation.translation_key?.id)
      .eq('locale', translation.locale)
      .single();

    // Get recent history
    const { data: history } = await dbAdmin
      .from('translation_history')
      .select(`
        id,
        field_name,
        old_value,
        new_value,
        changed_by,
        changed_at,
        change_reason
      `)
      .eq('translation_id', translationId)
      .order('changed_at', { ascending: false })
      .limit(10);

    const response = {
      ...translation,
      analytics: analytics || null,
      history: history || [],
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in get translation API:', error);
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
 * PUT /api/admin/translations/[id] - Update specific translation
 */
async function handleUpdateTranslation(
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
    const validationResult = updateTranslationRequestSchema.safeParse(body);

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

    const updateRequest = validationResult.data as UpdateTranslationRequest;

    // Get current translation for history tracking
    const { data: currentTranslation, error: fetchError } = await dbAdmin
      .from('translations')
      .select(`
        id,
        locale,
        value,
        status,
        translation_key_id,
        translation_key:translation_keys(
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

    // Prepare update data
    const updateData: any = {
      value: updateRequest.value,
      updated_by: req.auth?.user.id,
      updated_at: new Date().toISOString(),
    };

    if (updateRequest.status) {
      updateData.status = updateRequest.status;
    }

    // Update the translation
    const { data: updatedTranslation, error: updateError } = await dbAdmin
      .from('translations')
      .update(updateData)
      .eq('id', translationId)
      .select()
      .single();

    if (updateError || !updatedTranslation) {
      console.error('Database error updating translation:', updateError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update translation',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Record history for changed fields
    const historyRecords = [];
    
    if (currentTranslation.value !== updateRequest.value) {
      historyRecords.push({
        translation_id: translationId,
        field_name: 'value',
        old_value: currentTranslation.value,
        new_value: updateRequest.value,
        changed_by: req.auth?.user.id,
        change_reason: updateRequest.change_reason,
      });
    }

    if (updateRequest.status && currentTranslation.status !== updateRequest.status) {
      historyRecords.push({
        translation_id: translationId,
        field_name: 'status',
        old_value: currentTranslation.status,
        new_value: updateRequest.status,
        changed_by: req.auth?.user.id,
        change_reason: updateRequest.change_reason,
      });
    }

    // Insert history records
    let historyId = null;
    if (historyRecords.length > 0) {
      const { data: history, error: historyError } = await dbAdmin
        .from('translation_history')
        .insert(historyRecords)
        .select('id')
        .single();

      if (!historyError && history) {
        historyId = history.id;
      }
    }

    // Invalidate cache
    const category = currentTranslation.translation_key?.category;
    await invalidateTranslationCache([currentTranslation.locale], category ? [category] : []);

    // Log audit event
    await logAuditEvent(req, 'UPDATE', 'translation', translationId, {
      value: currentTranslation.value,
      status: currentTranslation.status,
    }, {
      value: updateRequest.value,
      status: updateRequest.status || currentTranslation.status,
    });

    // Prepare response
    const response: UpdateTranslationResponse = {
      translation: updatedTranslation,
      previous_value: currentTranslation.value,
      history_id: historyId,
      cache_updated: true,
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<UpdateTranslationResponse>, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in update translation API:', error);
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
 * DELETE /api/admin/translations/[id] - Delete specific translation
 */
async function handleDeleteTranslation(
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

    // Get translation info before deletion for audit log
    const { data: translation, error: fetchError } = await dbAdmin
      .from('translations')
      .select(`
        id,
        locale,
        value,
        status,
        translation_key:translation_keys(
          key,
          category
        )
      `)
      .eq('id', translationId)
      .single();

    if (fetchError || !translation) {
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

    // Check if this is the last translation for this key
    const { data: otherTranslations, error: countError } = await dbAdmin
      .from('translations')
      .select('id')
      .eq('translation_key_id', translation.translation_key?.id)
      .neq('id', translationId);

    if (countError) {
      console.error('Error checking other translations:', countError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to check translation dependencies',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Prevent deletion if this is the last translation
    if (!otherTranslations || otherTranslations.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_LAST_TRANSLATION',
          message: 'Cannot delete the last translation for a key. Delete the translation key instead.',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 409 });
    }

    // Delete the translation
    const { error: deleteError } = await dbAdmin
      .from('translations')
      .delete()
      .eq('id', translationId);

    if (deleteError) {
      console.error('Database error deleting translation:', deleteError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete translation',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Invalidate cache
    const category = translation.translation_key?.category;
    await invalidateTranslationCache([translation.locale], category ? [category] : []);

    // Log audit event
    await logAuditEvent(req, 'DELETE', 'translation', translationId, {
      value: translation.value,
      status: translation.status,
      locale: translation.locale,
    }, null);

    return NextResponse.json({
      success: true,
      message: 'Translation deleted successfully',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in delete translation API:', error);
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
 * Invalidate translation cache for specific locales and categories
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
    // Don't fail the request if cache invalidation fails
  }
}

/**
 * Log audit event for translation operations
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
    // Don't fail the request if audit logging fails
  }
}

// Export handlers with middleware
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return withMiddleware(
    (req: EnhancedRequest) => handleGetTranslation(req, context),
    {
      requireAuth: true,
      requiredRole: 'manager',
      requiredPermissions: ['translations:read'],
      audit: true,
    }
  )(request);
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return withMiddleware(
    (req: EnhancedRequest) => handleUpdateTranslation(req, context),
    {
      requireAuth: true,
      requiredRole: 'manager',
      requiredPermissions: ['translations:update'],
      validation: {
        body: updateTranslationRequestSchema,
      },
      rateLimit: {
        maxRequests: 50,
        windowMinutes: 15,
      },
      audit: true,
    }
  )(request);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return withMiddleware(
    (req: EnhancedRequest) => handleDeleteTranslation(req, context),
    {
      requireAuth: true,
      requiredRole: 'admin',
      requiredPermissions: ['translations:delete'],
      rateLimit: {
        maxRequests: 20,
        windowMinutes: 15,
      },
      audit: true,
    }
  )(request);
}