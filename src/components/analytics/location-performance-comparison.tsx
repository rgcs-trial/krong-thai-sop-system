/**
 * Location Performance Comparison Component
 * Multi-location benchmarking interface for restaurant chain management
 * Features comparative analytics, performance ranking, and detailed benchmarking tools
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3,
  TrendingUp, 
  TrendingDown,
  ArrowUpDown,
  Target,
  Award,
  Shield,
  DollarSign,
  Users,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Settings,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Layers,
  Globe,
  Building2,
  Calendar,
  MapPin,
  Activity,
  Clock,
  Zap,
  FileText,
  PieChart,
  Gauge
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
  ScatterChart,
  Scatter,
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
import { toast } from '@/hooks/use-toast';

import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface LocationPerformanceComparisonProps {
  className?: string;
}

interface LocationPerformance {
  id: string;
  name: string;
  shortName: string;
  region: string;
  status: 'active' | 'maintenance' | 'closed';
  metrics: {
    overallScore: number;
    revenue: number;
    revenueGrowth: number;
    sopCompliance: number;
    complianceGrowth: number;
    trainingCompletion: number;
    trainingGrowth: number;
    customerSatisfaction: number;
    satisfactionGrowth: number;
    staffProductivity: number;
    productivityGrowth: number;
    operationalEfficiency: number;
    efficiencyGrowth: number;
    costEfficiency: number;
    costGrowth: number;
    safetyScore: number;
    safetyGrowth: number;
  };
  ranking: {
    overall: number;
    revenue: number;
    compliance: number;
    training: number;
    satisfaction: number;
    productivity: number;
  };
  benchmarks: {
    industry: number;
    chain: number;
    region: number;
    target: number;
  };
  alerts: number;
  lastUpdated: string;
}

interface ComparisonMetric {
  key: string;
  name: string;
  format: 'percentage' | 'currency' | 'number' | 'decimal';
  weight: number;
  target: number;
  color: string;
  icon: React.ReactNode;
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

export function LocationPerformanceComparison({ className }: LocationPerformanceComparisonProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['overallScore', 'revenue', 'sopCompliance', 'trainingCompletion']);
  const [sortBy, setSortBy] = useState('overallScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [benchmarkType, setBenchmarkType] = useState<'chain' | 'region' | 'industry' | 'target'>('chain');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Available comparison metrics
  const comparisonMetrics = useMemo<ComparisonMetric[]>(() => [
    {
      key: 'overallScore',
      name: t('comparison.overall_score'),
      format: 'percentage',
      weight: 1.0,
      target: 90,
      color: '#E31B23',
      icon: <Target className="h-4 w-4" />
    },
    {
      key: 'revenue',
      name: t('comparison.revenue'),
      format: 'currency',
      weight: 0.25,
      target: 250000,
      color: '#D4AF37',
      icon: <DollarSign className="h-4 w-4" />
    },
    {
      key: 'sopCompliance',
      name: t('comparison.sop_compliance'),
      format: 'percentage',
      weight: 0.2,
      target: 95,
      color: '#008B8B',
      icon: <Shield className="h-4 w-4" />
    },
    {
      key: 'trainingCompletion',
      name: t('comparison.training_completion'),
      format: 'percentage',
      weight: 0.15,
      target: 90,
      color: '#231F20',
      icon: <Award className="h-4 w-4" />
    },
    {
      key: 'customerSatisfaction',
      name: t('comparison.customer_satisfaction'),
      format: 'decimal',
      weight: 0.15,
      target: 4.8,
      color: '#D2B48C',
      icon: <Star className="h-4 w-4" />
    },
    {
      key: 'staffProductivity',
      name: t('comparison.staff_productivity'),
      format: 'percentage',
      weight: 0.1,
      target: 85,
      color: '#FF6B6B',
      icon: <Users className="h-4 w-4" />
    },
    {
      key: 'operationalEfficiency',
      name: t('comparison.operational_efficiency'),
      format: 'percentage',
      weight: 0.1,
      target: 88,
      color: '#4ECDC4',
      icon: <Activity className="h-4 w-4" />
    },
    {
      key: 'costEfficiency',
      name: t('comparison.cost_efficiency'),
      format: 'percentage',
      weight: 0.05,
      target: 75,
      color: '#45B7D1',
      icon: <Gauge className="h-4 w-4" />
    }
  ], [t]);

  // Mock location performance data
  const locationPerformanceData = useMemo<LocationPerformance[]>(() => [
    {
      id: 'bangkok-central',
      name: 'Krong Thai Central Bangkok',
      shortName: 'Central',
      region: 'Bangkok Metropolitan',
      status: 'active',
      metrics: {
        overallScore: 94.5,
        revenue: 285000,
        revenueGrowth: 12.8,
        sopCompliance: 96.2,
        complianceGrowth: 2.1,
        trainingCompletion: 91.8,
        trainingGrowth: -1.3,
        customerSatisfaction: 4.8,
        satisfactionGrowth: 0.2,
        staffProductivity: 87.5,
        productivityGrowth: 3.7,
        operationalEfficiency: 92,
        efficiencyGrowth: 1.8,
        costEfficiency: 78,
        costGrowth: 2.5,
        safetyScore: 95,
        safetyGrowth: 1.2
      },
      ranking: {
        overall: 1,
        revenue: 1,
        compliance: 1,
        training: 2,
        satisfaction: 1,
        productivity: 2
      },
      benchmarks: {
        industry: 85,
        chain: 90,
        region: 88,
        target: 90
      },
      alerts: 2,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'chiang-mai',
      name: 'Krong Thai Chiang Mai',
      shortName: 'Chiang Mai',
      region: 'Northern Thailand',
      status: 'active',
      metrics: {
        overallScore: 91.8,
        revenue: 195000,
        revenueGrowth: 8.4,
        sopCompliance: 93.1,
        complianceGrowth: 1.8,
        trainingCompletion: 89.6,
        trainingGrowth: 2.1,
        customerSatisfaction: 4.7,
        satisfactionGrowth: 0.1,
        staffProductivity: 85.3,
        productivityGrowth: 1.9,
        operationalEfficiency: 89,
        efficiencyGrowth: 0.5,
        costEfficiency: 82,
        costGrowth: 3.1,
        safetyScore: 92,
        safetyGrowth: 0.8
      },
      ranking: {
        overall: 2,
        revenue: 4,
        compliance: 2,
        training: 1,
        satisfaction: 2,
        productivity: 3
      },
      benchmarks: {
        industry: 82,
        chain: 90,
        region: 85,
        target: 90
      },
      alerts: 1,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'bangkok-thonglor',
      name: 'Krong Thai Thonglor',
      shortName: 'Thonglor',
      region: 'Bangkok Metropolitan',
      status: 'active',
      metrics: {
        overallScore: 89.2,
        revenue: 245000,
        revenueGrowth: 5.6,
        sopCompliance: 88.5,
        complianceGrowth: -0.8,
        trainingCompletion: 85.2,
        trainingGrowth: -2.1,
        customerSatisfaction: 4.6,
        satisfactionGrowth: -0.1,
        staffProductivity: 82.1,
        productivityGrowth: 0.3,
        operationalEfficiency: 85,
        efficiencyGrowth: -1.2,
        costEfficiency: 74,
        costGrowth: -0.5,
        safetyScore: 89,
        safetyGrowth: -0.3
      },
      ranking: {
        overall: 3,
        revenue: 2,
        compliance: 4,
        training: 4,
        satisfaction: 3,
        productivity: 4
      },
      benchmarks: {
        industry: 85,
        chain: 90,
        region: 88,
        target: 90
      },
      alerts: 5,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'phuket',
      name: 'Krong Thai Phuket',
      shortName: 'Phuket',
      region: 'Southern Thailand',
      status: 'maintenance',
      metrics: {
        overallScore: 88.7,
        revenue: 210000,
        revenueGrowth: 3.2,
        sopCompliance: 90.3,
        complianceGrowth: 1.5,
        trainingCompletion: 87.1,
        trainingGrowth: 0.8,
        customerSatisfaction: 4.5,
        satisfactionGrowth: 0.0,
        staffProductivity: 81.6,
        productivityGrowth: -1.1,
        operationalEfficiency: 87,
        efficiencyGrowth: 0.2,
        costEfficiency: 79,
        costGrowth: 1.8,
        safetyScore: 91,
        safetyGrowth: 1.0
      },
      ranking: {
        overall: 4,
        revenue: 3,
        compliance: 3,
        training: 3,
        satisfaction: 4,
        productivity: 5
      },
      benchmarks: {
        industry: 80,
        chain: 90,
        region: 83,
        target: 90
      },
      alerts: 3,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'pattaya',
      name: 'Krong Thai Pattaya Beach',
      shortName: 'Pattaya',
      region: 'Eastern Thailand',
      status: 'active',
      metrics: {
        overallScore: 86.4,
        revenue: 225000,
        revenueGrowth: 7.1,
        sopCompliance: 84.7,
        complianceGrowth: -1.2,
        trainingCompletion: 81.2,
        trainingGrowth: -3.5,
        customerSatisfaction: 4.4,
        satisfactionGrowth: -0.2,
        staffProductivity: 79.8,
        productivityGrowth: -0.8,
        operationalEfficiency: 83,
        efficiencyGrowth: -2.1,
        costEfficiency: 71,
        costGrowth: -1.3,
        safetyScore: 87,
        safetyGrowth: -0.5
      },
      ranking: {
        overall: 5,
        revenue: 5,
        compliance: 5,
        training: 5,
        satisfaction: 5,
        productivity: 1
      },
      benchmarks: {
        industry: 78,
        chain: 90,
        region: 81,
        target: 90
      },
      alerts: 8,
      lastUpdated: new Date().toISOString()
    }
  ], []);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let data = [...locationPerformanceData];
    
    // Sort data
    data.sort((a, b) => {
      const aValue = a.metrics[sortBy as keyof typeof a.metrics] as number;
      const bValue = b.metrics[sortBy as keyof typeof b.metrics] as number;
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    return data;
  }, [locationPerformanceData, sortBy, sortOrder]);

  // Selected locations data for detailed comparison
  const selectedLocationData = useMemo(() => {
    if (selectedLocations.length === 0) {
      return filteredData.slice(0, 3); // Default to top 3
    }
    return filteredData.filter(location => selectedLocations.includes(location.id));
  }, [filteredData, selectedLocations]);

  // Radar chart data for multi-metric comparison
  const radarChartData = useMemo(() => {
    const metrics = selectedMetrics;
    return metrics.map(metricKey => {
      const metric = comparisonMetrics.find(m => m.key === metricKey);
      if (!metric) return null;
      
      const dataPoint: any = { metric: metric.name };
      
      selectedLocationData.forEach(location => {
        const value = location.metrics[metricKey as keyof typeof location.metrics] as number;
        // Normalize to 0-100 scale for radar chart
        const normalizedValue = metric.format === 'currency' ? 
          (value / metric.target) * 100 : 
          metric.format === 'decimal' ? 
          (value / metric.target) * 100 :
          value;
        
        dataPoint[location.shortName] = Math.min(normalizedValue, 100);
      });
      
      return dataPoint;
    }).filter(Boolean);
  }, [selectedLocationData, selectedMetrics, comparisonMetrics]);

  // Performance comparison chart data
  const comparisonChartData = useMemo(() => {
    return selectedLocationData.map(location => {
      const dataPoint: any = { name: location.shortName, region: location.region };
      
      selectedMetrics.forEach(metricKey => {
        const value = location.metrics[metricKey as keyof typeof location.metrics] as number;
        dataPoint[metricKey] = value;
      });
      
      return dataPoint;
    });
  }, [selectedLocationData, selectedMetrics]);

  // Toggle location selection
  const toggleLocationSelection = (locationId: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(locationId)) {
        return prev.filter(id => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  // Toggle metric selection
  const toggleMetricSelection = (metricKey: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricKey)) {
        return prev.filter(key => key !== metricKey);
      } else {
        return [...prev, metricKey];
      }
    });
  };

  // Format value based on type
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('th-TH', {
          style: 'currency',
          currency: 'THB',
          minimumFractionDigits: 0,
        }).format(value);
      case 'decimal':
        return value.toFixed(1);
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  // Get trend icon
  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <ChevronUp className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <ChevronDown className="h-4 w-4 text-red-500" />;
    }
    return <ArrowRight className="h-4 w-4 text-gray-500" />;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLastRefresh(new Date());
      toast({
        title: t('comparison.data_refreshed'),
        description: t('comparison.data_refreshed_desc'),
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

  // Export comparison
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    toast({
      title: t('comparison.export_started'),
      description: t('comparison.export_started_desc', { format: format.toUpperCase() }),
    });
  };

  if (isLoading && !lastRefresh) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('comparison.loading_comparison')}</h3>
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
            {t('comparison.dashboard_title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('comparison.dashboard_desc')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('comparison.last_updated')}: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <Select value={benchmarkType} onValueChange={(value: any) => setBenchmarkType(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chain">{t('comparison.chain_benchmark')}</SelectItem>
              <SelectItem value="region">{t('comparison.regional_benchmark')}</SelectItem>
              <SelectItem value="industry">{t('comparison.industry_benchmark')}</SelectItem>
              <SelectItem value="target">{t('comparison.target_benchmark')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-40">
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
            <SelectTrigger className="w-full sm:w-32">
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

      {/* Filters and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Location Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Building2 className="h-4 w-4 mr-2" />
              {t('comparison.select_locations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {filteredData.map((location) => (
              <div key={location.id} className="flex items-center space-x-2">
                <Checkbox
                  id={location.id}
                  checked={selectedLocations.includes(location.id)}
                  onCheckedChange={() => toggleLocationSelection(location.id)}
                />
                <div className="flex-1 flex items-center justify-between">
                  <label htmlFor={location.id} className="text-sm cursor-pointer">
                    {location.shortName}
                  </label>
                  <div className="flex items-center space-x-1">
                    <Badge className={getStatusColor(location.status)} size="sm">
                      {location.status}
                    </Badge>
                    {location.alerts > 0 && (
                      <Badge variant="destructive" size="sm">
                        {location.alerts}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Metric Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Target className="h-4 w-4 mr-2" />
              {t('comparison.select_metrics')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {comparisonMetrics.map((metric) => (
              <div key={metric.key} className="flex items-center space-x-2">
                <Checkbox
                  id={metric.key}
                  checked={selectedMetrics.includes(metric.key)}
                  onCheckedChange={() => toggleMetricSelection(metric.key)}
                />
                <div className="flex-1 flex items-center space-x-2">
                  <div className={`p-1 rounded`} style={{ backgroundColor: metric.color }}>
                    <div className="text-white">
                      {metric.icon}
                    </div>
                  </div>
                  <label htmlFor={metric.key} className="text-sm cursor-pointer">
                    {metric.name}
                  </label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sort and Filter Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {t('comparison.sort_filter')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('comparison.sort_by')}
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {comparisonMetrics.map((metric) => (
                    <SelectItem key={metric.key} value={metric.key}>
                      {metric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('comparison.sort_order')}
              </label>
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">{t('comparison.highest_first')}</SelectItem>
                  <SelectItem value="asc">{t('comparison.lowest_first')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Views */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('comparison.overview')}</TabsTrigger>
          <TabsTrigger value="detailed">{t('comparison.detailed')}</TabsTrigger>
          <TabsTrigger value="trends">{t('comparison.trends')}</TabsTrigger>
          <TabsTrigger value="ranking">{t('comparison.ranking')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Multi-Metric Radar Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-purple-500" />
                  {t('comparison.multi_metric_radar')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10 }}
                    />
                    {selectedLocationData.map((location, index) => (
                      <Radar
                        key={location.id}
                        name={location.shortName}
                        dataKey={location.shortName}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Side-by-Side Metric Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                  {t('comparison.side_by_side_metrics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: any) => {
                        const metric = comparisonMetrics.find(m => m.key === name);
                        return metric ? [formatValue(value, metric.format), metric.name] : [value, name];
                      }}
                    />
                    <Legend />
                    {selectedMetrics.slice(0, 4).map((metricKey, index) => {
                      const metric = comparisonMetrics.find(m => m.key === metricKey);
                      return (
                        <Bar
                          key={metricKey}
                          dataKey={metricKey}
                          fill={metric?.color || CHART_COLORS[index]}
                          name={metric?.name || metricKey}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Comparison Tab */}
        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-500" />
                {t('comparison.detailed_metrics_table')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">{t('comparison.location')}</TableHead>
                      <TableHead className="text-center">{t('comparison.status')}</TableHead>
                      {selectedMetrics.map((metricKey) => {
                        const metric = comparisonMetrics.find(m => m.key === metricKey);
                        return (
                          <TableHead key={metricKey} className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {metric?.icon}
                              <span>{metric?.name}</span>
                            </div>
                          </TableHead>
                        );
                      })}
                      <TableHead className="text-center">{t('comparison.benchmark')}</TableHead>
                      <TableHead className="text-center">{t('comparison.alerts')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLocationData.map((location) => (
                      <TableRow key={location.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{location.shortName}</div>
                            <div className="text-sm text-gray-500">{location.region}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusColor(location.status)}>
                            {location.status}
                          </Badge>
                        </TableCell>
                        {selectedMetrics.map((metricKey) => {
                          const metric = comparisonMetrics.find(m => m.key === metricKey);
                          const value = location.metrics[metricKey as keyof typeof location.metrics] as number;
                          const growthKey = `${metricKey}Growth` as keyof typeof location.metrics;
                          const growth = location.metrics[growthKey] as number;
                          
                          return (
                            <TableCell key={metricKey} className="text-center">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {metric ? formatValue(value, metric.format) : value}
                                </div>
                                <div className="flex items-center justify-center space-x-1">
                                  {getTrendIcon(growth)}
                                  <span className={cn('text-xs',
                                    growth > 0 ? 'text-green-600' : 
                                    growth < 0 ? 'text-red-600' : 'text-gray-600'
                                  )}>
                                    {Math.abs(growth).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <div className="text-sm">
                            {formatValue(location.benchmarks[benchmarkType], 'percentage')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {location.alerts > 0 ? (
                            <Badge variant="destructive">{location.alerts}</Badge>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-orange-500" />
                {t('comparison.performance_trends')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={[
                  { month: 'Jan', ...selectedLocationData.reduce((acc, loc) => ({ ...acc, [loc.shortName]: loc.metrics.overallScore - 8 }), {}) },
                  { month: 'Feb', ...selectedLocationData.reduce((acc, loc) => ({ ...acc, [loc.shortName]: loc.metrics.overallScore - 6 }), {}) },
                  { month: 'Mar', ...selectedLocationData.reduce((acc, loc) => ({ ...acc, [loc.shortName]: loc.metrics.overallScore - 4 }), {}) },
                  { month: 'Apr', ...selectedLocationData.reduce((acc, loc) => ({ ...acc, [loc.shortName]: loc.metrics.overallScore - 2 }), {}) },
                  { month: 'May', ...selectedLocationData.reduce((acc, loc) => ({ ...acc, [loc.shortName]: loc.metrics.overallScore - 1 }), {}) },
                  { month: 'Jun', ...selectedLocationData.reduce((acc, loc) => ({ ...acc, [loc.shortName]: loc.metrics.overallScore }), {}) }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[75, 100]} />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Performance Score']} />
                  <Legend />
                  {selectedLocationData.map((location, index) => (
                    <Line
                      key={location.id}
                      type="monotone"
                      dataKey={location.shortName}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 2, r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedMetrics.slice(0, 4).map((metricKey) => {
              const metric = comparisonMetrics.find(m => m.key === metricKey);
              if (!metric) return null;

              const sortedLocations = [...filteredData].sort((a, b) => {
                const aValue = a.metrics[metricKey as keyof typeof a.metrics] as number;
                const bValue = b.metrics[metricKey as keyof typeof b.metrics] as number;
                return bValue - aValue;
              });

              return (
                <Card key={metricKey}>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <div className="p-2 rounded-full text-white mr-2" style={{ backgroundColor: metric.color }}>
                        {metric.icon}
                      </div>
                      {metric.name} {t('comparison.ranking')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sortedLocations.map((location, index) => {
                        const value = location.metrics[metricKey as keyof typeof location.metrics] as number;
                        const isSelected = selectedLocations.includes(location.id) || selectedLocations.length === 0;
                        
                        return (
                          <div
                            key={location.id}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border',
                              isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50',
                              index === 0 && 'border-yellow-300 bg-yellow-50' // Highlight winner
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
                                index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                index === 2 ? 'bg-orange-600 text-white' :
                                'bg-gray-300 text-gray-700'
                              )}>
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium">{location.shortName}</div>
                                <div className="text-xs text-gray-500">{location.region}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                {formatValue(value, metric.format)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {t('comparison.target')}: {formatValue(metric.target, metric.format)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LocationPerformanceComparison;