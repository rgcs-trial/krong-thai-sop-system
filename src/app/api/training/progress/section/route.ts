/**
 * Training Section Progress API
 * POST /api/training/progress/section - Update section completion progress
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
    const { 
      progress_id, 
      section_id, 
      time_spent_minutes = 0,
      notes = null,
      is_completed = false
    } = body;

    if (!progress_id || !section_id) {
      return NextResponse.json({ error: 'Progress ID and Section ID are required' }, { status: 400 });
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

    // Verify progress belongs to user or user has permission
    const { data: progress, error: progressError } = await supabase
      .from('user_training_progress')
      .select(`
        *,
        module:training_modules(
          id,
          restaurant_id,
          title,
          title_th
        )
      `)
      .eq('id', progress_id)
      .single();

    if (progressError || !progress) {
      return NextResponse.json({ error: 'Training progress not found' }, { status: 404 });
    }

    // Check permissions
    if (progress.user_id !== session.user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify module belongs to user's restaurant
    if (progress.module.restaurant_id !== user.restaurant_id) {
      return NextResponse.json({ error: 'Training module not found' }, { status: 404 });
    }

    // Verify section belongs to the module
    const { data: section, error: sectionError } = await supabase
      .from('training_sections')
      .select('*')
      .eq('id', section_id)
      .eq('module_id', progress.module_id)
      .single();

    if (sectionError || !section) {
      return NextResponse.json({ error: 'Training section not found' }, { status: 404 });
    }

    const currentTime = new Date().toISOString();

    // Check if section progress already exists
    const { data: existingSectionProgress, error: existingError } = await supabase
      .from('user_section_progress')
      .select('*')
      .eq('user_id', progress.user_id)
      .eq('section_id', section_id)
      .eq('progress_id', progress_id)
      .single();

    let sectionProgress;

    if (existingError && existingError.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Section progress check error:', existingError);
      return NextResponse.json({ error: 'Failed to check section progress' }, { status: 500 });
    }

    if (existingSectionProgress) {
      // Update existing section progress
      const updateData = {
        time_spent_minutes: existingSectionProgress.time_spent_minutes + time_spent_minutes,
        notes: notes || existingSectionProgress.notes,
        is_completed: is_completed || existingSectionProgress.is_completed,
        updated_at: currentTime
      };

      if (is_completed && !existingSectionProgress.is_completed) {
        updateData.completed_at = currentTime;
      }

      const { data: updatedSectionProgress, error: updateError } = await supabase
        .from('user_section_progress')
        .update(updateData)
        .eq('id', existingSectionProgress.id)
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
        .single();

      if (updateError) {
        console.error('Section progress update error:', updateError);
        return NextResponse.json({ error: 'Failed to update section progress' }, { status: 500 });
      }

      sectionProgress = updatedSectionProgress;
    } else {
      // Create new section progress
      const { data: newSectionProgress, error: createError } = await supabase
        .from('user_section_progress')
        .insert({
          user_id: progress.user_id,
          section_id,
          progress_id,
          is_completed,
          time_spent_minutes,
          notes,
          completed_at: is_completed ? currentTime : null
        })
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
        .single();

      if (createError) {
        console.error('Section progress creation error:', createError);
        return NextResponse.json({ error: 'Failed to create section progress' }, { status: 500 });
      }

      sectionProgress = newSectionProgress;
    }

    // If section is completed, recalculate overall module progress
    if (is_completed) {
      // Get all sections for this module
      const { data: allSections, error: sectionsError } = await supabase
        .from('training_sections')
        .select('id, is_required')
        .eq('module_id', progress.module_id);

      if (sectionsError) {
        console.error('Sections fetch error:', sectionsError);
      } else {
        // Get all completed sections for this progress
        const { data: completedSections, error: completedError } = await supabase
          .from('user_section_progress')
          .select('section_id')
          .eq('progress_id', progress_id)
          .eq('is_completed', true);

        if (completedError) {
          console.error('Completed sections fetch error:', completedError);
        } else {
          const requiredSections = allSections.filter(s => s.is_required);
          const completedRequiredSections = completedSections.filter(cs => 
            requiredSections.some(rs => rs.id === cs.section_id)
          );

          const progressPercentage = requiredSections.length > 0 
            ? Math.round((completedRequiredSections.length / requiredSections.length) * 100)
            : 0;

          // Update overall progress
          const updateProgressData = {
            progress_percentage: progressPercentage,
            time_spent_minutes: progress.time_spent_minutes + time_spent_minutes,
            last_accessed_at: currentTime,
            updated_at: currentTime
          };

          // If all required sections are completed, mark module as completed
          if (progressPercentage >= 100) {
            updateProgressData.status = 'completed';
            updateProgressData.completed_at = currentTime;
          }

          await supabase
            .from('user_training_progress')
            .update(updateProgressData)
            .eq('id', progress_id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: sectionProgress,
      message: 'Section progress updated successfully'
    });

  } catch (error) {
    console.error('Section progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}