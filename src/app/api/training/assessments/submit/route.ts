/**
 * Submit Training Assessment API
 * POST /api/training/assessments/submit - Submit assessment answers and get results
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface AssessmentResponse {
  question_id: string;
  user_answer: string;
  time_spent_seconds: number;
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
    const { assessment_id, responses }: { assessment_id: string; responses: AssessmentResponse[] } = body;

    if (!assessment_id || !responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Assessment ID and responses are required' }, { status: 400 });
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

    // Get assessment and verify ownership/permissions
    const { data: assessment, error: assessmentError } = await supabase
      .from('training_assessments')
      .select(`
        *,
        module:training_modules(
          id,
          restaurant_id,
          passing_score,
          validity_days
        )
      `)
      .eq('id', assessment_id)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Check permissions
    if (assessment.user_id !== session.user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify module belongs to user's restaurant
    if (assessment.module.restaurant_id !== user.restaurant_id) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Check if assessment is already completed
    if (assessment.status !== 'pending') {
      return NextResponse.json({ error: 'Assessment already completed' }, { status: 400 });
    }

    // Get all questions for this assessment
    const { data: questions, error: questionsError } = await supabase
      .from('training_questions')
      .select('*')
      .eq('module_id', assessment.module_id)
      .eq('is_active', true);

    if (questionsError || !questions) {
      console.error('Questions fetch error:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // Create a map of questions for easy lookup
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Validate and score responses
    const scoredResponses = [];
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const response of responses) {
      const question = questionMap.get(response.question_id);
      if (!question) {
        console.warn(`Question not found: ${response.question_id}`);
        continue;
      }

      totalPoints += question.points;

      // Determine if answer is correct
      let isCorrect = false;
      let pointsEarned = 0;

      if (question.question_type === 'multiple_choice') {
        isCorrect = response.user_answer === question.correct_answer;
      } else if (question.question_type === 'true_false') {
        isCorrect = response.user_answer.toLowerCase() === question.correct_answer.toLowerCase();
      } else if (question.question_type === 'short_answer') {
        // For short answer, do basic text comparison (could be enhanced with fuzzy matching)
        const userAnswer = response.user_answer.toLowerCase().trim();
        const correctAnswer = question.correct_answer.toLowerCase().trim();
        isCorrect = userAnswer === correctAnswer || userAnswer.includes(correctAnswer);
      }

      if (isCorrect) {
        pointsEarned = question.points;
        earnedPoints += pointsEarned;
      }

      scoredResponses.push({
        question_id: response.question_id,
        user_answer: response.user_answer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        time_spent_seconds: response.time_spent_seconds || 0
      });
    }

    // Calculate score percentage
    const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const correctAnswers = scoredResponses.filter(r => r.is_correct).length;
    const passingScore = assessment.module.passing_score;
    const passed = scorePercentage >= passingScore;

    // Calculate time spent (convert from start time)
    const timeSpentMinutes = Math.round(
      (Date.now() - new Date(assessment.started_at).getTime()) / (1000 * 60)
    );

    // Update assessment
    const currentTime = new Date().toISOString();
    const { data: updatedAssessment, error: updateError } = await supabase
      .from('training_assessments')
      .update({
        status: passed ? 'passed' : 'failed',
        correct_answers: correctAnswers,
        score_percentage: scorePercentage,
        time_spent_minutes: timeSpentMinutes,
        completed_at: currentTime
      })
      .eq('id', assessment_id)
      .select()
      .single();

    if (updateError) {
      console.error('Assessment update error:', updateError);
      return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
    }

    // Insert question responses
    const responsesToInsert = scoredResponses.map(r => ({
      assessment_id,
      question_id: r.question_id,
      user_answer: r.user_answer,
      is_correct: r.is_correct,
      points_earned: r.points_earned,
      time_spent_seconds: r.time_spent_seconds,
      answered_at: currentTime
    }));

    const { error: responsesError } = await supabase
      .from('training_question_responses')
      .insert(responsesToInsert);

    if (responsesError) {
      console.error('Responses insert error:', responsesError);
      // Don't fail the request, but log the error
    }

    // If passed, create certificate
    if (passed) {
      try {
        // Generate certificate number
        const { data: certificateNumber, error: certNumError } = await supabase
          .rpc('generate_certificate_number', {
            p_restaurant_id: user.restaurant_id,
            p_module_id: assessment.module_id,
            p_user_id: assessment.user_id
          });

        if (certNumError) {
          console.error('Certificate number generation error:', certNumError);
        } else {
          // Calculate expiry date
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + assessment.module.validity_days);

          // Create certificate
          const certificateData = {
            user_name: user.full_name || 'Unknown User',
            module_title: assessment.module.title,
            score_percentage: scorePercentage,
            completed_date: currentTime,
            expiry_date: expiryDate.toISOString(),
            certificate_number: certificateNumber
          };

          const { error: certificateError } = await supabase
            .from('training_certificates')
            .insert({
              user_id: assessment.user_id,
              module_id: assessment.module_id,
              assessment_id: assessment_id,
              certificate_number: certificateNumber,
              status: 'active',
              issued_at: currentTime,
              expires_at: expiryDate.toISOString(),
              certificate_data: certificateData
            });

          if (certificateError) {
            console.error('Certificate creation error:', certificateError);
          }
        }
      } catch (error) {
        console.error('Certificate generation process error:', error);
      }
    }

    // Prepare detailed results (include explanations for review)
    const detailedResults = scoredResponses.map(r => {
      const question = questionMap.get(r.question_id);
      return {
        ...r,
        question: question ? {
          id: question.id,
          question: question.question,
          question_th: question.question_th,
          question_type: question.question_type,
          options: question.options,
          options_th: question.options_th,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          explanation_th: question.explanation_th,
          difficulty: question.difficulty,
          points: question.points
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedAssessment,
        detailed_results: detailedResults,
        total_points: totalPoints,
        earned_points: earnedPoints,
        passed
      },
      message: passed ? 'Assessment passed successfully!' : 'Assessment completed. Review and retake if needed.'
    });

  } catch (error) {
    console.error('Submit assessment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}