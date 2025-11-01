import { EventEmitter } from 'events';
import { CrowdLocation } from '../types';
import { attendanceRecordingService } from './attendanceRecordingService';
import { bleDataProcessor, EntryExitEvent } from './bleDataProcessor';
import { CrowdMonitoringService } from './crowdMonitoringService';
import { mobileBLEService } from './mobileBLEService';

export interface BLEIntegrationEvent {
  type: 'entry' | 'exit' | 'presence_update' | 'crowd_alert';
  deviceId: string;
  userId: string;
  location: string;
  timestamp: Date;
  data?: any;
}

export interface CrowdDensityUpdate {
  location: CrowdLocation;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyRate: number;
  alertLevel: string;
  timestamp: Date;
}

export class BLEIntegrationService extends EventEmitter {
  private crowdMonitoringService: CrowdMonitoringService;
  private socketService: any;
  private isInitialized = false;

  constructor() {
    super();
    this.crowdMonitoringService = new CrowdMonitoringService();
  }

  /**
   * Initialize the integration service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Socket service will be initialized by the main server
      // this.socketService = initializeSocketService();
      
      // Set up event listeners
      this.setupBLEEventListeners();
      this.setupMobileBLEEventListeners();
      this.setupAttendanceEventListeners();
      this.setupCrowdMonitoringEventListeners();
      
      this.isInitialized = true;
      console.log('✅ BLE Integration Service initialized');
      
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize BLE Integration Service:', error);
      throw error;
    }
  }

  /**
   * Process BLE beacon data and coordinate all systems
   */
  async processBLEData(beaconData: any): Promise<void> {
    try {
      // Process through BLE data processor first
      const processedData = await bleDataProcessor.processBLEBeacon(beaconData);
      
      if (!processedData) return;

      // Create integration event
      const integrationEvent: BLEIntegrationEvent = {
        type: processedData.eventType === 'entry' ? 'entry' : 
              processedData.eventType === 'exit' ? 'exit' : 'presence_update',
        deviceId: processedData.deviceId,
        userId: processedData.userId,
        location: processedData.location,
        timestamp: processedData.timestamp,
        data: processedData
      };

      // Emit integration event
      this.emit('bleDataProcessed', integrationEvent);

      // Send real-time updates via WebSocket
      if (this.socketService) {
        this.socketService.broadcastToRoom('crowd-monitoring', 'ble-update', {
          location: processedData.location,
          eventType: processedData.eventType,
          timestamp: processedData.timestamp,
          occupancyChange: processedData.eventType === 'entry' ? 1 : 
                          processedData.eventType === 'exit' ? -1 : 0
        });
      }

    } catch (error) {
      console.error('Error processing BLE data in integration service:', error);
      this.emit('processingError', { beaconData, error });
    }
  }

