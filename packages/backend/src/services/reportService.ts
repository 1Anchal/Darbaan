import { PrismaClient } from '@prisma/client';
import { getQueryApi } from '../config/influxdb';
import {
    AttendanceAnalytics,
    AttendanceDistribution,
    AttendanceStatus,
    AttendanceTrend,
    ReportRequest
} from '../types';

const prisma = new PrismaClient();

export class ReportService {
  /**
   * Generate comprehensive analytics for a given period
   */
  async generateAnalytics(request: ReportRequest): Promise<AttendanceAnalytics> {
    try {
      const { startDate, endDate, classId } = this.getDateRange(request);
      
      // Build where clause for filtering
      const whereClause: any = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (classId) {
        whereClause.classId = classId;
      }

      // Get all attendance records for the period
      const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: whereClause,
        include: {
          user: true,
          class: true
        }
      });

      // Get unique students count
      const uniqueStudents = new Set(attendanceRecords.map(record => record.userId));
      const totalStudents = uniqueStudents.size;

      // Get unique classes count
      const uniqueClasses = new Set(
        attendanceRecords
          .filter(record => record.classId)
          .map(record => record.classId)
      );
      const totalClasses = uniqueClasses.size;

      // Calculate attendance metrics
      const presentRecords = attendanceRecords.filter(
        record => record.attendanceStatus === AttendanceStatus.PRESENT
      );
      const lateRecords = attendanceRecords.filter(
        record => record.attendanceStatus === AttendanceStatus.LATE
      );
      const totalAttended = presentRecords.length + lateRecords.length;

      // Calculate average attendance rate
      const averageAttendance = totalStudents > 0 
        ? (totalAttended / attendanceRecords.length) * 100 
        : 0;

      // Calculate punctuality rate (present vs late among attended)
      const punctualityRate = totalAttended > 0 
        ? (presentRecords.length / totalAttended) * 100 
        : 0;

