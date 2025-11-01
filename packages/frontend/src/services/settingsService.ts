import { SettingsCategory, SystemSettings } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface SettingsUpdateRequest {
  // General Settings
  systemName?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  enableBackups?: boolean;
  
  // Attendance Settings
  lateThresholdMins?: number;
  absentThresholdMins?: number;
  cooldownPeriodSecs?: number;
  enableManualEntry?: boolean;
  
  // Notification Settings
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  dailyReports?: boolean;
  securityAlerts?: boolean;
  
  // Security Settings
  sessionTimeoutMins?: number;
  passwordExpiryDays?: number;
  twoFactorAuth?: boolean;
  dataEncryption?: boolean;
  auditLogs?: boolean;
  
  // System Settings
  syncIntervalMins?: number;
  logLevel?: 'debug' | 'info' | 'warning' | 'error';
  autoSync?: boolean;
  offlineMode?: boolean;
  debugMode?: boolean;
}

class SettingsService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Get all settings
  async getAllSettings(): Promise<SystemSettings[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching all settings:', error);
      throw error;
    }
  }

  // Get settings by category
  async getSettingsByCategory(category: SettingsCategory): Promise<SystemSettings | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/${category}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error(`Error fetching ${category} settings:`, error);
      throw error;
    }
  }

  // Update General settings
  async updateGeneralSettings(updates: SettingsUpdateRequest): Promise<SystemSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/general`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating general settings:', error);
      throw error;
    }
  }

  // Update Attendance settings
  async updateAttendanceSettings(updates: SettingsUpdateRequest): Promise<SystemSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/attendance`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating attendance settings:', error);
      throw error;
    }
  }

  // Update Notification settings
  async updateNotificationSettings(updates: SettingsUpdateRequest): Promise<SystemSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/notifications`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  // Update Security settings
  async updateSecuritySettings(updates: SettingsUpdateRequest): Promise<SystemSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/security`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw error;
    }
  }

  // Update System settings
  async updateSystemSettings(updates: SettingsUpdateRequest): Promise<SystemSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/system`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  // Initialize default settings
  async initializeDefaultSettings(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/initialize`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error initializing default settings:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();