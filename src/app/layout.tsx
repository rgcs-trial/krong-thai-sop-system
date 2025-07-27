import type { Metadata, Viewport } from "next";
import { locales } from "@/lib/i18n";
import "./globals.css";

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
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
