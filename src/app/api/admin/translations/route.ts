/**
 * Admin Translation Management API
 * /api/admin/translations
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdmin } from '@/lib/supabase/client';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  ListTranslationsParams,
  ListTranslationsResponse,
  CreateTranslationRequest,
  CreateTranslationResponse,
  TranslationListItem,
  TranslationStatus,
  Locale,
  isValidLocale,
  isValidTranslationStatus,
} from '@/types/translation';
import { ApiResponse, PaginatedApiResponse } from '@/types/api';

// Validation schemas
const listTranslationsParamsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 100) : 20),
  locale: z.string().optional().refine(val => !val || isValidLocale(val), { message: 'Invalid locale' }),
  status: z.string().optional().refine(val => !val || isValidTranslationStatus(val), { message: 'Invalid status' }),
  category: z.string().optional(),
  search: z.string().optional(),
  keyFilter: z.string().optional(),
  sortBy: z.enum(['key', 'value', 'updated_at', 'status', 'category']).optional().default('key'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  includeUnused: z.string().optional().transform(val => val === 'true'),
  modifiedSince: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: 'Invalid date' }),
});

const createTranslationRequestSchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, { message: 'Invalid key format' }),
  category: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  interpolation_vars: z.array(z.string()).optional().default([]),
  context: z.string().max(255).optional(),
  translations: z.array(z.object({
    locale: z.string().refine(isValidLocale, { message: 'Invalid locale' }),
    value: z.string().min(1),
    status: z.string().refine(isValidTranslationStatus, { message: 'Invalid status' }).optional().default('draft'),
  })).min(1),
});

/**
 * GET /api/admin/translations - List translations with filtering and pagination
 */
async function handleGetTranslations(req: EnhancedRequest): Promise<NextResponse> {
  try {
    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = listTranslationsParamsSchema.safeParse(queryParams);

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
        translations(
          id,
          locale,
          value,
          status,
          updated_at
        )
      `);

    // Apply filters
    if (params.category) {
      countQuery = countQuery.eq('category', params.category);
      dataQuery = dataQuery.eq('category', params.category);
    }

    if (params.search) {
      countQuery = countQuery.or(`key.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      dataQuery = dataQuery.or(`key.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    if (params.keyFilter) {
      countQuery = countQuery.ilike('key', `%${params.keyFilter}%`);
      dataQuery = dataQuery.ilike('key', `%${params.keyFilter}%`);
    }

    if (params.modifiedSince) {
      countQuery = countQuery.gte('updated_at', params.modifiedSince);
      dataQuery = dataQuery.gte('updated_at', params.modifiedSince);
    }

    // Apply sorting
    const sortColumn = params.sortBy === 'value' ? 'key' : params.sortBy; // Can't sort by value directly
    dataQuery = dataQuery.order(sortColumn, { ascending: params.sortOrder === 'asc' });

    // Apply pagination
    const offset = (params.page - 1) * params.limit;
    dataQuery = dataQuery.range(offset, offset + params.limit - 1);

    // Execute queries
    const [{ count, error: countError }, { data: translationKeys, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError || dataError) {
      console.error('Database error fetching translations:', countError || dataError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch translations',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Transform data
    const items: TranslationListItem[] = await Promise.all(
      (translationKeys || []).map(async (key) => {
        // Filter translations by locale if specified
        let translations = key.translations || [];
        if (params.locale) {
          translations = translations.filter((t: any) => t.locale === params.locale);
        }

        // Filter by status if specified
        if (params.status) {
          translations = translations.filter((t: any) => t.status === params.status);
        }

        // Get usage statistics
        const { data: analytics } = await dbAdmin
          .from('translation_analytics')
          .select('usage_count, last_accessed')
          .eq('translation_key_id', key.id)
          .single();

        return {
          id: key.id,
          key: key.key,
          category: key.category,
          description: key.description,
          translations: translations.map((t: any) => ({
            locale: t.locale,
            value: t.value,
            status: t.status,
            updated_at: t.updated_at,
          })),
          interpolation_vars: key.interpolation_vars || [],
          context: key.context,
          usage_count: analytics?.usage_count || 0,
          last_used: analytics?.last_accessed || null,
          created_at: key.created_at,
          updated_at: key.updated_at,
        };
      })
    );

    // Calculate summary statistics
    const allTranslations = items.flatMap(item => item.translations);
    const statusBreakdown = allTranslations.reduce((acc, t) => {
      acc[t.status as TranslationStatus] = (acc[t.status as TranslationStatus] || 0) + 1;
      return acc;
    }, {} as Record<TranslationStatus, number>);

    const localeBreakdown = allTranslations.reduce((acc, t) => {
      acc[t.locale as Locale] = (acc[t.locale as Locale] || 0) + 1;
      return acc;
    }, {} as Record<Locale, number>);

    const categoryBreakdown = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Prepare response
    const totalPages = Math.ceil((count || 0) / params.limit);
    const response: ListTranslationsResponse = {
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
        totalTranslations: allTranslations.length,
        statusBreakdown,
        localeBreakdown,
        categoryBreakdown,
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in list translations API:', error);
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
 * POST /api/admin/translations - Create new translation key with translations
 */
async function handleCreateTranslation(req: EnhancedRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validationResult = createTranslationRequestSchema.safeParse(body);

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

    const createRequest = validationResult.data as CreateTranslationRequest;

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
    const { data: translationKey, error: keyError } = await dbAdmin
      .from('translation_keys')
      .insert({
        key: createRequest.key,
        category: createRequest.category,
        description: createRequest.description,
        interpolation_vars: createRequest.interpolation_vars,
        context: createRequest.context,
      })
      .select()
      .single();

    if (keyError || !translationKey) {
      console.error('Database error creating translation key:', keyError);
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

    // Create translations
    const translationInserts = createRequest.translations.map(t => ({
      translation_key_id: translationKey.id,
      locale: t.locale as Locale,
      value: t.value,
      status: t.status as TranslationStatus,
      created_by: req.auth?.user.id,
      updated_by: req.auth?.user.id,
    }));

    const { data: translations, error: translationsError } = await dbAdmin
      .from('translations')
      .insert(translationInserts)
      .select();

    if (translationsError) {
      console.error('Database error creating translations:', translationsError);
      
      // Cleanup: delete the translation key if translations failed
      await dbAdmin
        .from('translation_keys')
        .delete()
        .eq('id', translationKey.id);

      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create translations',
          severity: 'high' as const,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Invalidate cache for affected locales
    const affectedLocales = createRequest.translations.map(t => t.locale);
    await invalidateTranslationCache(affectedLocales, [createRequest.category]);

    // Log audit event
    await logAuditEvent(req, 'CREATE', 'translation_key', translationKey.id, null, {
      key: createRequest.key,
      category: createRequest.category,
      translations_count: translations?.length || 0,
    });

    // Prepare response
    const response: CreateTranslationResponse = {
      translation_key: translationKey,
      translations: translations || [],
      created: (translations?.length || 0) + 1, // +1 for the key
      warnings: [],
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<CreateTranslationResponse>, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in create translation API:', error);
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

    // Note: We'd need to enhance the cache table structure to filter by category
    // For now, we'll invalidate all cache entries for the affected locales
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
export const GET = withMiddleware(handleGetTranslations, {
  requireAuth: true,
  requiredRole: 'manager',
  requiredPermissions: ['translations:read'],
  rateLimit: {
    maxRequests: 100,
    windowMinutes: 15,
  },
  audit: true,
});

export const POST = withMiddleware(handleCreateTranslation, {
  requireAuth: true,
  requiredRole: 'manager',
  requiredPermissions: ['translations:create'],
  validation: {
    body: createTranslationRequestSchema,
  },
  rateLimit: {
    maxRequests: 20,
    windowMinutes: 15,
  },
  audit: true,
});