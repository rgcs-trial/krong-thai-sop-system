'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Grid3X3, 
  List, 
  ChefHat, 
  Utensils, 
  Shield, 
  Clock, 
  Users, 
  Thermometer,
  Brush,
  Package,
  AlertTriangle,
  BookOpen,
  Star,
  TrendingUp
} from 'lucide-react';

interface SOPCategory {
  id: string;
  name: string;
  name_fr: string;
  description?: string;
  description_fr?: string;
  icon: string;
  color: string;
  sopCount: number;
  completionRate?: number;
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
  tags?: string[];
  estimatedTime?: number; // in minutes
  lastUpdated?: string;
}

interface SOPCategoryGridProps {
  /** Array of SOP categories to display */
  categories: SOPCategory[];
  /** Current view mode */
  viewMode?: 'grid' | 'list';
  /** Show category statistics */
  showStats?: boolean;
  /** Show priority indicators */
  showPriority?: boolean;
  /** Enable category selection */
  selectable?: boolean;
  /** Selected category IDs */
  selectedCategories?: string[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when category is selected */
  onCategorySelect?: (categoryId: string) => void;
  /** Callback when view mode changes */
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  /** Custom CSS classes */
  className?: string;
}

// Icon mapping for category icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'chef-hat': ChefHat,
  'utensils': Utensils,
  'shield': Shield,
  'clock': Clock,
  'users': Users,
  'thermometer': Thermometer,
  'cleaning': Brush,
  'inventory': Package,
  'alert': AlertTriangle,
  'book': BookOpen,
  'star': Star,
  'trending': TrendingUp
};

/**
 * SOPCategoryGrid - Touch-optimized grid component for SOP categories
 * 
 * Features:
 * - Responsive grid layout optimized for tablets
 * - Touch-friendly category cards with visual feedback
 * - Multiple view modes (grid/list)
 * - Bilingual category names and descriptions
 * - Priority indicators and completion statistics
 * - Accessibility support with ARIA labels
 * - Brand-consistent styling with Krong Thai colors
 * 
 * @param props SOPCategoryGridProps
 * @returns JSX.Element
 */
const SOPCategoryGrid: React.FC<SOPCategoryGridProps> = ({
  categories,
  viewMode = 'grid',
  showStats = true,
  showPriority = true,
  selectable = false,
  selectedCategories = [],
  isLoading = false,
  onCategorySelect,
  onViewModeChange,
  className
}) => {
  const t = useTranslations('sop.categories');
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setCurrentViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    if (selectable) {
      onCategorySelect?.(categoryId);
    }
  }, [selectable, onCategorySelect]);

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || BookOpen;
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-golden-saffron';
      case 'low': return 'bg-jade-green';
      default: return 'bg-gray-400';
    }
  };

  const getCompletionRateColor = (rate?: number) => {
    if (!rate) return 'bg-gray-400';
    if (rate >= 80) return 'bg-jade-green';
    if (rate >= 60) return 'bg-golden-saffron';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* View Mode Toggle Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        
        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-48 animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  <div className="h-6 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                    <div className="h-6 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with View Mode Toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-tablet-xl font-heading font-bold text-krong-black">
            {t('title')}
          </h2>
          <p className="text-tablet-base font-body text-muted-foreground mt-1">
            {t('subtitle', { count: categories.length })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={currentViewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => handleViewModeChange('grid')}
            aria-label={t('viewMode.grid')}
          >
            <Grid3X3 className="w-5 h-5" />
          </Button>
          <Button
            variant={currentViewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => handleViewModeChange('list')}
            aria-label={t('viewMode.list')}
          >
            <List className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Categories Display */}
      <div className={cn(
        currentViewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
      )}>
        {categories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          const isSelected = selectedCategories.includes(category.id);

          if (currentViewMode === 'list') {
            return (
              <Card
                key={category.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
                  "min-h-[120px] border-2",
                  isSelected && "border-krong-red bg-krong-red/5",
                  !category.isActive && "opacity-60"
                )}
                onClick={() => handleCategoryClick(category.id)}
                role={selectable ? "button" : undefined}
                tabIndex={selectable ? 0 : undefined}
                aria-pressed={selectable ? isSelected : undefined}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    {/* Icon */}
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    >
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-tablet-lg font-heading font-semibold text-krong-black truncate">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-tablet-sm font-body text-muted-foreground mt-1 line-clamp-2">
                              {category.description}
                            </p>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <Badge variant="secondary" className="text-tablet-xs">
                            {t('sopCount', { count: category.sopCount })}
                          </Badge>
                          {showStats && category.completionRate !== undefined && (
                            <div className="flex items-center gap-2">
                              <div 
                                className={cn(
                                  "w-3 h-3 rounded-full",
                                  getCompletionRateColor(category.completionRate)
                                )}
                              />
                              <span className="text-tablet-xs font-body text-muted-foreground">
                                {category.completionRate}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tags and Priority */}
                      <div className="flex items-center gap-2 mt-3">
                        {showPriority && (
                          <div className="flex items-center gap-1">
                            <div 
                              className={cn(
                                "w-2 h-2 rounded-full",
                                getPriorityColor(category.priority)
                              )}
                            />
                            <span className="text-tablet-xs font-body text-muted-foreground">
                              {t(`priority.${category.priority}`)}
                            </span>
                          </div>
                        )}
                        
                        {category.estimatedTime && (
                          <Badge variant="outline" className="text-tablet-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {t('estimatedTime', { minutes: category.estimatedTime })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card
              key={category.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105",
                "min-h-[240px] border-2",
                isSelected && "border-krong-red bg-krong-red/5",
                !category.isActive && "opacity-60"
              )}
              onClick={() => handleCategoryClick(category.id)}
              role={selectable ? "button" : undefined}
              tabIndex={selectable ? 0 : undefined}
              aria-pressed={selectable ? isSelected : undefined}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color }}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  {showPriority && (
                    <div 
                      className={cn(
                        "w-3 h-3 rounded-full",
                        getPriorityColor(category.priority)
                      )}
                      title={t(`priority.${category.priority}`)}
                    />
                  )}
                </div>
                
                <CardTitle className="text-tablet-lg line-clamp-2">
                  {category.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                {category.description && (
                  <p className="text-tablet-sm font-body text-muted-foreground line-clamp-3 mb-4">
                    {category.description}
                  </p>
                )}

                <div className="space-y-3">
                  {/* SOP Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-tablet-sm font-body text-muted-foreground">
                      {t('procedures')}
                    </span>
                    <Badge variant="secondary" className="text-tablet-xs">
                      {category.sopCount}
                    </Badge>
                  </div>

                  {/* Completion Rate */}
                  {showStats && category.completionRate !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-tablet-sm font-body text-muted-foreground">
                        {t('completion')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div 
                          className={cn(
                            "w-3 h-3 rounded-full",
                            getCompletionRateColor(category.completionRate)
                          )}
                        />
                        <span className="text-tablet-xs font-body">
                          {category.completionRate}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Estimated Time */}
                  {category.estimatedTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-tablet-sm font-body text-muted-foreground">
                        {t('avgTime')}
                      </span>
                      <Badge variant="outline" className="text-tablet-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {category.estimatedTime}m
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {category.tags && category.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {category.tags.slice(0, 3).map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-tablet-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {category.tags.length > 3 && (
                      <Badge variant="outline" className="text-tablet-xs">
                        +{category.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
            {t('emptyState.title')}
          </h3>
          <p className="text-tablet-base font-body text-muted-foreground">
            {t('emptyState.description')}
          </p>
        </div>
      )}
    </div>
  );
};

export default SOPCategoryGrid;