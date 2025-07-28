import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import type { 
  IoTFirmwareUpdate,
  IoTDeviceUpdate,
  ApiResponse 
} from '@/types/database';

// GET: Fetch firmware updates and device update status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user's restaurant and role
    const { data: authUser } = await supabase
      .from('auth_users')
      .select('restaurant_id, role')
      .eq('id', user.id)
      .single();

    if (!authUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const deviceId = searchParams.get('device_id');
    const manufacturer = searchParams.get('manufacturer');
    const model = searchParams.get('model');
    const availableOnly = searchParams.get('available_only') === 'true';
    const includeDeviceStatus = searchParams.get('include_device_status') === 'true';

    // Build firmware updates query
    let firmwareQuery = supabase
      .from('iot_firmware_updates')
      .select(`
        *,
        creator:auth_users!iot_firmware_updates_created_by_fkey(full_name, full_name_fr),
        approver:auth_users!iot_firmware_updates_approved_by_fkey(full_name, full_name_fr)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (manufacturer) {
      firmwareQuery = firmwareQuery.eq('manufacturer', manufacturer);
    }

    if (model) {
      firmwareQuery = firmwareQuery.eq('model', model);
    }

    if (availableOnly) {
      firmwareQuery = firmwareQuery.eq('is_published', true);
    }

    const { data: firmwareUpdates, error: firmwareError } = await firmwareQuery;

    if (firmwareError) {
      console.error('Database error:', firmwareError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to fetch firmware updates'
      }, { status: 500 });
    }

    let result: any = {
      firmware_updates: firmwareUpdates || []
    };

    // Include device update status if requested
    if (includeDeviceStatus) {
      let deviceUpdatesQuery = supabase
        .from('iot_device_updates')
        .select(`
          *,
          device:iot_devices!inner(
            id,
            device_name,
            device_name_fr,
            device_type,
            manufacturer,
            model,
            firmware_version,
            restaurant_id
          ),
          firmware_update:iot_firmware_updates(
            id,
            version,
            manufacturer,
            model,
            is_mandatory
          )
        `)
        .eq('device.restaurant_id', authUser.restaurant_id)
        .order('created_at', { ascending: false });

      if (deviceId) {
        deviceUpdatesQuery = deviceUpdatesQuery.eq('device_id', deviceId);
      }

      const { data: deviceUpdates } = await deviceUpdatesQuery;
      result.device_updates = deviceUpdates || [];

      // Get devices that can be updated
      const availableUpdates = await getAvailableUpdatesForDevices(
        supabase, 
        authUser.restaurant_id, 
        deviceId
      );
      result.available_updates = availableUpdates;
    }

    // Get update statistics
    if (authUser.role === 'admin') {
      const stats = await getFirmwareUpdateStats(supabase, authUser.restaurant_id);
      result.statistics = stats;
    }

    return NextResponse.json<ApiResponse<typeof result>>({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST: Create firmware update or schedule device update
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user's restaurant and role
    const { data: authUser } = await supabase
      .from('auth_users')
      .select('restaurant_id, role')
      .eq('id', user.id)
      .single();

    if (!authUser || !['admin', 'manager'].includes(authUser.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Parse request body
    const requestData = await request.json();
    const action = requestData.action; // 'create_firmware' or 'schedule_update'

    if (action === 'create_firmware') {
      return await createFirmwareUpdate(supabase, requestData, user.id);
    } else if (action === 'schedule_update') {
      return await scheduleDeviceUpdate(supabase, requestData, authUser);
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid action. Use "create_firmware" or "schedule_update"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT: Update firmware update status or device update progress
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const updateId = searchParams.get('id');
    const updateType = searchParams.get('type'); // 'firmware' or 'device'

    if (!updateId || !updateType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Update ID and type are required'
      }, { status: 400 });
    }

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { data: authUser } = await supabase
      .from('auth_users')
      .select('restaurant_id, role')
      .eq('id', user.id)
      .single();

    if (!authUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const updateData = await request.json();

    if (updateType === 'firmware') {
      return await updateFirmwareUpdate(supabase, updateId, updateData, authUser);
    } else if (updateType === 'device') {
      return await updateDeviceUpdateStatus(supabase, updateId, updateData, authUser);
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid update type'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to create firmware update
async function createFirmwareUpdate(
  supabase: any, 
  requestData: any, 
  userId: string
): Promise<NextResponse> {
  try {
    // Validate required fields
    if (!requestData.manufacturer || !requestData.model || !requestData.version) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Manufacturer, model, and version are required'
      }, { status: 400 });
    }

    // Check for duplicate firmware version
    const { data: existingFirmware } = await supabase
      .from('iot_firmware_updates')
      .select('id')
      .eq('manufacturer', requestData.manufacturer)
      .eq('model', requestData.model)
      .eq('version', requestData.version)
      .single();

    if (existingFirmware) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Firmware version already exists for this manufacturer and model'
      }, { status: 409 });
    }

    // Prepare firmware update data
    const firmwareData = {
      manufacturer: requestData.manufacturer,
      model: requestData.model,
      version: requestData.version,
      previous_version: requestData.previous_version,
      package_url: requestData.package_url,
      package_size_bytes: requestData.package_size_bytes,
      package_checksum: requestData.package_checksum,
      release_notes: requestData.release_notes,
      release_notes_fr: requestData.release_notes_fr,
      security_fixes: requestData.security_fixes || [],
      bug_fixes: requestData.bug_fixes || [],
      new_features: requestData.new_features || [],
      is_mandatory: requestData.is_mandatory || false,
      is_rollback: requestData.is_rollback || false,
      rollback_from_version: requestData.rollback_from_version,
      test_results: requestData.test_results || {},
      created_by: userId
    };

    // Insert firmware update
    const { data: firmwareUpdate, error } = await supabase
      .from('iot_firmware_updates')
      .insert(firmwareData)
      .select(`
        *,
        creator:auth_users!iot_firmware_updates_created_by_fkey(full_name, full_name_fr)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to create firmware update'
      }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<IoTFirmwareUpdate>>({
      success: true,
      data: firmwareUpdate,
      message: 'Firmware update created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating firmware update:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to schedule device update
async function scheduleDeviceUpdate(
  supabase: any, 
  requestData: any, 
  authUser: any
): Promise<NextResponse> {
  try {
    const { device_id, firmware_update_id, scheduled_at } = requestData;

    if (!device_id || !firmware_update_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device ID and firmware update ID are required'
      }, { status: 400 });
    }

    // Verify device exists and user has access
    const { data: device, error: deviceError } = await supabase
      .from('iot_devices')
      .select('id, restaurant_id, device_name, manufacturer, model, firmware_version')
      .eq('id', device_id)
      .eq('restaurant_id', authUser.restaurant_id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device not found or access denied'
      }, { status: 404 });
    }

    // Verify firmware update exists and is compatible
    const { data: firmwareUpdate, error: firmwareError } = await supabase
      .from('iot_firmware_updates')
      .select('*')
      .eq('id', firmware_update_id)
      .eq('manufacturer', device.manufacturer)
      .eq('model', device.model)
      .eq('is_published', true)
      .single();

    if (firmwareError || !firmwareUpdate) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Compatible firmware update not found'
      }, { status: 404 });
    }

    // Check if update is already scheduled or completed for this device
    const { data: existingUpdate } = await supabase
      .from('iot_device_updates')
      .select('id, status')
      .eq('device_id', device_id)
      .eq('firmware_update_id', firmware_update_id)
      .single();

    if (existingUpdate) {
      if (existingUpdate.status === 'completed') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Device already has this firmware version'
        }, { status: 409 });
      } else if (['scheduled', 'downloading', 'installing'].includes(existingUpdate.status)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Update already scheduled or in progress'
        }, { status: 409 });
      }
    }

    // Prepare device update data
    const deviceUpdateData = {
      device_id: device_id,
      firmware_update_id: firmware_update_id,
      status: 'scheduled',
      progress_percentage: 0,
      scheduled_at: scheduled_at || new Date().toISOString(),
      pre_update_version: device.firmware_version,
      validation_tests: {},
      can_rollback: true,
      rollback_performed: false,
      retry_count: 0,
      max_retries: 3
    };

    // Insert device update
    const { data: deviceUpdate, error: insertError } = await supabase
      .from('iot_device_updates')
      .insert(deviceUpdateData)
      .select(`
        *,
        device:iot_devices(
          id,
          device_name,
          device_name_fr,
          device_type,
          manufacturer,
          model
        ),
        firmware_update:iot_firmware_updates(
          id,
          version,
          manufacturer,
          model,
          is_mandatory,
          package_size_bytes
        )
      `)
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to schedule device update'
      }, { status: 500 });
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      restaurant_id: authUser.restaurant_id,
      user_id: authUser.id,
      action: 'CREATE',
      resource_type: 'iot_device_update',
      resource_id: deviceUpdate.id,
      new_values: deviceUpdate,
      metadata: {
        device_name: device.device_name,
        firmware_version: firmwareUpdate.version,
        is_mandatory: firmwareUpdate.is_mandatory
      }
    });

    return NextResponse.json<ApiResponse<IoTDeviceUpdate>>({
      success: true,
      data: deviceUpdate,
      message: 'Device update scheduled successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error scheduling device update:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to update firmware update status
async function updateFirmwareUpdate(
  supabase: any, 
  updateId: string, 
  updateData: any, 
  authUser: any
): Promise<NextResponse> {
  try {
    if (authUser.role !== 'admin') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin permissions required'
      }, { status: 403 });
    }

    // Get existing firmware update
    const { data: existingUpdate, error: fetchError } = await supabase
      .from('iot_firmware_updates')
      .select('*')
      .eq('id', updateId)
      .single();

    if (fetchError || !existingUpdate) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Firmware update not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updatedFields: any = {};

    if (updateData.action === 'publish') {
      updatedFields.is_published = true;
      updatedFields.published_at = new Date().toISOString();
      updatedFields.approved_by = authUser.id;
      updatedFields.approved_at = new Date().toISOString();
    } else if (updateData.action === 'unpublish') {
      updatedFields.is_published = false;
      updatedFields.deprecated_at = new Date().toISOString();
    } else if (updateData.action === 'update') {
      // Allow updating certain fields
      const allowedFields = [
        'release_notes', 'release_notes_fr', 'security_fixes', 
        'bug_fixes', 'new_features', 'test_results'
      ];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updatedFields[field] = updateData[field];
        }
      });
    }

    // Update firmware update
    const { data: updatedFirmware, error: updateError } = await supabase
      .from('iot_firmware_updates')
      .update(updatedFields)
      .eq('id', updateId)
      .select(`
        *,
        creator:auth_users!iot_firmware_updates_created_by_fkey(full_name, full_name_fr),
        approver:auth_users!iot_firmware_updates_approved_by_fkey(full_name, full_name_fr)
      `)
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to update firmware update'
      }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<IoTFirmwareUpdate>>({
      success: true,
      data: updatedFirmware,
      message: 'Firmware update updated successfully'
    });

  } catch (error) {
    console.error('Error updating firmware update:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to update device update status
async function updateDeviceUpdateStatus(
  supabase: any, 
  updateId: string, 
  updateData: any, 
  authUser: any
): Promise<NextResponse> {
  try {
    // Get existing device update
    const { data: existingUpdate, error: fetchError } = await supabase
      .from('iot_device_updates')
      .select(`
        *,
        device:iot_devices!inner(restaurant_id)
      `)
      .eq('id', updateId)
      .single();

    if (fetchError || !existingUpdate) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device update not found'
      }, { status: 404 });
    }

    // Verify user has access
    if (existingUpdate.device.restaurant_id !== authUser.restaurant_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Prepare update data
    const updatedFields: any = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // Handle status-specific updates
    if (updateData.status === 'started') {
      updatedFields.started_at = new Date().toISOString();
    } else if (updateData.status === 'completed') {
      updatedFields.completed_at = new Date().toISOString();
      updatedFields.success = updateData.success !== false;
      
      // Update device firmware version if successful
      if (updatedFields.success && updateData.post_update_version) {
        await supabase
          .from('iot_devices')
          .update({ firmware_version: updateData.post_update_version })
          .eq('id', existingUpdate.device_id);
      }
    } else if (updateData.status === 'failed') {
      updatedFields.completed_at = new Date().toISOString();
      updatedFields.success = false;
      
      // Handle retry logic
      if (existingUpdate.retry_count < existingUpdate.max_retries) {
        const nextRetryDate = new Date();
        nextRetryDate.setMinutes(nextRetryDate.getMinutes() + (30 * Math.pow(2, existingUpdate.retry_count))); // Exponential backoff
        
        updatedFields.status = 'scheduled';
        updatedFields.retry_count = existingUpdate.retry_count + 1;
        updatedFields.next_retry_at = nextRetryDate.toISOString();
        updatedFields.progress_percentage = 0;
      }
    }

    // Update device update
    const { data: updatedDeviceUpdate, error: updateError } = await supabase
      .from('iot_device_updates')
      .update(updatedFields)
      .eq('id', updateId)
      .select(`
        *,
        device:iot_devices(
          id,
          device_name,
          device_name_fr,
          device_type,
          firmware_version
        ),
        firmware_update:iot_firmware_updates(
          id,
          version,
          manufacturer,
          model
        )
      `)
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to update device update status'
      }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<IoTDeviceUpdate>>({
      success: true,
      data: updatedDeviceUpdate,
      message: 'Device update status updated successfully'
    });

  } catch (error) {
    console.error('Error updating device update status:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to get available updates for devices
async function getAvailableUpdatesForDevices(
  supabase: any, 
  restaurantId: string, 
  deviceId?: string
): Promise<any[]> {
  try {
    // Get devices
    let deviceQuery = supabase
      .from('iot_devices')
      .select('id, device_name, manufacturer, model, firmware_version')
      .eq('restaurant_id', restaurantId);

    if (deviceId) {
      deviceQuery = deviceQuery.eq('id', deviceId);
    }

    const { data: devices } = await deviceQuery;
    if (!devices || devices.length === 0) {
      return [];
    }

    const availableUpdates = [];

    for (const device of devices) {
      // Get available firmware updates for this device
      const { data: firmwareUpdates } = await supabase
        .from('iot_firmware_updates')
        .select('*')
        .eq('manufacturer', device.manufacturer)
        .eq('model', device.model)
        .eq('is_published', true)
        .neq('version', device.firmware_version)
        .order('created_at', { ascending: false });

      if (firmwareUpdates && firmwareUpdates.length > 0) {
        for (const update of firmwareUpdates) {
          availableUpdates.push({
            device_id: device.id,
            device_name: device.device_name,
            current_version: device.firmware_version,
            available_update: update,
            is_newer: isVersionNewer(update.version, device.firmware_version),
            is_mandatory: update.is_mandatory
          });
        }
      }
    }

    return availableUpdates;

  } catch (error) {
    console.error('Error getting available updates:', error);
    return [];
  }
}

// Helper function to get firmware update statistics
async function getFirmwareUpdateStats(
  supabase: any, 
  restaurantId: string
): Promise<any> {
  try {
    // Get firmware updates count
    const { data: firmwareUpdates } = await supabase
      .from('iot_firmware_updates')
      .select('id, is_published, is_mandatory')
      .eq('is_published', true);

    // Get device updates for this restaurant
    const { data: deviceUpdates } = await supabase
      .from('iot_device_updates')
      .select(`
        id,
        status,
        success,
        created_at,
        device:iot_devices!inner(restaurant_id)
      `)
      .eq('device.restaurant_id', restaurantId);

    const totalFirmwareUpdates = firmwareUpdates?.length || 0;
    const mandatoryUpdates = firmwareUpdates?.filter(f => f.is_mandatory).length || 0;
    const totalDeviceUpdates = deviceUpdates?.length || 0;
    const completedUpdates = deviceUpdates?.filter(d => d.status === 'completed').length || 0;
    const failedUpdates = deviceUpdates?.filter(d => d.status === 'failed').length || 0;
    const inProgressUpdates = deviceUpdates?.filter(d => 
      ['scheduled', 'downloading', 'installing'].includes(d.status)
    ).length || 0;

    // Calculate success rate
    const successRate = totalDeviceUpdates > 0 ? 
      (completedUpdates / totalDeviceUpdates) * 100 : 100;

    // Get recent update activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUpdates = deviceUpdates?.filter(d => 
      new Date(d.created_at) > thirtyDaysAgo
    ).length || 0;

    return {
      total_firmware_updates: totalFirmwareUpdates,
      mandatory_updates: mandatoryUpdates,
      total_device_updates: totalDeviceUpdates,
      completed_updates: completedUpdates,
      failed_updates: failedUpdates,
      in_progress_updates: inProgressUpdates,
      success_rate: Math.round(successRate * 100) / 100,
      recent_updates_30d: recentUpdates
    };

  } catch (error) {
    console.error('Error getting firmware update stats:', error);
    return {
      total_firmware_updates: 0,
      mandatory_updates: 0,
      total_device_updates: 0,
      completed_updates: 0,
      failed_updates: 0,
      in_progress_updates: 0,
      success_rate: 0,
      recent_updates_30d: 0
    };
  }
}

// Helper function to compare version numbers (simple semantic versioning)
function isVersionNewer(newVersion: string, currentVersion: string): boolean {
  try {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    
    const maxLength = Math.max(newParts.length, currentParts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }
    
    return false; // Versions are equal
  } catch (error) {
    console.error('Error comparing versions:', error);
    return false;
  }
}