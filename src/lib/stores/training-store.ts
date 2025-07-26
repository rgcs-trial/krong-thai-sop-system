/**
 * Training Store for Restaurant Krong Thai SOP Management System
 * Zustand store for managing training progress, assessments, and certificates
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  TrainingModule,
  TrainingSection,
  UserTrainingProgress,
  UserSectionProgress,
  TrainingAssessment,
  TrainingCertificate,
  TrainingQuestion,
  TrainingQuestionResponse,
  TrainingStatus,
  AssessmentStatus,
  QuestionType,
  TrainingDashboardStats,
  StartTrainingRequest,
  UpdateTrainingProgressRequest,
  SubmitAssessmentRequest,
  AssessmentResponse,
} from '@/types/database';

// Training state interface
export interface TrainingState {
  // Current training session
  currentModule: TrainingModule | null;
  currentSection: TrainingSection | null;
  currentProgress: UserTrainingProgress | null;
  sessionStartTime: Date | null;
  
  // Training data
  modules: TrainingModule[];
  userProgress: Record<string, UserTrainingProgress>; // moduleId -> progress
  sectionProgress: Record<string, UserSectionProgress[]>; // progressId -> sections
  
  // Assessment state
  currentAssessment: TrainingAssessment | null;
  assessmentQuestions: TrainingQuestion[];
  userResponses: Record<string, TrainingQuestionResponse>; // questionId -> response
  assessmentTimer: Date | null;
  
  // Certificates
  certificates: TrainingCertificate[];
  
  // Dashboard stats
  dashboardStats: TrainingDashboardStats | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingModules: boolean;
  isLoadingProgress: boolean;
  isLoadingAssessment: boolean;
  
  // Error handling
  error: string | null;
  assessmentError: string | null;
  
  // Gamification
  totalPoints: number;
  achievements: string[];
  streak: number;
}

export interface TrainingActions {
  // Module management
  loadModules: () => Promise<void>;
  loadModule: (moduleId: string) => Promise<TrainingModule | null>;
  searchModules: (query: string, filters?: any) => Promise<TrainingModule[]>;
  
  // Training session management
  startTraining: (moduleId: string) => Promise<boolean>;
  resumeTraining: (progressId: string) => Promise<boolean>;
  pauseTraining: () => void;
  endTraining: () => void;
  
  // Section navigation
  navigateToSection: (sectionId: string) => Promise<boolean>;
  completeSection: (sectionId: string, timeSpent: number, notes?: string) => Promise<boolean>;
  getNextSection: () => TrainingSection | null;
  getPreviousSection: () => TrainingSection | null;
  
  // Progress tracking
  loadUserProgress: (userId?: string) => Promise<void>;
  updateProgress: (request: UpdateTrainingProgressRequest) => Promise<boolean>;
  calculateProgress: (moduleId: string) => number;
  
  // Assessment management
  startAssessment: (moduleId: string) => Promise<boolean>;
  loadAssessmentQuestions: (assessmentId: string) => Promise<void>;
  submitAnswer: (questionId: string, answer: string, timeSpent?: number) => void;
  submitAssessment: () => Promise<boolean>;
  retakeAssessment: (assessmentId: string) => Promise<boolean>;
  
  // Certificate management
  loadCertificates: (userId?: string) => Promise<void>;
  downloadCertificate: (certificateId: string) => Promise<string | null>;
  verifyCertificate: (certificateNumber: string) => Promise<TrainingCertificate | null>;
  
  // Analytics and reporting
  loadDashboardStats: () => Promise<void>;
  getModuleAnalytics: (moduleId: string) => Promise<any>;
  getUserAnalytics: (userId: string) => Promise<any>;
  
  // Gamification
  updateAchievements: () => Promise<void>;
  calculatePoints: () => number;
  updateStreak: () => void;
  
  // Utility actions
  setError: (error: string | null) => void;
  setAssessmentError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearCurrentSession: () => void;
  reset: () => void;
}

export type TrainingStore = TrainingState & TrainingActions;

// Initial state
const initialState: TrainingState = {
  currentModule: null,
  currentSection: null,
  currentProgress: null,
  sessionStartTime: null,
  modules: [],
  userProgress: {},
  sectionProgress: {},
  currentAssessment: null,
  assessmentQuestions: [],
  userResponses: {},
  assessmentTimer: null,
  certificates: [],
  dashboardStats: null,
  isLoading: false,
  isLoadingModules: false,
  isLoadingProgress: false,
  isLoadingAssessment: false,
  error: null,
  assessmentError: null,
  totalPoints: 0,
  achievements: [],
  streak: 0,
};

/**
 * Training Store
 */
export const useTrainingStore = create<TrainingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Module management
      loadModules: async (): Promise<void> => {
        set({ isLoadingModules: true, error: null });

        try {
          const response = await fetch('/api/training/modules');
          const result = await response.json();

          if (result.success) {
            set({ 
              modules: result.data || [],
              isLoadingModules: false 
            });
          } else {
            throw new Error(result.error || 'Failed to load training modules');
          }

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load modules',
            isLoadingModules: false,
          });
        }
      },

      loadModule: async (moduleId: string): Promise<TrainingModule | null> => {
        try {
          const response = await fetch(`/api/training/modules/${moduleId}`);
          const result = await response.json();

          if (result.success && result.data) {
            // Update modules array with detailed data
            const modules = get().modules.map(module => 
              module.id === moduleId ? result.data : module
            );
            
            set({ modules });
            return result.data;
          }

          return null;

        } catch (error) {
          console.error('Error loading module:', error);
          return null;
        }
      },

      searchModules: async (query: string, filters?: any): Promise<TrainingModule[]> => {
        try {
          const params = new URLSearchParams({
            search: query,
            ...filters,
          });

          const response = await fetch(`/api/training/modules/search?${params}`);
          const result = await response.json();

          return result.success ? result.data || [] : [];

        } catch (error) {
          console.error('Error searching modules:', error);
          return [];
        }
      },

      // Training session management
      startTraining: async (moduleId: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
          // Load module details if not already loaded
          let module = get().modules.find(m => m.id === moduleId);
          if (!module) {
            module = await get().loadModule(moduleId);
            if (!module) {
              throw new Error('Module not found');
            }
          }

          // Start training session via API
          const response = await fetch('/api/training/progress/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ module_id: moduleId }),
          });

          const result = await response.json();

          if (result.success && result.data) {
            const progress = result.data;
            
            // Load sections
            const firstSection = module.sections?.[0] || null;
            
            set({
              currentModule: module,
              currentSection: firstSection,
              currentProgress: progress,
              sessionStartTime: new Date(),
              userProgress: {
                ...get().userProgress,
                [moduleId]: progress,
              },
              isLoading: false,
            });

            return true;
          } else {
            throw new Error(result.error || 'Failed to start training');
          }

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to start training',
            isLoading: false,
          });
          return false;
        }
      },

      resumeTraining: async (progressId: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/training/progress/${progressId}`);
          const result = await response.json();

          if (result.success && result.data) {
            const progress = result.data;
            const module = await get().loadModule(progress.module_id);
            
            if (module) {
              // Find current section
              const currentSection = progress.current_section_id 
                ? module.sections?.find(s => s.id === progress.current_section_id)
                : module.sections?.[0];

              set({
                currentModule: module,
                currentSection: currentSection || null,
                currentProgress: progress,
                sessionStartTime: new Date(),
                isLoading: false,
              });

              return true;
            }
          }

          throw new Error('Failed to resume training');

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to resume training',
            isLoading: false,
          });
          return false;
        }
      },

      pauseTraining: (): void => {
        const state = get();
        if (state.currentProgress && state.sessionStartTime) {
          const timeSpent = Math.round(
            (Date.now() - state.sessionStartTime.getTime()) / (1000 * 60)
          );

          // Update time spent
          set({
            currentProgress: {
              ...state.currentProgress,
              time_spent_minutes: state.currentProgress.time_spent_minutes + timeSpent,
              last_accessed_at: new Date().toISOString(),
            },
            sessionStartTime: null,
          });

          // Optionally sync with server
          if (state.currentSection) {
            get().updateProgress({
              section_id: state.currentSection.id,
              time_spent_minutes: timeSpent,
            });
          }
        }
      },

      endTraining: (): void => {
        get().pauseTraining();
        set({
          currentModule: null,
          currentSection: null,
          currentProgress: null,
          sessionStartTime: null,
        });
      },

      // Section navigation
      navigateToSection: async (sectionId: string): Promise<boolean> => {
        const state = get();
        if (!state.currentModule || !state.currentProgress) return false;

        const section = state.currentModule.sections?.find(s => s.id === sectionId);
        if (!section) return false;

        // Update current section in progress
        try {
          const response = await fetch(`/api/training/progress/${state.currentProgress.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              current_section_id: sectionId,
            }),
          });

          if (response.ok) {
            set({
              currentSection: section,
              currentProgress: {
                ...state.currentProgress,
                current_section_id: sectionId,
              },
            });
            return true;
          }

          return false;

        } catch (error) {
          console.error('Error navigating to section:', error);
          return false;
        }
      },

      completeSection: async (sectionId: string, timeSpent: number, notes?: string): Promise<boolean> => {
        const state = get();
        if (!state.currentProgress) return false;

        try {
          const response = await fetch('/api/training/progress/section', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              progress_id: state.currentProgress.id,
              section_id: sectionId,
              time_spent_minutes: timeSpent,
              notes,
              is_completed: true,
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Update local state
            const progressId = state.currentProgress.id;
            const existingSectionProgress = get().sectionProgress[progressId] || [];
            
            set({
              sectionProgress: {
                ...get().sectionProgress,
                [progressId]: [
                  ...existingSectionProgress.filter(sp => sp.section_id !== sectionId),
                  result.data,
                ],
              },
            });

            // Recalculate overall progress
            const progressPercent = get().calculateProgress(state.currentProgress.module_id);
            
            set({
              currentProgress: {
                ...state.currentProgress,
                progress_percentage: progressPercent,
              },
            });

            return true;
          }

          return false;

        } catch (error) {
          console.error('Error completing section:', error);
          return false;
        }
      },

      getNextSection: (): TrainingSection | null => {
        const state = get();
        if (!state.currentModule || !state.currentSection) return null;

        const sections = state.currentModule.sections || [];
        const currentIndex = sections.findIndex(s => s.id === state.currentSection!.id);
        
        return currentIndex >= 0 && currentIndex < sections.length - 1 
          ? sections[currentIndex + 1] 
          : null;
      },

      getPreviousSection: (): TrainingSection | null => {
        const state = get();
        if (!state.currentModule || !state.currentSection) return null;

        const sections = state.currentModule.sections || [];
        const currentIndex = sections.findIndex(s => s.id === state.currentSection!.id);
        
        return currentIndex > 0 ? sections[currentIndex - 1] : null;
      },

      // Progress tracking
      loadUserProgress: async (userId?: string): Promise<void> => {
        set({ isLoadingProgress: true });

        try {
          const params = userId ? `?user_id=${userId}` : '';
          const response = await fetch(`/api/training/progress${params}`);
          const result = await response.json();

          if (result.success) {
            const progressArray = result.data || [];
            const progressMap: Record<string, UserTrainingProgress> = {};
            
            progressArray.forEach((progress: UserTrainingProgress) => {
              progressMap[progress.module_id] = progress;
            });

            set({ 
              userProgress: progressMap,
              isLoadingProgress: false 
            });
          }

        } catch (error) {
          console.error('Error loading user progress:', error);
          set({ isLoadingProgress: false });
        }
      },

      updateProgress: async (request: UpdateTrainingProgressRequest): Promise<boolean> => {
        const state = get();
        if (!state.currentProgress) return false;

        try {
          const response = await fetch('/api/training/progress/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              progress_id: state.currentProgress.id,
              ...request,
            }),
          });

          return response.ok;

        } catch (error) {
          console.error('Error updating progress:', error);
          return false;
        }
      },

      calculateProgress: (moduleId: string): number => {
        const state = get();
        const progress = state.userProgress[moduleId];
        if (!progress) return 0;

        const sectionProgressArray = state.sectionProgress[progress.id] || [];
        const module = state.modules.find(m => m.id === moduleId);
        
        if (!module || !module.sections) return 0;

        const requiredSections = module.sections.filter(s => s.is_required);
        const completedRequiredSections = sectionProgressArray.filter(sp => {
          const section = module.sections?.find(s => s.id === sp.section_id);
          return section?.is_required && sp.is_completed;
        });

        return requiredSections.length > 0 
          ? Math.round((completedRequiredSections.length / requiredSections.length) * 100)
          : 0;
      },

      // Assessment management
      startAssessment: async (moduleId: string): Promise<boolean> => {
        set({ isLoadingAssessment: true, assessmentError: null });

        try {
          const response = await fetch('/api/training/assessments/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ module_id: moduleId }),
          });

          const result = await response.json();

          if (result.success && result.data) {
            set({
              currentAssessment: result.data,
              assessmentTimer: new Date(),
              userResponses: {},
              isLoadingAssessment: false,
            });

            // Load questions
            await get().loadAssessmentQuestions(result.data.id);
            return true;
          } else {
            throw new Error(result.error || 'Failed to start assessment');
          }

        } catch (error) {
          set({
            assessmentError: error instanceof Error ? error.message : 'Failed to start assessment',
            isLoadingAssessment: false,
          });
          return false;
        }
      },

      loadAssessmentQuestions: async (assessmentId: string): Promise<void> => {
        try {
          const response = await fetch(`/api/training/assessments/${assessmentId}/questions`);
          const result = await response.json();

          if (result.success) {
            set({ assessmentQuestions: result.data || [] });
          }

        } catch (error) {
          console.error('Error loading assessment questions:', error);
        }
      },

      submitAnswer: (questionId: string, answer: string, timeSpent: number = 0): void => {
        const state = get();
        if (!state.currentAssessment) return;

        const response: TrainingQuestionResponse = {
          id: `temp-${questionId}`,
          assessment_id: state.currentAssessment.id,
          question_id: questionId,
          user_answer: answer,
          is_correct: false, // Will be determined by server
          points_earned: 0,
          time_spent_seconds: timeSpent,
          answered_at: new Date().toISOString(),
        };

        set({
          userResponses: {
            ...state.userResponses,
            [questionId]: response,
          },
        });
      },

      submitAssessment: async (): Promise<boolean> => {
        const state = get();
        if (!state.currentAssessment) return false;

        set({ isLoadingAssessment: true, assessmentError: null });

        try {
          const responses: AssessmentResponse[] = Object.values(state.userResponses).map(response => ({
            question_id: response.question_id,
            user_answer: response.user_answer || '',
            time_spent_seconds: response.time_spent_seconds,
          }));

          const response = await fetch('/api/training/assessments/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assessment_id: state.currentAssessment.id,
              responses,
            }),
          });

          const result = await response.json();

          if (result.success) {
            set({
              currentAssessment: result.data,
              isLoadingAssessment: false,
            });

            // Reload user progress
            await get().loadUserProgress();
            
            // Load certificates if assessment passed
            if (result.data.status === 'passed') {
              await get().loadCertificates();
            }

            return true;
          } else {
            throw new Error(result.error || 'Failed to submit assessment');
          }

        } catch (error) {
          set({
            assessmentError: error instanceof Error ? error.message : 'Failed to submit assessment',
            isLoadingAssessment: false,
          });
          return false;
        }
      },

      retakeAssessment: async (assessmentId: string): Promise<boolean> => {
        try {
          const response = await fetch(`/api/training/assessments/${assessmentId}/retake`, {
            method: 'POST',
          });

          const result = await response.json();

          if (result.success && result.data) {
            set({
              currentAssessment: result.data,
              assessmentTimer: new Date(),
              userResponses: {},
            });

            return true;
          }

          return false;

        } catch (error) {
          console.error('Error retaking assessment:', error);
          return false;
        }
      },

      // Certificate management
      loadCertificates: async (userId?: string): Promise<void> => {
        try {
          const params = userId ? `?user_id=${userId}` : '';
          const response = await fetch(`/api/training/certificates${params}`);
          const result = await response.json();

          if (result.success) {
            set({ certificates: result.data || [] });
          }

        } catch (error) {
          console.error('Error loading certificates:', error);
        }
      },

      downloadCertificate: async (certificateId: string): Promise<string | null> => {
        try {
          const response = await fetch(`/api/training/certificates/${certificateId}/download`);
          
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            return url;
          }

          return null;

        } catch (error) {
          console.error('Error downloading certificate:', error);
          return null;
        }
      },

      verifyCertificate: async (certificateNumber: string): Promise<TrainingCertificate | null> => {
        try {
          const response = await fetch(`/api/training/certificates/verify/${certificateNumber}`);
          const result = await response.json();

          return result.success ? result.data : null;

        } catch (error) {
          console.error('Error verifying certificate:', error);
          return null;
        }
      },

      // Analytics and reporting
      loadDashboardStats: async (): Promise<void> => {
        try {
          const response = await fetch('/api/training/analytics/dashboard');
          const result = await response.json();

          if (result.success) {
            set({ dashboardStats: result.data });
          }

        } catch (error) {
          console.error('Error loading dashboard stats:', error);
        }
      },

      getModuleAnalytics: async (moduleId: string): Promise<any> => {
        try {
          const response = await fetch(`/api/training/analytics/modules/${moduleId}`);
          const result = await response.json();

          return result.success ? result.data : null;

        } catch (error) {
          console.error('Error loading module analytics:', error);
          return null;
        }
      },

      getUserAnalytics: async (userId: string): Promise<any> => {
        try {
          const response = await fetch(`/api/training/analytics/users/${userId}`);
          const result = await response.json();

          return result.success ? result.data : null;

        } catch (error) {
          console.error('Error loading user analytics:', error);
          return null;
        }
      },

      // Gamification
      updateAchievements: async (): Promise<void> => {
        try {
          const response = await fetch('/api/training/gamification/achievements');
          const result = await response.json();

          if (result.success) {
            set({ achievements: result.data || [] });
          }

        } catch (error) {
          console.error('Error loading achievements:', error);
        }
      },

      calculatePoints: (): number => {
        const state = get();
        let totalPoints = 0;

        // Points from completed modules
        Object.values(state.userProgress).forEach(progress => {
          if (progress.status === 'completed') {
            totalPoints += 100; // Base points for completion
          }
        });

        // Points from certificates
        state.certificates.forEach(cert => {
          if (cert.status === 'active') {
            totalPoints += 50; // Points for valid certificates
          }
        });

        return totalPoints;
      },

      updateStreak: (): void => {
        // Calculate learning streak based on consecutive days of activity
        // This would typically involve checking training activity dates
        const streak = 1; // Placeholder implementation
        set({ streak });
      },

      // Utility actions
      setError: (error: string | null): void => {
        set({ error });
      },

      setAssessmentError: (error: string | null): void => {
        set({ assessmentError: error });
      },

      setLoading: (loading: boolean): void => {
        set({ isLoading: loading });
      },

      clearCurrentSession: (): void => {
        set({
          currentModule: null,
          currentSection: null,
          currentProgress: null,
          sessionStartTime: null,
          currentAssessment: null,
          assessmentQuestions: [],
          userResponses: {},
          assessmentTimer: null,
        });
      },

      reset: (): void => {
        set({
          ...initialState,
          // Keep user-specific data
          userProgress: get().userProgress,
          certificates: get().certificates,
          totalPoints: get().totalPoints,
          achievements: get().achievements,
        });
      },
    }),
    {
      name: 'krong-thai-training',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        userProgress: state.userProgress,
        sectionProgress: state.sectionProgress,
        certificates: state.certificates,
        totalPoints: state.totalPoints,
        achievements: state.achievements,
        streak: state.streak,
      }),
    }
  )
);

/**
 * Training hooks for easier component integration
 */

// Hook to get training modules and session state
export const useTraining = () => {
  const store = useTrainingStore();
  
  return {
    modules: store.modules,
    currentModule: store.currentModule,
    currentSection: store.currentSection,
    currentProgress: store.currentProgress,
    isLoading: store.isLoading,
    error: store.error,
    loadModules: store.loadModules,
    startTraining: store.startTraining,
    resumeTraining: store.resumeTraining,
    endTraining: store.endTraining,
  };
};

// Hook for section navigation
export const useTrainingNavigation = () => {
  const store = useTrainingStore();
  
  return {
    currentSection: store.currentSection,
    navigateToSection: store.navigateToSection,
    completeSection: store.completeSection,
    getNextSection: store.getNextSection,
    getPreviousSection: store.getPreviousSection,
  };
};

// Hook for assessments
export const useTrainingAssessment = () => {
  const store = useTrainingStore();
  
  return {
    currentAssessment: store.currentAssessment,
    assessmentQuestions: store.assessmentQuestions,
    userResponses: store.userResponses,
    isLoadingAssessment: store.isLoadingAssessment,
    assessmentError: store.assessmentError,
    startAssessment: store.startAssessment,
    submitAnswer: store.submitAnswer,
    submitAssessment: store.submitAssessment,
    retakeAssessment: store.retakeAssessment,
  };
};

// Hook for progress tracking
export const useTrainingProgress = () => {
  const store = useTrainingStore();
  
  return {
    userProgress: store.userProgress,
    sectionProgress: store.sectionProgress,
    calculateProgress: store.calculateProgress,
    loadUserProgress: store.loadUserProgress,
    updateProgress: store.updateProgress,
  };
};

// Hook for certificates
export const useTrainingCertificates = () => {
  const store = useTrainingStore();
  
  return {
    certificates: store.certificates,
    loadCertificates: store.loadCertificates,
    downloadCertificate: store.downloadCertificate,
    verifyCertificate: store.verifyCertificate,
  };
};

// Hook for gamification
export const useTrainingGamification = () => {
  const store = useTrainingStore();
  
  return {
    totalPoints: store.totalPoints,
    achievements: store.achievements,
    streak: store.streak,
    calculatePoints: store.calculatePoints,
    updateAchievements: store.updateAchievements,
  };
};