import { logger } from './loggerService';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

export class RetryService {
  private static defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error: any) => {
      // Default: retry on network errors, timeouts, and temporary failures
      return (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        error.message?.includes('timeout') ||
        error.message?.includes('connection') ||
        (error.statusCode && error.statusCode >= 500)
      );
    }
  };

  /**
   * Execute a function with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    context?: string
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let lastError: Error;
    let attempt = 0;

    for (attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        if (attempt > 1) {
          logger.info(
            `Operation succeeded after ${attempt} attempts`,
            context || 'RetryService',
            { attempts: attempt, duration }
          );
        }
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: duration
        };
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry this error
        if (!config.retryCondition || !config.retryCondition(error)) {
          logger.warn(
            `Operation failed with non-retryable error: ${lastError.message}`,
            context || 'RetryService',
            { attempt, error: lastError.message }
          );
          break;
        }
        
        // If this is the last attempt, don't wait
        if (attempt === config.maxAttempts) {
          break;
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        
        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }
        
        logger.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt}/${config.maxAttempts}): ${lastError.message}`,
          context || 'RetryService',
          { attempt, delay, error: lastError.message }
        );
        
        // Wait before next attempt
        await this.sleep(delay);
      }
    }
    
    const duration = Date.now() - startTime;
    
    logger.error(
      `Operation failed after ${attempt} attempts: ${lastError.message}`,
      context || 'RetryService',
      { attempts: attempt, duration },
      undefined,
      undefined,
      lastError
    );
    
    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalDuration: duration
    };
  }

  /**
   * Execute multiple operations with retry logic in parallel
   */
  static async executeMultipleWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options: Partial<RetryOptions> = {},
    context?: string
  ): Promise<RetryResult<T>[]> {
    const promises = operations.map((operation, index) =>
      this.executeWithRetry(operation, options, `${context || 'RetryService'}[${index}]`)
    );
    
    return Promise.all(promises);
  }

  /**
   * Execute operations with retry logic in sequence (one after another)
   */
  static async executeSequentialWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options: Partial<RetryOptions> = {},
    context?: string
  ): Promise<RetryResult<T>[]> {
    const results: RetryResult<T>[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      const result = await this.executeWithRetry(
        operations[i],
        options,
        `${context || 'RetryService'}[${i}]`
      );
      results.push(result);
      
      // If operation failed and it's critical, stop execution
      if (!result.success && options.retryCondition && !options.retryCondition(result.error)) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Create a retry wrapper for a function
   */
  static createRetryWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: Partial<RetryOptions> = {},
    context?: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.executeWithRetry(
        () => fn(...args),
        options,
        context
      );
      
      if (result.success) {
        return result.result!;
      } else {
        throw result.error;
      }
    };
  }

  /**
   * BLE-specific retry configuration
   */
  static getBLERetryOptions(): RetryOptions {
    return {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 1.5,
      jitter: true,
      retryCondition: (error: any) => {
        // Retry on BLE-specific errors
        return (
          error.message?.includes('Device not found') ||
          error.message?.includes('Connection failed') ||
          error.message?.includes('Scan timeout') ||
          error.message?.includes('Hardware not ready') ||
          error.code === 'BLE_DEVICE_NOT_FOUND' ||
          error.code === 'BLE_CONNECTION_FAILED' ||
          error.code === 'BLE_SCAN_ERROR' ||
          this.defaultOptions.retryCondition!(error)
        );
      },
      onRetry: (attempt: number, error: any) => {
        logger.warn(
          `BLE operation retry attempt ${attempt}`,
          'BLE',
          { error: error.message }
        );
      }
    };
  }

  /**
   * Database-specific retry configuration
   */
  static getDatabaseRetryOptions(): RetryOptions {
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error: any) => {
        // Retry on database connection errors, but not on validation errors
        return (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.message?.includes('Connection terminated') ||
          error.message?.includes('Connection lost') ||
          (error.statusCode && error.statusCode >= 500)
        );
      }
    };
  }

  /**
   * API call retry configuration
   */
  static getAPIRetryOptions(): RetryOptions {
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error: any) => {
        // Retry on 5xx errors and network issues, but not on 4xx client errors
        return (
          (error.statusCode && error.statusCode >= 500) ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND'
        );
      }
    };
  }

  private static calculateDelay(attempt: number, config: RetryOptions): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Convenience functions for common retry patterns
export const retryBLEOperation = <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<RetryResult<T>> => {
  return RetryService.executeWithRetry(
    operation,
    RetryService.getBLERetryOptions(),
    context
  );
};

export const retryDatabaseOperation = <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<RetryResult<T>> => {
  return RetryService.executeWithRetry(
    operation,
    RetryService.getDatabaseRetryOptions(),
    context
  );
};

export const retryAPICall = <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<RetryResult<T>> => {
  return RetryService.executeWithRetry(
    operation,
    RetryService.getAPIRetryOptions(),
    context
  );
};