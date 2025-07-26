/**
 * Individual SOP Document API endpoints
 * GET /api/sop/documents/[id] - Get single SOP document
 * PUT /api/sop/documents/[id] - Update SOP document
 * DELETE /api/sop/documents/[id] - Delete SOP document
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
import { UpdateSOPRequest } from '@/types/api';

/**
 * GET /api/sop/documents/[id]
 * Get a single SOP document by ID
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid SOP document ID format' },
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

      // Fetch SOP document with related data
      const { data: sop, error } = await client
        .from('sop_documents')
        .select(`
          *,
          category:sop_categories(
            id,
            name,
            name_th,
            icon,
            color,
            description,
            description_th
          ),
          creator:auth_users!sop_documents_created_by_fkey(
            id,
            full_name,
            full_name_th,
            position,
            position_th,
            email
          ),
          updater:auth_users!sop_documents_updated_by_fkey(
            id,
            full_name,
            full_name_th,
            position,
            position_th,
            email
          ),
          approver:auth_users!sop_documents_approved_by_fkey(
            id,
            full_name,
            full_name_th,
            position,
            position_th,
            email
          )
        `)
        .eq('id', id)
        .eq('restaurant_id', req.auth!.restaurantId)
        .eq('is_active', true)
        .single();

      if (error || !sop) {
        return createSuccessResponse(
          { error: 'SOP document not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Record user progress (view action)
      try {
        await client
          .from('user_progress')
          .upsert({
            user_id: req.auth!.user.id,
            sop_id: id,
            restaurant_id: req.auth!.restaurantId,
            action: 'viewed',
            viewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,sop_id',
          });
      } catch (progressError) {
        // Don't fail the main request if progress logging fails
        console.warn('Failed to record user progress:', progressError);
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'VIEW',
        'sop_documents',
        id,
        undefined,
        undefined,
        { 
          action: 'sop_viewed',
          sop_title: sop.title,
          category_id: sop.category_id,
          category_name: sop.category?.name,
          status: sop.status,
          priority: sop.priority
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        sop,
        'SOP document retrieved successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching SOP document:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch SOP document' },
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
      maxRequests: 200,
      windowMinutes: 1,
    },
    audit: true,
  }
);

/**
 * PUT /api/sop/documents/[id]
 * Update an existing SOP document
 */
export const PUT = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const updateData: UpdateSOPRequest = req.validatedBody;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid SOP document ID format' },
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

      // Fetch existing SOP for audit trail and validation
      const { data: existingSOP, error: fetchError } = await client
        .from('sop_documents')
        .select('*')
        .eq('id', id)
        .eq('restaurant_id', req.auth!.restaurantId)
        .single();

      if (fetchError || !existingSOP) {
        return createSuccessResponse(
          { error: 'SOP document not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Check if user has permission to update based on status
      if (existingSOP.status === 'approved' && !req.auth!.permissions.includes('sop:approve')) {
        return createSuccessResponse(
          { error: 'Cannot modify approved SOP without approval permissions' },
          undefined,
          403,
          req.requestId
        );
      }

      // Verify category exists if being updated
      if (updateData.categoryId && updateData.categoryId !== existingSOP.category_id) {
        const { data: category, error: categoryError } = await client
          .from('sop_categories')
          .select('id')
          .eq('id', updateData.categoryId)
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
      }

      // Check for duplicate titles if title is being updated
      if (updateData.title && updateData.title !== existingSOP.title) {
        const categoryIdToCheck = updateData.categoryId || existingSOP.category_id;
        const { data: duplicateSOP } = await client
          .from('sop_documents')
          .select('id')
          .eq('category_id', categoryIdToCheck)
          .eq('title', updateData.title)
          .eq('is_active', true)
          .neq('id', id)
          .single();

        if (duplicateSOP) {
          return createSuccessResponse(
            { error: 'SOP with this title already exists in the category' },
            undefined,
            409,
            req.requestId
          );
        }
      }

      // Prepare update data
      const updateFields: any = {
        updated_by: req.auth!.user.id,
        updated_at: new Date().toISOString(),
      };

      // Handle version increment if content changes
      const contentChanged = (
        updateData.title !== existingSOP.title ||
        updateData.titleTh !== existingSOP.title_th ||
        updateData.content !== existingSOP.content ||
        updateData.contentTh !== existingSOP.content_th ||
        JSON.stringify(updateData.steps) !== JSON.stringify(existingSOP.steps) ||
        JSON.stringify(updateData.stepsTh) !== JSON.stringify(existingSOP.steps_th)
      );

      if (contentChanged) {
        updateFields.version = existingSOP.version + 1;
        // Reset approval if content changes
        if (existingSOP.status === 'approved') {
          updateFields.status = 'review';
          updateFields.approved_by = null;
          updateFields.approved_at = null;
        }
      }

      // Apply updates
      if (updateData.categoryId !== undefined) updateFields.category_id = updateData.categoryId;
      if (updateData.title !== undefined) updateFields.title = updateData.title;
      if (updateData.titleTh !== undefined) updateFields.title_th = updateData.titleTh;
      if (updateData.content !== undefined) updateFields.content = updateData.content;
      if (updateData.contentTh !== undefined) updateFields.content_th = updateData.contentTh;
      if (updateData.steps !== undefined) updateFields.steps = updateData.steps;
      if (updateData.stepsTh !== undefined) updateFields.steps_th = updateData.stepsTh;
      if (updateData.attachments !== undefined) updateFields.attachments = updateData.attachments;
      if (updateData.tags !== undefined) updateFields.tags = updateData.tags;
      if (updateData.tagsTh !== undefined) updateFields.tags_th = updateData.tagsTh;
      if (updateData.priority !== undefined) updateFields.priority = updateData.priority;
      if (updateData.effectiveDate !== undefined) updateFields.effective_date = updateData.effectiveDate;
      if (updateData.reviewDate !== undefined) updateFields.review_date = updateData.reviewDate;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;

      // Handle status updates with approval workflow
      if (updateData.status !== undefined) {
        if (updateData.status === 'approved' && !req.auth!.permissions.includes('sop:approve')) {
          return createSuccessResponse(
            { error: 'Insufficient permissions to approve SOP' },
            undefined,
            403,
            req.requestId
          );
        }

        updateFields.status = updateData.status;
        
        if (updateData.status === 'approved') {
          updateFields.approved_by = req.auth!.user.id;
          updateFields.approved_at = new Date().toISOString();
        }
      }

      // Update the SOP document
      const { data: updatedSOP, error } = await client
        .from('sop_documents')
        .update(updateFields)
        .eq('id', id)
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
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        updateData.status === 'approved' ? 'APPROVE' : 'UPDATE',
        'sop_documents',
        id,
        existingSOP,
        updatedSOP,
        { 
          action: updateData.status === 'approved' ? 'sop_approved' : 'sop_updated',
          sop_title: existingSOP.title,
          category_id: existingSOP.category_id,
          changes: Object.keys(updateFields),
          version_changed: contentChanged,
          status_change: existingSOP.status !== updatedSOP.status ? 
            { from: existingSOP.status, to: updatedSOP.status } : undefined
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        updatedSOP,
        updateData.status === 'approved' ? 'SOP approved successfully' : 'SOP document updated successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error updating SOP document:', error);
      return createSuccessResponse(
        { error: 'Failed to update SOP document' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'manager',
    requiredPermissions: ['sop:update'],
    rateLimit: {
      maxRequests: 30,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.updateSOP,
    },
    audit: true,
  }
);

/**
 * DELETE /api/sop/documents/[id]
 * Soft delete an SOP document (sets is_active to false)
 */
export const DELETE = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid SOP document ID format' },
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

      // Check if SOP document exists
      const { data: existingSOP, error: fetchError } = await client
        .from('sop_documents')
        .select('*')
        .eq('id', id)
        .eq('restaurant_id', req.auth!.restaurantId)
        .single();

      if (fetchError || !existingSOP) {
        return createSuccessResponse(
          { error: 'SOP document not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Check if approved SOPs can be deleted
      if (existingSOP.status === 'approved' && !req.auth!.permissions.includes('sop:approve')) {
        return createSuccessResponse(
          { error: 'Cannot delete approved SOP without approval permissions' },
          undefined,
          403,
          req.requestId
        );
      }

      // Soft delete the SOP document
      const { data: deletedSOP, error } = await client
        .from('sop_documents')
        .update({ 
          is_active: false,
          updated_by: req.auth!.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Also soft delete related bookmarks and progress records
      await Promise.all([
        client
          .from('user_bookmarks')
          .update({ is_active: false })
          .eq('sop_id', id),
        client
          .from('user_progress')
          .update({ is_active: false })
          .eq('sop_id', id)
      ]);

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'DELETE',
        'sop_documents',
        id,
        existingSOP,
        deletedSOP,
        { 
          action: 'sop_deleted',
          sop_title: existingSOP.title,
          category_id: existingSOP.category_id,
          status: existingSOP.status,
          deletion_type: 'soft_delete'
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        { id, deleted: true },
        'SOP document deleted successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error deleting SOP document:', error);
      return createSuccessResponse(
        { error: 'Failed to delete SOP document' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'admin',
    requiredPermissions: ['sop:delete'],
    rateLimit: {
      maxRequests: 10,
      windowMinutes: 1,
    },
    audit: true,
  }
);