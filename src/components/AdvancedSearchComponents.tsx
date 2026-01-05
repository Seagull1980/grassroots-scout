import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Typography,
  IconButton,
  Divider,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Sports as SportsIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';

interface AdvancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string, filters?: any) => void;
  placeholder?: string;
  filters?: any;
  onFiltersChange?: (filters: any) => void;
}

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search teams, players, positions...",
  filters,
  onFiltersChange
}) => {
  const {
    searchHistory,
    suggestions,
    popularSearches,
    savedFilters,
    addToHistory,
    generateSuggestions,
    getSmartFilters,
    saveFilterPreset,
    deleteFilterPreset
  } = useAdvancedSearch();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Generate suggestions when value changes
  useEffect(() => {
    generateSuggestions(value);
  }, [value, generateSuggestions]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    setShowSuggestions(newValue.length > 0);
  };

  const handleSuggestionClick = (suggestion: any) => {
    onChange(suggestion.text);
    setShowSuggestions(false);
    onSearch(suggestion.text, filters);
    addToHistory(suggestion.text, filters || {}, 0); // Results count would be updated after search
  };

  const handleSearch = () => {
    if (value.trim()) {
      onSearch(value, filters);
      addToHistory(value, filters || {}, 0);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    } else if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'league':
        return <SportsIcon fontSize="small" />;
      case 'position':
        return <PersonIcon fontSize="small" />;
      case 'location':
        return <LocationIcon fontSize="small" />;
      case 'team':
        return <GroupIcon fontSize="small" />;
      case 'query':
        return <HistoryIcon fontSize="small" />;
      default:
        return <SearchIcon fontSize="small" />;
    }
  };

  const handleSavePreset = () => {
    if (presetName.trim() && filters) {
      saveFilterPreset(presetName.trim(), filters);
      setPresetName('');
      setShowSaveDialog(false);
    }
  };

  const handleLoadPreset = (preset: any) => {
    if (onFiltersChange) {
      onFiltersChange(preset.filters);
    }
    setAnchorEl(null);
  };

  const smartFilters = getSmartFilters(value);

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        value={value}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        onFocus={() => setShowSuggestions(value.length > 0)}
        placeholder={placeholder}
        InputProps={{
          startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          endAdornment: (
            <Box display="flex" alignItems="center" gap={1}>
              {/* Smart Filter Suggestions */}
              {smartFilters.length > 0 && (
                <Box display="flex" gap={0.5}>
                  {smartFilters.slice(0, 2).map((filter, index) => (
                    <Chip
                      key={index}
                      label={filter.label}
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        if (onFiltersChange) {
                          onFiltersChange({
                            ...filters,
                            [filter.type]: filter.value
                          });
                        }
                      }}
                      sx={{ fontSize: '0.7rem', height: 24 }}
                    />
                  ))}
                </Box>
              )}

              {/* Filter Presets */}
              {savedFilters.length > 0 && (
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  title="Saved filters"
                >
                  <FilterIcon fontSize="small" />
                </IconButton>
              )}

              {/* Save Current Filters */}
              {filters && Object.keys(filters).some(key => filters[key]) && (
                <IconButton
                  size="small"
                  onClick={() => setShowSaveDialog(true)}
                  title="Save current filters"
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              )}

              {/* Clear */}
              {value && (
                <IconButton
                  size="small"
                  onClick={() => {
                    onChange('');
                    setShowSuggestions(false);
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            pr: 1
          }
        }}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0 || popularSearches.length > 0) && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            mt: 1,
            maxHeight: 400,
            overflow: 'auto'
          }}
        >
          {/* Current Suggestions */}
          {suggestions.length > 0 && (
            <>
              <Box sx={{ p: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">
                  Suggestions
                </Typography>
              </Box>
              <List dense>
                {suggestions.map((suggestion) => (
                  <ListItem
                    key={suggestion.id}
                    button
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getIconForType(suggestion.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={suggestion.text}
                      secondary={suggestion.count ? `${suggestion.count} results` : suggestion.type}
                    />
                  </ListItem>
                ))}
              </List>
              <Divider />
            </>
          )}

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <>
              <Box sx={{ p: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">
                  Recent Searches
                </Typography>
              </Box>
              <List dense>
                {searchHistory.slice(0, 3).map((item) => (
                  <ListItem
                    key={item.id}
                    button
                    onClick={() => handleSuggestionClick({ text: item.query })}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <HistoryIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.query}
                      secondary={`${item.resultsCount} results`}
                    />
                  </ListItem>
                ))}
              </List>
              <Divider />
            </>
          )}

          {/* Popular Searches */}
          {popularSearches.length > 0 && (
            <>
              <Box sx={{ p: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">
                  Popular Searches
                </Typography>
              </Box>
              <List dense>
                {popularSearches.slice(0, 3).map((item) => (
                  <ListItem
                    key={item.id}
                    button
                    onClick={() => handleSuggestionClick(item)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <TrendingUpIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      secondary={item.count ? `${item.count} searches` : item.type}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Paper>
      )}

      {/* Filter Presets Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {savedFilters.map((preset) => (
          <MenuItem key={preset.id}>
            <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
              <Box onClick={() => handleLoadPreset(preset)} sx={{ flexGrow: 1 }}>
                <Typography variant="body2">{preset.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {Object.keys(preset.filters).length} filters
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFilterPreset(preset.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="e.g., London Strikers"
            sx={{ mt: 1 }}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {filters && Object.entries(filters)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button onClick={handleSavePreset} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};