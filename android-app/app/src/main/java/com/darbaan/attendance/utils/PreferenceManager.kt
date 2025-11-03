package com.darbaan.attendance.utils

import android.content.Context
import android.content.SharedPreferences
import android.provider.Settings

class PreferenceManager(context: Context) {
    
    private val preferences: SharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    private val context = context.applicationContext
    
    companion object {
        private const val PREF_NAME = "darbaan_preferences"
        
        // Keys
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_ROLE = "user_role"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_REGISTERED = "device_registered"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_CURRENT_LOCATION = "current_location"
        private const val KEY_BEACON_ACTIVE = "beacon_active"
        private const val KEY_AUTO_START_BEACON = "auto_start_beacon"
    }
    
    // Authentication
    fun setLoggedIn(isLoggedIn: Boolean) {
        preferences.edit().putBoolean(KEY_IS_LOGGED_IN, isLoggedIn).apply()
    }
    
    fun isLoggedIn(): Boolean {
        return preferences.getBoolean(KEY_IS_LOGGED_IN, false)
    }
    
    fun setUserData(userId: String, email: String, name: String, role: String, token: String) {
        preferences.edit().apply {
            putString(KEY_USER_ID, userId)
            putString(KEY_USER_EMAIL, email)
            putString(KEY_USER_NAME, name)
            putString(KEY_USER_ROLE, role)
            putString(KEY_AUTH_TOKEN, token)
            putBoolean(KEY_IS_LOGGED_IN, true)
        }.apply()
    }
    
    fun getUserId(): String? {
        return preferences.getString(KEY_USER_ID, null)
    }
    
    fun getUserEmail(): String? {
        return preferences.getString(KEY_USER_EMAIL, null)
    }
    
    fun getUserName(): String? {
        return preferences.getString(KEY_USER_NAME, null)
    }
    
    fun getUserRole(): String? {
        return preferences.getString(KEY_USER_ROLE, null)
    }
    
    fun getAuthToken(): String? {
        return preferences.getString(KEY_AUTH_TOKEN, null)
    }
    
    fun getBearerToken(): String? {
        val token = getAuthToken()
        return if (token != null) "Bearer $token" else null
    }
    
    // Device Management
    fun getDeviceId(): String {
        var deviceId = preferences.getString(KEY_DEVICE_ID, null)
        if (deviceId == null) {
            deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            preferences.edit().putString(KEY_DEVICE_ID, deviceId).apply()
        }
        return deviceId
    }
    
    fun setDeviceRegistered(isRegistered: Boolean) {
        preferences.edit().putBoolean(KEY_DEVICE_REGISTERED, isRegistered).apply()
    }
    
    fun isDeviceRegistered(): Boolean {
        return preferences.getBoolean(KEY_DEVICE_REGISTERED, false)
    }
    
    // Server Configuration
    fun setServerUrl(url: String) {
        preferences.edit().putString(KEY_SERVER_URL, url).apply()
    }
    
    fun getServerUrl(): String {
        return preferences.getString(KEY_SERVER_URL, "http://10.0.2.2:3001/api/") ?: "http://10.0.2.2:3001/api/"
    }
    
    // Location Management
    fun setCurrentLocation(location: String) {
        preferences.edit().putString(KEY_CURRENT_LOCATION, location).apply()
    }
    
    fun getCurrentLocation(): String? {
        return preferences.getString(KEY_CURRENT_LOCATION, null)
    }
    
    // Beacon Management
    fun setBeaconActive(isActive: Boolean) {
        preferences.edit().putBoolean(KEY_BEACON_ACTIVE, isActive).apply()
    }
    
    fun isBeaconActive(): Boolean {
        return preferences.getBoolean(KEY_BEACON_ACTIVE, false)
    }
    
    fun setAutoStartBeacon(autoStart: Boolean) {
        preferences.edit().putBoolean(KEY_AUTO_START_BEACON, autoStart).apply()
    }
    
    fun shouldAutoStartBeacon(): Boolean {
        return preferences.getBoolean(KEY_AUTO_START_BEACON, false)
    }
    
    // Logout
    fun logout() {
        preferences.edit().apply {
            putBoolean(KEY_IS_LOGGED_IN, false)
            remove(KEY_USER_ID)
            remove(KEY_USER_EMAIL)
            remove(KEY_USER_NAME)
            remove(KEY_USER_ROLE)
            remove(KEY_AUTH_TOKEN)
            remove(KEY_DEVICE_REGISTERED)
            remove(KEY_CURRENT_LOCATION)
            putBoolean(KEY_BEACON_ACTIVE, false)
        }.apply()
    }
    
    // Clear all data
    fun clearAll() {
        preferences.edit().clear().apply()
    }
    
    // Get all preferences for debugging
    fun getAllPreferences(): Map<String, *> {
        return preferences.all
    }
    
    // Additional settings for new features
    fun getNotificationsEnabled(): Boolean {
        return preferences.getBoolean("notifications_enabled", true)
    }
    
    fun setNotificationsEnabled(enabled: Boolean) {
        preferences.edit().putBoolean("notifications_enabled", enabled).apply()
    }
    
    fun getAutoSyncEnabled(): Boolean {
        return preferences.getBoolean("auto_sync_enabled", true)
    }
    
    fun setAutoSyncEnabled(enabled: Boolean) {
        preferences.edit().putBoolean("auto_sync_enabled", enabled).apply()
    }
    
    fun getOfflineModeEnabled(): Boolean {
        return preferences.getBoolean("offline_mode_enabled", false)
    }
    
    fun setOfflineModeEnabled(enabled: Boolean) {
        preferences.edit().putBoolean("offline_mode_enabled", enabled).apply()
    }
}