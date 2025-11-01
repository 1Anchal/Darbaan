import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    LocationOn as LocationIcon,
    MoreVert as MoreVertIcon,
    People as PeopleIcon,
    Schedule as ScheduleIcon
} from '@mui/icons-material';
import {
    Box,
    Chip,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import React, { useState } from 'react';
import { Class } from '../../types';

interface ClassListProps {
  classes: Class[];
  onEdit: (cls: Class) => void;
  onDelete: (classId: string) => void;
}

const ClassList: React.FC<ClassListProps> = ({ classes, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, cls: Class) => {
    setAnchorEl(event.currentTarget);
    setSelectedClass(cls);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClass(null);
  };

  const handleEdit = () => {
    if (selectedClass) {
      onEdit(selectedClass);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedClass) {
      onDelete(selectedClass.id);
    }
    handleMenuClose();
  };

  const formatSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return 'No schedule';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return schedule
      .map(s => `${dayNames[s.dayOfWeek]} ${s.startTime}-${s.endTime}`)
      .join(', ');
  };

  const getEnrollmentStatus = (enrolledCount: number, maxCapacity: number) => {
    const percentage = (enrolledCount / maxCapacity) * 100;
    if (percentage >= 90) return { color: 'error', text: 'Full' };
    if (percentage >= 70) return { color: 'warning', text: 'High' };
    return { color: 'success', text: 'Available' };
  };

  if (classes.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No classes found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Create your first class to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Class Details</TableCell>
              <TableCell>Instructor</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Enrollment</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((cls) => {
              const enrollmentStatus = getEnrollmentStatus(
                cls.enrolledStudents.length,
                cls.maxCapacity
              );

              return (
                <TableRow key={cls.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {cls.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {cls.code}
                      </Typography>
                      {cls.description && (
                        <Typography variant="caption" color="text.secondary">
                          {cls.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {cls.instructor}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={formatSchedule(cls.schedule)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {formatSchedule(cls.schedule)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {cls.location}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {cls.enrolledStudents.length}/{cls.maxCapacity}
                      </Typography>
                      <Chip
                        label={enrollmentStatus.text}
                        color={enrollmentStatus.color as any}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cls.isActive ? 'Active' : 'Inactive'}
                      color={cls.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, cls)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Class</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Class</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ClassList;