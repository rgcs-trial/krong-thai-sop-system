/**
 * Authentication Store for Restaurant Krong Thai SOP Management System
 * Zustand store for managing authentication state and user sessions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// Security modules disabled during development
// import { Security } from '@/lib/security';
import { dbHelpers } from '@/lib/supabase';
// import type { SessionUser } from '@/lib/security';

// Temporary type definitions for disabled security module
interface SessionUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  full_name: string;
  restaurant_id: string;
}
import type { AuthUser } from '@/lib/supabase';

// Types
export interface AuthState {
  // User state
  user: SessionUser | null;
  userProfile: AuthUser | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Login state
  loginError: string | null;
  loginAttempts: number;
  isRateLimited: boolean;
  rateLimitRetryAfter: number | null;
  
  // Device state
  deviceId: string | null;
  deviceFingerprint: string | null;
  isNewDevice: boolean;
  
  // Session state
  sessionExpiresAt: Date | null;
  lastActivity: Date | null;
  autoRefreshEnabled: boolean;
}

export interface AuthActions {
  // Authentication actions
  login: (email: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  
  // Profile actions
  updateProfile: (updates: Partial<AuthUser>) => Promise<boolean>;
  loadUserProfile: () => Promise<void>;
  
  // Device actions
  generateDeviceFingerprint: () => Promise<string>;
  trustCurrentDevice: () => Promise<boolean>;
  getDeviceList: () => Promise<any[]>;
  
  // Session management
  updateLastActivity: () => void;
  enableAutoRefresh: () => void;
  disableAutoRefresh: () => void;
  checkSessionExpiry: () => boolean;
  
  // Error handling
  clearError: () => void;
  setError: (error: string) => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  
  // Reset state
  reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

// Initial state
const initialState: AuthState = {
  user: null,
  userProfile: null,
  sessionToken: null,
  isAuthenticated: false,
  isLoading: false,
  loginError: null,
  loginAttempts: 0,
  isRateLimited: false,
  rateLimitRetryAfter: null,
  deviceId: null,
  deviceFingerprint: null,
  isNewDevice: false,
  sessionExpiresAt: null,
  lastActivity: null,
  autoRefreshEnabled: true,
};

/**
 * Authentication Store
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Authentication actions
      login: async (email: string, pin: string): Promise<boolean> => {
        set({ isLoading: true, loginError: null });

        try {
          // Generate device fingerprint if not exists
          let fingerprint = get().deviceFingerprint;
          if (!fingerprint) {
            fingerprint = await get().generateDeviceFingerprint();
          }

          // Get request metadata
          const ipAddress = await getClientIpAddress();
          const userAgent = navigator.userAgent;

          // Attempt authentication via API
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              pin,
              deviceFingerprint: fingerprint,
            }),
          });

          const result = await response.json();

          if (result.success && result.user) {
            // Set authentication state
            set({
              user: result.user,
              sessionToken: 'cookie-based', // Session is now cookie-based
              isAuthenticated: true,
              sessionExpiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
              lastActivity: new Date(),
              loginError: null,
              loginAttempts: 0,
              isRateLimited: false,
              isLoading: false,
            });

            // Load full user profile
            await get().loadUserProfile();

            // Enable auto-refresh
            get().enableAutoRefresh();

            return true;
          } else {
            // Handle authentication failure
            const attempts = get().loginAttempts + 1;
            const isRateLimited = response.status === 429;
            const retryAfter = response.headers.get('Retry-After');
            
            set({
              loginError: result.error || 'Authentication failed',
              loginAttempts: attempts,
              isRateLimited,
              rateLimitRetryAfter: retryAfter ? parseInt(retryAfter) : null,
              isLoading: false,
            });

            return false;
          }

        } catch (error) {
          set({
            loginError: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          return false;
        }
      },

      logout: async (): Promise<void> => {
        set({ isLoading: true });

        try {
          // Call logout API
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });

          // Reset state
          get().reset();

        } catch (error) {
          console.error('Logout error:', error);
          // Even if logout fails, clear local state
          get().reset();
        }
      },

      refreshSession: async (): Promise<boolean> => {
        if (!get().isAuthenticated) return false;

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            set({
              sessionExpiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
              lastActivity: new Date(),
            });
            return true;
          }
          
          return false;

        } catch (error) {
          console.error('Session refresh error:', error);
          return false;
        }
      },

      // Profile actions
      updateProfile: async (updates: Partial<AuthUser>): Promise<boolean> => {
        const user = get().user;
        if (!user) return false;

        try {
          // This would typically make an API call to update the profile
          // For now, we'll simulate it
          console.log('Profile update:', updates);
          
          // Reload user profile after update
          await get().loadUserProfile();
          
          return true;

        } catch (error) {
          console.error('Profile update error:', error);
          return false;
        }
      },

      loadUserProfile: async (): Promise<void> => {
        const user = get().user;
        if (!user) return;

        try {
          const profile = await dbHelpers.getUserProfile(user.id);
          if (profile) {
            set({ userProfile: profile });
          }

        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      },

      // Device actions
      generateDeviceFingerprint: async (): Promise<string> => {
        try {
          const fingerprint = Security.Device.createFingerprint({
            screenWidth: screen.width,
            screenHeight: screen.height,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            touchSupport: 'ontouchstart' in window,
            canvasFingerprint: await generateCanvasFingerprint(),
            connectionType: (navigator as any).connection?.effectiveType,
          });

          const fingerprintHash = Security.Device.generateFingerprintHash(fingerprint);
          
          set({ deviceFingerprint: fingerprintHash });
          
          return fingerprintHash;

        } catch (error) {
          console.error('Error generating device fingerprint:', error);
          // Fallback to a simple fingerprint
          const simple = `${screen.width}x${screen.height}-${navigator.platform}-${Date.now()}`;
          const fallbackHash = btoa(simple);
          set({ deviceFingerprint: fallbackHash });
          return fallbackHash;
        }
      },

      trustCurrentDevice: async (): Promise<boolean> => {
        const deviceId = get().deviceId;
        if (!deviceId) return false;

        try {
          return await Security.Device.trustDevice(deviceId);
        } catch (error) {
          console.error('Error trusting device:', error);
          return false;
        }
      },

      getDeviceList: async (): Promise<any[]> => {
        const user = get().user;
        if (!user) return [];

        try {
          return await Security.Device.getUserDevices(user.id);
        } catch (error) {
          console.error('Error getting device list:', error);
          return [];
        }
      },

      // Session management
      updateLastActivity: (): void => {
        set({ lastActivity: new Date() });
      },

      enableAutoRefresh: (): void => {
        if (get().autoRefreshEnabled) return;

        set({ autoRefreshEnabled: true });

        // Set up auto-refresh interval (every 5 minutes)
        const refreshInterval = setInterval(async () => {
          const state = get();
          
          if (!state.autoRefreshEnabled || !state.isAuthenticated) {
            clearInterval(refreshInterval);
            return;
          }

          // Check if session is close to expiry (within 30 minutes)
          const expiresAt = state.sessionExpiresAt;
          if (expiresAt) {
            const timeUntilExpiry = expiresAt.getTime() - Date.now();
            const thirtyMinutes = 30 * 60 * 1000;

            if (timeUntilExpiry <= thirtyMinutes) {
              const refreshed = await state.refreshSession();
              if (!refreshed) {
                // Session couldn't be refreshed, logout
                await state.logout();
                clearInterval(refreshInterval);
              }
            }
          }
        }, 5 * 60 * 1000);
      },

      disableAutoRefresh: (): void => {
        set({ autoRefreshEnabled: false });
      },

      checkSessionExpiry: (): boolean => {
        const expiresAt = get().sessionExpiresAt;
        if (!expiresAt) return false;

        return expiresAt.getTime() <= Date.now();
      },

      // Error handling
      clearError: (): void => {
        set({ loginError: null, isRateLimited: false, rateLimitRetryAfter: null });
      },

      setError: (error: string): void => {
        set({ loginError: error });
      },

      // Loading states
      setLoading: (loading: boolean): void => {
        set({ isLoading: loading });
      },

      // Reset state
      reset: (): void => {
        set({
          ...initialState,
          // Keep device fingerprint across resets
          deviceFingerprint: get().deviceFingerprint,
        });
      },
    }),
    {
      name: 'krong-thai-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        deviceFingerprint: state.deviceFingerprint,
        lastActivity: state.lastActivity,
        // Don't persist sensitive session data
      }),
    }
  )
);

/**
 * Helper functions
 */

