'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Copy,
  Download,
  Settings,
  Globe,
  RefreshCw,
  Code,
  TestTube
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/hooks/use-toast';
import type { 
  TranslationPreviewPanelProps,
  PreviewConfiguration,
  PreviewContext,
  Locale
} from '@/types/translation-admin';

// Mock components for preview contexts
const PREVIEW_CONTEXTS = {
  button: {
    name: 'Button Component',
    component: ({ text, ...props }: any) => (
      <button className="bg-primary text-primary-foreground px-4 py-2 rounded" {...props}>
        {text}
      </button>
    )
  },
  navigation: {
    name: 'Navigation Menu',
    component: ({ text }: any) => (
      <nav className="flex items-center space-x-4">
        <a href="#" className="text-primary hover:underline">{text}</a>
      </nav>
    )
  },
  alert: {
    name: 'Alert Message',
    component: ({ text }: any) => (
      <div className="border border-amber-200 bg-amber-50 p-4 rounded">
        <p className="text-amber-800">{text}</p>
      </div>
    )
  },
  card: {
    name: 'Card Title',
    component: ({ text }: any) => (
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg">{text}</h3>
        <p className="text-muted-foreground">Sample content...</p>
      </div>
    )
  },
  form: {
    name: 'Form Label',
    component: ({ text }: any) => (
      <div className="space-y-2">
        <label className="text-sm font-medium">{text}</label>
        <input className="border rounded px-3 py-2 w-full" placeholder="Enter value..." />
      </div>
    )
  }
};

/**
 * Translation Preview Panel Component
 * Real-time preview of translations in different UI contexts
 */
