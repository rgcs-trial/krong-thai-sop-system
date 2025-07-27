/**
 * Operational Insights Dashboard Component
 * Restaurant operational efficiency metrics, staff productivity analytics,
 * compliance tracking, and cost-benefit analysis for SOP program management
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  DollarSign,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Target,
  Zap,
  Settings,
  Bell,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Star,
  Award,
  Gauge,
  PieChart,
  LineChart,
  BarChart,
  TrendingRight,
  AlertCircle,
  Info,
  XCircle
} from 'lucide-react';

import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
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
  RadialBarChart,
  RadialBar
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
import { toast } from '@/hooks/use-toast';

import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface OperationalInsightsDashboardProps {
  className?: string;
}

interface EfficiencyMetric {
  id: string;
  name: string;
  current: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  unit: string;
  category: 'productivity' | 'quality' | 'compliance' | 'cost';
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface StaffProductivity {
  staffId: string;
  name: string;
  department: string;
  sopViewsPerDay: number;
  trainingHours: number;
  complianceScore: number;
  efficiencyRating: number;
  errorRate: number;
  lastActive: string;
  status: 'active' | 'needs_attention' | 'offline';
}

interface ComplianceViolation {
  id: string;
  type: 'sop_not_followed' | 'training_incomplete' | 'policy_violation' | 'safety_incident';
  severity: 'critical' | 'high' | 'medium' | 'low';
  department: string;
  description: string;
  reportedAt: string;
  resolvedAt?: string;
  status: 'open' | 'investigating' | 'resolved';
  impact: string;
}

interface CostBenefit {
  category: string;
  cost: number;
  benefit: number;
  roi: number;
  description: string;
}

interface OperationalAlert {
  id: string;
  type: 'performance' | 'compliance' | 'system' | 'cost';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  department?: string;
  action?: string;
  isRead: boolean;
}

// Chart colors
const CHART_COLORS = ['#E31B23', '#D4AF37', '#008B8B', '#231F20', '#D2B48C', '#FF6B6B', '#4ECDC4', '#45B7D1'];

export function OperationalInsightsDashboard({ className }: OperationalInsightsDashboardProps) {
  const { t, locale } = useI18n();
  
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);

  // Mock operational efficiency metrics
  const efficiencyMetrics = useMemo<EfficiencyMetric[]>(() => [
    {
      id: 'order_accuracy',
      name: t('operations.order_accuracy'),
      current: 94.2,
      target: 96.0,
      trend: 'up',
      change: 2.1,
      unit: '%',
      category: 'quality',
      status: 'good',
    },
    {
      id: 'service_time',
      name: t('operations.avg_service_time'),
      current: 8.5,
      target: 7.0,
      trend: 'down',
      change: -5.2,
      unit: 'min',
      category: 'productivity',
      status: 'warning',
    },
    {
      id: 'sop_compliance',
      name: t('operations.sop_compliance_rate'),
      current: 87.3,
      target: 95.0,
      trend: 'up',
      change: 3.8,
      unit: '%',
      category: 'compliance',
      status: 'warning',
    },
    {
      id: 'cost_per_order',
      name: t('operations.cost_per_order'),
      current: 45.20,
      target: 42.00,
      trend: 'down',
      change: -2.3,
      unit: '฿',
      category: 'cost',
      status: 'good',
    },
    {
      id: 'staff_efficiency',
      name: t('operations.staff_efficiency'),
      current: 78.9,
      target: 85.0,
      trend: 'up',
      change: 4.2,
      unit: '%',
      category: 'productivity',
      status: 'warning',
    },
    {
      id: 'error_rate',
      name: t('operations.error_rate'),
      current: 2.8,
      target: 2.0,
      trend: 'down',
      change: -12.5,
      unit: '%',
      category: 'quality',
      status: 'good',
    },
  ], [t]);

  // Mock staff productivity data
  const staffProductivity = useMemo<StaffProductivity[]>(() => [
    {
      staffId: '1',
      name: 'สมชาย ใจดี (Somchai)',
      department: 'Kitchen',
      sopViewsPerDay: 12,
      trainingHours: 24,
      complianceScore: 92,
      efficiencyRating: 85,
      errorRate: 1.2,
      lastActive: '2024-01-27T10:30:00Z',
      status: 'active',
    },
    {
      staffId: '2',
      name: 'มาลี สุขใส (Mali)',
      department: 'Service',
      sopViewsPerDay: 8,
      trainingHours: 18,
      complianceScore: 88,
      efficiencyRating: 92,
      errorRate: 0.8,
      lastActive: '2024-01-27T09:15:00Z',
      status: 'active',
    },
    {
      staffId: '3',
      name: 'วิชัย มั่นใจ (Wichai)',
      department: 'Kitchen',
      sopViewsPerDay: 5,
      trainingHours: 12,
      complianceScore: 73,
      efficiencyRating: 68,
      errorRate: 4.2,
      lastActive: '2024-01-26T16:45:00Z',
      status: 'needs_attention',
    },
  ], []);

  // Mock compliance violations
  const complianceViolations = useMemo<ComplianceViolation[]>(() => [
    {
      id: '1',
      type: 'sop_not_followed',
      severity: 'high',
      department: 'Kitchen',
      description: 'Food safety procedures not followed during prep',
      reportedAt: '2024-01-27T08:30:00Z',
      status: 'investigating',
      impact: 'Potential food safety risk',
    },
    {
      id: '2',
      type: 'training_incomplete',
      severity: 'medium',
      department: 'Service',
      description: 'Staff member has not completed mandatory customer service training',
      reportedAt: '2024-01-26T14:20:00Z',
      status: 'open',
      impact: 'Service quality may be affected',
    },
    {
      id: '3',
      type: 'safety_incident',
      severity: 'critical',
      department: 'Kitchen',
      description: 'Minor burn incident due to equipment mishandling',
      reportedAt: '2024-01-25T16:45:00Z',
      resolvedAt: '2024-01-26T10:00:00Z',
      status: 'resolved',
      impact: 'Staff injury, equipment training needed',
    },
  ], []);

  // Mock cost-benefit analysis
  const costBenefitData = useMemo<CostBenefit[]>(() => [
    {
      category: 'Training Program',
      cost: 125000,
      benefit: 285000,
      roi: 128,
      description: 'Staff training and certification programs',
    },
    {
      category: 'SOP System',
      cost: 85000,
      benefit: 195000,
      roi: 129,
      description: 'Digital SOP management and compliance tracking',
    },
    {
      category: 'Quality Control',
      cost: 45000,
      benefit: 120000,
      roi: 167,
      description: 'Enhanced quality control procedures',
    },
    {
      category: 'Safety Measures',
      cost: 65000,
      benefit: 150000,
      roi: 131,
      description: 'Safety equipment and training',
    },
  ], []);

  // Peak hours analysis data
  const peakHoursData = useMemo(() => [
    { hour: '06:00', orders: 12, staff: 3, efficiency: 75 },
    { hour: '07:00', orders: 28, staff: 4, efficiency: 82 },
    { hour: '08:00', orders: 45, staff: 5, efficiency: 88 },
    { hour: '09:00', orders: 38, staff: 5, efficiency: 85 },
    { hour: '10:00', orders: 25, staff: 4, efficiency: 78 },
    { hour: '11:00', orders: 35, staff: 5, efficiency: 84 },
    { hour: '12:00', orders: 65, staff: 7, efficiency: 92 },
    { hour: '13:00', orders: 58, staff: 7, efficiency: 89 },
    { hour: '14:00', orders: 42, staff: 6, efficiency: 85 },
    { hour: '15:00', orders: 28, staff: 4, efficiency: 78 },
    { hour: '16:00', orders: 22, staff: 4, efficiency: 75 },
    { hour: '17:00', orders: 35, staff: 5, efficiency: 82 },
    { hour: '18:00', orders: 72, staff: 8, efficiency: 94 },
    { hour: '19:00', orders: 68, staff: 8, efficiency: 91 },
    { hour: '20:00', orders: 52, staff: 7, efficiency: 87 },
    { hour: '21:00', orders: 35, staff: 5, efficiency: 83 },
    { hour: '22:00', orders: 18, staff: 3, efficiency: 76 },
  ], []);

  // Load operational alerts
  useEffect(() => {
    const mockAlerts: OperationalAlert[] = [
      {
        id: '1',
        type: 'performance',
        priority: 'high',
        title: t('alerts.efficiency_drop'),
        description: t('alerts.kitchen_efficiency_below_target'),
        timestamp: '5 minutes ago',
        department: 'Kitchen',
        action: 'review_metrics',
        isRead: false,
      },
      {
        id: '2',
        type: 'compliance',
        priority: 'critical',
        title: t('alerts.compliance_violation'),
        description: t('alerts.food_safety_protocol_breach'),
        timestamp: '15 minutes ago',
        department: 'Kitchen',
        action: 'immediate_review',
        isRead: false,
      },
      {
        id: '3',
        type: 'cost',
        priority: 'medium',
        title: t('alerts.cost_increase'),
        description: t('alerts.cost_per_order_increasing'),
        timestamp: '1 hour ago',
        action: 'cost_analysis',
        isRead: true,
      },
    ];
    setAlerts(mockAlerts);
  }, [t]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: t('analytics.data_refreshed'),
        description: t('analytics.operational_data_refreshed'),
      });
    } catch (error) {
      toast({
        title: t('error.refresh_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'good':
        return <ThumbsUp className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <TrendingRight className="h-4 w-4 text-gray-500" />;
    }
  };

  const getViolationBadge = (severity: string) => {
    const variants = {
      critical: 'destructive',
      high: 'secondary',
      medium: 'default',
      low: 'outline',
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants]}>
        {severity}
      </Badge>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold">{t('analytics.operational_insights')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('analytics.operational_insights_desc')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">{t('time.today')}</SelectItem>
              <SelectItem value="7d">{t('time.last_7_days')}</SelectItem>
              <SelectItem value="30d">{t('time.last_30_days')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('departments.all')}</SelectItem>
              <SelectItem value="kitchen">{t('departments.kitchen')}</SelectItem>
              <SelectItem value="service">{t('departments.service')}</SelectItem>
              <SelectItem value="management">{t('departments.management')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Real-time Alerts */}
      {alerts.filter(alert => !alert.isRead).length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-2">
                  {t('analytics.urgent_alerts')} ({alerts.filter(alert => !alert.isRead).length})
                </h3>
                <div className="space-y-2">
                  {alerts.filter(alert => !alert.isRead).slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={alert.priority === 'critical' ? 'destructive' : 
                                  alert.priority === 'high' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {alert.priority}
                        </Badge>
                        <span className="text-sm text-red-700">{alert.title}</span>
                        {alert.department && (
                          <span className="text-xs text-red-600">({alert.department})</span>
                        )}
                      </div>
                      <span className="text-xs text-red-600">{alert.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Efficiency Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {efficiencyMetrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(metric.status)}
                  <h3 className="font-semibold text-gray-700">{metric.name}</h3>
                </div>
                {getTrendIcon(metric.trend)}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metric.current}{metric.unit}
                  </span>
                  <span className={cn(
                    'text-sm font-medium',
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('analytics.target')}: {metric.target}{metric.unit}</span>
                    <span>{Math.round((metric.current / metric.target) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(metric.current / metric.target) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="productivity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="productivity">{t('analytics.productivity')}</TabsTrigger>
          <TabsTrigger value="compliance">{t('analytics.compliance')}</TabsTrigger>
          <TabsTrigger value="cost_benefit">{t('analytics.cost_benefit')}</TabsTrigger>
          <TabsTrigger value="insights">{t('analytics.insights')}</TabsTrigger>
        </TabsList>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                  {t('analytics.peak_hours_analysis')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="orders" 
                      fill="#E31B23" 
                      name={t('analytics.orders')}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="efficiency" 
                      stroke="#008B8B" 
                      strokeWidth={3}
                      name={t('analytics.efficiency')}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Staff Productivity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-500" />
                  {t('analytics.staff_productivity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {staffProductivity.map((staff) => (
                    <div key={staff.staffId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold">{staff.name}</h4>
                          <Badge variant="outline">{staff.department}</Badge>
                          <div className={cn(
                            'w-3 h-3 rounded-full',
                            staff.status === 'active' ? 'bg-green-500' :
                            staff.status === 'needs_attention' ? 'bg-yellow-500' : 'bg-gray-500'
                          )} />
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <span>{staff.sopViewsPerDay} SOPs/day</span>
                          <span>{staff.complianceScore}% compliance</span>
                          <span>{staff.errorRate}% error rate</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{staff.efficiencyRating}%</div>
                        <div className="text-xs text-muted-foreground">{t('analytics.efficiency')}</div>
                        <Progress value={staff.efficiencyRating} className="w-20 h-2 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-purple-500" />
                {t('analytics.compliance_violations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceViolations.map((violation) => (
                  <div key={violation.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getViolationBadge(violation.severity)}
                          <span className="font-semibold">{violation.department}</span>
                          <Badge variant="outline">
                            {violation.type.replace('_', ' ')}
                          </Badge>
                          <Badge 
                            variant={
                              violation.status === 'resolved' ? 'default' :
                              violation.status === 'investigating' ? 'secondary' : 'destructive'
                            }
                          >
                            {violation.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{violation.description}</p>
                        <p className="text-sm text-orange-600">{t('analytics.impact')}: {violation.impact}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{new Date(violation.reportedAt).toLocaleDateString()}</p>
                        {violation.resolvedAt && (
                          <p className="text-green-600">
                            {t('analytics.resolved')}: {new Date(violation.resolvedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost-Benefit Tab */}
        <TabsContent value="cost_benefit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                {t('analytics.sop_program_roi')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {costBenefitData.map((item) => (
                  <div key={item.category} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">{item.category}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('analytics.cost')}:</span>
                        <span className="text-red-600">-฿{item.cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('analytics.benefit')}:</span>
                        <span className="text-green-600">+฿{item.benefit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span>ROI:</span>
                        <span className="text-blue-600">{item.roi}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                  {t('analytics.actionable_insights')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-1">
                    {t('analytics.efficiency_opportunity')}
                  </h4>
                  <p className="text-sm text-green-700">
                    {t('analytics.efficiency_opportunity_desc')}
                  </p>
                </div>
                
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-1">
                    {t('analytics.compliance_attention')}
                  </h4>
                  <p className="text-sm text-orange-700">
                    {t('analytics.compliance_attention_desc')}
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-1">
                    {t('analytics.cost_optimization')}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {t('analytics.cost_optimization_desc')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-indigo-500" />
                  {t('analytics.performance_targets')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('analytics.overall_efficiency')}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={82} className="w-24 h-2" />
                      <span className="text-sm font-medium">82%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('analytics.compliance_rate')}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={87} className="w-24 h-2" />
                      <span className="text-sm font-medium">87%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('analytics.cost_efficiency')}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={78} className="w-24 h-2" />
                      <span className="text-sm font-medium">78%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('analytics.staff_satisfaction')}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={91} className="w-24 h-2" />
                      <span className="text-sm font-medium">91%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OperationalInsightsDashboard;