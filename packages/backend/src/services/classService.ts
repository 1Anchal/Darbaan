import { PrismaClient } from '@prisma/client';
import { Class, ClassSchedule } from '../types';

const prisma = new PrismaClient();

export interface CreateClassRequest {
  name: string;
  code: string;
  description?: string;
  instructorId: string;
  maxCapacity: number;
  location: string;
  schedule: ClassSchedule[];
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  instructorId?: string;
  maxCapacity?: number;
  location?: string;
  schedule?: ClassSchedule[];
  isActive?: boolean;
}

export interface ClassFilters {
  instructorId?: string;
  location?: string;
  isActive?: boolean;
  search?: string;
}

export interface EnrollmentRequest {
  studentIds: string[];
}

export interface BulkEnrollmentRequest {
  classId: string;
  studentIds: string[];
}

class ClassService {
  async getAllClasses(filters: ClassFilters = {}): Promise<Class[]> {
    const { instructorId, location, isActive, search } = filters;

    const whereClause: any = {};

    if (instructorId) {
      whereClause.instructorId = instructorId;
    }

    if (location) {
      whereClause.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          code: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true
          }
        },
        schedules: true,
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                studentId: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return classes.map((cls: any) => ({
      id: cls.id,
      name: cls.name,
      code: cls.code,
      description: cls.description || undefined,
      instructor: cls.instructorId,
      schedule: cls.schedules.map((schedule: any) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      })),
      enrolledStudents: cls.enrollments.map((enrollment: any) => enrollment.userId),
      maxCapacity: cls.maxCapacity,
      location: cls.location,
      isActive: cls.isActive,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt
    }));
  }

  async getClassById(classId: string): Promise<Class> {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true
          }
        },
        schedules: true,
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                studentId: true
              }
            }
          }
        }
      }
    });

    if (!cls) {
      throw new Error('Class not found');
    }

    return {
      id: cls.id,
      name: cls.name,
      code: cls.code,
      description: cls.description || undefined,
      instructor: cls.instructorId,
      schedule: cls.schedules.map((schedule: any) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      })),
      enrolledStudents: cls.enrollments.map((enrollment: any) => enrollment.userId),
      maxCapacity: cls.maxCapacity,
      location: cls.location,
      isActive: cls.isActive,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt
    };
  }

  async createClass(classData: CreateClassRequest): Promise<Class> {
    // Check if instructor exists and has faculty or admin role
    const instructor = await prisma.user.findUnique({
      where: { id: classData.instructorId }
    });

    if (!instructor) {
      throw new Error('Instructor not found');
    }

    if (instructor.role !== 'FACULTY' && instructor.role !== 'ADMIN') {
      throw new Error('Only faculty and admin users can be instructors');
    }

    // Check if class code is unique
    const existingClass = await prisma.class.findUnique({
      where: { code: classData.code }
    });

    if (existingClass) {
      throw new Error('Class code already exists');
    }

    const cls = await prisma.class.create({
      data: {
        name: classData.name,
        code: classData.code,
        description: classData.description,
        instructorId: classData.instructorId,
        maxCapacity: classData.maxCapacity,
        location: classData.location,
        schedules: {
          create: classData.schedule.map((schedule: any) => ({
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime
          }))
        }
      },
      include: {
        schedules: true
      }
    });

    return {
      id: cls.id,
      name: cls.name,
      code: cls.code,
      description: cls.description || undefined,
      instructor: cls.instructorId,
      schedule: cls.schedules.map((schedule: any) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      })),
      enrolledStudents: [],
      maxCapacity: cls.maxCapacity,
      location: cls.location,
      isActive: cls.isActive,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt
    };
  }

  async updateClass(classId: string, updateData: UpdateClassRequest): Promise<Class> {
    const existingClass = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!existingClass) {
      throw new Error('Class not found');
    }

    // If updating instructor, validate the new instructor
    if (updateData.instructorId) {
      const instructor = await prisma.user.findUnique({
        where: { id: updateData.instructorId }
      });

      if (!instructor) {
        throw new Error('Instructor not found');
      }

      if (instructor.role !== 'FACULTY' && instructor.role !== 'ADMIN') {
        throw new Error('Only faculty and admin users can be instructors');
      }
    }

    // Update class and schedules in a transaction
    const updatedClass = await prisma.$transaction(async (tx: any) => {
      // Update class basic info
      const cls = await tx.class.update({
        where: { id: classId },
        data: {
          name: updateData.name,
          description: updateData.description,
          instructorId: updateData.instructorId,
          maxCapacity: updateData.maxCapacity,
          location: updateData.location,
          isActive: updateData.isActive
        }
      });

      // Update schedules if provided
      if (updateData.schedule) {
        // Delete existing schedules
        await tx.classSchedule.deleteMany({
          where: { classId }
        });

        // Create new schedules
        await tx.classSchedule.createMany({
          data: updateData.schedule.map((schedule: any) => ({
            classId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime
          }))
        });
      }

      // Fetch updated class with relations
      return await tx.class.findUnique({
        where: { id: classId },
        include: {
          schedules: true,
          enrollments: true
        }
      });
    });

    if (!updatedClass) {
      throw new Error('Failed to update class');
    }

    return {
      id: updatedClass.id,
      name: updatedClass.name,
      code: updatedClass.code,
      description: updatedClass.description || undefined,
      instructor: updatedClass.instructorId,
      schedule: updatedClass.schedules.map((schedule: any) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      })),
      enrolledStudents: updatedClass.enrollments.map((enrollment: any) => enrollment.userId),
      maxCapacity: updatedClass.maxCapacity,
      location: updatedClass.location,
      isActive: updatedClass.isActive,
      createdAt: updatedClass.createdAt,
      updatedAt: updatedClass.updatedAt
    };
  }

  async deleteClass(classId: string): Promise<void> {
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: {
          select: {
            enrollments: true,
            attendanceRecords: true
          }
        }
      }
    });

    if (!existingClass) {
      throw new Error('Class not found');
    }

    // Check if class has attendance records
    if (existingClass._count.attendanceRecords > 0) {
      throw new Error('Cannot delete class with existing attendance records. Consider deactivating instead.');
    }

    // Delete class and related data in transaction
    await prisma.$transaction(async (tx: any) => {
      // Delete enrollments
      await tx.classEnrollment.deleteMany({
        where: { classId }
      });

      // Delete schedules
      await tx.classSchedule.deleteMany({
        where: { classId }
      });

      // Delete class
      await tx.class.delete({
        where: { id: classId }
      });
    });
  }

  async enrollStudents(classId: string, studentIds: string[]): Promise<void> {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    if (!cls) {
      throw new Error('Class not found');
    }

    if (!cls.isActive) {
      throw new Error('Cannot enroll students in inactive class');
    }

    // Check capacity
    const newEnrollmentCount = cls._count.enrollments + studentIds.length;
    if (newEnrollmentCount > cls.maxCapacity) {
      throw new Error(`Enrollment would exceed class capacity. Available spots: ${cls.maxCapacity - cls._count.enrollments}`);
    }

    // Validate all students exist and are active
    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: 'STUDENT',
        isActive: true
      }
    });

    if (students.length !== studentIds.length) {
      throw new Error('One or more students not found or inactive');
    }

    // Check for existing enrollments
    const existingEnrollments = await prisma.classEnrollment.findMany({
      where: {
        classId,
        userId: { in: studentIds }
      }
    });

    if (existingEnrollments.length > 0) {
      const alreadyEnrolled = existingEnrollments.map((e: any) => e.userId);
      throw new Error(`Students already enrolled: ${alreadyEnrolled.join(', ')}`);
    }

    // Create enrollments
    await prisma.classEnrollment.createMany({
      data: studentIds.map((studentId: any) => ({
        classId,
        userId: studentId
      }))
    });
  }

  async unenrollStudents(classId: string, studentIds: string[]): Promise<void> {
    const cls = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!cls) {
      throw new Error('Class not found');
    }

    // Remove enrollments
    await prisma.classEnrollment.deleteMany({
      where: {
        classId,
        userId: { in: studentIds }
      }
    });
  }

  async getClassEnrollments(classId: string) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentId: true,
            isActive: true
          }
        }
      },
      orderBy: {
        user: {
          lastName: 'asc'
        }
      }
    });

    return enrollments.map((enrollment: any) => ({
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      student: enrollment.user
    }));
  }

  async getAvailableInstructors() {
    const instructors = await prisma.user.findMany({
      where: {
        role: { in: ['FACULTY', 'ADMIN'] },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    return instructors;
  }
}

export const classService = new ClassService();