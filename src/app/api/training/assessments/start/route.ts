/**
 * Start Training Assessment API
 * POST /api/training/assessments/start - Start a new assessment
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

    // Check permissions for starting assessment for other users
    if (user_id !== session.user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify module exists and is active
    const { data: module, error: moduleError } = await supabase
      .from('training_modules')
      .select('*')
      .eq('id', module_id)
      .eq('restaurant_id', user.restaurant_id)
      .eq('is_active', true)
      .single();

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Training module not found or inactive' }, { status: 404 });
    }

    // Check if user has training progress for this module
    const { data: progress, error: progressError } = await supabase
      .from('user_training_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('module_id', module_id)
      .eq('status', 'completed')
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (progressError) {
      console.error('Progress check error:', progressError);
      return NextResponse.json({ error: 'Failed to check training progress' }, { status: 500 });
    }

    if (!progress || progress.length === 0) {
      return NextResponse.json({ 
        error: 'You must complete the training module before taking the assessment' 
      }, { status: 400 });
    }

    const latestProgress = progress[0];

    // Check for existing assessments
    const { data: existingAssessments, error: assessmentError } = await supabase
      .from('training_assessments')
      .select('*')
      .eq('user_id', user_id)
      .eq('module_id', module_id)
      .order('attempt_number', { ascending: false });

    if (assessmentError) {
      console.error('Assessment check error:', assessmentError);
      return NextResponse.json({ error: 'Failed to check existing assessments' }, { status: 500 });
    }

    // Check if user has already passed
    const passedAssessment = existingAssessments?.find(a => a.status === 'passed');
    if (passedAssessment) {
      return NextResponse.json({ 
        error: 'You have already passed the assessment for this module' 
      }, { status: 400 });
    }

    // Check max attempts
    const attemptNumber = (existingAssessments?.length || 0) + 1;
    if (attemptNumber > module.max_attempts) {
      return NextResponse.json({ 
        error: `Maximum attempts (${module.max_attempts}) reached for this assessment` 
      }, { status: 400 });
    }

    // Get questions for this module
    const { data: questions, error: questionsError } = await supabase
      .from('training_questions')
      .select('*')
      .eq('module_id', module_id)
      .eq('is_active', true)
      .order('sort_order');

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch assessment questions' }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ 
        error: 'No questions available for this assessment' 
      }, { status: 400 });
    }

    // Create new assessment
    const { data: assessment, error: createError } = await supabase
      .from('training_assessments')
      .insert({
        user_id,
        module_id,
        progress_id: latestProgress.id,
        attempt_number: attemptNumber,
        status: 'pending',
        total_questions: questions.length,
        correct_answers: 0,
        score_percentage: 0,
        time_spent_minutes: 0,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Assessment creation error:', createError);
      return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
    }

    // Return assessment without revealing correct answers
    const sanitizedQuestions = questions.map(q => ({
      id: q.id,
      section_id: q.section_id,
      question_type: q.question_type,
      question: q.question,
      question_th: q.question_th,
      options: q.options,
      options_th: q.options_th,
      // Don't include correct_answer in response
      explanation: q.explanation,
      explanation_th: q.explanation_th,
      points: q.points,
      difficulty: q.difficulty,
      sort_order: q.sort_order
    }));

    return NextResponse.json({
      success: true,
      data: {
        assessment,
        questions: sanitizedQuestions,
        module: {
          id: module.id,
          title: module.title,
          title_th: module.title_th,
          passing_score: module.passing_score,
          duration_minutes: module.duration_minutes
        }
      },
      message: 'Assessment started successfully'
    });

  } catch (error) {
    console.error('Start assessment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}