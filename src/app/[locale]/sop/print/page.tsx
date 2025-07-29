'use client';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  Settings, 
  FileText,
  Eye,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Layout,
  Palette,
  Image,
  Type,
  QrCode,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SOPPrintPageProps {
  params: Promise<{ locale: string }>;
}

interface PrintSettings {
  format: 'A4' | 'Letter' | 'A3';
  orientation: 'portrait' | 'landscape';
  includeImages: boolean;
  includeQRCode: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  includeStepNumbers: boolean;
  includeTiming: boolean;
  includeNotes: boolean;
  fontSize: number;
  marginSize: 'small' | 'medium' | 'large';
  colorMode: 'color' | 'grayscale' | 'blackwhite';
}

interface SOPDocument {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  version: string;
  category: string;
  category_fr: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number;
  author: string;
  created_at: string;
  updated_at: string;
  steps: Array<{
    id: string;
    step_number: number;
    title: string;
    title_fr: string;
    description: string;
    description_fr: string;
    estimated_time: number;
    is_critical: boolean;
    equipment_needed: string[];
    safety_notes: string[];
  }>;
  equipment: string[];
  safety_warnings: string[];
}

// Mock SOP data
const MOCK_SOP: SOPDocument = {
  id: '1',
  title: 'Hand Washing Procedure',
  title_fr: 'Procédure de Lavage des Mains',
  description: 'Proper hand washing technique for food service staff to ensure hygiene standards',
  description_fr: 'Technique appropriée de lavage des mains pour le personnel de service alimentaire',
  version: '2.1',
  category: 'Food Safety',
  category_fr: 'Sécurité Alimentaire',
  difficulty: 'easy',
  estimated_time: 5,
  author: 'Health Department',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-20T00:00:00Z',
  equipment: ['Soap dispenser', 'Paper towels', 'Warm water'],
  safety_warnings: ['Use only approved hand soap', 'Ensure water temperature is appropriate'],
  steps: [
    {
      id: 'step-1',
      step_number: 1,
      title: 'Remove jewelry and roll up sleeves',
      title_fr: 'Retirer les bijoux et retrousser les manches',
      description: 'Remove all rings, watches, and bracelets. Roll up sleeves to prevent contamination.',
      description_fr: 'Retirer tous les bagues, montres et bracelets. Retrousser les manches pour éviter la contamination.',
      estimated_time: 0.5,
      is_critical: true,
      equipment_needed: [],
      safety_notes: ['Ensure no jewelry remains on hands or wrists']
    },
    {
      id: 'step-2',
      step_number: 2,
      title: 'Turn on water and adjust temperature',
      title_fr: 'Ouvrir l\'eau et ajuster la température',
      description: 'Turn on the faucet and adjust to warm water temperature (100-108°F / 38-42°C).',
      description_fr: 'Ouvrir le robinet et ajuster à une température d\'eau tiède (38-42°C).',
      estimated_time: 0.5,
      is_critical: false,
      equipment_needed: ['Water faucet'],
      safety_notes: ['Water should be warm, not hot']
    },
    {
      id: 'step-3',
      step_number: 3,
      title: 'Wet hands thoroughly',
      title_fr: 'Mouiller les mains complètement',
      description: 'Wet both hands thoroughly with warm water from fingertips to wrists.',
      description_fr: 'Mouiller les deux mains complètement avec de l\'eau tiède du bout des doigts aux poignets.',
      estimated_time: 0.5,
      is_critical: true,
      equipment_needed: [],
      safety_notes: []
    }
  ]
};

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  format: 'A4',
  orientation: 'portrait',
  includeImages: true,
  includeQRCode: true,
  includeHeader: true,
  includeFooter: true,
  includeStepNumbers: true,
  includeTiming: true,
  includeNotes: true,
  fontSize: 12,
  marginSize: 'medium',
  colorMode: 'color',
};

