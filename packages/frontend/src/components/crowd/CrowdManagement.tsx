import {
    Alert,
    Box,
    Container,
    Grid,
    Paper,
    Snackbar,
    Tab,
    Tabs,
    Typography,
    useTheme
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import crowdMonitoringService, {
    CampusOverview as CampusOverviewType,
    CrowdAlert,
    CrowdPatterns,
    HistoricalDataPoint,
    LocationOccupancy
} from '../../services/crowdMonitoringService';
import { CrowdLocation, UserRole } from '../../types';

// Import components
import AlertPanel from './AlertPanel';
import CampusOverview from './CampusOverview';
import HistoricalData from './HistoricalData';
import LocationCards from './LocationCards';
import RealTimeOccupancy from './RealTimeOccupancy';

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
      id={`crowd-tabpanel-${index}`}
      aria-labelledby={`crowd-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CrowdManagement: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  
  // State management
  const [tabValue, setTabValue] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<CrowdLocation>(CrowdLocation.FOOD_STREET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [campusOverview, setCampusOverview] = useState<CampusOverviewType | null>(null);
  const [locationOccupancies, setLocationOccupancies] = useState<LocationOccupancy[]>([]);
  const [selectedLocationData, setSelectedLocationData] = useState<LocationOccupancy | null>(null);
  const [crowdAlerts, setCrowdAlerts] = useState<CrowdAlert[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [crowdPatterns, setCrowdPatterns] = useState<CrowdPatterns | null>(null);

  // Loading states for individual components
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [historicalLoading, setHistoricalLoading] = useState(false);

  // Load campus overview
  const loadCampusOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const overview = await crowdMonitoringService.getCampusOverview();
      setCampusOverview(overview);
    } catch (error) {
      console.error('Error loading campus overview:', error);
      setError('Failed to load campus overview');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // Load all location occupancies
  const loadLocationOccupancies = useCallback(async () => {
    try {
      setLocationsLoading(true);
      const occupancies = await crowdMonitoringService.getAllLocationOccupancies();
      setLocationOccupancies(occupancies);
      
      // Update selected location data if it exists
      const selectedData = occupancies.find(occ => occ.location === selectedLocation);
      if (selectedData) {
        setSelectedLocationData(selectedData);
      }
    } catch (error) {
      console.error('Error loading location occupancies:', error);
      setError('Failed to load location data');
    } finally {
      setLocationsLoading(false);
    }
  }, [selectedLocation]);

  // Load crowd alerts (admin and faculty only)
  const loadCrowdAlerts = useCallback(async () => {
    if (user?.role === UserRole.STUDENT) return;
    
    try {
      setAlertsLoading(true);
      const alerts = await crowdMonitoringService.getCrowdAlerts();
      setCrowdAlerts(alerts);
    } catch (error) {
      console.error('Error loading crowd alerts:', error);
      setError('Failed to load crowd alerts');
    } finally {
      setAlertsLoading(false);
    }
  }, [user?.role]);

  // Load historical data for selected location
  const loadHistoricalData = useCallback(async (days: number = 7) => {
    try {
      setHistoricalLoading(true);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const [historical, patterns] = await Promise.all([
        crowdMonitoringService.getHistoricalData(selectedLocation, startDate, endDate),
        user?.role !== UserRole.STUDENT 
          ? crowdMonitoringService.getCrowdPatterns(selectedLocation, days)
          : Promise.resolve(null)
      ]);
      
      setHistoricalData(historical);
      setCrowdPatterns(patterns);
    } catch (error) {
      console.error('Error loading historical data:', error);
      setError('Failed to load historical data');
    } finally {
      setHistoricalLoading(false);
    }
  }, [selectedLocation, user?.role]);

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadCampusOverview(),
        loadLocationOccupancies(),
        loadCrowdAlerts(),
        loadHistoricalData()
      ]);
    } catch (error) {
      console.error('Error loading crowd management data:', error);
      setError('Failed to load crowd management data');
    } finally {
      setLoading(false);
    }
  }, [loadCampusOverview, loadLocationOccupancies, loadCrowdAlerts, loadHistoricalData]);

  // Initial data load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auto-refresh data every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (tabValue === 0) { // Only refresh on overview tab
        loadCampusOverview();
        loadLocationOccupancies();
        loadCrowdAlerts();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [tabValue, loadCampusOverview, loadLocationOccupancies, loadCrowdAlerts]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle location selection
  const handleLocationClick = (location: CrowdLocation) => {
    setSelectedLocation(location);
    setTabValue(1); // Switch to location details tab
  };

  // Handle location change in details tab
  const handleLocationChange = (location: CrowdLocation) => {
    setSelectedLocation(location);
    loadHistoricalData();
  };

  // Handle refresh for specific location
  const handleLocationRefresh = () => {
    loadLocationOccupancies();
  };

  // Handle historical data time range change
  const handleTimeRangeChange = (days: number) => {
    loadHistoricalData(days);
  };

  // Close error snackbar
  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Crowd Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor real-time occupancy and crowd density across campus locations
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="crowd management tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Campus Overview" />
          <Tab label="Location Details" />
          {user?.role !== UserRole.STUDENT && <Tab label="Alerts & Analytics" />}
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      
      {/* Campus Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Campus Overview Card */}
          <Grid item xs={12}>
            <CampusOverview 
              overview={campusOverview!} 
              loading={overviewLoading || !campusOverview} 
            />
          </Grid>

          {/* Location Cards */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Location Status
            </Typography>
            <LocationCards
              locations={locationOccupancies}
              loading={locationsLoading}
              onLocationClick={handleLocationClick}
            />
          </Grid>

          {/* Alerts Panel (for admin/faculty) */}
          {user?.role !== UserRole.STUDENT && (
            <Grid item xs={12}>
              <AlertPanel
                alerts={crowdAlerts}
                loading={alertsLoading}
                maxAlertsToShow={3}
              />
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Location Details Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Location Selector */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Select Location
              </Typography>
              <Grid container spacing={2}>
                {Object.values(CrowdLocation).map((location) => (
                  <Grid item key={location}>
                    <Box
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: selectedLocation === location ? 'primary.main' : 'grey.300',
                        borderRadius: 1,
                        cursor: 'pointer',
                        backgroundColor: selectedLocation === location ? 'primary.50' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'grey.50'
                        }
                      }}
                      onClick={() => handleLocationChange(location)}
                    >
                      <Typography variant="body2" fontWeight={selectedLocation === location ? 'bold' : 'normal'}>
                        {crowdMonitoringService.formatLocationName(location)}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Real-time Occupancy */}
          <Grid item xs={12} md={4}>
            <RealTimeOccupancy
              location={selectedLocation}
              occupancy={selectedLocationData!}
              loading={!selectedLocationData}
              onRefresh={handleLocationRefresh}
              autoRefresh={true}
            />
          </Grid>

          {/* Historical Data */}
          <Grid item xs={12} md={8}>
            <HistoricalData
              location={selectedLocation}
              historicalData={historicalData}
              patterns={crowdPatterns || undefined}
              loading={historicalLoading}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </Grid>
        </Grid>
      </TabPanel>

      {/* Alerts & Analytics Tab (admin/faculty only) */}
      {user?.role !== UserRole.STUDENT && (
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {/* Detailed Alerts Panel */}
            <Grid item xs={12} md={8}>
              <AlertPanel
                alerts={crowdAlerts}
                loading={alertsLoading}
                showAllAlerts={true}
              />
            </Grid>

            {/* Campus Overview Summary */}
            <Grid item xs={12} md={4}>
              <CampusOverview 
                overview={campusOverview!} 
                loading={overviewLoading || !campusOverview} 
              />
            </Grid>

            {/* All Locations Grid */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                All Locations Status
              </Typography>
              <LocationCards
                locations={locationOccupancies}
                loading={locationsLoading}
                onLocationClick={handleLocationClick}
              />
            </Grid>
          </Grid>
        </TabPanel>
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CrowdManagement;