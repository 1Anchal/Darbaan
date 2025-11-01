import {
    Clear as ClearIcon,
    FilterList as FilterIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Class } from '../../types';

export interface StudentFilterValues {
  search: string;
  classId: string;
  isActive: string; // 'all', 'true', 'false'
}

interface StudentFilterProps {
  filters: StudentFilterValues;
  classes: Class[];
  onFiltersChange: (filters: StudentFilterValues) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  loading?: boolean;
}

const StudentFilter: React.FC<StudentFilterProps> = ({
  filters,
  classes,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  loading = false
}) => {
  const [localFilters, setLocalFilters] = useState<StudentFilterValues>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = { ...localFilters, search: event.target.value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClassChange = (event: SelectChangeEvent<string>) => {
    const newFilters = { ...localFilters, classId: event.target.value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    const newFilters = { ...localFilters, isActive: event.target.value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearSearch = () => {
    const newFilters = { ...localFilters, search: '' };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = () => {
    return localFilters.search !== '' || 
           localFilters.classId !== '' || 
           localFilters.isActive !== 'all';
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onApplyFilters();
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <FilterIcon color="primary" />
          <Typography variant="h6" component="h2">
            Filter Students
          </Typography>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          {/* Search Field */}
          <TextField
            label="Search Students"
            placeholder="Search by name, email, or student ID..."
            value={localFilters.search}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
            disabled={loading}
            sx={{ minWidth: 300, flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: localFilters.search && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleClearSearch}
                    disabled={loading}
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Class Filter */}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Class</InputLabel>
            <Select
              value={localFilters.classId}
              onChange={handleClassChange}
              disabled={loading}
              label="Filter by Class"
            >
              <MenuItem value="">
                <em>All Classes</em>
              </MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.code} - {cls.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter */}
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={localFilters.isActive}
              onChange={handleStatusChange}
              disabled={loading}
              label="Status"
            >
              <MenuItem value="all">All Students</MenuItem>
              <MenuItem value="true">Active Only</MenuItem>
              <MenuItem value="false">Inactive Only</MenuItem>
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              onClick={onApplyFilters}
              disabled={loading}
              startIcon={<FilterIcon />}
            >
              Apply Filters
            </Button>
            
            {hasActiveFilters() && (
              <Button
                variant="outlined"
                onClick={onClearFilters}
                disabled={loading}
                startIcon={<ClearIcon />}
              >
                Clear
              </Button>
            )}
          </Box>
        </Box>

        {/* Active Filters Summary */}
        {hasActiveFilters() && (
          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="text.secondary">
              Active filters: 
              {localFilters.search && ` Search: "${localFilters.search}"`}
              {localFilters.classId && ` Class: ${classes.find(c => c.id === localFilters.classId)?.name || 'Unknown'}`}
              {localFilters.isActive !== 'all' && ` Status: ${localFilters.isActive === 'true' ? 'Active' : 'Inactive'}`}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentFilter;