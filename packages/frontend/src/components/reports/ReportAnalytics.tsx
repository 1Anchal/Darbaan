import {
    AccessTime as AccessTimeIcon,
    People as PeopleIcon,
    School as SchoolIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import {
    Box,
    Grid,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import { AttendanceAnalytics } from '../../types';

interface ReportAnalyticsProps {
  analytics: AttendanceAnalytics;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, suffix = '' }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        borderLeft: `4px solid ${color}`
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: `${color}20`,
          color: color,
          mr: 2
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" component="div" fontWeight="bold">
          {value}{suffix}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
    </Paper>
  );
};

const ReportAnalytics: React.FC<ReportAnalyticsProps> = ({ analytics }) => {
  const theme = useTheme();

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Students"
          value={analytics.totalStudents}
          icon={<PeopleIcon />}
          color={theme.palette.primary.main}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Average Attendance"
          value={formatPercentage(analytics.averageAttendance)}
          icon={<TrendingUpIcon />}
          color={theme.palette.success.main}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Classes"
          value={analytics.totalClasses}
          icon={<SchoolIcon />}
          color={theme.palette.info.main}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Punctuality Rate"
          value={formatPercentage(analytics.punctualityRate)}
          icon={<AccessTimeIcon />}
          color={theme.palette.warning.main}
        />
      </Grid>
    </Grid>
  );
};

export default ReportAnalytics;