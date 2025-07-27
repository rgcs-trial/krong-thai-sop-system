/**
 * Start Training Session API
 * POST /api/training/progress/start - Start a new training session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { module_id, user_id = session.user.id } = body;

    if (!module_id) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions for starting training for other users
    if (user_id !== session.user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify module exists and is active
    const { data: module, error: moduleError } = await supabase
      .from('training_modules')
      .select(`
        id,
        restaurant_id,
        title,
        title_th,
        description,
        description_th,
        duration_minutes,
        passing_score,
        max_attempts,
        is_mandatory,
        is_active,
        sections:training_sections(
          id,
          section_number,
          title,
          title_th,
          is_required,
          sort_order
        )
      `)
      .eq('id', module_id)
      .eq('restaurant_id', user.restaurant_id)
      .eq('is_active', true)
      .single();

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Training module not found or inactive' }, { status: 404 });
    }

    // Check for existing progress
    const { data: existingProgress, error: progressError } = await supabase
      .from('user_training_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('module_id', module_id)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (progressError) {
      console.error('Progress check error:', progressError);
      return NextResponse.json({ error: 'Failed to check existing progress' }, { status: 500 });
    }

    let progress;
    const currentTime = new Date().toISOString();

    // Sort sections to get the first one
    const sortedSections = module.sections?.sort((a, b) => a.sort_order - b.sort_order) || [];
    const firstSection = sortedSections[0];

    if (existingProgress && existingProgress.length > 0) {
      const existing = existingProgress[0];
      
      // Check if we need a new attempt
      if (existing.status === 'completed' || existing.status === 'failed') {
        // Check max attempts
        if (existing.attempt_number >= module.max_attempts) {
          return NextResponse.json({ 
            error: `Maximum attempts (${module.max_attempts}) reached for this module` 
          }, { status: 400 });
        }

        // Create new attempt
        const { data: newProgress, error: newError } = await supabase
          .from('user_training_progress')
          .insert({
            user_id,
            module_id,
            status: 'in_progress',
            progress_percentage: 0,
            current_section_id: firstSection?.id || null,
            started_at: currentTime,
            last_accessed_at: currentTime,
            time_spent_minutes: 0,
            attempt_number: existing.attempt_number + 1
          })
          .select()
          .single();

        if (newError) {
          console.error('New attempt creation error:', newError);
          return NextResponse.json({ error: 'Failed to create new training attempt' }, { status: 500 });
        }

        progress = newProgress;
      } else {
        // Resume existing progress
        const { data: resumedProgress, error: resumeError } = await supabase
          .from('user_training_progress')
          .update({
            status: 'in_progress',
            last_accessed_at: currentTime,
            updated_at: currentTime
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (resumeError) {
          console.error('Progress resume error:', resumeError);
          return NextResponse.json({ error: 'Failed to resume training progress' }, { status: 500 });
        }

        progress = resumedProgress;
      }
    } else {
      // Create new progress
      const { data: newProgress, error: createError } = await supabase
        .from('user_training_progress')
        .insert({
          user_id,
          module_id,
          status: 'in_progress',
          progress_percentage: 0,
          current_section_id: firstSection?.id || null,
          started_at: currentTime,
          last_accessed_at: currentTime,
          time_spent_minutes: 0,
          attempt_number: 1
        })
        .select()
        .single();

      if (createError) {
        console.error('Progress creation error:', createError);
        return NextResponse.json({ error: 'Failed to create training progress' }, { status: 500 });
      }

      progress = newProgress;
    }

    // Get section progress for this training session
    const { data: sectionProgress, error: sectionError } = await supabase
      .from('user_section_progress')
      .select(`
        *,
        section:training_sections(
          id,
          section_number,
          title,
          title_th,
          is_required
        )
      `)
      .eq('progress_id', progress.id);

    if (sectionError) {
      console.error('Section progress error:', sectionError);
      // Don't fail the request, just log the error
    }

    // Return progress with module and section data
    const result = {
      ...progress,
      module: {
        ...module,
        sections: sortedSections
      },
      section_progress: sectionProgress || []
    };

    return NextResponse.json({
      success: true,
      data: result,
      message: existingProgress && existingProgress.length > 0 ? 'Training resumed' : 'Training started'
    });

  } catch (error) {
    console.error('Start training API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}