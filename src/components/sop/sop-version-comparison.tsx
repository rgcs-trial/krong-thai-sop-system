'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GitBranch, 
  Clock, 
  User, 
  Plus, 
  Minus, 
  Edit3, 
  Eye,
  Download,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Maximize2,
  Copy,
  Share2
} from 'lucide-react';

interface SOPVersionData {
  id: string;
  version: string;
  title: string;
  titleFr: string;
  content: string;
  contentFr: string;
  changesSummary: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  tags: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
}

interface VersionChange {
  type: 'added' | 'removed' | 'modified';
  field: string;
  oldValue?: string;
  newValue?: string;
  lineNumber?: number;
  significance: 'minor' | 'major' | 'critical';
}

interface VersionComparison {
  fromVersion: SOPVersionData;
  toVersion: SOPVersionData;
  changes: VersionChange[];
  summary: {
    totalChanges: number;
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    significantChanges: number;
  };
}

interface SOPVersionComparisonProps {
  /** SOP document ID */
  sopId: string;
  /** Available versions for comparison */
  versions: SOPVersionData[];
  /** Currently selected version for comparison */
  selectedVersions?: {
    from: string;
    to: string;
  };
  /** Current active language */
  locale: 'en' | 'fr';
  /** Callback when version selection changes */
  onVersionChange: (fromVersion: string, toVersion: string) => void;
  /** Callback to generate comparison data */
  onGenerateComparison: (fromId: string, toId: string) => Promise<VersionComparison>;
  /** Callback to export comparison */
  onExportComparison?: (format: 'pdf' | 'html' | 'json') => void;
  /** Callback to restore version */
  onRestoreVersion?: (versionId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * DiffViewer - Component to display text differences
 */
const DiffViewer: React.FC<{
  oldText: string;
  newText: string;
  title: string;
  language: 'en' | 'fr';
}> = ({ oldText, newText, title, language }) => {
  const t = useTranslations('sop.versionComparison');
  
  // Simple diff algorithm - in production, use a proper diff library
  const generateDiff = useCallback((old: string, new_: string) => {
    const oldLines = old.split('\n');
    const newLines = new_.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    const diff = [];
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === newLine) {
        diff.push({ type: 'unchanged', content: oldLine, lineNumber: i + 1 });
      } else if (oldLine && !newLine) {
        diff.push({ type: 'removed', content: oldLine, lineNumber: i + 1 });
      } else if (!oldLine && newLine) {
        diff.push({ type: 'added', content: newLine, lineNumber: i + 1 });
      } else {
        diff.push({ type: 'modified', oldContent: oldLine, newContent: newLine, lineNumber: i + 1 });
      }
    }
    return diff;
  }, []);
  
  const diff = generateDiff(oldText, newText);
  
  return (
    <div className="space-y-2">
      <h4 className="text-tablet-base font-heading font-semibold text-krong-black">
        {title}
      </h4>
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <div className="grid grid-cols-2 gap-4 text-tablet-sm font-mono">
            <span className="text-red-600">{t('oldVersion')}</span>
            <span className="text-green-600">{t('newVersion')}</span>
          </div>
        </div>
        <ScrollArea className="max-h-96">
          <div className="divide-y">
            {diff.map((line, index) => (
              <div key={index} className={cn(
                "grid grid-cols-2 gap-4 px-4 py-1 text-tablet-sm font-mono",
                line.type === 'added' && "bg-green-50",
                line.type === 'removed' && "bg-red-50",
                line.type === 'modified' && "bg-yellow-50"
              )}>
                {line.type === 'unchanged' && (
                  <>
                    <div className="text-gray-600">{line.content}</div>
                    <div className="text-gray-600">{line.content}</div>
                  </>
                )}
                {line.type === 'removed' && (
                  <>
                    <div className="text-red-600 bg-red-100 px-2">
                      <Minus className="w-3 h-3 inline mr-1" />
                      {line.content}
                    </div>
                    <div></div>
                  </>
                )}
                {line.type === 'added' && (
                  <>
                    <div></div>
                    <div className="text-green-600 bg-green-100 px-2">
                      <Plus className="w-3 h-3 inline mr-1" />
                      {line.content}
                    </div>
                  </>
                )}
                {line.type === 'modified' && (
                  <>
                    <div className="text-red-600 bg-red-100 px-2">
                      <Edit3 className="w-3 h-3 inline mr-1" />
                      {line.oldContent}
                    </div>
                    <div className="text-green-600 bg-green-100 px-2">
                      <Edit3 className="w-3 h-3 inline mr-1" />
                      {line.newContent}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

/**
 * VersionSelector - Component for selecting versions to compare
 */
const VersionSelector: React.FC<{
  versions: SOPVersionData[];
  selectedFrom: string;
  selectedTo: string;
  onFromChange: (versionId: string) => void;
  onToChange: (versionId: string) => void;
}> = ({ versions, selectedFrom, selectedTo, onFromChange, onToChange }) => {
  const t = useTranslations('sop.versionComparison');
  
  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const getVersionBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-tablet-base">
            <ArrowLeft className="w-5 h-5 text-red-600" />
            {t('fromVersion')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedFrom} onValueChange={onFromChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectFromVersion')} />
            </SelectTrigger>
            <SelectContent>
              {sortedVersions
                .filter(v => v.id !== selectedTo)
                .map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="font-medium">v{version.version}</span>
                      <span className="text-tablet-xs text-muted-foreground ml-2">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge className={cn("text-tablet-xs", getVersionBadgeColor(version.status))}>
                      {version.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedFrom && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              {(() => {
                const version = versions.find(v => v.id === selectedFrom);
                return version ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{version.version}</span>
                      <Badge className={getVersionBadgeColor(version.status)}>
                        {version.status}
                      </Badge>
                    </div>
                    <p className="text-tablet-sm text-muted-foreground">
                      {version.changesSummary}
                    </p>
                    <div className="flex items-center gap-4 text-tablet-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {version.createdByName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-tablet-base">
            <ArrowRight className="w-5 h-5 text-green-600" />
            {t('toVersion')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTo} onValueChange={onToChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectToVersion')} />
            </SelectTrigger>
            <SelectContent>
              {sortedVersions
                .filter(v => v.id !== selectedFrom)
                .map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="font-medium">v{version.version}</span>
                      <span className="text-tablet-xs text-muted-foreground ml-2">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge className={cn("text-tablet-xs", getVersionBadgeColor(version.status))}>
                      {version.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedTo && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              {(() => {
                const version = versions.find(v => v.id === selectedTo);
                return version ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{version.version}</span>
                      <Badge className={getVersionBadgeColor(version.status)}>
                        {version.status}
                      </Badge>
                    </div>
                    <p className="text-tablet-sm text-muted-foreground">
                      {version.changesSummary}
                    </p>
                    <div className="flex items-center gap-4 text-tablet-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {version.createdByName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * ComparisonSummary - Summary of changes between versions
 */
const ComparisonSummary: React.FC<{
  comparison: VersionComparison;
  locale: 'en' | 'fr';
}> = ({ comparison, locale }) => {
  const t = useTranslations('sop.versionComparison');
  
  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'major': return 'text-orange-600 bg-orange-100';
      case 'minor': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'added': return <Plus className="w-4 h-4 text-green-600" />;
      case 'removed': return <Minus className="w-4 h-4 text-red-600" />;
      case 'modified': return <Edit3 className="w-4 h-4 text-orange-600" />;
      default: return <RefreshCw className="w-4 h-4 text-gray-600" />;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-krong-black">
              {comparison.summary.totalChanges}
            </p>
            <p className="text-tablet-sm text-muted-foreground">
              {t('totalChanges')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              +{comparison.summary.addedLines}
            </p>
            <p className="text-tablet-sm text-muted-foreground">
              {t('addedLines')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              -{comparison.summary.removedLines}
            </p>
            <p className="text-tablet-sm text-muted-foreground">
              {t('removedLines')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {comparison.summary.modifiedLines}
            </p>
            <p className="text-tablet-sm text-muted-foreground">
              {t('modifiedLines')}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Changes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('changesList')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparison.changes
              .filter(change => change.significance === 'critical' || change.significance === 'major')
              .slice(0, 10)
              .map((change, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                {getChangeIcon(change.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-tablet-sm">
                      {t(`fields.${change.field}`, { defaultValue: change.field })}
                    </span>
                    <Badge className={cn("text-tablet-xs", getSignificanceColor(change.significance))}>
                      {t(`significance.${change.significance}`)}
                    </Badge>
                  </div>
                  
                  {change.type === 'modified' && (
                    <div className="space-y-1">
                      <div className="text-tablet-xs text-red-600 bg-red-50 p-2 rounded">
                        <span className="font-medium">{t('before')}: </span>
                        <span className="font-mono">{change.oldValue?.substring(0, 100)}...</span>
                      </div>
                      <div className="text-tablet-xs text-green-600 bg-green-50 p-2 rounded">
                        <span className="font-medium">{t('after')}: </span>
                        <span className="font-mono">{change.newValue?.substring(0, 100)}...</span>
                      </div>
                    </div>
                  )}
                  
                  {change.type === 'added' && (
                    <div className="text-tablet-xs text-green-600 bg-green-50 p-2 rounded">
                      <span className="font-medium">{t('added')}: </span>
                      <span className="font-mono">{change.newValue?.substring(0, 100)}...</span>
                    </div>
                  )}
                  
                  {change.type === 'removed' && (
                    <div className="text-tablet-xs text-red-600 bg-red-50 p-2 rounded">
                      <span className="font-medium">{t('removed')}: </span>
                      <span className="font-mono">{change.oldValue?.substring(0, 100)}...</span>
                    </div>
                  )}
                  
                  {change.lineNumber && (
                    <p className="text-tablet-xs text-muted-foreground mt-1">
                      {t('lineNumber')}: {change.lineNumber}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {comparison.changes.length > 10 && (
              <div className="text-center">
                <Button variant="outline" size="sm">
                  {t('viewAllChanges', { count: comparison.changes.length - 10 })}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * SOPVersionComparison - Side-by-side version comparison tool
 * 
 * Features:
 * - Visual side-by-side version comparison
 * - Intelligent diff highlighting (added, removed, modified)
 * - Change significance analysis (minor, major, critical)
 * - Bilingual content comparison (EN/FR)
 * - Version timeline and history
 * - Export comparison reports (PDF, HTML, JSON)
 * - Version restoration capabilities
 * - Metadata comparison (tags, difficulty, timing)
 * - Search and filter changes
 * - Change summary statistics
 * - Responsive tablet-optimized interface
 * 
 * @param props SOPVersionComparisonProps
 * @returns JSX.Element
 */
const SOPVersionComparison: React.FC<SOPVersionComparisonProps> = ({
  sopId,
  versions,
  selectedVersions,
  locale,
  onVersionChange,
  onGenerateComparison,
  onExportComparison,
  onRestoreVersion,
  className
}) => {
  const t = useTranslations('sop.versionComparison');
  const [fromVersion, setFromVersion] = useState(selectedVersions?.from || '');
  const [toVersion, setToVersion] = useState(selectedVersions?.to || '');
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  const canCompare = fromVersion && toVersion && fromVersion !== toVersion;

  const handleGenerateComparison = useCallback(async () => {
    if (!canCompare) return;
    
    setIsLoading(true);
    try {
      const result = await onGenerateComparison(fromVersion, toVersion);
      setComparison(result);
      onVersionChange(fromVersion, toVersion);
    } catch (error) {
      console.error('Failed to generate comparison:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fromVersion, toVersion, canCompare, onGenerateComparison, onVersionChange]);

  const handleExport = useCallback((format: 'pdf' | 'html' | 'json') => {
    onExportComparison?.(format);
  }, [onExportComparison]);

  const getVersionData = useCallback((versionId: string) => {
    return versions.find(v => v.id === versionId);
  }, [versions]);

  const fromVersionData = fromVersion ? getVersionData(fromVersion) : null;
  const toVersionData = toVersion ? getVersionData(toVersion) : null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-tablet-xl font-heading font-bold text-krong-black flex items-center gap-2">
            <GitBranch className="w-6 h-6" />
            {t('title')}
          </h2>
          <p className="text-tablet-base font-body text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        
        {comparison && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('html')}
            >
              <Download className="w-4 h-4 mr-2" />
              HTML
            </Button>
          </div>
        )}
      </div>

      {/* Version Selection */}
      <VersionSelector
        versions={versions}
        selectedFrom={fromVersion}
        selectedTo={toVersion}
        onFromChange={setFromVersion}
        onToChange={setToVersion}
      />

      {/* Generate Comparison Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateComparison}
          disabled={!canCompare || isLoading}
          size="lg"
          className="px-8"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <GitBranch className="w-4 h-4 mr-2" />
              {t('compareVersions')}
            </>
          )}
        </Button>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="summary">{t('tabs.summary')}</TabsTrigger>
              <TabsTrigger value="content">{t('tabs.content')}</TabsTrigger>
              <TabsTrigger value="metadata">{t('tabs.metadata')}</TabsTrigger>
              <TabsTrigger value="timeline">{t('tabs.timeline')}</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">{t('viewMode.split')}</SelectItem>
                  <SelectItem value="unified">{t('viewMode.unified')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <ComparisonSummary comparison={comparison} locale={locale} />
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {fromVersionData && toVersionData && (
              <>
                <DiffViewer
                  oldText={locale === 'fr' ? fromVersionData.titleFr : fromVersionData.title}
                  newText={locale === 'fr' ? toVersionData.titleFr : toVersionData.title}
                  title={t('fields.title')}
                  language={locale}
                />
                
                <DiffViewer
                  oldText={locale === 'fr' ? fromVersionData.contentFr : fromVersionData.content}
                  newText={locale === 'fr' ? toVersionData.contentFr : toVersionData.content}
                  title={t('fields.content')}
                  language={locale}
                />
              </>
            )}
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata">
            {fromVersionData && toVersionData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      {t('fromVersion')} (v{fromVersionData.version})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-tablet-sm font-medium text-muted-foreground">
                        {t('fields.status')}
                      </p>
                      <Badge className="mt-1">{fromVersionData.status}</Badge>
                    </div>
                    
                    <div>
                      <p className="text-tablet-sm font-medium text-muted-foreground">
                        {t('fields.difficulty')}
                      </p>
                      <p className="text-tablet-base">{fromVersionData.difficultyLevel}</p>
                    </div>
                    
                    <div>
                      <p className="text-tablet-sm font-medium text-muted-foreground">
                        {t('fields.readTime')}
                      </p>
                      <p className="text-tablet-base">{fromVersionData.estimatedReadTime} min</p>
                    </div>
                    
                    <div>
                      <p className="text-tablet-sm font-medium text-muted-foreground">
                        {t('fields.tags')}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {fromVersionData.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-tablet-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">
                      {t('toVersion')} (v{toVersionData.version})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-tablet-sm font-medium text-muted-foreground">
                        {t('fields.status')}
                      </p>
                      <Badge className="mt-1">{toVersionData.status}</Badge>
                    </div>
                    
                    <div>
                      <p className="text-tablet-sm font-medium text-muted-foreground">
                        {t('fields.difficulty')}
                      </p>
                      <p className="text-tablet-base">{toVersionData.difficultyLevel}</p>
                    </div>
                    
                    <div>
                      <p className="text-tablet-sm font-medium text-muted-foreground">
                        {t('fields.readTime')}
                      </p>
                      <p className="text-tablet-base">{toVersionData.estimatedReadTime} min</p>
                    </div>
                    
                    <div>
                      <p className="text-tablet-sm font-medium text-muted-foreground">
                        {t('fields.tags')}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {toVersionData.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-tablet-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>{t('versionTimeline')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {versions
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((version, index) => (
                    <div key={version.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className={cn(
                        "w-3 h-3 rounded-full mt-2 flex-shrink-0",
                        version.id === fromVersion && "bg-red-500",
                        version.id === toVersion && "bg-green-500",
                        version.id !== fromVersion && version.id !== toVersion && "bg-gray-300"
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-heading font-semibold">
                            v{version.version}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge className="text-tablet-xs">
                              {version.status}
                            </Badge>
                            {onRestoreVersion && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRestoreVersion(version.id)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                {t('restore')}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-tablet-sm text-muted-foreground mb-2">
                          {version.changesSummary}
                        </p>
                        
                        <div className="flex items-center gap-4 text-tablet-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.createdByName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(version.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* No Versions Message */}
      {versions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-tablet-base text-muted-foreground">
              {t('noVersions')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SOPVersionComparison;