'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import SOPCategoriesDashboard, { SOPCategory } from './sop-categories-dashboard';
import SOPDocumentViewer, { SOPDocument } from './sop-document-viewer';
import SOPBreadcrumb, { BreadcrumbItem } from './sop-breadcrumb';
import SOPSearch from './sop-search';
import SOPFavoritesDashboard from './sop-favorites-dashboard';
import { useFavorites, FavoriteItem } from '@/hooks/use-favorites';
import { useSearch } from '@/hooks/use-search';
import { useSOPStore } from '@/lib/stores/sop-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  Home, 
  Search as SearchIcon, 
  Zap, 
  Clock, 
  Star,
  ArrowLeft,
  ArrowRight,
  Menu,
  X,
  AlertTriangle,
  Bookmark,
  ChevronRight,
  Grid3X3,
  List,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewState = 
  | { type: 'categories' }
  | { type: 'category'; category: SOPCategory; searchQuery?: string; filters?: any; sort?: any }
  | { type: 'document'; document: SOPDocument; category?: SOPCategory }
  | { type: 'favorites' }
  | { type: 'search'; query: string; filters?: any; sort?: any }
  | { type: 'recent' }
  | { type: 'critical' };

type NavigationLayout = 'grid' | 'list';
type QuickAccessType = 'emergency' | 'critical' | 'recent' | 'favorites';

interface SOPNavigationMainProps {
  locale: string;
  initialView?: ViewState;
  onDocumentSelect?: (document: SOPDocument) => void;
  onCategorySelect?: (category: SOPCategory) => void;
  enableGestures?: boolean;
  compactMode?: boolean;
  showQuickAccess?: boolean;
}

// Mock SOPs for category
const mockCategorySOPs: SOPDocument[] = [
  {
    id: '1',
    category_id: '1',
    title: 'Food Temperature Control and Monitoring',
    title_th: 'การควบคุมและตรวจสอบอุณหภูมิอาหาร',
    content: 'This SOP outlines the proper procedures for monitoring and controlling food temperatures to ensure food safety and prevent foodborne illnesses.',
    content_th: 'มาตรฐานการปฏิบัติงานนี้อธิบายขั้นตอนที่ถูกต้องในการตรวจสอบและควบคุมอุณหภูมิอาหารเพื่อรับประกันความปลอดภัยของอาหารและป้องกันโรคที่เกิดจากอาหาร',
    steps: [
      {
        id: 1,
        title: 'Check refrigerator temperature',
        description: 'Use a calibrated thermometer to check that refrigerator temperature is between 32-40°F (0-4°C). Record temperature every 2 hours.',
        warning: 'If temperature exceeds 40°F (4°C), immediately move perishable items to another refrigerator and contact maintenance.',
        tip: 'Place thermometer in the warmest part of the refrigerator for accurate readings.'
      }
    ],
    steps_th: [
      {
        id: 1,
        title: 'ตรวจสอบอุณหภูมิตู้เย็น',
        description: 'ใช้เทอร์โมมิเตอร์ที่ปรับเทียบแล้วตรวจสอบให้แน่ใจว่าอุณหภูมิตู้เย็นอยู่ระหว่าง 32-40°F (0-4°C) บันทึกอุณหภูมิทุก 2 ชั่วโมง',
        warning: 'หากอุณหภูมิเกิน 40°F (4°C) ให้ย้ายอาหารที่เสียง่ายไปยังตู้เย็นอื่นทันทีและติดต่อแผนกซ่อมบำรุง',
        tip: 'วางเทอร์โมมิเตอร์ในส่วนที่อบอุ่นที่สุดของตู้เย็นเพื่อการอ่านที่แม่นยำ'
      }
    ],
    attachments: [],
    tags: ['food safety', 'temperature', 'monitoring', 'kitchen'],
    tags_th: ['ความปลอดภัยอาหาร', 'อุณหภูมิ', 'การตรวจสอบ', 'ครัว'],
    version: 2,
    status: 'approved',
    priority: 'high',
    effective_date: '2024-01-01',
    review_date: '2024-06-01',
    created_by: 'Chef Manager',
    approved_by: 'Restaurant Manager',
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  }
];

export default function SOPNavigationMain({ 
  locale, 
  initialView = { type: 'categories' },
  onDocumentSelect,
  onCategorySelect,
  enableGestures = true,
  compactMode = false,
  showQuickAccess = true
}: SOPNavigationMainProps) {
  const t = useTranslations();
  const [viewState, setViewState] = useState<ViewState>(initialView);
  const [layout, setLayout] = useState<NavigationLayout>('grid');
  const [showSidebar, setShowSidebar] = useState(!compactMode);
  const [navigationHistory, setNavigationHistory] = useState<ViewState[]>([initialView]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { recentlyViewedDocuments } = useSOPStore();
  const { results: searchResults } = useSearch(locale);

  // Enhanced navigation history management
  const navigateToView = useCallback((newView: ViewState) => {
    const newHistory = navigationHistory.slice(0, historyIndex + 1);
    newHistory.push(newView);
    setNavigationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setViewState(newView);
  }, [navigationHistory, historyIndex]);

  const canNavigateBack = historyIndex > 0;
  const canNavigateForward = historyIndex < navigationHistory.length - 1;

  const navigateBack = useCallback(() => {
    if (canNavigateBack) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setViewState(navigationHistory[newIndex]);
    }
  }, [canNavigateBack, historyIndex, navigationHistory]);

  const navigateForward = useCallback(() => {
    if (canNavigateForward) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setViewState(navigationHistory[newIndex]);
    }
  }, [canNavigateForward, historyIndex, navigationHistory]);

  // Enhanced breadcrumb generation
  const getBreadcrumbItems = useCallback((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    switch (viewState.type) {
      case 'categories':
        items.push({
          id: 'categories',
          label: 'SOP Categories',
          label_th: 'หมวดหมู่มาตรฐานการปฏิบัติงาน',
          isActive: true
        });
        break;
        
      case 'category':
        items.push(
          {
            id: 'categories',
            label: 'SOP Categories',
            label_th: 'หมวดหมู่มาตรฐานการปฏิบัติงาน',
            onClick: () => navigateToView({ type: 'categories' })
          },
          {
            id: 'category-' + viewState.category.id,
            label: viewState.category.name,
            label_th: viewState.category.name_th,
            isActive: true
          }
        );
        break;
        
      case 'document':
        if (viewState.category) {
          items.push(
            {
              id: 'categories',
              label: 'SOP Categories',
              label_th: 'หมวดหมู่มาตรฐานการปฏิบัติงาน',
              onClick: () => navigateToView({ type: 'categories' })
            },
            {
              id: 'category-' + viewState.category.id,
              label: viewState.category.name,
              label_th: viewState.category.name_th,
              onClick: () => navigateToView({ type: 'category', category: viewState.category! })
            },
            {
              id: 'document-' + viewState.document.id,
              label: viewState.document.title,
              label_th: viewState.document.title_th,
              isActive: true
            }
          );
        }
        break;
        
      case 'favorites':
        items.push({
          id: 'favorites',
          label: 'Favorites',
          label_th: 'รายการโปรด',
          isActive: true
        });
        break;
        
      case 'recent':
        items.push({
          id: 'recent',
          label: 'Recently Viewed',
          label_th: 'เพิ่งดูล่าสุด',
          isActive: true
        });
        break;
        
      case 'critical':
        items.push({
          id: 'critical',
          label: 'Critical SOPs',
          label_th: 'มาตรฐานสำคัญ',
          isActive: true
        });
        break;
        
      case 'search':
        items.push({
          id: 'search',
          label: `Search: ${viewState.query}`,
          label_th: `ค้นหา: ${viewState.query}`,
          isActive: true
        });
        break;
    }

    return items;
  }, [viewState, navigateToView]);

  // Quick access shortcuts
  const quickAccessItems = useMemo(() => {
    const items = [];
    
    // Critical SOPs shortcut
    items.push({
      id: 'critical',
      type: 'critical' as QuickAccessType,
      title: t('navigation.criticalSOPs'),
      title_th: 'มาตรฐานสำคัญ',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      count: 5, // Mock count
      description: t('navigation.emergencyProcedures')
    });
    
    // Recent SOPs shortcut
    if (recentlyViewedDocuments.length > 0) {
      items.push({
        id: 'recent',
        type: 'recent' as QuickAccessType,
        title: t('navigation.recentlyViewed'),
        title_th: 'เพิ่งดูล่าสุด',
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        count: recentlyViewedDocuments.length,
        description: t('navigation.lastViewedSOPs')
      });
    }
    
    // Favorites shortcut
    items.push({
      id: 'favorites',
      type: 'favorites' as QuickAccessType,
      title: t('navigation.favorites'),
      title_th: 'รายการโปรด',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      count: 0, // Will be updated by favorites hook
      description: t('navigation.savedSOPs')
    });
    
    return items;
  }, [t, recentlyViewedDocuments.length]);

  // Enhanced navigation handlers
  const handleCategorySelect = useCallback((category: SOPCategory) => {
    navigateToView({ type: 'category', category });
    onCategorySelect?.(category);
  }, [navigateToView, onCategorySelect]);

  // Handle document selection  
  const handleDocumentSelect = useCallback((document: SOPDocument, category?: SOPCategory) => {
    navigateToView({ type: 'document', document, category });
    onDocumentSelect?.(document);
  }, [navigateToView, onDocumentSelect]);

  // Handle search
  const handleSearch = useCallback((query: string, filters: any, sort: any) => {
    if (query.trim()) {
      navigateToView({ type: 'search', query, filters, sort });
    }
  }, [navigateToView]);

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    navigateToView({ type: 'categories' });
  }, [navigateToView]);

  // Handle quick access navigation
  const handleQuickAccess = useCallback((type: QuickAccessType) => {
    switch (type) {
      case 'critical':
        navigateToView({ type: 'critical' });
        break;
      case 'recent':
        navigateToView({ type: 'recent' });
        break;
      case 'favorites':
        navigateToView({ type: 'favorites' });
        break;
      case 'emergency':
        navigateToView({ type: 'critical' });
        break;
    }
  }, [navigateToView]);

  // Handle favorite item click
  const handleFavoriteItemClick = useCallback((item: FavoriteItem) => {
    if (item.type === 'category') {
      // In real app, fetch category data
      const mockCategory: SOPCategory = {
        id: item.id,
        code: 'MOCK',
        name: item.title,
        name_th: item.title_th,
        description: 'Mock category',
        description_th: 'หมวดหมู่จำลอง',
        icon: 'mock',
        color: '#E31B23',
        sort_order: 1,
        is_active: true,
        sop_count: 5,
        last_updated: new Date().toISOString().split('T')[0]
      };
      navigateToView({ type: 'category', category: mockCategory });
    } else if (item.type === 'document') {
      // In real app, fetch document data
      const mockDocument = mockCategorySOPs[0];
      navigateToView({ type: 'document', document: mockDocument });
    }
  }, [navigateToView]);

  // Enhanced gesture support
  useEffect(() => {
    if (!enableGestures) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Horizontal swipe detection
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0 && canNavigateBack) {
          // Swipe right - go back
          navigateBack();
        } else if (deltaX < 0 && canNavigateForward) {
          // Swipe left - go forward
          navigateForward();
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enableGestures, canNavigateBack, canNavigateForward, navigateBack, navigateForward]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (canNavigateBack) {
      navigateBack();
    } else {
      // Fallback navigation logic
      switch (viewState.type) {
        case 'document':
          if (viewState.category) {
            navigateToView({ type: 'category', category: viewState.category });
          } else {
            navigateToView({ type: 'categories' });
          }
          break;
        case 'category':
        case 'search':
        case 'favorites':
        case 'recent':
        case 'critical':
          navigateToView({ type: 'categories' });
          break;
        default:
          navigateToView({ type: 'categories' });
      }
    }
  }, [canNavigateBack, navigateBack, viewState, navigateToView]);

  return (
    <div className={cn("min-h-screen bg-gray-50", compactMode && "max-w-screen-xl mx-auto")}>
      {/* Enhanced Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="flex items-center justify-between p-4">
          {/* Left Navigation Controls */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Toggle */}
            {compactMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden"
              >
                {showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            )}
            
            {/* Navigation History Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={navigateBack}
                disabled={!canNavigateBack}
                className="w-8 h-8"
                title={t('navigation.back')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={navigateForward}
                disabled={!canNavigateForward}
                className="w-8 h-8"
                title={t('navigation.forward')}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Main Navigation Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant={viewState.type === 'categories' ? 'default' : 'ghost'}
                onClick={() => navigateToView({ type: 'categories' })}
                className="flex items-center gap-2"
                size={compactMode ? 'sm' : 'default'}
              >
                <Home className="w-4 h-4" />
                {!compactMode && t('navigation.categories')}
              </Button>
              
              <Button
                variant={viewState.type === 'favorites' ? 'default' : 'ghost'}
                onClick={() => navigateToView({ type: 'favorites' })}
                className="flex items-center gap-2"
                size={compactMode ? 'sm' : 'default'}
              >
                <Heart className="w-4 h-4" />
                {!compactMode && t('sopCategories.favorites')}
              </Button>
              
              {/* Quick Access for Recent */}
              {recentlyViewedDocuments.length > 0 && (
                <Button
                  variant={viewState.type === 'recent' ? 'default' : 'ghost'}
                  onClick={() => navigateToView({ type: 'recent' })}
                  className="flex items-center gap-2"
                  size={compactMode ? 'sm' : 'default'}
                >
                  <Clock className="w-4 h-4" />
                  {!compactMode && t('navigation.recent')}
                  {recentlyViewedDocuments.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {recentlyViewedDocuments.length}
                    </Badge>
                  )}
                </Button>
              )}
              
              {/* Critical SOPs Quick Access */}
              <Button
                variant={viewState.type === 'critical' ? 'destructive' : 'outline'}
                onClick={() => navigateToView({ type: 'critical' })}
                className="flex items-center gap-2"
                size={compactMode ? 'sm' : 'default'}
              >
                <AlertTriangle className="w-4 h-4" />
                {!compactMode && t('navigation.critical')}
              </Button>
            </div>
          </div>

          {/* Center Search */}
          {viewState.type !== 'search' && (
            <div className={cn(
              "flex-1 mx-4",
              compactMode ? "max-w-sm" : "max-w-md"
            )}>
              <SOPSearch
                locale={locale}
                onSearch={handleSearch}
                onClear={handleSearchClear}
                onResultSelect={(result) => handleDocumentSelect(result)}
                placeholder={t('sop.searchPlaceholder')}
                showFilters={false}
                showSort={false}
                compact={compactMode}
                className="mb-0"
              />
            </div>
          )}
          
          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Layout Toggle */}
            {!compactMode && (viewState.type === 'categories' || viewState.type === 'category') && (
              <div className="flex items-center gap-1">
                <Button
                  variant={layout === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLayout('grid')}
                  className="w-8 h-8"
                  title={t('navigation.gridView')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={layout === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLayout('list')}
                  className="w-8 h-8"
                  title={t('navigation.listView')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Breadcrumb with Quick Actions */}
        <div className="border-t bg-gray-50">
          <div className="flex items-center justify-between px-4 py-2">
            <SOPBreadcrumb 
              locale={locale}
              items={getBreadcrumbItems()}
              showHome={false}
              className="flex-1"
            />
            
            {/* Contextual Quick Actions */}
            {viewState.type === 'categories' && showQuickAccess && (
              <div className="flex items-center gap-2 ml-4">
                {quickAccessItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAccess(item.type)}
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        item.color
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {item.count > 0 && (
                        <Badge variant="secondary" className="text-xs px-1">
                          {item.count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className={cn(
        "relative flex",
        compactMode && "max-w-screen-xl mx-auto"
      )}>
        {/* Quick Access Sidebar */}
        {showQuickAccess && showSidebar && (
          <Card className={cn(
            "fixed left-4 top-20 w-64 h-fit z-30 md:relative md:left-0 md:top-0 md:w-80 md:m-4",
            !compactMode && "hidden md:block"
          )}>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {t('navigation.quickAccess')}
              </h3>
              <div className="space-y-2">
                {quickAccessItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleQuickAccess(item.type)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all hover:shadow-md",
                        item.bgColor,
                        "hover:scale-[1.02]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", item.color)} />
                          <span className="font-medium text-sm">
                            {locale === 'th' ? item.title_th : item.title}
                          </span>
                        </div>
                        {item.count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {item.count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{item.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1">
          {viewState.type === 'categories' && (
            <SOPCategoriesDashboard
              locale={locale}
              onCategorySelect={handleCategorySelect}
            />
          )}

        {viewState.type === 'category' && (
          <div className="p-4 md:p-6">
            {/* Category Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-brand-black mb-2 flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${viewState.category.color}15` }}
                >
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: viewState.category.color }}
                  />
                </div>
                {locale === 'th' ? viewState.category.name_th : viewState.category.name}
              </h1>
              <p className="text-gray-600">
                {locale === 'th' ? viewState.category.description_th : viewState.category.description}
              </p>
            </div>

            {/* Search within category */}
            <div className="mb-6">
              <SOPSearch
                locale={locale}
                onSearch={handleSearch}
                onClear={handleSearchClear}
                placeholder={`${t('common.search')} ${locale === 'th' ? viewState.category.name_th : viewState.category.name}...`}
              />
            </div>

            {/* SOPs List - Mock for now */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockCategorySOPs.map((sop) => {
                const isFav = isFavorite(sop.id, 'document');
                const title = locale === 'th' ? sop.title_th : sop.title;
                
                return (
                  <div
                    key={sop.id}
                    className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleDocumentSelect(sop, viewState.category)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-brand-black line-clamp-2">
                        {title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFav) {
                            removeFromFavorites(sop.id, 'document');
                          } else {
                            addToFavorites({
                              id: sop.id,
                              type: 'document',
                              title: sop.title,
                              title_th: sop.title_th,
                              category_id: sop.category_id
                            });
                          }
                        }}
                        className="w-8 h-8"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                      {locale === 'th' ? sop.content_th : sop.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>v{sop.version}</span>
                      <span>{sop.status}</span>
                      <span>{sop.priority}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewState.type === 'document' && (
          <SOPDocumentViewer
            locale={locale}
            document={viewState.document}
            category={viewState.category}
            onBack={handleBack}
            onNavigate={(direction) => {
              // In real app, navigate to prev/next document
              console.log('Navigate', direction);
            }}
            canNavigate={{ prev: false, next: true }}
          />
        )}

        {viewState.type === 'favorites' && (
          <SOPFavoritesDashboard
            locale={locale}
            onItemClick={handleFavoriteItemClick}
          />
        )}
        
        {viewState.type === 'recent' && (
          <div className="p-4 md:p-6">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-brand-black mb-2 flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-600" />
                {t('navigation.recentlyViewed')}
              </h1>
              <p className="text-gray-600">{t('navigation.recentDescription')}</p>
            </div>
            
            {recentlyViewedDocuments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentlyViewedDocuments.slice(0, 12).map((item) => {
                  // In real app, fetch document details
                  const mockDoc = mockCategorySOPs[0];
                  const title = locale === 'th' ? mockDoc.title_th : mockDoc.title;
                  const timeAgo = new Date(item.viewedAt).toLocaleDateString();
                  
                  return (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleDocumentSelect(mockDoc)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-brand-black line-clamp-2 mb-2">
                          {title}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{t('navigation.viewedOn')}: {timeAgo}</span>
                          <Clock className="w-4 h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {t('navigation.noRecentSOPs')}
                  </h3>
                  <p className="text-gray-500 mb-4">{t('navigation.startBrowsing')}</p>
                  <Button onClick={() => navigateToView({ type: 'categories' })}>
                    {t('navigation.browseCategories')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {viewState.type === 'critical' && (
          <div className="p-4 md:p-6">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-brand-black mb-2 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                {t('navigation.criticalSOPs')}
              </h1>
              <p className="text-gray-600">{t('navigation.criticalDescription')}</p>
            </div>
            
            {/* Critical SOPs would be fetched here */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[mockCategorySOPs[0]].map((sop) => {
                const title = locale === 'th' ? sop.title_th : sop.title;
                const content = locale === 'th' ? sop.content_th : sop.content;
                
                return (
                  <Card
                    key={sop.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-red-500"
                    onClick={() => handleDocumentSelect(sop)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-brand-black line-clamp-2">
                          {title}
                        </h3>
                        <Badge variant="destructive" className="ml-2">
                          {t('sop.critical')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>v{sop.version}</span>
                        <span>{sop.priority}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {viewState.type === 'search' && (
          <div className="p-4 md:p-6">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-brand-black mb-2 flex items-center gap-3">
                <SearchIcon className="w-8 h-8 text-brand-red" />
                {t('common.search')}: "{viewState.query}"
              </h1>
            </div>

            <SOPSearch
              locale={locale}
              onSearch={handleSearch}
              onClear={handleSearchClear}
              onResultSelect={(result) => handleDocumentSelect(result)}
              placeholder={t('sop.searchPlaceholder')}
            />

            {/* Enhanced Search Results Display */}
            <div className="mt-6">
              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">
                      {t('search.foundResults', { count: searchResults.length, query: viewState.query })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={layout === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setLayout('grid')}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={layout === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setLayout('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className={cn(
                    layout === 'grid' 
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      : "space-y-3"
                  )}>
                    {searchResults.map((result) => {
                      const title = locale === 'th' ? result.title_th : result.title_en;
                      const content = locale === 'th' ? result.content_th : result.content_en;
                      
                      return (
                        <Card
                          key={result.id}
                          className={cn(
                            "cursor-pointer hover:shadow-lg transition-shadow",
                            layout === 'list' && "flex"
                          )}
                          onClick={() => handleDocumentSelect(result as any)}
                        >
                          <CardContent className={cn(
                            "p-4",
                            layout === 'list' && "flex items-center gap-4 w-full"
                          )}>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className={cn(
                                  "font-semibold text-brand-black",
                                  layout === 'grid' ? "line-clamp-2" : "line-clamp-1"
                                )}>
                                  {result.highlight?.title ? (
                                    <span dangerouslySetInnerHTML={{ __html: result.highlight.title }} />
                                  ) : (
                                    title
                                  )}
                                </h3>
                                <div className="flex items-center gap-1 ml-2">
                                  {result.is_critical && (
                                    <Badge variant="destructive" className="text-xs">
                                      {t('sop.critical')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <p className={cn(
                                "text-sm text-gray-600 mb-3",
                                layout === 'grid' ? "line-clamp-3" : "line-clamp-2"
                              )}>
                                {result.highlight?.content ? (
                                  <span dangerouslySetInnerHTML={{ __html: result.highlight.content }} />
                                ) : (
                                  content
                                )}
                              </p>
                              
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{result.category?.name_en}</span>
                                <span>v{result.version}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <SearchIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      {t('search.noResults')}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {t('search.tryDifferentKeywords')}
                    </p>
                    <Button variant="outline" onClick={handleSearchClear}>
                      {t('search.clearSearch')}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
        
        </div>
      </div>
      
      {/* Gesture indicators for mobile */}
      {enableGestures && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 md:hidden">
          <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
            {t('navigation.swipeHint')}
          </div>
        </div>
      )}
    </div>
  );
}