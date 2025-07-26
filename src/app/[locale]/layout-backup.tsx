import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n';
import { Inter, EB_Garamond, Source_Serif_4, Noto_Sans_Thai } from 'next/font/google';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { Toaster } from '@/components/ui/toaster';
// PWA provider will be added later

// Font configurations following brand guidelines
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif-4',
  display: 'swap',
});

const notoSans = Noto_Sans_Thai({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-noto-sans',
  display: 'swap',
});

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();

  // Determine text direction based on locale
  const isRTL = false; // Neither English nor French are RTL languages
  const direction = isRTL ? 'rtl' : 'ltr';

  // Apply appropriate font classes based on locale
  const fontClasses = [
    inter.variable,
    ebGaramond.variable,
    sourceSerif4.variable,
    notoSans.variable,
    'font-ui', // Default to Inter for UI elements
  ].join(' ');

  return (
    <html lang={locale} dir={direction} className={fontClasses}>
      <head>
        {/* Preload critical fonts for better performance */}
        <link
          rel="preload"
          href="/fonts/noto-sans-thai-v20-thai-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* PWA and Tablet-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Krong Thai SOP" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#E31B23" />
        <meta name="background-color" content="#FCFCFC" />
        
        {/* PWA Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-touch-icon-ipad.png" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#E31B23" />
        <meta name="msapplication-TileImage" content="/icons/ms-tile-144x144.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Preload critical PWA resources */}
        <link rel="preload" href="/sw.js" as="script" />
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
        
        {/* Performance optimizations */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Tablet viewport optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* Touch interaction optimizations */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body 
        className={`
          antialiased 
          ${locale === 'th' ? 'font-thai' : 'font-ui'}
          bg-background 
          text-foreground
          touch-manipulation
          select-none
          overflow-x-hidden
        `}
        style={{
          // Optimize for tablet touch interactions
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        <NextIntlClientProvider messages={messages}>
          {/* PWA Provider will be added later */}
          {children}
          <PWAInstallPrompt />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// Generate static params for all supported locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}