'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Activity,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Settings
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/hooks/use-toast';
import type { 
  TranslationWorkflowManagerProps,
  WorkflowState,
  WorkflowAction,
  TranslationAdminItem,
  TranslationStatus,
  Locale
} from '@/types/translation-admin';

// Workflow configuration
const WORKFLOW_RULES: Record<TranslationStatus, TranslationStatus[]> = {
  draft: ['review', 'approved'], // Draft can go to review or directly approved
  review: ['approved', 'draft'], // Review can be approved or sent back to draft
  approved: ['published', 'review'], // Approved can be published or sent back for review
  published: ['approved'] // Published can only be reverted to approved
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  review: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  published: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
};

/**
 * Translation Workflow Manager Component
 * Manages translation status transitions, approvals, and workflow history
 */
export function TranslationWorkflowManager({
  className = '',
  translationId,
  onStatusChange
}: TranslationWorkflowManagerProps) {
  const { t, formatDateLocale } = useI18n();
  const queryClient = useQueryClient();

  // State management
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>([]);
  const [workflowAction, setWorkflowAction] = useState<{
    action: string;
    translations: string[];
    comment: string;
    toStatus: TranslationStatus;
  } | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [bulkComment, setBulkComment] = useState('');

  // Fetch pending translations for review
  const { 
    data: pendingTranslations, 
    isLoading: isLoadingPending 
  } = useQuery({
    queryKey: ['workflow-pending-translations'],
    queryFn: async () => {
      const response = await fetch('/api/admin/translations/workflow/pending');
      if (!response.ok) throw new Error('Failed to fetch pending translations');
      return response.json();
    },
  });

  // Fetch workflow history
  const { 
    data: workflowHistory, 
    isLoading: isLoadingHistory 
  } = useQuery({
    queryKey: ['workflow-history', translationId],
    queryFn: async () => {
      const url = translationId 
        ? `/api/admin/translations/${translationId}/workflow/history`
        : '/api/admin/translations/workflow/history?limit=50';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch workflow history');
      return response.json();
    },
  });

  // Fetch workflow statistics
  const { data: workflowStats } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/translations/workflow/stats');
      if (!response.ok) throw new Error('Failed to fetch workflow stats');
      return response.json();
    },
  });

  // Status change mutation
  const statusChangeMutation = useMutation({
    mutationFn: async ({ 
      translationIds, 
      newStatus, 
      comment 
    }: { 
      translationIds: string[]; 
      newStatus: TranslationStatus; 
      comment?: string;
    }) => {
      const response = await fetch('/api/admin/translations/workflow/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translation_ids: translationIds,
          new_status: newStatus,
          comment,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update translation status');
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['workflow-pending-translations'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-history'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-stats'] });
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      
      onStatusChange?.(variables.newStatus);
      
      toast({
        title: t('admin.translation.statusUpdated'),
        description: t('admin.translation.statusUpdatedCount', { 
          count: variables.translationIds.length,
          status: t(`admin.translation.status.${variables.newStatus}`)
        }),
      });
      
      // Reset state
      setWorkflowAction(null);
      setShowActionDialog(false);
      setBulkComment('');
      setSelectedTranslations([]);
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.translation.statusUpdateFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle status change action
  const handleStatusChange = useCallback((
    translationIds: string[], 
    newStatus: TranslationStatus,
    requiresComment: boolean = false
  ) => {
    setWorkflowAction({
      action: 'status_change',
      translations: translationIds,
      comment: '',
      toStatus: newStatus
    });
    
    if (requiresComment || translationIds.length > 1) {
      setShowActionDialog(true);
    } else {
      statusChangeMutation.mutate({
        translationIds,
        newStatus
      });
    }
  }, [statusChangeMutation]);

  // Handle bulk action confirmation
  const handleConfirmAction = useCallback(() => {
    if (!workflowAction) return;
    
    statusChangeMutation.mutate({
      translationIds: workflowAction.translations,
      newStatus: workflowAction.toStatus,
      comment: bulkComment.trim() || undefined
    });
  }, [workflowAction, bulkComment, statusChangeMutation]);

  // Get available actions for a status
  const getAvailableActions = useCallback((currentStatus: TranslationStatus): WorkflowAction[] => {
    const allowedStatuses = WORKFLOW_RULES[currentStatus] || [];
    
    return allowedStatuses.map(status => ({
      id: `${currentStatus}_to_${status}`,
      type: 'status_change',
      from_status: currentStatus,
      to_status: status,
      requires_permission: status === 'published' ? ['publish_translations'] : [],
      requires_comment: status === 'draft' && currentStatus !== 'draft',
      notification_recipients: []
    }));
  }, []);

  // Get action label
  const getActionLabel = useCallback((action: WorkflowAction): string => {
    switch (action.to_status) {
      case 'review':
        return t('admin.translation.sendToReview');
      case 'approved':
        return t('admin.translation.approve');
      case 'published':
        return t('admin.translation.publish');
      case 'draft':
        return t('admin.translation.sendBackToDraft');
      default:
        return t('admin.translation.changeStatus');
    }
  }, [t]);

  // Get action icon
  const getActionIcon = useCallback((action: WorkflowAction) => {
    switch (action.to_status) {
      case 'review':
        return <Clock size={16} />;
      case 'approved':
        return <ThumbsUp size={16} />;
      case 'published':
        return <CheckCircle size={16} />;
      case 'draft':
        return <ThumbsDown size={16} />;
      default:
        return <ArrowRight size={16} />;
    }
  }, []);

  // Group translations by status
  const translationsByStatus = useMemo(() => {
    if (!pendingTranslations?.data) return {};
    
    return pendingTranslations.data.reduce((acc: Record<string, TranslationAdminItem[]>, translation: TranslationAdminItem) => {
      const status = translation.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(translation);
      return acc;
    }, {});
  }, [pendingTranslations]);

  // Handle selection change
  const handleSelectionChange = useCallback((translationId: string, checked: boolean) => {
    setSelectedTranslations(prev => 
      checked 
        ? [...prev, translationId]
        : prev.filter(id => id !== translationId)
    );
  }, []);

  const handleSelectAll = useCallback((status: TranslationStatus, checked: boolean) => {
    const statusTranslations = translationsByStatus[status] || [];
    const statusIds = statusTranslations.map(t => t.id);
    
    setSelectedTranslations(prev => {
      if (checked) {
        return [...new Set([...prev, ...statusIds])];
      } else {
        return prev.filter(id => !statusIds.includes(id));
      }
    });
  }, [translationsByStatus]);

  return (
    <div className={`translation-workflow-manager space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Users size={20} />
            {t('admin.translation.workflowManager')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.translation.workflowManagerDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTranslations.length > 0 && (
            <Badge variant="outline">
              {t('admin.translation.selectedItems', { count: selectedTranslations.length })}
            </Badge>
          )}
        </div>
      </div>

      {/* Workflow Statistics */}
      {workflowStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{workflowStats.pending_review}</div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.pendingReview')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">{workflowStats.approved_today}</div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.approvedToday')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{workflowStats.published_this_week}</div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.publishedThisWeek')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{workflowStats.avg_review_time}</div>
              <div className="text-xs text-muted-foreground">{t('admin.translation.avgReviewTime')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock size={16} />
            {t('admin.translation.pendingTranslations')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Activity size={16} />
            {t('admin.translation.workflowHistory')}
          </TabsTrigger>
        </TabsList>

        {/* Pending Translations Tab */}
        <TabsContent value="pending" className="space-y-6">
          {/* Bulk Actions */}
          {selectedTranslations.length > 0 && (
            <Card className="border-primary">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('admin.translation.selectedForAction', { count: selectedTranslations.length })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedTranslations, 'approved')}
                      className="min-h-[40px]"
                    >
                      <ThumbsUp size={14} className="mr-1" />
                      {t('admin.translation.bulkApprove')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedTranslations, 'draft', true)}
                      className="min-h-[40px]"
                    >
                      <ThumbsDown size={14} className="mr-1" />
                      {t('admin.translation.bulkReject')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTranslations([])}
                      className="min-h-[40px]"
                    >
                      {t('common.clearSelection')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Translations by Status */}
          <div className="space-y-6">
            {Object.entries(translationsByStatus).map(([status, translations]) => (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[status as TranslationStatus]}>
                        {t(`admin.translation.status.${status}`)}
                      </Badge>
                      <span className="text-lg">({translations.length})</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAll(
                        status as TranslationStatus, 
                        !translations.every(t => selectedTranslations.includes(t.id))
                      )}
                      className="min-h-[40px]"
                    >
                      {translations.every(t => selectedTranslations.includes(t.id)) 
                        ? t('common.deselectAll') 
                        : t('common.selectAll')
                      }
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={translations.every(t => selectedTranslations.includes(t.id))}
                              onChange={(e) => handleSelectAll(status as TranslationStatus, e.target.checked)}
                              className="rounded"
                            />
                          </TableHead>
                          <TableHead>{t('admin.translation.key')}</TableHead>
                          <TableHead>{t('admin.translation.locale')}</TableHead>
                          <TableHead>{t('admin.translation.value')}</TableHead>
                          <TableHead>{t('admin.translation.lastUpdated')}</TableHead>
                          <TableHead>{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {translations.map((translation) => (
                          <TableRow key={translation.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedTranslations.includes(translation.id)}
                                onChange={(e) => handleSelectionChange(translation.id, e.target.checked)}
                                className="rounded"
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-48 truncate" title={translation.translation_key.key}>
                              {translation.translation_key.key}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {translation.locale.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-64 truncate" title={translation.value}>
                              {translation.value || 
                                <span className="text-muted-foreground italic">
                                  {t('admin.translation.noValue')}
                                </span>
                              }
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateLocale(new Date(translation.updated_at), 'short')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getAvailableActions(translation.status).map((action) => (
                                  <Button
                                    key={action.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange([translation.id], action.to_status, action.requires_comment)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    {getActionIcon(action)}
                                    <span className="ml-1 hidden sm:inline">
                                      {getActionLabel(action)}
                                    </span>
                                  </Button>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {translations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                      <p>{t('admin.translation.noTranslationsInStatus', { status: t(`admin.translation.status.${status}`) })}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Workflow History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('admin.translation.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : workflowHistory?.data?.length > 0 ? (
                <div className="space-y-4">
                  {workflowHistory.data.map((event: any, index: number) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {event.action === 'approved' && <ThumbsUp size={20} className="text-green-600" />}
                        {event.action === 'rejected' && <ThumbsDown size={20} className="text-red-600" />}
                        {event.action === 'published' && <CheckCircle size={20} className="text-blue-600" />}
                        {event.action === 'review_requested' && <Clock size={20} className="text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {t(`admin.translation.workflowAction.${event.action}`, {
                                key: event.translation_key
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('admin.translation.by')} {event.performed_by} • {formatDateLocale(new Date(event.performed_at), 'datetime')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={STATUS_COLORS[event.from_status as TranslationStatus]}>
                              {t(`admin.translation.status.${event.from_status}`)}
                            </Badge>
                            <ArrowRight size={14} className="text-muted-foreground" />
                            <Badge variant="outline" className={STATUS_COLORS[event.to_status as TranslationStatus]}>
                              {t(`admin.translation.status.${event.to_status}`)}
                            </Badge>
                          </div>
                        </div>
                        {event.comment && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                            <MessageSquare size={14} className="inline mr-1" />
                            {event.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{t('admin.translation.noWorkflowHistory')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('admin.translation.confirmAction')}
            </DialogTitle>
            <DialogDescription>
              {workflowAction && t('admin.translation.confirmActionDescription', {
                count: workflowAction.translations.length,
                status: t(`admin.translation.status.${workflowAction.toStatus}`)
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">
                {t('admin.translation.comment')} 
                {workflowAction?.toStatus === 'draft' && 
                  <span className="text-red-500 ml-1">*</span>
                }
              </Label>
              <Textarea
                id="comment"
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                placeholder={t('admin.translation.commentPlaceholder')}
                className="min-h-[80px]"
              />
              {workflowAction?.toStatus === 'draft' && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.translation.commentRequired')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleConfirmAction}
              disabled={
                statusChangeMutation.isPending || 
                (workflowAction?.toStatus === 'draft' && !bulkComment.trim())
              }
            >
              {statusChangeMutation.isPending ? (
                <RefreshCw size={16} className="mr-2 animate-spin" />
              ) : (
                workflowAction && getActionIcon({ 
                  id: '', 
                  type: 'status_change', 
                  from_status: 'draft', 
                  to_status: workflowAction.toStatus,
                  requires_permission: [],
                  requires_comment: false,
                  notification_recipients: []
                })
              )}
              {workflowAction && getActionLabel({ 
                id: '', 
                type: 'status_change', 
                from_status: 'draft', 
                to_status: workflowAction.toStatus,
                requires_permission: [],
                requires_comment: false,
                notification_recipients: []
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TranslationWorkflowManager;