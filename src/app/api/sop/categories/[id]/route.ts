/**
 * Individual SOP Category API Route
 * Handles operations on specific SOP categories
 * 
 * GET    /api/sop/categories/[id]    - Get specific category with stats
 * PUT    /api/sop/categories/[id]    - Update category
 * DELETE /api/sop/categories/[id]    - Delete category
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DatabaseService } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent, ROLES } from '@/lib/middleware/auth';
import { validateCreateSOPCategory, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPCategoryWithStats,
  UpdateSOPCategoryRequest,
  SOPAuthContext 
} from '@/types/api/sop';

const db = new DatabaseService(supabaseAdmin);

/**
 * GET /api/sop/categories/[id] - Get specific category with stats
 */
async function handleGetCategory(
  request: NextRequest, 
  context: SOPAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID format',
        errorCode: 'INVALID_ID',
      } as APIResponse, { status: 400 });
    }

    // Fetch category
    const { data: category, error } = await supabaseAdmin
      .from('sop_categories')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json({
          success: false,
          error: 'Category not found',
          errorCode: 'CATEGORY_NOT_FOUND',
        } as APIResponse, { status: 404 });
      }

      console.error('Error fetching SOP category:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch SOP category',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Get category statistics
    const { data: documentStats } = await supabaseAdmin
      .from('sop_documents')
      .select('id, status')
      .eq('category_id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true);

    // Get completion stats
    const sopIds = documentStats?.map(doc => doc.id) || [];
    let completedCount = 0;

    if (sopIds.length > 0) {
      const { data: completionStats } = await supabaseAdmin
        .from('user_progress')
        .select('sop_id')
        .in('sop_id', sopIds)
        .eq('restaurant_id', context.restaurantId)
        .eq('progress_percentage', 100);

      completedCount = completionStats?.length || 0;
    }

    const pendingReviews = documentStats?.filter(doc => doc.status === 'review').length || 0;

    const categoryWithStats: SOPCategoryWithStats = {
      ...category,
      document_count: documentStats?.length || 0,
      completed_count: completedCount,
      pending_reviews: pendingReviews,
    };

    const response: APIResponse<SOPCategoryWithStats> = {
      success: true,
      data: categoryWithStats,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/categories/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * PUT /api/sop/categories/[id] - Update category
 */
async function handleUpdateCategory(
  request: NextRequest,
  context: SOPAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const { id } = params;
    const body = await request.json();
    const sanitizedData = sanitizeInput(body) as UpdateSOPCategoryRequest;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID format',
        errorCode: 'INVALID_ID',
      } as APIResponse, { status: 400 });
    }

    // Validate input (use create validation for consistency)
    const validation = validateCreateSOPCategory({
      ...sanitizedData,
      name: sanitizedData.name || 'temp',
      name_fr: sanitizedData.name_fr || 'temp',
      sort_order: sanitizedData.sort_order || 0,
    });
    
    // Only check validation errors that apply to the fields being updated
    const relevantErrors = validation.errors.filter(error => 
      sanitizedData.hasOwnProperty(error.field.split('[')[0])
    );
    
    if (relevantErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: relevantErrors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabaseAdmin
      .from('sop_categories')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json({
        success: false,
        error: 'Category not found',
        errorCode: 'CATEGORY_NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Check if names are unique (if being changed)
    if (sanitizedData.name || sanitizedData.name_fr) {
      const nameCheck = [];
      if (sanitizedData.name && sanitizedData.name !== existingCategory.name) {
        nameCheck.push(`name.eq.${sanitizedData.name}`);
      }
      if (sanitizedData.name_fr && sanitizedData.name_fr !== existingCategory.name_fr) {
        nameCheck.push(`name_fr.eq.${sanitizedData.name_fr}`);
      }

      if (nameCheck.length > 0) {
        const { data: duplicateCategory } = await supabaseAdmin
          .from('sop_categories')
          .select('id')
          .eq('restaurant_id', context.restaurantId)
          .or(nameCheck.join(','))
          .neq('id', id)
          .eq('is_active', true)
          .single();

        if (duplicateCategory) {
          return NextResponse.json({
            success: false,
            error: 'Category with this name already exists',
            errorCode: 'CATEGORY_EXISTS',
          } as APIResponse, { status: 409 });
        }
      }
    }

    // Check if sort_order is unique (if being changed)
    if (sanitizedData.sort_order !== undefined && sanitizedData.sort_order !== existingCategory.sort_order) {
      const { data: duplicateSortOrder } = await supabaseAdmin
        .from('sop_categories')
        .select('id')
        .eq('restaurant_id', context.restaurantId)
        .eq('sort_order', sanitizedData.sort_order)
        .neq('id', id)
        .eq('is_active', true)
        .single();

      if (duplicateSortOrder) {
        return NextResponse.json({
          success: false,
          error: 'Sort order already in use. Please choose a different value.',
          errorCode: 'SORT_ORDER_EXISTS',
        } as APIResponse, { status: 409 });
      }
    }

    // Prepare update data
    const updateData: any = {
      ...sanitizedData,
      updated_at: new Date().toISOString(),
    };

    // Update category
    const { data: updatedCategory, error: updateError } = await supabaseAdmin
      .from('sop_categories')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating SOP category:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update SOP category',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Get updated stats
    const { data: documentStats } = await supabaseAdmin
      .from('sop_documents')
      .select('id, status')
      .eq('category_id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true);

    const categoryWithStats: SOPCategoryWithStats = {
      ...updatedCategory,
      document_count: documentStats?.length || 0,
      completed_count: 0, // Would need additional query for completions
      pending_reviews: documentStats?.filter(doc => doc.status === 'review').length || 0,
    };

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'sop_category',
      id,
      existingCategory,
      updateData,
      request
    );

    const response: APIResponse<SOPCategoryWithStats> = {
      success: true,
      data: categoryWithStats,
      message: 'SOP category updated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in PUT /api/sop/categories/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * DELETE /api/sop/categories/[id] - Delete category (soft delete)
 */
async function handleDeleteCategory(
  request: NextRequest,
  context: SOPAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID format',
        errorCode: 'INVALID_ID',
      } as APIResponse, { status: 400 });
    }

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabaseAdmin
      .from('sop_categories')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json({
        success: false,
        error: 'Category not found',
        errorCode: 'CATEGORY_NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Check permissions - only admins and managers can delete
    if (context.role !== ROLES.ADMIN && context.role !== ROLES.MANAGER) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to delete this category',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      } as APIResponse, { status: 403 });
    }

    // Check if category has active SOPs
    const { data: activeSOPs } = await supabaseAdmin
      .from('sop_documents')
      .select('id')
      .eq('category_id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true);

    if (activeSOPs && activeSOPs.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete category with ${activeSOPs.length} active SOP documents. Please move or delete the SOPs first.`,
        errorCode: 'CATEGORY_HAS_SOPS',
        details: { activeSOPCount: activeSOPs.length },
      } as APIResponse, { status: 409 });
    }

    // Soft delete (set is_active to false)
    const { error: deleteError } = await supabaseAdmin
      .from('sop_categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting SOP category:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete SOP category',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'DELETE',
      'sop_category',
      id,
      existingCategory,
      { is_active: false },
      request
    );

    const response: APIResponse = {
      success: true,
      message: 'SOP category deleted successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in DELETE /api/sop/categories/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authHandler = withAuth(
    (req, context) => handleGetCategory(req, context, params),
    PERMISSIONS.CATEGORY.READ,
    { maxRequests: 300, windowMs: 60000 }
  );
  return authHandler(request);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authHandler = withAuth(
    (req, context) => handleUpdateCategory(req, context, params),
    PERMISSIONS.CATEGORY.WRITE,
    { maxRequests: 100, windowMs: 60000 }
  );
  return authHandler(request);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authHandler = withAuth(
    (req, context) => handleDeleteCategory(req, context, params),
    PERMISSIONS.CATEGORY.DELETE,
    { maxRequests: 50, windowMs: 60000 }
  );
  return authHandler(request);
}

// Handle unsupported methods
export async function POST() {
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