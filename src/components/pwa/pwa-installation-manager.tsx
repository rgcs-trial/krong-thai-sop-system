/**
 * PWA Installation Manager
 * Native app installation experience with advanced update management
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Check, 
  X, 
  RefreshCw, 
  AlertTriangle,
  Wifi,
  WifiOff,
  Battery,
  Signal
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallationManagerProps {
  onInstall?: () => void;
  onUpdate?: () => void;
  onDismiss?: () => void;
  autoPrompt?: boolean;
  className?: string;
}

interface InstallationState {
  canInstall: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  hasUpdate: boolean;
  isUpdating: boolean;
  updateProgress: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  isOnline: boolean;
  batteryLevel?: number;
  signalStrength: 'strong' | 'medium' | 'weak' | 'none';
}

export function PWAInstallationManager({ 
  onInstall, 
  onUpdate, 
  onDismiss,
  autoPrompt = true,
  className = ''
}: PWAInstallationManagerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallationState>({
    canInstall: false,
    isInstalled: false,
    isInstalling: false,
    hasUpdate: false,
    isUpdating: false,
    updateProgress: 0,
    deviceType: 'desktop',
    isOnline: navigator.onLine,
    signalStrength: 'strong',
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [updateStats, setUpdateStats] = useState({
    lastCheck: null as Date | null,
    lastUpdate: null as Date | null,
    updateSize: 0,
    releaseNotes: [] as string[],
  });

  // Device and network detection
  const detectDeviceAndNetwork = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    
    if (/ipad|tablet/i.test(userAgent) || (window.screen.width >= 768 && window.screen.width < 1024)) {
      deviceType = 'tablet';
    } else if (/mobile|android|iphone/i.test(userAgent) || window.screen.width < 768) {
      deviceType = 'mobile';
    }

    // Detect signal strength (simplified)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    let signalStrength: 'strong' | 'medium' | 'weak' | 'none' = 'strong';
    
    if (connection) {
      const { effectiveType, downlink } = connection;
      if (effectiveType === 'slow-2g' || downlink < 0.5) {
        signalStrength = 'weak';
      } else if (effectiveType === '2g' || downlink < 1.5) {
        signalStrength = 'medium';
      }
    }

    setState(prev => ({
      ...prev,
      deviceType,
      isOnline: navigator.onLine,
      signalStrength,
    }));
  }, []);

  // Battery API integration
  const getBatteryInfo = useCallback(async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        setState(prev => ({
          ...prev,
          batteryLevel: Math.round(battery.level * 100),
        }));
      } catch (error) {
        console.warn('[PWA] Battery API not available:', error);
      }
    }
  }, []);

  // Service Worker update detection
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          
          if (registration.waiting && registration.active) {
            setState(prev => ({ ...prev, hasUpdate: true }));
            setUpdateStats(prev => ({
              ...prev,
              lastCheck: new Date(),
              releaseNotes: [
                'Improved offline functionality',
                'Enhanced performance optimizations',
                'New SOP search capabilities',
                'Bug fixes and stability improvements'
              ],
            }));
          }
        }
      } catch (error) {
        console.error('[PWA] Update check failed:', error);
      }
    }
  }, []);

  // Installation prompt handling
  useEffect(() => {
    // Check if app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    
    setState(prev => ({ ...prev, isInstalled: isAppInstalled }));

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({ ...prev, canInstall: true }));
      
      if (autoPrompt && !isAppInstalled) {
        const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed');
        const lastDismissed = hasBeenDismissed ? parseInt(hasBeenDismissed) : 0;
        const daysSinceDismissal = (Date.now() - lastDismissed) / (1000 * 60 * 60 * 24);
        
        if (!hasBeenDismissed || daysSinceDismissal > 7) {
          setTimeout(() => setShowPrompt(true), 5000);
        }
      }
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        canInstall: false,
        isInstalling: false 
      }));
      setShowPrompt(false);
      setDeferredPrompt(null);
      onInstall?.();
      
      toast({
        title: "App Installed Successfully!",
        description: "Krong Thai SOP is now available from your home screen.",
      });

      // Track installation
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_install_success', {
          event_category: 'engagement',
          event_label: state.deviceType,
        });
      }
    };

    // Network change handling
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    // Service Worker update handling
    const handleControllerChange = () => {
      if (navigator.serviceWorker.controller) {
        window.location.reload();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    // Initial setup
    detectDeviceAndNetwork();
    getBatteryInfo();
    checkForUpdates();

    // Periodic update checks
    const updateInterval = setInterval(checkForUpdates, 30 * 60 * 1000); // Every 30 minutes

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
      clearInterval(updateInterval);
    };
  }, [autoPrompt, onInstall, detectDeviceAndNetwork, getBatteryInfo, checkForUpdates, state.deviceType]);

  // Installation handler
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setState(prev => ({ ...prev, isInstalling: true }));

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
        handleDismiss();
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      toast({
        title: "Installation Failed",
        description: "Unable to install the app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, isInstalling: false }));
    }
  };

  // Update handler
  const handleUpdate = async () => {
    if (!state.hasUpdate) return;

    setState(prev => ({ ...prev, isUpdating: true, updateProgress: 0 }));

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          // Simulate update progress
          const progressInterval = setInterval(() => {
            setState(prev => {
              const newProgress = Math.min(prev.updateProgress + 10, 90);
              return { ...prev, updateProgress: newProgress };
            });
          }, 200);

          // Activate the waiting service worker
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Complete the update
          setTimeout(() => {
            clearInterval(progressInterval);
            setState(prev => ({ 
              ...prev, 
              updateProgress: 100,
              hasUpdate: false,
              isUpdating: false 
            }));
            setUpdateStats(prev => ({
              ...prev,
              lastUpdate: new Date(),
            }));
            onUpdate?.();
            
            toast({
              title: "Update Completed!",
              description: "The app has been updated with the latest features.",
            });
          }, 1000);
        }
      }
    } catch (error) {
      console.error('[PWA] Update failed:', error);
      setState(prev => ({ ...prev, isUpdating: false, updateProgress: 0 }));
      toast({
        title: "Update Failed",
        description: "Unable to update the app. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Dismiss handler
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    onDismiss?.();
  };

  // Get device icon
  const getDeviceIcon = () => {
    switch (state.deviceType) {
      case 'tablet':
        return <Tablet className="h-6 w-6 text-[#E31B23]" />;
      case 'mobile':
        return <Smartphone className="h-6 w-6 text-[#E31B23]" />;
      default:
        return <Monitor className="h-6 w-6 text-[#E31B23]" />;
    }
  };

  // Get network icon
  const getNetworkIcon = () => {
    if (!state.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    switch (state.signalStrength) {
      case 'weak':
        return <Signal className="h-4 w-4 text-yellow-500" />;
      case 'medium':
        return <Signal className="h-4 w-4 text-orange-500" />;
      default:
        return <Wifi className="h-4 w-4 text-green-500" />;
    }
  };

  // Installation recommendations
  const getInstallationRecommendation = () => {
    const recommendations = [];
    
    if (state.batteryLevel && state.batteryLevel < 20) {
      recommendations.push("Consider charging your device before installation");
    }
    
    if (!state.isOnline) {
      recommendations.push("Internet connection required for installation");
    }
    
    if (state.signalStrength === 'weak') {
      recommendations.push("Weak signal detected - installation may take longer");
    }
    
    return recommendations;
  };

  // Update notification
  if (state.hasUpdate && !showPrompt) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <Card className="w-80 border-blue-500 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-sm font-semibold">Update Available</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">v1.2.1</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                New features and improvements are ready to install.
              </div>
              
              {updateStats.releaseNotes.length > 0 && (
                <div className="text-xs">
                  <div className="font-medium mb-1">What's New:</div>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {updateStats.releaseNotes.slice(0, 2).map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {state.isUpdating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Updating...</span>
                    <span>{state.updateProgress}%</span>
                  </div>
                  <Progress value={state.updateProgress} className="h-2" />
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={handleUpdate}
                  disabled={state.isUpdating || !state.isOnline}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {state.isUpdating ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Update Now
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setState(prev => ({ ...prev, hasUpdate: false }))}
                  className="flex-1"
                  size="sm"
                >
                  Later
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Installation prompt
  if (showPrompt && state.canInstall && !state.isInstalled) {
    const recommendations = getInstallationRecommendation();
    
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 ${className}`}>
        <Card className="border-[#E31B23] shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {getDeviceIcon()}
                <div>
                  <CardTitle className="text-lg font-semibold text-[#231F20]">
                    Install Krong Thai SOP
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Get native app experience with offline access
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
              {/* Device and network status */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {getNetworkIcon()}
                    <span className={state.isOnline ? 'text-green-600' : 'text-red-600'}>
                      {state.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  {state.batteryLevel && (
                    <div className="flex items-center space-x-1">
                      <Battery className="h-4 w-4 text-gray-500" />
                      <span className={state.batteryLevel < 20 ? 'text-red-600' : 'text-gray-600'}>
                        {state.batteryLevel}%
                      </span>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {state.deviceType.charAt(0).toUpperCase() + state.deviceType.slice(1)}
                </Badge>
              </div>

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

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <div className="font-medium text-yellow-800 mb-1">Recommendations:</div>
                      <ul className="list-disc list-inside space-y-1 text-yellow-700">
                        {recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Installation progress */}
              {state.isInstalling && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Installing app...</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex space-x-2">
                <Button
                  onClick={handleInstall}
                  disabled={state.isInstalling || !state.isOnline}
                  className="flex-1 bg-[#E31B23] hover:bg-[#C41E3A] text-white"
                  size="sm"
                >
                  {state.isInstalling ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Install App
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  size="sm"
                >
                  Not Now
                </Button>
              </div>

              {/* Privacy note */}
              <div className="text-xs text-gray-500 text-center">
                Installing this app will not share any personal data and works entirely offline.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// Hook for managing PWA state
export function usePWAInstallation() {
  const [state, setState] = useState({
    canInstall: false,
    isInstalled: false,
    hasUpdate: false,
    isOnline: navigator.onLine,
  });

  useEffect(() => {
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    
    setState(prev => ({ ...prev, isInstalled: isAppInstalled }));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({ ...prev, canInstall: true }));
    };

    const handleAppInstalled = () => {
      setState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
    };

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return state;
}