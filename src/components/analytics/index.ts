/**
 * Analytics Components Export Index
 * Central export point for all analytics dashboard components
 */

export { ExecutiveDashboard } from './executive-dashboard';
export { SOPAnalyticsDashboard } from './sop-analytics-dashboard';
export { OperationalInsightsDashboard } from './operational-insights-dashboard';
export { RealtimeMonitoringDashboard } from './realtime-monitoring-dashboard';

// Export enhanced training analytics from training folder
export { TrainingAnalyticsDashboard } from '../training/training-analytics-dashboard';

// Export analytics store and utilities
export { useAnalyticsStore } from '../../lib/stores/analytics-store';
export { 
  exportAnalyticsReport, 
  formatAnalyticsData,
  exportToCSV,
  exportToExcel,
  exportToPDF 
} from '../../lib/analytics/export-utils';

// Export types
export type { 
  ExportData, 
  ChartData, 
  ExportOptions 
} from '../../lib/analytics/export-utils';

export type {
  AnalyticsMetric,
  SOPAnalytics,
  TrainingAnalytics,
  OperationalMetric,
  SystemAlert,
  AnalyticsFilters,
  AnalyticsState
} from '../../lib/stores/analytics-store';