'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  Clock, 
  Star, 
  Share2, 
  Download, 
  AlertTriangle,
  Camera,
  FileText,
  Users,
  Timer,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  HelpCircle,
  Flag,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  SOPDocumentViewer, 
  SOPStepChecklist, 
  PhotoCaptureModal, 
  CompletionConfirmationDialog,
  SOPBreadcrumb,
  EquipmentChecklist,
  SafetyWarningsAlerts,
  TimeEstimationDisplay
} from '@/components/sop';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';

interface SOPDocumentPageProps {
  params: Promise<{ locale: string; id: string }>;
}

interface SOPStep {
  id: string;
  step_number: number;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  estimated_time: number;
  is_critical: boolean;
  requires_photo: boolean;
  requires_verification: boolean;
  equipment_needed: string[];
  safety_notes: string[];
  tips: string[];
}

interface SOPDocument {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number;
  version: string;
  category: string;
  category_fr: string;
  equipment: string[];
  safety_warnings: string[];
  steps: SOPStep[];
  created_at: string;
  updated_at: string;
  author: string;
  completion_count: number;
  is_required: boolean;
}

// Mock SOP data
const MOCK_SOP: SOPDocument = {
  id: '1',
  title: 'Hand Washing Procedure',
  title_fr: 'Procédure de Lavage des Mains',
  description: 'Proper hand washing technique for food service staff to ensure hygiene standards',
  description_fr: 'Technique appropriée de lavage des mains pour le personnel de service alimentaire pour assurer les normes d\'hygiène',
  difficulty: 'easy',
  estimated_time: 5,
  version: '2.1',
  category: 'Food Safety',
  category_fr: 'Sécurité Alimentaire',
  equipment: ['Soap dispenser', 'Paper towels', 'Warm water'],
  safety_warnings: ['Use only approved hand soap', 'Ensure water temperature is appropriate'],
  completion_count: 45,
  is_required: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-20T00:00:00Z',
  author: 'Health Department',
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
      requires_photo: false,
      requires_verification: true,
      equipment_needed: [],
      safety_notes: ['Ensure no jewelry remains on hands or wrists'],
      tips: ['Store jewelry in designated area']
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
      requires_photo: false,
      requires_verification: false,
      equipment_needed: ['Water faucet'],
      safety_notes: ['Water should be warm, not hot'],
      tips: ['Test temperature with wrist before washing hands']
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
      requires_photo: false,
      requires_verification: false,
      equipment_needed: [],
      safety_notes: [],
      tips: ['Ensure all surfaces of hands are wet']
    },
    {
      id: 'step-4',
      step_number: 4,
      title: 'Apply soap and lather',
      title_fr: 'Appliquer le savon et faire mousser',
      description: 'Apply adequate amount of soap and work into a lather covering all hand surfaces.',
      description_fr: 'Appliquer une quantité adéquate de savon et faire mousser sur toutes les surfaces des mains.',
      estimated_time: 1,
      is_critical: true,
      requires_photo: true,
      requires_verification: true,
      equipment_needed: ['Hand soap'],
      safety_notes: ['Use only approved hand soap'],
      tips: ['Use enough soap to cover all hand surfaces']
    },
    {
      id: 'step-5',
      step_number: 5,
      title: 'Scrub for 20 seconds',
      title_fr: 'Frotter pendant 20 secondes',
      description: 'Scrub hands vigorously for at least 20 seconds, including backs of hands, between fingers, and under nails.',
      description_fr: 'Frotter les mains vigoureusement pendant au moins 20 secondes, y compris le dos des mains, entre les doigts et sous les ongles.',
      estimated_time: 2,
      is_critical: true,
      requires_photo: false,
      requires_verification: true,
      equipment_needed: [],
      safety_notes: ['Maintain scrubbing for full 20 seconds'],
      tips: ['Sing "Happy Birthday" twice to time 20 seconds']
    },
    {
      id: 'step-6',
      step_number: 6,
      title: 'Rinse thoroughly',
      title_fr: 'Rincer complètement',
      description: 'Rinse hands thoroughly with warm water, ensuring all soap is removed.',
      description_fr: 'Rincer les mains complètement avec de l\'eau tiède, en s\'assurant que tout le savon est enlevé.',
      estimated_time: 0.5,
      is_critical: true,
      requires_photo: false,
      requires_verification: false,
      equipment_needed: [],
      safety_notes: ['Ensure no soap residue remains'],
      tips: ['Rinse from wrists to fingertips']
    },
    {
      id: 'step-7',
      step_number: 7,
      title: 'Dry with paper towel',
      title_fr: 'Sécher avec une serviette en papier',
      description: 'Dry hands completely with a clean paper towel, then use towel to turn off faucet.',
      description_fr: 'Sécher les mains complètement avec une serviette en papier propre, puis utiliser la serviette pour fermer le robinet.',
      estimated_time: 0.5,
      is_critical: true,
      requires_photo: true,
      requires_verification: true,
      equipment_needed: ['Paper towels'],
      safety_notes: ['Use towel to avoid recontaminating hands'],
      tips: ['Dispose of towel in waste bin immediately']
    }
  ]
};

export default function SOPDocumentPage({ params }: SOPDocumentPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string; id: string } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showPhotoCaptureModal, setShowPhotoCaptureModal] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('execution');

  const router = useRouter();
  const t = useTranslations('sop');
  const { favorites, toggleFavorite } = useFavorites();

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExecuting && !isPaused && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Date.now() - sessionStartTime.getTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isExecuting, isPaused, sessionStartTime]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale, id } = resolvedParams;
  const sop = MOCK_SOP; // In real app, fetch by ID
  const currentStepData = sop.steps[currentStep];
  const progress = (completedSteps.size / sop.steps.length) * 100;
  const isFavorite = favorites.some(fav => fav.id === sop.id && fav.type === 'sop');

  const handleStartExecution = () => {
    setIsExecuting(true);
    setSessionStartTime(new Date());
    setCurrentStep(0);
    setCompletedSteps(new Set());
    toast({
      title: t('execution.started'),
      description: sop.title,
    });
  };

  const handlePauseExecution = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? t('execution.resumed') : t('execution.paused'),
    });
  };

  const handleStopExecution = () => {
    setIsExecuting(false);
    setIsPaused(false);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setSessionStartTime(null);
    setSessionDuration(0);
    toast({
      title: t('execution.stopped'),
    });
  };

  const handleStepComplete = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);

    // Auto-advance to next step
    if (currentStep < sop.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps completed
      setShowCompletionDialog(true);
    }

    toast({
      title: t('step.completed'),
      description: `${t('step.title')} ${currentStepData.step_number}`,
    });
  };

  const handleToggleFavorite = () => {
    toggleFavorite({
      id: sop.id,
      type: 'sop',
      title: locale === 'fr' ? sop.title_fr : sop.title,
      category: locale === 'fr' ? sop.category_fr : sop.category,
      lastAccessed: new Date().toISOString()
    });
    
    toast({
      title: isFavorite ? t('favorites.removed') : t('favorites.added'),
      description: locale === 'fr' ? sop.title_fr : sop.title,
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const breadcrumbItems = [
    { label: t('navigation.home'), href: `/${locale}/sop` },
    { label: locale === 'fr' ? sop.category_fr : sop.category, href: `/${locale}/sop/categories/1` },
    { label: locale === 'fr' ? sop.title_fr : sop.title, href: `/${locale}/sop/documents/${id}` }
  ];

  return (
    <div className={cn(
      "min-h-screen bg-gray-50",
      isFullscreen && "fixed inset-0 z-50 bg-white"
    )}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb */}
          {!isFullscreen && (
            <SOPBreadcrumb items={breadcrumbItems} className="mb-4" />
          )}
          
          {/* Document Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {locale === 'fr' ? sop.title_fr : sop.title}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <Badge className={getDifficultyColor(sop.difficulty)}>
                    {t(`difficulty.${sop.difficulty}`)}
                  </Badge>
                  <Badge variant="outline">v{sop.version}</Badge>
                  {sop.is_required && (
                    <Badge variant="destructive">{t('status.required')}</Badge>
                  )}
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    {sop.estimated_time} {t('time.minutes')}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Session Timer */}
              {isExecuting && showTimer && (
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-mono">
                  {formatDuration(sessionDuration)}
                </div>
              )}

              {/* Execution Controls */}
              {!isExecuting ? (
                <Button onClick={handleStartExecution} className="bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4 mr-2" />
                  {t('execution.start')}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePauseExecution}
                    className={isPaused ? "bg-green-100 text-green-700" : ""}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" onClick={handleStopExecution}>
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Utility Controls */}
              <div className="flex items-center gap-1 border-l pl-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTimer(!showTimer)}
                >
                  {showTimer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleFavorite}
                >
                  <Star className={cn("w-4 h-4", isFavorite && "fill-current text-yellow-500")} />
                </Button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isExecuting && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('progress.label')}: {completedSteps.size} / {sop.steps.length}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="execution">{t('tabs.execution')}</TabsTrigger>
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="equipment">{t('tabs.equipment')}</TabsTrigger>
            <TabsTrigger value="safety">{t('tabs.safety')}</TabsTrigger>
          </TabsList>

          {/* Execution Tab */}
          <TabsContent value="execution" className="space-y-6">
            {isExecuting ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Step */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                            {currentStepData.step_number}
                          </span>
                          {locale === 'fr' ? currentStepData.title_fr : currentStepData.title}
                          {currentStepData.is_critical && (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                        </CardTitle>
                        <TimeEstimationDisplay estimatedMinutes={currentStepData.estimated_time} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-700">
                        {locale === 'fr' ? currentStepData.description_fr : currentStepData.description}
                      </p>

                      {/* Equipment Needed */}
                      {currentStepData.equipment_needed.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">{t('step.equipment')}</h4>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {currentStepData.equipment_needed.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Safety Notes */}
                      {currentStepData.safety_notes.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {t('step.safetyNotes')}
                          </h4>
                          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                            {currentStepData.safety_notes.map((note, index) => (
                              <li key={index}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Tips */}
                      {currentStepData.tips.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h4 className="font-medium text-blue-800 mb-2">{t('step.tips')}</h4>
                          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                            {currentStepData.tips.map((tip, index) => (
                              <li key={index}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-4 border-t">
                        {currentStepData.requires_photo && (
                          <Button
                            variant="outline"
                            onClick={() => setShowPhotoCaptureModal(true)}
                            className="gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            {t('step.takePhoto')}
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleStepComplete(currentStepData.id)}
                          className="bg-green-600 hover:bg-green-700 gap-2 flex-1"
                          disabled={completedSteps.has(currentStepData.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {completedSteps.has(currentStepData.id) ? t('step.completed') : t('step.markComplete')}
                        </Button>
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="ghost"
                          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                          disabled={currentStep === 0}
                          className="gap-2"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          {t('navigation.previous')}
                        </Button>
                        
                        <span className="text-sm text-gray-500">
                          {currentStep + 1} / {sop.steps.length}
                        </span>
                        
                        <Button
                          variant="ghost"
                          onClick={() => setCurrentStep(Math.min(sop.steps.length - 1, currentStep + 1))}
                          disabled={currentStep === sop.steps.length - 1}
                          className="gap-2"
                        >
                          {t('navigation.next')}
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Step Checklist Sidebar */}
                <div>
                  <SOPStepChecklist
                    steps={sop.steps}
                    currentStep={currentStep}
                    completedSteps={completedSteps}
                    onStepClick={setCurrentStep}
                    locale={locale}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('execution.notStarted')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('execution.clickStart')}
                </p>
                <Button onClick={handleStartExecution} size="lg" className="bg-green-600 hover:bg-green-700">
                  <Play className="w-5 h-5 mr-2" />
                  {t('execution.start')}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <SOPDocumentViewer 
              document={sop} 
              locale={locale}
              mode="overview"
            />
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment">
            <EquipmentChecklist 
              equipment={sop.equipment}
              locale={locale}
            />
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent value="safety">
            <SafetyWarningsAlerts 
              warnings={sop.safety_warnings}
              locale={locale}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showPhotoCaptureModal && (
        <PhotoCaptureModal
          isOpen={showPhotoCaptureModal}
          onClose={() => setShowPhotoCaptureModal(false)}
          onCapture={(photo) => {
            // Handle photo capture
            setShowPhotoCaptureModal(false);
            toast({
              title: t('photo.captured'),
              description: t('photo.saved'),
            });
          }}
          stepTitle={locale === 'fr' ? currentStepData?.title_fr : currentStepData?.title}
        />
      )}

      {showCompletionDialog && (
        <CompletionConfirmationDialog
          isOpen={showCompletionDialog}
          onClose={() => setShowCompletionDialog(false)}
          onConfirm={() => {
            setShowCompletionDialog(false);
            setIsExecuting(false);
            toast({
              title: t('completion.success'),
              description: locale === 'fr' ? sop.title_fr : sop.title,
            });
            router.push(`/${locale}/sop`);
          }}
          sopTitle={locale === 'fr' ? sop.title_fr : sop.title}
          completionTime={formatDuration(sessionDuration)}
          locale={locale}
        />
      )}
    </div>
  );
}