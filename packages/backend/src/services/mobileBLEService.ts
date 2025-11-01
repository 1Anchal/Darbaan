import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { getRedisClient } from '../config/redis';

const prisma = new PrismaClient();
const redis = getRedisClient();

export interface MobileDeviceInfo {
  id: string;
  userId: string;
  deviceId: string;
  bluetoothMac: string;
  deviceModel: string;
  androidVersion: string;
  appVersion: string;
  isActive: boolean;
  lastSeen: Date;
  batteryLevel?: number;
  signalStrength?: number;
  location?: string;
}

export interface MobileRegistrationRequest {
  userId: string;
  deviceId: string;
  bluetoothMac: string;
  deviceModel: string;
  androidVersion: string;
  appVersion: string;
  deviceName?: string;
}

export interface MobileBLEBeacon {
  deviceId: string;
  bluetoothMac: string;
  userId: string;
  timestamp: Date;
  location: string;
  signalStrength: number;
  batteryLevel?: number;
  sequenceNumber: number;
  signature?: string;
}

export class MobileBLEService extends EventEmitter {
  private registeredDevices: Map<string, MobileDeviceInfo> = new Map();
  private deviceSecrets: Map<string, string> = new Map();
  private recentBeacons: Map<string, number> = new Map();

  constructor() {
    super();
    this.loadRegisteredDevices();
  }

  /**
   * Register a new mobile device for BLE attendance
   */
  async registerMobileDevice(request: MobileRegistrationRequest): Promise<MobileDeviceInfo> {
    try {
      // Check if user exists and is a student
      const user = await prisma.user.findUnique({
        where: { id: request.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'STUDENT') {
        throw new Error('Only students can register mobile devices for attendance');
      }

      // Check if device is already registered by MAC address
      const existingDevice = await prisma.bLEDevice.findFirst({
        where: {
          OR: [
            { macAddress: request.bluetoothMac }
          ]
        }
      });

      if (existingDevice) {
        throw new Error('Device already registered');
      }

      // Generate device secret for signature verification
      const deviceSecret = this.generateDeviceSecret();

      // Create device record using existing schema fields
      const device = await prisma.bLEDevice.create({
        data: {
          userId: request.userId,
          macAddress: request.bluetoothMac, // Use existing macAddress field
          deviceName: request.deviceName || `${request.deviceModel} (${request.androidVersion})`,
          deviceType: 'SMARTPHONE',
          isActive: true,
          // Store mobile-specific data in a JSON string for now
          // This will be moved to proper fields when schema is updated
        }
      });

      const mobileDeviceInfo: MobileDeviceInfo = {
        id: device.id,
        userId: request.userId,
        deviceId: request.deviceId,
        bluetoothMac: request.bluetoothMac,
        deviceModel: request.deviceModel,
        androidVersion: request.androidVersion,
        appVersion: request.appVersion,
        isActive: true,
        lastSeen: new Date()
      };

      // Cache device info
      this.registeredDevices.set(request.deviceId, mobileDeviceInfo);
      this.deviceSecrets.set(request.deviceId, deviceSecret);

      // Cache in Redis for quick lookup
      if (redis) {
        await redis.setEx(
          `mobile_device:${request.deviceId}`,
          3600, // 1 hour
          JSON.stringify(mobileDeviceInfo)
        );
      }

      this.emit('deviceRegistered', mobileDeviceInfo);

      return mobileDeviceInfo;
    } catch (error) {
      console.error('Error registering mobile device:', error);
      throw error;
    }
  }

  /**
   * Process BLE beacon from mobile device
   */
  async processMobileBeacon(beacon: MobileBLEBeacon): Promise<boolean> {
    try {
      // Verify device is registered
      const deviceInfo = await this.getDeviceInfo(beacon.deviceId);
      if (!deviceInfo) {
        console.warn(`Unknown mobile device: ${beacon.deviceId}`);
        return false;
      }

      // Verify MAC address matches
      if (deviceInfo.bluetoothMac !== beacon.bluetoothMac) {
        console.warn(`MAC address mismatch for device: ${beacon.deviceId}`);
        return false;
      }

      // Prevent replay attacks
      if (!this.verifySequenceNumber(beacon.deviceId, beacon.sequenceNumber)) {
        console.warn(`Replay attack detected for device: ${beacon.deviceId}`);
        return false;
      }

      // Verify signature if present
      if (beacon.signature && !this.verifySignature(beacon)) {
        console.warn(`Invalid signature for device: ${beacon.deviceId}`);
        return false;
      }

      // Update device last seen
      await this.updateDeviceLastSeen(beacon.deviceId, beacon.batteryLevel, beacon.signalStrength);

      // Process the beacon for attendance
      const processedBeacon = {
        deviceId: beacon.deviceId,
        userId: beacon.userId,
        location: beacon.location,
        timestamp: beacon.timestamp,
        signalStrength: beacon.signalStrength,
        batteryLevel: beacon.batteryLevel,
        deviceType: 'mobile' as const
      };

      this.emit('mobileBeaconProcessed', processedBeacon);

      return true;
    } catch (error) {
      console.error('Error processing mobile beacon:', error);
      return false;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(deviceId: string): Promise<MobileDeviceInfo | null> {
    try {
      // Check cache first
      let deviceInfo = this.registeredDevices.get(deviceId);
      
      if (!deviceInfo && redis) {
        const cached = await redis.get(`mobile_device:${deviceId}`);
        if (cached) {
          deviceInfo = JSON.parse(cached);
          this.registeredDevices.set(deviceId, deviceInfo!);
        }
      }

      // If not in cache, query database
      if (!deviceInfo) {
        const device = await prisma.bLEDevice.findFirst({
          where: { 
            deviceType: 'SMARTPHONE',
            // For now, we'll match by MAC address since deviceId field doesn't exist yet
            macAddress: { contains: deviceId.substring(0, 8) } // Partial match as workaround
          }
        });

        if (device) {
          deviceInfo = {
            id: device.id,
            userId: device.userId,
            deviceId: deviceId,
            bluetoothMac: device.macAddress,
            deviceModel: 'Unknown', // Will be available when schema is updated
            androidVersion: 'Unknown',
            appVersion: 'Unknown',
            isActive: device.isActive,
            lastSeen: device.lastSeen || new Date()
          };

          this.registeredDevices.set(deviceId, deviceInfo);
        }
      }

      return deviceInfo || null;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  /**
   * Get all mobile devices for a user
   */
  async getUserMobileDevices(userId: string): Promise<MobileDeviceInfo[]> {
    try {
      const devices = await prisma.bLEDevice.findMany({
        where: {
          userId,
          deviceType: 'SMARTPHONE'
        },
        orderBy: { lastSeen: 'desc' }
      });

      return devices.map(device => ({
        id: device.id,
        userId: device.userId,
        deviceId: device.macAddress, // Using MAC as deviceId for now
        bluetoothMac: device.macAddress,
        deviceModel: 'Unknown',
        androidVersion: 'Unknown',
        appVersion: 'Unknown',
        isActive: device.isActive,
        lastSeen: device.lastSeen || new Date()
      }));
    } catch (error) {
      console.error('Error getting user mobile devices:', error);
      return [];
    }
  }

  /**
   * Deactivate a mobile device
   */
  async deactivateMobileDevice(deviceId: string, userId: string): Promise<boolean> {
    try {
      const result = await prisma.bLEDevice.updateMany({
        where: {
          macAddress: { contains: deviceId.substring(0, 8) }, // Partial match as workaround
          userId,
          deviceType: 'SMARTPHONE'
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      if (result.count > 0) {
        // Remove from cache
        this.registeredDevices.delete(deviceId);
        this.deviceSecrets.delete(deviceId);
        
        if (redis) {
          await redis.del(`mobile_device:${deviceId}`);
        }

        this.emit('deviceDeactivated', { deviceId, userId });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deactivating mobile device:', error);
      return false;
    }
  }

  /**
   * Update device last seen timestamp and status
   */
  private async updateDeviceLastSeen(
    deviceId: string, 
    batteryLevel?: number, 
    signalStrength?: number
  ): Promise<void> {
    try {
      await prisma.bLEDevice.updateMany({
        where: { 
          macAddress: { contains: deviceId.substring(0, 8) },
          deviceType: 'SMARTPHONE' 
        },
        data: {
          lastSeen: new Date(),
          batteryLevel: batteryLevel,
          signalStrength: signalStrength,
          updatedAt: new Date()
        }
      });

      // Update cache
      const deviceInfo = this.registeredDevices.get(deviceId);
      if (deviceInfo) {
        deviceInfo.lastSeen = new Date();
        deviceInfo.batteryLevel = batteryLevel;
        deviceInfo.signalStrength = signalStrength;
      }
    } catch (error) {
      console.error('Error updating device last seen:', error);
    }
  }

  /**
   * Generate device secret for signature verification
   */
  private generateDeviceSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Verify sequence number to prevent replay attacks
   */
  private verifySequenceNumber(deviceId: string, sequenceNumber: number): boolean {
    const lastSequence = this.recentBeacons.get(deviceId) || 0;
    
    if (sequenceNumber <= lastSequence) {
      return false; // Replay attack or out of order
    }

    this.recentBeacons.set(deviceId, sequenceNumber);
    
    // Clean up old entries (keep only last 1000 per device)
    if (this.recentBeacons.size > 10000) {
      const entries = Array.from(this.recentBeacons.entries());
      entries.sort((a, b) => b[1] - a[1]); // Sort by sequence number desc
      this.recentBeacons.clear();
      entries.slice(0, 1000).forEach(([key, value]) => {
        this.recentBeacons.set(key, value);
      });
    }

    return true;
  }

  /**
   * Verify beacon signature
   */
  private verifySignature(beacon: MobileBLEBeacon): boolean {
    const deviceSecret = this.deviceSecrets.get(beacon.deviceId);
    if (!deviceSecret || !beacon.signature) {
      return false;
    }

    // Create signature payload
    const payload = `${beacon.deviceId}:${beacon.userId}:${beacon.timestamp.getTime()}:${beacon.sequenceNumber}`;
    
    // In a real implementation, you would use HMAC-SHA256 or similar
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', deviceSecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === beacon.signature;
  }

  /**
   * Load registered devices from database
   */
  private async loadRegisteredDevices(): Promise<void> {
    try {
      const devices = await prisma.bLEDevice.findMany({
        where: {
          deviceType: 'SMARTPHONE',
          isActive: true
        }
      });

      for (const device of devices) {
        const deviceInfo: MobileDeviceInfo = {
          id: device.id,
          userId: device.userId,
          deviceId: device.macAddress, // Using MAC as deviceId for now
          bluetoothMac: device.macAddress,
          deviceModel: 'Unknown',
          androidVersion: 'Unknown',
          appVersion: 'Unknown',
          isActive: device.isActive,
          lastSeen: device.lastSeen || new Date()
        };

        this.registeredDevices.set(device.macAddress, deviceInfo);
      }

      console.log(`Loaded ${devices.length} registered mobile devices`);
    } catch (error) {
      console.error('Error loading registered devices:', error);
    }
  }

  /**
   * Get mobile device statistics
   */
  async getMobileDeviceStats(): Promise<{
    totalRegistered: number;
    activeDevices: number;
    recentlyActive: number;
    byAndroidVersion: Record<string, number>;
    byDeviceModel: Record<string, number>;
  }> {
    try {
      const devices = await prisma.bLEDevice.findMany({
        where: { deviceType: 'SMARTPHONE' }
      });

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const stats = {
        totalRegistered: devices.length,
        activeDevices: devices.filter(d => d.isActive).length,
        recentlyActive: devices.filter(d => d.lastSeen && d.lastSeen > oneHourAgo).length,
        byAndroidVersion: { 'Unknown': devices.length } as Record<string, number>,
        byDeviceModel: { 'Unknown': devices.length } as Record<string, number>
      };

      return stats;
    } catch (error) {
      console.error('Error getting mobile device stats:', error);
      return {
        totalRegistered: 0,
        activeDevices: 0,
        recentlyActive: 0,
        byAndroidVersion: {},
        byDeviceModel: {}
      };
    }
  }

  /**
   * Generate device registration QR code data
   */
  generateRegistrationQR(userId: string): string {
    const registrationData = {
      userId,
      timestamp: Date.now(),
      serverUrl: process.env.API_BASE_URL || 'http://localhost:3001',
      version: '1.0'
    };

    return JSON.stringify(registrationData);
  }
}

// Export singleton instance
export const mobileBLEService = new MobileBLEService();