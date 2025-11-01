# Mobile Device Integration for Darbaan Attendance System

## Overview

The Darbaan Attendance System has been updated to support Android mobile devices instead of physical BLE tags. This document outlines the implementation, API endpoints, and usage instructions.

## Key Changes

### 🔄 **From BLE Tags to Mobile Devices**

| Aspect | BLE Tags (Old) | Mobile Devices (New) |
|--------|----------------|----------------------|
| **Hardware** | Physical BLE beacons | Android smartphones |
| **Registration** | Admin assigns tags | Students self-register |
| **Security** | Physical possession | Cryptographic signatures |
| **Battery** | Long-life batteries | Phone battery monitoring |
| **Cost** | Hardware cost per tag | No additional hardware |
| **Management** | Central tag management | User device management |

## Architecture

### Backend Components

1. **Mobile BLE Service** (`packages/backend/src/services/mobileBLEService.ts`)
   - Device registration and management
   - Beacon processing with security validation
   - Battery and signal strength monitoring

2. **Mobile Device Routes** (`packages/backend/src/routes/mobileDevice.ts`)
   - RESTful API endpoints for device management
   - Authentication and authorization
   - Input validation and error handling

3. **BLE Integration Service** (Updated)
   - Handles both traditional BLE and mobile device events
   - Real-time WebSocket broadcasting
   - Cross-service event coordination

### Frontend Components

1. **Mobile Device Management** (`packages/frontend/src/components/mobile/MobileDeviceManagement.tsx`)
   - Device registration interface
   - Device status monitoring
   - QR code generation for easy setup

2. **Mobile Device Service** (`packages/frontend/src/services/mobileDeviceService.ts`)
   - API communication layer
   - Data formatting utilities
   - Status and signal strength helpers

## API Endpoints

### Device Registration

```http
POST /api/mobile-device/register
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "deviceId": "android-device-id",
  "bluetoothMac": "AA:BB:CC:DD:EE:FF",
  "deviceModel": "Samsung Galaxy S21",
  "androidVersion": "12",
  "appVersion": "1.0.0",
  "deviceName": "My Phone"
}
```

### Beacon Processing

```http
POST /api/mobile-device/beacon
Content-Type: application/json

{
  "deviceId": "android-device-id",
  "bluetoothMac": "AA:BB:CC:DD:EE:FF",
  "userId": "user-id",
  "location": "central-library",
  "signalStrength": -45,
  "sequenceNumber": 12345,
  "batteryLevel": 85,
  "signature": "hmac-sha256-signature"
}
```

### Device Management

```http
# Get user's devices
GET /api/mobile-device/user/:userId?
Authorization: Bearer <token>

# Get specific device
GET /api/mobile-device/device/:deviceId
Authorization: Bearer <token>

# Deactivate device
DELETE /api/mobile-device/device/:deviceId
Authorization: Bearer <token>

# Get statistics (Admin/Faculty only)
GET /api/mobile-device/stats
Authorization: Bearer <admin-token>

# Generate registration QR code
GET /api/mobile-device/registration-qr
Authorization: Bearer <student-token>
```

## Security Features

### 1. **Sequence Numbers**
- Prevents replay attacks
- Each beacon must have an incrementing sequence number
- Server tracks last sequence number per device

### 2. **HMAC Signatures**
- Cryptographic signatures prevent spoofing
- Each device has a unique secret key
- Signatures include device ID, user ID, timestamp, and sequence number

### 3. **Device Validation**
- MAC address verification
- User ownership validation
- Active device status checking

## Mobile App Requirements

The Android mobile app needs to implement:

### 1. **Device Registration**
```javascript
// Example registration flow
const registrationData = {
  deviceId: getAndroidDeviceId(),
  bluetoothMac: getBluetoothMacAddress(),
  deviceModel: getDeviceModel(),
  androidVersion: getAndroidVersion(),
  appVersion: getAppVersion()
};

fetch('/api/mobile-device/register', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(registrationData)
});
```

### 2. **Beacon Broadcasting**
```javascript
// Example beacon sending
const sendBeacon = () => {
  const beacon = {
    deviceId: getDeviceId(),
    bluetoothMac: getBluetoothMac(),
    userId: getCurrentUserId(),
    location: getCurrentLocation(),
    signalStrength: getSignalStrength(),
    sequenceNumber: getNextSequenceNumber(),
    batteryLevel: getBatteryLevel(),
    signature: generateSignature(...)
  };

  fetch('/api/mobile-device/beacon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(beacon)
  });
};

// Send beacon every 30 seconds when in attendance areas
setInterval(sendBeacon, 30000);
```

### 3. **QR Code Registration**
```javascript
// Scan QR code to get registration data
const qrData = JSON.parse(scannedQRCode);
const { userId, serverUrl, timestamp } = qrData;

// Use this data to register the device
registerDevice(userId, serverUrl);
```

## Database Schema

