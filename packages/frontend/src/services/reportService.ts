import {
    ApiResponse,
    AttendanceAnalytics,
    AttendanceDistribution,
    AttendanceTrend,
    ReportFilters
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface ReportData {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  analytics: AttendanceAnalytics;
  trends: AttendanceTrend[];
  distribution: AttendanceDistribution;
  generatedAt: string;
  startDate?: string;
  endDate?: string;
  classId?: string;
}

class ReportService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  private buildQueryParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    
    return searchParams.toString();
  }

  /**
   * Get attendance analytics
   */
  async getAnalytics(filters: ReportFilters): Promise<AttendanceAnalytics> {
    const queryParams = this.buildQueryParams({
      type: filters.reportType,
      startDate: filters.startDate,
      endDate: filters.endDate,
      classId: filters.classId
    });

    const response = await fetch(`${API_BASE_URL}/reports/analytics?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ApiResponse<AttendanceAnalytics>>(response);
    return data.data!;
  }

  /**
   * Get attendance trends
   */
  async getTrends(filters: ReportFilters): Promise<AttendanceTrend[]> {
    const queryParams = this.buildQueryParams({
      type: filters.reportType,
      startDate: filters.startDate,
      endDate: filters.endDate,
      classId: filters.classId
    });

    const response = await fetch(`${API_BASE_URL}/reports/trends?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ApiResponse<AttendanceTrend[]>>(response);
    return data.data!;
  }

  /**
   * Get attendance distribution
   */
  async getDistribution(filters: ReportFilters): Promise<AttendanceDistribution> {
    const queryParams = this.buildQueryParams({
      type: filters.reportType,
      startDate: filters.startDate,
      endDate: filters.endDate,
      classId: filters.classId
    });

    const response = await fetch(`${API_BASE_URL}/reports/distribution?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ApiResponse<AttendanceDistribution>>(response);
    return data.data!;
  }

  /**
   * Generate daily report
   */
  async getDailyReport(date?: string, classId?: string): Promise<ReportData> {
    const queryParams = this.buildQueryParams({
      date,
      classId
    });

    const response = await fetch(`${API_BASE_URL}/reports/daily?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ApiResponse<ReportData>>(response);
    return data.data!;
  }

  /**
   * Generate weekly report
   */
  async getWeeklyReport(weekStartDate?: string, classId?: string): Promise<ReportData> {
    const queryParams = this.buildQueryParams({
      weekStartDate,
      classId
    });

    const response = await fetch(`${API_BASE_URL}/reports/weekly?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ApiResponse<ReportData>>(response);
    return data.data!;
  }

  /**
   * Generate monthly report
   */
  async getMonthlyReport(year?: number, month?: number, classId?: string): Promise<ReportData> {
    const queryParams = this.buildQueryParams({
      year,
      month,
      classId
    });

    const response = await fetch(`${API_BASE_URL}/reports/monthly?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ApiResponse<ReportData>>(response);
    return data.data!;
  }

  /**
   * Generate custom range report
   */
  async getCustomReport(startDate: string, endDate: string, classId?: string): Promise<ReportData> {
    const queryParams = this.buildQueryParams({
      startDate,
      endDate,
      classId
    });

    const response = await fetch(`${API_BASE_URL}/reports/custom?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ApiResponse<ReportData>>(response);
    return data.data!;
  }

  /**
   * Generate comprehensive report based on filters
   */
  async generateReport(filters: ReportFilters): Promise<ReportData> {
    switch (filters.reportType) {
      case 'daily':
        return this.getDailyReport(filters.startDate, filters.classId);
      
      case 'weekly':
        return this.getWeeklyReport(filters.startDate, filters.classId);
      
      case 'monthly':
        const date = filters.startDate ? new Date(filters.startDate) : new Date();
        return this.getMonthlyReport(date.getFullYear(), date.getMonth() + 1, filters.classId);
      
      case 'custom':
        if (!filters.startDate || !filters.endDate) {
          throw new Error('Start date and end date are required for custom reports');
        }
        return this.getCustomReport(filters.startDate, filters.endDate, filters.classId);
      
      default:
        throw new Error('Invalid report type');
    }
  }
}

export const reportService = new ReportService();