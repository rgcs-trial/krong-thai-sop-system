/**
 * Advanced Device Fingerprinting System
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements comprehensive device fingerprinting specifically optimized for
 * restaurant tablet environments with enhanced security and tracking capabilities.
 */

import { z } from 'zod';
import { envConfig } from '@/lib/env-config';

// Device fingerprint components
export interface DeviceFingerprintComponents {
  // Hardware characteristics
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
    orientation: string;
  };
  
  // Browser and platform
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  timezone: string;
  timezoneOffset: number;
  
  // Graphics and rendering
  canvas: string;
  webgl: {
    vendor: string;
    renderer: string;
    version: string;
    shadingLanguageVersion: string;
    extensions: string[];
  };
  
  // Audio capabilities
  audio: {
    sampleRate: number;
    maxChannelCount: number;
    numberOfInputs: number;
    numberOfOutputs: number;
  };
  
  // Network and connectivity
  connection: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  
  // Device capabilities
  features: {
    cookieEnabled: boolean;
    doNotTrack: string | null;
    hardwareConcurrency: number;
    maxTouchPoints: number;
    mediaDevices: string[];
    permissions: string[];
  };
  
  // Tablet-specific characteristics
  tablet: {
    isTablet: boolean;
    brand?: string;
    model?: string;
    osVersion?: string;
    browserEngine?: string;
    touchSupport: boolean;
    accelerometer: boolean;
    gyroscope: boolean;
  };
}

// Fingerprint result
export interface DeviceFingerprint {
  id: string;
  hash: string;
  confidence: number;
  components: DeviceFingerprintComponents;
  metadata: {
    timestamp: Date;
    version: string;
    algorithm: string;
  };
  security: {
    entropy: number;
    uniqueness: number;
    stability: number;
  };
}

// Device trust level
export enum DeviceTrustLevel {
  UNKNOWN = 'unknown',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  TRUSTED = 'trusted'
}

// Device registration result
export interface DeviceRegistration {
  deviceId: string;
  fingerprint: DeviceFingerprint;
  trustLevel: DeviceTrustLevel;
  registeredAt: Date;
  lastSeen: Date;
  metadata: {
    registeredBy: string;
    restaurant: string;
    notes?: string;
  };
}

/**
 * Enhanced Device Fingerprinting Service
 */
export class DeviceFingerprintingService {
  private static instance: DeviceFingerprintingService;
  private cache: Map<string, DeviceFingerprint> = new Map();
  private readonly FINGERPRINT_VERSION = '2.1.0';

  private constructor() {}

  public static getInstance(): DeviceFingerprintingService {
    if (!DeviceFingerprintingService.instance) {
      DeviceFingerprintingService.instance = new DeviceFingerprintingService();
    }
    return DeviceFingerprintingService.instance;
  }

  /**
   * Generate comprehensive device fingerprint
   */
  public async generateFingerprint(): Promise<DeviceFingerprint> {
    if (typeof window === 'undefined') {
      throw new Error('Device fingerprinting can only be performed in browser environment');
    }

    try {
      // Collect all fingerprint components
      const components = await this.collectFingerprintComponents();
      
      // Generate stable hash
      const hash = await this.generateFingerprintHash(components);
      
      // Calculate security metrics
      const security = this.calculateSecurityMetrics(components);
      
      // Generate unique ID
      const id = await this.generateDeviceId(hash, components);
      
      const fingerprint: DeviceFingerprint = {
        id,
        hash,
        confidence: this.calculateConfidence(components, security),
        components,
        metadata: {
          timestamp: new Date(),
          version: this.FINGERPRINT_VERSION,
          algorithm: 'SHA-256'
        },
        security
      };

      // Cache the fingerprint
      this.cache.set(id, fingerprint);
      
      return fingerprint;
      
    } catch (error) {
      console.error('Failed to generate device fingerprint:', error);
      throw new Error('Device fingerprinting failed');
    }
  }

