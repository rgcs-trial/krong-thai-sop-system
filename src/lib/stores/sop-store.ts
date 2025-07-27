import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types for SOP state
interface SOPCategory {
  id: string;
  name_en: string;
  name_th: string;
  description_en?: string;
  description_th?: string;
  icon?: string;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
}

interface SOPDocument {
  id: string;
  category_id: string;
  title_en: string;
  title_th: string;
  content_en: string;
  content_th: string;
  version: string;
  is_critical: boolean;
  is_published: boolean;
  media_urls?: string[];
  created_at: string;
  updated_at: string;
}

interface SOPState {
  // Categories
  categories: SOPCategory[];
  selectedCategoryId: string | null;
  
  // Documents
  documents: SOPDocument[];
  selectedDocumentId: string | null;
  documentsLoadingByCategory: Record<string, boolean>;
  
  // Search
  searchQuery: string;
  searchResults: SOPDocument[];
  searchFilters: {
    categoryId?: string;
    status?: 'published' | 'draft';
    priority?: 'critical' | 'high' | 'medium' | 'low';
    tags?: string[];
  };
  
  // Favorites
  favoriteDocumentIds: string[];
  favoriteCategoryIds: string[];
  
  // Recent Activity
  recentlyViewedDocuments: Array<{
    id: string;
    viewedAt: number;
  }>;
  
  // Cache timestamps
  categoriesLastFetched: number | null;
  documentsLastFetched: Record<string, number>;
  
  // Actions
  setCategories: (categories: SOPCategory[]) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setDocuments: (categoryId: string, documents: SOPDocument[]) => void;
  setSelectedDocument: (documentId: string | null) => void;
  addDocument: (document: SOPDocument) => void;
  updateDocument: (document: SOPDocument) => void;
  setDocumentsLoading: (categoryId: string, loading: boolean) => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SOPDocument[]) => void;
  setSearchFilters: (filters: Partial<SOPState['searchFilters']>) => void;
  clearSearch: () => void;
  
  // Favorites actions
  toggleDocumentFavorite: (documentId: string) => void;
  toggleCategoryFavorite: (categoryId: string) => void;
  
  // Recent activity
  addRecentlyViewed: (documentId: string) => void;
  
  // Cache management
  updateCategoriesTimestamp: () => void;
  updateDocumentsTimestamp: (categoryId: string) => void;
  isCategoriesCacheValid: (maxAge?: number) => boolean;
  isDocumentsCacheValid: (categoryId: string, maxAge?: number) => boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RECENT_ITEMS = 20;

export const useSOPStore = create<SOPState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      categories: [],
      selectedCategoryId: null,
      documents: [],
      selectedDocumentId: null,
      documentsLoadingByCategory: {},
      searchQuery: '',
      searchResults: [],
      searchFilters: {},
      favoriteDocumentIds: [],
      favoriteCategoryIds: [],
      recentlyViewedDocuments: [],
      categoriesLastFetched: null,
      documentsLastFetched: {},

      // Category actions
      setCategories: (categories: SOPCategory[]) =>
        set((state) => {
          state.categories = categories;
          state.categoriesLastFetched = Date.now();
        }),

      setSelectedCategory: (categoryId: string | null) =>
        set((state) => {
          state.selectedCategoryId = categoryId;
          state.selectedDocumentId = null; // Clear selected document when category changes
        }),

      // Document actions
      setDocuments: (categoryId: string, documents: SOPDocument[]) =>
        set((state) => {
          // Update documents for specific category
          state.documents = state.documents.filter((doc: any) => doc.category_id !== categoryId);
          state.documents.push(...documents);
          state.documentsLastFetched[categoryId] = Date.now();
          state.documentsLoadingByCategory[categoryId] = false;
        }),

      setSelectedDocument: (documentId: string | null) =>
        set((state) => {
          state.selectedDocumentId = documentId;
          
          // Add to recently viewed if selecting a document
          if (documentId) {
            const existingIndex = state.recentlyViewedDocuments.findIndex(
              (item: any) => item.id === documentId
            );
            
            if (existingIndex > -1) {
              // Move to front if already exists
              state.recentlyViewedDocuments.splice(existingIndex, 1);
            }
            
            // Add to front
            state.recentlyViewedDocuments.unshift({
              id: documentId,
              viewedAt: Date.now(),
            });
            
            // Keep only most recent items
            if (state.recentlyViewedDocuments.length > MAX_RECENT_ITEMS) {
              state.recentlyViewedDocuments = state.recentlyViewedDocuments.slice(0, MAX_RECENT_ITEMS);
            }
          }
        }),

      addDocument: (document: SOPDocument) =>
        set((state) => {
          state.documents.push(document);
        }),

      updateDocument: (updatedDocument: SOPDocument) =>
        set((state) => {
          const index = state.documents.findIndex((doc: any) => doc.id === updatedDocument.id);
          if (index > -1) {
            state.documents[index] = updatedDocument;
          }
        }),

      setDocumentsLoading: (categoryId: string, loading: boolean) =>
        set((state) => {
          state.documentsLoadingByCategory[categoryId] = loading;
        }),

      // Search actions
      setSearchQuery: (query: string) =>
        set((state) => {
          state.searchQuery = query;
        }),

      setSearchResults: (results: SOPDocument[]) =>
        set((state) => {
          state.searchResults = results;
        }),

      setSearchFilters: (filters: Partial<SOPState['searchFilters']>) =>
        set((state) => {
          state.searchFilters = { ...state.searchFilters, ...filters };
        }),

      clearSearch: () =>
        set((state) => {
          state.searchQuery = '';
          state.searchResults = [];
          state.searchFilters = {};
        }),

      // Favorites actions
      toggleDocumentFavorite: (documentId: string) =>
        set((state) => {
          const index = state.favoriteDocumentIds.indexOf(documentId);
          if (index > -1) {
            state.favoriteDocumentIds.splice(index, 1);
          } else {
            state.favoriteDocumentIds.push(documentId);
          }
        }),

      toggleCategoryFavorite: (categoryId: string) =>
        set((state) => {
          const index = state.favoriteCategoryIds.indexOf(categoryId);
          if (index > -1) {
            state.favoriteCategoryIds.splice(index, 1);
          } else {
            state.favoriteCategoryIds.push(categoryId);
          }
        }),

      // Recent activity
      addRecentlyViewed: (documentId: string) =>
        set((state) => {
          const existingIndex = state.recentlyViewedDocuments.findIndex(
            item => item.id === documentId
          );
          
          if (existingIndex > -1) {
            state.recentlyViewedDocuments.splice(existingIndex, 1);
          }
          
          state.recentlyViewedDocuments.unshift({
            id: documentId,
            viewedAt: Date.now(),
          });
          
          if (state.recentlyViewedDocuments.length > MAX_RECENT_ITEMS) {
            state.recentlyViewedDocuments = state.recentlyViewedDocuments.slice(0, MAX_RECENT_ITEMS);
          }
        }),

      // Cache management
      updateCategoriesTimestamp: () =>
        set((state) => {
          state.categoriesLastFetched = Date.now();
        }),

      updateDocumentsTimestamp: (categoryId: string) =>
        set((state) => {
          state.documentsLastFetched[categoryId] = Date.now();
        }),

      isCategoriesCacheValid: (maxAge: number = CACHE_DURATION) => {
        const state = get();
        if (!state.categoriesLastFetched) return false;
        return Date.now() - state.categoriesLastFetched < maxAge;
      },

      isDocumentsCacheValid: (categoryId: string, maxAge: number = CACHE_DURATION) => {
        const state = get();
        const lastFetched = state.documentsLastFetched[categoryId];
        if (!lastFetched) return false;
        return Date.now() - lastFetched < maxAge;
      },
    })),
    {
      name: 'krong-thai-sop-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favoriteDocumentIds: state.favoriteDocumentIds,
        favoriteCategoryIds: state.favoriteCategoryIds,
        recentlyViewedDocuments: state.recentlyViewedDocuments,
        searchFilters: state.searchFilters,
      }),
    }
  )
);

// Selector hooks for better performance
export const useSOPCategories = () => useSOPStore((state) => state.categories);
export const useSelectedCategory = () => useSOPStore((state) => state.selectedCategoryId);
export const useSOPDocuments = (categoryId?: string) => 
  useSOPStore((state) => 
    categoryId 
      ? state.documents.filter(doc => doc.category_id === categoryId)
      : state.documents
  );
export const useSelectedDocument = () => useSOPStore((state) => state.selectedDocumentId);
export const useSearchResults = () => useSOPStore((state) => state.searchResults);
export const useFavoriteDocuments = () => useSOPStore((state) => state.favoriteDocumentIds);
export const useRecentlyViewed = () => useSOPStore((state) => state.recentlyViewedDocuments);