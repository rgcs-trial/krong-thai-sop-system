/**
 * Real-time Translation Updates using Supabase WebSockets
 * Restaurant Krong Thai SOP Management System
 */

import { supabase, dbAdmin } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { 
  TranslationUpdateEvent,
  Locale,
  TranslationStatus,
  Translation,
  TranslationKey,
} from '@/types/translation';
import { cacheManager, invalidateKeyCache, invalidateLocaleCache } from './translation-cache';

/**
 * Real-time translation update manager
 */
export class TranslationRealtimeManager {
  private static instance: TranslationRealtimeManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<TranslationUpdateListener>> = new Map();
  private isInitialized = false;

  static getInstance(): TranslationRealtimeManager {
    if (!TranslationRealtimeManager.instance) {
      TranslationRealtimeManager.instance = new TranslationRealtimeManager();
    }
    return TranslationRealtimeManager.instance;
  }

  /**
   * Initialize real-time subscriptions
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Subscribe to translation table changes
      await this.subscribeToTranslations();
      
      // Subscribe to translation_keys table changes
      await this.subscribeToTranslationKeys();
      
      // Subscribe to translation status changes
      await this.subscribeToStatusChanges();

      this.isInitialized = true;
      console.log('Translation real-time manager initialized');
    } catch (error) {
      console.error('Failed to initialize translation real-time manager:', error);
      throw error;
    }
  }

  /**
   * Subscribe to translation table changes
   */
  private async subscribeToTranslations(): Promise<void> {
    const channel = supabase
      .channel('translation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations',
        },
        (payload: RealtimePostgresChangesPayload<Translation>) => {
          this.handleTranslationChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to translation changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Translation subscription error');
        }
      });

    this.channels.set('translations', channel);
  }

  /**
   * Subscribe to translation_keys table changes
   */
  private async subscribeToTranslationKeys(): Promise<void> {
    const channel = supabase
      .channel('translation-key-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translation_keys',
        },
        (payload: RealtimePostgresChangesPayload<TranslationKey>) => {
          this.handleTranslationKeyChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to translation key changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Translation key subscription error');
        }
      });

    this.channels.set('translation_keys', channel);
  }

  /**
   * Subscribe to status changes specifically
   */
  private async subscribeToStatusChanges(): Promise<void> {
    const channel = supabase
      .channel('translation-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'translations',
          filter: 'status=neq.old_status', // Only status changes
        },
        (payload: RealtimePostgresChangesPayload<Translation>) => {
          this.handleStatusChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to translation status changes');
        }
      });

    this.channels.set('status_changes', channel);
  }

  /**
   * Handle translation record changes
   */
  private async handleTranslationChange(
    payload: RealtimePostgresChangesPayload<Translation>
  ): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      // Get translation key information
      const translationKeyId = newRecord?.translation_key_id || oldRecord?.translation_key_id;
      if (!translationKeyId) return;

      const { data: translationKey } = await dbAdmin
        .from('translation_keys')
        .select('key, category')
        .eq('id', translationKeyId)
        .single();

      if (!translationKey) return;

      // Create update event
      const updateEvent: TranslationUpdateEvent = {
        type: eventType === 'INSERT' ? 'translation_created' :
              eventType === 'UPDATE' ? 'translation_updated' :
              'translation_deleted',
        translation_id: newRecord?.id || oldRecord?.id || '',
        translation_key: translationKey.key,
        locale: (newRecord?.locale || oldRecord?.locale) as Locale,
        previous_value: oldRecord?.value,
        new_value: newRecord?.value,
        previous_status: oldRecord?.status as TranslationStatus,
        new_status: newRecord?.status as TranslationStatus,
        changed_by: newRecord?.updated_by || 'system',
        timestamp: new Date().toISOString(),
        restaurant_id: '', // Would need to get this from context
      };

      // Invalidate cache for affected keys/locales
      await this.invalidateRelevantCache(updateEvent);

      // Notify subscribers
      await this.notifySubscribers(updateEvent);

    } catch (error) {
      console.error('Error handling translation change:', error);
    }
  }

  /**
   * Handle translation key changes
   */
  private async handleTranslationKeyChange(
    payload: RealtimePostgresChangesPayload<TranslationKey>
  ): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      const key = newRecord?.key || oldRecord?.key;
      if (!key) return;

      // Invalidate cache for the affected key
      await invalidateKeyCache([key]);

      // If key was renamed, also invalidate old key
      if (eventType === 'UPDATE' && oldRecord?.key !== newRecord?.key) {
        await invalidateKeyCache([oldRecord!.key]);
      }

      // Create a simplified event for key changes
      const updateEvent: TranslationUpdateEvent = {
        type: 'translation_updated', // Simplified event type
        translation_id: '',
        translation_key: key,
        locale: 'en' as Locale, // Default locale for key-level changes
        changed_by: 'system',
        timestamp: new Date().toISOString(),
        restaurant_id: '',
      };

      await this.notifySubscribers(updateEvent);

    } catch (error) {
      console.error('Error handling translation key change:', error);
    }
  }

  /**
   * Handle status-specific changes
   */
  private async handleStatusChange(
    payload: RealtimePostgresChangesPayload<Translation>
  ): Promise<void> {
    try {
      const { new: newRecord, old: oldRecord } = payload;
      
      if (!newRecord || !oldRecord) return;
      
      // Only process if status actually changed
      if (newRecord.status === oldRecord.status) return;

      const { data: translationKey } = await dbAdmin
        .from('translation_keys')
        .select('key')
        .eq('id', newRecord.translation_key_id)
        .single();

      if (!translationKey) return;

      const updateEvent: TranslationUpdateEvent = {
        type: 'status_changed',
        translation_id: newRecord.id,
        translation_key: translationKey.key,
        locale: newRecord.locale as Locale,
        previous_status: oldRecord.status as TranslationStatus,
        new_status: newRecord.status as TranslationStatus,
        changed_by: newRecord.updated_by || 'system',
        timestamp: new Date().toISOString(),
        restaurant_id: '',
      };

      // Invalidate cache if status changed to/from published
      if (newRecord.status === 'published' || oldRecord.status === 'published') {
        await invalidateKeyCache([translationKey.key]);
      }

      await this.notifySubscribers(updateEvent);

    } catch (error) {
      console.error('Error handling status change:', error);
    }
  }

  /**
   * Invalidate relevant cache entries based on the update event
   */
  private async invalidateRelevantCache(event: TranslationUpdateEvent): Promise<void> {
    try {
      // Always invalidate the specific key
      await invalidateKeyCache([event.translation_key]);

      // If the translation was published or unpublished, invalidate locale cache
      if (event.new_status === 'published' || event.previous_status === 'published') {
        await invalidateLocaleCache([event.locale]);
      }

      // If this is a deletion, also invalidate locale cache
      if (event.type === 'translation_deleted') {
        await invalidateLocaleCache([event.locale]);
      }

    } catch (error) {
      console.error('Error invalidating cache after real-time update:', error);
    }
  }

  /**
   * Notify all subscribers of the update
   */
  private async notifySubscribers(event: TranslationUpdateEvent): Promise<void> {
    try {
      // Notify global subscribers
      const globalSubscribers = this.subscribers.get('*') || new Set();
      for (const subscriber of globalSubscribers) {
        try {
          await subscriber(event);
        } catch (error) {
          console.error('Error notifying global subscriber:', error);
        }
      }

      // Notify key-specific subscribers
      const keySubscribers = this.subscribers.get(event.translation_key) || new Set();
      for (const subscriber of keySubscribers) {
        try {
          await subscriber(event);
        } catch (error) {
          console.error('Error notifying key subscriber:', error);
        }
      }

      // Notify locale-specific subscribers
      const localeSubscribers = this.subscribers.get(`locale:${event.locale}`) || new Set();
      for (const subscriber of localeSubscribers) {
        try {
          await subscriber(event);
        } catch (error) {
          console.error('Error notifying locale subscriber:', error);
        }
      }

    } catch (error) {
      console.error('Error notifying subscribers:', error);
    }
  }

  /**
   * Subscribe to translation updates
   */
  subscribe(
    listener: TranslationUpdateListener,
    options: {
      key?: string;
      locale?: Locale;
      global?: boolean;
    } = {}
  ): () => void {
    const subscriptionKey = options.global ? '*' :
                           options.key ? options.key :
                           options.locale ? `locale:${options.locale}` :
                           '*';

    if (!this.subscribers.has(subscriptionKey)) {
      this.subscribers.set(subscriptionKey, new Set());
    }

    this.subscribers.get(subscriptionKey)!.add(listener);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(subscriptionKey);
      if (subscribers) {
        subscribers.delete(listener);
        if (subscribers.size === 0) {
          this.subscribers.delete(subscriptionKey);
        }
      }
    };
  }

  /**
   * Unsubscribe from all updates and cleanup
   */
  async cleanup(): Promise<void> {
    try {
      // Unsubscribe from all channels
      for (const [name, channel] of this.channels) {
        await supabase.removeChannel(channel);
        console.log(`Unsubscribed from ${name} channel`);
      }

      this.channels.clear();
      this.subscribers.clear();
      this.isInitialized = false;

      console.log('Translation real-time manager cleaned up');
    } catch (error) {
      console.error('Error cleaning up translation real-time manager:', error);
    }
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    activeChannels: number;
    totalSubscribers: number;
    subscribersByType: Record<string, number>;
  } {
    const subscribersByType: Record<string, number> = {};
    let totalSubscribers = 0;

    for (const [key, subscribers] of this.subscribers) {
      const count = subscribers.size;
      subscribersByType[key] = count;
      totalSubscribers += count;
    }

    return {
      activeChannels: this.channels.size,
      totalSubscribers,
      subscribersByType,
    };
  }
}

/**
 * Translation update listener type
 */
export type TranslationUpdateListener = (event: TranslationUpdateEvent) => Promise<void> | void;

/**
 * Utility functions for real-time translation updates
 */

export const realtimeManager = TranslationRealtimeManager.getInstance();

/**
 * Subscribe to all translation updates
 */
export function subscribeToTranslationUpdates(
  listener: TranslationUpdateListener
): () => void {
  return realtimeManager.subscribe(listener, { global: true });
}

/**
 * Subscribe to updates for a specific translation key
 */
export function subscribeToKeyUpdates(
  key: string,
  listener: TranslationUpdateListener
): () => void {
  return realtimeManager.subscribe(listener, { key });
}

/**
 * Subscribe to updates for a specific locale
 */
export function subscribeToLocaleUpdates(
  locale: Locale,
  listener: TranslationUpdateListener
): () => void {
  return realtimeManager.subscribe(listener, { locale });
}

/**
 * Initialize the real-time translation system
 */
export async function initializeTranslationRealtime(): Promise<void> {
  try {
    await realtimeManager.initialize();
    console.log('Translation real-time system initialized');
  } catch (error) {
    console.error('Failed to initialize translation real-time system:', error);
    throw error;
  }
}

/**
 * Cleanup real-time subscriptions
 */
