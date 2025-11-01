import { NextFunction, Request, Response } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;
  private message: string;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100, message?: string) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message || `Too many requests, please try again later.`;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use IP address and user ID (if authenticated) as key
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.userId || '';
    return `${ip}:${userId}`;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      
      if (!this.store[key] || this.store[key].resetTime < now) {
        // Initialize or reset the counter
        this.store[key] = {
          count: 1,
          resetTime: now + this.windowMs
        };
        return next();
      }

      this.store[key].count++;

      if (this.store[key].count > this.maxRequests) {
        const resetTime = Math.ceil((this.store[key].resetTime - now) / 1000);
        
        res.set({
          'X-RateLimit-Limit': this.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString()
        });

        return res.status(429).json({
          success: false,
          message: this.message,
          retryAfter: resetTime
        });
      }

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': (this.maxRequests - this.store[key].count).toString(),
        'X-RateLimit-Reset': Math.ceil((this.store[key].resetTime - now) / 1000).toString()
      });

      next();
    };
  }
}

// Create different rate limiters for different endpoints
export const generalRateLimit = new RateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later.'
);

export const authRateLimit = new RateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 login attempts per window
  'Too many login attempts, please try again later.'
);

export const apiRateLimit = new RateLimiter(
  1 * 60 * 1000, // 1 minute
  60, // 60 requests per minute
  'API rate limit exceeded, please slow down.'
);

export const strictRateLimit = new RateLimiter(
  1 * 60 * 1000, // 1 minute
  10, // 10 requests per minute
  'Rate limit exceeded for this sensitive operation.'
);

export const exportRateLimit = new RateLimiter(
  5 * 60 * 1000, // 5 minutes
  3, // 3 export requests per 5 minutes
  'Export rate limit exceeded, please wait before requesting another export.'
);

export const settingsRateLimit = new RateLimiter(
  1 * 60 * 1000, // 1 minute
  5, // 5 settings updates per minute
  'Settings update rate limit exceeded.'
);

export const bleRateLimit = new RateLimiter(
  1 * 60 * 1000, // 1 minute
  30, // 30 BLE operations per minute
  'BLE operation rate limit exceeded.'
);