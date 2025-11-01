import { CheckCircle, Error, People, Session, Warning } from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { RealTimeStats } from '../../types';

interface RealTimeStatusProps {
  refreshInterval?: number; // in milliseconds
}

const RealTimeStatus: React.FC<RealTimeStatusProps> = ({ refreshInterval = 10000 }) => {
  const [stats, setStats] = useState<RealTimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { isConnected, onRealTimeStatsUpdate, subscribeToDashboard, requestRealTimeStats } = useSocket();

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await dashboardService.getRealTimeStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch real-time stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to dashboard updates if connected
    if (isConnected) {
      subscribeToDashboard();
    }

    // Set up auto-refresh for real-time updates
    const interval = setInterval(fetchStats, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, isConnected]);

  useEffect(() => {
    // Set up real-time stats updates
    onRealTimeStatsUpdate((newStats: RealTimeStats) => {
      setStats(newStats);
      setError(null);
    });
  }, [onRealTimeStatsUpdate]);

  const getStatusColor = (status: RealTimeStats['systemStatus']) => {
    switch (status) {
      case 'healthy':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status: RealTimeStats['systemStatus']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle />;
      case 'warning':
        return <Warning />;
      case 'error':
        return <Error />;
      default:
        return <CheckCircle />;
    }
  };

  if (loading && !stats) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error && !stats) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="error" gutterBottom>
            Real-Time Status Unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Real-Time Status
          </Typography>
          <Chip
            icon={getStatusIcon(stats.systemStatus)}
            label={stats.systemStatus.toUpperCase()}
            sx={{
              backgroundColor: getStatusColor(stats.systemStatus),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <People sx={{ fontSize: 32, color: theme.palette.primary.main }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                {stats.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <Session sx={{ fontSize: 32, color: theme.palette.secondary.main }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                {stats.activeSessions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Sessions
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date(stats.lastUpdate).toLocaleTimeString()}
          </Typography>
        </Box>

        {error && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="error">
              Warning: {error}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeStatus;