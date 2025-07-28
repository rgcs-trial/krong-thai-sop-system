/**
 * Chain Analytics and Reporting System Component
 * Comprehensive analytics and business intelligence interface for restaurant chain management
 * Features advanced reporting, data visualization, predictive analytics, and executive insights
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  LineChart,
  Activity,
  Target,
  Award,
  DollarSign,
  Users,
  Building2,
  Globe,
  Calendar,
  Clock,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Search,
  Settings,
  Eye,
  Share,
  BookOpen,
  Layers,
  Zap,
  Brain,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Star,
  MapPin,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  Info,
  TrendingUp as Trending,
  Database,
  BarChart,
  ScatterChart,
  AreaChart
} from 'lucide-react';

import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ScatterChart as RechartsScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  FunnelChart,
  Funnel,
  TreeMap
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/hooks/use-toast';

import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface ChainAnalyticsReportingProps {
  className?: string;
}

interface AnalyticsMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency' | 'time';
  icon: React.ReactNode;
  color: string;
  category: 'financial' | 'operational' | 'customer' | 'staff' | 'compliance';
  benchmark?: number;
  target?: number;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'operational' | 'financial' | 'compliance' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'on_demand';
  metrics: string[];
  visualizations: string[];
  recipients: string[];
  lastGenerated?: string;
  nextScheduled?: string;
  isActive: boolean;
  format: 'pdf' | 'excel' | 'powerpoint' | 'dashboard';
}

interface PredictiveInsight {
  id: string;
  type: 'forecast' | 'alert' | 'recommendation' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  actionable: boolean;
  suggestedActions?: string[];
  predictedValue?: number;
  timeframe: string;
  createdAt: string;
}

interface BenchmarkData {
  metric: string;
  category: string;
  chainValue: number;
  industryAverage: number;
  topQuartile: number;
  variance: number;
  rank: number;
  locations: LocationBenchmark[];
}

interface LocationBenchmark {
  locationId: string;
  locationName: string;
  value: number;
  rank: number;
  percentile: number;
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

export function ChainAnalyticsReporting({ className }: ChainAnalyticsReportingProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [selectedView, setSelectedView] = useState('dashboard');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'performance', 'compliance', 'staff']);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [customDateRange, setCustomDateRange] = useState<{start?: Date, end?: Date}>({});

  // Mock analytics metrics
  const analyticsMetrics = useMemo<AnalyticsMetric[]>(() => [
    // Financial Metrics
    {
      id: 'total_revenue',
      title: t('analytics.total_revenue'),
      value: 1250000,
      change: 18.7,
      trend: 'up',
      format: 'currency',
      icon: <DollarSign className="h-5 w-5" />,
      color: 'bg-emerald-500',
      category: 'financial',
      benchmark: 1100000,
      target: 1400000
    },
    {
      id: 'profit_margin',
      title: t('analytics.profit_margin'),
      value: 22.8,
      change: 3.2,
      trend: 'up',
      format: 'percentage',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-green-500',
      category: 'financial',
      benchmark: 18.5,
      target: 25.0
    },
    {
      id: 'cost_per_transaction',
      title: t('analytics.cost_per_transaction'),
      value: 127.50,
      change: -5.8,
      trend: 'down',
      format: 'currency',
      icon: <Gauge className="h-5 w-5" />,
      color: 'bg-orange-500',
      category: 'financial',
      benchmark: 135.00,
      target: 120.00
    },
    
    // Operational Metrics
    {
      id: 'avg_performance_score',
      title: t('analytics.avg_performance_score'),
      value: 90.1,
      change: 4.3,
      trend: 'up',
      format: 'percentage',
      icon: <Target className="h-5 w-5" />,
      color: 'bg-blue-500',
      category: 'operational',
      benchmark: 85.0,
      target: 92.0
    },
    {
      id: 'operational_efficiency',
      title: t('analytics.operational_efficiency'),
      value: 87.6,
      change: 2.1,
      trend: 'up',
      format: 'percentage',
      icon: <Activity className="h-5 w-5" />,
      color: 'bg-purple-500',
      category: 'operational',
      benchmark: 82.0,
      target: 90.0
    },
    {
      id: 'avg_service_time',
      title: t('analytics.avg_service_time'),
      value: '12.8',
      change: -8.5,
      trend: 'down',
      format: 'time',
      icon: <Clock className="h-5 w-5" />,
      color: 'bg-indigo-500',
      category: 'operational',
      benchmark: 15.2,
      target: 12.0
    },
    
    // Customer Metrics
    {
      id: 'customer_satisfaction',
      title: t('analytics.customer_satisfaction'),
      value: 4.6,
      change: 5.2,
      trend: 'up',
      format: 'number',
      icon: <Star className="h-5 w-5" />,
      color: 'bg-yellow-500',
      category: 'customer',
      benchmark: 4.2,
      target: 4.8
    },
    {
      id: 'customer_retention',
      title: t('analytics.customer_retention'),
      value: 78.9,
      change: 3.7,
      trend: 'up',
      format: 'percentage',
      icon: <Award className="h-5 w-5" />,
      color: 'bg-pink-500',
      category: 'customer',
      benchmark: 72.0,
      target: 80.0
    },
    
    // Staff Metrics
    {
      id: 'staff_productivity',
      title: t('analytics.staff_productivity'),
      value: 85.4,
      change: 2.8,
      trend: 'up',
      format: 'percentage',
      icon: <Users className="h-5 w-5" />,
      color: 'bg-teal-500',
      category: 'staff',
      benchmark: 80.0,
      target: 88.0
    },
    {
      id: 'staff_retention',
      title: t('analytics.staff_retention'),
      value: 92.3,
      change: 1.9,
      trend: 'up',
      format: 'percentage',
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'bg-cyan-500',
      category: 'staff',
      benchmark: 88.0,
      target: 95.0
    },
    
    // Compliance Metrics
    {
      id: 'compliance_score',
      title: t('analytics.compliance_score'),
      value: 94.7,
      change: 1.2,
      trend: 'up',
      format: 'percentage',
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'bg-green-600',
      category: 'compliance',
      benchmark: 90.0,
      target: 96.0
    },
    {
      id: 'audit_pass_rate',
      title: t('analytics.audit_pass_rate'),
      value: 96.8,
      change: 0.8,
      trend: 'up',
      format: 'percentage',
      icon: <BookOpen className="h-5 w-5" />,
      color: 'bg-emerald-600',
      category: 'compliance',
      benchmark: 93.0,
      target: 98.0
    }
  ], [t]);

  // Mock report templates
  const reportTemplates = useMemo<ReportTemplate[]>(() => [
    {
      id: 'executive_summary',
      name: t('reports.executive_summary'),
      description: t('reports.executive_summary_desc'),
      category: 'executive',
      frequency: 'weekly',
      metrics: ['total_revenue', 'profit_margin', 'avg_performance_score', 'customer_satisfaction'],
      visualizations: ['revenue_trend', 'performance_comparison', 'satisfaction_scores'],
      recipients: ['CEO', 'COO', 'CFO'],
      lastGenerated: '2024-07-22T09:00:00',
      nextScheduled: '2024-07-29T09:00:00',
      isActive: true,
      format: 'pdf'
    },
    {
      id: 'operational_dashboard',
      name: t('reports.operational_dashboard'),
      description: t('reports.operational_dashboard_desc'),
      category: 'operational',
      frequency: 'daily',
      metrics: ['operational_efficiency', 'avg_service_time', 'staff_productivity'],
      visualizations: ['efficiency_trends', 'service_metrics', 'productivity_charts'],
      recipients: ['Operations Manager', 'Regional Managers'],
      lastGenerated: '2024-07-28T06:00:00',
      nextScheduled: '2024-07-29T06:00:00',
      isActive: true,
      format: 'dashboard'
    },
    {
      id: 'financial_analysis',
      name: t('reports.financial_analysis'),
      description: t('reports.financial_analysis_desc'),
      category: 'financial',
      frequency: 'monthly',
      metrics: ['total_revenue', 'profit_margin', 'cost_per_transaction'],
      visualizations: ['revenue_breakdown', 'profit_analysis', 'cost_trends'],
      recipients: ['CFO', 'Finance Team', 'Franchise Owners'],
      lastGenerated: '2024-07-01T10:00:00',
      nextScheduled: '2024-08-01T10:00:00',
      isActive: true,
      format: 'excel'
    },
    {
      id: 'compliance_audit',
      name: t('reports.compliance_audit'),
      description: t('reports.compliance_audit_desc'),
      category: 'compliance',
      frequency: 'quarterly',
      metrics: ['compliance_score', 'audit_pass_rate'],
      visualizations: ['compliance_trends', 'audit_results'],
      recipients: ['Compliance Officer', 'Legal Team'],
      lastGenerated: '2024-04-01T14:00:00',
      nextScheduled: '2024-10-01T14:00:00',
      isActive: true,
      format: 'pdf'
    }
  ], [t]);

  // Mock predictive insights
  const predictiveInsights = useMemo<PredictiveInsight[]>(() => [
    {
      id: 'revenue_forecast',
      type: 'forecast',
      title: t('insights.revenue_forecast_title'),
      description: t('insights.revenue_forecast_desc'),
      confidence: 87.5,
      impact: 'high',
      category: 'financial',
      actionable: true,
      suggestedActions: [
        t('insights.optimize_menu_pricing'),
        t('insights.expand_high_performing_locations'),
        t('insights.implement_loyalty_program')
      ],
      predictedValue: 1680000,
      timeframe: 'Q4 2024',
      createdAt: '2024-07-28T10:30:00'
    },
    {
      id: 'staff_shortage_alert',
      type: 'alert',
      title: t('insights.staff_shortage_alert_title'),
      description: t('insights.staff_shortage_alert_desc'),
      confidence: 92.3,
      impact: 'critical',
      category: 'staff',
      actionable: true,
      suggestedActions: [
        t('insights.accelerate_hiring'),
        t('insights.implement_cross_training'),
        t('insights.review_compensation')
      ],
      timeframe: 'Next 30 days',
      createdAt: '2024-07-28T08:15:00'
    },
    {
      id: 'customer_churn_prediction',
      type: 'recommendation',
      title: t('insights.customer_churn_title'),
      description: t('insights.customer_churn_desc'),
      confidence: 78.9,
      impact: 'medium',
      category: 'customer',
      actionable: true,
      suggestedActions: [
        t('insights.personalized_offers'),
        t('insights.improve_service_quality'),
        t('insights.engagement_campaigns')
      ],
      timeframe: 'Next 60 days',
      createdAt: '2024-07-28T11:45:00'
    },
    {
      id: 'compliance_anomaly',
      type: 'anomaly',
      title: t('insights.compliance_anomaly_title'),
      description: t('insights.compliance_anomaly_desc'),
      confidence: 94.1,
      impact: 'high',
      category: 'compliance',
      actionable: true,
      suggestedActions: [
        t('insights.immediate_audit'),
        t('insights.staff_retraining'),
        t('insights.process_review')
      ],
      timeframe: 'Immediate',
      createdAt: '2024-07-28T07:20:00'
    }
  ], [t]);

  // Mock benchmark data
  const benchmarkData = useMemo<BenchmarkData[]>(() => [
    {
      metric: 'Revenue per Location',
      category: 'financial',
      chainValue: 250000,
      industryAverage: 220000,
      topQuartile: 280000,
      variance: 13.6,
      rank: 2,
      locations: [
        { locationId: 'loc-001', locationName: 'Bangkok Central', value: 285000, rank: 1, percentile: 95 },
        { locationId: 'loc-002', locationName: 'Chiang Mai', value: 195000, rank: 4, percentile: 60 },
        { locationId: 'loc-003', locationName: 'Phuket', value: 210000, rank: 3, percentile: 70 },
        { locationId: 'loc-004', locationName: 'Pattaya', value: 225000, rank: 2, percentile: 80 },
        { locationId: 'loc-005', locationName: 'Bangkok Thonglor', value: 245000, rank: 1, percentile: 85 }
      ]
    },
    {
      metric: 'Customer Satisfaction',
      category: 'customer',
      chainValue: 4.6,
      industryAverage: 4.2,
      topQuartile: 4.7,
      variance: 9.5,
      rank: 1,
      locations: [
        { locationId: 'loc-001', locationName: 'Bangkok Central', value: 4.8, rank: 1, percentile: 98 },
        { locationId: 'loc-002', locationName: 'Chiang Mai', value: 4.7, rank: 2, percentile: 92 },
        { locationId: 'loc-003', locationName: 'Phuket', value: 4.5, rank: 4, percentile: 78 },
        { locationId: 'loc-004', locationName: 'Pattaya', value: 4.4, rank: 5, percentile: 65 },
        { locationId: 'loc-005', locationName: 'Bangkok Thonglor', value: 4.6, rank: 3, percentile: 85 }
      ]
    }
  ], []);

  // Historical performance data
  const historicalData = useMemo(() => [
    { month: 'Jan', revenue: 1050000, performance: 85.2, satisfaction: 4.3, compliance: 92.1 },
    { month: 'Feb', revenue: 1120000, performance: 87.1, satisfaction: 4.4, compliance: 93.5 },
    { month: 'Mar', revenue: 1180000, performance: 88.9, satisfaction: 4.5, compliance: 94.2 },
    { month: 'Apr', revenue: 1240000, performance: 90.3, satisfaction: 4.6, compliance: 94.8 },
    { month: 'May', revenue: 1195000, performance: 89.8, satisfaction: 4.5, compliance: 94.1 },
    { month: 'Jun', revenue: 1250000, performance: 90.1, satisfaction: 4.6, compliance: 94.7 },
    { month: 'Jul', revenue: 1285000, performance: 91.2, satisfaction: 4.7, compliance: 95.2 }
  ], []);

  // Location performance scatter data
  const locationScatterData = useMemo(() => [
    { name: 'Central', revenue: 285, performance: 94.5, size: 45 },
    { name: 'Chiang Mai', revenue: 195, performance: 91.8, size: 32 },
    { name: 'Phuket', revenue: 210, performance: 88.7, size: 30 },
    { name: 'Pattaya', revenue: 225, performance: 86.4, size: 28 },
    { name: 'Thonglor', revenue: 245, performance: 89.2, size: 38 }
  ], []);

  // Filter metrics by category
  const filteredMetrics = useMemo(() => {
    if (selectedCategory === 'all') return analyticsMetrics;
    return analyticsMetrics.filter(metric => metric.category === selectedCategory);
  }, [analyticsMetrics, selectedCategory]);

  // Toggle metric selection
  const toggleMetricSelection = (metricId: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricId)) {
        return prev.filter(id => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable', change: number) => {
    if (trend === 'up') {
      return <ChevronUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <ChevronDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-500" />;
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
          minimumFractionDigits: 0,
        }).format(value);
      case 'time':
        return `${value} min`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  // Get impact color
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get insight type icon
  const getInsightTypeIcon = (type: string) => {
    switch (type) {
      case 'forecast': return <TrendingUp className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'recommendation': return <Brain className="h-4 w-4" />;
      case 'anomaly': return <Eye className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
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

  // Generate report
  const handleGenerateReport = (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId);
    toast({
      title: t('analytics.report_generation_started'),
      description: t('analytics.report_generation_desc', { name: template?.name }),
    });
  };

  // Export data
  const handleExport = (format: 'pdf' | 'excel' | 'csv' | 'json') => {
    toast({
      title: t('analytics.export_started'),
      description: t('analytics.export_started_desc', { format: format.toUpperCase() }),
    });
  };

  if (isLoading && !lastRefresh) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('analytics.loading_analytics')}</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-[#E31B23]" />
            {t('analytics.chain_analytics_title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('analytics.chain_analytics_desc')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('analytics.last_updated')}: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('time.last_7_days')}</SelectItem>
              <SelectItem value="30d">{t('time.last_30_days')}</SelectItem>
              <SelectItem value="90d">{t('time.last_90_days')}</SelectItem>
              <SelectItem value="1y">{t('time.last_year')}</SelectItem>
              <SelectItem value="custom">{t('time.custom_range')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          
          <Select onValueChange={(format) => handleExport(format as any)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder={t('common.export')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredMetrics.slice(0, 8).map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={cn('p-2 rounded-full text-white', metric.color)}>
                      {metric.icon}
                    </div>
                    <h3 className="font-semibold text-gray-700 text-sm">{metric.title}</h3>
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
                          {Math.abs(metric.change).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {metric.target && typeof metric.value === 'number' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{t('analytics.vs_target')}</span>
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

      {/* Main Analytics Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">{t('analytics.dashboard')}</TabsTrigger>
          <TabsTrigger value="insights">{t('analytics.insights')}</TabsTrigger>
          <TabsTrigger value="benchmarks">{t('analytics.benchmarks')}</TabsTrigger>
          <TabsTrigger value="reports">{t('analytics.reports')}</TabsTrigger>
          <TabsTrigger value="predictions">{t('analytics.predictions')}</TabsTrigger>
          <TabsTrigger value="custom">{t('analytics.custom')}</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Historical Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2 text-blue-500" />
                  {t('analytics.historical_performance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsLineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        name === 'revenue' ? `฿${(value / 1000).toFixed(0)}k` : 
                        name === 'satisfaction' ? `${value.toFixed(1)}/5` : `${value.toFixed(1)}%`,
                        name === 'revenue' ? t('analytics.revenue') :
                        name === 'performance' ? t('analytics.performance') :
                        name === 'satisfaction' ? t('analytics.satisfaction') : t('analytics.compliance')
                      ]}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="performance" 
                      stroke="#E31B23" 
                      strokeWidth={3}
                      name={t('analytics.performance')}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="compliance" 
                      stroke="#008B8B" 
                      strokeWidth={3}
                      name={t('analytics.compliance')}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="satisfaction" 
                      stroke="#D4AF37" 
                      strokeWidth={3}
                      name={t('analytics.satisfaction')}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Location Performance Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ScatterChart className="h-5 w-5 mr-2 text-purple-500" />
                  {t('analytics.location_performance_matrix')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsScatterChart data={locationScatterData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      dataKey="revenue" 
                      name="Revenue"
                      unit="k฿"
                    />
                    <YAxis 
                      type="number" 
                      dataKey="performance" 
                      name="Performance"
                      unit="%"
                      domain={[80, 100]}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value: any, name: any) => [
                        name === 'performance' ? `${value}%` : `฿${value}k`,
                        name === 'performance' ? 'Performance Score' : 'Monthly Revenue'
                      ]}
                      labelFormatter={(label, payload: any) => {
                        if (payload && payload[0]) {
                          return `${payload[0].payload.name} (${payload[0].payload.size} staff)`;
                        }
                        return label;
                      }}
                    />
                    <Scatter 
                      dataKey="performance" 
                      fill="#E31B23"
                      name="Location Performance"
                    />
                  </RechartsScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AreaChart className="h-5 w-5 mr-2 text-green-500" />
                {t('analytics.revenue_analysis')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsAreaChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`฿${(value / 1000).toFixed(0)}k`, t('analytics.revenue')]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    fill="#10B981"
                    fillOpacity={0.6}
                    name={t('analytics.revenue')}
                  />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {predictiveInsights.map((insight) => (
              <Card key={insight.id} className={cn(
                "border-l-4",
                insight.impact === 'critical' && "border-l-red-500",
                insight.impact === 'high' && "border-l-orange-500",
                insight.impact === 'medium' && "border-l-yellow-500",
                insight.impact === 'low' && "border-l-blue-500"
              )}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center text-base">
                      {getInsightTypeIcon(insight.type)}
                      <span className="ml-2">{insight.title}</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <Badge className={getImpactColor(insight.impact)} size="sm">
                        {insight.impact}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {insight.confidence.toFixed(1)}% confidence
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-700">{insight.description}</p>
                    
                    {insight.predictedValue && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-blue-800">
                          {t('analytics.predicted_value')}: {formatValue(insight.predictedValue, 'currency')}
                        </div>
                        <div className="text-xs text-blue-600">
                          {t('analytics.timeframe')}: {insight.timeframe}
                        </div>
                      </div>
                    )}
                    
                    {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-900">{t('analytics.suggested_actions')}:</h5>
                        <ul className="space-y-1">
                          {insight.suggestedActions.map((action, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-600">
                              <ArrowRight className="h-3 w-3 mr-2 text-gray-400" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-gray-500">
                        {new Date(insight.createdAt).toLocaleString()}
                      </span>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {t('analytics.view_details')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-6">
          <div className="space-y-6">
            {benchmarkData.map((benchmark) => (
              <Card key={benchmark.metric}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{benchmark.metric}</span>
                    <Badge variant="outline" className="ml-2">
                      Rank #{benchmark.rank}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Benchmark Comparison */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatValue(benchmark.chainValue, 'currency')}
                          </div>
                          <div className="text-sm text-blue-800">{t('analytics.chain_average')}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-600">
                            {formatValue(benchmark.industryAverage, 'currency')}
                          </div>
                          <div className="text-sm text-gray-700">{t('analytics.industry_avg')}</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {formatValue(benchmark.topQuartile, 'currency')}
                          </div>
                          <div className="text-sm text-green-800">{t('analytics.top_quartile')}</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className={cn(
                          "text-lg font-semibold",
                          benchmark.variance > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {benchmark.variance > 0 ? '+' : ''}{benchmark.variance.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {t('analytics.vs_industry_average')}
                        </div>
                      </div>
                    </div>

                    {/* Location Rankings */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">{t('analytics.location_rankings')}</h5>
                      {benchmark.locations.map((location, index) => (
                        <div key={location.locationId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold",
                              index === 0 ? "bg-yellow-500 text-white" :
                              index === 1 ? "bg-gray-400 text-white" :
                              index === 2 ? "bg-orange-600 text-white" :
                              "bg-gray-300 text-gray-700"
                            )}>
                              {location.rank}
                            </div>
                            <span className="font-medium">{location.locationName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {formatValue(location.value, 'currency')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {location.percentile}th percentile
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reportTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-[#E31B23]" />
                      {template.name}
                    </span>
                    <Badge 
                      variant={template.isActive ? "default" : "secondary"}
                      className={template.isActive ? "bg-green-100 text-green-800" : ""}
                    >
                      {template.isActive ? t('reports.active') : t('reports.inactive')}
                    </Badge>
                  </CardTitle>
                  <div className="text-sm text-gray-600">{template.description}</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>{t('reports.category')}:</strong> {template.category}
                      </div>
                      <div>
                        <strong>{t('reports.frequency')}:</strong> {template.frequency}
                      </div>
                      <div>
                        <strong>{t('reports.format')}:</strong> {template.format.toUpperCase()}
                      </div>
                      <div>
                        <strong>{t('reports.recipients')}:</strong> {template.recipients.length}
                      </div>
                    </div>
                    
                    {template.lastGenerated && (
                      <div className="text-sm text-gray-600">
                        <strong>{t('reports.last_generated')}:</strong> {new Date(template.lastGenerated).toLocaleString()}
                      </div>
                    )}
                    
                    {template.nextScheduled && (
                      <div className="text-sm text-gray-600">
                        <strong>{t('reports.next_scheduled')}:</strong> {new Date(template.nextScheduled).toLocaleString()}
                      </div>
                    )}
                    
                    <div className="flex space-x-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleGenerateReport(template.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {t('reports.generate_now')}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        {t('common.edit')}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        {t('reports.preview')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-500" />
                {t('analytics.predictive_analytics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Revenue Forecast */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-4">{t('analytics.revenue_forecast')}</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsAreaChart data={[
                      ...historicalData,
                      { month: 'Aug', revenue: 1320000, forecast: true },
                      { month: 'Sep', revenue: 1385000, forecast: true },
                      { month: 'Oct', revenue: 1450000, forecast: true },
                      { month: 'Nov', revenue: 1515000, forecast: true },
                      { month: 'Dec', revenue: 1580000, forecast: true }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`฿${(value / 1000).toFixed(0)}k`, 'Revenue']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#E31B23" 
                        fill="#E31B23"
                        fillOpacity={0.6}
                        strokeDasharray={(entry: any) => entry?.forecast ? "5 5" : "0"}
                      />
                    </RechartsAreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Predictive Insights Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">92.3%</div>
                    <div className="text-sm text-gray-600">{t('analytics.model_accuracy')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">4</div>
                    <div className="text-sm text-gray-600">{t('analytics.active_predictions')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">2</div>
                    <div className="text-sm text-gray-600">{t('analytics.high_impact_alerts')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">87.5%</div>
                    <div className="text-sm text-gray-600">{t('analytics.confidence_avg')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Tab */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-gray-500" />
                {t('analytics.custom_analytics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Metric Selection */}
                <div className="space-y-4">
                  <h4 className="font-semibold">{t('analytics.select_metrics')}</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {analyticsMetrics.map((metric) => (
                      <div key={metric.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={metric.id}
                          checked={selectedMetrics.includes(metric.id)}
                          onCheckedChange={() => toggleMetricSelection(metric.id)}
                        />
                        <label htmlFor={metric.id} className="text-sm cursor-pointer">
                          {metric.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-4">
                  <h4 className="font-semibold">{t('analytics.filter_by_category')}</h4>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('analytics.all_categories')}</SelectItem>
                      <SelectItem value="financial">{t('analytics.financial')}</SelectItem>
                      <SelectItem value="operational">{t('analytics.operational')}</SelectItem>
                      <SelectItem value="customer">{t('analytics.customer')}</SelectItem>
                      <SelectItem value="staff">{t('analytics.staff')}</SelectItem>
                      <SelectItem value="compliance">{t('analytics.compliance')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Export Options */}
                <div className="space-y-4">
                  <h4 className="font-semibold">{t('analytics.export_options')}</h4>
                  <div className="space-y-2">
                    <Button className="w-full justify-start" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      {t('analytics.create_custom_report')}
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Share className="h-4 w-4 mr-2" />
                      {t('analytics.share_dashboard')}
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('analytics.schedule_report')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Custom Visualization */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-4">{t('analytics.custom_visualization')}</h4>
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">
                      {t('analytics.build_custom_chart')}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {t('analytics.build_custom_chart_desc')}
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('analytics.create_visualization')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChainAnalyticsReporting;