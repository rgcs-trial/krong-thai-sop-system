/**
 * Restaurants API Route
 * Handles restaurant location CRUD operations
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const CreateRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(255),
  name_th: z.string().min(1, 'Thai restaurant name is required').max(255),
  address: z.string().optional(),
  address_th: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  operational_hours: z.record(z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    closed: z.boolean().optional()
  })).optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').optional(),
  settings: z.record(z.any()).optional()
});

const UpdateRestaurantSchema = CreateRestaurantSchema.partial();

// Logger utility
function logError(context: string, error: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata
  };
  
  console.error(`[RESTAURANTS-ERROR] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logError('SUPABASE_CONFIG', 'Missing environment variables', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });
      
      return NextResponse.json(
        { error: 'Service temporarily unavailable', code: 'SERVICE_DOWN' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            // For GET requests, we don't set cookies
          },
          remove(name, options) {
            // For GET requests, we don't remove cookies
          },
        },
      }
    );
    
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('restaurants')
      .select('id, name, name_th, address, address_th, phone, email, is_active');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (restaurantId) {
      query = query.eq('id', restaurantId);
    }

    const { data: restaurants, error } = await query.order('name');

    if (error) {
      logError('DATABASE_QUERY', error, {
        operation: 'restaurants_fetch',
        restaurantId,
        activeOnly,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        { error: 'Service temporarily unavailable', code: 'SERVICE_DOWN' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurants: restaurants || []
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, {
      operation: 'restaurants_fetch',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_DOWN' },
      { status: 503 }
    );
  }
}