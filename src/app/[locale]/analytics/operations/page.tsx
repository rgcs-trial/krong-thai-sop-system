/**
 * Operational Insights Dashboard Page
 * Restaurant operational efficiency and productivity analytics
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

const OperationalInsightsDashboard = dynamic(
  () => import('@/components/analytics/operational-insights-dashboard').then(mod => ({ default: mod.OperationalInsightsDashboard })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading operational insights...</p>
          </div>
        </div>
      </div>
    )
  }
);

interface OperationalAnalyticsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: OperationalAnalyticsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'analytics' });
  
  return {
    title: t('operational_insights'),
    description: t('operational_insights_desc'),
  };
}

export default async function OperationalAnalyticsPage({ params }: OperationalAnalyticsPageProps) {
  const resolvedParams = await params;
  
  // Validate locale
  const validLocales = ['en', 'th'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <OperationalInsightsDashboard />
    </div>
  );
}