'use client';

import React, { useState, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Reply, 
  Edit,
  Trash2,
  MoreVertical,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Star,
  Flag,
  Pin,
  Eye,
  EyeOff,
  Paperclip,
  Image,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useTranslationsDB } from '@/hooks/use-translations-db';
import { 
  Task, 
  TaskComment,
  AuthUser 
} from '@/types/database';

interface TaskCommentSystemProps {
  task: Task;
  locale: string;
  currentUser: AuthUser;
  className?: string;
  onCommentAdd?: (comment: Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>) => void;
  onCommentEdit?: (commentId: string, newText: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentReact?: (commentId: string, reaction: string) => void;
}

type CommentType = 'general' | 'feedback' | 'instruction' | 'issue' | 'approval';
type CommentPriority = 'low' | 'medium' | 'high' | 'urgent';

interface CommentReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface ExtendedTaskComment extends TaskComment {
  reactions?: CommentReaction[];
  is_pinned?: boolean;
  is_private?: boolean;
  comment_type?: CommentType;
  priority?: CommentPriority;
  edited_at?: string;
}

// Mock comments with extended features
const mockComments: ExtendedTaskComment[] = [
  {
    id: '1',
    task_id: 'task-001',
    user_id: 'manager1',
    comment: 'Great progress on the prep work! Please make sure to document any equipment issues you encounter.',
    comment_fr: 'Excellent progrès sur le travail de préparation ! Assurez-vous de documenter tout problème d\'équipement que vous rencontrez.',
    is_internal: false,
    is_system_generated: false,
    attachments: [],
    created_at: '2025-07-28T08:30:00Z',
    updated_at: '2025-07-28T08:30:00Z',
    comment_type: 'feedback',
    priority: 'medium',
    is_pinned: true,
    reactions: [
      { emoji: '👍', count: 2, users: ['user1', 'user2'] },
      { emoji: '✅', count: 1, users: ['user1'] }
    ],
    user: {
      id: 'manager1',
      email: 'manager@krongthai.com',
      role: 'manager',
      full_name: 'Chef Manager',
      full_name_fr: 'Chef Manager',
      position: 'Kitchen Manager',
      position_fr: 'Gestionnaire de cuisine',
      restaurant_id: '123',
      is_active: true,
      pin_attempts: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  },
  {
    id: '2',
    task_id: 'task-001',
    user_id: 'user1',
    comment: 'The sanitizer dispenser was empty. I refilled it and added it to the maintenance log.',
    comment_fr: 'Le distributeur de désinfectant était vide. Je l\'ai rempli et l\'ai ajouté au journal de maintenance.',
    is_internal: false,
    is_system_generated: false,
    attachments: ['sanitizer-refill-photo.jpg'],
    created_at: '2025-07-28T09:15:00Z',
    updated_at: '2025-07-28T09:15:00Z',
    comment_type: 'general',
    priority: 'low',
    reactions: [
      { emoji: '👍', count: 1, users: ['manager1'] }
    ],
    user: {
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
    }
  },
  {
    id: '3',
    task_id: 'task-001',
    user_id: 'manager1',
    reply_to_id: '2',
    comment: 'Perfect! That\'s exactly the kind of proactive thinking we need. Well done!',
    comment_fr: 'Parfait ! C\'est exactement le genre de réflexion proactive dont nous avons besoin. Bien joué !',
    is_internal: false,
    is_system_generated: false,
    attachments: [],
    created_at: '2025-07-28T09:20:00Z',
    updated_at: '2025-07-28T09:20:00Z',
    comment_type: 'feedback',
    priority: 'medium',
    reactions: [
      { emoji: '⭐', count: 1, users: ['user1'] }
    ],
    user: {
      id: 'manager1',
      email: 'manager@krongthai.com',
      role: 'manager',
      full_name: 'Chef Manager',
      full_name_fr: 'Chef Manager',
      position: 'Kitchen Manager',
      position_fr: 'Gestionnaire de cuisine',
      restaurant_id: '123',
      is_active: true,
      pin_attempts: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  },
  {
    id: '4',
    task_id: 'task-001',
    user_id: 'manager1',
    comment: 'URGENT: Please pause this task and prioritize the lunch prep. We have a large reservation coming in.',
    comment_fr: 'URGENT : Veuillez suspendre cette tâche et prioriser la préparation du déjeuner. Nous avons une grande réservation qui arrive.',
    is_internal: false,
    is_system_generated: false,
    attachments: [],
    created_at: '2025-07-28T10:45:00Z',
    updated_at: '2025-07-28T10:45:00Z',
    comment_type: 'instruction',
    priority: 'urgent',
    is_pinned: true,
    reactions: [
      { emoji: '🚨', count: 3, users: ['user1', 'user2', 'user3'] }
    ],
    user: {
      id: 'manager1',
      email: 'manager@krongthai.com',
      role: 'manager',
      full_name: 'Chef Manager',
      full_name_fr: 'Chef Manager',
      position: 'Kitchen Manager',
      position_fr: 'Gestionnaire de cuisine',
      restaurant_id: '123',
      is_active: true,
      pin_attempts: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  },
  {
    id: '5',
    task_id: 'task-001',
    user_id: 'manager1',
    comment: 'Internal note: Staff member showed excellent initiative. Consider for next performance review.',
    comment_fr: 'Note interne : Le membre du personnel a fait preuve d\'une excellente initiative. À considérer pour la prochaine évaluation de performance.',
    is_internal: true,
    is_system_generated: false,
    is_private: true,
    attachments: [],
    created_at: '2025-07-28T11:00:00Z',
    updated_at: '2025-07-28T11:00:00Z',
    comment_type: 'feedback',
    priority: 'low',
    user: {
      id: 'manager1',
      email: 'manager@krongthai.com',
      role: 'manager',
      full_name: 'Chef Manager',
      full_name_fr: 'Chef Manager',
      position: 'Kitchen Manager',
      position_fr: 'Gestionnaire de cuisine',
      restaurant_id: '123',
      is_active: true,
      pin_attempts: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  }
];

const commentTypeColors = {
  general: 'bg-gray-100 text-gray-800',
  feedback: 'bg-green-100 text-green-800',
  instruction: 'bg-blue-100 text-blue-800',
  issue: 'bg-red-100 text-red-800',
  approval: 'bg-purple-100 text-purple-800'
};

const priorityColors = {
  low: 'border-l-gray-300',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500'
};

const reactions = ['👍', '👎', '❤️', '😊', '😮', '😢', '😠', '✅', '❌', '⭐', '🚨', '💡'];

export default function TaskCommentSystem({
  task,
  locale,
  currentUser,
  className = '',
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
  onCommentReact
}: TaskCommentSystemProps) {
  const { t } = useTranslationsDB();
  const [comments, setComments] = useState<ExtendedTaskComment[]>(mockComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentType, setCommentType] = useState<CommentType>('general');
  const [commentPriority, setCommentPriority] = useState<CommentPriority>('medium');
  const [isPrivate, setIsPrivate] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter comments based on user permissions
  const visibleComments = comments.filter(comment => {
    if (comment.is_private && currentUser.role !== 'manager' && comment.user_id !== currentUser.id) {
      return false;
    }
    return true;
  });

  // Get user display name
  const getUserDisplayName = (user: AuthUser | undefined) => {
    if (!user) return t('tasks.comments.unknown_user');
    return locale === 'fr' ? user.full_name_fr || user.full_name : user.full_name;
  };

  // Format comment time
  const formatCommentTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return t('tasks.comments.time.now');
    } else if (diffMinutes < 60) {
      return t('tasks.comments.time.minutes_ago', { count: diffMinutes });
    } else if (diffHours < 24) {
      return t('tasks.comments.time.hours_ago', { count: diffHours });
    } else {
      return date.toLocaleDateString(locale);
    }
  };

  // Add comment
  const addComment = () => {
    if (!newComment.trim()) return;

    const comment: Omit<ExtendedTaskComment, 'id' | 'created_at' | 'updated_at'> = {
      task_id: task.id,
      user_id: currentUser.id,
      comment: newComment,
      comment_fr: newComment, // In real app, this would be translated
      is_internal: currentUser.role === 'manager' && isPrivate,
      is_system_generated: false,
      reply_to_id: replyingTo || undefined,
      attachments: attachments.map(f => f.name),
      comment_type: commentType,
      priority: commentPriority,
      is_private: isPrivate,
      user: currentUser
    };

    onCommentAdd?.(comment);
    
    // Add to local state for demo
    const newCommentWithId: ExtendedTaskComment = {
      ...comment,
      id: `comment-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setComments(prev => [...prev, newCommentWithId]);
    
    // Reset form
    setNewComment('');
    setReplyingTo(null);
    setCommentType('general');
    setCommentPriority('medium');
    setIsPrivate(false);
    setAttachments([]);
  };

  // Edit comment
  const editComment = (commentId: string, newText: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, comment: newText, comment_fr: newText, edited_at: new Date().toISOString() }
        : c
    ));
    onCommentEdit?.(commentId, newText);
    setEditingComment(null);
  };

  // Delete comment
  const deleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    onCommentDelete?.(commentId);
  };

  // React to comment
  const reactToComment = (commentId: string, emoji: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id !== commentId) return comment;
      
      const reactions = comment.reactions || [];
      const existingReaction = reactions.find(r => r.emoji === emoji);
      
      if (existingReaction) {
        if (existingReaction.users.includes(currentUser.id)) {
          // Remove reaction
          existingReaction.count--;
          existingReaction.users = existingReaction.users.filter(u => u !== currentUser.id);
          if (existingReaction.count === 0) {
            return { ...comment, reactions: reactions.filter(r => r.emoji !== emoji) };
          }
        } else {
          // Add reaction
          existingReaction.count++;
          existingReaction.users.push(currentUser.id);
        }
      } else {
        // New reaction
        reactions.push({ emoji, count: 1, users: [currentUser.id] });
      }
      
      return { ...comment, reactions };
    }));
    
    onCommentReact?.(commentId, emoji);
    setShowEmojiPicker(null);
  };

  // Handle file attachment
  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Pin/unpin comment (manager only)
  const togglePin = (commentId: string) => {
    if (currentUser.role !== 'manager') return;
    
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, is_pinned: !c.is_pinned } : c
    ));
  };

  // Group comments by replies
  const groupedComments = visibleComments.reduce((acc, comment) => {
    if (!comment.reply_to_id) {
      acc.push({
        main: comment,
        replies: visibleComments.filter(c => c.reply_to_id === comment.id)
      });
    }
    return acc;
  }, [] as Array<{ main: ExtendedTaskComment; replies: ExtendedTaskComment[] }>);

  // Sort comments: pinned first, then by date
  const sortedGroupedComments = groupedComments.sort((a, b) => {
    if (a.main.is_pinned && !b.main.is_pinned) return -1;
    if (!a.main.is_pinned && b.main.is_pinned) return 1;
    return new Date(b.main.created_at).getTime() - new Date(a.main.created_at).getTime();
  });

  const CommentItem = ({ comment, isReply = false }: { comment: ExtendedTaskComment; isReply?: boolean }) => {
    const commentText = locale === 'fr' ? comment.comment_fr || comment.comment : comment.comment;
    const canEdit = comment.user_id === currentUser.id || currentUser.role === 'manager';
    const canDelete = comment.user_id === currentUser.id || currentUser.role === 'manager';

    return (
      <div className={`${isReply ? 'ml-8 pt-3' : ''}`}>
        <div className={`border-l-2 p-4 rounded-lg ${
          comment.priority ? priorityColors[comment.priority] : 'border-l-gray-300'
        } ${
          comment.is_pinned ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
        } ${
          comment.is_private ? 'bg-blue-50 border border-blue-200' : ''
        }`}>
          {/* Comment Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {comment.user?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {getUserDisplayName(comment.user)}
                </span>
                
                {comment.user?.role === 'manager' && (
                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                    {t('tasks.comments.manager')}
                  </Badge>
                )}
                
                {comment.comment_type && comment.comment_type !== 'general' && (
                  <Badge className={`text-xs ${commentTypeColors[comment.comment_type]}`}>
                    {t(`tasks.comments.type.${comment.comment_type}`)}
                  </Badge>
                )}
                
                {comment.priority === 'urgent' && (
                  <Badge className="text-xs bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {t('tasks.comments.priority.urgent')}
                  </Badge>
                )}
                
                {comment.is_pinned && (
                  <Pin className="w-3 h-3 text-yellow-600" />
                )}
                
                {comment.is_private && (
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                    <EyeOff className="w-3 h-3 mr-1" />
                    {t('tasks.comments.private')}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {formatCommentTime(comment.created_at)}
                {comment.edited_at && (
                  <span className="ml-1">({t('tasks.comments.edited')})</span>
                )}
              </span>
              
              {(canEdit || canDelete || currentUser.role === 'manager') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {!isReply && (
                      <DropdownMenuItem onClick={() => setReplyingTo(comment.id)}>
                        <Reply className="w-4 h-4 mr-2" />
                        {t('tasks.comments.reply')}
                      </DropdownMenuItem>
                    )}
                    
                    {canEdit && (
                      <DropdownMenuItem onClick={() => setEditingComment(comment.id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        {t('tasks.comments.edit')}
                      </DropdownMenuItem>
                    )}
                    
                    {currentUser.role === 'manager' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => togglePin(comment.id)}>
                          <Pin className="w-4 h-4 mr-2" />
                          {comment.is_pinned ? t('tasks.comments.unpin') : t('tasks.comments.pin')}
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteComment(comment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('tasks.comments.delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {/* Comment Content */}
          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                defaultValue={commentText}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    editComment(comment.id, e.currentTarget.value);
                  }
                  if (e.key === 'Escape') {
                    setEditingComment(null);
                  }
                }}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => editComment(comment.id, document.querySelector('textarea')?.value || '')}
                >
                  {t('tasks.comments.save')}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setEditingComment(null)}
                >
                  {t('tasks.comments.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 mb-3">{commentText}</p>
          )}
          
          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="flex gap-2 mb-3">
              {comment.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 bg-white rounded border text-xs">
                  <Paperclip className="w-3 h-3" />
                  {attachment}
                </div>
              ))}
            </div>
          )}
          
          {/* Reactions */}
          {comment.reactions && comment.reactions.length > 0 && (
            <div className="flex gap-1 mb-2">
              {comment.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => reactToComment(comment.id, reaction.emoji)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                    reaction.users.includes(currentUser.id)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {reaction.emoji} {reaction.count}
                </button>
              ))}
              
              <DropdownMenu open={showEmojiPicker === comment.id} onOpenChange={(open) => setShowEmojiPicker(open ? comment.id : null)}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600">
                    😊
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="grid grid-cols-6 gap-1 p-2">
                    {reactions.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => reactToComment(comment.id, emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('tasks.comments.title')}
            <Badge variant="outline">
              {visibleComments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Comments List */}
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {sortedGroupedComments.map(({ main, replies }) => (
                <div key={main.id} className="space-y-2">
                  <CommentItem comment={main} />
                  {replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              ))}
              
              {visibleComments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t('tasks.comments.no_comments')}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Add Comment Form */}
          <div className="space-y-4">
            {replyingTo && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <Reply className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  {t('tasks.comments.replying_to')} {
                    getUserDisplayName(visibleComments.find(c => c.id === replyingTo)?.user)
                  }
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="ml-auto h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Comment Type and Priority (Manager only) */}
            {currentUser.role === 'manager' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select value={commentType} onValueChange={(value) => setCommentType(value as CommentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('tasks.comments.type.general')}</SelectItem>
                    <SelectItem value="feedback">{t('tasks.comments.type.feedback')}</SelectItem>
                    <SelectItem value="instruction">{t('tasks.comments.type.instruction')}</SelectItem>
                    <SelectItem value="issue">{t('tasks.comments.type.issue')}</SelectItem>
                    <SelectItem value="approval">{t('tasks.comments.type.approval')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={commentPriority} onValueChange={(value) => setCommentPriority(value as CommentPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('tasks.comments.priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('tasks.comments.priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('tasks.comments.priority.high')}</SelectItem>
                    <SelectItem value="urgent">{t('tasks.comments.priority.urgent')}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={isPrivate ? 'bg-blue-50 text-blue-700' : ''}
                >
                  {isPrivate ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {isPrivate ? t('tasks.comments.private') : t('tasks.comments.public')}
                </Button>
              </div>
            )}

            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('tasks.comments.placeholder')}
              rows={3}
              className="resize-none"
            />

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                    <Paperclip className="w-4 h-4" />
                    {file.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="h-4 w-4 p-0 text-gray-500 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  {t('tasks.comments.attach')}
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileAttachment}
                />
              </div>
              
              <Button 
                onClick={addComment}
                disabled={!newComment.trim()}
                className="bg-[#E31B23] hover:bg-[#E31B23]/90"
              >
                <Send className="w-4 h-4 mr-2" />
                {replyingTo ? t('tasks.comments.reply') : t('tasks.comments.post')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}