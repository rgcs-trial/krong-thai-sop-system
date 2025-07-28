'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Zap, 
  Star, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Play,
  Clock,
  Users,
  Search,
  Folder,
  Pin,
  Grid3X3,
  List,
  MoreVertical,
  Copy,
  Share2,
  Eye,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';

interface SOPShortcutsPageProps {
  params: Promise<{ locale: string }>;
}

interface Shortcut {
  id: string;
  name: string;
  description: string;
  type: 'sop' | 'category' | 'search' | 'custom';
  target_id?: string;
  target_title?: string;
  target_category?: string;
  icon: string;
  color: string;
  is_pinned: boolean;
  usage_count: number;
  last_used: string;
  created_at: string;
  is_shared: boolean;
}

interface ShortcutTemplate {
  id: string;
  name: string;
  description: string;
  type: 'sop' | 'category' | 'search';
  icon: string;
  color: string;
  popular: boolean;
}

// Mock shortcuts
const MOCK_SHORTCUTS: Shortcut[] = [
  {
    id: '1',
    name: 'Quick Hand Wash',
    description: 'Fast access to hand washing SOP',
    type: 'sop',
    target_id: '1',
    target_title: 'Hand Washing Procedure',
    target_category: 'Food Safety',
    icon: 'droplets',
    color: '#3B82F6',
    is_pinned: true,
    usage_count: 45,
    last_used: '2024-01-25T14:30:00Z',
    created_at: '2024-01-15T00:00:00Z',
    is_shared: false,
  },
  {
    id: '2',
    name: 'Safety First',
    description: 'All food safety SOPs',
    type: 'category',
    target_id: 'food-safety',
    target_title: 'Food Safety',
    icon: 'shield',
    color: '#10B981',
    is_pinned: false,
    usage_count: 23,
    last_used: '2024-01-24T10:15:00Z',
    created_at: '2024-01-10T00:00:00Z',
    is_shared: true,
  },
  {
    id: '3',
    name: 'Cleaning Tasks',
    description: 'Daily cleaning checklist',
    type: 'search',
    target_id: 'search:cleaning+daily',
    icon: 'sparkles',
    color: '#F59E0B',
    is_pinned: true,
    usage_count: 67,
    last_used: '2024-01-25T08:00:00Z',
    created_at: '2024-01-08T00:00:00Z',
    is_shared: false,
  },
];

const SHORTCUT_TEMPLATES: ShortcutTemplate[] = [
  {
    id: 't1',
    name: 'Emergency SOPs',
    description: 'Quick access to emergency procedures',
    type: 'search',
    icon: 'alert-triangle',
    color: '#EF4444',
    popular: true,
  },
  {
    id: 't2',
    name: 'Daily Checklist',
    description: 'Morning routine SOPs',
    type: 'search',
    icon: 'check-square',
    color: '#8B5CF6',
    popular: true,
  },
  {
    id: 't3',
    name: 'Training SOPs',
    description: 'New employee training materials',
    type: 'category',
    icon: 'graduation-cap',
    color: '#06B6D4',
    popular: false,
  },
];

export default function SOPShortcutsPage({ params }: SOPShortcutsPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(MOCK_SHORTCUTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newShortcut, setNewShortcut] = useState({
    name: '',
    description: '',
    type: 'sop' as const,
    icon: 'zap',
    color: '#3B82F6',
  });

  const router = useRouter();
  const t = useTranslations('sop');
  const { user } = useAuthStore();
  const { favorites } = useFavorites();

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

  const filteredShortcuts = shortcuts.filter(shortcut =>
    searchQuery === '' ||
    shortcut.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.target_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedShortcuts = filteredShortcuts.filter(s => s.is_pinned);
  const otherShortcuts = filteredShortcuts.filter(s => !s.is_pinned);

  const handleShortcutClick = (shortcut: Shortcut) => {
    // Update usage count
    setShortcuts(prev => prev.map(s => 
      s.id === shortcut.id 
        ? { ...s, usage_count: s.usage_count + 1, last_used: new Date().toISOString() }
        : s
    ));

    // Navigate based on shortcut type
    switch (shortcut.type) {
      case 'sop':
        router.push(`/${locale}/sop/documents/${shortcut.target_id}`);
        break;
      case 'category':
        router.push(`/${locale}/sop/categories/${shortcut.target_id}`);
        break;
      case 'search':
        const searchTerm = shortcut.target_id?.replace('search:', '') || '';
        router.push(`/${locale}/sop/search?q=${encodeURIComponent(searchTerm)}`);
        break;
      default:
        break;
    }
  };

  const handleTogglePin = (shortcutId: string) => {
    setShortcuts(prev => prev.map(s => 
      s.id === shortcutId ? { ...s, is_pinned: !s.is_pinned } : s
    ));
    
    toast({
      title: t('shortcuts.pinToggled'),
      description: t('shortcuts.pinToggledDescription'),
    });
  };

  const handleDeleteShortcut = (shortcutId: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== shortcutId));
    
    toast({
      title: t('shortcuts.deleted'),
      description: t('shortcuts.deletedDescription'),
    });
  };

  const handleCreateShortcut = () => {
    if (!newShortcut.name.trim()) {
      toast({
        title: t('shortcuts.nameRequired'),
        description: t('shortcuts.nameRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    const shortcut: Shortcut = {
      id: Date.now().toString(),
      name: newShortcut.name,
      description: newShortcut.description,
      type: newShortcut.type,
      icon: newShortcut.icon,
      color: newShortcut.color,
      is_pinned: false,
      usage_count: 0,
      last_used: new Date().toISOString(),
      created_at: new Date().toISOString(),
      is_shared: false,
    };

    setShortcuts(prev => [shortcut, ...prev]);
    setShowCreateDialog(false);
    setNewShortcut({
      name: '',
      description: '',
      type: 'sop',
      icon: 'zap',
      color: '#3B82F6',
    });

    toast({
      title: t('shortcuts.created'),
      description: t('shortcuts.createdDescription'),
    });
  };

  const handleUseTemplate = (template: ShortcutTemplate) => {
    setNewShortcut({
      name: template.name,
      description: template.description,
      type: template.type,
      icon: template.icon,
      color: template.color,
    });
    setShowCreateDialog(true);
  };

  const getShortcutIcon = (iconName: string) => {
    switch (iconName) {
      case 'droplets': return '💧';
      case 'shield': return '🛡️';
      case 'sparkles': return '✨';
      case 'alert-triangle': return '⚠️';
      case 'check-square': return '✅';
      case 'graduation-cap': return '🎓';
      default: return '⚡';
    }
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
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('shortcuts.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('shortcuts.subtitle', { count: shortcuts.length })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-red-600 hover:bg-red-700 gap-2">
                    <Plus className="w-4 h-4" />
                    {t('shortcuts.create')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('shortcuts.createTitle')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">{t('shortcuts.name')}</Label>
                      <Input
                        id="name"
                        value={newShortcut.name}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('shortcuts.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">{t('shortcuts.description')}</Label>
                      <Input
                        id="description"
                        value={newShortcut.description}
                        onChange={(e) => setNewShortcut(prev => ({ ...prev, description: e.target.value }))}
                        placeholder={t('shortcuts.descriptionPlaceholder')}
                      />
                    </div>
                    <div>
                      <Label>{t('shortcuts.type')}</Label>
                      <Select value={newShortcut.type} onValueChange={(value: any) => setNewShortcut(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sop">{t('shortcuts.types.sop')}</SelectItem>
                          <SelectItem value="category">{t('shortcuts.types.category')}</SelectItem>
                          <SelectItem value="search">{t('shortcuts.types.search')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateShortcut} className="flex-1">
                        {t('shortcuts.create')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        {t('shortcuts.cancel')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('shortcuts.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick Templates */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('shortcuts.templates')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SHORTCUT_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleUseTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: template.color + '20', color: template.color }}
                    >
                      {getShortcutIcon(template.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        {template.popular && (
                          <Badge className="bg-orange-100 text-orange-700">
                            {t('shortcuts.popular')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pinned Shortcuts */}
        {pinnedShortcuts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pin className="w-5 h-5" />
              {t('shortcuts.pinned')}
            </h2>
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            )}>
              {pinnedShortcuts.map((shortcut) => (
                <ShortcutCard
                  key={shortcut.id}
                  shortcut={shortcut}
                  viewMode={viewMode}
                  onTogglePin={handleTogglePin}
                  onDelete={handleDeleteShortcut}
                  onClick={handleShortcutClick}
                  formatRelativeTime={formatRelativeTime}
                  getShortcutIcon={getShortcutIcon}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Shortcuts */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('shortcuts.all')} ({otherShortcuts.length})
          </h2>
          {otherShortcuts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? t('shortcuts.noResults') : t('shortcuts.empty')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery ? t('shortcuts.noResultsDescription') : t('shortcuts.emptyDescription')}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('shortcuts.createFirst')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            )}>
              {otherShortcuts.map((shortcut) => (
                <ShortcutCard
                  key={shortcut.id}
                  shortcut={shortcut}
                  viewMode={viewMode}
                  onTogglePin={handleTogglePin}
                  onDelete={handleDeleteShortcut}
                  onClick={handleShortcutClick}
                  formatRelativeTime={formatRelativeTime}
                  getShortcutIcon={getShortcutIcon}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({ 
  shortcut, 
  viewMode, 
  onTogglePin, 
  onDelete, 
  onClick, 
  formatRelativeTime, 
  getShortcutIcon, 
  t 
}: {
  shortcut: Shortcut;
  viewMode: 'grid' | 'list';
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (shortcut: Shortcut) => void;
  formatRelativeTime: (timestamp: string) => string;
  getShortcutIcon: (icon: string) => string;
  t: any;
}) {
  return (
    <Card
      className={cn(
        "group cursor-pointer hover:shadow-md transition-all duration-200",
        viewMode === 'list' && "flex items-center p-3"
      )}
      onClick={() => onClick(shortcut)}
    >
      <CardContent className={cn(
        "p-4",
        viewMode === 'list' && "py-0 flex-1 flex items-center gap-4"
      )}>
        <div className={cn(
          "flex items-center gap-3",
          viewMode === 'grid' && "mb-3"
        )}>
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-medium text-white"
            style={{ backgroundColor: shortcut.color }}
          >
            {getShortcutIcon(shortcut.icon)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{shortcut.name}</h3>
              {shortcut.is_pinned && (
                <Pin className="w-3 h-3 text-gray-500" />
              )}
              {shortcut.is_shared && (
                <Share2 className="w-3 h-3 text-blue-500" />
              )}
            </div>
            <p className={cn(
              "text-sm text-gray-600",
              viewMode === 'list' ? "line-clamp-1" : "line-clamp-2"
            )}>
              {shortcut.description}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onTogglePin(shortcut.id);
              }}>
                <Pin className="w-4 h-4 mr-2" />
                {shortcut.is_pinned ? t('shortcuts.unpin') : t('shortcuts.pin')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                // Copy shortcut URL
                toast({ title: t('shortcuts.copied') });
              }}>
                <Copy className="w-4 h-4 mr-2" />
                {t('shortcuts.copy')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onDelete(shortcut.id);
              }} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('shortcuts.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {viewMode === 'grid' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Badge variant="outline" className="text-xs">
                {t(`shortcuts.types.${shortcut.type}`)}
              </Badge>
              <div className="flex items-center gap-1 text-gray-500">
                <Eye className="w-3 h-3" />
                {shortcut.usage_count}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {t('shortcuts.lastUsed')}: {formatRelativeTime(shortcut.last_used)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}