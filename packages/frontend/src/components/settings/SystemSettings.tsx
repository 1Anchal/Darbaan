import {
    BugReport as DebugIcon,
    CloudOff as OfflineIcon,
    Save as SaveIcon,
    Sync as SyncIcon,
    Computer as SystemIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Grid,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';
import { LogLevel, SystemSettings as SystemSettingsType, User, UserRole } from '../../types';

interface SystemSettingsProps {
  settings: SystemSettingsType | null;
  onUpdate: (settings: SystemSettingsType) => void;
  user: User | null;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ settings, onUpdate, user }) => {
  const [formData, setFormData] = useState({
    syncIntervalMins: 5,
    logLevel: LogLevel.INFO,
    autoSync: true,
    offlineMode: false,
    debugMode: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logLevels = [
    { value: LogLevel.DEBUG, label: 'Debug', description: 'Detailed information for debugging' },
    { value: LogLevel.INFO, label: 'Info', description: 'General information messages' },
    { value: LogLevel.WARNING, label: 'Warning', description: 'Warning messages only' },
    { value: LogLevel.ERROR, label: 'Error', description: 'Error messages only' }
  ];

  useEffect(() => {
    if (settings) {
      setFormData({
        syncIntervalMins: settings.syncIntervalMins || 5,
        logLevel: settings.logLevel || LogLevel.INFO,
        autoSync: settings.autoSync ?? true,
        offlineMode: settings.offlineMode ?? false,
        debugMode: settings.debugMode ?? false
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
      setError('Only administrators can modify system settings');
      return;
    }

    // Validation
    if (formData.syncIntervalMins < 1 || formData.syncIntervalMins > 1440) {
      setError('Sync interval must be between 1 and 1440 minutes (24 hours)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedSettings = await settingsService.updateSystemSettings(formData);
      onUpdate(updatedSettings);
    } catch (error) {
      console.error('Error updating system settings:', error);
      setError('Failed to update system settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  const systemFeatures = [
    {
      key: 'autoSync',
      label: 'Automatic Synchronization',
      description: 'Automatically sync data with external systems',
      icon: <SyncIcon />,
      value: formData.autoSync,
      status: formData.autoSync ? 'Enabled' : 'Disabled',
      color: formData.autoSync ? 'success' : 'default'
    },
    {
      key: 'offlineMode',
      label: 'Offline Mode',
      description: 'Allow system to function without internet connection',
      icon: <OfflineIcon />,
      value: formData.offlineMode,
      status: formData.offlineMode ? 'Enabled' : 'Disabled',
      color: formData.offlineMode ? 'info' : 'default'
    },
    {
      key: 'debugMode',
      label: 'Debug Mode',
      description: 'Enable detailed logging and debugging features',
      icon: <DebugIcon />,
      value: formData.debugMode,
      status: formData.debugMode ? 'Enabled' : 'Disabled',
      color: formData.debugMode ? 'warning' : 'default'
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        System Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure system behavior, logging, and synchronization
      </Typography>

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Only administrators can modify system settings. You can view current settings below.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Synchronization Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SystemIcon color="primary" />
              Synchronization & Logging
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Sync Interval"
              value={formData.syncIntervalMins}
              onChange={(e) => handleInputChange('syncIntervalMins', parseInt(e.target.value) || 0)}
              disabled={!isAdmin}
              InputProps={{
                endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
              }}
              inputProps={{
                min: 1,
                max: 1440
              }}
              helperText="How often to sync data with external systems (1-1440 minutes)"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!isAdmin}>
              <InputLabel>Log Level</InputLabel>
              <Select
                value={formData.logLevel}
                label="Log Level"
                onChange={(e) => handleInputChange('logLevel', e.target.value)}
              >
                {logLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    <Box>
                      <Typography variant="body1">{level.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {level.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* System Features */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              System Features
            </Typography>
          </Grid>

          {systemFeatures.map((feature) => (
            <Grid item xs={12} key={feature.key}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      {feature.icon}
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {feature.label}
                          </Typography>
                          <Chip 
                            label={feature.status} 
                            size="small" 
                            color={feature.color as any}
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </Box>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={feature.value}
                          onChange={(e) => handleInputChange(feature.key, e.target.checked)}
                          disabled={!isAdmin}
                          color="primary"
                        />
                      }
                      label=""
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

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

      <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1, color: 'info.contrastText' }}>
        <Typography variant="subtitle2" gutterBottom>
          System Configuration:
        </Typography>
        <Typography variant="body2">
          • Data synchronization occurs every {formData.syncIntervalMins} minutes
        </Typography>
        <Typography variant="body2">
          • Log level is set to {logLevels.find(l => l.value === formData.logLevel)?.label}
        </Typography>
        <Typography variant="body2">
          • Automatic sync is {formData.autoSync ? 'enabled' : 'disabled'}
        </Typography>
        <Typography variant="body2">
          • Offline mode is {formData.offlineMode ? 'enabled' : 'disabled'}
        </Typography>
        <Typography variant="body2">
          • Debug mode is {formData.debugMode ? 'active' : 'inactive'}
        </Typography>
      </Box>

      {formData.debugMode && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Debug mode is enabled. This may impact system performance and should only be used for troubleshooting.
        </Alert>
      )}
    </Box>
  );
};

export default SystemSettings;