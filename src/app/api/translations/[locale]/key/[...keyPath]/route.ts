/**
 * Public Translation API - Get specific translation with interpolation support
 * GET /api/translations/[locale]/key/[...keyPath]
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { 
  GetTranslationByKeyParams, 
  GetTranslationByKeyResponse, 
  Locale, 
  isValidLocale 
} from '@/types/translation';
import { ApiResponse } from '@/types/api';

// Query parameters validation schema
const getTranslationParamsSchema = z.object({
  interpolation: z.string().optional().transform(val => {
    if (!val) return undefined;
    try {
      return JSON.parse(val) as Record<string, string | number>;
    } catch {
      return undefined;
    }
  }),
  fallbackLocale: z.enum(['en', 'fr']).optional(),
  context: z.string().optional(),
});

/**
 * Get specific translation by key with interpolation support
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string; keyPath: string[] } }
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

    // Reconstruct the key path
    const key = params.keyPath.join('.');
    
    if (!key) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_KEY',
          message: 'Translation key is required',
          severity: 'medium' as const,
        },
        requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = getTranslationParamsSchema.safeParse(queryParams);

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

    // First, try to get the translation in the requested locale
    let translationResult = await getTranslationByKey(key, locale, params_validated.context);
    let fallbackUsed = false;

    // If not found and fallback locale is specified, try fallback
    if (!translationResult && params_validated.fallbackLocale && params_validated.fallbackLocale !== locale) {
      translationResult = await getTranslationByKey(key, params_validated.fallbackLocale, params_validated.context);
      fallbackUsed = !!translationResult;
    }

    // If still not found, return 404
    if (!translationResult) {
      // Track missing translation
      await trackMissingTranslation(key, locale, requestId);
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'TRANSLATION_NOT_FOUND',
          message: `Translation not found for key: ${key}`,
          details: { key, locale, fallbackLocale: params_validated.fallbackLocale },
          severity: 'low' as const,
        },
        requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 404 });
    }

    // Apply interpolation if provided
    let finalValue = translationResult.translation.value;
    let interpolated = false;

    if (params_validated.interpolation && Object.keys(params_validated.interpolation).length > 0) {
      const interpolationResult = interpolateMessage(
        finalValue, 
        params_validated.interpolation,
        translationResult.translationKey.interpolation_vars
      );
      
      if (interpolationResult.success) {
        finalValue = interpolationResult.value;
        interpolated = true;
      } else {
        // Log interpolation errors but still return the non-interpolated value
        console.warn('Interpolation failed:', {
          key,
          locale,
          errors: interpolationResult.errors,
          requestId,
        });
      }
    }

    // Prepare response
    const response: GetTranslationByKeyResponse = {
      key,
      value: finalValue,
      locale: fallbackUsed ? params_validated.fallbackLocale! : locale,
      interpolated,
      fallbackUsed,
      metadata: {
        category: translationResult.translationKey.category,
        description: translationResult.translationKey.description,
        interpolation_vars: translationResult.translationKey.interpolation_vars,
        context: translationResult.translationKey.context,
      },
    };

    // Track usage analytics
    await trackTranslationKeyUsage(key, locale, interpolated, fallbackUsed, requestId);

    return NextResponse.json({
      success: true,
      data: response,
      requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<GetTranslationByKeyResponse>, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Vary': 'Accept-Language',
      },
    });

  } catch (error) {
    console.error('Unexpected error in translation key API:', error);
    
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
 * Get translation by key from database
 */
async function getTranslationByKey(
  key: string, 
  locale: Locale, 
  context?: string
): Promise<{
  translationKey: any;
  translation: any;
} | null> {
  try {
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
      .eq('key', key)
      .eq('translations.locale', locale)
      .eq('translations.status', 'published');

    // Apply context filter if provided
    if (context) {
      query = query.eq('context', context);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    // Find the translation for the specified locale
    const translation = data.translations?.find(
      (t: any) => t.locale === locale && t.status === 'published'
    );

    if (!translation) {
      return null;
    }

    return {
      translationKey: data,
      translation,
    };
  } catch (error) {
    console.error('Database error fetching translation by key:', error);
    return null;
  }
}

/**
 * Interpolate message with variables using ICU-like format
 */
function interpolateMessage(
  message: string, 
  variables: Record<string, string | number>,
  expectedVars: string[]
): { success: boolean; value: string; errors: string[] } {
  const errors: string[] = [];
  let result = message;

  try {
    // Simple interpolation for {variable} patterns
    result = message.replace(/\{([^}]+)\}/g, (match, varName) => {
      const trimmedVarName = varName.trim();
      
      if (variables.hasOwnProperty(trimmedVarName)) {
        return String(variables[trimmedVarName]);
      } else {
        errors.push(`Missing variable: ${trimmedVarName}`);
        return match; // Keep original placeholder
      }
    });

    // Check for unexpected variables
    for (const varName of Object.keys(variables)) {
      if (!expectedVars.includes(varName)) {
        errors.push(`Unexpected variable: ${varName}`);
      }
    }

    // Advanced ICU format support (pluralization, selection)
    result = handlePluralRules(result, variables);
    result = handleSelectRules(result, variables);

    return {
      success: errors.length === 0,
      value: result,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      value: message,
      errors: [`Interpolation error: ${error}`],
    };
  }
}

