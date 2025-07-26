'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Star, Clock, ChevronRight, Grid3X3, List, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// SOP Category data structure based on database schema
export interface SOPCategory {
  id: string;
  code: string;
  name: string;
  name_th: string;
  description: string;
  description_th: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  sop_count: number;
  last_updated: string;
}

// Mock data for the 16 SOP categories
const mockCategories: SOPCategory[] = [
  {
    id: '1',
    code: 'FOOD_SAFETY',
    name: 'Food Safety & Hygiene',
    name_th: 'ความปลอดภัยอาหารและสุขอนามัย',
    description: 'Food handling, storage, and safety procedures',
    description_th: 'ขั้นตอนการจัดการ เก็บรักษา และความปลอดภัยของอาหาร',
    icon: 'shield-check',
    color: '#E31B23',
    sort_order: 1,
    is_active: true,
    sop_count: 12,
    last_updated: '2024-01-15'
  },
  {
    id: '2',
    code: 'KITCHEN_OPERATIONS',
    name: 'Kitchen Operations',
    name_th: 'การปฏิบัติงานในครัว',
    description: 'Kitchen workflow and cooking procedures',
    description_th: 'ขั้นตอนการทำงานในครัวและการประกอบอาหาร',
    icon: 'chef-hat',
    color: '#D4AF37',
    sort_order: 2,
    is_active: true,
    sop_count: 18,
    last_updated: '2024-01-20'
  },
  {
    id: '3',
    code: 'SERVICE_STANDARDS',
    name: 'Service Standards',
    name_th: 'มาตรฐานการบริการ',
    description: 'Service quality and guest experience standards',
    description_th: 'มาตรฐานคุณภาพการบริการและประสบการณ์ของแขก',
    icon: 'users',
    color: '#008B8B',
    sort_order: 3,
    is_active: true,
    sop_count: 15,
    last_updated: '2024-01-18'
  },
  {
    id: '4',
    code: 'CUSTOMER_SERVICE',
    name: 'Customer Service',
    name_th: 'การบริการลูกค้า',
    description: 'Guest interaction and service excellence',
    description_th: 'การปฏิสัมพันธ์กับแขกและความเป็นเลิศในการบริการ',
    icon: 'smile',
    color: '#2ECC71',
    sort_order: 4,
    is_active: true,
    sop_count: 10,
    last_updated: '2024-01-22'
  },
  {
    id: '5',
    code: 'CASH_HANDLING',
    name: 'Cash Handling & POS',
    name_th: 'การจัดการเงินสดและระบบ POS',
    description: 'Payment processing and cash management',
    description_th: 'การประมวลผลการชำระเงินและการจัดการเงินสด',
    icon: 'credit-card',
    color: '#9B59B6',
    sort_order: 5,
    is_active: true,
    sop_count: 8,
    last_updated: '2024-01-16'
  },
  {
    id: '6',
    code: 'INVENTORY',
    name: 'Inventory Management',
    name_th: 'การจัดการสินค้าคงคลัง',
    description: 'Stock management and ordering procedures',
    description_th: 'ขั้นตอนการจัดการสต็อกและการสั่งซื้อ',
    icon: 'package',
    color: '#E67E22',
    sort_order: 6,
    is_active: true,
    sop_count: 14,
    last_updated: '2024-01-19'
  },
  {
    id: '7',
    code: 'CLEANING',
    name: 'Cleaning & Sanitization',
    name_th: 'การทำความสะอาดและการฆ่าเชื้อ',
    description: 'Cleaning schedules and sanitization procedures',
    description_th: 'ตารางการทำความสะอาดและขั้นตอนการฆ่าเชื้อ',
    icon: 'spray-can',
    color: '#3498DB',
    sort_order: 7,
    is_active: true,
    sop_count: 16,
    last_updated: '2024-01-21'
  },
  {
    id: '8',
    code: 'EQUIPMENT',
    name: 'Equipment Operation',
    name_th: 'การใช้งานอุปกรณ์',
    description: 'Equipment operation and maintenance',
    description_th: 'การใช้งานและการบำรุงรักษาอุปกรณ์',
    icon: 'settings',
    color: '#95A5A6',
    sort_order: 8,
    is_active: true,
    sop_count: 11,
    last_updated: '2024-01-17'
  },
  {
    id: '9',
    code: 'EMERGENCY_PROCEDURES',
    name: 'Emergency Procedures',
    name_th: 'ขั้นตอนฉุกเฉิน',
    description: 'Emergency response and safety protocols',
    description_th: 'การตอบสนองฉุกเฉินและโปรโตคอลความปลอดภัย',
    icon: 'alert-triangle',
    color: '#E74C3C',
    sort_order: 9,
    is_active: true,
    sop_count: 7,
    last_updated: '2024-01-14'
  },
  {
    id: '10',
    code: 'STAFF_TRAINING',
    name: 'Staff Training',
    name_th: 'การฝึกอบรมพนักงาน',
    description: 'Training programs and development',
    description_th: 'โปรแกรมการฝึกอบรมและการพัฒนา',
    icon: 'graduation-cap',
    color: '#F39C12',
    sort_order: 10,
    is_active: true,
    sop_count: 9,
    last_updated: '2024-01-23'
  },
  {
    id: '11',
    code: 'QUALITY_CONTROL',
    name: 'Quality Control',
    name_th: 'การควบคุมคุณภาพ',
    description: 'Quality assurance and standards',
    description_th: 'การประกันคุณภาพและมาตรฐาน',
    icon: 'check-circle',
    color: '#27AE60',
    sort_order: 11,
    is_active: true,
    sop_count: 13,
    last_updated: '2024-01-20'
  },
  {
    id: '12',
    code: 'ALLERGEN_MANAGEMENT',
    name: 'Allergen Management',
    name_th: 'การจัดการสารก่อภูมิแพ้',
    description: 'Allergen handling and customer safety',
    description_th: 'การจัดการสารก่อภูมิแพ้และความปลอดภัยของลูกค้า',
    icon: 'alert-circle',
    color: '#FF6B6B',
    sort_order: 12,
    is_active: true,
    sop_count: 6,
    last_updated: '2024-01-15'
  },
  {
    id: '13',
    code: 'DELIVERY_TAKEOUT',
    name: 'Delivery & Takeout',
    name_th: 'การจัดส่งและการสั่งกลับบ้าน',
    description: 'Delivery and takeout service procedures',
    description_th: 'ขั้นตอนการจัดส่งและบริการกลับบ้าน',
    icon: 'truck',
    color: '#1ABC9C',
    sort_order: 13,
    is_active: true,
    sop_count: 8,
    last_updated: '2024-01-19'
  },
  {
    id: '14',
    code: 'OPENING_CLOSING',
    name: 'Opening & Closing',
    name_th: 'การเปิดและปิดร้าน',
    description: 'Opening and closing procedures',
    description_th: 'ขั้นตอนการเปิดและปิดร้าน',
    icon: 'clock',
    color: '#8E44AD',
    sort_order: 14,
    is_active: true,
    sop_count: 10,
    last_updated: '2024-01-18'
  },
  {
    id: '15',
    code: 'HEALTH_SAFETY',
    name: 'Health & Safety',
    name_th: 'สุขภาพและความปลอดภัย',
    description: 'Health and safety regulations',
    description_th: 'กฏระเบียบด้านสุขภาพและความปลอดภัย',
    icon: 'heart-pulse',
    color: '#FF9800',
    sort_order: 15,
    is_active: true,
    sop_count: 12,
    last_updated: '2024-01-21'
  },
  {
    id: '16',
    code: 'CUSTOMER_COMPLAINTS',
    name: 'Customer Complaints',
    name_th: 'การจัดการข้อร้องเรียนของลูกค้า',
    description: 'Complaint handling and resolution',
    description_th: 'การจัดการและแก้ไขข้อร้องเรียน',
    icon: 'message-circle',
    color: '#607D8B',
    sort_order: 16,
    is_active: true,
    sop_count: 5,
    last_updated: '2024-01-16'
  }
];

interface SOPCategoriesDashboardProps {
  locale: string;
  onCategorySelect: (category: SOPCategory) => void;
}

export default function SOPCategoriesDashboard({ 
  locale, 
  onCategorySelect 
}: SOPCategoriesDashboardProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTab, setSelectedTab] = useState('all');

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return mockCategories;
    
    const query = searchQuery.toLowerCase();
    return mockCategories.filter(category => {
      const name = locale === 'th' ? category.name_th : category.name;
      const description = locale === 'th' ? category.description_th : category.description;
      return (
        name.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query) ||
        category.code.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, locale]);

  // Get categories by tab
  const getCategoriesByTab = (tab: string) => {
    switch (tab) {
      case 'favorites':
        // Mock favorites - in real app this would come from localStorage or API
        return filteredCategories.filter(cat => ['FOOD_SAFETY', 'KITCHEN_OPERATIONS', 'SERVICE_STANDARDS'].includes(cat.code));
      case 'recent':
        // Mock recent - sort by last_updated
        return [...filteredCategories].sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()).slice(0, 6);
      default:
        return filteredCategories;
    }
  };

  const displayCategories = getCategoriesByTab(selectedTab);

  const CategoryCard = ({ category, isGridView = true }: { category: SOPCategory; isGridView?: boolean }) => {
    const name = locale === 'th' ? category.name_th : category.name;
    const description = locale === 'th' ? category.description_th : category.description;

    return (
      <Card 
        className={cn(
          "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
          "border-2 hover:border-brand-red/20 bg-white",
          // Touch-friendly minimum size
          isGridView ? "min-h-[140px]" : "min-h-[80px]",
          // Tablet-optimized spacing
          "p-2 md:p-4"
        )}
        style={{ 
          '--brand-color': category.color,
          borderColor: `${category.color}20`
        } as React.CSSProperties}
        onClick={() => onCategorySelect(category)}
      >
        <CardHeader className={cn("pb-2", isGridView ? "text-center" : "flex-row items-center space-y-0 gap-4")}>
          <div 
            className={cn(
              "rounded-full p-3 mb-2 flex items-center justify-center",
              isGridView ? "w-12 h-12 mx-auto" : "w-10 h-10"
            )}
            style={{ backgroundColor: `${category.color}15` }}
          >
            {/* Icon placeholder - in real app, use proper icon library */}
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          </div>
          <div className={cn("flex-1", !isGridView && "min-w-0")}>
            <CardTitle className={cn(
              "text-sm md:text-base font-semibold text-brand-black group-hover:text-brand-red transition-colors",
              // Thai font support
              locale === 'th' && "font-thai",
              !isGridView && "truncate"
            )}>
              {name}
            </CardTitle>
            {isGridView && (
              <p className={cn(
                "text-xs text-gray-600 mt-1 line-clamp-2",
                locale === 'th' && "font-thai"
              )}>
                {description}
              </p>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={cn("pt-0", isGridView ? "text-center" : "flex items-center justify-between")}>
          <div className={cn("flex items-center gap-2", isGridView ? "justify-center" : "")}>
            <Badge 
              variant="secondary" 
              className="text-xs px-2 py-1"
              style={{ backgroundColor: `${category.color}15`, color: category.color }}
            >
              {t('sopCategories.totalSops', { count: category.sop_count })}
            </Badge>
            {!isGridView && (
              <span className="text-xs text-gray-500">
                {t('sopCategories.lastUpdated', { date: category.last_updated })}
              </span>
            )}
          </div>
          
          {isGridView && (
            <div className="mt-2 text-xs text-gray-500">
              {t('sopCategories.lastUpdated', { date: category.last_updated })}
            </div>
          )}
          
          {!isGridView && (
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-red transition-colors" />
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className={cn(
          "text-2xl md:text-3xl font-bold text-brand-black mb-2",
          locale === 'th' && "font-thai"
        )}>
          {t('sopCategories.title')}
        </h1>
        <p className={cn(
          "text-gray-600 text-sm md:text-base",
          locale === 'th' && "font-thai"
        )}>
          {t('sopCategories.subtitle')}
        </p>
      </div>

      {/* Search and View Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('sopCategories.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base bg-white"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="w-12 h-12"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            className="w-12 h-12"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="all" className="text-sm">
            {t('navigation.sops')}
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-sm">
            <Star className="w-4 h-4 mr-1" />
            {t('sopCategories.favorites')}
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-sm">
            <Clock className="w-4 h-4 mr-1" />
            {t('sopCategories.recent')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {displayCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className={cn("text-gray-500", locale === 'th' && "font-thai")}>
                {t('sopCategories.noResults')}
              </p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                : "space-y-3"
            )}>
              {displayCategories.map((category) => (
                <CategoryCard 
                  key={category.id} 
                  category={category} 
                  isGridView={viewMode === 'grid'} 
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="favorites" className="mt-6">
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              : "space-y-3"
          )}>
            {displayCategories.map((category) => (
              <CategoryCard 
                key={category.id} 
                category={category} 
                isGridView={viewMode === 'grid'} 
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="recent" className="mt-6">
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              : "space-y-3"
          )}>
            {displayCategories.map((category) => (
              <CategoryCard 
                key={category.id} 
                category={category} 
                isGridView={viewMode === 'grid'} 
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-red">
              {mockCategories.length}
            </div>
            <div className={cn("text-sm text-gray-600", locale === 'th' && "font-thai")}>
              {t('navigation.categories')}
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-red">
              {mockCategories.reduce((sum, cat) => sum + cat.sop_count, 0)}
            </div>
            <div className={cn("text-sm text-gray-600", locale === 'th' && "font-thai")}>
              {t('dashboard.totalSops')}
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-red">
              {mockCategories.filter(cat => cat.is_active).length}
            </div>
            <div className={cn("text-sm text-gray-600", locale === 'th' && "font-thai")}>
              {t('dashboard.activeCategories')}
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-red">
              {displayCategories.length}
            </div>
            <div className={cn("text-sm text-gray-600", locale === 'th' && "font-thai")}>
              {searchQuery ? t('common.search') : t('dashboard.viewAll')}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}