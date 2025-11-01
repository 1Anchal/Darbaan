import {
    Box,
    Typography,
    useTheme
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { AttendanceTrend } from '../../types';

interface AttendanceTrendsProps {
  trends: AttendanceTrend[];
}

const AttendanceTrends: React.FC<AttendanceTrendsProps> = ({ trends }) => {
  const theme = useTheme();

  if (!trends || trends.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <Typography variant="body1" color="text.secondary">
          No trend data available for the selected period.
        </Typography>
      </Box>
    );
  }

  // Transform data for MUI charts
  const xAxisData = trends.map(trend => 
    new Date(trend.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  );

  const series = [
    {
      data: trends.map(trend => trend.presentCount),
      label: 'Present',
      color: theme.palette.success.main,
    },
    {
      data: trends.map(trend => trend.lateCount),
      label: 'Late',
      color: theme.palette.warning.main,
    },
    {
      data: trends.map(trend => trend.absentCount),
      label: 'Absent',
      color: theme.palette.error.main,
    },
    {
      data: trends.map(trend => trend.attendanceRate),
      label: 'Attendance Rate (%)',
      color: theme.palette.primary.main,
    },
  ];

  return (
    <Box>
      <LineChart
        width={800}
        height={400}
        series={series}
        xAxis={[{ 
          scaleType: 'point', 
          data: xAxisData,
        }]}
        margin={{ left: 50, right: 50, top: 50, bottom: 50 }}
      />
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        This chart shows attendance trends over the selected period. The attendance rate line represents the overall percentage.
      </Typography>
    </Box>
  );
};

export default AttendanceTrends;