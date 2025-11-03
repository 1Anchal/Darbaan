package com.darbaan.attendance.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.darbaan.attendance.databinding.FragmentDashboardBinding
import com.darbaan.attendance.network.NetworkManager
import com.darbaan.attendance.utils.PreferenceManager
import kotlinx.coroutines.launch

class DashboardFragment : Fragment() {

    private var _binding: FragmentDashboardBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var preferenceManager: PreferenceManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        preferenceManager = PreferenceManager(requireContext())
        
        setupUI()
        loadDashboardData()
        setupRefreshListener()
    }
    
    private fun setupUI() {
        val userName = preferenceManager.getUserName()
        val userRole = preferenceManager.getUserRole()
        
        binding.tvWelcomeUser.text = "Welcome, $userName"
        binding.tvUserRole.text = userRole?.uppercase() ?: "STUDENT"
        
        // Show/hide features based on role
        when (userRole?.lowercase()) {
            "admin" -> {
                binding.cardSystemStats.visibility = View.VISIBLE
                binding.cardClassManagement.visibility = View.VISIBLE
                binding.cardStudentManagement.visibility = View.VISIBLE
            }
            "faculty" -> {
                binding.cardClassManagement.visibility = View.VISIBLE
                binding.cardStudentManagement.visibility = View.VISIBLE
                binding.cardSystemStats.visibility = View.GONE
            }
            else -> {
                binding.cardSystemStats.visibility = View.GONE
                binding.cardClassManagement.visibility = View.GONE
                binding.cardStudentManagement.visibility = View.GONE
            }
        }
    }
    
    private fun setupRefreshListener() {
        binding.swipeRefresh.setOnRefreshListener {
            loadDashboardData()
        }
    }
    
    private fun loadDashboardData() {
        binding.swipeRefresh.isRefreshing = true
        
        lifecycleScope.launch {
            try {
                val token = preferenceManager.getBearerToken()
                if (token == null) {
                    Toast.makeText(context, "Please login first", Toast.LENGTH_SHORT).show()
                    return@launch
                }
                
                // Load dashboard metrics
                val response = NetworkManager.apiService.getDashboardMetrics(token)
                
                if (response.isSuccessful) {
                    val metrics = response.body()
                    updateDashboardUI(metrics)
                } else {
                    Toast.makeText(context, "Failed to load dashboard data", Toast.LENGTH_SHORT).show()
                }
                
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }
    
    private fun updateDashboardUI(metrics: Any?) {
        // Update attendance metrics
        binding.tvTotalStudents.text = "150" // Replace with actual data
        binding.tvPresentToday.text = "128"
        binding.tvLateToday.text = "15"
        binding.tvAbsentToday.text = "7"
        binding.tvAttendanceRate.text = "85.3%"
        
        // Update system stats (for admin/faculty)
        binding.tvActiveDevices.text = "142"
        binding.tvTotalClasses.text = "25"
        binding.tvActiveLocations.text = "4"
        
        // Update personal stats (for students)
        binding.tvMyAttendanceRate.text = "92.5%"
        binding.tvMyTotalClasses.text = "8"
        binding.tvMyPresentDays.text = "37"
        
        // Update recent activity
        updateRecentActivity()
    }
    
    private fun updateRecentActivity() {
        val activities = listOf(
            "Attended Computer Science class at 09:00 AM",
            "Marked present in Mathematics at 11:00 AM", 
            "Late arrival recorded at Physics lab",
            "Beacon active in Central Library"
        )
        
        // Update recent activity list (you'd implement RecyclerView here)
        binding.tvRecentActivity.text = activities.joinToString("\n• ", "• ")
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}