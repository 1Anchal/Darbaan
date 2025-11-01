import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { getDatabasesHealth, initializeDatabases } from './config';
import { auditSecurityMiddleware } from './middleware/audit';
import { errorHandler } from './middleware/errorHandler';
import {
    concurrentRequestsMiddleware,
    performanceHeadersMiddleware,
    performanceTrackingMiddleware,
    slowRequestMiddleware
} from './middleware/performanceTracking';
import { generalRateLimit } from './middleware/rateLimiter';
import {
    preventParameterPollution,
    sanitizeInput,
    validateContentLength,
    validateHeaders
} from './middleware/sanitization';
import {
    additionalSecurity,
    corsConfig,
    requestTimeout,
    securityEventLogger,
    securityHeaders
} from './middleware/security';
import attendanceRoutes from './routes/attendance';
import auditRoutes from './routes/audit';
import authRoutes from './routes/auth';
import bleDeviceRoutes from './routes/bleDevices';
import bleProcessorRoutes from './routes/bleProcessor';
import bleRegistryRoutes from './routes/bleRegistry';
import classRoutes from './routes/classes';
import crowdMonitoringRoutes from './routes/crowdMonitoring';
import dashboardRoutes from './routes/dashboard';
import healthRoutes from './routes/health';
import mobileDeviceRoutes from './routes/mobileDevice';
import reportRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import studentRoutes from './routes/students';
import systemIntegrationRoutes from './routes/systemIntegration';
import userRoutes from './routes/users';
import { bleIntegrationService } from './services/bleIntegrationService';
import { performanceMonitoringService } from './services/performanceMonitoringService';
import { initializeSocketService } from './services/socketService';
import { systemIntegrationService } from './services/systemIntegrationService';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(securityHeaders);
app.use(corsConfig);
app.use(additionalSecurity);
app.use(requestTimeout(30000)); // 30 second timeout
app.use(securityEventLogger);

// Request validation and sanitization
app.use(validateContentLength(5 * 1024 * 1024)); // 5MB limit
app.use(validateHeaders);
app.use(preventParameterPollution);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(sanitizeInput);

// Rate limiting
app.use(generalRateLimit.middleware());

// Performance tracking middleware
app.use(performanceTrackingMiddleware);
app.use(performanceHeadersMiddleware);
app.use(concurrentRequestsMiddleware);
app.use(slowRequestMiddleware(5000)); // 5 second threshold

// Audit middleware for security events
app.use(auditSecurityMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await getDatabasesHealth();
    const allHealthy = Object.values(dbHealth).every(
      (health: any) => health.status === 'healthy'
    );

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      service: 'Darbaan Backend API',
      databases: dbHealth,
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'Darbaan Backend API',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/crowd-monitoring', crowdMonitoringRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/ble-devices', bleDeviceRoutes);
app.use('/api/ble-registry', bleRegistryRoutes);
app.use('/api/ble-processor', bleProcessorRoutes);
app.use('/api/system-integration', systemIntegrationRoutes);
app.use('/api/mobile-device', mobileDeviceRoutes);
app.use('/health', healthRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Darbaan Attendance System API',
    version: '1.0.0',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize databases and start server
async function startServer() {
  try {
    // Initialize database connections
    await initializeDatabases();
    
    // Initialize Socket.io service
    const socketService = initializeSocketService(httpServer);
    console.log('🔌 Socket.io service initialized');
    
    // Initialize BLE Integration Service
    await bleIntegrationService.initialize();
    console.log('📡 BLE Integration Service initialized');
    
    // Initialize System Integration Service
    await systemIntegrationService.initialize();
    console.log('🔧 System Integration Service initialized');
    
    // Start Performance Monitoring
    performanceMonitoringService.startMonitoring(30000); // 30 seconds interval
    console.log('🔍 Performance Monitoring started');
    
    // Start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.io ready for real-time connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app;
