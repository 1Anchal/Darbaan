import {
    Clear as ClearIcon,
    FilterList as FilterIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { classService } from '../../services/classService';
import { ClassFilters, Instructor } from '../../types';

interface ClassFilterProps {
  onFilterChange: (filters: ClassFilters) => void;
}

const ClassFilter: React.FC<ClassFilterProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<ClassFilters>({
    search: '',
    instructorId: '',
    location: '',
    isActive: undefined
  });
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    try {
      const response = await classService.getAvailableInstructors();
      if (response.success && response.data) {
        setInstructors(response.data);
      }
    } catch (err) {
      console.error('Failed to load instructors:', err);
    }
  };

  const handleFilterChange = (field: keyof ClassFilters, value: any) => {
    const newFilters = {
      ...filters,
      [field]: value === '' ? undefined : value
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: ClassFilters = {
      search: '',
      instructorId: '',
      location: '',
      isActive: undefined
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = () => {
    return filters.search || 
           filters.instructorId || 
           filters.location || 
           filters.isActive !== undefined;
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.instructorId) count++;
    if (filters.location) count++;
    if (filters.isActive !== undefined) count++;
    return count;
  };

  const getInstructorName = (instructorId: string) => {
    const instructor = instructors.find(i => i.id === instructorId);
    return instructor ? `${instructor.firstName} ${instructor.lastName}` : '';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <FilterIcon color="action" />
        <Typography variant="h6" component="h2">
          Filter Classes
        </Typography>
        {hasActiveFilters() && (
          <Chip
            label={`${getActiveFilterCount()} filter${getActiveFilterCount() > 1 ? 's' : ''} active`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      <Grid container spacing={2} alignItems="center">
        {/* Search */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            label="Search"
            placeholder="Search by name or code..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            }}
          />
        </Grid>

        {/* Instructor Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Instructor</InputLabel>
            <Select
              value={filters.instructorId || ''}
              onChange={(e) => handleFilterChange('instructorId', e.target.value)}
              label="Instructor"
            >
              <MenuItem value="">All Instructors</MenuItem>
              {instructors.map((instructor) => (
                <MenuItem key={instructor.id} value={instructor.id}>
                  {instructor.firstName} {instructor.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Location Filter */}
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            label="Location"
            placeholder="Filter by location..."
            value={filters.location || ''}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          />
        </Grid>

        {/* Status Filter */}
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.isActive === undefined ? '' : filters.isActive.toString()}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange('isActive', value === '' ? undefined : value === 'true');
              }}
              label="Status"
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Clear Filters */}
        <Grid item xs={12} sm={6} md={2}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={clearFilters}
            disabled={!hasActiveFilters()}
            size="small"
          >
            Clear
          </Button>
        </Grid>
      </Grid>

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filters.search && (
            <Chip
              label={`Search: "${filters.search}"`}
              size="small"
              onDelete={() => handleFilterChange('search', '')}
            />
          )}
          {filters.instructorId && (
            <Chip
              label={`Instructor: ${getInstructorName(filters.instructorId)}`}
              size="small"
              onDelete={() => handleFilterChange('instructorId', '')}
            />
          )}
          {filters.location && (
            <Chip
              label={`Location: "${filters.location}"`}
              size="small"
              onDelete={() => handleFilterChange('location', '')}
            />
          )}
          {filters.isActive !== undefined && (
            <Chip
              label={`Status: ${filters.isActive ? 'Active' : 'Inactive'}`}
              size="small"
              onDelete={() => handleFilterChange('isActive', undefined)}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default ClassFilter;