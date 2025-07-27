/**
 * Security Audit Logging System for Restaurant Krong Thai SOP Management System
 * Comprehensive audit trail for security events and user activities
 */

import { createClient } from '@supabase/supabase-js';
import { SECURITY_CONFIG } from './config';
import type { Database } from '@/types/database';

// Types
export type AuditEventType = 
  | 'pin_auth_success'
  | 'pin_auth_failure'
  | 'pin_rate_limit_exceeded'
  | 'pin_auth_error'
  | 'user_logout'
  | 'session_expired'
  | 'session_created'
  | 'session_validated'
  | 'device_registration_success'
  | 'device_registration_failed'
  | 'device_trust_granted'
  | 'device_trust_revoked'
  | 'sop_document_viewed'
  | 'sop_document_downloaded'
  | 'sop_document_created'
  | 'sop_document_updated'
  | 'sop_document_deleted'
  | 'form_submission_created'
  | 'form_submission_updated'
  | 'user_profile_updated'
  | 'security_violation'
  | 'brute_force_detected'
  | 'unauthorized_access_attempt'
  | 'system_configuration_changed'
  | 'admin_action_performed';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEvent {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  restaurantId: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface AuditLogEntry {
  id: string;
  restaurantId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  createdAt: Date;
}

/**
 * Audit Logger Class
 */
export class SecurityAudit {
  private static supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  private static logQueue: AuditEvent[] = [];
  private static flushInterval: NodeJS.Timeout;
  private static isProcessing = false;

  static {
    // Initialize flush interval
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, SECURITY_CONFIG.AUDIT.FLUSH_INTERVAL);
  }

  /**
   * Log a security event
   */
  static async logSecurityEvent(
    eventType: AuditEventType,
    metadata: Record<string, unknown> = {},
    options?: {
      restaurantId?: string;
      userId?: string;
      resourceType?: string;
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      severity?: AuditSeverity;
    }
  ): Promise<void> {
    try {
      const severity = options?.severity || this.calculateSeverity(eventType, metadata);
      const restaurantId = options?.restaurantId || await this.getRestaurantIdFromContext(options?.userId);

      const auditEvent: AuditEvent = {
        eventType,
        severity,
        restaurantId,
        userId: options?.userId,
        resourceType: options?.resourceType,
        resourceId: options?.resourceId,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        sessionId: options?.sessionId,
        metadata: this.sanitizeMetadata(metadata),
        timestamp: new Date(),
      };

      // Add to queue for batch processing
      this.logQueue.push(auditEvent);

      // If high severity, flush immediately
      if (severity === 'critical' || severity === 'high') {
        await this.flushLogs();
      }

      // Log to console in development
      if (SECURITY_CONFIG.DEVELOPMENT.ENABLE_DEBUG_LOGS) {
        console.log('Audit Event:', {
          type: eventType,
          severity,
          metadata: auditEvent.metadata,
        });
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - audit logging shouldn't break the application
    }
  }

  /**
   * Log SOP document access
   */
  static async logSopAccess(
    action: 'view' | 'download' | 'create' | 'update' | 'delete',
    restaurantId: string,
    userId: string,
    sopId: string,
    sopMetadata: {
      sopTitle?: string;
      category?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    const eventTypeMap = {
      view: 'sop_document_viewed' as const,
      download: 'sop_document_downloaded' as const,
      create: 'sop_document_created' as const,
      update: 'sop_document_updated' as const,
      delete: 'sop_document_deleted' as const,
    };

    await this.logSecurityEvent(
      eventTypeMap[action],
      {
        sopTitle: sopMetadata.sopTitle,
        category: sopMetadata.category,
        action,
      },
      {
        restaurantId,
        userId,
        resourceType: 'sop_documents',
        resourceId: sopId,
        ipAddress: sopMetadata.ipAddress,
        userAgent: sopMetadata.userAgent,
        sessionId: sopMetadata.sessionId,
        severity: action === 'delete' ? 'medium' : 'low',
      }
    );
  }

  /**
   * Log form submission activity
   */
  static async logFormSubmission(
    action: 'create' | 'update' | 'view',
    restaurantId: string,
    userId: string,
    formId: string,
    formMetadata: {
      formType?: string;
      formTitle?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    const eventType = action === 'create' ? 'form_submission_created' : 'form_submission_updated';

    await this.logSecurityEvent(
      eventType,
      {
        formType: formMetadata.formType,
        formTitle: formMetadata.formTitle,
        action,
      },
      {
        restaurantId,
        userId,
        resourceType: 'form_submissions',
        resourceId: formId,
        ipAddress: formMetadata.ipAddress,
        userAgent: formMetadata.userAgent,
        sessionId: formMetadata.sessionId,
        severity: 'low',
      }
    );
  }

  /**
   * Log user profile updates
   */
  static async logUserProfileUpdate(
    userId: string,
    restaurantId: string,
    changes: Record<string, { old: unknown; new: unknown }>,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      updatedBy?: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent(
      'user_profile_updated',
      {
        changedFields: Object.keys(changes),
        changes: this.sanitizeUserChanges(changes),
        updatedBy: metadata.updatedBy,
      },
      {
        restaurantId,
        userId,
        resourceType: 'auth_users',
        resourceId: userId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        sessionId: metadata.sessionId,
        severity: 'medium',
      }
    );
  }

  /**
   * Log security violations
   */
  static async logSecurityViolation(
    violationType: string,
    restaurantId: string,
    metadata: Record<string, unknown>,
    options?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      severity?: AuditSeverity;
    }
  ): Promise<void> {
    await this.logSecurityEvent(
      'security_violation',
      {
        violationType,
        ...metadata,
      },
      {
        restaurantId,
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        severity: options?.severity || 'high',
      }
    );
  }

  /**
   * Calculate event severity based on type and metadata
   */
  private static calculateSeverity(
    eventType: AuditEventType,
    metadata: Record<string, unknown>
  ): AuditSeverity {
    // Critical events
    const criticalEvents: AuditEventType[] = [
      'brute_force_detected',
      'unauthorized_access_attempt',
      'system_configuration_changed',
    ];

    // High severity events
    const highSeverityEvents: AuditEventType[] = [
      'pin_rate_limit_exceeded',
      'security_violation',
      'device_registration_failed',
      'sop_document_deleted',
    ];

    // Medium severity events
    const mediumSeverityEvents: AuditEventType[] = [
      'pin_auth_failure',
      'session_expired',
      'device_trust_revoked',
      'user_profile_updated',
      'admin_action_performed',
    ];

    if (criticalEvents.includes(eventType)) {
      return 'critical';
    }

    if (highSeverityEvents.includes(eventType)) {
      return 'high';
    }

    if (mediumSeverityEvents.includes(eventType)) {
      return 'medium';
    }

    // Check metadata for severity indicators
    if (metadata.failedAttempts && typeof metadata.failedAttempts === 'number' && metadata.failedAttempts > 3) {
      return 'high';
    }

    if (metadata.riskScore && typeof metadata.riskScore === 'number' && metadata.riskScore > 70) {
      return 'high';
    }

    return 'low';
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private static sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...metadata };
    
    // Remove sensitive fields
    for (const field of SECURITY_CONFIG.AUDIT.SENSITIVE_FIELDS) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate long strings
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...[TRUNCATED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize user profile changes
   */
  private static sanitizeUserChanges(
    changes: Record<string, { old: unknown; new: unknown }>
  ): Record<string, { old: unknown; new: unknown }> {
    const sanitized = { ...changes };

    for (const field of SECURITY_CONFIG.AUDIT.SENSITIVE_FIELDS) {
      if (field in sanitized) {
        sanitized[field] = {
          old: '[REDACTED]',
          new: '[REDACTED]',
        };
      }
    }

    return sanitized;
  }

  /**
   * Get restaurant ID from user context
   */
  private static async getRestaurantIdFromContext(userId?: string): Promise<string> {
    if (!userId) {
      return ''; // Default or system restaurant ID
    }

    try {
      const { data, error } = await this.supabase
        .from('auth_users')
        .select('restaurant_id')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return '';
      }

      return data.restaurant_id;

    } catch (error) {
      console.error('Error getting restaurant ID from context:', error);
      return '';
    }
  }

  /**
   * Flush queued logs to database
   */
  private static async flushLogs(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.logQueue.splice(0, SECURITY_CONFIG.AUDIT.BATCH_SIZE);
      
      // Convert to database format
      const auditEntries = batch.map(event => ({
        restaurant_id: event.restaurantId,
        user_id: event.userId || null,
        action: event.eventType.toUpperCase(),
        resource_type: event.resourceType || 'system',
        resource_id: event.resourceId || null,
        old_values: null,
        new_values: null,
        metadata: {
          ...event.metadata,
          severity: event.severity,
          timestamp: event.timestamp.toISOString(),
        },
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        session_id: event.sessionId || null,
      }));

      // Batch insert to database
      const { error } = await this.supabase
        .from('audit_logs')
        .insert(auditEntries);

      if (error) {
        console.error('Failed to flush audit logs:', error);
        // Re-add failed entries to queue
        this.logQueue.unshift(...batch);
      }

    } catch (error) {
      console.error('Error flushing audit logs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Search audit logs
   */
  static async searchLogs(criteria: {
    restaurantId?: string;
    userId?: string;
    eventTypes?: AuditEventType[];
    severity?: AuditSeverity[];
    dateFrom?: Date;
    dateTo?: Date;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*');

      // Apply filters
      if (criteria.restaurantId) {
        query = query.eq('restaurant_id', criteria.restaurantId);
      }

      if (criteria.userId) {
        query = query.eq('user_id', criteria.userId);
      }

      if (criteria.eventTypes && criteria.eventTypes.length > 0) {
        const actions = criteria.eventTypes.map(type => type.toUpperCase());
        query = query.in('action', actions);
      }

      if (criteria.resourceType) {
        query = query.eq('resource_type', criteria.resourceType);
      }

      if (criteria.resourceId) {
        query = query.eq('resource_id', criteria.resourceId);
      }

      if (criteria.dateFrom) {
        query = query.gte('created_at', criteria.dateFrom.toISOString());
      }

      if (criteria.dateTo) {
        query = query.lte('created_at', criteria.dateTo.toISOString());
      }

      // Apply pagination
      if (criteria.offset) {
        query = query.range(criteria.offset, (criteria.offset + (criteria.limit || 50)) - 1);
      } else if (criteria.limit) {
        query = query.limit(criteria.limit);
      }

      // Order by timestamp descending
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error searching audit logs:', error);
        return [];
      }

      return (data || []).map(log => ({
        id: log.id,
        restaurantId: log.restaurant_id,
        userId: log.user_id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        oldValues: log.old_values,
        newValues: log.new_values,
        metadata: log.metadata,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        sessionId: log.session_id,
        createdAt: new Date(log.created_at),
      }));

    } catch (error) {
      console.error('Error searching audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(restaurantId: string, days = 30): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topUsers: Array<{ userId: string; eventCount: number }>;
  }> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('action, user_id, metadata')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', dateFrom.toISOString());

      if (error || !data) {
        return {
          totalEvents: 0,
          eventsByType: {},
          eventsBySeverity: {},
          topUsers: [],
        };
      }

      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const userEventCounts: Record<string, number> = {};

      for (const log of data) {
        // Count by type
        eventsByType[log.action] = (eventsByType[log.action] || 0) + 1;

        // Count by severity
        const severity = (log.metadata as any)?.severity || 'low';
        eventsBySeverity[severity] = (eventsBySeverity[severity] || 0) + 1;

        // Count by user
        if (log.user_id) {
          userEventCounts[log.user_id] = (userEventCounts[log.user_id] || 0) + 1;
        }
      }

      // Top users
      const topUsers = Object.entries(userEventCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, eventCount]) => ({ userId, eventCount }));

      return {
        totalEvents: data.length,
        eventsByType,
        eventsBySeverity,
        topUsers,
      };

    } catch (error) {
      console.error('Error getting audit stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        topUsers: [],
      };
    }
  }

  /**
   * Cleanup old audit logs
   */
  static async cleanupOldLogs(): Promise<number> {
    try {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - SECURITY_CONFIG.AUDIT.LOG_RETENTION_DAYS);

      const { data, error } = await this.supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', retentionDate.toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning up old audit logs:', error);
        return 0;
      }

      return data?.length || 0;

    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
      return 0;
    }
  }

  /**
   * Cleanup resources
   */
  static cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Flush remaining logs
    this.flushLogs();
  }
}