import type { Metadata, Viewport } from "next";
import { locales } from "@/lib/i18n";
import { Inter, EB_Garamond, Source_Serif_4, Noto_Sans_Thai } from 'next/font/google';
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Restaurant Krong Thai - SOP Management System",
  description: "Standard Operating Procedures Management System for Restaurant Krong Thai",
  keywords: ["restaurant", "sop", "management", "krong thai", "procedures"],
  authors: [{ name: "Restaurant Krong Thai" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Krong Thai SOP",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Krong Thai SOP",
    "application-name": "Krong Thai SOP",
    "msapplication-TileColor": "#E31B23",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Optimize for tablet usage
  themeColor: "#E31B23",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Apply font classes
  const fontClasses = [
    inter.variable,
    ebGaramond.variable,
    sourceSerif4.variable,
    notoSans.variable,
    'font-ui', // Default to Inter for UI elements
  ].join(' ');

  return (
    <html lang="en" suppressHydrationWarning className={fontClasses}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#E31B23" />
      </head>
      <body 
        className="font-sans antialiased bg-background text-foreground touch-manipulation"
        style={{
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
        }}
      >
        {children}
      </body>
    </html>
  );
}
