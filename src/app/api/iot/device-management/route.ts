import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import type { 
  IoTDevice, 
  IoTDeviceType, 
  IoTDeviceStatus, 
  CreateIoTDeviceRequest,
  IoTSearchParams,
  ApiResponse 
} from '@/types/database';

// GET: Fetch IoT devices with filtering and search
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

    // Get user's restaurant
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

    // Parse search parameters
    const filters: IoTSearchParams = {
      device_type: searchParams.get('device_type')?.split(',') as IoTDeviceType[],
      status: searchParams.get('status')?.split(',') as IoTDeviceStatus[],
      zone: searchParams.get('zone') || undefined,
      manufacturer: searchParams.get('manufacturer') || undefined,
      search: searchParams.get('search') || undefined,
      is_online: searchParams.get('is_online') === 'true' ? true : 
                 searchParams.get('is_online') === 'false' ? false : undefined,
      has_alerts: searchParams.get('has_alerts') === 'true' ? true :
                  searchParams.get('has_alerts') === 'false' ? false : undefined,
      maintenance_due: searchParams.get('maintenance_due') === 'true'
    };

    // Build query
    let query = supabase
      .from('iot_devices')
      .select(`
        *,
        restaurant:restaurants(name, name_fr),
        creator:auth_users!iot_devices_created_by_fkey(full_name, full_name_fr),
        updater:auth_users!iot_devices_updated_by_fkey(full_name, full_name_fr)
      `)
      .eq('restaurant_id', authUser.restaurant_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.device_type?.length) {
      query = query.in('device_type', filters.device_type);
    }

    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }

    if (filters.zone) {
      query = query.eq('zone', filters.zone);
    }

    if (filters.manufacturer) {
      query = query.ilike('manufacturer', `%${filters.manufacturer}%`);
    }

    if (filters.is_online !== undefined) {
      query = query.eq('is_online', filters.is_online);
    }

    if (filters.search) {
      query = query.or(`
        device_name.ilike.%${filters.search}%,
        device_name_fr.ilike.%${filters.search}%,
        description.ilike.%${filters.search}%,
        description_fr.ilike.%${filters.search}%,
        location.ilike.%${filters.search}%,
        serial_number.ilike.%${filters.search}%
      `);
    }

    const { data: devices, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to fetch devices'
      }, { status: 500 });
    }

    // If filtering by alerts or maintenance, we need additional queries
    let filteredDevices = devices || [];

    if (filters.has_alerts) {
      const { data: alertDevices } = await supabase
        .from('iot_alerts')
        .select('device_id')
        .eq('is_resolved', false);
      
      const alertDeviceIds = new Set(alertDevices?.map(a => a.device_id) || []);
      filteredDevices = filteredDevices.filter(d => alertDeviceIds.has(d.id));
    }

    if (filters.maintenance_due) {
      const { data: maintenanceDevices } = await supabase
        .from('iot_maintenance_schedule')
        .select('device_id')
        .in('status', ['due', 'overdue'])
        .lte('scheduled_date', new Date().toISOString());
      
      const maintenanceDeviceIds = new Set(maintenanceDevices?.map(m => m.device_id) || []);
      filteredDevices = filteredDevices.filter(d => maintenanceDeviceIds.has(d.id));
    }

    return NextResponse.json<ApiResponse<IoTDevice[]>>({
      success: true,
      data: filteredDevices
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST: Create new IoT device
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Authentication and authorization check
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
    const deviceData: CreateIoTDeviceRequest = await request.json();

    // Validate required fields
    if (!deviceData.device_type || !deviceData.device_name) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device type and name are required'
      }, { status: 400 });
    }

    // Check for duplicate MAC address or serial number
    if (deviceData.mac_address) {
      const { data: existingMac } = await supabase
        .from('iot_devices')
        .select('id')
        .eq('mac_address', deviceData.mac_address)
        .single();

      if (existingMac) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Device with this MAC address already exists'
        }, { status: 409 });
      }
    }

    if (deviceData.serial_number) {
      const { data: existingSerial } = await supabase
        .from('iot_devices')
        .select('id')
        .eq('serial_number', deviceData.serial_number)
        .single();

      if (existingSerial) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Device with this serial number already exists'
        }, { status: 409 });
      }
    }

    // Prepare device data for insertion
    const newDevice = {
      restaurant_id: authUser.restaurant_id,
      device_type: deviceData.device_type,
      device_name: deviceData.device_name,
      device_name_fr: deviceData.device_name_fr,
      description: deviceData.description,
      description_fr: deviceData.description_fr,
      mac_address: deviceData.mac_address,
      serial_number: deviceData.serial_number,
      manufacturer: deviceData.manufacturer,
      model: deviceData.model,
      location: deviceData.location,
      location_fr: deviceData.location_fr,
      zone: deviceData.zone,
      coordinates: deviceData.coordinates,
      config: deviceData.config || {},
      thresholds: deviceData.thresholds || {},
      calibration_data: {},
      maintenance_schedule: {},
      status: 'inactive' as IoTDeviceStatus,
      is_online: false,
      created_by: user.id,
      installation_date: new Date().toISOString()
    };

    // Insert device
    const { data: device, error } = await supabase
      .from('iot_devices')
      .insert(newDevice)
      .select(`
        *,
        restaurant:restaurants(name, name_fr),
        creator:auth_users!iot_devices_created_by_fkey(full_name, full_name_fr)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to create device'
      }, { status: 500 });
    }

    // Log the device creation
    await supabase.from('audit_logs').insert({
      restaurant_id: authUser.restaurant_id,
      user_id: user.id,
      action: 'CREATE',
      resource_type: 'iot_device',
      resource_id: device.id,
      new_values: device,
      metadata: {
        device_type: device.device_type,
        device_name: device.device_name
      }
    });

    return NextResponse.json<ApiResponse<IoTDevice>>({
      success: true,
      data: device,
      message: 'IoT device created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT: Update IoT device
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device ID is required'
      }, { status: 400 });
    }

    // Authentication and authorization check
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

    // Get existing device
    const { data: existingDevice, error: fetchError } = await supabase
      .from('iot_devices')
      .select('*')
      .eq('id', deviceId)
      .eq('restaurant_id', authUser.restaurant_id)
      .single();

    if (fetchError || !existingDevice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device not found'
      }, { status: 404 });
    }

    // Parse request body
    const updateData = await request.json();

    // Check for duplicate MAC address or serial number (excluding current device)
    if (updateData.mac_address && updateData.mac_address !== existingDevice.mac_address) {
      const { data: existingMac } = await supabase
        .from('iot_devices')
        .select('id')
        .eq('mac_address', updateData.mac_address)
        .neq('id', deviceId)
        .single();

      if (existingMac) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Device with this MAC address already exists'
        }, { status: 409 });
      }
    }

    if (updateData.serial_number && updateData.serial_number !== existingDevice.serial_number) {
      const { data: existingSerial } = await supabase
        .from('iot_devices')
        .select('id')
        .eq('serial_number', updateData.serial_number)
        .neq('id', deviceId)
        .single();

      if (existingSerial) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Device with this serial number already exists'
        }, { status: 409 });
      }
    }

    // Prepare update data
    const updatedFields = {
      ...updateData,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    // Update device
    const { data: updatedDevice, error: updateError } = await supabase
      .from('iot_devices')
      .update(updatedFields)
      .eq('id', deviceId)
      .select(`
        *,
        restaurant:restaurants(name, name_fr),
        creator:auth_users!iot_devices_created_by_fkey(full_name, full_name_fr),
        updater:auth_users!iot_devices_updated_by_fkey(full_name, full_name_fr)
      `)
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to update device'
      }, { status: 500 });
    }

    // Log the device update
    await supabase.from('audit_logs').insert({
      restaurant_id: authUser.restaurant_id,
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'iot_device',
      resource_id: deviceId,
      old_values: existingDevice,
      new_values: updatedDevice,
      metadata: {
        device_type: updatedDevice.device_type,
        device_name: updatedDevice.device_name
      }
    });

    return NextResponse.json<ApiResponse<IoTDevice>>({
      success: true,
      data: updatedDevice,
      message: 'IoT device updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE: Remove IoT device
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device ID is required'
      }, { status: 400 });
    }

    // Authentication and authorization check
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

    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin permissions required'
      }, { status: 403 });
    }

    // Get existing device
    const { data: existingDevice, error: fetchError } = await supabase
      .from('iot_devices')
      .select('*')
      .eq('id', deviceId)
      .eq('restaurant_id', authUser.restaurant_id)
      .single();

    if (fetchError || !existingDevice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Device not found'
      }, { status: 404 });
    }

    // Check for active alerts or maintenance
    const { data: activeAlerts } = await supabase
      .from('iot_alerts')
      .select('id')
      .eq('device_id', deviceId)
      .eq('is_resolved', false);

    const { data: activeMaintenance } = await supabase
      .from('iot_maintenance_schedule')
      .select('id')
      .eq('device_id', deviceId)
      .in('status', ['scheduled', 'in_progress']);

    if ((activeAlerts?.length || 0) > 0 || (activeMaintenance?.length || 0) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot delete device with active alerts or maintenance schedules'
      }, { status: 409 });
    }

    // Delete device (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('iot_devices')
      .delete()
      .eq('id', deviceId);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to delete device'
      }, { status: 500 });
    }

    // Log the device deletion
    await supabase.from('audit_logs').insert({
      restaurant_id: authUser.restaurant_id,
      user_id: user.id,
      action: 'DELETE',
      resource_type: 'iot_device',
      resource_id: deviceId,
      old_values: existingDevice,
      metadata: {
        device_type: existingDevice.device_type,
        device_name: existingDevice.device_name
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'IoT device deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}