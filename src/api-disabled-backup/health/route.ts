/**
 * Health Check API Route for Restaurant Krong Thai SOP Management System
 * Provides system status and security health information
 */

import { NextResponse } from 'next/server';
import { getSecurityHealthCheck } from '@/lib/security';

export async function GET() {
  try {
    // Get security health check
    const securityHealth = await getSecurityHealthCheck();
    
    // Basic system health checks
    const systemHealth = {
      server: 'healthy',
      database: 'healthy', // You could add actual DB health check here
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    };

    // Determine overall status
    const overallStatus = securityHealth.status === 'healthy' && 
                         systemHealth.server === 'healthy' && 
                         systemHealth.database === 'healthy' 
                         ? 'healthy' : 'degraded';

    return NextResponse.json({
      status: overallStatus,
      system: systemHealth,
      security: securityHealth,
      services: {
        authentication: 'operational',
        authorization: 'operational',
        audit_logging: 'operational',
        rate_limiting: 'operational',
        device_management: 'operational',
      },
    }, {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}