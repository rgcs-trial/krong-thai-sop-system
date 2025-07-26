/**
 * Individual SOP Category API endpoints
 * GET /api/sop/categories/[id] - Get single category
 * PUT /api/sop/categories/[id] - Update category
 * DELETE /api/sop/categories/[id] - Delete category
 */

import { NextRequest } from 'next/server';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  createSuccessResponse,
  logAuditEvent,
  getClientIP,
  isValidUUID
} from '@/lib/api/utils';
import { createAuthenticatedClient } from '@/lib/supabase/client';
import { validationSchemas } from '@/lib/validations';
import { UpdateCategoryRequest } from '@/types/api';

/**
 * GET /api/sop/categories/[id]
 * Get a single SOP category by ID
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid category ID format' },
        undefined,
        400,
        req.requestId
      );
    }

    try {
      // Create authenticated client if user is logged in
      const client = req.auth 
        ? await createAuthenticatedClient(req.auth.user.id, req.auth.restaurantId)
        : await createAuthenticatedClient('anonymous', 'anonymous');

      // Fetch category
      const { data: category, error } = await client
        .from('sop_categories')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error || !category) {
        return createSuccessResponse(
          { error: 'Category not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Log audit event
      if (req.auth) {
        await logAuditEvent(
          req.auth.restaurantId,
          req.auth.user.id,
          'VIEW',
          'sop_categories',
          id,
          undefined,
          undefined,
          { 
            action: 'category_viewed',
            category_code: category.code 
          },
          getClientIP(req),
          req.headers.get('user-agent') || undefined,
          req.auth.sessionId
        );
      }

      return createSuccessResponse(
        category,
        'Category retrieved successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching category:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch category' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: false,
    rateLimit: {
      maxRequests: 100,
      windowMinutes: 1,
    },
    audit: true,
  }
);

/**
 * PUT /api/sop/categories/[id]
 * Update an existing SOP category
 */
export const PUT = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const updateData: UpdateCategoryRequest = req.validatedBody;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid category ID format' },
        undefined,
        400,
        req.requestId
      );
    }

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Fetch existing category for audit trail
      const { data: existingCategory, error: fetchError } = await client
        .from('sop_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existingCategory) {
        return createSuccessResponse(
          { error: 'Category not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Check if trying to update code to an existing one
      if (updateData.code && updateData.code !== existingCategory.code) {
        const { data: duplicateCategory } = await client
          .from('sop_categories')
          .select('id')
          .eq('code', updateData.code)
          .neq('id', id)
          .single();

        if (duplicateCategory) {
          return createSuccessResponse(
            { error: 'Category code already exists' },
            undefined,
            409,
            req.requestId
          );
        }
      }

      // Prepare update data
      const updateFields: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateData.code) updateFields.code = updateData.code;
      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.nameTh) updateFields.name_th = updateData.nameTh;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.descriptionTh !== undefined) updateFields.description_th = updateData.descriptionTh;
      if (updateData.icon !== undefined) updateFields.icon = updateData.icon;
      if (updateData.color !== undefined) updateFields.color = updateData.color;
      if (updateData.sortOrder !== undefined) updateFields.sort_order = updateData.sortOrder;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;

      // Update the category
      const { data: updatedCategory, error } = await client
        .from('sop_categories')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'UPDATE',
        'sop_categories',
        id,
        existingCategory,
        updatedCategory,
        { 
          action: 'category_updated',
          category_code: existingCategory.code,
          changes: Object.keys(updateFields)
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        updatedCategory,
        'Category updated successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error updating category:', error);
      return createSuccessResponse(
        { error: 'Failed to update category' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'manager',
    requiredPermissions: ['category:update'],
    rateLimit: {
      maxRequests: 20,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.updateCategory,
    },
    audit: true,
  }
);

/**
 * DELETE /api/sop/categories/[id]
 * Soft delete an SOP category (sets is_active to false)
 */
export const DELETE = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid category ID format' },
        undefined,
        400,
        req.requestId
      );
    }

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Check if category exists
      const { data: existingCategory, error: fetchError } = await client
        .from('sop_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existingCategory) {
        return createSuccessResponse(
          { error: 'Category not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Check if category has associated SOPs
      const { data: associatedSOPs, error: sopError } = await client
        .from('sop_documents')
        .select('id')
        .eq('category_id', id)
        .eq('is_active', true)
        .limit(1);

      if (sopError) {
        throw new Error(sopError.message);
      }

      if (associatedSOPs && associatedSOPs.length > 0) {
        return createSuccessResponse(
          { error: 'Cannot delete category with active SOPs. Please move or delete associated SOPs first.' },
          undefined,
          409,
          req.requestId
        );
      }

      // Soft delete the category
      const { data: deletedCategory, error } = await client
        .from('sop_categories')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'DELETE',
        'sop_categories',
        id,
        existingCategory,
        deletedCategory,
        { 
          action: 'category_deleted',
          category_code: existingCategory.code,
          deletion_type: 'soft_delete'
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        { id, deleted: true },
        'Category deleted successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error deleting category:', error);
      return createSuccessResponse(
        { error: 'Failed to delete category' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'admin',
    requiredPermissions: ['category:delete'],
    rateLimit: {
      maxRequests: 10,
      windowMinutes: 1,
    },
    audit: true,
  }
);