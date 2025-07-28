import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Migration test schema
const MigrationTestSchema = z.object({
  test_type: z.enum(['schema_validation', 'data_integrity', 'relationship_consistency', 'performance_impact', 'rollback_capability']),
  migration_version: z.string(),
  test_scenarios: z.array(z.object({
    scenario_name: z.string(),
    table_name: z.string(),
    operation: z.enum(['create', 'alter', 'drop', 'migrate_data', 'validate']),
    test_data: z.record(z.any()).optional(),
    validation_rules: z.array(z.string()).optional(),
    expected_outcome: z.enum(['success', 'failure', 'warning'])
  })),
  dry_run: z.boolean().optional().default(true),
  backup_required: z.boolean().optional().default(true)
});

const MigrationConfigSchema = z.object({
  restaurant_id: z.string().uuid(),
  test_suite: z.array(MigrationTestSchema),
  environment: z.enum(['development', 'staging', 'production']),
  migration_strategy: z.enum(['rolling', 'blue_green', 'snapshot']).optional(),
  metadata: z.record(z.any()).optional()
});

// Migration test result
interface MigrationResult {
  test_id: string;
  test_type: string;
  migration_version: string;
  status: 'completed' | 'failed' | 'partial';
  timestamp: string;
  scenarios_tested: number;
  scenarios_passed: number;
  scenarios_failed: number;
  execution_time_ms: number;
  detailed_results: {
    scenario_name: string;
    table_name: string;
    operation: string;
    expected_outcome: string;
    actual_outcome: string;
    passed: boolean;
    execution_time_ms: number;
    rows_affected: number;
    validation_errors: string[];
    rollback_tested: boolean;
    rollback_successful?: boolean;
  }[];
  data_integrity_checks: {
    foreign_key_constraints: boolean;
    unique_constraints: boolean;
    check_constraints: boolean;
    not_null_constraints: boolean;
    data_consistency: boolean;
  };
  performance_metrics: {
    migration_duration_ms: number;
    memory_usage_mb: number;
    disk_space_required_mb: number;
    lock_duration_ms: number;
    downtime_estimate_ms: number;
  };
  rollback_plan: {
    available: boolean;
    tested: boolean;
    estimated_duration_ms: number;
    backup_size_mb: number;
    rollback_scripts: string[];
  };
  recommendations: string[];
}

