'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import SOPCategoriesDashboard, { SOPCategory } from './sop-categories-dashboard';
import SOPDocumentViewer, { SOPDocument } from './sop-document-viewer';
import SOPBreadcrumb, { BreadcrumbItem } from './sop-breadcrumb';
import SOPSearch from './sop-search';
import SOPFavoritesDashboard from './sop-favorites-dashboard';
import { useFavorites, FavoriteItem } from '@/hooks/use-favorites';
import { Button } from '@/components/ui/button';
import { Heart, Home, Search as SearchIcon } from 'lucide-react';

type ViewState = 
  | { type: 'categories' }
  | { type: 'category'; category: SOPCategory; searchQuery?: string; filters?: any; sort?: any }
  | { type: 'document'; document: SOPDocument; category?: SOPCategory }
  | { type: 'favorites' }
  | { type: 'search'; query: string; filters?: any; sort?: any };

interface SOPNavigationMainProps {
  locale: string;
  initialView?: ViewState;
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
  initialView = { type: 'categories' } 
}: SOPNavigationMainProps) {
  const t = useTranslations();
  const [viewState, setViewState] = useState<ViewState>(initialView);
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();

  // Generate breadcrumb items based on current view
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
            onClick: () => setViewState({ type: 'categories' })
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
              onClick: () => setViewState({ type: 'categories' })
            },
            {
              id: 'category-' + viewState.category.id,
              label: viewState.category.name,
              label_th: viewState.category.name_th,
              onClick: () => setViewState({ type: 'category', category: viewState.category! })
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
  }, [viewState]);

  // Handle category selection
  const handleCategorySelect = useCallback((category: SOPCategory) => {
    setViewState({ type: 'category', category });
  }, []);

  // Handle document selection  
  const handleDocumentSelect = useCallback((document: SOPDocument, category?: SOPCategory) => {
    setViewState({ type: 'document', document, category });
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string, filters: any, sort: any) => {
    if (query.trim()) {
      setViewState({ type: 'search', query, filters, sort });
    }
  }, []);

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setViewState({ type: 'categories' });
  }, []);

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
      setViewState({ type: 'category', category: mockCategory });
    } else if (item.type === 'document') {
      // In real app, fetch document data
      const mockDocument = mockCategorySOPs[0];
      setViewState({ type: 'document', document: mockDocument });
    }
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (viewState.type) {
      case 'document':
        if (viewState.category) {
          setViewState({ type: 'category', category: viewState.category });
        } else {
          setViewState({ type: 'categories' });
        }
        break;
      case 'category':
        setViewState({ type: 'categories' });
        break;
      case 'search':
      case 'favorites':
        setViewState({ type: 'categories' });
        break;
      default:
        setViewState({ type: 'categories' });
    }
  }, [viewState]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant={viewState.type === 'categories' ? 'default' : 'ghost'}
              onClick={() => setViewState({ type: 'categories' })}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              {t('navigation.categories')}
            </Button>
            
            <Button
              variant={viewState.type === 'favorites' ? 'default' : 'ghost'}
              onClick={() => setViewState({ type: 'favorites' })}
              className="flex items-center gap-2"
            >
              <Heart className="w-4 h-4" />
              {t('sopCategories.favorites')}
            </Button>
          </div>

          {/* Quick Search */}
          {viewState.type !== 'search' && (
            <div className="flex-1 max-w-md mx-4">
              <SOPSearch
                locale={locale}
                onSearch={handleSearch}
                onClear={handleSearchClear}
                placeholder={t('sop.searchPlaceholder')}
                showFilters={false}
                showSort={false}
                className="mb-0"
              />
            </div>
          )}
        </div>

        {/* Breadcrumb */}
        <SOPBreadcrumb 
          locale={locale}
          items={getBreadcrumbItems()}
          showHome={false}
        />
      </div>

      {/* Main Content */}
      <div className="relative">
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
              placeholder={t('sop.searchPlaceholder')}
            />

            {/* Search Results - Mock for now */}
            <div className="mt-6">
              <p className="text-gray-600 mb-4">
                {t('sopCategories.noResults')} "{viewState.query}"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}