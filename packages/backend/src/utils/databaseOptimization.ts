import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import { getRedisClient } from '../config/redis';

const redis = getRedisClient();

export interface QueryOptimizationOptions {
  cacheKey?: string;
  cacheTTL?: number; // seconds
  enableLogging?: boolean;
  timeout?: number; // milliseconds
}

export interface QueryPerformanceLog {
  query: string;
  duration: number;
  timestamp: Date;
  cached: boolean;
  error?: string;
}

class DatabaseOptimizationService {
  private queryLogs: QueryPerformanceLog[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private maxLogEntries = 1000;

  /**
   * Optimize Prisma query with caching and performance tracking
   */
  async optimizeQuery<T>(
    queryName: string,
    queryFn: (prisma: PrismaClient) => Promise<T>,
    options: QueryOptimizationOptions = {}
  ): Promise<T> {
    const {
      cacheKey,
      cacheTTL = 300, // 5 minutes default
      enableLogging = true,
      timeout = 30000 // 30 seconds default
    } = options;

    const startTime = performance.now();
    let cached = false;
    let result: T;
    let error: string | undefined;

    try {
      // Try to get from cache first
      if (cacheKey && redis) {
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
          result = JSON.parse(cachedResult);
          cached = true;
          
          if (enableLogging) {
            this.logQuery(queryName, performance.now() - startTime, cached);
          }
          
          return result;
        }
      }

      // Execute query with timeout
      const prisma = new PrismaClient();
      
      const queryPromise = queryFn(prisma);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout: ${queryName}`)), timeout);
      });

      result = await Promise.race([queryPromise, timeoutPromise]);

      // Cache the result if caching is enabled
      if (cacheKey && redis && result) {
        await redis.setex(cacheKey, cacheTTL, JSON.stringify(result));
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      
      if (enableLogging) {
        this.logQuery(queryName, duration, cached, error);
      }
    }

    return result;
  }

  /**
   * Create optimized pagination query
   */
  async paginatedQuery<T>(
    queryName: string,
    queryFn: (skip: number, take: number) => Promise<T[]>,
    countFn: () => Promise<number>,
    page: number = 1,
    limit: number = 20,
    cachePrefix?: string
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const cacheKey = cachePrefix ? `${cachePrefix}:page:${page}:limit:${limit}` : undefined;
    const countCacheKey = cachePrefix ? `${cachePrefix}:count` : undefined;

    const [data, total] = await Promise.all([
      this.optimizeQuery(
        `${queryName}:data`,
        () => queryFn(skip, limit),
        { cacheKey, cacheTTL: 300 }
      ),
      this.optimizeQuery(
        `${queryName}:count`,
        () => countFn(),
        { cacheKey: countCacheKey, cacheTTL: 600 } // Cache count longer
      )
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Batch multiple queries for better performance
   */
  async batchQueries<T extends Record<string, any>>(
    queries: Array<{
      name: string;
      queryFn: () => Promise<any>;
      cacheKey?: string;
      cacheTTL?: number;
    }>
  ): Promise<T> {
    const results = await Promise.allSettled(
      queries.map(async ({ name, queryFn, cacheKey, cacheTTL }) => {
        const result = await this.optimizeQuery(name, () => queryFn(), { cacheKey, cacheTTL });
        return { name, result };
      })
    );

    const batchResult = {} as T;
    
    results.forEach((result, index) => {
      const queryName = queries[index].name;
      
      if (result.status === 'fulfilled') {
        (batchResult as any)[queryName] = result.value.result;
      } else {
        console.error(`Batch query failed for ${queryName}:`, result.reason);
        (batchResult as any)[queryName] = null;
      }
    });

    return batchResult;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<number> {
    if (!redis) return 0;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;

      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Error invalidating cache:', error);
      return 0;
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(
    cacheKey: string,
    queryFn: () => Promise<any>,
    cacheTTL: number = 3600
  ): Promise<void> {
    try {
      const result = await queryFn();
      if (redis && result) {
        await redis.setex(cacheKey, cacheTTL, JSON.stringify(result));
      }
    } catch (error) {
      console.error(`Error warming up cache for ${cacheKey}:`, error);
    }
  }

  /**
   * Log query performance
   */
  private logQuery(query: string, duration: number, cached: boolean, error?: string): void {
    const log: QueryPerformanceLog = {
      query,
      duration,
      timestamp: new Date(),
      cached,
      error
    };

    this.queryLogs.push(log);

    // Keep only recent logs
    if (this.queryLogs.length > this.maxLogEntries) {
      this.queryLogs = this.queryLogs.slice(-this.maxLogEntries);
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected: ${query} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): {
    totalQueries: number;
    averageResponseTime: number;
    slowQueries: number;
    cacheHitRate: number;
    recentQueries: QueryPerformanceLog[];
  } {
    const totalQueries = this.queryLogs.length;
    const cachedQueries = this.queryLogs.filter(log => log.cached).length;
    const slowQueries = this.queryLogs.filter(log => log.duration > this.slowQueryThreshold).length;
    
    const totalDuration = this.queryLogs.reduce((sum, log) => sum + log.duration, 0);
    const averageResponseTime = totalQueries > 0 ? totalDuration / totalQueries : 0;
    const cacheHitRate = totalQueries > 0 ? (cachedQueries / totalQueries) * 100 : 0;

    return {
      totalQueries,
      averageResponseTime,
      slowQueries,
      cacheHitRate,
      recentQueries: this.queryLogs.slice(-20) // Last 20 queries
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10): QueryPerformanceLog[] {
    return this.queryLogs
      .filter(log => log.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear query logs
   */
  clearQueryLogs(): void {
    this.queryLogs = [];
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(thresholdMs: number): void {
    this.slowQueryThreshold = thresholdMs;
  }

  /**
   * Create database indexes for better performance
   */
  async createOptimalIndexes(prisma: PrismaClient): Promise<void> {
    try {
      // These would be actual database-specific index creation commands
      // For PostgreSQL with Prisma, indexes are typically defined in schema.prisma
      
      console.log('Creating optimal database indexes...');
      
      // Example indexes that would improve performance:
      // - User lookup by email
      // - Attendance records by userId and date
      // - BLE devices by userId
      // - Classes by instructorId
      // - Notifications by userId and isRead
      
      // Since we're using Prisma, these should be defined in the schema file
      // This function serves as documentation of recommended indexes
      
      const recommendedIndexes = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON "User"(email);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_date ON "AttendanceRecord"("userId", "createdAt");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ble_devices_user ON "BLEDevice"("userId");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_instructor ON "Class"("instructorId");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read ON "Notification"("userId", "isRead");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crowd_data_location_time ON "CrowdData"("location", "timestamp");'
      ];

      console.log('Recommended indexes for optimal performance:');
      recommendedIndexes.forEach(index => console.log(`  ${index}`));
      
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  analyzePerformance(): {
    summary: string;
    recommendations: string[];
    stats: ReturnType<typeof this.getQueryStats>;
  } {
    const stats = this.getQueryStats();
    const recommendations: string[] = [];
    let summary = 'Database performance analysis:';

    // Analyze cache hit rate
    if (stats.cacheHitRate < 50) {
      recommendations.push('Consider implementing more aggressive caching strategies');
      summary += ` Low cache hit rate (${stats.cacheHitRate.toFixed(1)}%).`;
    } else if (stats.cacheHitRate > 80) {
      summary += ` Good cache hit rate (${stats.cacheHitRate.toFixed(1)}%).`;
    }

    // Analyze response times
    if (stats.averageResponseTime > 500) {
      recommendations.push('Average response time is high - consider query optimization or indexing');
      summary += ` High average response time (${stats.averageResponseTime.toFixed(2)}ms).`;
    } else {
      summary += ` Good average response time (${stats.averageResponseTime.toFixed(2)}ms).`;
    }

    // Analyze slow queries
    if (stats.slowQueries > stats.totalQueries * 0.1) {
      recommendations.push('High number of slow queries detected - review and optimize');
      summary += ` ${stats.slowQueries} slow queries detected.`;
    }

    if (recommendations.length === 0) {
      recommendations.push('Database performance looks good!');
    }

    return {
      summary,
      recommendations,
      stats
    };
  }
}

// Export singleton instance
export const databaseOptimizationService = new DatabaseOptimizationService();

// Export utility functions
export const optimizeQuery = databaseOptimizationService.optimizeQuery.bind(databaseOptimizationService);
export const paginatedQuery = databaseOptimizationService.paginatedQuery.bind(databaseOptimizationService);
export const batchQueries = databaseOptimizationService.batchQueries.bind(databaseOptimizationService);