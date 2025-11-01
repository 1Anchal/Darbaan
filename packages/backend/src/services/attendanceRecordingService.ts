import { Point } from '@influxdata/influxdb-client';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { getWriteApi } from '../config/influxdb';
import { getRedisClient } from '../config/redis';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { bleDataProcessor, EntryExitEvent } from './bleDataProcessor';

const prisma = new PrismaClient();

export interface AttendanceEvent {
  id: string;
  userId: string;
  deviceId: string;
  classId?: string;
  location: string;
  eventType: 'entry' | 'exit';
  timestamp: Date;
  isLateArrival: boolean;
  confidence: number;
}

export interface AttendanceSession {
  userId: string;
  deviceId: string;
  classId?: string;
  location: string;
  entryTime: Date;
  exitTime?: Date;
  duration?: number; // in minutes
  status: AttendanceStatus;
  isLateArrival: boolean;
}

export interface AttendanceSettings {
  lateThresholdMinutes: number;
  absentThresholdMinutes: number;
  autoMarkAbsentEnabled: boolean;
  minimumPresenceDuration: number; // minutes
  maxSessionGapMinutes: number; // max gap between entry/exit to consider same session
}

export class AttendanceRecordingService extends EventEmitter {
  private activeSessions: Map<string, AttendanceSession> = new Map(); // userId -> session
  private settings: AttendanceSettings;
  private absentMarkingInterval: NodeJS.Timeout | null = null;

  constructor(settings?: Partial<AttendanceSettings>) {
    super();
    
    this.settings = {
      lateThresholdMinutes: 15,
      absentThresholdMinutes: 30,
      autoMarkAbsentEnabled: true,
      minimumPresenceDuration: 5,
      maxSessionGapMinutes: 10,
      ...settings
    };

    this.setupEventListeners();
    this.startAbsentMarkingProcess();
  }

  /**
   * Record an attendance event from BLE data
   */
  async recordAttendanceEvent(entryExitEvent: EntryExitEvent): Promise<AttendanceEvent | null> {
    try {
      const { deviceId, userId, location, eventType, timestamp, confidence } = entryExitEvent;

      // Get class information if available
      const classId = await this.determineClassId(userId, location, timestamp);
      
      // Check if this is a late arrival
      const isLateArrival = await this.isLateArrival(userId, timestamp, classId);

      const attendanceEvent: AttendanceEvent = {
        id: `${userId}_${timestamp.getTime()}`,
        userId,
        deviceId,
        classId,
        location,
        eventType,
        timestamp,
        isLateArrival,
        confidence
      };

      // Process the event based on type
      if (eventType === 'entry') {
        await this.handleEntryEvent(attendanceEvent);
      } else if (eventType === 'exit') {
        await this.handleExitEvent(attendanceEvent);
      }

      // Log to InfluxDB for time-series analysis
      await this.logToInfluxDB(attendanceEvent);

      // Store in Redis for real-time access
      await this.cacheAttendanceEvent(attendanceEvent);

      this.emit('attendanceEventRecorded', attendanceEvent);
      return attendanceEvent;

    } catch (error) {
      this.emit('recordingError', { event: entryExitEvent, error });
      throw error;
    }
  }

  /**
   * Get current attendance status for a user
   */
  async getCurrentAttendanceStatus(userId: string): Promise<AttendanceStatus> {
    const session = this.activeSessions.get(userId);
    
    if (!session) {
      return AttendanceStatus.ABSENT;
    }

    return session.status;
  }

  /**
   * Get active attendance sessions
   */
  getActiveSessions(): AttendanceSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get attendance session for a user
   */
  getUserSession(userId: string): AttendanceSession | null {
    return this.activeSessions.get(userId) || null;
  }

