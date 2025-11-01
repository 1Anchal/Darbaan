import express, { Request, Response } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { apiRateLimit } from '../middleware/rateLimiter';
import {
    Action,
    requirePermission,
    Resource
} from '../middleware/rbac';
import { bleDeviceService } from '../services/bleDeviceService';
import { DeviceType } from '../types';

const router = express.Router();

// All BLE device routes require authentication
router.use(authenticateToken);

// Validation schemas for BLE device operations
const createBLEDeviceSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
  deviceName: Joi.string().min(1).max(100).required(),
  deviceType: Joi.string().valid(...Object.values(DeviceType)).required(),
  batteryLevel: Joi.number().min(0).max(100).optional(),
  signalStrength: Joi.number().min(-100).max(0).optional()
});

const updateBLEDeviceSchema = Joi.object({
  deviceName: Joi.string().min(1).max(100).optional(),
  deviceType: Joi.string().valid(...Object.values(DeviceType)).optional(),
  isActive: Joi.boolean().optional(),
  batteryLevel: Joi.number().min(0).max(100).optional(),
  signalStrength: Joi.number().min(-100).max(0).optional()
});

// Get all BLE devices (admin only)
router.get('/',
  requirePermission(Resource.BLE_DEVICE, Action.READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { active } = req.query;
    
    let devices;
    if (active === 'true') {
      devices = await bleDeviceService.getActiveDevices();
    } else {
      devices = await bleDeviceService.getAllDevices();
    }
    
    res.json({
      success: true,
      data: devices,
      count: devices.length
    });
  })
);

// Get current user's BLE devices
router.get('/my-devices',
  asyncHandler(async (req: Request, res: Response) => {
    const devices = await bleDeviceService.getDevicesByUserId(req.user!.userId);
    
    res.json({
      success: true,
      data: devices,
      count: devices.length
    });
  })
);

// Create new BLE device
router.post('/',
  apiRateLimit.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = createBLEDeviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Users can only create devices for themselves unless they're admin
    if (req.user!.role !== 'ADMIN' && value.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Can only create devices for yourself'
      });
    }

    const device = await bleDeviceService.createDevice(value);
    
    res.status(201).json({
      success: true,
      data: device,
      message: 'BLE device registered successfully'
    });
  })
);

// Get specific BLE device
router.get('/:deviceId',
  asyncHandler(async (req: Request, res: Response) => {
    const device = await bleDeviceService.getDeviceById(req.params.deviceId);
    
    // Check if user can access this device
    if (req.user!.role !== 'ADMIN' && device.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: device
    });
  })
);

// Update BLE device
router.put('/:deviceId',
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = updateBLEDeviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Check device ownership
    const existingDevice = await bleDeviceService.getDeviceById(req.params.deviceId);
    if (req.user!.role !== 'ADMIN' && existingDevice.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const device = await bleDeviceService.updateDevice(req.params.deviceId, value);
    
    res.json({
      success: true,
      data: device,
      message: 'BLE device updated successfully'
    });
  })
);

// Delete BLE device
router.delete('/:deviceId',
  asyncHandler(async (req: Request, res: Response) => {
    // Check device ownership
    const existingDevice = await bleDeviceService.getDeviceById(req.params.deviceId);
    if (req.user!.role !== 'ADMIN' && existingDevice.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await bleDeviceService.deleteDevice(req.params.deviceId);
    
    res.json({
      success: true,
      message: 'BLE device deleted successfully'
    });
  })
);

// Get devices by user ID (admin only)
router.get('/user/:userId',
  requirePermission(Resource.BLE_DEVICE, Action.READ),
  asyncHandler(async (req: Request, res: Response) => {
    const devices = await bleDeviceService.getDevicesByUserId(req.params.userId);
    
    res.json({
      success: true,
      data: devices,
      count: devices.length
    });
  })
);

// Update device status (admin only)
router.patch('/:deviceId/status',
  requirePermission(Resource.BLE_DEVICE, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    const device = await bleDeviceService.updateDeviceStatus(req.params.deviceId, isActive);
    
    res.json({
      success: true,
      data: device,
      message: `Device ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  })
);

// Update device last seen (for BLE scanning system)
router.patch('/:deviceId/heartbeat',
  requirePermission(Resource.BLE_DEVICE, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    const { batteryLevel, signalStrength } = req.body;
    
    const device = await bleDeviceService.updateDeviceLastSeen(
      req.params.deviceId, 
      batteryLevel, 
      signalStrength
    );
    
    res.json({
      success: true,
      data: device,
      message: 'Device heartbeat updated'
    });
  })
);

// Get devices near expiry (admin only)
router.get('/status/expiring',
  requirePermission(Resource.BLE_DEVICE, Action.READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { hours = 24 } = req.query;
    const thresholdHours = parseInt(hours as string, 10);
    
    if (isNaN(thresholdHours) || thresholdHours < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hours parameter'
      });
    }

    const devices = await bleDeviceService.getDevicesNearExpiry(thresholdHours);
    
    res.json({
      success: true,
      data: devices,
      count: devices.length,
      threshold: `${thresholdHours} hours`
    });
  })
);

export default router;