/**
 * Cross-Location Staff Management Interface
 * Comprehensive staff coordination and management across multiple restaurant locations
 * Features employee tracking, skill mapping, scheduling, and performance analytics
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Award,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Star,
  BookOpen,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Edit,
  Eye,
  Plus,
  ArrowLeftRight,
  Phone,
  Mail,
  Settings,
  BarChart3,
  PieChart,
  Layers,
  Briefcase,
  GraduationCap,
  BadgeCheck,
  Clock8,
  Calendar1,
  Plane,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  FileText,
  UserCircle,
  Home,
  Zap
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
import { Checkbox } from '@/components/ui/checkbox';
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

interface CrossLocationStaffManagementProps {
  className?: string;
}

interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  primaryLocation: string;
  secondaryLocations: string[];
  hireDate: string;
  status: 'active' | 'inactive' | 'on_leave' | 'transferred';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'seasonal';
  skills: StaffSkill[];
  certifications: StaffCertification[];
  performance: {
    overallScore: number;
    punctuality: number;
    productivity: number;
    customerService: number;
    teamwork: number;
    compliance: number;
  };
  schedule: {
    weeklyHours: number;
    availability: string[];
    currentShifts: number;
    nextShift?: string;
  };
  training: {
    completedModules: number;
    totalModules: number;
    completionRate: number;
    lastTrainingDate: string;
    upcomingTrainings: number;
  };
  payroll: {
    hourlyRate: number;
    monthlyHours: number;
    monthlyPay: number;
    overtime: number;
    benefits: string[];
  };
  mobility: {
    canTransfer: boolean;
    preferredLocations: string[];
    transferHistory: TransferRecord[];
    currentAssignment?: string;
  };
}

interface StaffSkill {
  id: string;
  name: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  certified: boolean;
  certificationDate?: string;
  expiryDate?: string;
}

interface StaffCertification {
  id: string;
  name: string;
  issuer: string;
  dateIssued: string;
  expiryDate?: string;
  status: 'valid' | 'expired' | 'pending_renewal';
}

interface TransferRecord {
  id: string;
  fromLocation: string;
  toLocation: string;
  date: string;
  reason: string;
  type: 'permanent' | 'temporary' | 'coverage';
  duration?: number;
  status: 'completed' | 'in_progress' | 'cancelled';
}

interface LocationStaffSummary {
  locationId: string;
  locationName: string;
  region: string;
  totalStaff: number;
  activeStaff: number;
  onLeaveStaff: number;
  avgPerformance: number;
  avgTrainingCompletion: number;
  openPositions: number;
  urgentNeeds: string[];
  skillGaps: string[];
}

interface StaffMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency' | 'hours';
  icon: React.ReactNode;
  color: string;
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

export function CrossLocationStaffManagement({ className }: CrossLocationStaffManagementProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

  // Mock staff data
  const staffData = useMemo<StaffMember[]>(() => [
    {
      id: 'staff-001',
      employeeId: 'EMP-001',
      firstName: 'Somchai',
      lastName: 'Jaidee',
      email: 'somchai.j@krongthai.com',
      phone: '+66-81-123-4567',
      position: 'Head Chef',
      department: 'Kitchen',
      primaryLocation: 'Bangkok Central',
      secondaryLocations: ['Bangkok Thonglor'],
      hireDate: '2020-01-15',
      status: 'active',
      employmentType: 'full_time',
      skills: [
        {
          id: 'skill-001',
          name: 'Thai Cuisine',
          category: 'Culinary',
          level: 'expert',
          certified: true,
          certificationDate: '2020-03-15',
          expiryDate: '2025-03-15'
        },
        {
          id: 'skill-002',
          name: 'Food Safety',
          category: 'Safety',
          level: 'advanced',
          certified: true,
          certificationDate: '2024-01-10',
          expiryDate: '2025-01-10'
        }
      ],
      certifications: [
        {
          id: 'cert-001',
          name: 'Professional Chef Certification',
          issuer: 'Thai Culinary Institute',
          dateIssued: '2020-03-15',
          expiryDate: '2025-03-15',
          status: 'valid'
        }
      ],
      performance: {
        overallScore: 94.5,
        punctuality: 96.0,
        productivity: 93.5,
        customerService: 92.0,
        teamwork: 95.5,
        compliance: 97.0
      },
      schedule: {
        weeklyHours: 40,
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        currentShifts: 5,
        nextShift: '2024-07-29T08:00:00'
      },
      training: {
        completedModules: 18,
        totalModules: 20,
        completionRate: 90.0,
        lastTrainingDate: '2024-06-15',
        upcomingTrainings: 2
      },
      payroll: {
        hourlyRate: 450,
        monthlyHours: 160,
        monthlyPay: 72000,
        overtime: 8,
        benefits: ['Health Insurance', 'Performance Bonus', 'Meal Allowance']
      },
      mobility: {
        canTransfer: true,
        preferredLocations: ['Bangkok Central', 'Bangkok Thonglor'],
        transferHistory: [
          {
            id: 'transfer-001',
            fromLocation: 'Bangkok Thonglor',
            toLocation: 'Bangkok Central',
            date: '2023-06-01',
            reason: 'Promotion to Head Chef',
            type: 'permanent',
            status: 'completed'
          }
        ]
      }
    },
    {
      id: 'staff-002',
      employeeId: 'EMP-002',
      firstName: 'Niran',
      lastName: 'Thaksin',
      email: 'niran.t@krongthai.com',
      phone: '+66-81-987-6543',
      position: 'Restaurant Manager',
      department: 'Management',
      primaryLocation: 'Chiang Mai',
      secondaryLocations: [],
      hireDate: '2019-03-10',
      status: 'active',
      employmentType: 'full_time',
      skills: [
        {
          id: 'skill-003',
          name: 'Operations Management',
          category: 'Management',
          level: 'expert',
          certified: true,
          certificationDate: '2021-05-20',
          expiryDate: '2026-05-20'
        },
        {
          id: 'skill-004',
          name: 'Staff Training',
          category: 'HR',
          level: 'advanced',
          certified: true,
          certificationDate: '2022-08-10',
          expiryDate: '2025-08-10'
        }
      ],
      certifications: [
        {
          id: 'cert-002',
          name: 'Restaurant Management Certification',
          issuer: 'Hospitality Management Institute',
          dateIssued: '2021-05-20',
          expiryDate: '2026-05-20',
          status: 'valid'
        }
      ],
      performance: {
        overallScore: 91.8,
        punctuality: 95.0,
        productivity: 89.5,
        customerService: 93.0,
        teamwork: 90.0,
        compliance: 92.5
      },
      schedule: {
        weeklyHours: 45,
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        currentShifts: 6,
        nextShift: '2024-07-29T09:00:00'
      },
      training: {
        completedModules: 22,
        totalModules: 25,
        completionRate: 88.0,
        lastTrainingDate: '2024-05-20',
        upcomingTrainings: 3
      },
      payroll: {
        hourlyRate: 380,
        monthlyHours: 180,
        monthlyPay: 68400,
        overtime: 12,
        benefits: ['Health Insurance', 'Management Bonus', 'Training Allowance']
      },
      mobility: {
        canTransfer: true,
        preferredLocations: ['Chiang Mai', 'Bangkok Central'],
        transferHistory: []
      }
    },
    {
      id: 'staff-003',
      employeeId: 'EMP-003',
      firstName: 'Apinya',
      lastName: 'Srisawat',
      email: 'apinya.s@krongthai.com',
      phone: '+66-81-555-1234',
      position: 'Server',
      department: 'Service',
      primaryLocation: 'Phuket',
      secondaryLocations: ['Pattaya'],
      hireDate: '2021-08-20',
      status: 'active',
      employmentType: 'full_time',
      skills: [
        {
          id: 'skill-005',
          name: 'Customer Service',
          category: 'Service',
          level: 'advanced',
          certified: true,
          certificationDate: '2022-10-15',
          expiryDate: '2025-10-15'
        },
        {
          id: 'skill-006',
          name: 'POS Systems',
          category: 'Technology',
          level: 'intermediate',
          certified: false
        }
      ],
      certifications: [
        {
          id: 'cert-003',
          name: 'Customer Service Excellence',
          issuer: 'Service Institute Thailand',
          dateIssued: '2022-10-15',
          expiryDate: '2025-10-15',
          status: 'valid'
        }
      ],
      performance: {
        overallScore: 88.7,
        punctuality: 92.0,
        productivity: 87.5,
        customerService: 94.0,
        teamwork: 88.0,
        compliance: 85.0
      },
      schedule: {
        weeklyHours: 35,
        availability: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        currentShifts: 4,
        nextShift: '2024-07-29T16:00:00'
      },
      training: {
        completedModules: 12,
        totalModules: 15,
        completionRate: 80.0,
        lastTrainingDate: '2024-04-10',
        upcomingTrainings: 3
      },
      payroll: {
        hourlyRate: 280,
        monthlyHours: 140,
        monthlyPay: 39200,
        overtime: 5,
        benefits: ['Health Insurance', 'Service Bonus']
      },
      mobility: {
        canTransfer: true,
        preferredLocations: ['Phuket', 'Pattaya', 'Bangkok Central'],
        transferHistory: [
          {
            id: 'transfer-002',
            fromLocation: 'Pattaya',
            toLocation: 'Phuket',
            date: '2024-01-15',
            reason: 'Seasonal Transfer',
            type: 'temporary',
            duration: 90,
            status: 'completed'
          }
        ]
      }
    },
    {
      id: 'staff-004',
      employeeId: 'EMP-004',
      firstName: 'Prawit',
      lastName: 'Chainam',
      email: 'prawit.c@krongthai.com',
      phone: '+66-81-111-2222',
      position: 'Line Cook',
      department: 'Kitchen',
      primaryLocation: 'Pattaya',
      secondaryLocations: [],
      hireDate: '2022-02-01',
      status: 'on_leave',
      employmentType: 'full_time',
      skills: [
        {
          id: 'skill-007',
          name: 'Grill Operations',
          category: 'Culinary',
          level: 'intermediate',
          certified: true,
          certificationDate: '2023-01-20',
          expiryDate: '2026-01-20'
        }
      ],
      certifications: [
        {
          id: 'cert-004',
          name: 'Food Handler Certificate',
          issuer: 'Health Department',
          dateIssued: '2024-01-15',
          expiryDate: '2025-01-15',
          status: 'valid'
        }
      ],
      performance: {
        overallScore: 76.4,
        punctuality: 72.0,
        productivity: 78.5,
        customerService: 75.0,
        teamwork: 80.0,
        compliance: 76.5
      },
      schedule: {
        weeklyHours: 0,
        availability: [],
        currentShifts: 0,
        nextShift: undefined
      },
      training: {
        completedModules: 8,
        totalModules: 12,
        completionRate: 66.7,
        lastTrainingDate: '2024-01-25',
        upcomingTrainings: 4
      },
      payroll: {
        hourlyRate: 320,
        monthlyHours: 0,
        monthlyPay: 0,
        overtime: 0,
        benefits: ['Health Insurance']
      },
      mobility: {
        canTransfer: false,
        preferredLocations: ['Pattaya'],
        transferHistory: []
      }
    },
    {
      id: 'staff-005',
      employeeId: 'EMP-005',
      firstName: 'Siriporn',
      lastName: 'Wongsa',
      email: 'siriporn.w@krongthai.com',
      phone: '+66-81-333-4444',
      position: 'Assistant Manager',
      department: 'Management',
      primaryLocation: 'Bangkok Thonglor',
      secondaryLocations: ['Bangkok Central'],
      hireDate: '2020-09-15',
      status: 'active',
      employmentType: 'full_time',
      skills: [
        {
          id: 'skill-008',
          name: 'Team Leadership',
          category: 'Management',
          level: 'advanced',
          certified: true,
          certificationDate: '2023-03-10',
          expiryDate: '2026-03-10'
        },
        {
          id: 'skill-009',
          name: 'Inventory Management',
          category: 'Operations',
          level: 'expert',
          certified: true,
          certificationDate: '2022-11-05',
          expiryDate: '2025-11-05'
        }
      ],
      certifications: [
        {
          id: 'cert-005',
          name: 'Leadership Certification',
          issuer: 'Management Development Institute',
          dateIssued: '2023-03-10',
          expiryDate: '2026-03-10',
          status: 'valid'
        }
      ],
      performance: {
        overallScore: 89.2,
        punctuality: 91.0,
        productivity: 88.5,
        customerService: 87.0,
        teamwork: 92.0,
        compliance: 87.5
      },
      schedule: {
        weeklyHours: 42,
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        currentShifts: 5,
        nextShift: '2024-07-29T10:00:00'
      },
      training: {
        completedModules: 16,
        totalModules: 18,
        completionRate: 88.9,
        lastTrainingDate: '2024-05-30',
        upcomingTrainings: 2
      },
      payroll: {
        hourlyRate: 350,
        monthlyHours: 168,
        monthlyPay: 58800,
        overtime: 10,
        benefits: ['Health Insurance', 'Leadership Bonus', 'Professional Development']
      },
      mobility: {
        canTransfer: true,
        preferredLocations: ['Bangkok Thonglor', 'Bangkok Central', 'Chiang Mai'],
        transferHistory: []
      }
    }
  ], []);

  // Location summary data
  const locationSummaryData = useMemo<LocationStaffSummary[]>(() => {
    const locations = ['Bangkok Central', 'Bangkok Thonglor', 'Chiang Mai', 'Phuket', 'Pattaya'];
    
    return locations.map(location => {
      const locationStaff = staffData.filter(staff => 
        staff.primaryLocation === location || staff.secondaryLocations.includes(location)
      );
      const primaryStaff = staffData.filter(staff => staff.primaryLocation === location);
      const activeStaff = primaryStaff.filter(staff => staff.status === 'active');
      const onLeaveStaff = primaryStaff.filter(staff => staff.status === 'on_leave');
      const avgPerformance = primaryStaff.length > 0 ? 
        primaryStaff.reduce((sum, staff) => sum + staff.performance.overallScore, 0) / primaryStaff.length : 0;
      const avgTrainingCompletion = primaryStaff.length > 0 ?
        primaryStaff.reduce((sum, staff) => sum + staff.training.completionRate, 0) / primaryStaff.length : 0;

      return {
        locationId: location.toLowerCase().replace(/\s+/g, '-'),
        locationName: location,
        region: location.includes('Bangkok') ? 'Bangkok Metropolitan' : 
                location === 'Chiang Mai' ? 'Northern Thailand' :
                location === 'Phuket' ? 'Southern Thailand' : 'Eastern Thailand',
        totalStaff: primaryStaff.length,
        activeStaff: activeStaff.length,
        onLeaveStaff: onLeaveStaff.length,
        avgPerformance,
        avgTrainingCompletion,
        openPositions: Math.floor(Math.random() * 3) + 1,
        urgentNeeds: location === 'Pattaya' ? ['Line Cook', 'Server'] : 
                    location === 'Phuket' ? ['Assistant Manager'] : [],
        skillGaps: ['Digital Payment Systems', 'Advanced Customer Service']
      };
    });
  }, [staffData]);

  // Calculate staff metrics
  const staffMetrics = useMemo<StaffMetric[]>(() => {
    const totalStaff = staffData.length;
    const activeStaff = staffData.filter(staff => staff.status === 'active').length;
    const onLeaveStaff = staffData.filter(staff => staff.status === 'on_leave').length;
    const avgPerformance = staffData.reduce((sum, staff) => sum + staff.performance.overallScore, 0) / totalStaff;
    const avgTrainingCompletion = staffData.reduce((sum, staff) => sum + staff.training.completionRate, 0) / totalStaff;
    const totalHours = staffData.reduce((sum, staff) => sum + staff.schedule.weeklyHours, 0);
    const transferableStaff = staffData.filter(staff => staff.mobility.canTransfer).length;
    const totalPayroll = staffData.reduce((sum, staff) => sum + staff.payroll.monthlyPay, 0);

    return [
      {
        id: 'total_staff',
        title: t('staff.total_staff'),
        value: totalStaff,
        change: 8.3,
        trend: 'up',
        format: 'number',
        icon: <Users className="h-5 w-5" />,
        color: 'bg-blue-500'
      },
      {
        id: 'active_staff',
        title: t('staff.active_staff'),
        value: activeStaff,
        change: 5.2,
        trend: 'up',
        format: 'number',
        icon: <UserCheck className="h-5 w-5" />,
        color: 'bg-green-500'
      },
      {
        id: 'avg_performance',
        title: t('staff.avg_performance'),
        value: avgPerformance,
        change: 3.1,
        trend: 'up',
        format: 'percentage',
        icon: <Target className="h-5 w-5" />,
        color: 'bg-purple-500'
      },
      {
        id: 'training_completion',
        title: t('staff.avg_training_completion'),
        value: avgTrainingCompletion,
        change: 2.8,
        trend: 'up',
        format: 'percentage',
        icon: <GraduationCap className="h-5 w-5" />,
        color: 'bg-orange-500'
      },
      {
        id: 'total_hours',
        title: t('staff.total_weekly_hours'),
        value: totalHours,
        change: 1.5,
        trend: 'up',
        format: 'hours',
        icon: <Clock className="h-5 w-5" />,
        color: 'bg-indigo-500'
      },
      {
        id: 'transferable_staff',
        title: t('staff.transferable_staff'),
        value: transferableStaff,
        change: 12.7,
        trend: 'up',
        format: 'number',
        icon: <ArrowLeftRight className="h-5 w-5" />,
        color: 'bg-teal-500'
      },
      {
        id: 'on_leave',
        title: t('staff.on_leave'),
        value: onLeaveStaff,
        change: -15.3,
        trend: 'down',
        format: 'number',
        icon: <Plane className="h-5 w-5" />,
        color: 'bg-yellow-500'
      },
      {
        id: 'monthly_payroll',
        title: t('staff.monthly_payroll'),
        value: totalPayroll,
        change: 7.2,
        trend: 'up',
        format: 'currency',
        icon: <Briefcase className="h-5 w-5" />,
        color: 'bg-emerald-500'
      }
    ];
  }, [staffData, t]);

  // Filter staff data
  const filteredStaffData = useMemo(() => {
    return staffData.filter(staff => {
      const matchesSearch = staff.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           staff.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           staff.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           staff.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = selectedLocation === 'all' || 
                             staff.primaryLocation === selectedLocation ||
                             staff.secondaryLocations.includes(selectedLocation);
      const matchesDepartment = selectedDepartment === 'all' || staff.department === selectedDepartment;
      const matchesStatus = selectedStatus === 'all' || staff.status === selectedStatus;
      return matchesSearch && matchesLocation && matchesDepartment && matchesStatus;
    });
  }, [staffData, searchQuery, selectedLocation, selectedDepartment, selectedStatus]);

  // Performance trend data
  const performanceTrendData = useMemo(() => [
    { month: 'Jan', performance: 85.2, training: 78.5, retention: 92.3 },
    { month: 'Feb', performance: 87.1, training: 82.1, retention: 93.8 },
    { month: 'Mar', performance: 88.9, training: 85.6, retention: 94.2 },
    { month: 'Apr', performance: 90.3, training: 87.9, retention: 91.7 },
    { month: 'May', performance: 89.8, training: 89.2, retention: 93.1 },
    { month: 'Jun', performance: 88.7, training: 86.8, retention: 94.5 }
  ], []);

  // Department distribution
  const departmentDistribution = useMemo(() => {
    const departments = ['Kitchen', 'Service', 'Management'];
    return departments.map(department => {
      const count = staffData.filter(staff => staff.department === department).length;
      return {
        name: department,
        value: count,
        color: CHART_COLORS[departments.indexOf(department)]
      };
    });
  }, [staffData]);

  // Toggle staff selection
  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaff(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
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
      case 'hours':
        return `${value} hrs`;
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
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'transferred': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get skill level color
  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-purple-100 text-purple-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-green-100 text-green-800';
      case 'beginner': return 'bg-yellow-100 text-yellow-800';
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
        title: t('staff.data_refreshed'),
        description: t('staff.data_refreshed_desc'),
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
      title: t('staff.export_started'),
      description: t('staff.export_started_desc', { format: format.toUpperCase() }),
    });
  };

  if (isLoading && !lastRefresh) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('staff.loading_management')}</h3>
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
            <Users className="h-8 w-8 mr-3 text-[#E31B23]" />
            {t('staff.management_title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('staff.management_desc')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('staff.last_updated')}: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('staff.add_employee')}
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

      {/* Staff Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {staffMetrics.map((metric) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder={t('staff.search_employees')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('staff.all_locations')}</SelectItem>
                {[...new Set(staffData.map(staff => staff.primaryLocation))].map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('staff.all_departments')}</SelectItem>
                {[...new Set(staffData.map(staff => staff.department))].map(department => (
                  <SelectItem key={department} value={department}>{department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('staff.all_statuses')}</SelectItem>
                <SelectItem value="active">{t('staff.active')}</SelectItem>
                <SelectItem value="inactive">{t('staff.inactive')}</SelectItem>
                <SelectItem value="on_leave">{t('staff.on_leave')}</SelectItem>
                <SelectItem value="transferred">{t('staff.transferred')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t('staff.overview')}</TabsTrigger>
          <TabsTrigger value="employees">{t('staff.employees')}</TabsTrigger>
          <TabsTrigger value="locations">{t('staff.locations')}</TabsTrigger>
          <TabsTrigger value="skills">{t('staff.skills')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('staff.analytics')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  {t('staff.performance_trends')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        `${value}%`,
                        name === 'performance' ? t('staff.performance') :
                        name === 'training' ? t('staff.training') : t('staff.retention')
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="performance" 
                      stroke="#E31B23" 
                      strokeWidth={3}
                      name={t('staff.performance')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="training" 
                      stroke="#D4AF37" 
                      strokeWidth={3}
                      name={t('staff.training')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="retention" 
                      stroke="#008B8B" 
                      strokeWidth={3}
                      name={t('staff.retention')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                  {t('staff.department_distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <RechartsPieChart
                      data={departmentDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {departmentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <Tooltip 
                        formatter={(value: any) => [value, t('staff.employees')]}
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
                {t('staff.quick_actions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('staff.schedule_staff')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  {t('staff.transfer_employee')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  {t('staff.assign_training')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('staff.generate_report')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-6">
          <div className="space-y-4">
            {filteredStaffData.map((staff) => (
              <Card key={staff.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                    {/* Staff Info */}
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedStaff.includes(staff.id)}
                        onCheckedChange={() => toggleStaffSelection(staff.id)}
                      />
                      <UserCircle className="h-12 w-12 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {staff.firstName} {staff.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{staff.position} • {staff.department}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            {staff.primaryLocation}
                          </span>
                          <span className="flex items-center">
                            <Badge className={getStatusColor(staff.status)} size="sm">
                              {staff.status}
                            </Badge>
                          </span>
                          <span>ID: {staff.employeeId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">
                          {staff.performance.overallScore.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">{t('staff.performance')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">
                          {staff.training.completionRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">{t('staff.training')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {staff.schedule.weeklyHours}
                        </div>
                        <div className="text-xs text-gray-600">{t('staff.weekly_hours')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">
                          {staff.skills.length}
                        </div>
                        <div className="text-xs text-gray-600">{t('staff.skills')}</div>
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
                            <DialogTitle>{staff.firstName} {staff.lastName}</DialogTitle>
                            <DialogDescription>
                              {staff.position} - {staff.department}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                              <h4 className="font-semibold">{t('staff.basic_info')}</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>{t('staff.employee_id')}:</strong> {staff.employeeId}</div>
                                <div><strong>{t('staff.email')}:</strong> {staff.email}</div>
                                <div><strong>{t('staff.phone')}:</strong> {staff.phone}</div>
                                <div><strong>{t('staff.hire_date')}:</strong> {new Date(staff.hireDate).toLocaleDateString()}</div>
                                <div><strong>{t('staff.employment_type')}:</strong> {staff.employmentType}</div>
                                <div><strong>{t('staff.primary_location')}:</strong> {staff.primaryLocation}</div>
                                {staff.secondaryLocations.length > 0 && (
                                  <div><strong>{t('staff.secondary_locations')}:</strong> {staff.secondaryLocations.join(', ')}</div>
                                )}
                              </div>
                              
                              <h4 className="font-semibold">{t('staff.payroll_info')}</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>{t('staff.hourly_rate')}:</strong> ฿{staff.payroll.hourlyRate}</div>
                                <div><strong>{t('staff.monthly_hours')}:</strong> {staff.payroll.monthlyHours}</div>
                                <div><strong>{t('staff.monthly_pay')}:</strong> ฿{staff.payroll.monthlyPay.toLocaleString()}</div>
                                <div><strong>{t('staff.benefits')}:</strong> {staff.payroll.benefits.join(', ')}</div>
                              </div>
                            </div>

                            {/* Skills and Performance */}
                            <div className="space-y-4">
                              <h4 className="font-semibold">{t('staff.skills_certifications')}</h4>
                              <div className="space-y-2">
                                {staff.skills.map((skill) => (
                                  <div key={skill.id} className="flex items-center justify-between">
                                    <span className="text-sm">{skill.name}</span>
                                    <Badge className={getSkillLevelColor(skill.level)} size="sm">
                                      {skill.level}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                              
                              <h4 className="font-semibold">{t('staff.performance_breakdown')}</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>{t('staff.punctuality')}:</span>
                                  <span>{staff.performance.punctuality}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t('staff.productivity')}:</span>
                                  <span>{staff.performance.productivity}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t('staff.customer_service')}:</span>
                                  <span>{staff.performance.customerService}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t('staff.teamwork')}:</span>
                                  <span>{staff.performance.teamwork}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t('staff.compliance')}:</span>
                                  <span>{staff.performance.compliance}%</span>
                                </div>
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

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {locationSummaryData.map((location) => (
              <Card key={location.locationId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Building2 className="h-5 w-5 mr-2 text-[#E31B23]" />
                      {location.locationName}
                    </span>
                    <Badge variant="outline">
                      {location.totalStaff} staff
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {location.activeStaff}
                        </div>
                        <div className="text-sm text-gray-600">{t('staff.active_staff')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {location.avgPerformance.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">{t('staff.avg_performance')}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('staff.training_completion')}:</span>
                        <span>{location.avgTrainingCompletion.toFixed(1)}%</span>
                      </div>
                      <Progress value={location.avgTrainingCompletion} className="h-2" />
                    </div>
                    
                    {location.openPositions > 0 && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            {location.openPositions} {t('staff.open_positions')}
                          </span>
                        </div>
                        {location.urgentNeeds.length > 0 && (
                          <div className="text-sm text-yellow-700">
                            Urgent: {location.urgentNeeds.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BadgeCheck className="h-5 w-5 mr-2 text-purple-500" />
                {t('staff.skills_overview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['Culinary', 'Service', 'Management', 'Safety', 'Technology', 'Operations'].map((category) => {
                  const categorySkills = staffData.flatMap(staff => 
                    staff.skills.filter(skill => skill.category === category)
                  );
                  const avgLevel = categorySkills.length > 0 ? 
                    categorySkills.reduce((sum, skill) => {
                      const levelValue = skill.level === 'expert' ? 4 : 
                                         skill.level === 'advanced' ? 3 :
                                         skill.level === 'intermediate' ? 2 : 1;
                      return sum + levelValue;
                    }, 0) / categorySkills.length : 0;
                  
                  return (
                    <Card key={category} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{category}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{t('staff.total_skills')}:</span>
                            <span>{categorySkills.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>{t('staff.avg_level')}:</span>
                            <span>{avgLevel.toFixed(1)}/4</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>{t('staff.certified')}:</span>
                            <span>{categorySkills.filter(s => s.certified).length}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                {t('staff.staff_analytics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={locationSummaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="locationName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalStaff" fill="#E31B23" name={t('staff.total_staff')} />
                  <Bar dataKey="activeStaff" fill="#10B981" name={t('staff.active_staff')} />
                  <Bar dataKey="openPositions" fill="#F59E0B" name={t('staff.open_positions')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CrossLocationStaffManagement;