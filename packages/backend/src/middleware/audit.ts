import { NextFunction, Request, Response } from 'express';
import { AuditEventType, AuditSeverity, auditService } from '../services/auditService';

/**
 * Middleware to automatically log audit events for sensitive operations
 */
export const auditMiddleware = (eventType: AuditEventType, resourceType?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const startTime = Date.now();
    
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Log the audit event asynchronously
      setImmediate(async () => {
        try {
          const resourceId = req.params.id || req.params.userId || req.params.classId || req.body?.id;
          
          await auditService.logEvent({
            eventType,
            severity: getSeverityForEvent(eventType, success),
            userId: req.user?.userId,
            resourceId,
            resourceType,
            action: `${req.method} ${req.route?.path || req.path}`,
            description: getDescriptionForEvent(eventType, req.method, success),
            ipAddress: getClientIP(req),
            userAgent: req.get('User-Agent'),
            requestId: req.headers['x-request-id'] as string,
            metadata: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              duration,
              body: sanitizeRequestBody(req.body),
              query: req.query
            },
            success,
            errorMessage: success ? undefined : getErrorMessage(data)
          });
        } catch (error) {
          console.error('Failed to log audit event:', error);
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware specifically for authentication events
 */
export const auditAuthMiddleware = (eventType: AuditEventType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Log authentication event asynchronously
      setImmediate(async () => {
        try {
          await auditService.logAuthEvent(
            eventType,
            req.body?.email || req.user?.userId,
            success,
            req,
            success ? undefined : getErrorMessage(data),
            {
              email: req.body?.email,
              statusCode: res.statusCode
            }
          );
        } catch (error) {
          console.error('Failed to log auth audit event:', error);
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware for logging security events
 */
export const auditSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check for security events from other middleware
  const originalSend = res.send;
  
  res.send = function(data) {
    if (req.securityEvent) {
      setImmediate(async () => {
        try {
          await auditService.logSecurityEvent(
            req.securityEvent!.event as AuditEventType,
            req.securityEvent!.userId,
            `${req.securityEvent!.event} from ${req.securityEvent!.ip}`,
            req,
            AuditSeverity.HIGH,
            {
              path: req.securityEvent!.path,
              method: req.securityEvent!.method,
              userAgent: req.securityEvent!.userAgent
            }
          );
        } catch (error) {
          console.error('Failed to log security audit event:', error);
        }
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware for logging data export events
 */
export const auditExportMiddleware = (exportType: string) => {
  return auditMiddleware(AuditEventType.DATA_EXPORTED, exportType);
};

/**
 * Middleware for logging settings changes
 */
export const auditSettingsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const originalSend = res.send;
    
    res.send = function(data) {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      if (success && req.user?.userId) {
        setImmediate(async () => {
          try {
            const category = req.params.category || 'unknown';
            await auditService.logSettingsChange(
              req.user!.userId,
              category,
              req.body,
              req
            );
          } catch (error) {
            console.error('Failed to log settings audit event:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
  }
  
  next();
};

/**
 * Helper functions
 */
function getSeverityForEvent(eventType: AuditEventType, success: boolean): AuditSeverity {
  if (!success) {
    return AuditSeverity.MEDIUM;
  }
  
  switch (eventType) {
    case AuditEventType.USER_DELETED:
    case AuditEventType.SECURITY_SETTINGS_CHANGED:
    case AuditEventType.PASSWORD_CHANGE:
      return AuditSeverity.HIGH;
    
    case AuditEventType.USER_CREATED:
    case AuditEventType.USER_UPDATED:
    case AuditEventType.CLASS_DELETED:
    case AuditEventType.SETTINGS_UPDATED:
      return AuditSeverity.MEDIUM;
    
    default:
      return AuditSeverity.LOW;
  }
}

function getDescriptionForEvent(eventType: AuditEventType, method: string, success: boolean): string {
  const action = method.toLowerCase();
  const status = success ? 'successful' : 'failed';
  
  switch (eventType) {
    case AuditEventType.USER_CREATED:
      return `User creation ${status}`;
    case AuditEventType.USER_UPDATED:
      return `User update ${status}`;
    case AuditEventType.USER_DELETED:
      return `User deletion ${status}`;
    case AuditEventType.CLASS_CREATED:
      return `Class creation ${status}`;
    case AuditEventType.CLASS_UPDATED:
      return `Class update ${status}`;
    case AuditEventType.CLASS_DELETED:
      return `Class deletion ${status}`;
    case AuditEventType.DATA_EXPORTED:
      return `Data export ${status}`;
    case AuditEventType.SETTINGS_UPDATED:
      return `Settings update ${status}`;
    default:
      return `${eventType.toLowerCase().replace('_', ' ')} ${status}`;
  }
}

function getClientIP(req: Request): string {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
         'unknown';
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

function getErrorMessage(data: any): string | undefined {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed.message || parsed.error;
    } catch {
      return data;
    }
  }
  
  if (typeof data === 'object' && data !== null) {
    return data.message || data.error;
  }
  
  return undefined;
}