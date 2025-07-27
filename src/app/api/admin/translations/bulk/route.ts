/**
 * Admin Bulk Translation Operations API
 * /api/admin/translations/bulk
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdmin } from '@/lib/supabase/client';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  BulkTranslationOperation,
  BulkTranslationResponse,
  ImportTranslationsRequest,
  ImportTranslationsResponse,
  ExportTranslationsParams,
  ExportTranslationsResponse,
  TranslationStatus,
  Locale,
  isValidLocale,
  isValidTranslationStatus,
} from '@/types/translation';
import { ApiResponse, ValidationError } from '@/types/api';

// Validation schemas
const bulkOperationSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'change_status']),
  items: z.array(z.object({
    id: z.string().optional(),
    key: z.string().optional(),
    locale: z.string().refine(isValidLocale, { message: 'Invalid locale' }).optional(),
    value: z.string().optional(),
    status: z.string().refine(isValidTranslationStatus, { message: 'Invalid status' }).optional(),
    category: z.string().optional(),
  })).min(1).max(100), // Limit bulk operations to 100 items
  change_reason: z.string().max(500).optional(),
});

const importTranslationsSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']),
  data: z.any(),
  merge_strategy: z.enum(['overwrite', 'merge', 'skip_existing']),
  default_status: z.string().refine(isValidTranslationStatus, { message: 'Invalid status' }).optional().default('draft'),
  import_category: z.string().optional(),
});

const exportTranslationsParamsSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']),
  locale: z.string().refine(isValidLocale, { message: 'Invalid locale' }).optional(),
  category: z.string().optional(),
  status: z.string().refine(isValidTranslationStatus, { message: 'Invalid status' }).optional(),
  includeMetadata: z.string().transform(val => val === 'true').optional().default(false),
  includeUsageStats: z.string().transform(val => val === 'true').optional().default(false),
});

/**
 * POST /api/admin/translations/bulk - Execute bulk operations
 */
