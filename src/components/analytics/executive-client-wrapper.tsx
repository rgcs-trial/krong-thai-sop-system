/**
 * Executive Dashboard Client Wrapper
 * Client-side wrapper for executive dashboard to prevent SSR issues
 */

'use client';

import dynamic from 'next/dynamic';

const ExecutiveDashboard = dynamic(
  () => import('@/components/analytics/executive-dashboard').then(mod => ({ default: mod.ExecutiveDashboard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-2 text-gray-600">Loading executive dashboard...</p>
        </div>
      </div>
    )
  }
);

export function ExecutiveClientWrapper() {
  return <ExecutiveDashboard />;
}