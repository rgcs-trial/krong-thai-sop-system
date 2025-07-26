/**
 * PWA Install Prompt Component
 * Provides native-like installation prompts optimized for tablets
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone, Tablet, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (/ipad|tablet/i.test(userAgent) || (window.screen.width >= 768 && window.screen.width < 1024)) {
      setDeviceType('tablet');
    } else if (/mobile|android|iphone/i.test(userAgent) || window.screen.width < 768) {
      setDeviceType('mobile');
    } else {
      setDeviceType('desktop');
    }

    // Detect iOS devices
    const isIOS = /ipad|iphone|ipod/.test(userAgent);
    setIsIOSDevice(isIOS);

    // Check if app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    setIsInstalled(isAppInstalled);

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt after a delay if not dismissed before
      const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed');
      const lastDismissed = hasBeenDismissed ? parseInt(hasBeenDismissed) : 0;
      const daysSinceDismissal = (Date.now() - lastDismissed) / (1000 * 60 * 60 * 24);
      
      if (!hasBeenDismissed || daysSinceDismissal > 7) {
        setTimeout(() => {
          setIsVisible(true);
        }, 3000); // Show after 3 seconds
      }
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      onInstall?.();
      
      // Track installation
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: deviceType,
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deviceType, onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setIsVisible(false);
        onInstall?.();
      } else {
        console.log('[PWA] User dismissed the install prompt');
        handleDismiss();
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    onDismiss?.();
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'tablet':
        return <Tablet className="h-8 w-8 text-[#E31B23]" />;
      case 'mobile':
        return <Smartphone className="h-8 w-8 text-[#E31B23]" />;
      default:
        return <Monitor className="h-8 w-8 text-[#E31B23]" />;
    }
  };

  const getInstallInstructions = () => {
    if (isIOSDevice) {
      return {
        title: 'Install Krong Thai SOP App',
        description: 'Add this app to your home screen for quick access to SOPs even when offline.',
        instructions: [
          'Tap the Share button in Safari',
          'Select "Add to Home Screen"',
          'Tap "Add" to install the app',
        ],
      };
    }

    return {
      title: 'Install Krong Thai SOP App',
      description: `Install this app on your ${deviceType} for offline access to critical SOPs and faster performance.`,
      instructions: [
        'Click "Install App" below',
        'Confirm installation in the browser dialog',
        'Launch the app from your home screen',
      ],
    };
  };

  // Don't show if already installed or not supported
  if (isInstalled || (!deferredPrompt && !isIOSDevice) || !isVisible) {
    return null;
  }

  const { title, description, instructions } = getInstallInstructions();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="border-[#E31B23] shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {getDeviceIcon()}
              <div>
                <CardTitle className="text-lg font-semibold text-[#231F20]">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {description}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Benefits */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Offline Access</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span>Faster Loading</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <span>Push Notifications</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                <span>Home Screen Icon</span>
              </div>
            </div>

            {/* iOS Instructions */}
            {isIOSDevice && (
              <div className="bg-blue-50 rounded-lg p-3 text-xs">
                <div className="font-medium text-blue-900 mb-2">Installation Steps:</div>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  {instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {!isIOSDevice && deferredPrompt && (
                <Button
                  onClick={handleInstallClick}
                  className="flex-1 bg-[#E31B23] hover:bg-[#C41E3A] text-white"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                size="sm"
              >
                Not Now
              </Button>
            </div>

            {/* Privacy Note */}
            <div className="text-xs text-gray-500 text-center">
              Installing this app will not share any personal data and works entirely offline.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing PWA install state
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    setIsInstalled(isAppInstalled);

    // Listen for install prompt availability
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    canInstall,
    isInstalled,
    isIOSDevice: /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase()),
  };
}

// Manual install trigger component
interface InstallButtonProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function InstallButton({ 
  children, 
  className, 
  variant = 'default',
  size = 'default' 
}: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { canInstall, isInstalled } = usePWAInstall();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] Manual install accepted');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Manual install failed:', error);
    }
  };

  // Don't render if already installed or can't install
  if (isInstalled || !canInstall || !deferredPrompt) {
    return null;
  }

  return (
    <Button
      onClick={handleInstall}
      variant={variant}
      size={size}
      className={className}
    >
      {children || (
        <>
          <Download className="h-4 w-4 mr-2" />
          Install App
        </>
      )}
    </Button>
  );
}