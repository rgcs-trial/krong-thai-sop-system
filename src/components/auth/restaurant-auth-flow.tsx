/**
 * Restaurant Authentication Flow Orchestrator
 * Manages the multi-step authentication process for restaurant tablets
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LocationSelector } from './location-selector';
import { StaffPinLogin } from './staff-pin-login';

interface Restaurant {
  id: string;
  name: string;
  name_th: string;
  address?: string;
  address_th?: string;
  phone?: string;
  email?: string;
}

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  fullName: string;
  fullNameTh: string;
  restaurantId: string;
}

interface LocationSession {
  id: string;
  restaurant: Restaurant;
  boundByManager: string;
  expiresAt: string;
  sessionToken: string;
}

interface RestaurantAuthFlowProps {
  params: Promise<{ locale: string }>;
}

type AuthStep = 'manager_login' | 'location_selection' | 'staff_pin_login';

export function RestaurantAuthFlow({ params }: RestaurantAuthFlowProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<'en' | 'th'>('en');
  const [currentStep, setCurrentStep] = useState<AuthStep>('manager_login');
  const [managerUser, setManagerUser] = useState<User | null>(null);
  const [locationSession, setLocationSession] = useState<LocationSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  // Get locale from params
  useEffect(() => {
    const getLocale = async () => {
      const { locale: paramLocale } = await params;
      setLocale(paramLocale as 'en' | 'th');
    };
    getLocale();
  }, [params]);

  // Check for existing location session on mount
  useEffect(() => {
    checkExistingLocationSession();
    generateDeviceFingerprint();
  }, []);

  const generateDeviceFingerprint = () => {
    // Simple device fingerprinting for tablet identification
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    setDeviceFingerprint(btoa(fingerprint).slice(0, 32));
  };

  const checkExistingLocationSession = async () => {
    try {
      const response = await fetch('/api/auth/location-session/check');
      if (response.ok) {
        const data = await response.json();
        if (data.locationSession) {
          setLocationSession(data.locationSession);
          setCurrentStep('staff_pin_login');
        }
      }
    } catch (error) {
      console.error('Error checking location session:', error);
    }
  };

  const handleLocationSelected = async (restaurant: Restaurant) => {
    if (!managerUser) return;

    setIsLoading(true);
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
        const data = await response.json();
        setLocationSession(data.locationSession);
        setCurrentStep('staff_pin_login');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create location session');
      }
    } catch (error) {
      console.error('Error creating location session:', error);
      alert(locale === 'en' 
        ? 'Failed to set up location session. Please try again.' 
        : 'ไม่สามารถตั้งค่าเซสชันสถานที่ได้ กรุณาลองใหม่'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async (pin: string): Promise<{ success: boolean; error?: string; user?: any }> => {
    if (!locationSession) {
      return { success: false, error: 'No active location session' };
    }

    try {
      const response = await fetch('/api/auth/staff-pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          locationSessionId: locationSession.id,
          deviceFingerprint
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Staff successfully logged in
        router.push(`/${locale}/dashboard`);
        return { success: true, user: data.user };
      } else {
        return { 
          success: false, 
          error: data.error || (locale === 'en' ? 'Invalid PIN' : 'รหัส PIN ไม่ถูกต้อง')
        };
      }
    } catch (error) {
      console.error('Staff login error:', error);
      return { 
        success: false, 
        error: locale === 'en' ? 'Login failed. Please try again.' : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'
      };
    }
  };

  const handleManagerMode = () => {
    setCurrentStep('manager_login');
    setLocationSession(null);
    router.push(`/${locale}/login?mode=manager`);
  };

  const handleCancelLocationSelection = () => {
    setCurrentStep('manager_login');
    setManagerUser(null);
    router.push(`/${locale}/login`);
  };

  // If we have an active location session, show staff PIN login
  if (currentStep === 'staff_pin_login' && locationSession) {
    return (
      <StaffPinLogin
        locationSession={locationSession}
        onStaffLogin={handleStaffLogin}
        onManagerMode={handleManagerMode}
        locale={locale}
      />
    );
  }

  // If manager is logged in but no location selected, show location selector
  if (currentStep === 'location_selection' && managerUser) {
    return (
      <LocationSelector
        userRole={managerUser.role}
        userRestaurantId={managerUser.restaurantId}
        onLocationSelected={handleLocationSelected}
        onCancel={handleCancelLocationSelection}
        locale={locale}
        isLoading={isLoading}
      />
    );
  }

  // Default: redirect to standard login
  if (typeof window !== 'undefined') {
    router.push(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-red-600 border-t-transparent rounded-full" />
    </div>
  );
}

// Export a hook for managing authentication state
export function useRestaurantAuth() {
  const [authState, setAuthState] = useState<{
    user: User | null;
    locationSession: LocationSession | null;
    isLoading: boolean;
  }>({
    user: null,
    locationSession: null,
    isLoading: true
  });

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          locationSession: data.locationSession,
          isLoading: false
        });
      } else {
        setAuthState({
          user: null,
          locationSession: null,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        user: null,
        locationSession: null,
        isLoading: false
      });
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthState({
        user: null,
        locationSession: null,
        isLoading: false
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    ...authState,
    logout,
    refresh: checkAuthState
  };
}