/**
 * Training Schedule Management Component
 * Comprehensive scheduling tools for training managers
 * Features calendar integration, automated scheduling, conflict resolution,
 * bulk operations, and attendance tracking
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar,
  CalendarDays,
  Clock,
  Users,
  UserPlus,
  UserMinus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Settings,
  Bell,
  BellOff,
  Send,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Timer,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Star,
  BookOpen,
  GraduationCap,
  Briefcase,
  Coffee,
  Home,
  Building,
  Phone,
  Mail,
  MessageSquare,
  Video,
  FileText,
  Image,
  Link,
  Tag,
  Flag,
  Bookmark,
  Share2,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarContent, AvatarFallback } from '@/components/ui/avatar';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

// Training schedule interfaces
interface TrainingSchedule {
  id: string;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  moduleId: string;
  moduleName: string;
  instructorId: string;
  instructorName: string;
  
  // Scheduling
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  
  // Location and setup
  location: string;
  locationDetails?: string;
  capacity: number;
  isVirtual: boolean;
  meetingLink?: string;
  equipmentRequired: string[];
  materialsRequired: string[];
  
  // Participants
  enrolledUsers: ScheduledUser[];
  waitlistUsers: ScheduledUser[];
  maxEnrollment: number;
  autoEnroll: boolean;
  enrollmentDeadline?: string;
  
  // Status and tracking
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  completion: number;
  attendanceTracked: boolean;
  certificatesIssued: number;
  
  // Notifications
  notificationsEnabled: boolean;
  reminderSchedule: ReminderSchedule[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  actualDuration?: number;
  cost?: number;
  budget?: number;
}

interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  interval: number;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number;
  endDate?: string;
  maxOccurrences?: number;
}

interface ScheduledUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  enrollmentDate: string;
  status: 'enrolled' | 'attended' | 'completed' | 'no_show' | 'cancelled';
  completionScore?: number;
  certificateIssued?: boolean;
  feedback?: string;
  notes?: string;
}

interface ReminderSchedule {
  id: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  timing: 'immediate' | '1_hour' | '1_day' | '3_days' | '1_week';
  message: string;
  message_fr: string;
  enabled: boolean;
}

interface ScheduleConflict {
  type: 'instructor' | 'participant' | 'location' | 'resource';
  description: string;
  conflictingScheduleId: string;
  severity: 'warning' | 'error';
  suggestions: string[];
}

interface ScheduleFilter {
  dateRange: { start: string; end: string };
  instructors: string[];
  modules: string[];
  departments: string[];
  locations: string[];
  status: string[];
  priorities: string[];
  tags: string[];
  searchQuery: string;
}

interface ScheduleMetrics {
  totalSchedules: number;
  upcomingSchedules: number;
  completedSchedules: number;
  totalEnrollments: number;
  averageAttendance: number;
  completionRate: number;
  certificatesIssued: number;
  totalCost: number;
  utilizationRate: number;
}

interface TrainingScheduleManagementProps {
  className?: string;
  onScheduleSelect?: (schedule: TrainingSchedule) => void;
  onScheduleCreate?: (schedule: Partial<TrainingSchedule>) => void;
  onScheduleUpdate?: (id: string, updates: Partial<TrainingSchedule>) => void;
  onScheduleDelete?: (id: string) => void;
}

export function TrainingScheduleManagement({
  className,
  onScheduleSelect,
  onScheduleCreate,
  onScheduleUpdate,
  onScheduleDelete
}: TrainingScheduleManagementProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [schedules, setSchedules] = useState<TrainingSchedule[]>([]);
  const [metrics, setMetrics] = useState<ScheduleMetrics>({
    totalSchedules: 0,
    upcomingSchedules: 0,
    completedSchedules: 0,
    totalEnrollments: 0,
    averageAttendance: 0,
    completionRate: 0,
    certificatesIssued: 0,
    totalCost: 0,
    utilizationRate: 0
  });
  
  const [selectedSchedule, setSelectedSchedule] = useState<TrainingSchedule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showBulkActionsDialog, setShowBulkActionsDialog] = useState(false);
  
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'timeline'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [filters, setFilters] = useState<ScheduleFilter>({
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    instructors: [],
    modules: [],
    departments: [],
    locations: [],
    status: [],
    priorities: [],
    tags: [],
    searchQuery: ''
  });
  
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Mock data for demonstration
  const mockSchedules: TrainingSchedule[] = useMemo(() => [
    {
      id: '1',
      title: 'Food Safety Fundamentals',
      title_fr: 'Principes de base de la sécurité alimentaire',
      description: 'Comprehensive training on food safety protocols',
      description_fr: 'Formation complète sur les protocoles de sécurité alimentaire',
      moduleId: 'module-1',
      moduleName: 'Food Safety',
      instructorId: 'instructor-1',
      instructorName: 'Chef Laurent Dubois',
      startDate: '2024-02-15',
      endDate: '2024-02-15',
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'Asia/Bangkok',
      isRecurring: false,
      location: 'Training Room A',
      locationDetails: 'Main Floor, Equipment Available',
      capacity: 20,
      isVirtual: false,
      equipmentRequired: ['Projector', 'Whiteboard', 'Laptops'],
      materialsRequired: ['Workbook', 'Certificates'],
      enrolledUsers: [],
      waitlistUsers: [],
      maxEnrollment: 20,
      autoEnroll: false,
      status: 'scheduled',
      completion: 0,
      attendanceTracked: true,
      certificatesIssued: 0,
      notificationsEnabled: true,
      reminderSchedule: [],
      createdBy: 'manager-1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      tags: ['mandatory', 'certification'],
      priority: 'high',
      estimatedDuration: 480,
      cost: 15000
    },
    {
      id: '2',
      title: 'Customer Service Excellence',
      title_fr: 'Excellence du service client',
      description: 'Advanced customer service techniques',
      description_fr: 'Techniques avancées de service client',
      moduleId: 'module-2',
      moduleName: 'Customer Service',
      instructorId: 'instructor-2',
      instructorName: 'Marie Tran',
      startDate: '2024-02-20',
      endDate: '2024-02-21',
      startTime: '13:00',
      endTime: '17:00',
      timezone: 'Asia/Bangkok',
      isRecurring: true,
      recurrencePattern: {
        type: 'monthly',
        interval: 1,
        maxOccurrences: 12
      },
      location: 'Virtual',
      isVirtual: true,
      meetingLink: 'https://meet.krongthai.com/training-2',
      capacity: 50,
      equipmentRequired: [],
      materialsRequired: ['Digital Workbook'],
      enrolledUsers: [],
      waitlistUsers: [],
      maxEnrollment: 50,
      autoEnroll: true,
      status: 'scheduled',
      completion: 0,
      attendanceTracked: true,
      certificatesIssued: 0,
      notificationsEnabled: true,
      reminderSchedule: [],
      createdBy: 'manager-1',
      createdAt: '2024-01-10T14:00:00Z',
      updatedAt: '2024-01-10T14:00:00Z',
      tags: ['soft-skills', 'recurring'],
      priority: 'medium',
      estimatedDuration: 240,
      cost: 8000
    }
  ], []);

  // Load schedules
  useEffect(() => {
    const loadSchedules = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSchedules(mockSchedules);
        
        // Calculate metrics
        const totalSchedules = mockSchedules.length;
        const upcomingSchedules = mockSchedules.filter(s => s.status === 'scheduled').length;
        const completedSchedules = mockSchedules.filter(s => s.status === 'completed').length;
        
        setMetrics({
          totalSchedules,
          upcomingSchedules,
          completedSchedules,
          totalEnrollments: mockSchedules.reduce((sum, s) => sum + s.enrolledUsers.length, 0),
          averageAttendance: 87,
          completionRate: 92,
          certificatesIssued: mockSchedules.reduce((sum, s) => sum + s.certificatesIssued, 0),
          totalCost: mockSchedules.reduce((sum, s) => sum + (s.cost || 0), 0),
          utilizationRate: 78
        });
      } catch (error) {
        console.error('Failed to load schedules:', error);
        toast({
          title: t('error.load_failed'),
          description: t('error.schedule_load_failed'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedules();
  }, [mockSchedules, t]);

  // Filter schedules based on current filters
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // Date range filter
      const scheduleDate = new Date(schedule.startDate);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      if (scheduleDate < startDate || scheduleDate > endDate) return false;
      
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!schedule.title.toLowerCase().includes(query) &&
            !schedule.title_fr.toLowerCase().includes(query) &&
            !schedule.moduleName.toLowerCase().includes(query) &&
            !schedule.instructorName.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(schedule.status)) {
        return false;
      }
      
      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(schedule.priority)) {
        return false;
      }
      
      // Tags filter
      if (filters.tags.length > 0 && !filters.tags.some(tag => schedule.tags.includes(tag))) {
        return false;
      }
      
      return true;
    });
  }, [schedules, filters]);

  // Handle schedule creation
  const handleCreateSchedule = useCallback(async (scheduleData: Partial<TrainingSchedule>) => {
    try {
      setIsLoading(true);
      
      // Check for conflicts
      const newConflicts = await checkScheduleConflicts(scheduleData);
      if (newConflicts.length > 0) {
        setConflicts(newConflicts);
        setShowConflictDialog(true);
        return;
      }
      
      // Create schedule
      const newSchedule: TrainingSchedule = {
        id: `schedule-${Date.now()}`,
        title: scheduleData.title || '',
        title_fr: scheduleData.title_fr || '',
        description: scheduleData.description,
        description_fr: scheduleData.description_fr,
        moduleId: scheduleData.moduleId || '',
        moduleName: scheduleData.moduleName || '',
        instructorId: scheduleData.instructorId || '',
        instructorName: scheduleData.instructorName || '',
        startDate: scheduleData.startDate || '',
        endDate: scheduleData.endDate || '',
        startTime: scheduleData.startTime || '09:00',
        endTime: scheduleData.endTime || '17:00',
        timezone: scheduleData.timezone || 'Asia/Bangkok',
        isRecurring: scheduleData.isRecurring || false,
        recurrencePattern: scheduleData.recurrencePattern,
        location: scheduleData.location || '',
        locationDetails: scheduleData.locationDetails,
        capacity: scheduleData.capacity || 20,
        isVirtual: scheduleData.isVirtual || false,
        meetingLink: scheduleData.meetingLink,
        equipmentRequired: scheduleData.equipmentRequired || [],
        materialsRequired: scheduleData.materialsRequired || [],
        enrolledUsers: [],
        waitlistUsers: [],
        maxEnrollment: scheduleData.maxEnrollment || 20,
        autoEnroll: scheduleData.autoEnroll || false,
        enrollmentDeadline: scheduleData.enrollmentDeadline,
        status: 'draft',
        completion: 0,
        attendanceTracked: scheduleData.attendanceTracked || true,
        certificatesIssued: 0,
        notificationsEnabled: scheduleData.notificationsEnabled || true,
        reminderSchedule: scheduleData.reminderSchedule || [],
        createdBy: 'current-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: scheduleData.tags || [],
        priority: scheduleData.priority || 'medium',
        estimatedDuration: scheduleData.estimatedDuration || 480,
        actualDuration: scheduleData.actualDuration,
        cost: scheduleData.cost,
        budget: scheduleData.budget
      };
      
      setSchedules(prev => [...prev, newSchedule]);
      setShowCreateDialog(false);
      onScheduleCreate?.(newSchedule);
      
      toast({
        title: t('training.schedule_created'),
        description: t('training.schedule_created_desc', { title: newSchedule.title }),
      });
    } catch (error) {
      console.error('Failed to create schedule:', error);
      toast({
        title: t('error.create_failed'),
        description: t('error.schedule_create_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onScheduleCreate, t]);

  // Check for schedule conflicts
  const checkScheduleConflicts = async (scheduleData: Partial<TrainingSchedule>): Promise<ScheduleConflict[]> => {
    // Simulate conflict checking
    const conflicts: ScheduleConflict[] = [];
    
    // Check instructor availability
    const instructorConflicts = schedules.filter(s => 
      s.instructorId === scheduleData.instructorId &&
      s.startDate === scheduleData.startDate &&
      s.status !== 'cancelled'
    );
    
    if (instructorConflicts.length > 0) {
      conflicts.push({
        type: 'instructor',
        description: t('training.instructor_conflict', { name: scheduleData.instructorName }),
        conflictingScheduleId: instructorConflicts[0].id,
        severity: 'error',
        suggestions: [
          t('training.suggest_different_time'),
          t('training.suggest_different_instructor')
        ]
      });
    }
    
    // Check location availability for non-virtual sessions
    if (!scheduleData.isVirtual && scheduleData.location) {
      const locationConflicts = schedules.filter(s => 
        s.location === scheduleData.location &&
        s.startDate === scheduleData.startDate &&
        s.status !== 'cancelled' &&
        !s.isVirtual
      );
      
      if (locationConflicts.length > 0) {
        conflicts.push({
          type: 'location',
          description: t('training.location_conflict', { location: scheduleData.location }),
          conflictingScheduleId: locationConflicts[0].id,
          severity: 'warning',
          suggestions: [
            t('training.suggest_different_location'),
            t('training.suggest_virtual_session')
          ]
        });
      }
    }
    
    return conflicts;
  };

  // Handle bulk operations
  const handleBulkOperation = useCallback(async (operation: string, options?: any) => {
    const selectedIds = Array.from(selectedSchedules);
    if (selectedIds.length === 0) return;
    
    try {
      setIsLoading(true);
      
      switch (operation) {
        case 'cancel':
          setSchedules(prev => prev.map(s => 
            selectedIds.includes(s.id) ? { ...s, status: 'cancelled' as const } : s
          ));
          toast({
            title: t('training.schedules_cancelled'),
            description: t('training.schedules_cancelled_desc', { count: selectedIds.length }),
          });
          break;
          
        case 'duplicate':
          const duplicates = schedules
            .filter(s => selectedIds.includes(s.id))
            .map(s => ({
              ...s,
              id: `${s.id}-copy-${Date.now()}`,
              title: `${s.title} (Copy)`,
              title_fr: `${s.title_fr} (Copie)`,
              status: 'draft' as const,
              enrolledUsers: [],
              waitlistUsers: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }));
          
          setSchedules(prev => [...prev, ...duplicates]);
          toast({
            title: t('training.schedules_duplicated'),
            description: t('training.schedules_duplicated_desc', { count: selectedIds.length }),
          });
          break;
          
        case 'export':
          // Simulate export
          toast({
            title: t('training.export_started'),
            description: t('training.export_started_desc'),
          });
          break;
      }
      
      setSelectedSchedules(new Set());
      setShowBulkActionsDialog(false);
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast({
        title: t('error.bulk_operation_failed'),
        description: t('error.bulk_operation_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchedules, schedules, t]);

  // Render schedule status badge
  const renderStatusBadge = (status: TrainingSchedule['status']) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'default',
      in_progress: 'default',
      completed: 'default',
      cancelled: 'destructive'
    } as const;
    
    const colors = {
      draft: 'text-gray-600',
      scheduled: 'text-blue-600',
      in_progress: 'text-orange-600',
      completed: 'text-green-600',
      cancelled: 'text-red-600'
    };
    
    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {t(`training.status_${status}`)}
      </Badge>
    );
  };

  // Render priority badge
  const renderPriorityBadge = (priority: TrainingSchedule['priority']) => {
    const variants = {
      low: 'outline',
      medium: 'secondary',
      high: 'default',
      critical: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[priority]} className="text-xs">
        {t(`training.priority_${priority}`)}
      </Badge>
    );
  };

  // Render schedule list view
  const renderListView = () => (
    <div className="space-y-4">
      {filteredSchedules.map((schedule) => (
        <Card 
          key={schedule.id}
          className={cn(
            "hover:shadow-md transition-shadow cursor-pointer",
            selectedSchedules.has(schedule.id) && "ring-2 ring-krong-red"
          )}
          onClick={() => setSelectedSchedule(schedule)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={selectedSchedules.has(schedule.id)}
                  onCheckedChange={(checked) => {
                    const newSelected = new Set(selectedSchedules);
                    if (checked) {
                      newSelected.add(schedule.id);
                    } else {
                      newSelected.delete(schedule.id);
                    }
                    setSelectedSchedules(newSelected);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold truncate">
                      {locale === 'fr' ? schedule.title_fr : schedule.title}
                    </h3>
                    {renderStatusBadge(schedule.status)}
                    {renderPriorityBadge(schedule.priority)}
                    {schedule.isRecurring && (
                      <Badge variant="outline" className="text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {t('training.recurring')}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                    <span className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{schedule.moduleName}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <GraduationCap className="w-4 h-4" />
                      <span>{schedule.instructorName}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(schedule.startDate).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{schedule.startTime} - {schedule.endTime}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      {schedule.isVirtual ? (
                        <>
                          <Video className="w-4 h-4" />
                          <span>{t('training.virtual')}</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span>{schedule.location}</span>
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>
                        {schedule.enrolledUsers.length}/{schedule.maxEnrollment} {t('training.enrolled')}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Activity className="w-4 h-4" />
                      <span>{Math.round(schedule.completion)}% {t('training.complete')}</span>
                    </span>
                    {schedule.cost && (
                      <span className="flex items-center space-x-1">
                        <Tag className="w-4 h-4" />
                        <span>฿{schedule.cost.toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                  
                  {schedule.tags.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      {schedule.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setSelectedSchedule(schedule);
                    setShowEditDialog(true);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    {t('common.duplicate')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Users className="w-4 h-4 mr-2" />
                    {t('training.manage_participants')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell className="w-4 h-4 mr-2" />
                    {t('training.send_notification')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    {t('training.export_schedule')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {filteredSchedules.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('training.no_schedules')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('training.no_schedules_desc')}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('training.create_schedule')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <CalendarDays className="w-8 h-8 mr-3 text-krong-red" />
            {t('training.schedule_management')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('training.schedule_management_desc')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            {t('common.filters')}
          </Button>
          
          {selectedSchedules.size > 0 && (
            <Button variant="outline" onClick={() => setShowBulkActionsDialog(true)}>
              <Settings className="w-4 h-4 mr-2" />
              {t('training.bulk_actions')} ({selectedSchedules.size})
            </Button>
          )}
          
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('training.create_schedule')}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.total_schedules')}</p>
                <div className="text-2xl font-bold">{metrics.totalSchedules}</div>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.upcoming_schedules')}</p>
                <div className="text-2xl font-bold">{metrics.upcomingSchedules}</div>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.total_enrollments')}</p>
                <div className="text-2xl font-bold">{metrics.totalEnrollments}</div>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('training.average_attendance')}</p>
                <div className="text-2xl font-bold">{metrics.averageAttendance}%</div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              {t('common.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>{t('common.search')}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    placeholder={t('training.search_schedules')}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label>{t('training.status')}</Label>
                <Select
                  value={filters.status[0] || ''}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    status: value ? [value] : [] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('training.all_status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('training.all_status')}</SelectItem>
                    <SelectItem value="draft">{t('training.status_draft')}</SelectItem>
                    <SelectItem value="scheduled">{t('training.status_scheduled')}</SelectItem>
                    <SelectItem value="in_progress">{t('training.status_in_progress')}</SelectItem>
                    <SelectItem value="completed">{t('training.status_completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('training.status_cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t('training.priority')}</Label>
                <Select
                  value={filters.priorities[0] || ''}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    priorities: value ? [value] : [] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('training.all_priorities')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('training.all_priorities')}</SelectItem>
                    <SelectItem value="low">{t('training.priority_low')}</SelectItem>
                    <SelectItem value="medium">{t('training.priority_medium')}</SelectItem>
                    <SelectItem value="high">{t('training.priority_high')}</SelectItem>
                    <SelectItem value="critical">{t('training.priority_critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t('training.date_range')}</Label>
                <div className="flex space-x-2">
                  <Input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                  />
                  <Input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  dateRange: {
                    start: new Date().toISOString().split('T')[0],
                    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  },
                  instructors: [],
                  modules: [],
                  departments: [],
                  locations: [],
                  status: [],
                  priorities: [],
                  tags: [],
                  searchQuery: ''
                })}
              >
                {t('common.clear_filters')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Label>{t('training.view_mode')}:</Label>
          <div className="flex border rounded-lg">
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              {t('training.list_view')}
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setViewMode('calendar')}
              className="rounded-none border-x"
            >
              <Calendar className="w-4 h-4 mr-1" />
              {t('training.calendar_view')}
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              onClick={() => setViewMode('timeline')}
              className="rounded-l-none"
            >
              <Activity className="w-4 h-4 mr-1" />
              {t('training.timeline_view')}
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Views */}
      {viewMode === 'list' && renderListView()}
      
      {viewMode === 'calendar' && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('training.calendar_view')}</h3>
              <p className="text-muted-foreground">
                {t('training.calendar_view_coming_soon')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {viewMode === 'timeline' && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('training.timeline_view')}</h3>
              <p className="text-muted-foreground">
                {t('training.timeline_view_coming_soon')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Schedule Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              {t('training.create_schedule')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center py-8">
              <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('training.schedule_creation')}</h3>
              <p className="text-muted-foreground">
                {t('training.schedule_creation_form_coming_soon')}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled>
              {t('training.create_schedule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkActionsDialog} onOpenChange={setShowBulkActionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              {t('training.bulk_actions')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('training.bulk_actions_desc', { count: selectedSchedules.size })}
            </p>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleBulkOperation('cancel')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t('training.cancel_schedules')}
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleBulkOperation('duplicate')}
              >
                <Copy className="w-4 h-4 mr-2" />
                {t('training.duplicate_schedules')}
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleBulkOperation('export')}
              >
                <Download className="w-4 h-4 mr-2" />
                {t('training.export_schedules')}
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkActionsDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TrainingScheduleManagement;