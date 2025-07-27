/**
 * Training Progress API Endpoints
 * GET /api/training/progress - Get user training progress
 * POST /api/training/progress - Create/update training progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { searchParams } = new URL(request.url);
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Determine target user ID (managers can view other users' progress)
    const targetUserId = searchParams.get('user_id') || session.user.id;
    
    // Check permissions for viewing other users' progress
    if (targetUserId !== session.user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get training progress with module details
    let query = supabase
      .from('user_training_progress')
      .select(`
        *,
        module:training_modules(
          id,
          title,
          title_th,
          description,
          description_th,
          duration_minutes,
          passing_score,
          max_attempts,
          validity_days,
          is_mandatory,
          sop_document:sop_documents(
            id,
            title,
            title_th,
            category:sop_categories(
              id,
              name,
              name_th,
              code
            )
          )
        ),
        current_section:training_sections(
          id,
          section_number,
          title,
          title_th
        ),
        section_progress:user_section_progress(
          id,
          section_id,
          is_completed,
          time_spent_minutes,
          completed_at,
          notes,
          section:training_sections(
            id,
            section_number,
            title,
            title_th,
            is_required
          )
        )
      `)
      .eq('user_id', targetUserId)
      .order('updated_at', { ascending: false });

    // Apply filters
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }

    const moduleId = searchParams.get('module_id');
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    }

    const { data: progress, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch training progress' }, { status: 500 });
    }

    // Calculate detailed progress for each record
    const detailedProgress = progress?.map(prog => {
      const completedSections = prog.section_progress?.filter(sp => sp.is_completed) || [];
      const requiredSections = prog.section_progress?.filter(sp => sp.section?.is_required) || [];
      const totalRequiredSections = requiredSections.length;
      const completedRequiredSections = completedSections.filter(sp => sp.section?.is_required).length;

      const calculatedProgress = totalRequiredSections > 0 
        ? Math.round((completedRequiredSections / totalRequiredSections) * 100)
        : 0;

      return {
        ...prog,
        calculated_progress: calculatedProgress,
        total_sections: prog.section_progress?.length || 0,
        completed_sections: completedSections.length,
        required_sections: totalRequiredSections,
        completed_required_sections: completedRequiredSections
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: detailedProgress,
      total: detailedProgress.length
    });

  } catch (error) {
    console.error('Training progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      module_id, 
      user_id = session.user.id,
      progress_percentage,
      current_section_id,
      time_spent_minutes,
      notes 
    } = body;

    // Validate required fields
    if (!module_id) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    // Get user info and check permissions
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can update progress for target user
    if (user_id !== session.user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify module exists and belongs to user's restaurant
    const { data: module, error: moduleError } = await supabase
      .from('training_modules')
      .select('id, restaurant_id')
      .eq('id', module_id)
      .eq('restaurant_id', user.restaurant_id)
      .single();

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Training module not found' }, { status: 404 });
    }

    // Check if progress already exists
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

    const updateData = {
      progress_percentage,
      current_section_id,
      time_spent_minutes,
      last_accessed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;

    if (existingProgress && existingProgress.length > 0) {
      // Update existing progress
      const { data: updatedProgress, error: updateError } = await supabase
        .from('user_training_progress')
        .update(updateData)
        .eq('id', existingProgress[0].id)
        .select()
        .single();

      if (updateError) {
        console.error('Progress update error:', updateError);
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
      }

      result = updatedProgress;
    } else {
      // Create new progress
      const { data: newProgress, error: createError } = await supabase
        .from('user_training_progress')
        .insert({
          user_id,
          module_id,
          status: 'in_progress',
          progress_percentage: progress_percentage || 0,
          current_section_id,
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          time_spent_minutes: time_spent_minutes || 0,
          attempt_number: 1
        })
        .select()
        .single();

      if (createError) {
        console.error('Progress creation error:', createError);
        return NextResponse.json({ error: 'Failed to create progress' }, { status: 500 });
      }

      result = newProgress;
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: existingProgress && existingProgress.length > 0 ? 'Progress updated' : 'Progress created'
    });

  } catch (error) {
    console.error('Training progress POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}