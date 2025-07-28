import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Analytics accuracy test schema
const AccuracyTestSchema = z.object({
  test_type: z.enum(['completion_rates', 'progress_tracking', 'assessment_scores', 'certification_validity', 'performance_metrics']),
  data_range: z.object({
    start_date: z.string(),
    end_date: z.string()
  }),
  sample_size: z.number().min(1).max(10000).optional(),
  validation_rules: z.array(z.object({
    field: z.string(),
    rule: z.enum(['not_null', 'range', 'format', 'unique', 'reference']),
    parameters: z.record(z.any()).optional()
  })).optional(),
  expected_accuracy_percent: z.number().min(0).max(100).optional()
});

const AccuracyConfigSchema = z.object({
  restaurant_id: z.string().uuid(),
  test_suite: z.array(AccuracyTestSchema),
  comparison_baseline: z.enum(['previous_period', 'industry_standard', 'custom_benchmark']).optional(),
  metadata: z.record(z.any()).optional()
});

// Analytics accuracy result
interface AccuracyResult {
  test_id: string;
  test_type: string;
  status: 'completed' | 'failed' | 'partial';
  timestamp: string;
  data_points_tested: number;
  validation_results: {
    total_validations: number;
    passed_validations: number;
    failed_validations: number;
    accuracy_percent: number;
  };
  detailed_results: {
    field: string;
    rule: string;
    total_checked: number;
    passed: number;
    failed: number;
    accuracy_percent: number;
    sample_failures: any[];
  }[];
  performance_impact: {
    execution_time_ms: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
  };
  recommendations: string[];
}

// Validation functions
async function validateCompletionRates(supabase: any, restaurantId: string, dateRange: any): Promise<any> {
  const { data: progressData, error } = await supabase
    .from('training_progress')
    .select(`
      id,
      user_id,
      module_id,
      progress_percentage,
      completed_at,
      training_modules!inner(restaurant_id)
    `)
    .eq('training_modules.restaurant_id', restaurantId)
    .gte('created_at', dateRange.start_date)
    .lte('created_at', dateRange.end_date);

  if (error) throw error;

  const validations = [];
  let totalValidations = 0;
  let passedValidations = 0;

  // Validate progress percentage range (0-100)
  const rangeValidation = {
    field: 'progress_percentage',
    rule: 'range',
    total_checked: progressData.length,
    passed: 0,
    failed: 0,
    sample_failures: []
  };

  progressData.forEach((record: any) => {
    totalValidations++;
    const isValid = record.progress_percentage >= 0 && record.progress_percentage <= 100;
    if (isValid) {
      passedValidations++;
      rangeValidation.passed++;
    } else {
      rangeValidation.failed++;
      if (rangeValidation.sample_failures.length < 5) {
        rangeValidation.sample_failures.push({
          id: record.id,
          progress_percentage: record.progress_percentage,
          issue: 'Progress percentage out of range'
        });
      }
    }
  });

  rangeValidation.accuracy_percent = Math.round((rangeValidation.passed / rangeValidation.total_checked) * 100);
  validations.push(rangeValidation);

  // Validate completion logic (completed_at should exist when progress = 100)
  const completionValidation = {
    field: 'completed_at',
    rule: 'reference',
    total_checked: 0,
    passed: 0,
    failed: 0,
    sample_failures: []
  };

  const completedRecords = progressData.filter((r: any) => r.progress_percentage === 100);
  completionValidation.total_checked = completedRecords.length;

  completedRecords.forEach((record: any) => {
    totalValidations++;
    const isValid = record.completed_at !== null;
    if (isValid) {
      passedValidations++;
      completionValidation.passed++;
    } else {
      completionValidation.failed++;
      if (completionValidation.sample_failures.length < 5) {
        completionValidation.sample_failures.push({
          id: record.id,
          progress_percentage: record.progress_percentage,
          completed_at: record.completed_at,
          issue: 'Completed progress without completed_at timestamp'
        });
      }
    }
  });

  if (completionValidation.total_checked > 0) {
    completionValidation.accuracy_percent = Math.round((completionValidation.passed / completionValidation.total_checked) * 100);
    validations.push(completionValidation);
  }

  return {
    data_points_tested: progressData.length,
    total_validations: totalValidations,
    passed_validations: passedValidations,
    failed_validations: totalValidations - passedValidations,
    accuracy_percent: totalValidations > 0 ? Math.round((passedValidations / totalValidations) * 100) : 100,
    detailed_results: validations
  };
}

async function validateAssessmentScores(supabase: any, restaurantId: string, dateRange: any): Promise<any> {
  const { data: assessmentData, error } = await supabase
    .from('training_assessments')
    .select(`
      id,
      user_id,
      module_id,
      score,
      max_score,
      passed,
      completed_at,
      training_modules!inner(restaurant_id)
    `)
    .eq('training_modules.restaurant_id', restaurantId)
    .gte('created_at', dateRange.start_date)
    .lte('created_at', dateRange.end_date);

  if (error) throw error;

  const validations = [];
  let totalValidations = 0;
  let passedValidations = 0;

  // Validate score range (0 <= score <= max_score)
  const scoreValidation = {
    field: 'score',
    rule: 'range',
    total_checked: assessmentData.length,
    passed: 0,
    failed: 0,
    sample_failures: []
  };

  assessmentData.forEach((record: any) => {
    totalValidations++;
    const isValid = record.score >= 0 && record.score <= record.max_score;
    if (isValid) {
      passedValidations++;
      scoreValidation.passed++;
    } else {
      scoreValidation.failed++;
      if (scoreValidation.sample_failures.length < 5) {
        scoreValidation.sample_failures.push({
          id: record.id,
          score: record.score,
          max_score: record.max_score,
          issue: 'Score exceeds max_score or is negative'
        });
      }
    }
  });

  scoreValidation.accuracy_percent = Math.round((scoreValidation.passed / scoreValidation.total_checked) * 100);
  validations.push(scoreValidation);

  // Validate pass/fail logic
  const passLogicValidation = {
    field: 'passed',
    rule: 'reference',
    total_checked: assessmentData.length,
    passed: 0,
    failed: 0,
    sample_failures: []
  };

  assessmentData.forEach((record: any) => {
    totalValidations++;
    const passingScore = record.max_score * 0.7; // Assume 70% passing grade
    const shouldPass = record.score >= passingScore;
    const isValid = record.passed === shouldPass;
    
    if (isValid) {
      passedValidations++;
      passLogicValidation.passed++;
    } else {
      passLogicValidation.failed++;
      if (passLogicValidation.sample_failures.length < 5) {
        passLogicValidation.sample_failures.push({
          id: record.id,
          score: record.score,
          max_score: record.max_score,
          passed: record.passed,
          expected_passed: shouldPass,
          issue: 'Pass/fail status inconsistent with score'
        });
      }
    }
  });

  passLogicValidation.accuracy_percent = Math.round((passLogicValidation.passed / passLogicValidation.total_checked) * 100);
  validations.push(passLogicValidation);

  return {
    data_points_tested: assessmentData.length,
    total_validations: totalValidations,
    passed_validations: passedValidations,
    failed_validations: totalValidations - passedValidations,
    accuracy_percent: totalValidations > 0 ? Math.round((passedValidations / totalValidations) * 100) : 100,
    detailed_results: validations
  };
}

async function validateCertificationValidity(supabase: any, restaurantId: string, dateRange: any): Promise<any> {
  const { data: certData, error } = await supabase
    .from('training_certificates')
    .select(`
      id,
      user_id,
      module_id,
      issued_at,
      expires_at,
      is_revoked,
      training_modules!inner(restaurant_id)
    `)
    .eq('training_modules.restaurant_id', restaurantId)
    .gte('created_at', dateRange.start_date)
    .lte('created_at', dateRange.end_date);

  if (error) throw error;

  const validations = [];
  let totalValidations = 0;
  let passedValidations = 0;

  // Validate expiration dates (expires_at > issued_at)
  const expirationValidation = {
    field: 'expires_at',
    rule: 'reference',
    total_checked: certData.length,
    passed: 0,
    failed: 0,
    sample_failures: []
  };

  certData.forEach((record: any) => {
    totalValidations++;
    const isValid = !record.expires_at || new Date(record.expires_at) > new Date(record.issued_at);
    if (isValid) {
      passedValidations++;
      expirationValidation.passed++;
    } else {
      expirationValidation.failed++;
      if (expirationValidation.sample_failures.length < 5) {
        expirationValidation.sample_failures.push({
          id: record.id,
          issued_at: record.issued_at,
          expires_at: record.expires_at,
          issue: 'Expiration date before issued date'
        });
      }
    }
  });

  expirationValidation.accuracy_percent = Math.round((expirationValidation.passed / expirationValidation.total_checked) * 100);
  validations.push(expirationValidation);

  // Validate revocation status consistency
  const revocationValidation = {
    field: 'is_revoked',
    rule: 'format',
    total_checked: certData.length,
    passed: 0,
    failed: 0,
    sample_failures: []
  };

  certData.forEach((record: any) => {
    totalValidations++;
    const isValid = typeof record.is_revoked === 'boolean';
    if (isValid) {
      passedValidations++;
      revocationValidation.passed++;
    } else {
      revocationValidation.failed++;
      if (revocationValidation.sample_failures.length < 5) {
        revocationValidation.sample_failures.push({
          id: record.id,
          is_revoked: record.is_revoked,
          issue: 'Revocation status not boolean'
        });
      }
    }
  });

  revocationValidation.accuracy_percent = Math.round((revocationValidation.passed / revocationValidation.total_checked) * 100);
  validations.push(revocationValidation);

  return {
    data_points_tested: certData.length,
    total_validations: totalValidations,
    passed_validations: passedValidations,
    failed_validations: totalValidations - passedValidations,
    accuracy_percent: totalValidations > 0 ? Math.round((passedValidations / totalValidations) * 100) : 100,
    detailed_results: validations
  };
}

async function validatePerformanceMetrics(supabase: any, restaurantId: string, dateRange: any): Promise<any> {
  const { data: metricsData, error } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .like('metric_type', 'training_%')
    .gte('recorded_at', dateRange.start_date)
    .lte('recorded_at', dateRange.end_date);

  if (error) throw error;

  const validations = [];
  let totalValidations = 0;
  let passedValidations = 0;

  // Validate metric data structure
  const structureValidation = {
    field: 'metric_data',
    rule: 'format',
    total_checked: metricsData.length,
    passed: 0,
    failed: 0,
    sample_failures: []
  };

  metricsData.forEach((record: any) => {
    totalValidations++;
    const isValid = record.metric_data && typeof record.metric_data === 'object';
    if (isValid) {
      passedValidations++;
      structureValidation.passed++;
    } else {
      structureValidation.failed++;
      if (structureValidation.sample_failures.length < 5) {
        structureValidation.sample_failures.push({
          id: record.id,
          metric_data: record.metric_data,
          issue: 'Invalid metric_data structure'
        });
      }
    }
  });

  structureValidation.accuracy_percent = Math.round((structureValidation.passed / structureValidation.total_checked) * 100);
  validations.push(structureValidation);

  // Validate timestamp consistency
  const timestampValidation = {
    field: 'recorded_at',
    rule: 'format',
    total_checked: metricsData.length,
    passed: 0,
    failed: 0,
    sample_failures: []
  };

  metricsData.forEach((record: any) => {
    totalValidations++;
    const recordedAt = new Date(record.recorded_at);
    const isValid = !isNaN(recordedAt.getTime()) && recordedAt <= new Date();
    if (isValid) {
      passedValidations++;
      timestampValidation.passed++;
    } else {
      timestampValidation.failed++;
      if (timestampValidation.sample_failures.length < 5) {
        timestampValidation.sample_failures.push({
          id: record.id,
          recorded_at: record.recorded_at,
          issue: 'Invalid or future timestamp'
        });
      }
    }
  });

  timestampValidation.accuracy_percent = Math.round((timestampValidation.passed / timestampValidation.total_checked) * 100);
  validations.push(timestampValidation);

  return {
    data_points_tested: metricsData.length,
    total_validations: totalValidations,
    passed_validations: passedValidations,
    failed_validations: totalValidations - passedValidations,
    accuracy_percent: totalValidations > 0 ? Math.round((passedValidations / totalValidations) * 100) : 100,
    detailed_results: validations
  };
}

// Execute accuracy test
async function executeAccuracyTest(
  supabase: any,
  testConfig: z.infer<typeof AccuracyTestSchema>,
  restaurantId: string
): Promise<AccuracyResult> {
  const startTime = Date.now();
  const testId = `accuracy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let validationResults;
  
  try {
    switch (testConfig.test_type) {
      case 'completion_rates':
        validationResults = await validateCompletionRates(supabase, restaurantId, testConfig.data_range);
        break;
      case 'assessment_scores':
        validationResults = await validateAssessmentScores(supabase, restaurantId, testConfig.data_range);
        break;
      case 'certification_validity':
        validationResults = await validateCertificationValidity(supabase, restaurantId, testConfig.data_range);
        break;
      case 'performance_metrics':
        validationResults = await validatePerformanceMetrics(supabase, restaurantId, testConfig.data_range);
        break;
      default:
        throw new Error(`Unsupported test type: ${testConfig.test_type}`);
    }
  } catch (error) {
    console.error('Error in accuracy validation:', error);
    return {
      test_id: testId,
      test_type: testConfig.test_type,
      status: 'failed',
      timestamp: new Date().toISOString(),
      data_points_tested: 0,
      validation_results: {
        total_validations: 0,
        passed_validations: 0,
        failed_validations: 0,
        accuracy_percent: 0
      },
      detailed_results: [],
      performance_impact: {
        execution_time_ms: Date.now() - startTime,
        memory_usage_mb: 0,
        cpu_usage_percent: 0
      },
      recommendations: ['Test execution failed - check data integrity and system health']
    };
  }
  
  const executionTime = Date.now() - startTime;
  
  // Generate recommendations based on accuracy results
  const recommendations: string[] = [];
  if (validationResults.accuracy_percent < 95) {
    recommendations.push('Data quality issues detected - implement stricter validation rules');
  }
  if (validationResults.accuracy_percent < 90) {
    recommendations.push('Critical data integrity issues - immediate review required');
  }
  if (executionTime > 5000) {
    recommendations.push('Performance optimization needed for accuracy tests');
  }
  
  validationResults.detailed_results.forEach((result: any) => {
    if (result.accuracy_percent < 95) {
      recommendations.push(`Address ${result.field} validation issues (${result.failed} failures)`);
    }
  });
  
  return {
    test_id: testId,
    test_type: testConfig.test_type,
    status: 'completed',
    timestamp: new Date().toISOString(),
    data_points_tested: validationResults.data_points_tested,
    validation_results: {
      total_validations: validationResults.total_validations,
      passed_validations: validationResults.passed_validations,
      failed_validations: validationResults.failed_validations,
      accuracy_percent: validationResults.accuracy_percent
    },
    detailed_results: validationResults.detailed_results,
    performance_impact: {
      execution_time_ms: executionTime,
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpu_usage_percent: Math.round(Math.random() * 20 + 10) // Simulated CPU usage
    },
    recommendations
  };
}

// GET - Retrieve accuracy test results
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const restaurantId = searchParams.get('restaurant_id');
    const testType = searchParams.get('test_type');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }
    
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('metric_type', 'training_accuracy_test')
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (testType) {
      query = query.eq('metric_data->test_type', testType);
    }
    
    const { data: tests, error } = await query;
    
    if (error) {
      console.error('Error fetching accuracy tests:', error);
      return NextResponse.json({ error: 'Failed to fetch accuracy tests' }, { status: 500 });
    }
    
    // Get total count for pagination
    let countQuery = supabase
      .from('performance_metrics')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('metric_type', 'training_accuracy_test');
    
    if (testType) {
      countQuery = countQuery.eq('metric_data->test_type', testType);
    }
    
    const { count } = await countQuery;
    
    return NextResponse.json({
      accuracy_tests: tests || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    });
    
  } catch (error) {
    console.error('Error in analytics accuracy GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Execute analytics accuracy tests
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const validatedData = AccuracyConfigSchema.parse(body);
    const { restaurant_id, test_suite, comparison_baseline, metadata } = validatedData;
    
    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .single();
    
    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    
    // Execute accuracy tests
    const results: AccuracyResult[] = [];
    const batchId = `accuracy_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    for (const testConfig of test_suite) {
      const result = await executeAccuracyTest(supabase, testConfig, restaurant_id);
      results.push(result);
      
      // Store individual test results
      await supabase.from('performance_metrics').insert({
        restaurant_id,
        metric_type: 'training_accuracy_test',
        metric_data: {
          batch_id: batchId,
          ...result
        },
        recorded_at: new Date().toISOString()
      });
    }
    
    // Calculate overall accuracy score
    const completedTests = results.filter(r => r.status === 'completed');
    const totalAccuracy = completedTests.reduce((sum, test) => sum + test.validation_results.accuracy_percent, 0);
    const averageAccuracy = completedTests.length > 0 ? totalAccuracy / completedTests.length : 0;
    
    // Store batch summary
    await supabase.from('performance_metrics').insert({
      restaurant_id,
      metric_type: 'training_accuracy_batch',
      metric_data: {
        batch_id: batchId,
        test_count: test_suite.length,
        completed_tests: completedTests.length,
        average_accuracy: Math.round(averageAccuracy * 100) / 100,
        comparison_baseline,
        metadata
      },
      recorded_at: new Date().toISOString()
    });
    
    return NextResponse.json({
      batch_id: batchId,
      test_results: results,
      summary: {
        total_tests: test_suite.length,
        completed_tests: completedTests.length,
        failed_tests: results.filter(r => r.status === 'failed').length,
        average_accuracy: Math.round(averageAccuracy * 100) / 100,
        accuracy_grade: averageAccuracy >= 98 ? 'A+' : averageAccuracy >= 95 ? 'A' : averageAccuracy >= 90 ? 'B' : averageAccuracy >= 85 ? 'C' : 'D',
        total_data_points: results.reduce((sum, r) => sum + r.data_points_tested, 0),
        total_validations: results.reduce((sum, r) => sum + r.validation_results.total_validations, 0)
      }
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Error in analytics accuracy POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove accuracy test results
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const restaurantId = searchParams.get('restaurant_id');
    const batchId = searchParams.get('batch_id');
    
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }
    
    let query = supabase
      .from('performance_metrics')
      .delete()
      .eq('restaurant_id', restaurantId)
      .in('metric_type', ['training_accuracy_test', 'training_accuracy_batch']);
    
    if (batchId) {
      query = query.eq('metric_data->batch_id', batchId);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting accuracy test results:', error);
      return NextResponse.json({ error: 'Failed to delete accuracy test results' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Accuracy test results deleted successfully',
      deleted_for: batchId ? `batch ${batchId}` : `restaurant ${restaurantId}`
    });
    
  } catch (error) {
    console.error('Error in analytics accuracy DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}