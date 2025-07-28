import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Benchmark test schema
const BenchmarkTestSchema = z.object({
  test_type: z.enum(['load', 'stress', 'volume', 'endurance', 'spike']),
  duration_minutes: z.number().min(1).max(60),
  concurrent_users: z.number().min(1).max(1000),
  target_endpoints: z.array(z.string()).optional(),
  performance_targets: z.object({
    response_time_ms: z.number().min(1),
    throughput_rps: z.number().min(1),
    error_rate_percent: z.number().min(0).max(100),
    cpu_usage_percent: z.number().min(0).max(100),
    memory_usage_mb: z.number().min(1)
  }).optional()
});

const BenchmarkConfigSchema = z.object({
  restaurant_id: z.string().uuid(),
  test_suite: z.array(BenchmarkTestSchema),
  environment: z.enum(['development', 'staging', 'production']),
  metadata: z.record(z.any()).optional()
});

// Performance metrics tracking
interface PerformanceMetrics {
  timestamp: string;
  response_time_ms: number;
  throughput_rps: number;
  error_rate_percent: number;
  cpu_usage_percent: number;
  memory_usage_mb: number;
  concurrent_users: number;
  success_rate_percent: number;
}

// Benchmark test result
interface BenchmarkResult {
  test_id: string;
  test_type: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  metrics: PerformanceMetrics[];
  summary: {
    avg_response_time_ms: number;
    max_response_time_ms: number;
    min_response_time_ms: number;
    p95_response_time_ms: number;
    p99_response_time_ms: number;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    throughput_rps: number;
    error_rate_percent: number;
  };
  passed_targets: boolean;
  recommendations: string[];
}

// Simulate performance test execution
async function executePerformanceTest(
  supabase: any,
  testConfig: z.infer<typeof BenchmarkTestSchema>,
  restaurantId: string
): Promise<BenchmarkResult> {
  const testId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date().toISOString();
  
  // Simulate test execution with realistic metrics
  const metrics: PerformanceMetrics[] = [];
  const durationMs = testConfig.duration_minutes * 60 * 1000;
  const intervals = Math.min(testConfig.duration_minutes * 6, 100); // Max 100 data points
  const intervalMs = durationMs / intervals;
  
  for (let i = 0; i < intervals; i++) {
    const timestamp = new Date(Date.now() + i * intervalMs).toISOString();
    
    // Simulate realistic performance degradation under load
    const loadFactor = testConfig.concurrent_users / 100;
    const timeProgression = i / intervals;
    
    const baseResponseTime = 50;
    const responseTime = baseResponseTime + (loadFactor * 20) + (timeProgression * 30) + (Math.random() * 40);
    
    const baseThroughput = 1000;
    const throughput = Math.max(10, baseThroughput - (loadFactor * 100) - (timeProgression * 200) + (Math.random() * 100));
    
    const errorRate = Math.min(15, (loadFactor * 2) + (timeProgression * 5) + (Math.random() * 3));
    const cpuUsage = Math.min(95, 20 + (loadFactor * 10) + (timeProgression * 30) + (Math.random() * 15));
    const memoryUsage = Math.min(8000, 1000 + (loadFactor * 200) + (timeProgression * 500) + (Math.random() * 300));
    
    metrics.push({
      timestamp,
      response_time_ms: Math.round(responseTime),
      throughput_rps: Math.round(throughput),
      error_rate_percent: Math.round(errorRate * 100) / 100,
      cpu_usage_percent: Math.round(cpuUsage * 100) / 100,
      memory_usage_mb: Math.round(memoryUsage),
      concurrent_users: testConfig.concurrent_users,
      success_rate_percent: Math.round((100 - errorRate) * 100) / 100
    });
  }
  
  // Calculate summary statistics
  const responseTimes = metrics.map(m => m.response_time_ms);
  const throughputs = metrics.map(m => m.throughput_rps);
  const errorRates = metrics.map(m => m.error_rate_percent);
  
  const avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
  const maxResponseTime = Math.max(...responseTimes);
  const minResponseTime = Math.min(...responseTimes);
  
  // Calculate percentiles
  const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
  const p99Index = Math.floor(sortedResponseTimes.length * 0.99);
  const p95ResponseTime = sortedResponseTimes[p95Index];
  const p99ResponseTime = sortedResponseTimes[p99Index];
  
  const avgThroughput = Math.round(throughputs.reduce((a, b) => a + b, 0) / throughputs.length);
  const avgErrorRate = Math.round(errorRates.reduce((a, b) => a + b, 0) / errorRates.length * 100) / 100;
  
  const totalRequests = testConfig.concurrent_users * testConfig.duration_minutes * 60;
  const failedRequests = Math.round(totalRequests * avgErrorRate / 100);
  const successfulRequests = totalRequests - failedRequests;
  
  // Check if performance targets were met
  const targets = testConfig.performance_targets;
  const passedTargets = !targets || (
    avgResponseTime <= targets.response_time_ms &&
    avgThroughput >= targets.throughput_rps &&
    avgErrorRate <= targets.error_rate_percent
  );
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (avgResponseTime > 200) {
    recommendations.push('Consider optimizing database queries and adding caching');
  }
  if (avgErrorRate > 2) {
    recommendations.push('Investigate error patterns and implement better error handling');
  }
  if (avgThroughput < 500) {
    recommendations.push('Consider horizontal scaling or load balancing improvements');
  }
  if (maxResponseTime > avgResponseTime * 3) {
    recommendations.push('Address response time spikes with performance profiling');
  }
  
  // Store benchmark results
  await supabase.from('performance_metrics').insert({
    restaurant_id: restaurantId,
    metric_type: 'training_benchmark',
    metric_data: {
      test_id: testId,
      test_type: testConfig.test_type,
      summary: {
        avg_response_time_ms: avgResponseTime,
        max_response_time_ms: maxResponseTime,
        min_response_time_ms: minResponseTime,
        p95_response_time_ms: p95ResponseTime,
        p99_response_time_ms: p99ResponseTime,
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        throughput_rps: avgThroughput,
        error_rate_percent: avgErrorRate
      },
      passed_targets: passedTargets,
      concurrent_users: testConfig.concurrent_users,
      duration_minutes: testConfig.duration_minutes
    },
    recorded_at: new Date().toISOString()
  });
  
  return {
    test_id: testId,
    test_type: testConfig.test_type,
    status: 'completed',
    start_time: startTime,
    end_time: new Date().toISOString(),
    duration_seconds: Math.round(durationMs / 1000),
    metrics,
    summary: {
      avg_response_time_ms: avgResponseTime,
      max_response_time_ms: maxResponseTime,
      min_response_time_ms: minResponseTime,
      p95_response_time_ms: p95ResponseTime,
      p99_response_time_ms: p99ResponseTime,
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      throughput_rps: avgThroughput,
      error_rate_percent: avgErrorRate
    },
    passed_targets: passedTargets,
    recommendations
  };
}

