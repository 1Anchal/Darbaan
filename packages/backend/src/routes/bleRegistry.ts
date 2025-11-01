import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateRequest } from '../middleware/validation';
import { bleRegistryService } from '../services/bleRegistryService';
import { hardwareMonitorService } from '../services/hardwareMonitorService';
import { DeviceType, UserRole } from '../types';

const router = express.Router();

// Validation schemas
const registerDeviceSchema = [
  body('macAddress').isString().notEmpty().withMessage('MAC address is required'),
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('deviceName').isString().notEmpty().withMessage('Device name is required'),
  body('deviceType').isIn(Object.values(DeviceType)).withMessage('Invalid device type')
];

const updateStatusSchema = [
  param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
  body('isActive').isBoolean().withMessage('Active status must be boolean'),
  body('batteryLevel').optional().isInt({ min: 0, max: 100 }).withMessage('Battery level must be 0-100'),
  body('signalStrength').optional().isInt({ min: -100, max: 0 }).withMessage('Signal strength must be -100 to 0')
];

const getActiveDevicesSchema = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
];

/**
 * Register a new BLE device
 * POST /api/ble-registry/register
 */
router.post('/register', 
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  registerDeviceSchema,
  validateRequest,
  async (req, res, next) => {
    try {
      const { macAddress, userId, deviceName, deviceType } = req.body;
      
      const deviceId = await bleRegistryService.registerDevice({
        macAddress,
        userId,
        deviceName,
        deviceType,
        registrationTime: new Date()
      });

      if (deviceId === 'queued') {
        res.status(202).json({
          success: true,
          message: 'Device registration queued due to system load',
          deviceId: null,
          queued: true
        });
      } else {
        res.status(201).json({
          success: true,
          message: 'Device registered successfully',
          deviceId,
          queued: false
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get device by MAC address
 * GET /api/ble-registry/device/:macAddress
 */
router.get('/device/:macAddress',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  param('macAddress').isString().notEmpty().withMessage('MAC address is required'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { macAddress } = req.params;
      const device = await bleRegistryService.getDeviceByMacAddress(macAddress);
      
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      res.json({
        success: true,
        device
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update device status
 * PUT /api/ble-registry/device/:deviceId/status
 */
router.put('/device/:deviceId/status',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  updateStatusSchema,
  validateRequest,
  async (req, res, next) => {
    try {
      const { deviceId } = req.params;
      const { isActive, batteryLevel, signalStrength } = req.body;
      
      await bleRegistryService.updateDeviceStatus(deviceId, isActive, batteryLevel, signalStrength);
      
      res.json({
        success: true,
        message: 'Device status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get active devices with pagination
 * GET /api/ble-registry/devices/active
 */
router.get('/devices/active',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  getActiveDevicesSchema,
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const devices = await bleRegistryService.getActiveDevices(limit, offset);
      
      res.json({
        success: true,
        devices,
        pagination: {
          limit,
          offset,
          count: devices.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Start BLE scanning for a location
 * POST /api/ble-registry/scan/start
 */
router.post('/scan/start',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  body('location').isString().notEmpty().withMessage('Location is required'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { location } = req.body;
      
      bleRegistryService.startOptimizedScanning(location);
      
      res.json({
        success: true,
        message: `BLE scanning started for location: ${location}`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Stop BLE scanning for a location
 * POST /api/ble-registry/scan/stop
 */
router.post('/scan/stop',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  body('location').isString().notEmpty().withMessage('Location is required'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { location } = req.body;
      
      bleRegistryService.stopScanning(location);
      
      res.json({
        success: true,
        message: `BLE scanning stopped for location: ${location}`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get hardware status
 * GET /api/ble-registry/hardware/status
 */
router.get('/hardware/status',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const hardwareStatus = bleRegistryService.getHardwareStatus();
      const currentMetrics = await hardwareMonitorService.getCurrentMetrics();
      const isOptimal = hardwareMonitorService.isOptimalForBLE();
      const recommendations = hardwareMonitorService.getOptimizationRecommendations();
      
      res.json({
        success: true,
        hardwareStatus,
        metrics: currentMetrics,
        isOptimal,
        recommendations
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get registry statistics
 * GET /api/ble-registry/stats
 */
router.get('/stats',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req, res, next) => {
    try {
      const stats = bleRegistryService.getRegistryStats();
      
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
 * Clear device cache
 * POST /api/ble-registry/cache/clear
 */
router.post('/cache/clear',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      bleRegistryService.clearCache();
      
      res.json({
        success: true,
        message: 'Device cache cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Cleanup inactive devices
 * POST /api/ble-registry/cleanup
 */
router.post('/cleanup',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      bleRegistryService.cleanupInactiveDevices();
      
      res.json({
        success: true,
        message: 'Inactive devices cleaned up successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;