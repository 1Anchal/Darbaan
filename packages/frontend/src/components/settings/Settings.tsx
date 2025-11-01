import {
    Schedule as AttendanceIcon,
    Info as GeneralIcon,
    Notifications as NotificationIcon,
    Security as SecurityIcon,
    Settings as SettingsIcon,
    Computer as SystemIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    CircularProgress,
    Container,
    Paper,
    Snackbar,
    Tab,
    Tabs,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import { SettingsCategory, SystemSettings } from '../../types';
// Temporarily comment out imports to resolve module resolution issues
// import AttendanceSettings from './AttendanceSettings';
// import GeneralSettings from './GeneralSettings';
// import NotificationSettings from './NotificationSettings';
// import SecuritySettings from './SecuritySettings';
// import SystemSettingsComponent from './SystemSettings';

// Placeholder component for now
const PlaceholderSettings: React.FC<{ settings: any; onUpdate: any; user: any }> = () => (
  <Box sx={{ p: 3, textAlign: 'center' }}>
    <Typography variant="h6">Settings Panel</Typography>
    <Typography variant="body2" color="text.secondary">
      Settings configuration will be available here.
    </Typography>
  </Box>
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<Record<SettingsCategory, SystemSettings | null>>({
    [SettingsCategory.GENERAL]: null,
    [SettingsCategory.ATTENDANCE]: null,
    [SettingsCategory.NOTIFICATIONS]: null,
    [SettingsCategory.SECURITY]: null,
    [SettingsCategory.SYSTEM]: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tabs = [
    { 
      label: 'General', 
      icon: <GeneralIcon />, 
      category: SettingsCategory.GENERAL,
      component: PlaceholderSettings
    },
    { 
      label: 'Attendance', 
      icon: <AttendanceIcon />, 
      category: SettingsCategory.ATTENDANCE,
      component: PlaceholderSettings
    },
    { 
      label: 'Notifications', 
      icon: <NotificationIcon />, 
      category: SettingsCategory.NOTIFICATIONS,
      component: PlaceholderSettings
    },
    { 
      label: 'Security', 
      icon: <SecurityIcon />, 
      category: SettingsCategory.SECURITY,
      component: PlaceholderSettings
    },
    { 
      label: 'System', 
      icon: <SystemIcon />, 
      category: SettingsCategory.SYSTEM,
      component: PlaceholderSettings
    }
  ];

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const settingsPromises = Object.values(SettingsCategory).map(async (category) => {
        try {
          const categorySettings = await settingsService.getSettingsByCategory(category);
          return { category, settings: categorySettings };
        } catch (error) {
          console.warn(`Failed to load ${category} settings:`, error);
          return { category, settings: null };
        }
      });

      const results = await Promise.all(settingsPromises);
      
      const newSettings = { ...settings };
      results.forEach(({ category, settings: categorySettings }) => {
        newSettings[category] = categorySettings;
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSettingsUpdate = async (category: SettingsCategory, updatedSettings: SystemSettings) => {
    setSettings(prev => ({
      ...prev,
      [category]: updatedSettings
    }));
    setSuccessMessage(`${tabs.find(tab => tab.category === category)?.label} settings updated successfully`);
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
    setError(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <SettingsIcon color="primary" />
            <Typography variant="h4" component="h1">
              System Settings
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Configure system preferences and behavior
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="settings tabs"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.category}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                {...a11yProps(index)}
                sx={{ minHeight: 64 }}
              />
            ))}
          </Tabs>
        </Box>

        {tabs.map((tab, index) => {
          const Component = tab.component;
          return (
            <TabPanel key={tab.category} value={activeTab} index={index}>
              <Component
                settings={settings[tab.category]}
                onUpdate={(updatedSettings: SystemSettings) => handleSettingsUpdate(tab.category, updatedSettings)}
                user={user}
              />
            </TabPanel>
          );
        })}
      </Paper>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;