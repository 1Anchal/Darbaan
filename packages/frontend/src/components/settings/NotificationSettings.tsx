import {
    Email as EmailIcon,
    Notifications as PushIcon,
    Assessment as ReportIcon,
    Save as SaveIcon,
    Security as SecurityIcon,
    Sms as SmsIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    FormControlLabel,
    Grid,
    Switch,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';
import { SystemSettings, User } from '../../types';

interface NotificationSettingsProps {
  settings: SystemSettings | null;
  onUpdate: (settings: SystemSettings) => void;
  user: User | null;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ settings, onUpdate, user }) => {
  const [formData, setFormData] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    dailyReports: true,
    securityAlerts: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        emailNotifications: settings.emailNotifications ?? true,
        smsNotifications: settings.smsNotifications ?? false,
        pushNotifications: settings.pushNotifications ?? true,
        dailyReports: settings.dailyReports ?? true,
        securityAlerts: settings.securityAlerts ?? true
      });
    }
  }, [settings]);

  const handleInputChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const updatedSettings = await settingsService.updateNotificationSettings(formData);
      onUpdate(updatedSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setError('Failed to update notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const notificationTypes = [
    {
      key: 'emailNotifications',
      label: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: <EmailIcon color="primary" />,
      value: formData.emailNotifications
    },
    {
      key: 'smsNotifications',
      label: 'SMS Notifications',
      description: 'Receive notifications via text message',
      icon: <SmsIcon color="primary" />,
      value: formData.smsNotifications
    },
    {
      key: 'pushNotifications',
      label: 'Push Notifications',
      description: 'Receive browser push notifications',
      icon: <PushIcon color="primary" />,
      value: formData.pushNotifications
    },
    {
      key: 'dailyReports',
      label: 'Daily Reports',
      description: 'Receive daily attendance summary reports',
      icon: <ReportIcon color="primary" />,
      value: formData.dailyReports
    },
    {
      key: 'securityAlerts',
      label: 'Security Alerts',
      description: 'Receive security-related notifications',
      icon: <SecurityIcon color="primary" />,
      value: formData.securityAlerts
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Notification Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure how you want to receive notifications and alerts
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {notificationTypes.map((notification, index) => (
            <Grid item xs={12} key={notification.key}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      {notification.icon}
                      <Box>
                        <Typography variant="subtitle1">
                          {notification.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {notification.description}
                        </Typography>
                      </Box>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notification.value}
                          onChange={(e) => handleInputChange(notification.key, e.target.checked)}
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

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
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
        </Grid>
      </form>

      <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1, color: 'info.contrastText' }}>
        <Typography variant="subtitle2" gutterBottom>
          Notification Preferences Summary:
        </Typography>
        <Typography variant="body2">
          You will receive notifications through: {
            Object.entries(formData)
              .filter(([_, enabled]) => enabled)
              .map(([key, _]) => {
                const notification = notificationTypes.find(n => n.key === key);
                return notification?.label;
              })
              .filter(Boolean)
              .join(', ') || 'None selected'
          }
        </Typography>
      </Box>
    </Box>
  );
};

export default NotificationSettings;