  /**
   * Manually mark attendance (for manual entry)
   */
  async markAttendanceManually(
    userId: string, 
    status: AttendanceStatus, 
    classId?: string, 
    timestamp?: Date,
    notes?: string
  ): Promise<AttendanceRecord> {
    try {
      const attendanceTime = timestamp || new Date();
      
      // Create attendance record in PostgreSQL
      const record = await prisma.attendanceRecord.create({
        data: {
          userId,
          classId,
          deviceId: 'manual_entry',
          entryTime: attendanceTime,
          exitTime: status === AttendanceStatus.ABSENT ? attendanceTime : undefined,
          location: 'manual',
          isLateArrival: status === AttendanceStatus.LATE,
          attendanceStatus: status
        }
      });

      // Log to InfluxDB
      const point = new Point('manual_attendance')
        .tag('userId', userId)
        .tag('status', status)
        .tag('classId', classId || 'unknown')
        .stringField('notes', notes || '')
        .timestamp(attendanceTime);

      const writeApi = getWriteApi();
      writeApi.writePoint(point);
      await writeApi.flush();

      this.emit('manualAttendanceMarked', { record, notes });
      return this.transformAttendanceRecord(record);

    } catch (error) {
      this.emit('manualMarkingError', { userId, status, error });
      throw error;
    }
  }

