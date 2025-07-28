/**
 * Comprehensive Audit Logging System
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements comprehensive audit logging for authentication attempts,
 * security events, compliance monitoring, and forensic analysis.
 */

import { z } from 'zod';
import { envConfig } from '@/lib/env-config';

// Audit event levels
export enum AuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  SECURITY = 'security'
}

// Audit event categories
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  SYSTEM_SECURITY = 'system_security',
  COMPLIANCE = 'compliance',
  BUSINESS_LOGIC = 'business_logic',
  ADMIN_ACTION = 'admin_action',
  CONFIGURATION = 'configuration'
}

// Audit event types
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  BIOMETRIC_AUTH = 'biometric_auth',
  PIN_CHANGE = 'pin_change',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  
  // Authorization events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PERMISSION_ESCALATION = 'permission_escalation',
  MANAGER_OVERRIDE = 'manager_override',
  
  // Data access events
  SOP_ACCESSED = 'sop_accessed',
  SOP_MODIFIED = 'sop_modified',
  SOP_DELETED = 'sop_deleted',
  DATA_EXPORT = 'data_export',
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  
  // Security events
  SECURITY_VIOLATION = 'security_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  DEVICE_CHANGE = 'device_change',
  IP_CHANGE = 'ip_change',
  
  // System events
  SYSTEM_ERROR = 'system_error',
  CONFIGURATION_CHANGE = 'configuration_change',
  BACKUP_CREATED = 'backup_created',
  MAINTENANCE_MODE = 'maintenance_mode',
  
  // Compliance events
  GDPR_DATA_REQUEST = 'gdpr_data_request',
  DATA_RETENTION_CLEANUP = 'data_retention_cleanup',
  COMPLIANCE_REPORT = 'compliance_report',
  AUDIT_TRAIL_EXPORT = 'audit_trail_export'
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  level: AuditLevel;
  category: AuditCategory;
  eventType: AuditEventType;
  
  // Actor information
  actor: {
    userId?: string;
    userRole?: string;
    sessionId?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  
  // Target information
  target?: {
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    restaurantId?: string;
  };
  
  // Event details
  details: {
    action: string;
    description: string;
    success: boolean;
    errorCode?: string;
    riskScore?: number;
    metadata?: Record<string, any>;
  };
  
  // Context information
  context: {
    source: string;
    version: string;
    environment: string;
    correlationId?: string;
    requestId?: string;
  };
  
  // Compliance and forensics
  compliance: {
    gdprRelevant: boolean;
    retentionPeriod: number; // days
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    sensitiveData: boolean;
  };
}

// Audit query filters
export interface AuditQueryFilters {
  startDate?: Date;
  endDate?: Date;
  levels?: AuditLevel[];
  categories?: AuditCategory[];
  eventTypes?: AuditEventType[];
  userId?: string;
  restaurantId?: string;
  ipAddress?: string;
  success?: boolean;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

// Audit statistics
export interface AuditStatistics {
  totalEvents: number;
  byLevel: Record<AuditLevel, number>;
  byCategory: Record<AuditCategory, number>;
  byUser: Record<string, number>;
  byTimeframe: { hour: number; count: number }[];
  securityEvents: number;
  complianceEvents: number;
  criticalEvents: number;
}

// Audit configuration
export interface AuditConfig {
  enabled: boolean;
  logLevel: AuditLevel;
  retentionDays: number;
  maxEntriesInMemory: number;
  encryptLogs: boolean;
  anonymizeUserData: boolean;
  realTimeAlerting: boolean;
  complianceMode: boolean;
}

/**
 * Comprehensive Audit Logging Service
 */
export class AuditLoggingService {
  private static instance: AuditLoggingService;
  private config: AuditConfig;
  private logEntries: Map<string, AuditLogEntry> = new Map();
  private alertCallbacks: Map<AuditLevel, ((entry: AuditLogEntry) => void)[]> = new Map();
  private correlationIds: Map<string, string[]> = new Map();

  private constructor() {
    this.config = {
      enabled: true,
      logLevel: (envConfig.server.AUDIT_LOG_LEVEL as AuditLevel) || AuditLevel.INFO,
      retentionDays: envConfig.server.AUDIT_LOG_RETENTION_DAYS || 90,
      maxEntriesInMemory: 10000,
      encryptLogs: true,
      anonymizeUserData: envConfig.server.ANONYMIZE_LOGS || true,
      realTimeAlerting: true,
      complianceMode: envConfig.server.GDPR_ENABLED || true
    };

    this.loadAuditLogsFromStorage();
    this.startMaintenanceTimer();
  }

  public static getInstance(): AuditLoggingService {
    if (!AuditLoggingService.instance) {
      AuditLoggingService.instance = new AuditLoggingService();
    }
    return AuditLoggingService.instance;
  }

  /**
   * Log audit event
   */
  public async logEvent(
    level: AuditLevel,
    category: AuditCategory,
    eventType: AuditEventType,
    details: {
      action: string;
      description: string;
      success: boolean;
      errorCode?: string;
      riskScore?: number;
      metadata?: Record<string, any>;
    },
    actor?: {
      userId?: string;
      userRole?: string;
      sessionId?: string;
      deviceId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
    target?: {
      resourceType?: string;
      resourceId?: string;
      resourceName?: string;
      restaurantId?: string;
    },
    options?: {
      correlationId?: string;
      requestId?: string;
      source?: string;
    }
  ): Promise<AuditLogEntry> {
    if (!this.config.enabled || !this.shouldLogLevel(level)) {
      throw new Error('Audit logging is disabled or level not configured');
    }

    const entry: AuditLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      eventType,
      
      actor: {
        userId: this.config.anonymizeUserData ? this.anonymizeUserId(actor?.userId) : actor?.userId,
        userRole: actor?.userRole,
        sessionId: actor?.sessionId,
        deviceId: actor?.deviceId,
        ipAddress: this.config.anonymizeUserData ? this.anonymizeIpAddress(actor?.ipAddress) : actor?.ipAddress,
        userAgent: actor?.userAgent
      },
      
      target: target || {},
      
      details,
      
      context: {
        source: options?.source || 'unknown',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        correlationId: options?.correlationId,
        requestId: options?.requestId
      },
      
      compliance: {
        gdprRelevant: this.isGDPRRelevant(category, eventType),
        retentionPeriod: this.calculateRetentionPeriod(category, level),
        dataClassification: this.classifyDataSensitivity(category, eventType),
        sensitiveData: this.containsSensitiveData(details, actor, target)
      }
    };

    // Store the log entry
    await this.storeLogEntry(entry);
    
    // Handle correlation
    if (entry.context.correlationId) {
      this.addToCorrelation(entry.context.correlationId, entry.id);
    }
    
    // Real-time alerting
    if (this.config.realTimeAlerting && this.shouldAlert(entry)) {
      await this.sendAlert(entry);
    }
    
    // Trigger callbacks
    this.triggerCallbacks(entry);
    
    return entry;
  }

  /**
   * Log authentication event
   */
  public async logAuthEvent(
    eventType: AuditEventType,
    success: boolean,
    userId?: string,
    details?: Record<string, any>,
    actor?: {
      sessionId?: string;
      deviceId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuditLogEntry> {
    const level = success ? AuditLevel.INFO : AuditLevel.WARNING;
    const riskScore = details?.riskScore || 0;
    
    return this.logEvent(
      level,
      AuditCategory.AUTHENTICATION,
      eventType,
      {
        action: eventType.replace('_', ' '),
        description: `Authentication ${success ? 'successful' : 'failed'} for user`,
        success,
        riskScore,
        metadata: details
      },
      {
        userId,
        ...actor
      }
    );
  }

  /**
   * Log data access event
   */
  public async logDataAccess(
    eventType: AuditEventType,
    resourceType: string,
    resourceId: string,
    action: string,
    userId: string,
    success: boolean = true,
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    return this.logEvent(
      AuditLevel.INFO,
      AuditCategory.DATA_ACCESS,
      eventType,
      {
        action,
        description: `Data access: ${action} ${resourceType}`,
        success,
        metadata
      },
      { userId },
      {
        resourceType,
        resourceId,
        resourceName: metadata?.resourceName
      }
    );
  }

  /**
   * Log security event
   */
  public async logSecurityEvent(
    eventType: AuditEventType,
    description: string,
    riskScore: number,
    actor?: {
      userId?: string;
      deviceId?: string;
      ipAddress?: string;
    },
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    const level = riskScore >= 80 ? AuditLevel.CRITICAL : 
                 riskScore >= 60 ? AuditLevel.ERROR : 
                 AuditLevel.WARNING;

    return this.logEvent(
      level,
      AuditCategory.SYSTEM_SECURITY,
      eventType,
      {
        action: 'security_event',
        description,
        success: false,
        riskScore,
        metadata
      },
      actor
    );
  }

  /**
   * Log compliance event
   */
  public async logComplianceEvent(
    eventType: AuditEventType,
    action: string,
    description: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    return this.logEvent(
      AuditLevel.INFO,
      AuditCategory.COMPLIANCE,
      eventType,
      {
        action,
        description,
        success: true,
        metadata
      },
      { userId }
    );
  }

  /**
   * Query audit logs
   */
  public queryLogs(filters: AuditQueryFilters): AuditLogEntry[] {
    let results = Array.from(this.logEntries.values());

    // Apply filters
    if (filters.startDate) {
      results = results.filter(entry => entry.timestamp >= filters.startDate!);
    }
    
    if (filters.endDate) {
      results = results.filter(entry => entry.timestamp <= filters.endDate!);
    }
    
    if (filters.levels && filters.levels.length > 0) {
      results = results.filter(entry => filters.levels!.includes(entry.level));
    }
    
    if (filters.categories && filters.categories.length > 0) {
      results = results.filter(entry => filters.categories!.includes(entry.category));
    }
    
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      results = results.filter(entry => filters.eventTypes!.includes(entry.eventType));
    }
    
    if (filters.userId) {
      results = results.filter(entry => entry.actor.userId === filters.userId);
    }
    
    if (filters.restaurantId) {
      results = results.filter(entry => entry.target?.restaurantId === filters.restaurantId);
    }
    
    if (filters.ipAddress) {
      results = results.filter(entry => entry.actor.ipAddress === filters.ipAddress);
    }
    
    if (filters.success !== undefined) {
      results = results.filter(entry => entry.details.success === filters.success);
    }
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      results = results.filter(entry => 
        entry.details.description.toLowerCase().includes(term) ||
        entry.details.action.toLowerCase().includes(term) ||
        JSON.stringify(entry.details.metadata || {}).toLowerCase().includes(term)
      );
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    
    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit statistics
   */
  public getStatistics(timeRange: number = 24 * 60 * 60 * 1000): AuditStatistics {
    const cutoff = new Date(Date.now() - timeRange);
    const entries = Array.from(this.logEntries.values())
      .filter(entry => entry.timestamp >= cutoff);

    const byLevel = {
      [AuditLevel.INFO]: 0,
      [AuditLevel.WARNING]: 0,
      [AuditLevel.ERROR]: 0,
      [AuditLevel.CRITICAL]: 0,
      [AuditLevel.SECURITY]: 0
    };

    const byCategory = {
      [AuditCategory.AUTHENTICATION]: 0,
      [AuditCategory.AUTHORIZATION]: 0,
      [AuditCategory.DATA_ACCESS]: 0,
      [AuditCategory.SYSTEM_SECURITY]: 0,
      [AuditCategory.COMPLIANCE]: 0,
      [AuditCategory.BUSINESS_LOGIC]: 0,
      [AuditCategory.ADMIN_ACTION]: 0,
      [AuditCategory.CONFIGURATION]: 0
    };

    const byUser: Record<string, number> = {};
    
    let securityEvents = 0;
    let complianceEvents = 0;
    let criticalEvents = 0;

    entries.forEach(entry => {
      byLevel[entry.level]++;
      byCategory[entry.category]++;
      
      if (entry.actor.userId) {
        byUser[entry.actor.userId] = (byUser[entry.actor.userId] || 0) + 1;
      }
      
      if (entry.category === AuditCategory.SYSTEM_SECURITY) {
        securityEvents++;
      }
      
      if (entry.category === AuditCategory.COMPLIANCE) {
        complianceEvents++;
      }
      
      if (entry.level === AuditLevel.CRITICAL) {
        criticalEvents++;
      }
    });

    // Generate hourly distribution
    const byTimeframe: { hour: number; count: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(cutoff.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const count = entries.filter(entry => 
        entry.timestamp >= hourStart && entry.timestamp < hourEnd
      ).length;
      
      byTimeframe.push({ hour: i, count });
    }

    return {
      totalEvents: entries.length,
      byLevel,
      byCategory,
      byUser,
      byTimeframe,
      securityEvents,
      complianceEvents,
      criticalEvents
    };
  }

  /**
   * Export audit logs for compliance
   */
  public async exportAuditLogs(
    filters: AuditQueryFilters,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<string> {
    const logs = this.queryLogs(filters);
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        return this.convertToCSV(logs);
      
      case 'xml':
        return this.convertToXML(logs);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Check if level should be logged
   */
  private shouldLogLevel(level: AuditLevel): boolean {
    const levelPriority = {
      [AuditLevel.INFO]: 1,
      [AuditLevel.WARNING]: 2,
      [AuditLevel.ERROR]: 3,
      [AuditLevel.CRITICAL]: 4,
      [AuditLevel.SECURITY]: 5
    };

    return levelPriority[level] >= levelPriority[this.config.logLevel];
  }

  /**
   * Store log entry
   */
  private async storeLogEntry(entry: AuditLogEntry): Promise<void> {
    // Store in memory
    this.logEntries.set(entry.id, entry);
    
    // Maintain memory limit
    if (this.logEntries.size > this.config.maxEntriesInMemory) {
      const oldestEntries = Array.from(this.logEntries.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(0, this.logEntries.size - this.config.maxEntriesInMemory);
      
      oldestEntries.forEach(oldEntry => {
        this.logEntries.delete(oldEntry.id);
      });
    }
    
    // Store to persistent storage
    await this.saveLogToStorage(entry);
  }

  /**
   * Generate log ID
   */
  private generateLogId(): string {
    const timestamp = Date.now().toString(36);
    const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(36))
      .join('');
    
    return `${timestamp}_${random}`;
  }

  /**
   * Anonymize user ID
   */
  private anonymizeUserId(userId?: string): string | undefined {
    if (!userId) return undefined;
    
    // Create a consistent hash of the user ID
    return `user_${this.simpleHash(userId)}`;
  }

  /**
   * Anonymize IP address
   */
  private anonymizeIpAddress(ipAddress?: string): string | undefined {
    if (!ipAddress) return undefined;
    
    // Mask last octet for IPv4, last 4 groups for IPv6
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.');
      return `${parts.slice(0, 3).join('.')}.xxx`;
    } else if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':');
      return `${parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`;
    }
    
    return 'xxx.xxx.xxx.xxx';
  }

  /**
   * Simple hash function for anonymization
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if event is GDPR relevant
   */
  private isGDPRRelevant(category: AuditCategory, eventType: AuditEventType): boolean {
    const gdprEvents = [
      AuditEventType.LOGIN_SUCCESS,
      AuditEventType.LOGIN_FAILURE,
      AuditEventType.GDPR_DATA_REQUEST,
      AuditEventType.DATA_EXPORT,
      AuditEventType.SENSITIVE_DATA_ACCESS
    ];
    
    return this.config.complianceMode && (
      category === AuditCategory.COMPLIANCE ||
      gdprEvents.includes(eventType)
    );
  }

  /**
   * Calculate retention period
   */
  private calculateRetentionPeriod(category: AuditCategory, level: AuditLevel): number {
    const basePeriod = this.config.retentionDays;
    
    // Security and critical events have longer retention
    if (level === AuditLevel.CRITICAL || level === AuditLevel.SECURITY) {
      return basePeriod * 2;
    }
    
    if (category === AuditCategory.COMPLIANCE) {
      return basePeriod * 3; // Compliance events need longer retention
    }
    
    return basePeriod;
  }

  /**
   * Classify data sensitivity
   */
  private classifyDataSensitivity(
    category: AuditCategory,
    eventType: AuditEventType
  ): 'public' | 'internal' | 'confidential' | 'restricted' {
    if (category === AuditCategory.SYSTEM_SECURITY || 
        eventType === AuditEventType.SENSITIVE_DATA_ACCESS) {
      return 'restricted';
    }
    
    if (category === AuditCategory.AUTHENTICATION || 
        category === AuditCategory.AUTHORIZATION) {
      return 'confidential';
    }
    
    if (category === AuditCategory.COMPLIANCE) {
      return 'confidential';
    }
    
    return 'internal';
  }

  /**
   * Check if entry contains sensitive data
   */
  private containsSensitiveData(
    details: any,
    actor?: any,
    target?: any
  ): boolean {
    const sensitiveFields = ['pin', 'password', 'ssn', 'credit_card', 'biometric'];
    const allData = JSON.stringify({ details, actor, target }).toLowerCase();
    
    return sensitiveFields.some(field => allData.includes(field));
  }

  /**
   * Check if alert should be sent
   */
  private shouldAlert(entry: AuditLogEntry): boolean {
    return entry.level === AuditLevel.CRITICAL ||
           entry.level === AuditLevel.SECURITY ||
           (entry.level === AuditLevel.ERROR && entry.category === AuditCategory.SYSTEM_SECURITY);
  }

  /**
   * Send alert
   */
  private async sendAlert(entry: AuditLogEntry): Promise<void> {
    // In production, this would integrate with alerting systems
    console.warn('🚨 Audit Alert:', {
      level: entry.level,
      eventType: entry.eventType,
      description: entry.details.description,
      timestamp: entry.timestamp,
      actor: entry.actor.userId,
      riskScore: entry.details.riskScore
    });
  }

  /**
   * Add to correlation tracking
   */
  private addToCorrelation(correlationId: string, logId: string): void {
    if (!this.correlationIds.has(correlationId)) {
      this.correlationIds.set(correlationId, []);
    }
    this.correlationIds.get(correlationId)!.push(logId);
  }

  /**
   * Trigger event callbacks
   */
  private triggerCallbacks(entry: AuditLogEntry): void {
    const callbacks = this.alertCallbacks.get(entry.level);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(entry);
        } catch (error) {
          console.error('Error in audit callback:', error);
        }
      });
    }
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: AuditLogEntry[]): string {
    const headers = [
      'ID', 'Timestamp', 'Level', 'Category', 'Event Type',
      'User ID', 'IP Address', 'Action', 'Description', 'Success',
      'Risk Score', 'Resource Type', 'Resource ID'
    ];
    
    const rows = logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.level,
      log.category,
      log.eventType,
      log.actor.userId || '',
      log.actor.ipAddress || '',
      log.details.action,
      log.details.description,
      log.details.success.toString(),
      log.details.riskScore?.toString() || '',
      log.target?.resourceType || '',
      log.target?.resourceId || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell?.toString().replace(/"/g, '""') || ''}"`).join(',')
    ).join('\n');
  }

  /**
   * Convert logs to XML format
   */
  private convertToXML(logs: AuditLogEntry[]): string {
    const xmlLogs = logs.map(log => `
    <auditLog>
      <id>${log.id}</id>
      <timestamp>${log.timestamp.toISOString()}</timestamp>
      <level>${log.level}</level>
      <category>${log.category}</category>
      <eventType>${log.eventType}</eventType>
      <actor>
        <userId>${log.actor.userId || ''}</userId>
        <ipAddress>${log.actor.ipAddress || ''}</ipAddress>
      </actor>
      <details>
        <action>${log.details.action}</action>
        <description><![CDATA[${log.details.description}]]></description>
        <success>${log.details.success}</success>
        <riskScore>${log.details.riskScore || 0}</riskScore>
      </details>
    </auditLog>`).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<auditLogs>
  ${xmlLogs}
</auditLogs>`;
  }

  /**
   * Save log to storage
   */
  private async saveLogToStorage(entry: AuditLogEntry): Promise<void> {
    if (typeof window !== 'undefined') {
      const key = `audit_log_${entry.id}`;
      const data = this.config.encryptLogs ? 
        this.encryptLogEntry(entry) : 
        JSON.stringify(entry);
      
      localStorage.setItem(key, data);
    }
  }

  /**
   * Encrypt log entry
   */
  private encryptLogEntry(entry: AuditLogEntry): string {
    // Simple encryption for demo - in production use proper encryption
    const data = JSON.stringify(entry);
    return btoa(data);
  }

  /**
   * Load audit logs from storage
   */
  private loadAuditLogsFromStorage(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage).filter(key => key.startsWith('audit_log_'));
    
    for (const key of keys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const entry: AuditLogEntry = this.config.encryptLogs ?
            JSON.parse(atob(data)) :
            JSON.parse(data);
          
          // Convert timestamp back to Date
          entry.timestamp = new Date(entry.timestamp);
          
          // Check retention period
          const retentionMs = entry.compliance.retentionPeriod * 24 * 60 * 60 * 1000;
          if (Date.now() - entry.timestamp.getTime() < retentionMs) {
            this.logEntries.set(entry.id, entry);
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
   * Start maintenance timer
   */
  private startMaintenanceTimer(): void {
    setInterval(() => {
      this.performMaintenance();
    }, 24 * 60 * 60 * 1000); // Daily maintenance
  }

  /**
   * Perform maintenance
   */
  private performMaintenance(): void {
    const now = Date.now();
    
    // Clean up expired logs
    for (const [id, entry] of this.logEntries) {
      const retentionMs = entry.compliance.retentionPeriod * 24 * 60 * 60 * 1000;
      if (now - entry.timestamp.getTime() > retentionMs) {
        this.logEntries.delete(id);
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`audit_log_${id}`);
        }
      }
    }
    
    // Clean up old correlations
    for (const [correlationId, logIds] of this.correlationIds) {
      const validIds = logIds.filter(id => this.logEntries.has(id));
      if (validIds.length === 0) {
        this.correlationIds.delete(correlationId);
      } else {
        this.correlationIds.set(correlationId, validIds);
      }
    }
  }

  /**
   * Add alert callback
   */
  public addAlertCallback(level: AuditLevel, callback: (entry: AuditLogEntry) => void): void {
    if (!this.alertCallbacks.has(level)) {
      this.alertCallbacks.set(level, []);
    }
    this.alertCallbacks.get(level)!.push(callback);
  }

  /**
   * Get correlated logs
   */
  public getCorrelatedLogs(correlationId: string): AuditLogEntry[] {
    const logIds = this.correlationIds.get(correlationId) || [];
    return logIds.map(id => this.logEntries.get(id)).filter(Boolean) as AuditLogEntry[];
  }
}

// Singleton export
export const auditLoggingService = AuditLoggingService.getInstance();

// Utility functions
export const AuditUtils = {
  /**
   * Generate correlation ID
   */
  generateCorrelationId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Format audit level
   */
  formatAuditLevel(level: AuditLevel, locale: 'en' | 'fr' = 'en'): string {
    const labels = {
      en: {
        [AuditLevel.INFO]: 'Info',
        [AuditLevel.WARNING]: 'Warning',
        [AuditLevel.ERROR]: 'Error',
        [AuditLevel.CRITICAL]: 'Critical',
        [AuditLevel.SECURITY]: 'Security'
      },
      fr: {
        [AuditLevel.INFO]: 'Info',
        [AuditLevel.WARNING]: 'Avertissement',
        [AuditLevel.ERROR]: 'Erreur',
        [AuditLevel.CRITICAL]: 'Critique',
        [AuditLevel.SECURITY]: 'Sécurité'
      }
    };

    return labels[locale][level] || labels.en[level];
  },

  /**
   * Get level color
   */
  getLevelColor(level: AuditLevel): string {
    const colors = {
      [AuditLevel.INFO]: '#10B981',
      [AuditLevel.WARNING]: '#F59E0B',
      [AuditLevel.ERROR]: '#EF4444',
      [AuditLevel.CRITICAL]: '#7C2D12',
      [AuditLevel.SECURITY]: '#6B21A8'
    };
    return colors[level];
  }
};

// Type exports
export type { AuditLogEntry, AuditQueryFilters, AuditStatistics, AuditConfig };