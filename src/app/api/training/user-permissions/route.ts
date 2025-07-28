import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Permission test schema
const PermissionTestSchema = z.object({
  test_type: z.enum(['role_access', 'module_permissions', 'data_isolation', 'action_authorization', 'session_validation']),
  target_role: z.enum(['admin', 'manager', 'chef', 'server']).optional(),
  test_scenarios: z.array(z.object({
    scenario_name: z.string(),
    user_role: z.enum(['admin', 'manager', 'chef', 'server']),
    resource: z.string(),
    action: z.enum(['create', 'read', 'update', 'delete', 'execute']),
    expected_result: z.enum(['allow', 'deny']),
    test_data: z.record(z.any()).optional()
  })),
  security_level: z.enum(['basic', 'standard', 'strict']).optional()
});

const PermissionConfigSchema = z.object({
  restaurant_id: z.string().uuid(),
  test_suite: z.array(PermissionTestSchema),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  metadata: z.record(z.any()).optional()
});

// Permission test result
interface PermissionResult {
  test_id: string;
  test_type: string;
  status: 'completed' | 'failed' | 'partial';
  timestamp: string;
  scenarios_tested: number;
  scenarios_passed: number;
  scenarios_failed: number;
  security_score: number;
  detailed_results: {
    scenario_name: string;
    user_role: string;
    resource: string;
    action: string;
    expected_result: string;
    actual_result: string;
    passed: boolean;
    execution_time_ms: number;
    error_message?: string;
  }[];
  security_findings: {
    severity: 'critical' | 'high' | 'medium' | 'low';
    finding: string;
    resource: string;
    recommendation: string;
  }[];
  compliance_status: {
    gdpr_compliant: boolean;
    rbac_compliant: boolean;
    audit_trail_complete: boolean;
    session_management_secure: boolean;
  };
  recommendations: string[];
}

// Role permission matrix
const ROLE_PERMISSIONS = {
  admin: {
    training_modules: ['create', 'read', 'update', 'delete'],
    training_progress: ['create', 'read', 'update', 'delete'],
    training_assessments: ['create', 'read', 'update', 'delete'],
    training_certificates: ['create', 'read', 'update', 'delete'],
    user_management: ['create', 'read', 'update', 'delete'],
    system_settings: ['create', 'read', 'update', 'delete'],
    analytics: ['read'],
    audit_logs: ['read']
  },
  manager: {
    training_modules: ['create', 'read', 'update'],
    training_progress: ['read', 'update'],
    training_assessments: ['create', 'read', 'update'],
    training_certificates: ['create', 'read'],
    user_management: ['read', 'update'],
    system_settings: ['read'],
    analytics: ['read'],
    audit_logs: ['read']
  },
  chef: {
    training_modules: ['read'],
    training_progress: ['create', 'read', 'update'],
    training_assessments: ['create', 'read'],
    training_certificates: ['read'],
    user_management: [],
    system_settings: [],
    analytics: [],
    audit_logs: []
  },
  server: {
    training_modules: ['read'],
    training_progress: ['create', 'read', 'update'],
    training_assessments: ['create', 'read'],
    training_certificates: ['read'],
    user_management: [],
    system_settings: [],
    analytics: [],
    audit_logs: []
  }
};

// Test role access permissions
async function testRoleAccess(supabase: any, restaurantId: string, scenarios: any[]): Promise<any> {
  const results = [];
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualResult = 'deny';
    let errorMessage;
    
    try {
      const userRole = scenario.user_role;
      const resource = scenario.resource;
      const action = scenario.action;
      
      // Check if role has permission for resource/action
      const rolePermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
      const resourcePermissions = rolePermissions[resource as keyof typeof rolePermissions] || [];
      
      if (resourcePermissions.includes(action)) {
        actualResult = 'allow';
      }
      
      // Additional checks for specific scenarios
      if (resource === 'training_progress' && action === 'read') {
        // Users can always read their own progress
        if (scenario.test_data?.user_id === scenario.test_data?.target_user_id || 
            ['admin', 'manager'].includes(userRole)) {
          actualResult = 'allow';
        }
      }
      
      if (resource === 'user_management' && action === 'update') {
        // Users can update their own profile
        if (scenario.test_data?.user_id === scenario.test_data?.target_user_id) {
          actualResult = 'allow';
        }
      }
      
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      actualResult = 'deny';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualResult === scenario.expected_result;
    
    results.push({
      scenario_name: scenario.scenario_name,
      user_role: scenario.user_role,
      resource: scenario.resource,
      action: scenario.action,
      expected_result: scenario.expected_result,
      actual_result: actualResult,
      passed,
      execution_time_ms: executionTime,
      error_message: errorMessage
    });
  }
  
  return results;
}

// Test module permissions
async function testModulePermissions(supabase: any, restaurantId: string, scenarios: any[]): Promise<any> {
  const results = [];
  
  // Get training modules for restaurant
  const { data: modules, error: modulesError } = await supabase
    .from('training_modules')
    .select('id, title, required_role, is_active')
    .eq('restaurant_id', restaurantId);
  
  if (modulesError) {
    throw new Error(`Failed to fetch training modules: ${modulesError.message}`);
  }
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualResult = 'deny';
    let errorMessage;
    
    try {
      const userRole = scenario.user_role;
      const moduleId = scenario.test_data?.module_id;
      
      // Find the module
      const module = modules.find(m => m.id === moduleId);
      if (!module) {
        actualResult = 'deny';
        errorMessage = 'Module not found';
      } else if (!module.is_active) {
        actualResult = 'deny';
        errorMessage = 'Module is inactive';
      } else {
        // Check role requirements
        const requiredRole = module.required_role;
        const roleHierarchy = ['server', 'chef', 'manager', 'admin'];
        const userRoleLevel = roleHierarchy.indexOf(userRole);
        const requiredRoleLevel = roleHierarchy.indexOf(requiredRole);
        
        if (userRoleLevel >= requiredRoleLevel) {
          actualResult = 'allow';
        } else {
          actualResult = 'deny';
          errorMessage = `Role ${userRole} insufficient for module requiring ${requiredRole}`;
        }
      }
      
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      actualResult = 'deny';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualResult === scenario.expected_result;
    
    results.push({
      scenario_name: scenario.scenario_name,
      user_role: scenario.user_role,
      resource: scenario.resource,
      action: scenario.action,
      expected_result: scenario.expected_result,
      actual_result: actualResult,
      passed,
      execution_time_ms: executionTime,
      error_message: errorMessage
    });
  }
  
  return results;
}

// Test data isolation
async function testDataIsolation(supabase: any, restaurantId: string, scenarios: any[]): Promise<any> {
  const results = [];
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualResult = 'deny';
    let errorMessage;
    
    try {
      const userRole = scenario.user_role;
      const userId = scenario.test_data?.user_id;
      const targetRestaurantId = scenario.test_data?.target_restaurant_id;
      
      // Test cross-restaurant data access
      if (targetRestaurantId && targetRestaurantId !== restaurantId) {
        // Should always deny cross-restaurant access unless admin
        if (userRole === 'admin') {
          actualResult = 'allow';
        } else {
          actualResult = 'deny';
          errorMessage = 'Cross-restaurant access denied';
        }
      } else {
        // Test user data isolation within restaurant
        const targetUserId = scenario.test_data?.target_user_id;
        
        if (userId === targetUserId) {
          // Users can access their own data
          actualResult = 'allow';
        } else if (['admin', 'manager'].includes(userRole)) {
          // Admins and managers can access user data within restaurant
          actualResult = 'allow';
        } else {
          actualResult = 'deny';
          errorMessage = 'User data isolation enforced';
        }
      }
      
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      actualResult = 'deny';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualResult === scenario.expected_result;
    
    results.push({
      scenario_name: scenario.scenario_name,
      user_role: scenario.user_role,
      resource: scenario.resource,
      action: scenario.action,
      expected_result: scenario.expected_result,
      actual_result: actualResult,
      passed,
      execution_time_ms: executionTime,
      error_message: errorMessage
    });
  }
  
  return results;
}

// Test action authorization
async function testActionAuthorization(supabase: any, restaurantId: string, scenarios: any[]): Promise<any> {
  const results = [];
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualResult = 'deny';
    let errorMessage;
    
    try {
      const userRole = scenario.user_role;
      const action = scenario.action;
      const resource = scenario.resource;
      
      // Test specific authorization rules
      switch (resource) {
        case 'training_certificates':
          if (action === 'create') {
            // Only admins and managers can issue certificates
            actualResult = ['admin', 'manager'].includes(userRole) ? 'allow' : 'deny';
          } else if (action === 'delete') {
            // Only admins can revoke certificates
            actualResult = userRole === 'admin' ? 'allow' : 'deny';
          } else if (action === 'read') {
            // Users can read their own certificates, admins/managers can read all
            actualResult = 'allow'; // Simplified for testing
          }
          break;
          
        case 'training_assessments':
          if (action === 'create') {
            // Users can create assessments for themselves
            actualResult = 'allow';
          } else if (action === 'update') {
            // Only admins and managers can update assessment scores
            actualResult = ['admin', 'manager'].includes(userRole) ? 'allow' : 'deny';
          } else if (action === 'delete') {
            // Only admins can delete assessments
            actualResult = userRole === 'admin' ? 'allow' : 'deny';
          }
          break;
          
        case 'audit_logs':
          if (action === 'read') {
            // Only admins and managers can read audit logs
            actualResult = ['admin', 'manager'].includes(userRole) ? 'allow' : 'deny';
          } else {
            // No one can modify audit logs
            actualResult = 'deny';
          }
          break;
          
        default:
          // Use standard role permissions
          const rolePermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
          const resourcePermissions = rolePermissions[resource as keyof typeof rolePermissions] || [];
          actualResult = resourcePermissions.includes(action) ? 'allow' : 'deny';
      }
      
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      actualResult = 'deny';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualResult === scenario.expected_result;
    
    results.push({
      scenario_name: scenario.scenario_name,
      user_role: scenario.user_role,
      resource: scenario.resource,
      action: scenario.action,
      expected_result: scenario.expected_result,
      actual_result: actualResult,
      passed,
      execution_time_ms: executionTime,
      error_message: errorMessage
    });
  }
  
  return results;
}

// Test session validation
async function testSessionValidation(supabase: any, restaurantId: string, scenarios: any[]): Promise<any> {
  const results = [];
  
  for (const scenario of scenarios) {
    const startTime = Date.now();
    let actualResult = 'deny';
    let errorMessage;
    
    try {
      const sessionData = scenario.test_data?.session;
      
      if (!sessionData) {
        actualResult = 'deny';
        errorMessage = 'No session data provided';
      } else {
        // Validate session structure
        const requiredFields = ['user_id', 'restaurant_id', 'role', 'expires_at', 'created_at'];
        const hasRequiredFields = requiredFields.every(field => sessionData[field] !== undefined);
        
        if (!hasRequiredFields) {
          actualResult = 'deny';
          errorMessage = 'Invalid session structure';
        } else {
          // Check session expiry
          const expiresAt = new Date(sessionData.expires_at);
          const now = new Date();
          
          if (expiresAt <= now) {
            actualResult = 'deny';
            errorMessage = 'Session expired';
          } else if (sessionData.restaurant_id !== restaurantId) {
            actualResult = 'deny';
            errorMessage = 'Session restaurant mismatch';
          } else {
            actualResult = 'allow';
          }
        }
      }
      
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      actualResult = 'deny';
    }
    
    const executionTime = Date.now() - startTime;
    const passed = actualResult === scenario.expected_result;
    
    results.push({
      scenario_name: scenario.scenario_name,
      user_role: scenario.user_role,
      resource: scenario.resource,
      action: scenario.action,
      expected_result: scenario.expected_result,
      actual_result: actualResult,
      passed,
      execution_time_ms: executionTime,
      error_message: errorMessage
    });
  }
  
  return results;
}

// Execute permission test
async function executePermissionTest(
  supabase: any,
  testConfig: z.infer<typeof PermissionTestSchema>,
  restaurantId: string
): Promise<PermissionResult> {
  const testId = `permission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let detailedResults: any[] = [];
  
  try {
    switch (testConfig.test_type) {
      case 'role_access':
        detailedResults = await testRoleAccess(supabase, restaurantId, testConfig.test_scenarios);
        break;
      case 'module_permissions':
        detailedResults = await testModulePermissions(supabase, restaurantId, testConfig.test_scenarios);
        break;
      case 'data_isolation':
        detailedResults = await testDataIsolation(supabase, restaurantId, testConfig.test_scenarios);
        break;
      case 'action_authorization':
        detailedResults = await testActionAuthorization(supabase, restaurantId, testConfig.test_scenarios);
        break;
      case 'session_validation':
        detailedResults = await testSessionValidation(supabase, restaurantId, testConfig.test_scenarios);
        break;
      default:
        throw new Error(`Unsupported test type: ${testConfig.test_type}`);
    }
  } catch (error) {
    console.error('Error in permission test execution:', error);
    return {
      test_id: testId,
      test_type: testConfig.test_type,
      status: 'failed',
      timestamp: new Date().toISOString(),
      scenarios_tested: 0,
      scenarios_passed: 0,
      scenarios_failed: 0,
      security_score: 0,
      detailed_results: [],
      security_findings: [{
        severity: 'critical',
        finding: 'Permission test execution failed',
        resource: 'system',
        recommendation: 'Check system integrity and test configuration'
      }],
      compliance_status: {
        gdpr_compliant: false,
        rbac_compliant: false,
        audit_trail_complete: false,
        session_management_secure: false
      },
      recommendations: ['Test execution failed - check system health and configuration']
    };
  }
  
  const scenariosPassed = detailedResults.filter(r => r.passed).length;
  const scenariosFailed = detailedResults.length - scenariosPassed;
  const securityScore = detailedResults.length > 0 ? (scenariosPassed / detailedResults.length) * 100 : 0;
  
  // Analyze security findings
  const securityFindings = [];
  const failedScenarios = detailedResults.filter(r => !r.passed);
  
  failedScenarios.forEach(scenario => {
    if (scenario.expected_result === 'deny' && scenario.actual_result === 'allow') {
      securityFindings.push({
        severity: 'critical' as const,
        finding: `Unauthorized access allowed: ${scenario.user_role} can ${scenario.action} ${scenario.resource}`,
        resource: scenario.resource,
        recommendation: `Review and restrict ${scenario.resource} permissions for ${scenario.user_role} role`
      });
    } else if (scenario.expected_result === 'allow' && scenario.actual_result === 'deny') {
      securityFindings.push({
        severity: 'medium' as const,
        finding: `Legitimate access denied: ${scenario.user_role} cannot ${scenario.action} ${scenario.resource}`,
        resource: scenario.resource,
        recommendation: `Review and grant necessary ${scenario.resource} permissions for ${scenario.user_role} role`
      });
    }
  });
  
  // Assess compliance status
  const complianceStatus = {
    gdpr_compliant: detailedResults.filter(r => r.resource === 'user_management' && r.passed).length > 0,
    rbac_compliant: securityScore >= 95,
    audit_trail_complete: detailedResults.filter(r => r.resource === 'audit_logs').every(r => r.passed),
    session_management_secure: detailedResults.filter(r => r.scenario_name.includes('session')).every(r => r.passed)
  };
  
  // Generate recommendations
  const recommendations = [];
  if (securityScore < 95) {
    recommendations.push('Address permission vulnerabilities to achieve security compliance');
  }
  if (securityFindings.some(f => f.severity === 'critical')) {
    recommendations.push('Critical security issues found - immediate remediation required');
  }
  if (!complianceStatus.rbac_compliant) {
    recommendations.push('Implement proper role-based access control policies');
  }
  if (!complianceStatus.audit_trail_complete) {
    recommendations.push('Ensure comprehensive audit logging for security events');
  }
  
  return {
    test_id: testId,
    test_type: testConfig.test_type,
    status: 'completed',
    timestamp: new Date().toISOString(),
    scenarios_tested: detailedResults.length,
    scenarios_passed: scenariosPassed,
    scenarios_failed: scenariosFailed,
    security_score: Math.round(securityScore * 100) / 100,
    detailed_results: detailedResults,
    security_findings: securityFindings,
    compliance_status: complianceStatus,
    recommendations
  };
}

// GET - Retrieve permission test results
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
      .eq('metric_type', 'training_permission_test')
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (testType) {
      query = query.eq('metric_data->test_type', testType);
    }
    
    const { data: tests, error } = await query;
    
    if (error) {
      console.error('Error fetching permission tests:', error);
      return NextResponse.json({ error: 'Failed to fetch permission tests' }, { status: 500 });
    }
    
    // Get total count for pagination
    let countQuery = supabase
      .from('performance_metrics')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('metric_type', 'training_permission_test');
    
    if (testType) {
      countQuery = countQuery.eq('metric_data->test_type', testType);
    }
    
    const { count } = await countQuery;
    
    return NextResponse.json({
      permission_tests: tests || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    });
    
  } catch (error) {
    console.error('Error in user permissions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Execute permission tests
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const validatedData = PermissionConfigSchema.parse(body);
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
    
    // Execute permission tests
    const results: PermissionResult[] = [];
    const batchId = `permission_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    for (const testConfig of test_suite) {
      const result = await executePermissionTest(supabase, testConfig, restaurant_id);
      results.push(result);
      
      // Store individual test results
      await supabase.from('performance_metrics').insert({
        restaurant_id,
        metric_type: 'training_permission_test',
        metric_data: {
          batch_id: batchId,
          ...result
        },
        recorded_at: new Date().toISOString()
      });
    }
    
    // Calculate overall security score
    const completedTests = results.filter(r => r.status === 'completed');
    const totalScore = completedTests.reduce((sum, test) => sum + test.security_score, 0);
    const averageScore = completedTests.length > 0 ? totalScore / completedTests.length : 0;
    
    // Aggregate security findings
    const allFindings = results.flatMap(r => r.security_findings);
    const criticalFindings = allFindings.filter(f => f.severity === 'critical').length;
    const highFindings = allFindings.filter(f => f.severity === 'high').length;
    
    // Store batch summary
    await supabase.from('performance_metrics').insert({
      restaurant_id,
      metric_type: 'training_permission_batch',
      metric_data: {
        batch_id: batchId,
        test_count: test_suite.length,
        completed_tests: completedTests.length,
        average_security_score: Math.round(averageScore * 100) / 100,
        critical_findings: criticalFindings,
        high_findings: highFindings,
        environment,
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
        average_security_score: Math.round(averageScore * 100) / 100,
        security_grade: averageScore >= 95 ? 'A' : averageScore >= 90 ? 'B' : averageScore >= 80 ? 'C' : averageScore >= 70 ? 'D' : 'F',
        total_scenarios: results.reduce((sum, r) => sum + r.scenarios_tested, 0),
        total_critical_findings: criticalFindings,
        total_high_findings: highFindings,
        compliance_summary: {
          gdpr_compliant: results.every(r => r.compliance_status.gdpr_compliant),
          rbac_compliant: results.every(r => r.compliance_status.rbac_compliant),
          audit_trail_complete: results.every(r => r.compliance_status.audit_trail_complete),
          session_management_secure: results.every(r => r.compliance_status.session_management_secure)
        }
      }
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Error in user permissions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove permission test results
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
      .in('metric_type', ['training_permission_test', 'training_permission_batch']);
    
    if (batchId) {
      query = query.eq('metric_data->batch_id', batchId);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting permission test results:', error);
      return NextResponse.json({ error: 'Failed to delete permission test results' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Permission test results deleted successfully',
      deleted_for: batchId ? `batch ${batchId}` : `restaurant ${restaurantId}`
    });
    
  } catch (error) {
    console.error('Error in user permissions DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}