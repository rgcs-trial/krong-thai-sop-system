/**
 * Training Modules API endpoints
 * GET /api/training/modules - List training modules with filtering and pagination
 * POST /api/training/modules - Create new training module
 */

import { NextRequest } from 'next/server';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  createSuccessResponse, 
  createPaginatedResponse,
  extractPaginationParams,
  extractSortParams,
  logAuditEvent,
  getClientIP,
  sanitizeSearchQuery
} from '@/lib/api/utils';
import { createAuthenticatedClient } from '@/lib/supabase/client';
import { validationSchemas } from '@/lib/validations';
import { CreateTrainingModuleRequest, TrainingListParams } from '@/types/database';

/**
 * GET /api/training/modules
 * List training modules with filtering, search, and pagination
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    const pagination = extractPaginationParams(searchParams);
    const { sortBy, sortOrder } = extractSortParams(
      searchParams,
      'created_at',
      ['title', 'created_at', 'updated_at', 'duration_minutes', 'passing_score']
    );

    // Parse filters
    const sopDocumentId = searchParams.get('sop_document_id');
    const isActive = searchParams.get('is_active');
    const isMandatory = searchParams.get('is_mandatory');
    const search = searchParams.get('search');
    const categoryId = searchParams.get('category_id');
    const createdBy = searchParams.get('created_by');

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
        .from('training_modules')
        .select(`
          *,
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
          ),
          creator:auth_users!training_modules_created_by_fkey(
            id,
            full_name,
            full_name_th,
            position,
            position_th
          ),
          sections:training_sections(
            id,
            section_number,
            title,
            title_th,
            estimated_minutes,
            is_required,
            sort_order
          ),
          questions:training_questions(
            id,
            question_type,
            difficulty,
            points,
            is_active
          )
        `, { count: 'exact' });

      // Apply restaurant filter (RLS should handle this, but being explicit)
      query = query.eq('restaurant_id', req.auth.restaurantId);

      // Apply filters
      if (isActive !== null) {
        query = query.eq('is_active', isActive === 'true');
      }

      if (isMandatory !== null) {
        query = query.eq('is_mandatory', isMandatory === 'true');
      }

      if (sopDocumentId) {
        query = query.eq('sop_document_id', sopDocumentId);
      }

      if (createdBy) {
        query = query.eq('created_by', createdBy);
      }

      // Apply category filter via SOP document relationship
      if (categoryId) {
        query = query.eq('sop_document.category_id', categoryId);
      }

      // Apply text search
      if (search) {
        const sanitizedSearch = sanitizeSearchQuery(search);
        query = query.or(`title.ilike.%${sanitizedSearch}%,title_th.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%,description_th.ilike.%${sanitizedSearch}%`);
      }

      // Apply sorting
      const sortColumn = sortBy === 'title' ? 'title' : sortBy;
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const { data: modules, error, count } = await query
        .range(pagination.offset!, pagination.offset! + pagination.limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth.restaurantId,
        req.auth.user.id,
        'VIEW',
        'training_modules',
        undefined,
        undefined,
        undefined,
        { 
          action: 'training_modules_list_viewed',
          filters: { 
            sopDocumentId, isActive, isMandatory, search, categoryId, createdBy,
            sortBy, sortOrder 
          },
          pagination,
          result_count: modules?.length || 0
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth.sessionId
      );

      return createPaginatedResponse(
        modules || [],
        {
          page: pagination.page!,
          limit: pagination.limit!,
          total: count || 0,
        },
        'Training modules retrieved successfully',
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching training modules:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch training modules' },
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
 * POST /api/training/modules
 * Create a new training module
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    const moduleData: CreateTrainingModuleRequest = req.validatedBody;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Verify SOP document exists and is active
      const { data: sopDocument, error: sopError } = await client
        .from('sop_documents')
        .select('id, title, title_th, category_id')
        .eq('id', moduleData.sop_document_id)
        .eq('is_active', true)
        .single();

      if (sopError || !sopDocument) {
        return createSuccessResponse(
          { error: 'Invalid or inactive SOP document' },
          undefined,
          400,
          req.requestId
        );
      }

      // Check for duplicate titles within the same restaurant
      const { data: existingModule } = await client
        .from('training_modules')
        .select('id')
        .eq('restaurant_id', req.auth!.restaurantId)
        .eq('title', moduleData.title)
        .eq('is_active', true)
        .single();

      if (existingModule) {
        return createSuccessResponse(
          { error: 'Training module with this title already exists' },
          undefined,
          409,
          req.requestId
        );
      }

      // Start transaction for creating module with sections and questions
      const { data: newModule, error } = await client
        .from('training_modules')
        .insert({
          restaurant_id: req.auth!.restaurantId,
          sop_document_id: moduleData.sop_document_id,
          title: moduleData.title,
          title_th: moduleData.title_th,
          description: moduleData.description,
          description_th: moduleData.description_th,
          duration_minutes: moduleData.duration_minutes || 30,
          passing_score: moduleData.passing_score || 80,
          max_attempts: moduleData.max_attempts || 3,
          validity_days: moduleData.validity_days || 365,
          is_mandatory: moduleData.is_mandatory || false,
          created_by: req.auth!.user.id,
          is_active: true,
        })
        .select(`
          *,
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
          ),
          creator:auth_users!training_modules_created_by_fkey(
            id,
            full_name,
            full_name_th,
            position,
            position_th
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Create sections if provided
      if (moduleData.sections && moduleData.sections.length > 0) {
        const sectionsToInsert = moduleData.sections.map(section => ({
          module_id: newModule.id,
          section_number: section.section_number,
          title: section.title,
          title_th: section.title_th,
          content: section.content,
          content_th: section.content_th,
          media_urls: section.media_urls || [],
          estimated_minutes: section.estimated_minutes || 5,
          is_required: section.is_required !== false,
          sort_order: section.sort_order || section.section_number,
        }));

        const { data: sections, error: sectionsError } = await client
          .from('training_sections')
          .insert(sectionsToInsert)
          .select();

        if (sectionsError) {
          console.error('Error creating sections:', sectionsError);
        } else {
          newModule.sections = sections;
        }
      }

      // Create questions if provided
      if (moduleData.questions && moduleData.questions.length > 0) {
        const questionsToInsert = moduleData.questions.map(question => ({
          module_id: newModule.id,
          section_id: question.section_id,
          question_type: question.question_type,
          question: question.question,
          question_th: question.question_th,
          options: question.options,
          options_th: question.options_th,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          explanation_th: question.explanation_th,
          points: question.points || 1,
          difficulty: question.difficulty || 'medium',
          sort_order: question.sort_order || 0,
          is_active: true,
        }));

        const { data: questions, error: questionsError } = await client
          .from('training_questions')
          .insert(questionsToInsert)
          .select();

        if (questionsError) {
          console.error('Error creating questions:', questionsError);
        } else {
          newModule.questions = questions;
        }
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'CREATE',
        'training_modules',
        newModule.id,
        undefined,
        newModule,
        { 
          action: 'training_module_created',
          sop_document_id: moduleData.sop_document_id,
          sop_title: sopDocument.title,
          title: moduleData.title,
          is_mandatory: moduleData.is_mandatory || false,
          sections_count: moduleData.sections?.length || 0,
          questions_count: moduleData.questions?.length || 0
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        newModule,
        'Training module created successfully',
        201,
        req.requestId
      );

    } catch (error) {
      console.error('Error creating training module:', error);
      return createSuccessResponse(
        { error: 'Failed to create training module' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'manager',
    requiredPermissions: ['training:create'],
    rateLimit: {
      maxRequests: 20,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.createTrainingModule,
    },
    audit: true,
  }
);