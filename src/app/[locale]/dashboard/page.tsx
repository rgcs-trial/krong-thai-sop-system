/**
 * Dashboard Page for Restaurant Krong Thai SOP Management System
 * Main landing page after authentication with tablet optimization
 */

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
// Optimize icon imports for tree shaking
import { Shield } from 'lucide-react';

interface DashboardPageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Create a dynamic component that won't be rendered during SSR
const DashboardContent = dynamic(() => import('./dashboard-content'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading Dashboard...</p>
      </div>
    </div>
  ),
});

export default function DashboardPage({ params }: DashboardPageProps) {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const resolveParams = async () => {
      const { locale: paramLocale } = await params;
      setLocale(paramLocale);
    };
    
    resolveParams();
  }, [params]);

  return <DashboardContent locale={locale} />;
}