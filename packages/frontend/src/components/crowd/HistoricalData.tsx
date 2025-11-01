import {
    Alert,
    Box,
    Card,
    CardContent,
    CircularProgress,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { CrowdPatterns, HistoricalDataPoint } from '../../services/crowdMonitoringService';
import { CrowdLocation } from '../../types';

interface HistoricalDataProps {
  location: CrowdLocation;
  historicalData: HistoricalDataPoint[];
  patterns?: CrowdPatterns;
  loading?: boolean;
  onTimeRangeChange?: (days: number) => void;
}

const HistoricalData: React.FC<HistoricalDataProps> = ({
  location,
  historicalData,
  patterns,
  loading = false,
  onTimeRangeChange
}) => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState(7); // days

  useEffect(() => {
    onTimeRangeChange?.(timeRange);
  }, [timeRange, onTimeRangeChange]);

  const formatLocationName = (location: CrowdLocation): string => {
    return location
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Process historical data for charts
  const processedData = historicalData.map(point => ({
    timestamp: point.timestamp.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    }),
    occupancy: point.occupancyCount,
    rate: Math.round(point.occupancyRate),
    fullTimestamp: point.timestamp
  }));

  // Process hourly patterns for bar chart
  const hourlyData = patterns ? Object.entries(patterns.hourlyPatterns).map(([hour, data]) => ({
    hour: `${hour}:00`,
    avgOccupancy: Math.round(data.avgOccupancy),
    count: data.count
  })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour)) : [];

  // Process occupancy distribution for pie chart
  const getOccupancyDistribution = () => {
    if (historicalData.length === 0) return [];
    
    const total = historicalData.length;
    const low = historicalData.filter(d => d.occupancyRate < 60).length;
    const moderate = historicalData.filter(d => d.occupancyRate >= 60 && d.occupancyRate < 80).length;
    const high = historicalData.filter(d => d.occupancyRate >= 80 && d.occupancyRate < 95).length;
    const critical = historicalData.filter(d => d.occupancyRate >= 95).length;

    return [
      { name: 'Low (< 60%)', value: Math.round((low / total) * 100), count: low, color: theme.palette.success.main },
      { name: 'Moderate (60-80%)', value: Math.round((moderate / total) * 100), count: moderate, color: theme.palette.info.main },
      { name: 'High (80-95%)', value: Math.round((high / total) * 100), count: high, color: theme.palette.warning.main },
      { name: 'Critical (95%+)', value: Math.round((critical / total) * 100), count: critical, color: theme.palette.error.main }
    ].filter(item => item.count > 0);
  };

  const distributionData = getOccupancyDistribution();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ 
          backgroundColor: 'white', 
          p: 1, 
          border: 1, 
          borderColor: 'grey.300',
          borderRadius: 1,
          boxShadow: 1
        }}>
          <Typography variant="body2" fontWeight="bold">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="caption" sx={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (historicalData.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Historical Data - {formatLocationName(location)}
          </Typography>
          <Alert severity="info">
            No historical data available for the selected time period.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2">
            Historical Data - {formatLocationName(location)}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as number)}
            >
              <MenuItem value={1}>Last 24 hours</MenuItem>
              <MenuItem value={3}>Last 3 days</MenuItem>
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={14}>Last 14 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3}>
          {/* Occupancy Trend Line Chart */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Occupancy Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  label={{ value: 'People', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  name="Occupancy Count"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Grid>

          {/* Hourly Patterns Bar Chart */}
          {patterns && (
            <Grid item xs={12} md={8}>
              <Typography variant="subtitle1" gutterBottom>
                Average Occupancy by Hour ({patterns.analysisPeriod.days} days)
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis 
                    label={{ value: 'Avg People', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="avgOccupancy" 
                    fill={theme.palette.secondary.main}
                    name="Average Occupancy"
                  />
                </BarChart>
              </ResponsiveContainer>
              {patterns.peakHour !== undefined && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Peak hour: {patterns.peakHour}:00 (Average: {Math.round(patterns.averageOccupancy)} people)
                </Typography>
              )}
            </Grid>
          )}

          {/* Occupancy Distribution Pie Chart */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Occupancy Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value}% (${props.payload.count} records)`, 
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Grid>

          {/* Summary Statistics */}
          <Grid item xs={12}>
            <Box sx={{ 
              p: 2, 
              backgroundColor: theme.palette.grey[50], 
              borderRadius: 1,
              mt: 2
            }}>
              <Typography variant="subtitle2" gutterBottom>
                Summary Statistics ({timeRange} day{timeRange > 1 ? 's' : ''})
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Average Occupancy
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {Math.round(historicalData.reduce((sum, d) => sum + d.occupancyCount, 0) / historicalData.length)} people
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Peak Occupancy
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {Math.max(...historicalData.map(d => d.occupancyCount))} people
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Average Rate
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {Math.round(historicalData.reduce((sum, d) => sum + d.occupancyRate, 0) / historicalData.length)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Data Points
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {historicalData.length}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default HistoricalData;