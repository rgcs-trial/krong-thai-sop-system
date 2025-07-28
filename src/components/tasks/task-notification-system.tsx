'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  MessageSquare,
  X,
  Eye,
  ArrowRight,
  Calendar,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useTranslationsDB } from '@/hooks/use-translations-db';
import { 
  TaskNotification, 
  TaskNotificationType,
  Task 
} from '@/types/database';

interface TaskNotificationSystemProps {
  locale: string;
  userId: string;
  restaurantId: string;
  className?: string;
  onNotificationClick?: (notification: TaskNotification) => void;
}

// Mock notifications data
const mockNotifications: TaskNotification[] = [
  {
    id: '1',
    task_id: 'task-001',
    user_id: 'current-user',
    type: 'task_assigned',
    title: 'New Task Assigned',
    title_fr: 'Nouvelle tâche assignée',
    message: 'You have been assigned to clean and sanitize prep station',
    message_fr: 'Vous avez été assigné pour nettoyer et désinfecter le poste de préparation',
    scheduled_for: '2025-07-28T08:00:00Z',
    sent_at: '2025-07-28T07:55:00Z',
    is_dismissed: false,
    priority: 'high',
    action_url: '/tasks/task-001',
    created_at: '2025-07-28T07:55:00Z'
  },
  {
    id: '2',
    task_id: 'task-002',
    user_id: 'current-user',
    type: 'task_due_soon',
    title: 'Task Due Soon',
    title_fr: 'Tâche bientôt due',
    message: 'Food safety training is due in 2 hours',
    message_fr: 'La formation sur la sécurité alimentaire est due dans 2 heures',
    scheduled_for: '2025-07-28T12:00:00Z',
    sent_at: '2025-07-28T12:00:00Z',
    is_dismissed: false,
    priority: 'urgent',
    action_url: '/tasks/task-002',
    created_at: '2025-07-28T12:00:00Z'
  },
  {
    id: '3',
    task_id: 'task-003',
    user_id: 'current-user',
    type: 'task_overdue',
    title: 'Task Overdue',
    title_fr: 'Tâche en retard',
    message: 'Equipment maintenance check is overdue by 3 hours',
    message_fr: 'La vérification de maintenance de l\'équipement est en retard de 3 heures',
    scheduled_for: '2025-07-28T09:00:00Z',
    sent_at: '2025-07-28T12:00:00Z',
    is_dismissed: false,
    priority: 'urgent',
    action_url: '/tasks/task-003',
    created_at: '2025-07-28T12:00:00Z'
  },
  {
    id: '4',
    task_id: 'task-004',
    user_id: 'current-user',
    type: 'comment_added',
    title: 'New Comment',
    title_fr: 'Nouveau commentaire',
    message: 'Manager added feedback on inventory count task',
    message_fr: 'Le gestionnaire a ajouté des commentaires sur la tâche de comptage d\'inventaire',
    sent_at: '2025-07-28T11:30:00Z',
    read_at: '2025-07-28T11:45:00Z',
    is_dismissed: false,
    priority: 'medium',
    action_url: '/tasks/task-004#comments',
    created_at: '2025-07-28T11:30:00Z'
  },
  {
    id: '5',
    task_id: 'task-005',
    user_id: 'current-user',
    type: 'team_member_added',
    title: 'Added to Team Task',
    title_fr: 'Ajouté à une tâche d\'équipe',
    message: 'You\'ve been added to deep cleaning team for closing procedures',
    message_fr: 'Vous avez été ajouté à l\'équipe de nettoyage en profondeur pour les procédures de fermeture',
    sent_at: '2025-07-28T10:15:00Z',
    read_at: '2025-07-28T10:20:00Z',
    is_dismissed: true,
    priority: 'medium',
    action_url: '/tasks/task-005',
    created_at: '2025-07-28T10:15:00Z'
  },
  {
    id: '6',
    task_id: 'task-006',
    user_id: 'current-user',
    type: 'task_completed',
    title: 'Task Completed',
    title_fr: 'Tâche terminée',
    message: 'Morning prep checklist has been completed successfully',
    message_fr: 'La liste de vérification de préparation matinale a été terminée avec succès',
    sent_at: '2025-07-28T09:45:00Z',
    read_at: '2025-07-28T09:50:00Z',
    is_dismissed: true,
    priority: 'low',
    action_url: '/tasks/task-006',
    created_at: '2025-07-28T09:45:00Z'
  }
];

