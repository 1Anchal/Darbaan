import { bleIntegrationService } from '@/services/bleIntegrationService';
import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateRequest } from '../middleware/validation';
import { bleDataProcessor } from '../services/bleDataProcessor';
import { bleScannerService } from '../services/bleScannerService';
import { UserRole } from '../types';

const router = express.Router();

// Validation schemas
const processBeaconSchema = [
  body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
  body('macAddress').isString().notEmpty().withMessage('MAC address is required'),
  body('rssi').isInt({ min: -120, max: 0 }).withMessage('RSSI must be between -120 and 0'),
  body('location').isString().notEmpty().withMessage('Location is required'),
  body('timestamp').optional().isISO8601().withMessage('Invalid timestamp format')
];

const startScanSchema = [
  body('location').isString().notEmpty().withMessage('Location is required'),
  body('config').optional().isObject().withMessage('Config must be an object'),
  body('config.scanDuration').optional().isInt({ min: 1000, max: 30000 }).withMessage('Scan duration must be 1-30 seconds'),
  body('config.scanInterval').optional().isInt({ min: 5000, max: 60000 }).withMessage('Scan interval must be 5-60 seconds'),
  body('config.rssiThreshold').optional().isInt({ min: -120, max: -30 }).withMessage('RSSI threshold must be -120 to -30'),
  body('config.maxDevicesPerScan').optional().isInt({ min: 1, max: 200 }).withMessage('Max devices must be 1-200')
];

/**
 * Process BLE beacon data manually
 * POST /api/ble-processor/process-beacon
 */
router.post('/process-beacon',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  processBeaconSchema,
  validateRequest,
  async (req, res, next) => {
    try {
      const { deviceId, macAddress, rssi, location, timestamp } = req.body;
      
      const beacon = {
        deviceId,
        macAddress,
        rssi,
        location,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      };

      // Process through integration service for coordinated handling
      await bleIntegrationService.processBLEData(beacon);
      
      const processedData = await bleDataProcessor.processBLEBeacon(beacon);
      
      if (!processedData) {
        return res.status(200).json({
          success: true,
          message: 'Beacon data filtered (low confidence or duplicate)',
          processed: false
        });
      }

      res.status(200).json({
        success: true,
        message: 'Beacon data processed successfully',
        processed: true,
        data: processedData
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get location presence
 * GET /api/ble-processor/presence/:location
 */
router.get('/presence/:location',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  param('location').isString().notEmpty().withMessage('Location is required'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { location } = req.params;
      const presence = bleDataProcessor.getLocationPresence(location);
      
      res.json({
        success: true,
        location,
        deviceCount: presence.length,
        devices: presence
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get device history
 * GET /api/ble-processor/device/:deviceId/history
 */
router.get('/device/:deviceId/history',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be 1-200'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { deviceId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const history = bleDataProcessor.getDeviceHistory(deviceId, limit);
      
      res.json({
        success: true,
        deviceId,
        historyCount: history.length,
        history
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get signal analysis for a device
 * POST /api/ble-processor/signal-analysis
 */
router.post('/signal-analysis',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
  body('rssi').isInt({ min: -120, max: 0 }).withMessage('RSSI must be between -120 and 0'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { deviceId, rssi } = req.body;
      
      const analysis = bleDataProcessor.getSignalAnalysis(deviceId, rssi);
      
      res.json({
        success: true,
        deviceId,
        rssi,
        analysis
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get processing statistics
 * GET /api/ble-processor/stats
 */
router.get('/stats',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req, res, next) => {
    try {
      const stats = bleDataProcessor.getProcessingStats();
      
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
 * Clear processing data
 * POST /api/ble-processor/clear-data
 */
router.post('/clear-data',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      bleDataProcessor.clearProcessingData();
      
      res.json({
        success: true,
        message: 'Processing data cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Start BLE scanning for a location
 * POST /api/ble-processor/scan/start
 */
router.post('/scan/start',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  startScanSchema,
  validateRequest,
  async (req, res, next) => {
    try {
      const { location, config } = req.body;
      
      // Initialize scanner if not already done
      if (!bleScannerService.getScannerStatus().isScanning) {
        await bleScannerService.initialize();
      }
      
      await bleScannerService.startLocationScan(location, config);
      
      res.json({
        success: true,
        message: `BLE scanning started for location: ${location}`,
        location,
        config: config || 'default'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Stop BLE scanning for a location
 * POST /api/ble-processor/scan/stop
 */
router.post('/scan/stop',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  body('location').isString().notEmpty().withMessage('Location is required'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { location } = req.body;
      
      bleScannerService.stopLocationScan(location);
      
      res.json({
        success: true,
        message: `BLE scanning stopped for location: ${location}`,
        location
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Stop all BLE scanning
 * POST /api/ble-processor/scan/stop-all
 */
router.post('/scan/stop-all',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      bleScannerService.stopAllScans();
      
      res.json({
        success: true,
        message: 'All BLE scanning stopped'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get scanner status
 * GET /api/ble-processor/scan/status
 */
router.get('/scan/status',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  async (req, res, next) => {
    try {
      const status = bleScannerService.getScannerStatus();
      
      res.json({
        success: true,
        status
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get location scan statistics
 * GET /api/ble-processor/scan/location/:location/stats
 */
router.get('/scan/location/:location/stats',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  param('location').isString().notEmpty().withMessage('Location is required'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { location } = req.params;
      const stats = bleScannerService.getLocationStats(location);
      
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
 * Perform manual scan
 * POST /api/ble-processor/scan/manual
 */
router.post('/scan/manual',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.FACULTY]),
  body('location').isString().notEmpty().withMessage('Location is required'),
  body('duration').optional().isInt({ min: 1000, max: 30000 }).withMessage('Duration must be 1-30 seconds'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { location, duration } = req.body;
      
      // Initialize scanner if not already done
      if (!bleScannerService.getScannerStatus().isScanning) {
        await bleScannerService.initialize();
      }
      
      const result = await bleScannerService.performManualScan(location, duration);
      
      res.json({
        success: true,
        message: 'Manual scan completed',
        result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update scan configuration
 * PUT /api/ble-processor/scan/config/:location
 */
router.put('/scan/config/:location',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  param('location').isString().notEmpty().withMessage('Location is required'),
  body('scanDuration').optional().isInt({ min: 1000, max: 30000 }).withMessage('Scan duration must be 1-30 seconds'),
  body('scanInterval').optional().isInt({ min: 5000, max: 60000 }).withMessage('Scan interval must be 5-60 seconds'),
  body('rssiThreshold').optional().isInt({ min: -120, max: -30 }).withMessage('RSSI threshold must be -120 to -30'),
  body('maxDevicesPerScan').optional().isInt({ min: 1, max: 200 }).withMessage('Max devices must be 1-200'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { location } = req.params;
      const config = req.body;
      
      bleScannerService.updateScanConfiguration(location, config);
      
      res.json({
        success: true,
        message: `Scan configuration updated for location: ${location}`,
        location,
        config
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;