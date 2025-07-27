/**
 * Staff PIN-Only Login Component
 * For location-bound tablet sessions where staff only need to enter PIN
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Restaurant {
  id: string;
  name: string;
  name_th: string;
}

interface StaffPinLoginProps {
  locationSession: {
    restaurant: Restaurant;
    boundByManager: string;
    expiresAt: string;
  };
  onStaffLogin: (pin: string) => Promise<{ success: boolean; error?: string; user?: any }>;
  onManagerMode: () => void;
  locale: 'en' | 'th';
}

export function StaffPinLogin({
  locationSession,
  onStaffLogin,
  onManagerMode,
  locale
}: StaffPinLoginProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastLoginTime, setLastLoginTime] = useState<string>('');

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first PIN input on mount
    pinInputRefs.current[0]?.focus();
  }, []);

  // Handle PIN input changes (optimized for tablet)
  const handlePinChange = (value: string, index: number) => {
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
    
    setError(''); // Clear error on input
  };

  // Handle PIN input key events
  const handlePinKeyDown = (e: React.KeyboardEvent, index: number) => {
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
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError(locale === 'en' ? 'Please enter a 4-digit PIN' : 'กรุณากรอกรหัส PIN 4 หลัก');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await onStaffLogin(pin);
      
      if (result.success) {
        setLastLoginTime(new Date().toLocaleTimeString());
        // Success handled by parent component
      } else {
        setError(result.error || (locale === 'en' ? 'Invalid PIN' : 'รหัส PIN ไม่ถูกต้อง'));
        // Clear PIN on error
        setPin('');
        pinInputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(locale === 'en' ? 'Login failed. Please try again.' : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
      setPin('');
      pinInputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearPin = () => {
    setPin('');
    setError('');
    pinInputRefs.current[0]?.focus();
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return locale === 'en' 
        ? `${diffHours}h ${diffMinutes}m remaining`
        : `เหลือ ${diffHours} ชม. ${diffMinutes} นาที`;
    }
    return locale === 'en' 
      ? `${diffMinutes}m remaining`
      : `เหลือ ${diffMinutes} นาที`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
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
              {locale === 'en' ? 'Staff Login' : 'เข้าสู่ระบบพนักงาน'}
            </h1>
            <p className="text-gray-600">
              {locale === 'en' ? 'Enter your PIN to continue' : 'กรอกรหัส PIN เพื่อดำเนินการต่อ'}
            </p>
          </div>

          {/* Location Info */}
          <div className="px-6 pb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-green-800">
                  {locale === 'en' ? 'Location Active' : 'สถานที่ใช้งานอยู่'}
                </span>
              </div>
              <p className="text-sm text-green-700 font-semibold">
                {locale === 'en' ? locationSession.restaurant.name : locationSession.restaurant.name_th}
              </p>
              <div className="flex items-center justify-between mt-2 text-xs text-green-600">
                <span>
                  {locale === 'en' ? 'Setup by' : 'ตั้งค่าโดย'}: {locationSession.boundByManager}
                </span>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  {formatExpiryTime(locationSession.expiresAt)}
                </Badge>
              </div>
            </div>
          </div>

          {/* PIN Input */}
          <div className="px-6 pb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {locale === 'en' ? 'Your 4-digit PIN' : 'รหัส PIN 4 หลักของคุณ'}
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

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  className="w-full h-14 text-lg font-semibold bg-red-600 hover:bg-red-700"
                  disabled={pin.length !== 4 || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      {locale === 'en' ? 'Logging in...' : 'กำลังเข้าสู่ระบบ...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {locale === 'en' ? 'Login' : 'เข้าสู่ระบบ'}
                    </>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={clearPin}
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {locale === 'en' ? 'Clear' : 'ล้าง'}
                  </Button>
                  <Button
                    onClick={onManagerMode}
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {locale === 'en' ? 'Manager Mode' : 'โหมดผู้จัดการ'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Last Login Info */}
          {lastLoginTime && (
            <div className="px-6 pb-4 text-center text-sm text-gray-500">
              {locale === 'en' ? 'Last login' : 'เข้าสู่ระบบล่าสุด'}: {lastLoginTime}
            </div>
          )}

          {/* Security Info */}
          <div className="px-6 pb-6 text-center text-sm text-gray-500 space-y-1">
            <div className="flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{locale === 'en' ? 'Secure PIN Authentication' : 'การยืนยันตัวตนด้วยรหัส PIN ที่ปลอดภัย'}</span>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>&copy; 2025 Restaurant Krong Thai. {locale === 'en' ? 'All rights reserved' : 'สงวนลิขสิทธิ์ทุกประการ'}.</p>
        </div>
      </div>
    </div>
  );
}