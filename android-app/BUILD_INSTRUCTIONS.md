# 📱 Darbaan Attendance Android App - Build Instructions

## 🚀 **How to Build APK**

### **Prerequisites:**
1. **Android Studio** (Latest version recommended)
2. **Java JDK 8 or higher**
3. **Android SDK** (API level 21+)

### **Step 1: Open Project in Android Studio**

1. **Launch Android Studio**
2. **Open Project**: File → Open → Select the `android-app` folder
3. **Wait for Gradle Sync** to complete
4. **Install any missing SDK components** if prompted

### **Step 2: Configure Build Settings**

1. **Update Server URL** (if needed):
   - Open `app/src/main/java/com/darbaan/attendance/network/NetworkManager.kt`
   - Change `BASE_URL` to your server's IP address:
   ```kotlin
   private var BASE_URL = "http://YOUR_SERVER_IP:3001/api/"
   ```

2. **Check Build Configuration**:
   - Go to Build → Select Build Variant
   - Choose "release" for production APK

### **Step 3: Build APK**

#### **Option A: Build Debug APK (for testing)**
```bash
# In Android Studio Terminal or Command Line
cd android-app
./gradlew assembleDebug
```
**Output**: `app/build/outputs/apk/debug/app-debug.apk`

#### **Option B: Build Release APK (for distribution)**
```bash
# In Android Studio Terminal or Command Line
cd android-app
./gradlew assembleRelease
```
**Output**: `app/build/outputs/apk/release/app-release-unsigned.apk`

#### **Option C: Using Android Studio GUI**
1. **Build Menu** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. **Wait for build to complete**
3. **Click "locate"** to find the APK file

### **Step 4: Sign APK (for Release)**

For production release, you need to sign the APK:

1. **Generate Keystore** (first time only):
```bash
keytool -genkey -v -keystore darbaan-release-key.keystore -alias darbaan -keyalg RSA -keysize 2048 -validity 10000
```

2. **Sign APK**:
```bash
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore darbaan-release-key.keystore app-release-unsigned.apk darbaan
```

3. **Align APK**:
```bash
zipalign -v 4 app-release-unsigned.apk darbaan-attendance.apk
```

## 📋 **APK Installation Instructions**

### **For Testing (Debug APK):**
1. **Enable Developer Options** on Android device
2. **Enable USB Debugging**
3. **Install via ADB**:
```bash
adb install app-debug.apk
```

### **For Distribution (Release APK):**
1. **Enable "Unknown Sources"** in device settings
2. **Transfer APK** to device (USB, email, etc.)
3. **Tap APK file** to install
4. **Grant permissions** when prompted

## ⚙️ **App Configuration**

### **First Time Setup:**
1. **Launch App**
2. **Enter Server URL**: Your Darbaan server address
   - Example: `http://192.168.1.100:3001`
3. **Test Connection** to verify server is reachable
4. **Login** with your Darbaan credentials
5. **Grant Permissions**:
   - Bluetooth
   - Location
   - Camera (for QR scanning)

### **Device Registration:**
1. **Scan QR Code** from web dashboard
2. **Or manually register** in app settings
3. **Start Beacon Service** for attendance tracking

## 🔧 **Troubleshooting**

### **Build Issues:**

**Gradle Sync Failed:**
```bash
# Clean and rebuild
./gradlew clean
./gradlew build
```

**Missing SDK:**
- Open SDK Manager in Android Studio
- Install required SDK versions (API 21-34)

**Dependency Issues:**
```bash
# Update dependencies
./gradlew --refresh-dependencies
```

### **Runtime Issues:**

**Network Connection Failed:**
- Check server URL format: `http://IP:PORT/api/`
- Ensure server is running and accessible
- Check firewall settings

**Bluetooth Not Working:**
- Grant all Bluetooth permissions
- Enable Bluetooth on device
- Check device compatibility (BLE required)

**Location Issues:**
- Grant location permissions
- Enable GPS/Location services
- Check location accuracy settings

## 📱 **Device Requirements**

### **Minimum Requirements:**
- **Android 5.0** (API level 21)
- **Bluetooth Low Energy (BLE)** support
- **1GB RAM** minimum
- **50MB storage** space

### **Recommended:**
- **Android 8.0+** for better BLE performance
- **2GB RAM** for smooth operation
- **Stable WiFi/Mobile** internet connection

## 🔐 **Security Notes**

### **Permissions Used:**
- **Bluetooth**: For BLE beacon transmission
- **Location**: Required for BLE functionality
- **Camera**: For QR code scanning
- **Internet**: For server communication
- **Wake Lock**: For background beacon service

### **Data Security:**
- All communication uses HTTPS (in production)
- Authentication tokens are securely stored
- No sensitive data stored in plain text
- BLE beacons use encrypted signatures

## 📦 **APK Variants**

### **Debug APK:**
- **File**: `app-debug.apk`
- **Size**: ~15-20MB
- **Features**: Full logging, debugging enabled
- **Use**: Development and testing

### **Release APK:**
- **File**: `darbaan-attendance.apk`
- **Size**: ~10-15MB (optimized)
- **Features**: Optimized, no debug logs
- **Use**: Production deployment

## 🚀 **Quick Build Commands**

```bash
# Debug build (for testing)
./gradlew assembleDebug

# Release build (for production)
./gradlew assembleRelease

# Clean build
./gradlew clean assembleRelease

# Install on connected device
./gradlew installDebug

# Run tests
./gradlew test
```

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Verify server is running and accessible
3. Ensure all permissions are granted
4. Check device compatibility requirements

The APK will be generated in the `app/build/outputs/apk/` directory after successful build.