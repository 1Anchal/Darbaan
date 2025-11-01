import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../services/loggerService';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  context?: string;
  metadata?: Record<string, any>;
  isOperational?: boolean;
}

export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
  details?: any;
  stack?: string;
}

// User-friendly error messages mapping
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  // Authentication & Authorization
  INVALID_TOKEN: 'Your session has expired. Please log in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  AUTHENTICATION_ERROR: 'Please log in to access this resource.',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
  
  // Database errors
  DUPLICATE_RECORD: 'This information already exists in the system.',
  RECORD_NOT_FOUND: 'The requested information could not be found.',
  INVALID_REFERENCE: 'The provided reference is invalid or does not exist.',
  DATABASE_ERROR: 'A database error occurred. Please try again.',
  
  // Validation errors
  VALIDATION_ERROR: 'The provided information is invalid. Please check your input.',
  MISSING_REQUIRED_FIELD: 'Required information is missing. Please complete all required fields.',
  
  // BLE errors
  BLE_DEVICE_NOT_FOUND: 'The Bluetooth device could not be found.',
  BLE_CONNECTION_FAILED: 'Failed to connect to the Bluetooth device.',
  BLE_SCAN_ERROR: 'Error occurred while scanning for devices.',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment before trying again.',
  
  // File operations
  FILE_NOT_FOUND: 'The requested file could not be found.',
  FILE_UPLOAD_ERROR: 'Error occurred while uploading the file.',
  
  // Generic errors
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
};

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  const userId = req.user?.userId;
  
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';
  let isOperational = error.isOperational || false;

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    isOperational = true;
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        code = 'DUPLICATE_RECORD';
        message = getDuplicateFieldMessage(error);
        break;
      case 'P2025':
        statusCode = 404;
        code = 'RECORD_NOT_FOUND';
        message = 'The requested record could not be found';
        break;
      case 'P2003':
        statusCode = 400;
        code = 'INVALID_REFERENCE';
        message = 'Invalid reference to related record';
        break;
      case 'P2014':
        statusCode = 400;
        code = 'INVALID_REFERENCE';
        message = 'The change you are trying to make would violate a required relation';
        break;
      case 'P2016':
        statusCode = 400;
        code = 'QUERY_INTERPRETATION_ERROR';
        message = 'Query interpretation error';
        break;
      default:
        statusCode = 400;
        code = 'DATABASE_ERROR';
        message = 'Database operation failed';
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid data provided';
    isOperational = true;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
    isOperational = true;
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
    isOperational = true;
  }

  // Handle validation errors from express-validator
  if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    isOperational = true;
  }

  // Handle multer errors (file upload)
  if (error.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    isOperational = true;
    switch (error.message) {
      case 'File too large':
        message = 'The uploaded file is too large';
        break;
      case 'Too many files':
        message = 'Too many files uploaded';
        break;
      default:
        message = 'File upload error';
    }
  }

  // Handle network and timeout errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'External service is unavailable';
    isOperational = true;
  }

  // Get user-friendly message
  const userFriendlyMessage = USER_FRIENDLY_MESSAGES[code] || message;

  // Log the error with appropriate level
  const logContext = error.context || getContextFromRequest(req);
  const logMetadata = {
    statusCode,
    code,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: sanitizeRequestBody(req.body),
    query: req.query,
    params: req.params,
    isOperational,
    ...error.metadata
  };

  if (statusCode >= 500) {
    logger.error(
      `Server Error: ${message}`,
      logContext,
      logMetadata,
      userId,
      requestId,
      error
    );
  } else if (statusCode >= 400) {
    logger.warn(
      `Client Error: ${message}`,
      logContext,
      logMetadata,
      userId,
      requestId
    );
  }

  // Prepare response
  const errorResponse: ErrorResponse = {
    success: false,
    message: userFriendlyMessage,
    code,
    timestamp: new Date().toISOString(),
    requestId
  };

  // Add development details
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      originalMessage: error.message,
      stack: error.stack,
      metadata: error.metadata
    };
  }

  // Add stack trace for server errors in development
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Helper function to extract duplicate field information from Prisma error
function getDuplicateFieldMessage(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target as string[];
  if (target && target.length > 0) {
    const field = target[0];
    return `A record with this ${field} already exists`;
  }
  return 'A record with this information already exists';
}

// Helper function to get context from request
function getContextFromRequest(req: Request): string {
  const route = req.route?.path || req.path;
  return `${req.method} ${route}`;
}

// Helper function to sanitize request body for logging
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Helper function to generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  code = 'CONFLICT';
  
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}