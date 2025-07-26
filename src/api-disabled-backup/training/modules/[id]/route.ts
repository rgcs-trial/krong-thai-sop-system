/**
 * Training Module Details API endpoints
 * GET /api/training/modules/[id] - Get specific training module details
 * PATCH /api/training/modules/[id] - Update training module
 * DELETE /api/training/modules/[id] - Deactivate training module
 */

import { NextRequest } from 'next/server';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  createSuccessResponse,
  logAuditEvent,
  getClientIP
} from '@/lib/api/utils';
import { createAuthenticatedClient } from '@/lib/supabase/client';

/**
 * GET /api/training/modules/[id]
 * Get detailed training module information including sections and questions
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const moduleId = params.id;

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

      // Get module with all related data
      const { data: module, error } = await client
        .from('training_modules')
        .select(`
          *,
          sop_document:sop_documents(
            id,
            title,
            title_th,
            content,
            content_th,
            steps,
            steps_th,
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
          updater:auth_users!training_modules_updated_by_fkey(
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
            content,
            content_th,
            media_urls,
            estimated_minutes,
            is_required,
            sort_order,
            questions:training_questions(
              id,
              question_type,
              question,
              question_th,
              options,
              options_th,
              correct_answer,
              explanation,
              explanation_th,
              points,
              difficulty,
              sort_order,
              is_active
            )
          ),
          questions:training_questions(
            id,
            section_id,
            question_type,
            question,
            question_th,
            options,
            options_th,
            correct_answer,
            explanation,
            explanation_th,
            points,
            difficulty,
            sort_order,
            is_active
          )
        `)
        .eq('id', moduleId)
        .eq('restaurant_id', req.auth.restaurantId)
        .single();

      if (error || !module) {
        return createSuccessResponse(
          { error: 'Training module not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Sort sections and questions by sort_order
      if (module.sections) {
        module.sections.sort((a: any, b: any) => a.sort_order - b.sort_order);
        module.sections.forEach((section: any) => {
          if (section.questions) {
            section.questions.sort((a: any, b: any) => a.sort_order - b.sort_order);
          }
        });
      }

      if (module.questions) {
        module.questions.sort((a: any, b: any) => a.sort_order - b.sort_order);
      }

      // Log audit event
      await logAuditEvent(
        req.auth.restaurantId,
        req.auth.user.id,
        'VIEW',
        'training_modules',
        moduleId,
        undefined,
        undefined,
        { 
          action: 'training_module_viewed',
          module_title: module.title,
          sop_document_id: module.sop_document_id
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth.sessionId
      );

      return createSuccessResponse(
        module,
        'Training module retrieved successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching training module:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch training module' },
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
    audit: true,
  }
);

/**
 * PATCH /api/training/modules/[id]
 * Update training module details
 */
export const PATCH = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const moduleId = params.id;
    const updateData = req.validatedBody;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Get existing module for audit trail
      const { data: existingModule, error: fetchError } = await client
        .from('training_modules')
        .select('*')
        .eq('id', moduleId)
        .eq('restaurant_id', req.auth!.restaurantId)
        .single();

      if (fetchError || !existingModule) {
        return createSuccessResponse(
          { error: 'Training module not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Update module
      const { data: updatedModule, error } = await client
        .from('training_modules')
        .update({
          ...updateData,
          updated_by: req.auth!.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', moduleId)
        .eq('restaurant_id', req.auth!.restaurantId)
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
          updater:auth_users!training_modules_updated_by_fkey(
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
        'UPDATE',
        'training_modules',
        moduleId,
        existingModule,
        updatedModule,
        { 
          action: 'training_module_updated',
          module_title: updatedModule.title,
          changes: Object.keys(updateData)
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        updatedModule,
        'Training module updated successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error updating training module:', error);
      return createSuccessResponse(
        { error: 'Failed to update training module' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'manager',
    requiredPermissions: ['training:update'],
    rateLimit: {
      maxRequests: 50,
      windowMinutes: 1,
    },
    audit: true,
  }
);

/**
 * DELETE /api/training/modules/[id]
 * Deactivate training module (soft delete)
 */
export const DELETE = withMiddleware(
  async (req: EnhancedRequest, { params }: { params: { id: string } }) => {
    const moduleId = params.id;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Get existing module for audit trail
      const { data: existingModule, error: fetchError } = await client
        .from('training_modules')
        .select('*')
        .eq('id', moduleId)
        .eq('restaurant_id', req.auth!.restaurantId)
        .single();

      if (fetchError || !existingModule) {
        return createSuccessResponse(
          { error: 'Training module not found' },
          undefined,
          404,
          req.requestId
        );
      }

      // Check if module has active user progress
      const { data: activeProgress } = await client
        .from('user_training_progress')
        .select('id')
        .eq('module_id', moduleId)
        .in('status', ['in_progress', 'completed'])
        .limit(1);

      if (activeProgress && activeProgress.length > 0) {
        return createSuccessResponse(
          { error: 'Cannot deactivate module with active user progress. Archive instead.' },
          undefined,
          400,
          req.requestId
        );
      }

      // Soft delete by setting is_active to false
      const { data: deactivatedModule, error } = await client
        .from('training_modules')
        .update({
          is_active: false,
          updated_by: req.auth!.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', moduleId)
        .eq('restaurant_id', req.auth!.restaurantId)
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
        'training_modules',
        moduleId,
        existingModule,
        deactivatedModule,
        { 
          action: 'training_module_deactivated',
          module_title: existingModule.title,
          reason: 'Manual deactivation'
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        { message: 'Training module deactivated successfully' },
        'Training module deactivated successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error deactivating training module:', error);
      return createSuccessResponse(
        { error: 'Failed to deactivate training module' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredRole: 'manager',
    requiredPermissions: ['training:delete'],
    rateLimit: {
      maxRequests: 20,
      windowMinutes: 1,
    },
    audit: true,
  }
);