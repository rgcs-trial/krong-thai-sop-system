/**
 * Executive Dashboard Component
 * Comprehensive analytics and reporting for restaurant management
 * Features real-time KPIs, interactive charts, and operational insights
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  BookOpen,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Activity,
  Award,
  Eye,
  FileText,
  Star,
  Zap,
  Shield,
  Settings,
  Bell,
  ChevronUp,
  ChevronDown,
  TrendingRight
} from 'lucide-react';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/hooks/use-toast';

import { useTrainingStore } from '@/lib/stores/training-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface ExecutiveDashboardProps {
  className?: string;
}

interface KPIMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency' | 'time';
  icon: React.ReactNode;
  color: string;
  target?: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  date?: string;
  [key: string]: any;
}

interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  action?: string;
}

// Chart color palette
const CHART_COLORS = [
  '#E31B23', // Primary red
  '#D4AF37', // Saffron
  '#008B8B', // Jade
  '#231F20', // Black
  '#D2B48C', // Beige
  '#FF6B6B', // Light red
  '#4ECDC4', // Light teal
  '#45B7D1', // Light blue
  '#F9CA24', // Yellow
  '#6C5CE7', // Purple
];

export function ExecutiveDashboard({ className }: ExecutiveDashboardProps) {
  const { t, locale } = useI18n();
  const { user } = useAuthStore();
  
  // State management
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState('overview');

  // Mock data - in production, this would come from APIs
  const kpiMetrics = useMemo<KPIMetric[]>(() => [
    {
      id: 'total_revenue',
      title: t('analytics.total_revenue'),
      value: '฿125,430',
      change: 12.5,
      trend: 'up',
      format: 'currency',
      icon: <DollarSign className="h-5 w-5" />,
      color: 'bg-green-500',
      target: 150000,
    },
    {
      id: 'sop_compliance',
      title: t('analytics.sop_compliance'),
      value: 94.2,
      change: 2.1,
      trend: 'up',
      format: 'percentage',
      icon: <Shield className="h-5 w-5" />,
      color: 'bg-blue-500',
      target: 95,
    },
    {
      id: 'training_completion',
      title: t('analytics.training_completion'),
      value: 87.5,
      change: -1.3,
      trend: 'down',
      format: 'percentage',
      icon: <Award className="h-5 w-5" />,
      color: 'bg-purple-500',
      target: 90,
    },
    {
      id: 'active_users',
      title: t('analytics.active_users'),
      value: 42,
      change: 5.2,
      trend: 'up',
      format: 'number',
      icon: <Users className="h-5 w-5" />,
      color: 'bg-orange-500',
      target: 50,
    },
    {
      id: 'avg_session_time',
      title: t('analytics.avg_session_time'),
      value: '18m 32s',
      change: 3.7,
      trend: 'up',
      format: 'time',
      icon: <Clock className="h-5 w-5" />,
      color: 'bg-indigo-500',
    },
    {
      id: 'customer_satisfaction',
      title: t('analytics.customer_satisfaction'),
      value: 4.7,
      change: 0.2,
      trend: 'up',
      format: 'number',
      icon: <Star className="h-5 w-5" />,
      color: 'bg-yellow-500',
      target: 4.8,
    },
  ], [t]);

  // Chart data
  const revenueData = useMemo<ChartDataPoint[]>(() => [
    { name: 'Jan', revenue: 95000, expenses: 78000, profit: 17000 },
    { name: 'Feb', revenue: 105000, expenses: 82000, profit: 23000 },
    { name: 'Mar', revenue: 115000, expenses: 85000, profit: 30000 },
    { name: 'Apr', revenue: 125000, expenses: 88000, profit: 37000 },
    { name: 'May', revenue: 135000, expenses: 90000, profit: 45000 },
    { name: 'Jun', revenue: 125430, expenses: 87500, profit: 37930 },
  ], []);

  const sopUsageData = useMemo<ChartDataPoint[]>(() => [
    { category: 'Food Safety', views: 1250, compliance: 96 },
    { category: 'Kitchen Ops', views: 980, compliance: 92 },
    { category: 'Service', views: 875, compliance: 94 },
    { category: 'Cleaning', views: 750, compliance: 98 },
    { category: 'Inventory', views: 650, compliance: 89 },
    { category: 'Emergency', views: 425, compliance: 87 },
  ], []);

  const trainingTrendsData = useMemo<ChartDataPoint[]>(() => [
    { date: '2024-01-01', completions: 12, enrollments: 15, efficiency: 80 },
    { date: '2024-01-08', completions: 18, enrollments: 22, efficiency: 82 },
    { date: '2024-01-15', completions: 25, enrollments: 28, efficiency: 89 },
    { date: '2024-01-22', completions: 32, enrollments: 35, efficiency: 91 },
    { date: '2024-01-29', completions: 28, enrollments: 32, efficiency: 88 },
  ], []);

  const performanceDistribution = useMemo<ChartDataPoint[]>(() => [
    { name: 'Excellent (90-100%)', value: 35, color: '#10B981' },
    { name: 'Good (80-89%)', value: 28, color: '#3B82F6' },
    { name: 'Fair (70-79%)', value: 22, color: '#F59E0B' },
    { name: 'Needs Improvement (<70%)', value: 15, color: '#EF4444' },
  ], []);

  // Load alerts
  useEffect(() => {
    const mockAlerts: AlertItem[] = [
      {
        id: '1',
        type: 'critical',
        title: t('alerts.certificate_expiring'),
        description: t('alerts.certificate_expiring_desc', { count: 3 }),
        timestamp: '5 minutes ago',
        action: 'review_certificates',
      },
      {
        id: '2',
        type: 'warning',
        title: t('alerts.low_compliance'),
        description: t('alerts.low_compliance_desc', { department: 'Kitchen' }),
        timestamp: '15 minutes ago',
        action: 'view_compliance',
      },
      {
        id: '3',
        type: 'info',
        title: t('alerts.new_training_available'),
        description: t('alerts.new_training_available_desc'),
        timestamp: '1 hour ago',
        action: 'view_training',
      },
    ];
    setAlerts(mockAlerts);
  }, [t]);

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastRefresh(new Date());
      toast({
        title: t('analytics.data_refreshed'),
        description: t('analytics.data_refreshed_desc'),
      });
    } catch (error) {
      toast({
        title: t('error.refresh_failed'),
        description: t('error.refresh_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Export data
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    toast({
      title: t('analytics.export_started'),
      description: t('analytics.export_started_desc', { format: format.toUpperCase() }),
    });
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable', change: number) => {
    if (trend === 'up') {
      return <ChevronUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <ChevronDown className="h-4 w-4 text-red-500" />;
    }
    return <TrendingRight className="h-4 w-4 text-gray-500" />;
  };

  // Format value based on type
  const formatValue = (value: number | string, format: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('th-TH', {
          style: 'currency',
          currency: 'THB',
        }).format(value);
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  if (isLoading && !lastRefresh) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('analytics.loading_dashboard')}</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('analytics.executive_dashboard')}</h1>
          <p className="text-gray-600 mt-1">
            {t('analytics.executive_dashboard_desc')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('analytics.last_updated')}: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('time.last_7_days')}</SelectItem>
              <SelectItem value="30d">{t('time.last_30_days')}</SelectItem>
              <SelectItem value="90d">{t('time.last_90_days')}</SelectItem>
              <SelectItem value="1y">{t('time.last_year')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          
          <Select onValueChange={(format) => handleExport(format as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('common.export')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Bell className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 mb-2">
                  {t('analytics.active_alerts')} ({alerts.length})
                </h3>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={alert.type === 'critical' ? 'destructive' : 
                                  alert.type === 'warning' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {alert.type}
                        </Badge>
                        <span className="text-sm text-orange-700">{alert.title}</span>
                      </div>
                      <span className="text-xs text-orange-600">{alert.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiMetrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={cn('p-2 rounded-full text-white', metric.color)}>
                      {metric.icon}
                    </div>
                    <h3 className="font-semibold text-gray-700">{metric.title}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {typeof metric.value === 'number' ? formatValue(metric.value, metric.format) : metric.value}
                      </span>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(metric.trend, metric.change)}
                        <span className={cn('text-sm font-medium', 
                          metric.trend === 'up' ? 'text-green-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        )}>
                          {Math.abs(metric.change)}%
                        </span>
                      </div>
                    </div>
                    
                    {metric.target && typeof metric.value === 'number' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{t('analytics.progress_to_target')}</span>
                          <span>{Math.round((metric.value / metric.target) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(metric.value / metric.target) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={selectedDashboard} onValueChange={setSelectedDashboard} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('analytics.overview')}</TabsTrigger>
          <TabsTrigger value="sop">{t('analytics.sop_analytics')}</TabsTrigger>
          <TabsTrigger value="training">{t('analytics.training_analytics')}</TabsTrigger>
          <TabsTrigger value="operations">{t('analytics.operations')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  {t('analytics.revenue_trends')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        `฿${value.toLocaleString()}`, 
                        name === 'revenue' ? t('analytics.revenue') :
                        name === 'expenses' ? t('analytics.expenses') : t('analytics.profit')
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#E31B23" name={t('analytics.revenue')} />
                    <Bar dataKey="expenses" fill="#231F20" name={t('analytics.expenses')} />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#D4AF37" 
                      strokeWidth={3}
                      name={t('analytics.profit')}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                  {t('analytics.performance_distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart
                    data={performanceDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {performanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, t('analytics.staff_percentage')]}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SOP Analytics Tab */}
        <TabsContent value="sop" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-purple-500" />
                {t('analytics.sop_usage_by_category')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={sopUsageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="views" 
                    fill="#E31B23" 
                    name={t('analytics.total_views')}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="compliance" 
                    stroke="#008B8B" 
                    strokeWidth={3}
                    name={t('analytics.compliance_rate')}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Analytics Tab */}
        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-500" />
                {t('analytics.training_completion_trends')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trainingTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="enrollments" 
                    stackId="1"
                    stroke="#D4AF37" 
                    fill="#D4AF37"
                    fillOpacity={0.6}
                    name={t('analytics.enrollments')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completions" 
                    stackId="1"
                    stroke="#008B8B" 
                    fill="#008B8B"
                    fillOpacity={0.8}
                    name={t('analytics.completions')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#E31B23" 
                    strokeWidth={3}
                    name={t('analytics.efficiency')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-500" />
                  {t('analytics.system_health')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('analytics.server_uptime')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">99.9%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('analytics.response_time')}</span>
                  <span className="text-sm text-gray-600">127ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('analytics.active_sessions')}</span>
                  <span className="text-sm text-gray-600">23</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('analytics.database_performance')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-yellow-600">{t('analytics.good')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-blue-500" />
                  {t('analytics.quick_actions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('analytics.generate_compliance_report')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  {t('analytics.review_user_performance')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('analytics.system_maintenance')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  {t('analytics.configure_alerts')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ExecutiveDashboard;