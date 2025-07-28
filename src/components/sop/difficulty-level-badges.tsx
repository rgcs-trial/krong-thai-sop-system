'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Users, 
  Crown,
  GraduationCap,
  Zap,
  Star
} from 'lucide-react';

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface DifficultyLevelBadgesProps {
  /** Difficulty level */
  level: DifficultyLevel;
  /** Show difficulty icon */
  showIcon?: boolean;
  /** Show difficulty stars */
  showStars?: boolean;
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom CSS classes */
  className?: string;
}

/**
 * DifficultyLevelBadges - Visual badges for SOP difficulty levels
 * 
 * Features:
 * - Color-coded difficulty indicators
 * - Star rating system
 * - Multiple size variants
 * - Icon and text combinations
 * - Accessibility support
 */
const DifficultyLevelBadges: React.FC<DifficultyLevelBadgesProps> = ({
  level,
  showIcon = true,
  showStars = false,
  size = 'md',
  className
}) => {
  const t = useTranslations('sop.difficulty');

  const getDifficultyConfig = (level: DifficultyLevel) => {
    switch (level) {
      case 'beginner':
        return {
          icon: User,
          color: 'text-jade-green',
          bgColor: 'bg-jade-green/10',
          borderColor: 'border-jade-green',
          label: t('beginner'),
          stars: 1
        };
      case 'intermediate':
        return {
          icon: Users,
          color: 'text-golden-saffron',
          bgColor: 'bg-golden-saffron/10',
          borderColor: 'border-golden-saffron',
          label: t('intermediate'),
          stars: 2
        };
      case 'advanced':
        return {
          icon: GraduationCap,
          color: 'text-krong-red',
          bgColor: 'bg-krong-red/10',
          borderColor: 'border-krong-red',
          label: t('advanced'),
          stars: 3
        };
      case 'expert':
        return {
          icon: Crown,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-600',
          label: t('expert'),
          stars: 4
        };
      default:
        return {
          icon: User,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-400',
          label: t('unknown'),
          stars: 0
        };
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-tablet-xs',
          star: 'w-2 h-2'
        };
      case 'lg':
        return {
          container: 'px-4 py-2',
          icon: 'w-6 h-6',
          text: 'text-tablet-base',
          star: 'w-4 h-4'
        };
      default:
        return {
          container: 'px-3 py-1.5',
          icon: 'w-4 h-4',
          text: 'text-tablet-sm',
          star: 'w-3 h-3'
        };
    }
  };

  const config = getDifficultyConfig(level);
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
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(sizeClasses.icon, 'flex-shrink-0')} />
      )}
      
      <span>{config.label}</span>
      
      {showStars && (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Star
              key={index}
              className={cn(
                sizeClasses.star,
                index < config.stars
                  ? 'text-golden-saffron fill-current'
                  : 'text-gray-300'
              )}
            />
          ))}
        </div>
      )}
    </Badge>
  );
};

export default DifficultyLevelBadges;