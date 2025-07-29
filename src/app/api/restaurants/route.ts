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
  name: z.string().min(1, 'Restaurant name (English) is required').max(255, 'Restaurant name must be less than 255 characters'),
  name_fr: z.string().min(1, 'Restaurant name (French) is required').max(255, 'French restaurant name must be less than 255 characters'),
  street_address: z.string().optional(),
  street_address_fr: z.string().optional(),
  city: z.string().optional(),
  city_fr: z.string().optional(),
  state_province: z.string().optional(),
  state_province_fr: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format').optional().or(z.literal('')),
  email: z.string().email('Invalid email address format').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Timezone is required'),
  operational_hours: z.record(z.string(), z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
    closed: z.boolean().optional()
  })).optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(1000, 'Capacity cannot exceed 1000').optional(),
  settings: z.record(z.string(), z.any()).optional()
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
    const cookieStore = await cookies();
    
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

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logError('SUPABASE_CONFIG', 'Missing environment variables');
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
            // For POST requests, we don't set cookies
          },
          remove(name, options) {
            // For POST requests, we don't remove cookies
          },
        },
      }
    );

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateRestaurantSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const restaurantData = validationResult.data;

    // Build address from components
    const address = [restaurantData.street_address, restaurantData.city, restaurantData.state_province, restaurantData.postal_code, restaurantData.country]
      .filter(Boolean)
      .join(', ');
    
    const address_fr = [restaurantData.street_address_fr, restaurantData.city_fr, restaurantData.state_province_fr, restaurantData.postal_code, restaurantData.country]
      .filter(Boolean)
      .join(', ');

    // Build settings object
    const settings = {
      operational_hours: restaurantData.operational_hours || {},
      capacity: restaurantData.capacity || 50,
      ...restaurantData.settings
    };

    // Insert restaurant
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert({
        name: restaurantData.name,
        name_th: restaurantData.name_fr, // Store French name in name_th field for now
        address: address || null,
        address_th: address_fr || null,
        phone: restaurantData.phone || null,
        email: restaurantData.email || null,
        timezone: restaurantData.timezone,
        settings,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      logError('DATABASE_INSERT', error, {
        operation: 'restaurant_create',
        data: restaurantData
      });
      
      return NextResponse.json(
        { error: 'Failed to create restaurant', code: 'CREATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant
    }, { status: 201 });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, {
      operation: 'restaurant_create'
    });
    
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_DOWN' },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logError('SUPABASE_CONFIG', 'Missing environment variables');
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
            // For PUT requests, we don't set cookies
          },
          remove(name, options) {
            // For PUT requests, we don't remove cookies
          },
        },
      }
    );

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('id');
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateRestaurantSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const restaurantData = validationResult.data;

    // Build update object
    const updateData: any = {};
    
    if (restaurantData.name) updateData.name = restaurantData.name;
    if (restaurantData.name_fr) updateData.name_th = restaurantData.name_fr; // Store French name in name_th field
    
    // Build address from components if provided
    if (restaurantData.street_address !== undefined || restaurantData.city !== undefined || 
        restaurantData.state_province !== undefined || restaurantData.postal_code !== undefined || 
        restaurantData.country !== undefined) {
      const address = [restaurantData.street_address, restaurantData.city, restaurantData.state_province, restaurantData.postal_code, restaurantData.country]
        .filter(Boolean)
        .join(', ');
      updateData.address = address || null;
    }
    
    if (restaurantData.street_address_fr !== undefined || restaurantData.city_fr !== undefined || 
        restaurantData.state_province_fr !== undefined) {
      const address_fr = [restaurantData.street_address_fr, restaurantData.city_fr, restaurantData.state_province_fr, restaurantData.postal_code, restaurantData.country]
        .filter(Boolean)
        .join(', ');
      updateData.address_th = address_fr || null;
    }
    
    if (restaurantData.phone !== undefined) updateData.phone = restaurantData.phone || null;
    if (restaurantData.email !== undefined) updateData.email = restaurantData.email || null;
    if (restaurantData.timezone) updateData.timezone = restaurantData.timezone;
    
    // Handle settings updates
    if (restaurantData.operational_hours || restaurantData.capacity || restaurantData.settings) {
      // Get current settings first
      const { data: currentRestaurant } = await supabase
        .from('restaurants')
        .select('settings')
        .eq('id', restaurantId)
        .single();
      
      const currentSettings = currentRestaurant?.settings || {};
      
      updateData.settings = {
        ...currentSettings,
        ...(restaurantData.operational_hours && { operational_hours: restaurantData.operational_hours }),
        ...(restaurantData.capacity && { capacity: restaurantData.capacity }),
        ...restaurantData.settings
      };
    }

    updateData.updated_at = new Date().toISOString();

    // Update restaurant
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurantId)
      .select()
      .single();

    if (error) {
      logError('DATABASE_UPDATE', error, {
        operation: 'restaurant_update',
        restaurantId,
        data: updateData
      });
      
      return NextResponse.json(
        { error: 'Failed to update restaurant', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, {
      operation: 'restaurant_update'
    });
    
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_DOWN' },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logError('SUPABASE_CONFIG', 'Missing environment variables');
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
            // For DELETE requests, we don't set cookies
          },
          remove(name, options) {
            // For DELETE requests, we don't remove cookies
          },
        },
      }
    );

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('id');
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    // Soft delete - set is_active to false instead of actually deleting
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId)
      .select()
      .single();

    if (error) {
      logError('DATABASE_DELETE', error, {
        operation: 'restaurant_delete',
        restaurantId
      });
      
      return NextResponse.json(
        { error: 'Failed to delete restaurant', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant deactivated successfully'
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, {
      operation: 'restaurant_delete'
    });
    
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_DOWN' },
      { status: 503 }
    );
  }
}