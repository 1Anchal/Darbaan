import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { getRedisClient } from '../config/redis';
import { UserRole } from '../types';
import { attendanceRecordingService } from './attendanceRecordingService';

const prisma = new PrismaClient();

export interface DashboardMetrics {
  totalStudents: number;
  presentToday: number;
  lateArrivals: number;
  attendanceRate: number;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  userId?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AttendanceMetricsResponse {
  success: boolean;
  metrics: DashboardMetrics;
  lastUpdated: Date;
}

export interface NotificationResponse {
  success: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
}

export class DashboardService extends EventEmitter {
  private metricsCache: DashboardMetrics | null = null;
  private lastMetricsUpdate: Date | null = null;
  private cacheExpiryMinutes = 5; // Cache metrics for 5 minutes

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Get real-time dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Check if cached metrics are still valid
      if (this.metricsCache && this.lastMetricsUpdate) {
        const cacheAge = Date.now() - this.lastMetricsUpdate.getTime();
        const cacheExpiryMs = this.cacheExpiryMinutes * 60 * 1000;
        
        if (cacheAge < cacheExpiryMs) {
          return this.metricsCache;
        }
      }

      // Calculate fresh metrics
      const metrics = await this.calculateMetrics();
      
      // Update cache
      this.metricsCache = metrics;
      this.lastMetricsUpdate = new Date();
      
      // Cache in Redis for real-time access
      await this.cacheMetricsInRedis(metrics);
      
