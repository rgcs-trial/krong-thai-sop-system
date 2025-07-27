/**
 * Training Certificates Management Component
 * Displays and manages training certificates with verification
 * Optimized for tablet experience with touch-friendly interactions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Award,
  Download,
  ExternalLink,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Search,
  Filter,
  Printer,
  Mail,
  RotateCcw,
  Eye,
  Star,
  Clock
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

import { useTrainingCertificates } from '@/lib/stores/training-store';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

import type { TrainingCertificate } from '@/types/database';

interface TrainingCertificatesProps {
  userId?: string;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

interface CertificateWithStatus extends TrainingCertificate {
  is_expired: boolean;
  is_expiring_soon: boolean;
  days_until_expiry: number;
  can_renew: boolean;
}

export function TrainingCertificates({ 
  userId, 
  className,
  showActions = true,
  compact = false
}: TrainingCertificatesProps) {
  const { t, locale } = useI18n();
  
  // Training store hooks
  const {
    certificates,
    loadCertificates,
    downloadCertificate,
    verifyCertificate,
  } = useTrainingCertificates();

  // Local state
  const [filteredCertificates, setFilteredCertificates] = useState<CertificateWithStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expirationFilter, setExpirationFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithStatus | null>(null);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationNumber, setVerificationNumber] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Load certificates on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await loadCertificates(userId);
      } catch (error) {
        console.error('Error loading certificates:', error);
        toast({
          title: t('error.certificates_load_failed'),
          description: t('error.certificates_load_failed_desc'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId, loadCertificates, t]);

  // Process certificates with status calculations
  useEffect(() => {
    const processed = certificates.map(cert => {
      const now = new Date();
      const expiresAt = new Date(cert.expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...cert,
        is_expired: expiresAt < now,
        is_expiring_soon: daysUntilExpiry <= 30 && daysUntilExpiry > 0,
        days_until_expiry: daysUntilExpiry,
        can_renew: daysUntilExpiry <= 60
      } as CertificateWithStatus;
    });

    setFilteredCertificates(processed);
  }, [certificates]);

  // Apply filters
  useEffect(() => {
    let filtered = certificates.map(cert => {
      const now = new Date();
      const expiresAt = new Date(cert.expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...cert,
        is_expired: expiresAt < now,
        is_expiring_soon: daysUntilExpiry <= 30 && daysUntilExpiry > 0,
        days_until_expiry: daysUntilExpiry,
        can_renew: daysUntilExpiry <= 60
      } as CertificateWithStatus;
    });

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(cert => {
        const moduleTitle = locale === 'th' ? cert.module?.title_th : cert.module?.title;
        const categoryName = locale === 'th' ? cert.module?.sop_document?.category?.name_th : cert.module?.sop_document?.category?.name;
        
        return (
          cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          moduleTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cert => cert.status === statusFilter);
    }

    // Apply expiration filter
    if (expirationFilter === 'active') {
      filtered = filtered.filter(cert => cert.status === 'active' && !cert.is_expired);
    } else if (expirationFilter === 'expiring_soon') {
      filtered = filtered.filter(cert => cert.is_expiring_soon);
    } else if (expirationFilter === 'expired') {
      filtered = filtered.filter(cert => cert.is_expired || cert.status === 'expired');
    }

    setFilteredCertificates(filtered);
  }, [certificates, searchTerm, statusFilter, expirationFilter, locale]);

  // Handle certificate download
  const handleDownload = async (certificateId: string) => {
    try {
      const downloadUrl = await downloadCertificate(certificateId);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `certificate_${certificateId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        window.URL.revokeObjectURL(downloadUrl);
        
        toast({
          title: t('training.certificate_downloaded'),
          description: t('training.certificate_downloaded_desc'),
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Certificate download error:', error);
      toast({
        title: t('error.certificate_download_failed'),
        description: t('error.certificate_download_failed_desc'),
        variant: 'destructive',
      });
    }
  };

  // Handle certificate verification
  const handleVerification = async () => {
    if (!verificationNumber.trim()) {
      toast({
        title: t('error.certificate_number_required'),
        description: t('error.certificate_number_required_desc'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await verifyCertificate(verificationNumber.trim());
      setVerificationResult(result);
      
      if (result) {
        toast({
          title: result.valid ? t('training.certificate_valid') : t('training.certificate_invalid'),
          description: result.valid 
            ? t('training.certificate_valid_desc') 
            : t('training.certificate_invalid_desc'),
          variant: result.valid ? 'default' : 'destructive',
        });
      }
    } catch (error) {
      console.error('Certificate verification error:', error);
      toast({
        title: t('error.certificate_verification_failed'),
        description: t('error.certificate_verification_failed_desc'),
        variant: 'destructive',
      });
    }
  };

  // Get status badge
  const getStatusBadge = (certificate: CertificateWithStatus) => {
    if (certificate.status === 'revoked') {
      return <Badge variant="destructive">{t('training.revoked')}</Badge>;
    } else if (certificate.is_expired) {
      return <Badge variant="secondary">{t('training.expired')}</Badge>;
    } else if (certificate.is_expiring_soon) {
      return <Badge variant="secondary">{t('training.expiring_soon')}</Badge>;
    } else if (certificate.status === 'active') {
      return <Badge variant="default">{t('training.active')}</Badge>;
    }
    return null;
  };

  // Get expiry warning icon
  const getExpiryIcon = (certificate: CertificateWithStatus) => {
    if (certificate.is_expired) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else if (certificate.is_expiring_soon) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    } else if (certificate.status === 'active') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RotateCcw className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('training.loading_certificates')}</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">{t('training.certificates')}</h2>
            <p className="text-muted-foreground mt-1">
              {t('training.certificates_desc')}
            </p>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowVerificationDialog(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                {t('training.verify_certificate')}
              </Button>
              <Button variant="outline" onClick={() => loadCertificates(userId)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('common.refresh')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium">{t('common.search')}:</span>
            </div>
            
            <Input
              placeholder={t('training.search_certificates')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 max-w-sm"
            />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('training.all_statuses')}</SelectItem>
                <SelectItem value="active">{t('training.active')}</SelectItem>
                <SelectItem value="expired">{t('training.expired')}</SelectItem>
                <SelectItem value="revoked">{t('training.revoked')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={expirationFilter} onValueChange={setExpirationFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('training.all_certificates')}</SelectItem>
                <SelectItem value="active">{t('training.currently_active')}</SelectItem>
                <SelectItem value="expiring_soon">{t('training.expiring_soon')}</SelectItem>
                <SelectItem value="expired">{t('training.expired')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Certificates Grid */}
      {filteredCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => {
            const moduleTitle = locale === 'th' ? certificate.module?.title_th : certificate.module?.title;
            const categoryName = locale === 'th' 
              ? certificate.module?.sop_document?.category?.name_th 
              : certificate.module?.sop_document?.category?.name;

            return (
              <Card 
                key={certificate.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedCertificate(certificate);
                  setShowCertificateDialog(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      <CardTitle className="text-base">{moduleTitle}</CardTitle>
                    </div>
                    {getExpiryIcon(certificate)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(certificate)}
                    <Badge variant="outline">{categoryName}</Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('training.certificate_number')}:</span>
                      <span className="font-mono text-xs">{certificate.certificate_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('training.issued')}:</span>
                      <span>{new Date(certificate.issued_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('training.expires')}:</span>
                      <span className={certificate.is_expiring_soon ? 'text-orange-600 font-medium' : ''}>
                        {new Date(certificate.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                    {certificate.assessment && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('training.score')}:</span>
                        <span className="font-medium">{certificate.assessment.score_percentage}%</span>
                      </div>
                    )}
                  </div>

                  {certificate.is_expiring_soon && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                      {t('training.expires_in_days', { days: certificate.days_until_expiry })}
                    </div>
                  )}

                  {showActions && (
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(certificate.id);
                        }}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {t('common.download')}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCertificate(certificate);
                          setShowCertificateDialog(true);
                        }}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {t('common.view')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('training.no_certificates')}</h3>
            <p className="text-muted-foreground">
              {t('training.no_certificates_desc')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Certificate Detail Dialog */}
      <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span>{t('training.certificate_details')}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedCertificate && (
            <div className="space-y-6">
              {/* Certificate Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-bold">
                  {locale === 'th' ? selectedCertificate.module?.title_th : selectedCertificate.module?.title}
                </h3>
                <p className="text-muted-foreground">
                  {locale === 'th' 
                    ? selectedCertificate.module?.sop_document?.category?.name_th
                    : selectedCertificate.module?.sop_document?.category?.name}
                </p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  {getStatusBadge(selectedCertificate)}
                  {getExpiryIcon(selectedCertificate)}
                </div>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-muted-foreground">{t('training.certificate_number')}</label>
                  <p className="font-mono">{selectedCertificate.certificate_number}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">{t('training.status')}</label>
                  <p>{selectedCertificate.status}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">{t('training.issued_date')}</label>
                  <p>{new Date(selectedCertificate.issued_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">{t('training.expiry_date')}</label>
                  <p className={selectedCertificate.is_expiring_soon ? 'text-orange-600 font-medium' : ''}>
                    {new Date(selectedCertificate.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedCertificate.assessment && (
                  <>
                    <div>
                      <label className="font-medium text-muted-foreground">{t('training.assessment_score')}</label>
                      <p className="font-medium">{selectedCertificate.assessment.score_percentage}%</p>
                    </div>
                    <div>
                      <label className="font-medium text-muted-foreground">{t('training.completed_date')}</label>
                      <p>{new Date(selectedCertificate.assessment.completed_at).toLocaleDateString()}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  onClick={() => handleDownload(selectedCertificate.id)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('training.download_certificate')}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    setVerificationNumber(selectedCertificate.certificate_number);
                    setShowVerificationDialog(true);
                  }}
                  className="flex-1"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {t('training.verify_certificate')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Certificate Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span>{t('training.verify_certificate')}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('training.certificate_number')}</label>
              <Input
                value={verificationNumber}
                onChange={(e) => setVerificationNumber(e.target.value)}
                placeholder={t('training.enter_certificate_number')}
                className="mt-1"
              />
            </div>

            <Button onClick={handleVerification} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              {t('training.verify')}
            </Button>

            {verificationResult && (
              <div className={cn(
                'p-4 rounded-lg border',
                verificationResult.valid 
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              )}>
                <div className="flex items-center space-x-2 mb-2">
                  {verificationResult.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {verificationResult.valid ? t('training.certificate_valid') : t('training.certificate_invalid')}
                  </span>
                </div>
                
                {verificationResult.valid && (
                  <div className="text-sm space-y-1">
                    <p><strong>{t('training.holder')}:</strong> {verificationResult.holder?.name}</p>
                    <p><strong>{t('training.module')}:</strong> {verificationResult.training?.module?.title}</p>
                    <p><strong>{t('training.restaurant')}:</strong> {verificationResult.training?.restaurant?.name}</p>
                    <p><strong>{t('training.score')}:</strong> {verificationResult.training?.assessment?.score_percentage}%</p>
                    <p><strong>{t('training.expires')}:</strong> {new Date(verificationResult.expires_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TrainingCertificates;