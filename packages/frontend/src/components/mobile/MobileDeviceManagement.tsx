import {
    Battery20,
    Battery50,
    Battery80,
    BatteryFull,
    BatteryUnknown,
    Delete,
    PhoneAndroid,
    QrCode,
    Refresh,
    SignalCellular0Bar,
    SignalCellular1Bar,
    SignalCellular2Bar,
    SignalCellular3Bar,
    SignalCellular4Bar
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
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
import { useAuth } from '../../contexts/AuthContext';
import { MobileDeviceInfo, MobileDeviceStats, mobileDeviceService } from '../../services/mobileDeviceService';
import { UserRole } from '../../types';

interface MobileDeviceManagementProps {
  userId?: string; // For admin/faculty to view specific user's devices
}

const MobileDeviceManagement: React.FC<MobileDeviceManagementProps> = ({ userId }) => {
  const [devices, setDevices] = useState<MobileDeviceInfo[]>([]);
  const [stats, setStats] = useState<MobileDeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<MobileDeviceInfo | null>(null);

  const { user } = useAuth();
  const theme = useTheme();

  const canManageDevices = user?.role === UserRole.ADMIN || user?.role === UserRole.FACULTY;
  const isStudent = user?.role === UserRole.STUDENT;

  const fetchDevices = async () => {
    try {
      setError(null);
      const deviceList = await mobileDeviceService.getUserMobileDevices(userId);
      setDevices(deviceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    }
  };

  const fetchStats = async () => {
    if (canManageDevices) {
      try {
        const deviceStats = await mobileDeviceService.getMobileDeviceStats();
        setStats(deviceStats);
      } catch (err) {
        console.error('Failed to fetch device stats:', err);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchDevices(), fetchStats()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleGenerateQR = async () => {
    try {
      const qrCode = await mobileDeviceService.generateRegistrationQR();
      setQrData(qrCode);
      setQrDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;

    try {
      await mobileDeviceService.deactivateMobileDevice(deviceToDelete.deviceId);
      await fetchDevices();
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate device');
    }
  };

  const getBatteryIcon = (batteryLevel?: number) => {
    if (batteryLevel === undefined) return <BatteryUnknown />;
    if (batteryLevel > 80) return <BatteryFull sx={{ color: theme.palette.success.main }} />;
    if (batteryLevel > 50) return <Battery80 sx={{ color: theme.palette.success.main }} />;
    if (batteryLevel > 20) return <Battery50 sx={{ color: theme.palette.warning.main }} />;
    return <Battery20 sx={{ color: theme.palette.error.main }} />;
  };

  const getSignalIcon = (signalStrength?: number) => {
    if (signalStrength === undefined) return <SignalCellular0Bar />;
    if (signalStrength > -50) return <SignalCellular4Bar sx={{ color: theme.palette.success.main }} />;
    if (signalStrength > -60) return <SignalCellular3Bar sx={{ color: theme.palette.success.main }} />;
    if (signalStrength > -70) return <SignalCellular2Bar sx={{ color: theme.palette.warning.main }} />;
    if (signalStrength > -80) return <SignalCellular1Bar sx={{ color: theme.palette.error.main }} />;
    return <SignalCellular0Bar sx={{ color: theme.palette.error.main }} />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography>Loading mobile devices...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Mobile Device Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton onClick={fetchData} title="Refresh">
            <Refresh />
          </IconButton>
          {isStudent && (
            <Button
              variant="contained"
              startIcon={<QrCode />}
              onClick={handleGenerateQR}
            >
              Register Device
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      {/* Statistics Cards - Admin/Faculty only */}
      {canManageDevices && stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  {stats.totalRegistered}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Registered
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {stats.activeDevices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Devices
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="info.main">
                  {stats.recentlyActive}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recently Active
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main">
                  {Object.keys(stats.byDeviceModel).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Device Models
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Device List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {userId ? `Devices for User ${userId}` : 'Your Mobile Devices'}
          </Typography>
          
          {devices.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PhoneAndroid sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No mobile devices registered
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isStudent 
                  ? 'Click "Register Device" to add your mobile device for attendance tracking'
                  : 'This user has not registered any mobile devices yet'
                }
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Device</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Seen</TableCell>
                    <TableCell>Battery</TableCell>
                    <TableCell>Signal</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {devices.map((device) => {
                    const deviceStatus = mobileDeviceService.formatDeviceStatus(device);
                    const batteryInfo = mobileDeviceService.formatBatteryLevel(device.batteryLevel);
                    const signalInfo = mobileDeviceService.formatSignalStrength(device.signalStrength);
                    
                    return (
                      <TableRow key={device.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneAndroid />
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {device.deviceModel}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Android {device.androidVersion} • App v{device.appVersion}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={deviceStatus.status}
                            size="small"
                            sx={{
                              backgroundColor: deviceStatus.color + '20',
                              color: deviceStatus.color,
                              border: `1px solid ${deviceStatus.color}40`
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(device.lastSeen).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {deviceStatus.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getBatteryIcon(device.batteryLevel)}
                            <Typography variant="body2">
                              {batteryInfo.level}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getSignalIcon(device.signalStrength)}
                            <Typography variant="body2">
                              {signalInfo.strength}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {(isStudent || canManageDevices) && (
                            <IconButton
                              onClick={() => {
                                setDeviceToDelete(device);
                                setDeleteDialogOpen(true);
                              }}
                              color="error"
                              size="small"
                              title="Deactivate Device"
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Device Registration QR Code</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Scan this QR code with the Darbaan mobile app to register your device:
            </Typography>
            <Box sx={{ 
              p: 2, 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              backgroundColor: 'background.paper',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              wordBreak: 'break-all',
              maxHeight: 200,
              overflow: 'auto'
            }}>
              {qrData}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              This QR code contains your registration information. Keep it secure.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Deactivate Mobile Device</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate this mobile device? This will stop attendance tracking for this device.
          </Typography>
          {deviceToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Device:</strong> {deviceToDelete.deviceModel}
              </Typography>
              <Typography variant="body2">
                <strong>Android Version:</strong> {deviceToDelete.androidVersion}
              </Typography>
              <Typography variant="body2">
                <strong>Last Seen:</strong> {new Date(deviceToDelete.lastSeen).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteDevice} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileDeviceManagement;