/**
 * Enhanced Session Management System
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements comprehensive session management with 8-hour expiry,
 * automatic refresh, warning system, and security monitoring.
 */

import { z } from 'zod';
import { envConfig } from '@/lib/env-config';
import { deviceFingerprintingService } from './device-fingerprinting';

// Session states
export enum SessionState {
  ACTIVE = 'active',
  WARNING = 'warning',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  SUSPENDED = 'suspended'
}

// Session data structure
export interface SessionData {
  sessionId: string;
  userId: string;
  restaurantId: string;
  role: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  
  // Timestamps
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  lastRefresh: Date;
  
  // Security
  state: SessionState;
  warningIssued: boolean;
  refreshCount: number;
  securityLevel: 'low' | 'medium' | 'high';
  
  // Metadata
  metadata: {
    loginMethod: 'pin' | 'biometric' | 'emergency';
    deviceTrusted: boolean;
    locationVerified: boolean;
    features: string[];
  };
}

// Session configuration
export interface SessionConfig {
  maxDuration: number; // 8 hours in milliseconds
  warningThreshold: number; // 30 minutes before expiry
  refreshThreshold: number; // 2 hours before expiry
  maxRefreshCount: number; // Maximum refreshes per session
  idleTimeout: number; // 30 minutes of inactivity
  securityCheckInterval: number; // Security validation interval
}

// Session validation result
export interface SessionValidationResult {
  valid: boolean;
  state: SessionState;
  expiresIn: number;
  needsRefresh: boolean;
  needsWarning: boolean;
  securityIssues: string[];
}

// Session event types
export enum SessionEventType {
  CREATED = 'created',
  REFRESHED = 'refreshed',
  WARNING_ISSUED = 'warning_issued',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  SECURITY_VIOLATION = 'security_violation',
  ACTIVITY_DETECTED = 'activity_detected'
}

// Session event
export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  timestamp: Date;
  data?: any;
}

/**
 * Enhanced Session Management Service
 */
export class SessionManagementService {
  private static instance: SessionManagementService;
  private activeSessions: Map<string, SessionData> = new Map();
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: SessionConfig;
  private eventCallbacks: Map<SessionEventType, ((event: SessionEvent) => void)[]> = new Map();

  private constructor() {
    this.config = {
      maxDuration: 8 * 60 * 60 * 1000, // 8 hours
      warningThreshold: 30 * 60 * 1000, // 30 minutes
      refreshThreshold: 2 * 60 * 60 * 1000, // 2 hours
      maxRefreshCount: 3,
      idleTimeout: 30 * 60 * 1000, // 30 minutes
      securityCheckInterval: 5 * 60 * 1000 // 5 minutes
    };

    // Load existing sessions from storage
    this.loadSessionsFromStorage();
    
    // Start background security monitoring
    this.startSecurityMonitoring();
  }

  public static getInstance(): SessionManagementService {
    if (!SessionManagementService.instance) {
      SessionManagementService.instance = new SessionManagementService();
    }
    return SessionManagementService.instance;
  }

  /**
   * Create new session
   */
  public async createSession(
    userId: string,
    restaurantId: string,
    role: string,
    metadata: {
      loginMethod: 'pin' | 'biometric' | 'emergency';
      deviceId: string;
      ipAddress: string;
      userAgent: string;
      deviceTrusted?: boolean;
      locationVerified?: boolean;
    }
  ): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: SessionData = {
      sessionId,
      userId,
      restaurantId,
      role,
      deviceId: metadata.deviceId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.maxDuration),
      lastActivity: now,
      lastRefresh: now,
      
      state: SessionState.ACTIVE,
      warningIssued: false,
      refreshCount: 0,
      securityLevel: this.calculateSecurityLevel(metadata),
      
      metadata: {
        loginMethod: metadata.loginMethod,
        deviceTrusted: metadata.deviceTrusted || false,
        locationVerified: metadata.locationVerified || false,
        features: []
      }
    };

    // Store session
    this.activeSessions.set(sessionId, session);
    this.saveSessionToStorage(session);
    
    // Set up timers
    this.setupSessionTimers(session);
    
    // Emit event
    this.emitEvent({
      type: SessionEventType.CREATED,
      sessionId,
      timestamp: now,
      data: { userId, role, loginMethod: metadata.loginMethod }
    });

    return session;
  }

  /**
   * Validate session
   */
  public validateSession(sessionId: string): SessionValidationResult {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return {
        valid: false,
        state: SessionState.EXPIRED,
        expiresIn: 0,
        needsRefresh: false,
        needsWarning: false,
        securityIssues: ['Session not found']
      };
    }

    const now = new Date();
    const expiresIn = session.expiresAt.getTime() - now.getTime();
    const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
    
    const securityIssues: string[] = [];
    
    // Check if session is expired
    if (expiresIn <= 0) {
      this.expireSession(sessionId);
      return {
        valid: false,
        state: SessionState.EXPIRED,
        expiresIn: 0,
        needsRefresh: false,
        needsWarning: false,
        securityIssues: ['Session expired']
      };
    }

    // Check for idle timeout
    if (timeSinceActivity > this.config.idleTimeout) {
      this.suspendSession(sessionId, 'Idle timeout exceeded');
      securityIssues.push('Session idle timeout');
    }

    // Check session state
    if (session.state !== SessionState.ACTIVE && session.state !== SessionState.WARNING) {
      return {
        valid: false,
        state: session.state,
        expiresIn,
        needsRefresh: false,
        needsWarning: false,
        securityIssues: [`Session state: ${session.state}`]
      };
    }

    // Determine if refresh is needed
    const needsRefresh = expiresIn < this.config.refreshThreshold && 
                        session.refreshCount < this.config.maxRefreshCount;

    // Determine if warning is needed
    const needsWarning = expiresIn < this.config.warningThreshold && !session.warningIssued;

    // Perform security checks
    const additionalSecurityIssues = this.performSecurityChecks(session);
    securityIssues.push(...additionalSecurityIssues);

    return {
      valid: securityIssues.length === 0,
      state: session.state,
      expiresIn,
      needsRefresh,
      needsWarning,
      securityIssues
    };
  }

  /**
   * Refresh session
   */
  public async refreshSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.state !== SessionState.ACTIVE) {
      return false;
    }

    if (session.refreshCount >= this.config.maxRefreshCount) {
      this.expireSession(sessionId, 'Maximum refresh count exceeded');
      return false;
    }

    const now = new Date();
    
    // Extend session
    session.expiresAt = new Date(now.getTime() + this.config.maxDuration);
    session.lastRefresh = now;
    session.lastActivity = now;
    session.refreshCount++;
    session.warningIssued = false;
    
    // Update storage
    this.saveSessionToStorage(session);
    
    // Reset timers
    this.setupSessionTimers(session);
    
    // Emit event
    this.emitEvent({
      type: SessionEventType.REFRESHED,
      sessionId,
      timestamp: now,
      data: { refreshCount: session.refreshCount }
    });

    return true;
  }

  /**
   * Update session activity
   */
  public updateActivity(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.state !== SessionState.ACTIVE) {
      return false;
    }

    session.lastActivity = new Date();
    this.saveSessionToStorage(session);
    
    this.emitEvent({
      type: SessionEventType.ACTIVITY_DETECTED,
      sessionId,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Issue session warning
   */
  public issueSessionWarning(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.warningIssued) {
      return false;
    }

    session.state = SessionState.WARNING;
    session.warningIssued = true;
    
    this.saveSessionToStorage(session);
    
    this.emitEvent({
      type: SessionEventType.WARNING_ISSUED,
      sessionId,
      timestamp: new Date(),
      data: { 
        expiresIn: session.expiresAt.getTime() - Date.now(),
        canRefresh: session.refreshCount < this.config.maxRefreshCount
      }
    });

    return true;
  }

  /**
   * Terminate session
   */
  public terminateSession(sessionId: string, reason?: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    session.state = SessionState.TERMINATED;
    
    // Clear timers
    this.clearSessionTimers(sessionId);
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    
    // Remove from storage
    this.removeSessionFromStorage(sessionId);
    
    this.emitEvent({
      type: SessionEventType.TERMINATED,
      sessionId,
      timestamp: new Date(),
      data: { reason }
    });

    return true;
  }

  /**
   * Expire session
   */
  private expireSession(sessionId: string, reason?: string): void {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) return;

    session.state = SessionState.EXPIRED;
    
    this.clearSessionTimers(sessionId);
    this.activeSessions.delete(sessionId);
    this.removeSessionFromStorage(sessionId);
    
    this.emitEvent({
      type: SessionEventType.EXPIRED,
      sessionId,
      timestamp: new Date(),
      data: { reason }
    });
  }

  /**
   * Suspend session
   */
  private suspendSession(sessionId: string, reason: string): void {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) return;

    session.state = SessionState.SUSPENDED;
    
    this.saveSessionToStorage(session);
    
    this.emitEvent({
      type: SessionEventType.SECURITY_VIOLATION,
      sessionId,
      timestamp: new Date(),
      data: { reason, action: 'suspended' }
    });
  }

  /**
   * Get session data
   */
  public getSession(sessionId: string): SessionData | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all sessions for user
   */
  public getUserSessions(userId: string): SessionData[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId);
  }

  /**
   * Calculate security level
   */
  private calculateSecurityLevel(metadata: {
    loginMethod: string;
    deviceTrusted?: boolean;
    locationVerified?: boolean;
  }): 'low' | 'medium' | 'high' {
    let score = 0;

    if (metadata.loginMethod === 'biometric') score += 3;
    else if (metadata.loginMethod === 'pin') score += 2;
    else score += 1; // emergency

    if (metadata.deviceTrusted) score += 2;
    if (metadata.locationVerified) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Perform security checks
   */
  private performSecurityChecks(session: SessionData): string[] {
    const issues: string[] = [];
    
    // Check device fingerprint consistency
    if (session.metadata.deviceTrusted) {
      const currentDeviceId = deviceFingerprintingService.getDeviceRegistration(session.deviceId);
      if (!currentDeviceId) {
        issues.push('Device no longer trusted');
      }
    }

    // Check for suspicious activity patterns
    const timeSinceLastRefresh = Date.now() - session.lastRefresh.getTime();
    if (session.refreshCount > 2 && timeSinceLastRefresh < 60000) {
      issues.push('Rapid session refresh detected');
    }

    return issues;
  }

  /**
   * Setup session timers
   */
  private setupSessionTimers(session: SessionData): void {
    this.clearSessionTimers(session.sessionId);
    
    const now = Date.now();
    const expiresIn = session.expiresAt.getTime() - now;
    const warningTime = expiresIn - this.config.warningThreshold;
    
    // Set warning timer
    if (warningTime > 0 && !session.warningIssued) {
      const warningTimer = setTimeout(() => {
        this.issueSessionWarning(session.sessionId);
      }, warningTime);
      
      this.sessionTimers.set(`${session.sessionId}_warning`, warningTimer);
    }
    
    // Set expiry timer
    if (expiresIn > 0) {
      const expiryTimer = setTimeout(() => {
        this.expireSession(session.sessionId, 'Session timeout');
      }, expiresIn);
      
      this.sessionTimers.set(`${session.sessionId}_expiry`, expiryTimer);
    }
  }

  /**
   * Clear session timers
   */
  private clearSessionTimers(sessionId: string): void {
    const warningTimer = this.sessionTimers.get(`${sessionId}_warning`);
    const expiryTimer = this.sessionTimers.get(`${sessionId}_expiry`);
    
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.sessionTimers.delete(`${sessionId}_warning`);
    }
    
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      this.sessionTimers.delete(`${sessionId}_expiry`);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(36))
      .join('');
    
    return `${timestamp}_${random}`;
  }

  /**
   * Start security monitoring
   */
  private startSecurityMonitoring(): void {
    setInterval(() => {
      this.performPeriodicSecurityChecks();
    }, this.config.securityCheckInterval);
  }

  /**
   * Perform periodic security checks
   */
  private performPeriodicSecurityChecks(): void {
    const now = Date.now();
    
    for (const [sessionId, session] of this.activeSessions) {
      const timeSinceActivity = now - session.lastActivity.getTime();
      
      // Check for idle timeout
      if (timeSinceActivity > this.config.idleTimeout && session.state === SessionState.ACTIVE) {
        this.suspendSession(sessionId, 'Idle timeout during security check');
      }
      
      // Check for other security issues
      const securityIssues = this.performSecurityChecks(session);
      if (securityIssues.length > 0) {
        this.emitEvent({
          type: SessionEventType.SECURITY_VIOLATION,
          sessionId,
          timestamp: new Date(),
          data: { issues: securityIssues }
        });
      }
    }
  }

  /**
   * Save session to storage
   */
  private saveSessionToStorage(session: SessionData): void {
    if (typeof window !== 'undefined') {
      const key = `session_${session.sessionId}`;
      localStorage.setItem(key, JSON.stringify(session));
    }
  }

  /**
   * Remove session from storage
   */
  private removeSessionFromStorage(sessionId: string): void {
    if (typeof window !== 'undefined') {
      const key = `session_${sessionId}`;
      localStorage.removeItem(key);
    }
  }

  /**
   * Load sessions from storage
   */
  private loadSessionsFromStorage(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage).filter(key => key.startsWith('session_'));
    
    for (const key of keys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const session: SessionData = JSON.parse(data);
          
          // Convert date strings back to Date objects
          session.createdAt = new Date(session.createdAt);
          session.expiresAt = new Date(session.expiresAt);
          session.lastActivity = new Date(session.lastActivity);
          session.lastRefresh = new Date(session.lastRefresh);
          
          // Check if session is still valid
          if (session.expiresAt > new Date() && session.state === SessionState.ACTIVE) {
            this.activeSessions.set(session.sessionId, session);
            this.setupSessionTimers(session);
          } else {
            // Remove expired session
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        // Remove corrupted session data
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Add event listener
   */
  public addEventListener(type: SessionEventType, callback: (event: SessionEvent) => void): void {
    if (!this.eventCallbacks.has(type)) {
      this.eventCallbacks.set(type, []);
    }
    this.eventCallbacks.get(type)!.push(callback);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(type: SessionEventType, callback: (event: SessionEvent) => void): void {
    const callbacks = this.eventCallbacks.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emitEvent(event: SessionEvent): void {
    const callbacks = this.eventCallbacks.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in session event callback:', error);
        }
      });
    }
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): {
    totalActive: number;
    byState: Record<SessionState, number>;
    bySecurityLevel: Record<string, number>;
    averageSessionDuration: number;
  } {
    const sessions = Array.from(this.activeSessions.values());
    
    const byState = {
      [SessionState.ACTIVE]: 0,
      [SessionState.WARNING]: 0,
      [SessionState.EXPIRED]: 0,
      [SessionState.TERMINATED]: 0,
      [SessionState.SUSPENDED]: 0
    };
    
    const bySecurityLevel = { low: 0, medium: 0, high: 0 };
    
    let totalDuration = 0;
    
    sessions.forEach(session => {
      byState[session.state]++;
      bySecurityLevel[session.securityLevel]++;
      totalDuration += Date.now() - session.createdAt.getTime();
    });
    
    return {
      totalActive: sessions.length,
      byState,
      bySecurityLevel,
      averageSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0
    };
  }

  /**
   * Cleanup expired sessions
   */
  public cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.expiresAt < now || session.state === SessionState.EXPIRED) {
        this.terminateSession(sessionId, 'Cleanup expired session');
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
}

// Singleton export
export const sessionManagementService = SessionManagementService.getInstance();

// Utility functions for session management
export const SessionUtils = {
  /**
   * Format session duration
   */
  formatDuration(milliseconds: number, locale: 'en' | 'fr' = 'en'): string {
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
   * Get session status description
   */
  getStatusDescription(state: SessionState, locale: 'en' | 'fr' = 'en'): string {
    const descriptions = {
      en: {
        [SessionState.ACTIVE]: 'Active',
        [SessionState.WARNING]: 'Expiring Soon',
        [SessionState.EXPIRED]: 'Expired',
        [SessionState.TERMINATED]: 'Terminated',
        [SessionState.SUSPENDED]: 'Suspended'
      },
      fr: {
        [SessionState.ACTIVE]: 'Actif',
        [SessionState.WARNING]: 'Expire bientôt',
        [SessionState.EXPIRED]: 'Expiré',
        [SessionState.TERMINATED]: 'Terminé',
        [SessionState.SUSPENDED]: 'Suspendu'
      }
    };

    return descriptions[locale][state] || descriptions.en[state];
  },

  /**
   * Check if session needs attention
   */
  needsAttention(session: SessionData): boolean {
    const now = Date.now();
    const expiresIn = session.expiresAt.getTime() - now;
    
    return session.state === SessionState.WARNING || 
           session.state === SessionState.SUSPENDED ||
           expiresIn < 15 * 60 * 1000; // Less than 15 minutes
  }
};

// Type exports
export type { SessionData, SessionConfig, SessionValidationResult, SessionEvent };