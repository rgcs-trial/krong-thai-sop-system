/**
 * Translation Usage Tracking API
 * POST /api/translations/usage
 * Restaurant Krong Thai SOP Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { 
  TrackTranslationUsageRequest, 
  TrackTranslationUsageResponse, 
  Locale, 
  isValidLocale 
} from '@/types/translation';
import { ApiResponse } from '@/types/api';

// Request body validation schema
const trackUsageRequestSchema = z.object({
  keys: z.array(z.string()).min(1).max(100), // Limit to 100 keys per request
  locale: z.string().refine(isValidLocale, { message: 'Invalid locale' }),
  context: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

/**
 * Track translation usage for analytics
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          severity: 'medium' as const,
        },
        requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    const validationResult = trackUsageRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.errors,
          severity: 'medium' as const,
        },
        requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { status: 400 });
    }

    const trackingRequest = validationResult.data as TrackTranslationUsageRequest;

    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          severity: 'medium' as const,
        },
        requestId,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse, { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      });
    }

    // Generate session ID if not provided
    const sessionId = trackingRequest.sessionId || generateSessionId(clientIP, request.headers.get('user-agent') || '');

    // Track usage for each key
    const trackingPromises = trackingRequest.keys.map(key => 
      trackKeyUsage(key, trackingRequest.locale, {
        context: trackingRequest.context,
        sessionId,
        userId: trackingRequest.userId,
        clientIP,
        userAgent: request.headers.get('user-agent'),
        metadata: trackingRequest.metadata,
        requestId,
      })
    );

    const trackingResults = await Promise.allSettled(trackingPromises);
    
    // Count successful tracking operations
    const successful = trackingResults.filter(result => result.status === 'fulfilled').length;
    const failed = trackingResults.length - successful;

    if (failed > 0) {
      console.warn(`Failed to track ${failed} out of ${trackingResults.length} translation keys`, {
        requestId,
        keys: trackingRequest.keys,
        locale: trackingRequest.locale,
      });
    }

    // Prepare response
    const response: TrackTranslationUsageResponse = {
      tracked: successful,
      sessionId,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: response,
      requestId,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<TrackTranslationUsageResponse>, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining - 1),
        'X-RateLimit-Reset': String(rateLimitResult.resetTime),
      },
    });

  } catch (error) {
    console.error('Unexpected error in translation usage API:', error);
    
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
 * Track usage for a single translation key
 */
async function trackKeyUsage(
  key: string, 
  locale: Locale, 
  options: {
    context?: string;
    sessionId: string;
    userId?: string;
    clientIP: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    requestId: string;
  }
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    // First, try to get the translation key ID
    const { data: translationKey, error: keyError } = await supabase
      .from('translation_keys')
      .select('id')
      .eq('key', key)
      .single();

    if (keyError || !translationKey) {
      // Track as missing translation
      await supabase
        .from('translation_analytics')
        .insert({
          translation_key: key,
          translation_key_id: null,
          locale,
          usage_count: 1,
          missing_count: 1,
          last_accessed: timestamp,
          session_id: options.sessionId,
          user_id: options.userId,
          context: options.context,
          client_ip: options.clientIP,
          user_agent: options.userAgent,
          request_id: options.requestId,
          metadata: options.metadata,
        });
      return;
    }

    // Track existing translation usage
    await supabase
      .from('translation_analytics')
      .upsert({
        translation_key: key,
        translation_key_id: translationKey.id,
        locale,
        usage_count: 1,
        last_accessed: timestamp,
        session_id: options.sessionId,
        user_id: options.userId,
        context: options.context,
        client_ip: options.clientIP,
        user_agent: options.userAgent,
        request_id: options.requestId,
        metadata: options.metadata,
      }, {
        onConflict: 'translation_key_id,locale,session_id',
        count: 'usage_count',
      });

    // Also track daily aggregation
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('translation_daily_stats')
      .upsert({
        translation_key_id: translationKey.id,
        locale,
        date: today,
        usage_count: 1,
        unique_sessions: 1,
      }, {
        onConflict: 'translation_key_id,locale,date',
        count: 'usage_count',
      });

  } catch (error) {
    console.error('Error tracking key usage:', error);
    throw error;
  }
}

/**
 * Generate a consistent session ID
 */
function generateSessionId(clientIP: string, userAgent: string): string {
  const timestamp = Math.floor(Date.now() / (1000 * 60 * 30)); // 30-minute buckets
  const combined = `${clientIP}:${userAgent}:${timestamp}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `session_${Math.abs(hash).toString(36)}`;
}

/**
 * Rate limiting implementation
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(clientIP: string): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  resetTime: number;
}> {
  const now = Date.now();
  const windowStart = Math.floor(now / (RATE_LIMIT_WINDOW * 1000)) * (RATE_LIMIT_WINDOW * 1000);
  const resetTime = windowStart + (RATE_LIMIT_WINDOW * 1000);
  
  const key = `${clientIP}:${windowStart}`;
  const current = rateLimitStore.get(key) || { count: 0, resetTime };
  
  // Clean up old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime <= now) {
      rateLimitStore.delete(k);
    }
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  const allowed = current.count <= RATE_LIMIT_MAX_REQUESTS;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count);
  const retryAfter = Math.ceil((resetTime - now) / 1000);
  
  return {
    allowed,
    remaining,
    retryAfter,
    resetTime: Math.floor(resetTime / 1000),
  };
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}