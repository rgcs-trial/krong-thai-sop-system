import type { Locale } from '@/lib/i18n';

// Type definitions for next-intl
export interface TranslationNamespace {
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    edit: string;
    delete: string;
    create: string;
    update: string;
    search: string;
    filter: string;
    clear: string;
    reset: string;
    submit: string;
    back: string;
    next: string;
    previous: string;
    close: string;
    open: string;
    view: string;
    download: string;
    upload: string;
    print: string;
    copy: string;
    copied: string;
    language: string;
    switchLanguage: string;
  };
  auth: {
    title: string;
    subtitle: string;
    pinEntry: string;
    pinPlaceholder: string;
    login: string;
    logout: string;
    invalidPin: string;
    loginError: string;
    sessionExpired: string;
    accessDenied: string;
    enterPin: string;
    pinRequired: string;
    pinLength: string;
    welcomeBack: string;
    loginSuccess: string;
    logoutSuccess: string;
  };
  navigation: {
    home: string;
    dashboard: string;
    sops: string;
    categories: string;
    search: string;
    profile: string;
    settings: string;
    help: string;
    about: string;
  };
  sopCategories: {
    title: string;
    subtitle: string;
    foodSafety: string;
    kitchenOperations: string;
    serviceStandards: string;
    customerService: string;
    cashHandling: string;
    inventory: string;
    cleaning: string;
    equipment: string;
    emergencyProcedures: string;
    staffTraining: string;
    qualityControl: string;
    allergenManagement: string;
    deliveryTakeout: string;
    openingClosing: string;
    healthSafety: string;
    customerComplaints: string;
  };
  sop: {
    title: string;
    searchPlaceholder: string;
    noResults: string;
    category: string;
    lastUpdated: string;
    version: string;
    status: string;
    active: string;
    inactive: string;
    draft: string;
    viewSop: string;
    downloadPdf: string;
    printSop: string;
    shareSop: string;
    sopNotFound: string;
    loadingError: string;
    steps: string;
    requirements: string;
    safety: string;
    tips: string;
    relatedSops: string;
  };
  dashboard: {
    welcome: string;
    quickAccess: string;
    recentlyViewed: string;
    popularSops: string;
    announcements: string;
    noRecentSops: string;
    viewAll: string;
    statistics: string;
    totalSops: string;
    activeCategories: string;
    lastLogin: string;
    systemStatus: string;
    online: string;
    offline: string;
  };
  forms: {
    required: string;
    invalid: string;
    tooShort: string;
    tooLong: string;
    invalidEmail: string;
    passwordMatch: string;
    selectOption: string;
    uploadFile: string;
    fileUploaded: string;
    uploadError: string;
  };
  errors: {
    general: string;
    network: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    serverError: string;
    timeout: string;
    maintenance: string;
  };
  settings: {
    title: string;
    language: string;
    theme: string;
    notifications: string;
    privacy: string;
    about: string;
    version: string;
    buildDate: string;
    contactSupport: string;
    reportIssue: string;
    userPreferences: string;
    displaySettings: string;
    accessibilitySettings: string;
  };
  help: {
    title: string;
    faq: string;
    tutorials: string;
    contactSupport: string;
    reportBug: string;
    featureRequest: string;
    documentation: string;
    videoGuides: string;
    searchHelp: string;
    noHelpResults: string;
  };
  accessibility: {
    skipToContent: string;
    openMenu: string;
    closeMenu: string;
    toggleLanguage: string;
    increaseFontSize: string;
    decreaseFontSize: string;
    resetFontSize: string;
    highContrast: string;
    screenReader: string;
  };
}

// Utility type for getting nested translation keys
export type TranslationKey = {
  [K in keyof TranslationNamespace]: {
    [P in keyof TranslationNamespace[K]]: `${K & string}.${P & string}`;
  }[keyof TranslationNamespace[K]];
}[keyof TranslationNamespace];

// Language direction type
export type TextDirection = 'ltr' | 'rtl';

// Font variant types for different locales
export type FontVariant = 'heading' | 'body' | 'ui';

// Locale metadata interface
export interface LocaleMetadata {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
  direction: TextDirection;
  fontVariant: FontVariant;
}

// Translation function type
export type TranslationFunction = (key: string, values?: Record<string, unknown>) => string;

// Locale switching function type
export type LocaleSwitchFunction = (locale: Locale) => void;

// Supported currency formats for localization
export type SupportedCurrency = 'THB' | 'USD';

// Date format presets
export interface DateFormatPresets {
  short: Intl.DateTimeFormatOptions;
  medium: Intl.DateTimeFormatOptions;
  long: Intl.DateTimeFormatOptions;
  time: Intl.DateTimeFormatOptions;
  datetime: Intl.DateTimeFormatOptions;
}

// Number format presets
export interface NumberFormatPresets {
  integer: Intl.NumberFormatOptions;
  decimal: Intl.NumberFormatOptions;
  currency: Intl.NumberFormatOptions;
  percent: Intl.NumberFormatOptions;
}