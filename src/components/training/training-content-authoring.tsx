/**
 * Enhanced Training Content Authoring Tools
 * Advanced content creation interface for training managers
 * Features rich text editor, multimedia support, templates, and AI assistance
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus,
  Edit,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Mic,
  Type,
  Layout,
  Palette,
  Wand2,
  Eye,
  Copy,
  Download,
  FileText,
  BookOpen,
  Lightbulb,
  Sparkles,
  Camera,
  Headphones,
  PlayCircle,
  StopCircle,
  RotateCcw,
  Check,
  AlertCircle,
  Zap,
  Target,
  Users,
  Clock,
  Star,
  Settings,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Grid,
  List,
  Folder,
  Tag,
  Globe,
  MessageSquare
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
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

interface ContentTemplate {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  category: 'safety' | 'service' | 'kitchen' | 'cleaning' | 'emergency' | 'general';
  structure: ContentSection[];
  estimatedDuration: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  thumbnail?: string;
  isPopular?: boolean;
}

interface ContentSection {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'interactive' | 'quiz';
  title: string;
  title_fr: string;
  content: string;
  content_fr: string;
  metadata?: {
    mediaUrl?: string;
    duration?: number;
    size?: string;
    format?: string;
    interactive?: {
      type: 'drag-drop' | 'hotspot' | 'scenario' | 'simulation';
      data: any;
    };
  };
  order: number;
  isRequired: boolean;
}

interface AIAssistanceRequest {
  type: 'improve_content' | 'translate' | 'generate_quiz' | 'suggest_media' | 'accessibility_check';
  content: string;
  language?: 'en' | 'fr';
  parameters?: Record<string, any>;
}

interface TrainingContentAuthoringProps {
  className?: string;
  onSave?: (content: any) => void;
  initialContent?: any;
  mode?: 'create' | 'edit';
}

const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'food-safety-basic',
    name: 'Food Safety Basics',
    name_fr: 'Sécurité Alimentaire de Base',
    description: 'Essential food safety protocols for restaurant staff',
    description_fr: 'Protocoles essentiels de sécurité alimentaire pour le personnel',
    category: 'safety',
    estimatedDuration: 15,
    difficultyLevel: 'beginner',
    tags: ['food safety', 'hygiene', 'mandatory'],
    isPopular: true,
    structure: [
      {
        id: '1',
        type: 'text',
        title: 'Introduction to Food Safety',
        title_fr: 'Introduction à la Sécurité Alimentaire',
        content: 'Food safety is critical in restaurant operations...',
        content_fr: 'La sécurité alimentaire est essentielle dans les opérations...',
        order: 1,
        isRequired: true
      }
    ]
  },
  {
    id: 'customer-service-excellence',
    name: 'Customer Service Excellence',
    name_fr: 'Excellence du Service Client',
    description: 'Advanced customer service techniques for exceptional dining experiences',
    description_fr: 'Techniques avancées de service client pour des expériences exceptionnelles',
    category: 'service',
    estimatedDuration: 25,
    difficultyLevel: 'intermediate',
    tags: ['customer service', 'hospitality', 'communication'],
    isPopular: true,
    structure: []
  },
  {
    id: 'emergency-procedures',
    name: 'Emergency Response Procedures',
    name_fr: 'Procédures de Réponse d\'Urgence',
    description: 'Critical emergency procedures and safety protocols',
    description_fr: 'Procédures d\'urgence critiques et protocoles de sécurité',
    category: 'emergency',
    estimatedDuration: 20,
    difficultyLevel: 'advanced',
    tags: ['emergency', 'safety', 'mandatory', 'critical'],
    structure: []
  }
];

export function TrainingContentAuthoring({ 
  className, 
  onSave, 
  initialContent, 
  mode = 'create' 
}: TrainingContentAuthoringProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [currentStep, setCurrentStep] = useState<'template' | 'content' | 'media' | 'preview'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [contentSections, setContentSections] = useState<ContentSection[]>([]);
  const [currentSection, setCurrentSection] = useState<ContentSection | null>(null);
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAIAssisting, setIsAIAssisting] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('tablet');
  
  // Content editing state
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleTitleFr, setModuleTitleFr] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleDescriptionFr, setModuleDescriptionFr] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState(15);
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // File upload refs
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);
  
  // Filter templates
  const filteredTemplates = CONTENT_TEMPLATES.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.name_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Initialize content from template
  const handleTemplateSelect = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setModuleTitle(template.name);
    setModuleTitleFr(template.name_fr);
    setModuleDescription(template.description);
    setModuleDescriptionFr(template.description_fr);
    setEstimatedDuration(template.estimatedDuration);
    setDifficultyLevel(template.difficultyLevel);
    setSelectedTags([...template.tags]);
    setContentSections([...template.structure]);
    setCurrentStep('content');
  };

  // Skip template and start from scratch
  const handleSkipTemplate = () => {
    setSelectedTemplate(null);
    setCurrentStep('content');
  };

  // Add new content section
  const handleAddSection = (type: ContentSection['type']) => {
    const newSection: ContentSection = {
      id: `section-${Date.now()}`,
      type,
      title: '',
      title_fr: '',
      content: '',
      content_fr: '',
      order: contentSections.length + 1,
      isRequired: true
    };
    
    setContentSections([...contentSections, newSection]);
    setCurrentSection(newSection);
    setIsEditingSection(true);
  };

  // Edit existing section
  const handleEditSection = (section: ContentSection) => {
    setCurrentSection(section);
    setIsEditingSection(true);
  };

  // Save section changes
  const handleSaveSection = () => {
    if (!currentSection) return;
    
    const updatedSections = contentSections.map(section =>
      section.id === currentSection.id ? currentSection : section
    );
    
    setContentSections(updatedSections);
    setIsEditingSection(false);
    setCurrentSection(null);
    
    toast({
      title: t('training.section_saved'),
      description: t('training.section_saved_successfully'),
    });
  };

  // Delete section
  const handleDeleteSection = (sectionId: string) => {
    setContentSections(sections => sections.filter(s => s.id !== sectionId));
    toast({
      title: t('training.section_deleted'),
      description: t('training.section_deleted_successfully'),
    });
  };

  // AI assistance
  const handleAIAssistance = async (request: AIAssistanceRequest) => {
    setIsAIAssisting(true);
    
    try {
      // Simulate AI API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      switch (request.type) {
        case 'improve_content':
          toast({
            title: t('training.ai_content_improved'),
            description: t('training.ai_content_improved_desc'),
          });
          break;
        case 'translate':
          toast({
            title: t('training.ai_translation_complete'),
            description: t('training.ai_translation_complete_desc'),
          });
          break;
        case 'generate_quiz':
          // Add quiz section
          handleAddSection('quiz');
          toast({
            title: t('training.ai_quiz_generated'),
            description: t('training.ai_quiz_generated_desc'),
          });
          break;
        case 'accessibility_check':
          toast({
            title: t('training.ai_accessibility_checked'),
            description: t('training.ai_accessibility_suggestions'),
          });
          break;
      }
    } catch (error) {
      toast({
        title: t('error.ai_assistance_failed'),
        description: t('error.ai_assistance_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsAIAssisting(false);
    }
  };

  // File upload handlers
  const handleFileUpload = async (file: File, type: 'image' | 'video' | 'audio') => {
    setMediaUploading(true);
    
    try {
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mediaUrl = URL.createObjectURL(file);
      
      if (currentSection) {
        const updatedSection = {
          ...currentSection,
          metadata: {
            ...currentSection.metadata,
            mediaUrl,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            format: file.type,
            duration: type === 'video' || type === 'audio' ? 120 : undefined
          }
        };
        setCurrentSection(updatedSection);
      }
      
      toast({
        title: t('training.media_uploaded'),
        description: t('training.media_uploaded_successfully'),
      });
    } catch (error) {
      toast({
        title: t('error.upload_failed'),
        description: t('error.upload_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setMediaUploading(false);
    }
  };

  // Render template selection
  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="p-4 bg-gradient-to-r from-krong-red/10 to-golden-saffron/10 rounded-lg">
          <Sparkles className="w-12 h-12 mx-auto text-krong-red mb-3" />
          <h2 className="text-2xl font-bold text-krong-black">{t('training.choose_template')}</h2>
          <p className="text-muted-foreground">{t('training.template_description')}</p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('training.search_templates')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('training.filter_category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('training.all_categories')}</SelectItem>
            <SelectItem value="safety">{t('training.safety')}</SelectItem>
            <SelectItem value="service">{t('training.service')}</SelectItem>
            <SelectItem value="kitchen">{t('training.kitchen')}</SelectItem>
            <SelectItem value="cleaning">{t('training.cleaning')}</SelectItem>
            <SelectItem value="emergency">{t('training.emergency')}</SelectItem>
            <SelectItem value="general">{t('training.general')}</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Templates grid/list */}
      <div className={cn(
        "gap-4",
        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"
      )}>
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id} 
            className={cn(
              "hover:shadow-md transition-all cursor-pointer border-2 hover:border-krong-red/30",
              viewMode === 'list' && "flex flex-row"
            )}
            onClick={() => handleTemplateSelect(template)}
          >
            <CardContent className={cn(
              "p-4",
              viewMode === 'list' && "flex items-center space-x-4 flex-1"
            )}>
              <div className={cn(
                "space-y-3",
                viewMode === 'list' && "flex-1 space-y-1"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-krong-black">
                    {locale === 'fr' ? template.name_fr : template.name}
                    {template.isPopular && (
                      <Star className="w-4 h-4 text-golden-saffron inline ml-2" />
                    )}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {locale === 'fr' ? template.description_fr : template.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{template.estimatedDuration}m</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Target className="w-3 h-3" />
                      <span>{t(`training.difficulty_${template.difficultyLevel}`)}</span>
                    </span>
                  </div>
                  
                  <Button size="sm" variant="ghost" className="h-6 px-2">
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
                
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Start from scratch option */}
      <Card className="border-dashed border-2 border-muted hover:border-krong-red/50 transition-colors">
        <CardContent className="p-8 text-center">
          <Plus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-krong-black mb-2">
            {t('training.start_from_scratch')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('training.create_custom_content')}
          </p>
          <Button onClick={handleSkipTemplate}>
            {t('training.create_blank_module')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Render content editor
  const renderContentEditor = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-krong-black">{t('training.content_editor')}</h2>
          <p className="text-muted-foreground">{t('training.create_engaging_content')}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowAIPanel(!showAIPanel)}>
            <Wand2 className="w-4 h-4 mr-2" />
            {t('training.ai_assistant')}
          </Button>
          <Button onClick={() => setCurrentStep('preview')}>
            <Eye className="w-4 h-4 mr-2" />
            {t('training.preview')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content sections list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-krong-black">{t('training.content_sections')}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('training.add_section')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('training.section_types')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAddSection('text')}>
                  <Type className="w-4 h-4 mr-2" />
                  {t('training.text_content')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddSection('image')}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {t('training.image')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddSection('video')}>
                  <Video className="w-4 h-4 mr-2" />
                  {t('training.video')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddSection('audio')}>
                  <Headphones className="w-4 h-4 mr-2" />
                  {t('training.audio')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddSection('interactive')}>
                  <Target className="w-4 h-4 mr-2" />
                  {t('training.interactive')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddSection('quiz')}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('training.quiz')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            {contentSections.map((section, index) => (
              <Card 
                key={section.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  currentSection?.id === section.id && "border-krong-red bg-krong-red/5"
                )}
                onClick={() => handleEditSection(section)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-krong-red/10 rounded flex items-center justify-center">
                      <span className="text-xs font-medium text-krong-red">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {section.type === 'text' && <Type className="w-4 h-4 text-muted-foreground" />}
                        {section.type === 'image' && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                        {section.type === 'video' && <Video className="w-4 h-4 text-muted-foreground" />}
                        {section.type === 'audio' && <Headphones className="w-4 h-4 text-muted-foreground" />}
                        {section.type === 'interactive' && <Target className="w-4 h-4 text-muted-foreground" />}
                        {section.type === 'quiz' && <FileText className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm font-medium truncate">
                          {section.title || t('training.untitled_section')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {t(`training.section_type_${section.type}`)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSection(section.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {contentSections.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 w-12 mx-auto mb-3" />
                <p>{t('training.no_sections_yet')}</p>
                <p className="text-xs">{t('training.add_first_section')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Content editor panel */}
        <div className="lg:col-span-2">
          {isEditingSection && currentSection ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('training.edit_section')}</span>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditingSection(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleSaveSection}>
                      <Save className="w-4 h-4 mr-2" />
                      {t('common.save')}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Section title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('training.section_title_en')}</Label>
                    <Input
                      value={currentSection.title}
                      onChange={(e) => setCurrentSection({
                        ...currentSection,
                        title: e.target.value
                      })}
                      placeholder={t('training.enter_section_title')}
                    />
                  </div>
                  <div>
                    <Label>{t('training.section_title_fr')}</Label>
                    <Input
                      value={currentSection.title_fr}
                      onChange={(e) => setCurrentSection({
                        ...currentSection,
                        title_fr: e.target.value
                      })}
                      placeholder={t('training.enter_section_title_fr')}
                    />
                  </div>
                </div>

                {/* Section content based on type */}
                {currentSection.type === 'text' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('training.content_en')}</Label>
                      <Textarea
                        value={currentSection.content}
                        onChange={(e) => setCurrentSection({
                          ...currentSection,
                          content: e.target.value
                        })}
                        placeholder={t('training.enter_content')}
                        rows={8}
                      />
                    </div>
                    <div>
                      <Label>{t('training.content_fr')}</Label>
                      <Textarea
                        value={currentSection.content_fr}
                        onChange={(e) => setCurrentSection({
                          ...currentSection,
                          content_fr: e.target.value
                        })}
                        placeholder={t('training.enter_content_fr')}
                        rows={8}
                      />
                    </div>
                  </div>
                )}

                {/* Media upload sections */}
                {(currentSection.type === 'image' || currentSection.type === 'video' || currentSection.type === 'audio') && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      {currentSection.metadata?.mediaUrl ? (
                        <div className="space-y-4">
                          {currentSection.type === 'image' && (
                            <img 
                              src={currentSection.metadata.mediaUrl} 
                              alt="Preview" 
                              className="max-w-full max-h-48 mx-auto rounded-lg"
                            />
                          )}
                          {currentSection.type === 'video' && (
                            <video 
                              src={currentSection.metadata.mediaUrl} 
                              className="max-w-full max-h-48 mx-auto rounded-lg"
                              controls
                            />
                          )}
                          {currentSection.type === 'audio' && (
                            <audio 
                              src={currentSection.metadata.mediaUrl} 
                              className="w-full"
                              controls
                            />
                          )}
                          <div className="text-sm text-muted-foreground">
                            {currentSection.metadata.size} • {currentSection.metadata.format}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (currentSection.type === 'image') imageUploadRef.current?.click();
                              if (currentSection.type === 'video') videoUploadRef.current?.click();
                              if (currentSection.type === 'audio') audioUploadRef.current?.click();
                            }}
                          >
                            {t('training.replace_file')}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {currentSection.type === 'image' && <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />}
                          {currentSection.type === 'video' && <Video className="w-12 h-12 mx-auto text-muted-foreground" />}
                          {currentSection.type === 'audio' && <Headphones className="w-12 h-12 mx-auto text-muted-foreground" />}
                          
                          <div>
                            <h4 className="font-medium text-krong-black mb-2">
                              {t(`training.upload_${currentSection.type}`)}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              {t(`training.upload_${currentSection.type}_desc`)}
                            </p>
                            <Button
                              onClick={() => {
                                if (currentSection.type === 'image') imageUploadRef.current?.click();
                                if (currentSection.type === 'video') videoUploadRef.current?.click();
                                if (currentSection.type === 'audio') audioUploadRef.current?.click();
                              }}
                              disabled={mediaUploading}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {mediaUploading ? t('training.uploading') : t('training.upload_file')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section settings */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={currentSection.isRequired}
                      onCheckedChange={(checked) => setCurrentSection({
                        ...currentSection,
                        isRequired: checked
                      })}
                    />
                    <Label>{t('training.required_section')}</Label>
                  </div>
                  
                  <Badge variant={currentSection.isRequired ? 'default' : 'secondary'}>
                    {currentSection.isRequired ? t('training.required') : t('training.optional')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Edit className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-krong-black mb-2">
                  {t('training.select_section_to_edit')}
                </h3>
                <p className="text-muted-foreground">
                  {t('training.select_section_to_edit_desc')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageUploadRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, 'image');
        }}
      />
      <input
        ref={videoUploadRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, 'video');
        }}
      />
      <input
        ref={audioUploadRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, 'audio');
        }}
      />
    </div>
  );

  // Render AI assistance panel
  const renderAIPanel = () => showAIPanel ? (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <CardTitle className="flex items-center text-purple-800">
          <Wand2 className="w-5 h-5 mr-2" />
          {t('training.ai_assistant')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssistance({ type: 'improve_content', content: currentSection?.content || '' })}
            disabled={isAIAssisting || !currentSection}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {t('training.improve_content')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssistance({ type: 'translate', content: currentSection?.content || '', language: locale === 'en' ? 'fr' : 'en' })}
            disabled={isAIAssisting || !currentSection}
          >
            <Globe className="w-4 h-4 mr-2" />
            {t('training.auto_translate')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssistance({ type: 'generate_quiz', content: contentSections.map(s => s.content).join(' ') })}
            disabled={isAIAssisting || contentSections.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            {t('training.generate_quiz')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssistance({ type: 'accessibility_check', content: '' })}
            disabled={isAIAssisting}
          >
            <Users className="w-4 h-4 mr-2" />
            {t('training.check_accessibility')}
          </Button>
        </div>
        
        {isAIAssisting && (
          <div className="flex items-center space-x-2 text-purple-700">
            <div className="animate-spin">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-sm">{t('training.ai_processing')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress indicator */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {['template', 'content', 'media', 'preview'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep === step 
                  ? "bg-krong-red text-white" 
                  : index < ['template', 'content', 'media', 'preview'].indexOf(currentStep)
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
              )}>
                {index < ['template', 'content', 'media', 'preview'].indexOf(currentStep) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div className={cn(
                  "w-8 h-0.5 transition-colors",
                  index < ['template', 'content', 'media', 'preview'].indexOf(currentStep)
                    ? "bg-green-500"
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {t(`training.step_${currentStep}`)}
        </div>
      </div>

      {/* AI assistance panel */}
      {renderAIPanel()}

      {/* Step content */}
      {currentStep === 'template' && renderTemplateSelection()}
      {currentStep === 'content' && renderContentEditor()}
      
      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => {
            const steps = ['template', 'content', 'media', 'preview'];
            const currentIndex = steps.indexOf(currentStep);
            if (currentIndex > 0) {
              setCurrentStep(steps[currentIndex - 1] as any);
            }
          }}
          disabled={currentStep === 'template'}
        >
          {t('common.back')}
        </Button>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Save className="w-4 h-4 mr-2" />
            {t('common.save_draft')}
          </Button>
          
          <Button
            onClick={() => {
              const steps = ['template', 'content', 'media', 'preview'];
              const currentIndex = steps.indexOf(currentStep);
              if (currentIndex < steps.length - 1) {
                setCurrentStep(steps[currentIndex + 1] as any);
              } else {
                // Publish
                onSave?.({
                  title: moduleTitle,
                  title_fr: moduleTitleFr,
                  description: moduleDescription,
                  description_fr: moduleDescriptionFr,
                  sections: contentSections,
                  estimatedDuration,
                  difficultyLevel,
                  tags: selectedTags
                });
              }
            }}
          >
            {currentStep === 'preview' ? t('training.publish_module') : t('common.next')}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TrainingContentAuthoring;