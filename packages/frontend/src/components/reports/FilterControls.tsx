import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { classService } from '../../services/classService';
import { Class } from '../../types';

interface FilterControlsProps {
  classId?: string;
  onClassChange: (classId?: string) => void;
  onApplyFilters: () => void;
  loading?: boolean;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  classId,
  onClassChange,
  onApplyFilters,
  loading = false
}) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await classService.getClasses({});
      setClasses(response.classes);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleClassChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    onClassChange(value === '' ? undefined : value);
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Filters
      </Typography>
      
      <Box display="flex" flexDirection="column" gap={2}>
        <FormControl fullWidth size="small">
          <InputLabel id="class-filter-label">Class (Optional)</InputLabel>
          <Select
            labelId="class-filter-label"
            id="class-filter-select"
            value={classId || ''}
            label="Class (Optional)"
            onChange={handleClassChange}
            disabled={loadingClasses}
          >
            <MenuItem value="">
              <em>All Classes</em>
            </MenuItem>
            {classes.map((cls) => (
              <MenuItem key={cls.id} value={cls.id}>
                {cls.name} ({cls.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={onApplyFilters}
          disabled={loading}
          fullWidth
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Generating...' : 'Apply Filters'}
        </Button>
      </Box>
    </Box>
  );
};

export default FilterControls;