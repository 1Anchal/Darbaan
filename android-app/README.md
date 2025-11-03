# 📱 Darbaan Attendance Android App

A comprehensive Android application for the Darbaan Attendance System that enables automatic attendance tracking through BLE beacons and QR code scanning.

## 🚀 Features

### ✅ Core Functionality
- **User Authentication**: Secure login with email/password
- **Device Registration**: Automatic device registration with the server
- **BLE Beacon Service**: Background BLE advertising for proximity detection
- **QR Code Scanning**: Quick attendance marking via QR codes
- **Real-time Sync**: Automatic synchronization with the server
- **Offline Support**: Local data storage with sync when online

### 📱 User Interface
- **Material Design 3**: Modern, intuitive interface
- **Bottom Navigation**: Easy access to main features
- **Real-time Status**: Live updates on beacon and connection status
- **Attendance History**: View past attendance records
- **Profile Management**: User settings and device information

### 🔧 Technical Features
- **Background Services**: Continuous BLE beacon transmission
- **Network Management**: Robust API communication with retry logic
- **Security**: Token-based authentication and secure data storage
- **Performance**: Optimized for battery life and memory usage

## 📋 Requirements

### System Requirements
- **Android Version**: 6.0 (API level 23) or higher
- **Bluetooth**: BLE (Bluetooth Low Energy) support required
- **Permissions**: Location, Bluetooth, Camera, Internet

### Server Requirements
- Darbaan backend server running and accessible
- Network connectivity (WiFi or mobile data)

## 🛠️ Installation & Setup

### Option 1: Install Pre-built APK
1. Download the APK from releases
2. Enable "Install from unknown sources" in Android settings
3. Install the APK file
4. Grant required permissions when prompted

### Option 2: Build from Source

#### Prerequisites
- **Android Studio**: Latest version (recommended)
- **Java Development Kit**: JDK 11 or higher
- **Android SDK**: API level 34 or higher

#### Build Steps
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd android-app
   ```

2. **Open in Android Studio**:
   - Launch Android Studio
   - Select "Open an existing project"
   - Navigate to the `android-app` folder

3. **Sync Project**:
   - Wait for Gradle sync to complete
   - Resolve any dependency issues

4. **Build APK**:
   - **Debug Build**: `Build → Build Bundle(s) / APK(s) → Build APK(s)`
   - **Release Build**: `Build → Generate Signed Bundle / APK`

5. **Install on Device**:
   - Connect Android device via USB
   - Enable Developer Options and USB Debugging
   - Run the app from Android Studio

#### Command Line Build
```bash
# Debug build
./gradlew assembleDebug

# Release build (requires signing configuration)
./gradlew assembleRelease
```

**APK Location**: `app/build/outputs/apk/debug/app-debug.apk`

## ⚙️ Configuration

### Server Configuration
1. **Launch the app**
2. **Enter Server URL**: Input your Darbaan server URL (e.g., `http://192.168.1.100:3001`)
3. **Test Connection**: Verify server connectivity
4. **Login**: Use your Darbaan credentials

### Permissions Setup
The app requires the following permissions:
- **Bluetooth**: For BLE beacon functionality
- **Location**: Required for BLE operations (Android requirement)
- **Camera**: For QR code scanning
- **Internet**: For server communication
- **Wake Lock**: To keep beacon service running

## 📖 Usage Guide

### First Time Setup
1. **Install and Launch** the app
2. **Configure Server**: Enter your server URL
3. **Login**: Use your student credentials
4. **Register Device**: Complete device registration
5. **Grant Permissions**: Allow all requested permissions

### Daily Usage
1. **Open App**: Launch the Darbaan app
2. **Check Status**: Verify beacon and connection status
3. **Select Location**: Choose your current location
4. **Start Beacon**: Enable BLE beacon transmission
5. **Automatic Tracking**: Attendance is tracked automatically

### QR Code Attendance
1. **Navigate to Home**: Use bottom navigation
2. **Tap QR Scanner**: Open the QR code scanner
3. **Scan Code**: Point camera at attendance QR code
4. **Confirm**: Verify attendance marking

### View Attendance History
1. **Go to Attendance Tab**: Use bottom navigation
2. **Browse Records**: View your attendance history
3. **Filter by Date**: Use date filters if needed

## 🔧 Troubleshooting

### Common Issues

#### App Won't Connect to Server
- **Check Network**: Ensure WiFi/mobile data is active
- **Verify URL**: Confirm server URL is correct
- **Server Status**: Ensure Darbaan server is running
- **Firewall**: Check if server port is accessible

#### BLE Beacon Not Working
- **Bluetooth**: Ensure Bluetooth is enabled
- **Permissions**: Grant location permissions
- **Battery**: Check if app is battery optimized (disable if needed)
- **Background**: Ensure app can run in background

#### QR Scanner Issues
- **Camera Permission**: Grant camera access
- **Lighting**: Ensure adequate lighting for scanning
- **QR Code**: Verify QR code is valid Darbaan format

#### Attendance Not Syncing
- **Internet**: Check network connectivity
- **Login Status**: Ensure you're logged in
- **Server**: Verify server is responding
- **Storage**: Check device storage space

### Performance Optimization
- **Battery**: Add app to battery optimization whitelist
- **Background**: Allow background app refresh
- **Storage**: Clear app cache if needed
- **Updates**: Keep app updated to latest version

## 🔒 Security & Privacy

### Data Protection
- **Encryption**: All API communications use HTTPS
- **Token Security**: Authentication tokens are securely stored
- **Local Storage**: Sensitive data is encrypted locally
- **Permissions**: Minimal required permissions only

### Privacy Features
- **Data Minimization**: Only necessary data is collected
- **Local Processing**: BLE data processed locally
- **Secure Transmission**: All server communication encrypted
- **User Control**: Users control data sharing preferences

## 🛠️ Development

### Project Structure
```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/darbaan/attendance/
│   │   │   ├── MainActivity.kt              # Main activity
│   │   │   ├── ui/
│   │   │   │   ├── LoginActivity.kt         # Login screen
│   │   │   │   ├── QRScannerActivity.kt     # QR scanner
│   │   │   │   └── fragments/               # UI fragments
│   │   │   ├── network/                     # API services
│   │   │   ├── service/                     # Background services
│   │   │   └── utils/                       # Utility classes
│   │   ├── res/                             # Resources
│   │   └── AndroidManifest.xml              # App configuration
│   └── build.gradle                         # App dependencies
├── build.gradle                             # Project configuration
└── settings.gradle                          # Module settings
```

### Key Components
- **MainActivity**: Main app container with bottom navigation
- **LoginActivity**: User authentication
- **BLEBeaconService**: Background BLE beacon transmission
- **ApiService**: Server communication interface
- **PreferenceManager**: Local data storage

### API Integration
The app integrates with these Darbaan API endpoints:
- `POST /api/auth/login` - User authentication
- `POST /api/mobile-device/register` - Device registration
- `POST /api/mobile-device/beacon` - Beacon data transmission
- `GET /api/attendance/history` - Attendance records

## 📞 Support

### Getting Help
- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via the issue tracker
- **Server Issues**: Contact your system administrator
- **App Problems**: Check troubleshooting section above

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Darbaan Attendance System. See the main project license for details.

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**Minimum Android**: 6.0 (API 23)  
**Target Android**: 14 (API 34)