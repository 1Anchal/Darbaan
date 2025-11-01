import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { BLEDevice, DeviceType } from '../types';
import { bleDeviceService } from './bleDeviceService';

const prisma = new PrismaClient();

export interface RaspberryPiStatus {
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  diskUsage: number;
  uptime: number;
  bleAdapterStatus: boolean;
}

export interface BLERegistryConfig {
  maxConcurrentScans: number;
  scanInterval: number; // milliseconds
  deviceTimeout: number; // milliseconds
  memoryThreshold: number; // percentage
  cpuThreshold: number; // percentage
}

export interface DeviceRegistration {
  macAddress: string;
  userId: string;
  deviceName: string;
  deviceType: DeviceType;
  registrationTime: Date;
  lastHeartbeat?: Date;
}

export class BLERegistryService extends EventEmitter {
  private activeScans: Map<string, NodeJS.Timeout> = new Map();
  private deviceCache: Map<string, BLEDevice> = new Map();
  private registrationQueue: DeviceRegistration[] = [];
  private isProcessingQueue = false;
  private config: BLERegistryConfig;
  private hardwareStatus: RaspberryPiStatus | null = null;

  constructor(config?: Partial<BLERegistryConfig>) {
    super();
    this.config = {
      maxConcurrentScans: 10, // Optimized for Raspberry Pi 4GB RAM
      scanInterval: 5000, // 5 seconds
      deviceTimeout: 30000, // 30 seconds
      memoryThreshold: 80, // 80% memory usage threshold
      cpuThreshold: 70, // 70% CPU usage threshold
      ...config
    };

    // Initialize hardware monitoring
    this.startHardwareMonitoring();
    
    // Process registration queue periodically
    setInterval(() => this.processRegistrationQueue(), 2000);
  }

  /**
   * Register a new BLE device with Raspberry Pi optimizations
   */
  async registerDevice(registration: DeviceRegistration): Promise<string> {
    try {
      // Check if device already exists
      const existingDevice = await bleDeviceService.getDeviceByMacAddress(registration.macAddress);
      if (existingDevice) {
        // Update existing device
        await bleDeviceService.updateDeviceLastSeen(existingDevice.id);
        this.deviceCache.set(registration.macAddress, existingDevice);
        return existingDevice.id;
      }

      // Add to registration queue if system is under load
      if (this.isSystemUnderLoad()) {
        this.registrationQueue.push(registration);
        this.emit('deviceQueued', registration);
        return 'queued';
      }

      // Create new device
      const device = await bleDeviceService.createDevice({
        userId: registration.userId,
        macAddress: registration.macAddress,
        deviceName: registration.deviceName,
        deviceType: registration.deviceType
      });

      // Cache the device for quick access
      this.deviceCache.set(registration.macAddress, device);
      this.emit('deviceRegistered', device);

      return device.id;
    } catch (error) {
      this.emit('registrationError', { registration, error });
      throw error;
    }
  }

  /**
   * Get device by MAC address with caching
   */
  async getDeviceByMacAddress(macAddress: string): Promise<BLEDevice | null> {
    // Check cache first
    if (this.deviceCache.has(macAddress)) {
      return this.deviceCache.get(macAddress)!;
    }

    // Fetch from database
    const device = await bleDeviceService.getDeviceByMacAddress(macAddress);
    if (device) {
      this.deviceCache.set(macAddress, device);
    }

    return device;
  }

  /**
   * Update device status with hardware-aware throttling
   */
  async updateDeviceStatus(deviceId: string, isActive: boolean, batteryLevel?: number, signalStrength?: number): Promise<void> {
    try {
      // Throttle updates if system is under load
      if (this.isSystemUnderLoad()) {
        // Cache the update for later processing
        const cachedDevice = Array.from(this.deviceCache.values()).find(d => d.id === deviceId);
        if (cachedDevice) {
          cachedDevice.isActive = isActive;
          if (batteryLevel !== undefined) cachedDevice.batteryLevel = batteryLevel;
          if (signalStrength !== undefined) cachedDevice.signalStrength = signalStrength;
        }
        return;
      }

      const updatedDevice = await bleDeviceService.updateDevice(deviceId, {
        isActive,
        batteryLevel,
        signalStrength
      });

      // Update cache
      this.deviceCache.set(updatedDevice.macAddress, updatedDevice);
      this.emit('deviceStatusUpdated', updatedDevice);
    } catch (error) {
      this.emit('statusUpdateError', { deviceId, error });
      throw error;
    }
  }

  /**
   * Get all active devices with memory-efficient pagination
   */
  async getActiveDevices(limit: number = 50, offset: number = 0): Promise<BLEDevice[]> {
    try {
      // Use cached devices if available and system is under load
      if (this.isSystemUnderLoad() && this.deviceCache.size > 0) {
        const cachedDevices = Array.from(this.deviceCache.values())
          .filter(device => device.isActive)
          .slice(offset, offset + limit);
        return cachedDevices;
      }

      const devices = await prisma.bLEDevice.findMany({
        where: { isActive: true },
        orderBy: { lastSeen: 'desc' },
        take: limit,
        skip: offset
      });

      // Update cache with fetched devices
      devices.forEach(device => {
        const transformedDevice = this.transformDeviceResponse(device);
        this.deviceCache.set(device.macAddress, transformedDevice);
      });

      return devices.map(device => this.transformDeviceResponse(device));
    } catch (error) {
      this.emit('fetchError', error);
      throw error;
    }
  }

  /**
   * Start optimized BLE scanning for Raspberry Pi
   */
  startOptimizedScanning(location: string): void {
    if (this.activeScans.has(location)) {
      return; // Already scanning this location
    }

    if (this.activeScans.size >= this.config.maxConcurrentScans) {
      this.emit('scanLimitReached', { location, activeScans: this.activeScans.size });
      return;
    }

    const scanInterval = setInterval(async () => {
      if (this.isSystemUnderLoad()) {
        this.emit('scanThrottled', { location, reason: 'system_load' });
        return;
      }

      try {
        await this.performLocationScan(location);
      } catch (error) {
        this.emit('scanError', { location, error });
      }
    }, this.config.scanInterval);

    this.activeScans.set(location, scanInterval);
    this.emit('scanStarted', { location });
  }

  /**
   * Stop BLE scanning for a location
   */
  stopScanning(location: string): void {
    const scanInterval = this.activeScans.get(location);
    if (scanInterval) {
      clearInterval(scanInterval);
      this.activeScans.delete(location);
      this.emit('scanStopped', { location });
    }
  }

  /**
   * Get current hardware status
   */
  getHardwareStatus(): RaspberryPiStatus | null {
    return this.hardwareStatus;
  }

  /**
   * Get registry statistics
   */
  getRegistryStats() {
    return {
      cachedDevices: this.deviceCache.size,
      activeScans: this.activeScans.size,
      queuedRegistrations: this.registrationQueue.length,
      hardwareStatus: this.hardwareStatus,
      config: this.config
    };
  }

  /**
   * Clear device cache to free memory
   */
  clearCache(): void {
    this.deviceCache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Cleanup inactive devices from cache
   */
  cleanupInactiveDevices(): void {
    const now = new Date();
    const devicesToRemove: string[] = [];

    this.deviceCache.forEach((device, macAddress) => {
      const timeSinceLastSeen = now.getTime() - device.lastSeen.getTime();
      if (timeSinceLastSeen > this.config.deviceTimeout) {
        devicesToRemove.push(macAddress);
      }
    });

    devicesToRemove.forEach(macAddress => {
      this.deviceCache.delete(macAddress);
    });

    if (devicesToRemove.length > 0) {
      this.emit('devicesCleanedUp', { count: devicesToRemove.length });
    }
  }

  private async processRegistrationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.registrationQueue.length === 0) {
      return;
    }

    if (this.isSystemUnderLoad()) {
      return; // Wait for system load to decrease
    }

    this.isProcessingQueue = true;

    try {
      const registration = this.registrationQueue.shift();
      if (registration) {
        await this.registerDevice(registration);
      }
    } catch (error) {
      this.emit('queueProcessingError', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async performLocationScan(location: string): Promise<void> {
    // This would integrate with actual BLE scanning hardware
    // For now, we'll emit a scan event that can be handled by the BLE processor
    this.emit('locationScanRequested', { location, timestamp: new Date() });
  }

  private isSystemUnderLoad(): boolean {
    if (!this.hardwareStatus) {
      return false;
    }

    return (
      this.hardwareStatus.memoryUsage > this.config.memoryThreshold ||
      this.hardwareStatus.cpuUsage > this.config.cpuThreshold
    );
  }

  private startHardwareMonitoring(): void {
    // Simulate hardware monitoring - in real implementation, this would use system APIs
    setInterval(() => {
      this.updateHardwareStatus();
    }, 10000); // Update every 10 seconds
  }

  private updateHardwareStatus(): void {
    // Simulate hardware status - in real implementation, this would read actual system metrics
    this.hardwareStatus = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      temperature: 40 + Math.random() * 20, // 40-60°C
      diskUsage: 20 + Math.random() * 30, // 20-50%
      uptime: Date.now() - (Math.random() * 86400000), // Random uptime
      bleAdapterStatus: Math.random() > 0.1 // 90% uptime
    };

    this.emit('hardwareStatusUpdated', this.hardwareStatus);
  }

  private transformDeviceResponse(device: any): BLEDevice {
    return {
      id: device.id,
      userId: device.userId,
      macAddress: device.macAddress,
      deviceName: device.deviceName,
      deviceType: device.deviceType as DeviceType,
      isActive: device.isActive,
      lastSeen: device.lastSeen,
      batteryLevel: device.batteryLevel || undefined,
      signalStrength: device.signalStrength || undefined
    };
  }
}

export const bleRegistryService = new BLERegistryService();