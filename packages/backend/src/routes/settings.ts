import { auditSettingsMiddleware } from '@/middleware/audit';
import { settingsRateLimit } from '@/middleware/rateLimiter';
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { settingsService } from '../services/settingsService';
import { SettingsCategory, UserRole } from '../types';
import {
    attendanceSettingsUpdateSchema,
    generalSettingsUpdateSchema,
    notificationSettingsUpdateSchema,
    securitySettingsUpdateSchema,
    systemSettingsUpdateSchema
} from '../validation/schemas';

const router = express.Router();

// Apply authentication and security to all routes
router.use(authenticateToken);
router.use(settingsRateLimit.middleware());
router.use(auditSettingsMiddleware);

// Get all settings (admin only)
router.get('/', requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching all settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Get settings by category
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    if (!Object.values(SettingsCategory).includes(category as SettingsCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings category'
      });
    }

    const settings = await settingsService.getSettingsByCategory(category as SettingsCategory);
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found for this category'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Update General settings
router.put('/general', 
  requireRole([UserRole.ADMIN]), 
  async (req, res) => {
    try {
      // Validate request body
      const { error, value } = generalSettingsUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map((detail: any) => detail.message)
        });
      }

      const updates = value;
      const updatedBy = req.user!.userId;

      const updatedSettings = await settingsService.updateSettingsByCategory(
        SettingsCategory.GENERAL,
        updates,
        updatedBy
      );

      res.json({
        success: true,
        data: updatedSettings,
        message: 'General settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating general settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update general settings'
      });
    }
  }
);

// Update Attendance settings
router.put('/attendance', 
  requireRole([UserRole.ADMIN, UserRole.FACULTY]), 
  async (req, res) => {
    try {
      // Validate request body
      const { error, value } = attendanceSettingsUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map((detail: any) => detail.message)
        });
      }

      const updates = value;
      const updatedBy = req.user!.userId;

      const updatedSettings = await settingsService.updateSettingsByCategory(
        SettingsCategory.ATTENDANCE,
        updates,
        updatedBy
      );

      res.json({
        success: true,
        data: updatedSettings,
        message: 'Attendance settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating attendance settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update attendance settings'
      });
    }
  }
);

// Update Notification settings
router.put('/notifications', 
  async (req, res) => {
    try {
      // Validate request body
      const { error, value } = notificationSettingsUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map((detail: any) => detail.message)
        });
      }

      const updates = value;
      const updatedBy = req.user!.userId;

      const updatedSettings = await settingsService.updateSettingsByCategory(
        SettingsCategory.NOTIFICATIONS,
        updates,
        updatedBy
      );

      res.json({
        success: true,
        data: updatedSettings,
        message: 'Notification settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification settings'
      });
    }
  }
);

// Update Security settings
router.put('/security', 
  requireRole([UserRole.ADMIN]), 
  async (req, res) => {
    try {
      // Validate request body
      const { error, value } = securitySettingsUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map((detail: any) => detail.message)
        });
      }

      const updates = value;
      const updatedBy = req.user!.userId;

      const updatedSettings = await settingsService.updateSettingsByCategory(
        SettingsCategory.SECURITY,
        updates,
        updatedBy
      );

      res.json({
        success: true,
        data: updatedSettings,
        message: 'Security settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating security settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update security settings'
      });
    }
  }
);

// Update System settings
router.put('/system', 
  requireRole([UserRole.ADMIN]), 
  async (req, res) => {
    try {
      // Validate request body
      const { error, value } = systemSettingsUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map((detail: any) => detail.message)
        });
      }

      const updates = value;
      const updatedBy = req.user!.userId;

      const updatedSettings = await settingsService.updateSettingsByCategory(
        SettingsCategory.SYSTEM,
        updates,
        updatedBy
      );

      res.json({
        success: true,
        data: updatedSettings,
        message: 'System settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating system settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update system settings'
      });
    }
  }
);

// Initialize default settings (admin only)
router.post('/initialize', requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const updatedBy = req.user!.userId;
    await settingsService.initializeDefaultSettings(updatedBy);

    res.json({
      success: true,
      message: 'Default settings initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing default settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize default settings'
    });
  }
});

export default router;