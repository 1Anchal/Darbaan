import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface MobileDeviceInfo {
  id: string;
  userId: string;
  deviceId: string;
  bluetoothMac: string;
  deviceModel: string;
  androidVersion: string;
  appVersion: string;
  isActive: boolean;
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
  location?: string;
}

export interface MobileRegistrationRequest {
  deviceId: string;
  bluetoothMac: string;
  deviceModel: string;
  androidVersion: string;
  appVersion: string;
  deviceName?: string;
}

export interface MobileDeviceStats {
  totalRegistered: number;
  activeDevices: number;
  recentlyActive: number;
  byAndroidVersion: Record<string, number>;
  byDeviceModel: Record<string, number>;
}

export interface DeviceConnectivity {
  deviceId: string;
  isActive: boolean;
  lastSeen: string;
  minutesSinceLastSeen: number;
  status: 'online' | 'recent' | 'offline';
  batteryLevel?: number;
  signalStrength?: number;
}

class MobileDeviceService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Register a new mobile device
   */
  async registerMobileDevice(request: MobileRegistrationRequest): Promise<MobileDeviceInfo> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/mobile-device/register`,
        request,
        this.getAuthHeaders()
      );
      return response.data.device;
    } catch (error) {
      console.error('Error registering mobile device:', error);
      throw new Error('Failed to register mobile device');
    }
  }

  /**
   * Get user's mobile devices
   */
  async getUserMobileDevices(userId?: string): Promise<MobileDeviceInfo[]> {
    try {
      const url = userId 
        ? `${API_BASE_URL}/mobile-device/user/${userId}`
        : `${API_BASE_URL}/mobile-device/user`;
      
      const response = await axios.get(url, this.getAuthHeaders());
      return response.data.devices;
    } catch (error) {
      console.error('Error getting user mobile devices:', error);
      throw new Error('Failed to get mobile devices');
    }
  }

  /**
   * Get specific device information
   */
  async getDeviceInfo(deviceId: string): Promise<MobileDeviceInfo> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/mobile-device/device/${deviceId}`,
        this.getAuthHeaders()
      );
      return response.data.device;
    } catch (error) {
      console.error('Error getting device info:', error);
      throw new Error('Failed to get device information');
    }
  }

  /**
   * Deactivate a mobile device
   */
  async deactivateMobileDevice(deviceId: string): Promise<void> {
    try {
      await axios.delete(
        `${API_BASE_URL}/mobile-device/device/${deviceId}`,
        this.getAuthHeaders()
      );
    } catch (error) {
      console.error('Error deactivating mobile device:', error);
      throw new Error('Failed to deactivate mobile device');
    }
  }

  /**
   * Get mobile device statistics (Faculty/Admin only)
   */
  async getMobileDeviceStats(): Promise<MobileDeviceStats> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/mobile-device/stats`,
        this.getAuthHeaders()
      );
      return response.data.statistics;
    } catch (error) {
      console.error('Error getting mobile device stats:', error);
      throw new Error('Failed to get device statistics');
    }
  }

  /**
   * Generate QR code for device registration
   */
  async generateRegistrationQR(): Promise<string> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/mobile-device/registration-qr`,
        this.getAuthHeaders()
      );
      return response.data.qrData;
    } catch (error) {
      console.error('Error generating registration QR:', error);
      throw new Error('Failed to generate registration QR code');
    }
  }

  /**
   * Test device connectivity (Admin only)
   */
  async testDeviceConnectivity(deviceId: string): Promise<DeviceConnectivity> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/mobile-device/test-connectivity`,
        { deviceId },
        this.getAuthHeaders()
      );
      return response.data.connectivity;
    } catch (error) {
      console.error('Error testing device connectivity:', error);
      throw new Error('Failed to test device connectivity');
    }
  }

  /**
   * Send beacon data (for mobile app)
   */
  async sendBeacon(beaconData: {
    deviceId: string;
    bluetoothMac: string;
    userId: string;
    location: string;
    signalStrength: number;
    sequenceNumber: number;
    batteryLevel?: number;
    signature?: string;
  }): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/mobile-device/beacon`,
        beaconData
      );
    } catch (error) {
      console.error('Error sending beacon:', error);
      throw new Error('Failed to send beacon data');
    }
  }

  /**
   * Format device status for display
   */
  formatDeviceStatus(device: MobileDeviceInfo): {
    status: string;
    color: string;
    description: string;
  } {
    if (!device.isActive) {
      return {
        status: 'Inactive',
        color: '#9e9e9e',
        description: 'Device has been deactivated'
      };
    }

    const now = new Date();
    const lastSeen = new Date(device.lastSeen);
    const minutesAgo = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    if (minutesAgo < 5) {
      return {
        status: 'Online',
        color: '#4caf50',
        description: 'Active within the last 5 minutes'
      };
    } else if (minutesAgo < 30) {
      return {
        status: 'Recent',
        color: '#ff9800',
        description: `Last seen ${minutesAgo} minutes ago`
      };
    } else if (minutesAgo < 1440) { // 24 hours
      const hoursAgo = Math.floor(minutesAgo / 60);
      return {
        status: 'Offline',
        color: '#f44336',
        description: `Last seen ${hoursAgo} hours ago`
      };
    } else {
      const daysAgo = Math.floor(minutesAgo / 1440);
      return {
        status: 'Offline',
        color: '#f44336',
        description: `Last seen ${daysAgo} days ago`
      };
    }
  }

  /**
   * Format battery level for display
   */
  formatBatteryLevel(batteryLevel?: number): {
    level: string;
    color: string;
    icon: string;
  } {
    if (batteryLevel === undefined) {
      return {
        level: 'Unknown',
        color: '#9e9e9e',
        icon: '🔋'
      };
    }

    if (batteryLevel > 50) {
      return {
        level: `${batteryLevel}%`,
        color: '#4caf50',
        icon: '🔋'
      };
    } else if (batteryLevel > 20) {
      return {
        level: `${batteryLevel}%`,
        color: '#ff9800',
        icon: '🪫'
      };
    } else {
      return {
        level: `${batteryLevel}%`,
        color: '#f44336',
        icon: '🪫'
      };
    }
  }

  /**
   * Format signal strength for display
   */
  formatSignalStrength(signalStrength?: number): {
    strength: string;
    color: string;
    bars: number;
  } {
    if (signalStrength === undefined) {
      return {
        strength: 'Unknown',
        color: '#9e9e9e',
        bars: 0
      };
    }

    // Convert dBm to signal quality (approximate)
    let bars = 0;
    let color = '#f44336';
    let strength = 'Poor';

    if (signalStrength > -50) {
      bars = 4;
      color = '#4caf50';
      strength = 'Excellent';
    } else if (signalStrength > -60) {
      bars = 3;
      color = '#8bc34a';
      strength = 'Good';
    } else if (signalStrength > -70) {
      bars = 2;
      color = '#ff9800';
      strength = 'Fair';
    } else if (signalStrength > -80) {
      bars = 1;
      color = '#ff5722';
      strength = 'Poor';
    }

    return {
      strength: `${strength} (${signalStrength} dBm)`,
      color,
      bars
    };
  }

  /**
   * Get device type icon
   */
  getDeviceTypeIcon(deviceModel: string): string {
    const model = deviceModel.toLowerCase();
    
    if (model.includes('samsung')) return '📱';
    if (model.includes('pixel')) return '📱';
    if (model.includes('oneplus')) return '📱';
    if (model.includes('xiaomi')) return '📱';
    if (model.includes('huawei')) return '📱';
    if (model.includes('oppo')) return '📱';
    if (model.includes('vivo')) return '📱';
    
    return '📱'; // Default mobile icon
  }
}

export const mobileDeviceService = new MobileDeviceService();