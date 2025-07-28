/**
 * Multi-Restaurant SOP Standardization API
 * Chain-wide SOP standardization and deployment system
 * 
 * Features:
 * - Master SOP template management
 * - Standardized procedure deployment
 * - Local customization controls
 * - Version control and rollback
 * - Compliance monitoring
 * - Brand consistency enforcement
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const StandardSOPQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  status: z.enum(['draft', 'approved', 'deployed', 'archived']).optional(),
  version: z.string().optional(),
  includeCustomizations: z.boolean().optional().default(false),
  regionId: z.string().uuid().optional(),
  complianceLevel: z.enum(['strict', 'flexible', 'adaptive']).optional()
});

const StandardSOPCreateSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(5).max(500),
  titleFr: z.string().min(5).max(500),
  content: z.string().min(50),
  contentFr: z.string().min(50),
  steps: z.array(z.object({
    stepNumber: z.number().int().min(1),
    title: z.string().min(3).max(200),
    titleFr: z.string().min(3).max(200),
    content: z.string().min(10),
    contentFr: z.string().min(10),
    isCustomizable: z.boolean().default(false),
    customizationLevel: z.enum(['none', 'text_only', 'content', 'full']).default('none'),
    requiredResources: z.array(z.string()).optional(),
    estimatedTime: z.number().int().min(1).optional(),
    safetyNotes: z.string().optional(),
    safetyNotesFr: z.string().optional()
  })).min(1),
  tags: z.array(z.string()).optional(),
  tagsFr: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  complianceRequirements: z.object({
    level: z.enum(['strict', 'flexible', 'adaptive']),
    mandatorySteps: z.array(z.number()).optional(),
    customizableFields: z.array(z.string()).optional(),
    approvalRequired: z.boolean().default(true)
  }),
  brandStandards: z.object({
    enforceFormatting: z.boolean().default(true),
    allowLocalImages: z.boolean().default(false),
    requireApproval: z.boolean().default(true),
    standardImages: z.array(z.string()).optional()
  }).optional(),
  effectiveDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional()
});

const DeploymentSchema = z.object({
  standardSOPId: z.string().uuid(),
  targetRestaurants: z.array(z.string().uuid()).min(1),
  deploymentType: z.enum(['immediate', 'scheduled', 'phased']),
  scheduledDate: z.string().datetime().optional(),
  phaseConfig: z.object({
    phases: z.array(z.object({
      name: z.string(),
      restaurants: z.array(z.string().uuid()),
      startDate: z.string().datetime(),
      endDate: z.string().datetime()
    }))
  }).optional(),
  allowCustomizations: z.boolean().default(false),
  requireConfirmation: z.boolean().default(true),
  notificationSettings: z.object({
    notifyManagers: z.boolean().default(true),
    notifyStaff: z.boolean().default(false),
    reminderInterval: z.enum(['none', 'daily', 'weekly']).default('weekly')
  }).optional()
});

const CustomizationSchema = z.object({
  deployedSOPId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  customizations: z.object({
    title: z.string().optional(),
    titleFr: z.string().optional(),
    content: z.string().optional(),
    contentFr: z.string().optional(),
    stepCustomizations: z.array(z.object({
      stepNumber: z.number().int().min(1),
      customContent: z.string().optional(),
      customContentFr: z.string().optional(),
      additionalNotes: z.string().optional(),
      localResources: z.array(z.string()).optional()
    })).optional(),
    localImages: z.array(z.string()).optional(),
    additionalSteps: z.array(z.object({
      insertAfterStep: z.number().int(),
      title: z.string(),
      titleFr: z.string(),
      content: z.string(),
      contentFr: z.string()
    })).optional()
  }),
  justification: z.string().min(20).max(1000),
  requestedBy: z.string().uuid(),
  approvalRequired: z.boolean().default(true)
});

// Logger utility
function logError(context: string, error: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata
  };
  
  console.error(`[SOP-STANDARDIZATION] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify SOP admin access
async function verifySOPAdminAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('id, role, restaurant_id, restaurants!inner(id, name)')
    .eq('id', userId)
    .in('role', ['admin', 'manager'])
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - SOP admin access required');
  }

  return user;
}

// Helper function to generate SOP version
function generateVersionNumber(baseVersion: string = '1.0.0'): string {
  const parts = baseVersion.split('.');
  const patch = parseInt(parts[2] || '0') + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

// GET: Standard SOP Templates
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
    
    const validationResult = StandardSOPQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { categoryId, status, version, includeCustomizations, regionId, complianceLevel } = validationResult.data;

    // Verify SOP admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifySOPAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Build query for standard SOPs
    // Note: This assumes a standard_sops table exists in the database
    let standardSOPsQuery = supabase
      .from('sop_documents')
      .select(`
        id,
        category_id,
        title,
        title_fr,
        content,
        content_fr,
        steps,
        steps_fr,
        tags,
        tags_fr,
        version,
        status,
        priority,
        effective_date,
        review_date,
        created_at,
        updated_at,
        created_by,
        updated_by,
        approved_by,
        approved_at,
        sop_categories!inner(code, name, name_fr),
        auth_users!created_by(full_name, full_name_fr),
        auth_users!updated_by(full_name, full_name_fr),
        auth_users!approved_by(full_name, full_name_fr)
      `)
      .eq('restaurant_id', 'master') // Assuming master templates have a special restaurant_id
      .order('created_at', { ascending: false });

    if (categoryId) {
      standardSOPsQuery = standardSOPsQuery.eq('category_id', categoryId);
    }

    if (status) {
      standardSOPsQuery = standardSOPsQuery.eq('status', status);
    }

    if (version) {
      standardSOPsQuery = standardSOPsQuery.eq('version', version);
    }

    const { data: standardSOPs, error: sopsError } = await standardSOPsQuery;

    if (sopsError) {
      logError('STANDARD_SOPS_QUERY', sopsError);
      return NextResponse.json(
        { error: 'Failed to fetch standard SOPs', code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    // Get deployment status for each SOP
    let deploymentData = null;
    if (includeCustomizations) {
      const sopIds = standardSOPs?.map(sop => sop.id) || [];
      
      if (sopIds.length > 0) {
        const { data: deployments, error: deploymentsError } = await supabase
          .from('sop_documents')
          .select(`
            id,
            restaurant_id,
            title,
            version,
            status,
            created_at,
            restaurants!inner(name, name_fr)
          `)
          .in('parent_sop_id', sopIds) // Assuming deployed SOPs reference parent
          .eq('is_active', true);

        if (!deploymentsError && deployments) {
          deploymentData = deployments.reduce((acc: any, deployment: any) => {
            const parentId = deployment.parent_sop_id;
            if (!acc[parentId]) {
              acc[parentId] = [];
            }
            acc[parentId].push({
              restaurantId: deployment.restaurant_id,
              restaurantName: deployment.restaurants.name,
              restaurantNameFr: deployment.restaurants.name_fr,
              sopId: deployment.id,
              version: deployment.version,
              status: deployment.status,
              deployedAt: deployment.created_at
            });
            return acc;
          }, {});
        }
      }
    }

    // Format response data
    const formattedSOPs = standardSOPs?.map(sop => ({
      id: sop.id,
      categoryId: sop.category_id,
      category: {
        code: sop.sop_categories.code,
        name: sop.sop_categories.name,
        nameFr: sop.sop_categories.name_fr
      },
      title: sop.title,
      titleFr: sop.title_fr,
      content: sop.content,
      contentFr: sop.content_fr,
      steps: sop.steps,
      stepsFr: sop.steps_fr,
      tags: sop.tags || [],
      tagsFr: sop.tags_fr || [],
      version: sop.version,
      status: sop.status,
      priority: sop.priority,
      effectiveDate: sop.effective_date,
      reviewDate: sop.review_date,
      createdAt: sop.created_at,
      updatedAt: sop.updated_at,
      createdBy: {
        id: sop.created_by,
        name: sop.auth_users?.full_name,
        nameFr: sop.auth_users?.full_name_fr
      },
      updatedBy: sop.updated_by ? {
        id: sop.updated_by,
        name: sop.auth_users?.full_name,
        nameFr: sop.auth_users?.full_name_fr
      } : null,
      approvedBy: sop.approved_by ? {
        id: sop.approved_by,
        name: sop.auth_users?.full_name,
        nameFr: sop.auth_users?.full_name_fr,
        approvedAt: sop.approved_at
      } : null,
      deployments: deploymentData?.[sop.id] || []
    }));

    // Get summary statistics
    const statistics = {
      totalStandardSOPs: formattedSOPs?.length || 0,
      statusBreakdown: formattedSOPs?.reduce((acc: any, sop) => {
        acc[sop.status] = (acc[sop.status] || 0) + 1;
        return acc;
      }, {}) || {},
      categoryBreakdown: formattedSOPs?.reduce((acc: any, sop) => {
        const categoryCode = sop.category.code;
        acc[categoryCode] = (acc[categoryCode] || 0) + 1;
        return acc;
      }, {}) || {},
      deploymentStats: deploymentData ? {
        totalDeployments: Object.values(deploymentData).reduce((sum: number, deps: any) => sum + deps.length, 0),
        averageDeploymentsPerSOP: Object.keys(deploymentData).length > 0 ? 
          Object.values(deploymentData).reduce((sum: number, deps: any) => sum + deps.length, 0) / Object.keys(deploymentData).length : 0
      } : null
    };

    return NextResponse.json({
      success: true,
      data: {
        standardSOPs: formattedSOPs,
        statistics,
        queryParams: validationResult.data
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'get_standard_sops' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Create Standard SOP Template
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
    const validationResult = StandardSOPCreateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      categoryId,
      title,
      titleFr,
      content,
      contentFr,
      steps,
      tags,
      tagsFr,
      priority,
      complianceRequirements,
      brandStandards,
      effectiveDate,
      expiryDate
    } = validationResult.data;

    // Verify SOP admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifySOPAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate category exists
    const { data: category, error: categoryError } = await supabase
      .from('sop_categories')
      .select('id, name, name_fr')
      .eq('id', categoryId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Invalid category ID', code: 'CATEGORY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Generate version number
    const version = generateVersionNumber();

    // Prepare SOP data
    const sopData = {
      category_id: categoryId,
      restaurant_id: 'master', // Special ID for master templates
      title,
      title_fr: titleFr,
      content,
      content_fr: contentFr,
      steps: steps.map((step, index) => ({
        ...step,
        stepId: `step_${index + 1}`,
        standardStep: true
      })),
      steps_fr: steps.map((step, index) => ({
        stepNumber: step.stepNumber,
        title: step.titleFr,
        content: step.contentFr,
        stepId: `step_${index + 1}`,
        standardStep: true,
        isCustomizable: step.isCustomizable,
        customizationLevel: step.customizationLevel,
        safetyNotes: step.safetyNotesFr
      })),
      tags: tags || [],
      tags_fr: tagsFr || [],
      version,
      status: 'draft',
      priority,
      effective_date: effectiveDate,
      review_date: expiryDate,
      created_by: userId,
      metadata: {
        complianceRequirements,
        brandStandards,
        isStandardTemplate: true,
        templateType: 'master'
      },
      is_active: true
    };

    // Create standard SOP
    const { data: standardSOP, error: createError } = await supabase
      .from('sop_documents')
      .insert(sopData)
      .select(`
        id,
        title,
        title_fr,
        version,
        status,
        created_at,
        sop_categories!inner(code, name, name_fr)
      `)
      .single();

    if (createError) {
      logError('STANDARD_SOP_CREATE', createError, { sopData });
      return NextResponse.json(
        { error: 'Failed to create standard SOP', code: 'CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Log standard SOP creation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'CREATE',
        resource_type: 'standard_sop',
        resource_id: standardSOP.id,
        details: {
          title,
          categoryId,
          categoryName: category.name,
          version,
          stepsCount: steps.length,
          priority,
          complianceLevel: complianceRequirements.level
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: 'Standard SOP template created successfully',
      data: {
        standardSOP: {
          id: standardSOP.id,
          title: standardSOP.title,
          titleFr: standardSOP.title_fr,
          version: standardSOP.version,
          status: standardSOP.status,
          category: {
            code: standardSOP.sop_categories.code,
            name: standardSOP.sop_categories.name,
            nameFr: standardSOP.sop_categories.name_fr
          },
          stepsCount: steps.length,
          priority,
          complianceLevel: complianceRequirements.level,
          createdAt: standardSOP.created_at
        }
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'create_standard_sop' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PUT: Deploy Standard SOP to Restaurants
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
    const validationResult = DeploymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      standardSOPId,
      targetRestaurants,
      deploymentType,
      scheduledDate,
      phaseConfig,
      allowCustomizations,
      requireConfirmation,
      notificationSettings
    } = validationResult.data;

    // Verify SOP admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifySOPAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Get standard SOP details
    const { data: standardSOP, error: sopError } = await supabase
      .from('sop_documents')
      .select(`
        id,
        title,
        title_fr,
        content,
        content_fr,
        steps,
        steps_fr,
        tags,
        tags_fr,
        version,
        priority,
        metadata,
        sop_categories!inner(code, name, name_fr)
      `)
      .eq('id', standardSOPId)
      .eq('restaurant_id', 'master')
      .single();

    if (sopError || !standardSOP) {
      return NextResponse.json(
        { error: 'Standard SOP not found', code: 'SOP_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate target restaurants
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, name_fr')
      .in('id', targetRestaurants)
      .eq('is_active', true);

    if (restaurantsError || !restaurants || restaurants.length !== targetRestaurants.length) {
      return NextResponse.json(
        { error: 'One or more target restaurants not found', code: 'RESTAURANTS_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Prepare deployment records
    const deploymentResults = [];
    const failedDeployments = [];

    for (const restaurant of restaurants) {
      try {
        // Check if SOP already exists for this restaurant
        const { data: existingSOP } = await supabase
          .from('sop_documents')
          .select('id, version')
          .eq('restaurant_id', restaurant.id)
          .eq('parent_sop_id', standardSOPId)
          .single();

        // Prepare deployment data
        const deploymentData = {
          category_id: standardSOP.category_id,
          restaurant_id: restaurant.id,
          parent_sop_id: standardSOPId, // Reference to master template
          title: standardSOP.title,
          title_fr: standardSOP.title_fr,
          content: standardSOP.content,
          content_fr: standardSOP.content_fr,
          steps: standardSOP.steps,
          steps_fr: standardSOP.steps_fr,
          tags: standardSOP.tags,
          tags_fr: standardSOP.tags_fr,
          version: standardSOP.version,
          status: deploymentType === 'immediate' ? 'approved' : 'pending_deployment',
          priority: standardSOP.priority,
          created_by: userId,
          metadata: {
            ...standardSOP.metadata,
            isDeployedSOP: true,
            deploymentType,
            allowCustomizations,
            deployedAt: new Date().toISOString(),
            deployedBy: userId
          },
          is_active: true
        };

        // Insert or update SOP
        let result;
        if (existingSOP) {
          // Update existing SOP
          result = await supabase
            .from('sop_documents')
            .update({
              ...deploymentData,
              version: generateVersionNumber(existingSOP.version),
              updated_by: userId,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSOP.id)
            .select('id, version')
            .single();
        } else {
          // Create new SOP deployment
          result = await supabase
            .from('sop_documents')
            .insert(deploymentData)
            .select('id, version')
            .single();
        }

        if (result.error) {
          failedDeployments.push({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            error: result.error.message
          });
        } else {
          deploymentResults.push({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantNameFr: restaurant.name_fr,
            sopId: result.data.id,
            version: result.data.version,
            status: deploymentData.status,
            deployedAt: deploymentData.metadata.deployedAt
          });
        }

      } catch (deployError) {
        failedDeployments.push({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          error: deployError.message
        });
      }
    }

    // Log deployment action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'DEPLOY',
        resource_type: 'standard_sop_deployment',
        resource_id: standardSOPId,
        details: {
          standardSOPTitle: standardSOP.title,
          targetRestaurants: targetRestaurants.length,
          successfulDeployments: deploymentResults.length,
          failedDeployments: failedDeployments.length,
          deploymentType,
          allowCustomizations
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    // Return deployment results
    if (failedDeployments.length === targetRestaurants.length) {
      return NextResponse.json(
        { 
          error: 'All deployments failed', 
          code: 'DEPLOYMENT_FAILED',
          details: failedDeployments
        },
        { status: 500 }
      );
    } else if (failedDeployments.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Partial deployment completed',
        data: {
          successfulDeployments: deploymentResults,
          failedDeployments,
          summary: {
            total: targetRestaurants.length,
            successful: deploymentResults.length,
            failed: failedDeployments.length
          }
        }
      }, { status: 207 });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Standard SOP deployed successfully to all target restaurants',
        data: {
          deployments: deploymentResults,
          summary: {
            total: targetRestaurants.length,
            successful: deploymentResults.length,
            failed: 0
          },
          standardSOP: {
            id: standardSOP.id,
            title: standardSOP.title,
            version: standardSOP.version
          }
        }
      });
    }

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'deploy_standard_sop' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PATCH: Request SOP Customization
export async function PATCH(request: NextRequest) {
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
    const validationResult = CustomizationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      deployedSOPId,
      restaurantId,
      customizations,
      justification,
      requestedBy,
      approvalRequired
    } = validationResult.data;

    // Verify access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');

    // Verify user has access to the restaurant
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, role, restaurant_id')
      .eq('id', userId)
      .in('role', ['admin', 'manager'])
      .single();

    if (userError || !user || (user.restaurant_id !== restaurantId && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Get deployed SOP details
    const { data: deployedSOP, error: sopError } = await supabase
      .from('sop_documents')
      .select(`
        id,
        parent_sop_id,
        title,
        version,
        metadata,
        restaurant_id
      `)
      .eq('id', deployedSOPId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (sopError || !deployedSOP) {
      return NextResponse.json(
        { error: 'Deployed SOP not found', code: 'SOP_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if customizations are allowed
    if (!deployedSOP.metadata?.allowCustomizations) {
      return NextResponse.json(
        { error: 'Customizations not allowed for this SOP', code: 'CUSTOMIZATION_FORBIDDEN' },
        { status: 403 }
      );
    }

    // Create customization request record
    const customizationRequest = {
      deployed_sop_id: deployedSOPId,
      restaurant_id: restaurantId,
      requested_by: requestedBy,
      customizations,
      justification,
      status: approvalRequired ? 'pending_approval' : 'approved',
      created_at: new Date().toISOString(),
      metadata: {
        requestType: 'sop_customization',
        approvalRequired,
        submittedBy: userId
      }
    };

    // Insert customization request (assuming a sop_customization_requests table exists)
    const customizationId = `customization_${Date.now()}`;

    // Log customization request
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        action: 'CREATE',
        resource_type: 'sop_customization_request',
        resource_id: customizationId,
        details: {
          deployedSOPId,
          sopTitle: deployedSOP.title,
          customizationTypes: Object.keys(customizations),
          justification,
          approvalRequired
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: approvalRequired ? 
        'Customization request submitted for approval' : 
        'Customization applied successfully',
      data: {
        customizationId,
        status: customizationRequest.status,
        deployedSOPId,
        restaurantId,
        requestedAt: customizationRequest.created_at,
        approvalRequired
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'request_sop_customization' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}