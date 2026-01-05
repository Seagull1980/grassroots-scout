import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  TextField,
  Grid
} from '@mui/material';
import { Add, Assessment } from '@mui/icons-material';
import api from '../services/api';

interface TrialList {
  id: number;
  title: string;
  trialDate?: string;
  status: string;
  playerCount: number;
  maxPlayers?: number;
}

interface PlayerAvailability {
  id: number;
  playerId: number;
  firstName: string;
  lastName: string;
  age?: number;
  position?: string;
}

interface QuickAddToTrialDialogProps {
  open: boolean;
  onClose: () => void;
  player: PlayerAvailability | null;
  onSuccess?: () => void;
}

const QuickAddToTrialDialog: React.FC<QuickAddToTrialDialogProps> = ({
  open,
  onClose,
  player,
  onSuccess
}) => {
  const [trialLists, setTrialLists] = useState<TrialList[]>([]);
  const [selectedTrialList, setSelectedTrialList] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingTrialLists, setLoadingTrialLists] = useState(false);
  const [error, setError] = useState<string>('');

  // Form state for manual entry
  const [playerName, setPlayerName] = useState('');
  const [playerAge, setPlayerAge] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');

  useEffect(() => {
    if (open) {
      fetchTrialLists();
      if (player) {
        setPlayerName(`${player.firstName} ${player.lastName}`);
        setPlayerAge(player.age?.toString() || '');
        setPlayerPosition(player.position || '');
      } else {
        setPlayerName('');
        setPlayerAge('');
        setPlayerPosition('');
      }
    }
  }, [open, player]);

  const fetchTrialLists = async () => {
    try {
      setLoadingTrialLists(true);
      const response = await api.get('/trial-lists');
      if (response.data.success) {
        // Filter to only show active trial lists
        const activeTrials = response.data.trialLists.filter((trial: TrialList) => trial.status === 'active');
        setTrialLists(activeTrials);
      }
    } catch (error) {
      console.error('Error fetching trial lists:', error);
      setError('Failed to load trial lists');
    } finally {
      setLoadingTrialLists(false);
    }
  };

  const handleAddToTrial = async () => {
    if (!selectedTrialList || !playerName.trim()) {
      setError('Please select a trial list and enter player name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        playerId: player?.playerId || 0, // Use 0 for manual entries
        playerName: playerName.trim(),
        playerAge: playerAge ? parseInt(playerAge) : undefined,
        playerPosition: playerPosition || undefined
      };

      const response = await api.post(`/trial-lists/${selectedTrialList}/players`, payload);
      
      if (response.data.success) {
        onSuccess?.();
        onClose();
        setSelectedTrialList('');
      }
    } catch (error: any) {
      console.error('Error adding player to trial:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add player to trial';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTrialList('');
    setError('');
    setPlayerName('');
    setPlayerAge('');
    setPlayerPosition('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment />
          <Typography variant="h6">
            Quick Add to Trial List
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Player Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              disabled={!!player} // Disable if player data is provided
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Age (Optional)"
              type="number"
              value={playerAge}
              onChange={(e) => setPlayerAge(e.target.value)}
              inputProps={{ min: 5, max: 50 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Position (Optional)"
              value={playerPosition}
              onChange={(e) => setPlayerPosition(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Select Trial List
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth disabled={loadingTrialLists}>
              <InputLabel>Trial List</InputLabel>
              <Select
                value={selectedTrialList}
                onChange={(e) => setSelectedTrialList(e.target.value)}
                label="Trial List"
              >
                {loadingTrialLists ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Loading trial lists...
                  </MenuItem>
                ) : trialLists.length === 0 ? (
                  <MenuItem disabled>
                    No active trial lists found
                  </MenuItem>
                ) : (
                  trialLists.map((trial) => (
                    <MenuItem key={trial.id} value={trial.id.toString()}>
                      <Box>
                        <Typography variant="body1">
                          {trial.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {trial.playerCount} players
                          {trial.maxPlayers ? ` / ${trial.maxPlayers}` : ''}
                          {trial.trialDate && ` • ${new Date(trial.trialDate).toLocaleDateString()}`}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {trialLists.length === 0 && !loadingTrialLists && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No active trial lists found. Create a trial list first to add players.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => window.open('/trial-management', '_blank')}
              sx={{ mt: 1 }}
            >
              Create Trial List
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleAddToTrial}
          variant="contained"
          disabled={loading || !selectedTrialList || !playerName.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <Add />}
        >
          {loading ? 'Adding...' : 'Add to Trial'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickAddToTrialDialog;
