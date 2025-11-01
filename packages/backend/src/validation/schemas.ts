import Joi from 'joi';
import { AlertLevel, AttendanceStatus, CrowdLocation, DeviceType, LogLevel, SettingsCategory, UserRole } from '../types';

// User validation schemas
export const userSchema = Joi.object({
  id: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  role: Joi.string().valid(...Object.values(UserRole)).required(),
  studentId: Joi.string().when('role', {
    is: UserRole.STUDENT,
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  employeeId: Joi.string().when('role', {
    is: Joi.valid(UserRole.FACULTY, UserRole.ADMIN),
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  enrolledClasses: Joi.array().items(Joi.string().uuid()).optional(),
  bleDevices: Joi.array().items(Joi.string().uuid()).default([]),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.date().default(Date.now),
  updatedAt: Joi.date().default(Date.now)
});

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  role: Joi.string().valid(...Object.values(UserRole)).required(),
  password: Joi.string().min(8).max(128).required(),
  studentId: Joi.string().when('role', {
    is: UserRole.STUDENT,
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  employeeId: Joi.string().when('role', {
    is: Joi.valid(UserRole.FACULTY, UserRole.ADMIN),
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  })
});

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  studentId: Joi.string().optional(),
  employeeId: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

export const loginCredentialsSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

// Authentication validation schemas
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// BLE Device validation schemas
export const bleDeviceSchema = Joi.object({
  id: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
  deviceName: Joi.string().min(1).max(100).required(),
  deviceType: Joi.string().valid(...Object.values(DeviceType)).required(),
  isActive: Joi.boolean().default(true),
  lastSeen: Joi.date().required(),
  batteryLevel: Joi.number().min(0).max(100).optional(),
  signalStrength: Joi.number().min(-100).max(0).optional()
});

// Class validation schemas
export const classScheduleSchema = Joi.object({
  dayOfWeek: Joi.number().min(0).max(6).required(),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
});

export const classSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(100).required(),
  code: Joi.string().min(1).max(20).required(),
  description: Joi.string().max(500).optional(),
  instructor: Joi.string().uuid().required(),
  schedule: Joi.array().items(classScheduleSchema).required(),
  enrolledStudents: Joi.array().items(Joi.string().uuid()).default([]),
  maxCapacity: Joi.number().min(1).max(1000).required(),
  location: Joi.string().min(1).max(100).required(),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.date().default(Date.now),
  updatedAt: Joi.date().default(Date.now)
});

// Attendance Record validation schemas
export const attendanceRecordSchema = Joi.object({
  id: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  classId: Joi.string().uuid().optional(),
  entryTime: Joi.date().required(),
  exitTime: Joi.date().optional(),
  location: Joi.string().min(1).max(100).required(),
  isLateArrival: Joi.boolean().default(false),
  attendanceStatus: Joi.string().valid(...Object.values(AttendanceStatus)).required(),
  deviceId: Joi.string().uuid().required(),
  createdAt: Joi.date().default(Date.now)
});

// Crowd Data validation schemas
export const crowdDataSchema = Joi.object({
  id: Joi.string().uuid().required(),
  location: Joi.string().valid(...Object.values(CrowdLocation)).required(),
  timestamp: Joi.date().required(),
  occupancyCount: Joi.number().min(0).required(),
  maxCapacity: Joi.number().min(1).required(),
  occupancyRate: Joi.number().min(0).max(100).required(),
  alertLevel: Joi.string().valid(...Object.values(AlertLevel)).required(),
  activeDevices: Joi.array().items(Joi.string().uuid()).default([])
});

// System Settings validation schemas
export const systemSettingsSchema = Joi.object({
  id: Joi.string().uuid().required(),
  category: Joi.string().valid(...Object.values(SettingsCategory)).required(),
  
  // General Settings
  systemName: Joi.string().min(1).max(100).optional(),
  timezone: Joi.string().optional(),
  language: Joi.string().min(2).max(10).optional(),
  dateFormat: Joi.string().optional(),
  enableBackups: Joi.boolean().optional(),
  
  // Attendance Settings
  lateThresholdMins: Joi.number().min(1).max(60).optional(),
  absentThresholdMins: Joi.number().min(1).max(1440).optional(),
  cooldownPeriodSecs: Joi.number().min(1).max(3600).optional(),
  enableManualEntry: Joi.boolean().optional(),
  
  // Notification Settings
  emailNotifications: Joi.boolean().optional(),
  smsNotifications: Joi.boolean().optional(),
  pushNotifications: Joi.boolean().optional(),
  dailyReports: Joi.boolean().optional(),
  securityAlerts: Joi.boolean().optional(),
  
  // Security Settings
  sessionTimeoutMins: Joi.number().min(5).max(1440).optional(),
  passwordExpiryDays: Joi.number().min(1).max(365).optional(),
  twoFactorAuth: Joi.boolean().optional(),
  dataEncryption: Joi.boolean().optional(),
  auditLogs: Joi.boolean().optional(),
  
  // System Settings
  syncIntervalMins: Joi.number().min(1).max(1440).optional(),
  logLevel: Joi.string().valid(...Object.values(LogLevel)).optional(),
  autoSync: Joi.boolean().optional(),
  offlineMode: Joi.boolean().optional(),
  debugMode: Joi.boolean().optional(),
  
  updatedBy: Joi.string().uuid().required(),
  updatedAt: Joi.date().default(Date.now)
});

// BLE Beacon validation schema
export const bleBeaconSchema = Joi.object({
  deviceId: Joi.string().uuid().required(),
  macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
  rssi: Joi.number().min(-100).max(0).required(),
  timestamp: Joi.date().required(),
  location: Joi.string().min(1).max(100).required()
});

// Report Request validation schema
export const reportRequestSchema = Joi.object({
  type: Joi.string().valid('daily', 'weekly', 'monthly', 'custom').required(),
  startDate: Joi.date().when('type', {
    is: 'custom',
    then: Joi.date().required(),
    otherwise: Joi.date().optional()
  }),
  endDate: Joi.date().when('type', {
    is: 'custom',
    then: Joi.date().min(Joi.ref('startDate')).required(),
    otherwise: Joi.date().optional()
  }),
  classId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().optional()
});

// Attendance Filters validation schema
export const attendanceFiltersSchema = Joi.object({
  classId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().optional(),
  location: Joi.string().optional(),
  status: Joi.string().valid(...Object.values(AttendanceStatus)).optional()
});

// Student Management validation schemas
export const studentFiltersSchema = Joi.object({
  classId: Joi.string().uuid().optional(),
  search: Joi.string().min(1).max(100).optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

export const bulkStudentImportSchema = Joi.object({
  students: Joi.array().items(createUserSchema).min(1).max(100).required()
});

export const exportOptionsSchema = Joi.object({
  format: Joi.string().valid('csv', 'excel').required(),
  includeClasses: Joi.boolean().default(false),
  filename: Joi.string().optional()
});

// Class management validation schemas
export const createClassSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  code: Joi.string().min(1).max(20).required(),
  description: Joi.string().max(500).optional(),
  instructorId: Joi.string().uuid().required(),
  maxCapacity: Joi.number().min(1).max(1000).required(),
  location: Joi.string().min(1).max(100).required(),
  schedule: Joi.array().items(classScheduleSchema).min(1).required()
});

export const updateClassSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  instructorId: Joi.string().uuid().optional(),
  maxCapacity: Joi.number().min(1).max(1000).optional(),
  location: Joi.string().min(1).max(100).optional(),
  schedule: Joi.array().items(classScheduleSchema).optional(),
  isActive: Joi.boolean().optional()
});

export const classFiltersSchema = Joi.object({
  instructorId: Joi.string().uuid().optional(),
  location: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().min(1).max(100).optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

export const enrollmentSchema = Joi.object({
  studentIds: Joi.array().items(Joi.string().uuid()).min(1).required()
});

export const bulkEnrollmentSchema = Joi.object({
  classId: Joi.string().uuid().required(),
  studentIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required()
});

// Settings update validation schemas by category
export const generalSettingsUpdateSchema = Joi.object({
  systemName: Joi.string().min(1).max(100).optional(),
  timezone: Joi.string().optional(),
  language: Joi.string().min(2).max(10).optional(),
  dateFormat: Joi.string().optional(),
  enableBackups: Joi.boolean().optional()
});

export const attendanceSettingsUpdateSchema = Joi.object({
  lateThresholdMins: Joi.number().min(1).max(60).optional(),
  absentThresholdMins: Joi.number().min(1).max(1440).optional(),
  cooldownPeriodSecs: Joi.number().min(1).max(3600).optional(),
  enableManualEntry: Joi.boolean().optional()
});

export const notificationSettingsUpdateSchema = Joi.object({
  emailNotifications: Joi.boolean().optional(),
  smsNotifications: Joi.boolean().optional(),
  pushNotifications: Joi.boolean().optional(),
  dailyReports: Joi.boolean().optional(),
  securityAlerts: Joi.boolean().optional()
});

export const securitySettingsUpdateSchema = Joi.object({
  sessionTimeoutMins: Joi.number().min(5).max(1440).optional(),
  passwordExpiryDays: Joi.number().min(1).max(365).optional(),
  twoFactorAuth: Joi.boolean().optional(),
  dataEncryption: Joi.boolean().optional(),
  auditLogs: Joi.boolean().optional()
});

export const systemSettingsUpdateSchema = Joi.object({
  syncIntervalMins: Joi.number().min(1).max(1440).optional(),
  logLevel: Joi.string().valid(...Object.values(LogLevel)).optional(),
  autoSync: Joi.boolean().optional(),
  offlineMode: Joi.boolean().optional(),
  debugMode: Joi.boolean().optional()
});