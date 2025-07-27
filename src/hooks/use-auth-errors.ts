/**
 * Hook for bilingual authentication error messages
 */

import { useLocale } from 'next-intl';
import { getAuthErrorMessage } from '@/lib/auth-errors';

export function useAuthErrors() {
  const locale = useLocale() as 'en' | 'fr';

  const getErrorMessage = (errorCode: string) => {
    return getAuthErrorMessage(errorCode, locale);
  };

  const formatError = (error: any) => {
    if (typeof error === 'string') {
      return {
        message: error,
        errorCode: 'SYS_999',
        severity: 'medium'
      };
    }

    if (error?.errorCode) {
      const errorInfo = getErrorMessage(error.errorCode);
      return {
        message: errorInfo.userMessage,
        errorCode: errorInfo.code,
        severity: errorInfo.severity
      };
    }

    return {
      message: error?.message || 'An unexpected error occurred',
      errorCode: 'SYS_999',
      severity: 'medium'
    };
  };

  return {
    getErrorMessage,
    formatError,
    locale
  };
}