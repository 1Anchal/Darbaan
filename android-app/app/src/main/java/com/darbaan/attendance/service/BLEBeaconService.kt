package com.darbaan.attendance.service

import android.app.*
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.darbaan.attendance.MainActivity
import com.darbaan.attendance.R
import com.darbaan.attendance.network.BeaconData
import com.darbaan.attendance.network.NetworkManager
import com.darbaan.attendance.utils.PreferenceManager
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
    private lateinit var preferenceManager: PreferenceManager
    
    companion object {
        private const val TAG = "BLEBeaconService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "beacon_service_channel"
        
        const val ACTION_START_BEACON = "com.darbaan.attendance.START_BEACON"
        const val ACTION_STOP_BEACON = "com.darbaan.attendance.STOP_BEACON"
        const val ACTION_UPDATE_LOCATION = "com.darbaan.attendance.UPDATE_LOCATION"
        
        const val EXTRA_USER_ID = "user_id"
        const val EXTRA_DEVICE_ID = "device_id"
        const val EXTRA_LOCATION = "location"
    }
    
    override fun onCreate() {
        super.onCreate()
        preferenceManager = PreferenceManager(this)
        initializeBluetooth()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_BEACON -> {
                userId = intent.getStringExtra(EXTRA_USER_ID) ?: preferenceManager.getUserId()
                deviceId = intent.getStringExtra(EXTRA_DEVICE_ID) ?: preferenceManager.getDeviceId()
                currentLocation = intent.getStringExtra(EXTRA_LOCATION) ?: preferenceManager.getCurrentLocation()
                
                if (userId != null && deviceId != null && currentLocation != null) {
                    startForegroundService()
                    startBeaconAdvertising()
                } else {
                    Log.e(TAG, "Missing required parameters for beacon service")
                    stopSelf()
                }
            }
            ACTION_STOP_BEACON -> {
                stopBeaconAdvertising()
                stopSelf()
            }
            ACTION_UPDATE_LOCATION -> {
                currentLocation = intent.getStringExtra(EXTRA_LOCATION)
                preferenceManager.setCurrentLocation(currentLocation ?: "")
            }
        }
        return START_STICKY
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Beacon Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Darbaan attendance beacon service"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun startForegroundService() {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Darbaan Attendance")
            .setContentText("Beacon service is running - Location: $currentLocation")
            .setSmallIcon(R.drawable.ic_bluetooth)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
        
        startForeground(NOTIFICATION_ID, notification)
    }
    
    private fun initializeBluetooth() {
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        bluetoothLeAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser
    }
    
    private fun startBeaconAdvertising() {
        if (bluetoothLeAdvertiser == null || isAdvertising) {
            Log.w(TAG, "Cannot start advertising: advertiser=$bluetoothLeAdvertiser, isAdvertising=$isAdvertising")
            return
        }
        
        try {
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .setConnectable(false)
                .setTimeout(0) // Advertise indefinitely
                .build()
            
            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(true)
                .addServiceUuid(UUID.fromString("0000180F-0000-1000-8000-00805F9B34FB"))
                .build()
            
            bluetoothLeAdvertiser?.startAdvertising(settings, data, advertiseCallback)
            
            // Start periodic beacon sending
            startPeriodicBeaconSending()
            
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception starting BLE advertising", e)
            stopSelf()
        }
    }
    
    private fun stopBeaconAdvertising() {
        try {
            bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
            isAdvertising = false
            serviceScope.coroutineContext.cancelChildren()
            Log.d(TAG, "BLE advertising stopped")
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception stopping BLE advertising", e)
        }
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
        if (userId == null || deviceId == null || currentLocation == null) {
            Log.w(TAG, "Cannot send beacon: missing required data")
            return
        }
        
        try {
            val beacon = BeaconData(
                deviceId = deviceId!!,
                bluetoothMac = getBluetoothMacAddress(),
                userId = userId!!,
                location = currentLocation!!,
                signalStrength = -50, // Mock signal strength
                sequenceNumber = ++sequenceNumber,
                batteryLevel = getBatteryLevel()
            )
            
            val response = NetworkManager.apiService.sendBeacon(beacon)
            if (response.isSuccessful) {
                Log.d(TAG, "Beacon sent successfully: seq=$sequenceNumber")
                updateNotification("Beacon active - Last sent: ${Date()}")
            } else {
                Log.e(TAG, "Failed to send beacon: ${response.code()} - ${response.message()}")
                updateNotification("Beacon error - Code: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending beacon", e)
            updateNotification("Beacon error - ${e.message}")
        }
    }
    
    private fun getBluetoothMacAddress(): String {
        return try {
            bluetoothAdapter?.address ?: "02:00:00:00:00:00"
        } catch (e: SecurityException) {
            "02:00:00:00:00:00" // Default MAC if permission denied
        }
    }
    
    private fun getBatteryLevel(): Int {
        // Get actual battery level
        return try {
            val batteryManager = getSystemService(Context.BATTERY_SERVICE) as android.os.BatteryManager
            batteryManager.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY)
        } catch (e: Exception) {
            85 // Default value
        }
    }
    
    private fun updateNotification(message: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Darbaan Attendance")
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_bluetooth)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
        
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
    
    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            super.onStartSuccess(settingsInEffect)
            isAdvertising = true
            Log.d(TAG, "BLE advertising started successfully")
            updateNotification("Beacon service active - Location: $currentLocation")
        }
        
        override fun onStartFailure(errorCode: Int) {
            super.onStartFailure(errorCode)
            isAdvertising = false
            Log.e(TAG, "BLE advertising failed with error: $errorCode")
            updateNotification("Beacon service failed - Error: $errorCode")
            
            // Stop service if advertising fails
            serviceScope.launch {
                delay(5000) // Wait 5 seconds then stop
                stopSelf()
            }
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        stopBeaconAdvertising()
        serviceScope.cancel()
        Log.d(TAG, "BLE Beacon Service destroyed")
    }
}