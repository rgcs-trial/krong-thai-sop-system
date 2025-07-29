'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  MessageSquare, 
  Star, 
  Send, 
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Lightbulb,
  Clock,
  User,
  Calendar,
  TrendingUp,
  Filter,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';

interface SOPFeedbackPageProps {
  params: Promise<{ locale: string }>;
}

interface FeedbackSubmission {
  rating: number;
  category: 'improvement' | 'issue' | 'question' | 'suggestion';
  title: string;
  description: string;
  steps_affected: string[];
  priority: 'low' | 'medium' | 'high';
  anonymous: boolean;
}

interface ExistingFeedback {
  id: string;
  user_name: string;
  title: string;
  description: string;
  category: 'improvement' | 'issue' | 'question' | 'suggestion';
  rating: number;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  votes: number;
  created_at: string;
  responses: number;
  sop_title: string;
}

interface SOPDocument {
  id: string;
  title: string;
  title_fr: string;
  steps: Array<{
    id: string;
    step_number: number;
    title: string;
    title_fr: string;
  }>;
}

// Mock data
const MOCK_SOP: SOPDocument = {
  id: '1',
  title: 'Hand Washing Procedure',
  title_fr: 'Procédure de Lavage des Mains',
  steps: [
    { id: 'step-1', step_number: 1, title: 'Remove jewelry', title_fr: 'Retirer les bijoux' },
    { id: 'step-2', step_number: 2, title: 'Turn on water', title_fr: 'Ouvrir l\'eau' },
    { id: 'step-3', step_number: 3, title: 'Wet hands', title_fr: 'Mouiller les mains' },
  ]
};

const MOCK_FEEDBACK: ExistingFeedback[] = [
  {
    id: '1',
    user_name: 'Marie Dubois',
    title: 'Water temperature guidance unclear',
    description: 'Step 2 mentions warm water but doesn\'t specify the exact temperature range clearly enough.',
    category: 'improvement',
    rating: 4,
    priority: 'medium',
    status: 'in_review',
    votes: 8,
    created_at: '2024-01-24T10:00:00Z',
    responses: 2,
    sop_title: 'Hand Washing Procedure'
  },
  {
    id: '2',
    user_name: 'Jean Martin',
    title: 'Missing timer suggestion',
    description: 'Would be helpful to have a built-in timer for the 20-second scrubbing step.',
    category: 'suggestion',
    rating: 5,
    priority: 'low',
    status: 'open',
    votes: 12,
    created_at: '2024-01-23T14:30:00Z',
    responses: 0,
    sop_title: 'Hand Washing Procedure'
  }
];

// Inner component that uses useSearchParams
function FeedbackContent({ locale }: { locale: string }) {
  const [sop, setSop] = useState<SOPDocument>(MOCK_SOP);
  const [feedback, setFeedback] = useState<FeedbackSubmission>({
    rating: 5,
    category: 'improvement',
    title: '',
    description: '',
    steps_affected: [],
    priority: 'medium',
    anonymous: false,
  });
  const [existingFeedback, setExistingFeedback] = useState<ExistingFeedback[]>(MOCK_FEEDBACK);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('submit');

  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('sop');
  const { user } = useAuthStore();

  // Get SOP ID from query params
  useEffect(() => {
    const sopId = searchParams.get('sop');
    if (sopId) {
      // In a real app, fetch SOP data by ID
    }
  }, [searchParams]);

  const handleStepToggle = (stepId: string) => {
    const newSteps = feedback.steps_affected.includes(stepId)
      ? feedback.steps_affected.filter(id => id !== stepId)
      : [...feedback.steps_affected, stepId];
    
    setFeedback(prev => ({ ...prev, steps_affected: newSteps }));
  };

  const handleSubmitFeedback = () => {
    if (!feedback.title.trim() || !feedback.description.trim()) {
      toast({
        title: t('feedback.incomplete'),
        description: t('feedback.incompleteDescription'),
        variant: 'destructive',
      });
      return;
    }

    // In a real app, submit feedback to API
    toast({
      title: t('feedback.submitted'),
      description: t('feedback.submittedDescription'),
    });

    // Reset form
    setFeedback({
      rating: 5,
      category: 'improvement',
      title: '',
      description: '',
      steps_affected: [],
      priority: 'medium',
      anonymous: false,
    });
    
    setActiveTab('browse');
  };

  const handleVoteFeedback = (feedbackId: string, increment: boolean) => {
    setExistingFeedback(prev => prev.map(fb => 
      fb.id === feedbackId 
        ? { ...fb, votes: fb.votes + (increment ? 1 : -1) }
        : fb
    ));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'improvement': return TrendingUp;
      case 'issue': return AlertTriangle;
      case 'suggestion': return Lightbulb;
      case 'question': return MessageSquare;
      default: return MessageSquare;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'improvement': return 'bg-blue-100 text-blue-700';
      case 'issue': return 'bg-red-100 text-red-700';
      case 'suggestion': return 'bg-green-100 text-green-700';
      case 'question': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700';
      case 'in_review': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-blue-100 text-blue-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredFeedback = existingFeedback.filter(fb => {
    const matchesSearch = searchQuery === '' || 
      fb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || fb.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || fb.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
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
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('feedback.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {locale === 'fr' ? sop.title_fr : sop.title}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                {existingFeedback.length} {t('feedback.totalFeedback')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="submit" className="gap-2">
              <Send className="w-4 h-4" />
              {t('feedback.tabs.submit')}
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {t('feedback.tabs.browse')}
            </TabsTrigger>
          </TabsList>

          {/* Submit Feedback */}
          <TabsContent value="submit" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('feedback.submitTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Rating */}
                    <div>
                      <Label className="text-base font-medium">{t('feedback.overallRating')}</Label>
                      <div className="flex items-center gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                            className={cn(
                              "w-8 h-8 transition-colors",
                              star <= feedback.rating ? "text-yellow-400" : "text-gray-300"
                            )}
                          >
                            <Star className="w-full h-full fill-current" />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">
                          {feedback.rating}/5 {t('feedback.stars')}
                        </span>
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <Label className="text-base font-medium">{t('feedback.category')}</Label>
                      <RadioGroup
                        value={feedback.category}
                        onValueChange={(value: any) => setFeedback(prev => ({ ...prev, category: value }))}
                        className="mt-2"
                      >
                        {[
                          { value: 'improvement', label: t('feedback.categories.improvement'), icon: TrendingUp },
                          { value: 'issue', label: t('feedback.categories.issue'), icon: AlertTriangle },
                          { value: 'suggestion', label: t('feedback.categories.suggestion'), icon: Lightbulb },
                          { value: 'question', label: t('feedback.categories.question'), icon: MessageSquare },
                        ].map(({ value, label, icon: Icon }) => (
                          <div key={value} className="flex items-center space-x-2">
                            <RadioGroupItem value={value} id={value} />
                            <Label htmlFor={value} className="flex items-center gap-2 cursor-pointer">
                              <Icon className="w-4 h-4" />
                              {label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Title */}
                    <div>
                      <Label htmlFor="title" className="text-base font-medium">{t('feedback.title')}</Label>
                      <Input
                        id="title"
                        value={feedback.title}
                        onChange={(e) => setFeedback(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={t('feedback.titlePlaceholder')}
                        className="mt-1"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <Label htmlFor="description" className="text-base font-medium">{t('feedback.description')}</Label>
                      <Textarea
                        id="description"
                        value={feedback.description}
                        onChange={(e) => setFeedback(prev => ({ ...prev, description: e.target.value }))}
                        placeholder={t('feedback.descriptionPlaceholder')}
                        className="mt-1"
                        rows={4}
                      />
                    </div>

                    {/* Affected Steps */}
                    <div>
                      <Label className="text-base font-medium">{t('feedback.affectedSteps')}</Label>
                      <div className="mt-2 space-y-2">
                        {sop.steps.map((step) => (
                          <div key={step.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={step.id}
                              checked={feedback.steps_affected.includes(step.id)}
                              onCheckedChange={() => handleStepToggle(step.id)}
                            />
                            <Label htmlFor={step.id} className="cursor-pointer">
                              {t('step.title')} {step.step_number}: {locale === 'fr' ? step.title_fr : step.title}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <Label className="text-base font-medium">{t('feedback.priority')}</Label>
                      <Select value={feedback.priority} onValueChange={(value: any) => setFeedback(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t('feedback.priorities.low')}</SelectItem>
                          <SelectItem value="medium">{t('feedback.priorities.medium')}</SelectItem>
                          <SelectItem value="high">{t('feedback.priorities.high')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Anonymous */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="anonymous"
                        checked={feedback.anonymous}
                        onCheckedChange={(checked) => setFeedback(prev => ({ ...prev, anonymous: !!checked }))}
                      />
                      <Label htmlFor="anonymous">{t('feedback.submitAnonymously')}</Label>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitFeedback}
                      className="w-full bg-red-600 hover:bg-red-700 gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {t('feedback.submit')}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Guidelines */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('feedback.guidelines')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">{t('feedback.guidelines.specific')}</h4>
                      <p className="text-gray-600">{t('feedback.guidelines.specificDesc')}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">{t('feedback.guidelines.constructive')}</h4>
                      <p className="text-gray-600">{t('feedback.guidelines.constructiveDesc')}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">{t('feedback.guidelines.actionable')}</h4>
                      <p className="text-gray-600">{t('feedback.guidelines.actionableDesc')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Browse Feedback */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={t('feedback.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('feedback.filters.allStatuses')}</SelectItem>
                      <SelectItem value="open">{t('feedback.statuses.open')}</SelectItem>
                      <SelectItem value="in_review">{t('feedback.statuses.inReview')}</SelectItem>
                      <SelectItem value="resolved">{t('feedback.statuses.resolved')}</SelectItem>
                      <SelectItem value="closed">{t('feedback.statuses.closed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('feedback.filters.allCategories')}</SelectItem>
                      <SelectItem value="improvement">{t('feedback.categories.improvement')}</SelectItem>
                      <SelectItem value="issue">{t('feedback.categories.issue')}</SelectItem>
                      <SelectItem value="suggestion">{t('feedback.categories.suggestion')}</SelectItem>
                      <SelectItem value="question">{t('feedback.categories.question')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Feedback List */}
            {filteredFeedback.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('feedback.noResults.title')}
                  </h3>
                  <p className="text-gray-600">
                    {t('feedback.noResults.description')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredFeedback.map((fb) => {
                  const CategoryIcon = getCategoryIcon(fb.category);
                  return (
                    <Card key={fb.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              getCategoryColor(fb.category)
                            )}>
                              <CategoryIcon className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{fb.title}</h3>
                                <Badge className={getCategoryColor(fb.category)}>
                                  {t(`feedback.categories.${fb.category}`)}
                                </Badge>
                                <Badge className={getStatusColor(fb.status)}>
                                  {t(`feedback.statuses.${fb.status}`)}
                                </Badge>
                                <Badge className={getPriorityColor(fb.priority)}>
                                  {t(`feedback.priorities.${fb.priority}`)}
                                </Badge>
                              </div>
                              
                              <p className="text-gray-700 mb-3">{fb.description}</p>
                              
                              <div className="flex items-center gap-6 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {fb.user_name}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatRelativeTime(fb.created_at)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-current text-yellow-500" />
                                  {fb.rating}/5
                                </div>
                                {fb.responses > 0 && (
                                  <div className="flex items-center gap-1">
                                    <MessageSquare className="w-4 h-4" />
                                    {fb.responses} {t('feedback.responses')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVoteFeedback(fb.id, true)}
                                className="w-8 h-8 p-0"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </Button>
                              <span className="text-sm font-medium text-gray-600">{fb.votes}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVoteFeedback(fb.id, false)}
                                className="w-8 h-8 p-0"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}