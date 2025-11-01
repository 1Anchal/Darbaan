import { Save as SaveIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControlLabel,
    Grid,
    InputAdornment,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';
import { SystemSettings, User, UserRole } from '../../types';

interface AttendanceSettingsProps {
  settings: SystemSettings | null;
  onUpdate: (settings: SystemSettings) => void;
  user: User | null;
}

const AttendanceSettings: React.FC<AttendanceSettingsProps> = ({ settings, onUpdate, user }) => {
  const [formData, setFormData] = useState({
    lateThresholdMins: 15,
    absentThresholdMins: 60,
    cooldownPeriodSecs: 300,
    enableManualEntry: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        lateThresholdMins: settings.lateThresholdMins || 15,
        absentThresholdMins: settings.absentThresholdMins || 60,
        cooldownPeriodSecs: settings.cooldownPeriodSecs || 300,
        enableManualEntry: settings.enableManualEntry || false
      });
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.FACULTY) {
      setError('Only administrators and faculty can modify attendance settings');
      return;
    }

    // Validation
    if (formData.lateThresholdMins < 1 || formData.lateThresholdMins > 60) {
      setError('Late threshold must be between 1 and 60 minutes');
      return;
    }

    if (formData.absentThresholdMins < 1 || formData.absentThresholdMins > 1440) {
      setError('Absent threshold must be between 1 and 1440 minutes (24 hours)');
      return;
    }

    if (formData.cooldownPeriodSecs < 1 || formData.cooldownPeriodSecs > 3600) {
      setError('Cooldown period must be between 1 and 3600 seconds (1 hour)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedSettings = await settingsService.updateAttendanceSettings(formData);
      onUpdate(updatedSettings);
    } catch (error) {
      console.error('Error updating attendance settings:', error);
      setError('Failed to update attendance settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canModify = user?.role === UserRole.ADMIN || user?.role === UserRole.FACULTY;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Attendance Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure attendance tracking thresholds and behavior
      </Typography>

      {!canModify && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Only administrators and faculty can modify attendance settings. You can view current settings below.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Late Threshold"
              value={formData.lateThresholdMins}
              onChange={(e) => handleInputChange('lateThresholdMins', parseInt(e.target.value) || 0)}
              disabled={!canModify}
              InputProps={{
                endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
              }}
              inputProps={{
                min: 1,
                max: 60
              }}
              helperText="Minutes after class start time to mark as late (1-60)"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Absent Threshold"
              value={formData.absentThresholdMins}
              onChange={(e) => handleInputChange('absentThresholdMins', parseInt(e.target.value) || 0)}
              disabled={!canModify}
              InputProps={{
                endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
              }}
              inputProps={{
                min: 1,
                max: 1440
              }}
              helperText="Minutes after class start time to mark as absent (1-1440)"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Cooldown Period"
              value={formData.cooldownPeriodSecs}
              onChange={(e) => handleInputChange('cooldownPeriodSecs', parseInt(e.target.value) || 0)}
              disabled={!canModify}
              InputProps={{
                endAdornment: <InputAdornment position="end">seconds</InputAdornment>,
              }}
              inputProps={{
                min: 1,
                max: 3600
              }}
              helperText="Minimum time between BLE detections (1-3600)"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enableManualEntry}
                  onChange={(e) => handleInputChange('enableManualEntry', e.target.checked)}
                  disabled={!canModify}
                />
              }
              label="Enable Manual Attendance Entry"
            />
            <Typography variant="caption" display="block" color="text.secondary">
              Allow faculty to manually mark attendance when BLE detection fails
            </Typography>
          </Grid>

          {canModify && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </form>

      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Current Configuration Summary:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Students arriving more than {formData.lateThresholdMins} minutes after class start will be marked as late
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Students not detected within {formData.absentThresholdMins} minutes will be marked as absent
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • BLE detections will be ignored if they occur within {formData.cooldownPeriodSecs} seconds of the previous detection
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Manual attendance entry is {formData.enableManualEntry ? 'enabled' : 'disabled'}
        </Typography>
      </Box>
    </Box>
  );
};

export default AttendanceSettings;