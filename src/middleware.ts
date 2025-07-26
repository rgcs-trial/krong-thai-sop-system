import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n';

export default createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};