import {
    Assessment,
    Class,
    Group,
    Logout,
    People,
    Person,
    Refresh,
    Settings
} from '@mui/icons-material';
import {
    AppBar,
    Box,
    Button,
    Container,
    Grid,
    IconButton,
    Paper,
    Toolbar,
    Typography
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import AttendanceChart from './AttendanceChart';
import AttendanceMetrics from './AttendanceMetrics';
import NotificationCenter from './NotificationCenter';
import RealTimeStatus from './RealTimeStatus';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = () => {
    logout();
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.FACULTY:
        return 'Faculty';
      case UserRole.STUDENT:
        return 'Student';
      default:
        return role;
    }
  };

  // Mock data for attendance chart - in real implementation, this would come from API
  const attendanceData = {
    present: 85,
    late: 12,
    absent: 8
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Darbaan - Smart Attendance System
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationCenter key={refreshKey} />
            <IconButton
              color="inherit"
              onClick={handleRefresh}
              title="Refresh Dashboard"
            >
              <Refresh />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person />
              <Typography variant="body2">
                {user?.firstName} {user?.lastName}
              </Typography>
            </Box>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              title="Logout"
            >
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Welcome Section */}
          <Grid item xs={12}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" gutterBottom>
                Welcome to Darbaan!
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Hello, {user?.firstName} {user?.lastName} - {user?.role && getRoleDisplayName(user.role)}
              </Typography>
            </Box>
          </Grid>

          {/* Navigation Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Navigation
              </Typography>
              <Grid container spacing={2}>
                {(user?.role === UserRole.ADMIN || user?.role === UserRole.FACULTY) && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<People />}
                        onClick={() => navigate('/students')}
                        sx={{ py: 2 }}
                      >
                        Students
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Class />}
                        onClick={() => navigate('/classes')}
                        sx={{ py: 2 }}
                      >
                        Classes
                      </Button>
                    </Grid>
                  </>
                )}
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => navigate('/reports')}
                    sx={{ py: 2 }}
                  >
                    Reports
                  </Button>
                </Grid>
                {(user?.role === UserRole.ADMIN || user?.role === UserRole.FACULTY) && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Group />}
                      onClick={() => navigate('/crowd-management')}
                      sx={{ py: 2 }}
                    >
                      Crowd Management
                    </Button>
                  </Grid>
                )}
                {user?.role === UserRole.ADMIN && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Assessment />}
                      onClick={() => navigate('/system-monitoring')}
                      sx={{ py: 2 }}
                    >
                      System Monitoring
                    </Button>
                  </Grid>
                )}
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Person />}
                    onClick={() => navigate('/mobile-devices')}
                    sx={{ py: 2 }}
                  >
                    Mobile Devices
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Settings />}
                    onClick={() => navigate('/settings')}
                    sx={{ py: 2 }}
                  >
                    Settings
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Attendance Metrics - Admin and Faculty only */}
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.FACULTY) && (
            <Grid item xs={12}>
              <AttendanceMetrics key={refreshKey} />
            </Grid>
          )}

          {/* Real-time Status and Attendance Chart */}
          <Grid item xs={12} md={6}>
            <RealTimeStatus key={refreshKey} />
          </Grid>

          <Grid item xs={12} md={6}>
            <AttendanceChart data={attendanceData} />
          </Grid>

          {/* Student-specific view */}
          {user?.role === UserRole.STUDENT && (
            <>
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  p: 3, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="h6" gutterBottom>
                    Your Attendance Status
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your current attendance status and session information will be displayed here.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  p: 3, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="h6" gutterBottom>
                    Your Classes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Information about your enrolled classes and schedules will be shown here.
                  </Typography>
                </Box>
              </Grid>
            </>
          )}

          {/* Quick Actions for Admin and Faculty */}
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.FACULTY) && (
            <Grid item xs={12}>
              <Box sx={{ 
                p: 3, 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 1,
                textAlign: 'center'
              }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Role-specific management actions will be available here. Navigate to Students or Classes sections for full management capabilities.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;