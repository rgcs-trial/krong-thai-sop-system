'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Share2, 
  Mail, 
  MessageSquare, 
  Users, 
  Copy,
  Send,
  CheckCircle,
  Bell
} from 'lucide-react';

interface ShareOption {
  id: string;
  type: 'email' | 'notification' | 'link' | 'message';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  isOnline: boolean;
}

interface SOPSharingComponentProps {
  /** SOP document details */
  sopId: string;
  sopTitle: string;
  /** Available team members */
  teamMembers: TeamMember[];
  /** Share dialog open state */
  isOpen: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when SOP is shared */
  onShare: (recipients: string[], message: string, shareType: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SOPSharingComponent - Component for sharing SOPs with team members
 */
const SOPSharingComponent: React.FC<SOPSharingComponentProps> = ({
  sopId,
  sopTitle,
  teamMembers,
  isOpen,
  isLoading = false,
  onClose,
  onShare,
  className
}) => {
  const t = useTranslations('sop.sharing');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [shareMessage, setShareMessage] = useState('');
  const [selectedShareType, setSelectedShareType] = useState<string>('notification');
  const [linkCopied, setLinkCopied] = useState(false);

  const shareOptions: ShareOption[] = [
    {
      id: 'notification',
      type: 'notification',
      label: t('options.notification.label'),
      icon: Bell,
      description: t('options.notification.description')
    },
    {
      id: 'email',
      type: 'email',
      label: t('options.email.label'),
      icon: Mail,
      description: t('options.email.description')
    },
    {
      id: 'message',
      type: 'message',
      label: t('options.message.label'),
      icon: MessageSquare,
      description: t('options.message.description')
    },
    {
      id: 'link',
      type: 'link',
      label: t('options.link.label'),
      icon: Copy,
      description: t('options.link.description')
    }
  ];

  const handleMemberToggle = useCallback((memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  }, []);

  const handleShare = useCallback(() => {
    const recipients = Array.from(selectedMembers);
    onShare(recipients, shareMessage, selectedShareType);
    
    // Reset form
    setSelectedMembers(new Set());
    setShareMessage('');
    setSelectedShareType('notification');
  }, [selectedMembers, shareMessage, selectedShareType, onShare]);

  const handleCopyLink = useCallback(async () => {
    const link = `${window.location.origin}/sop/${sopId}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  }, [sopId]);

  const isShareDisabled = selectedMembers.size === 0 && selectedShareType !== 'link';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle className="text-tablet-xl font-heading font-bold text-krong-black">
            {t('title')}
          </DialogTitle>
          <p className="text-tablet-base font-body text-muted-foreground">
            {t('subtitle', { title: sopTitle })}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share Method Selection */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-tablet-lg font-heading">
                {t('shareMethod')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shareOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedShareType === option.id;
                  
                  return (
                    <Card
                      key={option.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 border-2",
                        isSelected 
                          ? "border-krong-red bg-krong-red/5" 
                          : "border-border/40 hover:border-krong-red/50"
                      )}
                      onClick={() => setSelectedShareType(option.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Icon className={cn(
                            "w-5 h-5",
                            isSelected ? "text-krong-red" : "text-muted-foreground"
                          )} />
                          <div className="flex-1">
                            <h4 className={cn(
                              "text-tablet-sm font-body font-medium",
                              isSelected ? "text-krong-red" : "text-krong-black"
                            )}>
                              {option.label}
                            </h4>
                            <p className="text-tablet-xs text-muted-foreground">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Link Sharing */}
          {selectedShareType === 'link' && (
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-tablet-lg font-heading">
                  {t('shareLink')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 bg-gray-100 rounded-lg text-tablet-sm font-mono">
                    {`${window.location.origin}/sop/${sopId}`}
                  </div>
                  <Button
                    variant={linkCopied ? "default" : "outline"}
                    onClick={handleCopyLink}
                    className="flex-shrink-0"
                  >
                    {linkCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        {t('copyLink')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Member Selection */}
          {selectedShareType !== 'link' && (
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('selectTeamMembers')}
                  {selectedMembers.size > 0 && (
                    <Badge variant="secondary" className="text-tablet-xs">
                      {selectedMembers.size}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {teamMembers.map((member) => {
                    const isSelected = selectedMembers.has(member.id);
                    
                    return (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 p-3 border-2 border-border/40 rounded-lg cursor-pointer transition-colors duration-200",
                          isSelected && "border-krong-red bg-krong-red/5"
                        )}
                        onClick={() => handleMemberToggle(member.id)}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 bg-golden-saffron rounded-full flex items-center justify-center">
                            <span className="text-tablet-sm font-body font-medium text-krong-black">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {member.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-jade-green rounded-full border-2 border-white" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-tablet-base font-body font-medium text-krong-black">
                            {member.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-tablet-xs">
                              {member.role}
                            </Badge>
                            {member.isOnline && (
                              <span className="text-tablet-xs text-jade-green">
                                {t('online')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-krong-red" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message */}
          {selectedShareType !== 'link' && (
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-tablet-lg font-heading">
                  {t('addMessage')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder={t('messagePlaceholder')}
                  className="min-h-[100px] text-tablet-base"
                  maxLength={500}
                />
                <div className="flex justify-between text-tablet-xs text-muted-foreground mt-2">
                  <span>{t('messageOptional')}</span>
                  <span>{shareMessage.length}/500</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t-2 border-border/40">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            
            <Button
              variant="default"
              onClick={selectedShareType === 'link' ? handleCopyLink : handleShare}
              className="flex-1"
              disabled={isShareDisabled || isLoading}
            >
              {isLoading ? (
                t('sharing')
              ) : selectedShareType === 'link' ? (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  {t('copyLink')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('share')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SOPSharingComponent;