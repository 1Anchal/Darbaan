import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent
} from '@mui/material';

interface ReportTypeSelectorProps {
  value: 'daily' | 'weekly' | 'monthly' | 'custom';
  onChange: (type: 'daily' | 'weekly' | 'monthly' | 'custom') => void;
}

const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({ value, onChange }) => {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value as 'daily' | 'weekly' | 'monthly' | 'custom');
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="report-type-label">Report Type</InputLabel>
      <Select
        labelId="report-type-label"
        id="report-type-select"
        value={value}
        label="Report Type"
        onChange={handleChange}
      >
        <MenuItem value="daily">Daily Report</MenuItem>
        <MenuItem value="weekly">Weekly Report</MenuItem>
        <MenuItem value="monthly">Monthly Report</MenuItem>
        <MenuItem value="custom">Custom Range</MenuItem>
      </Select>
    </FormControl>
  );
};

export default ReportTypeSelector;