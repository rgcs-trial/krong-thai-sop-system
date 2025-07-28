'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  Home, 
  BookOpen, 
  Heart, 
  Settings, 
  HelpCircle,
  Search,
  Bell,
  User
} from 'lucide-react';

interface NavigationItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  path: string;
  badge?: number;
}

interface SOPBaseLayoutProps {
  /** Current active page identifier */
  activePage?: string;
  /** Main content to render */
  children: React.ReactNode;
  /** Additional header actions */
  headerActions?: React.ReactNode;
  /** Show/hide sidebar navigation */
  showSidebar?: boolean;
  /** Callback when navigation item is selected */
  onNavigate?: (path: string) => void;
  /** Current user information */
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  /** Notification count for badge display */
  notificationCount?: number;
  /** Loading state for the layout */
  isLoading?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SOPBaseLayout - Tablet-optimized base layout component for SOP management
 * 
 * Features:
 * - Responsive sidebar navigation with touch-friendly targets
 * - Collapsible menu for tablet optimization
 * - Bilingual support with proper typography
 * - Brand-consistent styling with Krong Thai colors
 * - Accessibility features with ARIA labels
 * - User profile and notification indicators
 * 
 * @param props SOPBaseLayoutProps
 * @returns JSX.Element
 */
const SOPBaseLayout: React.FC<SOPBaseLayoutProps> = ({
  activePage = 'dashboard',
  children,
  headerActions,
  showSidebar = true,
  onNavigate,
  user,
  notificationCount = 0,
  isLoading = false,
  className
}) => {
  const t = useTranslations('sop.navigation');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation items configuration
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      icon: Home,
      labelKey: 'dashboard',
      path: '/dashboard'
    },
    {
      id: 'categories',
      icon: BookOpen,
      labelKey: 'categories',
      path: '/sop/categories'
    },
    {
      id: 'search',
      icon: Search,
      labelKey: 'search',
      path: '/sop/search'
    },
    {
      id: 'favorites',
      icon: Heart,
      labelKey: 'favorites',
      path: '/sop/favorites'
    },
    {
      id: 'settings',
      icon: Settings,
      labelKey: 'settings',
      path: '/settings'
    },
    {
      id: 'help',
      icon: HelpCircle,
      labelKey: 'help',
      path: '/help'
    }
  ];

  const handleNavigate = useCallback((path: string) => {
    onNavigate?.(path);
    setSidebarOpen(false); // Close sidebar on navigation for mobile
  }, [onNavigate]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-krong-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-krong-red border-t-transparent rounded-full animate-spin" />
          <p className="text-tablet-base font-body text-krong-black">
            {t('loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-krong-white flex",
      "tablet:h-screen tablet:overflow-hidden", // Tablet optimization
      className
    )}>
      {/* Sidebar Navigation */}
      {showSidebar && (
        <>
          {/* Mobile/Tablet Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-krong-black/50 z-40 tablet:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar */}
          <aside 
            className={cn(
              "fixed left-0 top-0 z-50 h-full w-80 bg-krong-white border-r-2 border-border/40 shadow-lg transition-transform duration-300",
              "tablet:relative tablet:translate-x-0 tablet:w-72 tablet:z-auto",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
              "flex flex-col"
            )}
            role="navigation"
            aria-label={t('mainNavigation')}
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b-2 border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-krong-red rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-krong-white" />
                  </div>
                  <div>
                    <h1 className="text-tablet-lg font-heading font-bold text-krong-black">
                      Krong Thai
                    </h1>
                    <p className="text-tablet-sm font-body text-muted-foreground">
                      {t('sopSystem')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="tablet:hidden"
                  aria-label={t('closeSidebar')}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* User Profile */}
            {user && (
              <div className="p-6 border-b-2 border-border/40">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-golden-saffron rounded-full flex items-center justify-center">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-krong-black" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-tablet-base font-body font-medium text-krong-black truncate">
                        {user.name}
                      </p>
                      <Badge variant="secondary" className="text-tablet-sm">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Navigation Items */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;

                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    size="full"
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      "justify-start gap-3 h-14 text-tablet-base",
                      "hover:scale-105 transition-transform duration-200",
                      isActive && "bg-krong-red text-krong-white shadow-md"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">
                      {t(item.labelKey)}
                    </span>
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto text-tablet-xs min-w-[24px] h-6"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col min-h-screen",
        "tablet:h-screen tablet:overflow-hidden"
      )}>
        {/* Top Header */}
        <header className="bg-krong-white border-b-2 border-border/40 shadow-sm">
          <div className="flex items-center justify-between p-4 h-16">
            <div className="flex items-center gap-4">
              {/* Menu Toggle for Mobile/Tablet */}
              {showSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className={cn(
                    "tablet:hidden",
                    sidebarOpen && "hidden"
                  )}
                  aria-label={t('openSidebar')}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              )}

              {/* Page Title */}
              <h2 className="text-tablet-lg font-heading font-semibold text-krong-black">
                {t(`pages.${activePage}`)}
              </h2>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              {headerActions}
              
              {/* Notifications */}
              <div className="relative">
                <Button variant="ghost" size="icon" aria-label={t('notifications')}>
                  <Bell className="w-5 h-5" />
                </Button>
                {notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 text-tablet-xs min-w-[20px] h-5 flex items-center justify-center"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className={cn(
          "flex-1 p-6 overflow-y-auto",
          "tablet:h-full tablet:overflow-auto"
        )}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SOPBaseLayout;