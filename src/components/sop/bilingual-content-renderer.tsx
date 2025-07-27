'use client';

import React, { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Eye, 
  EyeOff, 
  Copy, 
  ExternalLink,
  BookOpen,
  Globe,
  Maximize2,
  Minimize2,
  Type,
  RotateCcw,
  Settings
} from 'lucide-react';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n';
import { useUserPreferences } from '@/lib/stores/settings-store';
import { toast } from '@/hooks/use-toast';

interface BilingualContent {
  en: string;
  fr: string;
}

interface ContentMetadata {
  id: string;
  title: BilingualContent;
  content: BilingualContent;
  category: string;
  tags: string[];
  lastUpdated: Date;
  version: string;
  status: 'draft' | 'published' | 'archived';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number; // in minutes
  relatedDocuments?: string[];
}

interface BilingualContentRendererProps {
  content: ContentMetadata;
  className?: string;
  showMetadata?: boolean;
  allowLanguageToggle?: boolean;
  showTranslationComparison?: boolean;
  enableFullscreen?: boolean;
  renderMode?: 'single' | 'side-by-side' | 'tabs' | 'overlay';
  preferredLanguage?: Locale;
  fallbackLanguage?: Locale;
  onLanguageChange?: (language: Locale) => void;
  onContentUpdate?: (content: ContentMetadata) => void;
}

