'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Clock, Timer, Hourglass, Zap } from 'lucide-react';

interface TimeEstimationDisplayProps {
  /** Estimated time in minutes */
  estimatedMinutes: number;
  /** Actual time spent (optional) */
  actualMinutes?: number;
  /** Show comparison when actual time is provided */
  showComparison?: boolean;
  /** Display format */
  format?: 'short' | 'long' | 'detailed';
  /** Show time category (quick/medium/long) */
  showCategory?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * TimeEstimationDisplay - Display component for SOP time estimations
 * 
 * Features:
 * - Multiple time formats
 * - Time category indicators
 * - Actual vs estimated comparison
 * - Color-coded time ranges
 * - Accessibility support
 */
const TimeEstimationDisplay: React.FC<TimeEstimationDisplayProps> = ({
  estimatedMinutes,
  actualMinutes,
  showComparison = true,
  format = 'short',
  showCategory = false,
  className
}) => {
  const t = useTranslations('sop.timeEstimation');

  const formatTime = (minutes: number, formatType: 'short' | 'long' | 'detailed') => {
    if (minutes < 60) {
      switch (formatType) {
        case 'short':
          return t('minutes.short', { count: minutes });
        case 'long':
          return t('minutes.long', { count: minutes });
        case 'detailed':
          return t('minutes.detailed', { count: minutes });
        default:
          return `${minutes}m`;
      }
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      switch (formatType) {
        case 'short':
          return remainingMinutes > 0 
            ? t('hoursMinutes.short', { hours, minutes: remainingMinutes })
            : t('hours.short', { count: hours });
        case 'long':
          return remainingMinutes > 0
            ? t('hoursMinutes.long', { hours, minutes: remainingMinutes })
            : t('hours.long', { count: hours });
        case 'detailed':
          return remainingMinutes > 0
            ? t('hoursMinutes.detailed', { hours, minutes: remainingMinutes })
            : t('hours.detailed', { count: hours });
        default:
          return `${hours}h ${remainingMinutes}m`;
      }
    }
  };

  const getTimeCategory = (minutes: number) => {
    if (minutes <= 5) return 'quick';
    if (minutes <= 15) return 'medium';
    if (minutes <= 30) return 'long';
    return 'extended';
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'quick':
        return {
          icon: Zap,
          color: 'text-jade-green',
          bgColor: 'bg-jade-green/10',
          borderColor: 'border-jade-green',
          label: t('categories.quick')
        };
      case 'medium':
        return {
          icon: Clock,
          color: 'text-golden-saffron',
          bgColor: 'bg-golden-saffron/10',
          borderColor: 'border-golden-saffron',
          label: t('categories.medium')
        };
      case 'long':
        return {
          icon: Timer,
          color: 'text-krong-red',
          bgColor: 'bg-krong-red/10',
          borderColor: 'border-krong-red',
          label: t('categories.long')
        };
      case 'extended':
        return {
          icon: Hourglass,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-600',
          label: t('categories.extended')
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-400',
          label: t('categories.unknown')
        };
    }
  };

  const getComparisonStatus = (estimated: number, actual: number) => {
    const ratio = actual / estimated;
    if (ratio <= 0.8) return 'faster';
    if (ratio <= 1.2) return 'onTime';
    if (ratio <= 1.5) return 'slower';
    return 'muchSlower';
  };

  const getComparisonColor = (status: string) => {
    switch (status) {
      case 'faster':
        return 'text-jade-green';
      case 'onTime':
        return 'text-golden-saffron';
      case 'slower':
        return 'text-krong-red';
      case 'muchSlower':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const timeCategory = getTimeCategory(estimatedMinutes);
  const categoryConfig = getCategoryConfig(timeCategory);
  const CategoryIcon = categoryConfig.icon;

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Main Time Display */}
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-2 border-2',
          showCategory ? categoryConfig.bgColor : 'bg-gray-50',
          showCategory ? categoryConfig.borderColor : 'border-gray-300',
          showCategory ? categoryConfig.color : 'text-gray-700'
        )}
      >
        <CategoryIcon className="w-4 h-4" />
        <span className="font-medium">
          {formatTime(estimatedMinutes, format)}
        </span>
      </Badge>

      {/* Category Badge */}
      {showCategory && (
        <Badge
          variant="secondary"
          className="text-tablet-xs"
        >
          {categoryConfig.label}
        </Badge>
      )}

      {/* Comparison Display */}
      {actualMinutes && showComparison && (
        <div className="flex items-center gap-1">
          <span className="text-tablet-xs text-muted-foreground">
            {t('actual')}:
          </span>
          <Badge
            variant="outline"
            className={cn(
              'text-tablet-xs',
              getComparisonColor(getComparisonStatus(estimatedMinutes, actualMinutes))
            )}
          >
            {formatTime(actualMinutes, 'short')}
          </Badge>
          
          {(() => {
            const status = getComparisonStatus(estimatedMinutes, actualMinutes);
            const difference = Math.abs(actualMinutes - estimatedMinutes);
            
            return (
              <Badge
                variant="outline"
                className={cn(
                  'text-tablet-xs',
                  getComparisonColor(status)
                )}
              >
                {status === 'faster' && `-${difference}m`}
                {status === 'onTime' && t('onTime')}
                {(status === 'slower' || status === 'muchSlower') && `+${difference}m`}
              </Badge>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default TimeEstimationDisplay;