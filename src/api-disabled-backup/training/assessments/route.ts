/**
 * Training Assessments API endpoints
 * GET /api/training/assessments - List user assessments
 * POST /api/training/assessments - Create new assessment or retake
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

/**
 * GET /api/training/assessments
 * List user assessments with filtering and pagination
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    const pagination = extractPaginationParams(searchParams);
    const { sortBy, sortOrder } = extractSortParams(
      searchParams,
      'created_at',
      ['started_at', 'completed_at', 'score_percentage', 'attempt_number']
    );

    // Parse filters
    const userId = searchParams.get('user_id');
    const moduleId = searchParams.get('module_id');
    const status = searchParams.get('status');
    const minScore = searchParams.get('min_score');
    const maxScore = searchParams.get('max_score');
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
        .from('training_assessments')
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
            passing_score,
            max_attempts,
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
          progress:user_training_progress(
            id,
            status,
            progress_percentage,
            attempt_number
          ),
          question_responses:training_question_responses(
            id,
            question_id,
            user_answer,
            is_correct,
            points_earned,
            time_spent_seconds
          )
        `, { count: 'exact' });

      // Apply user filter - users can only see their own assessments unless they're manager/admin
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

      // Apply score range filters
      if (minScore) {
        query = query.gte('score_percentage', parseInt(minScore));
      }

      if (maxScore) {
        query = query.lte('score_percentage', parseInt(maxScore));
      }

      // Apply date filters
      if (dateFrom) {
        query = query.gte('started_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('started_at', dateTo);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const { data: assessments, error, count } = await query
        .range(pagination.offset!, pagination.offset! + pagination.limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth.restaurantId,
        req.auth.user.id,
        'VIEW',
        'training_assessments',
        undefined,
        undefined,
        undefined,
        { 
          action: 'assessments_list_viewed',
          filters: { 
            userId, moduleId, status, minScore, maxScore,
            dateFrom, dateTo, sortBy, sortOrder 
          },
          pagination,
          result_count: assessments?.length || 0
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth.sessionId
      );

      return createPaginatedResponse(
        assessments || [],
        {
          page: pagination.page!,
          limit: pagination.limit!,
          total: count || 0,
        },
        'Training assessments retrieved successfully',
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching training assessments:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch training assessments' },
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
    audit: true,
  }
);

/**
 * POST /api/training/assessments
 * Create a new assessment for a training module
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    const { module_id, user_id } = req.validatedBody;
    const targetUserId = user_id || req.auth!.user.id;

    try {
      // Check permissions - staff can only create assessments for themselves
      if (req.auth!.user.role === 'staff' && targetUserId !== req.auth!.user.id) {
        return createSuccessResponse(
          { error: 'Staff can only create assessments for themselves' },
          undefined,
          403,
          req.requestId
        );
      }

      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Verify module exists and is active
      const { data: module, error: moduleError } = await client
        .from('training_modules')
        .select(`
          id,
          title,
          title_th,
          passing_score,
          max_attempts,
          restaurant_id
        `)
        .eq('id', module_id)
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

      // Check user's training progress for this module
      const { data: progress, error: progressError } = await client
        .from('user_training_progress')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('module_id', module_id)
        .order('attempt_number', { ascending: false })
        .limit(1);

      if (progressError || !progress || progress.length === 0) {
        return createSuccessResponse(
          { error: 'User must start training before taking assessment' },
          undefined,
          400,
          req.requestId
        );
      }

      const currentProgress = progress[0];

      // Check if user has completed the training sections
      if (currentProgress.progress_percentage < 100) {
        return createSuccessResponse(
          { error: 'Training must be completed before taking assessment' },
          undefined,
          400,
          req.requestId
        );
      }

      // Check existing assessments for this attempt
      const { data: existingAssessments } = await client
        .from('training_assessments')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('module_id', module_id)
        .eq('progress_id', currentProgress.id)
        .order('attempt_number', { ascending: false });

      const lastAssessment = existingAssessments?.[0];
      const nextAttemptNumber = lastAssessment ? lastAssessment.attempt_number + 1 : 1;

      // Check if user has exceeded max attempts
      if (nextAttemptNumber > module.max_attempts) {
        return createSuccessResponse(
          { error: `Maximum assessment attempts (${module.max_attempts}) exceeded` },
          undefined,
          400,
          req.requestId
        );
      }

      // Check if user has already passed
      if (lastAssessment && lastAssessment.status === 'passed') {
        return createSuccessResponse(
          { error: 'Assessment already passed for this training module' },
          undefined,
          400,
          req.requestId
        );
      }

      // Get questions for the assessment
      const { data: questions, error: questionsError } = await client
        .from('training_questions')
        .select('*')
        .eq('module_id', module_id)
        .eq('is_active', true)
        .order('sort_order');

      if (questionsError || !questions || questions.length === 0) {
        return createSuccessResponse(
          { error: 'No questions available for this training module' },
          undefined,
          400,
          req.requestId
        );
      }

      // Create new assessment
      const { data: newAssessment, error: assessmentError } = await client
        .from('training_assessments')
        .insert({
          user_id: targetUserId,
          module_id: module_id,
          progress_id: currentProgress.id,
          attempt_number: nextAttemptNumber,
          status: 'pending',
          total_questions: questions.length,
          correct_answers: 0,
          score_percentage: 0,
          time_spent_minutes: 0,
          started_at: new Date().toISOString(),
        })
        .select(`
          *,
          module:training_modules(
            id,
            title,
            title_th,
            passing_score,
            max_attempts
          ),
          progress:user_training_progress(
            id,
            attempt_number
          )
        `)
        .single();

      if (assessmentError) {
        throw new Error(assessmentError.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'CREATE',
        'training_assessments',
        newAssessment.id,
        undefined,
        newAssessment,
        { 
          action: 'assessment_started',
          module_id: module_id,
          module_title: module.title,
          target_user_id: targetUserId,
          attempt_number: nextAttemptNumber,
          total_questions: questions.length
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        {
          assessment: newAssessment,
          remainingAttempts: Math.max(0, module.max_attempts - nextAttemptNumber)
        },
        'Assessment started successfully',
        201,
        req.requestId
      );

    } catch (error) {
      console.error('Error creating assessment:', error);
      return createSuccessResponse(
        { error: 'Failed to create assessment' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['training:assessment'],
    rateLimit: {
      maxRequests: 50,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.createAssessment,
    },
    audit: true,
  }
);