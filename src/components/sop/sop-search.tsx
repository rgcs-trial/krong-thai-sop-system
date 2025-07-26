'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Filter, X, SortAsc, SortDesc, Calendar, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SOPCategory } from './sop-categories-dashboard';
import { SOPDocument } from './sop-document-viewer';

interface SearchFilters {
  categories: string[];
  statuses: string[];
  priorities: string[];
  tags: string[];
  dateRange: {
    from?: string;
    to?: string;
  };
}

interface SortOption {
  field: 'title' | 'updated_at' | 'priority' | 'created_at';
  direction: 'asc' | 'desc';
}

interface SOPSearchProps {
  locale: string;
  categories?: SOPCategory[];
  onSearch: (query: string, filters: SearchFilters, sort: SortOption) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  showSort?: boolean;
}

// Mock SOPs for search demonstration
const mockSOPs: SOPDocument[] = [
  {
    id: '1',
    category_id: '1',
    title: 'Food Temperature Control',
    title_th: 'การควบคุมอุณหภูมิอาหาร',
    content: 'Temperature monitoring procedures',
    content_th: 'ขั้นตอนการตรวจสอบอุณหภูมิ',
    steps: [],
    steps_th: [],
    attachments: [],
    tags: ['food safety', 'temperature', 'monitoring'],
    tags_th: ['ความปลอดภัยอาหาร', 'อุณหภูมิ', 'การตรวจสอบ'],
    version: 2,
    status: 'approved',
    priority: 'high',
    effective_date: '2024-01-01',
    review_date: '2024-06-01',
    created_by: 'Chef Manager',
    approved_by: 'Restaurant Manager',
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    category_id: '2',
    title: 'Kitchen Equipment Cleaning',
    title_th: 'การทำความสะอาดอุปกรณ์ครัว',
    content: 'Daily cleaning procedures for kitchen equipment',
    content_th: 'ขั้นตอนการทำความสะอาดอุปกรณ์ครัวรายวัน',
    steps: [],
    steps_th: [],
    attachments: [],
    tags: ['cleaning', 'equipment', 'daily tasks'],
    tags_th: ['การทำความสะอาด', 'อุปกรณ์', 'งานประจำวัน'],
    version: 1,
    status: 'approved',
    priority: 'medium',
    effective_date: '2024-01-01',
    review_date: '2024-07-01',
    created_by: 'Kitchen Supervisor',
    approved_by: 'Chef Manager',
    created_at: '2024-01-05T14:00:00Z',
    updated_at: '2024-01-12T16:45:00Z'
  }
];

