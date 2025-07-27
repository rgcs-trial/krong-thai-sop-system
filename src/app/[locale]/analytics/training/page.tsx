/**
 * Training Analytics Dashboard Page
 * Enhanced training analytics with ROI calculations and competency analysis
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

const TrainingAnalyticsDashboard = dynamic(
  () => import('@/components/training/training-analytics-dashboard').then(mod => ({ default: mod.TrainingAnalyticsDashboard })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading training analytics...</p>
          </div>
        </div>
      </div>
    )
  }
);

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
  const validLocales = ['en', 'th'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TrainingAnalyticsDashboard />
    </div>
  );
}