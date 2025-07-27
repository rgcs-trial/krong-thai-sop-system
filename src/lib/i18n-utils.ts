import { locales, localeNames, localeFlags, type Locale } from './i18n';
import type { 
  LocaleMetadata, 
  TextDirection, 
  FontVariant, 
  DateFormatPresets, 
  NumberFormatPresets 
} from '@/types/i18n';

/**
 * Get comprehensive metadata for a locale
 */
export function getLocaleMetadata(locale: Locale): LocaleMetadata {
  return {
    code: locale,
    name: localeNames[locale],
    nativeName: locale === 'fr' ? 'Français' : 'English',
    flag: localeFlags[locale],
    direction: getTextDirection(locale),
    fontVariant: getFontVariant(locale),
  };
}

/**
 * Get text direction for a locale
 */
export function getTextDirection(locale: Locale): TextDirection {
  // Neither English nor French are RTL languages
  const rtlLocales: string[] = ['ar', 'he', 'fa', 'ur'];
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
}

/**
 * Get appropriate font variant for a locale
 */
export function getFontVariant(locale: Locale): FontVariant {
  switch (locale) {
    case 'fr':
      return 'ui';
    default:
      return 'ui';
  }
}

/**
 * Get CSS class for locale-specific font
 */
export function getFontClass(locale: Locale, variant?: 'heading' | 'body' | 'ui'): string {
  if (locale === 'fr') {
    return 'font-ui';
  }
  
  switch (variant) {
    case 'heading':
      return 'font-heading';
    case 'body':
      return 'font-body';
    case 'ui':
    default:
      return 'font-ui';
  }
}

/**
 * Format date according to locale with preset options
 */
export function formatDate(
  date: Date, 
  locale: Locale, 
  preset: keyof DateFormatPresets = 'medium'
): string {
  const presets: DateFormatPresets = {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    medium: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    datetime: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
  };

  return new Intl.DateTimeFormat(locale, {
    ...presets[preset],
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

/**
 * Format number according to locale with preset options
 */
export function formatNumber(
  number: number,
  locale: Locale,
  preset: keyof NumberFormatPresets = 'integer'
): string {
  const presets: NumberFormatPresets = {
    integer: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
    decimal: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    currency: {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    },
    percent: {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  };

  return new Intl.NumberFormat(locale, presets[preset]).format(number);
}

/**
 * Format currency with proper Thai Baht or USD formatting
 */
export function formatCurrency(
  amount: number,
  locale: Locale,
  currency: 'THB' | 'USD' = 'THB'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get relative time formatting (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date,
  locale: Locale,
  baseDate: Date = new Date()
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { 
    numeric: 'auto',
    style: 'long'
  });

  const diffInSeconds = Math.floor((date.getTime() - baseDate.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (Math.abs(diffInDays) >= 1) {
    return rtf.format(diffInDays, 'day');
  } else if (Math.abs(diffInHours) >= 1) {
    return rtf.format(diffInHours, 'hour');
  } else if (Math.abs(diffInMinutes) >= 1) {
    return rtf.format(diffInMinutes, 'minute');
  } else {
    return rtf.format(diffInSeconds, 'second');
  }
}

/**
 * Get appropriate placeholder text for search inputs based on locale
 */
export function getSearchPlaceholder(locale: Locale, context?: string): string {
  const placeholders = {
    en: {
      default: 'Search...',
      sops: 'Search SOPs...',
      categories: 'Search categories...',
      help: 'Search help...',
    },
    fr: {
      default: 'Rechercher...',
      sops: 'Rechercher des POS...',
      categories: 'Rechercher des catégories...',
      help: 'Rechercher de l\'aide...',
    },
  };

  return placeholders[locale]?.[context as keyof typeof placeholders[typeof locale]] || 
         placeholders[locale].default;
}

/**
 * Validate if a locale is supported
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get default locale fallback
 */
export function getDefaultLocale(): Locale {
  return 'en';
}

/**
 * Get opposite locale (for quick toggle)
 */
export function getOppositeLocale(currentLocale: Locale): Locale {
  return currentLocale === 'en' ? 'fr' : 'en';
}

/**
 * Get tablet-optimized CSS classes for touch targets
 */
export function getTabletTouchTargetClass(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const touchTargets = {
    sm: 'min-h-[44px] min-w-[44px] p-2', // iOS minimum
    md: 'min-h-[48px] min-w-[48px] p-3', // Material Design
    lg: 'min-h-[56px] min-w-[56px] p-4', // Large accessibility
  };
  return touchTargets[size];
}

/**
 * Get locale-specific error messages
 */
export function getLocaleErrorMessage(locale: Locale, errorType: string): string {
  const errorMessages = {
    en: {
      network: 'Network error. Please check your connection.',
      timeout: 'Request timeout. Please try again.',
      unauthorized: 'You are not authorized to view this page.',
      notFound: 'Page not found.',
      serverError: 'Server error. Please try again later.',
      general: 'Something went wrong. Please try again.',
    },
    fr: {
      network: 'Erreur réseau. Veuillez vérifier votre connexion.',
      timeout: 'Délai d\'attente de la demande. Veuillez réessayer.',
      unauthorized: 'Vous n\'êtes pas autorisé à voir cette page.',
      notFound: 'Page non trouvée.',
      serverError: 'Erreur du serveur. Veuillez réessayer plus tard.',
      general: 'Quelque chose s\'est mal passé. Veuillez réessayer.',
    },
  };

  return errorMessages[locale]?.[errorType as keyof typeof errorMessages[typeof locale]] || 
         errorMessages[locale].general;
}

/**
 * Generate SEO-friendly alternate links for different locales
 */
export function generateAlternateLinks(pathname: string): Array<{
  hreflang: string;
  href: string;
}> {
  return locales.map(locale => ({
    hreflang: locale,
    href: `/${locale}${pathname}`,
  }));
}