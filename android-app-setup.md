# Android App Setup for Darbaan Attendance System

## 🚀 **Creating the Android App**

### **Step 1: Create New Android Project**

1. **Open Android Studio**
2. **Create New Project:**
   - Choose "Empty Activity"
   - Name: "Darbaan Attendance"
   - Package: `com.darbaan.attendance`
   - Language: **Kotlin** (recommended) or Java
   - Minimum SDK: API 21 (Android 5.0)

### **Step 2: Add Required Dependencies**

Add to `app/build.gradle`:

```gradle
dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.10.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    
    // Networking
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'
    
    // Bluetooth Low Energy
    implementation 'no.nordicsemi.android:ble:2.6.1'
    
    // QR Code Scanner
    implementation 'com.journeyapps:zxing-android-embedded:4.3.0'
    implementation 'com.google.zxing:core:3.5.2'
    
    // Location Services
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    
    // Permissions
    implementation 'pub.devrel:easypermissions:3.0.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // ViewModel and LiveData
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    implementation 'androidx.lifecycle:lifecycle-livedata-ktx:2.7.0'
    
    // Navigation
    implementation 'androidx.navigation:navigation-fragment-ktx:2.7.5'
    implementation 'androidx.navigation:navigation-ui-ktx:2.7.5'
}
```

### **Step 3: Add Permissions**

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<uses-feature
    android:name="android.hardware.bluetooth_le"
    android:required="true" />
```

### **Step 4: Create API Service**

Create `ApiService.kt`:

```kotlin
package com.darbaan.attendance.network

import retrofit2.Response
import retrofit2.http.*

data class DeviceRegistrationRequest(
    val deviceId: String,
    val bluetoothMac: String,
    val deviceModel: String,
    val androidVersion: String,
    val appVersion: String,
    val deviceName: String? = null
)

data class BeaconData(
    val deviceId: String,
    val bluetoothMac: String,
    val userId: String,
    val location: String,
    val signalStrength: Int,
    val sequenceNumber: Long,
    val batteryLevel: Int? = null,
    val signature: String? = null
)

data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null
)

interface ApiService {
    @POST("mobile-device/register")
    suspend fun registerDevice(
        @Header("Authorization") token: String,
        @Body request: DeviceRegistrationRequest
    ): Response<ApiResponse<Any>>
    
    @POST("mobile-device/beacon")
    suspend fun sendBeacon(
        @Body beacon: BeaconData
    ): Response<ApiResponse<Any>>
    
    @GET("mobile-device/registration-qr")
    suspend fun getRegistrationQR(
        @Header("Authorization") token: String
    ): Response<ApiResponse<String>>
}
```

### **Step 5: Create Network Manager**

Create `NetworkManager.kt`:

```kotlin
package com.darbaan.attendance.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkManager {
    private const val BASE_URL = "http://10.0.2.2:3001/api/" // For emulator
    // Use your actual server IP for physical device: "http://192.168.1.100:3001/api/"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
```

### **Step 6: Create BLE Beacon Service**

Create `BLEBeaconService.kt`:

```kotlin
package com.darbaan.attendance.ble

import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.darbaan.attendance.network.BeaconData
import com.darbaan.attendance.network.NetworkManager
import kotlinx.coroutines.*
import java.util.*

class BLEBeaconService : Service() {
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeAdvertiser: BluetoothLeAdvertiser? = null
    private var isAdvertising = false
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private var sequenceNumber = 0L
    private var userId: String? = null
    private var deviceId: String? = null
    private var currentLocation: String? = null
    
    override fun onCreate() {
        super.onCreate()
        initializeBluetooth()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_BEACON -> {
                userId = intent.getStringExtra(EXTRA_USER_ID)
                deviceId = intent.getStringExtra(EXTRA_DEVICE_ID)
                currentLocation = intent.getStringExtra(EXTRA_LOCATION)
                startBeaconAdvertising()
            }
            ACTION_STOP_BEACON -> {
                stopBeaconAdvertising()
            }
            ACTION_UPDATE_LOCATION -> {
                currentLocation = intent.getStringExtra(EXTRA_LOCATION)
            }
        }
        return START_STICKY
    }
    
    private fun initializeBluetooth() {
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        bluetoothLeAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser
    }
    
    private fun startBeaconAdvertising() {
        if (bluetoothLeAdvertiser == null || isAdvertising) return
        
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
            .setConnectable(false)
            .build()
        
        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(true)
            .addServiceUuid(UUID.fromString("0000180F-0000-1000-8000-00805F9B34FB"))
            .build()
        
        bluetoothLeAdvertiser?.startAdvertising(settings, data, advertiseCallback)
        
        // Start periodic beacon sending
        startPeriodicBeaconSending()
    }
    
    private fun stopBeaconAdvertising() {
        bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
        isAdvertising = false
        serviceScope.coroutineContext.cancelChildren()
    }
    
    private fun startPeriodicBeaconSending() {
        serviceScope.launch {
            while (isAdvertising) {
                sendBeaconToServer()
                delay(30000) // Send every 30 seconds
            }
        }
    }
    
    private suspend fun sendBeaconToServer() {
        if (userId == null || deviceId == null || currentLocation == null) return
        
        try {
            val beacon = BeaconData(
                deviceId = deviceId!!,
                bluetoothMac = bluetoothAdapter?.address ?: "00:00:00:00:00:00",
                userId = userId!!,
                location = currentLocation!!,
                signalStrength = -50, // Mock signal strength
                sequenceNumber = ++sequenceNumber,
                batteryLevel = getBatteryLevel()
            )
            
            val response = NetworkManager.apiService.sendBeacon(beacon)
            if (response.isSuccessful) {
                Log.d(TAG, "Beacon sent successfully")
            } else {
                Log.e(TAG, "Failed to send beacon: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending beacon", e)
        }
    }
    
    private fun getBatteryLevel(): Int {
        // Implementation to get actual battery level
        return 85 // Mock value
    }
    
    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            super.onStartSuccess(settingsInEffect)
            isAdvertising = true
            Log.d(TAG, "BLE advertising started successfully")
        }
        
        override fun onStartFailure(errorCode: Int) {
            super.onStartFailure(errorCode)
            isAdvertising = false
            Log.e(TAG, "BLE advertising failed with error: $errorCode")
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        stopBeaconAdvertising()
        serviceScope.cancel()
    }
    
    companion object {
        private const val TAG = "BLEBeaconService"
        const val ACTION_START_BEACON = "com.darbaan.attendance.START_BEACON"
        const val ACTION_STOP_BEACON = "com.darbaan.attendance.STOP_BEACON"
        const val ACTION_UPDATE_LOCATION = "com.darbaan.attendance.UPDATE_LOCATION"
        const val EXTRA_USER_ID = "user_id"
        const val EXTRA_DEVICE_ID = "device_id"
        const val EXTRA_LOCATION = "location"
    }
}
```

### **Step 7: Create Main Activity**

Create `MainActivity.kt`:

```kotlin
package com.darbaan.attendance

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.darbaan.attendance.ble.BLEBeaconService
import com.darbaan.attendance.network.DeviceRegistrationRequest
import com.darbaan.attendance.network.NetworkManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {
    private lateinit var userIdInput: TextInputEditText
    private lateinit var locationInput: TextInputEditText
    private lateinit var registerButton: MaterialButton
    private lateinit var startBeaconButton: MaterialButton
    private lateinit var stopBeaconButton: MaterialButton
    
    private var isBeaconActive = false
    private val activityScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initializeViews()
        setupClickListeners()
        checkPermissions()
    }
    
    private fun initializeViews() {
        userIdInput = findViewById(R.id.userIdInput)
        locationInput = findViewById(R.id.locationInput)
        registerButton = findViewById(R.id.registerButton)
        startBeaconButton = findViewById(R.id.startBeaconButton)
        stopBeaconButton = findViewById(R.id.stopBeaconButton)
    }
    
    private fun setupClickListeners() {
        registerButton.setOnClickListener {
            registerDevice()
        }
        
        startBeaconButton.setOnClickListener {
            startBeaconService()
        }
        
        stopBeaconButton.setOnClickListener {
            stopBeaconService()
        }
    }
    
    private fun registerDevice() {
        val userId = userIdInput.text.toString().trim()
        if (userId.isEmpty()) {
            Toast.makeText(this, "Please enter User ID", Toast.LENGTH_SHORT).show()
            return
        }
        
        activityScope.launch {
            try {
                val request = DeviceRegistrationRequest(
                    deviceId = getDeviceId(),
                    bluetoothMac = getBluetoothMacAddress(),
                    deviceModel = Build.MODEL,
                    androidVersion = Build.VERSION.RELEASE,
                    appVersion = "1.0.0",
                    deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"
                )
                
                val response = NetworkManager.apiService.registerDevice(
                    "Bearer your-token-here", // You'll need to implement proper authentication
                    request
                )
                
                if (response.isSuccessful) {
                    Toast.makeText(this@MainActivity, "Device registered successfully!", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(this@MainActivity, "Registration failed: ${response.code()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
    
    private fun startBeaconService() {
        val userId = userIdInput.text.toString().trim()
        val location = locationInput.text.toString().trim()
        
        if (userId.isEmpty() || location.isEmpty()) {
            Toast.makeText(this, "Please enter User ID and Location", Toast.LENGTH_SHORT).show()
            return
        }
        
        val intent = Intent(this, BLEBeaconService::class.java).apply {
            action = BLEBeaconService.ACTION_START_BEACON
            putExtra(BLEBeaconService.EXTRA_USER_ID, userId)
            putExtra(BLEBeaconService.EXTRA_DEVICE_ID, getDeviceId())
            putExtra(BLEBeaconService.EXTRA_LOCATION, location)
        }
        
        startService(intent)
        isBeaconActive = true
        updateButtonStates()
        Toast.makeText(this, "Beacon service started", Toast.LENGTH_SHORT).show()
    }
    
    private fun stopBeaconService() {
        val intent = Intent(this, BLEBeaconService::class.java).apply {
            action = BLEBeaconService.ACTION_STOP_BEACON
        }
        
        startService(intent)
        isBeaconActive = false
        updateButtonStates()
        Toast.makeText(this, "Beacon service stopped", Toast.LENGTH_SHORT).show()
    }
    
    private fun updateButtonStates() {
        startBeaconButton.isEnabled = !isBeaconActive
        stopBeaconButton.isEnabled = isBeaconActive
    }
    
    private fun getDeviceId(): String {
        return Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
    }
    
    private fun getBluetoothMacAddress(): String {
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        return bluetoothManager.adapter?.address ?: "00:00:00:00:00:00"
    }
    
    private fun checkPermissions() {
        val permissions = mutableListOf<String>()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.addAll(listOf(
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            ))
        } else {
            permissions.addAll(listOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            ))
        }
        
        permissions.addAll(listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ))
        
        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (missingPermissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missingPermissions.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }
    
    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
    }
}
```

### **Step 8: Create Layout**

Create `res/layout/activity_main.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp">

    <com.google.android.material.textfield.TextInputLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginBottom="16dp">

        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/userIdInput"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="User ID" />

    </com.google.android.material.textfield.TextInputLayout>

    <com.google.android.material.textfield.TextInputLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginBottom="16dp">

        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/locationInput"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="Location (e.g., central-library)" />

    </com.google.android.material.textfield.TextInputLayout>

    <com.google.android.material.button.MaterialButton
        android:id="@+id/registerButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginBottom="16dp"
        android:text="Register Device" />

    <com.google.android.material.button.MaterialButton
        android:id="@+id/startBeaconButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginBottom="8dp"
        android:text="Start Beacon" />

    <com.google.android.material.button.MaterialButton
        android:id="@+id/stopBeaconButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Stop Beacon"
        android:enabled="false" />

</LinearLayout>
```

### **Step 9: Update AndroidManifest.xml**

Add the service to your `AndroidManifest.xml`:

```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:theme="@style/Theme.DarbaanAttendance">
    
    <activity
        android:name=".MainActivity"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity>
    
    <service
        android:name=".ble.BLEBeaconService"
        android:enabled="true"
        android:exported="false" />
        
</application>
```

## 🔧 **Testing the Integration**

### **1. Start the Web System:**
```bash
# Start backend
cd packages/backend && npm run dev

# Start frontend  
cd packages/frontend && npm run dev
```

### **2. Run Android App:**
1. Connect Android device or start emulator
2. Update `BASE_URL` in `NetworkManager.kt` with your computer's IP
3. Run the app from Android Studio
4. Register device and start beacon

### **3. Verify Integration:**
- Check web dashboard for mobile device registration
- Monitor beacon data in real-time
- Verify attendance tracking works

## 📋 **Next Steps**

1. **Add Authentication**: Implement proper login flow
2. **Add QR Scanner**: For easy device registration
3. **Improve UI**: Add better design and user experience
4. **Add Notifications**: Push notifications for attendance
5. **Location Detection**: Automatic location detection using GPS/WiFi
6. **Background Service**: Ensure beacon works in background

This setup creates a complete Android app that integrates with your existing Darbaan web system for mobile device-based attendance tracking.