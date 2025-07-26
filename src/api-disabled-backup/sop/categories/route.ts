/**
 * SOP Categories API endpoints
 * GET /api/sop/categories - List all categories
 * POST /api/sop/categories - Create new category
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
import { db, createAuthenticatedClient } from '@/lib/supabase/client';
import { validationSchemas } from '@/lib/validations';
import { CreateCategoryRequest, CategoryListParams } from '@/types/api';
import { SOPCategory } from '@/types/database';

/**
 * GET /api/sop/categories
 * List all SOP categories with optional filtering and pagination
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    const pagination = extractPaginationParams(searchParams);
    const { sortBy, sortOrder } = extractSortParams(
      searchParams,
      'sort_order',
      ['name', 'sort_order', 'created_at', 'updated_at']
    );

    // Parse additional filters
    const includeInactive = searchParams.get('includeInactive') === 'true';

    try {
      // Create authenticated client if user is logged in
      const client = req.auth 
        ? await createAuthenticatedClient(req.auth.user.id, req.auth.restaurantId)
        : db.client;

      // Build query
      let query = client
        .from('sop_categories')
        .select('*', { count: 'exact' });

      // Apply filters
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      // Apply sorting
      const sortColumn = sortBy === 'name' ? 'name' : sortBy;
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const { data: categories, error, count } = await query
        .range(pagination.offset!, pagination.offset! + pagination.limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      if (req.auth) {
        await logAuditEvent(
          req.auth.restaurantId,
          req.auth.user.id,
          'VIEW',
          'sop_categories',
          undefined,
          undefined,
          undefined,
          { 
            filters: { includeInactive, sortBy, sortOrder },
            pagination,
            result_count: categories?.length || 0
          },
          getClientIP(req),
          req.headers.get('user-agent') || undefined,
          req.auth.sessionId
        );
      }

      return createPaginatedResponse(
        categories || [],
        {
          page: pagination.page!,
          limit: pagination.limit!,
          total: count || 0,
        },
        'Categories retrieved successfully',
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching categories:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch categories' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: false, // Categories can be viewed without auth for public SOPs
    rateLimit: {
      maxRequests: 60,
      windowMinutes: 1,
    },
    validation: {
      query: validationSchemas.categoryListParams,
    },
    audit: true,
  }
);

/**
 * POST /api/sop/categories
 * Create a new SOP category
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    const categoryData: CreateCategoryRequest = req.validatedBody;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Check if category code already exists
      const { data: existingCategory } = await client
        .from('sop_categories')
        .select('id')
        .eq('code', categoryData.code)
        .single();

      if (existingCategory) {
        return createSuccessResponse(
          { error: 'Category code already exists' },
          undefined,
          409,
          req.requestId
        );
      }

      // Create the category
      const { data: newCategory, error } = await client
        .from('sop_categories')
        .insert({
          code: categoryData.code,
          name: categoryData.name,
          name_th: categoryData.nameTh,
          description: categoryData.description,
          description_th: categoryData.descriptionTh,
          icon: categoryData.icon,
          color: categoryData.color,
          sort_order: categoryData.sortOrder || 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'CREATE',
        'sop_categories',
        newCategory.id,
        undefined,
        newCategory,
        { 
          action: 'category_created',
          category_code: categoryData.code 
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        newCategory,
        'Category created successfully',
        201,
        req.requestId
      );

    } catch (error) {
      console.error('Error creating category:', error);
      return createSuccessResponse(
        { error: 'Failed to create category' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'manager',
    requiredPermissions: ['category:create'],
    rateLimit: {
      maxRequests: 10,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.createCategory,
    },
    audit: true,
  }
);