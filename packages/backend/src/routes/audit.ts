import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { apiRateLimit } from '../middleware/rateLimiter';
import { requireRole } from '../middleware/rbac';
import { AuditEventType, AuditSeverity, auditService } from '../services/auditService';
import { UserRole } from '../types';

const router = express.Router();

// All audit routes require admin authentication
router.use(authenticateToken);
router.use(requireRole([UserRole.ADMIN]));
router.use(apiRateLimit.middleware());

// Get audit logs with filtering
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    userId,
    eventType,
    severity,
    startDate,
    endDate,
    limit = '100',
    offset = '0'
  } = req.query;

  // Validate query parameters
  const filters: any = {};
  
  if (userId && typeof userId === 'string') {
    filters.userId = userId;
  }
  
  if (eventType && Object.values(AuditEventType).includes(eventType as AuditEventType)) {
    filters.eventType = eventType as AuditEventType;
  }
  
  if (severity && Object.values(AuditSeverity).includes(severity as AuditSeverity)) {
    filters.severity = severity as AuditSeverity;
  }
  
  if (startDate && typeof startDate === 'string') {
    const date = new Date(startDate);
    if (!isNaN(date.getTime())) {
      filters.startDate = date;
    }
  }
  
  if (endDate && typeof endDate === 'string') {
    const date = new Date(endDate);
    if (!isNaN(date.getTime())) {
      filters.endDate = date;
    }
  }
  
  const limitNum = parseInt(limit as string);
  const offsetNum = parseInt(offset as string);
  
  if (limitNum > 0 && limitNum <= 1000) {
    filters.limit = limitNum;
  }
  
  if (offsetNum >= 0) {
    filters.offset = offsetNum;
  }

  const result = await auditService.getAuditLogs(filters);
  
  res.json({
    success: true,
    data: result.logs,
    total: result.total,
    limit: filters.limit || 100,
    offset: filters.offset || 0
  });
}));

// Get audit log statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const filters: any = {};
  
  if (startDate && typeof startDate === 'string') {
    const date = new Date(startDate);
    if (!isNaN(date.getTime())) {
      filters.startDate = date;
    }
  }
  
  if (endDate && typeof endDate === 'string') {
    const date = new Date(endDate);
    if (!isNaN(date.getTime())) {
      filters.endDate = date;
    }
  }

  // Get logs for statistics
  const result = await auditService.getAuditLogs({ ...filters, limit: 10000 });
  
  // Calculate statistics
  const stats = {
    totalEvents: result.total,
    eventsByType: {} as Record<string, number>,
    eventsBySeverity: {} as Record<string, number>,
    successRate: 0,
    topUsers: {} as Record<string, number>,
    recentCriticalEvents: result.logs
      .filter(log => log.severity === AuditSeverity.CRITICAL)
      .slice(0, 10)
  };
  
  let successCount = 0;
  
  result.logs.forEach(log => {
    // Count by event type
    stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;
    
    // Count by severity
    stats.eventsBySeverity[log.severity] = (stats.eventsBySeverity[log.severity] || 0) + 1;
    
    // Count success rate
    if (log.success) {
      successCount++;
    }
    
    // Count by user
    if (log.userId) {
      stats.topUsers[log.userId] = (stats.topUsers[log.userId] || 0) + 1;
    }
  });
  
  stats.successRate = result.logs.length > 0 ? (successCount / result.logs.length) * 100 : 0;
  
  res.json({
    success: true,
    data: stats
  });
}));

// Clean up old audit logs
router.delete('/cleanup', asyncHandler(async (req: Request, res: Response) => {
  const { retentionDays = '365' } = req.query;
  
  const days = parseInt(retentionDays as string);
  if (days < 1 || days > 3650) { // Max 10 years
    return res.status(400).json({
      success: false,
      message: 'Retention days must be between 1 and 3650'
    });
  }
  
  const deletedCount = await auditService.cleanupOldLogs(days);
  
  res.json({
    success: true,
    message: `Cleaned up ${deletedCount} old audit log entries`,
    deletedCount
  });
}));

// Get available event types and severities
router.get('/metadata', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      eventTypes: Object.values(AuditEventType),
      severities: Object.values(AuditSeverity)
    }
  });
}));

export default router;