/**
 * Translation Cache Management Utilities
 * Restaurant Krong Thai SOP Management System
 */

import { supabase, dbAdmin } from '@/lib/supabase/client';
import { 
  Locale, 
  TranslationCache, 
  CacheStats, 
  InvalidateCacheRequest, 
  InvalidateCacheResponse 
} from '@/types/translation';

// Cache configuration
const CACHE_TTL_SECONDS = 300; // 5 minutes default
const CACHE_VERSION = '1.0.0';
const HOT_KEY_THRESHOLD = 100; // Access count threshold for hot keys

/**
 * Cache manager class for translation operations
 */
export class TranslationCacheManager {
  private static instance: TranslationCacheManager;
  private cacheStats: Map<string, number> = new Map();

  static getInstance(): TranslationCacheManager {
    if (!TranslationCacheManager.instance) {
      TranslationCacheManager.instance = new TranslationCacheManager();
    }
    return TranslationCacheManager.instance;
  }

  /**
   * Get cached translations for a locale
   */
  async getCachedTranslations(
    locale: Locale,
    keys?: string[],
    category?: string
  ): Promise<Record<string, string> | null> {
    try {
      const cacheKey = this.generateCacheKey(locale, keys, category);
      
      const { data: cached, error } = await supabase
        .from('translation_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !cached) {
        return null;
      }

      // Update access count
      this.updateAccessCount(cacheKey);

      // Parse and return cached data
      return JSON.parse(cached.cached_data);
    } catch (error) {
      console.error('Error retrieving cached translations:', error);
      return null;
    }
  }

  /**
   * Cache translations data
   */
  async cacheTranslations(
    locale: Locale,
    translations: Record<string, string>,
    metadata: {
      keys?: string[];
      category?: string;
      ttlSeconds?: number;
    } = {}
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(locale, metadata.keys, metadata.category);
      const ttl = metadata.ttlSeconds || CACHE_TTL_SECONDS;
      const expiresAt = new Date(Date.now() + ttl * 1000);

      const cacheData = {
        cache_key: cacheKey,
        locale,
        cached_data: JSON.stringify(translations),
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        version: CACHE_VERSION,
        key_count: Object.keys(translations).length,
        category: metadata.category || null,
      };

      const { error } = await dbAdmin
        .from('translation_cache')
        .upsert(cacheData);

      if (error) {
        console.error('Error caching translations:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error caching translations:', error);
      return false;
    }
  }

  /**
   * Invalidate cache entries based on criteria
   */
  async invalidateCache(request: InvalidateCacheRequest): Promise<InvalidateCacheResponse> {
    try {
      let query = dbAdmin.from('translation_cache').delete();
      let affectedKeys: string[] = [];
      let invalidatedEntries = 0;

      // Build delete query based on criteria
      if (request.keys && request.keys.length > 0) {
        // For specific keys, we need to find cache entries that contain these keys
        // This is a limitation of the current cache structure - we'd need to enhance it
        // to support key-level invalidation more efficiently
        
        const { data: cacheEntries, error } = await dbAdmin
          .from('translation_cache')
          .select('cache_key, cached_data');

        if (!error && cacheEntries) {
          const keysToInvalidate = new Set<string>();
          
          for (const entry of cacheEntries) {
            try {
              const cachedData = JSON.parse(entry.cached_data);
              const hasAnyKey = request.keys.some(key => key in cachedData);
              
              if (hasAnyKey) {
                keysToInvalidate.add(entry.cache_key);
                affectedKeys.push(...Object.keys(cachedData));
              }
            } catch (parseError) {
              console.warn('Failed to parse cached data for invalidation:', parseError);
            }
          }

          if (keysToInvalidate.size > 0) {
            const { error: deleteError } = await dbAdmin
              .from('translation_cache')
              .delete()
              .in('cache_key', Array.from(keysToInvalidate));

            if (!deleteError) {
              invalidatedEntries = keysToInvalidate.size;
            }
          }
        }
      } else {
        // Broader invalidation criteria
        if (request.locales && request.locales.length > 0) {
          query = query.in('locale', request.locales);
        }

        if (request.categories && request.categories.length > 0) {
          query = query.in('category', request.categories);
        }

        // Execute the deletion
        const { error, count } = await query;
        
        if (!error) {
          invalidatedEntries = count || 0;
        }
      }

      // Trigger cache rebuild if forced or if significant number of entries were invalidated
      const cacheRebuildTriggered = request.force || invalidatedEntries > 10;
      
      if (cacheRebuildTriggered) {
        // In a production environment, this would trigger a background job
        // to rebuild commonly used cache entries
        this.triggerCacheRebuild(request.locales, request.categories);
      }

      return {
        invalidated_entries: invalidatedEntries,
        affected_keys: [...new Set(affectedKeys)],
        cache_rebuild_triggered: cacheRebuildTriggered,
        estimated_rebuild_time: invalidatedEntries * 0.1, // 100ms per entry estimate
      };

    } catch (error) {
      console.error('Error invalidating cache:', error);
      throw new Error('Cache invalidation failed');
    }
  }

  /**
   * Get cache statistics and performance metrics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      // Get cache entry count and size information
      const { data: cacheInfo, error: cacheError } = await dbAdmin
        .from('translation_cache')
        .select('locale, key_count, cached_at, expires_at')
        .gt('expires_at', new Date().toISOString());

      if (cacheError) {
        throw new Error(`Cache stats query failed: ${cacheError.message}`);
      }

      const totalCachedKeys = cacheInfo?.reduce((sum, entry) => sum + (entry.key_count || 0), 0) || 0;
      
      // Calculate cache size estimate (rough approximation)
      const cacheSizeMB = (cacheInfo?.length || 0) * 0.01; // Rough estimate

      // Get hot keys from analytics
      const { data: hotKeysData, error: hotKeysError } = await dbAdmin
        .from('translation_analytics')
        .select('translation_key, locale, usage_count, last_accessed')
        .gte('usage_count', HOT_KEY_THRESHOLD)
        .order('usage_count', { ascending: false })
        .limit(20);

      const hotKeys = hotKeysData?.map(item => ({
        key: item.translation_key,
        locale: item.locale as Locale,
        access_count: item.usage_count,
        last_accessed: item.last_accessed,
      })) || [];

      // Calculate cache expiry distribution
      const expiryDistribution: Record<string, number> = {};
      const now = new Date();
      
      cacheInfo?.forEach(entry => {
        const expiresAt = new Date(entry.expires_at);
        const timeUntilExpiry = Math.max(0, expiresAt.getTime() - now.getTime());
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
        
        const bucket = minutesUntilExpiry < 5 ? '<5min' :
                      minutesUntilExpiry < 15 ? '5-15min' :
                      minutesUntilExpiry < 60 ? '15-60min' : '>60min';
        
        expiryDistribution[bucket] = (expiryDistribution[bucket] || 0) + 1;
      });

      // Calculate hit rate (simplified - in production you'd track this more accurately)
      const totalRequests = Array.from(this.cacheStats.values()).reduce((sum, count) => sum + count, 0);
      const cacheHitRate = totalRequests > 0 ? Math.min(0.95, totalCachedKeys / totalRequests) : 0;

      return {
        total_cached_keys: totalCachedKeys,
        cache_hit_rate: cacheHitRate,
        cache_size_mb: cacheSizeMB,
        last_cache_update: cacheInfo?.[0]?.cached_at || new Date().toISOString(),
        cache_expiry_distribution: expiryDistribution,
        hot_keys: hotKeys,
      };

    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw new Error('Failed to retrieve cache statistics');
    }
  }

  /**
   * Preload frequently used translations into cache
   */
  async preloadCache(locales: Locale[], categories?: string[]): Promise<number> {
    try {
      let preloadedCount = 0;

      for (const locale of locales) {
        // Build query for translations to preload
        let query = dbAdmin
          .from('translation_keys')
          .select(`
            key,
            category,
            translations!inner(
              locale,
              value,
              status
            )
          `)
          .eq('translations.locale', locale)
          .eq('translations.status', 'published');

        if (categories && categories.length > 0) {
          query = query.in('category', categories);
        }

        const { data: translationKeys, error } = await query;

        if (error) {
          console.error(`Error preloading translations for ${locale}:`, error);
          continue;
        }

        // Transform data into cache format
        const translations: Record<string, string> = {};
        
        for (const translationKey of translationKeys || []) {
          const translation = translationKey.translations?.find(
            (t: any) => t.locale === locale && t.status === 'published'
          );
          
          if (translation) {
            translations[translationKey.key] = translation.value;
          }
        }

        // Cache the translations
        const cached = await this.cacheTranslations(locale, translations, {
          category: categories?.[0], // Use first category if multiple
          ttlSeconds: CACHE_TTL_SECONDS * 2, // Longer TTL for preloaded content
        });

        if (cached) {
          preloadedCount += Object.keys(translations).length;
        }
      }

      return preloadedCount;
    } catch (error) {
      console.error('Error preloading cache:', error);
      return 0;
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const { error, count } = await dbAdmin
        .from('translation_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired cache:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }

  /**
   * Generate cache key based on parameters
   */
  private generateCacheKey(locale: Locale, keys?: string[], category?: string): string {
    const keyParts = [
      `locale:${locale}`,
      keys ? `keys:${keys.sort().join(',')}` : 'keys:all',
      category ? `category:${category}` : '',
      `version:${CACHE_VERSION}`,
    ].filter(Boolean);

    return `translations:${keyParts.join(':')}`;
  }

  /**
   * Update access count for cache statistics
   */
  private updateAccessCount(cacheKey: string): void {
    const currentCount = this.cacheStats.get(cacheKey) || 0;
    this.cacheStats.set(cacheKey, currentCount + 1);
  }

  /**
   * Trigger cache rebuild (placeholder for background job)
   */
  private triggerCacheRebuild(locales?: Locale[], categories?: string[]): void {
    // In a production environment, this would:
    // 1. Queue a background job to rebuild cache
    // 2. Notify cache rebuild service
    // 3. Schedule preloading of common translations
    
    console.log('Cache rebuild triggered:', { locales, categories });
    
    // For now, we'll just preload immediately (simplified)
    if (locales && locales.length > 0) {
      setTimeout(() => {
        this.preloadCache(locales, categories);
      }, 100);
    }
  }
}

/**
 * Utility functions for cache management
 */

export const cacheManager = TranslationCacheManager.getInstance();

/**
 * Invalidate all cache entries for specific locales
 */
export async function invalidateLocaleCache(locales: Locale[]): Promise<void> {
  await cacheManager.invalidateCache({ locales });
}

/**
 * Invalidate all cache entries for specific categories
 */
export async function invalidateCategoryCache(categories: string[]): Promise<void> {
  await cacheManager.invalidateCache({ categories });
}

/**
 * Invalidate cache entries for specific translation keys
 */
export async function invalidateKeyCache(keys: string[]): Promise<void> {
  await cacheManager.invalidateCache({ keys });
}

/**
 * Get a cached translation by key
 */
export async function getCachedTranslation(
  locale: Locale, 
  key: string
): Promise<string | null> {
  const cached = await cacheManager.getCachedTranslations(locale, [key]);
  return cached?.[key] || null;
}

/**
 * Cache a single translation
 */
export async function cacheTranslation(
  locale: Locale,
  key: string,
  value: string,
  category?: string
): Promise<boolean> {
  return cacheManager.cacheTranslations(locale, { [key]: value }, { 
    keys: [key], 
    category 
  });
}

/**
 * Schedule cache cleanup job
 */
export function scheduleCacheCleanup(): void {
  // Clean up expired cache entries every 30 minutes
  setInterval(async () => {
    try {
      const cleanedUp = await cacheManager.cleanupExpiredCache();
      if (cleanedUp > 0) {
        console.log(`Cleaned up ${cleanedUp} expired cache entries`);
      }
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes
}

/**
 * Initialize cache system
 */
export async function initializeTranslationCache(): Promise<void> {
  try {
    // Start cache cleanup scheduler
    scheduleCacheCleanup();
    
    // Preload common translations
    await cacheManager.preloadCache(['en', 'fr'], ['common', 'navigation', 'auth']);
    
    console.log('Translation cache system initialized');
  } catch (error) {
    console.error('Failed to initialize translation cache:', error);
  }
}