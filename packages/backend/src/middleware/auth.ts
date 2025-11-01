import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/authService';
import { UserRole } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = authService.verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Convenience middleware for specific roles
export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireFacultyOrAdmin = requireRole([UserRole.FACULTY, UserRole.ADMIN]);
export const requireAnyRole = requireRole([UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN]);

// Middleware to add user context to request
export const addUserContext = (req: Request, res: Response, next: NextFunction) => {
  // This middleware can be used to add additional user context
  // such as enrolled classes, managed classes, etc.
  // For now, it just passes through
  next();
};