import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format dates according to locale
export function formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  };

  const formatOptions = { ...defaultOptions, ...options };
  return new Intl.DateTimeFormat(locale, formatOptions).format(date);
}

// Utility function to format numbers according to locale
export function formatNumber(number: number, locale: string, options?: Intl.NumberFormatOptions): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    notation: 'standard',
  };

  const formatOptions = { ...defaultOptions, ...options };
  return new Intl.NumberFormat(locale, formatOptions).format(number);
}

// Utility function to get appropriate text direction for locale
export function getTextDirection(locale: string): 'ltr' | 'rtl' {
  // Neither English nor French are RTL languages
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
}

// Utility function to check if locale uses French
export function isFrenchLocale(locale: string): boolean {
  return locale === 'fr';
}

// Utility function for tablet-optimized touch target sizes
export function getTouchTargetClass(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizes = {
    sm: 'min-h-[44px] min-w-[44px]', // iOS/Android minimum recommended size
    md: 'min-h-[48px] min-w-[48px]', // Material Design recommendation
    lg: 'min-h-[56px] min-w-[56px]', // Large touch targets for accessibility
  };
  return sizes[size];
}