/**
 * User Progress Tracking API endpoints
 * GET /api/sop/user/progress - Get user's training progress across all SOPs
 * POST /api/sop/user/progress - Update user progress for a specific SOP
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
import { 
  UserProgressResponse, 
  CategoryProgress, 
  ProgressActivity,
  UpdateProgressRequest 
} from '@/types/api';

/**
 * GET /api/sop/user/progress
 * Get comprehensive user progress across all SOPs
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || req.auth!.user.id;

    // Only allow users to view their own progress unless they have admin permissions
    if (userId !== req.auth!.user.id && !req.auth!.permissions.includes('progress:read')) {
      return createSuccessResponse(
        { error: 'Insufficient permissions to view other users progress' },
        undefined,
        403,
        req.requestId
      );
    }

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Get overall progress statistics
      const [
        totalSOPsResult,
        progressStatsResult,
        bookmarksResult,
        categoryProgressResult,
        recentActivityResult
      ] = await Promise.all([
        // Total active SOPs in restaurant
        client
          .from('sop_documents')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', req.auth!.restaurantId)
          .eq('is_active', true)
          .eq('status', 'approved'),

        // User's progress statistics
        client
          .from('user_progress')
          .select(`
            id,
            action,
            created_at,
            sop:sop_documents(
              id,
              title,
              title_th,
              category_id
            )
          `)
          .eq('user_id', userId)
          .eq('restaurant_id', req.auth!.restaurantId)
          .eq('is_active', true),

        // User's bookmarks count
        client
          .from('user_bookmarks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('restaurant_id', req.auth!.restaurantId)
          .eq('is_active', true),

        // Progress by category
        client
          .from('sop_categories')
          .select(`
            id,
            name,
            name_th,
            sop_documents!inner(
              id,
              status,
              user_progress(
                id,
                action,
                user_id
              )
            )
          `)
          .eq('is_active', true)
          .eq('sop_documents.restaurant_id', req.auth!.restaurantId)
          .eq('sop_documents.is_active', true)
          .eq('sop_documents.status', 'approved'),

        // Recent activity (last 20 actions)
        client
          .from('user_progress')
          .select(`
            id,
            action,
            created_at,
            duration,
            sop:sop_documents(
              id,
              title,
              title_th,
              category_id
            )
          `)
          .eq('user_id', userId)
          .eq('restaurant_id', req.auth!.restaurantId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      const totalSOPs = totalSOPsResult.count || 0;
      const progressStats = progressStatsResult.data || [];
      const bookmarksCount = bookmarksResult.count || 0;
      const categoryData = categoryProgressResult.data || [];
      const recentActivity = recentActivityResult.data || [];

      // Calculate viewed and completed SOPs
      const uniqueViewedSOPs = new Set(
        progressStats
          .filter(p => ['viewed', 'completed'].includes(p.action))
          .map(p => p.sop?.id)
          .filter(Boolean)
      );

      const uniqueCompletedSOPs = new Set(
        progressStats
          .filter(p => p.action === 'completed')
          .map(p => p.sop?.id)
          .filter(Boolean)
      );

      const viewedSOPs = uniqueViewedSOPs.size;
      const completedSOPs = uniqueCompletedSOPs.size;

      // Calculate progress by category
      const categoryProgress: CategoryProgress[] = categoryData.map(category => {
        const categorySOPs = category.sop_documents || [];
        const totalCategorySOPs = categorySOPs.length;
        
        const viewedInCategory = new Set(
          categorySOPs
            .filter(sop => 
              sop.user_progress?.some(p => 
                p.user_id === userId && ['viewed', 'completed'].includes(p.action)
              )
            )
            .map(sop => sop.id)
        ).size;

        const completedInCategory = new Set(
          categorySOPs
            .filter(sop => 
              sop.user_progress?.some(p => 
                p.user_id === userId && p.action === 'completed'
              )
            )
            .map(sop => sop.id)
        ).size;

        return {
          categoryId: category.id,
          categoryName: category.name,
          categoryNameTh: category.name_th,
          totalSOPs: totalCategorySOPs,
          viewedSOPs: viewedInCategory,
          completedSOPs: completedInCategory,
          completionPercentage: totalCategorySOPs > 0 
            ? Math.round((completedInCategory / totalCategorySOPs) * 100)
            : 0,
        };
      });

      // Transform recent activity
      const progressActivity: ProgressActivity[] = recentActivity.map(activity => ({
        id: activity.id,
        sopId: activity.sop?.id || '',
        sopTitle: activity.sop?.title || '',
        sopTitleTh: activity.sop?.title_th || '',
        action: activity.action as 'viewed' | 'completed' | 'bookmarked' | 'downloaded',
        timestamp: activity.created_at,
        duration: activity.duration,
      }));

      // Get last active timestamp
      const lastActiveAt = progressStats.length > 0 
        ? Math.max(...progressStats.map(p => new Date(p.created_at).getTime()))
        : Date.now();

      const response: UserProgressResponse = {
        userId,
        restaurantId: req.auth!.restaurantId,
        totalSOPs,
        viewedSOPs,
        completedSOPs,
        bookmarkedSOPs: bookmarksCount,
        progressByCategory: categoryProgress,
        recentActivity: progressActivity,
        completionPercentage: totalSOPs > 0 ? Math.round((completedSOPs / totalSOPs) * 100) : 0,
        lastActiveAt: new Date(lastActiveAt).toISOString(),
      };

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'VIEW',
        'user_progress',
        undefined,
        undefined,
        undefined,
        { 
          action: 'progress_viewed',
          target_user_id: userId,
          total_sops: totalSOPs,
          viewed_sops: viewedSOPs,
          completed_sops: completedSOPs,
          completion_percentage: response.completionPercentage
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        response,
        'User progress retrieved successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching user progress:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch user progress' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['progress:read'],
    rateLimit: {
      maxRequests: 60,
      windowMinutes: 1,
    },
    audit: true,
  }
);

/**
 * POST /api/sop/user/progress
 * Update user progress for a specific SOP
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    const progressData: UpdateProgressRequest = req.validatedBody;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Verify SOP exists and is accessible
      const { data: sop, error: sopError } = await client
        .from('sop_documents')
        .select('id, title, title_th, category_id, status')
        .eq('id', progressData.sopId)
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

      // Map action types
      const actionMap: Record<string, string> = {
        'view': 'viewed',
        'complete': 'completed',
        'bookmark': 'bookmarked',
        'download': 'downloaded',
      };

      const dbAction = actionMap[progressData.action];
      if (!dbAction) {
        return createSuccessResponse(
          { error: 'Invalid action type' },
          undefined,
          400,
          req.requestId
        );
      }

      // Check if this exact progress entry already exists recently (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentProgress } = await client
        .from('user_progress')
        .select('id')
        .eq('user_id', req.auth!.user.id)
        .eq('sop_id', progressData.sopId)
        .eq('action', dbAction)
        .gte('created_at', oneHourAgo)
        .limit(1);

      if (recentProgress && recentProgress.length > 0) {
        // Update existing recent entry instead of creating duplicate
        const { data: updatedProgress, error } = await client
          .from('user_progress')
          .update({
            duration: progressData.duration,
            notes: progressData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recentProgress[0].id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return createSuccessResponse(
          { 
            id: updatedProgress.id,
            action: dbAction,
            updated: true 
          },
          'Progress updated successfully',
          200,
          req.requestId
        );
      }

      // Create new progress entry
      const { data: newProgress, error } = await client
        .from('user_progress')
        .insert({
          user_id: req.auth!.user.id,
          sop_id: progressData.sopId,
          restaurant_id: req.auth!.restaurantId,
          action: dbAction,
          duration: progressData.duration,
          notes: progressData.notes,
          created_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update specific progress timestamps based on action
      const updateFields: any = {};
      switch (dbAction) {
        case 'viewed':
          updateFields.viewed_at = new Date().toISOString();
          break;
        case 'completed':
          updateFields.completed_at = new Date().toISOString();
          updateFields.viewed_at = new Date().toISOString(); // Mark as viewed too
          break;
        case 'bookmarked':
          // Handle bookmark creation separately
          try {
            await client
              .from('user_bookmarks')
              .upsert({
                user_id: req.auth!.user.id,
                sop_id: progressData.sopId,
                restaurant_id: req.auth!.restaurantId,
                is_active: true,
                notes: progressData.notes,
              }, {
                onConflict: 'user_id,sop_id'
              });
          } catch (bookmarkError) {
            console.warn('Failed to create bookmark:', bookmarkError);
          }
          break;
        case 'downloaded':
          updateFields.downloaded_at = new Date().toISOString();
          break;
      }

      // Update progress summary if needed
      if (Object.keys(updateFields).length > 0) {
        await client
          .from('user_progress_summary')
          .upsert({
            user_id: req.auth!.user.id,
            sop_id: progressData.sopId,
            restaurant_id: req.auth!.restaurantId,
            ...updateFields,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,sop_id'
          });
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'UPDATE',
        'user_progress',
        newProgress.id,
        undefined,
        newProgress,
        { 
          action: 'progress_updated',
          sop_id: progressData.sopId,
          sop_title: sop.title,
          progress_action: dbAction,
          duration: progressData.duration
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        { 
          id: newProgress.id,
          action: dbAction,
          created: true 
        },
        `Progress ${dbAction} recorded successfully`,
        201,
        req.requestId
      );

    } catch (error) {
      console.error('Error updating user progress:', error);
      return createSuccessResponse(
        { error: 'Failed to update user progress' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['progress:update'],
    rateLimit: {
      maxRequests: 100,
      windowMinutes: 1, // Allow frequent progress updates
    },
    validation: {
      body: validationSchemas.updateProgress,
    },
    audit: true,
  }
);