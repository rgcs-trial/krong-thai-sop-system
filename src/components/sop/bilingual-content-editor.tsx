'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Languages, 
  Save, 
  Eye, 
  EyeOff, 
  Copy, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  HelpCircle,
  Zap,
  RefreshCw,
  Split,
  Maximize2,
  Minimize2,
  FileText,
  Globe,
  Bot
} from 'lucide-react';
import { useUserPreferences } from '@/lib/stores/settings-store';
import { toast } from '@/hooks/use-toast';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n';

interface BilingualContent {
  en: string;
  fr: string;
}

interface ContentValidation {
  isValid: boolean;
  completeness: number; // 0-100
  issues: {
    type: 'missing' | 'length_mismatch' | 'formatting' | 'translation_quality';
    message: string;
    language?: Locale;
    severity: 'error' | 'warning' | 'info';
  }[];
}

interface BilingualContentEditorProps {
  title?: BilingualContent;
  content?: BilingualContent;
  onSave: (data: { title: BilingualContent; content: BilingualContent }) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
  readOnly?: boolean;
  showPreview?: boolean;
  enableTranslationAssist?: boolean;
  requiredLanguages?: Locale[];
  maxLength?: number;
  placeholder?: BilingualContent;
}

export function BilingualContentEditor({
  title: initialTitle,
  content: initialContent,
  onSave,
  onCancel,
  className = '',
  autoSave = true,
  autoSaveInterval = 30000, // 30 seconds
  readOnly = false,
  showPreview = true,
  enableTranslationAssist = true,
  requiredLanguages = ['en', 'fr'],
  maxLength = 10000,
  placeholder
}: BilingualContentEditorProps) {
  const t = useTranslations('sop.admin');
  const locale = useLocale() as Locale;
  const { preferences, updatePreferences } = useUserPreferences();
  
  // Content state
  const [title, setTitle] = useState<BilingualContent>(
    initialTitle || { en: '', fr: '' }
  );
  const [content, setContent] = useState<BilingualContent>(
    initialContent || { en: '', fr: '' }
  );
  
  // Editor state
  const [editMode, setEditMode] = useState<'single' | 'side-by-side' | 'tabs'>(
    preferences.contentEditing.defaultEditMode === 'bilingual' 
      ? 'side-by-side' 
      : preferences.contentEditing.defaultEditMode === 'single' 
        ? 'single' 
        : 'side-by-side'
  );
  const [activeLanguage, setActiveLanguage] = useState<Locale>(locale);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTranslationAssist, setShowTranslationAssist] = useState(enableTranslationAssist);
  
  // Auto-save and validation
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validation, setValidation] = useState<ContentValidation>({
    isValid: true,
    completeness: 100,
    issues: []
  });
  
  // Refs for auto-save
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const titleRefs = useRef<Record<Locale, HTMLInputElement | null>>({
    en: null,
    fr: null
  });
  const contentRefs = useRef<Record<Locale, HTMLTextAreaElement | null>>({
    en: null,
    fr: null
  });

  // Content validation
  const validateContent = useCallback(() => {
    const issues: ContentValidation['issues'] = [];
    let completeness = 0;
    const totalFields = requiredLanguages.length * 2; // title + content for each language
    let completedFields = 0;

    // Check for missing required content
    requiredLanguages.forEach(lang => {
      if (!title[lang]?.trim()) {
        issues.push({
          type: 'missing',
          message: `Title in ${localeNames[lang]} is required`,
          language: lang,
          severity: 'error'
        });
      } else {
        completedFields++;
      }

      if (!content[lang]?.trim()) {
        issues.push({
          type: 'missing',
          message: `Content in ${localeNames[lang]} is required`,
          language: lang,
          severity: 'error'
        });
      } else {
        completedFields++;
      }
    });

    // Check for length mismatches (warning level)
    const enContentLength = content.en?.length || 0;
    const frContentLength = content.fr?.length || 0;
    
    if (enContentLength > 0 && frContentLength > 0) {
      const lengthRatio = Math.abs(enContentLength - frContentLength) / Math.max(enContentLength, frContentLength);
      if (lengthRatio > 0.5) {
        issues.push({
          type: 'length_mismatch',
          message: 'Content length differs significantly between English and French',
          severity: 'warning'
        });
      }
    }

    // Check for content length limits
    Object.entries(content).forEach(([lang, text]) => {
      if (text && text.length > maxLength) {
        issues.push({
          type: 'formatting',
          message: `Content in ${localeNames[lang as Locale]} exceeds maximum length (${maxLength} characters)`,
          language: lang as Locale,
          severity: 'error'
        });
      }
    });

    completeness = (completedFields / totalFields) * 100;

    setValidation({
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      completeness,
      issues
    });
  }, [title, content, requiredLanguages, maxLength]);

  // Auto-save functionality
  const saveContent = useCallback(async () => {
    if (readOnly || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({ title, content });
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast({
        title: "Content saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [title, content, onSave, readOnly, isSaving]);

  // Auto-save timer
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges || readOnly) return;

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      saveContent();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [hasUnsavedChanges, autoSave, autoSaveInterval, saveContent, readOnly]);

  // Validate content when it changes
  useEffect(() => {
    validateContent();
  }, [validateContent]);

  // Mark as changed when content updates
  useEffect(() => {
    const hasChanged = 
      JSON.stringify(title) !== JSON.stringify(initialTitle) ||
      JSON.stringify(content) !== JSON.stringify(initialContent);
    setHasUnsavedChanges(hasChanged);
  }, [title, content, initialTitle, initialContent]);

  // Handle input changes
  const handleTitleChange = (lang: Locale, value: string) => {
    setTitle(prev => ({ ...prev, [lang]: value }));
  };

  const handleContentChange = (lang: Locale, value: string) => {
    setContent(prev => ({ ...prev, [lang]: value }));
  };

  // Copy content between languages
  const copyContent = (fromLang: Locale, toLang: Locale, field: 'title' | 'content') => {
    if (field === 'title') {
      handleTitleChange(toLang, title[fromLang] || '');
      toast({
        title: "Content copied",
        description: `Title copied from ${localeNames[fromLang]} to ${localeNames[toLang]}`,
      });
    } else {
      handleContentChange(toLang, content[fromLang] || '');
      toast({
        title: "Content copied",
        description: `Content copied from ${localeNames[fromLang]} to ${localeNames[toLang]}`,
      });
    }
  };

  // Translation assistance (placeholder - would integrate with translation service)
  const assistTranslation = async (fromLang: Locale, toLang: Locale, field: 'title' | 'content') => {
    const sourceText = field === 'title' ? title[fromLang] : content[fromLang];
    if (!sourceText?.trim()) {
      toast({
        title: "No content to translate",
        description: `Please enter ${field} in ${localeNames[fromLang]} first.`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Translation assist",
      description: "Translation assistance would be integrated here with a translation service.",
    });
  };

  // Render language tab
  const renderLanguageTab = (lang: Locale) => (
    <div className="space-y-4">
      {/* Title input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`title-${lang}`} className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label={localeNames[lang]}>
              {localeFlags[lang]}
            </span>
            Title ({localeNames[lang]})
            {requiredLanguages.includes(lang) && (
              <span className="text-destructive">*</span>
            )}
          </Label>
          <div className="flex items-center gap-1">
            {editMode === 'side-by-side' && lang !== 'en' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyContent('en', lang, 'title')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Copy from English
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {enableTranslationAssist && lang !== 'en' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => assistTranslation('en', lang, 'title')}
                      className="h-6 w-6 p-0"
                    >
                      <Bot size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Translation assist
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <Input
          id={`title-${lang}`}
          ref={(el) => { titleRefs.current[lang] = el; }}
          value={title[lang] || ''}
          onChange={(e) => handleTitleChange(lang, e.target.value)}
          placeholder={placeholder?.title?.[lang] || `Enter title in ${localeNames[lang]}...`}
          className={`${lang === 'th' ? 'font-thai' : 'font-ui'}`}
          readOnly={readOnly}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{title[lang]?.length || 0} characters</span>
          {title[lang] && title[lang].length > 100 && (
            <Badge variant="outline" className="text-xs">
              Long title
            </Badge>
          )}
        </div>
      </div>

      {/* Content textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`content-${lang}`} className="flex items-center gap-2">
            <FileText size={14} />
            Content ({localeNames[lang]})
            {requiredLanguages.includes(lang) && (
              <span className="text-destructive">*</span>
            )}
          </Label>
          <div className="flex items-center gap-1">
            {editMode === 'side-by-side' && lang !== 'en' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyContent('en', lang, 'content')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Copy from English
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {enableTranslationAssist && lang !== 'en' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => assistTranslation('en', lang, 'content')}
                      className="h-6 w-6 p-0"
                    >
                      <Bot size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Translation assist
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <textarea
          id={`content-${lang}`}
          ref={(el) => { contentRefs.current[lang] = el; }}
          value={content[lang] || ''}
          onChange={(e) => handleContentChange(lang, e.target.value)}
          placeholder={placeholder?.content?.[lang] || `Enter content in ${localeNames[lang]}...`}
          className={`
            min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm 
            placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
            focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-vertical
            ${lang === 'th' ? 'font-thai' : 'font-ui'}
          `}
          readOnly={readOnly}
          maxLength={maxLength}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{content[lang]?.length || 0} / {maxLength} characters</span>
          <div className="flex items-center gap-2">
            {content[lang] && content[lang].length > maxLength * 0.8 && (
              <Badge variant="outline" className="text-xs">
                <AlertTriangle size={10} className="mr-1" />
                Near limit
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Validation summary
  const renderValidationSummary = () => {
    if (validation.issues.length === 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle size={16} />
          All content is valid
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle size={16} className="text-amber-500" />
          {validation.issues.filter(i => i.severity === 'error').length} errors, 
          {validation.issues.filter(i => i.severity === 'warning').length} warnings
        </div>
        <div className="space-y-1">
          {validation.issues.map((issue, index) => (
            <div 
              key={index}
              className={`
                text-xs px-2 py-1 rounded-md flex items-center gap-2
                ${issue.severity === 'error' ? 'bg-destructive/10 text-destructive' : 
                  issue.severity === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                  'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'}
              `}
            >
              {issue.language && (
                <span className="text-xs" role="img">
                  {localeFlags[issue.language]}
                </span>
              )}
              {issue.message}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className={`bilingual-content-editor ${className}`}>
        {/* Header */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Languages size={20} />
                Bilingual Content Editor
                {hasUnsavedChanges && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock size={10} className="mr-1" />
                    Unsaved
                  </Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* Edit mode selector */}
                <Select value={editMode} onValueChange={(value: any) => setEditMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      <div className="flex items-center gap-2">
                        <FileText size={14} />
                        Single
                      </div>
                    </SelectItem>
                    <SelectItem value="side-by-side">
                      <div className="flex items-center gap-2">
                        <Split size={14} />
                        Side by Side
                      </div>
                    </SelectItem>
                    <SelectItem value="tabs">
                      <div className="flex items-center gap-2">
                        <Globe size={14} />
                        Tabs
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Fullscreen toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2"
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </Button>

                {/* Save button */}
                <Button
                  onClick={saveContent}
                  disabled={!hasUnsavedChanges || isSaving || readOnly}
                  className="min-w-[80px]"
                >
                  {isSaving ? (
                    <RefreshCw size={16} className="animate-spin mr-2" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Progress value={validation.completeness} className="w-20" />
                  <span>{Math.round(validation.completeness)}% complete</span>
                </div>
                {lastSaved && (
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {renderValidationSummary()}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Edit mode: Single language */}
            {editMode === 'single' && (
              <div className="space-y-4">
                <Select value={activeLanguage} onValueChange={(value: Locale) => setActiveLanguage(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locales.map(lang => (
                      <SelectItem key={lang} value={lang}>
                        <div className="flex items-center gap-2">
                          <span role="img">{localeFlags[lang]}</span>
                          {localeNames[lang]}
                          {requiredLanguages.includes(lang) && (
                            <span className="text-destructive">*</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderLanguageTab(activeLanguage)}
              </div>
            )}

            {/* Edit mode: Side by side */}
            {editMode === 'side-by-side' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {locales.filter(lang => requiredLanguages.includes(lang) || title[lang] || content[lang]).map(lang => (
                  <div key={lang} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <span className="text-lg" role="img">{localeFlags[lang]}</span>
                      <span className="font-medium">{localeNames[lang]}</span>
                      {requiredLanguages.includes(lang) && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                    {renderLanguageTab(lang)}
                  </div>
                ))}
              </div>
            )}

            {/* Edit mode: Tabs */}
            {editMode === 'tabs' && (
              <Tabs value={activeLanguage} onValueChange={(value: Locale) => setActiveLanguage(value)}>
                <TabsList className="grid w-full grid-cols-3">
                  {locales.map(lang => (
                    <TabsTrigger key={lang} value={lang} className="flex items-center gap-2">
                      <span role="img">{localeFlags[lang]}</span>
                      {localeNames[lang]}
                      {requiredLanguages.includes(lang) && (
                        <span className="text-destructive text-xs">*</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {locales.map(lang => (
                  <TabsContent key={lang} value={lang} className="mt-4">
                    {renderLanguageTab(lang)}
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex items-center gap-2">
                {showTranslationAssist && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTranslationAssist(!showTranslationAssist)}
                    className="flex items-center gap-2"
                  >
                    <Bot size={16} />
                    {showTranslationAssist ? 'Hide' : 'Show'} Translation Assist
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                )}
                
                <Button
                  onClick={saveContent}
                  disabled={!validation.isValid || !hasUnsavedChanges || isSaving || readOnly}
                  className="min-w-[100px]"
                >
                  {isSaving ? (
                    <RefreshCw size={16} className="animate-spin mr-2" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// Export component variants
export const BilingualTitleEditor = ({ 
  title, 
  onTitleChange, 
  className = '',
  readOnly = false 
}: {
  title: BilingualContent;
  onTitleChange: (title: BilingualContent) => void;
  className?: string;
  readOnly?: boolean;
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {(['en', 'th'] as Locale[]).map(lang => (
        <div key={lang} className="space-y-2">
          <Label className="flex items-center gap-2">
            <span role="img">{localeFlags[lang]}</span>
            Title ({localeNames[lang]})
          </Label>
          <Input
            value={title[lang] || ''}
            onChange={(e) => onTitleChange({ ...title, [lang]: e.target.value })}
            placeholder={`Enter title in ${localeNames[lang]}...`}
            className={lang === 'th' ? 'font-thai' : 'font-ui'}
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  );
};

// Quick bilingual input for forms
export const QuickBilingualInput = ({
  value,
  onChange,
  placeholder,
  className = '',
  required = false
}: {
  value: BilingualContent;
  onChange: (value: BilingualContent) => void;
  placeholder?: BilingualContent;
  className?: string;
  required?: boolean;
}) => {
  const [activeTab, setActiveTab] = useState<Locale>('en');
  
  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={(value: Locale) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="en" className="flex items-center gap-2">
            🇺🇸 English
            {required && !value.en?.trim() && <span className="text-destructive">*</span>}
          </TabsTrigger>
          <TabsTrigger value="th" className="flex items-center gap-2">
            🇹🇭 ไทย
            {required && !value.th?.trim() && <span className="text-destructive">*</span>}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="en" className="mt-2">
          <Input
            value={value.en || ''}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            placeholder={placeholder?.en || 'Enter in English...'}
            className="font-ui"
          />
        </TabsContent>
        
        <TabsContent value="th" className="mt-2">
          <Input
            value={value.th || ''}
            onChange={(e) => onChange({ ...value, th: e.target.value })}
            placeholder={placeholder?.th || 'ป้อนเป็นภาษาไทย...'}
            className="font-thai"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};