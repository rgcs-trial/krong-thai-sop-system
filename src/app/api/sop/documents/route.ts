/**
 * SOP Documents API Route
 * Handles CRUD operations for SOP documents
 * 
 * GET    /api/sop/documents      - List all SOPs with filtering and pagination
 * POST   /api/sop/documents      - Create new SOP document
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DatabaseService } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { validateCreateSOPDocument, validatePagination, sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  PaginatedResponse,
  SOPDocumentResponse,
  SOPDocumentFilters,
  CreateSOPDocumentRequest,
  SOPAuthContext 
} from '@/types/api/sop';

const db = new DatabaseService(supabaseAdmin);

/**
 * GET /api/sop/documents - List SOPs with filtering and pagination
 */
async function handleGetDocuments(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Parse filters
    const filters: SOPDocumentFilters = {
      category_id: searchParams.get('category_id') || undefined,
      status: searchParams.get('status') || undefined,
      difficulty_level: searchParams.get('difficulty_level') as any || undefined,
      created_by: searchParams.get('created_by') || undefined,
      updated_after: searchParams.get('updated_after') || undefined,
      review_due: searchParams.get('review_due') === 'true',
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    };

    // Validate pagination
    const paginationValidation = validatePagination({ page, limit, sortBy, sortOrder });
    if (!paginationValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters',
        details: paginationValidation.errors,
      } as APIResponse, { status: 400 });
    }

    // Build query
    let query = supabaseAdmin
      .from('sop_documents')
      .select(`
        *,
        category:sop_categories!inner(id, name, name_fr, icon, color),
        created_by_user:auth_users!sop_documents_created_by_fkey(id, full_name, email),
        updated_by_user:auth_users!sop_documents_updated_by_fkey(id, full_name, email)
      `, { count: 'exact' })
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true);

    // Apply filters
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.difficulty_level) {
      query = query.eq('difficulty_level', filters.difficulty_level);
    }
    
    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }
    
    if (filters.updated_after) {
      query = query.gte('updated_at', filters.updated_after);
    }
    
    if (filters.review_due) {
      query = query.lte('review_due_date', new Date().toISOString());
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Error fetching SOP documents:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch SOP documents',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const response: PaginatedResponse<SOPDocumentResponse> = {
      success: true,
      data: documents || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/sop/documents:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

/**
 * POST /api/sop/documents - Create new SOP document
 */
async function handleCreateDocument(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const sanitizedData = sanitizeInput(body) as CreateSOPDocumentRequest;

    // Validate input
    const validation = validateCreateSOPDocument(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Verify category exists and belongs to restaurant
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

    // Generate version number
    const version = `1.0.0`;

    // Create SOP document
    const documentData = {
      restaurant_id: context.restaurantId,
      category_id: sanitizedData.category_id,
      title: sanitizedData.title,
      title_fr: sanitizedData.title_fr,
      content: sanitizedData.content,
      content_fr: sanitizedData.content_fr,
      version,
      status: 'draft' as const,
      tags: sanitizedData.tags || [],
      difficulty_level: sanitizedData.difficulty_level,
      estimated_read_time: sanitizedData.estimated_read_time,
      review_due_date: sanitizedData.review_due_date,
      created_by: context.userId,
      updated_by: context.userId,
      is_active: true,
    };

    const { data: newDocument, error: createError } = await supabaseAdmin
      .from('sop_documents')
      .insert(documentData)
      .select(`
        *,
        category:sop_categories!inner(id, name, name_fr, icon, color),
        created_by_user:auth_users!sop_documents_created_by_fkey(id, full_name, email),
        updated_by_user:auth_users!sop_documents_updated_by_fkey(id, full_name, email)
      `)
      .single();

    if (createError) {
      console.error('Error creating SOP document:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create SOP document',
        errorCode: 'DATABASE_ERROR',
      } as APIResponse, { status: 500 });
    }

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'sop_document',
      newDocument.id,
      null,
      documentData,
      request
    );

    const response: APIResponse<SOPDocumentResponse> = {
      success: true,
      data: newDocument,
      message: 'SOP document created successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/sop/documents:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const GET = withAuth(handleGetDocuments, PERMISSIONS.SOP.READ, {
  maxRequests: 200,
  windowMs: 60000, // 1 minute
});

export const POST = withAuth(handleCreateDocument, PERMISSIONS.SOP.WRITE, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
});

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

export async function DELETE() {
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