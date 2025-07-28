/**
 * Multi-Restaurant Franchise Management API
 * Franchise management and licensing system
 * 
 * Features:
 * - Franchise license management
 * - Revenue tracking and royalty calculation
 * - Brand compliance monitoring
 * - Franchisee support and communication
 * - Territory management
 * - Performance evaluation and reporting
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const FranchiseQuerySchema = z.object({
  franchiseStatus: z.enum(['active', 'pending', 'suspended', 'terminated']).optional(),
  regionId: z.string().uuid().optional(),
  territoryId: z.string().uuid().optional(),
  performanceRating: z.enum(['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor']).optional(),
  complianceLevel: z.enum(['full', 'partial', 'non_compliant']).optional(),
  revenueRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional()
  }).optional(),
  dateRange: z.enum(['30d', '90d', '6m', '1y']).optional().default('90d'),
  includeFinancials: z.boolean().optional().default(false),
  includeCompliance: z.boolean().optional().default(false)
});

const FranchiseCreateSchema = z.object({
  franchiseeName: z.string().min(2).max(200),
  franchiseeEmail: z.string().email(),
  franchiseePhone: z.string().min(10).max(20).optional(),
  businessName: z.string().min(3).max(200),
  businessAddress: z.object({
    street: z.string().min(5).max(300),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    postalCode: z.string().min(3).max(20),
    country: z.string().min(2).max(100)
  }),
  territoryId: z.string().uuid(),
  regionId: z.string().uuid(),
  franchiseType: z.enum(['single_unit', 'multi_unit', 'area_development', 'master_franchise']),
  investmentAmount: z.number().min(1000).max(10000000),
  franchiseFee: z.number().min(100).max(1000000),
  royaltyRate: z.number().min(0).max(50), // percentage
  marketingFeeRate: z.number().min(0).max(10), // percentage
  licenseTerms: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    renewalOptions: z.number().int().min(0).max(10),
    renewalTermYears: z.number().int().min(1).max(20),
    exclusivityRadius: z.number().min(0).max(50) // kilometers
  }),
  brandStandards: z.object({
    menuCompliance: z.boolean().default(true),
    interiorDesign: z.boolean().default(true),
    uniformsAndBranding: z.boolean().default(true),
    serviceStandards: z.boolean().default(true),
    qualityStandards: z.boolean().default(true),
    technologySystems: z.boolean().default(true)
  }),
  supportPackage: z.object({
    initialTraining: z.boolean().default(true),
    ongoingTraining: z.boolean().default(true),
    marketingSupport: z.boolean().default(true),
    operationalSupport: z.boolean().default(true),
    technologySupport: z.boolean().default(true),
    supplierNetworkAccess: z.boolean().default(true)
  }),
  performanceTargets: z.object({
    monthlyRevenueTarget: z.number().min(0).optional(),
    customerSatisfactionTarget: z.number().min(0).max(100).optional(),
    complianceScoreTarget: z.number().min(0).max(100).optional(),
    profitMarginTarget: z.number().min(0).max(100).optional()
  }).optional(),
  approvalRequired: z.boolean().default(true)
});

const RoyaltyCalculationSchema = z.object({
  franchiseId: z.string().uuid(),
  reportingPeriod: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }),
  revenueData: z.object({
    grossRevenue: z.number().min(0),
    netRevenue: z.number().min(0),
    exemptRevenue: z.number().min(0).optional(),
    adjustments: z.array(z.object({
      type: z.enum(['discount', 'refund', 'promotion', 'other']),
      amount: z.number(),
      description: z.string().max(200)
    })).optional()
  }),
  expenseData: z.object({
    operatingExpenses: z.number().min(0).optional(),
    marketingExpenses: z.number().min(0).optional(),
    staffingCosts: z.number().min(0).optional(),
    utilitiesAndRent: z.number().min(0).optional(),
    supplyCosts: z.number().min(0).optional()
  }).optional(),
  supportingDocuments: z.array(z.string()).optional(),
  submittedBy: z.string().uuid(),
  certifiedAccurate: z.boolean().default(false)
});

const ComplianceAuditSchema = z.object({
  franchiseIds: z.array(z.string().uuid()).min(1),
  auditType: z.enum(['routine', 'compliance_check', 'performance_review', 'renewal_evaluation']),
  auditAreas: z.array(z.enum([
    'brand_standards',
    'food_quality',
    'service_standards', 
    'cleanliness',
    'staff_training',
    'financial_reporting',
    'marketing_compliance',
    'technology_usage'
  ])).min(1),
  scheduledDate: z.string().datetime(),
  auditorAssignment: z.object({
    primaryAuditor: z.string().uuid(),
    secondaryAuditor: z.string().uuid().optional(),
    externalAuditor: z.object({
      name: z.string(),
      organization: z.string(),
      credentials: z.string().optional()
    }).optional()
  }),
  auditCriteria: z.object({
    brandStandardsWeight: z.number().min(0).max(1).default(0.3),
    operationalWeight: z.number().min(0).max(1).default(0.25),
    customerServiceWeight: z.number().min(0).max(1).default(0.2),
    financialWeight: z.number().min(0).max(1).default(0.15),
    complianceWeight: z.number().min(0).max(1).default(0.1)
  }).optional(),
  expectedDuration: z.number().int().min(60).max(480), // minutes
  isActive: z.boolean().default(true)
});

const FranchiseeSupportSchema = z.object({
  franchiseId: z.string().uuid(),
  supportType: z.enum(['training', 'marketing', 'operational', 'technical', 'financial', 'legal']),
  supportCategory: z.enum(['urgent', 'routine', 'enhancement', 'consultation']),
  requestTitle: z.string().min(5).max(200),
  requestDescription: z.string().min(20).max(2000),
  priorityLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  expectedResolution: z.enum(['same_day', 'within_week', 'within_month', 'as_needed']).optional(),
  assignedTo: z.string().uuid().optional(),
  resourcesRequired: z.array(z.object({
    type: z.enum(['personnel', 'technology', 'materials', 'funding']),
    description: z.string().max(200),
    estimatedCost: z.number().min(0).optional()
  })).optional(),
  attachments: z.array(z.string()).optional(),
  followUpRequired: z.boolean().default(false)
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
  
  console.error(`[FRANCHISE-MANAGEMENT] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify franchise admin access
async function verifyFranchiseAdminAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('id, role, restaurant_id, restaurants!inner(id, name, settings)')
    .eq('id', userId)
    .eq('role', 'admin')
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Franchise admin access required');
  }

  return user;
}

// Helper function to calculate franchise performance score
function calculateFranchisePerformanceScore(metrics: any) {
  const weights = {
    revenue: 0.3,
    compliance: 0.25,
    customerSatisfaction: 0.2,
    brandStandards: 0.15,
    profitability: 0.1
  };

  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(weights).forEach(([metric, weight]) => {
    if (metrics[metric] !== undefined) {
      totalScore += (metrics[metric] * weight);
      totalWeight += weight;
    }
  });

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// Helper function to generate royalty calculation
function calculateRoyalties(revenueData: any, royaltyRate: number, marketingFeeRate: number) {
  const adjustedRevenue = revenueData.grossRevenue - (revenueData.exemptRevenue || 0);
  const adjustmentTotal = revenueData.adjustments?.reduce((sum: number, adj: any) => sum + Math.abs(adj.amount), 0) || 0;
  const netCalculationBase = Math.max(0, adjustedRevenue - adjustmentTotal);

  const royaltyAmount = netCalculationBase * (royaltyRate / 100);
  const marketingFee = netCalculationBase * (marketingFeeRate / 100);
  const totalDue = royaltyAmount + marketingFee;

  return {
    calculationBase: netCalculationBase,
    royaltyAmount,
    marketingFee,
    totalDue,
    royaltyRate,
    marketingFeeRate,
    calculatedAt: new Date().toISOString()
  };
}

// GET: Franchise Management Overview
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
    
    // Parse revenue range
    if (queryParams.revenueRange) {
      try {
        queryParams.revenueRange = JSON.parse(queryParams.revenueRange);
      } catch {
        delete queryParams.revenueRange;
      }
    }
    
    const validationResult = FranchiseQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { 
      franchiseStatus, 
      regionId, 
      territoryId, 
      performanceRating, 
      complianceLevel, 
      revenueRange,
      dateRange,
      includeFinancials,
      includeCompliance
    } = validationResult.data;

    // Verify franchise admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyFranchiseAdminAccess(supabase, userId);
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

    // Get restaurants that are franchises
    let restaurantsQuery = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        name_fr,
        address,
        settings,
        is_active,
        created_at
      `)
      .eq('is_active', true)
      .eq('settings->>is_franchise', 'true');

    if (regionId) {
      restaurantsQuery = restaurantsQuery.eq('settings->>region_id', regionId);
    }

    const { data: franchiseRestaurants, error: restaurantsError } = await restaurantsQuery;

    if (restaurantsError) {
      logError('FRANCHISE_RESTAURANTS_QUERY', restaurantsError);
      return NextResponse.json(
        { error: 'Failed to fetch franchise data', code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    // Simulate franchise data (in reality, this would come from a franchises table)
    const franchises = franchiseRestaurants?.map((restaurant, index) => {
      // Generate simulated franchise data
      const monthlyRevenue = Math.floor(Math.random() * 200000) + 50000;
      const royaltyRate = 6 + Math.random() * 2; // 6-8%
      const marketingFeeRate = 2 + Math.random(); // 2-3%
      const complianceScore = Math.floor(Math.random() * 30) + 70; // 70-100%
      const customerSatisfactionScore = Math.floor(Math.random() * 20) + 80; // 80-100%
      
      const performanceMetrics = {
        revenue: Math.min(100, (monthlyRevenue / 150000) * 100),
        compliance: complianceScore,
        customerSatisfaction: customerSatisfactionScore,
        brandStandards: Math.floor(Math.random() * 20) + 80,
        profitability: Math.floor(Math.random() * 25) + 65
      };

      const overallScore = calculateFranchisePerformanceScore(performanceMetrics);
      
      const franchise = {
        id: `franchise_${restaurant.id}`,
        restaurantId: restaurant.id,
        businessName: restaurant.name,
        businessNameFr: restaurant.name_fr,
        franchiseeName: `Franchisee ${index + 1}`,
        franchiseeEmail: `franchisee${index + 1}@example.com`,
        franchiseePhone: `+66-2-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        businessAddress: restaurant.address,
        territoryId: restaurant.settings?.territory_id || `territory_${Math.floor(Math.random() * 5) + 1}`,
        regionId: restaurant.settings?.region_id || regionId || 'region_001',
        franchiseType: ['single_unit', 'multi_unit', 'area_development'][Math.floor(Math.random() * 3)],
        status: ['active', 'pending', 'suspended'][Math.floor(Math.random() * 3)],
        investmentAmount: Math.floor(Math.random() * 500000) + 100000,
        franchiseFee: Math.floor(Math.random() * 50000) + 25000,
        royaltyRate,
        marketingFeeRate,
        licenseTerms: {
          startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + (5 + Math.random() * 10) * 365 * 24 * 60 * 60 * 1000).toISOString(),
          renewalOptions: Math.floor(Math.random() * 3) + 1,
          renewalTermYears: 5,
          exclusivityRadius: Math.floor(Math.random() * 10) + 5
        },
        performanceMetrics,
        overallPerformanceScore: overallScore,
        performanceRating: overallScore >= 90 ? 'excellent' : 
                          overallScore >= 80 ? 'good' : 
                          overallScore >= 70 ? 'satisfactory' : 
                          overallScore >= 60 ? 'needs_improvement' : 'poor',
        complianceLevel: complianceScore >= 90 ? 'full' : 
                        complianceScore >= 70 ? 'partial' : 'non_compliant',
        financialData: includeFinancials ? {
          monthlyRevenue,
          monthlyRoyalties: monthlyRevenue * (royaltyRate / 100),
          monthlyMarketingFees: monthlyRevenue * (marketingFeeRate / 100),
          yearToDateRevenue: monthlyRevenue * 10 + Math.floor(Math.random() * monthlyRevenue * 2),
          profitMargin: Math.floor(Math.random() * 20) + 10,
          lastReportingDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        } : undefined,
        complianceData: includeCompliance ? {
          lastAuditDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          lastAuditScore: complianceScore,
          brandStandardsCompliance: performanceMetrics.brandStandards,
          trainingCompliance: Math.floor(Math.random() * 20) + 80,
          nextAuditDue: new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
          openViolations: Math.floor(Math.random() * 3),
          correctiveActions: Math.floor(Math.random() * 2)
        } : undefined,
        createdAt: restaurant.created_at,
        lastUpdated: new Date().toISOString()
      };

      return franchise;
    }) || [];

    // Apply filters
    let filteredFranchises = franchises.filter(franchise => {
      if (franchiseStatus && franchise.status !== franchiseStatus) return false;
      if (territoryId && franchise.territoryId !== territoryId) return false;
      if (performanceRating && franchise.performanceRating !== performanceRating) return false;
      if (complianceLevel && franchise.complianceLevel !== complianceLevel) return false;
      if (revenueRange && franchise.financialData) {
        if (revenueRange.min && franchise.financialData.monthlyRevenue < revenueRange.min) return false;
        if (revenueRange.max && franchise.financialData.monthlyRevenue > revenueRange.max) return false;
      }
      return true;
    });

    // Calculate summary statistics
    const summary = {
      totalFranchises: filteredFranchises.length,
      statusBreakdown: {
        active: filteredFranchises.filter(f => f.status === 'active').length,
        pending: filteredFranchises.filter(f => f.status === 'pending').length,
        suspended: filteredFranchises.filter(f => f.status === 'suspended').length,
        terminated: filteredFranchises.filter(f => f.status === 'terminated').length
      },
      performanceBreakdown: {
        excellent: filteredFranchises.filter(f => f.performanceRating === 'excellent').length,
        good: filteredFranchises.filter(f => f.performanceRating === 'good').length,
        satisfactory: filteredFranchises.filter(f => f.performanceRating === 'satisfactory').length,
        needs_improvement: filteredFranchises.filter(f => f.performanceRating === 'needs_improvement').length,
        poor: filteredFranchises.filter(f => f.performanceRating === 'poor').length
      },
      complianceBreakdown: {
        full: filteredFranchises.filter(f => f.complianceLevel === 'full').length,
        partial: filteredFranchises.filter(f => f.complianceLevel === 'partial').length,
        non_compliant: filteredFranchises.filter(f => f.complianceLevel === 'non_compliant').length
      },
      averagePerformanceScore: filteredFranchises.length > 0 ?
        Math.round(filteredFranchises.reduce((sum, f) => sum + f.overallPerformanceScore, 0) / filteredFranchises.length) : 0,
      financialSummary: includeFinancials ? {
        totalMonthlyRevenue: filteredFranchises.reduce((sum, f) => sum + (f.financialData?.monthlyRevenue || 0), 0),
        totalMonthlyRoyalties: filteredFranchises.reduce((sum, f) => sum + (f.financialData?.monthlyRoyalties || 0), 0),
        totalMarketingFees: filteredFranchises.reduce((sum, f) => sum + (f.financialData?.monthlyMarketingFees || 0), 0),
        averageProfitMargin: filteredFranchises.length > 0 ?
          Math.round(filteredFranchises.reduce((sum, f) => sum + (f.financialData?.profitMargin || 0), 0) / filteredFranchises.length) : 0
      } : undefined
    };

    // Identify franchises requiring attention
    const franchisesRequiringAttention = filteredFranchises
      .filter(f => f.performanceRating === 'needs_improvement' || f.performanceRating === 'poor' || f.complianceLevel === 'non_compliant')
      .sort((a, b) => a.overallPerformanceScore - b.overallPerformanceScore)
      .slice(0, 10)
      .map(f => ({
        franchiseId: f.id,
        businessName: f.businessName,
        franchiseeName: f.franchiseeName,
        performanceScore: f.overallPerformanceScore,
        performanceRating: f.performanceRating,
        complianceLevel: f.complianceLevel,
        issues: [
          ...(f.performanceRating === 'poor' ? ['Low performance score'] : []),
          ...(f.complianceLevel === 'non_compliant' ? ['Compliance violations'] : []),
          ...(f.financialData && f.financialData.profitMargin < 10 ? ['Low profit margin'] : [])
        ]
      }));

    return NextResponse.json({
      success: true,
      data: {
        summary,
        franchises: filteredFranchises,
        franchisesRequiringAttention,
        territoryDistribution: Object.values(filteredFranchises.reduce((acc: any, f) => {
          if (!acc[f.territoryId]) {
            acc[f.territoryId] = { territoryId: f.territoryId, count: 0, averagePerformance: 0 };
          }
          acc[f.territoryId].count++;
          acc[f.territoryId].averagePerformance += f.overallPerformanceScore;
          return acc;
        }, {})).map((territory: any) => ({
          ...territory,
          averagePerformance: Math.round(territory.averagePerformance / territory.count)
        })),
        queryParams: validationResult.data,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'get_franchise_overview' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Create New Franchise
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
    const validationResult = FranchiseCreateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      franchiseeName,
      franchiseeEmail,
      franchiseePhone,
      businessName,
      businessAddress,
      territoryId,
      regionId,
      franchiseType,
      investmentAmount,
      franchiseFee,
      royaltyRate,
      marketingFeeRate,
      licenseTerms,
      brandStandards,
      supportPackage,
      performanceTargets,
      approvalRequired
    } = validationResult.data;

    // Verify franchise admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyFranchiseAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate license term dates
    const startDate = new Date(licenseTerms.startDate);
    const endDate = new Date(licenseTerms.endDate);
    
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'License end date must be after start date', code: 'INVALID_LICENSE_TERMS' },
        { status: 400 }
      );
    }

    // Check for territory conflicts (in reality, would check against a territories table)
    // For now, we'll simulate territory validation
    const territoryConflict = Math.random() < 0.05; // 5% chance of conflict for demo
    
    if (territoryConflict) {
      return NextResponse.json(
        { error: 'Territory conflict detected - exclusivity radius overlaps with existing franchise', code: 'TERRITORY_CONFLICT' },
        { status: 409 }
      );
    }

    // Create restaurant record first
    const restaurantData = {
      name: businessName,
      name_fr: businessName, // In reality, would have proper French translation
      address: `${businessAddress.street}, ${businessAddress.city}, ${businessAddress.state} ${businessAddress.postalCode}`,
      address_fr: `${businessAddress.street}, ${businessAddress.city}, ${businessAddress.state} ${businessAddress.postalCode}`,
      phone: franchiseePhone,
      email: franchiseeEmail,
      timezone: 'Asia/Bangkok', // Default timezone, would be determined by location
      settings: {
        is_franchise: true,
        territory_id: territoryId,
        region_id: regionId,
        franchise_type: franchiseType,
        brand_standards: brandStandards,
        support_package: supportPackage,
        performance_targets: performanceTargets
      },
      is_active: !approvalRequired // Active immediately if no approval required
    };

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select('id')
      .single();

    if (restaurantError) {
      logError('RESTAURANT_CREATE_FAILED', restaurantError, { restaurantData });
      return NextResponse.json(
        { error: 'Failed to create restaurant record', code: 'RESTAURANT_CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Create franchise record (in reality, would use a separate franchises table)
    const franchiseId = `franchise_${restaurant.id}`;
    const franchiseData = {
      id: franchiseId,
      restaurant_id: restaurant.id,
      franchisee_name: franchiseeName,
      franchisee_email: franchiseeEmail,
      franchisee_phone: franchiseePhone,
      business_name: businessName,
      business_address: businessAddress,
      territory_id: territoryId,
      region_id: regionId,
      franchise_type: franchiseType,
      investment_amount: investmentAmount,
      franchise_fee: franchiseFee,
      royalty_rate: royaltyRate,
      marketing_fee_rate: marketingFeeRate,
      license_terms: licenseTerms,
      brand_standards: brandStandards,
      support_package: supportPackage,
      performance_targets: performanceTargets,
      status: approvalRequired ? 'pending_approval' : 'active',
      created_by: userId,
      created_at: new Date().toISOString(),
      metadata: {
        recordType: 'franchise_agreement',
        approvalRequired,
        initialSetup: true,
        licenseTermYears: Math.ceil((endDate.getTime() - startDate.getTime()) / (365 * 24 * 60 * 60 * 1000))
      }
    };

    // Create initial franchisee user account
    const franchiseeUserData = {
      email: franchiseeEmail,
      pin_hash: null, // Would be set during onboarding
      role: 'manager',
      full_name: franchiseeName,
      full_name_fr: franchiseeName,
      phone: franchiseePhone,
      position: 'Franchise Owner',
      position_fr: 'Propriétaire de Franchise',
      restaurant_id: restaurant.id,
      is_active: !approvalRequired,
      metadata: {
        account_type: 'franchisee',
        requires_onboarding: true,
        franchise_id: franchiseId
      }
    };

    const { data: franchiseeUser, error: userError } = await supabase
      .from('auth_users')
      .insert(franchiseeUserData)
      .select('id')
      .single();

    if (userError) {
      // If user creation fails, we should clean up the restaurant record
      await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurant.id);
        
      logError('FRANCHISEE_USER_CREATE_FAILED', userError, { franchiseeUserData });
      return NextResponse.json(
        { error: 'Failed to create franchisee user account', code: 'USER_CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Create initial support tickets for onboarding
    const onboardingTasks = [
      {
        type: 'training',
        title: 'Initial Franchise Training Program',
        description: 'Complete comprehensive franchise training covering operations, brand standards, and system usage',
        priority: 'high',
        category: 'routine'
      },
      {
        type: 'operational',
        title: 'Restaurant Setup and Equipment Installation',
        description: 'Coordinate restaurant setup, equipment installation, and initial inventory',
        priority: 'high',
        category: 'routine'
      },
      {
        type: 'marketing',
        title: 'Grand Opening Marketing Campaign',
        description: 'Plan and execute grand opening marketing campaign with brand guidelines',
        priority: 'medium',
        category: 'enhancement'
      }
    ];

    // Create support requests for onboarding (in reality, would insert into support_requests table)
    const supportRequestIds = onboardingTasks.map(task => `support_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    // Log franchise creation
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: restaurant.id,
        user_id: userId,
        action: 'CREATE',
        resource_type: 'franchise_agreement',
        resource_id: franchiseId,
        details: {
          franchiseeName,
          businessName,
          franchiseType,
          territoryId,
          regionId,
          investmentAmount,
          franchiseFee,
          royaltyRate,
          marketingFeeRate,
          licenseTermYears: franchiseData.metadata.licenseTermYears,
          approvalRequired,
          supportTasksCreated: onboardingTasks.length
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: approvalRequired ? 
        'Franchise application submitted for approval' : 
        'Franchise created successfully',
      data: {
        franchiseId,
        restaurantId: restaurant.id,
        franchiseeUserId: franchiseeUser.id,
        businessName,
        franchiseeName,
        franchiseType,
        territory: territoryId,
        region: regionId,
        licenseTerms: {
          startDate: licenseTerms.startDate,
          endDate: licenseTerms.endDate,
          termYears: franchiseData.metadata.licenseTermYears,
          renewalOptions: licenseTerms.renewalOptions
        },
        financialTerms: {
          investmentAmount,
          franchiseFee,
          royaltyRate,
          marketingFeeRate
        },
        status: franchiseData.status,
        onboardingTasks: onboardingTasks.length,
        supportRequestIds,
        createdAt: franchiseData.created_at,
        approvalRequired
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'create_franchise' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PUT: Calculate and Process Royalty Payment
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
    const validationResult = RoyaltyCalculationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      franchiseId,
      reportingPeriod,
      revenueData,
      expenseData,
      supportingDocuments,
      submittedBy,
      certifiedAccurate
    } = validationResult.data;

    // Verify franchise admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyFranchiseAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Get franchise details (in reality, would query from franchises table)
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        settings,
        is_active
      `)
      .eq('id', franchiseId.replace('franchise_', ''))
      .eq('settings->>is_franchise', 'true')
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Franchise not found', code: 'FRANCHISE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Simulate franchise agreement terms (would come from database)
    const franchiseTerms = {
      royaltyRate: 6.5, // 6.5%
      marketingFeeRate: 2.5, // 2.5%
      minimumRoyalty: 500, // minimum monthly royalty
      exemptTransactionTypes: ['refunds', 'employee_meals', 'promotional_discounts']
    };

    // Calculate royalties
    const royaltyCalculation = calculateRoyalties(revenueData, franchiseTerms.royaltyRate, franchiseTerms.marketingFeeRate);
    
    // Apply minimum royalty if applicable
    if (royaltyCalculation.royaltyAmount < franchiseTerms.minimumRoyalty) {
      royaltyCalculation.royaltyAmount = franchiseTerms.minimumRoyalty;
      royaltyCalculation.totalDue = franchiseTerms.minimumRoyalty + royaltyCalculation.marketingFee;
      royaltyCalculation.minimumRoyaltyApplied = true;
    }

    // Create royalty report record
    const reportId = `royalty_${Date.now()}`;
    const royaltyReport = {
      id: reportId,
      franchise_id: franchiseId,
      restaurant_id: restaurant.id,
      reporting_period: reportingPeriod,
      revenue_data: revenueData,
      expense_data: expenseData,
      royalty_calculation: royaltyCalculation,
      franchise_terms: franchiseTerms,
      supporting_documents: supportingDocuments || [],
      submitted_by: submittedBy,
      processed_by: userId,
      certified_accurate: certifiedAccurate,
      status: 'calculated',
      created_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      metadata: {
        reportType: 'monthly_royalty',
        calculationMethod: 'standard',
        hasMinimumRoyalty: royaltyCalculation.minimumRoyaltyApplied || false,
        supportingDocumentsCount: supportingDocuments?.length || 0
      }
    };

    // Generate payment instructions
    const paymentInstructions = {
      paymentMethod: 'bank_transfer',
      accountDetails: {
        accountName: 'Krong Thai Restaurant Franchise Ltd.',
        bankName: 'Bangkok Bank',
        accountNumber: '1234567890',
        swiftCode: 'BKKBTHBK',
        reference: `ROY-${reportId.slice(-8).toUpperCase()}`
      },
      alternativePayments: ['credit_card', 'online_banking'],
      paymentDeadline: royaltyReport.due_date,
      latePaymentFee: royaltyCalculation.totalDue * 0.015, // 1.5% late fee
      currency: 'THB'
    };

    // Create notification for franchisee
    const notification = {
      type: 'royalty_calculation',
      recipient_type: 'franchisee',
      franchise_id: franchiseId,
      content: {
        title: 'Monthly Royalty Calculation Complete',
        message: `Your royalty calculation for ${new Date(reportingPeriod.startDate).toLocaleDateString()} - ${new Date(reportingPeriod.endDate).toLocaleDateString()} is ready`,
        totalDue: royaltyCalculation.totalDue,
        dueDate: royaltyReport.due_date,
        paymentReference: paymentInstructions.accountDetails.reference
      },
      created_at: new Date().toISOString()
    };

    // Log royalty calculation
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: restaurant.id,
        user_id: userId,
        action: 'CREATE',
        resource_type: 'royalty_calculation',
        resource_id: reportId,
        details: {
          franchiseName: restaurant.name,
          reportingPeriod: `${reportingPeriod.startDate} to ${reportingPeriod.endDate}`,
          grossRevenue: revenueData.grossRevenue,
          netRevenue: revenueData.netRevenue,
          royaltyAmount: royaltyCalculation.royaltyAmount,
          marketingFee: royaltyCalculation.marketingFee,
          totalDue: royaltyCalculation.totalDue,
          royaltyRate: franchiseTerms.royaltyRate,
          marketingFeeRate: franchiseTerms.marketingFeeRate,
          certifiedAccurate
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: 'Royalty calculation completed successfully',
      data: {
        reportId,
        franchiseId,
        businessName: restaurant.name,
        reportingPeriod,
        revenueBreakdown: {
          grossRevenue: revenueData.grossRevenue,
          netRevenue: revenueData.netRevenue,
          exemptRevenue: revenueData.exemptRevenue || 0,
          calculationBase: royaltyCalculation.calculationBase
        },
        royaltyBreakdown: {
          royaltyRate: franchiseTerms.royaltyRate,
          royaltyAmount: royaltyCalculation.royaltyAmount,
          marketingFeeRate: franchiseTerms.marketingFeeRate,
          marketingFee: royaltyCalculation.marketingFee,
          totalDue: royaltyCalculation.totalDue,
          minimumRoyaltyApplied: royaltyCalculation.minimumRoyaltyApplied || false
        },
        paymentInstructions,
        dueDate: royaltyReport.due_date,
        status: royaltyReport.status,
        calculatedAt: royaltyCalculation.calculatedAt,
        certifiedAccurate
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'calculate_royalty' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PATCH: Submit Franchisee Support Request
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
    const validationResult = FranchiseeSupportSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      franchiseId,
      supportType,
      supportCategory,
      requestTitle,
      requestDescription,
      priorityLevel,
      expectedResolution,
      assignedTo,
      resourcesRequired,
      attachments,
      followUpRequired
    } = validationResult.data;

    // Verify user access (could be franchisee or franchise admin)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select(`
        id,
        role,
        full_name,
        full_name_fr,
        restaurant_id,
        restaurants!inner(name, name_fr, settings)
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user has access to this franchise
    const restaurantId = franchiseId.replace('franchise_', '');
    if (user.role !== 'admin' && user.restaurant_id !== restaurantId) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Create support request
    const supportRequestId = `support_${Date.now()}`;
    const supportRequest = {
      id: supportRequestId,
      franchise_id: franchiseId,
      restaurant_id: restaurantId,
      requester_id: userId,
      support_type: supportType,
      support_category: supportCategory,
      title: requestTitle,
      description: requestDescription,
      priority_level: priorityLevel,
      expected_resolution: expectedResolution,
      assigned_to: assignedTo,
      resources_required: resourcesRequired || [],
      attachments: attachments || [],
      follow_up_required: followUpRequired,
      status: 'open',
      created_at: new Date().toISOString(),
      estimated_resolution_date: expectedResolution ? (() => {
        const now = new Date();
        switch (expectedResolution) {
          case 'same_day': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
          case 'within_week': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          case 'within_month': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          default: return null;
        }
      })() : null,
      metadata: {
        requestType: 'franchisee_support',
        requesterRole: user.role,
        businessName: user.restaurants.name,
        resourcesEstimatedCost: resourcesRequired?.reduce((sum, resource) => sum + (resource.estimatedCost || 0), 0) || 0,
        attachmentsCount: attachments?.length || 0
      }
    };

    // Auto-assign based on support type if not specified
    if (!assignedTo) {
      const supportTeamAssignments = {
        training: 'training_team',
        marketing: 'marketing_team',
        operational: 'operations_team',
        technical: 'technical_team',
        financial: 'finance_team',
        legal: 'legal_team'
      };
      
      supportRequest.assigned_to = supportTeamAssignments[supportType] || 'general_support';
    }

    // Create priority-based SLA
    const slaTargets = {
      critical: { responseHours: 2, resolutionHours: 24 },
      high: { responseHours: 4, resolutionHours: 72 },
      medium: { responseHours: 8, resolutionHours: 168 }, // 1 week
      low: { responseHours: 24, resolutionHours: 336 } // 2 weeks
    };

    const sla = slaTargets[priorityLevel];
    supportRequest.response_due = new Date(Date.now() + sla.responseHours * 60 * 60 * 1000).toISOString();
    supportRequest.resolution_due = new Date(Date.now() + sla.resolutionHours * 60 * 60 * 1000).toISOString();

    // Create notification for support team
    const supportNotification = {
      type: 'support_request_created',
      recipient_type: 'team',
      recipient_team: supportRequest.assigned_to,
      content: {
        title: `New ${supportType} support request - ${priorityLevel} priority`,
        message: requestTitle,
        supportRequestId,
        franchiseName: user.restaurants.name,
        requesterName: user.full_name,
        priority: priorityLevel,
        expectedResolution,
        responseDue: supportRequest.response_due
      },
      created_at: new Date().toISOString()
    };

    // Create acknowledgment notification for franchisee
    const franchiseeNotification = {
      type: 'support_request_acknowledged',
      recipient_type: 'user',
      recipient_id: userId,
      content: {
        title: 'Support Request Submitted',
        message: `Your ${supportType} support request has been submitted and assigned to our ${supportRequest.assigned_to.replace('_', ' ')} team`,
        supportRequestId,
        ticketNumber: supportRequestId.slice(-8).toUpperCase(),
        priority: priorityLevel,
        expectedResponse: supportRequest.response_due,
        estimatedResolution: supportRequest.resolution_due
      },
      created_at: new Date().toISOString()
    };

    // Log support request creation
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        action: 'CREATE',
        resource_type: 'franchisee_support_request',
        resource_id: supportRequestId,
        details: {
          businessName: user.restaurants.name,
          requesterName: user.full_name,
          supportType,
          supportCategory,
          title: requestTitle,
          priority: priorityLevel,
          assignedTo: supportRequest.assigned_to,
          expectedResolution,
          resourcesRequired: resourcesRequired?.length || 0,
          attachments: attachments?.length || 0,
          followUpRequired
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: 'Support request submitted successfully',
      data: {
        supportRequestId,
        ticketNumber: supportRequestId.slice(-8).toUpperCase(),
        franchise: {
          id: franchiseId,
          businessName: user.restaurants.name,
          businessNameFr: user.restaurants.name_fr
        },
        request: {
          title: requestTitle,
          description: requestDescription,
          type: supportType,
          category: supportCategory,
          priority: priorityLevel,
          expectedResolution
        },
        assignment: {
          assignedTo: supportRequest.assigned_to,
          responseDue: supportRequest.response_due,
          resolutionDue: supportRequest.resolution_due
        },
        resources: {
          required: resourcesRequired?.length || 0,
          estimatedCost: supportRequest.metadata.resourcesEstimatedCost,
          attachments: attachments?.length || 0
        },
        status: supportRequest.status,
        createdAt: supportRequest.created_at,
        followUpRequired
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'submit_franchisee_support' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}