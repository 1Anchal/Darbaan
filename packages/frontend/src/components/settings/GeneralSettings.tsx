import { Save as SaveIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';
import { SystemSettings, User, UserRole } from '../../types';

interface GeneralSettingsProps {
  settings: SystemSettings | null;
  onUpdate: (settings: SystemSettings) => void;
  user: User | null;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate, user }) => {
  const [formData, setFormData] = useState({
    systemName: '',
    timezone: '',
    language: '',
    dateFormat: '',
    enableBackups: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Karachi',
    'Asia/Dubai',
    'Australia/Sydney'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ur', name: 'Urdu' }
  ];

  const dateFormats = [
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'DD-MM-YYYY',
    'YYYY/MM/DD'
  ];

  useEffect(() => {
    if (settings) {
      setFormData({
        systemName: settings.systemName || '',
        timezone: settings.timezone || 'UTC',
        language: settings.language || 'en',
        dateFormat: settings.dateFormat || 'YYYY-MM-DD',
        enableBackups: settings.enableBackups || false
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
    
    if (user?.role !== UserRole.ADMIN) {
      setError('Only administrators can modify general settings');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedSettings = await settingsService.updateGeneralSettings(formData);
      onUpdate(updatedSettings);
    } catch (error) {
      console.error('Error updating general settings:', error);
      setError('Failed to update general settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        General Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure basic system information and preferences
      </Typography>

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Only administrators can modify general settings. You can view current settings below.
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
              label="System Name"
              value={formData.systemName}
              onChange={(e) => handleInputChange('systemName', e.target.value)}
              disabled={!isAdmin}
              helperText="Display name for the attendance system"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!isAdmin}>
              <InputLabel>Timezone</InputLabel>
              <Select
                value={formData.timezone}
                label="Timezone"
                onChange={(e) => handleInputChange('timezone', e.target.value)}
              >
                {timezones.map((tz) => (
                  <MenuItem key={tz} value={tz}>
                    {tz}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!isAdmin}>
              <InputLabel>Language</InputLabel>
              <Select
                value={formData.language}
                label="Language"
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                {languages.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!isAdmin}>
              <InputLabel>Date Format</InputLabel>
              <Select
                value={formData.dateFormat}
                label="Date Format"
                onChange={(e) => handleInputChange('dateFormat', e.target.value)}
              >
                {dateFormats.map((format) => (
                  <MenuItem key={format} value={format}>
                    {format}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enableBackups}
                  onChange={(e) => handleInputChange('enableBackups', e.target.checked)}
                  disabled={!isAdmin}
                />
              }
              label="Enable Automatic Backups"
            />
            <Typography variant="caption" display="block" color="text.secondary">
              Automatically backup system data on a regular schedule
            </Typography>
          </Grid>

          {isAdmin && (
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
    </Box>
  );
};

export default GeneralSettings;