// Generate canvas fingerprint for device identification
async function generateCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'no-canvas';

    canvas.width = 200;
    canvas.height = 50;

    // Draw some text and shapes
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, 10, 50, 20);
    ctx.fillStyle = '#0000ff';
    ctx.fillText('Krong Thai SOP', 60, 15);

    // Get canvas data URL
    return canvas.toDataURL();

  } catch (error) {
    console.error('Canvas fingerprint error:', error);
    return 'canvas-error';
  }
}

// Get client IP address (best effort)
async function getClientIpAddress(): Promise<string> {
  try {
    // In production, you might have a proper endpoint for this
    // For now, we'll use a fallback
    return '127.0.0.1';
  } catch (error) {
    return '127.0.0.1';
  }
}

/**
 * Authentication hooks for easier component integration
 */

// Hook to get authentication status
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    user: store.user,
    userProfile: store.userProfile,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.loginError,
    login: store.login,
    logout: store.logout,
    clearError: store.clearError,
  };
};

// Hook for session management
export const useSession = () => {
  const store = useAuthStore();
  
  return {
    sessionToken: store.sessionToken,
    expiresAt: store.sessionExpiresAt,
    lastActivity: store.lastActivity,
    refreshSession: store.refreshSession,
    updateLastActivity: store.updateLastActivity,
    checkExpiry: store.checkSessionExpiry,
  };
};

// Hook for device management
export const useDevice = () => {
  const store = useAuthStore();
  
  return {
    deviceId: store.deviceId,
    fingerprint: store.deviceFingerprint,
    isNewDevice: store.isNewDevice,
    generateFingerprint: store.generateDeviceFingerprint,
    trustDevice: store.trustCurrentDevice,
    getDevices: store.getDeviceList,
  };
};