// GET - Retrieve benchmark results
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
      .eq('metric_type', 'training_benchmark')
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (testType) {
      query = query.eq('metric_data->test_type', testType);
    }
    
    const { data: benchmarks, error } = await query;
    
    if (error) {
      console.error('Error fetching benchmarks:', error);
      return NextResponse.json({ error: 'Failed to fetch benchmarks' }, { status: 500 });
    }
    
    // Get total count for pagination
    let countQuery = supabase
      .from('performance_metrics')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('metric_type', 'training_benchmark');
    
    if (testType) {
      countQuery = countQuery.eq('metric_data->test_type', testType);
    }
    
    const { count } = await countQuery;
    
    return NextResponse.json({
      benchmarks: benchmarks || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    });
    
  } catch (error) {
    console.error('Error in performance benchmarks GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Execute performance benchmark tests
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const validatedData = BenchmarkConfigSchema.parse(body);
    const { restaurant_id, test_suite, environment, metadata } = validatedData;
    
    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .single();
    
    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    
    // Execute benchmark tests
    const results: BenchmarkResult[] = [];
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    for (const testConfig of test_suite) {
      try {
        const result = await executePerformanceTest(supabase, testConfig, restaurant_id);
        results.push(result);
      } catch (testError) {
        console.error('Error executing performance test:', testError);
        results.push({
          test_id: `failed_${Date.now()}`,
          test_type: testConfig.test_type,
          status: 'failed',
          start_time: new Date().toISOString(),
          metrics: [],
          summary: {
            avg_response_time_ms: 0,
            max_response_time_ms: 0,
            min_response_time_ms: 0,
            p95_response_time_ms: 0,
            p99_response_time_ms: 0,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            throughput_rps: 0,
            error_rate_percent: 100
          },
          passed_targets: false,
          recommendations: ['Test execution failed - check system resources and configuration']
        });
      }
    }
    
    // Calculate overall performance score
    const completedTests = results.filter(r => r.status === 'completed');
    const passedTests = completedTests.filter(r => r.passed_targets);
    const overallScore = completedTests.length > 0 ? (passedTests.length / completedTests.length) * 100 : 0;
    
    // Store batch results
    await supabase.from('performance_metrics').insert({
      restaurant_id,
      metric_type: 'training_benchmark_batch',
      metric_data: {
        batch_id: batchId,
        environment,
        test_count: test_suite.length,
        completed_tests: completedTests.length,
        passed_tests: passedTests.length,
        overall_score: Math.round(overallScore * 100) / 100,
        metadata
      },
      recorded_at: new Date().toISOString()
    });
    
    return NextResponse.json({
      batch_id: batchId,
      environment,
      test_results: results,
      summary: {
        total_tests: test_suite.length,
        completed_tests: completedTests.length,
        passed_tests: passedTests.length,
        failed_tests: results.filter(r => r.status === 'failed').length,
        overall_score: Math.round(overallScore * 100) / 100,
        performance_grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F'
      }
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Error in performance benchmarks POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove benchmark results
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const restaurantId = searchParams.get('restaurant_id');
    const batchId = searchParams.get('batch_id');
    const testId = searchParams.get('test_id');
    
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }
    
    let query = supabase
      .from('performance_metrics')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('metric_type', 'training_benchmark');
    
    if (batchId) {
      query = query.eq('metric_data->batch_id', batchId);
    } else if (testId) {
      query = query.eq('metric_data->test_id', testId);
    } else {
      // Delete all benchmark data for restaurant
      query = query.or('metric_type.eq.training_benchmark,metric_type.eq.training_benchmark_batch');
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting benchmark results:', error);
      return NextResponse.json({ error: 'Failed to delete benchmark results' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Benchmark results deleted successfully',
      deleted_for: batchId ? `batch ${batchId}` : testId ? `test ${testId}` : `restaurant ${restaurantId}`
    });
    
  } catch (error) {
    console.error('Error in performance benchmarks DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}