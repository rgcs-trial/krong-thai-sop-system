'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause,
  AlertTriangle,
  SkipForward
} from 'lucide-react';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'overdue';

interface TaskStatusIndicatorsProps {
  /** Current task status */
  status: TaskStatus;
  /** Show status label */
  showLabel?: boolean;
  /** Show status icon */
  showIcon?: boolean;
  /** Variant size */
  size?: 'sm' | 'md' | 'lg';
  /** Animate status changes */
  animate?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * TaskStatusIndicators - Visual status indicators for SOP tasks
 * 
 * Features:
 * - Color-coded status indicators
 * - Icon and text combinations
 * - Multiple size variants
 * - Smooth animations
 * - Accessibility support
 */
const TaskStatusIndicators: React.FC<TaskStatusIndicatorsProps> = ({
  status,
  showLabel = true,
  showIcon = true,
  size = 'md',
  animate = true,
  className
}) => {
  const t = useTranslations('sop.taskStatus');

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Circle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          label: t('pending')
        };
      case 'in_progress':
        return {
          icon: Clock,
          color: 'text-golden-saffron',
          bgColor: 'bg-golden-saffron/10',
          borderColor: 'border-golden-saffron',
          label: t('inProgress')
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-jade-green',
          bgColor: 'bg-jade-green/10',
          borderColor: 'border-jade-green',
          label: t('completed')
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-500',
          label: t('failed')
        };
      case 'skipped':
        return {
          icon: SkipForward,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-400',
          label: t('skipped')
        };
      case 'overdue':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-600',
          label: t('overdue')
        };
      default:
        return {
          icon: Circle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          label: t('unknown')
        };
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-tablet-xs'
        };
      case 'lg':
        return {
          container: 'px-4 py-2',
          icon: 'w-6 h-6',
          text: 'text-tablet-base'
        };
      default:
        return {
          container: 'px-3 py-1.5',
          icon: 'w-4 h-4',
          text: 'text-tablet-sm'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-2 border-2 font-medium',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeClasses.container,
        sizeClasses.text,
        animate && status === 'in_progress' && 'animate-pulse',
        animate && status === 'overdue' && 'animate-bounce',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(sizeClasses.icon, 'flex-shrink-0')} />
      )}
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
};

export default TaskStatusIndicators;