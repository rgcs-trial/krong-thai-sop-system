'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Filter, X, SortAsc, SortDesc, Calendar, Star, Mic, Save, History, Bookmark, Clock, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSearch, SearchFilters, SortOption, SearchSuggestion } from '@/hooks/use-search';
import { SOPCategory } from './sop-categories-dashboard';
import { SOPDocument } from './sop-document-viewer';

// Types are now imported from the search hook

interface SOPSearchProps {
  locale: string;
  categories?: SOPCategory[];
  onSearch?: (query: string, filters: SearchFilters, sort: SortOption) => void;
  onClear?: () => void;
  onResultSelect?: (result: any) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  showSort?: boolean;
  showVoiceSearch?: boolean;
  showSavedSearches?: boolean;
  autoSearch?: boolean;
  compact?: boolean;
}

// Voice search support check
const isVoiceSearchSupported = () => {
  return typeof window !== 'undefined' && 
         'webkitSpeechRecognition' in window || 
         'SpeechRecognition' in window;
};

export default function SOPSearch({
  locale,
  categories = [],
  onSearch,
  onClear,
  onResultSelect,
  placeholder,
  className,
  showFilters = true,
  showSort = true,
  showVoiceSearch = true,
  showSavedSearches = true,
  autoSearch = true,
  compact = false
}: SOPSearchProps) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchNameTh, setSaveSearchNameTh] = useState('');
  const recognitionRef = useRef<any>(null);

  // Use the enhanced search hook
  const {
    query,
    results,
    filters,
    sort,
    isSearching,
    suggestions,
    searchHistory,
    savedSearches,
    search,
    clearSearch,
    setFilters,
    setSort,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    error
  } = useSearch(locale);

  // Initialize voice recognition
  useEffect(() => {
    if (isVoiceSearchSupported() && showVoiceSearch) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = locale === 'th' ? 'th-TH' : 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        search(transcript, filters, sort);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [locale, showVoiceSearch, search, filters, sort]);

  // Available filter options
  const statusOptions = ['published', 'draft', 'review', 'archived'];
  const priorityOptions = ['low', 'medium', 'high', 'critical'];
  
  // Voice search function
  const startVoiceSearch = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Stop voice search
  const stopVoiceSearch = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (query.trim()) {
      search(query, filters, sort);
      setShowSuggestions(false);
      onSearch?.(query, filters, sort);
    }
  };

  // Handle clear
  const handleClear = () => {
    clearSearch();
    setShowSuggestions(false);
    onClear?.();
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'query') {
      search(suggestion.text, filters, sort);
    } else if (suggestion.type === 'category' && suggestion.id) {
      setFilters({ ...filters, categoryId: suggestion.id });
      search(query, { ...filters, categoryId: suggestion.id }, sort);
    } else if (suggestion.type === 'document') {
      search(suggestion.text, filters, sort);
    }
    setShowSuggestions(false);
  };

  // Handle result selection
  const handleResultSelect = (result: any) => {
    onResultSelect?.(result);
    setShowSuggestions(false);
  };

  // Handle save search
  const handleSaveSearch = () => {
    if (saveSearchName.trim()) {
      saveSearch(saveSearchName, saveSearchNameTh || saveSearchName);
      setSaveSearchName('');
      setSaveSearchNameTh('');
      setShowSaveDialog(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (
    filterType: string,
    value: string | boolean,
    action?: 'add' | 'remove'
  ) => {
    const newFilters = { ...filters };
    
    if (filterType === 'categoryId') {
      newFilters.categoryId = value as string;
    } else if (filterType === 'status') {
      newFilters.status = value as any;
    } else if (filterType === 'priority') {
      newFilters.priority = value as any;
    } else if (filterType === 'hasMedia') {
      newFilters.hasMedia = value as boolean;
    } else if (filterType === 'tags') {
      if (!newFilters.tags) newFilters.tags = [];
      if (action === 'add' && !newFilters.tags.includes(value as string)) {
        newFilters.tags = [...newFilters.tags, value as string];
      } else if (action === 'remove') {
        newFilters.tags = newFilters.tags.filter(tag => tag !== value);
      }
    }
    
    setFilters(newFilters);
    if (autoSearch && query.trim()) {
      search(query, newFilters, sort);
    }
  };

  // Handle sort change
  const handleSortChange = (field: SortOption['field']) => {
    const newSort: SortOption = {
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc'
    };
    setSort(newSort);
    if (autoSearch && query.trim()) {
      search(query, filters, newSort);
    }
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.hasMedia) count++;
    if (filters.tags?.length) count += filters.tags.length;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    return count;
  }, [filters]);

  // Show suggestions when input is focused and has suggestions
  const shouldShowSuggestions = showSuggestions && (suggestions.length > 0 || searchHistory.length > 0 || results.length > 0);

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