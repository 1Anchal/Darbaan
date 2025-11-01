import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  userId?: string;
  requestId?: string;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDirectory: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
  enableStructuredLogging: boolean;
}

class LoggerService {
  private config: LoggerConfig;
  private logStreams: Map<string, NodeJS.WritableStream> = new Map();
  private currentLogFile: string = '';
  private currentFileSize: number = 0;

  constructor() {
    this.config = {
      level: this.getLogLevelFromEnv(),
      enableConsole: process.env.NODE_ENV !== 'production',
      enableFile: true,
      logDirectory: process.env.LOG_DIRECTORY || './logs',
      maxFileSize: parseInt(process.env.MAX_LOG_FILE_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.MAX_LOG_FILES || '5'),
      enableStructuredLogging: process.env.STRUCTURED_LOGGING === 'true'
    };

    this.initializeLogDirectory();
    this.initializeLogFile();
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'CRITICAL': return LogLevel.CRITICAL;
      default: return LogLevel.INFO;
    }
  }

  private initializeLogDirectory(): void {
    if (!existsSync(this.config.logDirectory)) {
      mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }

  private initializeLogFile(): void {
    const timestamp = new Date().toISOString().split('T')[0];
    this.currentLogFile = join(this.config.logDirectory, `app-${timestamp}.log`);
    
    if (this.config.enableFile) {
      const stream = createWriteStream(this.currentLogFile, { flags: 'a' });
      this.logStreams.set('main', stream);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.config.enableStructuredLogging) {
      return JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        message: entry.message,
        context: entry.context,
        metadata: entry.metadata,
        userId: entry.userId,
        requestId: entry.requestId,
        stack: entry.stack
      }) + '\n';
    } else {
      const timestamp = entry.timestamp.toISOString();
      const level = LogLevel[entry.level].padEnd(8);
      const context = entry.context ? `[${entry.context}] ` : '';
      const userId = entry.userId ? `[User:${entry.userId}] ` : '';
      const requestId = entry.requestId ? `[Req:${entry.requestId}] ` : '';
      
      let logLine = `${timestamp} ${level} ${context}${userId}${requestId}${entry.message}`;
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        logLine += ` | Metadata: ${JSON.stringify(entry.metadata)}`;
      }
      
      if (entry.stack) {
        logLine += `\nStack: ${entry.stack}`;
      }
      
      return logLine + '\n';
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFile) return;

    const formattedEntry = this.formatLogEntry(entry);
    const stream = this.logStreams.get('main');
    
    if (stream) {
      stream.write(formattedEntry);
      this.currentFileSize += Buffer.byteLength(formattedEntry);
      
      // Check if we need to rotate the log file
      if (this.currentFileSize > this.config.maxFileSize) {
        this.rotateLogFile();
      }
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const formattedEntry = this.formatLogEntry(entry).trim();
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedEntry);
        break;
      case LogLevel.INFO:
        console.info(formattedEntry);
        break;
      case LogLevel.WARN:
        console.warn(formattedEntry);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedEntry);
        break;
    }
  }

  private rotateLogFile(): void {
    // Close current stream
    const currentStream = this.logStreams.get('main');
    if (currentStream) {
      currentStream.end();
    }

    // Create new log file
    this.initializeLogFile();
    this.currentFileSize = 0;

    // Clean up old log files if needed
    this.cleanupOldLogFiles();
  }

  private cleanupOldLogFiles(): void {
    // Implementation would scan log directory and remove old files
    // This is a simplified version
    this.info('Log file rotated', 'LoggerService');
  }

  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>, userId?: string, requestId?: string, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      metadata,
      userId,
      requestId,
      stack: error?.stack
    };

    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>, userId?: string, requestId?: string): void {
    this.log(LogLevel.DEBUG, message, context, metadata, userId, requestId);
  }

  info(message: string, context?: string, metadata?: Record<string, any>, userId?: string, requestId?: string): void {
    this.log(LogLevel.INFO, message, context, metadata, userId, requestId);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>, userId?: string, requestId?: string): void {
    this.log(LogLevel.WARN, message, context, metadata, userId, requestId);
  }

  error(message: string, context?: string, metadata?: Record<string, any>, userId?: string, requestId?: string, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, metadata, userId, requestId, error);
  }

  critical(message: string, context?: string, metadata?: Record<string, any>, userId?: string, requestId?: string, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, context, metadata, userId, requestId, error);
  }

  // Convenience methods for common logging scenarios
  logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string, requestId?: string): void {
    this.info(`${method} ${url} - ${statusCode} (${duration}ms)`, 'HTTP', {
      method,
      url,
      statusCode,
      duration
    }, userId, requestId);
  }

  logDatabaseOperation(operation: string, table: string, duration: number, success: boolean, error?: Error): void {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const message = `Database ${operation} on ${table} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`;
    
    this.log(level, message, 'Database', {
      operation,
      table,
      duration,
      success
    }, undefined, undefined, error);
  }

  logBLEOperation(operation: string, deviceId?: string, location?: string, success: boolean = true, error?: Error): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `BLE ${operation}${deviceId ? ` for device ${deviceId}` : ''}${location ? ` at ${location}` : ''} - ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this.log(level, message, 'BLE', {
      operation,
      deviceId,
      location,
      success
    }, undefined, undefined, error);
  }

  logSecurityEvent(event: string, userId?: string, ipAddress?: string, userAgent?: string, success: boolean = true): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Security event: ${event}${userId ? ` for user ${userId}` : ''} - ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this.log(level, message, 'Security', {
      event,
      userId,
      ipAddress,
      userAgent,
      success
    });
  }

  // Update configuration
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.logDirectory && newConfig.logDirectory !== this.config.logDirectory) {
      this.initializeLogDirectory();
      this.initializeLogFile();
    }
  }

  // Get current configuration
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      const streams = Array.from(this.logStreams.values());
      let closedCount = 0;
      
      if (streams.length === 0) {
        resolve();
        return;
      }
      
      streams.forEach(stream => {
        stream.end(() => {
          closedCount++;
          if (closedCount === streams.length) {
            resolve();
          }
        });
      });
    });
  }
}

export const logger = new LoggerService();