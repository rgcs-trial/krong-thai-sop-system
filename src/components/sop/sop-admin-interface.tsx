'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Upload, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Eye,
  Copy,
  Settings,
  Tag,
  Calendar,
  User,
  Clock,
  Paperclip
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSOPDocuments, useSOPCategories } from '@/lib/hooks/use-sop-queries';
import { SOPDocument, SOPCategory, SOPDocumentStep } from '@/types/database';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';
import { CategoryIconWithBackground, getCategoryColor } from './sop-category-icons';

interface SOPAdminInterfaceProps {
  locale: string;
  className?: string;
}

interface SOPFormData {
  title: string;
  title_th: string;
  content: string;
  content_th: string;
  category_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'review' | 'approved' | 'archived';
  tags: string[];
  tags_th: string[];
  steps: SOPDocumentStep[];
  steps_th: SOPDocumentStep[];
  effective_date?: string;
  review_date?: string;
  attachments: string[];
}

const defaultFormData: SOPFormData = {
  title: '',
  title_th: '',
  content: '',
  content_th: '',
  category_id: '',
  priority: 'medium',
  status: 'draft',
  tags: [],
  tags_th: [],
  steps: [],
  steps_th: [],
  attachments: []
};

export function SOPAdminInterface({ locale, className }: SOPAdminInterfaceProps) {
  const t = useTranslations();
  const user = useAuthStore(state => state.user);
  
  // State management
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<SOPDocument | null>(null);
  const [formData, setFormData] = useState<SOPFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('en');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Data fetching
  const { data: categories } = useSOPCategories();
  const { 
    data: documentsResponse, 
    isLoading, 
    refetch: refetchDocuments 
  } = useSOPDocuments();
  
  const documents = documentsResponse?.data || [];
  
  // Check if user has admin/manager permissions
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  
  if (!canEdit) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className={cn('text-xl font-semibold mb-2', locale === 'th' && 'font-thai')}>
          {t('errors.unauthorized')}
        </h2>
        <p className={cn('text-gray-600', locale === 'th' && 'font-thai')}>
          {t('sop.admin.noPermission')}
        </p>
      </div>
    );
  }
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.title || !formData.title_th || !formData.content || !formData.content_th || !formData.category_id) {
      toast({
        title: t('common.error'),
        description: t('sop.admin.requiredFields'),
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const payload = {
        ...formData,
        restaurant_id: user?.restaurant_id,
        created_by: user?.id,
        updated_by: user?.id
      };
      
      const url = editingDocument 
        ? `/api/sop/documents/${editingDocument.id}`
        : '/api/sop/documents';
        
      const method = editingDocument ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save document');
      }
      
      toast({
        title: t('common.success'),
        description: editingDocument 
          ? t('sop.admin.documentUpdated')
          : t('sop.admin.documentCreated')
      });
      
      setIsDialogOpen(false);
      setEditingDocument(null);
      setFormData(defaultFormData);
      refetchDocuments();
      
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.general'),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle delete
  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/sop/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      toast({
        title: t('common.success'),
        description: t('sop.admin.documentDeleted')
      });
      
      refetchDocuments();
      
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.general'),
        variant: 'destructive'
      });
    }
    
    setDeleteConfirmId(null);
  };
  
  // Handle edit
  const handleEdit = (document: SOPDocument) => {
    setEditingDocument(document);
    setFormData({
      title: document.title,
      title_th: document.title_th,
      content: document.content,
      content_th: document.content_th,
      category_id: document.category_id,
      priority: document.priority,
      status: document.status,
      tags: document.tags || [],
      tags_th: document.tags_th || [],
      steps: document.steps || [],
      steps_th: document.steps_th || [],
      effective_date: document.effective_date,
      review_date: document.review_date,
      attachments: document.attachments || []
    });
    setIsDialogOpen(true);
  };
  
  // Handle create new
  const handleCreateNew = () => {
    setEditingDocument(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };
  
  // Add step
  const addStep = (language: 'en' | 'th') => {
    const stepKey = language === 'en' ? 'steps' : 'steps_th';
    const newStep: SOPDocumentStep = {
      step: (formData[stepKey].length + 1),
      action: '',
      note: '',
      duration: '',
      warning: '',
      tools: [],
      image: ''
    };
    
    setFormData(prev => ({
      ...prev,
      [stepKey]: [...prev[stepKey], newStep]
    }));
  };
  
  // Remove step
  const removeStep = (index: number, language: 'en' | 'th') => {
    const stepKey = language === 'en' ? 'steps' : 'steps_th';
    setFormData(prev => ({
      ...prev,
      [stepKey]: prev[stepKey].filter((_, i) => i !== index)
    }));
  };
  
  // Update step
  const updateStep = (index: number, field: keyof SOPDocumentStep, value: any, language: 'en' | 'th') => {
    const stepKey = language === 'en' ? 'steps' : 'steps_th';
    setFormData(prev => ({
      ...prev,
      [stepKey]: prev[stepKey].map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn('text-2xl font-bold text-brand-black', locale === 'th' && 'font-thai')}>
            {t('sop.admin.title')}
          </h1>
          <p className={cn('text-gray-600 mt-1', locale === 'th' && 'font-thai')}>
            {t('sop.admin.subtitle')}
          </p>
        </div>
        <Button 
          onClick={handleCreateNew} 
          className="bg-brand-red hover:bg-brand-red/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('sop.admin.createNew')}
        </Button>
      </div>
      
      {/* Documents List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red mx-auto mb-4"></div>
            <p className={cn('text-gray-600', locale === 'th' && 'font-thai')}>
              {t('sop.loading')}
            </p>
          </div>
        ) : documents.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className={cn('text-lg font-medium text-gray-900 mb-2', locale === 'th' && 'font-thai')}>
              {t('sop.admin.noDocuments')}
            </h3>
            <p className={cn('text-gray-600 mb-4', locale === 'th' && 'font-thai')}>
              {t('sop.admin.noDocumentsDesc')}
            </p>
            <Button onClick={handleCreateNew} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {t('sop.admin.createFirst')}
            </Button>
          </Card>
        ) : (
          documents.map((document) => {
            const category = categories?.find(cat => cat.id === document.category_id);
            const title = locale === 'th' ? document.title_th : document.title;
            
            return (
              <Card key={document.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {category && (
                        <CategoryIconWithBackground
                          categoryCode={category.code}
                          color={getCategoryColor(category.code)}
                          size="sm"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className={cn(
                          'text-lg font-semibold text-brand-black mb-1',
                          locale === 'th' && 'font-thai'
                        )}>
                          {title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={getStatusColor(document.status)}>
                            {t(`sop.${document.status}`)}
                          </Badge>
                          <Badge className={getPriorityColor(document.priority)}>
                            {t(`sop.${document.priority}`)}
                          </Badge>
                          {category && (
                            <Badge variant="outline">
                              {locale === 'th' ? category.name_th : category.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{document.created_by}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(document.created_at).toLocaleDateString()}</span>
                          </div>
                          {document.version && (
                            <div className="flex items-center gap-1">
                              <Settings className="w-4 h-4" />
                              <span>v{document.version}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(document)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(document.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>
      
      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(locale === 'th' && 'font-thai')}>
              {editingDocument ? t('sop.admin.editDocument') : t('sop.admin.createDocument')}
            </DialogTitle>
            <DialogDescription className={cn(locale === 'th' && 'font-thai')}>
              {editingDocument ? t('sop.admin.editDocumentDesc') : t('sop.admin.createDocumentDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="th">ไทย</TabsTrigger>
              <TabsTrigger value="settings">{t('common.settings')}</TabsTrigger>
            </TabsList>
            
            {/* English Content */}
            <TabsContent value="en" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('sop.title')} (English)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('sop.admin.titlePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{t('sop.category')}</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('sop.admin.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">{t('sop.content')} (English)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={t('sop.admin.contentPlaceholder')}
                  rows={6}
                />
              </div>
              
              {/* Steps in English */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t('sop.steps')} (English)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => addStep('en')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('sop.admin.addStep')}
                  </Button>
                </div>
                
                {formData.steps.map((step, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium">Step {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index, 'en')}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Action</Label>
                        <Input
                          value={step.action}
                          onChange={(e) => updateStep(index, 'action', e.target.value, 'en')}
                          placeholder="What action to take"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input
                          value={step.duration || ''}
                          onChange={(e) => updateStep(index, 'duration', e.target.value, 'en')}
                          placeholder="e.g., 5 minutes"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Note</Label>
                        <Textarea
                          value={step.note || ''}
                          onChange={(e) => updateStep(index, 'note', e.target.value, 'en')}
                          placeholder="Additional details"
                          rows={2}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Warning</Label>
                        <Textarea
                          value={step.warning || ''}
                          onChange={(e) => updateStep(index, 'warning', e.target.value, 'en')}
                          placeholder="Important warnings or cautions"
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            {/* Thai Content */}
            <TabsContent value="th" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title_th">{t('sop.title')} (ไทย)</Label>
                <Input
                  id="title_th"
                  value={formData.title_th}
                  onChange={(e) => setFormData(prev => ({ ...prev, title_th: e.target.value }))}
                  placeholder={t('sop.admin.titlePlaceholder')}
                  className="font-thai"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content_th">{t('sop.content')} (ไทย)</Label>
                <Textarea
                  id="content_th"
                  value={formData.content_th}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_th: e.target.value }))}
                  placeholder={t('sop.admin.contentPlaceholder')}
                  rows={6}
                  className="font-thai"
                />
              </div>
              
              {/* Steps in Thai */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-thai">{t('sop.steps')} (ไทย)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => addStep('th')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('sop.admin.addStep')}
                  </Button>
                </div>
                
                {formData.steps_th.map((step, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium font-thai">ขั้นตอนที่ {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index, 'th')}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="font-thai">การดำเนินการ</Label>
                        <Input
                          value={step.action}
                          onChange={(e) => updateStep(index, 'action', e.target.value, 'th')}
                          placeholder="สิ่งที่ต้องทำ"
                          className="font-thai"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-thai">ระยะเวลา</Label>
                        <Input
                          value={step.duration || ''}
                          onChange={(e) => updateStep(index, 'duration', e.target.value, 'th')}
                          placeholder="เช่น 5 นาที"
                          className="font-thai"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="font-thai">หมายเหตุ</Label>
                        <Textarea
                          value={step.note || ''}
                          onChange={(e) => updateStep(index, 'note', e.target.value, 'th')}
                          placeholder="รายละเอียดเพิ่มเติม"
                          rows={2}
                          className="font-thai"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="font-thai">คำเตือน</Label>
                        <Textarea
                          value={step.warning || ''}
                          onChange={(e) => updateStep(index, 'warning', e.target.value, 'th')}
                          placeholder="คำเตือนหรือข้อควรระวัง"
                          rows={2}
                          className="font-thai"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('sop.priority')}</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('sop.low')}</SelectItem>
                      <SelectItem value="medium">{t('sop.medium')}</SelectItem>
                      <SelectItem value="high">{t('sop.high')}</SelectItem>
                      <SelectItem value="critical">{t('sop.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('sop.status')}</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('sop.draft')}</SelectItem>
                      <SelectItem value="review">{t('sop.review')}</SelectItem>
                      <SelectItem value="approved">{t('sop.approved')}</SelectItem>
                      <SelectItem value="archived">{t('sop.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('sop.effectiveDate')}</Label>
                  <Input
                    type="date"
                    value={formData.effective_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('sop.reviewDate')}</Label>
                  <Input
                    type="date"
                    value={formData.review_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, review_date: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn('flex items-center gap-2', locale === 'th' && 'font-thai')}>
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {t('common.confirmDelete')}
            </DialogTitle>
            <DialogDescription className={cn(locale === 'th' && 'font-thai')}>
              {t('sop.admin.confirmDeleteDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SOPAdminInterface;