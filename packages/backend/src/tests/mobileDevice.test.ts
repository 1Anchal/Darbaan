import { mobileBLEService } from '../services/mobileBLEService';

describe('Mobile Device Integration', () => {
  test('should create mobile BLE service instance', () => {
    expect(mobileBLEService).toBeDefined();
    expect(typeof mobileBLEService.registerMobileDevice).toBe('function');
    expect(typeof mobileBLEService.processMobileBeacon).toBe('function');
    expect(typeof mobileBLEService.getUserMobileDevices).toBe('function');
  });

  test('should generate registration QR code', () => {
    const userId = 'test-user-id';
    const qrData = mobileBLEService.generateRegistrationQR(userId);
    
    expect(qrData).toBeDefined();
    expect(typeof qrData).toBe('string');
    
    const parsedData = JSON.parse(qrData);
    expect(parsedData.userId).toBe(userId);
    expect(parsedData.timestamp).toBeDefined();
    expect(parsedData.serverUrl).toBeDefined();
    expect(parsedData.version).toBe('1.0');
  });

  test('should get mobile device statistics', async () => {
    const stats = await mobileBLEService.getMobileDeviceStats();
    
    expect(stats).toBeDefined();
    expect(typeof stats.totalRegistered).toBe('number');
    expect(typeof stats.activeDevices).toBe('number');
    expect(typeof stats.recentlyActive).toBe('number');
    expect(typeof stats.byAndroidVersion).toBe('object');
    expect(typeof stats.byDeviceModel).toBe('object');
  });
});