  /**
   * Calculate attendance statistics for a date range
   */
  async calculateAttendanceStats(
    startDate: Date, 
    endDate: Date, 
    classId?: string
  ): Promise<{
    totalStudents: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    attendanceRate: number;
    punctualityRate: number;
  }> {
    try {
      const whereClause: any = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (classId) {
        whereClause.classId = classId;
      }

      const records = await prisma.attendanceRecord.findMany({
        where: whereClause,
        include: {
          user: true
        }
      });

      const uniqueUsers = new Set(records.map((r: any) => r.userId));
      const totalStudents = uniqueUsers.size;

      const statusCounts = records.reduce((acc: Record<string, number>, record: any) => {
        const status = record.attendanceStatus as string;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const presentCount = statusCounts['PRESENT'] || 0;
      const lateCount = statusCounts['LATE'] || 0;
      const absentCount = statusCounts['ABSENT'] || 0;

      const attendanceRate = totalStudents > 0 ? ((presentCount + lateCount) / totalStudents) * 100 : 0;
      const punctualityRate = (presentCount + lateCount) > 0 ? (presentCount / (presentCount + lateCount)) * 100 : 0;

      return {
        totalStudents,
        presentCount,
        lateCount,
        absentCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        punctualityRate: Math.round(punctualityRate * 100) / 100
      };

    } catch (error) {
      this.emit('statsCalculationError', error);
      throw error;
    }
  }

  /**
   * Update attendance settings
   */
  updateSettings(newSettings: Partial<AttendanceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settingsUpdated', this.settings);
  }

  /**
   * Get current settings
   */
  getSettings(): AttendanceSettings {
    return { ...this.settings };
  }

  private async handleEntryEvent(event: AttendanceEvent): Promise<void> {
    const { userId, deviceId, classId, location, timestamp, isLateArrival } = event;

    // Check if user already has an active session
    const existingSession = this.activeSessions.get(userId);
    
    if (existingSession) {
      // Check if this is a continuation of the same session or a new one
      const timeDiff = (timestamp.getTime() - existingSession.entryTime.getTime()) / (1000 * 60);
      
      if (timeDiff > this.settings.maxSessionGapMinutes) {
        // Close previous session and start new one
        await this.closeSession(existingSession);
      } else {
        // Update existing session
        existingSession.location = location;
        return;
      }
    }

    // Create new session
    const session: AttendanceSession = {
      userId,
      deviceId,
      classId,
      location,
      entryTime: timestamp,
      status: isLateArrival ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      isLateArrival
    };

    this.activeSessions.set(userId, session);

    // Create attendance record in PostgreSQL
    await prisma.attendanceRecord.create({
      data: {
        userId,
        classId,
        deviceId,
        entryTime: timestamp,
        location,
        isLateArrival,
        attendanceStatus: session.status
      }
    });

    this.emit('sessionStarted', session);
  }

  private async handleExitEvent(event: AttendanceEvent): Promise<void> {
    const { userId, timestamp } = event;
    const session = this.activeSessions.get(userId);

    if (!session) {
      // No active session - this might be an exit without entry
      this.emit('exitWithoutEntry', event);
      return;
    }

    // Calculate session duration
    const duration = (timestamp.getTime() - session.entryTime.getTime()) / (1000 * 60);
    
    // Update session
    session.exitTime = timestamp;
    session.duration = duration;

    // Determine final status based on duration
    if (duration < this.settings.minimumPresenceDuration) {
      session.status = AttendanceStatus.PARTIAL;
    }

    // Update attendance record in PostgreSQL
    await prisma.attendanceRecord.updateMany({
      where: {
        userId,
        entryTime: session.entryTime,
        exitTime: null
      },
      data: {
        exitTime: timestamp,
        attendanceStatus: session.status
      }
    });

    await this.closeSession(session);
    this.emit('sessionEnded', session);
  }

  private async closeSession(session: AttendanceSession): Promise<void> {
    this.activeSessions.delete(session.userId);
    
    // Log session completion to InfluxDB
    const point = new Point('attendance_session')
      .tag('userId', session.userId)
      .tag('location', session.location)
      .tag('status', session.status)
      .floatField('duration', session.duration || 0)
      .booleanField('isLateArrival', session.isLateArrival)
      .timestamp(session.exitTime || new Date());

    const writeApi = getWriteApi();
    writeApi.writePoint(point);
    await writeApi.flush();
  }

  private async determineClassId(userId: string, location: string, timestamp: Date): Promise<string | undefined> {
    try {
      // Find classes that the user is enrolled in and are scheduled at this time/location
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrolledClasses: {
            include: {
              class: {
                include: {
                  schedules: true
                }
              }
            }
          }
        }
      });

      if (!user) return undefined;

      const currentDay = timestamp.getDay();
      const currentTime = timestamp.toTimeString().slice(0, 5); // HH:MM format

      // Find matching class based on schedule and location
      for (const enrollment of user.enrolledClasses) {
        const classInfo = enrollment.class;
        
        if (classInfo.location === location) {
          for (const schedule of classInfo.schedules) {
            if (schedule.dayOfWeek === currentDay) {
              // Check if current time is within class time (with some buffer)
              if (this.isTimeInRange(currentTime, schedule.startTime, schedule.endTime)) {
                return classInfo.id;
              }
            }
          }
        }
      }

      return undefined;
    } catch (error) {
      this.emit('classDetectionError', { userId, location, error });
      return undefined;
    }
  }

  private async isLateArrival(userId: string, timestamp: Date, classId?: string): Promise<boolean> {
    if (!classId) return false;

    try {
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        include: { schedules: true }
      });

      if (!classInfo) return false;

      const currentDay = timestamp.getDay();
      const currentTime = timestamp.toTimeString().slice(0, 5);

      const todaySchedule = classInfo.schedules.find((s: any) => s.dayOfWeek === currentDay);
      if (!todaySchedule) return false;

      const scheduledStartTime = todaySchedule.startTime;
      const lateThreshold = this.addMinutesToTime(scheduledStartTime, this.settings.lateThresholdMinutes);

      return currentTime > lateThreshold;
    } catch (error) {
      this.emit('lateCheckError', { userId, classId, error });
      return false;
    }
  }

  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    // Add buffer time for attendance (30 minutes before and after class)
    const bufferMinutes = 30;
    const adjustedStartTime = this.subtractMinutesFromTime(startTime, bufferMinutes);
    const adjustedEndTime = this.addMinutesToTime(endTime, bufferMinutes);

    return currentTime >= adjustedStartTime && currentTime <= adjustedEndTime;
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  private subtractMinutesFromTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins - minutes;
    const newHours = Math.floor(Math.max(0, totalMinutes) / 60) % 24;
    const newMins = Math.max(0, totalMinutes) % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  private async logToInfluxDB(event: AttendanceEvent): Promise<void> {
    try {
      const point = new Point('attendance_events')
        .tag('userId', event.userId)
        .tag('deviceId', event.deviceId)
        .tag('location', event.location)
        .tag('eventType', event.eventType)
        .tag('classId', event.classId || 'unknown')
        .floatField('confidence', event.confidence)
        .booleanField('isLateArrival', event.isLateArrival)
        .timestamp(event.timestamp);

      const writeApi = getWriteApi();
      writeApi.writePoint(point);
      await writeApi.flush();
    } catch (error) {
      this.emit('influxLogError', { event, error });
    }
  }

  private async cacheAttendanceEvent(event: AttendanceEvent): Promise<void> {
    try {
      const key = `attendance:event:${event.userId}:${event.timestamp.getTime()}`;
      const redisClient = getRedisClient();
      await redisClient.setEx(key, 3600, JSON.stringify(event)); // Cache for 1 hour

      // Update user's latest event
      const latestKey = `attendance:latest:${event.userId}`;
      await redisClient.setEx(latestKey, 86400, JSON.stringify(event)); // Cache for 24 hours
    } catch (error) {
      this.emit('cacheError', { event, error });
    }
  }

  private setupEventListeners(): void {
    // Listen to BLE data processor events
    bleDataProcessor.on('entryExitDetected', async (event: EntryExitEvent) => {
      try {
        await this.recordAttendanceEvent(event);
      } catch (error) {
        this.emit('eventProcessingError', { event, error });
      }
    });
  }

  private startAbsentMarkingProcess(): void {
    if (!this.settings.autoMarkAbsentEnabled) return;

    // Run absent marking every 5 minutes
    this.absentMarkingInterval = setInterval(async () => {
      await this.markAbsentStudents();
    }, 5 * 60 * 1000);
  }

  private async markAbsentStudents(): Promise<void> {
    try {
      const now = new Date();
      const thresholdTime = new Date(now.getTime() - this.settings.absentThresholdMinutes * 60 * 1000);

      // Find classes that should have started by now
      const activeClasses = await prisma.class.findMany({
        where: { isActive: true },
        include: {
          schedules: true,
          enrollments: {
            include: { user: true }
          }
        }
      });

      for (const classInfo of activeClasses) {
        const currentDay = now.getDay();
        const currentTime = now.toTimeString().slice(0, 5);

        const todaySchedule = classInfo.schedules.find((s: any) => s.dayOfWeek === currentDay);
        if (!todaySchedule) continue;

        const classStartTime = todaySchedule.startTime;
        const absentThreshold = this.addMinutesToTime(classStartTime, this.settings.absentThresholdMinutes);

        if (currentTime >= absentThreshold) {
          // Mark absent students who haven't attended
          for (const enrollment of classInfo.enrollments) {
            const userId = enrollment.user.id;
            
            // Check if student has attendance record for today
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            
            const existingRecord = await prisma.attendanceRecord.findFirst({
              where: {
                userId,
                classId: classInfo.id,
                createdAt: {
                  gte: todayStart
                }
              }
            });

            if (!existingRecord) {
              // Mark as absent
              await this.markAttendanceManually(
                userId,
                AttendanceStatus.ABSENT,
                classInfo.id,
                now,
                'Auto-marked absent due to non-attendance'
              );
            }
          }
        }
      }
    } catch (error) {
      this.emit('absentMarkingError', error);
    }
  }

  private transformAttendanceRecord(record: any): AttendanceRecord {
    return {
      id: record.id,
      userId: record.userId,
      classId: record.classId,
      deviceId: record.deviceId,
      entryTime: record.entryTime,
      exitTime: record.exitTime,
      location: record.location,
      isLateArrival: record.isLateArrival,
      attendanceStatus: record.attendanceStatus as AttendanceStatus,
      createdAt: record.createdAt
    };
  }
}

export const attendanceRecordingService = new AttendanceRecordingService();