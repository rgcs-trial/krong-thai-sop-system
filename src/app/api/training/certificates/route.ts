/**
 * Training Certificates API
 * GET /api/training/certificates - Get user certificates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
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

    // Determine target user ID (managers can view other users' certificates)
    const targetUserId = searchParams.get('user_id') || session.user.id;
    
    // Check permissions for viewing other users' certificates
    if (targetUserId !== session.user.id && !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('training_certificates')
      .select(`
        *,
        module:training_modules(
          id,
          title,
          title_th,
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
          completed_at
        ),
        user:auth_users(
          id,
          email,
          full_name
        )
      `)
      .eq('user_id', targetUserId)
      .order('issued_at', { ascending: false });

    // Apply filters
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }

    const moduleId = searchParams.get('module_id');
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    }

    // Filter by expiration status
    const expirationFilter = searchParams.get('expiration');
    if (expirationFilter === 'expiring_soon') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query = query.lte('expires_at', thirtyDaysFromNow.toISOString());
    } else if (expirationFilter === 'expired') {
      query = query.lt('expires_at', new Date().toISOString());
    }

    const { data: certificates, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
    }

    // Process certificates to add computed fields
    const processedCertificates = certificates?.map(cert => {
      const now = new Date();
      const expiresAt = new Date(cert.expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...cert,
        is_expired: expiresAt < now,
        is_expiring_soon: daysUntilExpiry <= 30 && daysUntilExpiry > 0,
        days_until_expiry: daysUntilExpiry,
        can_renew: daysUntilExpiry <= 60 // Allow renewal 60 days before expiry
      };
    }) || [];

    // Get summary statistics
    const stats = {
      total: processedCertificates.length,
      active: processedCertificates.filter(c => c.status === 'active' && !c.is_expired).length,
      expired: processedCertificates.filter(c => c.is_expired || c.status === 'expired').length,
      expiring_soon: processedCertificates.filter(c => c.is_expiring_soon).length,
      revoked: processedCertificates.filter(c => c.status === 'revoked').length
    };

    return NextResponse.json({
      success: true,
      data: processedCertificates,
      stats,
      total: processedCertificates.length
    });

  } catch (error) {
    console.error('Training certificates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}