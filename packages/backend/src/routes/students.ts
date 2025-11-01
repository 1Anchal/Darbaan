import { auditExportMiddleware } from '@/middleware/audit';
import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { apiRateLimit } from '../middleware/rateLimiter';
import {
    Action,
    requirePermission,
    requireStudentRead,
    requireUserManagement,
    Resource
} from '../middleware/rbac';
import { exportService } from '../services/exportService';
import { studentService } from '../services/studentService';
import {
    bulkStudentImportSchema,
    createUserSchema,
    exportOptionsSchema,
    studentFiltersSchema,
    updateUserSchema
} from '../validation/schemas';

const router = express.Router();

// All student routes require authentication
router.use(authenticateToken);

// Get all students with filtering and pagination
router.get('/', 
  requireStudentRead,
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = studentFiltersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { page, limit, ...filters } = value;
    const students = await studentService.getAllStudents(filters);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStudents = students.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedStudents,
      pagination: {
        page,
        limit,
        total: students.length,
        totalPages: Math.ceil(students.length / limit),
        hasNext: endIndex < students.length,
        hasPrev: page > 1
      }
    });
  })
);

// Get students by class
router.get('/class/:classId',
  requireStudentRead,
  asyncHandler(async (req: Request, res: Response) => {
    const students = await studentService.getStudentsByClass(req.params.classId);
    
    res.json({
      success: true,
      data: students,
      count: students.length
    });
  })
);

// Export students
router.post('/export',
  requireStudentRead,
  exportRateLimit.middleware(),
  auditExportMiddleware('students'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error: filtersError, value: filters } = studentFiltersSchema.validate(req.body.filters || {});
    if (filtersError) {
      return res.status(400).json({
        success: false,
        message: 'Filters validation error',
        errors: filtersError.details.map(detail => detail.message)
      });
    }

    const { error: optionsError, value: options } = exportOptionsSchema.validate(req.body.options || {});
    if (optionsError) {
      return res.status(400).json({
        success: false,
        message: 'Export options validation error',
        errors: optionsError.details.map(detail => detail.message)
      });
    }

    // Get filtered students
    const students = await studentService.getAllStudents(filters);
    
    // Export data
    const exportResult = await exportService.exportStudentsWithFilters(
      students,
      filters,
      options
    );

    // Set response headers for file download
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.setHeader('Content-Length', exportResult.buffer.length);

    res.send(exportResult.buffer);
  })
);

// Create new student
router.post('/',
  requireUserManagement,
  apiRateLimit.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const student = await studentService.createStudent(value);
    
    res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully'
    });
  })
);

// Bulk import students
router.post('/bulk-import',
  requireUserManagement,
  apiRateLimit.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = bulkStudentImportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const result = await studentService.bulkImportStudents(value);
    
    res.status(201).json({
      success: true,
      data: {
        successful: result.successful,
        failed: result.failed,
        summary: {
          total: value.students.length,
          successful: result.successful.length,
          failed: result.failed.length
        }
      },
      message: `Bulk import completed. ${result.successful.length} students created, ${result.failed.length} failed.`
    });
  })
);

// Get specific student by ID
router.get('/:studentId',
  requireStudentRead,
  asyncHandler(async (req: Request, res: Response) => {
    const student = await studentService.getStudentById(req.params.studentId);
    
    res.json({
      success: true,
      data: student
    });
  })
);

// Update student
router.put('/:studentId',
  requirePermission(Resource.STUDENT, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const student = await studentService.updateStudent(req.params.studentId, value);
    
    res.json({
      success: true,
      data: student,
      message: 'Student updated successfully'
    });
  })
);

// Delete student
router.delete('/:studentId',
  requireUserManagement,
  asyncHandler(async (req: Request, res: Response) => {
    await studentService.deleteStudent(req.params.studentId);
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  })
);

// Enroll student in class
router.post('/:studentId/enroll/:classId',
  requirePermission(Resource.STUDENT, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    await studentService.enrollStudentInClass(req.params.studentId, req.params.classId);
    
    res.json({
      success: true,
      message: 'Student enrolled in class successfully'
    });
  })
);

// Unenroll student from class
router.delete('/:studentId/enroll/:classId',
  requirePermission(Resource.STUDENT, Action.UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    await studentService.unenrollStudentFromClass(req.params.studentId, req.params.classId);
    
    res.json({
      success: true,
      message: 'Student unenrolled from class successfully'
    });
  })
);

export default router;