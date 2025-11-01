import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { dashboardService } from '../services/dashboardService';
import { UserRole } from '../types';

const router = express.Router();

/**
 * Get dashboard metrics
 * GET /api/dashboard/metrics
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
router.get('/metrics',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const metrics = await dashboardService.getDashboardMetrics();
      
      res.json({
        success: true,
        metrics,
        lastUpdated: new Date()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get real-time statistics
 * GET /api/dashboard/stats/realtime
 * Requirements: 1.5
 */
router.get('/stats/realtime',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const stats = await dashboardService.getRealTimeStats();
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get notifications for current user
 * GET /api/dashboard/notifications
 * Requirements: 1.5
 */
router.get('/notifications',
  authenticateToken,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { limit = 20 } = req.query;
      const userId = req.user?.userId;
      
      // Admin and faculty can see system notifications, students see only their own
      const targetUserId = req.user?.role === UserRole.STUDENT ? userId : undefined;
      
      const notifications = await dashboardService.getNotifications(
        targetUserId, 
        parseInt(limit as string)
      );
      
      const unreadCount = await dashboardService.getUnreadNotificationCount(targetUserId);
      
      res.json({
        success: true,
        notifications,
        unreadCount
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Mark notification as read
 * PUT /api/dashboard/notifications/:notificationId/read
 * Requirements: 1.5
 */
router.put('/notifications/:notificationId/read',
  authenticateToken,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.userId;
      
      // Students can only mark their own notifications as read
      const targetUserId = req.user?.role === UserRole.STUDENT ? userId : undefined;
      
      const success = await dashboardService.markNotificationAsRead(notificationId, targetUserId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Add a new notification (admin only)
 * POST /api/dashboard/notifications
 * Requirements: 1.5
 */
router.post('/notifications',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { type, title, message, userId, priority = 'medium' } = req.body;
      
      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Type, title, and message are required'
        });
      }
      
      const notification = await dashboardService.addNotification({
        type,
        title,
        message,
        userId,
        priority
      });
      
      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        notification
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Clear all notifications
 * DELETE /api/dashboard/notifications
 * Requirements: 1.5
 */
router.delete('/notifications',
  authenticateToken,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const userId = req.user?.userId;
      
      // Students can only clear their own notifications
      const targetUserId = req.user?.role === UserRole.STUDENT ? userId : undefined;
      
      const success = await dashboardService.clearNotifications(targetUserId);
      
      res.json({
        success: true,
        message: success ? 'Notifications cleared successfully' : 'No notifications to clear'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get unread notification count
 * GET /api/dashboard/notifications/unread-count
 * Requirements: 1.5
 */
router.get('/notifications/unread-count',
  authenticateToken,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const userId = req.user?.userId;
      
      // Students get their own count, admin/faculty get system count
      const targetUserId = req.user?.role === UserRole.STUDENT ? userId : undefined;
      
      const unreadCount = await dashboardService.getUnreadNotificationCount(targetUserId);
      
      res.json({
        success: true,
        unreadCount
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Refresh dashboard metrics (force update)
 * POST /api/dashboard/metrics/refresh
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
router.post('/metrics/refresh',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const metrics = await dashboardService.refreshMetrics();
      
      res.json({
        success: true,
        message: 'Dashboard metrics refreshed successfully',
        metrics,
        lastUpdated: new Date()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get dashboard overview (combined metrics and stats)
 * GET /api/dashboard/overview
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
router.get('/overview',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [metrics, realTimeStats, unreadCount] = await Promise.all([
        dashboardService.getDashboardMetrics(),
        dashboardService.getRealTimeStats(),
        dashboardService.getUnreadNotificationCount()
      ]);
      
      res.json({
        success: true,
        overview: {
          metrics,
          realTimeStats,
          unreadNotificationCount: unreadCount
        },
        lastUpdated: new Date()
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;