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
  Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SOPCategory } from './sop-categories-dashboard';

// SOP Document data structure based on database schema
export interface SOPDocument {
  id: string;
  category_id: string;
  title: string;
  title_th: string;
  content: string;
  content_th: string;
  steps: Array<{
    id: number;
    title: string;
    description: string;
    warning?: string;
    tip?: string;
  }>;
  steps_th: Array<{
    id: number;
    title: string;
    description: string;
    warning?: string;
    tip?: string;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  tags: string[];
  tags_th: string[];
  version: number;
  status: 'draft' | 'review' | 'approved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  effective_date: string;
  review_date: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

// Mock SOP document data
const mockSOPDocument: SOPDocument = {
  id: '1',
  category_id: '1',
  title: 'Food Temperature Control and Monitoring',
  title_th: 'การควบคุมและตรวจสอบอุณหภูมิอาหาร',
  content: 'This SOP outlines the proper procedures for monitoring and controlling food temperatures to ensure food safety and prevent foodborne illnesses.',
  content_th: 'มาตรฐานการปฏิบัติงานนี้อธิบายขั้นตอนที่ถูกต้องในการตรวจสอบและควบคุมอุณหภูมิอาหารเพื่อรับประกันความปลอดภัยของอาหารและป้องกันโรคที่เกิดจากอาหาร',
  steps: [
    {
      id: 1,
      title: 'Check refrigerator temperature',
      description: 'Use a calibrated thermometer to check that refrigerator temperature is between 32-40°F (0-4°C). Record temperature every 2 hours.',
      warning: 'If temperature exceeds 40°F (4°C), immediately move perishable items to another refrigerator and contact maintenance.',
      tip: 'Place thermometer in the warmest part of the refrigerator for accurate readings.'
    },
    {
      id: 2,
      title: 'Monitor hot food holding temperature',
      description: 'Ensure hot foods are maintained at 140°F (60°C) or above. Use a probe thermometer to check core temperature.',
      warning: 'Foods held below 140°F (60°C) for more than 2 hours must be discarded.',
      tip: 'Stir foods regularly to ensure even temperature distribution.'
    },
    {
      id: 3,
      title: 'Record temperature logs',
      description: 'Document all temperature readings in the temperature log book with time, date, and staff initials.',
      tip: 'Keep logs organized by date and review daily for any temperature violations.'
    }
  ],
  steps_th: [
    {
      id: 1,
      title: 'ตรวจสอบอุณหภูมิตู้เย็น',
      description: 'ใช้เทอร์โมมิเตอร์ที่ปรับเทียบแล้วตรวจสอบให้แน่ใจว่าอุณหภูมิตู้เย็นอยู่ระหว่าง 32-40°F (0-4°C) บันทึกอุณหภูมิทุก 2 ชั่วโมง',
      warning: 'หากอุณหภูมิเกิน 40°F (4°C) ให้ย้ายอาหารที่เสียง่ายไปยังตู้เย็นอื่นทันทีและติดต่อแผนกซ่อมบำรุง',
      tip: 'วางเทอร์โมมิเตอร์ในส่วนที่อบอุ่นที่สุดของตู้เย็นเพื่อการอ่านที่แม่นยำ'
    },
    {
      id: 2,
      title: 'ตรวจสอบอุณหภูมิการเก็บอาหารร้อน',
      description: 'ให้แน่ใจว่าอาหารร้อนเก็บรักษาไว้ที่ 140°F (60°C) หรือสูงกว่า ใช้เทอร์โมมิเตอร์แบบแทงตรวจสอบอุณหภูมิแกนกลาง',
      warning: 'อาหารที่เก็บไว้ต่ำกว่า 140°F (60°C) นานกว่า 2 ชั่วโมงต้องทิ้ง',
      tip: 'คนอาหารเป็นประจำเพื่อให้การกระจายอุณหภูมิสม่ำเสมอ'
    },
    {
      id: 3,
      title: 'บันทึกบันทึกอุณหภูมิ',
      description: 'บันทึกการอ่านอุณหภูมิทั้งหมดในสมุดบันทึกอุณหภูมิพร้อมเวลา วันที่ และอักษรย่อของพนักงาน',
      tip: 'เก็บบันทึกให้เป็นระเบียบตามวันที่และตรวจสอบรายวันสำหรับการละเมิดอุณหภูมิใดๆ'
    }
  ],
  attachments: [
    {
      id: '1',
      name: 'Temperature_Log_Sheet.pdf',
      url: '/documents/temperature-log.pdf',
      type: 'pdf',
      size: 245760
    },
    {
      id: '2',
      name: 'Thermometer_Calibration_Guide.pdf',
      url: '/documents/thermometer-calibration.pdf',
      type: 'pdf',
      size: 512000
    }
  ],
  tags: ['food safety', 'temperature', 'monitoring', 'kitchen'],
  tags_th: ['ความปลอดภัยอาหาร', 'อุณหภูมิ', 'การตรวจสอบ', 'ครัว'],
  version: 2,
  status: 'approved',
  priority: 'high',
  effective_date: '2024-01-01',
  review_date: '2024-06-01',
  created_by: 'Chef Manager',
  approved_by: 'Restaurant Manager',
  approved_at: '2024-01-15T10:30:00Z',
  created_at: '2024-01-10T09:00:00Z',
  updated_at: '2024-01-15T10:30:00Z'
};

interface SOPDocumentViewerProps {
  locale: string;
  document?: SOPDocument;
  category?: SOPCategory;
  onBack: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigate?: {
    prev: boolean;
    next: boolean;
  };
}

export function SOPDocumentViewer({
  locale,
  document = mockSOPDocument,
  category,
  onBack,
  onNavigate,
  canNavigate = { prev: false, next: false }
}: SOPDocumentViewerProps) {
  const t = useTranslations();
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  // Get localized content
  const title = locale === 'th' ? document.title_th : document.title;
  const content = locale === 'th' ? document.content_th : document.content;
  const steps = locale === 'th' ? document.steps_th : document.steps;
  const tags = locale === 'th' ? document.tags_th : document.tags;

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

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // In real app, update localStorage or API
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                locale === 'th' && "font-thai"
              )}>
                {title}
              </h1>
              {category && (
                <p className={cn(
                  "text-sm text-gray-600",
                  locale === 'th' && "font-thai"
                )}>
                  {locale === 'th' ? category.name_th : category.name}
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
              onClick={toggleFavorite}
              className={cn(
                "flex items-center gap-2",
                isFavorite && "bg-red-50 border-red-200 text-red-700"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
              {isFavorite ? t('sop.removeFromFavorites') : t('sop.addToFavorites')}
            </Button>
            
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              {t('sop.downloadPdf')}
            </Button>
            
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Print className="w-4 h-4" />
              {t('sop.printSop')}
            </Button>
            
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              {t('sop.shareSop')}
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
                <span>{document.created_by}</span>
              </div>
              
              {document.approved_by && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{t('sop.approvedBy')}:</span>
                  <span>{document.approved_by}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">{t('sop.tags')}:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
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
              locale === 'th' && "font-thai"
            )}>
              {content}
            </p>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-brand-red" />
              {t('sop.steps')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="border rounded-lg p-4 bg-gray-50">
                <div 
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                >
                  <div className="w-8 h-8 bg-brand-red text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-semibold text-brand-black mb-2",
                      locale === 'th' && "font-thai"
                    )}>
                      {step.title}
                    </h4>
                    <p className={cn(
                      "text-gray-700 leading-relaxed mb-3",
                      locale === 'th' && "font-thai"
                    )}>
                      {step.description}
                    </p>
                    
                    {/* Warning */}
                    {step.warning && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className={cn(
                              "text-red-800 text-sm font-medium mb-1",
                              locale === 'th' && "font-thai"
                            )}>
                              {t('common.warning')}
                            </p>
                            <p className={cn(
                              "text-red-700 text-sm",
                              locale === 'th' && "font-thai"
                            )}>
                              {step.warning}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Tip */}
                    {step.tip && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className={cn(
                              "text-blue-800 text-sm font-medium mb-1",
                              locale === 'th' && "font-thai"
                            )}>
                              {t('sop.tips')}
                            </p>
                            <p className={cn(
                              "text-blue-700 text-sm",
                              locale === 'th' && "font-thai"
                            )}>
                              {step.tip}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Attachments */}
        {document.attachments.length > 0 && (
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