import { getDatabaseHealth, testDatabaseConnection } from './database';
import { createInfluxClient, getInfluxHealth, testInfluxConnection } from './influxdb';
import { createRedisClient, getRedisHealth, testRedisConnection } from './redis';

// Initialize all database connections
export async function initializeDatabases() {
  console.log('🚀 Initializing database connections...');
  
  const results = {
    postgres: false,
    redis: false,
    influx: false,
  };

  try {
    // Test PostgreSQL connection
    results.postgres = await testDatabaseConnection();
  } catch (error) {
    console.error('PostgreSQL initialization failed:', error);
  }

  try {
    // Initialize Redis
    await createRedisClient();
    results.redis = await testRedisConnection();
  } catch (error) {
    console.error('Redis initialization failed:', error);
  }

  try {
    // Initialize InfluxDB
    createInfluxClient();
    results.influx = await testInfluxConnection();
  } catch (error) {
    console.error('InfluxDB initialization failed:', error);
  }

  // Log results
  console.log('📊 Database Connection Status:');
  console.log(`  PostgreSQL: ${results.postgres ? '✅' : '❌'}`);
  console.log(`  Redis: ${results.redis ? '✅' : '❌'}`);
  console.log(`  InfluxDB: ${results.influx ? '✅' : '❌'}`);

  const allConnected = Object.values(results).every(Boolean);
  if (allConnected) {
    console.log('🎉 All databases connected successfully!');
  } else {
    console.warn('⚠️  Some database connections failed. Check configuration.');
  }

  return results;
}

// Health check for all databases
export async function getDatabasesHealth() {
  const [postgresHealth, redisHealth, influxHealth] = await Promise.allSettled([
    getDatabaseHealth(),
    getRedisHealth(),
    getInfluxHealth(),
  ]);

  return {
    postgres: postgresHealth.status === 'fulfilled' ? postgresHealth.value : { status: 'error', error: 'Connection failed' },
    redis: redisHealth.status === 'fulfilled' ? redisHealth.value : { status: 'error', error: 'Connection failed' },
    influx: influxHealth.status === 'fulfilled' ? influxHealth.value : { status: 'error', error: 'Connection failed' },
    timestamp: new Date().toISOString(),
  };
}

// Export database services
export { prisma } from './database';
export { AttendanceDataService, getInfluxClient, getQueryApi, getWriteApi } from './influxdb';
export { getRedisClient, RedisCache } from './redis';

// Configuration constants
export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  influxdb: {
    url: process.env.INFLUXDB_URL || 'http://localhost:8086',
    token: process.env.INFLUXDB_TOKEN || '',
    org: process.env.INFLUXDB_ORG || 'darbaan-org',
    bucket: process.env.INFLUXDB_BUCKET || 'attendance-data',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  ble: {
    scanInterval: parseInt(process.env.BLE_SCAN_INTERVAL || '5000'),
    deviceTimeout: parseInt(process.env.BLE_DEVICE_TIMEOUT || '300000'),
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
};