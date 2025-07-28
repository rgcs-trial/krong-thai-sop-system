'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  HelpCircle, 
  Search, 
  Play, 
  Book, 
  Video, 
  FileText, 
  MessageCircle,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  Clock,
  Star,
  ThumbsUp,
  Download,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Pause
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SOPHelpPageProps {
  params: Promise<{ locale: string }>;
}

interface HelpArticle {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  category: string;
  content: string;
  content_fr: string;
  views: number;
  rating: number;
  last_updated: string;
  tags: string[];
}

interface TutorialVideo {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  duration: number; // in seconds
  thumbnail: string;
  video_url: string;
  category: string;
  views: number;
  rating: number;
  transcript?: string;
  chapters: { title: string; time: number }[];
}

interface FAQ {
  id: string;
  question: string;
  question_fr: string;
  answer: string;
  answer_fr: string;
  category: string;
  votes: number;
  views: number;
}

// Mock data
const MOCK_ARTICLES: HelpArticle[] = [
  {
    id: '1',
    title: 'Getting Started with SOPs',
    title_fr: 'Commencer avec les SOP',
    description: 'Learn the basics of using the SOP system',
    description_fr: 'Apprenez les bases de l\'utilisation du système SOP',
    category: 'Getting Started',
    content: 'This guide will help you understand how to navigate and use SOPs effectively...',
    content_fr: 'Ce guide vous aidera à comprendre comment naviguer et utiliser les SOP efficacement...',
    views: 1205,
    rating: 4.8,
    last_updated: '2024-01-20',
    tags: ['basics', 'navigation', 'beginner']
  },
  {
    id: '2',
    title: 'Using the QR Scanner',
    title_fr: 'Utilisation du Scanner QR',
    description: 'Step-by-step guide to scanning QR codes',
    description_fr: 'Guide étape par étape pour scanner les codes QR',
    category: 'Scanner',
    content: 'The QR scanner allows you to quickly access SOPs by scanning codes...',
    content_fr: 'Le scanner QR vous permet d\'accéder rapidement aux SOP en scannant les codes...',
    views: 892,
    rating: 4.6,
    last_updated: '2024-01-18',
    tags: ['qr', 'scanner', 'mobile']
  }
];

const MOCK_VIDEOS: TutorialVideo[] = [
  {
    id: '1',
    title: 'SOP System Overview',
    title_fr: 'Aperçu du Système SOP',
    description: 'Complete walkthrough of the SOP management system',
    description_fr: 'Présentation complète du système de gestion SOP',
    duration: 480, // 8 minutes
    thumbnail: '/videos/overview-thumb.jpg',
    video_url: '/videos/overview.mp4',
    category: 'Overview',
    views: 2150,
    rating: 4.9,
    chapters: [
      { title: 'Introduction', time: 0 },
      { title: 'Navigation', time: 90 },
      { title: 'Starting SOPs', time: 180 },
      { title: 'Completion Process', time: 300 }
    ]
  },
  {
    id: '2',
    title: 'Executing Your First SOP',
    title_fr: 'Exécuter Votre Premier SOP',
    description: 'Learn how to properly execute SOPs step by step',
    description_fr: 'Apprenez à exécuter correctement les SOP étape par étape',
    duration: 360, // 6 minutes
    thumbnail: '/videos/first-sop-thumb.jpg',
    video_url: '/videos/first-sop.mp4',
    category: 'Execution',
    views: 1876,
    rating: 4.7,
    chapters: [
      { title: 'Selecting an SOP', time: 0 },
      { title: 'Following Steps', time: 120 },
      { title: 'Taking Photos', time: 240 },
      { title: 'Completion', time: 300 }
    ]
  }
];

const MOCK_FAQS: FAQ[] = [
  {
    id: '1',
    question: 'How do I scan a QR code?',
    question_fr: 'Comment scanner un code QR ?',
    answer: 'Go to the Scanner page and point your camera at the QR code. The system will automatically detect and process it.',
    answer_fr: 'Allez à la page Scanner et pointez votre caméra vers le code QR. Le système le détectera et le traitera automatiquement.',
    category: 'Scanner',
    votes: 23,
    views: 145
  },
  {
    id: '2',
    question: 'What happens if I make a mistake during an SOP?',
    question_fr: 'Que se passe-t-il si je fais une erreur pendant un SOP ?',
    answer: 'You can go back to previous steps or restart the SOP. All progress is saved automatically.',
    answer_fr: 'Vous pouvez revenir aux étapes précédentes ou redémarrer le SOP. Tous les progrès sont sauvegardés automatiquement.',
    category: 'Execution',
    votes: 18,
    views: 89
  }
];

export default function SOPHelpPage({ params }: SOPHelpPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ locale: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');

  const router = useRouter();
  const t = useTranslations('sop');

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  if (!resolvedParams) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>;
  }

  const { locale } = resolvedParams;

  const filteredContent = {
    articles: MOCK_ARTICLES.filter(article => 
      searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.title_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    videos: MOCK_VIDEOS.filter(video => 
      searchQuery === '' || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.title_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    faqs: MOCK_FAQS.filter(faq => 
      searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.question_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  };

  const handleVideoSelect = (video: TutorialVideo) => {
    setSelectedVideo(video);
    setIsVideoPlaying(false);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleContactSupport = () => {
    toast({
      title: t('help.contactSupport'),
      description: t('help.supportContactedDescription'),
    });
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
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('help.title')}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {t('help.subtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleContactSupport}
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                {t('help.contactSupport')}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder={t('help.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="videos" className="gap-2">
              <Video className="w-4 h-4" />
              {t('help.tabs.videos')}
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="w-4 h-4" />
              {t('help.tabs.articles')}
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              {t('help.tabs.faqs')}
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              {t('help.tabs.contact')}
            </TabsTrigger>
          </TabsList>

          {/* Video Tutorials */}
          <TabsContent value="videos" className="space-y-6">
            {selectedVideo ? (
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Video Player */}
                    <div className="lg:col-span-2">
                      <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white text-center">
                            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">{locale === 'fr' ? selectedVideo.title_fr : selectedVideo.title}</p>
                            <p className="text-sm opacity-75">{formatDuration(selectedVideo.duration)}</p>
                          </div>
                        </div>
                        
                        {/* Video Controls */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                          <div className="flex items-center gap-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                              className="text-white hover:bg-white/20"
                            >
                              {isVideoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                            >
                              <SkipBack className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                            >
                              <SkipForward className="w-4 h-4" />
                            </Button>
                            <div className="flex-1" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setVideoMuted(!videoMuted)}
                              className="text-white hover:bg-white/20"
                            >
                              {videoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                            >
                              <Maximize className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Video Info */}
                      <div className="mt-4">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                          {locale === 'fr' ? selectedVideo.title_fr : selectedVideo.title}
                        </h2>
                        <p className="text-gray-600 mb-4">
                          {locale === 'fr' ? selectedVideo.description_fr : selectedVideo.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{selectedVideo.views.toLocaleString()} {t('help.views')}</span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-current text-yellow-500" />
                            {selectedVideo.rating}
                          </span>
                          <span>{formatDuration(selectedVideo.duration)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Video Chapters */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">{t('help.chapters')}</h3>
                      <div className="space-y-2">
                        {selectedVideo.chapters.map((chapter, index) => (
                          <button
                            key={index}
                            className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{chapter.title}</span>
                              <span className="text-sm text-gray-500">{formatDuration(chapter.time)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="mt-6 space-y-2">
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="w-4 h-4" />
                          {t('help.download')}
                        </Button>
                        <Button variant="outline" className="w-full gap-2">
                          <Share2 className="w-4 h-4" />
                          {t('help.share')}
                        </Button>
                        <Button variant="outline" className="w-full gap-2">
                          <Bookmark className="w-4 h-4" />
                          {t('help.bookmark')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.videos.map((video) => (
                  <Card key={video.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleVideoSelect(video)}>
                    <CardContent className="p-0">
                      <div className="aspect-video bg-gray-200 rounded-t-lg relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                          {formatDuration(video.duration)}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                          {locale === 'fr' ? video.title_fr : video.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {locale === 'fr' ? video.description_fr : video.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{video.views.toLocaleString()} {t('help.views')}</span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current text-yellow-500" />
                            {video.rating}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Help Articles */}
          <TabsContent value="articles" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredContent.articles.map((article) => (
                <Card key={article.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {locale === 'fr' ? article.title_fr : article.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {locale === 'fr' ? article.description_fr : article.description}
                        </p>
                      </div>
                      <Badge variant="outline">{article.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{article.views.toLocaleString()} {t('help.views')}</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current text-yellow-500" />
                        {article.rating}
                      </span>
                      <span>{new Date(article.last_updated).toLocaleDateString(locale)}</span>
                    </div>
                    <Button variant="outline" className="w-full gap-2">
                      <Book className="w-4 h-4" />
                      {t('help.readArticle')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* FAQs */}
          <TabsContent value="faqs" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="space-y-4">
                  {filteredContent.faqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-4">
                          <span className="text-left font-medium">
                            {locale === 'fr' ? faq.question_fr : faq.question}
                          </span>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <ThumbsUp className="w-4 h-4" />
                            {faq.votes}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 pb-4">
                          <p className="text-gray-700">
                            {locale === 'fr' ? faq.answer_fr : faq.answer}
                          </p>
                          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                            <button className="flex items-center gap-1 hover:text-gray-700">
                              <ThumbsUp className="w-4 h-4" />
                              {t('help.helpful')}
                            </button>
                            <span>{faq.views} {t('help.views')}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Support */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    {t('help.contact.chat')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    {t('help.contact.chatDescription')}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4" />
                    {t('help.contact.chatHours')}
                  </div>
                  <Button onClick={handleContactSupport} className="w-full bg-green-600 hover:bg-green-700">
                    {t('help.contact.startChat')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    {t('help.contact.email')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    {t('help.contact.emailDescription')}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4" />
                    {t('help.contact.emailResponse')}
                  </div>
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="w-4 h-4" />
                    support@krongthai.com
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    {t('help.contact.phone')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    {t('help.contact.phoneDescription')}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4" />
                    {t('help.contact.phoneHours')}
                  </div>
                  <Button variant="outline" className="w-full gap-2">
                    <Phone className="w-4 h-4" />
                    +1 (555) 123-4567
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Book className="w-5 h-5" />
                    {t('help.contact.documentation')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    {t('help.contact.documentationDescription')}
                  </p>
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {t('help.contact.viewDocs')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}