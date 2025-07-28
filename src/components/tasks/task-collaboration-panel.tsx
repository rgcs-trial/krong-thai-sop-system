'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Share2, 
  Eye, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bell,
  Video,
  Headphones,
  User,
  Crown,
  X,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTranslationsDB } from '@/hooks/use-translations-db';
import { 
  Task, 
  AuthUser,
  TaskComment 
} from '@/types/database';

interface TaskCollaborationPanelProps {
  task: Task;
  locale: string;
  currentUserId: string;
  className?: string;
  onTeamMemberAdd?: (userId: string) => void;
  onTeamMemberRemove?: (userId: string) => void;
  onCommentAdd?: (comment: string) => void;
  onTaskShare?: (shareMethod: string) => void;
}

// Mock team members data
const mockTeamMembers: AuthUser[] = [
  {
    id: 'user1',
    email: 'marie.dubois@krongthai.com',
    role: 'staff',
    full_name: 'Marie Dubois',
    full_name_fr: 'Marie Dubois',
    position: 'Sous Chef',
    position_fr: 'Sous Chef',
    restaurant_id: '123',
    is_active: true,
    pin_attempts: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'user2',
    email: 'jean.martin@krongthai.com',
    role: 'staff',
    full_name: 'Jean Martin',
    full_name_fr: 'Jean Martin',
    position: 'Line Cook',
    position_fr: 'Cuisinier de ligne',
    restaurant_id: '123',
    is_active: true,
    pin_attempts: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'user3',
    email: 'sophie.laurent@krongthai.com',
    role: 'staff',
    full_name: 'Sophie Laurent',
    full_name_fr: 'Sophie Laurent',
    position: 'Server',
    position_fr: 'Serveuse',
    restaurant_id: '123',
    is_active: true,
    pin_attempts: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

// Mock available staff for adding to team
const mockAvailableStaff: AuthUser[] = [
  {
    id: 'user4',
    email: 'pierre.moreau@krongthai.com',
    role: 'staff',
    full_name: 'Pierre Moreau',
    full_name_fr: 'Pierre Moreau',
    position: 'Prep Cook',
    position_fr: 'Cuisinier de préparation',
    restaurant_id: '123',
    is_active: true,
    pin_attempts: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'user5',
    email: 'lucie.bernard@krongthai.com',
    role: 'staff',
    full_name: 'Lucie Bernard',
    full_name_fr: 'Lucie Bernard',
    position: 'Dishwasher',
    position_fr: 'Plongeur',
    restaurant_id: '123',
    is_active: true,
    pin_attempts: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

// Mock comments data
const mockComments: TaskComment[] = [
  {
    id: '1',
    task_id: 'task-001',
    user_id: 'user1',
    comment: 'Started the prep work. The sanitizer dispenser needs refilling.',
    comment_fr: 'J\'ai commencé la préparation. Le distributeur de désinfectant doit être rempli.',
    is_internal: false,
    is_system_generated: false,
    attachments: [],
    created_at: '2025-07-28T08:15:00Z',
    updated_at: '2025-07-28T08:15:00Z',
    user: mockTeamMembers[0]
  },
  {
    id: '2',
    task_id: 'task-001',
    user_id: 'user2',
    comment: 'I can help with the equipment cleaning after lunch service.',
    comment_fr: 'Je peux aider avec le nettoyage de l\'équipement après le service du déjeuner.',
    is_internal: false,
    is_system_generated: false,
    attachments: [],
    created_at: '2025-07-28T09:30:00Z',
    updated_at: '2025-07-28T09:30:00Z',
    user: mockTeamMembers[1]
  },
  {
    id: '3',
    task_id: 'task-001',
    user_id: 'system',
    comment: 'Task deadline approaching in 2 hours',
    comment_fr: 'Échéance de la tâche dans 2 heures',
    is_internal: true,
    is_system_generated: true,
    attachments: [],
    created_at: '2025-07-28T11:00:00Z',
    updated_at: '2025-07-28T11:00:00Z'
  }
];

export default function TaskCollaborationPanel({
  task,
  locale,
  currentUserId,
  className = '',
  onTeamMemberAdd,
  onTeamMemberRemove,
  onCommentAdd,
  onTaskShare
}: TaskCollaborationPanelProps) {
  const { t } = useTranslationsDB();
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments] = useState<TaskComment[]>(mockComments);
  const [teamMembers, setTeamMembers] = useState<AuthUser[]>(mockTeamMembers);

  // Get user display name
  const getUserDisplayName = (user: AuthUser) => {
    return locale === 'fr' ? user.full_name_fr || user.full_name : user.full_name;
  };

  // Get user position
  const getUserPosition = (user: AuthUser) => {
    return locale === 'fr' ? user.position_fr || user.position : user.position;
  };

  // Add team member
  const addTeamMember = (userId: string) => {
    const user = mockAvailableStaff.find(u => u.id === userId);
    if (user && !teamMembers.find(m => m.id === userId)) {
      setTeamMembers(prev => [...prev, user]);
      onTeamMemberAdd?.(userId);
    }
    setShowAddMemberDialog(false);
  };

  // Remove team member
  const removeTeamMember = (userId: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== userId));
    onTeamMemberRemove?.(userId);
  };

  // Add comment
  const addComment = () => {
    if (newComment.trim()) {
      onCommentAdd?.(newComment);
      setNewComment('');
    }
  };

  // Format comment time
  const formatCommentTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) {
      return t('tasks.collaboration.time.now');
    } else if (diffMinutes < 60) {
      return t('tasks.collaboration.time.minutes_ago', { count: diffMinutes });
    } else if (diffHours < 24) {
      return t('tasks.collaboration.time.hours_ago', { count: diffHours });
    } else {
      return date.toLocaleDateString(locale);
    }
  };

  const title = locale === 'fr' ? task.title_fr : task.title;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('tasks.collaboration.team_title')}
            </CardTitle>
            <Badge variant="outline">
              {teamMembers.length} {t('tasks.collaboration.members')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Task Leader */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('tasks.collaboration.task_leader')}
            </h4>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {task.assignee?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-blue-900">
                  {task.assignee ? getUserDisplayName(task.assignee) : t('tasks.collaboration.unassigned')}
                </p>
                {task.assignee && (
                  <p className="text-sm text-blue-700">
                    {getUserPosition(task.assignee)}
                  </p>
                )}
              </div>
              <Crown className="w-4 h-4 text-blue-600" />
            </div>
          </div>

          {/* Team Members */}
          {teamMembers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">
                  {t('tasks.collaboration.team_members')}
                </h4>
                <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t('tasks.collaboration.add_member')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('tasks.collaboration.add_team_member')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        {t('tasks.collaboration.add_member_description')}
                      </p>
                      <div className="space-y-2">
                        {mockAvailableStaff.filter(staff => 
                          !teamMembers.find(member => member.id === staff.id)
                        ).map((staff) => (
                          <div 
                            key={staff.id} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => addTeamMember(staff.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>
                                  {staff.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{getUserDisplayName(staff)}</p>
                                <p className="text-sm text-gray-600">{getUserPosition(staff)}</p>
                              </div>
                            </div>
                            <Button size="sm">
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {member.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{getUserDisplayName(member)}</p>
                        <p className="text-sm text-gray-600">{getUserPosition(member)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {member.id === currentUserId ? t('tasks.collaboration.you') : t('tasks.collaboration.member')}
                      </Badge>
                      
                      {member.id !== task.assigned_to && member.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeamMember(member.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collaboration Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" className="flex-1">
              <Video className="w-4 h-4 mr-2" />
              {t('tasks.collaboration.video_call')}
            </Button>
            
            <Button variant="outline" size="sm" className="flex-1">
              <Headphones className="w-4 h-4 mr-2" />
              {t('tasks.collaboration.voice_chat')}
            </Button>
            
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('tasks.collaboration.share')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('tasks.collaboration.share_task')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {t('tasks.collaboration.share_description')}
                  </p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => onTaskShare?.('qr_code')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t('tasks.collaboration.share.qr_code')}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => onTaskShare?.('link')}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      {t('tasks.collaboration.share.copy_link')}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => onTaskShare?.('notification')}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      {t('tasks.collaboration.share.send_notification')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Comments and Communication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('tasks.collaboration.comments_title')}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Comments List */}
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className={`p-3 rounded-lg ${
                  comment.is_system_generated 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-start gap-3">
                    {!comment.is_system_generated && (
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {comment.user?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    {comment.is_system_generated && (
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Bell className="w-3 h-3 text-blue-600" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {comment.is_system_generated ? (
                          <span className="text-sm font-medium text-blue-700">
                            {t('tasks.collaboration.system')}
                          </span>
                        ) : (
                          <span className="text-sm font-medium">
                            {comment.user ? getUserDisplayName(comment.user) : t('tasks.collaboration.unknown_user')}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatCommentTime(comment.created_at)}
                        </span>
                        {comment.is_internal && (
                          <Badge variant="outline" className="text-xs">
                            {t('tasks.collaboration.internal')}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700">
                        {locale === 'fr' ? comment.comment_fr || comment.comment : comment.comment}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {comments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t('tasks.collaboration.no_comments')}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Add Comment */}
          <div className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('tasks.collaboration.comment_placeholder')}
              rows={3}
              className="resize-none"
            />
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User className="w-4 h-4" />
                {t('tasks.collaboration.commenting_as')} {
                  teamMembers.find(m => m.id === currentUserId)?.full_name || t('tasks.collaboration.you')
                }
              </div>
              
              <Button 
                onClick={addComment}
                disabled={!newComment.trim()}
                size="sm"
                className="bg-[#E31B23] hover:bg-[#E31B23]/90"
              >
                <Send className="w-4 h-4 mr-2" />
                {t('tasks.collaboration.send_comment')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('tasks.collaboration.activity_title')}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700">
                {t('tasks.collaboration.activity.member_working', { 
                  name: getUserDisplayName(teamMembers[0] || { full_name: 'Team member' } as AuthUser)
                })}
              </span>
              <span className="text-xs text-green-600">
                {t('tasks.collaboration.activity.now')}
              </span>
            </div>
            
            <div className="flex items-center gap-3 p-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-700">
                {t('tasks.collaboration.activity.checklist_updated')}
              </span>
              <span className="text-xs text-gray-500">
                {t('tasks.collaboration.activity.minutes_ago', { count: 5 })}
              </span>
            </div>
            
            <div className="flex items-center gap-3 p-2">
              <UserPlus className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-700">
                {t('tasks.collaboration.activity.member_joined', {
                  name: getUserDisplayName(teamMembers[1] || { full_name: 'Team member' } as AuthUser)
                })}
              </span>
              <span className="text-xs text-gray-500">
                {t('tasks.collaboration.activity.minutes_ago', { count: 15 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}