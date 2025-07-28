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
  /** Callback when scanner closes */
  onClose: () => void;
  /** Callback when QR code is scanned */
  onScanComplete: (result: QRScanResult) => void;
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
  onClose,
  onScanComplete,
  className
}) => {
  const t = useTranslations('sop.qrScanner');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);
  
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

  const detectQRCode = useCallback((canvas: HTMLCanvasElement) => {
    // Throttle scanning to avoid multiple rapid scans
    const now = Date.now();
    if (now - lastScanTime < 1000) return;
    
    // Simulated QR detection - in real implementation, use jsQR or similar
    // This would analyze the canvas data for QR codes
    const simulateQRDetection = () => {
      // For demo purposes, we'll randomly "detect" a QR code
      if (Math.random() > 0.98) { // 2% chance per frame
        const mockResult: QRScanResult = {
          data: 'sop://krong-thai/procedures/food-safety-001',
          sopId: 'food-safety-001',
          sopTitle: 'Hand Washing Procedure',
          category: 'Food Safety',
          isValid: true
        };
        
        setLastScanTime(now);
        onScanComplete(mockResult);
      }
    };
    
    simulateQRDetection();
  }, [lastScanTime, onScanComplete]);

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

        {/* Bottom Controls */}
        <div className="relative z-10 p-4 bg-black/70">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              onClick={initializeCamera}
              className="text-white hover:bg-white/20"
              disabled={!scanError}
            >
              <Camera className="w-5 h-5 mr-2" />
              {t('retryCamera')}
            </Button>
            
            <div className="text-center text-white text-tablet-sm opacity-80">
              <QrCode className="w-6 h-6 mx-auto mb-1" />
              <p>{t('qrCodeRequired')}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerOverlay;