'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  History, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Filter,
  Play,
  RotateCcw,
  Download,
  Star,
  Trophy,
  Target,
  TrendingUp,
  BarChart3,
  Timer,
  Award,
  Zap,
  Eye,
  Share2,
  Trash2,
  Archive,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SOPHistoryPageProps {
  params: Promise<{ locale: string }>;
}

interface SOPCompletion {
  id: string;
  sop_id: string;
  sop_title: string;
  sop_title_fr: string;
  category: string;
  category_fr: string;
  status: 'completed' | 'failed' | 'abandoned' | 'in_progress';
  started_at: string;
  completed_at?: string;
  duration: number; // in minutes
  estimated_duration: number;
  completion_percentage: number;
  steps_completed: number;
  total_steps: number;
  difficulty: 'easy' | 'medium' | 'hard';
  photos_taken: number;
  notes?: string;
  score?: number;
  is_required: boolean;
}

interface HistoryStats {
  total_completions: number;
  this_week: number;
  this_month: number;
  success_rate: number;
  average_duration: number;
  total_time_spent: number;
  streak_days: number;
  certificates_earned: number;
}

// Mock history data
const MOCK_COMPLETIONS: SOPCompletion[] = [
  {
    id: '1',
    sop_id: '1',
    sop_title: 'Hand Washing Procedure',
    sop_title_fr: 'Procédure de Lavage des Mains',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    status: 'completed',
    started_at: '2024-01-25T14:30:00Z',
    completed_at: '2024-01-25T14:35:00Z',
    duration: 5,
    estimated_duration: 5,
    completion_percentage: 100,
    steps_completed: 7,
    total_steps: 7,
    difficulty: 'easy',
    photos_taken: 2,
    score: 95,
    is_required: true,
  },
  {
    id: '2',
    sop_id: '2',
    sop_title: 'Temperature Control Monitoring',
    sop_title_fr: 'Surveillance du Contrôle de Température',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    status: 'completed',
    started_at: '2024-01-25T10:15:00Z',
    completed_at: '2024-01-25T10:28:00Z',
    duration: 13,
    estimated_duration: 15,
    completion_percentage: 100,
    steps_completed: 8,
    total_steps: 8,
    difficulty: 'medium',
    photos_taken: 4,
    score: 88,
    is_required: true,
  },
  {
    id: '3',
    sop_id: '3',
    sop_title: 'Kitchen Equipment Cleaning',
    sop_title_fr: 'Nettoyage de l\'Équipement de Cuisine',
    category: 'Cleaning',
    category_fr: 'Nettoyage',
    status: 'failed',
    started_at: '2024-01-24T16:00:00Z',
    completed_at: '2024-01-24T16:22:00Z',
    duration: 22,
    estimated_duration: 30,
    completion_percentage: 75,
    steps_completed: 6,
    total_steps: 8,
    difficulty: 'medium',
    photos_taken: 1,
    score: 65,
    is_required: false,
    notes: 'Equipment was already being used'
  },
  {
    id: '4',
    sop_id: '1',
    sop_title: 'Hand Washing Procedure',
    sop_title_fr: 'Procédure de Lavage des Mains',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    status: 'abandoned',
    started_at: '2024-01-24T08:45:00Z',
    duration: 2,
    estimated_duration: 5,
    completion_percentage: 25,
    steps_completed: 2,
    total_steps: 7,
    difficulty: 'easy',
    photos_taken: 0,
    is_required: true,
    notes: 'Interrupted by customer'
  }
];

const MOCK_STATS: HistoryStats = {
  total_completions: 45,
  this_week: 12,
  this_month: 38,
  success_rate: 87,
  average_duration: 12.5,
  total_time_spent: 580, // minutes
  streak_days: 5,
  certificates_earned: 3,
};

