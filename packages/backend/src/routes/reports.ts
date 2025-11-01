import { Request, Response, Router } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { reportService } from '../services/reportService';
import { UserRole } from '../types';

const router = Router();

// Validation middleware
const validateReportRequest = [
  query('type')
    .isIn(['daily', 'weekly', 'monthly', 'custom'])
    .withMessage('Report type must be daily, weekly, monthly, or custom'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('classId')
    .optional()
    .isUUID()
    .withMessage('Class ID must be a valid UUID'),
];

const validateCustomReportRequest = [
  query('startDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Start date is required and must be a valid ISO 8601 date'),
  query('endDate')
    .notEmpty()
    .isISO8601()
    .withMessage('End date is required and must be a valid ISO 8601 date'),
  query('classId')
    .optional()
    .isUUID()
    .withMessage('Class ID must be a valid UUID'),
];

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/reports/analytics
 * Get attendance analytics for a specified period
 */
router.get('/analytics', 
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  validateReportRequest,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { type, startDate, endDate, classId } = req.query;

      const reportRequest = {
        type: type as 'daily' | 'weekly' | 'monthly' | 'custom',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        classId: classId as string
      };

      const analytics = await reportService.generateAnalytics(reportRequest);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Error generating analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/trends
 * Get attendance trends over time
 */
router.get('/trends',
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  validateReportRequest,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { type, startDate, endDate, classId } = req.query;

      const reportRequest = {
        type: type as 'daily' | 'weekly' | 'monthly' | 'custom',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        classId: classId as string
      };

      const trends = await reportService.generateAttendanceTrends(reportRequest);

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      console.error('Error generating trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate attendance trends',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/distribution
 * Get attendance distribution for pie charts
 */
router.get('/distribution',
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  validateReportRequest,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { type, startDate, endDate, classId } = req.query;

      const reportRequest = {
        type: type as 'daily' | 'weekly' | 'monthly' | 'custom',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        classId: classId as string
      };

      const distribution = await reportService.generateAttendanceDistribution(reportRequest);

      res.json({
        success: true,
        data: distribution
      });

    } catch (error) {
      console.error('Error generating distribution:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate attendance distribution',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/daily
 * Generate daily report
 */
router.get('/daily',
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  [
    query('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be a valid ISO 8601 date'),
    query('classId')
      .optional()
      .isUUID()
      .withMessage('Class ID must be a valid UUID'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { date, classId } = req.query;
      const reportDate = date ? new Date(date as string) : new Date();

      const report = await reportService.generateDailyReport(reportDate, classId as string);

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error generating daily report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate daily report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/weekly
 * Generate weekly report
 */
router.get('/weekly',
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  [
    query('weekStartDate')
      .optional()
      .isISO8601()
      .withMessage('Week start date must be a valid ISO 8601 date'),
    query('classId')
      .optional()
      .isUUID()
      .withMessage('Class ID must be a valid UUID'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { weekStartDate, classId } = req.query;
      const startDate = weekStartDate ? new Date(weekStartDate as string) : new Date();

      const report = await reportService.generateWeeklyReport(startDate, classId as string);

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error generating weekly report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate weekly report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/monthly
 * Generate monthly report
 */
router.get('/monthly',
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  [
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Year must be between 2020 and 2030'),
    query('month')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Month must be between 1 and 12'),
    query('classId')
      .optional()
      .isUUID()
      .withMessage('Class ID must be a valid UUID'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { year, month, classId } = req.query;
      const now = new Date();
      const reportYear = year ? parseInt(year as string) : now.getFullYear();
      const reportMonth = month ? parseInt(month as string) : now.getMonth() + 1;

      const report = await reportService.generateMonthlyReport(reportYear, reportMonth, classId as string);

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error generating monthly report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate monthly report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/custom
 * Generate custom date range report
 */
router.get('/custom',
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  validateCustomReportRequest,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { startDate, endDate, classId } = req.query;

      const report = await reportService.generateCustomReport(
        new Date(startDate as string),
        new Date(endDate as string),
        classId as string
      );

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error generating custom report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate custom report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;