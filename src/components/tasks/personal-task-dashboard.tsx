'use client';

import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Pause, 
  Users, 
  Filter, 
  Sort3,
  Calendar,
  Star,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslationsDB } from '@/hooks/use-translations-db';
import { 
  Task, 
  TaskStatus, 
  TaskPriority, 
  TaskType, 
  TaskDashboardStats 
} from '@/types/database';

interface PersonalTaskDashboardProps {
  locale: string;
  userId: string;
  restaurantId: string;
  className?: string;
}

type SortOption = 'priority' | 'due_date' | 'created_at' | 'status' | 'progress';
type FilterStatus = 'all' | TaskStatus;
type ViewMode = 'grid' | 'list' | 'kanban';

// Mock data for demonstration - in production this would come from API
const mockTasks: Task[] = [
  {
    id: '1',
    restaurant_id: '123',
    created_by: 'user1',
    assigned_to: 'current-user',
    title: 'Clean and sanitize prep station',
    title_fr: 'Nettoyer et désinfecter le poste de préparation',
    description: 'Complete deep cleaning of main prep station including surfaces, equipment, and storage areas',
    description_fr: 'Nettoyage complet du poste de préparation principal incluant surfaces, équipements et zones de stockage',
    type: 'cleaning' as TaskType,
    status: 'in_progress' as TaskStatus,
    priority: 'high' as TaskPriority,
    difficulty: 'intermediate',
    sop_document_id: 'sop-cleaning-001',
    sop_category_id: 'cleaning',
    scheduled_date: '2025-07-28T08:00:00Z',
    due_date: '2025-07-28T10:00:00Z',
    estimated_duration_minutes: 45,
    actual_duration_minutes: 25,
    prerequisite_task_ids: [],
    dependent_task_ids: [],
    prerequisite_skills: ['basic_cleaning', 'food_safety'],
    required_equipment: ['sanitizer', 'cleaning_cloths', 'spray_bottles'],
    team_task: false,
    team_members: [],
    recurrence: 'daily',
    progress_percentage: 60,
    checklist_completed: 3,
    checklist_total: 5,
    escalation_level: 'none',
    started_at: '2025-07-28T08:15:00Z',
    last_activity_at: '2025-07-28T08:30:00Z',
    created_at: '2025-07-28T07:00:00Z',
    updated_at: '2025-07-28T08:30:00Z'
  },
  {
    id: '2',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'current-user',
    title: 'Complete food safety training module',
    title_fr: 'Terminer le module de formation sur la sécurité alimentaire',
    description: 'Review updated food safety protocols and complete assessment',
    description_fr: 'Réviser les protocoles de sécurité alimentaire mis à jour et compléter l\'évaluation',
    type: 'training' as TaskType,
    status: 'pending' as TaskStatus,
    priority: 'critical' as TaskPriority,
    difficulty: 'beginner',
    sop_document_id: 'sop-food-safety-001',
    sop_category_id: 'training',
    scheduled_date: '2025-07-28T14:00:00Z',
    due_date: '2025-07-29T17:00:00Z',
    estimated_duration_minutes: 90,
    prerequisite_task_ids: [],
    dependent_task_ids: [],
    prerequisite_skills: [],
    required_equipment: ['tablet', 'headphones'],
    team_task: false,
    team_members: [],
    recurrence: 'monthly',
    progress_percentage: 0,
    checklist_completed: 0,
    checklist_total: 8,
    escalation_level: 'none',
    created_at: '2025-07-27T09:00:00Z',
    updated_at: '2025-07-27T09:00:00Z'
  },
  {
    id: '3',
    restaurant_id: '123',
    created_by: 'user2',
    assigned_to: 'current-user',
    title: 'Team inventory count - dry storage',
    title_fr: 'Inventaire d\'équipe - stockage sec',
    description: 'Collaborate with team to count and record all dry storage inventory',
    description_fr: 'Collaborer avec l\'équipe pour compter et enregistrer tout l\'inventaire de stockage sec',
    type: 'inspection' as TaskType,
    status: 'completed' as TaskStatus,
    priority: 'medium' as TaskPriority,
    difficulty: 'intermediate',
    sop_document_id: 'sop-inventory-001',
    sop_category_id: 'inventory',
    scheduled_date: '2025-07-27T16:00:00Z',
    due_date: '2025-07-27T18:00:00Z',
    estimated_duration_minutes: 120,
    actual_duration_minutes: 105,
    prerequisite_task_ids: [],
    dependent_task_ids: [],
    prerequisite_skills: ['inventory_management'],
    required_equipment: ['tablet', 'scanner'],
    team_task: true,
    team_members: ['user3', 'user4'],
    recurrence: 'weekly',
    progress_percentage: 100,
    checklist_completed: 12,
    checklist_total: 12,
    escalation_level: 'none',
    started_at: '2025-07-27T16:00:00Z',
    completed_at: '2025-07-27T17:45:00Z',
    created_at: '2025-07-27T10:00:00Z',
    updated_at: '2025-07-27T17:45:00Z'
  }
];

const mockStats: TaskDashboardStats = {
  total_tasks: 15,
  pending_tasks: 8,
  in_progress_tasks: 3,
  completed_today: 4,
  overdue_tasks: 2,
  high_priority_tasks: 5,
  team_tasks: 6,
  my_tasks: 9,
  completion_rate: 73.5,
  average_completion_time: 67.5,
  escalated_tasks: 1
};

