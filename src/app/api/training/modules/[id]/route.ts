/**
 * Training Module Detail API
 * GET /api/training/modules/[id] - Get specific training module
 * PUT /api/training/modules/[id] - Update training module (admin only)
 * DELETE /api/training/modules/[id] - Delete training module (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const moduleId = params.id;
    
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

    // Get module with sections and questions
    const { data: module, error } = await supabase
      .from('training_modules')
      .select(`
        *,
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
          created_at,
          updated_at
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
        ),
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
      `)
      .eq('id', moduleId)
      .eq('restaurant_id', user.restaurant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Training module not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch training module' }, { status: 500 });
    }

    // Process and sort data
    const processedModule = {
      ...module,
      sections: module.sections?.sort((a, b) => a.sort_order - b.sort_order) || [],
      questions: module.questions?.filter(q => q.is_active)?.sort((a, b) => a.sort_order - b.sort_order) || []
    };

    return NextResponse.json({
      success: true,
      data: processedModule
    });

  } catch (error) {
    console.error('Training module detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const moduleId = params.id;
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info and check permissions
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user || !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const updateData = {
      ...body,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.restaurant_id;
    delete updateData.created_at;
    delete updateData.created_by;
    delete updateData.sections;
    delete updateData.questions;

    const { data: module, error } = await supabase
      .from('training_modules')
      .update(updateData)
      .eq('id', moduleId)
      .eq('restaurant_id', user.restaurant_id)
      .select()
      .single();

    if (error) {
      console.error('Module update error:', error);
      return NextResponse.json({ error: 'Failed to update training module' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: module,
      message: 'Training module updated successfully'
    });

  } catch (error) {
    console.error('Training module update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const moduleId = params.id;
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info and check permissions
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if module has any training progress (don't allow deletion if users have started)
    const { data: progressExists, error: progressError } = await supabase
      .from('user_training_progress')
      .select('id')
      .eq('module_id', moduleId)
      .limit(1);

    if (progressError) {
      console.error('Progress check error:', progressError);
      return NextResponse.json({ error: 'Failed to check module usage' }, { status: 500 });
    }

    if (progressExists && progressExists.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete module with existing training progress. Set inactive instead.' 
      }, { status: 400 });
    }

    // Delete module (cascade will handle related records)
    const { error } = await supabase
      .from('training_modules')
      .delete()
      .eq('id', moduleId)
      .eq('restaurant_id', user.restaurant_id);

    if (error) {
      console.error('Module deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete training module' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Training module deleted successfully'
    });

  } catch (error) {
    console.error('Training module deletion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}