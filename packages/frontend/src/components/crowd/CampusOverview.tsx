import {
    CheckCircle as CheckCircleIcon,
    LocationOn as LocationIcon,
    People as PeopleIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    LinearProgress,
    Typography,
    useTheme
} from '@mui/material';
import React from 'react';
import { CampusOverview as CampusOverviewType } from '../../services/crowdMonitoringService';

interface CampusOverviewProps {
  overview: CampusOverviewType;
  loading?: boolean;
}

const CampusOverview: React.FC<CampusOverviewProps> = ({ overview, loading = false }) => {
  const theme = useTheme();

  const getOccupancyColor = (rate: number) => {
    if (rate < 60) return theme.palette.success.main;
    if (rate < 80) return theme.palette.info.main;
    if (rate < 95) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getAlertStatusColor = (alertCount: number) => {
    if (alertCount === 0) return theme.palette.success.main;
    if (alertCount <= 2) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Campus Overview
          </Typography>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Box sx={{ height: 80 }}>
                  <LinearProgress />
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2">
            Campus Overview
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last updated: {formatLastUpdated(overview.lastUpdated)}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Total Locations */}
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <LocationIcon 
                  sx={{ 
                    fontSize: 40, 
                    color: theme.palette.primary.main,
                    mb: 1 
                  }} 
                />
                <Typography variant="h4" component="div" fontWeight="bold">
                  {overview.totalLocations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monitored Locations
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Occupancy */}
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon 
                  sx={{ 
                    fontSize: 40, 
                    color: getOccupancyColor(overview.occupancyRate),
                    mb: 1 
                  }} 
                />
                <Typography variant="h4" component="div" fontWeight="bold">
                  {overview.totalOccupancy}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Occupancy
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  of {overview.totalCapacity} capacity
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Occupancy Rate */}
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Campus Occupancy Rate
                </Typography>
                <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                  {Math.round(overview.occupancyRate)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(overview.occupancyRate, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getOccupancyColor(overview.occupancyRate),
                      borderRadius: 4,
                    },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    0%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    100%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Active Alerts */}
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                {overview.activeAlerts === 0 ? (
                  <CheckCircleIcon 
                    sx={{ 
                      fontSize: 40, 
                      color: theme.palette.success.main,
                      mb: 1 
                    }} 
                  />
                ) : (
                  <WarningIcon 
                    sx={{ 
                      fontSize: 40, 
                      color: getAlertStatusColor(overview.activeAlerts),
                      mb: 1 
                    }} 
                  />
                )}
                <Typography variant="h4" component="div" fontWeight="bold">
                  {overview.activeAlerts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Alerts
                </Typography>
                <Chip
                  label={overview.activeAlerts === 0 ? 'All Clear' : 'Attention Needed'}
                  size="small"
                  sx={{
                    mt: 1,
                    backgroundColor: getAlertStatusColor(overview.activeAlerts),
                    color: 'white',
                    fontSize: '0.75rem'
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Status Summary */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Status Summary:</strong> {overview.totalOccupancy} people across {overview.totalLocations} locations
            {overview.activeAlerts > 0 && (
              <span style={{ color: theme.palette.warning.main }}>
                {' '}• {overview.activeAlerts} location{overview.activeAlerts > 1 ? 's' : ''} need{overview.activeAlerts === 1 ? 's' : ''} attention
              </span>
            )}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CampusOverview;