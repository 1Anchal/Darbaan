import { NextFunction, Request, Response } from 'express';

/**
 * Sanitization middleware to clean and validate input data
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS attacks
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;
    
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Escape special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return email;
    
    // Basic email normalization
    const normalized = email.trim().toLowerCase();
    
    // Basic email validation pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(normalized) ? normalized : email;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any): number | null {
    if (typeof input === 'number') return input;
    if (typeof input === 'string') {
      const parsed = parseFloat(input);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Sanitize boolean input
   */
  static sanitizeBoolean(input: any): boolean | null {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      const lower = input.toLowerCase().trim();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    return null;
  }

  /**
   * Sanitize UUID input
   */
  static sanitizeUUID(input: string): string | null {
    if (typeof input !== 'string') return null;
    
    const cleaned = input.trim();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(cleaned) ? cleaned : null;
  }

  /**
   * Sanitize MAC address input
   */
  static sanitizeMacAddress(input: string): string | null {
    if (typeof input !== 'string') return null;
    
    const cleaned = input.trim().toUpperCase();
    const macPattern = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
    return macPattern.test(cleaned) ? cleaned : null;
  }

  /**
   * Sanitize SQL injection patterns
   */
  static sanitizeSQLInjection(input: string): string {
    if (typeof input !== 'string') return input;
    
    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;|'|")/g,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi
    ];
    
    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }

  /**
   * Recursively sanitize object properties
   */
  static sanitizeObject(obj: any, depth: number = 0): any {
    // Prevent deep recursion attacks
    if (depth > 10) return obj;
    
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names
        const sanitizedKey = this.sanitizeString(key);
        
        if (typeof value === 'string') {
          // Special handling for different field types
          if (key.toLowerCase().includes('email')) {
            sanitized[sanitizedKey] = this.sanitizeEmail(value);
          } else if (key.toLowerCase().includes('id') && key !== 'studentId' && key !== 'employeeId') {
            sanitized[sanitizedKey] = this.sanitizeUUID(value);
          } else if (key.toLowerCase().includes('mac')) {
            sanitized[sanitizedKey] = this.sanitizeMacAddress(value);
          } else {
            // Apply both string sanitization and SQL injection protection
            let sanitizedValue = this.sanitizeString(value);
            sanitizedValue = this.sanitizeSQLInjection(sanitizedValue);
            sanitized[sanitizedKey] = sanitizedValue;
          }
        } else if (typeof value === 'number') {
          sanitized[sanitizedKey] = this.sanitizeNumber(value);
        } else if (typeof value === 'boolean') {
          sanitized[sanitizedKey] = this.sanitizeBoolean(value);
        } else {
          sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1);
        }
      }
      
      return sanitized;
    }
    
    return obj;
  }
}

/**
 * Express middleware for input sanitization
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = InputSanitizer.sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = InputSanitizer.sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = InputSanitizer.sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid input data format',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Middleware for validating content length to prevent DoS attacks
 */
export const validateContentLength = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        message: 'Request payload too large',
        maxSize: `${maxSize} bytes`
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware for validating request headers
 */
export const validateHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-host', 'x-real-ip'];
  
  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      const value = req.headers[header] as string;
      // Basic IP validation
      const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      // Basic FQDN validation
      const fqdnPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      
      if (!ipPattern.test(value) && !fqdnPattern.test(value)) {
        res.status(400).json({
          success: false,
          message: 'Invalid header value detected'
        });
        return;
      }
    }
  }
  
  // Validate User-Agent if present
  if (req.headers['user-agent']) {
    const userAgent = req.headers['user-agent'] as string;
    if (userAgent.length > 500) {
      res.status(400).json({
        success: false,
        message: 'User-Agent header too long'
      });
      return;
    }
  }
  
  next();
};

/**
 * Middleware for preventing parameter pollution
 */
export const preventParameterPollution = (req: Request, res: Response, next: NextFunction): void => {
  // Check for duplicate parameters in query string
  const url = req.url;
  const queryStart = url.indexOf('?');
  
  if (queryStart !== -1) {
    const queryString = url.substring(queryStart + 1);
    const params = queryString.split('&');
    const paramNames = new Set();
    
    for (const param of params) {
      const [name] = param.split('=');
      if (paramNames.has(name)) {
        res.status(400).json({
          success: false,
          message: 'Parameter pollution detected'
        });
        return;
      }
      paramNames.add(name);
    }
  }
  
  next();
};