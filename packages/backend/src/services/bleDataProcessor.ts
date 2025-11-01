import { getRedisClient } from '@/config';
import { EventEmitter } from 'events';
import { BLEBeacon, BLEDevice, CrowdLocation } from '../types';
import { bleRegistryService } from './bleRegistryService';
import { CrowdMonitoringService } from './crowdMonitoringService';

export interface EntryExitEvent {
  deviceId: string;
  userId: string;
  location: string;
  eventType: 'entry' | 'exit';
  timestamp: Date;
  confidence: number;
  previousLocation?: string;
}

export interface ProcessedBLEData {
  deviceId: string;
  macAddress: string;
  userId: string;
  location: string;
  timestamp: Date;
  signalStrength: number;
  eventType: 'entry' | 'exit' | 'presence' | 'heartbeat';
  confidence: number; // 0-1 confidence score
  batteryLevel?: number;
}

export interface EntryExitEvent {
  deviceId: string;
  userId: string;
  location: string;
  eventType: 'entry' | 'exit';
  timestamp: Date;
  confidence: number;
  previousLocation?: string;
}

export interface SignalAnalysis {
  rssi: number;
  distance: number; // estimated distance in meters
  stability: number; // signal stability score 0-1
  trend: 'approaching' | 'stable' | 'departing';
}

export interface DuplicationFilter {
  deviceId: string;
  location: string;
  lastEventTime: Date;
  eventType: 'entry' | 'exit';
}

export class BLEDataProcessor extends EventEmitter {
  private deviceHistory: Map<string, ProcessedBLEData[]> = new Map();
  private locationPresence: Map<string, Set<string>> = new Map(); // location -> device IDs
  private duplicationFilters: Map<string, DuplicationFilter> = new Map();
  private signalHistory: Map<string, number[]> = new Map(); // device -> RSSI history
  private crowdMonitoringService: CrowdMonitoringService;
  
  private readonly SIGNAL_HISTORY_SIZE = 10;
  private readonly ENTRY_THRESHOLD = -70; // dBm
  private readonly EXIT_THRESHOLD = -85; // dBm
  private readonly DUPLICATE_WINDOW = 30000; // 30 seconds
  private readonly MIN_CONFIDENCE = 0.6;
  private readonly STABILITY_WINDOW = 5; // number of readings for stability calculation

  constructor() {
    super();
    
    // Initialize crowd monitoring service
    this.crowdMonitoringService = new CrowdMonitoringService();
    
    // Initialize location presence tracking
    this.initializeLocationTracking();
    
    // Cleanup old data periodically
    setInterval(() => this.cleanupOldData(), 60000); // Every minute
  }

  /**
   * Process incoming BLE beacon data
   */
  async processBLEBeacon(beacon: BLEBeacon): Promise<ProcessedBLEData | null> {
    try {
      // Get device information
      const device = await bleRegistryService.getDeviceByMacAddress(beacon.macAddress);
      if (!device || !device.isActive) {
        return null;
      }

      // Analyze signal strength and determine event type
      const signalAnalysis = this.analyzeSignalStrength(beacon.deviceId, beacon.rssi);
      const eventType = this.determineEventType(beacon.deviceId, beacon.location, signalAnalysis);
      
      // Calculate confidence based on signal analysis
      const confidence = this.calculateConfidence(signalAnalysis, device);
      
      // Skip processing if confidence is too low
      if (confidence < this.MIN_CONFIDENCE) {
        this.emit('lowConfidenceReading', { beacon, confidence });
        return null;
      }

      // Check for duplicates
      if (this.isDuplicateEvent(device.id, beacon.location, eventType)) {
        this.emit('duplicateEventFiltered', { deviceId: device.id, location: beacon.location, eventType });
        return null;
      }

      const processedData: ProcessedBLEData = {
        deviceId: device.id,
        macAddress: beacon.macAddress,
        userId: device.userId,
        location: beacon.location,
        timestamp: beacon.timestamp,
        signalStrength: beacon.rssi,
        eventType,
        confidence,
        batteryLevel: device.batteryLevel
      };

      // Store processed data
      await this.storeProcessedData(processedData);
      
      // Update device history
      this.updateDeviceHistory(device.id, processedData);
      
      // Update location presence
      this.updateLocationPresence(beacon.location, device.id, eventType);
      
      // Update duplication filter
      this.updateDuplicationFilter(device.id, beacon.location, eventType);
      
      // Emit events based on type
      if (eventType === 'entry' || eventType === 'exit') {
        const entryExitEvent: EntryExitEvent = {
          deviceId: device.id,
          userId: device.userId,
          location: beacon.location,
          eventType,
          timestamp: beacon.timestamp,
          confidence,
          previousLocation: this.getPreviousLocation(device.id)
        };
        
        this.emit('entryExitDetected', entryExitEvent);
        
        // Update crowd monitoring system
        await this.updateCrowdMonitoring(entryExitEvent);
      }

      this.emit('dataProcessed', processedData);
      return processedData;
      
    } catch (error) {
      this.emit('processingError', { beacon, error });
      throw error;
    }
  }

  /**
   * Get current presence for a location
   */
  getLocationPresence(location: string): string[] {
    const presence = this.locationPresence.get(location);
    return presence ? Array.from(presence) : [];
  }

  /**
   * Get device history
   */
  getDeviceHistory(deviceId: string, limit: number = 50): ProcessedBLEData[] {
    const history = this.deviceHistory.get(deviceId) || [];
    return history.slice(-limit);
  }

  /**
   * Get signal analysis for a device
   */
  getSignalAnalysis(deviceId: string, rssi: number): SignalAnalysis {
    return this.analyzeSignalStrength(deviceId, rssi);
  }

  /**
   * Clear all processing data
   */
  clearProcessingData(): void {
    this.deviceHistory.clear();
    this.locationPresence.clear();
    this.duplicationFilters.clear();
    this.signalHistory.clear();
    this.initializeLocationTracking();
    this.emit('dataCleared');
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return {
      devicesTracked: this.deviceHistory.size,
      locationsMonitored: this.locationPresence.size,
      totalPresence: Array.from(this.locationPresence.values())
        .reduce((total, devices) => total + devices.size, 0),
      duplicationFilters: this.duplicationFilters.size,
      signalHistoryEntries: this.signalHistory.size
    };
  }

  private analyzeSignalStrength(deviceId: string, rssi: number): SignalAnalysis {
    // Update signal history
    let history = this.signalHistory.get(deviceId) || [];
    history.push(rssi);
    
    if (history.length > this.SIGNAL_HISTORY_SIZE) {
      history = history.slice(-this.SIGNAL_HISTORY_SIZE);
    }
    
    this.signalHistory.set(deviceId, history);

    // Calculate distance (rough estimation)
    const distance = this.calculateDistance(rssi);
    
    // Calculate stability
    const stability = this.calculateStability(history);
    
    // Determine trend
    const trend = this.calculateTrend(history);

    return {
      rssi,
      distance,
      stability,
      trend
    };
  }

  private calculateDistance(rssi: number): number {
    // Simplified distance calculation using RSSI
    // Distance = 10^((Tx Power - RSSI) / (10 * n))
    // Assuming Tx Power = -59 dBm at 1m, n = 2 (free space)
    const txPower = -59;
    const pathLoss = 2;
    
    if (rssi === 0) return -1;
    
    const ratio = (txPower - rssi) / (10 * pathLoss);
    return Math.pow(10, ratio);
  }

  private calculateStability(history: number[]): number {
    if (history.length < 2) return 0;
    
    // Calculate standard deviation
    const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
    const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to stability score (lower std dev = higher stability)
    // Normalize to 0-1 range
    return Math.max(0, 1 - (stdDev / 20)); // Assuming max std dev of 20 dBm
  }

