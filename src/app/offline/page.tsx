/**
 * Offline Page - Restaurant Krong Thai SOP Management System
 * Provides helpful information and cached content when offline
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  WifiOff, 
  RefreshCw, 
  Book, 
  Shield, 
  AlertTriangle, 
  Heart,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react';

interface OfflinePageProps {
  params?: Promise<{ locale?: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CRITICAL_SOPS = [
  {
    id: 'food-safety',
    title: 'Food Safety Procedures',
    description: 'Critical food handling and safety protocols',
    icon: Shield,
    color: 'bg-red-500',
    urgent: true
  },
  {
    id: 'emergency-procedures',
    title: 'Emergency Procedures',
    description: 'Emergency response and evacuation protocols',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    urgent: true
  },
  {
    id: 'fire-safety',
    title: 'Fire Safety',
    description: 'Fire prevention and response procedures',
    icon: AlertTriangle,
    color: 'bg-red-600',
    urgent: true
  },
  {
    id: 'first-aid',
    title: 'First Aid',
    description: 'Basic first aid and medical emergency procedures',
    icon: Heart,
    color: 'bg-pink-500',
    urgent: true
  },
  {
    id: 'cleaning-protocols',
    title: 'Cleaning Protocols',
    description: 'Sanitation and cleaning procedures',
    icon: CheckCircle,
    color: 'bg-blue-500',
    urgent: false
  }
];

export default function OfflinePage({ params, searchParams }: OfflinePageProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [cachedSops, setCachedSops] = useState<string[]>([]);
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    // Extract locale from params
    const getLocale = async () => {
      if (params) {
        try {
          const resolvedParams = await params;
          setLocale(resolvedParams.locale || 'en');
        } catch {
          setLocale('en');
        }
      }
    };
    getLocale();
  }, [params]);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (online) {
        setLastOnline(new Date());
        setRetryCount(0);
      }
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check cached SOPs availability
    checkCachedSOPs();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const checkCachedSOPs = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const criticalCache = await caches.open('krong-thai-critical-v2');
        const sopCache = await caches.open('krong-thai-sop-documents-v2');
        
        const criticalKeys = await criticalCache.keys();
        const sopKeys = await sopCache.keys();
        
        const available = [...criticalKeys, ...sopKeys].map(request => {
          const url = new URL(request.url);
          return url.pathname.split('/').pop() || '';
        });
        
        setCachedSops(available);
      } catch (error) {
        console.error('Failed to check cached SOPs:', error);
      }
    }
  };

  const handleRetryConnection = async () => {
    setRetryCount(prev => prev + 1);
    
    try {
      // Test connection with a simple fetch
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        // Force refresh to get back online
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.log('Still offline, retry failed');
    }
  };

  const handleAccessOfflineSOP = (sopId: string) => {
    // Navigate to cached SOP if available
    window.location.href = `/sop/documents/${sopId}`;
  };

  const isThaiLocale = locale === 'th';

  const text = {
    title: isThaiLocale ? 'คุณอยู่ในโหมดออฟไลน์' : 'You\'re Offline',
    subtitle: isThaiLocale ? 'ระบบจัดการ SOP ร้านกรองไทย' : 'Restaurant Krong Thai SOP Management',
    description: isThaiLocale 
      ? 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ แต่คุณยังสามารถเข้าถึง SOP สำคัญที่จัดเก็บไว้ในเครื่องได้'
      : 'Unable to connect to the internet, but you can still access critical SOPs stored locally.',
    retryButton: isThaiLocale ? 'ลองเชื่อมต่อใหม่' : 'Retry Connection',
    availableOffline: isThaiLocale ? 'ใช้งานได้ในโหมดออฟไลน์:' : 'Available Offline:',
    lastOnlineText: isThaiLocale ? 'ออนไลน์ครั้งล่าสุด:' : 'Last Online:',
    cachedSOPs: isThaiLocale ? 'SOP ที่จัดเก็บไว้' : 'Cached SOPs',
    accessSOP: isThaiLocale ? 'เข้าถึง SOP' : 'Access SOP',
    connectionStatus: isThaiLocale ? 'สถานะการเชื่อมต่อ' : 'Connection Status',
    offline: isThaiLocale ? 'ออฟไลน์' : 'Offline',
    online: isThaiLocale ? 'ออนไลน์' : 'Online'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center space-x-3">
            <WifiOff className="h-12 w-12 text-gray-400" />
            <div>
              <h1 className="text-3xl font-bold text-[#231F20] font-serif">
                {text.title}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {text.subtitle}
              </p>
            </div>
          </div>
          
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            {text.description}
          </p>
        </div>

        {/* Connection Status */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <WifiOff className="h-5 w-5" />
                <span>{text.connectionStatus}</span>
              </CardTitle>
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? text.online : text.offline}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {lastOnline && (
                  <p className="text-sm text-gray-600">
                    {text.lastOnlineText} {lastOnline.toLocaleString(locale)}
                  </p>
                )}
                {retryCount > 0 && (
                  <p className="text-sm text-gray-500">
                    Retry attempts: {retryCount}
                  </p>
                )}
              </div>
              <Button 
                onClick={handleRetryConnection}
                disabled={isOnline}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {text.retryButton}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Critical SOPs Available Offline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-[#E31B23]" />
              <span>{text.availableOffline}</span>
            </CardTitle>
            <CardDescription>
              Critical restaurant procedures available without internet connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CRITICAL_SOPS.map((sop) => {
                const Icon = sop.icon;
                const isAvailable = cachedSops.includes(sop.id);
                
                return (
                  <div
                    key={sop.id}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      isAvailable 
                        ? 'border-green-200 bg-green-50 hover:border-green-300' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${sop.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#231F20] mb-1">
                          {sop.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {sop.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {isAvailable ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Available
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Not Cached
                              </Badge>
                            )}
                            {sop.urgent && (
                              <Badge variant="destructive" className="text-xs">
                                Critical
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={isAvailable ? "default" : "outline"}
                            disabled={!isAvailable}
                            onClick={() => handleAccessOfflineSOP(sop.id)}
                            className={isAvailable ? "bg-[#E31B23] hover:bg-[#C41E3A]" : ""}
                          >
                            <Book className="h-4 w-4 mr-1" />
                            {text.accessSOP}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instructions for Restaurant Staff */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span>{isThaiLocale ? 'คำแนะนำสำหรับพนักงาน' : 'Instructions for Staff'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <p className="text-sm text-gray-700">
                  {isThaiLocale 
                    ? 'ใช้ SOP ที่สำคัญที่แสดงข้างต้นเพื่อความปลอดภัย'
                    : 'Use the critical SOPs shown above for safety procedures'
                  }
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <p className="text-sm text-gray-700">
                  {isThaiLocale 
                    ? 'ติดต่อผู้จัดการหากต้องการ SOP อื่นๆ ด่วน'
                    : 'Contact your manager if you need other SOPs urgently'
                  }
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <p className="text-sm text-gray-700">
                  {isThaiLocale 
                    ? 'เมื่อเชื่อมต่ออินเทอร์เน็ตได้แล้ว กดปุ่ม "ลองเชื่อมต่อใหม่"'
                    : 'When internet is restored, click "Retry Connection" to continue'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 space-y-2">
          <p className="font-medium text-[#E31B23]">Restaurant Krong Thai</p>
          <p>
            {isThaiLocale 
              ? 'ระบบ PWA ทำงานในโหมดออฟไลน์เพื่อให้มั่นใจในความต่อเนื่องของการดำเนินงาน'
              : 'PWA system works offline to ensure operational continuity'
            }
          </p>
        </div>
      </div>
    </div>
  );
}