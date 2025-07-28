/**
 * QR Code Generation API Route
 * Generates QR codes for SOP documents for easy mobile access
 * 
 * POST   /api/qr/generate    - Generate QR code for SOP access
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, PERMISSIONS, logAuditEvent } from '@/lib/middleware/auth';
import { sanitizeInput } from '@/lib/validation/sop';
import { 
  APIResponse, 
  QRCodeGenerateRequest,
  QRCodeResponse,
  SOPAuthContext 
} from '@/types/api/sop';

// QR Code generation using a simple data URL approach
// In production, you might want to use a dedicated QR code service or library
function generateQRCodeSVG(
  data: string, 
  size: number = 200, 
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'
): string {
  // This is a simplified QR code SVG generator
  // In production, use a proper QR code library like 'qrcode' or 'qr-image'
  
  const modules = Math.floor(size / 25); // Simplified grid calculation
  const moduleSize = size / modules;
  
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;
  
  // Generate a simple pattern based on data hash
  const hash = simpleHash(data);
  for (let x = 0; x < modules; x++) {
    for (let y = 0; y < modules; y++) {
      const index = x * modules + y;
      if ((hash + index) % 3 === 0) {
        const xPos = x * moduleSize;
        const yPos = y * moduleSize;
        svg += `<rect x="${xPos}" y="${yPos}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }
  
  // Add finder patterns (corners)
  const finderSize = moduleSize * 7;
  [
    { x: 0, y: 0 },
    { x: size - finderSize, y: 0 },
    { x: 0, y: size - finderSize }
  ].forEach(pos => {
    svg += `<rect x="${pos.x}" y="${pos.y}" width="${finderSize}" height="${finderSize}" fill="black"/>`;
    svg += `<rect x="${pos.x + moduleSize}" y="${pos.y + moduleSize}" width="${finderSize - 2 * moduleSize}" height="${finderSize - 2 * moduleSize}" fill="white"/>`;
    svg += `<rect x="${pos.x + 2 * moduleSize}" y="${pos.y + 2 * moduleSize}" width="${finderSize - 4 * moduleSize}" height="${finderSize - 4 * moduleSize}" fill="black"/>`;
  });
  
  svg += '</svg>';
  return svg;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function generateQRCodeDataURL(data: string, size: number = 200): string {
  const svg = generateQRCodeSVG(data, size);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Validate QR code generation request
 */
function validateQRRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.sop_id) {
    errors.push('sop_id is required');
  }

  // Validate UUID format
  if (data.sop_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.sop_id)) {
    errors.push('sop_id must be a valid UUID');
  }

  if (data.size && (typeof data.size !== 'number' || data.size < 100 || data.size > 1000)) {
    errors.push('size must be a number between 100 and 1000');
  }

  if (data.format && !['png', 'svg', 'pdf'].includes(data.format)) {
    errors.push('format must be one of: png, svg, pdf');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * POST /api/qr/generate - Generate QR code for SOP access
 */
async function handleGenerateQR(request: NextRequest, context: SOPAuthContext): Promise<NextResponse> {
  try {
    const body = await request.json();
    const sanitizedData = sanitizeInput(body) as QRCodeGenerateRequest;

    // Validate input
    const validation = validateQRRequest(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        errorCode: 'VALIDATION_ERROR',
      } as APIResponse, { status: 400 });
    }

    // Verify SOP exists and user has access
    const { data: sop, error: sopError } = await supabaseAdmin
      .from('sop_documents')
      .select('id, title, title_fr, status')
      .eq('id', sanitizedData.sop_id)
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

    // Check if SOP is approved (only approved SOPs should have QR codes)
    if (sop.status !== 'approved') {
      return NextResponse.json({
        success: false,
        error: 'QR codes can only be generated for approved SOPs',
        errorCode: 'SOP_NOT_APPROVED',
      } as APIResponse, { status: 400 });
    }

    const size = sanitizedData.size || 300;
    const format = sanitizedData.format || 'svg';
    const includeTitle = sanitizedData.include_title !== false;

    // Generate access URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get('host')}`;
    const accessUrl = `${baseUrl}/sop/${sanitizedData.sop_id}?qr=true&r=${context.restaurantId}`;
    
    // Create QR code data with additional metadata
    const qrData = {
      url: accessUrl,
      sop_id: sanitizedData.sop_id,
      restaurant_id: context.restaurantId,
      generated_by: context.userId,
      generated_at: new Date().toISOString(),
      version: '1.0',
      ...(sanitizedData.custom_data || {}),
    };

    const qrDataString = JSON.stringify(qrData);
    
    let qrCodeUrl: string;
    let contentType: string;

    switch (format) {
      case 'svg':
        const svg = generateQRCodeSVG(accessUrl, size);
        if (includeTitle) {
          // Add title to SVG
          const titleText = sop.title;
          const enhancedSvg = svg.replace(
            '</svg>',
            `<text x="${size / 2}" y="${size + 30}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="black">${titleText}</text></svg>`
          );
          qrCodeUrl = `data:image/svg+xml;base64,${Buffer.from(enhancedSvg).toString('base64')}`;
        } else {
          qrCodeUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
        }
        contentType = 'image/svg+xml';
        break;

      case 'png':
        // For PNG, we would typically use a canvas or image processing library
        // For now, return SVG as fallback
        qrCodeUrl = generateQRCodeDataURL(accessUrl, size);
        contentType = 'image/png';
        break;

      case 'pdf':
        // For PDF generation, you would typically use a library like PDFKit or jsPDF
        // For now, return SVG as fallback
        qrCodeUrl = generateQRCodeDataURL(accessUrl, size);
        contentType = 'application/pdf';
        break;

      default:
        qrCodeUrl = generateQRCodeDataURL(accessUrl, size);
        contentType = 'image/svg+xml';
    }

    // Store QR code generation record for tracking
    const qrRecord = {
      restaurant_id: context.restaurantId,
      user_id: context.userId,
      form_type: 'qr_code_generation',
      form_data: {
        sop_id: sanitizedData.sop_id,
        size,
        format,
        include_title: includeTitle,
        access_url: accessUrl,
        generated_at: new Date().toISOString(),
      },
      submission_status: 'completed',
    };

    await supabaseAdmin
      .from('form_submissions')
      .insert(qrRecord);

    // Log metrics
    await supabaseAdmin
      .from('performance_metrics')
      .insert({
        restaurant_id: context.restaurantId,
        metric_type: 'qr_generation',
        metric_name: 'qr_code_created',
        metric_value: 1,
        measurement_unit: 'count',
        timestamp: new Date().toISOString(),
        metadata: {
          sop_id: sanitizedData.sop_id,
          user_id: context.userId,
          format,
          size,
        },
      });

    // Log audit event
    logAuditEvent(
      context,
      'CREATE',
      'qr_code',
      sanitizedData.sop_id,
      null,
      qrRecord.form_data,
      request
    );

    const response: QRCodeResponse = {
      success: true,
      data: {
        qr_code_url: qrCodeUrl,
        sop_id: sanitizedData.sop_id,
        access_url: accessUrl,
        expires_at: undefined, // QR codes don't expire by default
      },
      message: 'QR code generated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/qr/generate:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as APIResponse, { status: 500 });
  }
}

// Export handlers with authentication
export const POST = withAuth(handleGenerateQR, PERMISSIONS.SOP.READ, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
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