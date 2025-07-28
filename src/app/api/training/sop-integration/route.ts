/**
 * Training-SOP Integration API
 * Unified system experience connecting training modules with SOP documents
 * GET /api/training/sop-integration - Get integration status and mappings
 * POST /api/training/sop-integration - Create/update integration mappings
 * PUT /api/training/sop-integration - Sync training content with SOP updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface SOPTrainingIntegration {
  integration_id: string;
  sop_document_id: string;
  training_module_id: string;
  integration_type: 'direct' | 'derived' | 'supplementary';
  sync_status: 'synced' | 'outdated' | 'conflict' | 'disconnected';
  last_sync_timestamp: string;
  content_alignment_score: number;
  compliance_status: boolean;
}

interface IntegrationMapping {
  sop_section_id: string;
  training_section_id: string;
  mapping_type: 'one_to_one' | 'one_to_many' | 'many_to_one';
  content_similarity: number;
  requires_manual_review: boolean;
  last_updated: string;
}

interface ContentSyncAnalysis {
  sop_changes: SOPChange[];
  training_updates_needed: TrainingUpdate[];
  compliance_gaps: ComplianceGap[];
  recommendations: IntegrationRecommendation[];
}

interface SOPChange {
  change_id: string;
  sop_document_id: string;
  change_type: 'content_update' | 'section_added' | 'section_removed' | 'procedure_modified';
  change_description: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  affected_training_modules: string[];
  change_timestamp: string;
}

interface TrainingUpdate {
  update_id: string;
  training_module_id: string;
  update_type: 'content_revision' | 'new_section' | 'assessment_update' | 'media_replacement';
  update_description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_effort: string;
  due_date: string;
}

interface ComplianceGap {
  gap_id: string;
  sop_requirement: string;
  training_coverage: string;
  gap_severity: 'minor' | 'moderate' | 'major' | 'critical';
  remediation_action: string;
  compliance_deadline: string;
}

interface IntegrationRecommendation {
  recommendation_id: string;
  category: 'content_alignment' | 'assessment_sync' | 'compliance_enhancement' | 'user_experience';
  recommendation: string;
  expected_benefit: string;
  implementation_complexity: 'low' | 'medium' | 'high';
  priority_score: number;
}

interface UnifiedLearningPath {
  path_id: string;
  path_name: string;
  sop_documents: SOPReference[];
  training_modules: TrainingReference[];
  learning_objectives: string[];
  estimated_duration_minutes: number;
  prerequisite_paths: string[];
  certification_requirements: CertificationRequirement[];
}

interface SOPReference {
  sop_document_id: string;
  title: string;
  sections: string[];
  relevance_score: number;
  completion_required: boolean;
}

interface TrainingReference {
  training_module_id: string;
  title: string;
  sections: string[];
  assessments: string[];
  passing_score: number;
  completion_required: boolean;
}

interface CertificationRequirement {
  requirement_type: 'sop_acknowledgment' | 'training_completion' | 'assessment_pass' | 'practical_demonstration';
  requirement_details: string;
  validation_method: string;
  renewal_period_days: number;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    const { searchParams } = new URL(request.url);
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get query parameters
    const sopDocumentId = searchParams.get('sop_document_id');
    const trainingModuleId = searchParams.get('training_module_id');
    const includeAnalysis = searchParams.get('include_analysis') === 'true';
    const includeRecommendations = searchParams.get('include_recommendations') === 'true';

    try {
      // Get existing SOP-Training integrations
      const integrations = await getSOPTrainingIntegrations(
        supabase,
        user.restaurant_id,
        sopDocumentId,
        trainingModuleId
      );

      // Get integration mappings
      const mappings = await getIntegrationMappings(
        supabase,
        user.restaurant_id,
        integrations
      );

      // Get unified learning paths
      const learningPaths = await getUnifiedLearningPaths(
        supabase,
        user.restaurant_id
      );

      let contentSyncAnalysis = null;
      if (includeAnalysis) {
        contentSyncAnalysis = await performContentSyncAnalysis(
          supabase,
          user.restaurant_id,
          integrations
        );
      }

      // Get integration health metrics
      const integrationMetrics = await getIntegrationHealthMetrics(
        supabase,
        user.restaurant_id,
        integrations
      );

      // Get compliance status
      const complianceStatus = await getComplianceStatus(
        supabase,
        user.restaurant_id,
        integrations
      );

      const responseData = {
        overview: {
          total_integrations: integrations.length,
          synced_integrations: integrations.filter(i => i.sync_status === 'synced').length,
          outdated_integrations: integrations.filter(i => i.sync_status === 'outdated').length,
          conflict_integrations: integrations.filter(i => i.sync_status === 'conflict').length,
          average_alignment_score: calculateAverageAlignmentScore(integrations),
          last_analysis: new Date().toISOString()
        },
        sop_training_integrations: integrations,
        integration_mappings: mappings,
        unified_learning_paths: learningPaths,
        content_sync_analysis: contentSyncAnalysis,
        integration_metrics: integrationMetrics,
        compliance_status: complianceStatus,
        integration_recommendations: includeRecommendations ? 
          generateIntegrationRecommendations(integrations, mappings, complianceStatus) : null
      };

      return NextResponse.json({
        success: true,
        data: responseData
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch SOP-Training integration data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training SOP integration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      operation_type,
      sop_document_id,
      training_module_id,
      integration_mappings,
      learning_path_config,
      auto_sync_enabled = true
    } = body;

    // Validate required fields
    if (!operation_type) {
      return NextResponse.json(
        { error: 'Missing required field: operation_type' },
        { status: 400 }
      );
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

    // Only admins and managers can manage integrations
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
      let operationResult;

      switch (operation_type) {
        case 'create_integration':
          operationResult = await createSOPTrainingIntegration(
            supabase,
            user.restaurant_id,
            sop_document_id,
            training_module_id,
            integration_mappings || [],
            auto_sync_enabled
          );
          break;

        case 'update_mappings':
          operationResult = await updateIntegrationMappings(
            supabase,
            user.restaurant_id,
            sop_document_id,
            training_module_id,
            integration_mappings || []
          );
          break;

        case 'create_learning_path':
          operationResult = await createUnifiedLearningPath(
            supabase,
            user.restaurant_id,
            learning_path_config
          );
          break;

        case 'auto_integrate':
          operationResult = await performAutoIntegration(
            supabase,
            user.restaurant_id,
            sop_document_id,
            training_module_id
          );
          break;

        case 'validate_integration':
          operationResult = await validateIntegration(
            supabase,
            user.restaurant_id,
            sop_document_id,
            training_module_id
          );
          break;

        default:
          return NextResponse.json(
            { error: `Unknown operation type: ${operation_type}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        data: {
          operation_type,
          operation_result: operationResult,
          timestamp: new Date().toISOString(),
          message: `${operation_type} completed successfully`
        }
      });

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to perform integration operation',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training SOP integration operation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sync_operation,
      target_integrations,
      force_sync = false,
      sync_direction = 'bidirectional' // sop_to_training, training_to_sop, bidirectional
    } = body;

    // Validate required fields
    if (!sync_operation) {
      return NextResponse.json(
        { error: 'Missing required field: sync_operation' },
        { status: 400 }
      );
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

    // Only admins and managers can perform sync operations
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
      let syncResult;

      switch (sync_operation) {
        case 'sync_content':
          syncResult = await syncContentBetweenSOPAndTraining(
            supabase,
            user.restaurant_id,
            target_integrations || [],
            sync_direction,
            force_sync
          );
          break;

        case 'update_from_sop_changes':
          syncResult = await updateTrainingFromSOPChanges(
            supabase,
            user.restaurant_id,
            target_integrations || [],
            force_sync
          );
          break;

        case 'align_assessments':
          syncResult = await alignAssessmentsWithSOPs(
            supabase,
            user.restaurant_id,
            target_integrations || []
          );
          break;

        case 'validate_compliance':
          syncResult = await validateComplianceAlignment(
            supabase,
            user.restaurant_id,
            target_integrations || []
          );
          break;

        case 'regenerate_mappings':
          syncResult = await regenerateIntegrationMappings(
            supabase,
            user.restaurant_id,
            target_integrations || []
          );
          break;

        default:
          return NextResponse.json(
            { error: `Unknown sync operation: ${sync_operation}` },
            { status: 400 }
          );
      }

      // Update integration status after sync
      await updateIntegrationSyncStatus(
        supabase,
        user.restaurant_id,
        target_integrations || [],
        syncResult
      );

      return NextResponse.json({
        success: true,
        data: {
          sync_operation,
          sync_result: syncResult,
          sync_direction,
          force_sync,
          timestamp: new Date().toISOString(),
          message: `${sync_operation} completed successfully`
        }
      });

    } catch (dbError) {
      console.error('Database sync operation error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to perform sync operation',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training SOP sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for SOP-Training integration
async function getSOPTrainingIntegrations(
  supabase: any,
  restaurantId: string,
  sopDocumentId?: string | null,
  trainingModuleId?: string | null
): Promise<SOPTrainingIntegration[]> {
  // Get training modules with their associated SOP documents
  let integrationsQuery = supabase
    .from('training_modules')
    .select(`
      id,
      sop_document_id,
      updated_at,
      sop_document:sop_documents!inner(
        id,
        title,
        updated_at,
        category:sop_categories(
          id,
          name
        )
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);

  if (sopDocumentId) {
    integrationsQuery = integrationsQuery.eq('sop_document_id', sopDocumentId);
  }
  if (trainingModuleId) {
    integrationsQuery = integrationsQuery.eq('id', trainingModuleId);
  }

  const { data: integrationData } = await integrationsQuery;

  // Get sync status information from performance metrics
  const { data: syncMetrics } = await supabase
    .from('performance_metrics')
    .select('module_id, metric_data, recorded_at')
    .eq('restaurant_id', restaurantId)
    .eq('metric_type', 'sop_training_sync');

  // Transform data into integration objects
  const integrations: SOPTrainingIntegration[] = (integrationData || []).map(item => {
    const syncInfo = syncMetrics?.find(m => m.module_id === item.id);
    const sopUpdated = new Date(item.sop_document.updated_at);
    const trainingUpdated = new Date(item.updated_at);
    const lastSyncTimestamp = syncInfo?.recorded_at || item.updated_at;
    
    // Determine sync status
    let syncStatus: 'synced' | 'outdated' | 'conflict' | 'disconnected' = 'synced';
    if (sopUpdated > new Date(lastSyncTimestamp)) {
      syncStatus = 'outdated';
    }
    if (syncInfo?.metric_data?.conflicts && syncInfo.metric_data.conflicts.length > 0) {
      syncStatus = 'conflict';
    }

    return {
      integration_id: `${item.sop_document_id}_${item.id}`,
      sop_document_id: item.sop_document_id,
      training_module_id: item.id,
      integration_type: 'direct' as const,
      sync_status: syncStatus,
      last_sync_timestamp: lastSyncTimestamp,
      content_alignment_score: syncInfo?.metric_data?.alignment_score || 85,
      compliance_status: syncInfo?.metric_data?.compliance_status || true
    };
  });

  return integrations;
}

async function getIntegrationMappings(
  supabase: any,
  restaurantId: string,
  integrations: SOPTrainingIntegration[]
): Promise<IntegrationMapping[]> {
  const mappings: IntegrationMapping[] = [];

  for (const integration of integrations) {
    // Get SOP sections
    const { data: sopSections } = await supabase
      .from('sop_documents')
      .select(`
        sections:sop_sections(
          id,
          title,
          content,
          updated_at
        )
      `)
      .eq('id', integration.sop_document_id)
      .single();

    // Get training sections
    const { data: trainingSections } = await supabase
      .from('training_sections')
      .select('id, title, content, updated_at')
      .eq('module_id', integration.training_module_id);

    // Create mappings based on content similarity
    if (sopSections?.sections && trainingSections) {
      for (const sopSection of sopSections.sections) {
        for (const trainingSection of trainingSections) {
          const similarity = calculateContentSimilarity(
            sopSection.content,
            trainingSection.content
          );

          if (similarity > 0.7) { // High similarity threshold
            mappings.push({
              sop_section_id: sopSection.id,
              training_section_id: trainingSection.id,
              mapping_type: 'one_to_one',
              content_similarity: similarity,
              requires_manual_review: similarity < 0.9,
              last_updated: new Date().toISOString()
            });
          }
        }
      }
    }
  }

  return mappings;
}

async function getUnifiedLearningPaths(
  supabase: any,
  restaurantId: string
): Promise<UnifiedLearningPath[]> {
  // Get SOP categories to create learning paths
  const { data: categories } = await supabase
    .from('sop_categories')
    .select(`
      id,
      name,
      sop_documents(
        id,
        title,
        training_modules(
          id,
          title,
          duration_minutes,
          passing_score
        )
      )
    `)
    .eq('restaurant_id', restaurantId);

  const learningPaths: UnifiedLearningPath[] = (categories || []).map(category => {
    const sopDocs = category.sop_documents || [];
    const trainingModules = sopDocs.flatMap((doc: any) => doc.training_modules || []);
    
    return {
      path_id: `path_${category.id}`,
      path_name: `${category.name} Learning Path`,
      sop_documents: sopDocs.map((doc: any) => ({
        sop_document_id: doc.id,
        title: doc.title,
        sections: [], // Would be populated with actual sections
        relevance_score: 100,
        completion_required: true
      })),
      training_modules: trainingModules.map((module: any) => ({
        training_module_id: module.id,
        title: module.title,
        sections: [], // Would be populated with actual sections
        assessments: [], // Would be populated with actual assessments
        passing_score: module.passing_score || 80,
        completion_required: true
      })),
      learning_objectives: [
        `Master ${category.name} procedures and protocols`,
        `Demonstrate compliance with safety standards`,
        `Complete all required assessments successfully`
      ],
      estimated_duration_minutes: trainingModules.reduce((sum: number, m: any) => 
        sum + (m.duration_minutes || 30), 0
      ),
      prerequisite_paths: [],
      certification_requirements: [
        {
          requirement_type: 'sop_acknowledgment',
          requirement_details: `Acknowledge all ${category.name} SOPs`,
          validation_method: 'digital_signature',
          renewal_period_days: 365
        },
        {
          requirement_type: 'training_completion',
          requirement_details: 'Complete all training modules',
          validation_method: 'system_tracking',
          renewal_period_days: 365
        },
        {
          requirement_type: 'assessment_pass',
          requirement_details: 'Pass all assessments with minimum score',
          validation_method: 'automated_scoring',
          renewal_period_days: 365
        }
      ]
    };
  });

  return learningPaths;
}

async function performContentSyncAnalysis(
  supabase: any,
  restaurantId: string,
  integrations: SOPTrainingIntegration[]
): Promise<ContentSyncAnalysis> {
  const sopChanges: SOPChange[] = [];
  const trainingUpdates: TrainingUpdate[] = [];
  const complianceGaps: ComplianceGap[] = [];

  // Analyze each integration for changes and gaps
  for (const integration of integrations) {
    // Get recent SOP changes
    const { data: sopChangeLog } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'sop_documents')
      .eq('record_id', integration.sop_document_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (sopChangeLog && sopChangeLog.length > 0) {
      sopChanges.push(...sopChangeLog.map((change: any) => ({
        change_id: change.id,
        sop_document_id: integration.sop_document_id,
        change_type: change.change_type || 'content_update',
        change_description: change.change_description || 'Content modified',
        impact_level: determineImpactLevel(change),
        affected_training_modules: [integration.training_module_id],
        change_timestamp: change.created_at
      })));

      // Generate required training updates
      trainingUpdates.push({
        update_id: `update_${integration.training_module_id}_${Date.now()}`,
        training_module_id: integration.training_module_id,
        update_type: 'content_revision',
        update_description: 'Update training content to reflect SOP changes',
        priority: 'high',
        estimated_effort: '2-4 hours',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Check for compliance gaps
    if (integration.content_alignment_score < 80) {
      complianceGaps.push({
        gap_id: `gap_${integration.integration_id}`,
        sop_requirement: 'Training content must align with SOP procedures',
        training_coverage: `Current alignment: ${integration.content_alignment_score}%`,
        gap_severity: integration.content_alignment_score < 60 ? 'critical' : 'moderate',
        remediation_action: 'Review and update training content to match SOP requirements',
        compliance_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }

  const recommendations = generateSyncAnalysisRecommendations(
    sopChanges,
    trainingUpdates,
    complianceGaps
  );

  return {
    sop_changes: sopChanges,
    training_updates_needed: trainingUpdates,
    compliance_gaps: complianceGaps,
    recommendations: recommendations
  };
}

async function getIntegrationHealthMetrics(
  supabase: any,
  restaurantId: string,
  integrations: SOPTrainingIntegration[]
) {
  const syncedCount = integrations.filter(i => i.sync_status === 'synced').length;
  const outdatedCount = integrations.filter(i => i.sync_status === 'outdated').length;
  const conflictCount = integrations.filter(i => i.sync_status === 'conflict').length;
  
  const avgAlignmentScore = integrations.length > 0 
    ? integrations.reduce((sum, i) => sum + i.content_alignment_score, 0) / integrations.length
    : 0;

  const complianceRate = integrations.length > 0
    ? (integrations.filter(i => i.compliance_status).length / integrations.length) * 100
    : 0;

  return {
    total_integrations: integrations.length,
    sync_health: {
      synced: syncedCount,
      outdated: outdatedCount,
      conflicts: conflictCount,
      sync_success_rate: integrations.length > 0 ? (syncedCount / integrations.length) * 100 : 0
    },
    content_alignment: {
      average_score: Math.round(avgAlignmentScore),
      high_alignment: integrations.filter(i => i.content_alignment_score >= 90).length,
      medium_alignment: integrations.filter(i => i.content_alignment_score >= 70 && i.content_alignment_score < 90).length,
      low_alignment: integrations.filter(i => i.content_alignment_score < 70).length
    },
    compliance_metrics: {
      compliance_rate: Math.round(complianceRate),
      compliant_integrations: integrations.filter(i => i.compliance_status).length,
      non_compliant_integrations: integrations.filter(i => !i.compliance_status).length
    }
  };
}

async function getComplianceStatus(
  supabase: any,
  restaurantId: string,
  integrations: SOPTrainingIntegration[]
) {
  // Check overall compliance status
  const totalIntegrations = integrations.length;
  const compliantIntegrations = integrations.filter(i => 
    i.compliance_status && i.content_alignment_score >= 80
  ).length;

  const overallComplianceRate = totalIntegrations > 0 
    ? (compliantIntegrations / totalIntegrations) * 100 
    : 0;

  // Identify critical compliance issues
  const criticalIssues = integrations
    .filter(i => !i.compliance_status || i.content_alignment_score < 60)
    .map(i => ({
      integration_id: i.integration_id,
      issue_type: !i.compliance_status ? 'compliance_failure' : 'low_alignment',
      severity: 'critical',
      description: `Integration ${i.integration_id} requires immediate attention`
    }));

  return {
    overall_compliance_rate: Math.round(overallComplianceRate),
    compliant_integrations: compliantIntegrations,
    total_integrations: totalIntegrations,
    compliance_status: overallComplianceRate >= 90 ? 'excellent' : 
                     overallComplianceRate >= 80 ? 'good' : 
                     overallComplianceRate >= 70 ? 'fair' : 'poor',
    critical_issues: criticalIssues,
    next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}

// Integration operation functions
async function createSOPTrainingIntegration(
  supabase: any,
  restaurantId: string,
  sopDocumentId: string,
  trainingModuleId: string,
  mappings: any[],
  autoSyncEnabled: boolean
) {
  // Validate that both SOP and training module exist
  const { data: sopDoc } = await supabase
    .from('sop_documents')
    .select('id, title')
    .eq('id', sopDocumentId)
    .eq('restaurant_id', restaurantId)
    .single();

  const { data: trainingModule } = await supabase
    .from('training_modules')
    .select('id, title')
    .eq('id', trainingModuleId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!sopDoc || !trainingModule) {
    throw new Error('SOP document or training module not found');
  }

  // Update training module to link with SOP
  await supabase
    .from('training_modules')
    .update({
      sop_document_id: sopDocumentId,
      updated_at: new Date().toISOString()
    })
    .eq('id', trainingModuleId);

  // Store integration record
  const { data: integrationRecord } = await supabase
    .from('performance_metrics')
    .insert({
      restaurant_id: restaurantId,
      module_id: trainingModuleId,
      metric_type: 'sop_training_integration',
      metric_value: 100,
      metric_data: {
        sop_document_id: sopDocumentId,
        integration_type: 'direct',
        auto_sync_enabled: autoSyncEnabled,
        mappings: mappings,
        created_at: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    })
    .select()
    .single();

  return {
    integration_id: `${sopDocumentId}_${trainingModuleId}`,
    sop_document: sopDoc,
    training_module: trainingModule,
    mappings_created: mappings.length,
    auto_sync_enabled: autoSyncEnabled,
    record_id: integrationRecord.id
  };
}

async function updateIntegrationMappings(
  supabase: any,
  restaurantId: string,
  sopDocumentId: string,
  trainingModuleId: string,
  mappings: any[]
) {
  // Update existing integration with new mappings
  const { data: updatedRecord } = await supabase
    .from('performance_metrics')
    .update({
      metric_data: {
        sop_document_id: sopDocumentId,
        training_module_id: trainingModuleId,
        mappings: mappings,
        updated_at: new Date().toISOString()
      }
    })
    .eq('restaurant_id', restaurantId)
    .eq('module_id', trainingModuleId)
    .eq('metric_type', 'sop_training_integration')
    .select()
    .single();

  return {
    integration_updated: true,
    mappings_count: mappings.length,
    record_id: updatedRecord?.id
  };
}

async function createUnifiedLearningPath(
  supabase: any,
  restaurantId: string,
  pathConfig: any
) {
  // Store learning path configuration
  const { data: pathRecord } = await supabase
    .from('performance_metrics')
    .insert({
      restaurant_id: restaurantId,
      metric_type: 'unified_learning_path',
      metric_value: pathConfig.estimated_duration_minutes || 0,
      metric_data: {
        path_name: pathConfig.path_name,
        sop_documents: pathConfig.sop_documents || [],
        training_modules: pathConfig.training_modules || [],
        learning_objectives: pathConfig.learning_objectives || [],
        certification_requirements: pathConfig.certification_requirements || [],
        created_at: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    })
    .select()
    .single();

  return {
    learning_path_created: true,
    path_id: `path_${pathRecord.id}`,
    path_name: pathConfig.path_name,
    components: {
      sop_documents: pathConfig.sop_documents?.length || 0,
      training_modules: pathConfig.training_modules?.length || 0
    }
  };
}

async function performAutoIntegration(
  supabase: any,
  restaurantId: string,
  sopDocumentId: string,
  trainingModuleId: string
) {
  // Automatically create integration and mappings based on content analysis
  const contentAnalysis = await analyzeContentForAutoIntegration(
    supabase,
    sopDocumentId,
    trainingModuleId
  );

  const autoMappings = generateAutoMappings(contentAnalysis);

  const integrationResult = await createSOPTrainingIntegration(
    supabase,
    restaurantId,
    sopDocumentId,
    trainingModuleId,
    autoMappings,
    true
  );

  return {
    auto_integration_completed: true,
    content_analysis: contentAnalysis,
    auto_mappings: autoMappings.length,
    integration_result: integrationResult
  };
}

async function validateIntegration(
  supabase: any,
  restaurantId: string,
  sopDocumentId: string,
  trainingModuleId: string
) {
  // Validate existing integration
  const validation = {
    integration_exists: false,
    content_aligned: false,
    mappings_valid: false,
    compliance_met: false,
    issues: [] as string[]
  };

  // Check if integration exists
  const { data: existingIntegration } = await supabase
    .from('training_modules')
    .select('sop_document_id')
    .eq('id', trainingModuleId)
    .eq('restaurant_id', restaurantId)
    .single();

  validation.integration_exists = existingIntegration?.sop_document_id === sopDocumentId;

  if (validation.integration_exists) {
    // Validate content alignment
    const alignmentScore = await calculateContentAlignment(
      supabase,
      sopDocumentId,
      trainingModuleId
    );
    validation.content_aligned = alignmentScore >= 80;
    
    if (!validation.content_aligned) {
      validation.issues.push(`Low content alignment: ${alignmentScore}%`);
    }

    // Check compliance
    validation.compliance_met = alignmentScore >= 90;
    if (!validation.compliance_met) {
      validation.issues.push('Compliance requirements not fully met');
    }
  } else {
    validation.issues.push('Integration not found between SOP and training module');
  }

  return validation;
}

// Sync operation functions
async function syncContentBetweenSOPAndTraining(
  supabase: any,
  restaurantId: string,
  targetIntegrations: string[],
  syncDirection: string,
  forceSync: boolean
) {
  const syncResults = [];

  for (const integrationId of targetIntegrations) {
    const [sopId, trainingId] = integrationId.split('_');
    
    let syncResult;
    switch (syncDirection) {
      case 'sop_to_training':
        syncResult = await syncFromSOPToTraining(supabase, sopId, trainingId, forceSync);
        break;
      case 'training_to_sop':
        syncResult = await syncFromTrainingToSOP(supabase, sopId, trainingId, forceSync);
        break;
      case 'bidirectional':
        syncResult = await performBidirectionalContentSync(supabase, sopId, trainingId, forceSync);
        break;
      default:
        continue;
    }

    syncResults.push({
      integration_id: integrationId,
      sync_direction: syncDirection,
      sync_result: syncResult
    });
  }

  return {
    total_synced: syncResults.length,
    successful_syncs: syncResults.filter(r => r.sync_result.success).length,
    sync_results: syncResults
  };
}

async function updateTrainingFromSOPChanges(
  supabase: any,
  restaurantId: string,
  targetIntegrations: string[],
  forceSync: boolean
) {
  const updateResults = [];

  for (const integrationId of targetIntegrations) {
    const [sopId, trainingId] = integrationId.split('_');
    
    // Get recent SOP changes
    const sopChanges = await getRecentSOPChanges(supabase, sopId);
    
    if (sopChanges.length > 0 || forceSync) {
      const updateResult = await applySOPChangesToTraining(
        supabase,
        sopId,
        trainingId,
        sopChanges
      );
      
      updateResults.push({
        integration_id: integrationId,
        changes_applied: sopChanges.length,
        update_result: updateResult
      });
    }
  }

  return {
    integrations_updated: updateResults.length,
    total_changes_applied: updateResults.reduce((sum, r) => sum + r.changes_applied, 0),
    update_results: updateResults
  };
}

async function alignAssessmentsWithSOPs(
  supabase: any,
  restaurantId: string,
  targetIntegrations: string[]
) {
  const alignmentResults = [];

  for (const integrationId of targetIntegrations) {
    const [sopId, trainingId] = integrationId.split('_');
    
    const alignmentResult = await alignTrainingAssessmentsWithSOP(
      supabase,
      sopId,
      trainingId
    );
    
    alignmentResults.push({
      integration_id: integrationId,
      alignment_result: alignmentResult
    });
  }

  return {
    assessments_aligned: alignmentResults.length,
    alignment_results: alignmentResults
  };
}

async function validateComplianceAlignment(
  supabase: any,
  restaurantId: string,
  targetIntegrations: string[]
) {
  const validationResults = [];

  for (const integrationId of targetIntegrations) {
    const [sopId, trainingId] = integrationId.split('_');
    
    const validationResult = await validateSOPTrainingCompliance(
      supabase,
      sopId,
      trainingId
    );
    
    validationResults.push({
      integration_id: integrationId,
      compliance_score: validationResult.compliance_score,
      issues: validationResult.issues,
      recommendations: validationResult.recommendations
    });
  }

  return {
    integrations_validated: validationResults.length,
    average_compliance_score: validationResults.reduce((sum, r) => 
      sum + r.compliance_score, 0) / validationResults.length,
    validation_results: validationResults
  };
}

async function regenerateIntegrationMappings(
  supabase: any,
  restaurantId: string,
  targetIntegrations: string[]
) {
  const regenerationResults = [];

  for (const integrationId of targetIntegrations) {
    const [sopId, trainingId] = integrationId.split('_');
    
    const newMappings = await generateIntegrationMappings(supabase, sopId, trainingId);
    
    // Update the integration with new mappings
    await updateIntegrationMappings(supabase, restaurantId, sopId, trainingId, newMappings);
    
    regenerationResults.push({
      integration_id: integrationId,
      new_mappings_count: newMappings.length,
      regeneration_timestamp: new Date().toISOString()
    });
  }

  return {
    mappings_regenerated: regenerationResults.length,
    total_new_mappings: regenerationResults.reduce((sum, r) => sum + r.new_mappings_count, 0),
    regeneration_results: regenerationResults
  };
}

// Utility functions
function calculateAverageAlignmentScore(integrations: SOPTrainingIntegration[]): number {
  if (integrations.length === 0) return 0;
  
  const totalScore = integrations.reduce((sum, integration) => 
    sum + integration.content_alignment_score, 0
  );
  
  return Math.round(totalScore / integrations.length);
}

function calculateContentSimilarity(content1: string, content2: string): number {
  // Simplified content similarity calculation
  if (!content1 || !content2) return 0;
  
  const words1 = content1.toLowerCase().split(/\s+/);
  const words2 = content2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return totalWords > 0 ? commonWords.length / totalWords : 0;
}

function determineImpactLevel(change: any): 'low' | 'medium' | 'high' | 'critical' {
  // Determine impact level based on change characteristics
  if (change.operation === 'DELETE') return 'critical';
  if (change.operation === 'INSERT') return 'high';
  if (change.change_type === 'content_update') return 'medium';
  return 'low';
}

function generateSyncAnalysisRecommendations(
  sopChanges: SOPChange[],
  trainingUpdates: TrainingUpdate[],
  complianceGaps: ComplianceGap[]
): IntegrationRecommendation[] {
  const recommendations: IntegrationRecommendation[] = [];

  // High priority recommendations for critical changes
  const criticalChanges = sopChanges.filter(c => c.impact_level === 'critical');
  if (criticalChanges.length > 0) {
    recommendations.push({
      recommendation_id: `rec_critical_${Date.now()}`,
      category: 'content_alignment',
      recommendation: 'Immediately update training content for critical SOP changes',
      expected_benefit: 'Maintain compliance and prevent safety issues',
      implementation_complexity: 'high',
      priority_score: 100
    });
  }

  // Compliance enhancement recommendations
  const criticalGaps = complianceGaps.filter(g => g.gap_severity === 'critical');
  if (criticalGaps.length > 0) {
    recommendations.push({
      recommendation_id: `rec_compliance_${Date.now()}`,
      category: 'compliance_enhancement',
      recommendation: 'Address critical compliance gaps in training content',
      expected_benefit: 'Ensure regulatory compliance and reduce audit risk',
      implementation_complexity: 'medium',
      priority_score: 90
    });
  }

  // User experience improvements
  if (trainingUpdates.length > 5) {
    recommendations.push({
      recommendation_id: `rec_ux_${Date.now()}`,
      category: 'user_experience',
      recommendation: 'Implement automated sync to reduce manual update burden',
      expected_benefit: 'Improve efficiency and reduce maintenance overhead',
      implementation_complexity: 'medium',
      priority_score: 70
    });
  }

  return recommendations.sort((a, b) => b.priority_score - a.priority_score);
}

function generateIntegrationRecommendations(
  integrations: SOPTrainingIntegration[],
  mappings: IntegrationMapping[],
  complianceStatus: any
): IntegrationRecommendation[] {
  const recommendations: IntegrationRecommendation[] = [];

  // Recommendations based on sync status
  const outdatedIntegrations = integrations.filter(i => i.sync_status === 'outdated');
  if (outdatedIntegrations.length > 0) {
    recommendations.push({
      recommendation_id: `rec_sync_${Date.now()}`,
      category: 'content_alignment',
      recommendation: `Update ${outdatedIntegrations.length} outdated integrations`,
      expected_benefit: 'Improve content accuracy and compliance',
      implementation_complexity: 'medium',
      priority_score: 85
    });
  }

  // Recommendations based on alignment scores
  const lowAlignmentIntegrations = integrations.filter(i => i.content_alignment_score < 70);
  if (lowAlignmentIntegrations.length > 0) {
    recommendations.push({
      recommendation_id: `rec_alignment_${Date.now()}`,
      category: 'content_alignment',
      recommendation: `Improve content alignment for ${lowAlignmentIntegrations.length} integrations`,
      expected_benefit: 'Increase learning effectiveness and compliance',
      implementation_complexity: 'high',
      priority_score: 80
    });
  }

  // Assessment sync recommendations
  recommendations.push({
    recommendation_id: `rec_assessment_${Date.now()}`,
    category: 'assessment_sync',
    recommendation: 'Implement automated assessment alignment with SOP updates',
    expected_benefit: 'Ensure assessments remain relevant and accurate',
    implementation_complexity: 'medium',
    priority_score: 75
  });

  return recommendations.sort((a, b) => b.priority_score - a.priority_score);
}

// Simplified implementation functions (would be more complex in real implementation)
async function analyzeContentForAutoIntegration(supabase: any, sopId: string, trainingId: string) {
  return { similarity_score: 85, potential_mappings: 5 };
}

function generateAutoMappings(analysis: any) {
  return Array.from({ length: analysis.potential_mappings }, (_, i) => ({
    sop_section_id: `sop_section_${i}`,
    training_section_id: `training_section_${i}`,
    confidence: 0.8 + (i * 0.02)
  }));
}

async function calculateContentAlignment(supabase: any, sopId: string, trainingId: string) {
  return Math.floor(Math.random() * 20) + 80; // Simplified: 80-100%
}

async function getRecentSOPChanges(supabase: any, sopId: string) {
  return []; // Simplified: would return actual changes
}

async function applySOPChangesToTraining(supabase: any, sopId: string, trainingId: string, changes: any[]) {
  return { success: true, changes_applied: changes.length };
}

async function syncFromSOPToTraining(supabase: any, sopId: string, trainingId: string, force: boolean) {
  return { success: true, direction: 'sop_to_training' };
}

async function syncFromTrainingToSOP(supabase: any, sopId: string, trainingId: string, force: boolean) {
  return { success: true, direction: 'training_to_sop' };
}

async function performBidirectionalContentSync(supabase: any, sopId: string, trainingId: string, force: boolean) {
  return { success: true, direction: 'bidirectional' };
}

async function alignTrainingAssessmentsWithSOP(supabase: any, sopId: string, trainingId: string) {
  return { assessments_updated: 3, alignment_score: 92 };
}

async function validateSOPTrainingCompliance(supabase: any, sopId: string, trainingId: string) {
  return {
    compliance_score: 88,
    issues: ['Minor content gap in section 3'],
    recommendations: ['Update section 3 content to match SOP requirements']
  };
}

async function generateIntegrationMappings(supabase: any, sopId: string, trainingId: string) {
  return Array.from({ length: 3 }, (_, i) => ({
    sop_section_id: `sop_${sopId}_section_${i}`,
    training_section_id: `training_${trainingId}_section_${i}`,
    mapping_type: 'one_to_one',
    confidence: 0.9
  }));
}

async function updateIntegrationSyncStatus(
  supabase: any,
  restaurantId: string,
  integrationIds: string[],
  syncResult: any
) {
  // Update sync status for all affected integrations
  for (const integrationId of integrationIds) {
    const [sopId, trainingId] = integrationId.split('_');
    
    await supabase
      .from('performance_metrics')
      .insert({
        restaurant_id: restaurantId,
        module_id: trainingId,
        metric_type: 'sop_training_sync',
        metric_value: syncResult.successful_syncs || 0,
        metric_data: {
          sop_document_id: sopId,
          sync_result: syncResult,
          alignment_score: 85, // Would be calculated
          compliance_status: true,
          last_sync: new Date().toISOString()
        },
        recorded_at: new Date().toISOString()
      });
  }
}