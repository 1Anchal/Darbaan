import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthResult, LoginCredentials, User } from '../types';

const prisma = new PrismaClient();

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials;

      // Find user by email
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
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate tokens
      const token = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Transform user data (exclude password)
      const userResponse: User = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as any,
        studentId: user.studentId || undefined,
        employeeId: user.employeeId || undefined,
        enrolledClasses: user.enrolledClasses.map(enrollment => enrollment.classId),
        bleDevices: user.bleDevices,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return {
        success: true,
        token,
        refreshToken,
        user: userResponse,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as any;
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          bleDevices: true,
          enrolledClasses: {
            include: {
              class: true
            }
          }
        }
      });

      if (!user || !user.isActive) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Generate new tokens
      const newToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Transform user data
      const userResponse: User = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as any,
        studentId: user.studentId || undefined,
        employeeId: user.employeeId || undefined,
        enrolledClasses: user.enrolledClasses.map(enrollment => enrollment.classId),
        bleDevices: user.bleDevices,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return {
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
        user: userResponse,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid refresh token'
      };
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  private generateRefreshToken(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN }
    );
  }

  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

export const authService = new AuthService();