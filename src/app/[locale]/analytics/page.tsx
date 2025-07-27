/**
 * Analytics Dashboard Main Page
 * Comprehensive analytics hub with navigation to all analytics modules
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ExecutiveDashboard } from '@/components/analytics/executive-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Activity, 
  TrendingUp,
  Eye,
  Clock,
  Shield,
  Award,
  Target
} from 'lucide-react';

interface AnalyticsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: AnalyticsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'analytics' });
  
  return {
    title: t('analytics_dashboard'),
    description: t('analytics_dashboard_desc'),
  };
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'analytics' });
  
  // Validate locale
  const validLocales = ['en', 'fr', 'th'];
  if (!validLocales.includes(resolvedParams.locale)) {
    notFound();
  }

  // Quick stats for overview cards
  const quickStats = [
    {
      title: t('total_sop_views'),
      value: '12,489',
      change: '+12.5%',
      trend: 'up' as const,
      icon: <Eye className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('active_users'),
      value: '42',
      change: '+5.2%',
      trend: 'up' as const,
      icon: <Users className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('compliance_rate'),
      value: '94.2%',
      change: '+2.1%',
      trend: 'up' as const,
      icon: <Shield className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: t('training_completion'),
      value: '87.5%',
      change: '-1.3%',
      trend: 'down' as const,
      icon: <Award className="h-5 w-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const analyticsModules = [
    {
      title: t('executive_dashboard'),
      description: t('executive_dashboard_desc'),
      href: `/analytics/executive`,
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'bg-blue-500',
      features: [t('kpi_metrics'), t('revenue_trends'), t('performance_overview')],
    },
    {
      title: t('sop_analytics'),
      description: t('sop_analytics_desc'),
      href: `/analytics/sop`,
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-green-500',
      features: [t('usage_tracking'), t('compliance_monitoring'), t('content_effectiveness')],
    },
    {
      title: t('training_analytics'),
      description: t('training_analytics_desc'),
      href: `/analytics/training`,
      icon: <Users className="h-6 w-6" />,
      color: 'bg-purple-500',
      features: [t('progress_tracking'), t('roi_analysis'), t('competency_gaps')],
    },
    {
      title: t('operational_insights'),
      description: t('operational_insights_desc'),
      href: `/analytics/operations`,
      icon: <Target className="h-6 w-6" />,
      color: 'bg-orange-500',
      features: [t('efficiency_metrics'), t('cost_analysis'), t('productivity_insights')],
    },
    {
      title: t('realtime_monitoring'),
      description: t('realtime_monitoring_desc'),
      href: `/analytics/monitoring`,
      icon: <Activity className="h-6 w-6" />,
      color: 'bg-red-500',
      features: [t('live_performance'), t('system_alerts'), t('device_status')],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          {t('analytics_hub')}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {t('analytics_hub_desc')}
        </p>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold">{stat.value}</span>
                    <Badge 
                      variant={stat.trend === 'up' ? 'default' : 'secondary'}
                      className={stat.trend === 'up' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}
                    >
                      {stat.change}
                    </Badge>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor} ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Modules Grid */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('analytics_modules')}
          </h2>
          <p className="text-gray-600">
            {t('choose_analytics_module')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyticsModules.map((module, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-3 rounded-lg ${module.color} text-white group-hover:scale-110 transition-transform`}>
                    {module.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="space-y-2">
                    {module.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => window.location.href = `/${resolvedParams.locale}${module.href}`}
                  >
                    {t('view_dashboard')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Executive Dashboard Preview */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('executive_overview')}
          </h2>
          <p className="text-gray-600">
            {t('executive_overview_desc')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
              {t('quick_insights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExecutiveDashboard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}