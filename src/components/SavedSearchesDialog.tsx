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
  Typography,
  Box,
  Chip,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  BookmarkBorder as BookmarkIcon
} from '@mui/icons-material';
import api from '../services/api';

interface SavedSearch {
  id: number;
  name: string;
  filters: any;
  createdAt: string;
  lastUsed: string;
  useCount: number;
}

interface SavedSearchesDialogProps {
  open: boolean;
  onClose: () => void;
  onLoadSearch: (filters: any) => void;
  currentFilters?: any;
}

const SavedSearchesDialog: React.FC<SavedSearchesDialogProps> = ({
  open,
  onClose,
  onLoadSearch,
  currentFilters
}) => {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    if (open) {
      loadSavedSearches();
    }
  }, [open]);

  const loadSavedSearches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/saved-searches');
      setSearches(response.data.searches);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrentSearch = async () => {
    if (!searchName.trim()) return;

    try {
      await api.post('/saved-searches', {
        name: searchName,
        filters: currentFilters
      });
      setSearchName('');
      setSaveDialogOpen(false);
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const handleLoadSearch = async (search: SavedSearch) => {
    try {
      // Update usage stats
      await api.post(`/saved-searches/${search.id}/use`);
      onLoadSearch(search.filters);
      onClose();
    } catch (error) {
      console.error('Failed to load search:', error);
    }
  };

  const handleDeleteSearch = async (id: number) => {
    try {
      await api.delete(`/saved-searches/${id}`);
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to delete search:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
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
              variant="contained"
              size="small"
            >
              Save Current
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Typography>Loading...</Typography>
          ) : searches.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No saved searches yet. Save your current search to quickly access it later!
              </Typography>
            </Box>
          ) : (
            <List>
              {searches.map((search, index) => (
                <React.Fragment key={search.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={search.name}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Last used: {formatDate(search.lastUsed)}
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={`Used ${search.useCount} times`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleLoadSearch(search)}
                        color="primary"
                        sx={{ mr: 1 }}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteSearch(search.id)}
                        color="error"
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

      {/* Save Current Search Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Current Search</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Search Name"
            fullWidth
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="e.g., U12 Midfielders in London"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveCurrentSearch} variant="contained" disabled={!searchName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SavedSearchesDialog;
