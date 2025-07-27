/**
 * Combined Middleware for Restaurant Krong Thai SOP Management System
 * Handles internationalization and authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n';
// import { createSecurityMiddleware } from '@/lib/security'; // Disabled during development

// Create i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: 'always', // Always include locale prefix for consistent URLs
  alternateLinks: false, // Disable to prevent conflicts
  pathnames: {
    '/': '/',
    '/login': '/login',
    '/dashboard': '/dashboard',
    '/sops': '/sops',
    '/sops/[category]': '/sops/[category]',
    '/sops/[category]/[id]': '/sops/[category]/[id]',
    '/settings': '/settings',
    '/help': '/help',
    '/profile': '/profile'
  }
});

// Create security middleware (disabled during development)
// const securityMiddleware = createSecurityMiddleware({
//   requireAuth: true,
//   auditLog: true,
//   publicPaths: [
//     '/login',
//     '/api/auth/login',
//     '/api/health',
//     '/favicon.ico',
//     '/_next',
//     '/images',
//     '/locales',
//   ],
//   authPaths: [
//     '/dashboard',
//     '/sops',
//     '/api/auth/logout',
//     '/api/auth/refresh',
//     '/api/auth/validate',
//     '/api/sops',
//     '/api/forms',
//   ],
// });

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Handle API routes separately (they don't need i18n)
  if (pathname.startsWith('/api/')) {
    // Apply security middleware for protected API routes
    const protectedApiPaths = [
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/auth/validate',
      '/api/sops',
      '/api/forms',
    ];

    const isProtectedApi = protectedApiPaths.some(path => 
      pathname === path || pathname.startsWith(path + '/')
    );

    if (isProtectedApi) {
      try {
        return await securityMiddleware(request);
      } catch (error) {
        console.error('Security middleware error for API:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
    }

    return NextResponse.next();
  }

  // For non-API routes, apply i18n middleware first
  const intlResponse = intlMiddleware(request);
  
  // If i18n middleware returns a redirect, return it immediately
  if (intlResponse instanceof Response) {
    return intlResponse;
  }

  // Extract locale from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0] || '';
  const isValidLocale = locales.includes(firstSegment as any);

  // If we have a valid locale, extract the path without it
  let pathWithoutLocale = pathname;
  let locale = defaultLocale;

  if (isValidLocale) {
    locale = firstSegment as 'en' | 'fr';
    pathWithoutLocale = '/' + pathSegments.slice(1).join('/');
    if (pathWithoutLocale === '/') {
      pathWithoutLocale = '/';
    }
  }

  // Check if this is a public path (no authentication required)
  const publicPaths = [
    '/',
    '/login',
  ];

  const isPublicPath = publicPaths.some(path => 
    pathWithoutLocale === path
  );

  // Skip security for public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Apply security middleware for protected paths
  const protectedPaths = [
    '/dashboard',
    '/sops',
    '/settings',
    '/help',
    '/profile',
  ];

  const isProtectedPath = protectedPaths.some(path => 
    pathWithoutLocale === path || 
    pathWithoutLocale.startsWith(path + '/')
  );

  if (isProtectedPath) {
    try {
      // Create a modified request for security middleware
      const url = new URL(request.url);
      url.pathname = pathWithoutLocale;
      const modifiedRequest = new NextRequest(url, {
        method: request.method,
        headers: request.headers,
      });

      const securityResponse = await securityMiddleware(modifiedRequest);
      
      // If security middleware returns a redirect
      if (securityResponse.status === 302 || securityResponse.status === 307) {
        const location = securityResponse.headers.get('location');
        if (location) {
          const redirectUrl = new URL(location, request.url);
          // Add locale prefix to the redirect if it's not an API route
          if (!redirectUrl.pathname.startsWith('/api') && !redirectUrl.pathname.startsWith(`/${locale}`)) {
            redirectUrl.pathname = `/${locale}${redirectUrl.pathname}`;
          }
          return NextResponse.redirect(redirectUrl);
        }
      }

      // If it's an error response, redirect to login with locale
      if (securityResponse.status === 401) {
        const loginUrl = new URL(`/${locale}/login`, request.url);
        loginUrl.searchParams.set('redirect', pathWithoutLocale);
        return NextResponse.redirect(loginUrl);
      }

      // For other responses, continue
      return NextResponse.next();
    } catch (error) {
      console.error('Security middleware error:', error);
      
      // Redirect to login on middleware errors
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('error', 'session_error');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Default: continue to next middleware
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes that don't need protection
    // - Static files
    // - Next.js internals
    '/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Include specific API routes that need protection
    '/api/auth/(logout|refresh|validate)',
    '/api/sops/:path*',
    '/api/forms/:path*',
  ],
};