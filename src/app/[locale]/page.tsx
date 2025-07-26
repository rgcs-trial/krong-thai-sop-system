/**
 * Home Page for Restaurant Krong Thai SOP Management System
 * Landing page with navigation to login and main features
 */

import Link from 'next/link';

interface HomeProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-4xl font-bold text-red-600 mb-4">
          Restaurant Krong Thai
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          SOP Management System - {locale.toUpperCase()}
        </p>
        <div className="space-y-4">
          <Link 
            href={`/${locale}/login`}
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Login
          </Link>
          <div className="space-y-2">
            <Link 
              href={`/${locale}/dashboard`}
              className="block text-red-600 hover:text-red-700 transition-colors"
            >
              View Dashboard
            </Link>
            <Link 
              href={`/${locale}/sop-demo`}
              className="block text-gray-600 hover:text-gray-700 transition-colors"
            >
              SOP Demo
            </Link>
          </div>
          <div className="text-sm text-gray-500 mt-8">
            Locale: {locale} | App is working ✓
          </div>
        </div>
      </div>
    </div>
  );
}