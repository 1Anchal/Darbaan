package com.darbaan.attendance.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.darbaan.attendance.R
import com.darbaan.attendance.network.NetworkManager
import com.darbaan.attendance.ui.QRScannerActivity
import com.darbaan.attendance.utils.PreferenceManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AttendanceFragment : Fragment() {
    
    private lateinit var preferenceManager: PreferenceManager
    private lateinit var attendanceRecyclerView: RecyclerView
    private lateinit var scanQRButton: MaterialButton
    private lateinit var noDataCard: MaterialCardView
    
    private val qrScannerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val qrData = result.data?.getStringExtra("qr_data")
            qrData?.let { handleQRData(it) }
        }
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_attendance, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        preferenceManager = PreferenceManager(requireContext())
        
        initViews(view)
        setupClickListeners()
        loadAttendanceHistory()
    }
    
    private fun initViews(view: View) {
        attendanceRecyclerView = view.findViewById(R.id.attendanceRecyclerView)
        scanQRButton = view.findViewById(R.id.scanQRButton)
        noDataCard = view.findViewById(R.id.noDataCard)
        
        attendanceRecyclerView.layoutManager = LinearLayoutManager(requireContext())
    }
    
    private fun setupClickListeners() {
        scanQRButton.setOnClickListener {
            launchQRScanner()
        }
    }
    
    private fun launchQRScanner() {
        val intent = Intent(requireContext(), QRScannerActivity::class.java)
        qrScannerLauncher.launch(intent)
    }
    
    private fun handleQRData(qrData: String) {
        // Process QR code data for attendance
        Toast.makeText(requireContext(), "QR Code scanned: $qrData", Toast.LENGTH_SHORT).show()
        
        // Here you would typically parse the QR data and submit attendance
        // For now, just show a success message
        submitAttendance(qrData)
    }
    
    private fun submitAttendance(qrData: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val token = preferenceManager.getAuthToken()
                if (token.isNullOrEmpty()) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(requireContext(), "Please login first", Toast.LENGTH_SHORT).show()
                    }
                    return@launch
                }
                
                // Submit attendance via API
                val response = NetworkManager.apiService.submitAttendance(
                    "Bearer $token",
                    mapOf(
                        "qrData" to qrData,
                        "timestamp" to System.currentTimeMillis(),
                        "deviceId" to preferenceManager.getDeviceId()
                    )
                )
                
                withContext(Dispatchers.Main) {
                    if (response.isSuccessful) {
                        Toast.makeText(requireContext(), "Attendance submitted successfully", Toast.LENGTH_SHORT).show()
                        loadAttendanceHistory() // Refresh the list
                    } else {
                        Toast.makeText(requireContext(), "Failed to submit attendance", Toast.LENGTH_SHORT).show()
                    }
                }
                
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(requireContext(), "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun loadAttendanceHistory() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val token = preferenceManager.getAuthToken()
                if (token.isNullOrEmpty()) {
                    return@launch
                }
                
                val response = NetworkManager.apiService.getAttendanceHistory("Bearer $token")
                
                withContext(Dispatchers.Main) {
                    if (response.isSuccessful) {
                        val attendanceList = response.body() ?: emptyList()
                        if (attendanceList.isEmpty()) {
                            showNoData()
                        } else {
                            showAttendanceList(attendanceList)
                        }
                    } else {
                        showNoData()
                    }
                }
                
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showNoData()
                }
            }
        }
    }
    
    private fun showNoData() {
        attendanceRecyclerView.visibility = View.GONE
        noDataCard.visibility = View.VISIBLE
    }
    
    private fun showAttendanceList(attendanceList: List<Any>) {
        noDataCard.visibility = View.GONE
        attendanceRecyclerView.visibility = View.VISIBLE
        
        // Here you would set up the RecyclerView adapter with the attendance data
        // For now, just show that data is available
        Toast.makeText(requireContext(), "Loaded ${attendanceList.size} attendance records", Toast.LENGTH_SHORT).show()
    }
}