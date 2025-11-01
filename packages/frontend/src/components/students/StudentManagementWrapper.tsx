import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { classService } from '../../services/classService';
import { Class } from '../../types';
import StudentManagement from './StudentManagement';

const StudentManagementWrapper: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await classService.getAllClasses();
        if (response.success && response.data) {
          setClasses(response.data);
        } else {
          setError(response.error || 'Failed to load classes');
        }
      } catch (err) {
        setError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading classes...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography variant="body1" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return <StudentManagement classes={classes} />;
};

export default StudentManagementWrapper;