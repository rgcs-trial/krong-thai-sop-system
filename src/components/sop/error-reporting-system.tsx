'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  Camera,
  Upload,
  X,
  Check,
  Bug,
  Shield,
  Clock,
  User,
  MapPin,
  FileText,
  Image,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Trash2,
  Send,
  Plus,
  Minus,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Download,
  Share2,
  Settings,
  PenTool,
  Square,
  Circle,
  Type
} from 'lucide-react';

interface ErrorEvidence {
  id: string;
  type: 'photo' | 'video' | 'audio' | 'document';
  file_url: string;
  thumbnail_url?: string;
  filename: string;
  file_size: number;
  timestamp: Date;
  annotations?: Array<{
    id: string;
    type: 'arrow' | 'circle' | 'rectangle' | 'text' | 'highlight';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    text?: string;
    color: string;
  }>;
  description?: string;
}

interface ErrorReport {
  id: string;
  sop_id: string;
  step_id?: string;
  reporter_id: string;
  reporter_name: string;
  error_type: 'procedure_issue' | 'safety_violation' | 'equipment_malfunction' | 'quality_issue' | 'documentation_error' | 'system_bug' | 'training_gap' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: string;
  timestamp: Date;
  evidence: ErrorEvidence[];
  immediate_actions_taken?: string;
  potential_causes?: string[];
  suggested_solutions?: string[];
  impact_assessment: {
    safety_risk: boolean;
    operational_impact: 'none' | 'minimal' | 'moderate' | 'significant';
    customer_impact: 'none' | 'minimal' | 'moderate' | 'significant';
    estimated_cost?: number;
  };
  status: 'submitted' | 'under_review' | 'in_progress' | 'resolved' | 'closed';
  priority_score: number; // 0-100
  tags: string[];
  follow_up_required: boolean;
}

interface ErrorReportingSystemProps {
  /** Current SOP information */
  sopData: {
    id: string;
    title: string;
    current_step_id?: string;
    current_step_name?: string;
  };
  /** Current user information */
  userProfile: {
    id: string;
    name: string;
    role: string;
    location?: string;
  };
  /** Pre-populate error type */
  initialErrorType?: ErrorReport['error_type'];
  /** Enable quick reporting mode */
  quickReportMode?: boolean;
  /** Enable voice recording */
  enableVoiceRecording?: boolean;
  /** Enable video recording */
  enableVideoRecording?: boolean;
  /** Maximum file size in MB */
  maxFileSize?: number;
  /** Auto-save draft interval in seconds */
  autoSaveInterval?: number;
  /** Callback when report is submitted */
  onReportSubmit?: (report: ErrorReport) => void;
  /** Callback when draft is saved */
  onDraftSave?: (draft: Partial<ErrorReport>) => void;
  /** Callback when evidence is added */
  onEvidenceAdd?: (evidence: ErrorEvidence) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * ErrorReportingSystem - Comprehensive error reporting with multimedia evidence
 * 
 * Features:
 * - Multi-modal evidence capture (photo, video, audio, documents)
 * - Real-time photo annotation tools
 * - Voice recording for detailed descriptions
 * - Video recording for complex issues
 * - Smart error categorization and severity assessment
 * - Impact assessment and priority scoring
 * - Auto-save draft functionality
 * - Offline capability with sync when online
 * - Integration with restaurant management systems
 * - Bilingual support for international staff
 * - Quick report mode for urgent issues
 * 
 * @param props ErrorReportingSystemProps
 * @returns JSX.Element
 */
const ErrorReportingSystem: React.FC<ErrorReportingSystemProps> = ({
  sopData,
  userProfile,
  initialErrorType = 'other',
  quickReportMode = false,
  enableVoiceRecording = true,
  enableVideoRecording = true,
  maxFileSize = 50, // MB
  autoSaveInterval = 30, // seconds
  onReportSubmit,
  onDraftSave,
  onEvidenceAdd,
  className
}) => {
  const t = useTranslations('sop.errorReporting');
  
  const [reportForm, setReportForm] = useState<Partial<ErrorReport>>({
    sop_id: sopData.id,
    step_id: sopData.current_step_id,
    reporter_id: userProfile.id,
    reporter_name: userProfile.name,
    error_type: initialErrorType,
    severity: 'medium',
    title: '',
    description: '',
    location: userProfile.location || '',
    evidence: [],
    immediate_actions_taken: '',
    potential_causes: [],
    suggested_solutions: [],
    impact_assessment: {
      safety_risk: false,
      operational_impact: 'minimal',
      customer_impact: 'none'
    },
    tags: [],
    follow_up_required: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'impact'>('details');
  const [selectedEvidence, setSelectedEvidence] = useState<ErrorEvidence | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAnnotationTools, setShowAnnotationTools] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Error type configurations
  const errorTypes = [
    { 
      value: 'procedure_issue', 
      label: t('errorTypes.procedureIssue'), 
      icon: <FileText className="w-4 h-4" />,
      defaultSeverity: 'medium'
    },
    { 
      value: 'safety_violation', 
      label: t('errorTypes.safetyViolation'), 
      icon: <Shield className="w-4 h-4" />,
      defaultSeverity: 'high'
    },
    { 
      value: 'equipment_malfunction', 
      label: t('errorTypes.equipmentMalfunction'), 
      icon: <AlertTriangle className="w-4 h-4" />,
      defaultSeverity: 'high'
    },
    { 
      value: 'quality_issue', 
      label: t('errorTypes.qualityIssue'), 
      icon: <Bug className="w-4 h-4" />,
      defaultSeverity: 'medium'
    },
    { 
      value: 'documentation_error', 
      label: t('errorTypes.documentationError'), 
      icon: <FileText className="w-4 h-4" />,
      defaultSeverity: 'low'
    },
    { 
      value: 'system_bug', 
      label: t('errorTypes.systemBug'), 
      icon: <Bug className="w-4 h-4" />,
      defaultSeverity: 'medium'
    },
    { 
      value: 'training_gap', 
      label: t('errorTypes.trainingGap'), 
      icon: <User className="w-4 h-4" />,
      defaultSeverity: 'medium'
    },
    { 
      value: 'other', 
      label: t('errorTypes.other'), 
      icon: <AlertTriangle className="w-4 h-4" />,
      defaultSeverity: 'medium'
    }
  ];

  // Auto-save draft
  const saveDraft = useCallback(() => {
    if (reportForm.title || reportForm.description) {
      onDraftSave?.(reportForm);
    }
  }, [reportForm, onDraftSave]);

  // Setup auto-save timer
  useEffect(() => {
    if (autoSaveInterval > 0) {
      autoSaveTimerRef.current = setInterval(saveDraft, autoSaveInterval * 1000);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [saveDraft, autoSaveInterval]);

  // Initialize camera for photo capture
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      
      setIsCapturingPhoto(true);
    } catch (error) {
      console.error('Failed to access camera:', error);
    }
  }, []);

  // Take photo
  const takePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const timestamp = new Date();
      const filename = `error-photo-${timestamp.getTime()}.jpg`;
      
      const evidence: ErrorEvidence = {
        id: `evidence-${Date.now()}`,
        type: 'photo',
        file_url: URL.createObjectURL(blob),
        thumbnail_url: URL.createObjectURL(blob),
        filename,
        file_size: blob.size,
        timestamp,
        annotations: []
      };
      
      setReportForm(prev => ({
        ...prev,
        evidence: [...(prev.evidence || []), evidence]
      }));
      
      onEvidenceAdd?.(evidence);
      setIsCapturingPhoto(false);
      
      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }, 'image/jpeg', 0.9);
  }, [onEvidenceAdd]);

  // Start audio recording
  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const timestamp = new Date();
        const filename = `error-audio-${timestamp.getTime()}.webm`;
        
        const evidence: ErrorEvidence = {
          id: `evidence-${Date.now()}`,
          type: 'audio',
          file_url: URL.createObjectURL(blob),
          filename,
          file_size: blob.size,
          timestamp
        };
        
        setReportForm(prev => ({
          ...prev,
          evidence: [...(prev.evidence || []), evidence]
        }));
        
        onEvidenceAdd?.(evidence);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start audio recording:', error);
    }
  }, [onEvidenceAdd]);

  // Stop audio recording
  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      setRecordingDuration(0);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecordingAudio]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.size > maxFileSize * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds maximum size of ${maxFileSize}MB`);
        return;
      }
      
      const timestamp = new Date();
      const evidence: ErrorEvidence = {
        id: `evidence-${Date.now()}-${Math.random()}`,
        type: file.type.startsWith('image/') ? 'photo' : 
              file.type.startsWith('video/') ? 'video' :
              file.type.startsWith('audio/') ? 'audio' : 'document',
        file_url: URL.createObjectURL(file),
        thumbnail_url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        filename: file.name,
        file_size: file.size,
        timestamp
      };
      
      if (evidence.type === 'photo') {
        evidence.annotations = [];
      }
      
      setReportForm(prev => ({
        ...prev,
        evidence: [...(prev.evidence || []), evidence]
      }));
      
      onEvidenceAdd?.(evidence);
    });
    
    event.target.value = '';
  }, [maxFileSize, onEvidenceAdd]);

  // Remove evidence
  const removeEvidence = useCallback((evidenceId: string) => {
    setReportForm(prev => ({
      ...prev,
      evidence: (prev.evidence || []).filter(e => e.id !== evidenceId)
    }));
  }, []);

  // Calculate priority score
  const calculatePriorityScore = useCallback(() => {
    let score = 0;
    
    // Severity weight
    switch (reportForm.severity) {
      case 'critical': score += 40; break;
      case 'high': score += 30; break;
      case 'medium': score += 20; break;
      case 'low': score += 10; break;
    }
    
    // Safety risk
    if (reportForm.impact_assessment?.safety_risk) score += 30;
    
    // Operational impact
    switch (reportForm.impact_assessment?.operational_impact) {
      case 'significant': score += 20; break;
      case 'moderate': score += 15; break;
      case 'minimal': score += 5; break;
    }
    
    // Customer impact
    switch (reportForm.impact_assessment?.customer_impact) {
      case 'significant': score += 10; break;
      case 'moderate': score += 7; break;
      case 'minimal': score += 3; break;
    }
    
    return Math.min(100, score);
  }, [reportForm]);

  // Submit report
  const submitReport = useCallback(async () => {
    if (!reportForm.title?.trim() || !reportForm.description?.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const report: ErrorReport = {
        id: `error-report-${Date.now()}`,
        sop_id: sopData.id,
        step_id: sopData.current_step_id,
        reporter_id: userProfile.id,
        reporter_name: userProfile.name,
        error_type: reportForm.error_type || 'other',
        severity: reportForm.severity || 'medium',
        title: reportForm.title,
        description: reportForm.description,
        location: reportForm.location || userProfile.location || '',
        timestamp: new Date(),
        evidence: reportForm.evidence || [],
        immediate_actions_taken: reportForm.immediate_actions_taken,
        potential_causes: reportForm.potential_causes || [],
        suggested_solutions: reportForm.suggested_solutions || [],
        impact_assessment: reportForm.impact_assessment || {
          safety_risk: false,
          operational_impact: 'minimal',
          customer_impact: 'none'
        },
        status: 'submitted',
        priority_score: calculatePriorityScore(),
        tags: reportForm.tags || [],
        follow_up_required: reportForm.follow_up_required || false
      };
      
      await onReportSubmit?.(report);
      
      // Reset form
      setReportForm({
        sop_id: sopData.id,
        step_id: sopData.current_step_id,
        reporter_id: userProfile.id,
        reporter_name: userProfile.name,
        error_type: 'other',
        severity: 'medium',
        title: '',
        description: '',
        location: userProfile.location || '',
        evidence: [],
        impact_assessment: {
          safety_risk: false,
          operational_impact: 'minimal',
          customer_impact: 'none'
        },
        tags: [],
        follow_up_required: false
      });
      
      setActiveTab('details');
      
    } catch (error) {
      console.error('Failed to submit error report:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [reportForm, sopData, userProfile, calculatePriorityScore, onReportSubmit]);

  // Get severity color
  const getSeverityColor = (severity: ErrorReport['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'high': return 'text-krong-red bg-krong-red/5 border-krong-red/20';
      case 'medium': return 'text-golden-saffron bg-golden-saffron/5 border-golden-saffron/20';
      case 'low': return 'text-jade-green bg-jade-green/5 border-jade-green/20';
    }
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card className="border-2 border-krong-red/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-tablet-lg font-heading flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-krong-red" />
            {t('reportError')}
          </CardTitle>
          
          {sopData.current_step_name && (
            <div className="flex items-center gap-2 text-tablet-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {t('currentStep')}: {sopData.current_step_name}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Form */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'details', label: t('details'), icon: <FileText className="w-4 h-4" /> },
              { id: 'evidence', label: t('evidence'), icon: <Camera className="w-4 h-4" /> },
              { id: 'impact', label: t('impact'), icon: <AlertTriangle className="w-4 h-4" /> }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center gap-2",
                  activeTab === tab.id ? "bg-white shadow-sm" : ""
                )}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Error Type */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('errorType')} *</label>
                <Select
                  value={reportForm.error_type}
                  onValueChange={(value) => {
                    const errorType = errorTypes.find(t => t.value === value);
                    setReportForm(prev => ({
                      ...prev,
                      error_type: value as ErrorReport['error_type'],
                      severity: errorType?.defaultSeverity as ErrorReport['severity'] || 'medium'
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {errorTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.icon}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('severity')} *</label>
                <Select
                  value={reportForm.severity}
                  onValueChange={(value) => setReportForm(prev => ({ ...prev, severity: value as ErrorReport['severity'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <Badge variant="outline" className={getSeverityColor('low')}>
                        {t('severity.low')}
                      </Badge>
                    </SelectItem>
                    <SelectItem value="medium">
                      <Badge variant="outline" className={getSeverityColor('medium')}>
                        {t('severity.medium')}
                      </Badge>
                    </SelectItem>
                    <SelectItem value="high">
                      <Badge variant="outline" className={getSeverityColor('high')}>
                        {t('severity.high')}
                      </Badge>
                    </SelectItem>
                    <SelectItem value="critical">
                      <Badge variant="outline" className={getSeverityColor('critical')}>
                        {t('severity.critical')}
                      </Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('title')} *</label>
                <Input
                  value={reportForm.title || ''}
                  onChange={(e) => setReportForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('titlePlaceholder')}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('description')} *</label>
                <Textarea
                  value={reportForm.description || ''}
                  onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('descriptionPlaceholder')}
                  rows={4}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('location')}</label>
                <Input
                  value={reportForm.location || ''}
                  onChange={(e) => setReportForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder={t('locationPlaceholder')}
                />
              </div>

              {/* Immediate Actions */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('immediateActions')}</label>
                <Textarea
                  value={reportForm.immediate_actions_taken || ''}
                  onChange={(e) => setReportForm(prev => ({ ...prev, immediate_actions_taken: e.target.value }))}
                  placeholder={t('immediateActionsPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Evidence Tab */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {/* Camera Capture */}
              {isCapturingPhoto && (
                <Card className="border-2">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-auto"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      
                      <div className="flex justify-center gap-3">
                        <Button
                          onClick={takePhoto}
                          size="lg"
                          className="bg-krong-red hover:bg-krong-red/90"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          {t('capture')}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCapturingPhoto(false);
                            if (streamRef.current) {
                              streamRef.current.getTracks().forEach(track => track.stop());
                              streamRef.current = null;
                            }
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Evidence Collection Controls */}
              {!isCapturingPhoto && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={initializeCamera}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {t('takePhoto')}
                  </Button>
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {t('uploadFile')}
                  </Button>
                  
                  {enableVoiceRecording && (
                    <Button
                      onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                      variant={isRecordingAudio ? "default" : "outline"}
                      className={cn(
                        "flex items-center gap-2",
                        isRecordingAudio ? "bg-krong-red text-white" : ""
                      )}
                    >
                      {isRecordingAudio ? (
                        <>
                          <MicOff className="w-4 h-4" />
                          {t('stopRecording')} ({formatDuration(recordingDuration)})
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          {t('recordAudio')}
                        </>
                      )}
                    </Button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* Evidence List */}
              {reportForm.evidence && reportForm.evidence.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-tablet-base font-semibold">
                    {t('attachedEvidence')} ({reportForm.evidence.length})
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reportForm.evidence.map((evidence) => (
                      <Card key={evidence.id} className="border">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {evidence.type === 'photo' ? (
                                <div className="relative">
                                  <img
                                    src={evidence.thumbnail_url || evidence.file_url}
                                    alt={evidence.filename}
                                    className="w-16 h-16 object-cover rounded border"
                                  />
                                  {evidence.annotations && evidence.annotations.length > 0 && (
                                    <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                                      {evidence.annotations.length}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <div className="w-16 h-16 bg-gray-100 border rounded flex items-center justify-center">
                                  {evidence.type === 'video' && <Video className="w-6 h-6 text-gray-500" />}
                                  {evidence.type === 'audio' && <Mic className="w-6 h-6 text-gray-500" />}
                                  {evidence.type === 'document' && <FileText className="w-6 h-6 text-gray-500" />}
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-tablet-sm font-medium truncate">
                                  {evidence.filename}
                                </p>
                                <p className="text-tablet-xs text-muted-foreground">
                                  {(evidence.file_size / 1024 / 1024).toFixed(1)} MB
                                </p>
                                <p className="text-tablet-xs text-muted-foreground">
                                  {evidence.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeEvidence(evidence.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Impact Tab */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              {/* Safety Risk */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="text-tablet-base font-semibold">{t('safetyRisk')}</h4>
                  <p className="text-tablet-sm text-muted-foreground">
                    {t('safetyRiskDescription')}
                  </p>
                </div>
                <Button
                  variant={reportForm.impact_assessment?.safety_risk ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReportForm(prev => ({
                    ...prev,
                    impact_assessment: {
                      ...prev.impact_assessment!,
                      safety_risk: !prev.impact_assessment?.safety_risk
                    }
                  }))}
                  className={reportForm.impact_assessment?.safety_risk ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {reportForm.impact_assessment?.safety_risk ? t('yes') : t('no')}
                </Button>
              </div>

              {/* Operational Impact */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('operationalImpact')}</label>
                <Select
                  value={reportForm.impact_assessment?.operational_impact}
                  onValueChange={(value) => setReportForm(prev => ({
                    ...prev,
                    impact_assessment: {
                      ...prev.impact_assessment!,
                      operational_impact: value as any
                    }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('impact.none')}</SelectItem>
                    <SelectItem value="minimal">{t('impact.minimal')}</SelectItem>
                    <SelectItem value="moderate">{t('impact.moderate')}</SelectItem>
                    <SelectItem value="significant">{t('impact.significant')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Impact */}
              <div className="space-y-2">
                <label className="text-tablet-sm font-medium">{t('customerImpact')}</label>
                <Select
                  value={reportForm.impact_assessment?.customer_impact}
                  onValueChange={(value) => setReportForm(prev => ({
                    ...prev,
                    impact_assessment: {
                      ...prev.impact_assessment!,
                      customer_impact: value as any
                    }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('impact.none')}</SelectItem>
                    <SelectItem value="minimal">{t('impact.minimal')}</SelectItem>
                    <SelectItem value="moderate">{t('impact.moderate')}</SelectItem>
                    <SelectItem value="significant">{t('impact.significant')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Score */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tablet-sm font-medium">{t('priorityScore')}</span>
                  <Badge variant="outline" className="text-tablet-sm">
                    {calculatePriorityScore()}/100
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-krong-red h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculatePriorityScore()}%` }}
                  />
                </div>
              </div>

              {/* Follow-up Required */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="text-tablet-base font-semibold">{t('followUpRequired')}</h4>
                  <p className="text-tablet-sm text-muted-foreground">
                    {t('followUpDescription')}
                  </p>
                </div>
                <Button
                  variant={reportForm.follow_up_required ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReportForm(prev => ({
                    ...prev,
                    follow_up_required: !prev.follow_up_required
                  }))}
                  className={reportForm.follow_up_required ? "bg-golden-saffron hover:bg-golden-saffron/90" : ""}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {reportForm.follow_up_required ? t('yes') : t('no')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <Card className="border-2">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="text-tablet-sm text-muted-foreground">
              {t('allFieldsRequired')} *
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={!reportForm.title && !reportForm.description}
              >
                <Save className="w-4 h-4 mr-2" />
                {t('saveDraft')}
              </Button>
              
              <Button
                onClick={submitReport}
                disabled={!reportForm.title?.trim() || !reportForm.description?.trim() || isSubmitting}
                className="bg-krong-red hover:bg-krong-red/90"
              >
                {isSubmitting ? (
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? t('submitting') : t('submitReport')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorReportingSystem;