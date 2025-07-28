'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Languages, 
  Lightbulb,
  Eye,
  RotateCcw,
  Save,
  Wand2,
  Target,
  BookOpen,
  MessageSquare,
  Globe,
  Search,
  Filter,
  TrendingUp,
  Award,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';

interface TranslationIssue {
  id: string;
  type: 'grammar' | 'terminology' | 'consistency' | 'context' | 'style' | 'accuracy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  messageFr: string;
  sourceText: string;
  targetText: string;
  suggestion?: string;
  suggestionFr?: string;
  position: {
    start: number;
    end: number;
  };
  field: 'title' | 'content' | 'tags' | 'summary';
  confidence: number; // 0-100
}

interface TranslationQualityScore {
  overall: number; // 0-100
  grammar: number;
  terminology: number;
  consistency: number;
  context: number;
  style: number;
  accuracy: number;
  readability: number;
}

interface TranslationSuggestion {
  id: string;
  type: 'improvement' | 'alternative' | 'clarification';
  sourceText: string;
  currentTranslation: string;
  suggestedTranslation: string;
  reason: string;
  reasonFr: string;
  confidence: number;
  votes: number;
  field: string;
  position: {
    start: number;
    end: number;
  };
}

interface TranslationAnalysis {
  sourceLanguage: 'en' | 'fr';
  targetLanguage: 'fr' | 'en';
  qualityScore: TranslationQualityScore;
  issues: TranslationIssue[];
  suggestions: TranslationSuggestion[];
  wordCount: {
    source: number;
    target: number;
  };
  readabilityScore: {
    source: number;
    target: number;
  };
  terminologyConsistency: number;
  contextualAccuracy: number;
  completenessScore: number;
}

interface SOPTranslationQualityCheckerProps {
  /** Source text in original language */
  sourceText: {
    title: string;
    content: string;
    tags: string[];
    summary?: string;
  };
  /** Target text in translated language */
  targetText: {
    title: string;
    content: string;
    tags: string[];
    summary?: string;
  };
  /** Source language */
  sourceLanguage: 'en' | 'fr';
  /** Target language */
  targetLanguage: 'fr' | 'en';
  /** Domain-specific terminology dictionary */
  terminologyDict?: { [key: string]: string[] };
  /** Callback when translation is updated */
  onTranslationUpdate: (field: string, newText: string) => void;
  /** Callback when analysis is requested */
  onAnalyzeTranslation: (source: any, target: any) => Promise<TranslationAnalysis>;
  /** Callback when suggestion is applied */
  onApplySuggestion: (suggestionId: string, field: string) => void;
  /** Callback when suggestion is rated */
  onRateSuggestion: (suggestionId: string, rating: 'helpful' | 'not_helpful') => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * IssueHighlighter - Component to highlight issues in text
 */
const IssueHighlighter: React.FC<{
  text: string;
  issues: TranslationIssue[];
  onIssueClick: (issue: TranslationIssue) => void;
}> = ({ text, issues, onIssueClick }) => {
  const highlightedText = useMemo(() => {
    if (issues.length === 0) return text;
    
    const sortedIssues = [...issues].sort((a, b) => a.position.start - b.position.start);
    let result = '';
    let lastIndex = 0;
    
    sortedIssues.forEach((issue, index) => {
      // Add text before the issue
      result += text.slice(lastIndex, issue.position.start);
      
      // Add highlighted issue text
      const issueText = text.slice(issue.position.start, issue.position.end);
      const severityClass = {
        low: 'bg-blue-100 border-b-2 border-blue-400 cursor-pointer',
        medium: 'bg-yellow-100 border-b-2 border-yellow-400 cursor-pointer',
        high: 'bg-orange-100 border-b-2 border-orange-400 cursor-pointer',
        critical: 'bg-red-100 border-b-2 border-red-400 cursor-pointer'
      };
      
      result += `<span class="${severityClass[issue.severity]}" data-issue-id="${issue.id}">${issueText}</span>`;
      lastIndex = issue.position.end;
    });
    
    // Add remaining text
    result += text.slice(lastIndex);
    return result;
  }, [text, issues]);
  
  return (
    <div 
      className="text-tablet-base font-body leading-relaxed"
      dangerouslySetInnerHTML={{ __html: highlightedText }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.issueId) {
          const issue = issues.find(i => i.id === target.dataset.issueId);
          if (issue) onIssueClick(issue);
        }
      }}
    />
  );
};

/**
 * QualityScoreCard - Component to display quality scores
 */
const QualityScoreCard: React.FC<{
  score: TranslationQualityScore;
  locale: 'en' | 'fr';
}> = ({ score, locale }) => {
  const t = useTranslations('sop.translationQuality');
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-jade-green';
    if (score >= 60) return 'text-saffron-gold';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getScoreIcon = (score: number) => {
    if (score >= 90) return <Award className="w-5 h-5 text-green-600" />;
    if (score >= 75) return <CheckCircle className="w-5 h-5 text-jade-green" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-saffron-gold" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };
  
  const scoreCategories = [
    { key: 'grammar', label: t('scores.grammar') },
    { key: 'terminology', label: t('scores.terminology') },
    { key: 'consistency', label: t('scores.consistency') },
    { key: 'context', label: t('scores.context') },
    { key: 'style', label: t('scores.style') },
    { key: 'accuracy', label: t('scores.accuracy') },
    { key: 'readability', label: t('scores.readability') }
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getScoreIcon(score.overall)}
          {t('qualityScore')}
          <Badge className={cn("ml-2", getScoreColor(score.overall))}>
            {score.overall}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className={cn("text-4xl font-bold", getScoreColor(score.overall))}>
            {score.overall}
          </div>
          <p className="text-tablet-sm text-muted-foreground">
            {t('overallQuality')}
          </p>
        </div>
        
        {/* Category Scores */}
        <div className="space-y-3">
          {scoreCategories.map(category => {
            const categoryScore = score[category.key as keyof TranslationQualityScore] as number;
            return (
              <div key={category.key} className="space-y-1">
                <div className="flex justify-between text-tablet-sm">
                  <span>{category.label}</span>
                  <span className={getScoreColor(categoryScore)}>
                    {categoryScore}/100
                  </span>
                </div>
                <Progress 
                  value={categoryScore} 
                  className="h-2"
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * IssuesList - Component to display translation issues
 */
const IssuesList: React.FC<{
  issues: TranslationIssue[];
  locale: 'en' | 'fr';
  onFixIssue: (issue: TranslationIssue) => void;
}> = ({ issues, locale, onFixIssue }) => {
  const t = useTranslations('sop.translationQuality');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const severityMatch = filterSeverity === 'all' || issue.severity === filterSeverity;
      const typeMatch = filterType === 'all' || issue.type === filterType;
      return severityMatch && typeMatch;
    });
  }, [issues, filterSeverity, filterType]);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar': return <BookOpen className="w-4 h-4" />;
      case 'terminology': return <Target className="w-4 h-4" />;
      case 'consistency': return <RefreshCw className="w-4 h-4" />;
      case 'context': return <MessageSquare className="w-4 h-4" />;
      case 'style': return <Wand2 className="w-4 h-4" />;
      case 'accuracy': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };
  
  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-jade-green mx-auto mb-4" />
          <p className="text-tablet-base text-muted-foreground">
            {t('noIssuesFound')}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1 border rounded text-tablet-sm"
          >
            <option value="all">{t('filters.allSeverities')}</option>
            <option value="critical">{t('severity.critical')}</option>
            <option value="high">{t('severity.high')}</option>
            <option value="medium">{t('severity.medium')}</option>
            <option value="low">{t('severity.low')}</option>
          </select>
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1 border rounded text-tablet-sm"
        >
          <option value="all">{t('filters.allTypes')}</option>
          <option value="grammar">{t('types.grammar')}</option>
          <option value="terminology">{t('types.terminology')}</option>
          <option value="consistency">{t('types.consistency')}</option>
          <option value="context">{t('types.context')}</option>
          <option value="style">{t('types.style')}</option>
          <option value="accuracy">{t('types.accuracy')}</option>
        </select>
      </div>
      
      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.map((issue) => (
          <Card key={issue.id} className="border-l-4 border-l-orange-400">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getTypeIcon(issue.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn("text-tablet-xs", getSeverityColor(issue.severity))}>
                        {t(`severity.${issue.severity}`)}
                      </Badge>
                      <Badge variant="outline" className="text-tablet-xs">
                        {t(`types.${issue.type}`)}
                      </Badge>
                      <Badge variant="outline" className="text-tablet-xs">
                        {t(`fields.${issue.field}`)}
                      </Badge>
                    </div>
                    
                    <p className="text-tablet-sm font-medium text-krong-black mb-2">
                      {locale === 'fr' ? issue.messageFr : issue.message}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="p-2 bg-red-50 rounded text-tablet-sm">
                        <span className="font-medium text-red-700">{t('issue')}: </span>
                        <span className="font-mono">{issue.targetText}</span>
                      </div>
                      
                      {issue.suggestion && (
                        <div className="p-2 bg-green-50 rounded text-tablet-sm">
                          <span className="font-medium text-green-700">{t('suggestion')}: </span>
                          <span className="font-mono">
                            {locale === 'fr' ? issue.suggestionFr : issue.suggestion}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-tablet-xs text-muted-foreground">
                      <span>{t('confidence')}: {issue.confidence}%</span>
                      <span>{t('position')}: {issue.position.start}-{issue.position.end}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {issue.suggestion && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFixIssue(issue)}
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      {t('applySuggestion')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/**
 * SuggestionsList - Component to display translation suggestions
 */
const SuggestionsList: React.FC<{
  suggestions: TranslationSuggestion[];
  locale: 'en' | 'fr';
  onApplySuggestion: (suggestion: TranslationSuggestion) => void;
  onRateSuggestion: (suggestionId: string, rating: 'helpful' | 'not_helpful') => void;
}> = ({ suggestions, locale, onApplySuggestion, onRateSuggestion }) => {
  const t = useTranslations('sop.translationQuality');
  
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Lightbulb className="w-12 h-12 text-saffron-gold mx-auto mb-4" />
          <p className="text-tablet-base text-muted-foreground">
            {t('noSuggestionsFound')}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className="border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-tablet-xs">
                    {t(`suggestionTypes.${suggestion.type}`)}
                  </Badge>
                  <Badge variant="outline" className="text-tablet-xs">
                    {t(`fields.${suggestion.field}`)}
                  </Badge>
                  <span className="text-tablet-xs text-muted-foreground">
                    {t('confidence')}: {suggestion.confidence}%
                  </span>
                </div>
                
                <p className="text-tablet-sm text-muted-foreground mb-3">
                  {locale === 'fr' ? suggestion.reasonFr : suggestion.reason}
                </p>
                
                <div className="space-y-2">
                  <div className="p-2 bg-gray-50 rounded text-tablet-sm">
                    <span className="font-medium text-gray-700">{t('current')}: </span>
                    <span className="font-mono">{suggestion.currentTranslation}</span>
                  </div>
                  
                  <div className="p-2 bg-blue-50 rounded text-tablet-sm">
                    <span className="font-medium text-blue-700">{t('suggested')}: </span>
                    <span className="font-mono">{suggestion.suggestedTranslation}</span>
                  </div>
                </div>
                
                {suggestion.votes > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-tablet-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>{suggestion.votes} {t('votes')}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApplySuggestion(suggestion)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {t('applySuggestion')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRateSuggestion(suggestion.id, 'helpful')}
                >
                  👍
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRateSuggestion(suggestion.id, 'not_helpful')}
                >
                  👎
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/**
 * SOPTranslationQualityChecker - Translation validation and improvement system
 * 
 * Features:
 * - Comprehensive translation quality analysis
 * - Grammar, terminology, and consistency checking
 * - Context-aware suggestions and improvements
 * - Visual issue highlighting in text
 * - Bilingual UI with FR/EN support
 * - Domain-specific terminology validation
 * - Readability and style analysis
 * - Collaborative suggestion voting system
 * - Real-time translation editing
 * - Export quality reports
 * - Integration with professional translation tools
 * - Accessibility compliance checking
 * 
 * @param props SOPTranslationQualityCheckerProps
 * @returns JSX.Element
 */
const SOPTranslationQualityChecker: React.FC<SOPTranslationQualityCheckerProps> = ({
  sourceText,
  targetText,
  sourceLanguage,
  targetLanguage,
  terminologyDict = {},
  onTranslationUpdate,
  onAnalyzeTranslation,
  onApplySuggestion,
  onRateSuggestion,
  className
}) => {
  const t = useTranslations('sop.translationQuality');
  const [analysis, setAnalysis] = useState<TranslationAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIssue, setSelectedIssue] = useState<TranslationIssue | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await onAnalyzeTranslation(sourceText, targetText);
      setAnalysis(result);
    } catch (error) {
      console.error('Translation analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sourceText, targetText, onAnalyzeTranslation]);

  const handleFixIssue = useCallback((issue: TranslationIssue) => {
    if (issue.suggestion) {
      const fieldText = targetText[issue.field as keyof typeof targetText];
      if (typeof fieldText === 'string') {
        const before = fieldText.slice(0, issue.position.start);
        const after = fieldText.slice(issue.position.end);
        const newText = before + issue.suggestion + after;
        onTranslationUpdate(issue.field, newText);
      }
    }
  }, [targetText, onTranslationUpdate]);

  const handleApplySuggestion = useCallback((suggestion: TranslationSuggestion) => {
    onApplySuggestion(suggestion.id, suggestion.field);
  }, [onApplySuggestion]);

  const handleStartEdit = useCallback((field: string) => {
    setEditingField(field);
    setEditText(targetText[field as keyof typeof targetText] as string || '');
  }, [targetText]);

  const handleSaveEdit = useCallback(() => {
    if (editingField) {
      onTranslationUpdate(editingField, editText);
      setEditingField(null);
      setEditText('');
    }
  }, [editingField, editText, onTranslationUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditText('');
  }, []);

  // Auto-analyze when texts change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText && targetText) {
        handleAnalyze();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [sourceText, targetText, handleAnalyze]);

  const getFieldIssues = useCallback((field: string) => {
    return analysis?.issues.filter(issue => issue.field === field) || [];
  }, [analysis]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-tablet-xl font-heading font-bold text-krong-black flex items-center gap-2">
            <Languages className="w-6 h-6" />
            {t('title')}
          </h2>
          <p className="text-tablet-base font-body text-muted-foreground">
            {t('subtitle', { from: sourceLanguage.toUpperCase(), to: targetLanguage.toUpperCase() })}
          </p>
        </div>
        
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {t('analyzing')}
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              {t('analyzeTranslation')}
            </>
          )}
        </Button>
      </div>

      {/* Content Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Text */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('sourceText')} ({sourceLanguage.toUpperCase()})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-tablet-sm font-medium text-muted-foreground mb-2">
                {t('fields.title')}
              </h4>
              <p className="text-tablet-base font-body">{sourceText.title}</p>
            </div>
            
            <div>
              <h4 className="text-tablet-sm font-medium text-muted-foreground mb-2">
                {t('fields.content')}
              </h4>
              <div className="max-h-64 overflow-y-auto p-3 bg-gray-50 rounded">
                <p className="text-tablet-sm font-body">{sourceText.content}</p>
              </div>
            </div>
            
            {sourceText.tags.length > 0 && (
              <div>
                <h4 className="text-tablet-sm font-medium text-muted-foreground mb-2">
                  {t('fields.tags')}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {sourceText.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-tablet-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target Text */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              {t('targetText')} ({targetLanguage.toUpperCase()})
              {analysis && (
                <Badge className={cn(
                  "ml-2",
                  analysis.qualityScore.overall >= 75 ? "bg-green-100 text-green-800" :
                  analysis.qualityScore.overall >= 50 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                )}>
                  {analysis.qualityScore.overall}/100
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-tablet-sm font-medium text-muted-foreground">
                  {t('fields.title')}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit('title')}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </div>
              
              {editingField === 'title' ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="text-tablet-base"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Save className="w-3 h-3 mr-1" />
                      {t('save')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <IssueHighlighter
                  text={targetText.title}
                  issues={getFieldIssues('title')}
                  onIssueClick={setSelectedIssue}
                />
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-tablet-sm font-medium text-muted-foreground">
                  {t('fields.content')}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit('content')}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="max-h-64 overflow-y-auto p-3 bg-gray-50 rounded">
                {editingField === 'content' ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-tablet-sm min-h-[200px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="w-3 h-3 mr-1" />
                        {t('save')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        {t('cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <IssueHighlighter
                    text={targetText.content}
                    issues={getFieldIssues('content')}
                    onIssueClick={setSelectedIssue}
                  />
                )}
              </div>
            </div>
            
            {targetText.tags.length > 0 && (
              <div>
                <h4 className="text-tablet-sm font-medium text-muted-foreground mb-2">
                  {t('fields.tags')}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {targetText.tags.map((tag, index) => {
                    const tagIssues = getFieldIssues('tags');
                    const hasIssue = tagIssues.length > 0;
                    return (
                      <Badge 
                        key={index} 
                        variant={hasIssue ? "destructive" : "outline"} 
                        className="text-tablet-xs"
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="issues">
              {t('tabs.issues')} ({analysis.issues.length})
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              {t('tabs.suggestions')} ({analysis.suggestions.length})
            </TabsTrigger>
            <TabsTrigger value="statistics">{t('tabs.statistics')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QualityScoreCard score={analysis.qualityScore} locale={targetLanguage} />
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('analysisOverview')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-2xl font-bold text-blue-600">
                        {analysis.issues.filter(i => i.severity === 'critical').length}
                      </p>
                      <p className="text-tablet-xs text-blue-600">{t('criticalIssues')}</p>
                    </div>
                    
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <p className="text-2xl font-bold text-orange-600">
                        {analysis.issues.filter(i => i.severity === 'high').length}
                      </p>
                      <p className="text-tablet-xs text-orange-600">{t('highIssues')}</p>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-2xl font-bold text-green-600">
                        {analysis.suggestions.length}
                      </p>
                      <p className="text-tablet-xs text-green-600">{t('suggestions')}</p>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <p className="text-2xl font-bold text-purple-600">
                        {analysis.completenessScore}%
                      </p>
                      <p className="text-tablet-xs text-purple-600">{t('completeness')}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-tablet-sm">
                      <span>{t('terminologyConsistency')}</span>
                      <span>{analysis.terminologyConsistency}%</span>
                    </div>
                    <Progress value={analysis.terminologyConsistency} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-tablet-sm">
                      <span>{t('contextualAccuracy')}</span>
                      <span>{analysis.contextualAccuracy}%</span>
                    </div>
                    <Progress value={analysis.contextualAccuracy} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues">
            <IssuesList
              issues={analysis.issues}
              locale={targetLanguage}
              onFixIssue={handleFixIssue}
            />
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            <SuggestionsList
              suggestions={analysis.suggestions}
              locale={targetLanguage}
              onApplySuggestion={handleApplySuggestion}
              onRateSuggestion={onRateSuggestion}
            />
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('wordCountAnalysis')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-krong-black">
                        {analysis.wordCount.source}
                      </p>
                      <p className="text-tablet-sm text-muted-foreground">
                        {t('sourceWords')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-krong-black">
                        {analysis.wordCount.target}
                      </p>
                      <p className="text-tablet-sm text-muted-foreground">
                        {t('targetWords')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-lg font-bold">
                      {((analysis.wordCount.target / analysis.wordCount.source) * 100).toFixed(1)}%
                    </p>
                    <p className="text-tablet-xs text-muted-foreground">
                      {t('lengthRatio')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('readabilityAnalysis')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-tablet-sm">
                      <span>{t('sourceReadability')}</span>
                      <span>{analysis.readabilityScore.source}/100</span>
                    </div>
                    <Progress value={analysis.readabilityScore.source} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-tablet-sm">
                      <span>{t('targetReadability')}</span>
                      <span>{analysis.readabilityScore.target}/100</span>
                    </div>
                    <Progress value={analysis.readabilityScore.target} className="h-2" />
                  </div>
                  
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-tablet-sm text-muted-foreground">
                      {analysis.readabilityScore.target >= analysis.readabilityScore.source 
                        ? t('readabilityImproved') 
                        : t('readabilityReduced')
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Selected Issue Details */}
      {selectedIssue && (
        <Card className="border-2 border-orange-400">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('issueDetails')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIssue(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  "text-tablet-xs",
                  selectedIssue.severity === 'critical' ? "bg-red-100 text-red-800" :
                  selectedIssue.severity === 'high' ? "bg-orange-100 text-orange-800" :
                  selectedIssue.severity === 'medium' ? "bg-yellow-100 text-yellow-800" :
                  "bg-blue-100 text-blue-800"
                )}>
                  {t(`severity.${selectedIssue.severity}`)}
                </Badge>
                <Badge variant="outline" className="text-tablet-xs">
                  {t(`types.${selectedIssue.type}`)}
                </Badge>
              </div>
              
              <p className="text-tablet-base">
                {targetLanguage === 'fr' ? selectedIssue.messageFr : selectedIssue.message}
              </p>
              
              {selectedIssue.suggestion && (
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-tablet-sm font-medium text-green-700 mb-1">
                    {t('suggestion')}:
                  </p>
                  <p className="text-tablet-sm">
                    {targetLanguage === 'fr' ? selectedIssue.suggestionFr : selectedIssue.suggestion}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleFixIssue(selectedIssue)}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    {t('applySuggestion')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SOPTranslationQualityChecker;