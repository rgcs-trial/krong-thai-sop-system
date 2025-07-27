/**
 * Public Translation API - Get all published translations for a locale
 * GET /api/translations/[locale]
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { 
  GetTranslationsParams, 
  GetTranslationsResponse, 
  Locale, 
  isValidLocale,
  TranslationCache
} from '@/types/translation';
import { ApiResponse } from '@/types/api';

// Query parameters validation schema
const getTranslationsParamsSchema = z.object({
  keys: z.string().optional().transform(val => val ? val.split(',') : undefined),
  category: z.string().optional(),
  includeContext: z.string().optional().transform(val => val === 'true'),
  version: z.string().optional(),
});

// Cache configuration
const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_VERSION = '1.0.0';

/**
 * Get all published translations for a locale
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Validate locale parameter
    const locale = params.locale;
    if (!isValidLocale(locale)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_LOCALE',
          message: `Invalid locale: ${locale}. Supported locales: en, fr`,
          severity: 'medium' as const,
        },
        requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = getTranslationsParamsSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          details: validationResult.error.errors,
          severity: 'medium' as const,
        },
        requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    const params_validated = validationResult.data;

    // Check cache first
    const cacheKey = generateCacheKey(locale, params_validated);
    const cachedResult = await getCachedTranslations(cacheKey);
    
    if (cachedResult) {
      // Update analytics for cached result
      await trackCacheHit(locale, params_validated.keys || []);
      
      return NextResponse.json(cachedResult, {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'X-Cache-Status': 'HIT',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      });
    }

    // Build database query
    let query = supabase
      .from('translation_keys')
      .select(`
        id,
        key,
        category,
        description,
        interpolation_vars,
        context,
        translations!inner(
          id,
          locale,
          value,
          status,
          updated_at
        )
      `)
      .eq('translations.locale', locale)
      .eq('translations.status', 'published');

    // Apply filters
    if (params_validated.keys && params_validated.keys.length > 0) {
      query = query.in('key', params_validated.keys);
    }

    if (params_validated.category) {
      query = query.eq('category', params_validated.category);
    }

    // Execute query
    const { data: translationKeys, error } = await query;

    if (error) {
      console.error('Database error fetching translations:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch translations',
          severity: 'high' as const,
        },
        requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 500 });
    }

    // Transform data into the expected format
    const translations: Record<string, string> = {};
    let lastUpdated = new Date(0);

    for (const translationKey of translationKeys || []) {
      // Find the translation for this locale
      const translation = translationKey.translations?.find(
        (t: any) => t.locale === locale && t.status === 'published'
      );

      if (translation) {
        translations[translationKey.key] = translation.value;
        
        // Track latest update time
        const updatedAt = new Date(translation.updated_at);
        if (updatedAt > lastUpdated) {
          lastUpdated = updatedAt;
        }
      }
    }

    // Prepare response
    const response: GetTranslationsResponse = {
      locale,
      translations,
      metadata: {
        version: params_validated.version || CACHE_VERSION,
        lastUpdated: lastUpdated.toISOString(),
        cachedAt: new Date().toISOString(),
        locale,
        totalKeys: Object.keys(translations).length,
      },
    };

    // Cache the result
    await cacheTranslations(cacheKey, response);

    // Track analytics
    await trackTranslationUsage(locale, Object.keys(translations), requestId);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-Cache-Status': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        'ETag': `"${generateETag(response)}"`,
      },
    });

  } catch (error) {
    console.error('Unexpected error in translations API:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        severity: 'high' as const,
      },
      requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse, { status: 500 });
  }
}

/**
 * Generate cache key for translation requests
 */
function generateCacheKey(locale: Locale, params: GetTranslationsParams): string {
  const keyParts = [
    `locale:${locale}`,
    params.keys ? `keys:${params.keys.sort().join(',')}` : 'keys:all',
    params.category ? `category:${params.category}` : '',
    params.includeContext ? 'context:true' : '',
    `version:${params.version || CACHE_VERSION}`,
  ].filter(Boolean);

  return `translations:${keyParts.join(':')}`;
}

/**
 * Get cached translations
 */
async function getCachedTranslations(cacheKey: string): Promise<GetTranslationsResponse | null> {
  try {
    const { data: cached, error } = await supabase
      .from('translation_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !cached) {
      return null;
    }

    return JSON.parse(cached.cached_data) as GetTranslationsResponse;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
}

/**
 * Cache translations result
 */
async function cacheTranslations(cacheKey: string, data: GetTranslationsResponse): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);
    
    await supabase
      .from('translation_cache')
      .upsert({
        cache_key: cacheKey,
        locale: data.locale,
        cached_data: JSON.stringify(data),
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        version: data.metadata.version,
      });
  } catch (error) {
    console.error('Cache storage error:', error);
    // Don't fail the request if caching fails
  }
}

/**
 * Track cache hit for analytics
 */
async function trackCacheHit(locale: Locale, keys: string[]): Promise<void> {
  try {
    // Update cache hit analytics
    for (const key of keys) {
      await supabase
        .from('translation_analytics')
        .upsert({
          translation_key: key,
          locale,
          cache_hits: 1,
          last_cache_hit: new Date().toISOString(),
        }, {
          onConflict: 'translation_key,locale',
          count: 'cache_hits',
        });
    }
  } catch (error) {
    console.error('Cache analytics tracking error:', error);
    // Don't fail the request if analytics fail
  }
}

/**
 * Track translation usage for analytics
 */
async function trackTranslationUsage(locale: Locale, keys: string[], requestId: string): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    // Batch insert analytics records
    const analyticsRecords = keys.map(key => ({
      translation_key: key,
      locale,
      usage_count: 1,
      last_accessed: timestamp,
      request_id: requestId,
    }));

    if (analyticsRecords.length > 0) {
      await supabase
        .from('translation_analytics')
        .upsert(analyticsRecords, {
          onConflict: 'translation_key,locale',
          count: 'usage_count',
        });
    }
  } catch (error) {
    console.error('Usage analytics tracking error:', error);
    // Don't fail the request if analytics fail
  }
}

/**
 * Generate ETag for response caching
 */
function generateETag(response: GetTranslationsResponse): string {
  const content = JSON.stringify({
    keys: Object.keys(response.translations).sort(),
    lastUpdated: response.metadata.lastUpdated,
    version: response.metadata.version,
  });
  
  return Buffer.from(content).toString('base64').substring(0, 32);
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}