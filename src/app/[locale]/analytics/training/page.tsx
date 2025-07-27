/**
 * Training Analytics Dashboard Page
 * Enhanced training analytics with ROI calculations and competency analysis
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { TrainingAnalyticsDashboard } from '@/components/training/training-analytics-dashboard';

interface TrainingAnalyticsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: TrainingAnalyticsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'analytics' });
  
  return {
    title: t('training_analytics'),
    description: t('training_analytics_desc'),
  };
}

export default async function TrainingAnalyticsPage({ params }: TrainingAnalyticsPageProps) {
  const resolvedParams = await params;
  
  // Validate locale
  const validLocales = ['en', 'fr', 'th'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TrainingAnalyticsDashboard />
    </div>
  );
}