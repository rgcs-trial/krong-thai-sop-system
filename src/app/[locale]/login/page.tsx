/**
 * Login Page for Restaurant Krong Thai SOP Management System
 * Manager login with location selection and staff PIN authentication
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantAuthFlow } from '@/components/auth/restaurant-auth-flow';
import { LocationSelector } from '@/components/auth/location-selector';
import { ServiceStatusError } from '@/components/ui/service-status-error';

interface LoginPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
}

export default function LoginPage({ params, searchParams }: LoginPageProps) {
  const router = useRouter();
  
  // Form state
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locale, setLocale] = useState('en');
  const [authMode, setAuthMode] = useState<'manager' | 'staff'>('manager');
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [managerUser, setManagerUser] = useState<any>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [serviceError, setServiceError] = useState<{error: string, code?: string} | null>(null);

  // PIN input refs for tablet optimization
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get locale and mode from params
  useEffect(() => {
    const getParams = async () => {
      const { locale: paramLocale } = await params;
      const searchParamsResolved = await searchParams;
      setLocale(paramLocale);
      
      // Check for existing location session first
      try {
        const response = await fetch('/api/auth/location-session/check');
        if (response.ok) {
          const data = await response.json();
          if (data.locationSession) {
            // Redirect to restaurant auth flow for staff login
            router.push(`/${paramLocale}/auth/restaurant-flow`);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking location session:', error);
      }
      
      // Set mode based on URL parameter
      if (searchParamsResolved?.mode === 'manager') {
        setAuthMode('manager');
      }
    };
    getParams();
    generateDeviceFingerprint();
  }, [params, searchParams, router]);
  
  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    setDeviceFingerprint(btoa(fingerprint).slice(0, 32));
  };

  // Handle PIN input changes (tablet optimized)
  const handlePinChange = (value: string, index: number) => {
    // Only allow digits
    const numericValue = value.replace(/\D/g, '');
    
    if (numericValue.length > 1) {
      // Handle paste or multiple characters
      const digits = numericValue.slice(0, 4);
      const newPin = digits.padEnd(4, ' ').slice(0, 4);
      setPin(newPin.replace(/ /g, ''));
      
      // Focus appropriate input
      const targetIndex = Math.min(digits.length, 3);
      pinInputRefs.current[targetIndex]?.focus();
    } else {
      // Single character input
      const newPin = pin.split('');
      newPin[index] = numericValue;
      setPin(newPin.join('').slice(0, 4));
      
      // Auto-focus next input
      if (numericValue && index < 3) {
        pinInputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle PIN input key events
  const handlePinKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newPin = pin.split('');
      
      if (newPin[index]) {
        // Clear current digit
        newPin[index] = '';
        setPin(newPin.join(''));
      } else if (index > 0) {
        // Move to previous input and clear
        newPin[index - 1] = '';
        setPin(newPin.join(''));
        pinInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || pin.length !== 4) {
      setError(locale === 'en' ? 'Please enter valid email and 4-digit PIN' : 'Veuillez saisir un email valide et un code PIN à 4 chiffres');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          pin: pin.trim(),
          deviceFingerprint
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const user = data.user;
        
        // If user is manager or admin, show location selector
        if (['manager', 'admin'].includes(user.role)) {
          setManagerUser(user);
          setShowLocationSelector(true);
        } else {
          // Staff users go directly to dashboard
          router.push(`/${locale}/dashboard`);
        }
      } else {
        // Check if it's a service error
        if (response.status === 503 && data.code === 'SERVICE_DOWN') {
          setServiceError({ error: data.error, code: data.code });
          return;
        }
        
        setError(data.error || (locale === 'en' ? 'Authentication failed' : 'Échec de l\'authentification'));
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Network or unexpected errors
      setServiceError({ 
        error: locale === 'en' 
          ? 'Unable to connect to authentication service' 
          : 'Impossible de se connecter au service d\'authentification',
        code: 'NETWORK_ERROR'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLocationSelected = async (restaurant: any) => {
    if (!managerUser) return;

    try {
      const response = await fetch('/api/auth/location-session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          deviceFingerprint,
          managerId: managerUser.id
        })
      });

      if (response.ok) {
        // Redirect to restaurant auth flow for staff login
        router.push(`/${locale}/auth/restaurant-flow`);
      } else {
        const error = await response.json();
        setError(error.message || (locale === 'en' ? 'Failed to set up location session' : 'Impossible de configurer la session de localisation'));
        setShowLocationSelector(false);
      }
    } catch (error) {
      console.error('Error creating location session:', error);
      setError(locale === 'en' ? 'Failed to set up location session. Please try again.' : 'Impossible de configurer la session de localisation. Veuillez réessayer.');
      setShowLocationSelector(false);
    }
  };

  // Quick login for demo/testing
  const handleQuickLogin = async (role: 'admin' | 'manager' | 'staff') => {
    const credentials = {
      admin: { email: 'admin@krongthai.com', pin: '1234' },
      manager: { email: 'manager@krongthai.com', pin: '5678' },
      staff: { email: 'staff@krongthai.com', pin: '9999' },
    };

    const { email: quickEmail, pin: quickPin } = credentials[role];
    setEmail(quickEmail);
    setPin(quickPin);

    // Auto-submit after a short delay
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} } as any);
    }, 500);
  };

  // Language toggle function
  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'th' : 'en';
    router.push(`/${newLocale}/login`);
  };
  
  // Show service error if there's a service issue
  if (serviceError) {
    return (
      <ServiceStatusError
        error={serviceError.error}
        code={serviceError.code}
        locale={locale}
        onRetry={() => {
          setServiceError(null);
          setError('');
        }}
      />
    );
  }

  // Show location selector if manager has logged in
  if (showLocationSelector && managerUser) {
    return (
      <LocationSelector
        userRole={managerUser.role}
        userRestaurantId={managerUser.restaurantId}
        onLocationSelected={handleLocationSelected}
        onCancel={() => {
          setShowLocationSelector(false);
          setManagerUser(null);
        }}
        locale={locale}
        isLoading={isSubmitting}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/images/thai-pattern.svg')] opacity-5" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Language Toggle */}
        <div className="flex justify-end mb-6">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg shadow-sm border hover:bg-white/90 transition-colors"
          >
            <span className="text-sm font-medium">
              {locale === 'en' ? '🇺🇸 EN' : '🇹🇭 ไทย'}
            </span>
          </button>
        </div>

        <div className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm rounded-lg">
          <div className="text-center pb-6 p-6">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {locale === 'en' ? 'Restaurant Krong Thai' : 'Restaurant Krong Thaï'}
            </h1>
            <p className="text-gray-600 text-lg">
              {locale === 'en' ? 'SOP Management System' : 'Système de Gestion des POS'}
            </p>
            
            {authMode === 'manager' && (
              <div className="mt-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {locale === 'en' ? 'Manager Mode' : 'Mode Gestionnaire'}
                </div>
              </div>
            )}

            {/* Device Status */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 011 1v11a1 1 0 01-1 1H5a1 1 0 01-1-1V7zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
              </svg>
              <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                {locale === 'en' ? 'Device Ready' : 'อุปกรณ์พร้อมใช้งาน'}
              </span>
            </div>
          </div>

          <div className="space-y-6 p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input - Only for managers */}
              {authMode === 'manager' && (
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                    {locale === 'en' ? 'Manager Email Address' : 'Adresse Email du Gestionnaire'}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={locale === 'en' ? 'Enter your email address' : 'กรอกที่อยู่อีเมลของคุณ'}
                    className="w-full h-12 text-lg px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    disabled={isSubmitting}
                    autoComplete="email"
                    required
                  />
                </div>
              )}

              {/* PIN Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {authMode === 'manager' 
                      ? (locale === 'en' ? 'Manager PIN (4 digits)' : 'Code PIN Gestionnaire (4 chiffres)')
                      : (locale === 'en' ? 'Your 4-digit PIN' : 'Votre code PIN à 4 chiffres')
                    }
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showPin ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M18.364 5.636L15.536 8.464" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                
                <div className="flex gap-3 justify-center">
                  {[0, 1, 2, 3].map((index) => (
                    <input
                      key={index}
                      ref={(el) => { pinInputRefs.current[index] = el; }}
                      type={showPin ? "text" : "password"}
                      value={pin[index] || ''}
                      onChange={(e) => handlePinChange(e.target.value, index)}
                      onKeyDown={(e) => handlePinKeyDown(e, index)}
                      className="w-16 h-16 text-center text-2xl font-mono border-2 rounded-md focus:outline-none focus:border-red-500"
                      maxLength={1}
                      disabled={isSubmitting}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  ))}
                </div>
                
                <p className="text-sm text-gray-500 text-center">
                  {authMode === 'manager'
                    ? (locale === 'en' 
                        ? 'Managers must enter email + PIN to set up location' 
                        : 'ผู้จัดการต้องกรอกอีเมล + PIN เพื่อตั้งค่าสถานที่')
                    : (locale === 'en' 
                        ? 'Staff only need to enter their 4-digit PIN' 
                        : 'พนักงานต้องกรอกรหัส PIN 4 หลักเท่านั้น')
                  }
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                className="w-full h-14 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={(authMode === 'manager' ? (!email.trim() || pin.length !== 4) : pin.length !== 4) || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {locale === 'en' ? 'Loading...' : 'กำลังโหลด...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {authMode === 'manager'
                      ? (locale === 'en' ? 'Setup Location' : 'ตั้งค่าสถานที่')
                      : (locale === 'en' ? 'Login' : 'เข้าสู่ระบบ')
                    }
                  </>
                )}
              </button>
            </form>
            
            {/* Mode Toggle */}
            <div className="text-center">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'manager' ? 'staff' : 'manager');
                  setEmail('');
                  setPin('');
                  setError('');
                }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
                disabled={isSubmitting}
              >
                {authMode === 'manager'
                  ? (locale === 'en' ? 'Switch to Staff Login' : 'เปลี่ยนเป็นการเข้าสู่ระบบพนักงาน')
                  : (locale === 'en' ? 'Switch to Manager Mode' : 'เปลี่ยนเป็นโหมดผู้จัดการ')
                }
              </button>
            </div>

            {/* Development Quick Login */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 text-center mb-2">
                {locale === 'en' ? 'Quick Login (Development)' : 'เข้าสู่ระบบรวดเร็ว (สำหรับพัฒนา)'}
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleQuickLogin('admin')}
                  disabled={isSubmitting}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Admin
                </button>
                <button
                  onClick={() => handleQuickLogin('manager')}
                  disabled={isSubmitting}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Manager
                </button>
                <button
                  onClick={() => handleQuickLogin('staff')}
                  disabled={isSubmitting}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Staff
                </button>
              </div>
            </div>

            {/* Security Info */}
            <div className="text-center text-sm text-gray-500 space-y-1">
              <div className="flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{locale === 'en' ? 'Secure PIN Authentication' : 'การยืนยันตัวตนด้วยรหัส PIN ที่ปลอดภัย'}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>{locale === 'en' ? '8-hour session timeout' : 'หมดเวลาการใช้งาน 8 ชั่วโมง'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>&copy; 2025 Restaurant Krong Thai. {locale === 'en' ? 'All rights reserved' : 'สงวนลิขสิทธิ์ทุกประการ'}.</p>
          <p className="mt-1">
            {locale === 'en' ? 'Contact Support' : 'ติดต่อฝ่ายสนับสนุน'}: support@krongthai.com
          </p>
        </div>
      </div>
    </div>
  );
}