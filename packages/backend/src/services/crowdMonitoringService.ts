import { AttendanceDataService } from '../config/influxdb';
import { RedisCache, getRedisClient } from '../config/redis';
import { AlertLevel, CrowdLocation } from '../types';

export interface LocationCapacity {
  location: CrowdLocation;
  maxCapacity: number;
  warningThreshold: number; // Percentage (e.g., 80 for 80%)
  criticalThreshold: number; // Percentage (e.g., 95 for 95%)
}

export interface CampusOverview {
  totalLocations: number;
  totalOccupancy: number;
  totalCapacity: number;
  activeAlerts: number;
  occupancyRate: number;
  lastUpdated: Date;
}

export interface LocationOccupancy {
  location: CrowdLocation;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyRate: number;
  alertLevel: AlertLevel;
  activeDevices: string[];
  lastUpdated: Date;
  entryCount24h: number;
  exitCount24h: number;
}

export interface CrowdAlert {
  id: string;
  location: CrowdLocation;
  alertLevel: AlertLevel;
  message: string;
  occupancyCount: number;
  maxCapacity: number;
  timestamp: Date;
  isActive: boolean;
}

export class CrowdMonitoringService {
  private influxService: AttendanceDataService;
  private cache: RedisCache;
  
  // Location capacity configurations
  private locationCapacities: LocationCapacity[] = [
    {
      location: CrowdLocation.FOOD_STREET,
      maxCapacity: 200,
      warningThreshold: 80,
      criticalThreshold: 95
    },
    {
      location: CrowdLocation.ROCK_PLAZA,
      maxCapacity: 150,
      warningThreshold: 80,
      criticalThreshold: 95
    },
    {
      location: CrowdLocation.CENTRAL_LIBRARY,
      maxCapacity: 300,
      warningThreshold: 85,
      criticalThreshold: 95
    },
    {
      location: CrowdLocation.MAIN_AUDITORIUM,
      maxCapacity: 500,
      warningThreshold: 90,
      criticalThreshold: 98
    }
  ];

  constructor() {
    this.influxService = new AttendanceDataService();
    this.cache = new RedisCache(getRedisClient());
  }

  // Calculate real-time occupancy for a specific location
  async calculateLocationOccupancy(location: CrowdLocation): Promise<LocationOccupancy> {
    try {
      // Get cached occupancy data first
      const cacheKey = `occupancy:${location}`;
      const cachedData = await this.cache.get<LocationOccupancy>(cacheKey);
      
      if (cachedData && this.isCacheValid(cachedData.lastUpdated)) {
        return cachedData;
      }

      // Get active devices for this location from cache
      const activeDevices = await this.getActiveDevicesForLocation(location);
      const currentOccupancy = activeDevices.length;
      
      // Get location capacity configuration
      const locationConfig = this.getLocationConfig(location);
      const occupancyRate = (currentOccupancy / locationConfig.maxCapacity) * 100;
      
      // Determine alert level
      const alertLevel = this.determineAlertLevel(occupancyRate, locationConfig);
      
      // Get 24h entry/exit counts
      const { entryCount, exitCount } = await this.get24hCounts(location);
      
      const occupancyData: LocationOccupancy = {
        location,
        currentOccupancy,
        maxCapacity: locationConfig.maxCapacity,
        occupancyRate,
        alertLevel,
        activeDevices,
        lastUpdated: new Date(),
        entryCount24h: entryCount,
        exitCount24h: exitCount
      };

      // Cache the result for 30 seconds
      await this.cache.set(cacheKey, occupancyData, 30);
      
      // Write to InfluxDB for historical data
      await this.influxService.writeCrowdData({
        location,
        occupancyCount: currentOccupancy,
        maxCapacity: locationConfig.maxCapacity,
        occupancyRate,
        alertLevel,
        activeDevices
      });

      return occupancyData;
    } catch (error) {
      console.error(`Error calculating occupancy for ${location}:`, error);
      throw error;
    }
  }

  // Get campus overview with all locations
  async getCampusOverview(): Promise<CampusOverview> {
    try {
      const cacheKey = 'campus:overview';
      const cachedOverview = await this.cache.get<CampusOverview>(cacheKey);
      
      if (cachedOverview && this.isCacheValid(cachedOverview.lastUpdated)) {
        return cachedOverview;
      }

      // Get occupancy for all locations
      const locationPromises = this.locationCapacities.map(config => 
        this.calculateLocationOccupancy(config.location)
      );
      
      const locationOccupancies = await Promise.all(locationPromises);
      
      // Calculate totals
      const totalOccupancy = locationOccupancies.reduce((sum, loc) => sum + loc.currentOccupancy, 0);
      const totalCapacity = locationOccupancies.reduce((sum, loc) => sum + loc.maxCapacity, 0);
      const activeAlerts = locationOccupancies.filter(loc => loc.alertLevel !== AlertLevel.NORMAL).length;
      const occupancyRate = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;

      const overview: CampusOverview = {
        totalLocations: this.locationCapacities.length,
        totalOccupancy,
        totalCapacity,
        activeAlerts,
        occupancyRate,
        lastUpdated: new Date()
      };

      // Cache for 1 minute
      await this.cache.set(cacheKey, overview, 60);
      
      return overview;
    } catch (error) {
      console.error('Error getting campus overview:', error);
      throw error;
    }
  }

  // Update device presence for crowd counting
  async updateDevicePresence(deviceId: string, userId: string, location: CrowdLocation, isPresent: boolean): Promise<void> {
    try {
      const locationKey = `location:${location}:devices`;
      const deviceKey = `device:${deviceId}:location`;
      
      if (isPresent) {
        // Add device to location set
        await this.cache.hSet(locationKey, deviceId, {
          userId,
          timestamp: new Date(),
          signalStrength: 0 // Will be updated by BLE processor
        });
        
        // Update device's current location
        await this.cache.set(deviceKey, location, 3600); // 1 hour expiry
      } else {
        // Remove device from location
        const client = getRedisClient();
        await client.hDel(locationKey, deviceId);
        await this.cache.del(deviceKey);
      }
      
      // Invalidate location occupancy cache
      await this.cache.del(`occupancy:${location}`);
      await this.cache.del('campus:overview');
      
    } catch (error) {
      console.error('Error updating device presence:', error);
      throw error;
    }
  }

  // Get active devices for a location
  private async getActiveDevicesForLocation(location: CrowdLocation): Promise<string[]> {
    try {
      const locationKey = `location:${location}:devices`;
      const deviceData = await this.cache.hGetAll(locationKey);
      
      // Filter out stale entries (older than 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const activeDevices: string[] = [];
      
      for (const [deviceId, data] of Object.entries(deviceData)) {
        if (data && typeof data === 'object' && 'timestamp' in data) {
          const timestamp = new Date(data.timestamp as string);
          if (timestamp > fiveMinutesAgo) {
            activeDevices.push(deviceId);
          }
        }
      }
      
      return activeDevices;
    } catch (error) {
      console.error(`Error getting active devices for ${location}:`, error);
      return [];
    }
  }

  // Get location configuration
  private getLocationConfig(location: CrowdLocation): LocationCapacity {
    const config = this.locationCapacities.find(c => c.location === location);
    if (!config) {
      throw new Error(`Location configuration not found for ${location}`);
    }
    return config;
  }

  // Determine alert level based on occupancy rate
  private determineAlertLevel(occupancyRate: number, config: LocationCapacity): AlertLevel {
    if (occupancyRate >= config.criticalThreshold) {
      return AlertLevel.CRITICAL;
    } else if (occupancyRate >= config.warningThreshold) {
      return AlertLevel.WARNING;
    }
    return AlertLevel.NORMAL;
  }

  // Check if cache is still valid (within 2 minutes)
  private isCacheValid(lastUpdated: Date): boolean {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    return new Date(lastUpdated) > twoMinutesAgo;
  }

  // Get 24-hour entry/exit counts for a location
  private async get24hCounts(location: CrowdLocation): Promise<{ entryCount: number; exitCount: number }> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const attendanceData = await this.influxService.getAttendanceData(startTime, endTime, { location });
      
      let entryCount = 0;
      let exitCount = 0;
      
      attendanceData.forEach((record: any) => {
        if (record.eventType === 'entry') entryCount++;
        if (record.eventType === 'exit') exitCount++;
      });
      
      return { entryCount, exitCount };
    } catch (error) {
      console.error(`Error getting 24h counts for ${location}:`, error);
      return { entryCount: 0, exitCount: 0 };
    }
  }

  // Get crowd alerts for all locations
  async getCrowdAlerts(): Promise<CrowdAlert[]> {
    try {
      const alerts: CrowdAlert[] = [];
      
      for (const config of this.locationCapacities) {
        const occupancy = await this.calculateLocationOccupancy(config.location);
        
        if (occupancy.alertLevel !== AlertLevel.NORMAL) {
          const alert: CrowdAlert = {
            id: `${config.location}-${Date.now()}`,
            location: config.location,
            alertLevel: occupancy.alertLevel,
            message: this.generateAlertMessage(occupancy),
            occupancyCount: occupancy.currentOccupancy,
            maxCapacity: occupancy.maxCapacity,
            timestamp: new Date(),
            isActive: true
          };
          
          alerts.push(alert);
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Error getting crowd alerts:', error);
      return [];
    }
  }

  // Generate alert message
  private generateAlertMessage(occupancy: LocationOccupancy): string {
    const locationName = occupancy.location.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const rate = Math.round(occupancy.occupancyRate);
    
    if (occupancy.alertLevel === AlertLevel.CRITICAL) {
      return `CRITICAL: ${locationName} is at ${rate}% capacity (${occupancy.currentOccupancy}/${occupancy.maxCapacity}). Immediate action required.`;
    } else if (occupancy.alertLevel === AlertLevel.WARNING) {
      return `WARNING: ${locationName} is at ${rate}% capacity (${occupancy.currentOccupancy}/${occupancy.maxCapacity}). Monitor closely.`;
    }
    
    return '';
  }

  // Get historical crowd data for a location
  async getHistoricalCrowdData(
    location: CrowdLocation, 
    startTime: Date, 
    endTime: Date
  ): Promise<any[]> {
    try {
      return await this.influxService.getCrowdData(location, startTime, endTime);
    } catch (error) {
      console.error(`Error getting historical crowd data for ${location}:`, error);
      return [];
    }
  }

  // Get crowd patterns analysis
  async getCrowdPatterns(location: CrowdLocation, days: number = 7): Promise<any> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);
      
      const crowdData = await this.getHistoricalCrowdData(location, startTime, endTime);
      
      // Analyze patterns by hour of day
      const hourlyPatterns: { [hour: number]: { count: number; avgOccupancy: number } } = {};
      
      crowdData.forEach((record: any) => {
        const hour = new Date(record._time).getHours();
        if (!hourlyPatterns[hour]) {
          hourlyPatterns[hour] = { count: 0, avgOccupancy: 0 };
        }
        hourlyPatterns[hour].count++;
        hourlyPatterns[hour].avgOccupancy += record._value || 0;
      });
      
      // Calculate averages
      Object.keys(hourlyPatterns).forEach(hour => {
        const h = parseInt(hour);
        if (hourlyPatterns[h].count > 0) {
          hourlyPatterns[h].avgOccupancy = hourlyPatterns[h].avgOccupancy / hourlyPatterns[h].count;
        }
      });
      
      return {
        location,
        analysisPeriod: { startTime, endTime, days },
        hourlyPatterns,
        peakHour: this.findPeakHour(hourlyPatterns),
        averageOccupancy: this.calculateAverageOccupancy(crowdData)
      };
    } catch (error) {
      console.error(`Error analyzing crowd patterns for ${location}:`, error);
      return null;
    }
  }

  // Find peak hour from patterns
  private findPeakHour(patterns: { [hour: number]: { count: number; avgOccupancy: number } }): number {
    let peakHour = 0;
    let maxOccupancy = 0;
    
    Object.entries(patterns).forEach(([hour, data]) => {
      if (data.avgOccupancy > maxOccupancy) {
        maxOccupancy = data.avgOccupancy;
        peakHour = parseInt(hour);
      }
    });
    
    return peakHour;
  }

  // Calculate average occupancy from crowd data
  private calculateAverageOccupancy(crowdData: any[]): number {
    if (crowdData.length === 0) return 0;
    
    const total = crowdData.reduce((sum, record) => sum + (record._value || 0), 0);
    return total / crowdData.length;
  }
}