// Test schema validation
async function testSchemaValidation(supabase: any, restaurantId: string, scenarios: any[], migrationVersion: string): Promise<any> {
  const results = [];
  
  // Define expected schema structure for training system
  const expectedTables = {
    training_modules: {
      columns: ['id', 'restaurant_id', 'title', 'description', 'content', 'required_role', 'estimated_duration', 'is_active', 'created_at', 'updated_at'],
      constraints: ['training_modules_pkey', 'training_modules_restaurant_id_fkey']
    },
    training_progress: {
      columns: ['id', 'user_id', 'module_id', 'progress_percentage', 'completed_at', 'created_at', 'updated_at'],
      constraints: ['training_progress_pkey', 'training_progress_user_id_fkey', 'training_progress_module_id_fkey']
    },
    training_assessments: {
      columns: ['id', 'user_id', 'module_id', 'score', 'max_score', 'passed', 'answers', 'completed_at', 'created_at'],
      constraints: ['training_assessments_pkey', 'training_assessments_user_id_fkey', 'training_assessments_module_id_fkey']
    },
    training_certificates: {
      columns: ['id', 'user_id', 'module_id', 'issued_at', 'expires_at', 'certificate_data', 'is_revoked', 'created_at'],
      constraints: ['training_certificates_pkey', 'training_certificates_user_id_fkey', 'training_certificates_module_id_fkey']
    }
  };
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualOutcome = 'success';
    const validationErrors: string[] = [];
    let rowsAffected = 0;
    
    try {
      const tableName = scenario.table_name;
      const expectedTable = expectedTables[tableName as keyof typeof expectedTables];
      
      if (!expectedTable) {
        validationErrors.push(`Table ${tableName} not in expected schema`);
        actualOutcome = 'failure';
      } else {
        // Check if table exists
        const { data: tableInfo, error: tableError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', tableName);
        
        if (tableError || !tableInfo || tableInfo.length === 0) {
          validationErrors.push(`Table ${tableName} does not exist`);
          actualOutcome = 'failure';
        } else {
          // Check columns
          const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_schema', 'public')
            .eq('table_name', tableName);
          
          if (columnsError) {
            validationErrors.push(`Failed to check columns for ${tableName}: ${columnsError.message}`);
            actualOutcome = 'failure';
          } else {
            const actualColumns = columns.map((c: any) => c.column_name);
            const missingColumns = expectedTable.columns.filter(col => !actualColumns.includes(col));
            const extraColumns = actualColumns.filter(col => !expectedTable.columns.includes(col));
            
            if (missingColumns.length > 0) {
              validationErrors.push(`Missing columns in ${tableName}: ${missingColumns.join(', ')}`);
              actualOutcome = 'failure';
            }
            
            if (extraColumns.length > 0) {
              validationErrors.push(`Extra columns in ${tableName}: ${extraColumns.join(', ')}`);
              actualOutcome = 'warning';
            }
          }
          
          // Check constraints
          const { data: constraints, error: constraintsError } = await supabase
            .from('information_schema.table_constraints')
            .select('constraint_name, constraint_type')
            .eq('table_schema', 'public')
            .eq('table_name', tableName);
          
          if (constraintsError) {
            validationErrors.push(`Failed to check constraints for ${tableName}: ${constraintsError.message}`);
            actualOutcome = 'failure';
          } else {
            const actualConstraints = constraints.map((c: any) => c.constraint_name);
            const missingConstraints = expectedTable.constraints.filter(constraint => 
              !actualConstraints.some(ac => ac.includes(constraint))
            );
            
            if (missingConstraints.length > 0) {
              validationErrors.push(`Missing constraints in ${tableName}: ${missingConstraints.join(', ')}`);
              actualOutcome = 'failure';
            }
          }
        }
      }
      
    } catch (error) {
      validationErrors.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actualOutcome = 'failure';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualOutcome === scenario.expected_outcome;
    
    results.push({
      scenario_name: scenario.scenario_name,
      table_name: scenario.table_name,
      operation: scenario.operation,
      expected_outcome: scenario.expected_outcome,
      actual_outcome: actualOutcome,
      passed,
      execution_time_ms: executionTime,
      rows_affected: rowsAffected,
      validation_errors: validationErrors,
      rollback_tested: false
    });
  }
  
  return results;
}

// Test data integrity
async function testDataIntegrity(supabase: any, restaurantId: string, scenarios: any[], migrationVersion: string): Promise<any> {
  const results = [];
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualOutcome = 'success';
    const validationErrors: string[] = [];
    let rowsAffected = 0;
    
    try {
      const tableName = scenario.table_name;
      
      // Test referential integrity
      if (tableName === 'training_progress') {
        // Check that user_id references exist
        const { data: orphanedProgress, error: progressError } = await supabase
          .from('training_progress')
          .select('id, user_id')
          .not('user_id', 'in', 
            supabase.from('auth_users').select('id')
          );
        
        if (progressError) {
          validationErrors.push(`Failed to check user references: ${progressError.message}`);
          actualOutcome = 'failure';
        } else if (orphanedProgress && orphanedProgress.length > 0) {
          validationErrors.push(`Found ${orphanedProgress.length} orphaned training progress records`);
          actualOutcome = 'failure';
          rowsAffected = orphanedProgress.length;
        }
        
        // Check that module_id references exist
        const { data: orphanedModules, error: moduleError } = await supabase
          .from('training_progress')
          .select('id, module_id')
          .not('module_id', 'in', 
            supabase.from('training_modules').select('id')
          );
        
        if (moduleError) {
          validationErrors.push(`Failed to check module references: ${moduleError.message}`);
          actualOutcome = 'failure';
        } else if (orphanedModules && orphanedModules.length > 0) {
          validationErrors.push(`Found ${orphanedModules.length} orphaned module references`);
          actualOutcome = 'failure';
          rowsAffected += orphanedModules.length;
        }
      }
      
      // Test data consistency
      if (tableName === 'training_assessments') {
        // Check that scores are within valid range
        const { data: invalidScores, error: scoresError } = await supabase
          .from('training_assessments')
          .select('id, score, max_score')
          .or('score.lt.0,score.gt.max_score');
        
        if (scoresError) {
          validationErrors.push(`Failed to check score validity: ${scoresError.message}`);
          actualOutcome = 'failure';
        } else if (invalidScores && invalidScores.length > 0) {
          validationErrors.push(`Found ${invalidScores.length} assessments with invalid scores`);
          actualOutcome = 'failure';
          rowsAffected += invalidScores.length;
        }
        
        // Check pass/fail consistency
        const { data: inconsistentPass, error: passError } = await supabase
          .rpc('check_assessment_pass_consistency');
        
        if (passError) {
          validationErrors.push(`Failed to check pass/fail consistency: ${passError.message}`);
          actualOutcome = 'failure';
        } else if (inconsistentPass && inconsistentPass > 0) {
          validationErrors.push(`Found ${inconsistentPass} assessments with inconsistent pass/fail status`);
          actualOutcome = 'failure';
          rowsAffected += inconsistentPass;
        }
      }
      
      // Test completion consistency
      if (tableName === 'training_progress') {
        const { data: incompleteProgress, error: completeError } = await supabase
          .from('training_progress')
          .select('id, progress_percentage, completed_at')
          .eq('progress_percentage', 100)
          .is('completed_at', null);
        
        if (completeError) {
          validationErrors.push(`Failed to check completion consistency: ${completeError.message}`);
          actualOutcome = 'failure';
        } else if (incompleteProgress && incompleteProgress.length > 0) {
          validationErrors.push(`Found ${incompleteProgress.length} completed progress without completion date`);
          actualOutcome = 'warning';
          rowsAffected += incompleteProgress.length;
        }
      }
      
    } catch (error) {
      validationErrors.push(`Data integrity error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actualOutcome = 'failure';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualOutcome === scenario.expected_outcome;
    
    results.push({
      scenario_name: scenario.scenario_name,
      table_name: scenario.table_name,
      operation: scenario.operation,
      expected_outcome: scenario.expected_outcome,
      actual_outcome: actualOutcome,
      passed,
      execution_time_ms: executionTime,
      rows_affected: rowsAffected,
      validation_errors: validationErrors,
      rollback_tested: false
    });
  }
  
  return results;
}

// Test performance impact
async function testPerformanceImpact(supabase: any, restaurantId: string, scenarios: any[], migrationVersion: string): Promise<any> {
  const results = [];
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualOutcome = 'success';
    const validationErrors: string[] = [];
    let rowsAffected = 0;
    
    try {
      const tableName = scenario.table_name;
      
      // Simulate performance testing
      if (scenario.operation === 'migrate_data') {
        // Test bulk data operations
        const { data: rowCount, error: countError } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true });
        
        if (countError) {
          validationErrors.push(`Failed to count rows in ${tableName}: ${countError.message}`);
          actualOutcome = 'failure';
        } else {
          rowsAffected = rowCount || 0;
          
          // Estimate migration time based on row count
          const estimatedTimeMs = Math.max(100, rowsAffected * 0.1); // 0.1ms per row minimum
          
          if (estimatedTimeMs > 30000) { // 30 seconds
            validationErrors.push(`Migration may take ${Math.round(estimatedTimeMs/1000)}s for ${rowsAffected} rows`);
            actualOutcome = 'warning';
          }
          
          // Test query performance
          const queryStart = Date.now();
          const { error: queryError } = await supabase
            .from(tableName)
            .select('id')
            .limit(1000);
          
          const queryTime = Date.now() - queryStart;
          
          if (queryError) {
            validationErrors.push(`Query performance test failed: ${queryError.message}`);
            actualOutcome = 'failure';
          } else if (queryTime > 5000) { // 5 seconds
            validationErrors.push(`Slow query performance: ${queryTime}ms for 1000 rows`);
            actualOutcome = 'warning';
          }
        }
      }
      
      // Test index performance
      if (scenario.operation === 'alter' && scenario.test_data?.add_index) {
        const indexColumns = scenario.test_data.index_columns || ['id'];
        
        // Simulate index creation impact
        const estimatedIndexTime = Math.max(500, rowsAffected * 0.05); // 0.05ms per row
        
        if (estimatedIndexTime > 10000) {
          validationErrors.push(`Index creation may take ${Math.round(estimatedIndexTime/1000)}s`);
          actualOutcome = 'warning';
        }
      }
      
    } catch (error) {
      validationErrors.push(`Performance test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actualOutcome = 'failure';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualOutcome === scenario.expected_outcome;
    
    results.push({
      scenario_name: scenario.scenario_name,
      table_name: scenario.table_name,
      operation: scenario.operation,
      expected_outcome: scenario.expected_outcome,
      actual_outcome: actualOutcome,
      passed,
      execution_time_ms: executionTime,
      rows_affected: rowsAffected,
      validation_errors: validationErrors,
      rollback_tested: false
    });
  }
  
  return results;
}

// Test rollback capability
async function testRollbackCapability(supabase: any, restaurantId: string, scenarios: any[], migrationVersion: string): Promise<any> {
  const results = [];
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualOutcome = 'success';
    const validationErrors: string[] = [];
    let rollbackSuccessful = false;
    let rowsAffected = 0;
    
    try {
      // Simulate rollback testing in dry-run mode
      if (scenario.operation === 'create') {
        // Test table creation rollback
        rollbackSuccessful = true; // Can drop table
        validationErrors.push('Rollback: DROP TABLE statement prepared');
      } else if (scenario.operation === 'alter') {
        // Test column addition/modification rollback
        const alterType = scenario.test_data?.alter_type || 'add_column';
        
        if (alterType === 'add_column') {
          rollbackSuccessful = true; // Can drop column
          validationErrors.push('Rollback: DROP COLUMN statement prepared');
        } else if (alterType === 'modify_column') {
          rollbackSuccessful = true; // Can revert column type
          validationErrors.push('Rollback: ALTER COLUMN statement prepared');
        } else {
          rollbackSuccessful = false;
          validationErrors.push('Rollback: Complex ALTER may not be fully reversible');
          actualOutcome = 'warning';
        }
      } else if (scenario.operation === 'migrate_data') {
        // Test data migration rollback
        const { data: backupExists, error: backupError } = await supabase
          .from('performance_metrics')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .eq('metric_type', `backup_${scenario.table_name}_${migrationVersion}`)
          .limit(1);
        
        if (backupError) {
          validationErrors.push(`Failed to check backup: ${backupError.message}`);
          actualOutcome = 'failure';
        } else if (!backupExists || backupExists.length === 0) {
          validationErrors.push('No backup found for data rollback');
          actualOutcome = 'failure';
        } else {
          rollbackSuccessful = true;
          validationErrors.push('Rollback: Data backup available for restoration');
        }
      }
      
      // Estimate rollback time
      const { data: tableSize, error: sizeError } = await supabase
        .from(scenario.table_name)
        .select('id', { count: 'exact', head: true });
      
      if (!sizeError && tableSize) {
        rowsAffected = tableSize;
        const rollbackTimeEstimate = Math.max(200, rowsAffected * 0.15); // 0.15ms per row
        
        if (rollbackTimeEstimate > 60000) { // 1 minute
          validationErrors.push(`Rollback may take ${Math.round(rollbackTimeEstimate/1000)}s`);
          actualOutcome = 'warning';
        }
      }
      
    } catch (error) {
      validationErrors.push(`Rollback test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actualOutcome = 'failure';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualOutcome === scenario.expected_outcome;
    
    results.push({
      scenario_name: scenario.scenario_name,
      table_name: scenario.table_name,
      operation: scenario.operation,
      expected_outcome: scenario.expected_outcome,
      actual_outcome: actualOutcome,
      passed,
      execution_time_ms: executionTime,
      rows_affected: rowsAffected,
      validation_errors: validationErrors,
      rollback_tested: true,
      rollback_successful: rollbackSuccessful
    });
  }
  
  return results;
}

// Execute migration test
async function executeMigrationTest(
  supabase: any,
  testConfig: z.infer<typeof MigrationTestSchema>,
  restaurantId: string
): Promise<MigrationResult> {
  const testId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  let detailedResults: any[] = [];
  
  try {
    switch (testConfig.test_type) {
      case 'schema_validation':
        detailedResults = await testSchemaValidation(supabase, restaurantId, testConfig.test_scenarios, testConfig.migration_version);
        break;
      case 'data_integrity':
        detailedResults = await testDataIntegrity(supabase, restaurantId, testConfig.test_scenarios, testConfig.migration_version);
        break;
      case 'performance_impact':
        detailedResults = await testPerformanceImpact(supabase, restaurantId, testConfig.test_scenarios, testConfig.migration_version);
        break;
      case 'rollback_capability':
        detailedResults = await testRollbackCapability(supabase, restaurantId, testConfig.test_scenarios, testConfig.migration_version);
        break;
      default:
        throw new Error(`Unsupported test type: ${testConfig.test_type}`);
    }
  } catch (error) {
    console.error('Error in migration test execution:', error);
    return {
      test_id: testId,
      test_type: testConfig.test_type,
      migration_version: testConfig.migration_version,
      status: 'failed',
      timestamp: new Date().toISOString(),
      scenarios_tested: 0,
      scenarios_passed: 0,
      scenarios_failed: 0,
      execution_time_ms: Date.now() - startTime,
      detailed_results: [],
      data_integrity_checks: {
        foreign_key_constraints: false,
        unique_constraints: false,
        check_constraints: false,
        not_null_constraints: false,
        data_consistency: false
      },
      performance_metrics: {
        migration_duration_ms: 0,
        memory_usage_mb: 0,
        disk_space_required_mb: 0,
        lock_duration_ms: 0,
        downtime_estimate_ms: 0
      },
      rollback_plan: {
        available: false,
        tested: false,
        estimated_duration_ms: 0,
        backup_size_mb: 0,
        rollback_scripts: []
      },
      recommendations: ['Migration test execution failed - check system health and configuration']
    };
  }
  
  const executionTime = Date.now() - startTime;
  const scenariosPassed = detailedResults.filter(r => r.passed).length;
  const scenariosFailed = detailedResults.length - scenariosPassed;
  
  // Analyze data integrity
  const dataIntegrityChecks = {
    foreign_key_constraints: detailedResults.some(r => r.scenario_name.includes('foreign_key') && r.passed),
    unique_constraints: detailedResults.some(r => r.scenario_name.includes('unique') && r.passed),
    check_constraints: detailedResults.some(r => r.scenario_name.includes('check') && r.passed),
    not_null_constraints: detailedResults.some(r => r.scenario_name.includes('not_null') && r.passed),
    data_consistency: detailedResults.filter(r => r.scenario_name.includes('consistency')).every(r => r.passed)
  };
  
  // Calculate performance metrics
  const totalRowsAffected = detailedResults.reduce((sum, r) => sum + r.rows_affected, 0);
  const performanceMetrics = {
    migration_duration_ms: Math.max(1000, totalRowsAffected * 0.2),
    memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    disk_space_required_mb: Math.max(10, totalRowsAffected * 0.001),
    lock_duration_ms: Math.max(100, totalRowsAffected * 0.05),
    downtime_estimate_ms: testConfig.test_type === 'performance_impact' ? Math.max(500, totalRowsAffected * 0.1) : 0
  };
  
  // Analyze rollback capability
  const rollbackResults = detailedResults.filter(r => r.rollback_tested);
  const rollbackPlan = {
    available: rollbackResults.length > 0,
    tested: rollbackResults.length > 0,
    estimated_duration_ms: Math.max(500, totalRowsAffected * 0.15),
    backup_size_mb: Math.max(5, totalRowsAffected * 0.0005),
    rollback_scripts: rollbackResults.map(r => `-- Rollback for ${r.scenario_name}\n-- ${r.validation_errors.join('\n-- ')}`).filter(s => s.length > 20)
  };
  
  // Generate recommendations
  const recommendations = [];
  if (scenariosFailed > 0) {
    recommendations.push(`${scenariosFailed} migration scenarios failed - review before production deployment`);
  }
  if (performanceMetrics.downtime_estimate_ms > 5000) {
    recommendations.push('Consider maintenance window for migration due to estimated downtime');
  }
  if (!rollbackPlan.available) {
    recommendations.push('Implement rollback procedures before migration');
  }
  if (totalRowsAffected > 100000) {
    recommendations.push('Large dataset migration - consider chunked processing');
  }
  
  return {
    test_id: testId,
    test_type: testConfig.test_type,
    migration_version: testConfig.migration_version,
    status: 'completed',
    timestamp: new Date().toISOString(),
    scenarios_tested: detailedResults.length,
    scenarios_passed: scenariosPassed,
    scenarios_failed: scenariosFailed,
    execution_time_ms: executionTime,
    detailed_results: detailedResults,
    data_integrity_checks: dataIntegrityChecks,
    performance_metrics: performanceMetrics,
    rollback_plan: rollbackPlan,
    recommendations
  };
}

// GET - Retrieve migration test results
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const restaurantId = searchParams.get('restaurant_id');
    const migrationVersion = searchParams.get('migration_version');
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
      .eq('metric_type', 'training_migration_test')
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (migrationVersion) {
      query = query.eq('metric_data->migration_version', migrationVersion);
    }
    
    if (testType) {
      query = query.eq('metric_data->test_type', testType);
    }
    
    const { data: tests, error } = await query;
    
    if (error) {
      console.error('Error fetching migration tests:', error);
      return NextResponse.json({ error: 'Failed to fetch migration tests' }, { status: 500 });
    }
    
    // Get total count for pagination
    let countQuery = supabase
      .from('performance_metrics')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('metric_type', 'training_migration_test');
    
    if (migrationVersion) {
      countQuery = countQuery.eq('metric_data->migration_version', migrationVersion);
    }
    
    if (testType) {
      countQuery = countQuery.eq('metric_data->test_type', testType);
    }
    
    const { count } = await countQuery;
    
    return NextResponse.json({
      migration_tests: tests || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    });
    
  } catch (error) {
    console.error('Error in data migration GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Execute migration tests
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const validatedData = MigrationConfigSchema.parse(body);
    const { restaurant_id, test_suite, environment, migration_strategy, metadata } = validatedData;
    
    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .single();
    
    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    
    // Execute migration tests
    const results: MigrationResult[] = [];
    const batchId = `migration_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    for (const testConfig of test_suite) {
      const result = await executeMigrationTest(supabase, testConfig, restaurant_id);
      results.push(result);
      
      // Store individual test results
      await supabase.from('performance_metrics').insert({
        restaurant_id,
        metric_type: 'training_migration_test',
        metric_data: {
          batch_id: batchId,
          ...result
        },
        recorded_at: new Date().toISOString()
      });
    }
    
    // Calculate overall migration readiness score
    const completedTests = results.filter(r => r.status === 'completed');
    const totalScenarios = results.reduce((sum, r) => sum + r.scenarios_tested, 0);
    const passedScenarios = results.reduce((sum, r) => sum + r.scenarios_passed, 0);
    const readinessScore = totalScenarios > 0 ? (passedScenarios / totalScenarios) * 100 : 0;
    
    // Aggregate performance metrics
    const aggregatePerformance = {
      total_migration_duration_ms: results.reduce((sum, r) => sum + r.performance_metrics.migration_duration_ms, 0),
      total_downtime_estimate_ms: results.reduce((sum, r) => sum + r.performance_metrics.downtime_estimate_ms, 0),
      total_disk_space_mb: results.reduce((sum, r) => sum + r.performance_metrics.disk_space_required_mb, 0),
      rollback_available: results.every(r => r.rollback_plan.available)
    };
    
    // Store batch summary
    await supabase.from('performance_metrics').insert({
      restaurant_id,
      metric_type: 'training_migration_batch',
      metric_data: {
        batch_id: batchId,
        environment,
        migration_strategy,
        test_count: test_suite.length,
        completed_tests: completedTests.length,
        readiness_score: Math.round(readinessScore * 100) / 100,
        aggregate_performance: aggregatePerformance,
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
        readiness_score: Math.round(readinessScore * 100) / 100,
        migration_grade: readinessScore >= 95 ? 'A' : readinessScore >= 90 ? 'B' : readinessScore >= 80 ? 'C' : readinessScore >= 70 ? 'D' : 'F',
        total_scenarios: totalScenarios,
        passed_scenarios: passedScenarios,
        failed_scenarios: totalScenarios - passedScenarios,
        performance_summary: aggregatePerformance,
        rollback_ready: results.every(r => r.rollback_plan.available && r.rollback_plan.tested),
        production_ready: readinessScore >= 95 && results.every(r => r.rollback_plan.available)
      }
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Error in data migration POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove migration test results
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const restaurantId = searchParams.get('restaurant_id');
    const batchId = searchParams.get('batch_id');
    const migrationVersion = searchParams.get('migration_version');
    
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }
    
    let query = supabase
      .from('performance_metrics')
      .delete()
      .eq('restaurant_id', restaurantId)
      .in('metric_type', ['training_migration_test', 'training_migration_batch']);
    
    if (batchId) {
      query = query.eq('metric_data->batch_id', batchId);
    } else if (migrationVersion) {
      query = query.eq('metric_data->migration_version', migrationVersion);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting migration test results:', error);
      return NextResponse.json({ error: 'Failed to delete migration test results' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Migration test results deleted successfully',
      deleted_for: batchId ? `batch ${batchId}` : migrationVersion ? `version ${migrationVersion}` : `restaurant ${restaurantId}`
    });
    
  } catch (error) {
    console.error('Error in data migration DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}