package com.darbaan.attendance.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.darbaan.attendance.MainActivity
import com.darbaan.attendance.databinding.ActivityLoginBinding
import com.darbaan.attendance.network.LoginRequest
import com.darbaan.attendance.network.NetworkManager
import com.darbaan.attendance.utils.PreferenceManager
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityLoginBinding
    private lateinit var preferenceManager: PreferenceManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        preferenceManager = PreferenceManager(this)
        
        setupUI()
        setupClickListeners()
    }
    
    private fun setupUI() {
        // Pre-fill server URL if available
        val savedServerUrl = preferenceManager.getServerUrl()
        if (savedServerUrl.isNotEmpty()) {
            binding.etServerUrl.setText(savedServerUrl)
        }
        
        // Hide progress bar initially
        binding.progressBar.visibility = View.GONE
    }
    
    private fun setupClickListeners() {
        binding.btnLogin.setOnClickListener {
            performLogin()
        }
        
        binding.btnTestConnection.setOnClickListener {
            testServerConnection()
        }
    }
    
    private fun performLogin() {
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()
        val serverUrl = binding.etServerUrl.text.toString().trim()
        
        // Validate inputs
        if (email.isEmpty()) {
            binding.etEmail.error = "Email is required"
            return
        }
        
        if (password.isEmpty()) {
            binding.etPassword.error = "Password is required"
            return
        }
        
        if (serverUrl.isEmpty()) {
            binding.etServerUrl.error = "Server URL is required"
            return
        }
        
        // Update server URL
        val formattedUrl = formatServerUrl(serverUrl)
        preferenceManager.setServerUrl(formattedUrl)
        NetworkManager.updateBaseUrl(formattedUrl)
        
        // Show loading
        setLoading(true)
        
        // Perform login
        lifecycleScope.launch {
            try {
                val loginRequest = LoginRequest(email, password)
                val response = NetworkManager.apiService.login(loginRequest)
                
                if (response.isSuccessful) {
                    val loginResponse = response.body()
                    if (loginResponse?.success == true && loginResponse.token != null && loginResponse.user != null) {
                        // Save user data
                        val user = loginResponse.user
                        preferenceManager.setUserData(
                            userId = user.id,
                            email = user.email,
                            name = "${user.firstName} ${user.lastName}",
                            role = user.role,
                            token = loginResponse.token
                        )
                        
                        // Navigate to main activity
                        val intent = Intent(this@LoginActivity, MainActivity::class.java)
                        startActivity(intent)
                        finish()
                        
                    } else {
                        showError(loginResponse?.message ?: "Login failed")
                    }
                } else {
                    showError("Login failed: ${response.code()} ${response.message()}")
                }
                
            } catch (e: Exception) {
                showError("Network error: ${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }
    
    private fun testServerConnection() {
        val serverUrl = binding.etServerUrl.text.toString().trim()
        
        if (serverUrl.isEmpty()) {
            binding.etServerUrl.error = "Server URL is required"
            return
        }
        
        val formattedUrl = formatServerUrl(serverUrl)
        NetworkManager.updateBaseUrl(formattedUrl)
        
        setLoading(true)
        
        lifecycleScope.launch {
            try {
                val response = NetworkManager.apiService.healthCheck()
                if (response.isSuccessful) {
                    Toast.makeText(this@LoginActivity, "✓ Server connection successful", Toast.LENGTH_SHORT).show()
                    preferenceManager.setServerUrl(formattedUrl)
                } else {
                    showError("Server connection failed: ${response.code()}")
                }
            } catch (e: Exception) {
                showError("Connection error: ${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }
    
    private fun formatServerUrl(url: String): String {
        var formattedUrl = url.trim()
        
        // Add protocol if missing
        if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
            formattedUrl = "http://$formattedUrl"
        }
        
        // Add API path if missing
        if (!formattedUrl.endsWith("/api/") && !formattedUrl.endsWith("/api")) {
            formattedUrl = if (formattedUrl.endsWith("/")) {
                "${formattedUrl}api/"
            } else {
                "$formattedUrl/api/"
            }
        }
        
        return formattedUrl
    }
    
    private fun setLoading(isLoading: Boolean) {
        binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        binding.btnLogin.isEnabled = !isLoading
        binding.btnTestConnection.isEnabled = !isLoading
        binding.etEmail.isEnabled = !isLoading
        binding.etPassword.isEnabled = !isLoading
        binding.etServerUrl.isEnabled = !isLoading
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}