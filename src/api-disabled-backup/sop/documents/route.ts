/**
 * SOP Documents API endpoints
 * GET /api/sop/documents - List SOP documents with filtering and pagination
 * POST /api/sop/documents - Create new SOP document
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
import { CreateSOPRequest, SOPListParams, SOPResponse } from '@/types/api';
import { SOPStatus, SOPPriority } from '@/types/database';

/**
 * GET /api/sop/documents
 * List SOP documents with filtering, search, and pagination
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    const pagination = extractPaginationParams(searchParams);
    const { sortBy, sortOrder } = extractSortParams(
      searchParams,
      'updated_at',
      ['title', 'created_at', 'updated_at', 'priority', 'status', 'effective_date', 'review_date']
    );

    // Parse filters
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') as SOPStatus;
    const priority = searchParams.get('priority') as SOPPriority;
    const createdBy = searchParams.get('createdBy');
    const search = searchParams.get('search');
    const tags = searchParams.getAll('tags');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeInactive = searchParams.get('includeInactive') === 'true';

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
        .from('sop_documents')
        .select(`
          *,
          category:sop_categories(
            id,
            name,
            name_th,
            icon,
            color
          ),
          creator:auth_users!sop_documents_created_by_fkey(
            id,
            full_name,
            full_name_th,
            position,
            position_th
          ),
          updater:auth_users!sop_documents_updated_by_fkey(
            id,
            full_name,
            full_name_th,
            position,
            position_th
          ),
          approver:auth_users!sop_documents_approved_by_fkey(
            id,
            full_name,
            full_name_th,
            position,
            position_th
          )
        `, { count: 'exact' });

      // Apply restaurant filter (RLS should handle this, but being explicit)
      query = query.eq('restaurant_id', req.auth.restaurantId);

      // Apply filters
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      if (createdBy) {
        query = query.eq('created_by', createdBy);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      // Apply text search
      if (search) {
        const sanitizedSearch = sanitizeSearchQuery(search);
        query = query.or(`title.ilike.%${sanitizedSearch}%,title_th.ilike.%${sanitizedSearch}%,content.ilike.%${sanitizedSearch}%,content_th.ilike.%${sanitizedSearch}%`);
      }

      // Apply sorting
      const sortColumn = sortBy === 'title' ? 'title' : sortBy;
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const { data: documents, error, count } = await query
        .range(pagination.offset!, pagination.offset! + pagination.limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth.restaurantId,
        req.auth.user.id,
        'VIEW',
        'sop_documents',
        undefined,
        undefined,
        undefined,
        { 
          action: 'documents_list_viewed',
          filters: { 
            categoryId, status, priority, createdBy, search, tags, 
            dateFrom, dateTo, includeInactive, sortBy, sortOrder 
          },
          pagination,
          result_count: documents?.length || 0
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth.sessionId
      );

      return createPaginatedResponse(
        documents || [],
        {
          page: pagination.page!,
          limit: pagination.limit!,
          total: count || 0,
        },
        'SOP documents retrieved successfully',
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching SOP documents:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch SOP documents' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['sop:read'],
    rateLimit: {
      maxRequests: 100,
      windowMinutes: 1,
    },
    validation: {
      query: validationSchemas.sopListParams,
    },
    audit: true,
  }
);

/**
 * POST /api/sop/documents
 * Create a new SOP document
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    const sopData: CreateSOPRequest = req.validatedBody;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Verify category exists and is active
      const { data: category, error: categoryError } = await client
        .from('sop_categories')
        .select('id, name, name_th')
        .eq('id', sopData.categoryId)
        .eq('is_active', true)
        .single();

      if (categoryError || !category) {
        return createSuccessResponse(
          { error: 'Invalid or inactive category' },
          undefined,
          400,
          req.requestId
        );
      }

      // Check for duplicate titles within the same category
      const { data: existingSOP } = await client
        .from('sop_documents')
        .select('id')
        .eq('category_id', sopData.categoryId)
        .eq('title', sopData.title)
        .eq('is_active', true)
        .single();

      if (existingSOP) {
        return createSuccessResponse(
          { error: 'SOP with this title already exists in the category' },
          undefined,
          409,
          req.requestId
        );
      }

      // Create the SOP document
      const { data: newSOP, error } = await client
        .from('sop_documents')
        .insert({
          category_id: sopData.categoryId,
          restaurant_id: req.auth!.restaurantId,
          title: sopData.title,
          title_th: sopData.titleTh,
          content: sopData.content,
          content_th: sopData.contentTh,
          steps: sopData.steps,
          steps_th: sopData.stepsTh,
          attachments: sopData.attachments || [],
          tags: sopData.tags || [],
          tags_th: sopData.tagsTh || [],
          priority: sopData.priority || 'medium',
          status: 'draft',
          effective_date: sopData.effectiveDate,
          review_date: sopData.reviewDate,
          created_by: req.auth!.user.id,
          version: 1,
          is_active: true,
        })
        .select(`
          *,
          category:sop_categories(
            id,
            name,
            name_th,
            icon,
            color
          ),
          creator:auth_users!sop_documents_created_by_fkey(
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

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'CREATE',
        'sop_documents',
        newSOP.id,
        undefined,
        newSOP,
        { 
          action: 'sop_created',
          category_id: sopData.categoryId,
          category_name: category.name,
          title: sopData.title,
          priority: sopData.priority || 'medium'
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        newSOP,
        'SOP document created successfully',
        201,
        req.requestId
      );

    } catch (error) {
      console.error('Error creating SOP document:', error);
      return createSuccessResponse(
        { error: 'Failed to create SOP document' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'manager',
    requiredPermissions: ['sop:create'],
    rateLimit: {
      maxRequests: 20,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.createSOP,
    },
    audit: true,
  }
);