      this.emit('metricsUpdated', metrics);
      return metrics;

    } catch (error) {
      this.emit('metricsError', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user or system-wide
   */
  async getNotifications(userId?: string, limit: number = 20): Promise<NotificationItem[]> {
    try {
      const redisClient = getRedisClient();
      const notificationKey = userId ? `notifications:user:${userId}` : 'notifications:system';
      
      // Get notifications from Redis (stored as JSON strings)
      const notifications = await redisClient.lRange(notificationKey, 0, limit - 1);
      
      const parsedNotifications: NotificationItem[] = notifications.map(notification => 
        JSON.parse(notification)
      );

      return parsedNotifications;

    } catch (error) {
      this.emit('notificationError', { userId, error });
      throw error;
    }
  }

  /**
   * Add a new notification
   */
  async addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): Promise<NotificationItem> {
    try {
      const newNotification: NotificationItem = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        isRead: false
      };

      const redisClient = getRedisClient();
      const notificationKey = notification.userId 
        ? `notifications:user:${notification.userId}` 
        : 'notifications:system';

      // Add to Redis list (newest first)
      await redisClient.lPush(notificationKey, JSON.stringify(newNotification));
      
      // Keep only last 100 notifications
      await redisClient.lTrim(notificationKey, 0, 99);
      
      // Set expiry for user notifications (30 days)
      if (notification.userId) {
        await redisClient.expire(notificationKey, 30 * 24 * 60 * 60);
      }

      this.emit('notificationAdded', newNotification);
      return newNotification;

    } catch (error) {
      this.emit('notificationAddError', { notification, error });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId?: string): Promise<boolean> {
    try {
      const redisClient = getRedisClient();
      const notificationKey = userId ? `notifications:user:${userId}` : 'notifications:system';
      
      // Get all notifications
      const notifications = await redisClient.lRange(notificationKey, 0, -1);
      
      // Find and update the notification
      let updated = false;
      const updatedNotifications = notifications.map(notificationStr => {
        const notification: NotificationItem = JSON.parse(notificationStr);
        if (notification.id === notificationId) {
          notification.isRead = true;
          updated = true;
        }
        return JSON.stringify(notification);
      });

      if (updated) {
        // Replace the entire list
        await redisClient.del(notificationKey);
        if (updatedNotifications.length > 0) {
          await redisClient.lPush(notificationKey, ...updatedNotifications);
        }
      }

      return updated;

    } catch (error) {
      this.emit('markReadError', { notificationId, userId, error });
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(userId?: string): Promise<number> {
    try {
      const notifications = await this.getNotifications(userId, 100);
      return notifications.filter(n => !n.isRead).length;

    } catch (error) {
      this.emit('unreadCountError', { userId, error });
      throw error;
    }
  }

  /**
   * Clear all notifications for a user
   */
  async clearNotifications(userId?: string): Promise<boolean> {
    try {
      const redisClient = getRedisClient();
      const notificationKey = userId ? `notifications:user:${userId}` : 'notifications:system';
      
      const result = await redisClient.del(notificationKey);
      
      this.emit('notificationsCleared', { userId, cleared: result > 0 });
      return result > 0;

    } catch (error) {
      this.emit('clearNotificationsError', { userId, error });
      throw error;
    }
  }

  /**
   * Get real-time statistics aggregation
   */
  async getRealTimeStats(): Promise<{
    activeUsers: number;
    activeSessions: number;
    systemStatus: 'healthy' | 'warning' | 'error';
    lastUpdate: Date;
  }> {
    try {
      const activeSessions = attendanceRecordingService.getActiveSessions();
      const activeUsers = new Set(activeSessions.map(session => session.userId)).size;
      
      // Determine system status based on various factors
      let systemStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      
      // Check if there are any recent errors or warnings
      const recentNotifications = await this.getNotifications(undefined, 10);
      const hasErrors = recentNotifications.some(n => n.type === 'error' && 
        (Date.now() - n.timestamp.getTime()) < 30 * 60 * 1000); // Last 30 minutes
      const hasWarnings = recentNotifications.some(n => n.type === 'warning' && 
        (Date.now() - n.timestamp.getTime()) < 30 * 60 * 1000);

      if (hasErrors) {
        systemStatus = 'error';
      } else if (hasWarnings) {
        systemStatus = 'warning';
      }

      return {
        activeUsers,
        activeSessions: activeSessions.length,
        systemStatus,
        lastUpdate: new Date()
      };

    } catch (error) {
      this.emit('realTimeStatsError', error);
      throw error;
    }
  }

  /**
   * Force refresh of dashboard metrics
   */
  async refreshMetrics(): Promise<DashboardMetrics> {
    this.metricsCache = null;
    this.lastMetricsUpdate = null;
    return await this.getDashboardMetrics();
  }

  private async calculateMetrics(): Promise<DashboardMetrics> {
    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Get total number of students
      const totalStudents = await prisma.user.count({
        where: {
          role: UserRole.STUDENT,
          isActive: true
        }
      });

      // Get today's attendance statistics
      const todayStats = await attendanceRecordingService.calculateAttendanceStats(
        startOfDay,
        endOfDay
      );

      // Calculate metrics
      const metrics: DashboardMetrics = {
        totalStudents,
        presentToday: todayStats.presentCount,
        lateArrivals: todayStats.lateCount,
        attendanceRate: todayStats.attendanceRate
      };

      return metrics;

    } catch (error) {
      this.emit('calculateMetricsError', error);
      throw error;
    }
  }

  private async cacheMetricsInRedis(metrics: DashboardMetrics): Promise<void> {
    try {
      const redisClient = getRedisClient();
      const cacheKey = 'dashboard:metrics';
      
      await redisClient.setEx(
        cacheKey, 
        this.cacheExpiryMinutes * 60, 
        JSON.stringify({
          ...metrics,
          lastUpdated: this.lastMetricsUpdate
        })
      );

    } catch (error) {
      this.emit('cacheMetricsError', { metrics, error });
    }
  }

  private setupEventListeners(): void {
    // Listen to attendance events to trigger metric updates
    attendanceRecordingService.on('attendanceEventRecorded', () => {
      // Invalidate cache when new attendance is recorded
      this.metricsCache = null;
      this.lastMetricsUpdate = null;
    });

    attendanceRecordingService.on('sessionStarted', (session) => {
      this.addNotification({
        type: 'info',
        title: 'New Attendance Session',
        message: `User ${session.userId} started attendance session at ${session.location}`,
        priority: 'low'
      });
    });

    attendanceRecordingService.on('sessionEnded', (session) => {
      this.addNotification({
        type: 'info',
        title: 'Attendance Session Ended',
        message: `User ${session.userId} ended session. Duration: ${session.duration?.toFixed(1)} minutes`,
        priority: 'low'
      });
    });

    attendanceRecordingService.on('manualAttendanceMarked', (data) => {
      this.addNotification({
        type: 'info',
        title: 'Manual Attendance Marked',
        message: `Attendance manually marked for user ${data.record.userId}`,
        priority: 'medium'
      });
    });

    attendanceRecordingService.on('recordingError', (data) => {
      this.addNotification({
        type: 'error',
        title: 'Attendance Recording Error',
        message: `Failed to record attendance: ${data.error.message}`,
        priority: 'high'
      });
    });
  }
}

export const dashboardService = new DashboardService();