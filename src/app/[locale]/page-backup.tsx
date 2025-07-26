/**
 * Simple Home Page for Restaurant Krong Thai SOP Management System
 * Minimal version for testing routing
 */

interface HomeProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">
          Restaurant Krong Thai
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          SOP Management System - {locale.toUpperCase()}
        </p>
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            Locale: {locale} | App is working ✓
          </div>
        </div>
      </div>
    </div>
  );
}