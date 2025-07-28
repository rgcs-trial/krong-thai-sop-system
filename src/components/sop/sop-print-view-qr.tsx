'use client';

import React, { useRef, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, 
  Download, 
  QrCode, 
  FileText,
  Calendar,
  Clock,
  User,
  Building
} from 'lucide-react';

interface SOPDocument {
  id: string;
  title: string;
  category: string;
  version: string;
  difficulty: string;
  estimatedTime: number;
  content: string;
  createdBy: string;
  updatedAt: string;
  restaurant: string;
}

interface SOPPrintViewQRProps {
  /** SOP document data */
  document: SOPDocument;
  /** Show QR code */
  showQRCode?: boolean;
  /** Include metadata in print */
  includeMetadata?: boolean;
  /** Print format */
  format?: 'compact' | 'standard' | 'detailed';
  /** Loading state */
  isLoading?: boolean;
  /** Callback for print action */
  onPrint?: () => void;
  /** Callback for PDF download */
  onDownloadPDF?: () => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * SOPPrintViewQR - Print-optimized view with QR code generation
 */
const SOPPrintViewQR: React.FC<SOPPrintViewQRProps> = ({
  document,
  showQRCode = true,
  includeMetadata = true,
  format = 'standard',
  isLoading = false,
  onPrint,
  onDownloadPDF,
  className
}) => {
  const t = useTranslations('sop.printView');
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeData, setQRCodeData] = useState<string>('');

  // Generate QR code data URL (in real implementation, use QR library)
  const generateQRCode = useCallback(() => {
    const sopUrl = `${window.location.origin}/sop/${document.id}`;
    // In real implementation, use qrcode library to generate data URL
    // For now, we'll create a placeholder
    const placeholder = `data:image/svg+xml,${encodeURIComponent(`
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" fill="white"/>
        <rect x="10" y="10" width="100" height="100" fill="black"/>
        <rect x="20" y="20" width="80" height="80" fill="white"/>
        <text x="60" y="65" text-anchor="middle" font-size="8" fill="black">QR Code</text>
      </svg>
    `)}`;
    setQRCodeData(placeholder);
  }, [document.id]);

  React.useEffect(() => {
    if (showQRCode) {
      generateQRCode();
    }
  }, [showQRCode, generateQRCode]);

  const handlePrint = useCallback(() => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${document.title} - ${t('printTitle')}</title>
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif; 
                  margin: 20px; 
                  line-height: 1.5;
                  color: #231F20;
                }
                .print-header { 
                  display: flex; 
                  justify-content: space-between; 
                  align-items: flex-start; 
                  margin-bottom: 30px; 
                  padding-bottom: 20px; 
                  border-bottom: 2px solid #E31B23; 
                }
                .print-title { 
                  font-size: 24px; 
                  font-weight: bold; 
                  color: #E31B23; 
                  margin: 0; 
                }
                .print-metadata { 
                  font-size: 12px; 
                  color: #666; 
                }
                .print-content { 
                  margin: 20px 0; 
                  font-size: 14px; 
                  line-height: 1.6; 
                }
                .print-qr { 
                  text-align: center; 
                  margin-top: 30px; 
                  padding-top: 20px; 
                  border-top: 1px solid #ccc; 
                }
                .badge { 
                  display: inline-block; 
                  padding: 4px 8px; 
                  background: #f0f0f0; 
                  border: 1px solid #ccc; 
                  border-radius: 4px; 
                  font-size: 12px; 
                  margin-right: 8px; 
                }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
    onPrint?.();
  }, [document.title, t, onPrint]);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Print Controls */}
      <Card className="border-2 no-print">
        <CardHeader className="pb-3">
          <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
            <Printer className="w-5 h-5" />
            {t('printOptions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="default"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {t('print')}
            </Button>
            
            <Button
              variant="outline"
              onClick={onDownloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('downloadPDF')}
            </Button>
            
            <div className="flex items-center gap-2 text-tablet-sm text-muted-foreground">
              <span>{t('format')}:</span>
              <Badge variant="outline" className="text-tablet-xs">
                {t(`formats.${format}`)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Content */}
      <div ref={printRef} className="print-content">
        {/* Print Header */}
        <div className="print-header">
          <div className="flex-1">
            <h1 className="print-title">{document.title}</h1>
            {includeMetadata && (
              <div className="print-metadata mt-2 space-y-1">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="badge">
                    {document.category}
                  </span>
                  <span className="badge">
                    {t(`difficulty.${document.difficulty}`)}
                  </span>
                  <span className="badge">
                    <Clock className="w-3 h-3 mr-1 inline" />
                    {document.estimatedTime}m
                  </span>
                  <span className="badge">
                    v{document.version}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {showQRCode && qrCodeData && (
            <div className="flex-shrink-0 text-center">
              <img 
                src={qrCodeData} 
                alt={t('qrCodeAlt')}
                className="w-24 h-24 border border-gray-300"
              />
              <p className="text-xs text-gray-600 mt-1">
                {t('scanForDigital')}
              </p>
            </div>
          )}
        </div>

        {/* Document Content */}
        <div className="print-content">
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        </div>

        {/* Footer Metadata */}
        {includeMetadata && (
          <div className="print-qr">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <div>
                  <div className="font-medium">{t('restaurant')}</div>
                  <div>{document.restaurant}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <div>
                  <div className="font-medium">{t('createdBy')}</div>
                  <div>{document.createdBy}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <div>
                  <div className="font-medium">{t('lastUpdated')}</div>
                  <div>{new Date(document.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <div>
                  <div className="font-medium">{t('documentId')}</div>
                  <div className="font-mono text-xs">{document.id}</div>
                </div>
              </div>
            </div>
            
            <div className="text-center text-xs text-gray-500">
              <p>{t('printFooter', { 
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
              })}</p>
              {showQRCode && (
                <p className="mt-1">
                  {t('qrCodeInstructions')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOPPrintViewQR;