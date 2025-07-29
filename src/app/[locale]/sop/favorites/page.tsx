'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Star, 
  Search, 
  Grid3X3, 
  List, 
  ArrowLeft,
  Filter,
  Calendar,
  Clock,
  Play,
  Trash2,
  Heart,
  BookOpen,
  Timer,
  CheckCircle,
  Folder,
  Tag,
  Share2,
  Download,
  Eye,
  SortAsc,
  SortDesc,
  X,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';

interface SOPFavoritesPageProps {
  params: Promise<{ locale: string }>;
}

interface FavoriteCollection {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  color: string;
  icon: string;
  sop_count: number;
  created_at: string;
  is_public: boolean;
}

// Mock collections
const MOCK_COLLECTIONS: FavoriteCollection[] = [
  {
    id: '1',
    name: 'Daily Essentials',
    name_fr: 'Essentiels Quotidiens',
    description: 'SOPs I use every day during my shift',
    description_fr: 'SOP que j\'utilise tous les jours pendant mon service',
    color: '#E31B23',
    icon: 'star',
    sop_count: 8,
    created_at: '2024-01-15T00:00:00Z',
    is_public: false,
  },
  {
    id: '2',
    name: 'Safety First',
    name_fr: 'Sécurité d\'Abord',
    description: 'Critical safety procedures',
    description_fr: 'Procédures de sécurité critiques',
    color: '#D4AF37',
    icon: 'shield',
    sop_count: 5,
    created_at: '2024-01-10T00:00:00Z',
    is_public: true,
  },
];

export default function SOPFavoritesPage({ params }: SOPFavoritesPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'added' | 'title' | 'category' | 'lastUsed'>('added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
  const [showCollections, setShowCollections] = useState(false);
  const [collections, setCollections] = useState<FavoriteCollection[]>(MOCK_COLLECTIONS);
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();
  const t = useTranslations('sop');
  const { favorites, removeFavorite, toggleFavorite, isLoaded } = useFavorites();

  // Track client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Show loading while params are resolving or client is not ready
  if (!resolvedParams || !isClient || !isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  // Filter and sort favorites
  const filteredFavorites = favorites.filter(favorite => {
    const matchesSearch = searchQuery === '' || 
      favorite.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      favorite.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCollection = selectedCollection === 'all' || 
      favorite.collection_id === selectedCollection;
    
    return matchesSearch && matchesCollection && favorite.type === 'sop';
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '');
        break;
      case 'lastUsed':
        comparison = new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
        break;
      case 'added':
      default:
        comparison = new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
        break;
    }
    
    return sortOrder === 'desc' ? comparison : -comparison;
  });

  const handleSOPSelect = (favorite: any) => {
    router.push(`/${locale}/sop/documents/${favorite.id}`);
  };

  const handleRemoveFavorite = (favoriteId: string) => {
    removeFavorite(favoriteId);
    toast({
      title: t('favorites.removed'),
      description: t('favorites.removedDescription'),
    });
  };

  const handleBulkRemove = () => {
    selectedFavorites.forEach(id => removeFavorite(id));
    setSelectedFavorites(new Set());
    toast({
      title: t('favorites.bulkRemoved'),
      description: t('favorites.bulkRemovedDescription', { count: selectedFavorites.size }),
    });
  };

  const handleSelectAll = () => {
    if (selectedFavorites.size === filteredFavorites.length) {
      setSelectedFavorites(new Set());
    } else {
      setSelectedFavorites(new Set(filteredFavorites.map(f => f.id)));
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-white fill-current" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('favorites.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('favorites.subtitle', { count: filteredFavorites.length })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCollections(!showCollections)}
                className="gap-2"
              >
                <Folder className="w-4 h-4" />
                {t('favorites.collections')}
              </Button>
              <Button
                onClick={() => router.push(`/${locale}/sop`)}
                className="bg-red-600 hover:bg-red-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('favorites.addMore')}
              </Button>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('favorites.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Collection Filter */}
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
              <SelectTrigger className="w-48">
                <Folder className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('favorites.allCollections')}</SelectItem>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {locale === 'fr' ? collection.name_fr : collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="added">{t('favorites.sort.dateAdded')}</SelectItem>
                  <SelectItem value="title">{t('favorites.sort.title')}</SelectItem>
                  <SelectItem value="category">{t('favorites.sort.category')}</SelectItem>
                  <SelectItem value="lastUsed">{t('favorites.sort.lastUsed')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-10 h-10 p-0"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>

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

          {/* Bulk Actions */}
          {filteredFavorites.length > 0 && (
            <div className="flex items-center justify-between mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedFavorites.size === filteredFavorites.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">
                  {selectedFavorites.size > 0 
                    ? t('favorites.selectedCount', { count: selectedFavorites.size })
                    : t('favorites.selectAll')
                  }
                </span>
              </div>
              
              {selectedFavorites.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBulkRemove}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('favorites.removeSelected')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredFavorites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedCollection !== 'all' 
                  ? t('favorites.noResultsTitle')
                  : t('favorites.emptyTitle')
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCollection !== 'all'
                  ? t('favorites.noResultsDescription')
                  : t('favorites.emptyDescription')
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {(searchQuery || selectedCollection !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCollection('all');
                    }}
                  >
                    {t('favorites.clearFilters')}
                  </Button>
                )}
                <Button
                  onClick={() => router.push(`/${locale}/sop`)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {t('favorites.browseSops')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          )}>
            {filteredFavorites.map((favorite) => (
              <Card
                key={favorite.id}
                className={cn(
                  "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
                  viewMode === 'list' && "flex items-center p-4",
                  selectedFavorites.has(favorite.id) && "ring-2 ring-red-500"
                )}
                onClick={() => handleSOPSelect(favorite)}
              >
                <CardHeader className={cn(
                  "pb-3",
                  viewMode === 'list' && "flex-1 py-0"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={selectedFavorites.has(favorite.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedFavorites);
                          if (checked) {
                            newSelected.add(favorite.id);
                          } else {
                            newSelected.delete(favorite.id);
                          }
                          setSelectedFavorites(newSelected);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight mb-2">
                          {favorite.title}
                        </CardTitle>
                        <p className={cn(
                          "text-sm text-gray-600",
                          viewMode === 'list' ? "line-clamp-1" : "line-clamp-2"
                        )}>
                          {favorite.category}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                            {t('status.favorite')}
                          </Badge>
                          {favorite.difficulty && (
                            <Badge className={cn("text-xs", getDifficultyColor(favorite.difficulty))}>
                              {t(`difficulty.${favorite.difficulty}`)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(favorite.id);
                      }}
                      className="w-8 h-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className={cn(
                  "pt-0",
                  viewMode === 'list' && "py-0 flex items-center gap-4"
                )}>
                  {/* Metadata */}
                  <div className={cn(
                    "flex items-center justify-between text-sm text-gray-500 mb-3",
                    viewMode === 'list' && "mb-0 flex-col items-end"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatRelativeTime(favorite.lastAccessed)}
                      </div>
                    </div>
                    <div className={cn(viewMode === 'list' && "mt-1")}>
                      {t('favorites.addedOn', { 
                        date: new Date(favorite.addedAt || 0).toLocaleDateString(locale) 
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {viewMode === 'grid' && (
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 group-hover:bg-red-600 group-hover:text-white transition-colors"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSOPSelect(favorite);
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {t('actions.start')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/${locale}/sop/sharing?sop=${favorite.id}`);
                        }}
                        className="px-3"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Collections Sidebar */}
      {showCollections && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('favorites.collections')}
              </h2>
              <Button
                variant="ghost"
                onClick={() => setShowCollections(false)}
                className="w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {collections.map(collection => (
                <Card
                  key={collection.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedCollection(collection.id);
                    setShowCollections(false);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: collection.color }}
                      >
                        <Folder className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {locale === 'fr' ? collection.name_fr : collection.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {collection.sop_count} {t('favorites.sops')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
              >
                <Plus className="w-4 h-4" />
                {t('favorites.createCollection')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}