'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  FileText,
  Filter,
  RefreshCw,
  Eye,
  Copy,
  AlertTriangle,
  CheckCircle,
  Clock,
  Tag,
  Globe,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/hooks/use-toast';
import type { 
  TranslationKeyManagerProps,
  TranslationAdminItem,
  TranslationKeyFormData,
  TranslationAdminFilters,
  TranslationAdminSortOptions,
  Locale
} from '@/types/translation-admin';

/**
 * Translation Key Manager Component
 * Manages CRUD operations for translation keys with advanced filtering and search
 */
export function TranslationKeyManager({
  className = '',
  selectedKeys = [],
  onSelectionChange,
  onKeyEdit,
  onKeyCreate
}: TranslationKeyManagerProps) {
  const { t, locale, formatNumberLocale, formatDateLocale } = useI18n();
  const queryClient = useQueryClient();

  // State management
  const [filters, setFilters] = useState<TranslationAdminFilters>({
    search: '',
    locale: 'all',
    status: 'all',
    category: 'all'
  });
  const [sortOptions, setSortOptions] = useState<TranslationAdminSortOptions>({
    sortBy: 'updated_at',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(selectedKeys));
  const [editingKey, setEditingKey] = useState<TranslationAdminItem | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyFormData, setKeyFormData] = useState<TranslationKeyFormData>({
    key: '',
    category: '',
    description: '',
    interpolation_vars: [],
    context: '',
    priority: 'medium'
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch translation keys
  const { 
    data: keysData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['translation-keys', filters, sortOptions, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: sortOptions.sortBy,
        sortOrder: sortOptions.sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`/api/admin/translation-keys?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch translation keys');
      }
      return response.json();
    },
  });

  // Fetch categories for filter dropdown
  const { data: categories } = useQuery({
    queryKey: ['translation-categories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/translation-keys/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  // Create translation key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (data: TranslationKeyFormData) => {
      const response = await fetch('/api/admin/translation-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create translation key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      setCreatingKey(false);
      resetKeyForm();
      toast({
        title: t('admin.translation.keyCreated'),
        description: t('admin.translation.keyCreatedSuccess'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.translation.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update translation key mutation
  const updateKeyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TranslationKeyFormData> }) => {
      const response = await fetch(`/api/admin/translation-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update translation key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      setEditingKey(null);
      resetKeyForm();
      toast({
        title: t('admin.translation.keyUpdated'),
        description: t('admin.translation.keyUpdatedSuccess'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.translation.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete translation key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/translation-keys/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete translation key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      toast({
        title: t('admin.translation.keyDeleted'),
        description: t('admin.translation.keyDeletedSuccess'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.translation.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Event handlers
  const handleFilterChange = useCallback((key: keyof TranslationAdminFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handleSortChange = useCallback((sortBy: TranslationAdminSortOptions['sortBy']) => {
    setSortOptions(prev => ({
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  const handleSelectionChange = useCallback((id: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      onSelectionChange?.(Array.from(newSet));
      return newSet;
    });
  }, [onSelectionChange]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && keysData?.data) {
      const allIds = keysData.data.map((key: TranslationAdminItem) => key.id);
      setSelectedItems(new Set(allIds));
      onSelectionChange?.(allIds);
    } else {
      setSelectedItems(new Set());
      onSelectionChange?.([]);
    }
  }, [keysData?.data, onSelectionChange]);

  const resetKeyForm = () => {
    setKeyFormData({
      key: '',
      category: '',
      description: '',
      interpolation_vars: [],
      context: '',
      priority: 'medium'
    });
  };

  const handleCreateKey = () => {
    setCreatingKey(true);
    resetKeyForm();
    onKeyCreate?.();
  };

  const handleEditKey = (key: TranslationAdminItem) => {
    setEditingKey(key);
    setKeyFormData({
      key: key.translation_key.key,
      category: key.translation_key.category,
      description: key.translation_key.description || '',
      interpolation_vars: key.translation_key.interpolation_vars,
      context: key.translation_key.context || '',
      priority: 'medium' // This would come from extended data
    });
    onKeyEdit?.(key.translation_key);
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm(t('admin.translation.confirmDelete'))) {
      deleteKeyMutation.mutate(id);
    }
  };

  const handleSubmitKeyForm = () => {
    if (editingKey) {
      updateKeyMutation.mutate({ 
        id: editingKey.id, 
        data: keyFormData 
      });
    } else {
      createKeyMutation.mutate(keyFormData);
    }
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Helper functions
  const getCompletionBadge = (translations: TranslationAdminItem['translations']) => {
    const completed = translations?.filter(t => t.status === 'published').length || 0;
    const total = translations?.length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const variant = percentage >= 100 ? 'default' : percentage >= 50 ? 'secondary' : 'outline';
    const color = percentage >= 100 ? 'text-green-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600';
    
    return (
      <Badge variant={variant} className={color}>
        {percentage}% ({completed}/{total})
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={14} className="text-green-600" />;
      case 'approved':
        return <CheckCircle size={14} className="text-blue-600" />;
      case 'review':
        return <Clock size={14} className="text-amber-600" />;
      case 'draft':
        return <Edit size={14} className="text-gray-600" />;
      default:
        return <AlertTriangle size={14} className="text-red-600" />;
    }
  };

  const isAllSelected = keysData?.data ? 
    keysData.data.every((key: TranslationAdminItem) => selectedItems.has(key.id)) : false;

  return (
    <div className={`translation-key-manager space-y-6 ${className}`}>
      {/* Header and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <FileText size={20} />
            {t('admin.translation.keyManager')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.translation.manageTranslationKeys')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="min-h-[48px]"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button 
            onClick={handleCreateKey}
            className="min-h-[48px] bg-primary hover:bg-primary/90"
          >
            <Plus size={16} className="mr-2" />
            {t('admin.translation.createKey')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.translation.filtersAndSearch')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">{t('common.search')}</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('admin.translation.searchKeys')}
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 min-h-[48px]"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label>{t('admin.translation.category')}</Label>
              <Select 
                value={filters.category || 'all'} 
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.translation.allCategories')}</SelectItem>
                  {categories?.map((category: string) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>{t('admin.translation.status')}</Label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.translation.allStatuses')}</SelectItem>
                  <SelectItem value="draft">{t('admin.translation.status.draft')}</SelectItem>
                  <SelectItem value="review">{t('admin.translation.status.review')}</SelectItem>
                  <SelectItem value="approved">{t('admin.translation.status.approved')}</SelectItem>
                  <SelectItem value="published">{t('admin.translation.status.published')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Locale Filter */}
            <div className="space-y-2">
              <Label>{t('admin.translation.locale')}</Label>
              <Select 
                value={filters.locale || 'all'} 
                onValueChange={(value) => handleFilterChange('locale', value)}
              >
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.translation.allLocales')}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="th">ไทย</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({ search: '', locale: 'all', status: 'all', category: 'all' });
                  setPagination({ page: 1, limit: 20 });
                }}
                className="w-full min-h-[48px]"
              >
                <RefreshCw size={16} className="mr-2" />
                {t('common.reset')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle size={16} />
          <AlertDescription>
            {t('admin.translation.errorLoadingKeys')}: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('admin.translation.selectedItems', { count: selectedItems.size })}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="min-h-[40px]">
                  <Edit size={14} className="mr-1" />
                  {t('common.edit')}
                </Button>
                <Button variant="outline" size="sm" className="min-h-[40px]">
                  <Copy size={14} className="mr-1" />
                  {t('common.duplicate')}
                </Button>
                <Button variant="outline" size="sm" className="min-h-[40px] text-red-600">
                  <Trash2 size={14} className="mr-1" />
                  {t('common.delete')}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSelectAll(false)}
                  className="min-h-[40px]"
                >
                  {t('common.clearSelection')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Translation Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('admin.translation.translationKeys')} ({keysData?.total || 0})</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(!isAllSelected)}
                className="min-h-[40px]"
              >
                {isAllSelected ? t('common.deselectAll') : t('common.selectAll')}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label={t('common.selectAll')}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('key')}
                  >
                    <div className="flex items-center gap-1">
                      {t('admin.translation.key')}
                      {sortOptions.sortBy === 'key' && (
                        sortOptions.sortOrder === 'desc' ? 
                          <ChevronDown size={14} /> : 
                          <ChevronUp size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('category')}
                  >
                    <div className="flex items-center gap-1">
                      {t('admin.translation.category')}
                      {sortOptions.sortBy === 'category' && (
                        sortOptions.sortOrder === 'desc' ? 
                          <ChevronDown size={14} /> : 
                          <ChevronUp size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>{t('admin.translation.completion')}</TableHead>
                  <TableHead>{t('admin.translation.interpolationVars')}</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('usage_count')}
                  >
                    <div className="flex items-center gap-1">
                      {t('admin.translation.usage')}
                      {sortOptions.sortBy === 'usage_count' && (
                        sortOptions.sortOrder === 'desc' ? 
                          <ChevronDown size={14} /> : 
                          <ChevronUp size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('updated_at')}
                  >
                    <div className="flex items-center gap-1">
                      {t('admin.translation.lastUpdated')}
                      {sortOptions.sortBy === 'updated_at' && (
                        sortOptions.sortOrder === 'desc' ? 
                          <ChevronDown size={14} /> : 
                          <ChevronUp size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-12">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 w-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-32 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-8 bg-muted rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : keysData?.data?.length > 0 ? (
                  keysData.data.map((item: TranslationAdminItem) => (
                    <React.Fragment key={item.id}>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => 
                              handleSelectionChange(item.id, checked as boolean)
                            }
                            aria-label={t('admin.translation.selectKey')}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(item.id)}
                              className="h-6 w-6 p-0"
                            >
                              {expandedRows.has(item.id) ? 
                                <ChevronUp size={12} /> : 
                                <ChevronDown size={12} />
                              }
                            </Button>
                            <span className="truncate max-w-[200px]" title={item.translation_key.key}>
                              {item.translation_key.key}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.translation_key.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getCompletionBadge(item.translations)}
                        </TableCell>
                        <TableCell>
                          {item.translation_key.interpolation_vars.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <Tag size={12} />
                              <span className="text-xs">
                                {item.translation_key.interpolation_vars.length}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatNumberLocale(item.usage_count)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateLocale(new Date(item.updated_at), 'short')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditKey(item)}>
                                <Edit size={14} className="mr-2" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Eye size={14} className="mr-2" />
                                {t('common.view')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy size={14} className="mr-2" />
                                {t('common.duplicate')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteKey(item.id)}
                              >
                                <Trash2 size={14} className="mr-2" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {/* Expanded row content */}
                      {expandedRows.has(item.id) && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/20">
                            <div className="p-4 space-y-3">
                              {item.translation_key.description && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {t('admin.translation.description')}:
                                  </span>
                                  <p className="text-sm mt-1">{item.translation_key.description}</p>
                                </div>
                              )}
                              {item.translation_key.interpolation_vars.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {t('admin.translation.interpolationVars')}:
                                  </span>
                                  <div className="flex gap-1 mt-1">
                                    {item.translation_key.interpolation_vars.map((variable) => (
                                      <Badge key={variable} variant="secondary" className="text-xs">
                                        {variable}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.translations && item.translations.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {t('admin.translation.translations')}:
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                                    {item.translations.map((translation) => (
                                      <div 
                                        key={`${translation.locale}-${translation.id}`}
                                        className="p-2 border rounded text-xs"
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <Badge variant="outline" className="text-xs">
                                            {translation.locale.toUpperCase()}
                                          </Badge>
                                          <div className="flex items-center gap-1">
                                            {getStatusIcon(translation.status)}
                                            <span className="text-xs">{translation.status}</span>
                                          </div>
                                        </div>
                                        <p className="truncate max-w-full" title={translation.value}>
                                          {translation.value || 
                                            <span className="text-muted-foreground italic">
                                              {t('admin.translation.noTranslation')}
                                            </span>
                                          }
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={48} className="text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground">
                          {t('admin.translation.noKeysFound')}
                        </p>
                        <Button onClick={handleCreateKey} className="mt-2">
                          <Plus size={16} className="mr-2" />
                          {t('admin.translation.createFirstKey')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {keysData?.total && keysData.total > pagination.limit && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t('admin.translation.showingResults', { 
                  start: (pagination.page - 1) * pagination.limit + 1,
                  end: Math.min(pagination.page * pagination.limit, keysData.total),
                  total: keysData.total
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="min-h-[40px]"
                >
                  {t('common.previous')}
                </Button>
                <span className="text-sm">
                  {pagination.page} / {Math.ceil(keysData.total / pagination.limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= Math.ceil(keysData.total / pagination.limit)}
                  className="min-h-[40px]"
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Key Dialog */}
      <Dialog open={creatingKey || !!editingKey} onOpenChange={(open) => {
        if (!open) {
          setCreatingKey(false);
          setEditingKey(null);
          resetKeyForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKey ? t('admin.translation.editKey') : t('admin.translation.createKey')}
            </DialogTitle>
            <DialogDescription>
              {editingKey 
                ? t('admin.translation.editKeyDescription')
                : t('admin.translation.createKeyDescription')
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key" className="required">
                  {t('admin.translation.key')}
                </Label>
                <Input
                  id="key"
                  value={keyFormData.key}
                  onChange={(e) => setKeyFormData(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="common.loading"
                  className="font-mono"
                  disabled={!!editingKey} // Can't edit key once created
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="required">
                  {t('admin.translation.category')}
                </Label>
                <Select 
                  value={keyFormData.category} 
                  onValueChange={(value) => setKeyFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.translation.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category: string) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                    <SelectItem value="new">{t('admin.translation.createNewCategory')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t('admin.translation.description')}
              </Label>
              <Input
                id="description"
                value={keyFormData.description}
                onChange={(e) => setKeyFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('admin.translation.descriptionPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">
                {t('admin.translation.context')}
              </Label>
              <Input
                id="context"
                value={keyFormData.context}
                onChange={(e) => setKeyFormData(prev => ({ ...prev, context: e.target.value }))}
                placeholder={t('admin.translation.contextPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interpolation-vars">
                {t('admin.translation.interpolationVars')}
              </Label>
              <Input
                id="interpolation-vars"
                value={keyFormData.interpolation_vars.join(', ')}
                onChange={(e) => setKeyFormData(prev => ({ 
                  ...prev, 
                  interpolation_vars: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
                placeholder="count, name, date"
              />
              <p className="text-xs text-muted-foreground">
                {t('admin.translation.interpolationVarsHelp')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreatingKey(false);
                setEditingKey(null);
                resetKeyForm();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmitKeyForm}
              disabled={!keyFormData.key || !keyFormData.category}
            >
              {editingKey ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TranslationKeyManager;