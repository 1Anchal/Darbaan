import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface SystemHealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  details?: any;
  error?: string;
}

export interface SystemHealthSummary {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  totalServices: number;
  healthyServices: number;
  lastCheck: string;
  services: SystemHealthCheck[];
}

export interface SystemIntegrationStats {
  totalConnectedUsers: number;
  activeAttendanceSessions: number;
  bleDevicesActive: number;
  crowdMonitoringLocations: number;
  realTimeUpdatesPerMinute: number;
  lastSystemCheck: string;
}

export interface WorkflowTestResult {
  userRole: string;
  timestamp: string;
  tests: Array<{
    name: string;
    status: 'passed' | 'failed' | 'degraded';
    details?: any;
    error?: string;
  }>;
  overallStatus: 'passed' | 'failed';
}

export interface RealTimeSystemStatus {
  timestamp: string;
  systemHealth: {
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    services: Array<{
      service: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastCheck: string;
    }>;
  };
  integrationStats: SystemIntegrationStats;
  activeConnections: {
    websocketConnections: number;
    attendanceSessions: number;
    bleDevices: number;
  };
}

class SystemIntegrationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealthSummary> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/system-integration/health`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching system health:', error);
      throw new Error('Failed to fetch system health status');
    }
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats(): Promise<SystemIntegrationStats> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/system-integration/stats`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching integration stats:', error);
      throw new Error('Failed to fetch integration statistics');
    }
  }

  /**
   * Test user workflow for specific role
   */
  async testUserWorkflow(role: 'student' | 'faculty' | 'admin'): Promise<WorkflowTestResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/system-integration/test-workflow/${role}`,
        {},
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error testing user workflow:', error);
      throw new Error(`Failed to test ${role} workflow`);
    }
  }

  /**
   * Get real-time system status
   */
  async getRealTimeSystemStatus(): Promise<RealTimeSystemStatus> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/system-integration/realtime-status`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching real-time system status:', error);
      throw new Error('Failed to fetch real-time system status');
    }
  }

  /**
   * Force system health check
   */
  async forceHealthCheck(): Promise<{ message: string; timestamp: string; results: SystemHealthCheck[] }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/system-integration/health/check`,
        {},
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error forcing health check:', error);
      throw new Error('Failed to perform system health check');
    }
  }

  /**
   * Get system status color based on health
   */
  getStatusColor(status: 'healthy' | 'degraded' | 'unhealthy'): string {
    switch (status) {
      case 'healthy':
        return '#4caf50'; // Green
      case 'degraded':
        return '#ff9800'; // Orange
      case 'unhealthy':
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Gray
    }
  }

  /**
   * Get status icon based on health
   */
  getStatusIcon(status: 'healthy' | 'degraded' | 'unhealthy'): string {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Calculate system uptime percentage
   */
  calculateUptimePercentage(services: SystemHealthCheck[]): number {
    if (services.length === 0) return 0;
    
    const healthyServices = services.filter(service => service.status === 'healthy').length;
    return Math.round((healthyServices / services.length) * 100);
  }

  /**
   * Get system performance grade
   */
  getPerformanceGrade(uptimePercentage: number): string {
    if (uptimePercentage >= 95) return 'A';
    if (uptimePercentage >= 90) return 'B';
    if (uptimePercentage >= 80) return 'C';
    if (uptimePercentage >= 70) return 'D';
    return 'F';
  }
}

export const systemIntegrationService = new SystemIntegrationService();