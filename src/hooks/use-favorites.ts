'use client';

import { useState, useEffect, useCallback } from 'react';

export interface FavoriteItem {
  id: string;
  type: 'category' | 'document' | 'sop';
  title: string;
  title_th?: string;
  category?: string;
  category_id?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  collection_id?: string;
  lastAccessed: string;
  addedAt: string;
  added_at: string; // Keep for backward compatibility
}

const FAVORITES_STORAGE_KEY = 'krong-thai-sop-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      // Check if we're in the browser before accessing localStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (stored) {
          const parsedFavorites = JSON.parse(stored) as FavoriteItem[];
          setFavorites(parsedFavorites);
        }
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error('Error saving favorites to localStorage:', error);
      }
    }
  }, [favorites, isLoaded]);

  // Add item to favorites
  const addToFavorites = useCallback((item: Omit<FavoriteItem, 'added_at' | 'lastAccessed' | 'addedAt'>) => {
    const now = new Date().toISOString();
    const favoriteItem: FavoriteItem = {
      ...item,
      added_at: now,
      addedAt: now,
      lastAccessed: now
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
  const removeFromFavorites = useCallback((id: string, type?: 'category' | 'document' | 'sop') => {
    setFavorites(prev => prev.filter(fav => type ? !(fav.id === id && fav.type === type) : fav.id !== id));
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback((item: Omit<FavoriteItem, 'added_at' | 'lastAccessed' | 'addedAt'>) => {
    const exists = favorites.some(fav => fav.id === item.id && fav.type === item.type);
    
    if (exists) {
      removeFromFavorites(item.id, item.type);
    } else {
      addToFavorites(item);
    }
  }, [favorites, addToFavorites, removeFromFavorites]);

  // Check if item is favorite
  const isFavorite = useCallback((id: string, type: 'category' | 'document' | 'sop') => {
    return favorites.some(fav => fav.id === id && fav.type === type);
  }, [favorites]);

  // Get favorites by type
  const getFavoritesByType = useCallback((type: 'category' | 'document' | 'sop') => {
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
  const clearFavoritesByType = useCallback((type: 'category' | 'document' | 'sop') => {
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
    if (typeof window === 'undefined') return;
    
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

  // Remove favorite by ID (for compatibility with existing page)
  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  }, []);

  return {
    favorites,
    favoriteCategories,
    favoriteDocuments,
    isLoaded,
    addToFavorites,
    removeFromFavorites,
    removeFavorite,
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