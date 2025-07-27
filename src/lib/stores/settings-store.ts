/**
 * Settings Store for Restaurant Krong Thai SOP Management System
 * Zustand store for managing language preferences, theme, and offline data
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { BilingualContent, ApiResponse } from '@/types/database';

// Types
export interface AppSettings {
  // Language and localization
  language: 'en' | 'th' | 'fr';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  timezone: string;
  currency: 'THB' | 'USD';
  numberFormat: 'thai' | 'international';
  
  // Appearance
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  compactMode: boolean;
  highContrast: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  
  // Tablet-specific settings
  screenOrientation: 'auto' | 'portrait' | 'landscape';
  gestureNavigation: boolean;
  touchSensitivity: 'low' | 'normal' | 'high';
  hapticFeedback: boolean;
  
  // Content preferences
  showTranslations: boolean;
  defaultView: 'list' | 'grid' | 'cards';
  itemsPerPage: 10 | 20 | 50 | 100;
  autoPlayVideos: boolean;
  showThumbnails: boolean;
  
  // Offline and sync
  offlineMode: boolean;
  autoDownload: boolean;
  downloadQuality: 'low' | 'medium' | 'high';
  maxOfflineStorage: number; // in MB
  syncFrequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  syncOnWiFiOnly: boolean;
  
  // Notifications
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  reminderNotifications: boolean;
  updateNotifications: boolean;
  assessmentReminders: boolean;
  certificateExpiry: boolean;
  
  // Privacy and security
  biometricAuth: boolean;
  autoLock: boolean;
  autoLockDelay: 1 | 5 | 10 | 30; // minutes
  hideContent: boolean;
  clearCacheOnExit: boolean;
  
  // Performance
  cacheSize: number; // in MB
  imageCompression: boolean;
  preloadContent: boolean;
  backgroundSync: boolean;
  lowDataMode: boolean;
  
  // Accessibility
  screenReader: boolean;
  voiceOver: boolean;
  reduceMotion: boolean;
  largeButtons: boolean;
  simplifiedNavigation: boolean;
}

export interface UserPreferences {
  // Dashboard customization
  dashboardLayout: 'default' | 'compact' | 'detailed';
  favoriteCategories: string[];
  pinnedDocuments: string[];
  recentlyViewed: string[];
  
  // Language-specific preferences
  languagePreferences: {
    primaryLanguage: 'en' | 'th' | 'fr';
    secondaryLanguage?: 'en' | 'th' | 'fr';
    showTranslations: boolean;
    autoTranslate: boolean;
    translationQuality: 'fast' | 'balanced' | 'accurate';
    preferredLanguageForContent: 'auto' | 'en' | 'th' | 'fr';
    fallbackLanguage: 'en' | 'th' | 'fr';
  };
  
  // Content management preferences
  contentEditing: {
    defaultEditMode: 'single' | 'bilingual' | 'side-by-side';
    showTranslationHints: boolean;
    validateTranslations: boolean;
    requireBothLanguages: boolean;
    autoSaveInterval: number; // in seconds
  };
  
  // Search preferences
  searchHistory: string[];
  searchFilters: Record<string, any>;
  saveSearchHistory: boolean;
  searchLanguages: ('en' | 'th' | 'fr')[];
  
  // Training preferences
  preferredLearningPath: string | null;
  studyReminders: {
    enabled: boolean;
    time: string; // HH:mm format
    days: number[]; // 0-6, Sunday=0
    sound: string | null;
  };
  assessmentSettings: {
    showTimer: boolean;
    confirmSubmission: boolean;
    reviewIncorrect: boolean;
  };
  
  // Content filtering
  contentFilters: {
    difficulty: ('beginner' | 'intermediate' | 'advanced')[];
    categories: string[];
    tags: string[];
    showDrafts: boolean;
  };
  
  // Workspace customization
  toolbarLayout: string[];
  shortcuts: Record<string, string>;
  customColors: Record<string, string>;
}

export interface SystemSettings {
  // Application metadata
  version: string;
  lastUpdated: Date;
  buildNumber: string;
  
  // Feature flags
  features: Record<string, boolean>;
  
  // Performance monitoring
  performanceMode: 'auto' | 'performance' | 'battery';
  analyticsEnabled: boolean;
  crashReporting: boolean;
  
  // Device information
  deviceInfo: {
    model: string;
    os: string;
    version: string;
    memory: number;
    storage: number;
  };
  
  // Network settings
  networkMode: 'auto' | 'offline' | 'online';
  dataUsage: {
    total: number;
    thisMonth: number;
    limit: number | null;
  };
}

export interface SettingsState {
  // Core settings
  app: AppSettings;
  user: UserPreferences;
  system: SystemSettings;
  
  // State management
  isLoading: boolean;
  loadingStates: Record<string, boolean>;
  hasUnsavedChanges: boolean;
  lastSyncAt: Date | null;
  
  // Error handling
  error: string | null;
  errors: Record<string, string>;
  
  // Migration and versioning
  settingsVersion: string;
  migrationsApplied: string[];
  
  // Temporary settings (not persisted)
  temporary: {
    debugMode: boolean;
    testMode: boolean;
    previewMode: boolean;
  };
}

export interface SettingsActions {
  // App settings actions
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  resetAppSettings: () => Promise<void>;
  setLanguage: (language: 'en' | 'th' | 'fr') => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'auto') => Promise<void>;
  toggleOfflineMode: () => Promise<void>;
  
  // User preferences actions
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  resetUserPreferences: () => Promise<void>;
  addToFavorites: (categoryId: string) => void;
  removeFromFavorites: (categoryId: string) => void;
  pinDocument: (documentId: string) => void;
  unpinDocument: (documentId: string) => void;
  addToRecentlyViewed: (documentId: string) => void;
  clearRecentlyViewed: () => void;
  
  // Search preferences
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  updateSearchFilters: (filters: Record<string, any>) => void;
  
  // Study and training preferences
  updateStudyReminders: (reminders: UserPreferences['studyReminders']) => Promise<void>;
  updateAssessmentSettings: (settings: UserPreferences['assessmentSettings']) => void;
  setPreferredLearningPath: (pathId: string | null) => void;
  
  // System settings actions
  updateSystemSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  updateDeviceInfo: () => Promise<void>;
  toggleFeature: (feature: string, enabled: boolean) => void;
  updateNetworkMode: (mode: 'auto' | 'offline' | 'online') => void;
  
  // Data management
  exportSettings: () => Promise<Blob>;
  importSettings: (data: any) => Promise<boolean>;
  syncSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  
  // Cache and storage management
  clearCache: (type?: 'all' | 'images' | 'documents' | 'data') => Promise<void>;
  getStorageUsage: () => Promise<{ used: number; available: number; total: number }>;
  optimizeStorage: () => Promise<void>;
  
  // Backup and restore
  createBackup: () => Promise<string>;
  restoreFromBackup: (backupData: string) => Promise<boolean>;
  
  // Migration
  migrateSettings: (fromVersion: string, toVersion: string) => Promise<void>;
  applyMigration: (migrationId: string) => Promise<void>;
  
  // Performance and monitoring
  updatePerformanceMode: (mode: 'auto' | 'performance' | 'battery') => void;
  getPerformanceMetrics: () => Promise<any>;
  clearPerformanceData: () => void;
  
  // Accessibility
  updateAccessibilitySettings: (settings: Partial<Pick<AppSettings, 'screenReader' | 'voiceOver' | 'reduceMotion' | 'largeButtons' | 'simplifiedNavigation'>>) => Promise<void>;
  enableHighContrast: () => Promise<void>;
  disableHighContrast: () => Promise<void>;
  
  // Error handling
  setError: (key: string, error: string) => void;
  clearError: (key?: string) => void;
  setLoading: (key: string, loading: boolean) => void;
  
  // Reset and initialization
  resetAllSettings: () => Promise<void>;
  initializeSettings: () => Promise<void>;
  
  // Temporary settings
  setDebugMode: (enabled: boolean) => void;
  setTestMode: (enabled: boolean) => void;
  setPreviewMode: (enabled: boolean) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

// Default settings
const defaultAppSettings: AppSettings = {
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  timezone: 'Asia/Bangkok',
  currency: 'THB',
  numberFormat: 'thai',
  theme: 'light',
  fontSize: 'medium',
  compactMode: false,
  highContrast: false,
  colorBlindMode: 'none',
  screenOrientation: 'auto',
  gestureNavigation: true,
  touchSensitivity: 'normal',
  hapticFeedback: true,
  showTranslations: true,
  defaultView: 'cards',
  itemsPerPage: 20,
  autoPlayVideos: false,
  showThumbnails: true,
  offlineMode: false,
  autoDownload: false,
  downloadQuality: 'medium',
  maxOfflineStorage: 1024, // 1GB
  syncFrequency: 'daily',
  syncOnWiFiOnly: true,
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  reminderNotifications: true,
  updateNotifications: true,
  assessmentReminders: true,
  certificateExpiry: true,
  biometricAuth: false,
  autoLock: true,
  autoLockDelay: 10,
  hideContent: false,
  clearCacheOnExit: false,
  cacheSize: 256, // 256MB
  imageCompression: true,
  preloadContent: true,
  backgroundSync: true,
  lowDataMode: false,
  screenReader: false,
  voiceOver: false,
  reduceMotion: false,
  largeButtons: false,
  simplifiedNavigation: false,
};

const defaultUserPreferences: UserPreferences = {
  dashboardLayout: 'default',
  favoriteCategories: [],
  pinnedDocuments: [],
  recentlyViewed: [],
  searchHistory: [],
  searchFilters: {},
  saveSearchHistory: true,
  preferredLearningPath: null,
  studyReminders: {
    enabled: false,
    time: '09:00',
    days: [1, 2, 3, 4, 5], // Monday to Friday
    sound: null,
  },
  assessmentSettings: {
    showTimer: true,
    confirmSubmission: true,
    reviewIncorrect: true,
  },
  contentFilters: {
    difficulty: ['beginner', 'intermediate', 'advanced'],
    categories: [],
    tags: [],
    showDrafts: false,
  },
  toolbarLayout: ['home', 'search', 'favorites', 'profile'],
  shortcuts: {},
  customColors: {},
};

const defaultSystemSettings: SystemSettings = {
  version: '1.0.0',
  lastUpdated: new Date(),
  buildNumber: '1',
  features: {},
  performanceMode: 'auto',
  analyticsEnabled: true,
  crashReporting: true,
  deviceInfo: {
    model: 'Unknown',
    os: 'Unknown',
    version: 'Unknown',
    memory: 0,
    storage: 0,
  },
  networkMode: 'auto',
  dataUsage: {
    total: 0,
    thisMonth: 0,
    limit: null,
  },
};

// Initial state
const initialState: SettingsState = {
  app: defaultAppSettings,
  user: defaultUserPreferences,
  system: defaultSystemSettings,
  isLoading: false,
  loadingStates: {},
  hasUnsavedChanges: false,
  lastSyncAt: null,
  error: null,
  errors: {},
  settingsVersion: '1.0.0',
  migrationsApplied: [],
  temporary: {
    debugMode: false,
    testMode: false,
    previewMode: false,
  },
};

/**
 * Settings Store
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // App settings actions
      updateAppSettings: async (settings: Partial<AppSettings>): Promise<void> => {
        set((state) => {
          Object.assign(state.app, settings);
          state.hasUnsavedChanges = true;
        });

        try {
          const response = await fetch('/api/user/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app: settings }),
          });

          if (!response.ok) {
            throw new Error('Failed to save app settings');
          }

          set((state) => {
            state.hasUnsavedChanges = false;
            state.lastSyncAt = new Date();
          });
        } catch (error) {
          set((state) => {
            state.errors.appSettings = error instanceof Error ? error.message : 'Failed to save settings';
          });
        }
      },

      resetAppSettings: async (): Promise<void> => {
        set((state) => {
          state.app = { ...defaultAppSettings };
          state.hasUnsavedChanges = true;
        });
        
        await get().saveSettings();
      },

      setLanguage: async (language: 'en' | 'th' | 'fr'): Promise<void> => {
        await get().updateAppSettings({ language });
        
        // Apply language change immediately
        if (typeof document !== 'undefined') {
          document.documentElement.lang = language;
          
          // Add Thai language specific class for font rendering
          if (language === 'th') {
            document.documentElement.classList.add('lang-thai');
            document.documentElement.classList.remove('lang-french');
          } else if (language === 'fr') {
            document.documentElement.classList.add('lang-french');
            document.documentElement.classList.remove('lang-thai');
          } else {
            document.documentElement.classList.remove('lang-thai', 'lang-french');
          }
          
          // Set text direction attribute for future RTL support
          document.documentElement.dir = 'ltr'; // Thai is LTR, keeping for future expansion
        }
      },

      setTheme: async (theme: 'light' | 'dark' | 'auto'): Promise<void> => {
        await get().updateAppSettings({ theme });
        
        // Apply theme change immediately
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          
          if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
          } else {
            root.setAttribute('data-theme', theme);
          }
        }
      },

      toggleOfflineMode: async (): Promise<void> => {
        const currentMode = get().app.offlineMode;
        await get().updateAppSettings({ offlineMode: !currentMode });
      },

      // User preferences actions
      updateUserPreferences: async (preferences: Partial<UserPreferences>): Promise<void> => {
        set((state) => {
          Object.assign(state.user, preferences);
          state.hasUnsavedChanges = true;
        });

        try {
          const response = await fetch('/api/user/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences),
          });

          if (!response.ok) {
            throw new Error('Failed to save user preferences');
          }

          set((state) => {
            state.hasUnsavedChanges = false;
            state.lastSyncAt = new Date();
          });
        } catch (error) {
          set((state) => {
            state.errors.userPreferences = error instanceof Error ? error.message : 'Failed to save preferences';
          });
        }
      },

      resetUserPreferences: async (): Promise<void> => {
        set((state) => {
          state.user = { ...defaultUserPreferences };
          state.hasUnsavedChanges = true;
        });
        
        await get().saveSettings();
      },

      addToFavorites: (categoryId: string) => {
        set((state) => {
          if (!state.user.favoriteCategories.includes(categoryId)) {
            state.user.favoriteCategories.push(categoryId);
            state.hasUnsavedChanges = true;
          }
        });
      },

      removeFromFavorites: (categoryId: string) => {
        set((state) => {
          state.user.favoriteCategories = state.user.favoriteCategories.filter((id: string) => id !== categoryId);
          state.hasUnsavedChanges = true;
        });
      },

      pinDocument: (documentId: string) => {
        set((state) => {
          if (!state.user.pinnedDocuments.includes(documentId)) {
            state.user.pinnedDocuments.unshift(documentId);
            // Keep only last 10 pinned documents
            state.user.pinnedDocuments = state.user.pinnedDocuments.slice(0, 10);
            state.hasUnsavedChanges = true;
          }
        });
      },

      unpinDocument: (documentId: string) => {
        set((state) => {
          state.user.pinnedDocuments = state.user.pinnedDocuments.filter((id: string) => id !== documentId);
          state.hasUnsavedChanges = true;
        });
      },

      addToRecentlyViewed: (documentId: string) => {
        set((state) => {
          // Remove if already exists
          state.user.recentlyViewed = state.user.recentlyViewed.filter((id: string) => id !== documentId);
          // Add to beginning
          state.user.recentlyViewed.unshift(documentId);
          // Keep only last 20 items
          state.user.recentlyViewed = state.user.recentlyViewed.slice(0, 20);
        });
      },

      clearRecentlyViewed: () => {
        set((state) => {
          state.user.recentlyViewed = [];
          state.hasUnsavedChanges = true;
        });
      },

      // Search preferences
      addToSearchHistory: (query: string) => {
        if (!get().user.saveSearchHistory) return;
        
        set((state) => {
          const trimmedQuery = query.trim();
          if (!trimmedQuery) return;

          // Remove if already exists
          state.user.searchHistory = state.user.searchHistory.filter((q: string) => q !== trimmedQuery);
          // Add to beginning
          state.user.searchHistory.unshift(trimmedQuery);
          // Keep only last 20 searches
          state.user.searchHistory = state.user.searchHistory.slice(0, 20);
        });
      },

      clearSearchHistory: () => {
        set((state) => {
          state.user.searchHistory = [];
          state.hasUnsavedChanges = true;
        });
      },

      updateSearchFilters: (filters: Record<string, any>) => {
        set((state) => {
          state.user.searchFilters = filters;
          state.hasUnsavedChanges = true;
        });
      },

      // Study and training preferences
      updateStudyReminders: async (reminders: UserPreferences['studyReminders']): Promise<void> => {
        await get().updateUserPreferences({ studyReminders: reminders });
        
        // Schedule/cancel notifications based on settings
        if (reminders.enabled && 'Notification' in window) {
          // Request permission if needed
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
        }
      },

      updateAssessmentSettings: (settings: UserPreferences['assessmentSettings']) => {
        set((state) => {
          state.user.assessmentSettings = settings;
          state.hasUnsavedChanges = true;
        });
      },

      setPreferredLearningPath: (pathId: string | null) => {
        set((state) => {
          state.user.preferredLearningPath = pathId;
          state.hasUnsavedChanges = true;
        });
      },

      // System settings actions
      updateSystemSettings: async (settings: Partial<SystemSettings>): Promise<void> => {
        set((state) => {
          Object.assign(state.system, settings);
        });
      },

      updateDeviceInfo: async (): Promise<void> => {
        try {
          const deviceInfo = {
            model: navigator.userAgent,
            os: navigator.platform,
            version: navigator.appVersion,
            memory: (navigator as any).deviceMemory || 0,
            storage: 0,
          };

          // Try to get storage info
          if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            deviceInfo.storage = Math.round((estimate.quota || 0) / (1024 * 1024)); // Convert to MB
          }

          await get().updateSystemSettings({ deviceInfo });
        } catch (error) {
          console.error('Failed to update device info:', error);
        }
      },

      toggleFeature: (feature: string, enabled: boolean) => {
        set((state) => {
          state.system.features[feature] = enabled;
        });
      },

      updateNetworkMode: (mode: 'auto' | 'offline' | 'online') => {
        set((state) => {
          state.system.networkMode = mode;
        });
      },

      // Data management
      exportSettings: async (): Promise<Blob> => {
        const state = get();
        const exportData = {
          app: state.app,
          user: state.user,
          system: {
            ...state.system,
            // Exclude sensitive system info
            deviceInfo: undefined,
          },
          exportedAt: new Date().toISOString(),
          version: state.settingsVersion,
        };

        return new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
      },

      importSettings: async (data: any): Promise<boolean> => {
        try {
          // Validate import data
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid settings data');
          }

          set((state) => {
            if (data.app) {
              Object.assign(state.app, data.app);
            }
            if (data.user) {
              Object.assign(state.user, data.user);
            }
            state.hasUnsavedChanges = true;
          });

          await get().saveSettings();
          return true;
        } catch (error) {
          set((state) => {
            state.errors.import = error instanceof Error ? error.message : 'Failed to import settings';
          });
          return false;
        }
      },

      syncSettings: async (): Promise<void> => {
        try {
          set((state) => {
            state.loadingStates.sync = true;
          });

          const response = await fetch('/api/user/settings');
          const result: ApiResponse<{ app: AppSettings; user: UserPreferences }> = await response.json();

          if (result.success && result.data) {
            set((state) => {
              Object.assign(state.app, result.data!.app);
              Object.assign(state.user, result.data!.user);
              state.lastSyncAt = new Date();
              state.hasUnsavedChanges = false;
              state.loadingStates.sync = false;
            });
          }
        } catch (error) {
          set((state) => {
            state.errors.sync = error instanceof Error ? error.message : 'Failed to sync settings';
            state.loadingStates.sync = false;
          });
        }
      },

      loadSettings: async (): Promise<void> => {
        try {
          set((state) => {
            state.isLoading = true;
          });

          await get().syncSettings();
          await get().updateDeviceInfo();
          
          set((state) => {
            state.isLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to load settings';
            state.isLoading = false;
          });
        }
      },

      saveSettings: async (): Promise<void> => {
        if (!get().hasUnsavedChanges) return;

        try {
          const { app, user } = get();
          
          const response = await fetch('/api/user/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app, user }),
          });

          if (!response.ok) {
            throw new Error('Failed to save settings');
          }

          set((state) => {
            state.hasUnsavedChanges = false;
            state.lastSyncAt = new Date();
          });
        } catch (error) {
          set((state) => {
            state.errors.save = error instanceof Error ? error.message : 'Failed to save settings';
          });
        }
      },

      // Cache and storage management
      clearCache: async (type = 'all'): Promise<void> => {
        try {
          const response = await fetch('/api/cache/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type }),
          });

          if (!response.ok) {
            throw new Error('Failed to clear cache');
          }

          // Clear local storage caches
          if (type === 'all' || type === 'data') {
            localStorage.removeItem('krong-thai-sop');
            localStorage.removeItem('krong-thai-training');
            localStorage.removeItem('krong-thai-query-cache');
          }
        } catch (error) {
          set((state) => {
            state.errors.cache = error instanceof Error ? error.message : 'Failed to clear cache';
          });
        }
      },

      getStorageUsage: async (): Promise<{ used: number; available: number; total: number }> => {
        try {
          if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const used = estimate.usage || 0;
            const total = estimate.quota || 0;
            const available = total - used;

            return {
              used: Math.round(used / (1024 * 1024)), // Convert to MB
              available: Math.round(available / (1024 * 1024)),
              total: Math.round(total / (1024 * 1024)),
            };
          }
          
          return { used: 0, available: 0, total: 0 };
        } catch (error) {
          console.error('Failed to get storage usage:', error);
          return { used: 0, available: 0, total: 0 };
        }
      },

      optimizeStorage: async (): Promise<void> => {
        try {
          // Clear old cache data
          await get().clearCache('data');
          
          // Compress images if needed
          if (get().app.imageCompression) {
            // Implementation would compress cached images
          }
          
          // Remove old offline data
          const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          const cutoff = Date.now() - maxAge;
          
          // Clear old entries from localStorage
          Object.keys(localStorage).forEach(key => {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '');
              if (data.timestamp && data.timestamp < cutoff) {
                localStorage.removeItem(key);
              }
            } catch {
              // Ignore invalid JSON
            }
          });
        } catch (error) {
          set((state) => {
            state.errors.optimization = error instanceof Error ? error.message : 'Failed to optimize storage';
          });
        }
      },

      // Backup and restore
      createBackup: async (): Promise<string> => {
        const blob = await get().exportSettings();
        const text = await blob.text();
        return btoa(text); // Base64 encode
      },

      restoreFromBackup: async (backupData: string): Promise<boolean> => {
        try {
          const decoded = atob(backupData);
          const data = JSON.parse(decoded);
          return await get().importSettings(data);
        } catch (error) {
          set((state) => {
            state.errors.restore = error instanceof Error ? error.message : 'Failed to restore from backup';
          });
          return false;
        }
      },

      // Migration
      migrateSettings: async (fromVersion: string, toVersion: string): Promise<void> => {
        // Implementation would handle settings migration between versions
        console.log(`Migrating settings from ${fromVersion} to ${toVersion}`);
      },

      applyMigration: async (migrationId: string): Promise<void> => {
        set((state) => {
          if (!state.migrationsApplied.includes(migrationId)) {
            state.migrationsApplied.push(migrationId);
          }
        });
      },

      // Performance and monitoring
      updatePerformanceMode: (mode: 'auto' | 'performance' | 'battery') => {
        set((state) => {
          state.system.performanceMode = mode;
        });

        // Apply performance settings
        if (mode === 'battery') {
          get().updateAppSettings({
            backgroundSync: false,
            preloadContent: false,
            imageCompression: true,
            lowDataMode: true,
          });
        } else if (mode === 'performance') {
          get().updateAppSettings({
            backgroundSync: true,
            preloadContent: true,
            imageCompression: false,
            lowDataMode: false,
          });
        }
      },

      getPerformanceMetrics: async (): Promise<any> => {
        try {
          const response = await fetch('/api/performance/metrics');
          const result: ApiResponse = await response.json();
          return result.success ? result.data : null;
        } catch (error) {
          console.error('Failed to get performance metrics:', error);
          return null;
        }
      },

      clearPerformanceData: () => {
        // Clear performance-related local data
        localStorage.removeItem('performance-metrics');
      },

      // Accessibility
      updateAccessibilitySettings: async (settings: Partial<Pick<AppSettings, 'screenReader' | 'voiceOver' | 'reduceMotion' | 'largeButtons' | 'simplifiedNavigation'>>): Promise<void> => {
        await get().updateAppSettings(settings);
        
        // Apply accessibility changes to DOM
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          
          if (settings.reduceMotion !== undefined) {
            root.style.setProperty('--motion-preference', settings.reduceMotion ? 'reduce' : 'auto');
          }
          
          if (settings.largeButtons !== undefined) {
            root.classList.toggle('large-buttons', settings.largeButtons);
          }
          
          if (settings.simplifiedNavigation !== undefined) {
            root.classList.toggle('simplified-nav', settings.simplifiedNavigation);
          }
        }
      },

      enableHighContrast: async (): Promise<void> => {
        await get().updateAppSettings({ highContrast: true });
        
        if (typeof document !== 'undefined') {
          document.documentElement.classList.add('high-contrast');
        }
      },

      disableHighContrast: async (): Promise<void> => {
        await get().updateAppSettings({ highContrast: false });
        
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('high-contrast');
        }
      },

      // Error handling
      setError: (key: string, error: string) => {
        set((state) => {
          state.errors[key] = error;
        });
      },

      clearError: (key?: string) => {
        set((state) => {
          if (key) {
            delete state.errors[key];
          } else {
            state.errors = {};
            state.error = null;
          }
        });
      },

      setLoading: (key: string, loading: boolean) => {
        set((state) => {
          state.loadingStates[key] = loading;
        });
      },

      // Reset and initialization
      resetAllSettings: async (): Promise<void> => {
        set((state) => {
          state.app = { ...defaultAppSettings };
          state.user = { ...defaultUserPreferences };
          state.hasUnsavedChanges = true;
        });
        
        await get().saveSettings();
      },

      initializeSettings: async (): Promise<void> => {
        // Load settings from server or apply defaults
        await get().loadSettings();
        
        // Apply settings to DOM
        const { app } = get();
        
        if (typeof document !== 'undefined') {
          document.documentElement.lang = app.language;
          document.documentElement.setAttribute('data-theme', app.theme === 'auto' ? 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
            app.theme
          );
          
          if (app.highContrast) {
            document.documentElement.classList.add('high-contrast');
          }
          
          if (app.largeButtons) {
            document.documentElement.classList.add('large-buttons');
          }
          
          if (app.simplifiedNavigation) {
            document.documentElement.classList.add('simplified-nav');
          }
        }
      },

      // Temporary settings
      setDebugMode: (enabled: boolean) => {
        set((state) => {
          state.temporary.debugMode = enabled;
        });
      },

      setTestMode: (enabled: boolean) => {
        set((state) => {
          state.temporary.testMode = enabled;
        });
      },

      setPreviewMode: (enabled: boolean) => {
        set((state) => {
          state.temporary.previewMode = enabled;
        });
      },
    })),
    {
      name: 'krong-thai-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist most settings except temporary and system device info
        app: state.app,
        user: state.user,
        system: {
          ...state.system,
          deviceInfo: undefined, // Don't persist device info
        },
        settingsVersion: state.settingsVersion,
        migrationsApplied: state.migrationsApplied,
      }),
    }
  )
);

/**
 * Convenience hooks for easier component integration
 */

// Hook for app settings
export const useAppSettings = () => {
  const store = useSettingsStore();
  
  return {
    settings: store.app,
    updateSettings: store.updateAppSettings,
    resetSettings: store.resetAppSettings,
    setLanguage: store.setLanguage,
    setTheme: store.setTheme,
    toggleOfflineMode: store.toggleOfflineMode,
  };
};

// Hook for user preferences
export const useUserPreferences = () => {
  const store = useSettingsStore();
  
  return {
    preferences: store.user,
    updatePreferences: store.updateUserPreferences,
    resetPreferences: store.resetUserPreferences,
    addToFavorites: store.addToFavorites,
    removeFromFavorites: store.removeFromFavorites,
    pinDocument: store.pinDocument,
    unpinDocument: store.unpinDocument,
    addToRecentlyViewed: store.addToRecentlyViewed,
    clearRecentlyViewed: store.clearRecentlyViewed,
  };
};

// Hook for system settings
export const useSystemSettings = () => {
  const store = useSettingsStore();
  
  return {
    settings: store.system,
    updateSettings: store.updateSystemSettings,
    updateDeviceInfo: store.updateDeviceInfo,
    toggleFeature: store.toggleFeature,
    updateNetworkMode: store.updateNetworkMode,
    updatePerformanceMode: store.updatePerformanceMode,
  };
};

