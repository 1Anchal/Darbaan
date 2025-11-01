import {
    History as HistoryIcon,
    VpnKey as KeyIcon,
    Lock as LockIcon,
    Save as SaveIcon,
    Security as SecurityIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
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

interface SecuritySettingsProps {
  settings: SystemSettings | null;
  onUpdate: (settings: SystemSettings) => void;
  user: User | null;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ settings, onUpdate, user }) => {
  const [formData, setFormData] = useState({
    sessionTimeoutMins: 60,
    passwordExpiryDays: 90,
    twoFactorAuth: false,
    dataEncryption: true,
    auditLogs: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        sessionTimeoutMins: settings.sessionTimeoutMins || 60,
        passwordExpiryDays: settings.passwordExpiryDays || 90,
        twoFactorAuth: settings.twoFactorAuth || false,
        dataEncryption: settings.dataEncryption || true,
        auditLogs: settings.auditLogs || true
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
      setError('Only administrators can modify security settings');
      return;
    }

    // Validation
    if (formData.sessionTimeoutMins < 5 || formData.sessionTimeoutMins > 1440) {
      setError('Session timeout must be between 5 and 1440 minutes (24 hours)');
      return;
    }

    if (formData.passwordExpiryDays < 1 || formData.passwordExpiryDays > 365) {
      setError('Password expiry must be between 1 and 365 days');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedSettings = await settingsService.updateSecuritySettings(formData);
      onUpdate(updatedSettings);
    } catch (error) {
      console.error('Error updating security settings:', error);
      setError('Failed to update security settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  const securityFeatures = [
    {
      key: 'twoFactorAuth',
      label: 'Two-Factor Authentication',
      description: 'Require additional verification for login',
      icon: <KeyIcon />,
      value: formData.twoFactorAuth,
      status: formData.twoFactorAuth ? 'Enabled' : 'Disabled',
      color: formData.twoFactorAuth ? 'success' : 'default'
    },
    {
      key: 'dataEncryption',
      label: 'Data Encryption',
      description: 'Encrypt sensitive data at rest and in transit',
      icon: <LockIcon />,
      value: formData.dataEncryption,
      status: formData.dataEncryption ? 'Enabled' : 'Disabled',
      color: formData.dataEncryption ? 'success' : 'warning'
    },
    {
      key: 'auditLogs',
      label: 'Audit Logs',
      description: 'Track user actions and system events',
      icon: <HistoryIcon />,
      value: formData.auditLogs,
      status: formData.auditLogs ? 'Enabled' : 'Disabled',
      color: formData.auditLogs ? 'success' : 'default'
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Security Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure security policies and authentication requirements
      </Typography>

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Only administrators can modify security settings. You can view current settings below.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Session and Password Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              Session & Password Policy
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Session Timeout"
              value={formData.sessionTimeoutMins}
              onChange={(e) => handleInputChange('sessionTimeoutMins', parseInt(e.target.value) || 0)}
              disabled={!isAdmin}
              InputProps={{
                endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
              }}
              inputProps={{
                min: 5,
                max: 1440
              }}
              helperText="Automatic logout after inactivity (5-1440 minutes)"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Password Expiry"
              value={formData.passwordExpiryDays}
              onChange={(e) => handleInputChange('passwordExpiryDays', parseInt(e.target.value) || 0)}
              disabled={!isAdmin}
              InputProps={{
                endAdornment: <InputAdornment position="end">days</InputAdornment>,
              }}
              inputProps={{
                min: 1,
                max: 365
              }}
              helperText="Force password change after this period (1-365 days)"
            />
          </Grid>

          {/* Security Features */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Security Features
            </Typography>
          </Grid>

          {securityFeatures.map((feature) => (
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

      <Box sx={{ mt: 4, p: 2, bgcolor: 'warning.light', borderRadius: 1, color: 'warning.contrastText' }}>
        <Typography variant="subtitle2" gutterBottom>
          Security Status:
        </Typography>
        <Typography variant="body2">
          • Sessions will timeout after {formData.sessionTimeoutMins} minutes of inactivity
        </Typography>
        <Typography variant="body2">
          • Passwords must be changed every {formData.passwordExpiryDays} days
        </Typography>
        <Typography variant="body2">
          • Two-factor authentication is {formData.twoFactorAuth ? 'required' : 'optional'}
        </Typography>
        <Typography variant="body2">
          • Data encryption is {formData.dataEncryption ? 'enabled' : 'disabled'}
        </Typography>
        <Typography variant="body2">
          • Audit logging is {formData.auditLogs ? 'active' : 'inactive'}
        </Typography>
      </Box>
    </Box>
  );
};

export default SecuritySettings;