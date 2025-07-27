/**
 * UI Store for Restaurant Krong Thai SOP Management System
 * Zustand store for navigation state, loading states, and notifications
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface NavigationState {
  // Current navigation
  currentPath: string;
  previousPath: string | null;
  breadcrumbs: Array<{
    id: string;
    label: string;
    labelTh: string;
    path: string;
    icon?: string;
  }>;
  
  // Navigation history
  history: string[];
  canGoBack: boolean;
  canGoForward: boolean;
  
  // Sidebar and layout
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  
  // Modal and dialog states
  activeModal: string | null;
  activeDialog: string | null;
  modalData: Record<string, any>;
  dialogData: Record<string, any>;
  
  // Drawer states
  searchDrawerOpen: boolean;
  notificationDrawerOpen: boolean;
  settingsDrawerOpen: boolean;
  
  // Tab and panel states
  activeTabs: Record<string, string>; // panelId -> activeTabId
  collapsedPanels: string[];
  
  // Search state
  globalSearchOpen: boolean;
  searchQuery: string;
  searchFocused: boolean;
}

export interface LoadingState {
  // Global loading
  isLoading: boolean;
  loadingMessage: string | null;
  
  // Component-specific loading
  componentLoading: Record<string, boolean>;
  
  // Operation-specific loading
  operations: Record<string, {
    isLoading: boolean;
    progress?: number;
    message?: string;
    startTime?: Date;
  }>;
  
  // Request tracking
  pendingRequests: Set<string>;
  
  // Skeleton states
  showSkeletons: Record<string, boolean>;
}

export interface NotificationState {
  // Notifications list
  notifications: Notification[];
  
  // Unread counts
  unreadCount: number;
  unreadByType: Record<NotificationType, number>;
  
  // Settings
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  
  // Toast messages
  toasts: Toast[];
  
  // Alert banners
  alerts: Alert[];
}

export interface UITheme {
  // Color scheme
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  
  // Layout
  compactMode: boolean;
  sidebarWidth: number;
  
  // Typography
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  fontFamily: string;
  
  // Accessibility
  highContrast: boolean;
  reduceMotion: boolean;
  focusVisible: boolean;
}

export interface ViewportState {
  // Screen dimensions
  width: number;
  height: number;
  
  // Breakpoints
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Orientation
  orientation: 'portrait' | 'landscape';
  
  // Touch capabilities
  isTouchDevice: boolean;
  
  // Zoom level
  zoomLevel: number;
}

export interface InteractionState {
  // Touch and gesture state
  touchActive: boolean;
  gestureInProgress: boolean;
  
  // Keyboard navigation
  keyboardNavigation: boolean;
  focusedElement: string | null;
  
  // Drag and drop
  dragInProgress: boolean;
  dragData: any;
  
  // Selection state
  selectedItems: Set<string>;
  selectionMode: boolean;
  
  // Context menu
  contextMenuOpen: boolean;
  contextMenuPosition: { x: number; y: number } | null;
  contextMenuData: any;
}

// Notification types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  titleTh: string;
  message: string;
  messageTh: string;
  icon?: string;
  image?: string;
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
  data?: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  persistent: boolean;
  autoHide: boolean;
  hideAfter?: number; // milliseconds
}

export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'sop_update' 
  | 'training_reminder' 
  | 'assessment_due' 
  | 'certificate_expiry' 
  | 'system';

export interface NotificationAction {
  id: string;
  label: string;
  labelTh: string;
  action: () => void;
  primary?: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'maintenance';
  title: string;
  titleTh: string;
  message: string;
  messageTh: string;
  dismissible: boolean;
  persistent: boolean;
  actions?: Array<{
    label: string;
    labelTh: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  }>;
  startTime?: Date;
  endTime?: Date;
}

export interface UIState {
  // Core UI state
  navigation: NavigationState;
  loading: LoadingState;
  notifications: NotificationState;
  theme: UITheme;
  viewport: ViewportState;
  interaction: InteractionState;
  
  // Feature flags
  features: Record<string, boolean>;
  
  // Performance mode
  performanceMode: 'auto' | 'performance' | 'battery';
  
  // Debug mode
  debugMode: boolean;
  
  // Accessibility
  accessibilityMode: boolean;
  screenReaderActive: boolean;
}

export interface UIActions {
  // Navigation actions
  navigate: (path: string, options?: { replace?: boolean; state?: any }) => void;
  goBack: () => void;
  goForward: () => void;
  updateBreadcrumbs: (breadcrumbs: NavigationState['breadcrumbs']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileMenu: () => void;
  
  // Modal and dialog actions
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
  openDialog: (dialogId: string, data?: any) => void;
  closeDialog: () => void;
  
  // Drawer actions
  toggleSearchDrawer: () => void;
  toggleNotificationDrawer: () => void;
  toggleSettingsDrawer: () => void;
  
  // Tab and panel actions
  setActiveTab: (panelId: string, tabId: string) => void;
  togglePanel: (panelId: string) => void;
  
  // Search actions
  setGlobalSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchFocused: (focused: boolean) => void;
  
  // Loading actions
  setLoading: (loading: boolean, message?: string) => void;
  setComponentLoading: (componentId: string, loading: boolean) => void;
  startOperation: (operationId: string, message?: string) => void;
  updateOperation: (operationId: string, progress?: number, message?: string) => void;
  completeOperation: (operationId: string) => void;
  addPendingRequest: (requestId: string) => void;
  removePendingRequest: (requestId: string) => void;
  setSkeletonLoading: (componentId: string, loading: boolean) => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: (category?: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  
  // Toast actions
  showToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  
  // Alert actions
  showAlert: (alert: Omit<Alert, 'id'>) => void;
  hideAlert: (id: string) => void;
  clearAlerts: () => void;
  
  // Theme actions
  setTheme: (theme: Partial<UITheme>) => void;
  toggleThemeMode: () => void;
  setCompactMode: (compact: boolean) => void;
  
  // Viewport actions
  updateViewport: (viewport: Partial<ViewportState>) => void;
  setZoomLevel: (level: number) => void;
  
  // Interaction actions
  setTouchActive: (active: boolean) => void;
  setKeyboardNavigation: (active: boolean) => void;
  setFocusedElement: (elementId: string | null) => void;
  startDrag: (data: any) => void;
  endDrag: () => void;
  toggleSelection: (itemId: string) => void;
  setSelectionMode: (enabled: boolean) => void;
  clearSelection: () => void;
  showContextMenu: (position: { x: number; y: number }, data: any) => void;
  hideContextMenu: () => void;
  
  // Feature flags
  toggleFeature: (feature: string, enabled?: boolean) => void;
  
  // Performance and debug
  setPerformanceMode: (mode: 'auto' | 'performance' | 'battery') => void;
  setDebugMode: (enabled: boolean) => void;
  
  // Accessibility
  setAccessibilityMode: (enabled: boolean) => void;
  setScreenReaderActive: (active: boolean) => void;
  
  // Utility actions
  reset: () => void;
  clearTemporaryState: () => void;
}

export type UIStore = UIState & UIActions;

// Default states
const defaultNavigationState: NavigationState = {
  currentPath: '/',
  previousPath: null,
  breadcrumbs: [],
  history: ['/'],
  canGoBack: false,
  canGoForward: false,
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  activeModal: null,
  activeDialog: null,
  modalData: {},
  dialogData: {},
  searchDrawerOpen: false,
  notificationDrawerOpen: false,
  settingsDrawerOpen: false,
  activeTabs: {},
  collapsedPanels: [],
  globalSearchOpen: false,
  searchQuery: '',
  searchFocused: false,
};

const defaultLoadingState: LoadingState = {
  isLoading: false,
  loadingMessage: null,
  componentLoading: {},
  operations: {},
  pendingRequests: new Set(),
  showSkeletons: {},
};

const defaultNotificationState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  unreadByType: {
    info: 0,
    success: 0,
    warning: 0,
    error: 0,
    sop_update: 0,
    training_reminder: 0,
    assessment_due: 0,
    certificate_expiry: 0,
    system: 0,
  },
  notificationsEnabled: true,
  soundEnabled: true,
  toasts: [],
  alerts: [],
};

const defaultTheme: UITheme = {
  mode: 'light',
  primaryColor: '#E31B23',
  accentColor: '#D4AF37',
  compactMode: false,
  sidebarWidth: 280,
  fontSize: 'medium',
  fontFamily: 'Inter',
  highContrast: false,
  reduceMotion: false,
  focusVisible: true,
};

const defaultViewportState: ViewportState = {
  width: 1024,
  height: 768,
  isMobile: false,
  isTablet: true,
  isDesktop: false,
  orientation: 'landscape',
  isTouchDevice: true,
  zoomLevel: 1,
};

const defaultInteractionState: InteractionState = {
  touchActive: false,
  gestureInProgress: false,
  keyboardNavigation: false,
  focusedElement: null,
  dragInProgress: false,
  dragData: null,
  selectedItems: new Set(),
  selectionMode: false,
  contextMenuOpen: false,
  contextMenuPosition: null,
  contextMenuData: null,
};

// Initial state
const initialState: UIState = {
  navigation: defaultNavigationState,
  loading: defaultLoadingState,
  notifications: defaultNotificationState,
  theme: defaultTheme,
  viewport: defaultViewportState,
  interaction: defaultInteractionState,
  features: {},
  performanceMode: 'auto',
  debugMode: false,
  accessibilityMode: false,
  screenReaderActive: false,
};

/**
 * UI Store
 */
export const useUIStore = create<UIStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Navigation actions
      navigate: (path: string, options = {}) => {
        set((state) => {
          if (!options.replace) {
            state.navigation.history.push(path);
          }
          
          state.navigation.previousPath = state.navigation.currentPath;
          state.navigation.currentPath = path;
          state.navigation.canGoBack = state.navigation.history.length > 1;
        });
      },

      goBack: () => {
        const state = get();
        if (state.navigation.canGoBack) {
          set((state) => {
            const history = state.navigation.history;
            const currentIndex = history.indexOf(state.navigation.currentPath);
            const previousPath = history[currentIndex - 1];
            
            if (previousPath) {
              state.navigation.previousPath = state.navigation.currentPath;
              state.navigation.currentPath = previousPath;
              state.navigation.canGoForward = true;
            }
          });
        }
      },

      goForward: () => {
        const state = get();
        if (state.navigation.canGoForward) {
          set((state) => {
            const history = state.navigation.history;
            const currentIndex = history.indexOf(state.navigation.currentPath);
            const nextPath = history[currentIndex + 1];
            
            if (nextPath) {
              state.navigation.previousPath = state.navigation.currentPath;
              state.navigation.currentPath = nextPath;
              state.navigation.canGoBack = true;
              state.navigation.canGoForward = currentIndex + 1 < history.length - 1;
            }
          });
        }
      },

      updateBreadcrumbs: (breadcrumbs) => {
        set((state) => {
          state.navigation.breadcrumbs = breadcrumbs;
        });
      },

      toggleSidebar: () => {
        set((state) => {
          state.navigation.sidebarOpen = !state.navigation.sidebarOpen;
        });
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set((state) => {
          state.navigation.sidebarCollapsed = collapsed;
        });
      },

      toggleMobileMenu: () => {
        set((state) => {
          state.navigation.mobileMenuOpen = !state.navigation.mobileMenuOpen;
        });
      },

      // Modal and dialog actions
      openModal: (modalId: string, data = {}) => {
        set((state) => {
          state.navigation.activeModal = modalId;
          state.navigation.modalData = data;
        });
      },

      closeModal: () => {
        set((state) => {
          state.navigation.activeModal = null;
          state.navigation.modalData = {};
        });
      },

      openDialog: (dialogId: string, data = {}) => {
        set((state) => {
          state.navigation.activeDialog = dialogId;
          state.navigation.dialogData = data;
        });
      },

      closeDialog: () => {
        set((state) => {
          state.navigation.activeDialog = null;
          state.navigation.dialogData = {};
        });
      },

      // Drawer actions
      toggleSearchDrawer: () => {
        set((state) => {
          state.navigation.searchDrawerOpen = !state.navigation.searchDrawerOpen;
        });
      },

      toggleNotificationDrawer: () => {
        set((state) => {
          state.navigation.notificationDrawerOpen = !state.navigation.notificationDrawerOpen;
        });
      },

      toggleSettingsDrawer: () => {
        set((state) => {
          state.navigation.settingsDrawerOpen = !state.navigation.settingsDrawerOpen;
        });
      },

      // Tab and panel actions
      setActiveTab: (panelId: string, tabId: string) => {
        set((state) => {
          state.navigation.activeTabs[panelId] = tabId;
        });
      },

      togglePanel: (panelId: string) => {
        set((state) => {
          const collapsed = state.navigation.collapsedPanels;
          const index = collapsed.indexOf(panelId);
          
          if (index >= 0) {
            collapsed.splice(index, 1);
          } else {
            collapsed.push(panelId);
          }
        });
      },

      // Search actions
      setGlobalSearchOpen: (open: boolean) => {
        set((state) => {
          state.navigation.globalSearchOpen = open;
        });
      },

      setSearchQuery: (query: string) => {
        set((state) => {
          state.navigation.searchQuery = query;
        });
      },

      setSearchFocused: (focused: boolean) => {
        set((state) => {
          state.navigation.searchFocused = focused;
        });
      },

      // Loading actions
      setLoading: (loading: boolean, message?: string) => {
        set((state) => {
          state.loading.isLoading = loading;
          state.loading.loadingMessage = message || null;
        });
      },

      setComponentLoading: (componentId: string, loading: boolean) => {
        set((state) => {
          if (loading) {
            state.loading.componentLoading[componentId] = true;
          } else {
            delete state.loading.componentLoading[componentId];
          }
        });
      },

      startOperation: (operationId: string, message?: string) => {
        set((state) => {
          state.loading.operations[operationId] = {
            isLoading: true,
            progress: 0,
            message,
            startTime: new Date(),
          };
        });
      },

      updateOperation: (operationId: string, progress?: number, message?: string) => {
        set((state) => {
          const operation = state.loading.operations[operationId];
          if (operation) {
            if (progress !== undefined) operation.progress = progress;
            if (message !== undefined) operation.message = message;
          }
        });
      },

      completeOperation: (operationId: string) => {
        set((state) => {
          delete state.loading.operations[operationId];
        });
      },

      addPendingRequest: (requestId: string) => {
        set((state) => {
          state.loading.pendingRequests.add(requestId);
        });
      },

      removePendingRequest: (requestId: string) => {
        set((state) => {
          state.loading.pendingRequests.delete(requestId);
        });
      },

      setSkeletonLoading: (componentId: string, loading: boolean) => {
        set((state) => {
          if (loading) {
            state.loading.showSkeletons[componentId] = true;
          } else {
            delete state.loading.showSkeletons[componentId];
          }
        });
      },

      // Notification actions
      addNotification: (notification) => {
        const id = crypto.randomUUID();
        const fullNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date(),
        };

        set((state) => {
          state.notifications.notifications.unshift(fullNotification);
          
          // Update unread counts
          if (!fullNotification.read) {
            state.notifications.unreadCount++;
            state.notifications.unreadByType[fullNotification.type]++;
          }
          
          // Limit notifications list
          if (state.notifications.notifications.length > 100) {
            state.notifications.notifications = state.notifications.notifications.slice(0, 100);
          }
        });

        // Auto-hide notification if specified
        if (notification.autoHide && notification.hideAfter) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.hideAfter);
        }
      },

      removeNotification: (id: string) => {
        set((state) => {
          const index = state.notifications.notifications.findIndex((n: any) => n.id === id);
          if (index >= 0) {
            const notification = state.notifications.notifications[index];
            
            // Update unread counts
            if (!notification.read) {
              state.notifications.unreadCount--;
              state.notifications.unreadByType[notification.type]--;
            }
            
            state.notifications.notifications.splice(index, 1);
          }
        });
      },

      markNotificationRead: (id: string) => {
        set((state) => {
          const notification = state.notifications.notifications.find((n: any) => n.id === id);
          if (notification && !notification.read) {
            notification.read = true;
            state.notifications.unreadCount--;
            state.notifications.unreadByType[notification.type]--;
          }
        });
      },

      markAllNotificationsRead: () => {
        set((state) => {
          state.notifications.notifications.forEach((notification: any) => {
            notification.read = true;
          });
          
          state.notifications.unreadCount = 0;
          Object.keys(state.notifications.unreadByType).forEach(type => {
            state.notifications.unreadByType[type as NotificationType] = 0;
          });
        });
      },

      clearNotifications: (category?: string) => {
        set((state) => {
          if (category) {
            state.notifications.notifications = state.notifications.notifications.filter(
              n => n.category !== category
            );
          } else {
            state.notifications.notifications = [];
          }
          
          // Recalculate unread counts
          let unreadCount = 0;
          const unreadByType: Record<NotificationType, number> = {
            info: 0,
            success: 0,
            warning: 0,
            error: 0,
            sop_update: 0,
            training_reminder: 0,
            assessment_due: 0,
            certificate_expiry: 0,
            system: 0,
          };
          
          state.notifications.notifications.forEach((notification: any) => {
            if (!notification.read) {
              unreadCount++;
              unreadByType[notification.type]++;
            }
          });
          
          state.notifications.unreadCount = unreadCount;
          state.notifications.unreadByType = unreadByType;
        });
      },

      setNotificationsEnabled: (enabled: boolean) => {
        set((state) => {
          state.notifications.notificationsEnabled = enabled;
        });
      },

      setSoundEnabled: (enabled: boolean) => {
        set((state) => {
          state.notifications.soundEnabled = enabled;
        });
      },

      // Toast actions
      showToast: (toast) => {
        const id = crypto.randomUUID();
        const fullToast: Toast = {
          ...toast,
          id,
          timestamp: new Date(),
        };

        set((state) => {
          state.notifications.toasts.push(fullToast);
        });

        // Auto-hide toast
        const duration = toast.duration || 5000;
        if (!toast.persistent) {
          setTimeout(() => {
            get().hideToast(id);
          }, duration);
        }
      },

      hideToast: (id: string) => {
        set((state) => {
          const index = state.notifications.toasts.findIndex((t: any) => t.id === id);
          if (index >= 0) {
            state.notifications.toasts.splice(index, 1);
          }
        });
      },

      clearToasts: () => {
        set((state) => {
          state.notifications.toasts = [];
        });
      },

      // Alert actions
      showAlert: (alert) => {
        const id = crypto.randomUUID();
        const fullAlert: Alert = {
          ...alert,
          id,
        };

        set((state) => {
          state.notifications.alerts.push(fullAlert);
        });
      },

      hideAlert: (id: string) => {
        set((state) => {
          const index = state.notifications.alerts.findIndex(a => a.id === id);
          if (index >= 0) {
            state.notifications.alerts.splice(index, 1);
          }
        });
      },

      clearAlerts: () => {
        set((state) => {
          state.notifications.alerts = [];
        });
      },

      // Theme actions
      setTheme: (theme: Partial<UITheme>) => {
        set((state) => {
          Object.assign(state.theme, theme);
        });
      },

      toggleThemeMode: () => {
        set((state) => {
          const modes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
          const currentIndex = modes.indexOf(state.theme.mode);
          const nextIndex = (currentIndex + 1) % modes.length;
          state.theme.mode = modes[nextIndex];
        });
      },

      setCompactMode: (compact: boolean) => {
        set((state) => {
          state.theme.compactMode = compact;
        });
      },

      // Viewport actions
      updateViewport: (viewport: Partial<ViewportState>) => {
        set((state) => {
          Object.assign(state.viewport, viewport);
          
          // Update breakpoints
          const width = state.viewport.width;
          state.viewport.isMobile = width < 768;
          state.viewport.isTablet = width >= 768 && width < 1024;
          state.viewport.isDesktop = width >= 1024;
        });
      },

      setZoomLevel: (level: number) => {
        set((state) => {
          state.viewport.zoomLevel = Math.max(0.5, Math.min(3, level));
        });
      },

      // Interaction actions
      setTouchActive: (active: boolean) => {
        set((state) => {
          state.interaction.touchActive = active;
        });
      },

      setKeyboardNavigation: (active: boolean) => {
        set((state) => {
          state.interaction.keyboardNavigation = active;
        });
      },

      setFocusedElement: (elementId: string | null) => {
        set((state) => {
          state.interaction.focusedElement = elementId;
        });
      },

      startDrag: (data: any) => {
        set((state) => {
          state.interaction.dragInProgress = true;
          state.interaction.dragData = data;
        });
      },

      endDrag: () => {
        set((state) => {
          state.interaction.dragInProgress = false;
          state.interaction.dragData = null;
        });
      },

      toggleSelection: (itemId: string) => {
        set((state) => {
          if (state.interaction.selectedItems.has(itemId)) {
            state.interaction.selectedItems.delete(itemId);
          } else {
            state.interaction.selectedItems.add(itemId);
          }
        });
      },

      setSelectionMode: (enabled: boolean) => {
        set((state) => {
          state.interaction.selectionMode = enabled;
          if (!enabled) {
            state.interaction.selectedItems.clear();
          }
        });
      },

      clearSelection: () => {
        set((state) => {
          state.interaction.selectedItems.clear();
        });
      },

      showContextMenu: (position: { x: number; y: number }, data: any) => {
        set((state) => {
          state.interaction.contextMenuOpen = true;
          state.interaction.contextMenuPosition = position;
          state.interaction.contextMenuData = data;
        });
      },

      hideContextMenu: () => {
        set((state) => {
          state.interaction.contextMenuOpen = false;
          state.interaction.contextMenuPosition = null;
          state.interaction.contextMenuData = null;
        });
      },

      // Feature flags
      toggleFeature: (feature: string, enabled?: boolean) => {
        set((state) => {
          state.features[feature] = enabled !== undefined ? enabled : !state.features[feature];
        });
      },

      // Performance and debug
      setPerformanceMode: (mode: 'auto' | 'performance' | 'battery') => {
        set((state) => {
          state.performanceMode = mode;
        });
      },

      setDebugMode: (enabled: boolean) => {
        set((state) => {
          state.debugMode = enabled;
        });
      },

      // Accessibility
      setAccessibilityMode: (enabled: boolean) => {
        set((state) => {
          state.accessibilityMode = enabled;
        });
      },

      setScreenReaderActive: (active: boolean) => {
        set((state) => {
          state.screenReaderActive = active;
        });
      },

      // Utility actions
      reset: () => {
        set(initialState);
      },

      clearTemporaryState: () => {
        set((state) => {
          // Clear temporary state like selections, context menus, etc.
          state.interaction.selectedItems.clear();
          state.interaction.contextMenuOpen = false;
          state.interaction.contextMenuPosition = null;
          state.interaction.contextMenuData = null;
          state.navigation.activeModal = null;
          state.navigation.activeDialog = null;
          state.navigation.modalData = {};
          state.navigation.dialogData = {};
        });
      },
    })),
    {
      name: 'krong-thai-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist UI preferences and theme
        navigation: {
          sidebarCollapsed: state.navigation.sidebarCollapsed,
          activeTabs: state.navigation.activeTabs,
          collapsedPanels: state.navigation.collapsedPanels,
        },
        theme: state.theme,
        notifications: {
          notificationsEnabled: state.notifications.notificationsEnabled,
          soundEnabled: state.notifications.soundEnabled,
        },
        features: state.features,
        performanceMode: state.performanceMode,
        accessibilityMode: state.accessibilityMode,
      }),
    }
  )
);

