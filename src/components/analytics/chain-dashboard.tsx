/**
 * Chain Dashboard Component
 * Executive overview of all restaurant locations in the chain
 * Features comprehensive multi-location analytics, KPIs, and operational insights
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2,
  TrendingUp, 
  TrendingDown,
  Users, 
  BookOpen,
  Clock,
  Target,
  MapPin,
  Activity,
  Award,
  Shield,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Star,
  BarChart3,
  PieChart,
  Globe,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Settings,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Map,
  Layers,
  Calendar,
  Bell
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
  Scatter
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
import { toast } from '@/hooks/use-toast';

import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface ChainDashboardProps {
  className?: string;
}

interface RestaurantLocation {
  id: string;
  name: string;
  region: string;
  address: string;
  status: 'active' | 'maintenance' | 'closed';
  coordinates: { lat: number; lng: number };
  performance: {
    overallScore: number;
    revenue: number;
    sopCompliance: number;
    trainingCompletion: number;
    customerSatisfaction: number;
    staffProductivity: number;
  };
  metrics: {
    dailyRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    activeStaff: number;
    totalCapacity: number;
    utilizationRate: number;
  };
  alerts: number;
  lastUpdated: string;
}

interface ChainKPI {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency' | 'time';
  icon: React.ReactNode;
  color: string;
  target?: number;
  benchmark?: number;
}

interface RegionalData {
  region: string;
  locations: number;
  totalRevenue: number;
  avgPerformance: number;
  topPerformer: string;
  alerts: number;
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

export function ChainDashboard({ className }: ChainDashboardProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedView, setSelectedView] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // Mock restaurant locations data
  const restaurantLocations = useMemo<RestaurantLocation[]>(() => [
    {
      id: 'bangkok-central',
      name: 'Krong Thai Central Bangkok',
      region: 'Bangkok Metropolitan',
      address: '123 Sukhumvit Road, Bangkok 10110',
      status: 'active',
      coordinates: { lat: 13.7563, lng: 100.5018 },
      performance: {
        overallScore: 94.5,
        revenue: 285000,
        sopCompliance: 96.2,
        trainingCompletion: 91.8,
        customerSatisfaction: 4.8,
        staffProductivity: 87.5
      },
      metrics: {
        dailyRevenue: 9500,
        monthlyRevenue: 285000,
        yearlyRevenue: 3420000,
        activeStaff: 45,
        totalCapacity: 50,
        utilizationRate: 90
      },
      alerts: 2,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'bangkok-thonglor',
      name: 'Krong Thai Thonglor',
      region: 'Bangkok Metropolitan',
      address: '456 Thonglor Street, Bangkok 10110',
      status: 'active',
      coordinates: { lat: 13.7308, lng: 100.5827 },
      performance: {
        overallScore: 89.2,
        revenue: 245000,
        sopCompliance: 88.5,
        trainingCompletion: 85.2,
        customerSatisfaction: 4.6,
        staffProductivity: 82.1
      },
      metrics: {
        dailyRevenue: 8200,
        monthlyRevenue: 245000,
        yearlyRevenue: 2940000,
        activeStaff: 38,
        totalCapacity: 45,
        utilizationRate: 84
      },
      alerts: 5,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'chiang-mai',
      name: 'Krong Thai Chiang Mai',
      region: 'Northern Thailand',
      address: '789 Nimman Road, Chiang Mai 50200',
      status: 'active',
      coordinates: { lat: 18.7883, lng: 98.9853 },
      performance: {
        overallScore: 91.8,
        revenue: 195000,
        sopCompliance: 93.1,
        trainingCompletion: 89.6,
        customerSatisfaction: 4.7,
        staffProductivity: 85.3
      },
      metrics: {
        dailyRevenue: 6500,
        monthlyRevenue: 195000,
        yearlyRevenue: 2340000,
        activeStaff: 32,
        totalCapacity: 40,
        utilizationRate: 80
      },
      alerts: 1,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'pattaya',
      name: 'Krong Thai Pattaya Beach',
      region: 'Eastern Thailand',
      address: '321 Beach Road, Pattaya 20150',
      status: 'active',
      coordinates: { lat: 12.9236, lng: 100.8825 },
      performance: {
        overallScore: 86.4,
        revenue: 225000,
        sopCompliance: 84.7,
        trainingCompletion: 81.2,
        customerSatisfaction: 4.4,
        staffProductivity: 79.8
      },
      metrics: {
        dailyRevenue: 7500,
        monthlyRevenue: 225000,
        yearlyRevenue: 2700000,
        activeStaff: 35,
        totalCapacity: 42,
        utilizationRate: 83
      },
      alerts: 8,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'phuket',
      name: 'Krong Thai Phuket',
      region: 'Southern Thailand',
      address: '654 Patong Beach, Phuket 83150',
      status: 'maintenance',
      coordinates: { lat: 7.8804, lng: 98.3923 },
      performance: {
        overallScore: 88.7,
        revenue: 210000,
        sopCompliance: 90.3,
        trainingCompletion: 87.1,
        customerSatisfaction: 4.5,
        staffProductivity: 81.6
      },
      metrics: {
        dailyRevenue: 7000,
        monthlyRevenue: 210000,
        yearlyRevenue: 2520000,
        activeStaff: 30,
        totalCapacity: 38,
        utilizationRate: 79
      },
      alerts: 3,
      lastUpdated: new Date().toISOString()
    }
  ], []);

  // Filter locations based on search and region
  const filteredLocations = useMemo(() => {
    return restaurantLocations.filter(location => {
      const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           location.region.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegion === 'all' || location.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [restaurantLocations, searchQuery, selectedRegion]);

  // Calculate chain-wide KPIs
  const chainKPIs = useMemo<ChainKPI[]>(() => {
    const totalRevenue = restaurantLocations.reduce((sum, loc) => sum + loc.performance.revenue, 0);
    const avgPerformance = restaurantLocations.reduce((sum, loc) => sum + loc.performance.overallScore, 0) / restaurantLocations.length;
    const avgCompliance = restaurantLocations.reduce((sum, loc) => sum + loc.performance.sopCompliance, 0) / restaurantLocations.length;
    const avgTraining = restaurantLocations.reduce((sum, loc) => sum + loc.performance.trainingCompletion, 0) / restaurantLocations.length;
    const totalStaff = restaurantLocations.reduce((sum, loc) => sum + loc.metrics.activeStaff, 0);
    const totalAlerts = restaurantLocations.reduce((sum, loc) => sum + loc.alerts, 0);

    return [
      {
        id: 'total_locations',
        title: t('chain.total_locations'),
        value: restaurantLocations.length,
        change: 8.3,
        trend: 'up',
        format: 'number',
        icon: <Building2 className="h-5 w-5" />,
        color: 'bg-blue-500',
        target: 10
      },
      {
        id: 'chain_revenue',
        title: t('chain.total_revenue'),
        value: totalRevenue,
        change: 12.8,
        trend: 'up',
        format: 'currency',
        icon: <DollarSign className="h-5 w-5" />,
        color: 'bg-green-500',
        benchmark: 1200000
      },
      {
        id: 'avg_performance',
        title: t('chain.avg_performance'),
        value: avgPerformance,
        change: 3.2,
        trend: 'up',
        format: 'percentage',
        icon: <Target className="h-5 w-5" />,
        color: 'bg-purple-500',
        target: 92
      },
      {
        id: 'chain_compliance',
        title: t('chain.avg_compliance'),
        value: avgCompliance,
        change: 1.8,
        trend: 'up',
        format: 'percentage',
        icon: <Shield className="h-5 w-5" />,
        color: 'bg-orange-500',
        target: 95
      },
      {
        id: 'training_completion',
        title: t('chain.avg_training'),
        value: avgTraining,
        change: -0.9,
        trend: 'down',
        format: 'percentage',
        icon: <Award className="h-5 w-5" />,
        color: 'bg-yellow-500',
        target: 90
      },
      {
        id: 'total_staff',
        title: t('chain.total_staff'),
        value: totalStaff,
        change: 5.7,
        trend: 'up',
        format: 'number',
        icon: <Users className="h-5 w-5" />,
        color: 'bg-indigo-500',
        target: 200
      },
      {
        id: 'active_alerts',
        title: t('chain.active_alerts'),
        value: totalAlerts,
        change: -15.2,
        trend: 'down',
        format: 'number',
        icon: <AlertTriangle className="h-5 w-5" />,
        color: 'bg-red-500'
      },
      {
        id: 'customer_satisfaction',
        title: t('chain.avg_satisfaction'),
        value: 4.6,
        change: 2.1,
        trend: 'up',
        format: 'number',
        icon: <Star className="h-5 w-5" />,
        color: 'bg-pink-500',
        target: 4.8
      }
    ];
  }, [restaurantLocations, t]);

  // Regional data analysis
  const regionalData = useMemo<RegionalData[]>(() => {
    const regions = [...new Set(restaurantLocations.map(loc => loc.region))];
    
    return regions.map(region => {
      const regionLocations = restaurantLocations.filter(loc => loc.region === region);
      const totalRevenue = regionLocations.reduce((sum, loc) => sum + loc.performance.revenue, 0);
      const avgPerformance = regionLocations.reduce((sum, loc) => sum + loc.performance.overallScore, 0) / regionLocations.length;
      const topPerformer = regionLocations.reduce((max, loc) => 
        loc.performance.overallScore > max.performance.overallScore ? loc : max
      );
      const totalAlerts = regionLocations.reduce((sum, loc) => sum + loc.alerts, 0);

      return {
        region,
        locations: regionLocations.length,
        totalRevenue,
        avgPerformance,
        topPerformer: topPerformer.name,
        alerts: totalAlerts
      };
    });
  }, [restaurantLocations]);

  // Performance trend data
  const performanceTrendData = useMemo(() => [
    { month: 'Jan', performance: 85.2, revenue: 850000, compliance: 88.5 },
    { month: 'Feb', performance: 87.1, revenue: 920000, compliance: 90.2 },
    { month: 'Mar', performance: 88.9, revenue: 1050000, compliance: 91.8 },
    { month: 'Apr', performance: 90.3, revenue: 1120000, compliance: 92.5 },
    { month: 'May', performance: 89.8, revenue: 1180000, compliance: 91.9 },
    { month: 'Jun', performance: 90.1, revenue: 1160000, compliance: 92.4 }
  ], []);

  // Location performance scatter data
  const locationScatterData = useMemo(() => {
    return restaurantLocations.map(location => ({
      name: location.name.split(' ').slice(-1)[0], // Short name
      performance: location.performance.overallScore,
      revenue: location.performance.revenue / 1000, // In thousands
      region: location.region,
      alerts: location.alerts
    }));
  }, [restaurantLocations]);

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLastRefresh(new Date());
      toast({
        title: t('chain.data_refreshed'),
        description: t('chain.data_refreshed_desc'),
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
      title: t('chain.export_started'),
      description: t('chain.export_started_desc', { format: format.toUpperCase() }),
    });
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable', change: number) => {
    if (trend === 'up') {
      return <ChevronUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <ChevronDown className="h-4 w-4 text-red-500" />;
    }
    return <ArrowRight className="h-4 w-4 text-gray-500" />;
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
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
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

  if (isLoading && !lastRefresh) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('chain.loading_dashboard')}</h3>
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
            <Globe className="h-8 w-8 mr-3 text-[#E31B23]" />
            {t('chain.dashboard_title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('chain.dashboard_desc')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('chain.last_updated')}: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('chain.all_regions')}</SelectItem>
              {[...new Set(restaurantLocations.map(loc => loc.region))].map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('chain.search_locations')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{filteredLocations.length} {t('chain.locations_found')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chain-wide KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {chainKPIs.map((kpi) => (
          <Card key={kpi.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={cn('p-2 rounded-full text-white', kpi.color)}>
                      {kpi.icon}
                    </div>
                    <h3 className="font-semibold text-gray-700 text-sm">{kpi.title}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {typeof kpi.value === 'number' ? formatValue(kpi.value, kpi.format) : kpi.value}
                      </span>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(kpi.trend, kpi.change)}
                        <span className={cn('text-sm font-medium', 
                          kpi.trend === 'up' ? 'text-green-600' : 
                          kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        )}>
                          {Math.abs(kpi.change)}%
                        </span>
                      </div>
                    </div>
                    
                    {(kpi.target || kpi.benchmark) && typeof kpi.value === 'number' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{kpi.target ? t('chain.vs_target') : t('chain.vs_benchmark')}</span>
                          <span>
                            {Math.round((kpi.value / (kpi.target || kpi.benchmark!)) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(kpi.value / (kpi.target || kpi.benchmark!)) * 100} 
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
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('chain.overview')}</TabsTrigger>
          <TabsTrigger value="locations">{t('chain.locations')}</TabsTrigger>
          <TabsTrigger value="regional">{t('chain.regional')}</TabsTrigger>
          <TabsTrigger value="performance">{t('chain.performance')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chain Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  {t('chain.performance_trends')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        name === 'revenue' ? `฿${(value * 1000).toLocaleString()}` : `${value}%`,
                        name === 'performance' ? t('chain.performance') :
                        name === 'compliance' ? t('chain.compliance') : t('chain.revenue')
                      ]}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="performance" 
                      fill="#E31B23" 
                      fillOpacity={0.6}
                      stroke="#E31B23"
                      name={t('chain.performance')}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="compliance" 
                      stroke="#008B8B" 
                      strokeWidth={3}
                      name={t('chain.compliance')}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="revenue" 
                      fill="#D4AF37" 
                      name={t('chain.revenue')}
                      fillOpacity={0.8}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Location Performance Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Map className="h-5 w-5 mr-2 text-blue-500" />
                  {t('chain.location_performance_map')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={locationScatterData}>
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
                        name === 'performance' ? 'Performance' : 'Revenue'
                      ]}
                      labelFormatter={(label, payload: any) => {
                        if (payload && payload[0]) {
                          return `${payload[0].payload.name} (${payload[0].payload.alerts} alerts)`;
                        }
                        return label;
                      }}
                    />
                    <Scatter 
                      dataKey="performance" 
                      fill="#E31B23"
                      name="Location Performance"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {filteredLocations.map((location) => (
              <Card key={location.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                    {/* Location Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Building2 className="h-6 w-6 text-[#E31B23]" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                          <p className="text-sm text-gray-600">{location.address}</p>
                        </div>
                        <Badge className={getStatusColor(location.status)}>
                          {location.status}
                        </Badge>
                        {location.alerts > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {location.alerts} alerts
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {location.region}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {location.metrics.activeStaff} staff
                        </span>
                        <span className="flex items-center">
                          <Activity className="h-4 w-4 mr-1" />
                          {location.metrics.utilizationRate}% capacity
                        </span>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {location.performance.overallScore.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">{t('chain.overall_score')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ฿{(location.performance.revenue / 1000).toFixed(0)}k
                        </div>
                        <div className="text-xs text-gray-600">{t('chain.monthly_revenue')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {location.performance.sopCompliance.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">{t('chain.compliance')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {location.performance.trainingCompletion.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">{t('chain.training')}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        {t('common.view')}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        {t('common.manage')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Regional Tab */}
        <TabsContent value="regional" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {regionalData.map((region) => (
              <Card key={region.region} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Layers className="h-5 w-5 mr-2 text-[#E31B23]" />
                      {region.region}
                    </span>
                    <Badge variant="outline">
                      {region.locations} {t('chain.locations')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          ฿{(region.totalRevenue / 1000).toFixed(0)}k
                        </div>
                        <div className="text-sm text-gray-600">{t('chain.total_revenue')}</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {region.avgPerformance.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">{t('chain.avg_performance')}</div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {t('chain.top_performer')}
                        </span>
                        <Star className="h-4 w-4 text-yellow-500" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {region.topPerformer}
                      </div>
                    </div>
                    
                    {region.alerts > 0 && (
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">
                            {region.alerts} {t('chain.active_alerts')}
                          </span>
                        </div>
                        <Button variant="outline" size="sm">
                          {t('common.review')}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                {t('chain.location_performance_comparison')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={restaurantLocations.map(loc => ({
                  name: loc.name.split(' ').slice(-1)[0],
                  performance: loc.performance.overallScore,
                  compliance: loc.performance.sopCompliance,
                  training: loc.performance.trainingCompletion,
                  satisfaction: loc.performance.customerSatisfaction * 20 // Scale to 100
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: any) => [
                      name === 'satisfaction' ? `${(value / 20).toFixed(1)}/5` : `${value.toFixed(1)}%`,
                      name === 'performance' ? t('chain.performance') :
                      name === 'compliance' ? t('chain.compliance') :
                      name === 'training' ? t('chain.training') : t('chain.satisfaction')
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="performance" fill="#E31B23" name={t('chain.performance')} />
                  <Bar dataKey="compliance" fill="#008B8B" name={t('chain.compliance')} />
                  <Bar dataKey="training" fill="#D4AF37" name={t('chain.training')} />
                  <Bar dataKey="satisfaction" fill="#231F20" name={t('chain.satisfaction')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChainDashboard;