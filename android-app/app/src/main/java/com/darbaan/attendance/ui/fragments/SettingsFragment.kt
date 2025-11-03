package com.darbaan.attendance.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.darbaan.attendance.databinding.FragmentSettingsBinding
import com.darbaan.attendance.network.NetworkManager
import com.darbaan.attendance.ui.LoginActivity
import com.darbaan.attendance.utils.PreferenceManager
import kotlinx.coroutines.launch

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var preferenceManager: PreferenceManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        preferenceManager = PreferenceManager(requireContext())
        
        setupUI()
        setupClickListeners()
        loadSettings()
    }
    
    private fun setupUI() {
        val userRole = preferenceManager.getUserRole()
        
        // Show/hide admin settings
        if (userRole != "admin") {
            binding.cardSystemSettings.visibility = View.GONE
            binding.cardSecuritySettings.visibility = View.GONE
        }
        
        // Load current values
        binding.etServerUrl.setText(preferenceManager.getServerUrl())
        binding.switchNotifications.isChecked = preferenceManager.getNotificationsEnabled()
        binding.switchAutoSync.isChecked = preferenceManager.getAutoSyncEnabled()
        binding.switchOfflineMode.isChecked = preferenceManager.getOfflineModeEnabled()
    }
    
    private fun setupClickListeners() {
        binding.btnTestConnection.setOnClickListener {
            testServerConnection()
        }
        
        binding.btnSaveSettings.setOnClickListener {
            saveSettings()
        }
        
        binding.btnSyncData.setOnClickListener {
            syncData()
        }
        
        binding.btnClearCache.setOnClickListener {
            clearCache()
        }
        
        binding.btnChangePassword.setOnClickListener {
            changePassword()
        }
        
        binding.btnLogout.setOnClickListener {
            logout()
        }
        
        binding.btnAbout.setOnClickListener {
            showAbout()
        }
        
        // Switch listeners
        binding.switchNotifications.setOnCheckedChangeListener { _, isChecked ->
            preferenceManager.setNotificationsEnabled(isChecked)
        }
        
        binding.switchAutoSync.setOnCheckedChangeListener { _, isChecked ->
            preferenceManager.setAutoSyncEnabled(isChecked)
        }
        
        binding.switchOfflineMode.setOnCheckedChangeListener { _, isChecked ->
            preferenceManager.setOfflineModeEnabled(isChecked)
        }
    }
    
    private fun testServerConnection() {
        val serverUrl = binding.etServerUrl.text.toString().trim()
        if (serverUrl.isEmpty()) {
            Toast.makeText(context, "Please enter server URL", Toast.LENGTH_SHORT).show()
            return
        }
        
        binding.btnTestConnection.isEnabled = false
        binding.progressBar.visibility = View.VISIBLE
        
        lifecycleScope.launch {
            try {
                // Update network manager with new URL
                NetworkManager.updateBaseUrl(serverUrl)
                
                // Test connection
                val response = NetworkManager.apiService.testConnection()
                
                if (response.isSuccessful) {
                    binding.tvConnectionStatus.text = "✓ Connection successful"
                    binding.tvConnectionStatus.setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
                    Toast.makeText(context, "Server connection successful", Toast.LENGTH_SHORT).show()
                } else {
                    binding.tvConnectionStatus.text = "✗ Connection failed"
                    binding.tvConnectionStatus.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                    Toast.makeText(context, "Server connection failed", Toast.LENGTH_SHORT).show()
                }
                
            } catch (e: Exception) {
                binding.tvConnectionStatus.text = "✗ Connection error"
                binding.tvConnectionStatus.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.btnTestConnection.isEnabled = true
                binding.progressBar.visibility = View.GONE
            }
        }
    }
    
    private fun saveSettings() {
        val serverUrl = binding.etServerUrl.text.toString().trim()
        
        if (serverUrl.isEmpty()) {
            Toast.makeText(context, "Server URL cannot be empty", Toast.LENGTH_SHORT).show()
            return
        }
        
        // Save settings
        preferenceManager.setServerUrl(serverUrl)
        NetworkManager.updateBaseUrl(serverUrl)
        
        Toast.makeText(context, "Settings saved successfully", Toast.LENGTH_SHORT).show()
    }
    
    private fun syncData() {
        binding.btnSyncData.isEnabled = false
        
        lifecycleScope.launch {
            try {
                val token = preferenceManager.getBearerToken()
                if (token == null) {
                    Toast.makeText(context, "Please login first", Toast.LENGTH_SHORT).show()
                    return@launch
                }
                
                // Perform data sync
                val response = NetworkManager.apiService.syncUserData(token)
                
                if (response.isSuccessful) {
                    Toast.makeText(context, "Data synchronized successfully", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Sync failed", Toast.LENGTH_SHORT).show()
                }
                
            } catch (e: Exception) {
                Toast.makeText(context, "Sync error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.btnSyncData.isEnabled = true
            }
        }
    }
    
    private fun clearCache() {
        try {
            // Clear app cache
            requireContext().cacheDir.deleteRecursively()
            Toast.makeText(context, "Cache cleared successfully", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(context, "Failed to clear cache", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun changePassword() {
        Toast.makeText(context, "Password change functionality will be implemented", Toast.LENGTH_SHORT).show()
        // Here you would implement password change dialog/activity
    }
    
    private fun logout() {
        preferenceManager.logout()
        
        val intent = Intent(requireContext(), LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        requireActivity().finish()
    }
    
    private fun showAbout() {
        val aboutText = """
            Darbaan Attendance System
            Version: 1.0.0
            
            A smart attendance management system using BLE technology.
            
            Features:
            • Automatic attendance tracking
            • BLE beacon technology
            • Real-time synchronization
            • Comprehensive reporting
            
            Developed for modern educational institutions.
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("About Darbaan")
            .setMessage(aboutText)
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun loadSettings() {
        // Load additional settings from server if needed
        lifecycleScope.launch {
            try {
                val token = preferenceManager.getBearerToken()
                if (token != null) {
                    val response = NetworkManager.apiService.getUserSettings(token)
                    if (response.isSuccessful) {
                        // Update UI with server settings
                    }
                }
            } catch (e: Exception) {
                // Handle error silently
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}