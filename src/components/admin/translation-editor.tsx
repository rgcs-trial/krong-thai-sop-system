'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Languages, 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  FileText,
  Tag,
  Info,
  Lightbulb,
  Copy,
  Undo,
  Redo,
  Search,
  RotateCcw
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/hooks/use-toast';
import type { 
  TranslationEditorProps,
  TranslationEditorState,
  TranslationAdminItem,
  Locale,
  TranslationFormValidationResult
} from '@/types/translation-admin';

// ICU Message Format validation helper
const validateICUMessage = (message: string, variables: string[]): TranslationFormValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const interpolation_issues: TranslationFormValidationResult['interpolation_issues'] = [];

  // Check for basic ICU syntax
  const icuPattern = /\{([^}]+)\}/g;
  const foundVariables = new Set<string>();
  let match;

  while ((match = icuPattern.exec(message)) !== null) {
    const variable = match[1].split(',')[0].trim();
    foundVariables.add(variable);
  }

  // Check for missing variables
  variables.forEach(variable => {
    if (!foundVariables.has(variable)) {
      interpolation_issues.push({
        variable,
        issue: 'missing',
        suggestion: `Add {${variable}} to the translation`
      });
    }
  });

  // Check for extra variables
  foundVariables.forEach(variable => {
    if (!variables.includes(variable)) {
      interpolation_issues.push({
        variable,
        issue: 'extra',
        suggestion: `Remove {${variable}} or add it to the key's interpolation variables`
      });
    }
  });

  // Basic validation rules
  if (!message.trim()) {
    errors.push('Translation cannot be empty');
  }

  if (message.length > 1000) {
    warnings.push('Translation is very long, consider breaking it down');
  }

  // Check for common issues
  if (message.includes('{{') || message.includes('}}')) {
    warnings.push('Consider using single braces {variable} instead of double braces');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    interpolation_issues
  };
};

/**
 * Translation Editor Component
 * Rich editor for creating and editing translations with live preview and validation
 */
