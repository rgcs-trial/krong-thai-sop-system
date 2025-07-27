/**
 * Executive Analytics Dashboard Page
 * Comprehensive management-level analytics and reporting
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ExecutiveDashboard } from '@/components/analytics/executive-dashboard';

interface ExecutiveAnalyticsPageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: ExecutiveAnalyticsPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'analytics' });
  
  return {
    title: t('executive_dashboard'),
    description: t('executive_dashboard_desc'),
  };
}

export default async function ExecutiveAnalyticsPage({ params }: ExecutiveAnalyticsPageProps) {
  // Validate locale
  const validLocales = ['en', 'fr', 'th'];
  if (!validLocales.includes(params.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ExecutiveDashboard />
    </div>
  );
}