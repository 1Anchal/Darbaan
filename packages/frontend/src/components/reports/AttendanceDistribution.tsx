import {
    Box,
    Grid,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { AttendanceDistribution as AttendanceDistributionType } from '../../types';

interface AttendanceDistributionProps {
  distribution: AttendanceDistributionType;
}

const AttendanceDistribution: React.FC<AttendanceDistributionProps> = ({ distribution }) => {
  const theme = useTheme();

  // Define colors for each status
  const colors = {
    present: theme.palette.success.main,
    late: theme.palette.warning.main,
    absent: theme.palette.error.main
  };

  const total = distribution.present + distribution.late + distribution.absent;

  if (total === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <Typography variant="body1" color="text.secondary">
          No attendance data available for the selected period.
        </Typography>
      </Box>
    );
  }

  // Transform data for MUI pie chart
  const chartData = [
    {
      id: 0,
      value: distribution.present,
      label: 'Present',
      color: colors.present
    },
    {
      id: 1,
      value: distribution.late,
      label: 'Late',
      color: colors.late
    },
    {
      id: 2,
      value: distribution.absent,
      label: 'Absent',
      color: colors.absent
    }
  ].filter(item => item.value > 0); // Only show categories with data

  return (
    <Box>
      <PieChart
        series={[
          {
            data: chartData,
            highlightScope: { faded: 'global', highlighted: 'item' },
            faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
          },
        ]}
        width={400}
        height={300}
      />

      {/* Summary Statistics */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={4}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              textAlign: 'center',
              borderLeft: `4px solid ${colors.present}`
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {distribution.present}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Present
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {total > 0 ? ((distribution.present / total) * 100).toFixed(1) : 0}%
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={4}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              textAlign: 'center',
              borderLeft: `4px solid ${colors.late}`
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {distribution.late}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Late
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {total > 0 ? ((distribution.late / total) * 100).toFixed(1) : 0}%
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={4}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              textAlign: 'center',
              borderLeft: `4px solid ${colors.absent}`
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {distribution.absent}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Absent
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {total > 0 ? ((distribution.absent / total) * 100).toFixed(1) : 0}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Total Records: {total}
      </Typography>
    </Box>
  );
};

export default AttendanceDistribution;