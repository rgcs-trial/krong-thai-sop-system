'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Mic, 
  MicOff, 
  Filter, 
  X, 
  Clock,
  Star,
  BookOpen,
  ChevronDown
} from 'lucide-react';

interface SearchFilters {
  categories: string[];
  difficulty: string[];
  status: string[];
  tags: string[];
  timeRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface SOPSearchResult {
  id: string;
  title: string;
  title_fr: string;
  category: string;
  difficulty: string;
  estimatedTime: number;
  tags: string[];
  relevanceScore: number;
}

interface SOPSearchAdvancedProps {
  /** Current search query */
  query: string;
  /** Search filters */
  filters: SearchFilters;
  /** Search results */
  results: SOPSearchResult[];
  /** Loading state */
  isLoading?: boolean;
  /** Voice search enabled */
  enableVoiceSearch?: boolean;
  /** Show advanced filters */
  showFilters?: boolean;
  /** Callback when search query changes */
  onQueryChange: (query: string) => void;
  /** Callback when filters change */
  onFiltersChange: (filters: SearchFilters) => void;
  /** Callback when result is selected */
  onResultSelect: (result: SOPSearchResult) => void;
  /** Callback when voice search toggles */
  onVoiceToggle?: (isActive: boolean) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SOPSearchAdvanced - Advanced search interface with voice activation and filters
 * 
 * Features:
 * - Voice search with speech recognition
 * - Advanced filtering options
 * - Real-time search results
 * - Touch-optimized interface
 * - Bilingual search support
 * - Search history and suggestions
 * 
 * @param props SOPSearchAdvancedProps
 * @returns JSX.Element
 */
const SOPSearchAdvanced: React.FC<SOPSearchAdvancedProps> = ({
  query,
  filters,
  results,
  isLoading = false,
  enableVoiceSearch = true,
  showFilters = true,
  onQueryChange,
  onFiltersChange,
  onResultSelect,
  onVoiceToggle,
  className
}) => {
  const t = useTranslations('sop.search');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Voice recognition setup
  const recognition = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (enableVoiceSearch && 'webkitSpeechRecognition' in window) {
      recognition.current = new webkitSpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setLocalQuery(transcript);
        onQueryChange(transcript);
      };

      recognition.current.onend = () => {
        setIsVoiceActive(false);
        onVoiceToggle?.(false);
      };

      recognition.current.onerror = () => {
        setIsVoiceActive(false);
        onVoiceToggle?.(false);
      };
    }
  }, [enableVoiceSearch, onQueryChange, onVoiceToggle]);

  const handleVoiceToggle = useCallback(() => {
    if (!recognition.current) return;

    if (isVoiceActive) {
      recognition.current.stop();
      setIsVoiceActive(false);
      onVoiceToggle?.(false);
    } else {
      recognition.current.start();
      setIsVoiceActive(true);
      onVoiceToggle?.(true);
    }
  }, [isVoiceActive, onVoiceToggle]);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({
      categories: [],
      difficulty: [],
      status: [],
      tags: [],
      timeRange: 'all',
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
  }, [onFiltersChange]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Input */}
      <Card className="border-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={localQuery}
                onChange={(e) => {
                  setLocalQuery(e.target.value);
                  onQueryChange(e.target.value);
                }}
                placeholder={t('placeholder')}
                className="pl-12 pr-4 h-14 text-tablet-base"
              />
            </div>

            {enableVoiceSearch && (
              <Button
                variant={isVoiceActive ? "default" : "outline"}
                size="icon"
                onClick={handleVoiceToggle}
                className={cn(
                  "h-14 w-14",
                  isVoiceActive && "bg-krong-red animate-pulse"
                )}
                aria-label={t('voiceSearch')}
              >
                {isVoiceActive ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
            )}

            {showFilters && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="h-14 w-14"
                aria-label={t('filters')}
              >
                <Filter className="w-6 h-6" />
              </Button>
            )}
          </div>

          {/* Voice Status */}
          {isVoiceActive && (
            <div className="mt-3 flex items-center justify-center gap-2 text-krong-red">
              <div className="w-2 h-2 rounded-full bg-krong-red animate-pulse" />
              <span className="text-tablet-sm font-body">
                {t('voiceListening')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && isFiltersOpen && (
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-tablet-lg font-heading font-semibold text-krong-black">
                {t('filters.title')}
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t('filters.clear')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsFiltersOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category Filter */}
              <div>
                <label className="text-tablet-sm font-body font-medium text-krong-black mb-2 block">
                  {t('filters.categories')}
                </label>
                <div className="space-y-2">
                  {['food-safety', 'cleaning', 'service', 'kitchen'].map((category) => (
                    <label key={category} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category)}
                        onChange={(e) => {
                          const newCategories = e.target.checked
                            ? [...filters.categories, category]
                            : filters.categories.filter(c => c !== category);
                          handleFilterChange('categories', newCategories);
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-tablet-sm">{t(`categories.${category}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="text-tablet-sm font-body font-medium text-krong-black mb-2 block">
                  {t('filters.difficulty')}
                </label>
                <div className="space-y-2">
                  {['beginner', 'intermediate', 'advanced'].map((level) => (
                    <label key={level} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.difficulty.includes(level)}
                        onChange={(e) => {
                          const newDifficulty = e.target.checked
                            ? [...filters.difficulty, level]
                            : filters.difficulty.filter(d => d !== level);
                          handleFilterChange('difficulty', newDifficulty);
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-tablet-sm">{t(`difficulty.${level}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time Range Filter */}
              <div>
                <label className="text-tablet-sm font-body font-medium text-krong-black mb-2 block">
                  {t('filters.timeRange')}
                </label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-tablet-sm"
                >
                  <option value="all">{t('filters.allTime')}</option>
                  <option value="quick">{t('filters.under5min')}</option>
                  <option value="medium">{t('filters.5to15min')}</option>
                  <option value="long">{t('filters.over15min')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters */}
      {(filters.categories.length > 0 || filters.difficulty.length > 0 || filters.timeRange !== 'all') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-tablet-sm font-body text-muted-foreground">
            {t('activeFilters')}:
          </span>
          
          {filters.categories.map((category) => (
            <Badge key={category} variant="secondary" className="text-tablet-xs">
              {t(`categories.${category}`)}
              <Button
                variant="ghost"
                size="icon"
                className="w-4 h-4 ml-1 hover:bg-transparent"
                onClick={() => {
                  const newCategories = filters.categories.filter(c => c !== category);
                  handleFilterChange('categories', newCategories);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          
          {filters.difficulty.map((level) => (
            <Badge key={level} variant="secondary" className="text-tablet-xs">
              {t(`difficulty.${level}`)}
              <Button
                variant="ghost"
                size="icon"
                className="w-4 h-4 ml-1 hover:bg-transparent"
                onClick={() => {
                  const newDifficulty = filters.difficulty.filter(d => d !== level);
                  handleFilterChange('difficulty', newDifficulty);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-gray-200 rounded" />
                      <div className="h-6 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : results.length > 0 ? (
          results.map((result) => (
            <Card
              key={result.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-2"
              onClick={() => onResultSelect(result)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
                      {result.title}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-tablet-xs">
                        {result.category}
                      </Badge>
                      <Badge variant="outline" className="text-tablet-xs">
                        {t(`difficulty.${result.difficulty}`)}
                      </Badge>
                      <div className="flex items-center gap-1 text-tablet-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {result.estimatedTime}m
                      </div>
                    </div>
                    
                    {result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-tablet-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-golden-saffron" />
                      <span className="text-tablet-sm font-body">
                        {(result.relevanceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground rotate-[-90deg]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : query ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
                {t('noResults.title')}
              </h3>
              <p className="text-tablet-base font-body text-muted-foreground">
                {t('noResults.description', { query })}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
                {t('searchPrompt.title')}
              </h3>
              <p className="text-tablet-base font-body text-muted-foreground">
                {t('searchPrompt.description')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SOPSearchAdvanced;