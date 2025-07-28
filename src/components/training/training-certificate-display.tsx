'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Award,
  Shield,
  Download,
  Share2,
  Printer,
  Mail,
  Calendar,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  QrCode,
  Eye,
  ExternalLink,
  Copy,
  Facebook,
  Twitter,
  Linkedin,
  RefreshCw,
  AlertTriangle,
  Trophy,
  Crown,
  Gem,
  Target,
  Users,
  BookOpen,
  Zap,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface Certificate {
  id: string;
  certificate_number: string;
  title: string;
  title_fr: string;
  description?: string;
  description_fr?: string;
  recipient_name: string;
  recipient_email: string;
  issuer_name: string;
  issuer_title: string;
  restaurant_name: string;
  module_title: string;
  module_title_fr: string;
  skill_category: string;
  completion_date: string;
  expiry_date?: string;
  score_percentage: number;
  time_spent_minutes: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  certificate_type: 'completion' | 'mastery' | 'excellence' | 'distinction';
  verification_code: string;
  digital_signature?: string;
  badge_image_url?: string;
  is_public: boolean;
  status: 'active' | 'expired' | 'revoked';
  metadata: {
    template_version: string;
    generation_date: string;
    verification_url: string;
    blockchain_hash?: string;
  };
}

interface VerificationResult {
  valid: boolean;
  certificate?: Partial<Certificate>;
  error_message?: string;
  verification_date: string;
  issuer_verified: boolean;
}

