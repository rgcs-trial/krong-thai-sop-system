import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types for global state
interface GlobalState {
  // UI State
  isLoading: boolean;
  isSidebarOpen: boolean;
  currentTheme: 'light' | 'dark';
  
  // User Preferences
  language: 'en' | 'fr';
  tabletMode: boolean;
  offlineMode: boolean;
  
  // Navigation State
  currentPage: string;
  breadcrumbs: Array<{ id: string; label: string; href: string }>;
  
  // Notification State
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
  }>;
  
  // Connection State
  isOnline: boolean;
  lastSyncTime: number | null;
  
  // Actions
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setLanguage: (language: 'en' | 'fr') => void;
  setCurrentPage: (page: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ id: string; label: string; href: string }>) => void;
  addNotification: (notification: Omit<GlobalState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setOnlineStatus: (online: boolean) => void;
  updateLastSyncTime: () => void;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      isLoading: false,
      isSidebarOpen: false,
      currentTheme: 'light',
      language: 'en',
      tabletMode: true, // Default to tablet mode for restaurant environment
      offlineMode: false,
      currentPage: '/',
      breadcrumbs: [],
      notifications: [],
      isOnline: true,
      lastSyncTime: null,

      // Actions
      setLoading: (loading: boolean) =>
        set((state) => {
          state.isLoading = loading;
        }),

      toggleSidebar: () =>
        set((state) => {
          state.isSidebarOpen = !state.isSidebarOpen;
        }),

      setLanguage: (language: 'en' | 'fr') =>
        set((state) => {
          state.language = language;
        }),

      setCurrentPage: (page: string) =>
        set((state) => {
          state.currentPage = page;
        }),

      setBreadcrumbs: (breadcrumbs) =>
        set((state) => {
          state.breadcrumbs = breadcrumbs;
        }),

      addNotification: (notification) =>
        set((state) => {
          const newNotification = {
            ...notification,
            id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
          };
          state.notifications.push(newNotification);
          
          // Auto-remove after 5 seconds for non-error notifications
          if (notification.type !== 'error') {
            setTimeout(() => {
              const currentState = get();
              currentState.removeNotification(newNotification.id);
            }, 5000);
          }
        }),

      removeNotification: (id: string) =>
        set((state) => {
          state.notifications = state.notifications.filter((n: any) => n.id !== id);
        }),

      clearNotifications: () =>
        set((state) => {
          state.notifications = [];
        }),

      setOnlineStatus: (online: boolean) =>
        set((state) => {
          state.isOnline = online;
          state.offlineMode = !online;
        }),

      updateLastSyncTime: () =>
        set((state) => {
          state.lastSyncTime = Date.now();
        }),
    })),
    {
      name: 'krong-thai-global-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        tabletMode: state.tabletMode,
        currentTheme: state.currentTheme,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// Selector hooks for better performance
export const useLoading = () => useGlobalStore((state) => state.isLoading);
export const useLanguage = () => useGlobalStore((state) => state.language);
export const useBreadcrumbs = () => useGlobalStore((state) => state.breadcrumbs);
export const useNotifications = () => useGlobalStore((state) => state.notifications);
export const useOnlineStatus = () => useGlobalStore((state) => state.isOnline);
export const useTabletMode = () => useGlobalStore((state) => state.tabletMode);