'use client';

import { useState, useEffect, useCallback } from 'react';

export interface FavoriteItem {
  id: string;
  type: 'category' | 'document';
  title: string;
  title_th: string;
  category_id?: string;
  added_at: string;
}

const FAVORITES_STORAGE_KEY = 'krong-thai-sop-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored) as FavoriteItem[];
        setFavorites(parsedFavorites);
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error('Error saving favorites to localStorage:', error);
      }
    }
  }, [favorites, isLoaded]);

  // Add item to favorites
  const addToFavorites = useCallback((item: Omit<FavoriteItem, 'added_at'>) => {
    const favoriteItem: FavoriteItem = {
      ...item,
      added_at: new Date().toISOString()
    };

    setFavorites(prev => {
      // Check if already exists
      const exists = prev.some(fav => fav.id === item.id && fav.type === item.type);
      if (exists) {
        return prev;
      }
      return [...prev, favoriteItem];
    });
  }, []);

  // Remove item from favorites
  const removeFromFavorites = useCallback((id: string, type: 'category' | 'document') => {
    setFavorites(prev => prev.filter(fav => !(fav.id === id && fav.type === type)));
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback((item: Omit<FavoriteItem, 'added_at'>) => {
    const exists = favorites.some(fav => fav.id === item.id && fav.type === item.type);
    
    if (exists) {
      removeFromFavorites(item.id, item.type);
    } else {
      addToFavorites(item);
    }
  }, [favorites, addToFavorites, removeFromFavorites]);

  // Check if item is favorite
  const isFavorite = useCallback((id: string, type: 'category' | 'document') => {
    return favorites.some(fav => fav.id === id && fav.type === type);
  }, [favorites]);

  // Get favorites by type
  const getFavoritesByType = useCallback((type: 'category' | 'document') => {
    return favorites
      .filter(fav => fav.type === type)
      .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
  }, [favorites]);

  // Get favorite categories
  const favoriteCategories = getFavoritesByType('category');

  // Get favorite documents
  const favoriteDocuments = getFavoritesByType('document');

  // Clear all favorites
  const clearAllFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  // Clear favorites by type
  const clearFavoritesByType = useCallback((type: 'category' | 'document') => {
    setFavorites(prev => prev.filter(fav => fav.type !== type));
  }, []);

  // Get recent favorites (last 5)
  const getRecentFavorites = useCallback((limit = 5) => {
    return favorites
      .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())
      .slice(0, limit);
  }, [favorites]);

  // Export favorites (for backup)
  const exportFavorites = useCallback(() => {
    const dataStr = JSON.stringify(favorites, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `krong-thai-sop-favorites-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [favorites]);

  // Import favorites (from backup)
  const importFavorites = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedFavorites = JSON.parse(content) as FavoriteItem[];
          
          // Validate structure
          const isValid = importedFavorites.every(item => 
            item.id && 
            item.type && 
            ['category', 'document'].includes(item.type) &&
            item.title &&
            item.title_th &&
            item.added_at
          );
          
          if (!isValid) {
            throw new Error('Invalid favorites file format');
          }
          
          // Merge with existing favorites (avoid duplicates)
          setFavorites(prev => {
            const merged = [...prev];
            
            importedFavorites.forEach(imported => {
              const exists = merged.some(fav => 
                fav.id === imported.id && fav.type === imported.type
              );
              
              if (!exists) {
                merged.push(imported);
              }
            });
            
            return merged;
          });
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  return {
    favorites,
    favoriteCategories,
    favoriteDocuments,
    isLoaded,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    getFavoritesByType,
    getRecentFavorites,
    clearAllFavorites,
    clearFavoritesByType,
    exportFavorites,
    importFavorites
  };
}