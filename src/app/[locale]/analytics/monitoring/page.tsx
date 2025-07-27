/**
 * Real-time Monitoring Dashboard Page
 * Live system monitoring and alerts management
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { RealtimeMonitoringDashboard } from '@/components/analytics/realtime-monitoring-dashboard';

interface MonitoringAnalyticsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: MonitoringAnalyticsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'analytics' });
  
  return {
    title: t('realtime_monitoring'),
    description: t('realtime_monitoring_desc'),
  };
}

export default async function MonitoringAnalyticsPage({ params }: MonitoringAnalyticsPageProps) {
  const resolvedParams = await params;
  
  // Validate locale
  const validLocales = ['en', 'fr', 'th'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <RealtimeMonitoringDashboard />
    </div>
  );
}