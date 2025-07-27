/**
 * SOP Analytics Dashboard Page
 * Detailed SOP usage tracking and compliance analytics
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

const SOPAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/sop-analytics-dashboard').then(mod => ({ default: mod.SOPAnalyticsDashboard })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading SOP analytics...</p>
          </div>
        </div>
      </div>
    )
  }
);

interface SOPAnalyticsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: SOPAnalyticsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'analytics' });
  
  return {
    title: t('sop_analytics'),
    description: t('sop_analytics_desc'),
  };
}

export default async function SOPAnalyticsPage({ params }: SOPAnalyticsPageProps) {
  const resolvedParams = await params;
  
  // Validate locale
  const validLocales = ['en', 'th'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SOPAnalyticsDashboard />
    </div>
  );
}