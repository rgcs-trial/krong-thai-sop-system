/**
 * CSP Violation Reporting Endpoint
 * Restaurant Krong Thai SOP Management System
 * 
 * Handles Content Security Policy violation reports for security monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/security/security-headers';

export async function POST(request: NextRequest) {
  try {
    // Parse CSP violation report
    const violation = await request.json();
    
    // Extract client information
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log the security event
    logSecurityEvent({
      type: 'csp_violation',
      source: 'csp_report_endpoint',
      details: {
        violation,
        blockedURI: violation['blocked-uri'],
        documentURI: violation['document-uri'],
        violatedDirective: violation['violated-directive'],
        originalPolicy: violation['original-policy'],
        referrer: violation.referrer,
        scriptSample: violation['script-sample'],
        statusCode: violation['status-code']
      },
      timestamp: new Date(),
      userAgent,
      ip
    });

    // In production, you might want to:
    // 1. Store violations in a database for analysis
    // 2. Send alerts if violation rate exceeds threshold
    // 3. Automatically update CSP policy based on legitimate violations
    // 4. Integrate with SIEM systems

    // Return success response (no content needed)
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Failed to process CSP violation report:', error);
    
    // Log the error as a security event
    logSecurityEvent({
      type: 'suspicious_activity',
      source: 'csp_report_endpoint',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        reason: 'malformed_csp_report'
      },
      timestamp: new Date(),
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    });

    return new NextResponse('Bad Request', { status: 400 });
  }
}

// Only allow POST requests
export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function PUT() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function DELETE() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function PATCH() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}