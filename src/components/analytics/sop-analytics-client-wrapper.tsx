/**
 * SOP Analytics Client Wrapper
 * Client-side wrapper for SOP analytics dashboard to prevent SSR issues
 */

'use client';

import dynamic from 'next/dynamic';

const SOPAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/sop-analytics-dashboard').then(mod => ({ default: mod.SOPAnalyticsDashboard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-2 text-gray-600">Loading SOP analytics...</p>
        </div>
      </div>
    )
  }
);

export function SOPAnalyticsClientWrapper() {
  return <SOPAnalyticsDashboard />;
}