/**
 * Handle plural rules in ICU format
 * Example: {count, plural, =0 {no items} =1 {one item} other {# items}}
 */
function handlePluralRules(message: string, variables: Record<string, string | number>): string {
  const pluralRegex = /\{(\w+),\s*plural,\s*([^}]+)\}/g;
  
  return message.replace(pluralRegex, (match, varName, rules) => {
    const count = Number(variables[varName]);
    if (isNaN(count)) return match;

    // Parse plural rules
    const ruleMatches = rules.match(/(=\d+|zero|one|two|few|many|other)\s*\{([^}]*)\}/g);
    if (!ruleMatches) return match;

    // Find matching rule
    for (const ruleMatch of ruleMatches) {
      const ruleRegex = /(=\d+|zero|one|two|few|many|other)\s*\{([^}]*)\}/;
      const ruleResult = ruleMatch.match(ruleRegex);
      if (!ruleResult) continue;

      const [, condition, text] = ruleResult;
      
      if (condition.startsWith('=')) {
        const exactNumber = parseInt(condition.substring(1));
        if (count === exactNumber) {
          return text.replace('#', String(count));
        }
      } else if (condition === 'other') {
        return text.replace('#', String(count));
      } else if (condition === 'one' && count === 1) {
        return text.replace('#', String(count));
      }
    }

    return match;
  });
}

/**
 * Handle select rules in ICU format
 * Example: {gender, select, male {he} female {she} other {they}}
 */
function handleSelectRules(message: string, variables: Record<string, string | number>): string {
  const selectRegex = /\{(\w+),\s*select,\s*([^}]+)\}/g;
  
  return message.replace(selectRegex, (match, varName, rules) => {
    const value = String(variables[varName]);
    if (!value) return match;

    // Parse select rules
    const ruleMatches = rules.match(/(\w+)\s*\{([^}]*)\}/g);
    if (!ruleMatches) return match;

    // Find matching rule
    for (const ruleMatch of ruleMatches) {
      const ruleRegex = /(\w+)\s*\{([^}]*)\}/;
      const ruleResult = ruleMatch.match(ruleRegex);
      if (!ruleResult) continue;

      const [, condition, text] = ruleResult;
      
      if (condition === value || condition === 'other') {
        return text;
      }
    }

    return match;
  });
}

/**
 * Track missing translation for analytics
 */
async function trackMissingTranslation(key: string, locale: Locale, requestId: string): Promise<void> {
  try {
    await supabase
      .from('translation_analytics')
      .upsert({
        translation_key: key,
        locale,
        missing_count: 1,
        last_missing_access: new Date().toISOString(),
        request_id: requestId,
      }, {
        onConflict: 'translation_key,locale',
        count: 'missing_count',
      });
  } catch (error) {
    console.error('Missing translation tracking error:', error);
    // Don't fail the request if analytics fail
  }
}

/**
 * Track translation key usage for analytics
 */
async function trackTranslationKeyUsage(
  key: string, 
  locale: Locale, 
  interpolated: boolean, 
  fallbackUsed: boolean, 
  requestId: string
): Promise<void> {
  try {
    await supabase
      .from('translation_analytics')
      .upsert({
        translation_key: key,
        locale,
        usage_count: 1,
        interpolated_count: interpolated ? 1 : 0,
        fallback_count: fallbackUsed ? 1 : 0,
        last_accessed: new Date().toISOString(),
        request_id: requestId,
      }, {
        onConflict: 'translation_key,locale',
        count: 'usage_count',
      });
  } catch (error) {
    console.error('Usage analytics tracking error:', error);
    // Don't fail the request if analytics fail
  }
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