'use client';

import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  ArrowRight, 
  ArrowDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  MoreVertical,
  Plus,
  Trash2,
  Edit,
  Link,
  Unlink,
  Eye,
  Layers,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useTranslationsDB } from '@/hooks/use-translations-db';
import { 
  Task, 
  TaskDependency,
  TaskStatus,
  TaskPriority 
} from '@/types/database';

interface TaskDependencyVisualizationProps {
  task: Task;
  locale: string;
  className?: string;
  onDependencyAdd?: (dependency: Omit<TaskDependency, 'id' | 'created_at'>) => void;
  onDependencyRemove?: (dependencyId: string) => void;
  onDependencyUpdate?: (dependencyId: string, updates: Partial<TaskDependency>) => void;
  onTaskClick?: (taskId: string) => void;
}

type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
type ViewMode = 'graph' | 'list' | 'timeline';

// Mock related tasks and dependencies
const mockRelatedTasks: Task[] = [
  {
    id: 'task-prep-001',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'staff1',
    title: 'Inventory check - dry goods',
    title_fr: 'Vérification inventaire - produits secs',
    description: 'Check and update dry goods inventory levels',
    description_fr: 'Vérifier et mettre à jour les niveaux d\'inventaire des produits secs',
    type: 'inspection',
    status: 'completed',
    priority: 'medium',
    difficulty: 'beginner',
    scheduled_date: '2025-07-28T06:00:00Z',
    due_date: '2025-07-28T07:00:00Z',
    estimated_duration_minutes: 60,
    actual_duration_minutes: 55,
    prerequisite_task_ids: [],
    dependent_task_ids: ['current-task'],
    prerequisite_skills: [],
    required_equipment: ['tablet', 'scanner'],
    team_task: false,
    team_members: [],
    recurrence: 'daily',
    progress_percentage: 100,
    checklist_completed: 8,
    checklist_total: 8,
    escalation_level: 'none',
    completed_at: '2025-07-28T06:55:00Z',
    created_at: '2025-07-27T20:00:00Z',
    updated_at: '2025-07-28T06:55:00Z'
  },
  {
    id: 'task-prep-002',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'staff2',
    title: 'Equipment safety check',
    title_fr: 'Vérification sécurité équipement',
    description: 'Daily safety inspection of kitchen equipment',
    description_fr: 'Inspection quotidienne de sécurité de l\'équipement de cuisine',
    type: 'inspection',
    status: 'completed',
    priority: 'high',
    difficulty: 'intermediate',
    scheduled_date: '2025-07-28T06:30:00Z',
    due_date: '2025-07-28T07:30:00Z',
    estimated_duration_minutes: 45,
    actual_duration_minutes: 40,
    prerequisite_task_ids: [],
    dependent_task_ids: ['current-task'],
    prerequisite_skills: ['safety_inspection'],
    required_equipment: ['checklist'],
    team_task: false,
    team_members: [],
    recurrence: 'daily',
    progress_percentage: 100,
    checklist_completed: 12,
    checklist_total: 12,
    escalation_level: 'none',
    completed_at: '2025-07-28T07:10:00Z',
    created_at: '2025-07-27T20:00:00Z',
    updated_at: '2025-07-28T07:10:00Z'
  },
  {
    id: 'task-service-001',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'staff3',
    title: 'Lunch service setup',
    title_fr: 'Configuration service déjeuner',
    description: 'Set up dining area and stations for lunch service',
    description_fr: 'Configurer la salle à manger et les postes pour le service déjeuner',
    type: 'sop_execution',
    status: 'pending',
    priority: 'high',
    difficulty: 'intermediate',
    scheduled_date: '2025-07-28T09:30:00Z',
    due_date: '2025-07-28T11:00:00Z',
    estimated_duration_minutes: 90,
    prerequisite_task_ids: ['current-task'],
    dependent_task_ids: [],
    prerequisite_skills: ['service_setup'],
    required_equipment: ['cleaning_supplies', 'table_settings'],
    team_task: true,
    team_members: ['staff4', 'staff5'],
    recurrence: 'daily',
    progress_percentage: 0,
    checklist_completed: 0,
    checklist_total: 15,
    escalation_level: 'none',
    created_at: '2025-07-27T20:00:00Z',
    updated_at: '2025-07-27T20:00:00Z'
  },
  {
    id: 'task-clean-001',
    restaurant_id: '123',
    created_by: 'manager1',
    assigned_to: 'staff4',
    title: 'Kitchen deep clean',
    title_fr: 'Nettoyage en profondeur cuisine',
    description: 'Complete deep cleaning of kitchen surfaces and equipment',
    description_fr: 'Nettoyage complet en profondeur des surfaces et équipements de cuisine',
    type: 'cleaning',
    status: 'pending',
    priority: 'medium',
    difficulty: 'advanced',
    scheduled_date: '2025-07-28T10:00:00Z',
    due_date: '2025-07-28T13:00:00Z',
    estimated_duration_minutes: 180,
    prerequisite_task_ids: ['current-task'],
    dependent_task_ids: [],
    prerequisite_skills: ['deep_cleaning', 'chemical_safety'],
    required_equipment: ['cleaning_chemicals', 'protective_gear'],
    team_task: true,
    team_members: ['staff5'],
    recurrence: 'weekly',
    progress_percentage: 0,
    checklist_completed: 0,
    checklist_total: 20,
    escalation_level: 'none',
    created_at: '2025-07-27T20:00:00Z',
    updated_at: '2025-07-27T20:00:00Z'
  }
];

const mockDependencies: TaskDependency[] = [
  {
    id: 'dep-001',
    prerequisite_task_id: 'task-prep-001',
    dependent_task_id: 'current-task',
    dependency_type: 'finish_to_start',
    lag_minutes: 0,
    is_critical: true,
    created_at: '2025-07-27T20:00:00Z'
  },
  {
    id: 'dep-002',
    prerequisite_task_id: 'task-prep-002',
    dependent_task_id: 'current-task',
    dependency_type: 'finish_to_start',
    lag_minutes: 15,
    is_critical: true,
    created_at: '2025-07-27T20:00:00Z'
  },
  {
    id: 'dep-003',
    prerequisite_task_id: 'current-task',
    dependent_task_id: 'task-service-001',
    dependency_type: 'finish_to_start',
    lag_minutes: 30,
    is_critical: true,
    created_at: '2025-07-27T20:00:00Z'
  },
  {
    id: 'dep-004',
    prerequisite_task_id: 'current-task',
    dependent_task_id: 'task-clean-001',
    dependency_type: 'start_to_start',
    lag_minutes: 60,
    is_critical: false,
    created_at: '2025-07-27T20:00:00Z'
  }
];

const dependencyTypeLabels = {
  finish_to_start: 'Finish to Start',
  start_to_start: 'Start to Start',
  finish_to_finish: 'Finish to Finish',
  start_to_finish: 'Start to Finish'
};

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  overdue: 'bg-red-100 text-red-800 border-red-300',
  delegated: 'bg-purple-100 text-purple-800 border-purple-300'
};

const priorityColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  critical: 'border-l-red-500',
  urgent: 'border-l-red-600'
};

