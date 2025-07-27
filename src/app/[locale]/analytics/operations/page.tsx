/**
 * Operational Insights Dashboard Page
 * Restaurant operational efficiency and productivity analytics
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OperationalInsightsDashboard } from '@/components/analytics/operational-insights-dashboard';

interface OperationalAnalyticsPageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: OperationalAnalyticsPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'analytics' });
  
  return {
    title: t('operational_insights'),
    description: t('operational_insights_desc'),
  };
}

export default async function OperationalAnalyticsPage({ params }: OperationalAnalyticsPageProps) {
  // Validate locale
  const validLocales = ['en', 'fr', 'th'];
  if (!validLocales.includes(params.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <OperationalInsightsDashboard />
    </div>
  );
}