export default function PersonalTaskDashboard({ 
  locale, 
  userId, 
  restaurantId, 
  className = '' 
}: PersonalTaskDashboardProps) {
  const { t } = useTranslationsDB();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Priority color mapping for consistent UI
  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    urgent: 'bg-orange-100 text-orange-800 border-orange-200',
    high: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    overdue: 'bg-red-100 text-red-800',
    delegated: 'bg-purple-100 text-purple-800'
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = mockTasks.filter(task => {
      // Search filter
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !task.title_fr.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      
      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'due_date':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'progress':
          return b.progress_percentage - a.progress_percentage;
        default:
          return 0;
      }
    });

    return filtered;
  }, [mockTasks, searchQuery, sortBy, filterStatus]);

  const formatTimeRemaining = (dueDate: string | undefined) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) {
      return { text: t('tasks.overdue'), isOverdue: true };
    } else if (diffHours < 1) {
      return { text: `${diffMinutes}m`, isOverdue: false };
    } else if (diffHours < 24) {
      return { text: `${diffHours}h ${diffMinutes}m`, isOverdue: false };
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return { text: `${diffDays}d`, isOverdue: false };
    }
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const timeRemaining = formatTimeRemaining(task.due_date);
    const title = locale === 'fr' ? task.title_fr : task.title;
    const description = locale === 'fr' ? task.description_fr : task.description;

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
          task.priority === 'critical' ? 'border-l-red-500' :
          task.priority === 'urgent' ? 'border-l-orange-500' :
          task.priority === 'high' ? 'border-l-yellow-500' :
          task.priority === 'medium' ? 'border-l-blue-500' :
          'border-l-gray-500'
        }`}
        onClick={() => setSelectedTask(task)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                {title}
              </CardTitle>
              <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
            </div>
            <div className="flex flex-col items-end gap-2 ml-4">
              <Badge 
                variant="outline" 
                className={priorityColors[task.priority]}
              >
                {t(`tasks.priority.${task.priority}`)}
              </Badge>
              {task.team_task && (
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  <Users className="w-3 h-3 mr-1" />
                  {t('tasks.team')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {/* Status and Progress */}
            <div className="flex items-center justify-between">
              <Badge className={statusColors[task.status]}>
                {t(`tasks.status.${task.status}`)}
              </Badge>
              <div className="text-sm text-gray-600">
                {task.checklist_completed}/{task.checklist_total} {t('tasks.steps')}
              </div>
            </div>
            
            <Progress value={task.progress_percentage} className="h-2" />
            
            {/* Time and Duration Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                {task.estimated_duration_minutes && (
                  <div className="flex items-center text-gray-600">
                    <Timer className="w-4 h-4 mr-1" />
                    {Math.floor(task.estimated_duration_minutes / 60)}h {task.estimated_duration_minutes % 60}m
                  </div>
                )}
                
                {timeRemaining && (
                  <div className={`flex items-center ${
                    timeRemaining.isOverdue ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <Clock className="w-4 h-4 mr-1" />
                    {timeRemaining.text}
                  </div>
                )}
              </div>
              
              {task.status === 'in_progress' && (
                <Button size="sm" variant="outline" className="text-xs">
                  <Play className="w-3 h-3 mr-1" />
                  {t('tasks.continue')}
                </Button>
              )}
              
              {task.status === 'pending' && (
                <Button size="sm" className="text-xs bg-[#E31B23] hover:bg-[#E31B23]/90">
                  <Play className="w-3 h-3 mr-1" />
                  {t('tasks.start')}
                </Button>
              )}
            </div>

            {/* SOP Integration */}
            {task.sop_document_id && (
              <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {t('tasks.sop_linked')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('tasks.stats.total')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockStats.total_tasks}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('tasks.stats.in_progress')}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {mockStats.in_progress_tasks}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('tasks.stats.completed_today')}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {mockStats.completed_today}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('tasks.stats.overdue')}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {mockStats.overdue_tasks}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Input
                placeholder={t('tasks.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('tasks.filter.all')}</SelectItem>
                  <SelectItem value="pending">{t('tasks.status.pending')}</SelectItem>
                  <SelectItem value="in_progress">{t('tasks.status.in_progress')}</SelectItem>
                  <SelectItem value="completed">{t('tasks.status.completed')}</SelectItem>
                  <SelectItem value="overdue">{t('tasks.status.overdue')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">{t('tasks.sort.priority')}</SelectItem>
                  <SelectItem value="due_date">{t('tasks.sort.due_date')}</SelectItem>
                  <SelectItem value="created_at">{t('tasks.sort.created_at')}</SelectItem>
                  <SelectItem value="status">{t('tasks.sort.status')}</SelectItem>
                  <SelectItem value="progress">{t('tasks.sort.progress')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                {t('tasks.view.grid')}
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('list')}
              >
                {t('tasks.view.list')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Tabs */}
      <Tabs defaultValue="my-tasks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="my-tasks">{t('tasks.tabs.my_tasks')}</TabsTrigger>
          <TabsTrigger value="team-tasks">{t('tasks.tabs.team_tasks')}</TabsTrigger>
          <TabsTrigger value="urgent">{t('tasks.tabs.urgent')}</TabsTrigger>
          <TabsTrigger value="due-today">{t('tasks.tabs.due_today')}</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team-tasks">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedTasks.filter(task => task.team_task).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="urgent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedTasks.filter(task => 
              task.priority === 'critical' || task.priority === 'urgent'
            ).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="due-today">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedTasks.filter(task => {
              if (!task.due_date) return false;
              const today = new Date().toISOString().split('T')[0];
              const dueDate = new Date(task.due_date).toISOString().split('T')[0];
              return today === dueDate;
            }).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredAndSortedTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('tasks.empty.title')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('tasks.empty.description')}
            </p>
            <Button className="bg-[#E31B23] hover:bg-[#E31B23]/90">
              {t('tasks.empty.action')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}