/**
 * Convenience hooks for easier component integration
 */

// Hook for navigation state
export const useNavigation = () => {
  const store = useUIStore();
  
  return {
    currentPath: store.navigation.currentPath,
    breadcrumbs: store.navigation.breadcrumbs,
    canGoBack: store.navigation.canGoBack,
    canGoForward: store.navigation.canGoForward,
    sidebarOpen: store.navigation.sidebarOpen,
    sidebarCollapsed: store.navigation.sidebarCollapsed,
    navigate: store.navigate,
    goBack: store.goBack,
    goForward: store.goForward,
    updateBreadcrumbs: store.updateBreadcrumbs,
    toggleSidebar: store.toggleSidebar,
    setSidebarCollapsed: store.setSidebarCollapsed,
  };
};

// Hook for modal and dialog state
export const useModals = () => {
  const store = useUIStore();
  
  return {
    activeModal: store.navigation.activeModal,
    activeDialog: store.navigation.activeDialog,
    modalData: store.navigation.modalData,
    dialogData: store.navigation.dialogData,
    openModal: store.openModal,
    closeModal: store.closeModal,
    openDialog: store.openDialog,
    closeDialog: store.closeDialog,
  };
};

// Hook for loading states
export const useLoadingState = () => {
  const store = useUIStore();
  
  return {
    isLoading: store.loading.isLoading,
    loadingMessage: store.loading.loadingMessage,
    componentLoading: store.loading.componentLoading,
    operations: store.loading.operations,
    pendingRequests: store.loading.pendingRequests,
    setLoading: store.setLoading,
    setComponentLoading: store.setComponentLoading,
    startOperation: store.startOperation,
    updateOperation: store.updateOperation,
    completeOperation: store.completeOperation,
    setSkeletonLoading: store.setSkeletonLoading,
  };
};

// Hook for notifications
export const useNotifications = () => {
  const store = useUIStore();
  
  return {
    notifications: store.notifications.notifications,
    unreadCount: store.notifications.unreadCount,
    unreadByType: store.notifications.unreadByType,
    toasts: store.notifications.toasts,
    alerts: store.notifications.alerts,
    addNotification: store.addNotification,
    removeNotification: store.removeNotification,
    markNotificationRead: store.markNotificationRead,
    markAllNotificationsRead: store.markAllNotificationsRead,
    clearNotifications: store.clearNotifications,
    showToast: store.showToast,
    hideToast: store.hideToast,
    showAlert: store.showAlert,
    hideAlert: store.hideAlert,
  };
};

// Hook for theme
export const useTheme = () => {
  const store = useUIStore();
  
  return {
    theme: store.theme,
    setTheme: store.setTheme,
    toggleThemeMode: store.toggleThemeMode,
    setCompactMode: store.setCompactMode,
  };
};

// Hook for viewport
export const useViewport = () => {
  const store = useUIStore();
  
  return {
    viewport: store.viewport,
    updateViewport: store.updateViewport,
    setZoomLevel: store.setZoomLevel,
  };
};

// Hook for interactions
export const useInteractions = () => {
  const store = useUIStore();
  
  return {
    interaction: store.interaction,
    setTouchActive: store.setTouchActive,
    setKeyboardNavigation: store.setKeyboardNavigation,
    toggleSelection: store.toggleSelection,
    setSelectionMode: store.setSelectionMode,
    clearSelection: store.clearSelection,
    showContextMenu: store.showContextMenu,
    hideContextMenu: store.hideContextMenu,
  };
};