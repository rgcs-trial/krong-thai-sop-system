/**
 * Analytics Store
 * Central state management for all analytics data and operations
 * Handles data fetching, caching, and export functionality
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { exportAnalyticsReport, ExportOptions, ChartData } from '@/lib/analytics/export-utils';

// Types for analytics data
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
  target?: number;
  status?: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface SOPAnalytics {
  id: string;
  title: string;
  category: string;
  views: number;
  uniqueUsers: number;
  avgReadTime: number;
  completionRate: number;
  downloadCount: number;
  complianceScore: number;
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TrainingAnalytics {
  id: string;
  title: string;
  enrollments: number;
  completions: number;
  averageScore: number;
  certificates: number;
  roi: number;
  trend: 'up' | 'down' | 'stable';
}

export interface OperationalMetric {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  change: number;
  category: 'productivity' | 'quality' | 'compliance' | 'cost';
}

export interface SystemAlert {
  id: string;
  type: 'system' | 'performance' | 'security' | 'user';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  isResolved: boolean;
  acknowledgement?: {
    by: string;
    at: string;
    note?: string;
  };
}

export interface AnalyticsFilters {
  period: '1d' | '7d' | '30d' | '90d' | '1y';
  department: 'all' | 'kitchen' | 'service' | 'management';
  category: 'all' | string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface AnalyticsState {
  // Data
  executiveMetrics: AnalyticsMetric[];
  sopAnalytics: SOPAnalytics[];
  trainingAnalytics: TrainingAnalytics[];
  operationalMetrics: OperationalMetric[];
  systemAlerts: SystemAlert[];
  
  // UI State
  isLoading: boolean;
  filters: AnalyticsFilters;
  lastUpdated: string | null;
  
  // Actions
  setFilters: (filters: Partial<AnalyticsFilters>) => void;
  updatePeriod: (period: AnalyticsFilters['period']) => void;
  updateDepartment: (department: AnalyticsFilters['department']) => void;
  
  // Data Actions
  loadExecutiveMetrics: () => Promise<void>;
  loadSOPAnalytics: () => Promise<void>;
  loadTrainingAnalytics: () => Promise<void>;
  loadOperationalMetrics: () => Promise<void>;
  loadSystemAlerts: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  
  // Alert Actions
  acknowledgeAlert: (alertId: string, note?: string) => void;
  resolveAlert: (alertId: string) => void;
  
  // Export Actions
  exportData: (
    type: 'executive' | 'sop' | 'training' | 'operational',
    format: 'pdf' | 'excel' | 'csv',
    options?: Partial<ExportOptions>
  ) => void;
  
  // Utility Actions
  clearCache: () => void;
  setLoading: (loading: boolean) => void;
}

// Mock data generators
const generateMockExecutiveMetrics = (): AnalyticsMetric[] => [
  {
    id: 'total_revenue',
    name: 'Total Revenue',
    value: '฿125,430',
    change: 12.5,
    trend: 'up',
    target: 150000,
    status: 'good',
  },
  {
    id: 'sop_compliance',
    name: 'SOP Compliance',
    value: 94.2,
    change: 2.1,
    trend: 'up',
    unit: '%',
    target: 95,
    status: 'good',
  },
  {
    id: 'training_completion',
    name: 'Training Completion',
    value: 87.5,
    change: -1.3,
    trend: 'down',
    unit: '%',
    target: 90,
    status: 'warning',
  },
  {
    id: 'active_users',
    name: 'Active Users',
    value: 42,
    change: 5.2,
    trend: 'up',
    target: 50,
    status: 'good',
  },
];

const generateMockSOPAnalytics = (): SOPAnalytics[] => [
  {
    id: '1',
    title: 'Food Safety Guidelines',
    category: 'Food Safety',
    views: 1250,
    uniqueUsers: 48,
    avgReadTime: 12.5,
    completionRate: 87,
    downloadCount: 156,
    complianceScore: 94,
    trend: 'up',
    riskLevel: 'low',
  },
  {
    id: '2',
    title: 'Kitchen Equipment Operation',
    category: 'Kitchen Operations',
    views: 980,
    uniqueUsers: 35,
    avgReadTime: 15.2,
    completionRate: 92,
    downloadCount: 89,
    complianceScore: 96,
    trend: 'up',
    riskLevel: 'low',
  },
  {
    id: '3',
    title: 'Customer Service Standards',
    category: 'Customer Service',
    views: 875,
    uniqueUsers: 42,
    avgReadTime: 8.7,
    completionRate: 78,
    downloadCount: 67,
    complianceScore: 82,
    trend: 'down',
    riskLevel: 'medium',
  },
  {
    id: '4',
    title: 'Emergency Procedures',
    category: 'Emergency',
    views: 425,
    uniqueUsers: 28,
    avgReadTime: 6.3,
    completionRate: 65,
    downloadCount: 23,
    complianceScore: 71,
    trend: 'down',
    riskLevel: 'high',
  },
];

const generateMockTrainingAnalytics = (): TrainingAnalytics[] => [
  {
    id: '1',
    title: 'Food Safety Certification',
    enrollments: 45,
    completions: 38,
    averageScore: 92,
    certificates: 35,
    roi: 285,
    trend: 'up',
  },
  {
    id: '2',
    title: 'Customer Service Excellence',
    enrollments: 32,
    completions: 28,
    averageScore: 87,
    certificates: 26,
    roi: 195,
    trend: 'up',
  },
  {
    id: '3',
    title: 'Kitchen Operations',
    enrollments: 28,
    completions: 25,
    averageScore: 89,
    certificates: 24,
    roi: 167,
    trend: 'stable',
  },
];

const generateMockOperationalMetrics = (): OperationalMetric[] => [
  {
    id: 'order_accuracy',
    name: 'Order Accuracy',
    current: 94.2,
    target: 96.0,
    unit: '%',
    status: 'good',
    trend: 'up',
    change: 2.1,
    category: 'quality',
  },
  {
    id: 'service_time',
    name: 'Average Service Time',
    current: 8.5,
    target: 7.0,
    unit: 'min',
    status: 'warning',
    trend: 'down',
    change: -5.2,
    category: 'productivity',
  },
  {
    id: 'sop_compliance',
    name: 'SOP Compliance Rate',
    current: 87.3,
    target: 95.0,
    unit: '%',
    status: 'warning',
    trend: 'up',
    change: 3.8,
    category: 'compliance',
  },
];

const generateMockSystemAlerts = (): SystemAlert[] => [
  {
    id: '1',
    type: 'performance',
    severity: 'high',
    title: 'High Memory Usage',
    message: 'System memory usage is above 75% threshold',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    source: 'Main Server',
    isResolved: false,
  },
  {
    id: '2',
    type: 'user',
    severity: 'medium',
    title: 'Multiple Failed Logins',
    message: 'Multiple failed login attempts detected from IP 192.168.1.105',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    source: 'Authentication System',
    isResolved: false,
  },
  {
    id: '3',
    type: 'system',
    severity: 'info',
    title: 'Scheduled Backup Completed',
    message: 'Daily backup completed successfully at 2:00 AM',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source: 'Backup Service',
    isResolved: true,
  },
];

// Zustand store
export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      // Initial state
      executiveMetrics: [],
      sopAnalytics: [],
      trainingAnalytics: [],
      operationalMetrics: [],
      systemAlerts: [],
      isLoading: false,
      filters: {
        period: '30d',
        department: 'all',
        category: 'all',
      },
      lastUpdated: null,

      // Filter actions
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      updatePeriod: (period) => {
        set((state) => ({
          filters: { ...state.filters, period },
        }));
      },

      updateDepartment: (department) => {
        set((state) => ({
          filters: { ...state.filters, department },
        }));
      },

      // Data loading actions
      loadExecutiveMetrics: async () => {
        set({ isLoading: true });
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          const metrics = generateMockExecutiveMetrics();
          set({ 
            executiveMetrics: metrics,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to load executive metrics:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadSOPAnalytics: async () => {
        set({ isLoading: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const analytics = generateMockSOPAnalytics();
          set({ 
            sopAnalytics: analytics,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to load SOP analytics:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadTrainingAnalytics: async () => {
        set({ isLoading: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const analytics = generateMockTrainingAnalytics();
          set({ 
            trainingAnalytics: analytics,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to load training analytics:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadOperationalMetrics: async () => {
        set({ isLoading: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const metrics = generateMockOperationalMetrics();
          set({ 
            operationalMetrics: metrics,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to load operational metrics:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadSystemAlerts: async () => {
        set({ isLoading: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          const alerts = generateMockSystemAlerts();
          set({ 
            systemAlerts: alerts,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to load system alerts:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      refreshAllData: async () => {
        const { 
          loadExecutiveMetrics, 
          loadSOPAnalytics, 
          loadTrainingAnalytics, 
          loadOperationalMetrics, 
          loadSystemAlerts 
        } = get();
        
        set({ isLoading: true });
        try {
          await Promise.all([
            loadExecutiveMetrics(),
            loadSOPAnalytics(),
            loadTrainingAnalytics(),
            loadOperationalMetrics(),
            loadSystemAlerts(),
          ]);
        } catch (error) {
          console.error('Failed to refresh all data:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Alert actions
      acknowledgeAlert: (alertId, note) => {
        set((state) => ({
          systemAlerts: state.systemAlerts.map(alert =>
            alert.id === alertId
              ? {
                  ...alert,
                  acknowledgement: {
                    by: 'Current User',
                    at: new Date().toISOString(),
                    note,
                  },
                }
              : alert
          ),
        }));
      },

      resolveAlert: (alertId) => {
        set((state) => ({
          systemAlerts: state.systemAlerts.map(alert =>
            alert.id === alertId
              ? { ...alert, isResolved: true }
              : alert
          ),
        }));
      },

      // Export actions
      exportData: (type, format, options = {}) => {
        const state = get();
        let data: any[] = [];
        
        switch (type) {
          case 'executive':
            data = state.executiveMetrics;
            break;
          case 'sop':
            data = state.sopAnalytics;
            break;
          case 'training':
            data = state.trainingAnalytics;
            break;
          case 'operational':
            data = state.operationalMetrics;
            break;
        }
        
        const exportOptions: ExportOptions = {
          format,
          includeCharts: true,
          includeSummary: true,
          template: 'standard',
          locale: 'en',
          ...options,
        };
        
        try {
          exportAnalyticsReport(type, data, [], exportOptions);
        } catch (error) {
          console.error('Failed to export data:', error);
        }
      },

      // Utility actions
      clearCache: () => {
        set({
          executiveMetrics: [],
          sopAnalytics: [],
          trainingAnalytics: [],
          operationalMetrics: [],
          systemAlerts: [],
          lastUpdated: null,
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'analytics-store',
      partialize: (state) => ({
        filters: state.filters,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);