/**
 * Generated TypeScript types for Translation Keys
 * Restaurant Krong Thai SOP Management System
 * 
 * This file provides complete type safety and autocomplete for all translation keys
 * Used by the enhanced useTranslations hook for compile-time validation
 */

import type { Locale } from './translation';

// Base interface for all translation domains
export interface TranslationDomains {
  analytics: AnalyticsTranslations;
  auth: AuthTranslations;
  categories: CategoriesTranslations;
  common: CommonTranslations;
  dashboard: DashboardTranslations;
  error: ErrorTranslations;
  errors: ErrorsTranslations;
  navigation: NavigationTranslations;
  recommendations: RecommendationsTranslations;
  search: SearchTranslations;
  sop: SopTranslations;
  time: TimeTranslations;
  training: TrainingTranslations;
}

// Common translations (most frequently used)
export interface CommonTranslations {
  loading: string;
  error: string;
  success: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  view: string;
  search: string;
  filter: string;
  sort: string;
  next: string;
  previous: string;
  home: string;
  dashboard: string;
  settings: string;
  logout: string;
  login: string;
  welcome: string;
  language: string;
  english: string;
  thai: string;
  retry: string;
  saving: string;
  confirmDelete: string;
  clear: string;
  refresh: string;
  export: string;
  filters: string;
}

// Authentication translations
export interface AuthTranslations {
  title: string;
  subtitle: string;
  pinRequired: string;
  pinPlaceholder: string;
  loginButton: string;
  invalidPin: string;
  loginFailed: string;
  selectLocation: string;
  locationRequired: string;
}

// SOP management translations
export interface SopTranslations {
  title: string;
  categories: string;
  documents: string;
  search: string;
  searchPlaceholder: string;
  noResults: string;
  status: string;
  priority: string;
  active: string;
  inactive: string;
  high: string;
  medium: string;
  low: string;
  lastUpdated: string;
  viewDetails: string;
  addNew: string;
  editSop: string;
  deleteSop: string;
  sopCreated: string;
  sopUpdated: string;
  sopDeleted: string;
  confirmDeleteSop: string;
  version: string;
  author: string;
  approvedBy: string;
  effectiveDate: string;
  reviewDate: string;
  tags: string;
  attachments: string;
  steps: string;
  requirements: string;
  safety: string;
  notes: string;
  relatedSOPs: string;
}

// Navigation translations
export interface NavigationTranslations {
  home: string;
  dashboard: string;
  sops: string;
  categories: string;
  training: string;
  analytics: string;
  settings: string;
  help: string;
  logout: string;
  profile: string;
  administration: string;
  reports: string;
  notifications: string;
}

// Search translations
export interface SearchTranslations {
  placeholder: string;
  searching: string;
  noResults: string;
  resultsCount: string; // ICU: "Found {count} results for \"{query}\""
  sort: string;
  sortBy: string;
  relevance: string;
  date: string;
  title: string;
  category: string;
  recent: string;
  popular: string;
  suggestions: string;
  clearSearch: string;
  searchHistory: string;
  noSearchHistory: string;
}

// Dashboard translations
export interface DashboardTranslations {
  welcome: string;
  totalSops: string;
  activeCategories: string;
  systemStatus: string;
  recentActivity: string;
  notifications: string;
  upcomingTasks: string;
  quickActions: string;
  overview: string;
  statistics: string;
  performance: string;
  alerts: string;
  news: string;
  shortcuts: string;
}

// Analytics translations
export interface AnalyticsTranslations {
  dashboard: string;
  executive: string;
  sop: string;
  training: string;
  monitoring: string;
  reports: string;
  insights: string;
  metrics: string;
  trends: string;
  performance: string;
  usage: string;
  efficiency: string;
  compliance: string;
  recommendations: string;
  export: string;
  dateRange: string;
  filters: string;
  chart: string;
  table: string;
  summary: string;
}

// Training translations
export interface TrainingTranslations {
  modules: string;
  assessments: string;
  certificates: string;
  progress: string;
  completed: string;
  inProgress: string;
  notStarted: string;
  score: string;
  passingScore: string;
  attempts: string;
  duration: string;
  deadline: string;
  instructor: string;
  participants: string;
  materials: string;
  startTraining: string;
  continueTraining: string;
  retakeAssessment: string;
  viewCertificate: string;
  downloadCertificate: string;
}

// Categories translations
export interface CategoriesTranslations {
  foodSafety: string;
  kitchenOperations: string;
  serviceStandards: string;
  cleaning: string;
  maintenance: string;
  safety: string;
  administration: string;
  inventory: string;
  customerService: string;
  qualityControl: string;
  emergencyProcedures: string;
  staffManagement: string;
  cashHandling: string;
  deliveryService: string;
  specialEvents: string;
  seasonalOperations: string;
}

// Error handling translations
export interface ErrorTranslations {
  generic: string;
  network: string;
  unauthorized: string;
  notFound: string;
  validation: string;
  server: string;
  timeout: string;
  offline: string;
  permissions: string;
  invalidData: string;
  sessionExpired: string;
  tooManyRequests: string;
}

// Detailed errors (legacy support)
export interface ErrorsTranslations extends ErrorTranslations {
  // Additional error types for backward compatibility
}

// Time and date translations
export interface TimeTranslations {
  now: string;
  today: string;
  yesterday: string;
  tomorrow: string;
  thisWeek: string;
  lastWeek: string;
  thisMonth: string;
  lastMonth: string;
  thisYear: string;
  lastYear: string;
  daysAgo: string; // ICU: "{count, plural, =1 {1 day ago} other {# days ago}}"
  weeksAgo: string; // ICU: "{count, plural, =1 {1 week ago} other {# weeks ago}}"
  monthsAgo: string; // ICU: "{count, plural, =1 {1 month ago} other {# months ago}}"
  yearsAgo: string; // ICU: "{count, plural, =1 {1 year ago} other {# years ago}}"
  inDays: string; // ICU: "in {count, plural, =1 {1 day} other {# days}}"
  inWeeks: string; // ICU: "in {count, plural, =1 {1 week} other {# weeks}}"
  inMonths: string; // ICU: "in {count, plural, =1 {1 month} other {# months}}"
  inYears: string; // ICU: "in {count, plural, =1 {1 year} other {# years}}"
}

// Recommendations and suggestions
export interface RecommendationsTranslations {
  title: string;
  noRecommendations: string;
  loadingRecommendations: string;
  basedOnUsage: string;
  popular: string;
  related: string;
  trending: string;
  recent: string;
  forYou: string;
  viewAll: string;
  dismiss: string;
  helpful: string;
  notHelpful: string;
}

// Flattened key paths for direct access
export type TranslationKeyPath = 
  | `analytics.${keyof AnalyticsTranslations}`
  | `auth.${keyof AuthTranslations}`
  | `categories.${keyof CategoriesTranslations}`
  | `common.${keyof CommonTranslations}`
  | `dashboard.${keyof DashboardTranslations}`
  | `error.${keyof ErrorTranslations}`
  | `errors.${keyof ErrorsTranslations}`
  | `navigation.${keyof NavigationTranslations}`
  | `recommendations.${keyof RecommendationsTranslations}`
  | `search.${keyof SearchTranslations}`
  | `sop.${keyof SopTranslations}`
  | `time.${keyof TimeTranslations}`
  | `training.${keyof TrainingTranslations}`;

// Type for nested object access
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

// Complete translation key type (all possible paths)
export type AllTranslationKeys = NestedKeyOf<TranslationDomains>;

// ICU interpolation variable types for specific keys
export interface TranslationVariables {
  'search.resultsCount': {
    count: number;
    query: string;
  };
  'time.daysAgo': {
    count: number;
  };
  'time.weeksAgo': {
    count: number;
  };
  'time.monthsAgo': {
    count: number;
  };
  'time.yearsAgo': {
    count: number;
  };
  'time.inDays': {
    count: number;
  };
  'time.inWeeks': {
    count: number;
  };
  'time.inMonths': {
    count: number;
  };
  'time.inYears': {
    count: number;
  };
  // Add more ICU message format keys as needed
}

// Type helper to check if a key requires variables
export type RequiresVariables<T extends AllTranslationKeys> = T extends keyof TranslationVariables
  ? TranslationVariables[T]
  : never;

// Type helper for optional variables
export type OptionalVariables<T extends AllTranslationKeys> = RequiresVariables<T> extends never
  ? Record<string, string | number> | undefined
  : RequiresVariables<T>;

// Domain namespace type helper
export type DomainKey<T extends keyof TranslationDomains> = keyof TranslationDomains[T];

// Validation functions
export function isValidTranslationKey(key: string): key is AllTranslationKeys {
  // This would be implemented with actual validation logic
  return typeof key === 'string' && key.includes('.');
}

export function isValidDomain(domain: string): domain is keyof TranslationDomains {
  return ['analytics', 'auth', 'categories', 'common', 'dashboard', 'error', 'errors', 
          'navigation', 'recommendations', 'search', 'sop', 'time', 'training'].includes(domain);
}

// Type utilities for the translation hook
export interface TranslationHookOptions {
  namespace?: keyof TranslationDomains;
  fallback?: string;
  lazy?: boolean;
  realtime?: boolean;
}

export interface TranslationContext {
  locale: Locale;
  namespace?: keyof TranslationDomains;
  version?: string;
  fallbackLocale?: Locale;
}

// Export commonly used domain types for convenience
export type CommonKeys = keyof CommonTranslations;
export type AuthKeys = keyof AuthTranslations;
export type SopKeys = keyof SopTranslations;
export type NavigationKeys = keyof NavigationTranslations;
export type SearchKeys = keyof SearchTranslations;
export type DashboardKeys = keyof DashboardTranslations;
export type AnalyticsKeys = keyof AnalyticsTranslations;
export type TrainingKeys = keyof TrainingTranslations;