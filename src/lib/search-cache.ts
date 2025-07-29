'use client';

import { SearchResult } from '@/hooks/use-search';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

interface SearchCacheEntry extends CacheEntry<SearchResult[]> {
  query: string;
  filters: any;
  sort: any;
  locale: string;
}

interface OfflineSearchIndex {
  documents: Map<string, SearchResult>;
  titleIndex: Map<string, Set<string>>; // word -> document IDs
  contentIndex: Map<string, Set<string>>; // word -> document IDs
  tagIndex: Map<string, Set<string>>; // tag -> document IDs
  categoryIndex: Map<string, Set<string>>; // category -> document IDs
  lastUpdated: number;
}

class SearchCacheManager {
  private readonly CACHE_PREFIX = 'krong-thai-search-cache-';
  private readonly INDEX_KEY = 'krong-thai-search-index';
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_ENTRIES = 50;
  private readonly MAX_OFFLINE_DOCUMENTS = 200;

  private memoryCache = new Map<string, SearchCacheEntry>();
  private offlineIndex: OfflineSearchIndex | null = null;

  constructor() {
    // Only initialize on client-side
    if (typeof window !== 'undefined') {
      this.initializeOfflineIndex();
    }
  }

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(query: string, filters: any, sort: any, locale: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const filterString = JSON.stringify(filters || {});
    const sortString = JSON.stringify(sort || {});
    return `${this.CACHE_PREFIX}${normalizedQuery}-${filterString}-${sortString}-${locale}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValidEntry(entry: CacheEntry<any>): boolean {
    return Date.now() < entry.expiry;
  }

  /**
   * Get cached search results
   */
  async getCachedResults(
    query: string, 
    filters: any, 
    sort: any, 
    locale: string
  ): Promise<SearchResult[] | null> {
    const cacheKey = this.generateCacheKey(query, filters, sort, locale);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && this.isValidEntry(memoryEntry)) {
      return memoryEntry.data;
    }

    // Check localStorage cache (only on client-side)
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const entry: SearchCacheEntry = JSON.parse(cachedData);
          if (this.isValidEntry(entry)) {
            // Update memory cache
            this.memoryCache.set(cacheKey, entry);
            return entry.data;
          } else {
            // Remove expired entry
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        console.warn('Failed to read from search cache:', error);
      }
    }

    return null;
  }

  /**
   * Cache search results
   */
  async cacheResults(
    query: string,
    filters: any,
    sort: any,
    locale: string,
    results: SearchResult[],
    cacheDuration: number = this.DEFAULT_CACHE_DURATION
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(query, filters, sort, locale);
    const entry: SearchCacheEntry = {
      data: results,
      timestamp: Date.now(),
      expiry: Date.now() + cacheDuration,
      key: cacheKey,
      query,
      filters,
      sort,
      locale
    };

    // Update memory cache
    this.memoryCache.set(cacheKey, entry);

    // Update localStorage cache (only on client-side)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry));
        
        // Cleanup old entries if we exceed max entries
        await this.cleanupOldEntries();
      } catch (error) {
        console.warn('Failed to write to search cache:', error);
        
        // If localStorage is full, try to free some space
        if (error instanceof DOMException && error.code === 22) {
          await this.clearOldestEntries(10);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(entry));
          } catch (retryError) {
            console.error('Failed to cache search results after cleanup:', retryError);
          }
        }
      }
    }
  }

  /**
   * Initialize offline search index for local search capability
   */
  private async initializeOfflineIndex(): Promise<void> {
    // Only initialize on client-side
    if (typeof window === 'undefined') {
      this.createEmptyIndex();
      return;
    }

    try {
      const indexData = localStorage.getItem(this.INDEX_KEY);
      if (indexData) {
        const parsed = JSON.parse(indexData);
        this.offlineIndex = {
          documents: new Map(parsed.documents),
          titleIndex: new Map(parsed.titleIndex.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
          contentIndex: new Map(parsed.contentIndex.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
          tagIndex: new Map(parsed.tagIndex.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
          categoryIndex: new Map(parsed.categoryIndex.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
          lastUpdated: parsed.lastUpdated
        };
      } else {
        this.createEmptyIndex();
      }
    } catch (error) {
      console.warn('Failed to load offline search index:', error);
      this.createEmptyIndex();
    }
  }

  /**
   * Create empty search index
   */
  private createEmptyIndex(): void {
    this.offlineIndex = {
      documents: new Map(),
      titleIndex: new Map(),
      contentIndex: new Map(),
      tagIndex: new Map(),
      categoryIndex: new Map(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Add documents to offline index
   */
  async addToOfflineIndex(documents: SearchResult[]): Promise<void> {
    if (!this.offlineIndex) {
      this.createEmptyIndex();
    }

    const index = this.offlineIndex!;

    documents.forEach(doc => {
      // Store document
      index.documents.set(doc.id, doc);

      // Index title words
      this.indexText(doc.title_en, doc.id, index.titleIndex);
      this.indexText(doc.title_fr, doc.id, index.titleIndex);

      // Index content words (first 500 chars to avoid too much data)
      this.indexText(doc.content_en.substring(0, 500), doc.id, index.contentIndex);
      this.indexText(doc.content_fr.substring(0, 500), doc.id, index.contentIndex);

      // Index tags
      if (doc.tags) {
        doc.tags.forEach(tag => this.indexTerm(tag, doc.id, index.tagIndex));
      }
      if (doc.tags_fr) {
        doc.tags_fr.forEach(tag => this.indexTerm(tag, doc.id, index.tagIndex));
      }

      // Index category
      if (doc.category_id) {
        this.indexTerm(doc.category_id, doc.id, index.categoryIndex);
      }
    });

    // Limit index size
    if (index.documents.size > this.MAX_OFFLINE_DOCUMENTS) {
      await this.trimOfflineIndex();
    }

    index.lastUpdated = Date.now();
    await this.saveOfflineIndex();
  }

  /**
   * Tokenize and index text
   */
  private indexText(text: string, docId: string, index: Map<string, Set<string>>): void {
    const words = this.tokenizeText(text);
    words.forEach(word => this.indexTerm(word, docId, index));
  }

  /**
   * Add term to index
   */
  private indexTerm(term: string, docId: string, index: Map<string, Set<string>>): void {
    const normalizedTerm = term.toLowerCase().trim();
    if (normalizedTerm.length > 1) {
      if (!index.has(normalizedTerm)) {
        index.set(normalizedTerm, new Set());
      }
      index.get(normalizedTerm)!.add(docId);
    }
  }

  /**
   * Tokenize text into searchable words
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0E00-\u0E7F]/g, ' ') // Keep alphanumeric and Thai characters
      .split(/\s+/)
      .filter(word => word.length > 1);
  }

  /**
   * Perform offline search
   */
  async searchOffline(
    query: string,
    filters: any = {},
    locale: string = 'en'
  ): Promise<SearchResult[]> {
    if (!this.offlineIndex || this.offlineIndex.documents.size === 0) {
      return [];
    }

    const queryWords = this.tokenizeText(query);
    if (queryWords.length === 0) {
      return [];
    }

    const matchingDocIds = new Map<string, number>(); // docId -> score

    // Search in titles (higher weight)
    queryWords.forEach(word => {
      const titleMatches = this.offlineIndex!.titleIndex.get(word);
      if (titleMatches) {
        titleMatches.forEach(docId => {
          matchingDocIds.set(docId, (matchingDocIds.get(docId) || 0) + 3);
        });
      }
    });

    // Search in content (medium weight)
    queryWords.forEach(word => {
      const contentMatches = this.offlineIndex!.contentIndex.get(word);
      if (contentMatches) {
        contentMatches.forEach(docId => {
          matchingDocIds.set(docId, (matchingDocIds.get(docId) || 0) + 1);
        });
      }
    });

    // Search in tags (high weight)
    queryWords.forEach(word => {
      const tagMatches = this.offlineIndex!.tagIndex.get(word);
      if (tagMatches) {
        tagMatches.forEach(docId => {
          matchingDocIds.set(docId, (matchingDocIds.get(docId) || 0) + 2);
        });
      }
    });

    // Apply filters and get documents
    let results: SearchResult[] = [];
    
    matchingDocIds.forEach((score, docId) => {
      const doc = this.offlineIndex!.documents.get(docId);
      if (doc) {
        // Apply filters
        if (filters.categoryId && doc.category_id !== filters.categoryId) {
          return;
        }
        if (filters.priority === 'critical' && !doc.is_critical) {
          return;
        }
        if (filters.status === 'published' && !doc.is_published) {
          return;
        }

        results.push({ ...doc, rank: score });
      }
    });

    // Sort by relevance score
    results.sort((a, b) => (b.rank || 0) - (a.rank || 0));

    return results.slice(0, 20); // Limit results
  }

  /**
   * Save offline index to localStorage
   */
  private async saveOfflineIndex(): Promise<void> {
    if (!this.offlineIndex || typeof window === 'undefined') return;

    try {
      const serializable = {
        documents: Array.from(this.offlineIndex.documents.entries()),
        titleIndex: Array.from(this.offlineIndex.titleIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        contentIndex: Array.from(this.offlineIndex.contentIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        tagIndex: Array.from(this.offlineIndex.tagIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        categoryIndex: Array.from(this.offlineIndex.categoryIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        lastUpdated: this.offlineIndex.lastUpdated
      };

      localStorage.setItem(this.INDEX_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save offline search index:', error);
    }
  }

  /**
   * Trim offline index to stay within size limits
   */
  private async trimOfflineIndex(): Promise<void> {
    if (!this.offlineIndex) return;

    const documentsToRemove = this.offlineIndex.documents.size - this.MAX_OFFLINE_DOCUMENTS + 10;
    if (documentsToRemove > 0) {
      // Remove oldest documents (simple strategy)
      const sortedDocs = Array.from(this.offlineIndex.documents.entries())
        .sort((a, b) => new Date(a[1].updated_at).getTime() - new Date(b[1].updated_at).getTime());

      for (let i = 0; i < documentsToRemove; i++) {
        const [docId] = sortedDocs[i];
        this.offlineIndex.documents.delete(docId);
        
        // Remove from all indexes
        this.removeFromIndexes(docId);
      }
    }
  }

  /**
   * Remove document from all search indexes
   */
  private removeFromIndexes(docId: string): void {
    if (!this.offlineIndex) return;

    [this.offlineIndex.titleIndex, this.offlineIndex.contentIndex, 
     this.offlineIndex.tagIndex, this.offlineIndex.categoryIndex].forEach(index => {
      index.forEach((docIds, term) => {
        docIds.delete(docId);
        if (docIds.size === 0) {
          index.delete(term);
        }
      });
    });
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupOldEntries(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const cacheKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(this.CACHE_PREFIX));

    if (cacheKeys.length > this.MAX_CACHE_ENTRIES) {
      const entries: Array<{ key: string; timestamp: number }> = [];
      
      cacheKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const entry = JSON.parse(data);
            entries.push({ key, timestamp: entry.timestamp });
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      });

      // Sort by timestamp and remove oldest
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_ENTRIES + 10);
      
      toRemove.forEach(({ key }) => {
        localStorage.removeItem(key);
        this.memoryCache.delete(key);
      });
    }
  }

  /**
   * Clear oldest cache entries
   */
  private async clearOldestEntries(count: number): Promise<void> {
    const cacheKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(this.CACHE_PREFIX));

    const entries: Array<{ key: string; timestamp: number }> = [];
    
    cacheKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const entry = JSON.parse(data);
          entries.push({ key, timestamp: entry.timestamp });
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    });

    entries.sort((a, b) => a.timestamp - b.timestamp);
    entries.slice(0, count).forEach(({ key }) => {
      localStorage.removeItem(key);
      this.memoryCache.delete(key);
    });
  }

  /**
   * Clear all cache data
   */
  async clearCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear localStorage cache
    const cacheKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(this.CACHE_PREFIX));
    
    cacheKeys.forEach(key => localStorage.removeItem(key));

    // Clear offline index
    localStorage.removeItem(this.INDEX_KEY);
    this.createEmptyIndex();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const memoryCacheSize = this.memoryCache.size;
    const localStorageCacheSize = Object.keys(localStorage)
      .filter(key => key.startsWith(this.CACHE_PREFIX)).length;
    const offlineDocuments = this.offlineIndex?.documents.size || 0;
    const offlineIndexSize = this.offlineIndex ? 
      this.offlineIndex.titleIndex.size + 
      this.offlineIndex.contentIndex.size + 
      this.offlineIndex.tagIndex.size : 0;

    return {
      memoryCacheSize,
      localStorageCacheSize,
      offlineDocuments,
      offlineIndexSize,
      lastIndexUpdate: this.offlineIndex?.lastUpdated
    };
  }

  /**
   * Check if offline search is available
   */
  isOfflineSearchAvailable(): boolean {
    return this.offlineIndex !== null && this.offlineIndex.documents.size > 0;
  }
}

// Export singleton instance
export const searchCache = new SearchCacheManager();

// Export types
export type { SearchCacheEntry, OfflineSearchIndex };