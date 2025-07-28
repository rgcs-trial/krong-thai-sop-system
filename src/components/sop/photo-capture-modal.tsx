'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Download, 
  Upload, 
  Check,
  AlertTriangle,
  Image as ImageIcon,
  Trash2,
  ZoomIn,
  ZoomOut,
  FlipHorizontal,
  Edit3,
  Square,
  Circle,
  ArrowRight,
  Type,
  Palette,
  Undo,
  Redo,
  Save
} from 'lucide-react';

interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'square' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  filename: string;
  size: number;
  annotations?: Annotation[];
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string;
}

interface PhotoCaptureModalProps {
  /** Modal open state */
  isOpen: boolean;
  /** Step ID for photo association */
  stepId: string;
  /** Step title for context */
  stepTitle: string;
  /** Maximum number of photos allowed */
  maxPhotos?: number;
  /** Required photo quality (0.1 - 1.0) */
  photoQuality?: number;
  /** Maximum file size in MB */
  maxFileSize?: number;
  /** Accepted file types */
  acceptedTypes?: string[];
  /** Existing photos */
  existingPhotos?: CapturedPhoto[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Callback when photos are captured */
  onPhotosCapture: (stepId: string, photos: CapturedPhoto[]) => void;
  /** Callback when photo is deleted */
  onPhotoDelete?: (photoId: string) => void;
  /** Callback when photo annotations are updated */
  onAnnotationsUpdate?: (photoId: string, annotations: Annotation[]) => void;
  /** Callback when photo verification status changes */
  onVerificationStatusChange?: (photoId: string, status: 'approved' | 'rejected', notes?: string) => void;
  /** Enable annotation tools */
  enableAnnotations?: boolean;
  /** Enable step-by-step verification */
  enableVerification?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * PhotoCaptureModal - Tablet-optimized photo capture modal for SOP verification
 * 
 * Features:
 * - Camera integration with tablet optimization
 * - Multiple photo capture and management
 * - File upload from device gallery
 * - Photo preview with zoom functionality
 * - Image compression and quality control
 * - Touch-friendly interface with large targets
 * - Accessibility support with ARIA labels
 * - Real-time validation and error handling
 * 
 * @param props PhotoCaptureModalProps
 * @returns JSX.Element
 */
const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  stepId,
  stepTitle,
  maxPhotos = 5,
  photoQuality = 0.8,
  maxFileSize = 10, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  existingPhotos = [],
  isLoading = false,
  onClose,
  onPhotosCapture,
  onPhotoDelete,
  onAnnotationsUpdate,
  onVerificationStatusChange,
  enableAnnotations = true,
  enableVerification = true,
  className
}) => {
  const t = useTranslations('sop.photoCapture');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photos, setPhotos] = useState<CapturedPhoto[]>(existingPhotos);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Annotation states
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [currentTool, setCurrentTool] = useState<'arrow' | 'circle' | 'square' | 'text'>('arrow');
  const [currentColor, setCurrentColor] = useState('#E31B23'); // Krong Thai red
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationHistory, setAnnotationHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen && !isCameraActive) {
      initializeCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Update photos when existingPhotos change
  useEffect(() => {
    setPhotos(existingPhotos);
  }, [existingPhotos]);

  const initializeCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      setCameraError(t('errors.cameraAccess'));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Canvas context not available');
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob with specified quality
      const dataUrl = canvas.toDataURL('image/jpeg', photoQuality);
      
      // Create photo object
      const newPhoto: CapturedPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dataUrl,
        timestamp: new Date().toISOString(),
        filename: `step_${stepId}_photo_${Date.now()}.jpg`,
        size: Math.round(dataUrl.length * 0.75) // Approximate size
      };
      
      // Check file size
      if (newPhoto.size > maxFileSize * 1024 * 1024) {
        throw new Error(t('errors.fileTooLarge', { size: maxFileSize }));
      }
      
      // Add to photos array
      setPhotos(prev => {
        const updated = [...prev, newPhoto];
        if (updated.length > maxPhotos) {
          return updated.slice(-maxPhotos); // Keep only the last N photos
        }
        return updated;
      });
      
    } catch (error) {
      console.error('Photo capture error:', error);
      setCameraError(error instanceof Error ? error.message : t('errors.captureFailure'));
    } finally {
      setIsCapturing(false);
    }
  }, [stepId, photoQuality, maxFileSize, maxPhotos, t, isCapturing]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        setCameraError(t('errors.invalidFileType'));
        return;
      }
      
      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        setCameraError(t('errors.fileTooLarge', { size: maxFileSize }));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        const newPhoto: CapturedPhoto = {
          id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          timestamp: new Date().toISOString(),
          filename: file.name,
          size: file.size
        };
        
        setPhotos(prev => {
          const updated = [...prev, newPhoto];
          if (updated.length > maxPhotos) {
            return updated.slice(-maxPhotos);
          }
          return updated;
        });
      };
      
      reader.readAsDataURL(file);
    });
    
    // Reset input
    event.target.value = '';
  }, [acceptedTypes, maxFileSize, maxPhotos, t]);

  const deletePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    onPhotoDelete?.(photoId);
    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(null);
    }
  }, [onPhotoDelete, selectedPhotoId]);

  const handleSave = useCallback(() => {
    onPhotosCapture(stepId, photos);
    onClose();
  }, [stepId, photos, onPhotosCapture, onClose]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // Annotation functions
  const saveAnnotationState = useCallback(() => {
    const newHistory = annotationHistory.slice(0, historyIndex + 1);
    newHistory.push([...annotations]);
    setAnnotationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [annotations, annotationHistory, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations([...annotationHistory[historyIndex - 1]]);
    }
  }, [historyIndex, annotationHistory]);

  const redo = useCallback(() => {
    if (historyIndex < annotationHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations([...annotationHistory[historyIndex + 1]]);
    }
  }, [historyIndex, annotationHistory]);

  const startAnnotation = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotating) return;
    
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newAnnotation: Annotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: currentTool,
      x,
      y,
      color: currentColor,
      strokeWidth,
      ...(currentTool === 'text' && { text: 'Edit text' })
    };
    
    setCurrentAnnotation(newAnnotation);
    setIsDrawing(true);
  }, [isAnnotating, currentTool, currentColor, strokeWidth]);

  const updateAnnotation = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'circle' || currentTool === 'square') {
      const width = Math.abs(x - currentAnnotation.x);
      const height = Math.abs(y - currentAnnotation.y);
      setCurrentAnnotation({
        ...currentAnnotation,
        width,
        height
      });
    }
  }, [isDrawing, currentAnnotation, currentTool]);

  const finishAnnotation = useCallback(() => {
    if (!currentAnnotation) return;
    
    saveAnnotationState();
    setAnnotations(prev => [...prev, currentAnnotation]);
    setCurrentAnnotation(null);
    setIsDrawing(false);
  }, [currentAnnotation, saveAnnotationState]);

  const deleteAnnotation = useCallback((annotationId: string) => {
    saveAnnotationState();
    setAnnotations(prev => prev.filter(a => a.id !== annotationId));
  }, [saveAnnotationState]);

  const saveAnnotations = useCallback(() => {
    if (selectedPhotoId && onAnnotationsUpdate) {
      onAnnotationsUpdate(selectedPhotoId, annotations);
      
      // Update the photo with annotations
      setPhotos(prev => prev.map(photo => 
        photo.id === selectedPhotoId 
          ? { ...photo, annotations }
          : photo
      ));
    }
    setIsAnnotating(false);
    setAnnotations([]);
    setAnnotationHistory([]);
    setHistoryIndex(-1);
  }, [selectedPhotoId, annotations, onAnnotationsUpdate]);

  const handleVerificationStatusChange = useCallback((photoId: string, status: 'approved' | 'rejected', notes?: string) => {
    onVerificationStatusChange?.(photoId, status, notes);
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, verificationStatus: status, verificationNotes: notes }
        : photo
    ));
  }, [onVerificationStatusChange]);

  // Load annotations when photo is selected
  useEffect(() => {
    if (selectedPhotoId) {
      const photo = photos.find(p => p.id === selectedPhotoId);
      if (photo?.annotations) {
        setAnnotations(photo.annotations);
        setAnnotationHistory([photo.annotations]);
        setHistoryIndex(0);
      } else {
        setAnnotations([]);
        setAnnotationHistory([]);
        setHistoryIndex(-1);
      }
    }
  }, [selectedPhotoId, photos]);

  // Draw annotations on canvas
  useEffect(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas || !isAnnotating) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw existing annotations
    [...annotations, ...(currentAnnotation ? [currentAnnotation] : [])].forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.strokeWidth;
      ctx.setLineDash([]);
      
      switch (annotation.type) {
        case 'circle':
          if (annotation.width && annotation.height) {
            ctx.beginPath();
            ctx.ellipse(
              annotation.x + annotation.width / 2,
              annotation.y + annotation.height / 2,
              annotation.width / 2,
              annotation.height / 2,
              0, 0, 2 * Math.PI
            );
            ctx.stroke();
          }
          break;
        case 'square':
          if (annotation.width && annotation.height) {
            ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          }
          break;
        case 'arrow':
          if (annotation.width && annotation.height) {
            const endX = annotation.x + annotation.width;
            const endY = annotation.y + annotation.height;
            
            // Draw line
            ctx.beginPath();
            ctx.moveTo(annotation.x, annotation.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Draw arrowhead
            const angle = Math.atan2(annotation.height, annotation.width);
            const arrowLength = 15;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - arrowLength * Math.cos(angle - Math.PI / 6),
              endY - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - arrowLength * Math.cos(angle + Math.PI / 6),
              endY - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;
        case 'text':
          if (annotation.text) {
            ctx.font = `${annotation.strokeWidth * 8}px Inter`;
            ctx.fillStyle = annotation.color;
            ctx.fillText(annotation.text, annotation.x, annotation.y);
          }
          break;
      }
    });
  }, [annotations, currentAnnotation, isAnnotating]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-4xl w-[95vw] h-[90vh] flex flex-col",
        "p-0 gap-0 overflow-hidden",
        className
      )}>
        <DialogHeader className="p-6 pb-4 border-b-2 border-border/40">
          <DialogTitle className="text-tablet-xl font-heading font-bold text-krong-black">
            {t('title')}
          </DialogTitle>
          <p className="text-tablet-base font-body text-muted-foreground">
            {t('subtitle', { step: stepTitle })}
          </p>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Camera Section */}
          <div className="flex-1 flex flex-col bg-black relative">
            {cameraError ? (
              <div className="flex-1 flex items-center justify-center bg-gray-100">
                <div className="text-center p-6">
                  <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-tablet-lg font-heading font-semibold text-red-600 mb-2">
                    {t('errors.title')}
                  </h3>
                  <p className="text-tablet-base font-body text-muted-foreground mb-4">
                    {cameraError}
                  </p>
                  <Button onClick={initializeCamera} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('retryCamera')}
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
                  className="flex-1 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Camera Controls */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center gap-4 bg-black/70 rounded-lg p-4">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-white hover:bg-white/20"
                      aria-label={t('uploadPhoto')}
                    >
                      <Upload className="w-6 h-6" />
                    </Button>
                    
                    <Button
                      variant="default"
                      size="icon-xl"
                      onClick={capturePhoto}
                      disabled={!isCameraActive || isCapturing || photos.length >= maxPhotos}
                      className="bg-krong-red hover:bg-krong-red/90"
                      aria-label={t('capturePhoto')}
                    >
                      <Camera className="w-8 h-8" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={initializeCamera}
                      className="text-white hover:bg-white/20"
                      aria-label={t('retryCamera')}
                    >
                      <RotateCcw className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Photos Section */}
          <div className="w-full lg:w-96 flex flex-col border-l-2 border-border/40 bg-krong-white">
            <div className="p-4 border-b-2 border-border/40">
              <div className="flex items-center justify-between">
                <h3 className="text-tablet-lg font-heading font-semibold text-krong-black">
                  {t('photos.title')}
                </h3>
                <Badge variant="secondary" className="text-tablet-sm">
                  {photos.length}/{maxPhotos}
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {photos.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-tablet-sm font-body text-muted-foreground">
                    {t('photos.empty')}
                  </p>
                </div>
              ) : (
                photos.map((photo) => (
                  <Card 
                    key={photo.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      selectedPhotoId === photo.id && "border-krong-red bg-krong-red/5"
                    )}
                    onClick={() => setSelectedPhotoId(photo.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={photo.dataUrl}
                            alt={photo.filename}
                            className="w-16 h-16 object-cover rounded border"
                          />
                          {/* Verification Status Badge */}
                          {enableVerification && photo.verificationStatus && (
                            <div className={cn(
                              "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                              photo.verificationStatus === 'approved' && "bg-jade-green",
                              photo.verificationStatus === 'rejected' && "bg-red-500",
                              photo.verificationStatus === 'pending' && "bg-golden-saffron"
                            )} />
                          )}
                          {/* Annotation Indicator */}
                          {photo.annotations && photo.annotations.length > 0 && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-krong-red rounded-full border-2 border-white flex items-center justify-center">
                              <Edit3 className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-tablet-sm font-body font-medium truncate">
                            {photo.filename}
                          </p>
                          <p className="text-tablet-xs text-muted-foreground">
                            {formatFileSize(photo.size)}
                          </p>
                          <p className="text-tablet-xs text-muted-foreground">
                            {new Date(photo.timestamp).toLocaleTimeString()}
                          </p>
                          {/* Verification Status */}
                          {enableVerification && photo.verificationStatus && (
                            <Badge 
                              variant={photo.verificationStatus === 'approved' ? 'default' : 'destructive'}
                              className="text-tablet-xs mt-1"
                            >
                              {t(`verification.${photo.verificationStatus}`)}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhoto(photo.id);
                          }}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                          aria-label={t('deletePhoto')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t-2 border-border/40 space-y-3">
              <div className="flex items-center justify-between text-tablet-xs text-muted-foreground">
                <span>{t('maxPhotos', { count: maxPhotos })}</span>
                <span>{t('maxSize', { size: maxFileSize })}</span>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="default"
                  onClick={handleSave}
                  className="flex-1"
                  disabled={isLoading || photos.length === 0}
                >
                  {isLoading ? (
                    t('saving')
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t('save')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Photo Preview Modal with Annotations */}
        {selectedPhotoId && (
          <Dialog open={!!selectedPhotoId} onOpenChange={() => {
            setSelectedPhotoId(null);
            setIsAnnotating(false);
            setAnnotations([]);
          }}>
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col">
              {(() => {
                const photo = photos.find(p => p.id === selectedPhotoId);
                if (!photo) return null;
                
                return (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="flex items-center gap-3">
                        <h3 className="text-tablet-lg font-heading font-semibold">
                          {photo.filename}
                        </h3>
                        {enableVerification && photo.verificationStatus && (
                          <Badge 
                            variant={photo.verificationStatus === 'approved' ? 'default' : 'destructive'}
                            className="text-tablet-sm"
                          >
                            {t(`verification.${photo.verificationStatus}`)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {enableAnnotations && (
                          <Button
                            variant={isAnnotating ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsAnnotating(!isAnnotating)}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            {isAnnotating ? t('annotations.exit') : t('annotations.add')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPhotoId(null);
                            setIsAnnotating(false);
                            setAnnotations([]);
                          }}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Annotation Toolbar */}
                    {isAnnotating && enableAnnotations && (
                      <div className="p-4 bg-gray-50 border-b">
                        <div className="flex items-center justify-between gap-4">
                          {/* Tools */}
                          <div className="flex items-center gap-2">
                            <span className="text-tablet-sm font-medium mr-2">{t('annotations.tools')}:</span>
                            <Button
                              variant={currentTool === 'arrow' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentTool('arrow')}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={currentTool === 'circle' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentTool('circle')}
                            >
                              <Circle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={currentTool === 'square' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentTool('square')}
                            >
                              <Square className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={currentTool === 'text' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentTool('text')}
                            >
                              <Type className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Color Picker */}
                          <div className="flex items-center gap-2">
                            <span className="text-tablet-sm font-medium">{t('annotations.color')}:</span>
                            <input
                              type="color"
                              value={currentColor}
                              onChange={(e) => setCurrentColor(e.target.value)}
                              className="w-8 h-8 rounded border cursor-pointer"
                            />
                          </div>

                          {/* Stroke Width */}
                          <div className="flex items-center gap-2">
                            <span className="text-tablet-sm font-medium">{t('annotations.width')}:</span>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={strokeWidth}
                              onChange={(e) => setStrokeWidth(Number(e.target.value))}
                              className="w-16"
                            />
                            <span className="text-tablet-xs w-6">{strokeWidth}</span>
                          </div>

                          {/* History Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={undo}
                              disabled={historyIndex <= 0}
                            >
                              <Undo className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={redo}
                              disabled={historyIndex >= annotationHistory.length - 1}
                            >
                              <Redo className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Save Annotations */}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={saveAnnotations}
                            disabled={annotations.length === 0}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {t('annotations.save')}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Image Container */}
                    <div className="flex-1 relative bg-gray-100 overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative max-w-full max-h-full">
                          <img
                            src={photo.dataUrl}
                            alt={photo.filename}
                            className="max-w-full max-h-full object-contain"
                            style={{ maxHeight: 'calc(100vh - 200px)' }}
                          />
                          
                          {/* Annotation Canvas Overlay */}
                          {isAnnotating && enableAnnotations && (
                            <canvas
                              ref={annotationCanvasRef}
                              className="absolute inset-0 cursor-crosshair"
                              width={800}
                              height={600}
                              onMouseDown={startAnnotation}
                              onMouseMove={updateAnnotation}
                              onMouseUp={finishAnnotation}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="p-4 border-t bg-white">
                      <div className="flex items-center justify-between">
                        {/* Basic Controls */}
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <ZoomOut className="w-4 h-4 mr-2" />
                            {t('zoom.out')}
                          </Button>
                          <Button variant="outline" size="sm">
                            <ZoomIn className="w-4 h-4 mr-2" />
                            {t('zoom.in')}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            {t('download')}
                          </Button>
                        </div>

                        {/* Verification Controls */}
                        {enableVerification && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerificationStatusChange(photo.id, 'rejected')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4 mr-2" />
                              {t('verification.reject')}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleVerificationStatusChange(photo.id, 'approved')}
                              className="bg-jade-green hover:bg-jade-green/90"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {t('verification.approve')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhotoCaptureModal;