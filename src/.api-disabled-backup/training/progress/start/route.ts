/**
 * Start Training API endpoint
 * POST /api/training/progress/start - Start a new training session
 */

import { NextRequest } from 'next/server';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  createSuccessResponse,
  logAuditEvent,
  getClientIP
} from '@/lib/api/utils';
import { createAuthenticatedClient } from '@/lib/supabase/client';
import { validationSchemas } from '@/lib/validations';
import { StartTrainingRequest } from '@/types/database';

/**
 * POST /api/training/progress/start
 * Start a new training session for a module
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    const { module_id }: StartTrainingRequest = req.validatedBody;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Verify module exists and is active
      const { data: module, error: moduleError } = await client
        .from('training_modules')
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
            sort_order
          )
        `)
        .eq('id', module_id)
        .eq('restaurant_id', req.auth!.restaurantId)
        .eq('is_active', true)
        .single();

      if (moduleError || !module) {
        return createSuccessResponse(
          { error: 'Training module not found or inactive' },
          undefined,
          404,
          req.requestId
        );
      }

      // Check if user has an existing incomplete progress for this module
      const { data: existingProgress } = await client
        .from('user_training_progress')
        .select('*')
        .eq('user_id', req.auth!.user.id)
        .eq('module_id', module_id)
        .in('status', ['not_started', 'in_progress'])
        .order('attempt_number', { ascending: false })
        .limit(1);

      let progress;
      let isNewAttempt = false;

      if (existingProgress && existingProgress.length > 0) {
        // Resume existing progress
        const existing = existingProgress[0];
        
        // Update last accessed time
        const { data: updatedProgress, error: updateError } = await client
          .from('user_training_progress')
          .update({
            status: 'in_progress',
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select(`
            *,
            module:training_modules(
              id,
              title,
              title_th,
              duration_minutes,
              passing_score,
              max_attempts,
              validity_days
            ),
            current_section:training_sections(
              id,
              section_number,
              title,
              title_th
            )
          `)
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        progress = updatedProgress;
      } else {
        // Check if user has failed attempts and if they've exceeded max attempts
        const { data: failedAttempts } = await client
          .from('user_training_progress')
          .select('attempt_number')
          .eq('user_id', req.auth!.user.id)
          .eq('module_id', module_id)
          .eq('status', 'failed')
          .order('attempt_number', { ascending: false });

        const maxAttempts = module.max_attempts || 3;
        const lastAttemptNumber = failedAttempts?.length > 0 ? failedAttempts[0].attempt_number : 0;

        if (lastAttemptNumber >= maxAttempts) {
          return createSuccessResponse(
            { error: `Maximum attempts (${maxAttempts}) exceeded for this training module` },
            undefined,
            400,
            req.requestId
          );
        }

        // Find the first section to start with
        const firstSection = module.sections && module.sections.length > 0 
          ? module.sections.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]
          : null;

        // Create new progress record
        const { data: newProgress, error: createError } = await client
          .from('user_training_progress')
          .insert({
            user_id: req.auth!.user.id,
            module_id: module_id,
            status: 'in_progress',
            progress_percentage: 0,
            current_section_id: firstSection?.id,
            started_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
            time_spent_minutes: 0,
            attempt_number: lastAttemptNumber + 1,
          })
          .select(`
            *,
            module:training_modules(
              id,
              title,
              title_th,
              duration_minutes,
              passing_score,
              max_attempts,
              validity_days
            ),
            current_section:training_sections(
              id,
              section_number,
              title,
              title_th
            )
          `)
          .single();

        if (createError) {
          throw new Error(createError.message);
        }

        progress = newProgress;
        isNewAttempt = true;
      }

      // Check if this is a mandatory training
      const isMandatory = module.is_mandatory;
      
      // Create reminder for mandatory training completion if needed
      if (isMandatory && isNewAttempt) {
        // Calculate due date (e.g., 30 days from start)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        await client
          .from('training_reminders')
          .insert({
            user_id: req.auth!.user.id,
            module_id: module_id,
            reminder_type: 'mandatory',
            title: `Complete Mandatory Training: ${module.title}`,
            title_th: `การฝึกอบรมบังคับ: ${module.title_th}`,
            message: `Please complete the mandatory training "${module.title}" by ${dueDate.toLocaleDateString()}.`,
            message_th: `กรุณาเสร็จสิ้นการฝึกอบรมบังคับ "${module.title_th}" ภายในวันที่ ${dueDate.toLocaleDateString()}.`,
            scheduled_for: dueDate.toISOString(),
          });
      }

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'CREATE',
        'user_training_progress',
        progress.id,
        undefined,
        progress,
        { 
          action: isNewAttempt ? 'training_started' : 'training_resumed',
          module_id: module_id,
          module_title: module.title,
          attempt_number: progress.attempt_number,
          is_mandatory: isMandatory,
          first_section_id: progress.current_section_id
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        {
          progress,
          module: {
            ...module,
            sections: module.sections?.sort((a: any, b: any) => a.sort_order - b.sort_order)
          },
          isNewAttempt,
          remainingAttempts: Math.max(0, (module.max_attempts || 3) - progress.attempt_number)
        },
        isNewAttempt ? 'Training started successfully' : 'Training resumed successfully',
        201,
        req.requestId
      );

    } catch (error) {
      console.error('Error starting training:', error);
      return createSuccessResponse(
        { error: 'Failed to start training session' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['training:progress'],
    rateLimit: {
      maxRequests: 50,
      windowMinutes: 1,
    },
    validation: {
      body: validationSchemas.startTraining,
    },
    audit: true,
  }
);