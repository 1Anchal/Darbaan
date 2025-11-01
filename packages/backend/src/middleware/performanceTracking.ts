import { NextFunction, Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { performanceMonitoringService } from '../services/performanceMonitoringService';

interface RequestWithTiming extends Request {
  startTime?: number;
}

/**
 * Middleware to track API request performance
 */
export const performanceTrackingMiddleware = (req: RequestWithTiming, res: Response, next: NextFunction) => {
  // Record start time
  req.startTime = performance.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    // Calculate response time
    const responseTime = performance.now() - (req.startTime || 0);
    
    // Determine if this was an error response
    const isError = res.statusCode >= 400;
    
    // Get endpoint path (remove query parameters and normalize)
    const endpoint = req.route?.path || req.path;
    const normalizedEndpoint = normalizeEndpoint(endpoint, req.method);
    
    // Record the metrics
    performanceMonitoringService.recordAPIRequest(normalizedEndpoint, responseTime, isError);
    
    // Add performance headers for debugging
    res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    res.setHeader('X-Timestamp', new Date().toISOString());
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Normalize endpoint paths for better grouping
 */
function normalizeEndpoint(path: string, method: string): string {
  if (!path) return `${method} /unknown`;
  
  // Replace dynamic parameters with placeholders
  const normalized = path
    .replace(/\/\d+/g, '/:id')           // Replace numeric IDs
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs
    .replace(/\/[a-f0-9]{24}/g, '/:objectId') // Replace MongoDB ObjectIds
    .replace(/\?.*$/, '');               // Remove query parameters
  
  return `${method} ${normalized}`;
}

/**
 * Middleware to track database query performance
 */
export const databasePerformanceMiddleware = {
  /**
   * Wrap database queries to track performance
   */
  wrapQuery: <T>(queryName: string, queryFn: () => Promise<T>): Promise<T> => {
    const startTime = performance.now();
    
    return queryFn()
      .then((result) => {
        const responseTime = performance.now() - startTime;
        
        // Record database performance (you could extend this to track specific queries)
        performanceMonitoringService.recordAPIRequest(`DB:${queryName}`, responseTime, false);
        
        return result;
      })
      .catch((error) => {
        const responseTime = performance.now() - startTime;
        
        // Record database error
        performanceMonitoringService.recordAPIRequest(`DB:${queryName}`, responseTime, true);
        
        throw error;
      });
  }
};

/**
 * Middleware to add performance monitoring headers
 */
export const performanceHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add server performance info to headers
  const currentMetrics = performanceMonitoringService.getCurrentMetrics();
  
  if (currentMetrics) {
    res.setHeader('X-Server-CPU', `${currentMetrics.system.cpuUsage.toFixed(1)}%`);
    res.setHeader('X-Server-Memory', `${currentMetrics.system.memoryUsage.percentage.toFixed(1)}%`);
    res.setHeader('X-Server-Uptime', currentMetrics.system.uptime.toString());
  }
  
  next();
};

/**
 * Middleware to handle slow requests
 */
export const slowRequestMiddleware = (thresholdMs: number = 5000) => {
  return (req: RequestWithTiming, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      console.warn(`Slow request detected: ${req.method} ${req.path} - ${thresholdMs}ms threshold exceeded`);
      
      // Emit slow request event
      performanceMonitoringService.emit('slowRequest', {
        method: req.method,
        path: req.path,
        threshold: thresholdMs,
        timestamp: new Date()
      });
    }, thresholdMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Middleware to track concurrent requests
 */
export const concurrentRequestsMiddleware = (() => {
  let activeRequests = 0;
  let maxConcurrentRequests = 0;

  return (req: Request, res: Response, next: NextFunction) => {
    activeRequests++;
    
    if (activeRequests > maxConcurrentRequests) {
      maxConcurrentRequests = activeRequests;
    }

    // Add concurrent request info to headers
    res.setHeader('X-Active-Requests', activeRequests.toString());
    res.setHeader('X-Max-Concurrent', maxConcurrentRequests.toString());

    // Decrease counter when response finishes
    res.on('finish', () => {
      activeRequests--;
    });

    next();
  };
})();

/**
 * Get current performance statistics
 */
export const getPerformanceStats = () => {
  return {
    currentMetrics: performanceMonitoringService.getCurrentMetrics(),
    activeAlerts: performanceMonitoringService.getActiveAlerts(),
    summary: performanceMonitoringService.getPerformanceSummary(),
    isMonitoring: performanceMonitoringService.isMonitoringActive()
  };
};