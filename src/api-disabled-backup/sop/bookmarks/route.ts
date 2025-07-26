/**
 * SOP Bookmarks API endpoints
 * GET /api/sop/bookmarks - List user's bookmarked SOPs
 * POST /api/sop/bookmarks - Create new bookmark
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
  isValidUUID
} from '@/lib/api/utils';
import { createAuthenticatedClient } from '@/lib/supabase/client';
import { validationSchemas } from '@/lib/validations';
import { CreateBookmarkRequest, BookmarkResponse } from '@/types/api';
import { SOPStatus, SOPPriority } from '@/types/database';

/**
 * GET /api/sop/bookmarks
 * List user's bookmarked SOPs with filtering and pagination
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    const pagination = extractPaginationParams(searchParams);
    const { sortBy, sortOrder } = extractSortParams(
      searchParams,
      'created_at',
      ['created_at', 'title', 'priority', 'updated_at']
    );

    // Parse filters
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') as SOPStatus;
    const priority = searchParams.get('priority') as SOPPriority;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Build query with joins to get SOP and category data
      let query = client
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
              color
            )
          )
        `, { count: 'exact' })
        .eq('user_id', req.auth!.user.id)
        .eq('is_active', true);

      // Filter out bookmarks where SOP is inactive
      query = query.not('sop', 'is.null');

      // Apply filters through the SOP relationship
      if (categoryId) {
        query = query.eq('sop.category_id', categoryId);
      }

      if (status) {
        query = query.eq('sop.status', status);
      }

      if (priority) {
        query = query.eq('sop.priority', priority);
      }

      // Apply sorting
      let orderColumn: string;
      switch (sortBy) {
        case 'title':
          orderColumn = 'sop.title';
          break;
        case 'priority':
          orderColumn = 'sop.priority';
          break;
        case 'updated_at':
          orderColumn = 'sop.updated_at';
          break;
        default:
          orderColumn = 'created_at';
      }

      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const { data: bookmarks, error, count } = await query
        .range(pagination.offset!, pagination.offset! + pagination.limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      // Filter out bookmarks with null SOPs (inactive SOPs)
      const validBookmarks = (bookmarks || []).filter(bookmark => bookmark.sop);

      // Transform to BookmarkResponse format
      const bookmarkResponses: BookmarkResponse[] = validBookmarks.map(bookmark => ({
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
      }));

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'VIEW',
        'user_bookmarks',
        undefined,
        undefined,
        undefined,
        { 
          action: 'bookmarks_list_viewed',
          filters: { categoryId, status, priority, sortBy, sortOrder },
          pagination,
          result_count: bookmarkResponses.length
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createPaginatedResponse(
        bookmarkResponses,
        {
          page: pagination.page!,
          limit: pagination.limit!,
          total: validBookmarks.length,
        },
        'Bookmarks retrieved successfully',
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch bookmarks' },
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
    validation: {
      query: validationSchemas.bookmarkListParams,
    },
    audit: true,
  }
);

/**
 * POST /api/sop/bookmarks
 * Create a new bookmark for a SOP
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    const bookmarkData: CreateBookmarkRequest = req.validatedBody;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Verify SOP exists and is accessible
      const { data: sop, error: sopError } = await client
        .from('sop_documents')
        .select(`
          id,
          title,
          title_th,
          category_id,
          status,
          priority,
          restaurant_id,
          category:sop_categories(
            id,
            name,
            name_th,
            icon,
            color
          )
        `)
        .eq('id', bookmarkData.sopId)
        .eq('restaurant_id', req.auth!.restaurantId)
        .eq('is_active', true)
        .single();

      if (sopError || !sop) {
        return createSuccessResponse(
          { error: 'SOP not found or not accessible' },
          undefined,
          404,
          req.requestId
        );
      }

      // Check if bookmark already exists
      const { data: existingBookmark } = await client
        .from('user_bookmarks')
        .select('id, is_active')
        .eq('user_id', req.auth!.user.id)
        .eq('sop_id', bookmarkData.sopId)
        .single();

      if (existingBookmark) {
        if (existingBookmark.is_active) {
          return createSuccessResponse(
            { error: 'SOP is already bookmarked' },
            undefined,
            409,
            req.requestId
          );
        } else {
          // Reactivate existing bookmark
          const { data: reactivatedBookmark, error } = await client
            .from('user_bookmarks')
            .update({
              is_active: true,
              notes: bookmarkData.notes,
              notes_th: bookmarkData.notesTh,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBookmark.id)
            .select()
            .single();

          if (error) {
            throw new Error(error.message);
          }

          const response: BookmarkResponse = {
            id: reactivatedBookmark.id,
            sopId: reactivatedBookmark.sop_id,
            userId: reactivatedBookmark.user_id,
            notes: reactivatedBookmark.notes,
            notesTh: reactivatedBookmark.notes_th,
            createdAt: reactivatedBookmark.created_at,
            updatedAt: reactivatedBookmark.updated_at,
            sop: {
              id: sop.id,
              title: sop.title,
              title_th: sop.title_th,
              category_id: sop.category_id,
              status: sop.status,
              priority: sop.priority,
            },
            category: {
              id: sop.category.id,
              name: sop.category.name,
              name_th: sop.category.name_th,
              icon: sop.category.icon,
              color: sop.category.color,
            },
          };

          // Log audit event
          await logAuditEvent(
            req.auth!.restaurantId,
            req.auth!.user.id,
            'UPDATE',
            'user_bookmarks',
            reactivatedBookmark.id,
            { is_active: false },
            reactivatedBookmark,
            { 
              action: 'bookmark_reactivated',
              sop_id: bookmarkData.sopId,
              sop_title: sop.title
            },
            getClientIP(req),
            req.headers.get('user-agent') || undefined,
            req.auth!.sessionId
          );

          return createSuccessResponse(
            response,
            'Bookmark reactivated successfully',
            200,
            req.requestId
          );
        }
      }

      // Create new bookmark
      const { data: newBookmark, error } = await client
        .from('user_bookmarks')
        .insert({
          user_id: req.auth!.user.id,
          sop_id: bookmarkData.sopId,
          restaurant_id: req.auth!.restaurantId,
          notes: bookmarkData.notes,
          notes_th: bookmarkData.notesTh,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const response: BookmarkResponse = {
        id: newBookmark.id,
        sopId: newBookmark.sop_id,
        userId: newBookmark.user_id,
        notes: newBookmark.notes,
        notesTh: newBookmark.notes_th,
        createdAt: newBookmark.created_at,
        updatedAt: newBookmark.updated_at,
        sop: {
          id: sop.id,
          title: sop.title,
          title_th: sop.title_th,
          category_id: sop.category_id,
          status: sop.status,
          priority: sop.priority,
        },
        category: {
          id: sop.category.id,
          name: sop.category.name,
          name_th: sop.category.name_th,
          icon: sop.category.icon,
          color: sop.category.color,
        },
      };

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'CREATE',
        'user_bookmarks',
        newBookmark.id,
        undefined,
        newBookmark,
        { 
          action: 'bookmark_created',
          sop_id: bookmarkData.sopId,
          sop_title: sop.title,
          category_id: sop.category_id
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        response,
        'Bookmark created successfully',
        201,
        req.requestId
      );

    } catch (error) {
      console.error('Error creating bookmark:', error);
      return createSuccessResponse(
        { error: 'Failed to create bookmark' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['bookmark:create'],
    rateLimit: {
      maxRequests: 30,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.createBookmark,
    },
    audit: true,
  }
);