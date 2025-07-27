"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import {
  Shield,
  ChefHat,
  Users,
  Smile,
  CreditCard,
  Package,
  Spray,
  Settings,
  AlertTriangle,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Truck,
  Clock,
  HeartPulse,
  MessageCircle,
  Utensils,
  Thermometer,
  Eye,
  ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapping of category codes to Lucide icons with enhanced set
const categoryIconMap: Record<string, LucideIcon> = {
  FOOD_SAFETY: Shield,
  KITCHEN_OPERATIONS: ChefHat,
  SERVICE_STANDARDS: Users,
  CUSTOMER_SERVICE: Smile,
  CASH_HANDLING: CreditCard,
  INVENTORY: Package,
  CLEANING: Spray,
  EQUIPMENT: Settings,
  EMERGENCY_PROCEDURES: AlertTriangle,
  STAFF_TRAINING: GraduationCap,
  QUALITY_CONTROL: CheckCircle,
  ALLERGEN_MANAGEMENT: AlertCircle,
  DELIVERY_TAKEOUT: Truck,
  OPENING_CLOSING: Clock,
  HEALTH_SAFETY: HeartPulse,
  CUSTOMER_COMPLAINTS: MessageCircle,
  // Additional mappings for enhanced categories
  FOOD_PREPARATION: Utensils,
  TEMPERATURE_CONTROL: Thermometer,
  HYGIENE_MONITORING: Eye,
  SAFETY_INSPECTION: ClipboardCheck,
} as const;

// Default fallback icon
const DefaultIcon = Users;

interface SOPCategoryIconProps {
  categoryCode: string;
  className?: string;
  size?: number;
  color?: string;
  variant?: 'default' | 'filled' | 'outlined';
}

export function SOPCategoryIcon({ 
  categoryCode, 
  className = '', 
  size = 24,
  color,
  variant = 'default'
}: SOPCategoryIconProps) {
  const IconComponent = categoryIconMap[categoryCode] || DefaultIcon;
  
  const iconStyles = cn(
    "transition-colors duration-200",
    variant === 'filled' && "fill-current",
    variant === 'outlined' && "stroke-2",
    className
  );
  
  return (
    <IconComponent 
      className={iconStyles}
      size={size}
      style={color ? { color } : undefined}
      aria-label={`Icon for ${categoryCode}`}
    />
  );
}

// Component for displaying category icon with background
interface CategoryIconWithBackgroundProps {
  categoryCode: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function CategoryIconWithBackground({
  categoryCode,
  color,
  size = 'md',
  className
}: CategoryIconWithBackgroundProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16', 
    xl: 'w-20 h-20'
  };
  
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40
  };
  
  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: `${color}15`,
        border: `2px solid ${color}25`
      }}
    >
      <SOPCategoryIcon 
        categoryCode={categoryCode}
        color={color}
        size={iconSizes[size]}
      />
    </div>
  );
}

export function getCategoryIcon(categoryCode: string): LucideIcon {
  return categoryIconMap[categoryCode] || DefaultIcon;
}

// Get all available category codes
export function getAvailableCategoryCodes(): string[] {
  return Object.keys(categoryIconMap);
}

// Check if category code has an icon
export function hasCategoryIcon(categoryCode: string): boolean {
  return categoryCode in categoryIconMap;
}

// Utility function to get category icon color based on category code
export function getCategoryColor(categoryCode: string): string {
  const colorMap: Record<string, string> = {
    FOOD_SAFETY: '#E31B23',
    KITCHEN_OPERATIONS: '#D4AF37', 
    SERVICE_STANDARDS: '#008B8B',
    CUSTOMER_SERVICE: '#2ECC71',
    CASH_HANDLING: '#9B59B6',
    INVENTORY: '#E67E22',
    CLEANING: '#3498DB',
    EQUIPMENT: '#95A5A6',
    EMERGENCY_PROCEDURES: '#E74C3C',
    STAFF_TRAINING: '#F39C12',
    QUALITY_CONTROL: '#27AE60',
    ALLERGEN_MANAGEMENT: '#FF6B6B',
    DELIVERY_TAKEOUT: '#1ABC9C',
    OPENING_CLOSING: '#8E44AD',
    HEALTH_SAFETY: '#FF9800',
    CUSTOMER_COMPLAINTS: '#607D8B',
  };
  
  return colorMap[categoryCode] || '#95A5A6';
}

export default SOPCategoryIcon;