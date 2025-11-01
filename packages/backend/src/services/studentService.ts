import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { CreateUserRequest, UpdateUserRequest, User, UserRole } from '../types';
import { userService } from './userService';

const prisma = new PrismaClient();

export interface StudentFilters {
  classId?: string;
  search?: string;
  isActive?: boolean;
}

export interface BulkStudentImport {
  students: CreateUserRequest[];
}

export interface StudentWithClasses extends User {
  classes: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export class StudentService {
  async getAllStudents(filters?: StudentFilters): Promise<StudentWithClasses[]> {
    const whereClause: any = {
      role: UserRole.STUDENT
    };

    // Apply filters
    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters?.search) {
      whereClause.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { studentId: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Handle class filtering
    if (filters?.classId) {
      whereClause.enrolledClasses = {
        some: {
          classId: filters.classId
        }
      };
    }

    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        bleDevices: true,
        enrolledClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    return students.map(student => this.transformStudentResponse(student));
  }

  async getStudentById(studentId: string): Promise<StudentWithClasses> {
    const student = await prisma.user.findUnique({
      where: { 
        id: studentId,
        role: UserRole.STUDENT
      },
      include: {
        bleDevices: true,
        enrolledClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    return this.transformStudentResponse(student);
  }

  async createStudent(studentData: CreateUserRequest): Promise<StudentWithClasses> {
    // Ensure role is student
    if (studentData.role !== UserRole.STUDENT) {
      throw new ValidationError('User role must be student');
    }

    // Validate required student fields
    if (!studentData.studentId) {
      throw new ValidationError('Student ID is required for students');
    }

    const user = await userService.createUser(studentData);
    return this.getStudentById(user.id);
  }

  async updateStudent(studentId: string, updates: UpdateUserRequest): Promise<StudentWithClasses> {
    // Verify student exists
    const existingStudent = await prisma.user.findUnique({
      where: { 
        id: studentId,
        role: UserRole.STUDENT
      }
    });

    if (!existingStudent) {
      throw new NotFoundError('Student not found');
    }

    await userService.updateUser(studentId, updates);
    return this.getStudentById(studentId);
  }

  async deleteStudent(studentId: string): Promise<void> {
    // Verify student exists
    const student = await prisma.user.findUnique({
      where: { 
        id: studentId,
        role: UserRole.STUDENT
      }
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    await userService.deleteUser(studentId);
  }

  async bulkImportStudents(importData: BulkStudentImport): Promise<{
    successful: StudentWithClasses[];
    failed: Array<{ student: CreateUserRequest; error: string }>;
  }> {
    const successful: StudentWithClasses[] = [];
    const failed: Array<{ student: CreateUserRequest; error: string }> = [];

    for (const studentData of importData.students) {
      try {
        // Ensure role is student
        studentData.role = UserRole.STUDENT;
        
        const createdStudent = await this.createStudent(studentData);
        successful.push(createdStudent);
      } catch (error) {
        failed.push({
          student: studentData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }

  async getStudentsByClass(classId: string): Promise<StudentWithClasses[]> {
    return this.getAllStudents({ classId });
  }

  async enrollStudentInClass(studentId: string, classId: string): Promise<void> {
    await userService.enrollStudentInClass(studentId, classId);
  }

  async unenrollStudentFromClass(studentId: string, classId: string): Promise<void> {
    await userService.unenrollStudentFromClass(studentId, classId);
  }

  private transformStudentResponse(student: any): StudentWithClasses {
    return {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      role: student.role as UserRole,
      studentId: student.studentId || undefined,
      employeeId: student.employeeId || undefined,
      enrolledClasses: student.enrolledClasses?.map((enrollment: any) => enrollment.classId) || [],
      bleDevices: student.bleDevices || [],
      isActive: student.isActive,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      classes: student.enrolledClasses?.map((enrollment: any) => enrollment.class) || []
    };
  }
}

export const studentService = new StudentService();