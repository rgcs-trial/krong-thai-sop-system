/**
 * Individual SOP Document API Route
 * Handles operations on specific SOP documents
 * 
 * GET    /api/sop/documents/[id]    - Get specific SOP document
 * PUT    /api/sop/documents/[id]    - Update SOP document
 * DELETE /api/sop/documents/[id]    - Delete SOP document
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DatabaseService } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent, canAccessResource, ROLES } from '@/lib/middleware/auth';
import { validateUpdateSOPDocument, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPDocumentResponse,
  UpdateSOPDocumentRequest,
  SOPAuthContext 
} from '@/types/api/sop';

const db = new DatabaseService(supabaseAdmin);

/**
 * GET /api/sop/documents/[id] - Get specific SOP document
 */
async function handleGetDocument(
  request: NextRequest, 
  context: SOPAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid document ID format',
        errorCode: 'INVALID_ID',
      } as APIResponse, { status: 400 });
    }

    // Fetch SOP document with related data
    const { data: document, error } = await supabaseAdmin
      .from('sop_documents')
      .select(`
        *,
        category:sop_categories!inner(id, name, name_fr, icon, color),
        created_by_user:auth_users!sop_documents_created_by_fkey(id, full_name, email),
        updated_by_user:auth_users!sop_documents_updated_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json({
          success: false,
          error: 'SOP document not found',
          errorCode: 'DOCUMENT_NOT_FOUND',
        } as APIResponse, { status: 404 });
      }

      console.error('Error fetching SOP document:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch SOP document',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Log access for analytics
    await supabaseAdmin
      .from('performance_metrics')
      .insert({
        restaurant_id: context.restaurantId,
        metric_type: 'sop_access',
        metric_name: 'document_view',
        metric_value: 1,
        measurement_unit: 'count',
        timestamp: new Date().toISOString(),
        metadata: {
          sop_id: id,
          user_id: context.userId,
          user_role: context.role,
        },
      });

    const response: APIResponse<SOPDocumentResponse> = {
      success: true,
      data: document,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/documents/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * PUT /api/sop/documents/[id] - Update SOP document
 */
async function handleUpdateDocument(
  request: NextRequest,
  context: SOPAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const { id } = params;
    const body = await request.json();
    const sanitizedData = sanitizeInput(body) as UpdateSOPDocumentRequest;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid document ID format',
        errorCode: 'INVALID_ID',
      } as APIResponse, { status: 400 });
    }

    // Validate input
    const validation = validateUpdateSOPDocument(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Check if document exists and user can modify it
    const { data: existingDocument, error: fetchError } = await supabaseAdmin
      .from('sop_documents')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true)
      .single();

    if (fetchError || !existingDocument) {
      return NextResponse.json({
        success: false,
        error: 'SOP document not found',
        errorCode: 'DOCUMENT_NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Check permissions - only creators, managers, and admins can edit
    if (!canAccessResource(context.role, context.userId, existingDocument.created_by)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to update this document',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      } as APIResponse, { status: 403 });
    }

    // Verify category if being changed
    if (sanitizedData.category_id && sanitizedData.category_id !== existingDocument.category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from('sop_categories')
        .select('id')
        .eq('id', sanitizedData.category_id)
        .eq('restaurant_id', context.restaurantId)
        .eq('is_active', true)
        .single();

      if (categoryError || !category) {
        return NextResponse.json({
          success: false,
          error: 'Category not found or invalid',
          errorCode: 'CATEGORY_NOT_FOUND',
        } as APIResponse, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      ...sanitizedData,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };

    // Increment version if content changed
    if (sanitizedData.content || sanitizedData.content_fr) {
      const currentVersion = existingDocument.version.split('.');
      const patchVersion = parseInt(currentVersion[2]) + 1;
      updateData.version = `${currentVersion[0]}.${currentVersion[1]}.${patchVersion}`;
    }

    // Update document
    const { data: updatedDocument, error: updateError } = await supabaseAdmin
      .from('sop_documents')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        category:sop_categories!inner(id, name, name_fr, icon, color),
        created_by_user:auth_users!sop_documents_created_by_fkey(id, full_name, email),
        updated_by_user:auth_users!sop_documents_updated_by_fkey(id, full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error updating SOP document:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update SOP document',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'UPDATE',
      'sop_document',
      id,
      existingDocument,
      updateData,
      request
    );

    const response: APIResponse<SOPDocumentResponse> = {
      success: true,
      data: updatedDocument,
      message: 'SOP document updated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in PUT /api/sop/documents/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * DELETE /api/sop/documents/[id] - Delete SOP document (soft delete)
 */
async function handleDeleteDocument(
  request: NextRequest,
  context: SOPAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid document ID format',
        errorCode: 'INVALID_ID',
      } as APIResponse, { status: 400 });
    }

    // Check if document exists
    const { data: existingDocument, error: fetchError } = await supabaseAdmin
      .from('sop_documents')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true)
      .single();

    if (fetchError || !existingDocument) {
      return NextResponse.json({
        success: false,
        error: 'SOP document not found',
        errorCode: 'DOCUMENT_NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Check permissions - only admins and managers can delete
    if (context.role !== ROLES.ADMIN && context.role !== ROLES.MANAGER) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to delete this document',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      } as APIResponse, { status: 403 });
    }

    // Soft delete (set is_active to false)
    const { error: deleteError } = await supabaseAdmin
      .from('sop_documents')
      .update({
        is_active: false,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting SOP document:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete SOP document',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'DELETE',
      'sop_document',
      id,
      existingDocument,
      { is_active: false },
      request
    );

    const response: APIResponse = {
      success: true,
      message: 'SOP document deleted successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in DELETE /api/sop/documents/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authHandler = withAuth(
    (req, context) => handleGetDocument(req, context, params),
    PERMISSIONS.SOP.READ,
    { maxRequests: 300, windowMs: 60000 }
  );
  return authHandler(request);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authHandler = withAuth(
    (req, context) => handleUpdateDocument(req, context, params),
    PERMISSIONS.SOP.WRITE,
    { maxRequests: 100, windowMs: 60000 }
  );
  return authHandler(request);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authHandler = withAuth(
    (req, context) => handleDeleteDocument(req, context, params),
    PERMISSIONS.SOP.DELETE,
    { maxRequests: 50, windowMs: 60000 }
  );
  return authHandler(request);
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}