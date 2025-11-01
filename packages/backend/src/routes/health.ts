import express from 'express';
import { getDatabasesHealth } from '../config';
import { authenticateToken } from '../middleware/auth';
import { getPerformanceStats } from '../middleware/performanceTracking';
import { requireRole } from '../middleware/rbac';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { UserRole } from '../types';
import { databaseOptimizationService } from '../utils/databaseOptimization';

const router = express.Router();

/**
 * Basic health check - public endpoint
 */
router.get('/', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    
    // Basic health indicators
    const health = {
      status: 'OK',
      timestamp,
      uptime: `${Math.floor(uptime / 60)} minutes`,
      service: 'Darbaan Backend API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'Darbaan Backend API',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Detailed health check - requires authentication
 */
router.get('/detailed', authenticateToken, async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    
    // Get database health
    const dbHealth = await getDatabasesHealth();
    
    // Get performance stats
    const performanceStats = getPerformanceStats();
    
    // Get database optimization stats
    const dbStats = databaseOptimizationService.getQueryStats();
    
    const detailedHealth = {
      status: 'OK',
      timestamp,
      uptime: {
        seconds: uptime,
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      service: {
        name: 'Darbaan Backend API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      databases: dbHealth,
      performance: {
        monitoring: performanceStats.isMonitoring,
        currentMetrics: performanceStats.currentMetrics,
        activeAlerts: performanceStats.activeAlerts?.length || 0,
        summary: performanceStats.summary
      },
      database: {
        queryStats: dbStats,
        optimization: databaseOptimizationService.analyzePerformance()
      },
      memory: {
        usage: process.memoryUsage(),
        formatted: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
        }
      }
    };

    // Determine overall status
    const allDbHealthy = Object.values(dbHealth).every((db: any) => db.status === 'healthy');
    const hasPerformanceIssues = performanceStats.activeAlerts && performanceStats.activeAlerts.length > 0;
    
    if (!allDbHealthy) {
      detailedHealth.status = 'DEGRADED';
    } else if (hasPerformanceIssues) {
      detailedHealth.status = 'WARNING';
    }

    const statusCode = detailedHealth.status === 'OK' ? 200 : 
                      detailedHealth.status === 'WARNING' ? 200 : 503;

    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'Darbaan Backend API',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Performance metrics - admin only
 */
router.get('/performance', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const performanceStats = getPerformanceStats();
    const historicalMetrics = performanceMonitoringService.getHistoricalMetrics(50);
    const alerts = performanceMonitoringService.getAllAlerts(20);
    
    res.json({
      current: performanceStats.currentMetrics,
      historical: historicalMetrics,
      alerts: {
        active: performanceStats.activeAlerts,
        all: alerts
      },
      summary: performanceStats.summary,
      isMonitoring: performanceStats.isMonitoring,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Database performance - admin only
 */
router.get('/database', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const dbHealth = await getDatabasesHealth();
    const queryStats = databaseOptimizationService.getQueryStats();
    const slowQueries = databaseOptimizationService.getSlowQueries(10);
    const analysis = databaseOptimizationService.analyzePerformance();
    
    res.json({
      health: dbHealth,
      queryStats,
      slowQueries,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get database performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Readiness probe - for container orchestration
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    const dbHealth = await getDatabasesHealth();
    const allDbHealthy = Object.values(dbHealth).every((db: any) => db.status === 'healthy');
    
    if (allDbHealthy) {
      res.status(200).json({
        status: 'READY',
        timestamp: new Date().toISOString(),
        databases: dbHealth
      });
    } else {
      res.status(503).json({
        status: 'NOT_READY',
        timestamp: new Date().toISOString(),
        databases: dbHealth
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Liveness probe - for container orchestration
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Start performance monitoring - admin only
 */
router.post('/monitoring/start', authenticateToken, requireRole([UserRole.ADMIN]), (req, res) => {
  try {
    const { interval = 30000 } = req.body;
    
    if (performanceMonitoringService.isMonitoringActive()) {
      return res.status(400).json({
        error: 'Performance monitoring is already active'
      });
    }
    
    performanceMonitoringService.startMonitoring(interval);
    
    return res.json({
      message: 'Performance monitoring started',
      interval,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to start performance monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stop performance monitoring - admin only
 */
router.post('/monitoring/stop', authenticateToken, requireRole([UserRole.ADMIN]), (req, res) => {
  try {
    if (!performanceMonitoringService.isMonitoringActive()) {
      return res.status(400).json({
        error: 'Performance monitoring is not active'
      });
    }
    
    performanceMonitoringService.stopMonitoring();
    
    return res.json({
      message: 'Performance monitoring stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to stop performance monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear performance data - admin only
 */
router.delete('/performance/clear', authenticateToken, requireRole([UserRole.ADMIN]), (req, res) => {
  try {
    performanceMonitoringService.cleanup();
    databaseOptimizationService.clearQueryLogs();
    
    res.json({
      message: 'Performance data cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear performance data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Resolve performance alert - admin only
 */
router.patch('/alerts/:alertId/resolve', authenticateToken, requireRole([UserRole.ADMIN]), (req, res) => {
  try {
    const { alertId } = req.params;
    const resolved = performanceMonitoringService.resolveAlert(alertId);
    
    if (resolved) {
      res.json({
        message: 'Alert resolved successfully',
        alertId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'Alert not found',
        alertId
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;