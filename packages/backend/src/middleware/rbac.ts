import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types';

// Permission definitions for different resources and actions
export enum Resource {
  USER = 'user',
  STUDENT = 'student',
  CLASS = 'class',
  ATTENDANCE = 'attendance',
  REPORT = 'report',
  CROWD = 'crowd',
  SETTINGS = 'settings',
  BLE_DEVICE = 'ble_device'
}

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Full access
  EXPORT = 'export',
  IMPORT = 'import'
}

// Permission matrix defining what each role can do
const PERMISSION_MATRIX: Record<UserRole, Record<Resource, Action[]>> = {
  [UserRole.ADMIN]: {
    [Resource.USER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
    [Resource.STUDENT]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXPORT, Action.IMPORT],
    [Resource.CLASS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
    [Resource.ATTENDANCE]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXPORT],
    [Resource.REPORT]: [Action.READ, Action.EXPORT, Action.MANAGE],
    [Resource.CROWD]: [Action.READ, Action.UPDATE, Action.MANAGE],
    [Resource.SETTINGS]: [Action.READ, Action.UPDATE, Action.MANAGE],
    [Resource.BLE_DEVICE]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE]
  },
  [UserRole.FACULTY]: {
    [Resource.USER]: [Action.READ], // Can only view user profiles
    [Resource.STUDENT]: [Action.READ, Action.EXPORT], // Can view and export student data
    [Resource.CLASS]: [Action.READ, Action.UPDATE], // Can view all classes, update own classes
    [Resource.ATTENDANCE]: [Action.READ, Action.UPDATE, Action.EXPORT], // Can manage attendance for their classes
    [Resource.REPORT]: [Action.READ, Action.EXPORT], // Can view and export reports
    [Resource.CROWD]: [Action.READ], // Can view crowd data
    [Resource.SETTINGS]: [Action.READ], // Can view settings
    [Resource.BLE_DEVICE]: [Action.READ, Action.UPDATE] // Can view and update own BLE devices
  },
  [UserRole.STUDENT]: {
    [Resource.USER]: [], // No user management access
    [Resource.STUDENT]: [], // No student management access
    [Resource.CLASS]: [Action.READ], // Can view enrolled classes
    [Resource.ATTENDANCE]: [Action.READ], // Can view own attendance
    [Resource.REPORT]: [Action.READ], // Can view own reports
    [Resource.CROWD]: [Action.READ], // Can view crowd data
    [Resource.SETTINGS]: [], // No settings access
    [Resource.BLE_DEVICE]: [Action.READ, Action.UPDATE] // Can view and update own BLE devices
  }
};

// Middleware to check if user has permission for a specific resource and action
export const requirePermission = (resource: Resource, action: Action) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const permissions = PERMISSION_MATRIX[userRole];
    
    if (!permissions || !permissions[resource]) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: No permissions for this resource'
      });
    }

    const allowedActions = permissions[resource];
    
    if (!allowedActions.includes(action) && !allowedActions.includes(Action.MANAGE)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Cannot ${action} ${resource}`
      });
    }

    next();
  };
};

// Middleware to check if user can access their own resources or has admin privileges
export const requireOwnershipOrAdmin = (getUserIdFromParams: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const targetUserId = getUserIdFromParams(req);
    const currentUserId = req.user.userId;
    const userRole = req.user.role;

    // Admin can access any resource
    if (userRole === UserRole.ADMIN) {
      return next();
    }

    // User can only access their own resources
    if (currentUserId === targetUserId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied: Can only access your own resources'
    });
  };
};

// Middleware to check if user can manage a specific class
export const requireClassAccess = (getClassIdFromParams: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const classId = getClassIdFromParams(req);
    const userRole = req.user.role;
    const userId = req.user.userId;

    // Admin can access any class
    if (userRole === UserRole.ADMIN) {
      return next();
    }

    // Faculty can access classes they instruct
    if (userRole === UserRole.FACULTY) {
      // Note: In a real implementation, you'd query the database to check if the user is the instructor
      // For now, we'll allow faculty to access classes (this should be enhanced with actual DB check)
      return next();
    }

    // Students can only access classes they're enrolled in
    if (userRole === UserRole.STUDENT) {
      // Note: In a real implementation, you'd query the database to check enrollment
      // For now, we'll allow students to access classes (this should be enhanced with actual DB check)
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied: No access to this class'
    });
  };
};

// Helper function to check permissions programmatically
export const hasPermission = (userRole: UserRole, resource: Resource, action: Action): boolean => {
  const permissions = PERMISSION_MATRIX[userRole];
  if (!permissions || !permissions[resource]) {
    return false;
  }
  
  const allowedActions = permissions[resource];
  return allowedActions.includes(action) || allowedActions.includes(Action.MANAGE);
};

// Simple role-based access control middleware
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware for specific common permission checks
export const requireUserManagement = requirePermission(Resource.USER, Action.MANAGE);
export const requireStudentRead = requirePermission(Resource.STUDENT, Action.READ);
export const requireStudentManagement = requirePermission(Resource.STUDENT, Action.MANAGE);
export const requireClassRead = requirePermission(Resource.CLASS, Action.READ);
export const requireClassManagement = requirePermission(Resource.CLASS, Action.MANAGE);
export const requireAttendanceRead = requirePermission(Resource.ATTENDANCE, Action.READ);
export const requireAttendanceManagement = requirePermission(Resource.ATTENDANCE, Action.MANAGE);
export const requireReportAccess = requirePermission(Resource.REPORT, Action.READ);
export const requireSettingsManagement = requirePermission(Resource.SETTINGS, Action.MANAGE);
export const requireCrowdManagement = requirePermission(Resource.CROWD, Action.MANAGE);