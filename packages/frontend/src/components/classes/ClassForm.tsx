import {
    Add as AddIcon,
    Close as CloseIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { classService } from '../../services/classService';
import { Class, ClassSchedule, CreateClassRequest, Instructor, UpdateClassRequest } from '../../types';

interface ClassFormProps {
  open: boolean;
  classData?: Class | null;
  onSubmit: (data: CreateClassRequest | UpdateClassRequest) => void;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const ClassForm: React.FC<ClassFormProps> = ({ open, classData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    instructorId: '',
    maxCapacity: 30,
    location: '',
    isActive: true
  });
  const [schedule, setSchedule] = useState<ClassSchedule[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(classData);

  useEffect(() => {
    if (open) {
      loadInstructors();
      if (classData) {
        setFormData({
          name: classData.name,
          code: classData.code,
          description: classData.description || '',
          instructorId: classData.instructor,
          maxCapacity: classData.maxCapacity,
          location: classData.location,
          isActive: classData.isActive
        });
        setSchedule(classData.schedule || []);
      } else {
        resetForm();
      }
    }
  }, [open, classData]);

  const loadInstructors = async () => {
    try {
      const response = await classService.getAvailableInstructors();
      if (response.success && response.data) {
        setInstructors(response.data);
      }
    } catch (err) {
      setError('Failed to load instructors');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      instructorId: '',
      maxCapacity: 30,
      location: '',
      isActive: true
    });
    setSchedule([]);
    setError(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addScheduleSlot = () => {
    setSchedule(prev => [
      ...prev,
      {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00'
      }
    ]);
  };

  const updateScheduleSlot = (index: number, field: keyof ClassSchedule, value: any) => {
    setSchedule(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  const removeScheduleSlot = (index: number) => {
    setSchedule(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Class name is required';
    if (!formData.code.trim()) return 'Class code is required';
    if (!formData.instructorId) return 'Instructor is required';
    if (!formData.location.trim()) return 'Location is required';
    if (formData.maxCapacity < 1) return 'Max capacity must be at least 1';
    if (schedule.length === 0) return 'At least one schedule slot is required';
    
    // Validate schedule times
    for (const slot of schedule) {
      if (slot.startTime >= slot.endTime) {
        return 'Start time must be before end time for all schedule slots';
      }
    }
    
    return null;
  };

  const handleSubmit = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const submitData = {
      ...formData,
      schedule
    };

    onSubmit(submitData);
  };

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(day => day.value === dayOfWeek)?.label || 'Unknown';
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {isEditing ? 'Edit Class' : 'Create New Class'}
          </Typography>
          <IconButton onClick={onCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Basic Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Class Code"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              required
              disabled={isEditing} // Don't allow editing code
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Instructor</InputLabel>
              <Select
                value={formData.instructorId}
                onChange={(e) => handleInputChange('instructorId', e.target.value)}
                label="Instructor"
              >
                {instructors.map((instructor) => (
                  <MenuItem key={instructor.id} value={instructor.id}>
                    {instructor.firstName} {instructor.lastName} ({instructor.employeeId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Max Capacity"
              type="number"
              value={formData.maxCapacity}
              onChange={(e) => handleInputChange('maxCapacity', parseInt(e.target.value) || 0)}
              required
              inputProps={{ min: 1, max: 1000 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
              }
              label="Active"
            />
          </Grid>

          {/* Schedule */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Class Schedule
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addScheduleSlot}
                variant="outlined"
                size="small"
              >
                Add Time Slot
              </Button>
            </Box>

            {schedule.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No schedule slots added. Click "Add Time Slot" to create one.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {schedule.map((slot, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel size="small">Day</InputLabel>
                      <Select
                        size="small"
                        value={slot.dayOfWeek}
                        onChange={(e) => updateScheduleSlot(index, 'dayOfWeek', e.target.value)}
                        label="Day"
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <MenuItem key={day.value} value={day.value}>
                            {day.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      size="small"
                      label="Start Time"
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                      size="small"
                      label="End Time"
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />

                    <Chip
                      label={`${getDayLabel(slot.dayOfWeek)} ${slot.startTime}-${slot.endTime}`}
                      variant="outlined"
                      size="small"
                    />

                    <IconButton
                      onClick={() => removeScheduleSlot(index)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {isEditing ? 'Update Class' : 'Create Class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClassForm;