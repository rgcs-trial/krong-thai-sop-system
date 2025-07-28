/**
 * Enhanced PIN Login Component with Biometric Fallback
 * Restaurant Krong Thai SOP Management System
 * 
 * Provides secure authentication with biometric options when available,
 * falling back to PIN authentication with enhanced security features.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  biometricAuthService, 
  BiometricType, 
  BiometricUtils,
  type BiometricAuthResult,
  type BiometricCapabilities 
} from '@/lib/security/biometric-auth';

interface Restaurant {
  id: string;
  name: string;
  name_th: string;
}

interface EnhancedPinLoginProps {
  locationSession?: {
    restaurant: Restaurant;
    boundByManager: string;
    expiresAt: string;
  };
  onAuthentication: (data: {
    method: 'pin' | 'biometric';
    pin?: string;
    biometricResult?: BiometricAuthResult;
    deviceFingerprint?: string;
  }) => Promise<{ success: boolean; error?: string; user?: any }>;
  onManagerMode?: () => void;
  locale: 'en' | 'fr';
  allowBiometric?: boolean;
  maxPinAttempts?: number;
}

export function EnhancedPinLogin({
  locationSession,
  onAuthentication,
  onManagerMode,
  locale,
  allowBiometric = true,
  maxPinAttempts = 5
}: EnhancedPinLoginProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);
  const [lastLoginTime, setLastLoginTime] = useState<string>('');
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  
  // Biometric states
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [biometricAuthInProgress, setBiometricAuthInProgress] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize component
  useEffect(() => {
    initializeComponent();
    return () => {
      if (lockoutTimerRef.current) {
        clearTimeout(lockoutTimerRef.current);
      }
    };
  }, []);

  // Focus first PIN input
  useEffect(() => {
    if (!isLocked && !biometricAuthInProgress) {
      pinInputRefs.current[0]?.focus();
    }
  }, [isLocked, biometricAuthInProgress]);

  /**
   * Initialize component with biometric capabilities and device fingerprinting
   */
  const initializeComponent = async () => {
    try {
      // Generate device fingerprint
      const fingerprint = await generateDeviceFingerprint();
      setDeviceFingerprint(fingerprint);

      // Check biometric capabilities if allowed
      if (allowBiometric) {
        const capabilities = await biometricAuthService.getCapabilities();
        setBiometricCapabilities(capabilities);
        
        if (capabilities.isAvailable && capabilities.isEnrolled) {
          setShowBiometricOption(true);
        }
      }

      // Check for existing lockout
      checkExistingLockout();
      
    } catch (error) {
      console.error('Failed to initialize authentication component:', error);
    }
  };

  /**
   * Generate device fingerprint for security
   */
  const generateDeviceFingerprint = async (): Promise<string> => {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.cookieEnabled ? '1' : '0'
    ];

    // Add canvas fingerprint
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint canvas', 2, 2);
        components.push(canvas.toDataURL());
      }
    } catch (error) {
      // Canvas fingerprinting blocked
    }

    // Create hash
    const fingerprint = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(components.join('|'))
    );

    return Array.from(new Uint8Array(fingerprint))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  /**
   * Check for existing lockout state
   */
  const checkExistingLockout = () => {
    const lockoutData = localStorage.getItem('auth_lockout');
    if (lockoutData) {
      try {
        const { expiresAt, attempts } = JSON.parse(lockoutData);
        const lockoutExpiry = new Date(expiresAt);
        
        if (lockoutExpiry > new Date()) {
          setIsLocked(true);
          setLockoutTime(lockoutExpiry);
          setPinAttempts(attempts);
          startLockoutTimer(lockoutExpiry);
        } else {
          // Lockout expired, clear it
          localStorage.removeItem('auth_lockout');
        }
      } catch (error) {
        localStorage.removeItem('auth_lockout');
      }
    }
  };

  /**
   * Start lockout timer
   */
  const startLockoutTimer = (expiryTime: Date) => {
    const updateTimer = () => {
      const now = new Date();
      if (now >= expiryTime) {
        setIsLocked(false);
        setLockoutTime(null);
        setPinAttempts(0);
        localStorage.removeItem('auth_lockout');
        if (lockoutTimerRef.current) {
          clearTimeout(lockoutTimerRef.current);
        }
      } else {
        lockoutTimerRef.current = setTimeout(updateTimer, 1000);
      }
    };
    updateTimer();
  };

  /**
   * Handle lockout after max attempts
   */
  const handleLockout = () => {
    const lockoutDuration = Math.min(Math.pow(2, pinAttempts - maxPinAttempts) * 60000, 3600000); // Max 1 hour
    const expiryTime = new Date(Date.now() + lockoutDuration);
    
    setIsLocked(true);
    setLockoutTime(expiryTime);
    
    // Store lockout state
    localStorage.setItem('auth_lockout', JSON.stringify({
      expiresAt: expiryTime.toISOString(),
      attempts: pinAttempts
    }));
    
    startLockoutTimer(expiryTime);
  };

  /**
   * Attempt biometric authentication
   */
  const handleBiometricAuth = async () => {
    if (!biometricCapabilities?.isAvailable) {
      setBiometricError(locale === 'en' 
        ? 'Biometric authentication not available' 
        : 'Authentification biométrique non disponible'
      );
      return;
    }

    setBiometricAuthInProgress(true);
    setBiometricError('');
    setError('');

    try {
      // For this demo, we'll use device fingerprint as user ID
      // In reality, this would come from the login context
      const userId = deviceFingerprint.substring(0, 8);
      
      const result = await biometricAuthService.authenticateBiometric(userId);
      
      if (result.success) {
        setLastLoginTime(new Date().toLocaleTimeString());
        await onAuthentication({
          method: 'biometric',
          biometricResult: result,
          deviceFingerprint
        });
      } else {
        if (result.fallbackToPIN) {
          setBiometricError(locale === 'en'
            ? 'Biometric authentication failed. Please use PIN.'
            : 'Échec de l\'authentification biométrique. Veuillez utiliser le PIN.'
          );
          setShowBiometricOption(false);
        } else {
          setBiometricError(result.error || (locale === 'en' 
            ? 'Biometric authentication failed' 
            : 'Échec de l\'authentification biométrique'
          ));
        }
      }
    } catch (error) {
      setBiometricError(locale === 'en'
        ? 'Biometric authentication error. Please use PIN.'
        : 'Erreur d\'authentification biométrique. Veuillez utiliser le PIN.'
      );
      setShowBiometricOption(false);
    } finally {
      setBiometricAuthInProgress(false);
    }
  };

  /**
   * Handle PIN input changes
   */
  const handlePinChange = (value: string, index: number) => {
    if (isLocked) return;
    
    const numericValue = value.replace(/\D/g, '');
    
    if (numericValue.length > 1) {
      const digits = numericValue.slice(0, 4);
      const newPin = digits.padEnd(4, ' ').slice(0, 4);
      setPin(newPin.replace(/ /g, ''));
      
      const targetIndex = Math.min(digits.length, 3);
      pinInputRefs.current[targetIndex]?.focus();
    } else {
      const newPin = pin.split('');
      newPin[index] = numericValue;
      setPin(newPin.join('').slice(0, 4));
      
      if (numericValue && index < 3) {
        pinInputRefs.current[index + 1]?.focus();
      }
    }
    
    setError('');
    setBiometricError('');
  };

  /**
   * Handle PIN key events
   */
  const handlePinKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (isLocked) return;
    
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newPin = pin.split('');
      
      if (newPin[index]) {
        newPin[index] = '';
        setPin(newPin.join(''));
      } else if (index > 0) {
        newPin[index - 1] = '';
        setPin(newPin.join(''));
        pinInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter' && pin.length === 4) {
      handlePinSubmit();
    }
  };

  /**
   * Handle PIN submission
   */
  const handlePinSubmit = async () => {
    if (isLocked) return;
    
    if (pin.length !== 4) {
      setError(locale === 'en' ? 'Please enter a 4-digit PIN' : 'Veuillez saisir un PIN à 4 chiffres');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await onAuthentication({
        method: 'pin',
        pin,
        deviceFingerprint
      });
      
      if (result.success) {
        setLastLoginTime(new Date().toLocaleTimeString());
        setPinAttempts(0);
        localStorage.removeItem('auth_lockout');
      } else {
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);
        
        if (newAttempts >= maxPinAttempts) {
          handleLockout();
        } else {
          const remainingAttempts = maxPinAttempts - newAttempts;
          setError(result.error + ` (${remainingAttempts} ${locale === 'en' ? 'attempts remaining' : 'tentatives restantes'})`);
        }
        
        setPin('');
        pinInputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(locale === 'en' ? 'Login failed. Please try again.' : 'Échec de la connexion. Veuillez réessayer.');
      setPin('');
      pinInputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Clear PIN input
   */
  const clearPin = () => {
    if (isLocked) return;
    setPin('');
    setError('');
    setBiometricError('');
    pinInputRefs.current[0]?.focus();
  };

  /**
   * Format remaining lockout time
   */
  const formatLockoutTime = () => {
    if (!lockoutTime) return '';
    
    const now = new Date();
    const diff = lockoutTime.getTime() - now.getTime();
    
    if (diff <= 0) return '';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Get biometric icon based on type
   */
  const getBiometricIcon = () => {
    if (!biometricCapabilities) return null;
    
    const primaryType = biometricCapabilities.supportedTypes[0];
    
    switch (primaryType) {
      case BiometricType.FINGERPRINT:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3v12a2 2 0 002 2h6a2 2 0 002-2V3" />
          </svg>
        );
      case BiometricType.FACE_ID:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/images/restaurant-pattern.svg')] opacity-5" />
      
      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center p-6 pb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-2a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {locale === 'en' ? 'Secure Authentication' : 'Authentification sécurisée'}
            </h1>
            <p className="text-gray-600">
              {locale === 'en' 
                ? 'Use biometric authentication or enter your PIN' 
                : 'Utilisez l\'authentification biométrique ou saisissez votre PIN'}
            </p>
          </div>

          {/* Location Info */}
          {locationSession && (
            <div className="px-6 pb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    {locale === 'en' ? 'Location Active' : 'Emplacement actif'}
                  </span>
                </div>
                <p className="text-sm text-green-700 font-semibold">
                  {locale === 'en' ? locationSession.restaurant.name : locationSession.restaurant.name_th}
                </p>
              </div>
            </div>
          )}

          {/* Lockout Message */}
          {isLocked && (
            <div className="px-6 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m8-7V9a4 4 0 00-8 0v2" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {locale === 'en' ? 'Account Temporarily Locked' : 'Compte temporairement verrouillé'}
                    </p>
                    <p className="text-xs text-red-600">
                      {locale === 'en' ? 'Time remaining: ' : 'Temps restant: '}{formatLockoutTime()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Biometric Authentication */}
          {showBiometricOption && !isLocked && (
            <div className="px-6 pb-4">
              <Button
                onClick={handleBiometricAuth}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold"
                disabled={biometricAuthInProgress}
              >
                {biometricAuthInProgress ? (
                  <>
                    <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    {locale === 'en' ? 'Authenticating...' : 'Authentification...'}
                  </>
                ) : (
                  <>
                    {getBiometricIcon()}
                    <span className="ml-2">
                      {biometricCapabilities && 
                        BiometricUtils.getBiometricTypeName(biometricCapabilities.supportedTypes[0], locale)
                      }
                    </span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* OR Divider */}
          {showBiometricOption && !isLocked && (
            <div className="px-6 pb-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {locale === 'en' ? 'OR' : 'OU'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PIN Input */}
          <div className="px-6 pb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {locale === 'en' ? 'Your 4-digit PIN' : 'Votre PIN à 4 chiffres'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isLocked}
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
                    className={`w-16 h-16 text-center text-2xl font-mono border-2 rounded-md focus:outline-none focus:border-red-500 ${
                      isLocked ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : 'border-gray-300'
                    }`}
                    maxLength={1}
                    disabled={isSubmitting || isLocked}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                ))}
              </div>

              {/* Attempt Counter */}
              {pinAttempts > 0 && !isLocked && (
                <div className="text-center">
                  <Badge variant={pinAttempts >= maxPinAttempts - 2 ? "destructive" : "secondary"}>
                    {pinAttempts}/{maxPinAttempts} {locale === 'en' ? 'attempts' : 'tentatives'}
                  </Badge>
                </div>
              )}

              {/* Error Display */}
              {(error || biometricError) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error || biometricError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handlePinSubmit}
                  className="w-full h-14 text-lg font-semibold bg-red-600 hover:bg-red-700"
                  disabled={pin.length !== 4 || isSubmitting || isLocked}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      {locale === 'en' ? 'Authenticating...' : 'Authentification...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {locale === 'en' ? 'Login' : 'Se connecter'}
                    </>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={clearPin}
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting || isLocked}
                  >
                    {locale === 'en' ? 'Clear' : 'Effacer'}
                  </Button>
                  {onManagerMode && (
                    <Button
                      onClick={onManagerMode}
                      variant="outline"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {locale === 'en' ? 'Manager Mode' : 'Mode gestionnaire'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Last Login Info */}
          {lastLoginTime && (
            <div className="px-6 pb-4 text-center text-sm text-gray-500">
              {locale === 'en' ? 'Last login' : 'Dernière connexion'}: {lastLoginTime}
            </div>
          )}

          {/* Security Info */}
          <div className="px-6 pb-6 text-center text-sm text-gray-500 space-y-1">
            <div className="flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                {locale === 'en' 
                  ? 'Enhanced Security Authentication' 
                  : 'Authentification de sécurité renforcée'}
              </span>
            </div>
            {biometricCapabilities?.isAvailable && (
              <div className="text-xs text-green-600">
                {locale === 'en' 
                  ? 'Biometric authentication available' 
                  : 'Authentification biométrique disponible'}
              </div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>&copy; 2025 Restaurant Krong Thai. {locale === 'en' ? 'All rights reserved' : 'Tous droits réservés'}.</p>
        </div>
      </div>
    </div>
  );
}