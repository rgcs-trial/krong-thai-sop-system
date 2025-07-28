/**
 * PIN Attempt Limiting and Lockout System
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements progressive lockout, rate limiting, and comprehensive audit logging
 * for PIN authentication attempts with restaurant-specific security policies.
 */

import { z } from 'zod';
import { envConfig } from '@/lib/env-config';

// Lockout configuration
export interface LockoutConfig {
  maxAttempts: number;
  baseLockoutDuration: number; // Base lockout duration in milliseconds
  maxLockoutDuration: number; // Maximum lockout duration
  progressiveMultiplier: number; // Multiplier for progressive lockout
  resetPeriod: number; // Period after which attempt count resets
  emergencyUnlockCodes: string[]; // Emergency unlock codes
  managerOverrideRequired: boolean; // Whether manager override is required
}

// Lockout state
export enum LockoutState {
  ACTIVE = 'active',
  LOCKED = 'locked',
  EMERGENCY_LOCKED = 'emergency_locked',
  MANAGER_LOCKED = 'manager_locked',
  PERMANENTLY_LOCKED = 'permanently_locked'
}

// Attempt record
export interface AttemptRecord {
  id: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  method: 'pin' | 'biometric' | 'emergency';
  errorCode?: string;
  metadata: {
    userAgent: string;
    restaurantId: string;
    location?: string;
    riskScore: number;
  };
}

// Lockout status
export interface LockoutStatus {
  state: LockoutState;
  isLocked: boolean;
  attemptsRemaining: number;
  totalAttempts: number;
  lockoutExpiresAt?: Date;
  lockoutDuration?: number;
  canUnlock: boolean;
  requiresManagerOverride: boolean;
  emergencyUnlockAvailable: boolean;
  lastAttempt?: AttemptRecord;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Risk assessment factors
export interface RiskFactors {
  rapidAttempts: boolean;
  multipleDevices: boolean;
  suspiciousLocation: boolean;
  timeOfDay: boolean;
  patternDetected: boolean;
  bruteForceIndicators: boolean;
}

/**
 * PIN Lockout System Service
 */
export class PinLockoutSystemService {
  private static instance: PinLockoutSystemService;
  private config: LockoutConfig;
  private lockoutStates: Map<string, LockoutStatus> = new Map();
  private attemptHistory: Map<string, AttemptRecord[]> = new Map();
  private lockoutTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.config = {
      maxAttempts: envConfig.server.PIN_MAX_ATTEMPTS || 5,
      baseLockoutDuration: (envConfig.server.PIN_LOCKOUT_DURATION_MINUTES || 15) * 60 * 1000,
      maxLockoutDuration: 24 * 60 * 60 * 1000, // 24 hours
      progressiveMultiplier: 2,
      resetPeriod: 60 * 60 * 1000, // 1 hour
      emergencyUnlockCodes: [], // Would be configured per installation
      managerOverrideRequired: true
    };

    this.loadLockoutStatesFromStorage();
    this.startCleanupTimer();
  }

  public static getInstance(): PinLockoutSystemService {
    if (!PinLockoutSystemService.instance) {
      PinLockoutSystemService.instance = new PinLockoutSystemService();
    }
    return PinLockoutSystemService.instance;
  }

  /**
   * Record authentication attempt
   */
  public async recordAttempt(
    userId: string,
    deviceId: string,
    ipAddress: string,
    success: boolean,
    method: 'pin' | 'biometric' | 'emergency',
    metadata: {
      userAgent: string;
      restaurantId: string;
      location?: string;
      errorCode?: string;
    }
  ): Promise<LockoutStatus> {
    const attemptId = this.generateAttemptId();
    const timestamp = new Date();
    
    // Calculate risk score
    const riskScore = await this.calculateRiskScore(userId, deviceId, ipAddress, timestamp);
    
    const attempt: AttemptRecord = {
      id: attemptId,
      userId,
      deviceId,
      ipAddress,
      timestamp,
      success,
      method,
      errorCode: metadata.errorCode,
      metadata: {
        ...metadata,
        riskScore
      }
    };

    // Store attempt
    this.storeAttempt(userId, attempt);
    
    // Update lockout status
    const lockoutStatus = await this.updateLockoutStatus(userId, attempt);
    
    // Log attempt for audit
    await this.logAuditEvent('auth_attempt', {
      userId,
      deviceId,
      ipAddress,
      success,
      method,
      riskScore,
      lockoutStatus: lockoutStatus.state
    });

    return lockoutStatus;
  }

  /**
   * Get current lockout status
   */
  public getLockoutStatus(userId: string): LockoutStatus {
    const existing = this.lockoutStates.get(userId);
    
    if (!existing) {
      const defaultStatus: LockoutStatus = {
        state: LockoutState.ACTIVE,
        isLocked: false,
        attemptsRemaining: this.config.maxAttempts,
        totalAttempts: 0,
        canUnlock: true,
        requiresManagerOverride: false,
        emergencyUnlockAvailable: false,
        riskLevel: 'low'
      };
      
      this.lockoutStates.set(userId, defaultStatus);
      return defaultStatus;
    }

    // Check if lockout has expired
    if (existing.lockoutExpiresAt && existing.lockoutExpiresAt <= new Date()) {
      this.unlockUser(userId, 'lockout_expired');
      return this.getLockoutStatus(userId);
    }

    return existing;
  }

  /**
   * Update lockout status after attempt
   */
  private async updateLockoutStatus(userId: string, attempt: AttemptRecord): Promise<LockoutStatus> {
    const status = this.getLockoutStatus(userId);
    const recentAttempts = this.getRecentAttempts(userId);
    
    status.lastAttempt = attempt;
    status.totalAttempts = recentAttempts.length;

    if (attempt.success) {
      // Successful attempt - reset lockout
      this.resetLockout(userId);
      status.state = LockoutState.ACTIVE;
      status.isLocked = false;
      status.attemptsRemaining = this.config.maxAttempts;
      status.riskLevel = 'low';
    } else {
      // Failed attempt
      const failedAttempts = recentAttempts.filter(a => !a.success);
      status.attemptsRemaining = Math.max(0, this.config.maxAttempts - failedAttempts.length);
      
      // Calculate risk level
      status.riskLevel = this.calculateRiskLevel(recentAttempts, attempt);
      
      // Check if lockout should be triggered
      if (failedAttempts.length >= this.config.maxAttempts) {
        await this.triggerLockout(userId, status, failedAttempts);
      }
    }

    // Update emergency unlock availability
    status.emergencyUnlockAvailable = this.isEmergencyUnlockAvailable(status);
    
    // Save status
    this.lockoutStates.set(userId, status);
    this.saveLockoutStateToStorage(userId, status);

    return status;
  }

  /**
   * Trigger lockout for user
   */
  private async triggerLockout(
    userId: string, 
    status: LockoutStatus, 
    failedAttempts: AttemptRecord[]
  ): Promise<void> {
    const lockoutNumber = this.getLockoutNumber(userId);
    const lockoutDuration = this.calculateLockoutDuration(lockoutNumber, status.riskLevel);
    
    status.state = LockoutState.LOCKED;
    status.isLocked = true;
    status.lockoutExpiresAt = new Date(Date.now() + lockoutDuration);
    status.lockoutDuration = lockoutDuration;
    status.requiresManagerOverride = this.shouldRequireManagerOverride(status.riskLevel, lockoutNumber);

    // Set up automatic unlock timer
    this.setLockoutTimer(userId, lockoutDuration);
    
    // Log lockout event
    await this.logAuditEvent('account_locked', {
      userId,
      lockoutDuration,
      lockoutNumber,
      riskLevel: status.riskLevel,
      failedAttempts: failedAttempts.length,
      requiresManagerOverride: status.requiresManagerOverride
    });

    // Send security alert if high risk
    if (status.riskLevel === 'high' || status.riskLevel === 'critical') {
      await this.sendSecurityAlert(userId, status, failedAttempts);
    }
  }

  /**
   * Calculate lockout duration based on attempt number and risk level
   */
  private calculateLockoutDuration(lockoutNumber: number, riskLevel: string): number {
    let baseDuration = this.config.baseLockoutDuration;
    
    // Progressive lockout
    for (let i = 1; i < lockoutNumber; i++) {
      baseDuration *= this.config.progressiveMultiplier;
    }

    // Risk level multiplier
    const riskMultipliers = {
      low: 1,
      medium: 1.5,
      high: 2,
      critical: 3
    };

    baseDuration *= riskMultipliers[riskLevel as keyof typeof riskMultipliers] || 1;

    return Math.min(baseDuration, this.config.maxLockoutDuration);
  }

  /**
   * Calculate risk score for attempt
   */
  private async calculateRiskScore(
    userId: string,
    deviceId: string,
    ipAddress: string,
    timestamp: Date
  ): Promise<number> {
    let riskScore = 0;
    const recentAttempts = this.getRecentAttempts(userId, 60 * 60 * 1000); // Last hour

    // Rapid attempts
    const attemptsInLastMinute = recentAttempts.filter(
      a => timestamp.getTime() - a.timestamp.getTime() < 60 * 1000
    );
    if (attemptsInLastMinute.length > 2) {
      riskScore += 30;
    }

    // Multiple devices
    const uniqueDevices = new Set(recentAttempts.map(a => a.deviceId));
    if (uniqueDevices.size > 2) {
      riskScore += 25;
    }

    // Multiple IP addresses
    const uniqueIPs = new Set(recentAttempts.map(a => a.ipAddress));
    if (uniqueIPs.size > 1) {
      riskScore += 20;
    }

    // Time of day (outside normal hours)
    const hour = timestamp.getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 15;
    }

    // Pattern detection (sequential PINs, common patterns)
    if (this.detectSuspiciousPatterns(recentAttempts)) {
      riskScore += 35;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(
    recentAttempts: AttemptRecord[],
    currentAttempt: AttemptRecord
  ): 'low' | 'medium' | 'high' | 'critical' {
    const riskScore = currentAttempt.metadata.riskScore;
    const failedAttempts = recentAttempts.filter(a => !a.success);

    if (riskScore >= 80 || failedAttempts.length >= 10) return 'critical';
    if (riskScore >= 60 || failedAttempts.length >= 7) return 'high';
    if (riskScore >= 30 || failedAttempts.length >= 4) return 'medium';
    return 'low';
  }

  /**
   * Detect suspicious patterns in attempts
   */
  private detectSuspiciousPatterns(attempts: AttemptRecord[]): boolean {
    if (attempts.length < 3) return false;

    // Check for rapid-fire attempts (potential brute force)
    const rapidAttempts = attempts.filter((attempt, index) => {
      if (index === 0) return false;
      const timeDiff = attempt.timestamp.getTime() - attempts[index - 1].timestamp.getTime();
      return timeDiff < 5000; // Less than 5 seconds between attempts
    });

    return rapidAttempts.length >= 3;
  }

  /**
   * Get lockout number (how many times user has been locked out)
   */
  private getLockoutNumber(userId: string): number {
    const attempts = this.attemptHistory.get(userId) || [];
    const lockoutEvents = attempts.filter(a => 
      a.metadata && a.metadata.riskScore >= 50 && !a.success
    );
    
    return Math.floor(lockoutEvents.length / this.config.maxAttempts) + 1;
  }

  /**
   * Check if manager override is required
   */
  private shouldRequireManagerOverride(riskLevel: string, lockoutNumber: number): boolean {
    if (!this.config.managerOverrideRequired) return false;
    
    return riskLevel === 'high' || 
           riskLevel === 'critical' || 
           lockoutNumber >= 3;
  }

  /**
   * Check if emergency unlock is available
   */
  private isEmergencyUnlockAvailable(status: LockoutStatus): boolean {
    return this.config.emergencyUnlockCodes.length > 0 && 
           status.state !== LockoutState.PERMANENTLY_LOCKED;
  }

  /**
   * Unlock user account
   */
  public unlockUser(userId: string, reason: string, unlockedBy?: string): boolean {
    const status = this.lockoutStates.get(userId);
    
    if (!status || !status.isLocked) {
      return false;
    }

    // Clear lockout timer
    const timer = this.lockoutTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.lockoutTimers.delete(userId);
    }

    // Reset status
    status.state = LockoutState.ACTIVE;
    status.isLocked = false;
    status.lockoutExpiresAt = undefined;
    status.lockoutDuration = undefined;
    status.attemptsRemaining = this.config.maxAttempts;
    status.requiresManagerOverride = false;

    this.lockoutStates.set(userId, status);
    this.saveLockoutStateToStorage(userId, status);

    // Log unlock event
    this.logAuditEvent('account_unlocked', {
      userId,
      reason,
      unlockedBy,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Emergency unlock with code
   */
  public emergencyUnlock(userId: string, unlockCode: string, unlockedBy: string): boolean {
    if (!this.config.emergencyUnlockCodes.includes(unlockCode)) {
      return false;
    }

    const status = this.lockoutStates.get(userId);
    if (!status || status.state === LockoutState.PERMANENTLY_LOCKED) {
      return false;
    }

    return this.unlockUser(userId, 'emergency_unlock', unlockedBy);
  }

  /**
   * Manager override unlock
   */
  public managerUnlock(
    userId: string, 
    managerId: string, 
    managerPin: string, 
    justification: string
  ): Promise<boolean> {
    // In a real implementation, this would verify manager credentials
    // For now, we'll assume the manager authentication was handled elsewhere
    
    const status = this.lockoutStates.get(userId);
    if (!status || !status.requiresManagerOverride) {
      return Promise.resolve(false);
    }

    const success = this.unlockUser(userId, 'manager_override', managerId);
    
    if (success) {
      this.logAuditEvent('manager_override', {
        userId,
        managerId,
        justification,
        timestamp: new Date()
      });
    }

    return Promise.resolve(success);
  }

  /**
   * Reset lockout state
   */
  private resetLockout(userId: string): void {
    // Clear old attempts
    const cutoff = new Date(Date.now() - this.config.resetPeriod);
    const attempts = this.attemptHistory.get(userId) || [];
    const filteredAttempts = attempts.filter(a => a.timestamp > cutoff);
    this.attemptHistory.set(userId, filteredAttempts);
  }

  /**
   * Get recent attempts
   */
  private getRecentAttempts(userId: string, timeWindow?: number): AttemptRecord[] {
    const attempts = this.attemptHistory.get(userId) || [];
    
    if (!timeWindow) {
      return attempts;
    }

    const cutoff = new Date(Date.now() - timeWindow);
    return attempts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Store attempt in history
   */
  private storeAttempt(userId: string, attempt: AttemptRecord): void {
    const attempts = this.attemptHistory.get(userId) || [];
    attempts.push(attempt);
    
    // Keep only recent attempts
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    const filteredAttempts = attempts.filter(a => a.timestamp > cutoff);
    
    this.attemptHistory.set(userId, filteredAttempts);
    this.saveAttemptsToStorage(userId, filteredAttempts);
  }

  /**
   * Set lockout timer
   */
  private setLockoutTimer(userId: string, duration: number): void {
    const timer = setTimeout(() => {
      this.unlockUser(userId, 'timeout_expired');
    }, duration);
    
    this.lockoutTimers.set(userId, timer);
  }

  /**
   * Generate attempt ID
   */
  private generateAttemptId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(
    userId: string,
    status: LockoutStatus,
    failedAttempts: AttemptRecord[]
  ): Promise<void> {
    // In a real implementation, this would send alerts to security team
    console.warn('🚨 Security Alert: High-risk lockout detected', {
      userId,
      riskLevel: status.riskLevel,
      failedAttempts: failedAttempts.length,
      uniqueDevices: new Set(failedAttempts.map(a => a.deviceId)).size,
      uniqueIPs: new Set(failedAttempts.map(a => a.ipAddress)).size
    });
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(eventType: string, data: any): Promise<void> {
    const auditLog = {
      eventType,
      timestamp: new Date().toISOString(),
      data,
      source: 'lockout_system'
    };

    // In production, this would be sent to audit logging service
    console.log('🔒 Lockout Audit Event:', auditLog);
  }

  /**
   * Save lockout state to storage
   */
  private saveLockoutStateToStorage(userId: string, status: LockoutStatus): void {
    if (typeof window !== 'undefined') {
      const key = `lockout_state_${userId}`;
      localStorage.setItem(key, JSON.stringify(status));
    }
  }

  /**
   * Save attempts to storage
   */
  private saveAttemptsToStorage(userId: string, attempts: AttemptRecord[]): void {
    if (typeof window !== 'undefined') {
      const key = `lockout_attempts_${userId}`;
      localStorage.setItem(key, JSON.stringify(attempts));
    }
  }

  /**
   * Load lockout states from storage
   */
  private loadLockoutStatesFromStorage(): void {
    if (typeof window === 'undefined') return;

    // Load lockout states
    const stateKeys = Object.keys(localStorage).filter(key => key.startsWith('lockout_state_'));
    for (const key of stateKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const status: LockoutStatus = JSON.parse(data);
          if (status.lockoutExpiresAt) {
            status.lockoutExpiresAt = new Date(status.lockoutExpiresAt);
          }
          const userId = key.replace('lockout_state_', '');
          this.lockoutStates.set(userId, status);
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    }

    // Load attempt history
    const attemptKeys = Object.keys(localStorage).filter(key => key.startsWith('lockout_attempts_'));
    for (const key of attemptKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const attempts: AttemptRecord[] = JSON.parse(data);
          attempts.forEach(attempt => {
            attempt.timestamp = new Date(attempt.timestamp);
          });
          const userId = key.replace('lockout_attempts_', '');
          this.attemptHistory.set(userId, attempts);
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Cleanup expired data
   */
  private cleanupExpiredData(): void {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days

    // Clean attempt history
    for (const [userId, attempts] of this.attemptHistory) {
      const filtered = attempts.filter(a => a.timestamp > cutoff);
      if (filtered.length !== attempts.length) {
        this.attemptHistory.set(userId, filtered);
        this.saveAttemptsToStorage(userId, filtered);
      }
    }

    // Clean expired lockout states
    for (const [userId, status] of this.lockoutStates) {
      if (status.lockoutExpiresAt && status.lockoutExpiresAt < now) {
        this.unlockUser(userId, 'cleanup_expired');
      }
    }
  }

  /**
   * Get lockout statistics
   */
  public getLockoutStatistics(timeRange: number = 24 * 60 * 60 * 1000): {
    totalAttempts: number;
    failedAttempts: number;
    successfulAttempts: number;
    lockoutEvents: number;
    averageRiskScore: number;
    byRiskLevel: Record<string, number>;
  } {
    const cutoff = new Date(Date.now() - timeRange);
    const allAttempts: AttemptRecord[] = [];
    
    for (const attempts of this.attemptHistory.values()) {
      allAttempts.push(...attempts.filter(a => a.timestamp > cutoff));
    }

    const failed = allAttempts.filter(a => !a.success);
    const successful = allAttempts.filter(a => a.success);
    
    const riskScores = allAttempts.map(a => a.metadata.riskScore).filter(s => s > 0);
    const averageRiskScore = riskScores.length > 0 
      ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length 
      : 0;

    const byRiskLevel = { low: 0, medium: 0, high: 0, critical: 0 };
    Array.from(this.lockoutStates.values()).forEach(status => {
      byRiskLevel[status.riskLevel]++;
    });

    return {
      totalAttempts: allAttempts.length,
      failedAttempts: failed.length,
      successfulAttempts: successful.length,
      lockoutEvents: Array.from(this.lockoutStates.values()).filter(s => s.isLocked).length,
      averageRiskScore,
      byRiskLevel
    };
  }
}

// Singleton export
export const pinLockoutSystemService = PinLockoutSystemService.getInstance();

// Utility functions
export const LockoutUtils = {
  /**
   * Format lockout duration
   */
  formatLockoutDuration(milliseconds: number, locale: 'en' | 'fr' = 'en'): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (locale === 'fr') {
      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      }
      return `${minutes}min`;
    } else {
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
  },

  /**
   * Get risk level color
   */
  getRiskLevelColor(riskLevel: string): string {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#7C2D12'
    };
    return colors[riskLevel as keyof typeof colors] || colors.low;
  },

  /**
   * Get lockout state description
   */
  getLockoutStateDescription(state: LockoutState, locale: 'en' | 'fr' = 'en'): string {
    const descriptions = {
      en: {
        [LockoutState.ACTIVE]: 'Active',
        [LockoutState.LOCKED]: 'Locked',
        [LockoutState.EMERGENCY_LOCKED]: 'Emergency Locked',
        [LockoutState.MANAGER_LOCKED]: 'Manager Locked',
        [LockoutState.PERMANENTLY_LOCKED]: 'Permanently Locked'
      },
      fr: {
        [LockoutState.ACTIVE]: 'Actif',
        [LockoutState.LOCKED]: 'Verrouillé',
        [LockoutState.EMERGENCY_LOCKED]: 'Verrouillage d\'urgence',
        [LockoutState.MANAGER_LOCKED]: 'Verrouillage gestionnaire',
        [LockoutState.PERMANENTLY_LOCKED]: 'Verrouillage permanent'
      }
    };

    return descriptions[locale][state] || descriptions.en[state];
  }
};

// Type exports
export type { LockoutConfig, LockoutStatus, AttemptRecord, RiskFactors };