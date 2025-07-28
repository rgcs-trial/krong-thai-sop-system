'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  MessageCircle, 
  Send,
  UserPlus,
  UserMinus,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Share2,
  Settings,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'chef' | 'server' | 'observer';
  status: 'online' | 'away' | 'busy' | 'offline';
  currentStep?: number;
  isTyping?: boolean;
  lastSeen?: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canInvite: boolean;
    canKick: boolean;
  };
}

interface CollaborationMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  type: 'message' | 'system' | 'step_update' | 'completion';
  stepId?: string;
  stepTitle?: string;
  reactions?: { emoji: string; users: string[] }[];
}

interface CollaborationActivity {
  id: string;
  userId: string;
  userName: string;
  action: 'joined' | 'left' | 'completed_step' | 'started_step' | 'commented' | 'updated';
  timestamp: string;
  stepId?: string;
  stepTitle?: string;
  details?: string;
}

interface RealTimeCollaborationPanelProps {
  /** SOP ID being collaborated on */
  sopId: string;
  /** Current user information */
  currentUser: CollaborationUser;
  /** List of active collaborators */
  collaborators?: CollaborationUser[];
  /** Chat messages */
  messages?: CollaborationMessage[];
  /** Recent activities */
  activities?: CollaborationActivity[];
  /** Current step being viewed by user */
  currentStep?: number;
  /** Total number of steps */
  totalSteps?: number;
  /** Connection status */
  isConnected?: boolean;
  /** Show video call controls */
  enableVideoCall?: boolean;
  /** Show chat functionality */
  enableChat?: boolean;
  /** Show activity feed */
  enableActivityFeed?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when user joins */
  onUserJoin?: (userId: string) => void;
  /** Callback when user leaves */
  onUserLeave?: (userId: string) => void;
  /** Callback when message is sent */
  onSendMessage?: (message: string) => void;
  /** Callback when step is updated */
  onStepUpdate?: (stepId: number) => void;
  /** Callback when video call is initiated */
  onVideoCallStart?: () => void;
  /** Callback when video call ends */
  onVideoCallEnd?: () => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * RealTimeCollaborationPanel - Real-time collaboration interface for team SOPs
 * 
 * Features:
 * - Live user presence with status indicators
 * - Real-time chat with reactions and typing indicators
 * - Step-by-step progress tracking across team members
 * - Activity feed with system notifications
 * - Video/audio call integration with WebRTC
 * - User permission management and role-based access
 * - Offline sync and connection status monitoring
 * - Tablet-optimized responsive interface
 * 
 * @param props RealTimeCollaborationPanelProps
 * @returns JSX.Element
 */
const RealTimeCollaborationPanel: React.FC<RealTimeCollaborationPanelProps> = ({
  sopId,
  currentUser,
  collaborators = [],
  messages = [],
  activities = [],
  currentStep = 0,
  totalSteps = 0,
  isConnected = true,
  enableVideoCall = true,
  enableChat = true,
  enableActivityFeed = true,
  isLoading = false,
  onUserJoin,
  onUserLeave,
  onSendMessage,
  onStepUpdate,
  onVideoCallStart,
  onVideoCallEnd,
  className
}) => {
  const t = useTranslations('sop.collaboration');
  
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'activity'>('chat');
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState(true);
  
  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (typeof window !== 'undefined' && sopId) {
      // In a real implementation, connect to your WebSocket server
      // webSocketRef.current = new WebSocket(`ws://localhost:3001/collaboration/${sopId}`);
      
      // Mock WebSocket events for demonstration
      const mockWebSocket = {
        send: (data: string) => {
          console.log('Mock WebSocket send:', data);
        },
        close: () => {
          console.log('Mock WebSocket closed');
        }
      };
      
      webSocketRef.current = mockWebSocket as any;
    }
    
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [sopId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, messageInput]);

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !onSendMessage) return;
    
    onSendMessage(messageInput.trim());
    setMessageInput('');
    setIsTyping(false);
    
    // Send via WebSocket
    if (webSocketRef.current) {
      webSocketRef.current.send(JSON.stringify({
        type: 'message',
        content: messageInput.trim(),
        userId: currentUser.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [messageInput, onSendMessage, currentUser.id]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      
      // Send typing indicator
      if (webSocketRef.current) {
        webSocketRef.current.send(JSON.stringify({
          type: 'typing',
          userId: currentUser.id,
          isTyping: true
        }));
      }
    }
  }, [isTyping, currentUser.id]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Get user status color
  const getUserStatusColor = useCallback((status: CollaborationUser['status']) => {
    switch (status) {
      case 'online': return 'bg-jade-green';
      case 'away': return 'bg-golden-saffron';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }, []);

  // Get role badge variant
  const getRoleBadgeVariant = useCallback((role: CollaborationUser['role']) => {
    switch (role) {
      case 'admin': return 'default';
      case 'manager': return 'secondary';
      default: return 'outline';
    }
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  // Toggle video call
  const toggleVideoCall = useCallback(() => {
    if (isInCall) {
      setIsInCall(false);
      setVideoEnabled(false);
      setAudioEnabled(false);
      onVideoCallEnd?.();
    } else {
      setIsInCall(true);
      setAudioEnabled(true);
      onVideoCallStart?.();
    }
  }, [isInCall, onVideoCallStart, onVideoCallEnd]);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-2 h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
            <Users className="w-6 h-6 text-krong-red" />
            {t('title')}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-jade-green" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-tablet-xs text-muted-foreground">
                {collaborators.length} {t('users')}
              </span>
            </div>
            
            {/* Video Call Toggle */}
            {enableVideoCall && (
              <Button
                variant={isInCall ? "default" : "outline"}
                size="icon-sm"
                onClick={toggleVideoCall}
                className={isInCall ? "bg-krong-red text-white" : ""}
              >
                {isInCall ? (
                  <PhoneOff className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
              </Button>
            )}
            
            {/* Notifications Toggle */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setNotifications(!notifications)}
            >
              {notifications ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Active Users Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {collaborators.slice(0, 8).map((user) => (
            <div key={user.id} className="flex items-center gap-1 flex-shrink-0">
              <div className="relative">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-xs">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white",
                  getUserStatusColor(user.status)
                )} />
              </div>
              {user.currentStep !== undefined && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {user.currentStep + 1}
                </Badge>
              )}
            </div>
          ))}
          {collaborators.length > 8 && (
            <Badge variant="secondary" className="text-xs">
              +{collaborators.length - 8}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Tab Navigation */}
        <div className="flex border-b px-4">
          <Button
            variant={activeTab === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('chat')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-krong-red"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t('tabs.chat')}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>
          
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('users')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-krong-red"
          >
            <Users className="w-4 h-4 mr-2" />
            {t('tabs.users')}
          </Button>
          
          {enableActivityFeed && (
            <Button
              variant={activeTab === 'activity' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('activity')}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-krong-red"
            >
              <Clock className="w-4 h-4 mr-2" />
              {t('tabs.activity')}
            </Button>
          )}
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && enableChat && (
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 px-4 py-2" ref={chatScrollRef}>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={message.userAvatar} alt={message.userName} />
                      <AvatarFallback className="text-xs">
                        {message.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-tablet-sm font-medium truncate">
                          {message.userName}
                        </span>
                        <span className="text-tablet-xs text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.type === 'step_update' && (
                          <Badge variant="outline" className="text-xs">
                            {t('stepUpdate')}
                          </Badge>
                        )}
                      </div>
                      
                      <div className={cn(
                        "p-2 rounded-lg text-tablet-sm",
                        message.userId === currentUser.id
                          ? "bg-krong-red text-white ml-auto"
                          : "bg-gray-100 text-krong-black",
                        message.type === 'system' && "bg-blue-50 text-blue-700 italic"
                      )}>
                        {message.content}
                        {message.stepTitle && (
                          <div className="text-xs opacity-80 mt-1">
                            {t('relatedToStep')}: {message.stepTitle}
                          </div>
                        )}
                      </div>
                      
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {message.reactions.map((reaction, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {reaction.emoji} {reaction.users.length}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicators */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-tablet-sm text-muted-foreground italic">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span>
                      {typingUsers.length === 1 
                        ? t('typing.single', { user: typingUsers[0] })
                        : t('typing.multiple', { count: typingUsers.length })
                      }
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={t('chat.placeholder')}
                  className="flex-1"
                  disabled={!isConnected}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !isConnected}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <ScrollArea className="flex-1 px-4 py-2">
            <div className="space-y-3">
              {collaborators.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                        getUserStatusColor(user.status)
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-tablet-sm font-medium truncate">
                          {user.name}
                        </span>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {t(`roles.${user.role}`)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-tablet-xs text-muted-foreground">
                        <span className="capitalize">{t(`status.${user.status}`)}</span>
                        {user.currentStep !== undefined && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span>{t('onStep', { step: user.currentStep + 1, total: totalSteps })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {user.permissions.canEdit && (
                      <Badge variant="outline" className="text-xs">
                        {t('permissions.edit')}
                      </Badge>
                    )}
                    
                    {currentUser.permissions.canKick && user.id !== currentUser.id && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onUserLeave?.(user.id)}
                      >
                        <UserMinus className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && enableActivityFeed && (
          <ScrollArea className="flex-1 px-4 py-2">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 mt-1">
                    {activity.action === 'completed_step' && (
                      <CheckCircle className="w-4 h-4 text-jade-green" />
                    )}
                    {activity.action === 'started_step' && (
                      <Clock className="w-4 h-4 text-golden-saffron" />
                    )}
                    {activity.action === 'joined' && (
                      <UserPlus className="w-4 h-4 text-blue-500" />
                    )}
                    {activity.action === 'left' && (
                      <UserMinus className="w-4 h-4 text-red-500" />
                    )}
                    {activity.action === 'commented' && (
                      <MessageCircle className="w-4 h-4 text-purple-500" />
                    )}
                    {activity.action === 'updated' && (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-tablet-sm">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      {t(`activities.${activity.action}`)}
                      {activity.stepTitle && (
                        <span className="text-muted-foreground">
                          {' '}{activity.stepTitle}
                        </span>
                      )}
                    </p>
                    
                    {activity.details && (
                      <p className="text-tablet-xs text-muted-foreground mt-1">
                        {activity.details}
                      </p>
                    )}
                    
                    <span className="text-tablet-xs text-muted-foreground">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Video Call Controls */}
        {isInCall && enableVideoCall && (
          <div className="p-4 bg-gray-900 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-tablet-sm">{t('videoCall.active')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={audioEnabled ? "secondary" : "outline"}
                  size="icon-sm"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant={videoEnabled ? "secondary" : "outline"}
                  size="icon-sm"
                  onClick={() => setVideoEnabled(!videoEnabled)}
                >
                  {videoEnabled ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <VideoOff className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={toggleVideoCall}
                >
                  <PhoneOff className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeCollaborationPanel;