/**
 * Individual SOP Bookmark API endpoints
 * GET /api/sop/bookmarks/[id] - Get single bookmark
 * PUT /api/sop/bookmarks/[id] - Update bookmark
 * DELETE /api/sop/bookmarks/[id] - Delete bookmark
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
import { UpdateBookmarkRequest, BookmarkResponse } from '@/types/api';

/**
 * GET /api/sop/bookmarks/[id]
 * Get a single bookmark by ID
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid bookmark ID format' },
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

      // Fetch bookmark with SOP and category data
      const { data: bookmark, error } = await client
        .from('user_bookmarks')
        .select(`
          id,
          sop_id,
          user_id,
          notes,
          notes_th,
          created_at,
          updated_at,
          sop:sop_documents(
            id,
            title,
            title_th,
            category_id,
            status,
            priority,
            content,
            content_th,
            tags,
            tags_th,
            updated_at,
            category:sop_categories(
              id,
              name,
              name_th,
              icon,
              color,
              description,
              description_th
            )
          )
        `)
        .eq('id', id)
        .eq('user_id', req.auth!.user.id)
        .eq('is_active', true)
        .single();

      if (error || !bookmark || !bookmark.sop) {
        return createSuccessResponse(
          { error: 'Bookmark not found' },
          undefined,
          404,
          req.requestId
        );
      }

      const response: BookmarkResponse = {
        id: bookmark.id,
        sopId: bookmark.sop_id,
        userId: bookmark.user_id,
        notes: bookmark.notes,
        notesTh: bookmark.notes_th,
        createdAt: bookmark.created_at,
        updatedAt: bookmark.updated_at,
        sop: {
          id: bookmark.sop.id,
          title: bookmark.sop.title,
          title_th: bookmark.sop.title_th,
          category_id: bookmark.sop.category_id,
          status: bookmark.sop.status,
          priority: bookmark.sop.priority,
        },
        category: {
          id: bookmark.sop.category.id,
          name: bookmark.sop.category.name,
          name_th: bookmark.sop.category.name_th,
          icon: bookmark.sop.category.icon,
          color: bookmark.sop.category.color,
        },
      };

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'VIEW',
        'user_bookmarks',
        id,
        undefined,
        undefined,
        { 
          action: 'bookmark_viewed',
          sop_id: bookmark.sop_id,
          sop_title: bookmark.sop.title
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        response,
        'Bookmark retrieved successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching bookmark:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch bookmark' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['bookmark:read'],
    rateLimit: {
      maxRequests: 100,
      windowMinutes: 1,
    },
    audit: true,
  }
);

/**
 * PUT /api/sop/bookmarks/[id]
 * Update an existing bookmark
 */
export const PUT = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const updateData: UpdateBookmarkRequest = req.validatedBody;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid bookmark ID format' },
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

      // Fetch existing bookmark for validation and audit trail
      const { data: existingBookmark, error: fetchError } = await client
        .from('user_bookmarks')
        .select(`
          *,
          sop:sop_documents(
            id,
            title,
            title_th,
            category_id,
            status,
            priority,
            category:sop_categories(
              id,
              name,
              name_th,
              icon,
              color
            )
          )
        `)
        .eq('id', id)
        .eq('user_id', req.auth!.user.id)
        .eq('is_active', true)
        .single();

      if (fetchError || !existingBookmark || !existingBookmark.sop) {
        return createSuccessResponse(
          { error: 'Bookmark not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Update the bookmark
      const { data: updatedBookmark, error } = await client
        .from('user_bookmarks')
        .update({
          notes: updateData.notes,
          notes_th: updateData.notesTh,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const response: BookmarkResponse = {
        id: updatedBookmark.id,
        sopId: updatedBookmark.sop_id,
        userId: updatedBookmark.user_id,
        notes: updatedBookmark.notes,
        notesTh: updatedBookmark.notes_th,
        createdAt: updatedBookmark.created_at,
        updatedAt: updatedBookmark.updated_at,
        sop: {
          id: existingBookmark.sop.id,
          title: existingBookmark.sop.title,
          title_th: existingBookmark.sop.title_th,
          category_id: existingBookmark.sop.category_id,
          status: existingBookmark.sop.status,
          priority: existingBookmark.sop.priority,
        },
        category: {
          id: existingBookmark.sop.category.id,
          name: existingBookmark.sop.category.name,
          name_th: existingBookmark.sop.category.name_th,
          icon: existingBookmark.sop.category.icon,
          color: existingBookmark.sop.category.color,
        },
      };

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'UPDATE',
        'user_bookmarks',
        id,
        existingBookmark,
        updatedBookmark,
        { 
          action: 'bookmark_updated',
          sop_id: existingBookmark.sop_id,
          sop_title: existingBookmark.sop.title,
          changes: ['notes', 'notes_th'].filter(field => 
            updateData[field as keyof UpdateBookmarkRequest] !== undefined
          )
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        response,
        'Bookmark updated successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error updating bookmark:', error);
      return createSuccessResponse(
        { error: 'Failed to update bookmark' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['bookmark:update'],
    rateLimit: {
      maxRequests: 30,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.updateBookmark,
    },
    audit: true,
  }
);

/**
 * DELETE /api/sop/bookmarks/[id]
 * Delete a bookmark (soft delete by setting is_active to false)
 */
export const DELETE = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const { id } = params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createSuccessResponse(
        { error: 'Invalid bookmark ID format' },
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

      // Check if bookmark exists and belongs to user
      const { data: existingBookmark, error: fetchError } = await client
        .from('user_bookmarks')
        .select(`
          *,
          sop:sop_documents(
            id,
            title,
            title_th
          )
        `)
        .eq('id', id)
        .eq('user_id', req.auth!.user.id)
        .eq('is_active', true)
        .single();

      if (fetchError || !existingBookmark) {
        return createSuccessResponse(
          { error: 'Bookmark not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Soft delete the bookmark
      const { data: deletedBookmark, error } = await client
        .from('user_bookmarks')
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
        'user_bookmarks',
        id,
        existingBookmark,
        deletedBookmark,
        { 
          action: 'bookmark_deleted',
          sop_id: existingBookmark.sop_id,
          sop_title: existingBookmark.sop?.title,
          deletion_type: 'soft_delete'
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        { id, deleted: true },
        'Bookmark deleted successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error deleting bookmark:', error);
      return createSuccessResponse(
        { error: 'Failed to delete bookmark' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['bookmark:delete'],
    rateLimit: {
      maxRequests: 30,
      windowMinutes: 1,
    },
    audit: true,
  }
);