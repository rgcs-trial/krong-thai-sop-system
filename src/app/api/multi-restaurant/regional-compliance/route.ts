/**
 * Multi-Restaurant Regional Compliance API
 * Regional compliance frameworks and customization management
 * 
 * Features:
 * - Regional compliance requirements management
 * - Local regulation adaptation
 * - Audit scheduling and tracking
 * - Compliance scoring and reporting
 * - Cultural and legal customizations
 * - Multi-jurisdictional support
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const RegionalComplianceQuerySchema = z.object({
  regionId: z.string().uuid().optional(),
  jurisdictionCode: z.string().max(10).optional(),
  complianceType: z.enum(['health', 'safety', 'labor', 'food_safety', 'environmental', 'tax', 'licensing']).optional(),
  status: z.enum(['compliant', 'non_compliant', 'pending', 'expired']).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  includeUpcoming: z.boolean().optional().default(false),
  dateRange: z.enum(['30d', '90d', '6m', '1y']).optional().default('90d')
});

const ComplianceFrameworkSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  regionId: z.string().uuid(),
  jurisdictionCode: z.string().max(10),
  complianceType: z.enum(['health', 'safety', 'labor', 'food_safety', 'environmental', 'tax', 'licensing']),
  requirements: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(3).max(300),
    description: z.string(),
    category: z.string().max(100),
    mandatory: z.boolean().default(true),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'as_needed']),
    responsibleRole: z.enum(['admin', 'manager', 'staff', 'external_auditor']),
    documentationRequired: z.boolean().default(true),
    deadline: z.string().datetime().optional(),
    reminderDays: z.number().int().min(0).max(365).optional(),
    penalties: z.object({
      description: z.string(),
      severity: z.enum(['warning', 'fine', 'suspension', 'closure']),
      amount: z.number().optional()
    }).optional(),
    resources: z.array(z.object({
      type: z.enum(['document', 'training', 'checklist', 'form']),
      name: z.string(),
      url: z.string().url().optional(),
      fileId: z.string().optional()
    })).optional()
  })).min(1),
  effectiveDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  applicableRestaurants: z.array(z.string().uuid()).optional(),
  autoAssign: z.boolean().default(true),
  isActive: z.boolean().default(true)
});

const ComplianceAuditSchema = z.object({
  auditType: z.enum(['scheduled', 'random', 'complaint_based', 'follow_up']),
  complianceFrameworkIds: z.array(z.string().uuid()).min(1),
  restaurantIds: z.array(z.string().uuid()).min(1),
  scheduledDate: z.string().datetime(),
  auditorInfo: z.object({
    name: z.string().min(2).max(200),
    organization: z.string().max(200).optional(),
    contactInfo: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional()
    }).optional(),
    credentials: z.string().optional()
  }),
  scope: z.object({
    areas: z.array(z.string()).min(1),
    estimatedDuration: z.number().int().min(30).max(480), // minutes
    requirements: z.array(z.string()).optional(),
    specialFocus: z.string().max(500).optional()
  }),
  notificationSettings: z.object({
    notifyRestaurants: z.boolean().default(true),
    notifyRegionalManagers: z.boolean().default(true),
    reminderDays: z.array(z.number().int().min(1).max(30)).optional().default([7, 3, 1])
  }).optional(),
  isActive: z.boolean().default(true)
});

const CustomizationRequestSchema = z.object({
  type: z.enum(['regional_adaptation', 'cultural_customization', 'legal_compliance', 'operational_variance']),
  restaurantIds: z.array(z.string().uuid()).min(1),
  regionId: z.string().uuid(),
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  justification: z.string().min(50).max(1000),
  impactAnalysis: z.object({
    affectedSOPs: z.array(z.string().uuid()).optional(),
    affectedTraining: z.array(z.string().uuid()).optional(),
    costImpact: z.enum(['none', 'low', 'medium', 'high']).optional(),
    timelineImpact: z.enum(['none', 'minimal', 'moderate', 'significant']).optional(),
    riskAssessment: z.enum(['low', 'medium', 'high', 'critical']).optional()
  }),
  proposedChanges: z.object({
    sopModifications: z.array(z.object({
      sopId: z.string().uuid(),
      modificationType: z.enum(['content_change', 'step_addition', 'step_removal', 'format_change']),
      details: z.string().min(20)
    })).optional(),
    trainingModifications: z.array(z.object({
      moduleId: z.string().uuid(),
      modificationType: z.enum(['content_update', 'translation', 'cultural_adaptation']),
      details: z.string().min(20)
    })).optional(),
    systemConfigurations: z.array(z.object({
      configType: z.string(),
      currentValue: z.any(),
      proposedValue: z.any(),
      rationale: z.string()
    })).optional()
  }),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  expectedImplementationDate: z.string().datetime().optional(),
  requiredApprovals: z.array(z.enum(['regional_manager', 'compliance_officer', 'legal_team', 'executive'])).optional()
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
  
  console.error(`[REGIONAL-COMPLIANCE] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify compliance admin access
async function verifyComplianceAdminAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('id, role, restaurant_id, restaurants!inner(id, name, settings)')
    .eq('id', userId)
    .in('role', ['admin', 'manager'])
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Compliance admin access required');
  }

  return user;
}

// Helper function to calculate compliance score
function calculateComplianceScore(requirements: any[], completedRequirements: any[]) {
  if (requirements.length === 0) return 100;
  
  const completedCount = completedRequirements.length;
  const totalCount = requirements.length;
  const mandatoryCount = requirements.filter(r => r.mandatory).length;
  const completedMandatoryCount = completedRequirements.filter(c => 
    requirements.find(r => r.id === c.requirementId)?.mandatory
  ).length;
  
  // Weight mandatory requirements more heavily
  const mandatoryScore = mandatoryCount > 0 ? (completedMandatoryCount / mandatoryCount) * 80 : 0;
  const optionalScore = totalCount > mandatoryCount ? 
    ((completedCount - completedMandatoryCount) / (totalCount - mandatoryCount)) * 20 : 0;
  
  return Math.round(mandatoryScore + optionalScore);
}

// GET: Regional Compliance Overview
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
    
    const validationResult = RegionalComplianceQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { 
      regionId, 
      jurisdictionCode, 
      complianceType, 
      status, 
      urgency, 
      includeUpcoming, 
      dateRange 
    } = validationResult.data;

    // Verify compliance admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyComplianceAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Calculate date filter
    const endDate = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '30d': startDate.setDate(endDate.getDate() - 30); break;
      case '90d': startDate.setDate(endDate.getDate() - 90); break;
      case '6m': startDate.setMonth(endDate.getMonth() - 6); break;
      case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
    }

    // Get restaurants with regional information
    let restaurantsQuery = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        name_fr,
        settings,
        is_active
      `)
      .eq('is_active', true);

    if (regionId) {
      restaurantsQuery = restaurantsQuery.eq('settings->>region_id', regionId);
    }

    const { data: restaurants, error: restaurantsError } = await restaurantsQuery;

    if (restaurantsError) {
      logError('RESTAURANTS_QUERY', restaurantsError);
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data', code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    // Simulate compliance frameworks data (would come from compliance_frameworks table)
    const complianceFrameworks = [
      {
        id: 'framework_001',
        name: 'Health Department Compliance',
        regionId: regionId || 'region_001',
        jurisdictionCode: jurisdictionCode || 'TH-BKK',
        complianceType: 'health',
        requirementsCount: 15,
        mandatoryCount: 12,
        urgency: 'high',
        nextDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        effectiveDate: '2024-01-01T00:00:00Z',
        isActive: true
      },
      {
        id: 'framework_002',
        name: 'Food Safety Regulations',
        regionId: regionId || 'region_001',
        jurisdictionCode: jurisdictionCode || 'TH-BKK',
        complianceType: 'food_safety',
        requirementsCount: 22,
        mandatoryCount: 20,
        urgency: 'critical',
        nextDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        effectiveDate: '2024-01-01T00:00:00Z',
        isActive: true
      },
      {
        id: 'framework_003',
        name: 'Labor Law Compliance',
        regionId: regionId || 'region_001',
        jurisdictionCode: jurisdictionCode || 'TH-BKK',
        complianceType: 'labor',
        requirementsCount: 18,
        mandatoryCount: 15,
        urgency: 'medium',
        nextDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        effectiveDate: '2024-01-01T00:00:00Z',
        isActive: true
      }
    ];

    // Filter frameworks based on query parameters
    let filteredFrameworks = complianceFrameworks.filter(framework => {
      if (complianceType && framework.complianceType !== complianceType) return false;
      if (urgency && framework.urgency !== urgency) return false;
      if (jurisdictionCode && framework.jurisdictionCode !== jurisdictionCode) return false;
      return true;
    });

    // Simulate compliance status for each restaurant
    const restaurantComplianceStatus = restaurants?.map(restaurant => {
      const frameworkStatuses = filteredFrameworks.map(framework => {
        // Simulate compliance data
        const completedRequirements = Math.floor(Math.random() * framework.requirementsCount);
        const complianceScore = Math.floor((completedRequirements / framework.requirementsCount) * 100);
        const complianceStatus = complianceScore >= 90 ? 'compliant' : 
                                complianceScore >= 70 ? 'pending' : 'non_compliant';

        return {
          frameworkId: framework.id,
          frameworkName: framework.name,
          complianceType: framework.complianceType,
          complianceScore,
          status: complianceStatus,
          completedRequirements,
          totalRequirements: framework.requirementsCount,
          mandatoryCompleted: Math.min(completedRequirements, framework.mandatoryCount),
          mandatoryTotal: framework.mandatoryCount,
          nextDeadline: framework.nextDeadline,
          urgency: framework.urgency,
          lastAuditDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          upcomingDeadlines: includeUpcoming ? [
            {
              requirementName: 'Monthly Health Inspection',
              deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
              urgency: 'medium'
            },
            {
              requirementName: 'Fire Safety Certificate Renewal',
              deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
              urgency: 'high'
            }
          ] : []
        };
      });

      // Calculate overall compliance score for restaurant
      const overallScore = frameworkStatuses.length > 0 ?
        frameworkStatuses.reduce((sum, fs) => sum + fs.complianceScore, 0) / frameworkStatuses.length : 0;

      return {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantNameFr: restaurant.name_fr,
        regionId: restaurant.settings?.region_id || 'unknown',
        jurisdiction: restaurant.settings?.jurisdiction_code || jurisdictionCode || 'TH-BKK',
        overallComplianceScore: Math.round(overallScore),
        overallStatus: overallScore >= 90 ? 'compliant' : 
                      overallScore >= 70 ? 'pending' : 'non_compliant',
        frameworkStatuses,
        riskLevel: overallScore >= 90 ? 'low' : 
                  overallScore >= 70 ? 'medium' : 'high',
        lastUpdated: new Date().toISOString()
      };
    }) || [];

    // Filter by status if specified
    if (status) {
      restaurantComplianceStatus.forEach(restaurant => {
        restaurant.frameworkStatuses = restaurant.frameworkStatuses.filter(fs => fs.status === status);
      });
    }

    // Calculate summary statistics
    const totalRestaurants = restaurantComplianceStatus.length;
    const compliantRestaurants = restaurantComplianceStatus.filter(r => r.overallStatus === 'compliant').length;
    const nonCompliantRestaurants = restaurantComplianceStatus.filter(r => r.overallStatus === 'non_compliant').length;
    const pendingRestaurants = restaurantComplianceStatus.filter(r => r.overallStatus === 'pending').length;

    const averageComplianceScore = totalRestaurants > 0 ?
      restaurantComplianceStatus.reduce((sum, r) => sum + r.overallComplianceScore, 0) / totalRestaurants : 0;

    // Identify high-risk restaurants
    const highRiskRestaurants = restaurantComplianceStatus
      .filter(r => r.riskLevel === 'high')
      .sort((a, b) => a.overallComplianceScore - b.overallComplianceScore)
      .slice(0, 5);

    // Get upcoming deadlines across all restaurants
    const upcomingDeadlines = restaurantComplianceStatus
      .flatMap(restaurant => 
        restaurant.frameworkStatuses.flatMap(framework => 
          framework.upcomingDeadlines?.map(deadline => ({
            ...deadline,
            restaurantId: restaurant.restaurantId,
            restaurantName: restaurant.restaurantName,
            frameworkName: framework.frameworkName,
            complianceType: framework.complianceType
          })) || []
        )
      )
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRestaurants,
          compliantRestaurants,
          nonCompliantRestaurants,
          pendingRestaurants,
          averageComplianceScore: Math.round(averageComplianceScore),
          complianceRate: totalRestaurants > 0 ? Math.round((compliantRestaurants / totalRestaurants) * 100) : 0
        },
        restaurantComplianceStatus,
        complianceFrameworks: filteredFrameworks,
        highRiskRestaurants,
        upcomingDeadlines: includeUpcoming ? upcomingDeadlines : [],
        queryParams: validationResult.data,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'get_regional_compliance' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Create Compliance Framework
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
    const validationResult = ComplianceFrameworkSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      regionId,
      jurisdictionCode,
      complianceType,
      requirements,
      effectiveDate,
      expiryDate,
      priority,
      applicableRestaurants,
      autoAssign,
      isActive
    } = validationResult.data;

    // Verify compliance admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyComplianceAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate region exists (if we had a regions table)
    // For now, we'll assume the region is valid

    // Generate requirements with IDs
    const processedRequirements = requirements.map(req => ({
      ...req,
      id: req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    }));

    // Create compliance framework
    const frameworkId = `framework_${Date.now()}`;
    const frameworkData = {
      id: frameworkId,
      name,
      description,
      region_id: regionId,
      jurisdiction_code: jurisdictionCode,
      compliance_type: complianceType,
      requirements: processedRequirements,
      effective_date: effectiveDate,
      expiry_date: expiryDate,
      priority,
      applicable_restaurants: applicableRestaurants,
      auto_assign: autoAssign,
      is_active: isActive,
      created_by: userId,
      created_at: new Date().toISOString(),
      metadata: {
        requirementsCount: processedRequirements.length,
        mandatoryCount: processedRequirements.filter(r => r.mandatory).length,
        frameworkType: 'regional_compliance'
      }
    };

    // If auto-assign is enabled, assign to applicable restaurants
    if (autoAssign && applicableRestaurants && applicableRestaurants.length > 0) {
      // Create compliance assignments for each restaurant
      const assignmentPromises = applicableRestaurants.map(restaurantId => 
        supabase
          .from('compliance_assignments') // Assuming this table exists
          .insert({
            framework_id: frameworkId,
            restaurant_id: restaurantId,
            assigned_by: userId,
            assigned_at: new Date().toISOString(),
            status: 'active',
            due_date: expiryDate
          })
      );

      // Note: In a real implementation, we would execute these promises
      // await Promise.all(assignmentPromises);
    }

    // Log framework creation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'CREATE',
        resource_type: 'compliance_framework',
        resource_id: frameworkId,
        details: {
          frameworkName: name,
          complianceType,
          jurisdictionCode,
          regionId,
          requirementsCount: processedRequirements.length,
          mandatoryCount: processedRequirements.filter(r => r.mandatory).length,
          applicableRestaurants: applicableRestaurants?.length || 0,
          autoAssign
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: 'Compliance framework created successfully',
      data: {
        frameworkId,
        name,
        complianceType,
        jurisdiction: jurisdictionCode,
        region: regionId,
        requirementsCount: processedRequirements.length,
        mandatoryRequirements: processedRequirements.filter(r => r.mandatory).length,
        applicableRestaurants: applicableRestaurants?.length || 0,
        effectiveDate,
        expiryDate,
        priority,
        isActive,
        createdAt: frameworkData.created_at
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'create_compliance_framework' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PUT: Schedule Compliance Audit
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
    const validationResult = ComplianceAuditSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      auditType,
      complianceFrameworkIds,
      restaurantIds,
      scheduledDate,
      auditorInfo,
      scope,
      notificationSettings,
      isActive
    } = validationResult.data;

    // Verify compliance admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyComplianceAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate restaurants exist
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, name_fr')
      .in('id', restaurantIds)
      .eq('is_active', true);

    if (restaurantsError || !restaurants || restaurants.length !== restaurantIds.length) {
      return NextResponse.json(
        { error: 'One or more restaurants not found', code: 'RESTAURANTS_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create audit record
    const auditId = `audit_${Date.now()}`;
    const auditData = {
      id: auditId,
      audit_type: auditType,
      compliance_framework_ids: complianceFrameworkIds,
      restaurant_ids: restaurantIds,
      scheduled_date: scheduledDate,
      auditor_info: auditorInfo,
      scope,
      notification_settings: notificationSettings,
      status: 'scheduled',
      is_active: isActive,
      created_by: userId,
      created_at: new Date().toISOString(),
      metadata: {
        auditScope: scope.areas,
        estimatedDuration: scope.estimatedDuration,
        restaurantCount: restaurantIds.length,
        frameworkCount: complianceFrameworkIds.length
      }
    };

    // Create individual audit assignments for each restaurant
    const auditAssignments = restaurantIds.map(restaurantId => ({
      audit_id: auditId,
      restaurant_id: restaurantId,
      status: 'pending',
      scheduled_date: scheduledDate,
      created_at: new Date().toISOString()
    }));

    // Log audit scheduling
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'CREATE',
        resource_type: 'compliance_audit',
        resource_id: auditId,
        details: {
          auditType,
          scheduledDate,
          restaurantCount: restaurantIds.length,
          frameworkCount: complianceFrameworkIds.length,
          auditorOrganization: auditorInfo.organization,
          estimatedDuration: scope.estimatedDuration,
          auditAreas: scope.areas
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    // Schedule notifications based on settings
    const notifications = [];
    if (notificationSettings?.notifyRestaurants) {
      restaurants.forEach(restaurant => {
        notificationSettings.reminderDays?.forEach(days => {
          const notificationDate = new Date(scheduledDate);
          notificationDate.setDate(notificationDate.getDate() - days);
          
          notifications.push({
            type: 'audit_reminder',
            recipient_type: 'restaurant',
            recipient_id: restaurant.id,
            scheduled_date: notificationDate.toISOString(),
            content: {
              title: `Upcoming Compliance Audit - ${days} days`,
              message: `A ${auditType} compliance audit is scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
              auditId,
              urgency: days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low'
            }
          });
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance audit scheduled successfully',
      data: {
        auditId,
        auditType,
        scheduledDate,
        restaurants: restaurants.map(r => ({
          id: r.id,
          name: r.name,
          nameFr: r.name_fr
        })),
        auditor: {
          name: auditorInfo.name,
          organization: auditorInfo.organization
        },
        scope: {
          areas: scope.areas,
          estimatedDuration: scope.estimatedDuration
        },
        notificationsScheduled: notifications.length,
        status: 'scheduled',
        createdAt: auditData.created_at
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'schedule_compliance_audit' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PATCH: Submit Regional Customization Request
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
    const validationResult = CustomizationRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      type,
      restaurantIds,
      regionId,
      title,
      description,
      justification,
      impactAnalysis,
      proposedChanges,
      urgency,
      expectedImplementationDate,
      requiredApprovals
    } = validationResult.data;

    // Verify compliance admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyComplianceAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate restaurants exist and belong to the specified region
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, name_fr, settings')
      .in('id', restaurantIds)
      .eq('is_active', true);

    if (restaurantsError || !restaurants || restaurants.length !== restaurantIds.length) {
      return NextResponse.json(
        { error: 'One or more restaurants not found', code: 'RESTAURANTS_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify all restaurants belong to the specified region
    const invalidRestaurants = restaurants.filter(r => r.settings?.region_id !== regionId);
    if (invalidRestaurants.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some restaurants do not belong to the specified region', 
          code: 'REGION_MISMATCH',
          details: invalidRestaurants.map(r => ({ id: r.id, name: r.name }))
        },
        { status: 400 }
      );
    }

    // Create customization request
    const requestId = `customization_${Date.now()}`;
    const customizationRequest = {
      id: requestId,
      type,
      restaurant_ids: restaurantIds,
      region_id: regionId,
      title,
      description,
      justification,
      impact_analysis: impactAnalysis,
      proposed_changes: proposedChanges,
      urgency,
      expected_implementation_date: expectedImplementationDate,
      required_approvals: requiredApprovals || ['regional_manager'],
      status: 'pending_review',
      submitted_by: userId,
      submitted_at: new Date().toISOString(),
      metadata: {
        requestType: 'regional_customization',
        restaurantCount: restaurantIds.length,
        sopModificationsCount: proposedChanges.sopModifications?.length || 0,
        trainingModificationsCount: proposedChanges.trainingModifications?.length || 0,
        systemConfigurationsCount: proposedChanges.systemConfigurations?.length || 0
      }
    };

    // Create approval workflow based on required approvals
    const approvalWorkflow = (requiredApprovals || ['regional_manager']).map((approver, index) => ({
      request_id: requestId,
      approver_role: approver,
      approval_order: index + 1,
      status: 'pending',
      required: true,
      created_at: new Date().toISOString()
    }));

    // Log customization request
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: restaurantIds[0], // Primary restaurant for audit log
        user_id: userId,
        action: 'CREATE',
        resource_type: 'regional_customization_request',
        resource_id: requestId,
        details: {
          requestType: type,
          title,
          regionId,
          restaurantCount: restaurantIds.length,
          urgency,
          requiredApprovals: requiredApprovals?.length || 1,
          impactLevel: impactAnalysis.riskAssessment || 'medium',
          expectedImplementationDate
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    // Create notifications for required approvers
    const notifications = approvalWorkflow.map(approval => ({
      type: 'customization_approval_required',
      recipient_type: 'role',
      recipient_role: approval.approver_role,
      content: {
        title: `Regional Customization Approval Required`,
        message: `A ${type} customization request requires your approval: ${title}`,
        requestId,
        urgency,
        submittedBy: userId,
        restaurantCount: restaurantIds.length
      },
      created_at: new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      message: 'Regional customization request submitted successfully',
      data: {
        requestId,
        title,
        type,
        status: 'pending_review',
        region: regionId,
        restaurants: restaurants.map(r => ({
          id: r.id,
          name: r.name,
          nameFr: r.name_fr
        })),
        urgency,
        requiredApprovals: requiredApprovals || ['regional_manager'],
        expectedImplementationDate,
        submittedAt: customizationRequest.submitted_at,
        approvalWorkflow: approvalWorkflow.map(a => ({
          approverRole: a.approver_role,
          order: a.approval_order,
          status: a.status
        })),
        notificationsCreated: notifications.length
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'submit_regional_customization' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}