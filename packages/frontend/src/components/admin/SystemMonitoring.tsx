import {
    Assessment,
    CheckCircle,
    Error,
    Refresh,
    Warning
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    LinearProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import {
    RealTimeSystemStatus,
    SystemHealthSummary,
    SystemIntegrationStats,
    WorkflowTestResult,
    systemIntegrationService
} from '../../services/systemIntegrationService';

interface SystemMonitoringProps {
  refreshInterval?: number;
}

const SystemMonitoring: React.FC<SystemMonitoringProps> = ({ refreshInterval = 30000 }) => {
  const [systemHealth, setSystemHealth] = useState<SystemHealthSummary | null>(null);
  const [integrationStats, setIntegrationStats] = useState<SystemIntegrationStats | null>(null);
  const [, setRealtimeStatus] = useState<RealTimeSystemStatus | null>(null);
  const [workflowTests, setWorkflowTests] = useState<WorkflowTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [testingWorkflow, setTestingWorkflow] = useState<string | null>(null);
  
  const theme = useTheme();
  const { socket, isConnected } = useSocket();

  const fetchSystemData = async () => {
    try {
      setError(null);
      const [health, stats, realtime] = await Promise.all([
        systemIntegrationService.getSystemHealth(),
        systemIntegrationService.getIntegrationStats(),
        systemIntegrationService.getRealTimeSystemStatus()
      ]);

      setSystemHealth(health);
      setIntegrationStats(stats);
      setRealtimeStatus(realtime);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch system data');
    } finally {
      setLoading(false);
    }
  };

  const handleForceHealthCheck = async () => {
    try {
      setLoading(true);
      await systemIntegrationService.forceHealthCheck();
      await fetchSystemData();
    } catch (err: any) {
      setError(err?.message || 'Failed to perform health check');
    } finally {
      setLoading(false);
    }
  };

  const handleTestWorkflow = async (role: 'student' | 'faculty' | 'admin') => {
    try {
      setTestingWorkflow(role);
      const testResult = await systemIntegrationService.testUserWorkflow(role);
      setWorkflowTests(prev => [testResult, ...prev.slice(0, 4)]); // Keep last 5 tests
    } catch (err: any) {
      setError(err?.message || `Failed to test ${role} workflow`);
    } finally {
      setTestingWorkflow(null);
    }
  };

  useEffect(() => {
    fetchSystemData();

    // Set up auto-refresh
    const interval = setInterval(fetchSystemData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    if (socket && isConnected) {
      // Listen for real-time system updates
      socket.on('system:health-update', (healthUpdate) => {
        setSystemHealth(prev => prev ? { ...prev, services: healthUpdate } : null);
        setLastUpdated(new Date());
      });

      socket.on('system:stats-update', (statsUpdate) => {
        setIntegrationStats(statsUpdate);
        setLastUpdated(new Date());
      });

      return () => {
        socket.off('system:health-update');
        socket.off('system:stats-update');
      };
    }
  }, [socket, isConnected]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case 'degraded':
        return <Warning sx={{ color: theme.palette.warning.main }} />;
      case 'unhealthy':
        return <Error sx={{ color: theme.palette.error.main }} />;
      default:
        return <Error sx={{ color: theme.palette.grey[500] }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return theme.palette.success.main;
      case 'degraded':
        return theme.palette.warning.main;
      case 'unhealthy':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading && !systemHealth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const uptimePercentage = systemHealth 
    ? systemIntegrationService.calculateUptimePercentage(systemHealth.services)
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          System Monitoring
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <IconButton onClick={fetchSystemData} disabled={loading}>
            <Refresh />
          </IconButton>
          <Button
            variant="outlined"
            onClick={handleForceHealthCheck}
            disabled={loading}
            startIcon={<Assessment />}
          >
            Force Health Check
          </Button>
        </Box>
      </Box>

      {error && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* System Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Overview
              </Typography>
              {systemHealth && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getStatusIcon(systemHealth.overallStatus)}
                    <Typography variant="h5" sx={{ ml: 1, fontWeight: 'bold' }}>
                      {systemHealth.overallStatus.toUpperCase()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      System Uptime: {uptimePercentage}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uptimePercentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.palette.grey[200],
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getStatusColor(systemHealth.overallStatus)
                        }
                      }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    {systemHealth.healthyServices} of {systemHealth.totalServices} services healthy
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Integration Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Integration Statistics
              </Typography>
              {integrationStats && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="h4" color="primary">
                      {integrationStats.totalConnectedUsers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Connected Users
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h4" color="success.main">
                      {integrationStats.activeAttendanceSessions}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Active Sessions
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h4" color="info.main">
                      {integrationStats.realTimeUpdatesPerMinute}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Updates/Min
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h4" color="warning.main">
                      {integrationStats.crowdMonitoringLocations}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Monitored Locations
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Service Health Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Service Health Details
              </Typography>
              {systemHealth && (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Service</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Check</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {systemHealth.services.map((service) => (
                        <TableRow key={service.service}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getStatusIcon(service.status)}
                              <Typography sx={{ ml: 1 }}>
                                {service.service}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={service.status}
                              color={
                                service.status === 'healthy' ? 'success' :
                                service.status === 'degraded' ? 'warning' : 'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {systemIntegrationService.formatTimestamp(service.lastCheck)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {service.error ? (
                              <Typography variant="body2" color="error">
                                {service.error}
                              </Typography>
                            ) : service.details ? (
                              <Typography variant="body2" color="text.secondary">
                                {JSON.stringify(service.details)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No details available
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Workflow Testing */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Workflow Testing
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Test complete user workflows for different roles:
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {['student', 'faculty', 'admin'].map((role) => (
                    <Button
                      key={role}
                      variant="outlined"
                      onClick={() => handleTestWorkflow(role as any)}
                      disabled={testingWorkflow === role}
                      startIcon={testingWorkflow === role ? <CircularProgress size={16} /> : undefined}
                    >
                      Test {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Button>
                  ))}
                </Box>
              </Box>

              {workflowTests.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recent Test Results:
                  </Typography>
                  {workflowTests.map((test, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">
                          {test.userRole.charAt(0).toUpperCase() + test.userRole.slice(1)} Workflow
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={test.overallStatus}
                            color={test.overallStatus === 'passed' ? 'success' : 'error'}
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {systemIntegrationService.formatTimestamp(test.timestamp)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {test.tests.map((testCase, testIndex) => (
                          <Chip
                            key={testIndex}
                            label={testCase.name}
                            color={
                              testCase.status === 'passed' ? 'success' :
                              testCase.status === 'degraded' ? 'warning' : 'error'
                            }
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemMonitoring;