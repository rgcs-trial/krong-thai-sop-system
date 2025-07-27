'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, 
  Star, 
  Download, 
  Printer as Print, 
  Share2, 
  Heart,
  Clock,
  User,
  Calendar,
  Tag,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  FileText,
  Eye,
  Bookmark,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSOPDocument } from '@/lib/hooks/use-sop-queries';
import { useFavorites } from '@/hooks/use-favorites';
import { SOPCategory } from '@/types/database';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';

// SOP Document data structure based on database schema
export interface SOPDocumentStep {
  step: number;
  action: string;
  note?: string;
  duration?: string;
  warning?: string;
  tools?: string[];
  image?: string;
}

export interface SOPDocument {
  id: string;
  category_id: string;
  restaurant_id: string;
  title: string;
  title_th: string;
  content: string;
  content_th: string;
  steps?: SOPDocumentStep[];
  steps_th?: SOPDocumentStep[];
  attachments: string[];
  tags?: string[];
  tags_th?: string[];
  version: number;
  status: 'draft' | 'review' | 'approved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  effective_date?: string;
  review_date?: string;
  created_by: string;
  updated_by?: string;
  approved_by?: string;
  approved_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: SOPCategory;
  creator?: {
    id: string;
    full_name: string;
    full_name_th?: string;
  };
  approver?: {
    id: string;
    full_name: string;
    full_name_th?: string;
  };
}


interface SOPDocumentViewerProps {
  locale: string;
  documentId: string;
  categoryId?: string;
  onBack: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigate?: {
    prev: boolean;
    next: boolean;
  };
  className?: string;
}

export function SOPDocumentViewer({
  locale,
  documentId,
  categoryId,
  onBack,
  onNavigate,
  canNavigate = { prev: false, next: false },
  className
}: SOPDocumentViewerProps) {
  const t = useTranslations();
  const user = useAuthStore(state => state.user);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  
  // Fetch document data from Supabase
  const {
    data: document,
    isLoading,
    error,
    refetch
  } = useSOPDocument(documentId, {
    includeRelated: true,
    markAsViewed: true
  });
  
  // Favorites management
  const { 
    isFavorite, 
    toggleFavorite, 
    isLoading: favoritesLoading 
  } = useFavorites('document', documentId);

  // Get localized content
  const title = document ? (locale === 'fr' ? document.title_fr : document.title) : '';
  const content = document ? (locale === 'fr' ? document.content_fr : document.content) : '';
  const steps = document ? (locale === 'fr' ? document.steps_fr : document.steps) : [];
  const tags = document ? (locale === 'fr' ? document.tags_fr : document.tags) : [];
  const category = document?.category;
  
  // Get creator and approver names
  const creatorName = document?.creator ? 
    (locale === 'fr' ? document.creator.full_name_fr || document.creator.full_name : document.creator.full_name) : 
    document?.created_by || '';
    
  const approverName = document?.approver ? 
    (locale === 'fr' ? document.approver.full_name_fr || document.approver.full_name : document.approver.full_name) : 
    document?.approved_by || '';

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#E74C3C';
      case 'high': return '#E31B23';
      case 'medium': return '#F39C12';
      case 'low': return '#27AE60';
      default: return '#95A5A6';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#27AE60';
      case 'review': return '#F39C12';
      case 'draft': return '#95A5A6';
      case 'archived': return '#E74C3C';
      default: return '#95A5A6';
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite();
      toast({
        title: isFavorite ? t('sop.removeFromFavorites') : t('sop.addToFavorites'),
        description: isFavorite ? 
          t('sop.removedFromFavorites') : 
          t('sop.addedToFavorites'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.general'),
        variant: 'destructive'
      });
    }
  };
  
  const handleDownloadPdf = async () => {
    if (!document) return;
    
    try {
      const response = await fetch(`/api/sop/documents/${documentId}/pdf?language=${locale}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: t('common.success'),
          description: t('sop.pdfDownloaded')
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.downloadFailed'),
        variant: 'destructive'
      });
    }
  };
  
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };
  
  const handleShare = async () => {
    if (!document) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: content.substring(0, 200) + '...',
          url: window.location.href
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: t('common.success'),
          description: t('sop.linkCopied')
        });
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: t('common.success'),
        description: t('sop.linkCopied')
      });
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
          <p className={cn("text-gray-600", locale === 'fr' && "font-ui")}>
            {t('sop.loading')}
          </p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className={cn("text-xl font-semibold text-gray-900 mb-2", locale === 'fr' && "font-ui")}>
            {t('common.error')}
          </h2>
          <p className={cn("text-gray-600 mb-4", locale === 'fr' && "font-ui")}>
            {error?.message || t('sop.documentNotFound')}
          </p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('sop.backToCategories')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="w-10 h-10"
              aria-label={t('sop.backToCategories')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <h1 className={cn(
                "text-xl md:text-2xl font-bold text-brand-black truncate",
                locale === 'fr' && "font-ui"
              )}>
                {title}
              </h1>
              {category && (
                <p className={cn(
                  "text-sm text-gray-600",
                  locale === 'fr' && "font-ui"
                )}>
                  {locale === 'fr' ? category.name_fr : category.name}
                </p>
              )}
            </div>

            {/* Navigation arrows */}
            {onNavigate && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onNavigate('prev')}
                  disabled={!canNavigate.prev}
                  className="w-10 h-10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onNavigate('next')}
                  disabled={!canNavigate.next}
                  className="w-10 h-10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleToggleFavorite}
              disabled={favoritesLoading}
              className={cn(
                "flex items-center gap-2 min-w-[44px] min-h-[44px]",
                isFavorite && "bg-red-50 border-red-200 text-red-700"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
              <span className={cn("hidden sm:inline", locale === 'fr' && "font-ui")}>
                {isFavorite ? t('sop.removeFromFavorites') : t('sop.addToFavorites')}
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 min-w-[44px] min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span className={cn("hidden sm:inline", locale === 'fr' && "font-ui")}>
                {t('sop.downloadPdf')}
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="flex items-center gap-2 min-w-[44px] min-h-[44px]"
            >
              <Print className="w-4 h-4" />
              <span className={cn("hidden sm:inline", locale === 'fr' && "font-ui")}>
                {t('sop.printSop')}
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShare}
              className="flex items-center gap-2 min-w-[44px] min-h-[44px]"
            >
              <Share2 className="w-4 h-4" />
              <span className={cn("hidden sm:inline", locale === 'fr' && "font-ui")}>
                {t('sop.shareSop')}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Document Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-red" />
              {t('sop.sopDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status and Priority */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('sop.status')}:</span>
                <Badge 
                  variant="secondary"
                  style={{ 
                    backgroundColor: `${getStatusColor(document.status)}15`,
                    color: getStatusColor(document.status)
                  }}
                >
                  {t(`sop.${document.status}`)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('sop.priority')}:</span>
                <Badge 
                  variant="secondary"
                  style={{ 
                    backgroundColor: `${getPriorityColor(document.priority)}15`,
                    color: getPriorityColor(document.priority)
                  }}
                >
                  {t(`sop.${document.priority}`)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('sop.version')}:</span>
                <Badge variant="outline">v{document.version}</Badge>
              </div>
            </div>

            {/* Dates and People */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{t('sop.effectiveDate')}:</span>
                <span>{document.effective_date}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{t('sop.reviewDate')}:</span>
                <span>{document.review_date}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{t('sop.createdBy')}:</span>
                <span className={cn(locale === 'fr' && "font-ui")}>{creatorName}</span>
              </div>
              
              {approverName && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{t('sop.approvedBy')}:</span>
                  <span className={cn(locale === 'fr' && "font-ui")}>{approverName}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">{t('sop.tags')}:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className={cn("text-xs", locale === 'fr' && "font-ui")}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('common.overview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              "text-gray-700 leading-relaxed",
              locale === 'fr' && "font-ui"
            )}>
              {content}
            </p>
          </CardContent>
        </Card>

        {/* Steps */}
        {steps && steps.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-brand-red" />
                {t('sop.steps')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((step, index) => (
              <div key={step.step || index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-red text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1 min-w-[40px]">
                    {step.step || index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-semibold text-brand-black mb-2 text-base",
                      locale === 'fr' && "font-ui"
                    )}>
                      {step.action}
                    </h4>
                    {step.note && (
                      <p className={cn(
                        "text-gray-700 leading-relaxed mb-3",
                        locale === 'fr' && "font-ui"
                      )}>
                        {step.note}
                      </p>
                    )}
                    
                    {step.duration && (
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className={cn("text-sm text-blue-700 font-medium", locale === 'fr' && "font-ui")}>
                          {t('sop.duration')}: {step.duration}
                        </span>
                      </div>
                    )}
                    
                    {step.tools && step.tools.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-600 mb-1 block">{t('sop.tools')}:</span>
                        <div className="flex flex-wrap gap-1">
                          {step.tools.map((tool, toolIndex) => (
                            <Badge key={toolIndex} variant="secondary" className={cn("text-xs", locale === 'fr' && "font-ui")}>
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Warning */}
                    {step.warning && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className={cn(
                              "text-red-800 text-sm font-medium mb-1",
                              locale === 'fr' && "font-ui"
                            )}>
                              {t('common.warning')}
                            </p>
                            <p className={cn(
                              "text-red-700 text-sm",
                              locale === 'fr' && "font-ui"
                            )}>
                              {step.warning}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Image attachment */}
                    {step.image && (
                      <div className="mt-3">
                        <img 
                          src={step.image} 
                          alt={step.action}
                          className="max-w-full h-auto rounded-lg border"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {document.attachments && document.attachments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-brand-red" />
                {t('sop.attachments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {document.attachments.map((attachment) => (
                  <div 
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Paperclip className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {attachment.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default SOPDocumentViewer;