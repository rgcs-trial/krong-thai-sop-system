/**
 * SOP Photo Upload API Route
 * Handles photo uploads for task verification and SOP documentation
 * 
 * POST   /api/uploads/sop-photos    - Upload verification photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  SOPPhotoUploadResponse,
  SOPAuthContext 
} from '@/types/api/sop';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

// Maximum number of files per upload
const MAX_FILES_PER_UPLOAD = 10;

/**
 * Validate uploaded file
 */
function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { isValid: false, error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` };
  }

  return { isValid: true };
}

/**
 * Generate unique filename
 */
function generateFileName(originalName: string, userId: string, sopId: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop() || 'jpg';
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '');
  return `sop-photos/${sopId}/${userId}/${timestamp}-${sanitizedName}`;
}

/**
 * Convert File to Buffer (for server-side processing)
 */
async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Simulate file storage (in production, use cloud storage like AWS S3, Google Cloud Storage, etc.)
 */
async function storeFile(
  file: File, 
  fileName: string, 
  restaurantId: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // In a real implementation, you would upload to cloud storage
    // For this example, we'll simulate storage and return a mock path
    
    const buffer = await fileToBuffer(file);
    
    // Simulate storage delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock file path (in production, this would be the actual cloud storage URL)
    const mockPath = `/uploads/${restaurantId}/${fileName}`;
    
    // In production, you would:
    // 1. Upload to cloud storage (S3, Google Cloud, etc.)
    // 2. Return the actual URL
    // 3. Handle compression/optimization
    // 4. Generate thumbnails if needed
    
    return {
      success: true,
      filePath: mockPath,
    };
  } catch (error) {
    console.error('File storage error:', error);
    return {
      success: false,
      error: 'Failed to store file',
    };
  }
}

/**
 * Validate upload request
 */
function validateUploadRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.sop_id) {
    errors.push('sop_id is required');
  }

  // Validate UUID format for sop_id
  if (data.sop_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.sop_id)) {
    errors.push('sop_id must be a valid UUID');
  }

  // Validate completion_id if provided
  if (data.completion_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.completion_id)) {
    errors.push('completion_id must be a valid UUID');
  }

  if (data.verification_type && !['before', 'during', 'after', 'evidence'].includes(data.verification_type)) {
    errors.push('verification_type must be one of: before, during, after, evidence');
  }

  if (data.caption && typeof data.caption !== 'string') {
    errors.push('caption must be a string');
  }

  if (data.caption && data.caption.length > 500) {
    errors.push('caption must be less than 500 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * POST /api/uploads/sop-photos - Upload verification photos
 */
async function handlePhotoUpload(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    
    // Extract metadata
    const sopId = formData.get('sop_id') as string;
    const completionId = formData.get('completion_id') as string;
    const caption = formData.get('caption') as string;
    const verificationType = formData.get('verification_type') as string;

    // Extract files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    // Validate request data
    const validation = validateUploadRequest({
      sop_id: sopId,
      completion_id: completionId,
      caption,
      verification_type: verificationType,
    });

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Check if files are provided
    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files provided',
        errorCode: 'NO_FILES',
      } as APIResponse, { status: 400 });
    }

    // Check file count limit
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json({
        success: false,
        error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload`,
        errorCode: 'TOO_MANY_FILES',
      } as APIResponse, { status: 400 });
    }

    // Validate each file
    const fileValidationErrors: string[] = [];
    files.forEach((file, index) => {
      const validation = validateFile(file);
      if (!validation.isValid) {
        fileValidationErrors.push(`File ${index + 1}: ${validation.error}`);
      }
    });

    if (fileValidationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'File validation failed',
        details: fileValidationErrors,
        errorCode: 'FILE_VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Verify SOP exists and user has access
    const { data: sop, error: sopError } = await supabaseAdmin
      .from('sop_documents')
      .select('id, title, title_fr')
      .eq('id', sopId)
      .eq('restaurant_id', context.restaurantId)
      .eq('is_active', true)
      .single();

    if (sopError || !sop) {
      return NextResponse.json({
        success: false,
        error: 'SOP document not found or access denied',
        errorCode: 'SOP_NOT_FOUND',
      } as APIResponse, { status: 404 });
    }

    // Verify completion_id if provided
    if (completionId) {
      const { data: completion, error: completionError } = await supabaseAdmin
        .from('user_progress')
        .select('id')
        .eq('id', completionId)
        .eq('user_id', context.userId)
        .eq('restaurant_id', context.restaurantId)
        .single();

      if (completionError || !completion) {
        return NextResponse.json({
          success: false,
          error: 'Completion record not found or access denied',
          errorCode: 'COMPLETION_NOT_FOUND',
        } as APIResponse, { status: 404 });
      }
    }

    // Upload files
    const uploadResults = [];
    const failedUploads = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = generateFileName(file.name, context.userId, sopId);
      
      const uploadResult = await storeFile(file, fileName, context.restaurantId);
      
      if (uploadResult.success && uploadResult.filePath) {
        // Store file metadata in database
        const fileRecord = {
          restaurant_id: context.restaurantId,
          filename: file.name,
          file_path: uploadResult.filePath,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: context.userId,
        };

        const { data: savedFile, error: saveError } = await supabaseAdmin
          .from('uploaded_files')
          .insert(fileRecord)
          .select('*')
          .single();

        if (saveError) {
          console.error('Error saving file metadata:', saveError);
          failedUploads.push({
            filename: file.name,
            error: 'Failed to save file metadata',
          });
        } else {
          uploadResults.push({
            id: savedFile.id,
            filename: savedFile.filename,
            file_path: savedFile.file_path,
            file_size: savedFile.file_size,
            content_type: savedFile.content_type,
            verification_type: verificationType,
          });
        }
      } else {
        failedUploads.push({
          filename: file.name,
          error: uploadResult.error || 'Upload failed',
        });
      }
    }

    // Store upload session metadata
    const uploadSession = {
      restaurant_id: context.restaurantId,
      user_id: context.userId,
      form_type: 'sop_photo_upload',
      form_data: {
        sop_id: sopId,
        completion_id: completionId,
        caption: caption || '',
        verification_type: verificationType || 'evidence',
        uploaded_files: uploadResults.map(file => file.id),
        failed_uploads: failedUploads,
        upload_timestamp: new Date().toISOString(),
      },
      submission_status: failedUploads.length === 0 ? 'completed' : 'partial',
    };

    await supabaseAdmin
      .from('form_submissions')
      .insert(uploadSession);

    // Log metrics
    await supabaseAdmin
      .from('performance_metrics')
      .insert({
        restaurant_id: context.restaurantId,
        metric_type: 'file_upload',
        metric_name: 'sop_photos_uploaded',
        metric_value: uploadResults.length,
        measurement_unit: 'count',
        timestamp: new Date().toISOString(),
        metadata: {
          sop_id: sopId,
          user_id: context.userId,
          total_files: files.length,
          successful_uploads: uploadResults.length,
          failed_uploads: failedUploads.length,
          total_size: files.reduce((sum, file) => sum + file.size, 0),
        },
      });

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'sop_photo_upload',
      sopId,
      null,
      uploadSession.form_data,
      request
    );

    const response: SOPPhotoUploadResponse = {
      success: true,
      data: {
        uploaded_files: uploadResults,
      },
      message: `Successfully uploaded ${uploadResults.length} of ${files.length} files`,
      timestamp: new Date().toISOString(),
    };

    // Add failed uploads info if any
    if (failedUploads.length > 0) {
      (response as any).failed_uploads = failedUploads;
      (response as any).message += `. ${failedUploads.length} uploads failed.`;
    }

    const statusCode = failedUploads.length === 0 ? 201 : 207; // 207 = Multi-Status
    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('Unexpected error in POST /api/uploads/sop-photos:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const POST = withAuth(handlePhotoUpload, PERMISSIONS.SOP.READ, {
  maxRequests: 20,
  windowMs: 60000, // 1 minute - lower limit for file uploads
});

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as APIResponse,
    { status: 405 }
  );
}

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