  private calculateTrend(history: number[]): 'approaching' | 'stable' | 'departing' {
    if (history.length < this.STABILITY_WINDOW) return 'stable';
    
    const recentHistory = history.slice(-this.STABILITY_WINDOW);
    const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
    const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 3) return 'approaching'; // Signal getting stronger
    if (difference < -3) return 'departing'; // Signal getting weaker
    return 'stable';
  }

  private determineEventType(deviceId: string, location: string, analysis: SignalAnalysis): 'entry' | 'exit' | 'presence' | 'heartbeat' {
    const isCurrentlyPresent = this.locationPresence.get(location)?.has(deviceId) || false;
    
    // Strong signal and not currently present = entry
    if (analysis.rssi > this.ENTRY_THRESHOLD && !isCurrentlyPresent && analysis.trend === 'approaching') {
      return 'entry';
    }
    
    // Weak signal and currently present = exit
    if (analysis.rssi < this.EXIT_THRESHOLD && isCurrentlyPresent && analysis.trend === 'departing') {
      return 'exit';
    }
    
    // Currently present with good signal = presence confirmation
    if (isCurrentlyPresent && analysis.rssi > this.EXIT_THRESHOLD) {
      return 'presence';
    }
    
    // Default to heartbeat for regular updates
    return 'heartbeat';
  }

  private calculateConfidence(analysis: SignalAnalysis, device: BLEDevice): number {
    let confidence = 0.5; // Base confidence
    
    // Signal strength factor
    if (analysis.rssi > -60) confidence += 0.3;
    else if (analysis.rssi > -70) confidence += 0.2;
    else if (analysis.rssi > -80) confidence += 0.1;
    
    // Stability factor
    confidence += analysis.stability * 0.2;
    
    // Device type factor
    if (device.deviceType === 'beacon') confidence += 0.1;
    
    // Battery level factor (if available)
    if (device.batteryLevel && device.batteryLevel > 20) {
      confidence += 0.1;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }

  private isDuplicateEvent(deviceId: string, location: string, eventType: 'entry' | 'exit' | 'presence' | 'heartbeat'): boolean {
    if (eventType === 'presence' || eventType === 'heartbeat') {
      return false; // These events are allowed to repeat
    }
    
    const filterKey = `${deviceId}-${location}`;
    const filter = this.duplicationFilters.get(filterKey);
    
    if (!filter) return false;
    
    const timeDiff = Date.now() - filter.lastEventTime.getTime();
    return filter.eventType === eventType && timeDiff < this.DUPLICATE_WINDOW;
  }

  private updateDuplicationFilter(deviceId: string, location: string, eventType: 'entry' | 'exit' | 'presence' | 'heartbeat'): void {
    if (eventType === 'entry' || eventType === 'exit') {
      const filterKey = `${deviceId}-${location}`;
      this.duplicationFilters.set(filterKey, {
        deviceId,
        location,
        lastEventTime: new Date(),
        eventType
      });
    }
  }

  private updateDeviceHistory(deviceId: string, data: ProcessedBLEData): void {
    let history = this.deviceHistory.get(deviceId) || [];
    history.push(data);
    
    // Keep only last 100 entries per device
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    this.deviceHistory.set(deviceId, history);
  }

  private updateLocationPresence(location: string, deviceId: string, eventType: 'entry' | 'exit' | 'presence' | 'heartbeat'): void {
    let presence = this.locationPresence.get(location) || new Set();
    
    if (eventType === 'entry' || eventType === 'presence') {
      presence.add(deviceId);
    } else if (eventType === 'exit') {
      presence.delete(deviceId);
    }
    
    this.locationPresence.set(location, presence);
  }

  private getPreviousLocation(deviceId: string): string | undefined {
    const history = this.deviceHistory.get(deviceId) || [];
    
    // Find the last entry event before the current one
    for (let i = history.length - 2; i >= 0; i--) {
      if (history[i].eventType === 'entry') {
        return history[i].location;
      }
    }
    
    return undefined;
  }

  private async storeProcessedData(data: ProcessedBLEData): Promise<void> {
    try {
      const redisClient = getRedisClient();
      
      // Store in Redis for real-time access
      const key = `ble:processed:${data.deviceId}:${Date.now()}`;
      await redisClient.setEx(key, 3600, JSON.stringify(data)); // Store for 1 hour
      
      // Store recent data for quick access
      const recentKey = `ble:recent:${data.deviceId}`;
      await redisClient.lPush(recentKey, JSON.stringify(data));
      await redisClient.lTrim(recentKey, 0, 99); // Keep last 100 entries
      await redisClient.expire(recentKey, 3600);
      
    } catch (error) {
      this.emit('storageError', { data, error });
    }
  }

  private async updateCrowdMonitoring(event: EntryExitEvent): Promise<void> {
    try {
      // Check if location is a valid crowd monitoring location
      const crowdLocations = Object.values(CrowdLocation);
      if (!crowdLocations.includes(event.location as CrowdLocation)) {
        return; // Not a monitored crowd location
      }

      const isPresent = event.eventType === 'entry';
      
      // Update device presence in crowd monitoring system
      await this.crowdMonitoringService.updateDevicePresence(
        event.deviceId,
        event.userId,
        event.location as CrowdLocation,
        isPresent
      );

      this.emit('crowdMonitoringUpdated', {
        location: event.location,
        deviceId: event.deviceId,
        userId: event.userId,
        isPresent,
        timestamp: event.timestamp
      });

    } catch (error) {
      this.emit('crowdMonitoringError', { event, error });
      console.error('Error updating crowd monitoring:', error);
    }
  }

  private initializeLocationTracking(): void {
    // Initialize tracking for known locations
    const locations = ['food-street', 'rock-plaza', 'central-library', 'main-auditorium'];
    locations.forEach(location => {
      this.locationPresence.set(location, new Set());
    });
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Cleanup device history
    this.deviceHistory.forEach((history, deviceId) => {
      const filteredHistory = history.filter(data => 
        now - data.timestamp.getTime() < maxAge
      );
      
      if (filteredHistory.length === 0) {
        this.deviceHistory.delete(deviceId);
      } else {
        this.deviceHistory.set(deviceId, filteredHistory);
      }
    });
    
    // Cleanup duplication filters
    this.duplicationFilters.forEach((filter, key) => {
      if (now - filter.lastEventTime.getTime() > this.DUPLICATE_WINDOW * 2) {
        this.duplicationFilters.delete(key);
      }
    });
    
    this.emit('dataCleanedUp', {
      devicesTracked: this.deviceHistory.size,
      filtersActive: this.duplicationFilters.size
    });
  }
}

export const bleDataProcessor = new BLEDataProcessor();