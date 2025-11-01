import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { logger } from './loggerService';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  
  // User management events
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  
  // Class management events
  CLASS_CREATED = 'CLASS_CREATED',
  CLASS_UPDATED = 'CLASS_UPDATED',
  CLASS_DELETED = 'CLASS_DELETED',
  STUDENT_ENROLLED = 'STUDENT_ENROLLED',
  STUDENT_UNENROLLED = 'STUDENT_UNENROLLED',
  
  // Attendance events
  ATTENDANCE_RECORDED = 'ATTENDANCE_RECORDED',
  ATTENDANCE_MODIFIED = 'ATTENDANCE_MODIFIED',
  MANUAL_ATTENDANCE = 'MANUAL_ATTENDANCE',
  
  // Settings events
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  SECURITY_SETTINGS_CHANGED = 'SECURITY_SETTINGS_CHANGED',
  
  // BLE device events
  BLE_DEVICE_REGISTERED = 'BLE_DEVICE_REGISTERED',
  BLE_DEVICE_UPDATED = 'BLE_DEVICE_UPDATED',
  BLE_DEVICE_DELETED = 'BLE_DEVICE_DELETED',
  
  // Security events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Data export events
  DATA_EXPORTED = 'DATA_EXPORTED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  
  // System events
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
  DATABASE_MIGRATION = 'DATABASE_MIGRATION'
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  targetUserId?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

class AuditService {
  private prisma: PrismaClient;
  private isEnabled: boolean;

  constructor() {
    this.prisma = new PrismaClient();
    this.isEnabled = process.env.AUDIT_LOGGING_ENABLED !== 'false';
  }

  /**
   * Log an audit event
   */
  async logEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date()
      };

      // Log to database
      await this.logToDatabase(auditEntry);
      
      // Log to file system
      this.logToFile(auditEntry);
      
      // Alert on critical events
      if (entry.severity === AuditSeverity.CRITICAL) {
        await this.handleCriticalEvent(auditEntry);
      }
      
    } catch (error) {
      logger.error('Failed to log audit event', 'AuditService', {
        eventType: entry.eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    eventType: AuditEventType,
    userId: string | undefined,
    success: boolean,
    req: Request,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const severity = this.getAuthEventSeverity(eventType, success);
    
    await this.logEvent({
      eventType,
      severity,
      userId,
      action: eventType.replace('_', ' ').toLowerCase(),
      description: `User ${eventType.toLowerCase().replace('_', ' ')} ${success ? 'successful' : 'failed'}`,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      metadata,
      success,
      errorMessage
    });
  }

  /**
   * Log user management events
   */
  async logUserEvent(
    eventType: AuditEventType,
    actorUserId: string,
    targetUserId: string,
    action: string,
    req: Request,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType,
      severity: AuditSeverity.MEDIUM,
      userId: actorUserId,
      targetUserId,
      resourceId: targetUserId,
      resourceType: 'user',
      action,
      description: `User ${action} performed on user ${targetUserId}`,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      metadata,
      success: true
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    eventType: AuditEventType,
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    req: Request,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType,
      severity: AuditSeverity.LOW,
      userId,
      resourceId,
      resourceType,
      action,
      description: `${action} performed on ${resourceType} ${resourceId}`,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      metadata,
      success: true
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: AuditEventType,
    userId: string | undefined,
    description: string,
    req: Request,
    severity: AuditSeverity = AuditSeverity.HIGH,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType,
      severity,
      userId,
      action: 'security_event',
      description,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      metadata,
      success: false
    });
  }

  /**
   * Log settings changes
   */
  async logSettingsChange(
    userId: string,
    category: string,
    changes: Record<string, any>,
    req: Request
  ): Promise<void> {
    const isSecurity = category === 'security';
    
    await this.logEvent({
      eventType: isSecurity ? AuditEventType.SECURITY_SETTINGS_CHANGED : AuditEventType.SETTINGS_UPDATED,
      severity: isSecurity ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
      userId,
      resourceType: 'settings',
      resourceId: category,
      action: 'update_settings',
      description: `${category} settings updated`,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      metadata: { category, changes },
      success: true
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: {
    userId?: string;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      const where: any = {};
      
      if (filters.userId) where.userId = filters.userId;
      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.severity) where.severity = filters.severity;
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: filters.limit || 100,
          skip: filters.offset || 0
        }),
        this.prisma.auditLog.count({ where })
      ]);

      return { logs, total };
    } catch (error) {
      logger.error('Failed to retrieve audit logs', 'AuditService', { error });
      throw new Error('Failed to retrieve audit logs');
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`Cleaned up ${result.count} old audit log entries`, 'AuditService');
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old audit logs', 'AuditService', { error });
      throw new Error('Failed to cleanup old audit logs');
    }
  }

  /**
   * Private helper methods
   */
  private async logToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          eventType: entry.eventType,
          severity: entry.severity,
          userId: entry.userId,
          targetUserId: entry.targetUserId,
          resourceId: entry.resourceId,
          resourceType: entry.resourceType,
          action: entry.action,
          description: entry.description,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          timestamp: entry.timestamp,
          success: entry.success,
          errorMessage: entry.errorMessage
        }
      });
    } catch (error) {
      // Fallback to file logging if database fails
      logger.error('Failed to log audit event to database', 'AuditService', { error });
      this.logToFile(entry);
    }
  }

  private logToFile(entry: AuditLogEntry): void {
    logger.info(
      `AUDIT: ${entry.eventType} - ${entry.description}`,
      'AuditService',
      {
        eventType: entry.eventType,
        severity: entry.severity,
        userId: entry.userId,
        targetUserId: entry.targetUserId,
        resourceId: entry.resourceId,
        resourceType: entry.resourceType,
        action: entry.action,
        ipAddress: entry.ipAddress,
        success: entry.success,
        metadata: entry.metadata
      },
      entry.userId,
      entry.requestId
    );
  }

  private async handleCriticalEvent(entry: AuditLogEntry): Promise<void> {
    // Log critical event with high priority
    logger.critical(
      `CRITICAL AUDIT EVENT: ${entry.eventType} - ${entry.description}`,
      'AuditService',
      entry.metadata,
      entry.userId,
      entry.requestId
    );

    // Here you could add additional alerting mechanisms:
    // - Send email notifications
    // - Send Slack/Teams notifications
    // - Trigger security incident response
    // - etc.
  }

  private getAuthEventSeverity(eventType: AuditEventType, success: boolean): AuditSeverity {
    if (!success) {
      switch (eventType) {
        case AuditEventType.LOGIN_FAILED:
          return AuditSeverity.MEDIUM;
        case AuditEventType.PASSWORD_CHANGE:
          return AuditSeverity.HIGH;
        default:
          return AuditSeverity.MEDIUM;
      }
    }
    
    switch (eventType) {
      case AuditEventType.PASSWORD_CHANGE:
        return AuditSeverity.HIGH;
      case AuditEventType.LOGIN_SUCCESS:
      case AuditEventType.LOGOUT:
        return AuditSeverity.LOW;
      default:
        return AuditSeverity.MEDIUM;
    }
  }

  private getClientIP(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           'unknown';
  }
}

export const auditService = new AuditService();