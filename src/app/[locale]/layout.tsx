import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n';
import { Inter, EB_Garamond, Source_Serif_4, Noto_Sans_Thai } from 'next/font/google';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { Toaster } from '@/components/ui/toaster';

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

  // Determine text direction based on locale
  const isRTL = false; // Neither English nor Thai are RTL languages
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
    <div 
      className={`
        ${fontClasses}
        antialiased 
        ${locale === 'th' ? 'font-thai' : 'font-ui'}
        bg-background 
        text-foreground
        touch-manipulation
        select-none
        overflow-x-hidden
        min-h-screen
      `}
      dir={direction}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {children}
      <PWAInstallPrompt />
      <Toaster />
    </div>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}