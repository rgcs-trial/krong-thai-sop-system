/**
 * Training Content Manager Component
 * Administrative interface for creating and managing training modules
 * Optimized for tablet experience with touch-friendly interactions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  BookOpen,
  FileText,
  Video,
  Image as ImageIcon,
  Upload,
  Clock,
  Users,
  Target,
  AlertCircle,
  CheckCircle2,
  Settings,
  Copy,
  Eye,
  MoreVertical,
  Search,
  Filter
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

import { useTraining } from '@/lib/stores/training-store';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

import type { TrainingModule, TrainingSection, TrainingQuestion, SOPDocument } from '@/types/database';

interface TrainingContentManagerProps {
  className?: string;
}

interface ModuleFormData {
  sop_document_id: string;
  title: string;
  title_th: string;
  description: string;
  description_th: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  validity_days: number;
  is_mandatory: boolean;
  sections: SectionFormData[];
  questions: QuestionFormData[];
}

interface SectionFormData {
  title: string;
  title_th: string;
  content: string;
  content_th: string;
  media_urls: string[];
  estimated_minutes: number;
  is_required: boolean;
}

interface QuestionFormData {
  section_id?: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  question_th: string;
  options?: string[];
  options_th?: string[];
  correct_answer: string;
  explanation?: string;
  explanation_th?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

const initialModuleForm: ModuleFormData = {
  sop_document_id: '',
  title: '',
  title_th: '',
  description: '',
  description_th: '',
  duration_minutes: 30,
  passing_score: 80,
  max_attempts: 3,
  validity_days: 365,
  is_mandatory: false,
  sections: [],
  questions: []
};

const initialSectionForm: SectionFormData = {
  title: '',
  title_th: '',
  content: '',
  content_th: '',
  media_urls: [],
  estimated_minutes: 5,
  is_required: true
};

const initialQuestionForm: QuestionFormData = {
  question_type: 'multiple_choice',
  question: '',
  question_th: '',
  options: ['', '', '', ''],
  options_th: ['', '', '', ''],
  correct_answer: '0',
  explanation: '',
  explanation_th: '',
  points: 1,
  difficulty: 'medium'
};

export function TrainingContentManager({ className }: TrainingContentManagerProps) {
  const { t, locale } = useI18n();
  
  // Training store hooks
  const {
    modules,
    loadModules,
    isLoading,
    error,
  } = useTraining();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filteredModules, setFilteredModules] = useState<TrainingModule[]>([]);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleFormData>(initialModuleForm);
  const [currentTab, setCurrentTab] = useState('overview');
  const [sectionForm, setSectionForm] = useState<SectionFormData>(initialSectionForm);
  const [questionForm, setQuestionForm] = useState<QuestionFormData>(initialQuestionForm);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [availableSOPs, setAvailableSOPs] = useState<SOPDocument[]>([]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadModules();
        // Load available SOPs for selection
        // This would come from your SOP store or API
      } catch (error) {
        console.error('Error loading training data:', error);
        toast({
          title: t('error.training_load_failed'),
          description: t('error.training_load_failed_desc'),
          variant: 'destructive',
        });
      }
    };

    loadData();
  }, [loadModules, t]);

  // Apply filters
  useEffect(() => {
    let filtered = modules || [];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(module => {
        const title = locale === 'th' ? module.title_th : module.title;
        const description = locale === 'th' ? module.description_th : module.description;
        
        return (
          title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(module => module.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(module => !module.is_active);
    } else if (statusFilter === 'mandatory') {
      filtered = filtered.filter(module => module.is_mandatory);
    }

    setFilteredModules(filtered);
  }, [modules, searchTerm, statusFilter, locale]);

  // Handle module creation/editing
  const handleModuleSubmit = async () => {
    try {
      // Validate form
      if (!moduleForm.title || !moduleForm.title_th || !moduleForm.sop_document_id) {
        toast({
          title: t('error.required_fields_missing'),
          description: t('error.required_fields_missing_desc'),
          variant: 'destructive',
        });
        return;
      }

      // Submit to API
      const method = editingModule ? 'PUT' : 'POST';
      const url = editingModule 
        ? `/api/training/modules/${editingModule.id}`
        : '/api/training/modules';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moduleForm),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: editingModule ? t('training.module_updated') : t('training.module_created'),
          description: editingModule 
            ? t('training.module_updated_desc') 
            : t('training.module_created_desc'),
        });

        // Reset form and close dialog
        setModuleForm(initialModuleForm);
        setEditingModule(null);
        setShowModuleDialog(false);
        
        // Reload modules
        await loadModules();
      } else {
        throw new Error(result.error || 'Failed to save module');
      }
    } catch (error) {
      console.error('Module save error:', error);
      toast({
        title: t('error.module_save_failed'),
        description: t('error.module_save_failed_desc'),
        variant: 'destructive',
      });
    }
  };

  // Handle section management
  const handleAddSection = () => {
    if (!sectionForm.title || !sectionForm.title_th) {
      toast({
        title: t('error.required_fields_missing'),
        description: t('error.section_title_required'),
        variant: 'destructive',
      });
      return;
    }

    const newSections = [...moduleForm.sections];
    
    if (editingSectionIndex !== null) {
      newSections[editingSectionIndex] = sectionForm;
    } else {
      newSections.push(sectionForm);
    }

    setModuleForm({ ...moduleForm, sections: newSections });
    setSectionForm(initialSectionForm);
    setEditingSectionIndex(null);
    setShowSectionDialog(false);

    toast({
      title: t('training.section_saved'),
      description: t('training.section_saved_desc'),
    });
  };

  // Handle question management
  const handleAddQuestion = () => {
    if (!questionForm.question || !questionForm.question_th) {
      toast({
        title: t('error.required_fields_missing'),
        description: t('error.question_text_required'),
        variant: 'destructive',
      });
      return;
    }

    const newQuestions = [...moduleForm.questions];
    
    if (editingQuestionIndex !== null) {
      newQuestions[editingQuestionIndex] = questionForm;
    } else {
      newQuestions.push(questionForm);
    }

    setModuleForm({ ...moduleForm, questions: newQuestions });
    setQuestionForm(initialQuestionForm);
    setEditingQuestionIndex(null);
    setShowQuestionDialog(false);

    toast({
      title: t('training.question_saved'),
      description: t('training.question_saved_desc'),
    });
  };

  // Handle module deletion
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm(t('training.confirm_delete_module'))) return;

    try {
      const response = await fetch(`/api/training/modules/${moduleId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: t('training.module_deleted'),
          description: t('training.module_deleted_desc'),
        });
        
        await loadModules();
      } else {
        throw new Error(result.error || 'Failed to delete module');
      }
    } catch (error) {
      console.error('Module deletion error:', error);
      toast({
        title: t('error.module_delete_failed'),
        description: t('error.module_delete_failed_desc'),
        variant: 'destructive',
      });
    }
  };

  // Open edit module dialog
  const handleEditModule = (module: TrainingModule) => {
    setEditingModule(module);
    setModuleForm({
      sop_document_id: module.sop_document_id,
      title: module.title,
      title_th: module.title_th,
      description: module.description || '',
      description_th: module.description_th || '',
      duration_minutes: module.duration_minutes,
      passing_score: module.passing_score,
      max_attempts: module.max_attempts,
      validity_days: module.validity_days,
      is_mandatory: module.is_mandatory,
      sections: module.sections?.map(section => ({
        title: section.title,
        title_th: section.title_th,
        content: section.content,
        content_th: section.content_th,
        media_urls: section.media_urls || [],
        estimated_minutes: section.estimated_minutes,
        is_required: section.is_required
      })) || [],
      questions: module.questions?.map(question => ({
        section_id: question.section_id || undefined,
        question_type: question.question_type as 'multiple_choice' | 'true_false' | 'short_answer',
        question: question.question,
        question_th: question.question_th,
        options: question.options || undefined,
        options_th: question.options_th || undefined,
        correct_answer: question.correct_answer,
        explanation: question.explanation || undefined,
        explanation_th: question.explanation_th || undefined,
        points: question.points,
        difficulty: question.difficulty as 'easy' | 'medium' | 'hard'
      })) || []
    });
    setShowModuleDialog(true);
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin mb-4">
            <Settings className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold">{t('training.loading_content')}</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t('training.content_manager')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('training.content_manager_desc')}
          </p>
        </div>
        
        <Button onClick={() => {
          setEditingModule(null);
          setModuleForm(initialModuleForm);
          setShowModuleDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('training.create_module')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium">{t('common.search')}:</span>
            </div>
            
            <Input
              placeholder={t('training.search_modules')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 max-w-sm"
            />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('training.all_modules')}</SelectItem>
                <SelectItem value="active">{t('training.active')}</SelectItem>
                <SelectItem value="inactive">{t('training.inactive')}</SelectItem>
                <SelectItem value="mandatory">{t('training.mandatory')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      {filteredModules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => {
            const moduleTitle = locale === 'th' ? module.title_th : module.title;
            const moduleDescription = locale === 'th' ? module.description_th : module.description;

            return (
              <Card key={module.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-2">{moduleTitle}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {moduleDescription}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditModule(module)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          {t('training.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('training.preview')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteModule(module.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={module.is_active ? 'default' : 'secondary'}>
                      {module.is_active ? t('training.active') : t('training.inactive')}
                    </Badge>
                    {module.is_mandatory && (
                      <Badge variant="destructive">{t('training.mandatory')}</Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{module.duration_minutes}m</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span>{module.passing_score}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      <span>{module.sections?.length || 0} {t('training.sections')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span>{module.questions?.length || 0} {t('training.questions')}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditModule(module)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {t('common.edit')}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {t('training.preview')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('training.no_modules')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('training.no_modules_desc')}
            </p>
            <Button onClick={() => {
              setEditingModule(null);
              setModuleForm(initialModuleForm);
              setShowModuleDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('training.create_first_module')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Module Editor Dialog */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModule ? t('training.edit_module') : t('training.create_module')}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">{t('training.overview')}</TabsTrigger>
              <TabsTrigger value="sections">{t('training.sections')}</TabsTrigger>
              <TabsTrigger value="questions">{t('training.questions')}</TabsTrigger>
              <TabsTrigger value="settings">{t('training.settings')}</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">{t('training.title_en')} *</Label>
                  <Input
                    id="title"
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                    placeholder={t('training.enter_title_en')}
                  />
                </div>
                
                <div>
                  <Label htmlFor="title_th">{t('training.title_th')} *</Label>
                  <Input
                    id="title_th"
                    value={moduleForm.title_th}
                    onChange={(e) => setModuleForm({ ...moduleForm, title_th: e.target.value })}
                    placeholder={t('training.enter_title_th')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">{t('training.description_en')}</Label>
                  <Textarea
                    id="description"
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    placeholder={t('training.enter_description_en')}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description_th">{t('training.description_th')}</Label>
                  <Textarea
                    id="description_th"
                    value={moduleForm.description_th}
                    onChange={(e) => setModuleForm({ ...moduleForm, description_th: e.target.value })}
                    placeholder={t('training.enter_description_th')}
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sop_document">{t('training.sop_document')} *</Label>
                <Select
                  value={moduleForm.sop_document_id}
                  onValueChange={(value) => setModuleForm({ ...moduleForm, sop_document_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('training.select_sop_document')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSOPs.map((sop) => (
                      <SelectItem key={sop.id} value={sop.id}>
                        {locale === 'th' ? sop.title_th : sop.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Sections Tab */}
            <TabsContent value="sections" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('training.training_sections')}</h3>
                <Button onClick={() => {
                  setSectionForm(initialSectionForm);
                  setEditingSectionIndex(null);
                  setShowSectionDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('training.add_section')}
                </Button>
              </div>

              <div className="space-y-3">
                {moduleForm.sections.map((section, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{section.title}</h4>
                          <p className="text-sm text-muted-foreground">{section.title_th}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            <span>{section.estimated_minutes}m</span>
                            <span>{section.is_required ? t('training.required') : t('training.optional')}</span>
                            <span>{section.media_urls.length} {t('training.media_files')}</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSectionForm(section);
                              setEditingSectionIndex(index);
                              setShowSectionDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newSections = moduleForm.sections.filter((_, i) => i !== index);
                              setModuleForm({ ...moduleForm, sections: newSections });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {moduleForm.sections.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-2" />
                    <p>{t('training.no_sections_added')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('training.assessment_questions')}</h3>
                <Button onClick={() => {
                  setQuestionForm(initialQuestionForm);
                  setEditingQuestionIndex(null);
                  setShowQuestionDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('training.add_question')}
                </Button>
              </div>

              <div className="space-y-3">
                {moduleForm.questions.map((question, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium line-clamp-2">{question.question}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{question.question_th}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs">
                              {t(`training.question_type_${question.question_type}`)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {t(`training.difficulty_${question.difficulty}`)}
                            </Badge>
                            <span>{question.points} {t('training.points')}</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setQuestionForm(question);
                              setEditingQuestionIndex(index);
                              setShowQuestionDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newQuestions = moduleForm.questions.filter((_, i) => i !== index);
                              setModuleForm({ ...moduleForm, questions: newQuestions });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {moduleForm.questions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2" />
                    <p>{t('training.no_questions_added')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">{t('training.duration_minutes')}</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={moduleForm.duration_minutes}
                    onChange={(e) => setModuleForm({ ...moduleForm, duration_minutes: parseInt(e.target.value) || 30 })}
                    min="1"
                    max="480"
                  />
                </div>
                
                <div>
                  <Label htmlFor="passing_score">{t('training.passing_score')}</Label>
                  <Input
                    id="passing_score"
                    type="number"
                    value={moduleForm.passing_score}
                    onChange={(e) => setModuleForm({ ...moduleForm, passing_score: parseInt(e.target.value) || 80 })}
                    min="1"
                    max="100"
                  />
                </div>
                
                <div>
                  <Label htmlFor="max_attempts">{t('training.max_attempts')}</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    value={moduleForm.max_attempts}
                    onChange={(e) => setModuleForm({ ...moduleForm, max_attempts: parseInt(e.target.value) || 3 })}
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="validity_days">{t('training.certificate_validity_days')}</Label>
                <Input
                  id="validity_days"
                  type="number"
                  value={moduleForm.validity_days}
                  onChange={(e) => setModuleForm({ ...moduleForm, validity_days: parseInt(e.target.value) || 365 })}
                  min="1"
                  max="3650"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={moduleForm.is_mandatory}
                  onChange={(e) => setModuleForm({ ...moduleForm, is_mandatory: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="is_mandatory">{t('training.mandatory_training')}</Label>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowModuleDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleModuleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {editingModule ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section Dialog would go here */}
      {/* Question Dialog would go here */}
    </div>
  );
}

export default TrainingContentManager;