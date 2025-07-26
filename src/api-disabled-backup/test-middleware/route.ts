/**
 * Test endpoint to verify middleware functionality
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  return NextResponse.json({
    message: 'Middleware test endpoint',
    pathname,
    searchParams: Object.fromEntries(searchParams.entries()),
    headers: {
      'user-agent': request.headers.get('user-agent'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-user-id': request.headers.get('x-user-id'),
      'x-user-role': request.headers.get('x-user-role'),
      'x-restaurant-id': request.headers.get('x-restaurant-id'),
    },
    timestamp: new Date().toISOString(),
  });
}