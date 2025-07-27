/**
 * SOP Analytics Dashboard Component
 * Comprehensive SOP usage tracking, compliance monitoring, and performance analytics
 * Features access patterns, compliance rates, and content effectiveness analysis
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText,
  Eye,
  Download,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Star,
  Filter,
  RefreshCw,
  Search,
  ArrowUpDown,
  MoreVertical,
  Target,
  Shield,
  Bookmark,
  Timer,
  Zap,
  Award,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  PieChart,
  Cell,
  Treemap
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface SOPAnalyticsDashboardProps {
  className?: string;
}

interface SOPUsageMetric {
  id: string;
  title: string;
  category: string;
  views: number;
  uniqueUsers: number;
  avgReadTime: number;
  completionRate: number;
  downloadCount: number;
  lastAccessed: string;
  complianceScore: number;
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

interface CategoryPerformance {
  category: string;
  totalViews: number;
  averageCompliance: number;
  sopCount: number;
  activeUsers: number;
  riskScore: number;
  trend: number;
}

interface AccessPattern {
  hour: number;
  day: string;
  views: number;
  users: number;
}

interface ComplianceIssue {
  id: string;
  sopId: string;
  sopTitle: string;
  issueType: 'low_compliance' | 'no_access' | 'outdated' | 'incomplete';
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedUsers: number;
  description: string;
  recommendation: string;
  dueDate: string;
}

// Chart colors
const CHART_COLORS = ['#E31B23', '#D4AF37', '#008B8B', '#231F20', '#D2B48C', '#FF6B6B', '#4ECDC4', '#45B7D1'];

export function SOPAnalyticsDashboard({ className }: SOPAnalyticsDashboardProps) {
  const { t, locale } = useI18n();
  
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('views');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - in production, this would come from APIs
  const sopUsageData = useMemo<SOPUsageMetric[]>(() => [
    {
      id: '1',
      title: 'Food Safety Guidelines',
      category: 'Food Safety',
      views: 1250,
      uniqueUsers: 48,
      avgReadTime: 12.5,
      completionRate: 87,
      downloadCount: 156,
      lastAccessed: '2024-01-27T10:30:00Z',
      complianceScore: 94,
      trend: 'up',
      riskLevel: 'low',
    },
    {
      id: '2',
      title: 'Kitchen Equipment Operation',
      category: 'Kitchen Operations',
      views: 980,
      uniqueUsers: 35,
      avgReadTime: 15.2,
      completionRate: 92,
      downloadCount: 89,
      lastAccessed: '2024-01-27T09:15:00Z',
      complianceScore: 96,
      trend: 'up',
      riskLevel: 'low',
    },
    {
      id: '3',
      title: 'Customer Service Standards',
      category: 'Customer Service',
      views: 875,
      uniqueUsers: 42,
      avgReadTime: 8.7,
      completionRate: 78,
      downloadCount: 67,
      lastAccessed: '2024-01-26T16:45:00Z',
      complianceScore: 82,
      trend: 'down',
      riskLevel: 'medium',
    },
    {
      id: '4',
      title: 'Emergency Procedures',
      category: 'Emergency',
      views: 425,
      uniqueUsers: 28,
      avgReadTime: 6.3,
      completionRate: 65,
      downloadCount: 23,
      lastAccessed: '2024-01-25T14:20:00Z',
      complianceScore: 71,
      trend: 'down',
      riskLevel: 'high',
    },
    // Add more mock data...
  ], []);

  const categoryPerformance = useMemo<CategoryPerformance[]>(() => [
    {
      category: 'Food Safety',
      totalViews: 2150,
      averageCompliance: 94,
      sopCount: 8,
      activeUsers: 45,
      riskScore: 15,
      trend: 5.2,
    },
    {
      category: 'Kitchen Operations',
      totalViews: 1875,
      averageCompliance: 91,
      sopCount: 12,
      activeUsers: 38,
      riskScore: 22,
      trend: 3.8,
    },
    {
      category: 'Customer Service',
      totalViews: 1650,
      averageCompliance: 87,
      sopCount: 6,
      activeUsers: 42,
      riskScore: 28,
      trend: -2.1,
    },
    {
      category: 'Cleaning',
      totalViews: 1425,
      averageCompliance: 96,
      sopCount: 10,
      activeUsers: 35,
      riskScore: 12,
      trend: 7.3,
    },
    {
      category: 'Emergency',
      totalViews: 650,
      averageCompliance: 73,
      sopCount: 4,
      activeUsers: 28,
      riskScore: 45,
      trend: -8.5,
    },
  ], []);

  const accessPatterns = useMemo<AccessPattern[]>(() => [
    { hour: 8, day: 'Monday', views: 145, users: 23 },
    { hour: 9, day: 'Monday', views: 189, users: 31 },
    { hour: 10, day: 'Monday', views: 234, users: 38 },
    { hour: 11, day: 'Monday', views: 198, users: 34 },
    { hour: 12, day: 'Monday', views: 167, users: 28 },
    { hour: 13, day: 'Monday', views: 156, users: 26 },
    { hour: 14, day: 'Monday', views: 201, users: 33 },
    { hour: 15, day: 'Monday', views: 176, users: 29 },
    { hour: 16, day: 'Monday', views: 143, users: 24 },
    { hour: 17, day: 'Monday', views: 98, users: 16 },
  ], []);

  const complianceIssues = useMemo<ComplianceIssue[]>(() => [
    {
      id: '1',
      sopId: '4',
      sopTitle: 'Emergency Procedures',
      issueType: 'low_compliance',
      severity: 'critical',
      affectedUsers: 28,
      description: 'Only 65% completion rate for mandatory emergency training',
      recommendation: 'Schedule mandatory training sessions for all staff',
      dueDate: '2024-02-01',
    },
    {
      id: '2',
      sopId: '3',
      sopTitle: 'Customer Service Standards',
      issueType: 'incomplete',
      severity: 'high',
      affectedUsers: 15,
      description: 'Multiple staff members have not completed service training',
      recommendation: 'Follow up with incomplete trainees and provide support',
      dueDate: '2024-01-30',
    },
    {
      id: '3',
      sopId: '8',
      sopTitle: 'Inventory Management',
      issueType: 'no_access',
      severity: 'medium',
      affectedUsers: 8,
      description: 'New staff have not accessed inventory procedures',
      recommendation: 'Include in onboarding checklist',
      dueDate: '2024-02-05',
    },
  ], []);

  // Filter and sort SOP data
  const filteredSOPData = useMemo(() => {
    let filtered = sopUsageData.filter(sop => 
      (selectedCategory === 'all' || sop.category === selectedCategory) &&
      sop.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof SOPUsageMetric];
      const bValue = b[sortBy as keyof SOPUsageMetric];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return sortOrder === 'asc' 
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return filtered;
  }, [sopUsageData, selectedCategory, searchTerm, sortBy, sortOrder]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalViews = sopUsageData.reduce((sum, sop) => sum + sop.views, 0);
    const totalUsers = new Set(sopUsageData.map(sop => sop.uniqueUsers)).size;
    const avgCompliance = sopUsageData.reduce((sum, sop) => sum + sop.complianceScore, 0) / sopUsageData.length;
    const totalDownloads = sopUsageData.reduce((sum, sop) => sum + sop.downloadCount, 0);
    
    return {
      totalViews,
      totalUsers,
      avgCompliance,
      totalDownloads,
      riskItems: sopUsageData.filter(sop => sop.riskLevel === 'high').length,
    };
  }, [sopUsageData]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: t('analytics.data_refreshed'),
        description: t('analytics.sop_data_refreshed'),
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

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      low: 'default',
      medium: 'secondary',
      high: 'destructive',
    } as const;

    return (
      <Badge variant={variants[riskLevel as keyof typeof variants]}>
        {t(`analytics.risk_${riskLevel}`)}
      </Badge>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold">{t('analytics.sop_analytics')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('analytics.sop_analytics_desc')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.total_views')}</p>
                <p className="text-2xl font-bold">{summaryMetrics.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.active_users')}</p>
                <p className="text-2xl font-bold">{summaryMetrics.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.avg_compliance')}</p>
                <p className="text-2xl font-bold">{summaryMetrics.avgCompliance.toFixed(1)}%</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.downloads')}</p>
                <p className="text-2xl font-bold">{summaryMetrics.totalDownloads}</p>
              </div>
              <Download className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.risk_items')}</p>
                <p className="text-2xl font-bold text-red-600">{summaryMetrics.riskItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('analytics.search_sops')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('analytics.all_categories')}</SelectItem>
                <SelectItem value="Food Safety">{t('categories.food_safety')}</SelectItem>
                <SelectItem value="Kitchen Operations">{t('categories.kitchen_ops')}</SelectItem>
                <SelectItem value="Customer Service">{t('categories.customer_service')}</SelectItem>
                <SelectItem value="Cleaning">{t('categories.cleaning')}</SelectItem>
                <SelectItem value="Emergency">{t('categories.emergency')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('time.last_7_days')}</SelectItem>
                <SelectItem value="30d">{t('time.last_30_days')}</SelectItem>
                <SelectItem value="90d">{t('time.last_90_days')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('analytics.overview')}</TabsTrigger>
          <TabsTrigger value="usage">{t('analytics.usage_patterns')}</TabsTrigger>
          <TabsTrigger value="compliance">{t('analytics.compliance')}</TabsTrigger>
          <TabsTrigger value="performance">{t('analytics.performance')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.category_performance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="totalViews" 
                      fill="#E31B23" 
                      name={t('analytics.total_views')}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="averageCompliance" 
                      stroke="#008B8B" 
                      strokeWidth={3}
                      name={t('analytics.compliance_rate')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Access Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.daily_access_patterns')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={accessPatterns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#D4AF37" 
                      fill="#D4AF37"
                      fillOpacity={0.6}
                      name={t('analytics.page_views')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#008B8B" 
                      fill="#008B8B"
                      fillOpacity={0.4}
                      name={t('analytics.unique_users')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Patterns Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.sop_usage_details')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSOPData.map((sop) => (
                  <div
                    key={sop.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold">{sop.title}</h4>
                        <Badge variant="outline">{sop.category}</Badge>
                        {getRiskBadge(sop.riskLevel)}
                        {getTrendIcon(sop.trend)}
                      </div>
                      <div className="flex items-center space-x-6 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{sop.views} {t('analytics.views')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{sop.uniqueUsers} {t('analytics.users')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{sop.avgReadTime}m {t('analytics.avg_time')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Download className="h-3 w-3" />
                          <span>{sop.downloadCount} {t('analytics.downloads')}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{sop.completionRate}%</div>
                        <div className="text-xs text-muted-foreground">{t('analytics.completion')}</div>
                        <Progress value={sop.completionRate} className="w-20 h-2 mt-1" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold">{sop.complianceScore}%</div>
                        <div className="text-xs text-muted-foreground">{t('analytics.compliance')}</div>
                        <Progress value={sop.complianceScore} className="w-20 h-2 mt-1" />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('analytics.view_details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            {t('analytics.export_data')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Target className="h-4 w-4 mr-2" />
                            {t('analytics.set_target')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                {t('analytics.compliance_issues')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold">{issue.sopTitle}</h4>
                          <Badge 
                            variant={
                              issue.severity === 'critical' ? 'destructive' :
                              issue.severity === 'high' ? 'secondary' : 'default'
                            }
                          >
                            {issue.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {issue.affectedUsers} {t('analytics.users_affected')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                        <p className="text-sm text-blue-600">{issue.recommendation}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{t('analytics.due')}: {issue.dueDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.top_performing_sops')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredSOPData
                    .filter(sop => sop.complianceScore >= 90)
                    .slice(0, 5)
                    .map((sop, index) => (
                    <div key={sop.id} className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                        <span className="text-sm font-semibold text-green-600">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{sop.title}</h4>
                        <p className="text-sm text-muted-foreground">{sop.complianceScore}% compliance</p>
                      </div>
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.needs_attention')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredSOPData
                    .filter(sop => sop.complianceScore < 80)
                    .slice(0, 5)
                    .map((sop, index) => (
                    <div key={sop.id} className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{sop.title}</h4>
                        <p className="text-sm text-muted-foreground">{sop.complianceScore}% compliance</p>
                      </div>
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SOPAnalyticsDashboard;