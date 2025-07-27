/**
 * Translation Migration Utilities
 * Restaurant Krong Thai SOP Management System
 * 
 * Provides utilities to help migrate from the current useI18n hook to the enhanced
 * useTranslations hook with database integration and type safety
 */

'use client';

import { useI18n } from '@/hooks/use-i18n';
import { 
  useTranslations, 
  useCommonTranslations, 
  useAuthTranslations,
  useSopTranslations,
  useNavigationTranslations,
  useSearchTranslations,
  useDashboardTranslations,
  useAnalyticsTranslations,
  useTrainingTranslations,
  translationDevUtils 
} from '@/hooks/use-translations-db';
import { translationCache } from '@/lib/translation-client-cache';
import { translationAnalytics } from '@/lib/translation-analytics';
import { type AllTranslationKeys } from '@/types/translation-keys';
import { type Locale } from '@/types/translation';

// Migration configuration
const MIGRATION_CONFIG = {
  ENABLE_LEGACY_SUPPORT: true,
  ENABLE_DUAL_MODE: true, // Run both hooks in parallel for comparison
  LOG_DIFFERENCES: true,
  VALIDATION_MODE: false,
  FALLBACK_TO_LEGACY: true,
} as const;

// Migration status tracking
interface MigrationStatus {
  isLegacyMode: boolean;
  isDualMode: boolean;
  legacyHookUsed: boolean;
  newHookUsed: boolean;
  translationCount: number;
  errorCount: number;
  differences: Array<{
    key: string;
    legacyResult: string;
    newResult: string;
    timestamp: number;
  }>;
}

// Global migration state
let migrationStatus: MigrationStatus = {
  isLegacyMode: MIGRATION_CONFIG.ENABLE_LEGACY_SUPPORT,
  isDualMode: MIGRATION_CONFIG.ENABLE_DUAL_MODE,
  legacyHookUsed: false,
  newHookUsed: false,
  translationCount: 0,
  errorCount: 0,
  differences: [],
};

/**
 * Compatibility wrapper for the legacy useI18n hook
 * Provides the same API while optionally using the new translation system
 */
export function useI18nCompat() {
  const legacyHook = useI18n();
  const newHook = useTranslations();
  
  // Track usage
  migrationStatus.legacyHookUsed = true;
  if (!migrationStatus.isLegacyMode) {
    migrationStatus.newHookUsed = true;
  }

  /**
   * Enhanced translation function with migration support
   */
  const t = (key: string, values?: Record<string, unknown>) => {
    migrationStatus.translationCount++;
    
    let legacyResult: string = '';
    let newResult: string = '';
    let finalResult: string;
    
    try {
      // Always get legacy result for comparison
      legacyResult = legacyHook.t(key, values);
      
      if (migrationStatus.isLegacyMode && !migrationStatus.isDualMode) {
        // Pure legacy mode
        finalResult = legacyResult;
      } else {
        // Try new hook
        try {
          newResult = newHook.t(key as AllTranslationKeys, values as any);
          
          if (migrationStatus.isDualMode && MIGRATION_CONFIG.LOG_DIFFERENCES) {
            // Compare results and log differences
            if (legacyResult !== newResult) {
              console.warn('Translation difference detected:', {
                key,
                legacy: legacyResult,
                new: newResult,
                values,
              });
              
              migrationStatus.differences.push({
                key,
                legacyResult,
                newResult,
                timestamp: Date.now(),
              });
            }
          }
          
          finalResult = newResult;
        } catch (error) {
          console.warn('New translation hook error, falling back to legacy:', error);
          migrationStatus.errorCount++;
          finalResult = legacyResult;
        }
      }
      
      return finalResult;
    } catch (error) {
      console.error('Translation error in compatibility layer:', error);
      migrationStatus.errorCount++;
      return key; // Fallback to key itself
    }
  };

  /**
   * Translation with fallback
   */
  const tWithFallback = (key: string, fallback?: string, values?: Record<string, unknown>) => {
    if (migrationStatus.isLegacyMode && !migrationStatus.isDualMode) {
      return legacyHook.tWithFallback(key, fallback, values);
    }
    
    try {
      return newHook.tWithFallback(key, fallback || key, values as any);
    } catch (error) {
      return legacyHook.tWithFallback(key, fallback, values);
    }
  };

  // Return combined API
  return {
    // Core translation functions
    t,
    tWithFallback,
    
    // Legacy API compatibility
    locale: legacyHook.locale,
    localeMetadata: legacyHook.localeMetadata,
    direction: legacyHook.direction,
    isFrenchLocale: legacyHook.isFrenchLocale,
    isEnglishLocale: legacyHook.isEnglishLocale,
    isPending: legacyHook.isPending,
    
    // Locale switching (legacy)
    switchLocale: legacyHook.switchLocale,
    toggleLocale: legacyHook.toggleLocale,
    
    // Formatting functions (legacy)
    formatDateLocale: legacyHook.formatDateLocale,
    formatNumberLocale: legacyHook.formatNumberLocale,
    formatCurrencyLocale: legacyHook.formatCurrencyLocale,
    formatRelativeTimeLocale: legacyHook.formatRelativeTimeLocale,
    
    // Utility functions (legacy)
    getFontClassForLocale: legacyHook.getFontClassForLocale,
    getLocaleClasses: legacyHook.getLocaleClasses,
    getSearchPlaceholderLocale: legacyHook.getSearchPlaceholderLocale,
    getErrorMessageLocale: legacyHook.getErrorMessageLocale,
    getSopCategoryName: legacyHook.getSopCategoryName,
    getNavigationItems: legacyHook.getNavigationItems,
    getCommonText: legacyHook.getCommonText,
    
    // New hook features (if available)
    ...(migrationStatus.newHookUsed && {
      hasTranslation: newHook.hasTranslation,
      isLoading: newHook.isLoading,
      error: newHook.error,
      lastUpdated: newHook.lastUpdated,
      cacheStats: newHook.cacheStats,
      invalidateCache: newHook.invalidateCache,
      prefetch: newHook.prefetch,
    }),
    
    // Migration utilities
    _migration: {
      status: migrationStatus,
      enableNewHook: () => setMigrationMode(false, false),
      enableLegacyHook: () => setMigrationMode(true, false),
      enableDualMode: () => setMigrationMode(false, true),
      getDifferences: () => migrationStatus.differences,
      clearDifferences: () => { migrationStatus.differences = []; },
    },
  };
}

