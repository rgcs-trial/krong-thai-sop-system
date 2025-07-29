'use client';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Plug, 
  Settings, 
  Link, 
  ExternalLink, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Code,
  Key,
  Shield,
  Database,
  Webhook,
  Calendar,
  Users,
  BarChart3,
  FileText,
  Bell,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';

interface SOPIntegrationPageProps {
  params: Promise<{ locale: string }>;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  type: 'calendar' | 'reporting' | 'communication' | 'pos' | 'inventory' | 'hr';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  last_sync: string;
  sync_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  config: Record<string, any>;
  webhook_url?: string;
  api_key?: string;
  features: string[];
  is_premium: boolean;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  last_triggered: string;
  success_count: number;
  failure_count: number;
  is_active: boolean;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  created_at: string;
  last_used: string;
  expires_at?: string;
  is_active: boolean;
}

// Mock data
const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: '1',
    name: 'Google Calendar',
    description: 'Sync SOP schedules and deadlines with Google Calendar',
    type: 'calendar',
    status: 'connected',
    last_sync: '2024-01-25T14:30:00Z',
    sync_frequency: 'realtime',
    config: { calendar_id: 'primary' },
    features: ['Schedule Sync', 'Deadline Reminders', 'Completion Events'],
    is_premium: false,
  },
  {
    id: '2',
    name: 'Slack Notifications',
    description: 'Send SOP notifications and updates to Slack channels',
    type: 'communication',
    status: 'connected',
    last_sync: '2024-01-25T14:25:00Z',
    sync_frequency: 'realtime',
    config: { channel: '#operations' },
    webhook_url: 'https://hooks.slack.com/services/...',
    features: ['Completion Notifications', 'Assignment Alerts', 'Update Announcements'],
    is_premium: false,
  },
  {
    id: '3',
    name: 'Toast POS',
    description: 'Integration with Toast POS system for inventory tracking',
    type: 'pos',
    status: 'disconnected',
    last_sync: '2024-01-20T10:00:00Z',
    sync_frequency: 'hourly',
    config: {},
    features: ['Inventory Sync', 'Sales Data', 'Menu Updates'],
    is_premium: true,
  },
  {
    id: '4',
    name: 'Power BI',
    description: 'Advanced analytics and reporting dashboard',
    type: 'reporting',
    status: 'error',
    last_sync: '2024-01-24T08:15:00Z',
    sync_frequency: 'daily',
    config: { workspace_id: 'abc123' },
    api_key: 'pk_test_...',
    features: ['Custom Reports', 'Data Export', 'Real-time Dashboards'],
    is_premium: true,
  },
];

const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: '1',
    name: 'SOP Completion Webhook',
    url: 'https://api.example.com/webhooks/sop-completion',
    events: ['sop.completed', 'sop.failed'],
    secret: 'whsec_...',
    last_triggered: '2024-01-25T14:30:00Z',
    success_count: 145,
    failure_count: 2,
    is_active: true,
  },
  {
    id: '2',
    name: 'Training Updates',
    url: 'https://api.training.com/webhooks/updates',
    events: ['training.completed', 'certificate.issued'],
    secret: 'whsec_...',
    last_triggered: '2024-01-24T16:20:00Z',
    success_count: 67,
    failure_count: 0,
    is_active: true,
  },
];

const MOCK_API_KEYS: APIKey[] = [
  {
    id: '1',
    name: 'Mobile App API Key',
    key: 'sk_live_...',
    permissions: ['read:sops', 'write:completions'],
    created_at: '2024-01-15T00:00:00Z',
    last_used: '2024-01-25T14:30:00Z',
    is_active: true,
  },
  {
    id: '2',
    name: 'Analytics Integration',
    key: 'sk_test_...',
    permissions: ['read:analytics', 'read:reports'],
    created_at: '2024-01-10T00:00:00Z',
    last_used: '2024-01-24T10:15:00Z',
    expires_at: '2024-12-31T23:59:59Z',
    is_active: true,
  },
];

const INTEGRATION_TYPES = [
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'communication', label: 'Communication', icon: Users },
  { value: 'reporting', label: 'Reporting', icon: BarChart3 },
  { value: 'pos', label: 'Point of Sale', icon: Database },
  { value: 'inventory', label: 'Inventory', icon: FileText },
  { value: 'hr', label: 'Human Resources', icon: Users },
];

const WEBHOOK_EVENTS = [
  'sop.completed',
  'sop.failed',
  'sop.updated',
  'training.completed',
  'certificate.issued',
  'user.assigned',
  'deadline.approaching',
];

export default function SOPIntegrationPage({ params }: SOPIntegrationPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(MOCK_WEBHOOKS);
  const [apiKeys, setApiKeys] = useState<APIKey[]>(MOCK_API_KEYS);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [showCreateAPIKey, setShowCreateAPIKey] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });
  const [newAPIKey, setNewAPIKey] = useState({
    name: '',
    permissions: [] as string[],
    expires_at: '',
  });

  const router = useRouter();
  const t = useTranslations('sop');
  const { user } = useAuthStore();

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const handleConnectIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration =>
      integration.id === integrationId
        ? { ...integration, status: 'connected' as const, last_sync: new Date().toISOString() }
        : integration
    ));
    
    toast({
      title: t('integration.connected'),
      description: t('integration.connectedDescription'),
    });
  };

  const handleDisconnectIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration =>
      integration.id === integrationId
        ? { ...integration, status: 'disconnected' as const }
        : integration
    ));
    
    toast({
      title: t('integration.disconnected'),
      description: t('integration.disconnectedDescription'),
    });
  };

  const handleSyncIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration =>
      integration.id === integrationId
        ? { ...integration, last_sync: new Date().toISOString() }
        : integration
    ));
    
    toast({
      title: t('integration.synced'),
      description: t('integration.syncedDescription'),
    });
  };

  const handleCreateWebhook = () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast({
        title: t('integration.webhookIncomplete'),
        description: t('integration.webhookIncompleteDescription'),
        variant: 'destructive',
      });
      return;
    }

    const webhook: WebhookEndpoint = {
      id: Date.now().toString(),
      name: newWebhook.name,
      url: newWebhook.url,
      events: newWebhook.events,
      secret: `whsec_${Math.random().toString(36).substring(2)}`,
      last_triggered: new Date().toISOString(),
      success_count: 0,
      failure_count: 0,
      is_active: true,
    };

    setWebhooks(prev => [webhook, ...prev]);
    setShowCreateWebhook(false);
    setNewWebhook({ name: '', url: '', events: [] });

    toast({
      title: t('integration.webhookCreated'),
      description: t('integration.webhookCreatedDescription'),
    });
  };

  const handleCreateAPIKey = () => {
    if (!newAPIKey.name || newAPIKey.permissions.length === 0) {
      toast({
        title: t('integration.apiKeyIncomplete'),
        description: t('integration.apiKeyIncompleteDescription'),
        variant: 'destructive',
      });
      return;
    }

    const apiKey: APIKey = {
      id: Date.now().toString(),
      name: newAPIKey.name,
      key: `sk_${Math.random().toString(36).substring(2)}_${Math.random().toString(36).substring(2)}`,
      permissions: newAPIKey.permissions,
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      expires_at: newAPIKey.expires_at || undefined,
      is_active: true,
    };

    setApiKeys(prev => [apiKey, ...prev]);
    setShowCreateAPIKey(false);
    setNewAPIKey({ name: '', permissions: [], expires_at: '' });

    toast({
      title: t('integration.apiKeyCreated'),
      description: t('integration.apiKeyCreatedDescription'),
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle;
      case 'error': return AlertTriangle;
      case 'pending': return RefreshCw;
      default: return AlertTriangle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-700';
      case 'error': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = INTEGRATION_TYPES.find(t => t.value === type);
    return typeConfig?.icon || Plug;
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return t('time.justNow');
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

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
                  <Plug className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('integration.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('integration.subtitle', { count: connectedCount, total: integrations.length })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {connectedCount}/{integrations.length} {t('integration.connected')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="w-4 h-4" />
              {t('integration.tabs.integrations')}
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="w-4 h-4" />
              {t('integration.tabs.webhooks')}
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="w-4 h-4" />
              {t('integration.tabs.api')}
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <FileText className="w-4 h-4" />
              {t('integration.tabs.docs')}
            </TabsTrigger>
          </TabsList>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => {
                const StatusIcon = getStatusIcon(integration.status);
                const TypeIcon = getTypeIcon(integration.type);
                
                return (
                  <Card key={integration.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <TypeIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getStatusColor(integration.status)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {t(`integration.status.${integration.status}`)}
                              </Badge>
                              {integration.is_premium && (
                                <Badge className="bg-purple-100 text-purple-700">
                                  {t('integration.premium')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">{integration.description}</p>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">{t('integration.features')}</h4>
                        <div className="flex flex-wrap gap-1">
                          {integration.features.map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {integration.status === 'connected' && (
                        <div className="text-xs text-gray-500">
                          {t('integration.lastSync')}: {formatRelativeTime(integration.last_sync)}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {integration.status === 'connected' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncIntegration(integration.id)}
                              className="flex-1 gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {t('integration.sync')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisconnectIntegration(integration.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              {t('integration.disconnect')}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleConnectIntegration(integration.id)}
                            size="sm"
                            className="w-full gap-1"
                          >
                            <Link className="w-3 h-3" />
                            {t('integration.connect')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{t('integration.webhooks.title')}</h2>
              <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('integration.webhooks.create')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('integration.webhooks.createTitle')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="webhook-name">{t('integration.webhooks.name')}</Label>
                      <Input
                        id="webhook-name"
                        value={newWebhook.name}
                        onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('integration.webhooks.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook-url">{t('integration.webhooks.url')}</Label>
                      <Input
                        id="webhook-url"
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://api.example.com/webhooks"
                      />
                    </div>
                    <div>
                      <Label>{t('integration.webhooks.events')}</Label>
                      <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                        {WEBHOOK_EVENTS.map((event) => (
                          <div key={event} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={event}
                              checked={newWebhook.events.includes(event)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewWebhook(prev => ({ ...prev, events: [...prev.events, event] }));
                                } else {
                                  setNewWebhook(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }));
                                }
                              }}
                            />
                            <Label htmlFor={event} className="text-sm">{event}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateWebhook} className="flex-1">
                        {t('integration.webhooks.create')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateWebhook(false)}>
                        {t('integration.webhooks.cancel')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{webhook.name}</h3>
                          <Badge className={webhook.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {webhook.is_active ? t('integration.webhooks.active') : t('integration.webhooks.inactive')}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Link className="w-4 h-4" />
                            <span className="font-mono">{webhook.url}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            <span>{webhook.events.join(', ')}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span>{t('integration.webhooks.success')}: {webhook.success_count}</span>
                            <span>{t('integration.webhooks.failures')}: {webhook.failure_count}</span>
                            <span>{t('integration.webhooks.lastTriggered')}: {formatRelativeTime(webhook.last_triggered)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{t('integration.api.title')}</h2>
              <Dialog open={showCreateAPIKey} onOpenChange={setShowCreateAPIKey}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('integration.api.create')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('integration.api.createTitle')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="api-name">{t('integration.api.name')}</Label>
                      <Input
                        id="api-name"
                        value={newAPIKey.name}
                        onChange={(e) => setNewAPIKey(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('integration.api.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <Label>{t('integration.api.permissions')}</Label>
                      <div className="space-y-2 mt-2">
                        {['read:sops', 'write:completions', 'read:analytics', 'write:assignments'].map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={permission}
                              checked={newAPIKey.permissions.includes(permission)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAPIKey(prev => ({ ...prev, permissions: [...prev.permissions, permission] }));
                                } else {
                                  setNewAPIKey(prev => ({ ...prev, permissions: prev.permissions.filter(p => p !== permission) }));
                                }
                              }}
                            />
                            <Label htmlFor={permission} className="text-sm font-mono">{permission}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="api-expires">{t('integration.api.expiresAt')}</Label>
                      <Input
                        id="api-expires"
                        type="date"
                        value={newAPIKey.expires_at}
                        onChange={(e) => setNewAPIKey(prev => ({ ...prev, expires_at: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateAPIKey} className="flex-1">
                        {t('integration.api.create')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateAPIKey(false)}>
                        {t('integration.api.cancel')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{apiKey.name}</h3>
                          <Badge className={apiKey.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {apiKey.is_active ? t('integration.api.active') : t('integration.api.inactive')}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            <span className="font-mono">{apiKey.key}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            <span>{apiKey.permissions.join(', ')}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span>{t('integration.api.created')}: {new Date(apiKey.created_at).toLocaleDateString(locale)}</span>
                            <span>{t('integration.api.lastUsed')}: {formatRelativeTime(apiKey.last_used)}</span>
                            {apiKey.expires_at && (
                              <span>{t('integration.api.expires')}: {new Date(apiKey.expires_at).toLocaleDateString(locale)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Documentation */}
          <TabsContent value="docs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    {t('integration.docs.api')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{t('integration.docs.apiDescription')}</p>
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {t('integration.docs.viewDocs')}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    {t('integration.docs.webhooks')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{t('integration.docs.webhooksDescription')}</p>
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {t('integration.docs.viewGuide')}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    {t('integration.docs.examples')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{t('integration.docs.examplesDescription')}</p>
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {t('integration.docs.viewExamples')}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {t('integration.docs.support')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{t('integration.docs.supportDescription')}</p>
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {t('integration.docs.contactSupport')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}