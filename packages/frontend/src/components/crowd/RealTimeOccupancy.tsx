import {
    People as PeopleIcon,
    Refresh as RefreshIcon,
    Remove as RemoveIcon,
    TrendingDown as TrendingDownIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { LocationOccupancy } from '../../services/crowdMonitoringService';
import { AlertLevel, CrowdLocation } from '../../types';

interface RealTimeOccupancyProps {
  location: CrowdLocation;
  occupancy: LocationOccupancy;
  loading?: boolean;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

const RealTimeOccupancy: React.FC<RealTimeOccupancyProps> = ({
  location,
  occupancy,
  loading = false,
  onRefresh,
  autoRefresh = true,
  refreshInterval = 30
}) => {
  const theme = useTheme();
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(refreshInterval);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1) {
          onRefresh?.();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, onRefresh]);

  const formatLocationName = (location: CrowdLocation): string => {
    return location
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAlertLevelColor = (alertLevel: AlertLevel) => {
    switch (alertLevel) {
      case AlertLevel.NORMAL:
        return theme.palette.success.main;
      case AlertLevel.WARNING:
        return theme.palette.warning.main;
      case AlertLevel.CRITICAL:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate < 60) return theme.palette.success.main;
    if (rate < 80) return theme.palette.info.main;
    if (rate < 95) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getCapacityStatus = (rate: number) => {
    if (rate < 60) return 'Low';
    if (rate < 80) return 'Moderate';
    if (rate < 95) return 'High';
    return 'Critical';
  };

  const getTrendDirection = (entryCount: number, exitCount: number) => {
    const netFlow = entryCount - exitCount;
    if (netFlow > 5) return 'increasing';
    if (netFlow < -5) return 'decreasing';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUpIcon sx={{ fontSize: 20, color: theme.palette.info.main }} />;
      case 'decreasing':
        return <TrendingDownIcon sx={{ fontSize: 20, color: theme.palette.warning.main }} />;
      default:
        return <RemoveIcon sx={{ fontSize: 20, color: theme.palette.grey[500] }} />;
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const trend = getTrendDirection(occupancy.entryCount24h, occupancy.exitCount24h);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3">
            {formatLocationName(location)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={occupancy.alertLevel.toUpperCase()}
              size="small"
              sx={{
                backgroundColor: getAlertLevelColor(occupancy.alertLevel),
                color: 'white',
                fontWeight: 'bold'
              }}
            />
            <Tooltip title="Refresh data">
              <IconButton size="small" onClick={onRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Main Occupancy Display */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                <CircularProgress
                  variant="determinate"
                  value={Math.min(occupancy.occupancyRate, 100)}
                  size={80}
                  thickness={6}
                  sx={{
                    color: getOccupancyColor(occupancy.occupancyRate),
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h6" component="div" fontWeight="bold">
                    {Math.round(occupancy.occupancyRate)}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Occupancy Rate
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
              <Typography variant="h4" component="div" fontWeight="bold">
                {occupancy.currentOccupancy}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of {occupancy.maxCapacity} people
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Status Information */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Capacity Status
          </Typography>
          <Chip
            label={getCapacityStatus(occupancy.occupancyRate)}
            sx={{
              backgroundColor: getOccupancyColor(occupancy.occupancyRate),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>

        {/* 24h Activity Trend */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            24h Activity Trend
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getTrendIcon(trend)}
            <Typography variant="body2">
              {trend.charAt(0).toUpperCase() + trend.slice(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (In: {occupancy.entryCount24h}, Out: {occupancy.exitCount24h})
            </Typography>
          </Box>
        </Box>

        {/* Active Devices */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Active Devices
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {occupancy.activeDevices.length}
          </Typography>
        </Box>

        {/* Last Updated & Auto Refresh */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Updated: {formatLastUpdated(occupancy.lastUpdated)}
          </Typography>
          {autoRefresh && (
            <Typography variant="caption" color="text.secondary">
              Next refresh: {timeUntilRefresh}s
            </Typography>
          )}
        </Box>

        {/* Alert Message for High Occupancy */}
        {occupancy.alertLevel !== AlertLevel.NORMAL && (
          <Box 
            sx={{ 
              mt: 2, 
              p: 1, 
              backgroundColor: getAlertLevelColor(occupancy.alertLevel) + '20',
              borderRadius: 1,
              border: `1px solid ${getAlertLevelColor(occupancy.alertLevel)}`
            }}
          >
            <Typography variant="caption" sx={{ color: getAlertLevelColor(occupancy.alertLevel) }}>
              {occupancy.alertLevel === AlertLevel.WARNING 
                ? 'Location approaching capacity limit. Monitor closely.'
                : 'Location at critical capacity. Immediate attention required.'
              }
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeOccupancy;