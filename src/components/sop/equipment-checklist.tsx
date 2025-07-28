'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Camera,
  RefreshCw,
  Search
} from 'lucide-react';

interface EquipmentItem {
  id: string;
  name: string;
  name_fr: string;
  category: string;
  isRequired: boolean;
  isAvailable?: boolean;
  condition?: 'good' | 'fair' | 'poor' | 'needs_replacement';
  lastChecked?: string;
  notes?: string;
}

interface EquipmentChecklistProps {
  /** List of required equipment */
  equipment: EquipmentItem[];
  /** Show equipment photos */
  showPhotos?: boolean;
  /** Allow condition updates */
  allowConditionUpdate?: boolean;
  /** Show availability status */
  showAvailability?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when equipment status changes */
  onStatusChange?: (equipmentId: string, isAvailable: boolean) => void;
  /** Callback when condition is updated */
  onConditionUpdate?: (equipmentId: string, condition: EquipmentItem['condition']) => void;
  /** Callback when photo is requested */
  onPhotoRequest?: (equipmentId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * EquipmentChecklist - Equipment verification component for SOPs
 */
const EquipmentChecklist: React.FC<EquipmentChecklistProps> = ({
  equipment,
  showPhotos = false,
  allowConditionUpdate = false,
  showAvailability = true,
  isLoading = false,
  onStatusChange,
  onConditionUpdate,
  onPhotoRequest,
  className
}) => {
  const t = useTranslations('sop.equipment');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const handleItemCheck = useCallback((itemId: string, checked: boolean) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
    onStatusChange?.(itemId, checked);
  }, [onStatusChange]);

  const getConditionColor = (condition?: string) => {
    switch (condition) {
      case 'good': return 'text-jade-green bg-jade-green/10 border-jade-green';
      case 'fair': return 'text-golden-saffron bg-golden-saffron/10 border-golden-saffron';
      case 'poor': return 'text-krong-red bg-krong-red/10 border-krong-red';
      case 'needs_replacement': return 'text-red-600 bg-red-100 border-red-600';
      default: return 'text-gray-500 bg-gray-50 border-gray-400';
    }
  };

  const completedCount = checkedItems.size;
  const totalRequired = equipment.filter(item => item.isRequired).length;

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('title')}
          </CardTitle>
          <Badge 
            variant={completedCount === totalRequired ? "default" : "secondary"}
            className="text-tablet-sm"
          >
            {completedCount}/{totalRequired}
          </Badge>
        </div>
        {totalRequired > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-krong-red h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalRequired) * 100}%` }}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {equipment.map((item) => {
            const isChecked = checkedItems.has(item.id);
            
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-4 p-4 border-2 border-border/40 rounded-lg",
                  "hover:bg-gray-50 transition-colors duration-200",
                  isChecked && "bg-jade-green/5 border-jade-green/30",
                  item.isRequired && !isChecked && "border-krong-red/30"
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleItemCheck(item.id, !!checked)}
                  className="w-5 h-5"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "text-tablet-base font-body font-medium",
                        isChecked && "text-jade-green"
                      )}>
                        {item.name}
                        {item.isRequired && (
                          <span className="text-krong-red ml-1">*</span>
                        )}
                      </h4>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-tablet-xs">
                          {item.category}
                        </Badge>
                        
                        {item.condition && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-tablet-xs border-2", getConditionColor(item.condition))}
                          >
                            {t(`condition.${item.condition}`)}
                          </Badge>
                        )}
                        
                        {!item.isRequired && (
                          <Badge variant="secondary" className="text-tablet-xs">
                            {t('optional')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {showPhotos && (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => onPhotoRequest?.(item.id)}
                          aria-label={t('takePhoto')}
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {allowConditionUpdate && (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => onConditionUpdate?.(item.id, 'good')}
                          aria-label={t('updateCondition')}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {showAvailability && (
                        <div className="flex items-center gap-1">
                          {item.isAvailable !== undefined ? (
                            item.isAvailable ? (
                              <CheckCircle className="w-4 h-4 text-jade-green" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-krong-red" />
                            )
                          ) : (
                            <Search className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {item.lastChecked && (
                    <p className="text-tablet-xs text-muted-foreground mt-1">
                      {t('lastChecked', { date: new Date(item.lastChecked).toLocaleDateString() })}
                    </p>
                  )}
                  
                  {item.notes && (
                    <p className="text-tablet-xs text-muted-foreground mt-1 italic">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {equipment.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-tablet-sm font-body text-muted-foreground">
              {t('noEquipment')}
            </p>
          </div>
        )}

        {completedCount === totalRequired && totalRequired > 0 && (
          <div className="mt-4 p-4 bg-jade-green/10 border-2 border-jade-green/30 rounded-lg">
            <div className="flex items-center gap-2 text-jade-green">
              <CheckCircle className="w-5 h-5" />
              <span className="text-tablet-sm font-body font-medium">
                {t('allEquipmentReady')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentChecklist;