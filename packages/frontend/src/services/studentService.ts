import axios from 'axios';
import { ApiResponse, CreateUserRequest, UpdateUserRequest, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface StudentWithClasses extends User {
  classes: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export interface StudentFilters {
  classId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ExportOptions {
  format: 'csv' | 'excel';
  includeClasses?: boolean;
  filename?: string;
}

export interface BulkImportResult {
  successful: StudentWithClasses[];
  failed: Array<{ student: CreateUserRequest; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

class StudentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getAllStudents(filters?: StudentFilters): Promise<ApiResponse<PaginatedResponse<StudentWithClasses>>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.classId) params.append('classId', filters.classId);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await axios.get(
        `${API_BASE_URL}/students?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: {
          data: response.data.data,
          pagination: response.data.pagination
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch students'
      };
    }
  }

  async getStudentById(studentId: string): Promise<ApiResponse<StudentWithClasses>> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/students/${studentId}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch student'
      };
    }
  }

  async getStudentsByClass(classId: string): Promise<ApiResponse<StudentWithClasses[]>> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/students/class/${classId}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch students by class'
      };
    }
  }

  async createStudent(studentData: CreateUserRequest): Promise<ApiResponse<StudentWithClasses>> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/students`,
        studentData,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create student'
      };
    }
  }

  async updateStudent(studentId: string, updates: UpdateUserRequest): Promise<ApiResponse<StudentWithClasses>> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/students/${studentId}`,
        updates,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update student'
      };
    }
  }

  async deleteStudent(studentId: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/students/${studentId}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete student'
      };
    }
  }

  async bulkImportStudents(students: CreateUserRequest[]): Promise<ApiResponse<BulkImportResult>> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/students/bulk-import`,
        { students },
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to import students'
      };
    }
  }

  async exportStudents(filters: StudentFilters, options: ExportOptions): Promise<Blob> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/students/export`,
        { filters, options },
        {
          headers: this.getAuthHeaders(),
          responseType: 'blob'
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to export students');
    }
  }

  async enrollStudentInClass(studentId: string, classId: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/students/${studentId}/enroll/${classId}`,
        {},
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to enroll student'
      };
    }
  }

  async unenrollStudentFromClass(studentId: string, classId: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/students/${studentId}/enroll/${classId}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to unenroll student'
      };
    }
  }

  // Helper method to download exported file
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const studentService = new StudentService();