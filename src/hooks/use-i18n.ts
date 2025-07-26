'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { type Locale } from '@/lib/i18n';
import { 
  getLocaleMetadata, 
  getFontClass, 
  formatDate, 
  formatNumber, 
  formatCurrency,
  formatRelativeTime,
  getOppositeLocale,
  getSearchPlaceholder,
  getLocaleErrorMessage 
} from '@/lib/i18n-utils';

/**
 * Enhanced i18n hook with additional utilities for the SOP system
 */
export function useI18n() {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Get locale metadata
  const localeMetadata = getLocaleMetadata(locale);

  // Locale switching function
  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    startTransition(() => {
      const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
      router.push(newPathname);
      router.refresh();
    });
  };

  // Quick toggle between languages
  const toggleLocale = () => {
    switchLocale(getOppositeLocale(locale));
  };

  // Get font class for current locale
  const getFontClassForLocale = (variant?: 'heading' | 'body' | 'ui') => {
    return getFontClass(locale, variant);
  };

  // Format date with current locale
  const formatDateLocale = (
    date: Date, 
    preset?: 'short' | 'medium' | 'long' | 'time' | 'datetime'
  ) => {
    return formatDate(date, locale, preset);
  };

  // Format number with current locale
  const formatNumberLocale = (
    number: number, 
    preset?: 'integer' | 'decimal' | 'currency' | 'percent'
  ) => {
    return formatNumber(number, locale, preset);
  };

  // Format currency with current locale
  const formatCurrencyLocale = (amount: number, currency?: 'THB' | 'USD') => {
    return formatCurrency(amount, locale, currency);
  };

  // Format relative time with current locale
  const formatRelativeTimeLocale = (date: Date, baseDate?: Date) => {
    return formatRelativeTime(date, locale, baseDate);
  };

  // Get search placeholder for current locale
  const getSearchPlaceholderLocale = (context?: string) => {
    return getSearchPlaceholder(locale, context);
  };

  // Get error message for current locale
  const getErrorMessageLocale = (errorType: string) => {
    return getLocaleErrorMessage(locale, errorType);
  };

  // Check if current locale is Thai
  const isThaiLocale = locale === 'th';

  // Check if current locale is English
  const isEnglishLocale = locale === 'en';

  // Get direction for current locale
  const direction = localeMetadata.direction;

  // Get appropriate CSS classes for current locale
  const getLocaleClasses = (variant?: 'heading' | 'body' | 'ui') => {
    const baseClasses = getFontClassForLocale(variant);
    const directionClass = direction === 'rtl' ? 'rtl' : 'ltr';
    return `${baseClasses} ${directionClass}`;
  };

  // Translation with fallback
  const tWithFallback = (key: string, fallback?: string, values?: Record<string, unknown>) => {
    try {
      return t(key, values);
    } catch (error) {
      console.warn(`Translation missing for key: ${key}`, error);
      return fallback || key;
    }
  };

  // Get localized SOP category names
  const getSopCategoryName = (categoryKey: string) => {
    return t(`sopCategories.${categoryKey}`);
  };

  // Get localized navigation items
  const getNavigationItems = () => {
    return [
      { key: 'home', label: t('navigation.home'), href: '/' },
      { key: 'dashboard', label: t('navigation.dashboard'), href: '/dashboard' },
      { key: 'sops', label: t('navigation.sops'), href: '/sops' },
      { key: 'categories', label: t('navigation.categories'), href: '/categories' },
      { key: 'settings', label: t('navigation.settings'), href: '/settings' },
      { key: 'help', label: t('navigation.help'), href: '/help' },
    ];
  };

  // Get common UI text
  const getCommonText = () => ({
    loading: t('common.loading'),
    error: t('common.error'),
    success: t('common.success'),
    save: t('common.save'),
    cancel: t('common.cancel'),
    confirm: t('common.confirm'),
    edit: t('common.edit'),
    delete: t('common.delete'),
    search: t('common.search'),
    back: t('common.back'),
    next: t('common.next'),
    close: t('common.close'),
  });

  return {
    // Core properties
    locale,
    localeMetadata,
    direction,
    isThaiLocale,
    isEnglishLocale,
    isPending,

    // Translation functions
    t,
    tWithFallback,

    // Locale switching
    switchLocale,
    toggleLocale,

    // Formatting functions
    formatDateLocale,
    formatNumberLocale,
    formatCurrencyLocale,
    formatRelativeTimeLocale,

    // Utility functions
    getFontClassForLocale,
    getLocaleClasses,
    getSearchPlaceholderLocale,
    getErrorMessageLocale,
    getSopCategoryName,
    getNavigationItems,
    getCommonText,
  };
}

/**
 * Hook for managing tablet-optimized UI preferences
 */
export function useTabletOptimization() {
  const { isThaiLocale } = useI18n();

  // Get touch target size based on content type
  const getTouchTargetSize = (contentType: 'button' | 'input' | 'card' | 'nav' = 'button') => {
    const sizes = {
      button: 'min-h-[48px] min-w-[48px]',
      input: 'min-h-[52px]',
      card: 'min-h-[64px]',
      nav: 'min-h-[56px]',
    };
    return sizes[contentType];
  };

  // Get font size adjustments for tablet reading
  const getFontSizeClasses = (element: 'body' | 'heading' | 'ui' | 'small' = 'body') => {
    const sizes = {
      body: isThaiLocale ? 'text-base leading-relaxed' : 'text-base',
      heading: isThaiLocale ? 'text-2xl leading-tight' : 'text-2xl',
      ui: 'text-sm',
      small: 'text-xs',
    };
    
    return sizes[element];
  };

  // Get spacing optimized for tablet touch
  const getSpacingClasses = (density: 'compact' | 'normal' | 'comfortable' = 'normal') => {
    const spacing = {
      compact: 'space-y-2 px-3 py-2',
      normal: 'space-y-4 px-4 py-3',
      comfortable: 'space-y-6 px-6 py-4',
    };
    return spacing[density];
  };

  return {
    getTouchTargetSize,
    getFontSizeClasses,
    getSpacingClasses,
    isThaiLocale,
  };
}