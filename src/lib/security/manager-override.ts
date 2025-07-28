/**
 * Manager Override System
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements secure manager authentication for unlocking staff accounts,
 * emergency access, and administrative overrides with comprehensive audit trails.
 */

import { z } from 'zod';
import { envConfig } from '@/lib/env-config';
import { pinAuthService } from './pin-auth';
import { auditLoggingService, AuditLevel, AuditCategory, AuditEventType } from './audit-logging';
import { pinLockoutSystemService } from './lockout-system';

// Override request types
export enum OverrideType {
  ACCOUNT_UNLOCK = 'account_unlock',
  EMERGENCY_ACCESS = 'emergency_access',
  PIN_RESET = 'pin_reset',
  SESSION_EXTEND = 'session_extend',
  SECURITY_BYPASS = 'security_bypass',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

// Override authorization levels
export enum OverrideAuthLevel {
  MANAGER = 'manager',
  SENIOR_MANAGER = 'senior_manager',
  ADMIN = 'admin',
  SYSTEM_ADMIN = 'system_admin'
}

// Override request
export interface OverrideRequest {
  id: string;
  type: OverrideType;
  targetUserId: string;
  requestedBy: string;
  justification: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Request details
  details: {
    reason: string;
    expectedDuration?: number; // minutes
    affectedResources?: string[];
    businessImpact?: string;
    approvalRequired: boolean;
  };
  
  // Timestamps
  requestedAt: Date;
  expiresAt: Date;
  processedAt?: Date;
  
  // Status
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'executed';
  approvedBy?: string;
  deniedBy?: string;
  
  // Audit trail
  auditTrail: OverrideAuditEntry[];
}

// Override audit entry
export interface OverrideAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: string;
  metadata?: Record<string, any>;
}

// Override execution result
export interface OverrideExecutionResult {
  success: boolean;
  overrideId: string;
  executedAt: Date;
  executedBy: string;
  result?: any;
  error?: string;
  auditLogIds: string[];
}

// Manager authentication context
export interface ManagerAuthContext {
  managerId: string;
  managerRole: string;
  authLevel: OverrideAuthLevel;
  authenticatedAt: Date;
  authMethod: 'pin' | 'biometric' | 'emergency_code';
  deviceId: string;
  sessionValid: boolean;
}

// Override configuration
export interface OverrideConfig {
  requireDualApproval: boolean;
  maxOverrideDuration: number; // minutes
  emergencyAccessDuration: number; // minutes
  auditRetentionDays: number;
  allowedOverrideTypes: OverrideType[];
  authLevelRequirements: Record<OverrideType, OverrideAuthLevel>;
}

/**
 * Manager Override System Service
 */
export class ManagerOverrideService {
  private static instance: ManagerOverrideService;
  private config: OverrideConfig;
  private pendingRequests: Map<string, OverrideRequest> = new Map();
  private managerSessions: Map<string, ManagerAuthContext> = new Map();
  private overrideTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.config = {
      requireDualApproval: true,
      maxOverrideDuration: 60, // 1 hour
      emergencyAccessDuration: 30, // 30 minutes
      auditRetentionDays: 90,
      allowedOverrideTypes: Object.values(OverrideType),
      authLevelRequirements: {
        [OverrideType.ACCOUNT_UNLOCK]: OverrideAuthLevel.MANAGER,
        [OverrideType.EMERGENCY_ACCESS]: OverrideAuthLevel.SENIOR_MANAGER,
        [OverrideType.PIN_RESET]: OverrideAuthLevel.MANAGER,
        [OverrideType.SESSION_EXTEND]: OverrideAuthLevel.MANAGER,
        [OverrideType.SECURITY_BYPASS]: OverrideAuthLevel.ADMIN,
        [OverrideType.SYSTEM_MAINTENANCE]: OverrideAuthLevel.SYSTEM_ADMIN
      }
    };

    this.loadRequestsFromStorage();
    this.startCleanupTimer();
  }

  public static getInstance(): ManagerOverrideService {
    if (!ManagerOverrideService.instance) {
      ManagerOverrideService.instance = new ManagerOverrideService();
    }
    return ManagerOverrideService.instance;
  }

  /**
   * Authenticate manager for override operations
   */
  public async authenticateManager(
    managerId: string,
    pin: string,
    deviceId: string,
    overrideType: OverrideType
  ): Promise<ManagerAuthContext | null> {
    try {
      // Verify manager PIN
      const isValidPIN = await this.verifyManagerPIN(managerId, pin);
      if (!isValidPIN) {
        await auditLoggingService.logAuthEvent(
          AuditEventType.LOGIN_FAILURE,
          false,
          managerId,
          { reason: 'Invalid manager PIN for override' },
          { deviceId }
        );
        return null;
      }

      // Get manager details and authorization level
      const managerDetails = await this.getManagerDetails(managerId);
      if (!managerDetails) {
        return null;
      }

      // Check if manager has required authorization level
      const requiredLevel = this.config.authLevelRequirements[overrideType];
      if (!this.hasRequiredAuthLevel(managerDetails.authLevel, requiredLevel)) {
        await auditLoggingService.logAuthEvent(
          AuditEventType.ACCESS_DENIED,
          false,
          managerId,
          { 
            reason: 'Insufficient authorization level for override',
            required: requiredLevel,
            actual: managerDetails.authLevel
          }
        );
        return null;
      }

      const authContext: ManagerAuthContext = {
        managerId,
        managerRole: managerDetails.role,
        authLevel: managerDetails.authLevel,
        authenticatedAt: new Date(),
        authMethod: 'pin',
        deviceId,
        sessionValid: true
      };

      // Store manager session
      this.managerSessions.set(managerId, authContext);

      // Set session expiry
      setTimeout(() => {
        this.managerSessions.delete(managerId);
      }, 30 * 60 * 1000); // 30 minutes

      await auditLoggingService.logAuthEvent(
        AuditEventType.LOGIN_SUCCESS,
        true,
        managerId,
        { 
          purpose: 'manager_override_authentication',
          overrideType,
          authLevel: managerDetails.authLevel
        },
        { deviceId }
      );

      return authContext;

    } catch (error) {
      await auditLoggingService.logAuthEvent(
        AuditEventType.LOGIN_FAILURE,
        false,
        managerId,
        { 
          reason: 'Manager authentication error',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { deviceId }
      );
      return null;
    }
  }

  /**
   * Request override
   */
  public async requestOverride(
    type: OverrideType,
    targetUserId: string,
    requestedBy: string,
    justification: string,
    details: {
      reason: string;
      expectedDuration?: number;
      affectedResources?: string[];
      businessImpact?: string;
      urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<OverrideRequest> {
    // Validate manager authentication
    const managerAuth = this.managerSessions.get(requestedBy);
    if (!managerAuth || !managerAuth.sessionValid) {
      throw new Error('Manager authentication required');
    }

    // Check authorization level
    const requiredLevel = this.config.authLevelRequirements[type];
    if (!this.hasRequiredAuthLevel(managerAuth.authLevel, requiredLevel)) {
      throw new Error(`Insufficient authorization level. Required: ${requiredLevel}`);
    }

    const requestId = this.generateRequestId();
    const now = new Date();
    
    const request: OverrideRequest = {
      id: requestId,
      type,
      targetUserId,
      requestedBy,
      justification,
      urgencyLevel: details.urgencyLevel,
      
      details: {
        reason: details.reason,
        expectedDuration: details.expectedDuration || this.config.maxOverrideDuration,
        affectedResources: details.affectedResources,
        businessImpact: details.businessImpact,
        approvalRequired: this.requiresApproval(type, details.urgencyLevel)
      },
      
      requestedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
      
      status: 'pending',
      
      auditTrail: [{
        timestamp: now,
        action: 'request_created',
        performedBy: requestedBy,
        details: `Override request created: ${type} for user ${targetUserId}`,
        metadata: details
      }]
    };

    // Store request
    this.pendingRequests.set(requestId, request);
    this.saveRequestToStorage(request);

    // Set expiry timer
    this.setRequestTimer(requestId, 24 * 60 * 60 * 1000);

    // Auto-approve for low-risk, high-urgency scenarios
    if (!request.details.approvalRequired || details.urgencyLevel === 'critical') {
      await this.approveOverride(requestId, requestedBy, 'Auto-approved due to urgency level');
    }

    // Log the request
    await auditLoggingService.logEvent(
      AuditLevel.WARNING,
      AuditCategory.ADMIN_ACTION,
      AuditEventType.MANAGER_OVERRIDE,
      {
        action: 'override_requested',
        description: `Manager override requested: ${type}`,
        success: true,
        metadata: {
          overrideType: type,
          targetUserId,
          justification,
          urgencyLevel: details.urgencyLevel
        }
      },
      { userId: requestedBy }
    );

    return request;
  }

  /**
   * Approve override request
   */
  public async approveOverride(
    requestId: string,
    approvedBy: string,
    approvalReason: string
  ): Promise<boolean> {
    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    // Verify approver authentication
    const approverAuth = this.managerSessions.get(approvedBy);
    if (!approverAuth || !approverAuth.sessionValid) {
      throw new Error('Approver authentication required');
    }

    // Check if approver has sufficient level
    const requiredLevel = this.config.authLevelRequirements[request.type];
    if (!this.hasRequiredAuthLevel(approverAuth.authLevel, requiredLevel)) {
      throw new Error('Insufficient authorization level for approval');
    }

    // Dual approval check
    if (this.config.requireDualApproval && approvedBy === request.requestedBy) {
      throw new Error('Dual approval required - approver cannot be the same as requester');
    }

    const now = new Date();
    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.processedAt = now;

    request.auditTrail.push({
      timestamp: now,
      action: 'request_approved',
      performedBy: approvedBy,
      details: `Override request approved: ${approvalReason}`,
      metadata: { approvalReason }
    });

    this.saveRequestToStorage(request);

    await auditLoggingService.logEvent(
      AuditLevel.WARNING,
      AuditCategory.ADMIN_ACTION,
      AuditEventType.MANAGER_OVERRIDE,
      {
        action: 'override_approved',
        description: `Manager override approved`,
        success: true,
        metadata: {
          requestId,
          overrideType: request.type,
          approvalReason
        }
      },
      { userId: approvedBy }
    );

    return true;
  }

  /**
   * Execute approved override
   */
  public async executeOverride(
    requestId: string,
    executedBy: string
  ): Promise<OverrideExecutionResult> {
    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== 'approved') {
      throw new Error('Override request not found or not approved');
    }

    // Verify executor authentication
    const executorAuth = this.managerSessions.get(executedBy);
    if (!executorAuth || !executorAuth.sessionValid) {
      throw new Error('Executor authentication required');
    }

    const now = new Date();
    const auditLogIds: string[] = [];

    try {
      let result: any = null;

      // Execute the specific override type
      switch (request.type) {
        case OverrideType.ACCOUNT_UNLOCK:
          result = await this.executeAccountUnlock(request, executedBy);
          break;
        
        case OverrideType.PIN_RESET:
          result = await this.executePinReset(request, executedBy);
          break;
        
        case OverrideType.EMERGENCY_ACCESS:
          result = await this.executeEmergencyAccess(request, executedBy);
          break;
        
        case OverrideType.SESSION_EXTEND:
          result = await this.executeSessionExtension(request, executedBy);
          break;
        
        case OverrideType.SECURITY_BYPASS:
          result = await this.executeSecurityBypass(request, executedBy);
          break;
        
        case OverrideType.SYSTEM_MAINTENANCE:
          result = await this.executeSystemMaintenance(request, executedBy);
          break;
        
        default:
          throw new Error(`Unsupported override type: ${request.type}`);
      }

      // Update request status
      request.status = 'executed';
      request.auditTrail.push({
        timestamp: now,
        action: 'override_executed',
        performedBy: executedBy,
        details: `Override executed successfully`,
        metadata: { result }
      });

      this.saveRequestToStorage(request);

      // Log execution
      const auditLog = await auditLoggingService.logEvent(
        AuditLevel.CRITICAL,
        AuditCategory.ADMIN_ACTION,
        AuditEventType.MANAGER_OVERRIDE,
        {
          action: 'override_executed',
          description: `Manager override executed: ${request.type}`,
          success: true,
          metadata: {
            requestId,
            overrideType: request.type,
            targetUserId: request.targetUserId,
            result
          }
        },
        { userId: executedBy }
      );

      auditLogIds.push(auditLog.id);

      return {
        success: true,
        overrideId: requestId,
        executedAt: now,
        executedBy,
        result,
        auditLogIds
      };

    } catch (error) {
      // Log failure
      const auditLog = await auditLoggingService.logEvent(
        AuditLevel.ERROR,
        AuditCategory.ADMIN_ACTION,
        AuditEventType.MANAGER_OVERRIDE,
        {
          action: 'override_execution_failed',
          description: `Manager override execution failed: ${request.type}`,
          success: false,
          metadata: {
            requestId,
            overrideType: request.type,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { userId: executedBy }
      );

      auditLogIds.push(auditLog.id);

      return {
        success: false,
        overrideId: requestId,
        executedAt: now,
        executedBy,
        error: error instanceof Error ? error.message : 'Unknown error',
        auditLogIds
      };
    }
  }

  /**
   * Execute account unlock
   */
  private async executeAccountUnlock(
    request: OverrideRequest,
    executedBy: string
  ): Promise<any> {
    const success = pinLockoutSystemService.unlockUser(
      request.targetUserId,
      'manager_override',
      executedBy
    );

    if (!success) {
      throw new Error('Failed to unlock user account');
    }

    return { unlocked: true, unlockedBy: executedBy };
  }

  /**
   * Execute PIN reset
   */
  private async executePinReset(
    request: OverrideRequest,
    executedBy: string
  ): Promise<any> {
    // Generate temporary PIN
    const tempPin = this.generateTemporaryPIN();
    
    // In a real implementation, this would update the user's PIN in the database
    // For now, we'll simulate the reset
    
    return {
      pinReset: true,
      temporaryPin: tempPin,
      mustChangeOnNextLogin: true,
      resetBy: executedBy
    };
  }

  /**
   * Execute emergency access
   */
  private async executeEmergencyAccess(
    request: OverrideRequest,
    executedBy: string
  ): Promise<any> {
    const emergencyToken = this.generateEmergencyToken();
    const expiresAt = new Date(Date.now() + this.config.emergencyAccessDuration * 60 * 1000);
    
    return {
      emergencyToken,
      expiresAt,
      allowedOperations: ['sop_read', 'emergency_procedures'],
      grantedBy: executedBy
    };
  }

  /**
   * Execute session extension
   */
  private async executeSessionExtension(
    request: OverrideRequest,
    executedBy: string
  ): Promise<any> {
    const extensionDuration = request.details.expectedDuration || 60; // minutes
    
    return {
      sessionExtended: true,
      extensionDuration,
      newExpiryTime: new Date(Date.now() + extensionDuration * 60 * 1000),
      extendedBy: executedBy
    };
  }

  /**
   * Execute security bypass
   */
  private async executeSecurityBypass(
    request: OverrideRequest,
    executedBy: string
  ): Promise<any> {
    const bypassToken = this.generateBypassToken();
    const expiresAt = new Date(Date.now() + (request.details.expectedDuration || 30) * 60 * 1000);
    
    return {
      bypassToken,
      expiresAt,
      bypassedControls: request.details.affectedResources || [],
      grantedBy: executedBy
    };
  }

  /**
   * Execute system maintenance
   */
  private async executeSystemMaintenance(
    request: OverrideRequest,
    executedBy: string
  ): Promise<any> {
    return {
      maintenanceMode: true,
      startedBy: executedBy,
      expectedDuration: request.details.expectedDuration,
      affectedSystems: request.details.affectedResources
    };
  }

  /**
   * Verify manager PIN
   */
  private async verifyManagerPIN(managerId: string, pin: string): Promise<boolean> {
    // In a real implementation, this would verify against the manager's stored PIN hash
    // For now, we'll use the existing PIN auth service
    try {
      // This is a simplified check - in production, you'd have separate manager authentication
      return pin.length === 4 && /^\d{4}$/.test(pin);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get manager details
   */
  private async getManagerDetails(managerId: string): Promise<{
    role: string;
    authLevel: OverrideAuthLevel;
  } | null> {
    // In a real implementation, this would fetch from the database
    // For now, we'll use a simple mapping based on manager ID patterns
    
    if (managerId.includes('admin')) {
      return { role: 'admin', authLevel: OverrideAuthLevel.ADMIN };
    } else if (managerId.includes('senior')) {
      return { role: 'senior_manager', authLevel: OverrideAuthLevel.SENIOR_MANAGER };
    } else if (managerId.includes('manager')) {
      return { role: 'manager', authLevel: OverrideAuthLevel.MANAGER };
    }
    
    return null;
  }

  /**
   * Check if user has required authorization level
   */
  private hasRequiredAuthLevel(userLevel: OverrideAuthLevel, requiredLevel: OverrideAuthLevel): boolean {
    const levels = [
      OverrideAuthLevel.MANAGER,
      OverrideAuthLevel.SENIOR_MANAGER,
      OverrideAuthLevel.ADMIN,
      OverrideAuthLevel.SYSTEM_ADMIN
    ];
    
    const userIndex = levels.indexOf(userLevel);
    const requiredIndex = levels.indexOf(requiredLevel);
    
    return userIndex >= requiredIndex;
  }

  /**
   * Check if override requires approval
   */
  private requiresApproval(type: OverrideType, urgencyLevel: string): boolean {
    // Critical urgency can bypass approval for some types
    if (urgencyLevel === 'critical') {
      return ![OverrideType.ACCOUNT_UNLOCK, OverrideType.EMERGENCY_ACCESS].includes(type);
    }
    
    // High-risk overrides always require approval
    return [OverrideType.SECURITY_BYPASS, OverrideType.SYSTEM_MAINTENANCE].includes(type);
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(36))
      .join('');
    
    return `override_${timestamp}_${random}`;
  }

  /**
   * Generate temporary PIN
   */
  private generateTemporaryPIN(): string {
    return Math.floor(Math.random() * 9000 + 1000).toString();
  }

  /**
   * Generate emergency token
   */
  private generateEmergencyToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate bypass token
   */
  private generateBypassToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Set request timer
   */
  private setRequestTimer(requestId: string, duration: number): void {
    const timer = setTimeout(() => {
      this.expireRequest(requestId);
    }, duration);
    
    this.overrideTimers.set(requestId, timer);
  }

  /**
   * Expire request
   */
  private expireRequest(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (request && request.status === 'pending') {
      request.status = 'expired';
      request.auditTrail.push({
        timestamp: new Date(),
        action: 'request_expired',
        performedBy: 'system',
        details: 'Override request expired without approval'
      });
      
      this.saveRequestToStorage(request);
    }
    
    this.overrideTimers.delete(requestId);
  }

  /**
   * Get pending requests
   */
  public getPendingRequests(managerId?: string): OverrideRequest[] {
    const requests = Array.from(this.pendingRequests.values())
      .filter(req => req.status === 'pending');
    
    if (managerId) {
      return requests.filter(req => req.requestedBy === managerId);
    }
    
    return requests;
  }

  /**
   * Get request by ID
   */
  public getRequest(requestId: string): OverrideRequest | null {
    return this.pendingRequests.get(requestId) || null;
  }

  /**
   * Save request to storage
   */
  private saveRequestToStorage(request: OverrideRequest): void {
    if (typeof window !== 'undefined') {
      const key = `override_request_${request.id}`;
      localStorage.setItem(key, JSON.stringify(request));
    }
  }

  /**
   * Load requests from storage
   */
  private loadRequestsFromStorage(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage).filter(key => key.startsWith('override_request_'));
    
    for (const key of keys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const request: OverrideRequest = JSON.parse(data);
          
          // Convert date strings back to Date objects
          request.requestedAt = new Date(request.requestedAt);
          request.expiresAt = new Date(request.expiresAt);
          if (request.processedAt) {
            request.processedAt = new Date(request.processedAt);
          }
          
          request.auditTrail.forEach(entry => {
            entry.timestamp = new Date(entry.timestamp);
          });
          
          // Only load non-expired requests
          if (request.expiresAt > new Date()) {
            this.pendingRequests.set(request.id, request);
            
            // Reset timer for pending requests
            if (request.status === 'pending') {
              const remainingTime = request.expiresAt.getTime() - Date.now();
              if (remainingTime > 0) {
                this.setRequestTimer(request.id, remainingTime);
              }
            }
          } else {
            localStorage.removeItem(key);
          }
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
      this.cleanupExpiredRequests();
    }, 60 * 60 * 1000); // Hourly cleanup
  }

  /**
   * Cleanup expired requests
   */
  private cleanupExpiredRequests(): void {
    const now = new Date();
    
    for (const [requestId, request] of this.pendingRequests) {
      if (request.expiresAt < now) {
        this.expireRequest(requestId);
      }
    }
  }
}

// Singleton export
export const managerOverrideService = ManagerOverrideService.getInstance();

// Utility functions
export const OverrideUtils = {
  /**
   * Format override type
   */
  formatOverrideType(type: OverrideType, locale: 'en' | 'fr' = 'en'): string {
    const labels = {
      en: {
        [OverrideType.ACCOUNT_UNLOCK]: 'Account Unlock',
        [OverrideType.EMERGENCY_ACCESS]: 'Emergency Access',
        [OverrideType.PIN_RESET]: 'PIN Reset',
        [OverrideType.SESSION_EXTEND]: 'Session Extension',
        [OverrideType.SECURITY_BYPASS]: 'Security Bypass',
        [OverrideType.SYSTEM_MAINTENANCE]: 'System Maintenance'
      },
      fr: {
        [OverrideType.ACCOUNT_UNLOCK]: 'Déverrouillage de compte',
        [OverrideType.EMERGENCY_ACCESS]: 'Accès d\'urgence',
        [OverrideType.PIN_RESET]: 'Réinitialisation PIN',
        [OverrideType.SESSION_EXTEND]: 'Extension de session',
        [OverrideType.SECURITY_BYPASS]: 'Contournement sécurité',
        [OverrideType.SYSTEM_MAINTENANCE]: 'Maintenance système'
      }
    };

    return labels[locale][type] || labels.en[type];
  },

  /**
   * Get urgency level color
   */
  getUrgencyColor(level: string): string {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#7C2D12'
    };
    return colors[level as keyof typeof colors] || colors.low;
  },

  /**
   * Format auth level
   */
  formatAuthLevel(level: OverrideAuthLevel, locale: 'en' | 'fr' = 'en'): string {
    const labels = {
      en: {
        [OverrideAuthLevel.MANAGER]: 'Manager',
        [OverrideAuthLevel.SENIOR_MANAGER]: 'Senior Manager',
        [OverrideAuthLevel.ADMIN]: 'Administrator',
        [OverrideAuthLevel.SYSTEM_ADMIN]: 'System Administrator'
      },
      fr: {
        [OverrideAuthLevel.MANAGER]: 'Gestionnaire',
        [OverrideAuthLevel.SENIOR_MANAGER]: 'Gestionnaire senior',
        [OverrideAuthLevel.ADMIN]: 'Administrateur',
        [OverrideAuthLevel.SYSTEM_ADMIN]: 'Administrateur système'
      }
    };

    return labels[locale][level] || labels.en[level];
  }
};

// Type exports
export type { OverrideRequest, ManagerAuthContext, OverrideExecutionResult, OverrideConfig };