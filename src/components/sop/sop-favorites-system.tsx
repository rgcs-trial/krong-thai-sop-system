'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Star, Clock, BookOpen, X } from 'lucide-react';

interface FavoriteSOP {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedTime: number;
  lastAccessed?: string;
  addedAt: string;
}

interface SOPFavoritesSystemProps {
  /** Current SOP ID (for toggle) */
  currentSopId?: string;
  /** List of favorite SOPs */
  favorites: FavoriteSOP[];
  /** Show quick access panel */
  showQuickAccess?: boolean;
  /** Maximum favorites to display */
  maxDisplay?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (sopId: string, isFavorite: boolean) => void;
  /** Callback when favorite SOP is accessed */
  onAccessFavorite?: (sopId: string) => void;
  /** Callback when favorite is removed */
  onRemoveFavorite?: (sopId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SOPFavoritesSystem - Favorites management system for SOPs
 */
const SOPFavoritesSystem: React.FC<SOPFavoritesSystemProps> = ({
  currentSopId,
  favorites,
  showQuickAccess = true,
  maxDisplay = 5,
  isLoading = false,
  onToggleFavorite,
  onAccessFavorite,
  onRemoveFavorite,
  className
}) => {
  const t = useTranslations('sop.favorites');
  const [localFavorites, setLocalFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const favoriteIds = new Set(favorites.map(fav => fav.id));
    setLocalFavorites(favoriteIds);
  }, [favorites]);

  const isFavorite = currentSopId ? localFavorites.has(currentSopId) : false;

  const handleToggleFavorite = useCallback(() => {
    if (!currentSopId) return;
    
    const newIsFavorite = !isFavorite;
    setLocalFavorites(prev => {
      const newSet = new Set(prev);
      if (newIsFavorite) {
        newSet.add(currentSopId);
      } else {
        newSet.delete(currentSopId);
      }
      return newSet;
    });
    
    onToggleFavorite?.(currentSopId, newIsFavorite);
  }, [currentSopId, isFavorite, onToggleFavorite]);

  const sortedFavorites = [...favorites].sort((a, b) => 
    new Date(b.lastAccessed || b.addedAt).getTime() - new Date(a.lastAccessed || a.addedAt).getTime()
  );

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {currentSopId && (
          <div className="animate-pulse">
            <div className="h-12 w-32 bg-gray-200 rounded" />
          </div>
        )}
        {showQuickAccess && (
          <Card className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Favorite Toggle Button */}
      {currentSopId && (
        <Button
          variant={isFavorite ? "default" : "outline"}
          size="lg"
          onClick={handleToggleFavorite}
          className={cn(
            "transition-all duration-200",
            isFavorite && "bg-krong-red hover:bg-krong-red/90"
          )}
        >
          <Heart className={cn(
            "w-5 h-5 mr-2",
            isFavorite && "fill-current"
          )} />
          {isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
        </Button>
      )}

      {/* Quick Access Favorites Panel */}
      {showQuickAccess && favorites.length > 0 && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Star className="w-5 h-5 text-golden-saffron" />
              {t('quickAccess')}
              <Badge variant="secondary" className="text-tablet-xs">
                {favorites.length}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-3">
              {sortedFavorites.slice(0, maxDisplay).map((favorite) => (
                <div
                  key={favorite.id}
                  className="flex items-center gap-3 p-3 border-2 border-border/40 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  onClick={() => onAccessFavorite?.(favorite.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-tablet-base font-body font-medium text-krong-black truncate">
                      {favorite.title}
                    </h4>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-tablet-xs">
                        {favorite.category}
                      </Badge>
                      
                      <div className="flex items-center gap-1 text-tablet-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {favorite.estimatedTime}m
                      </div>
                      
                      {favorite.lastAccessed && (
                        <span className="text-tablet-xs text-muted-foreground">
                          {t('lastUsed', { 
                            date: new Date(favorite.lastAccessed).toLocaleDateString() 
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Heart className="w-4 h-4 text-krong-red fill-current" />
                    
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFavorite?.(favorite.id);
                      }}
                      className="text-gray-400 hover:text-red-500"
                      aria-label={t('removeFavorite')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {favorites.length > maxDisplay && (
              <div className="mt-4 text-center">
                <Button variant="ghost" size="sm" className="text-tablet-sm">
                  {t('viewAll', { count: favorites.length - maxDisplay })}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {showQuickAccess && favorites.length === 0 && (
        <Card className="border-2">
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
              {t('emptyState.title')}
            </h3>
            <p className="text-tablet-base font-body text-muted-foreground">
              {t('emptyState.description')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SOPFavoritesSystem;