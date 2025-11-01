import { EventEmitter } from 'events';
import { BLEBeacon } from '../types';
import { bleDataProcessor } from './bleDataProcessor';
import { hardwareMonitorService } from './hardwareMonitorService';
import { retryBLEOperation } from './retryService';

export interface ScanConfiguration {
  location: string;
  scanDuration: number; // milliseconds
  scanInterval: number; // milliseconds
  rssiThreshold: number; // minimum RSSI to consider
  maxDevicesPerScan: number;
}

export interface ScanResult {
  location: string;
  devicesFound: number;
  scanDuration: number;
  timestamp: Date;
  devices: BLEBeacon[];
}

export interface ScannerStatus {
  isScanning: boolean;
  activeLocations: string[];
  totalScansCompleted: number;
  lastScanTime?: Date;
  averageScanDuration: number;
  errorsCount: number;
}

export class BLEScannerService extends EventEmitter {
  private activeScans: Map<string, NodeJS.Timeout> = new Map();
  private scanConfigurations: Map<string, ScanConfiguration> = new Map();
  private scanStats: Map<string, { count: number; totalDuration: number; errors: number }> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.initializeDefaultConfigurations();
  }

  /**
   * Initialize the BLE scanner service
   */
  async initialize(): Promise<void> {
    try {
      // Check if hardware monitoring is available
      if (!hardwareMonitorService.getLastMetrics()) {
        hardwareMonitorService.startMonitoring(5000);
      }

      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.emit('scannerInitialized');
    } catch (error) {
      this.emit('initializationError', error);
      throw error;
    }
  }

  /**
   * Start scanning for a specific location
   */
  async startLocationScan(location: string, config?: Partial<ScanConfiguration>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Scanner service not initialized');
    }

    if (this.activeScans.has(location)) {
      throw new Error(`Scanning already active for location: ${location}`);
    }

    // Check if system is optimal for scanning
    if (!hardwareMonitorService.isOptimalForBLE()) {
      const recommendations = hardwareMonitorService.getOptimizationRecommendations();
      this.emit('suboptimalConditions', { location, recommendations });
    }

    // Merge with default configuration
    const scanConfig: ScanConfiguration = {
      ...this.getDefaultConfiguration(location),
      ...config
    };

    this.scanConfigurations.set(location, scanConfig);
    this.initializeScanStats(location);

    // Start periodic scanning
    const scanInterval = setInterval(async () => {
      try {
        await this.performScan(location, scanConfig);
      } catch (error) {
        this.handleScanError(location, error);
      }
    }, scanConfig.scanInterval);

    this.activeScans.set(location, scanInterval);
    this.emit('scanStarted', { location, config: scanConfig });
  }

  /**
   * Stop scanning for a specific location
   */
  stopLocationScan(location: string): void {
    const scanInterval = this.activeScans.get(location);
    if (scanInterval) {
      clearInterval(scanInterval);
      this.activeScans.delete(location);
      this.scanConfigurations.delete(location);
      this.emit('scanStopped', { location });
    }
  }

  /**
   * Stop all active scans
   */
  stopAllScans(): void {
    this.activeScans.forEach((interval, location) => {
      clearInterval(interval);
      this.emit('scanStopped', { location });
    });
    
    this.activeScans.clear();
    this.scanConfigurations.clear();
    this.emit('allScansStopped');
  }

  /**
   * Update scan configuration for a location
   */
  updateScanConfiguration(location: string, config: Partial<ScanConfiguration>): void {
    const currentConfig = this.scanConfigurations.get(location);
    if (currentConfig) {
      const updatedConfig = { ...currentConfig, ...config };
      this.scanConfigurations.set(location, updatedConfig);
      this.emit('configurationUpdated', { location, config: updatedConfig });
    }
  }

  /**
   * Get scanner status
   */
  getScannerStatus(): ScannerStatus {
    const stats = Array.from(this.scanStats.values());
    const totalScans = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalDuration = stats.reduce((sum, stat) => sum + stat.totalDuration, 0);
    const totalErrors = stats.reduce((sum, stat) => sum + stat.errors, 0);

    return {
      isScanning: this.activeScans.size > 0,
      activeLocations: Array.from(this.activeScans.keys()),
      totalScansCompleted: totalScans,
      lastScanTime: this.getLastScanTime(),
      averageScanDuration: totalScans > 0 ? totalDuration / totalScans : 0,
      errorsCount: totalErrors
    };
  }

  /**
   * Get scan statistics for a specific location
   */
  getLocationStats(location: string) {
    const stats = this.scanStats.get(location);
    const config = this.scanConfigurations.get(location);
    
    return {
      location,
      isActive: this.activeScans.has(location),
      configuration: config,
      statistics: stats || { count: 0, totalDuration: 0, errors: 0 }
    };
  }

  /**
   * Perform a manual scan for testing
   */
  async performManualScan(location: string, duration: number = 5000): Promise<ScanResult> {
    const config: ScanConfiguration = {
      location,
      scanDuration: duration,
      scanInterval: 0, // Not used for manual scan
      rssiThreshold: -90,
      maxDevicesPerScan: 50
    };

    return await this.performScan(location, config);
  }

  private async performScan(location: string, config: ScanConfiguration): Promise<ScanResult> {
    const startTime = Date.now();
    
    try {
      this.emit('scanStarting', { location, config });
      
      // Use retry mechanism for BLE scanning
      const scanResult = await retryBLEOperation(
        () => this.simulateBLEScan(location, config),
        `BLE_SCAN_${location}`
      );
      
      if (!scanResult.success) {
        throw scanResult.error || new Error('BLE scan failed after retries');
      }
      
      const devices = scanResult.result!;
      const scanDuration = Date.now() - startTime;
      
      // Process each detected device with retry logic
      for (const device of devices) {
        try {
          const processResult = await retryBLEOperation(
            () => bleDataProcessor.processBLEBeacon(device),
            `BLE_PROCESS_${device.deviceId}`
          );
          
          if (!processResult.success) {
            this.emit('deviceProcessingError', { 
              device, 
              error: processResult.error,
              attempts: processResult.attempts 
            });
          }
        } catch (error) {
          this.emit('deviceProcessingError', { device, error });
        }
      }

      const result: ScanResult = {
        location,
        devicesFound: devices.length,
        scanDuration,
        timestamp: new Date(),
        devices
      };

      // Update statistics
      this.updateScanStats(location, scanDuration, false);
      
      this.emit('scanCompleted', result);
      return result;
      
    } catch (error) {
      const scanDuration = Date.now() - startTime;
      this.updateScanStats(location, scanDuration, true);
      this.emit('scanError', { location, error, duration: scanDuration });
      throw error;
    }
  }

  private async simulateBLEScan(location: string, config: ScanConfiguration): Promise<BLEBeacon[]> {
    // Simulate BLE device discovery
    // In real implementation, this would use noble.js or similar BLE library
    
    const devices: BLEBeacon[] = [];
    const deviceCount = Math.floor(Math.random() * config.maxDevicesPerScan);
    
    for (let i = 0; i < deviceCount; i++) {
      const rssi = Math.floor(Math.random() * 60) - 100; // -100 to -40 dBm
      
      if (rssi >= config.rssiThreshold) {
        devices.push({
          deviceId: `device_${i}_${Date.now()}`,
          macAddress: this.generateRandomMacAddress(),
          rssi,
          timestamp: new Date(),
          location
        });
      }
    }

    // Simulate scan duration
    await new Promise(resolve => setTimeout(resolve, Math.min(config.scanDuration, 1000)));
    
    return devices;
  }

  private generateRandomMacAddress(): string {
    const hexChars = '0123456789ABCDEF';
    let mac = '';
    
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':';
      mac += hexChars[Math.floor(Math.random() * 16)];
      mac += hexChars[Math.floor(Math.random() * 16)];
    }
    
    return mac;
  }

  private initializeDefaultConfigurations(): void {
    const locations = ['food-street', 'rock-plaza', 'central-library', 'main-auditorium'];
    
    locations.forEach(location => {
      this.scanConfigurations.set(location, this.getDefaultConfiguration(location));
    });
  }

  private getDefaultConfiguration(location: string): ScanConfiguration {
    // Different configurations based on location characteristics
    const baseConfig = {
      location,
      scanDuration: 5000, // 5 seconds
      scanInterval: 10000, // 10 seconds
      rssiThreshold: -85, // dBm
      maxDevicesPerScan: 30
    };

    // Adjust based on location
    switch (location) {
      case 'food-street':
        return { ...baseConfig, maxDevicesPerScan: 50, scanInterval: 8000 }; // High traffic area
      case 'central-library':
        return { ...baseConfig, maxDevicesPerScan: 20, scanInterval: 15000 }; // Quieter area
      case 'main-auditorium':
        return { ...baseConfig, maxDevicesPerScan: 100, scanInterval: 5000 }; // Large capacity
      default:
        return baseConfig;
    }
  }

  private setupEventListeners(): void {
    // Listen to hardware monitoring events
    hardwareMonitorService.on('thresholdAlert', (data) => {
      this.emit('hardwareAlert', data);
      
      // Reduce scan frequency if system is under stress
      if (data.alerts.some((alert: string) => alert.includes('Critical'))) {
        this.reduceScanFrequency();
      }
    });

    // Listen to BLE data processor events
    bleDataProcessor.on('processingError', (data) => {
      this.emit('dataProcessingError', data);
    });

    bleDataProcessor.on('entryExitDetected', (event) => {
      this.emit('entryExitDetected', event);
    });
  }

  private reduceScanFrequency(): void {
    this.scanConfigurations.forEach((config, location) => {
      const reducedConfig = {
        ...config,
        scanInterval: Math.min(config.scanInterval * 1.5, 30000), // Increase interval, max 30s
        maxDevicesPerScan: Math.max(config.maxDevicesPerScan * 0.7, 10) // Reduce max devices
      };
      
      this.scanConfigurations.set(location, reducedConfig);
    });
    
    this.emit('scanFrequencyReduced');
  }

  private initializeScanStats(location: string): void {
    if (!this.scanStats.has(location)) {
      this.scanStats.set(location, { count: 0, totalDuration: 0, errors: 0 });
    }
  }

  private updateScanStats(location: string, duration: number, isError: boolean): void {
    const stats = this.scanStats.get(location);
    if (stats) {
      stats.count++;
      stats.totalDuration += duration;
      if (isError) stats.errors++;
    }
  }

  private handleScanError(location: string, error: any): void {
    this.emit('scanError', { location, error });
    
    // If too many errors, temporarily stop scanning for this location
    const stats = this.scanStats.get(location);
    if (stats && stats.errors > 10) {
      this.stopLocationScan(location);
      this.emit('locationScanDisabled', { location, reason: 'too_many_errors' });
    }
  }

  private getLastScanTime(): Date | undefined {
    // This would track the actual last scan time in a real implementation
    return this.activeScans.size > 0 ? new Date() : undefined;
  }
}

export const bleScannerService = new BLEScannerService();