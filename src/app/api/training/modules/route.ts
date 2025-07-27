/**
 * Training Modules API Endpoints
 * GET /api/training/modules - List all training modules
 * POST /api/training/modules - Create new training module (admin only)
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

    // Get user info to determine restaurant_id
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
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
          sort_order
        ),
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
          is_active
        )
      `)
      .eq('restaurant_id', user.restaurant_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`title.ilike.%${search}%,title_th.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const mandatory = searchParams.get('mandatory');
    if (mandatory === 'true') {
      query = query.eq('is_mandatory', true);
    }

    const sopId = searchParams.get('sop_id');
    if (sopId) {
      query = query.eq('sop_document_id', sopId);
    }

    const { data: modules, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch training modules' }, { status: 500 });
    }

    // Sort sections and questions within each module
    const processedModules = modules?.map(module => ({
      ...module,
      sections: module.sections?.sort((a, b) => a.sort_order - b.sort_order) || [],
      questions: module.questions?.filter(q => q.is_active)?.sort((a, b) => a.sort_order - b.sort_order) || []
    })) || [];

    return NextResponse.json({
      success: true,
      data: processedModules,
      total: processedModules.length
    });

  } catch (error) {
    console.error('Training modules API error:', error);
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
    const {
      sop_document_id,
      title,
      title_th,
      description,
      description_th,
      duration_minutes = 30,
      passing_score = 80,
      max_attempts = 3,
      validity_days = 365,
      is_mandatory = false,
      sections = [],
      questions = []
    } = body;

    // Validate required fields
    if (!sop_document_id || !title || !title_th) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Start transaction
    const { data: module, error: moduleError } = await supabase
      .from('training_modules')
      .insert({
        restaurant_id: user.restaurant_id,
        sop_document_id,
        title,
        title_th,
        description,
        description_th,
        duration_minutes,
        passing_score,
        max_attempts,
        validity_days,
        is_mandatory,
        created_by: user.id
      })
      .select()
      .single();

    if (moduleError) {
      console.error('Module creation error:', moduleError);
      return NextResponse.json({ error: 'Failed to create training module' }, { status: 500 });
    }

    // Insert sections
    if (sections.length > 0) {
      const sectionsToInsert = sections.map((section: any, index: number) => ({
        module_id: module.id,
        section_number: index + 1,
        title: section.title,
        title_th: section.title_th,
        content: section.content,
        content_th: section.content_th,
        media_urls: section.media_urls || [],
        estimated_minutes: section.estimated_minutes || 5,
        is_required: section.is_required !== false,
        sort_order: index
      }));

      const { error: sectionsError } = await supabase
        .from('training_sections')
        .insert(sectionsToInsert);

      if (sectionsError) {
        console.error('Sections creation error:', sectionsError);
        // Don't fail the request, but log the error
      }
    }

    // Insert questions
    if (questions.length > 0) {
      const questionsToInsert = questions.map((question: any, index: number) => ({
        module_id: module.id,
        section_id: question.section_id || null,
        question_type: question.question_type || 'multiple_choice',
        question: question.question,
        question_th: question.question_th,
        options: question.options || null,
        options_th: question.options_th || null,
        correct_answer: question.correct_answer,
        explanation: question.explanation || null,
        explanation_th: question.explanation_th || null,
        points: question.points || 1,
        difficulty: question.difficulty || 'medium',
        sort_order: index
      }));

      const { error: questionsError } = await supabase
        .from('training_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Questions creation error:', questionsError);
        // Don't fail the request, but log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: module,
      message: 'Training module created successfully'
    });

  } catch (error) {
    console.error('Training module creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}