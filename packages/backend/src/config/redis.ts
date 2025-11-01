import { createClient, RedisClientType } from 'redis';

// Redis client instance
let redisClient: RedisClientType | null = null;

// Redis configuration
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
    lazyConnect: true,
  },
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Create Redis client
export async function createRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = createClient(redisConfig);

    // Error handling
    redisClient.on('error', (error) => {
      console.error('Redis Client Error:', error);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    redisClient.on('end', () => {
      console.log('❌ Redis client disconnected');
    });

    // Connect to Redis
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    console.error('❌ Failed to create Redis client:', error);
    throw error;
  }
}

// Get Redis client instance
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call createRedisClient() first.');
  }
  return redisClient;
}

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = await createRedisClient();
    await client.ping();
    console.log('✅ Redis connection successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
}

// Redis health check
export async function getRedisHealth() {
  try {
    const client = getRedisClient();
    const start = Date.now();
    await client.ping();
    const end = Date.now();
    
    return {
      status: 'healthy',
      responseTime: end - start,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Cache utility functions
export class RedisCache {
  private client: RedisClientType;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  // Set cache with expiration
  async set(key: string, value: any, expireInSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (expireInSeconds) {
      await this.client.setEx(key, expireInSeconds, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  // Get cache value
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Error parsing cached value:', error);
      return null;
    }
  }

  // Delete cache key
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Set expiration for existing key
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  // Get all keys matching pattern
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  // Increment counter
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  // Hash operations for complex data
  async hSet(key: string, field: string, value: any): Promise<void> {
    await this.client.hSet(key, field, JSON.stringify(value));
  }

  async hGet<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hGet(key, field);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Error parsing cached hash value:', error);
      return null;
    }
  }

  async hGetAll<T>(key: string): Promise<Record<string, T>> {
    const values = await this.client.hGetAll(key);
    const result: Record<string, T> = {};
    
    for (const [field, value] of Object.entries(values)) {
      try {
        result[field] = JSON.parse(value) as T;
      } catch (error) {
        console.error(`Error parsing cached hash value for field ${field}:`, error);
      }
    }
    
    return result;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis client disconnected');
  }
});

process.on('SIGTERM', async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis client disconnected');
  }
});