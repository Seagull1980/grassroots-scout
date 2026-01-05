import React, { useState } from 'react';
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
  TextField,
  Chip,
  Box,
  Stack,
  Typography,
  Alert,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import api from '../services/api';

interface TrainingScheduleSetupProps {
  open: boolean;
  onClose: () => void;
  teamId?: number;
  onSuccess?: () => void;
}

const TrainingScheduleSetup: React.FC<TrainingScheduleSetupProps> = ({
  open,
  onClose,
  teamId,
  onSuccess
}) => {
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDaysChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setTrainingDays(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      if (trainingDays.length === 0) {
        setError('Please select at least one training day');
        return;
      }

      if (!startTime || !endTime) {
        setError('Please set training times');
        return;
      }

      await api.post('/api/team/training-schedule', {
        teamId,
        trainingDays,
        startTime,
        endTime,
        location
      });

      setSuccess('Training schedule created! Check your calendar for the next 12 weeks of training sessions.');
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error setting training schedule:', err);
      setError(err.response?.data?.error || 'Failed to set training schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTrainingDays([]);
    setStartTime('18:00');
    setEndTime('19:30');
    setLocation('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ScheduleIcon color="primary" />
          <Typography variant="h6">Set Up Training Schedule</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" icon={<CheckIcon />}>
              {success}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            Set your regular training schedule and we'll automatically create calendar events for the next 12 weeks. You can still edit or cancel individual sessions later.
          </Typography>

          <FormControl fullWidth required>
            <InputLabel>Training Days</InputLabel>
            <Select
              multiple
              value={trainingDays}
              onChange={handleDaysChange}
              input={<OutlinedInput label="Training Days" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {daysOfWeek.map((day) => (
                <MenuItem key={day} value={day}>
                  {day}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box display="flex" gap={2}>
            <TextField
              label="Start Time"
              type="time"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            
            <TextField
              label="End Time"
              type="time"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Box>

          <TextField
            label="Training Location"
            fullWidth
            placeholder="e.g., City Sports Ground, Pitch 3"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            This will create {trainingDays.length > 0 ? trainingDays.length * 12 : '0'} training sessions 
            ({trainingDays.length} day{trainingDays.length !== 1 ? 's' : ''} × 12 weeks)
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || trainingDays.length === 0}
        >
          Create Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrainingScheduleSetup;
