/**
 * Training Analytics Dashboard Page
 * Enhanced training analytics with ROI calculations and competency analysis
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { TrainingAnalyticsDashboard } from '@/components/training/training-analytics-dashboard';

interface TrainingAnalyticsPageProps {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: TrainingAnalyticsPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'analytics' });
  
  return {
    title: t('training_analytics'),
    description: t('training_analytics_desc'),
  };
}

export default async function TrainingAnalyticsPage({ params }: TrainingAnalyticsPageProps) {
  // Validate locale
  const validLocales = ['en', 'fr', 'th'];
  if (!validLocales.includes(params.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TrainingAnalyticsDashboard />
    </div>
  );
}