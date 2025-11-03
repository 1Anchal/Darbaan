package com.darbaan.attendance.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.darbaan.attendance.R
import com.darbaan.attendance.ui.LoginActivity
import com.darbaan.attendance.utils.PreferenceManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class ProfileFragment : Fragment() {
    
    private lateinit var preferenceManager: PreferenceManager
    private lateinit var userNameText: TextView
    private lateinit var userEmailText: TextView
    private lateinit var deviceIdText: TextView
    private lateinit var serverUrlText: TextView
    private lateinit var logoutButton: MaterialButton
    private lateinit var clearDataButton: MaterialButton
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_profile, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        preferenceManager = PreferenceManager(requireContext())
        
        initViews(view)
        setupClickListeners()
        loadUserData()
    }
    
    private fun initViews(view: View) {
        userNameText = view.findViewById(R.id.userNameText)
        userEmailText = view.findViewById(R.id.userEmailText)
        deviceIdText = view.findViewById(R.id.deviceIdText)
        serverUrlText = view.findViewById(R.id.serverUrlText)
        logoutButton = view.findViewById(R.id.logoutButton)
        clearDataButton = view.findViewById(R.id.clearDataButton)
    }
    
    private fun setupClickListeners() {
        logoutButton.setOnClickListener {
            showLogoutConfirmation()
        }
        
        clearDataButton.setOnClickListener {
            showClearDataConfirmation()
        }
    }
    
    private fun loadUserData() {
        // Load user information from preferences
        userNameText.text = preferenceManager.getUserName() ?: "Not Available"
        userEmailText.text = preferenceManager.getUserEmail() ?: "Not Available"
        deviceIdText.text = preferenceManager.getDeviceId() ?: "Not Generated"
        serverUrlText.text = preferenceManager.getServerUrl() ?: "Not Set"
    }
    
    private fun showLogoutConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout? This will stop the beacon service.")
            .setPositiveButton("Logout") { _, _ ->
                performLogout()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showClearDataConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Clear All Data")
            .setMessage("This will remove all stored data including login information and device registration. Are you sure?")
            .setPositiveButton("Clear") { _, _ ->
                clearAllData()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun performLogout() {
        // Clear authentication data but keep device info
        preferenceManager.clearAuthData()
        
        // Navigate to login screen
        val intent = Intent(requireContext(), LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        
        Toast.makeText(requireContext(), "Logged out successfully", Toast.LENGTH_SHORT).show()
    }
    
    private fun clearAllData() {
        // Clear all stored data
        preferenceManager.clearAllData()
        
        // Navigate to login screen
        val intent = Intent(requireContext(), LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        
        Toast.makeText(requireContext(), "All data cleared", Toast.LENGTH_SHORT).show()
    }
}