export function TranslationEditor({
  className = '',
  keyId,
  initialLocale = 'en',
  readonly = false,
  onSave,
  onCancel
}: TranslationEditorProps) {
  const { t, locale: currentLocale, formatDateLocale } = useI18n();
  const queryClient = useQueryClient();

  // Editor state
  const [editorState, setEditorState] = useState<TranslationEditorState>({
    selectedKey: null,
    activeLocale: initialLocale,
    translations: {
      en: null,
      fr: null,
      th: null
    },
    isDirty: false,
    isLoading: false,
    errors: {},
    lastSaved: null
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [validationResults, setValidationResults] = useState<Record<Locale, TranslationFormValidationResult>>({
    en: { isValid: true, errors: [], warnings: [], suggestions: [], interpolation_issues: [] },
    fr: { isValid: true, errors: [], warnings: [], suggestions: [], interpolation_issues: [] },
    th: { isValid: true, errors: [], warnings: [], suggestions: [], interpolation_issues: [] }
  });

  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch translation key and translations if keyId is provided
  const { 
    data: translationData,
    isLoading: isLoadingData,
    error: dataError
  } = useQuery({
    queryKey: ['translation-editor', keyId],
    queryFn: async () => {
      if (!keyId) return null;
      const response = await fetch(`/api/admin/translations/${keyId}/with-key`);
      if (!response.ok) throw new Error('Failed to fetch translation data');
      return response.json();
    },
    enabled: !!keyId,
  });

  // Fetch available translation keys for selection
  const { data: availableKeys } = useQuery({
    queryKey: ['translation-keys-list', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '50',
        search: searchQuery || ''
      });
      const response = await fetch(`/api/admin/translation-keys?${params}`);
      if (!response.ok) throw new Error('Failed to fetch translation keys');
      return response.json();
    },
  });

  // Save translation mutation
  const saveTranslationMutation = useMutation({
    mutationFn: async ({ locale, value, status }: { locale: Locale; value: string; status?: string }) => {
      if (!editorState.selectedKey) throw new Error('No key selected');
      
      const translationId = editorState.translations[locale]?.id;
      const url = translationId 
        ? `/api/admin/translations/${translationId}`
        : '/api/admin/translations';
      
      const method = translationId ? 'PUT' : 'POST';
      const body = translationId 
        ? { value, status }
        : { 
            translation_key_id: editorState.selectedKey.id,
            locale,
            value,
            status: status || 'draft'
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save translation');
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update local state
      setEditorState(prev => ({
        ...prev,
        translations: {
          ...prev.translations,
          [variables.locale]: data.translation
        },
        isDirty: false,
        lastSaved: new Date()
      }));

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      queryClient.invalidateQueries({ queryKey: ['translation-editor', keyId] });

      onSave?.(data.translation);
      
      toast({
        title: t('admin.translation.saved'),
        description: t('admin.translation.savedSuccessfully', { locale: variables.locale }),
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

  // Load translation data when keyId changes
  useEffect(() => {
    if (translationData) {
      const { translation_key, translations } = translationData;
      
      const translationMap: Record<Locale, any> = {
        en: null,
        fr: null,
        th: null
      };

      translations.forEach((trans: any) => {
        translationMap[trans.locale as Locale] = trans;
      });

      setEditorState(prev => ({
        ...prev,
        selectedKey: translation_key,
        translations: translationMap,
        isDirty: false,
        errors: {}
      }));
    }
  }, [translationData]);

  // Handle key selection
  const handleKeySelection = useCallback((key: any) => {
    if (editorState.isDirty) {
      if (!confirm(t('admin.translation.unsavedChanges'))) {
        return;
      }
    }

    setEditorState(prev => ({
      ...prev,
      selectedKey: key,
      translations: { en: null, fr: null, th: null },
      isDirty: false,
      errors: {}
    }));
  }, [editorState.isDirty, t]);

  // Handle translation value change
  const handleTranslationChange = useCallback((locale: Locale, value: string) => {
    setEditorState(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: {
          ...prev.translations[locale],
          value,
          locale
        }
      },
      isDirty: true
    }));

    // Validate the translation
    if (editorState.selectedKey) {
      const validation = validateICUMessage(value, editorState.selectedKey.interpolation_vars);
      setValidationResults(prev => ({
        ...prev,
        [locale]: validation
      }));
    }

    // Set up auto-save timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      if (value.trim() && editorState.selectedKey) {
        saveTranslationMutation.mutate({ locale, value, status: 'draft' });
      }
    }, 3000); // Auto-save after 3 seconds of inactivity
    
    setAutoSaveTimer(timer);
  }, [editorState.selectedKey, autoSaveTimer, saveTranslationMutation]);

  // Handle save
  const handleSave = useCallback((locale: Locale, status: string = 'draft') => {
    const translation = editorState.translations[locale];
    if (!translation?.value?.trim()) {
      toast({
        title: t('admin.translation.error'),
        description: t('admin.translation.emptyTranslation'),
        variant: 'destructive',
      });
      return;
    }

    saveTranslationMutation.mutate({ 
      locale, 
      value: translation.value, 
      status 
    });
  }, [editorState.translations, saveTranslationMutation, t]);

  // Handle save all
  const handleSaveAll = useCallback(() => {
    const locales: Locale[] = ['en', 'fr'];
    const promises = locales
      .filter(locale => editorState.translations[locale]?.value?.trim())
      .map(locale => 
        saveTranslationMutation.mutateAsync({ 
          locale, 
          value: editorState.translations[locale]!.value,
          status: 'draft'
        })
      );

    Promise.all(promises).then(() => {
      toast({
        title: t('admin.translation.allSaved'),
        description: t('admin.translation.allSavedSuccessfully'),
      });
    }).catch(() => {
      toast({
        title: t('admin.translation.error'),
        description: t('admin.translation.saveError'),
        variant: 'destructive',
      });
    });
  }, [editorState.translations, saveTranslationMutation, t]);

  // Preview translation with interpolation
  const previewTranslation = useCallback((locale: Locale, value: string) => {
    if (!editorState.selectedKey) return value;
    
    let preview = value;
    editorState.selectedKey.interpolation_vars.forEach((variable, index) => {
      const placeholder = `{${variable}}`;
      const sampleValue = `Sample${index + 1}`;
      preview = preview.replace(new RegExp(`\\{${variable}\\}`, 'g'), sampleValue);
    });
    
    return preview;
  }, [editorState.selectedKey]);

  // Generate translation suggestions
  const generateSuggestions = useCallback((sourceLocale: Locale, targetLocale: Locale) => {
    const sourceTranslation = editorState.translations[sourceLocale];
    if (!sourceTranslation?.value) return [];

    // This would typically integrate with a translation API
    const suggestions = [
      t('admin.translation.autoTranslateNotice'),
      t('admin.translation.reviewRequired')
    ];

    return suggestions;
  }, [editorState.translations, t]);

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'review':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return (
    <div className={`translation-editor space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Languages size={20} />
            {t('admin.translation.editor')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {editorState.selectedKey 
              ? t('admin.translation.editingKey', { key: editorState.selectedKey.key })
              : t('admin.translation.selectKeyToEdit')
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editorState.isDirty && (
            <Badge variant="outline" className="text-amber-600">
              <Clock size={12} className="mr-1" />
              {t('admin.translation.unsaved')}
            </Badge>
          )}
          {editorState.lastSaved && (
            <span className="text-xs text-muted-foreground">
              {t('admin.translation.lastSaved')}: {formatDateLocale(editorState.lastSaved, 'time')}
            </span>
          )}
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="min-h-[40px]"
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? t('common.hidePreview') : t('common.showPreview')}
          </Button>
          {!readonly && (
            <>
              <Button
                variant="outline"
                onClick={handleSaveAll}
                disabled={!editorState.isDirty || saveTranslationMutation.isPending}
                className="min-h-[40px]"
              >
                <Save size={16} className="mr-2" />
                {t('common.saveAll')}
              </Button>
              <Button
                onClick={() => onCancel?.()}
                variant="ghost"
                className="min-h-[40px]"
              >
                {t('common.cancel')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {dataError && (
        <Alert variant="destructive">
          <AlertTriangle size={16} />
          <AlertDescription>
            {t('admin.translation.errorLoadingData')}: {dataError.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Selection Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search size={16} />
              {t('admin.translation.selectKey')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('admin.translation.searchKeys')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoadingData ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))
                ) : availableKeys?.data?.length > 0 ? (
                  availableKeys.data.map((key: any) => (
                    <div
                      key={key.id}
                      className={`p-3 border rounded cursor-pointer hover:bg-muted/50 transition-colors ${
                        editorState.selectedKey?.id === key.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleKeySelection(key)}
                    >
                      <div className="font-mono text-xs text-primary truncate">
                        {key.key}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {key.category}
                      </div>
                      {key.interpolation_vars.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Tag size={10} />
                          <span className="text-xs">{key.interpolation_vars.length}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('admin.translation.noKeysFound')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} />
                {t('admin.translation.translations')}
              </div>
              {editorState.selectedKey && (
                <Badge variant="outline">
                  {editorState.selectedKey.category}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editorState.selectedKey ? (
              <div className="space-y-6">
                {/* Key Information */}
                <div className="p-4 bg-muted/20 rounded-lg space-y-2">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('admin.translation.key')}:
                    </span>
                    <p className="font-mono text-sm">{editorState.selectedKey.key}</p>
                  </div>
                  {editorState.selectedKey.description && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('admin.translation.description')}:
                      </span>
                      <p className="text-sm">{editorState.selectedKey.description}</p>
                    </div>
                  )}
                  {editorState.selectedKey.interpolation_vars.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('admin.translation.interpolationVars')}:
                      </span>
                      <div className="flex gap-1 mt-1">
                        {editorState.selectedKey.interpolation_vars.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Translation Tabs */}
                <Tabs value={editorState.activeLocale} onValueChange={(value) => 
                  setEditorState(prev => ({ ...prev, activeLocale: value as Locale }))
                }>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="en" className="flex items-center gap-2">
                      <Globe size={14} />
                      English
                    </TabsTrigger>
                    <TabsTrigger value="fr" className="flex items-center gap-2">
                      <Globe size={14} />
                      Français
                    </TabsTrigger>
                  </TabsList>

                  {(['en', 'fr'] as Locale[]).map((locale) => (
                    <TabsContent key={locale} value={locale} className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`translation-${locale}`} className="text-sm font-medium">
                            {t('admin.translation.translationFor', { locale: locale.toUpperCase() })}
                          </Label>
                          <div className="flex items-center gap-2">
                            {editorState.translations[locale]?.status && (
                              <Badge className={getStatusColor(editorState.translations[locale]?.status)}>
                                {editorState.translations[locale]?.status}
                              </Badge>
                            )}
                            {!readonly && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSave(locale, 'draft')}
                                disabled={!editorState.translations[locale]?.value?.trim() || saveTranslationMutation.isPending}
                              >
                                <Save size={12} className="mr-1" />
                                {t('common.save')}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <textarea
                          id={`translation-${locale}`}
                          value={editorState.translations[locale]?.value || ''}
                          onChange={(e) => handleTranslationChange(locale, e.target.value)}
                          placeholder={t('admin.translation.enterTranslation', { locale })}
                          className={`w-full h-32 p-3 border rounded-md resize-none ${
                            locale === 'th' ? 'font-thai' : locale === 'fr' ? 'font-french' : 'font-ui'
                          } ${readonly ? 'bg-muted' : ''}`}
                          readOnly={readonly}
                        />
                        
                        {/* Validation Results */}
                        {validationResults[locale] && (
                          <div className="space-y-2">
                            {validationResults[locale].errors.length > 0 && (
                              <Alert variant="destructive">
                                <AlertTriangle size={16} />
                                <AlertDescription>
                                  <div className="space-y-1">
                                    {validationResults[locale].errors.map((error, i) => (
                                      <div key={i}>{error}</div>
                                    ))}
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {validationResults[locale].warnings.length > 0 && (
                              <Alert>
                                <Info size={16} />
                                <AlertDescription>
                                  <div className="space-y-1">
                                    {validationResults[locale].warnings.map((warning, i) => (
                                      <div key={i}>{warning}</div>
                                    ))}
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {validationResults[locale].interpolation_issues.length > 0 && (
                              <Alert>
                                <Lightbulb size={16} />
                                <AlertDescription>
                                  <div className="space-y-1">
                                    <div className="font-medium">{t('admin.translation.interpolationIssues')}:</div>
                                    {validationResults[locale].interpolation_issues.map((issue, i) => (
                                      <div key={i} className="text-sm">
                                        <span className="font-medium">{issue.variable}</span>: {issue.suggestion}
                                      </div>
                                    ))}
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}

                        {/* Preview */}
                        {showPreview && editorState.translations[locale]?.value && (
                          <div className="p-3 bg-muted/50 rounded border">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              {t('admin.translation.preview')}:
                            </div>
                            <div className={`text-sm ${
                              locale === 'th' ? 'font-thai' : locale === 'fr' ? 'font-french' : 'font-ui'
                            }`}>
                              {previewTranslation(locale, editorState.translations[locale]!.value)}
                            </div>
                          </div>
                        )}

                        {/* Translation Suggestions */}
                        {locale !== 'en' && editorState.translations.en?.value && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200">
                            <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                              {t('admin.translation.suggestions')}:
                            </div>
                            <div className="space-y-1">
                              {generateSuggestions('en', locale).map((suggestion, i) => (
                                <div key={i} className="text-sm text-blue-700 dark:text-blue-300">
                                  {suggestion}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">
                  {t('admin.translation.selectKeyToStart')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TranslationEditor;