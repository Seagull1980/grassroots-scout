import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { MatchCompletionFormData } from '../types';

interface QuickMatchCompletionProps {
  vacancyId?: string;
  availabilityId?: string;
  childAvailabilityId?: string;
  prefilledData?: Partial<MatchCompletionFormData>;
  onSuccess?: () => void;
}

const QuickMatchCompletion: React.FC<QuickMatchCompletionProps> = ({
  vacancyId,
  availabilityId,
  childAvailabilityId,
  prefilledData,
  onSuccess
}) => {
  const { user } = useAuth();
  
  // Early return MUST be after all hooks
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<MatchCompletionFormData>({
    matchType: user?.role === 'Parent/Guardian' ? 'child_to_team' : 'player_to_team',
    playerName: '',
    teamName: '',
    position: '',
    ageGroup: '',
    league: '',
    startDate: '',
    vacancyId,
    availabilityId,
    childAvailabilityId,
    ...prefilledData
  });

  const handleSubmit = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/match-completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Match completion created successfully!');
        setOpen(false);
        if (onSuccess) onSuccess();
        
        // Reset form
        setFormData({
          matchType: user?.role === 'Parent/Guardian' ? 'child_to_team' : 'player_to_team',
          playerName: '',
          teamName: '',
          position: '',
          ageGroup: '',
          league: '',
          startDate: '',
          vacancyId,
          availabilityId,
          childAvailabilityId,
          ...prefilledData
        });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create match completion');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const positions = [
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward',
    'Centre-Back', 'Full-Back', 'Wing-Back', 'Defensive Midfielder',
    'Central Midfielder', 'Attacking Midfielder', 'Winger', 'Striker'
  ];

  const ageGroups = [
    'Under 6', 'Under 7', 'Under 8', 'Under 9', 'Under 10',
    'Under 11', 'Under 12', 'Under 13', 'Under 14', 'Under 15', 'Under 16',
    'Under 17', 'Under 18', 'Under 21', 'Adult (18+)', 'Veterans (35+)'
  ];

  const leagues = [
    'Premier League Youth', 'Championship Youth', 'League One Youth',
    'National League Youth', 'County League', 'District League',
    'Local Sunday League', 'School Football League', 'Academy League'
  ];

  if (!user) return null;

  return (
    <>
      <Tooltip title="Report a successful match">
        <Fab
          color="success"
          aria-label="report match"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000
          }}
        >
          <CheckCircleIcon />
        </Fab>
      </Tooltip>

      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            position: 'fixed', 
            top: 16, 
            right: 16, 
            zIndex: 1001,
            maxWidth: 400 
          }} 
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Report Successful Match</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              label="Player Name"
              value={formData.playerName}
              onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
              fullWidth
              required
              placeholder="Enter the player's name"
            />
            
            <TextField
              label="Team Name"
              value={formData.teamName}
              onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
              fullWidth
              required
              placeholder="Enter the team name"
            />
            
            <TextField
              select
              label="Position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              SelectProps={{ 
                native: true,
                MenuProps: {
                  style: { zIndex: 1301 }
                }
              }}
            >
              <option value="">Select Position</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </TextField>
            
            <TextField
              select
              label="Age Group"
              value={formData.ageGroup}
              onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              SelectProps={{ 
                native: true,
                MenuProps: {
                  style: { zIndex: 1301 }
                }
              }}
            >
              <option value="">Select Age Group</option>
              {ageGroups.map((ageGroup) => (
                <option key={ageGroup} value={ageGroup}>
                  {ageGroup}
                </option>
              ))}
            </TextField>
            
            <Autocomplete
              fullWidth
              options={leagues}
              value={formData.league || null}
              onChange={(_, newValue) => setFormData({ ...formData, league: newValue || '' })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="League *"
                  placeholder="Type to search leagues..."
                  required
                />
              )}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;
                return options.filter(option =>
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
              noOptionsText="No leagues found"
              componentsProps={{
                popper: {
                  sx: { zIndex: 1301 }
                }
              }}
            />
            
            <TextField
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="When did the player join the team?"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              loading ||
              !formData.playerName ||
              !formData.teamName ||
              !formData.position ||
              !formData.ageGroup ||
              !formData.league
            }
          >
            {loading ? 'Creating...' : 'Report Match'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuickMatchCompletion;
