'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  AlertTriangle,
  Plus,
  Filter,
  Eye,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslationsDB } from '@/hooks/use-translations-db';
import { 
  Task, 
  TaskStatus, 
  TaskPriority, 
  TaskType,
  TaskCalendarParams 
} from '@/types/database';

interface TaskCalendarViewProps {
  locale: string;
  userId: string;
  restaurantId: string;
  className?: string;
  onTaskClick?: (task: Task) => void;
  onDateSelect?: (date: Date) => void;
}

type CalendarView = 'month' | 'week' | 'day';

// Mock calendar tasks data
const mockCalendarTasks: Task[] = [
  {
    id: '1',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'staff1',
    title: 'Morning prep checklist',
    title_fr: 'Liste de vérification de préparation matinale',
    description: 'Complete all morning preparation tasks',
    description_fr: 'Compléter toutes les tâches de préparation matinale',
    type: 'sop_execution' as TaskType,
    status: 'pending' as TaskStatus,
    priority: 'high' as TaskPriority,
    difficulty: 'intermediate',
    scheduled_date: '2025-07-28T07:00:00Z',
    due_date: '2025-07-28T09:00:00Z',
    estimated_duration_minutes: 120,
    prerequisite_task_ids: [],
    dependent_task_ids: [],
    prerequisite_skills: [],
    required_equipment: [],
    team_task: false,
    team_members: [],
    recurrence: 'daily',
    progress_percentage: 0,
    checklist_completed: 0,
    checklist_total: 8,
    escalation_level: 'none',
    created_at: '2025-07-27T20:00:00Z',
    updated_at: '2025-07-27T20:00:00Z'
  },
  {
    id: '2',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'staff2',
    title: 'Deep clean equipment',
    title_fr: 'Nettoyage en profondeur de l\'équipement',
    description: 'Weekly deep cleaning of kitchen equipment',
    description_fr: 'Nettoyage en profondeur hebdomadaire de l\'équipement de cuisine',
    type: 'cleaning' as TaskType,
    status: 'in_progress' as TaskStatus,
    priority: 'medium' as TaskPriority,
    difficulty: 'advanced',
    scheduled_date: '2025-07-28T14:00:00Z',
    due_date: '2025-07-28T17:00:00Z',
    estimated_duration_minutes: 180,
    prerequisite_task_ids: [],
    dependent_task_ids: [],
    prerequisite_skills: ['deep_cleaning'],
    required_equipment: ['cleaning_supplies'],
    team_task: true,
    team_members: ['staff3', 'staff4'],
    recurrence: 'weekly',
    progress_percentage: 35,
    checklist_completed: 3,
    checklist_total: 12,
    escalation_level: 'none',
    started_at: '2025-07-28T14:15:00Z',
    created_at: '2025-07-27T10:00:00Z',
    updated_at: '2025-07-28T14:30:00Z'
  },
  {
    id: '3',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'staff1',
    title: 'Inventory count - freezer',
    title_fr: 'Inventaire - congélateur',
    description: 'Monthly freezer inventory count and recording',
    description_fr: 'Inventaire mensuel du congélateur et enregistrement',
    type: 'inspection' as TaskType,
    status: 'pending' as TaskStatus,
    priority: 'medium' as TaskPriority,
    difficulty: 'beginner',
    scheduled_date: '2025-07-29T10:00:00Z',
    due_date: '2025-07-29T12:00:00Z',
    estimated_duration_minutes: 90,
    prerequisite_task_ids: [],
    dependent_task_ids: [],
    prerequisite_skills: ['inventory_management'],
    required_equipment: ['tablet', 'scanner'],
    team_task: false,
    team_members: [],
    recurrence: 'monthly',
    progress_percentage: 0,
    checklist_completed: 0,
    checklist_total: 6,
    escalation_level: 'none',
    created_at: '2025-07-25T15:00:00Z',
    updated_at: '2025-07-25T15:00:00Z'
  },
  {
    id: '4',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'staff2',
    title: 'Safety training session',
    title_fr: 'Session de formation sécurité',
    description: 'Quarterly safety training for all staff',
    description_fr: 'Formation sécurité trimestrielle pour tout le personnel',
    type: 'training' as TaskType,
    status: 'pending' as TaskStatus,
    priority: 'critical' as TaskPriority,
    difficulty: 'intermediate',
    scheduled_date: '2025-07-30T09:00:00Z',
    due_date: '2025-07-30T11:00:00Z',
    estimated_duration_minutes: 120,
    prerequisite_task_ids: [],
    dependent_task_ids: [],
    prerequisite_skills: [],
    required_equipment: ['projector', 'training_materials'],
    team_task: true,
    team_members: ['staff1', 'staff3', 'staff4', 'staff5'],
    recurrence: 'quarterly',
    progress_percentage: 0,
    checklist_completed: 0,
    checklist_total: 10,
    escalation_level: 'none',
    created_at: '2025-07-20T12:00:00Z',
    updated_at: '2025-07-20T12:00:00Z'
  }
];

