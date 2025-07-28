'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronRight, 
  Home, 
  Clock, 
  User, 
  Calendar, 
  BookOpen,
  Star,
  Share2,
  Download,
  Edit,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Heart,
  QrCode
} from 'lucide-react';

interface BreadcrumbItem {
  id: string;
  label: string;
  path?: string;
  isActive?: boolean;
}

interface SOPDocument {
  id: string;
  title: string;
  title_fr: string;
  category: {
    id: string;
    name: string;
    name_fr: string;
    color: string;
  };
  version: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_read_time: number;
  tags: string[];
  created_by: string;
  updated_by: string;
  last_reviewed_at?: string;
  review_due_date?: string;
  created_at: string;
  updated_at: string;
}

interface UserProgress {
  progress_percentage: number;
  time_spent: number;
  last_accessed: string;
  is_bookmarked: boolean;
}

interface SOPDocumentHeaderProps {
  /** SOP document data */
  document: SOPDocument;
  /** Breadcrumb navigation items */
  breadcrumbs: BreadcrumbItem[];
  /** User progress data */
  userProgress?: UserProgress;
  /** Show document actions */
  showActions?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Show metadata */
  showMetadata?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback for breadcrumb navigation */
  onBreadcrumbClick?: (path: string) => void;
  /** Callback for bookmark toggle */
  onBookmarkToggle?: (documentId: string) => void;
  /** Callback for share action */
  onShare?: (documentId: string) => void;
  /** Callback for download action */
  onDownload?: (documentId: string) => void;
  /** Callback for edit action */
  onEdit?: (documentId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SOPDocumentHeader - Comprehensive header component for SOP documents
 * 
 * Features:
 * - Breadcrumb navigation with touch-friendly targets
 * - Document metadata display with bilingual support
 * - Progress tracking and user statistics
 * - Action buttons (bookmark, share, download, edit)
 * - Status and difficulty indicators
 * - Tablet-optimized responsive design
 * - Accessibility support with ARIA labels
 * 
 * @param props SOPDocumentHeaderProps
 * @returns JSX.Element
 */
const SOPDocumentHeader: React.FC<SOPDocumentHeaderProps> = ({
  document,
  breadcrumbs,
  userProgress,
  showActions = true,
  showProgress = true,
  showMetadata = true,
  isLoading = false,
  onBreadcrumbClick,
  onBookmarkToggle,
  onShare,
  onDownload,
  onEdit,
  className
}) => {
  const t = useTranslations('sop.document');
  const [showAllTags, setShowAllTags] = useState(false);

  const handleBreadcrumbClick = useCallback((item: BreadcrumbItem) => {
    if (item.path && onBreadcrumbClick) {
      onBreadcrumbClick(item.path);
    }
  }, [onBreadcrumbClick]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'review': return 'bg-golden-saffron';
      case 'approved': return 'bg-jade-green';
      case 'archived': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-jade-green';
      case 'intermediate': return 'bg-golden-saffron';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return t('timeFormat.minutes', { count: minutes });
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return t('timeFormat.hoursMinutes', { hours, minutes: remainingMinutes });
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <React.Fragment key={i}>
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              {i < 2 && <ChevronRight className="w-4 h-4 text-gray-300" />}
            </React.Fragment>
          ))}
        </div>

        {/* Header Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Breadcrumb Navigation */}
      <nav aria-label={t('breadcrumb.label')} className="flex items-center gap-2 flex-wrap">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.id}>
            <Button
              variant={item.isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => handleBreadcrumbClick(item)}
              disabled={item.isActive || !item.path}
              className={cn(
                "h-10 px-4 text-tablet-sm",
                item.isActive && "bg-krong-red text-krong-white"
              )}
              aria-current={item.isActive ? "page" : undefined}
            >
              {index === 0 && <Home className="w-4 h-4 mr-2" />}
              {item.label}
            </Button>
            {index < breadcrumbs.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Document Header Card */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Title and Action Row */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-tablet-2xl font-heading font-bold text-krong-black mb-2 leading-tight">
                  {document.title}
                </h1>
                
                {/* Category and Status Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge 
                    variant="secondary" 
                    className="text-tablet-sm"
                    style={{ backgroundColor: `${document.category.color}20`, color: document.category.color }}
                  >
                    {document.category.name}
                  </Badge>
                  
                  <Badge 
                    variant="outline"
                    className={cn("text-tablet-sm text-white", getStatusColor(document.status))}
                  >
                    {t(`status.${document.status}`)}
                  </Badge>
                  
                  <Badge 
                    variant="outline"
                    className={cn("text-tablet-sm text-white", getDifficultyColor(document.difficulty_level))}
                  >
                    {t(`difficulty.${document.difficulty_level}`)}
                  </Badge>
                  
                  <Badge variant="outline" className="text-tablet-sm">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(document.estimated_read_time)}
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              {showActions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant={userProgress?.is_bookmarked ? "default" : "outline"}
                    size="icon"
                    onClick={() => onBookmarkToggle?.(document.id)}
                    aria-label={t('actions.bookmark')}
                  >
                    <Heart className={cn(
                      "w-5 h-5",
                      userProgress?.is_bookmarked && "fill-current"
                    )} />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onShare?.(document.id)}
                    aria-label={t('actions.share')}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onDownload?.(document.id)}
                    aria-label={t('actions.download')}
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit?.(document.id)}
                    aria-label={t('actions.edit')}
                  >
                    <Edit className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t('actions.more')}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {showProgress && userProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm font-body text-muted-foreground">
                    {t('progress.label')}
                  </span>
                  <span className="text-tablet-sm font-body font-medium">
                    {userProgress.progress_percentage}%
                  </span>
                </div>
                <Progress 
                  value={userProgress.progress_percentage} 
                  className="h-3"
                />
                <div className="flex items-center justify-between text-tablet-xs text-muted-foreground">
                  <span>
                    {t('progress.timeSpent', { time: formatTime(userProgress.time_spent) })}
                  </span>
                  <span>
                    {t('progress.lastAccessed', { date: formatDate(userProgress.last_accessed) })}
                  </span>
                </div>
              </div>
            )}

            {/* Metadata */}
            {showMetadata && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t-2 border-border/40">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-tablet-xs text-muted-foreground">
                      {t('metadata.createdBy')}
                    </p>
                    <p className="text-tablet-sm font-body font-medium">
                      {document.created_by}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-tablet-xs text-muted-foreground">
                      {t('metadata.created')}
                    </p>
                    <p className="text-tablet-sm font-body font-medium">
                      {formatDate(document.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-tablet-xs text-muted-foreground">
                      {t('metadata.version')}
                    </p>
                    <p className="text-tablet-sm font-body font-medium">
                      {document.version}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {document.review_due_date && new Date(document.review_due_date) < new Date() ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-jade-green" />
                  )}
                  <div>
                    <p className="text-tablet-xs text-muted-foreground">
                      {t('metadata.reviewDue')}
                    </p>
                    <p className={cn(
                      "text-tablet-sm font-body font-medium",
                      document.review_due_date && new Date(document.review_due_date) < new Date() 
                        ? "text-red-500" 
                        : "text-jade-green"
                    )}>
                      {document.review_due_date 
                        ? formatDate(document.review_due_date)
                        : t('metadata.upToDate')
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {document.tags.length > 0 && (
              <div className="pt-4 border-t-2 border-border/40">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-tablet-sm font-body font-medium text-krong-black">
                    {t('tags.label')}
                  </h3>
                  {document.tags.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllTags(!showAllTags)}
                      className="text-tablet-xs"
                    >
                      {showAllTags ? t('tags.showLess') : t('tags.showMore')}
                    </Button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(showAllTags ? document.tags : document.tags.slice(0, 5)).map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-tablet-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {!showAllTags && document.tags.length > 5 && (
                    <Badge variant="outline" className="text-tablet-xs">
                      +{document.tags.length - 5}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SOPDocumentHeader;