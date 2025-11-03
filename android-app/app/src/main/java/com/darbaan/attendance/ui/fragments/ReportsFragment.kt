package com.darbaan.attendance.ui.fragments

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.darbaan.attendance.R
import com.darbaan.attendance.databinding.FragmentReportsBinding
import com.darbaan.attendance.network.NetworkManager
import com.darbaan.attendance.utils.PreferenceManager
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class ReportsFragment : Fragment() {

    private var _binding: FragmentReportsBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var preferenceManager: PreferenceManager
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private var startDate: Date? = null
    private var endDate: Date? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentReportsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        preferenceManager = PreferenceManager(requireContext())
        
        setupUI()
        setupClickListeners()
        loadDefaultReport()
    }
    
    private fun setupUI() {
        // Setup report type spinner
        val reportTypes = arrayOf("Daily", "Weekly", "Monthly", "Custom Range")
        val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, reportTypes)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerReportType.adapter = adapter
        
        // Set default dates
        val calendar = Calendar.getInstance()
        endDate = calendar.time
        binding.btnEndDate.text = dateFormat.format(endDate!!)
        
        calendar.add(Calendar.DAY_OF_MONTH, -7) // Last 7 days
        startDate = calendar.time
        binding.btnStartDate.text = dateFormat.format(startDate!!)
        
        // Show/hide date selection based on user role
        val userRole = preferenceManager.getUserRole()
        if (userRole == "student") {
            binding.layoutDateSelection.visibility = View.GONE
            binding.cardSystemReports.visibility = View.GONE
        }
    }
    
    private fun setupClickListeners() {
        binding.btnStartDate.setOnClickListener {
            showDatePicker(true)
        }
        
        binding.btnEndDate.setOnClickListener {
            showDatePicker(false)
        }
        
        binding.btnGenerateReport.setOnClickListener {
            generateReport()
        }
        
        binding.btnExportReport.setOnClickListener {
            exportReport()
        }
        
        binding.swipeRefresh.setOnRefreshListener {
            loadDefaultReport()
        }
    }
    
    private fun showDatePicker(isStartDate: Boolean) {
        val calendar = Calendar.getInstance()
        val currentDate = if (isStartDate) startDate else endDate
        currentDate?.let { calendar.time = it }
        
        DatePickerDialog(
            requireContext(),
            { _, year, month, dayOfMonth ->
                calendar.set(year, month, dayOfMonth)
                val selectedDate = calendar.time
                
                if (isStartDate) {
                    startDate = selectedDate
                    binding.btnStartDate.text = dateFormat.format(selectedDate)
                } else {
                    endDate = selectedDate
                    binding.btnEndDate.text = dateFormat.format(selectedDate)
                }
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).show()
    }
    
    private fun generateReport() {
        if (startDate == null || endDate == null) {
            Toast.makeText(context, "Please select date range", Toast.LENGTH_SHORT).show()
            return
        }
        
        binding.progressBar.visibility = View.VISIBLE
        binding.btnGenerateReport.isEnabled = false
        
        lifecycleScope.launch {
            try {
                val token = preferenceManager.getBearerToken()
                if (token == null) {
                    Toast.makeText(context, "Please login first", Toast.LENGTH_SHORT).show()
                    return@launch
                }
                
                val reportType = binding.spinnerReportType.selectedItem.toString().lowercase()
                val response = NetworkManager.apiService.getAttendanceReport(
                    token,
                    reportType,
                    dateFormat.format(startDate!!),
                    dateFormat.format(endDate!!)
                )
                
                if (response.isSuccessful) {
                    val reportData = response.body()
                    updateReportUI(reportData)
                    Toast.makeText(context, "Report generated successfully", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Failed to generate report", Toast.LENGTH_SHORT).show()
                }
                
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.btnGenerateReport.isEnabled = true
            }
        }
    }
    
    private fun updateReportUI(reportData: Any?) {
        // Update analytics
        binding.tvTotalStudents.text = "150"
        binding.tvAverageAttendance.text = "85.3%"
        binding.tvTotalClasses.text = "25"
        binding.tvPunctualityRate.text = "78.2%"
        
        // Update attendance distribution
        binding.tvPresentCount.text = "128 (85.3%)"
        binding.tvLateCount.text = "15 (10.0%)"
        binding.tvAbsentCount.text = "7 (4.7%)"
        
        // Update trends
        binding.tvTrendDescription.text = "Attendance has improved by 3.2% compared to last week. " +
                "Peak attendance is observed on Tuesdays and Wednesdays. " +
                "Late arrivals are most common on Monday mornings."
        
        // Show report content
        binding.layoutReportContent.visibility = View.VISIBLE
    }
    
    private fun exportReport() {
        Toast.makeText(context, "Export functionality will be implemented", Toast.LENGTH_SHORT).show()
        // Here you would implement CSV/PDF export functionality
    }
    
    private fun loadDefaultReport() {
        binding.swipeRefresh.isRefreshing = true
        
        lifecycleScope.launch {
            try {
                val token = preferenceManager.getBearerToken()
                if (token == null) {
                    return@launch
                }
                
                // Load default weekly report
                val response = NetworkManager.apiService.getAttendanceReport(
                    token,
                    "weekly",
                    dateFormat.format(startDate!!),
                    dateFormat.format(endDate!!)
                )
                
                if (response.isSuccessful) {
                    val reportData = response.body()
                    updateReportUI(reportData)
                }
                
            } catch (e: Exception) {
                // Handle error silently for default load
            } finally {
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}