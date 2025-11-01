import { ApiResponse, DashboardMetrics, DashboardOverview, NotificationItem, RealTimeStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class DashboardService {
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

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await fetch(`${API_BASE_URL}/dashboard/metrics`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<{ success: boolean; metrics: DashboardMetrics }>(response);
    return data.metrics;
  }

  /**
   * Get real-time statistics
   */
  async getRealTimeStats(): Promise<RealTimeStats> {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats/realtime`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<{ success: boolean; stats: RealTimeStats }>(response);
    return data.stats;
  }

  /**
   * Get dashboard overview (combined metrics and stats)
   */
  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<{ success: boolean; overview: DashboardOverview }>(response);
    return data.overview;
  }

  /**
   * Get notifications
   */
  async getNotifications(limit: number = 20): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const response = await fetch(`${API_BASE_URL}/dashboard/notifications?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<{ 
      success: boolean; 
      notifications: NotificationItem[]; 
      unreadCount: number 
    }>(response);
    
    return {
      notifications: data.notifications,
      unreadCount: data.unreadCount
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/dashboard/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse<ApiResponse<void>>(response);
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/dashboard/notifications/unread-count`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<{ success: boolean; unreadCount: number }>(response);
    return data.unreadCount;
  }

  /**
   * Clear all notifications
   */
  async clearNotifications(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/dashboard/notifications`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse<ApiResponse<void>>(response);
  }

  /**
   * Add a new notification (admin only)
   */
  async addNotification(notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    userId?: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<NotificationItem> {
    const response = await fetch(`${API_BASE_URL}/dashboard/notifications`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(notification),
    });

    const data = await this.handleResponse<{ 
      success: boolean; 
      notification: NotificationItem 
    }>(response);
    
    return data.notification;
  }

  /**
   * Refresh dashboard metrics
   */
  async refreshMetrics(): Promise<DashboardMetrics> {
    const response = await fetch(`${API_BASE_URL}/dashboard/metrics/refresh`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<{ success: boolean; metrics: DashboardMetrics }>(response);
    return data.metrics;
  }
}

export const dashboardService = new DashboardService();