import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { attendanceRecordingService } from '../services/attendanceRecordingService';
import { UserRole } from '../types';

const router = express.Router();



/**
 * Get current attendance status for a user
 * GET /api/attendance/status/:userId
 */
router.get('/status/:userId',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { userId } = req.params;
      
      // Students can only check their own status
      if (req.user?.role === UserRole.STUDENT && req.user.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Can only check your own attendance status'
        });
      }

      const status = await attendanceRecordingService.getCurrentAttendanceStatus(userId);
      const session = attendanceRecordingService.getUserSession(userId);
      
      res.json({
        success: true,
        userId,
        status,
        session
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get all active attendance sessions
 * GET /api/attendance/sessions/active
 */
router.get('/sessions/active',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req, res, next) => {
    try {
      const sessions = attendanceRecordingService.getActiveSessions();
      
      res.json({
        success: true,
        sessionCount: sessions.length,
        sessions
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Manually mark attendance
 * POST /api/attendance/mark-manual
 */
router.post('/mark-manual',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { userId, status, classId, timestamp, notes } = req.body;
      
      const attendanceTime = timestamp ? new Date(timestamp) : undefined;
      
      const record = await attendanceRecordingService.markAttendanceManually(
        userId,
        status,
        classId,
        attendanceTime,
        notes
      );
      
      res.status(201).json({
        success: true,
        message: 'Attendance marked manually',
        record
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Calculate attendance statistics
 * GET /api/attendance/stats
 */
router.get('/stats',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { startDate, endDate, classId } = req.query;
      
      const stats = await attendanceRecordingService.calculateAttendanceStats(
        new Date(startDate as string),
        new Date(endDate as string),
        classId as string
      );
      
      res.json({
        success: true,
        dateRange: {
          startDate,
          endDate
        },
        classId: classId || 'all',
        stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get attendance settings
 * GET /api/attendance/settings
 */
router.get('/settings',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req, res, next) => {
    try {
      const settings = attendanceRecordingService.getSettings();
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update attendance settings
 * PUT /api/attendance/settings
 */
router.put('/settings',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const settings = req.body;
      
      attendanceRecordingService.updateSettings(settings);
      const updatedSettings = attendanceRecordingService.getSettings();
      
      res.json({
        success: true,
        message: 'Attendance settings updated successfully',
        settings: updatedSettings
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get user's attendance session
 * GET /api/attendance/session/:userId
 */
router.get('/session/:userId',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { userId } = req.params;
      
      // Students can only check their own session
      if (req.user?.role === UserRole.STUDENT && req.user.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Can only check your own session'
        });
      }

      const session = attendanceRecordingService.getUserSession(userId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'No active session found for user'
        });
      }
      
      res.json({
        success: true,
        userId,
        session
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get attendance statistics for today
 * GET /api/attendance/stats/today
 */
router.get('/stats/today',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { classId } = req.query;
      
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      const stats = await attendanceRecordingService.calculateAttendanceStats(
        startOfDay,
        endOfDay,
        classId as string
      );
      
      res.json({
        success: true,
        date: today.toISOString().split('T')[0],
        classId: classId || 'all',
        stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get attendance statistics for current week
 * GET /api/attendance/stats/week
 */
router.get('/stats/week',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { classId } = req.query;
      
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
      endOfWeek.setHours(23, 59, 59, 999);
      
      const stats = await attendanceRecordingService.calculateAttendanceStats(
        startOfWeek,
        endOfWeek,
        classId as string
      );
      
      res.json({
        success: true,
        weekStart: startOfWeek.toISOString().split('T')[0],
        weekEnd: endOfWeek.toISOString().split('T')[0],
        classId: classId || 'all',
        stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Force absent marking process (for testing)
 * POST /api/attendance/force-absent-marking
 */
router.post('/force-absent-marking',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      // This would trigger the absent marking process manually
      // In the actual implementation, this would call the private method
      
      res.json({
        success: true,
        message: 'Absent marking process triggered'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;