package com.darbaan.attendance.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.darbaan.attendance.databinding.FragmentHomeBinding
import com.darbaan.attendance.network.DeviceRegistrationRequest
import com.darbaan.attendance.network.NetworkManager
import com.darbaan.attendance.service.BLEBeaconService
import com.darbaan.attendance.utils.PreferenceManager
import kotlinx.coroutines.launch
import android.os.Build

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var preferenceManager: PreferenceManager
    private var isBeaconActive = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        preferenceManager = PreferenceManager(requireContext())
        
        setupUI()
        setupClickListeners()
        updateUI()
    }
    
    private fun setupUI() {
        // Display user info
        val userName = preferenceManager.getUserName()
        val userRole = preferenceManager.getUserRole()
        
        binding.tvWelcome.text = "Welcome, $userName"
        binding.tvUserRole.text = "Role: ${userRole?.uppercase()}"
        
        // Display device info
        binding.tvDeviceId.text = "Device: ${preferenceManager.getDeviceId()}"
        binding.tvDeviceStatus.text = if (preferenceManager.isDeviceRegistered()) {
            "✓ Device Registered"
        } else {
            "⚠ Device Not Registered"
        }
        
        // Update beacon status
        isBeaconActive = preferenceManager.isBeaconActive()
        updateBeaconStatus()
    }
    
    private fun setupClickListeners() {
        binding.btnRegisterDevice.setOnClickListener {
            registerDevice()
        }
        
        binding.btnStartBeacon.setOnClickListener {
            startBeaconService()
        }
        
        binding.btnStopBeacon.setOnClickListener {
            stopBeaconService()
        }
        
        binding.spinnerLocation.setOnItemSelectedListener { _, _, position, _ ->
            val locations = arrayOf("food-street", "rock-plaza", "central-library", "main-auditorium")
            val selectedLocation = locations[position]
            preferenceManager.setCurrentLocation(selectedLocation)
            
            // Update beacon location if active
            if (isBeaconActive) {
                updateBeaconLocation(selectedLocation)
            }
        }
    }
    
    private fun registerDevice() {
        if (preferenceManager.isDeviceRegistered()) {
            Toast.makeText(context, "Device is already registered", Toast.LENGTH_SHORT).show()
            return
        }
        
        val token = preferenceManager.getBearerToken()
        if (token == null) {
            Toast.makeText(context, "Please login first", Toast.LENGTH_SHORT).show()
            return
        }
        
        binding.btnRegisterDevice.isEnabled = false
        binding.progressBar.visibility = View.VISIBLE
        
        lifecycleScope.launch {
            try {
                val request = DeviceRegistrationRequest(
                    deviceId = preferenceManager.getDeviceId(),
                    bluetoothMac = getBluetoothMacAddress(),
                    deviceModel = Build.MODEL,
                    androidVersion = Build.VERSION.RELEASE,
                    appVersion = "1.0.0",
                    deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"
                )
                
                val response = NetworkManager.apiService.registerDevice(token, request)
                
                if (response.isSuccessful) {
                    preferenceManager.setDeviceRegistered(true)
                    Toast.makeText(context, "Device registered successfully!", Toast.LENGTH_LONG).show()
                    updateUI()
                } else {
                    Toast.makeText(context, "Registration failed: ${response.code()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.btnRegisterDevice.isEnabled = true
                binding.progressBar.visibility = View.GONE
            }
        }
    }
    
    private fun startBeaconService() {
        val currentLocation = preferenceManager.getCurrentLocation()
        if (currentLocation.isNullOrEmpty()) {
            Toast.makeText(context, "Please select a location first", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (!preferenceManager.isDeviceRegistered()) {
            Toast.makeText(context, "Please register your device first", Toast.LENGTH_SHORT).show()
            return
        }
        
        val intent = Intent(context, BLEBeaconService::class.java).apply {
            action = BLEBeaconService.ACTION_START_BEACON
            putExtra(BLEBeaconService.EXTRA_USER_ID, preferenceManager.getUserId())
            putExtra(BLEBeaconService.EXTRA_DEVICE_ID, preferenceManager.getDeviceId())
            putExtra(BLEBeaconService.EXTRA_LOCATION, currentLocation)
        }
        
        requireContext().startService(intent)
        isBeaconActive = true
        preferenceManager.setBeaconActive(true)
        updateBeaconStatus()
        Toast.makeText(context, "Beacon service started", Toast.LENGTH_SHORT).show()
    }
    
    private fun stopBeaconService() {
        val intent = Intent(context, BLEBeaconService::class.java).apply {
            action = BLEBeaconService.ACTION_STOP_BEACON
        }
        
        requireContext().startService(intent)
        isBeaconActive = false
        preferenceManager.setBeaconActive(false)
        updateBeaconStatus()
        Toast.makeText(context, "Beacon service stopped", Toast.LENGTH_SHORT).show()
    }
    
    private fun updateBeaconLocation(location: String) {
        val intent = Intent(context, BLEBeaconService::class.java).apply {
            action = BLEBeaconService.ACTION_UPDATE_LOCATION
            putExtra(BLEBeaconService.EXTRA_LOCATION, location)
        }
        
        requireContext().startService(intent)
        Toast.makeText(context, "Location updated to: $location", Toast.LENGTH_SHORT).show()
    }
    
    private fun updateBeaconStatus() {
        if (isBeaconActive) {
            binding.tvBeaconStatus.text = "🟢 Beacon Active"
            binding.tvBeaconStatus.setTextColor(resources.getColor(R.color.success, null))
            binding.btnStartBeacon.isEnabled = false
            binding.btnStopBeacon.isEnabled = true
        } else {
            binding.tvBeaconStatus.text = "🔴 Beacon Inactive"
            binding.tvBeaconStatus.setTextColor(resources.getColor(R.color.error, null))
            binding.btnStartBeacon.isEnabled = true
            binding.btnStopBeacon.isEnabled = false
        }
        
        val currentLocation = preferenceManager.getCurrentLocation()
        binding.tvCurrentLocation.text = "Location: ${currentLocation ?: "Not set"}"
    }
    
    private fun updateUI() {
        setupUI()
    }
    
    private fun getBluetoothMacAddress(): String {
        // This is a simplified version - in production you'd get the actual MAC
        return "02:00:00:00:00:00"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}