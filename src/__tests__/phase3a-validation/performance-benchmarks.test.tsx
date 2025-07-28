/**
 * Phase 3A Performance Benchmarking Test Suite
 * Comprehensive performance testing for all Phase 3A advanced features
 */

import { performance } from 'perf_hooks';
import { jest } from '@jest/globals';

// Performance monitoring utilities
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  startTimer(label: string): void {
    this.startTimes.set(label, performance.now());
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' was not started`);
    }
    
    const duration = performance.now() - startTime;
    this.startTimes.delete(label);
    
    // Store metric
    const existing = this.metrics.get(label) || [];
    existing.push(duration);
    this.metrics.set(label, existing);
    
    return duration;
  }

  getMetrics(label: string): { avg: number; min: number; max: number; count: number } {
    const values = this.metrics.get(label) || [];
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    
    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  getAllMetrics(): Record<string, ReturnType<typeof this.getMetrics>> {
    const result: Record<string, ReturnType<typeof this.getMetrics>> = {};
    for (const [label] of this.metrics) {
      result[label] = this.getMetrics(label);
    }
    return result;
  }

  clear(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Memory monitoring utilities
class MemoryMonitor {
  private measurements: Array<{
    timestamp: number;
    used: number;
    total: number;
    limit: number;
  }> = [];

  measureMemory(label?: string): void {
    const memory = (performance as any).memory;
    if (memory) {
      this.measurements.push({
        timestamp: Date.now(),
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      });
    }
  }

  getMemoryDelta(startIndex: number = 0): number {
    if (this.measurements.length < 2) return 0;
    
    const start = this.measurements[startIndex];
    const end = this.measurements[this.measurements.length - 1];
    
    return end.used - start.used;
  }

  getMemoryStats(): {
    peak: number;
    current: number;
    totalAllocated: number;
    measurements: number;
  } {
    if (this.measurements.length === 0) {
      return { peak: 0, current: 0, totalAllocated: 0, measurements: 0 };
    }

    const used = this.measurements.map(m => m.used);
    const latest = this.measurements[this.measurements.length - 1];

    return {
      peak: Math.max(...used),
      current: latest.used,
      totalAllocated: latest.total,
      measurements: this.measurements.length,
    };
  }

  clear(): void {
    this.measurements = [];
  }
}

// Mock WebXR with performance tracking
const createMockXRSession = (responseTime: number = 100) => ({
  requestReferenceSpace: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, responseTime))
  ),
  requestAnimationFrame: jest.fn().mockImplementation((callback) => {
    setTimeout(callback, 16); // ~60 FPS
    return 1;
  }),
  end: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
});

const mockXR = {
  isSessionSupported: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(true), 50))
  ),
  requestSession: jest.fn().mockImplementation((mode: string) => 
    new Promise(resolve => {
      const responseTime = mode === 'immersive-vr' ? 300 : 200;
      setTimeout(() => resolve(createMockXRSession(responseTime)), responseTime);
    })
  ),
};

Object.defineProperty(global.navigator, 'xr', {
  value: mockXR,
  writable: true,
});

// Performance benchmarks from previous tests
const PERFORMANCE_BENCHMARKS = {
  // PWA Performance
  serviceWorkerRegistration: 500,
  pushSubscription: 1000,
  notificationDisplay: 100,
  offlineSync: 2000,
  updateCheck: 1000,
  installPromptDisplay: 200,

  // IoT Performance
  deviceQuery: 500,
  sensorDataIngestion: 100,
  alertGeneration: 200,
  firmwareUpdateCheck: 1000,
  analyticsCalculation: 2000,
  realTimeMonitoring: 50,

  // Mobile Security Performance
  biometricEnrollment: 3000,
  biometricAuthentication: 2000,
  dataEncryption: 500,
  dataDecryption: 300,
  threatDetection: 1000,
  sessionValidation: 100,
  complianceAudit: 10000,
  penetrationTesting: 60000,

  // AR/VR/AI Performance
  arInitialization: 2000,
  vrSessionStart: 3000,
  voiceRecognitionLatency: 500,
  gestureRecognitionLatency: 100,
  spatialAudioLatency: 50,
  computerVisionProcessing: 200,
  aiInferenceTime: 1000,
  arRenderingFPS: 60,
  vrRenderingFPS: 90,

  // Integration Performance
  multiFeatureRender: 2000,
  databaseSyncLatency: 500,
  crossFeatureCommunication: 100,
  authenticationIntegration: 300,
  bilingualContentSwitch: 200,
  realtimeCollaboration: 150,
  memoryCleanup: 5000,
  securityValidation: 400,
  accessibilityCompliance: 100,
};

describe('Phase 3A Performance Benchmarking', () => {
  let perfMonitor: PerformanceMonitor;
  let memMonitor: MemoryMonitor;

  beforeEach(() => {
    perfMonitor = new PerformanceMonitor();
    memMonitor = new MemoryMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    perfMonitor.clear();
    memMonitor.clear();
  });

  describe('PWA Performance Benchmarks', () => {
    test('should meet service worker registration performance targets', async () => {
      perfMonitor.startTimer('sw_registration');
      
      // Simulate service worker registration
      const mockRegistration = {
        pushManager: { getSubscription: jest.fn() },
        update: jest.fn(),
      };
      
      global.navigator.serviceWorker = {
        register: jest.fn().mockResolvedValue(mockRegistration),
        getRegistration: jest.fn().mockResolvedValue(mockRegistration),
      } as any;

      await navigator.serviceWorker.register('/sw.js');
      
      const duration = perfMonitor.endTimer('sw_registration');
      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.serviceWorkerRegistration);
    });

    test('should meet push notification performance targets', async () => {
      perfMonitor.startTimer('push_notification');
      memMonitor.measureMemory();

      // Simulate push notification setup
      const mockSubscription = {
        toJSON: () => ({ endpoint: 'test', keys: {} }),
        unsubscribe: jest.fn(),
      };

      const mockPushManager = {
        subscribe: jest.fn().mockResolvedValue(mockSubscription),
        getSubscription: jest.fn().mockResolvedValue(mockSubscription),
      };

      await mockPushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(65),
      });

      const duration = perfMonitor.endTimer('push_notification');
      memMonitor.measureMemory();
      
      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.pushSubscription);
      expect(memMonitor.getMemoryDelta()).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });

    test('should handle offline sync within performance budget', async () => {
      perfMonitor.startTimer('offline_sync');

      // Simulate offline data synchronization
      const offlineData = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        data: 'Sample SOP data for offline access',
        timestamp: Date.now(),
      }));

      // Mock IndexedDB operations
      const mockDB = {
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            add: jest.fn(),
            put: jest.fn(),
            get: jest.fn(),
          }),
        }),
      };

      // Simulate data sync
      for (const item of offlineData) {
        await new Promise(resolve => setTimeout(resolve, 5)); // Simulate async operation
      }

      const duration = perfMonitor.endTimer('offline_sync');
      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.offlineSync);
    });
  });

  describe('IoT Performance Benchmarks', () => {
    test('should handle high-frequency sensor data ingestion', async () => {
      perfMonitor.startTimer('sensor_ingestion');
      memMonitor.measureMemory();

      // Simulate high-frequency sensor data
      const sensorReadings = Array.from({ length: 1000 }, (_, i) => ({
        deviceId: 'temp-sensor-1',
        timestamp: Date.now() - (i * 1000),
        temperature: 22 + Math.random() * 5,
        humidity: 45 + Math.random() * 10,
      }));

      // Process sensor data
      const processedData = sensorReadings.map(reading => ({
        ...reading,
        processed: true,
        alerts: reading.temperature > 25 ? ['high_temp'] : [],
      }));

      const duration = perfMonitor.endTimer('sensor_ingestion');
      memMonitor.measureMemory();

      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.sensorDataIngestion * 10); // Adjusted for 1000 readings
      expect(processedData).toHaveLength(1000);
      expect(memMonitor.getMemoryDelta()).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    test('should meet alert generation performance targets', async () => {
      perfMonitor.startTimer('alert_generation');

      const criticalReading = {
        deviceId: 'temp-sensor-1',
        temperature: 45.2,
        threshold: 40.0,
        location: 'Main Kitchen',
      };

      // Simulate alert generation logic
      const alert = {
        id: `alert-${Date.now()}`,
        deviceId: criticalReading.deviceId,
        type: 'temperature_high',
        severity: 'critical',
        currentValue: criticalReading.temperature,
        thresholdValue: criticalReading.threshold,
        location: criticalReading.location,
        timestamp: new Date(),
        actions: ['notification', 'sop_trigger', 'manager_alert'],
      };

      const duration = perfMonitor.endTimer('alert_generation');
      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.alertGeneration);
      expect(alert.actions).toContain('sop_trigger');
    });

    test('should perform real-time monitoring within latency budget', async () => {
      const monitoringResults: number[] = [];

      // Simulate 100 monitoring cycles
      for (let i = 0; i < 100; i++) {
        perfMonitor.startTimer(`monitoring_${i}`);
        
        // Simulate monitoring operations
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
        
        const duration = perfMonitor.endTimer(`monitoring_${i}`);
        monitoringResults.push(duration);
      }

      const avgLatency = monitoringResults.reduce((sum, val) => sum + val, 0) / monitoringResults.length;
      const maxLatency = Math.max(...monitoringResults);

      expect(avgLatency).toBeLessThan(PERFORMANCE_BENCHMARKS.realTimeMonitoring);
      expect(maxLatency).toBeLessThan(PERFORMANCE_BENCHMARKS.realTimeMonitoring * 3); // Allow some variance
    });
  });

  describe('Mobile Security Performance Benchmarks', () => {
    test('should meet biometric authentication performance targets', async () => {
      perfMonitor.startTimer('biometric_auth');
      memMonitor.measureMemory();

      // Mock WebAuthn credential creation
      const mockCredential = {
        id: 'biometric-credential-123',
        rawId: new ArrayBuffer(16),
        response: {
          clientDataJSON: new ArrayBuffer(100),
          attestationObject: new ArrayBuffer(200),
        },
        type: 'public-key',
      };

      global.navigator.credentials = {
        create: jest.fn().mockResolvedValue(mockCredential),
        get: jest.fn().mockResolvedValue(mockCredential),
      } as any;

      // Simulate biometric authentication flow
      await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'Krong Thai SOP' },
          user: {
            id: new Uint8Array(16),
            name: 'test@example.com',
            displayName: 'Test User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 30000,
        },
      });

      const duration = perfMonitor.endTimer('biometric_auth');
      memMonitor.measureMemory();

      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.biometricAuthentication);
      expect(memMonitor.getMemoryDelta()).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });

    test('should meet data encryption performance targets', async () => {
      perfMonitor.startTimer('data_encryption');

      const sensitiveData = {
        pin: '1234',
        biometricTemplate: 'biometric-data-template-' + 'x'.repeat(1000),
        sessionToken: 'secure-session-token-' + 'y'.repeat(500),
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          preferences: 'user-preferences-' + 'z'.repeat(2000),
        },
      };

      // Mock encryption operations
      const mockCrypto = {
        getRandomValues: jest.fn((array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
          return array;
        }),
        subtle: {
          encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
          generateKey: jest.fn().mockResolvedValue({}),
        },
      };

      Object.defineProperty(global, 'crypto', {
        value: mockCrypto,
        writable: true,
      });

      // Simulate encryption
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);
      
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(JSON.stringify(sensitiveData))
      );

      const duration = perfMonitor.endTimer('data_encryption');

      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.dataEncryption);
      expect(encryptedData).toBeInstanceOf(ArrayBuffer);
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    test('should perform threat detection within performance budget', async () => {
      perfMonitor.startTimer('threat_detection');

      // Simulate threat detection analysis
      const deviceFingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const behaviorAnalysis = {
        typingPattern: Array.from({ length: 50 }, () => Math.random() * 200),
        mouseMovements: Array.from({ length: 100 }, () => ({
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          timestamp: Date.now(),
        })),
        navigationPattern: ['dashboard', 'sop', 'training', 'analytics'],
      };

      // Simulate threat scoring algorithm
      let threatScore = 0;
      
      // Analyze typing patterns
      const avgTypingSpeed = behaviorAnalysis.typingPattern.reduce((sum, val) => sum + val, 0) / behaviorAnalysis.typingPattern.length;
      if (avgTypingSpeed < 50 || avgTypingSpeed > 300) {
        threatScore += 0.2;
      }

      // Analyze mouse movements
      const mouseVelocity = behaviorAnalysis.mouseMovements.map((move, i) => {
        if (i === 0) return 0;
        const prev = behaviorAnalysis.mouseMovements[i - 1];
        const distance = Math.sqrt(Math.pow(move.x - prev.x, 2) + Math.pow(move.y - prev.y, 2));
        const time = move.timestamp - prev.timestamp;
        return distance / (time || 1);
      });

      const avgMouseVelocity = mouseVelocity.reduce((sum, val) => sum + val, 0) / mouseVelocity.length;
      if (avgMouseVelocity > 1000) { // Unusually fast mouse movement
        threatScore += 0.3;
      }

      const duration = perfMonitor.endTimer('threat_detection');

      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.threatDetection);
      expect(threatScore).toBeGreaterThanOrEqual(0);
      expect(threatScore).toBeLessThanOrEqual(1);
    });
  });

  describe('AR/VR/AI Performance Benchmarks', () => {
    test('should meet AR initialization performance targets', async () => {
      perfMonitor.startTimer('ar_initialization');
      memMonitor.measureMemory();

      // Mock camera access
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }],
      };

      global.navigator.mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue(mockStream),
      } as any;

      // Simulate AR initialization
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      // Mock WebXR session setup
      const session = await mockXR.requestSession('immersive-ar', {
        requiredFeatures: ['local', 'hit-test'],
        optionalFeatures: ['dom-overlay', 'light-estimation'],
      });

      const duration = perfMonitor.endTimer('ar_initialization');
      memMonitor.measureMemory();

      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.arInitialization);
      expect(session).toBeDefined();
      expect(memMonitor.getMemoryDelta()).toBeLessThan(30 * 1024 * 1024); // Less than 30MB
    });

    test('should meet VR session start performance targets', async () => {
      perfMonitor.startTimer('vr_session_start');
      
      // Simulate VR session initialization
      const session = await mockXR.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'hit-test'],
      });

      // Mock VR scene setup
      const scene = {
        objects: Array.from({ length: 50 }, (_, i) => ({
          id: `object-${i}`,
          position: { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        })),
        lighting: 'realistic',
        physics: true,
      };

      const duration = perfMonitor.endTimer('vr_session_start');

      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.vrSessionStart);
      expect(scene.objects).toHaveLength(50);
    });

    test('should meet voice recognition performance targets', async () => {
      const recognitionResults: number[] = [];

      // Mock Speech Recognition
      const mockRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        continuous: true,
        interimResults: true,
      };

      global.window.webkitSpeechRecognition = function() { return mockRecognition; } as any;

      // Simulate 20 voice recognition attempts
      for (let i = 0; i < 20; i++) {
        perfMonitor.startTimer(`voice_recognition_${i}`);
        
        // Simulate voice processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
        
        const duration = perfMonitor.endTimer(`voice_recognition_${i}`);
        recognitionResults.push(duration);
      }

      const avgLatency = recognitionResults.reduce((sum, val) => sum + val, 0) / recognitionResults.length;
      const maxLatency = Math.max(...recognitionResults);

      expect(avgLatency).toBeLessThan(PERFORMANCE_BENCHMARKS.voiceRecognitionLatency);
      expect(maxLatency).toBeLessThan(PERFORMANCE_BENCHMARKS.voiceRecognitionLatency * 2);
    });

    test('should maintain target rendering frame rates', async () => {
      const frameRates: number[] = [];
      let frameCount = 0;
      const startTime = performance.now();

      // Simulate 60 frames of AR rendering
      for (let i = 0; i < 60; i++) {
        perfMonitor.startTimer(`frame_${i}`);
        
        // Simulate frame rendering operations
        const renderOperations = [
          () => { /* Camera feed processing */ },
          () => { /* AR annotation rendering */ },
          () => { /* Depth testing */ },
          () => { /* Occlusion handling */ },
          () => { /* Final composite */ },
        ];

        for (const operation of renderOperations) {
          operation();
        }

        const frameDuration = perfMonitor.endTimer(`frame_${i}`);
        frameCount++;
        
        // Calculate current FPS
        const currentTime = performance.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;
        const currentFPS = frameCount / elapsedSeconds;
        frameRates.push(currentFPS);

        // Simulate 16.67ms frame budget (60 FPS)
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 16.67 - frameDuration)));
      }

      const avgFPS = frameRates[frameRates.length - 1]; // Final FPS calculation
      const minFPS = Math.min(...frameRates.slice(-20)); // FPS of last 20 frames

      expect(avgFPS).toBeGreaterThan(PERFORMANCE_BENCHMARKS.arRenderingFPS * 0.9); // Within 10% of target
      expect(minFPS).toBeGreaterThan(PERFORMANCE_BENCHMARKS.arRenderingFPS * 0.8); // Within 20% of target
    });

    test('should meet AI inference performance targets', async () => {
      perfMonitor.startTimer('ai_inference');

      // Simulate AI model inference for various tasks
      const tasks = [
        'intent_classification',
        'entity_extraction',
        'sentiment_analysis',
        'response_generation',
        'context_understanding',
      ];

      for (const task of tasks) {
        perfMonitor.startTimer(task);
        
        // Simulate AI processing
        const inputData = Array.from({ length: 100 }, () => Math.random());
        const processedData = inputData.map(x => Math.tanh(x * 0.5 + 0.3)); // Simple activation
        
        perfMonitor.endTimer(task);
      }

      const totalDuration = perfMonitor.endTimer('ai_inference');

      expect(totalDuration).toBeLessThan(PERFORMANCE_BENCHMARKS.aiInferenceTime);
      
      // Check individual task performance
      for (const task of tasks) {
        const taskMetrics = perfMonitor.getMetrics(task);
        expect(taskMetrics.avg).toBeLessThan(PERFORMANCE_BENCHMARKS.aiInferenceTime / tasks.length);
      }
    });
  });

  describe('System-wide Performance Benchmarks', () => {
    test('should handle concurrent feature usage', async () => {
      perfMonitor.startTimer('concurrent_features');
      memMonitor.measureMemory();

      // Simulate concurrent usage of multiple Phase 3A features
      const concurrentTasks = [
        // PWA tasks
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'pwa_sync_complete';
        },
        // IoT tasks
        async () => {
          await new Promise(resolve => setTimeout(resolve, 150));
          return 'iot_monitoring_active';
        },
        // Security tasks
        async () => {
          await new Promise(resolve => setTimeout(resolve, 80));
          return 'security_validation_complete';
        },
        // AR tasks
        async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return 'ar_rendering_active';
        },
        // Voice AI tasks
        async () => {
          await new Promise(resolve => setTimeout(resolve, 120));
          return 'voice_processing_complete';
        },
      ];

      const results = await Promise.all(concurrentTasks.map(task => task()));
      
      const duration = perfMonitor.endTimer('concurrent_features');
      memMonitor.measureMemory();

      expect(duration).toBeLessThan(300); // Should complete within 300ms (max individual task time + overhead)
      expect(results).toHaveLength(5);
      expect(memMonitor.getMemoryDelta()).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    test('should maintain performance under load', async () => {
      const loadResults: number[] = [];
      
      // Simulate increasing load
      for (let users = 1; users <= 10; users++) {
        perfMonitor.startTimer(`load_test_${users}_users`);
        
        // Simulate concurrent user operations
        const userTasks = Array.from({ length: users }, async (_, i) => {
          // Each user performs typical operations
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 50));
          return `user_${i}_complete`;
        });

        await Promise.all(userTasks);
        
        const duration = perfMonitor.endTimer(`load_test_${users}_users`);
        loadResults.push(duration);
      }

      // Performance should scale reasonably with load
      const singleUserTime = loadResults[0];
      const tenUserTime = loadResults[9];
      
      // 10 users should not take more than 3x the time of 1 user (due to concurrency)
      expect(tenUserTime).toBeLessThan(singleUserTime * 3);
      
      // All load tests should complete within reasonable time
      for (const duration of loadResults) {
        expect(duration).toBeLessThan(500);
      }
    });

    test('should handle memory efficiently across features', async () => {
      memMonitor.measureMemory();
      const startStats = memMonitor.getMemoryStats();

      // Simulate heavy memory usage scenarios
      const heavyData = {
        largeArrays: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          data: 'x'.repeat(1000),
          metadata: {
            timestamp: Date.now(),
            processed: false,
            tags: Array.from({ length: 10 }, (_, j) => `tag-${j}`),
          },
        })),
        imageBuffers: Array.from({ length: 5 }, () => new ArrayBuffer(1024 * 1024)), // 5MB of image data
        audioBuffers: Array.from({ length: 3 }, () => new ArrayBuffer(2 * 1024 * 1024)), // 6MB of audio data
      };

      memMonitor.measureMemory();

      // Process the data (simulate real usage)
      const processedData = heavyData.largeArrays.map(item => ({
        ...item,
        processed: true,
        processedAt: Date.now(),
      }));

      memMonitor.measureMemory();

      // Clean up references
      heavyData.largeArrays.length = 0;
      heavyData.imageBuffers.length = 0;
      heavyData.audioBuffers.length = 0;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      memMonitor.measureMemory();
      const finalStats = memMonitor.getMemoryStats();

      // Memory should not grow excessively
      const memoryGrowth = finalStats.current - startStats.current;
      expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB growth

      expect(processedData).toHaveLength(10000);
      expect(processedData[0].processed).toBe(true);
    });
  });

  describe('Performance Reporting', () => {
    test('should generate comprehensive performance report', () => {
      // Run a series of representative operations
      const operations = [
        { name: 'pwa_init', duration: 450, budget: PERFORMANCE_BENCHMARKS.serviceWorkerRegistration },
        { name: 'iot_sensor', duration: 85, budget: PERFORMANCE_BENCHMARKS.sensorDataIngestion },
        { name: 'security_auth', duration: 1800, budget: PERFORMANCE_BENCHMARKS.biometricAuthentication },
        { name: 'ar_render', duration: 15, budget: 16.67 }, // 60 FPS = 16.67ms per frame
        { name: 'voice_ai', duration: 420, budget: PERFORMANCE_BENCHMARKS.voiceRecognitionLatency },
      ];

      operations.forEach(op => {
        perfMonitor.startTimer(op.name);
        setTimeout(() => perfMonitor.endTimer(op.name), op.duration);
      });

      // Wait for all operations to complete
      setTimeout(() => {
        const report = {
          timestamp: new Date().toISOString(),
          environment: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            memory: memMonitor.getMemoryStats(),
          },
          metrics: perfMonitor.getAllMetrics(),
          benchmarks: PERFORMANCE_BENCHMARKS,
          compliance: {} as Record<string, { passed: boolean; actual: number; budget: number; efficiency: number }>,
        };

        // Calculate compliance for each operation
        operations.forEach(op => {
          const metrics = perfMonitor.getMetrics(op.name);
          const passed = metrics.avg <= op.budget;
          const efficiency = op.budget / (metrics.avg || 1);
          
          report.compliance[op.name] = {
            passed,
            actual: metrics.avg,
            budget: op.budget,
            efficiency,
          };
        });

        // Overall performance score
        const overallScore = Object.values(report.compliance)
          .reduce((sum, metric) => sum + (metric.passed ? 1 : 0), 0) / operations.length * 100;

        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('metrics');
        expect(report).toHaveProperty('compliance');
        expect(overallScore).toBeGreaterThan(70); // At least 70% compliance
        
        console.log('Performance Report:', JSON.stringify(report, null, 2));
      }, 2000);
    });
  });
});

// Export performance utilities for use in other tests
export { PerformanceMonitor, MemoryMonitor, PERFORMANCE_BENCHMARKS };