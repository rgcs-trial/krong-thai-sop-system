/**
 * Training Analytics and Reporting Dashboard Component
 * Comprehensive analytics and reporting for training effectiveness
 * Features advanced metrics, predictive analytics, ROI calculation,
 * performance benchmarking, and actionable insights
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Users,
  Award,
  BookOpen,
  GraduationCap,
  Clock,
  Calendar,
  DollarSign,
  Calculator,
  Brain,
  Zap,
  Star,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Upload,
  Share2,
  Filter,
  Search,
  RefreshCw,
  Settings,
  Info,
  HelpCircle,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Image,
  Video,
  Headphones,
  Database,
  Globe,
  MapPin,
  Building,
  Briefcase,
  Flag,
  Tag,
  Bookmark,
  Archive,
  History,
  Timer,
  Gauge,
  Layers,
  Package,
  Signal,
  Wifi,
  Shield,
  Lock,
  Unlock
} from 'lucide-react';

import {
  LineChart as RechartsLineChart,
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
  Radar,
  Scatter,
  ScatterChart,
  TreemapChart,
  Treemap
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

// Analytics data interfaces
interface TrainingMetrics {
  period: string;
  totalTrainees: number;
  completedTraining: number;
  averageScore: number;
  averageCompletionTime: number;
  certificatesIssued: number;
  trainingHours: number;
  costPerTrainee: number;
  roiPercentage: number;
  satisfactionScore: number;
  knowledgeRetention: number;
  skillImprovement: number;
  behaviorChange: number;
}

interface ModuleAnalytics {
  moduleId: string;
  moduleName: string;
  category: string;
  totalEnrollments: number;
  completionRate: number;
  averageScore: number;
  averageTime: number;
  satisfactionRating: number;
  difficultyRating: number;
  effectivenessScore: number;
  costEfficiency: number;
  trendDirection: 'up' | 'down' | 'stable';
  lastUpdated: string;
  strengths: string[];
  improvements: string[];
}

interface LearnerAnalytics {
  userId: string;
  userName: string;
  department: string;
  role: string;
  enrolledModules: number;
  completedModules: number;
  averageScore: number;
  totalLearningTime: number;
  certificatesEarned: number;
  skillsAcquired: string[];
  learningVelocity: number;
  engagementLevel: number;
  performanceImprovement: number;
  riskLevel: 'low' | 'medium' | 'high';
  nextRecommendations: string[];
}

interface InstructorAnalytics {
  instructorId: string;
  instructorName: string;
  totalSessions: number;
  averageRating: number;
  studentSatisfaction: number;
  completionRate: number;
  expertiseLevel: number;
  teachingEffectiveness: number;
  sessionUtilization: number;
  feedbackCount: number;
  strengths: string[];
  developmentAreas: string[];
  trendData: { month: string; rating: number }[];
}

interface PredictiveInsights {
  type: 'completion_risk' | 'performance_trend' | 'resource_optimization' | 'skill_gap';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
  timeline: string;
  affectedUsers: number;
  potentialSavings?: number;
}

interface BenchmarkData {
  metric: string;
  currentValue: number;
  industryAverage: number;
  bestInClass: number;
  targetValue: number;
  trend: 'improving' | 'declining' | 'stable';
  ranking: number;
}

interface ROIAnalysis {
  trainingInvestment: number;
  productivityGains: number;
  errorReduction: number;
  timesSavings: number;
  retentionImprovement: number;
  complianceValue: number;
  totalBenefits: number;
  netROI: number;
  roiPercentage: number;
  paybackPeriod: number;
  breakdownData: {
    category: string;
    investment: number;
    benefit: number;
    roi: number;
  }[];
}

interface AnalyticsFilter {
  dateRange: { start: string; end: string };
  modules: string[];
  departments: string[];
  roles: string[];
  instructors: string[];
  trainingTypes: string[];
  completionStatus: string[];
  scoreRange: { min: number; max: number };
  riskLevels: string[];
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

interface TrainingAnalyticsReportingProps {
  className?: string;
  defaultPeriod?: string;
  onExportReport?: (format: string, data: any) => void;
  onScheduleReport?: (config: any) => void;
}

export function TrainingAnalyticsReporting({
  className,
  defaultPeriod = '30d',
  onExportReport,
  onScheduleReport
}: TrainingAnalyticsReportingProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [metrics, setMetrics] = useState<TrainingMetrics[]>([]);
  const [moduleAnalytics, setModuleAnalytics] = useState<ModuleAnalytics[]>([]);
  const [learnerAnalytics, setLearnerAnalytics] = useState<LearnerAnalytics[]>([]);
  const [instructorAnalytics, setInstructorAnalytics] = useState<InstructorAnalytics[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsights[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [roiAnalysis, setRoiAnalysis] = useState<ROIAnalysis | null>(null);
  
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [filters, setFilters] = useState<AnalyticsFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    modules: [],
    departments: [],
    roles: [],
    instructors: [],
    trainingTypes: [],
    completionStatus: [],
    scoreRange: { min: 0, max: 100 },
    riskLevels: [],
    granularity: 'weekly'
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set([
    'completion_rate', 'average_score', 'satisfaction', 'roi'
  ]));

  // Mock data generation
  const generateMockData = useCallback(() => {
    // Training metrics over time
    const mockMetrics: TrainingMetrics[] = Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (11 - i));
      
      return {
        period: month.toISOString().slice(0, 7),
        totalTrainees: 45 + Math.floor(Math.random() * 20),
        completedTraining: 38 + Math.floor(Math.random() * 15),
        averageScore: 82 + Math.floor(Math.random() * 15),
        averageCompletionTime: 240 + Math.floor(Math.random() * 120),
        certificatesIssued: 35 + Math.floor(Math.random() * 12),
        trainingHours: 180 + Math.floor(Math.random() * 80),
        costPerTrainee: 1200 + Math.floor(Math.random() * 400),
        roiPercentage: 180 + Math.floor(Math.random() * 100),
        satisfactionScore: 4.1 + Math.random() * 0.8,
        knowledgeRetention: 78 + Math.floor(Math.random() * 15),
        skillImprovement: 85 + Math.floor(Math.random() * 10),
        behaviorChange: 72 + Math.floor(Math.random() * 20)
      };
    });

    // Module analytics
    const mockModules: ModuleAnalytics[] = [
      {
        moduleId: 'mod-1',
        moduleName: 'Food Safety Fundamentals',
        category: 'Compliance',
        totalEnrollments: 156,
        completionRate: 92,
        averageScore: 87,
        averageTime: 240,
        satisfactionRating: 4.6,
        difficultyRating: 3.2,
        effectivenessScore: 89,
        costEfficiency: 156,
        trendDirection: 'up',
        lastUpdated: '2024-01-25',
        strengths: ['Clear content', 'Practical examples', 'Expert instructor'],
        improvements: ['More interactivity', 'Updated visuals', 'Mobile optimization']
      },
      {
        moduleId: 'mod-2',
        moduleName: 'Customer Service Excellence',
        category: 'Skills',
        totalEnrollments: 98,
        completionRate: 78,
        averageScore: 82,
        averageTime: 180,
        satisfactionRating: 4.2,
        difficultyRating: 2.8,
        effectivenessScore: 84,
        costEfficiency: 142,
        trendDirection: 'stable',
        lastUpdated: '2024-01-20',
        strengths: ['Engaging scenarios', 'Role-playing exercises'],
        improvements: ['Longer duration', 'Follow-up sessions', 'Assessment variety']
      },
      {
        moduleId: 'mod-3',
        moduleName: 'Kitchen Operations',
        category: 'Operational',
        totalEnrollments: 134,
        completionRate: 85,
        averageScore: 91,
        averageTime: 320,
        satisfactionRating: 4.8,
        difficultyRating: 3.8,
        effectivenessScore: 94,
        costEfficiency: 178,
        trendDirection: 'up',
        lastUpdated: '2024-01-28',
        strengths: ['Hands-on practice', 'Equipment familiarity', 'Safety focus'],
        improvements: ['More time for practice', 'Advanced techniques']
      }
    ];

    // Learner analytics
    const mockLearners: LearnerAnalytics[] = [
      {
        userId: 'user-1',
        userName: 'สมชาย ใจดี (Somchai Jaidee)',
        department: 'Kitchen',
        role: 'Chef',
        enrolledModules: 8,
        completedModules: 7,
        averageScore: 92,
        totalLearningTime: 1440,
        certificatesEarned: 6,
        skillsAcquired: ['Food Safety', 'Knife Skills', 'Menu Planning'],
        learningVelocity: 87,
        engagementLevel: 94,
        performanceImprovement: 23,
        riskLevel: 'low',
        nextRecommendations: ['Advanced Culinary Techniques', 'Team Leadership']
      },
      {
        userId: 'user-2',
        userName: 'มาลี สุขใส (Mali Suksa)',
        department: 'Service',
        role: 'Server',
        enrolledModules: 6,
        completedModules: 4,
        averageScore: 78,
        totalLearningTime: 960,
        certificatesEarned: 3,
        skillsAcquired: ['Customer Service', 'Wine Knowledge'],
        learningVelocity: 65,
        engagementLevel: 72,
        performanceImprovement: 15,
        riskLevel: 'medium',
        nextRecommendations: ['Communication Skills', 'Conflict Resolution']
      }
    ];

    // Instructor analytics
    const mockInstructors: InstructorAnalytics[] = [
      {
        instructorId: 'inst-1',
        instructorName: 'Chef Laurent Dubois',
        totalSessions: 24,
        averageRating: 4.7,
        studentSatisfaction: 94,
        completionRate: 92,
        expertiseLevel: 4.9,
        teachingEffectiveness: 4.6,
        sessionUtilization: 87,
        feedbackCount: 156,
        strengths: ['Deep expertise', 'Clear communication', 'Practical approach'],
        developmentAreas: ['Technology integration', 'Time management'],
        trendData: [
          { month: '2024-01', rating: 4.5 },
          { month: '2024-02', rating: 4.6 },
          { month: '2024-03', rating: 4.7 }
        ]
      }
    ];

    // Predictive insights
    const mockInsights: PredictiveInsights[] = [
      {
        type: 'completion_risk',
        title: 'At-Risk Learners Identified',
        description: '7 learners have low engagement scores and may not complete their training',
        confidence: 85,
        impact: 'medium',
        recommendations: [
          'Schedule one-on-one check-ins',
          'Provide additional support materials',
          'Consider peer mentoring'
        ],
        timeline: 'Next 2 weeks',
        affectedUsers: 7
      },
      {
        type: 'performance_trend',
        title: 'Declining Module Performance',
        description: 'Customer Service module showing 12% decrease in satisfaction ratings',
        confidence: 92,
        impact: 'high',
        recommendations: [
          'Review and update content',
          'Survey participants for specific feedback',
          'Consider instructor training'
        ],
        timeline: 'Immediate action needed',
        affectedUsers: 45,
        potentialSavings: 25000
      }
    ];

    // Benchmark data
    const mockBenchmarks: BenchmarkData[] = [
      {
        metric: 'Completion Rate',
        currentValue: 87,
        industryAverage: 82,
        bestInClass: 94,
        targetValue: 90,
        trend: 'improving',
        ranking: 3
      },
      {
        metric: 'Average Score',
        currentValue: 85,
        industryAverage: 79,
        bestInClass: 91,
        targetValue: 88,
        trend: 'stable',
        ranking: 2
      },
      {
        metric: 'ROI Percentage',
        currentValue: 245,
        industryAverage: 180,
        bestInClass: 320,
        targetValue: 280,
        trend: 'improving',
        ranking: 1
      }
    ];

    // ROI analysis
    const mockROI: ROIAnalysis = {
      trainingInvestment: 125000,
      productivityGains: 185000,
      errorReduction: 45000,
      timesSavings: 78000,
      retentionImprovement: 92000,
      complianceValue: 67000,
      totalBenefits: 467000,
      netROI: 342000,
      roiPercentage: 274,
      paybackPeriod: 8.2,
      breakdownData: [
        { category: 'Training Content', investment: 45000, benefit: 125000, roi: 178 },
        { category: 'Instructor Costs', investment: 38000, benefit: 98000, roi: 158 },
        { category: 'Technology Platform', investment: 28000, benefit: 134000, roi: 379 },
        { category: 'Materials & Resources', investment: 14000, benefit: 110000, roi: 686 }
      ]
    };

    setMetrics(mockMetrics);
    setModuleAnalytics(mockModules);
    setLearnerAnalytics(mockLearners);
    setInstructorAnalytics(mockInstructors);
    setPredictiveInsights(mockInsights);
    setBenchmarkData(mockBenchmarks);
    setRoiAnalysis(mockROI);
  }, []);

  // Load analytics data
  useEffect(() => {
    const loadAnalyticsData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        generateMockData();
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        toast({
          title: t('error.load_failed'),
          description: t('error.analytics_load_failed'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalyticsData();
  }, [generateMockData, t]);

  // Calculate key performance indicators
  const kpis = useMemo(() => {
    const latestMetrics = metrics[metrics.length - 1];
    if (!latestMetrics) return null;

    const previousMetrics = metrics[metrics.length - 2];
    const calculateChange = (current: number, previous: number) => {
      if (!previous) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalLearners: {
        value: latestMetrics.totalTrainees,
        change: previousMetrics ? calculateChange(latestMetrics.totalTrainees, previousMetrics.totalTrainees) : 0
      },
      completionRate: {
        value: Math.round((latestMetrics.completedTraining / latestMetrics.totalTrainees) * 100),
        change: previousMetrics ? calculateChange(
          latestMetrics.completedTraining / latestMetrics.totalTrainees,
          previousMetrics.completedTraining / previousMetrics.totalTrainees
        ) : 0
      },
      averageScore: {
        value: latestMetrics.averageScore,
        change: previousMetrics ? calculateChange(latestMetrics.averageScore, previousMetrics.averageScore) : 0
      },
      satisfaction: {
        value: latestMetrics.satisfactionScore,
        change: previousMetrics ? calculateChange(latestMetrics.satisfactionScore, previousMetrics.satisfactionScore) : 0
      },
      roi: {
        value: latestMetrics.roiPercentage,
        change: previousMetrics ? calculateChange(latestMetrics.roiPercentage, previousMetrics.roiPercentage) : 0
      },
      certificates: {
        value: latestMetrics.certificatesIssued,
        change: previousMetrics ? calculateChange(latestMetrics.certificatesIssued, previousMetrics.certificatesIssued) : 0
      }
    };
  }, [metrics]);

  // Handle card expansion
  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  // Handle report export
  const handleExportReport = (format: string) => {
    const reportData = {
      period: selectedPeriod,
      metrics,
      modules: moduleAnalytics,
      learners: learnerAnalytics,
      instructors: instructorAnalytics,
      insights: predictiveInsights,
      benchmarks: benchmarkData,
      roi: roiAnalysis,
      generatedAt: new Date().toISOString()
    };

    onExportReport?.(format, reportData);
    
    toast({
      title: t('training.export_started'),
      description: t('training.export_format_started', { format: format.toUpperCase() }),
    });
  };

  // Render KPI card
  const renderKPICard = (
    title: string,
    value: number | string,
    change: number,
    icon: React.ReactNode,
    format: 'number' | 'percentage' | 'decimal' = 'number'
  ) => {
    const formatValue = (val: number | string) => {
      if (typeof val === 'string') return val;
      
      switch (format) {
        case 'percentage':
          return `${val}%`;
        case 'decimal':
          return val.toFixed(1);
        default:
          return val.toLocaleString();
      }
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <div className="text-2xl font-bold">{formatValue(value)}</div>
              <div className={cn(
                'flex items-center text-sm mt-1',
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
              )}>
                {change > 0 ? (
                  <ArrowUp className="w-3 h-3 mr-1" />
                ) : change < 0 ? (
                  <ArrowDown className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowRight className="w-3 h-3 mr-1" />
                )}
                {Math.abs(change).toFixed(1)}% {t('training.from_last_period')}
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render trend chart
  const renderTrendChart = (title: string, dataKey: string, color: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleCardExpansion(`trend-${dataKey}`)}
          >
            {expandedCards.has(`trend-${dataKey}`) ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer 
          width="100%" 
          height={expandedCards.has(`trend-${dataKey}`) ? 400 : 200}
        >
          <RechartsLineChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="period" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: any) => [value, title]}
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin mb-4">
              <RefreshCw className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold">{t('training.loading_analytics')}</h3>
            <p className="text-muted-foreground">{t('training.loading_analytics_desc')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-krong-red" />
            {t('training.analytics_reporting')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('training.analytics_reporting_desc')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            {t('common.filters')}
          </Button>
          
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
          
          <Button onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            {t('training.export_report')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {renderKPICard(
            t('training.total_learners'),
            kpis.totalLearners.value,
            kpis.totalLearners.change,
            <Users className="w-6 h-6 text-blue-600" />
          )}
          
          {renderKPICard(
            t('training.completion_rate'),
            kpis.completionRate.value,
            kpis.completionRate.change,
            <Target className="w-6 h-6 text-green-600" />,
            'percentage'
          )}
          
          {renderKPICard(
            t('training.average_score'),
            kpis.averageScore.value,
            kpis.averageScore.change,
            <Award className="w-6 h-6 text-yellow-600" />
          )}
          
          {renderKPICard(
            t('training.satisfaction'),
            kpis.satisfaction.value,
            kpis.satisfaction.change,
            <Star className="w-6 h-6 text-purple-600" />,
            'decimal'
          )}
          
          {renderKPICard(
            t('training.roi'),
            kpis.roi.value,
            kpis.roi.change,
            <DollarSign className="w-6 h-6 text-orange-600" />,
            'percentage'
          )}
          
          {renderKPICard(
            t('training.certificates'),
            kpis.certificates.value,
            kpis.certificates.change,
            <Trophy className="w-6 h-6 text-indigo-600" />
          )}
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">{t('training.overview')}</TabsTrigger>
          <TabsTrigger value="modules">{t('training.modules')}</TabsTrigger>
          <TabsTrigger value="learners">{t('training.learners')}</TabsTrigger>
          <TabsTrigger value="instructors">{t('training.instructors')}</TabsTrigger>
          <TabsTrigger value="insights">{t('training.insights')}</TabsTrigger>
          <TabsTrigger value="roi">{t('training.roi_analysis')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTrendChart(t('training.completion_trend'), 'completedTraining', '#10B981')}
            {renderTrendChart(t('training.score_trend'), 'averageScore', '#3B82F6')}
            {renderTrendChart(t('training.satisfaction_trend'), 'satisfactionScore', '#8B5CF6')}
            {renderTrendChart(t('training.roi_trend'), 'roiPercentage', '#F59E0B')}
          </div>
          
          {/* Predictive Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-500" />
                {t('training.predictive_insights')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictiveInsights.map((insight) => (
                  <div key={insight.type} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'p-2 rounded-full',
                          insight.impact === 'high' ? 'bg-red-100' :
                          insight.impact === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                        )}>
                          {insight.type === 'completion_risk' && <AlertTriangle className="w-4 h-4" />}
                          {insight.type === 'performance_trend' && <TrendingDown className="w-4 h-4" />}
                          {insight.type === 'resource_optimization' && <Target className="w-4 h-4" />}
                          {insight.type === 'skill_gap' && <Brain className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-semibold">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={
                          insight.impact === 'high' ? 'destructive' :
                          insight.impact === 'medium' ? 'secondary' : 'default'
                        }>
                          {t(`training.impact_${insight.impact}`)}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {insight.confidence}% {t('training.confidence')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <h5 className="text-sm font-medium mb-2">{t('training.recommendations')}:</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {insight.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start">
                            <ChevronRight className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-sm text-muted-foreground">
                        {t('training.timeline')}: {insight.timeline}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t('training.affected_users')}: {insight.affectedUsers}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Analytics Tab */}
        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('training.module_performance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {moduleAnalytics.map((module) => (
                  <div key={module.moduleId} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{module.moduleName}</h4>
                        <p className="text-sm text-muted-foreground">{module.category}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{module.totalEnrollments} {t('training.enrolled')}</Badge>
                        {module.trendDirection === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {module.trendDirection === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {module.trendDirection === 'stable' && <Activity className="w-4 h-4 text-gray-500" />}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{module.completionRate}%</div>
                        <div className="text-xs text-muted-foreground">{t('training.completion_rate')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{module.averageScore}</div>
                        <div className="text-xs text-muted-foreground">{t('training.avg_score')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{module.satisfactionRating.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">{t('training.satisfaction')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{module.effectivenessScore}%</div>
                        <div className="text-xs text-muted-foreground">{t('training.effectiveness')}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-green-700 mb-2">{t('training.strengths')}</h5>
                        <ul className="text-sm space-y-1">
                          {module.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-2 text-green-500" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-orange-700 mb-2">{t('training.improvements')}</h5>
                        <ul className="text-sm space-y-1">
                          {module.improvements.map((improvement, idx) => (
                            <li key={idx} className="flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-2 text-orange-500" />
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROI Analysis Tab */}
        <TabsContent value="roi" className="space-y-6">
          {roiAnalysis && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {roiAnalysis.roiPercentage}%
                    </div>
                    <p className="text-muted-foreground">{t('training.total_roi')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ฿{roiAnalysis.netROI.toLocaleString()} {t('training.net_benefit')}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {roiAnalysis.paybackPeriod.toFixed(1)}
                    </div>
                    <p className="text-muted-foreground">{t('training.payback_months')}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      ฿{roiAnalysis.totalBenefits.toLocaleString()}
                    </div>
                    <p className="text-muted-foreground">{t('training.total_benefits')}</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('training.roi_breakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={roiAnalysis.breakdownData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value: any, name: any) => [
                        name === 'roi' ? `${value}%` : `฿${value.toLocaleString()}`,
                        name === 'investment' ? t('training.investment') :
                        name === 'benefit' ? t('training.benefit') :
                        t('training.roi')
                      ]} />
                      <Legend />
                      <Bar dataKey="investment" fill="#EF4444" name={t('training.investment')} />
                      <Bar dataKey="benefit" fill="#10B981" name={t('training.benefit')} />
                      <Bar dataKey="roi" fill="#3B82F6" name={t('training.roi')} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Placeholder tabs for other sections */}
        <TabsContent value="learners">
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('training.learner_analytics')}</h3>
              <p className="text-muted-foreground">
                {t('training.learner_analytics_coming_soon')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructors">
          <Card>
            <CardContent className="p-8 text-center">
              <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('training.instructor_analytics')}</h3>
              <p className="text-muted-foreground">
                {t('training.instructor_analytics_coming_soon')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('training.advanced_insights')}</h3>
              <p className="text-muted-foreground">
                {t('training.advanced_insights_coming_soon')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Download className="w-5 h-5 mr-2" />
              {t('training.export_report')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleExportReport('pdf')}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('training.export_pdf')}
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleExportReport('excel')}
              >
                <Database className="w-4 h-4 mr-2" />
                {t('training.export_excel')}
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleExportReport('csv')}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('training.export_csv')}
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TrainingAnalyticsReporting;