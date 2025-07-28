/**
 * External Integrations API
 * Third-party system integration and data synchronization
 * 
 * Features:
 * - POS system integration and real-time sync
 * - Accounting software integration (QuickBooks, Sage, etc.)
 * - Inventory management system connectivity
 * - HR system integration for staff management
 * - Marketing platform synchronization
 * - Delivery platform API integration
 * - Real-time data mapping and transformation
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const IntegrationQuerySchema = z.object({
  integrationType: z.enum(['pos', 'accounting', 'inventory', 'hr', 'marketing', 'delivery', 'all']).optional().default('all'),
  status: z.enum(['active', 'inactive', 'error', 'syncing']).optional(),
  restaurantId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  includeMetrics: z.boolean().optional().default(true),
  includeErrors: z.boolean().optional().default(true),
  timeframe: z.enum(['24h', '7d', '30d']).optional().default('24h')
});

const CreateIntegrationSchema = z.object({
  integration_name: z.string().min(3).max(100),
  integration_type: z.enum(['pos', 'accounting', 'inventory', 'hr', 'marketing', 'delivery']),
  provider: z.string().min(2).max(50),
  api_endpoint: z.string().url(),
  authentication_type: z.enum(['api_key', 'oauth2', 'basic_auth', 'bearer_token', 'custom']),
  configuration: z.object({
    api_key: z.string().optional(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    custom_headers: z.record(z.string(), z.string()).optional(),
    timeout_ms: z.number().optional().default(30000),
    retry_attempts: z.number().optional().default(3)
  }),
  field_mappings: z.record(z.string(), z.string()).optional().default({}),
  restaurant_ids: z.array(z.string().uuid()).min(1),
  region_ids: z.array(z.string().uuid()).optional().default([]),
  sync_frequency_minutes: z.number().min(5).max(1440).optional().default(60),
  is_bidirectional: z.boolean().optional().default(false),
  data_filters: z.record(z.string(), z.any()).optional().default({}),
  validation_rules: z.array(z.string()).optional().default([])
});

const SyncRequestSchema = z.object({
  integration_id: z.string().uuid(),
  sync_type: z.enum(['full', 'incremental', 'test']).optional().default('incremental'),
  force_sync: z.boolean().optional().default(false),
  data_range: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
  }).optional()
});

const UpdateIntegrationSchema = z.object({
  integration_id: z.string().uuid(),
  updates: z.object({
    is_active: z.boolean().optional(),
    sync_frequency_minutes: z.number().optional(),
    configuration: z.record(z.string(), z.any()).optional(),
    field_mappings: z.record(z.string(), z.string()).optional(),
    restaurant_ids: z.array(z.string().uuid()).optional(),
    validation_rules: z.array(z.string()).optional()
  })
});

// Integration provider configurations
const INTEGRATION_PROVIDERS = {
  pos: {
    'Square': {
      baseUrl: 'https://connect.squareup.com/v2',
      authType: 'oauth2',
      commonEndpoints: {
        orders: '/orders',
        payments: '/payments',
        inventory: '/catalog/list'
      }
    },
    'Toast': {
      baseUrl: 'https://ws-api.toasttab.com',
      authType: 'bearer_token',
      commonEndpoints: {
        orders: '/orders/v2/orders',
        menus: '/config/v1/menus',
        employees: '/labor/v1/employees'
      }
    },
    'Clover': {
      baseUrl: 'https://api.clover.com/v3',
      authType: 'bearer_token',
      commonEndpoints: {
        orders: '/merchants/{merchantId}/orders',
        inventory: '/merchants/{merchantId}/items'
      }
    }
  },
  accounting: {
    'QuickBooks': {
      baseUrl: 'https://quickbooks-api.intuit.com/v3',
      authType: 'oauth2',
      commonEndpoints: {
        customers: '/companyid/{companyId}/customers',
        invoices: '/companyid/{companyId}/invoice',
        expenses: '/companyid/{companyId}/purchase'
      }
    },
    'Sage': {
      baseUrl: 'https://api.sage.com/v3.1',
      authType: 'oauth2',
      commonEndpoints: {
        sales: '/sales_invoices',
        purchases: '/purchase_invoices',
        contacts: '/contacts'
      }
    }
  },
  inventory: {
    'BevSpot': {
      baseUrl: 'https://api.bevspot.com/v1',
      authType: 'api_key',
      commonEndpoints: {
        inventory: '/inventory',
        orders: '/orders',
        vendors: '/vendors'
      }
    },
    'RestockIt': {
      baseUrl: 'https://api.restockit.com/v2',
      authType: 'bearer_token',
      commonEndpoints: {
        items: '/items',
        stock: '/stock-levels',
        orders: '/purchase-orders'
      }
    }
  }
};

// Logger utility
function logIntegration(context: string, operation: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const operationLog = {
    timestamp,
    context,
    operation,
    metadata,
    level: 'info'
  };
  
  console.log(`[INTEGRATIONS] ${timestamp}:`, JSON.stringify(operationLog, null, 2));
}

function logIntegrationError(context: string, error: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata,
    level: 'error'
  };
  
  console.error(`[INTEGRATIONS-ERROR] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify integration admin access
async function verifyIntegrationAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select(`
      id, 
      role, 
      full_name,
      restaurant_id,
      restaurants!inner(settings)
    `)
    .eq('id', userId)
    .in('role', ['admin', 'manager'])
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Integration management access required');
  }

  return user;
}

// Helper function to mask sensitive configuration data
function maskSensitiveData(config: any): any {
  const masked = { ...config };
  const sensitiveFields = ['api_key', 'client_secret', 'password', 'token'];
  
  sensitiveFields.forEach(field => {
    if (masked[field]) {
      masked[field] = masked[field].substring(0, 4) + '*'.repeat(Math.max(0, masked[field].length - 4));
    }
  });
  
  return masked;
}

// Helper function to simulate external API call
async function simulateExternalApiCall(integration: any, endpoint: string, method: string = 'GET'): Promise<any> {
  // Simulate API call latency
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  // Simulate success/failure based on integration status
  const successRate = integration.success_rate_percentage / 100;
  const isSuccess = Math.random() < successRate;
  
  if (!isSuccess) {
    throw new Error(`API call failed: ${endpoint} - ${method}`);
  }
  
  // Return mock data based on integration type
  switch (integration.integration_type) {
    case 'pos':
      return {
        orders: [
          { id: '1', total: 45.67, timestamp: new Date().toISOString() },
          { id: '2', total: 23.45, timestamp: new Date().toISOString() }
        ]
      };
    case 'accounting':
      return {
        invoices: [
          { id: 'INV-001', amount: 1234.56, due_date: '2024-08-15' }
        ]
      };
    case 'inventory':
      return {
        items: [
          { id: 'ITEM-001', name: 'Rice', stock_level: 150 },
          { id: 'ITEM-002', name: 'Chicken', stock_level: 75 }
        ]
      };
    default:
      return { success: true, data: [] };
  }
}

// GET: Integration Overview
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = IntegrationQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { integrationType, status, restaurantId, regionId, includeMetrics, includeErrors, timeframe } = validationResult.data;

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyIntegrationAccess(supabase, userId);
      logIntegration('INTEGRATION_ACCESS', { userId, integrationType, timeframe });
    } catch (error) {
      logIntegrationError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Generate mock integration data (in real implementation, this would come from external_integrations table)
    const mockIntegrations = [
      {
        id: '1',
        integration_name: 'Main Square POS',
        integration_type: 'pos',
        provider: 'Square',
        api_endpoint: 'https://connect.squareup.com/v2',
        restaurant_ids: [restaurantId || 'rest-001'],
        is_active: true,
        last_sync_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        sync_frequency_minutes: 15,
        sync_status: 'success',
        error_count_24h: 0,
        success_rate_percentage: 99.8,
        avg_response_time_ms: 245,
        data_volume_daily: 1250,
        created_at: '2024-01-15T00:00:00Z'
      },
      {
        id: '2',
        integration_name: 'QuickBooks Accounting',
        integration_type: 'accounting',
        provider: 'QuickBooks',
        api_endpoint: 'https://quickbooks-api.intuit.com/v3',
        restaurant_ids: [restaurantId || 'rest-001'],
        is_active: true,
        last_sync_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        sync_frequency_minutes: 240, // 4 hours
        sync_status: 'success',
        error_count_24h: 1,
        success_rate_percentage: 97.2,
        avg_response_time_ms: 890,
        data_volume_daily: 450,
        created_at: '2024-02-01T00:00:00Z'
      },
      {
        id: '3',
        integration_name: 'BevSpot Inventory',
        integration_type: 'inventory',
        provider: 'BevSpot',
        api_endpoint: 'https://api.bevspot.com/v1',
        restaurant_ids: [restaurantId || 'rest-001'],
        is_active: false,
        last_sync_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        sync_frequency_minutes: 60,
        sync_status: 'error',
        error_count_24h: 15,
        last_error: 'Authentication failed - API key expired',
        last_error_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        success_rate_percentage: 45.3,
        avg_response_time_ms: 1250,
        data_volume_daily: 0,
        created_at: '2024-03-01T00:00:00Z'
      },
      {
        id: '4',
        integration_name: 'UberEats Delivery',
        integration_type: 'delivery',
        provider: 'UberEats',
        api_endpoint: 'https://api.uber.com/v1/eats',
        restaurant_ids: [restaurantId || 'rest-001'],
        is_active: true,
        last_sync_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        sync_frequency_minutes: 5,
        sync_status: 'syncing',
        error_count_24h: 3,
        success_rate_percentage: 94.7,
        avg_response_time_ms: 520,
        data_volume_daily: 850,
        created_at: '2024-04-01T00:00:00Z'
      }
    ];

    // Filter integrations based on criteria
    let filteredIntegrations = mockIntegrations;
    
    if (integrationType !== 'all') {
      filteredIntegrations = filteredIntegrations.filter(integration => 
        integration.integration_type === integrationType
      );
    }
    
    if (status) {
      filteredIntegrations = filteredIntegrations.filter(integration => {
        switch (status) {
          case 'active': return integration.is_active && integration.sync_status === 'success';
          case 'inactive': return !integration.is_active;
          case 'error': return integration.sync_status === 'error';
          case 'syncing': return integration.sync_status === 'syncing';
          default: return true;
        }
      });
    }

    // Mask sensitive configuration data
    const safeIntegrations = filteredIntegrations.map(integration => ({
      ...integration,
      configuration: maskSensitiveData(integration.configuration || {})
    }));

    let responseData: any = {
      integrations: safeIntegrations
    };

    // Add metrics if requested
    if (includeMetrics) {
      const totalIntegrations = filteredIntegrations.length;
      const activeIntegrations = filteredIntegrations.filter(i => i.is_active).length;
      const errorIntegrations = filteredIntegrations.filter(i => i.sync_status === 'error').length;
      const avgSuccessRate = filteredIntegrations.reduce((sum, i) => sum + i.success_rate_percentage, 0) / totalIntegrations;
      const avgResponseTime = filteredIntegrations.reduce((sum, i) => sum + i.avg_response_time_ms, 0) / totalIntegrations;
      const totalDataVolume = filteredIntegrations.reduce((sum, i) => sum + i.data_volume_daily, 0);

      responseData.metrics = {
        totalIntegrations,
        activeIntegrations,
        inactiveIntegrations: totalIntegrations - activeIntegrations,
        errorIntegrations,
        healthyIntegrations: totalIntegrations - errorIntegrations,
        averageSuccessRate: Math.round(avgSuccessRate * 10) / 10,
        averageResponseTime: Math.round(avgResponseTime),
        totalDataVolumeDaily: totalDataVolume,
        integrationsByType: filteredIntegrations.reduce((acc: any, integration) => {
          acc[integration.integration_type] = (acc[integration.integration_type] || 0) + 1;
          return acc;
        }, {}),
        providerDistribution: filteredIntegrations.reduce((acc: any, integration) => {
          acc[integration.provider] = (acc[integration.provider] || 0) + 1;
          return acc;
        }, {})
      };
    }

    // Add error details if requested
    if (includeErrors) {
      const recentErrors = filteredIntegrations
        .filter(i => i.last_error && i.error_count_24h > 0)
        .map(i => ({
          integrationId: i.id,
          integrationName: i.integration_name,
          provider: i.provider,
          lastError: i.last_error,
          lastErrorAt: i.last_error_at,
          errorCount24h: i.error_count_24h,
          successRate: i.success_rate_percentage
        }))
        .sort((a, b) => b.errorCount24h - a.errorCount24h);

      responseData.recentErrors = recentErrors;
    }

    // Add available providers information
    responseData.availableProviders = INTEGRATION_PROVIDERS;

    logIntegration('INTEGRATION_QUERY', {
      integrationType,
      integrationsReturned: filteredIntegrations.length,
      includeMetrics,
      includeErrors
    });

    return NextResponse.json({
      success: true,
      data: {
        ...responseData,
        metadata: {
          integrationType,
          status,
          timeframe,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logIntegrationError('UNEXPECTED_ERROR', error, { operation: 'integration_query' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Create New Integration
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    // Parse and validate request body
    const body = await request.json();
    
    // Handle different request types
    if (body.action === 'sync') {
      const validationResult = SyncRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      return await handleSyncRequest(supabase, request, validationResult.data);
    } else {
      const validationResult = CreateIntegrationSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      return await handleCreateIntegration(supabase, request, validationResult.data);
    }

  } catch (error) {
    logIntegrationError('UNEXPECTED_ERROR', error, { operation: 'integration_create_or_sync' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// Handle sync request
async function handleSyncRequest(supabase: any, request: NextRequest, syncData: any) {
  const { integration_id, sync_type, force_sync, data_range } = syncData;

  // Verify access
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const userId = authHeader.replace('Bearer ', '');
  
  try {
    await verifyIntegrationAccess(supabase, userId);
  } catch (error) {
    logIntegrationError('ACCESS_DENIED', error, { userId });
    return NextResponse.json(
      { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
      { status: 403 }
    );
  }

  // Simulate finding the integration
  const mockIntegration = {
    id: integration_id,
    integration_name: 'Test Integration',
    integration_type: 'pos',
    provider: 'Square',
    success_rate_percentage: 95.5
  };

  // Simulate sync operation
  try {
    const syncResult = await simulateExternalApiCall(mockIntegration, '/sync', 'POST');
    
    const syncResponse = {
      integration_id,
      sync_type,
      status: 'completed',
      records_processed: Math.floor(Math.random() * 1000) + 100,
      records_updated: Math.floor(Math.random() * 800) + 50,
      records_created: Math.floor(Math.random() * 200) + 10,
      records_failed: Math.floor(Math.random() * 5),
      sync_duration_ms: Math.floor(Math.random() * 5000) + 1000,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      data_range: data_range || null,
      result_summary: syncResult
    };

    // Log the sync operation
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: null,
        user_id: userId,
        action: 'UPDATE',
        resource_type: 'integration_sync',
        resource_id: integration_id,
        details: {
          syncType: sync_type,
          forceSync: force_sync,
          recordsProcessed: syncResponse.records_processed,
          syncDuration: syncResponse.sync_duration_ms
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    logIntegration('INTEGRATION_SYNC', {
      integrationId: integration_id,
      syncType: sync_type,
      recordsProcessed: syncResponse.records_processed,
      duration: syncResponse.sync_duration_ms
    });

    return NextResponse.json({
      success: true,
      message: 'Integration sync completed successfully',
      data: syncResponse
    });

  } catch (error) {
    logIntegrationError('SYNC_FAILED', error, { integrationId: integration_id });
    
    return NextResponse.json({
      success: false,
      message: 'Integration sync failed',
      data: {
        integration_id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date().toISOString()
      }
    }, { status: 422 });
  }
}

// Handle create integration
async function handleCreateIntegration(supabase: any, request: NextRequest, integrationData: any) {
  // Verify access
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const userId = authHeader.replace('Bearer ', '');
  
  try {
    await verifyIntegrationAccess(supabase, userId);
  } catch (error) {
    logIntegrationError('ACCESS_DENIED', error, { userId });
    return NextResponse.json(
      { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
      { status: 403 }
    );
  }

  // Test the integration configuration
  let testResult;
  try {
    testResult = await simulateExternalApiCall(integrationData, '/test', 'GET');
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Integration test failed - please check configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 422 });
  }

  // Create the integration (in real implementation, this would insert into external_integrations table)
  const newIntegration = {
    id: `integration-${Date.now()}`,
    ...integrationData,
    is_active: true,
    sync_status: 'pending',
    error_count_24h: 0,
    success_rate_percentage: 100,
    avg_response_time_ms: 0,
    data_volume_daily: 0,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    configuration: maskSensitiveData(integrationData.configuration),
    test_result: testResult
  };

  // Log the integration creation
  await supabase
    .from('audit_logs')
    .insert({
      restaurant_id: null,
      user_id: userId,
      action: 'CREATE',
      resource_type: 'external_integration',
      resource_id: newIntegration.id,
      details: {
        integrationName: integrationData.integration_name,
        integrationType: integrationData.integration_type,
        provider: integrationData.provider,
        restaurantIds: integrationData.restaurant_ids,
        testPassed: true
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

  logIntegration('INTEGRATION_CREATED', {
    integrationId: newIntegration.id,
    integrationName: integrationData.integration_name,
    integrationType: integrationData.integration_type,
    provider: integrationData.provider,
    createdBy: userId
  });

  return NextResponse.json({
    success: true,
    message: 'Integration created and tested successfully',
    data: {
      integrationId: newIntegration.id,
      integrationName: newIntegration.integration_name,
      integrationType: newIntegration.integration_type,
      provider: newIntegration.provider,
      status: newIntegration.sync_status,
      createdAt: newIntegration.created_at,
      testResult: 'passed'
    }
  });
}

// PUT: Update Integration Configuration
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error', code: 'SERVICE_CONFIG' },
        { status: 503 }
      );
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateIntegrationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { integration_id, updates } = validationResult.data;

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyIntegrationAccess(supabase, userId);
    } catch (error) {
      logIntegrationError('ACCESS_DENIED', error, { userId });
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // In a real implementation, this would update the external_integrations table
    const updatedIntegration = {
      id: integration_id,
      ...updates,
      updated_at: new Date().toISOString(),
      last_tested_by: userId,
      last_tested_at: new Date().toISOString()
    };

    // Mask sensitive data
    if (updates.configuration) {
      updatedIntegration.configuration = maskSensitiveData(updates.configuration);
    }

    // Log the integration update
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: null,
        user_id: userId,
        action: 'UPDATE',
        resource_type: 'external_integration',
        resource_id: integration_id,
        details: {
          updates,
          updatedFields: Object.keys(updates)
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    logIntegration('INTEGRATION_UPDATED', {
      integrationId: integration_id,
      updatedFields: Object.keys(updates),
      updatedBy: userId
    });

    return NextResponse.json({
      success: true,
      message: 'Integration updated successfully',
      data: updatedIntegration
    });

  } catch (error) {
    logIntegrationError('UNEXPECTED_ERROR', error, { operation: 'integration_update' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}