The system uses the existing `BLEDevice` table with `deviceType = 'SMARTPHONE'`:

```sql
-- Current schema (compatible)
CREATE TABLE ble_devices (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  macAddress TEXT NOT NULL, -- Used for bluetoothAddress
  deviceName TEXT NOT NULL,
  deviceType TEXT NOT NULL, -- 'SMARTPHONE' for mobile devices
  isActive BOOLEAN DEFAULT true,
  lastSeen TIMESTAMP,
  batteryLevel INTEGER,
  signalStrength INTEGER,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

-- Future schema (when migration is applied)
ALTER TABLE ble_devices ADD COLUMN deviceId TEXT UNIQUE;
ALTER TABLE ble_devices ADD COLUMN bluetoothAddress TEXT;
ALTER TABLE ble_devices ADD COLUMN metadata JSONB;
```

## Frontend Usage

### 1. **Student Device Registration**
```typescript
import { mobileDeviceService } from '../services/mobileDeviceService';

// Register device
const registerDevice = async (deviceData) => {
  try {
    const device = await mobileDeviceService.registerMobileDevice(deviceData);
    console.log('Device registered:', device);
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

// Generate QR code
const generateQR = async () => {
  const qrData = await mobileDeviceService.generateRegistrationQR();
  // Display QR code to user
};
```

### 2. **Device Management (Admin/Faculty)**
```typescript
// Get all devices for a user
const getUserDevices = async (userId) => {
  const devices = await mobileDeviceService.getUserMobileDevices(userId);
  return devices;
};

// Get system statistics
const getStats = async () => {
  const stats = await mobileDeviceService.getMobileDeviceStats();
  console.log('Device statistics:', stats);
};
```

## Real-time Features

### WebSocket Events

The system broadcasts real-time events via WebSocket:

```javascript
// Mobile device events
socket.on('mobile-device-registered', (data) => {
  console.log('New device registered:', data.deviceInfo);
});

socket.on('mobile-device-deactivated', (data) => {
  console.log('Device deactivated:', data.deviceId);
});

socket.on('mobile-ble-update', (data) => {
  console.log('Mobile beacon received:', data);
});
```

## Testing

### Backend Tests
```bash
cd packages/backend
npm test -- mobileDevice.test.ts
```

### API Testing
```bash
# Test device registration
curl -X POST http://localhost:3001/api/mobile-device/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device",
    "bluetoothMac": "AA:BB:CC:DD:EE:FF",
    "deviceModel": "Test Device",
    "androidVersion": "12",
    "appVersion": "1.0.0"
  }'

# Test beacon processing
curl -X POST http://localhost:3001/api/mobile-device/beacon \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device",
    "bluetoothMac": "AA:BB:CC:DD:EE:FF",
    "userId": "user-id",
    "location": "central-library",
    "signalStrength": -45,
    "sequenceNumber": 1
  }'
```

## Deployment Considerations

### 1. **Database Migration**
```bash
# Apply schema changes
npx prisma db push
npx prisma generate
```

### 2. **Environment Variables**
```env
# Add to .env
API_BASE_URL=https://your-domain.com/api
MOBILE_DEVICE_SECRET_KEY=your-secret-key
```

### 3. **Security Configuration**
- Enable HTTPS for production
- Configure proper CORS settings
- Set up rate limiting for beacon endpoints
- Implement proper signature validation

## Monitoring and Analytics

### Device Health Monitoring
- Battery level tracking
- Signal strength monitoring
- Last seen timestamps
- Connection status

### Usage Analytics
- Active device count
- Beacon frequency analysis
- Location-based statistics
- User engagement metrics

## Troubleshooting

### Common Issues

1. **Device Registration Fails**
   - Check user authentication
   - Verify user role (must be STUDENT)
   - Ensure MAC address format is correct

2. **Beacon Processing Fails**
   - Verify device is registered
   - Check MAC address matches
   - Ensure sequence numbers are incrementing

3. **Real-time Updates Not Working**
   - Check WebSocket connection
   - Verify authentication token
   - Ensure proper room subscription

### Debug Endpoints

```http
# Test device connectivity (Admin only)
POST /api/mobile-device/test-connectivity
{
  "deviceId": "device-to-test"
}
```

## Future Enhancements

1. **Enhanced Security**
   - Certificate-based authentication
   - Advanced anti-spoofing measures
   - Geofencing validation

2. **Performance Optimization**
   - Beacon batching
   - Intelligent caching
   - Load balancing

3. **Additional Features**
   - iOS support
   - Offline mode
   - Advanced analytics
   - Machine learning integration

## Support

For technical support or questions about the mobile device integration:

1. Check the API documentation
2. Review the test files for examples
3. Monitor server logs for error details
4. Use the debug endpoints for troubleshooting

---

**Note**: This integration maintains backward compatibility with existing BLE tag systems while adding support for mobile devices. The system can handle both types of devices simultaneously.