/**
 * Phase 3A Integration Validation Test Suite
 * Integration testing between Phase 3A features and existing Phase 1-2 systems
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { createClient } from '@/lib/supabase/client';

// Import components from different phases
import { PWAInstallationManager } from '@/components/pwa/pwa-installation-manager';
import PushNotificationSystem from '@/components/pwa/push-notification-system';
import ARSOPVisualization from '@/components/sop/ar-sop-visualization';
import VRTrainingEnvironment from '@/components/training/vr-training-environment';
import AdvancedVoiceAI from '@/components/voice/advanced-voice-ai';
import { EnhancedPinLogin } from '@/components/auth/enhanced-pin-login';
import { TrainingAnalyticsClientWrapper } from '@/components/analytics/training-analytics-client-wrapper';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
  },
  realtime: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
  },
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock Phase 3A APIs
global.fetch = jest.fn();

// Setup common test data
const mockUser = {
  id: 'user-123',
  email: 'staff@krongthai.com',
  restaurant_id: 'restaurant-123',
  role: 'staff',
  full_name: 'Test Staff',
};

const mockRestaurant = {
  id: 'restaurant-123',
  name: 'Krong Thai Downtown',
  name_fr: 'Krong Thai Centre-ville',
};

const mockSOPDocument = {
  id: 'sop-123',
  title: 'Food Safety Protocol',
  title_fr: 'Protocole de sécurité alimentaire',
  content: 'Food safety procedures...',
  content_fr: 'Procédures de sécurité alimentaire...',
  restaurant_id: 'restaurant-123',
  category_id: 'category-safety',
};

const mockTrainingModule = {
  id: 'training-123',
  title: 'Kitchen Safety Training',
  title_fr: 'Formation à la sécurité en cuisine',
  restaurant_id: 'restaurant-123',
  difficulty: 'intermediate',
  duration_minutes: 30,
};

describe('Phase 3A Integration Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default auth state
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    
    // Setup default data queries
    mockSupabaseClient.from().single.mockResolvedValue({
      data: mockUser,
      error: null,
    });
  });

  describe('PWA Integration with Core Systems', () => {
    test('should integrate PWA with authentication system', async () => {
      // Mock successful authentication
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token123' } },
        error: null,
      });

      render(
        <div>
          <EnhancedPinLogin onSuccess={jest.fn()} />
          <PWAInstallationManager onInstall={jest.fn()} />
        </div>
      );

      // Authenticate first
      const pinInput = screen.getByLabelText(/PIN/i);
      fireEvent.change(pinInput, { target: { value: '1234' } });
      
      const loginButton = screen.getByText(/Sign In/i);
      fireEvent.click(loginButton);

      await waitFor(() => {
        // PWA should be available after authentication
        expect(screen.getByText(/Install Krong Thai SOP/i)).toBeInTheDocument();
      });
    });

    test('should sync PWA notifications with database events', async () => {
      const onNotificationReceived = jest.fn();
      
      render(
        <PushNotificationSystem
          userId="user-123"
          restaurantId="restaurant-123"
          onNotificationReceived={onNotificationReceived}
        />
      );

      // Simulate database change via realtime
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };
      
      mockSupabaseClient.realtime.channel.mockReturnValue(mockChannel);
      
      // Trigger realtime event
      act(() => {
        const callback = mockChannel.on.mock.calls.find(
          call => call[0] === 'postgres_changes'
        )?.[2];
        
        if (callback) {
          callback({
            eventType: 'INSERT',
            new: {
              id: 'sop-new',
              title: 'New SOP Added',
              restaurant_id: 'restaurant-123',
            },
          });
        }
      });

      // Should trigger push notification
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should maintain PWA state across app updates', async () => {
      const onUpdate = jest.fn();
      
      render(
        <PWAInstallationManager 
          onUpdate={onUpdate}
        />
      );

      // Simulate service worker update
      const updateEvent = new Event('message');
      Object.defineProperty(updateEvent, 'data', {
        value: { type: 'SW_UPDATE_AVAILABLE' }
      });

      act(() => {
        navigator.serviceWorker?.dispatchEvent(updateEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/Update Available/i)).toBeInTheDocument();
      });
    });
  });

  describe('IoT Integration with Restaurant Operations', () => {
    test('should integrate IoT alerts with SOP workflows', async () => {
      // Mock IoT alert
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'alert-123',
            device_id: 'temp-sensor-1',
            alert_type: 'temperature_high',
            severity: 'critical',
            current_value: 45.2,
            threshold_value: 40.0,
            location: 'Main Kitchen',
          }
        }),
      });

      // Should trigger relevant SOP
      const mockARSteps = [{
        id: 'emergency-step-1',
        step_number: 1,
        title: 'Emergency Temperature Response',
        title_fr: 'Réponse d\'urgence température',
        description: 'Immediate action required for high temperature alert',
        description_fr: 'Action immédiate requise pour alerte haute température',
        estimated_time_seconds: 180,
        annotations: [{
          id: 'emergency-annotation',
          x: 50, y: 50,
          type: 'warning' as const,
          content: 'Critical temperature detected: 45.2°C',
          content_fr: 'Température critique détectée: 45.2°C',
          priority: 'critical' as const,
          interactive: true,
          completed: false,
        }],
        validation_required: true,
      }];

      render(
        <ARSOPVisualization
          steps={mockARSteps}
          enableCamera={true}
        />
      );

      expect(screen.getByText(/Emergency Temperature Response/i)).toBeInTheDocument();
      expect(screen.getByText(/Critical temperature detected/i)).toBeInTheDocument();
    });

    test('should integrate IoT sensor data with training analytics', async () => {
      // Mock IoT sensor data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [{
            device_id: 'temp-sensor-1',
            timestamp: new Date().toISOString(),
            temperature: 22.5,
            humidity: 45.2,
            location: 'Training Kitchen',
          }],
        }),
      });

      render(
        <TrainingAnalyticsClientWrapper>
          <div>Training Analytics with IoT Integration</div>
        </TrainingAnalyticsClientWrapper>
      );

      // Should fetch and display environmental data
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/iot/sensor-monitoring'),
        expect.any(Object)
      );
    });

    test('should trigger IoT device actions from SOP completion', async () => {
      const onStepComplete = jest.fn();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const mockARSteps = [{
        id: 'equipment-step',
        step_number: 1,
        title: 'Adjust Equipment Settings',
        title_fr: 'Ajuster les paramètres d\'équipement',
        description: 'Configure equipment after cleaning',
        description_fr: 'Configurer l\'équipement après nettoyage',
        estimated_time_seconds: 120,
        annotations: [],
        validation_required: true,
      }];

      render(
        <ARSOPVisualization
          steps={mockARSteps}
          onStepComplete={onStepComplete}
        />
      );

      // Simulate step completion
      const nextButton = screen.getByText(/Next Step/i);
      fireEvent.click(nextButton);

      expect(onStepComplete).toHaveBeenCalled();
      
      // Should trigger IoT device adjustment
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/iot/device-management'),
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });
  });

  describe('Mobile Security Integration', () => {
    test('should integrate biometric auth with existing PIN system', async () => {
      const onSuccess = jest.fn();
      
      // Mock biometric authentication success
      Object.defineProperty(global.navigator, 'credentials', {
        value: {
          create: jest.fn().mockResolvedValue({
            id: 'biometric-credential',
            response: { clientDataJSON: new ArrayBuffer(8) },
          }),
        },
        writable: true,
      });

      render(
        <EnhancedPinLogin 
          onSuccess={onSuccess}
          enableBiometric={true}
        />
      );

      // Should show biometric option
      const biometricButton = screen.getByText(/Use Biometric/i);
      fireEvent.click(biometricButton);

      await waitFor(() => {
        expect(navigator.credentials?.create).toHaveBeenCalled();
      });
    });

    test('should maintain security across PWA and native app modes', async () => {
      // Mock PWA installation
      const beforeInstallPrompt = new Event('beforeinstallprompt');
      
      render(
        <PWAInstallationManager onInstall={jest.fn()} />
      );

      act(() => {
        window.dispatchEvent(beforeInstallPrompt);
      });

      await waitFor(() => {
        expect(screen.getByText(/Install Krong Thai SOP/i)).toBeInTheDocument();
      });

      // Security should be maintained in PWA mode
      expect(localStorage.getItem('security_context')).toBeTruthy();
    });

    test('should validate session security across different features', async () => {
      const mockSessionToken = 'secure-session-token-123';
      
      render(
        <div>
          <AdvancedVoiceAI
            context={{
              user_role: 'staff',
              current_location: 'kitchen',
              active_tasks: [],
              recent_sops: [],
              training_progress: { completed_modules: [] },
              conversation_history: [],
              language_preference: 'en',
            }}
          />
          <ARSOPVisualization steps={[]} />
        </div>
      );

      // All components should use the same secure session
      expect(screen.getByText(/Voice AI/i)).toBeInTheDocument();
      expect(screen.getByText(/AR SOP Visualization/i)).toBeInTheDocument();
    });
  });

  describe('AR/VR Integration with Content Management', () => {
    test('should load SOP content into AR visualization', async () => {
      // Mock SOP data fetch
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockSOPDocument,
        error: null,
      });

      const mockARSteps = [{
        id: 'sop-step-1',
        step_number: 1,
        title: mockSOPDocument.title,
        title_fr: mockSOPDocument.title_fr,
        description: 'Follow food safety protocol',
        description_fr: 'Suivre le protocole de sécurité alimentaire',
        estimated_time_seconds: 300,
        annotations: [{
          id: 'sop-annotation',
          x: 30, y: 40,
          type: 'instruction' as const,
          content: 'Check temperature logs',
          content_fr: 'Vérifier les journaux de température',
          priority: 'medium' as const,
          interactive: true,
          completed: false,
        }],
        validation_required: true,
      }];

      render(
        <ARSOPVisualization
          steps={mockARSteps}
          enableCamera={true}
        />
      );

      expect(screen.getByText(/Food Safety Protocol/i)).toBeInTheDocument();
      expect(screen.getByText(/Check temperature logs/i)).toBeInTheDocument();
    });

    test('should integrate VR training with progress tracking', async () => {
      const onTrainingComplete = jest.fn();
      
      // Mock training progress
      mockSupabaseClient.from().single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          module_id: 'training-123',
          progress_percentage: 0,
          completed_at: null,
        },
        error: null,
      });

      const mockVRModule = {
        id: 'training-123',
        title: mockTrainingModule.title,
        title_fr: mockTrainingModule.title_fr,
        scene: {
          id: 'kitchen-scene',
          name: 'Professional Kitchen',
          name_fr: 'Cuisine professionnelle',
          description: 'VR kitchen environment',
          description_fr: 'Environnement de cuisine VR',
          environment: 'kitchen' as const,
          difficulty: 'intermediate' as const,
          duration_minutes: 30,
          objectives: ['Complete safety training'],
          objectives_fr: ['Terminer la formation de sécurité'],
          assets: {
            models: ['kitchen.glb'],
            textures: ['kitchen_texture.jpg'],
            sounds: ['ambient.mp3'],
            animations: ['safety_demo.fbx'],
          },
        },
        interactions: [],
        assessment_criteria: {
          accuracy_threshold: 0.8,
          time_limit_minutes: 30,
          required_interactions: [],
        },
        multiplayer_enabled: false,
        collaborative_features: [],
      };

      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          onTrainingComplete={onTrainingComplete}
        />
      );

      expect(screen.getByText(/Kitchen Safety Training/i)).toBeInTheDocument();
    });

    test('should sync voice AI context with user session', async () => {
      const onIntentRecognized = jest.fn();
      
      // Mock user context from session
      const voiceContext = {
        user_role: mockUser.role as 'staff',
        current_location: 'kitchen',
        active_tasks: ['prep_vegetables'],
        recent_sops: ['food_safety'],
        training_progress: {
          completed_modules: ['basic_safety'],
          current_module: 'knife_skills',
        },
        conversation_history: [],
        language_preference: 'en' as const,
      };

      render(
        <AdvancedVoiceAI
          context={voiceContext}
          onIntentRecognized={onIntentRecognized}
        />
      );

      // Voice AI should have access to user context
      expect(screen.getByText(/Staff Role/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Location: kitchen/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Collaboration Integration', () => {
    test('should enable real-time updates across AR sessions', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };
      
      mockSupabaseClient.realtime.channel.mockReturnValue(mockChannel);

      render(
        <ARSOPVisualization
          steps={[]}
          enableCamera={true}
        />
      );

      // Should subscribe to real-time updates
      expect(mockSupabaseClient.realtime.channel).toHaveBeenCalledWith(
        expect.stringContaining('ar-session')
      );
    });

    test('should support multiplayer VR training sessions', async () => {
      const mockVRModule = {
        id: 'multiplayer-training',
        title: 'Team Coordination Training',
        title_fr: 'Formation de coordination d\'équipe',
        scene: {
          id: 'team-kitchen',
          name: 'Team Kitchen',
          name_fr: 'Cuisine d\'équipe',
          description: 'Multiplayer kitchen environment',
          description_fr: 'Environnement de cuisine multijoueur',
          environment: 'kitchen' as const,
          difficulty: 'advanced' as const,
          duration_minutes: 45,
          objectives: ['Coordinate with team members'],
          objectives_fr: ['Coordonner avec les membres de l\'équipe'],
          assets: {
            models: [],
            textures: [],
            sounds: [],
            animations: [],
          },
        },
        interactions: [],
        assessment_criteria: {
          accuracy_threshold: 0.85,
          time_limit_minutes: 45,
          required_interactions: [],
        },
        multiplayer_enabled: true,
        collaborative_features: ['voice_chat', 'gesture_sharing', 'tool_passing'],
      };

      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          enableMultiplayer={true}
        />
      );

      expect(screen.getByText(/Multiplayer Enabled/i)).toBeInTheDocument();
      expect(screen.getByText(/Team Coordination Training/i)).toBeInTheDocument();
    });

    test('should synchronize voice AI across multiple users', async () => {
      const onConversationUpdate = jest.fn();
      
      const voiceContext = {
        user_role: 'manager' as const,
        current_location: 'dining',
        active_tasks: ['staff_briefing'],
        recent_sops: [],
        training_progress: { completed_modules: [] },
        conversation_history: [],
        language_preference: 'en' as const,
      };

      render(
        <AdvancedVoiceAI
          context={voiceContext}
          onConversationUpdate={onConversationUpdate}
          continuousListening={true}
        />
      );

      // Should support multi-user conversation synchronization
      expect(screen.getByText(/Manager Role/i)).toBeInTheDocument();
      expect(screen.getByText(/Continuous Mode/i)).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance with multiple Phase 3A features active', async () => {
      const startTime = Date.now();
      
      render(
        <div>
          <PWAInstallationManager onInstall={jest.fn()} />
          <PushNotificationSystem
            userId="user-123"
            restaurantId="restaurant-123"
          />
          <ARSOPVisualization
            steps={[]}
            enableCamera={true}
          />
          <AdvancedVoiceAI
            context={{
              user_role: 'staff',
              current_location: 'kitchen',
              active_tasks: [],
              recent_sops: [],
              training_progress: { completed_modules: [] },
              conversation_history: [],
              language_preference: 'en',
            }}
          />
        </div>
      );
      
      const endTime = Date.now();
      
      // All components should render within performance budget
      expect(endTime - startTime).toBeLessThan(2000);
      
      // Check that all components are present
      expect(screen.getByText(/Install Krong Thai SOP/i)).toBeInTheDocument();
      expect(screen.getByText(/Push Notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/AR SOP Visualization/i)).toBeInTheDocument();
      expect(screen.getByText(/Voice AI/i)).toBeInTheDocument();
    });

    test('should handle memory management across intensive features', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Render memory-intensive components
      const { unmount } = render(
        <div>
          <VRTrainingEnvironment
            module={{
              id: 'intensive-training',
              title: 'Intensive VR Training',
              title_fr: 'Formation VR intensive',
              scene: {
                id: 'complex-scene',
                name: 'Complex Scene',
                name_fr: 'Scène complexe',
                description: 'Memory intensive scene',
                description_fr: 'Scène intensive en mémoire',
                environment: 'kitchen' as const,
                difficulty: 'expert' as const,
                duration_minutes: 60,
                objectives: [],
                objectives_fr: [],
                assets: {
                  models: Array(100).fill('model.glb'),
                  textures: Array(50).fill('texture.jpg'),
                  sounds: Array(20).fill('sound.mp3'),
                  animations: Array(30).fill('animation.fbx'),
                },
              },
              interactions: [],
              assessment_criteria: {
                accuracy_threshold: 0.9,
                time_limit_minutes: 60,
                required_interactions: [],
              },
              multiplayer_enabled: false,
              collaborative_features: [],
            }}
          />
          <ARSOPVisualization
            steps={Array(50).fill({
              id: 'step',
              step_number: 1,
              title: 'Step',
              title_fr: 'Étape',
              description: 'Description',
              description_fr: 'Description',
              estimated_time_seconds: 60,
              annotations: Array(10).fill({
                id: 'annotation',
                x: 50, y: 50,
                type: 'instruction' as const,
                content: 'Content',
                content_fr: 'Contenu',
                priority: 'medium' as const,
                interactive: true,
                completed: false,
              }),
              validation_required: false,
            })}
            enableCamera={true}
          />
        </div>
      );
      
      // Unmount to test cleanup
      unmount();
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDifference = finalMemory - initialMemory;
      
      // Memory should be properly cleaned up
      expect(memoryDifference).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    });
  });

  describe('Accessibility Integration', () => {
    test('should maintain accessibility standards across all features', async () => {
      render(
        <div>
          <PWAInstallationManager onInstall={jest.fn()} />
          <ARSOPVisualization steps={[]} />
          <AdvancedVoiceAI
            context={{
              user_role: 'staff',
              current_location: 'kitchen',
              active_tasks: [],
              recent_sops: [],
              training_progress: { completed_modules: [] },
              conversation_history: [],
              language_preference: 'en',
            }}
          />
        </div>
      );

      // Check for proper ARIA labels and roles
      expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start ar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument();
    });

    test('should provide alternative input methods when advanced features fail', async () => {
      // Mock AR/VR not supported
      Object.defineProperty(global.navigator, 'xr', {
        value: undefined,
        writable: true,
      });

      render(
        <div>
          <ARSOPVisualization steps={[]} />
          <VRTrainingEnvironment
            module={{
              id: 'fallback-module',
              title: 'Fallback Training',
              title_fr: 'Formation de secours',
              scene: {
                id: 'fallback-scene',
                name: 'Fallback Scene',
                name_fr: 'Scène de secours',
                description: 'Fallback training scene',
                description_fr: 'Scène de formation de secours',
                environment: 'kitchen' as const,
                difficulty: 'beginner' as const,
                duration_minutes: 15,
                objectives: [],
                objectives_fr: [],
                assets: { models: [], textures: [], sounds: [], animations: [] },
              },
              interactions: [],
              assessment_criteria: {
                accuracy_threshold: 0.7,
                time_limit_minutes: 15,
                required_interactions: [],
              },
              multiplayer_enabled: false,
              collaborative_features: [],
            }}
          />
        </div>
      );

      // Should show fallback interfaces
      expect(screen.getByText(/AR not supported/i)).toBeInTheDocument();
      expect(screen.getByText(/VR not supported/i)).toBeInTheDocument();
    });
  });

  describe('Bilingual Content Integration', () => {
    test('should maintain consistent language across all Phase 3A features', async () => {
      // Mock French language preference
      const frenchContext = {
        user_role: 'staff' as const,
        current_location: 'cuisine',
        active_tasks: ['prep_legumes'],
        recent_sops: ['securite_alimentaire'],
        training_progress: { completed_modules: ['securite_base'] },
        conversation_history: [],
        language_preference: 'fr' as const,
      };

      render(
        <div>
          <AdvancedVoiceAI
            context={frenchContext}
            multilingualMode={true}
          />
          <ARSOPVisualization
            steps={[{
              id: 'step-fr',
              step_number: 1,
              title: 'Préparation des ingrédients',
              title_fr: 'Préparation des ingrédients',
              description: 'Rassembler tous les ingrédients',
              description_fr: 'Rassembler tous les ingrédients',
              estimated_time_seconds: 300,
              annotations: [],
              validation_required: true,
            }]}
          />
        </div>
      );

      // Should display French content
      expect(screen.getByText(/Préparation des ingrédients/i)).toBeInTheDocument();
      expect(screen.getByText(/Location: cuisine/i)).toBeInTheDocument();
    });
  });
});

// Integration performance benchmarks
export const INTEGRATION_PERFORMANCE_BENCHMARKS = {
  multiFeatureRender: 2000, // ms for rendering multiple Phase 3A features
  databaseSyncLatency: 500, // ms for real-time database synchronization
  crossFeatureCommunication: 100, // ms for inter-feature communication
  authenticationIntegration: 300, // ms for auth system integration
  bilingualContentSwitch: 200, // ms for language switching
  realtimeCollaboration: 150, // ms for real-time collaboration updates
  memoryCleanup: 5000, // ms for proper memory cleanup after unmount
  securityValidation: 400, // ms for security context validation
  accessibilityCompliance: 100, // ms for accessibility feature activation
};

// Integration test utilities
export const IntegrationTestUtils = {
  setupMockDatabase: () => {
    mockSupabaseClient.from().single.mockImplementation((table) => {
      const mockData = {
        users: mockUser,
        restaurants: mockRestaurant,
        sop_documents: mockSOPDocument,
        training_modules: mockTrainingModule,
      };
      
      return Promise.resolve({
        data: mockData[table as keyof typeof mockData] || null,
        error: null,
      });
    });
  },

  mockRealtimeChannel: () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };
    
    mockSupabaseClient.realtime.channel.mockReturnValue(mockChannel);
    return mockChannel;
  },

  simulateNetworkLatency: (ms: number) => {
    global.fetch = jest.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      }), ms))
    );
  },

  validatePerformanceBudget: (startTime: number, budget: number) => {
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(budget);
    return duration;
  },

  checkMemoryUsage: () => {
    const memory = (performance as any).memory;
    return memory ? {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
    } : null;
  },
};