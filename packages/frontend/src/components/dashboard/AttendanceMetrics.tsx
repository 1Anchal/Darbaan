import { Group, PersonAdd, Schedule, TrendingUp } from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { dashboardService } from '../../services/dashboardService';
import { DashboardMetrics } from '../../types';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, suffix = '' }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color }}>
              {value}{suffix}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {title}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

interface AttendanceMetricsProps {
  refreshInterval?: number; // in milliseconds
}

const AttendanceMetrics: React.FC<AttendanceMetricsProps> = ({ refreshInterval = 30000 }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const theme = useTheme();
  const { isConnected, onMetricsUpdate, subscribeToDashboard, requestMetrics } = useSocket();

  const fetchMetrics = async () => {
    try {
      setError(null);
      const data = await dashboardService.getDashboardMetrics();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Subscribe to dashboard updates if connected
    if (isConnected) {
      subscribeToDashboard();
    }

    // Set up auto-refresh as fallback
    const interval = setInterval(fetchMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, isConnected]);

  useEffect(() => {
    // Set up real-time metrics updates
    onMetricsUpdate((newMetrics: DashboardMetrics) => {
      setMetrics(newMetrics);
      setLastUpdated(new Date());
      setError(null);
    });
  }, [onMetricsUpdate]);

  if (loading && !metrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !metrics) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="error" gutterBottom>
            Error Loading Metrics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
          Attendance Overview
        </Typography>
        {lastUpdated && (
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Students"
            value={metrics.totalStudents}
            icon={<Group />}
            color={theme.palette.primary.main}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Present Today"
            value={metrics.presentToday}
            icon={<PersonAdd />}
            color={theme.palette.success.main}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Late Arrivals"
            value={metrics.lateArrivals}
            icon={<Schedule />}
            color={theme.palette.warning.main}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Attendance Rate"
            value={metrics.attendanceRate.toFixed(1)}
            icon={<TrendingUp />}
            color={theme.palette.info.main}
            suffix="%"
          />
        </Grid>
      </Grid>

      {error && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="error">
            Warning: {error}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AttendanceMetrics;