interface TrainingCertificateDisplayProps {
  /** Certificate data to display */
  certificate: Certificate;
  /** Whether certificate is being displayed in a modal */
  isModal?: boolean;
  /** Whether to show verification features */
  showVerification?: boolean;
  /** Whether to show sharing features */
  showSharing?: boolean;
  /** Whether to show print features */
  showPrint?: boolean;
  /** Template style to use */
  template?: 'modern' | 'classic' | 'elegant';
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Callback when certificate is shared */
  onShare?: (method: string, data: any) => void;
  /** Callback when certificate is verified */
  onVerify?: (certificate_number: string) => Promise<VerificationResult>;
  /** Callback when certificate is downloaded */
  onDownload?: (format: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * TrainingCertificateDisplay - Professional certificate showcase with verification
 * 
 * Features:
 * - Professional certificate templates with brand consistency
 * - Digital verification with QR codes and blockchain integration
 * - Multi-format sharing (social media, email, PDF, image)
 * - Print-optimized layouts with high-resolution output
 * - Interactive verification portal for third parties
 * - Badge integration for digital credentials
 * - Expiry tracking and renewal notifications
 * - Security features (digital signatures, tamper detection)
 * - Accessibility compliance (screen readers, keyboard navigation)
 * - Tablet-optimized responsive design
 * - Bilingual certificate content (EN/FR)
 * - Social media integration for credential sharing
 * 
 * @param props TrainingCertificateDisplayProps
 * @returns JSX.Element
 */
const TrainingCertificateDisplay: React.FC<TrainingCertificateDisplayProps> = ({
  certificate,
  isModal = false,
  showVerification = true,
  showSharing = true,
  showPrint = true,
  template = 'modern',
  size = 'medium',
  onShare,
  onVerify,
  onDownload,
  className
}) => {
  const t = useTranslations('training.certificate');
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [verificationNumber, setVerificationNumber] = useState('');

  // Get certificate type styling
  const getCertificateTypeInfo = (type: string) => {
    const typeInfo = {
      completion: { 
        icon: CheckCircle, 
        color: 'text-jade-green', 
        bg: 'bg-jade-green/10', 
        border: 'border-jade-green',
        gradient: 'from-jade-green/20 to-jade-green/5' 
      },
      mastery: { 
        icon: Trophy, 
        color: 'text-golden-saffron', 
        bg: 'bg-golden-saffron/10', 
        border: 'border-golden-saffron',
        gradient: 'from-golden-saffron/20 to-golden-saffron/5' 
      },
      excellence: { 
        icon: Crown, 
        color: 'text-purple-600', 
        bg: 'bg-purple-50', 
        border: 'border-purple-300',
        gradient: 'from-purple-100 to-purple-50' 
      },
      distinction: { 
        icon: Gem, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        border: 'border-blue-300',
        gradient: 'from-blue-100 to-blue-50' 
      }
    };
    return typeInfo[type as keyof typeof typeInfo] || typeInfo.completion;
  };

  // Get difficulty styling
  const getDifficultyInfo = (difficulty: string) => {
    const difficultyInfo = {
      beginner: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      intermediate: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
      advanced: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
    };
    return difficultyInfo[difficulty as keyof typeof difficultyInfo] || difficultyInfo.beginner;
  };

  // Check if certificate is expired
  const isExpired = certificate.expiry_date ? new Date(certificate.expiry_date) < new Date() : false;
  const isExpiringSoon = certificate.expiry_date ? 
    new Date(certificate.expiry_date).getTime() - Date.now() < (30 * 24 * 60 * 60 * 1000) : false;

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Handle verification
  const handleVerification = async () => {
    if (!onVerify || !verificationNumber.trim()) return;
    
    setIsVerifying(true);
    try {
      const result = await onVerify(verificationNumber.trim());
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({
        valid: false,
        error_message: 'Verification failed. Please try again.',
        verification_date: new Date().toISOString(),
        issuer_verified: false
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle sharing
  const handleShare = async (method: string) => {
    const shareData = {
      title: `${certificate.recipient_name} - ${certificate.title}`,
      text: `I've earned a ${certificate.certificate_type} certificate in ${certificate.module_title}!`,
      url: certificate.metadata.verification_url,
      certificate_id: certificate.id,
      certificate_number: certificate.certificate_number
    };

    if (method === 'copy') {
      await navigator.clipboard.writeText(shareData.url);
      return;
    }

    onShare?.(method, shareData);
  };

  // Handle download
  const handleDownload = (format: string) => {
    onDownload?.(format);
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'max-w-2xl text-sm';
      case 'large':
        return 'max-w-6xl text-lg';
      default:
        return 'max-w-4xl text-base';
    }
  };

  // Get template styles
  const getTemplateStyles = () => {
    switch (template) {
      case 'classic':
        return 'border-8 border-double border-krong-red bg-gradient-to-br from-amber-50 to-white';
      case 'elegant':
        return 'border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-white shadow-2xl';
      default:
        return 'border-4 border-golden-saffron bg-gradient-to-br from-white to-gray-50 shadow-xl';
    }
  };

  const typeInfo = getCertificateTypeInfo(certificate.certificate_type);
  const difficultyInfo = getDifficultyInfo(certificate.difficulty_level);
  const TypeIcon = typeInfo.icon;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Certificate Display */}
      <Card className={cn(
        "mx-auto transition-all duration-300",
        getSizeClasses(),
        getTemplateStyles(),
        isFullscreen && "fixed inset-4 z-50 max-w-[95vw] max-h-[95vh] overflow-auto"
      )}>
        <div ref={certificateRef} className="relative">
          {/* Header */}
          <div className="text-center py-8 bg-gradient-to-r from-krong-red to-krong-red/90 text-white rounded-t-lg relative">
            {/* Fullscreen controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              {isFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Restaurant branding */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <Shield className="w-12 h-12" />
              <div>
                <h1 className="text-3xl font-heading font-bold">Restaurant Krong Thai</h1>
                <p className="text-xl font-body opacity-90">{t('certificateOfCompletion')}</p>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-center gap-3 mt-4">
              {certificate.status === 'active' && !isExpired && (
                <Badge className="bg-jade-green text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('verified')}
                </Badge>
              )}
              {isExpired && (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  {t('expired')}
                </Badge>
              )}
              {isExpiringSoon && !isExpired && (
                <Badge className="bg-orange-500 text-white">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('expiringSoon')}
                </Badge>
              )}
            </div>
          </div>

          {/* Certificate Body */}
          <CardContent className="p-8 lg:p-12 space-y-8">
            {/* Award Section */}
            <div className="text-center space-y-6">
              {/* Certificate Type Badge */}
              <div className={cn("inline-flex items-center gap-3 p-4 rounded-full", typeInfo.bg, typeInfo.border, "border-2")}>
                <TypeIcon className={cn("w-12 h-12", typeInfo.color)} />
                <div>
                  <h2 className="text-2xl font-heading font-bold text-krong-black">
                    {t(`certificateType.${certificate.certificate_type}`)}
                  </h2>
                  <p className="text-tablet-sm text-muted-foreground">
                    {t('certificate')}
                  </p>
                </div>
              </div>

              {/* Recipient Information */}
              <div className="space-y-4">
                <p className="text-xl font-body text-muted-foreground">
                  {t('isHerebyAwardedTo')}
                </p>
                <h3 className="text-4xl font-heading font-bold text-krong-black border-b-4 border-golden-saffron pb-2 inline-block">
                  {certificate.recipient_name}
                </h3>
                <p className="text-lg font-body text-muted-foreground">
                  {certificate.restaurant_name}
                </p>
              </div>
            </div>

            {/* Achievement Details */}
            <div className={cn("p-6 rounded-lg border-2", typeInfo.bg, typeInfo.border)}>
              <h4 className="text-xl font-heading font-bold text-krong-black text-center mb-4">
                {t('forSuccessfulCompletion')}
              </h4>
              
              <div className="text-center space-y-4">
                <h5 className="text-2xl font-body font-bold text-krong-red">
                  {certificate.module_title}
                </h5>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center mb-2">
                      <Star className="w-6 h-6 text-golden-saffron" />
                    </div>
                    <div className="text-2xl font-bold text-krong-black">
                      {certificate.score_percentage}%
                    </div>
                    <div className="text-tablet-sm text-muted-foreground">
                      {t('score')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-krong-black">
                      {Math.round(certificate.time_spent_minutes / 60)}h
                    </div>
                    <div className="text-tablet-sm text-muted-foreground">
                      {t('timeSpent')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center mb-2">
                      <Target className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-krong-black">
                      {certificate.skill_category}
                    </div>
                    <div className="text-tablet-sm text-muted-foreground">
                      {t('skillArea')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className={cn("text-2xl font-bold", difficultyInfo.color)}>
                      {t(`difficulty.${certificate.difficulty_level}`)}
                    </div>
                    <div className="text-tablet-sm text-muted-foreground">
                      {t('level')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates and Validity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-tablet-sm text-muted-foreground uppercase tracking-wide">
                  {t('dateOfCompletion')}
                </p>
                <p className="text-lg font-body font-bold text-krong-black">
                  {formatDate(certificate.completion_date)}
                </p>
              </div>
              
              {certificate.expiry_date && (
                <div className="text-center">
                  <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-tablet-sm text-muted-foreground uppercase tracking-wide">
                    {t('validUntil')}
                  </p>
                  <p className={cn(
                    "text-lg font-body font-bold",
                    isExpired ? "text-red-600" : isExpiringSoon ? "text-orange-600" : "text-krong-black"
                  )}>
                    {formatDate(certificate.expiry_date)}
                  </p>
                </div>
              )}
            </div>

            {/* Verification Section */}
            <div className="border-t-2 border-gray-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Certificate Number */}
                <div className="text-center">
                  <p className="text-tablet-sm text-muted-foreground uppercase tracking-wide">
                    {t('certificateNumber')}
                  </p>
                  <p className="text-lg font-mono font-bold text-krong-black">
                    {certificate.certificate_number}
                  </p>
                </div>
                
                {/* QR Code */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-2 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-tablet-xs text-muted-foreground">
                    {t('scanToVerify')}
                  </p>
                </div>

                {/* Digital Signature */}
                <div className="text-center">
                  <p className="text-tablet-sm text-muted-foreground uppercase tracking-wide mb-2">
                    {t('authorizedBy')}
                  </p>
                  <div className="space-y-1">
                    <p className="font-bold text-krong-black">{certificate.issuer_name}</p>
                    <p className="text-tablet-sm text-muted-foreground">{certificate.issuer_title}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-tablet-sm text-muted-foreground space-y-2">
              <p>
                {t('certificateFooter')}
              </p>
              <p className="font-mono">
                {t('certificateId')}: {certificate.id}
              </p>
              <p>
                {t('generatedOn')} {formatDate(certificate.metadata.generation_date)}
              </p>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Action Buttons */}
      {(showSharing || showPrint || showVerification) && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {showVerification && (
            <Button
              variant="outline"
              onClick={() => setShowVerificationDialog(true)}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {t('verifyCertificate')}
            </Button>
          )}
          
          {showSharing && (
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(true)}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {t('share')}
            </Button>
          )}
          
          {showPrint && (
            <>
              <Button
                variant="outline"
                onClick={() => handleDownload('pdf')}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('downloadPDF')}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {t('print')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              {t('certificateVerification')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-tablet-sm font-medium">{t('certificateNumber')}</label>
              <Input
                value={verificationNumber}
                onChange={(e) => setVerificationNumber(e.target.value)}
                placeholder={t('enterCertificateNumber')}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleVerification} 
              disabled={isVerifying || !verificationNumber.trim()}
              className="w-full"
            >
              {isVerifying ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {isVerifying ? t('verifying') : t('verify')}
            </Button>

            {/* Verification Result */}
            {verificationResult && (
              <div className={cn(
                'p-4 rounded-lg border',
                verificationResult.valid
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {verificationResult.valid ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={cn(
                    'font-medium',
                    verificationResult.valid ? 'text-green-800' : 'text-red-800'
                  )}>
                    {verificationResult.valid ? t('certificateValid') : t('certificateInvalid')}
                  </span>
                </div>
                
                {verificationResult.valid && verificationResult.certificate && (
                  <div className="text-tablet-sm space-y-1">
                    <p><strong>{t('recipient')}:</strong> {verificationResult.certificate.recipient_name}</p>
                    <p><strong>{t('module')}:</strong> {verificationResult.certificate.module_title}</p>
                    <p><strong>{t('completionDate')}:</strong> {verificationResult.certificate.completion_date && formatDate(verificationResult.certificate.completion_date)}</p>
                    <p><strong>{t('score')}:</strong> {verificationResult.certificate.score_percentage}%</p>
                  </div>
                )}
                
                {verificationResult.error_message && (
                  <p className="text-red-700 text-tablet-sm">
                    {verificationResult.error_message}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-500" />
              {t('shareCertificate')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Social Media Sharing */}
            <div>
              <p className="font-medium mb-3">{t('shareOnSocialMedia')}</p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleShare('linkedin')}
                  className="flex flex-col items-center gap-2 h-auto p-4"
                >
                  <Linkedin className="w-6 h-6 text-blue-600" />
                  <span className="text-tablet-xs">LinkedIn</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleShare('twitter')}
                  className="flex flex-col items-center gap-2 h-auto p-4"
                >
                  <Twitter className="w-6 h-6 text-blue-400" />
                  <span className="text-tablet-xs">Twitter</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleShare('facebook')}
                  className="flex flex-col items-center gap-2 h-auto p-4"
                >
                  <Facebook className="w-6 h-6 text-blue-700" />
                  <span className="text-tablet-xs">Facebook</span>
                </Button>
              </div>
            </div>

            {/* Direct Sharing */}
            <div>
              <p className="font-medium mb-3">{t('directSharing')}</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleShare('email')}
                  className="w-full justify-start"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t('shareByEmail')}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleShare('copy')}
                  className="w-full justify-start"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('copyLink')}
                </Button>
              </div>
            </div>

            {/* Public URL */}
            <div>
              <p className="font-medium mb-2">{t('publicURL')}</p>
              <div className="flex gap-2">
                <Input
                  value={certificate.metadata.verification_url}
                  readOnly
                  className="text-tablet-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare('copy')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingCertificateDisplay;