import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    LocationOn as LocationIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import {
    Alert,
    AlertTitle,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
    useTheme
} from '@mui/material';
import React from 'react';
import { CrowdAlert } from '../../services/crowdMonitoringService';
import { AlertLevel, CrowdLocation } from '../../types';

interface AlertPanelProps {
  alerts: CrowdAlert[];
  loading?: boolean;
  showAllAlerts?: boolean;
  maxAlertsToShow?: number;
}

const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  loading = false,
  showAllAlerts = false,
  maxAlertsToShow = 5
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  const formatLocationName = (location: CrowdLocation): string => {
    return location
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAlertIcon = (alertLevel: AlertLevel) => {
    switch (alertLevel) {
      case AlertLevel.WARNING:
        return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
      case AlertLevel.CRITICAL:
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      default:
        return <CheckCircleIcon sx={{ color: theme.palette.success.main }} />;
    }
  };

  const getAlertSeverity = (alertLevel: AlertLevel): 'warning' | 'error' | 'success' => {
    switch (alertLevel) {
      case AlertLevel.WARNING:
        return 'warning';
      case AlertLevel.CRITICAL:
        return 'error';
      default:
        return 'success';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    // Sort by severity first (critical > warning), then by timestamp (newest first)
    const severityOrder = { [AlertLevel.CRITICAL]: 3, [AlertLevel.WARNING]: 2, [AlertLevel.NORMAL]: 1 };
    const severityDiff = severityOrder[b.alertLevel] - severityOrder[a.alertLevel];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const activeAlerts = sortedAlerts.filter(alert => alert.isActive);
  const criticalAlerts = activeAlerts.filter(alert => alert.alertLevel === AlertLevel.CRITICAL);
  const warningAlerts = activeAlerts.filter(alert => alert.alertLevel === AlertLevel.WARNING);

  const displayAlerts = showAllAlerts || expanded ? activeAlerts : activeAlerts.slice(0, maxAlertsToShow);
  const hasMoreAlerts = activeAlerts.length > maxAlertsToShow && !showAllAlerts;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Crowd Alerts
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            Loading alerts...
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Crowd Alerts
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {criticalAlerts.length > 0 && (
              <Chip
                label={`${criticalAlerts.length} Critical`}
                size="small"
                sx={{
                  backgroundColor: theme.palette.error.main,
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            )}
            {warningAlerts.length > 0 && (
              <Chip
                label={`${warningAlerts.length} Warning`}
                size="small"
                sx={{
                  backgroundColor: theme.palette.warning.main,
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            )}
          </Box>
        </Box>

        {/* No Alerts State */}
        {activeAlerts.length === 0 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <AlertTitle>All Clear</AlertTitle>
            No active crowd alerts. All locations are operating within normal capacity.
          </Alert>
        )}

        {/* Alert Summary */}
        {activeAlerts.length > 0 && (
          <Alert 
            severity={criticalAlerts.length > 0 ? 'error' : 'warning'} 
            sx={{ mb: 2 }}
          >
            <AlertTitle>
              {criticalAlerts.length > 0 ? 'Critical Alerts Active' : 'Monitoring Required'}
            </AlertTitle>
            {criticalAlerts.length > 0 && (
              <Typography variant="body2">
                {criticalAlerts.length} location{criticalAlerts.length > 1 ? 's' : ''} require immediate attention.
              </Typography>
            )}
            {warningAlerts.length > 0 && (
              <Typography variant="body2">
                {warningAlerts.length} location{warningAlerts.length > 1 ? 's' : ''} approaching capacity limits.
              </Typography>
            )}
          </Alert>
        )}

        {/* Alert List */}
        {activeAlerts.length > 0 && (
          <>
            <List sx={{ width: '100%' }}>
              {displayAlerts.map((alert, index) => (
                <React.Fragment key={alert.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                      {getAlertIcon(alert.alertLevel)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="subtitle2" fontWeight="bold">
                            {formatLocationName(alert.location)}
                          </Typography>
                          <Chip
                            label={alert.alertLevel.toUpperCase()}
                            size="small"
                            sx={{
                              backgroundColor: getAlertSeverity(alert.alertLevel) === 'error' 
                                ? theme.palette.error.main 
                                : theme.palette.warning.main,
                              color: 'white',
                              fontSize: '0.7rem',
                              height: 18
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                            {alert.message}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Occupancy: {alert.occupancyCount}/{alert.maxCapacity} 
                              ({Math.round((alert.occupancyCount / alert.maxCapacity) * 100)}%)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(alert.timestamp)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < displayAlerts.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>

            {/* Show More/Less Button */}
            {hasMoreAlerts && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <IconButton
                  onClick={() => setExpanded(!expanded)}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    color: 'text.secondary'
                  }}
                >
                  <Typography variant="caption">
                    {expanded ? 'Show Less' : `Show ${activeAlerts.length - maxAlertsToShow} More`}
                  </Typography>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            )}
          </>
        )}

        {/* Footer Info */}
        <Box sx={{ mt: 2, p: 1, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Alerts are updated in real-time based on location occupancy thresholds.
            {activeAlerts.length > 0 && ' Take appropriate action to manage crowd density.'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AlertPanel;