  /**
   * Collect all device fingerprint components
   */
  private async collectFingerprintComponents(): Promise<DeviceFingerprintComponents> {
    const components: DeviceFingerprintComponents = {
      screen: await this.getScreenCharacteristics(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: Array.from(navigator.languages),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      canvas: await this.generateCanvasFingerprint(),
      webgl: await this.getWebGLFingerprint(),
      audio: await this.getAudioFingerprint(),
      connection: this.getConnectionInfo(),
      features: await this.getDeviceFeatures(),
      tablet: await this.getTabletCharacteristics()
    };

    return components;
  }

  /**
   * Get screen characteristics
   */
  private async getScreenCharacteristics() {
    return {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      orientation: screen.orientation ? screen.orientation.type : 'unknown'
    };
  }

  /**
   * Generate canvas fingerprint
   */
  private async generateCanvasFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return 'no-canvas';

      canvas.width = 200;
      canvas.height = 50;

      // Draw complex pattern for fingerprinting
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('🍽️ Krong Thai SOP', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('🍽️ Krong Thai SOP', 4, 17);

      // Add gradient
      const gradient = ctx.createLinearGradient(0, 0, 150, 0);
      gradient.addColorStop(0, 'red');
      gradient.addColorStop(0.5, 'green');
      gradient.addColorStop(1, 'blue');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 25, 150, 20);

      // Add some geometric shapes
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 25, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL();
    } catch (error) {
      return 'canvas-error';
    }
  }

  /**
   * Get WebGL fingerprint
   */
  private async getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return {
          vendor: 'no-webgl',
          renderer: 'no-webgl',
          version: 'no-webgl',
          shadingLanguageVersion: 'no-webgl',
          extensions: []
        };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      return {
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        extensions: gl.getSupportedExtensions() || []
      };
    } catch (error) {
      return {
        vendor: 'webgl-error',
        renderer: 'webgl-error',
        version: 'webgl-error',
        shadingLanguageVersion: 'webgl-error',
        extensions: []
      };
    }
  }

  /**
   * Get audio fingerprint
   */
  private async getAudioFingerprint() {
    try {
      // Check if Web Audio API is available
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        return {
          sampleRate: 0,
          maxChannelCount: 0,
          numberOfInputs: 0,
          numberOfOutputs: 0
        };
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      const fingerprint = {
        sampleRate: audioContext.sampleRate,
        maxChannelCount: audioContext.destination.maxChannelCount,
        numberOfInputs: audioContext.destination.numberOfInputs,
        numberOfOutputs: audioContext.destination.numberOfOutputs
      };

      // Clean up
      await audioContext.close();
      
      return fingerprint;
    } catch (error) {
      return {
        sampleRate: 0,
        maxChannelCount: 0,
        numberOfInputs: 0,
        numberOfOutputs: 0
      };
    }
  }

  /**
   * Get connection information
   */
  private getConnectionInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!connection) {
      return {};
    }

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    };
  }

  /**
   * Get device features
   */
  private async getDeviceFeatures() {
    const features = {
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      mediaDevices: [] as string[],
      permissions: [] as string[]
    };

    // Get media devices
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        features.mediaDevices = devices.map(device => `${device.kind}-${device.deviceId ? 'available' : 'restricted'}`);
      }
    } catch (error) {
      // Media devices not available or restricted
    }

    // Check permissions
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionNames = ['camera', 'microphone', 'notifications', 'geolocation'];
        
        for (const permission of permissionNames) {
          try {
            const result = await navigator.permissions.query({ name: permission as PermissionName });
            features.permissions.push(`${permission}:${result.state}`);
          } catch (error) {
            features.permissions.push(`${permission}:unsupported`);
          }
        }
      }
    } catch (error) {
      // Permissions API not available
    }

    return features;
  }

  /**
   * Get tablet-specific characteristics
   */
  private async getTabletCharacteristics() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    
    const characteristics = {
      isTablet: this.detectTablet(userAgent, platform),
      brand: this.detectBrand(userAgent),
      model: this.detectModel(userAgent),
      osVersion: this.detectOSVersion(userAgent),
      browserEngine: this.detectBrowserEngine(userAgent),
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      accelerometer: await this.checkAccelerometer(),
      gyroscope: await this.checkGyroscope()
    };

    return characteristics;
  }

  /**
   * Detect if device is a tablet
   */
  private detectTablet(userAgent: string, platform: string): boolean {
    const tabletPatterns = [
      /ipad/i,
      /android(?!.*mobile)/i,
      /tablet/i,
      /kindle/i,
      /playbook/i,
      /surface/i
    ];

    return tabletPatterns.some(pattern => pattern.test(userAgent)) ||
           (platform.includes('mac') && 'ontouchstart' in window);
  }

  /**
   * Detect device brand
   */
  private detectBrand(userAgent: string): string | undefined {
    const brands = [
      { pattern: /ipad|iphone|ipod/i, brand: 'Apple' },
      { pattern: /samsung/i, brand: 'Samsung' },
      { pattern: /huawei/i, brand: 'Huawei' },
      { pattern: /xiaomi/i, brand: 'Xiaomi' },
      { pattern: /lenovo/i, brand: 'Lenovo' },
      { pattern: /surface/i, brand: 'Microsoft' },
      { pattern: /pixel/i, brand: 'Google' }
    ];

    for (const { pattern, brand } of brands) {
      if (pattern.test(userAgent)) {
        return brand;
      }
    }

    return undefined;
  }

  /**
   * Detect device model
   */
  private detectModel(userAgent: string): string | undefined {
    // Extract model information from user agent
    const modelPatterns = [
      /ipad;\s*cpu\s+.*?os\s+([\d_]+).*?\)\s+.*?version\/([\d.]+)/i,
      /android\s+([\d.]+).*?;\s*([^;)]+)/i,
      /surface/i
    ];

    for (const pattern of modelPatterns) {
      const match = userAgent.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Detect OS version
   */
  private detectOSVersion(userAgent: string): string | undefined {
    const osPatterns = [
      { pattern: /os\s+([\d_]+)/i, name: 'iOS' },
      { pattern: /android\s+([\d.]+)/i, name: 'Android' },
      { pattern: /windows\s+nt\s+([\d.]+)/i, name: 'Windows' }
    ];

    for (const { pattern, name } of osPatterns) {
      const match = userAgent.match(pattern);
      if (match) {
        return `${name} ${match[1].replace(/_/g, '.')}`;
      }
    }

    return undefined;
  }

  /**
   * Detect browser engine
   */
  private detectBrowserEngine(userAgent: string): string | undefined {
    const engines = [
      { pattern: /webkit/i, engine: 'WebKit' },
      { pattern: /gecko/i, engine: 'Gecko' },
      { pattern: /trident/i, engine: 'Trident' },
      { pattern: /edge/i, engine: 'Edge' }
    ];

    for (const { pattern, engine } of engines) {
      if (pattern.test(userAgent)) {
        return engine;
      }
    }

    return undefined;
  }

  /**
   * Check accelerometer availability
   */
  private async checkAccelerometer(): Promise<boolean> {
    try {
      if ('DeviceMotionEvent' in window) {
        // Check if permission is required (iOS 13+)
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          return true; // Available but requires permission
        }
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check gyroscope availability
   */
  private async checkGyroscope(): Promise<boolean> {
    try {
      if ('DeviceOrientationEvent' in window) {
        // Check if permission is required (iOS 13+)
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          return true; // Available but requires permission
        }
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate fingerprint hash
   */
  private async generateFingerprintHash(components: DeviceFingerprintComponents): Promise<string> {
    // Create deterministic string from components
    const dataString = JSON.stringify(components, Object.keys(components).sort());
    
    // Generate hash
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Calculate security metrics
   */
  private calculateSecurityMetrics(components: DeviceFingerprintComponents) {
    let entropy = 0;
    let uniqueness = 0;
    let stability = 0;

    // Calculate entropy based on component variability
    const entropyFactors = [
      components.screen.width * components.screen.height, // Screen resolution
      components.canvas.length, // Canvas fingerprint complexity
      components.webgl.extensions.length, // WebGL capabilities
      components.features.mediaDevices.length, // Available devices
      components.features.hardwareConcurrency, // CPU cores
      components.audio.sampleRate // Audio capabilities
    ];

    entropy = entropyFactors.reduce((acc, factor) => acc + Math.log2(factor || 1), 0) / entropyFactors.length;

    // Calculate uniqueness based on rare characteristics
    uniqueness = 0.5; // Base uniqueness
    
    if (components.tablet.isTablet) uniqueness += 0.1;
    if (components.webgl.vendor !== 'no-webgl') uniqueness += 0.1;
    if (components.features.mediaDevices.length > 0) uniqueness += 0.1;
    if (components.tablet.brand) uniqueness += 0.1;
    if (components.features.hardwareConcurrency > 4) uniqueness += 0.1;

    uniqueness = Math.min(uniqueness, 1.0);

    // Calculate stability based on stable characteristics
    stability = 0.7; // Base stability
    
    if (components.tablet.isTablet) stability += 0.1; // Tablets are more stable
    if (components.screen.width >= 1024) stability += 0.1; // Larger screens more stable
    if (components.tablet.brand === 'Apple') stability += 0.1; // iOS devices more stable

    stability = Math.min(stability, 1.0);

    return { entropy, uniqueness, stability };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(components: DeviceFingerprintComponents, security: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on available components
    if (components.canvas !== 'no-canvas') confidence += 0.1;
    if (components.webgl.vendor !== 'no-webgl') confidence += 0.1;
    if (components.audio.sampleRate > 0) confidence += 0.1;
    if (components.tablet.isTablet) confidence += 0.1;
    if (components.features.mediaDevices.length > 0) confidence += 0.1;

    // Factor in security metrics
    confidence = (confidence + security.entropy * 0.2 + security.uniqueness * 0.2) / 1.4;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate device ID
   */
  private async generateDeviceId(hash: string, components: DeviceFingerprintComponents): Promise<string> {
    // Use first 16 characters of hash + tablet info
    const baseId = hash.substring(0, 16);
    const tabletInfo = components.tablet.brand ? components.tablet.brand.substring(0, 3) : 'unk';
    
    return `${baseId}-${tabletInfo}`.toLowerCase();
  }

  /**
   * Compare fingerprints for device recognition
   */
  public compareFingerprintsimilarity(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
    if (fp1.hash === fp2.hash) return 1.0;

    // Compare key components
    let matches = 0;
    let total = 0;

    // Screen characteristics (weight: 0.2)
    if (fp1.components.screen.width === fp2.components.screen.width &&
        fp1.components.screen.height === fp2.components.screen.height) {
      matches += 0.2;
    }
    total += 0.2;

    // Canvas fingerprint (weight: 0.3)
    if (fp1.components.canvas === fp2.components.canvas) {
      matches += 0.3;
    }
    total += 0.3;

    // WebGL fingerprint (weight: 0.2)
    if (fp1.components.webgl.vendor === fp2.components.webgl.vendor &&
        fp1.components.webgl.renderer === fp2.components.webgl.renderer) {
      matches += 0.2;
    }
    total += 0.2;

    // Tablet characteristics (weight: 0.3)
    if (fp1.components.tablet.brand === fp2.components.tablet.brand &&
        fp1.components.tablet.model === fp2.components.tablet.model) {
      matches += 0.3;
    }
    total += 0.3;

    return matches / total;
  }

  /**
   * Register device as trusted
   */
  public async registerDevice(
    fingerprint: DeviceFingerprint,
    metadata: {
      registeredBy: string;
      restaurant: string;
      notes?: string;
    }
  ): Promise<DeviceRegistration> {
    const registration: DeviceRegistration = {
      deviceId: fingerprint.id,
      fingerprint,
      trustLevel: this.calculateTrustLevel(fingerprint),
      registeredAt: new Date(),
      lastSeen: new Date(),
      metadata
    };

    // Store registration (in real implementation, this would go to database)
    const key = `device_registration_${fingerprint.id}`;
    localStorage.setItem(key, JSON.stringify(registration));

    return registration;
  }

  /**
   * Calculate device trust level
   */
  private calculateTrustLevel(fingerprint: DeviceFingerprint): DeviceTrustLevel {
    const confidence = fingerprint.confidence;
    const stability = fingerprint.security.stability;

    if (confidence >= 0.9 && stability >= 0.8) return DeviceTrustLevel.HIGH;
    if (confidence >= 0.7 && stability >= 0.6) return DeviceTrustLevel.MEDIUM;
    if (confidence >= 0.5) return DeviceTrustLevel.LOW;
    
    return DeviceTrustLevel.UNKNOWN;
  }

  /**
   * Get device registration
   */
  public getDeviceRegistration(deviceId: string): DeviceRegistration | null {
    const key = `device_registration_${deviceId}`;
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
        const registration = JSON.parse(data);
        registration.registeredAt = new Date(registration.registeredAt);
        registration.lastSeen = new Date(registration.lastSeen);
        return registration;
      } catch (error) {
        return null;
      }
    }
    
    return null;
  }

  /**
   * Update device last seen
   */
  public updateDeviceLastSeen(deviceId: string): boolean {
    const registration = this.getDeviceRegistration(deviceId);
    
    if (registration) {
      registration.lastSeen = new Date();
      const key = `device_registration_${deviceId}`;
      localStorage.setItem(key, JSON.stringify(registration));
      return true;
    }
    
    return false;
  }

  /**
   * Check if device is trusted
   */
  public isDeviceTrusted(deviceId: string): boolean {
    const registration = this.getDeviceRegistration(deviceId);
    
    if (!registration) return false;
    
    const trustLevels = [DeviceTrustLevel.MEDIUM, DeviceTrustLevel.HIGH, DeviceTrustLevel.TRUSTED];
    return trustLevels.includes(registration.trustLevel);
  }
}

// Singleton export
export const deviceFingerprintingService = DeviceFingerprintingService.getInstance();

// Utility functions
export const DeviceFingerprintUtils = {
  /**
   * Format fingerprint for display
   */
  formatFingerprint(fingerprint: DeviceFingerprint): {
    deviceInfo: string;
    security: string;
    confidence: string;
  } {
    const { components } = fingerprint;
    
    return {
      deviceInfo: `${components.tablet.brand || 'Unknown'} ${components.tablet.model || 'Device'} (${components.screen.width}x${components.screen.height})`,
      security: `Entropy: ${fingerprint.security.entropy.toFixed(2)} | Uniqueness: ${(fingerprint.security.uniqueness * 100).toFixed(0)}%`,
      confidence: `${(fingerprint.confidence * 100).toFixed(0)}%`
    };
  },

  /**
   * Generate human-readable device description
   */
  getDeviceDescription(components: DeviceFingerprintComponents, locale: 'en' | 'fr' = 'en'): string {
    const isTablet = components.tablet.isTablet;
    const brand = components.tablet.brand;
    const os = components.tablet.osVersion;
    
    const deviceType = isTablet 
      ? (locale === 'en' ? 'Tablet' : 'Tablette')
      : (locale === 'en' ? 'Device' : 'Appareil');
    
    let description = deviceType;
    
    if (brand) {
      description = `${brand} ${description}`;
    }
    
    if (os) {
      description += ` (${os})`;
    }
    
    return description;
  },

  /**
   * Check if fingerprint indicates tablet device
   */
  isTabletDevice(fingerprint: DeviceFingerprint): boolean {
    return fingerprint.components.tablet.isTablet;
  },

  /**
   * Get security level description
   */
  getSecurityLevelDescription(fingerprint: DeviceFingerprint, locale: 'en' | 'fr' = 'en'): string {
    const confidence = fingerprint.confidence;
    
    if (confidence >= 0.9) {
      return locale === 'en' ? 'Very High' : 'Très élevé';
    } else if (confidence >= 0.7) {
      return locale === 'en' ? 'High' : 'Élevé';
    } else if (confidence >= 0.5) {
      return locale === 'en' ? 'Medium' : 'Moyen';
    } else {
      return locale === 'en' ? 'Low' : 'Faible';
    }
  }
};

// Type exports
export type { DeviceFingerprintComponents, DeviceFingerprint, DeviceRegistration };