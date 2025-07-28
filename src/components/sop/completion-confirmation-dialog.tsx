'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  X, 
  PenTool, 
  RotateCcw, 
  Save,
  AlertTriangle,
  Clock,
  User,
  FileText
} from 'lucide-react';

interface CompletionData {
  stepId: string;
  completedAt: string;
  timeSpent: number; // in seconds
  signature?: string;
  notes?: string;
  photos?: string[];
}

interface CompletionConfirmationDialogProps {
  /** Dialog open state */
  isOpen: boolean;
  /** SOP document title */
  sopTitle: string;
  /** Step title being completed */
  stepTitle: string;
  /** Step ID */
  stepId: string;
  /** Time spent on this step */
  timeSpent: number;
  /** Require signature for completion */
  requireSignature?: boolean;
  /** Allow notes input */
  allowNotes?: boolean;
  /** Show completion summary */
  showSummary?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when completion is confirmed */
  onConfirmCompletion: (data: CompletionData) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * CompletionConfirmationDialog - Dialog for confirming SOP step completion
 * 
 * Features:
 * - Digital signature pad with touch optimization
 * - Notes input for additional documentation
 * - Completion summary with time tracking
 * - Tablet-friendly interface with large touch targets
 * - Real-time signature validation
 * - Accessibility support with ARIA labels
 * - Brand-consistent styling
 * 
 * @param props CompletionConfirmationDialogProps
 * @returns JSX.Element
 */
const CompletionConfirmationDialog: React.FC<CompletionConfirmationDialogProps> = ({
  isOpen,
  sopTitle,
  stepTitle,
  stepId,
  timeSpent,
  requireSignature = true,
  allowNotes = true,
  showSummary = true,
  isLoading = false,
  onClose,
  onConfirmCompletion,
  className
}) => {
  const t = useTranslations('sop.completion');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [notes, setNotes] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    if (seconds < 60) {
      return t('time.seconds', { count: seconds });
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return t('time.minutes', { count: minutes });
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return t('time.hoursMinutes', { hours, minutes });
    }
  }, [t]);

  // Signature pad functionality
  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, []);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#231F20'; // Krong Thai black
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      setHasSignature(true);
    }
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      setSignatureData(canvas.toDataURL());
    }
  }, [hasSignature]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        setSignatureData(null);
      }
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (requireSignature && !hasSignature) {
      return; // Don't proceed if signature is required but not provided
    }

    const completionData: CompletionData = {
      stepId,
      completedAt: new Date().toISOString(),
      timeSpent,
      signature: signatureData || undefined,
      notes: notes.trim() || undefined
    };

    onConfirmCompletion(completionData);
  }, [stepId, timeSpent, signatureData, notes, hasSignature, requireSignature, onConfirmCompletion]);

  const isValid = !requireSignature || hasSignature;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto",
        className
      )}>
        <DialogHeader>
          <DialogTitle className="text-tablet-xl font-heading font-bold text-krong-black">
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Completion Summary */}
          {showSummary && (
            <Card className="border-2 border-jade-green bg-jade-green/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <CheckCircle className="w-12 h-12 text-jade-green flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-tablet-lg font-heading font-semibold text-jade-green">
                      {t('stepCompleted')}
                    </h3>
                    <p className="text-tablet-base font-body text-muted-foreground">
                      {stepTitle}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-tablet-xs text-muted-foreground">
                        {t('sop')}
                      </p>
                      <p className="text-tablet-sm font-body font-medium truncate">
                        {sopTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-tablet-xs text-muted-foreground">
                        {t('timeSpent')}
                      </p>
                      <p className="text-tablet-sm font-body font-medium">
                        {formatDuration(timeSpent)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-tablet-xs text-muted-foreground">
                        {t('completedAt')}
                      </p>
                      <p className="text-tablet-sm font-body font-medium">
                        {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Digital Signature */}
          {requireSignature && (
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-tablet-lg font-heading font-semibold text-krong-black">
                    {t('signature.title')}
                  </h3>
                  {requireSignature && (
                    <Badge variant="destructive" className="text-tablet-xs">
                      {t('required')}
                    </Badge>
                  )}
                </div>
                
                <p className="text-tablet-sm font-body text-muted-foreground mb-4">
                  {t('signature.instruction')}
                </p>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border/60 rounded-lg bg-gray-50">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={200}
                      className="w-full h-48 cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      aria-label={t('signature.pad')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-muted-foreground" />
                      <span className="text-tablet-sm font-body text-muted-foreground">
                        {hasSignature ? t('signature.captured') : t('signature.empty')}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                      disabled={!hasSignature}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {t('signature.clear')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Section */}
          {allowNotes && (
            <Card className="border-2">
              <CardContent className="p-6">
                <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-4">
                  {t('notes.title')}
                </h3>
                
                <p className="text-tablet-sm font-body text-muted-foreground mb-4">
                  {t('notes.placeholder')}
                </p>

                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('notes.input')}
                  className="min-h-[120px] text-tablet-base"
                  maxLength={500}
                />
                
                <div className="flex justify-between text-tablet-xs text-muted-foreground mt-2">
                  <span>{t('notes.optional')}</span>
                  <span>{notes.length}/500</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Warning */}
          {requireSignature && !hasSignature && (
            <Card className="border-2 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-tablet-sm font-body text-red-600">
                    {t('validation.signatureRequired')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t-2 border-border/40">
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
              onClick={handleConfirm}
              className="flex-1"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                t('confirming')
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('confirm')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionConfirmationDialog;