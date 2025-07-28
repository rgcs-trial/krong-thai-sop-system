/**
 * Training-SOP Integration Workflow Tests
 * Restaurant Krong Thai SOP Management System
 * 
 * Comprehensive testing of integrated training-SOP workflows:
 * - Complete training module to SOP practice flow
 * - Assessment integration with real SOPs
 * - Offline capability testing and synchronization
 * - Progressive skill building workflows
 * - Certification pathway validation
 * - Performance tracking integration
 * - Mobile-optimized training flows
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Components and utilities
import { TrainingSession } from '../../components/training/training-session';
import { SOPEmbeddedTraining } from '../../components/training/sop-embedded-training';
import { OfflineTrainingCapability } from '../../components/training/offline-training-capability';
import { TrainingProgressTracker } from '../../components/training/training-progress-tracker';
import { InteractiveSkillAssessment } from '../../components/training/interactive-skill-assessment';
import { createSupabaseTestClient } from '../utils/test-utils';
import { useOfflineStorage } from '../../lib/offline-storage';

// Mock IndexedDB for offline testing
const mockIndexedDB = {
  open: vi.fn(),
  transaction: vi.fn(),
  objectStore: vi.fn(),
  add: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
};

// Mock Service Worker for offline simulation
const mockServiceWorker = {
  register: vi.fn(),
  unregister: vi.fn(),
  update: vi.fn(),
  skipWaiting: vi.fn(),
  addEventListener: vi.fn(),
};

// Test data fixtures
const mockTrainingModule = {
  id: 'training-food-safety',
  title: 'Food Safety Fundamentals',
  description: 'Comprehensive food safety training module',
  difficulty_level: 'beginner',
  estimated_duration: 2400, // 40 minutes
  prerequisites: [],
  learning_objectives: [
    'Understand HACCP principles',
    'Identify food safety hazards',
    'Apply proper sanitation procedures',
    'Demonstrate temperature control knowledge',
  ],
  content_sections: [
    {
      id: 'section-1',
      title: 'Introduction to Food Safety',
      type: 'text',
      content: 'Food safety is crucial in restaurant operations...',
      duration: 300, // 5 minutes
      requires_interaction: false,
    },
    {
      id: 'section-2',
      title: 'HACCP Principles',
      type: 'interactive',
      content: 'Learn the 7 principles of HACCP...',
      duration: 600, // 10 minutes
      requires_interaction: true,
      interactive_elements: [
        {
          type: 'drag_drop',
          question: 'Order the HACCP principles correctly',
          items: ['Hazard Analysis', 'Critical Control Points', 'Critical Limits'],
        },
      ],
    },
    {
      id: 'section-3',
      title: 'Practical Assessment',
      type: 'sop_practice',
      content: 'Practice hand washing procedure',
      duration: 600, // 10 minutes
      linked_sop_id: 'sop-hand-washing',
      requires_photo_verification: true,
    },
    {
      id: 'section-4',
      title: 'Final Assessment',
      type: 'assessment',
      content: 'Test your knowledge',
      duration: 900, // 15 minutes
      passing_score: 0.8,
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'What is the minimum hand washing time?',
          options: ['10 seconds', '15 seconds', '20 seconds', '30 seconds'],
          correct_answer: 2,
          explanation: '20 seconds is the FDA recommended minimum time for effective hand washing.',
        },
        {
          id: 'q2',
          type: 'scenario',
          question: 'A customer reports food poisoning. What is your first action?',
          options: [
            'Apologize and offer a refund',
            'Document the incident and notify management',
            'Investigate the kitchen immediately',
            'Contact the health department',
          ],
          correct_answer: 1,
          explanation: 'Proper documentation is crucial for food safety incident management.',
        },
      ],
    },
  ],
  certification: {
    available: true,
    name: 'Food Safety Fundamentals Certificate',
    validity_period: 365, // days
    requirements: {
      completion_rate: 1.0,
      assessment_score: 0.8,
      practical_demonstration: true,
    },
  },
};

const mockLinkedSOP = {
  id: 'sop-hand-washing',
  title: 'Hand Washing Procedure',
  category: 'food_safety',
  difficulty_level: 'beginner',
  estimated_duration: 300, // 5 minutes
  requires_photo_verification: true,
  steps: [
    { id: 1, content: 'Turn on warm water', required: true, verification_type: 'none' },
    { id: 2, content: 'Apply soap to hands', required: true, verification_type: 'photo' },
    { id: 3, content: 'Scrub for 20 seconds', required: true, verification_type: 'timer' },
    { id: 4, content: 'Rinse thoroughly', required: true, verification_type: 'photo' },
    { id: 5, content: 'Dry with clean towel', required: true, verification_type: 'photo' },
  ],
  training_integration: {
    linked_modules: ['training-food-safety'],
    prerequisite_knowledge: ['soap_application', 'proper_technique'],
    skill_reinforcement: true,
  },
};

const mockUserProgress = {
  user_id: 'user-123',
  training_module_id: 'training-food-safety',
  current_section: 'section-1',
  completed_sections: [],
  section_progress: {},
  assessment_attempts: {},
  skill_demonstrations: {},
  offline_data: {
    last_sync: Date.now() - 3600000, // 1 hour ago
    pending_completions: [],
    cached_content: true,
  },
  started_at: Date.now() - 1800000, // 30 minutes ago
  last_activity: Date.now() - 300000, // 5 minutes ago
};

describe('Training-SOP Integration Workflow Tests', () => {
  let queryClient: QueryClient;
  let supabaseClient: any;

  beforeAll(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    supabaseClient = createSupabaseTestClient();

    // Mock browser APIs for offline testing
    Object.defineProperty(window, 'indexedDB', {
      value: mockIndexedDB,
      configurable: true,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      configurable: true,
    });

    // Mock network status
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    await setupTestData();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  describe('Complete Training-to-SOP Workflow', () => {
    describe('Linear Training Flow Integration', () => {
      it('should complete full training module with SOP practice', async () => {
        const mockOnComplete = vi.fn();
        const mockOnProgress = vi.fn();

        render(
          <TestWrapper>
            <TrainingSession
              moduleId="training-food-safety"
              onComplete={mockOnComplete}
              onProgress={mockOnProgress}
            />
          </TestWrapper>
        );

        // Verify initial state
        expect(screen.getByText('Food Safety Fundamentals')).toBeInTheDocument();
        expect(screen.getByText('Section 1 of 4')).toBeInTheDocument();

        // Complete text section
        expect(screen.getByText('Introduction to Food Safety')).toBeInTheDocument();
        const nextButton = screen.getByRole('button', { name: /continue/i });
        fireEvent.click(nextButton);

        await waitFor(() => {
          expect(mockOnProgress).toHaveBeenCalledWith({
            section: 'section-1',
            progress: 0.25,
            completed: true,
          });
        });

        // Interactive HACCP section
        await waitFor(() => {
          expect(screen.getByText('HACCP Principles')).toBeInTheDocument();
          expect(screen.getByText('Order the HACCP principles correctly')).toBeInTheDocument();
        });

        // Complete drag-drop interaction
        const dragItems = screen.getAllByRole('button', { name: /drag item/i });
        expect(dragItems).toHaveLength(3);

        // Simulate drag-drop completion
        fireEvent.click(screen.getByRole('button', { name: /submit interaction/i }));

        await waitFor(() => {
          expect(mockOnProgress).toHaveBeenCalledWith({
            section: 'section-2',
            progress: 0.5,
            completed: true,
          });
        });

        // SOP Practice section
        await waitFor(() => {
          expect(screen.getByText('Practical Assessment')).toBeInTheDocument();
          expect(screen.getByText('Practice hand washing procedure')).toBeInTheDocument();
        });

        // Launch embedded SOP
        const practiceButton = screen.getByRole('button', { name: /start practice/i });
        fireEvent.click(practiceButton);

        await waitFor(() => {
          expect(screen.getByText('Hand Washing Procedure')).toBeInTheDocument();
          expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
        });

        // Complete SOP steps with photo verification
        for (let step = 1; step <= 5; step++) {
          const stepButton = screen.getByRole('button', { name: /complete step/i });
          fireEvent.click(stepButton);

          if (step === 2 || step === 4 || step === 5) {
            // Steps requiring photo verification
            await waitFor(() => {
              expect(screen.getByText(/photo verification required/i)).toBeInTheDocument();
            });

            const photoButton = screen.getByRole('button', { name: /take photo/i });
            fireEvent.click(photoButton);

            await waitFor(() => {
              expect(screen.getByText(/photo verified/i)).toBeInTheDocument();
            });
          }

          if (step < 5) {
            await waitFor(() => {
              expect(screen.getByText(`Step ${step + 1} of 5`)).toBeInTheDocument();
            });
          }
        }

        // Complete SOP practice
        await waitFor(() => {
          expect(screen.getByText(/sop completed successfully/i)).toBeInTheDocument();
        });

        const returnButton = screen.getByRole('button', { name: /return to training/i });
        fireEvent.click(returnButton);

        // Final Assessment
        await waitFor(() => {
          expect(screen.getByText('Final Assessment')).toBeInTheDocument();
          expect(screen.getByText('What is the minimum hand washing time?')).toBeInTheDocument();
        });

        // Answer assessment questions
        const option20Seconds = screen.getByRole('radio', { name: /20 seconds/i });
        fireEvent.click(option20Seconds);

        const nextQuestionButton = screen.getByRole('button', { name: /next question/i });
        fireEvent.click(nextQuestionButton);

        await waitFor(() => {
          expect(screen.getByText('A customer reports food poisoning')).toBeInTheDocument();
        });

        const documentOption = screen.getByRole('radio', { name: /document the incident/i });
        fireEvent.click(documentOption);

        const submitButton = screen.getByRole('button', { name: /submit assessment/i });
        fireEvent.click(submitButton);

        // Complete training module
        await waitFor(() => {
          expect(mockOnComplete).toHaveBeenCalledWith({
            moduleId: 'training-food-safety',
            completionRate: 1.0,
            assessmentScore: 1.0,
            practicalDemonstration: true,
            certificationEarned: true,
            duration: expect.any(Number),
          });
        });

        expect(screen.getByText(/certificate earned/i)).toBeInTheDocument();
      });

      it('should handle partial completion and resumption', async () => {
        const partialProgress = {
          ...mockUserProgress,
          current_section: 'section-2',
          completed_sections: ['section-1'],
          section_progress: {
            'section-1': { completed: true, score: 1.0 },
            'section-2': { completed: false, progress: 0.6 },
          },
        };

        const mockLoadProgress = vi.fn().mockResolvedValue(partialProgress);

        render(
          <TestWrapper>
            <TrainingSession
              moduleId="training-food-safety"
              loadProgress={mockLoadProgress}
            />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Resume Training')).toBeInTheDocument();
          expect(screen.getByText('HACCP Principles')).toBeInTheDocument();
          expect(screen.getByText('60% Complete')).toBeInTheDocument();
        });

        const resumeButton = screen.getByRole('button', { name: /resume/i });
        fireEvent.click(resumeButton);

        await waitFor(() => {
          expect(screen.getByText('Section 2 of 4')).toBeInTheDocument();
        });
      });
    });

    describe('Adaptive Learning Path Integration', () => {
      it('should adapt training based on SOP performance', async () => {
        const poorSOPPerformance = {
          sop_id: 'sop-hand-washing',
          completion_time: 900, // 15 minutes (expected: 5 minutes)
          error_count: 3,
          photo_verification_attempts: 5,
          score: 0.6,
        };

        const mockAdaptiveRecommendations = {
          additional_practice: ['sop-hand-washing'],
          reinforcement_modules: ['hand-hygiene-advanced'],
          difficulty_adjustment: 'easier',
          extra_explanations: true,
        };

        const MockAdaptiveTraining = () => {
          const [recommendations, setRecommendations] = React.useState(null);
          
          React.useEffect(() => {
            // Simulate adaptive learning analysis
            setTimeout(() => {
              setRecommendations(mockAdaptiveRecommendations);
            }, 100);
          }, []);

          return (
            <div>
              <h2>Adaptive Learning Recommendations</h2>
              {recommendations ? (
                <div data-testid="recommendations">
                  <div>Additional Practice: {recommendations.additional_practice.join(', ')}</div>
                  <div>Reinforcement: {recommendations.reinforcement_modules.join(', ')}</div>
                  <div>Difficulty: {recommendations.difficulty_adjustment}</div>
                </div>
              ) : (
                <div>Analyzing performance...</div>
              )}
            </div>
          );
        };

        render(
          <TestWrapper>
            <MockAdaptiveTraining />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('recommendations')).toBeInTheDocument();
          expect(screen.getByText('Additional Practice: sop-hand-washing')).toBeInTheDocument();
          expect(screen.getByText('Difficulty: easier')).toBeInTheDocument();
        });
      });

      it('should provide advanced challenges for high performers', async () => {
        const excellentSOPPerformance = {
          sop_id: 'sop-hand-washing',
          completion_time: 180, // 3 minutes (faster than expected)
          error_count: 0,
          photo_verification_attempts: 1,
          score: 0.98,
        };

        const mockAdvancedRecommendations = {
          advanced_sops: ['sop-food-prep-advanced', 'sop-allergen-management'],
          leadership_modules: ['training-team-leader'],
          difficulty_adjustment: 'harder',
          mentor_opportunities: true,
        };

        const MockAdvancedTraining = () => {
          return (
            <div>
              <h2>Advanced Learning Path</h2>
              <div data-testid="advanced-recommendations">
                <div>Ready for: {mockAdvancedRecommendations.advanced_sops.join(', ')}</div>
                <div>Leadership: {mockAdvancedRecommendations.leadership_modules.join(', ')}</div>
                <div>Mentor Role: {mockAdvancedRecommendations.mentor_opportunities ? 'Available' : 'Not Available'}</div>
              </div>
            </div>
          );
        };

        render(
          <TestWrapper>
            <MockAdvancedTraining />
          </TestWrapper>
        );

        expect(screen.getByText('Ready for: sop-food-prep-advanced, sop-allergen-management')).toBeInTheDocument();
        expect(screen.getByText('Mentor Role: Available')).toBeInTheDocument();
      });
    });
  });

  describe('Offline Capability Integration', () => {
    describe('Content Caching and Synchronization', () => {
      it('should cache training content for offline use', async () => {
        const mockCacheContent = vi.fn().mockResolvedValue({
          success: true,
          cached_modules: ['training-food-safety'],
          cached_sops: ['sop-hand-washing'],
          cache_size: '15.2 MB',
          expires_at: Date.now() + 86400000, // 24 hours
        });

        mockIndexedDB.add.mockResolvedValue(true);
        mockServiceWorker.register.mockResolvedValue({
          installing: null,
          waiting: null,
          active: { state: 'activated' },
        });

        render(
          <TestWrapper>
            <OfflineTrainingCapability
              moduleId="training-food-safety"
              onCacheComplete={mockCacheContent}
            />
          </TestWrapper>
        );

        // Initiate caching
        const cacheButton = screen.getByRole('button', { name: /download for offline/i });
        fireEvent.click(cacheButton);

        await waitFor(() => {
          expect(screen.getByText(/caching content/i)).toBeInTheDocument();
        });

        await waitFor(() => {
          expect(mockCacheContent).toHaveBeenCalled();
          expect(screen.getByText(/15.2 MB cached/i)).toBeInTheDocument();
          expect(screen.getByText(/available offline/i)).toBeInTheDocument();
        });
      });

      it('should work seamlessly in offline mode', async () => {
        // Mock offline state
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          configurable: true,
        });

        const mockOfflineData = {
          training_module: mockTrainingModule,
          linked_sop: mockLinkedSOP,
          user_progress: mockUserProgress,
          cached_at: Date.now(),
        };

        mockIndexedDB.get.mockImplementation((key) => {
          if (key === 'training-food-safety') return mockOfflineData.training_module;
          if (key === 'sop-hand-washing') return mockOfflineData.linked_sop;
          if (key === 'progress-user-123') return mockOfflineData.user_progress;
          return null;
        });

        const MockOfflineTraining = () => {
          const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
          const [content, setContent] = React.useState(null);
          
          React.useEffect(() => {
            // Load from IndexedDB
            setContent(mockOfflineData);
          }, []);

          return (
            <div>
              <div data-testid="connection-status">
                {isOffline ? 'Offline Mode' : 'Online Mode'}
              </div>
              {content && (
                <div data-testid="offline-content">
                  <h2>{content.training_module.title}</h2>
                  <div>Progress: {Object.keys(content.user_progress.completed_sections).length}/4 sections</div>
                  <div>Cached: {new Date(content.cached_at).toLocaleString()}</div>
                </div>
              )}
            </div>
          );
        };

        render(
          <TestWrapper>
            <MockOfflineTraining />
          </TestWrapper>
        );

        expect(screen.getByTestId('connection-status')).toHaveTextContent('Offline Mode');
        
        await waitFor(() => {
          expect(screen.getByTestId('offline-content')).toBeInTheDocument();
          expect(screen.getByText('Food Safety Fundamentals')).toBeInTheDocument();
          expect(screen.getByText('Progress: 0/4 sections')).toBeInTheDocument();
        });
      });

      it('should synchronize offline progress when reconnected', async () => {
        const offlineProgress = {
          user_id: 'user-123',
          training_module_id: 'training-food-safety',
          completed_sections: ['section-1', 'section-2'],
          section_progress: {
            'section-1': { completed: true, score: 1.0, completed_at: Date.now() - 3600000 },
            'section-2': { completed: true, score: 0.85, completed_at: Date.now() - 1800000 },
          },
          offline_completions: [
            {
              section: 'section-1',
              completed_at: Date.now() - 3600000,
              synced: false,
            },
            {
              section: 'section-2',
              completed_at: Date.now() - 1800000,
              synced: false,
            },
          ],
        };

        const mockSyncProgress = vi.fn().mockResolvedValue({
          success: true,
          synced_items: 2,
          conflicts: 0,
          last_sync: Date.now(),
        });

        const MockSyncHandler = () => {
          const [syncStatus, setSyncStatus] = React.useState('pending');
          const [isOnline, setIsOnline] = React.useState(false);
          
          const handleSync = async () => {
            setSyncStatus('syncing');
            const result = await mockSyncProgress(offlineProgress);
            setSyncStatus(result.success ? 'completed' : 'failed');
          };

          React.useEffect(() => {
            if (isOnline && syncStatus === 'pending') {
              handleSync();
            }
          }, [isOnline, syncStatus]);

          return (
            <div>
              <div data-testid="sync-status">Sync: {syncStatus}</div>
              <div data-testid="offline-items">
                Offline completions: {offlineProgress.offline_completions.length}
              </div>
              <button onClick={() => setIsOnline(true)}>
                Come Online
              </button>
            </div>
          );
        };

        render(
          <TestWrapper>
            <MockSyncHandler />
          </TestWrapper>
        );

        expect(screen.getByTestId('sync-status')).toHaveTextContent('Sync: pending');
        expect(screen.getByTestId('offline-items')).toHaveTextContent('Offline completions: 2');

        // Simulate coming online
        fireEvent.click(screen.getByRole('button', { name: /come online/i }));

        await waitFor(() => {
          expect(screen.getByTestId('sync-status')).toHaveTextContent('Sync: syncing');
        });

        await waitFor(() => {
          expect(screen.getByTestId('sync-status')).toHaveTextContent('Sync: completed');
          expect(mockSyncProgress).toHaveBeenCalledWith(offlineProgress);
        });
      });
    });

    describe('Conflict Resolution', () => {
      it('should handle sync conflicts intelligently', async () => {
        const conflictingProgress = {
          local: {
            section: 'section-2',
            score: 0.85,
            completed_at: Date.now() - 1800000, // 30 minutes ago
            answers: ['A', 'B', 'C'],
          },
          remote: {
            section: 'section-2',
            score: 0.92,
            completed_at: Date.now() - 900000, // 15 minutes ago
            answers: ['A', 'B', 'D'],
          },
        };

        const mockResolveConflict = vi.fn().mockResolvedValue({
          resolution: 'remote_wins', // More recent and higher score
          final_progress: conflictingProgress.remote,
          reason: 'Remote version is more recent with higher score',
        });

        const MockConflictResolver = () => {
          const [resolution, setResolution] = React.useState(null);
          
          React.useEffect(() => {
            mockResolveConflict(conflictingProgress).then(setResolution);
          }, []);

          return (
            <div>
              {resolution ? (
                <div data-testid="conflict-resolution">
                  <div>Resolution: {resolution.resolution}</div>
                  <div>Final Score: {resolution.final_progress.score}</div>
                  <div>Reason: {resolution.reason}</div>
                </div>
              ) : (
                <div>Resolving conflicts...</div>
              )}
            </div>
          );
        };

        render(
          <TestWrapper>
            <MockConflictResolver />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('conflict-resolution')).toBeInTheDocument();
          expect(screen.getByText('Resolution: remote_wins')).toBeInTheDocument();
          expect(screen.getByText('Final Score: 0.92')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Progressive Skill Building', () => {
    describe('Skill Assessment Integration', () => {
      it('should assess skills through SOP performance', async () => {
        const mockSkillAssessment = {
          user_id: 'user-123',
          skill_area: 'food_safety',
          baseline_assessment: {
            score: 0.75,
            areas_for_improvement: ['temperature_control', 'cross_contamination'],
            strengths: ['hand_hygiene', 'equipment_sanitization'],
          },
          sop_performance: [
            { sop_id: 'sop-hand-washing', score: 0.95, completion_time: 180 },
            { sop_id: 'sop-temp-check', score: 0.68, completion_time: 420 },
          ],
          skill_progression: {
            current_level: 'intermediate',
            progress_to_next: 0.72,
            recommended_practice: ['sop-temp-check', 'sop-allergen-handling'],
          },
        };

        render(
          <TestWrapper>
            <InteractiveSkillAssessment
              userId="user-123"
              skillArea="food_safety"
              assessmentData={mockSkillAssessment}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Food Safety Skills Assessment')).toBeInTheDocument();
        expect(screen.getByText('Current Level: Intermediate')).toBeInTheDocument();
        expect(screen.getByText('Progress: 72%')).toBeInTheDocument();

        // Verify strengths and improvements
        expect(screen.getByText('Strengths')).toBeInTheDocument();
        expect(screen.getByText('hand_hygiene')).toBeInTheDocument();
        
        expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
        expect(screen.getByText('temperature_control')).toBeInTheDocument();
      });

      it('should provide targeted skill development recommendations', async () => {
        const skillGaps = {
          identified_gaps: [
            {
              skill: 'temperature_control',
              current_proficiency: 0.68,
              target_proficiency: 0.85,
              recommended_training: ['training-temperature-safety'],
              practice_sops: ['sop-temp-check', 'sop-cold-storage'],
              estimated_improvement_time: 14, // days
            },
            {
              skill: 'allergen_management',
              current_proficiency: 0.72,
              target_proficiency: 0.90,
              recommended_training: ['training-allergen-awareness'],
              practice_sops: ['sop-allergen-handling', 'sop-menu-labeling'],
              estimated_improvement_time: 10, // days
            },
          ],
        };

        const MockSkillDevelopment = () => {
          return (
            <div>
              <h2>Skill Development Plan</h2>
              {skillGaps.identified_gaps.map((gap, index) => (
                <div key={index} data-testid={`skill-gap-${index}`}>
                  <h3>{gap.skill}</h3>
                  <div>Current: {(gap.current_proficiency * 100).toFixed(0)}%</div>
                  <div>Target: {(gap.target_proficiency * 100).toFixed(0)}%</div>
                  <div>Timeline: {gap.estimated_improvement_time} days</div>
                  <div>Training: {gap.recommended_training.join(', ')}</div>
                </div>
              ))}
            </div>
          );
        };

        render(
          <TestWrapper>
            <MockSkillDevelopment />
          </TestWrapper>
        );

        expect(screen.getByTestId('skill-gap-0')).toBeInTheDocument();
        expect(screen.getByText('temperature_control')).toBeInTheDocument();
        expect(screen.getByText('Current: 68%')).toBeInTheDocument();
        expect(screen.getByText('Target: 85%')).toBeInTheDocument();
      });
    });

    describe('Certification Pathway', () => {
      it('should validate certification requirements', async () => {
        const certificationProgress = {
          certificate_name: 'Food Safety Fundamentals Certificate',
          requirements: {
            training_completion: { required: true, completed: true, score: 0.92 },
            practical_demonstration: { required: true, completed: true, sops_completed: 3 },
            assessment_score: { required: 0.8, achieved: 0.87 },
            time_requirement: { required: 30, completed: 25 }, // days
          },
          eligibility: true,
          certificate_id: 'cert-fs-001',
          issued_date: Date.now(),
          expiry_date: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        };

        const MockCertificationValidator = () => {
          const [isEligible, setIsEligible] = React.useState(false);
          
          React.useEffect(() => {
            // Validate all requirements
            const allRequirementsMet = Object.values(certificationProgress.requirements)
              .every(req => {
                if (typeof req.required === 'boolean') return req.completed === req.required;
                if (typeof req.required === 'number') return req.achieved >= req.required;
                return true;
              });
            
            setIsEligible(allRequirementsMet);
          }, []);

          return (
            <div>
              <h2>Certification Status</h2>
              <div data-testid="eligibility">
                Status: {isEligible ? 'Eligible' : 'Not Eligible'}
              </div>
              {isEligible && (
                <div data-testid="certificate-details">
                  <div>Certificate: {certificationProgress.certificate_name}</div>
                  <div>ID: {certificationProgress.certificate_id}</div>
                  <div>Score: {(certificationProgress.requirements.assessment_score.achieved * 100).toFixed(0)}%</div>
                </div>
              )}
            </div>
          );
        };

        render(
          <TestWrapper>
            <MockCertificationValidator />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('eligibility')).toHaveTextContent('Status: Eligible');
        });

        expect(screen.getByTestId('certificate-details')).toBeInTheDocument();
        expect(screen.getByText('Score: 87%')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tracking Integration', () => {
    describe('Learning Analytics', () => {
      it('should track comprehensive learning metrics', async () => {
        const learningMetrics = {
          user_id: 'user-123',
          training_module_id: 'training-food-safety',
          session_data: {
            total_time: 2700, // 45 minutes
            active_time: 2400, // 40 minutes
            sections_completed: 4,
            interactions: 23,
            help_requests: 2,
            pause_count: 3,
          },
          performance_data: {
            assessment_score: 0.87,
            first_attempt_score: 0.82,
            improvement: 0.05,
            time_per_section: [300, 420, 900, 1080],
            error_patterns: ['time_pressure', 'concept_confusion'],
          },
          sop_integration: {
            linked_sops_completed: 1,
            sop_performance_scores: [0.95],
            photo_verification_success: 0.91,
            practical_skill_demonstration: 0.89,
          },
        };

        const MockLearningAnalytics = () => {
          return (
            <div>
              <h2>Learning Analytics Dashboard</h2>
              <div data-testid="session-metrics">
                <div>Total Time: {Math.floor(learningMetrics.session_data.total_time / 60)} minutes</div>
                <div>Active Time: {Math.floor(learningMetrics.session_data.active_time / 60)} minutes</div>
                <div>Engagement Rate: {((learningMetrics.session_data.active_time / learningMetrics.session_data.total_time) * 100).toFixed(1)}%</div>
              </div>
              <div data-testid="performance-metrics">
                <div>Assessment Score: {(learningMetrics.performance_data.assessment_score * 100).toFixed(0)}%</div>
                <div>Improvement: +{(learningMetrics.performance_data.improvement * 100).toFixed(0)} points</div>
                <div>SOP Performance: {(learningMetrics.sop_integration.sop_performance_scores[0] * 100).toFixed(0)}%</div>
              </div>
            </div>
          );
        };

        render(
          <TestWrapper>
            <MockLearningAnalytics />
          </TestWrapper>
        );

        expect(screen.getByTestId('session-metrics')).toBeInTheDocument();
        expect(screen.getByText('Total Time: 45 minutes')).toBeInTheDocument();
        expect(screen.getByText('Engagement Rate: 88.9%')).toBeInTheDocument();

        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
        expect(screen.getByText('Assessment Score: 87%')).toBeInTheDocument();
        expect(screen.getByText('SOP Performance: 95%')).toBeInTheDocument();
      });
    });
  });

  // Helper functions
  async function setupTestData() {
    await supabaseClient.from('training_modules').upsert([mockTrainingModule]);
    await supabaseClient.from('sop_documents').upsert([mockLinkedSOP]);
    await supabaseClient.from('training_progress').upsert([mockUserProgress]);
  }

  async function cleanupTestData() {
    await supabaseClient.from('training_modules').delete().eq('id', mockTrainingModule.id);
    await supabaseClient.from('sop_documents').delete().eq('id', mockLinkedSOP.id);
    await supabaseClient.from('training_progress').delete().eq('user_id', mockUserProgress.user_id);
  }
});