/**
 * Realtime Monitoring Client Wrapper
 * Client-side wrapper for realtime monitoring dashboard to prevent SSR issues
 */

'use client';

import dynamic from 'next/dynamic';

const RealtimeMonitoringDashboard = dynamic(
  () => import('@/components/analytics/realtime-monitoring-dashboard').then(mod => ({ default: mod.RealtimeMonitoringDashboard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-2 text-gray-600">Loading monitoring dashboard...</p>
        </div>
      </div>
    )
  }
);

export function RealtimeMonitoringClientWrapper() {
  return <RealtimeMonitoringDashboard />;
}