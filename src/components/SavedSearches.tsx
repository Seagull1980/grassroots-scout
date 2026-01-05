import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Typography,
  Chip,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon
} from '@mui/icons-material';

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, any>;
  tabIndex: number;
  createdAt: string;
}

interface SavedSearchesDialogProps {
  open: boolean;
  onClose: () => void;
  onApplySearch: (search: SavedSearch) => void;
  currentFilters?: Record<string, any>;
  currentTab?: number;
}

export const SavedSearchesDialog: React.FC<SavedSearchesDialogProps> = ({
  open,
  onClose,
  onApplySearch,
  currentFilters = {},
  currentTab = 0
}) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = () => {
    const saved = localStorage.getItem('grassroots_saved_searches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  };

  const saveCurrentSearch = () => {
    if (!searchName.trim()) return;

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      filters: currentFilters,
      tabIndex: currentTab || 0,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('grassroots_saved_searches', JSON.stringify(updated));
    
    setSearchName('');
    setSaveDialogOpen(false);
  };

  const deleteSearch = (id: string) => {
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('grassroots_saved_searches', JSON.stringify(updated));
  };

  const getFilterSummary = (filters: Record<string, any>) => {
    const parts: string[] = [];
    if (filters.league) parts.push(filters.league);
    if (filters.ageGroup) parts.push(filters.ageGroup);
    if (filters.position) parts.push(filters.position);
    if (filters.location) parts.push(filters.location);
    return parts.join(' · ') || 'All';
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Saved Searches</Typography>
            <Button
              startIcon={<BookmarkIcon />}
              onClick={() => setSaveDialogOpen(true)}
              variant="outlined"
              size="small"
            >
              Save Current
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {savedSearches.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BookmarkBorderIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                No saved searches yet. Save your current search to quickly access it later.
              </Typography>
            </Box>
          ) : (
            <List>
              {savedSearches.map((search, index) => (
                <React.Fragment key={search.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    button
                    onClick={() => {
                      onApplySearch(search);
                      onClose();
                    }}
                  >
                    <ListItemText
                      primary={search.name}
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {getFilterSummary(search.filters)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Saved {new Date(search.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSearch(search.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Save Search Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save Search</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Search Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="E.g., U12 Strikers in London"
            sx={{ mt: 1 }}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Current filters: {getFilterSummary(currentFilters)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveCurrentSearch} variant="contained" disabled={!searchName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Recent Searches Component
export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = () => {
    const recent = localStorage.getItem('grassroots_recent_searches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
  };

  const addRecentSearch = (filters: Record<string, any>, tabIndex: number) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: 'Recent Search',
      filters,
      tabIndex,
      createdAt: new Date().toISOString()
    };

    // Keep only last 10 searches
    const updated = [newSearch, ...recentSearches].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('grassroots_recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('grassroots_recent_searches');
  };

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches
  };
};
