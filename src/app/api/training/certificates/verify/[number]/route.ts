/**
 * Certificate Verification API
 * GET /api/training/certificates/verify/[number] - Verify certificate by number
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

interface RouteParams {
  params: Promise<{
    number: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    const resolvedParams = await params;
    const certificateNumber = resolvedParams.number;
    
    if (!certificateNumber) {
      return NextResponse.json({ error: 'Certificate number is required' }, { status: 400 });
    }

    // This is a public endpoint for certificate verification
    // No authentication required for basic verification

    // Get certificate with related data
    const { data: certificate, error } = await supabase
      .from('training_certificates')
      .select(`
        *,
        module:training_modules(
          id,
          title,
          title_th,
          restaurant:restaurants(
            id,
            name,
            name_th,
            address,
            phone,
            email
          ),
          sop_document:sop_documents(
            id,
            title,
            title_th,
            category:sop_categories(
              id,
              name,
              name_th,
              code
            )
          )
        ),
        assessment:training_assessments(
          id,
          score_percentage,
          completed_at,
          time_spent_minutes
        ),
        user:auth_users(
          id,
          email,
          full_name
        )
      `)
      .eq('certificate_number', certificateNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false,
          error: 'Certificate not found',
          valid: false 
        }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to verify certificate' }, { status: 500 });
    }

    // Check certificate validity
    const now = new Date();
    const expiresAt = new Date(certificate.expires_at);
    const isExpired = expiresAt < now;
    const isRevoked = certificate.status === 'revoked';
    const isValid = certificate.status === 'active' && !isExpired && !isRevoked;

    // Calculate days until expiry
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Prepare verification result
    const verificationResult = {
      valid: isValid,
      certificate_number: certificate.certificate_number,
      status: certificate.status,
      issued_at: certificate.issued_at,
      expires_at: certificate.expires_at,
      is_expired: isExpired,
      is_revoked: isRevoked,
      days_until_expiry: daysUntilExpiry,
      
      // Certificate holder information (limited for privacy)
      holder: {
        name: certificate.user?.full_name || 'Unknown',
        // Don't expose email in public verification
      },
      
      // Training information
      training: {
        module: {
          title: certificate.module?.title,
          title_th: certificate.module?.title_th,
          category: certificate.module?.sop_document?.category
        },
        restaurant: {
          name: certificate.module?.restaurant?.name,
          name_th: certificate.module?.restaurant?.name_th
        },
        assessment: {
          score_percentage: certificate.assessment?.score_percentage,
          completed_at: certificate.assessment?.completed_at
        }
      },
      
      // Revocation info (if applicable)
      revocation: isRevoked ? {
        revoked_at: certificate.revoked_at,
        reason: certificate.revoked_reason
      } : null,
      
      // Verification metadata
      verified_at: new Date().toISOString(),
      verification_source: 'Krong Thai SOP Management System'
    };

    return NextResponse.json({
      success: true,
      data: verificationResult
    });

  } catch (error) {
    console.error('Certificate verification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}