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
      recognitionRef.current.lang = locale === 'fr' ? 'th-TH' : 'en-US';

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
            ref={inputRef}
            placeholder={placeholder || t('sop.searchPlaceholder')}
            value={query}
            onChange={(e) => search(e.target.value, filters, sort)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            className={cn(
              "pl-10 h-12 text-base bg-white transition-all",
              compact ? "pr-16" : "pr-24",
              isSearching && "opacity-75"
            )}
            disabled={isSearching}
          />
          <div className={cn(
            "absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1",
            compact && "gap-0.5"
          )}>
            {/* Voice Search Button */}
            {showVoiceSearch && isVoiceSearchSupported() && (
              <Button
                variant="ghost"
                size="icon"
                onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                className={cn(
                  "w-8 h-8 transition-colors",
                  isListening && "bg-brand-red text-white animate-pulse"
                )}
                disabled={isSearching}
                title={isListening ? t('search.stopListening') : t('search.startListening')}
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}
            
            {/* Clear Button */}
            {query && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="w-8 h-8"
                title={t('common.clear')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            
            {/* Save Search Button */}
            {!compact && query && showSavedSearches && (
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    title={t('search.saveSearch')}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('search.saveSearch')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="search-name">{t('search.searchName')}</Label>
                      <Input
                        id="search-name"
                        value={saveSearchName}
                        onChange={(e) => setSaveSearchName(e.target.value)}
                        placeholder={t('search.searchNamePlaceholder')}
                      />
                    </div>
                    {locale === 'fr' && (
                      <div>
                        <Label htmlFor="search-name-th">{t('search.searchNameThai')}</Label>
                        <Input
                          id="search-name-th"
                          value={saveSearchNameTh}
                          onChange={(e) => setSaveSearchNameTh(e.target.value)}
                          placeholder={t('search.searchNameThaiPlaceholder')}
                          className="font-thai"
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleSaveSearch} disabled={!saveSearchName.trim()}>
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Enhanced Search Suggestions & Results */}
        {shouldShowSuggestions && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-hidden shadow-lg border-2">
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {/* Search History */}
                {searchHistory.length > 0 && query.length < 2 && (
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">{t('search.recentSearches')}</span>
                    </div>
                    {searchHistory.slice(0, 5).map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => search(item.query, item.filters || {}, sort)}
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm flex items-center justify-between"
                      >
                        <span>{item.query}</span>
                        <span className="text-xs text-gray-400">{item.resultCount} results</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Saved Searches */}
                {savedSearches.length > 0 && query.length < 2 && showSavedSearches && (
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2 mb-2">
                      <Bookmark className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">{t('search.savedSearches')}</span>
                    </div>
                    {savedSearches.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <button
                          onClick={() => loadSavedSearch(item)}
                          className="flex-1 text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm"
                        >
                          <div className={cn(locale === 'fr' && "font-thai")}>
                            {locale === 'fr' ? item.name_th : item.name}
                          </div>
                          <div className="text-xs text-gray-400">{item.query}</div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSavedSearch(item.id)}
                          className="w-6 h-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Suggestions */}
                {suggestions.length > 0 && (
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-brand-red" />
                      <span className="text-sm font-medium text-gray-600">{t('search.suggestions')}</span>
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm flex items-center gap-2",
                          locale === 'fr' && "font-thai"
                        )}
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          suggestion.type === 'category' && "bg-blue-500",
                          suggestion.type === 'document' && "bg-green-500",
                          suggestion.type === 'tag' && "bg-purple-500",
                          suggestion.type === 'query' && "bg-gray-500"
                        )} />
                        {suggestion.text}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick Results Preview */}
                {results.length > 0 && query.length >= 2 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4 text-brand-red" />
                      <span className="text-sm font-medium text-gray-600">
                        {t('search.results')} ({results.length})
                      </span>
                    </div>
                    {results.slice(0, 3).map((result) => {
                      const title = locale === 'fr' ? result.title_th : result.title_en;
                      const content = locale === 'fr' ? result.content_th : result.content_en;
                      
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultSelect(result)}
                          className={cn(
                            "w-full text-left p-2 rounded hover:bg-gray-50 transition-colors border-l-2 border-transparent hover:border-brand-red",
                            locale === 'fr' && "font-thai"
                          )}
                        >
                          <div className="font-medium text-sm line-clamp-1">{title}</div>
                          <div className="text-xs text-gray-500 line-clamp-1">{content}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {result.is_critical && (
                              <Badge variant="destructive" className="text-xs px-1 py-0">
                                {t('sop.critical')}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400">{result.category?.name_en}</span>
                          </div>
                        </button>
                      );
                    })}
                    {results.length > 3 && (
                      <div className="text-center mt-2">
                        <span className="text-xs text-gray-500">
                          +{results.length - 3} {t('search.moreResults')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* No Results */}
                {query.length >= 2 && results.length === 0 && !isSearching && (
                  <div className="p-4 text-center text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">{t('search.noResults')}</div>
                    <div className="text-xs">{t('search.tryDifferentKeywords')}</div>
                  </div>
                )}

                {/* Loading */}
                {isSearching && (
                  <div className="p-4 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full mx-auto mb-2" />
                    <div className="text-sm text-gray-500">{t('search.searching')}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter and Sort Controls */}
      {(showFilters || showSort) && !compact && (
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
            
            {/* Quick Filter Buttons */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {t('search.quickFilters')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium">{t('sop.category')}</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {categories.slice(0, 4).map((category) => (
                        <Button
                          key={category.id}
                          variant={filters.categoryId === category.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleFilterChange('categoryId', 
                            filters.categoryId === category.id ? '' : category.id
                          )}
                          className="text-xs h-6"
                        >
                          {locale === 'fr' ? category.name_th : category.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium">{t('sop.priority')}</Label>
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant={filters.priority === 'critical' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('priority', 
                          filters.priority === 'critical' ? '' : 'critical'
                        )}
                        className="text-xs h-6"
                      >
                        {t('sop.critical')}
                      </Button>
                      <Button
                        variant={filters.hasMedia ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('hasMedia', !filters.hasMedia)}
                        className="text-xs h-6"
                      >
                        {t('search.hasMedia')}
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
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
              {(['relevance', 'title', 'updated_at', 'priority'] as const).map((field) => (
                <Button
                  key={field}
                  variant={sort.field === field ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSortChange(field)}
                  className="flex items-center gap-1 text-xs"
                >
                  {t(`search.sort.${field}`)}
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
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {t('search.advancedFilters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t('navigation.categories')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.map((category) => {
                    const name = locale === 'fr' ? category.name_th : category.name;
                    const isSelected = filters.categoryId === category.id;
                    
                    return (
                      <Button
                        key={category.id}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('categoryId', isSelected ? '' : category.id)}
                        className={cn(
                          "text-xs justify-start h-auto p-2", 
                          locale === 'fr' && "font-thai"
                        )}
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        {name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Status and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">{t('sop.status')}</h4>
                <div className="space-y-1">
                  {statusOptions.map((status) => (
                    <Button
                      key={status}
                      variant={filters.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('status', filters.status === status ? '' : status)}
                      className="w-full justify-start text-xs"
                    >
                      {t(`sop.status.${status}`)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">{t('sop.priority')}</h4>
                <div className="space-y-1">
                  {priorityOptions.map((priority) => (
                    <Button
                      key={priority}
                      variant={filters.priority === priority ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('priority', filters.priority === priority ? '' : priority)}
                      className={cn(
                        "w-full justify-start text-xs",
                        priority === 'critical' && filters.priority === priority && "bg-red-600 hover:bg-red-700"
                      )}
                    >
                      {t(`sop.priority.${priority}`)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Filters */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t('search.additionalFilters')}</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filters.hasMedia ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('hasMedia', !filters.hasMedia)}
                  className="text-xs"
                >
                  {t('search.hasMedia')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.categoryId && (() => {
            const category = categories.find(c => c.id === filters.categoryId);
            const name = category ? (locale === 'fr' ? category.name_th : category.name) : filters.categoryId;
            
            return (
              <Badge
                key={filters.categoryId}
                variant="secondary"
                className={cn("flex items-center gap-1", locale === 'fr' && "font-thai")}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: category?.color || '#gray' }}
                />
                {name}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-600" 
                  onClick={() => handleFilterChange('categoryId', '')}
                />
              </Badge>
            );
          })()}
          
          {filters.status && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t(`sop.status.${filters.status}`)}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-600" 
                onClick={() => handleFilterChange('status', '')}
              />
            </Badge>
          )}
          
          {filters.priority && (
            <Badge
              variant={filters.priority === 'critical' ? 'destructive' : 'secondary'}
              className="flex items-center gap-1"
            >
              {t(`sop.priority.${filters.priority}`)}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-600" 
                onClick={() => handleFilterChange('priority', '')}
              />
            </Badge>
          )}
          
          {filters.hasMedia && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t('search.hasMedia')}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-600" 
                onClick={() => handleFilterChange('hasMedia', false)}
              />
            </Badge>
          )}
          
          {filters.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={cn("flex items-center gap-1", locale === 'fr' && "font-thai")}
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

      {/* Search Results Count */}
      {query && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {isSearching ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full" />
                {t('search.searching')}
              </span>
            ) : (
              t('search.resultsCount', { count: results.length, query })
            )}
          </span>
          
          {error && (
            <span className="text-red-600 text-xs">
              {t('search.searchError')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Add types for voice recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}