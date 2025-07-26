/**
 * Push Notifications System for Restaurant Krong Thai SOP Management
 * Handles training reminders, SOP updates, and emergency notifications
 */

import { performanceMonitor } from './performance-monitor';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

interface SubscriptionOptions {
  userVisibleOnly: boolean;
  applicationServerKey?: Uint8Array;
}

class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private vapidPublicKey: string = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  private isSupported: boolean = false;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.initializeSupport();
  }

  private initializeSupport(): void {
    if (typeof window === 'undefined') return;

    this.isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    if (this.isSupported) {
      this.permission = Notification.permission;
      this.initializeServiceWorker();
    }
  }

  private async initializeServiceWorker(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.ready;
      console.log('[PushNotifications] Service Worker ready');
      
      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('[PushNotifications] Existing subscription found');
        // Send subscription to server for validation
        this.validateSubscription();
      }
    } catch (error) {
      console.error('[PushNotifications] Service Worker initialization failed:', error);
    }
  }

  private async validateSubscription(): Promise<void> {
    if (!this.subscription) return;

    try {
      const response = await fetch('/api/notifications/validate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        console.warn('[PushNotifications] Subscription validation failed, unsubscribing');
        await this.unsubscribe();
      }
    } catch (error) {
      console.error('[PushNotifications] Subscription validation error:', error);
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      this.permission = await Notification.requestPermission();
      
      // Track permission request result
      performanceMonitor.trackUserInteraction('notification-permission-request', {
        result: this.permission,
        timestamp: Date.now(),
      });

      return this.permission;
    } catch (error) {
      console.error('[PushNotifications] Permission request failed:', error);
      throw error;
    }
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.isSupported || !this.registration) {
      throw new Error('Push notifications are not supported or service worker not ready');
    }

    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    try {
      const subscriptionOptions: SubscriptionOptions = {
        userVisibleOnly: true,
      };

      // Add VAPID key if available
      if (this.vapidPublicKey) {
        subscriptionOptions.applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      }

      this.subscription = await this.registration.pushManager.subscribe(subscriptionOptions);

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);

      console.log('[PushNotifications] Successfully subscribed to push notifications');
      
      // Track successful subscription
      performanceMonitor.trackUserInteraction('notification-subscribe', {
        success: true,
        timestamp: Date.now(),
      });

      return this.subscription;
    } catch (error) {
      console.error('[PushNotifications] Subscription failed:', error);
      
      // Track subscription failure
      performanceMonitor.trackUserInteraction('notification-subscribe', {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        // Remove subscription from server
        await this.removeSubscriptionFromServer(this.subscription);
        this.subscription = null;
        
        console.log('[PushNotifications] Successfully unsubscribed');
        
        // Track unsubscribe
        performanceMonitor.trackUserInteraction('notification-unsubscribe', {
          success: true,
          timestamp: Date.now(),
        });
      }

      return success;
    } catch (error) {
      console.error('[PushNotifications] Unsubscribe failed:', error);
      return false;
    }
  }

  // Send subscription to server
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server subscription failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[PushNotifications] Failed to send subscription to server:', error);
      throw error;
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });
    } catch (error) {
      console.error('[PushNotifications] Failed to remove subscription from server:', error);
    }
  }

  // Show local notification (for testing or immediate feedback)
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      throw new Error('Notifications not supported or permission not granted');
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        image: payload.image,
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        timestamp: payload.timestamp || Date.now(),
        vibrate: payload.vibrate,
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        
        // Focus or open the app
        const urlToOpen = payload.data?.url || '/dashboard';
        this.handleNotificationClick(urlToOpen);
        
        notification.close();
      };

      // Track local notification
      performanceMonitor.trackUserInteraction('local-notification-shown', {
        tag: payload.tag,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('[PushNotifications] Local notification failed:', error);
      throw error;
    }
  }

  // Handle notification click actions
  private async handleNotificationClick(url: string): Promise<void> {
    try {
      // Try to focus existing window
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if none found
      if ('openWindow' in self.clients) {
        return self.clients.openWindow(url);
      }
    } catch (error) {
      console.error('[PushNotifications] Failed to handle notification click:', error);
    }
  }

  // Schedule SOP training reminders
  async scheduleTrainingReminder(
    sopId: string,
    sopTitle: string,
    dueDate: Date,
    userId: string
  ): Promise<void> {
    try {
      await fetch('/api/notifications/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'training-reminder',
          sopId,
          sopTitle,
          dueDate: dueDate.toISOString(),
          userId,
          scheduleTime: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24h before
        }),
      });

      console.log(`[PushNotifications] Scheduled training reminder for SOP: ${sopTitle}`);
    } catch (error) {
      console.error('[PushNotifications] Failed to schedule training reminder:', error);
    }
  }

  // Send SOP update notification
  async notifySOPUpdate(sopId: string, sopTitle: string, updateType: string): Promise<void> {
    const payload: NotificationPayload = {
      title: 'SOP Updated',
      body: `${sopTitle} has been updated. Please review the changes.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `sop-update-${sopId}`,
      data: {
        url: `/sop/documents/${sopId}`,
        sopId,
        updateType,
      },
      actions: [
        {
          action: 'view',
          title: 'View SOP',
          icon: '/icons/action-view.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/action-dismiss.png',
        },
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200],
    };

    try {
      // Send to server for push delivery
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'sop-update',
          payload,
          targetUsers: 'all', // or specific user IDs
        }),
      });

      console.log(`[PushNotifications] SOP update notification sent: ${sopTitle}`);
    } catch (error) {
      console.error('[PushNotifications] Failed to send SOP update notification:', error);
    }
  }

  // Send emergency notification
  async sendEmergencyNotification(message: string, category: string): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Emergency Alert',
      body: message,
      icon: '/icons/emergency-icon.png',
      badge: '/icons/emergency-badge.png',
      tag: `emergency-${category}`,
      data: {
        url: `/sop/emergency`,
        category,
        priority: 'high',
      },
      requireInteraction: true,
      vibrate: [300, 200, 300, 200, 300],
    };

    try {
      // Send immediately to all users
      await fetch('/api/notifications/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload,
          priority: 'high',
          immediate: true,
        }),
      });

      // Also show local notification for immediate feedback
      await this.showLocalNotification(payload);

      console.log('[PushNotifications] Emergency notification sent');
    } catch (error) {
      console.error('[PushNotifications] Failed to send emergency notification:', error);
    }
  }

  // Utility function to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Public getters
  get isSubscribed(): boolean {
    return this.subscription !== null;
  }

  get hasPermission(): boolean {
    return this.permission === 'granted';
  }

  get supported(): boolean {
    return this.isSupported;
  }

  get currentSubscription(): PushSubscription | null {
    return this.subscription;
  }
}

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager();

// React hook for push notifications
import { useState, useEffect } from 'react';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setIsSupported(pushNotificationManager.supported);
    setPermission(pushNotificationManager.permission);
    setIsSubscribed(pushNotificationManager.isSubscribed);

    // Listen for permission changes
    const checkPermission = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    // Check permission periodically (some browsers don't fire events)
    const interval = setInterval(checkPermission, 1000);

    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    try {
      const result = await pushNotificationManager.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Permission request failed:', error);
      throw error;
    }
  };

  const subscribe = async () => {
    try {
      const subscription = await pushNotificationManager.subscribe();
      setIsSubscribed(!!subscription);
      return subscription;
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    try {
      const result = await pushNotificationManager.unsubscribe();
      if (result) {
        setIsSubscribed(false);
      }
      return result;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      throw error;
    }
  };

  const showTestNotification = async () => {
    try {
      await pushNotificationManager.showLocalNotification({
        title: 'Test Notification',
        body: 'Push notifications are working correctly!',
        tag: 'test-notification',
        data: { url: '/dashboard' },
      });
    } catch (error) {
      console.error('Test notification failed:', error);
      throw error;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    showTestNotification,
  };
}

// Utility functions
export async function initializePushNotifications(): Promise<void> {
  // Initialize automatically on app start
  console.log('[PushNotifications] Initializing push notification system...');
}

export async function scheduleSOPReminder(
  sopId: string,
  sopTitle: string,
  dueDate: Date,
  userId: string
): Promise<void> {
  return pushNotificationManager.scheduleTrainingReminder(sopId, sopTitle, dueDate, userId);
}

export async function notifySOPUpdate(
  sopId: string,
  sopTitle: string,
  updateType: string = 'content'
): Promise<void> {
  return pushNotificationManager.notifySOPUpdate(sopId, sopTitle, updateType);
}

export async function sendEmergencyAlert(
  message: string,
  category: string = 'general'
): Promise<void> {
  return pushNotificationManager.sendEmergencyNotification(message, category);
}