export function TranslationPreviewPanel({
  className = '',
  translationKey,
  configuration,
  onConfigurationChange
}: TranslationPreviewPanelProps) {
  const { t, locale: currentLocale } = useI18n();

  // State management
  const [previewConfig, setPreviewConfig] = useState<PreviewConfiguration>(
    configuration || {
      locale: 'en',
      device: 'tablet',
      orientation: 'landscape',
      context: {
        component: 'button',
        props: {},
        mock_data: {}
      },
      interpolation_values: {}
    }
  );
  const [customText, setCustomText] = useState('');
  const [showCode, setShowCode] = useState(false);

  // Fetch translation data
  const { 
    data: translationData, 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['translation-preview', translationKey, previewConfig.locale],
    queryFn: async () => {
      if (!translationKey) return null;
      
      const response = await fetch(
        `/api/admin/translations/preview/${translationKey}?locale=${previewConfig.locale}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch translation');
      return response.json();
    },
    enabled: !!translationKey,
  });

  // Handle configuration changes
  const handleConfigChange = useCallback((updates: Partial<PreviewConfiguration>) => {
    const newConfig = { ...previewConfig, ...updates };
    setPreviewConfig(newConfig);
    onConfigurationChange?.(newConfig);
  }, [previewConfig, onConfigurationChange]);

  // Process translation with interpolation
  const processedTranslation = useMemo(() => {
    if (!translationData?.value) return customText || 'Sample text';
    
    let processed = translationData.value;
    
    // Apply interpolation values
    Object.entries(previewConfig.interpolation_values).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    });
    
    return processed;
  }, [translationData, previewConfig.interpolation_values, customText]);

  // Get device viewport styles
  const getDeviceStyles = useCallback(() => {
    const baseStyles = "border rounded-lg bg-background overflow-hidden transition-all duration-300";
    
    switch (previewConfig.device) {
      case 'mobile':
        return `${baseStyles} w-80 h-96`;
      case 'tablet':
        return previewConfig.orientation === 'portrait' 
          ? `${baseStyles} w-96 h-[32rem]`
          : `${baseStyles} w-[48rem] h-80`;
      case 'desktop':
        return `${baseStyles} w-full h-96`;
      default:
        return `${baseStyles} w-96 h-80`;
    }
  }, [previewConfig.device, previewConfig.orientation]);

  // Render preview component
  const renderPreviewComponent = useCallback(() => {
    const contextConfig = PREVIEW_CONTEXTS[previewConfig.context.component as keyof typeof PREVIEW_CONTEXTS];
    
    if (!contextConfig) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          Unknown component: {previewConfig.context.component}
        </div>
      );
    }

    const Component = contextConfig.component;
    
    return (
      <div className="p-4">
        <Component 
          text={processedTranslation}
          {...previewConfig.context.props}
        />
      </div>
    );
  }, [previewConfig.context, processedTranslation]);

  // Generate code snippet
  const generateCodeSnippet = useCallback(() => {
    if (!translationKey) return '';
    
    const interpolationCode = Object.keys(previewConfig.interpolation_values).length > 0
      ? `, { ${Object.entries(previewConfig.interpolation_values)
          .map(([key, value]) => `${key}: "${value}"`)
          .join(', ')} }`
      : '';
    
    return `const text = t('${translationKey}'${interpolationCode});`;
  }, [translationKey, previewConfig.interpolation_values]);

  return (
    <div className={`translation-preview-panel space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Eye size={20} />
            {t('admin.translation.previewPanel')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {translationKey || t('admin.translation.noKeySelected')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCode(!showCode)}
            className="min-h-[40px]"
          >
            <Code size={16} className="mr-2" />
            {showCode ? t('admin.translation.hideCode') : t('admin.translation.showCode')}
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="min-h-[40px]"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings size={16} />
              {t('admin.translation.previewSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Locale Selection */}
            <div className="space-y-2">
              <Label>{t('admin.translation.locale')}</Label>
              <Select 
                value={previewConfig.locale} 
                onValueChange={(value: Locale) => handleConfigChange({ locale: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="th">ไทย</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Device Selection */}
            <div className="space-y-2">
              <Label>{t('admin.translation.device')}</Label>
              <div className="flex gap-2">
                {[
                  { value: 'mobile', icon: Smartphone, label: t('admin.translation.mobile') },
                  { value: 'tablet', icon: Tablet, label: t('admin.translation.tablet') },
                  { value: 'desktop', icon: Monitor, label: t('admin.translation.desktop') }
                ].map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant={previewConfig.device === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleConfigChange({ device: value as any })}
                    className="flex-1"
                  >
                    <Icon size={14} className="mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Orientation (for tablet/mobile) */}
            {(previewConfig.device === 'tablet' || previewConfig.device === 'mobile') && (
              <div className="space-y-2">
                <Label>{t('admin.translation.orientation')}</Label>
                <div className="flex gap-2">
                  <Button
                    variant={previewConfig.orientation === 'portrait' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleConfigChange({ orientation: 'portrait' })}
                    className="flex-1"
                  >
                    {t('admin.translation.portrait')}
                  </Button>
                  <Button
                    variant={previewConfig.orientation === 'landscape' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleConfigChange({ orientation: 'landscape' })}
                    className="flex-1"
                  >
                    {t('admin.translation.landscape')}
                  </Button>
                </div>
              </div>
            )}

            {/* Component Context */}
            <div className="space-y-2">
              <Label>{t('admin.translation.component')}</Label>
              <Select 
                value={previewConfig.context.component} 
                onValueChange={(value) => handleConfigChange({ 
                  context: { ...previewConfig.context, component: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PREVIEW_CONTEXTS).map(([key, { name }]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Custom Text Input */}
            <div className="space-y-2">
              <Label>{t('admin.translation.customText')}</Label>
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={t('admin.translation.enterCustomText')}
              />
              <p className="text-xs text-muted-foreground">
                {t('admin.translation.customTextHelp')}
              </p>
            </div>

            {/* Interpolation Values */}
            {translationData?.interpolation_vars?.length > 0 && (
              <div className="space-y-2">
                <Label>{t('admin.translation.interpolationValues')}</Label>
                <div className="space-y-2">
                  {translationData.interpolation_vars.map((variable: string) => (
                    <div key={variable} className="space-y-1">
                      <Label className="text-xs">{variable}</Label>
                      <Input
                        value={previewConfig.interpolation_values[variable] || ''}
                        onChange={(e) => handleConfigChange({
                          interpolation_values: {
                            ...previewConfig.interpolation_values,
                            [variable]: e.target.value
                          }
                        })}
                        placeholder={`Value for ${variable}`}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={() => {
                setCustomText('');
                handleConfigChange({
                  locale: 'en',
                  device: 'tablet',
                  orientation: 'landscape',
                  interpolation_values: {}
                });
              }}
              className="w-full"
            >
              <RotateCcw size={16} className="mr-2" />
              {t('common.reset')}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube size={16} />
                {t('admin.translation.livePreview')}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {previewConfig.locale.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {previewConfig.device}
                </Badge>
                {(previewConfig.device === 'tablet' || previewConfig.device === 'mobile') && (
                  <Badge variant="outline">
                    {previewConfig.orientation}
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device Frame */}
            <div className="flex justify-center p-4">
              <div className={getDeviceStyles()}>
                <div className="h-8 bg-muted flex items-center px-3 text-xs text-muted-foreground">
                  <Globe size={12} className="mr-2" />
                  {t('admin.translation.preview')} - {previewConfig.locale.toUpperCase()}
                </div>
                <div className="flex-1 bg-background">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <RefreshCw size={24} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    renderPreviewComponent()
                  )}
                </div>
              </div>
            </div>

            {/* Translation Info */}
            {translationData && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('admin.translation.originalText')}:</span>
                  <Badge variant="outline" className={
                    translationData.status === 'published' ? 'bg-green-100 text-green-800' :
                    translationData.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    translationData.status === 'review' ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {t(`admin.translation.status.${translationData.status}`)}
                  </Badge>
                </div>
                <p className="text-sm font-mono bg-background p-2 rounded border">
                  {translationData.value}
                </p>
                {processedTranslation !== translationData.value && (
                  <>
                    <span className="text-sm font-medium">{t('admin.translation.processedText')}:</span>
                    <p className="text-sm font-mono bg-background p-2 rounded border">
                      {processedTranslation}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Code Snippet */}
            {showCode && translationKey && (
              <div className="p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">TypeScript</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generateCodeSnippet());
                      toast({
                        title: t('common.copied'),
                        description: t('admin.translation.codeCopied'),
                      });
                    }}
                    className="h-6 px-2 text-slate-400 hover:text-slate-100"
                  >
                    <Copy size={12} />
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap">{generateCodeSnippet()}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TranslationPreviewPanel;