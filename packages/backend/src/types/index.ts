// Core type definitions for the Darbaan system

// Enums for type safety
export enum UserRole {
  STUDENT = 'student',
  FACULTY = 'faculty',
  ADMIN = 'admin'
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  PARTIAL = 'partial'
}

export enum DeviceType {
  ANDROID_PHONE = 'android_phone',
  IOS_PHONE = 'ios_phone',
  SMARTPHONE = 'smartphone',
  WEARABLE = 'wearable',
  BEACON = 'beacon'
}

export enum CrowdLocation {
  FOOD_STREET = 'food-street',
  ROCK_PLAZA = 'rock-plaza',
  CENTRAL_LIBRARY = 'central-library',
  MAIN_AUDITORIUM = 'main-auditorium'
}

export enum AlertLevel {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export enum SettingsCategory {
  GENERAL = 'general',
  ATTENDANCE = 'attendance',
  NOTIFICATIONS = 'notifications',
  SECURITY = 'security',
  SYSTEM = 'system'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  studentId?: string;
  employeeId?: string;
  enrolledClasses?: string[];
  bleDevices: BLEDevice[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BLEDevice {
  id: string;
  userId: string;
  macAddress: string;
  deviceName: string;
  deviceType: DeviceType;
  isActive: boolean;
  lastSeen: Date;
  batteryLevel?: number;
  signalStrength?: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  classId?: string;
  entryTime: Date;
  exitTime?: Date;
  location: string;
  isLateArrival: boolean;
  attendanceStatus: AttendanceStatus;
  deviceId: string;
  createdAt: Date;
}

export interface Class {
  id: string;
  name: string;
  code: string;
  description?: string;
  instructor: string;
  schedule: ClassSchedule[];
  enrolledStudents: string[];
  maxCapacity: number;
  location: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CrowdData {
  id: string;
  location: CrowdLocation;
  timestamp: Date;
  occupancyCount: number;
  maxCapacity: number;
  occupancyRate: number;
  alertLevel: AlertLevel;
  activeDevices: string[];
}
// System Settings interface
export interface SystemSettings {
  id: string;
  category: SettingsCategory;
  
  // General Settings
  systemName?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  enableBackups?: boolean;
  
  // Attendance Settings
  lateThresholdMins?: number;
  absentThresholdMins?: number;
  cooldownPeriodSecs?: number;
  enableManualEntry?: boolean;
  
  // Notification Settings
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  dailyReports?: boolean;
  securityAlerts?: boolean;
  
  // Security Settings
  sessionTimeoutMins?: number;
  passwordExpiryDays?: number;
  twoFactorAuth?: boolean;
  dataEncryption?: boolean;
  auditLogs?: boolean;
  
  // System Settings
  syncIntervalMins?: number;
  logLevel?: LogLevel;
  autoSync?: boolean;
  offlineMode?: boolean;
  debugMode?: boolean;
  
  updatedBy: string;
  updatedAt: Date;
}

// Additional interfaces for API requests and responses
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: User;
  message?: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
  studentId?: string;
  employeeId?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  employeeId?: string;
  isActive?: boolean;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AttendanceFilters {
  classId?: string;
  userId?: string;
  location?: string;
  status?: AttendanceStatus;
}

export interface BLEBeacon {
  deviceId: string;
  macAddress: string;
  rssi: number;
  timestamp: Date;
  location: string;
}

export interface DeviceStatus {
  isOnline: boolean;
  batteryLevel?: number;
  lastSeen: Date;
  signalStrength?: number;
}

// Report related interfaces
export interface ReportRequest {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: Date;
  endDate?: Date;
  classId?: string;
  userId?: string;
}

export interface AttendanceAnalytics {
  totalStudents: number;
  averageAttendance: number;
  totalClasses: number;
  punctualityRate: number;
}

export interface AttendanceTrend {
  date: Date;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface AttendanceDistribution {
  present: number;
  late: number;
  absent: number;
}