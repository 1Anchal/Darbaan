import axios from 'axios';
import { AuthResult, LoginCredentials, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class AuthService {
  private readonly TOKEN_KEY = 'darbaan_token';
  private readonly REFRESH_TOKEN_KEY = 'darbaan_refresh_token';
  private readonly USER_KEY = 'darbaan_user';

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
      const result: AuthResult = response.data;

      if (result.success && result.token && result.refreshToken && result.user) {
        this.setTokens(result.token, result.refreshToken);
        this.setUser(result.user);
        this.setupAxiosInterceptors();
      }

      return result;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Network error occurred'
      };
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken
      });

      const result: AuthResult = response.data;

      if (result.success && result.token && result.refreshToken && result.user) {
        this.setTokens(result.token, result.refreshToken);
        this.setUser(result.user);
        return true;
      }

      return false;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // Remove axios authorization header
    delete axios.defaults.headers.common['Authorization'];
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    
    // Set axios authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  setupAxiosInterceptors(): void {
    // Request interceptor to add token
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshSuccess = await this.refreshToken();
          if (refreshSuccess) {
            const token = this.getToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          } else {
            this.logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Initialize service (call this on app startup)
  initialize(): void {
    if (this.isAuthenticated()) {
      this.setupAxiosInterceptors();
    }
  }
}

export const authService = new AuthService();