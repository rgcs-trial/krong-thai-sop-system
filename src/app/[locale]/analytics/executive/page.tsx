/**
 * Executive Analytics Dashboard Page
 * Comprehensive management-level analytics and reporting
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ExecutiveDashboard } from '@/components/analytics/executive-dashboard';

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
  const validLocales = ['en', 'fr'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ExecutiveDashboard />
    </div>
  );
}