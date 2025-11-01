import { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { CreateUserRequest, UpdateUserRequest, User, UserRole } from '../types';
import { authService } from './authService';

const prisma = new PrismaClient();

export class UserService {
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Check for duplicate student/employee ID
      if (userData.studentId) {
        const existingStudent = await prisma.user.findUnique({
          where: { studentId: userData.studentId }
        });
        if (existingStudent) {
          throw new ConflictError('Student ID already exists');
        }
      }

      if (userData.employeeId) {
        const existingEmployee = await prisma.user.findUnique({
          where: { employeeId: userData.employeeId }
        });
        if (existingEmployee) {
          throw new ConflictError('Employee ID already exists');
        }
      }

      // Hash password
      const hashedPassword = await authService.hashPassword(userData.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          studentId: userData.studentId,
          employeeId: userData.employeeId
        },
        include: {
          bleDevices: true,
          enrolledClasses: {
            include: {
              class: true
            }
          }
        }
      });

      // Transform response (exclude password)
      return this.transformUserResponse(user);
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      throw new Error('Failed to create user');
    }
  }

  async getUserById(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bleDevices: true,
        enrolledClasses: {
          include: {
            class: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.transformUserResponse(user);
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        bleDevices: true,
        enrolledClasses: {
          include: {
            class: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.transformUserResponse(user);
  }

  async getAllUsers(role?: UserRole): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      include: {
        bleDevices: true,
        enrolledClasses: {
          include: {
            class: true
          }
        }
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    return users.map(user => this.transformUserResponse(user));
  }

  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Check for email conflicts
    if (updates.email && updates.email !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: updates.email }
      });
      if (emailConflict) {
        throw new ConflictError('Email already exists');
      }
    }

    // Check for student ID conflicts
    if (updates.studentId && updates.studentId !== existingUser.studentId) {
      const studentIdConflict = await prisma.user.findUnique({
        where: { studentId: updates.studentId }
      });
      if (studentIdConflict) {
        throw new ConflictError('Student ID already exists');
      }
    }

    // Check for employee ID conflicts
    if (updates.employeeId && updates.employeeId !== existingUser.employeeId) {
      const employeeIdConflict = await prisma.user.findUnique({
        where: { employeeId: updates.employeeId }
      });
      if (employeeIdConflict) {
        throw new ConflictError('Employee ID already exists');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
      include: {
        bleDevices: true,
        enrolledClasses: {
          include: {
            class: true
          }
        }
      }
    });

    return this.transformUserResponse(updatedUser);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.delete({
      where: { id: userId }
    });
  }

  async getStudents(): Promise<User[]> {
    return this.getAllUsers(UserRole.STUDENT);
  }

  async getFaculty(): Promise<User[]> {
    return this.getAllUsers(UserRole.FACULTY);
  }

  async getAdmins(): Promise<User[]> {
    return this.getAllUsers(UserRole.ADMIN);
  }

  async enrollStudentInClass(studentId: string, classId: string): Promise<void> {
    // Verify student exists and is a student
    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundError('Student not found');
    }

    // Verify class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classExists) {
      throw new NotFoundError('Class not found');
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: {
        userId_classId: {
          userId: studentId,
          classId: classId
        }
      }
    });

    if (existingEnrollment) {
      throw new ConflictError('Student is already enrolled in this class');
    }

    await prisma.classEnrollment.create({
      data: {
        userId: studentId,
        classId: classId
      }
    });
  }

  async unenrollStudentFromClass(studentId: string, classId: string): Promise<void> {
    const enrollment = await prisma.classEnrollment.findUnique({
      where: {
        userId_classId: {
          userId: studentId,
          classId: classId
        }
      }
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    await prisma.classEnrollment.delete({
      where: {
        userId_classId: {
          userId: studentId,
          classId: classId
        }
      }
    });
  }

  private transformUserResponse(user: any): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      studentId: user.studentId || undefined,
      employeeId: user.employeeId || undefined,
      enrolledClasses: user.enrolledClasses?.map((enrollment: any) => enrollment.classId) || [],
      bleDevices: user.bleDevices || [],
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export const userService = new UserService();