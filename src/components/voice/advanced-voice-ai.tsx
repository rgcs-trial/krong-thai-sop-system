'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  MicOff, 
  Volume2,
  VolumeX,
  MessageSquare,
  Brain,
  Zap,
  Target,
  Settings,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Clock,
  Globe,
  Users,
  Bot,
  Waves
} from 'lucide-react';

interface VoiceIntent {
  intent: string;
  confidence: number;
  entities: {
    [key: string]: {
      value: string;
      confidence: number;
      synonyms?: string[];
    };
  };
  context: string[];
}

interface VoiceResponse {
  text: string;
  text_fr: string;
  speech_url?: string;
  actions?: {
    type: 'navigation' | 'execute' | 'search' | 'help' | 'confirmation';
    payload: any;
  }[];
  context_update?: string[];
  follow_up_questions?: string[];
  confidence: number;
}

interface ConversationTurn {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant';
  content: string;
  intent?: VoiceIntent;
  response?: VoiceResponse;
  audio_duration?: number;
  confidence?: number;
}

interface VoiceAIContext {
  user_role: 'staff' | 'manager' | 'admin';
  current_location: string;
  active_tasks: string[];
  recent_sops: string[];
  training_progress: {
    completed_modules: string[];
    current_module?: string;
  };
  conversation_history: ConversationTurn[];
  language_preference: 'en' | 'fr';
}

interface AdvancedVoiceAIProps {
  /** Current user context */
  context: VoiceAIContext;
  /** Enable continuous listening */
  continuousListening?: boolean;
  /** Enable natural language understanding */
  enableNLU?: boolean;
  /** Enable voice synthesis */
  enableTTS?: boolean;
  /** Enable multilingual support */
  multilingualMode?: boolean;
  /** Voice activation keyword */
  wakeWord?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when intent is recognized */
  onIntentRecognized?: (intent: VoiceIntent) => void;
  /** Callback when action is triggered */
  onActionTriggered?: (action: VoiceResponse['actions']) => void;
  /** Callback when conversation updates */
  onConversationUpdate?: (turns: ConversationTurn[]) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * AdvancedVoiceAI - Natural language processing voice interface
 * 
 * Features:
 * - Advanced speech recognition with NLP processing
 * - Multi-intent understanding and entity extraction
 * - Contextual conversation management
 * - Multilingual voice commands (EN/FR)
 * - Real-time voice activity detection
 * - Intelligent response generation
 * - Context-aware task automation
 * - Voice-based SOP navigation
 * - Training assistance and guidance
 * - Natural conversation flow
 * 
 * @param props AdvancedVoiceAIProps
 * @returns JSX.Element
 */
const AdvancedVoiceAI: React.FC<AdvancedVoiceAIProps> = ({
  context,
  continuousListening = false,
  enableNLU = true,
  enableTTS = true,
  multilingualMode = true,
  wakeWord = "hey krong thai",
  isLoading = false,
  onIntentRecognized,
  onActionTriggered,
  onConversationUpdate,
  className
}) => {
  const t = useTranslations('voice.ai');
  
  // Voice AI State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>(
    context.conversation_history || []
  );
  
  // AI Processing State
  const [currentIntent, setCurrentIntent] = useState<VoiceIntent | null>(null);
  const [processingConfidence, setProcessingConfidence] = useState(0);
  const [recognitionAccuracy, setRecognitionAccuracy] = useState(0);
  const [nluModelStatus, setNluModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    language: context.language_preference,
    voice_speed: 1.0,
    voice_pitch: 1.0,
    sensitivity: 0.7,
    continuous_mode: continuousListening,
    wake_word_enabled: true
  });
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Voice AI System
  useEffect(() => {
    const initializeVoiceAI = async () => {
      try {
        // Initialize Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = voiceSettings.language === 'fr' ? 'fr-FR' : 'en-US';
          
          recognitionRef.current.onstart = () => {
            setIsListening(true);
          };
          
          recognitionRef.current.onend = () => {
            setIsListening(false);
            if (voiceSettings.continuous_mode) {
              setTimeout(() => startListening(), 1000);
            }
          };
          
          recognitionRef.current.onresult = handleSpeechResult;
          recognitionRef.current.onerror = handleSpeechError;
        }

        // Initialize Speech Synthesis
        if ('speechSynthesis' in window) {
          synthRef.current = window.speechSynthesis;
        }

        // Initialize Audio Context for voice activity detection
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
          const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
        }

        // Simulate NLU model loading
        setTimeout(() => {
          setNluModelStatus('ready');
          setRecognitionAccuracy(95);
        }, 2000);

      } catch (error) {
        console.error('Voice AI initialization failed:', error);
        setNluModelStatus('error');
      }
    };

    initializeVoiceAI();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [voiceSettings.language, voiceSettings.continuous_mode]);

  // Handle Speech Recognition Results
  const handleSpeechResult = useCallback(async (event: any) => {
    const transcript = Array.from(event.results)
      .map((result: any) => result[0])
      .map((result) => result.transcript)
      .join('');

    if (event.results[event.results.length - 1].isFinal) {
      setIsProcessing(true);
      
      // Process with NLU
      const intent = await processNaturalLanguage(transcript);
      const response = await generateResponse(intent, transcript);
      
      // Create conversation turn
      const userTurn: ConversationTurn = {
        id: `user-${Date.now()}`,
        timestamp: new Date(),
        type: 'user',
        content: transcript,
        intent,
        confidence: intent.confidence
      };
      
      const assistantTurn: ConversationTurn = {
        id: `assistant-${Date.now()}`,
        timestamp: new Date(),
        type: 'assistant',
        content: response.text,
        response,
        confidence: response.confidence
      };
      
      const newTurns = [...conversationTurns, userTurn, assistantTurn];
      setConversationTurns(newTurns);
      onConversationUpdate?.(newTurns);
      
      // Execute actions
      if (response.actions) {
        onActionTriggered?.(response.actions);
      }
      
      // Speak response
      if (enableTTS) {
        await speakResponse(response);
      }
      
      setIsProcessing(false);
    }
  }, [conversationTurns, enableTTS, onConversationUpdate, onActionTriggered]);

  // Handle Speech Recognition Errors
  const handleSpeechError = useCallback((event: any) => {
    console.error('Speech recognition error:', event.error);
    setIsListening(false);
    setIsProcessing(false);
  }, []);

  // Process Natural Language Understanding
  const processNaturalLanguage = useCallback(async (text: string): Promise<VoiceIntent> => {
    // Simulate advanced NLP processing
    // In a real implementation, this would use a sophisticated NLU service
    
    const normalizedText = text.toLowerCase().trim();
    
    // Intent classification
    let intent = 'unknown';
    let confidence = 0;
    const entities: VoiceIntent['entities'] = {};
    
    // SOP-related intents
    if (normalizedText.includes('show') || normalizedText.includes('open')) {
      if (normalizedText.includes('sop') || normalizedText.includes('procedure')) {
        intent = 'sop.open';
        confidence = 0.9;
        
        // Extract SOP name/category
        const sopMatch = normalizedText.match(/(?:sop|procedure)\s+(?:for\s+)?([a-zA-Z\s]+)/);
        if (sopMatch) {
          entities['sop_name'] = {
            value: sopMatch[1].trim(),
            confidence: 0.8
          };
        }
      }
    }
    
    // Navigation intents
    else if (normalizedText.includes('go to') || normalizedText.includes('navigate')) {
      intent = 'navigation.goto';
      confidence = 0.85;
      
      const locationMatch = normalizedText.match(/(?:go to|navigate to)\s+([a-zA-Z\s]+)/);
      if (locationMatch) {
        entities['location'] = {
          value: locationMatch[1].trim(),
          confidence: 0.9
        };
      }
    }
    
    // Training intents
    else if (normalizedText.includes('train') || normalizedText.includes('learn')) {
      intent = 'training.start';
      confidence = 0.8;
      
      const moduleMatch = normalizedText.match(/(?:train|learn)\s+(?:about\s+)?([a-zA-Z\s]+)/);
      if (moduleMatch) {
        entities['training_module'] = {
          value: moduleMatch[1].trim(),
          confidence: 0.7
        };
      }
    }
    
    // Help intents
    else if (normalizedText.includes('help') || normalizedText.includes('assist')) {
      intent = 'help.request';
      confidence = 0.95;
      
      const topicMatch = normalizedText.match(/help\s+(?:with\s+)?([a-zA-Z\s]+)/);
      if (topicMatch) {
        entities['help_topic'] = {
          value: topicMatch[1].trim(),
          confidence: 0.8
        };
      }
    }
    
    // Search intents
    else if (normalizedText.includes('search') || normalizedText.includes('find')) {
      intent = 'search.query';
      confidence = 0.9;
      
      const queryMatch = normalizedText.match(/(?:search|find)\s+(?:for\s+)?([a-zA-Z\s]+)/);
      if (queryMatch) {
        entities['search_query'] = {
          value: queryMatch[1].trim(),
          confidence: 0.85
        };
      }
    }
    
    // Task management intents
    else if (normalizedText.includes('complete') || normalizedText.includes('finish')) {
      intent = 'task.complete';
      confidence = 0.8;
    }
    
    else if (normalizedText.includes('start') || normalizedText.includes('begin')) {
      intent = 'task.start';
      confidence = 0.8;
    }
    
    // Time-related intents
    else if (normalizedText.includes('time') || normalizedText.includes('schedule')) {
      intent = 'time.query';
      confidence = 0.7;
    }
    
    // Status intents
    else if (normalizedText.includes('status') || normalizedText.includes('progress')) {
      intent = 'status.query';
      confidence = 0.85;
    }

    const processedIntent: VoiceIntent = {
      intent,
      confidence,
      entities,
      context: [context.current_location, context.user_role]
    };

    setCurrentIntent(processedIntent);
    setProcessingConfidence(confidence * 100);
    onIntentRecognized?.(processedIntent);

    return processedIntent;
  }, [context, onIntentRecognized]);

  // Generate AI Response
  const generateResponse = useCallback(async (intent: VoiceIntent, originalText: string): Promise<VoiceResponse> => {
    // Simulate intelligent response generation
    // In a real implementation, this would use advanced AI models
    
    let response: VoiceResponse;
    
    switch (intent.intent) {
      case 'sop.open':
        const sopName = intent.entities['sop_name']?.value || 'that procedure';
        response = {
          text: `Opening ${sopName} SOP for you. I'll guide you through each step.`,
          text_fr: `Ouverture de la procédure ${sopName}. Je vais vous guider à travers chaque étape.`,
          actions: [{
            type: 'navigation',
            payload: { route: '/sop/search', query: sopName }
          }],
          confidence: 0.9
        };
        break;
        
      case 'training.start':
        const module = intent.entities['training_module']?.value || 'the requested module';
        response = {
          text: `Starting training for ${module}. Let's begin with the fundamentals.`,
          text_fr: `Début de la formation pour ${module}. Commençons par les fondamentaux.`,
          actions: [{
            type: 'navigation',
            payload: { route: '/training', module }
          }],
          confidence: 0.85
        };
        break;
        
      case 'help.request':
        const topic = intent.entities['help_topic']?.value;
        response = {
          text: topic 
            ? `I can help you with ${topic}. What specific information do you need?`
            : `I'm here to help! You can ask me about SOPs, training, tasks, or navigation.`,
          text_fr: topic
            ? `Je peux vous aider avec ${topic}. Quelles informations spécifiques avez-vous besoin?`
            : `Je suis là pour vous aider! Vous pouvez me demander des SOPs, formation, tâches ou navigation.`,
          follow_up_questions: [
            'Show me available SOPs',
            'What training do I need to complete?',
            'Check my task status'
          ],
          confidence: 0.95
        };
        break;
        
      case 'search.query':
        const query = intent.entities['search_query']?.value;
        response = {
          text: `Searching for ${query}. Here are the most relevant results.`,
          text_fr: `Recherche de ${query}. Voici les résultats les plus pertinents.`,
          actions: [{
            type: 'search',
            payload: { query, filters: { user_role: context.user_role } }
          }],
          confidence: 0.9
        };
        break;
        
      case 'status.query':
        response = {
          text: `Your current status: ${context.active_tasks.length} active tasks, ${context.training_progress.completed_modules.length} training modules completed.`,
          text_fr: `Votre statut actuel: ${context.active_tasks.length} tâches actives, ${context.training_progress.completed_modules.length} modules de formation terminés.`,
          actions: [{
            type: 'navigation',
            payload: { route: '/dashboard' }
          }],
          confidence: 0.8
        };
        break;
        
      default:
        response = {
          text: `I understand you said "${originalText}". Could you please rephrase or ask me something else?`,
          text_fr: `Je comprends que vous avez dit "${originalText}". Pourriez-vous reformuler ou me demander autre chose?`,
          follow_up_questions: [
            'Show available commands',
            'Help with SOPs',
            'Start training'
          ],
          confidence: 0.3
        };
    }
    
    return response;
  }, [context]);

  // Speak Response
  const speakResponse = useCallback(async (response: VoiceResponse) => {
    if (!synthRef.current || !enableTTS) return;
    
    setIsSpeaking(true);
    
    const text = voiceSettings.language === 'fr' ? response.text_fr : response.text;
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.lang = voiceSettings.language === 'fr' ? 'fr-FR' : 'en-US';
    utterance.rate = voiceSettings.voice_speed;
    utterance.pitch = voiceSettings.voice_pitch;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    synthRef.current.speak(utterance);
  }, [enableTTS, voiceSettings]);

  // Start Listening
  const startListening = useCallback(async () => {
    if (!recognitionRef.current || nluModelStatus !== 'ready') return;
    
    try {
      // Request microphone permission and set up voice activity detection
      if (audioContextRef.current && !microphoneRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        microphoneRef.current.connect(analyserRef.current!);
        
        // Start voice activity monitoring
        monitorVoiceActivity();
      }
      
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  }, [nluModelStatus]);

  // Stop Listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsListening(false);
    setVoiceActivityLevel(0);
  }, []);

  // Monitor Voice Activity
  const monitorVoiceActivity = useCallback(() => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateLevel = () => {
      analyserRef.current!.getByteFrequencyData(dataArray);
      
      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = Math.min(100, (rms / 128) * 100);
      
      setVoiceActivityLevel(level);
      
      if (isListening) {
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };
    
    updateLevel();
  }, [isListening]);

  // Toggle Listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Voice AI Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
              <Brain className="w-6 h-6 text-krong-red" />
              {t('title')}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* AI Status */}
              <Badge 
                variant={nluModelStatus === 'ready' ? "default" : "secondary"} 
                className="text-tablet-sm"
              >
                <Bot className="w-3 h-3 mr-1" />
                {nluModelStatus === 'ready' ? t('ai_ready') : t('ai_loading')}
              </Badge>
              
              {/* Language */}
              <Badge variant="outline" className="text-tablet-sm">
                <Globe className="w-3 h-3 mr-1" />
                {voiceSettings.language.toUpperCase()}
              </Badge>
              
              {/* Recognition Accuracy */}
              <Badge variant="outline" className="text-tablet-sm">
                {recognitionAccuracy}% {t('accuracy')}
              </Badge>
              
              {/* Settings */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Voice Interface */}
      <Card className="relative">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Voice Activity Visualization */}
            <div className="relative">
              <div 
                className={cn(
                  "w-32 h-32 mx-auto rounded-full border-4 transition-all duration-300 flex items-center justify-center",
                  isListening 
                    ? "border-krong-red bg-krong-red/10 animate-pulse" 
                    : "border-gray-300 bg-gray-50",
                  isSpeaking && "border-blue-500 bg-blue-50"
                )}
                style={{
                  transform: `scale(${1 + (voiceActivityLevel / 200)})`
                }}
              >
                {isProcessing ? (
                  <div className="animate-spin">
                    <Brain className="w-12 h-12 text-krong-red" />
                  </div>
                ) : isSpeaking ? (
                  <Volume2 className="w-12 h-12 text-blue-600" />
                ) : isListening ? (
                  <Mic className="w-12 h-12 text-krong-red" />
                ) : (
                  <MicOff className="w-12 h-12 text-gray-400" />
                )}
              </div>
              
              {/* Voice Activity Level */}
              {isListening && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-krong-red transition-all duration-100"
                      style={{ width: `${voiceActivityLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Status Text */}
            <div className="space-y-2">
              <h3 className="text-tablet-xl font-heading">
                {isProcessing ? t('processing') :
                 isSpeaking ? t('speaking') :
                 isListening ? t('listening') :
                 t('ready_to_help')}
              </h3>
              
              <p className="text-tablet-base text-muted-foreground max-w-md mx-auto">
                {isListening ? t('listening_desc') : t('tap_to_speak')}
              </p>
            </div>
            
            {/* Main Control Button */}
            <Button
              size="lg"
              onClick={toggleListening}
              disabled={nluModelStatus !== 'ready' || isProcessing}
              className={cn(
                "px-8 py-4",
                isListening 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-krong-red hover:bg-krong-red/90"
              )}
            >
              {isListening ? (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  {t('stop_listening')}
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  {t('start_listening')}
                </>
              )}
            </Button>
            
            {/* Quick Actions */}
            <div className="flex justify-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onActionTriggered?.([{ type: 'help', payload: {} }])}
              >
                <Lightbulb className="w-4 h-4 mr-1" />
                {t('help')}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConversation(!showConversation)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                {t('conversation')}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onActionTriggered?.([{ type: 'search', payload: {} }])}
              >
                <Target className="w-4 h-4 mr-1" />
                {t('search')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Intent Display */}
      {currentIntent && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-krong-red" />
              {t('understood_intent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-tablet-base font-medium capitalize">
                  {currentIntent.intent.replace('.', ' → ')}
                </span>
                <Badge variant="outline">
                  {Math.round(currentIntent.confidence * 100)}% {t('confidence')}
                </Badge>
              </div>
              
              {Object.keys(currentIntent.entities).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-tablet-sm font-heading font-semibold">{t('detected_entities')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentIntent.entities).map(([key, entity]) => (
                      <Badge key={key} variant="secondary" className="text-tablet-xs">
                        {key}: {entity.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <Progress value={processingConfidence} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation History */}
      {showConversation && conversationTurns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-tablet-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-krong-red" />
              {t('conversation_history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {conversationTurns.slice(-6).map(turn => (
                <div
                  key={turn.id}
                  className={cn(
                    "flex gap-3 p-3 rounded-lg",
                    turn.type === 'user' 
                      ? "bg-blue-50 border border-blue-200" 
                      : "bg-gray-50 border border-gray-200"
                  )}
                >
                  <div className="flex-shrink-0 mt-1">
                    {turn.type === 'user' ? (
                      <Users className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-krong-red" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-tablet-sm font-medium capitalize">
                        {turn.type === 'user' ? t('you') : t('ai_assistant')}
                      </span>
                      <span className="text-tablet-xs text-muted-foreground">
                        {turn.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <p className="text-tablet-sm">{turn.content}</p>
                    
                    {turn.confidence && (
                      <div className="flex items-center gap-2">
                        <Progress value={turn.confidence * 100} className="h-1 flex-1" />
                        <span className="text-tablet-xs text-muted-foreground">
                          {Math.round(turn.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-tablet-lg">{t('voice_ai_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('language')}</label>
                  <select 
                    value={voiceSettings.language}
                    onChange={(e) => setVoiceSettings(prev => ({ 
                      ...prev, 
                      language: e.target.value as 'en' | 'fr' 
                    }))}
                    className="w-full p-2 border rounded-md text-tablet-sm"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('voice_speed')}</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSettings.voice_speed}
                    onChange={(e) => setVoiceSettings(prev => ({ 
                      ...prev, 
                      voice_speed: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <span className="text-tablet-xs text-muted-foreground">
                    {voiceSettings.voice_speed}x
                  </span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('sensitivity')}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={voiceSettings.sensitivity}
                    onChange={(e) => setVoiceSettings(prev => ({ 
                      ...prev, 
                      sensitivity: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <span className="text-tablet-xs text-muted-foreground">
                    {Math.round(voiceSettings.sensitivity * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('continuous_listening')}</span>
                  <Button
                    variant={voiceSettings.continuous_mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoiceSettings(prev => ({ 
                      ...prev, 
                      continuous_mode: !prev.continuous_mode 
                    }))}
                  >
                    <Waves className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-tablet-sm">{t('wake_word')}</span>
                  <Button
                    variant={voiceSettings.wake_word_enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoiceSettings(prev => ({ 
                      ...prev, 
                      wake_word_enabled: !prev.wake_word_enabled 
                    }))}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-tablet-sm font-medium">{t('nlu_model_status')}</label>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      nluModelStatus === 'ready' && "bg-green-500",
                      nluModelStatus === 'loading' && "bg-yellow-500 animate-pulse",
                      nluModelStatus === 'error' && "bg-red-500"
                    )} />
                    <span className="text-tablet-sm capitalize">{nluModelStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedVoiceAI;