/**
 * Phase 3A Mobile Security Features Validation Test Suite
 * Tasks 263-268: Mobile security, biometric auth, threat detection, encryption, compliance validation
 */

import { jest } from '@jest/globals';
import { 
  MobileBiometricAuthService,
  MobileBiometricType,
  type MobileAuthResult,
  type MobileDeviceCapabilities 
} from '@/lib/security/mobile-biometric-auth';
import { MobileThreatDetection } from '@/lib/security/mobile-threat-detection';
import { MobileDataEncryption } from '@/lib/security/mobile-data-encryption';
import { MobileSessionSecurity } from '@/lib/security/mobile-session-security';
import { MobileComplianceAudit } from '@/lib/security/mobile-compliance-audit';

// Mock WebAuthn API
const mockPublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(() => Promise.resolve(true)),
  create: jest.fn(),
  get: jest.fn(),
};

Object.defineProperty(global, 'PublicKeyCredential', {
  value: mockPublicKeyCredential,
  writable: true,
});

// Mock Credentials API
const mockCredentials = {
  create: jest.fn(),
  get: jest.fn(),
};

Object.defineProperty(global.navigator, 'credentials', {
  value: mockCredentials,
  writable: true,
});

// Mock crypto API for security testing
const mockCrypto = {
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
  },
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock device APIs
const setupMobileDeviceMocks = () => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      enumerateDevices: jest.fn(() => Promise.resolve([
        { kind: 'videoinput', label: 'Front Camera' },
        { kind: 'videoinput', label: 'Rear Camera' },
        { kind: 'audioinput', label: 'Microphone' },
        { kind: 'audiooutput', label: 'Speaker' },
      ])),
      getUserMedia: jest.fn(),
    },
    writable: true,
  });

  Object.defineProperty(global.navigator, 'maxTouchPoints', {
    value: 10,
    writable: true,
  });

  Object.defineProperty(global.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    writable: true,
  });

  Object.defineProperty(global.window, 'screen', {
    value: {
      width: 1024,
      height: 768,
    },
    writable: true,
  });

  // Mock device sensors
  Object.defineProperty(global.window, 'DeviceMotionEvent', {
    value: function DeviceMotionEvent() {},
    writable: true,
  });

  Object.defineProperty(global.window, 'DeviceOrientationEvent', {
    value: function DeviceOrientationEvent() {},
    writable: true,
  });
};

describe('Phase 3A Mobile Security Validation', () => {
  beforeAll(() => {
    setupMobileDeviceMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 263: Biometric Authentication System', () => {
    test('should detect mobile device capabilities', async () => {
      const biometricService = MobileBiometricAuthService.getInstance();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Access the private method through reflection for testing
      const deviceCapabilities = (biometricService as any).deviceCapabilities as MobileDeviceCapabilities;
      
      expect(deviceCapabilities).toBeDefined();
      expect(deviceCapabilities.isTablet).toBe(true);
      expect(deviceCapabilities.touchCapabilities.multiTouch).toBe(true);
      expect(deviceCapabilities.securityLevel).toBeOneOf(['basic', 'enhanced', 'enterprise']);
    });

    test('should enroll biometric with proper validation', async () => {
      const biometricService = MobileBiometricAuthService.getInstance();
      
      // Mock successful credential creation
      mockCredentials.create.mockResolvedValue({
        id: 'credential-123',
        rawId: new ArrayBuffer(16),
        response: {
          clientDataJSON: new ArrayBuffer(100),
          attestationObject: new ArrayBuffer(200),
        },
        type: 'public-key',
      });

      const result = await biometricService.enrollMobileBiometric(
        'user-123',
        'restaurant-123',
        MobileBiometricType.FINGERPRINT,
        {
          workShifts: ['morning', 'evening'],
          requireLiveness: true,
          antiSpoofing: true,
        }
      );

      expect(result.success).toBe(true);
      expect(result.enrollmentId).toBeDefined();
      expect(mockCredentials.create).toHaveBeenCalled();
    });

    test('should handle biometric authentication with fraud detection', async () => {
      const biometricService = MobileBiometricAuthService.getInstance();
      
      // First enroll a biometric
      await biometricService.enrollMobileBiometric(
        'user-123',
        'restaurant-123',
        MobileBiometricType.FINGERPRINT
      );

      // Mock authentication attempt
      const authResult = await biometricService.authenticateMobileBiometric(
        'user-123',
        MobileBiometricType.FINGERPRINT,
        {
          requireHighConfidence: true,
          allowFallback: true,
        }
      );

      expect(authResult).toBeDefined();
      expect(authResult.biometricType).toBe(MobileBiometricType.FINGERPRINT);
      expect(authResult.confidenceScore).toBeGreaterThan(0);
      expect(authResult.fraudScore).toBeLessThan(0.5);
      expect(authResult.environmentalFactors).toBeDefined();
    });

    test('should perform liveness detection', async () => {
      const biometricService = MobileBiometricAuthService.getInstance();
      
      // Test face liveness detection
      const faceLivenessResult = await (biometricService as any).performLivenessDetection(
        MobileBiometricType.FACE_ID
      );
      
      expect(faceLivenessResult.passed).toBe(true);
      expect(faceLivenessResult.confidence).toBeGreaterThan(0.8);
      expect(faceLivenessResult.challenges).toContain('blink_detection');
      
      // Test fingerprint liveness detection
      const fingerprintLivenessResult = await (biometricService as any).performLivenessDetection(
        MobileBiometricType.FINGERPRINT
      );
      
      expect(fingerprintLivenessResult.passed).toBe(true);
      expect(fingerprintLivenessResult.confidence).toBeGreaterThan(0.8);
      expect(fingerprintLivenessResult.challenges).toContain('blood_flow');
    });

    test('should handle multi-modal biometric authentication', async () => {
      const biometricService = MobileBiometricAuthService.getInstance();
      
      // Enroll multiple biometric types
      await biometricService.enrollMobileBiometric('user-123', 'restaurant-123', MobileBiometricType.FINGERPRINT);
      await biometricService.enrollMobileBiometric('user-123', 'restaurant-123', MobileBiometricType.FACE_ID);
      
      const authResult = await biometricService.authenticateMobileBiometric(
        'user-123',
        MobileBiometricType.MULTI_MODAL
      );

      expect(authResult.fallbackOptions.availableMethods).toHaveLength(2);
      expect(authResult.deviceTrustScore).toBeGreaterThan(0.5);
    });

    test('should assess environmental conditions', async () => {
      const biometricService = MobileBiometricAuthService.getInstance();
      
      const conditions = await (biometricService as any).assessEnvironmentalConditions();
      
      expect(conditions.lightingCondition).toBeOneOf(['poor', 'adequate', 'good', 'excellent']);
      expect(conditions.noiseLevel).toBeOneOf(['quiet', 'moderate', 'noisy', 'very_noisy']);
      expect(conditions.deviceStability).toBeOneOf(['stable', 'slight_movement', 'unstable']);
      expect(conditions.userStress).toBeOneOf(['low', 'moderate', 'high']);
    });
  });

  describe('Task 264: Mobile Threat Detection', () => {
    test('should detect device tampering attempts', async () => {
      const threatDetection = new MobileThreatDetection();
      
      const tamperingResult = await threatDetection.detectDeviceTampering();
      
      expect(tamperingResult).toHaveProperty('isRooted');
      expect(tamperingResult).toHaveProperty('hasDebugger');
      expect(tamperingResult).toHaveProperty('hasEmulator');
      expect(tamperingResult).toHaveProperty('riskLevel');
      expect(tamperingResult.riskLevel).toBeOneOf(['low', 'medium', 'high', 'critical']);
    });

    test('should monitor network security threats', async () => {
      const threatDetection = new MobileThreatDetection();
      
      const networkThreats = await threatDetection.monitorNetworkThreats();
      
      expect(networkThreats).toHaveProperty('sslPinningActive');
      expect(networkThreats).toHaveProperty('certificateValidation');
      expect(networkThreats).toHaveProperty('manInTheMiddle');
      expect(networkThreats).toHaveProperty('unsecureConnections');
    });

    test('should detect application integrity violations', async () => {
      const threatDetection = new MobileThreatDetection();
      
      const integrityResult = await threatDetection.checkApplicationIntegrity();
      
      expect(integrityResult).toHaveProperty('codeIntegrity');
      expect(integrityResult).toHaveProperty('checksumValidation');
      expect(integrityResult).toHaveProperty('antiTamperingActive');
      expect(integrityResult).toHaveProperty('trustScore');
      expect(integrityResult.trustScore).toBeGreaterThanOrEqual(0);
      expect(integrityResult.trustScore).toBeLessThanOrEqual(1);
    });

    test('should analyze behavioral anomalies', async () => {
      const threatDetection = new MobileThreatDetection();
      
      const behaviorAnalysis = await threatDetection.analyzeBehavioralAnomalies('user-123', {
        touchPatterns: [{ x: 100, y: 200, pressure: 0.5, timestamp: Date.now() }],
        navigationPatterns: ['dashboard', 'sop', 'training'],
        sessionDuration: 3600000, // 1 hour
        locationPattern: { lat: 45.4215, lng: -75.6972 },
      });
      
      expect(behaviorAnalysis).toHaveProperty('anomalyScore');
      expect(behaviorAnalysis).toHaveProperty('suspiciousActivities');
      expect(behaviorAnalysis).toHaveProperty('recommendedActions');
      expect(behaviorAnalysis.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(behaviorAnalysis.anomalyScore).toBeLessThanOrEqual(1);
    });

    test('should implement real-time security monitoring', async () => {
      const threatDetection = new MobileThreatDetection();
      
      const monitoringResult = await threatDetection.startRealTimeMonitoring({
        userId: 'user-123',
        sessionId: 'session-123',
        onThreatDetected: jest.fn(),
        onSecurityEvent: jest.fn(),
      });
      
      expect(monitoringResult.success).toBe(true);
      expect(monitoringResult.monitoringId).toBeDefined();
      expect(monitoringResult.activeMonitors).toContain('device_tampering');
      expect(monitoringResult.activeMonitors).toContain('network_security');
      expect(monitoringResult.activeMonitors).toContain('behavioral_analysis');
    });
  });

  describe('Task 265: Mobile Data Encryption', () => {
    test('should encrypt sensitive data at rest', async () => {
      const encryption = new MobileDataEncryption();
      
      const sensitiveData = {
        pin: '1234',
        biometricTemplate: 'biometric-data-template',
        sessionToken: 'secure-session-token',
        personalInfo: { name: 'John Doe', email: 'john@example.com' },
      };

      const encryptedData = await encryption.encryptData(sensitiveData, 'AES-GCM');
      
      expect(encryptedData).toHaveProperty('encryptedPayload');
      expect(encryptedData).toHaveProperty('iv');
      expect(encryptedData).toHaveProperty('authTag');
      expect(encryptedData).toHaveProperty('keyId');
      expect(encryptedData.encryptedPayload).not.toEqual(JSON.stringify(sensitiveData));
    });

    test('should decrypt data with proper key management', async () => {
      const encryption = new MobileDataEncryption();
      
      const originalData = { secret: 'confidential-information' };
      const encrypted = await encryption.encryptData(originalData, 'AES-GCM');
      const decrypted = await encryption.decryptData(encrypted);
      
      expect(decrypted).toEqual(originalData);
    });

    test('should implement secure key derivation', async () => {
      const encryption = new MobileDataEncryption();
      
      const keyDerivationResult = await encryption.deriveSecureKey({
        password: 'user-password',
        salt: 'unique-salt',
        iterations: 100000,
        keyLength: 256,
        algorithm: 'PBKDF2',
      });
      
      expect(keyDerivationResult).toHaveProperty('derivedKey');
      expect(keyDerivationResult).toHaveProperty('salt');
      expect(keyDerivationResult).toHaveProperty('iterations');
      expect(keyDerivationResult.derivedKey).toHaveLength(64); // 256 bits = 64 hex chars
    });

    test('should secure local storage encryption', async () => {
      const encryption = new MobileDataEncryption();
      
      const secureStorage = await encryption.createSecureStorage('restaurant-123');
      
      // Store encrypted data
      await secureStorage.setItem('sensitive-key', { data: 'sensitive-value' });
      
      // Retrieve and decrypt data
      const retrievedData = await secureStorage.getItem('sensitive-key');
      
      expect(retrievedData).toEqual({ data: 'sensitive-value' });
      
      // Verify data is encrypted in storage
      const rawStorage = localStorage.getItem('encrypted_sensitive-key');
      expect(rawStorage).toBeDefined();
      expect(rawStorage).not.toContain('sensitive-value');
    });

    test('should implement secure communication protocols', async () => {
      const encryption = new MobileDataEncryption();
      
      const secureComm = await encryption.establishSecureChannel({
        endpoint: 'https://api.krongthai.com',
        certificatePinning: true,
        mutualTLS: true,
        encryptionMode: 'end-to-end',
      });
      
      expect(secureComm).toHaveProperty('channelId');
      expect(secureComm).toHaveProperty('encryptionKey');
      expect(secureComm).toHaveProperty('certificate');
      expect(secureComm.isSecure).toBe(true);
    });
  });

  describe('Task 266: Mobile Session Security', () => {
    test('should manage secure session lifecycle', async () => {
      const sessionSecurity = new MobileSessionSecurity();
      
      const sessionResult = await sessionSecurity.createSecureSession({
        userId: 'user-123',
        deviceId: 'device-123',
        restaurantId: 'restaurant-123',
        biometricVerified: true,
        rolePermissions: ['sop_access', 'training_access'],
      });
      
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.sessionId).toBeDefined();
      expect(sessionResult.sessionToken).toBeDefined();
      expect(sessionResult.expiresAt).toBeInstanceOf(Date);
      expect(sessionResult.securityLevel).toBeOneOf(['basic', 'enhanced', 'high']);
    });

    test('should validate session integrity', async () => {
      const sessionSecurity = new MobileSessionSecurity();
      
      // Create session first
      const session = await sessionSecurity.createSecureSession({
        userId: 'user-123', 
        deviceId: 'device-123',
        restaurantId: 'restaurant-123',
      });
      
      const validationResult = await sessionSecurity.validateSession(session.sessionToken);
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.userId).toBe('user-123');
      expect(validationResult.securityChecks).toHaveProperty('tokenIntegrity');
      expect(validationResult.securityChecks).toHaveProperty('deviceBinding');
      expect(validationResult.securityChecks).toHaveProperty('locationConsistency');
    });

    test('should implement session hijacking protection', async () => {
      const sessionSecurity = new MobileSessionSecurity();
      
      const protectionResult = await sessionSecurity.enableHijackingProtection({
        sessionId: 'session-123',
        ipAddressValidation: true,
        deviceFingerprintValidation: true,
        behavioralAnalysis: true,
        tokenRotation: true,
        rotationInterval: 3600000, // 1 hour
      });
      
      expect(protectionResult.success).toBe(true);
      expect(protectionResult.protectionMechanisms).toContain('ip_validation');
      expect(protectionResult.protectionMechanisms).toContain('device_fingerprint');
      expect(protectionResult.protectionMechanisms).toContain('behavioral_analysis');
      expect(protectionResult.protectionMechanisms).toContain('token_rotation');
    });

    test('should handle session timeout and cleanup', async () => {
      const sessionSecurity = new MobileSessionSecurity();
      
      // Create session with short timeout for testing
      const session = await sessionSecurity.createSecureSession({
        userId: 'user-123',
        deviceId: 'device-123',
        restaurantId: 'restaurant-123',
        timeoutMinutes: 1, // 1 minute timeout
      });
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 61000));
      
      const validationResult = await sessionSecurity.validateSession(session.sessionToken);
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.reason).toContain('expired');
    });

    test('should implement secure session storage', async () => {
      const sessionSecurity = new MobileSessionSecurity();
      
      const storageResult = await sessionSecurity.configureSecureStorage({
        encryptionEnabled: true,
        keyRotation: true,
        autoCleanup: true,
        maxStorageTime: 86400000, // 24 hours
      });
      
      expect(storageResult.success).toBe(true);
      expect(storageResult.encryptionActive).toBe(true);
      expect(storageResult.cleanupScheduled).toBe(true);
    });
  });

  describe('Task 267: Mobile Security Compliance', () => {
    test('should audit security compliance requirements', async () => {
      const complianceAudit = new MobileComplianceAudit();
      
      const auditResult = await complianceAudit.performSecurityAudit({
        standards: ['GDPR', 'CCPA', 'SOC2', 'ISO27001'],
        scope: ['authentication', 'data_protection', 'session_management'],
        includeRecommendations: true,
      });
      
      expect(auditResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(auditResult.overallScore).toBeLessThanOrEqual(100);
      expect(auditResult.complianceResults).toHaveProperty('GDPR');
      expect(auditResult.complianceResults).toHaveProperty('CCPA');
      expect(auditResult.vulnerabilities).toBeInstanceOf(Array);
      expect(auditResult.recommendations).toBeInstanceOf(Array);
    });

    test('should validate data privacy requirements', async () => {
      const complianceAudit = new MobileComplianceAudit();
      
      const privacyResult = await complianceAudit.validateDataPrivacy({
        personalDataTypes: ['biometric', 'location', 'behavioral'],
        processingPurposes: ['authentication', 'fraud_prevention'],
        retentionPolicies: true,
        consentManagement: true,
        dataMinimization: true,
      });
      
      expect(privacyResult.compliant).toBe(true);
      expect(privacyResult.consentStatus).toBeDefined();
      expect(privacyResult.dataProcessingLegal).toBe(true);
      expect(privacyResult.retentionCompliant).toBe(true);
    });

    test('should check security control effectiveness', async () => {
      const complianceAudit = new MobileComplianceAudit();
      
      const controlsResult = await complianceAudit.assessSecurityControls({
        controlTypes: ['preventive', 'detective', 'corrective'],
        securityDomains: ['access_control', 'data_protection', 'incident_response'],
        testPenetration: true,
      });
      
      expect(controlsResult.controlsEffective).toBeGreaterThanOrEqual(80);
      expect(controlsResult.testedControls).toBeInstanceOf(Array);
      expect(controlsResult.weaknesses).toBeInstanceOf(Array);
      expect(controlsResult.penetrationTestResults).toBeDefined();
    });

    test('should generate compliance reports', async () => {
      const complianceAudit = new MobileComplianceAudit();
      
      const report = await complianceAudit.generateComplianceReport({
        auditPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
        includeExecutiveSummary: true,
        includeTechnicalDetails: true,
        includeRemediation: true,
        format: 'comprehensive',
      });
      
      expect(report.executiveSummary).toBeDefined();
      expect(report.technicalFindings).toBeInstanceOf(Array);
      expect(report.remediationPlan).toBeInstanceOf(Array);
      expect(report.complianceMatrix).toBeDefined();
      expect(report.riskAssessment).toBeDefined();
    });
  });

  describe('Task 268: Mobile Penetration Testing', () => {
    test('should simulate common mobile attack vectors', async () => {
      const { MobilePenetrationTesting } = await import('@/lib/security/mobile-penetration-testing');
      const penTest = new MobilePenetrationTesting();
      
      const attackSimulation = await penTest.simulateAttacks({
        attackTypes: [
          'man_in_the_middle',
          'certificate_pinning_bypass',
          'data_interception',
          'session_hijacking',
          'biometric_spoofing',
        ],
        intensity: 'moderate',
        duration: 60000, // 1 minute
      });
      
      expect(attackSimulation.attacksExecuted).toBeGreaterThan(0);
      expect(attackSimulation.vulnerabilitiesFound).toBeInstanceOf(Array);
      expect(attackSimulation.successfulAttacks).toBeInstanceOf(Array);
      expect(attackSimulation.defendedAttacks).toBeInstanceOf(Array);
      expect(attackSimulation.overallSecurityScore).toBeGreaterThanOrEqual(0);
    });

    test('should test authentication system resilience', async () => {
      const { MobilePenetrationTesting } = await import('@/lib/security/mobile-penetration-testing');
      const penTest = new MobilePenetrationTesting();
      
      const authTestResult = await penTest.testAuthenticationResilience({
        attackMethods: ['brute_force', 'credential_stuffing', 'biometric_replay'],
        maxAttempts: 1000,
        timeoutMinutes: 5,
      });
      
      expect(authTestResult.bruteForceResistant).toBe(true);
      expect(authTestResult.credentialStuffingBlocked).toBe(true);
      expect(authTestResult.biometricSpoofingPrevented).toBe(true);
      expect(authTestResult.lockoutMechanismActive).toBe(true);
    });

    test('should validate encryption strength', async () => {
      const { MobilePenetrationTesting } = await import('@/lib/security/mobile-penetration-testing');
      const penTest = new MobilePenetrationTesting();
      
      const encryptionTest = await penTest.testEncryptionStrength({
        algorithms: ['AES-256-GCM', 'ChaCha20-Poly1305', 'RSA-4096'],
        keyManagement: true,
        certificateValidation: true,
      });
      
      expect(encryptionTest.algorithmStrength).toBeGreaterThanOrEqual(256);
      expect(encryptionTest.keyManagementSecure).toBe(true);
      expect(encryptionTest.certificateValidationActive).toBe(true);
      expect(encryptionTest.vulnerableProtocols).toHaveLength(0);
    });

    test('should assess network security', async () => {
      const { MobilePenetrationTesting } = await import('@/lib/security/mobile-penetration-testing');
      const penTest = new MobilePenetrationTesting();
      
      const networkTest = await penTest.assessNetworkSecurity({
        endpoints: [
          'https://api.krongthai.com/auth',
          'https://api.krongthai.com/sop',
          'https://api.krongthai.com/training',
        ],
        testSSLPinning: true,
        testCertificateValidation: true,
        testManInTheMiddle: true,
      });
      
      expect(networkTest.sslPinningActive).toBe(true);
      expect(networkTest.certificateValidationStrict).toBe(true);
      expect(networkTest.manInTheMiddleBlocked).toBe(true);
      expect(networkTest.secureEndpoints).toHaveLength(3);
    });
  });

  describe('Mobile Security Integration Tests', () => {
    test('should integrate with existing authentication system', async () => {
      const biometricService = MobileBiometricAuthService.getInstance();
      
      // Test integration with PIN authentication
      const integrationResult = await biometricService.authenticateMobileBiometric(
        'user-123',
        MobileBiometricType.FINGERPRINT,
        {
          allowFallback: true,
          sessionId: 'existing-session-123',
        }
      );
      
      expect(integrationResult.fallbackOptions.recommendedFallback).toBe('pin');
      expect(integrationResult.sessionId).toBe('existing-session-123');
    });

    test('should work with restaurant role-based access control', async () => {
      const sessionSecurity = new MobileSessionSecurity();
      
      const managerSession = await sessionSecurity.createSecureSession({
        userId: 'manager-123',
        deviceId: 'device-123',
        restaurantId: 'restaurant-123',
        rolePermissions: ['sop_manage', 'training_manage', 'user_manage'],
      });
      
      const staffSession = await sessionSecurity.createSecureSession({
        userId: 'staff-123',
        deviceId: 'device-124',
        restaurantId: 'restaurant-123',
        rolePermissions: ['sop_access', 'training_access'],
      });
      
      expect(managerSession.securityLevel).toBe('high');
      expect(staffSession.securityLevel).toBeOneOf(['basic', 'enhanced']);
    });

    test('should support bilingual security messages', async () => {
      const threatDetection = new MobileThreatDetection();
      
      const threats = await threatDetection.detectDeviceTampering();
      
      if (threats.riskLevel !== 'low') {
        const securityMessage = await threatDetection.getLocalizedSecurityMessage(
          threats.detectedThreats[0],
          'fr' // French locale
        );
        
        expect(securityMessage.title).toBeDefined();
        expect(securityMessage.description).toBeDefined();
        expect(securityMessage.recommendedAction).toBeDefined();
        expect(securityMessage.locale).toBe('fr');
      }
    });
  });

  describe('Mobile Security Performance Tests', () => {
    test('should maintain performance during security operations', async () => {
      const biometricService = MobileBiometricAuthService.getInstance();
      const startTime = Date.now();
      
      // Simulate multiple concurrent authentications
      const authPromises = Array.from({ length: 5 }, (_, i) =>
        biometricService.authenticateMobileBiometric(`user-${i}`, MobileBiometricType.FINGERPRINT)
      );
      
      const results = await Promise.all(authPromises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results).toHaveLength(5);
    });

    test('should handle memory efficiently during encryption operations', async () => {
      const encryption = new MobileDataEncryption();
      
      // Test with large data set
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'Some test data that simulates real restaurant SOP content'.repeat(10),
      }));
      
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const encrypted = await encryption.encryptData(largeData, 'AES-GCM');
      const decrypted = await encryption.decryptData(encrypted);
      
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = endMemory - startMemory;
      
      expect(decrypted).toEqual(largeData);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });
});

