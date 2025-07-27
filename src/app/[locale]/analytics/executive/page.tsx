/**
 * Executive Analytics Dashboard Page
 * Comprehensive management-level analytics and reporting
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

const ExecutiveDashboard = dynamic(
  () => import('@/components/analytics/executive-dashboard').then(mod => ({ default: mod.ExecutiveDashboard })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading executive dashboard...</p>
          </div>
        </div>
      </div>
    )
  }
);

interface ExecutiveAnalyticsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: ExecutiveAnalyticsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'analytics' });
  
  return {
    title: t('executive_dashboard'),
    description: t('executive_dashboard_desc'),
  };
}

export default async function ExecutiveAnalyticsPage({ params }: ExecutiveAnalyticsPageProps) {
  const resolvedParams = await params;
  
  // Validate locale
  const validLocales = ['en', 'th'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ExecutiveDashboard />
    </div>
  );
}