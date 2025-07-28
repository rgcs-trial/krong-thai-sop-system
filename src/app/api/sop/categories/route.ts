/**
 * SOP Categories API Route
 * Handles CRUD operations for SOP categories
 * 
 * GET    /api/sop/categories      - List all categories with stats
 * POST   /api/sop/categories      - Create new category
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DatabaseService } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validateCreateSOPCategory, validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  PaginatedResponse,
  SOPCategoryWithStats,
  CreateSOPCategoryRequest,
  SOPAuthContext 
} from '@/types/api/sop';

const db = new DatabaseService(supabaseAdmin);

/**
 * GET /api/sop/categories - List categories with stats
 */
async function handleGetCategories(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'sort_order';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const includeStats = searchParams.get('includeStats') !== 'false';
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    // Validate pagination
    const paginationValidation = validatePagination({ page, limit, sortBy, sortOrder });
    if (!paginationValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters',
        details: paginationValidation.errors,
      } as APIResponse, { status: 400 });
    }

    // Build base query
    let query = supabaseAdmin
      .from('sop_categories')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', context.restaurantId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: categories, error, count } = await query;

    if (error) {
      console.error('Error fetching SOP categories:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch SOP categories',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    let categoriesWithStats: SOPCategoryWithStats[] = categories || [];

    // Add statistics if requested
    if (includeStats && categories && categories.length > 0) {
      const categoryIds = categories.map(cat => cat.id);

      // Get document counts for each category
      const { data: documentStats } = await supabaseAdmin
        .from('sop_documents')
        .select('category_id, status')
        .in('category_id', categoryIds)
        .eq('restaurant_id', context.restaurantId)
        .eq('is_active', true);

      // Get completion stats
      const { data: completionStats } = await supabaseAdmin
        .from('user_progress')
        .select('sop_id, progress_percentage')
        .eq('restaurant_id', context.restaurantId);

      // Get SOP IDs for each category
      const { data: sopsByCategory } = await supabaseAdmin
        .from('sop_documents')
        .select('id, category_id')
        .in('category_id', categoryIds)
        .eq('restaurant_id', context.restaurantId)
        .eq('is_active', true);

      // Calculate stats for each category
      categoriesWithStats = categories.map(category => {
        const categoryDocs = documentStats?.filter(doc => doc.category_id === category.id) || [];
        const categorySops = sopsByCategory?.filter(sop => sop.category_id === category.id) || [];
        const sopIds = categorySops.map(sop => sop.id);
        
        const completedSops = completionStats?.filter(
          progress => sopIds.includes(progress.sop_id) && progress.progress_percentage === 100
        ) || [];

        const pendingReviews = categoryDocs.filter(doc => doc.status === 'review').length;

        return {
          ...category,
          document_count: categoryDocs.length,
          completed_count: completedSops.length,
          pending_reviews: pendingReviews,
        };
      });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const response: PaginatedResponse<SOPCategoryWithStats> = {
      success: true,
      data: categoriesWithStats,
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

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/categories:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/categories - Create new category
 */
async function handleCreateCategory(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const sanitizedData = sanitizeInput(body) as CreateSOPCategoryRequest;

    // Validate input
    const validation = validateCreateSOPCategory(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Check if category with same name already exists
    const { data: existingCategory } = await supabaseAdmin
      .from('sop_categories')
      .select('id')
      .eq('restaurant_id', context.restaurantId)
      .or(`name.eq.${sanitizedData.name},name_fr.eq.${sanitizedData.name_fr}`)
      .eq('is_active', true)
      .single();

    if (existingCategory) {
      return NextResponse.json({
        success: false,
        error: 'Category with this name already exists',
        errorCode: 'CATEGORY_EXISTS',
      } as APIResponse, { status: 409 });
    }

    // Check if sort_order is already used
    const { data: existingSortOrder } = await supabaseAdmin
      .from('sop_categories')
      .select('id')
      .eq('restaurant_id', context.restaurantId)
      .eq('sort_order', sanitizedData.sort_order)
      .eq('is_active', true)
      .single();

    if (existingSortOrder) {
      return NextResponse.json({
        success: false,
        error: 'Sort order already in use. Please choose a different value.',
        errorCode: 'SORT_ORDER_EXISTS',
      } as APIResponse, { status: 409 });
    }

    // Create category
    const categoryData = {
      restaurant_id: context.restaurantId,
      name: sanitizedData.name,
      name_fr: sanitizedData.name_fr,
      description: sanitizedData.description || null,
      description_fr: sanitizedData.description_fr || null,
      icon: sanitizedData.icon || null,
      color: sanitizedData.color || null,
      sort_order: sanitizedData.sort_order,
      is_active: true,
    };

    const { data: newCategory, error: createError } = await supabaseAdmin
      .from('sop_categories')
      .insert(categoryData)
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating SOP category:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create SOP category',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Add default stats
    const categoryWithStats: SOPCategoryWithStats = {
      ...newCategory,
      document_count: 0,
      completed_count: 0,
      pending_reviews: 0,
    };

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'sop_category',
      newCategory.id,
      null,
      categoryData,
      request
    );

    const response: APIResponse<SOPCategoryWithStats> = {
      success: true,
      data: categoryWithStats,
      message: 'SOP category created successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/categories:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetCategories, PERMISSIONS.CATEGORY.READ, {
  maxRequests: 200,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleCreateCategory, PERMISSIONS.CATEGORY.WRITE, {
  maxRequests: 30,
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