package com.darbaan.attendance.network

import retrofit2.Response
import retrofit2.http.*

// Data classes for API requests/responses
data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val success: Boolean,
    val token: String? = null,
    val user: User? = null,
    val message: String? = null
)

data class User(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val role: String,
    val studentId: String? = null
)

data class DeviceRegistrationRequest(
    val deviceId: String,
    val bluetoothMac: String,
    val deviceModel: String,
    val androidVersion: String,
    val appVersion: String,
    val deviceName: String? = null
)

data class DeviceRegistrationResponse(
    val message: String,
    val device: MobileDevice,
    val timestamp: String
)

data class MobileDevice(
    val id: String,
    val userId: String,
    val deviceId: String,
    val bluetoothMac: String,
    val deviceModel: String,
    val androidVersion: String,
    val appVersion: String,
    val isActive: Boolean,
    val lastSeen: String
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

data class BeaconResponse(
    val message: String,
    val timestamp: String
)

data class QRResponse(
    val qrData: String,
    val instructions: String,
    val timestamp: String
)

data class ApiResponse<T>(
    val success: Boolean = true,
    val data: T? = null,
    val message: String? = null,
    val error: String? = null
)

interface ApiService {
    
    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>
    
    @POST("mobile-device/register")
    suspend fun registerDevice(
        @Header("Authorization") token: String,
        @Body request: DeviceRegistrationRequest
    ): Response<DeviceRegistrationResponse>
    
    @POST("mobile-device/beacon")
    suspend fun sendBeacon(
        @Body beacon: BeaconData
    ): Response<BeaconResponse>
    
    @GET("mobile-device/registration-qr")
    suspend fun getRegistrationQR(
        @Header("Authorization") token: String
    ): Response<QRResponse>
    
    @GET("mobile-device/user")
    suspend fun getUserDevices(
        @Header("Authorization") token: String
    ): Response<ApiResponse<List<MobileDevice>>>
    
    @DELETE("mobile-device/device/{deviceId}")
    suspend fun deactivateDevice(
        @Header("Authorization") token: String,
        @Path("deviceId") deviceId: String
    ): Response<ApiResponse<String>>
    
    @GET("health")
    suspend fun healthCheck(): Response<ApiResponse<String>>
    
    // Additional endpoints for full feature support
    @GET("attendance/history")
    suspend fun getAttendanceHistory(
        @Header("Authorization") token: String
    ): Response<List<Any>>
    
    @POST("attendance/submit")
    suspend fun submitAttendance(
        @Header("Authorization") token: String,
        @Body request: Map<String, Any>
    ): Response<Any>
    
    @GET("dashboard/metrics")
    suspend fun getDashboardMetrics(
        @Header("Authorization") token: String
    ): Response<Any>
    
    @GET("reports/attendance")
    suspend fun getAttendanceReport(
        @Header("Authorization") token: String,
        @Query("type") type: String,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<Any>
    
    @GET("settings/user")
    suspend fun getUserSettings(
        @Header("Authorization") token: String
    ): Response<Any>
    
    @POST("sync/user-data")
    suspend fun syncUserData(
        @Header("Authorization") token: String
    ): Response<Any>
    
    @GET("health")
    suspend fun testConnection(): Response<Any>
}