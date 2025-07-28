/**
 * Push Notification System with Rich Media Support
 * Advanced notification system optimized for restaurant operations
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  BellOff, 
  AlertTriangle, 
  Check, 
  X, 
  Settings,
  Volume2,
  VolumeX,
  Smartphone,
  Clock,
  MapPin,
  ChefHat,
  AlertCircle,
  CheckCircle,
  Info,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
  url?: string;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  actions?: NotificationAction[];
  vibrate?: number[];
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
}

interface NotificationPreferences {
  enabled: boolean;
  categories: {
    emergency: boolean;
    sop_updates: boolean;
    training_reminders: boolean;
    shift_notifications: boolean;
    form_submissions: boolean;
    system_alerts: boolean;
  };
  sound: boolean;
  vibration: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  deviceNotifications: boolean;
}

interface PushNotificationSystemProps {
  userId: string;
  restaurantId: string;
  onNotificationReceived?: (notification: any) => void;
  onNotificationClicked?: (notification: any) => void;
}

export function PushNotificationSystem({
  userId,
  restaurantId,
  onNotificationReceived,
  onNotificationClicked
}: PushNotificationSystemProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    categories: {
      emergency: true,
      sop_updates: true,
      training_reminders: true,
      shift_notifications: true,
      form_submissions: false,
      system_alerts: true,
    },
    sound: true,
    vibration: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '06:00',
    },
    deviceNotifications: true,
  });
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [testNotification, setTestNotification] = useState(false);
  const workerRef = useRef<ServiceWorkerRegistration | null>(null);

  // VAPID public key for push notifications
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || 
    'BEl62iUYgUivxIkv69yViEuiBIa40HI80j3pzj4-JbZf-Ck4yK-wQtNTH7RN-P5fxFcThBZjEPl2S7Y4ZKv8Gzs';

  // Initialize notification system
  useEffect(() => {
    initializeNotifications();
    loadPreferences();
  }, []);

  const initializeNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('[Notifications] Not supported in this browser');
      return;
    }

    // Get current permission
    setPermission(Notification.permission);

    // Register service worker
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      workerRef.current = registration;

      // Check for existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        await syncSubscriptionWithServer(existingSubscription);
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    } catch (error) {
      console.error('[Notifications] Service worker registration failed:', error);
    }
  };

  const loadPreferences = () => {
    const stored = localStorage.getItem(`notification-preferences-${userId}`);
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (error) {
        console.error('[Notifications] Failed to load preferences:', error);
      }
    }
  };

  const savePreferences = useCallback((newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem(`notification-preferences-${userId}`, JSON.stringify(newPreferences));
  }, [userId]);

  // Permission management
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support push notifications.",
        variant: "destructive",
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);

    if (permission === 'granted') {
      toast({
        title: "Notifications Enabled",
        description: "You'll receive important updates from Krong Thai SOP.",
      });
      return true;
    } else if (permission === 'denied') {
      toast({
        title: "Notifications Denied",
        description: "You can enable notifications in your browser settings.",
        variant: "destructive",
      });
      return false;
    }

    return false;
  };

  // Subscription management
  const subscribeToPush = async (): Promise<void> => {
    if (!workerRef.current || permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setIsSubscribing(true);

    try {
      const subscription = await workerRef.current!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      setSubscription(subscription);
      await syncSubscriptionWithServer(subscription);

      toast({
        title: "Push Notifications Enabled",
        description: "You'll receive real-time updates even when the app is closed.",
      });
    } catch (error) {
      console.error('[Notifications] Subscription failed:', error);
      toast({
        title: "Subscription Failed",
        description: "Unable to enable push notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribeFromPush = async (): Promise<void> => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      await removeSubscriptionFromServer(subscription);
      setSubscription(null);

      toast({
        title: "Push Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
    } catch (error) {
      console.error('[Notifications] Unsubscription failed:', error);
      toast({
        title: "Unsubscription Failed",
        description: "Unable to disable push notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Server synchronization
  const syncSubscriptionWithServer = async (subscription: PushSubscription): Promise<void> => {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId,
          restaurantId,
          preferences,
        }),
      });
    } catch (error) {
      console.error('[Notifications] Failed to sync subscription:', error);
    }
  };

  const removeSubscriptionFromServer = async (subscription: PushSubscription): Promise<void> => {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId,
        }),
      });
    } catch (error) {
      console.error('[Notifications] Failed to remove subscription:', error);
    }
  };

  // Notification creation and management
  const showLocalNotification = async (options: NotificationOptions): Promise<void> => {
    if (permission !== 'granted' || !preferences.enabled) return;

    // Check quiet hours
    if (preferences.quietHours.enabled && isInQuietHours()) {
      if (options.tag !== 'emergency') return;
    }

    // Check category preferences
    const category = getCategoryFromTag(options.tag);
    if (category && !preferences.categories[category]) return;

    try {
      // Enhanced notification options
      const notificationOptions: NotificationOptions = {
        ...options,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/badge-72x72.png',
        timestamp: options.timestamp || Date.now(),
        requireInteraction: options.requireInteraction ?? isHighPriority(options.tag),
        silent: options.silent ?? !preferences.sound,
        vibrate: preferences.vibration ? getVibrationPattern(options.tag) : undefined,
        data: {
          ...options.data,
          userId,
          restaurantId,
          timestamp: Date.now(),
        },
      };

      // Add default actions based on notification type
      if (!notificationOptions.actions) {
        notificationOptions.actions = getDefaultActions(options.tag);
      }

      const notification = new Notification(options.title, notificationOptions);

      // Handle notification events
      notification.onclick = () => {
        notification.close();
        handleNotificationClick(options);
      };

      notification.onshow = () => {
        onNotificationReceived?.(options);
      };

      // Auto-close non-critical notifications
      if (!isHighPriority(options.tag)) {
        setTimeout(() => notification.close(), 10000);
      }
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
    }
  };

  const sendTestNotification = async (): Promise<void> => {
    setTestNotification(true);
    
    try {
      const testOptions: NotificationOptions = {
        title: 'Krong Thai SOP Test',
        body: 'This is a test notification to verify your settings.',
        tag: 'test',
        icon: '/icons/icon-192x192.png',
        image: '/screenshots/desktop-1.png',
        actions: [
          { action: 'view', title: 'View Dashboard', url: '/dashboard' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        data: { type: 'test' },
        requireInteraction: true,
      };

      if (subscription) {
        // Send via push service
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            userId,
            notification: testOptions,
          }),
        });
      } else {
        // Show local notification
        await showLocalNotification(testOptions);
      }

      toast({
        title: "Test Notification Sent",
        description: "Check if you received the test notification.",
      });
    } catch (error) {
      console.error('[Notifications] Test notification failed:', error);
      toast({
        title: "Test Failed",
        description: "Unable to send test notification.",
        variant: "destructive",
      });
    } finally {
      setTestNotification(false);
    }
  };

  // Notification templates for different scenarios
  const createEmergencyNotification = (message: string, location?: string): NotificationOptions => ({
    title: '🚨 EMERGENCY ALERT',
    body: message,
    tag: 'emergency',
    icon: '/icons/emergency-icon.png',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'acknowledge', title: 'Acknowledge', icon: '/icons/check.png' },
      { action: 'call_manager', title: 'Call Manager', icon: '/icons/phone.png' },
      { action: 'view_sop', title: 'View Emergency SOP', url: '/sop/emergency' }
    ],
    data: { type: 'emergency', location, priority: 'critical' }
  });

  const createSOPUpdateNotification = (sopTitle: string, changes: string[]): NotificationOptions => ({
    title: 'SOP Updated',
    body: `${sopTitle} has been updated with ${changes.length} changes.`,
    tag: 'sop_update',
    icon: '/icons/sop-icon.png',
    image: '/screenshots/sop-preview.png',
    actions: [
      { action: 'view_changes', title: 'View Changes', url: `/sop/${sopTitle.toLowerCase().replace(/\s+/g, '-')}` },
      { action: 'mark_read', title: 'Mark as Read' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: { type: 'sop_update', sopTitle, changes }
  });

  const createTrainingReminderNotification = (moduleName: string, dueDate: string): NotificationOptions => ({
    title: 'Training Due Soon',
    body: `Complete "${moduleName}" by ${dueDate}`,
    tag: 'training_reminder',
    icon: '/icons/training-icon.png',
    actions: [
      { action: 'start_training', title: 'Start Training', url: '/training' },
      { action: 'remind_later', title: 'Remind Later' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: { type: 'training_reminder', moduleName, dueDate }
  });

  const createShiftNotification = (type: 'start' | 'end' | 'break', message: string): NotificationOptions => ({
    title: type === 'start' ? 'Shift Starting' : type === 'end' ? 'Shift Ending' : 'Break Time',
    body: message,
    tag: `shift_${type}`,
    icon: '/icons/clock-icon.png',
    actions: type === 'start' ? [
      { action: 'clock_in', title: 'Clock In', url: '/dashboard/timesheet' },
      { action: 'view_schedule', title: 'View Schedule', url: '/dashboard/schedule' },
      { action: 'dismiss', title: 'Dismiss' }
    ] : [
      { action: 'clock_out', title: 'Clock Out', url: '/dashboard/timesheet' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: { type: 'shift', subtype: type }
  });

  // Helper functions
  const isInQuietHours = (): boolean => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = parseTime(preferences.quietHours.start);
    const endTime = parseTime(preferences.quietHours.end);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  };

  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getCategoryFromTag = (tag?: string): keyof NotificationPreferences['categories'] | null => {
    if (!tag) return null;
    
    const mapping: Record<string, keyof NotificationPreferences['categories']> = {
      'emergency': 'emergency',
      'sop_update': 'sop_updates',
      'training_reminder': 'training_reminders',
      'shift_start': 'shift_notifications',
      'shift_end': 'shift_notifications',
      'shift_break': 'shift_notifications',
      'form_submission': 'form_submissions',
      'system_alert': 'system_alerts',
    };

    return mapping[tag] || null;
  };

  const isHighPriority = (tag?: string): boolean => {
    return tag === 'emergency' || tag?.startsWith('shift_') || false;
  };

  const getVibrationPattern = (tag?: string): number[] => {
    switch (tag) {
      case 'emergency':
        return [300, 100, 300, 100, 300];
      case 'sop_update':
        return [100, 50, 100];
      case 'training_reminder':
        return [200, 100, 200];
      default:
        return [100];
    }
  };

  const getDefaultActions = (tag?: string): NotificationAction[] => {
    switch (tag) {
      case 'emergency':
        return [
          { action: 'acknowledge', title: 'Acknowledge' },
          { action: 'call_manager', title: 'Call Manager' }
        ];
      case 'sop_update':
        return [
          { action: 'view', title: 'View Changes' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
      case 'training_reminder':
        return [
          { action: 'start', title: 'Start Training' },
          { action: 'remind_later', title: 'Remind Later' }
        ];
      default:
        return [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
    }
  };

  const handleNotificationClick = (notification: NotificationOptions): void => {
    // Handle notification click based on type
    if (notification.data?.url) {
      window.open(notification.data.url, '_blank');
    } else if (notification.actions?.length && notification.actions[0].url) {
      window.open(notification.actions[0].url, '_blank');
    }

    onNotificationClicked?.(notification);
  };

  const handleServiceWorkerMessage = (event: MessageEvent): void => {
    if (event.data?.type === 'NOTIFICATION_CLICKED') {
      handleNotificationClick(event.data.notification);
    }
  };

  const getAuthToken = (): string => {
    return localStorage.getItem('auth_token') || '';
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
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
  };

  // Permission status indicator
  const getPermissionIcon = () => {
    switch (permission) {
      case 'granted':
        return <Bell className="h-5 w-5 text-green-600" />;
      case 'denied':
        return <BellOff className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Enabled', color: 'text-green-600' };
      case 'denied':
        return { text: 'Blocked', color: 'text-red-600' };
      default:
        return { text: 'Not Set', color: 'text-yellow-600' };
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getPermissionIcon()}
            <div>
              <CardTitle className="text-xl font-semibold">Push Notifications</CardTitle>
              <CardDescription>
                Manage real-time notifications for restaurant operations
              </CardDescription>
            </div>
          </div>
          <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
            {getPermissionStatus().text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main toggle and subscription status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-medium">Push Notifications</div>
              <div className="text-sm text-gray-600">
                {subscription ? 'Subscribed to push notifications' : 'Not subscribed'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {permission === 'granted' && !subscription && (
              <Button
                onClick={subscribeToPush}
                disabled={isSubscribing}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubscribing ? 'Subscribing...' : 'Enable Push'}
              </Button>
            )}
            {subscription && (
              <Button
                onClick={unsubscribeFromPush}
                variant="outline"
                size="sm"
              >
                Disable
              </Button>
            )}
            {permission !== 'granted' && (
              <Button
                onClick={requestPermission}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Allow Notifications
              </Button>
            )}
          </div>
        </div>

        {/* Notification categories */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Notification Categories</h3>
          
          {Object.entries(preferences.categories).map(([category, enabled]) => {
            const categoryInfo = getCategoryInfo(category as keyof NotificationPreferences['categories']);
            return (
              <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {categoryInfo.icon}
                  <div>
                    <div className="font-medium">{categoryInfo.title}</div>
                    <div className="text-sm text-gray-600">{categoryInfo.description}</div>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    const newPreferences = {
                      ...preferences,
                      categories: {
                        ...preferences.categories,
                        [category]: checked,
                      },
                    };
                    savePreferences(newPreferences);
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Notification settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                {preferences.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span className="text-sm font-medium">Sound</span>
              </div>
              <Switch
                checked={preferences.sound}
                onCheckedChange={(checked) => {
                  savePreferences({ ...preferences, sound: checked });
                }}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm font-medium">Vibration</span>
              </div>
              <Switch
                checked={preferences.vibration}
                onCheckedChange={(checked) => {
                  savePreferences({ ...preferences, vibration: checked });
                }}
              />
            </div>
          </div>

          {/* Quiet hours */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Quiet Hours</span>
              </div>
              <Switch
                checked={preferences.quietHours.enabled}
                onCheckedChange={(checked) => {
                  savePreferences({
                    ...preferences,
                    quietHours: { ...preferences.quietHours, enabled: checked },
                  });
                }}
              />
            </div>
            
            {preferences.quietHours.enabled && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span>From:</span>
                  <input
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => {
                      savePreferences({
                        ...preferences,
                        quietHours: { ...preferences.quietHours, start: e.target.value },
                      });
                    }}
                    className="border rounded px-2 py-1"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span>To:</span>
                  <input
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => {
                      savePreferences({
                        ...preferences,
                        quietHours: { ...preferences.quietHours, end: e.target.value },
                      });
                    }}
                    className="border rounded px-2 py-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test notification */}
        <div className="flex items-center justify-center pt-4 border-t">
          <Button
            onClick={sendTestNotification}
            disabled={testNotification || permission !== 'granted'}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {testNotification ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Sending Test...</span>
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                <span>Send Test Notification</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for category information
function getCategoryInfo(category: keyof NotificationPreferences['categories']) {
  const info = {
    emergency: {
      title: 'Emergency Alerts',
      description: 'Critical safety and emergency notifications',
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    },
    sop_updates: {
      title: 'SOP Updates',
      description: 'Changes to standard operating procedures',
      icon: <Info className="h-5 w-5 text-blue-600" />,
    },
    training_reminders: {
      title: 'Training Reminders',
      description: 'Module deadlines and training notifications',
      icon: <ChefHat className="h-5 w-5 text-green-600" />,
    },
    shift_notifications: {
      title: 'Shift Notifications',
      description: 'Clock in/out reminders and schedule updates',
      icon: <Clock className="h-5 w-5 text-purple-600" />,
    },
    form_submissions: {
      title: 'Form Submissions',
      description: 'Confirmation of submitted forms and reports',
      icon: <CheckCircle className="h-5 w-5 text-teal-600" />,
    },
    system_alerts: {
      title: 'System Alerts',
      description: 'App updates and system maintenance notices',
      icon: <Settings className="h-5 w-5 text-gray-600" />,
    },
  };

  return info[category];
}

export default PushNotificationSystem;
export type { NotificationOptions, NotificationPreferences, NotificationAction };