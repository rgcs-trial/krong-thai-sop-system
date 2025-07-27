import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'th', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames = {
  en: 'English',
  th: 'ไทย',
  fr: 'Français'
} as const;

export const localeFlags = {
  en: '🇺🇸',
  th: '🇹🇭',
  fr: '🇫🇷'
} as const;

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) notFound();

  // Locale-specific configurations
  const localeConfig = {
    en: {
      timeZone: 'Asia/Bangkok',
      formats: {
        dateTime: {
          short: {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          },
          medium: {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }
        },
        number: {
          currency: {
            style: 'currency',
            currency: 'THB'
          }
        }
      }
    },
    th: {
      timeZone: 'Asia/Bangkok',
      formats: {
        dateTime: {
          short: {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            calendar: 'buddhist'
          },
          medium: {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            calendar: 'buddhist'
          }
        },
        number: {
          currency: {
            style: 'currency',
            currency: 'THB'
          }
        }
      }
    },
    fr: {
      timeZone: 'Asia/Bangkok',
      formats: {
        dateTime: {
          short: {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          },
          medium: {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }
        },
        number: {
          currency: {
            style: 'currency',
            currency: 'THB'
          }
        }
      }
    }
  };

  const config = localeConfig[locale as keyof typeof localeConfig];

  return {
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: config.timeZone,
    now: new Date(),
    formats: config.formats
  };
});