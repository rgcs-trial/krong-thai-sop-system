/**
 * Biometric Authentication System
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements biometric authentication with PIN fallback for compatible tablets.
 * Supports fingerprint, face recognition, and voice authentication when available.
 */

import { z } from 'zod';
import { envConfig } from '@/lib/env-config';

// Biometric authentication types
export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'face-id',
  VOICE = 'voice',
  IRIS = 'iris',
  NONE = 'none'
}

// Authentication challenge result
export interface BiometricAuthResult {
  success: boolean;
  type: BiometricType;
  fallbackToPIN: boolean;
  error?: string;
  deviceId?: string;
  timestamp: Date;
  confidence?: number; // 0-1 confidence score
}

// Biometric enrollment result
export interface BiometricEnrollmentResult {
  success: boolean;
  type: BiometricType;
  enrollmentId: string;
  template?: string; // Encrypted biometric template
  error?: string;
}

// Device capability check
export interface BiometricCapabilities {
  isAvailable: boolean;
  supportedTypes: BiometricType[];
  isEnrolled: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  hardwareSupported: boolean;
  permissionsGranted: boolean;
}

/**
 * Enhanced Biometric Authentication Service
 */
export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private isWebAuthnSupported: boolean = false;
  private availableTypes: Set<BiometricType> = new Set();

  private constructor() {
    this.initializeCapabilities();
  }

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Initialize and detect available biometric capabilities
   */
  private async initializeCapabilities(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Check WebAuthn support
      this.isWebAuthnSupported = 'navigator' in window && 
                                 'credentials' in navigator &&
                                 'create' in navigator.credentials;

      // Check specific biometric types
      await this.detectAvailableBiometrics();
      
      console.log('Biometric capabilities initialized:', {
        webAuthnSupported: this.isWebAuthnSupported,
        availableTypes: Array.from(this.availableTypes)
      });
    } catch (error) {
      console.warn('Failed to initialize biometric capabilities:', error);
    }
  }

  /**
   * Detect available biometric authentication methods
   */
  private async detectAvailableBiometrics(): Promise<void> {
    if (!this.isWebAuthnSupported) return;

    try {
      // Check if biometric authenticators are available
      const isAvailable = await this.isWebAuthnAvailable();
      
      if (isAvailable) {
        // Try to detect specific types based on user agent and available APIs
        this.detectBiometricTypes();
      }
    } catch (error) {
      console.warn('Error detecting biometric types:', error);
    }
  }

  /**
   * Check if WebAuthn is available and functional
   */
  private async isWebAuthnAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported) return false;

    try {
      // Test if we can query for available authenticators
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.warn('WebAuthn availability check failed:', error);
      return false;
    }
  }

  /**
   * Detect specific biometric types based on device capabilities
   */
  private detectBiometricTypes(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';

    // Detect iOS devices (Touch ID / Face ID)
    if (/ipad|iphone|ipod/.test(userAgent) || platform.includes('mac')) {
      this.availableTypes.add(BiometricType.FINGERPRINT);
      this.availableTypes.add(BiometricType.FACE_ID);
    }

    // Detect Android devices (Fingerprint)
    if (/android/.test(userAgent)) {
      this.availableTypes.add(BiometricType.FINGERPRINT);
    }

    // Detect Windows Hello support
    if (/windows/.test(userAgent) && this.isWebAuthnSupported) {
      this.availableTypes.add(BiometricType.FINGERPRINT);
      this.availableTypes.add(BiometricType.FACE_ID);
    }

    // General WebAuthn support indicates some form of biometric
    if (this.isWebAuthnSupported && this.availableTypes.size === 0) {
      this.availableTypes.add(BiometricType.FINGERPRINT); // Default assumption
    }
  }

  /**
   * Get current device biometric capabilities
   */
  public async getCapabilities(): Promise<BiometricCapabilities> {
    await this.initializeCapabilities();

    const isAvailable = this.isWebAuthnSupported && this.availableTypes.size > 0;
    
    return {
      isAvailable,
      supportedTypes: Array.from(this.availableTypes),
      isEnrolled: isAvailable && await this.checkEnrollmentStatus(),
      securityLevel: this.getSecurityLevel(),
      hardwareSupported: this.isWebAuthnSupported,
      permissionsGranted: await this.checkPermissions()
    };
  }

  /**
   * Check if user has enrolled biometric credentials
   */
  private async checkEnrollmentStatus(): Promise<boolean> {
    if (!this.isWebAuthnSupported) return false;

    try {
      // Check if any credentials are registered for this domain
      const credentials = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [],
          userVerification: 'required',
          timeout: 5000
        }
      });

      return credentials !== null;
    } catch (error) {
      // Error usually means no credentials are enrolled
      return false;
    }
  }

  /**
   * Get security level based on available biometric types
   */
  private getSecurityLevel(): 'low' | 'medium' | 'high' {
    if (this.availableTypes.has(BiometricType.IRIS)) return 'high';
    if (this.availableTypes.has(BiometricType.FACE_ID)) return 'high';
    if (this.availableTypes.has(BiometricType.FINGERPRINT)) return 'medium';
    if (this.availableTypes.has(BiometricType.VOICE)) return 'medium';
    return 'low';
  }

  /**
   * Check if necessary permissions are granted
   */
  private async checkPermissions(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;

    try {
      // Check camera permission for face recognition
      if (this.availableTypes.has(BiometricType.FACE_ID)) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (cameraPermission.state === 'denied') return false;
      }

      // Check microphone permission for voice recognition
      if (this.availableTypes.has(BiometricType.VOICE)) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (micPermission.state === 'denied') return false;
      }

      return true;
    } catch (error) {
      console.warn('Permission check failed:', error);
      return true; // Assume permissions are okay if we can't check
    }
  }

  /**
   * Enroll user for biometric authentication
   */
  public async enrollBiometric(
    userId: string, 
    preferredType?: BiometricType
  ): Promise<BiometricEnrollmentResult> {
    const capabilities = await this.getCapabilities();
    
    if (!capabilities.isAvailable) {
      return {
        success: false,
        type: BiometricType.NONE,
        enrollmentId: '',
        error: 'Biometric authentication not available on this device'
      };
    }

    if (!capabilities.permissionsGranted) {
      return {
        success: false,
        type: BiometricType.NONE,
        enrollmentId: '',
        error: 'Required permissions not granted'
      };
    }

    try {
      // Determine the biometric type to use
      const typeToUse = preferredType && capabilities.supportedTypes.includes(preferredType)
        ? preferredType
        : capabilities.supportedTypes[0];

      // Create WebAuthn credential
      const credential = await this.createWebAuthnCredential(userId, typeToUse);
      
      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      const enrollmentId = this.generateEnrollmentId();
      
      // Store enrollment data (encrypted)
      await this.storeBiometricEnrollment(userId, enrollmentId, typeToUse, credential);

      return {
        success: true,
        type: typeToUse,
        enrollmentId,
        template: this.encryptBiometricTemplate(credential)
      };

    } catch (error) {
      console.error('Biometric enrollment failed:', error);
      return {
        success: false,
        type: BiometricType.NONE,
        enrollmentId: '',
        error: error instanceof Error ? error.message : 'Enrollment failed'
      };
    }
  }

  /**
   * Create WebAuthn credential for biometric authentication
   */
  private async createWebAuthnCredential(
    userId: string, 
    biometricType: BiometricType
  ): Promise<PublicKeyCredential | null> {
    if (!this.isWebAuthnSupported) return null;

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);

    const createOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'Krong Thai SOP System',
          id: window.location.hostname
        },
        user: {
          id: userIdBytes,
          name: `${userId}@krongthai.com`,
          displayName: `Restaurant Staff ${userId}`
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'direct'
      }
    };

    try {
      const credential = await navigator.credentials.create(createOptions);
      return credential as PublicKeyCredential;
    } catch (error) {
      console.error('WebAuthn credential creation failed:', error);
      return null;
    }
  }

  /**
   * Authenticate using biometric methods
   */
  public async authenticateBiometric(
    userId: string,
    challenge?: string
  ): Promise<BiometricAuthResult> {
    const capabilities = await this.getCapabilities();
    
    if (!capabilities.isAvailable || !capabilities.isEnrolled) {
      return {
        success: false,
        type: BiometricType.NONE,
        fallbackToPIN: true,
        timestamp: new Date(),
        error: 'Biometric authentication not available or not enrolled'
      };
    }

    try {
      const result = await this.performWebAuthnAuthentication(userId, challenge);
      
      if (result.success) {
        // Log successful biometric authentication
        await this.logBiometricEvent(userId, 'success', result.type);
        
        return {
          success: true,
          type: result.type,
          fallbackToPIN: false,
          timestamp: new Date(),
          confidence: result.confidence,
          deviceId: await this.getDeviceId()
        };
      } else {
        // Log failed attempt
        await this.logBiometricEvent(userId, 'failure', result.type, result.error);
        
        return {
          success: false,
          type: result.type,
          fallbackToPIN: true,
          timestamp: new Date(),
          error: result.error
        };
      }

    } catch (error) {
      console.error('Biometric authentication error:', error);
      
      return {
        success: false,
        type: BiometricType.NONE,
        fallbackToPIN: true,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Perform WebAuthn authentication
   */
  private async performWebAuthnAuthentication(
    userId: string,
    challenge?: string
  ): Promise<{ success: boolean; type: BiometricType; confidence?: number; error?: string }> {
    if (!this.isWebAuthnSupported) {
      return { success: false, type: BiometricType.NONE, error: 'WebAuthn not supported' };
    }

    const challengeBytes = challenge 
      ? new TextEncoder().encode(challenge)
      : crypto.getRandomValues(new Uint8Array(32));

    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge: challengeBytes,
        allowCredentials: await this.getUserCredentials(userId),
        userVerification: 'required',
        timeout: 30000
      }
    };

    try {
      const credential = await navigator.credentials.get(getOptions);
      
      if (!credential) {
        return { success: false, type: BiometricType.NONE, error: 'No credential returned' };
      }

      // Verify the authentication response
      const isValid = await this.verifyAuthenticationResponse(credential, userId);
      
      return {
        success: isValid,
        type: this.detectUsedBiometricType(credential),
        confidence: this.calculateConfidenceScore(credential),
        error: isValid ? undefined : 'Authentication verification failed'
      };

    } catch (error) {
      console.error('WebAuthn authentication failed:', error);
      return { 
        success: false, 
        type: BiometricType.NONE, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  /**
   * Get stored credentials for user
   */
  private async getUserCredentials(userId: string): Promise<PublicKeyCredentialDescriptor[]> {
    // In a real implementation, this would fetch from the database
    // For now, return empty array to allow any registered credentials
    return [];
  }

  /**
   * Verify authentication response
   */
  private async verifyAuthenticationResponse(
    credential: Credential,
    userId: string
  ): Promise<boolean> {
    // In a real implementation, this would verify the signature
    // against the stored public key for the user
    // For now, assume valid if we got a credential
    return credential !== null;
  }

  /**
   * Detect which biometric type was used
   */
  private detectUsedBiometricType(credential: Credential): BiometricType {
    // This would analyze the credential response to determine the method used
    // For now, return the first available type
    return this.availableTypes.values().next().value || BiometricType.FINGERPRINT;
  }

  /**
   * Calculate confidence score for authentication
   */
  private calculateConfidenceScore(credential: Credential): number {
    // In a real implementation, this would analyze various factors
    // such as authentication strength, device security, etc.
    return 0.95; // High confidence for successful WebAuthn
  }

  /**
   * Generate unique enrollment ID
   */
  private generateEnrollmentId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Store biometric enrollment data
   */
  private async storeBiometricEnrollment(
    userId: string,
    enrollmentId: string,
    type: BiometricType,
    credential: PublicKeyCredential
  ): Promise<void> {
    // In a real implementation, this would store in the database
    // with proper encryption
    const enrollmentData = {
      userId,
      enrollmentId,
      type,
      credentialId: credential.id,
      publicKey: credential.response,
      createdAt: new Date().toISOString()
    };

    // Store in local storage for now (should be secure database)
    const key = `biometric_enrollment_${userId}`;
    localStorage.setItem(key, JSON.stringify(enrollmentData));
  }

  /**
   * Encrypt biometric template
   */
  private encryptBiometricTemplate(credential: PublicKeyCredential): string {
    // In a real implementation, this would use proper encryption
    // For now, return a base64 encoded placeholder
    return btoa(JSON.stringify({
      id: credential.id,
      type: credential.type,
      encrypted: true,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Get device ID for tracking
   */
  private async getDeviceId(): Promise<string> {
    // Generate or retrieve a device-specific identifier
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      deviceId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem('device_id', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Log biometric authentication events
   */
  private async logBiometricEvent(
    userId: string,
    event: 'success' | 'failure' | 'enrollment',
    type: BiometricType,
    error?: string
  ): Promise<void> {
    const logEntry = {
      userId,
      event,
      biometricType: type,
      timestamp: new Date().toISOString(),
      deviceId: await this.getDeviceId(),
      userAgent: navigator.userAgent,
      error
    };

    // In production, this would send to audit logging system
    console.log('Biometric auth event:', logEntry);
  }

  /**
   * Check if biometric authentication should be offered
   */
  public async shouldOfferBiometric(userId: string): Promise<boolean> {
    const capabilities = await this.getCapabilities();
    
    if (!capabilities.isAvailable) return false;
    if (!capabilities.permissionsGranted) return false;
    
    // Check if user has enrolled biometric authentication
    const isEnrolled = capabilities.isEnrolled;
    
    // Check user preferences (would be stored in database)
    const userPreferences = await this.getUserBiometricPreferences(userId);
    
    return isEnrolled && userPreferences.enabled;
  }

  /**
   * Get user biometric preferences
   */
  private async getUserBiometricPreferences(userId: string): Promise<{
    enabled: boolean;
    preferredType?: BiometricType;
    fallbackToPIN: boolean;
  }> {
    // In a real implementation, this would fetch from database
    // For now, return default preferences
    return {
      enabled: true,
      preferredType: BiometricType.FINGERPRINT,
      fallbackToPIN: true
    };
  }

  /**
   * Disable biometric authentication for user
   */
  public async disableBiometric(userId: string): Promise<boolean> {
    try {
      // Remove stored enrollment data
      const key = `biometric_enrollment_${userId}`;
      localStorage.removeItem(key);
      
      // Log the disable event
      await this.logBiometricEvent(userId, 'enrollment', BiometricType.NONE);
      
      return true;
    } catch (error) {
      console.error('Failed to disable biometric authentication:', error);
      return false;
    }
  }
}

// Singleton export
export const biometricAuthService = BiometricAuthService.getInstance();

// Utility functions for biometric authentication
export const BiometricUtils = {
  /**
   * Check if device supports biometric authentication
   */
  async isSupported(): Promise<boolean> {
    const capabilities = await biometricAuthService.getCapabilities();
    return capabilities.isAvailable;
  },

  /**
   * Get human-readable biometric type name
   */
  getBiometricTypeName(type: BiometricType, locale: 'en' | 'fr' = 'en'): string {
    const names = {
      en: {
        [BiometricType.FINGERPRINT]: 'Fingerprint',
        [BiometricType.FACE_ID]: 'Face Recognition',
        [BiometricType.VOICE]: 'Voice Recognition',
        [BiometricType.IRIS]: 'Iris Scan',
        [BiometricType.NONE]: 'None'
      },
      fr: {
        [BiometricType.FINGERPRINT]: 'Empreinte digitale',
        [BiometricType.FACE_ID]: 'Reconnaissance faciale',
        [BiometricType.VOICE]: 'Reconnaissance vocale',
        [BiometricType.IRIS]: 'Scan de l\'iris',
        [BiometricType.NONE]: 'Aucun'
      }
    };

    return names[locale][type] || names.en[type];
  },

  /**
   * Format authentication result for UI display
   */
  formatAuthResult(result: BiometricAuthResult, locale: 'en' | 'fr' = 'en'): string {
    if (result.success) {
      const typeName = this.getBiometricTypeName(result.type, locale);
      return locale === 'en' 
        ? `Authentication successful using ${typeName}`
        : `Authentification réussie avec ${typeName}`;
    } else {
      return locale === 'en'
        ? `Authentication failed: ${result.error || 'Unknown error'}`
        : `Échec de l'authentification: ${result.error || 'Erreur inconnue'}`;
    }
  }
};

// Type exports
export type { BiometricAuthResult, BiometricEnrollmentResult, BiometricCapabilities };