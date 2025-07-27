'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Languages, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Eye, 
  Edit, 
  MoreHorizontal,
  FileText,
  Globe,
  Users,
  TrendingUp,
  Calendar,
  Target,
  Zap,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n';

interface TranslationItem {
  id: string;
  key: string;
  sourceText: string;
  sourceLanguage: Locale;
  targetLanguage: Locale;
  translatedText: string;
  status: 'pending' | 'translated' | 'reviewed' | 'approved' | 'rejected';
  quality: 'auto' | 'human' | 'professional';
  confidence: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  translatedBy?: string;
  reviewedBy?: string;
  notes?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface TranslationStats {
  total: number;
  pending: number;
  completed: number;
  approved: number;
  rejected: number;
  completionRate: number;
  qualityScore: number;
  avgTranslationTime: number; // in hours
}

interface TranslationManagementDashboardProps {
  className?: string;
  onTranslationUpdate?: (translation: TranslationItem) => void;
  onBulkAction?: (action: string, items: TranslationItem[]) => void;
}

export function TranslationManagementDashboard({
  className = '',
  onTranslationUpdate,
  onBulkAction
}: TranslationManagementDashboardProps) {
  const t = useTranslations('sop.admin');
  const locale = useLocale() as Locale;

  // Sample data - would be fetched from API
  const [translations, setTranslations] = useState<TranslationItem[]>([
    {
      id: '1',
      key: 'sop.foodSafety.title',
      sourceText: 'Food Safety Procedures',
      sourceLanguage: 'en',
      targetLanguage: 'th',
      translatedText: 'ขั้นตอนความปลอดภัยอาหาร',
      status: 'approved',
      quality: 'professional',
      confidence: 95,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-16'),
      translatedBy: 'translator@krongthai.com',
      reviewedBy: 'reviewer@krongthai.com',
      category: 'SOP Titles',
      priority: 'high'
    },
    {
      id: '2',
      key: 'sop.emergency.washHands',
      sourceText: 'Wash hands thoroughly with soap and warm water for at least 20 seconds',
      sourceLanguage: 'en',
      targetLanguage: 'th',
      translatedText: 'ล้างมือให้สะอาดด้วยสบู่และน้ำอุ่นเป็นเวลาอย่างน้อย 20 วินาที',
      status: 'reviewed',
      quality: 'human',
      confidence: 88,
      createdAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-15'),
      translatedBy: 'translator@krongthai.com',
      category: 'Emergency Procedures',
      priority: 'urgent'
    },
    {
      id: '3',
      key: 'sop.kitchen.equipmentCheck',
      sourceText: 'Check all kitchen equipment before service',
      sourceLanguage: 'en',
      targetLanguage: 'th',
      translatedText: '',
      status: 'pending',
      quality: 'auto',
      confidence: 0,
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
      category: 'Kitchen Operations',
      priority: 'medium'
    }
  ]);

  // State management
  const [selectedTranslations, setSelectedTranslations] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TranslationItem['status'] | 'all'>('all');
  const [languageFilter, setLanguageFilter] = useState<Locale | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TranslationItem['priority'] | 'all'>('all');
  const [editingTranslation, setEditingTranslation] = useState<TranslationItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Computed statistics
  const stats = useMemo((): TranslationStats => {
    const total = translations.length;
    const pending = translations.filter(t => t.status === 'pending').length;
    const completed = translations.filter(t => ['translated', 'reviewed', 'approved'].includes(t.status)).length;
    const approved = translations.filter(t => t.status === 'approved').length;
    const rejected = translations.filter(t => t.status === 'rejected').length;
    const completionRate = total > 0 ? (approved / total) * 100 : 0;
    const qualityScore = translations.length > 0 
      ? translations.reduce((sum, t) => sum + t.confidence, 0) / translations.length 
      : 0;
    const avgTranslationTime = 24; // Mock data

    return {
      total,
      pending,
      completed,
      approved,
      rejected,
      completionRate,
      qualityScore,
      avgTranslationTime
    };
  }, [translations]);

  // Filtered translations
  const filteredTranslations = useMemo(() => {
    return translations.filter(translation => {
      const matchesSearch = !searchQuery || 
        translation.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        translation.translatedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        translation.key.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || translation.status === statusFilter;
      const matchesLanguage = languageFilter === 'all' || translation.targetLanguage === languageFilter;
      const matchesPriority = priorityFilter === 'all' || translation.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesLanguage && matchesPriority;
    });
  }, [translations, searchQuery, statusFilter, languageFilter, priorityFilter]);

  // Status color mapping
  const getStatusColor = (status: TranslationItem['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'translated': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'reviewed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: TranslationItem['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Bulk operations
  const handleBulkApprove = () => {
    const selectedItems = translations.filter(t => selectedTranslations.has(t.id));
    onBulkAction?.('approve', selectedItems);
    toast({
      title: "Bulk approval",
      description: `${selectedItems.length} translations approved`,
    });
    setSelectedTranslations(new Set());
  };

  const handleBulkReject = () => {
    const selectedItems = translations.filter(t => selectedTranslations.has(t.id));
    onBulkAction?.('reject', selectedItems);
    toast({
      title: "Bulk rejection",
      description: `${selectedItems.length} translations rejected`,
    });
    setSelectedTranslations(new Set());
  };

  // Export translations
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const data = filteredTranslations.map(t => ({
        key: t.key,
        source: t.sourceText,
        target: t.translatedText,
        status: t.status,
        quality: t.quality,
        confidence: t.confidence
      }));
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `translations-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      toast({
        title: "Export successful",
        description: `${data.length} translations exported`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export translations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`translation-management-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Languages size={24} />
            Translation Management
          </h1>
          <p className="text-muted-foreground">
            Manage translations and content localization for your restaurant SOP system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isLoading}>
            {isLoading ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
            Export
          </Button>
          <Button variant="outline">
            <Upload size={16} className="mr-2" />
            Import
          </Button>
          <Button>
            <FileText size={16} className="mr-2" />
            New Translation
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText size={16} />
              Total Translations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target size={16} />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
            <Progress value={stats.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp size={16} />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.qualityScore)}</div>
            <p className="text-xs text-muted-foreground">
              Average confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock size={16} />
              Avg. Translation Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTranslationTime}h</div>
            <p className="text-xs text-muted-foreground">
              Per item
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search translations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="translated">Translated</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Language</Label>
              <Select value={languageFilter} onValueChange={(value: any) => setLanguageFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {locales.map(lang => (
                    <SelectItem key={lang} value={lang}>
                      <div className="flex items-center gap-2">
                        <span role="img">{localeFlags[lang]}</span>
                        {localeNames[lang]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setLanguageFilter('all');
                    setPriorityFilter('all');
                  }}
                >
                  <RefreshCw size={14} className="mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTranslations.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTranslations.size} translation(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkApprove}>
                  <CheckCircle size={14} className="mr-1" />
                  Approve Selected
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkReject}>
                  <AlertTriangle size={14} className="mr-1" />
                  Reject Selected
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedTranslations(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Translations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Translations ({filteredTranslations.length})</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allVisible = filteredTranslations.map(t => t.id);
                  const isAllSelected = allVisible.every(id => selectedTranslations.has(id));
                  
                  if (isAllSelected) {
                    setSelectedTranslations(new Set());
                  } else {
                    setSelectedTranslations(new Set([...selectedTranslations, ...allVisible]));
                  }
                }}
              >
                {filteredTranslations.every(t => selectedTranslations.has(t.id)) ? 'Deselect All' : 'Select All'}
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
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={filteredTranslations.length > 0 && filteredTranslations.every(t => selectedTranslations.has(t.id))}
                      onChange={() => {
                        const allVisible = filteredTranslations.map(t => t.id);
                        const isAllSelected = allVisible.every(id => selectedTranslations.has(id));
                        
                        if (isAllSelected) {
                          setSelectedTranslations(new Set());
                        } else {
                          setSelectedTranslations(new Set([...selectedTranslations, ...allVisible]));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Source Text</TableHead>
                  <TableHead>Translation</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTranslations.map((translation) => (
                  <TableRow key={translation.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedTranslations.has(translation.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedTranslations);
                          if (e.target.checked) {
                            newSelected.add(translation.id);
                          } else {
                            newSelected.delete(translation.id);
                          }
                          setSelectedTranslations(newSelected);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{translation.key}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={translation.sourceText}>
                        {translation.sourceText}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span role="img">{localeFlags[translation.sourceLanguage]}</span>
                        {localeNames[translation.sourceLanguage]}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {translation.translatedText ? (
                        <div>
                          <div className={`truncate ${translation.targetLanguage === 'th' ? 'font-french' : 'font-ui'}`} title={translation.translatedText}>
                            {translation.translatedText}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <span role="img">{localeFlags[translation.targetLanguage]}</span>
                            {localeNames[translation.targetLanguage]}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not translated</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span role="img" title={localeNames[translation.sourceLanguage]}>
                          {localeFlags[translation.sourceLanguage]}
                        </span>
                        →
                        <span role="img" title={localeNames[translation.targetLanguage]}>
                          {localeFlags[translation.targetLanguage]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(translation.status)}>
                        {translation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(translation.priority)}>
                        {translation.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {translation.quality}
                        </Badge>
                        {translation.confidence > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {translation.confidence}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {translation.updatedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingTranslation(translation)}>
                            <Edit size={14} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye size={14} className="mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-green-600">
                            <CheckCircle size={14} className="mr-2" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <AlertTriangle size={14} className="mr-2" />
                            Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredTranslations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Languages size={48} className="mx-auto mb-4 opacity-20" />
              <p>No translations found matching your criteria</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Translation Dialog */}
      {editingTranslation && (
        <Dialog open={!!editingTranslation} onOpenChange={() => setEditingTranslation(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Translation</DialogTitle>
              <DialogDescription>
                Update translation details and content
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Translation Key</Label>
                  <Input value={editingTranslation.key} readOnly className="font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={editingTranslation.category} readOnly />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Source Text ({localeNames[editingTranslation.sourceLanguage]})</Label>
                <textarea
                  value={editingTranslation.sourceText}
                  readOnly
                  className="w-full h-20 p-3 border rounded-md bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Translation ({localeNames[editingTranslation.targetLanguage]})</Label>
                <textarea
                  value={editingTranslation.translatedText}
                  onChange={(e) => setEditingTranslation({
                    ...editingTranslation,
                    translatedText: e.target.value
                  })}
                  className={`w-full h-32 p-3 border rounded-md ${editingTranslation.targetLanguage === 'th' ? 'font-french' : 'font-ui'}`}
                  placeholder={`Enter translation in ${localeNames[editingTranslation.targetLanguage]}...`}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={editingTranslation.status} 
                    onValueChange={(value: TranslationItem['status']) => 
                      setEditingTranslation({ ...editingTranslation, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="translated">Translated</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={editingTranslation.priority} 
                    onValueChange={(value: TranslationItem['priority']) => 
                      setEditingTranslation({ ...editingTranslation, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select 
                    value={editingTranslation.quality} 
                    onValueChange={(value: TranslationItem['quality']) => 
                      setEditingTranslation({ ...editingTranslation, quality: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="human">Human</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <textarea
                  value={editingTranslation.notes || ''}
                  onChange={(e) => setEditingTranslation({
                    ...editingTranslation,
                    notes: e.target.value
                  })}
                  className="w-full h-20 p-3 border rounded-md"
                  placeholder="Add notes about this translation..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTranslation(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Handle save
                onTranslationUpdate?.(editingTranslation);
                setEditingTranslation(null);
                toast({
                  title: "Translation updated",
                  description: "The translation has been successfully updated.",
                });
              }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default TranslationManagementDashboard;