  /**
   * Get real-time crowd data for all locations
   */
  async getRealTimeCrowdData(): Promise<any> {
    try {
      const [overview, locations] = await Promise.all([
        this.crowdMonitoringService.getCampusOverview(),
        Promise.all(
          Object.values(CrowdLocation).map(location => 
            this.crowdMonitoringService.calculateLocationOccupancy(location)
          )
        )
      ]);

      return {
        overview,
        locations,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting real-time crowd data:', error);
      throw error;
    }
  }

  /**
   * Handle crowd density alerts
   */
  private async handleCrowdDensityAlert(location: CrowdLocation, occupancyData: any): Promise<void> {
    try {
      const alerts = await this.crowdMonitoringService.getCrowdAlerts();
      const locationAlerts = alerts.filter(alert => alert.location === location && alert.isActive);

      if (locationAlerts.length > 0) {
        // Broadcast alert via WebSocket
        if (this.socketService) {
          this.socketService.broadcastToRoom('crowd-monitoring', 'crowd-alert', {
            location,
            alerts: locationAlerts,
            occupancyData,
            timestamp: new Date()
          });
        }

        // Emit integration event
        const integrationEvent: BLEIntegrationEvent = {
          type: 'crowd_alert',
          deviceId: 'system',
          userId: 'system',
          location,
          timestamp: new Date(),
          data: { alerts: locationAlerts, occupancyData }
        };

        this.emit('crowdAlert', integrationEvent);
      }
    } catch (error) {
      console.error('Error handling crowd density alert:', error);
    }
  }

  /**
   * Set up BLE data processor event listeners
   */
  private setupBLEEventListeners(): void {
    bleDataProcessor.on('entryExitDetected', async (event: EntryExitEvent) => {
      try {
        // Check if this is a crowd monitoring location
        const crowdLocations = Object.values(CrowdLocation);
        if (crowdLocations.includes(event.location as CrowdLocation)) {
          
          // Get updated occupancy data
          const occupancyData = await this.crowdMonitoringService.calculateLocationOccupancy(
            event.location as CrowdLocation
          );

          // Check for alerts
          await this.handleCrowdDensityAlert(event.location as CrowdLocation, occupancyData);

          // Broadcast real-time occupancy update
          if (this.socketService) {
            this.socketService.broadcastToRoom('crowd-monitoring', 'occupancy-update', {
              location: event.location,
              occupancyData,
              event: {
                type: event.eventType,
                userId: event.userId,
                timestamp: event.timestamp
              }
            });
          }
        }

        this.emit('entryExitProcessed', event);
      } catch (error) {
        console.error('Error processing entry/exit event:', error);
      }
    });

    bleDataProcessor.on('crowdMonitoringUpdated', (data: any) => {
      // Broadcast crowd monitoring update
      if (this.socketService) {
        this.socketService.broadcastToRoom('crowd-monitoring', 'presence-update', data);
      }
      
      this.emit('crowdMonitoringUpdated', data);
    });

    bleDataProcessor.on('processingError', (error: any) => {
      console.error('BLE processing error:', error);
      this.emit('bleProcessingError', error);
    });
  }

  /**
   * Set up attendance recording service event listeners
   */
  private setupAttendanceEventListeners(): void {
    attendanceRecordingService.on('attendanceEventRecorded', (event: any) => {
      // Broadcast attendance update
      if (this.socketService) {
        this.socketService.broadcastToRoom('attendance', 'attendance-recorded', event);
      }
      
      this.emit('attendanceRecorded', event);
    });

    attendanceRecordingService.on('sessionStarted', (session: any) => {
      if (this.socketService) {
        this.socketService.broadcastToRoom('attendance', 'session-started', session);
      }
      
      this.emit('attendanceSessionStarted', session);
    });

    attendanceRecordingService.on('sessionEnded', (session: any) => {
      if (this.socketService) {
        this.socketService.broadcastToRoom('attendance', 'session-ended', session);
      }
      
      this.emit('attendanceSessionEnded', session);
    });
  }

  /**
   * Set up mobile BLE service event listeners
   */
  private setupMobileBLEEventListeners(): void {
    mobileBLEService.on('mobileBeaconProcessed', async (beacon: any) => {
      try {
        // Process mobile beacon similar to regular BLE beacon
        const integrationEvent: BLEIntegrationEvent = {
          type: 'presence_update',
          deviceId: beacon.deviceId,
          userId: beacon.userId,
          location: beacon.location,
          timestamp: beacon.timestamp,
          data: {
            ...beacon,
            deviceType: 'mobile',
            batteryLevel: beacon.batteryLevel,
            signalStrength: beacon.signalStrength
          }
        };

        // Emit integration event
        this.emit('bleDataProcessed', integrationEvent);

        // Send real-time updates via WebSocket
        if (this.socketService) {
          this.socketService.broadcastToRoom('crowd-monitoring', 'mobile-ble-update', {
            location: beacon.location,
            eventType: 'mobile_presence',
            timestamp: beacon.timestamp,
            userId: beacon.userId,
            deviceType: 'mobile',
            batteryLevel: beacon.batteryLevel,
            signalStrength: beacon.signalStrength
          });
        }

        console.log(`Mobile BLE beacon processed: ${beacon.userId} at ${beacon.location}`);

      } catch (error) {
        console.error('Error processing mobile BLE beacon:', error);
      }
    });

    mobileBLEService.on('deviceRegistered', (deviceInfo: any) => {
      console.log(`New mobile device registered: ${deviceInfo.deviceId} for user ${deviceInfo.userId}`);
      
      // Broadcast device registration event
      if (this.socketService) {
        this.socketService.broadcastToRoom('attendance', 'mobile-device-registered', {
          deviceInfo,
          timestamp: new Date()
        });
      }
    });

    mobileBLEService.on('deviceDeactivated', (data: any) => {
      console.log(`Mobile device deactivated: ${data.deviceId} for user ${data.userId}`);
      
      // Broadcast device deactivation event
      if (this.socketService) {
        this.socketService.broadcastToRoom('attendance', 'mobile-device-deactivated', {
          ...data,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Set up crowd monitoring service event listeners
   */
  private setupCrowdMonitoringEventListeners(): void {
    // Note: CrowdMonitoringService doesn't extend EventEmitter in our implementation
    // but we can add periodic updates here
    
    // Periodic crowd data broadcast (every 30 seconds)
    setInterval(async () => {
      try {
        if (this.socketService) {
          const realTimeData = await this.getRealTimeCrowdData();
          this.socketService.broadcastToRoom('crowd-monitoring', 'periodic-update', realTimeData);
        }
      } catch (error) {
        console.error('Error in periodic crowd data update:', error);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Get integration service statistics
   */
  async getIntegrationStats(): Promise<any> {
    const mobileDeviceStats = await mobileBLEService.getMobileDeviceStats();
    
    return {
      isInitialized: this.isInitialized,
      bleProcessorStats: bleDataProcessor.getProcessingStats(),
      attendanceActiveSessions: attendanceRecordingService.getActiveSessions().length,
      mobileDevices: {
        totalRegistered: mobileDeviceStats.totalRegistered,
        activeDevices: mobileDeviceStats.activeDevices,
        recentlyActive: mobileDeviceStats.recentlyActive
      },
      timestamp: new Date()
    };
  }

  /**
   * Handle manual crowd count adjustment (for testing or manual corrections)
   */
  async adjustCrowdCount(location: CrowdLocation, adjustment: number, reason: string): Promise<void> {
    try {
      // This would be used for manual adjustments or corrections
      // For now, we'll just emit an event and log it
      
      const adjustmentEvent = {
        location,
        adjustment,
        reason,
        timestamp: new Date(),
        type: 'manual_adjustment'
      };

      // Broadcast the adjustment
      if (this.socketService) {
        this.socketService.broadcastToRoom('crowd-monitoring', 'manual-adjustment', adjustmentEvent);
      }

      this.emit('manualCrowdAdjustment', adjustmentEvent);
      
      console.log(`Manual crowd count adjustment: ${location} ${adjustment > 0 ? '+' : ''}${adjustment} (${reason})`);
      
    } catch (error) {
      console.error('Error adjusting crowd count:', error);
      throw error;
    }
  }

  /**
   * Shutdown the integration service
   */
  async shutdown(): Promise<void> {
    try {
      // Clean up any intervals or listeners
      this.removeAllListeners();
      
      console.log('🔌 BLE Integration Service shutdown complete');
    } catch (error) {
      console.error('Error during BLE Integration Service shutdown:', error);
    }
  }
}

// Export singleton instance
export const bleIntegrationService = new BLEIntegrationService();