/**
 * Set migration mode
 */
function setMigrationMode(legacy: boolean, dual: boolean) {
  migrationStatus.isLegacyMode = legacy;
  migrationStatus.isDualMode = dual;
  console.log('Migration mode changed:', { legacy, dual });
}

/**
 * Migration analyzer - compares translation results between hooks
 */
export class MigrationAnalyzer {
  private comparisonResults: Map<string, {
    legacyResult: string;
    newResult: string;
    matches: boolean;
    error?: string;
  }> = new Map();

  /**
   * Analyze a specific translation key
   */
  async analyzeKey(key: string, values?: Record<string, unknown>): Promise<{
    key: string;
    legacyResult: string;
    newResult: string;
    matches: boolean;
    error?: string;
  }> {
    const legacyHook = useI18n();
    const newHook = useTranslations();
    
    let legacyResult = '';
    let newResult = '';
    let error: string | undefined;
    
    try {
      legacyResult = legacyHook.t(key, values);
    } catch (e) {
      error = `Legacy hook error: ${e}`;
    }
    
    try {
      newResult = newHook.t(key as AllTranslationKeys, values as any);
    } catch (e) {
      error = error ? `${error}; New hook error: ${e}` : `New hook error: ${e}`;
    }
    
    const matches = legacyResult === newResult;
    const result = { key, legacyResult, newResult, matches, error };
    
    this.comparisonResults.set(key, result);
    return result;
  }

  /**
   * Analyze all translation keys in a namespace
   */
  async analyzeNamespace(namespace: string): Promise<Array<{
    key: string;
    legacyResult: string;
    newResult: string;
    matches: boolean;
    error?: string;
  }>> {
    // This would require loading the translation keys from the namespace
    // For now, return a placeholder implementation
    const commonKeys = [
      'common.loading',
      'common.error',
      'common.success',
      'common.save',
      'common.cancel',
    ];
    
    const results = [];
    for (const key of commonKeys) {
      const result = await this.analyzeKey(key);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get analysis summary
   */
  getSummary() {
    const total = this.comparisonResults.size;
    const matches = Array.from(this.comparisonResults.values()).filter(r => r.matches).length;
    const errors = Array.from(this.comparisonResults.values()).filter(r => r.error).length;
    
    return {
      total,
      matches,
      mismatches: total - matches,
      errors,
      accuracy: total > 0 ? (matches / total) * 100 : 0,
    };
  }

  /**
   * Export analysis results
   */
  exportResults() {
    return {
      summary: this.getSummary(),
      details: Array.from(this.comparisonResults.entries()).map(([key, result]) => ({
        key,
        ...result,
      })),
      migrationStatus,
    };
  }
}

/**
 * Migration planning utilities
 */
export const migrationPlanner = {
  /**
   * Create migration plan for a component
   */
  createComponentMigrationPlan(componentPath: string, translationKeys: string[]) {
    return {
      componentPath,
      translationKeys,
      estimatedEffort: translationKeys.length * 2, // 2 minutes per key
      risks: this.assessRisks(translationKeys),
      recommendations: this.getRecommendations(translationKeys),
      migrationSteps: this.generateMigrationSteps(translationKeys),
    };
  },

  /**
   * Assess migration risks
   */
  assessRisks(keys: string[]) {
    const risks = [];
    
    // Check for complex ICU patterns
    const icuPatterns = keys.filter(key => key.includes('{') && key.includes('}'));
    if (icuPatterns.length > 0) {
      risks.push({
        type: 'ICU_FORMATTING',
        severity: 'medium',
        description: `${icuPatterns.length} keys use ICU message formatting`,
        keys: icuPatterns,
      });
    }
    
    // Check for nested keys
    const nestedKeys = keys.filter(key => key.split('.').length > 2);
    if (nestedKeys.length > 0) {
      risks.push({
        type: 'NESTED_KEYS',
        severity: 'low',
        description: `${nestedKeys.length} keys are deeply nested`,
        keys: nestedKeys,
      });
    }
    
    return risks;
  },

  /**
   * Get migration recommendations
   */
  getRecommendations(keys: string[]) {
    const recommendations = [];
    
    // Recommend namespace migration
    const namespaces = [...new Set(keys.map(key => key.split('.')[0]))];
    if (namespaces.length === 1) {
      recommendations.push({
        type: 'USE_NAMESPACE_HOOK',
        description: `Consider using use${namespaces[0].charAt(0).toUpperCase() + namespaces[0].slice(1)}Translations() hook`,
        priority: 'high',
      });
    }
    
    // Recommend batch migration
    if (keys.length > 10) {
      recommendations.push({
        type: 'BATCH_MIGRATION',
        description: 'Migrate keys in batches to reduce risk',
        priority: 'medium',
      });
    }
    
    return recommendations;
  },

  /**
   * Generate migration steps
   */
  generateMigrationSteps(keys: string[]) {
    return [
      {
        step: 1,
        title: 'Import new hook',
        description: 'Import useTranslations or appropriate namespace hook',
        code: 'import { useTranslations } from "@/hooks/use-translations-db";',
      },
      {
        step: 2,
        title: 'Replace hook usage',
        description: 'Replace useI18n() with useTranslations()',
        code: 'const { t } = useTranslations();',
      },
      {
        step: 3,
        title: 'Update translation calls',
        description: 'Update t() calls with proper types',
        code: keys.slice(0, 3).map(key => `t('${key}')`).join('\n'),
      },
      {
        step: 4,
        title: 'Test and validate',
        description: 'Test the component and validate translations work correctly',
      },
      {
        step: 5,
        title: 'Remove legacy imports',
        description: 'Remove useI18n import once migration is complete',
      },
    ];
  },
};

/**
 * Automated migration utilities
 */
export const migrationAutomation = {
  /**
   * Migrate translation keys in localStorage cache
   */
  migrateCachedTranslations() {
    try {
      // Get legacy cached translations (if any)
      const legacyCache = localStorage.getItem('next-intl-messages');
      
      if (legacyCache) {
        const parsed = JSON.parse(legacyCache);
        
        // Convert to new cache format
        Object.entries(parsed).forEach(([locale, translations]) => {
          translationCache.set(
            locale as Locale,
            translations as Record<string, string>,
            {
              version: '1.0',
              lastUpdated: new Date().toISOString(),
              cachedAt: new Date().toISOString(),
              locale: locale as Locale,
              totalKeys: Object.keys(translations).length,
            }
          );
        });
        
        console.log('Successfully migrated cached translations to new format');
      }
    } catch (error) {
      console.warn('Failed to migrate cached translations:', error);
    }
  },

  /**
   * Initialize analytics for existing session
   */
  initializeAnalytics(userId?: string) {
    // Start analytics tracking
    translationAnalytics.track(
      'migration.initialized' as AllTranslationKeys,
      'en',
      {
        context: 'migration',
        userId,
        source: 'direct',
      }
    );
  },

  /**
   * Validate migration completeness
   */
  validateMigration() {
    const validation = {
      cacheWorking: translationCache.has('en'),
      analyticsWorking: translationAnalytics.getSessionMetrics().translationRequests > 0,
      devUtilsWorking: typeof translationDevUtils.getCacheStats === 'function',
      migrationStatus,
    };
    
    console.log('Migration validation:', validation);
    return validation;
  },
};

/**
 * Development helper component for migration
 */
export function MigrationDebugger() {
  const migrationStatus = getMigrationStatus();
  
  return {
    status: migrationStatus,
    clearDifferences: () => { migrationStatus.differences = []; },
    exportReport: () => ({
      migrationStatus,
      cacheStats: translationCache.getStats(),
      analyticsData: translationAnalytics.exportData(),
    }),
  };
}

/**
 * Get current migration status
 */
export function getMigrationStatus(): MigrationStatus {
  return { ...migrationStatus };
}

/**
 * Reset migration tracking
 */
export function resetMigrationTracking() {
  migrationStatus = {
    isLegacyMode: MIGRATION_CONFIG.ENABLE_LEGACY_SUPPORT,
    isDualMode: MIGRATION_CONFIG.ENABLE_DUAL_MODE,
    legacyHookUsed: false,
    newHookUsed: false,
    translationCount: 0,
    errorCount: 0,
    differences: [],
  };
}

// Export migration configuration for external modification
export { MIGRATION_CONFIG };