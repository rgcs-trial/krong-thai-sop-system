/**
 * Regional Compliance Monitoring Dashboard Component
 * Comprehensive compliance monitoring and auditing interface for multi-region restaurant operations
 * Features regulatory tracking, audit management, and compliance analytics across all locations
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Scale,
  Eye,
  BookOpen,
  Target,
  TrendingUp,
  TrendingDown,
  MapPin,
  Building2,
  Users,
  Calendar,
  Bell,
  Filter,
  RefreshCw,
  Download,
  Search,
  Plus,
  Edit,
  Flag,
  Gavel,
  ClipboardList,
  Award,
  Zap,
  Activity,
  BarChart3,
  PieChart,
  Globe2,
  UserCheck,
  Settings,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Info,
  CheckSquare
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

interface RegionalComplianceDashboardProps {
  className?: string;
}

interface ComplianceItem {
  id: string;
  locationId: string;
  locationName: string;
  region: string;
  category: 'food_safety' | 'labor' | 'environmental' | 'fire_safety' | 'health' | 'licensing';
  regulationType: 'federal' | 'provincial' | 'municipal' | 'industry';
  requirement: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'overdue' | 'exempt';
  severity: 'critical' | 'high' | 'medium' | 'low';
  dueDate: string;
  lastAudit: string;
  nextAudit: string;
  inspector: string;
  violations: ComplianceViolation[];
  corrective_actions: CorrectiveAction[];
  documents: ComplianceDocument[];
}

interface ComplianceViolation {
  id: string;
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dateIdentified: string;
  status: 'open' | 'in_progress' | 'resolved' | 'appealed';
  fineAmount?: number;
  responsibleParty: string;
}

interface CorrectiveAction {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completedDate?: string;
}

interface ComplianceDocument {
  id: string;
  name: string;
  type: 'certificate' | 'license' | 'permit' | 'report' | 'training_record';
  uploadDate: string;
  expiryDate?: string;
  status: 'valid' | 'expired' | 'pending_renewal';
}

interface RegionalCompliance {
  region: string;
  totalLocations: number;
  compliantLocations: number;
  complianceRate: number;
  totalViolations: number;
  criticalViolations: number;
  overdueActions: number;
  upcomingAudits: number;
  expiredDocuments: number;
}

interface ComplianceMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency';
  icon: React.ReactNode;
  color: string;
  severity?: 'critical' | 'warning' | 'info';
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

export function RegionalComplianceDashboard({ className }: RegionalComplianceDashboardProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Mock compliance data
  const complianceData = useMemo<ComplianceItem[]>(() => [
    {
      id: 'comp-001',
      locationId: 'loc-001',
      locationName: 'Krong Thai Central Bangkok',
      region: 'Bangkok Metropolitan',
      category: 'food_safety',
      regulationType: 'municipal',
      requirement: 'Food Handler Certification',
      description: 'All food handling staff must have valid food safety certificates',
      status: 'compliant',
      severity: 'high',
      dueDate: '2024-12-31',
      lastAudit: '2024-05-15',
      nextAudit: '2024-08-15',
      inspector: 'Bangkok Health Department',
      violations: [],
      corrective_actions: [],
      documents: [
        {
          id: 'doc-001',
          name: 'Food Safety Certificate 2024',
          type: 'certificate',
          uploadDate: '2024-01-15',
          expiryDate: '2024-12-31',
          status: 'valid'
        }
      ]
    },
    {
      id: 'comp-002',
      locationId: 'loc-002',
      locationName: 'Krong Thai Chiang Mai',
      region: 'Northern Thailand',
      category: 'fire_safety',
      regulationType: 'provincial',
      requirement: 'Fire Safety Inspection',
      description: 'Annual fire safety inspection and equipment maintenance',
      status: 'non_compliant',
      severity: 'critical',
      dueDate: '2024-06-30',
      lastAudit: '2024-06-20',
      nextAudit: '2024-09-20',
      inspector: 'Chiang Mai Fire Department',
      violations: [
        {
          id: 'viol-001',
          type: 'Fire Extinguisher Maintenance',
          description: 'Two fire extinguishers found to be expired and not properly maintained',
          severity: 'critical',
          dateIdentified: '2024-06-20',
          status: 'in_progress',
          fineAmount: 5000,
          responsibleParty: 'Facility Manager'
        }
      ],
      corrective_actions: [
        {
          id: 'action-001',
          description: 'Replace expired fire extinguishers and establish maintenance schedule',
          assignedTo: 'Niran Thaksin',
          dueDate: '2024-07-05',
          status: 'in_progress'
        }
      ],
      documents: [
        {
          id: 'doc-002',
          name: 'Fire Safety Report 2024',
          type: 'report',
          uploadDate: '2024-06-20',
          status: 'valid'
        }
      ]
    },
    {
      id: 'comp-003',
      locationId: 'loc-003',
      locationName: 'Krong Thai Phuket',
      region: 'Southern Thailand',
      category: 'environmental',
      regulationType: 'federal',
      requirement: 'Waste Management Compliance',
      description: 'Proper segregation and disposal of food waste and recyclables',
      status: 'pending',
      severity: 'medium',
      dueDate: '2024-08-15',
      lastAudit: '2024-04-10',
      nextAudit: '2024-07-10',
      inspector: 'Environmental Protection Agency',
      violations: [],
      corrective_actions: [
        {
          id: 'action-002',
          description: 'Implement new waste segregation system and staff training',
          assignedTo: 'Apinya Srisawat',
          dueDate: '2024-08-01',
          status: 'pending'
        }
      ],
      documents: [
        {
          id: 'doc-003',
          name: 'Waste Management Permit',
          type: 'permit',
          uploadDate: '2024-01-01',
          expiryDate: '2024-12-31',
          status: 'valid'
        }
      ]
    },
    {
      id: 'comp-004',
      locationId: 'loc-004',  
      locationName: 'Krong Thai Pattaya',
      region: 'Eastern Thailand',
      category: 'labor',
      regulationType: 'federal',
      requirement: 'Worker Safety Training',
      description: 'Mandatory workplace safety training for all employees',
      status: 'overdue',
      severity: 'high',
      dueDate: '2024-05-30',
      lastAudit: '2024-03-15',
      nextAudit: '2024-06-15',
      inspector: 'Department of Labor Protection',
      violations: [
        {
          id: 'viol-002',
          type: 'Training Compliance',
          description: '8 employees have not completed mandatory safety training within required timeframe',
          severity: 'high',
          dateIdentified: '2024-05-30',
          status: 'open',
          fineAmount: 12000,
          responsibleParty: 'HR Manager'
        }
      ],
      corrective_actions: [
        {
          id: 'action-003',
          description: 'Schedule and complete safety training for all non-compliant employees',
          assignedTo: 'Prawit Chainam',
          dueDate: '2024-07-01',
          status: 'overdue'
        }
      ],
      documents: [
        {
          id: 'doc-004',
          name: 'Safety Training Records 2023',
          type: 'training_record',
          uploadDate: '2023-12-01',
          expiryDate: '2024-05-30',
          status: 'expired'
        }
      ]
    },
    {
      id: 'comp-005',
      locationId: 'loc-001',
      locationName: 'Krong Thai Central Bangkok',
      region: 'Bangkok Metropolitan',
      category: 'health',
      regulationType: 'municipal',
      requirement: 'Kitchen Sanitation Standards',
      description: 'Regular health inspections and sanitation compliance',
      status: 'compliant',
      severity: 'high',
      dueDate: '2024-09-30',
      lastAudit: '2024-05-20',
      nextAudit: '2024-08-20',
      inspector: 'Bangkok Public Health Office',
      violations: [],
      corrective_actions: [],
      documents: [
        {
          id: 'doc-005',
          name: 'Health Inspection Certificate',
          type: 'certificate',
          uploadDate: '2024-05-20',
          expiryDate: '2024-11-20',
          status: 'valid'
        }
      ]
    },
    {
      id: 'comp-006',
      locationId: 'loc-005',
      locationName: 'Krong Thai Thonglor',
      region: 'Bangkok Metropolitan',
      category: 'licensing',
      regulationType: 'municipal',
      requirement: 'Business License Renewal',
      description: 'Annual business license renewal and fee payment',
      status: 'pending',
      severity: 'medium',
      dueDate: '2024-12-31',
      lastAudit: '2024-01-15',
      nextAudit: '2024-12-15',
      inspector: 'Bangkok Business Registration Office',
      violations: [],
      corrective_actions: [
        {
          id: 'action-004',
          description: 'Submit business license renewal application and supporting documents',
          assignedTo: 'Bangkok Manager',
          dueDate: '2024-11-30',
          status: 'pending'
        }
      ],
      documents: [
        {
          id: 'doc-006',
          name: 'Business License 2023',
          type: 'license',
          uploadDate: '2023-12-01',
          expiryDate: '2024-12-31',
          status: 'pending_renewal'
        }
      ]
    }
  ], []);

  // Calculate regional compliance data
  const regionalComplianceData = useMemo<RegionalCompliance[]>(() => {
    const regions = [...new Set(complianceData.map(item => item.region))];
    
    return regions.map(region => {
      const regionItems = complianceData.filter(item => item.region === region);
      const totalLocations = new Set(regionItems.map(item => item.locationId)).size;
      const compliantItems = regionItems.filter(item => item.status === 'compliant');
      const compliantLocations = new Set(compliantItems.map(item => item.locationId)).size;
      const totalViolations = regionItems.reduce((sum, item) => sum + item.violations.length, 0);
      const criticalViolations = regionItems.reduce((sum, item) => 
        sum + item.violations.filter(v => v.severity === 'critical').length, 0);
      const overdueActions = regionItems.reduce((sum, item) => 
        sum + item.corrective_actions.filter(a => a.status === 'overdue').length, 0);
      const upcomingAudits = regionItems.filter(item => {
        const nextAudit = new Date(item.nextAudit);
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return nextAudit <= thirtyDaysFromNow;
      }).length;
      const expiredDocuments = regionItems.reduce((sum, item) => 
        sum + item.documents.filter(d => d.status === 'expired').length, 0);

      return {
        region,
        totalLocations,
        compliantLocations,
        complianceRate: totalLocations > 0 ? (compliantLocations / totalLocations) * 100 : 0,
        totalViolations,
        criticalViolations,
        overdueActions,
        upcomingAudits,
        expiredDocuments
      };
    });
  }, [complianceData]);

  // Calculate overall compliance metrics
  const complianceMetrics = useMemo<ComplianceMetric[]>(() => {
    const totalItems = complianceData.length;
    const compliantItems = complianceData.filter(item => item.status === 'compliant').length;
    const nonCompliantItems = complianceData.filter(item => item.status === 'non_compliant').length;
    const overdueItems = complianceData.filter(item => item.status === 'overdue').length;
    const totalViolations = complianceData.reduce((sum, item) => sum + item.violations.length, 0);
    const criticalViolations = complianceData.reduce((sum, item) => 
      sum + item.violations.filter(v => v.severity === 'critical').length, 0);
    const totalFines = complianceData.reduce((sum, item) => 
      sum + item.violations.reduce((vSum, v) => vSum + (v.fineAmount || 0), 0), 0);
    const overdueActions = complianceData.reduce((sum, item) => 
      sum + item.corrective_actions.filter(a => a.status === 'overdue').length, 0);

    return [
      {
        id: 'overall_compliance',
        title: t('compliance.overall_compliance_rate'),
        value: totalItems > 0 ? (compliantItems / totalItems) * 100 : 0,
        change: 2.3,
        trend: 'up',
        format: 'percentage',
        icon: <Shield className="h-5 w-5" />,
        color: 'bg-green-500'
      },
      {
        id: 'non_compliant',
        title: t('compliance.non_compliant_items'),
        value: nonCompliantItems,
        change: -15.2,
        trend: 'down',
        format: 'number',
        icon: <XCircle className="h-5 w-5" />,
        color: 'bg-red-500',
        severity: 'critical'
      },
      {
        id: 'overdue_items',
        title: t('compliance.overdue_items'),
        value: overdueItems,
        change: -8.7,
        trend: 'down',
        format: 'number',
        icon: <Clock className="h-5 w-5" />,
        color: 'bg-orange-500',
        severity: 'warning'
      },
      {
        id: 'total_violations',
        title: t('compliance.total_violations'),
        value: totalViolations,
        change: -12.5,
        trend: 'down',
        format: 'number',
        icon: <AlertTriangle className="h-5 w-5" />,
        color: 'bg-red-600',
        severity: 'critical'
      },
      {
        id: 'critical_violations',
        title: t('compliance.critical_violations'),
        value: criticalViolations,
        change: -25.0,
        trend: 'down',
        format: 'number',
        icon: <Flag className="h-5 w-5" />,
        color: 'bg-red-700',
        severity: 'critical'
      },
      {
        id: 'total_fines',
        title: t('compliance.total_fines'),
        value: totalFines,
        change: -18.3,
        trend: 'down',
        format: 'currency',
        icon: <Scale className="h-5 w-5" />,
        color: 'bg-purple-500',
        severity: 'warning'
      },
      {
        id: 'overdue_actions',
        title: t('compliance.overdue_actions'),
        value: overdueActions,
        change: -5.4,
        trend: 'down',
        format: 'number',
        icon: <ClipboardList className="h-5 w-5" />,
        color: 'bg-yellow-500',
        severity: 'warning'
      },
      {
        id: 'avg_resolution_time',
        title: t('compliance.avg_resolution_time'),
        value: '12.5',
        change: -8.2,
        trend: 'down',
        format: 'number',
        icon: <Activity className="h-5 w-5" />,
        color: 'bg-blue-500'
      }
    ];
  }, [complianceData, t]);

  // Filter compliance data
  const filteredComplianceData = useMemo(() => {
    return complianceData.filter(item => {
      const matchesSearch = item.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegion === 'all' || item.region === selectedRegion;
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      const matchesSeverity = selectedSeverity === 'all' || item.severity === selectedSeverity;
      return matchesSearch && matchesRegion && matchesCategory && matchesStatus && matchesSeverity;
    });
  }, [complianceData, searchQuery, selectedRegion, selectedCategory, selectedStatus, selectedSeverity]);

  // Compliance trend data
  const complianceTrendData = useMemo(() => [
    { month: 'Jan', compliance: 82.5, violations: 12, fines: 25000 },
    { month: 'Feb', compliance: 85.2, violations: 9, fines: 18000 },
    { month: 'Mar', compliance: 87.8, violations: 7, fines: 15000 },
    { month: 'Apr', compliance: 89.1, violations: 5, fines: 12000 },
    { month: 'May', compliance: 91.3, violations: 4, fines: 8000 },
    { month: 'Jun', compliance: 92.7, violations: 3, fines: 5000 }
  ], []);

  // Category distribution data
  const categoryDistribution = useMemo(() => {
    const categories = ['food_safety', 'labor', 'environmental', 'fire_safety', 'health', 'licensing'];
    return categories.map(category => {
      const count = complianceData.filter(item => item.category === category).length;
      return {
        name: t(`compliance.category_${category}`),
        value: count,
        color: CHART_COLORS[categories.indexOf(category) % CHART_COLORS.length]
      };
    });
  }, [complianceData, t]);

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
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'non_compliant': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-200 text-red-900';
      case 'exempt': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get category display name
  const getCategoryDisplay = (category: string) => {
    return t(`compliance.category_${category}`);
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLastRefresh(new Date());
      toast({
        title: t('compliance.data_refreshed'),
        description: t('compliance.data_refreshed_desc'),
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
      title: t('compliance.export_started'),
      description: t('compliance.export_started_desc', { format: format.toUpperCase() }),
    });
  };

  if (isLoading && !lastRefresh) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('compliance.loading_dashboard')}</h3>
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
            <Shield className="h-8 w-8 mr-3 text-[#E31B23]" />
            {t('compliance.dashboard_title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('compliance.dashboard_desc')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('compliance.last_updated')}: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('compliance.add_requirement')}
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

      {/* Compliance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceMetrics.map((metric) => (
          <Card key={metric.id} className={cn(
            "hover:shadow-md transition-shadow",
            metric.severity === 'critical' && "border-red-200 bg-red-50",
            metric.severity === 'warning' && "border-yellow-200 bg-yellow-50"
          )}>
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
                        {metric.format === 'number' && metric.id === 'avg_resolution_time' && (
                          <span className="text-sm font-normal text-gray-600 ml-1">days</span>
                        )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder={t('compliance.search_requirements')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('compliance.all_regions')}</SelectItem>
                {[...new Set(complianceData.map(item => item.region))].map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('compliance.all_categories')}</SelectItem>
                <SelectItem value="food_safety">{t('compliance.category_food_safety')}</SelectItem>
                <SelectItem value="labor">{t('compliance.category_labor')}</SelectItem>
                <SelectItem value="environmental">{t('compliance.category_environmental')}</SelectItem>
                <SelectItem value="fire_safety">{t('compliance.category_fire_safety')}</SelectItem>
                <SelectItem value="health">{t('compliance.category_health')}</SelectItem>
                <SelectItem value="licensing">{t('compliance.category_licensing')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('compliance.all_statuses')}</SelectItem>
                <SelectItem value="compliant">{t('compliance.compliant')}</SelectItem>
                <SelectItem value="non_compliant">{t('compliance.non_compliant')}</SelectItem>
                <SelectItem value="pending">{t('compliance.pending')}</SelectItem>
                <SelectItem value="overdue">{t('compliance.overdue')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('compliance.all_severities')}</SelectItem>
                <SelectItem value="critical">{t('compliance.critical')}</SelectItem>
                <SelectItem value="high">{t('compliance.high')}</SelectItem>
                <SelectItem value="medium">{t('compliance.medium')}</SelectItem>
                <SelectItem value="low">{t('compliance.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t('compliance.overview')}</TabsTrigger>
          <TabsTrigger value="requirements">{t('compliance.requirements')}</TabsTrigger>
          <TabsTrigger value="violations">{t('compliance.violations')}</TabsTrigger>
          <TabsTrigger value="regional">{t('compliance.regional')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('compliance.analytics')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  {t('compliance.compliance_trend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={complianceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        name === 'compliance' ? `${value}%` : 
                        name === 'fines' ? `฿${value.toLocaleString()}` : value,
                        name === 'compliance' ? t('compliance.compliance_rate') :
                        name === 'violations' ? t('compliance.violations') : t('compliance.fines')
                      ]}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="compliance" 
                      fill="#10B981" 
                      fillOpacity={0.6}
                      stroke="#10B981"
                      name={t('compliance.compliance_rate')}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="violations" 
                      fill="#EF4444" 
                      name={t('compliance.violations')}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="fines" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      name={t('compliance.fines')}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                  {t('compliance.category_distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <RechartsPieChart
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <Tooltip 
                        formatter={(value: any) => [value, t('compliance.requirements')]}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Critical Alerts */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {t('compliance.critical_alerts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredComplianceData
                  .filter(item => item.status === 'non_compliant' || item.status === 'overdue')
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="font-medium text-red-900">{item.requirement}</div>
                          <div className="text-sm text-red-700">{item.locationName} - {getCategoryDisplay(item.category)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                        <Badge className={getSeverityColor(item.severity)}>
                          {item.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-purple-500" />
                {t('compliance.compliance_requirements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('compliance.requirement')}</TableHead>
                      <TableHead>{t('compliance.location')}</TableHead>
                      <TableHead className="text-center">{t('compliance.category')}</TableHead>
                      <TableHead className="text-center">{t('compliance.status')}</TableHead>
                      <TableHead className="text-center">{t('compliance.severity')}</TableHead>
                      <TableHead className="text-center">{t('compliance.due_date')}</TableHead>
                      <TableHead className="text-center">{t('compliance.next_audit')}</TableHead>
                      <TableHead className="text-center">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComplianceData.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.requirement}</div>
                            <div className="text-sm text-gray-600">{item.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.locationName}</div>
                            <div className="text-sm text-gray-600">{item.region}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {getCategoryDisplay(item.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getSeverityColor(item.severity)}>
                            {item.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {new Date(item.nextAudit).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>{item.requirement}</DialogTitle>
                                  <DialogDescription>
                                    {item.description}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <h4 className="font-semibold">{t('compliance.requirement_details')}</h4>
                                    <div className="space-y-2 text-sm">
                                      <div><strong>{t('compliance.location')}:</strong> {item.locationName}</div>
                                      <div><strong>{t('compliance.region')}:</strong> {item.region}</div>
                                      <div><strong>{t('compliance.category')}:</strong> {getCategoryDisplay(item.category)}</div>
                                      <div><strong>{t('compliance.regulation_type')}:</strong> {item.regulationType}</div>
                                      <div><strong>{t('compliance.inspector')}:</strong> {item.inspector}</div>
                                      <div><strong>{t('compliance.due_date')}:</strong> {new Date(item.dueDate).toLocaleDateString()}</div>
                                      <div><strong>{t('compliance.last_audit')}:</strong> {new Date(item.lastAudit).toLocaleDateString()}</div>
                                      <div><strong>{t('compliance.next_audit')}:</strong> {new Date(item.nextAudit).toLocaleDateString()}</div>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <h4 className="font-semibold">{t('compliance.violations_actions')}</h4>
                                    {item.violations.length > 0 ? (
                                      <div className="space-y-2">
                                        {item.violations.map((violation) => (
                                          <div key={violation.id} className="p-2 border rounded">
                                            <div className="font-medium text-red-800">{violation.type}</div>
                                            <div className="text-sm text-gray-600">{violation.description}</div>
                                            {violation.fineAmount && (
                                              <div className="text-sm text-red-600">
                                                Fine: ฿{violation.fineAmount.toLocaleString()}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-green-600 text-sm">No violations</div>
                                    )}
                                    
                                    {item.corrective_actions.length > 0 && (
                                      <div className="space-y-2">
                                        <h5 className="font-medium">Corrective Actions</h5>
                                        {item.corrective_actions.map((action) => (
                                          <div key={action.id} className="p-2 border rounded">
                                            <div className="font-medium">{action.description}</div>
                                            <div className="text-sm text-gray-600">
                                              Assigned to: {action.assignedTo} | Due: {new Date(action.dueDate).toLocaleDateString()}
                                            </div>
                                            <Badge className={getStatusColor(action.status)} size="sm">
                                              {action.status}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
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

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flag className="h-5 w-5 mr-2 text-red-500" />
                {t('compliance.active_violations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceData
                  .filter(item => item.violations.length > 0)
                  .map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.locationName}</h4>
                            <p className="text-sm text-gray-600">{item.requirement}</p>
                          </div>
                          <Badge className={getSeverityColor(item.severity)}>
                            {item.severity}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {item.violations.map((violation) => (
                            <div key={violation.id} className="bg-red-50 p-3 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium text-red-900">{violation.type}</div>
                                <Badge className={getSeverityColor(violation.severity)} size="sm">
                                  {violation.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-red-800 mb-2">{violation.description}</p>
                              <div className="flex justify-between items-center text-sm">
                                <div className="text-red-700">
                                  Identified: {new Date(violation.dateIdentified).toLocaleDateString()}
                                </div>
                                {violation.fineAmount && (
                                  <div className="font-medium text-red-900">
                                    Fine: ฿{violation.fineAmount.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regional Tab */}
        <TabsContent value="regional" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {regionalComplianceData.map((region) => (
              <Card key={region.region}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Globe2 className="h-5 w-5 mr-2 text-[#E31B23]" />
                      {region.region}
                    </span>
                    <Badge variant="outline">
                      {region.totalLocations} locations
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {region.complianceRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">{t('compliance.compliance_rate')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {region.totalViolations}
                        </div>
                        <div className="text-sm text-gray-600">{t('compliance.total_violations')}</div>
                      </div>
                    </div>
                    
                    <Progress value={region.complianceRate} className="h-3" />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span>{t('compliance.critical_violations')}:</span>
                        <span className="font-medium text-red-600">{region.criticalViolations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('compliance.overdue_actions')}:</span>
                        <span className="font-medium text-orange-600">{region.overdueActions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('compliance.upcoming_audits')}:</span>
                        <span className="font-medium text-blue-600">{region.upcomingAudits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('compliance.expired_documents')}:</span>
                        <span className="font-medium text-purple-600">{region.expiredDocuments}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                {t('compliance.compliance_analytics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionalComplianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="complianceRate" fill="#10B981" name={t('compliance.compliance_rate')} />
                  <Bar dataKey="totalViolations" fill="#EF4444" name={t('compliance.violations')} />
                  <Bar dataKey="overdueActions" fill="#F59E0B" name={t('compliance.overdue_actions')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RegionalComplianceDashboard;