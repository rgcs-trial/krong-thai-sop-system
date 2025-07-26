'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Star, Heart, Trash2, Download, Upload, Search, Grid3X3, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFavorites, FavoriteItem } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';

interface SOPFavoritesDashboardProps {
  locale: string;
  onItemClick: (item: FavoriteItem) => void;
  className?: string;
}

export default function SOPFavoritesDashboard({
  locale,
  onItemClick,
  className
}: SOPFavoritesDashboardProps) {
  const t = useTranslations();
  const {
    favoriteCategories,
    favoriteDocuments,
    favorites,
    isLoaded,
    removeFromFavorites,
    clearAllFavorites,
    clearFavoritesByType,
    exportFavorites,
    importFavorites
  } = useFavorites();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTab, setSelectedTab] = useState('all');

  // Filter favorites based on search query
  const filteredFavorites = favorites.filter(item => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const title = locale === 'th' ? item.title_th : item.title;
    
    return title.toLowerCase().includes(query);
  });

  // Get favorites by tab
  const getFavoritesByTab = (tab: string) => {
    const filtered = filteredFavorites;
    
    switch (tab) {
      case 'categories':
        return filtered.filter(item => item.type === 'category');
      case 'documents':
        return filtered.filter(item => item.type === 'document');
      default:
        return filtered;
    }
  };

  const displayFavorites = getFavoritesByTab(selectedTab);

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importFavorites(file)
        .then(() => {
          // Show success message
          console.log('Favorites imported successfully');
        })
        .catch((error) => {
          // Show error message
          console.error('Failed to import favorites:', error);
        });
    }
    // Reset input
    event.target.value = '';
  };

  const FavoriteCard = ({ item, isGridView = true }: { item: FavoriteItem; isGridView?: boolean }) => {
    const title = locale === 'th' ? item.title_th : item.title;
    const addedDate = new Date(item.added_at).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US');

    return (
      <Card 
        className={cn(
          "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
          "border-2 hover:border-red-200 bg-white",
          // Touch-friendly minimum size
          isGridView ? "min-h-[120px]" : "min-h-[80px]",
          // Tablet-optimized spacing
          "p-2 md:p-4"
        )}
        onClick={() => onItemClick(item)}
      >
        <CardHeader className={cn("pb-2", isGridView ? "text-center" : "flex-row items-center space-y-0 gap-4")}>
          <div 
            className={cn(
              "rounded-full p-2 mb-2 flex items-center justify-center bg-red-50",
              isGridView ? "w-10 h-10 mx-auto" : "w-8 h-8"
            )}
          >
            {item.type === 'category' ? (
              <div className="w-4 h-4 bg-brand-red rounded-full" />
            ) : (
              <div className="w-4 h-4 bg-brand-red rounded-sm" />
            )}
          </div>
          
          <div className={cn("flex-1", !isGridView && "min-w-0")}>
            <CardTitle className={cn(
              "text-sm md:text-base font-semibold text-brand-black group-hover:text-brand-red transition-colors",
              locale === 'th' && "font-thai",
              !isGridView && "truncate"
            )}>
              {title}
            </CardTitle>
            
            {isGridView && (
              <p className="text-xs text-gray-500 mt-1">
                {item.type === 'category' ? t('sopCategories.title') : t('sop.title')}
              </p>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={cn("pt-0", isGridView ? "text-center" : "flex items-center justify-between")}>
          <div className={cn("flex items-center gap-2", isGridView ? "justify-center" : "")}>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs px-2 py-1",
                item.type === 'category' ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
              )}
            >
              {item.type === 'category' ? t('navigation.categories') : t('sop.title')}
            </Badge>
            
            {!isGridView && (
              <span className="text-xs text-gray-500">
                {addedDate}
              </span>
            )}
          </div>
          
          {isGridView && (
            <div className="mt-2 text-xs text-gray-500">
              {addedDate}
            </div>
          )}
          
          {!isGridView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                removeFromFavorites(item.id, item.type);
              }}
              className="w-8 h-8 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardContent>
        
        {isGridView && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                removeFromFavorites(item.id, item.type);
              }}
              className="w-8 h-8 bg-white shadow-sm text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>
    );
  };

  if (!isLoaded) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red mx-auto mb-4"></div>
          <p className={cn("text-gray-500", locale === 'th' && "font-thai")}>
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-gray-50 p-4 md:p-6", className)}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={cn(
          "text-2xl md:text-3xl font-bold text-brand-black mb-2 flex items-center gap-2",
          locale === 'th' && "font-thai"
        )}>
          <Heart className="w-8 h-8 text-brand-red" />
          {t('sopCategories.favorites')}
        </h1>
        <p className={cn(
          "text-gray-600 text-sm md:text-base",
          locale === 'th' && "font-thai"
        )}>
          {t('sop.favoriteSops')}
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('sopCategories.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base bg-white"
          />
        </div>
        
        {/* View Mode */}
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
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportFavorites}
            className="flex items-center gap-2"
            disabled={favorites.length === 0}
          >
            <Download className="w-4 h-4" />
            {t('common.download')}
          </Button>
          
          <label className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              asChild
            >
              <span>
                <Upload className="w-4 h-4" />
                {t('common.upload')}
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
          
          {favorites.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFavorites}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="all" className="text-sm">
            {t('dashboard.viewAll')} ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-sm">
            {t('navigation.categories')} ({favoriteCategories.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-sm">
            {t('navigation.sops')} ({favoriteDocuments.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {displayFavorites.length === 0 && favorites.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className={cn(
                  "text-lg font-semibold text-gray-600 mb-2",
                  locale === 'th' && "font-thai"
                )}>
                  {t('sop.noFavorites')}
                </h3>
                <p className={cn(
                  "text-gray-500 text-sm",
                  locale === 'th' && "font-thai"
                )}>
                  {t('sop.addToFavorites')}
                </p>
              </CardContent>
            </Card>
          ) : displayFavorites.length === 0 ? (
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
              {displayFavorites.map((item) => (
                <FavoriteCard 
                  key={`${item.type}-${item.id}`} 
                  item={item} 
                  isGridView={viewMode === 'grid'} 
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="categories" className="mt-6">
          {favoriteCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className={cn("text-gray-500", locale === 'th' && "font-thai")}>
                {t('sop.noFavorites')}
              </p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                : "space-y-3"
            )}>
              {favoriteCategories.map((item) => (
                <FavoriteCard 
                  key={`${item.type}-${item.id}`} 
                  item={item} 
                  isGridView={viewMode === 'grid'} 
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="documents" className="mt-6">
          {favoriteDocuments.length === 0 ? (
            <div className="text-center py-12">
              <p className={cn("text-gray-500", locale === 'th' && "font-thai")}>
                {t('sop.noFavorites')}
              </p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                : "space-y-3"
            )}>
              {favoriteDocuments.map((item) => (
                <FavoriteCard 
                  key={`${item.type}-${item.id}`} 
                  item={item} 
                  isGridView={viewMode === 'grid'} 
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      {favorites.length > 0 && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-red">
                {favorites.length}
              </div>
              <div className={cn("text-sm text-gray-600", locale === 'th' && "font-thai")}>
                {t('dashboard.totalSops')}
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-red">
                {favoriteCategories.length}
              </div>
              <div className={cn("text-sm text-gray-600", locale === 'th' && "font-thai")}>
                {t('navigation.categories')}
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-red">
                {favoriteDocuments.length}
              </div>
              <div className={cn("text-sm text-gray-600", locale === 'th' && "font-thai")}>
                {t('navigation.sops')}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}