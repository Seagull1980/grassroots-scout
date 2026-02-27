import { TOP_FA_LEAGUES } from '../config/leagues';
import { AGE_GROUP_OPTIONS, POSITION_OPTIONS, SORT_OPTIONS } from '../constants/options';
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  InputAdornment,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Slider,
  Grid,
  IconButton,
  Autocomplete,
  Paper,
  Divider,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import api from '../services/api';

interface SearchFilters {
  searchTerm: string;
  type: 'both' | 'vacancies' | 'players';
  league: string;
  ageGroup: string;
  position: string;
  location: string;
  sortBy: 'newest' | 'oldest' | 'alphabetical';
  radius: number;
}

interface SearchHistory {
  searchTerm: string;
  filters: Partial<SearchFilters>;
  resultsCount: number;
  searchedAt: string;
}

interface EnhancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
  loading?: boolean;
}

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  onSearch,
  initialFilters = {},
  loading = false
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    type: 'both',
    league: '',
    ageGroup: '',
    position: '',
    location: '',
    sortBy: 'newest',
    radius: 50,
    ...initialFilters
  });

  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Available options
  const leagues = TOP_FA_LEAGUES.map((l: { name: string }) => l.name);
  const ageGroups = AGE_GROUP_OPTIONS;
  const positions = POSITION_OPTIONS;
  const sortOptions = SORT_OPTIONS;

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const response = await api.get('/search/history?limit=5');
      setSearchHistory(response.data.history);
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  };

  const handleFilterChange = (field: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = () => {
    onSearch(filters);
    setShowHistory(false);
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      type: 'both',
      league: '',
      ageGroup: '',
      position: '',
      location: '',
      sortBy: 'newest',
      radius: 50
    });
  };

  const handleHistoryClick = (historyItem: SearchHistory) => {
    const newFilters = {
      ...filters,
      searchTerm: historyItem.searchTerm,
      ...historyItem.filters
    };
    setFilters(newFilters);
    onSearch(newFilters);
    setShowHistory(false);
  };

  const clearSearchHistory = async () => {
    try {
      await api.delete('/search/history');
      setSearchHistory([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  const getActiveFiltersCount = () => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'searchTerm' || key === 'type' || key === 'sortBy' || key === 'radius') return false;
      return value !== '';
    }).length;
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      {/* Main Search Bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <TextField
          fullWidth
          label="Search teams and players"
          placeholder="Enter keywords, team name, or location..."
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {filters.searchTerm && (
                  <IconButton
                    size="small"
                    onClick={() => handleFilterChange('searchTerm', '')}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  onClick={() => setShowHistory(!showHistory)}
                  color={showHistory ? 'primary' : 'default'}
                >
                  <HistoryIcon />
                </IconButton>
              </Box>
            )
          }}
        />
        
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading}
          startIcon={<SearchIcon />}
          sx={{ minWidth: 140, height: 56 }}
        >
          Search
        </Button>
      </Box>

      {/* Search History Dropdown */}
      {showHistory && searchHistory.length > 0 && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            mb: 2, 
            maxHeight: 300, 
            overflowY: 'auto',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Recent Searches
            </Typography>
            <Button size="small" onClick={clearSearchHistory}>
              Clear All
            </Button>
          </Box>
          
          {searchHistory.map((item, index) => (
            <Box
              key={index}
              sx={{
                p: 1,
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => handleHistoryClick(item)}
            >
              <Typography variant="body2">
                {item.searchTerm || 'Advanced search'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.resultsCount} results • {new Date(item.searchedAt).toLocaleDateString()}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* Quick Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filters.type}
            label="Type"
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <MenuItem value="both">Both</MenuItem>
            <MenuItem value="vacancies">Team Vacancies</MenuItem>
            <MenuItem value="players">Player Availability</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={filters.sortBy}
            label="Sort By"
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            {sortOptions.filter(Boolean).map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option?.label || option.value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={
            <Badge color="primary" badgeContent={getActiveFiltersCount()} invisible={getActiveFiltersCount() === 0}>
              <FilterIcon />
            </Badge>
          }
          onClick={() => setShowAdvanced(!showAdvanced)}
          color={getActiveFiltersCount() > 0 ? 'primary' : 'inherit'}
        >
          Filters
        </Button>

        {getActiveFiltersCount() > 0 && (
          <Button
            variant="text"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            size="small"
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {filters.league && (
            <Chip
              label={`League: ${filters.league}`}
              onDelete={() => handleFilterChange('league', '')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {filters.ageGroup && (
            <Chip
              label={`Age: ${filters.ageGroup}`}
              onDelete={() => handleFilterChange('ageGroup', '')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {filters.position && (
            <Chip
              label={`Position: ${filters.position}`}
              onDelete={() => handleFilterChange('position', '')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {filters.location && (
            <Chip
              label={`Location: ${filters.location}`}
              onDelete={() => handleFilterChange('location', '')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      )}

      {/* Advanced Filters */}
      <Accordion expanded={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Advanced Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={leagues}
                value={filters.league}
                onChange={(_, value) => handleFilterChange('league', value || '')}
                renderInput={(params) => (
                  <TextField {...params} label="League" fullWidth />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={ageGroups}
                value={filters.ageGroup}
                onChange={(_, value) => handleFilterChange('ageGroup', value || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Age Group" fullWidth />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={positions}
                value={filters.position}
                onChange={(_, value) => handleFilterChange('position', value || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Position" fullWidth />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>
                Search Radius: {filters.radius} km
              </Typography>
              <Slider
                value={filters.radius}
                onChange={(_, value) => handleFilterChange('radius', value)}
                min={5}
                max={200}
                step={5}
                marks={[
                  { value: 5, label: '5km' },
                  { value: 50, label: '50km' },
                  { value: 100, label: '100km' },
                  { value: 200, label: '200km' }
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              startIcon={<ClearIcon />}
            >
              Clear All Filters
            </Button>
            
            <Button
              variant="contained"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
            >
              Apply Filters
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default EnhancedSearch;
