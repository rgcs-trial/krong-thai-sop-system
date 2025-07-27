/**
 * Admin Translation Keys Management API
 * /api/admin/translation-keys
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdmin } from '@/lib/supabase/client';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  TranslationKey,
  TranslationKeyInsert,
  UpdateTranslationKeyRequest,
  UpdateTranslationKeyResponse,
} from '@/types/translation';
import { ApiResponse, PaginatedApiResponse } from '@/types/api';

// Validation schemas
const listTranslationKeysParamsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 100) : 20),
  category: z.string().optional(),
  search: z.string().optional(),
  hasTranslations: z.string().optional().transform(val => val === 'true'),
  sortBy: z.enum(['key', 'category', 'created_at', 'updated_at']).optional().default('key'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

const createTranslationKeySchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, { message: 'Invalid key format' }),
  category: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  interpolation_vars: z.array(z.string()).optional().default([]),
  context: z.string().max(255).optional(),
});

const updateTranslationKeySchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, { message: 'Invalid key format' }).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  interpolation_vars: z.array(z.string()).optional(),
  context: z.string().max(255).optional(),
});

/**
 * GET /api/admin/translation-keys - List translation keys with filtering and pagination
 */
async function handleGetTranslationKeys(req: EnhancedRequest): Promise<NextResponse> {
  try {
    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = listTranslationKeysParamsSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validationResult.error.errors,
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    const params = validationResult.data;

    // Build the base query
    let countQuery = dbAdmin
      .from('translation_keys')
      .select('id', { count: 'exact', head: true });

    let dataQuery = dbAdmin
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
        translations(count)
      `);

    // Apply filters
    if (params.category) {
      countQuery = countQuery.eq('category', params.category);
      dataQuery = dataQuery.eq('category', params.category);
    }

    if (params.search) {
      const searchPattern = `%${params.search}%`;
      countQuery = countQuery.or(`key.ilike.${searchPattern},description.ilike.${searchPattern}`);
      dataQuery = dataQuery.or(`key.ilike.${searchPattern},description.ilike.${searchPattern}`);
    }

    // Apply sorting
    dataQuery = dataQuery.order(params.sortBy, { ascending: params.sortOrder === 'asc' });

    // Apply pagination
    const offset = (params.page - 1) * params.limit;
    dataQuery = dataQuery.range(offset, offset + params.limit - 1);

    // Execute queries
    const [{ count, error: countError }, { data: translationKeys, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError || dataError) {
      console.error('Database error fetching translation keys:', countError || dataError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch translation keys',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Transform data and filter by hasTranslations if specified
    let items = (translationKeys || []).map(key => ({
      ...key,
      translation_count: key.translations?.[0]?.count || 0,
    }));

    if (params.hasTranslations !== undefined) {
      items = items.filter(item => 
        params.hasTranslations ? item.translation_count > 0 : item.translation_count === 0
      );
    }

    // Calculate summary statistics
    const categoryBreakdown = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalPages = Math.ceil((count || 0) / params.limit);
    const response: PaginatedApiResponse<typeof items[0]> = {
      success: true,
      data: items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: count || 0,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      },
      summary: {
        totalKeys: count || 0,
        categoryBreakdown,
        keysWithTranslations: items.filter(item => item.translation_count > 0).length,
        keysWithoutTranslations: items.filter(item => item.translation_count === 0).length,
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in list translation keys API:', error);
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
 * POST /api/admin/translation-keys - Create new translation key
 */
async function handleCreateTranslationKey(req: EnhancedRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validationResult = createTranslationKeySchema.safeParse(body);

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

    const createRequest = validationResult.data as TranslationKeyInsert;

    // Check if key already exists
    const { data: existingKey, error: checkError } = await dbAdmin
      .from('translation_keys')
      .select('id')
      .eq('key', createRequest.key)
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
          message: `Translation key '${createRequest.key}' already exists`,
          severity: 'medium' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 409 });
    }

    // Create translation key
    const { data: translationKey, error: createError } = await dbAdmin
      .from('translation_keys')
      .insert(createRequest)
      .select()
      .single();

    if (createError || !translationKey) {
      console.error('Database error creating translation key:', createError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create translation key',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Log audit event
    await logAuditEvent(req, 'CREATE', 'translation_key', translationKey.id, null, createRequest);

    return NextResponse.json({
      success: true,
      data: translationKey,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<TranslationKey>, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in create translation key API:', error);
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
  keyId: string
): Promise<NextResponse> {
  try {
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
  keyId: string
): Promise<NextResponse> {
  try {
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

    // Delete all translations first (due to foreign key constraints)
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

    // Delete the translation key
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
 * Invalidate translation cache
 */
async function invalidateTranslationCache(locales: string[], categories: string[]): Promise<void> {
  try {
    let query = dbAdmin.from('translation_cache').delete();

    if (locales.length > 0) {
      query = query.in('locale', locales);
    }

    // Note: Current cache table structure doesn't include category filtering
    // This would need to be enhanced to support category-based invalidation
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
export const GET = withMiddleware(handleGetTranslationKeys, {
  requireAuth: true,
  requiredRole: 'manager',
  requiredPermissions: ['translations:read'],
  rateLimit: {
    maxRequests: 100,
    windowMinutes: 15,
  },
  audit: true,
});

export const POST = withMiddleware(handleCreateTranslationKey, {
  requireAuth: true,
  requiredRole: 'manager',
  requiredPermissions: ['translations:create'],
  validation: {
    body: createTranslationKeySchema,
  },
  rateLimit: {
    maxRequests: 20,
    windowMinutes: 15,
  },
  audit: true,
});