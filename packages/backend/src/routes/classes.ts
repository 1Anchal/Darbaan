import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { apiRateLimit } from '../middleware/rateLimiter';
import {
    Action,
    requireClassManagement,
    requireClassRead,
    requirePermission,
    Resource
} from '../middleware/rbac';
import { classService } from '../services/classService';
import {
    bulkEnrollmentSchema,
    classFiltersSchema,
    createClassSchema,
    enrollmentSchema,
    updateClassSchema
} from '../validation/schemas';

const router = express.Router();

// All class routes require authentication
router.use(authenticateToken);

// Get all classes with filtering and pagination
router.get('/', 
  requireClassRead,
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = classFiltersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { page, limit, ...filters } = value;
    const classes = await classService.getAllClasses(filters);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedClasses = classes.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedClasses,
      pagination: {
        page,
        limit,
        total: classes.length,
        totalPages: Math.ceil(classes.length / limit),
        hasNext: endIndex < classes.length,
        hasPrev: page > 1
      }
    });
  })
);

// Get available instructors
router.get('/instructors',
  requireClassRead,
  asyncHandler(async (req: Request, res: Response) => {
    const instructors = await classService.getAvailableInstructors();
    
    res.json({
      success: true,
      data: instructors
    });
  })
);

// Create new class
router.post('/',
  requireClassManagement,
  apiRateLimit.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = createClassSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const cls = await classService.createClass(value);
    
    res.status(201).json({
      success: true,
      data: cls,
      message: 'Class created successfully'
    });
  })
);

// Get specific class by ID
router.get('/:classId',
  requireClassRead,
  asyncHandler(async (req: Request, res: Response) => {
    const cls = await classService.getClassById(req.params.classId);
    
    res.json({
      success: true,
      data: cls
    });
  })
);

// Update class
router.put('/:classId',
  requirePermission(Resource.CLASS, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = updateClassSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const cls = await classService.updateClass(req.params.classId, value);
    
    res.json({
      success: true,
      data: cls,
      message: 'Class updated successfully'
    });
  })
);

// Delete class
router.delete('/:classId',
  requireClassManagement,
  asyncHandler(async (req: Request, res: Response) => {
    await classService.deleteClass(req.params.classId);
    
    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  })
);

// Get class enrollments
router.get('/:classId/enrollments',
  requireClassRead,
  asyncHandler(async (req: Request, res: Response) => {
    const enrollments = await classService.getClassEnrollments(req.params.classId);
    
    res.json({
      success: true,
      data: enrollments,
      count: enrollments.length
    });
  })
);

// Enroll students in class
router.post('/:classId/enrollments',
  requirePermission(Resource.CLASS, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = enrollmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    await classService.enrollStudents(req.params.classId, value.studentIds);
    
    res.json({
      success: true,
      message: 'Students enrolled successfully'
    });
  })
);

// Unenroll students from class
router.delete('/:classId/enrollments',
  requirePermission(Resource.CLASS, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = enrollmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    await classService.unenrollStudents(req.params.classId, value.studentIds);
    
    res.json({
      success: true,
      message: 'Students unenrolled successfully'
    });
  })
);

// Bulk enrollment endpoint
router.post('/bulk-enrollment',
  requireClassManagement,
  apiRateLimit.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = bulkEnrollmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    await classService.enrollStudents(value.classId, value.studentIds);
    
    res.json({
      success: true,
      message: `${value.studentIds.length} students enrolled successfully`
    });
  })
);

export default router;