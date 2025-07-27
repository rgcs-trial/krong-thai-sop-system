'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  id: string;
  label: string;
  label_th: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface SOPBreadcrumbProps {
  locale: string;
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export default function SOPBreadcrumb({
  locale,
  items,
  showHome = true,
  className
}: SOPBreadcrumbProps) {
  const t = useTranslations();

  const homeItem: BreadcrumbItem = {
    id: 'home',
    label: 'Home',
    label_th: 'หน้าหลัก',
    onClick: () => {
      // Navigate to home - in real app this would use Next.js router
      console.log('Navigate to home');
    }
  };

  const allItems = showHome ? [homeItem, ...items] : items;

  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      // In real app, use Next.js router
      console.log('Navigate to:', item.href);
    }
  };

  return (
    <nav 
      className={cn(
        "flex items-center space-x-1 overflow-x-auto scrollbar-hide",
        "py-2 px-4 bg-gray-50 border-b",
        className
      )}
      aria-label="Breadcrumb"
    >
      <div className="flex items-center space-x-1 min-w-0">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const label = locale === 'fr' ? item.label_th : item.label;

          return (
            <div key={item.id} className="flex items-center space-x-1">
              {/* Home icon for first item */}
              {index === 0 && showHome && (
                <Home className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}

              {/* Breadcrumb item */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => !isLast && !item.isActive && handleItemClick(item)}
                disabled={isLast || item.isActive}
                className={cn(
                  "h-8 px-2 text-sm font-medium transition-colors",
                  "hover:bg-gray-100 hover:text-brand-red",
                  "focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2",
                  // Touch-friendly sizing for tablets
                  "min-h-[44px] md:min-h-[32px]",
                  isLast || item.isActive
                    ? "text-brand-black cursor-default pointer-events-none"
                    : "text-gray-600 cursor-pointer",
                  locale === 'fr' && "font-thai"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                <span className="truncate max-w-[120px] md:max-w-[200px]">
                  {label}
                </span>
              </Button>

              {/* Separator */}
              {!isLast && (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}