export default function TaskDependencyVisualization({
  task,
  locale,
  className = '',
  onDependencyAdd,
  onDependencyRemove,
  onDependencyUpdate,
  onTaskClick
}: TaskDependencyVisualizationProps) {
  const { t } = useTranslationsDB();
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [dependencies, setDependencies] = useState<TaskDependency[]>(mockDependencies);
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [selectedDependencyType, setSelectedDependencyType] = useState<DependencyType>('finish_to_start');

  // Get task by ID
  const getTaskById = (taskId: string) => {
    if (taskId === 'current-task') return task;
    return mockRelatedTasks.find(t => t.id === taskId);
  };

  // Get task title
  const getTaskTitle = (task: Task | undefined) => {
    if (!task) return t('tasks.dependencies.unknown_task');
    return locale === 'fr' ? task.title_fr : task.title;
  };

  // Get dependencies for current task
  const taskDependencies = useMemo(() => {
    const filtered = dependencies.filter(dep => {
      if (showCriticalOnly && !dep.is_critical) return false;
      return dep.prerequisite_task_id === task.id || dep.dependent_task_id === task.id;
    });

    return {
      prerequisites: filtered.filter(dep => dep.dependent_task_id === task.id),
      dependents: filtered.filter(dep => dep.prerequisite_task_id === task.id)
    };
  }, [dependencies, task.id, showCriticalOnly]);

  // Check if task can start (all prerequisites completed)
  const canTaskStart = useMemo(() => {
    return taskDependencies.prerequisites.every(dep => {
      const prereqTask = getTaskById(dep.prerequisite_task_id);
      return prereqTask?.status === 'completed';
    });
  }, [taskDependencies.prerequisites]);

  // Get dependency status
  const getDependencyStatus = (dependency: TaskDependency) => {
    const prereqTask = getTaskById(dependency.prerequisite_task_id);
    const dependentTask = getTaskById(dependency.dependent_task_id);
    
    if (!prereqTask || !dependentTask) return 'unknown';
    
    if (prereqTask.status === 'completed') {
      if (dependentTask.status === 'pending') return 'ready';
      if (dependentTask.status === 'in_progress') return 'active';
      if (dependentTask.status === 'completed') return 'completed';
    }
    
    if (prereqTask.status === 'in_progress') return 'waiting';
    
    return 'blocked';
  };

  // Remove dependency
  const removeDependency = (dependencyId: string) => {
    setDependencies(prev => prev.filter(dep => dep.id !== dependencyId));
    onDependencyRemove?.(dependencyId);
  };

  // Add dependency
  const addDependency = (prerequisiteTaskId: string, dependentTaskId: string) => {
    const newDependency: Omit<TaskDependency, 'id' | 'created_at'> = {
      prerequisite_task_id: prerequisiteTaskId,
      dependent_task_id: dependentTaskId,
      dependency_type: selectedDependencyType,
      lag_minutes: 0,
      is_critical: true
    };

    const dependencyWithId: TaskDependency = {
      ...newDependency,
      id: `dep-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    setDependencies(prev => [...prev, dependencyWithId]);
    onDependencyAdd?.(newDependency);
    setShowAddDependency(false);
  };

  // Task node component
  const TaskNode = ({ taskData, isCurrentTask = false }: { taskData: Task; isCurrentTask?: boolean }) => {
    const title = getTaskTitle(taskData);
    const statusIcon = {
      pending: <Clock className="w-4 h-4" />,
      in_progress: <Play className="w-4 h-4" />,
      completed: <CheckCircle2 className="w-4 h-4" />,
      cancelled: <AlertTriangle className="w-4 h-4" />,
      overdue: <AlertTriangle className="w-4 h-4" />,
      delegated: <ArrowRight className="w-4 h-4" />
    };

    return (
      <div 
        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
          isCurrentTask ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        } ${priorityColors[taskData.priority]} border-l-4`}
        onClick={() => onTaskClick?.(taskData.id)}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
            {title}
          </h4>
          {isCurrentTask && (
            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 ml-2">
              {t('tasks.dependencies.current')}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <Badge className={`text-xs ${statusColors[taskData.status]}`}>
            {statusIcon[taskData.status]}
            <span className="ml-1">{t(`tasks.status.${taskData.status}`)}</span>
          </Badge>
          
          <div className="text-xs text-gray-500">
            {taskData.estimated_duration_minutes}m
          </div>
        </div>
        
        {taskData.team_task && (
          <Badge variant="outline" className="text-xs mt-2">
            {t('tasks.dependencies.team_task')}
          </Badge>
        )}
      </div>
    );
  };

  // Dependency arrow component
  const DependencyArrow = ({ dependency }: { dependency: TaskDependency }) => {
    const status = getDependencyStatus(dependency);
    const statusColor = {
      ready: 'text-green-500',
      active: 'text-blue-500',
      completed: 'text-gray-400',
      waiting: 'text-yellow-500',
      blocked: 'text-red-500',
      unknown: 'text-gray-300'
    };

    return (
      <div className={`flex items-center gap-2 ${statusColor[status]}`}>
        <ArrowRight className="w-4 h-4" />
        <div className="text-xs">
          {t(`tasks.dependencies.type.${dependency.dependency_type}`)}
          {dependency.lag_minutes > 0 && (
            <span className="ml-1">+{dependency.lag_minutes}m</span>
          )}
          {dependency.is_critical && (
            <Badge variant="outline" className="text-xs ml-1 text-red-600 border-red-300">
              {t('tasks.dependencies.critical')}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              {t('tasks.dependencies.title')}
            </CardTitle>
            
            <div className="flex items-center gap-3">
              {/* View Mode Selector */}
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="graph">{t('tasks.dependencies.view.graph')}</SelectItem>
                  <SelectItem value="list">{t('tasks.dependencies.view.list')}</SelectItem>
                  <SelectItem value="timeline">{t('tasks.dependencies.view.timeline')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Filters */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="critical-only"
                  checked={showCriticalOnly}
                  onCheckedChange={setShowCriticalOnly}
                />
                <label htmlFor="critical-only" className="text-sm">
                  {t('tasks.dependencies.filter.critical_only')}
                </label>
              </div>

              {/* Add Dependency */}
              <Dialog open={showAddDependency} onOpenChange={setShowAddDependency}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#E31B23] hover:bg-[#E31B23]/90">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('tasks.dependencies.add')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('tasks.dependencies.add_dependency')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t('tasks.dependencies.dependency_type')}
                      </label>
                      <Select value={selectedDependencyType} onValueChange={(value) => setSelectedDependencyType(value as DependencyType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(dependencyTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {t(`tasks.dependencies.type.${value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t('tasks.dependencies.select_task')}
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {mockRelatedTasks.map((relatedTask) => (
                          <Button
                            key={relatedTask.id}
                            variant="outline"
                            className="w-full justify-start h-auto p-3"
                            onClick={() => addDependency(relatedTask.id, task.id)}
                          >
                            <div className="text-left">
                              <p className="font-medium">{getTaskTitle(relatedTask)}</p>
                              <p className="text-sm text-gray-500">{relatedTask.type}</p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Task Readiness Status */}
          <div className={`p-4 rounded-lg border ${
            canTaskStart 
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center gap-2">
              {canTaskStart ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              )}
              <h3 className={`font-medium ${
                canTaskStart ? 'text-green-900' : 'text-orange-900'
              }`}>
                {canTaskStart 
                  ? t('tasks.dependencies.ready_to_start')
                  : t('tasks.dependencies.waiting_for_prerequisites')
                }
              </h3>
            </div>
            {!canTaskStart && (
              <p className="text-sm text-orange-700 mt-1">
                {t('tasks.dependencies.incomplete_prerequisites', { 
                  count: taskDependencies.prerequisites.filter(dep => 
                    getTaskById(dep.prerequisite_task_id)?.status !== 'completed'
                  ).length 
                })}
              </p>
            )}
          </div>

          {/* Graph View */}
          {viewMode === 'graph' && (
            <div className="space-y-8">
              {/* Prerequisites */}
              {taskDependencies.prerequisites.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    {t('tasks.dependencies.prerequisites')} ({taskDependencies.prerequisites.length})
                  </h4>
                  <div className="space-y-4">
                    {taskDependencies.prerequisites.map((dependency) => {
                      const prereqTask = getTaskById(dependency.prerequisite_task_id);
                      if (!prereqTask) return null;
                      
                      return (
                        <div key={dependency.id} className="flex items-center gap-4">
                          <div className="flex-1">
                            <TaskNode taskData={prereqTask} />
                          </div>
                          <DependencyArrow dependency={dependency} />
                          <div className="flex-1">
                            <TaskNode taskData={task} isCurrentTask />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => onTaskClick?.(prereqTask.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('tasks.dependencies.view_task')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => removeDependency(dependency.id)}
                                className="text-red-600"
                              >
                                <Unlink className="w-4 h-4 mr-2" />
                                {t('tasks.dependencies.remove')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dependents */}
              {taskDependencies.dependents.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    {t('tasks.dependencies.dependents')} ({taskDependencies.dependents.length})
                  </h4>
                  <div className="space-y-4">
                    {taskDependencies.dependents.map((dependency) => {
                      const dependentTask = getTaskById(dependency.dependent_task_id);
                      if (!dependentTask) return null;
                      
                      return (
                        <div key={dependency.id} className="flex items-center gap-4">
                          <div className="flex-1">
                            <TaskNode taskData={task} isCurrentTask />
                          </div>
                          <DependencyArrow dependency={dependency} />
                          <div className="flex-1">
                            <TaskNode taskData={dependentTask} />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => onTaskClick?.(dependentTask.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('tasks.dependencies.view_task')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => removeDependency(dependency.id)}
                                className="text-red-600"
                              >
                                <Unlink className="w-4 h-4 mr-2" />
                                {t('tasks.dependencies.remove')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {[...taskDependencies.prerequisites, ...taskDependencies.dependents].map((dependency) => {
                const prereqTask = getTaskById(dependency.prerequisite_task_id);
                const dependentTask = getTaskById(dependency.dependent_task_id);
                const status = getDependencyStatus(dependency);
                
                return (
                  <div key={dependency.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${
                          status === 'ready' ? 'bg-green-100 text-green-800' :
                          status === 'active' ? 'bg-blue-100 text-blue-800' :
                          status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {t(`tasks.dependencies.status.${status}`)}
                        </Badge>
                        
                        <Badge variant="outline" className="text-xs">
                          {t(`tasks.dependencies.type.${dependency.dependency_type}`)}
                        </Badge>
                        
                        {dependency.is_critical && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                            {t('tasks.dependencies.critical')}
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDependency(dependency.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">{getTaskTitle(prereqTask)}</span>
                        {' → '}
                        <span className="font-medium">{getTaskTitle(dependentTask)}</span>
                      </p>
                      
                      {dependency.lag_minutes > 0 && (
                        <p className="text-gray-500 mt-1">
                          {t('tasks.dependencies.lag_time')}: {dependency.lag_minutes} {t('tasks.dependencies.minutes')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {taskDependencies.prerequisites.length === 0 && taskDependencies.dependents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t('tasks.dependencies.no_dependencies')}</p>
                </div>
              )}
            </div>
          )}

          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <div className="space-y-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                
                <div className="space-y-6">
                  {/* Prerequisites */}
                  {taskDependencies.prerequisites.map((dependency, index) => {
                    const prereqTask = getTaskById(dependency.prerequisite_task_id);
                    if (!prereqTask) return null;
                    
                    return (
                      <div key={dependency.id} className="relative flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          prereqTask.status === 'completed' ? 'bg-green-500 border-green-500' :
                          prereqTask.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                          'bg-gray-300 border-gray-300'
                        }`}></div>
                        
                        <div className="flex-1">
                          <TaskNode taskData={prereqTask} />
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {prereqTask.scheduled_date && 
                            new Date(prereqTask.scheduled_date).toLocaleTimeString(locale, { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          }
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Current Task */}
                  <div className="relative flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-500 ring-4 ring-blue-100"></div>
                    <div className="flex-1">
                      <TaskNode taskData={task} isCurrentTask />
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.scheduled_date && 
                        new Date(task.scheduled_date).toLocaleTimeString(locale, { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      }
                    </div>
                  </div>
                  
                  {/* Dependents */}
                  {taskDependencies.dependents.map((dependency) => {
                    const dependentTask = getTaskById(dependency.dependent_task_id);
                    if (!dependentTask) return null;
                    
                    return (
                      <div key={dependency.id} className="relative flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          dependentTask.status === 'completed' ? 'bg-green-500 border-green-500' :
                          dependentTask.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                          canTaskStart ? 'bg-yellow-500 border-yellow-500' :
                          'bg-gray-300 border-gray-300'
                        }`}></div>
                        
                        <div className="flex-1">
                          <TaskNode taskData={dependentTask} />
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {dependentTask.scheduled_date && 
                            new Date(dependentTask.scheduled_date).toLocaleTimeString(locale, { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}