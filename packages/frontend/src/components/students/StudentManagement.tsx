import {
    Add as AddIcon,
    Delete as DeleteIcon,
    CloudDownload as ExportIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { studentService, StudentWithClasses } from '../../services/studentService';
import { Class, CreateUserRequest, UpdateUserRequest } from '../../types';
import StudentFilter, { StudentFilterValues } from './StudentFilter';
import StudentForm from './StudentForm';
import StudentList from './StudentList';

interface StudentManagementProps {
  classes: Class[];
}

const StudentManagement: React.FC<StudentManagementProps> = ({ classes }) => {
  // State management
  const [students, setStudents] = useState<StudentWithClasses[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<StudentFilterValues>({
    search: '',
    classId: '',
    isActive: 'all'
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithClasses | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentWithClasses | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('excel');

  // Notification state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load students
  const loadStudents = async () => {
    setLoading(true);
    try {
      const filterParams = {
        page: page + 1, // API uses 1-based pagination
        limit: rowsPerPage,
        search: filters.search || undefined,
        classId: filters.classId || undefined,
        isActive: filters.isActive === 'all' ? undefined : filters.isActive === 'true'
      };

      const response = await studentService.getAllStudents(filterParams);
      
      if (response.success && response.data) {
        setStudents(response.data.data);
        setTotalCount(response.data.pagination.total);
      } else {
        showSnackbar(response.error || 'Failed to load students', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load students on component mount and when dependencies change
  useEffect(() => {
    loadStudents();
  }, [page, rowsPerPage]);

  // Helper function to show snackbar notifications
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  // Filter handlers
  const handleFiltersChange = (newFilters: StudentFilterValues) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    setPage(0); // Reset to first page when applying filters
    loadStudents();
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      classId: '',
      isActive: 'all'
    });
    setPage(0);
    // Reload will happen automatically due to useEffect dependency
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Student form handlers
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setFormOpen(true);
  };

  const handleEditStudent = (student: StudentWithClasses) => {
    setSelectedStudent(student);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: CreateUserRequest | UpdateUserRequest) => {
    try {
      let response;
      
      if (selectedStudent) {
        // Update existing student
        response = await studentService.updateStudent(selectedStudent.id, data as UpdateUserRequest);
      } else {
        // Create new student
        response = await studentService.createStudent(data as CreateUserRequest);
      }

      if (response.success) {
        showSnackbar(response.message || 'Student saved successfully', 'success');
        setFormOpen(false);
        loadStudents(); // Refresh the list
      } else {
        showSnackbar(response.error || 'Failed to save student', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to save student', 'error');
    }
  };

  // Delete handlers
  const handleDeleteStudent = (student: StudentWithClasses) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    try {
      const response = await studentService.deleteStudent(studentToDelete.id);
      
      if (response.success) {
        showSnackbar(response.message || 'Student deleted successfully', 'success');
        setDeleteDialogOpen(false);
        setStudentToDelete(null);
        loadStudents(); // Refresh the list
      } else {
        showSnackbar(response.error || 'Failed to delete student', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to delete student', 'error');
    }
  };

  // Export handlers
  const handleExport = () => {
    setExportDialogOpen(true);
  };

  const handleConfirmExport = async () => {
    try {
      const filterParams = {
        search: filters.search || undefined,
        classId: filters.classId || undefined,
        isActive: filters.isActive === 'all' ? undefined : filters.isActive === 'true'
      };

      const blob = await studentService.exportStudents(filterParams, {
        format: exportFormat,
        includeClasses: true
      });

      const filename = `students_export_${new Date().toISOString().split('T')[0]}.${exportFormat === 'csv' ? 'csv' : 'xlsx'}`;
      studentService.downloadFile(blob, filename);
      
      showSnackbar('Export completed successfully', 'success');
      setExportDialogOpen(false);
    } catch (error) {
      showSnackbar('Failed to export students', 'error');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h5" component="h1">
                Student Management
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadStudents}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={handleExport}
                  disabled={loading}
                >
                  Export
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddStudent}
                  disabled={loading}
                >
                  Add Student
                </Button>
              </Box>
            </Box>
          }
        />
        <Divider />
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Manage student information, enrollment, and export data. Total students: {totalCount}
          </Typography>
        </CardContent>
      </Card>

      {/* Filters */}
      <StudentFilter
        filters={filters}
        classes={classes}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        loading={loading}
      />

      {/* Student List */}
      <StudentList
        students={students}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onEditStudent={handleEditStudent}
        onDeleteStudent={handleDeleteStudent}
      />

      {/* Student Form Modal */}
      <StudentForm
        open={formOpen}
        student={selectedStudent}
        classes={classes}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete student "{studentToDelete?.firstName} {studentToDelete?.lastName}"? 
            This action cannot be undone and will remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      >
        <DialogTitle>Export Students</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Choose the export format for the student data. The export will include all students matching your current filters.
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
              label="Export Format"
            >
              <MenuItem value="excel">Excel (.xlsx)</MenuItem>
              <MenuItem value="csv">CSV (.csv)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmExport}
            variant="contained"
            startIcon={<ExportIcon />}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentManagement;