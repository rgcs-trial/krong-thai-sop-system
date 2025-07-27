/**
 * SOP Analytics Dashboard Page
 * Detailed SOP usage tracking and compliance analytics
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { SOPAnalyticsDashboard } from '@/components/analytics/sop-analytics-dashboard';

interface SOPAnalyticsPageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: SOPAnalyticsPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'analytics' });
  
  return {
    title: t('sop_analytics'),
    description: t('sop_analytics_desc'),
  };
}

export default async function SOPAnalyticsPage({ params }: SOPAnalyticsPageProps) {
  // Validate locale
  const validLocales = ['en', 'fr', 'th'];
  if (!validLocales.includes(params.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SOPAnalyticsDashboard />
    </div>
  );
}