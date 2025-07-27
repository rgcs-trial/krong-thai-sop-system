/**
 * Admin Individual Translation Key Management API
 * /api/admin/translation-keys/[id]
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdmin } from '@/lib/supabase/client';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  UpdateTranslationKeyRequest,
  UpdateTranslationKeyResponse,
} from '@/types/translation';
import { ApiResponse } from '@/types/api';

// Validation schemas
const updateTranslationKeySchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, { message: 'Invalid key format' }).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  interpolation_vars: z.array(z.string()).optional(),
  context: z.string().max(255).optional(),
});

/**
 * GET /api/admin/translation-keys/[id] - Get specific translation key with all translations
 */
async function handleGetTranslationKey(
  req: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const keyId = params.id;

    if (!keyId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ID',
          message: 'Translation key ID is required',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    // Fetch translation key with all related data
    const { data: translationKey, error } = await dbAdmin
      .from('translation_keys')
      .select(`
        id,
        key,
        category,
        description,
        interpolation_vars,
        context,
        created_at,
        updated_at,
        translations(
          id,
          locale,
          value,
          status,
          created_at,
          updated_at,
          created_by,
          updated_by
        )
      `)
      .eq('id', keyId)
      .single();

    if (error || !translationKey) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TRANSLATION_KEY_NOT_FOUND',
          message: 'Translation key not found',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 404 });
    }

    // Get usage analytics for this key
    const { data: analytics } = await dbAdmin
      .from('translation_analytics')
      .select(`
        locale,
        usage_count,
        last_accessed,
        interpolated_count,
        fallback_count,
        missing_count
      `)
      .eq('translation_key_id', keyId);

    // Get recent history for this key's translations
    const { data: history } = await dbAdmin
      .from('translation_history')
      .select(`
        id,
        translation_id,
        field_name,
        old_value,
        new_value,
        changed_by,
        changed_at,
        change_reason
      `)
      .in('translation_id', translationKey.translations?.map((t: any) => t.id) || [])
      .order('changed_at', { ascending: false })
      .limit(20);

    const response = {
      ...translationKey,
      analytics: analytics || [],
      recent_history: history || [],
      summary: {
        total_translations: translationKey.translations?.length || 0,
        locales: [...new Set(translationKey.translations?.map((t: any) => t.locale) || [])],
        statuses: [...new Set(translationKey.translations?.map((t: any) => t.status) || [])],
        total_usage: analytics?.reduce((sum, a) => sum + (a.usage_count || 0), 0) || 0,
        last_used: analytics?.reduce((latest, a) => {
          const accessTime = new Date(a.last_accessed || 0);
          return accessTime > latest ? accessTime : latest;
        }, new Date(0))?.toISOString() || null,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in get translation key API:', error);
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
 * PUT /api/admin/translation-keys/[id] - Update translation key
 */
async function handleUpdateTranslationKey(
  req: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const keyId = params.id;

    if (!keyId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ID',
          message: 'Translation key ID is required',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = updateTranslationKeySchema.safeParse(body);

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

    const updateRequest = validationResult.data as UpdateTranslationKeyRequest;

    // Get current translation key for comparison
    const { data: currentKey, error: fetchError } = await dbAdmin
      .from('translation_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (fetchError || !currentKey) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TRANSLATION_KEY_NOT_FOUND',
          message: 'Translation key not found',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 404 });
    }

    // Check if new key already exists (if key is being changed)
    if (updateRequest.key && updateRequest.key !== currentKey.key) {
      const { data: existingKey, error: checkError } = await dbAdmin
        .from('translation_keys')
        .select('id')
        .eq('key', updateRequest.key)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Database error checking existing key:', checkError);
        return NextResponse.json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to check existing key',
            severity: 'high' as const,
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse, { status: 500 });
      }

      if (existingKey) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'KEY_EXISTS',
            message: `Translation key '${updateRequest.key}' already exists`,
            severity: 'medium' as const,
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse, { status: 409 });
      }
    }

    // Update translation key
    const updateData = {
      ...updateRequest,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedKey, error: updateError } = await dbAdmin
      .from('translation_keys')
      .update(updateData)
      .eq('id', keyId)
      .select()
      .single();

    if (updateError || !updatedKey) {
      console.error('Database error updating translation key:', updateError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update translation key',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Count affected translations
    const { count: affectedTranslations } = await dbAdmin
      .from('translations')
      .select('id', { count: 'exact', head: true })
      .eq('translation_key_id', keyId);

    // Invalidate cache if category changed
    let cacheInvalidated = false;
    if (updateRequest.category && updateRequest.category !== currentKey.category) {
      await invalidateTranslationCache([], [currentKey.category, updateRequest.category]);
      cacheInvalidated = true;
    }

    // Log audit event
    await logAuditEvent(req, 'UPDATE', 'translation_key', keyId, currentKey, updateRequest);

    const response: UpdateTranslationKeyResponse = {
      translation_key: updatedKey,
      affected_translations: affectedTranslations || 0,
      cache_invalidated: cacheInvalidated,
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<UpdateTranslationKeyResponse>, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in update translation key API:', error);
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
 * DELETE /api/admin/translation-keys/[id] - Delete translation key and all its translations
 */
async function handleDeleteTranslationKey(
  req: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const keyId = params.id;

    if (!keyId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ID',
          message: 'Translation key ID is required',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    // Get translation key info before deletion
    const { data: translationKey, error: fetchError } = await dbAdmin
      .from('translation_keys')
      .select(`
        id,
        key,
        category,
        translations(count)
      `)
      .eq('id', keyId)
      .single();

    if (fetchError || !translationKey) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TRANSLATION_KEY_NOT_FOUND',
          message: 'Translation key not found',
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 404 });
    }

    const translationCount = translationKey.translations?.[0]?.count || 0;

    // Check if this key is critical (prevent accidental deletion of important keys)
    if (isCriticalTranslationKey(translationKey.key)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CRITICAL_KEY_DELETION',
          message: `Cannot delete critical translation key: ${translationKey.key}`,
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 403 });
    }

    // Delete associated data in order (respecting foreign key constraints)
    
    // 1. Delete translation analytics
    await dbAdmin
      .from('translation_analytics')
      .delete()
      .eq('translation_key_id', keyId);

    // 2. Delete translation history
    if (translationCount > 0) {
      const { data: translationIds } = await dbAdmin
        .from('translations')
        .select('id')
        .eq('translation_key_id', keyId);

      if (translationIds && translationIds.length > 0) {
        await dbAdmin
          .from('translation_history')
          .delete()
          .in('translation_id', translationIds.map(t => t.id));
      }
    }

    // 3. Delete translations
    if (translationCount > 0) {
      const { error: deleteTranslationsError } = await dbAdmin
        .from('translations')
        .delete()
        .eq('translation_key_id', keyId);

      if (deleteTranslationsError) {
        console.error('Database error deleting translations:', deleteTranslationsError);
        return NextResponse.json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to delete associated translations',
            severity: 'high' as const,
          },
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse, { status: 500 });
      }
    }

    // 4. Delete the translation key
    const { error: deleteKeyError } = await dbAdmin
      .from('translation_keys')
      .delete()
      .eq('id', keyId);

    if (deleteKeyError) {
      console.error('Database error deleting translation key:', deleteKeyError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete translation key',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Invalidate cache for the category
    await invalidateTranslationCache([], [translationKey.category]);

    // Log audit event
    await logAuditEvent(req, 'DELETE', 'translation_key', keyId, {
      key: translationKey.key,
      category: translationKey.category,
      translation_count: translationCount,
    }, null);

    return NextResponse.json({
      success: true,
      message: `Translation key '${translationKey.key}' and ${translationCount} associated translations deleted successfully`,
      data: {
        deleted_key: translationKey.key,
        deleted_translations: translationCount,
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in delete translation key API:', error);
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
 * Check if a translation key is critical and should not be deleted
 */
function isCriticalTranslationKey(key: string): boolean {
  const criticalPrefixes = [
    'system.',
    'error.',
    'auth.',
    'navigation.',
    'common.save',
    'common.cancel',
    'common.submit',
    'common.loading',
  ];

  return criticalPrefixes.some(prefix => key.startsWith(prefix));
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

// Export handlers with middleware
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return withMiddleware(
    (req: EnhancedRequest) => handleGetTranslationKey(req, context),
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
    (req: EnhancedRequest) => handleUpdateTranslationKey(req, context),
    {
      requireAuth: true,
      requiredRole: 'manager',
      requiredPermissions: ['translations:update'],
      validation: {
        body: updateTranslationKeySchema,
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
    (req: EnhancedRequest) => handleDeleteTranslationKey(req, context),
    {
      requireAuth: true,
      requiredRole: 'admin',
      requiredPermissions: ['translations:delete'],
      rateLimit: {
        maxRequests: 10,
        windowMinutes: 15,
      },
      audit: true,
    }
  )(request);
}