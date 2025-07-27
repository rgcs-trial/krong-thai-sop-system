'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  Clock, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Target,
  Brain,
  ChevronRight,
  Sparkles,
  BookOpen,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSOPStore } from '@/lib/stores/sop-store';
import { useAuthStore } from '@/lib/stores/auth-store';

interface RecommendationItem {
  id: string;
  type: 'document' | 'category';
  title: string;
  title_th: string;
  description?: string;
  description_th?: string;
  reason: 'role-based' | 'recent-activity' | 'trending' | 'critical' | 'related' | 'completion';
  score: number;
  category?: {
    id: string;
    name: string;
    name_th: string;
    color: string;
  };
  metadata?: {
    viewCount?: number;
    lastViewed?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    estimatedReadTime?: number;
    completionRate?: number;
  };
}

interface SOPRecommendationsProps {
  locale: string;
  onItemClick: (item: RecommendationItem) => void;
  maxItems?: number;
  showReasons?: boolean;
  compact?: boolean;
  className?: string;
}

// Mock recommendations data - in real app this would come from API/ML service
const generateMockRecommendations = (userRole: string, locale: string): RecommendationItem[] => {
  const baseRecommendations: Omit<RecommendationItem, 'score'>[] = [
    {
      id: 'rec-1',
      type: 'document',
      title: 'Food Safety Temperature Control',
      title_th: 'การควบคุมอุณหภูมิความปลอดภัยอาหาร',
      description: 'Critical procedures for maintaining safe food temperatures',
      description_th: 'ขั้นตอนสำคัญในการรักษาอุณหภูมิอาหารให้ปลอดภัย',
      reason: 'critical',
      category: {
        id: 'cat-1',
        name: 'Food Safety',
        name_th: 'ความปลอดภัยอาหาร',
        color: '#E31B23'
      },
      metadata: {
        priority: 'critical',
        estimatedReadTime: 5,
        viewCount: 234,
        completionRate: 0.92
      }
    },
    {
      id: 'rec-2',
      type: 'document',
      title: 'Kitchen Equipment Cleaning Protocol',
      title_th: 'ขั้นตอนการทำความสะอาดอุปกรณ์ครัว',
      description: 'Daily cleaning procedures for kitchen equipment',
      description_th: 'ขั้นตอนการทำความสะอาดอุปกรณ์ครัวรายวัน',
      reason: 'role-based',
      category: {
        id: 'cat-2',
        name: 'Cleaning & Sanitation',
        name_th: 'การทำความสะอาดและสุขาภิบาล',
        color: '#008B8B'
      },
      metadata: {
        priority: 'high',
        estimatedReadTime: 8,
        viewCount: 156,
        completionRate: 0.87
      }
    },
    {
      id: 'rec-3',
      type: 'document',
      title: 'Customer Service Excellence',
      title_th: 'ความเป็นเลิศในการบริการลูกค้า',
      description: 'Best practices for exceptional customer service',
      description_th: 'แนวปฏิบัติที่ดีที่สุดสำหรับการบริการลูกค้าที่ยอดเยียม',
      reason: 'trending',
      category: {
        id: 'cat-3',
        name: 'Customer Service',
        name_th: 'การบริการลูกค้า',
        color: '#D4AF37'
      },
      metadata: {
        priority: 'medium',
        estimatedReadTime: 12,
        viewCount: 89,
        completionRate: 0.78
      }
    },
    {
      id: 'rec-4',
      type: 'category',
      title: 'Emergency Procedures',
      title_th: 'ขั้นตอนฉุกเฉิน',
      description: 'Critical emergency response protocols',
      description_th: 'ขั้นตอนการตอบสนองฉุกเฉินที่สำคัญ',
      reason: 'critical',
      category: {
        id: 'cat-4',
        name: 'Safety & Emergency',
        name_th: 'ความปลอดภัยและฉุกเฉิน',
        color: '#FF4444'
      },
      metadata: {
        priority: 'critical',
        viewCount: 45,
        completionRate: 0.95
      }
    },
    {
      id: 'rec-5',
      type: 'document',
      title: 'Menu Knowledge Training',
      title_th: 'การฝึกอบรมความรู้เมนู',
      description: 'Complete guide to menu items and ingredients',
      description_th: 'คู่มือฉบับสมบูรณ์เกี่ยวกับรายการอาหารและส่วนผสม',
      reason: 'role-based',
      category: {
        id: 'cat-5',
        name: 'Training',
        name_th: 'การฝึกอบรม',
        color: '#9B59B6'
      },
      metadata: {
        priority: 'medium',
        estimatedReadTime: 20,
        viewCount: 67,
        completionRate: 0.82
      }
    }
  ];

  // Score based on user role and other factors
  return baseRecommendations.map(item => {
    let score = 50; // Base score

    // Role-based scoring
    if (userRole === 'admin' || userRole === 'manager') {
      if (item.reason === 'critical' || item.metadata?.priority === 'critical') {
        score += 30;
      }
      if (item.type === 'category') {
        score += 15; // Managers prefer overview
      }
    } else if (userRole === 'staff') {
      if (item.reason === 'role-based') {
        score += 25;
      }
      if (item.type === 'document') {
        score += 10; // Staff prefer specific procedures
      }
    }

    // Activity-based scoring
    if (item.metadata?.viewCount) {
      score += Math.min(item.metadata.viewCount / 10, 20);
    }

    // Completion rate bonus
    if (item.metadata?.completionRate) {
      score += item.metadata.completionRate * 15;
    }

    // Trending boost
    if (item.reason === 'trending') {
      score += 20;
    }

    return { ...item, score };
  }).sort((a, b) => b.score - a.score);
};

export default function SOPRecommendations({
  locale,
  onItemClick,
  maxItems = 5,
  showReasons = true,
  compact = false,
  className
}: SOPRecommendationsProps) {
  const t = useTranslations();
  const { user } = useAuthStore();
  const { recentlyViewedDocuments } = useSOPStore();
  
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);

  // Generate recommendations based on user context
  useEffect(() => {
    const userRole = user?.role || 'staff';
    const generated = generateMockRecommendations(userRole, locale);
    setRecommendations(generated.slice(0, maxItems));
  }, [user?.role, locale, maxItems]);

  // Get reason icon and text
  const getReasonInfo = (reason: RecommendationItem['reason']) => {
    switch (reason) {
      case 'role-based':
        return {
          icon: Target,
          text: t('recommendations.roleBasedReason'),
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'recent-activity':
        return {
          icon: Clock,
          text: t('recommendations.recentActivityReason'),
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'trending':
        return {
          icon: TrendingUp,
          text: t('recommendations.trendingReason'),
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        };
      case 'critical':
        return {
          icon: AlertTriangle,
          text: t('recommendations.criticalReason'),
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      case 'related':
        return {
          icon: Brain,
          text: t('recommendations.relatedReason'),
          color: 'text-orange-600',
          bgColor: 'bg-orange-50'
        };
      case 'completion':
        return {
          icon: Star,
          text: t('recommendations.completionReason'),
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        };
      default:
        return {
          icon: Sparkles,
          text: t('recommendations.recommendedReason'),
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  // Format read time
  const formatReadTime = (minutes: number) => {
    if (minutes < 1) return t('recommendations.lessThanMinute');
    if (minutes === 1) return t('recommendations.oneMinute');
    return t('recommendations.minutesRead', { minutes });
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <CardTitle className={cn(
          "flex items-center gap-2",
          compact ? "text-base" : "text-lg"
        )}>
          <Brain className={cn("text-brand-red", compact ? "w-4 h-4" : "w-5 h-5")} />
          {t('recommendations.title')}
          <Badge variant="secondary" className="ml-auto">
            {recommendations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className={cn("space-y-3", compact && "space-y-2")}>
        {recommendations.map((item, index) => {
          const reasonInfo = getReasonInfo(item.reason);
          const Icon = reasonInfo.icon;
          const title = locale === 'fr' ? item.title_fr : item.title;
          const description = locale === 'fr' ? item.description_fr : item.description;
          
          return (
            <div key={item.id}>
              <button
                onClick={() => onItemClick(item)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border hover:shadow-md transition-all hover:scale-[1.01]",
                  "bg-white hover:bg-gray-50",
                  compact && "p-2"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Item Type Indicator */}
                  <div className={cn(
                    "flex-shrink-0 rounded-full p-2",
                    item.type === 'document' ? "bg-blue-50" : "bg-green-50"
                  )}>
                    {item.type === 'document' ? (
                      <BookOpen className={cn(
                        "text-blue-600",
                        compact ? "w-3 h-3" : "w-4 h-4"
                      )} />
                    ) : (
                      <Users className={cn(
                        "text-green-600",
                        compact ? "w-3 h-3" : "w-4 h-4"
                      )} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Title and Category */}
                    <div className="flex items-start justify-between mb-1">
                      <h3 className={cn(
                        "font-semibold text-gray-900 line-clamp-1",
                        compact ? "text-sm" : "text-base",
                        locale === 'fr' && "font-ui"
                      )}>
                        {title}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                    
                    {/* Category Badge */}
                    {item.category && (
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.category.color }}
                        />
                        <span className={cn(
                          "text-xs text-gray-600",
                          locale === 'fr' && "font-ui"
                        )}>
                          {locale === 'fr' ? item.category.name_fr : item.category.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Description */}
                    {description && !compact && (
                      <p className={cn(
                        "text-sm text-gray-600 line-clamp-2 mb-2",
                        locale === 'fr' && "font-ui"
                      )}>
                        {description}
                      </p>
                    )}
                    
                    {/* Metadata Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {/* Read Time */}
                        {item.metadata?.estimatedReadTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatReadTime(item.metadata.estimatedReadTime)}
                          </div>
                        )}
                        
                        {/* Priority */}
                        {item.metadata?.priority && (
                          <Badge 
                            variant={item.metadata.priority === 'critical' ? 'destructive' : 'secondary'}
                            className="text-xs px-1 py-0"
                          >
                            {t(`sop.priority.${item.metadata.priority}`)}
                          </Badge>
                        )}
                        
                        {/* Completion Rate */}
                        {item.metadata?.completionRate && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {Math.round(item.metadata.completionRate * 100)}%
                          </div>
                        )}
                      </div>
                      
                      {/* Reason Badge */}
                      {showReasons && (
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                          reasonInfo.bgColor,
                          reasonInfo.color
                        )}>
                          <Icon className="w-3 h-3" />
                          {!compact && reasonInfo.text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              
              {index < recommendations.length - 1 && (
                <Separator className="mt-3" />
              )}
            </div>
          );
        })}
        
        {/* Show More Button */}
        {recommendations.length >= maxItems && (
          <div className="pt-2">
            <Button 
              variant="ghost" 
              className="w-full justify-center"
              size={compact ? "sm" : "default"}
            >
              <Zap className="w-4 h-4 mr-2" />
              {t('recommendations.showMore')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}