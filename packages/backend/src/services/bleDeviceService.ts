import { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError } from '../middleware/errorHandler';
import { BLEDevice, DeviceType } from '../types';

const prisma = new PrismaClient();

export interface CreateBLEDeviceRequest {
  userId: string;
  macAddress: string;
  deviceName: string;
  deviceType: DeviceType;
  batteryLevel?: number;
  signalStrength?: number;
}

export interface UpdateBLEDeviceRequest {
  deviceName?: string;
  deviceType?: DeviceType;
  isActive?: boolean;
  batteryLevel?: number;
  signalStrength?: number;
}

export class BLEDeviceService {
  async createDevice(deviceData: CreateBLEDeviceRequest): Promise<BLEDevice> {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: deviceData.userId }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if MAC address already exists
      const existingDevice = await prisma.bLEDevice.findUnique({
        where: { macAddress: deviceData.macAddress }
      });

      if (existingDevice) {
        throw new ConflictError('Device with this MAC address already exists');
      }

      const device = await prisma.bLEDevice.create({
        data: {
          userId: deviceData.userId,
          macAddress: deviceData.macAddress,
          deviceName: deviceData.deviceName,
          deviceType: deviceData.deviceType,
          batteryLevel: deviceData.batteryLevel,
          signalStrength: deviceData.signalStrength,
          lastSeen: new Date()
        }
      });

      return this.transformDeviceResponse(device);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      throw new Error('Failed to create BLE device');
    }
  }

  async getDeviceById(deviceId: string): Promise<BLEDevice> {
    const device = await prisma.bLEDevice.findUnique({
      where: { id: deviceId }
    });

    if (!device) {
      throw new NotFoundError('BLE device not found');
    }

    return this.transformDeviceResponse(device);
  }

  async getDevicesByUserId(userId: string): Promise<BLEDevice[]> {
    const devices = await prisma.bLEDevice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return devices.map(device => this.transformDeviceResponse(device));
  }

  async getAllDevices(): Promise<BLEDevice[]> {
    const devices = await prisma.bLEDevice.findMany({
      orderBy: { lastSeen: 'desc' }
    });

    return devices.map(device => this.transformDeviceResponse(device));
  }

  async getActiveDevices(): Promise<BLEDevice[]> {
    const devices = await prisma.bLEDevice.findMany({
      where: { isActive: true },
      orderBy: { lastSeen: 'desc' }
    });

    return devices.map(device => this.transformDeviceResponse(device));
  }

  async updateDevice(deviceId: string, updates: UpdateBLEDeviceRequest): Promise<BLEDevice> {
    const existingDevice = await prisma.bLEDevice.findUnique({
      where: { id: deviceId }
    });

    if (!existingDevice) {
      throw new NotFoundError('BLE device not found');
    }

    const updatedDevice = await prisma.bLEDevice.update({
      where: { id: deviceId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return this.transformDeviceResponse(updatedDevice);
  }

  async updateDeviceStatus(deviceId: string, isActive: boolean): Promise<BLEDevice> {
    return this.updateDevice(deviceId, { isActive });
  }

  async updateDeviceLastSeen(deviceId: string, batteryLevel?: number, signalStrength?: number): Promise<BLEDevice> {
    const existingDevice = await prisma.bLEDevice.findUnique({
      where: { id: deviceId }
    });

    if (!existingDevice) {
      throw new NotFoundError('BLE device not found');
    }

    const updatedDevice = await prisma.bLEDevice.update({
      where: { id: deviceId },
      data: {
        lastSeen: new Date(),
        batteryLevel: batteryLevel ?? existingDevice.batteryLevel,
        signalStrength: signalStrength ?? existingDevice.signalStrength,
        updatedAt: new Date()
      }
    });

    return this.transformDeviceResponse(updatedDevice);
  }

  async deleteDevice(deviceId: string): Promise<void> {
    const device = await prisma.bLEDevice.findUnique({
      where: { id: deviceId }
    });

    if (!device) {
      throw new NotFoundError('BLE device not found');
    }

    await prisma.bLEDevice.delete({
      where: { id: deviceId }
    });
  }

  async getDeviceByMacAddress(macAddress: string): Promise<BLEDevice | null> {
    const device = await prisma.bLEDevice.findUnique({
      where: { macAddress }
    });

    return device ? this.transformDeviceResponse(device) : null;
  }

  async getDevicesNearExpiry(thresholdHours: number = 24): Promise<BLEDevice[]> {
    const threshold = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
    
    const devices = await prisma.bLEDevice.findMany({
      where: {
        isActive: true,
        lastSeen: {
          lt: threshold
        }
      },
      orderBy: { lastSeen: 'asc' }
    });

    return devices.map(device => this.transformDeviceResponse(device));
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

export const bleDeviceService = new BLEDeviceService();