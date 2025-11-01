import axios from 'axios';
import {
    ApiResponse,
    Class,
    ClassEnrollment,
    ClassFilters,
    CreateClassRequest,
    Instructor,
    UpdateClassRequest
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class ClassService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getAllClasses(filters?: ClassFilters): Promise<ApiResponse<Class[]>> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await axios.get(
        `${API_BASE_URL}/classes?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error.response?.data?.message || 'Failed to fetch classes'
      };
    }
  }

  async getClassById(classId: string): Promise<ApiResponse<Class>> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/classes/${classId}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch class'
      };
    }
  }

  async createClass(classData: CreateClassRequest): Promise<ApiResponse<Class>> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/classes`,
        classData,
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
        error: error.response?.data?.message || 'Failed to create class'
      };
    }
  }

  async updateClass(classId: string, updateData: UpdateClassRequest): Promise<ApiResponse<Class>> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/classes/${classId}`,
        updateData,
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
        error: error.response?.data?.message || 'Failed to update class'
      };
    }
  }

  async deleteClass(classId: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/classes/${classId}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete class'
      };
    }
  }

  async getAvailableInstructors(): Promise<ApiResponse<Instructor[]>> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/classes/instructors`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error.response?.data?.message || 'Failed to fetch instructors'
      };
    }
  }

  async getClassEnrollments(classId: string): Promise<ApiResponse<ClassEnrollment[]>> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/classes/${classId}/enrollments`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error.response?.data?.message || 'Failed to fetch class enrollments'
      };
    }
  }

  async enrollStudents(classId: string, studentIds: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/classes/${classId}/enrollments`,
        { studentIds },
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to enroll students'
      };
    }
  }

  async unenrollStudents(classId: string, studentIds: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/classes/${classId}/enrollments`,
        {
          headers: this.getAuthHeaders(),
          data: { studentIds }
        }
      );

      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to unenroll students'
      };
    }
  }
}

export const classService = new ClassService();