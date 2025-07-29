'use client';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Clock, 
  ArrowLeft,
  Calendar,
  Trophy,
  Award,
  Zap,
  Users,
  CheckCircle,
  AlertTriangle,
  Star,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import dynamic from 'next/dynamic';

// Simple chart placeholder component for SSR compatibility
const ChartPlaceholder = ({ height = 200 }: { height?: number }) => (
  <div className="flex items-center justify-center bg-gray-50 rounded-lg" style={{ height }}>
    <div className="text-center">
      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2 animate-pulse"></div>
      <p className="text-sm text-gray-500">Chart loading...</p>
    </div>
  </div>
);

interface SOPAnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

interface AnalyticsData {
  totalCompletions: number;
  averageTime: number;
  successRate: number;
  currentStreak: number;
  totalTimeSpent: number;
  certificatesEarned: number;
  weeklyCompletions: Array<{ day: string; completions: number; target: number }>;
  categoryPerformance: Array<{ category: string; completions: number; avgTime: number; successRate: number }>;
  timeDistribution: Array<{ timeRange: string; count: number }>;
  difficultyBreakdown: Array<{ difficulty: string; count: number; avgTime: number }>;
  recentActivity: Array<{
    id: string;
    sopTitle: string;
    category: string;
    completedAt: string;
    duration: number;
    success: boolean;
    score?: number;
  }>;
}

// Mock analytics data
const MOCK_ANALYTICS: AnalyticsData = {
  totalCompletions: 127,
  averageTime: 12.5,
  successRate: 94,
  currentStreak: 8,
  totalTimeSpent: 1587, // minutes
  certificatesEarned: 5,
  weeklyCompletions: [
    { day: 'Mon', completions: 4, target: 5 },
    { day: 'Tue', completions: 6, target: 5 },
    { day: 'Wed', completions: 3, target: 5 },
    { day: 'Thu', completions: 8, target: 5 },
    { day: 'Fri', completions: 5, target: 5 },
    { day: 'Sat', completions: 2, target: 3 },
    { day: 'Sun', completions: 1, target: 3 },
  ],
  categoryPerformance: [
    { category: 'Food Safety', completions: 45, avgTime: 8.2, successRate: 98 },
    { category: 'Cleaning', completions: 32, avgTime: 15.4, successRate: 92 },
    { category: 'Service', completions: 28, avgTime: 10.1, successRate: 95 },
    { category: 'Kitchen Operations', completions: 22, avgTime: 18.6, successRate: 89 },
  ],
  timeDistribution: [
    { timeRange: '0-5 min', count: 42 },
    { timeRange: '6-10 min', count: 35 },
    { timeRange: '11-15 min', count: 28 },
    { timeRange: '16-20 min', count: 15 },
    { timeRange: '20+ min', count: 7 },
  ],
  difficultyBreakdown: [
    { difficulty: 'Easy', count: 65, avgTime: 6.8 },
    { difficulty: 'Medium', count: 45, avgTime: 14.2 },
    { difficulty: 'Hard', count: 17, avgTime: 24.5 },
  ],
  recentActivity: [
    {
      id: '1',
      sopTitle: 'Hand Washing Procedure',
      category: 'Food Safety',
      completedAt: '2024-01-25T14:30:00Z',
      duration: 4.5,
      success: true,
      score: 95,
    },
    {
      id: '2',
      sopTitle: 'Temperature Control',
      category: 'Food Safety',
      completedAt: '2024-01-25T10:15:00Z',
      duration: 12.3,
      success: true,
      score: 88,
    },
    {
      id: '3',
      sopTitle: 'Equipment Cleaning',
      category: 'Cleaning',
      completedAt: '2024-01-24T16:20:00Z',
      duration: 22.1,
      success: false,
    },
  ],
};

const CHART_COLORS = ['#E31B23', '#D4AF37', '#008B8B', '#D2B48C', '#231F20'];