export async function cleanupTranslationRealtime(): Promise<void> {
  await realtimeManager.cleanup();
}

/**
 * Get real-time subscription statistics
 */
export function getRealtimeStats(): {
  activeChannels: number;
  totalSubscribers: number;
  subscribersByType: Record<string, number>;
} {
  return realtimeManager.getStats();
}

/**
 * React hook for translation updates (for future frontend integration)
 */
export function useTranslationUpdates(options: {
  key?: string;
  locale?: Locale;
  global?: boolean;
} = {}): {
  lastUpdate: TranslationUpdateEvent | null;
  subscribe: (listener: TranslationUpdateListener) => () => void;
} {
  // This would be implemented as a React hook in the frontend
  // For now, it's just a placeholder showing the intended API
  
  return {
    lastUpdate: null,
    subscribe: (listener: TranslationUpdateListener) => {
      return realtimeManager.subscribe(listener, options);
    },
  };
}

/**
 * Broadcast a custom translation update event
 * (useful for manual cache invalidation or notifications)
 */
export async function broadcastTranslationUpdate(
  event: Partial<TranslationUpdateEvent>
): Promise<void> {
  const fullEvent: TranslationUpdateEvent = {
    type: 'translation_updated',
    translation_id: '',
    translation_key: '',
    locale: 'en',
    changed_by: 'system',
    timestamp: new Date().toISOString(),
    restaurant_id: '',
    ...event,
  };

  // Notify subscribers directly
  await realtimeManager['notifySubscribers'](fullEvent);
}