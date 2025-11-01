const XLSX = require('xlsx');
import { StudentWithClasses } from './studentService';

export interface ExportOptions {
  format: 'csv' | 'excel';
  includeClasses?: boolean;
  filename?: string;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export class ExportService {
  async exportStudents(students: StudentWithClasses[], options: ExportOptions): Promise<ExportResult> {
    const data = this.prepareStudentData(students, options.includeClasses || false);
    
    if (options.format === 'csv') {
      return this.exportToCSV(data, options.filename);
    } else {
      return this.exportToExcel(data, options.filename);
    }
  }

  private prepareStudentData(students: StudentWithClasses[], includeClasses: boolean): any[] {
    return students.map(student => {
      const baseData = {
        'Student ID': student.studentId || '',
        'First Name': student.firstName,
        'Last Name': student.lastName,
        'Email': student.email,
        'Status': student.isActive ? 'Active' : 'Inactive',
        'Created Date': student.createdAt.toISOString().split('T')[0],
        'Last Updated': student.updatedAt.toISOString().split('T')[0]
      };

      if (includeClasses) {
        return {
          ...baseData,
          'Enrolled Classes': student.classes.map(cls => `${cls.code} - ${cls.name}`).join('; ') || 'None',
          'Number of Classes': student.classes.length
        };
      }

      return baseData;
    });
  }

  private exportToCSV(data: any[], filename?: string): ExportResult {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    return {
      buffer: Buffer.from(csv, 'utf8'),
      filename: filename || `students_export_${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv'
    };
  }

  private exportToExcel(data: any[], filename?: string): ExportResult {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // Student ID
      { wch: 20 }, // First Name
      { wch: 20 }, // Last Name
      { wch: 30 }, // Email
      { wch: 10 }, // Status
      { wch: 15 }, // Created Date
      { wch: 15 }, // Last Updated
      { wch: 50 }, // Enrolled Classes (if included)
      { wch: 15 }  // Number of Classes (if included)
    ];
    
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return {
      buffer: Buffer.from(buffer),
      filename: filename || `students_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  async exportStudentsWithFilters(
    students: StudentWithClasses[], 
    filters: { search?: string; classId?: string; isActive?: boolean },
    options: ExportOptions
  ): Promise<ExportResult> {
    // Apply additional filtering if needed (already filtered in service)
    let filteredStudents = students;

    // Add filter information to filename if filters are applied
    let filenamePrefix = 'students';
    if (filters.search) {
      filenamePrefix += `_search_${filters.search.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    if (filters.classId) {
      filenamePrefix += `_class_${filters.classId}`;
    }
    if (filters.isActive !== undefined) {
      filenamePrefix += `_${filters.isActive ? 'active' : 'inactive'}`;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const extension = options.format === 'csv' ? 'csv' : 'xlsx';
    const filename = options.filename || `${filenamePrefix}_${timestamp}.${extension}`;

    return this.exportStudents(filteredStudents, { ...options, filename });
  }
}

export const exportService = new ExportService();