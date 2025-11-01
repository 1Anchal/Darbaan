import { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { CrowdMonitoringService } from '../services/crowdMonitoringService';
import { CrowdLocation, UserRole } from '../types';

const router = Router();
const crowdService = new CrowdMonitoringService();

// Apply authentication to all routes
router.use(authenticateToken);

// Get campus overview - accessible to all authenticated users
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const overview = await crowdService.getCampusOverview();
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Error getting campus overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campus overview',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get occupancy for a specific location
router.get('/location/:location', async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    
    // Validate location parameter
    if (!Object.values(CrowdLocation).includes(location as CrowdLocation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location parameter'
      });
    }

    const occupancy = await crowdService.calculateLocationOccupancy(location as CrowdLocation);
    res.json({
      success: true,
      data: occupancy
    });
  } catch (error) {
    console.error(`Error getting location occupancy for ${req.params.location}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location occupancy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get occupancy for all locations
router.get('/locations', async (req: Request, res: Response) => {
  try {
    const locations = Object.values(CrowdLocation);
    const occupancyPromises = locations.map(location => 
      crowdService.calculateLocationOccupancy(location)
    );
    
    const occupancies = await Promise.all(occupancyPromises);
    
    res.json({
      success: true,
      data: occupancies
    });
  } catch (error) {
    console.error('Error getting all location occupancies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location occupancies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get crowd alerts - admin and faculty only
router.get('/alerts', requireRole([UserRole.ADMIN, UserRole.FACULTY]), async (req: Request, res: Response) => {
  try {
    const alerts = await crowdService.getCrowdAlerts();
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting crowd alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get crowd alerts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get historical crowd data for a location
router.get('/location/:location/history', async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const { startDate, endDate } = req.query;
    
    // Validate location parameter
    if (!Object.values(CrowdLocation).includes(location as CrowdLocation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location parameter'
      });
    }

    // Default to last 24 hours if no dates provided
    const endTime = endDate ? new Date(endDate as string) : new Date();
    const startTime = startDate ? new Date(startDate as string) : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    // Validate date range
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)'
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    const historicalData = await crowdService.getHistoricalCrowdData(
      location as CrowdLocation,
      startTime,
      endTime
    );

    res.json({
      success: true,
      data: {
        location,
        startTime,
        endTime,
        records: historicalData
      }
    });
  } catch (error) {
    console.error(`Error getting historical data for ${req.params.location}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get historical crowd data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get crowd patterns analysis for a location - admin and faculty only
router.get('/location/:location/patterns', requireRole([UserRole.ADMIN, UserRole.FACULTY]), async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const { days } = req.query;
    
    // Validate location parameter
    if (!Object.values(CrowdLocation).includes(location as CrowdLocation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location parameter'
      });
    }

    // Validate days parameter
    const analysisDays = days ? parseInt(days as string) : 7;
    if (isNaN(analysisDays) || analysisDays < 1 || analysisDays > 30) {
      return res.status(400).json({
        success: false,
        message: 'Days parameter must be a number between 1 and 30'
      });
    }

    const patterns = await crowdService.getCrowdPatterns(location as CrowdLocation, analysisDays);
    
    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    console.error(`Error getting crowd patterns for ${req.params.location}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get crowd patterns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update device presence (used by BLE system) - internal endpoint
router.post('/device-presence', requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { deviceId, userId, location, isPresent } = req.body;
    
    // Validate required fields
    if (!deviceId || !userId || !location || typeof isPresent !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: deviceId, userId, location, isPresent'
      });
    }

    // Validate location
    if (!Object.values(CrowdLocation).includes(location)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location parameter'
      });
    }

    await crowdService.updateDevicePresence(deviceId, userId, location, isPresent);
    
    res.json({
      success: true,
      message: 'Device presence updated successfully'
    });
  } catch (error) {
    console.error('Error updating device presence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device presence',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get real-time occupancy data for dashboard (WebSocket alternative)
router.get('/realtime', async (req: Request, res: Response) => {
  try {
    // Get overview and all location data
    const [overview, locations] = await Promise.all([
      crowdService.getCampusOverview(),
      Promise.all(
        Object.values(CrowdLocation).map(location => 
          crowdService.calculateLocationOccupancy(location)
        )
      )
    ]);

    res.json({
      success: true,
      data: {
        overview,
        locations,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting real-time crowd data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time crowd data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;