// Hook for accessibility settings
export const useAccessibilitySettings = () => {
  const store = useSettingsStore();
  
  return {
    settings: {
      screenReader: store.app.screenReader,
      voiceOver: store.app.voiceOver,
      reduceMotion: store.app.reduceMotion,
      largeButtons: store.app.largeButtons,
      simplifiedNavigation: store.app.simplifiedNavigation,
      highContrast: store.app.highContrast,
      colorBlindMode: store.app.colorBlindMode,
      fontSize: store.app.fontSize,
    },
    updateAccessibilitySettings: store.updateAccessibilitySettings,
    enableHighContrast: store.enableHighContrast,
    disableHighContrast: store.disableHighContrast,
  };
};

// Hook for data management
export const useDataManagement = () => {
  const store = useSettingsStore();
  
  return {
    hasUnsavedChanges: store.hasUnsavedChanges,
    lastSyncAt: store.lastSyncAt,
    exportSettings: store.exportSettings,
    importSettings: store.importSettings,
    syncSettings: store.syncSettings,
    saveSettings: store.saveSettings,
    clearCache: store.clearCache,
    getStorageUsage: store.getStorageUsage,
    optimizeStorage: store.optimizeStorage,
    createBackup: store.createBackup,
    restoreFromBackup: store.restoreFromBackup,
  };
};