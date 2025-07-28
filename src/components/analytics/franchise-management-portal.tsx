/**
 * Franchise Management Portal Component
 * Complete franchise operations interface with licensing tools, territory management, and performance tracking
 * Features comprehensive franchise oversight, compliance monitoring, and business intelligence
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2,
  Users,
  DollarSign,
  FileText,
  Shield,
  Award,
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Star,
  Target,
  Eye,
  Edit,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Download,
  Settings,
  Globe,
  Handshake,
  Scale,
  BookOpen,
  PieChart,
  BarChart3,
  Activity,
  Zap,
  Bell,
  UserCheck,
  CreditCard,
  Briefcase,
  Home,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  Mail,
  Phone
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
import { Input } from '@/components/ui/input';
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
import { toast } from '@/hooks/use-toast';

import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface FranchiseManagementPortalProps {
  className?: string;
}

interface Franchise {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  businessName: string;
  territory: string;
  region: string;
  status: 'active' | 'pending' | 'suspended' | 'terminated';
  licenseType: 'single_unit' | 'multi_unit' | 'area_development' | 'master_franchise';
  establishedDate: string;
  contractEndDate: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  financials: {
    initialFee: number;
    royaltyRate: number;
    marketingFee: number;
    monthlyRoyalty: number;
    totalInvestment: number;
    currentRevenue: number;
    revenueGrowth: number;
  };
  performance: {
    overallScore: number;
    complianceScore: number;
    operationalScore: number;
    customerSatisfaction: number;
    profitability: number;
    marketPenetration: number;
  };
  locations: number;
  staff: number;
  trainingCompliance: number;
  violations: number;
  alerts: number;
  lastAudit: string;
  nextAudit: string;
}

interface FranchiseMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency';
  icon: React.ReactNode;
  color: string;
}

interface Territory {
  id: string;
  name: string;
  region: string;
  population: number;
  franchises: number;
  availableUnits: number;
  marketPotential: 'high' | 'medium' | 'low';
  status: 'available' | 'assigned' | 'saturated';
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

export function FranchiseManagementPortal({ className }: FranchiseManagementPortalProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);

  // Mock franchise data
  const franchiseData = useMemo<Franchise[]>(() => [
    {
      id: 'fr-001',
      franchiseeId: 'franchisee-001',
      franchiseeName: 'Somchai Jaidee',
      businessName: 'Krong Thai Bangkok Central',
      territory: 'Bangkok Central District',
      region: 'Bangkok Metropolitan',
      status: 'active',
      licenseType: 'multi_unit',
      establishedDate: '2020-01-15',
      contractEndDate: '2030-01-15',
      contact: {
        email: 'somchai@krongthai-central.com',
        phone: '+66-2-123-4567',
        address: '123 Sukhumvit Road, Bangkok 10110'
      },
      financials: {
        initialFee: 500000,
        royaltyRate: 6,
        marketingFee: 2,
        monthlyRoyalty: 18500,
        totalInvestment: 2500000,
        currentRevenue: 285000,
        revenueGrowth: 12.8
      },
      performance: {
        overallScore: 94.5,
        complianceScore: 96.2,
        operationalScore: 92.8,
        customerSatisfaction: 4.8,
        profitability: 15.2,
        marketPenetration: 85.5
      },
      locations: 3,
      staff: 45,
      trainingCompliance: 91.8,
      violations: 0,
      alerts: 2,
      lastAudit: '2024-05-15',
      nextAudit: '2024-08-15'
    },
    {
      id: 'fr-002',
      franchiseeId: 'franchisee-002',
      franchiseeName: 'Niran Thaksin',
      businessName: 'Krong Thai Chiang Mai',
      territory: 'Chiang Mai Province',
      region: 'Northern Thailand',
      status: 'active',
      licenseType: 'area_development',
      establishedDate: '2019-06-20',
      contractEndDate: '2029-06-20',
      contact: {
        email: 'niran@krongthai-cm.com',
        phone: '+66-53-987-6543',
        address: '789 Nimman Road, Chiang Mai 50200'
      },
      financials: {
        initialFee: 750000,
        royaltyRate: 6,
        marketingFee: 2,
        monthlyRoyalty: 12500,
        totalInvestment: 3200000,
        currentRevenue: 195000,
        revenueGrowth: 8.4
      },
      performance: {
        overallScore: 91.8,
        complianceScore: 93.1,
        operationalScore: 89.6,
        customerSatisfaction: 4.7,
        profitability: 18.5,
        marketPenetration: 92.3
      },
      locations: 2,
      staff: 32,
      trainingCompliance: 89.6,
      violations: 1,
      alerts: 1,
      lastAudit: '2024-04-20',
      nextAudit: '2024-07-20'
    },
    {
      id: 'fr-003',
      franchiseeId: 'franchisee-003',
      franchiseeName: 'Apinya Srisawat',
      businessName: 'Krong Thai Phuket Beach',
      territory: 'Phuket Province',
      region: 'Southern Thailand',
      status: 'pending',
      licenseType: 'single_unit',
      establishedDate: '2024-03-01',
      contractEndDate: '2034-03-01',
      contact: {
        email: 'apinya@krongthai-phuket.com',
        phone: '+66-76-555-1234',
        address: '654 Patong Beach, Phuket 83150'
      },
      financials: {
        initialFee: 400000,
        royaltyRate: 6,
        marketingFee: 2,
        monthlyRoyalty: 8500,
        totalInvestment: 1800000,
        currentRevenue: 145000,
        revenueGrowth: 5.2
      },
      performance: {
        overallScore: 88.7,
        complianceScore: 90.3,
        operationalScore: 87.1,
        customerSatisfaction: 4.5,
        profitability: 12.8,
        marketPenetration: 75.6
      },
      locations: 1,
      staff: 18,
      trainingCompliance: 87.1,
      violations: 2,
      alerts: 3,
      lastAudit: '2024-06-01',
      nextAudit: '2024-09-01'
    },
    {
      id: 'fr-004',
      franchiseeId: 'franchisee-004',
      franchiseeName: 'Prawit Chainam',
      businessName: 'Krong Thai Eastern',
      territory: 'Pattaya & Eastern Seaboard',
      region: 'Eastern Thailand',
      status: 'suspended',
      licenseType: 'multi_unit',
      establishedDate: '2018-11-10',
      contractEndDate: '2028-11-10',
      contact: {
        email: 'prawit@krongthai-east.com',
        phone: '+66-38-111-2222',
        address: '321 Beach Road, Pattaya 20150'
      },
      financials: {
        initialFee: 600000,
        royaltyRate: 6,
        marketingFee: 2,
        monthlyRoyalty: 15200,
        totalInvestment: 2800000,
        currentRevenue: 185000,
        revenueGrowth: -3.2
      },
      performance: {
        overallScore: 76.4,
        complianceScore: 72.7,
        operationalScore: 81.2,
        customerSatisfaction: 4.2,
        profitability: 8.5,
        marketPenetration: 68.9
      },
      locations: 2,
      staff: 28,
      trainingCompliance: 72.2,
      violations: 5,
      alerts: 8,
      lastAudit: '2024-03-10',
      nextAudit: '2024-06-10'
    }
  ], []);

  // Available territories
  const territoryData = useMemo<Territory[]>(() => [
    {
      id: 'territory-001',
      name: 'Bangkok North',
      region: 'Bangkok Metropolitan',
      population: 850000,
      franchises: 2,
      availableUnits: 3,
      marketPotential: 'high',
      status: 'available'
    },
    {
      id: 'territory-002',
      name: 'Khon Kaen',
      region: 'Northeastern Thailand',
      population: 320000,
      franchises: 0,
      availableUnits: 2,
      marketPotential: 'medium',
      status: 'available'
    },
    {
      id: 'territory-003',
      name: 'Hat Yai',
      region: 'Southern Thailand',
      population: 280000,
      franchises: 0,
      availableUnits: 1,
      marketPotential: 'medium',
      status: 'available'
    },
    {
      id: 'territory-004',
      name: 'Hua Hin',
      region: 'Central Thailand',
      population: 180000,
      franchises: 1,
      availableUnits: 0,
      marketPotential: 'low',
      status: 'saturated'
    }
  ], []);

  // Calculate franchise metrics
  const franchiseMetrics = useMemo<FranchiseMetric[]>(() => {
    const totalFranchises = franchiseData.length;
    const activeFranchises = franchiseData.filter(f => f.status === 'active').length;
    const totalRevenue = franchiseData.reduce((sum, f) => sum + f.financials.currentRevenue, 0);
    const totalRoyalties = franchiseData.reduce((sum, f) => sum + f.financials.monthlyRoyalty, 0);
    const avgPerformance = franchiseData.reduce((sum, f) => sum + f.performance.overallScore, 0) / totalFranchises;
    const totalLocations = franchiseData.reduce((sum, f) => sum + f.locations, 0);
    const totalStaff = franchiseData.reduce((sum, f) => sum + f.staff, 0);
    const totalViolations = franchiseData.reduce((sum, f) => sum + f.violations, 0);

    return [
      {
        id: 'total_franchises',
        title: t('franchise.total_franchises'),
        value: totalFranchises,
        change: 12.5,
        trend: 'up',
        format: 'number',
        icon: <Building2 className="h-5 w-5" />,
        color: 'bg-blue-500'
      },
      {
        id: 'active_franchises',
        title: t('franchise.active_franchises'),
        value: activeFranchises,
        change: 8.3,
        trend: 'up',
        format: 'number',
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: 'bg-green-500'
      },
      {
        id: 'total_revenue',
        title: t('franchise.total_revenue'),
        value: totalRevenue,
        change: 15.7,
        trend: 'up',
        format: 'currency',
        icon: <DollarSign className="h-5 w-5" />,
        color: 'bg-emerald-500'
      },
      {
        id: 'monthly_royalties',
        title: t('franchise.monthly_royalties'),
        value: totalRoyalties,
        change: 9.2,
        trend: 'up',
        format: 'currency',
        icon: <CreditCard className="h-5 w-5" />,
        color: 'bg-purple-500'
      },
      {
        id: 'avg_performance',
        title: t('franchise.avg_performance'),
        value: avgPerformance,
        change: 3.1,
        trend: 'up',
        format: 'percentage',
        icon: <Target className="h-5 w-5" />,
        color: 'bg-orange-500'
      },
      {
        id: 'total_locations',
        title: t('franchise.total_locations'),
        value: totalLocations,
        change: 22.7,
        trend: 'up',
        format: 'number',
        icon: <MapPin className="h-5 w-5" />,
        color: 'bg-indigo-500'
      },
      {
        id: 'compliance_issues',
        title: t('franchise.compliance_issues'),
        value: totalViolations,
        change: -18.5,
        trend: 'down',
        format: 'number',
        icon: <AlertTriangle className="h-5 w-5" />,
        color: 'bg-red-500'
      },
      {
        id: 'total_staff',
        title: t('franchise.total_staff'),
        value: totalStaff,
        change: 7.8,
        trend: 'up',
        format: 'number',
        icon: <Users className="h-5 w-5" />,
        color: 'bg-teal-500'
      }
    ];
  }, [franchiseData, t]);

  // Filter franchises
  const filteredFranchises = useMemo(() => {
    return franchiseData.filter(franchise => {
      const matchesSearch = franchise.franchiseeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           franchise.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           franchise.territory.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || franchise.status === selectedStatus;
      const matchesRegion = selectedRegion === 'all' || franchise.region === selectedRegion;
      return matchesSearch && matchesStatus && matchesRegion;
    });
  }, [franchiseData, searchQuery, selectedStatus, selectedRegion]);

  // Revenue trend data
  const revenueTrendData = useMemo(() => [
    { month: 'Jan', revenue: 580000, royalties: 45000, growth: 8.2 },
    { month: 'Feb', revenue: 620000, royalties: 48000, growth: 10.5 },
    { month: 'Mar', revenue: 655000, royalties: 51000, growth: 12.1 },
    { month: 'Apr', revenue: 695000, royalties: 54000, growth: 14.8 },
    { month: 'May', revenue: 725000, royalties: 56000, growth: 15.2 },
    { month: 'Jun', revenue: 810000, royalties: 62000, growth: 17.3 }
  ], []);

  // Performance distribution data
  const performanceDistribution = useMemo(() => [
    { name: 'Excellent (90-100%)', value: 50, color: '#10B981' },
    { name: 'Good (80-89%)', value: 25, color: '#3B82F6' },
    { name: 'Fair (70-79%)', value: 25, color: '#F59E0B' },
    { name: 'Poor (<70%)', value: 0, color: '#EF4444' }
  ], []);

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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';  
      case 'terminated': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get license type display
  const getLicenseTypeDisplay = (type: string) => {
    switch (type) {
      case 'single_unit': return t('franchise.single_unit');
      case 'multi_unit': return t('franchise.multi_unit');
      case 'area_development': return t('franchise.area_development');
      case 'master_franchise': return t('franchise.master_franchise');
      default: return type;
    }
  };

  // Get market potential color
  const getMarketPotentialColor = (potential: string) => {
    switch (potential) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
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
        title: t('franchise.data_refreshed'),
        description: t('franchise.data_refreshed_desc'),
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
      title: t('franchise.export_started'),
      description: t('franchise.export_started_desc', { format: format.toUpperCase() }),
    });
  };

  if (isLoading && !lastRefresh) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('franchise.loading_portal')}</h3>
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
            <Handshake className="h-8 w-8 mr-3 text-[#E31B23]" />
            {t('franchise.portal_title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('franchise.portal_desc')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('franchise.last_updated')}: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('franchise.add_franchisee')}
          </Button>
          
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

      {/* Franchise Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {franchiseMetrics.map((metric) => (
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
                          {Math.abs(metric.change)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('franchise.search_franchises')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('franchise.all_statuses')}</SelectItem>
                <SelectItem value="active">{t('franchise.active')}</SelectItem>
                <SelectItem value="pending">{t('franchise.pending')}</SelectItem>
                <SelectItem value="suspended">{t('franchise.suspended')}</SelectItem>
                <SelectItem value="terminated">{t('franchise.terminated')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('franchise.all_regions')}</SelectItem>
                {[...new Set(franchiseData.map(f => f.region))].map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t('franchise.overview')}</TabsTrigger>
          <TabsTrigger value="franchises">{t('franchise.franchises')}</TabsTrigger>
          <TabsTrigger value="territories">{t('franchise.territories')}</TabsTrigger>
          <TabsTrigger value="performance">{t('franchise.performance')}</TabsTrigger>
          <TabsTrigger value="compliance">{t('franchise.compliance')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue and Royalties Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  {t('franchise.revenue_royalties_trend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        name === 'growth' ? `${value}%` : `฿${value.toLocaleString()}`,
                        name === 'revenue' ? t('franchise.revenue') :
                        name === 'royalties' ? t('franchise.royalties') : t('franchise.growth')
                      ]}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="revenue" 
                      fill="#E31B23" 
                      name={t('franchise.revenue')}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="royalties" 
                      fill="#D4AF37" 
                      name={t('franchise.royalties')}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="growth" 
                      stroke="#008B8B" 
                      strokeWidth={3}
                      name={t('franchise.growth')}
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
                  {t('franchise.performance_distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
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
                        formatter={(value: any) => [`${value}%`, t('franchise.franchises')]}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                {t('franchise.quick_actions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('franchise.generate_report')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Scale className="h-4 w-4 mr-2" />
                  {t('franchise.review_contracts')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t('franchise.compliance_audit')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  {t('franchise.territory_planning')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Franchises Tab */}
        <TabsContent value="franchises" className="space-y-6">
          <div className="space-y-4">
            {filteredFranchises.map((franchise) => (
              <Card key={franchise.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                    {/* Franchise Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Building2 className="h-6 w-6 text-[#E31B23]" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{franchise.businessName}</h3>
                          <p className="text-sm text-gray-600">{franchise.franchiseeName}</p>
                        </div>
                        <Badge className={getStatusColor(franchise.status)}>
                          {franchise.status}
                        </Badge>
                        <Badge variant="outline">
                          {getLicenseTypeDisplay(franchise.licenseType)}
                        </Badge>
                        {franchise.alerts > 0 && (
                          <Badge variant="destructive">
                            {franchise.alerts} alerts
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {franchise.territory}
                        </div>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          {franchise.locations} locations
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {franchise.staff} staff
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          ฿{franchise.financials.monthlyRoyalty.toLocaleString()}/mo
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {franchise.performance.overallScore.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">{t('franchise.overall_score')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ฿{(franchise.financials.currentRevenue / 1000).toFixed(0)}k
                        </div>
                        <div className="text-xs text-gray-600">{t('franchise.monthly_revenue')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {franchise.performance.complianceScore.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">{t('franchise.compliance')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {franchise.performance.customerSatisfaction.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600">{t('franchise.satisfaction')}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            {t('common.view')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>{franchise.businessName}</DialogTitle>
                            <DialogDescription>
                              {t('franchise.franchise_details')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                              <h4 className="font-semibold">{t('franchise.basic_info')}</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>{t('franchise.franchisee')}:</strong> {franchise.franchiseeName}</div>
                                <div><strong>{t('franchise.territory')}:</strong> {franchise.territory}</div>
                                <div><strong>{t('franchise.established')}:</strong> {new Date(franchise.establishedDate).toLocaleDateString()}</div>
                                <div><strong>{t('franchise.contract_end')}:</strong> {new Date(franchise.contractEndDate).toLocaleDateString()}</div>
                              </div>
                              
                              <h4 className="font-semibold">{t('franchise.contact_info')}</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2" />
                                  {franchise.contact.email}
                                </div>
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2" />
                                  {franchise.contact.phone}
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  {franchise.contact.address}
                                </div>
                              </div>
                            </div>

                            {/* Financial Information */}
                            <div className="space-y-4">
                              <h4 className="font-semibold">{t('franchise.financial_info')}</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>{t('franchise.initial_fee')}:</strong> ฿{franchise.financials.initialFee.toLocaleString()}</div>
                                <div><strong>{t('franchise.royalty_rate')}:</strong> {franchise.financials.royaltyRate}%</div>
                                <div><strong>{t('franchise.marketing_fee')}:</strong> {franchise.financials.marketingFee}%</div>
                                <div><strong>{t('franchise.monthly_royalty')}:</strong> ฿{franchise.financials.monthlyRoyalty.toLocaleString()}</div>
                                <div><strong>{t('franchise.total_investment')}:</strong> ฿{franchise.financials.totalInvestment.toLocaleString()}</div>
                              </div>
                              
                              <h4 className="font-semibold">{t('franchise.performance_metrics')}</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>{t('franchise.overall_score')}:</strong> {franchise.performance.overallScore}%</div>
                                <div><strong>{t('franchise.compliance_score')}:</strong> {franchise.performance.complianceScore}%</div>
                                <div><strong>{t('franchise.operational_score')}:</strong> {franchise.performance.operationalScore}%</div>
                                <div><strong>{t('franchise.profitability')}:</strong> {franchise.performance.profitability}%</div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        {t('common.edit')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Territories Tab */}
        <TabsContent value="territories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2 text-green-500" />
                {t('franchise.territory_overview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('franchise.territory_name')}</TableHead>
                      <TableHead>{t('franchise.region')}</TableHead>
                      <TableHead className="text-center">{t('franchise.population')}</TableHead>
                      <TableHead className="text-center">{t('franchise.current_franchises')}</TableHead>
                      <TableHead className="text-center">{t('franchise.available_units')}</TableHead>
                      <TableHead className="text-center">{t('franchise.market_potential')}</TableHead>
                      <TableHead className="text-center">{t('franchise.status')}</TableHead>
                      <TableHead className="text-center">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {territoryData.map((territory) => (
                      <TableRow key={territory.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{territory.name}</TableCell>
                        <TableCell>{territory.region}</TableCell>
                        <TableCell className="text-center">{territory.population.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{territory.franchises}</TableCell>
                        <TableCell className="text-center">{territory.availableUnits}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getMarketPotentialColor(territory.marketPotential)}>
                            {territory.marketPotential}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={territory.status === 'available' ? 'default' : 'secondary'}>
                            {territory.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-1">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {territory.status === 'available' && (
                              <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                {t('franchise.performance_comparison')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={franchiseData.map(f => ({
                  name: f.businessName.split(' ').slice(-1)[0],
                  overall: f.performance.overallScore,
                  compliance: f.performance.complianceScore,
                  operational: f.performance.operationalScore,
                  satisfaction: f.performance.customerSatisfaction * 20
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: any) => [
                      name === 'satisfaction' ? `${(value / 20).toFixed(1)}/5` : `${value.toFixed(1)}%`,
                      name === 'overall' ? t('franchise.overall') :
                      name === 'compliance' ? t('franchise.compliance') :
                      name === 'operational' ? t('franchise.operational') : t('franchise.satisfaction')
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="overall" fill="#E31B23" name={t('franchise.overall')} />
                  <Bar dataKey="compliance" fill="#008B8B" name={t('franchise.compliance')} />
                  <Bar dataKey="operational" fill="#D4AF37" name={t('franchise.operational')} />
                  <Bar dataKey="satisfaction" fill="#231F20" name={t('franchise.satisfaction')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-red-500" />
                  {t('franchise.compliance_overview')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {franchiseData.filter(f => f.violations > 0 || f.alerts > 0).map((franchise) => (
                    <div key={franchise.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="font-medium">{franchise.businessName}</div>
                          <div className="text-sm text-gray-600">{franchise.franchiseeName}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {franchise.violations > 0 && (
                          <Badge variant="destructive">
                            {franchise.violations} violations
                          </Badge>
                        )}
                        {franchise.alerts > 0 && (
                          <Badge variant="secondary">
                            {franchise.alerts} alerts
                          </Badge>
                        )}
                        <div className="text-sm text-gray-600">
                          {t('franchise.compliance')}: {franchise.performance.complianceScore.toFixed(1)}%
                        </div>
                        <Button variant="outline" size="sm">
                          {t('common.review')}
                        </Button>
                      </div>
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

export default FranchiseManagementPortal;