import { Add as AddIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Paper,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { classService } from '../../services/classService';
import { Class, ClassFilters } from '../../types';
import ClassFilter from './ClassFilter';
import ClassForm from './ClassForm';
import ClassList from './ClassList';

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [filters, setFilters] = useState<ClassFilters>({});

  useEffect(() => {
    loadClasses();
  }, [filters]);

  const loadClasses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await classService.getAllClasses(filters);
      if (response.success && response.data) {
        setClasses(response.data);
      } else {
        setError(response.error || 'Failed to load classes');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = () => {
    setEditingClass(null);
    setIsFormOpen(true);
  };

  const handleEditClass = (cls: Class) => {
    setEditingClass(cls);
    setIsFormOpen(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await classService.deleteClass(classId);
      if (response.success) {
        setSuccess('Class deleted successfully');
        loadClasses();
      } else {
        setError(response.error || 'Failed to delete class');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const handleFormSubmit = async (classData: any) => {
    try {
      let response;
      if (editingClass) {
        response = await classService.updateClass(editingClass.id, classData);
      } else {
        response = await classService.createClass(classData);
      }

      if (response.success) {
        setSuccess(response.message || `Class ${editingClass ? 'updated' : 'created'} successfully`);
        setIsFormOpen(false);
        setEditingClass(null);
        loadClasses();
      } else {
        setError(response.error || `Failed to ${editingClass ? 'update' : 'create'} class`);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingClass(null);
  };

  const handleFilterChange = (newFilters: ClassFilters) => {
    setFilters(newFilters);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Class Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClass}
            sx={{ minWidth: 140 }}
          >
            Add Class
          </Button>
        </Box>

        {/* Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearMessages}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={clearMessages}>
            {success}
          </Alert>
        )}

        {/* Filter Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <ClassFilter onFilterChange={handleFilterChange} />
        </Paper>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ClassList
            classes={classes}
            onEdit={handleEditClass}
            onDelete={handleDeleteClass}
          />
        )}

        {/* Form Modal */}
        <ClassForm
          open={isFormOpen}
          classData={editingClass}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </Box>
    </Container>
  );
};

export default ClassManagement;