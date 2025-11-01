import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { DashboardMetrics, NotificationItem, RealTimeStats } from '../types';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  // Dashboard events
  onMetricsUpdate: (callback: (metrics: DashboardMetrics) => void) => void;
  onRealTimeStatsUpdate: (callback: (stats: RealTimeStats) => void) => void;
  onNotificationReceived: (callback: (notification: NotificationItem) => void) => void;
  // Attendance events
  onAttendanceEvent: (callback: (event: any) => void) => void;
  onPersonalAttendanceEvent: (callback: (event: any) => void) => void;
  // Utility methods
  requestMetrics: () => void;
  requestRealTimeStats: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  subscribeToDashboard: () => void;
  subscribeToAttendance: () => void;
  subscribeToNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user || !token) {
      // Disconnect if user is not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io(import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001', {
      auth: {
        token: token
      },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to Socket.io server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.io server:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket.io error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, token]);

  // Dashboard event handlers
  const onMetricsUpdate = (callback: (metrics: DashboardMetrics) => void) => {
    if (socket) {
      socket.on('metrics:update', callback);
    }
  };

  const onRealTimeStatsUpdate = (callback: (stats: RealTimeStats) => void) => {
    if (socket) {
      socket.on('realtime-stats:update', callback);
    }
  };

  const onNotificationReceived = (callback: (notification: NotificationItem) => void) => {
    if (socket) {
      socket.on('notification:new', callback);
    }
  };

  // Attendance event handlers
  const onAttendanceEvent = (callback: (event: any) => void) => {
    if (socket) {
      socket.on('attendance:event', callback);
    }
  };

  const onPersonalAttendanceEvent = (callback: (event: any) => void) => {
    if (socket) {
      socket.on('attendance:personal-event', callback);
    }
  };

  // Utility methods
  const requestMetrics = () => {
    if (socket && isConnected) {
      socket.emit('request:metrics');
    }
  };

  const requestRealTimeStats = () => {
    if (socket && isConnected) {
      socket.emit('request:realtime-stats');
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    if (socket && isConnected) {
      socket.emit('notification:mark-read', notificationId);
    }
  };

  const subscribeToDashboard = () => {
    if (socket && isConnected) {
      socket.emit('subscribe:dashboard');
    }
  };

  const subscribeToAttendance = () => {
    if (socket && isConnected) {
      socket.emit('subscribe:attendance');
    }
  };

  const subscribeToNotifications = () => {
    if (socket && isConnected) {
      socket.emit('subscribe:notifications');
    }
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    onMetricsUpdate,
    onRealTimeStatsUpdate,
    onNotificationReceived,
    onAttendanceEvent,
    onPersonalAttendanceEvent,
    requestMetrics,
    requestRealTimeStats,
    markNotificationAsRead,
    subscribeToDashboard,
    subscribeToAttendance,
    subscribeToNotifications
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};