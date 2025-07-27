/**
 * Operational Insights Dashboard Page
 * Restaurant operational efficiency and productivity analytics
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OperationalInsightsDashboard } from '@/components/analytics/operational-insights-dashboard';

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
  const validLocales = ['en', 'fr'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <OperationalInsightsDashboard />
    </div>
  );
}