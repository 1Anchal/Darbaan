import {
    Box,
    TextField,
    Typography
} from '@mui/material';

interface DateRangeSelectorProps {
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: string;
  endDate?: string;
  onChange: (dates: { startDate?: string; endDate?: string }) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  reportType,
  startDate,
  endDate,
  onChange
}) => {
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ startDate: event.target.value, endDate });
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ startDate, endDate: event.target.value });
  };

  const getDateLabel = () => {
    switch (reportType) {
      case 'daily':
        return 'Select Date';
      case 'weekly':
        return 'Week Start Date';
      case 'monthly':
        return 'Select Month';
      case 'custom':
        return 'Date Range';
      default:
        return 'Date';
    }
  };

  const getDateType = () => {
    switch (reportType) {
      case 'monthly':
        return 'month';
      default:
        return 'date';
    }
  };

  if (reportType === 'custom') {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {getDateLabel()}
        </Typography>
        <Box display="flex" gap={2}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate || ''}
            onChange={handleStartDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            size="small"
            fullWidth
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate || ''}
            onChange={handleEndDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            size="small"
            fullWidth
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {getDateLabel()}
      </Typography>
      <TextField
        type={getDateType()}
        value={startDate || ''}
        onChange={handleStartDateChange}
        InputLabelProps={{
          shrink: true,
        }}
        size="small"
        fullWidth
      />
    </Box>
  );
};

export default DateRangeSelector;