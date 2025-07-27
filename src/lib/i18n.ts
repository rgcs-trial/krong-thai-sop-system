import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames = {
  en: 'English',
  fr: 'Français'
} as const;

export const localeFlags = {
  en: '🇺🇸',
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
            day: 'numeric' as const,
            month: 'short' as const,
            year: 'numeric' as const
          },
          medium: {
            day: 'numeric' as const,
            month: 'long' as const,
            year: 'numeric' as const,
            hour: 'numeric' as const,
            minute: '2-digit' as const
          }
        },
        number: {
          currency: {
            style: 'currency' as const,
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
            day: 'numeric' as const,
            month: 'short' as const,
            year: 'numeric' as const
          },
          medium: {
            day: 'numeric' as const,
            month: 'long' as const,
            year: 'numeric' as const,
            hour: 'numeric' as const,
            minute: '2-digit' as const
          }
        },
        number: {
          currency: {
            style: 'currency' as const,
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