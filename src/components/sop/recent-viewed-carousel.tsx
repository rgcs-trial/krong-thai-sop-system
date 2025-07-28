'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock, BookOpen, X } from 'lucide-react';

interface RecentSOP {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedTime: number;
  progress: number;
  lastAccessed: string;
  thumbnail?: string;
}

interface RecentViewedCarouselProps {
  /** List of recently viewed SOPs */
  recentSOPs: RecentSOP[];
  /** Maximum items to show */
  maxItems?: number;
  /** Show progress indicators */
  showProgress?: boolean;
  /** Auto-scroll interval (0 = disabled) */
  autoScrollInterval?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when SOP is selected */
  onSOPSelect?: (sopId: string) => void;
  /** Callback when item is removed from recent */
  onRemoveRecent?: (sopId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * RecentViewedCarousel - Horizontal carousel of recently viewed SOPs
 */
const RecentViewedCarousel: React.FC<RecentViewedCarouselProps> = ({
  recentSOPs,
  maxItems = 10,
  showProgress = true,
  autoScrollInterval = 0,
  isLoading = false,
  onSOPSelect,
  onRemoveRecent,
  className
}) => {
  const t = useTranslations('sop.recentViewed');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    );
  }, []);

  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollBy({ left: -300, behavior: 'smooth' });
    setTimeout(checkScrollButtons, 300);
  }, [checkScrollButtons]);

  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollBy({ left: 300, behavior: 'smooth' });
    setTimeout(checkScrollButtons, 300);
  }, [checkScrollButtons]);

  const formatLastAccessed = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return t('justNow');
    } else if (diffInHours < 24) {
      return t('hoursAgo', { count: Math.floor(diffInHours) });
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return t('daysAgo', { count: diffInDays });
    }
  }, [t]);

  const displayedSOPs = recentSOPs.slice(0, maxItems);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardHeader className="pb-3">
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-72 h-32 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayedSOPs.length === 0) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-12 text-center">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
            {t('emptyState.title')}
          </h3>
          <p className="text-tablet-base font-body text-muted-foreground">
            {t('emptyState.description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('title')}
            <Badge variant="secondary" className="text-tablet-xs">
              {displayedSOPs.length}
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              aria-label={t('scrollLeft')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon-sm"
              onClick={scrollRight}
              disabled={!canScrollRight}
              aria-label={t('scrollRight')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={checkScrollButtons}
        >
          {displayedSOPs.map((sop) => (
            <Card
              key={sop.id}
              className="flex-shrink-0 w-72 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2"
              onClick={() => onSOPSelect?.(sop.id)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-tablet-base font-body font-medium text-krong-black line-clamp-2">
                        {sop.title}
                      </h4>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-tablet-xs">
                          {sop.category}
                        </Badge>
                        
                        <div className="flex items-center gap-1 text-tablet-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {sop.estimatedTime}m
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRecent?.(sop.id);
                      }}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      aria-label={t('removeFromRecent')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  {showProgress && sop.progress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-tablet-xs text-muted-foreground">
                        <span>{t('progress')}</span>
                        <span>{sop.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-krong-red h-2 rounded-full transition-all duration-300"
                          style={{ width: `${sop.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Last Accessed */}
                  <div className="flex items-center justify-between text-tablet-xs text-muted-foreground">
                    <span>{formatLastAccessed(sop.lastAccessed)}</span>
                    <Badge 
                      variant="outline" 
                      className="text-tablet-xs"
                    >
                      {t(`difficulty.${sop.difficulty}`)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentViewedCarousel;