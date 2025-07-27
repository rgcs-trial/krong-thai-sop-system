/**
 * Training Analytics Dashboard Component
 * Comprehensive analytics and reporting for training managers
 * Displays training progress, completion rates, and performance metrics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Award, 
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
  Star,
  Trophy,
  Zap,
  DollarSign,
  Calculator,
  TrendingRight,
  Activity,
  Brain,
  FileBarChart
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
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
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
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

import type { 
  TrainingModule,
  TrainingDashboardStats,
  TrainingAnalytics,
  UserTrainingProgress 
} from '@/types/database';

interface TrainingAnalyticsDashboardProps {
  className?: string;
}

interface ModulePerformance {
  module: TrainingModule;
  completionRate: number;
  averageScore: number;
  averageTime: number;
  enrollments: number;
  certificates: number;
  trend: 'up' | 'down' | 'stable';
}

interface UserPerformance {
  userId: string;
  userName: string;
  completedModules: number;
  averageScore: number;
  totalTime: number;
  certificates: number;
  lastActivity: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ROIMetrics {
  trainingCost: number;
  timeSaved: number;
  errorReduction: number;
  complianceImprovement: number;
  customerSatisfactionGain: number;
  totalBenefit: number;
  roiPercentage: number;
}

interface CompetencyGap {
  category: string;
  requiredLevel: number;
  currentLevel: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
}

interface TrainingTrend {
  date: string;
  enrollments: number;
  completions: number;
  averageScore: number;
  satisfaction: number;
  cost: number;
}

export function TrainingAnalyticsDashboard({ className }: TrainingAnalyticsDashboardProps) {
  const { t, locale } = useI18n();
  
  // Training store
  const {
    modules,
    dashboardStats,
    loadModules,
    loadDashboardStats,
    getModuleAnalytics,
    getUserAnalytics,
  } = useTrainingStore();

  // Local state
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [modulePerformance, setModulePerformance] = useState<ModulePerformance[]>([]);
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  // Enhanced analytics data
  const roiMetrics = useMemo<ROIMetrics>(() => ({
    trainingCost: 125000, // THB spent on training
    timeSaved: 285000, // THB value of time saved
    errorReduction: 95000, // THB saved from reduced errors
    complianceImprovement: 150000, // THB value of compliance gains
    customerSatisfactionGain: 75000, // THB value of customer satisfaction
    totalBenefit: 605000,
    roiPercentage: 384, // 384% ROI
  }), []);

  const competencyGaps = useMemo<CompetencyGap[]>(() => [
    { category: 'Food Safety', requiredLevel: 95, currentLevel: 87, gap: 8, priority: 'high' },
    { category: 'Customer Service', requiredLevel: 90, currentLevel: 82, gap: 8, priority: 'high' },
    { category: 'Kitchen Operations', requiredLevel: 85, currentLevel: 91, gap: -6, priority: 'low' },
    { category: 'Cleaning', requiredLevel: 90, currentLevel: 95, gap: -5, priority: 'low' },
    { category: 'Emergency', requiredLevel: 100, currentLevel: 73, gap: 27, priority: 'high' },
    { category: 'Inventory', requiredLevel: 80, currentLevel: 76, gap: 4, priority: 'medium' },
  ], []);

  const trainingTrends = useMemo<TrainingTrend[]>(() => [
    { date: '2024-01-01', enrollments: 25, completions: 18, averageScore: 78, satisfaction: 4.2, cost: 15000 },
    { date: '2024-01-08', enrollments: 32, completions: 28, averageScore: 82, satisfaction: 4.4, cost: 18000 },
    { date: '2024-01-15', enrollments: 28, completions: 25, averageScore: 85, satisfaction: 4.6, cost: 16000 },
    { date: '2024-01-22', enrollments: 35, completions: 31, averageScore: 87, satisfaction: 4.7, cost: 19500 },
    { date: '2024-01-29', enrollments: 42, completions: 38, averageScore: 89, satisfaction: 4.8, cost: 22000 },
  ], []);

  const learningEfficiencyData = useMemo(() => [
    { subject: 'Food Safety', A: 92, B: 87, fullMark: 100 },
    { subject: 'Customer Service', A: 78, B: 82, fullMark: 100 },
    { subject: 'Kitchen Ops', A: 91, B: 85, fullMark: 100 },
    { subject: 'Cleaning', A: 95, B: 90, fullMark: 100 },
    { subject: 'Emergency', A: 73, B: 100, fullMark: 100 },
    { subject: 'Inventory', A: 76, B: 80, fullMark: 100 },
  ], []);

  // Load initial data
  useEffect(() => {
    const loadAnalyticsData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadModules(),
          loadDashboardStats(),
        ]);
      } catch (error) {
        console.error('Error loading analytics data:', error);
        toast({
          title: t('error.analytics_load_failed'),
          description: t('error.analytics_load_failed_desc'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalyticsData();
  }, [loadModules, loadDashboardStats, t]);

  // Load module performance data
  useEffect(() => {
    const loadModulePerformance = async () => {
      if (modules.length === 0) return;

      try {
        const performancePromises = modules.map(async (module) => {
          const analytics = await getModuleAnalytics(module.id);
          return {
            module,
            completionRate: analytics?.completion_rate || 0,
            averageScore: analytics?.average_score || 0,
            averageTime: analytics?.average_time || 0,
            enrollments: analytics?.total_enrollments || 0,
            certificates: analytics?.certificates_issued || 0,
            trend: analytics?.trend || 'stable',
          };
        });

        const performance = await Promise.all(performancePromises);
        setModulePerformance(performance);
      } catch (error) {
        console.error('Error loading module performance:', error);
      }
    };

    loadModulePerformance();
  }, [modules, getModuleAnalytics, selectedPeriod]);

  // Generate mock user performance data (in real app, this would come from API)
  useEffect(() => {
    const generateMockUserData = () => {
      const mockUsers: UserPerformance[] = [
        {
          userId: '1',
          userName: 'สมชาย ใจดี (Somchai Jaidee)',
          completedModules: 8,
          averageScore: 92,
          totalTime: 240,
          certificates: 6,
          lastActivity: '2024-01-25',
          riskLevel: 'low',
        },
        {
          userId: '2',
          userName: 'มาลี สุขใส (Mali Suksa)',
          completedModules: 5,
          averageScore: 78,
          totalTime: 180,
          certificates: 3,
          lastActivity: '2024-01-23',
          riskLevel: 'medium',
        },
        {
          userId: '3',
          userName: 'วิชัย มั่นใจ (Wichai Manjai)',
          completedModules: 3,
          averageScore: 65,
          totalTime: 120,
          certificates: 1,
          lastActivity: '2024-01-15',
          riskLevel: 'high',
        },
        // Add more mock users as needed
      ];
      setUserPerformance(mockUsers);
    };

    generateMockUserData();
  }, [selectedPeriod]);

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadDashboardStats();
      toast({
        title: t('training.data_refreshed'),
        description: t('training.data_refreshed_desc'),
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
  const handleExport = () => {
    // Implementation for exporting analytics data
    toast({
      title: t('training.export_started'),
      description: t('training.export_started_desc'),
    });
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get risk badge
  const getRiskBadge = (riskLevel: 'low' | 'medium' | 'high') => {
    const variants = {
      low: 'default',
      medium: 'secondary',
      high: 'destructive',
    } as const;

    return (
      <Badge variant={variants[riskLevel]}>
        {t(`training.risk_${riskLevel}`)}
      </Badge>
    );
  };

  if (isLoading && !dashboardStats) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('training.loading_analytics')}</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t('training.analytics_dashboard')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('training.analytics_dashboard_desc')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">{t('common.filters')}:</span>
            </div>
            
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('time.last_7_days')}</SelectItem>
                <SelectItem value="30d">{t('time.last_30_days')}</SelectItem>
                <SelectItem value="90d">{t('time.last_90_days')}</SelectItem>
                <SelectItem value="1y">{t('time.last_year')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('training.select_module')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('training.all_modules')}</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    {locale === 'th' ? module.title_th : module.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('training.select_department')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('training.all_departments')}</SelectItem>
                <SelectItem value="kitchen">{t('departments.kitchen')}</SelectItem>
                <SelectItem value="service">{t('departments.service')}</SelectItem>
                <SelectItem value="management">{t('departments.management')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('training.total_modules')}
                  </p>
                  <div className="text-2xl font-bold">{dashboardStats.total_modules}</div>
                  <div className="text-sm text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {dashboardStats.active_modules} {t('training.active')}
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('training.completion_rate')}
                  </p>
                  <div className="text-2xl font-bold">
                    {Math.round(dashboardStats.average_completion_rate)}%
                  </div>
                  <div className="text-sm text-green-600 flex items-center mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {dashboardStats.user_completed} {t('training.completed')}
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('training.average_score')}
                  </p>
                  <div className="text-2xl font-bold">
                    {Math.round(dashboardStats.average_score)}%
                  </div>
                  <div className="text-sm text-blue-600 flex items-center mt-1">
                    <Star className="h-3 w-3 mr-1" />
                    {t('training.excellent')}
                  </div>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('training.certificates_issued')}
                  </p>
                  <div className="text-2xl font-bold">{dashboardStats.certificates_earned}</div>
                  <div className="text-sm text-orange-600 flex items-center mt-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {dashboardStats.certificates_expiring} {t('training.expiring_soon')}
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="modules">{t('training.module_performance')}</TabsTrigger>
          <TabsTrigger value="users">{t('training.user_performance')}</TabsTrigger>
          <TabsTrigger value="trends">{t('training.trends_insights')}</TabsTrigger>
        </TabsList>

        {/* Module Performance */}
        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('training.module_performance_analysis')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modulePerformance.map((performance) => (
                  <div
                    key={performance.module.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold">
                          {locale === 'th' ? performance.module.title_th : performance.module.title}
                        </h4>
                        {performance.module.is_mandatory && (
                          <Badge variant="destructive">{t('training.mandatory')}</Badge>
                        )}
                        {getTrendIcon(performance.trend)}
                      </div>
                      <div className="flex items-center space-x-6 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{performance.enrollments} {t('training.enrolled')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{performance.averageTime}m {t('training.avg_time')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Trophy className="h-3 w-3" />
                          <span>{performance.certificates} {t('training.certificates')}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{performance.completionRate}%</div>
                        <div className="text-xs text-muted-foreground">{t('training.completion')}</div>
                        <Progress value={performance.completionRate} className="w-20 h-2 mt-1" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold">{performance.averageScore}%</div>
                        <div className="text-xs text-muted-foreground">{t('training.avg_score')}</div>
                        <Progress value={performance.averageScore} className="w-20 h-2 mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Performance */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('training.user_performance_analysis')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userPerformance.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold">{user.userName}</h4>
                        {getRiskBadge(user.riskLevel)}
                      </div>
                      <div className="flex items-center space-x-6 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{user.completedModules} {t('training.modules_completed')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{user.totalTime}m {t('training.total_time')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{t('training.last_active')}: {user.lastActivity}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{user.averageScore}%</div>
                        <div className="text-xs text-muted-foreground">{t('training.avg_score')}</div>
                        <Progress value={user.averageScore} className="w-20 h-2 mt-1" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold flex items-center justify-center">
                          <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
                          {user.certificates}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('training.certificates')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends & Insights */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                  {t('training.quick_insights')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800">{t('training.positive_trend')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('training.positive_trend_desc')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-800">{t('training.attention_needed')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('training.attention_needed_desc')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Star className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800">{t('training.opportunity')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('training.opportunity_desc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('training.recommendations')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-1">
                      {t('training.recommendation_1_title')}
                    </h4>
                    <p className="text-sm text-blue-700">
                      {t('training.recommendation_1_desc')}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-1">
                      {t('training.recommendation_2_title')}
                    </h4>
                    <p className="text-sm text-green-700">
                      {t('training.recommendation_2_desc')}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-1">
                      {t('training.recommendation_3_title')}
                    </h4>
                    <p className="text-sm text-purple-700">
                      {t('training.recommendation_3_desc')}
                    </p>
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

export default TrainingAnalyticsDashboard;