export default function SOPHistoryPage({ params }: SOPHistoryPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [completions, setCompletions] = useState<SOPCompletion[]>(MOCK_COMPLETIONS);
  const [stats, setStats] = useState<HistoryStats>(MOCK_STATS);
  const [activeTab, setActiveTab] = useState('recent');

  const router = useRouter();
  const t = useTranslations('sop');

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  // Filter completions
  const filteredCompletions = completions.filter(completion => {
    const matchesSearch = searchQuery === '' || 
      completion.sop_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      completion.sop_title_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      completion.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || completion.status === statusFilter;
    
    const now = new Date();
    const completionDate = new Date(completion.started_at);
    let matchesTime = true;
    
    if (timeFilter === 'today') {
      matchesTime = completionDate.toDateString() === now.toDateString();
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesTime = completionDate >= weekAgo;
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesTime = completionDate >= monthAgo;
    }
    
    return matchesSearch && matchesStatus && matchesTime;
  });

  const handleSOPRestart = (completion: SOPCompletion) => {
    router.push(`/${locale}/sop/documents/${completion.sop_id}`);
  };

  const handleViewDetails = (completion: SOPCompletion) => {
    // In a real app, this might open a detailed view modal
    toast({
      title: t('history.viewDetails'),
      description: locale === 'fr' ? completion.sop_title_fr : completion.sop_title,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'abandoned': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'failed': return XCircle;
      case 'abandoned': return AlertTriangle;
      case 'in_progress': return Clock;
      default: return Clock;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return t('time.minutesShort', { count: Math.round(minutes) });
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

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
                  <History className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('history.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('history.subtitle', { count: stats.total_completions })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/sop/analytics`)}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                {t('history.analytics')}
              </Button>
              <Button
                onClick={() => router.push(`/${locale}/sop`)}
                className="bg-red-600 hover:bg-red-700 gap-2"
              >
                <Play className="w-4 h-4" />
                {t('history.startNew')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="recent">{t('history.tabs.recent')}</TabsTrigger>
            <TabsTrigger value="stats">{t('history.tabs.statistics')}</TabsTrigger>
            <TabsTrigger value="achievements">{t('history.tabs.achievements')}</TabsTrigger>
          </TabsList>

          {/* Recent Completions */}
          <TabsContent value="recent" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={t('history.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('history.filters.allStatuses')}</SelectItem>
                      <SelectItem value="completed">{t('history.status.completed')}</SelectItem>
                      <SelectItem value="failed">{t('history.status.failed')}</SelectItem>
                      <SelectItem value="abandoned">{t('history.status.abandoned')}</SelectItem>
                      <SelectItem value="in_progress">{t('history.status.inProgress')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('history.filters.allTime')}</SelectItem>
                      <SelectItem value="today">{t('history.filters.today')}</SelectItem>
                      <SelectItem value="week">{t('history.filters.thisWeek')}</SelectItem>
                      <SelectItem value="month">{t('history.filters.thisMonth')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Completions List */}
            {filteredCompletions.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('history.noResults.title')}
                  </h3>
                  <p className="text-gray-600">
                    {t('history.noResults.description')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCompletions.map((completion) => {
                  const StatusIcon = getStatusIcon(completion.status);
                  return (
                    <Card key={completion.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center",
                              getStatusColor(completion.status)
                            )}>
                              <StatusIcon className="w-6 h-6" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {locale === 'fr' ? completion.sop_title_fr : completion.sop_title}
                                </h3>
                                {completion.is_required && (
                                  <Badge variant="destructive" className="bg-red-100 text-red-700">
                                    {t('status.required')}
                                  </Badge>
                                )}
                                <Badge className={getDifficultyColor(completion.difficulty)}>
                                  {t(`difficulty.${completion.difficulty}`)}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-6 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatRelativeTime(completion.started_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="w-4 h-4" />
                                  {formatDuration(completion.duration)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Target className="w-4 h-4" />
                                  {completion.steps_completed}/{completion.total_steps} {t('history.steps')}
                                </span>
                                {completion.score && (
                                  <span className="flex items-center gap-1">
                                    <Trophy className="w-4 h-4" />
                                    {completion.score}%
                                  </span>
                                )}
                              </div>
                              
                              {completion.notes && (
                                <p className="text-sm text-gray-600 mt-2 italic">
                                  {completion.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleViewDetails(completion)}
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              {t('history.viewDetails')}
                            </Button>
                            <Button
                              onClick={() => handleSOPRestart(completion)}
                              className="bg-red-600 hover:bg-red-700 gap-2"
                            >
                              <RotateCcw className="w-4 h-4" />
                              {t('history.restart')}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                              {t('history.progress')}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {completion.completion_percentage}%
                            </span>
                          </div>
                          <Progress 
                            value={completion.completion_percentage} 
                            className={cn(
                              "h-2",
                              completion.status === 'completed' && "bg-green-100",
                              completion.status === 'failed' && "bg-red-100",
                              completion.status === 'abandoned' && "bg-yellow-100"
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="stats" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('history.stats.totalCompletions')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total_completions}</p>
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
                      <p className="text-sm text-gray-600">{t('history.stats.successRate')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.success_rate}%</p>
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
                      <p className="text-sm text-gray-600">{t('history.stats.avgDuration')}</p>
                      <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.average_duration)}</p>
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
                      <p className="text-sm text-gray-600">{t('history.stats.currentStreak')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.streak_days} {t('time.days')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t('history.stats.weeklyProgress')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('history.stats.thisWeek')}</span>
                    <span className="font-medium">{stats.this_week} {t('history.completions')}</span>
                  </div>
                  <Progress value={(stats.this_week / 20) * 100} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('history.stats.thisMonth')}</span>
                    <span className="font-medium">{stats.this_month} {t('history.completions')}</span>
                  </div>
                  <Progress value={(stats.this_month / 60) * 100} className="h-2" />
                </div>
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
                  <h3 className="font-semibold text-gray-900 mb-2">{t('history.achievements.perfectScore')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('history.achievements.perfectScoreDesc')}</p>
                  <Badge className="bg-yellow-100 text-yellow-700">
                    {t('history.achievements.earned')}
                  </Badge>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('history.achievements.speedDemon')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('history.achievements.speedDemonDesc')}</p>
                  <Badge className="bg-blue-100 text-blue-700">
                    {t('history.achievements.earned')}
                  </Badge>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('history.achievements.consistency')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('history.achievements.consistencyDesc')}</p>
                  <Badge variant="outline">
                    3/7 {t('time.days')}
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