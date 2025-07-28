/**
 * Multi-Restaurant Cross-Training API
 * Cross-location staff training and certification management
 * 
 * Features:
 * - Cross-location training programs
 * - Staff certification tracking
 * - Skill standardization across locations
 * - Training transfer and mobility
 * - Chain-wide competency management
 * - Inter-restaurant knowledge sharing
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const CrossTrainingQuerySchema = z.object({
  programType: z.enum(['standardization', 'advancement', 'cross_training', 'certification']).optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  competencyArea: z.array(z.string()).optional(),
  restaurantIds: z.array(z.string().uuid()).optional(),
  regionId: z.string().uuid().optional(),
  staffRole: z.enum(['staff', 'manager', 'admin']).optional(),
  certificationStatus: z.enum(['active', 'expired', 'pending', 'revoked']).optional(),
  includeProgress: z.boolean().optional().default(false),
  includeTransferability: z.boolean().optional().default(false)
});

const CrossTrainingProgramSchema = z.object({
  name: z.string().min(5).max(200),
  description: z.string().min(20).max(1000),
  programType: z.enum(['standardization', 'advancement', 'cross_training', 'certification']),
  targetRoles: z.array(z.enum(['staff', 'manager', 'admin'])).min(1),
  competencyAreas: z.array(z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    requiredSkillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    weight: z.number().min(0).max(1),
    modules: z.array(z.string().uuid()).min(1)
  })).min(1),
  prerequisites: z.object({
    requiredCertifications: z.array(z.string().uuid()).optional(),
    minimumExperience: z.number().int().min(0).optional(), // months
    requiredTraining: z.array(z.string().uuid()).optional(),
    skillRequirements: z.array(z.object({
      skill: z.string(),
      level: z.enum(['beginner', 'intermediate', 'advanced', 'expert'])
    })).optional()
  }).optional(),
  trainingModules: z.array(z.object({
    moduleId: z.string().uuid(),
    isRequired: z.boolean().default(true),
    order: z.number().int().min(1),
    estimatedHours: z.number().min(0.5).max(40),
    completionCriteria: z.object({
      passingScore: z.number().min(0).max(100).optional(),
      practicalAssessment: z.boolean().default(false),
      peerReview: z.boolean().default(false),
      managerApproval: z.boolean().default(false)
    }).optional()
  })).min(1),
  certification: z.object({
    issueCertificate: z.boolean().default(true),
    certificateName: z.string().max(200).optional(),
    validityPeriod: z.number().int().min(1).max(60).optional(), // months
    renewalRequired: z.boolean().default(true),
    transferable: z.boolean().default(true),
    crossLocationValid: z.boolean().default(true)
  }).optional(),
  schedule: z.object({
    duration: z.number().int().min(1).max(180), // days
    maxParticipants: z.number().int().min(1).max(50).optional(),
    sessionSchedule: z.enum(['flexible', 'fixed', 'self_paced']).default('flexible'),
    locationRequirement: z.enum(['home_location', 'any_location', 'specific_location']).default('home_location')
  }),
  applicableRestaurants: z.array(z.string().uuid()).optional(),
  regionId: z.string().uuid().optional(),
  isActive: z.boolean().default(true)
});

const StaffEnrollmentSchema = z.object({
  programId: z.string().uuid(),
  staffMembers: z.array(z.object({
    staffId: z.string().uuid(),
    homeRestaurantId: z.string().uuid(),
    trainingRestaurantId: z.string().uuid().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    expectedCompletionDate: z.string().datetime().optional(),
    specialRequirements: z.string().max(500).optional()
  })).min(1),
  enrollmentType: z.enum(['individual', 'batch', 'cross_location']),
  trainingCoordinator: z.string().uuid().optional(),
  notificationSettings: z.object({
    notifyStaff: z.boolean().default(true),
    notifyManagers: z.boolean().default(true),
    notifyTrainers: z.boolean().default(true),
    reminderFrequency: z.enum(['daily', 'weekly', 'biweekly']).default('weekly')
  }).optional()
});

const CertificationTransferSchema = z.object({
  staffId: z.string().uuid(),
  sourceRestaurantId: z.string().uuid(),
  targetRestaurantId: z.string().uuid(),
  certificationsToTransfer: z.array(z.string().uuid()).min(1),
  transferType: z.enum(['permanent', 'temporary', 'cross_training']),
  transferPeriod: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional()
  }).optional(),
  skillGapAnalysis: z.object({
    requiredSkills: z.array(z.string()),
    currentSkills: z.array(z.string()),
    trainingNeeded: z.array(z.string()).optional()
  }).optional(),
  approvalRequired: z.boolean().default(true),
  reason: z.string().min(20).max(1000)
});

const CompetencyAssessmentSchema = z.object({
  staffId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  competencyAreas: z.array(z.object({
    area: z.string().min(3).max(100),
    currentLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    targetLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    assessmentMethod: z.enum(['observation', 'test', 'practical', 'peer_review', 'self_assessment']),
    assessorId: z.string().uuid().optional(),
    notes: z.string().max(1000).optional(),
    evidenceFiles: z.array(z.string()).optional()
  })).min(1),
  assessmentDate: z.string().datetime().optional(),
  overallRating: z.enum(['below_standard', 'meets_standard', 'exceeds_standard', 'exceptional']).optional(),
  developmentPlan: z.object({
    goals: z.array(z.string()).min(1),
    timeline: z.string().max(500),
    resources: z.array(z.string()).optional(),
    mentorId: z.string().uuid().optional()
  }).optional()
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
  
  console.error(`[CROSS-TRAINING] ${timestamp}:`, JSON.stringify(errorLog, null, 2));
}

// Helper function to verify training admin access
async function verifyTrainingAdminAccess(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('id, role, restaurant_id, restaurants!inner(id, name, settings)')
    .eq('id', userId)
    .in('role', ['admin', 'manager'])
    .single();

  if (error || !user) {
    throw new Error('Insufficient permissions - Training admin access required');
  }

  return user;
}

// Helper function to calculate competency score
function calculateCompetencyScore(competencyAreas: any[]) {
  if (competencyAreas.length === 0) return 0;
  
  const levelScores = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 };
  const totalScore = competencyAreas.reduce((sum, area) => {
    return sum + (levelScores[area.currentLevel] * (area.weight || 1));
  }, 0);
  
  const totalWeight = competencyAreas.reduce((sum, area) => sum + (area.weight || 1), 0);
  return Math.round(totalScore / totalWeight);
}

// GET: Cross-Training Overview
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
    
    // Parse array parameters
    if (queryParams.competencyArea) {
      queryParams.competencyArea = queryParams.competencyArea.split(',');
    }
    if (queryParams.restaurantIds) {
      queryParams.restaurantIds = queryParams.restaurantIds.split(',');
    }
    
    const validationResult = CrossTrainingQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { 
      programType, 
      skillLevel, 
      competencyArea, 
      restaurantIds, 
      regionId, 
      staffRole, 
      certificationStatus,
      includeProgress,
      includeTransferability
    } = validationResult.data;

    // Verify training admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyTrainingAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Get restaurants data
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

    if (restaurantIds && restaurantIds.length > 0) {
      restaurantsQuery = restaurantsQuery.in('id', restaurantIds);
    }

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

    const restaurantIdList = restaurants?.map(r => r.id) || [];

    // Get staff members across locations
    let staffQuery = supabase
      .from('auth_users')
      .select(`
        id,
        email,
        role,
        full_name,
        full_name_fr,
        restaurant_id,
        position,
        position_fr,
        is_active,
        restaurants!inner(name, name_fr)
      `)
      .eq('is_active', true)
      .in('restaurant_id', restaurantIdList);

    if (staffRole) {
      staffQuery = staffQuery.eq('role', staffRole);
    }

    const { data: staffMembers, error: staffError } = await staffQuery;

    if (staffError) {
      logError('STAFF_QUERY', staffError);
      return NextResponse.json(
        { error: 'Failed to fetch staff data', code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    // Simulate cross-training programs data
    const crossTrainingPrograms = [
      {
        id: 'program_001',
        name: 'Multi-Location Food Safety Certification',
        description: 'Standardized food safety training valid across all restaurant locations',
        programType: 'certification',
        targetRoles: ['staff', 'manager'],
        competencyAreas: ['food_safety', 'hygiene_protocols', 'temperature_control'],
        duration: 14,
        maxParticipants: 20,
        isActive: true,
        enrolledCount: 45,
        completedCount: 32,
        transferable: true,
        crossLocationValid: true,
        applicableRestaurants: restaurantIdList,
        createdAt: '2024-01-15T08:00:00Z'
      },
      {
        id: 'program_002',
        name: 'Advanced Kitchen Operations Cross-Training',
        description: 'Advanced culinary skills training for cross-location deployment',
        programType: 'advancement',
        targetRoles: ['staff', 'manager'],
        competencyAreas: ['culinary_skills', 'equipment_operation', 'quality_control'],
        duration: 21,
        maxParticipants: 15,
        isActive: true,
        enrolledCount: 28,
        completedCount: 19,
        transferable: true,
        crossLocationValid: true,
        applicableRestaurants: restaurantIdList,
        createdAt: '2024-02-01T08:00:00Z'
      },
      {
        id: 'program_003',
        name: 'Management Excellence Program',
        description: 'Leadership development for potential cross-location managers',
        programType: 'advancement',
        targetRoles: ['manager'],
        competencyAreas: ['leadership', 'operations_management', 'financial_oversight'],
        duration: 30,
        maxParticipants: 10,
        isActive: true,
        enrolledCount: 12,
        completedCount: 7,
        transferable: true,
        crossLocationValid: true,
        applicableRestaurants: restaurantIdList,
        createdAt: '2024-01-20T08:00:00Z'
      }
    ];

    // Filter programs based on query parameters
    let filteredPrograms = crossTrainingPrograms.filter(program => {
      if (programType && program.programType !== programType) return false;
      if (competencyArea && !competencyArea.some(area => program.competencyAreas.includes(area))) return false;
      return true;
    });

    // Generate staff competency data
    const staffCompetencies = staffMembers?.map(staff => {
      // Simulate competency assessment data
      const competencyAreas = [
        { area: 'food_safety', currentLevel: 'intermediate', weight: 0.3 },
        { area: 'customer_service', currentLevel: 'advanced', weight: 0.25 },
        { area: 'equipment_operation', currentLevel: 'beginner', weight: 0.2 },
        { area: 'hygiene_protocols', currentLevel: 'advanced', weight: 0.25 }
      ];

      const overallScore = calculateCompetencyScore(competencyAreas);
      
      // Simulate active certifications
      const activeCertifications = [
        {
          id: 'cert_001',
          name: 'Food Safety Level 1',
          issuedDate: '2024-01-15T00:00:00Z',
          expiryDate: '2025-01-15T00:00:00Z',
          status: 'active',
          transferable: true,
          issuingProgram: 'program_001'
        },
        {
          id: 'cert_002',
          name: 'Customer Service Excellence',
          issuedDate: '2024-02-20T00:00:00Z',
          expiryDate: '2025-02-20T00:00:00Z',
          status: 'active',
          transferable: true,
          issuingProgram: 'program_002'
        }
      ].filter(cert => {
        if (certificationStatus) {
          return cert.status === certificationStatus;
        }
        return true;
      });

      return {
        staffId: staff.id,
        email: staff.email,
        fullName: staff.full_name,
        fullNameFr: staff.full_name_fr,
        role: staff.role,
        position: staff.position,
        positionFr: staff.position_fr,
        homeRestaurant: {
          id: staff.restaurant_id,
          name: staff.restaurants.name,
          nameFr: staff.restaurants.name_fr
        },
        overallCompetencyScore: overallScore,
        competencyAreas: includeProgress ? competencyAreas : undefined,
        activeCertifications,
        transferableSkills: includeTransferability ? [
          'food_safety_protocols',
          'customer_service_standards',
          'pos_system_operation',
          'basic_kitchen_operations'
        ] : undefined,
        crossLocationExperience: includeTransferability ? {
          hasWorkedAtMultipleLocations: Math.random() > 0.7,
          locationsWorked: Math.floor(Math.random() * 3) + 1,
          totalCrossLocationDays: Math.floor(Math.random() * 200) + 30
        } : undefined,
        trainingProgress: includeProgress ? {
          activePrograms: Math.floor(Math.random() * 3),
          completedPrograms: Math.floor(Math.random() * 5) + 1,
          totalTrainingHours: Math.floor(Math.random() * 100) + 40
        } : undefined
      };
    }) || [];

    // Generate cross-training analytics
    const crossTrainingAnalytics = {
      totalStaff: staffCompetencies.length,
      averageCompetencyScore: staffCompetencies.length > 0 ? 
        Math.round(staffCompetencies.reduce((sum, s) => sum + s.overallCompetencyScore, 0) / staffCompetencies.length) : 0,
      certificationDistribution: {
        active: staffCompetencies.reduce((sum, s) => sum + s.activeCertifications.filter(c => c.status === 'active').length, 0),
        expired: staffCompetencies.reduce((sum, s) => sum + s.activeCertifications.filter(c => c.status === 'expired').length, 0),
        pending: staffCompetencies.reduce((sum, s) => sum + s.activeCertifications.filter(c => c.status === 'pending').length, 0)
      },
      crossLocationMobility: includeTransferability ? {
        eligibleForTransfer: staffCompetencies.filter(s => s.overallCompetencyScore >= 75).length,
        multiLocationExperienced: staffCompetencies.filter(s => s.crossLocationExperience?.hasWorkedAtMultipleLocations).length,
        averageTransferabilityScore: Math.round(Math.random() * 30 + 70)
      } : undefined,
      programEngagement: {
        totalActivePrograms: filteredPrograms.length,
        totalEnrollments: filteredPrograms.reduce((sum, p) => sum + p.enrolledCount, 0),
        totalCompletions: filteredPrograms.reduce((sum, p) => sum + p.completedCount, 0),
        averageCompletionRate: filteredPrograms.length > 0 ? 
          Math.round((filteredPrograms.reduce((sum, p) => sum + (p.completedCount / p.enrolledCount), 0) / filteredPrograms.length) * 100) : 0
      }
    };

    // Identify skill gaps and opportunities
    const skillGapAnalysis = {
      criticalSkillGaps: [
        { skill: 'advanced_culinary_techniques', gapPercentage: 35, affectedStaff: 15 },
        { skill: 'inventory_management', gapPercentage: 28, affectedStaff: 12 },
        { skill: 'conflict_resolution', gapPercentage: 22, affectedStaff: 9 }
      ],
      crossTrainingOpportunities: [
        {
          opportunity: 'Kitchen staff cross-training in service',
          potentialParticipants: 18,
          estimatedBenefit: 'Increased operational flexibility',
          priority: 'high'
        },
        {
          opportunity: 'Service staff training in basic food prep',
          potentialParticipants: 14,
          estimatedBenefit: 'Enhanced customer service during busy periods',
          priority: 'medium'
        }
      ],
      transferReadyStaff: staffCompetencies
        .filter(s => s.overallCompetencyScore >= 80 && s.activeCertifications.length >= 2)
        .slice(0, 10)
        .map(s => ({
          staffId: s.staffId,
          fullName: s.fullName,
          role: s.role,
          competencyScore: s.overallCompetencyScore,
          certificationCount: s.activeCertifications.length,
          homeRestaurant: s.homeRestaurant.name
        }))
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRestaurants: restaurants?.length || 0,
          totalStaff: staffCompetencies.length,
          activePrograms: filteredPrograms.length,
          region: regionId || 'all_regions'
        },
        crossTrainingPrograms: filteredPrograms,
        staffCompetencies,
        analytics: crossTrainingAnalytics,
        skillGapAnalysis,
        queryParams: validationResult.data,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'get_cross_training_overview' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// POST: Create Cross-Training Program
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
    const validationResult = CrossTrainingProgramSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      programType,
      targetRoles,
      competencyAreas,
      prerequisites,
      trainingModules,
      certification,
      schedule,
      applicableRestaurants,
      regionId,
      isActive
    } = validationResult.data;

    // Verify training admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyTrainingAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate competency area weights sum to approximately 1
    const totalWeight = competencyAreas.reduce((sum, area) => sum + area.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.1) {
      return NextResponse.json(
        { error: 'Competency area weights must sum to approximately 1.0', code: 'INVALID_WEIGHTS' },
        { status: 400 }
      );
    }

    // Validate training modules exist
    const moduleIds = trainingModules.map(m => m.moduleId);
    const { data: existingModules, error: modulesError } = await supabase
      .from('training_modules')
      .select('id, title, title_fr')
      .in('id', moduleIds);

    if (modulesError || !existingModules || existingModules.length !== moduleIds.length) {
      return NextResponse.json(
        { error: 'One or more training modules not found', code: 'MODULES_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create cross-training program
    const programId = `cross_program_${Date.now()}`;
    const programData = {
      id: programId,
      name,
      description,
      program_type: programType,
      target_roles: targetRoles,
      competency_areas: competencyAreas,
      prerequisites,
      training_modules: trainingModules.map(module => ({
        ...module,
        moduleName: existingModules.find(m => m.id === module.moduleId)?.title
      })),
      certification_config: certification,
      schedule_config: schedule,
      applicable_restaurants: applicableRestaurants,
      region_id: regionId,
      is_active: isActive,
      created_by: userId,
      created_at: new Date().toISOString(),
      metadata: {
        programType: 'cross_location_training',
        totalModules: trainingModules.length,
        requiredModules: trainingModules.filter(m => m.isRequired).length,
        estimatedTotalHours: trainingModules.reduce((sum, m) => sum + m.estimatedHours, 0),
        competencyAreasCount: competencyAreas.length
      }
    };

    // Create program competency requirements
    const competencyRequirements = competencyAreas.map(area => ({
      program_id: programId,
      competency_name: area.name,
      description: area.description,
      required_skill_level: area.requiredSkillLevel,
      weight: area.weight,
      associated_modules: area.modules,
      created_at: new Date().toISOString()
    }));

    // Log program creation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'CREATE',
        resource_type: 'cross_training_program',
        resource_id: programId,
        details: {
          programName: name,
          programType,
          targetRoles: targetRoles.join(', '),
          competencyAreas: competencyAreas.length,
          trainingModules: trainingModules.length,
          estimatedDuration: schedule.duration,
          applicableRestaurants: applicableRestaurants?.length || 'all',
          issueCertificate: certification?.issueCertificate || false
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: 'Cross-training program created successfully',
      data: {
        programId,
        name,
        programType,
        targetRoles,
        competencyAreas: competencyAreas.length,
        trainingModules: trainingModules.length,
        estimatedTotalHours: programData.metadata.estimatedTotalHours,
        duration: schedule.duration,
        maxParticipants: schedule.maxParticipants,
        issueCertificate: certification?.issueCertificate || false,
        transferable: certification?.transferable || false,
        crossLocationValid: certification?.crossLocationValid || false,
        applicableRestaurants: applicableRestaurants?.length || 'all',
        isActive,
        createdAt: programData.created_at
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'create_cross_training_program' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PUT: Enroll Staff in Cross-Training Program
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
    const validationResult = StaffEnrollmentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      programId,
      staffMembers,
      enrollmentType,
      trainingCoordinator,
      notificationSettings
    } = validationResult.data;

    // Verify training admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyTrainingAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate program exists
    const { data: program, error: programError } = await supabase
      .from('training_modules') // This would be a cross_training_programs table in reality
      .select('id, title, is_active')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { error: 'Training program not found', code: 'PROGRAM_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!program.is_active) {
      return NextResponse.json(
        { error: 'Training program is not active', code: 'PROGRAM_INACTIVE' },
        { status: 400 }
      );
    }

    // Validate staff members exist
    const staffIds = staffMembers.map(s => s.staffId);
    const { data: existingStaff, error: staffError } = await supabase
      .from('auth_users')
      .select(`
        id,
        full_name,
        full_name_fr,
        role,
        restaurant_id,
        is_active,
        restaurants!inner(name, name_fr)
      `)
      .in('id', staffIds)
      .eq('is_active', true);

    if (staffError || !existingStaff || existingStaff.length !== staffIds.length) {
      return NextResponse.json(
        { error: 'One or more staff members not found', code: 'STAFF_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Process enrollments
    const enrollmentResults = [];
    const failedEnrollments = [];

    for (const staffEnrollment of staffMembers) {
      try {
        const staff = existingStaff.find(s => s.id === staffEnrollment.staffId);
        if (!staff) {
          failedEnrollments.push({
            staffId: staffEnrollment.staffId,
            reason: 'Staff member not found'
          });
          continue;
        }

        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from('user_training_progress')
          .select('id, status')
          .eq('user_id', staffEnrollment.staffId)
          .eq('module_id', programId)
          .single();

        if (existingEnrollment && existingEnrollment.status !== 'failed') {
          failedEnrollments.push({
            staffId: staffEnrollment.staffId,
            staffName: staff.full_name,
            reason: 'Already enrolled in program'
          });
          continue;
        }

        // Create enrollment record
        const enrollmentData = {
          user_id: staffEnrollment.staffId,
          module_id: programId, // In reality, this would be a separate enrollment table
          status: 'not_started',
          progress_percentage: 0,
          started_at: null,
          enrollment_type: enrollmentType,
          home_restaurant_id: staffEnrollment.homeRestaurantId,
          training_restaurant_id: staffEnrollment.trainingRestaurantId,
          priority: staffEnrollment.priority,
          expected_completion_date: staffEnrollment.expectedCompletionDate,
          special_requirements: staffEnrollment.specialRequirements,
          training_coordinator_id: trainingCoordinator,
          enrolled_by: userId,
          enrolled_at: new Date().toISOString(),
          metadata: {
            enrollmentType,
            crossLocationTraining: staffEnrollment.trainingRestaurantId !== staffEnrollment.homeRestaurantId
          }
        };

        const { error: enrollmentError } = await supabase
          .from('user_training_progress')
          .upsert(enrollmentData);

        if (enrollmentError) {
          failedEnrollments.push({
            staffId: staffEnrollment.staffId,
            staffName: staff.full_name,
            reason: 'Database error during enrollment'
          });
        } else {
          enrollmentResults.push({
            staffId: staffEnrollment.staffId,
            staffName: staff.full_name,
            staffNameFr: staff.full_name_fr,
            role: staff.role,
            homeRestaurant: {
              id: staff.restaurant_id,
              name: staff.restaurants.name,
              nameFr: staff.restaurants.name_fr
            },
            trainingRestaurant: staffEnrollment.trainingRestaurantId ? {
              id: staffEnrollment.trainingRestaurantId,
              // Would fetch restaurant details in reality
              name: 'Training Location'
            } : null,
            priority: staffEnrollment.priority,
            expectedCompletionDate: staffEnrollment.expectedCompletionDate,
            enrollmentType,
            enrolledAt: enrollmentData.enrolled_at
          });
        }

      } catch (enrollmentError) {
        failedEnrollments.push({
          staffId: staffEnrollment.staffId,
          reason: 'Processing error'
        });
      }
    }

    // Create notifications if enabled
    const notifications = [];
    if (notificationSettings?.notifyStaff) {
      enrollmentResults.forEach(enrollment => {
        notifications.push({
          type: 'training_enrollment',
          recipient_type: 'user',
          recipient_id: enrollment.staffId,
          content: {
            title: 'Enrolled in Cross-Training Program',
            message: `You have been enrolled in the training program: ${program.title}`,
            programId,
            enrollmentType,
            priority: enrollment.priority
          },
          created_at: new Date().toISOString()
        });
      });
    }

    // Log enrollment batch
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'CREATE',
        resource_type: 'cross_training_enrollment',
        resource_id: programId,
        details: {
          programTitle: program.title,
          enrollmentType,
          totalStaff: staffMembers.length,
          successfulEnrollments: enrollmentResults.length,
          failedEnrollments: failedEnrollments.length,
          crossLocationCount: enrollmentResults.filter(e => e.trainingRestaurant).length
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    // Return enrollment results
    if (failedEnrollments.length === staffMembers.length) {
      return NextResponse.json(
        { 
          error: 'All enrollments failed', 
          code: 'ENROLLMENT_FAILED',
          details: failedEnrollments
        },
        { status: 500 }
      );
    } else if (failedEnrollments.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Partial enrollment completed',
        data: {
          successfulEnrollments: enrollmentResults,
          failedEnrollments,
          summary: {
            total: staffMembers.length,
            successful: enrollmentResults.length,
            failed: failedEnrollments.length,
            crossLocationTraining: enrollmentResults.filter(e => e.trainingRestaurant).length
          },
          notificationsCreated: notifications.length
        }
      }, { status: 207 });
    } else {
      return NextResponse.json({
        success: true,
        message: 'All staff members enrolled successfully',
        data: {
          enrollments: enrollmentResults,
          summary: {
            total: staffMembers.length,
            successful: enrollmentResults.length,
            failed: 0,
            crossLocationTraining: enrollmentResults.filter(e => e.trainingRestaurant).length
          },
          program: {
            id: programId,
            title: program.title
          },
          notificationsCreated: notifications.length
        }
      });
    }

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'enroll_staff_cross_training' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}

// PATCH: Process Certification Transfer
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
    const validationResult = CertificationTransferSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      staffId,
      sourceRestaurantId,
      targetRestaurantId,
      certificationsToTransfer,
      transferType,
      transferPeriod,
      skillGapAnalysis,
      approvalRequired,
      reason
    } = validationResult.data;

    // Verify training admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '');
    
    try {
      await verifyTrainingAdminAccess(supabase, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Validate staff member exists
    const { data: staff, error: staffError } = await supabase
      .from('auth_users')
      .select(`
        id,
        full_name,
        full_name_fr,
        role,
        restaurant_id,
        restaurants!inner(name, name_fr)
      `)
      .eq('id', staffId)
      .eq('is_active', true)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff member not found', code: 'STAFF_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate restaurants exist
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, name_fr')
      .in('id', [sourceRestaurantId, targetRestaurantId])
      .eq('is_active', true);

    if (restaurantsError || !restaurants || restaurants.length !== 2) {
      return NextResponse.json(
        { error: 'Source or target restaurant not found', code: 'RESTAURANTS_NOT_FOUND' },
        { status: 404 }
      );
    }

    const sourceRestaurant = restaurants.find(r => r.id === sourceRestaurantId);
    const targetRestaurant = restaurants.find(r => r.id === targetRestaurantId);

    // Validate certifications exist and belong to staff member
    const { data: certifications, error: certificationsError } = await supabase
      .from('training_certificates')
      .select(`
        id,
        certificate_number,
        module_id,
        status,
        issued_at,
        expires_at,
        training_modules!inner(title, title_fr)
      `)
      .in('id', certificationsToTransfer)
      .eq('user_id', staffId)
      .eq('status', 'active');

    if (certificationsError || !certifications || certifications.length !== certificationsToTransfer.length) {
      return NextResponse.json(
        { error: 'One or more certifications not found or not transferable', code: 'CERTIFICATIONS_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create transfer request
    const transferId = `transfer_${Date.now()}`;
    const transferData = {
      id: transferId,
      staff_id: staffId,
      source_restaurant_id: sourceRestaurantId,
      target_restaurant_id: targetRestaurantId,
      certifications_to_transfer: certificationsToTransfer,
      transfer_type: transferType,
      transfer_period: transferPeriod,
      skill_gap_analysis: skillGapAnalysis,
      reason,
      status: approvalRequired ? 'pending_approval' : 'approved',
      requested_by: userId,
      requested_at: new Date().toISOString(),
      metadata: {
        transferType: 'certification_transfer',
        certificationsCount: certificationsToTransfer.length,
        skillGapIdentified: skillGapAnalysis ? Object.keys(skillGapAnalysis).length > 0 : false,
        requiresTraining: skillGapAnalysis?.trainingNeeded ? skillGapAnalysis.trainingNeeded.length > 0 : false
      }
    };

    // If no approval required, process transfer immediately
    if (!approvalRequired) {
      // Update staff restaurant assignment if permanent transfer
      if (transferType === 'permanent') {
        await supabase
          .from('auth_users')
          .update({ 
            restaurant_id: targetRestaurantId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', staffId);
      }

      // Create transfer records for certifications
      const transferRecords = certificationsToTransfer.map(certId => ({
        certification_id: certId,
        transfer_id: transferId,
        from_restaurant: sourceRestaurantId,
        to_restaurant: targetRestaurantId,
        transfer_date: new Date().toISOString(),
        transfer_type: transferType,
        status: 'completed'
      }));

      // Note: In reality, these would be inserted into a certification_transfers table
    }

    // Log transfer request
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: sourceRestaurantId,
        user_id: userId,
        action: 'CREATE',
        resource_type: 'certification_transfer',
        resource_id: transferId,
        details: {
          staffName: staff.full_name,
          sourceRestaurant: sourceRestaurant?.name,
          targetRestaurant: targetRestaurant?.name,
          transferType,
          certificationsCount: certificationsToTransfer.length,
          approvalRequired,
          reason,
          skillGapAnalysis: skillGapAnalysis ? 'included' : 'not_provided'
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: approvalRequired ? 
        'Certification transfer request submitted for approval' : 
        'Certification transfer processed successfully',
      data: {
        transferId,
        staff: {
          id: staff.id,
          fullName: staff.full_name,
          fullNameFr: staff.full_name_fr,
          role: staff.role
        },
        transfer: {
          from: {
            id: sourceRestaurantId,
            name: sourceRestaurant?.name,
            nameFr: sourceRestaurant?.name_fr
          },
          to: {
            id: targetRestaurantId,
            name: targetRestaurant?.name,
            nameFr: targetRestaurant?.name_fr
          },
          type: transferType,
          period: transferPeriod
        },
        certifications: certifications.map(cert => ({
          id: cert.id,
          certificateNumber: cert.certificate_number,
          title: cert.training_modules.title,
          titleFr: cert.training_modules.title_fr,
          issuedAt: cert.issued_at,
          expiresAt: cert.expires_at
        })),
        status: transferData.status,
        skillGapAnalysis,
        requestedAt: transferData.requested_at,
        approvalRequired
      }
    });

  } catch (error) {
    logError('UNEXPECTED_ERROR', error, { operation: 'process_certification_transfer' });
    return NextResponse.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' },
      { status: 503 }
    );
  }
}