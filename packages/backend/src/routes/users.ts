import { auditMiddleware } from '@/middleware/audit';
import { strictRateLimit } from '@/middleware/rateLimiter';
import { AuditEventType } from '@/services/auditService';
import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
    Action,
    requireOwnershipOrAdmin,
    requirePermission,
    requireStudentRead,
    requireUserManagement,
    Resource
} from '../middleware/rbac';
import { userService } from '../services/userService';
import { UserRole } from '../types';
import { createUserSchema, updateUserSchema } from '../validation/schemas';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', 
  requirePermission(Resource.USER, Action.READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.query;
    const users = await userService.getAllUsers(role as UserRole);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  })
);

// Get current user profile
router.get('/me', 
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.user!.userId);
    
    res.json({
      success: true,
      data: user
    });
  })
);

// Create new user (admin only)
router.post('/',
  requireUserManagement,
  strictRateLimit.middleware(),
  auditMiddleware(AuditEventType.USER_CREATED, 'user'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const user = await userService.createUser(value);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  })
);

// Get specific user by ID
router.get('/:userId',
  requireOwnershipOrAdmin((req) => req.params.userId),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.userId);
    
    res.json({
      success: true,
      data: user
    });
  })
);

// Update user
router.put('/:userId',
  requireOwnershipOrAdmin((req) => req.params.userId),
  auditMiddleware(AuditEventType.USER_UPDATED, 'user'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const user = await userService.updateUser(req.params.userId, value);
    
    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  })
);

// Delete user (admin only)
router.delete('/:userId',
  requireUserManagement,
  strictRateLimit.middleware(),
  auditMiddleware(AuditEventType.USER_DELETED, 'user'),
  asyncHandler(async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.userId);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  })
);

// Get students (faculty and admin)
router.get('/role/students',
  requireStudentRead,
  asyncHandler(async (req: Request, res: Response) => {
    const students = await userService.getStudents();
    
    res.json({
      success: true,
      data: students,
      count: students.length
    });
  })
);

// Get faculty (admin only)
router.get('/role/faculty',
  requirePermission(Resource.USER, Action.READ),
  asyncHandler(async (req: Request, res: Response) => {
    const faculty = await userService.getFaculty();
    
    res.json({
      success: true,
      data: faculty,
      count: faculty.length
    });
  })
);

// Get admins (admin only)
router.get('/role/admins',
  requirePermission(Resource.USER, Action.READ),
  asyncHandler(async (req: Request, res: Response) => {
    const admins = await userService.getAdmins();
    
    res.json({
      success: true,
      data: admins,
      count: admins.length
    });
  })
);

// Enroll student in class (admin and faculty)
router.post('/:studentId/enroll/:classId',
  requirePermission(Resource.STUDENT, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    await userService.enrollStudentInClass(req.params.studentId, req.params.classId);
    
    res.json({
      success: true,
      message: 'Student enrolled successfully'
    });
  })
);

// Unenroll student from class (admin and faculty)
router.delete('/:studentId/enroll/:classId',
  requirePermission(Resource.STUDENT, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    await userService.unenrollStudentFromClass(req.params.studentId, req.params.classId);
    
    res.json({
      success: true,
      message: 'Student unenrolled successfully'
    });
  })
);

export default router;