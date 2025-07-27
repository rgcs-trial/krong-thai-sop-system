/**
 * Training Progress API endpoints
 * GET /api/training/progress - List user training progress
 * POST /api/training/progress - Create or update training progress
 */

import { NextRequest } from 'next/server';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  createSuccessResponse, 
  createPaginatedResponse,
  extractPaginationParams,
  extractSortParams,
  logAuditEvent,
  getClientIP
} from '@/lib/api/utils';
import { createAuthenticatedClient } from '@/lib/supabase/client';
import { validationSchemas } from '@/lib/validations';
import { TrainingListParams, UpdateTrainingProgressRequest } from '@/types/database';

/**
 * GET /api/training/progress
 * List user training progress with filtering and pagination
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    const pagination = extractPaginationParams(searchParams);
    const { sortBy, sortOrder } = extractSortParams(
      searchParams,
      'updated_at',
      ['started_at', 'updated_at', 'completed_at', 'progress_percentage', 'time_spent_minutes']
    );

    // Parse filters
    const userId = searchParams.get('user_id');
    const moduleId = searchParams.get('module_id');
    const status = searchParams.get('status');
    const isMandatory = searchParams.get('is_mandatory');
    const includeExpired = searchParams.get('include_expired') === 'true';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    try {
      if (!req.auth) {
        return createSuccessResponse(
          { error: 'Authentication required' },
          undefined,
          401,
          req.requestId
        );
      }

      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth.user.id, 
        req.auth.restaurantId
      );

      // Build query with joins
      let query = client
        .from('user_training_progress')
        .select(`
          *,
          user:auth_users(
            id,
            full_name,
            full_name_th,
            position,
            position_th
          ),
          module:training_modules(
            id,
            title,
            title_th,
            duration_minutes,
            passing_score,
            is_mandatory,
            validity_days,
            sop_document:sop_documents(
              id,
              title,
              title_th,
              category:sop_categories(
                id,
                name,
                name_th,
                icon,
                color
              )
            )
          ),
          current_section:training_sections(
            id,
            section_number,
            title,
            title_th
          ),
          section_progress:user_section_progress(
            id,
            section_id,
            is_completed,
            time_spent_minutes,
            completed_at
          )
        `, { count: 'exact' });

      // Apply user filter - users can only see their own progress unless they're manager/admin
      if (userId && req.auth.user.role !== 'staff') {
        query = query.eq('user_id', userId);
      } else if (req.auth.user.role === 'staff') {
        query = query.eq('user_id', req.auth.user.id);
      }

      // Apply module filter
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }

      // Apply mandatory filter via module relationship
      if (isMandatory !== null) {
        query = query.eq('module.is_mandatory', isMandatory === 'true');
      }

      // Apply date filters
      if (dateFrom) {
        query = query.gte('started_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('started_at', dateTo);
      }

      // Filter out expired progress unless explicitly requested
      if (!includeExpired) {
        // This would require a more complex query to check validity_days
        // For now, we'll include all progress
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const { data: progressRecords, error, count } = await query
        .range(pagination.offset!, pagination.offset! + pagination.limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth.restaurantId,
        req.auth.user.id,
        'VIEW',
        'user_training_progress',
        undefined,
        undefined,
        undefined,
        { 
          action: 'training_progress_list_viewed',
          filters: { 
            userId, moduleId, status, isMandatory, includeExpired,
            dateFrom, dateTo, sortBy, sortOrder 
          },
          pagination,
          result_count: progressRecords?.length || 0
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth.sessionId
      );

      return createPaginatedResponse(
        progressRecords || [],
        {
          page: pagination.page!,
          limit: pagination.limit!,
          total: count || 0,
        },
        'Training progress retrieved successfully',
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching training progress:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch training progress' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['training:read'],
    rateLimit: {
      maxRequests: 100,
      windowMinutes: 1,
    },
    validation: {
      query: validationSchemas.trainingListParams,
    },
    audit: true,
  }
);

/**
 * POST /api/training/progress
 * Update training progress or create if doesn't exist
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    const progressData: UpdateTrainingProgressRequest = req.validatedBody;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Verify the user can update this progress
      const targetUserId = progressData.user_id || req.auth!.user.id;
      
      if (req.auth!.user.role === 'staff' && targetUserId !== req.auth!.user.id) {
        return createSuccessResponse(
          { error: 'Staff can only update their own progress' },
          undefined,
          403,
          req.requestId
        );
      }

      // Get or create progress record
      let { data: progress, error: progressError } = await client
        .from('user_training_progress')
        .select(`
          *,
          module:training_modules(
            id,
            title,
            title_th,
            restaurant_id
          )
        `)
        .eq('user_id', targetUserId)
        .eq('module_id', progressData.module_id)
        .eq('attempt_number', progressData.attempt_number || 1)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw new Error(progressError.message);
      }

      const isNewProgress = !progress;

      if (isNewProgress) {
        // Verify module exists and belongs to the same restaurant
        const { data: module, error: moduleError } = await client
          .from('training_modules')
          .select('id, title, title_th, restaurant_id')
          .eq('id', progressData.module_id)
          .eq('restaurant_id', req.auth!.restaurantId)
          .eq('is_active', true)
          .single();

        if (moduleError || !module) {
          return createSuccessResponse(
            { error: 'Training module not found or inactive' },
            undefined,
            404,
            req.requestId
          );
        }

        // Create new progress
        const { data: newProgress, error: createError } = await client
          .from('user_training_progress')
          .insert({
            user_id: targetUserId,
            module_id: progressData.module_id,
            status: 'in_progress',
            progress_percentage: 0,
            current_section_id: progressData.current_section_id,
            started_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
            time_spent_minutes: progressData.time_spent_minutes || 0,
            attempt_number: progressData.attempt_number || 1,
          })
          .select(`
            *,
            module:training_modules(
              id,
              title,
              title_th
            )
          `)
          .single();

        if (createError) {
          throw new Error(createError.message);
        }

        progress = newProgress;
      } else {
        // Update existing progress
        const updateFields: any = {
          last_accessed_at: new Date().toISOString(),
        };

        if (progressData.current_section_id !== undefined) {
          updateFields.current_section_id = progressData.current_section_id;
        }

        if (progressData.time_spent_minutes !== undefined) {
          updateFields.time_spent_minutes = (progress.time_spent_minutes || 0) + progressData.time_spent_minutes;
        }

        if (progressData.status !== undefined) {
          updateFields.status = progressData.status;
          
          if (progressData.status === 'completed') {
            updateFields.completed_at = new Date().toISOString();
            updateFields.progress_percentage = 100;
          } else if (progressData.status === 'failed') {
            updateFields.progress_percentage = progress.progress_percentage; // Keep current progress
          }
        }

        if (progressData.progress_percentage !== undefined) {
          updateFields.progress_percentage = progressData.progress_percentage;
        }

        const { data: updatedProgress, error: updateError } = await client
          .from('user_training_progress')
          .update(updateFields)
          .eq('id', progress.id)
          .select(`
            *,
            module:training_modules(
              id,
              title,
              title_th
            )
          `)
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        progress = updatedProgress;
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        isNewProgress ? 'CREATE' : 'UPDATE',
        'user_training_progress',
        progress.id,
        isNewProgress ? undefined : progress,
        progress,
        { 
          action: isNewProgress ? 'training_progress_started' : 'training_progress_updated',
          module_title: progress.module?.title,
          target_user_id: targetUserId,
          status: progress.status,
          progress_percentage: progress.progress_percentage
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        progress,
        isNewProgress ? 'Training progress started successfully' : 'Training progress updated successfully',
        isNewProgress ? 201 : 200,
        req.requestId
      );

    } catch (error) {
      console.error('Error updating training progress:', error);
      return createSuccessResponse(
        { error: 'Failed to update training progress' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['training:progress'],
    rateLimit: {
      maxRequests: 200,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.updateTrainingProgress,
    },
    audit: true,
  }
);