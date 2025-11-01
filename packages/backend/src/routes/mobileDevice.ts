import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { mobileBLEService } from '../services/mobileBLEService';
import { UserRole } from '../types';

const router = express.Router();

/**
 * Register a new mobile device for BLE attendance
 */
router.post('/register',
  authenticateToken,
  requireRole([UserRole.STUDENT]),
  async (req: Request, res: Response) => {
    try {
      const { deviceId, bluetoothMac, deviceModel, androidVersion, appVersion, deviceName } = req.body;
      const userId = (req as any).user.userId;

      if (!deviceId || !bluetoothMac || !deviceModel || !androidVersion || !appVersion) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['deviceId', 'bluetoothMac', 'deviceModel', 'androidVersion', 'appVersion']
        });
      }

      const registrationRequest = {
        userId,
        deviceId,
        bluetoothMac,
        deviceModel,
        androidVersion,
        appVersion,
        deviceName
      };

      const deviceInfo = await mobileBLEService.registerMobileDevice(registrationRequest);

      return res.status(201).json({
        message: 'Mobile device registered successfully',
        device: deviceInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registering mobile device:', error);
      return res.status(500).json({
        error: 'Failed to register mobile device',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Process BLE beacon from mobile device
 */
router.post('/beacon', async (req: Request, res: Response) => {
  try {
    const {
      deviceId,
      bluetoothMac,
      userId,
      location,
      signalStrength,
      sequenceNumber,
      batteryLevel,
      signature
    } = req.body;

    if (!deviceId || !bluetoothMac || !userId || !location || !signalStrength || !sequenceNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['deviceId', 'bluetoothMac', 'userId', 'location', 'signalStrength', 'sequenceNumber']
      });
    }

    const beacon = {
      deviceId,
      bluetoothMac,
      userId,
      timestamp: new Date(),
      location,
      signalStrength: parseInt(signalStrength),
      sequenceNumber: parseInt(sequenceNumber),
      batteryLevel: batteryLevel ? parseInt(batteryLevel) : undefined,
      signature
    };

    const processed = await mobileBLEService.processMobileBeacon(beacon);

    if (processed) {
      return res.json({
        message: 'Beacon processed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        error: 'Failed to process beacon',
        message: 'Invalid beacon data or device not registered'
      });
    }
  } catch (error) {
    console.error('Error processing mobile beacon:', error);
    return res.status(500).json({
      error: 'Failed to process beacon',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user's registered mobile devices
 */
router.get('/user/:userId?',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const requestedUserId = req.params.userId;
      const currentUserId = (req as any).user.userId;
      const userRole = (req as any).user.role;

      // Students can only see their own devices
      let targetUserId = currentUserId;
      if (requestedUserId) {
        if (userRole === UserRole.STUDENT && requestedUserId !== currentUserId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Students can only view their own devices'
          });
        }
        targetUserId = requestedUserId;
      }

      const devices = await mobileBLEService.getUserMobileDevices(targetUserId);

      return res.json({
        userId: targetUserId,
        devices,
        count: devices.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting user mobile devices:', error);
      return res.status(500).json({
        error: 'Failed to get mobile devices',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get specific mobile device information
 */
router.get('/device/:deviceId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const currentUserId = (req as any).user.userId;
      const userRole = (req as any).user.role;

      if (!deviceId) {
        return res.status(400).json({
          error: 'Device ID is required'
        });
      }

      const deviceInfo = await mobileBLEService.getDeviceInfo(deviceId);

      if (!deviceInfo) {
        return res.status(404).json({
          error: 'Device not found'
        });
      }

      // Students can only see their own devices
      if (userRole === UserRole.STUDENT && deviceInfo.userId !== currentUserId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own devices'
        });
      }

      return res.json({
        device: deviceInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting device info:', error);
      return res.status(500).json({
        error: 'Failed to get device information',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Deactivate a mobile device
 */
router.delete('/device/:deviceId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const currentUserId = (req as any).user.userId;
      const userRole = (req as any).user.role;

      if (!deviceId) {
        return res.status(400).json({
          error: 'Device ID is required'
        });
      }

      // Get device info to check ownership
      const deviceInfo = await mobileBLEService.getDeviceInfo(deviceId);
      if (!deviceInfo) {
        return res.status(404).json({
          error: 'Device not found'
        });
      }

      // Students can only deactivate their own devices
      let targetUserId = deviceInfo.userId;
      if (userRole === UserRole.STUDENT && deviceInfo.userId !== currentUserId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only deactivate your own devices'
        });
      }

      const deactivated = await mobileBLEService.deactivateMobileDevice(deviceId, targetUserId);

      if (deactivated) {
        return res.json({
          message: 'Device deactivated successfully',
          deviceId,
          timestamp: new Date().toISOString()
        });
      } else {
        return res.status(400).json({
          error: 'Failed to deactivate device',
          message: 'Device may already be inactive or not found'
        });
      }
    } catch (error) {
      console.error('Error deactivating device:', error);
      return res.status(500).json({
        error: 'Failed to deactivate device',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get mobile device statistics
 */
router.get('/stats',
  authenticateToken,
  requireRole([UserRole.FACULTY, UserRole.ADMIN]),
  async (req: Request, res: Response) => {
    try {
      const stats = await mobileBLEService.getMobileDeviceStats();

      res.json({
        statistics: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting mobile device stats:', error);
      res.status(500).json({
        error: 'Failed to get device statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Generate QR code for device registration
 */
router.get('/registration-qr',
  authenticateToken,
  requireRole([UserRole.STUDENT]),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const qrData = mobileBLEService.generateRegistrationQR(userId);

      res.json({
        qrData,
        instructions: 'Scan this QR code with the Darbaan mobile app to register your device',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating registration QR:', error);
      res.status(500).json({
        error: 'Failed to generate registration QR code',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;