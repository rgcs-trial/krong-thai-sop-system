/**
 * SOP Media Upload API endpoint
 * POST /api/sop/media/upload - Upload files for SOPs (images, videos, documents)
 */

import { NextRequest } from 'next/server';
import { withMiddleware, EnhancedRequest } from '@/lib/api/middleware';
import { 
  createSuccessResponse,
  logAuditEvent,
  getClientIP,
  validateFileUpload,
  generateUploadPath,
  generateThumbnailUrl,
  formatFileSize,
  API_CONSTANTS
} from '@/lib/api/utils';
import { createAuthenticatedClient, supabase } from '@/lib/supabase/client';
import { FileUploadResponse } from '@/types/api';

/**
 * POST /api/sop/media/upload
 * Upload files for SOP attachments, step images, etc.
 */
export const POST = withMiddleware(
  async (req: EnhancedRequest) => {
    try {
      // Parse form data
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const sopId = formData.get('sopId') as string | null;
      const category = formData.get('category') as string;
      const metadataStr = formData.get('metadata') as string | null;

      if (!file) {
        return createSuccessResponse(
          { error: 'No file provided' },
          undefined,
          400,
          req.requestId
        );
      }

      if (!category) {
        return createSuccessResponse(
          { error: 'File category is required' },
          undefined,
          400,
          req.requestId
        );
      }

      // Validate category
      const validCategories = ['sop_attachment', 'sop_step_image', 'user_avatar', 'restaurant_logo'];
      if (!validCategories.includes(category)) {
        return createSuccessResponse(
          { error: 'Invalid file category' },
          undefined,
          400,
          req.requestId
        );
      }

      // Parse metadata
      let metadata: Record<string, any> = {};
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr);
        } catch (error) {
          return createSuccessResponse(
            { error: 'Invalid metadata format' },
            undefined,
            400,
            req.requestId
          );
        }
      }

      // Determine allowed file types and max size based on category
      let allowedTypes: string[];
      let maxSize: number;

      switch (category) {
        case 'sop_attachment':
          allowedTypes = [
            ...API_CONSTANTS.ALLOWED_IMAGE_TYPES,
            ...API_CONSTANTS.ALLOWED_DOCUMENT_TYPES,
            'video/mp4',
            'video/webm',
            'video/mov'
          ];
          maxSize = 50 * 1024 * 1024; // 50MB for attachments
          break;
        case 'sop_step_image':
          allowedTypes = API_CONSTANTS.ALLOWED_IMAGE_TYPES;
          maxSize = API_CONSTANTS.MAX_FILE_SIZE; // 10MB for images
          break;
        case 'user_avatar':
        case 'restaurant_logo':
          allowedTypes = API_CONSTANTS.ALLOWED_IMAGE_TYPES;
          maxSize = 5 * 1024 * 1024; // 5MB for avatars/logos
          break;
        default:
          allowedTypes = API_CONSTANTS.ALLOWED_IMAGE_TYPES;
          maxSize = API_CONSTANTS.MAX_FILE_SIZE;
      }

      // Validate file
      const validation = validateFileUpload(file, allowedTypes, maxSize);
      if (!validation.isValid) {
        return createSuccessResponse(
          { error: validation.error },
          undefined,
          400,
          req.requestId
        );
      }

      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // If sopId is provided, verify it exists and user has access
      if (sopId && category.startsWith('sop_')) {
        const { data: sop, error: sopError } = await client
          .from('sop_documents')
          .select('id, title')
          .eq('id', sopId)
          .eq('restaurant_id', req.auth!.restaurantId)
          .eq('is_active', true)
          .single();

        if (sopError || !sop) {
          return createSuccessResponse(
            { error: 'Invalid SOP ID or access denied' },
            undefined,
            403,
            req.requestId
          );
        }
      }

      // Generate unique file path
      const uploadPath = generateUploadPath(
        req.auth!.restaurantId,
        category,
        file.name
      );

      // Convert File to ArrayBuffer for Supabase upload
      const fileBuffer = await file.arrayBuffer();

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sop-media')
        .upload(uploadPath, fileBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
          metadata: {
            originalName: file.name,
            uploadedBy: req.auth!.user.id,
            restaurantId: req.auth!.restaurantId,
            category,
            sopId: sopId || null,
            ...metadata,
          },
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return createSuccessResponse(
          { error: 'File upload failed' },
          undefined,
          500,
          req.requestId
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sop-media')
        .getPublicUrl(uploadPath);

      if (!urlData?.publicUrl) {
        return createSuccessResponse(
          { error: 'Failed to generate file URL' },
          undefined,
          500,
          req.requestId
        );
      }

      // Generate thumbnail URL for images
      let thumbnailUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        thumbnailUrl = generateThumbnailUrl(urlData.publicUrl, 150);
      }

      // Save file record to database
      const { data: fileRecord, error: dbError } = await client
        .from('uploaded_files')
        .insert({
          filename: uploadData.path.split('/').pop() || file.name,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          url: urlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          bucket: 'sop-media',
          path: uploadData.path,
          category,
          sop_id: sopId,
          restaurant_id: req.auth!.restaurantId,
          uploaded_by: req.auth!.user.id,
          metadata: {
            originalName: file.name,
            ...metadata,
          },
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Try to clean up uploaded file
        await supabase.storage.from('sop-media').remove([uploadData.path]);
        
        return createSuccessResponse(
          { error: 'Failed to save file record' },
          undefined,
          500,
          req.requestId
        );
      }

      const response: FileUploadResponse = {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.original_name,
        mimeType: fileRecord.mime_type,
        size: fileRecord.size,
        url: fileRecord.url,
        thumbnailUrl: fileRecord.thumbnail_url,
        bucket: fileRecord.bucket,
        path: fileRecord.path,
        uploadedBy: fileRecord.uploaded_by,
        createdAt: fileRecord.created_at,
        metadata: fileRecord.metadata,
      };

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'UPLOAD',
        'uploaded_files',
        fileRecord.id,
        undefined,
        fileRecord,
        { 
          action: 'file_uploaded',
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          category,
          sop_id: sopId,
          upload_path: uploadData.path
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      return createSuccessResponse(
        response,
        `File uploaded successfully (${formatFileSize(file.size)})`,
        201,
        req.requestId
      );

    } catch (error) {
      console.error('Error uploading file:', error);
      return createSuccessResponse(
        { error: 'File upload failed' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['file:upload'],
    rateLimit: {
      maxRequests: 20,
      windowMinutes: 1,
    },
    audit: true,
  }
);

/**
 * GET /api/sop/media/upload
 * List uploaded files with filtering and pagination
 */
export const GET = withMiddleware(
  async (req: EnhancedRequest) => {
    const { searchParams } = new URL(req.url);
    
    // Parse filters
    const sopId = searchParams.get('sopId');
    const category = searchParams.get('category');
    const uploadedBy = searchParams.get('uploadedBy');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    try {
      // Create authenticated client
      const client = await createAuthenticatedClient(
        req.auth!.user.id, 
        req.auth!.restaurantId
      );

      // Build query
      let query = client
        .from('uploaded_files')
        .select(`
          *,
          sop:sop_documents(id, title, title_th),
          uploader:auth_users!uploaded_files_uploaded_by_fkey(
            id,
            full_name,
            full_name_th
          )
        `, { count: 'exact' })
        .eq('restaurant_id', req.auth!.restaurantId);

      // Apply filters
      if (sopId) {
        query = query.eq('sop_id', sopId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (uploadedBy) {
        query = query.eq('uploaded_by', uploadedBy);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      // Apply pagination and ordering
      const { data: files, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      // Transform to response format
      const fileResponses: FileUploadResponse[] = (files || []).map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.original_name,
        mimeType: file.mime_type,
        size: file.size,
        url: file.url,
        thumbnailUrl: file.thumbnail_url,
        bucket: file.bucket,
        path: file.path,
        uploadedBy: file.uploaded_by,
        createdAt: file.created_at,
        metadata: file.metadata,
      }));

      // Log audit event
      await logAuditEvent(
        req.auth!.restaurantId,
        req.auth!.user.id,
        'VIEW',
        'uploaded_files',
        undefined,
        undefined,
        undefined,
        { 
          action: 'files_list_viewed',
          filters: { sopId, category, uploadedBy, dateFrom, dateTo },
          pagination: { page, limit, offset },
          result_count: fileResponses.length
        },
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
        req.auth!.sessionId
      );

      const totalPages = Math.ceil((count || 0) / limit);

      return createSuccessResponse(
        {
          data: fileResponses,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        'Files retrieved successfully',
        200,
        req.requestId
      );

    } catch (error) {
      console.error('Error fetching files:', error);
      return createSuccessResponse(
        { error: 'Failed to fetch files' },
        undefined,
        500,
        req.requestId
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: ['file:read'],
    rateLimit: {
      maxRequests: 100,
      windowMinutes: 1,
    },
    audit: true,
  }
);