export default function SOPAnalyticsPage({ params }: SOPAnalyticsPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [analytics, setAnalytics] = useState<AnalyticsData>(MOCK_ANALYTICS);
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();
  const t = useTranslations('sop');
  const { user } = useAuthStore();

  // Track client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Show loading while params are resolving or client is not ready
  if (!resolvedParams || !isClient) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes.toFixed(1)} ${t('time.minutes')}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

  const weeklyTarget = analytics.weeklyCompletions.reduce((sum, day) => sum + day.target, 0);
  const weeklyActual = analytics.weeklyCompletions.reduce((sum, day) => sum + day.completions, 0);
  const weeklyProgress = (weeklyActual / weeklyTarget) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('analytics.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('analytics.subtitle', { user: user?.full_name || 'User' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('analytics.timeRange.week')}</SelectItem>
                  <SelectItem value="month">{t('analytics.timeRange.month')}</SelectItem>
                  <SelectItem value="quarter">{t('analytics.timeRange.quarter')}</SelectItem>
                  <SelectItem value="year">{t('analytics.timeRange.year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('analytics.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Target className="w-4 h-4" />
              {t('analytics.tabs.performance')}
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('analytics.tabs.trends')}
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="w-4 h-4" />
              {t('analytics.tabs.achievements')}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('analytics.totalCompletions')}</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.totalCompletions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('analytics.successRate')}</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.successRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Timer className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('analytics.avgTime')}</p>
                      <p className="text-2xl font-bold text-gray-900">{formatDuration(analytics.averageTime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('analytics.currentStreak')}</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.currentStreak} {t('time.days')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {t('analytics.weeklyProgress')}
                  </span>
                  <Badge variant={weeklyProgress >= 100 ? "default" : "outline"}>
                    {weeklyActual}/{weeklyTarget} {t('analytics.completions')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{t('analytics.weeklyTarget')}</span>
                    <span className="font-medium">{weeklyProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={weeklyProgress} className="h-2" />
                </div>
                
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.weeklyCompletions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completions" fill="#E31B23" />
                    <Bar dataKey="target" fill="#D4AF37" opacity={0.3} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t('analytics.recentActivity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          activity.success ? "bg-green-100" : "bg-red-100"
                        )}>
                          {activity.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{activity.sopTitle}</p>
                          <p className="text-sm text-gray-600">{activity.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {formatDuration(activity.duration)}
                          </span>
                          {activity.score && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{activity.score}%</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{formatRelativeTime(activity.completedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance" className="space-y-6">
            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.categoryPerformance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="completions" fill="#E31B23" name={t('analytics.completions')} />
                    <Bar yAxisId="right" dataKey="successRate" fill="#D4AF37" name={t('analytics.successRate')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('analytics.timeDistribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analytics.timeDistribution}
                        dataKey="count"
                        nameKey="timeRange"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {analytics.timeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('analytics.difficultyBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.difficultyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="difficulty" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#008B8B" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.progressTrends')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics.weeklyCompletions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="completions"
                      stackId="1"
                      stroke="#E31B23"
                      fill="#E31B23"
                      fillOpacity={0.6}
                      name={t('analytics.completions')}
                    />
                    <Area
                      type="monotone"
                      dataKey="target"
                      stackId="2"
                      stroke="#D4AF37"
                      fill="#D4AF37"
                      fillOpacity={0.3}
                      name={t('analytics.target')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('analytics.achievements.perfectWeek')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('analytics.achievements.perfectWeekDesc')}</p>
                  <Badge className="bg-yellow-100 text-yellow-700">
                    {t('analytics.achievements.earned')}
                  </Badge>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('analytics.achievements.speedRunner')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('analytics.achievements.speedRunnerDesc')}</p>
                  <Badge className="bg-blue-100 text-blue-700">
                    {t('analytics.achievements.earned')}
                  </Badge>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('analytics.achievements.consistency')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('analytics.achievements.consistencyDesc')}</p>
                  <Badge variant="outline">
                    {analytics.currentStreak}/30 {t('time.days')}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}