      return {
        totalStudents,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        totalClasses,
        punctualityRate: Math.round(punctualityRate * 100) / 100
      };

    } catch (error) {
      console.error('Error generating analytics:', error);
      throw new Error('Failed to generate analytics');
    }
  }

  /**
   * Generate attendance trends over time
   */
  async generateAttendanceTrends(request: ReportRequest): Promise<AttendanceTrend[]> {
    try {
      const { startDate, endDate, classId } = this.getDateRange(request);
      
      // Build where clause
      const whereClause: any = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (classId) {
        whereClause.classId = classId;
      }

      // Get attendance records grouped by date
      const records = await prisma.attendanceRecord.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Group records by date
      const dailyData = new Map<string, {
        date: Date;
        present: number;
        late: number;
        absent: number;
        total: number;
      }>();

      records.forEach(record => {
        const dateKey = record.createdAt.toISOString().split('T')[0];
        
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, {
            date: new Date(dateKey),
            present: 0,
            late: 0,
            absent: 0,
            total: 0
          });
        }

        const dayData = dailyData.get(dateKey)!;
        dayData.total++;

        switch (record.attendanceStatus) {
          case AttendanceStatus.PRESENT:
            dayData.present++;
            break;
          case AttendanceStatus.LATE:
            dayData.late++;
            break;
          case AttendanceStatus.ABSENT:
            dayData.absent++;
            break;
        }
      });

      // Convert to AttendanceTrend array
      return Array.from(dailyData.values()).map(dayData => ({
        date: dayData.date,
        presentCount: dayData.present,
        lateCount: dayData.late,
        absentCount: dayData.absent,
        attendanceRate: dayData.total > 0 
          ? Math.round(((dayData.present + dayData.late) / dayData.total) * 100 * 100) / 100
          : 0
      }));

    } catch (error) {
      console.error('Error generating attendance trends:', error);
      throw new Error('Failed to generate attendance trends');
    }
  }

  /**
   * Generate attendance distribution (pie chart data)
   */
  async generateAttendanceDistribution(request: ReportRequest): Promise<AttendanceDistribution> {
    try {
      const { startDate, endDate, classId } = this.getDateRange(request);
      
      // Build where clause
      const whereClause: any = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (classId) {
        whereClause.classId = classId;
      }

      // Get attendance records
      const records = await prisma.attendanceRecord.findMany({
        where: whereClause
      });

      // Count by status
      const distribution = records.reduce((acc, record) => {
        switch (record.attendanceStatus) {
          case AttendanceStatus.PRESENT:
            acc.present++;
            break;
          case AttendanceStatus.LATE:
            acc.late++;
            break;
          case AttendanceStatus.ABSENT:
            acc.absent++;
            break;
        }
        return acc;
      }, { present: 0, late: 0, absent: 0 });

      return distribution;

    } catch (error) {
      console.error('Error generating attendance distribution:', error);
      throw new Error('Failed to generate attendance distribution');
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(date: Date, classId?: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const request: ReportRequest = {
      type: 'daily',
      startDate,
      endDate,
      classId
    };

    const [analytics, trends, distribution] = await Promise.all([
      this.generateAnalytics(request),
      this.generateAttendanceTrends(request),
      this.generateAttendanceDistribution(request)
    ]);

    return {
      type: 'daily',
      date,
      classId,
      analytics,
      trends,
      distribution,
      generatedAt: new Date()
    };
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(weekStartDate: Date, classId?: string) {
    const startDate = new Date(weekStartDate);
    const endDate = new Date(weekStartDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const request: ReportRequest = {
      type: 'weekly',
      startDate,
      endDate,
      classId
    };

    const [analytics, trends, distribution] = await Promise.all([
      this.generateAnalytics(request),
      this.generateAttendanceTrends(request),
      this.generateAttendanceDistribution(request)
    ]);

    return {
      type: 'weekly',
      weekStartDate,
      weekEndDate: endDate,
      classId,
      analytics,
      trends,
      distribution,
      generatedAt: new Date()
    };
  }

  /**
   * Generate monthly report
   */
  async generateMonthlyReport(year: number, month: number, classId?: string) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const request: ReportRequest = {
      type: 'monthly',
      startDate,
      endDate,
      classId
    };

    const [analytics, trends, distribution] = await Promise.all([
      this.generateAnalytics(request),
      this.generateAttendanceTrends(request),
      this.generateAttendanceDistribution(request)
    ]);

    return {
      type: 'monthly',
      year,
      month,
      classId,
      analytics,
      trends,
      distribution,
      generatedAt: new Date()
    };
  }

  /**
   * Generate custom range report
   */
  async generateCustomReport(startDate: Date, endDate: Date, classId?: string) {
    const request: ReportRequest = {
      type: 'custom',
      startDate,
      endDate,
      classId
    };

    const [analytics, trends, distribution] = await Promise.all([
      this.generateAnalytics(request),
      this.generateAttendanceTrends(request),
      this.generateAttendanceDistribution(request)
    ]);

    return {
      type: 'custom',
      startDate,
      endDate,
      classId,
      analytics,
      trends,
      distribution,
      generatedAt: new Date()
    };
  }

  /**
   * Get attendance data from InfluxDB for advanced analytics
   */
  async getInfluxAttendanceData(
    startDate: Date, 
    endDate: Date, 
    location?: string
  ): Promise<any[]> {
    try {
      const queryApi = getQueryApi();
      
      let locationFilter = '';
      if (location) {
        locationFilter = `|> filter(fn: (r) => r.location == "${location}")`;
      }

      const query = `
        from(bucket: "darbaan")
          |> range(start: ${startDate.toISOString()}, stop: ${endDate.toISOString()})
          |> filter(fn: (r) => r._measurement == "attendance_events")
          ${locationFilter}
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `;

      const result: any[] = [];
      
      return new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            result.push(o);
          },
          error(error) {
            console.error('InfluxDB query error:', error);
            reject(error);
          },
          complete() {
            resolve(result);
          },
        });
      });

    } catch (error) {
      console.error('Error querying InfluxDB:', error);
      throw new Error('Failed to query attendance data from InfluxDB');
    }
  }

  /**
   * Helper method to get date range based on report type
   */
  private getDateRange(request: ReportRequest): {
    startDate: Date;
    endDate: Date;
    classId?: string;
  } {
    let startDate: Date;
    let endDate: Date;

    switch (request.type) {
      case 'daily':
        startDate = request.startDate || new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'weekly':
        startDate = request.startDate || this.getWeekStart(new Date());
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'monthly':
        const now = new Date();
        startDate = request.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = request.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;

      case 'custom':
        if (!request.startDate || !request.endDate) {
          throw new Error('Start date and end date are required for custom reports');
        }
        startDate = new Date(request.startDate);
        endDate = new Date(request.endDate);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        throw new Error('Invalid report type');
    }

    return {
      startDate,
      endDate,
      classId: request.classId
    };
  }

  /**
   * Get the start of the week (Monday) for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }
}

export const reportService = new ReportService();