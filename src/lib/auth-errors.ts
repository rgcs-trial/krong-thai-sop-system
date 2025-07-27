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
      th: 'พยายามเข้าสู่ระบบผิดหลายครั้งเกินไป'
    },
    userMessage: {
      en: 'Too many failed attempts. Please wait 15 minutes before trying again.',
      th: 'พยายามผิดหลายครั้งเกินไป กรุณารอ 15 นาทีก่อนลองใหม่'
    },
    severity: 'high'
  },

  ACCOUNT_LOCKED: {
    code: 'AUTH_202',
    message: {
      en: 'Account temporarily locked',
      th: 'บัญชีถูกล็อกชั่วคราว'
    },
    userMessage: {
      en: 'Your account is temporarily locked for security reasons. Please contact your manager.',
      th: 'บัญชีของคุณถูกล็อกชั่วคราวเพื่อความปลอดภัย กรุณาติดต่อผู้จัดการของคุณ'
    },
    severity: 'high'
  },

  DEVICE_NOT_RECOGNIZED: {
    code: 'AUTH_203',
    message: {
      en: 'Device not recognized',
      th: 'ไม่รู้จักอุปกรณ์นี้'
    },
    userMessage: {
      en: 'This device is not authorized. Please contact your manager.',
      th: 'อุปกรณ์นี้ไม่ได้รับอนุญาต กรุณาติดต่อผู้จัดการของคุณ'
    },
    severity: 'high'
  },

  // System errors
  DATABASE_ERROR: {
    code: 'SYS_301',
    message: {
      en: 'Database connection error',
      th: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล'
    },
    userMessage: {
      en: 'System temporarily unavailable. Please try again in a few minutes.',
      th: 'ระบบไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ในอีกสักครู่'
    },
    severity: 'critical'
  },

  SERVICE_UNAVAILABLE: {
    code: 'SYS_302',
    message: {
      en: 'Authentication service unavailable',
      th: 'บริการยืนยันตัวตนไม่พร้อมใช้งาน'
    },
    userMessage: {
      en: 'Login service is temporarily down. Please try again later.',
      th: 'บริการเข้าสู่ระบบขัดข้อง กรุณาลองใหม่ภายหลัง'
    },
    severity: 'critical'
  },

  CONFIGURATION_ERROR: {
    code: 'SYS_303',
    message: {
      en: 'System configuration error',
      th: 'เกิดข้อผิดพลาดในการตั้งค่าระบบ'
    },
    userMessage: {
      en: 'System configuration issue. Please contact technical support.',
      th: 'เกิดปัญหาการตั้งค่าระบบ กรุณาติดต่อฝ่ายเทคนิค'
    },
    severity: 'critical'
  },

  NETWORK_ERROR: {
    code: 'SYS_304',
    message: {
      en: 'Network connection error',
      th: 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย'
    },
    userMessage: {
      en: 'Network connection problem. Please check your internet connection.',
      th: 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
    },
    severity: 'medium'
  },

  UNKNOWN_ERROR: {
    code: 'SYS_999',
    message: {
      en: 'Unknown error occurred',
      th: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    },
    userMessage: {
      en: 'An unexpected error occurred. Please try again or contact support.',
      th: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่หรือติดต่อฝ่ายสนับสนุน'
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