export default function SOPPrintPage({ params }: SOPPrintPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [zoom, setZoom] = useState(100);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [sop, setSop] = useState<SOPDocument>(MOCK_SOP);

  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('sop');

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Get SOP ID from query params
  useEffect(() => {
    const sopId = searchParams.get('sop');
    if (sopId) {
      // In a real app, fetch SOP data by ID
      console.log('Loading SOP:', sopId);
    }
  }, [searchParams]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const handlePrint = () => {
    window.print();
    toast({
      title: t('print.printing'),
      description: t('print.printingDescription'),
    });
  };

  const handleDownloadPDF = () => {
    // In a real app, generate and download PDF
    toast({
      title: t('print.downloadStarted'),
      description: t('print.downloadDescription'),
    });
  };

  const updatePrintSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    setPrintSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  const getMarginClass = (size: string) => {
    switch (size) {
      case 'small': return 'p-4';
      case 'large': return 'p-12';
      default: return 'p-8';
    }
  };

  const getFontSizeClass = (size: number) => {
    if (size <= 10) return 'text-xs';
    if (size <= 12) return 'text-sm';
    if (size <= 14) return 'text-base';
    return 'text-lg';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Hidden in print */}
      <div className="bg-white shadow-sm border-b print:hidden">
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
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Printer className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('print.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {locale === 'fr' ? sop.title_fr : sop.title}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="px-3 py-1 text-sm font-medium min-w-[60px] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="gap-2"
              >
                {isPreviewMode ? <Settings className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {isPreviewMode ? t('print.settings') : t('print.preview')}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {t('print.downloadPDF')}
              </Button>
              
              <Button
                onClick={handlePrint}
                className="bg-red-600 hover:bg-red-700 gap-2"
              >
                <Printer className="w-4 h-4" />
                {t('print.print')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:grid-cols-1">
          {/* Print Settings - Hidden in print */}
          {!isPreviewMode && (
            <div className="lg:col-span-1 print:hidden">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    {t('print.settings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Page Settings */}
                  <div>
                    <Label className="text-base font-medium mb-3 block">{t('print.pageSettings')}</Label>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">{t('print.format')}</Label>
                        <Select value={printSettings.format} onValueChange={(value: any) => updatePrintSetting('format', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A4">A4</SelectItem>
                            <SelectItem value="Letter">Letter</SelectItem>
                            <SelectItem value="A3">A3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm">{t('print.orientation')}</Label>
                        <Select value={printSettings.orientation} onValueChange={(value: any) => updatePrintSetting('orientation', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portrait">{t('print.portrait')}</SelectItem>
                            <SelectItem value="landscape">{t('print.landscape')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm">{t('print.margins')}</Label>
                        <Select value={printSettings.marginSize} onValueChange={(value: any) => updatePrintSetting('marginSize', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">{t('print.small')}</SelectItem>
                            <SelectItem value="medium">{t('print.medium')}</SelectItem>
                            <SelectItem value="large">{t('print.large')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Content Settings */}
                  <div>
                    <Label className="text-base font-medium mb-3 block">{t('print.contentSettings')}</Label>
                    <div className="space-y-3">
                      {[
                        { key: 'includeHeader', label: t('print.includeHeader') },
                        { key: 'includeFooter', label: t('print.includeFooter') },
                        { key: 'includeStepNumbers', label: t('print.includeStepNumbers') },
                        { key: 'includeTiming', label: t('print.includeTiming') },
                        { key: 'includeImages', label: t('print.includeImages') },
                        { key: 'includeQRCode', label: t('print.includeQRCode') },
                        { key: 'includeNotes', label: t('print.includeNotes') },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label className="text-sm">{label}</Label>
                          <Switch
                            checked={printSettings[key as keyof PrintSettings] as boolean}
                            onCheckedChange={(checked) => updatePrintSetting(key as keyof PrintSettings, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Formatting Settings */}
                  <div>
                    <Label className="text-base font-medium mb-3 block">{t('print.formatting')}</Label>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">{t('print.fontSize')}</Label>
                        <Select value={printSettings.fontSize.toString()} onValueChange={(value) => updatePrintSetting('fontSize', parseInt(value))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10pt</SelectItem>
                            <SelectItem value="12">12pt</SelectItem>
                            <SelectItem value="14">14pt</SelectItem>
                            <SelectItem value="16">16pt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm">{t('print.colorMode')}</Label>
                        <Select value={printSettings.colorMode} onValueChange={(value: any) => updatePrintSetting('colorMode', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="color">{t('print.color')}</SelectItem>
                            <SelectItem value="grayscale">{t('print.grayscale')}</SelectItem>
                            <SelectItem value="blackwhite">{t('print.blackwhite')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Print Preview */}
          <div className={cn(
            isPreviewMode ? "lg:col-span-4" : "lg:col-span-3",
            "print:col-span-1"
          )}>
            <Card className="print:shadow-none print:border-none">
              <CardContent className="p-0">
                <div 
                  className={cn(
                    "bg-white shadow-lg mx-auto",
                    printSettings.orientation === 'landscape' ? "max-w-4xl" : "max-w-2xl",
                    getMarginClass(printSettings.marginSize),
                    getFontSizeClass(printSettings.fontSize),
                    printSettings.colorMode === 'grayscale' && "grayscale",
                    printSettings.colorMode === 'blackwhite' && "contrast-200 grayscale"
                  )}
                  style={{ 
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    minHeight: printSettings.orientation === 'landscape' ? '29.7cm' : '21cm'
                  }}
                >
                  {/* Header */}
                  {printSettings.includeHeader && (
                    <div className="border-b pb-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            {locale === 'fr' ? sop.title_fr : sop.title}
                          </h1>
                          <p className="text-gray-600">
                            {locale === 'fr' ? sop.description_fr : sop.description}
                          </p>
                        </div>
                        {printSettings.includeQRCode && (
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mb-2">
                              <QrCode className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-xs text-gray-500">SOP-{sop.id}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(sop.difficulty)}>
                            {t(`difficulty.${sop.difficulty}`)}
                          </Badge>
                          <Badge variant="outline">v{sop.version}</Badge>
                        </div>
                        {printSettings.includeTiming && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            {sop.estimated_time} {t('time.minutes')}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          {locale === 'fr' ? sop.category_fr : sop.category}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Equipment Section */}
                  {sop.equipment.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">
                        {t('sop.equipment')}
                      </h2>
                      <ul className="list-disc list-inside space-y-1">
                        {sop.equipment.map((item, index) => (
                          <li key={index} className="text-gray-700">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Safety Warnings */}
                  {sop.safety_warnings.length > 0 && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h2 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {t('sop.safetyWarnings')}
                      </h2>
                      <ul className="list-disc list-inside space-y-1">
                        {sop.safety_warnings.map((warning, index) => (
                          <li key={index} className="text-yellow-700">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Steps */}
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {t('sop.steps')}
                    </h2>
                    
                    {sop.steps.map((step, index) => (
                      <div key={step.id} className="border rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          {printSettings.includeStepNumbers && (
                            <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {step.step_number}
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {locale === 'fr' ? step.title_fr : step.title}
                                {step.is_critical && (
                                  <Badge className="ml-2 bg-red-100 text-red-700">
                                    {t('step.critical')}
                                  </Badge>
                                )}
                              </h3>
                              {printSettings.includeTiming && (
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {step.estimated_time} {t('time.minutes')}
                                </div>
                              )}
                            </div>
                            
                            <p className="text-gray-700 mb-3">
                              {locale === 'fr' ? step.description_fr : step.description}
                            </p>
                            
                            {step.equipment_needed.length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-sm font-medium text-gray-900 mb-1">
                                  {t('step.equipment')}:
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {step.equipment_needed.join(', ')}
                                </p>
                              </div>
                            )}
                            
                            {step.safety_notes.length > 0 && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <h4 className="text-sm font-medium text-yellow-800 mb-1">
                                  {t('step.safetyNotes')}:
                                </h4>
                                <ul className="text-sm text-yellow-700 list-disc list-inside">
                                  {step.safety_notes.map((note, noteIndex) => (
                                    <li key={noteIndex}>{note}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  {printSettings.includeFooter && (
                    <div className="border-t pt-4 mt-8 text-sm text-gray-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4" />
                            {t('print.author')}: {sop.author}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {t('print.updated')}: {new Date(sop.updated_at).toLocaleDateString(locale)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Building className="w-4 h-4" />
                            Krong Thai Restaurant
                          </div>
                          <div>
                            {t('print.printedOn')}: {new Date().toLocaleDateString(locale)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}