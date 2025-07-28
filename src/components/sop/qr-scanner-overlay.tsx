'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  QrCode, 
  X, 
  Camera, 
  RotateCcw, 
  Flashlight,
  FlashlightOff,
  CheckCircle,
  AlertTriangle,
  Package,
  MapPin,
  User,
  Settings,
  Calendar,
  Tool,
  Shield,
  ChefHat,
  Utensils,
  Archive
} from 'lucide-react';

interface EquipmentTag {
  id: string;
  name: string;
  type: 'kitchen' | 'cleaning' | 'safety' | 'dining' | 'storage';
  location: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  status: 'operational' | 'maintenance_required' | 'out_of_order';
  specifications?: Record<string, any>;
  qrCode: string;
}

interface QRScanResult {
  data: string;
  type: 'sop' | 'equipment' | 'location' | 'user' | 'unknown';
  sopId?: string;
  sopTitle?: string;
  category?: string;
  equipment?: EquipmentTag;
  location?: {
    id: string;
    name: string;
    zone: string;
    floor: number;
  };
  user?: {
    id: string;
    name: string;
    role: string;
  };
  isValid: boolean;
  confidence: number; // 0-1 detection confidence
}

interface QRScannerOverlayProps {
  /** Scanner open state */
  isOpen: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Enable equipment tag scanning */
  enableEquipmentTags?: boolean;
  /** Enable location scanning */
  enableLocationScanning?: boolean;
  /** Enable user identification */
  enableUserScanning?: boolean;
  /** Scan multiple codes in sequence */
  allowMultipleScan?: boolean;
  /** Show scan history */
  showScanHistory?: boolean;
  /** Filter scan types */
  allowedTypes?: ('sop' | 'equipment' | 'location' | 'user')[];
  /** Callback when scanner closes */
  onClose: () => void;
  /** Callback when QR code is scanned */
  onScanComplete: (result: QRScanResult) => void;
  /** Callback when equipment is scanned */
  onEquipmentScanned?: (equipment: EquipmentTag) => void;
  /** Callback when location is scanned */
  onLocationScanned?: (location: { id: string; name: string; zone: string; floor: number }) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * QRScannerOverlay - QR code scanner overlay for quick SOP access
 * 
 * Features:
 * - Camera-based QR code scanning
 * - Tablet-optimized scanning interface
 * - Flashlight toggle for low-light conditions
 * - Real-time scan feedback
 * - SOP validation and preview
 * - Accessibility support
 * 
 * @param props QRScannerOverlayProps
 * @returns JSX.Element
 */
const QRScannerOverlay: React.FC<QRScannerOverlayProps> = ({
  isOpen,
  isLoading = false,
  enableEquipmentTags = true,
  enableLocationScanning = true,
  enableUserScanning = false,
  allowMultipleScan = false,
  showScanHistory = true,
  allowedTypes = ['sop', 'equipment', 'location'],
  onClose,
  onScanComplete,
  onEquipmentScanned,
  onLocationScanned,
  className
}) => {
  const t = useTranslations('sop.qrScanner');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanHistory, setScanHistory] = useState<QRScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [scanConfidence, setScanConfidence] = useState(0);
  
  // Initialize camera
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [isOpen]);

  const initializeCamera = useCallback(async () => {
    try {
      setScanError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCamera(true);
        startScanning();
      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      setScanError(t('errors.cameraAccess'));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setHasCamera(false);
  }, []);

  const toggleFlashlight = useCallback(async () => {
    if (!videoRef.current?.srcObject) return;
    
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      
      if (videoTrack && 'getCapabilities' in videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        if (capabilities.torch) {
          await videoTrack.applyConstraints({
            advanced: [{ torch: !isFlashlightOn }]
          });
          setIsFlashlightOn(!isFlashlightOn);
        }
      }
    } catch (error) {
      console.error('Flashlight toggle error:', error);
    }
  }, [isFlashlightOn]);

  const startScanning = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const scanFrame = () => {
      if (!isOpen || !hasCamera) return;
      
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // In a real implementation, you would use a QR code library here
        // For now, we'll simulate QR detection
        detectQRCode(canvas);
      }
      
      requestAnimationFrame(scanFrame);
    };
    
    scanFrame();
  }, [isOpen, hasCamera]);

  // Process and classify QR code data
  const processQRCode = useCallback(async (qrData: string): Promise<QRScanResult> => {
    setIsProcessing(true);
    
    try {
      // Parse different QR code formats
      let result: QRScanResult = {
        data: qrData,
        type: 'unknown',
        isValid: false,
        confidence: 0.7
      };

      // SOP QR codes (sop://krong-thai/procedures/...)
      if (qrData.startsWith('sop://krong-thai/')) {
        const match = qrData.match(/sop:\/\/krong-thai\/procedures\/(.+)/);
        if (match) {
          result = {
            ...result,
            type: 'sop',
            sopId: match[1],
            sopTitle: 'Food Safety Procedure', // In real app, fetch from database
            category: 'Food Safety',
            isValid: true,
            confidence: 0.95
          };
        }
      }
      
      // Equipment QR codes (eq://krong-thai/equipment/...)
      else if (qrData.startsWith('eq://krong-thai/') && enableEquipmentTags) {
        const match = qrData.match(/eq:\/\/krong-thai\/equipment\/(.+)/);
        if (match) {
          const equipmentId = match[1];
          
          // Mock equipment data - in real app, fetch from database
          const mockEquipment: EquipmentTag = {
            id: equipmentId,
            name: 'Commercial Oven #3',
            type: 'kitchen',
            location: 'Kitchen - Station 3',
            status: 'operational',
            lastMaintenance: '2024-01-15',
            nextMaintenance: '2024-04-15',
            qrCode: qrData,
            specifications: {
              model: 'TurboChef NGC',
              capacity: '20L',
              maxTemp: '500°F'
            }
          };
          
          result = {
            ...result,
            type: 'equipment',
            equipment: mockEquipment,
            isValid: true,
            confidence: 0.92
          };
        }
      }
      
      // Location QR codes (loc://krong-thai/location/...)
      else if (qrData.startsWith('loc://krong-thai/') && enableLocationScanning) {
        const match = qrData.match(/loc:\/\/krong-thai\/location\/(.+)/);
        if (match) {
          const locationId = match[1];
          
          result = {
            ...result,
            type: 'location',
            location: {
              id: locationId,
              name: 'Kitchen Station 3',
              zone: 'Food Preparation',
              floor: 1
            },
            isValid: true,
            confidence: 0.90
          };
        }
      }
      
      // User QR codes (user://krong-thai/staff/...)
      else if (qrData.startsWith('user://krong-thai/') && enableUserScanning) {
        const match = qrData.match(/user:\/\/krong-thai\/staff\/(.+)/);
        if (match) {
          const userId = match[1];
          
          result = {
            ...result,
            type: 'user',
            user: {
              id: userId,
              name: 'Chef Michel',
              role: 'head_chef'
            },
            isValid: true,
            confidence: 0.88
          };
        }
      }
      
      // Generic QR codes (try to parse as JSON)
      else {
        try {
          const parsed = JSON.parse(qrData);
          if (parsed.type && allowedTypes.includes(parsed.type)) {
            result = {
              ...result,
              type: parsed.type,
              isValid: true,
              confidence: 0.75,
              ...parsed
            };
          }
        } catch {
          // Not JSON, treat as unknown
          result.confidence = 0.3;
        }
      }

      // Filter by allowed types
      if (!allowedTypes.includes(result.type)) {
        result.isValid = false;
        result.confidence = 0;
      }

      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [enableEquipmentTags, enableLocationScanning, enableUserScanning, allowedTypes]);

  const detectQRCode = useCallback(async (canvas: HTMLCanvasElement) => {
    // Throttle scanning to avoid multiple rapid scans
    const now = Date.now();
    if (now - lastScanTime < 1000 || isProcessing) return;
    
    // In real implementation, use jsQR library
    // const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    // Simulated QR detection with multiple types
    const simulateAdvancedQRDetection = async () => {
      const detectionChance = Math.random();
      
      if (detectionChance > 0.97) { // 3% chance per frame
        const qrTypes = [
          'sop://krong-thai/procedures/food-safety-001',
          'eq://krong-thai/equipment/oven-003',
          'loc://krong-thai/location/kitchen-station-3',
          'user://krong-thai/staff/chef-michel'
        ];
        
        // Filter by allowed types
        const allowedQRs = qrTypes.filter(qr => {
          if (qr.startsWith('sop://') && allowedTypes.includes('sop')) return true;
          if (qr.startsWith('eq://') && allowedTypes.includes('equipment')) return true;
          if (qr.startsWith('loc://') && allowedTypes.includes('location')) return true;
          if (qr.startsWith('user://') && allowedTypes.includes('user')) return true;
          return false;
        });
        
        if (allowedQRs.length > 0) {
          const randomQR = allowedQRs[Math.floor(Math.random() * allowedQRs.length)];
          setDetectedCode(randomQR);
          
          const result = await processQRCode(randomQR);
          setScanConfidence(result.confidence);
          
          // Add to scan history
          if (showScanHistory) {
            setScanHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 scans
          }
          
          setLastScanTime(now);
          
          // Call appropriate callbacks
          if (result.type === 'equipment' && result.equipment && onEquipmentScanned) {
            onEquipmentScanned(result.equipment);
          }
          
          if (result.type === 'location' && result.location && onLocationScanned) {
            onLocationScanned(result.location);
          }
          
          onScanComplete(result);
          
          // If not allowing multiple scans, close scanner
          if (!allowMultipleScan) {
            setTimeout(() => onClose(), 500);
          }
        }
      }
    };
    
    await simulateAdvancedQRDetection();
  }, [lastScanTime, isProcessing, processQRCode, allowedTypes, showScanHistory, onEquipmentScanned, onLocationScanned, onScanComplete, allowMultipleScan, onClose]);

  // Get icon for scan type
  const getTypeIcon = useCallback((type: QRScanResult['type']) => {
    switch (type) {
      case 'sop': return <QrCode className="w-4 h-4" />;
      case 'equipment': return <Package className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  }, []);

  // Get equipment type icon
  const getEquipmentTypeIcon = useCallback((type: EquipmentTag['type']) => {
    switch (type) {
      case 'kitchen': return <ChefHat className="w-4 h-4" />;
      case 'cleaning': return <Shield className="w-4 h-4" />;
      case 'safety': return <Shield className="w-4 h-4" />;
      case 'dining': return <Utensils className="w-4 h-4" />;
      case 'storage': return <Archive className="w-4 h-4" />;
      default: return <Tool className="w-4 h-4" />;
    }
  }, []);

  // Get status color for equipment
  const getStatusColor = useCallback((status: EquipmentTag['status']) => {
    switch (status) {
      case 'operational': return 'text-jade-green';
      case 'maintenance_required': return 'text-golden-saffron';
      case 'out_of_order': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-4xl w-[95vw] h-[90vh] p-0 bg-black",
        "flex flex-col overflow-hidden",
        className
      )}>
        {/* Header */}
        <div className="relative z-10 p-4 bg-black/70 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-tablet-lg font-heading font-bold">
                {t('title')}
              </h2>
              <p className="text-tablet-sm opacity-80">
                {t('instruction')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {hasCamera && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFlashlight}
                  className="text-white hover:bg-white/20"
                  aria-label={isFlashlightOn ? t('flashlightOff') : t('flashlightOn')}
                >
                  {isFlashlightOn ? (
                    <FlashlightOff className="w-6 h-6" />
                  ) : (
                    <Flashlight className="w-6 h-6" />
                  )}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
                aria-label={t('close')}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 relative">
          {scanError ? (
            <div className="flex-1 flex items-center justify-center bg-gray-900 text-white">
              <div className="text-center p-6">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-tablet-lg font-heading font-semibold mb-2">
                  {t('errors.title')}
                </h3>
                <p className="text-tablet-base mb-4 opacity-80">
                  {scanError}
                </p>
                <Button onClick={initializeCamera} variant="outline" className="text-white border-white">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('retry')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Scanning Frame */}
                  <div className="w-64 h-64 border-4 border-white/50 relative">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-krong-red" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-krong-red" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-krong-red" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-krong-red" />
                    
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-krong-red shadow-lg animate-pulse">
                      <div className="w-full h-full bg-gradient-to-r from-transparent via-krong-red to-transparent animate-bounce" />
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
                    <p className="text-white text-tablet-sm bg-black/50 px-4 py-2 rounded-lg">
                      {t('scanInstruction')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Status Indicator */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-2 bg-black/70 text-white px-4 py-2 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-jade-green animate-pulse" />
                  <span className="text-tablet-sm">
                    {hasCamera ? t('scanning') : t('initializing')}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detection Status */}
        {detectedCode && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <Card className="bg-black/80 text-white border-krong-red">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-6 h-6 text-jade-green" />
                  <span className="text-tablet-lg font-semibold">{t('detected')}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {getTypeIcon(scanHistory[0]?.type || 'unknown')}
                    <span className="text-tablet-sm capitalize">
                      {t(`types.${scanHistory[0]?.type || 'unknown'}`)}
                    </span>
                  </div>
                  <div className="text-tablet-xs opacity-80">
                    {t('confidence')}: {Math.round(scanConfidence * 100)}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="relative z-10 p-4 bg-black/70">
          <div className="flex items-center justify-between">
            {/* Left: Camera Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={initializeCamera}
                className="text-white hover:bg-white/20"
                disabled={!scanError}
              >
                <Camera className="w-5 h-5 mr-2" />
                {t('retryCamera')}
              </Button>
            </div>
            
            {/* Center: Info */}
            <div className="text-center text-white text-tablet-sm opacity-80">
              <QrCode className="w-6 h-6 mx-auto mb-1" />
              <p>{t('scanInstruction')}</p>
              {allowedTypes.length < 4 && (
                <p className="text-tablet-xs mt-1">
                  {t('allowedTypes')}: {allowedTypes.map(type => t(`types.${type}`)).join(', ')}
                </p>
              )}
            </div>

            {/* Right: Scan History */}
            {showScanHistory && scanHistory.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-tablet-xs">
                  {scanHistory.length} {t('scanned')}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => setScanHistory([])}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Scan History Panel */}
        {showScanHistory && scanHistory.length > 0 && (
          <div className="absolute bottom-20 right-4 w-80 max-h-96 z-20">
            <Card className="bg-black/90 text-white border-white/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-tablet-sm font-semibold">{t('scanHistory')}</h3>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setScanHistory([])}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 max-h-64 overflow-y-auto">
                <div className="space-y-2 p-4">
                  {scanHistory.map((scan, index) => (
                    <div key={`${scan.data}-${index}`} className="p-3 bg-white/10 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(scan.type)}
                        <span className="text-tablet-sm font-medium capitalize">
                          {t(`types.${scan.type}`)}
                        </span>
                        <Badge 
                          variant={scan.isValid ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {Math.round(scan.confidence * 100)}%
                        </Badge>
                      </div>
                      
                      {scan.type === 'sop' && scan.sopTitle && (
                        <p className="text-tablet-xs opacity-80">{scan.sopTitle}</p>
                      )}
                      
                      {scan.type === 'equipment' && scan.equipment && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getEquipmentTypeIcon(scan.equipment.type)}
                            <span className="text-tablet-xs font-medium">
                              {scan.equipment.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", {
                              'bg-jade-green': scan.equipment.status === 'operational',
                              'bg-golden-saffron': scan.equipment.status === 'maintenance_required',
                              'bg-red-500': scan.equipment.status === 'out_of_order'
                            })} />
                            <span className="text-tablet-xs opacity-80 capitalize">
                              {scan.equipment.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-tablet-xs opacity-60">{scan.equipment.location}</p>
                          
                          {scan.equipment.nextMaintenance && (
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-tablet-xs opacity-60">
                                {t('nextMaintenance')}: {scan.equipment.nextMaintenance}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {scan.type === 'location' && scan.location && (
                        <div className="space-y-1">
                          <p className="text-tablet-xs font-medium">{scan.location.name}</p>
                          <p className="text-tablet-xs opacity-80">
                            {scan.location.zone} - Floor {scan.location.floor}
                          </p>
                        </div>
                      )}
                      
                      {scan.type === 'user' && scan.user && (
                        <div className="space-y-1">
                          <p className="text-tablet-xs font-medium">{scan.user.name}</p>
                          <p className="text-tablet-xs opacity-80 capitalize">
                            {scan.user.role.replace('_', ' ')}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-tablet-xs opacity-40 mt-2 truncate">
                        {scan.data}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerOverlay;