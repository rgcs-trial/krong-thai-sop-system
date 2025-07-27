/**
 * Real-time Monitoring Dashboard Page
 * Live system monitoring and alerts management
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

const RealtimeMonitoringDashboard = dynamic(
  () => import('@/components/analytics/realtime-monitoring-dashboard').then(mod => ({ default: mod.RealtimeMonitoringDashboard })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading monitoring dashboard...</p>
          </div>
        </div>
      </div>
    )
  }
);

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
  const validLocales = ['en', 'th'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <RealtimeMonitoringDashboard />
    </div>
  );
}