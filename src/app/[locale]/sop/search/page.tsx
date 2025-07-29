'use client';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Search, 
  Filter, 
  X, 
  Star, 
  Clock, 
  Grid3X3, 
  List, 
  SlidersHorizontal,
  ArrowUpDown,
  CheckCircle,
  AlertTriangle,
  Play,
  Share2,
  Download,
  Eye,
  Timer,
  Users,
  FileText,
  Tag,
  Calendar,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';

interface SOPSearchPageProps {
  params: Promise<{ locale: string }>;
}

interface SOPSearchResult {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  category: string;
  category_fr: string;
  category_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number;
  version: string;
  last_updated: string;
  completion_count: number;
  is_required: boolean;
  status: 'active' | 'draft' | 'archived';
  tags: string[];
  author: string;
  is_favorite?: boolean;
  match_score?: number;
  match_highlights?: string[];
}

interface SearchFilters {
  categories: string[];
  difficulties: string[];
  timeRanges: string[];
  statuses: string[];
  isRequired?: boolean;
  isFavorite?: boolean;
  hasCompletions?: boolean;
}

// Mock search results
const MOCK_SEARCH_RESULTS: SOPSearchResult[] = [
  {
    id: '1',
    title: 'Hand Washing Procedure',
    title_fr: 'Procédure de Lavage des Mains',
    description: 'Proper hand washing technique for food service staff to ensure hygiene standards',
    description_fr: 'Technique appropriée de lavage des mains pour le personnel de service alimentaire',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    category_id: '1',
    difficulty: 'easy',
    estimated_time: 5,
    version: '2.1',
    last_updated: '2024-01-20',
    completion_count: 45,
    is_required: true,
    status: 'active',
    tags: ['hygiene', 'basic', 'required'],
    author: 'Health Department',
    match_score: 95,
    match_highlights: ['hand washing', 'hygiene']
  },
  {
    id: '2',
    title: 'Temperature Control Monitoring',
    title_fr: 'Surveillance du Contrôle de Température',
    description: 'Daily temperature checks for refrigeration units and food storage areas',
    description_fr: 'Contrôles quotidiens de température pour les unités de réfrigération',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    category_id: '1',
    difficulty: 'medium',
    estimated_time: 15,
    version: '1.8',
    last_updated: '2024-01-18',
    completion_count: 32,
    is_required: true,
    status: 'active',
    tags: ['temperature', 'monitoring', 'daily'],
    author: 'Kitchen Manager',
    match_score: 88,
    match_highlights: ['temperature', 'monitoring']
  },
  {
    id: '3',
    title: 'Kitchen Equipment Cleaning',
    title_fr: 'Nettoyage de l\'Équipement de Cuisine',
    description: 'Complete cleaning procedures for all kitchen equipment and surfaces',
    description_fr: 'Procédures de nettoyage complètes pour tous les équipements de cuisine',
    category: 'Cleaning',
    category_fr: 'Nettoyage',
    category_id: '2',
    difficulty: 'medium',
    estimated_time: 30,
    version: '1.5',
    last_updated: '2024-01-15',
    completion_count: 28,
    is_required: false,
    status: 'active',
    tags: ['cleaning', 'equipment', 'kitchen'],
    author: 'Cleaning Supervisor',
    match_score: 75,
    match_highlights: ['cleaning', 'equipment']
  }
];

const CATEGORIES = [
  { id: '1', name: 'Food Safety', name_fr: 'Sécurité Alimentaire' },
  { id: '2', name: 'Cleaning', name_fr: 'Nettoyage' },
  { id: '3', name: 'Service', name_fr: 'Service' },
  { id: '4', name: 'Kitchen Operations', name_fr: 'Opérations de Cuisine' },
];

function SOPSearchContent({ params }: SOPSearchPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SOPSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'relevance' | 'title' | 'difficulty' | 'time' | 'updated'>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    difficulties: [],
    timeRanges: [],
    statuses: [],
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('sop');
  const { favorites, toggleFavorite } = useFavorites();

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Get initial search query from URL
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(decodeURIComponent(query));
    }
  }, [searchParams]);

  // Apply favorites to search results
  useEffect(() => {
    setSearchResults(current => 
      current.map(sop => ({
        ...sop,
        is_favorite: favorites.some(fav => fav.id === sop.id && fav.type === 'sop')
      }))
    );
  }, [favorites]);

  // Perform search when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      // Mock search implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const filtered = MOCK_SEARCH_RESULTS.filter(sop => {
        const searchText = query.toLowerCase();
        return (
          sop.title.toLowerCase().includes(searchText) ||
          sop.title_fr.toLowerCase().includes(searchText) ||
          sop.description.toLowerCase().includes(searchText) ||
          sop.description_fr.toLowerCase().includes(searchText) ||
          sop.tags.some(tag => tag.toLowerCase().includes(searchText)) ||
          sop.category.toLowerCase().includes(searchText) ||
          sop.category_fr.toLowerCase().includes(searchText)
        );
      });

      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: t('search.error'),
        description: t('search.errorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedResults = useCallback(() => {
    let results = [...searchResults];

    // Apply filters
    if (filters.categories.length > 0) {
      results = results.filter(sop => filters.categories.includes(sop.category_id));
    }
    if (filters.difficulties.length > 0) {
      results = results.filter(sop => filters.difficulties.includes(sop.difficulty));
    }
    if (filters.statuses.length > 0) {
      results = results.filter(sop => filters.statuses.includes(sop.status));
    }
    if (filters.isRequired !== undefined) {
      results = results.filter(sop => sop.is_required === filters.isRequired);
    }
    if (filters.isFavorite) {
      results = results.filter(sop => sop.is_favorite);
    }

    // Apply sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (b.match_score || 0) - (a.match_score || 0);
        case 'title':
          return (locale === 'fr' ? a.title_fr : a.title).localeCompare(locale === 'fr' ? b.title_fr : b.title);
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'time':
          return a.estimated_time - b.estimated_time;
        case 'updated':
          return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
        default:
          return 0;
      }
    });

    return results;
  }, [searchResults, filters, sortBy, locale]);

  const handleSOPSelect = (sop: SOPSearchResult) => {
    router.push(`/${locale}/sop/documents/${sop.id}`);
  };

  const handleToggleFavorite = (sop: SOPSearchResult) => {
    toggleFavorite({
      id: sop.id,
      type: 'sop',
      title: locale === 'fr' ? sop.title_fr : sop.title,
      category: locale === 'fr' ? sop.category_fr : sop.category,
      lastAccessed: new Date().toISOString()
    });
    
    toast({
      title: sop.is_favorite ? t('favorites.removed') : t('favorites.added'),
      description: locale === 'fr' ? sop.title_fr : sop.title,
    });
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      difficulties: [],
      timeRanges: [],
      statuses: [],
    });
  };

  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter !== undefined
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const highlightText = (text: string, highlights: string[] = []) => {
    if (!highlights.length) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  const results = filteredAndSortedResults();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Bar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Results Info and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {searchQuery && (
                <div className="text-sm text-gray-600">
                  {isLoading ? (
                    t('search.searching')
                  ) : (
                    t('search.resultsCount', { count: results.length, query: searchQuery })
                  )}
                </div>
              )}
              
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="text-sm gap-2"
                >
                  <X className="w-4 h-4" />
                  {t('search.clearFilters')}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{t('search.sort.relevance')}</SelectItem>
                  <SelectItem value="title">{t('search.sort.title')}</SelectItem>
                  <SelectItem value="difficulty">{t('search.sort.difficulty')}</SelectItem>
                  <SelectItem value="time">{t('search.sort.time')}</SelectItem>
                  <SelectItem value="updated">{t('search.sort.updated')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Filters Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "gap-2",
                  hasActiveFilters && "bg-blue-50 border-blue-200 text-blue-700"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t('search.filters')}
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {Object.values(filters).reduce((count, filter) => 
                      count + (Array.isArray(filter) ? filter.length : filter ? 1 : 0), 0
                    )}
                  </Badge>
                )}
              </Button>

              {/* View Toggle */}
              <div className="flex rounded-lg border">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {t('search.filters')}
                    <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Categories */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">{t('search.filter.categories')}</h4>
                    <div className="space-y-2">
                      {CATEGORIES.map(category => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={filters.categories.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const newCategories = checked
                                ? [...filters.categories, category.id]
                                : filters.categories.filter(id => id !== category.id);
                              handleFilterChange('categories', newCategories);
                            }}
                          />
                          <label
                            htmlFor={`category-${category.id}`}
                            className="text-sm text-gray-700 cursor-pointer"
                          >
                            {locale === 'fr' ? category.name_fr : category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Difficulty */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">{t('search.filter.difficulty')}</h4>
                    <div className="space-y-2">
                      {['easy', 'medium', 'hard'].map(difficulty => (
                        <div key={difficulty} className="flex items-center space-x-2">
                          <Checkbox
                            id={`difficulty-${difficulty}`}
                            checked={filters.difficulties.includes(difficulty)}
                            onCheckedChange={(checked) => {
                              const newDifficulties = checked
                                ? [...filters.difficulties, difficulty]
                                : filters.difficulties.filter(d => d !== difficulty);
                              handleFilterChange('difficulties', newDifficulties);
                            }}
                          />
                          <label
                            htmlFor={`difficulty-${difficulty}`}
                            className="text-sm text-gray-700 cursor-pointer"
                          >
                            {t(`difficulty.${difficulty}`)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Status */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">{t('search.filter.status')}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="required"
                          checked={filters.isRequired === true}
                          onCheckedChange={(checked) => {
                            handleFilterChange('isRequired', checked ? true : undefined);
                          }}
                        />
                        <label htmlFor="required" className="text-sm text-gray-700 cursor-pointer">
                          {t('status.required')}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="favorites"
                          checked={filters.isFavorite === true}
                          onCheckedChange={(checked) => {
                            handleFilterChange('isFavorite', checked ? true : undefined);
                          }}
                        />
                        <label htmlFor="favorites" className="text-sm text-gray-700 cursor-pointer">
                          {t('status.favorites')}
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results */}
          <div className={cn(
            showFilters ? "lg:col-span-3" : "lg:col-span-4"
          )}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : !searchQuery ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('search.emptyState.title')}
                </h3>
                <p className="text-gray-600">
                  {t('search.emptyState.description')}
                </p>
              </div>
            ) : results.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('search.noResults.title')}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('search.noResults.description', { query: searchQuery })}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                    >
                      {t('search.noResults.clearSearch')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                    >
                      {t('search.noResults.clearFilters')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className={cn(
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              )}>
                {results.map((sop) => (
                  <Card
                    key={sop.id}
                    className={cn(
                      "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
                      viewMode === 'list' && "flex items-center p-4"
                    )}
                    onClick={() => handleSOPSelect(sop)}
                  >
                    <CardHeader className={cn(
                      "pb-3",
                      viewMode === 'list' && "flex-1 py-0"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg leading-tight mb-2">
                            {highlightText(
                              locale === 'fr' ? sop.title_fr : sop.title,
                              sop.match_highlights
                            )}
                          </CardTitle>
                          <p className={cn(
                            "text-sm text-gray-600",
                            viewMode === 'list' ? "line-clamp-1" : "line-clamp-2"
                          )}>
                            {highlightText(
                              locale === 'fr' ? sop.description_fr : sop.description,
                              sop.match_highlights
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {locale === 'fr' ? sop.category_fr : sop.category}
                            </Badge>
                            {sop.match_score && (
                              <Badge variant="secondary" className="text-xs">
                                {sop.match_score}% {t('search.match')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(sop);
                          }}
                          className="w-8 h-8 p-0"
                        >
                          <Star className={cn(
                            "w-4 h-4",
                            sop.is_favorite && "fill-current text-yellow-500"
                          )} />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className={cn(
                      "pt-0",
                      viewMode === 'list' && "py-0 flex items-center gap-4"
                    )}>
                      {/* Badges */}
                      <div className={cn(
                        "flex flex-wrap gap-2 mb-3",
                        viewMode === 'list' && "mb-0"
                      )}>
                        <Badge className={getDifficultyColor(sop.difficulty)}>
                          {t(`difficulty.${sop.difficulty}`)}
                        </Badge>
                        {sop.is_required && (
                          <Badge variant="destructive" className="bg-red-100 text-red-700">
                            {t('status.required')}
                          </Badge>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className={cn(
                        "flex items-center justify-between text-sm text-gray-500",
                        viewMode === 'list' && "flex-col items-end"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Timer className="w-4 h-4" />
                            {sop.estimated_time} {t('time.minutes')}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            {sop.completion_count}
                          </div>
                        </div>
                        <div className={cn(viewMode === 'list' && "mt-1")}>
                          v{sop.version} • {new Date(sop.last_updated).toLocaleDateString(locale)}
                        </div>
                      </div>

                      {/* Action Button */}
                      {viewMode === 'grid' && (
                        <Button 
                          className="w-full mt-4 group-hover:bg-red-600 group-hover:text-white transition-colors"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSOPSelect(sop);
                          }}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {t('actions.start')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}