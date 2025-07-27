/**
 * SOP Analytics Dashboard Page
 * Detailed SOP usage tracking and compliance analytics
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SOPAnalyticsClientWrapper } from '@/components/analytics/sop-analytics-client-wrapper';

export const dynamic = 'force-dynamic';

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
      <SOPAnalyticsClientWrapper />
    </div>
  );
}