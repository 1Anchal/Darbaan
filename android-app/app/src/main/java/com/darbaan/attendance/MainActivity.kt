package com.darbaan.attendance

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.findNavController
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import com.darbaan.attendance.databinding.ActivityMainBinding
import com.darbaan.attendance.network.NetworkManager
import com.darbaan.attendance.service.BLEBeaconService
import com.darbaan.attendance.ui.LoginActivity
import com.darbaan.attendance.ui.QRScanActivity
import com.darbaan.attendance.utils.PreferenceManager
import com.google.android.material.bottomnavigation.BottomNavigationView
import kotlinx.coroutines.launch
import pub.devrel.easypermissions.EasyPermissions

class MainActivity : AppCompatActivity(), EasyPermissions.PermissionCallbacks {

    private lateinit var binding: ActivityMainBinding
    private lateinit var preferenceManager: PreferenceManager
    
    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
        private const val QR_SCAN_REQUEST_CODE = 1002
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        preferenceManager = PreferenceManager(this)
        
        // Check if user is logged in
        if (!preferenceManager.isLoggedIn()) {
            startLoginActivity()
            return
        }
        
        setupNavigation()
        checkPermissions()
        setupNetworkManager()
    }
    
    private fun startLoginActivity() {
        val intent = Intent(this, LoginActivity::class.java)
        startActivity(intent)
        finish()
    }
    
    private fun setupNavigation() {
        val navView: BottomNavigationView = binding.navView
        val navController = findNavController(R.id.nav_host_fragment_activity_main)
        
        val appBarConfiguration = AppBarConfiguration(
            setOf(
                R.id.navigation_dashboard,
                R.id.navigation_home,
                R.id.navigation_attendance,
                R.id.navigation_reports,
                R.id.navigation_settings
            )
        )
        
        setupActionBarWithNavController(navController, appBarConfiguration)
        navView.setupWithNavController(navController)
    }
    
    private fun setupNetworkManager() {
        val serverUrl = preferenceManager.getServerUrl()
        if (serverUrl.isNotEmpty()) {
            NetworkManager.updateBaseUrl(serverUrl)
        }
    }
    
    private fun checkPermissions() {
        val permissions = mutableListOf<String>()
        
        // Bluetooth permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.addAll(listOf(
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            ))
        } else {
            permissions.addAll(listOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            ))
        }
        
        // Location permissions
        permissions.addAll(listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ))
        
        // Camera permission for QR scanning
        permissions.add(Manifest.permission.CAMERA)
        
        if (!EasyPermissions.hasPermissions(this, *permissions.toTypedArray())) {
            EasyPermissions.requestPermissions(
                this,
                "This app needs Bluetooth, Location, and Camera permissions to function properly.",
                PERMISSION_REQUEST_CODE,
                *permissions.toTypedArray()
            )
        }
    }
    
    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_scan_qr -> {
                startQRScan()
                true
            }
            R.id.action_logout -> {
                logout()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
    
    private fun startQRScan() {
        if (EasyPermissions.hasPermissions(this, Manifest.permission.CAMERA)) {
            val intent = Intent(this, QRScanActivity::class.java)
            startActivityForResult(intent, QR_SCAN_REQUEST_CODE)
        } else {
            EasyPermissions.requestPermissions(
                this,
                "Camera permission is needed to scan QR codes.",
                PERMISSION_REQUEST_CODE,
                Manifest.permission.CAMERA
            )
        }
    }
    
    private fun logout() {
        // Stop beacon service if running
        stopBeaconService()
        
        // Clear preferences
        preferenceManager.logout()
        
        // Start login activity
        startLoginActivity()
    }
    
    private fun stopBeaconService() {
        val intent = Intent(this, BLEBeaconService::class.java)
        intent.action = BLEBeaconService.ACTION_STOP_BEACON
        startService(intent)
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == QR_SCAN_REQUEST_CODE && resultCode == RESULT_OK) {
            val qrData = data?.getStringExtra("qr_data")
            if (qrData != null) {
                handleQRData(qrData)
            }
        }
    }
    
    private fun handleQRData(qrData: String) {
        try {
            // Parse QR data and handle device registration
            lifecycleScope.launch {
                // Implementation for handling QR registration data
                Toast.makeText(this@MainActivity, "QR Code scanned successfully", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Invalid QR code", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onPermissionsGranted(requestCode: Int, perms: MutableList<String>) {
        Toast.makeText(this, "Permissions granted", Toast.LENGTH_SHORT).show()
    }
    
    override fun onPermissionsDenied(requestCode: Int, perms: MutableList<String>) {
        Toast.makeText(this, "Some permissions were denied. App may not work properly.", Toast.LENGTH_LONG).show()
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        EasyPermissions.onRequestPermissionsResult(requestCode, permissions, grantResults, this)
    }
}