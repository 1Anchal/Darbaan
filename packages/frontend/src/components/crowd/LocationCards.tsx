import {
    Info as InfoIcon,
    LocalLibrary as LibraryIcon,
    Park as ParkIcon,
    People as PeopleIcon,
    Restaurant as RestaurantIcon,
    Theater as TheaterIcon,
    TrendingDown as TrendingDownIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    IconButton,
    LinearProgress,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import React from 'react';
import { LocationOccupancy } from '../../services/crowdMonitoringService';
import { AlertLevel, CrowdLocation } from '../../types';

interface LocationCardsProps {
  locations: LocationOccupancy[];
  loading?: boolean;
  onLocationClick?: (location: CrowdLocation) => void;
}

const LocationCards: React.FC<LocationCardsProps> = ({ 
  locations, 
  loading = false, 
  onLocationClick 
}) => {
  const theme = useTheme();

  const getLocationIcon = (location: CrowdLocation) => {
    const iconProps = { sx: { fontSize: 32, mb: 1 } };
    
    switch (location) {
      case CrowdLocation.FOOD_STREET:
        return <RestaurantIcon {...iconProps} />;
      case CrowdLocation.ROCK_PLAZA:
        return <ParkIcon {...iconProps} />;
      case CrowdLocation.CENTRAL_LIBRARY:
        return <LibraryIcon {...iconProps} />;
      case CrowdLocation.MAIN_AUDITORIUM:
        return <TheaterIcon {...iconProps} />;
      default:
        return <PeopleIcon {...iconProps} />;
    }
  };

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

  const getAlertLevelLabel = (alertLevel: AlertLevel) => {
    switch (alertLevel) {
      case AlertLevel.NORMAL:
        return 'Normal';
      case AlertLevel.WARNING:
        return 'Warning';
      case AlertLevel.CRITICAL:
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate < 60) return theme.palette.success.main;
    if (rate < 80) return theme.palette.info.main;
    if (rate < 95) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const getTrendIcon = (entryCount: number, exitCount: number) => {
    if (entryCount > exitCount) {
      return <TrendingUpIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />;
    } else if (exitCount > entryCount) {
      return <TrendingDownIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />;
    }
    return null;
  };

  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item}>
            <Card>
              <CardContent>
                <Box sx={{ height: 200 }}>
                  <LinearProgress />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {locations.map((location) => (
        <Grid item xs={12} sm={6} md={3} key={location.location}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: onLocationClick ? 'pointer' : 'default',
              transition: 'all 0.2s ease-in-out',
              '&:hover': onLocationClick ? {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4]
              } : {},
              border: location.alertLevel !== AlertLevel.NORMAL ? 
                `2px solid ${getAlertLevelColor(location.alertLevel)}` : 
                undefined
            }}
            onClick={() => onLocationClick?.(location.location)}
          >
            <CardContent>
              {/* Header with location name and alert status */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ textAlign: 'center', flexGrow: 1 }}>
                  {getLocationIcon(location.location)}
                  <Typography variant="h6" component="h3" fontWeight="bold" noWrap>
                    {formatLocationName(location.location)}
                  </Typography>
                </Box>
                <Tooltip title={`Alert Level: ${getAlertLevelLabel(location.alertLevel)}`}>
                  <Chip
                    label={getAlertLevelLabel(location.alertLevel)}
                    size="small"
                    sx={{
                      backgroundColor: getAlertLevelColor(location.alertLevel),
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20
                    }}
                  />
                </Tooltip>
              </Box>

              {/* Occupancy Information */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Occupancy
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {location.currentOccupancy} / {location.maxCapacity}
                  </Typography>
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={Math.min(location.occupancyRate, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getOccupancyColor(location.occupancyRate),
                      borderRadius: 4,
                    },
                  }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    0%
                  </Typography>
                  <Typography 
                    variant="caption" 
                    fontWeight="bold"
                    sx={{ color: getOccupancyColor(location.occupancyRate) }}
                  >
                    {Math.round(location.occupancyRate)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    100%
                  </Typography>
                </Box>
              </Box>

              {/* 24h Activity */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  24h Activity
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      In: {location.entryCount24h}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Out: {location.exitCount24h}
                    </Typography>
                    {getTrendIcon(location.entryCount24h, location.exitCount24h)}
                  </Box>
                  <Tooltip title="View detailed analytics">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Active Devices */}
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Active Devices: {location.activeDevices.length}
                </Typography>
              </Box>

              {/* Last Updated */}
              <Typography variant="caption" color="text.secondary">
                Updated: {formatLastUpdated(location.lastUpdated)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default LocationCards;