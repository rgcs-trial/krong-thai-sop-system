/**
 * SOP Completions API Route
 * Handles tracking and management of SOP completion progress
 * 
 * GET    /api/sop/completions      - List completions with filtering
 * POST   /api/sop/completions      - Create/update completion record
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent, canAccessResource } from '@/lib/middleware/auth';
import { validateCreateSOPCompletion, validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  PaginatedResponse,
  SOPCompletion,
  SOPCompletionStats,
  CreateSOPCompletionRequest,
  SOPAuthContext 
} from '@/types/api/sop';

/**
 * GET /api/sop/completions - List completions with filtering
 */
async function handleGetCompletions(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Parse filters
    const userId = searchParams.get('user_id');
    const sopId = searchParams.get('sop_id');
    const completedOnly = searchParams.get('completed_only') === 'true';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const includeStats = searchParams.get('include_stats') === 'true';

    // Validate pagination
    const paginationValidation = validatePagination({ page, limit, sortBy, sortOrder });
    if (!paginationValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters',
        details: paginationValidation.errors,
      } as APIResponse, { status: 400 });
    }

    // For staff and servers, they can only see their own completions
    const effectiveUserId = canAccessResource(context.role, context.userId, userId || context.userId) 
      ? userId 
      : context.userId;

    // Build query
    let query = supabaseAdmin
      .from('user_progress')
      .select(`
        *,
        sop:sop_documents!inner(id, title, title_fr, category_id, difficulty_level),
        user:auth_users!inner(id, full_name, email, role)
      `, { count: 'exact' })
      .eq('restaurant_id', context.restaurantId);

    // Apply filters
    if (effectiveUserId) {
      query = query.eq('user_id', effectiveUserId);
    }
    
    if (sopId) {
      query = query.eq('sop_id', sopId);
    }
    
    if (completedOnly) {
      query = query.eq('progress_percentage', 100);
    }
    
    if (dateFrom) {
      query = query.gte('last_accessed', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('last_accessed', dateTo);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: completions, error, count } = await query;

    if (error) {
      console.error('Error fetching SOP completions:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch SOP completions',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    let responseData: any = completions || [];
    let stats: SOPCompletionStats | undefined;

    // Include statistics if requested
    if (includeStats) {
      try {
        // Calculate completion statistics
        const { data: allCompletions } = await supabaseAdmin
          .from('user_progress')
          .select('progress_percentage, time_spent, sop_id, user_id')
          .eq('restaurant_id', context.restaurantId)
          .eq('user_id', effectiveUserId || context.userId);

        const totalCompletions = allCompletions?.length || 0;
        const completedSOPs = allCompletions?.filter(c => c.progress_percentage === 100) || [];
        const averageTime = totalCompletions > 0 
          ? allCompletions.reduce((sum, c) => sum + c.time_spent, 0) / totalCompletions 
          : 0;
        const completionRate = totalCompletions > 0 
          ? (completedSOPs.length / totalCompletions) * 100 
          : 0;

        // Get most completed SOP
        const sopCompletionCounts = new Map<string, number>();
        completedSOPs.forEach(c => {
          sopCompletionCounts.set(c.sop_id, (sopCompletionCounts.get(c.sop_id) || 0) + 1);
        });

        let mostCompletedSOP = null;
        if (sopCompletionCounts.size > 0) {
          const topSopId = Array.from(sopCompletionCounts.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
          
          const { data: topSop } = await supabaseAdmin
            .from('sop_documents')
            .select(`
              *,
              category:sop_categories!inner(id, name, name_fr, icon, color)
            `)
            .eq('id', topSopId)
            .single();
          
          mostCompletedSOP = topSop;
        }

        // Get recent completions
        const { data: recentCompletions } = await supabaseAdmin
          .from('user_progress')
          .select(`
            *,
            sop:sop_documents!inner(title, title_fr)
          `)
          .eq('restaurant_id', context.restaurantId)
          .eq('user_id', effectiveUserId || context.userId)
          .eq('progress_percentage', 100)
          .order('updated_at', { ascending: false })
          .limit(5);

        stats = {
          total_completions: totalCompletions,
          average_completion_time: Math.round(averageTime),
          completion_rate: Math.round(completionRate * 100) / 100,
          most_completed_sop: mostCompletedSOP,
          recent_completions: recentCompletions?.map(rc => ({
            id: rc.id,
            restaurant_id: rc.restaurant_id,
            user_id: rc.user_id,
            sop_id: rc.sop_id,
            completion_percentage: rc.progress_percentage,
            time_spent_minutes: rc.time_spent,
            completed_at: rc.updated_at,
            verification_photos: [],
            notes: null,
            created_at: rc.created_at,
            updated_at: rc.updated_at,
          })) || [],
        };
      } catch (statsError) {
        console.error('Error calculating completion stats:', statsError);
        // Continue without stats rather than failing the request
      }
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const response: PaginatedResponse<any> = {
      success: true,
      data: responseData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };

    // Add stats to response if requested
    if (includeStats && stats) {
      (response as any).stats = stats;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/completions:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/completions - Create or update completion record
 */
async function handleCreateCompletion(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const sanitizedData = sanitizeInput(body) as CreateSOPCompletionRequest;

    // Validate input
    const validation = validateCreateSOPCompletion(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Verify SOP exists and belongs to restaurant
    const { data: sop, error: sopError } = await supabaseAdmin
      .from('sop_documents')
      .select('id, title, title_fr')
      .eq('id', sanitizedData.sop_id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true)
      .single();

    if (sopError || !sop) {
      return NextResponse.json({
        success: false,
        error: 'SOP document not found',
        errorCode: 'SOP_NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Check if completion record already exists
    const { data: existingProgress } = await supabaseAdmin
      .from('user_progress')
      .select('*')
      .eq('restaurant_id', context.restaurantId)
      .eq('user_id', context.userId)
      .eq('sop_id', sanitizedData.sop_id)
      .single();

    const completionData = {
      restaurant_id: context.restaurantId,
      user_id: context.userId,
      sop_id: sanitizedData.sop_id,
      progress_percentage: sanitizedData.completion_percentage,
      time_spent: sanitizedData.time_spent_minutes,
      last_accessed: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let result;

    if (existingProgress) {
      // Update existing progress
      const updateData = {
        progress_percentage: Math.max(existingProgress.progress_percentage, sanitizedData.completion_percentage),
        time_spent: existingProgress.time_spent + sanitizedData.time_spent_minutes,
        last_accessed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProgress, error: updateError } = await supabaseAdmin
        .from('user_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
        .select(`
          *,
          sop:sop_documents!inner(id, title, title_fr, category_id),
          user:auth_users!inner(id, full_name, email)
        `)
        .single();

      if (updateError) {
        console.error('Error updating SOP completion:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update SOP completion',
          errorCode: 'DATABASE_ERROR',
        } as APIResponse, { status: 500 });
      }

      result = updatedProgress;

      // Log audit event
      logAuditEvent(
        context,
        'UPDATE',
        'sop_completion',
        existingProgress.id,
        existingProgress,
        updateData,
        request
      );
    } else {
      // Create new progress record
      const { data: newProgress, error: createError } = await supabaseAdmin
        .from('user_progress')
        .insert({
          ...completionData,
          created_at: new Date().toISOString(),
        })
        .select(`
          *,
          sop:sop_documents!inner(id, title, title_fr, category_id),
          user:auth_users!inner(id, full_name, email)
        `)
        .single();

      if (createError) {
        console.error('Error creating SOP completion:', createError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create SOP completion',
          errorCode: 'DATABASE_ERROR',
        } as APIResponse, { status: 500 });
      }

      result = newProgress;

      // Log audit event
      logAuditEvent(
        context,
        'CREATE',
        'sop_completion',
        newProgress.id,
        null,
        completionData,
        request
      );
    }

    // Handle verification photos if provided
    if (sanitizedData.verification_photos && sanitizedData.verification_photos.length > 0) {
      // Note: In a real implementation, you would save these to a file storage service
      // and store the URLs in a separate table. For now, we'll store the metadata.
      const photoData = {
        restaurant_id: context.restaurantId,
        user_id: context.userId,
        form_type: 'sop_completion_verification',
        form_data: {
          sop_id: sanitizedData.sop_id,
          completion_id: result.id,
          verification_photos: sanitizedData.verification_photos,
          notes: sanitizedData.notes || '',
        },
        submission_status: 'completed',
      };

      await supabaseAdmin
        .from('form_submissions')
        .insert(photoData);
    }

    // Record performance metrics
    await supabaseAdmin
      .from('performance_metrics')
      .insert({
        restaurant_id: context.restaurantId,
        metric_type: 'sop_completion',
        metric_name: 'completion_update',
        metric_value: sanitizedData.completion_percentage,
        measurement_unit: 'percentage',
        timestamp: new Date().toISOString(),
        metadata: {
          sop_id: sanitizedData.sop_id,
          user_id: context.userId,
          time_spent: sanitizedData.time_spent_minutes,
          is_completed: sanitizedData.completion_percentage === 100,
        },
      });

    const response: APIResponse<any> = {
      success: true,
      data: result,
      message: existingProgress ? 'SOP completion updated successfully' : 'SOP completion recorded successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: existingProgress ? 200 : 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/completions:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetCompletions, PERMISSIONS.SOP.READ, {
  maxRequests: 300,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleCreateCompletion, PERMISSIONS.SOP.READ, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}