export default function TaskNotificationSystem({
  locale,
  userId,
  restaurantId,
  className = '',
  onNotificationClick
}: TaskNotificationSystemProps) {
  const { t } = useTranslationsDB();
  const [notifications, setNotifications] = useState<TaskNotification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Calculate unread notifications count
  useEffect(() => {
    const unread = notifications.filter(n => !n.read_at && !n.is_dismissed).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type: TaskNotificationType) => {
    switch (type) {
      case 'task_assigned':
        return <User className="w-4 h-4" />;
      case 'task_due_soon':
        return <Clock className="w-4 h-4" />;
      case 'task_overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'task_completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'task_delegated':
        return <ArrowRight className="w-4 h-4" />;
      case 'task_escalated':
        return <AlertTriangle className="w-4 h-4" />;
      case 'comment_added':
        return <MessageSquare className="w-4 h-4" />;
      case 'team_member_added':
        return <Users className="w-4 h-4" />;
      case 'schedule_changed':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // Get notification color based on priority and type
  const getNotificationColor = (notification: TaskNotification) => {
    if (notification.type === 'task_overdue' || notification.priority === 'urgent') {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    if (notification.priority === 'high') {
      return 'text-orange-600 bg-orange-50 border-orange-200';
    }
    if (notification.priority === 'medium') {
      return 'text-blue-600 bg-blue-50 border-blue-200';
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // Format notification time
  const formatNotificationTime = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now.getTime() - notificationTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return t('notifications.time.now');
    } else if (diffMinutes < 60) {
      return t('notifications.time.minutes', { count: diffMinutes });
    } else if (diffHours < 24) {
      return t('notifications.time.hours', { count: diffHours });
    } else {
      return t('notifications.time.days', { count: diffDays });
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: TaskNotification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id 
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );

    // Call external handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    // Navigate to task or perform action
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  // Mark notification as dismissed
  const dismissNotification = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, is_dismissed: true }
          : n
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    const now = new Date().toISOString();
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || now }))
    );
  };

  // Filter notifications for display
  const activeNotifications = notifications.filter(n => !n.is_dismissed);
  const unreadNotifications = activeNotifications.filter(n => !n.read_at);
  const recentNotifications = activeNotifications.slice(0, 10);

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-gray-100"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 hover:bg-red-500"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent 
          className="w-96 p-0" 
          align="end"
          sideOffset={8}
        >
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {t('notifications.title')}
              </h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {t('notifications.mark_all_read')}
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {t('notifications.unread_count', { count: unreadCount })}
              </p>
            )}
          </div>

          <ScrollArea className="h-96">
            <div className="p-2">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">
                    {t('notifications.empty')}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentNotifications.map((notification) => {
                    const title = locale === 'fr' ? notification.title_fr : notification.title;
                    const message = locale === 'fr' ? notification.message_fr : notification.message;
                    const isUnread = !notification.read_at;

                    return (
                      <div
                        key={notification.id}
                        className={`group relative p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                          isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-full ${getNotificationColor(notification)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium ${
                                isUnread ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {title}
                              </h4>
                              
                              <div className="flex items-center gap-1">
                                {isUnread && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 p-1 h-auto"
                                  onClick={(e) => dismissNotification(notification.id, e)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">
                                {formatNotificationTime(notification.sent_at || notification.created_at)}
                              </span>
                              
                              {notification.priority === 'urgent' && (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                  {t('notifications.priority.urgent')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {activeNotifications.length > 10 && (
            <div className="border-t border-gray-200 p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm text-blue-600 hover:text-blue-700"
                onClick={() => {
                  window.location.href = '/tasks/notifications';
                  setIsOpen(false);
                }}
              >
                {t('notifications.view_all')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Real-time notification hook
export function useTaskNotifications(userId: string, restaurantId: string) {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // In a real implementation, this would connect to WebSocket
    // or use Supabase real-time subscriptions
    
    // Mock real-time connection
    setIsConnected(true);
    
    // Mock periodic notification updates
    const interval = setInterval(() => {
      // Simulate new notifications
      const now = new Date().toISOString();
      
      // This would be replaced with actual API calls
      // fetchNotifications(userId, restaurantId).then(setNotifications);
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [userId, restaurantId]);

  const markAsRead = async (notificationId: string) => {
    // API call to mark notification as read
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );
  };

  const dismissNotification = async (notificationId: string) => {
    // API call to dismiss notification
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, is_dismissed: true }
          : n
      )
    );
  };

  return {
    notifications,
    isConnected,
    markAsRead,
    dismissNotification
  };
}