export default function SOPSearch({
  locale,
  categories = [],
  onSearch,
  onClear,
  placeholder,
  className,
  showFilters = true,
  showSort = true
}: SOPSearchProps) {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    statuses: [],
    priorities: [],
    tags: [],
    dateRange: {}
  });
  const [sort, setSort] = useState<SortOption>({
    field: 'updated_at',
    direction: 'desc'
  });

  // Search suggestions based on mock data
  const searchSuggestions = useMemo(() => {
    if (!query || query.length < 2) return [];
    
    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();
    
    mockSOPs.forEach(sop => {
      const title = locale === 'th' ? sop.title_th : sop.title;
      const tags = locale === 'th' ? sop.tags_th : sop.tags;
      
      if (title.toLowerCase().includes(queryLower)) {
        suggestions.add(title);
      }
      
      tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          suggestions.add(tag);
        }
      });
    });
    
    return Array.from(suggestions).slice(0, 5);
  }, [query, locale]);

  // Available filter options
  const statusOptions = ['draft', 'review', 'approved', 'archived'];
  const priorityOptions = ['low', 'medium', 'high', 'critical'];
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    mockSOPs.forEach(sop => {
      const sopTags = locale === 'th' ? sop.tags_th : sop.tags;
      sopTags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [locale]);

  // Handle search
  const handleSearch = () => {
    onSearch(query, filters, sort);
  };

  // Handle clear
  const handleClear = () => {
    setQuery('');
    setFilters({
      categories: [],
      statuses: [],
      priorities: [],
      tags: [],
      dateRange: {}
    });
    setSort({
      field: 'updated_at',
      direction: 'desc'
    });
    onClear();
  };

  // Handle filter change
  const handleFilterChange = (
    filterType: keyof SearchFilters,
    value: string,
    action: 'add' | 'remove'
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterType === 'dateRange') {
        // Handle date range separately
        return newFilters;
      }
      
      const currentValues = newFilters[filterType] as string[];
      
      if (action === 'add' && !currentValues.includes(value)) {
        (newFilters[filterType] as string[]) = [...currentValues, value];
      } else if (action === 'remove') {
        (newFilters[filterType] as string[]) = currentValues.filter(v => v !== value);
      }
      
      return newFilters;
    });
  };

  // Handle sort change
  const handleSortChange = (field: SortOption['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return filters.categories.length + 
           filters.statuses.length + 
           filters.priorities.length + 
           filters.tags.length +
           (filters.dateRange.from || filters.dateRange.to ? 1 : 0);
  }, [filters]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={placeholder || t('sop.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-20 h-12 text-base bg-white"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
            {query && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuery('')}
                className="w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={handleSearch}
              size="sm"
              className="h-8"
            >
              {t('common.search')}
            </Button>
          </div>
        </div>

        {/* Search Suggestions */}
        {searchSuggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto">
            <CardContent className="p-2">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(suggestion);
                    handleSearch();
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors",
                    "text-sm",
                    locale === 'th' && "font-thai"
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter and Sort Controls */}
      {(showFilters || showSort) && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {showFilters && (
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {t('common.filter')}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
            
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-gray-500"
              >
                {t('common.clear')}
              </Button>
            )}
          </div>

          {showSort && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('common.sort')}:</span>
              {(['title', 'updated_at', 'priority'] as const).map((field) => (
                <Button
                  key={field}
                  variant={sort.field === field ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSortChange(field)}
                  className="flex items-center gap-1"
                >
                  {t(`sop.${field === 'updated_at' ? 'lastUpdated' : field}`)}
                  {sort.field === field && (
                    sort.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('common.filter')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t('navigation.categories')}</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const name = locale === 'th' ? category.name_th : category.name;
                    const isSelected = filters.categories.includes(category.id);
                    
                    return (
                      <Button
                        key={category.id}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('categories', category.id, isSelected ? 'remove' : 'add')}
                        className={cn("text-xs", locale === 'th' && "font-thai")}
                      >
                        {name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Status */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t('sop.status')}</h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => {
                  const isSelected = filters.statuses.includes(status);
                  
                  return (
                    <Button
                      key={status}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('statuses', status, isSelected ? 'remove' : 'add')}
                      className="text-xs"
                    >
                      {t(`sop.${status}`)}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Priority */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t('sop.priority')}</h4>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((priority) => {
                  const isSelected = filters.priorities.includes(priority);
                  
                  return (
                    <Button
                      key={priority}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('priorities', priority, isSelected ? 'remove' : 'add')}
                      className="text-xs"
                    >
                      {t(`sop.${priority}`)}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Tags */}
            {allTags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t('sop.tags')}</h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allTags.map((tag) => {
                    const isSelected = filters.tags.includes(tag);
                    
                    return (
                      <Button
                        key={tag}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('tags', tag, isSelected ? 'remove' : 'add')}
                        className={cn("text-xs", locale === 'th' && "font-thai")}
                      >
                        {tag}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.categories.map((categoryId) => {
            const category = categories.find(c => c.id === categoryId);
            const name = category ? (locale === 'th' ? category.name_th : category.name) : categoryId;
            
            return (
              <Badge
                key={categoryId}
                variant="secondary"
                className={cn("flex items-center gap-1", locale === 'th' && "font-thai")}
              >
                {name}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-600" 
                  onClick={() => handleFilterChange('categories', categoryId, 'remove')}
                />
              </Badge>
            );
          })}
          
          {filters.statuses.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t(`sop.${status}`)}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-600" 
                onClick={() => handleFilterChange('statuses', status, 'remove')}
              />
            </Badge>
          ))}
          
          {filters.priorities.map((priority) => (
            <Badge
              key={priority}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t(`sop.${priority}`)}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-600" 
                onClick={() => handleFilterChange('priorities', priority, 'remove')}
              />
            </Badge>
          ))}
          
          {filters.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={cn("flex items-center gap-1", locale === 'th' && "font-thai")}
            >
              {tag}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-600" 
                onClick={() => handleFilterChange('tags', tag, 'remove')}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}