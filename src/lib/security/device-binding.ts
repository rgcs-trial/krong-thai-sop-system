/**
 * Device Binding System for Restaurant Krong Thai SOP Management System
 * Handles tablet device identification, registration, and management
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { SECURITY_CONFIG } from './config';
import type { Database } from '@/types/database';

// Types
export interface DeviceFingerprint {
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  language: string;
  platform: string;
  userAgent: string;
  canvasFingerprint?: string;
  webglFingerprint?: string;
  touchSupport: boolean;
  connectionType?: string;
}

export interface DeviceInfo {
  id: string;
  userId: string;
  fingerprint: string;
  name: string;
  type: 'tablet' | 'desktop' | 'mobile';
  location?: string;
  isActive: boolean;
  isTrusted: boolean;
  lastUsed: Date;
  registeredAt: Date;
  userAgent: string;
  ipAddress: string;
}

export interface DeviceValidationResult {
  success: boolean;
  deviceId?: string;
  isNewDevice?: boolean;
  trustLevel: 'unknown' | 'recognized' | 'trusted';
  error?: string;
}

/**
 * Device Binding Class
 */
export class DeviceBinding {
  private static supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Generate device fingerprint hash
   */
  static generateFingerprintHash(fingerprint: DeviceFingerprint): string {
    const fingerprintString = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());
    return crypto
      .createHash(SECURITY_CONFIG.DEVICE.FINGERPRINT_ALGORITHM)
      .update(fingerprintString)
      .digest('hex');
  }

  /**
   * Create device fingerprint from browser data
   */
  static createFingerprint(data: {
    screenWidth: number;
    screenHeight: number;
    colorDepth: number;
    timezone: string;
    language: string;
    platform: string;
    userAgent: string;
    canvasFingerprint?: string;
    webglFingerprint?: string;
    touchSupport: boolean;
    connectionType?: string;
  }): DeviceFingerprint {
    return {
      screenResolution: `${data.screenWidth}x${data.screenHeight}`,
      colorDepth: data.colorDepth,
      timezone: data.timezone,
      language: data.language,
      platform: data.platform,
      userAgent: data.userAgent,
      canvasFingerprint: data.canvasFingerprint,
      webglFingerprint: data.webglFingerprint,
      touchSupport: data.touchSupport,
      connectionType: data.connectionType,
    };
  }

  /**
   * Validate or register device for user
   */
  static async validateOrRegisterDevice(
    userId: string,
    fingerprintHash: string,
    userAgent: string,
    ipAddress: string
  ): Promise<DeviceValidationResult> {
    try {
      // First, try to find existing device
      const existingDevice = await this.findExistingDevice(userId, fingerprintHash);
      
      if (existingDevice) {
        // Update last used timestamp
        await this.updateDeviceLastUsed(existingDevice.id);
        
        return {
          success: true,
          deviceId: existingDevice.id,
          isNewDevice: false,
          trustLevel: existingDevice.isTrusted ? 'trusted' : 'recognized',
        };
      }

      // Check if user has reached device limit
      const userDeviceCount = await this.getUserDeviceCount(userId);
      if (userDeviceCount >= SECURITY_CONFIG.DEVICE.MAX_DEVICES_PER_USER) {
        // Find and remove oldest inactive device
        const oldestDevice = await this.findOldestInactiveDevice(userId);
        if (oldestDevice) {
          await this.removeDevice(oldestDevice.id);
        } else {
          return {
            success: false,
            trustLevel: 'unknown',
            error: 'Maximum number of devices reached. Please contact your supervisor.',
          };
        }
      }

      // Register new device
      const deviceName = this.generateDeviceName(userAgent);
      const deviceType = this.detectDeviceType(userAgent);
      
      const newDevice = await this.registerNewDevice({
        userId,
        fingerprintHash,
        name: deviceName,
        type: deviceType,
        userAgent,
        ipAddress,
      });

      if (!newDevice) {
        return {
          success: false,
          trustLevel: 'unknown',
          error: 'Failed to register device',
        };
      }

      return {
        success: true,
        deviceId: newDevice.id,
        isNewDevice: true,
        trustLevel: 'unknown',
      };

    } catch (error) {
      console.error('Device validation/registration error:', error);
      return {
        success: false,
        trustLevel: 'unknown',
        error: 'Device validation failed',
      };
    }
  }

  /**
   * Find existing device for user
   */
  private static async findExistingDevice(
    userId: string,
    fingerprintHash: string
  ): Promise<DeviceInfo | null> {
    // Note: You'll need to create a user_devices table in your database
    // This is a placeholder implementation
    try {
      const { data, error } = await this.supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('fingerprint_hash', fingerprintHash)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        fingerprint: data.fingerprint_hash,
        name: data.name,
        type: data.type,
        location: data.location,
        isActive: data.is_active,
        isTrusted: data.is_trusted,
        lastUsed: new Date(data.last_used_at),
        registeredAt: new Date(data.registered_at),
        userAgent: data.user_agent,
        ipAddress: data.ip_address,
      };

    } catch (error) {
      console.error('Error finding existing device:', error);
      return null;
    }
  }

  /**
   * Get device count for user
   */
  private static async getUserDeviceCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('user_devices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting user device count:', error);
        return 0;
      }

      return count || 0;

    } catch (error) {
      console.error('Error getting user device count:', error);
      return 0;
    }
  }

  /**
   * Find oldest inactive device for user
   */
  private static async findOldestInactiveDevice(userId: string): Promise<{ id: string } | null> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - SECURITY_CONFIG.DEVICE.DEVICE_EXPIRY_DAYS);

      const { data, error } = await this.supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .lt('last_used_at', thirtyDaysAgo.toISOString())
        .order('last_used_at', { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return { id: data.id };

    } catch (error) {
      console.error('Error finding oldest inactive device:', error);
      return null;
    }
  }

  /**
   * Register new device
   */
  private static async registerNewDevice(deviceData: {
    userId: string;
    fingerprintHash: string;
    name: string;
    type: 'tablet' | 'desktop' | 'mobile';
    userAgent: string;
    ipAddress: string;
  }): Promise<{ id: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_devices')
        .insert({
          user_id: deviceData.userId,
          fingerprint_hash: deviceData.fingerprintHash,
          name: deviceData.name,
          type: deviceData.type,
          user_agent: deviceData.userAgent,
          ip_address: deviceData.ipAddress,
          is_active: true,
          is_trusted: false,
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Error registering new device:', error);
        return null;
      }

      return { id: data.id };

    } catch (error) {
      console.error('Error registering new device:', error);
      return null;
    }
  }

  /**
   * Update device last used timestamp
   */
  private static async updateDeviceLastUsed(deviceId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', deviceId);

    } catch (error) {
      console.error('Error updating device last used:', error);
    }
  }

  /**
   * Remove device
   */
  private static async removeDevice(deviceId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_devices')
        .update({ is_active: false })
        .eq('id', deviceId);

    } catch (error) {
      console.error('Error removing device:', error);
    }
  }

  /**
   * Generate user-friendly device name
   */
  private static generateDeviceName(userAgent: string): string {
    const isTablet = /tablet|ipad/i.test(userAgent);
    const isMobile = /mobile|phone/i.test(userAgent);
    const isChrome = /chrome/i.test(userAgent);
    const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
    const isFirefox = /firefox/i.test(userAgent);

    let deviceType = 'Desktop';
    if (isTablet) deviceType = 'Tablet';
    else if (isMobile) deviceType = 'Mobile';

    let browser = 'Browser';
    if (isChrome) browser = 'Chrome';
    else if (isSafari) browser = 'Safari';
    else if (isFirefox) browser = 'Firefox';

    const timestamp = new Date().toISOString().slice(0, 10);
    return `${deviceType} ${browser} (${timestamp})`;
  }

  /**
   * Detect device type from user agent
   */
  private static detectDeviceType(userAgent: string): 'tablet' | 'desktop' | 'mobile' {
    if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|phone/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Compare device fingerprints for similarity
   */
  static compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
    let similarityScore = 0;
    let totalFields = 0;

    // Compare each field
    const fields = ['screenResolution', 'colorDepth', 'timezone', 'language', 'platform'] as const;
    
    for (const field of fields) {
      totalFields++;
      if (fp1[field] === fp2[field]) {
        similarityScore++;
      }
    }

    // Special handling for user agent (partial match)
    totalFields++;
    if (fp1.userAgent && fp2.userAgent) {
      const similarity = this.calculateStringSimilarity(fp1.userAgent, fp2.userAgent);
      if (similarity > 0.8) {
        similarityScore++;
      }
    }

    return similarityScore / totalFields;
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get user's devices
   */
  static async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(device => ({
        id: device.id,
        userId: device.user_id,
        fingerprint: device.fingerprint_hash,
        name: device.name,
        type: device.type,
        location: device.location,
        isActive: device.is_active,
        isTrusted: device.is_trusted,
        lastUsed: new Date(device.last_used_at),
        registeredAt: new Date(device.registered_at),
        userAgent: device.user_agent,
        ipAddress: device.ip_address,
      }));

    } catch (error) {
      console.error('Error getting user devices:', error);
      return [];
    }
  }

  /**
   * Trust a device
   */
  static async trustDevice(deviceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_devices')
        .update({ 
          is_trusted: true,
          trusted_at: new Date().toISOString(),
        })
        .eq('id', deviceId);

      return !error;

    } catch (error) {
      console.error('Error trusting device:', error);
      return false;
    }
  }

  /**
   * Revoke device trust
   */
  static async revokeDeviceTrust(deviceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_devices')
        .update({ 
          is_trusted: false,
          trusted_at: null,
        })
        .eq('id', deviceId);

      return !error;

    } catch (error) {
      console.error('Error revoking device trust:', error);
      return false;
    }
  }

  /**
   * Cleanup expired devices
   */
  static async cleanupExpiredDevices(): Promise<number> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - SECURITY_CONFIG.DEVICE.DEVICE_EXPIRY_DAYS);

      const { data, error } = await this.supabase
        .from('user_devices')
        .update({ is_active: false })
        .lt('last_used_at', expiryDate.toISOString())
        .eq('is_active', true)
        .select('id');

      if (error) {
        console.error('Error cleaning up expired devices:', error);
        return 0;
      }

      return data?.length || 0;

    } catch (error) {
      console.error('Error cleaning up expired devices:', error);
      return 0;
    }
  }
}