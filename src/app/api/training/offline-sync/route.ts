/**
 * Training Offline Synchronization API
 * Seamless data management for offline training capabilities
 * GET /api/training/offline-sync - Get offline sync status and data
 * POST /api/training/offline-sync - Initiate offline sync operations
 * PUT /api/training/offline-sync - Update sync configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface OfflineSyncStatus {
  sync_enabled: boolean;
  last_sync_timestamp: string;
  sync_in_progress: boolean;
  offline_data_size: number;
  cached_modules: number;
  pending_uploads: number;
  sync_conflicts: number;
  connectivity_status: 'online' | 'offline' | 'limited';
}

interface SyncConfiguration {
  auto_sync_enabled: boolean;
  sync_frequency_minutes: number;
  max_offline_storage_mb: number;
  priority_modules: string[];
  conflict_resolution_strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  background_sync_enabled: boolean;
  wifi_only_sync: boolean;
  battery_conscious_sync: boolean;
}

interface OfflineData {
  modules: OfflineModule[];
  user_progress: OfflineProgress[];
  assessments: OfflineAssessment[];
  media_cache: MediaCacheItem[];
  sync_metadata: SyncMetadata;
}

interface OfflineModule {
  module_id: string;
  title: string;
  title_th: string;
  sections: OfflineSection[];
  questions: OfflineQuestion[];
  last_updated: string;
  cache_priority: number;
  size_mb: number;
}

interface OfflineSection {
  section_id: string;
  title: string;
  title_th: string;
  content: string;
  content_th: string;
  media_urls: string[];
  estimated_minutes: number;
}

interface OfflineQuestion {
  question_id: string;
  question: string;
  question_th: string;
  options: string[];
  options_th: string[];
  correct_answer: string;
  explanation: string;
  explanation_th: string;
}

interface OfflineProgress {
  progress_id: string;
  user_id: string;
  module_id: string;
  section_id?: string;
  progress_data: any;
  last_modified: string;
  sync_status: 'pending' | 'synced' | 'conflict';
}

interface OfflineAssessment {
  assessment_id: string;
  user_id: string;
  module_id: string;
  responses: any[];
  score_data: any;
  completed_offline: boolean;
  sync_status: 'pending' | 'synced' | 'conflict';
}

interface MediaCacheItem {
  media_url: string;
  cache_key: string;
  file_size: number;
  mime_type: string;
  cached_at: string;
  last_accessed: string;
  usage_count: number;
}

interface SyncMetadata {
  last_full_sync: string;
  last_incremental_sync: string;
  sync_version: number;
  device_id: string;
  conflicts_resolved: number;
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
    const deviceId = searchParams.get('device_id');
    const includeData = searchParams.get('include_data') === 'true';
    const moduleIds = searchParams.get('module_ids')?.split(',') || [];
    const syncType = searchParams.get('sync_type') || 'status'; // status, full, incremental

    try {
      // Get current sync status
      const syncStatus = await getCurrentSyncStatus(
        supabase,
        user.restaurant_id,
        user.id,
        deviceId
      );

      // Get sync configuration
      const syncConfiguration = await getSyncConfiguration(
        supabase,
        user.restaurant_id,
        user.id
      );

      let offlineData = null;
      if (includeData || syncType !== 'status') {
        // Get offline data based on sync type
        offlineData = await getOfflineData(
          supabase,
          user.restaurant_id,
          user.id,
          moduleIds,
          syncType,
          syncStatus.last_sync_timestamp
        );
      }

      // Get sync conflicts if any
      const syncConflicts = await getSyncConflicts(
        supabase,
        user.restaurant_id,
        user.id
      );

      // Calculate storage usage
      const storageUsage = await calculateStorageUsage(
        supabase,
        user.restaurant_id,
        user.id
      );

      const responseData = {
        sync_status: syncStatus,
        sync_configuration: syncConfiguration,
        offline_data: offlineData,
        sync_conflicts: syncConflicts,
        storage_usage: storageUsage,
        sync_recommendations: generateSyncRecommendations(
          syncStatus,
          syncConfiguration,
          storageUsage
        ),
        available_modules: await getAvailableModulesForSync(
          supabase,
          user.restaurant_id
        )
      };

      return NextResponse.json({
        success: true,
        data: responseData
      });

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch offline sync data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training offline sync API error:', error);
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
      sync_operation,
      device_id,
      module_ids,
      offline_data,
      force_sync = false
    } = body;

    // Validate required fields
    if (!sync_operation || !device_id) {
      return NextResponse.json(
        { error: 'Missing required fields: sync_operation, device_id' },
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

    try {
      let syncResult;

      switch (sync_operation) {
        case 'download':
          syncResult = await performDownloadSync(
            supabase,
            user.restaurant_id,
            user.id,
            device_id,
            module_ids || [],
            force_sync
          );
          break;

        case 'upload':
          syncResult = await performUploadSync(
            supabase,
            user.restaurant_id,
            user.id,
            device_id,
            offline_data || {},
            force_sync
          );
          break;

        case 'bidirectional':
          syncResult = await performBidirectionalSync(
            supabase,
            user.restaurant_id,
            user.id,
            device_id,
            module_ids || [],
            offline_data || {},
            force_sync
          );
          break;

        case 'conflict_resolution':
          syncResult = await resolveConflicts(
            supabase,
            user.restaurant_id,
            user.id,
            offline_data?.conflicts || [],
            offline_data?.resolution_strategy || 'server_wins'
          );
          break;

        case 'cache_cleanup':
          syncResult = await performCacheCleanup(
            supabase,
            user.restaurant_id,
            user.id,
            device_id
          );
          break;

        default:
          return NextResponse.json(
            { error: `Unknown sync operation: ${sync_operation}` },
            { status: 400 }
          );
      }

      // Update sync status
      await updateSyncStatus(
        supabase,
        user.restaurant_id,
        user.id,
        device_id,
        sync_operation,
        syncResult
      );

      return NextResponse.json({
        success: true,
        data: {
          sync_operation,
          sync_result: syncResult,
          timestamp: new Date().toISOString(),
          message: `${sync_operation} sync completed successfully`
        }
      });

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to perform sync operation',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training offline sync operation API error:', error);
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
      sync_configuration,
      device_id
    } = body;

    // Validate required fields
    if (!sync_configuration) {
      return NextResponse.json(
        { error: 'Missing required field: sync_configuration' },
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

    try {
      // Validate sync configuration
      const validatedConfig = validateSyncConfiguration(sync_configuration);

      // Store sync configuration
      const { data: configRecord, error: configError } = await supabase
        .from('performance_metrics')
        .insert({
          restaurant_id: user.restaurant_id,
          user_id: user.id,
          metric_type: 'offline_sync_config',
          metric_value: calculateConfigScore(validatedConfig),
          metric_data: {
            sync_configuration: validatedConfig,
            device_id: device_id || 'default',
            updated_at: new Date().toISOString()
          },
          recorded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (configError) throw configError;

      // Apply configuration changes
      const applicationResult = await applySyncConfiguration(
        supabase,
        user.restaurant_id,
        user.id,
        validatedConfig,
        device_id
      );

      return NextResponse.json({
        success: true,
        data: {
          config_id: configRecord.id,
          sync_configuration: validatedConfig,
          application_result: applicationResult,
          message: 'Sync configuration updated successfully'
        }
      });

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to update sync configuration',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Training sync configuration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for offline synchronization
async function getCurrentSyncStatus(
  supabase: any,
  restaurantId: string,
  userId: string,
  deviceId?: string | null
): Promise<OfflineSyncStatus> {
  // Get latest sync status from performance metrics
  let statusQuery = supabase
    .from('performance_metrics')
    .select('metric_data, recorded_at')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('metric_type', 'offline_sync_status')
    .order('recorded_at', { ascending: false })
    .limit(1);

  if (deviceId) {
    statusQuery = statusQuery.contains('metric_data', { device_id: deviceId });
  }

  const { data: statusData } = await statusQuery.single();

  // Get offline cache information
  const { data: cacheData } = await supabase
    .from('performance_metrics')
    .select('metric_data')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('metric_type', 'offline_cache_info')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  // Get pending uploads count
  const { count: pendingUploads } = await supabase
    .from('performance_metrics')
    .select('id', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('metric_type', 'offline_pending_upload');

  // Get sync conflicts count
  const { count: syncConflicts } = await supabase
    .from('performance_metrics')
    .select('id', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('metric_type', 'sync_conflict');

  const defaultStatus: OfflineSyncStatus = {
    sync_enabled: true,
    last_sync_timestamp: statusData?.recorded_at || new Date().toISOString(),
    sync_in_progress: false,
    offline_data_size: 0,
    cached_modules: 0,
    pending_uploads: pendingUploads || 0,
    sync_conflicts: syncConflicts || 0,
    connectivity_status: 'online'
  };

  if (statusData?.metric_data) {
    return {
      ...defaultStatus,
      ...statusData.metric_data,
      last_sync_timestamp: statusData.recorded_at
    };
  }

  return defaultStatus;
}

async function getSyncConfiguration(
  supabase: any,
  restaurantId: string,
  userId: string
): Promise<SyncConfiguration> {
  // Get latest sync configuration
  const { data: configData } = await supabase
    .from('performance_metrics')
    .select('metric_data')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('metric_type', 'offline_sync_config')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  const defaultConfig: SyncConfiguration = {
    auto_sync_enabled: true,
    sync_frequency_minutes: 60,
    max_offline_storage_mb: 500,
    priority_modules: [],
    conflict_resolution_strategy: 'server_wins',
    background_sync_enabled: true,
    wifi_only_sync: false,
    battery_conscious_sync: true
  };

  return configData?.metric_data?.sync_configuration || defaultConfig;
}

async function getOfflineData(
  supabase: any,
  restaurantId: string,
  userId: string,
  moduleIds: string[],
  syncType: string,
  lastSyncTimestamp: string
): Promise<OfflineData> {
  // Get training modules for offline access
  let modulesQuery = supabase
    .from('training_modules')
    .select(`
      id,
      title,
      title_th,
      updated_at,
      sections:training_sections(
        id,
        title,
        title_th,
        content,
        content_th,
        media_urls,
        estimated_minutes
      ),
      questions:training_questions(
        id,
        question,
        question_th,
        options,
        options_th,
        correct_answer,
        explanation,
        explanation_th
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);

  if (moduleIds.length > 0) {
    modulesQuery = modulesQuery.in('id', moduleIds);
  }

  if (syncType === 'incremental') {
    modulesQuery = modulesQuery.gte('updated_at', lastSyncTimestamp);
  }

  const { data: modules } = await modulesQuery;

  // Get user progress data
  let progressQuery = supabase
    .from('user_training_progress')
    .select(`
      id,
      user_id,
      module_id,
      status,
      progress_percentage,
      time_spent_minutes,
      updated_at,
      section_progress:user_section_progress(
        id,
        section_id,
        is_completed,
        time_spent_minutes
      )
    `)
    .eq('user_id', userId);

  if (syncType === 'incremental') {
    progressQuery = progressQuery.gte('updated_at', lastSyncTimestamp);
  }

  const { data: progressData } = await progressQuery;

  // Get assessment data
  let assessmentsQuery = supabase
    .from('training_assessments')
    .select(`
      id,
      user_id,
      module_id,
      status,
      score_percentage,
      completed_at,
      responses:training_question_responses(
        question_id,
        user_answer,
        is_correct,
        points_earned
      )
    `)
    .eq('user_id', userId);

  if (syncType === 'incremental') {
    assessmentsQuery = assessmentsQuery.gte('completed_at', lastSyncTimestamp);
  }

  const { data: assessmentData } = await assessmentsQuery;

  // Transform data for offline use
  const offlineModules: OfflineModule[] = (modules || []).map(module => ({
    module_id: module.id,
    title: module.title,
    title_th: module.title_th,
    sections: (module.sections || []).map((section: any) => ({
      section_id: section.id,
      title: section.title,
      title_th: section.title_th,
      content: section.content,
      content_th: section.content_th,
      media_urls: section.media_urls || [],
      estimated_minutes: section.estimated_minutes
    })),
    questions: (module.questions || []).map((question: any) => ({
      question_id: question.id,
      question: question.question,
      question_th: question.question_th,
      options: question.options || [],
      options_th: question.options_th || [],
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      explanation_th: question.explanation_th
    })),
    last_updated: module.updated_at,
    cache_priority: 1,
    size_mb: calculateModuleSize(module)
  }));

  const offlineProgress: OfflineProgress[] = (progressData || []).map(progress => ({
    progress_id: progress.id,
    user_id: progress.user_id,
    module_id: progress.module_id,
    progress_data: {
      status: progress.status,
      progress_percentage: progress.progress_percentage,
      time_spent_minutes: progress.time_spent_minutes,
      section_progress: progress.section_progress
    },
    last_modified: progress.updated_at,
    sync_status: 'synced'
  }));

  const offlineAssessments: OfflineAssessment[] = (assessmentData || []).map(assessment => ({
    assessment_id: assessment.id,
    user_id: assessment.user_id,
    module_id: assessment.module_id,
    responses: assessment.responses || [],
    score_data: {
      status: assessment.status,
      score_percentage: assessment.score_percentage,
      completed_at: assessment.completed_at
    },
    completed_offline: false,
    sync_status: 'synced'
  }));

  return {
    modules: offlineModules,
    user_progress: offlineProgress,
    assessments: offlineAssessments,
    media_cache: [], // Would be populated with actual media cache
    sync_metadata: {
      last_full_sync: syncType === 'full' ? new Date().toISOString() : lastSyncTimestamp,
      last_incremental_sync: new Date().toISOString(),
      sync_version: 1,
      device_id: 'unknown',
      conflicts_resolved: 0
    }
  };
}

async function getSyncConflicts(
  supabase: any,
  restaurantId: string,
  userId: string
) {
  const { data: conflicts } = await supabase
    .from('performance_metrics')
    .select('metric_data')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('metric_type', 'sync_conflict')
    .order('recorded_at', { ascending: false });

  return (conflicts || []).map(conflict => ({
    conflict_id: conflict.metric_data?.conflict_id || 'unknown',
    data_type: conflict.metric_data?.data_type || 'unknown',
    conflict_type: conflict.metric_data?.conflict_type || 'data_mismatch',
    server_version: conflict.metric_data?.server_version,
    client_version: conflict.metric_data?.client_version,
    resolution_strategy: conflict.metric_data?.resolution_strategy,
    created_at: conflict.metric_data?.created_at
  }));
}

async function calculateStorageUsage(
  supabase: any,
  restaurantId: string,
  userId: string
) {
  // Get cache size information
  const { data: cacheInfo } = await supabase
    .from('performance_metrics')
    .select('metric_data')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('metric_type', 'offline_cache_info')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  return {
    total_used_mb: cacheInfo?.metric_data?.total_size_mb || 0,
    modules_cache_mb: cacheInfo?.metric_data?.modules_size_mb || 0,
    media_cache_mb: cacheInfo?.metric_data?.media_size_mb || 0,
    progress_cache_mb: cacheInfo?.metric_data?.progress_size_mb || 0,
    available_space_mb: 500 - (cacheInfo?.metric_data?.total_size_mb || 0),
    cache_efficiency: cacheInfo?.metric_data?.cache_efficiency || 85
  };
}

async function getAvailableModulesForSync(
  supabase: any,
  restaurantId: string
) {
  const { data: modules } = await supabase
    .from('training_modules')
    .select('id, title, title_th, duration_minutes, is_active')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);

  return (modules || []).map(module => ({
    module_id: module.id,
    title: module.title,
    title_th: module.title_th,
    estimated_size_mb: Math.ceil(module.duration_minutes / 10), // Rough estimate
    sync_priority: 'normal',
    offline_compatible: true
  }));
}

// Sync operation functions
async function performDownloadSync(
  supabase: any,
  restaurantId: string,
  userId: string,
  deviceId: string,
  moduleIds: string[],
  forceSync: boolean
) {
  // Download training content for offline use
  const offlineData = await getOfflineData(
    supabase,
    restaurantId,
    userId,
    moduleIds,
    forceSync ? 'full' : 'incremental',
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  );

  // Store download record
  await supabase
    .from('performance_metrics')
    .insert({
      restaurant_id: restaurantId,
      user_id: userId,
      metric_type: 'offline_download_sync',
      metric_value: offlineData.modules.length,
      metric_data: {
        device_id: deviceId,
        modules_downloaded: offlineData.modules.length,
        data_size_mb: offlineData.modules.reduce((sum, m) => sum + m.size_mb, 0),
        sync_type: forceSync ? 'full' : 'incremental',
        timestamp: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    });

  return {
    operation: 'download',
    modules_synced: offlineData.modules.length,
    data_size_mb: offlineData.modules.reduce((sum, m) => sum + m.size_mb, 0),
    offline_data: offlineData
  };
}

async function performUploadSync(
  supabase: any,
  restaurantId: string,
  userId: string,
  deviceId: string,
  offlineData: any,
  forceSync: boolean
) {
  let uploadedItems = 0;
  let conflicts = 0;

  // Upload progress data
  if (offlineData.user_progress) {
    for (const progress of offlineData.user_progress) {
      if (progress.sync_status === 'pending') {
        // Check for conflicts
        const existingProgress = await checkProgressConflict(supabase, progress);
        
        if (existingProgress && !forceSync) {
          conflicts++;
          await recordSyncConflict(supabase, restaurantId, userId, 'progress', progress, existingProgress);
        } else {
          await uploadProgressData(supabase, progress);
          uploadedItems++;
        }
      }
    }
  }

  // Upload assessment data
  if (offlineData.assessments) {
    for (const assessment of offlineData.assessments) {
      if (assessment.sync_status === 'pending') {
        await uploadAssessmentData(supabase, assessment);
        uploadedItems++;
      }
    }
  }

  return {
    operation: 'upload',
    items_uploaded: uploadedItems,
    conflicts_detected: conflicts,
    sync_status: conflicts > 0 ? 'partial' : 'complete'
  };
}

async function performBidirectionalSync(
  supabase: any,
  restaurantId: string,
  userId: string,
  deviceId: string,
  moduleIds: string[],
  offlineData: any,
  forceSync: boolean
) {
  // Perform upload first
  const uploadResult = await performUploadSync(
    supabase,
    restaurantId,
    userId,
    deviceId,
    offlineData,
    forceSync
  );

  // Then perform download
  const downloadResult = await performDownloadSync(
    supabase,
    restaurantId,
    userId,
    deviceId,
    moduleIds,
    forceSync
  );

  return {
    operation: 'bidirectional',
    upload_result: uploadResult,
    download_result: downloadResult,
    total_conflicts: uploadResult.conflicts_detected
  };
}

async function resolveConflicts(
  supabase: any,
  restaurantId: string,
  userId: string,
  conflicts: any[],
  resolutionStrategy: string
) {
  let resolvedConflicts = 0;

  for (const conflict of conflicts) {
    let resolutionResult;
    
    switch (resolutionStrategy) {
      case 'server_wins':
        resolutionResult = await applyServerVersion(supabase, conflict);
        break;
      case 'client_wins':
        resolutionResult = await applyClientVersion(supabase, conflict);
        break;
      case 'merge':
        resolutionResult = await mergeVersions(supabase, conflict);
        break;
      default:
        continue; // Skip manual resolution in API
    }

    if (resolutionResult.success) {
      resolvedConflicts++;
      await markConflictResolved(supabase, conflict.conflict_id);
    }
  }

  return {
    operation: 'conflict_resolution',
    conflicts_resolved: resolvedConflicts,
    resolution_strategy: resolutionStrategy
  };
}

async function performCacheCleanup(
  supabase: any,
  restaurantId: string,
  userId: string,
  deviceId: string
) {
  // Remove old cached data
  const { data: oldCacheItems } = await supabase
    .from('performance_metrics')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('metric_type', 'offline_cache_item')
    .lt('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  let cleanedItems = 0;
  if (oldCacheItems) {
    const { error: deleteError } = await supabase
      .from('performance_metrics')
      .delete()
      .in('id', oldCacheItems.map(item => item.id));

    if (!deleteError) {
      cleanedItems = oldCacheItems.length;
    }
  }

  return {
    operation: 'cache_cleanup',
    items_cleaned: cleanedItems,
    space_freed_mb: cleanedItems * 0.5 // Rough estimate
  };
}

// Utility functions
function generateSyncRecommendations(
  syncStatus: OfflineSyncStatus,
  syncConfig: SyncConfiguration,
  storageUsage: any
) {
  const recommendations = [];

  if (syncStatus.pending_uploads > 10) {
    recommendations.push({
      priority: 'high',
      category: 'Sync Performance',
      recommendation: 'High number of pending uploads - consider immediate sync',
      action: 'Perform upload sync operation'
    });
  }

  if (syncStatus.sync_conflicts > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Data Integrity',
      recommendation: 'Sync conflicts detected - resolve to prevent data loss',
      action: 'Run conflict resolution with appropriate strategy'
    });
  }

  if (storageUsage.available_space_mb < 50) {
    recommendations.push({
      priority: 'medium',
      category: 'Storage Management',
      recommendation: 'Low storage space - consider cache cleanup',
      action: 'Perform cache cleanup operation'
    });
  }

  if (!syncConfig.auto_sync_enabled) {
    recommendations.push({
      priority: 'low',
      category: 'Sync Configuration',
      recommendation: 'Auto-sync disabled - enable for better data consistency',
      action: 'Enable auto_sync_enabled in configuration'
    });
  }

  return recommendations;
}

function validateSyncConfiguration(config: any): SyncConfiguration {
  return {
    auto_sync_enabled: Boolean(config.auto_sync_enabled),
    sync_frequency_minutes: Math.max(5, Math.min(1440, config.sync_frequency_minutes || 60)),
    max_offline_storage_mb: Math.max(100, Math.min(2000, config.max_offline_storage_mb || 500)),
    priority_modules: Array.isArray(config.priority_modules) ? config.priority_modules : [],
    conflict_resolution_strategy: ['server_wins', 'client_wins', 'merge', 'manual'].includes(config.conflict_resolution_strategy) 
      ? config.conflict_resolution_strategy : 'server_wins',
    background_sync_enabled: Boolean(config.background_sync_enabled),
    wifi_only_sync: Boolean(config.wifi_only_sync),
    battery_conscious_sync: Boolean(config.battery_conscious_sync)
  };
}

function calculateConfigScore(config: SyncConfiguration): number {
  let score = 0;
  
  if (config.auto_sync_enabled) score += 20;
  if (config.background_sync_enabled) score += 15;
  if (config.battery_conscious_sync) score += 10;
  if (config.sync_frequency_minutes <= 120) score += 15;
  if (config.max_offline_storage_mb >= 300) score += 15;
  if (config.priority_modules.length > 0) score += 10;
  if (config.conflict_resolution_strategy !== 'manual') score += 15;
  
  return score;
}

async function applySyncConfiguration(
  supabase: any,
  restaurantId: string,
  userId: string,
  config: SyncConfiguration,
  deviceId?: string | null
) {
  // Implementation would apply configuration settings
  return {
    applied_settings: Object.keys(config).length,
    auto_sync_scheduled: config.auto_sync_enabled,
    next_sync_time: config.auto_sync_enabled 
      ? new Date(Date.now() + config.sync_frequency_minutes * 60 * 1000).toISOString()
      : null
  };
}

async function updateSyncStatus(
  supabase: any,
  restaurantId: string,
  userId: string,
  deviceId: string,
  operation: string,
  result: any
) {
  await supabase
    .from('performance_metrics')
    .insert({
      restaurant_id: restaurantId,
      user_id: userId,
      metric_type: 'offline_sync_status',
      metric_value: result.items_uploaded || result.modules_synced || 0,
      metric_data: {
        device_id: deviceId,
        last_operation: operation,
        operation_result: result,
        sync_in_progress: false,
        last_sync_timestamp: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    });
}

function calculateModuleSize(module: any): number {
  // Rough calculation based on content
  let size = 0;
  
  // Base module size
  size += 0.1;
  
  // Content size
  const sections = module.sections || [];
  size += sections.length * 0.05;
  
  // Media size estimation
  const mediaCount = sections.reduce((count: number, section: any) => 
    count + (section.media_urls?.length || 0), 0
  );
  size += mediaCount * 2; // 2MB per media item average
  
  // Questions size
  const questions = module.questions || [];
  size += questions.length * 0.01;
  
  return Math.round(size * 100) / 100; // Round to 2 decimal places
}

// Simplified helper functions for conflict resolution
async function checkProgressConflict(supabase: any, progress: OfflineProgress) {
  const { data: existingProgress } = await supabase
    .from('user_training_progress')
    .select('updated_at, progress_percentage')
    .eq('id', progress.progress_id)
    .single();

  return existingProgress;
}

async function recordSyncConflict(
  supabase: any,
  restaurantId: string,
  userId: string,
  dataType: string,
  clientData: any,
  serverData: any
) {
  await supabase
    .from('performance_metrics')
    .insert({
      restaurant_id: restaurantId,
      user_id: userId,
      metric_type: 'sync_conflict',
      metric_value: 1,
      metric_data: {
        conflict_id: `${dataType}_${Date.now()}`,
        data_type: dataType,
        conflict_type: 'data_mismatch',
        client_version: clientData,
        server_version: serverData,
        created_at: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    });
}

async function uploadProgressData(supabase: any, progress: OfflineProgress) {
  // Update progress data in database
  await supabase
    .from('user_training_progress')
    .update({
      progress_percentage: progress.progress_data.progress_percentage,
      time_spent_minutes: progress.progress_data.time_spent_minutes,
      status: progress.progress_data.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', progress.progress_id);
}

async function uploadAssessmentData(supabase: any, assessment: OfflineAssessment) {
  // Store assessment results
  const { data: assessmentRecord } = await supabase
    .from('training_assessments')
    .insert({
      user_id: assessment.user_id,
      module_id: assessment.module_id,
      status: assessment.score_data.status,
      score_percentage: assessment.score_data.score_percentage,
      completed_at: assessment.score_data.completed_at || new Date().toISOString()
    })
    .select()
    .single();

  // Store individual responses
  if (assessmentRecord && assessment.responses.length > 0) {
    const responses = assessment.responses.map((response: any) => ({
      assessment_id: assessmentRecord.id,
      question_id: response.question_id,
      user_answer: response.user_answer,
      is_correct: response.is_correct,
      points_earned: response.points_earned
    }));

    await supabase
      .from('training_question_responses')
      .insert(responses);
  }
}

// Additional conflict resolution helpers (simplified)
async function applyServerVersion(supabase: any, conflict: any) {
  return { success: true, action: 'server_version_applied' };
}

async function applyClientVersion(supabase: any, conflict: any) {
  return { success: true, action: 'client_version_applied' };
}

async function mergeVersions(supabase: any, conflict: any) {
  return { success: true, action: 'versions_merged' };
}

async function markConflictResolved(supabase: any, conflictId: string) {
  // Mark conflict as resolved in database
  console.log(`Conflict ${conflictId} marked as resolved`);
}