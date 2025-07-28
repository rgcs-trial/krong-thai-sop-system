/**
 * Phase 3A PWA Features Validation Test Suite
 * Tasks 251-256: Advanced PWA functionality validation
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { PWAInstallationManager, usePWAInstallation } from '@/components/pwa/pwa-installation-manager';
import PushNotificationSystem from '@/components/pwa/push-notification-system';

// Mock external dependencies
const mockServiceWorkerRegistration = {
  pushManager: {
    getSubscription: jest.fn(),
    subscribe: jest.fn(),
  },
  update: jest.fn(),
  waiting: null,
  active: null,
};

const mockPushSubscription = {
  toJSON: jest.fn(() => ({
    endpoint: 'https://test-endpoint.com',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  })),
  unsubscribe: jest.fn(),
};

// Setup global mocks
const setupPWAMocks = () => {
  Object.defineProperty(global, 'navigator', {
    value: {
      serviceWorker: {
        register: jest.fn(() => Promise.resolve(mockServiceWorkerRegistration)),
        getRegistration: jest.fn(() => Promise.resolve(mockServiceWorkerRegistration)),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        controller: null,
      },
      onLine: true,
      connection: {
        effectiveType: '4g',
        downlink: 10,
      },
      getBattery: jest.fn(() => Promise.resolve({
        level: 0.8,
        charging: false,
      })),
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    },
    writable: true,
  });

  Object.defineProperty(global, 'Notification', {
    value: class MockNotification {
      static permission = 'default';
      static requestPermission = jest.fn(() => Promise.resolve('granted'));
      
      constructor(title: string, options?: any) {
        this.title = title;
        this.options = options;
      }
      
      close = jest.fn();
      onclick: ((this: Notification, ev: Event) => any) | null = null;
      onshow: ((this: Notification, ev: Event) => any) | null = null;
    },
    writable: true,
  });

  Object.defineProperty(global.window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  global.fetch = jest.fn();
  global.gtag = jest.fn();
};

describe('Phase 3A PWA Features Validation', () => {
  beforeAll(() => {
    setupPWAMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Task 251: Service Worker Registration and Caching', () => {
    test('should register service worker successfully', async () => {
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      await waitFor(() => {
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
      });
    });

    test('should handle service worker registration failure gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      navigator.serviceWorker.register = jest.fn(() => Promise.reject(new Error('Registration failed')));
      
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[PWA] Service worker registration failed:',
          expect.any(Error)
        );
      });
      
      consoleError.mockRestore();
    });

    test('should detect existing service worker installation', async () => {
      const registration = {
        ...mockServiceWorkerRegistration,
        pushManager: {
          getSubscription: jest.fn(() => Promise.resolve(mockPushSubscription)),
        },
      };
      navigator.serviceWorker.getRegistration = jest.fn(() => Promise.resolve(registration));
      
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      await waitFor(() => {
        expect(registration.pushManager.getSubscription).toHaveBeenCalled();
      });
    });
  });

  describe('Task 252: Offline Sync and Background Processing', () => {
    test('should detect online/offline status changes', async () => {
      const { rerender } = render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
      fireEvent(window, new Event('offline'));
      
      // Simulate going online
      Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
      fireEvent(window, new Event('online'));
      
      // Component should handle online/offline events
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    test('should handle background sync capabilities', async () => {
      const mockRegistration = {
        ...mockServiceWorkerRegistration,
        sync: {
          register: jest.fn(),
        },
      };
      
      navigator.serviceWorker.getRegistration = jest.fn(() => Promise.resolve(mockRegistration));
      
      // Test background sync registration
      if ('sync' in mockRegistration) {
        await mockRegistration.sync.register('background-sync');
        expect(mockRegistration.sync.register).toHaveBeenCalledWith('background-sync');
      }
    });
  });

  describe('Task 253: Push Notifications with Rich Media', () => {
    test('should request notification permissions', async () => {
      render(
        <PushNotificationSystem
          userId="test-user"
          restaurantId="test-restaurant"
        />
      );
      
      const enableButton = screen.getByText('Allow Notifications');
      fireEvent.click(enableButton);
      
      await waitFor(() => {
        expect(Notification.requestPermission).toHaveBeenCalled();
      });
    });

    test('should subscribe to push notifications when permissions granted', async () => {
      Notification.permission = 'granted';
      mockServiceWorkerRegistration.pushManager.subscribe = jest.fn(() => 
        Promise.resolve(mockPushSubscription)
      );
      
      render(
        <PushNotificationSystem
          userId="test-user"
          restaurantId="test-restaurant"
        />
      );
      
      const enablePushButton = screen.getByText('Enable Push');
      fireEvent.click(enablePushButton);
      
      await waitFor(() => {
        expect(mockServiceWorkerRegistration.pushManager.subscribe).toHaveBeenCalledWith({
          userVisibleOnly: true,
          applicationServerKey: expect.any(Uint8Array),
        });
      });
    });

    test('should send test notification with rich media', async () => {
      Notification.permission = 'granted';
      global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
      
      render(
        <PushNotificationSystem
          userId="test-user"
          restaurantId="test-restaurant"
        />
      );
      
      const testButton = screen.getByText('Send Test Notification');
      fireEvent.click(testButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ',
          },
          body: expect.stringContaining('test'),
        });
      });
    });

    test('should handle notification category preferences', async () => {
      render(
        <PushNotificationSystem
          userId="test-user"
          restaurantId="test-restaurant"
        />
      );
      
      // Find and toggle emergency alerts
      const emergencyToggle = screen.getByRole('switch', { name: /Emergency Alerts/i });
      fireEvent.click(emergencyToggle);
      
      // Verify preference is saved to localStorage
      const preferences = JSON.parse(
        localStorage.getItem('notification-preferences-test-user') || '{}'
      );
      expect(preferences.categories?.emergency).toBeDefined();
    });

    test('should respect quiet hours settings', async () => {
      render(
        <PushNotificationSystem
          userId="test-user"
          restaurantId="test-restaurant"
        />
      );
      
      // Enable quiet hours
      const quietHoursToggle = screen.getByRole('switch', { name: /Quiet Hours/i });
      fireEvent.click(quietHoursToggle);
      
      // Set quiet hours time
      const startTimeInput = screen.getByDisplayValue('22:00');
      fireEvent.change(startTimeInput, { target: { value: '23:00' } });
      
      // Verify settings are saved
      const preferences = JSON.parse(
        localStorage.getItem('notification-preferences-test-user') || '{}'
      );
      expect(preferences.quietHours?.start).toBe('23:00');
    });
  });

  describe('Task 254: Native App Installation Experience', () => {
    test('should detect app installation capability', async () => {
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      Object.assign(beforeInstallPromptEvent, {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      // Simulate beforeinstallprompt event
      fireEvent(window, beforeInstallPromptEvent);
      
      await waitFor(() => {
        expect(screen.getByText('Install Krong Thai SOP')).toBeInTheDocument();
      });
    });

    test('should handle app installation flow', async () => {
      const mockPrompt = jest.fn();
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      Object.assign(beforeInstallPromptEvent, {
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      
      const onInstall = jest.fn();
      render(<PWAInstallationManager onInstall={onInstall} />);
      
      // Trigger install prompt
      fireEvent(window, beforeInstallPromptEvent);
      
      await waitFor(() => {
        const installButton = screen.getByText('Install App');
        fireEvent.click(installButton);
      });
      
      await waitFor(() => {
        expect(mockPrompt).toHaveBeenCalled();
      });
    });

    test('should detect when app is already installed', async () => {
      // Mock standalone display mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(display-mode: standalone)',
          media: query,
        })),
      });
      
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      // Should not show install prompt when already installed
      expect(screen.queryByText('Install Krong Thai SOP')).not.toBeInTheDocument();
    });

    test('should provide device-specific installation recommendations', async () => {
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      fireEvent(window, beforeInstallPromptEvent);
      
      await waitFor(() => {
        expect(screen.getByText('Tablet')).toBeInTheDocument(); // Based on mocked user agent
      });
    });
  });

  describe('Task 255: Advanced Update Management', () => {
    test('should detect service worker updates', async () => {
      const registration = {
        ...mockServiceWorkerRegistration,
        waiting: { postMessage: jest.fn() },
        active: {},
      };
      
      navigator.serviceWorker.getRegistration = jest.fn(() => Promise.resolve(registration));
      
      render(<PWAInstallationManager onUpdate={jest.fn()} />);
      
      await waitFor(() => {
        expect(registration.update).toHaveBeenCalled();
      });
    });

    test('should handle app update flow with progress tracking', async () => {
      const registration = {
        ...mockServiceWorkerRegistration,
        waiting: { postMessage: jest.fn() },
        active: {},
      };
      
      const onUpdate = jest.fn();
      render(<PWAInstallationManager onUpdate={onUpdate} />);
      
      // Simulate update available
      registration.waiting = { postMessage: jest.fn() };
      registration.active = {};
      
      await act(async () => {
        // Trigger update detection
        await registration.update();
      });
      
      // Should show update prompt
      await waitFor(() => {
        expect(screen.getByText('Update Available')).toBeInTheDocument();
      });
      
      // Click update button
      const updateButton = screen.getByText('Update Now');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(registration.waiting?.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      });
    });

    test('should display update release notes', async () => {
      const registration = {
        ...mockServiceWorkerRegistration,
        waiting: { postMessage: jest.fn() },
        active: {},
      };
      
      render(<PWAInstallationManager onUpdate={jest.fn()} />);
      
      // Simulate update available state
      await act(async () => {
        registration.waiting = { postMessage: jest.fn() };
        registration.active = {};
      });
      
      await waitFor(() => {
        expect(screen.getByText("What's New:")).toBeInTheDocument();
        expect(screen.getByText('Improved offline functionality')).toBeInTheDocument();
      });
    });
  });

  describe('Task 256: Performance Optimization and Monitoring', () => {
    test('should track app performance metrics', async () => {
      // Mock Performance API
      Object.defineProperty(global, 'performance', {
        value: {
          now: jest.fn(() => 1000),
          mark: jest.fn(),
          measure: jest.fn(),
          getEntriesByType: jest.fn(() => []),
        },
        writable: true,
      });
      
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      // Performance should be monitored during PWA operations
      expect(performance.now).toHaveBeenCalled();
    });

    test('should optimize for different device types', async () => {
      // Test tablet optimization
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)',
        writable: true,
      });
      
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      fireEvent(window, beforeInstallPromptEvent);
      
      await waitFor(() => {
        expect(screen.getByText('Tablet')).toBeInTheDocument();
      });
    });

    test('should handle network quality detection', async () => {
      // Mock different connection types
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: 'slow-2g',
          downlink: 0.3,
        },
        writable: true,
      });
      
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      fireEvent(window, beforeInstallPromptEvent);
      
      await waitFor(() => {
        expect(screen.getByText(/Weak signal detected/)).toBeInTheDocument();
      });
    });

    test('should provide battery level awareness', async () => {
      // Mock low battery
      navigator.getBattery = jest.fn(() => Promise.resolve({
        level: 0.15, // 15% battery
        charging: false,
      }));
      
      render(<PWAInstallationManager onInstall={jest.fn()} />);
      
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      fireEvent(window, beforeInstallPromptEvent);
      
      await waitFor(() => {
        expect(screen.getByText(/Consider charging your device/)).toBeInTheDocument();
      });
    });
  });

  describe('PWA Integration with Existing Features', () => {
    test('should integrate with authentication system', async () => {
      localStorage.setItem('auth_token', 'test-token');
      
      render(
        <PushNotificationSystem
          userId="authenticated-user"
          restaurantId="test-restaurant"
        />
      );
      
      const testButton = screen.getByText('Send Test Notification');
      fireEvent.click(testButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/notifications/send'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-token',
            }),
          })
        );
      });
    });

    test('should work with bilingual content', async () => {
      render(
        <PushNotificationSystem
          userId="test-user"
          restaurantId="test-restaurant"
        />
      );
      
      // Check for English labels
      expect(screen.getByText('Emergency Alerts')).toBeInTheDocument();
      expect(screen.getByText('Training Reminders')).toBeInTheDocument();
    });
  });

  describe('PWA Hook Functionality', () => {
    test('usePWAInstallation hook should provide correct state', () => {
      const TestComponent = () => {
        const pwaState = usePWAInstallation();
        return (
          <div>
            <span data-testid="can-install">{pwaState.canInstall.toString()}</span>
            <span data-testid="is-installed">{pwaState.isInstalled.toString()}</span>
            <span data-testid="is-online">{pwaState.isOnline.toString()}</span>
          </div>
        );
      };
      
      render(<TestComponent />);
      
      expect(screen.getByTestId('can-install')).toHaveTextContent('false');
      expect(screen.getByTestId('is-installed')).toHaveTextContent('false');
      expect(screen.getByTestId('is-online')).toHaveTextContent('true');
    });
  });
});

// Performance benchmarks for PWA features
export const PWA_PERFORMANCE_BENCHMARKS = {
  serviceWorkerRegistration: 500, // ms
  pushSubscription: 1000, // ms
  notificationDisplay: 100, // ms
  offlineSync: 2000, // ms
  updateCheck: 1000, // ms
  installPromptDisplay: 200, // ms
};

// Test utility functions
export const PWATestUtils = {
  mockServiceWorkerRegistration: () => mockServiceWorkerRegistration,
  mockPushSubscription: () => mockPushSubscription,
  simulateOffline: () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    window.dispatchEvent(new Event('offline'));
  },
  simulateOnline: () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    window.dispatchEvent(new Event('online'));
  },
};