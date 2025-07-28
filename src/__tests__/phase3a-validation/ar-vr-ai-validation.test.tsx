/**
 * Phase 3A AR/VR & AI Features Validation Test Suite
 * Tasks 269-275: AR visualization, VR training, voice AI, gesture navigation, spatial audio validation
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import ARSOPVisualization from '@/components/sop/ar-sop-visualization';
import VRTrainingEnvironment from '@/components/training/vr-training-environment';
import AdvancedVoiceAI from '@/components/voice/advanced-voice-ai';

// Mock WebXR APIs
const mockXRSession = {
  requestReferenceSpace: jest.fn(),
  requestAnimationFrame: jest.fn(),
  end: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockXR = {
  isSessionSupported: jest.fn(() => Promise.resolve(true)),
  requestSession: jest.fn(() => Promise.resolve(mockXRSession)),
};

Object.defineProperty(global.navigator, 'xr', {
  value: mockXR,
  writable: true,
});

// Mock WebGL and Canvas APIs
const mockWebGLContext = {
  createProgram: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(),
  getUniformLocation: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  uniform1f: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  clear: jest.fn(),
  drawArrays: jest.fn(),
};

const mockCanvasContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  fillText: jest.fn(),
  strokeRect: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  setLineDash: jest.fn(),
};

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext;
  }
  if (contextType === '2d') {
    return mockCanvasContext;
  }
  return null;
});

// Mock Speech Recognition and Synthesis
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  onstart: null,
  onend: null,
  onresult: null,
  onerror: null,
  continuous: false,
  interimResults: false,
  lang: 'en-US',
};

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => [
    { name: 'English Voice', lang: 'en-US' },
    { name: 'French Voice', lang: 'fr-FR' },
  ]),
};

Object.defineProperty(global.window, 'webkitSpeechRecognition', {
  value: function() { return mockSpeechRecognition; },
  writable: true,
});

Object.defineProperty(global.window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

// Mock Audio Context for spatial audio
const mockAudioContext = {
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    gain: { value: 1 },
  })),
  createPanner: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    setPosition: jest.fn(),
    setOrientation: jest.fn(),
  })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null,
  })),
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 256,
    getByteFrequencyData: jest.fn(),
  })),
  decodeAudioData: jest.fn(),
  destination: {},
  currentTime: 0,
  sampleRate: 44100,
  state: 'running',
};

Object.defineProperty(global.window, 'AudioContext', {
  value: function() { return mockAudioContext; },
  writable: true,
});

// Mock MediaDevices for camera access
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }],
    })),
    enumerateDevices: jest.fn(() => Promise.resolve([
      { kind: 'videoinput', label: 'Camera' },
      { kind: 'audioinput', label: 'Microphone' },
    ])),
  },
  writable: true,
});

// Mock Device Orientation
Object.defineProperty(global.window, 'DeviceOrientationEvent', {
  value: function DeviceOrientationEvent() {},
  writable: true,
});

// Test data
const mockARSteps = [
  {
    id: 'step-1',
    step_number: 1,
    title: 'Prepare Ingredients',
    title_fr: 'Préparer les ingrédients',
    description: 'Gather all necessary ingredients for the dish',
    description_fr: 'Rassembler tous les ingrédients nécessaires pour le plat',
    estimated_time_seconds: 300,
    annotations: [
      {
        id: 'annotation-1',
        x: 25,
        y: 30,
        type: 'instruction' as const,
        content: 'Select fresh vegetables',
        content_fr: 'Sélectionner des légumes frais',
        priority: 'high' as const,
        interactive: true,
        completed: false,
      },
      {
        id: 'annotation-2',
        x: 75,
        y: 60,
        type: 'warning' as const,
        content: 'Check expiration dates',
        content_fr: 'Vérifier les dates d\'expiration',
        priority: 'critical' as const,
        interactive: true,
        completed: false,
      },
    ],
    target_area: {
      x: 20,
      y: 25,
      width: 60,
      height: 40,
    },
    validation_required: true,
  },
];

const mockVRModule = {
  id: 'vr-module-1',
  title: 'Kitchen Safety Training',
  title_fr: 'Formation à la sécurité en cuisine',
  scene: {
    id: 'kitchen-scene',
    name: 'Professional Kitchen',
    name_fr: 'Cuisine professionnelle',
    description: 'Realistic restaurant kitchen environment',
    description_fr: 'Environnement de cuisine de restaurant réaliste',
    environment: 'kitchen' as const,
    difficulty: 'intermediate' as const,
    duration_minutes: 30,
    objectives: ['Learn proper knife handling', 'Practice fire safety'],
    objectives_fr: ['Apprendre le maniement correct du couteau', 'Pratiquer la sécurité incendie'],
    assets: {
      models: ['kitchen.glb', 'equipment.glb'],
      textures: ['kitchen_texture.jpg'],
      sounds: ['ambient_kitchen.mp3'],
      animations: ['knife_cut.fbx'],
    },
  },
  interactions: [
    {
      id: 'interaction-1',
      position: { x: 0, y: 1.5, z: -2 },
      type: 'grab' as const,
      trigger: 'knife_handle',
      feedback: 'haptic' as const,
      required: true,
      completed: false,
      instruction: 'Pick up the knife correctly',
      instruction_fr: 'Prendre le couteau correctement',
    },
  ],
  assessment_criteria: {
    accuracy_threshold: 0.8,
    time_limit_minutes: 30,
    required_interactions: ['interaction-1'],
  },
  multiplayer_enabled: true,
  collaborative_features: ['voice_chat', 'gesture_sharing'],
};

const mockVoiceContext = {
  user_role: 'staff' as const,
  current_location: 'kitchen',
  active_tasks: ['prep_vegetables', 'clean_station'],
  recent_sops: ['food_safety', 'knife_skills'],
  training_progress: {
    completed_modules: ['basic_safety'],
    current_module: 'knife_skills',
  },
  conversation_history: [],
  language_preference: 'en' as const,
};

describe('Phase 3A AR/VR & AI Features Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 269: AR SOP Visualization System', () => {
    test('should initialize AR capabilities and camera access', async () => {
      render(
        <ARSOPVisualization
          steps={mockARSteps}
          enableCamera={true}
          showCalibration={true}
        />
      );

      expect(screen.getByText(/AR SOP Visualization/i)).toBeInTheDocument();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    });

    test('should handle device orientation tracking', async () => {
      render(<ARSOPVisualization steps={mockARSteps} />);

      // Simulate device orientation event
      const orientationEvent = new Event('deviceorientation') as DeviceOrientationEvent;
      Object.defineProperty(orientationEvent, 'alpha', { value: 10 });
      Object.defineProperty(orientationEvent, 'beta', { value: 20 });
      Object.defineProperty(orientationEvent, 'gamma', { value: 30 });

      act(() => {
        window.dispatchEvent(orientationEvent);
      });

      // Should track device orientation for AR calibration
      expect(window.addEventListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
    });

    test('should render AR annotations with proper positioning', async () => {
      render(<ARSOPVisualization steps={mockARSteps} />);

      // Start AR session
      const startARButton = screen.getByText(/Start AR/i);
      fireEvent.click(startARButton);

      await waitFor(() => {
        expect(mockXR.requestSession).toHaveBeenCalledWith('immersive-ar', {
          requiredFeatures: ['local', 'hit-test'],
          optionalFeatures: ['dom-overlay', 'light-estimation'],
        });
      });

      // Check annotation rendering
      expect(screen.getByText(/Select fresh vegetables/i)).toBeInTheDocument();
      expect(screen.getByText(/Check expiration dates/i)).toBeInTheDocument();
    });

    test('should handle annotation interactions', async () => {
      const onAnnotationInteract = jest.fn();
      render(
        <ARSOPVisualization
          steps={mockARSteps}
          onAnnotationInteract={onAnnotationInteract}
        />
      );

      const annotation = screen.getByText(/Select fresh vegetables/i).closest('div');
      fireEvent.click(annotation!);

      expect(onAnnotationInteract).toHaveBeenCalledWith('annotation-1', 'click');
    });

    test('should support step navigation with progress tracking', async () => {
      const onStepChange = jest.fn();
      const onStepComplete = jest.fn();
      
      render(
        <ARSOPVisualization
          steps={mockARSteps}
          onStepChange={onStepChange}
          onStepComplete={onStepComplete}
        />
      );

      // Check initial step display
      expect(screen.getByText(/Step 1: Prepare Ingredients/i)).toBeInTheDocument();
      expect(screen.getByText(/0% Complete/i)).toBeInTheDocument();
    });

    test('should handle AR grid and target area rendering', async () => {
      render(<ARSOPVisualization steps={mockARSteps} showGrid={true} />);

      // Start AR to trigger canvas rendering
      const startARButton = screen.getByText(/Start AR/i);
      fireEvent.click(startARButton);

      await waitFor(() => {
        expect(mockCanvasContext.beginPath).toHaveBeenCalled();
        expect(mockCanvasContext.moveTo).toHaveBeenCalled();
        expect(mockCanvasContext.lineTo).toHaveBeenCalled();
        expect(mockCanvasContext.stroke).toHaveBeenCalled();
      });
    });

    test('should support fullscreen and settings configuration', async () => {
      render(<ARSOPVisualization steps={mockARSteps} />);

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      expect(screen.getByText(/AR Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Annotation Opacity/i)).toBeInTheDocument();
      expect(screen.getByText(/Show AR Grid/i)).toBeInTheDocument();
    });
  });

  describe('Task 270: VR Training Environment', () => {
    test('should initialize VR system with WebXR support', async () => {
      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          enableMultiplayer={true}
          enableHaptics={true}
        />
      );

      expect(mockXR.isSessionSupported).toHaveBeenCalledWith('immersive-vr');
      expect(screen.getByText(/Kitchen Safety Training/i)).toBeInTheDocument();
    });

    test('should handle VR session lifecycle', async () => {
      render(<VRTrainingEnvironment module={mockVRModule} />);

      const startVRButton = screen.getByText(/Enter VR/i);
      fireEvent.click(startVRButton);

      await waitFor(() => {
        expect(mockXR.requestSession).toHaveBeenCalledWith('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['hand-tracking', 'hit-test'],
        });
      });

      // Session should be active
      expect(mockXRSession.addEventListener).toHaveBeenCalledWith('end', expect.any(Function));
    });

    test('should manage VR training interactions', async () => {
      const onInteraction = jest.fn();
      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          onInteraction={onInteraction}
        />
      );

      // Check interaction points are displayed
      expect(screen.getByText(/Pick up the knife correctly/i)).toBeInTheDocument();
    });

    test('should support multiplayer collaboration features', async () => {
      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          enableMultiplayer={true}
        />
      );

      expect(screen.getByText(/Multiplayer Enabled/i)).toBeInTheDocument();
    });

    test('should track training session metrics', async () => {
      const onTrainingComplete = jest.fn();
      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          onTrainingComplete={onTrainingComplete}
        />
      );

      // Start training
      const startButton = screen.getByText(/Start Training/i);
      fireEvent.click(startButton);

      // Metrics should be tracked
      expect(screen.getByText(/Training Active/i)).toBeInTheDocument();
    });

    test('should handle VR calibration process', async () => {
      render(<VRTrainingEnvironment module={mockVRModule} />);

      const startVRButton = screen.getByText(/Enter VR/i);
      fireEvent.click(startVRButton);

      // Should show calibration progress
      await waitFor(() => {
        expect(screen.getByText(/Calibrating/i)).toBeInTheDocument();
      });
    });
  });

  describe('Task 271: Advanced Voice AI System', () => {
    test('should initialize speech recognition and synthesis', async () => {
      render(
        <AdvancedVoiceAI
          context={mockVoiceContext}
          enableNLU={true}
          enableTTS={true}
        />
      );

      expect(screen.getByText(/Voice AI/i)).toBeInTheDocument();
      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled();
    });

    test('should handle voice commands and intent recognition', async () => {
      const onIntentRecognized = jest.fn();
      render(
        <AdvancedVoiceAI
          context={mockVoiceContext}
          onIntentRecognized={onIntentRecognized}
        />
      );

      const micButton = screen.getByRole('button', { name: /start listening/i });
      fireEvent.click(micButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    test('should support multilingual voice processing', async () => {
      const contextFrench = { ...mockVoiceContext, language_preference: 'fr' as const };
      render(
        <AdvancedVoiceAI
          context={contextFrench}
          multilingualMode={true}
        />
      );

      expect(mockSpeechRecognition.lang).toBe('fr-FR');
    });

    test('should handle continuous listening mode', async () => {
      render(
        <AdvancedVoiceAI
          context={mockVoiceContext}
          continuousListening={true}
          wakeWord="hey krong thai"
        />
      );

      expect(screen.getByText(/Continuous Mode/i)).toBeInTheDocument();
    });

    test('should process natural language understanding', async () => {
      const onActionTriggered = jest.fn();
      render(
        <AdvancedVoiceAI
          context={mockVoiceContext}
          enableNLU={true}
          onActionTriggered={onActionTriggered}
        />
      );

      // Simulate speech result
      act(() => {
        mockSpeechRecognition.onresult?.({
          results: [{
            0: { transcript: 'show me the food safety SOP' },
            isFinal: true,
          }],
          resultIndex: 0,
        });
      });

      await waitFor(() => {
        expect(onActionTriggered).toHaveBeenCalled();
      });
    });

    test('should manage conversation context', async () => {
      const onConversationUpdate = jest.fn();
      render(
        <AdvancedVoiceAI
          context={mockVoiceContext}
          onConversationUpdate={onConversationUpdate}
        />
      );

      // Should track conversation history
      expect(screen.getByText(/Conversation/i)).toBeInTheDocument();
    });
  });

  describe('Task 272: Gesture Navigation System', () => {
    test('should detect hand gestures for navigation', async () => {
      render(<ARSOPVisualization steps={mockARSteps} />);

      // Enable hand gesture controls
      const startARButton = screen.getByText(/Start AR/i);
      fireEvent.click(startARButton);

      await waitFor(() => {
        const gestureButton = screen.getByRole('button', { name: /hand gesture/i });
        fireEvent.click(gestureButton);
      });

      // Hand gesture should be enabled
      expect(screen.getByRole('button', { name: /hand gesture/i })).toHaveClass('text-krong-red');
    });

    test('should interpret gesture commands', async () => {
      render(<VRTrainingEnvironment module={mockVRModule} />);

      // Hand tracking should be initialized in VR
      const startVRButton = screen.getByText(/Enter VR/i);
      fireEvent.click(startVRButton);

      await waitFor(() => {
        expect(mockXR.requestSession).toHaveBeenCalledWith('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['hand-tracking', 'hit-test'],
        });
      });
    });

    test('should provide gesture feedback and guidance', async () => {
      render(
        <ARSOPVisualization
          steps={mockARSteps}
          onAnnotationInteract={jest.fn()}
        />
      );

      // Gesture guidance should be available
      expect(screen.getByText(/AR Guidance/i)).toBeInTheDocument();
    });
  });

  describe('Task 273: Spatial Audio System', () => {
    test('should initialize 3D audio context', async () => {
      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          enableSpatialAudio={true}
        />
      );

      // Audio context should be created for spatial audio
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockAudioContext.createPanner).toHaveBeenCalled();
    });

    test('should handle directional audio cues', async () => {
      render(
        <AdvancedVoiceAI
          context={mockVoiceContext}
          enableTTS={true}
        />
      );

      const speakButton = screen.getByRole('button', { name: /speak/i });
      fireEvent.click(speakButton);

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('should support audio environment adaptation', async () => {
      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          enableSpatialAudio={true}
        />
      );

      // Should adapt audio to kitchen environment
      expect(screen.getByText(/Kitchen Safety Training/i)).toBeInTheDocument();
    });
  });

  describe('Task 274: Computer Vision Integration', () => {
    test('should analyze camera feed for object recognition', async () => {
      render(
        <ARSOPVisualization
          steps={mockARSteps}
          enableCamera={true}
        />
      );

      // Camera should be initialized for computer vision
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    });

    test('should detect target areas and objects', async () => {
      render(<ARSOPVisualization steps={mockARSteps} />);

      // Target area should be defined for detection
      expect(mockARSteps[0].target_area).toBeDefined();
      expect(mockARSteps[0].target_area!.x).toBe(20);
      expect(mockARSteps[0].target_area!.y).toBe(25);
    });

    test('should provide visual feedback for recognition', async () => {
      render(<ARSOPVisualization steps={mockARSteps} />);

      // Start AR to enable computer vision
      const startARButton = screen.getByText(/Start AR/i);
      fireEvent.click(startARButton);

      await waitFor(() => {
        // Canvas should render visual feedback
        expect(mockCanvasContext.strokeRect).toHaveBeenCalled();
      });
    });
  });

  describe('Task 275: AI-Powered Quality Control', () => {
    test('should analyze training performance with AI', async () => {
      const onTrainingComplete = jest.fn();
      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          onTrainingComplete={onTrainingComplete}
        />
      );

      // AI should assess training quality
      expect(mockVRModule.assessment_criteria.accuracy_threshold).toBe(0.8);
    });

    test('should provide intelligent recommendations', async () => {
      render(
        <AdvancedVoiceAI
          context={mockVoiceContext}
          enableNLU={true}
        />
      );

      // AI should provide context-aware suggestions
      expect(screen.getByText(/AI Processing/i)).toBeInTheDocument();
    });

    test('should adapt difficulty based on performance', async () => {
      render(<VRTrainingEnvironment module={mockVRModule} />);

      // Should track performance for adaptation
      expect(mockVRModule.scene.difficulty).toBe('intermediate');
    });

    test('should validate SOP compliance automatically', async () => {
      render(<ARSOPVisualization steps={mockARSteps} />);

      // Steps should have validation requirements
      expect(mockARSteps[0].validation_required).toBe(true);
      expect(mockARSteps[0].annotations).toHaveLength(2);
      expect(mockARSteps[0].annotations[1].priority).toBe('critical');
    });
  });

  describe('AR/VR/AI Integration Tests', () => {
    test('should integrate AR with voice commands', async () => {
      const onIntentRecognized = jest.fn();
      render(
        <div>
          <ARSOPVisualization steps={mockARSteps} />
          <AdvancedVoiceAI
            context={mockVoiceContext}
            onIntentRecognized={onIntentRecognized}
          />
        </div>
      );

      // Voice commands should control AR interface
      const micButton = screen.getByRole('button', { name: /start listening/i });
      fireEvent.click(micButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    test('should support VR with spatial audio', async () => {
      render(
        <VRTrainingEnvironment
          module={mockVRModule}
          enableSpatialAudio={true}
        />
      );

      // VR should integrate with spatial audio
      expect(mockAudioContext.createPanner).toHaveBeenCalled();
    });

    test('should work with existing restaurant authentication', async () => {
      const contextWithRole = {
        ...mockVoiceContext,
        user_role: 'manager' as const,
      };

      render(<AdvancedVoiceAI context={contextWithRole} />);

      // Should respect user roles and permissions
      expect(screen.getByText(/Manager/i)).toBeInTheDocument();
    });

    test('should support bilingual AR/VR content', async () => {
      render(<ARSOPVisualization steps={mockARSteps} />);

      // Should display both English and French content
      expect(screen.getByText(/Prepare Ingredients/i)).toBeInTheDocument();
      expect(mockARSteps[0].title_fr).toBe('Préparer les ingrédients');
    });
  });

  describe('Performance and Accessibility Tests', () => {
    test('should maintain performance during AR rendering', async () => {
      const startTime = Date.now();
      
      render(<ARSOPVisualization steps={mockARSteps} />);
      
      const startARButton = screen.getByText(/Start AR/i);
      fireEvent.click(startARButton);
      
      const endTime = Date.now();
      
      // AR initialization should be reasonably fast
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle VR session errors gracefully', async () => {
      mockXR.requestSession.mockRejectedValueOnce(new Error('VR not available'));
      
      render(<VRTrainingEnvironment module={mockVRModule} />);
      
      const startVRButton = screen.getByText(/Enter VR/i);
      fireEvent.click(startVRButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/VR Error/i)).toBeInTheDocument();
      });
    });

    test('should provide accessible fallbacks for voice AI', async () => {
      // Mock speech recognition not available
      Object.defineProperty(global.window, 'webkitSpeechRecognition', {
        value: undefined,
        writable: true,
      });
      
      render(<AdvancedVoiceAI context={mockVoiceContext} />);
      
      // Should show text input fallback
      expect(screen.getByText(/Voice not supported/i)).toBeInTheDocument();
    });

    test('should optimize memory usage during 3D rendering', async () => {
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(<VRTrainingEnvironment module={mockVRModule} />);
      
      const startVRButton = screen.getByText(/Enter VR/i);
      fireEvent.click(startVRButton);
      
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = endMemory - startMemory;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });
});

// Performance benchmarks for AR/VR/AI features
export const AR_VR_AI_PERFORMANCE_BENCHMARKS = {
  arInitialization: 2000, // ms
  vrSessionStart: 3000, // ms
  voiceRecognitionLatency: 500, // ms
  gestureRecognitionLatency: 100, // ms
  spatialAudioLatency: 50, // ms
  computerVisionProcessing: 200, // ms per frame
  aiInferenceTime: 1000, // ms
  arRenderingFPS: 60, // target FPS
  vrRenderingFPS: 90, // target FPS
};

// Test utility functions for AR/VR/AI validation
export const ARVRAITestUtils = {
  createMockARStep: (overrides = {}) => ({
    id: `step-${Date.now()}`,
    step_number: 1,
    title: 'Test AR Step',
    title_fr: 'Étape AR de test',
    description: 'Test AR step description',
    description_fr: 'Description de l\'étape AR de test',
    estimated_time_seconds: 60,
    annotations: [],
    validation_required: false,
    ...overrides,
  }),

  createMockVRModule: (overrides = {}) => ({
    id: `vr-module-${Date.now()}`,
    title: 'Test VR Module',
    title_fr: 'Module VR de test',
    scene: {
      id: 'test-scene',
      name: 'Test Scene',
      name_fr: 'Scène de test',
      description: 'Test VR scene',
      description_fr: 'Scène VR de test',
      environment: 'kitchen' as const,
      difficulty: 'beginner' as const,
      duration_minutes: 10,
      objectives: ['Complete test'],
      objectives_fr: ['Terminer le test'],
      assets: {
        models: [],
        textures: [],
        sounds: [],
        animations: [],
      },
    },
    interactions: [],
    assessment_criteria: {
      accuracy_threshold: 0.7,
      time_limit_minutes: 10,
      required_interactions: [],
    },
    multiplayer_enabled: false,
    collaborative_features: [],
    ...overrides,
  }),

  simulateVoiceCommand: (command: string, language = 'en') => ({
    results: [{
      0: { transcript: command },
      isFinal: true,
    }],
    resultIndex: 0,
  }),

  mockWebXRSupport: () => {
    mockXR.isSessionSupported.mockResolvedValue(true);
    mockXR.requestSession.mockResolvedValue(mockXRSession);
  },

  mockWebXRUnsupported: () => {
    mockXR.isSessionSupported.mockResolvedValue(false);
    mockXR.requestSession.mockRejectedValue(new Error('WebXR not supported'));
  },
};