'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, 
  Search, 
  Star, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Filter,
  Grid3X3,
  List,
  ArrowUpAZ,
  ChevronDown,
  Eye,
  Download,
  Share2,
  MoreVertical,
  Play,
  Bookmark,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CategoryIconWithBackground, getCategoryColor } from '@/components/sop/sop-category-icons';
import { SOPBreadcrumb } from '@/components/sop';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';

interface SOPCategoryPageProps {
  params: Promise<{ locale: string; id: string }>;
}

interface SOPDocument {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
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
}

// Mock category data
const MOCK_CATEGORY = {
  id: '1',
  code: 'FOOD_SAFETY',
  name: 'Food Safety',
  name_fr: 'Sécurité Alimentaire',
  description: 'Essential food safety and hygiene procedures for restaurant operations',
  description_fr: 'Procédures essentielles de sécurité alimentaire et d\'hygiène pour les opérations de restaurant',
  icon: 'shield',
  color: '#E31B23',
  sort_order: 1,
  is_active: true,
  sop_count: 12,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-25T00:00:00Z'
};

// Mock SOPs data
const MOCK_SOPS: SOPDocument[] = [
  {
    id: '1',
    title: 'Hand Washing Procedure',
    title_fr: 'Procédure de Lavage des Mains',
    description: 'Proper hand washing technique for food service staff',
    description_fr: 'Technique appropriée de lavage des mains pour le personnel de service alimentaire',
    difficulty: 'easy',
    estimated_time: 5,
    version: '2.1',
    last_updated: '2024-01-20',
    completion_count: 45,
    is_required: true,
    status: 'active',
    tags: ['hygiene', 'basic', 'required'],
    author: 'Health Department'
  },
  {
    id: '2',
    title: 'Temperature Control Monitoring',
    title_fr: 'Surveillance du Contrôle de Température',
    description: 'Daily temperature checks for refrigeration units',
    description_fr: 'Contrôles quotidiens de température pour les unités de réfrigération',
    difficulty: 'medium',
    estimated_time: 15,
    version: '1.8',
    last_updated: '2024-01-18',
    completion_count: 32,
    is_required: true,
    status: 'active',
    tags: ['temperature', 'monitoring', 'daily'],
    author: 'Kitchen Manager'
  },
  {
    id: '3',
    title: 'Cross-Contamination Prevention',
    title_fr: 'Prévention de la Contamination Croisée',
    description: 'Guidelines to prevent cross-contamination during food preparation',
    description_fr: 'Directives pour prévenir la contamination croisée pendant la préparation des aliments',
    difficulty: 'hard',
    estimated_time: 25,
    version: '3.0',
    last_updated: '2024-01-15',
    completion_count: 28,
    is_required: true,
    status: 'active',
    tags: ['contamination', 'preparation', 'advanced'],
    author: 'Food Safety Officer'
  }
];

export default function SOPCategoryPage({ params }: SOPCategoryPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'title' | 'difficulty' | 'time' | 'updated'>('title');
  const [filterBy, setFilterBy] = useState<'all' | 'required' | 'favorites'>('all');
  const [sops, setSops] = useState<SOPDocument[]>(MOCK_SOPS);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const t = useTranslations('sop');
  const { favorites, toggleFavorite } = useFavorites();

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Apply favorites to SOPs
  useEffect(() => {
    setSops(current => 
      current.map(sop => ({
        ...sop,
        is_favorite: favorites.some(fav => fav.id === sop.id && fav.type === 'sop')
      }))
    );
  }, [favorites]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale, id } = resolvedParams;
  const category = MOCK_CATEGORY; // In real app, fetch by ID

  // Filter and sort SOPs
  const filteredSops = sops.filter(sop => {
    const matchesSearch = searchQuery === '' || 
      sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.title_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterBy === 'all' || 
      (filterBy === 'required' && sop.is_required) ||
      (filterBy === 'favorites' && sop.is_favorite);
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'difficulty':
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      case 'time':
        return a.estimated_time - b.estimated_time;
      case 'updated':
        return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
      default:
        return (locale === 'fr' ? a.title_fr : a.title).localeCompare(locale === 'fr' ? b.title_fr : b.title);
    }
  });

  const handleSOPSelect = (sop: SOPDocument) => {
    router.push(`/${locale}/sop/documents/${sop.id}`);
  };

  const handleToggleFavorite = (sop: SOPDocument) => {
    toggleFavorite({
      id: sop.id,
      type: 'sop',
      title: locale === 'fr' ? sop.title_fr : sop.title,
      category: locale === 'fr' ? category.name_fr : category.name,
      lastAccessed: new Date().toISOString()
    });
    
    toast({
      title: sop.is_favorite ? t('favorites.removed') : t('favorites.added'),
      description: locale === 'fr' ? sop.title_fr : sop.title,
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const breadcrumbItems = [
    { label: t('navigation.home'), href: `/${locale}/sop` },
    { label: t('navigation.categories'), href: `/${locale}/sop` },
    { label: locale === 'fr' ? category.name_fr : category.name, href: `/${locale}/sop/categories/${id}` }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <SOPBreadcrumb items={breadcrumbItems} className="mb-4" />
          
          {/* Category Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-4">
                <CategoryIconWithBackground 
                  icon={category.icon} 
                  color={category.color}
                  size="lg"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {locale === 'fr' ? category.name_fr : category.name}
                  </h1>
                  <p className="text-gray-600">
                    {locale === 'fr' ? category.description_fr : category.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="secondary">{filteredSops.length} {t('sops.count')}</Badge>
                    <span className="text-sm text-gray-500">
                      {t('category.lastUpdated', { date: new Date(category.updated_at).toLocaleDateString(locale) })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              {/* Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {t('filters.title')}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterBy('all')}>
                    {t('filters.all')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy('required')}>
                    {t('filters.required')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy('favorites')}>
                    {t('filters.favorites')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ArrowUpAZ className="w-4 h-4" />
                    {t('sort.title')}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('title')}>
                    {t('sort.title')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('difficulty')}>
                    {t('sort.difficulty')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('time')}>
                    {t('sort.time')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('updated')}>
                    {t('sort.updated')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : filteredSops.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('search.noResults')}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? t('search.noResultsQuery', { query: searchQuery }) : t('search.noResultsFilter')}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterBy('all');
                }}
              >
                {t('search.clearFilters')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          )}>
            {filteredSops.map((sop) => (
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
                        {locale === 'fr' ? sop.title_fr : sop.title}
                      </CardTitle>
                      <p className={cn(
                        "text-sm text-gray-600",
                        viewMode === 'list' ? "line-clamp-1" : "line-clamp-2"
                      )}>
                        {locale === 'fr' ? sop.description_fr : sop.description}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(sop);
                        }}>
                          <Star className={cn("w-4 h-4 mr-2", sop.is_favorite && "fill-current text-yellow-500")} />
                          {sop.is_favorite ? t('favorites.remove') : t('favorites.add')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/${locale}/sop/sharing?sop=${sop.id}`);
                        }}>
                          <Share2 className="w-4 h-4 mr-2" />
                          {t('actions.share')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/${locale}/sop/print?sop=${sop.id}`);
                        }}>
                          <Download className="w-4 h-4 mr-2" />
                          {t('actions.download')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className={cn(
                  "pt-0",
                  viewMode === 'list' && "py-0 flex items-center gap-4"
                )}>
                  {/* Badges and Status */}
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
                    {sop.is_favorite && (
                      <Badge className="bg-yellow-100 text-yellow-700">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        {t('status.favorite')}
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
                    <div className={cn(
                      viewMode === 'list' && "mt-1"
                    )}>
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
  );
}