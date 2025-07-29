'use client';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, 
  QrCode, 
  Camera, 
  Flashlight, 
  FlashlightOff,
  RotateCcw,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  History,
  Settings,
  Zap,
  Scan,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { QRScannerOverlay } from '@/components/sop';
import { toast } from '@/hooks/use-toast';

interface SOPScannerPageProps {
  params: Promise<{ locale: string }>;
}

interface ScannedSOP {
  id: string;
  title: string;
  title_fr: string;
  category: string;
  category_fr: string;
  qr_code: string;
  timestamp: string;
}

// Mock recent scans data
const MOCK_RECENT_SCANS: ScannedSOP[] = [
  {
    id: '1',
    title: 'Hand Washing Procedure',
    title_fr: 'Procédure de Lavage des Mains',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    qr_code: 'SOP-HAND-WASH-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  },
  {
    id: '2',
    title: 'Temperature Control Monitoring',
    title_fr: 'Surveillance du Contrôle de Température',
    category: 'Food Safety',
    category_fr: 'Sécurité Alimentaire',
    qr_code: 'SOP-TEMP-CTRL-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
];

export default function SOPScannerPage({ params }: SOPScannerPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [recentScans, setRecentScans] = useState<ScannedSOP[]>(MOCK_RECENT_SCANS);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const t = useTranslations('sop');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Check camera permissions and availability
  useEffect(() => {
    const checkCameraPermissions = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          setHasCamera(true);
          
          // Check permissions
          if (navigator.permissions) {
            const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
            setPermissionStatus(permission.state);
            
            permission.onchange = () => {
              setPermissionStatus(permission.state);
            };
          }
        } else {
          setHasCamera(false);
        }
      } catch (error) {
        console.error('Error checking camera permissions:', error);
        setHasCamera(false);
      }
    };

    checkCameraPermissions();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const handleStartScanning = async () => {
    setIsLoading(true);
    try {
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsScanning(true);
      setPermissionStatus('granted');
      
      toast({
        title: t('scanner.started'),
        description: t('scanner.scanInstruction'),
      });
    } catch (error) {
      console.error('Error starting camera:', error);
      setPermissionStatus('denied');
      toast({
        title: t('scanner.error'),
        description: t('scanner.cameraError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScanResult(null);
  };

  const handleQRCodeDetected = (qrCode: string) => {
    setScanResult(qrCode);
    
    // Mock SOP lookup based on QR code
    const mockSOP = {
      id: '1',
      qr_code: qrCode,
      title: 'Hand Washing Procedure',
      title_fr: 'Procédure de Lavage des Mains',
      category: 'Food Safety',
      category_fr: 'Sécurité Alimentaire',
    };

    // Add to recent scans
    const newScan: ScannedSOP = {
      ...mockSOP,
      timestamp: new Date().toISOString(),
    };
    
    setRecentScans(prev => [newScan, ...prev.slice(0, 9)]); // Keep only 10 most recent
    
    toast({
      title: t('scanner.sopFound'),
      description: locale === 'fr' ? mockSOP.title_fr : mockSOP.title,
    });

    // Navigate to SOP
    setTimeout(() => {
      router.push(`/${locale}/sop/documents/${mockSOP.id}`);
    }, 1500);
  };

  const handleToggleFlashlight = async () => {
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !isFlashlightOn } as any]
          });
          setIsFlashlightOn(!isFlashlightOn);
        }
      }
    } catch (error) {
      console.error('Error toggling flashlight:', error);
      toast({
        title: t('scanner.flashlightError'),
        variant: 'destructive',
      });
    }
  };

  const handleSwitchCamera = () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    
    if (isScanning) {
      handleStopScanning();
      setTimeout(() => {
        handleStartScanning();
      }, 500);
    }
  };

  const handleRecentScanClick = (scan: ScannedSOP) => {
    router.push(`/${locale}/sop/documents/${scan.id}`);
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('scanner.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('scanner.subtitle')}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/sop/history`)}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                {t('scanner.history')}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/sop/settings`)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                {t('scanner.settings')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Scanner Section */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="w-5 h-5" />
                  {t('scanner.camera')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!hasCamera ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('scanner.noCameraTitle')}
                    </h3>
                    <p className="text-gray-600">
                      {t('scanner.noCameraDescription')}
                    </p>
                  </div>
                ) : permissionStatus === 'denied' ? (
                  <div className="text-center py-12">
                    <Camera className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('scanner.permissionDeniedTitle')}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {t('scanner.permissionDeniedDescription')}
                    </p>
                    <Button onClick={handleStartScanning} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('scanner.retry')}
                    </Button>
                  </div>
                ) : !isScanning ? (
                  <div className="text-center py-12">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('scanner.readyTitle')}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {t('scanner.readyDescription')}
                    </p>
                    <Button
                      onClick={handleStartScanning}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 mr-2" />
                      )}
                      {t('scanner.start')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Camera View */}
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      
                      {/* QR Scanner Overlay */}
                      <QRScannerOverlay
                        isActive={isScanning}
                        onQRCodeDetected={handleQRCodeDetected}
                      />
                      
                      {/* Scan Result Overlay */}
                      {scanResult && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <div className="bg-white p-6 rounded-lg text-center">
                            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {t('scanner.success')}
                            </h3>
                            <p className="text-gray-600 mb-4">
                              {t('scanner.redirecting')}
                            </p>
                            <Badge variant="outline">{scanResult}</Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Camera Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleToggleFlashlight}
                        className="gap-2"
                      >
                        {isFlashlightOn ? (
                          <FlashlightOff className="w-5 h-5" />
                        ) : (
                          <Flashlight className="w-5 h-5" />
                        )}
                        {t('scanner.flashlight')}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleSwitchCamera}
                        className="gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                        {t('scanner.switchCamera')}
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={handleStopScanning}
                        className="gap-2"
                      >
                        {t('scanner.stop')}
                      </Button>
                    </div>

                    {/* Instructions */}
                    <Alert>
                      <QrCode className="w-4 h-4" />
                      <AlertDescription>
                        {t('scanner.instructions')}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Scans Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {t('scanner.quickActions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${locale}/sop/search`)}
                  className="w-full justify-start gap-2"
                >
                  <FileSearch className="w-4 h-4" />
                  {t('scanner.manualSearch')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${locale}/sop/favorites`)}
                  className="w-full justify-start gap-2"
                >
                  <History className="w-4 h-4" />
                  {t('scanner.viewFavorites')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${locale}/sop/offline`)}
                  className="w-full justify-start gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  {t('scanner.offlineMode')}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Scans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {t('scanner.recentScans')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentScans.length === 0 ? (
                  <div className="text-center py-6">
                    <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                      {t('scanner.noRecentScans')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentScans.map((scan) => (
                      <div
                        key={`${scan.id}-${scan.timestamp}`}
                        onClick={() => handleRecentScanClick(scan)}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                              {locale === 'fr' ? scan.title_fr : scan.title}
                            </h4>
                            <p className="text-xs text-gray-600 truncate">
                              {locale === 'fr' ? scan.category_fr : scan.category}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {scan.qr_code}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatRelativeTime(scan.timestamp)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}