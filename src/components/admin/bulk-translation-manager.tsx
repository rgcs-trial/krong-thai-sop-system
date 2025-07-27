'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  X,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  Database,
  Settings,
  Info,
  Trash2,
  Copy
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/hooks/use-toast';
import type { 
  BulkTranslationManagerProps,
  BulkOperationData,
  BulkOperationResult,
  ImportPreviewData,
  ExportOptions,
  TranslationAdminFilters,
  Locale
} from '@/types/translation-admin';

// File format validation
const SUPPORTED_FORMATS = {
  json: { extensions: ['.json'], mimeTypes: ['application/json'] },
  csv: { extensions: ['.csv'], mimeTypes: ['text/csv'] },
  xlsx: { extensions: ['.xlsx'], mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] }
};

// CSV parsing utility
const parseCSV = (text: string): any[] => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }
  
  return data;
};

/**
 * Bulk Translation Manager Component
 * Handles bulk import/export operations for translations
 */
export function BulkTranslationManager({
  className = '',
  selectedItems = [],
  onOperationComplete
}: BulkTranslationManagerProps) {
  const { t, formatNumberLocale } = useI18n();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [activeTab, setActiveTab] = useState('import');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<'json' | 'csv' | 'xlsx'>('json');
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'overwrite' | 'merge' | 'skip_existing'>('merge');
  const [defaultStatus, setDefaultStatus] = useState<'draft' | 'review'>('draft');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    filters: { locale: 'all', status: 'all', category: 'all' },
    include_metadata: true,
    include_usage_stats: false,
    template_mode: false
  });

  // Operation results
  const [lastResult, setLastResult] = useState<BulkOperationResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/admin/translations/bulk', {
        method: 'POST',
        body: data,
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      return response.json();
    },
    onSuccess: (result: BulkOperationResult) => {
      setLastResult(result);
      setShowResultDialog(true);
      onOperationComplete?.(result);
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      
      toast({
        title: t('admin.translation.importComplete'),
        description: t('admin.translation.importedCount', { count: result.processed }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.translation.importFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      const params = new URLSearchParams({
        format: options.format,
        include_metadata: options.include_metadata.toString(),
        include_usage_stats: options.include_usage_stats.toString(),
        template_mode: options.template_mode.toString(),
        ...Object.fromEntries(
          Object.entries(options.filters).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`/api/admin/translations/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      return response.json();
    },
    onSuccess: (result: { download_url: string; filename: string }) => {
      // Trigger download
      const link = document.createElement('a');
      link.href = result.download_url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: t('admin.translation.exportComplete'),
        description: t('admin.translation.downloadStarted'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.translation.exportFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // File upload handler
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file format
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidFormat = Object.values(SUPPORTED_FORMATS).some(format =>
      format.extensions.includes(fileExtension)
    );

    if (!isValidFormat) {
      toast({
        title: t('admin.translation.invalidFormat'),
        description: t('admin.translation.supportedFormats'),
        variant: 'destructive',
      });
      return;
    }

    setImportFile(file);
    
    // Detect format from extension
    if (fileExtension === '.json') setImportFormat('json');
    else if (fileExtension === '.csv') setImportFormat('csv');
    else if (fileExtension === '.xlsx') setImportFormat('xlsx');

    // Preview the file
    try {
      await previewImportFile(file);
    } catch (error) {
      toast({
        title: t('admin.translation.previewFailed'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [t]);

  // Preview import file
  const previewImportFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', importFormat);
      formData.append('preview_only', 'true');

      const response = await fetch('/api/admin/translations/import-preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const preview: ImportPreviewData = await response.json();
      setImportPreview(preview);
      setShowPreviewDialog(true);
    } catch (error) {
      console.error('Preview error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [importFormat]);

  // Execute import
  const handleImport = useCallback(async () => {
    if (!importFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('format', importFormat);
      formData.append('merge_strategy', mergeStrategy);
      formData.append('default_status', defaultStatus);

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await importMutation.mutateAsync(formData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Reset state
      setImportFile(null);
      setImportPreview(null);
      setShowPreviewDialog(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  }, [importFile, importFormat, mergeStrategy, defaultStatus, importMutation]);

  // Execute export
  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      await exportMutation.mutateAsync(exportOptions);
    } finally {
      setIsProcessing(false);
    }
  }, [exportOptions, exportMutation]);

  // Generate template
  const handleGenerateTemplate = useCallback(async () => {
    const templateOptions: ExportOptions = {
      ...exportOptions,
      template_mode: true,
      filters: { locale: 'all', status: 'all', category: 'all' }
    };
    
    setIsProcessing(true);
    
    try {
      await exportMutation.mutateAsync(templateOptions);
    } finally {
      setIsProcessing(false);
    }
  }, [exportOptions, exportMutation]);

  // Clear import state
  const clearImportState = () => {
    setImportFile(null);
    setImportPreview(null);
    setShowPreviewDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bulk-translation-manager space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Database size={20} />
            {t('admin.translation.bulkOperations')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.translation.bulkOperationsDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <Badge variant="outline">
              {t('admin.translation.selectedItems', { count: selectedItems.length })}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      {isProcessing && (
        <Card className="border-primary">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {activeTab === 'import' ? t('admin.translation.importing') : t('admin.translation.exporting')}
                </span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload size={16} />
            {t('admin.translation.import')}
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download size={16} />
            {t('admin.translation.export')}
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('admin.translation.importTranslations')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('admin.translation.importDescription')}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File upload */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('admin.translation.selectFile')}</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="min-h-[48px]"
                    >
                      <Upload size={16} className="mr-2" />
                      {importFile ? t('admin.translation.changeFile') : t('admin.translation.chooseFile')}
                    </Button>
                    {importFile && (
                      <div className="flex items-center gap-2">
                        <FileText size={16} />
                        <span className="text-sm">{importFile.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearImportState}
                          className="h-6 w-6 p-0"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Format selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('admin.translation.format')}</Label>
                    <Select value={importFormat} onValueChange={(value: any) => setImportFormat(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('admin.translation.mergeStrategy')}</Label>
                    <Select value={mergeStrategy} onValueChange={(value: any) => setMergeStrategy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merge">{t('admin.translation.merge')}</SelectItem>
                        <SelectItem value="overwrite">{t('admin.translation.overwrite')}</SelectItem>
                        <SelectItem value="skip_existing">{t('admin.translation.skipExisting')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('admin.translation.defaultStatus')}</Label>
                    <Select value={defaultStatus} onValueChange={(value: any) => setDefaultStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{t('admin.translation.status.draft')}</SelectItem>
                        <SelectItem value="review">{t('admin.translation.status.review')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Import preview info */}
                {importPreview && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{t('admin.translation.importPreview')}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreviewDialog(true)}
                      >
                        <Eye size={14} className="mr-1" />
                        {t('admin.translation.viewDetails')}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('admin.translation.validRows')}:</span>
                        <div className="font-medium text-green-600">{formatNumberLocale(importPreview.valid_rows)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('admin.translation.invalidRows')}:</span>
                        <div className="font-medium text-red-600">{formatNumberLocale(importPreview.invalid_rows)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('admin.translation.newKeys')}:</span>
                        <div className="font-medium text-blue-600">{formatNumberLocale(importPreview.new_keys)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('admin.translation.conflicts')}:</span>
                        <div className="font-medium text-amber-600">{formatNumberLocale(importPreview.conflicts.length)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-4">
                  <Button
                    onClick={handleImport}
                    disabled={!importFile || isProcessing || (importPreview?.valid_rows || 0) === 0}
                    className="min-h-[48px]"
                  >
                    <Upload size={16} className="mr-2" />
                    {t('admin.translation.startImport')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateTemplate}
                    disabled={isProcessing}
                    className="min-h-[48px]"
                  >
                    <FileSpreadsheet size={16} className="mr-2" />
                    {t('admin.translation.downloadTemplate')}
                  </Button>
                  {importFile && (
                    <Button
                      variant="ghost"
                      onClick={clearImportState}
                      disabled={isProcessing}
                      className="min-h-[48px]"
                    >
                      <X size={16} className="mr-2" />
                      {t('common.clear')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('admin.translation.exportTranslations')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('admin.translation.exportDescription')}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export options */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('admin.translation.exportFormat')}</Label>
                    <Select 
                      value={exportOptions.format} 
                      onValueChange={(value: any) => 
                        setExportOptions(prev => ({ ...prev, format: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('admin.translation.locale')}</Label>
                    <Select 
                      value={exportOptions.filters.locale || 'all'} 
                      onValueChange={(value) => 
                        setExportOptions(prev => ({ 
                          ...prev, 
                          filters: { ...prev.filters, locale: value }
                        }))
                      }
                    >
                      <SelectTrigger>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('admin.translation.status')}</Label>
                    <Select 
                      value={exportOptions.filters.status || 'all'} 
                      onValueChange={(value) => 
                        setExportOptions(prev => ({ 
                          ...prev, 
                          filters: { ...prev.filters, status: value }
                        }))
                      }
                    >
                      <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label>{t('admin.translation.category')}</Label>
                    <Select 
                      value={exportOptions.filters.category || 'all'} 
                      onValueChange={(value) => 
                        setExportOptions(prev => ({ 
                          ...prev, 
                          filters: { ...prev.filters, category: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('admin.translation.allCategories')}</SelectItem>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="sop">SOP</SelectItem>
                        <SelectItem value="navigation">Navigation</SelectItem>
                        <SelectItem value="auth">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Additional options */}
                <div className="space-y-3">
                  <Label>{t('admin.translation.additionalOptions')}</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.include_metadata}
                        onChange={(e) => 
                          setExportOptions(prev => ({ 
                            ...prev, 
                            include_metadata: e.target.checked 
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-sm">{t('admin.translation.includeMetadata')}</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.include_usage_stats}
                        onChange={(e) => 
                          setExportOptions(prev => ({ 
                            ...prev, 
                            include_usage_stats: e.target.checked 
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-sm">{t('admin.translation.includeUsageStats')}</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.template_mode}
                        onChange={(e) => 
                          setExportOptions(prev => ({ 
                            ...prev, 
                            template_mode: e.target.checked 
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-sm">{t('admin.translation.templateMode')}</span>
                    </label>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-4">
                  <Button
                    onClick={handleExport}
                    disabled={isProcessing}
                    className="min-h-[48px]"
                  >
                    <Download size={16} className="mr-2" />
                    {t('admin.translation.startExport')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateTemplate}
                    disabled={isProcessing}
                    className="min-h-[48px]"
                  >
                    <FileSpreadsheet size={16} className="mr-2" />
                    {t('admin.translation.downloadTemplate')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.translation.importPreview')}</DialogTitle>
            <DialogDescription>
              {t('admin.translation.reviewBeforeImport')}
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{importPreview.valid_rows}</div>
                    <div className="text-xs text-muted-foreground">{t('admin.translation.validRows')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{importPreview.invalid_rows}</div>
                    <div className="text-xs text-muted-foreground">{t('admin.translation.invalidRows')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{importPreview.new_keys}</div>
                    <div className="text-xs text-muted-foreground">{t('admin.translation.newKeys')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">{importPreview.conflicts.length}</div>
                    <div className="text-xs text-muted-foreground">{t('admin.translation.conflicts')}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Errors */}
              {importPreview.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">{t('admin.translation.errors')}</h4>
                  <div className="max-h-32 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('admin.translation.row')}</TableHead>
                          <TableHead>{t('admin.translation.key')}</TableHead>
                          <TableHead>{t('admin.translation.error')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.errors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell className="font-mono text-xs">{error.key || '-'}</TableCell>
                            <TableCell className="text-red-600 text-xs">{error.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {importPreview.conflicts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-600">{t('admin.translation.conflicts')}</h4>
                  <div className="max-h-32 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('admin.translation.key')}</TableHead>
                          <TableHead>{t('admin.translation.locale')}</TableHead>
                          <TableHead>{t('admin.translation.existing')}</TableHead>
                          <TableHead>{t('admin.translation.new')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.conflicts.map((conflict, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{conflict.key}</TableCell>
                            <TableCell>{conflict.locale.toUpperCase()}</TableCell>
                            <TableCell className="text-xs max-w-32 truncate" title={conflict.existing_value}>
                              {conflict.existing_value}
                            </TableCell>
                            <TableCell className="text-xs max-w-32 truncate" title={conflict.new_value}>
                              {conflict.new_value}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={() => {
                setShowPreviewDialog(false);
                handleImport();
              }}
              disabled={!importPreview || importPreview.valid_rows === 0}
            >
              {t('admin.translation.proceedWithImport')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {lastResult?.success ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <AlertTriangle size={20} className="text-red-600" />
              )}
              {t('admin.translation.operationResult')}
            </DialogTitle>
          </DialogHeader>

          {lastResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{lastResult.processed}</div>
                  <div className="text-xs text-muted-foreground">{t('admin.translation.processed')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{lastResult.failed}</div>
                  <div className="text-xs text-muted-foreground">{t('admin.translation.failed')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{lastResult.skipped}</div>
                  <div className="text-xs text-muted-foreground">{t('admin.translation.skipped')}</div>
                </div>
              </div>

              {lastResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle size={16} />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">{t('admin.translation.errorsOccurred')}:</div>
                      {lastResult.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="text-sm">
                          {error.error}
                        </div>
                      ))}
                      {lastResult.errors.length > 3 && (
                        <div className="text-sm">
                          {t('admin.translation.andMoreErrors', { 
                            count: lastResult.errors.length - 3 
                          })}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {lastResult.warnings.length > 0 && (
                <Alert>
                  <Info size={16} />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">{t('admin.translation.warnings')}:</div>
                      {lastResult.warnings.map((warning, index) => (
                        <div key={index} className="text-sm">{warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BulkTranslationManager;