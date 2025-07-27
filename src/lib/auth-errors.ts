/**
 * Authentication Error Constants
 * User-friendly error messages with bilingual support and error codes
 */

export interface AuthError {
  code: string;
  message: {
    en: string;
    fr: string;
  };
  userMessage: {
    en: string;
    fr: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const AUTH_ERRORS: Record<string, AuthError> = {
  // Input validation errors
  MISSING_CREDENTIALS: {
    code: 'AUTH_001',
    message: {
      en: 'Email and PIN are required',
      fr: 'Email et PIN sont requis'
    },
    userMessage: {
      en: 'Please enter both your email and 4-digit PIN',
      fr: 'Veuillez saisir votre email et votre code PIN à 4 chiffres'
    },
    severity: 'low'
  },

  INVALID_PIN_FORMAT: {
    code: 'AUTH_002',
    message: {
      en: 'PIN must be exactly 4 digits',
      fr: 'Le PIN doit être exactement 4 chiffres'
    },
    userMessage: {
      en: 'PIN must be exactly 4 digits (0-9)',
      fr: 'Le PIN doit être exactement 4 chiffres (0-9)'
    },
    severity: 'low'
  },

  INVALID_EMAIL_FORMAT: {
    code: 'AUTH_003',
    message: {
      en: 'Invalid email format',
      fr: 'Format d\'email invalide'
    },
    userMessage: {
      en: 'Please enter a valid email address',
      fr: 'Veuillez saisir une adresse email valide'
    },
    severity: 'low'
  },

  // Authentication errors
  INVALID_CREDENTIALS: {
    code: 'AUTH_101',
    message: {
      en: 'Invalid email or PIN',
      fr: 'Email ou PIN invalide'
    },
    userMessage: {
      en: 'The email or PIN you entered is incorrect. Please try again.',
      fr: 'L\'email ou le PIN que vous avez saisi est incorrect. Veuillez réessayer.'
    },
    severity: 'medium'
  },

  USER_NOT_FOUND: {
    code: 'AUTH_102',
    message: {
      en: 'User account not found',
      fr: 'Compte utilisateur introuvable'
    },
    userMessage: {
      en: 'No account found with this email. Please contact your manager.',
      fr: 'Aucun compte trouvé avec cet email. Veuillez contacter votre manager.'
    },
    severity: 'medium'
  },

  ACCOUNT_INACTIVE: {
    code: 'AUTH_103',
    message: {
      en: 'User account is inactive',
      fr: 'Compte utilisateur inactif'
    },
    userMessage: {
      en: 'Your account has been deactivated. Please contact your manager.',
      fr: 'Votre compte a été désactivé. Veuillez contacter votre manager.'
    },
    severity: 'medium'
  },

  WRONG_PIN: {
    code: 'AUTH_104',
    message: {
      en: 'Incorrect PIN provided',
      fr: 'PIN incorrect fourni'
    },
    userMessage: {
      en: 'Incorrect PIN. Please try again.',
      fr: 'PIN incorrect. Veuillez réessayer.'
    },
    severity: 'medium'
  },

  // Security errors
  TOO_MANY_ATTEMPTS: {
    code: 'AUTH_201',
    message: {
      en: 'Too many failed login attempts',
      fr: 'Trop de tentatives de connexion échouées'
    },
    userMessage: {
      en: 'Too many failed attempts. Please wait 15 minutes before trying again.',
      fr: 'Trop de tentatives échouées. Veuillez attendre 15 minutes avant de réessayer.'
    },
    severity: 'high'
  },

  ACCOUNT_LOCKED: {
    code: 'AUTH_202',
    message: {
      en: 'Account temporarily locked',
      fr: 'Compte temporairement verrouillé'
    },
    userMessage: {
      en: 'Your account is temporarily locked for security reasons. Please contact your manager.',
      fr: 'Votre compte est temporairement verrouillé pour des raisons de sécurité. Veuillez contacter votre manager.'
    },
    severity: 'high'
  },

  DEVICE_NOT_RECOGNIZED: {
    code: 'AUTH_203',
    message: {
      en: 'Device not recognized',
      fr: 'Appareil non reconnu'
    },
    userMessage: {
      en: 'This device is not authorized. Please contact your manager.',
      fr: 'Cet appareil n\'est pas autorisé. Veuillez contacter votre manager.'
    },
    severity: 'high'
  },

  // System errors
  DATABASE_ERROR: {
    code: 'SYS_301',
    message: {
      en: 'Database connection error',
      fr: 'Erreur de connexion à la base de données'
    },
    userMessage: {
      en: 'System temporarily unavailable. Please try again in a few minutes.',
      fr: 'Système temporairement indisponible. Veuillez réessayer dans quelques minutes.'
    },
    severity: 'critical'
  },

  SERVICE_UNAVAILABLE: {
    code: 'SYS_302',
    message: {
      en: 'Authentication service unavailable',
      fr: 'Service d\'authentification indisponible'
    },
    userMessage: {
      en: 'Login service is temporarily down. Please try again later.',
      fr: 'Le service de connexion est temporairement hors service. Veuillez réessayer plus tard.'
    },
    severity: 'critical'
  },

  CONFIGURATION_ERROR: {
    code: 'SYS_303',
    message: {
      en: 'System configuration error',
      fr: 'Erreur de configuration système'
    },
    userMessage: {
      en: 'System configuration issue. Please contact technical support.',
      fr: 'Problème de configuration système. Veuillez contacter le support technique.'
    },
    severity: 'critical'
  },

  NETWORK_ERROR: {
    code: 'SYS_304',
    message: {
      en: 'Network connection error',
      fr: 'Erreur de connexion réseau'
    },
    userMessage: {
      en: 'Network connection problem. Please check your internet connection.',
      fr: 'Problème de connexion réseau. Veuillez vérifier votre connexion internet.'
    },
    severity: 'medium'
  },

  UNKNOWN_ERROR: {
    code: 'SYS_999',
    message: {
      en: 'Unknown error occurred',
      fr: 'Erreur inconnue s\'est produite'
    },
    userMessage: {
      en: 'An unexpected error occurred. Please try again or contact support.',
      fr: 'Une erreur inattendue s\'est produite. Veuillez réessayer ou contacter le support.'
    },
    severity: 'high'
  }
};

/**
 * Get user-friendly error message for a given error code and locale
 */
export function getAuthErrorMessage(errorCode: string, locale: 'en' | 'fr' = 'en'): {
  code: string;
  message: string;
  userMessage: string;
  severity: string;
} {
  const error = AUTH_ERRORS[errorCode] || AUTH_ERRORS.UNKNOWN_ERROR;
  
  return {
    code: error.code,
    message: error.message[locale],
    userMessage: error.userMessage[locale],
    severity: error.severity
  };
}

/**
 * Map technical errors to user-friendly error codes
 */
export function mapErrorToCode(error: any): string {
  if (!error) return 'UNKNOWN_ERROR';

  // Database errors
  if (error.code === 'PGRST116' || error.message?.includes('no rows returned')) {
    return 'USER_NOT_FOUND';
  }
  
  if (error.code?.startsWith('PGRST') || error.message?.includes('database')) {
    return 'DATABASE_ERROR';
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.message?.includes('network')) {
    return 'NETWORK_ERROR';
  }

  // Supabase errors
  if (error.message?.includes('Invalid API key') || error.message?.includes('configuration')) {
    return 'CONFIGURATION_ERROR';
  }

  return 'UNKNOWN_ERROR';
}