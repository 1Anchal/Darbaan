import { AlertLevel, CrowdLocation } from '../types';

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

export interface CampusOverview {
  totalLocations: number;
  totalOccupancy: number;
  totalCapacity: number;
  activeAlerts: number;
  occupancyRate: number;
  lastUpdated: Date;
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

export interface HistoricalDataPoint {
  timestamp: Date;
  occupancyCount: number;
  occupancyRate: number;
  alertLevel: AlertLevel;
}

export interface CrowdPatterns {
  location: CrowdLocation;
  analysisPeriod: {
    startTime: Date;
    endTime: Date;
    days: number;
  };
  hourlyPatterns: {
    [hour: number]: {
      count: number;
      avgOccupancy: number;
    };
  };
  peakHour: number;
  averageOccupancy: number;
}

export interface RealTimeCrowdData {
  overview: CampusOverview;
  locations: LocationOccupancy[];
  timestamp: Date;
}

class CrowdMonitoringService {
  private baseUrl = '/api/crowd-monitoring';

  // Get campus overview
  async getCampusOverview(): Promise<CampusOverview> {
    try {
      const response = await fetch(`${this.baseUrl}/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get campus overview');
      }

      return {
        ...result.data,
        lastUpdated: new Date(result.data.lastUpdated)
      };
    } catch (error) {
      console.error('Error getting campus overview:', error);
      throw error;
    }
  }

  // Get occupancy for a specific location
  async getLocationOccupancy(location: CrowdLocation): Promise<LocationOccupancy> {
    try {
      const response = await fetch(`${this.baseUrl}/location/${location}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get location occupancy');
      }

      return {
        ...result.data,
        lastUpdated: new Date(result.data.lastUpdated)
      };
    } catch (error) {
      console.error(`Error getting occupancy for ${location}:`, error);
      throw error;
    }
  }

  // Get occupancy for all locations
  async getAllLocationOccupancies(): Promise<LocationOccupancy[]> {
    try {
      const response = await fetch(`${this.baseUrl}/locations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get location occupancies');
      }

      return result.data.map((location: any) => ({
        ...location,
        lastUpdated: new Date(location.lastUpdated)
      }));
    } catch (error) {
      console.error('Error getting all location occupancies:', error);
      throw error;
    }
  }

  // Get crowd alerts
  async getCrowdAlerts(): Promise<CrowdAlert[]> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get crowd alerts');
      }

      return result.data.map((alert: any) => ({
        ...alert,
        timestamp: new Date(alert.timestamp)
      }));
    } catch (error) {
      console.error('Error getting crowd alerts:', error);
      throw error;
    }
  }

  // Get historical crowd data for a location
  async getHistoricalData(
    location: CrowdLocation,
    startDate?: Date,
    endDate?: Date
  ): Promise<HistoricalDataPoint[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await fetch(`${this.baseUrl}/location/${location}/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get historical data');
      }

      return result.data.records.map((record: any) => ({
        timestamp: new Date(record._time),
        occupancyCount: record._value || 0,
        occupancyRate: record.occupancyRate || 0,
        alertLevel: record.alertLevel || AlertLevel.NORMAL
      }));
    } catch (error) {
      console.error(`Error getting historical data for ${location}:`, error);
      throw error;
    }
  }

  // Get crowd patterns for a location
  async getCrowdPatterns(location: CrowdLocation, days: number = 7): Promise<CrowdPatterns> {
    try {
      const response = await fetch(`${this.baseUrl}/location/${location}/patterns?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get crowd patterns');
      }

      return {
        ...result.data,
        analysisPeriod: {
          ...result.data.analysisPeriod,
          startTime: new Date(result.data.analysisPeriod.startTime),
          endTime: new Date(result.data.analysisPeriod.endTime)
        }
      };
    } catch (error) {
      console.error(`Error getting crowd patterns for ${location}:`, error);
      throw error;
    }
  }

  // Get real-time crowd data (all locations + overview)
  async getRealTimeData(): Promise<RealTimeCrowdData> {
    try {
      const response = await fetch(`${this.baseUrl}/realtime`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get real-time data');
      }

      return {
        overview: {
          ...result.data.overview,
          lastUpdated: new Date(result.data.overview.lastUpdated)
        },
        locations: result.data.locations.map((location: any) => ({
          ...location,
          lastUpdated: new Date(location.lastUpdated)
        })),
        timestamp: new Date(result.data.timestamp)
      };
    } catch (error) {
      console.error('Error getting real-time crowd data:', error);
      throw error;
    }
  }

  // Utility function to format location names for display
  formatLocationName(location: CrowdLocation): string {
    return location
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Get alert level color for UI
  getAlertLevelColor(alertLevel: AlertLevel): string {
    switch (alertLevel) {
      case AlertLevel.NORMAL:
        return '#4caf50'; // Green
      case AlertLevel.WARNING:
        return '#ff9800'; // Orange
      case AlertLevel.CRITICAL:
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Gray
    }
  }

  // Get occupancy rate color based on percentage
  getOccupancyRateColor(rate: number): string {
    if (rate < 60) return '#4caf50'; // Green
    if (rate < 80) return '#2196f3'; // Blue
    if (rate < 95) return '#ff9800'; // Orange
    return '#f44336'; // Red
  }
}

export default new CrowdMonitoringService();