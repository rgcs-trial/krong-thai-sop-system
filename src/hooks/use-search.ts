'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from './use-debounce';
import { supabase } from '@/lib/supabase-client';
import { useSOPStore } from '@/lib/stores/sop-store';

interface SearchFilters {
  categoryId?: string;
  status?: 'published' | 'draft' | 'review' | 'archived';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  tags?: string[];
  hasMedia?: boolean;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface SortOption {
  field: 'title' | 'updated_at' | 'priority' | 'created_at' | 'relevance';
  direction: 'asc' | 'desc';
}

interface SearchResult {
  id: string;
  category_id: string;
  title_en: string;
  title_th: string;
  content_en: string;
  content_th: string;
  tags?: string[];
  tags_th?: string[];
  version: string;
  is_critical: boolean;
  is_published: boolean;
  media_urls?: string[];
  created_at: string;
  updated_at: string;
  category?: {
    name_en: string;
    name_th: string;
    color: string;
  };
  // Search-specific fields
  rank?: number;
  highlight?: {
    title?: string;
    content?: string;
    tags?: string[];
  };
}

interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
  filters?: SearchFilters;
}

interface SavedSearch {
  id: string;
  name: string;
  name_th: string;
  query: string;
  filters: SearchFilters;
  sort: SortOption;
  createdAt: number;
  lastUsed: number;
}

interface SearchSuggestion {
  type: 'query' | 'tag' | 'category' | 'document';
  text: string;
  text_th?: string;
  id?: string;
  category?: string;
}

export function useSearch(locale: string = 'en') {
  const queryClient = useQueryClient();
  const { searchQuery, searchResults, searchFilters, setSearchQuery, setSearchResults, setSearchFilters } = useSOPStore();

  // Local state
  const [filters, setLocalFilters] = useState<SearchFilters>(searchFilters);
  const [sort, setSort] = useState<SortOption>({ field: 'relevance', direction: 'desc' });
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Debounced search query for auto-search
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Load search history and saved searches from localStorage
  useEffect(() => {
    const loadLocalData = () => {
      try {
        const history = localStorage.getItem('krong-thai-search-history');
        const saved = localStorage.getItem('krong-thai-saved-searches');
        
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
        if (saved) {
          setSavedSearches(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load search data from localStorage:', error);
      }
    };
    
    loadLocalData();
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = useCallback((query: string, resultCount: number, filters?: SearchFilters) => {
    const newEntry: SearchHistory = {
      id: Date.now().toString(),
      query,
      timestamp: Date.now(),
      resultCount,
      filters
    };

    setSearchHistory(prev => {
      // Remove duplicates and keep only recent 20 searches
      const filtered = prev.filter(item => item.query !== query);
      const updated = [newEntry, ...filtered].slice(0, 20);
      localStorage.setItem('krong-thai-search-history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Full-text search function
  const performFullTextSearch = async (
    query: string,
    filters: SearchFilters = {},
    sortOption: SortOption = { field: 'relevance', direction: 'desc' }
  ): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    let searchQuery = supabase
      .from('sop_documents')
      .select(`
        id,
        category_id,
        title_en,
        title_th,
        content_en,
        content_th,
        tags,
        tags_th,
        version,
        is_critical,
        is_published,
        media_urls,
        created_at,
        updated_at,
        sop_categories (
          name_en,
          name_th,
          color
        )
      `)
      .eq('is_published', true);

    // Construct full-text search
    const searchTerms = query.trim().split(/\s+/).join(' | ');
    
    // Search in both English and Thai content
    const titleSearch = locale === 'th' ? 'title_th' : 'title_en';
    const contentSearch = locale === 'th' ? 'content_th' : 'content_en';
    
    searchQuery = searchQuery.or(`
      ${titleSearch}.ilike.%${query}%,
      ${contentSearch}.ilike.%${query}%,
      tags.cs.{${query}},
      tags_th.cs.{${query}}
    `);

    // Apply filters
    if (filters.categoryId) {
      searchQuery = searchQuery.eq('category_id', filters.categoryId);
    }

    if (filters.status) {
      // Map status to database fields
      if (filters.status === 'published') {
        searchQuery = searchQuery.eq('is_published', true);
      }
    }

    if (filters.priority === 'critical') {
      searchQuery = searchQuery.eq('is_critical', true);
    }

    if (filters.hasMedia) {
      searchQuery = searchQuery.not('media_urls', 'is', null);
    }

    if (filters.dateRange?.from || filters.dateRange?.to) {
      if (filters.dateRange.from) {
        searchQuery = searchQuery.gte('updated_at', filters.dateRange.from);
      }
      if (filters.dateRange.to) {
        searchQuery = searchQuery.lte('updated_at', filters.dateRange.to);
      }
    }

    // Apply sorting
    switch (sortOption.field) {
      case 'title':
        searchQuery = searchQuery.order(locale === 'th' ? 'title_th' : 'title_en', { ascending: sortOption.direction === 'asc' });
        break;
      case 'updated_at':
        searchQuery = searchQuery.order('updated_at', { ascending: sortOption.direction === 'asc' });
        break;
      case 'created_at':
        searchQuery = searchQuery.order('created_at', { ascending: sortOption.direction === 'asc' });
        break;
      case 'priority':
        searchQuery = searchQuery.order('is_critical', { ascending: sortOption.direction !== 'asc' });
        break;
      default:
        // Default relevance sorting (critical first, then by update date)
        searchQuery = searchQuery
          .order('is_critical', { ascending: false })
          .order('updated_at', { ascending: false });
    }

    const { data, error } = await searchQuery.limit(50);

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // Add relevance scoring and highlighting
    const results: SearchResult[] = (data || []).map((item: any) => ({
      ...item,
      category: item.sop_categories,
      rank: calculateRelevanceScore(item, query, locale),
      highlight: generateHighlights(item, query, locale)
    }));

    // Sort by relevance if using relevance sorting
    if (sortOption.field === 'relevance') {
      results.sort((a, b) => (b.rank || 0) - (a.rank || 0));
    }

    return results;
  };

  // Calculate relevance score for search results
  const calculateRelevanceScore = (item: any, query: string, locale: string): number => {
    let score = 0;
    const queryLower = query.toLowerCase();
    const title = (locale === 'th' ? item.title_th : item.title_en).toLowerCase();
    const content = (locale === 'th' ? item.content_th : item.content_en).toLowerCase();
    const tags = locale === 'th' ? (item.tags_th || []) : (item.tags || []);

    // Title matches (highest priority)
    if (title.includes(queryLower)) {
      score += title.startsWith(queryLower) ? 100 : 50;
    }

    // Tag matches (high priority)
    const tagMatches = tags.filter((tag: string) => tag.toLowerCase().includes(queryLower));
    score += tagMatches.length * 30;

    // Content matches (medium priority)
    const contentMatches = (content.match(new RegExp(queryLower, 'gi')) || []).length;
    score += Math.min(contentMatches * 5, 25);

    // Critical SOPs get bonus
    if (item.is_critical) {
      score += 20;
    }

    // Recently updated bonus
    const daysSinceUpdate = (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += 10;
    }

    return score;
  };

  // Generate search result highlights
  const generateHighlights = (item: any, query: string, locale: string) => {
    const queryLower = query.toLowerCase();
    const title = locale === 'th' ? item.title_th : item.title_en;
    const content = locale === 'th' ? item.content_th : item.content_en;
    const tags = locale === 'th' ? (item.tags_th || []) : (item.tags || []);

    const highlight: any = {};

    // Highlight title
    if (title.toLowerCase().includes(queryLower)) {
      highlight.title = title.replace(
        new RegExp(`(${query})`, 'gi'),
        '<mark>$1</mark>'
      );
    }

    // Highlight content excerpt
    const contentLower = content.toLowerCase();
    const queryIndex = contentLower.indexOf(queryLower);
    if (queryIndex !== -1) {
      const start = Math.max(0, queryIndex - 50);
      const end = Math.min(content.length, queryIndex + query.length + 50);
      const excerpt = content.substring(start, end);
      highlight.content = excerpt.replace(
        new RegExp(`(${query})`, 'gi'),
        '<mark>$1</mark>'
      );
    }

    // Highlight matching tags
    highlight.tags = tags.filter((tag: string) => 
      tag.toLowerCase().includes(queryLower)
    );

    return highlight;
  };

  // Search suggestions based on query
  const { data: suggestions = [] } = useQuery({
    queryKey: ['search-suggestions', searchQuery, locale],
    queryFn: async (): Promise<SearchSuggestion[]> => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const suggestions: SearchSuggestion[] = [];

      // Add suggestions from search history
      searchHistory
        .filter(item => item.query.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 3)
        .forEach(item => {
          suggestions.push({
            type: 'query',
            text: item.query
          });
        });

      // Get category suggestions
      const { data: categories } = await supabase
        .from('sop_categories')
        .select('id, name_en, name_th')
        .or(`name_en.ilike.%${searchQuery}%,name_th.ilike.%${searchQuery}%`)
        .limit(3);

      categories?.forEach(category => {
        suggestions.push({
          type: 'category',
          text: locale === 'th' ? category.name_th : category.name_en,
          text_th: category.name_th,
          id: category.id
        });
      });

      // Get document title suggestions
      const { data: documents } = await supabase
        .from('sop_documents')
        .select('id, title_en, title_th, category_id')
        .or(`title_en.ilike.%${searchQuery}%,title_th.ilike.%${searchQuery}%`)
        .eq('is_published', true)
        .limit(3);

      documents?.forEach(doc => {
        suggestions.push({
          type: 'document',
          text: locale === 'th' ? doc.title_th : doc.title_en,
          text_th: doc.title_th,
          id: doc.id,
          category: doc.category_id
        });
      });

      return suggestions.slice(0, 8);
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000 // 30 seconds
  });

  // Main search query
  const searchMutation = useMutation({
    mutationFn: ({ query, filters, sort }: { query: string; filters: SearchFilters; sort: SortOption }) =>
      performFullTextSearch(query, filters, sort),
    onMutate: () => {
      setIsSearching(true);
    },
    onSuccess: (results, variables) => {
      setSearchResults(results as any);
      setSearchFilters(variables.filters);
      saveSearchHistory(variables.query, results.length, variables.filters);
    },
    onError: (error) => {
      console.error('Search failed:', error);
    },
    onSettled: () => {
      setIsSearching(false);
    }
  });

  // Auto-search on debounced query change
  useEffect(() => {
    if (debouncedQuery.trim() && debouncedQuery !== searchQuery) {
      searchMutation.mutate({
        query: debouncedQuery,
        filters,
        sort
      });
    }
  }, [debouncedQuery, filters, sort]);

  // Search function
  const search = useCallback((query: string, newFilters: SearchFilters = {}, newSort: SortOption = sort) => {
    setSearchQuery(query);
    setLocalFilters(newFilters);
    setSort(newSort);
    
    if (query.trim()) {
      searchMutation.mutate({
        query,
        filters: newFilters,
        sort: newSort
      });
    } else {
      setSearchResults([]);
    }
  }, [sort, searchMutation, setSearchQuery, setSearchResults]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setLocalFilters({});
    setSort({ field: 'relevance', direction: 'desc' });
  }, [setSearchQuery, setSearchResults]);

  // Save search
  const saveSearch = useCallback((name: string, name_th: string) => {
    if (!searchQuery.trim()) return;

    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      name_th,
      query: searchQuery,
      filters,
      sort,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };

    setSavedSearches(prev => {
      const updated = [savedSearch, ...prev].slice(0, 10); // Keep only 10 saved searches
      localStorage.setItem('krong-thai-saved-searches', JSON.stringify(updated));
      return updated;
    });
  }, [searchQuery, filters, sort]);

  // Load saved search
  const loadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    search(savedSearch.query, savedSearch.filters, savedSearch.sort);
    
    // Update last used timestamp
    setSavedSearches(prev => {
      const updated = prev.map(item => 
        item.id === savedSearch.id ? { ...item, lastUsed: Date.now() } : item
      );
      localStorage.setItem('krong-thai-saved-searches', JSON.stringify(updated));
      return updated;
    });
  }, [search]);

  // Delete saved search
  const deleteSavedSearch = useCallback((id: string) => {
    setSavedSearches(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('krong-thai-saved-searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    // State
    query: searchQuery,
    results: searchResults as SearchResult[],
    filters,
    sort,
    isSearching: isSearching || searchMutation.isPending,
    suggestions,
    searchHistory,
    savedSearches,

    // Actions
    search,
    clearSearch,
    setFilters: setLocalFilters,
    setSort,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,

    // Utils
    error: searchMutation.error,
    isError: searchMutation.isError
  };
}

export type { SearchFilters, SortOption, SearchResult, SearchHistory, SavedSearch, SearchSuggestion };