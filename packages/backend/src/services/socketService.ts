import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { UserRole } from '../types';
import { attendanceRecordingService } from './attendanceRecordingService';
import { dashboardService } from './dashboardService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupServiceListeners();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected via Socket.io`);
      
      // Store connected user
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket);
      }

      // Join user to appropriate rooms based on role
      this.joinUserToRooms(socket);

      // Handle dashboard subscription
      socket.on('subscribe:dashboard', () => {
        socket.join('dashboard');
        console.log(`User ${socket.userId} subscribed to dashboard updates`);
      });

      // Handle attendance subscription
      socket.on('subscribe:attendance', () => {
        socket.join('attendance');
        console.log(`User ${socket.userId} subscribed to attendance updates`);
      });

      // Handle notifications subscription
      socket.on('subscribe:notifications', () => {
        socket.join('notifications');
        console.log(`User ${socket.userId} subscribed to notifications`);
      });

      // Handle crowd management subscription
      socket.on('subscribe:crowd', () => {
        socket.join('crowd');
        console.log(`User ${socket.userId} subscribed to crowd updates`);
      });

      // Handle real-time metrics request
      socket.on('request:metrics', async () => {
        try {
          const metrics = await dashboardService.getDashboardMetrics();
          socket.emit('metrics:update', metrics);
        } catch (error) {
          socket.emit('error', { message: 'Failed to fetch metrics' });
        }
      });

      // Handle real-time stats request
      socket.on('request:realtime-stats', async () => {
        try {
          const stats = await dashboardService.getRealTimeStats();
          socket.emit('realtime-stats:update', stats);
        } catch (error) {
          socket.emit('error', { message: 'Failed to fetch real-time stats' });
        }
      });

      // Handle notification mark as read
      socket.on('notification:mark-read', async (notificationId: string) => {
        try {
          const targetUserId = socket.userRole === UserRole.STUDENT ? socket.userId : undefined;
          await dashboardService.markNotificationAsRead(notificationId, targetUserId);
          
          // Broadcast to user's other sessions
          if (socket.userId) {
            this.io.to(`user:${socket.userId}`).emit('notification:marked-read', notificationId);
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected from Socket.io`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });
    });
  }

  private joinUserToRooms(socket: AuthenticatedSocket) {
    if (!socket.userId || !socket.userRole) return;

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-based rooms
    socket.join(`role:${socket.userRole}`);

    // Admin and faculty get access to all rooms
    if (socket.userRole === UserRole.ADMIN || socket.userRole === UserRole.FACULTY) {
      socket.join('dashboard');
      socket.join('attendance');
      socket.join('notifications');
      socket.join('crowd');
    }

    // Students get limited access
    if (socket.userRole === UserRole.STUDENT) {
      socket.join('notifications'); // Students can receive notifications
    }
  }

  private setupServiceListeners() {
    // Listen to attendance events
    attendanceRecordingService.on('attendanceEventRecorded', (event) => {
      this.io.to('attendance').emit('attendance:event', event);
      
      // Notify specific user
      this.io.to(`user:${event.userId}`).emit('attendance:personal-event', event);
    });

    attendanceRecordingService.on('sessionStarted', (session) => {
      this.io.to('attendance').emit('attendance:session-started', session);
      this.io.to(`user:${session.userId}`).emit('attendance:personal-session-started', session);
      
      // Update real-time metrics
      this.broadcastMetricsUpdate();
    });

    attendanceRecordingService.on('sessionEnded', (session) => {
      this.io.to('attendance').emit('attendance:session-ended', session);
      this.io.to(`user:${session.userId}`).emit('attendance:personal-session-ended', session);
      
      // Update real-time metrics
      this.broadcastMetricsUpdate();
    });

    attendanceRecordingService.on('manualAttendanceMarked', (data) => {
      this.io.to('attendance').emit('attendance:manual-marked', data);
      this.io.to(`user:${data.record.userId}`).emit('attendance:personal-manual-marked', data);
      
      // Update metrics
      this.broadcastMetricsUpdate();
    });

    // Listen to dashboard events
    dashboardService.on('notificationAdded', (notification) => {
      if (notification.userId) {
        // Send to specific user
        this.io.to(`user:${notification.userId}`).emit('notification:new', notification);
      } else {
        // Send to all users who can see system notifications
        this.io.to('notifications').emit('notification:new', notification);
      }
    });

    dashboardService.on('metricsUpdated', (metrics) => {
      this.io.to('dashboard').emit('metrics:update', metrics);
    });

    // Listen to errors and broadcast them
    attendanceRecordingService.on('recordingError', (error) => {
      this.io.to('role:admin').emit('system:error', {
        type: 'attendance_recording_error',
        message: error.error.message,
        timestamp: new Date()
      });
    });

    dashboardService.on('metricsError', (error) => {
      this.io.to('role:admin').emit('system:error', {
        type: 'metrics_error',
        message: error.message,
        timestamp: new Date()
      });
    });
  }

  /**
   * Broadcast updated metrics to all dashboard subscribers
   */
  private async broadcastMetricsUpdate() {
    try {
      const [metrics, realTimeStats] = await Promise.all([
        dashboardService.getDashboardMetrics(),
        dashboardService.getRealTimeStats()
      ]);

      this.io.to('dashboard').emit('metrics:update', metrics);
      this.io.to('dashboard').emit('realtime-stats:update', realTimeStats);
    } catch (error) {
      console.error('Failed to broadcast metrics update:', error);
    }
  }

  /**
   * Send notification to specific user
   */
  public sendNotificationToUser(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification:new', notification);
  }

  /**
   * Send notification to all users with specific role
   */
  public sendNotificationToRole(role: UserRole, notification: any) {
    this.io.to(`role:${role}`).emit('notification:new', notification);
  }

  /**
   * Broadcast system-wide notification
   */
  public broadcastNotification(notification: any) {
    this.io.to('notifications').emit('notification:new', notification);
  }

  /**
   * Send attendance update to specific user
   */
  public sendAttendanceUpdateToUser(userId: string, update: any) {
    this.io.to(`user:${userId}`).emit('attendance:update', update);
  }

  /**
   * Broadcast attendance update to all subscribers
   */
  public broadcastAttendanceUpdate(update: any) {
    this.io.to('attendance').emit('attendance:update', update);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get connected users by role
   */
  public getConnectedUsersByRole(role: UserRole): AuthenticatedSocket[] {
    return Array.from(this.connectedUsers.values()).filter(socket => socket.userRole === role);
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Force disconnect user
   */
  public disconnectUser(userId: string, reason?: string) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.disconnect(true);
      this.connectedUsers.delete(userId);
      console.log(`Force disconnected user ${userId}${reason ? `: ${reason}` : ''}`);
    }
  }

  /**
   * Get Socket.io server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

export let socketService: SocketService;

export const initializeSocketService = (httpServer: HttpServer): SocketService => {
  socketService = new SocketService(httpServer);
  return socketService;
};