// Performance benchmarks for mobile security features
export const MOBILE_SECURITY_PERFORMANCE_BENCHMARKS = {
  biometricEnrollment: 3000, // ms
  biometricAuthentication: 2000, // ms
  dataEncryption: 500, // ms per MB
  dataDecryption: 300, // ms per MB
  threatDetection: 1000, // ms
  sessionValidation: 100, // ms
  complianceAudit: 10000, // ms
  penetrationTesting: 60000, // ms for full test suite
};

// Test utility functions for mobile security validation
export const MobileSecurityTestUtils = {
  createMockDeviceCapabilities: (): MobileDeviceCapabilities => ({
    isTablet: true,
    screenSize: { width: 1024, height: 768 },
    touchCapabilities: {
      multiTouch: true,
      pressureSensitive: true,
      maxTouchPoints: 10,
    },
    sensors: {
      accelerometer: true,
      gyroscope: true,
      magnetometer: true,
      ambientLight: false,
      proximity: false,
    },
    camera: {
      front: true,
      rear: true,
      frontResolution: '1920x1080',
      rearResolution: '4096x3072',
    },
    audio: {
      microphone: true,
      speakers: true,
      noiseCancellation: true,
    },
    biometricHardware: [
      MobileBiometricType.FINGERPRINT,
      MobileBiometricType.FACE_ID,
      MobileBiometricType.BEHAVIORAL,
    ],
    securityLevel: 'enhanced',
  }),

  simulateSecurityThreat: (threatType: string) => ({
    type: threatType,
    severity: 'medium',
    detected: true,
    timestamp: new Date(),
    mitigated: false,
  }),

  generateSecureTestData: (size: number) => ({
    id: `test-${Date.now()}`,
    data: Array.from({ length: size }, () => Math.random().toString(36)).join(''),
    sensitive: true,
    encrypted: false,
  }),
};