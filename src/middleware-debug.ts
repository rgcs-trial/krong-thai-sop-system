/**
 * Simple Middleware for Testing i18n Routing
 */

import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n';

// Create simple i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // Add explicit pathname matching
  pathnames: {
    '/': '/',
    '/login': '/login',
    '/dashboard': '/dashboard',
  }
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('Middleware - processing path:', pathname);

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    console.log('Middleware - skipping static/internal path');
    return NextResponse.next();
  }

  // Apply i18n middleware
  console.log('Middleware - applying i18n middleware');
  const response = intlMiddleware(request);
  console.log('Middleware - i18n response status:', response?.status);
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};