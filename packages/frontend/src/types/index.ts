// Frontend type definitions

// Enums matching backend
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceMetrics {
  totalStudents: number;
  presentToday: number;
  lateArrivals: number;
  attendanceRate: number;
}

export interface ClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
  createdAt: string;
  updatedAt: string;
}

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
  page?: number;
  limit?: number;
}

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId?: string;
}

export interface ClassEnrollment {
  enrollmentId: string;
  enrolledAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId?: string;
    isActive: boolean;
  };
}

export interface CrowdLocationData {
  id: string;
  name: string;
  location: CrowdLocation;
  occupancyCount: number;
  maxCapacity: number;
  occupancyRate: number;
  alertLevel: AlertLevel;
}

export interface ReportFilters {
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: string;
  endDate?: string;
  classId?: string;
  userId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
// Additional frontend interfaces
export interface BLEDevice {
  id: string;
  userId: string;
  macAddress: string;
  deviceName: string;
  deviceType: DeviceType;
  isActive: boolean;
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  classId?: string;
  entryTime: string;
  exitTime?: string;
  location: string;
  isLateArrival: boolean;
  attendanceStatus: AttendanceStatus;
  deviceId: string;
  createdAt: string;
}

export interface CrowdData {
  id: string;
  location: CrowdLocation;
  timestamp: string;
  occupancyCount: number;
  maxCapacity: number;
  occupancyRate: number;
  alertLevel: AlertLevel;
  activeDevices: string[];
}

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
  updatedAt: string;
}

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

export interface AttendanceAnalytics {
  totalStudents: number;
  averageAttendance: number;
  totalClasses: number;
  punctualityRate: number;
}

export interface AttendanceTrend {
  date: string;
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

export interface CampusOverview {
  totalLocations: number;
  totalOccupancy: number;
  totalCapacity: number;
  activeAlerts: number;
}

export interface DashboardMetrics {
  totalStudents: number;
  presentToday: number;
  lateArrivals: number;
  attendanceRate: number;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  userId?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface RealTimeStats {
  activeUsers: number;
  activeSessions: number;
  systemStatus: 'healthy' | 'warning' | 'error';
  lastUpdate: string;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  realTimeStats: RealTimeStats;
  unreadNotificationCount: number;
}