/**
 * Client-side Translation Cache Manager
 * Restaurant Krong Thai SOP Management System
 * 
 * Provides intelligent caching, cache invalidation, and offline support
 * for the database-driven translation system
 */

import { 
  type Locale, 
  type TranslationsData, 
  type TranslationsMetadata,
  type GetTranslationsResponse 
} from '@/types/translation';
import { type AllTranslationKeys } from '@/types/translation-keys';

// Cache configuration
const CACHE_CONFIG = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB max cache size
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours
  PREFETCH_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days for prefetched content
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour cleanup interval
  STORAGE_KEY: 'krong-thai-translations-cache',
  VERSION_KEY: 'krong-thai-cache-version',
  METADATA_KEY: 'krong-thai-cache-metadata',
} as const;

// Cache entry structure
export interface CacheEntry {
  data: TranslationsData;
  metadata: TranslationsMetadata;
  cachedAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'high' | 'medium' | 'low';
  prefetched: boolean;
}

// Cache statistics
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  totalAccesses: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry: number;
  newestEntry: number;
  averageAccessTime: number;
}

// Cache key structure
type CacheKey = `${Locale}:${string}`;

class TranslationClientCache {
  private cache: Map<CacheKey, CacheEntry> = new Map();
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    totalAccesses: 0,
    totalHits: 0,
    totalMisses: 0,
    oldestEntry: 0,
    newestEntry: 0,
    averageAccessTime: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private accessTimes: number[] = [];

  constructor() {
    this.loadFromStorage();
    this.startCleanupTimer();
    
    // Listen for storage events from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange);
      window.addEventListener('beforeunload', this.persistToStorage);
    }
  }

  /**
   * Generate cache key for locale and optional namespace
   */
  private generateCacheKey(locale: Locale, namespace?: string): CacheKey {
    return `${locale}:${namespace || 'all'}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Calculate priority based on access patterns
   */
  private calculatePriority(accessCount: number, lastAccessed: number): 'high' | 'medium' | 'low' {
    const daysSinceAccess = (Date.now() - lastAccessed) / (24 * 60 * 60 * 1000);
    
    if (accessCount > 50 && daysSinceAccess < 1) return 'high';
    if (accessCount > 20 && daysSinceAccess < 3) return 'medium';
    return 'low';
  }

  /**
   * Get translation data from cache
   */
  get(locale: Locale, namespace?: string): GetTranslationsResponse | null {
    const startTime = performance.now();
    const key = this.generateCacheKey(locale, namespace);
    const entry = this.cache.get(key);

    this.stats.totalAccesses++;

    if (!entry || this.isExpired(entry)) {
      this.stats.totalMisses++;
      this.stats.missRate = this.stats.totalMisses / this.stats.totalAccesses;
      
      if (entry && this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.totalEntries--;
      }
      
      const accessTime = performance.now() - startTime;
      this.accessTimes.push(accessTime);
      this.updateAverageAccessTime();
      
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    entry.priority = this.calculatePriority(entry.accessCount, entry.lastAccessed);

    this.stats.totalHits++;
    this.stats.hitRate = this.stats.totalHits / this.stats.totalAccesses;

    const accessTime = performance.now() - startTime;
    this.accessTimes.push(accessTime);
    this.updateAverageAccessTime();

    return {
      locale: entry.metadata.locale,
      translations: entry.data,
      metadata: entry.metadata,
    };
  }

  /**
   * Set translation data in cache
   */
  set(
    locale: Locale, 
    data: TranslationsData, 
    metadata: TranslationsMetadata,
    namespace?: string,
    options: { 
      ttl?: number; 
      priority?: 'high' | 'medium' | 'low';
      prefetched?: boolean;
    } = {}
  ): void {
    const key = this.generateCacheKey(locale, namespace);
    const now = Date.now();
    const ttl = options.ttl || (options.prefetched ? CACHE_CONFIG.PREFETCH_TTL : CACHE_CONFIG.DEFAULT_TTL);
    
    const entry: CacheEntry = {
      data,
      metadata,
      cachedAt: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccessed: now,
      priority: options.priority || 'medium',
      prefetched: options.prefetched || false,
    };

    // Check if we need to evict entries to make space
    const entrySize = this.calculateEntrySize(entry);
    this.ensureSpace(entrySize);

    // Add or update entry
    const existingEntry = this.cache.get(key);
    if (!existingEntry) {
      this.stats.totalEntries++;
    }

    this.cache.set(key, entry);
    this.updateCacheStats();
    
    // Persist to storage if not prefetched
    if (!options.prefetched) {
      this.persistToStorage();
    }
  }

  /**
   * Check if translation exists in cache
   */
  has(locale: Locale, namespace?: string): boolean {
    const key = this.generateCacheKey(locale, namespace);
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Invalidate cache entries
   */
  invalidate(criteria: {
    locale?: Locale;
    namespace?: string;
    keys?: AllTranslationKeys[];
    olderThan?: number;
    force?: boolean;
  } = {}): number {
    let invalidatedCount = 0;
    const now = Date.now();

    for (const [cacheKey, entry] of this.cache.entries()) {
      const [entryLocale, entryNamespace] = cacheKey.split(':') as [Locale, string];
      
      let shouldInvalidate = criteria.force || false;

      // Check locale criteria
      if (criteria.locale && entryLocale !== criteria.locale) {
        continue;
      }

      // Check namespace criteria
      if (criteria.namespace && entryNamespace !== criteria.namespace) {
        continue;
      }

      // Check age criteria
      if (criteria.olderThan && entry.cachedAt > (now - criteria.olderThan)) {
        continue;
      }

      // Check specific keys (would need implementation based on entry structure)
      if (criteria.keys && criteria.keys.length > 0) {
        // This would require checking if any of the specified keys exist in the translation data
        shouldInvalidate = criteria.keys.some(key => key in entry.data);
      } else {
        shouldInvalidate = true;
      }

      if (shouldInvalidate) {
        this.cache.delete(cacheKey);
        invalidatedCount++;
        this.stats.totalEntries--;
      }
    }

    this.updateCacheStats();
    this.persistToStorage();
    
    return invalidatedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      totalAccesses: 0,
      totalHits: 0,
      totalMisses: 0,
      oldestEntry: 0,
      newestEntry: 0,
      averageAccessTime: 0,
    };
    this.accessTimes = [];
    this.clearStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(): Array<{ key: CacheKey; entry: CacheEntry }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
  }

  /**
   * Prefetch translations for improved performance
   */
  async prefetch(
    locale: Locale,
    namespaces: string[] = [],
    priority: 'high' | 'medium' | 'low' = 'low'
  ): Promise<void> {
    const prefetchPromises = namespaces.length > 0 
      ? namespaces.map(namespace => this.prefetchNamespace(locale, namespace, priority))
      : [this.prefetchNamespace(locale, undefined, priority)];

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Prefetch specific namespace
   */
  private async prefetchNamespace(
    locale: Locale, 
    namespace: string | undefined, 
    priority: 'high' | 'medium' | 'low'
  ): Promise<void> {
    try {
      const url = namespace 
        ? `/api/translations/${locale}?namespace=${namespace}`
        : `/api/translations/${locale}`;
        
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to prefetch translations: ${response.status}`);
      
      const data: GetTranslationsResponse = await response.json();
      
      this.set(locale, data.translations, data.metadata, namespace, {
        priority,
        prefetched: true,
        ttl: CACHE_CONFIG.PREFETCH_TTL,
      });
    } catch (error) {
      console.warn(`Failed to prefetch translations for ${locale}${namespace ? `:${namespace}` : ''}:`, error);
    }
  }

  /**
   * Calculate memory size of cache entry
   */
  private calculateEntrySize(entry: CacheEntry): number {
    const dataSize = JSON.stringify(entry.data).length * 2; // Rough UTF-16 size
    const metadataSize = JSON.stringify(entry.metadata).length * 2;
    return dataSize + metadataSize + 200; // Extra bytes for other properties
  }

  /**
   * Ensure there's enough space in cache
   */
  private ensureSpace(requiredSize: number): void {
    while (this.stats.totalSize + requiredSize > CACHE_CONFIG.MAX_SIZE && this.cache.size > 0) {
      this.evictLeastImportant();
    }
  }

  /**
   * Evict least important cache entry
   */
  private evictLeastImportant(): void {
    let leastImportantKey: CacheKey | null = null;
    let lowestScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const daysSinceAccess = (Date.now() - entry.lastAccessed) / (24 * 60 * 60 * 1000);
      const priorityWeight = entry.priority === 'high' ? 10 : entry.priority === 'medium' ? 5 : 1;
      const prefetchedPenalty = entry.prefetched ? 0.1 : 1;
      
      const score = (entry.accessCount * priorityWeight * prefetchedPenalty) / (daysSinceAccess + 1);
      
      if (score < lowestScore) {
        lowestScore = score;
        leastImportantKey = key;
      }
    }

    if (leastImportantKey) {
      this.cache.delete(leastImportantKey);
      this.stats.totalEntries--;
    }
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(): void {
    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const entry of this.cache.values()) {
      totalSize += this.calculateEntrySize(entry);
      if (entry.cachedAt < oldestEntry) oldestEntry = entry.cachedAt;
      if (entry.cachedAt > newestEntry) newestEntry = entry.cachedAt;
    }

    this.stats.totalSize = totalSize;
    this.stats.oldestEntry = oldestEntry;
    this.stats.newestEntry = newestEntry;
  }

  /**
   * Update average access time
   */
  private updateAverageAccessTime(): void {
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-500); // Keep last 500 access times
    }
    
    if (this.accessTimes.length > 0) {
      const sum = this.accessTimes.reduce((acc, time) => acc + time, 0);
      this.stats.averageAccessTime = sum / this.accessTimes.length;
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedCount++;
        this.stats.totalEntries--;
      }
    }

    if (cleanedCount > 0) {
      this.updateCacheStats();
      this.persistToStorage();
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cachedData = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (!cachedData) return;

      const parsed = JSON.parse(cachedData);
      const version = localStorage.getItem(CACHE_CONFIG.VERSION_KEY);
      
      // Check version compatibility
      if (version !== '1.0') {
        this.clearStorage();
        return;
      }

      // Restore cache entries
      for (const [key, entry] of Object.entries(parsed)) {
        if (this.isValidCacheEntry(entry)) {
          this.cache.set(key as CacheKey, entry as CacheEntry);
        }
      }

      // Load metadata
      const metadataStr = localStorage.getItem(CACHE_CONFIG.METADATA_KEY);
      if (metadataStr) {
        this.stats = JSON.parse(metadataStr);
      }

      this.updateCacheStats();
    } catch (error) {
      console.warn('Failed to load translation cache from storage:', error);
      this.clearStorage();
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistToStorage = (): void => {
    if (typeof window === 'undefined') return;

    try {
      const cacheObject = Object.fromEntries(this.cache.entries());
      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(cacheObject));
      localStorage.setItem(CACHE_CONFIG.VERSION_KEY, '1.0');
      localStorage.setItem(CACHE_CONFIG.METADATA_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to persist translation cache to storage:', error);
      // If storage is full, try to clear some space
      this.evictLeastImportant();
    }
  };

  /**
   * Handle storage changes from other tabs
   */
  private handleStorageChange = (event: StorageEvent): void => {
    if (event.key === CACHE_CONFIG.STORAGE_KEY && event.newValue) {
      this.loadFromStorage();
    }
  };

  /**
   * Clear storage
   */
  private clearStorage(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
    localStorage.removeItem(CACHE_CONFIG.VERSION_KEY);
    localStorage.removeItem(CACHE_CONFIG.METADATA_KEY);
  }

  /**
   * Validate cache entry structure
   */
  private isValidCacheEntry(entry: any): entry is CacheEntry {
    return (
      entry &&
      typeof entry === 'object' &&
      entry.data &&
      entry.metadata &&
      typeof entry.cachedAt === 'number' &&
      typeof entry.expiresAt === 'number' &&
      typeof entry.accessCount === 'number' &&
      typeof entry.lastAccessed === 'number'
    );
  }

  /**
   * Destroy cache instance
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange);
      window.removeEventListener('beforeunload', this.persistToStorage);
    }

    this.cache.clear();
  }
}

// Create singleton instance
export const translationCache = new TranslationClientCache();

// Export cache management utilities
export const cacheUtils = {
  /**
   * Get cache statistics for debugging
   */
  getStats: () => translationCache.getStats(),

  /**
   * Clear all cached translations
   */
  clearAll: () => translationCache.clear(),

  /**
   * Invalidate specific translations
   */
  invalidate: (criteria: Parameters<typeof translationCache.invalidate>[0]) => 
    translationCache.invalidate(criteria),

  /**
   * Prefetch translations for better performance
   */
  prefetch: (locale: Locale, namespaces?: string[], priority?: 'high' | 'medium' | 'low') =>
    translationCache.prefetch(locale, namespaces, priority),

  /**
   * Get cache entries for debugging
   */
  getEntries: () => translationCache.getEntries(),
};