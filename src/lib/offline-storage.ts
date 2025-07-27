/**
 * Offline Storage System for Restaurant Krong Thai SOP Management
 * Uses IndexedDB for offline data persistence and sync capabilities
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema type definitions
type SOPDocument = {
  id: string;
  title: string;
  content: string;
  category: string;
  language: 'en' | 'fr';
  lastUpdated: string;
  isCritical: boolean;
  mediaFiles?: Array<{
    id: string;
    url: string;
    type: string;
    blob?: Blob;
  }>;
};

type ProgressUpdate = {
  id: string;
  userId: string;
  sopId: string;
  action: 'view' | 'complete' | 'bookmark' | 'unbookmark';
  timestamp: string;
  synced: boolean;
  metadata?: Record<string, any>;
};

type SOPCategory = {
  id: string;
  name: string;
  description: string;
  language: 'en' | 'fr';
  sopIds: string[];
  lastUpdated: string;
};

type UserBookmark = {
  id: string;
  userId: string;
  sopId: string;
  createdAt: string;
  synced: boolean;
};

type MediaCacheEntry = {
  id: string;
  url: string;
  blob: Blob;
  mimeType: string;
  size: number;
  cachedAt: string;
  expiresAt: string;
};

// Database schema interfaces
export interface SOPOfflineDB extends DBSchema {
  sopDocuments: {
    key: string;
    value: SOPDocument;
    indexes: { 
      'by-category': string;
      'by-language': string;
      'by-critical': boolean;
    };
  };
  
  progressUpdates: {
    key: string;
    value: ProgressUpdate;
    indexes: {
      'by-user': string;
      'by-synced': boolean;
      'by-timestamp': string;
    };
  };
  
  sopCategories: {
    key: string;
    value: SOPCategory;
    indexes: {
      'by-language': string;
    };
  };
  
  userBookmarks: {
    key: string;
    value: UserBookmark;
    indexes: {
      'by-user': string;
      'by-synced': boolean;
    };
  };
  
  mediaCache: {
    key: string;
    value: MediaCacheEntry;
    indexes: {
      'by-expires': string;
    };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<SOPOfflineDB> | null = null;
  private dbName = 'KrongThaiSOP';
  private dbVersion = 1;

  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<SOPOfflineDB>(this.dbName, this.dbVersion, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log('[OfflineStorage] Upgrading database from', oldVersion, 'to', newVersion);
          
          // Create SOP documents store
          if (!db.objectStoreNames.contains('sopDocuments')) {
            const sopStore = db.createObjectStore('sopDocuments', { 
              keyPath: 'id' 
            });
            sopStore.createIndex('by-category', 'category');
            sopStore.createIndex('by-language', 'language');
            sopStore.createIndex('by-critical', 'isCritical');
          }
          
          // Create progress updates store
          if (!db.objectStoreNames.contains('progressUpdates')) {
            const progressStore = db.createObjectStore('progressUpdates', { 
              keyPath: 'id' 
            });
            progressStore.createIndex('by-user', 'userId');
            progressStore.createIndex('by-synced', 'synced');
            progressStore.createIndex('by-timestamp', 'timestamp');
          }
          
          // Create categories store
          if (!db.objectStoreNames.contains('sopCategories')) {
            const categoryStore = db.createObjectStore('sopCategories', { 
              keyPath: 'id' 
            });
            categoryStore.createIndex('by-language', 'language');
          }
          
          // Create bookmarks store
          if (!db.objectStoreNames.contains('userBookmarks')) {
            const bookmarkStore = db.createObjectStore('userBookmarks', { 
              keyPath: 'id' 
            });
            bookmarkStore.createIndex('by-user', 'userId');
            bookmarkStore.createIndex('by-synced', 'synced');
          }
          
          // Create media cache store
          if (!db.objectStoreNames.contains('mediaCache')) {
            const mediaStore = db.createObjectStore('mediaCache', { 
              keyPath: 'id' 
            });
            mediaStore.createIndex('by-expires', 'expiresAt');
          }
        },
      });
      
      console.log('[OfflineStorage] Database initialized successfully');
      
      // Clean up expired media on init
      this.cleanExpiredMedia();
    } catch (error) {
      console.error('[OfflineStorage] Failed to initialize database:', error);
      throw error;
    }
  }

  // SOP Document Operations
  async storeSOP(sop: SOPOfflineDB['sopDocuments']['value']): Promise<void> {
    if (!this.db) await this.init();
    
    try {
      await this.db!.put('sopDocuments', sop);
      console.log(`[OfflineStorage] Stored SOP: ${sop.id}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to store SOP:', error);
      throw error;
    }
  }

  async getSOP(id: string): Promise<SOPOfflineDB['sopDocuments']['value'] | undefined> {
    if (!this.db) await this.init();
    
    try {
      return await this.db!.get('sopDocuments', id);
    } catch (error) {
      console.error('[OfflineStorage] Failed to get SOP:', error);
      return undefined;
    }
  }

  async getSOPsByCategory(category: string, language: 'en' | 'fr'): Promise<SOPOfflineDB['sopDocuments']['value'][]> {
    if (!this.db) await this.init();
    
    try {
      const allSOPs = await this.db!.getAllFromIndex('sopDocuments', 'by-category', category);
      return allSOPs.filter(sop => sop.language === language);
    } catch (error) {
      console.error('[OfflineStorage] Failed to get SOPs by category:', error);
      return [];
    }
  }

  async getCriticalSOPs(language: 'en' | 'fr'): Promise<SOPOfflineDB['sopDocuments']['value'][]> {
    if (!this.db) await this.init();
    
    try {
      const criticalSOPs = await this.db!.getAllFromIndex('sopDocuments', 'by-critical', true);
      return criticalSOPs.filter(sop => sop.language === language);
    } catch (error) {
      console.error('[OfflineStorage] Failed to get critical SOPs:', error);
      return [];
    }
  }

  // Progress Tracking Operations
  async storeProgressUpdate(update: Omit<SOPOfflineDB['progressUpdates']['value'], 'id'>): Promise<string> {
    if (!this.db) await this.init();
    
    const id = `${update.userId}-${update.sopId}-${update.action}-${Date.now()}`;
    const fullUpdate = { ...update, id };
    
    try {
      await this.db!.put('progressUpdates', fullUpdate);
      console.log(`[OfflineStorage] Stored progress update: ${id}`);
      return id;
    } catch (error) {
      console.error('[OfflineStorage] Failed to store progress update:', error);
      throw error;
    }
  }

  async getPendingProgressUpdates(): Promise<SOPOfflineDB['progressUpdates']['value'][]> {
    if (!this.db) await this.init();
    
    try {
      return await this.db!.getAllFromIndex('progressUpdates', 'by-synced', false);
    } catch (error) {
      console.error('[OfflineStorage] Failed to get pending progress updates:', error);
      return [];
    }
  }

  async markProgressUpdateSynced(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    try {
      const update = await this.db!.get('progressUpdates', id);
      if (update) {
        update.synced = true;
        await this.db!.put('progressUpdates', update);
        console.log(`[OfflineStorage] Marked progress update as synced: ${id}`);
      }
    } catch (error) {
      console.error('[OfflineStorage] Failed to mark progress update as synced:', error);
    }
  }

  // Category Operations
  async storeCategory(category: SOPOfflineDB['sopCategories']['value']): Promise<void> {
    if (!this.db) await this.init();
    
    try {
      await this.db!.put('sopCategories', category);
      console.log(`[OfflineStorage] Stored category: ${category.id}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to store category:', error);
      throw error;
    }
  }

  async getCategories(language: 'en' | 'fr'): Promise<SOPOfflineDB['sopCategories']['value'][]> {
    if (!this.db) await this.init();
    
    try {
      return await this.db!.getAllFromIndex('sopCategories', 'by-language', language);
    } catch (error) {
      console.error('[OfflineStorage] Failed to get categories:', error);
      return [];
    }
  }

  // Bookmark Operations
  async storeBookmark(bookmark: Omit<SOPOfflineDB['userBookmarks']['value'], 'id'>): Promise<string> {
    if (!this.db) await this.init();
    
    const id = `${bookmark.userId}-${bookmark.sopId}`;
    const fullBookmark = { ...bookmark, id };
    
    try {
      await this.db!.put('userBookmarks', fullBookmark);
      console.log(`[OfflineStorage] Stored bookmark: ${id}`);
      return id;
    } catch (error) {
      console.error('[OfflineStorage] Failed to store bookmark:', error);
      throw error;
    }
  }

  async removeBookmark(userId: string, sopId: string): Promise<void> {
    if (!this.db) await this.init();
    
    const id = `${userId}-${sopId}`;
    
    try {
      await this.db!.delete('userBookmarks', id);
      console.log(`[OfflineStorage] Removed bookmark: ${id}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to remove bookmark:', error);
    }
  }

  async getUserBookmarks(userId: string): Promise<SOPOfflineDB['userBookmarks']['value'][]> {
    if (!this.db) await this.init();
    
    try {
      return await this.db!.getAllFromIndex('userBookmarks', 'by-user', userId);
    } catch (error) {
      console.error('[OfflineStorage] Failed to get user bookmarks:', error);
      return [];
    }
  }

  // Media Caching Operations
  async cacheMedia(url: string, blob: Blob, mimeType: string, expirationDays = 30): Promise<void> {
    if (!this.db) await this.init();
    
    const id = btoa(url).replace(/[^a-zA-Z0-9]/g, '');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    
    const mediaItem = {
      id,
      url,
      blob,
      mimeType,
      size: blob.size,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    
    try {
      await this.db!.put('mediaCache', mediaItem);
      console.log(`[OfflineStorage] Cached media: ${url}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to cache media:', error);
    }
  }

  async getCachedMedia(url: string): Promise<Blob | undefined> {
    if (!this.db) await this.init();
    
    const id = btoa(url).replace(/[^a-zA-Z0-9]/g, '');
    
    try {
      const mediaItem = await this.db!.get('mediaCache', id);
      if (mediaItem && new Date(mediaItem.expiresAt) > new Date()) {
        return mediaItem.blob;
      }
      
      // Remove expired item
      if (mediaItem) {
        await this.db!.delete('mediaCache', id);
      }
      
      return undefined;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get cached media:', error);
      return undefined;
    }
  }

  // Cleanup Operations
  async cleanExpiredMedia(): Promise<void> {
    if (!this.db) await this.init();
    
    try {
      const now = new Date().toISOString();
      const expired = await this.db!.getAllFromIndex('mediaCache', 'by-expires', IDBKeyRange.upperBound(now));
      
      for (const item of expired) {
        await this.db!.delete('mediaCache', item.id);
      }
      
      if (expired.length > 0) {
        console.log(`[OfflineStorage] Cleaned up ${expired.length} expired media items`);
      }
    } catch (error) {
      console.error('[OfflineStorage] Failed to clean expired media:', error);
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    
    try {
      const stores = ['sopDocuments', 'progressUpdates', 'sopCategories', 'userBookmarks', 'mediaCache'];
      
      for (const storeName of stores) {
        await this.db!.clear(storeName as keyof SOPOfflineDB);
      }
      
      console.log('[OfflineStorage] Cleared all data');
    } catch (error) {
      console.error('[OfflineStorage] Failed to clear data:', error);
    }
  }

  // Sync Operations
  async syncWithServer(apiEndpoint: string): Promise<{
    success: boolean;
    syncedUpdates: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let syncedUpdates = 0;

    try {
      // Sync pending progress updates
      const pendingUpdates = await this.getPendingProgressUpdates();
      
      for (const update of pendingUpdates) {
        try {
          const response = await fetch(`${apiEndpoint}/progress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: update.userId,
              sopId: update.sopId,
              action: update.action,
              timestamp: update.timestamp,
              metadata: update.metadata,
            }),
          });
          
          if (response.ok) {
            await this.markProgressUpdateSynced(update.id);
            syncedUpdates++;
          } else {
            errors.push(`Failed to sync progress update: ${update.id}`);
          }
        } catch (error) {
          errors.push(`Network error syncing progress update: ${update.id}`);
        }
      }
      
      // Sync bookmarks
      const unsyncedBookmarks = await this.db!.getAllFromIndex('userBookmarks', 'by-synced', false);
      
      for (const bookmark of unsyncedBookmarks) {
        try {
          const response = await fetch(`${apiEndpoint}/bookmarks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: bookmark.userId,
              sopId: bookmark.sopId,
              createdAt: bookmark.createdAt,
            }),
          });
          
          if (response.ok) {
            bookmark.synced = true;
            await this.db!.put('userBookmarks', bookmark);
            syncedUpdates++;
          } else {
            errors.push(`Failed to sync bookmark: ${bookmark.id}`);
          }
        } catch (error) {
          errors.push(`Network error syncing bookmark: ${bookmark.id}`);
        }
      }
      
      return {
        success: errors.length === 0,
        syncedUpdates,
        errors,
      };
    } catch (error) {
      console.error('[OfflineStorage] Sync failed:', error);
      return {
        success: false,
        syncedUpdates,
        errors: [...errors, 'Sync operation failed'],
      };
    }
  }

  // Storage Statistics
  async getStorageStats(): Promise<{
    sopDocuments: number;
    pendingUpdates: number;
    categories: number;
    bookmarks: number;
    cachedMedia: number;
    totalSize: number;
  }> {
    if (!this.db) await this.init();
    
    try {
      const [sops, updates, categories, bookmarks, media] = await Promise.all([
        this.db!.count('sopDocuments'),
        this.db!.count('progressUpdates'),
        this.db!.count('sopCategories'),
        this.db!.count('userBookmarks'),
        this.db!.count('mediaCache'),
      ]);
      
      // Calculate approximate total size
      const mediaItems = await this.db!.getAll('mediaCache');
      const totalSize = mediaItems.reduce((sum, item) => sum + item.size, 0);
      
      return {
        sopDocuments: sops,
        pendingUpdates: updates,
        categories,
        bookmarks,
        cachedMedia: media,
        totalSize,
      };
    } catch (error) {
      console.error('[OfflineStorage] Failed to get storage stats:', error);
      return {
        sopDocuments: 0,
        pendingUpdates: 0,
        categories: 0,
        bookmarks: 0,
        cachedMedia: 0,
        totalSize: 0,
      };
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

// Utility functions for external use
export async function initOfflineStorage(): Promise<void> {
  return offlineStorage.init();
}

export async function isOnline(): Promise<boolean> {
  return navigator.onLine;
}

export async function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve();
      return;
    }
    
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };
    
    window.addEventListener('online', handleOnline);
  });
}

// Background sync helpers
export function requestBackgroundSync(tag: string): void {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      // Type assertion for sync property that may not be in all browsers
      const syncManager = (registration as any).sync;
      if (syncManager && syncManager.register) {
        return syncManager.register(tag);
      }
    }).catch((error) => {
      console.error('[OfflineStorage] Background sync registration failed:', error);
    });
  }
}

// Schedule periodic sync for SOP updates
export function scheduleSOPSync(): void {
  requestBackgroundSync('sop-sync');
}

// Schedule progress sync
export function scheduleProgressSync(): void {
  requestBackgroundSync('progress-sync');
}