async function handleBulkOperations(req: EnhancedRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validationResult = bulkOperationSchema.safeParse(body);

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

    const operation = validationResult.data as BulkTranslationOperation;

    let processed = 0;
    let failed = 0;
    const errors: Array<{ item: any; error: string; details?: ValidationError[] }> = [];
    const warnings: string[] = [];
    let cacheUpdates = 0;

    // Process each item based on operation type
    for (const item of operation.items) {
      try {
        switch (operation.operation) {
          case 'create':
            await processBulkCreate(item, req, operation.change_reason);
            break;
          case 'update':
            await processBulkUpdate(item, req, operation.change_reason);
            break;
          case 'delete':
            await processBulkDelete(item, req);
            break;
          case 'change_status':
            await processBulkStatusChange(item, req, operation.change_reason);
            break;
        }
        processed++;
      } catch (error) {
        failed++;
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Invalidate cache for affected items
    const affectedLocales = new Set<string>();
    const affectedCategories = new Set<string>();

    for (const item of operation.items) {
      if (item.locale) affectedLocales.add(item.locale);
      if (item.category) affectedCategories.add(item.category);
    }

    if (affectedLocales.size > 0) {
      await invalidateTranslationCache(Array.from(affectedLocales), Array.from(affectedCategories));
      cacheUpdates = affectedLocales.size;
    }

    // Log bulk audit event
    await logBulkAuditEvent(req, operation.operation, operation.items.length, processed, failed);

    const response: BulkTranslationResponse = {
      success: failed === 0,
      processed,
      failed,
      errors,
      warnings,
      cache_updates: cacheUpdates,
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<BulkTranslationResponse>, { 
      status: failed > 0 ? 207 : 200 // 207 Multi-Status if there were failures
    });

  } catch (error) {
    console.error('Unexpected error in bulk operations API:', error);
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
 * Process bulk create operation
 */
async function processBulkCreate(item: any, req: EnhancedRequest, changeReason?: string): Promise<void> {
  if (!item.key || !item.value || !item.locale) {
    throw new Error('Missing required fields: key, value, locale');
  }

  // Check if translation key exists
  let { data: translationKey, error: keyError } = await dbAdmin
    .from('translation_keys')
    .select('id')
    .eq('key', item.key)
    .single();

  // Create translation key if it doesn't exist
  if (keyError && keyError.code === 'PGRST116') {
    const { data: newKey, error: createKeyError } = await dbAdmin
      .from('translation_keys')
      .insert({
        key: item.key,
        category: item.category || 'general',
        interpolation_vars: [],
      })
      .select('id')
      .single();

    if (createKeyError || !newKey) {
      throw new Error(`Failed to create translation key: ${createKeyError?.message}`);
    }

    translationKey = newKey;
  } else if (keyError) {
    throw new Error(`Database error: ${keyError.message}`);
  }

  // Create translation
  const { error: translationError } = await dbAdmin
    .from('translations')
    .insert({
      translation_key_id: translationKey!.id,
      locale: item.locale,
      value: item.value,
      status: item.status || 'draft',
      created_by: req.auth?.user.id,
      updated_by: req.auth?.user.id,
    });

  if (translationError) {
    throw new Error(`Failed to create translation: ${translationError.message}`);
  }
}

/**
 * Process bulk update operation
 */
async function processBulkUpdate(item: any, req: EnhancedRequest, changeReason?: string): Promise<void> {
  if (!item.id) {
    throw new Error('Missing translation ID');
  }

  const updateData: any = {
    updated_by: req.auth?.user.id,
    updated_at: new Date().toISOString(),
  };

  if (item.value) updateData.value = item.value;
  if (item.status) updateData.status = item.status;

  const { error } = await dbAdmin
    .from('translations')
    .update(updateData)
    .eq('id', item.id);

  if (error) {
    throw new Error(`Failed to update translation: ${error.message}`);
  }

  // Record history if there was a reason provided
  if (changeReason) {
    await dbAdmin
      .from('translation_history')
      .insert({
        translation_id: item.id,
        field_name: 'bulk_update',
        old_value: null,
        new_value: JSON.stringify(item),
        changed_by: req.auth?.user.id,
        change_reason: changeReason,
      });
  }
}

/**
 * Process bulk delete operation
 */
async function processBulkDelete(item: any, req: EnhancedRequest): Promise<void> {
  if (!item.id) {
    throw new Error('Missing translation ID');
  }

  const { error } = await dbAdmin
    .from('translations')
    .delete()
    .eq('id', item.id);

  if (error) {
    throw new Error(`Failed to delete translation: ${error.message}`);
  }
}

/**
 * Process bulk status change operation
 */
async function processBulkStatusChange(item: any, req: EnhancedRequest, changeReason?: string): Promise<void> {
  if (!item.id || !item.status) {
    throw new Error('Missing translation ID or status');
  }

  const { error } = await dbAdmin
    .from('translations')
    .update({
      status: item.status,
      updated_by: req.auth?.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', item.id);

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }

  // Record history
  await dbAdmin
    .from('translation_history')
    .insert({
      translation_id: item.id,
      field_name: 'status',
      old_value: null, // We'd need to fetch this first for accuracy
      new_value: item.status,
      changed_by: req.auth?.user.id,
      change_reason: changeReason,
    });
}

/**
 * GET /api/admin/translations/bulk - Export translations
 */
async function handleExportTranslations(req: EnhancedRequest): Promise<NextResponse> {
  try {
    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = exportTranslationsParamsSchema.safeParse(queryParams);

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

    const params = validationResult.data as ExportTranslationsParams;

    // Build query based on parameters
    let query = dbAdmin
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
          updated_at
        )
      `);

    if (params.category) {
      query = query.eq('category', params.category);
    }

    const { data: translationKeys, error } = await query;

    if (error) {
      console.error('Database error fetching translations for export:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch translations for export',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Filter and format data based on parameters
    const exportData = translationKeys?.map(key => {
      let translations = key.translations || [];

      // Filter by locale and status
      if (params.locale) {
        translations = translations.filter((t: any) => t.locale === params.locale);
      }
      if (params.status) {
        translations = translations.filter((t: any) => t.status === params.status);
      }

      return {
        key: key.key,
        category: key.category,
        description: params.includeMetadata ? key.description : undefined,
        interpolation_vars: params.includeMetadata ? key.interpolation_vars : undefined,
        context: params.includeMetadata ? key.context : undefined,
        translations: translations.map((t: any) => ({
          locale: t.locale,
          value: t.value,
          status: t.status,
          created_at: params.includeMetadata ? t.created_at : undefined,
          updated_at: params.includeMetadata ? t.updated_at : undefined,
        })),
        created_at: params.includeMetadata ? key.created_at : undefined,
        updated_at: params.includeMetadata ? key.updated_at : undefined,
      };
    }) || [];

    // Generate download URL (simplified for demo)
    const filename = `translations_${params.format}_${Date.now()}.${params.format}`;
    const downloadUrl = `/api/admin/translations/download/${filename}`;

    // In a real implementation, you would:
    // 1. Generate the actual file in the requested format
    // 2. Store it temporarily in a file storage service
    // 3. Return a signed download URL

    const response: ExportTranslationsResponse = {
      filename,
      download_url: downloadUrl,
      format: params.format,
      total_records: exportData.length,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<ExportTranslationsResponse>, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in export translations API:', error);
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

    await query;
  } catch (error) {
    console.error('Error invalidating translation cache:', error);
  }
}

/**
 * Log bulk audit event
 */
async function logBulkAuditEvent(
  req: EnhancedRequest,
  operation: string,
  totalItems: number,
  processed: number,
  failed: number
): Promise<void> {
  try {
    if (!req.auth) return;

    await dbAdmin.from('audit_logs').insert({
      restaurant_id: req.auth.restaurantId,
      user_id: req.auth.user.id,
      action: `BULK_${operation.toUpperCase()}`,
      resource_type: 'translation',
      resource_id: null,
      new_values: {
        operation,
        total_items: totalItems,
        processed,
        failed,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });
  } catch (error) {
    console.error('Error logging bulk audit event:', error);
  }
}

// Export handlers with middleware
export const POST = withMiddleware(handleBulkOperations, {
  requireAuth: true,
  requiredRole: 'manager',
  requiredPermissions: ['translations:bulk'],
  validation: {
    body: bulkOperationSchema,
  },
  rateLimit: {
    maxRequests: 10,
    windowMinutes: 15,
  },
  audit: true,
});

export const GET = withMiddleware(handleExportTranslations, {
  requireAuth: true,
  requiredRole: 'manager',
  requiredPermissions: ['translations:export'],
  rateLimit: {
    maxRequests: 5,
    windowMinutes: 15,
  },
  audit: true,
});