export function BilingualContentRenderer({
  content,
  className = '',
  showMetadata = true,
  allowLanguageToggle = true,
  showTranslationComparison = false,
  enableFullscreen = true,
  renderMode = 'single',
  preferredLanguage,
  fallbackLanguage = 'en',
  onLanguageChange,
  onContentUpdate
}: BilingualContentRendererProps) {
  const t = useTranslations('sop');
  const currentLocale = useLocale() as Locale;
  const { preferences } = useUserPreferences();
  
  // State management
  const [activeLanguage, setActiveLanguage] = useState<Locale>(
    preferredLanguage || 
    preferences.languagePreferences.primaryLanguage || 
    currentLocale
  );
  const [showComparison, setShowComparison] = useState(showTranslationComparison);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentRenderMode, setCurrentRenderMode] = useState(renderMode);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Content processing
  const processedContent = useMemo(() => {
    const getContentForLanguage = (lang: Locale, field: 'title' | 'content'): string => {
      const text = content[field][lang];
      if (text && text.trim()) return text;
      
      // Fallback to other languages
      if (lang !== fallbackLanguage && content[field][fallbackLanguage]) {
        return content[field][fallbackLanguage];
      }
      
      // Try any available language
      for (const availableLang of locales) {
        if (content[field][availableLang]) {
          return content[field][availableLang];
        }
      }
      
      return `[No translation available for ${localeNames[lang]}]`;
    };

    return {
      title: getContentForLanguage(activeLanguage, 'title'),
      content: getContentForLanguage(activeLanguage, 'content'),
      titleOriginal: content.title[activeLanguage],
      contentOriginal: content.content[activeLanguage],
      isTranslated: !!content.title[activeLanguage] && !!content.content[activeLanguage]
    };
  }, [content, activeLanguage, fallbackLanguage]);

  // Language handlers
  const handleLanguageChange = (newLanguage: Locale) => {
    setActiveLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Text length utilities
  const getReadingTime = (text: string, language: Locale): number => {
    const wordsPerMinute = 250; // Standard reading speed
    const words = text.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const getTextComplexity = (text: string): 'simple' | 'moderate' | 'complex' => {
    const avgSentenceLength = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / text.split(/\s+/).length;
    
    if (avgSentenceLength < 15 && avgWordLength < 5) return 'simple';
    if (avgSentenceLength < 25 && avgWordLength < 7) return 'moderate';
    return 'complex';
  };

  // Font size class mapping
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  const getTextClass = () => {
    return 'font-body';
  };

  // Render content by mode
  const renderSingleLanguage = () => (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-heading font-bold ${getTextClass()} ${getFontSizeClass()}`}>
            {processedContent.title}
          </h1>
          <div className="flex items-center gap-2">
            {!processedContent.isTranslated && (
              <Badge variant="outline" className="text-xs">
                <Languages size={10} className="mr-1" />
                Auto-translated
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(processedContent.title, 'Title')}
                  >
                    <Copy size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy title</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {showMetadata && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span role="img">{localeFlags[activeLanguage]}</span>
              {localeNames[activeLanguage]}
            </span>
            <span>•</span>
            <span>{getReadingTime(processedContent.content, activeLanguage)} min read</span>
            <span>•</span>
            <Badge variant="secondary" className="text-xs">
              {getTextComplexity(processedContent.content)}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`prose max-w-none ${getTextClass()} ${getFontSizeClass()}`}>
        <div 
          className="whitespace-pre-wrap leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: processedContent.content.replace(/\n/g, '<br />') 
          }}
        />
      </div>
    </div>
  );

  const renderSideBySide = () => {
    const languages = preferences.languagePreferences.secondaryLanguage 
      ? [preferences.languagePreferences.primaryLanguage, preferences.languagePreferences.secondaryLanguage]
      : ['en', 'fr'];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {languages.map((lang) => (
          <div key={lang} className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-lg" role="img">{localeFlags[lang]}</span>
              <span className="font-medium">{localeNames[lang]}</span>
              {!content.title[lang] && (
                <Badge variant="outline" className="text-xs">
                  Missing translation
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <h2 className={`text-xl font-heading font-bold ${lang === 'th' ? 'font-thai' : 'font-body'}`}>
                {content.title[lang] || `[No translation available]`}
              </h2>
              
              <div className={`prose prose-sm max-w-none ${lang === 'th' ? 'font-thai' : 'font-body'}`}>
                <div 
                  className="whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: (content.content[lang] || '[No translation available]').replace(/\n/g, '<br />') 
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabs = () => (
    <Tabs value={activeLanguage} onValueChange={(value: Locale) => handleLanguageChange(value)}>
      <TabsList className="grid w-full grid-cols-3">
        {locales.map(lang => (
          <TabsTrigger key={lang} value={lang} className="flex items-center gap-2">
            <span role="img">{localeFlags[lang]}</span>
            {localeNames[lang]}
            {!content.title[lang] && (
              <span className="text-destructive text-xs">!</span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {locales.map(lang => (
        <TabsContent key={lang} value={lang} className="mt-4">
          <div className="space-y-4">
            <h1 className={`text-2xl font-heading font-bold ${lang === 'th' ? 'font-thai' : 'font-body'}`}>
              {content.title[lang] || '[No translation available]'}
            </h1>
            <div className={`prose max-w-none ${lang === 'th' ? 'font-thai' : 'font-body'}`}>
              <div 
                className="whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: (content.content[lang] || '[No translation available]').replace(/\n/g, '<br />') 
                }}
              />
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );

  const renderContent = () => {
    switch (currentRenderMode) {
      case 'side-by-side':
        return renderSideBySide();
      case 'tabs':
        return renderTabs();
      default:
        return renderSingleLanguage();
    }
  };

  return (
    <TooltipProvider>
      <div className={`bilingual-content-renderer ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-y-auto' : ''}`}>
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen size={20} />
                Content Viewer
                {content.status !== 'published' && (
                  <Badge variant="secondary">{content.status}</Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* Language selector */}
                {allowLanguageToggle && currentRenderMode === 'single' && (
                  <Select value={activeLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map(lang => (
                        <SelectItem key={lang} value={lang}>
                          <div className="flex items-center gap-2">
                            <span role="img">{localeFlags[lang]}</span>
                            {localeNames[lang]}
                            {!content.title[lang] && (
                              <span className="text-destructive">*</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Render mode selector */}
                <Select value={currentRenderMode} onValueChange={(value: any) => setCurrentRenderMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="side-by-side">Side by Side</SelectItem>
                    <SelectItem value="tabs">Tabs</SelectItem>
                  </SelectContent>
                </Select>

                {/* Font size */}
                <Select value={fontSize} onValueChange={(value: any) => setFontSize(value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">
                      <Type size={12} />
                    </SelectItem>
                    <SelectItem value="medium">
                      <Type size={16} />
                    </SelectItem>
                    <SelectItem value="large">
                      <Type size={20} />
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Fullscreen toggle */}
                {enableFullscreen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </Button>
                )}
              </div>
            </div>

            {/* Metadata */}
            {showMetadata && (
              <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Category: {content.category}</span>
                  <span>•</span>
                  <span>Updated: {content.lastUpdated.toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Version: {content.version}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {content.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {renderContent()}
            
            {/* Translation status notice */}
            {!processedContent.isTranslated && currentRenderMode === 'single' && (
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <Languages size={16} />
                  <span className="font-medium">Translation Notice</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  This content is not available in {localeNames[activeLanguage]} and has been auto-translated from {localeNames[fallbackLanguage]}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// Content summary component for lists
export function BilingualContentSummary({
  content,
  language,
  onClick,
  className = ''
}: {
  content: ContentMetadata;
  language: Locale;
  onClick?: () => void;
  className?: string;
}) {
  const getExcerpt = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold line-clamp-1 ${language === 'th' ? 'font-thai' : 'font-body'}`}>
              {content.title[language] || content.title.en || '[No title]'}
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-sm" role="img">{localeFlags[language]}</span>
              {!content.title[language] && (
                <Badge variant="outline" className="text-xs">Missing</Badge>
              )}
            </div>
          </div>
          
          <p className={`text-sm text-muted-foreground line-clamp-2 ${language === 'th' ? 'font-thai' : 'font-body'}`}>
            {getExcerpt(content.content[language] || content.content.en || '')}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.category}</span>
            <span>{content.lastUpdated.toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BilingualContentRenderer;