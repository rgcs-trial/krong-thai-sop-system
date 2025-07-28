'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Share2, 
  Users, 
  Link, 
  Mail, 
  MessageSquare,
  QrCode,
  ArrowLeft,
  Copy,
  Check,
  Send,
  Globe,
  Lock,
  Eye,
  Download,
  Calendar,
  Clock,
  User,
  Building,
  Smartphone,
  Laptop
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarContent, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';

interface SOPSharingPageProps {
  params: Promise<{ locale: string }>;
}

interface ShareRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department: string;
}

interface ShareActivity {
  id: string;
  user_name: string;
  action: 'shared' | 'viewed' | 'completed' | 'commented';
  timestamp: string;
  device: 'mobile' | 'tablet' | 'desktop';
  location?: string;
}

interface SOPDocument {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  category: string;
  category_fr: string;
  version: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number;
}

// Mock data
const MOCK_SOP: SOPDocument = {
  id: '1',
  title: 'Hand Washing Procedure',
  title_fr: 'Procédure de Lavage des Mains',
  description: 'Proper hand washing technique for food service staff',
  description_fr: 'Technique appropriée de lavage des mains pour le personnel',
  category: 'Food Safety',
  category_fr: 'Sécurité Alimentaire',
  version: '2.1',
  difficulty: 'easy',
  estimated_time: 5,
};

const MOCK_RECIPIENTS: ShareRecipient[] = [
  {
    id: '1',
    name: 'Marie Dubois',
    email: 'marie@krongthai.com',
    role: 'Head Chef',
    department: 'Kitchen',
  },
  {
    id: '2',
    name: 'Jean Martin',
    email: 'jean@krongthai.com',
    role: 'Server',
    department: 'Front of House',
  },
  {
    id: '3',
    name: 'Sophie Chen',
    email: 'sophie@krongthai.com',
    role: 'Assistant Manager',
    department: 'Management',
  },
];

const MOCK_ACTIVITIES: ShareActivity[] = [
  {
    id: '1',
    user_name: 'Marie Dubois',
    action: 'viewed',
    timestamp: '2024-01-25T14:30:00Z',
    device: 'tablet',
    location: 'Kitchen Station 1',
  },
  {
    id: '2',
    user_name: 'Jean Martin',
    action: 'completed',
    timestamp: '2024-01-25T13:15:00Z',
    device: 'mobile',
  },
  {
    id: '3',
    user_name: 'Sophie Chen',
    action: 'shared',
    timestamp: '2024-01-25T10:00:00Z',
    device: 'desktop',
  },
];

export default function SOPSharingPage({ params }: SOPSharingPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [sop, setSop] = useState<SOPDocument>(MOCK_SOP);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [shareMessage, setShareMessage] = useState('');
  const [shareMethod, setShareMethod] = useState<'link' | 'email' | 'qr'>('link');
  const [isPublic, setIsPublic] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [allowComments, setAllowComments] = useState(true);
  const [trackViews, setTrackViews] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [activities, setActivities] = useState<ShareActivity[]>(MOCK_ACTIVITIES);

  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('sop');
  const { user } = useAuthStore();

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Get SOP ID from query params
  useEffect(() => {
    const sopId = searchParams.get('sop');
    if (sopId) {
      // In a real app, fetch SOP data by ID
      const mockLink = `${window.location.origin}/shared/sop/${sopId}?token=abc123`;
      setShareLink(mockLink);
    }
  }, [searchParams]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const handleRecipientToggle = (recipientId: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(recipientId)) {
      newSelected.delete(recipientId);
    } else {
      newSelected.add(recipientId);
    }
    setSelectedRecipients(newSelected);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: t('sharing.linkCopied'),
        description: t('sharing.linkCopiedDescription'),
      });
    } catch (error) {
      toast({
        title: t('sharing.copyError'),
        description: t('sharing.copyErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = () => {
    if (selectedRecipients.size === 0) {
      toast({
        title: t('sharing.noRecipients'),
        description: t('sharing.noRecipientsDescription'),
        variant: 'destructive',
      });
      return;
    }

    // In a real app, send email
    toast({
      title: t('sharing.emailSent'),
      description: t('sharing.emailSentDescription', { count: selectedRecipients.size }),
    });
  };

  const handleGenerateQR = () => {
    // In a real app, generate QR code
    toast({
      title: t('sharing.qrGenerated'),
      description: t('sharing.qrGeneratedDescription'),
    });
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return Smartphone;
      case 'desktop': return Laptop;
      default: return Smartphone; // tablet
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'shared': return 'bg-blue-100 text-blue-700';
      case 'viewed': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-purple-100 text-purple-700';
      case 'commented': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('time.justNow');
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
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('sharing.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {locale === 'fr' ? sop.title_fr : sop.title}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="w-4 h-4" />
                {activities.filter(a => a.action === 'viewed').length} {t('sharing.views')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sharing Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* SOP Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  {t('sharing.sopPreview')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                    <Globe className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {locale === 'fr' ? sop.title_fr : sop.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {locale === 'fr' ? sop.description_fr : sop.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{locale === 'fr' ? sop.category_fr : sop.category}</Badge>
                      <Badge variant="outline">v{sop.version}</Badge>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sop.estimated_time} {t('time.minutes')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Share Methods */}
            <Tabs value={shareMethod} onValueChange={(value: any) => setShareMethod(value)} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="link" className="gap-2">
                  <Link className="w-4 h-4" />
                  {t('sharing.shareLink')}
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="w-4 h-4" />
                  {t('sharing.email')}
                </TabsTrigger>
                <TabsTrigger value="qr" className="gap-2">
                  <QrCode className="w-4 h-4" />
                  {t('sharing.qrCode')}
                </TabsTrigger>
              </TabsList>

              {/* Share Link */}
              <TabsContent value="link">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('sharing.shareableLink')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={shareLink}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        onClick={handleCopyLink}
                        className="gap-2"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? t('sharing.copied') : t('sharing.copy')}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label>{t('sharing.publicAccess')}</Label>
                        <Switch
                          checked={isPublic}
                          onCheckedChange={setIsPublic}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>{t('sharing.trackViews')}</Label>
                        <Switch
                          checked={trackViews}
                          onCheckedChange={setTrackViews}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>{t('sharing.expiry')}</Label>
                      <Select value={expiryDays.toString()} onValueChange={(value) => setExpiryDays(parseInt(value))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 {t('time.day')}</SelectItem>
                          <SelectItem value="7">7 {t('time.days')}</SelectItem>
                          <SelectItem value="30">30 {t('time.days')}</SelectItem>
                          <SelectItem value="0">{t('sharing.noExpiry')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Email Sharing */}
              <TabsContent value="email">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('sharing.emailSharing')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>{t('sharing.recipients')}</Label>
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {MOCK_RECIPIENTS.map((recipient) => (
                          <div
                            key={recipient.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedRecipients.has(recipient.id)
                                ? "bg-red-50 border-red-200"
                                : "hover:bg-gray-50"
                            )}
                            onClick={() => handleRecipientToggle(recipient.id)}
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>{recipient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{recipient.name}</p>
                              <p className="text-sm text-gray-600">{recipient.role} • {recipient.department}</p>
                            </div>
                            {selectedRecipients.has(recipient.id) && (
                              <Check className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label>{t('sharing.message')}</Label>
                      <Textarea
                        value={shareMessage}
                        onChange={(e) => setShareMessage(e.target.value)}
                        placeholder={t('sharing.messagePlaceholder')}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <Button
                      onClick={handleSendEmail}
                      disabled={selectedRecipients.size === 0}
                      className="w-full gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {t('sharing.sendEmail')} ({selectedRecipients.size})
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* QR Code */}
              <TabsContent value="qr">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('sharing.qrCode')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center mb-4">
                        <QrCode className="w-24 h-24 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('sharing.qrDescription')}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={handleGenerateQR} className="gap-2">
                          <QrCode className="w-4 h-4" />
                          {t('sharing.generateQR')}
                        </Button>
                        <Button variant="outline" className="gap-2">
                          <Download className="w-4 h-4" />
                          {t('sharing.downloadQR')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Activity Sidebar */}
          <div className="space-y-6">
            {/* Share Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  {t('sharing.permissions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('sharing.allowComments')}</Label>
                  <Switch
                    checked={allowComments}
                    onCheckedChange={setAllowComments}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('sharing.requireLogin')}</Label>
                  <Switch
                    checked={!isPublic}
                    onCheckedChange={(checked) => setIsPublic(!checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('sharing.allowDownload')}</Label>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('sharing.recentActivity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                      {t('sharing.noActivity')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      const DeviceIcon = getDeviceIcon(activity.device);
                      return (
                        <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {activity.user_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {activity.user_name}
                              </p>
                              <Badge className={cn("text-xs", getActionColor(activity.action))}>
                                {t(`sharing.actions.${activity.action}`)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <DeviceIcon className="w-3 h-3" />
                              <span>{formatRelativeTime(activity.timestamp)}</span>
                              {activity.location && (
                                <>
                                  <span>•</span>
                                  <span>{activity.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Share Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>{t('sharing.statistics')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {activities.filter(a => a.action === 'viewed').length}
                    </p>
                    <p className="text-sm text-gray-600">{t('sharing.views')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {activities.filter(a => a.action === 'completed').length}
                    </p>
                    <p className="text-sm text-gray-600">{t('sharing.completions')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {activities.filter(a => a.action === 'shared').length}
                    </p>
                    <p className="text-sm text-gray-600">{t('sharing.shares')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {activities.filter(a => a.action === 'commented').length}
                    </p>
                    <p className="text-sm text-gray-600">{t('sharing.comments')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}