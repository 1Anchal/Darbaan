import { EventEmitter } from 'events';
import * as os from 'os';
import { getDatabasesHealth } from '../config';

export interface PerformanceMetrics {
  timestamp: Date;
  system: {
    cpuUsage: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
    loadAverage: number[];
  };
  application: {
    heapUsed: number;
    heapTotal: number;
    heapPercentage: number;
    external: number;
    rss: number;
  };
  database: {
    connectionCount: number;
    queryPerformance: {
      averageResponseTime: number;
      slowQueries: number;
    };
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  realTime: {
    socketConnections: number;
    messagesPerMinute: number;
    bleEventsPerMinute: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'database' | 'api' | 'realtime';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  apiResponseTime: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  databaseResponseTime: { warning: number; critical: number };
}

export class PerformanceMonitoringService extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private requestMetrics: Map<string, { count: number; totalTime: number; errors: number }> = new Map();
  private socketMetrics = { connections: 0, messagesPerMinute: 0 };
  private bleMetrics = { eventsPerMinute: 0 };
  private isMonitoring = false;

  private thresholds: PerformanceThresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    apiResponseTime: { warning: 1000, critical: 3000 }, // milliseconds
    errorRate: { warning: 5, critical: 10 }, // percentage
    databaseResponseTime: { warning: 500, critical: 1000 } // milliseconds
  };

  constructor() {
    super();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.log('Performance monitoring is already running');
      return;
    }

    console.log('🔍 Starting performance monitoring...');
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Collect initial metrics
    this.collectMetrics();
    
    this.emit('monitoringStarted');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('🔍 Performance monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      
      // System metrics
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = this.getMemoryUsage();
      const uptime = os.uptime();
      const loadAverage = os.loadavg();

      // Application metrics
      const memUsage = process.memoryUsage();
      const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Database metrics
      const dbHealth = await getDatabasesHealth();
      const dbMetrics = this.calculateDatabaseMetrics(dbHealth);

      // API metrics
      const apiMetrics = this.calculateAPIMetrics();

      // Real-time metrics
      const realTimeMetrics = {
        socketConnections: this.socketMetrics.connections,
        messagesPerMinute: this.socketMetrics.messagesPerMinute,
        bleEventsPerMinute: this.bleMetrics.eventsPerMinute
      };

      const metrics: PerformanceMetrics = {
        timestamp,
        system: {
          cpuUsage,
          memoryUsage: {
            used: memoryUsage.used,
            total: memoryUsage.total,
            percentage: memoryUsage.percentage
          },
          uptime,
          loadAverage
        },
        application: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          heapPercentage,
          external: memUsage.external,
          rss: memUsage.rss
        },
        database: dbMetrics,
        api: apiMetrics,
        realTime: realTimeMetrics
      };

      // Store metrics (keep last 100 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 100) {
        this.metrics.shift();
      }

      // Check for performance issues
      this.checkPerformanceThresholds(metrics);

      this.emit('metricsCollected', metrics);

    } catch (error) {
      console.error('Error collecting performance metrics:', error);
      this.emit('metricsError', error);
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const cpuPercentage = 100 - ~~(100 * idleDifference / totalDifference);
        resolve(cpuPercentage);
      }, 100);
    });
  }

  /**
   * Calculate CPU average
   */
  private cpuAverage(): { idle: number; total: number } {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length
    };
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percentage = (used / total) * 100;

    return { used, total, percentage };
  }

  /**
   * Calculate database metrics
   */
  private calculateDatabaseMetrics(dbHealth: any): PerformanceMetrics['database'] {
    // This would be enhanced with actual database connection pool metrics
    return {
      connectionCount: 0, // Would come from connection pool
      queryPerformance: {
        averageResponseTime: 0, // Would be calculated from query logs
        slowQueries: 0 // Would be tracked from slow query logs
      }
    };
  }

  /**
   * Calculate API metrics
   */
  private calculateAPIMetrics(): PerformanceMetrics['api'] {
    let totalRequests = 0;
    let totalTime = 0;
    let totalErrors = 0;

    for (const [, metrics] of this.requestMetrics) {
      totalRequests += metrics.count;
      totalTime += metrics.totalTime;
      totalErrors += metrics.errors;
    }

    const averageResponseTime = totalRequests > 0 ? totalTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    return {
      requestsPerMinute: totalRequests, // This would be calculated per minute
      averageResponseTime,
      errorRate,
      activeConnections: 0 // Would come from server metrics
    };
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // CPU usage check
    if (metrics.system.cpuUsage > this.thresholds.cpu.critical) {
      alerts.push(this.createAlert('cpu', 'critical', 
        `Critical CPU usage: ${metrics.system.cpuUsage.toFixed(1)}%`, 
        metrics.system.cpuUsage, this.thresholds.cpu.critical));
    } else if (metrics.system.cpuUsage > this.thresholds.cpu.warning) {
      alerts.push(this.createAlert('cpu', 'medium', 
        `High CPU usage: ${metrics.system.cpuUsage.toFixed(1)}%`, 
        metrics.system.cpuUsage, this.thresholds.cpu.warning));
    }

    // Memory usage check
    if (metrics.system.memoryUsage.percentage > this.thresholds.memory.critical) {
      alerts.push(this.createAlert('memory', 'critical', 
        `Critical memory usage: ${metrics.system.memoryUsage.percentage.toFixed(1)}%`, 
        metrics.system.memoryUsage.percentage, this.thresholds.memory.critical));
    } else if (metrics.system.memoryUsage.percentage > this.thresholds.memory.warning) {
      alerts.push(this.createAlert('memory', 'medium', 
        `High memory usage: ${metrics.system.memoryUsage.percentage.toFixed(1)}%`, 
        metrics.system.memoryUsage.percentage, this.thresholds.memory.warning));
    }

    // API response time check
    if (metrics.api.averageResponseTime > this.thresholds.apiResponseTime.critical) {
      alerts.push(this.createAlert('api', 'critical', 
        `Critical API response time: ${metrics.api.averageResponseTime.toFixed(0)}ms`, 
        metrics.api.averageResponseTime, this.thresholds.apiResponseTime.critical));
    } else if (metrics.api.averageResponseTime > this.thresholds.apiResponseTime.warning) {
      alerts.push(this.createAlert('api', 'medium', 
        `Slow API response time: ${metrics.api.averageResponseTime.toFixed(0)}ms`, 
        metrics.api.averageResponseTime, this.thresholds.apiResponseTime.warning));
    }

    // Error rate check
    if (metrics.api.errorRate > this.thresholds.errorRate.critical) {
      alerts.push(this.createAlert('api', 'critical', 
        `Critical error rate: ${metrics.api.errorRate.toFixed(1)}%`, 
        metrics.api.errorRate, this.thresholds.errorRate.critical));
    } else if (metrics.api.errorRate > this.thresholds.errorRate.warning) {
      alerts.push(this.createAlert('api', 'medium', 
        `High error rate: ${metrics.api.errorRate.toFixed(1)}%`, 
        metrics.api.errorRate, this.thresholds.errorRate.warning));
    }

    // Add new alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      this.emit('performanceAlert', alert);
    }

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'], 
    severity: PerformanceAlert['severity'], 
    message: string, 
    value: number, 
    threshold: number
  ): PerformanceAlert {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false
    };
  }

  /**
   * Record API request metrics
   */
  recordAPIRequest(endpoint: string, responseTime: number, isError: boolean = false): void {
    const existing = this.requestMetrics.get(endpoint) || { count: 0, totalTime: 0, errors: 0 };
    
    existing.count++;
    existing.totalTime += responseTime;
    if (isError) {
      existing.errors++;
    }

    this.requestMetrics.set(endpoint, existing);
  }

  /**
   * Update socket metrics
   */
  updateSocketMetrics(connections: number, messagesPerMinute: number): void {
    this.socketMetrics = { connections, messagesPerMinute };
  }

  /**
   * Update BLE metrics
   */
  updateBLEMetrics(eventsPerMinute: number): void {
    this.bleMetrics = { eventsPerMinute };
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(limit: number = 50): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 20): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.emit('thresholdsUpdated', this.thresholds);
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    const current = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    
    if (!current) {
      return {
        status: 'unknown',
        message: 'No metrics available',
        alerts: activeAlerts.length
      };
    }

    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;
    const mediumAlerts = activeAlerts.filter(a => a.severity === 'medium').length;

    let status = 'good';
    let message = 'System performance is normal';

    if (criticalAlerts > 0) {
      status = 'critical';
      message = `${criticalAlerts} critical performance issue(s) detected`;
    } else if (highAlerts > 0) {
      status = 'warning';
      message = `${highAlerts} high priority performance issue(s) detected`;
    } else if (mediumAlerts > 0) {
      status = 'caution';
      message = `${mediumAlerts} medium priority performance issue(s) detected`;
    }

    return {
      status,
      message,
      alerts: {
        total: activeAlerts.length,
        critical: criticalAlerts,
        high: highAlerts,
        medium: mediumAlerts,
        low: activeAlerts.filter(a => a.severity === 'low').length
      },
      metrics: {
        cpuUsage: current.system.cpuUsage,
        memoryUsage: current.system.memoryUsage.percentage,
        apiResponseTime: current.api.averageResponseTime,
        errorRate: current.api.errorRate
      },
      timestamp: current.timestamp
    };
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(): void {
    // Keep only last 50 metrics
    if (this.metrics.length > 50) {
      this.metrics = this.metrics.slice(-50);
    }

    // Keep only last 30 alerts
    if (this.alerts.length > 30) {
      this.alerts = this.alerts.slice(-30);
    }

    // Clear old request metrics (reset every hour)
    this.requestMetrics.clear();
  }

  /**
   * Get monitoring status
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();