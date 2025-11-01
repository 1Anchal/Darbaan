import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { systemIntegrationService } from '../services/systemIntegrationService';
import { UserRole } from '../types';

const router = express.Router();

/**
 * Get system health status
 * Admin only
 */
router.get('/health', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const healthChecks = await systemIntegrationService.performSystemHealthCheck();
    
    const healthSummary = {
      overallStatus: Array.from(healthChecks.values()).every(check => check.status === 'healthy') 
        ? 'healthy' 
        : Array.from(healthChecks.values()).some(check => check.status === 'unhealthy')
        ? 'unhealthy'
        : 'degraded',
      totalServices: healthChecks.size,
      healthyServices: Array.from(healthChecks.values()).filter(check => check.status === 'healthy').length,
      lastCheck: new Date(),
      services: Array.from(healthChecks.values())
    };

    res.json(healthSummary);
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      error: 'Failed to get system health status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get integration statistics
 * Admin and Faculty
 */
router.get('/stats', authenticateToken, requireRole([UserRole.ADMIN, UserRole.FACULTY]), async (req, res) => {
  try {
    const stats = systemIntegrationService.getIntegrationStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting integration stats:', error);
    res.status(500).json({
      error: 'Failed to get integration statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test user workflow for specific role
 * Admin only
 */
router.post('/test-workflow/:role', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['student', 'faculty', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be one of: student, faculty, admin'
      });
    }

    const testResults = await systemIntegrationService.testUserWorkflow(role as any);
    return res.json(testResults);
  } catch (error) {
    console.error('Error testing user workflow:', error);
    return res.status(500).json({
      error: 'Failed to test user workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get real-time system status
 * Admin and Faculty
 */
router.get('/realtime-status', authenticateToken, requireRole([UserRole.ADMIN, UserRole.FACULTY]), async (req, res) => {
  try {
    const [healthChecks, stats] = await Promise.all([
      systemIntegrationService.getSystemHealth(),
      systemIntegrationService.getIntegrationStats()
    ]);

    const realtimeStatus = {
      timestamp: new Date(),
      systemHealth: {
        overallStatus: Array.from(healthChecks.values()).every(check => check.status === 'healthy') 
          ? 'healthy' 
          : 'degraded',
        services: Array.from(healthChecks.values()).map(check => ({
          service: check.service,
          status: check.status,
          lastCheck: check.lastCheck
        }))
      },
      integrationStats: stats,
      activeConnections: {
        websocketConnections: stats.totalConnectedUsers,
        attendanceSessions: stats.activeAttendanceSessions,
        bleDevices: stats.bleDevicesActive
      }
    };

    res.json(realtimeStatus);
  } catch (error) {
    console.error('Error getting real-time status:', error);
    res.status(500).json({
      error: 'Failed to get real-time system status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Force system health check
 * Admin only
 */
router.post('/health/check', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const healthChecks = await systemIntegrationService.performSystemHealthCheck();
    
    res.json({
      message: 'System health check completed',
      timestamp: new Date(),
      results: Array.from(healthChecks.values())
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({
      error: 'Failed to perform system health check',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;