export default function TaskCalendarView({
  locale,
  userId,
  restaurantId,
  className = '',
  onTaskClick,
  onDateSelect
}: TaskCalendarViewProps) {
  const { t } = useTranslationsDB();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus[]>(['pending', 'in_progress']);
  const [filterPriority, setFilterPriority] = useState<TaskPriority[]>([]);
  const [showTeamTasks, setShowTeamTasks] = useState(true);
  const [showMyTasks, setShowMyTasks] = useState(true);

  // Priority colors
  const priorityColors = {
    critical: '#DC2626',
    urgent: '#EA580C',
    high: '#D97706',
    medium: '#2563EB',
    low: '#6B7280'
  };

  const statusColors = {
    pending: '#6B7280',
    in_progress: '#2563EB',
    completed: '#059669',
    cancelled: '#DC2626',
    overdue: '#DC2626',
    delegated: '#7C3AED'
  };

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return mockCalendarTasks.filter(task => {
      if (filterStatus.length > 0 && !filterStatus.includes(task.status)) return false;
      if (filterPriority.length > 0 && !filterPriority.includes(task.priority)) return false;
      if (!showTeamTasks && task.team_task) return false;
      if (!showMyTasks && task.assigned_to === userId) return false;
      return true;
    });
  }, [mockCalendarTasks, filterStatus, filterPriority, showTeamTasks, showMyTasks, userId]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredTasks.filter(task => {
      if (!task.scheduled_date) return false;
      const taskDate = new Date(task.scheduled_date).toISOString().split('T')[0];
      return taskDate === dateStr;
    });
  };

  // Generate calendar days for month view
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateLoop = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const dayTasks = getTasksForDate(currentDateLoop);
      days.push({
        date: new Date(currentDateLoop),
        isCurrentMonth: currentDateLoop.getMonth() === month,
        isToday: currentDateLoop.toDateString() === new Date().toDateString(),
        tasks: dayTasks
      });
      currentDateLoop.setDate(currentDateLoop.getDate() + 1);
    }
    
    return days;
  };

  // Generate week days for week view
  const generateWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayTasks = getTasksForDate(date);
      
      days.push({
        date,
        isToday: date.toDateString() === new Date().toDateString(),
        tasks: dayTasks
      });
    }
    
    return days;
  };

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date for display
  const formatDateHeader = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()}-${endOfWeek.getDate()} ${startOfWeek.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`;
      } else {
        return `${startOfWeek.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} ${endOfWeek.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  // Task item component
  const TaskItem = ({ task, isCompact = false }: { task: Task; isCompact?: boolean }) => {
    const title = locale === 'fr' ? task.title_fr : task.title;
    const startTime = task.scheduled_date ? new Date(task.scheduled_date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
    
    return (
      <div
        className={`p-2 rounded border-l-2 cursor-pointer transition-colors hover:bg-gray-50 ${isCompact ? 'text-xs' : 'text-sm'}`}
        style={{ borderLeftColor: priorityColors[task.priority] }}
        onClick={() => onTaskClick?.(task)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-gray-900 ${isCompact ? 'text-xs' : 'text-sm'} truncate`}>
              {title}
            </p>
            {startTime && (
              <p className="text-gray-500 text-xs flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                {startTime}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {task.team_task && (
              <Users className="w-3 h-3 text-gray-400" />
            )}
            {task.status === 'overdue' && (
              <AlertTriangle className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>
      </div>
    );
  };

  const calendarDays = viewMode === 'month' ? generateCalendarDays() : generateWeekDays();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('tasks.calendar.title')}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigatePrevious}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="min-w-20"
                >
                  {t('tasks.calendar.today')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <h3 className="text-lg font-medium text-gray-700">
                {formatDateHeader()}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Selector */}
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as CalendarView)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{t('tasks.calendar.view.month')}</SelectItem>
                  <SelectItem value="week">{t('tasks.calendar.view.week')}</SelectItem>
                  <SelectItem value="day">{t('tasks.calendar.view.day')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Filters */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    {t('tasks.calendar.filters')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">{t('tasks.calendar.filter.status')}</h4>
                      <div className="space-y-2">
                        {(['pending', 'in_progress', 'completed'] as TaskStatus[]).map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={status}
                              checked={filterStatus.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilterStatus(prev => [...prev, status]);
                                } else {
                                  setFilterStatus(prev => prev.filter(s => s !== status));
                                }
                              }}
                            />
                            <label htmlFor={status} className="text-sm">
                              {t(`tasks.status.${status}`)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">{t('tasks.calendar.filter.priority')}</h4>
                      <div className="space-y-2">
                        {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => (
                          <div key={priority} className="flex items-center space-x-2">
                            <Checkbox
                              id={priority}
                              checked={filterPriority.includes(priority)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilterPriority(prev => [...prev, priority]);
                                } else {
                                  setFilterPriority(prev => prev.filter(p => p !== priority));
                                }
                              }}
                            />
                            <label htmlFor={priority} className="text-sm">
                              {t(`tasks.priority.${priority}`)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">{t('tasks.calendar.filter.type')}</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="my-tasks"
                            checked={showMyTasks}
                            onCheckedChange={setShowMyTasks}
                          />
                          <label htmlFor="my-tasks" className="text-sm">
                            {t('tasks.calendar.filter.my_tasks')}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="team-tasks"
                            checked={showTeamTasks}
                            onCheckedChange={setShowTeamTasks}
                          />
                          <label htmlFor="team-tasks" className="text-sm">
                            {t('tasks.calendar.filter.team_tasks')}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button className="bg-[#E31B23] hover:bg-[#E31B23]/90">
                <Plus className="w-4 h-4 mr-2" />
                {t('tasks.calendar.add_task')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <Card>
          <CardContent className="p-6">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <div key={index} className="p-2 text-center text-sm font-medium text-gray-500">
                  {t(`tasks.calendar.days.${day.toLowerCase()}`)}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`min-h-32 p-2 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${
                    day.isToday ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedDate(day.date);
                    onDateSelect?.(day.date);
                  }}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  } ${
                    day.isToday ? 'text-blue-600' : ''
                  }`}>
                    {day.date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {day.tasks.slice(0, 3).map((task) => (
                      <TaskItem key={task.id} task={task} isCompact />
                    ))}
                    {day.tasks.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{day.tasks.length - 3} {t('tasks.calendar.more')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-4">
              {calendarDays.map((day, index) => (
                <div key={index} className="space-y-2">
                  <div className={`text-center p-3 rounded-lg ${
                    day.isToday ? 'bg-blue-100 text-blue-900' : 'bg-gray-50'
                  }`}>
                    <div className="text-sm font-medium">
                      {day.date.toLocaleDateString(locale, { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-bold">
                      {day.date.getDate()}
                    </div>
                  </div>
                  
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {day.tasks.map((task) => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {currentDate.toLocaleDateString(locale, { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">{t('tasks.calendar.scheduled_tasks')}</h4>
                  <div className="space-y-3">
                    {getTasksForDate(currentDate).map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                    {getTasksForDate(currentDate).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>{t('tasks.calendar.no_tasks')}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">{t('tasks.calendar.task_summary')}</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold text-gray-900">
                            {getTasksForDate(currentDate).length}
                          </div>
                          <div className="text-sm text-gray-600">
                            {t('tasks.calendar.total_tasks')}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold text-red-600">
                            {getTasksForDate(currentDate).filter(t => t.priority === 'critical' || t.priority === 'urgent').length}
                          </div>
                          <div className="text-sm text-gray-600">
                            {t('tasks.calendar.urgent_tasks')}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Date Details Dialog */}
      {selectedDate && (
        <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {t('tasks.calendar.tasks_for_date')} {selectedDate.toLocaleDateString(locale)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {getTasksForDate(selectedDate).map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <TaskItem task={task} />
                  </CardContent>
                </Card>
              ))}
              
              {getTasksForDate(selectedDate).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t('tasks.calendar.no_tasks_date')}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}